import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../types/enums';

export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: req.user.role,
            });
            return;
        }

        next();
    };
};

export const requireSaleTeam = () => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (
            (req.user.role === UserRole.SALE_STAFF || req.user.role === UserRole.SALE_LEADER) &&
            !req.user.saleTeamId
        ) {
            res.status(403).json({ error: 'Sale team assignment required' });
            return;
        }

        next();
    };
};

export const requireActiveUser = () => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!req.user.isActive) {
            res.status(403).json({ error: 'User account is deactivated' });
            return;
        }

        next();
    };
};
