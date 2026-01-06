import { Request } from 'express';
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';
import { User } from '../entities/User';
import { AuditAction } from '../types/enums';

export class AuditService {
    private auditLogRepository = AppDataSource.getRepository(AuditLog);

    async log(
        action: AuditAction,
        entityType: string,
        entityId: string | null,
        oldValue: any,
        newValue: any,
        user: User | null,
        req?: Request,
        paymentId?: string
    ): Promise<void> {
        try {
            const auditLog = this.auditLogRepository.create({
                action,
                entityType,
                entityId: entityId || undefined,
                oldValue,
                newValue,
                performedBy: user?.id,
                ipAddress: req?.ip || req?.socket?.remoteAddress,
                userAgent: req?.get('user-agent'),
                paymentId,
            });

            await this.auditLogRepository.save(auditLog);
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw - audit logging should not break the main flow
        }
    }

    async getAuditLogs(filters: {
        paymentId?: string;
        entityType?: string;
        action?: AuditAction;
        performedBy?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{ logs: AuditLog[]; total: number }> {
        const query = this.auditLogRepository
            .createQueryBuilder('audit')
            .leftJoinAndSelect('audit.performedByUser', 'user');

        if (filters.paymentId) {
            query.andWhere('audit.paymentId = :paymentId', { paymentId: filters.paymentId });
        }

        if (filters.entityType) {
            query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
        }

        if (filters.action) {
            query.andWhere('audit.action = :action', { action: filters.action });
        }

        if (filters.performedBy) {
            query.andWhere('audit.performedBy = :performedBy', { performedBy: filters.performedBy });
        }

        if (filters.startDate) {
            query.andWhere('audit.performedAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            query.andWhere('audit.performedAt <= :endDate', { endDate: filters.endDate });
        }

        query.orderBy('audit.performedAt', 'DESC');

        const total = await query.getCount();

        if (filters.limit) {
            query.limit(filters.limit);
        }

        if (filters.offset) {
            query.offset(filters.offset);
        }

        const logs = await query.getMany();

        return { logs, total };
    }
}

export const auditService = new AuditService();
