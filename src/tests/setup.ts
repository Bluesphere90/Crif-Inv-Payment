import { AppDataSource } from '../config/database';

beforeAll(async () => {
    // Initialize standard DB connection for tests
    // In a real CI environment, this would point to a test database
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
});

afterAll(async () => {
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }
});
