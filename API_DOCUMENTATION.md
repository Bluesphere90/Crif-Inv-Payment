# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All endpoints except `/auth/login` require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "admin@company.com",
    "role": "ADMIN",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

## User Management (Admin Only)

### Create User
```http
POST /api/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newuser@company.com",
  "password": "Password@123",
  "role": "SALE_STAFF",
  "saleTeamId": "team-uuid"
}
```

### List All Users
```http
GET /api/users
Authorization: Bearer <admin_token>
```

### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <admin_token>
```

### Update User
```http
PUT /api/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "SALE_LEADER",
  "saleTeamId": "team-uuid",
  "isActive": true
}
```

### Reset Password
```http
POST /api/users/:id/reset-password
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "message": "Password reset successfully",
  "tempPassword": "Abc123XYZ!@#",
  "warning": "This is a temporary password. User should change it on first login."
}
```

### Deactivate User
```http
DELETE /api/users/:id
Authorization: Bearer <admin_token>
```

---

## Payment Management

### List Payments
```http
GET /api/payments?status=NEW&limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: PaymentStatus (NEW, DRAFT, SUBMITTED, COMPLETED)
- `startDate`: ISO date string
- `endDate`: ISO date string
- `limit`: Number of records
- `offset`: Pagination offset

**Response:**
```json
{
  "payments": [...],
  "total": 100
}
```

### Get Payment by ID
```http
GET /api/payments/:id
Authorization: Bearer <token>
```

### Assign Payment to Team
```http
POST /api/payments/:id/assign
Authorization: Bearer <sale_leader_or_admin_token>
Content-Type: application/json

{
  "teamId": "team-uuid"
}
```

### Update Payment
```http
PUT /api/payments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentDescription": "Updated description"
}
```

---

## Invoice Management

### Create Invoice
```http
POST /api/payments/:paymentId/invoices
Authorization: Bearer <token>
Content-Type: application/json

{
  "invoiceNumber": "INV-2024-001",
  "invoiceDate": "2024-01-15",
  "customerName": "ABC Company",
  "customerTaxCode": "0123456789",
  "currency": "VND",
  "totalAmount": 10000000,
  "convertedAmount": 10000000,
  "exchangeRate": 1.0
}
```

### Update Invoice
```http
PUT /api/invoices/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerName": "ABC Company Ltd",
  "totalAmount": 11000000
}
```

### Delete Invoice
```http
DELETE /api/invoices/:id
Authorization: Bearer <token>
```

### Add Invoice Line
```http
POST /api/invoices/:id/lines
Authorization: Bearer <token>
Content-Type: application/json

{
  "lineNumber": 1,
  "description": "Product A",
  "quantity": 10,
  "unitPrice": 1000000,
  "lineTotal": 10000000,
  "taxRate": 10,
  "taxAmount": 1000000
}
```

### Submit Invoice Request (Lock Payment)
```http
POST /api/payments/:paymentId/submit
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Invoice request submitted successfully. Payment is now locked."
}
```

### Unlock Payment (Admin Only)
```http
POST /api/payments/:paymentId/unlock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Customer requested changes to invoice details"
}
```

### Mark Payment as Completed (Accounting/Admin)
```http
POST /api/payments/:paymentId/complete
Authorization: Bearer <accounting_or_admin_token>
```

---

## Import/Export

### Import Bank Transactions (Accounting/Admin)
```http
POST /api/import/bank-transactions
Authorization: Bearer <accounting_or_admin_token>
Content-Type: multipart/form-data

file: <excel_file>
```

**Response:**
```json
{
  "message": "Import completed",
  "batch": {
    "id": "batch-uuid",
    "filename": "transactions.xlsx",
    "totalRows": 100,
    "successfulRows": 95,
    "failedRows": 5
  },
  "errors": [
    {
      "row": 10,
      "errors": ["Amount must be a positive number"]
    }
  ]
}
```

### Export Payments to Excel
```http
GET /api/export/payments?status=SUBMITTED&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: PaymentStatus filter
- `teamId`: Sale team filter
- `startDate`: Start date filter
- `endDate`: End date filter

**Response:** Excel file download

---

## Audit Logs (Admin Only)

### Query Audit Logs
```http
GET /api/audit-logs?action=PAYMENT_SUBMITTED&limit=50&offset=0
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `paymentId`: Filter by payment ID
- `entityType`: Filter by entity type
- `action`: Filter by action
- `performedBy`: Filter by user ID
- `startDate`: Start date
- `endDate`: End date
- `limit`: Number of records
- `offset`: Pagination offset

### Get Payment Audit History
```http
GET /api/audit-logs/payment/:paymentId
Authorization: Bearer <admin_token>
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "required": ["ADMIN"],
  "current": "SALE_STAFF"
}
```

### 404 Not Found
```json
{
  "error": "Payment not found"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Invoice total does not match payment amount. Discrepancy note is required."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin@123"}'
```

### List Payments
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Submit Invoice
```bash
curl -X POST http://localhost:3000/api/payments/PAYMENT_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Response when exceeded**: 429 Too Many Requests

---

## Notes

1. All dates should be in ISO 8601 format
2. All amounts are decimal numbers with 2 decimal places
3. Currency codes must be 3-letter ISO codes (VND, USD, EUR, etc.)
4. Payment IDs are auto-generated and immutable
5. Submitted payments are locked and can only be edited by ADMIN
6. Audit logs are append-only and cannot be deleted
