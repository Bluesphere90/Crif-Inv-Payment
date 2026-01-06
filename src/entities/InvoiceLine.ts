import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Invoice } from './Invoice';

@Entity('invoice_lines')
export class InvoiceLine {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'invoice_id', type: 'uuid' })
    invoiceId!: string;

    @ManyToOne(() => Invoice, (invoice) => invoice.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoice_id' })
    invoice!: Invoice;

    @Column({ name: 'line_number', type: 'int' })
    lineNumber!: number;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    quantity!: number;

    @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
    unitPrice!: number;

    @Column({ name: 'line_total', type: 'decimal', precision: 15, scale: 2 })
    lineTotal!: number;

    @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
    taxRate?: number;

    @Column({ name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    taxAmount?: number;

    @Column({ name: 'is_locked', default: false })
    isLocked!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
