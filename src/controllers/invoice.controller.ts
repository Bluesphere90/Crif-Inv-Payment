import { Router, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/payments/:paymentId/invoices
 * Create invoice for a payment
 */
router.post('/payments/:paymentId/invoices', async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await invoiceService.createInvoice(
            req.params.paymentId,
            req.body,
            req.user!,
            req
        );

        res.status(201).json({ message: 'Invoice created successfully', invoice });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * PUT /api/invoices/:id
 * Update invoice
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await invoiceService.updateInvoice(req.params.id, req.body, req.user!, req);

        res.json({ message: 'Invoice updated successfully', invoice });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        await invoiceService.deleteInvoice(req.params.id, req.user!, req);

        res.json({ message: 'Invoice deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/invoices/:id/lines
 * Add invoice line
 */
router.post('/:id/lines', async (req: AuthRequest, res: Response) => {
    try {
        const line = await invoiceService.addInvoiceLine(req.params.id, req.body, req.user!, req);

        res.status(201).json({ message: 'Invoice line added successfully', line });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/:paymentId/submit
 * Submit invoice request (locks payment and invoices)
 */
router.post('/payments/:paymentId/submit', async (req: AuthRequest, res: Response) => {
    try {
        await invoiceService.submitInvoiceRequest(req.params.paymentId, req.user!, req);

        res.json({ message: 'Invoice request submitted successfully. Payment is now locked.' });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/:paymentId/unlock
 * Unlock payment (ADMIN only)
 */
router.post(
    '/payments/:paymentId/unlock',
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
        try {
            const { reason } = req.body;

            if (!reason) {
                res.status(400).json({ error: 'Unlock reason is required' });
                return;
            }

            await invoiceService.unlockPayment(req.params.paymentId, reason, req.user!, req);

            res.json({ message: 'Payment unlocked successfully' });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
);

/**
 * POST /api/payments/:paymentId/complete
 * Mark payment as completed (ACCOUNTING and ADMIN only)
 */
router.post(
    '/payments/:paymentId/complete',
    requireRole(UserRole.ACCOUNTING, UserRole.ADMIN),
    async (req: AuthRequest, res: Response) => {
        try {
            await invoiceService.completePayment(req.params.paymentId, req.user!, req);

            res.json({ message: 'Payment marked as completed' });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
);

export default router;
