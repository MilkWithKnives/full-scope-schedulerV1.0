import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module polyfill for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error', 'warn']
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
