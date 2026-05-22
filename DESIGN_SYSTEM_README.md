# 🎨 Responsive Design System - Food Delivery / SaaS Platform

A comprehensive, fully responsive design system built for modern SaaS and Food Delivery platforms like Eatcom/ERPX-AI.

---

## 📐 Architecture

### Grid System

#### Desktop (1440px+)
- **12-column grid**
- Gutter: 32px
- Margin: 32px
- Max width: 1440px

#### Tablet (768px - 1024px)
- **8-column grid**
- Gutter: 24px
- Margin: 24px
- Max width: 1024px

#### Mobile (375px - 480px)
- **4-column grid**
- Gutter: 16px
- Margin: 16px
- Max width: 480px

---

## 🎯 Breakpoints

```typescript
breakpoints: {
  mobile: '320px',      // Phones
  mobileLarge: '480px', // Large phones
  tablet: '768px',      // Tablets
  tabletLarge: '1024px', // Large tablets
  desktop: '1440px',    // Desktop
  desktopLarge: '1920px' // Large desktop
}
```

**Tailwind Breakpoint Usage:**
- `sm:` - 640px (Tablet)
- `md:` - 768px (Tablet)
- `lg:` - 1024px (Desktop)
- `xl:` - 1440px (Large Desktop)

---

## 📏 Spacing System (8pt Grid)

All spacing follows an 8-point grid system:

```typescript
spacing: {
  '0': '0',
  '1': '8px',    // gap-1, p-1, m-1
  '2': '16px',   // gap-2, p-2, m-2
  '3': '24px',   // gap-3, p-3, m-3
  '4': '32px',   // gap-4, p-4, m-4
  '6': '48px',   // gap-6, p-6, m-6
  '8': '64px',   // gap-8, p-8, m-8
  '10': '80px',  // gap-10, p-10, m-10
  '12': '96px',  // gap-12, p-12, m-12
}
```

---

## 🔤 Typography

### Fluid Typography Scale

#### Headings
| Element | Mobile    | Tablet    | Desktop   | Weight |
|---------|-----------|-----------|-----------|--------|
| H1      | 36px/44px | 48px/56px | 64px/72px | 700    |
| H2      | 28px/36px | 36px/44px | 48px/56px | 700    |
| H3      | 24px/32px | 28px/36px | 36px/44px | 600    |
| H4      | 20px/28px | 24px/32px | 28px/36px | 600    |
| H5      | 18px/24px | 20px/28px | 24px/32px | 600    |
| H6      | 16px/22px | 18px/24px | 20px/28px | 600    |

#### Body Text
| Type  | All Devices   | Weight |
|-------|---------------|--------|
| Body  | 16px/24px     | 400    |
| Small | 14px/20px     | 400    |
| Tiny  | 12px/16px     | 400    |

**Usage in Tailwind:**
```html
<h1 class="text-4xl sm:text-5xl lg:text-6xl">Heading 1</h1>
<p class="text-base">Body text</p>
<span class="text-sm">Small text</span>
```

---

## 🎨 Colors

### Brand Colors (Food Delivery Theme)

```typescript
brand: {
  primary: '#FFC107',      // Yellow
  primaryDark: '#FFA000',
  primaryLight: '#FFECB3',
  secondary: '#000000',    // Black
  secondaryDark: '#121212',
  secondaryLight: '#1E1E1E',
}
```

### Semantic Colors

```typescript
semantic: {
  success: '#10B981',   // Green
  warning: '#F59E0B',   // Orange
  error: '#EF4444',     // Red
  info: '#3B82F6',      // Blue
}
```

---

## 🧩 Components

### 1. Responsive Container

Auto-adjusting container with max-width constraints:

```tsx
import { ResponsiveContainer } from './design-system/components/ResponsiveContainer';

<ResponsiveContainer>
  {/* Content */}
</ResponsiveContainer>
```

**Features:**
- Mobile: max-width 375px, padding 16px
- Tablet: max-width 768px, padding 24px
- Desktop: max-width 1440px, padding 32px

---

### 2. Responsive Grid

Flexible grid system with breakpoint-specific columns:

```tsx
import { ResponsiveGrid } from './design-system/components/ResponsiveContainer';

<ResponsiveGrid 
  cols={{ mobile: 1, tablet: 2, desktop: 3 }}
  gap={{ mobile: 4, tablet: 6, desktop: 8 }}
>
  {items.map(item => <Card {...item} />)}
</ResponsiveGrid>
```

---

### 3. Buttons

#### Variants
- `primary` - Yellow gradient (main actions)
- `secondary` - Black with border
- `outline` - Transparent with border
- `ghost` - Transparent background
- `danger` - Red gradient (destructive)
- `success` - Green gradient (positive)

#### Sizes
- `sm` - 36px height (mobile: 32px)
- `md` - 44px height (mobile: 40px)
- `lg` - 52px height (mobile: 48px)
- `xl` - 60px height (mobile: 56px)

```tsx
import { ResponsiveButton } from './design-system/components/ResponsiveButton';

// Basic
<ResponsiveButton variant="primary" size="md">
  Click Me
</ResponsiveButton>

// With Icon
<ResponsiveButton 
  variant="primary" 
  leftIcon={<Plus size={20} />}
>
  Add Item
</ResponsiveButton>

// Loading State
<ResponsiveButton isLoading>
  Submitting...
</ResponsiveButton>

// Full Width
<ResponsiveButton fullWidth variant="primary">
  Submit
</ResponsiveButton>
```

---

### 4. Cards

#### Variants
- `elevated` - Shadow elevation
- `outlined` - Border outline
- `filled` - Filled background
- `glass` - Glassmorphism effect

#### Padding
- `none` - No padding
- `sm` - Small (16px mobile, 20px tablet)
- `md` - Medium (20px mobile, 24px tablet)
- `lg` - Large (24px mobile, 32px tablet)
- `xl` - Extra large (32px mobile, 40px tablet)

```tsx
import { ResponsiveCard } from './design-system/components/ResponsiveCard';

<ResponsiveCard 
  variant="glass" 
  padding="lg"
  hoverable
  clickable
  onClick={() => console.log('Clicked')}
>
  <h3>Card Title</h3>
  <p>Card content...</p>
</ResponsiveCard>
```

---

### 5. Food Card (Product Card)

Specialized card for food delivery items:

```tsx
import { FoodCard } from './design-system/components/ResponsiveCard';

<FoodCard
  name="Margherita Pizza"
  description="Classic Italian pizza with fresh mozzarella"
  price={12.99}
  rating={4.8}
  deliveryTime="25-30 min"
  category="Pizza"
  image="https://example.com/pizza.jpg"
  inStock={true}
  onClick={() => handleOrderClick()}
/>
```

---

### 6. Stat Card

KPI / metric display card:

```tsx
import { StatCard } from './design-system/components/ResponsiveCard';

<StatCard
  label="Total Revenue"
  value="$24,580"
  change="+12.5%"
  trend="up"
  icon={<DollarSign />}
/>
```

---

### 7. Navigation

#### Desktop Sidebar
- Full width with labels
- Collapsible to icon-only
- Active state indicators

#### Tablet Sidebar
- Icon-only sidebar (80px width)
- Tooltip on hover

#### Mobile
- **Bottom Navigation Bar** (4 main items)
- **Hamburger Menu** (drawer from left)

```tsx
import { ResponsiveNavigation } from './design-system/components/ResponsiveNav';

const navItems = [
  { name: 'Home', path: '/', icon: <Home /> },
  { name: 'Orders', path: '/orders', icon: <ShoppingCart /> },
  // ... more items
];

const logo = (
  <div>
    <h1>Eatcom</h1>
  </div>
);

<ResponsiveNavigation logo={logo} items={navItems} />
```

---

## 📱 Responsive Behavior

### Layout Adaptation

#### Desktop (1440px+)
```
┌────────────┬──────────────────────────────┐
│            │                              │
│  Sidebar   │     Main Content Area        │
│  (280px)   │     (Multi-column Grid)      │
│            │                              │
│  Full      │     3-4 column cards         │
│  Labels    │     Charts + Tables          │
│            │                              │
└────────────┴──────────────────────────────┘
```

#### Tablet (768px - 1024px)
```
┌───┬─────────────────────────────────────┐
│   │                                     │
│ S │     Main Content Area               │
│ i │     (2-column Grid)                 │
│ d │                                     │
│ e │     2 column cards                  │
│ b │     Responsive charts               │
│ a │                                     │
│ r │                                     │
└───┴─────────────────────────────────────┘
    Icon-only sidebar (80px)
```

#### Mobile (375px - 480px)
```
┌─────────────────────────────────────────┐
│  ☰  Logo                      [Profile] │  ← Hamburger Menu
├─────────────────────────────────────────┤
│                                         │
│     Single Column Layout                │
│                                         │
│     ┌─────────────────────────────┐     │
│     │      Stat Card 1            │     │
│     └─────────────────────────────┘     │
│     ┌─────────────────────────────┐     │
│     │      Stat Card 2            │     │
│     └─────────────────────────────┘     │
│                                         │
├─────────────────────────────────────────┤
│  🏠   📦   📊   👤                       │  ← Bottom Nav
└─────────────────────────────────────────┘
```

---

## 🎯 Usage Examples

### Dashboard Page Structure

```tsx
import { ResponsiveContainer, ResponsiveGrid } from './design-system/components/ResponsiveContainer';
import { ResponsiveButton } from './design-system/components/ResponsiveButton';
import { StatCard } from './design-system/components/ResponsiveCard';

export default function Dashboard() {
  return (
    <ResponsiveContainer className="py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          Dashboard
        </h1>
        <ResponsiveButton variant="primary">
          New Order
        </ResponsiveButton>
      </div>

      {/* Stats Grid */}
      <ResponsiveGrid 
        cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        className="mb-8"
      >
        <StatCard {...stat1} />
        <StatCard {...stat2} />
        <StatCard {...stat3} />
        <StatCard {...stat4} />
      </ResponsiveGrid>

      {/* Content Grid */}
      <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
        {/* Content cards */}
      </ResponsiveGrid>
    </ResponsiveContainer>
  );
}
```

---

## 🌗 Dark Mode

All components support dark mode through Tailwind's dark: prefix:

```html
<!-- Card that adapts to theme -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

**Toggle Implementation:**
```tsx
const [darkMode, setDarkMode] = useState(false);

<div className={darkMode ? 'dark' : ''}>
  {/* App content */}
</div>
```

---

## ✅ Best Practices

### 1. Always Use Responsive Components
❌ Don't: `<div className="w-[600px]">`
✅ Do: `<ResponsiveContainer>`

### 2. Mobile-First Approach
❌ Don't: `lg:text-xl md:text-lg text-base`
✅ Do: `text-base md:text-lg lg:text-xl`

### 3. Use the 8pt Grid
❌ Don't: `gap-5` (20px)
✅ Do: `gap-4` (32px) or `gap-6` (48px)

### 4. Proper Breakpoint Testing
Test on actual devices or use browser DevTools:
- iPhone SE (375px)
- iPad (768px)
- Desktop (1440px)

### 5. Touch Targets on Mobile
Minimum 44x44px for all interactive elements:
```tsx
<ResponsiveButton size="md"> // 44px height on mobile
```

---

## 📦 File Structure

```
src/app/design-system/
├── tokens.ts                    # Design tokens (colors, spacing, etc.)
└── components/
    ├── ResponsiveContainer.tsx  # Container & Grid components
    ├── ResponsiveButton.tsx     # Button variants
    ├── ResponsiveCard.tsx       # Card components
    └── ResponsiveNav.tsx        # Navigation components

src/app/pages/
├── FoodDeliveryDashboard.tsx   # Example dashboard
└── DesignSystemShowcase.tsx    # Component library showcase
```

---

## 🚀 Quick Start

1. **View the Design System**
   Navigate to `/design-system` to see all components

2. **View Live Example**
   Navigate to `/food-delivery` for a complete dashboard

3. **Use in Your Page**
   ```tsx
   import { ResponsiveContainer } from '../design-system/components/ResponsiveContainer';
   import { ResponsiveButton } from '../design-system/components/ResponsiveButton';
   
   export default function MyPage() {
     return (
       <ResponsiveContainer>
         <h1 className="text-3xl sm:text-4xl lg:text-5xl">My Page</h1>
         <ResponsiveButton variant="primary">Click Me</ResponsiveButton>
       </ResponsiveContainer>
     );
   }
   ```

---

## 🎨 Figma Integration (Future)

This design system can be exported to Figma with:
- Auto Layout components
- Variants (Primary/Secondary/etc.)
- Responsive frames (Mobile/Tablet/Desktop)
- Design tokens as styles

---

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [8-Point Grid System](https://spec.fm/specifics/8-pt-grid)
- [Responsive Design Patterns](https://web.dev/patterns/)
- [Mobile-First Design](https://medium.com/@Vincentxia77/what-is-mobile-first-design-why-its-important-how-to-make-it-7d3cf2e29d00)

---

## 🤝 Contributing

When adding new components:
1. Follow the 8pt grid system
2. Add responsive breakpoints
3. Support dark mode
4. Include in DesignSystemShowcase.tsx
5. Document in this README

---

**Made with ❤️ for ERPX-AI / Eatcom Platform**
