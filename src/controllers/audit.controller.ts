import { Router, Response } from 'express';
import { auditService } from '../services/audit.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole, AuditAction } from '../types/enums';

const router = Router();

// All routes require authentication and ADMIN role
router.use(authenticate, requireRole(UserRole.ADMIN));

/**
 * GET /api/audit-logs
 * Query audit logs with filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const {
            paymentId,
            entityType,
            action,
            performedBy,
            startDate,
            endDate,
            limit,
            offset,
        } = req.query;

        const { logs, total } = await auditService.getAuditLogs({
            paymentId: paymentId as string,
            entityType: entityType as string,
            action: action as AuditAction,
            performedBy: performedBy as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            limit: limit ? parseInt(limit as string) : 100,
            offset: offset ? parseInt(offset as string) : 0,
        });

        res.json({ logs, total });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/audit-logs/payment/:paymentId
 * Get audit history for a specific payment
 */
router.get('/payment/:paymentId', async (req: AuthRequest, res: Response) => {
    try {
        const { logs, total } = await auditService.getAuditLogs({
            paymentId: req.params.paymentId,
        });

        res.json({ logs, total });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
