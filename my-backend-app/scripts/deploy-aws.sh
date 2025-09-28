#!/bin/bash

# AWS Deployment Script for GitHub API
# This script helps deploy the GitHub API to AWS infrastructure

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
APP_NAME="github-api"
ENVIRONMENT=${ENVIRONMENT:-production}
ECR_REPOSITORY="${APP_NAME}"
ECS_CLUSTER="${APP_NAME}-cluster"
ECS_SERVICE="${APP_NAME}-service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Create AWS Secrets
create_secrets() {
    print_status "Creating AWS Secrets Manager secrets..."
    
    # Database secret
    if ! aws secretsmanager describe-secret --secret-id "${APP_NAME}/database" --region "$REGION" &> /dev/null; then
        print_status "Creating database secret..."
        aws secretsmanager create-secret \
            --name "${APP_NAME}/database" \
            --description "Database credentials for GitHub API" \
            --secret-string '{
                "host": "your-rds-endpoint.region.rds.amazonaws.com",
                "port": 5432,
                "username": "postgres",
                "password": "CHANGE_ME",
                "dbname": "github_insights",
                "ssl": true
            }' \
            --region "$REGION"
    else
        print_warning "Database secret already exists"
    fi
    
    # Redis secret
    if ! aws secretsmanager describe-secret --secret-id "${APP_NAME}/redis" --region "$REGION" &> /dev/null; then
        print_status "Creating Redis secret..."
        aws secretsmanager create-secret \
            --name "${APP_NAME}/redis" \
            --description "Redis credentials for GitHub API" \
            --secret-string '{
                "host": "your-elasticache-endpoint.cache.amazonaws.com",
                "port": 6380,
                "username": "default",
                "password": "CHANGE_ME",
                "tls": true
            }' \
            --region "$REGION"
    else
        print_warning "Redis secret already exists"
    fi
    
    # GitHub tokens secret
    if ! aws secretsmanager describe-secret --secret-id "${APP_NAME}/github-tokens" --region "$REGION" &> /dev/null; then
        print_status "Creating GitHub tokens secret..."
        aws secretsmanager create-secret \
            --name "${APP_NAME}/github-tokens" \
            --description "GitHub tokens for API access" \
            --secret-string '{
                "tokens": ["ghp_token1", "ghp_token2"]
            }' \
            --region "$REGION"
    else
        print_warning "GitHub tokens secret already exists"
    fi
    
    # SES secret
    if ! aws secretsmanager describe-secret --secret-id "${APP_NAME}/ses" --region "$REGION" &> /dev/null; then
        print_status "Creating SES secret..."
        aws secretsmanager create-secret \
            --name "${APP_NAME}/ses" \
            --description "SES configuration for GitHub API" \
            --secret-string '{
                "region": "us-east-1",
                "fromEmail": "noreply@yourdomain.com",
                "fromName": "GitHub API",
                "replyToEmail": "support@yourdomain.com"
            }' \
            --region "$REGION"
    else
        print_warning "SES secret already exists"
    fi
}

# Build and push Docker image
build_and_push() {
    print_status "Building and pushing Docker image..."
    
    # Get AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
    
    # Login to ECR
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_URI"
    
    # Create ECR repository if it doesn't exist
    if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$REGION" &> /dev/null; then
        print_status "Creating ECR repository..."
        aws ecr create-repository \
            --repository-name "$ECR_REPOSITORY" \
            --region "$REGION"
    fi
    
    # Build image
    print_status "Building Docker image..."
    docker build -f Dockerfile.aws -t "${ECR_URI}/${ECR_REPOSITORY}:latest" -t "${ECR_URI}/${ECR_REPOSITORY}:${ENVIRONMENT}" .
    
    # Push image
    print_status "Pushing Docker image..."
    docker push "${ECR_URI}/${ECR_REPOSITORY}:latest"
    docker push "${ECR_URI}/${ECR_REPOSITORY}:${ENVIRONMENT}"
    
    print_status "Image pushed to ${ECR_URI}/${ECR_REPOSITORY}:${ENVIRONMENT}"
}

# Create CloudFormation templates
create_infrastructure() {
    print_status "Creating infrastructure templates..."
    
    # Create CloudFormation template for RDS
    cat > infrastructure/rds-template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'RDS PostgreSQL instance for GitHub API'

Parameters:
  DBInstanceIdentifier:
    Type: String
    Default: github-api-db
  DBName:
    Type: String
    Default: github_insights
  DBUsername:
    Type: String
    Default: postgres
  DBPassword:
    Type: String
    NoEcho: true
    MinLength: 8

Resources:
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for GitHub API RDS
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: github-api-db-subnet-group

  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for GitHub API RDS
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref AppSecurityGroup

  DBInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Ref DBInstanceIdentifier
      DBName: !Ref DBName
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: '15.4'
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20
      StorageType: gp2
      StorageEncrypted: true
      VPCSecurityGroups:
        - !Ref DBSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup
      BackupRetentionPeriod: 7
      MultiAZ: false
      PubliclyAccessible: false
      DeletionProtection: true

Outputs:
  DBEndpoint:
    Description: RDS endpoint
    Value: !GetAtt DBInstance.Endpoint.Address
    Export:
      Name: !Sub "${AWS::StackName}-DBEndpoint"
EOF

    # Create CloudFormation template for ElastiCache
    cat > infrastructure/elasticache-template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ElastiCache Valkey cluster for GitHub API'

Resources:
  CacheSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for GitHub API cache
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  CacheSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for GitHub API cache
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6380
          ToPort: 6380
          SourceSecurityGroupId: !Ref AppSecurityGroup

  CacheCluster:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: valkey
      NumCacheNodes: 1
      Port: 6380
      VpcSecurityGroupIds:
        - !Ref CacheSecurityGroup
      CacheSubnetGroupName: !Ref CacheSubnetGroup
      TransitEncryptionEnabled: true
      AtRestEncryptionEnabled: true

Outputs:
  CacheEndpoint:
    Description: ElastiCache endpoint
    Value: !GetAtt CacheCluster.RedisEndpoint.Address
    Export:
      Name: !Sub "${AWS::StackName}-CacheEndpoint"
EOF

    mkdir -p infrastructure
    print_status "Infrastructure templates created in infrastructure/"
}

# Deploy to ECS
deploy_ecs() {
    print_status "Deploying to ECS..."
    
    # This would typically involve updating an ECS service
    # For now, we'll just provide the configuration
    cat > infrastructure/ecs-task-definition.json << EOF
{
  "family": "${APP_NAME}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "${APP_NAME}",
      "image": "${ECR_URI}/${ECR_REPOSITORY}:${ENVIRONMENT}",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "${ENVIRONMENT}"
        },
        {
          "name": "AWS_REGION",
          "value": "${REGION}"
        },
        {
          "name": "AWS_DB_SECRET_NAME",
          "value": "${APP_NAME}/database"
        },
        {
          "name": "AWS_REDIS_SECRET_NAME",
          "value": "${APP_NAME}/redis"
        },
        {
          "name": "AWS_GITHUB_SECRET_NAME",
          "value": "${APP_NAME}/github-tokens"
        },
        {
          "name": "AWS_SES_SECRET_NAME",
          "value": "${APP_NAME}/ses"
        },
        {
          "name": "ENABLE_EMAIL_NOTIFICATIONS",
          "value": "true"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${APP_NAME}",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node scripts/health-check.js || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

    print_status "ECS task definition created at infrastructure/ecs-task-definition.json"
}

# Main deployment function
main() {
    case "${1:-}" in
        "secrets")
            check_prerequisites
            create_secrets
            ;;
        "build")
            check_prerequisites
            build_and_push
            ;;
        "infrastructure")
            create_infrastructure
            ;;
        "ecs")
            check_prerequisites
            deploy_ecs
            ;;
        "full")
            check_prerequisites
            create_secrets
            build_and_push
            create_infrastructure
            deploy_ecs
            print_status "Full deployment preparation completed!"
            print_warning "Please review and deploy the infrastructure templates manually."
            ;;
        *)
            echo "Usage: $0 {secrets|build|infrastructure|ecs|full}"
            echo ""
            echo "Commands:"
            echo "  secrets        - Create AWS Secrets Manager secrets"
            echo "  build          - Build and push Docker image to ECR"
            echo "  infrastructure - Generate CloudFormation templates"
            echo "  ecs            - Generate ECS task definition"
            echo "  full           - Run all steps above"
            exit 1
            ;;
    esac
}

main "$@"