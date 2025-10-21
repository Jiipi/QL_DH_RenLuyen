import React from 'react';

/**
 * ResponsiveTable - Wrapper for tables to handle mobile overflow
 * 
 * Usage:
 * <ResponsiveTable>
 *   <table>...</table>
 * </ResponsiveTable>
 */

export default function ResponsiveTable({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * ResponsiveCard - Card component that stacks properly on mobile
 */
export function ResponsiveCard({ title, children, className = '', actions }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </div>
    </div>
  );
}

/**
 * ResponsiveGrid - Grid that adjusts columns based on screen size
 */
export function ResponsiveGrid({ children, cols = { mobile: 1, tablet: 2, desktop: 3 }, gap = 4, className = '' }) {
  const gridClasses = `
    grid 
    grid-cols-${cols.mobile} 
    sm:grid-cols-${cols.tablet} 
    lg:grid-cols-${cols.desktop} 
    gap-${gap}
    ${className}
  `;
  
  return (
    <div className={gridClasses.replace(/\s+/g, ' ').trim()}>
      {children}
    </div>
  );
}

/**
 * ResponsiveStack - Flexbox that stacks on mobile
 */
export function ResponsiveStack({ children, direction = 'row', gap = 4, className = '' }) {
  const stackClasses = `
    flex 
    flex-col 
    ${direction === 'row' ? 'sm:flex-row' : 'sm:flex-col'}
    gap-${gap}
    ${className}
  `;
  
  return (
    <div className={stackClasses.replace(/\s+/g, ' ').trim()}>
      {children}
    </div>
  );
}

/**
 * MobileShow - Only show content on mobile
 */
export function MobileShow({ children }) {
  return (
    <div className="block md:hidden">
      {children}
    </div>
  );
}

/**
 * MobileHide - Hide content on mobile
 */
export function MobileHide({ children }) {
  return (
    <div className="hidden md:block">
      {children}
    </div>
  );
}

/**
 * ResponsiveButton - Button with responsive padding and text
 */
export function ResponsiveButton({ children, icon, className = '', ...props }) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        px-3 sm:px-4 py-2 sm:py-2.5
        text-sm font-medium
        rounded-lg
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="hidden sm:inline">{children}</span>
      {/* On mobile, show only icon if icon is provided */}
      {icon && <span className="sm:hidden sr-only">{children}</span>}
    </button>
  );
}
