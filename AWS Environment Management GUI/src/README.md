# Pocket Architect - PySide6 Desktop Application

A modern desktop GUI application for managing AWS environments, built with Python and PySide6.

## Features

- **Dashboard**: Overview with metrics, cost trends chart, resource usage chart, and recent projects
- **Projects**: Manage AWS projects with 3-step deployment wizard, start/stop/teardown controls
- **Blueprints**: Browse and create blueprints with 6-step creation wizard and detailed views
- **Snapshots**: Create and manage snapshots with bulk operations
- **Cost Management**: Visualize costs with charts, set project and global limits, track usage
- **Settings**: Configure theme, AWS region, credentials, auto-refresh, and view app info

## Design

- Dark theme (#0F0F0F) with purple accents (#8B5CF6)
- Fixed 260px sidebar navigation
- Modern card-based layouts
- Charts using QtCharts
- Custom styled components with QSS

## Requirements

- Python 3.8+
- PySide6
- PySide6-Addons (for QtCharts)

## Installation

1. Install Python dependencies:

```bash
pip install PySide6 PySide6-Addons
```

2. Run the application:

```bash
python main.py
```

## Project Structure

```
/
├── main.py                      # Application entry point
├── main_window.py               # Main window with navigation
├── sidebar.py                   # Sidebar navigation component
├── styles.qss                   # QSS stylesheet (dark theme)
├── pages/
│   ├── __init__.py
│   ├── dashboard.py             # Dashboard page with charts
│   ├── projects.py              # Projects management page
│   ├── blueprints.py            # Blueprints page with wizards
│   ├── snapshots.py             # Snapshots management page
│   ├── cost_management.py       # Cost tracking and limits
│   └── settings.py              # Settings and configuration
└── README.md
```

## Usage

### Navigation
- Use the sidebar to switch between different pages
- Click on menu items (File, View, Help) for additional options
- Status bar shows current connection status and AWS region

### Projects
- Click "Deploy" to start the 3-step wizard
- Select projects from the table and use action buttons
- View detailed status with the "Status" button

### Blueprints
- Search and filter blueprints by type
- Click "View Details" to see blueprint configuration with tabs
- Create custom blueprints with the 6-step wizard

### Snapshots
- Create snapshots of existing projects
- Select multiple snapshots for bulk deletion
- Each snapshot shows project, IDs, size, cost, and notes

### Cost Management
- View cost distribution pie chart and project comparison bar chart
- Set individual project cost limits with actions
- Configure global cost limit for all projects
- Color-coded usage indicators (green < 75%, yellow 75-100%, red > 100%)

### Settings
- Switch between Dark and Light themes
- Select default AWS region
- View credential connection status
- Configure auto-refresh interval (0 to disable)
- View application version and features

## Development Notes

### Styling
All styling is done through `styles.qss`. The stylesheet uses:
- Dark backgrounds (#0F0F0F, #1E1E1E)
- Purple primary color (#8B5CF6)
- Color-coded states (green for success, yellow for warnings, red for errors)
- Consistent border-radius (8px for buttons, 12px for cards)
- Custom hover states and transitions

### Charts
QtCharts is used for data visualization:
- Line/Area charts for cost trends
- Bar charts for resource usage and cost comparison
- Pie charts for cost distribution
- Custom colors matching the theme

### Dialogs and Wizards
- Multi-step wizards with progress bars
- Validation on form inputs
- Confirmation dialogs for destructive actions
- Tabbed dialogs for detailed views

## Future Enhancements

- Integrate with real AWS SDK (boto3)
- Implement actual data persistence
- Add authentication and user management
- Real-time cost tracking with AWS Cost Explorer API
- Export reports and configurations
- System tray integration
- Multi-region support with region switching

## License

This is a demonstration application created for educational purposes.
