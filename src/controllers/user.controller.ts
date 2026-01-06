import { Router, Response } from 'express';
import { userService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// All routes require ADMIN role
router.use(authenticate, requireRole(UserRole.ADMIN));

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, role, saleTeamId } = req.body;

        if (!email || !password || !role) {
            res.status(400).json({ error: 'Email, password, and role are required' });
            return;
        }

        const user = await userService.createUser(
            { email, password, role, saleTeamId },
            req.user!,
            req
        );

        res.status(201).json({ message: 'User created successfully', user });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/users
 * List all users
 */
router.get('/', async (_req: AuthRequest, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.json({ users });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.json({ user });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { role, saleTeamId, isActive } = req.body;

        const user = await userService.updateUser(
            req.params.id,
            { role, saleTeamId, isActive },
            req.user!,
            req
        );

        res.json({ message: 'User updated successfully', user });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password
 */
router.post('/:id/reset-password', async (req: AuthRequest, res: Response) => {
    try {
        const tempPassword = await userService.resetPassword(req.params.id, req.user!, req);

        res.json({
            message: 'Password reset successfully',
            tempPassword,
            warning: 'This is a temporary password. User should change it on first login.',
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * DELETE /api/users/:id
 * Deactivate user (soft delete)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        await userService.deactivateUser(req.params.id, req.user!, req);
        res.json({ message: 'User deactivated successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
