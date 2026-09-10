const request = require('supertest');
const { app } = require('../server');

describe('POLARIS API Unit & Integration Tests', () => {
  test('GET /api/health returns operational status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('operational');
  });

  test('POST /api/auth/login with wrong credentials returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fake@polaris.aq', password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/expeditions without token returns 401', async () => {
    const res = await request(app).get('/api/expeditions');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
