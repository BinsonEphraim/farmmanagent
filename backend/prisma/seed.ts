import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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