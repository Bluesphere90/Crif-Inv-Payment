import request from 'supertest';
import app from '../index';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserRole } from '../types/enums';

describe('Authentication Endpoints', () => {
    let userRepository: any;

    beforeAll(async () => {
        userRepository = AppDataSource.getRepository(User);
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            // Assuming seed data exists or we mock it
            // For this test structure, we'll try to login as admin
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@company.com',
                    password: 'Admin@123'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'admin@company.com');
        });

        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@company.com',
                    password: 'WrongPassword'
                });

            expect(res.status).toBe(401);
        });

        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nobody@company.com',
                    password: 'password'
                });

            expect(res.status).toBe(401);
        });
    });
});
