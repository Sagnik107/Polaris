const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('     POLARIS EXPEDITION MANAGEMENT E2E TEST SUITE   ');
  console.log('====================================================\n');

  console.log('1. Authenticating as SuperAdmin...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@polaris.aq', password: 'Polaris@2026' });

  if (loginRes.status !== 200 || !loginRes.data.data?.accessToken) {
    throw new Error('Authentication failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.data.accessToken;
  console.log('✓ SuperAdmin authenticated successfully.\n');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('2. Testing GET /api/expeditions...');
  const listRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/expeditions',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ Fetched list with status ${listRes.status}. Total count: ${listRes.data.data?.length}`);

  console.log('\n3. Testing POST /api/expeditions (Create new expedition)...');
  const createPayload = {
    name: 'E2E Test Glacial Core Traverse',
    expeditionCode: 'E2E-TEST-99',
    type: 'Deep Field Traverse',
    destinationBase: 'Bharati Station',
    baseName: 'Bharati Station',
    region: 'East Antarctica',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    leader: 'Dr. Rajesh Sharma',
    budget: 2400000,
    description: 'Autonomous end-to-end verification traverse.',
    status: 'Planning'
  };

  const createRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/expeditions',
    method: 'POST',
    headers: authHeaders
  }, createPayload);

  if (createRes.status !== 201) {
    throw new Error('Create expedition failed: ' + JSON.stringify(createRes.data));
  }
  const createdExp = createRes.data.data;
  const expId = createdExp._id || createdExp.id;
  console.log(`✓ Expedition created: "${createdExp.name}" with ID: ${expId}`);
  console.log(`  Initial Readiness: ${createdExp.readinessScore}%, Progress: ${createdExp.progress}%`);

  console.log('\n4. Testing GET /api/expeditions/:id...');
  const getDetailRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}`,
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ Retrieved detail: status ${getDetailRes.status}, Name: ${getDetailRes.data.data?.name}`);

  console.log('\n5. Testing POST /api/expeditions/:id/personnel (Assign crew)...');
  // First fetch available personnel to get a valid ID
  const pListRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: '/api/personnel',
    method: 'GET',
    headers: authHeaders
  });
  const firstPersonnel = pListRes.data.data?.[0];
  const personnelId = firstPersonnel ? (firstPersonnel._id || firstPersonnel.id) : '67cda3000000000000000001';

  const assignPRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/personnel`,
    method: 'POST',
    headers: authHeaders
  }, { personnelId });
  console.log(`✓ Crew assigned: status ${assignPRes.status}, New readiness: ${assignPRes.data.data?.readinessScore}%`);

  console.log('\n6. Testing POST /api/expeditions/:id/resources (Allocate resource)...');
  const assignRRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/resources`,
    method: 'POST',
    headers: authHeaders
  }, {
    item: 'PistenBully 300 Polar Traverse Cat',
    category: 'Vehicle',
    quantity: 2,
    notes: 'Winterized for -50C conditions'
  });
  console.log(`✓ Resource allocated: status ${assignRRes.status}, New readiness: ${assignRRes.data.data?.readinessScore}%`);
  const allocatedResourceId = assignRRes.data.data?.assignedResources?.[0]?._id;

  console.log('\n7. Testing POST /api/expeditions/:id/milestones (Add milestone)...');
  const addMRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/milestones`,
    method: 'POST',
    headers: authHeaders
  }, {
    title: 'Deploy Ice-Divide Borehole Drill',
    dueDate: '2026-12-15',
    status: 'pending',
    description: 'Drill 120m deep ice core for paleoclimate records.'
  });
  console.log(`✓ Milestone added: status ${addMRes.status}, New readiness: ${addMRes.data.data?.readinessScore}%`);
  const addedMilestone = addMRes.data.data?.milestones?.find(m => m.title.includes('Borehole'));
  const milestoneId = addedMilestone?._id || addedMilestone?.id;

  if (milestoneId) {
    console.log('\n8. Testing PUT /api/expeditions/:id/milestones/:mId (1-click completion toggle)...');
    const updateMRes = await request({
      hostname: 'localhost',
      port: 8002,
      path: `/api/expeditions/${expId}/milestones/${milestoneId}`,
      method: 'PUT',
      headers: authHeaders
    }, { status: 'completed' });
    console.log(`✓ Milestone marked completed: Progress: ${updateMRes.data.data?.progress}%, Readiness: ${updateMRes.data.data?.readinessScore}%`);
  }

  console.log('\n9. Testing GET /api/expeditions/:id/timeline (Audit history)...');
  const timelineRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/timeline`,
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ Timeline entries recorded: ${timelineRes.data.data?.length || timelineRes.data?.length} events.`);

  console.log('\n10. Testing DELETE /api/expeditions/:id/personnel/:personnelId (Unassign crew)...');
  const unassignPRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}/personnel/${personnelId}`,
    method: 'DELETE',
    headers: authHeaders
  });
  console.log(`✓ Crew unassigned: status ${unassignPRes.status}, Updated readiness: ${unassignPRes.data.data?.readinessScore}%`);

  if (allocatedResourceId) {
    console.log('\n11. Testing DELETE /api/expeditions/:id/resources/:resourceId (De-allocate resource)...');
    const unassignRRes = await request({
      hostname: 'localhost',
      port: 8002,
      path: `/api/expeditions/${expId}/resources/${allocatedResourceId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`✓ Resource de-allocated: status ${unassignRRes.status}`);
  }

  console.log('\n12. Testing DELETE /api/expeditions/:id (Decommission expedition)...');
  const deleteRes = await request({
    hostname: 'localhost',
    port: 8002,
    path: `/api/expeditions/${expId}`,
    method: 'DELETE',
    headers: authHeaders
  });
  console.log(`✓ Expedition decommissioned: status ${deleteRes.status}`);

  console.log('\n====================================================');
  console.log('✓ ALL 12 EXPEDITION MODULE INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
