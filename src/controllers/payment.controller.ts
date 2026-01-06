import { Router, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole, PaymentStatus } from '../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/payments
 * List payments (filtered by role and team)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { status, startDate, endDate, limit, offset } = req.query;

        const { payments, total } = await paymentService.getPaymentsForUser(req.user!, {
            status: status as PaymentStatus,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined,
        });

        res.json({ payments, total });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const payment = await paymentService.getPaymentById(req.params.id, req.user!);
        res.json({ payment });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/:id/assign
 * Assign payment to sale team (SALE_LEADER and ADMIN only)
 */
router.post(
    '/:id/assign',
    requireRole(UserRole.SALE_LEADER, UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
        try {
            const { teamId } = req.body;

            if (!teamId) {
                res.status(400).json({ error: 'Team ID is required' });
                return;
            }

            const payment = await paymentService.assignPayment(req.params.id, teamId, req.user!);

            res.json({ message: 'Payment assigned successfully', payment });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
);

/**
 * PUT /api/payments/:id
 * Update payment details
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const payment = await paymentService.updatePayment(req.params.id, req.body, req.user!);

        res.json({ message: 'Payment updated successfully', payment });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
