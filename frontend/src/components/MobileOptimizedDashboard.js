import React from 'react';

/**
 * MobileOptimizedStatCard - Compact stat card for mobile
 * - Smaller padding
 * - Compact text
 * - Touch-friendly
 */

export function MobileOptimizedStatCard({ title, value, icon, color = 'blue', change, trend, onClick }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600'
  };

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg sm:rounded-xl 
        bg-gradient-to-br ${colorClasses[color]} 
        p-3 sm:p-4 lg:p-6 
        text-white cursor-pointer 
        transform transition-all duration-200 
        active:scale-95 sm:hover:scale-105 
        shadow-md hover:shadow-xl
        touch-target
      `}
      onClick={onClick}
    >
      {/* Decorative circle */}
      <div className="absolute top-0 right-0 w-12 sm:w-16 lg:w-20 h-12 sm:h-16 lg:h-20 bg-white bg-opacity-10 rounded-full -translate-y-6 sm:-translate-y-8 lg:-translate-y-10 translate-x-6 sm:translate-x-8 lg:translate-x-10"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          {/* Icon */}
          <div className="p-1.5 sm:p-2 lg:p-3 rounded-md sm:rounded-lg bg-white bg-opacity-20 flex-shrink-0">
            <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6">
              {icon}
            </div>
          </div>
          
          {/* Change indicator */}
          {change && (
            <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm">
              <span className={trend === 'up' ? 'text-green-200' : 'text-red-200'}>
                {trend === 'up' ? '↗' : '↘'}
              </span>
              <span className="font-medium">{change}</span>
            </div>
          )}
        </div>
        
        <div>
          {/* Title */}
          <p className="text-xs sm:text-sm opacity-90 mb-0.5 sm:mb-1 line-clamp-1">
            {title}
          </p>
          
          {/* Value */}
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * MobileOptimizedActionCard - Compact action card for mobile
 */
export function MobileOptimizedActionCard({ title, description, icon, color = 'blue', onClick, badge }) {
  const colorClasses = {
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700',
    green: 'hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700',
    purple: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700',
    orange: 'hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700'
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400'
  };

  return (
    <div 
      className={`
        group relative 
        bg-white dark:bg-slate-800 
        border border-gray-200 dark:border-slate-700 
        rounded-lg sm:rounded-xl 
        p-3 sm:p-4 lg:p-6 
        cursor-pointer transition-all duration-200 
        active:scale-95 
        shadow-sm hover:shadow-md
        touch-target
        ${colorClasses[color]}
      `}
      onClick={onClick}
    >
      {badge && (
        <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full z-10 shadow-lg">
          {badge}
        </span>
      )}
      
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0
          p-1.5 sm:p-2 lg:p-3 
          bg-gray-100 dark:bg-slate-700 
          rounded-md sm:rounded-lg 
          transition-colors
          ${iconColorClasses[color]}
        `}>
          <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6">
            {icon}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-0.5 sm:mb-1 line-clamp-1">
            {title}
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * MobileOptimizedGrid - Responsive grid for dashboard
 * Mobile: 2 columns
 * Tablet: 3 columns  
 * Desktop: 4 columns
 */
export function MobileOptimizedGrid({ children, type = 'stats' }) {
  const gridClasses = type === 'stats' 
    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6';
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

/**
 * MobileOptimizedHeader - Compact header for mobile
 */
export function MobileOptimizedHeader({ title, subtitle, badge, action, children }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white mb-4 sm:mb-6 lg:mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
        <div className="flex-1">
          {/* Title & Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              {title}
            </h1>
            {badge && (
              <span className="text-blue-200 text-xs sm:text-sm px-2 sm:px-3 py-1 bg-white/20 rounded-full inline-block max-w-fit">
                {badge}
              </span>
            )}
          </div>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-blue-100 text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 line-clamp-2">
              {subtitle}
            </p>
          )}
          
          {/* Additional content */}
          {children}
        </div>
        
        {/* Action button */}
        {action && (
          <div className="w-full sm:w-auto">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MobileOptimizedSection - Section with responsive title
 */
export function MobileOptimizedSection({ title, action, children, className = '' }) {
  return (
    <div className={`mb-4 sm:mb-6 lg:mb-8 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * MobileOptimizedEmptyState - Compact empty state
 */
export function MobileOptimizedEmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-8 sm:py-12 lg:py-16 px-4">
      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-gray-100 dark:bg-slate-800 mb-3 sm:mb-4">
        <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400 dark:text-gray-600">
          {icon}
        </div>
      </div>
      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action}
    </div>
  );
}
