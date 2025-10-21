import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Award, Settings } from 'lucide-react';

export default function ProfileTabs() {
  const location = useLocation();
  
  const tabs = [
    {
      id: 'overview',
      label: 'Tổng quan',
      path: '/profile',
      icon: Award,
      description: 'Điểm rèn luyện & Hoạt động'
    },
    {
      id: 'info',
      label: 'Thông tin cá nhân',
      path: '/profile/user',
      icon: User,
      description: 'Cập nhật thông tin cá nhân'
    },
    {
      id: 'points',
      label: 'Điểm chi tiết',
      path: '/profile/points',
      icon: Settings,
      description: 'Xem điểm rèn luyện chi tiết'
    }
  ];

  const isActive = (path) => {
    if (path === '/profile') {
      return location.pathname === '/profile';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const active = isActive(tab.path);
            
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                  ${active
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <IconComponent 
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{tab.label}</span>
                  <span className={`text-xs ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                    {tab.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}