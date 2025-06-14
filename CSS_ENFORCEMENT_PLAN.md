# CSS Architecture Enforcement Plan

## Overview
This document outlines the systematic approach to enforce the `/styles` directory as the single source of CSS truth in the ZK-Vault web application. All Vue components must use the established CSS classes instead of inline styles or `@apply` directives.

## Current Issues Found

### 1. Components with @apply directives (MUST BE REMOVED)
- `VaultView.vue` - 95+ @apply directives
- `NotificationSettings.vue` - 25+ @apply directives  
- `AppearanceSettings.vue` - 20+ @apply directives
- Multiple other settings components

### 2. Components with inline styles (MUST BE REPLACED)
- `PasswordItem.vue` - Dynamic width styles for strength meter
- `ProgressBar.vue` - Dynamic fill styles
- `SegmentationChart.vue` - Dynamic background colors
- `ActivityChart.vue` - Tooltip positioning
- `App.vue` - Loading progress width
- `FileDownload.vue` - Progress width
- `FileUpload.vue` - Progress width

## Enforcement Strategy

### Phase 1: Replace @apply Directives

#### VaultView.vue
**Current Classes → Target CSS Classes:**
- `.vault-view` → Use `.vault-dashboard` from `vault-dashboard.css`
- `.vault-header` → Use `.dashboard-header` from `vault-dashboard.css`
- `.header-content h1` → Use `.dashboard-title` from `vault-dashboard.css`
- `.header-content p` → Use `.dashboard-subtitle` from `vault-dashboard.css`
- `.search-section` → Use search components from `search-bar.css`
- `.stats-section` → Use `.stats-grid` from `vault-dashboard.css`
- `.stat-card` → Use `.stat-card` from `vault-dashboard.css`
- `.stat-icon` → Use `.stat-icon` variants from `vault-dashboard.css`

#### Settings Components
**Target CSS Files:**
- Use `settings-view.css` for main layout
- Use `form.css` classes for form elements
- Use `buttons.css` for button styling
- Use `modals.css` for modal components

### Phase 2: Replace Inline Styles with CSS Custom Properties

#### Dynamic Styles Strategy:
1. **Progress/Width Styles**: Use CSS custom properties
   ```css
   .progress-fill {
     width: var(--progress-width, 0%);
   }
   ```
   
2. **Color Variations**: Use CSS custom properties
   ```css
   .chart-segment {
     background-color: var(--segment-color);
   }
   ```

3. **Positioning**: Use CSS custom properties for tooltips
   ```css
   .tooltip {
     left: var(--tooltip-x, 0);
     top: var(--tooltip-y, 0);
   }
   ```

### Phase 3: Component-by-Component Enforcement

#### 1. Vault Components
- **Files**: `VaultView.vue`, `PasswordItem.vue`, `PasswordEditor.vue`
- **Target CSS**: `vault-dashboard.css`, `password-editor.css`
- **Actions**: 
  - Replace all @apply with established classes
  - Update template class names to match CSS architecture
  - Use CSS custom properties for dynamic styles

#### 2. Authentication Components  
- **Files**: `LoginForm.vue`, `RegisterForm.vue`, `AuthView.vue`
- **Target CSS**: `login-form.css`, `register-form.css`, `auth-view.css`
- **Actions**:
  - Remove @apply directives
  - Use form component classes from `forms.css`
  - Apply auth-specific styling from dedicated CSS files

#### 3. Security Components
- **Files**: `SecurityView.vue`, `TwoFactorSetup.vue`, `BiometricSetup.vue`
- **Target CSS**: `security-view.css`, `two-factor-setup.css`, `biometric-setup.css`
- **Actions**:
  - Replace inline security indicators with CSS classes
  - Use established security component patterns
  - Apply proper status styling from `security-status.css`

#### 4. Settings Components
- **Files**: All settings components
- **Target CSS**: `settings-view.css`, `backup-restore.css`
- **Actions**:
  - Remove all @apply directives
  - Use form and layout classes from base CSS
  - Apply settings-specific styling

#### 5. Common Components
- **Files**: `BaseButton.vue`, `BaseInput.vue`, `BaseModal.vue`, etc.
- **Target CSS**: `buttons.css`, `inputs.css`, `modals.css`
- **Actions**:
  - Ensure components use only established CSS classes
  - Remove any component-specific @apply directives
  - Use variant classes for different states

#### 6. Layout Components
- **Files**: `MainLayout.vue`, `Sidebar.vue`, `Header.vue`
- **Target CSS**: `main-layout.css`, `sidebar.css`, `header.css`
- **Actions**:
  - Use layout system classes from `layout/` directory
  - Remove @apply directives for layout properties
  - Use responsive classes from `responsive.css`

### Phase 4: Dynamic Styles Implementation

#### Progress Components
```vue
<!-- Before -->
<div class="progress-fill" :style="{ width: `${progress}%` }"></div>

<!-- After -->
<div 
  class="progress-fill" 
  :style="{ '--progress-width': `${progress}%` }"
></div>
```

#### Chart Components
```vue
<!-- Before -->
<div :style="{ backgroundColor: colors[key] }"></div>

<!-- After -->
<div 
  class="chart-segment"
  :style="{ '--segment-color': colors[key] }"
></div>
```

#### Tooltip Positioning
```vue
<!-- Before -->
<div class="tooltip" :style="tooltipStyle"></div>

<!-- After -->
<div 
  class="tooltip"
  :style="{ 
    '--tooltip-x': `${tooltip.x}px`,
    '--tooltip-y': `${tooltip.y}px`
  }"
></div>
```

## Implementation Checklist

### ✅ Completed
- [x] CSS Architecture Analysis
- [x] VaultView.vue template class updates and @apply removal
- [x] SearchResults.vue @apply removal and CSS file creation
- [x] BaseModal.vue @apply removal (using existing modal CSS)
- [x] ProgressBar.vue @apply removal and CSS custom properties implementation

### 🔄 In Progress
- [ ] Remaining components with @apply directives
- [ ] Inline styles replacement with CSS custom properties

### ⏳ Pending
- [ ] Authentication components
- [ ] Security components  
- [ ] Settings components @apply removal
- [ ] Chart components (dynamic colors)
- [ ] File upload/download components (progress bars)
- [ ] Testing and validation

## Validation Rules

### 1. No @apply Directives
```bash
# This should return no results
grep -r "@apply" src/components/ src/views/ src/layouts/
```

### 2. Minimal Inline Styles
- Only allow inline styles for dynamic values using CSS custom properties
- No hardcoded colors, spacing, or layout properties

### 3. CSS Class Consistency
- All classes must exist in `/styles` directory
- Use semantic naming from established architecture
- Follow component-based organization

### 4. Dark Mode Support
- All styling must support dark mode through CSS architecture
- No component-specific dark mode overrides

## Benefits of Enforcement

1. **Consistency**: Single source of truth for all styling
2. **Maintainability**: Centralized style management
3. **Performance**: Reduced CSS bundle size
4. **Accessibility**: Consistent focus, contrast, and motion handling
5. **Theming**: Unified color and spacing system
6. **Responsive**: Container query and responsive patterns

## Next Steps

1. Complete VaultView.vue enforcement
2. Create automated linting rules to prevent @apply usage
3. Implement CSS custom property patterns for dynamic styles
4. Update component documentation with correct class usage
5. Add pre-commit hooks to validate CSS architecture compliance 