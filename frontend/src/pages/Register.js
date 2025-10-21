import React from 'react';
import http from '../services/http';

const defaultRoles = [];

export default function RegisterPage() {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [role, setRole] = React.useState('');
  const [roles, setRoles] = React.useState(defaultRoles);
  const [faculty, setFaculty] = React.useState('');
  const [faculties, setFaculties] = React.useState([]);
  const [classOptions, setClassOptions] = React.useState([]);
  const [classId, setClassId] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  React.useEffect(function loadRoles(){
    let mounted = true;
    http.get('/auth/roles')
      .then(function(res){ if(!mounted) return; setRoles(res.data?.data || []); })
      .catch(function(){ setRoles([]); });
    return function(){ mounted = false; };
  }, []);
  React.useEffect(function loadFaculties(){
    let mounted = true;
    http.get('/auth/faculties')
      .then(function(res){ if(!mounted) return; setFaculties(res.data?.data || []); })
      .catch(function(){ setFaculties([]); });
    return function(){ mounted = false; };
  }, []);
  React.useEffect(function loadClasses(){
    if(!faculty){ setClassOptions([]); setClassId(''); return; }
    let mounted = true;
    http.get('/auth/classes', { params: { faculty: faculty } })
      .then(function(res){ if(!mounted) return; setClassOptions(res.data?.data || []); })
      .catch(function(){ setClassOptions([]); });
    return function(){ mounted = false; };
  }, [faculty]);
  const [fullName, setFullName] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [classMonitorInfo, setClassMonitorInfo] = React.useState(null);

  const isNonAdmin = role && role !== 'admin';

  // Kiểm tra lớp có lớp trưởng chưa
  function checkClassMonitor(lopId) {
    if (!lopId || role !== 'LOP_TRUONG') {
      setClassMonitorInfo(null);
      return;
    }
    
    http.get(`/users/check-class-monitor/${lopId}`)
      .then(function(res) {
        const data = res.data;
        if (data && data.success) {
          setClassMonitorInfo(data.data);
        }
      })
      .catch(function(err) {
        console.error('Error checking class monitor:', err);
        setClassMonitorInfo(null);
      });
  }

  // Effect để kiểm tra khi chọn lớp
  React.useEffect(function() {
    if (classId && role === 'LOP_TRUONG') {
      checkClassMonitor(classId);
    } else {
      setClassMonitorInfo(null);
    }
  }, [classId, role]);

  function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      alert('Mật khẩu và xác nhận mật khẩu không khớp!');
      return;
    }
    
    // Kiểm tra nếu là lớp trưởng và lớp đã có lớp trưởng
    if (role === 'LOP_TRUONG' && classMonitorInfo && classMonitorInfo.hasMonitor) {
      setError(`Lớp ${classMonitorInfo.lop?.ten_lop || 'N/A'} đã có lớp trưởng: ${classMonitorInfo.monitor?.ho_ten || 'N/A'}`);
      return;
    }
    
    setSubmitting(true);
    http.post('/users/register', {
      ten_dn: username,
      mat_khau: password,
      email: email,
      ho_ten: fullName || username,
      vai_tro: role || 'SINH_VIEN',
      lop_id: classId || undefined,
      khoa: faculty || undefined
    }).then(function(res){
      const data = res.data;
      if (data && data.success) {
        setSuccess('Đăng ký thành công! Đang chuyển đến đăng nhập...');
        setTimeout(function(){ window.location.href = '/login'; }, 1000);
      } else {
        setError(data?.message || 'Đăng ký thất bại');
      }
    }).catch(function(err){
      var msg = err?.response?.data?.message || 'Lỗi server, vui lòng thử lại sau';
      var firstValidation = err?.response?.data?.errors?.[0]?.message;
      setError(firstValidation || msg);
    }).finally(function(){
      setSubmitting(false);
    });
  }

  const leftForm = React.createElement(
    'div',
    { className: 'flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16' },
    React.createElement(
      'div',
      { className: 'w-full max-w-md' },
      [
        React.createElement('h1', { key: 'h', className: 'text-3xl font-bold text-gray-900 mb-6 text-center md:text-left' }, 'Đăng ký'),
        React.createElement(
          'form',
          { key: 'f', onSubmit: handleRegister, className: 'space-y-6' },
          [
            // Username
            React.createElement(
              'div',
              { key: 'u' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'username', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tên đăng nhập'),
                React.createElement('input', {
                  key: 'i', id: 'username', type: 'text', value: username,
                  onChange: function onChange(e){ setUsername(e.target.value); },
                  placeholder: 'Nhập tên đăng nhập', required: true,
                  pattern: '\\d{7}',
                  title: 'Mã số sinh viên phải có đúng 7 chữ số',
                  className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                })
              ]
            ),
            // Email
            React.createElement(
              'div',
              { key: 'e' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'email', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Email'),
                React.createElement('input', {
                  key: 'i', id: 'email', type: 'email', value: email,
                  onChange: function onChange(e){ setEmail(e.target.value); },
                  placeholder: 'Nhập email', required: true,
                  className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                })
              ]
            ),
            // Password
            React.createElement(
              'div',
              { key: 'p' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'password', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Mật khẩu'),
                React.createElement(
                  'div',
                  { key: 'w', className: 'relative' },
                  [
                    React.createElement('input', {
                      key: 'i', id: 'password', type: showPassword ? 'text' : 'password', value: password,
                      onChange: function onChange(e){ setPassword(e.target.value); }, placeholder: 'Nhập mật khẩu', required: true,
                      className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12'
                    }),
                    React.createElement('button', {
                      key: 'btn', type: 'button', onClick: function onClick(){ setShowPassword(!showPassword); },
                      className: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors',
                      'aria-label': showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                    }, showPassword ?
                      React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                        [
                          React.createElement('path', { key: 'p1', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.96 9.96 0 012.175-6.125' }),
                          React.createElement('path', { key: 'p2', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }),
                          React.createElement('path', { key: 'p3', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M3 3l18 18' })
                        ])
                      :
                      React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                        [
                          React.createElement('path', { key: 'p1', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }),
                          React.createElement('path', { key: 'p2', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' })
                        ])
                    )
                  ]
                )
              ]
            ),
            // Confirm Password
            React.createElement(
              'div',
              { key: 'cp' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'confirmPassword', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Nhập lại mật khẩu'),
                React.createElement(
                  'div',
                  { key: 'w', className: 'relative' },
                  [
                    React.createElement('input', {
                      key: 'i', id: 'confirmPassword', type: showConfirmPassword ? 'text' : 'password', value: confirmPassword,
                      onChange: function onChange(e){ setConfirmPassword(e.target.value); }, placeholder: 'Nhập lại mật khẩu', required: true,
                      className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12'
                    }),
                    React.createElement('button', {
                      key: 'btn', type: 'button', onClick: function onClick(){ setShowConfirmPassword(!showConfirmPassword); },
                      className: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors',
                      'aria-label': showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                    }, showConfirmPassword ?
                      React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                        [
                          React.createElement('path', { key: 'p1', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.96 9.96 0 012.175-6.125' }),
                          React.createElement('path', { key: 'p2', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }),
                          React.createElement('path', { key: 'p3', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M3 3l18 18' })
                        ])
                      :
                      React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                        [
                          React.createElement('path', { key: 'p1', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }),
                          React.createElement('path', { key: 'p2', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' })
                        ])
                    )
                  ]
                )
              ]
            ),
            // Role
            React.createElement(
              'div',
              { key: 'r' },
              [
                React.createElement('label', { key: 'l', htmlFor: 'role', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Chọn vai trò'),
                React.createElement(
                  'select',
                  {
                    key: 's', id: 'role', value: role,
                    onChange: function onChange(e){ setRole(e.target.value); }, required: true,
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                  },
                  [
                    React.createElement('option', { key: 'none', value: '', disabled: true }, '-- Chọn vai trò --'),
                    roles.map(function(r, index){ return React.createElement('option', { key: r.value || `role-${index}`, value: r.value }, r.label); })
                  ]
                )
              ]
            ),
            // Conditional fields for non-admin
            isNonAdmin ? React.createElement(React.Fragment, { key: 'extra' }, [
              React.createElement(
                'div',
                { key: 'fn' },
                [
                  React.createElement('label', { key: 'l', htmlFor: 'fullName', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Họ và tên'),
                  React.createElement('input', { key: 'i', id: 'fullName', type: 'text', value: fullName, onChange: function onChange(e){ setFullName(e.target.value); }, placeholder: 'Nhập họ và tên', required: isNonAdmin, className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors' })
                ]
              ),
              React.createElement(
                'div',
                { key: 'fc' },
                [
                  React.createElement('label', { key: 'l', htmlFor: 'faculty', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Khoa'),
                  React.createElement(
                    'select',
                    {
                      key: 's', id: 'faculty', value: faculty, onChange: function onChange(e){ setFaculty(e.target.value); }, required: isNonAdmin,
                      className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                    },
                    [
                      React.createElement('option', { key: 'none', value: '', disabled: true }, '-- Chọn khoa --'),
                      faculties.map(function(f, index){ return React.createElement('option', { key: f.value || `faculty-${index}`, value: f.value }, f.label); })
                    ]
                  )
                ]
              ),
              React.createElement(
                'div',
                { key: 'cl' },
                [
                  React.createElement('label', { key: 'l', htmlFor: 'classId', className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Lớp'),
                  React.createElement(
                    'select',
                    {
                      key: 's', id: 'classId', value: classId, onChange: function onChange(e){ setClassId(e.target.value); }, required: isNonAdmin,
                      disabled: !faculty,
                      className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                    },
                    [
                      React.createElement('option', { key: 'none', value: '', disabled: true }, faculty ? '-- Chọn lớp --' : 'Chọn khoa trước'),
                      classOptions.map(function(c, index){ return React.createElement('option', { key: c.value || `class-${index}`, value: c.value }, c.label); })
                    ]
                  ),
                  // Hiển thị thông tin lớp trưởng nếu có
                  classMonitorInfo && role === 'LOP_TRUONG' ? React.createElement(
                    'div',
                    { key: 'monitor-info', className: 'mt-3 p-3 rounded-lg border ' + (classMonitorInfo.hasMonitor ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200') },
                    [
                      classMonitorInfo.hasMonitor ? 
                        React.createElement('div', { key: 'warning', className: 'text-red-700' },
                          [
                            React.createElement('div', { key: 'icon', className: 'flex items-center mb-1' },
                              [
                                React.createElement('svg', { key: 'svg', className: 'w-4 h-4 mr-2', fill: 'currentColor', viewBox: '0 0 20 20' },
                                  React.createElement('path', { key: 'path', fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
                                ),
                                React.createElement('span', { key: 'text', className: 'font-medium' }, 'Lớp đã có lớp trưởng')
                              ]
                            ),
                            React.createElement('div', { key: 'details', className: 'text-sm' },
                              `Lớp trưởng hiện tại: ${classMonitorInfo.monitor?.ho_ten || 'N/A'} (${classMonitorInfo.monitor?.mssv || 'N/A'})`
                            )
                          ]
                        ) :
                        React.createElement('div', { key: 'success', className: 'text-green-700' },
                          [
                            React.createElement('div', { key: 'icon', className: 'flex items-center mb-1' },
                              [
                                React.createElement('svg', { key: 'svg', className: 'w-4 h-4 mr-2', fill: 'currentColor', viewBox: '0 0 20 20' },
                                  React.createElement('path', { key: 'path', fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', clipRule: 'evenodd' })
                                ),
                                React.createElement('span', { key: 'text', className: 'font-medium' }, 'Lớp chưa có lớp trưởng')
                              ]
                            ),
                            React.createElement('div', { key: 'details', className: 'text-sm' },
                              'Bạn có thể đăng ký làm lớp trưởng cho lớp này'
                            )
                          ]
                        )
                    ]
                  ) : null
                ]
              )
            ]) : null,
            // Error / Success messages
            error ? React.createElement('div', { key: 'err', className: 'text-red-600 text-sm' }, error) : null,
            success ? React.createElement('div', { key: 'ok', className: 'text-green-600 text-sm' }, success) : null,
            // Register button
            React.createElement('button', { key: 'submit', type: 'submit', disabled: submitting, className: 'w-full bg-blue-600 disabled:opacity-60 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors' }, submitting ? 'Đang đăng ký...' : 'Đăng ký'),
            // Link
            React.createElement('p', { key: 'lnk', className: 'text-center text-gray-600 text-sm' }, [
              'Đã có tài khoản? ', React.createElement('a', { key: 'a', href: '/login', className: 'text-blue-600 hover:text-blue-800 font-semibold transition-colors' }, 'Đăng nhập')
            ])
          ]
        )
      ]
    )
  );

  const rightPane = React.createElement(
    'div',
    { className: 'flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 text-white' },
    React.createElement(React.Fragment, null,
      [
        React.createElement('img', { key: 'logo', src: 'https://placehold.co/150x150/ffffff/0066cc?text=Logo', alt: 'Logo ứng dụng', className: 'mb-8 w-36 h-36 rounded-xl shadow-lg' }),
        React.createElement('div', { key: 'txt', className: 'text-center max-w-sm' }, [
          React.createElement('h2', { key: 'h', className: 'text-2xl font-bold mb-4 animate-bounce' }, 'Chào mừng bạn đến với hệ thống!'),
          React.createElement('p', { key: 'p', className: 'text-blue-200' }, 'Đăng ký ngay để trải nghiệm các tính năng quản lý học tập hiệu quả và tiện lợi.')
        ])
      ]
    )
  );

  return React.createElement('div', { className: 'min-h-screen flex flex-col md:flex-row bg-gray-50' }, React.createElement(React.Fragment, null, [leftForm, rightPane]));
}


