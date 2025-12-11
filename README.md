# Pocket Architect

A multi-cloud infrastructure management tool with both CLI and GUI interfaces. The GUI is a native desktop app built with PySide6 that embeds a React frontend and serves as a visual wrapper for the Python CLI.

## Project Structure

```
pocket-architect/
├── app/
│   ├── frontend/                          # React GUI (embedded in Qt)
│   │   ├── src/
│   │   │   ├── components/               # React components
│   │   │   ├── bridge/                   # Qt Web Channel bridge
│   │   │   │   ├── index.ts             # Bridge initialization
│   │   │   │   ├── types.ts             # Bridge type definitions
│   │   │   │   └── api.ts               # API adapter using bridge
│   │   │   ├── types/                    # TypeScript type definitions
│   │   │   └── ...
│   │   ├── vite.config.ts                # Vite configuration
│   │   └── package.json
│   │
│   └── backend/                           # Python CLI + GUI wrapper
│       └── pocket_architect/
│           ├── cli/                       # CLI implementation (Click)
│           │   ├── main.py               # CLI entry point
│           │   └── commands/             # Command groups
│           ├── gui/                       # Qt GUI wrapper
│           │   ├── main.py               # GUI entry point
│           │   ├── main_window.py        # QMainWindow with QWebEngineView
│           │   └── bridge.py             # Qt Web Channel bridge
│           ├── core/                      # Core business logic
│           │   ├── models.py             # Pydantic models
│           │   ├── manager.py            # Resource manager
│           │   └── ...
│           ├── providers/                 # Cloud provider implementations
│           │   ├── aws/                  # AWS SDK integration
│           │   ├── gcp/                  # GCP SDK integration
│           │   └── azure/                # Azure SDK integration
│           ├── services/                  # Service layer
│           └── resources/                 # Built frontend (gitignored)
│
├── scripts/                               # Build and utility scripts
│   ├── build.sh                          # Build both frontend and Python package
│   ├── dev.sh                            # Development mode
│   └── clean.sh                          # Clean build artifacts
│
├── pyproject.toml                        # Python project configuration
├── package.json                          # npm workspace configuration
└── README.md
```

## Architecture

- **Python CLI**: Command-line interface built with Click for managing AWS/GCP/Azure resources
- **Qt GUI Wrapper**: PySide6 desktop app that embeds the React frontend using QWebEngineView
- **React Frontend**: Modern UI built with React, TailwindCSS, and Radix UI
- **Qt Web Channel Bridge**: Seamless communication between React (JavaScript) and Python backend
- **Shared Core Logic**: All business logic in Python, accessible from both CLI and GUI

## Development

### Prerequisites

- **Python 3.11+** (for backend CLI and GUI)
- **Node.js 18+** (for React frontend)
- **pip** (Python package manager)
- **npm** (Node package manager)

### Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Python dependencies
pip install -e ".[dev]"
```

### Run Development Mode

The easiest way to develop is using the dev script, which starts both the React dev server and the GUI:

```bash
./scripts/dev.sh
```

This will:
1. Start the React dev server at `http://localhost:3000` with hot reload
2. Launch the Qt GUI which loads from the dev server
3. Any changes to React code will hot reload automatically

**Alternative: Run components separately:**

```bash
# Terminal 1: Start React dev server
npm run dev:frontend

# Terminal 2: Run the GUI (loads from localhost:3000)
python -m pocket_architect gui

# Terminal 3: Test CLI commands
python -m pocket_architect project list
python -m pocket_architect --help
```

### Build for Production

```bash
# Build both frontend and Python package
./scripts/build.sh

# Or build separately:
npm run build:frontend          # Build React app
python -m build                  # Build Python wheel
```

After building, you'll have:
- Built React app in `app/backend/pocket_architect/resources/frontend/`
- Python wheel in `dist/pocket_architect-0.1.0-py3-none-any.whl`

### Clean Build Artifacts

```bash
./scripts/clean.sh
```

## Usage

### Installation

```bash
# Install from wheel (after building)
pip install dist/pocket_architect-0.1.0-py3-none-any.whl

# Or install in development mode
pip install -e .
```

### CLI Mode

```bash
# Show all commands
pocket-architect --help

# Project management
pocket-architect project list
pocket-architect project create --name "my-project" --platform aws --region us-east-1

# Instance management
pocket-architect instance list
pocket-architect instance create --name "web-server" --project-id 1 --instance-type t3.micro

# Launch GUI from CLI
pocket-architect gui
```

### GUI Mode

```bash
# Launch GUI directly
pocket-architect-gui

# Or via CLI
pocket-architect gui
```

## How It Works

### CLI → Python Communication

```
User runs: pocket-architect project list
       ↓
   cli/main.py (Click framework)
       ↓
   cli/commands/project.py
       ↓
   services/project_service.py
       ↓
   providers/aws/ec2.py (boto3)
       ↓
   AWS API
```

### GUI → Python Communication

```
React Component (user clicks "Create Project")
       ↓
   bridge/api.ts → bridge.create_project(data)
       ↓
   Qt Web Channel (JavaScript ↔ Python)
       ↓
   gui/bridge.py → BackendBridge.create_project (@Slot)
       ↓
   services/project_service.py
       ↓
   providers/aws/ec2.py (boto3)
       ↓
   AWS API
       ↓
   Python emits signal → React updates UI
```

## Project Features

- ✅ Multi-cloud support (AWS, GCP, Azure)
- ✅ CLI for command-line operations
- ✅ Native desktop GUI with embedded React
- ✅ Qt Web Channel bridge for seamless Python-JavaScript communication
- ✅ Type-safe models (Pydantic in Python, TypeScript in React)
- ✅ Hot reload in development mode
- ✅ Single-file distribution (Python wheel with embedded frontend)

## Development Tips

### Adding a New Feature

1. **Define the data model** in `app/backend/pocket_architect/core/models.py` (Pydantic)
2. **Mirror the type** in `app/frontend/src/types/models.ts` (TypeScript)
3. **Implement provider logic** in `app/backend/pocket_architect/providers/{aws,gcp,azure}/`
4. **Create service layer** in `app/backend/pocket_architect/services/`
5. **Add CLI command** in `app/backend/pocket_architect/cli/commands/`
6. **Add bridge method** in `app/backend/pocket_architect/gui/bridge.py` with `@Slot` decorator
7. **Add bridge type** in `app/frontend/src/bridge/types.ts`
8. **Add API method** in `app/frontend/src/bridge/api.ts`
9. **Create React component** in `app/frontend/src/components/`

### Testing the Bridge

```typescript
// In browser console (when running GUI)
const result = await window.backend.ping();
console.log(JSON.parse(result)); // { status: 'ok', message: 'Bridge is working!' }
```

### Debugging

- **Python logs**: Check stdout when running `python -m pocket_architect gui`
- **React logs**: Open DevTools in the Qt window (F12 if enabled)
- **Bridge errors**: Check both Python stdout and browser console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes (following the architecture above)
4. Test both CLI and GUI modes
5. Submit a pull request

## License

MIT
