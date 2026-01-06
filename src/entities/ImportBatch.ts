import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('import_batches')
export class ImportBatch {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 255 })
    filename!: string;

    @Column({ name: 'imported_by', type: 'uuid' })
    importedBy!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'imported_by' })
    importedByUser!: User;

    @CreateDateColumn({ name: 'imported_at' })
    importedAt!: Date;

    @Column({ name: 'total_rows', type: 'int' })
    totalRows!: number;

    @Column({ name: 'successful_rows', type: 'int' })
    successfulRows!: number;

    @Column({ name: 'failed_rows', type: 'int' })
    failedRows!: number;

    @Column({ name: 'error_log', type: 'jsonb', nullable: true })
    errorLog?: any;
}
