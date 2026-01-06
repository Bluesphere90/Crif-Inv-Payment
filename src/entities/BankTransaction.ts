import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { PaymentStatus } from '../types/enums';
import { SaleTeam } from './SaleTeam';
import { User } from './User';
import { Invoice } from './Invoice';
import { ImportBatch } from './ImportBatch';

@Entity('bank_transactions')
export class BankTransaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'payment_id', unique: true, length: 100 })
    paymentId!: string;

    @Column({ name: 'bank_account', length: 100 })
    bankAccount!: string;

    @Column({ name: 'payment_date', type: 'date' })
    paymentDate!: Date;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount!: number;

    @Column({ length: 3 })
    currency!: string;

    @Column({ name: 'pay_from', length: 255 })
    payFrom!: string;

    @Column({ name: 'payment_description', type: 'text', nullable: true })
    paymentDescription?: string;

    @Column({ name: 'assigned_sale_team_id', type: 'uuid', nullable: true })
    assignedSaleTeamId?: string;

    @ManyToOne(() => SaleTeam, { nullable: true })
    @JoinColumn({ name: 'assigned_sale_team_id' })
    assignedSaleTeam?: SaleTeam;

    @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
    assignedBy?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'assigned_by' })
    assignedByUser?: User;

    @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
    assignedAt?: Date;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.NEW,
    })
    status!: PaymentStatus;

    @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
    submittedBy?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'submitted_by' })
    submittedByUser?: User;

    @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
    submittedAt?: Date;

    @Column({ name: 'unlocked_by', type: 'uuid', nullable: true })
    unlockedBy?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'unlocked_by' })
    unlockedByUser?: User;

    @Column({ name: 'unlocked_at', type: 'timestamp', nullable: true })
    unlockedAt?: Date;

    @Column({ name: 'unlock_reason', type: 'text', nullable: true })
    unlockReason?: string;

    @Column({ name: 'last_edited_by', type: 'uuid', nullable: true })
    lastEditedBy?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'last_edited_by' })
    lastEditedByUser?: User;

    @Column({ name: 'last_edited_at', type: 'timestamp', nullable: true })
    lastEditedAt?: Date;

    @Column({ name: 'import_batch_id', type: 'uuid', nullable: true })
    importBatchId?: string;

    @ManyToOne(() => ImportBatch, { nullable: true })
    @JoinColumn({ name: 'import_batch_id' })
    importBatch?: ImportBatch;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @OneToMany(() => Invoice, (invoice) => invoice.payment)
    invoices?: Invoice[];
}
