# ERPX-AI UI Interactions Guide

## Overview

This guide explains how to use the interactive UI components system implemented in ERPX-AI.

## Components Available

### 1. Toast Notifications

Display success, error, warning, and info messages to users.

#### Usage:

```tsx
import { useToast } from '../components/ui/Toast';

function MyComponent() {
  const toast = useToast();

  const handleAction = () => {
    toast.success('Action completed successfully!');
    toast.error('Something went wrong!');
    toast.warning('Please check your input.');
    toast.info('Here is some information.');
  };
}
```

### 2. Modal

Reusable modal dialog component.

#### Usage:

```tsx
import Modal from '../components/ui/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Modal Title"
      size="md" // sm, md, lg, xl
    >
      <div className="p-6">Your content here</div>
    </Modal>
  );
}
```

### 3. ConfirmDialog

Confirmation dialog for destructive actions.

#### Usage:

```tsx
import ConfirmDialog from '../components/ui/ConfirmDialog';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    // Perform delete action
    await deleteItem();
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleDelete}
      title="Confirm Deletion"
      message="Are you sure you want to delete this item?"
      confirmText="Delete"
      type="danger" // danger, warning, info
    />
  );
}
```

### 4. Button

Feature-rich button component with variants and states.

#### Usage:

```tsx
import Button from '../components/ui/Button';
import { Plus } from 'lucide-react';

function MyComponent() {
  return (
    <>
      {/* Primary Button */}
      <Button variant="primary">Save</Button>

      {/* With Icon */}
      <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
        Add Item
      </Button>

      {/* Loading State */}
      <Button isLoading={true}>Processing...</Button>

      {/* Disabled */}
      <Button disabled>Disabled</Button>

      {/* Variants */}
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Delete</Button>
      <Button variant="success">Approve</Button>
      <Button variant="ghost">Cancel</Button>

      {/* Sizes */}
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>

      {/* Full Width */}
      <Button fullWidth>Full Width</Button>
    </>
  );
}
```

### 5. EmptyState

Display when no data is available.

#### Usage:

```tsx
import EmptyState from '../components/ui/EmptyState';
import { Package } from 'lucide-react';

function MyComponent() {
  return (
    <EmptyState
      icon={Package}
      title="No Products Found"
      description="Start by adding your first product"
      actionLabel="Add Product"
      onAction={() => setIsAddModalOpen(true)}
    />
  );
}
```

### 6. LoadingSpinner

Display loading state.

#### Usage:

```tsx
import LoadingSpinner from '../components/ui/LoadingSpinner';

function MyComponent() {
  return (
    <>
      {/* Default */}
      <LoadingSpinner />

      {/* With Message */}
      <LoadingSpinner message="Loading data..." />

      {/* Different Sizes */}
      <LoadingSpinner size="sm" />
      <LoadingSpinner size="md" />
      <LoadingSpinner size="lg" />

      {/* Full Screen */}
      <LoadingSpinner fullScreen message="Processing..." />
    </>
  );
}
```

## Complete Example

See `/src/app/pages/inventory/InventoryManagementPage.tsx` for a complete working example that demonstrates:

- ✅ Toast notifications for all actions
- ✅ Modal dialogs for Add/Edit/View
- ✅ Confirm dialog for delete operations
- ✅ Button states (loading, disabled, hover)
- ✅ Empty states when no data
- ✅ Loading spinner during async operations
- ✅ Search and filter functionality
- ✅ Table row actions (View, Edit, Delete)
- ✅ Form validation
- ✅ Smooth animations and transitions

## Best Practices

### 1. Always Show Feedback

```tsx
// Good ✅
const handleSave = async () => {
  setIsLoading(true);
  try {
    await saveData();
    toast.success('Data saved successfully!');
  } catch (error) {
    toast.error('Failed to save data');
  } finally {
    setIsLoading(false);
  }
};

// Bad ❌
const handleSave = async () => {
  await saveData(); // No feedback, user doesn't know what happened
};
```

### 2. Confirm Destructive Actions

```tsx
// Good ✅
<button onClick={() => setIsDeleteDialogOpen(true)}>
  Delete
</button>

// Bad ❌
<button onClick={() => deleteItem()}>
  Delete
</button>
```

### 3. Disable Buttons During Loading

```tsx
// Good ✅
<Button isLoading={isSubmitting} disabled={isSubmitting}>
  Submit
</Button>

// Bad ❌
<button onClick={handleSubmit}>
  Submit
</button>
```

### 4. Show Empty States

```tsx
// Good ✅
{
  items.length === 0 ? (
    <EmptyState
      icon={Package}
      title="No Items"
      description="Add your first item"
      actionLabel="Add Item"
      onAction={() => setIsAddModalOpen(true)}
    />
  ) : (
    <ItemsList items={items} />
  );
}

// Bad ❌
{
  items.length === 0 && <div>No items</div>;
}
```

### 5. Handle Errors Gracefully

```tsx
// Good ✅
try {
  await performAction();
  toast.success('Success!');
} catch (error) {
  toast.error(error.message || 'An error occurred');
  console.error(error);
}

// Bad ❌
await performAction(); // No error handling
```

## Button States Reference

| State    | Description                 | Visual Feedback                 |
| -------- | --------------------------- | ------------------------------- |
| Default  | Normal resting state        | Base colors                     |
| Hover    | Mouse over button           | Scale 1.02, color change        |
| Active   | Button pressed              | Scale 0.98                      |
| Loading  | Async operation in progress | Spinner animation               |
| Disabled | Button cannot be clicked    | Opacity 50%, cursor not-allowed |

## Color Variants

| Variant   | Use Case                          | Colors             |
| --------- | --------------------------------- | ------------------ |
| Primary   | Main actions (Save, Add, Submit)  | Blue gradient      |
| Secondary | Secondary actions (Cancel, Close) | White/5 background |
| Danger    | Destructive actions (Delete)      | Red gradient       |
| Success   | Positive actions (Approve)        | Green gradient     |
| Ghost     | Tertiary actions (Cancel)         | Transparent        |

## Implementation Checklist

When creating a new page with interactions:

- [ ] Wrap app with `ToastProvider` in App.tsx
- [ ] Use `useToast()` hook for notifications
- [ ] Add loading states for all async operations
- [ ] Implement confirm dialogs for delete/critical actions
- [ ] Show empty states when no data
- [ ] Add proper button states (loading, disabled)
- [ ] Handle errors with toast notifications
- [ ] Use modals for forms (Add/Edit)
- [ ] Add hover effects to interactive elements
- [ ] Implement keyboard shortcuts (Escape to close)
- [ ] Make modals accessible (focus trap, ARIA)
- [ ] Show visual feedback for all user actions

## Next Steps

To apply these patterns to other modules:

1. Copy the structure from `InventoryManagementPage.tsx`
2. Replace the data model with your module's data
3. Customize actions (Add, Edit, Delete) for your use case
4. Add module-specific features
5. Test all interactions thoroughly

## Support

For questions or issues with UI components, refer to:

- Component source code in `/src/app/components/ui/`
- Example implementation in `/src/app/pages/inventory/InventoryManagementPage.tsx`
- This guide
