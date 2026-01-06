import { Router } from 'express';
import authController from '../controllers/auth.controller';
import userController from '../controllers/user.controller';
import paymentController from '../controllers/payment.controller';
import invoiceController from '../controllers/invoice.controller';
import importExportController from '../controllers/import-export.controller';
import auditController from '../controllers/audit.controller';

const router = Router();

// Mount routes
router.use('/auth', authController);
router.use('/users', userController);
router.use('/payments', paymentController);
router.use('/invoices', invoiceController);
router.use('/import', importExportController);
router.use('/export', importExportController);
router.use('/audit-logs', auditController);

export default router;
