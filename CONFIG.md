# Pocket Architect - Configuration System

This document explains the configuration persistence system that allows users to save and restore their app preferences.

## Overview

The configuration system stores all user preferences in browser localStorage under a single key: `pocket-architect-config`. This includes appearance settings, platform preferences, dashboard configurations, and UI state.

## Features

- **Automatic Persistence**: All settings are automatically saved to localStorage
- **Export/Import**: Users can export their config to a JSON file and import it later
- **Type-Safe**: Full TypeScript support with type checking
- **Versioned**: Config includes a version number for future migrations
- **Deep Merge**: Updates preserve existing settings when merging new values

## What Gets Persisted

### Appearance Settings
- Theme selection (pocket-dark, cyberpunk, etc.)
- Font family (system, Inter, Roboto, etc.)
- Text size (75-150%)
- Neon glow intensity (0-200%)

### Platform & Region Settings
- Selected cloud platform (AWS, GCP, Azure)
- Default region for each platform
- Last selected region

### UI State
- Last active page (dashboard, projects, etc.)
- Sidebar collapsed state (future)

### Dashboard Settings
- Selected quota categories to monitor
- Auto-refresh interval in seconds

### AWS Configuration
- Default AWS region

## Usage

### In Your Components

#### Loading Config

```typescript
import { loadConfig } from '../services';

function MyComponent() {
  const config = loadConfig();
  const theme = config.appearance.theme;
  const platform = config.platform.selected;
  // ...
}
```

#### Saving Individual Values

```typescript
import { configSetters } from '../services';

// Save theme
configSetters.setTheme('cyberpunk');

// Save font family
configSetters.setFontFamily('inter');

// Save platform
configSetters.setSelectedPlatform('aws');

// Save region
configSetters.setDefaultRegion('aws', 'us-west-2');
```

#### Updating Multiple Values

```typescript
import { updateConfig } from '../services';

updateConfig({
  appearance: {
    theme: 'cyberpunk',
    textSize: 110,
  },
  platform: {
    selected: 'gcp',
  },
});
```

### Export and Import

#### Export Config

Users can export their configuration from the Settings page by clicking the "Export Config" button. This downloads a JSON file with all their settings.

```typescript
import { exportConfig } from '../services';

const handleExport = () => {
  const configJson = exportConfig();
  // Download as file
};
```

#### Import Config

Users can import a previously exported configuration from the Settings page by clicking the "Import Config" button.

```typescript
import { importConfig } from '../services';

const handleImport = async (file) => {
  const text = await file.text();
  const imported = importConfig(text);
  // Reload page to apply all settings
  window.location.reload();
};
```

## File Structure

```
app/frontend/src/
├── types/
│   └── config.ts          # Config type definitions
├── services/
│   ├── configService.ts   # Config persistence logic
│   └── index.ts          # Re-exports config functions
└── components/
    ├── App.tsx           # Loads platform/region/page preferences
    ├── Settings.tsx       # UI for export/import and settings
    └── Dashboard.tsx      # Loads quota selections
```

## Config Structure

```typescript
interface AppConfig {
  version: string;

  appearance: {
    theme: string;
    fontFamily: string;
    textSize: number;
    neonIntensity: number;
  };

  platform: {
    selected: Platform;
    defaultRegion: Record<Platform, string>;
  };

  ui: {
    lastActivePage: Page;
    sidebarCollapsed: boolean;
  };

  dashboard: {
    quotaSelections: Record<string, string[]>;
    autoRefreshInterval: number;
  };

  aws: {
    defaultRegion: string;
  };

  lastModified: string;
}
```

## API Reference

### Core Functions

#### `loadConfig()`
Loads the complete configuration from localStorage.

**Returns:** `AppConfig`

```typescript
const config = loadConfig();
```

#### `saveConfig(config: AppConfig)`
Saves the complete configuration to localStorage.

**Parameters:**
- `config: AppConfig` - The full config object to save

```typescript
saveConfig(config);
```

#### `updateConfig(partial: PartialAppConfig)`
Updates the configuration with partial values using deep merge.

**Parameters:**
- `partial: PartialAppConfig` - Partial config to merge

**Returns:** `AppConfig` - The updated config

```typescript
const updated = updateConfig({
  appearance: {
    theme: 'cyberpunk'
  }
});
```

#### `getConfigValue<T>(path: string)`
Gets a specific config value by dot-notation path.

**Parameters:**
- `path: string` - Dot-notation path (e.g., "appearance.theme")

**Returns:** `T` - The value at that path

```typescript
const theme = getConfigValue<string>('appearance.theme');
const textSize = getConfigValue<number>('appearance.textSize');
```

#### `setConfigValue(path: string, value: any)`
Sets a specific config value by dot-notation path.

**Parameters:**
- `path: string` - Dot-notation path
- `value: any` - Value to set

```typescript
setConfigValue('appearance.theme', 'cyberpunk');
setConfigValue('appearance.textSize', 110);
```

#### `resetConfig()`
Resets configuration to defaults.

**Returns:** `AppConfig` - The default config

```typescript
const freshConfig = resetConfig();
```

#### `exportConfig()`
Exports configuration as JSON string.

**Returns:** `string` - JSON string of config

```typescript
const json = exportConfig();
```

#### `importConfig(jsonString: string)`
Imports configuration from JSON string.

**Parameters:**
- `jsonString: string` - JSON string to import

**Returns:** `AppConfig` - The imported config

**Throws:** Error if JSON is invalid

```typescript
const imported = importConfig(jsonString);
```

### Convenience Getters

All getters are available via `configGetters`:

```typescript
import { configGetters } from '../services';

configGetters.getTheme();
configGetters.getFontFamily();
configGetters.getTextSize();
configGetters.getNeonIntensity();
configGetters.getSelectedPlatform();
configGetters.getDefaultRegion('aws');
configGetters.getLastActivePage();
configGetters.getAutoRefreshInterval();
configGetters.getQuotaSelections();
```

### Convenience Setters

All setters are available via `configSetters`:

```typescript
import { configSetters } from '../services';

configSetters.setTheme('cyberpunk');
configSetters.setFontFamily('inter');
configSetters.setTextSize(110);
configSetters.setNeonIntensity(1.5);
configSetters.setSelectedPlatform('aws');
configSetters.setDefaultRegion('aws', 'us-west-2');
configSetters.setLastActivePage('dashboard');
configSetters.setAutoRefreshInterval(60);
configSetters.setQuotaSelections({ ... });
```

## Migration Strategy

When the config version changes, the `migrateConfig` function handles upgrading old configs. Currently it just does a deep merge with defaults, but can be extended:

```typescript
function migrateConfig(oldConfig: any): AppConfig {
  if (oldConfig.version === '1.0.0') {
    // Specific migration logic here
  }

  return deepMerge(DEFAULT_CONFIG, oldConfig);
}
```

## Best Practices

1. **Use Convenience Functions**: Prefer `configSetters.setTheme()` over `setConfigValue('appearance.theme')`
2. **Load Once**: Load config once when component mounts, don't reload on every render
3. **Update Immediately**: Call setters immediately when values change for instant persistence
4. **Batch Updates**: Use `updateConfig()` for multiple related changes
5. **Type Safety**: Always use the typed getters/setters when possible

## Examples

### Example 1: Persisting Theme Selection

```typescript
import { useState, useEffect } from 'react';
import { loadConfig, configSetters } from '../services';

function ThemeSelector() {
  const [theme, setTheme] = useState(() => {
    const config = loadConfig();
    return config.appearance.theme;
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    configSetters.setTheme(newTheme);
  };

  return (
    <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
      <option value="pocket-dark">Pocket Dark</option>
      <option value="cyberpunk">Cyberpunk</option>
      {/* ... */}
    </select>
  );
}
```

### Example 2: Auto-saving Page State

```typescript
import { useState, useEffect } from 'react';
import { loadConfig, configSetters } from '../services';

function App() {
  const config = loadConfig();
  const [activePage, setActivePage] = useState(config.ui.lastActivePage);

  // Auto-save when page changes
  useEffect(() => {
    configSetters.setLastActivePage(activePage);
  }, [activePage]);

  return (
    <div>
      {/* Render based on activePage */}
    </div>
  );
}
```

### Example 3: Exporting Config to File

```typescript
import { exportConfig } from '../services';

function ExportButton() {
  const handleExport = () => {
    const configJson = exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return <button onClick={handleExport}>Export Config</button>;
}
```

## Testing

To test the config system:

1. Open the app in your browser
2. Change some settings (theme, text size, etc.)
3. Refresh the page
4. Verify settings are preserved
5. Export config to a file
6. Reset or change settings
7. Import the config file
8. Verify settings are restored

## Future Enhancements

- Cloud sync (save to backend)
- Multiple config profiles
- Per-project settings
- Config validation and error recovery
- Migration wizard for major version changes
