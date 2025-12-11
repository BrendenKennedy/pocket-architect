# Pocket Architect - Backend API Specification

## Overview

This document provides a comprehensive specification for the Pocket Architect CLI backend API. The frontend application is designed to communicate with a RESTful API server running at `http://localhost:8000/api` by default.

## Architecture

### Technology Stack
- **Backend Framework**: Python CLI (recommended: Click or Typer)
- **API Server**: FastAPI (recommended) or Flask
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT tokens (optional for multi-user scenarios)

### Design Principles
1. **RESTful Design**: All endpoints follow REST conventions
2. **Consistent Response Format**: Standardized JSON responses
3. **Pagination**: List endpoints support pagination
4. **Filtering & Search**: Advanced query capabilities
5. **Error Handling**: Detailed error messages with proper HTTP status codes

---

## Data Models

All data models are defined in `/types/models.ts`. The backend should implement equivalent models.

### Core Entities
1. **Project** - Logical grouping of infrastructure resources
2. **Instance** - Individual compute resources
3. **Blueprint** - Reusable infrastructure templates
4. **SecurityConfig** - Security and network configurations
5. **Image** - Custom AMIs/disk images
6. **Account** - Cloud provider account connections

---

## API Endpoints

### Base URL
```
http://localhost:8000/api
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 5,
    "totalItems": 234
  }
}
```

---

## 1. Projects API

### List Projects
```
GET /api/projects?page=1&pageSize=50&search=web&sortBy=name&sortOrder=asc
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50)
- `search` (optional): Search in name, description, vpc
- `sortBy` (optional): Sort field
- `sortOrder` (optional): 'asc' or 'desc'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "production-web-app",
      "description": "Production web application infrastructure",
      "status": "healthy",
      "instanceCount": 5,
      "color": "#A855F7",
      "instances": [1, 2, 3, 4, 5],
      "created": "2024-11-20",
      "monthlyCost": 245.50,
      "vpc": "vpc-prod-main",
      "platform": "aws",
      "region": "us-east-1",
      "lastModified": "2024-11-24T14:32:00Z",
      "tags": ["production", "web", "critical"],
      "costMonthToDate": 187.23,
      "costLifetime": 1842.50,
      "costLimit": 500.00,
      "uptimeDays": 15
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 1,
    "totalItems": 4
  }
}
```

### Get Project
```
GET /api/projects/:id
```

**Response:** Single project object

### Create Project
```
POST /api/projects
```

**Request Body:**
```json
{
  "name": "my-new-project",
  "description": "Project description",
  "platform": "aws",
  "region": "us-east-1",
  "vpc": "vpc-12345",
  "color": "#A855F7",
  "tags": ["production"],
  "costLimit": 1000.00
}
```

**Response:** Created project object

### Update Project
```
PUT /api/projects/:id
```

**Request Body:** Partial project object (only fields to update)

**Response:** Updated project object

### Delete Project
```
DELETE /api/projects/:id
```

**Response:** 
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Get Project Instances
```
GET /api/projects/:id/instances
```

**Response:** Array of instance objects

---

## 2. Instances API

### List Instances
```
GET /api/instances?page=1&pageSize=50&search=web&projectId=1
```

**Query Parameters:**
- Same as projects, plus:
- `projectId` (optional): Filter by project
- `status` (optional): Filter by status

### Get Instance
```
GET /api/instances/:id
```

### Create Instance
```
POST /api/instances
```

**Request Body:**
```json
{
  "name": "web-server-01",
  "projectId": 1,
  "instanceType": "t3.medium",
  "platform": "aws",
  "region": "us-east-1",
  "storage": 30,
  "securityConfigId": 1,
  "sshKey": "my-keypair",
  "publicIp": true,
  "tags": ["web", "production"]
}
```

### Update Instance
```
PUT /api/instances/:id
```

### Delete Instance
```
DELETE /api/instances/:id
```

### Instance Actions

#### Start Instance
```
POST /api/instances/:id/start
```

#### Stop Instance
```
POST /api/instances/:id/stop
```

#### Restart Instance
```
POST /api/instances/:id/restart
```

#### Get SSH Config
```
GET /api/instances/:id/ssh
```

**Response:**
```json
{
  "success": true,
  "data": {
    "command": "ssh -i ~/.ssh/my-key.pem ec2-user@1.2.3.4",
    "config": "Host my-instance\n  HostName 1.2.3.4\n  User ec2-user\n  IdentityFile ~/.ssh/my-key.pem"
  }
}
```

---

## 3. Blueprints API

### List Blueprints
```
GET /api/blueprints?category=web&search=ml
```

**Query Parameters:**
- Standard pagination/search
- `category`: Filter by category (web, compute, database, storage, development)

### Get Blueprint
```
GET /api/blueprints/:id
```

### Create Blueprint
```
POST /api/blueprints
```

**Request Body:**
```json
{
  "name": "ML Training Cluster",
  "description": "GPU-accelerated training environment",
  "useCase": "Machine Learning",
  "category": "compute",
  "platform": "aws",
  "region": "us-west-2",
  "instanceType": "p3.8xlarge",
  "storage": 500,
  "workloadType": "gpu",
  "securityConfigId": 1,
  "tags": ["ml", "gpu"]
}
```

### Update Blueprint
```
PUT /api/blueprints/:id
```

### Delete Blueprint
```
DELETE /api/blueprints/:id
```

### Deploy Blueprint
```
POST /api/blueprints/:id/deploy
```

**Request Body:**
```json
{
  "projectId": 1
}
```

**Response:** Created instance object

---

## 4. Security Configurations API

### List Security Configs
```
GET /api/security-configs
```

### Get Security Config
```
GET /api/security-configs/:id
```

### Create Security Config
```
POST /api/security-configs
```

**Request Body:**
```json
{
  "name": "Production Config",
  "description": "Security settings for production",
  "keyPair": "prod-keypair",
  "certType": "acm",
  "securityGroups": ["web-sg", "db-sg"],
  "iamRole": "ec2-production-role",
  "network": {
    "useDefaultVpc": false,
    "customCidr": "10.0.0.0/16",
    "isolation": "hybrid"
  },
  "loadBalancer": true,
  "publicIp": true,
  "inboundPorts": [
    { "port": 80, "protocol": "TCP", "description": "HTTP" },
    { "port": 443, "protocol": "TCP", "description": "HTTPS" }
  ],
  "outboundRules": "Allow all",
  "storageAccess": {
    "s3": true,
    "description": "Read/Write to app bucket"
  },
  "tags": ["production", "secure"]
}
```

### Update Security Config
```
PUT /api/security-configs/:id
```

### Delete Security Config
```
DELETE /api/security-configs/:id
```

---

## 5. Images API

### List Images
```
GET /api/images?platform=aws&region=us-east-1
```

### Get Image
```
GET /api/images/:id
```

### Create Image
```
POST /api/images
```

**Request Body:**
```json
{
  "name": "my-custom-image",
  "description": "Custom ML environment",
  "platform": "aws",
  "region": "us-east-1",
  "sourceInstanceId": 123,
  "tags": ["ml", "custom"]
}
```

### Create Image from Instance
```
POST /api/images/from-instance
```

**Request Body:**
```json
{
  "instanceId": 123,
  "name": "my-image",
  "description": "Created from instance"
}
```

### Delete Image
```
DELETE /api/images/:id
```

---

## 6. Accounts API

### List Accounts
```
GET /api/accounts
```

### Get Account
```
GET /api/accounts/:id
```

### Create Account
```
POST /api/accounts
```

**Request Body:**
```json
{
  "name": "AWS Production",
  "platform": "aws",
  "accountId": "123456789012",
  "region": "us-east-1",
  "accessKey": "AKIA...",
  "secretKey": "secret...",
  "isDefault": true
}
```

### Update Account
```
PUT /api/accounts/:id
```

### Delete Account
```
DELETE /api/accounts/:id
```

### Test Connection
```
POST /api/accounts/:id/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected"
  }
}
```

### Sync Account
```
POST /api/accounts/:id/sync
```

**Response:**
```json
{
  "success": true,
  "data": {
    "synced": 42
  }
}
```

---

## 7. Cost Management API

### Get Cost Summary
```
GET /api/costs/summary?startDate=2024-11-01&endDate=2024-11-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentMonth": 1245.50,
    "lastMonth": 1189.32,
    "projectedMonth": 1450.00,
    "byService": [
      { "service": "EC2", "cost": 850.00, "percentage": 68.2 },
      { "service": "S3", "cost": 245.50, "percentage": 19.7 },
      { "service": "RDS", "cost": 150.00, "percentage": 12.1 }
    ],
    "dailyData": [
      {
        "date": "2024-11-01",
        "compute": 28.50,
        "storage": 8.20,
        "network": 3.50,
        "other": 1.20
      }
    ]
  }
}
```

### List Budget Alerts
```
GET /api/costs/budget-alerts
```

### Create Budget Alert
```
POST /api/costs/budget-alerts
```

**Request Body:**
```json
{
  "name": "Monthly Budget Alert",
  "threshold": 1000.00,
  "period": "monthly"
}
```

### Update Budget Alert
```
PUT /api/costs/budget-alerts/:id
```

### Delete Budget Alert
```
DELETE /api/costs/budget-alerts/:id
```

---

## 8. Learning API

### List Modules
```
GET /api/learning/modules
```

### Get Module
```
GET /api/learning/modules/:id
```

### Update Progress
```
PUT /api/learning/modules/:id/progress
```

**Request Body:**
```json
{
  "progress": 75
}
```

### Complete Module
```
POST /api/learning/modules/:id/complete
```

---

## CLI Commands Reference

The backend CLI should support these commands for direct terminal usage:

### Project Management
```bash
pocket-architect projects list
pocket-architect projects create --name my-project --platform aws --region us-east-1
pocket-architect projects show 1
pocket-architect projects update 1 --description "New description"
pocket-architect projects delete 1
```

### Instance Management
```bash
pocket-architect instances list
pocket-architect instances create --name web-01 --project 1 --type t3.medium
pocket-architect instances start 1
pocket-architect instances stop 1
pocket-architect instances ssh 1
pocket-architect instances delete 1
```

### Blueprint Management
```bash
pocket-architect blueprints list
pocket-architect blueprints create --name "My Blueprint" --type compute
pocket-architect blueprints deploy 1 --project 2
pocket-architect blueprints delete 1
```

### Security Management
```bash
pocket-architect security list
pocket-architect security create --name "Prod Config" --keypair prod-key
pocket-architect security show 1
pocket-architect security delete 1
```

### Account Management
```bash
pocket-architect accounts list
pocket-architect accounts add --name "AWS Prod" --platform aws --key AKIA...
pocket-architect accounts test 1
pocket-architect accounts sync 1
pocket-architect accounts delete 1
```

### Cost Management
```bash
pocket-architect costs summary
pocket-architect costs by-service
pocket-architect costs alerts list
pocket-architect costs alerts create --threshold 1000 --period monthly
```

---

## Error Codes

| HTTP Code | Description |
|-----------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Cloud provider API error |

---

## Database Schema (SQLite)

### projects
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL,
  color TEXT NOT NULL,
  vpc TEXT,
  platform TEXT NOT NULL,
  region TEXT NOT NULL,
  cost_limit REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### instances
```sql
CREATE TABLE instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  instance_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT NOT NULL,
  public_ip TEXT,
  private_ip TEXT,
  storage INTEGER NOT NULL,
  security_config_id INTEGER,
  ssh_key TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (security_config_id) REFERENCES security_configs(id)
);
```

### blueprints
```sql
CREATE TABLE blueprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  use_case TEXT,
  category TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT NOT NULL,
  instance_type TEXT NOT NULL,
  storage INTEGER NOT NULL,
  workload_type TEXT NOT NULL,
  security_config_id INTEGER,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (security_config_id) REFERENCES security_configs(id)
);
```

### security_configs
```sql
CREATE TABLE security_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL,
  key_pair TEXT NOT NULL,
  cert_type TEXT NOT NULL,
  iam_role TEXT,
  network_config TEXT, -- JSON
  load_balancer BOOLEAN DEFAULT 0,
  public_ip BOOLEAN DEFAULT 1,
  inbound_ports TEXT, -- JSON
  outbound_rules TEXT,
  storage_access TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### images
```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  image_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT NOT NULL,
  os TEXT NOT NULL,
  architecture TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL,
  public BOOLEAN DEFAULT 0,
  source_instance_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_instance_id) REFERENCES instances(id)
);
```

### accounts
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  region TEXT NOT NULL,
  access_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  status TEXT NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_synced TIMESTAMP
);
```

---

## Testing

Use this curl command to test the API:

```bash
# List projects
curl http://localhost:8000/api/projects

# Create project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"test-project","platform":"aws","region":"us-east-1"}'

# Get project
curl http://localhost:8000/api/projects/1

# Update project
curl -X PUT http://localhost:8000/api/projects/1 \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'

# Delete project
curl -X DELETE http://localhost:8000/api/projects/1
```

---

## Implementation Notes

1. **Authentication**: Optional for single-user mode, required for multi-user
2. **Rate Limiting**: Implement rate limiting for cloud provider API calls
3. **Caching**: Cache cloud provider data to reduce API calls
4. **Async Operations**: Long-running operations (instance creation) should be async
5. **Logging**: Comprehensive logging for debugging and auditing
6. **Validation**: Validate all inputs before processing
7. **Error Handling**: Graceful error handling with meaningful messages

---

## Environment Variables

```bash
# API Configuration
POCKET_ARCHITECT_API_HOST=localhost
POCKET_ARCHITECT_API_PORT=8000
POCKET_ARCHITECT_DB_PATH=~/.pocket-architect/db.sqlite

# AWS Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1

# GCP Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Azure Configuration
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
```

---

## Next Steps

1. Set up FastAPI project structure
2. Implement database models and migrations
3. Create API endpoints following this specification
4. Implement CLI commands using Click/Typer
5. Add cloud provider integrations (boto3 for AWS, etc.)
6. Write unit and integration tests
7. Create deployment documentation

---

For questions or clarifications, refer to:
- `/types/models.ts` - TypeScript type definitions
- `/services/api.ts` - Frontend API client implementation
- `/data/` - Mock data examples
