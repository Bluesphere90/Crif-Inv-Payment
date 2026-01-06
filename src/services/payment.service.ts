import { AppDataSource } from '../config/database';
import { BankTransaction } from '../entities/BankTransaction';
import { User } from '../entities/User';
import { UserRole, PaymentStatus } from '../types/enums';
import { AppError } from '../middleware/error-handler';

export class PaymentService {
    private paymentRepository = AppDataSource.getRepository(BankTransaction);

    generatePaymentId(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `PAY-${year}${month}-${random}`;
    }

    canUserAccessPayment(user: User, payment: BankTransaction): boolean {
        // ADMIN can access everything
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // ACCOUNTING can access everything
        if (user.role === UserRole.ACCOUNTING) {
            return true;
        }

        // SALE_LEADER can access:
        // - Unassigned payments
        // - Payments assigned to their team
        if (user.role === UserRole.SALE_LEADER) {
            if (!payment.assignedSaleTeamId) {
                return true; // Unassigned
            }
            return payment.assignedSaleTeamId === user.saleTeamId;
        }

        // SALE_STAFF can only access payments assigned to their team
        if (user.role === UserRole.SALE_STAFF) {
            if (!payment.assignedSaleTeamId) {
                return false; // Cannot see unassigned
            }
            return payment.assignedSaleTeamId === user.saleTeamId;
        }

        return false;
    }

    async getPaymentsForUser(
        user: User,
        filters?: {
            status?: PaymentStatus;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ payments: BankTransaction[]; total: number }> {
        const query = this.paymentRepository
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.assignedSaleTeam', 'team')
            .leftJoinAndSelect('payment.submittedByUser', 'submittedBy')
            .leftJoinAndSelect('payment.invoices', 'invoices');

        // Apply role-based filtering
        if (user.role === UserRole.SALE_LEADER) {
            // Can see unassigned OR assigned to own team
            query.andWhere(
                '(payment.assignedSaleTeamId IS NULL OR payment.assignedSaleTeamId = :teamId)',
                { teamId: user.saleTeamId }
            );
        } else if (user.role === UserRole.SALE_STAFF) {
            // Can only see assigned to own team
            query.andWhere('payment.assignedSaleTeamId = :teamId', { teamId: user.saleTeamId });
        }
        // ADMIN and ACCOUNTING see everything (no filter)

        if (filters?.status) {
            query.andWhere('payment.status = :status', { status: filters.status });
        }

        if (filters?.startDate) {
            query.andWhere('payment.paymentDate >= :startDate', { startDate: filters.startDate });
        }

        if (filters?.endDate) {
            query.andWhere('payment.paymentDate <= :endDate', { endDate: filters.endDate });
        }

        query.orderBy('payment.paymentDate', 'DESC');

        const total = await query.getCount();

        if (filters?.limit) {
            query.limit(filters.limit);
        }

        if (filters?.offset) {
            query.offset(filters.offset);
        }

        const payments = await query.getMany();

        return { payments, total };
    }

    async getPaymentById(id: string, user: User): Promise<BankTransaction> {
        const payment = await this.paymentRepository.findOne({
            where: { id },
            relations: [
                'assignedSaleTeam',
                'assignedByUser',
                'submittedByUser',
                'unlockedByUser',
                'lastEditedByUser',
                'invoices',
                'invoices.lines',
            ],
        });

        if (!payment) {
            throw new AppError(404, 'Payment not found');
        }

        if (!this.canUserAccessPayment(user, payment)) {
            throw new AppError(403, 'Access denied to this payment');
        }

        return payment;
    }

    async assignPayment(paymentId: string, teamId: string, user: User): Promise<BankTransaction> {
        // Only SALE_LEADER and ADMIN can assign
        if (user.role !== UserRole.SALE_LEADER && user.role !== UserRole.ADMIN) {
            throw new AppError(403, 'Only Sale Leaders and Admins can assign payments');
        }

        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
            relations: ['assignedSaleTeam'],
        });

        if (!payment) {
            throw new AppError(404, 'Payment not found');
        }

        // SALE_LEADER can only assign to their own team
        if (user.role === UserRole.SALE_LEADER && teamId !== user.saleTeamId) {
            throw new AppError(403, 'Sale Leaders can only assign to their own team');
        }

        // Cannot reassign submitted payments
        if (payment.status === PaymentStatus.SUBMITTED || payment.status === PaymentStatus.COMPLETED) {
            throw new AppError(422, 'Cannot reassign submitted or completed payments');
        }

        payment.assignedSaleTeamId = teamId;
        payment.assignedBy = user.id;
        payment.assignedAt = new Date();

        if (payment.status === PaymentStatus.NEW) {
            payment.status = PaymentStatus.DRAFT;
        }

        return await this.paymentRepository.save(payment);
    }

    async updatePayment(
        paymentId: string,
        data: Partial<BankTransaction>,
        user: User
    ): Promise<BankTransaction> {
        const payment = await this.getPaymentById(paymentId, user);

        // Check if payment is locked
        if (payment.status === PaymentStatus.SUBMITTED || payment.status === PaymentStatus.COMPLETED) {
            if (user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'Cannot edit submitted or completed payments');
            }
        }

        // Update allowed fields
        if (data.paymentDescription !== undefined) {
            payment.paymentDescription = data.paymentDescription;
        }

        payment.lastEditedBy = user.id;
        payment.lastEditedAt = new Date();

        return await this.paymentRepository.save(payment);
    }
}

export const paymentService = new PaymentService();
