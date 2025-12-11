# Pocket Architect

A modern desktop GUI application for managing isolated AWS/GCP/Azure environments with a beautiful dark theme featuring purple neon accents.

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Ready-green)
![License](https://img.shields.io/badge/license-Educational-orange)

---

## 🎯 Overview

Pocket Architect is a comprehensive infrastructure management application designed for managing cloud resources across AWS, GCP, and Azure. It features a unified component architecture, progressive disclosure UX, and a striking neonish purple aesthetic.

### Key Features

- ✨ **Multi-Platform Support**: AWS, GCP, and Azure integration
- 🎨 **Modern Dark Theme**: Purple accents with customizable neon glow effects
- 📊 **Comprehensive Dashboard**: Real-time resource monitoring and cost tracking
- 🔐 **Security First**: WCAG-compliant accessibility and secure credential management
- 🎭 **Unified Architecture**: Consistent components, wizards, and dialogs throughout
- 🌍 **Multi-Region**: Support for 30+ AWS, 35+ GCP, and 60+ Azure regions
- 🎨 **Theme Creator**: Build custom themes with guided wizard or JSON config
- 📚 **Learning Center**: 21 comprehensive modules with progress tracking

---

## 📸 Screenshots

> Dark theme with purple neon aesthetic, operational status badges, and unified component architecture

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** with npm or yarn
- **Python 3.9+** (for backend CLI)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Frontend Setup

```bash
# Clone the repository
git clone <repository-url>
cd pocket-architect

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup (Optional)

See [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md) for complete backend CLI setup instructions.

```bash
# Quick backend setup
mkdir pocket-architect-backend
cd pocket-architect-backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy pydantic python-dotenv boto3

# Create .env from example
cp ../pocket-architect-frontend/.env.example .env

# Start server
uvicorn main:app --reload --port 8000
```

---

## 📦 Project Structure

```
pocket-architect/
├── App.tsx                          # Main application entry
├── components/
│   ├── Dashboard.tsx                # Dashboard with metrics and charts
│   ├── Projects_refactored.tsx      # Project management
│   ├── Instances_refactored.tsx     # Instance management
│   ├── Blueprints_refactored.tsx    # Blueprint templates
│   ├── Security_refactored.tsx      # Security configurations
│   ├── Images_refactored.tsx        # Custom AMI/image management
│   ├── Accounts.tsx                 # Cloud account connections
│   ├── CostManagement.tsx           # Cost tracking and budgets
│   ├── Learning.tsx                 # Learning center (21 modules)
│   ├── Settings.tsx                 # Theme and preferences
│   ├── Sidebar.tsx                  # Navigation sidebar
│   ├── ThemeCreatorWizard.tsx       # Custom theme builder
│   └── ui/                          # Reusable UI components
│       ├── action-bar.tsx           # Unified action bar
│       ├── creation-wizard.tsx      # Multi-step wizard framework
│       ├── details-dialog.tsx       # Detail view framework
│       ├── data-table.tsx           # Standardized table
│       ├── page-header.tsx          # Page header component
│       ├── status-badge.tsx         # Neon status badges
│       └── ...                      # 40+ shadcn/ui components
├── config/
│   └── themes.ts                    # Theme configuration system
├── contexts/
│   └── NeonContext.tsx              # Neon glow intensity control
├── data/
│   ├── regions.ts                   # Multi-platform region data
│   └── securityConfigs.ts           # Security presets
├── hooks/
│   ├── useDataFilters.ts            # Data filtering and search
│   ├── useWizard.ts                 # Wizard state management
│   ├── useDialog.ts                 # Dialog state management
│   └── useCopyToClipboard.ts        # Clipboard functionality
├── lib/
│   └── theme-factory.ts             # Centralized styling system
├── services/
│   └── api.ts                       # Backend API client
├── types/
│   └── models.ts                    # TypeScript type definitions
├── styles/
│   └── globals.css                  # Global styles and CSS variables
├── .env.example                     # Environment configuration template
├── BACKEND_API_SPEC.md              # Complete API specification
├── BACKEND_SETUP_GUIDE.md           # Backend setup instructions
└── BACKEND_CONNECTION_STATUS.md     # Integration status and guide
```

---

## 🎨 Architecture

### Unified Component Framework

All pages follow a consistent architecture:

1. **Page Header** - Title with refresh button
2. **Action Bar** - Icon-only buttons (plus, pen, trashcan)
3. **Search & Filter** - Search bar and filter dropdown
4. **Data Display** - Selectable cards or tables
5. **Details Dialog** - Comprehensive detail views
6. **Creation Wizard** - Multi-step creation flows

### Theme System

- **7 Built-in Themes**: Pocket Dark, Midnight Purple, Ocean Deep, Forest Night, Ruby Dark, Amber Dusk, Steel Gray
- **Custom Themes**: Create with wizard or JSON config
- **Theme Factory**: Single source of truth for all styling
- **Neon Effects**: Adjustable glow intensity (0-200%)

### Design Principles

- ✅ **Clarity**: Clear information hierarchy and typography
- ✅ **Efficiency**: Keyboard shortcuts and quick actions
- ✅ **Safety**: Confirmation for destructive actions
- ✅ **Progressive Disclosure**: Show details on demand
- ✅ **Consistency**: Unified patterns across all pages
- ✅ **Accessibility**: WCAG 2.1 AA compliant

---

## 🔌 Backend Integration

### API Client

The frontend includes a complete API client ready for backend integration:

```typescript
import api from '@/services/api';

// List projects
const response = await api.projects.list({ page: 1, pageSize: 50 });

// Create instance
const instance = await api.instances.create({
  name: 'web-server-01',
  projectId: 1,
  instanceType: 't3.medium',
  region: 'us-east-1'
});

// Start instance
await api.instances.start(instanceId);
```

### Environment Configuration

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_API_DEBUG=false
```

### Documentation

- **API Specification**: [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) - All 8 resource APIs documented
- **Setup Guide**: [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md) - Step-by-step backend setup
- **Connection Status**: [BACKEND_CONNECTION_STATUS.md](./BACKEND_CONNECTION_STATUS.md) - Integration guide

---

## 🎯 Features

### Dashboard
- Real-time metrics (projects, instances, blueprints, images)
- Cost tracking with month-over-month comparison
- Platform distribution visualization
- Region breakdown charts
- Resource status overview
- Operational status badges with neon effects

### Projects
- Create, edit, delete projects
- 3-step creation wizard
- Cost tracking and budgets
- Instance management
- Tag-based organization
- Multi-platform support

### Instances
- Launch instances from blueprints
- Start, stop, restart controls
- SSH configuration
- Resource monitoring
- Security group assignment
- Cost estimation

### Blueprints
- 24 pre-configured templates
- 5 categories (Web, Compute, Database, Storage, Development)
- Custom blueprint creation (4-step wizard)
- Blueprint deployment
- Usage tracking

### Security Configurations
- Network isolation settings
- Inbound port rules
- Load balancer configuration
- IAM role assignment
- Storage access policies
- 5-step creation wizard

### Images
- Custom AMI management
- Create from instances
- Multi-region support
- Size and cost tracking
- Public/private visibility

### Accounts
- Multi-platform account management
- Connection testing
- Resource synchronization
- Credential storage
- Default account selection

### Cost Management
- Real-time cost tracking
- Budget alerts
- Cost by service breakdown
- Monthly projections
- Project cost limits
- Visual cost trends

### Learning Center
- 21 comprehensive modules
- 3 skill levels (Beginner, Intermediate, Advanced)
- Progress tracking
- Code examples
- Best practices
- Estimated completion times

### Settings
- Theme selection (7 built-in + custom)
- Theme creator wizard
- Neon glow intensity control
- Font family selection
- Text size adjustment
- Auto-refresh configuration
- About information

---

## 🛠 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Tech Stack

- **Framework**: React 18
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **UI Components**: shadcn/ui (40+ components)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build Tool**: Vite
- **State Management**: React hooks
- **Backend**: FastAPI (ready for integration)

### Custom Hooks

- `useDataFilters` - Combined search and filter for data tables
- `useWizard` - Multi-step wizard state management
- `useDialog` - Dialog open/close with data handling
- `useCopyToClipboard` - Clipboard functionality with toasts

### Component Library

All UI components built from shadcn/ui foundation:
- Forms, inputs, selects, checkboxes, switches
- Buttons, badges, cards, dialogs
- Tables, pagination, tabs
- Tooltips, popovers, dropdowns
- Charts, progress bars, sliders
- And more...

---

## 📚 Documentation

### For Developers

- [FRAMEWORK_ARCHITECTURE.md](./FRAMEWORK_ARCHITECTURE.md) - Architecture overview
- [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) - Complete API reference
- [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md) - Backend setup
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Implementation details
- [CODEBASE_CLEANUP_REPORT.md](./CODEBASE_CLEANUP_REPORT.md) - Code quality report

### For Backend Developers

- [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) - All endpoints with request/response examples
- [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md) - FastAPI setup and configuration
- [BACKEND_CONNECTION_STATUS.md](./BACKEND_CONNECTION_STATUS.md) - Integration checklist

### Type Definitions

All types are defined in `/types/models.ts`:
- Project, Instance, Blueprint, SecurityConfig, Image, Account
- Request/Response types for all operations
- Platform, Status, and other enums

---

## 🎨 Customization

### Creating Custom Themes

Two methods available:

**1. Guided Wizard** (5 steps)
- Step 1: Choose creation mode
- Step 2: Enter theme name
- Step 3: Configure background & surface colors
- Step 4: Configure accent colors
- Step 5: Configure border & destructive colors

**2. Raw JSON Configuration**
```json
{
  "name": "my-custom-theme",
  "label": "My Custom Theme",
  "colors": {
    "background": "#0A0A0A",
    "foreground": "#E5E7EB",
    "primary": "#A78BFA",
    ...
  }
}
```

### Adjusting Neon Intensity

Settings → Neon Glow Intensity slider (0-200%)

---

## 🔒 Security

- ❌ **Never commit** `.env` files or credentials
- ✅ **Use environment variables** for all sensitive data
- ✅ **Rotate credentials** every 90 days
- ✅ **Enable MFA** on cloud accounts
- ✅ **Use IAM roles** when possible
- ✅ **Validate all inputs** on backend

**Note**: This application is designed for educational purposes and not for collecting PII or storing sensitive production data.

---

## 🚧 Current Status

### ✅ Completed

- Frontend architecture and components
- Theme system with 7 built-in themes
- Custom theme creator
- All UI pages and features
- API client implementation
- TypeScript type system
- Comprehensive documentation
- Environment configuration

### ⏳ Pending

- Backend CLI implementation
- Cloud provider SDK integration
- Database persistence
- Authentication system
- Production deployment

---

## 🤝 Contributing

This is an educational project. For production use:

1. Implement backend following `BACKEND_API_SPEC.md`
2. Add authentication and authorization
3. Implement proper error handling
4. Add comprehensive testing
5. Set up CI/CD pipelines
6. Configure production environment

---

## 📝 License

Educational purposes only. Not licensed for production use without proper security review and hardening.

---

## 🙋 Support

### Documentation
- Check `/BACKEND_SETUP_GUIDE.md` for backend setup
- Review `/BACKEND_API_SPEC.md` for API details
- See `/BACKEND_CONNECTION_STATUS.md` for integration status

### Troubleshooting
- Ensure Node.js 18+ is installed
- Check `.env` configuration
- Verify backend is running at correct URL
- Review browser console for errors
- Check backend logs for API errors

---

## 📊 Project Stats

- **Components**: 50+ React components
- **UI Library**: 40+ shadcn/ui components
- **API Endpoints**: 40+ endpoints across 8 resources
- **Regions**: 125+ total (AWS + GCP + Azure)
- **Learning Modules**: 21 comprehensive modules
- **Built-in Themes**: 7 themes
- **Documentation**: 2000+ lines

---

## 🎯 Next Steps

1. ✅ Review documentation
2. ✅ Configure environment
3. ✅ Start frontend dev server
4. ⏳ Implement backend CLI (see guides)
5. ⏳ Test integration
6. ⏳ Deploy to production

**Frontend is 100% complete and ready for backend integration!**

---

Made with 💜 and ⚡ by the Pocket Architect team
