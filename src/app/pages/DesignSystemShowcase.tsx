import { useState } from 'react';
import { Plus, Download, Heart, Share, Trash2, Edit, Settings, Star } from 'lucide-react';
import {
  ResponsiveContainer,
  ResponsiveGrid,
  Stack,
  HStack,
} from '../design-system/components/ResponsiveContainer';
import {
  ResponsiveButton,
  IconButton,
  ButtonGroup,
} from '../design-system/components/ResponsiveButton';
import { ResponsiveCard, FoodCard, StatCard } from '../design-system/components/ResponsiveCard';
import { designTokens } from '../design-system/tokens';

export default function DesignSystemShowcase() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      <ResponsiveContainer className="py-12">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
              Design System
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Fully responsive component library with 8pt grid system
          </p>
        </div>

        {/* Design Tokens */}
        <Section title="Design Tokens" subtitle="Foundation of the design system">
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
            <TokenCard
              title="Spacing (8pt Grid)"
              items={Object.entries(designTokens.spacing).map(([key, value]) => `${key}: ${value}`)}
            />
            <TokenCard
              title="Breakpoints"
              items={Object.entries(designTokens.breakpoints).map(
                ([key, value]) => `${key}: ${value}`,
              )}
            />
            <TokenCard
              title="Border Radius"
              items={Object.entries(designTokens.radius).map(([key, value]) => `${key}: ${value}`)}
            />
          </ResponsiveGrid>
        </Section>

        {/* Typography */}
        <Section title="Typography" subtitle="Fluid type scale for all screen sizes">
          <Stack spacing={6}>
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-2">
                Heading 1
              </h1>
              <p className="text-sm text-gray-500">Mobile: 36px | Tablet: 48px | Desktop: 64px</p>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                Heading 2
              </h2>
              <p className="text-sm text-gray-500">Mobile: 28px | Tablet: 36px | Desktop: 48px</p>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
                Heading 3
              </h3>
              <p className="text-sm text-gray-500">Mobile: 24px | Tablet: 28px | Desktop: 36px</p>
            </div>
            <div>
              <p className="text-base text-gray-900 dark:text-white mb-2">
                Body Text - The quick brown fox jumps over the lazy dog
              </p>
              <p className="text-sm text-gray-500">All devices: 16px / 24px line-height</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Small Text - Additional details and descriptions
              </p>
              <p className="text-sm text-gray-500">All devices: 14px / 20px line-height</p>
            </div>
          </Stack>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" subtitle="All variants and sizes with responsive behavior">
          <Stack spacing={8}>
            {/* Variants */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Variants</h3>
              <HStack spacing={4} className="flex-wrap">
                <ResponsiveButton variant="primary">Primary</ResponsiveButton>
                <ResponsiveButton variant="secondary">Secondary</ResponsiveButton>
                <ResponsiveButton variant="outline">Outline</ResponsiveButton>
                <ResponsiveButton variant="ghost">Ghost</ResponsiveButton>
                <ResponsiveButton variant="danger">Danger</ResponsiveButton>
                <ResponsiveButton variant="success">Success</ResponsiveButton>
              </HStack>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sizes</h3>
              <HStack spacing={4} className="items-end flex-wrap">
                <ResponsiveButton variant="primary" size="sm">
                  Small
                </ResponsiveButton>
                <ResponsiveButton variant="primary" size="md">
                  Medium
                </ResponsiveButton>
                <ResponsiveButton variant="primary" size="lg">
                  Large
                </ResponsiveButton>
                <ResponsiveButton variant="primary" size="xl">
                  Extra Large
                </ResponsiveButton>
              </HStack>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">With Icons</h3>
              <HStack spacing={4} className="flex-wrap">
                <ResponsiveButton variant="primary" leftIcon={<Plus size={20} />}>
                  Add Item
                </ResponsiveButton>
                <ResponsiveButton variant="secondary" leftIcon={<Download size={20} />}>
                  Download
                </ResponsiveButton>
                <ResponsiveButton variant="outline" rightIcon={<Share size={20} />}>
                  Share
                </ResponsiveButton>
              </HStack>
            </div>

            {/* States */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">States</h3>
              <HStack spacing={4} className="flex-wrap">
                <ResponsiveButton variant="primary">Normal</ResponsiveButton>
                <ResponsiveButton variant="primary" isLoading>
                  Loading
                </ResponsiveButton>
                <ResponsiveButton variant="primary" disabled>
                  Disabled
                </ResponsiveButton>
              </HStack>
            </div>

            {/* Icon Buttons */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Icon Buttons</h3>
              <HStack spacing={4} className="flex-wrap">
                <IconButton icon={<Heart size={20} />} variant="ghost" />
                <IconButton icon={<Share size={20} />} variant="ghost" />
                <IconButton icon={<Edit size={20} />} variant="primary" />
                <IconButton icon={<Trash2 size={20} />} variant="ghost" />
                <IconButton icon={<Settings size={20} />} variant="secondary" />
              </HStack>
            </div>

            {/* Button Group */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Button Group</h3>
              <ButtonGroup>
                <ResponsiveButton variant="secondary">Day</ResponsiveButton>
                <ResponsiveButton variant="secondary">Week</ResponsiveButton>
                <ResponsiveButton variant="primary">Month</ResponsiveButton>
                <ResponsiveButton variant="secondary">Year</ResponsiveButton>
              </ButtonGroup>
            </div>

            {/* Full Width */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Full Width</h3>
              <ResponsiveButton variant="primary" fullWidth leftIcon={<Plus size={20} />}>
                Create New Order
              </ResponsiveButton>
            </div>
          </Stack>
        </Section>

        {/* Cards */}
        <Section title="Cards" subtitle="Flexible card components with multiple variants">
          <Stack spacing={8}>
            {/* Card Variants */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Variants</h3>
              <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }}>
                <ResponsiveCard variant="elevated" padding="lg">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Elevated</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Card with shadow elevation
                  </p>
                </ResponsiveCard>
                <ResponsiveCard variant="outlined" padding="lg">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Outlined</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Card with border outline
                  </p>
                </ResponsiveCard>
                <ResponsiveCard variant="filled" padding="lg">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Filled</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Card with filled background
                  </p>
                </ResponsiveCard>
                <ResponsiveCard variant="glass" padding="lg">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Glass</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Glassmorphism effect</p>
                </ResponsiveCard>
              </ResponsiveGrid>
            </div>

            {/* Stat Cards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Stat Cards</h3>
              <ResponsiveGrid cols={{ mobile: 2, tablet: 2, desktop: 4 }}>
                <StatCard
                  label="Total Revenue"
                  value="$24,580"
                  change="+12.5%"
                  trend="up"
                  icon={<Plus className="w-6 h-6 text-black" />}
                />
                <StatCard
                  label="Active Users"
                  value="1,240"
                  change="+5.4%"
                  trend="up"
                  icon={<Star className="w-6 h-6 text-black" />}
                />
                <StatCard
                  label="Conversion Rate"
                  value="3.2%"
                  change="-2.1%"
                  trend="down"
                  icon={<Download className="w-6 h-6 text-black" />}
                />
                <StatCard
                  label="Avg. Order Value"
                  value="$45.60"
                  change="+8.2%"
                  trend="up"
                  icon={<Heart className="w-6 h-6 text-black" />}
                />
              </ResponsiveGrid>
            </div>

            {/* Food Cards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Food Cards (Product Cards)
              </h3>
              <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
                <FoodCard
                  name="Margherita Pizza"
                  description="Classic Italian pizza with fresh mozzarella and basil"
                  price={12.99}
                  rating={4.8}
                  deliveryTime="25-30 min"
                  category="Pizza"
                  image="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop"
                  inStock={true}
                />
                <FoodCard
                  name="Chicken Burger"
                  description="Grilled chicken with lettuce, tomato, and special sauce"
                  price={9.99}
                  rating={4.6}
                  deliveryTime="20-25 min"
                  category="Burgers"
                  image="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop"
                  inStock={true}
                />
                <FoodCard
                  name="Caesar Salad"
                  description="Fresh romaine lettuce with parmesan and croutons"
                  price={8.99}
                  rating={4.5}
                  deliveryTime="15-20 min"
                  category="Salads"
                  image="https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop"
                  inStock={false}
                />
              </ResponsiveGrid>
            </div>
          </Stack>
        </Section>

        {/* Grid System */}
        <Section title="Grid System" subtitle="Responsive 12-column grid with breakpoints">
          <Stack spacing={8}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Mobile (4 cols) → Tablet (8 cols) → Desktop (12 cols)
              </h3>
              <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-yellow-400 rounded-xl flex items-center justify-center text-black font-bold text-2xl"
                  >
                    {i}
                  </div>
                ))}
              </ResponsiveGrid>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                2 Columns → 4 Columns → 6 Columns
              </h3>
              <ResponsiveGrid cols={{ mobile: 2, tablet: 4, desktop: 6 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black font-semibold"
                  >
                    {i}
                  </div>
                ))}
              </ResponsiveGrid>
            </div>
          </Stack>
        </Section>

        {/* Colors */}
        <Section title="Colors" subtitle="Brand colors and semantic palette">
          <Stack spacing={8}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Brand Colors</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <ColorSwatch name="Primary" color="#FFC107" />
                <ColorSwatch name="Primary Dark" color="#FFA000" />
                <ColorSwatch name="Primary Light" color="#FFECB3" />
                <ColorSwatch name="Secondary" color="#000000" />
                <ColorSwatch name="Secondary Dark" color="#121212" />
                <ColorSwatch name="Secondary Light" color="#1E1E1E" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Semantic Colors
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ColorSwatch name="Success" color="#10B981" />
                <ColorSwatch name="Warning" color="#F59E0B" />
                <ColorSwatch name="Error" color="#EF4444" />
                <ColorSwatch name="Info" color="#3B82F6" />
              </div>
            </div>
          </Stack>
        </Section>

        {/* Responsive Behavior */}
        <Section title="Responsive Behavior" subtitle="Component adaptation across breakpoints">
          <ResponsiveCard variant="glass" padding="lg">
            <Stack spacing={6}>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  Mobile (320px - 480px)
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Single column layout</li>
                  <li>• Bottom navigation bar</li>
                  <li>• Hamburger menu</li>
                  <li>• Compact spacing (16px)</li>
                  <li>• Smaller typography</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  Tablet (481px - 1024px)
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 2-column layout</li>
                  <li>• Collapsed sidebar with icons</li>
                  <li>• Medium spacing (24px)</li>
                  <li>• Medium typography scale</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Desktop (1025px+)</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Multi-column layout (3-4 cols)</li>
                  <li>• Full sidebar with labels</li>
                  <li>• Expanded spacing (32px)</li>
                  <li>• Large typography scale</li>
                  <li>• Advanced hover states</li>
                </ul>
              </div>
            </Stack>
          </ResponsiveCard>
        </Section>
      </ResponsiveContainer>
    </div>
  );
}

// Helper Components
interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <section className="mb-20">
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function TokenCard({ title, items }: { title: string; items: string[] }) {
  return (
    <ResponsiveCard variant="outlined" padding="lg">
      <h4 className="font-bold text-gray-900 dark:text-white mb-4">{title}</h4>
      <div className="space-y-2">
        {items.slice(0, 6).map((item, i) => (
          <p key={i} className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {item}
          </p>
        ))}
      </div>
    </ResponsiveCard>
  );
}

function ColorSwatch({ name, color }: { name: string; color: string }) {
  return (
    <div>
      <div className="h-20 rounded-xl mb-2 shadow-lg" style={{ backgroundColor: color }} />
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
      <p className="text-xs text-gray-500 font-mono">{color}</p>
    </div>
  );
}
