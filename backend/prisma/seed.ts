import 'dotenv/config';
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  CropStatus,
  AnimalType,
  HealthStatus,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  MaintenanceType,
  MaintenanceStatus,
  TransactionType,
  TransactionStatus,
  InvoiceStatus,
  InvoiceType,
  ApprovalStatus,
  GoalStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Check backend/.env before running the seed script.');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // 1. Seed 7 Official Roles
  const rolesData = [
    { name: 'System Administrator', description: 'Manages users, roles, permissions, system settings, and overall system administration' },
    { name: 'Managing Director', description: 'Company-wide monitoring, approvals, oversight, and decision-making' },
    { name: 'Finance Manager', description: 'Income, expenses, budgets, payroll, cash flow, and financial reports' },
    { name: 'Human Resources Manager', description: 'Employees, attendance, leave, payroll, performance, training, and staff records' },
    { name: 'Farm Manager', description: 'Crops, planting, farm activities, livestock, harvesting, and production' },
    { name: 'Storekeeper', description: 'Inventory, stock levels, fertilizer, seeds, chemicals, and stock movements' },
    { name: 'Employee/Staff', description: 'Assigned work, farm/operational activities, and information permitted by their role' },
    // Aliases for compatibility
    { name: 'Administrator', description: 'Alias for System Administrator' },
    { name: 'HR Manager', description: 'Alias for Human Resources Manager' },
    { name: 'Employee', description: 'Alias for Employee/Staff' },
  ];

  const roles: Record<string, any> = {};
  for (const r of rolesData) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
  }
  console.log('✅ 7 Official Roles created');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Seed 7 Official Role Accounts for Instant Testing & Real Usage
  const coreUsers = [
    {
      email: 'admin@ufms.com',
      firstName: 'System',
      lastName: 'Administrator',
      roleName: 'System Administrator',
    },
    {
      email: 'md@ufms.com',
      firstName: 'Managing',
      lastName: 'Director',
      roleName: 'Managing Director',
    },
    {
      email: 'finance@ufms.com',
      firstName: 'Finance',
      lastName: 'Manager',
      roleName: 'Finance Manager',
    },
    {
      email: 'hr@ufms.com',
      firstName: 'HR',
      lastName: 'Manager',
      roleName: 'Human Resources Manager',
    },
    {
      email: 'manager@ufms.com',
      firstName: 'Farm',
      lastName: 'Manager',
      roleName: 'Farm Manager',
    },
    {
      email: 'store@ufms.com',
      firstName: 'Central',
      lastName: 'Storekeeper',
      roleName: 'Storekeeper',
    },
    {
      email: 'employee@ufms.com',
      firstName: 'Field',
      lastName: 'Staff',
      roleName: 'Employee/Staff',
    },
  ];

  for (const u of coreUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        roleId: roles[u.roleName].id,
        firstName: u.firstName,
        lastName: u.lastName,
        isVerified: true,
        isActive: true,
      },
      create: {
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: roles[u.roleName].id,
        isVerified: true,
        isActive: true,
      },
    });
  }

  const managersData = [
    { email: 'jane.smith@ufms.com', firstName: 'Jane', lastName: 'Smith' },
    { email: 'robert.johnson@ufms.com', firstName: 'Robert', lastName: 'Johnson' },
    { email: 'sarah.wilson@ufms.com', firstName: 'Sarah', lastName: 'Wilson' },
    { email: 'michael.brown@ufms.com', firstName: 'Michael', lastName: 'Brown' },
    { email: 'emily.davis@ufms.com', firstName: 'Emily', lastName: 'Davis' },
  ];

  const managers: any[] = [];
  for (const m of managersData) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        password: hashedPassword,
        firstName: m.firstName,
        lastName: m.lastName,
        roleId: roles['Farm Manager'].id,
        isVerified: true,
        isActive: true,
      },
    });
    managers.push(user);
  }
  console.log('✅ Core Role Users (MD, Admin, Manager, Finance, Employee) & Farm Managers created');

  // 3. Seed persisted HR records used by the HR portal
  const hrUsers = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  const attendanceDate = new Date('2026-09-07T00:00:00.000Z');
  for (const user of hrUsers) {
    const status = user.email === 'employee@ufms.com' ? 'ON_LEAVE' : user.email === 'hr@ufms.com' ? 'LATE' : 'PRESENT';
    await prisma.attendanceLog.upsert({
      where: { userId_date: { userId: user.id, date: attendanceDate } },
      update: { status, checkIn: status === 'ON_LEAVE' ? null : new Date('2026-09-07T07:45:00.000Z') },
      create: {
        userId: user.id,
        date: attendanceDate,
        status,
        checkIn: status === 'ON_LEAVE' ? undefined : new Date('2026-09-07T07:45:00.000Z'),
        notes: status === 'ON_LEAVE' ? 'Approved annual leave' : undefined,
      },
    });
  }

  const trainingSeed = [
    { title: 'Commercial Combine Harvester Safety', instructor: 'Farm Operations', scheduledDate: new Date('2026-09-10'), status: 'IN_PROGRESS' },
    { title: 'Pivot Irrigation Calibration & Telemetry', instructor: 'Engineering Team', scheduledDate: new Date('2026-09-18'), status: 'UPCOMING' },
    { title: 'Safe Agrochemical Handling & PPE Protocol', instructor: 'Ministry of Agriculture', scheduledDate: new Date('2026-08-28'), status: 'COMPLETED' },
  ];
  for (const training of trainingSeed) {
    const program = await prisma.trainingProgram.upsert({
      where: { id: trainingSeed.indexOf(training) + 1 },
      update: training,
      create: training,
    });
    for (const user of hrUsers.slice(0, training.status === 'COMPLETED' ? 4 : 3)) {
      await prisma.trainingEnrollment.upsert({
        where: { programId_userId: { programId: program.id, userId: user.id } },
        update: { status: training.status === 'COMPLETED' ? 'COMPLETED' : 'ENROLLED' },
        create: { programId: program.id, userId: user.id, status: training.status === 'COMPLETED' ? 'COMPLETED' : 'ENROLLED' },
      });
    }
  }

  for (const user of hrUsers) {
    await prisma.payrollRecord.upsert({
      where: { userId_period: { userId: user.id, period: '2026-09' } },
      update: {},
      create: { userId: user.id, period: '2026-09', grossAmount: 1800, deductions: 180, netAmount: 1620, status: 'PENDING' },
    });
  }
  console.log('✅ Attendance, training, and payroll records created');

  // 4. Seed Farms & Real Crops Dataset
  const farmsData = [
    {
      name: 'Green Valley Farm',
      location: 'Lilongwe, Malawi',
      size: 400,
      description: 'A large scale commercial crop farm focused on high yield grains, maize and sustainable pivot irrigation.',
      ownerId: managers[0].id,
      crops: [
        { name: 'Maize', variety: 'Hybrid SC 513', plantingDate: new Date('2025-01-15'), harvestDate: new Date('2026-04-15'), yield: 176, area: 400, status: CropStatus.GROWING },
      ],
      animals: [
        { name: 'Boran Cattle Herd', type: AnimalType.CATTLE, breed: 'Boran', age: 3, healthStatus: HealthStatus.HEALTHY },
        { name: 'Boer Goats Unit', type: AnimalType.GOAT, breed: 'Boer', age: 2, healthStatus: HealthStatus.HEALTHY },
      ],
      revenues: [
        { source: 'Maize Grain Supply', amount: 53650, date: new Date('2025-05-10') },
        { source: 'Commercial Grain Supply', amount: 38850, date: new Date('2025-03-05') },
      ],
    },
    {
      name: 'Sunrise Farm',
      location: 'Blantyre, Malawi',
      size: 350,
      description: 'Integrated agricultural enterprise combining tuber root crops with tea and livestock pastures.',
      ownerId: managers[1].id,
      crops: [
        { name: 'Cassava', variety: 'Kemboma', plantingDate: new Date('2025-01-20'), harvestDate: new Date('2026-03-20'), yield: 108, area: 250, status: CropStatus.GROWING },
        { name: 'Vegetables', variety: 'Horticulture Mix', plantingDate: new Date('2025-02-15'), harvestDate: new Date('2025-11-20'), yield: 30, area: 100, status: CropStatus.HARVESTED },
      ],
      animals: [
        { name: 'Dairy Herd A', type: AnimalType.CATTLE, breed: 'Friesian', age: 4, healthStatus: HealthStatus.HEALTHY },
        { name: 'Broiler Flock', type: AnimalType.POULTRY, breed: 'Cobb 500', age: 1, healthStatus: HealthStatus.HEALTHY },
      ],
      revenues: [
        { source: 'Cassava Wholesale', amount: 38700, date: new Date('2025-05-15') },
        { source: 'Horticulture Auction', amount: 29500, date: new Date('2025-04-20') },
      ],
    },
    {
      name: 'Happy Land Farm',
      location: 'Mzuzu, Malawi',
      size: 250,
      description: 'Fertile northern plateau farm specializing in certified legumes, soybeans and organic vegetables.',
      ownerId: managers[2].id,
      crops: [
        { name: 'Soybeans', variety: 'SB 19', plantingDate: new Date('2025-02-01'), harvestDate: new Date('2026-04-10'), yield: 76, area: 200, status: CropStatus.GROWING },
        { name: 'Vegetables', variety: 'Cabbage & Onion', plantingDate: new Date('2025-03-01'), harvestDate: new Date('2026-05-10'), yield: 11, area: 50, status: CropStatus.GROWING },
      ],
      animals: [
        { name: 'Dorper Sheep Flock', type: AnimalType.SHEEP, breed: 'Dorper', age: 2, healthStatus: HealthStatus.HEALTHY },
      ],
      revenues: [
        { source: 'Soybean Processing', amount: 32300, date: new Date('2025-05-02') },
        { source: 'Vegetable Supply Contract', amount: 20000, date: new Date('2025-02-18') },
      ],
    },
    {
      name: 'River View Farm',
      location: 'Karonga, Malawi',
      size: 150,
      description: 'River-basin farm dedicated to high-yield groundnut export seed and organic tubers.',
      ownerId: managers[3].id,
      crops: [
        { name: 'Groundnuts', variety: 'JL 24', plantingDate: new Date('2025-02-10'), harvestDate: new Date('2026-02-18'), yield: 61, area: 150, status: CropStatus.GROWING },
      ],
      animals: [
        { name: 'Large White Swine', type: AnimalType.PIG, breed: 'Large White', age: 2, healthStatus: HealthStatus.HEALTHY },
      ],
      revenues: [
        { source: 'Groundnut Export', amount: 32400, date: new Date('2025-05-08') },
      ],
    },
    {
      name: 'Kawale Farm',
      location: 'Kasungu, Malawi',
      size: 100,
      description: 'Central agricultural station focused on sunflower oil seed, sorghum and poultry breeding.',
      ownerId: managers[4].id,
      crops: [
        { name: 'Others', variety: 'Sunflower & Sorghum', plantingDate: new Date('2025-01-20'), harvestDate: new Date('2026-01-05'), yield: 20, area: 100, status: CropStatus.HARVESTED },
      ],
      animals: [
        { name: 'Layer Hens Unit', type: AnimalType.POULTRY, breed: 'Hy-Line Brown', age: 1, healthStatus: HealthStatus.HEALTHY },
      ],
      revenues: [
        { source: 'Sunflower & Poultry Sales', amount: 22100, date: new Date('2025-05-18') },
      ],
    },
    {
      name: 'Mwanga Farm',
      location: 'Kasungu, Malawi',
      size: 180,
      description: 'Certified organic farming operations focused on export-quality dry beans and pulses.',
      ownerId: managers[0].id,
      crops: [
        { name: 'Beans', variety: 'Rosecoco', plantingDate: new Date('2025-02-15'), harvestDate: new Date('2025-12-12'), yield: 1400, area: 180, status: CropStatus.GROWING },
      ],
      animals: [],
      revenues: [
        { source: 'Organic Beans Export', amount: 9200, date: new Date('2025-05-14') },
      ],
    },
    {
      name: 'Dedza Farm Station',
      location: 'Dedza, Malawi',
      size: 140,
      description: 'Highland industrial cotton propagation farm with strict biosecurity protocols.',
      ownerId: managers[1].id,
      crops: [
        { name: 'Cotton', variety: 'CICAM B72', plantingDate: new Date('2025-01-28'), harvestDate: new Date('2026-02-28'), yield: 2800, area: 140, status: CropStatus.GROWING },
      ],
      animals: [],
      revenues: [
        { source: 'Ginned Cotton Sales', amount: 8400, date: new Date('2025-04-05') },
      ],
    },
    {
      name: 'Main Store',
      location: 'Lilongwe Central Depot, Malawi',
      size: 50,
      description: 'Central agricultural machinery maintenance depot, parts store and equipment fleet base.',
      ownerId: managers[2].id,
      crops: [],
      animals: [],
      revenues: [],
    },
  ];

  const farmMap: Record<string, number> = {};

  for (const f of farmsData) {
    const { crops, animals, revenues, ...farmData } = f;
    const existing = await prisma.farm.findFirst({
      where: { name: farmData.name },
    });

    let farmId: number;
    if (existing) {
      farmId = existing.id;
      await prisma.farm.update({
        where: { id: farmId },
        data: farmData,
      });
    } else {
      const created = await prisma.farm.create({
        data: farmData,
      });
      farmId = created.id;
    }
    farmMap[farmData.name] = farmId;

    // Seed Crops
    for (const c of crops) {
      const existingCrop = await prisma.crop.findFirst({
        where: { farmId, name: c.name },
      });
      if (!existingCrop) {
        await prisma.crop.create({
          data: { ...c, farmId },
        });
      }
    }

    // Seed Animals
    for (const a of animals) {
      const existingAnimal = await prisma.animal.findFirst({
        where: { farmId, name: a.name },
      });
      if (!existingAnimal) {
        await prisma.animal.create({
          data: { ...a, farmId },
        });
      }
    }

    // Seed Revenues
    for (const rev of revenues) {
      const existingRev = await prisma.revenue.findFirst({
        where: { farmId, source: rev.source },
      });
      if (!existingRev) {
        await prisma.revenue.create({
          data: { ...rev, farmId },
        });
      }
    }
  }

  // Assign Core Users & Managers to Farms
  if (farmMap['Green Valley Farm']) {
    await prisma.user.updateMany({
      where: { email: { in: ['manager@ufms.com', 'employee@ufms.com', 'jane.smith@ufms.com'] } },
      data: { farmId: farmMap['Green Valley Farm'] },
    });
  }
  if (farmMap['Sunrise Farm']) {
    await prisma.user.updateMany({
      where: { email: { in: ['robert.johnson@ufms.com'] } },
      data: { farmId: farmMap['Sunrise Farm'] },
    });
  }
  if (farmMap['Happy Land Farm']) {
    await prisma.user.updateMany({
      where: { email: { in: ['sarah.wilson@ufms.com'] } },
      data: { farmId: farmMap['Happy Land Farm'] },
    });
  }
  if (farmMap['River View Farm']) {
    await prisma.user.updateMany({
      where: { email: { in: ['michael.brown@ufms.com'] } },
      data: { farmId: farmMap['River View Farm'] },
    });
  }
  if (farmMap['Kawale Farm']) {
    await prisma.user.updateMany({
      where: { email: { in: ['emily.davis@ufms.com'] } },
      data: { farmId: farmMap['Kawale Farm'] },
    });
  }
  if (farmMap['Main Store']) {
    await prisma.user.updateMany({
      where: { email: { in: ['store@ufms.com'] } },
      data: { farmId: farmMap['Main Store'] },
    });
  }

  console.log('✅ Users successfully assigned to their respective farms');

  // 4. Seed Assets & Equipment Dataset
  const assetsData = [
    {
      assetCode: 'AST-0001',
      name: 'John Deere 5075E Tractor',
      category: AssetCategory.TRACTORS,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2023-01-15'),
      purchasePrice: 48000,
      currentValue: 45000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'JD5075E-2023-8891',
      modelNumber: '5075E Utility 75HP',
      manufacturer: 'John Deere',
      year: 2023,
      nextMaintenanceDate: new Date('2025-05-25'),
      lastMaintenanceDate: new Date('2025-02-15'),
      notes: 'Primary heavy cultivation tractor equipped with 4WD and air-conditioned cab.',
      maintenances: [
        {
          title: '500-Hour Scheduled Hydraulic & Oil Service',
          type: MaintenanceType.ROUTINE,
          status: MaintenanceStatus.SCHEDULED,
          scheduledDate: new Date('2025-05-25'),
          cost: 350,
          technician: 'Patrick Banda (Lead Mech)',
          description: 'Full fluid change, high-pressure hydraulic filter swap, and fuel injector calibration.',
        },
      ],
    },
    {
      assetCode: 'AST-0002',
      name: 'New Holland Combine Harvester',
      category: AssetCategory.HARVESTERS,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2022-03-10'),
      purchasePrice: 198000,
      currentValue: 185000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'NH-TC530-9921',
      modelNumber: 'TC5.30 Grain Harvester',
      manufacturer: 'New Holland',
      year: 2022,
      nextMaintenanceDate: new Date('2025-06-05'),
      lastMaintenanceDate: new Date('2025-01-20'),
      notes: 'Grain harvester with multi-crop concave kit and straw chopper.',
      maintenances: [
        {
          title: 'Pre-Harvest Threshing Drum & Cutterbar Inspection',
          type: MaintenanceType.INSPECTION,
          status: MaintenanceStatus.SCHEDULED,
          scheduledDate: new Date('2025-06-05'),
          cost: 650,
          technician: 'Chifundo Mwale',
          description: 'Full inspection of rasp bars, concave clearance, grain elevator chains and sieve alignment.',
        },
      ],
    },
    {
      assetCode: 'AST-0003',
      name: 'Moldboard Plough - 5 Furrow',
      category: AssetCategory.IMPLEMENTS,
      farmName: 'Sunrise Farm',
      location: 'Sunrise Farm',
      purchaseDate: new Date('2023-06-05'),
      purchasePrice: 9200,
      currentValue: 8500,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'MBP-5F-4412',
      modelNumber: 'Reversible 5-Furrow HD',
      manufacturer: 'Rabe Agri',
      year: 2023,
      nextMaintenanceDate: new Date('2025-07-10'),
      lastMaintenanceDate: new Date('2024-12-10'),
      notes: 'Heavy duty reversible moldboard plough with shear-bolt stone protection.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0004',
      name: 'Toyota Dyna Truck',
      category: AssetCategory.VEHICLES,
      farmName: 'Sunrise Farm',
      location: 'Sunrise Farm',
      purchaseDate: new Date('2023-02-20'),
      purchasePrice: 32000,
      currentValue: 28000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.FAIR,
      imageUrl: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'TOY-DYNA-8812',
      modelNumber: 'Dyna 150 4.0L Diesel',
      manufacturer: 'Toyota',
      year: 2022,
      nextMaintenanceDate: new Date('2025-06-02'),
      lastMaintenanceDate: new Date('2025-01-10'),
      notes: 'Used for farm-to-market produce transit and bulk fertilizer haulage.',
      maintenances: [
        {
          title: 'Brake Pad Replacement & Differential Fluid Service',
          type: MaintenanceType.ROUTINE,
          status: MaintenanceStatus.SCHEDULED,
          scheduledDate: new Date('2025-06-02'),
          cost: 280,
          technician: 'Gift Chirwa',
          description: 'Front and rear brake pad replacement, rotor skim, and rear axle lube renewal.',
        },
      ],
    },
    {
      assetCode: 'AST-0005',
      name: 'Water Pump - 5HP',
      category: AssetCategory.IRRIGATION,
      farmName: 'Happy Land Farm',
      location: 'Happy Land Farm',
      purchaseDate: new Date('2022-05-18'),
      purchasePrice: 900,
      currentValue: 650,
      status: AssetStatus.UNDER_MAINTENANCE,
      condition: AssetCondition.FAIR,
      imageUrl: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'WP-5HP-7714',
      modelNumber: 'High Flow Centrifugal 5HP',
      manufacturer: 'Kirloskar',
      year: 2022,
      nextMaintenanceDate: new Date('2025-05-20'),
      lastMaintenanceDate: new Date('2025-02-01'),
      notes: 'Currently undergoing impeller and seal gasket replacement in the field workshop.',
      maintenances: [
        {
          title: 'Mechanical Seal & Impeller Overhaul',
          type: MaintenanceType.REPAIR,
          status: MaintenanceStatus.IN_PROGRESS,
          scheduledDate: new Date('2025-05-20'),
          cost: 120,
          technician: 'Kelvin Phiri',
          description: 'Replacing worn carbon seal and priming casing seal ring to restore 45m3/hr delivery.',
        },
      ],
    },
    {
      assetCode: 'AST-0006',
      name: 'Perkins Generator 40KVA',
      category: AssetCategory.POWER_EQUIPMENT,
      farmName: 'Main Store',
      location: 'Main Store',
      purchaseDate: new Date('2021-08-12'),
      purchasePrice: 18000,
      currentValue: 15000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'PERK-40K-0021',
      modelNumber: 'Silent Diesel 1103A',
      manufacturer: 'Perkins / FG Wilson',
      year: 2021,
      nextMaintenanceDate: new Date('2025-05-28'),
      lastMaintenanceDate: new Date('2025-01-15'),
      notes: 'Provides emergency automated backup power for cold storage and irrigation pumps.',
      maintenances: [
        {
          title: '250-Hour Engine Service & Battery Health Check',
          type: MaintenanceType.ROUTINE,
          status: MaintenanceStatus.SCHEDULED,
          scheduledDate: new Date('2025-05-28'),
          cost: 220,
          technician: 'Moses Gondwe',
          description: 'Oil, fuel, and air filter change plus ATS transfer switch simulation test.',
        },
      ],
    },
    {
      assetCode: 'AST-0007',
      name: 'Boom Sprayer 1000L',
      category: AssetCategory.IMPLEMENTS,
      farmName: 'Brown Fields',
      location: 'Brown Fields',
      purchaseDate: new Date('2023-07-07'),
      purchasePrice: 3400,
      currentValue: 2800,
      status: AssetStatus.INACTIVE,
      condition: AssetCondition.POOR,
      imageUrl: 'https://images.unsplash.com/photo-1584448141569-69f342da535c?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'BS1000-8841',
      modelNumber: 'Tractor Mounted 18m Boom',
      manufacturer: 'Agrex',
      year: 2023,
      nextMaintenanceDate: new Date('2025-06-15'),
      lastMaintenanceDate: new Date('2024-11-20'),
      notes: 'Nozzle manifolds and pressure valve require overhaul before next spraying season.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0008',
      name: 'Farm Trailer 6 Ton',
      category: AssetCategory.IMPLEMENTS,
      farmName: 'River View Farm',
      location: 'River View Farm',
      purchaseDate: new Date('2022-04-22'),
      purchasePrice: 3800,
      currentValue: 3200,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'FT-6T-1190',
      modelNumber: 'Tipping Hydraulic 6T',
      manufacturer: 'Jarmet',
      year: 2022,
      nextMaintenanceDate: new Date('2025-08-01'),
      lastMaintenanceDate: new Date('2025-01-05'),
      notes: 'Twin axle hydraulic tipping trailer for sugarcane, grain, and root crop haulage.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0009',
      name: 'Massey Ferguson 290 Tractor',
      category: AssetCategory.TRACTORS,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2021-11-10'),
      purchasePrice: 38000,
      currentValue: 32500,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'MF290-9941',
      modelNumber: 'MF 290 80HP',
      manufacturer: 'Massey Ferguson',
      year: 2021,
      nextMaintenanceDate: new Date('2025-06-20'),
      lastMaintenanceDate: new Date('2025-02-10'),
      notes: 'Workhorse tractor deployed for daily haulage, planting, and disc harrowing.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0010',
      name: 'Center Pivot Irrigation System (20 Ha)',
      category: AssetCategory.IRRIGATION,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2022-08-15'),
      purchasePrice: 72000,
      currentValue: 65000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'CP-20HA-5521',
      modelNumber: 'Pivot Pro 4-Span 200m',
      manufacturer: 'Valley Irrigation',
      year: 2022,
      nextMaintenanceDate: new Date('2025-06-18'),
      lastMaintenanceDate: new Date('2025-01-30'),
      notes: 'Automated 4-span center pivot equipped with variable rate spray nozzles and GPS tracker.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0011',
      name: 'Case IH Steiger 580 Tractor',
      category: AssetCategory.TRACTORS,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2023-04-10'),
      purchasePrice: 320000,
      currentValue: 295000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'CASE-580-0012',
      modelNumber: 'Steiger 580 HD 4WD',
      manufacturer: 'Case IH',
      year: 2023,
      nextMaintenanceDate: new Date('2025-07-01'),
      lastMaintenanceDate: new Date('2025-02-28'),
      notes: 'High horsepower articulated tractor for deep ripping and large-area seedbed preparation.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0012',
      name: 'Solar Submersible Pump 10KW',
      category: AssetCategory.IRRIGATION,
      farmName: 'Happy Land Farm',
      location: 'Happy Land Farm',
      purchaseDate: new Date('2023-09-01'),
      purchasePrice: 14500,
      currentValue: 13800,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'SOL-PUMP-10K-33',
      modelNumber: 'SolarFlow 48V DC 10KW',
      manufacturer: 'Lorentz',
      year: 2023,
      nextMaintenanceDate: new Date('2025-09-01'),
      lastMaintenanceDate: new Date('2024-09-01'),
      notes: 'Powers borehole water extraction to storage reservoirs with zero grid electricity costs.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0013',
      name: 'Isuzu NPR 4.5 Ton Refrigerated Truck',
      category: AssetCategory.VEHICLES,
      farmName: 'Main Store',
      location: 'Main Store',
      purchaseDate: new Date('2022-10-10'),
      purchasePrice: 42000,
      currentValue: 36000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'ISZ-NPR-9930',
      modelNumber: 'NPR 75 4.5T Reefer',
      manufacturer: 'Isuzu',
      year: 2022,
      nextMaintenanceDate: new Date('2025-06-12'),
      lastMaintenanceDate: new Date('2025-01-14'),
      notes: 'Equipped with Thermo King refrigeration unit for fresh horticultural transport.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0014',
      name: 'Grain Drying Silo Unit 500T',
      category: AssetCategory.STORAGE_PROCESSING,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2021-06-01'),
      purchasePrice: 160000,
      currentValue: 142000,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'SILO-500T-01',
      modelNumber: 'Cyclonic Grain Dryer 500T',
      manufacturer: 'Sukup Manufacturing',
      year: 2021,
      nextMaintenanceDate: new Date('2025-07-25'),
      lastMaintenanceDate: new Date('2024-12-05'),
      notes: 'Automated continuous moisture control drying silo with grain temperature sensors.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0015',
      name: 'Precision Seed Drill 24-Row',
      category: AssetCategory.IMPLEMENTS,
      farmName: 'Green Valley Farm',
      location: 'Green Valley Farm',
      purchaseDate: new Date('2023-10-05'),
      purchasePrice: 42000,
      currentValue: 39500,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'PSD-24R-8831',
      modelNumber: 'MaxEmerge 5 Planter',
      manufacturer: 'John Deere',
      year: 2023,
      nextMaintenanceDate: new Date('2025-08-10'),
      lastMaintenanceDate: new Date('2024-11-15'),
      notes: 'Vacuum seed meter precision planter with liquid fertilizer in-furrow attachment.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0016',
      name: 'Toyota Hilux 4x4 Double Cab',
      category: AssetCategory.VEHICLES,
      farmName: 'Sunrise Farm',
      location: 'Sunrise Farm',
      purchaseDate: new Date('2023-03-15'),
      purchasePrice: 45000,
      currentValue: 39800,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'HILUX-4X4-2023',
      modelNumber: 'Hilux 2.8 GD-6 4x4',
      manufacturer: 'Toyota',
      year: 2023,
      nextMaintenanceDate: new Date('2025-06-25'),
      lastMaintenanceDate: new Date('2025-02-12'),
      notes: 'Farm manager field inspection and rapid emergency response vehicle.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0017',
      name: 'Heavy Duty Disc Harrow 36-Disc',
      category: AssetCategory.IMPLEMENTS,
      farmName: 'Brown Fields',
      location: 'Brown Fields',
      purchaseDate: new Date('2022-07-20'),
      purchasePrice: 11500,
      currentValue: 9800,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'DH-36D-9902',
      modelNumber: 'Tandem Offset 36 Disc',
      manufacturer: 'Baldan',
      year: 2022,
      nextMaintenanceDate: new Date('2025-07-15'),
      lastMaintenanceDate: new Date('2024-12-18'),
      notes: 'Hydraulic folding offset disc harrow with notched blades for heavy trash cutting.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0018',
      name: 'Workshop Welding & Tooling Station',
      category: AssetCategory.TOOLS,
      farmName: 'Main Store',
      location: 'Main Store',
      purchaseDate: new Date('2022-01-10'),
      purchasePrice: 8500,
      currentValue: 7500,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'TOOL-WELD-400A',
      modelNumber: 'MIG/TIG Inverter Pro 400A',
      manufacturer: 'Lincoln Electric',
      year: 2022,
      nextMaintenanceDate: new Date('2025-07-05'),
      lastMaintenanceDate: new Date('2025-01-08'),
      notes: 'Heavy fabrication, hardfacing plough tips, and chassis repair station.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0019',
      name: 'Cummins Diesel Generator 60KVA',
      category: AssetCategory.POWER_EQUIPMENT,
      farmName: 'Sunrise Farm',
      location: 'Sunrise Farm',
      purchaseDate: new Date('2022-09-18'),
      purchasePrice: 24000,
      currentValue: 21500,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.GOOD,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'CUMM-60K-7712',
      modelNumber: 'C60 D5e Soundproof',
      manufacturer: 'Cummins Power',
      year: 2022,
      nextMaintenanceDate: new Date('2025-06-30'),
      lastMaintenanceDate: new Date('2025-02-05'),
      notes: 'Continuous power backup for tea processing plant and sorting lines.',
      maintenances: [],
    },
    {
      assetCode: 'AST-0020',
      name: 'Drip Irrigation Automation Controller',
      category: AssetCategory.IRRIGATION,
      farmName: 'Brown Fields',
      location: 'Brown Fields',
      purchaseDate: new Date('2023-05-12'),
      purchasePrice: 7500,
      currentValue: 6900,
      status: AssetStatus.IN_USE,
      condition: AssetCondition.EXCELLENT,
      imageUrl: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=300',
      serialNumber: 'DRIP-NMC-2023',
      modelNumber: 'NMC-PRO Climate & Fertigation',
      manufacturer: 'Netafim',
      year: 2023,
      nextMaintenanceDate: new Date('2025-08-20'),
      lastMaintenanceDate: new Date('2025-01-22'),
      notes: 'Controls multi-channel EC/pH injection fertigation for 50 hectares of sugarcane.',
      maintenances: [],
    },
  ];

  for (const a of assetsData) {
    const { farmName, maintenances, ...assetRecord } = a;
    const farmId = farmMap[farmName] || farmMap['Green Valley Farm'] || Object.values(farmMap)[0];

    const existingAsset = await prisma.asset.findUnique({
      where: { assetCode: assetRecord.assetCode },
    });

    let assetId: number;
    if (existingAsset) {
      assetId = existingAsset.id;
      await prisma.asset.update({
        where: { id: assetId },
        data: {
          ...assetRecord,
          farmId,
        },
      });
    } else {
      const created = await prisma.asset.create({
        data: {
          ...assetRecord,
          farmId,
        },
      });
      assetId = created.id;
    }

    // Seed Maintenances
    if (maintenances && maintenances.length > 0) {
      for (const m of maintenances) {
        const existingMaint = await prisma.assetMaintenance.findFirst({
          where: { assetId, title: m.title },
        });
        if (!existingMaint) {
          await prisma.assetMaintenance.create({
            data: {
              ...m,
              assetId,
            },
          });
        }
      }
    }
  }

  // 5. Seed Financial Accounts
  const accountsData = [
    { name: 'Operating Account', accountNumber: 'ACC-OP-0012984', bankName: 'National Bank of Malawi', balance: 86520, type: 'Checking' },
    { name: 'Sales Account', accountNumber: 'ACC-SL-9923841', bankName: 'Standard Bank', balance: 142500, type: 'Checking' },
    { name: 'Payroll Account', accountNumber: 'ACC-PR-4412093', bankName: 'First Capital Bank', balance: 34800, type: 'Checking' },
    { name: 'Receivable Account', accountNumber: 'ACC-RC-1109482', bankName: 'Ecobank', balance: 34250, type: 'Savings' },
    { name: 'Petty Cash', accountNumber: 'CASH-VAULT-01', bankName: 'Main Office Vault', balance: 4500, type: 'Cash' },
  ];

  for (const acc of accountsData) {
    await prisma.financialAccount.upsert({
      where: { name: acc.name },
      update: acc,
      create: acc,
    });
  }

  // 6. Seed Invoices
  const invoicesData = [
    {
      invoiceNumber: 'INV-2025-0052',
      title: 'Maize Sales - Green Valley Farm',
      customer: 'National Food Reserve Agency',
      customerEmail: 'procurement@nfra.mw',
      issueDate: new Date('2025-05-31'),
      dueDate: new Date('2025-06-30'),
      amount: 12500,
      paidAmount: 12500,
      status: InvoiceStatus.PAID,
      type: InvoiceType.RECEIVABLE,
      farmName: 'Green Valley Farm',
    },
    {
      invoiceNumber: 'INV-2025-0051',
      title: 'Milk Sales - Sunrise Farm',
      customer: 'Suncrest Creameries Ltd',
      customerEmail: 'orders@suncrest.com',
      issueDate: new Date('2025-05-28'),
      dueDate: new Date('2025-06-28'),
      amount: 3750,
      paidAmount: 3750,
      status: InvoiceStatus.PAID,
      type: InvoiceType.RECEIVABLE,
      farmName: 'Sunrise Farm',
    },
    {
      invoiceNumber: 'INV-2025-0050',
      title: 'Beans Sales - Happy Land Farm',
      customer: 'Rab Processors Ltd',
      customerEmail: 'finance@rabmw.com',
      issueDate: new Date('2025-05-25'),
      dueDate: new Date('2025-06-25'),
      amount: 5600,
      paidAmount: 0,
      status: InvoiceStatus.SENT,
      type: InvoiceType.RECEIVABLE,
      farmName: 'Happy Land Farm',
    },
    {
      invoiceNumber: 'INV-2025-0049',
      title: 'Groundnuts Sales - Brown Fields',
      customer: 'Mulling Group Ltd',
      customerEmail: 'accounts@mulling.mw',
      issueDate: new Date('2025-05-20'),
      dueDate: new Date('2025-06-20'),
      amount: 4250,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
      type: InvoiceType.RECEIVABLE,
      farmName: 'Brown Fields',
    },
    {
      invoiceNumber: 'INV-2025-0048',
      title: 'Sunflower Sales - River View Farm',
      customer: 'Capital Oil Refining',
      customerEmail: 'supply@capitaloil.com',
      issueDate: new Date('2025-05-18'),
      dueDate: new Date('2025-05-30'),
      amount: 6300,
      paidAmount: 0,
      status: InvoiceStatus.OVERDUE,
      type: InvoiceType.RECEIVABLE,
      farmName: 'River View Farm',
    },
    {
      invoiceNumber: 'INV-2025-0047',
      title: 'Tea Export Consignment - Sunrise Farm',
      customer: 'Limbe Leaf Tobacco & Tea',
      customerEmail: 'trade@limbeleaf.mw',
      issueDate: new Date('2025-05-12'),
      dueDate: new Date('2025-06-12'),
      amount: 14800,
      paidAmount: 14800,
      status: InvoiceStatus.PAID,
      type: InvoiceType.RECEIVABLE,
      farmName: 'Sunrise Farm',
    },
  ];

  const invoiceMap: Record<string, number> = {};
  for (const inv of invoicesData) {
    const { farmName, ...invData } = inv;
    const farmId = farmMap[farmName] || farmMap['Green Valley Farm'];

    const existingInv = await prisma.invoice.findUnique({
      where: { invoiceNumber: invData.invoiceNumber },
    });

    if (existingInv) {
      invoiceMap[invData.invoiceNumber] = existingInv.id;
      await prisma.invoice.update({
        where: { id: existingInv.id },
        data: { ...invData, farmId },
      });
    } else {
      const created = await prisma.invoice.create({
        data: { ...invData, farmId },
      });
      invoiceMap[invData.invoiceNumber] = created.id;
    }
  }

  // 7. Seed Transactions
  const transactionsData = [
    // May Recent Transactions (matching UI table)
    {
      reference: 'INV-2025-0052',
      date: new Date('2025-05-31'),
      description: 'Maize Sales - Green Valley Farm',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 12500,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'EXP-2025-0087',
      date: new Date('2025-05-30'),
      description: 'Fertilizer Purchase - DAP',
      category: 'Farm Inputs',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 4850,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'PAY-2025-0041',
      date: new Date('2025-05-29'),
      description: 'Employee Salaries - May 2025',
      category: 'Payroll',
      account: 'Payroll Account',
      type: TransactionType.EXPENSE,
      amount: 18750,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'INV-2025-0051',
      date: new Date('2025-05-28'),
      description: 'Milk Sales - Sunrise Farm',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 3750,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },
    {
      reference: 'EXP-2025-0086',
      date: new Date('2025-05-27'),
      description: 'Fuel Purchase',
      category: 'Fuel & Transport',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 2320,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },
    {
      reference: 'RCV-2025-0033',
      date: new Date('2025-05-26'),
      description: 'Payment from ABC Traders',
      category: 'Accounts Receivable',
      account: 'Receivable Account',
      type: TransactionType.INCOME,
      amount: 8200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Happy Land Farm',
    },
    {
      reference: 'EXP-2025-0085',
      date: new Date('2025-05-25'),
      description: 'Veterinary Supplies',
      category: 'Animal Health',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 1450,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },
    {
      reference: 'BIL-2025-0021',
      date: new Date('2025-05-24'),
      description: 'Electricity Bill - Farm Office',
      category: 'Utilities',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 580,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },

    // Additional May Transactions
    {
      reference: 'EXP-2025-0084',
      date: new Date('2025-05-22'),
      description: 'Certified Seed Corn Hybrid Bags',
      category: 'Farm Inputs',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 6200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'INV-2025-0047',
      date: new Date('2025-05-18'),
      description: 'Tea Auction Batch 4 Export',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 18750,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },
    {
      reference: 'EXP-2025-0083',
      date: new Date('2025-05-15'),
      description: 'Machinery Spare Parts & Hydraulic Hoses',
      category: 'Other Expenses',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 3200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Main Store',
    },
    {
      reference: 'EXP-2025-0082',
      date: new Date('2025-05-10'),
      description: 'Diesel Fuel for Center Pivot Generators',
      category: 'Fuel & Transport',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 4100,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'EXP-2025-0081',
      date: new Date('2025-05-08'),
      description: 'Livestock Vaccines & Antibiotic Dosing',
      category: 'Animal Health',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 2800,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },
    {
      reference: 'BIL-2025-0020',
      date: new Date('2025-05-04'),
      description: 'Water Pumping Grid Surcharge',
      category: 'Utilities',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 1450,
      status: TransactionStatus.COMPLETED,
      farmName: 'Happy Land Farm',
    },
    {
      reference: 'INV-2025-0046',
      date: new Date('2025-05-02'),
      description: 'Commercial Grain Supply Consignment',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 38850,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },

    // April Transactions
    {
      reference: 'INV-2025-0040',
      date: new Date('2025-04-28'),
      description: 'Soybean Meal Processing Pre-sale',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 24500,
      status: TransactionStatus.COMPLETED,
      farmName: 'Happy Land Farm',
    },
    {
      reference: 'EXP-2025-0070',
      date: new Date('2025-04-26'),
      description: 'Monthly Staff Payroll - April',
      category: 'Payroll',
      account: 'Payroll Account',
      type: TransactionType.EXPENSE,
      amount: 10000,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'EXP-2025-0069',
      date: new Date('2025-04-20'),
      description: 'Pesticide & Fungicide Application Spray',
      category: 'Farm Inputs',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 8200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Brown Fields',
    },
    {
      reference: 'INV-2025-0039',
      date: new Date('2025-04-12'),
      description: 'Sunflower Pre-sale Deposit',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 18000,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'EXP-2025-0068',
      date: new Date('2025-04-08'),
      description: 'Tractor Haulage & Fleet Fuel',
      category: 'Fuel & Transport',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 3100,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },

    // March Transactions
    {
      reference: 'INV-2025-0030',
      date: new Date('2025-03-25'),
      description: 'Sugarcane Bulk Delivery',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 61300,
      status: TransactionStatus.COMPLETED,
      farmName: 'Brown Fields',
    },
    {
      reference: 'EXP-2025-0050',
      date: new Date('2025-03-20'),
      description: 'Urea & NPK Compound Fertilizer',
      category: 'Farm Inputs',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 13200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'EXP-2025-0049',
      date: new Date('2025-03-15'),
      description: 'Cattle Feed & Mineral Supplements',
      category: 'Animal Health',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 4200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Sunrise Farm',
    },

    // February Transactions
    {
      reference: 'INV-2025-0020',
      date: new Date('2025-02-20'),
      description: 'Wheat Flour Forward Contract Deposit',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 18200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Happy Land Farm',
    },
    {
      reference: 'EXP-2025-0030',
      date: new Date('2025-02-14'),
      description: 'Farm Infrastructure & Canal Maintenance',
      category: 'Other Expenses',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 7050,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'BIL-2025-0010',
      date: new Date('2025-02-05'),
      description: 'HQ Internet, Cloud & Telemetry Utility',
      category: 'Utilities',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 4200,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },

    // January Transactions
    {
      reference: 'INV-2025-0010',
      date: new Date('2025-01-20'),
      description: 'Burley Tobacco Floor Auction Balance',
      category: 'Sales Revenue',
      account: 'Sales Account',
      type: TransactionType.INCOME,
      amount: 28600,
      status: TransactionStatus.COMPLETED,
      farmName: 'Dairy Farm',
    },
    {
      reference: 'EXP-2025-0015',
      date: new Date('2025-01-10'),
      description: 'Irrigation Drip Lines & Spares',
      category: 'Other Expenses',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 2800,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
    {
      reference: 'EXP-2025-0014',
      date: new Date('2025-01-05'),
      description: 'Planting Season Logistics Fuel',
      category: 'Fuel & Transport',
      account: 'Operating Account',
      type: TransactionType.EXPENSE,
      amount: 2800,
      status: TransactionStatus.COMPLETED,
      farmName: 'Green Valley Farm',
    },
  ];

  for (const t of transactionsData) {
    const { farmName, ...txData } = t;
    const farmId = farmMap[farmName] || farmMap['Green Valley Farm'];
    const invoiceId = invoiceMap[txData.reference] || null;

    const existingTx = await prisma.transaction.findUnique({
      where: { reference: txData.reference },
    });

    if (existingTx) {
      await prisma.transaction.update({
        where: { id: existingTx.id },
        data: { ...txData, farmId, invoiceId },
      });
    } else {
      await prisma.transaction.create({
        data: { ...txData, farmId, invoiceId },
      });
    }
  }

  // 8. Seed Budgets
  const budgetsData = [
    {
      name: 'Farm Inputs Budget 2025',
      category: 'Farm Inputs',
      allocatedAmount: 45000,
      spentAmount: 32450,
      period: '2025 Season A',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      farmName: 'Green Valley Farm',
    },
    {
      name: 'Operational Payroll 2025',
      category: 'Payroll',
      allocatedAmount: 40000,
      spentAmount: 28750,
      period: '2025 Season A',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      farmName: 'Green Valley Farm',
    },
    {
      name: 'Fleet Fuel & Transit Budget',
      category: 'Fuel & Transport',
      allocatedAmount: 20000,
      spentAmount: 12320,
      period: '2025 Season A',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      farmName: 'Sunrise Farm',
    },
    {
      name: 'Animal Health & Feed Budget',
      category: 'Animal Health',
      allocatedAmount: 15000,
      spentAmount: 8450,
      period: '2025 Season A',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      farmName: 'Sunrise Farm',
    },
  ];

  for (const b of budgetsData) {
    const { farmName, ...bData } = b;
    const farmId = farmMap[farmName] || farmMap['Green Valley Farm'];

    const existingBudget = await prisma.budget.findFirst({
      where: { name: bData.name },
    });

    if (existingBudget) {
      await prisma.budget.update({
        where: { id: existingBudget.id },
        data: { ...bData, farmId },
      });
    } else {
      await prisma.budget.create({
        data: { ...bData, farmId },
      });
    }
  }

  // 9. Seed Key Decisions & Approvals
  const approvalsData = [
    {
      title: 'Project Budget Approval – Green Valley Farm',
      category: 'Budget',
      requestedBy: 'Agronomy Lead',
      amount: 25000,
      meta: '$25,000',
      status: ApprovalStatus.PENDING,
      date: new Date('2025-05-28'),
      farmName: 'Green Valley Farm',
    },
    {
      title: 'Purchase Request – Fertilizer',
      category: 'Procurement',
      requestedBy: 'Farm Operations',
      amount: 12500,
      meta: '$12,500',
      status: ApprovalStatus.PENDING,
      date: new Date('2025-05-27'),
      farmName: 'Green Valley Farm',
    },
    {
      title: 'Leave Request – HR',
      category: 'HR',
      requestedBy: 'Senior Mechanic',
      amount: null,
      meta: '3 days',
      status: ApprovalStatus.PENDING,
      date: new Date('2025-05-26'),
      farmName: 'Sunrise Farm',
    },
    {
      title: 'Financial Report – Q2',
      category: 'Finance',
      requestedBy: 'Finance Department',
      amount: null,
      meta: 'Q2 Statement',
      status: ApprovalStatus.FOR_REVIEW,
      date: new Date('2025-05-25'),
      farmName: 'Green Valley Farm',
    },
    {
      title: 'Asset Purchase – Tractor',
      category: 'Asset',
      requestedBy: 'Logistics Supervisor',
      amount: 45000,
      meta: '$45,000',
      status: ApprovalStatus.APPROVED,
      date: new Date('2025-05-24'),
      farmName: 'Sunrise Farm',
    },
  ];

  for (const app of approvalsData) {
    const { farmName, ...aData } = app;
    const farmId = farmMap[farmName] || farmMap['Green Valley Farm'];

    const existingApp = await prisma.approvalRequest.findFirst({
      where: { title: aData.title },
    });

    if (existingApp) {
      await prisma.approvalRequest.update({
        where: { id: existingApp.id },
        data: { ...aData, farmId },
      });
    } else {
      await prisma.approvalRequest.create({
        data: { ...aData, farmId },
      });
    }
  }

  // 10. Seed Strategic Goals
  const goalsData = [
    {
      title: 'Increase crop production',
      target: 'Target: 600 tons',
      currentValue: 432,
      targetValue: 600,
      unit: 'tons',
      progressPercent: 72,
      category: 'PRODUCTION',
      status: GoalStatus.IN_PROGRESS,
      deadline: new Date('2025-12-31'),
    },
    {
      title: 'Expand livestock stock',
      target: 'Target: 1,500 animals',
      currentValue: 870,
      targetValue: 1500,
      unit: 'animals',
      progressPercent: 58,
      category: 'LIVESTOCK',
      status: GoalStatus.IN_PROGRESS,
      deadline: new Date('2025-12-31'),
    },
    {
      title: 'Improve profitability',
      target: 'Target: $250,000',
      currentValue: 162500,
      targetValue: 250000,
      unit: 'USD',
      progressPercent: 65,
      category: 'PROFITABILITY',
      status: GoalStatus.IN_PROGRESS,
      deadline: new Date('2025-12-31'),
    },
    {
      title: 'Complete irrigation project',
      target: 'Target: 100 ha',
      currentValue: 40,
      targetValue: 100,
      unit: 'ha',
      progressPercent: 40,
      category: 'INFRASTRUCTURE',
      status: GoalStatus.IN_PROGRESS,
      deadline: new Date('2025-12-31'),
    },
  ];

  for (const g of goalsData) {
    const existingGoal = await prisma.strategicGoal.findFirst({
      where: { title: g.title },
    });

    if (existingGoal) {
      await prisma.strategicGoal.update({
        where: { id: existingGoal.id },
        data: g,
      });
    } else {
      await prisma.strategicGoal.create({
        data: g,
      });
    }
  }

  // 11. Seed Recent Activities
  const activitiesData = [
    {
      title: 'New crop yield record updated (Maize)',
      type: 'CROP',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      details: '176 tons harvested across Field Pivot Alpha',
      farmName: 'Green Valley Farm',
    },
    {
      title: 'Livestock vaccination completed',
      type: 'LIVESTOCK',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      details: 'Quarterly Foot & Mouth vaccination administered',
      farmName: 'Sunrise Farm',
    },
    {
      title: 'Project milestone reached (Irrigation)',
      type: 'PROJECT',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      details: 'Phase 2 pump station telemetry connected',
      farmName: 'Green Valley Farm',
    },
    {
      title: 'Expense approved (Fertilizer Purchase)',
      type: 'FINANCE',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      details: 'DAP compound chemical consignment authorized',
      farmName: 'Green Valley Farm',
    },
    {
      title: 'New employee added',
      type: 'HR',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      details: 'Agronomy specialist onboarded for northern zone',
      farmName: 'Happy Land Farm',
    },
  ];

  for (const act of activitiesData) {
    const { farmName, ...actData } = act;
    const farmId = farmMap[farmName] || farmMap['Green Valley Farm'];

    const existingAct = await prisma.farmActivityLog.findFirst({
      where: { title: actData.title },
    });

    if (existingAct) {
      await prisma.farmActivityLog.update({
        where: { id: existingAct.id },
        data: { ...actData, farmId },
      });
    } else {
      await prisma.farmActivityLog.create({
        data: { ...actData, farmId },
      });
    }
  }

  // 12. Seed Executive Reports
  const reportsData = [
    {
      title: 'Financial Report (Q2 2025)',
      date: new Date('2025-05-25'),
      format: 'PDF',
      category: 'FINANCIAL',
    },
    {
      title: 'Crop Production Report',
      date: new Date('2025-05-20'),
      format: 'PDF',
      category: 'CROPS',
    },
    {
      title: 'Livestock Report',
      date: new Date('2025-05-18'),
      format: 'PDF',
      category: 'LIVESTOCK',
    },
    {
      title: 'Inventory Report',
      date: new Date('2025-05-15'),
      format: 'Excel',
      category: 'INVENTORY',
    },
    {
      title: 'Project Progress Report',
      date: new Date('2025-05-12'),
      format: 'PDF',
      category: 'PROJECTS',
    },
  ];

  for (const rep of reportsData) {
    const existingRep = await prisma.executiveReport.findFirst({
      where: { title: rep.title },
    });

    if (existingRep) {
      await prisma.executiveReport.update({
        where: { id: existingRep.id },
        data: rep,
      });
    } else {
      await prisma.executiveReport.create({
        data: rep,
      });
    }
  }

  console.log('✅ Real Farms, Crops, Animals, Assets, Invoices, Accounts, Approvals, Goals & Reports successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });