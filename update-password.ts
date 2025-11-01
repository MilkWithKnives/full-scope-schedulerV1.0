import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	const email = 'ryan@fullscope-media.com';
	const newPassword = 'password123'; // Change this to your desired password

	console.log('🔐 Updating password for:', email);

	// Check if user exists
	const user = await prisma.user.findUnique({
		where: { email }
	});

	if (!user) {
		console.error('❌ User not found:', email);
		process.exit(1);
	}

	// Hash the new password
	const hashedPassword = await bcrypt.hash(newPassword, 10);

	// Update the password
	await prisma.user.update({
		where: { email },
		data: { password: hashedPassword }
	});

	console.log('✅ Password updated successfully!');
	console.log('\n📝 Login credentials:');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('Email:   ', email);
	console.log('Password:', newPassword);
	console.log('Role:    ', user.role);
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('\n🚀 Go to http://localhost:5173/auth/login to sign in!');
}

main()
	.catch((e) => {
		console.error('❌ Update failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
