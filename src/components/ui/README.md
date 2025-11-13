# UI Components

## Placeholder Fill Feature

All input components now support a quick placeholder fill feature. When `enablePlaceholderFill={true}` is set and the input has a placeholder, a lightning bolt icon appears on the right side of the input.

### Usage

```tsx
import Input from './ui/Input'
import TextArea from './ui/TextArea'

// Input with placeholder fill
<Input
  label="Name"
  placeholder="Enter your full name"
  enablePlaceholderFill={true}
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// TextArea with placeholder fill
<TextArea
  label="Description"
  placeholder="Describe your project"
  enablePlaceholderFill={true}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

### Features

- **Lightning bolt icon**: Appears only when placeholder exists and `enablePlaceholderFill={true}`
- **One-click fill**: Clicking the icon fills the input with the placeholder text
- **Non-intrusive**: Icon only shows when needed
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Consistent**: Works across all input types (text, email, number, textarea, etc.)

### Implementation

The feature is implemented using:
- `usePlaceholderFill` hook for the logic
- `PlaceholderFillButton` component for the UI
- Enhanced `Input` and `TextArea` components with optional `enablePlaceholderFill` prop

This provides a centralized, reusable solution for quick placeholder-based input filling across your entire application.
