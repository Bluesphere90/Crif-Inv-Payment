import { Router, Response } from 'express';
import multer from 'multer';
import { excelImportService } from '../services/excel-import.service';
import { excelExportService } from '../services/excel-export.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole, PaymentStatus } from '../types/enums';

const router = Router();

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
        }
    },
});

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/import/bank-transactions
 * Import bank transactions from Excel (ACCOUNTING and ADMIN only)
 */
router.post(
    '/bank-transactions',
    requireRole(UserRole.ACCOUNTING, UserRole.ADMIN),
    upload.single('file'),
    async (req: AuthRequest, res: Response) => {
        try {
            const file = (req as any).file;
            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const { batch, errors } = await excelImportService.importBankTransactions(
                file,
                req.user!,
                req
            );

            res.json({
                message: 'Import completed',
                batch,
                errors: errors.length > 0 ? errors : undefined,
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
);

/**
 * GET /api/export/payments
 * Export payments to Excel (all authenticated users, filtered by role)
 */
router.get('/payments', async (req: AuthRequest, res: Response) => {
    try {
        const { status, teamId, startDate, endDate } = req.query;

        const buffer = await excelExportService.exportPayments(
            req.user!,
            {
                status: status as PaymentStatus,
                teamId: teamId as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
            },
            req
        );

        const filename = `payments_export_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
