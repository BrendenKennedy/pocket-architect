/**
 * Theme Creator Wizard Component
 * 
 * Multi-step wizard for creating custom application themes.
 * Supports two creation modes:
 * 1. Guided Wizard - Step-by-step color picker interface (5 steps)
 * 2. Raw Configuration - Direct JSON config editor (2 steps)
 * 
 * Themes are saved to localStorage via the theme configuration system.
 */

import { useState } from 'react';
import { CreationWizard } from './ui/creation-wizard';
import { Palette, Code, Wand2 } from 'lucide-react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { saveCustomTheme, THEME_CONFIG_BOILERPLATE, ThemeConfig } from '../config/themes';
import { Textarea } from './ui/textarea';

interface ThemeCreatorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeCreated?: () => void;
}

type CreationMode = 'wizard' | 'raw-config' | null;

export function ThemeCreatorWizard({ open, onOpenChange, onThemeCreated }: ThemeCreatorWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [themeName, setThemeName] = useState('');
  const [rawConfig, setRawConfig] = useState(THEME_CONFIG_BOILERPLATE);
  
  // Color states for wizard mode
  const [background, setBackground] = useState('#0A0A0A');
  const [foreground, setForeground] = useState('#E5E7EB');
  const [card, setCard] = useState('rgba(17, 24, 39, 0.5)');
  const [cardForeground, setCardForeground] = useState('#F3F4F6');
  const [popover, setPopover] = useState('#2A1F3D');
  const [popoverForeground, setPopoverForeground] = useState('#E5E7EB');
  const [primary, setPrimary] = useState('#A78BFA');
  const [primaryForeground, setPrimaryForeground] = useState('#0F0F0F');
  const [secondary, setSecondary] = useState('rgba(31, 41, 55, 0.5)');
  const [secondaryForeground, setSecondaryForeground] = useState('#E5E7EB');
  const [muted, setMuted] = useState('#2D2440');
  const [mutedForeground, setMutedForeground] = useState('#C4B5FD');
  const [border, setBorder] = useState('#4A3D64');
  const [input, setInput] = useState('#4A3D64');
  const [ring, setRing] = useState('#A78BFA');
  const [destructive, setDestructive] = useState('#DC2626');
  const [destructiveForeground, setDestructiveForeground] = useState('#FAFAFA');

  const totalSteps = creationMode === 'raw-config' ? 2 : 5;

  const handleNext = () => {
    // Step 1: Mode selection
    if (currentStep === 1 && !creationMode) {
      toast.error('Please select a creation mode');
      return;
    }
    
    // Step 2 for wizard mode: Theme name
    if (currentStep === 2 && creationMode === 'wizard' && !themeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }
    
    // Step 2 for raw config mode: Validate and create
    if (currentStep === 2 && creationMode === 'raw-config') {
      handleCreateFromRawConfig();
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreateFromWizard();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Reset mode if going back to step 1
      if (currentStep === 2) {
        setCreationMode(null);
      }
    }
  };

  const handleCancel = () => {
    setCurrentStep(1);
    setCreationMode(null);
    setThemeName('');
    setRawConfig(THEME_CONFIG_BOILERPLATE);
    onOpenChange(false);
  };

  const handleCreateFromWizard = () => {
    const newTheme: ThemeConfig = {
      name: themeName.toLowerCase().replace(/\s+/g, '-'),
      label: themeName,
      colors: {
        background,
        foreground,
        card,
        cardForeground,
        popover,
        popoverForeground,
        primary,
        primaryForeground,
        secondary,
        secondaryForeground,
        muted,
        mutedForeground,
        destructive,
        destructiveForeground,
        border,
        input,
        ring,
      }
    };
    
    saveCustomTheme(newTheme);
    toast.success(`Theme "${themeName}" created successfully!`);
    handleCancel();
    if (onThemeCreated) {
      onThemeCreated();
    }
  };

  const handleCreateFromRawConfig = () => {
    try {
      const parsed = JSON.parse(rawConfig) as ThemeConfig;
      
      // Validate required fields
      if (!parsed.name || !parsed.label || !parsed.colors) {
        toast.error('Invalid theme config: missing required fields');
        return;
      }
      
      const requiredColors = [
        'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground',
        'primary', 'primaryForeground', 'secondary', 'secondaryForeground',
        'muted', 'mutedForeground', 'destructive', 'destructiveForeground',
        'border', 'input', 'ring'
      ];
      
      const missingColors = requiredColors.filter(color => !parsed.colors[color as keyof typeof parsed.colors]);
      if (missingColors.length > 0) {
        toast.error(`Missing color values: ${missingColors.join(', ')}`);
        return;
      }
      
      saveCustomTheme(parsed);
      toast.success(`Theme "${parsed.label}" created successfully!`);
      handleCancel();
      if (onThemeCreated) {
        onThemeCreated();
      }
    } catch (error) {
      toast.error('Invalid JSON configuration. Please check your syntax.');
      console.error('Theme config parse error:', error);
    }
  };

  const renderStepContent = () => {
    // Step 1: Choose creation mode
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Choose how you'd like to create your custom theme
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setCreationMode('wizard')}
              className={`p-6 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                creationMode === 'wizard'
                  ? 'border-primary bg-primary/10'
                  : 'border-border-muted hover:border-border'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <Wand2 className={`w-12 h-12 ${creationMode === 'wizard' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <div className="font-medium mb-1">Guided Wizard</div>
                  <p className="text-xs text-muted-foreground">
                    Step-by-step color picker interface
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCreationMode('raw-config')}
              className={`p-6 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                creationMode === 'raw-config'
                  ? 'border-primary bg-primary/10'
                  : 'border-border-muted hover:border-border'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <Code className={`w-12 h-12 ${creationMode === 'raw-config' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <div className="font-medium mb-1">Raw Configuration</div>
                  <p className="text-xs text-muted-foreground">
                    Edit JSON config directly
                  </p>
                </div>
              </div>
            </button>
          </div>

          {creationMode && (
            <Card className="bg-card border-border p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                {creationMode === 'wizard' 
                  ? 'You\'ll be guided through 4 steps to configure all theme colors with live previews.'
                  : 'You\'ll have access to a JSON editor with the complete theme structure and all available color variables.'}
              </p>
            </Card>
          )}
        </div>
      );
    }

    // Raw config mode
    if (creationMode === 'raw-config' && currentStep === 2) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">
            Edit the JSON configuration below. All color fields are required.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="raw-config">Theme Configuration (JSON)</Label>
            <Textarea
              id="raw-config"
              value={rawConfig}
              onChange={(e) => setRawConfig(e.target.value)}
              className="font-mono text-sm bg-background border-border-muted min-h-[500px]"
              placeholder={THEME_CONFIG_BOILERPLATE}
            />
          </div>

          <Card className="bg-card border-border p-4">
            <h4 className="text-sm mb-2">Required Fields</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <span className="text-foreground">name</span>: Unique theme identifier (lowercase, no spaces)</li>
              <li>• <span className="text-foreground">label</span>: Display name for the theme</li>
              <li>• <span className="text-foreground">colors</span>: Object containing all 17 color variables</li>
            </ul>
          </Card>
        </div>
      );
    }

    // Wizard mode steps
    if (creationMode === 'wizard') {
      switch (currentStep) {
        case 2:
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="theme-name" className="mb-2 block">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="My Custom Theme"
                  className="bg-background border-border-muted"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Choose a descriptive name for your custom theme
                </p>
              </div>
            </div>
          );

        case 3:
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure the main background and surface colors
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="background" className="mb-2 block">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background"
                      type="text"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="flex-1 bg-background border-border-muted font-mono text-sm"
                      placeholder="#0A0A0A"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Main background color</p>
                </div>

                <div>
                  <Label htmlFor="foreground" className="mb-2 block">Foreground</Label>
                  <Input
                    id="foreground"
                    type="text"
                    value={foreground}
                    onChange={(e) => setForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#E5E7EB"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Main text color</p>
                </div>

                <div>
                  <Label htmlFor="card" className="mb-2 block">Card</Label>
                  <Input
                    id="card"
                    type="text"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="rgba(17, 24, 39, 0.5)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Card background (supports rgba)</p>
                </div>

                <div>
                  <Label htmlFor="card-foreground" className="mb-2 block">Card Foreground</Label>
                  <Input
                    id="card-foreground"
                    type="text"
                    value={cardForeground}
                    onChange={(e) => setCardForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#F3F4F6"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Card text color</p>
                </div>

                <div>
                  <Label htmlFor="popover" className="mb-2 block">Popover</Label>
                  <Input
                    id="popover"
                    type="text"
                    value={popover}
                    onChange={(e) => setPopover(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#2A1F3D"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Dropdown/popover background</p>
                </div>

                <div>
                  <Label htmlFor="popover-foreground" className="mb-2 block">Popover Foreground</Label>
                  <Input
                    id="popover-foreground"
                    type="text"
                    value={popoverForeground}
                    onChange={(e) => setPopoverForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#E5E7EB"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Popover text color</p>
                </div>
              </div>
            </div>
          );

        case 4:
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure primary, secondary, and muted colors
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary" className="mb-2 block">Primary</Label>
                  <Input
                    id="primary"
                    type="text"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#A78BFA"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Primary accent color</p>
                </div>

                <div>
                  <Label htmlFor="primary-foreground" className="mb-2 block">Primary Foreground</Label>
                  <Input
                    id="primary-foreground"
                    type="text"
                    value={primaryForeground}
                    onChange={(e) => setPrimaryForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#0F0F0F"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Text on primary</p>
                </div>

                <div>
                  <Label htmlFor="secondary" className="mb-2 block">Secondary</Label>
                  <Input
                    id="secondary"
                    type="text"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="rgba(31, 41, 55, 0.5)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Secondary background</p>
                </div>

                <div>
                  <Label htmlFor="secondary-foreground" className="mb-2 block">Secondary Foreground</Label>
                  <Input
                    id="secondary-foreground"
                    type="text"
                    value={secondaryForeground}
                    onChange={(e) => setSecondaryForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#E5E7EB"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Text on secondary</p>
                </div>

                <div>
                  <Label htmlFor="muted" className="mb-2 block">Muted</Label>
                  <Input
                    id="muted"
                    type="text"
                    value={muted}
                    onChange={(e) => setMuted(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#2D2440"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Muted background</p>
                </div>

                <div>
                  <Label htmlFor="muted-foreground" className="mb-2 block">Muted Foreground</Label>
                  <Input
                    id="muted-foreground"
                    type="text"
                    value={mutedForeground}
                    onChange={(e) => setMutedForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#C4B5FD"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Muted text color</p>
                </div>
              </div>
            </div>
          );

        case 5:
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure border, input, ring, and destructive colors
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="border" className="mb-2 block">Border</Label>
                  <Input
                    id="border"
                    type="text"
                    value={border}
                    onChange={(e) => setBorder(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#4A3D64"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Border color</p>
                </div>

                <div>
                  <Label htmlFor="input" className="mb-2 block">Input</Label>
                  <Input
                    id="input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#4A3D64"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Input border color</p>
                </div>

                <div>
                  <Label htmlFor="ring" className="mb-2 block">Ring</Label>
                  <Input
                    id="ring"
                    type="text"
                    value={ring}
                    onChange={(e) => setRing(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#A78BFA"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Focus ring color</p>
                </div>

                <div>
                  <Label htmlFor="destructive" className="mb-2 block">Destructive</Label>
                  <Input
                    id="destructive"
                    type="text"
                    value={destructive}
                    onChange={(e) => setDestructive(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#DC2626"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Error/danger color</p>
                </div>

                <div>
                  <Label htmlFor="destructive-foreground" className="mb-2 block">Destructive Foreground</Label>
                  <Input
                    id="destructive-foreground"
                    type="text"
                    value={destructiveForeground}
                    onChange={(e) => setDestructiveForeground(e.target.value)}
                    className="bg-background border-border-muted font-mono text-sm"
                    placeholder="#FAFAFA"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Text on destructive</p>
                </div>
              </div>

              <Card className="bg-card border-border p-4 mt-4">
                <h4 className="text-sm mb-3">Theme Summary</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {themeName || 'Not set'}</p>
                  <p><span className="text-muted-foreground">Primary Color:</span> {primary}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Click "Create Theme" to save your custom theme configuration.
                  </p>
                </div>
              </Card>
            </div>
          );
      }
    }

    return null;
  };

  const getStepDescription = () => {
    if (currentStep === 1) return 'Choose Creation Mode';
    if (creationMode === 'raw-config' && currentStep === 2) return 'Edit Configuration';
    if (creationMode === 'wizard') {
      switch (currentStep) {
        case 2: return 'Basic Info';
        case 3: return 'Background & Surface Colors';
        case 4: return 'Accent Colors';
        case 5: return 'Border & Destructive Colors';
      }
    }
    return '';
  };

  return (
    <CreationWizard
      open={open}
      onOpenChange={onOpenChange}
      title="Create Custom Theme"
      description={getStepDescription()}
      icon={Palette}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onPrevious={currentStep > 1 ? handlePrevious : undefined}
      onCancel={handleCancel}
      nextLabel={
        (creationMode === 'raw-config' && currentStep === 2) || 
        (creationMode === 'wizard' && currentStep === totalSteps)
          ? 'Create Theme'
          : 'Next'
      }
      nextDisabled={currentStep === 1 && !creationMode}
      size="lg"
    >
      {renderStepContent()}
    </CreationWizard>
  );
}