import { ReactNode } from 'react';
import { motion } from 'motion/react';

type CardVariant = 'elevated' | 'outlined' | 'filled' | 'glass';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface ResponsiveCardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  image?: string;
  imageAspect?: 'square' | 'video' | 'wide' | 'portrait';
}

export function ResponsiveCard({
  children,
  variant = 'elevated',
  padding = 'md',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  header,
  footer,
  image,
  imageAspect = 'video',
}: ResponsiveCardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
    xl: 'p-8 sm:p-10',
  };

  const variantStyles = {
    elevated: `
      bg-white dark:bg-gray-900
      shadow-lg
      ${hoverable ? 'hover:shadow-xl' : ''}
    `,
    outlined: `
      bg-white dark:bg-gray-900
      border-2 border-gray-200 dark:border-gray-700
      ${hoverable ? 'hover:border-gray-300 dark:hover:border-gray-600' : ''}
    `,
    filled: `
      bg-gray-50 dark:bg-gray-800
      ${hoverable ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
    `,
    glass: `
      bg-white/80 dark:bg-gray-900/80
      backdrop-blur-xl
      border border-gray-200/50 dark:border-gray-700/50
      ${hoverable ? 'hover:bg-white/90 dark:hover:bg-gray-900/90' : ''}
    `,
  };

  const aspectRatios = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    portrait: 'aspect-[3/4]',
  };

  const CardComponent = clickable || onClick ? motion.div : 'div';

  return (
    <CardComponent
      whileHover={clickable || onClick ? { y: -4, scale: 1.02 } : {}}
      whileTap={clickable || onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        rounded-2xl
        overflow-hidden
        transition-all duration-200
        ${variantStyles[variant]}
        ${clickable || onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {image && (
        <div className={`w-full ${aspectRatios[imageAspect]} overflow-hidden`}>
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {header && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {header}
        </div>
      )}

      <div className={paddingStyles[padding]}>{children}</div>

      {footer && (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </CardComponent>
  );
}

// Product Card for Food Delivery
interface FoodCardProps {
  name: string;
  description: string;
  price: number;
  image: string;
  rating?: number;
  deliveryTime?: string;
  category?: string;
  onClick?: () => void;
  inStock?: boolean;
}

export function FoodCard({
  name,
  description,
  price,
  image,
  rating,
  deliveryTime,
  category,
  onClick,
  inStock = true,
}: FoodCardProps) {
  return (
    <ResponsiveCard
      variant="elevated"
      padding="none"
      hoverable
      clickable
      onClick={onClick}
      className="group"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {!inStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Out of Stock</span>
          </div>
        )}
        {category && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full">
            <span className="text-xs font-semibold text-white">{category}</span>
          </div>
        )}
        {rating && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-400 rounded-full flex items-center gap-1">
            <span className="text-xs font-bold text-black">⭐ {rating}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{description}</p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ${price.toFixed(2)}
            </span>
          </div>
          {deliveryTime && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{deliveryTime}</span>
            </div>
          )}
        </div>
      </div>
    </ResponsiveCard>
  );
}

// Stat Card
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, trend, icon, className = '' }: StatCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <ResponsiveCard variant="glass" padding="lg" className={className}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
            {value}
          </h3>
        </div>
        {icon && (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {change && trend && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${trendColors[trend]}`}>
            {trend === 'up' && '↑'} {trend === 'down' && '↓'} {change}
          </span>
          <span className="text-sm text-gray-500">vs last period</span>
        </div>
      )}
    </ResponsiveCard>
  );
}
