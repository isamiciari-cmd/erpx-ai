# ERPX-AI Database Setup Guide

## PostgreSQL + Firebase SQL Connect Configuration

This guide walks you through setting up ERPX-AI with PostgreSQL on Google Cloud SQL and Firebase SQL Connect.

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Firebase Project** created
3. **Node.js** 18+ installed
4. **PostgreSQL** client tools (psql)
5. **Firebase CLI** installed (`npm install -g firebase-tools`)

---

## Step 1: Create Cloud SQL PostgreSQL Instance

### 1.1 Create Instance via Google Cloud Console

```bash
# Or use gcloud CLI
gcloud sql instances create erpx-ai-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --backup-start-time=03:00
```

### 1.2 Create Database

```bash
gcloud sql databases create erpxai --instance=erpx-ai-db
```

### 1.3 Create Database User

```bash
gcloud sql users create erpx_user \
  --instance=erpx-ai-db \
  --password=YOUR_USER_PASSWORD
```

---

## Step 2: Run Database Schema

### 2.1 Connect to Cloud SQL

```bash
# Get connection name
gcloud sql instances describe erpx-ai-db --format="value(connectionName)"

# Connect via Cloud SQL Proxy
cloud_sql_proxy -instances=YOUR_CONNECTION_NAME=tcp:5432
```

### 2.2 Apply Schema

```bash
# In another terminal, run schema
psql -h localhost -U erpx_user -d erpxai -f database/schema.sql
```

### 2.3 Load Seed Data

```bash
psql -h localhost -U erpx_user -d erpxai -f database/seed.sql
```

---

## Step 3: Configure Firebase SQL Connect

### 3.1 Enable Firebase SQL Connect

```bash
firebase login
firebase init

# Select:
# - Firebase SQL Connect
# - Cloud Functions
```

### 3.2 Link Cloud SQL to Firebase

In Firebase Console:
1. Go to **Build** → **SQL Connect**
2. Click **Get Started**
3. Select your Cloud SQL instance: `erpx-ai-db`
4. Click **Connect**

### 3.3 Configure Connection

Create `firebase.json`:

```json
{
  "database": {
    "connections": {
      "postgres": {
        "connector": "cloudSql",
        "connectionName": "YOUR_PROJECT:REGION:erpx-ai-db",
        "databaseName": "erpxai",
        "user": "erpx_user",
        "password": "${env:DB_PASSWORD}"
      }
    }
  }
}
```

---

## Step 4: Create API Server (Backend)

### 4.1 Install Dependencies

```bash
cd api
npm install express pg firebase-admin dotenv cors
```

### 4.2 Create `.env` File

```env
PROJECT_ID=your-firebase-project-id
DATABASE_URL=postgresql://erpx_user:password@/erpxai?host=/cloudsql/PROJECT:REGION:INSTANCE
PORT=3000
```

### 4.3 Deploy API to Cloud Functions

```bash
firebase deploy --only functions
```

---

## Step 5: Configure Frontend Environment

### 5.1 Create `.env` File

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_CLOUD_SQL_CONNECTION_NAME=project:region:instance
VITE_API_URL=https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api
VITE_ENV=production
```

---

## Step 6: Create Demo Users

### 6.1 Create Firebase Auth Users

```bash
# Using Firebase Console or CLI
firebase auth:import users.json
```

### 6.2 Link Users to Database

```sql
-- Run in psql
INSERT INTO users (firebase_uid, company_id, email, display_name, role_id) VALUES
('firebase_uid_from_auth', '550e8400-e29b-41d4-a716-446655440001', 'admin@erpxai.com', 'Admin User', 
  (SELECT id FROM roles WHERE name = 'admin')
);
```

---

## Step 7: Set Up Security Rules

### 7.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // PostgreSQL is primary
    }
  }
}
```

### 7.2 Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

---

## Step 8: Database Indexes & Optimization

### 8.1 Verify Indexes

```sql
-- Check existing indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 8.2 Add Additional Indexes (if needed)

```sql
-- For faster dashboard queries
CREATE INDEX CONCURRENTLY idx_invoices_company_date 
ON invoices(company_id, invoice_date DESC);

CREATE INDEX CONCURRENTLY idx_sales_orders_company_date 
ON sales_orders(company_id, order_date DESC);
```

---

## Step 9: Testing the Setup

### 9.1 Test Database Connection

```bash
# From API server
npm run test:db
```

### 9.2 Test Authentication Flow

```bash
# From frontend
npm run dev
# Navigate to /login and test credentials
```

### 9.3 Verify Real-Time Updates

```sql
-- Update inventory in database
UPDATE inventory 
SET quantity_available = 5 
WHERE product_id = '550e8400-e29b-41d4-a716-446655440041';

-- Check if dashboard updates automatically
```

---

## Step 10: Deployment

### 10.1 Build Frontend

```bash
npm run build
```

### 10.2 Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### 10.3 Deploy Functions

```bash
firebase deploy --only functions
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ERPX-AI Architecture                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Browser    │
│ React + Vite │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Firebase Auth    │ ◄──── Authentication
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Cloud Functions │ ◄──── API Layer (Node.js + Express)
│   (API Server)   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Cloud SQL       │ ◄──── PostgreSQL Database
│  (PostgreSQL)    │       • Users & Roles
└──────────────────┘       • Products & Inventory
                           • Sales & Invoices
                           • Payments & Expenses
```

---

## Database Schema Overview

### Core Tables

- **companies** - Multi-tenant company data
- **branches** - Multi-location support
- **users** - User accounts linked to Firebase Auth
- **roles** - Role-based permissions
- **employees** - HR data

### CRM Tables

- **customers** - Customer records
- **suppliers** - Supplier management

### Inventory Tables

- **categories** - Product categorization
- **products** - Product catalog
- **warehouses** - Warehouse locations
- **inventory** - Current stock levels
- **inventory_movements** - Stock transaction history

### Sales Tables

- **sales_orders** - Sales order management
- **sales_order_items** - Line items
- **invoices** - ZATCA-compliant invoices
- **invoice_items** - Invoice line items

### Financial Tables

- **payments** - Payment records
- **expenses** - Expense tracking
- **expense_categories** - Expense categorization
- **payroll** - Payroll records

### Audit

- **audit_logs** - Complete audit trail

---

## Role-Based Access Control

| Role      | Permissions                                    |
|-----------|------------------------------------------------|
| Admin     | Full access to all modules                     |
| Manager   | Department access, read/write, no delete       |
| Accountant| Finance, invoices, payments                    |
| Sales     | Sales orders, customers, quotations            |
| Warehouse | Inventory, products, stock movements           |
| Employee  | Read-only access to assigned tasks             |

---

## Monitoring & Maintenance

### 10.1 Monitor Database Performance

```bash
# Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 10.2 Backup Strategy

```bash
# Enable automated backups in Cloud SQL
gcloud sql instances patch erpx-ai-db \
  --backup-start-time=03:00 \
  --enable-bin-log
```

### 10.3 Monitor Cloud Functions

```bash
firebase functions:log
```

---

## Troubleshooting

### Connection Issues

```bash
# Test Cloud SQL connection
psql "host=/cloudsql/PROJECT:REGION:INSTANCE dbname=erpxai user=erpx_user"
```

### Authentication Failures

```bash
# Verify Firebase token
firebase auth:export users.json
```

### API Errors

```bash
# Check function logs
firebase functions:log --only api
```

---

## Next Steps

1. ✅ Set up monitoring and alerts
2. ✅ Configure backup retention
3. ✅ Set up staging environment
4. ✅ Implement CI/CD pipeline
5. ✅ Add additional security layers
6. ✅ Configure CDN for static assets

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Cloud SQL Documentation**: https://cloud.google.com/sql/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

---

## License

Copyright © 2026 ERPX-AI. All rights reserved.
