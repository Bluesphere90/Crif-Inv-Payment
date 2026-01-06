import { AppDataSource } from '../config/database';
import { Invoice } from '../entities/Invoice';
import { InvoiceLine } from '../entities/InvoiceLine';
import { BankTransaction } from '../entities/BankTransaction';
import { User } from '../entities/User';
import { UserRole, PaymentStatus, AuditAction } from '../types/enums';
import { AppError } from '../middleware/error-handler';
import { paymentService } from './payment.service';
import { auditService } from './audit.service';
import { telegramService } from './telegram.service';
import { Request } from 'express';

export class InvoiceService {
    private invoiceRepository = AppDataSource.getRepository(Invoice);
    private invoiceLineRepository = AppDataSource.getRepository(InvoiceLine);
    private paymentRepository = AppDataSource.getRepository(BankTransaction);

    async createInvoice(
        paymentId: string,
        data: Partial<Invoice>,
        user: User,
        req?: Request
    ): Promise<Invoice> {
        const payment = await paymentService.getPaymentById(paymentId, user);

        // Check if payment is locked
        if (payment.status === PaymentStatus.SUBMITTED || payment.status === PaymentStatus.COMPLETED) {
            if (user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'Cannot create invoices for submitted or completed payments');
            }
        }

        // SALE_STAFF and SALE_LEADER can only create invoices for assigned payments
        if (user.role === UserRole.SALE_STAFF || user.role === UserRole.SALE_LEADER) {
            if (!payment.assignedSaleTeamId || payment.assignedSaleTeamId !== user.saleTeamId) {
                throw new AppError(403, 'Can only create invoices for payments assigned to your team');
            }
        }

        const invoice = this.invoiceRepository.create({
            ...data,
            paymentId: payment.id,
            isLocked: false,
        });

        const savedInvoice = await this.invoiceRepository.save(invoice);

        // Update payment tracking
        payment.lastEditedBy = user.id;
        payment.lastEditedAt = new Date();
        await this.paymentRepository.save(payment);

        await auditService.log(
            AuditAction.INVOICE_CREATED,
            'Invoice',
            savedInvoice.id,
            null,
            savedInvoice,
            user,
            req,
            payment.paymentId
        );

        return savedInvoice;
    }

    async updateInvoice(
        invoiceId: string,
        data: Partial<Invoice>,
        user: User,
        req?: Request
    ): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['payment', 'payment.assignedSaleTeam'],
        });

        if (!invoice) {
            throw new AppError(404, 'Invoice not found');
        }

        // Check access
        if (!paymentService.canUserAccessPayment(user, invoice.payment)) {
            throw new AppError(403, 'Access denied to this invoice');
        }

        // Check if locked
        if (invoice.isLocked) {
            if (user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'Invoice is locked. Only admins can edit locked invoices.');
            }
        }

        const oldValue = { ...invoice };

        // Update fields
        Object.assign(invoice, data);

        const savedInvoice = await this.invoiceRepository.save(invoice);

        // Update payment tracking
        invoice.payment.lastEditedBy = user.id;
        invoice.payment.lastEditedAt = new Date();
        await this.paymentRepository.save(invoice.payment);

        await auditService.log(
            AuditAction.INVOICE_UPDATED,
            'Invoice',
            savedInvoice.id,
            oldValue,
            savedInvoice,
            user,
            req,
            invoice.payment.paymentId
        );

        return savedInvoice;
    }

    async deleteInvoice(invoiceId: string, user: User, req?: Request): Promise<void> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['payment', 'payment.assignedSaleTeam'],
        });

        if (!invoice) {
            throw new AppError(404, 'Invoice not found');
        }

        // Check access
        if (!paymentService.canUserAccessPayment(user, invoice.payment)) {
            throw new AppError(403, 'Access denied to this invoice');
        }

        // Check if locked
        if (invoice.isLocked) {
            if (user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'Invoice is locked. Only admins can delete locked invoices.');
            }
        }

        await auditService.log(
            AuditAction.INVOICE_DELETED,
            'Invoice',
            invoice.id,
            invoice,
            null,
            user,
            req,
            invoice.payment.paymentId
        );

        await this.invoiceRepository.remove(invoice);
    }

    async addInvoiceLine(
        invoiceId: string,
        data: Partial<InvoiceLine>,
        user: User,
        req?: Request
    ): Promise<InvoiceLine> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['payment', 'payment.assignedSaleTeam', 'lines'],
        });

        if (!invoice) {
            throw new AppError(404, 'Invoice not found');
        }

        // Check access
        if (!paymentService.canUserAccessPayment(user, invoice.payment)) {
            throw new AppError(403, 'Access denied to this invoice');
        }

        // Check if locked
        if (invoice.isLocked) {
            if (user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'Invoice is locked. Only admins can add lines to locked invoices.');
            }
        }

        const line = this.invoiceLineRepository.create({
            ...data,
            invoiceId: invoice.id,
            isLocked: false,
        });

        const savedLine = await this.invoiceLineRepository.save(line);

        // Update payment tracking
        invoice.payment.lastEditedBy = user.id;
        invoice.payment.lastEditedAt = new Date();
        await this.paymentRepository.save(invoice.payment);

        await auditService.log(
            AuditAction.INVOICE_UPDATED,
            'InvoiceLine',
            savedLine.id,
            null,
            savedLine,
            user,
            req,
            invoice.payment.paymentId
        );

        return savedLine;
    }

    async submitInvoiceRequest(paymentId: string, user: User, req?: Request): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const payment = await queryRunner.manager.findOne(BankTransaction, {
                where: { id: paymentId },
                relations: ['invoices', 'invoices.lines', 'assignedSaleTeam'],
            });

            if (!payment) {
                throw new AppError(404, 'Payment not found');
            }

            // Check access
            if (!paymentService.canUserAccessPayment(user, payment)) {
                throw new AppError(403, 'Access denied to this payment');
            }

            // Check if already submitted
            if (payment.status === PaymentStatus.SUBMITTED || payment.status === PaymentStatus.COMPLETED) {
                throw new AppError(422, 'Payment is already submitted or completed');
            }

            // Validate invoices exist
            if (!payment.invoices || payment.invoices.length === 0) {
                throw new AppError(422, 'Cannot submit payment without invoices');
            }

            // Calculate total and check discrepancy
            const invoiceTotal = payment.invoices.reduce((sum, inv) => {
                return sum + Number(inv.convertedAmount || 0);
            }, 0);

            const paymentAmount = Number(payment.amount);
            const discrepancy = Math.abs(invoiceTotal - paymentAmount);

            // If discrepancy > 0.01, require note
            if (discrepancy > 0.01) {
                const hasDiscrepancyNote = payment.invoices.some(
                    (inv) => inv.discrepancyNote && inv.discrepancyNote.trim().length > 0
                );

                if (!hasDiscrepancyNote) {
                    throw new AppError(
                        422,
                        `Invoice total (${invoiceTotal}) does not match payment amount (${paymentAmount}). Discrepancy note is required.`
                    );
                }
            }

            // ATOMIC LOCKING
            // 1. Set payment status to SUBMITTED
            payment.status = PaymentStatus.SUBMITTED;
            payment.submittedBy = user.id;
            payment.submittedAt = new Date();

            await queryRunner.manager.save(payment);

            // 2. Lock all invoices
            for (const invoice of payment.invoices!) {
                invoice.isLocked = true;
                await queryRunner.manager.save(invoice);

                // 3. Lock all invoice lines
                if (invoice.lines) {
                    for (const line of invoice.lines) {
                        line.isLocked = true;
                        await queryRunner.manager.save(line);
                    }
                }
            }

            await queryRunner.commitTransaction();

            // 4. Send Telegram notification (outside transaction)
            await telegramService.sendSubmissionNotification(payment, payment.invoices, user);

            // 5. Audit log
            await auditService.log(
                AuditAction.PAYMENT_SUBMITTED,
                'BankTransaction',
                payment.id,
                { status: PaymentStatus.DRAFT },
                { status: PaymentStatus.SUBMITTED },
                user,
                req,
                payment.paymentId
            );
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async unlockPayment(
        paymentId: string,
        reason: string,
        user: User,
        req?: Request
    ): Promise<void> {
        // Only ADMIN can unlock
        if (user.role !== UserRole.ADMIN) {
            throw new AppError(403, 'Only admins can unlock payments');
        }

        if (!reason || reason.trim().length === 0) {
            throw new AppError(422, 'Unlock reason is required');
        }

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const payment = await queryRunner.manager.findOne(BankTransaction, {
                where: { id: paymentId },
                relations: ['invoices', 'invoices.lines'],
            });

            if (!payment) {
                throw new AppError(404, 'Payment not found');
            }

            if (payment.status !== PaymentStatus.SUBMITTED) {
                throw new AppError(422, 'Only submitted payments can be unlocked');
            }

            // ATOMIC UNLOCKING
            // 1. Set payment status to DRAFT
            payment.status = PaymentStatus.DRAFT;
            payment.unlockedBy = user.id;
            payment.unlockedAt = new Date();
            payment.unlockReason = reason;

            await queryRunner.manager.save(payment);

            // 2. Unlock all invoices
            if (payment.invoices) {
                for (const invoice of payment.invoices!) {
                    invoice.isLocked = false;
                    await queryRunner.manager.save(invoice);

                    // 3. Unlock all invoice lines
                    if (invoice.lines) {
                        for (const line of invoice.lines) {
                            line.isLocked = false;
                            await queryRunner.manager.save(line);
                        }
                    }
                }
            }

            await queryRunner.commitTransaction();

            // Audit log
            await auditService.log(
                AuditAction.PAYMENT_UNLOCKED,
                'BankTransaction',
                payment.id,
                { status: PaymentStatus.SUBMITTED },
                { status: PaymentStatus.DRAFT, reason },
                user,
                req,
                payment.paymentId
            );
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async completePayment(paymentId: string, user: User, req?: Request): Promise<void> {
        // Only ACCOUNTING and ADMIN can complete
        if (user.role !== UserRole.ACCOUNTING && user.role !== UserRole.ADMIN) {
            throw new AppError(403, 'Only Accounting and Admins can mark payments as completed');
        }

        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new AppError(404, 'Payment not found');
        }

        if (payment.status !== PaymentStatus.SUBMITTED) {
            throw new AppError(422, 'Only submitted payments can be marked as completed');
        }

        payment.status = PaymentStatus.COMPLETED;
        await this.paymentRepository.save(payment);

        await auditService.log(
            AuditAction.PAYMENT_COMPLETED,
            'BankTransaction',
            payment.id,
            { status: PaymentStatus.SUBMITTED },
            { status: PaymentStatus.COMPLETED },
            user,
            req,
            payment.paymentId
        );
    }
}

export const invoiceService = new InvoiceService();
