import React from 'react';
import OptimizedSidebar from '../components/OptimizedSidebar';
import Header from '../components/Header';
import DashboardStudentImproved from './student/DashboardStudentImproved';
import ActivitiesList from './student/ActivitiesList';
import MyActivities from './student/MyActivities';
import Scores from './student/Scores';
import MonitorDashboard from './monitor/MonitorDashboard';
import ClassActivities from './monitor/ClassActivities';
import ClassApprovals from './monitor/ClassApprovals';
import ClassStudents from './monitor/ClassStudents';
import ClassReports from './monitor/ClassReports';
import ClassNotifications from './monitor/ClassNotifications';
import ManageActivity from './ManageActivity';
import QRScanner from './QRScanner';
import QRAttendanceManagement from './QRAttendanceManagement';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import http from '../services/http';

export default function Dashboard() {
  const [profile, setProfile] = React.useState(null);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const location = useLocation();

  React.useEffect(function load(){
    // Only load profile if not already loaded
    if (profileLoaded) return;
    
    let mounted = true;
    http.get('/auth/profile')
      .then(function(res){ 
        if(!mounted) return; 
        setProfile(res.data?.data || null);
        setProfileLoaded(true);
      })
      .catch(function(err){ 
        if(!mounted) return;
        console.warn('Failed to load profile:', err.message);
        setProfileLoaded(true);
      });
    return function(){ mounted = false; };
  }, [profileLoaded]);

  const role = (profile?.role || profile?.vai_tro?.ten_vt || 'student').toLowerCase();
  
  // Debug info for troubleshooting
  console.log('Dashboard Debug:', { profile, role });

  // Debug current path + role
  const path = location.pathname || '';
  console.log('Dashboard Route Debug:', { path, role });

  // If role is teacher, keep class management routes working under this layout
  if (role === 'giang_vien' || role === 'teacher') {
    const isClassSection = path.startsWith('/class/');
    const isMonitorSection = path.startsWith('/monitor');
    if (!isClassSection && !isMonitorSection && !path.startsWith('/activities')) {
      return React.createElement(Navigate, { to: '/teacher', replace: true });
    }
  }

  // Determine default dashboard based on role (student by default)
  const getDefaultDashboard = () => {
    if (role === 'lop_truong' || role === 'monitor') {
      return React.createElement(MonitorDashboard);
    }
    // Student default
    return React.createElement(DashboardStudentImproved);
  };

  try {
    return React.createElement(
      'div',
      { className: 'min-h-screen bg-gray-50' },
      [
        React.createElement(Header, { key: 'hdr' }),
        React.createElement('div', { key: 'body', className: 'flex' }, [
          React.createElement(OptimizedSidebar, { key: 'sb', role: role }),
          React.createElement('main', { key: 'main', className: 'flex-1 p-6' }, [
          // Force render class-management pages directly to avoid nested route mismatches
          path.startsWith('/class/activities') ? React.createElement(ClassActivities, { key: 'class-activities' }) :
          path.startsWith('/class/approvals') ? React.createElement(ClassApprovals, { key: 'class-approvals' }) :
          path.startsWith('/class/students') ? React.createElement(ClassStudents, { key: 'class-students' }) :
          path.startsWith('/class/reports') ? React.createElement(ClassReports, { key: 'class-reports' }) :
          path.startsWith('/class/notifications') ? React.createElement(ClassNotifications, { key: 'class-notifications' }) :
          path.startsWith('/monitor') ? React.createElement(MonitorDashboard, { key: 'monitor-dashboard' }) :
          // Otherwise use routes for student/common pages
          React.createElement(Routes, { key: 'r' }, [
            React.createElement(Route, { key: 'root', index: true, element: getDefaultDashboard() }),
            // Student routes (relative)
            React.createElement(Route, { key: 'activities', path: 'activities', element: React.createElement(ActivitiesList) }),
            React.createElement(Route, { key: 'my', path: 'my-activities', element: React.createElement(MyActivities) }),
            React.createElement(Route, { key: 'scores', path: 'scores', element: React.createElement(Scores) }),
            React.createElement(Route, { key: 'qr-scanner', path: 'qr-scanner', element: React.createElement(QRScanner) }),
            // Monitor tools under this layout when accessed via root
            React.createElement(Route, { key: 'create-activity', path: 'activities/create', element: React.createElement(ManageActivity) }),
            React.createElement(Route, { key: 'qr-management', path: 'qr-management', element: React.createElement(QRAttendanceManagement) }),
            React.createElement(Route, { key: 'fallback', path: '*', element: getDefaultDashboard() })
          ])
        ])
      ])
    ]
  );
  } catch (error) {
    console.error('Dashboard render error:', error);
    return React.createElement('div', { className: 'min-h-screen bg-gray-50 flex items-center justify-center' }, [
      React.createElement('div', { className: 'text-center' }, [
        React.createElement('h1', { className: 'text-2xl font-bold text-red-600 mb-4' }, 'Có lỗi xảy ra'),
        React.createElement('p', { className: 'text-gray-600 mb-4' }, error.message || 'Lỗi không xác định'),
        React.createElement('button', { 
          onClick: () => window.location.reload(),
          className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
        }, 'Thử lại')
      ])
    ]);
  }
}


