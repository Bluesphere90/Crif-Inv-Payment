import request from 'supertest';
import app from '../index';
import { authService } from '../services/auth.service';
import { paymentService } from '../services/payment.service';
import { invoiceService } from '../services/invoice.service';
import { AppDataSource } from '../config/database';
import { BankTransaction } from '../entities/BankTransaction';
import { User } from '../entities/User';
import { PaymentStatus } from '../types/enums';

describe('Locking Mechanism', () => {
    let adminToken: string;
    let staffToken: string;
    let testPaymentId: string;
    let testPayment: BankTransaction;

    beforeAll(async () => {
        // Setup tokens
        const adminLogin = await authService.login('admin@company.com', 'Admin@123');
        adminToken = adminLogin.token;

        const staffLogin = await authService.login('staff@company.com', 'Staff@123');
        staffToken = staffLogin.token;

        // Create a robust test payment
        const paymentRepo = AppDataSource.getRepository(BankTransaction);
        // Find staff user to get their team ID
        const staffUser = await AppDataSource.getRepository(User).findOne({ where: { email: 'staff@company.com' } });

        testPayment = paymentRepo.create({
            paymentId: 'TEST-LOCK-001',
            bankAccount: '123456',
            paymentDate: new Date(),
            amount: 1000,
            currency: 'USD',
            payFrom: 'Test Payer',
            status: PaymentStatus.NEW,
            assignedSaleTeamId: staffUser?.saleTeamId // Assign to staff's team so they can access it
        });

        await paymentRepo.save(testPayment);
        testPaymentId = testPayment.id;
    });

    afterAll(async () => {
        // Cleanup
        const paymentRepo = AppDataSource.getRepository(BankTransaction);
        await paymentRepo.delete({ id: testPaymentId });
    });

    describe('Invoice Submission', () => {
        it('should allow staff to create invoice for assigned payment', async () => {
            const res = await request(app)
                .post(`/api/payments/${testPaymentId}/invoices`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    invoiceNumber: 'INV-TEST-001',
                    currency: 'USD',
                    totalAmount: 1000,
                    convertedAmount: 1000,
                    exchangeRate: 1
                });

            expect(res.status).toBe(201);
        });

        it('should allow submitting the payment', async () => {
            // Note: Submission requires discrepancy check. 
            // Since we created an invoice with matching amount (1000 vs 1000), it should pass.
            const res = await request(app)
                .post(`/api/payments/${testPaymentId}/submit`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);

            // Verify locked status
            const paymentRepo = AppDataSource.getRepository(BankTransaction);
            const updatedPayment = await paymentRepo.findOne({ where: { id: testPaymentId } });
            expect(updatedPayment?.status).toBe(PaymentStatus.SUBMITTED);
        });

        it('should prevent staff from editing locked invoice', async () => {
            // Get an invoice ID first
            const payment = await paymentService.getPaymentById(testPaymentId, await authService.validateToken(adminToken));
            const invoiceId = payment.invoices![0].id;

            const res = await request(app)
                .put(`/api/invoices/${invoiceId}`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ customerName: 'New Name' });

            expect(res.status).toBe(403);
        });

        it('should allow admin to edit locked invoice', async () => {
            const payment = await paymentService.getPaymentById(testPaymentId, await authService.validateToken(adminToken));
            const invoiceId = payment.invoices![0].id;

            const res = await request(app)
                .put(`/api/invoices/${invoiceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ customerName: 'Admin Edit' });

            expect(res.status).toBe(200);
        });
    });

    describe('Admin Unlock', () => {
        it('should allow admin to unlock payment', async () => {
            const res = await request(app)
                .post(`/api/payments/${testPaymentId}/unlock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Test Unlock' });

            expect(res.status).toBe(200);

            // Verify status is DRAFT
            const paymentRepo = AppDataSource.getRepository(BankTransaction);
            const updatedPayment = await paymentRepo.findOne({ where: { id: testPaymentId } });
            expect(updatedPayment?.status).toBe(PaymentStatus.DRAFT);
        });
    });
});
