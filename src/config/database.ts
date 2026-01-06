import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';
import { SaleTeam } from '../entities/SaleTeam';
import { BankTransaction } from '../entities/BankTransaction';
import { Invoice } from '../entities/Invoice';
import { InvoiceLine } from '../entities/InvoiceLine';
import { ImportBatch } from '../entities/ImportBatch';
import { AuditLog } from '../entities/AuditLog';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'invoice_management',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: [User, SaleTeam, BankTransaction, Invoice, InvoiceLine, ImportBatch, AuditLog],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: [],
});

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connection established');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};
