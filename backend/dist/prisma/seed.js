import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, CropStatus, AnimalType, HealthStatus, AssetCategory, AssetStatus, AssetCondition, MaintenanceType, MaintenanceStatus, } from '@prisma/client';
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
    // 1. Seed Roles
    const rolesData = [
        { name: 'Administrator', description: 'Full system access' },
        { name: 'Managing Director', description: 'Overall management' },
        { name: 'Finance Manager', description: 'Financial operations' },
        { name: 'Farm Manager', description: 'Farm operations' },
        { name: 'HR Manager', description: 'Human resources' },
        { name: 'Employee', description: 'Basic user access' },
    ];
    const roles = {};
    for (const r of rolesData) {
        roles[r.name] = await prisma.role.upsert({
            where: { name: r.name },
            update: {},
            create: r,
        });
    }
    console.log('✅ Roles created');
    const hashedPassword = await bcrypt.hash('password123', 10);
    // 2. Seed Admin & Managers
    await prisma.user.upsert({
        where: { email: 'admin@ufms.com' },
        update: {},
        create: {
            email: 'admin@ufms.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            roleId: roles['Administrator'].id,
            isVerified: true,
            isActive: true,
        },
    });
    const managersData = [
        { email: 'jane.smith@ufms.com', firstName: 'Jane', lastName: 'Smith' },
        { email: 'robert.johnson@ufms.com', firstName: 'Robert', lastName: 'Johnson' },
        { email: 'sarah.wilson@ufms.com', firstName: 'Sarah', lastName: 'Wilson' },
        { email: 'michael.brown@ufms.com', firstName: 'Michael', lastName: 'Brown' },
        { email: 'emily.davis@ufms.com', firstName: 'Emily', lastName: 'Davis' },
        { email: 'david.thompson@ufms.com', firstName: 'David', lastName: 'Thompson' },
        { email: 'lisa.anderson@ufms.com', firstName: 'Lisa', lastName: 'Anderson' },
        { email: 'james.martin@ufms.com', firstName: 'James', lastName: 'Martin' },
    ];
    const managers = [];
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
    console.log('✅ Users & Managers created');
    // 3. Seed Farms & Real Crops Dataset
    const farmsData = [
        {
            name: 'Green Valley Farm',
            location: 'Lilongwe, Malawi',
            size: 1570,
            description: 'A large scale commercial crop farm focused on high yield grains, oilseeds and sustainable irrigation.',
            ownerId: managers[0].id,
            crops: [
                { name: 'Maize', variety: 'Hybrid SC 513', plantingDate: new Date('2025-01-15'), harvestDate: new Date('2026-04-15'), yield: 8500, area: 1250, status: CropStatus.GROWING },
                { name: 'Sunflower', variety: 'Kilimo', plantingDate: new Date('2025-01-25'), harvestDate: new Date('2026-03-15'), yield: 2100, area: 320, status: CropStatus.GROWING },
            ],
            animals: [],
            revenues: [
                { source: 'Maize Grain Supply', amount: 35600, date: new Date('2025-05-10') },
                { source: 'Sunflower Oil Seed Pre-sale', amount: 18000, date: new Date('2025-04-12') },
                { source: 'Commercial Grain Supply', amount: 38850, date: new Date('2025-03-05') },
            ],
        },
        {
            name: 'Sunrise Farm',
            location: 'Blantyre, Malawi',
            size: 1250,
            description: 'Integrated agricultural enterprise combining lowland commercial rice fields with high-altitude tea plantations.',
            ownerId: managers[1].id,
            crops: [
                { name: 'Rice', variety: 'NERICA 4', plantingDate: new Date('2025-01-20'), harvestDate: new Date('2026-03-20'), yield: 4800, area: 850, status: CropStatus.GROWING },
                { name: 'Tea', variety: 'PC 108', plantingDate: new Date('2024-11-20'), harvestDate: new Date('2025-11-20'), yield: 6100, area: 400, status: CropStatus.HARVESTED },
            ],
            animals: [
                { name: 'Boran Cattle', type: AnimalType.CATTLE, breed: 'Boran', age: 3, healthStatus: HealthStatus.HEALTHY },
            ],
            revenues: [
                { source: 'Tea Auction', amount: 18750, date: new Date('2025-05-15') },
                { source: 'Rice Wholesale', amount: 24500, date: new Date('2025-04-20') },
            ],
        },
        {
            name: 'Happy Land Farm',
            location: 'Mzuzu, Malawi',
            size: 830,
            description: 'Fertile northern plateau farm specializing in certified legume propagation and winter wheat.',
            ownerId: managers[2].id,
            crops: [
                { name: 'Soybeans', variety: 'SB 19', plantingDate: new Date('2025-02-01'), harvestDate: new Date('2026-04-10'), yield: 3200, area: 620, status: CropStatus.GROWING },
                { name: 'Wheat', variety: 'Gamtoos', plantingDate: new Date('2025-04-01'), harvestDate: new Date('2026-05-10'), yield: 3900, area: 210, status: CropStatus.GROWING },
            ],
            animals: [
                { name: 'Dairy Herd A', type: AnimalType.CATTLE, breed: 'Friesian', age: 4, healthStatus: HealthStatus.HEALTHY },
            ],
            revenues: [
                { source: 'Soybean Processing', amount: 15300, date: new Date('2025-05-02') },
                { source: 'Wheat Flour Contract', amount: 18200, date: new Date('2025-02-18') },
            ],
        },
        {
            name: 'Brown Fields',
            location: 'Salima, Malawi',
            size: 650,
            description: 'Lakeside fertile agricultural fields dedicated to high-demand industrial commodities.',
            ownerId: managers[3].id,
            crops: [
                { name: 'Groundnuts', variety: 'JL 24', plantingDate: new Date('2025-02-10'), harvestDate: new Date('2026-02-18'), yield: 1800, area: 300, status: CropStatus.GROWING },
                { name: 'Sugarcane', variety: 'NCo 376', plantingDate: new Date('2024-09-15'), harvestDate: new Date('2026-06-30'), yield: 9500, area: 350, status: CropStatus.GROWING },
            ],
            animals: [],
            revenues: [
                { source: 'Groundnut Export', amount: 12900, date: new Date('2025-05-08') },
                { source: 'Sugarcane Delivery', amount: 61300, date: new Date('2025-03-25') },
            ],
        },
        {
            name: 'Dairy Farm',
            location: 'Ntchisi, Malawi',
            size: 450,
            description: 'High-altitude multi-enterprise farm with burley tobacco and automated livestock production.',
            ownerId: managers[4].id,
            crops: [
                { name: 'Tobacco', variety: 'Burley', plantingDate: new Date('2024-10-15'), harvestDate: new Date('2026-01-05'), yield: 4200, area: 450, status: CropStatus.HARVESTED },
            ],
            animals: [
                { name: 'Holstein Herd', type: AnimalType.CATTLE, breed: 'Holstein-Friesian', age: 3, healthStatus: HealthStatus.HEALTHY },
            ],
            revenues: [
                { source: 'Tobacco Auction Floor', amount: 28600, date: new Date('2025-05-18') },
            ],
        },
        {
            name: 'River View Farm',
            location: 'Karonga, Malawi',
            size: 220,
            description: 'River-basin farm dedicated to high-yield tuber crops and orange-fleshed sweet potatoes.',
            ownerId: managers[5].id,
            crops: [
                { name: 'Sweet Potatoes', variety: 'SP Local', plantingDate: new Date('2025-03-01'), harvestDate: new Date('2026-01-25'), yield: 6500, area: 220, status: CropStatus.GROWING },
            ],
            animals: [],
            revenues: [
                { source: 'Tuber Distribution', amount: 9800, date: new Date('2025-04-10') },
            ],
        },
        {
            name: 'Mwanga Farm',
            location: 'Kasungu, Malawi',
            size: 180,
            description: 'Certified organic farming operations focused on export-quality dry beans and pulses.',
            ownerId: managers[6].id,
            crops: [
                { name: 'Beans', variety: 'Rosecoco', plantingDate: new Date('2025-02-15'), harvestDate: new Date('2025-12-12'), yield: 1400, area: 180, status: CropStatus.GROWING },
            ],
            animals: [],
            revenues: [
                { source: 'Organic Beans Export', amount: 9200, date: new Date('2025-05-14') },
            ],
        },
        {
            name: 'Kawale Farm',
            location: 'Dedza, Malawi',
            size: 140,
            description: 'Highland industrial cotton propagation farm with strict biosecurity protocols.',
            ownerId: managers[7].id,
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
            ownerId: managers[0].id,
            crops: [],
            animals: [],
            revenues: [],
        },
    ];
    const farmMap = {};
    for (const f of farmsData) {
        const { crops, animals, revenues, ...farmData } = f;
        const existing = await prisma.farm.findFirst({
            where: { name: farmData.name },
        });
        let farmId;
        if (existing) {
            farmId = existing.id;
            await prisma.farm.update({
                where: { id: farmId },
                data: farmData,
            });
        }
        else {
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
        let assetId;
        if (existingAsset) {
            assetId = existingAsset.id;
            await prisma.asset.update({
                where: { id: assetId },
                data: {
                    ...assetRecord,
                    farmId,
                },
            });
        }
        else {
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
    console.log('✅ Real Farms, Crops, Animals, Revenues & Assets successfully seeded!');
}
main()
    .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
