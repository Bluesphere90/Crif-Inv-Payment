import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    algorithm: 'HS256' as const,
};

export const bcryptConfig = {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
};
