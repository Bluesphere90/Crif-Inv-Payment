import request from 'supertest';
import app from '../index';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserRole } from '../types/enums';
import { authService } from '../services/auth.service';

describe('RBAC Middleware', () => {
    let adminToken: string;
    let staffToken: string;

    beforeAll(async () => {
        // Get tokens for different roles
        // In a real test env, we would create fresh users here
        const adminLogin = await authService.login('admin@company.com', 'Admin@123');
        adminToken = adminLogin.token;

        const staffLogin = await authService.login('staff@company.com', 'Staff@123');
        staffToken = staffLogin.token;
    });

    describe('Admin-only Endpoints', () => {
        it('should allow admin to access user management', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });

        it('should deny staff access to user management', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Team-based Access', () => {
        it('staff should be able to view assigned payments', async () => {
            const res = await request(app)
                .get('/api/payments')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
        });
    });
});
