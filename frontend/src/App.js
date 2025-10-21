import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { normalizeRole, roleMatches } from './utils/role';
import './styles/sidebar-fix.css';
import './styles/layout-fix.css';
import './styles/modern-admin.css';
import MultiSessionGuard from './components/MultiSessionGuard';
import sessionStorageManager from './services/sessionStorageManager';
import { TabSessionProvider } from './contexts/TabSessionContext';
// import AdminLayout from './components/AdminLayout';
// import SimpleAdminLayout from './components/SimpleAdminLayout';
import AdminStudentLayout from './components/AdminStudentLayout';
import MonitorLayout from './components/MonitorLayout';
import StudentLayout from './components/StudentLayout';
// Active admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminActivities from './pages/admin/AdminActivitiesModern';
import AdminRegistrations from './pages/admin/AdminRegistrationsModern';
import AdminQRAttendance from './pages/admin/AdminQRAttendance';
import AdminReports from './pages/admin/AdminReports';
import AdminRoles from './pages/admin/AdminRoles';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProfile from './pages/admin/AdminProfile';
import SemesterManagement from './pages/admin/SemesterManagement';
import ModernTeacherLayout from './components/ModernTeacherLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import UserProfile from './pages/profile/UserProfile';
import StudentPointsModern from './pages/profile/StudentPointsModern';
import ManageActivity from './pages/ManageActivity';
import ActivityDetail from './pages/student/ActivityDetail';
// import DashboardStudentImproved from './pages/student/DashboardStudentImproved';
import StudentDashboardModern from './pages/student/DashboardStudentModern';
// import ActivitiesList from './pages/student/ActivitiesList';
import ActivitiesListModern from './pages/student/ActivitiesListModern';
// import MyActivities from './pages/student/MyActivities';
import MyActivitiesModern from './pages/student/MyActivitiesModern';
import StudentProfile from './pages/student/StudentProfile';
import Scores from './pages/student/Scores';
import QRScannerModern from './pages/QRScannerModern';
import QRAttendanceManagement from './pages/QRAttendanceManagement';
import ModernTeacherDashboard from './pages/teacher/ModernTeacherDashboard';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherPreferences from './pages/teacher/TeacherPreferences';
import ModernActivityApproval from './pages/teacher/ModernActivityApproval';
import TeacherRegistrationApprovalsModern from './pages/teacher/TeacherRegistrationApprovalsModern';
import ModernStudentManagement from './pages/teacher/ModernStudentManagement';
import ImportStudents from './pages/teacher/ImportStudents';
import ClassManagement from './pages/teacher/ClassManagement';
import ModernReports from './pages/teacher/ModernReports';
import ModernNotifications from './pages/teacher/ModernNotifications';
import ActivityTypeManagement from './pages/teacher/ActivityTypeManagement';
import TeacherActivities from './pages/teacher/TeacherActivities';
import MonitorDashboard from './pages/monitor/MonitorDashboard';
import MonitorMyActivities from './pages/monitor/MonitorMyActivities';
import MonitorMyProfile from './pages/monitor/MonitorMyProfile';
import MonitorMyCertificates from './pages/monitor/MonitorMyCertificates';
import ClassActivities from './pages/monitor/ClassActivities';
import ClassApprovalsModern from './pages/monitor/ClassApprovalsModern';
import ClassStudents from './pages/monitor/ClassStudents';
import ClassReports from './pages/monitor/ClassReports';
import ClassNotifications from './pages/monitor/ClassNotifications';
import { useAppStore } from './store/useAppStore';
import { NotificationProvider } from './contexts/NotificationContext';
// import { TabSessionProvider } from './contexts/TabSessionContext';

function RoleGuard({ allow, element }) {
  const rawRole = useAppStore(s => s.role);
  const token = useAppStore(s => s.token);
  const current = normalizeRole(rawRole);
  
  // Check authentication - ONLY check sessionStorage (tab-specific)
  if (!token) {
    console.log('[RoleGuard] No token; redirect login');
    return React.createElement(Navigate, { to: '/login', replace: true });
  }
  
  // If allow is empty array, allow all authenticated users
  if (!allow || allow.length === 0) {
    console.log('[RoleGuard] Public route - allow all authenticated users');
    return element;
  }
  
  // Check role permission
  if (!roleMatches(current, allow)) {
    console.log('[RoleGuard] Blocked role', { rawRole, current, allow });
    return React.createElement(Navigate, { to: '/', replace: true });
  }
  
  return element;
}

function StudentHome() { return React.createElement(Navigate, { to: '/student', replace: true }); }
function TeacherHome() { return React.createElement(ModernTeacherDashboard, null); }
function MonitorHome() { return React.createElement(MonitorDashboard, null); }
// function AdminHome() { 
//   return React.createElement(SimpleAdminLayout, null, React.createElement(AdminDashboard, null)); 
// }

function HomeRouter() {
  const storeRole = useAppStore(s => s.role);
  // Use ONLY tab session (no localStorage fallback)
  const session = sessionStorageManager.getSession();
  const roleFromSession = normalizeRole(session?.role);
  const finalRole = normalizeRole(storeRole || roleFromSession);
  console.log('HomeRouter Debug v3:', { storeRole, roleFromSession, finalRole, tabId: sessionStorageManager.getTabId() });
  if (finalRole === 'ADMIN') return React.createElement(Navigate, { to: '/admin', replace: true });
  if (finalRole === 'GIANG_VIEN') return React.createElement(Navigate, { to: '/teacher', replace: true });
  if (finalRole === 'LOP_TRUONG') return React.createElement(Navigate, { to: '/monitor', replace: true });
  if (finalRole === 'SINH_VIEN' || finalRole === 'STUDENT') return React.createElement(Navigate, { to: '/student', replace: true });
  return React.createElement(Navigate, { to: '/login', replace: true });
}

function App() {
  const [hydrated, setHydrated] = React.useState(false);

  // Central route change logger for deep debugging of unexpected redirects
  function RouteLogger() {
    const location = useLocation();
    const role = useAppStore(s => s.role);
    React.useEffect(() => {
      console.log('[RouteLogger] path change =>', location.pathname, 'role:', role);
    }, [location, role]);
    return null;
  }

  // Sync role/token early BEFORE first paint with tab-scoped session
  React.useLayoutEffect(() => {
    try {
      const session = sessionStorageManager.getSession();
      if (session && session.token) {
        const token = session.token;
        const user = session.user;
        const derivedRole = normalizeRole(session.role);
        if (token && derivedRole) {
          useAppStore.getState().setAuth({ token, user, role: derivedRole });
          console.log('[Hydration] Set auth from sessionStorage (tab-specific)', { derivedRole, tabId: sessionStorageManager.getTabId() });
        } else {
          console.log('[Hydration] Session data incomplete', { tokenPresent: !!token, derivedRole });
        }
      } else {
        console.log('[Hydration] No session found for tab:', sessionStorageManager.getTabId());
      }
    } catch (e) {
      console.warn('[Hydration] Failed to load session data', e);
    } finally {
      setHydrated(true);
    }
  }, []);

  if (!hydrated) {
    return React.createElement('div', { className: 'flex items-center justify-center min-h-screen text-sm text-gray-500' }, 'Đang tải phiên...');
  }

  return React.createElement(
    TabSessionProvider,
    null,
    React.createElement(
      NotificationProvider,
      null,
      React.createElement(
        BrowserRouter,
        null,
      React.createElement(
        'div',
        { style: { minHeight: '100vh' } },
        React.createElement(RouteLogger, null),
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { key: 'login', path: '/login', element: React.createElement(Login) }),
          React.createElement(Route, { key: 'register', path: '/register', element: React.createElement(Register) }),
          React.createElement(Route, { key: 'profile', path: '/profile', element: React.createElement(RoleGuard, { allow: ['STUDENT','SINH_VIEN','LOP_TRUONG','ADMIN'], element: React.createElement(Profile) }) }),
          React.createElement(Route, { key: 'user-profile', path: '/profile/user', element: React.createElement(RoleGuard, { allow: ['STUDENT','SINH_VIEN','LOP_TRUONG','ADMIN'], element: React.createElement(UserProfile) }) }),
          React.createElement(Route, { key: 'student-points', path: '/profile/points', element: React.createElement(RoleGuard, { allow: ['SINH_VIEN','STUDENT','LOP_TRUONG','GIANG_VIEN','ADMIN'], element: React.createElement(StudentPointsModern) }) }),

          // Admin layout: áp dụng mẫu sidebar kiểu sinh viên (AdminStudentLayout)
          React.createElement(Route, { key: 'admin-root', path: '/admin', element: React.createElement(RoleGuard, { allow: ['ADMIN'], element: React.createElement(AdminStudentLayout) }) }, [
            React.createElement(Route, { key: 'admin-index', index: true, element: React.createElement(AdminDashboard) }),
            React.createElement(Route, { key: 'admin-users', path: 'users', element: React.createElement(AdminUsers) }),
            React.createElement(Route, { key: 'admin-activities', path: 'activities', element: React.createElement(AdminActivities) }),
            React.createElement(Route, { key: 'admin-roles', path: 'roles', element: React.createElement(AdminRoles) }),
            React.createElement(Route, { key: 'admin-activity-create', path: 'activities/create', element: React.createElement(ManageActivity) }),
            React.createElement(Route, { key: 'admin-activity-edit', path: 'activities/:id/edit', element: React.createElement(ManageActivity) }),
            React.createElement(Route, { key: 'admin-approvals', path: 'approvals', element: React.createElement(AdminRegistrations) }),
            React.createElement(Route, { key: 'admin-reports', path: 'reports', element: React.createElement(AdminReports) }),
            React.createElement(Route, { key: 'admin-notifications', path: 'notifications', element: React.createElement(AdminNotifications) }),
            React.createElement(Route, { key: 'admin-qr-attendance', path: 'qr-attendance', element: React.createElement(AdminQRAttendance) }),
            // Admin manage Activity Types (reuse teacher page for now)
            React.createElement(Route, { key: 'admin-activity-types', path: 'activity-types', element: React.createElement(ActivityTypeManagement) }),
            React.createElement(Route, { key: 'admin-semesters', path: 'semesters', element: React.createElement(SemesterManagement) }),
            React.createElement(Route, { key: 'admin-settings', path: 'settings', element: React.createElement(AdminSettings) }),
            React.createElement(Route, { key: 'admin-profile', path: 'profile', element: React.createElement(AdminProfile) }),
          ]),

          // Teacher nested layout - Modern UI
          React.createElement(Route, { key: 'teacher-root', path: '/teacher', element: React.createElement(RoleGuard, { allow: ['GIANG_VIEN','ADMIN'], element: React.createElement(ModernTeacherLayout) }) }, [
            React.createElement(Route, { key: 'teacher-index', index: true, element: React.createElement(ModernTeacherDashboard) }),
            React.createElement(Route, { key: 'teacher-activities', path: 'activities', element: React.createElement(TeacherActivities) }),
            React.createElement(Route, { key: 'teacher-approve', path: 'approve', element: React.createElement(ModernActivityApproval) }),
            React.createElement(Route, { key: 'teacher-registrations-approve', path: 'registrations/approve', element: React.createElement(TeacherRegistrationApprovalsModern) }),
            React.createElement(Route, { key: 'teacher-types', path: 'activity-types', element: React.createElement(ActivityTypeManagement) }),
            React.createElement(Route, { key: 'teacher-students', path: 'students', element: React.createElement(ModernStudentManagement) }),
            React.createElement(Route, { key: 'teacher-students-import', path: 'students/import', element: React.createElement(ImportStudents) }),
            React.createElement(Route, { key: 'teacher-classes-redirect', path: 'classes', element: React.createElement(Navigate, { to: '/teacher/students', replace: true }) }),
            React.createElement(Route, { key: 'teacher-notifications', path: 'notifications', element: React.createElement(ModernNotifications) }),
            React.createElement(Route, { key: 'teacher-reports', path: 'reports', element: React.createElement(ModernReports) }),
          React.createElement(Route, { key: 'teacher-reports-export', path: 'reports/export', element: React.createElement(ModernReports) }),
            React.createElement(Route, { key: 'teacher-profile', path: 'profile', element: React.createElement(TeacherProfile) }),
          React.createElement(Route, { key: 'teacher-notifications-create', path: 'notifications/create', element: React.createElement(ModernNotifications) }),
            React.createElement(Route, { key: 'teacher-preferences', path: 'preferences', element: React.createElement(TeacherPreferences) })
          ]),

          // Monitor nested layout
          React.createElement(Route, { key: 'monitor-root', path: '/monitor', element: React.createElement(RoleGuard, { allow: ['LOP_TRUONG','GIANG_VIEN','ADMIN'], element: React.createElement(MonitorLayout) }) }, [
            React.createElement(Route, { key: 'monitor-index', index: true, element: React.createElement(MonitorHome) }),
            // Personal section (Student features for Monitor)
            React.createElement(Route, { key: 'monitor-my-activities', path: 'my-activities', element: React.createElement(MonitorMyActivities) }),
            React.createElement(Route, { key: 'monitor-qr-scanner', path: 'qr-scanner', element: React.createElement(QRScannerModern) }),
            React.createElement(Route, { key: 'monitor-my-profile', path: 'my-profile', element: React.createElement(MonitorMyProfile) }),
            React.createElement(Route, { key: 'monitor-my-certificates', path: 'my-certificates', element: React.createElement(MonitorMyCertificates) }),
            // Class management section
            React.createElement(Route, { key: 'class-activities', path: 'activities', element: React.createElement(ClassActivities) }),
            React.createElement(Route, { key: 'class-activity-create', path: 'activities/create', element: React.createElement(RoleGuard, { allow: ['LOP_TRUONG','ADMIN'], element: React.createElement(ManageActivity) }) }),
            React.createElement(Route, { key: 'class-approvals', path: 'approvals', element: React.createElement(ClassApprovalsModern) }),
            React.createElement(Route, { key: 'class-students', path: 'students', element: React.createElement(ClassStudents) }),
            React.createElement(Route, { key: 'class-reports', path: 'reports', element: React.createElement(ClassReports) }),
            React.createElement(Route, { key: 'class-notifications', path: 'notifications', element: React.createElement(ClassNotifications) }),
          ]),

          // Student nested layout - Modern UI
          React.createElement(Route, { key: 'student-root', path: '/student', element: React.createElement(RoleGuard, { allow: ['SINH_VIEN','STUDENT','LOP_TRUONG'], element: React.createElement(StudentLayout) }) }, [
            React.createElement(Route, { key: 'student-index', index: true, element: React.createElement(StudentDashboardModern) }),
            React.createElement(Route, { key: 'student-activities', path: 'activities', element: React.createElement(ActivitiesListModern) }),
            React.createElement(Route, { key: 'student-my-activities', path: 'my-activities', element: React.createElement(MyActivitiesModern) }),
            React.createElement(Route, { key: 'student-scores', path: 'scores', element: React.createElement(Scores) }),
            React.createElement(Route, { key: 'student-profile', path: 'profile', element: React.createElement(StudentProfile) }),
            React.createElement(Route, { key: 'student-qr-scanner', path: 'qr-scanner', element: React.createElement(QRScannerModern) }),
          ]),

          // Common routes
          React.createElement(Route, { key: 'create-activity', path: '/activities/create', element: React.createElement(RoleGuard, { allow: ['GIANG_VIEN','LOP_TRUONG','ADMIN'], element: React.createElement(ManageActivity) }) }),
          React.createElement(Route, { key: 'edit-activity', path: '/activities/edit/:id', element: React.createElement(RoleGuard, { allow: ['GIANG_VIEN','LOP_TRUONG','ADMIN'], element: React.createElement(ManageActivity) }) }),
          React.createElement(Route, { key: 'activity-detail', path: '/activities/:id', element: React.createElement(RoleGuard, { allow: [], element: React.createElement(ActivityDetail) }) }),
          // (Re-added) Root-level QR Scanner fallback route to bypass potential nested routing edge cases.
          // Accessible by students and monitors. If nested route fails, this ensures accessibility.
          React.createElement(Route, { key: 'qr-scanner-root', path: '/qr-scanner', element: React.createElement(RoleGuard, { allow: ['SINH_VIEN','STUDENT','LOP_TRUONG'], element: React.createElement(QRScannerModern) }) }),
          React.createElement(Route, { key: 'qr-management', path: '/qr-management', element: React.createElement(RoleGuard, { allow: ['GIANG_VIEN','LOP_TRUONG','ADMIN'], element: React.createElement(QRAttendanceManagement) }) }),

          React.createElement(Route, { key: 'router-catchall', path: '*', element: React.createElement(RoleGuard, { allow: ['ADMIN','GIANG_VIEN','LOP_TRUONG','SINH_VIEN','STUDENT'], element: React.createElement(HomeRouter) }) })
        )
      )
    )
    )
  );
}

export default App;
