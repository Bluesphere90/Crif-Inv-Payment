# Invoice Management System

Production-grade internal web application for Accounting and Sales teams to manage invoice issuance upon payment receipt.

## Features

- ✅ **Authentication & Authorization**: JWT-based auth with bcrypt password hashing
- ✅ **Role-Based Access Control (RBAC)**: 4 roles with strict permission matrix
- ✅ **Team-Based Access Control**: Sale teams with hierarchical access
- ✅ **Data Locking**: Atomic locking mechanism for submitted invoices
- ✅ **Admin Unlock**: Only admins can unlock submitted payments
- ✅ **Comprehensive Audit Trail**: All actions logged with old/new values
- ✅ **Excel Import/Export**: Bank transaction import and filtered data export
- ✅ **Telegram Notifications**: Real-time submission notifications
- ✅ **Payment ID Generation**: Auto-generated immutable payment IDs
- ✅ **Currency Conversion**: Multi-currency support with discrepancy validation

## User Roles

| Role | Description |
|------|-------------|
| **SALE_STAFF** | Can view and edit invoices for payments assigned to their team |
| **SALE_LEADER** | Can assign payments to their team and manage team invoices |
| **ACCOUNTING** | Can import bank transactions and mark payments as completed |
| **ADMIN** | Full access including user management and unlock capabilities |

## Tech Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT tokens + bcrypt
- **Excel Processing**: xlsx (SheetJS)
- **Telegram**: node-telegram-bot-api

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- (Optional) Telegram Bot Token for notifications

## Installation

1. **Clone the repository**
   ```bash
   cd e:\AntiGravity
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and update the values:
   ```bash
   copy .env.example .env
   ```

   Edit `.env` and configure:
   - Database connection (PostgreSQL)
   - JWT secret (use a strong random string)
   - Telegram bot token (optional)

4. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE invoice_management;
   ```

5. **Run database migrations**
   ```bash
   npm run migration:run
   ```

6. **Seed initial data**
   ```bash
   npm run seed
   ```

   This creates:
   - Admin user: `admin@company.com` / `Admin@123`
   - Accounting user: `accounting@company.com` / `Accounting@123`
   - Sale Leader: `leader@company.com` / `Leader@123`
   - Sale Staff: `staff@company.com` / `Staff@123`
   - Two sample sale teams

   ⚠️ **IMPORTANT**: Change these passwords after first login!

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (audit only)
- `GET /api/auth/me` - Get current user

### User Management (Admin Only)
- `POST /api/users` - Create user
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-password` - Reset password
- `DELETE /api/users/:id` - Deactivate user

### Payments
- `GET /api/payments` - List payments (filtered by role/team)
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/assign` - Assign to team (Leader/Admin)
- `PUT /api/payments/:id` - Update payment

### Invoices
- `POST /api/payments/:paymentId/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/lines` - Add invoice line
- `POST /api/payments/:paymentId/submit` - Submit (locks payment)
- `POST /api/payments/:paymentId/unlock` - Unlock (Admin only)
- `POST /api/payments/:paymentId/complete` - Mark completed (Accounting/Admin)

### Import/Export
- `POST /api/import/bank-transactions` - Import Excel (Accounting/Admin)
- `GET /api/export/payments` - Export to Excel (all roles, filtered)

### Audit Logs (Admin Only)
- `GET /api/audit-logs` - Query audit logs
- `GET /api/audit-logs/payment/:paymentId` - Payment history

## Excel Import Format

Required columns for bank transaction import:

| Column | Type | Description |
|--------|------|-------------|
| Bank Account | Text | Bank account number |
| Payment Date | Date | Date of payment |
| Amount | Number | Payment amount |
| Currency | Text | 3-letter currency code (e.g., VND, USD) |
| Pay From | Text | Payer name/identifier |
| Payment Description | Text | Payment description (optional) |

## Permission Matrix

| Action | Sale Staff | Sale Leader | Accounting | Admin |
|--------|-----------|-------------|------------|-------|
| Import bank transactions | ❌ | ❌ | ✅ | ✅ |
| View all payments | ❌ | ✅ | ✅ | ✅ |
| Assign payment to team | ❌ | ✅* | ❌ | ✅ |
| View assigned payments | ✅ | ✅ | ✅ | ✅ |
| Create/edit invoice (Draft) | ✅** | ✅** | ❌ | ✅ |
| Submit invoice request | ✅ | ✅ | ❌ | ✅ |
| Edit invoice (Submitted) | ❌ | ❌ | ❌ | ✅ |
| Unlock payment | ❌ | ❌ | ❌ | ✅ |
| Mark payment completed | ❌ | ❌ | ✅ | ✅ |
| Export data | ✅*** | ✅*** | ✅*** | ✅ |

\* Sale Leader: only own team  
\*\* Only if payment assigned to their team  
\*\*\* Only data user is authorized to view

## Locking Mechanism

### Submission (Atomic Transaction)
1. Validate discrepancy notes
2. Set payment status = SUBMITTED
3. Lock all invoices (`isLocked = true`)
4. Lock all invoice lines (`isLocked = true`)
5. Record submission metadata
6. Send Telegram notification
7. Create audit log

### After Submission
- ❌ Sale Staff/Leader/Accounting: READ ONLY
- ✅ Admin: Can edit

### Unlock (Admin Only)
1. Validate unlock reason (mandatory)
2. Set payment status = DRAFT
3. Unlock all invoices and lines
4. Record unlock metadata
5. Create audit log

## Security Features

- **Password Hashing**: bcrypt with configurable salt rounds
- **JWT Authentication**: Stateless token-based auth
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive validation on all endpoints
- **SQL Injection Prevention**: TypeORM parameterized queries

## Audit Trail

All critical actions are logged:
- Login/logout events
- User management
- Payment assignment
- Invoice creation/updates
- Submission/unlock
- Import/export operations

Each log includes:
- Action type
- Entity type and ID
- Old and new values (JSON)
- Performed by (user)
- Timestamp
- IP address and user agent

## Error Handling

- **400**: Validation errors
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Resource not found
- **422**: Business logic errors
- **500**: Server errors

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # API controllers
├── entities/        # TypeORM entities
├── middleware/      # Express middleware
├── services/        # Business logic
├── routes/          # Route definitions
├── seeds/           # Database seeds
├── types/           # TypeScript types
└── index.ts         # Application entry point
```

### Adding New Features

1. Create entity in `src/entities/`
2. Create service in `src/services/`
3. Create controller in `src/controllers/`
4. Register routes in `src/routes/index.ts`
5. Add tests in `src/tests/`

## Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure PostgreSQL with SSL
4. Set up database backups
5. Configure Telegram bot (optional)
6. Use process manager (PM2, systemd)
7. Set up reverse proxy (nginx)
8. Enable HTTPS

## Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure database exists

### Import Fails
- Check Excel file format
- Verify required columns exist
- Check for data validation errors

### Telegram Notifications Not Working
- Verify bot token is correct
- Check chat ID is valid
- Ensure bot is added to chat

## License

Internal use only - Proprietary

## Support

For issues or questions, contact the development team.
