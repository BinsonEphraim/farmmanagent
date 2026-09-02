import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalForPrisma = global;
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Check backend/.env before starting the server.');
}
// Create the adapter directly with the connection string
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
export default prisma;
