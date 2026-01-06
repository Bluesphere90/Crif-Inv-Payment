import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { jwtConfig } from '../config/jwt';
import { AppError } from '../middleware/error-handler';
import { auditService } from './audit.service';
import { AuditAction } from '../types/enums';
import { Request } from 'express';

export class AuthService {
    private userRepository = AppDataSource.getRepository(User);

    async login(email: string, password: string, req?: Request): Promise<{ user: User; token: string }> {
        const user = await this.userRepository.findOne({
            where: { email: email.toLowerCase() },
            relations: ['saleTeam'],
        });

        if (!user) {
            await auditService.log(
                AuditAction.LOGIN_FAILED,
                'User',
                null,
                null,
                { email },
                null,
                req
            );
            throw new AppError(401, 'Invalid email or password');
        }

        const isPasswordValid = await user.validatePassword(password);

        if (!isPasswordValid) {
            await auditService.log(
                AuditAction.LOGIN_FAILED,
                'User',
                user.id,
                null,
                { email },
                user,
                req
            );
            throw new AppError(401, 'Invalid email or password');
        }

        if (!user.isActive) {
            await auditService.log(
                AuditAction.LOGIN_FAILED,
                'User',
                user.id,
                null,
                { email, reason: 'inactive' },
                user,
                req
            );
            throw new AppError(403, 'Account is deactivated');
        }

        // Update last login
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        // Generate JWT
        const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
            expiresIn: jwtConfig.expiresIn as any,
        });

        await auditService.log(
            AuditAction.LOGIN_SUCCESS,
            'User',
            user.id,
            null,
            { email },
            user,
            req
        );

        return { user, token };
    }

    async logout(user: User, req?: Request): Promise<void> {
        await auditService.log(
            AuditAction.LOGOUT,
            'User',
            user.id,
            null,
            null,
            user,
            req
        );
    }

    async validateToken(token: string): Promise<User> {
        try {
            const decoded = jwt.verify(token, jwtConfig.secret) as { userId: string };

            const user = await this.userRepository.findOne({
                where: { id: decoded.userId },
                relations: ['saleTeam'],
            });

            if (!user || !user.isActive) {
                throw new AppError(401, 'Invalid token');
            }

            return user;
        } catch (error) {
            throw new AppError(401, 'Invalid or expired token');
        }
    }
}

export const authService = new AuthService();
