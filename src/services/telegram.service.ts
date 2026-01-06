import TelegramBot from 'node-telegram-bot-api';
import { telegramConfig } from '../config/telegram';
import { BankTransaction } from '../entities/BankTransaction';
import { Invoice } from '../entities/Invoice';
import { User } from '../entities/User';

export class TelegramService {
    private bot?: TelegramBot;

    constructor() {
        if (telegramConfig.enabled && telegramConfig.botToken) {
            this.bot = new TelegramBot(telegramConfig.botToken, { polling: false });
        }
    }

    async sendSubmissionNotification(
        payment: BankTransaction,
        invoices: Invoice[],
        user: User
    ): Promise<void> {
        if (!this.bot || !telegramConfig.chatId) {
            console.warn('Telegram notification skipped: not configured');
            return;
        }

        try {
            const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.convertedAmount || 0), 0);

            const message = `
🔔 *Invoice Submission*

*Payment ID:* \`${payment.paymentId}\`
*Assigned Team:* ${payment.assignedSaleTeam?.name || 'Unassigned'}
*Received Amount:* ${Number(payment.amount).toLocaleString()} ${payment.currency}
*Invoice Total:* ${invoiceTotal.toLocaleString()} ${payment.currency}
*Number of Invoices:* ${invoices.length}
*Submitted By:* ${user.email}
*Time:* ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
      `.trim();

            await this.bot.sendMessage(telegramConfig.chatId, message, {
                parse_mode: 'Markdown',
            });
        } catch (error) {
            console.error('Failed to send Telegram notification:', error);
            // Don't throw - notification failure should not break the main flow
        }
    }
}

export const telegramService = new TelegramService();
