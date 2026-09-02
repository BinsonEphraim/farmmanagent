import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function verifyAssetsFlow() {
  console.log('🚀 Starting Assets & Equipment End-to-End Verification...\n');

  try {
    // 1. Authenticate
    console.log('1️⃣ Authenticating as admin@ufms.com...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@ufms.com',
      password: 'password123',
    });

    const token = loginRes.data.token;
    console.log('✅ Logged in successfully! Token received.');

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // 2. Test GET /api/farms/assets/stats
    console.log('\n2️⃣ Testing GET /api/farms/assets/stats (KPIs, Charts, Breakdowns)...');
    const statsRes = await axios.get(`${API_BASE}/farms/assets/stats`, authHeaders);
    console.log('✅ Stats fetched successfully:');
    console.log('   - Total Assets:', statsRes.data.summary.totalAssets);
    console.log('   - In Use:', statsRes.data.summary.inUse);
    console.log('   - Under Maintenance:', statsRes.data.summary.underMaintenance);
    console.log('   - Inactive:', statsRes.data.summary.inactive);
    console.log('   - Due for Maintenance:', statsRes.data.summary.dueForMaintenance);
    console.log('   - Total Value: $' + statsRes.data.summary.totalValue.toLocaleString());
    console.log('   - Categories Count:', statsRes.data.byCategory.length);
    console.log('   - Statuses Breakdown:', statsRes.data.byStatus.map((s) => `${s.name}: ${s.count}`).join(', '));
    console.log('   - Top Upcoming Maintenance:', statsRes.data.upcomingMaintenance.slice(0, 3).map((m) => `${m.name} (${m.statusBadge})`).join(' | '));
    console.log('   - Locations Summary Count:', statsRes.data.byLocation.length);

    // 3. Test GET /api/farms/assets/all (Pagination & Search)
    console.log('\n3️⃣ Testing GET /api/farms/assets/all with limit=5...');
    const listRes = await axios.get(`${API_BASE}/farms/assets/all?page=1&limit=5`, authHeaders);
    console.log(`✅ Loaded ${listRes.data.assets.length} assets (Total in DB: ${listRes.data.pagination.total}, Pages: ${listRes.data.pagination.totalPages}):`);
    listRes.data.assets.forEach((a) => {
      console.log(`   • [${a.assetCode}] ${a.name} | Category: ${a.category} | Value: $${a.currentValue.toLocaleString()} | Status: ${a.status} | Condition: ${a.condition} | Farm: ${a.farm?.name}`);
    });

    // 4. Test Search filter
    console.log('\n4️⃣ Testing search query "Tractor"...');
    const searchRes = await axios.get(`${API_BASE}/farms/assets/all?search=Tractor`, authHeaders);
    console.log(`✅ Search matched ${searchRes.data.assets.length} assets.`);

    // 5. Test POST /api/farms/assets (Create new asset)
    console.log('\n5️⃣ Testing POST /api/farms/assets (Create Test Asset)...');
    const farmsRes = await axios.get(`${API_BASE}/farms`, authHeaders);
    const farmId = farmsRes.data.farms[0].id;

    const newAssetData = {
      name: 'Fendt 1050 Vario 500HP Tractor',
      category: 'TRACTORS',
      farmId: farmId,
      location: farmsRes.data.farms[0].name,
      purchaseDate: '2024-03-01',
      purchasePrice: 380000,
      currentValue: 360000,
      status: 'IN_USE',
      condition: 'EXCELLENT',
      manufacturer: 'Fendt AGCO',
      modelNumber: '1050 Vario',
      serialNumber: 'FENDT-1050-2024-X99',
      notes: 'High-power flagship tractor with VarioDrive continuous transmission.',
      nextMaintenanceDate: '2025-09-15',
    };

    const createRes = await axios.post(`${API_BASE}/farms/assets`, newAssetData, authHeaders);
    const createdAsset = createRes.data.asset;
    console.log(`✅ Asset created: [${createdAsset.assetCode}] ${createdAsset.name} (ID: ${createdAsset.id})`);

    // 6. Test PUT /api/farms/assets/:id (Update asset)
    console.log('\n6️⃣ Testing PUT /api/farms/assets/:id (Update Asset Status)...');
    const updateRes = await axios.put(
      `${API_BASE}/farms/assets/${createdAsset.id}`,
      { condition: 'EXCELLENT', status: 'IN_USE', currentValue: 365000 },
      authHeaders
    );
    console.log(`✅ Asset updated: Value now $${updateRes.data.asset.currentValue.toLocaleString()}`);

    // 7. Test POST /api/farms/assets/:id/maintenance (Log Maintenance)
    console.log('\n7️⃣ Testing POST /api/farms/assets/:id/maintenance (Schedule Maintenance)...');
    const maintRes = await axios.post(
      `${API_BASE}/farms/assets/${createdAsset.id}/maintenance`,
      {
        title: 'Initial 50-Hour Break-In Inspection',
        type: 'INSPECTION',
        status: 'SCHEDULED',
        scheduledDate: '2025-09-15',
        cost: 150,
        technician: 'Patrick Banda',
        description: 'Check wheel nut torques, top up hydraulic oil reservoir and inspect transmission filters.',
      },
      authHeaders
    );
    console.log(`✅ Maintenance record created: "${maintRes.data.maintenance.title}"`);

    // 8. Test DELETE /api/farms/assets/:id (Cleanup test asset)
    console.log('\n8️⃣ Testing DELETE /api/farms/assets/:id (Cleanup Test Asset)...');
    await axios.delete(`${API_BASE}/farms/assets/${createdAsset.id}`, authHeaders);
    console.log(`✅ Test asset ${createdAsset.assetCode} cleaned up successfully!`);

    console.log('\n🎉 ALL ASSETS & EQUIPMENT DATABASE & API TESTS PASSED PERFECTLY! 🚀\n');
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

verifyAssetsFlow();
