import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Star,
  MapPin,
  Package,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { ResponsiveContainer } from '../design-system/components/ResponsiveContainer';
import { ResponsiveButton } from '../design-system/components/ResponsiveButton';
import { ResponsiveCard, FoodCard, StatCard } from '../design-system/components/ResponsiveCard';
import {
  ResponsiveNavigation,
  defaultFoodDeliveryNav,
} from '../design-system/components/ResponsiveNav';

// Sample Data
const stats = [
  {
    label: 'Total Revenue',
    value: '$24,580',
    change: '+12.5%',
    trend: 'up' as const,
    icon: <DollarSign className="w-6 h-6 text-black" />,
  },
  {
    label: 'Orders Today',
    value: '156',
    change: '+8.2%',
    trend: 'up' as const,
    icon: <ShoppingCart className="w-6 h-6 text-black" />,
  },
  {
    label: 'Active Customers',
    value: '1,240',
    change: '+5.4%',
    trend: 'up' as const,
    icon: <Users className="w-6 h-6 text-black" />,
  },
  {
    label: 'Avg. Delivery Time',
    value: '28 min',
    change: '-12%',
    trend: 'down' as const,
    icon: <Clock className="w-6 h-6 text-black" />,
  },
];

const popularDishes = [
  {
    name: 'Margherita Pizza',
    description: 'Classic Italian pizza with fresh mozzarella and basil',
    price: 12.99,
    rating: 4.8,
    deliveryTime: '25-30 min',
    category: 'Pizza',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
    inStock: true,
  },
  {
    name: 'Chicken Burger',
    description: 'Grilled chicken with lettuce, tomato, and special sauce',
    price: 9.99,
    rating: 4.6,
    deliveryTime: '20-25 min',
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    inStock: true,
  },
  {
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with parmesan and croutons',
    price: 8.99,
    rating: 4.5,
    deliveryTime: '15-20 min',
    category: 'Salads',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
    inStock: false,
  },
  {
    name: 'Sushi Combo',
    description: 'Assorted sushi rolls with wasabi and ginger',
    price: 18.99,
    rating: 4.9,
    deliveryTime: '35-40 min',
    category: 'Sushi',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
    inStock: true,
  },
];

const recentOrders = [
  {
    id: '#ORD-1234',
    customer: 'John Doe',
    items: 3,
    total: 45.99,
    status: 'Delivered',
    time: '2m ago',
  },
  {
    id: '#ORD-1235',
    customer: 'Jane Smith',
    items: 2,
    total: 28.5,
    status: 'In Transit',
    time: '5m ago',
  },
  {
    id: '#ORD-1236',
    customer: 'Mike Johnson',
    items: 5,
    total: 67.8,
    status: 'Preparing',
    time: '12m ago',
  },
  {
    id: '#ORD-1237',
    customer: 'Sarah Williams',
    items: 1,
    total: 12.99,
    status: 'Pending',
    time: '18m ago',
  },
];

const topRestaurants = [
  { name: 'Pizza Palace', orders: 245, rating: 4.8, revenue: '$12,450' },
  { name: 'Burger Barn', orders: 189, rating: 4.6, revenue: '$9,870' },
  { name: 'Sushi Supreme', orders: 156, rating: 4.9, revenue: '$11,230' },
  { name: 'Pasta Paradise', orders: 134, rating: 4.7, revenue: '$8,560' },
];

export default function FoodDeliveryDashboard() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Pizza', 'Burgers', 'Salads', 'Sushi', 'Desserts'];

  const logo = (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
        <span className="text-black font-bold text-xl">E</span>
      </div>
      <div className="hidden sm:block">
        <h1 className="text-xl font-bold text-white">Eatcom</h1>
        <p className="text-xs text-gray-400">Food Delivery</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Navigation */}
      <ResponsiveNavigation logo={logo} items={defaultFoodDeliveryNav} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <ResponsiveContainer className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back! Here's what's happening today.
              </p>
            </div>

            <div className="flex gap-3">
              <ResponsiveButton variant="secondary" size="md" leftIcon={<Package size={20} />}>
                <span className="hidden sm:inline">View Orders</span>
                <span className="sm:hidden">Orders</span>
              </ResponsiveButton>
              <ResponsiveButton variant="primary" size="md" leftIcon={<Plus size={20} />}>
                <span className="hidden sm:inline">New Order</span>
                <span className="sm:hidden">New</span>
              </ResponsiveButton>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                label={stat.label}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
                icon={stat.icon}
              />
            ))}
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column - Popular Dishes */}
            <div className="xl:col-span-2 space-y-6">
              {/* Category Filter */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((category) => (
                  <motion.button
                    key={category}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(category)}
                    className={`
                      px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold whitespace-nowrap
                      transition-all duration-200 flex-shrink-0
                      ${
                        selectedCategory === category
                          ? 'bg-yellow-400 text-black shadow-lg'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    {category}
                  </motion.button>
                ))}
              </div>

              {/* Popular Dishes Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Popular Dishes
                  </h2>
                  <button className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 flex items-center gap-1">
                    View All <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {popularDishes.map((dish, index) => (
                    <FoodCard
                      key={index}
                      {...dish}
                      onClick={() => console.log('Clicked:', dish.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Recent Orders Table */}
              <ResponsiveCard variant="glass" padding="lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Recent Orders
                  </h2>
                  <button className="text-sm font-semibold text-yellow-600 hover:text-yellow-700">
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-3 px-4 sm:px-0 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Order ID
                        </th>
                        <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Customer
                        </th>
                        <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Items
                        </th>
                        <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Total
                        </th>
                        <th className="pb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Status
                        </th>
                        <th className="pb-3 px-4 sm:px-0 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-4 px-4 sm:px-0 font-mono text-sm text-gray-900 dark:text-white">
                            {order.id}
                          </td>
                          <td className="py-4 text-sm text-gray-900 dark:text-white">
                            {order.customer}
                          </td>
                          <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                            {order.items}
                          </td>
                          <td className="py-4 text-sm font-semibold text-gray-900 dark:text-white">
                            ${order.total}
                          </td>
                          <td className="py-4">
                            <span
                              className={`
                              px-3 py-1 rounded-full text-xs font-semibold
                              ${
                                order.status === 'Delivered'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : order.status === 'In Transit'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : order.status === 'Preparing'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }
                            `}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 sm:px-0 text-sm text-gray-500 dark:text-gray-500">
                            {order.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ResponsiveCard>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Top Restaurants */}
              <ResponsiveCard variant="glass" padding="lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Top Restaurants
                </h3>
                <div className="space-y-4">
                  {topRestaurants.map((restaurant, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {restaurant.name}
                          </p>
                          <p className="text-xs text-gray-500">{restaurant.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {restaurant.revenue}
                        </p>
                        <p className="text-xs text-yellow-600 flex items-center gap-1">
                          ⭐ {restaurant.rating}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ResponsiveCard>

              {/* Quick Actions */}
              <ResponsiveCard variant="filled" padding="lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <ResponsiveButton variant="primary" fullWidth leftIcon={<Plus size={20} />}>
                    Add New Dish
                  </ResponsiveButton>
                  <ResponsiveButton variant="secondary" fullWidth leftIcon={<MapPin size={20} />}>
                    Track Delivery
                  </ResponsiveButton>
                  <ResponsiveButton variant="ghost" fullWidth leftIcon={<TrendingUp size={20} />}>
                    View Analytics
                  </ResponsiveButton>
                </div>
              </ResponsiveCard>

              {/* Promo Banner */}
              <ResponsiveCard
                variant="elevated"
                padding="lg"
                className="bg-gradient-to-br from-yellow-400 to-orange-500 text-black"
              >
                <h3 className="text-xl font-bold mb-2">🎉 Special Offer!</h3>
                <p className="text-sm mb-4 opacity-90">
                  Get 20% off on all orders above $50 this weekend
                </p>
                <ResponsiveButton variant="secondary" size="sm" fullWidth>
                  Learn More
                </ResponsiveButton>
              </ResponsiveCard>
            </div>
          </div>
        </ResponsiveContainer>
      </main>
    </div>
  );
}
