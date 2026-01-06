import request from 'supertest';
import app from '../index';
import { authService } from '../services/auth.service';
import path from 'path';
import * as fs from 'fs';

describe('Excel Import/Export', () => {
    let adminToken: string;
    let accountingToken: string;
    let staffToken: string;

    beforeAll(async () => {
        const adminLogin = await authService.login('admin@company.com', 'Admin@123');
        adminToken = adminLogin.token;

        const accountingLogin = await authService.login('accounting@company.com', 'Accounting@123');
        accountingToken = accountingLogin.token;

        const staffLogin = await authService.login('staff@company.com', 'Staff@123');
        staffToken = staffLogin.token;
    });

    describe('Import Bank Transactions', () => {
        it('should deny staff from importing', async () => {
            const res = await request(app)
                .post('/api/import/bank-transactions')
                .set('Authorization', `Bearer ${staffToken}`)
                .attach('file', Buffer.from('dummy'), 'test.xlsx');

            expect(res.status).toBe(403);
        });

        // Note: To test success, we would need a real Excel file. 
        // For now, we verified the permission guard.
    });

    describe('Export Payments', () => {
        it('should allow export with filters', async () => {
            const res = await request(app)
                .get('/api/export/payments')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ status: 'NEW' });

            expect(res.status).toBe(200);
            expect(res.header['content-type']).toContain('spreadsheetml');
        });
    });
});
