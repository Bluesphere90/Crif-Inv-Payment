import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'payment_id', length: 100, nullable: true })
    paymentId?: string;

    @Column({ name: 'entity_type', length: 50 })
    entityType!: string;

    @Column({ name: 'entity_id', type: 'uuid', nullable: true })
    entityId?: string;

    @Column({ length: 100 })
    action!: string;

    @Column({ name: 'old_value', type: 'jsonb', nullable: true })
    oldValue?: any;

    @Column({ name: 'new_value', type: 'jsonb', nullable: true })
    newValue?: any;

    @Column({ name: 'performed_by', type: 'uuid', nullable: true })
    performedBy?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'performed_by' })
    performedByUser?: User;

    @CreateDateColumn({ name: 'performed_at' })
    performedAt!: Date;

    @Column({ name: 'ip_address', length: 45, nullable: true })
    ipAddress?: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string;
}
