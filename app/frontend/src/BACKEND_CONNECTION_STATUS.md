# Backend Connection Status & Integration Guide

## Current Status

### ✅ Frontend API Client
- **Location**: `/services/api.ts`
- **Status**: ✅ **READY**
- **Configuration**: Environment-based
- **Features**:
  - Complete API client implementation
  - All 8 resource endpoints configured
  - Environment variable support
  - Error handling and retry logic
  - TypeScript type safety

### ⏳ Backend CLI
- **Status**: **NOT IMPLEMENTED** (Ready for development)
- **Requirement**: FastAPI server implementation
- **Specification**: See `/BACKEND_API_SPEC.md`
- **Setup Guide**: See `/BACKEND_SETUP_GUIDE.md`

---

## Integration Checklist

### Phase 1: Environment Setup ✅

- [x] Create `.env.example` with all configuration options
- [x] Document environment variables in setup guide
- [x] Configure API client to read from environment
- [x] Add CORS documentation

### Phase 2: API Client Implementation ✅

- [x] Base API client with fetch wrapper
- [x] Projects API endpoints
- [x] Instances API endpoints
- [x] Blueprints API endpoints
- [x] Security Configurations API
- [x] Images API endpoints
- [x] Accounts API endpoints
- [x] Cost Management API
- [x] Learning API endpoints
- [x] Error handling
- [x] TypeScript types

### Phase 3: Backend CLI Development ⏳

- [ ] Set up FastAPI project structure
- [ ] Implement database models (SQLAlchemy)
- [ ] Create API routes for all endpoints
- [ ] Add cloud provider integrations
- [ ] Implement CLI commands (Click/Typer)
- [ ] Add authentication/authorization
- [ ] Configure CORS
- [ ] Add logging and monitoring

### Phase 4: Testing & Validation ⏳

- [ ] Test API endpoints with curl
- [ ] Verify CORS configuration
- [ ] Test frontend-backend integration
- [ ] Load testing
- [ ] Error scenario testing
- [ ] Security audit

---

## How Frontend Connects to Backend

### 1. Environment Configuration

Create `.env` file in frontend root:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_API_DEBUG=false
```

### 2. API Client Initialization

The API client automatically reads environment variables:

```typescript
// services/api.ts
const client = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  import.meta.env.VITE_API_DEBUG === 'true'
);
```

### 3. Usage in Components

```typescript
import api from '@/services/api';

// List projects
const response = await api.projects.list({
  page: 1,
  pageSize: 50,
  search: 'production'
});

if (response.success) {
  console.log('Projects:', response.data);
} else {
  console.error('Error:', response.error);
}
```

### 4. Mock Data Fallback

Currently, the app uses mock data defined in each component:
- `Projects_refactored.tsx` → `mockProjects`
- `Instances_refactored.tsx` → `mockInstances`
- `Blueprints_refactored.tsx` → `mockBlueprints`
- etc.

When backend is connected, replace mock data with API calls:

```typescript
// Before (Mock Data)
const [projects] = useState(mockProjects);

// After (Real API)
const [projects, setProjects] = useState([]);

useEffect(() => {
  const fetchProjects = async () => {
    const response = await api.projects.list();
    if (response.success && response.data) {
      setProjects(response.data.data);
    }
  };
  fetchProjects();
}, []);
```

---

## API Endpoints Reference

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/instances` - Get project instances

### Instances
- `GET /api/instances` - List all instances
- `GET /api/instances/:id` - Get single instance
- `POST /api/instances` - Create instance
- `PUT /api/instances/:id` - Update instance
- `DELETE /api/instances/:id` - Delete instance
- `POST /api/instances/:id/start` - Start instance
- `POST /api/instances/:id/stop` - Stop instance
- `POST /api/instances/:id/restart` - Restart instance
- `GET /api/instances/:id/ssh` - Get SSH config

### Blueprints
- `GET /api/blueprints` - List all blueprints
- `GET /api/blueprints/:id` - Get single blueprint
- `POST /api/blueprints` - Create blueprint
- `PUT /api/blueprints/:id` - Update blueprint
- `DELETE /api/blueprints/:id` - Delete blueprint
- `POST /api/blueprints/:id/deploy` - Deploy blueprint

### Security Configurations
- `GET /api/security-configs` - List all configs
- `GET /api/security-configs/:id` - Get single config
- `POST /api/security-configs` - Create config
- `PUT /api/security-configs/:id` - Update config
- `DELETE /api/security-configs/:id` - Delete config

### Images
- `GET /api/images` - List all images
- `GET /api/images/:id` - Get single image
- `POST /api/images` - Create image
- `POST /api/images/from-instance` - Create from instance
- `DELETE /api/images/:id` - Delete image

### Accounts
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/:id` - Get single account
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `POST /api/accounts/:id/test` - Test connection
- `POST /api/accounts/:id/sync` - Sync resources

### Costs
- `GET /api/costs/summary` - Get cost summary
- `GET /api/costs/budget-alerts` - List alerts
- `POST /api/costs/budget-alerts` - Create alert
- `PUT /api/costs/budget-alerts/:id` - Update alert
- `DELETE /api/costs/budget-alerts/:id` - Delete alert

### Learning
- `GET /api/learning/modules` - List all modules
- `GET /api/learning/modules/:id` - Get single module
- `PUT /api/learning/modules/:id/progress` - Update progress
- `POST /api/learning/modules/:id/complete` - Mark complete

---

## Testing Backend Connection

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### 2. Test Projects Endpoint

```bash
curl http://localhost:8000/api/projects
```

Expected response:
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 0,
    "totalItems": 0
  }
}
```

### 3. Test CORS

From browser console on `http://localhost:5173`:

```javascript
fetch('http://localhost:8000/api/projects')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

If CORS error occurs, ensure backend has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Test Create Operation

```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-project",
    "description": "Test from curl",
    "platform": "aws",
    "region": "us-east-1",
    "vpc": "vpc-test",
    "color": "#A855F7",
    "tags": ["test"]
  }'
```

---

## Environment Variables Reference

### Frontend (.env)

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_API_DEBUG=false

# Feature Flags
VITE_FEATURE_LEARNING=true
VITE_FEATURE_COST_MANAGEMENT=true
VITE_FEATURE_MULTI_PLATFORM=true

# Application
VITE_APP_ENV=development
```

### Backend (.env)

```bash
# Server Configuration
POCKET_ARCHITECT_API_HOST=0.0.0.0
POCKET_ARCHITECT_API_PORT=8000
POCKET_ARCHITECT_CORS_ENABLED=true
POCKET_ARCHITECT_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Database
POCKET_ARCHITECT_DB_PATH=~/.pocket-architect/db.sqlite

# Cloud Providers
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1

# Security
POCKET_ARCHITECT_SECRET_KEY=your_secret_key
POCKET_ARCHITECT_AUTH_REQUIRED=false

# Logging
POCKET_ARCHITECT_LOG_LEVEL=INFO
POCKET_ARCHITECT_LOG_FILE=~/.pocket-architect/logs/app.log
```

---

## Error Handling

### Frontend Error Handling

The API client returns a standardized response:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Usage:
```typescript
const response = await api.projects.create(data);

if (response.success) {
  toast.success('Project created!');
  // Handle success
} else {
  toast.error(response.error || 'Failed to create project');
  // Handle error
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ERR_CONNECTION_REFUSED` | Backend not running | Start backend server |
| `CORS error` | CORS not configured | Add frontend origin to CORS settings |
| `404 Not Found` | Wrong endpoint | Check endpoint URL matches spec |
| `500 Internal Server Error` | Backend error | Check backend logs |
| `Timeout` | Request too slow | Increase timeout or optimize backend |

---

## Development Workflow

### Recommended Setup

```bash
# Terminal 1 - Backend
cd pocket-architect-backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend  
cd pocket-architect-frontend
npm run dev

# Terminal 3 - Testing
curl http://localhost:8000/api/projects
```

### Hot Reload

- **Frontend**: Vite auto-reloads on file changes
- **Backend**: Uvicorn `--reload` flag auto-reloads on file changes

---

## Next Steps for Backend Development

### 1. Create Project Structure

```bash
mkdir pocket-architect-backend
cd pocket-architect-backend
python -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install fastapi uvicorn sqlalchemy pydantic python-dotenv click boto3
```

### 3. Create main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Pocket Architect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/projects")
async def list_projects():
    return {
        "success": True,
        "data": [],
        "pagination": {
            "page": 1,
            "pageSize": 50,
            "totalPages": 0,
            "totalItems": 0
        }
    }
```

### 4. Run Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Test Connection

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/projects
```

### 6. Implement Remaining Endpoints

Follow the specification in `/BACKEND_API_SPEC.md` to implement:
- Projects CRUD
- Instances CRUD + actions
- Blueprints CRUD + deploy
- Security configs CRUD
- Images CRUD
- Accounts CRUD + test/sync
- Costs summary + alerts
- Learning modules + progress

---

## Documentation Files

| File | Purpose |
|------|---------|
| `/BACKEND_API_SPEC.md` | Complete API specification with all endpoints |
| `/BACKEND_SETUP_GUIDE.md` | Step-by-step backend setup instructions |
| `/BACKEND_CONNECTION_STATUS.md` | This file - connection status and integration |
| `/.env.example` | Example environment configuration |
| `/services/api.ts` | Frontend API client implementation |
| `/types/models.ts` | TypeScript type definitions |

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend API Client | ✅ Complete | Ready for backend |
| Type Definitions | ✅ Complete | All models defined |
| API Specification | ✅ Complete | All endpoints documented |
| Setup Documentation | ✅ Complete | Step-by-step guides |
| Environment Config | ✅ Complete | `.env.example` provided |
| Backend Implementation | ⏳ Pending | Ready for development |
| Integration Testing | ⏳ Pending | Waiting for backend |

---

## Quick Reference

### Start Backend (when implemented)
```bash
cd pocket-architect-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Start Frontend
```bash
npm run dev
```

### Test Connection
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/projects
```

### Update API URL
```bash
# Frontend .env
VITE_API_BASE_URL=http://your-backend-url:port/api
```

---

**The frontend is fully prepared for backend integration. Once the FastAPI backend is implemented following the specification, the connection will work seamlessly.**
