# Setup Guide - Invoice Management System

This guide will walk you through setting up the Invoice Management System from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Node.js** 18 or higher ([Download](https://nodejs.org/))
- ✅ **PostgreSQL** 14 or higher ([Download](https://www.postgresql.org/download/))
- ✅ **npm** (comes with Node.js)
- ✅ **Git** (optional, for version control)

## Step 1: Verify Prerequisites

Open a terminal and verify installations:

```bash
node --version
# Should show v18.x.x or higher

npm --version
# Should show 9.x.x or higher

psql --version
# Should show PostgreSQL 14.x or higher
```

## Step 2: Set Up PostgreSQL Database

### Windows

1. Open **pgAdmin** or **psql** command line
2. Connect to PostgreSQL server
3. Create a new database:

```sql
CREATE DATABASE invoice_management;
```

4. Verify the database was created:

```sql
\l
-- or in pgAdmin, refresh the database list
```

### Alternative: Using psql Command Line

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE invoice_management;

# Exit psql
\q
```

## Step 3: Configure Environment Variables

1. Navigate to the project directory:
```bash
cd e:\AntiGravity
```

2. Copy the example environment file:
```bash
copy .env.example .env
```

3. Edit `.env` file with your settings:

```env
# Environment
NODE_ENV=development

# Server
PORT=3000
CORS_ORIGIN=*

# Database - UPDATE THESE VALUES
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password_here
DB_DATABASE=invoice_management

# JWT - CHANGE THIS IN PRODUCTION
JWT_SECRET=change_this_to_a_secure_random_string_in_production
JWT_EXPIRES_IN=1h

# Telegram (Optional - leave empty to disable notifications)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Bcrypt
BCRYPT_ROUNDS=10

# File Upload
MAX_FILE_SIZE=10485760
```

**Important:** Replace `your_postgres_password_here` with your actual PostgreSQL password!

## Step 4: Install Dependencies

The dependencies have already been installed. If you need to reinstall:

```bash
npm install
```

This will install all required packages including:
- Express.js (web framework)
- TypeORM (database ORM)
- PostgreSQL driver
- JWT for authentication
- bcrypt for password hashing
- xlsx for Excel processing
- And many more...

## Step 5: Initialize Database Schema

TypeORM will automatically create tables when you start the application in development mode (synchronize: true).

Alternatively, you can run migrations:

```bash
npm run migration:run
```

## Step 6: Seed Initial Data

Create initial users and sale teams:

```bash
npm run seed
```

This will create:

| Role | Email | Password | Team |
|------|-------|----------|------|
| Admin | admin@company.com | Admin@123 | - |
| Accounting | accounting@company.com | Accounting@123 | - |
| Sale Leader | leader@company.com | Leader@123 | Team Alpha |
| Sale Staff | staff@company.com | Staff@123 | Team Alpha |

**⚠️ IMPORTANT:** Change these passwords after first login!

## Step 7: Start the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Invoice Management System                              ║
║   Server running on port 3000                            ║
║   Environment: development                               ║
║                                                           ║
║   API Base URL: http://localhost:3000/api                ║
║   Health Check: http://localhost:3000/health             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### Production Mode

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## Step 8: Verify Installation

### Test Health Check

Open a browser or use curl:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@company.com\",\"password\":\"Admin@123\"}"
```

Expected response:
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Step 9: (Optional) Set Up Telegram Notifications

If you want to receive Telegram notifications when invoices are submitted:

1. **Create a Telegram Bot:**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` and follow instructions
   - Copy the bot token

2. **Get Chat ID:**
   - Add your bot to a group or chat
   - Send a message to the bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find the `chat.id` in the response

3. **Update .env:**
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

4. **Restart the application**

## Troubleshooting

### Database Connection Failed

**Error:** `Connection terminated unexpectedly`

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # Windows
   services.msc
   # Look for "postgresql-x64-14" service
   ```

2. Verify credentials in `.env`
3. Check PostgreSQL is listening on port 5432:
   ```bash
   netstat -an | findstr 5432
   ```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
1. Change PORT in `.env` to a different number (e.g., 3001)
2. Or kill the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <process_id> /F
   ```

### TypeORM Synchronize Issues

**Error:** `Table already exists`

**Solution:**
1. Drop and recreate the database:
   ```sql
   DROP DATABASE invoice_management;
   CREATE DATABASE invoice_management;
   ```

2. Restart the application

### npm install Fails

**Error:** Various npm errors

**Solution:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Delete `node_modules` and `package-lock.json`:
   ```bash
   rmdir /s node_modules
   del package-lock.json
   ```

3. Reinstall:
   ```bash
   npm install
   ```

## Next Steps

1. **Read the API Documentation:** See `API_DOCUMENTATION.md`
2. **Test the API:** Use Postman, curl, or any HTTP client
3. **Change Default Passwords:** Login and reset all default passwords
4. **Create Sale Teams:** Add your actual sale teams
5. **Create Users:** Add your team members
6. **Import Bank Transactions:** Upload your first Excel file
7. **Test the Workflow:** Create invoices, submit, and verify locking

## Security Checklist for Production

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate a strong JWT secret (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Set `NODE_ENV=production`
- [ ] Enable PostgreSQL SSL
- [ ] Set up database backups
- [ ] Configure proper CORS origins (not `*`)
- [ ] Set up HTTPS with SSL certificates
- [ ] Use a process manager (PM2, systemd)
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Review and adjust rate limits

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the README.md
3. Check the API documentation
4. Contact the development team

## Quick Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Seed database
npm run seed

# Run migrations
npm run migration:run
```

---

**Congratulations!** Your Invoice Management System is now set up and ready to use! 🎉
