import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { User } from './User';

@Entity('sale_teams')
export class SaleTeam {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 255 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @OneToMany(() => User, (user) => user.saleTeam)
    members?: User[];
}
