# ERPX-AI: Infrastructure, Security & DevOps Architecture

**Sections Covered:** 6-11  
**Document Version:** 1.0  
**Last Updated:** May 16, 2026

---

## Section 6: Hosting & Deployment Architecture

### 6.1 Vercel Edge Platform

**Why Vercel?**

- Zero-config deployment from Git
- Global edge network (20+ regions)
- Automatic HTTPS/SSL
- Instant rollback capability
- Built-in DDoS protection
- Serverless architecture (infinite scale)

**Edge Locations:**

- North America: 8 locations
- Europe: 6 locations
- Asia Pacific: 4 locations
- Middle East: Bahrain (GCC region)
- South America: 1 location

**Performance Benefits:**

- Average page load: <500ms globally
- First Contentful Paint: <1s
- Time to Interactive: <2s

### 6.2 CI/CD Pipeline

```
Developer Push → GitHub → Webhook → Vercel Build → Deploy to Edge
         ↓
    1. git push origin main
         ↓
    2. GitHub webhook triggers Vercel
         ↓
    3. Vercel clones repo
         ↓
    4. pnpm install (dependencies)
         ↓
    5. pnpm build (Vite production build)
         ↓
    6. Optimize & compress assets
         ↓
    7. Deploy to global edge network
         ↓
    8. Invalidate cache
         ↓
    9. Production live (erpx-ai.com)
         ↓
   10. Slack notification (success/failure)
```

**Build Time:** 2-3 minutes  
**Deployment Time:** 30 seconds  
**Total:** <5 minutes from push to live

### 6.3 Environment Management

| Environment | Domain              | Branch    | Purpose                |
| ----------- | ------------------- | --------- | ---------------------- |
| Development | localhost:5173      | feature/* | Local development      |
| Staging     | staging.erpx-ai.com | staging   | Pre-production testing |
| Production  | erpx-ai.com         | main      | Live production        |

**Environment Variables:**

```bash
# Development
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ENV=development
VITE_DEV_AUTH_BYPASS=true

# Production
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ENV=production
VITE_DEV_AUTH_BYPASS=false
```

### 6.4 CDN & Caching Strategy

**Static Assets:**

- Cached at edge for 365 days
- Content-based hashing (e.g., app.abc123.js)
- Automatic cache invalidation on deploy

**API Responses:**

- No caching (dynamic data)
- Realtime WebSocket connections

**Images:**

- Lazy loading
- Next-gen formats (WebP)
- Responsive images

### 6.5 SSL/TLS Configuration

- **TLS Version:** 1.3
- **Certificate:** Automatic (Let's Encrypt)
- **HSTS:** Enabled
- **Certificate Renewal:** Automatic
- **Grade:** A+ (SSL Labs)

---

## Section 7: Authentication & Authorization Architecture

### 7.1 Authentication Flow

```
User enters credentials
        ↓
Frontend → Supabase Auth API
        ↓
Supabase validates credentials
        ↓
Generate JWT token (24h expiry)
        ↓
Store in localStorage + httpOnly cookie
        ↓
Return { user, session } to frontend
        ↓
Frontend fetches user profile from database
        ↓
Store in AuthContext (React)
        ↓
Render dashboard
```

**Security Features:**

- Bcrypt password hashing (cost factor 10)
- JWT with 24-hour expiry
- Automatic token refresh
- Rate limiting (5 attempts / 5 minutes)
- Email verification (optional)
- Password strength requirements

### 7.2 JWT Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "aud": "authenticated",
    "exp": 1715881234,
    "sub": "user-uuid",
    "email": "user@company.com",
    "role": "authenticated",
    "iat": 1715794834
  },
  "signature": "..."
}
```

### 7.3 Authorization (RBAC)

**Permission Model:**

```typescript
interface RolePermissions {
  // Module Access
  finance_access: boolean;
  hr_access: boolean;
  inventory_access: boolean;
  pos_access: boolean;

  // CRUD Operations
  finance_read: boolean;
  finance_write: boolean;
  finance_delete: boolean;

  // Specific Actions
  open_close_shift: boolean;
  process_refunds: boolean;
  manage_users: boolean;

  // Superadmin
  all: boolean;
}
```

**Permission Checking:**

```typescript
// In components
const { hasPermission } = useAuth();

{hasPermission('finance_write') && (
  <button onClick={createTransaction}>
    Create Transaction
  </button>
)}

// In services
if (!hasPermission('inventory_write')) {
  throw new Error('Unauthorized');
}
```

### 7.4 Session Management

**Session Duration:** 24 hours  
**Refresh Token:** 30 days  
**Concurrent Sessions:** Unlimited  
**Session Storage:** httpOnly cookie + localStorage

**Logout Behavior:**

- Clear localStorage
- Invalidate JWT server-side
- Redirect to login

---

## Section 8: Security Architecture

### 8.1 Security Layers

**Layer 1: Network Security (Vercel)**

- DDoS protection
- WAF (Web Application Firewall)
- Rate limiting
- IP whitelisting (future)

**Layer 2: Application Security**

- HTTPS only (HTTP redirected)
- CORS configuration
- CSP headers
- XSS prevention
- CSRF protection

**Layer 3: Authentication**

- JWT validation
- Session management
- Password policies
- MFA (planned)

**Layer 4: Authorization**

- RBAC (Role-Based Access Control)
- Row-Level Security (RLS)
- API permission checks

**Layer 5: Data Security**

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Database RLS policies
- Audit logging

### 8.2 Data Encryption

**At Rest:**

- Database: AES-256 encryption
- Backups: Encrypted S3
- File storage: Server-side encryption

**In Transit:**

- HTTPS (TLS 1.3)
- WebSocket Secure (WSS)
- API calls encrypted end-to-end

**Sensitive Fields:**

```sql
-- Password hashing (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive data
UPDATE users
SET encrypted_ssn = pgp_sym_encrypt(ssn, 'encryption-key');

-- Decrypt
SELECT pgp_sym_decrypt(encrypted_ssn, 'encryption-key') as ssn;
```

### 8.3 Vulnerability Protection

| Threat                | Protection                     |
| --------------------- | ------------------------------ |
| **SQL Injection**     | Parameterized queries, RLS     |
| **XSS**               | React escaping, CSP headers    |
| **CSRF**              | SameSite cookies, CORS         |
| **Clickjacking**      | X-Frame-Options: DENY          |
| **Man-in-the-Middle** | HSTS, TLS 1.3                  |
| **Brute Force**       | Rate limiting, account lockout |
| **Session Hijacking** | Secure cookies, token rotation |

### 8.4 Compliance Readiness

**GDPR (EU):**

- ✅ Data encryption
- ✅ User consent tracking
- ✅ Right to deletion
- ✅ Data export functionality
- ⏳ Privacy policy
- ⏳ Cookie consent banner

**PDPL (Saudi Arabia):**

- ✅ Data residency (can deploy in GCC)
- ✅ Access controls
- ✅ Data minimization
- ⏳ Compliance documentation

**SOC 2 Type II (Planned):**

- Security controls implemented
- Audit trail logging
- Access controls
- Incident response plan
- Vendor management

### 8.5 Audit Logging (Future)

**What to Log:**

- User login/logout
- Permission changes
- Data modifications (who changed what)
- Failed authentication attempts
- API access logs

**Log Structure:**

```json
{
  "timestamp": "2026-05-16T10:30:00Z",
  "user_id": "uuid",
  "action": "UPDATE",
  "table": "users",
  "record_id": "uuid",
  "old_value": {...},
  "new_value": {...},
  "ip_address": "1.2.3.4"
}
```

---

## Section 9: Real-time Architecture

### 9.1 Supabase Realtime Engine

**Technology:** WebSocket-based pub/sub

**Capabilities:**

- Database change data capture (CDC)
- Channel-based messaging
- Presence tracking
- Broadcast messaging

**Implementation:**

```typescript
// Subscribe to sales updates
const channel = supabase
  .channel('sales-realtime')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'sales',
      filter: `company_id=eq.${companyId}`,
    },
    (payload) => {
      // New sale created
      console.log('New sale:', payload.new);
      // Update dashboard KPIs
      refreshDashboard();
    },
  )
  .subscribe();
```

### 9.2 Real-time Use Cases

**Dashboard Metrics:**

- Total sales updated live
- Active users count
- Stock levels
- Pending orders

**Multi-user POS:**

- Multiple cashiers see each other's sales
- Prevent selling out-of-stock items
- Shift totals update in real-time

**Notifications:**

- New invoice created
- Payment received
- Low stock alert
- Shift ended

### 9.3 Performance Characteristics

**Latency:**

- Local region: 20-50ms
- Cross-region: 100-250ms
- Maximum acceptable: 500ms

**Throughput:**

- Messages per second: 100,000+
- Concurrent connections: 10,000+
- Channel capacity: Unlimited

**Reliability:**

- Automatic reconnection
- Message queuing during disconnect
- Delivery guarantee: At least once

---

## Section 10: DevOps Architecture

### 10.1 Development Workflow

```
1. Developer creates feature branch
   git checkout -b feature/new-module

2. Local development
   pnpm dev (localhost:5173)

3. Commit changes
   git commit -m "Add new feature"

4. Push to GitHub
   git push origin feature/new-module

5. Create Pull Request
   Review code, run checks

6. Merge to staging branch
   Auto-deploy to staging.erpx-ai.com

7. QA testing on staging
   Smoke tests, UAT

8. Merge to main
   Auto-deploy to erpx-ai.com

9. Monitor production
   Check error rates, performance
```

### 10.2 Build Process

**Vite Build Configuration:**

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false, // Disable in production
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/*'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

**Build Output:**

```
dist/
├── assets/
│   ├── index.abc123.js (Main app code)
│   ├── vendor-react.def456.js (React libs)
│   ├── vendor-ui.ghi789.js (UI components)
│   ├── vendor-charts.jkl012.js (Charts)
│   └── index.mno345.css (Styles)
├── index.html
└── favicon.ico
```

### 10.3 Monitoring & Logging

**Current (Vercel Analytics):**

- Page views
- Unique visitors
- Performance metrics (Core Web Vitals)
- Geographic distribution
- Device types

**Planned (Sentry):**

- Error tracking
- Performance monitoring
- Release health
- User feedback
- Session replay

**Metrics to Track:**

- Error rate (target: <0.1%)
- API response time (target: <500ms)
- Deployment frequency (current: 5-10/week)
- Mean time to recovery (MTTR)
- Uptime (target: 99.9%)

### 10.4 Release Management

**Versioning:** Semantic Versioning (SemVer)

- Major.Minor.Patch
- Example: 1.2.3

**Release Process:**

1. Create release branch
2. Update version in package.json
3. Update CHANGELOG.md
4. Merge to main
5. Tag release: `git tag v1.2.3`
6. Auto-deploy to production
7. Monitor for issues
8. Post-deployment smoke tests

**Rollback Strategy:**

- Vercel instant rollback (1-click)
- Database rollback (restore from backup)
- Feature flags (disable features without deploy)

### 10.5 Testing Strategy (Future)

**Unit Tests:**

- Test business logic (services)
- Test utilities
- Coverage target: 80%

**Integration Tests:**

- Test API calls
- Test database queries
- Test authentication flows

**E2E Tests:**

- Test critical user journeys
- Test on multiple browsers
- Automated with Playwright

**Load Tests:**

- Simulate 1,000+ concurrent users
- Test database performance
- Test real-time scalability

---

## Section 11: Cloud Infrastructure

### 11.1 Current Infrastructure Stack

```
Frontend Layer (Vercel)
├── Edge Network (20+ global locations)
├── Static asset delivery
├── CDN caching
└── SSL/TLS termination

Backend Layer (Supabase)
├── PostgreSQL database (AWS RDS)
├── Authentication service
├── Realtime engine (WebSocket)
├── Storage service (S3-compatible)
└── Edge Functions (Deno)

Integration Layer (Future)
├── AI services (OpenAI)
├── Payment gateways (Stripe, Moyasar)
├── Communication (Twilio, SendGrid)
└── Business APIs (ZATCA, WhatsApp)
```

### 11.2 Infrastructure Cost Analysis

**Current Monthly Costs:**

| Service   | Plan | Cost          |
| --------- | ---- | ------------- |
| Vercel    | Pro  | $20           |
| Supabase  | Pro  | $25           |
| Domain    | -    | $1            |
| **Total** |      | **$46/month** |

**Cost Per User:**

- At 100 companies: $0.46/company/month
- At 1,000 companies: $0.10/company/month
- At 10,000 companies: $0.05/company/month

**Extremely favorable unit economics for SaaS!**

### 11.3 Scalability Projections

**Database Scaling:**

```
Current: 8 GB RAM, 50 GB storage
100 companies: Same
1,000 companies: 32 GB RAM, 500 GB storage ($100/mo)
10,000 companies: Dedicated instance ($500-1,000/mo)
```

**Bandwidth Scaling:**

```
Current: 250 GB/month included
1,000 companies: ~500 GB/month (minimal overage)
10,000 companies: ~2 TB/month ($50 overage)
```

### 11.4 Multi-Region Strategy (Future)

**Phase 1: GCC Expansion**

- Deploy read replica in AWS Bahrain
- Route GCC traffic to Bahrain
- Latency improvement: 150ms → 30ms

**Phase 2: Global Distribution**

```
Primary: US-East (Global default)
GCC: AWS Bahrain (Saudi, UAE, Kuwait)
Europe: AWS Frankfurt
Asia: AWS Singapore
```

### 11.5 High Availability Architecture

**Current SLA:**

- Vercel: 99.99% uptime guarantee
- Supabase: 99.9% uptime guarantee
- **Combined:** ~99.89% uptime

**Disaster Recovery:**

- Automated daily backups
- Point-in-time recovery
- Multi-region failover (future)
- RTO: 30 minutes
- RPO: 24 hours (or PITR)

---

## Security Scorecard

| Security Dimension    | Score (1-10) | Notes                                  |
| --------------------- | ------------ | -------------------------------------- |
| **Authentication**    | 9/10         | JWT, bcrypt, rate limiting             |
| **Authorization**     | 9/10         | RLS, RBAC implemented                  |
| **Data Encryption**   | 8/10         | At rest & in transit                   |
| **Network Security**  | 9/10         | HTTPS, DDoS protection                 |
| **Compliance**        | 6/10         | GDPR-aligned, needs audit              |
| **Monitoring**        | 5/10         | Basic monitoring, needs enhancement    |
| **Incident Response** | 5/10         | Manual process, needs automation       |
| **Overall**           | **7.3/10**   | Production-ready, room for improvement |

---

## Infrastructure Maturity Assessment

| Dimension             | Maturity Level   | Notes                             |
| --------------------- | ---------------- | --------------------------------- |
| **Deployment**        | **Advanced**     | Automated CI/CD, instant rollback |
| **Monitoring**        | **Intermediate** | Basic metrics, needs enhancement  |
| **Scaling**           | **Advanced**     | Serverless, auto-scaling          |
| **Security**          | **Advanced**     | Multi-layer security, RLS         |
| **Disaster Recovery** | **Intermediate** | Backups exist, needs testing      |
| **Cost Optimization** | **Advanced**     | Extremely cost-efficient          |

---

_Next: Section 12-20 - ERP Modules, UI/UX, AI Features & Performance_
