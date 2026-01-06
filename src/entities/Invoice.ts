import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { BankTransaction } from './BankTransaction';
import { InvoiceLine } from './InvoiceLine';

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'payment_id', type: 'uuid' })
    paymentId!: string;

    @ManyToOne(() => BankTransaction, (payment) => payment.invoices)
    @JoinColumn({ name: 'payment_id' })
    payment!: BankTransaction;

    @Column({ name: 'invoice_number', length: 100, nullable: true })
    invoiceNumber?: string;

    @Column({ name: 'invoice_date', type: 'date', nullable: true })
    invoiceDate?: Date;

    @Column({ name: 'customer_name', length: 255, nullable: true })
    customerName?: string;

    @Column({ name: 'customer_tax_code', length: 50, nullable: true })
    customerTaxCode?: string;

    @Column({ length: 3 })
    currency!: string;

    @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    totalAmount?: number;

    @Column({ name: 'converted_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    convertedAmount?: number;

    @Column({ name: 'exchange_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
    exchangeRate?: number;

    @Column({ name: 'discrepancy_note', type: 'text', nullable: true })
    discrepancyNote?: string;

    @Column({ name: 'is_locked', default: false })
    isLocked!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @OneToMany(() => InvoiceLine, (line) => line.invoice, { cascade: true })
    lines?: InvoiceLine[];
}
