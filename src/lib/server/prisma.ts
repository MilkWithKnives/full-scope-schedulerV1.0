import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module polyfill for __dirname - must be set globally before importing Prisma
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set global __dirname for Prisma Client
(globalThis as any).__dirname = __dirname;

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error', 'warn']
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
