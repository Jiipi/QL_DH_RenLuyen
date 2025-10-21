import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import http from '../services/http';
import { useAppStore } from '../store/useAppStore';
import sessionStorageManager from '../services/sessionStorageManager';
import { useTabSession } from '../contexts/TabSessionContext';
import { normalizeRole } from '../utils/role';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAppStore(function(s){ return s.setAuth; });
  const { saveSession: saveTabSession } = useTabSession();
  const [formData, setFormData] = React.useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);
  // Production login: no demo accounts, no extra fetching

  function handleInputChange(e) {
    const name = e.target.name;
    const value = e.target.value;
    setFormData(function update(prev) {
      return Object.assign({}, prev, { [name]: value });
    });
    if (errors[name]) {
      setErrors(function clear(prev) {
        var next = Object.assign({}, prev);
        delete next[name];
        return next;
      });
    }
  }

  // Removed loginWithDemo – production UI does not expose demo users

  function validateForm() {
    var newErrors = {};
    if (!formData.username) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập hoặc email';
    }
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // FIX: Chỉ trim, KHÔNG toLowerCase để tránh lỗi login khác nhau giữa PC và mobile
      var res = await http.post('/auth/login', { 
        maso: String(formData.username || '').trim(), 
        password: formData.password 
      });
      var data = res.data?.data || res.data;
      var token = data?.token || data?.data?.token;
      if (token) {
        var user = data?.user || null;
        var roleRaw = (user?.role || user?.roleCode || '').toString();
        var role = normalizeRole(roleRaw);
        
        // Save session tab + backup to localStorage để tab mới có thể khởi tạo session
        saveTabSession({ token, user, role });
        try {
          window.localStorage.setItem('token', token);
          window.localStorage.setItem('user', JSON.stringify(user));
        } catch(_) {}
        
        // Set auth in Zustand store
        try { setAuth({ token, user, role }); } catch(_) {}
        
        var target = '/';
        if (role === 'ADMIN') target = '/admin';
        else if (role === 'GIANG_VIEN') target = '/teacher';
        else if (role === 'LOP_TRUONG') target = '/monitor';
        else if (role === 'SINH_VIEN' || role === 'STUDENT') target = '/student';
        
        console.log('[Login] Logged in with role:', role, 'to tab:', sessionStorageManager.getTabId());
        navigate(target);
      } else {
        setErrors({ submit: 'Đăng nhập thất bại' });
      }
    } catch (err) {
      var status = err?.response?.status;
      var backendMsg = err?.response?.data?.message;
      var message;
      if (status === 401) {
        message = backendMsg || 'Sai tên đăng nhập hoặc mật khẩu';
      } else if (status === 500) {
        message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
      } else {
        message = backendMsg || 'Đăng nhập không thành công. Vui lòng kiểm tra thông tin.';
      }
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
    }
  }

  const submitError = errors.submit
    ? React.createElement(
        'div',
        { className: 'rounded-md bg-red-50 p-4' },
        React.createElement('div', { className: 'text-sm text-red-700' }, errors.submit)
      )
    : null;

  // Left: Form per requested design with enhanced UI
  const leftForm = React.createElement(
    'div',
    { className: 'flex-1 w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-white' },
    React.createElement(
      'div',
      { className: 'w-full max-w-md animate-fade-in' },
      [
        React.createElement(
          'div',
          { key: 'hdr', className: 'mb-8 text-center md:text-left' },
          [
            React.createElement('div', { key: 'logo-mobile', className: 'mb-4 md:hidden flex justify-center' }, 
              React.createElement('img', {
                src: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/a409cac8-3a40-4097-9461-db92841b1a22.png',
                alt: 'Logo',
                className: 'w-16 h-16 rounded-xl shadow-lg object-cover',
              })
            ),
            React.createElement('h1', { key: 'h1', className: 'text-3xl md:text-4xl font-bold text-gray-900 mb-2' }, 'Đăng nhập'),
            React.createElement('p', { key: 'p', className: 'text-gray-600 text-sm md:text-base' }, 'Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn.'),
          ]
        ),
        React.createElement(
          'form',
          { key: 'form', className: 'space-y-6', onSubmit: handleSubmit },
          [
            // Username/email
            React.createElement(
              'div',
              { key: 'user' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'username', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tên đăng nhập hoặc Email'),
                React.createElement(
                  'div',
                  { key: 'wrap', className: 'relative' },
                  [
                    React.createElement(Mail, { key: 'icon', className: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' }),
                    React.createElement('input', {
                      key: 'i',
                      id: 'username',
                      type: 'text',
                      value: formData.username || '',
                      onChange: function onChange(e) { handleInputChange(e); },
                      name: 'username',
                      autoCapitalize: 'none',
                      autoCorrect: 'off',
                      spellCheck: false,
                      inputMode: 'text',
                      autoComplete: 'username',
                      className: 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors',
                      placeholder: 'Nhập tên đăng nhập hoặc email',
                      required: true,
                    }),
                  ]
                ),
                errors.username
                  ? React.createElement('p', { key: 'e', className: 'mt-1 text-sm text-red-600' }, errors.username)
                  : null,
              ]
            ),
            // Password
            React.createElement(
              'div',
              { key: 'pass' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'password', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Mật khẩu'),
                React.createElement(
                  'div',
                  { key: 'wrap', className: 'relative' },
                  [
                    React.createElement(Lock, { key: 'icon', className: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' }),
                    React.createElement('input', {
                      key: 'i',
                      id: 'password',
                      type: showPassword ? 'text' : 'password',
                      value: formData.password || '',
                      onChange: function onChange(e) { handleInputChange(e); },
                      name: 'password',
                      autoCapitalize: 'none',
                      autoCorrect: 'off',
                      spellCheck: false,
                      autoComplete: 'current-password',
                      className: 'w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors',
                      placeholder: 'Nhập mật khẩu',
                      required: true,
                    }),
                    React.createElement(
                      'button',
                      { key: 'btn', type: 'button', onClick: function onClick() { setShowPassword(!showPassword); }, className: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors' },
                      showPassword ? React.createElement(EyeOff, { className: 'h-5 w-5' }) : React.createElement(Eye, { className: 'h-5 w-5' })
                    ),
                  ]
                ),
                errors.password
                  ? React.createElement('p', { key: 'e', className: 'mt-1 text-sm text-red-600' }, errors.password)
                  : null,
              ]
            ),
            // Submit error
            submitError,
            // Submit button with loading animation
            React.createElement(
              'button',
              { 
                key: 'submit', 
                type: 'submit', 
                className: 'w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl', 
                disabled: isLoading 
              },
              isLoading ? 
                React.createElement('span', { className: 'flex items-center justify-center' }, [
                  React.createElement('svg', { key: 'spinner', className: 'animate-spin -ml-1 mr-3 h-5 w-5 text-white', xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24' }, [
                    React.createElement('circle', { key: 'c1', className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
                    React.createElement('path', { key: 'p1', className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
                  ]),
                  React.createElement('span', { key: 'txt' }, 'Đang đăng nhập...')
                ]) : 
                'Đăng nhập'
            ),
            // Links
            React.createElement(
              'div',
              { key: 'links', className: 'text-center space-y-3' },
              [
                React.createElement('a', { key: 'forgot', href: '#forgot-password', className: 'text-sm text-blue-600 hover:text-blue-800 transition-colors' }, 'Quên mật khẩu?'),
                React.createElement(
                  'div',
                  { key: 'signup', className: 'text-gray-600 text-sm' },
                  [
                    React.createElement('span', { key: 'txt' }, 'Chưa có tài khoản? '),
                    React.createElement('a', { key: 'a', href: '/register', className: 'text-blue-600 hover:text-blue-800 font-semibold transition-colors' }, 'Đăng ký')
                  ]
                ),
              ]
            ),
          ]
        ),
      ]
    )
  );

  // Right: Branding panel (no demo list)
  const rightPanel = React.createElement(
    'div',
    { className: 'hidden md:flex flex-1 w-full md:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white p-6 md:p-12 lg:p-16 flex-col justify-center items-center overflow-hidden relative' },
    [
      // Animated background circles
      React.createElement('div', { key: 'bg1', className: 'absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse' }),
      React.createElement('div', { key: 'bg2', className: 'absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000' }),
      React.createElement(
      'div',
      { key: 'content', className: 'text-center max-w-md relative z-10' },
      [
        React.createElement(
          'div',
          { key: 'logo', className: 'mb-8' },
          React.createElement('img', {
            src: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/a409cac8-3a40-4097-9461-db92841b1a22.png',
            alt: 'Logo của ứng dụng với thiết kế hiện đại và màu sắc tươi sáng',
            className: 'mx-auto w-24 h-24 rounded-xl shadow-lg object-cover',
          })
        ),
        React.createElement('div', { key: 'brand', className: 'bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg w-full text-left space-y-3' }, [
          React.createElement('h2', { key: 't', className: 'text-xl font-semibold' }, 'Hệ thống quản lý hoạt động rèn luyện'),
          React.createElement('p', { key: 'd', className: 'text-sm text-blue-100' }, 'Theo dõi, đăng ký, phê duyệt và thống kê hoạt động rèn luyện một cách nhanh chóng và hiệu quả.'),
        ]),
        React.createElement(
          'div',
          { key: 'more', className: 'mt-8 text-blue-100' },
          [
            React.createElement('h3', { key: 'h', className: 'font-semibold mb-2' }, 'Tính năng nổi bật'),
            React.createElement('ul', { key: 'ul', className: 'text-sm space-y-1' }, [
              React.createElement('li', { key: '1' }, '• Quản lý dữ liệu thông minh'),
              React.createElement('li', { key: '2' }, '• Giao diện thân thiện người dùng'),
              React.createElement('li', { key: '3' }, '• Bảo mật cao'),
            ]),
          ]
        ),
      ]
    ),
    ]
  );

  return React.createElement('div', { className: 'min-h-screen w-full bg-gray-50 flex flex-col md:flex-row items-stretch' }, [leftForm, rightPanel]);
}


