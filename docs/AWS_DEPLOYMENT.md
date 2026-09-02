# ERPX-AI AWS Deployment Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Cloud (Multi-AZ)                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           CloudFront (CDN + WAF)                    │   │
│  └────────────────┬────────────────────────────────────┘   │
│                   │                                         │
│  ┌────────────────▼────────────────────────────────────┐   │
│  │         Application Load Balancer (ALB)             │   │
│  │         - SSL/TLS Termination                       │   │
│  │         - Health Checks                             │   │
│  └───────┬─────────────────────────┬──────────────────┘   │
│          │                         │                       │
│  ┌───────▼────────┐       ┌───────▼────────┐             │
│  │   ECS Fargate  │       │   ECS Fargate  │             │
│  │   AZ-1         │       │   AZ-2         │             │
│  │   - Frontend   │       │   - Frontend   │             │
│  │   - React App  │       │   - React App  │             │
│  └───────┬────────┘       └───────┬────────┘             │
│          │                         │                       │
│          └────────┬────────────────┘                       │
│                   │                                         │
│  ┌────────────────▼────────────────────────────────────┐   │
│  │              Supabase (External)                    │   │
│  │              - PostgreSQL Database                  │   │
│  │              - Authentication                       │   │
│  │              - Realtime Subscriptions               │   │
│  │              - Storage                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Supporting Services                    │   │
│  │  - S3: Static Assets, Backups                       │   │
│  │  - CloudWatch: Monitoring & Logs                    │   │
│  │  - Secrets Manager: API Keys                        │   │
│  │  - Route 53: DNS Management                         │   │
│  │  - ACM: SSL Certificates                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend Layer (React + Vite)

**Hosting Options:**

#### Option A: AWS Amplify (Recommended for simplicity)

```yaml
Service: AWS Amplify
Deployment: Automated from Git
Features:
  - Automatic builds on git push
  - Built-in CDN (CloudFront)
  - SSL certificates (ACM)
  - Environment variable management
  - Branch previews
  - Custom domains

Cost: ~$15-50/month (depending on traffic)
```

#### Option B: S3 + CloudFront (Recommended for production)

```yaml
S3 Bucket Configuration:
  - Static website hosting
  - Versioning enabled
  - Lifecycle policies for old versions

CloudFront Distribution:
  - Origin: S3 bucket
  - SSL/TLS: ACM certificate
  - Caching: Aggressive for static assets
  - WAF: Enable DDoS protection
  - Geo-restriction: Optional
  - Custom error pages: /index.html for SPA routing

Cost: ~$5-30/month (depending on traffic)
```

#### Option C: ECS Fargate with Nginx

```yaml
Container: nginx:alpine
Configuration:
  - Serve built React files
  - Gzip compression
  - Cache headers
  - SPA routing fallback

ECS Service:
  - Task count: 2 (multi-AZ)
  - CPU: 256 (.25 vCPU)
  - Memory: 512 MB
  - Auto-scaling: CPU > 70%

Cost: ~$20-60/month
```

### 2. Database Layer (Supabase)

**Supabase Cloud (Recommended)**

```yaml
Plan: Pro ($25/month)
Features:
  - 8GB database
  - 50GB bandwidth
  - 100GB file storage
  - Daily backups
  - Point-in-time recovery
  - Custom domain
  - 99.9% uptime SLA

Database Specifications:
  - PostgreSQL 15
  - Connection pooling (PgBouncer)
  - Read replicas (optional)
  - Automatic backups
  - SSL connections enforced
```

**Self-Hosted Option (Advanced)**

```yaml
Service: RDS PostgreSQL
Configuration:
  - Instance: db.t3.medium (2 vCPU, 4GB RAM)
  - Multi-AZ: Yes
  - Storage: 100GB GP3
  - Backup retention: 7 days
  - Encryption: At rest + in transit

Additional Required:
  - Supabase self-hosted stack (Docker)
  - Authentication service
  - Realtime service
  - Storage service

Cost: ~$100-200/month
```

### 3. CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: erpx-ai-frontend

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Install dependencies
        run: pnpm install

      - name: Build application
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: pnpm run build

      # Option 1: Deploy to S3 + CloudFront
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://erpx-ai-production --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"

      # Option 2: Deploy to Amplify
      - name: Deploy to Amplify
        uses: aws-amplify/amplify-cli-action@v0.3.0
        with:
          amplify_command: publish
          amplify_env: production

      # Option 3: Deploy to ECS
      - name: Build and push Docker image
        run: |
          aws ecr get-login-password --region ${{ env.AWS_REGION }} | docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
          docker build -t ${{ secrets.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:latest .
          docker push ${{ secrets.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster erpx-ai-cluster --service erpx-ai-service --force-new-deployment
```

### 4. Infrastructure as Code (Terraform)

**Directory Structure:**

```
infrastructure/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── networking/
│   ├── frontend/
│   ├── monitoring/
│   └── security/
└── environments/
    ├── dev/
    ├── staging/
    └── production/
```

**Example: S3 + CloudFront Setup**

```hcl
# infrastructure/modules/frontend/main.tf

# S3 Bucket for static hosting
resource "aws_s3_bucket" "frontend" {
  bucket = "erpx-ai-${var.environment}"

  tags = {
    Name        = "ERPX-AI Frontend"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = ["app.erpx-ai.com"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

### 5. Monitoring & Logging

**CloudWatch Setup:**

```yaml
Metrics:
  - Frontend Response Time
  - Error Rate (4xx, 5xx)
  - Request Count
  - Data Transfer
  - Cache Hit Ratio

Alarms:
  - High Error Rate (>5%)
  - Slow Response Time (>2s)
  - High Traffic (>10,000 requests/min)

Logs:
  - CloudFront Access Logs → S3
  - Application Logs → CloudWatch Logs
  - Retention: 30 days

Dashboard:
  - Real-time metrics
  - Error tracking
  - User analytics
  - Performance monitoring
```

**Log Aggregation:**

```javascript
// src/lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.info(message, meta);
    // Send to CloudWatch if in production
    if (import.meta.env.PROD) {
      sendToCloudWatch('INFO', message, meta);
    }
  },
  error: (message: string, error?: Error) => {
    console.error(message, error);
    // Always send errors to CloudWatch
    sendToCloudWatch('ERROR', message, {
      stack: error?.stack,
      message: error?.message
    });
  }
};
```

### 6. Security Configuration

**WAF Rules:**

```yaml
AWS WAF Rule Groups:
  - Rate limiting: 2000 requests/5min per IP
  - SQL injection protection
  - XSS protection
  - Known bad inputs
  - Geographic blocking (optional)
  - Bot control
```

**Secrets Management:**

```bash
# Store sensitive values in AWS Secrets Manager
aws secretsmanager create-secret \
  --name erpx-ai/production/supabase \
  --secret-string '{
    "url": "https://svxmlejmhlocsjjtftxd.supabase.co",
    "anon_key": "your-anon-key"
  }'

# Retrieve in CI/CD
aws secretsmanager get-secret-value \
  --secret-id erpx-ai/production/supabase \
  --query SecretString \
  --output text
```

**SSL/TLS Configuration:**

```yaml
Certificate: AWS Certificate Manager (ACM)
Protocol: TLS 1.2+
Cipher Suite: AWS recommended
HSTS: Enabled (max-age=31536000)
```

### 7. Backup & Disaster Recovery

**Database Backups (Supabase):**

```yaml
Automated:
  - Daily snapshots (7-day retention)
  - Point-in-time recovery (7 days)
  - Continuous archiving

Manual:
  - Weekly full backup to S3
  - Tested restore procedure monthly
```

**Static Assets Backup:**

```yaml
S3 Versioning: Enabled
Lifecycle Policy:
  - Delete old versions after 30 days
  - Transition to Glacier after 90 days

Cross-Region Replication:
  - Primary: us-east-1
  - Replica: us-west-2
```

**Disaster Recovery Plan:**

```yaml
RTO (Recovery Time Objective): 1 hour
RPO (Recovery Point Objective): 24 hours

Procedures: 1. Database restore from Supabase backup
  2. Frontend redeploy from last known good build
  3. DNS failover to backup region (if applicable)
  4. Verify all services operational
```

### 8. Cost Estimation

**Small Deployment (< 1000 users):**

```
AWS Amplify:              $20/month
Supabase Pro:             $25/month
Route 53:                 $1/month
CloudWatch:               $5/month
Secrets Manager:          $1/month
──────────────────────────────────
Total:                    ~$52/month
```

**Medium Deployment (< 10,000 users):**

```
S3 + CloudFront:          $30/month
ALB:                      $25/month
ECS Fargate (2 tasks):    $40/month
Supabase Pro:             $25/month
CloudWatch:               $15/month
WAF:                      $10/month
Route 53:                 $1/month
──────────────────────────────────
Total:                    ~$146/month
```

**Large Deployment (< 100,000 users):**

```
S3 + CloudFront:          $100/month
ALB:                      $25/month
ECS Fargate (4 tasks):    $80/month
Supabase Team:            $599/month
CloudWatch:               $50/month
WAF:                      $20/month
Route 53:                 $1/month
──────────────────────────────────
Total:                    ~$875/month
```

### 9. Deployment Checklist

- [ ] AWS account created
- [ ] IAM users/roles configured
- [ ] Domain purchased and DNS configured
- [ ] SSL certificate requested (ACM)
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] CI/CD pipeline tested
- [ ] CloudWatch alarms configured
- [ ] WAF rules activated
- [ ] Backup procedures tested
- [ ] Load testing performed
- [ ] Security scan completed
- [ ] Documentation updated

### 10. Post-Deployment Tasks

**Week 1:**

- Monitor error rates and performance
- Review CloudWatch dashboards daily
- Test all critical user flows
- Verify backup procedures

**Month 1:**

- Analyze cost reports
- Optimize caching strategies
- Review security logs
- Test disaster recovery
- Gather user feedback

**Ongoing:**

- Monthly security patches
- Quarterly dependency updates
- Bi-annual disaster recovery drills
- Continuous performance optimization
