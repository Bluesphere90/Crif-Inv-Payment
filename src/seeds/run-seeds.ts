import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { SaleTeam } from '../entities/SaleTeam';
import { UserRole } from '../types/enums';
import bcrypt from 'bcrypt';

async function runSeeds() {
    try {
        console.log('Initializing database connection...');
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const userRepository = AppDataSource.getRepository(User);
        const teamRepository = AppDataSource.getRepository(SaleTeam);

        // Create sample sale teams
        console.log('\nCreating sale teams...');

        const team1 = teamRepository.create({
            name: 'Team Alpha',
            description: 'Sales Team Alpha',
            isActive: true,
        });
        await teamRepository.save(team1);
        console.log('✅ Created Team Alpha');

        const team2 = teamRepository.create({
            name: 'Team Beta',
            description: 'Sales Team Beta',
            isActive: true,
        });
        await teamRepository.save(team2);
        console.log('✅ Created Team Beta');

        // Helper to hash password
        const hash = async (pwd: string) => bcrypt.hash(pwd, 10);

        // Create admin user
        console.log('\nCreating admin user...');

        const existingAdmin = await userRepository.findOne({
            where: { email: 'admin@company.com' },
        });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
        } else {
            const admin = userRepository.create({
                email: 'admin@company.com',
                passwordHash: await hash('Admin@123'),
                role: UserRole.ADMIN,
                isActive: true,
            });
            await userRepository.save(admin);
            console.log('✅ Created admin user');
            console.log('   Email: admin@company.com');
            console.log('   Password: Admin@123');
            console.log('   ⚠️  IMPORTANT: Change this password after first login!');
        }

        // Create accounting user
        console.log('\nCreating accounting user...');

        const existingAccounting = await userRepository.findOne({
            where: { email: 'accounting@company.com' },
        });

        if (existingAccounting) {
            console.log('⚠️  Accounting user already exists');
        } else {
            const accounting = userRepository.create({
                email: 'accounting@company.com',
                passwordHash: await hash('Accounting@123'),
                role: UserRole.ACCOUNTING,
                isActive: true,
            });
            await userRepository.save(accounting);
            console.log('✅ Created accounting user');
            console.log('   Email: accounting@company.com');
            console.log('   Password: Accounting@123');
        }

        // Create sale leader
        console.log('\nCreating sale leader...');

        const existingLeader = await userRepository.findOne({
            where: { email: 'leader@company.com' },
        });

        if (existingLeader) {
            console.log('⚠️  Sale leader already exists');
        } else {
            const leader = userRepository.create({
                email: 'leader@company.com',
                passwordHash: await hash('Leader@123'),
                role: UserRole.SALE_LEADER,
                saleTeamId: team1.id,
                isActive: true,
            });
            await userRepository.save(leader);
            console.log('✅ Created sale leader');
            console.log('   Email: leader@company.com');
            console.log('   Password: Leader@123');
            console.log('   Team: Team Alpha');
        }

        // Create sale staff
        console.log('\nCreating sale staff...');

        const existingStaff = await userRepository.findOne({
            where: { email: 'staff@company.com' },
        });

        if (existingStaff) {
            console.log('⚠️  Sale staff already exists');
        } else {
            const staff = userRepository.create({
                email: 'staff@company.com',
                passwordHash: await hash('Staff@123'),
                role: UserRole.SALE_STAFF,
                saleTeamId: team1.id,
                isActive: true,
            });
            await userRepository.save(staff);
            console.log('✅ Created sale staff');
            console.log('   Email: staff@company.com');
            console.log('   Password: Staff@123');
            console.log('   Team: Team Alpha');
        }

        console.log('\n✅ Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

runSeeds();
