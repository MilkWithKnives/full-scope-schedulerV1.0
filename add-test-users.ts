import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('👥 Adding test users...');

	// Get existing organization
	const org = await prisma.organization.findFirst();

	if (!org) {
		console.error('❌ No organization found. Run seed.ts first.');
		process.exit(1);
	}

	console.log('✓ Found organization:', org.name);

	// Check for location
	let location = await prisma.location.findFirst({
		where: { organizationId: org.id }
	});

	// Create location if it doesn't exist
	if (!location) {
		location = await prisma.location.create({
			data: {
				name: 'Main Location',
				address: '123 Main St',
				organizationId: org.id
			}
		});
		console.log('✓ Location created:', location.name);
	} else {
		console.log('✓ Found location:', location.name);
	}

	const password = await bcrypt.hash('password123', 10);

	// Create manager if doesn't exist
	const existingManager = await prisma.user.findUnique({
		where: { email: 'manager@fullscope-media.com' }
	});

	if (!existingManager) {
		await prisma.user.create({
			data: {
				email: 'manager@fullscope-media.com',
				name: 'Sarah Manager',
				password,
				role: 'MANAGER',
				organizationId: org.id,
				defaultHourlyRate: 18.0
			}
		});
		console.log('✓ Manager created: manager@fullscope-media.com');
	} else {
		console.log('✓ Manager already exists: manager@fullscope-media.com');
	}

	// Create employees
	const employees = [
		{ email: 'john@fullscope-media.com', name: 'John Employee', rate: 15.0 },
		{ email: 'jane@fullscope-media.com', name: 'Jane Employee', rate: 15.5 },
		{ email: 'mike@fullscope-media.com', name: 'Mike Employee', rate: 16.0 }
	];

	for (const emp of employees) {
		const existing = await prisma.user.findUnique({
			where: { email: emp.email }
		});

		if (!existing) {
			const user = await prisma.user.create({
				data: {
					email: emp.email,
					name: emp.name,
					password,
					role: 'EMPLOYEE',
					organizationId: org.id,
					defaultHourlyRate: emp.rate
				}
			});

			// Add sample availability
			await prisma.availability.createMany({
				data: [
					{
						userId: user.id,
						dayOfWeek: 1, // Monday
						startTime: '09:00',
						endTime: '17:00',
						isRecurring: true
					},
					{
						userId: user.id,
						dayOfWeek: 2, // Tuesday
						startTime: '09:00',
						endTime: '17:00',
						isRecurring: true
					},
					{
						userId: user.id,
						dayOfWeek: 4, // Thursday
						startTime: '09:00',
						endTime: '17:00',
						isRecurring: true
					}
				]
			});

			console.log('✓ Employee created:', emp.email);
		} else {
			console.log('✓ Employee already exists:', emp.email);
		}
	}

	console.log('\n✅ All test users ready!\n');
	console.log('📝 Login credentials (all use password: password123):');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('OWNER:');
	console.log('  📧 ryan@fullscope-media.com');
	console.log('');
	console.log('MANAGER:');
	console.log('  📧 manager@fullscope-media.com');
	console.log('');
	console.log('EMPLOYEES:');
	console.log('  📧 john@fullscope-media.com');
	console.log('  📧 jane@fullscope-media.com');
	console.log('  📧 mike@fullscope-media.com');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('\n🚀 Go to http://localhost:5173/auth/login to sign in!');
}

main()
	.catch((e) => {
		console.error('❌ Failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
