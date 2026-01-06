import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import bcrypt from 'bcrypt';
import { UserRole } from '../types/enums';
import { SaleTeam } from './SaleTeam';
import { bcryptConfig } from '../config/jwt';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true, length: 255 })
    email!: string;

    @Column({ name: 'password_hash', length: 255 })
    passwordHash!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
    })
    role!: UserRole;

    @Column({ name: 'sale_team_id', type: 'uuid', nullable: true })
    saleTeamId?: string;

    @ManyToOne(() => SaleTeam, { nullable: true })
    @JoinColumn({ name: 'sale_team_id' })
    saleTeam?: SaleTeam;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt?: Date;

    // Temporary password for plaintext input (not stored in DB)
    tempPassword?: string;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.tempPassword) {
            this.passwordHash = await bcrypt.hash(this.tempPassword, bcryptConfig.rounds);
            delete this.tempPassword;
        }
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
    }

    // Don't expose password hash in JSON responses
    toJSON() {
        const { passwordHash, tempPassword, ...user } = this;
        return user;
    }
}
