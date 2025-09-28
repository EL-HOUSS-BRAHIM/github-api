# AWS Migration Guide

This guide covers the complete migration of the GitHub API from MySQL to AWS infrastructure with PostgreSQL, AWS Valkey (ElastiCache), and AWS Secrets Manager for rotating keys.

## Architecture Overview

The migrated architecture includes:

- **Database**: Amazon RDS PostgreSQL (replaces MySQL)
- **Cache**: AWS ElastiCache with Valkey (replaces local Redis)
- **Secrets Management**: AWS Secrets Manager for rotating keys
- **Email**: Amazon SES for notifications
- **Container Runtime**: Amazon ECS with Fargate
- **Image Registry**: Amazon ECR

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Docker** for building images
3. **Node.js 18+** for local development
4. **PostgreSQL client** for database operations (optional)

## AWS Services Setup

### 1. AWS Secrets Manager

Create the following secrets in AWS Secrets Manager:

#### Database Secret (`github-api/database`)
```json
{
  "host": "your-rds-endpoint.region.rds.amazonaws.com",
  "port": 5432,
  "username": "postgres",
  "password": "your-secure-password",
  "dbname": "github_insights",
  "ssl": true
}
```

#### Redis/Valkey Secret (`github-api/redis`)
```json
{
  "host": "your-elasticache-endpoint.cache.amazonaws.com",
  "port": 6380,
  "username": "default",
  "password": "your-auth-token",
  "tls": true
}
```

#### GitHub Tokens Secret (`github-api/github-tokens`)
```json
{
  "tokens": ["ghp_xxxxxxxxxxxx", "ghp_yyyyyyyyyyyy"]
}
```

#### SES Configuration Secret (`github-api/ses`)
```json
{
  "region": "us-east-1",
  "fromEmail": "noreply@yourdomain.com",
  "fromName": "GitHub API",
  "replyToEmail": "support@yourdomain.com"
}
```

### 2. Amazon RDS (PostgreSQL)

1. Create a PostgreSQL RDS instance:
   - Engine: PostgreSQL 15+
   - Instance class: db.t3.micro (or larger for production)
   - Storage: 20GB GP2 (minimum)
   - Multi-AZ: Enabled for production
   - Backup retention: 7 days minimum

2. Configure security groups to allow access from your ECS tasks

3. Enable encryption at rest and in transit

### 3. ElastiCache (Valkey)

1. Create a Valkey cluster:
   - Engine: Valkey 7.0+
   - Node type: cache.t3.micro (or larger)
   - Encryption in transit: Enabled
   - Encryption at rest: Enabled

2. Configure security groups and subnet groups

### 4. Amazon SES

1. Verify your domain and email addresses in SES
2. Request production access if needed
3. Configure DKIM and SPF records

## Environment Configuration

### Local Development

Create `.env` file:
```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_local_password
DB_NAME=github_insights
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
GITHUB_TOKENS=your_github_tokens
```

### AWS Production

Create `.env` file with AWS Secrets Manager references:
```bash
NODE_ENV=production
AWS_REGION=us-east-1
AWS_DB_SECRET_NAME=github-api/database
AWS_REDIS_SECRET_NAME=github-api/redis
AWS_GITHUB_SECRET_NAME=github-api/github-tokens
AWS_SES_SECRET_NAME=github-api/ses
ENABLE_EMAIL_NOTIFICATIONS=true
NOTIFICATION_EMAIL=admin@yourdomain.com
```

## Deployment Steps

### 1. Local Development Setup

```bash
# Start local services
docker-compose -f docker-compose.aws.yml up -d

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### 2. AWS Deployment

```bash
# Create AWS secrets
./scripts/deploy-aws.sh secrets

# Build and push to ECR
./scripts/deploy-aws.sh build

# Generate infrastructure templates
./scripts/deploy-aws.sh infrastructure

# Generate ECS task definition
./scripts/deploy-aws.sh ecs

# Or run all steps
./scripts/deploy-aws.sh full
```

### 3. Infrastructure Deployment

Deploy the CloudFormation templates in this order:

1. **VPC and Networking** (if not existing)
2. **RDS Database** - Use `infrastructure/rds-template.yaml`
3. **ElastiCache** - Use `infrastructure/elasticache-template.yaml`
4. **ECS Cluster and Service** - Use `infrastructure/ecs-task-definition.json`

### 4. Database Migration

If migrating from existing MySQL data:

```bash
# Export data from MySQL
mysqldump -h old_host -u user -p github_insights > backup.sql

# Convert MySQL dump to PostgreSQL format (use tools like mysql2postgresql)
# Import to PostgreSQL
psql -h new_host -U postgres -d github_insights < converted_backup.sql

# Run application migrations to update schema
npm run migrate
```

## Configuration Details

### Database Configuration

The application now uses PostgreSQL with these key changes:

- **Dialect**: Changed from `mysql` to `postgres`
- **Port**: Default changed from 3306 to 5432
- **SSL**: Required for AWS RDS connections
- **JSON Fields**: Using `JSONB` for better performance

### Cache Configuration

Valkey/Redis configuration supports:

- **TLS Encryption**: Required for AWS ElastiCache
- **Authentication**: Username/password authentication
- **Cluster Mode**: Support for Redis Cluster topology
- **Connection Pooling**: Optimized for AWS environment

### Secrets Management

The application loads configuration in this order:

1. Environment variables (local development)
2. AWS Secrets Manager (production)
3. Default values (fallback)

Secrets are cached for 5 minutes to reduce API calls.

## Monitoring and Logging

### Health Checks

The application provides health check endpoints:

- `GET /api/system/health` - Overall system health
- Docker health check script at `scripts/health-check.js`

### Logging

Configure structured logging with:

- **CloudWatch Logs** for ECS containers
- **Application logs** with structured JSON format
- **Error notifications** via SES email

### Metrics

Monitor these key metrics:

- Database connection pool utilization
- Redis/Valkey hit rates
- API response times
- Queue processing rates
- Email delivery rates

## Security Considerations

### IAM Roles and Policies

ECS tasks need permissions for:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:github-api/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### Network Security

- **VPC**: Deploy in private subnets
- **Security Groups**: Restrict access to necessary ports
- **NAT Gateway**: For outbound internet access
- **TLS/SSL**: Encrypt all connections

### Secret Rotation

AWS Secrets Manager supports automatic rotation:

1. Enable rotation for database passwords
2. Configure rotation Lambda functions
3. Test rotation procedures regularly

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check security groups and NACLs
   - Verify SSL/TLS configuration
   - Ensure secrets are correctly formatted

2. **Redis/Valkey Connection Issues**
   - Verify TLS settings match cluster configuration
   - Check authentication credentials
   - Confirm security group rules

3. **Secrets Manager Access**
   - Verify IAM permissions
   - Check secret names match environment variables
   - Ensure secrets exist in correct region

4. **SES Email Issues**
   - Verify domain and email verification
   - Check sending limits and production access
   - Review bounce and complaint handling

### Debugging Commands

```bash
# Check database connectivity
npm run migrate -- --status

# Test Redis connection
node -e "const redis = require('./src/config/redis'); redis.getRedisClient().then(client => client.ping()).then(console.log)"

# Verify secrets access
aws secretsmanager get-secret-value --secret-id github-api/database

# Check ECS task logs
aws logs tail /ecs/github-api --follow
```

## Rollback Strategy

If issues occur during migration:

1. **Database**: Restore from RDS snapshot
2. **Application**: Revert to previous ECS task definition
3. **Secrets**: Restore previous secret versions
4. **DNS**: Update to point to old infrastructure

## Cost Optimization

- **RDS**: Use appropriate instance sizes, enable storage autoscaling
- **ElastiCache**: Size clusters based on actual usage
- **ECS**: Use Fargate Spot for development environments
- **Secrets Manager**: Minimize API calls with proper caching

## Support and Maintenance

- **Automated Backups**: RDS and application data
- **Monitoring**: CloudWatch alarms for critical metrics
- **Updates**: Regular security patches and dependency updates
- **Documentation**: Keep this guide updated with changes