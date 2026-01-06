import * as XLSX from 'xlsx';
import { AppDataSource } from '../config/database';
import { BankTransaction } from '../entities/BankTransaction';
import { ImportBatch } from '../entities/ImportBatch';
import { User } from '../entities/User';
import { PaymentStatus, AuditAction } from '../types/enums';
import { AppError } from '../middleware/error-handler';
import { paymentService } from './payment.service';
import { auditService } from './audit.service';
import { Request } from 'express';

interface ImportRow {
    'Bank Account': string;
    'Payment Date': string;
    'Amount': number;
    'Currency': string;
    'Pay From': string;
    'Payment Description': string;
}

interface ImportError {
    row: number;
    errors: string[];
}

export class ExcelImportService {

    private importBatchRepository = AppDataSource.getRepository(ImportBatch);

    async importBankTransactions(
        file: any,
        user: User,
        req?: Request
    ): Promise<{ batch: ImportBatch; errors: ImportError[] }> {
        await auditService.log(
            AuditAction.IMPORT_STARTED,
            'ImportBatch',
            null,
            null,
            { filename: file.originalname },
            user,
            req
        );

        try {
            // Parse Excel file
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data: ImportRow[] = XLSX.utils.sheet_to_json(worksheet);

            if (!data || data.length === 0) {
                throw new AppError(422, 'Excel file is empty');
            }

            // Validate required columns
            const requiredColumns = [
                'Bank Account',
                'Payment Date',
                'Amount',
                'Currency',
                'Pay From',
                'Payment Description',
            ];

            const firstRow = data[0];
            const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

            if (missingColumns.length > 0) {
                throw new AppError(
                    422,
                    `Missing required columns: ${missingColumns.join(', ')}`
                );
            }

            // Validate and prepare data
            const errors: ImportError[] = [];
            const validPayments: Partial<BankTransaction>[] = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNumber = i + 2; // Excel row number (1-indexed + header)
                const rowErrors: string[] = [];

                // Validate Bank Account
                if (!row['Bank Account'] || String(row['Bank Account']).trim() === '') {
                    rowErrors.push('Bank Account is required');
                }

                // Validate Payment Date
                let paymentDate: Date | undefined;
                try {
                    if (typeof row['Payment Date'] === 'number') {
                        // Excel serial date
                        const dateInfo = XLSX.SSF.parse_date_code(row['Payment Date']);
                        paymentDate = new Date(
                            dateInfo.y,
                            dateInfo.m - 1,
                            dateInfo.d
                        );
                    } else if (typeof row['Payment Date'] === 'string') {
                        paymentDate = new Date(row['Payment Date']);
                    }

                    if (!paymentDate || isNaN(paymentDate.getTime())) {
                        rowErrors.push('Invalid Payment Date format');
                    }
                } catch (error) {
                    rowErrors.push('Invalid Payment Date format');
                }

                // Validate Amount
                const amount = Number(row['Amount']);
                if (isNaN(amount) || amount <= 0) {
                    rowErrors.push('Amount must be a positive number');
                }

                // Validate Currency
                if (!row['Currency'] || String(row['Currency']).trim().length !== 3) {
                    rowErrors.push('Currency must be a 3-letter code');
                }

                // Validate Pay From
                if (!row['Pay From'] || String(row['Pay From']).trim() === '') {
                    rowErrors.push('Pay From is required');
                }

                if (rowErrors.length > 0) {
                    errors.push({ row: rowNumber, errors: rowErrors });
                } else {
                    validPayments.push({
                        paymentId: paymentService.generatePaymentId(),
                        bankAccount: String(row['Bank Account']).trim(),
                        paymentDate: paymentDate!,
                        amount,
                        currency: String(row['Currency']).trim().toUpperCase(),
                        payFrom: String(row['Pay From']).trim(),
                        paymentDescription: row['Payment Description']
                            ? String(row['Payment Description']).trim()
                            : undefined,
                        status: PaymentStatus.NEW,
                    });
                }
            }

            // Create import batch
            const batch = this.importBatchRepository.create({
                filename: file.originalname,
                importedBy: user.id,
                totalRows: data.length,
                successfulRows: validPayments.length,
                failedRows: errors.length,
                errorLog: errors.length > 0 ? errors : undefined,
            });

            // Transactional import
            const queryRunner = AppDataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
                const savedBatch = await queryRunner.manager.save(batch);

                // Import valid payments
                for (const paymentData of validPayments) {
                    const payment = queryRunner.manager.create(BankTransaction, {
                        ...paymentData,
                        importBatchId: savedBatch.id,
                    });
                    await queryRunner.manager.save(payment);
                }

                await queryRunner.commitTransaction();

                await auditService.log(
                    AuditAction.IMPORT_COMPLETED,
                    'ImportBatch',
                    savedBatch.id,
                    null,
                    {
                        filename: file.originalname,
                        totalRows: data.length,
                        successfulRows: validPayments.length,
                        failedRows: errors.length,
                    },
                    user,
                    req
                );

                return { batch: savedBatch, errors };
            } catch (error) {
                await queryRunner.rollbackTransaction();
                throw error;
            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            await auditService.log(
                AuditAction.IMPORT_FAILED,
                'ImportBatch',
                null,
                null,
                { filename: file.originalname, error: (error as Error).message },
                user,
                req
            );
            throw error;
        }
    }
}

export const excelImportService = new ExcelImportService();
