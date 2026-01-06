import * as XLSX from 'xlsx';
import { AppDataSource } from '../config/database';
import { BankTransaction } from '../entities/BankTransaction';
import { User } from '../entities/User';
import { PaymentStatus, AuditAction } from '../types/enums';
import { paymentService } from './payment.service';
import { auditService } from './audit.service';
import { Request } from 'express';

export class ExcelExportService {
    private paymentRepository = AppDataSource.getRepository(BankTransaction);

    async exportPayments(
        user: User,
        filters: {
            status?: PaymentStatus;
            teamId?: string;
            startDate?: Date;
            endDate?: Date;
        },
        req?: Request
    ): Promise<Buffer> {
        // Get payments with RBAC filtering
        const { payments } = await paymentService.getPaymentsForUser(user, {
            status: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate,
        });

        // Additional team filter if provided
        let filteredPayments = payments;
        if (filters.teamId) {
            filteredPayments = payments.filter(
                (p) => p.assignedSaleTeamId === filters.teamId
            );
        }

        // Load full payment data with invoices
        const fullPayments = await this.paymentRepository.find({
            where: filteredPayments.map((p) => ({ id: p.id })),
            relations: [
                'assignedSaleTeam',
                'submittedByUser',
                'invoices',
                'invoices.lines',
            ],
        });

        // Build export data - one row per invoice line
        const exportData: any[] = [];

        for (const payment of fullPayments) {
            if (!payment.invoices || payment.invoices.length === 0) {
                // Payment without invoices
                exportData.push({
                    'Payment ID': payment.paymentId,
                    'Bank Account': payment.bankAccount,
                    'Payment Date': payment.paymentDate,
                    'Amount': Number(payment.amount),
                    'Currency': payment.currency,
                    'Pay From': payment.payFrom,
                    'Payment Description': payment.paymentDescription || '',
                    'Assigned Team': payment.assignedSaleTeam?.name || 'Unassigned',
                    'Status': payment.status,
                    'Invoice Number': '',
                    'Invoice Date': '',
                    'Customer Name': '',
                    'Customer Tax Code': '',
                    'Invoice Currency': '',
                    'Invoice Total': '',
                    'Line Number': '',
                    'Line Description': '',
                    'Quantity': '',
                    'Unit Price': '',
                    'Line Total': '',
                    'Tax Rate': '',
                    'Tax Amount': '',
                    'Submitted By': payment.submittedByUser?.email || '',
                    'Submitted At': payment.submittedAt || '',
                });
            } else {
                for (const invoice of payment.invoices!) {
                    if (!invoice.lines || invoice.lines.length === 0) {
                        // Invoice without lines
                        exportData.push({
                            'Payment ID': payment.paymentId,
                            'Bank Account': payment.bankAccount,
                            'Payment Date': payment.paymentDate,
                            'Amount': Number(payment.amount),
                            'Currency': payment.currency,
                            'Pay From': payment.payFrom,
                            'Payment Description': payment.paymentDescription || '',
                            'Assigned Team': payment.assignedSaleTeam?.name || 'Unassigned',
                            'Status': payment.status,
                            'Invoice Number': invoice.invoiceNumber || '',
                            'Invoice Date': invoice.invoiceDate || '',
                            'Customer Name': invoice.customerName || '',
                            'Customer Tax Code': invoice.customerTaxCode || '',
                            'Invoice Currency': invoice.currency,
                            'Invoice Total': invoice.totalAmount ? Number(invoice.totalAmount) : '',
                            'Line Number': '',
                            'Line Description': '',
                            'Quantity': '',
                            'Unit Price': '',
                            'Line Total': '',
                            'Tax Rate': '',
                            'Tax Amount': '',
                            'Submitted By': payment.submittedByUser?.email || '',
                            'Submitted At': payment.submittedAt || '',
                        });
                    } else {
                        for (const line of invoice.lines!) {
                            exportData.push({
                                'Payment ID': payment.paymentId,
                                'Bank Account': payment.bankAccount,
                                'Payment Date': payment.paymentDate,
                                'Amount': Number(payment.amount),
                                'Currency': payment.currency,
                                'Pay From': payment.payFrom,
                                'Payment Description': payment.paymentDescription || '',
                                'Assigned Team': payment.assignedSaleTeam?.name || 'Unassigned',
                                'Status': payment.status,
                                'Invoice Number': invoice.invoiceNumber || '',
                                'Invoice Date': invoice.invoiceDate || '',
                                'Customer Name': invoice.customerName || '',
                                'Customer Tax Code': invoice.customerTaxCode || '',
                                'Invoice Currency': invoice.currency,
                                'Invoice Total': invoice.totalAmount ? Number(invoice.totalAmount) : '',
                                'Line Number': line.lineNumber,
                                'Line Description': line.description,
                                'Quantity': Number(line.quantity),
                                'Unit Price': Number(line.unitPrice),
                                'Line Total': Number(line.lineTotal),
                                'Tax Rate': line.taxRate ? Number(line.taxRate) : '',
                                'Tax Amount': line.taxAmount ? Number(line.taxAmount) : '',
                                'Submitted By': payment.submittedByUser?.email || '',
                                'Submitted At': payment.submittedAt || '',
                            });
                        }
                    }
                }
            }
        }

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Audit log
        await auditService.log(
            AuditAction.EXPORT_REQUESTED,
            'BankTransaction',
            null,
            null,
            {
                filters,
                recordCount: exportData.length,
            },
            user,
            req
        );

        return buffer;
    }
}

export const excelExportService = new ExcelExportService();
