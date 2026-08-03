import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Check backend/.env before running the seed script.');
}

// Create the adapter directly with the connection string
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = [
    { name: 'Administrator', description: 'Full system access' },
    { name: 'Managing Director', description: 'Overall management' },
    { name: 'Finance Manager', description: 'Financial operations' },
    { name: 'Farm Manager', description: 'Farm operations' },
    { name: 'HR Manager', description: 'Human resources' },
    { name: 'Employee', description: 'Basic user access' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('✅ Default roles created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });