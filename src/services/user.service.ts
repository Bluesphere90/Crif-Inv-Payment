import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserRole, AuditAction } from '../types/enums';
import { AppError } from '../middleware/error-handler';
import { auditService } from './audit.service';
import { Request } from 'express';
import crypto from 'crypto';

export class UserService {
    private userRepository = AppDataSource.getRepository(User);

    async createUser(
        data: {
            email: string;
            password: string;
            role: UserRole;
            saleTeamId?: string;
        },
        createdBy: User,
        req?: Request
    ): Promise<User> {
        // Validate sale team requirement
        if (
            (data.role === UserRole.SALE_STAFF || data.role === UserRole.SALE_LEADER) &&
            !data.saleTeamId
        ) {
            throw new AppError(422, 'Sale staff and sale leaders must be assigned to a team');
        }

        if (
            (data.role === UserRole.ACCOUNTING || data.role === UserRole.ADMIN) &&
            data.saleTeamId
        ) {
            throw new AppError(422, 'Accounting and admin users cannot be assigned to a team');
        }

        // Check if email already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: data.email.toLowerCase() },
        });

        if (existingUser) {
            throw new AppError(422, 'Email already exists');
        }

        const user = this.userRepository.create({
            email: data.email.toLowerCase(),
            tempPassword: data.password,
            role: data.role,
            saleTeamId: data.saleTeamId,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        await auditService.log(
            AuditAction.USER_CREATED,
            'User',
            savedUser.id,
            null,
            { email: savedUser.email, role: savedUser.role },
            createdBy,
            req
        );

        return savedUser;
    }

    async updateUser(
        userId: string,
        data: {
            role?: UserRole;
            saleTeamId?: string;
            isActive?: boolean;
        },
        updatedBy: User,
        req?: Request
    ): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        const oldValue = { ...user };

        // Update role
        if (data.role !== undefined) {
            user.role = data.role;
        }

        // Update sale team
        if (data.saleTeamId !== undefined) {
            user.saleTeamId = data.saleTeamId || undefined;
        }

        // Validate sale team requirement
        if (
            (user.role === UserRole.SALE_STAFF || user.role === UserRole.SALE_LEADER) &&
            !user.saleTeamId
        ) {
            throw new AppError(422, 'Sale staff and sale leaders must be assigned to a team');
        }

        // Update active status
        if (data.isActive !== undefined) {
            user.isActive = data.isActive;
        }

        const savedUser = await this.userRepository.save(user);

        await auditService.log(
            AuditAction.USER_UPDATED,
            'User',
            savedUser.id,
            oldValue,
            savedUser,
            updatedBy,
            req
        );

        return savedUser;
    }

    async resetPassword(userId: string, resetBy: User, req?: Request): Promise<string> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        // Generate temporary password
        const tempPassword = this.generateTemporaryPassword();

        user.tempPassword = tempPassword;
        await this.userRepository.save(user);

        await auditService.log(
            AuditAction.PASSWORD_RESET,
            'User',
            user.id,
            null,
            { resetBy: resetBy.email },
            resetBy,
            req
        );

        return tempPassword;
    }

    async deactivateUser(userId: string, deactivatedBy: User, req?: Request): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        user.isActive = false;
        await this.userRepository.save(user);

        await auditService.log(
            AuditAction.USER_DEACTIVATED,
            'User',
            user.id,
            { isActive: true },
            { isActive: false },
            deactivatedBy,
            req
        );
    }

    async getAllUsers(): Promise<User[]> {
        return await this.userRepository.find({
            relations: ['saleTeam'],
            order: { createdAt: 'DESC' },
        });
    }

    async getUserById(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['saleTeam'],
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        return user;
    }

    private generateTemporaryPassword(): string {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }

        return password;
    }
}

export const userService = new UserService();
