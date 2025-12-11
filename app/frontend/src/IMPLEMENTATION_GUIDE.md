# PySide6 Implementation Guide

This document explains how the PySide6 implementation of Pocket Architect follows the wizard implementation guidelines.

## Architecture Comparison

### Web (React/TypeScript) vs Desktop (PySide6)

| Aspect | Web Implementation | PySide6 Implementation |
|--------|-------------------|----------------------|
| Dialog Framework | Radix UI Dialog | QDialog |
| State Management | useState hooks | Instance variables (self.form_data) |
| Step Rendering | renderStep() function | QStackedWidget / show/hide |
| Progress Bar | Custom Progress component | QProgressBar |
| Navigation | Back/Next buttons | QPushButton with signals |
| Form Inputs | Input, Select, Textarea | QLineEdit, QComboBox, QTextEdit |

## Wizard Implementations

### 1. Deploy Project Wizard (3 Steps)

**Location**: `pages/projects.py` → `DeployWizard` class

**Implementation**:
- ✅ 3-step wizard with progress bar
- ✅ Step 1: Blueprint selection from QComboBox
- ✅ Step 2: Project name input with validation pattern, optional snapshot checkbox
- ✅ Step 3: Cost limit input, cost action dropdown, override checkbox
- ✅ Progress bar shows (currentStep / 3) * 100
- ✅ Back button hidden on first step
- ✅ Next button changes to "Deploy" on final step

**State Management**:
```python
self.current_step = 0
# Form fields as instance variables
self.blueprint_combo, self.name_input, self.snapshot_check, etc.
```

**Validation**:
- Step 1: Blueprint must be selected
- Step 2: Project name required, alphanumeric + hyphens
- Step 3: No validation (all optional)

### 2. Create Blueprint Wizard (7 Steps)

**Location**: `pages/blueprints.py` → `CreateBlueprintWizard` class

**Implementation**:
- ✅ 7-step wizard matching guidelines
- ✅ Step 1: Basic Info (name, description, use case, region, tags)
- ✅ Step 2: Workload Assessment (type, users, intensity, memory)
- ✅ Step 3: Compute (instance type, AMI, count, spot, user data)
- ✅ Step 4: Networking (VPC, CIDR, ALB, EIP, domain)
- ✅ Step 5: Storage (skip flag, EBS size/type, S3, EFS)
- ✅ Step 6: Security Config (dropdown selection)
- ✅ Step 7: Review (summary text)
- ✅ "Save Draft" button visible on steps 1-6
- ✅ Progress bar updates: (currentStep + 1) / 7 * 100

**Form Data Structure**:
```python
self.form_data = {
    'name': '', 'description': '', 'use_case': '', 'region': 'us-east-1',
    'workload_type': '', 'expected_users': '',
    'instance_type': 't3.medium', 'ami_type': 'default',
    'default_vpc': True, 'use_alb': False,
    'skip_storage': False, 'ebs_size': 20,
    'security_config': '__none__'
}
```

**Key Features**:
- Workload assessment provides instance recommendations
- Dynamic form visibility based on checkboxes (e.g., skip storage)
- Advanced options with expandable sections

### 3. Create Security Config Wizard (5 Steps)

**Location**: `pages/security.py` → `CreateSecurityConfigWizard` class

**Implementation**:
- ✅ 5-step wizard as specified
- ✅ Step 1: Basic Info (name, description)
- ✅ Step 2: SSH Key Pair (dropdown, warning card if none)
- ✅ Step 3: Certificate (type dropdown, ACM ARN input, info card)
- ✅ Step 4: Security Groups & Firewall (templates checkboxes, ports inputs)
- ✅ Step 5: IAM Permissions (role dropdown, legacy checkboxes)
- ✅ Form data matches guideline structure

**Validation**:
- Step 1: Name required
- Step 2: Key pair required
- Steps 3-5: No validation

**Special Features**:
- Warning card with styled background (yellow/amber for warnings)
- Info card explaining ACM certificates
- Multiple port configuration fields

### 4. Create Security Group Dialog (Single Step)

**Location**: `pages/security.py` → `CreateSecurityGroupDialog` class

**Implementation**:
- ✅ Single-step dialog (not multi-step wizard)
- ✅ Name, description, VPC ID inputs
- ✅ Dynamic ingress rules list with Add/Remove
- ✅ Dynamic egress rules list with Add/Remove
- ✅ Each rule: Protocol, From Port, To Port, CIDR, Description
- ✅ Remove button styled as danger

**Rule Management**:
```python
def add_rule(self, rule_type):
    # Creates new rule widget with all fields
    # Adds to ingress_rules or egress_rules list
    
def remove_rule(self, rule_widget, rule_type):
    # Removes from list and deletes widget
```

### 5. Create IAM Role Dialog (Single Step)

**Location**: `pages/security.py` → `CreateIAMRoleDialog` class

**Implementation**:
- ✅ Single-step dialog
- ✅ Name, description inputs
- ✅ Trust policy JSON editor (QTextEdit with monospace font)
- ✅ Managed policy ARNs textarea (one per line)
- ✅ Default EC2 trust policy pre-filled
- ✅ JSON validation on submit

**Default Trust Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
```

## Common Implementation Patterns

### Progress Indicator

**Web**:
```tsx
<Progress value={(step / totalSteps) * 100} className="mb-4" />
<div className="text-sm text-gray-400 mb-4">Step {step} of {totalSteps}</div>
```

**PySide6**:
```python
self.progress = QProgressBar()
self.progress.setValue(int((self.current_step + 1) / self.total_steps * 100))
self.subtitle_label.setText(f"Step {self.current_step + 1} of {self.total_steps}")
```

### Navigation Buttons

**Web**:
```tsx
<DialogFooter>
  <Button variant="outline" onClick={handleBack} disabled={step === 1}>Back</Button>
  <Button onClick={handleNext}>{step === totalSteps ? 'Create' : 'Next'}</Button>
</DialogFooter>
```

**PySide6**:
```python
self.back_btn.setVisible(self.current_step > 0)
self.next_btn.setText("Create" if self.current_step == self.total_steps - 1 else "Next ▶")
```

### Step Validation

**Web**:
```typescript
const isStepValid = () => {
  switch(step) {
    case 1: return blueprint !== '';
    case 2: return projectName !== '' && /^[a-z0-9-]+$/.test(projectName);
    default: return true;
  }
};
```

**PySide6**:
```python
def is_step_valid(self):
    if self.current_step == 0:
        return self.blueprint_combo.currentText() != ''
    elif self.current_step == 1:
        name = self.name_input.text()
        return name != '' and re.match(r'^[a-z0-9-]+$', name)
    return True
```

### Step Switching

**Web**:
```typescript
const renderStep = () => {
  switch(step) {
    case 1: return <Step1Component />;
    case 2: return <Step2Component />;
  }
};
```

**PySide6**:
```python
def update_step(self):
    # Hide all steps
    for widget in self.step_widgets:
        widget.hide()
    # Show current step
    self.step_widgets[self.current_step].show()
```

## Styling

### Card/Dialog Styling

**Web**:
```tsx
<Card className="bg-[#1A1A1A] border border-gray-800">
```

**PySide6 QSS**:
```css
#card {
    background-color: #1E1E1E;
    border: 1px solid #333333;
    border-radius: 12px;
    padding: 20px;
}
```

### Button Variants

| Variant | Web Class | PySide6 ObjectName |
|---------|-----------|-------------------|
| Primary | `primaryButton` | `primaryButton` |
| Secondary | `secondaryButton` | `secondaryButton` |
| Danger | `dangerButton` | `dangerButton` |

### Badge/Status Indicators

**Web**:
```tsx
<Badge className="bg-green-500/20 text-green-500">Active</Badge>
```

**PySide6**:
```python
badge = QLabel("Active")
badge.setObjectName("badgeGreen")  # Styled in QSS
```

## Integration Points

### Security Page in Main Navigation

**Location**: `sidebar.py` and `main_window.py`

**Implementation**:
```python
# Sidebar
nav_items = [
    ('dashboard', '📊', 'Dashboard'),
    ('projects', '📁', 'Projects'),
    ('blueprints', '📦', 'Blueprints'),
    ('snapshots', '📷', 'Snapshots'),
    ('security', '🔒', 'Security'),  # NEW
    ('cost', '💰', 'Cost Management'),
    ('settings', '⚙️', 'Settings'),
]

# Main Window
self.security_page = SecurityPage()
self.stacked_widget.addWidget(self.security_page)  # Index 6
```

### Tabbed Interface in Security Page

**Structure**:
```python
tabs = QTabWidget()
tabs.addTab(configs_tab, "Security Configurations")
tabs.addTab(sg_tab, "Security Groups")
tabs.addTab(iam_tab, "IAM Roles")
```

Each tab has:
- Action bar with Create button
- Table widget for data display
- Refresh button

## Error Handling

### Web Approach
```typescript
try {
  await bridge.createSecurityConfig(formData);
  toast.success('Success message');
} catch (error) {
  toast.error('Error message');
}
```

### PySide6 Approach
```python
def create_security_config(self):
    try:
        # Validation
        if not self.name_input.text():
            # Show error dialog or status bar message
            return
        
        # In real app: bridge.createSecurityConfig(form_data)
        self.accept()
        # Parent can show success message
    except Exception as e:
        # Show error dialog
        pass
```

**Note**: PySide6 doesn't have built-in toast notifications. Options:
1. Use QMessageBox for errors
2. Show temporary status bar messages
3. Implement custom toast widget
4. Use third-party notification library

## Dialog Sizing

| Dialog Type | Web (Tailwind) | PySide6 (QDialog) |
|-------------|----------------|-------------------|
| Default | `max-w-2xl` (900px) | `setMinimumSize(700, 500)` |
| Large | `max-w-4xl` (1200px) | `setMinimumSize(900, 650)` |
| Min Height | `min-h-[400px]` | `setMinimumSize(x, 400)` |

## Key Differences: Web vs Desktop

### 1. State Management
- **Web**: React hooks (`useState`) with functional components
- **PySide6**: Instance variables (`self.form_data`) in class-based components

### 2. Reactivity
- **Web**: Automatic re-rendering on state change
- **PySide6**: Manual widget updates (show/hide, setText, setValue)

### 3. Form Validation
- **Web**: Real-time validation with onChange handlers
- **PySide6**: Validation on button click or using QValidator

### 4. Styling
- **Web**: Tailwind utility classes
- **PySide6**: QSS stylesheets (CSS-like syntax)

### 5. Dialogs
- **Web**: Modal overlay with backdrop
- **PySide6**: Native modal dialogs with `setModal(True)`

### 6. Component Composition
- **Web**: JSX with component nesting
- **PySide6**: Qt layouts with widget hierarchy

## Best Practices

### 1. Wizard Pattern
- Use QStackedWidget or show/hide for step switching
- Store form data in single dictionary
- Update progress bar on every step change
- Disable/hide Back button on first step
- Change button text on last step

### 2. Form Data
- Initialize all fields in `__init__`
- Use descriptive variable names matching guidelines
- Separate concerns (UI state vs form data)

### 3. Validation
- Validate on button click, not on every keystroke
- Show clear error messages
- Disable Next/Create button if invalid

### 4. Styling
- Use object names for QSS selectors
- Keep styling in .qss file, not inline
- Follow consistent naming conventions

### 5. Signal/Slot Connections
- Connect signals in `setup_ui()`
- Use lambda for parameterized slots
- Disconnect signals when cleaning up

## Future Enhancements

### Bridge Integration
When integrating with real AWS SDK (boto3):

```python
# Example bridge interface
class AWSBridge:
    def list_blueprints(self):
        # Query AWS or local database
        return blueprints
    
    def deploy_project(self, config):
        # Use boto3 to deploy resources
        pass
    
    def create_security_config(self, config):
        # Store in database or config file
        pass
```

### Toast Notifications
Implement custom toast widget:

```python
class Toast(QWidget):
    def __init__(self, message, type="info"):
        # Create semi-transparent widget
        # Show at bottom-right corner
        # Auto-hide after 3 seconds
        # Support success/error/warning types
```

### Form Validation
Add QValidator subclasses:

```python
class ProjectNameValidator(QValidator):
    def validate(self, input, pos):
        if re.match(r'^[a-z0-9-]*$', input):
            return QValidator.Acceptable
        return QValidator.Invalid
        
# Usage
self.name_input.setValidator(ProjectNameValidator())
```

## Summary

This PySide6 implementation successfully translates all wizard patterns from the web guidelines:

✅ **3-step Deploy Project Wizard** with blueprint/project/cost configuration  
✅ **7-step Create Blueprint Wizard** with workload assessment  
✅ **5-step Security Config Wizard** with key pair/certificate/IAM  
✅ **Security Group Dialog** with dynamic rule management  
✅ **IAM Role Dialog** with JSON validation  
✅ **Progress bars** on all wizards  
✅ **Consistent navigation** (Back/Next/Cancel buttons)  
✅ **Dark theme** matching design system  
✅ **Form validation** matching guidelines  
✅ **Tabbed interfaces** for complex pages  

The PySide6 implementation demonstrates that modern, feature-rich desktop GUIs can match web applications in functionality and user experience!
