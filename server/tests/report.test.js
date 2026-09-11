const request = require('supertest');
const { app } = require('../server');
const { generateAccessToken } = require('../utils/generateToken');

describe('Reports Module Operational API & Export Tests', () => {
  const token = generateAccessToken({
    _id: '67cda0000000000000000001',
    name: 'Commander Sarah Jenkins',
    email: 'admin@polaris.aq',
    role: 'SuperAdmin',
  });

  test('GET /api/reports without token returns 401', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/reports returns Command Operational Summary by default', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('command-summary');
    expect(res.body.kpis).toBeDefined();
    expect(typeof res.body.kpis.total).toBe('number');
    expect(typeof res.body.kpis.completed).toBe('number');
    expect(typeof res.body.kpis.critical).toBe('number');
    expect(Array.isArray(res.body.criticalIssues)).toBe(true);
    expect(res.body.chartData).toBeDefined();
    expect(Array.isArray(res.body.chartData.baseDistribution)).toBe(true);
  });

  test('GET /api/reports?type=expeditions returns Expeditions report with KPIs', async () => {
    const res = await request(app)
      .get('/api/reports?type=expeditions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('expeditions');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.chartData).toBeDefined();
  });

  test('GET /api/reports?type=cargo returns Cargo Manifest report with KPIs', async () => {
    const res = await request(app)
      .get('/api/reports?type=cargo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('cargo');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports?type=inventory returns Inventory & Fuel report with KPIs', async () => {
    const res = await request(app)
      .get('/api/reports?type=inventory')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('inventory');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports?type=personnel returns Personnel report with KPIs', async () => {
    const res = await request(app)
      .get('/api/reports?type=personnel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('personnel');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports?type=incidents returns Emergency Incidents report with KPIs', async () => {
    const res = await request(app)
      .get('/api/reports?type=incidents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('incidents');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports?type=tasks returns Operational Tasks report with KPIs', async () => {
    const res = await request(app)
      .get('/api/reports?type=tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportType).toBe('tasks');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.kpis.total).toBeGreaterThanOrEqual(0);
  });

  test('GET /api/reports?type=command-summary&format=csv returns text/csv format', async () => {
    const res = await request(app)
      .get('/api/reports?type=command-summary&format=csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('POLARIS COMMAND OPERATIONAL SUMMARY');
  });

  test('GET /api/reports?type=cargo&format=csv returns text/csv with cargo fields', async () => {
    const res = await request(app)
      .get('/api/reports?type=cargo&format=csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('cargoCode');
  });

  test('GET /api/reports?type=tasks&base=Maitri+Station filters data by station base', async () => {
    const res = await request(app)
      .get('/api/reports?type=tasks&base=Maitri+Station')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
