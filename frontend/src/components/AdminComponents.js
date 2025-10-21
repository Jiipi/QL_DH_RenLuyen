/**
 * Reusable Admin Components Library
 * Complete set of UI components for admin interface
 */

import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import '../styles/admin-components.css';

/* ============================================
   BUTTON COMPONENT
   ============================================ */

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  const buttonClass = `
    admin-btn 
    admin-btn-${variant} 
    admin-btn-${size}
    ${fullWidth ? 'admin-btn-full' : ''}
    ${loading ? 'admin-btn-loading' : ''}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="admin-btn-spinner" />}
      {icon && iconPosition === 'left' && <span className="admin-btn-icon">{icon}</span>}
      <span className="admin-btn-text">{children}</span>
      {icon && iconPosition === 'right' && <span className="admin-btn-icon">{icon}</span>}
    </button>
  );
};

/* ============================================
   CARD COMPONENT
   ============================================ */

export const Card = ({ 
  children, 
  title, 
  subtitle,
  actions,
  noPadding = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`admin-card ${className}`} {...props}>
      {(title || actions) && (
        <div className="admin-card-header">
          <div>
            {title && <h3 className="admin-card-title">{title}</h3>}
            {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="admin-card-actions">{actions}</div>}
        </div>
      )}
      <div className={`admin-card-body ${noPadding ? 'no-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
};

/* ============================================
   INPUT COMPONENT
   ============================================ */

export const Input = ({ 
  label, 
  error, 
  helper,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`admin-input-wrapper ${fullWidth ? 'full-width' : ''}`}>
      {label && <label className="admin-input-label">{label}</label>}
      <div className="admin-input-container">
        {icon && iconPosition === 'left' && (
          <span className="admin-input-icon admin-input-icon-left">{icon}</span>
        )}
        <input 
          className={`admin-input ${error ? 'admin-input-error' : ''} ${icon ? `has-icon-${iconPosition}` : ''} ${className}`}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <span className="admin-input-icon admin-input-icon-right">{icon}</span>
        )}
      </div>
      {helper && <span className="admin-input-helper">{helper}</span>}
      {error && <span className="admin-input-error-text">{error}</span>}
    </div>
  );
};

/* ============================================
   TEXTAREA COMPONENT
   ============================================ */

export const Textarea = ({ 
  label, 
  error, 
  helper,
  fullWidth = false,
  className = '',
  rows = 4,
  ...props 
}) => {
  return (
    <div className={`admin-input-wrapper ${fullWidth ? 'full-width' : ''}`}>
      {label && <label className="admin-input-label">{label}</label>}
      <textarea 
        className={`admin-textarea ${error ? 'admin-input-error' : ''} ${className}`}
        rows={rows}
        {...props}
      />
      {helper && <span className="admin-input-helper">{helper}</span>}
      {error && <span className="admin-input-error-text">{error}</span>}
    </div>
  );
};

/* ============================================
   SELECT COMPONENT
   ============================================ */

export const Select = ({ 
  label, 
  error, 
  helper,
  options = [],
  fullWidth = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`admin-input-wrapper ${fullWidth ? 'full-width' : ''}`}>
      {label && <label className="admin-input-label">{label}</label>}
      <select 
        className={`admin-select ${error ? 'admin-input-error' : ''} ${className}`}
        {...props}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helper && <span className="admin-input-helper">{helper}</span>}
      {error && <span className="admin-input-error-text">{error}</span>}
    </div>
  );
};

/* ============================================
   BADGE COMPONENT
   ============================================ */

export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  dot = false,
  className = '',
  ...props 
}) => {
  return (
    <span 
      className={`admin-badge admin-badge-${variant} admin-badge-${size} ${dot ? 'admin-badge-dot' : ''} ${className}`}
      {...props}
    >
      {dot && <span className="admin-badge-dot-indicator" />}
      {children}
    </span>
  );
};

/* ============================================
   AVATAR COMPONENT
   ============================================ */

export const Avatar = ({ 
  src, 
  alt = '', 
  size = 'md', 
  fallback,
  className = '',
  ...props 
}) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className={`admin-avatar admin-avatar-${size} ${className}`} {...props}>
      {src && !imageError ? (
        <img 
          src={src} 
          alt={alt} 
          onError={() => setImageError(true)}
          className="admin-avatar-img"
        />
      ) : (
        <span className="admin-avatar-fallback">
          {fallback || (alt ? alt.charAt(0).toUpperCase() : '?')}
        </span>
      )}
    </div>
  );
};

/* ============================================
   MODAL COMPONENT
   ============================================ */

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={handleOverlayClick}>
      <div className={`admin-modal admin-modal-${size} ${className}`}>
        <div className="admin-modal-header">
          {title && <h2 className="admin-modal-title">{title}</h2>}
          {showCloseButton && (
            <button className="admin-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>
        <div className="admin-modal-body">
          {children}
        </div>
        {footer && (
          <div className="admin-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================
   TABLE COMPONENT
   ============================================ */

export const Table = ({ 
  columns = [], 
  data = [], 
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  onRowClick,
  className = '',
}) => {
  return (
    <div className={`admin-table-container ${className}`}>
      <table className="admin-table">
        <thead className="admin-table-head">
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index} 
                className="admin-table-header"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="admin-table-body">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="admin-table-loading">
                <div className="admin-spinner" />
                <span>Đang tải...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="admin-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={`admin-table-row ${onRowClick ? 'clickable' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="admin-table-cell">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

/* ============================================
   TABS COMPONENT
   ============================================ */

export const Tabs = ({ 
  tabs = [], 
  activeTab, 
  onChange,
  className = '',
}) => {
  return (
    <div className={`admin-tabs ${className}`}>
      <div className="admin-tabs-list">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`admin-tab ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => onChange(tab.value)}
          >
            {tab.icon && <span className="admin-tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <Badge variant="primary" size="sm">{tab.badge}</Badge>
            )}
          </button>
        ))}
      </div>
      <div className="admin-tabs-content">
        {tabs.find(tab => tab.value === activeTab)?.content}
      </div>
    </div>
  );
};

/* ============================================
   STAT CARD COMPONENT
   ============================================ */

export const StatCard = ({ 
  title, 
  value, 
  icon,
  trend,
  trendValue,
  color = 'blue',
  onClick,
  className = '',
}) => {
  return (
    <div 
      className={`admin-stat-card admin-stat-card-${color} ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="admin-stat-card-content">
        <div className="admin-stat-card-info">
          <span className="admin-stat-card-title">{title}</span>
          <span className="admin-stat-card-value">{value}</span>
          {trend && (
            <div className={`admin-stat-card-trend ${trend === 'up' ? 'positive' : 'negative'}`}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </div>
          )}
        </div>
        {icon && (
          <div className="admin-stat-card-icon">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================
   ALERT COMPONENT
   ============================================ */

export const Alert = ({ 
  type = 'info', 
  title,
  children,
  onClose,
  className = '',
}) => {
  const icons = {
    info: <Info size={20} />,
    success: <CheckCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    error: <AlertCircle size={20} />,
  };

  return (
    <div className={`admin-alert admin-alert-${type} ${className}`}>
      <div className="admin-alert-icon">{icons[type]}</div>
      <div className="admin-alert-content">
        {title && <div className="admin-alert-title">{title}</div>}
        <div className="admin-alert-message">{children}</div>
      </div>
      {onClose && (
        <button className="admin-alert-close" onClick={onClose}>
          <X size={16} />
        </button>
      )}
    </div>
  );
};

/* ============================================
   LOADING SPINNER COMPONENT
   ============================================ */

export const LoadingSpinner = ({ size = 'md', text, className = '' }) => {
  return (
    <div className={`admin-loading-container ${className}`}>
      <div className={`admin-spinner admin-spinner-${size}`} />
      {text && <span className="admin-loading-text">{text}</span>}
    </div>
  );
};

/* ============================================
   EMPTY STATE COMPONENT
   ============================================ */

export const EmptyState = ({ 
  icon, 
  title, 
  description,
  action,
  className = '' 
}) => {
  return (
    <div className={`admin-empty-state ${className}`}>
      {icon && <div className="admin-empty-state-icon">{icon}</div>}
      {title && <h3 className="admin-empty-state-title">{title}</h3>}
      {description && <p className="admin-empty-state-description">{description}</p>}
      {action && <div className="admin-empty-state-action">{action}</div>}
    </div>
  );
};

/* ============================================
   PAGINATION COMPONENT
   ============================================ */

export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = '' 
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`admin-pagination ${className}`}>
      <button
        className="admin-pagination-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Trước
      </button>
      
      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={index} className="admin-pagination-ellipsis">...</span>
        ) : (
          <button
            key={index}
            className={`admin-pagination-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      ))}
      
      <button
        className="admin-pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Sau
      </button>
    </div>
  );
};
