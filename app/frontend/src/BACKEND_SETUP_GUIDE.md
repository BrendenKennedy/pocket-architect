# Pocket Architect - Backend CLI Setup Guide

## Overview

This guide provides step-by-step instructions for setting up and connecting the Pocket Architect backend CLI to the frontend application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Backend CLI Installation](#backend-cli-installation)
5. [Starting the API Server](#starting-the-api-server)
6. [Connecting the Frontend](#connecting-the-frontend)
7. [Testing the Connection](#testing-the-connection)
8. [Troubleshooting](#troubleshooting)
9. [Development Workflow](#development-workflow)

---

## Prerequisites

### Backend Requirements
- **Python 3.9+** (for FastAPI backend)
- **pip** or **poetry** (Python package manager)
- **SQLite3** (included with Python)
- **Cloud Provider CLIs** (optional):
  - AWS CLI (`aws`)
  - GCP CLI (`gcloud`)
  - Azure CLI (`az`)

### Frontend Requirements
- **Node.js 18+**
- **npm** or **yarn**

---

## Quick Start

### 1. Clone/Create Backend Project

```bash
# Create backend directory
mkdir pocket-architect-backend
cd pocket-architect-backend

# Initialize Python project
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic python-dotenv click boto3
```

### 2. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

### 3. Start the Backend Server

```bash
# From the backend directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start the Frontend

```bash
# From the frontend directory
npm run dev
```

The frontend will connect to `http://localhost:8000/api` by default.

---

## Environment Configuration

### Frontend Configuration

Create a `.env` file in the frontend root directory:

```bash
# .env (Frontend)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_APP_ENV=development
```

### Backend Configuration

Create a `.env` file in the backend root directory:

```bash
# .env (Backend)
POCKET_ARCHITECT_API_HOST=0.0.0.0
POCKET_ARCHITECT_API_PORT=8000
POCKET_ARCHITECT_DB_PATH=~/.pocket-architect/db.sqlite
POCKET_ARCHITECT_CORS_ENABLED=true
POCKET_ARCHITECT_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Cloud Provider Credentials
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1
```

**Security Note:** Never commit `.env` files to version control. The `.env.example` file provides a template.

---

## Backend CLI Installation

### Recommended Backend Structure

```
pocket-architect-backend/
├── main.py                 # FastAPI application entry point
├── cli.py                  # Click/Typer CLI commands
├── models.py               # Database models (SQLAlchemy)
├── schemas.py              # Pydantic validation schemas
├── database.py             # Database connection
├── routes/
│   ├── __init__.py
│   ├── projects.py         # Project endpoints
│   ├── instances.py        # Instance endpoints
│   ├── blueprints.py       # Blueprint endpoints
│   ├── security.py         # Security config endpoints
│   ├── images.py           # Image endpoints
│   ├── accounts.py         # Account endpoints
│   ├── costs.py            # Cost management endpoints
│   └── learning.py         # Learning endpoints
├── providers/
│   ├── __init__.py
│   ├── aws.py              # AWS SDK integration
│   ├── gcp.py              # GCP SDK integration
│   └── azure.py            # Azure SDK integration
├── utils/
│   ├── __init__.py
│   ├── auth.py             # Authentication helpers
│   └── validation.py       # Custom validators
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (gitignored)
└── README.md               # Backend documentation
```

### Key Dependencies

```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-dotenv==1.0.0
click==8.1.7
boto3==1.29.0              # AWS SDK
google-cloud-compute==1.14.1  # GCP SDK
azure-mgmt-compute==30.4.0    # Azure SDK
python-jose[cryptography]==3.3.0  # JWT tokens
passlib[bcrypt]==1.7.4     # Password hashing
```

---

## Starting the API Server

### Development Mode (Auto-reload)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Using the CLI Wrapper

```bash
# Create a CLI entry point
python cli.py serve --host 0.0.0.0 --port 8000
```

### Verify Server is Running

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "version": "1.0.0"}
```

---

## Connecting the Frontend

### 1. Configure API Client

The frontend automatically reads the API URL from environment variables:

```typescript
// services/api.ts
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
```

### 2. Update .env if Needed

If your backend runs on a different host/port:

```bash
# Frontend .env
VITE_API_BASE_URL=http://192.168.1.100:8000/api
```

### 3. Enable CORS on Backend

Ensure your backend allows requests from the frontend origin:

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Testing the Connection

### 1. Test API Endpoints

```bash
# List projects
curl http://localhost:8000/api/projects

# Create a test project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-project",
    "description": "Test project from API",
    "platform": "aws",
    "region": "us-east-1",
    "vpc": "vpc-test",
    "color": "#A855F7",
    "tags": ["test"]
  }'
```

### 2. Test from Frontend

The frontend includes mock data fallbacks. To test real API integration:

1. Open browser DevTools (F12)
2. Navigate to Network tab
3. Perform an action (e.g., create project)
4. Check for API requests to `http://localhost:8000/api/*`

### 3. Check API Logs

Backend server logs will show incoming requests:

```
INFO:     127.0.0.1:54321 - "GET /api/projects HTTP/1.1" 200 OK
INFO:     127.0.0.1:54322 - "POST /api/projects HTTP/1.1" 201 Created
```

---

## Troubleshooting

### Issue: Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in browser console
- "ERR_CONNECTION_REFUSED"

**Solutions:**
1. Verify backend server is running: `curl http://localhost:8000/health`
2. Check CORS configuration in backend
3. Verify `VITE_API_BASE_URL` in frontend `.env`
4. Check firewall settings

### Issue: CORS Errors

**Symptoms:**
- "Access to fetch blocked by CORS policy"

**Solutions:**
1. Add frontend origin to backend CORS settings:
   ```python
   allow_origins=["http://localhost:5173"]
   ```
2. Restart backend server after CORS changes
3. Clear browser cache

### Issue: 404 Not Found

**Symptoms:**
- API endpoints return 404

**Solutions:**
1. Verify endpoint URL matches spec: `/api/projects` not `/projects`
2. Check backend route registration
3. Review backend logs for route errors

### Issue: Database Errors

**Symptoms:**
- "Table doesn't exist" errors

**Solutions:**
1. Run database migrations:
   ```bash
   python cli.py db migrate
   ```
2. Initialize database:
   ```bash
   python cli.py db init
   ```
3. Check database path in `.env`

### Issue: Cloud Provider Authentication

**Symptoms:**
- "Invalid credentials" when accessing AWS/GCP/Azure

**Solutions:**
1. Verify credentials in `.env`
2. Test credentials directly:
   ```bash
   aws sts get-caller-identity
   ```
3. Check IAM permissions
4. Verify credential file paths

---

## Development Workflow

### Running Frontend + Backend Together

#### Option 1: Separate Terminals

```bash
# Terminal 1 - Backend
cd pocket-architect-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd pocket-architect-frontend
npm run dev
```

#### Option 2: Process Manager (tmux/screen)

```bash
# Create tmux session
tmux new -s pocket-architect

# Split panes
Ctrl+B "    # Split horizontally

# In pane 1: Backend
cd pocket-architect-backend && uvicorn main:app --reload

# In pane 2: Frontend
cd pocket-architect-frontend && npm run dev
```

#### Option 3: Docker Compose (Recommended for Production)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - POCKET_ARCHITECT_DB_PATH=/data/db.sqlite
    volumes:
      - ./data:/data
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://backend:8000/api
    depends_on:
      - backend
```

### CLI Usage During Development

```bash
# Create project via CLI
pocket-architect projects create \
  --name dev-project \
  --platform aws \
  --region us-east-1

# List instances
pocket-architect instances list --project 1

# Start instance
pocket-architect instances start 5

# SSH into instance
pocket-architect instances ssh 5

# View costs
pocket-architect costs summary --month 2024-11
```

### API Development Workflow

1. **Define endpoint in spec** (`BACKEND_API_SPEC.md`)
2. **Create route handler** (e.g., `routes/projects.py`)
3. **Add database model** (if needed)
4. **Test with curl/Postman**
5. **Update frontend API client** (if needed)
6. **Test from frontend UI**

---

## Database Initialization

### Create Database

```bash
# CLI command
pocket-architect db init

# Or Python script
python -c "from database import init_db; init_db()"
```

### Run Migrations

```bash
# If using Alembic
alembic upgrade head
```

### Seed Sample Data

```bash
# CLI command
pocket-architect db seed

# Or load from JSON
pocket-architect db load-fixtures fixtures/sample-data.json
```

---

## API Documentation

### Access Interactive API Docs

Once the backend server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide interactive API documentation with "Try it out" functionality.

---

## Security Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore
.env
*.key
*.pem
credentials.json
```

### 2. Use Environment Variables

```python
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("POCKET_ARCHITECT_SECRET_KEY")
```

### 3. Rotate Credentials Regularly

- Rotate AWS access keys every 90 days
- Use IAM roles when possible
- Enable MFA for cloud accounts

### 4. Validate All Inputs

```python
from pydantic import BaseModel, validator

class CreateProjectRequest(BaseModel):
    name: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Name must be at least 3 characters')
        return v
```

---

## Performance Optimization

### 1. Enable Caching

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cloud_regions(platform: str):
    # Expensive API call
    return fetch_regions_from_cloud(platform)
```

### 2. Use Async Operations

```python
from fastapi import BackgroundTasks

async def create_instance_async(data: dict):
    # Long-running operation
    instance = await cloud_provider.create_instance(data)
    return instance

@app.post("/instances")
async def create_instance(
    data: CreateInstanceRequest,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(create_instance_async, data)
    return {"status": "creating", "task_id": "abc123"}
```

### 3. Database Connection Pooling

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)
```

---

## Monitoring and Logging

### Enable Structured Logging

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module
        })

handler = logging.FileHandler('app.log')
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
```

### Monitor API Performance

```python
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

---

## Next Steps

1. ✅ Review `/BACKEND_API_SPEC.md` for complete API reference
2. ✅ Set up backend project structure
3. ✅ Configure environment variables
4. ✅ Implement core API endpoints
5. ✅ Test with frontend
6. ✅ Add cloud provider integrations
7. ✅ Deploy to production

---

## Additional Resources

- **API Specification**: `/BACKEND_API_SPEC.md`
- **Type Definitions**: `/types/models.ts`
- **Frontend API Client**: `/services/api.ts`
- **Mock Data Examples**: `/data/`

---

## Support

For questions or issues:
1. Check this guide first
2. Review `BACKEND_API_SPEC.md`
3. Check troubleshooting section
4. Review backend server logs
5. Test endpoints with curl

**Backend is ready for development when:**
- ✅ Server responds at http://localhost:8000/health
- ✅ API docs accessible at http://localhost:8000/docs
- ✅ Database initialized successfully
- ✅ CORS configured for frontend origin
- ✅ Cloud provider credentials validated (optional)
