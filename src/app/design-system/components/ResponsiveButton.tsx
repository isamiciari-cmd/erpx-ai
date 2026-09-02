import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ResponsiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  children: ReactNode;
}

export function ResponsiveButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}: ResponsiveButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm h-9',
    md: 'px-4 py-2.5 text-base h-11 sm:h-12',
    lg: 'px-6 py-3 text-lg h-12 sm:h-14',
    xl: 'px-8 py-4 text-xl h-14 sm:h-16',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-yellow-400 to-yellow-500
      text-black
      hover:from-yellow-500 hover:to-yellow-600
      active:from-yellow-600 active:to-yellow-700
      focus:ring-yellow-500
      shadow-lg shadow-yellow-500/30
      hover:shadow-xl hover:shadow-yellow-500/40
    `,
    secondary: `
      bg-gray-900
      text-white
      border-2 border-gray-700
      hover:bg-gray-800
      active:bg-gray-700
      focus:ring-gray-600
    `,
    outline: `
      bg-transparent
      text-gray-900 dark:text-white
      border-2 border-gray-900 dark:border-white
      hover:bg-gray-900 hover:text-white
      dark:hover:bg-white dark:hover:text-black
      focus:ring-gray-500
    `,
    ghost: `
      bg-transparent
      text-gray-900 dark:text-white
      hover:bg-gray-100 dark:hover:bg-gray-800
      active:bg-gray-200 dark:active:bg-gray-700
      focus:ring-gray-400
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600
      text-white
      hover:from-red-600 hover:to-red-700
      active:from-red-700 active:to-red-800
      focus:ring-red-500
      shadow-lg shadow-red-500/30
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600
      text-white
      hover:from-green-600 hover:to-green-700
      active:from-green-700 active:to-green-800
      focus:ring-green-500
      shadow-lg shadow-green-500/30
    `,
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </motion.button>
  );
}

// Icon Button Variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: IconButtonProps) {
  const sizeStyles = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11 sm:w-12 sm:h-12',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
    xl: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const baseVariant =
    variant === 'primary' ? 'primary' : variant === 'secondary' ? 'secondary' : 'ghost';

  return (
    <ResponsiveButton
      variant={baseVariant}
      className={`!p-0 ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      isLoading={isLoading}
      {...props}
    >
      {!isLoading && icon}
    </ResponsiveButton>
  );
}

// Button Group
interface ButtonGroupProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  className = '',
}: ButtonGroupProps) {
  return (
    <div
      className={`
        inline-flex
        ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}
        ${orientation === 'horizontal' ? '[&>button]:rounded-none [&>button:first-child]:rounded-l-xl [&>button:last-child]:rounded-r-xl' : '[&>button]:rounded-none [&>button:first-child]:rounded-t-xl [&>button:last-child]:rounded-b-xl'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
