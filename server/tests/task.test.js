const request = require('supertest');
const { app } = require('../server');
const { generateAccessToken } = require('../utils/generateToken');

describe('Task Management API & Workflow Tests', () => {
  const adminToken = generateAccessToken({
    _id: '67cda0000000000000000001',
    name: 'Commander Sarah Jenkins',
    email: 'admin@polaris.aq',
    role: 'SuperAdmin',
  });

  const managerToken = generateAccessToken({
    _id: '67cda0000000000000000002',
    name: 'Expedition Lead',
    email: 'manager@polaris.aq',
    role: 'ExpeditionManager',
  });

  const viewerToken = generateAccessToken({
    _id: '67cda0000000000000000003',
    name: 'Observer',
    email: 'viewer@polaris.aq',
    role: 'Viewer',
  });

  let createdTaskId;

  test('GET /api/tasks returns 401 without auth token', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Viewer cannot create tasks (RBAC 403)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        title: 'Unauthorized Task',
        description: 'Should be rejected',
        priority: 'Medium',
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('SuperAdmin creates a new task (Pending by default, Critical priority)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Emergency Generator Thermal Scan',
        description: 'Perform IR thermal imaging on backup diesel generator #2.',
        priority: 'Critical',
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        assignedToName: 'Vikram Sengupta',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Emergency Generator Thermal Scan');
    expect(res.body.data.priority).toBe('Critical');
    expect(res.body.data.status).toBe('Pending');
    createdTaskId = res.body.data._id;
  });

  test('GET /api/tasks retrieves task list and includes created task', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((t) => t.title === 'Emergency Generator Thermal Scan');
    expect(found).toBeDefined();
  });

  test('Workflow transition: Pending → In Progress', async () => {
    const res = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'In Progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('In Progress');
  });

  test('Viewer cannot update status (RBAC 403)', async () => {
    const res = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'Completed' });

    expect(res.statusCode).toBe(403);
  });

  test('Add field comment/note and verify in GET /api/tasks/:id', async () => {
    const commentRes = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Thermal sensor calibrated at -45°C ambient.' });

    expect(commentRes.statusCode).toBe(200);
    expect(commentRes.body.success).toBe(true);

    const detailRes = await request(app)
      .get(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.comments.length).toBeGreaterThan(0);
    expect(Array.isArray(detailRes.body.data.activityHistory)).toBe(true);
  });

  test('Workflow transition: In Progress → Completed', async () => {
    const res = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'Completed' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Completed');
  });

  test('Automatic overdue detection transitions non-completed tasks past deadline', async () => {
    // Create an overdue task
    const createPast = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Past Due Cryo Valve Replacement',
        description: 'Should automatically be marked overdue',
        priority: 'High',
        deadline: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
      });

    expect(createPast.statusCode).toBe(201);
    const pastId = createPast.body.data._id;

    // Fetch tasks, triggering auto-overdue check
    const fetchRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(fetchRes.statusCode).toBe(200);
    const pastTask = fetchRes.body.data.find((t) => t._id === pastId);
    expect(pastTask).toBeDefined();
    expect(pastTask.status).toBe('Overdue');
  });

  test('Filtering tasks by status and priority', async () => {
    const res = await request(app)
      .get('/api/tasks?status=Completed')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.every((t) => t.status === 'Completed')).toBe(true);
  });

  test('Viewer cannot delete tasks (RBAC 403), SuperAdmin can delete', async () => {
    const viewerDel = await request(app)
      .delete(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(viewerDel.statusCode).toBe(403);

    const adminDel = await request(app)
      .delete(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDel.statusCode).toBe(200);
    expect(adminDel.body.success).toBe(true);
  });
});
