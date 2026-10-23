import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL tanımlı değil');
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const real = client();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
