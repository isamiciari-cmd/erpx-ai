import type { ReactNode } from 'react';

interface AppPageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export default function AppPageContainer({
  children,
  title,
  description,
  actions,
  className = '',
}: AppPageContainerProps) {
  return (
    <main className={`w-full max-w-[1800px] mx-auto ${className}`}>
      {(title || description || actions) && (
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {title}
              </h1>
            )}

            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}

      {children}
    </main>
  );
}
