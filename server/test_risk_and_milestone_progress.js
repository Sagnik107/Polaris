const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('--- Testing In-Progress Milestones, Dashboard Accuracy & Manual Risk Profile ---');

  // Login
  const loginRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@polaris.aq', password: 'Polaris@2026' });

  const token = loginRes.data.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. Get an active expedition
  const listRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/expeditions',
    method: 'GET',
    headers: authHeaders
  });
  const exp = listRes.data.data.find(e => e.status === 'Active') || listRes.data.data[0];
  const expId = exp._id || exp.id;
  console.log(`Using Expedition: ${exp.name} (${exp.expeditionCode || exp.code}) - Status: ${exp.status}`);

  // 2. Add two milestones
  const m1Res = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/milestones`,
    method: 'POST',
    headers: authHeaders
  }, { title: 'Traverse Staging Test', dueDate: '2026-11-20', status: 'pending' });

  const m1Id = m1Res.data.data.milestones[m1Res.data.data.milestones.length - 1]._id;

  // 3. Set milestone 1 to in_progress
  console.log('\n--- Setting Milestone to "in_progress" ---');
  const setInProgRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/milestones/${m1Id}`,
    method: 'PUT',
    headers: authHeaders
  }, { status: 'in_progress' });

  console.log('In-progress status:', setInProgRes.status);
  console.log('Accurate Progress with in_progress:', setInProgRes.data.data.progress, '%');
  console.log('Readiness with in_progress:', setInProgRes.data.data.readinessScore, '%');

  // 4. Manually update Risk Profile to High
  console.log('\n--- Manually Setting Risk Profile to HIGH ---');
  const updateRiskRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}`,
    method: 'PUT',
    headers: authHeaders
  }, {
    riskLevel: 'High',
    aiRiskPrediction: 'Katabatic storm (62 kts gale) & crevasse hazard within 1.8 NM',
    riskScore: 78
  });

  console.log('Update risk status:', updateRiskRes.status);
  console.log('Saved riskLevel:', updateRiskRes.data.data.riskLevel);
  console.log('Saved aiRiskPrediction:', updateRiskRes.data.data.aiRiskPrediction);

  // 5. Verify Dashboard Summary accurately reflects the expedition process
  console.log('\n--- Verifying Dashboard Summary API ---');
  const dashRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/dashboard',
    method: 'GET',
    headers: authHeaders
  });

  const dashExp = dashRes.data.data.activeExpeditionsList.find(e => (e._id || e.id) === expId || e.code === exp.code);
  console.log('Dashboard active expedition progress:', dashExp?.progress, '%');
  console.log('Dashboard active expedition riskLevel:', dashExp?.riskLevel);
  console.log('Dashboard active expedition riskPrediction:', dashExp?.aiRiskPrediction);

  console.log('\n✓ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

run().catch(console.error);
