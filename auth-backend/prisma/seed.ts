import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function main() {
    console.log('🌱 Starting safe seed...');

    const adminPasswordHash = await hashPassword('Test@123456');
    const adminData = {
        name: 'Admin Master',
        email: 'admin@platform.com',
        phone: '+967777000001',
        role: 'PLATFORM_ADMIN' as const,
        status: 'ACTIVE' as const,
        emailVerified: true,
    };

    const existingAdmin =
        (await prisma.user.findUnique({
            where: { email: adminData.email },
        })) ||
        (await prisma.user.findFirst({
            where: { phone: adminData.phone },
        }));

    if (existingAdmin) {
        await prisma.user.update({
            where: { id: existingAdmin.id },
            data: {
                ...adminData,
                password: adminPasswordHash,
            },
        });
        console.log('✅ Admin account updated or confirmed.');
    } else {
        await prisma.user.create({
            data: {
                ...adminData,
                password: adminPasswordHash,
            },
        });
        console.log('✅ Admin account created.');
    }

    console.log('📋 Seed Summary:');
    console.log('=====================================');
    console.log('👤 Users: 1');
    console.log('   - Platform Admins: 1');
    console.log('');
    console.log('📝 Admin account:');
    console.log('   - Name: Admin Master');
    console.log('   - Email: admin@platform.com');
    console.log('   - Phone: +967777000001');
    console.log('   - Role: PLATFORM_ADMIN');
    console.log('');
    console.log('⚠️  Test password is still temporary and must be changed after first login.');
    console.log('=====================================');
    console.log('✨ Safe seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
