import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	// Check if organization already exists
	const existingOrg = await prisma.organization.findFirst();

	if (existingOrg) {
		console.log('✓ Organization already exists:', existingOrg.name);
		console.log('  ID:', existingOrg.id);

		// Check for users
		const users = await prisma.user.findMany({
			where: { organizationId: existingOrg.id }
		});

		if (users.length > 0) {
			console.log(`✓ Found ${users.length} existing users:`);
			users.forEach((user) => {
				console.log(`  - ${user.email} (${user.role})`);
			});
			console.log('\n✅ Database already seeded! Use existing credentials to login.');
			return;
		}
	}

	// Create organization
	const organization = existingOrg || await prisma.organization.create({
		data: {
			name: 'My Restaurant',
			plan: 'free'
		}
	});

	console.log('✓ Organization created:', organization.name);

	// Create location
	const location = await prisma.location.create({
		data: {
			name: 'Main Location',
			address: '123 Main St',
			organizationId: organization.id
		}
	});

	console.log('✓ Location created:', location.name);

	// Create owner account
	const ownerPassword = await bcrypt.hash('password123', 10);
	const owner = await prisma.user.create({
		data: {
			email: 'owner@example.com',
			name: 'Restaurant Owner',
			password: ownerPassword,
			role: 'OWNER',
			organizationId: organization.id,
			defaultHourlyRate: 20.0
		}
	});

	console.log('✓ Owner account created:', owner.email);

	// Create manager account
	const managerPassword = await bcrypt.hash('password123', 10);
	const manager = await prisma.user.create({
		data: {
			email: 'manager@example.com',
			name: 'Shift Manager',
			password: managerPassword,
			role: 'MANAGER',
			organizationId: organization.id,
			defaultHourlyRate: 18.0
		}
	});

	console.log('✓ Manager account created:', manager.email);

	// Create employee account
	const employeePassword = await bcrypt.hash('password123', 10);
	const employee = await prisma.user.create({
		data: {
			email: 'employee@example.com',
			name: 'John Employee',
			password: employeePassword,
			role: 'EMPLOYEE',
			organizationId: organization.id,
			defaultHourlyRate: 15.0
		}
	});

	console.log('✓ Employee account created:', employee.email);

	// Create some sample availability for the employee
	await prisma.availability.createMany({
		data: [
			{
				userId: employee.id,
				dayOfWeek: 1, // Monday
				startTime: '09:00',
				endTime: '17:00',
				isRecurring: true
			},
			{
				userId: employee.id,
				dayOfWeek: 3, // Wednesday
				startTime: '09:00',
				endTime: '17:00',
				isRecurring: true
			},
			{
				userId: employee.id,
				dayOfWeek: 5, // Friday
				startTime: '09:00',
				endTime: '17:00',
				isRecurring: true
			}
		]
	});

	console.log('✓ Sample availability created for employee');

	console.log('\n✅ Seeding complete!\n');
	console.log('📝 Login credentials:');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('OWNER ACCOUNT:');
	console.log('  Email:    owner@example.com');
	console.log('  Password: password123');
	console.log('');
	console.log('MANAGER ACCOUNT:');
	console.log('  Email:    manager@example.com');
	console.log('  Password: password123');
	console.log('');
	console.log('EMPLOYEE ACCOUNT:');
	console.log('  Email:    employee@example.com');
	console.log('  Password: password123');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('\n🚀 Go to http://localhost:5173/auth/login to sign in!');
}

main()
	.catch((e) => {
		console.error('❌ Seeding failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
