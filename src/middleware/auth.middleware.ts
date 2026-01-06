import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { jwtConfig } from '../config/jwt';

export interface AuthRequest extends Request {
    user?: User;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, jwtConfig.secret) as { userId: string };

            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { id: decoded.userId },
                relations: ['saleTeam'],
            });

            if (!user) {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }

            if (!user.isActive) {
                res.status(403).json({ error: 'User account is deactivated' });
                return;
            }

            req.user = user;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }
    } catch (error) {
        res.status(500).json({ error: 'Authentication error' });
        return;
    }
};
