import React from 'react';

export default function EmptyState(props){
  const { icon, title, description, action } = props;
  return (
    <div className="text-center text-sm text-gray-600 p-8">
      <div className="flex items-center justify-center mb-2">
        {icon || <span>☁️</span>}
      </div>
      <div className="font-medium mb-1">{title || 'Không có dữ liệu'}</div>
      {description && <div className="mb-3">{description}</div>}
      {action}
    </div>
  );
}

