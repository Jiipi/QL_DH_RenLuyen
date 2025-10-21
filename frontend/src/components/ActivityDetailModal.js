import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Users, Award, UserPlus, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import http from '../services/http';
import { useNotification } from '../contexts/NotificationContext';
import { getActivityImage } from '../utils/activityImages';

export default function ActivityDetailModal({ activityId, isOpen, onClose }) {
  const { showSuccess, showError, confirm } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get current user role (robust across shapes), always UPPERCASE
  const getCurrentUserRole = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Try multiple shapes: string, object.ten_vt, or other common fields
        let roleValue = null;
        if (typeof user?.vai_tro === 'string') {
          roleValue = user.vai_tro;
        } else if (user?.vai_tro && typeof user.vai_tro === 'object' && user.vai_tro.ten_vt) {
          roleValue = user.vai_tro.ten_vt;
        } else if (user?.ten_vt) {
          roleValue = user.ten_vt;
        } else if (user?.role) {
          roleValue = user.role;
        }
        const normalized = String(roleValue || '').toUpperCase().trim();
        // Debug once for verification (can be removed later)
        console.debug('ActivityDetailModal role:', normalized);
        return normalized || null;
      }
    } catch (err) {
      console.error('Error parsing user from localStorage:', err);
    }
    return null;
  };

  const userRole = getCurrentUserRole();

  useEffect(() => {
    if (isOpen && activityId) {
      loadActivityDetail();
    }
  }, [isOpen, activityId]);

  async function loadActivityDetail() {
    setLoading(true);
    setError('');
    try {
      const res = await http.get(`/activities/${activityId}`);
      setData(res.data?.data || null);
    } catch (err) {
      setError('Không thể tải chi tiết hoạt động');
      console.error('Load activity detail error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!data) return;
    
    const confirmed = await confirm({
      title: 'Xác nhận đăng ký',
      message: `Bạn có chắc muốn đăng ký tham gia "${data.ten_hd}"?`,
      confirmText: 'Đăng ký',
      cancelText: 'Hủy'
    });
    
    if (!confirmed) return;
    
    try {
      const res = await http.post(`/activities/${activityId}/register`);
      if (res.data?.success) {
        showSuccess('Đăng ký thành công', 'Thành công', 12000);
        // Reload data to update registration status
        loadActivityDetail();
      } else {
        showSuccess(res.data?.message || 'Đăng ký thành công', 'Thông báo', 10000);
        loadActivityDetail();
      }
    } catch (err) {
      const firstValidation = err?.response?.data?.errors?.[0]?.message;
      const errorMsg = firstValidation || err?.response?.data?.message || err?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      showError(errorMsg);
    }
  }

  if (!isOpen) return null;

  const start = data?.ngay_bd ? new Date(data.ngay_bd) : null;
  const end = data?.ngay_kt ? new Date(data.ngay_kt) : null;
  const deadline = data?.han_dk ? new Date(data.han_dk) : null;
  const now = new Date();
  
  const withinTime = start && end ? (start <= now && end >= now) || start > now : true;
  const isDeadlinePast = deadline ? deadline < now : false;
  
  // Only allow students and class leaders to register, not teachers
  // Role values in database are uppercase: GIANG_VIEN, SINH_VIEN, LOP_TRUONG
  const pathname = typeof window !== 'undefined' ? (window.location?.pathname || '') : '';
  const inTeacherContext = pathname.startsWith('/teacher');
  const isTeacher = userRole === 'GIANG_VIEN' || inTeacherContext;
  const canRegister = !isTeacher && data?.trang_thai === 'da_duyet' && withinTime && 
    (!data?.is_registered || data?.registration_status === 'tu_choi') && !isDeadlinePast;

  // Lightweight debug (can be removed later)
  console.debug('ActivityDetailModal flags:', { isTeacher, inTeacherContext, canRegister });

  const getStatusInfo = () => {
    if (data?.is_registered) {
      if (data.registration_status === 'da_duyet') {
        return { label: 'Đã đăng ký (Đã duyệt)', color: 'bg-green-100 text-green-800 border-green-200' };
      } else if (data.registration_status === 'tu_choi') {
        return { label: 'Bị từ chối', color: 'bg-red-100 text-red-800 border-red-200' };
      } else if (data.registration_status === 'da_tham_gia') {
        return { label: 'Đã tham gia', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      } else {
        return { label: 'Đã đăng ký (Chờ duyệt)', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      }
    } else if (isDeadlinePast) {
      return { label: 'Đã quá hạn đăng ký', color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (data?.trang_thai === 'da_duyet') {
      return { label: 'Có thể đăng ký', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else {
      return { label: 'Chưa được duyệt', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const statusInfo = getStatusInfo();

  return React.createElement(
    'div',
    { 
      className: 'fixed inset-0 z-50 overflow-y-auto',
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      }
    },
    React.createElement(
      'div',
      { className: 'flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0' },
      [
        // Backdrop
        React.createElement(
          'div',
          { 
            key: 'backdrop',
            className: 'fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity'
          }
        ),
        
        // Modal
        React.createElement(
          'div',
          { 
            key: 'modal',
            className: 'inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full'
          },
          [
            // Header
            React.createElement(
              'div',
              { key: 'header', className: 'bg-white px-6 py-4 border-b border-gray-200' },
              [
                React.createElement(
                  'div',
                  { key: 'header-content', className: 'flex items-center justify-between' },
                  [
                    React.createElement('h3', { 
                      key: 'title', 
                      className: 'text-lg font-medium text-gray-900' 
                    }, 'Chi tiết hoạt động'),
                    React.createElement(
                      'button',
                      {
                        key: 'close',
                        onClick: onClose,
                        className: 'text-gray-400 hover:text-gray-600 transition-colors'
                      },
                      React.createElement(X, { className: 'h-6 w-6' })
                    )
                  ]
                )
              ]
            ),
            
            // Content
            React.createElement(
              'div',
              { key: 'content', className: 'bg-white px-6 py-4 max-h-96 overflow-y-auto' },
              loading ? (
                React.createElement(
                  'div',
                  { key: 'loading', className: 'flex items-center justify-center py-8' },
                  [
                    React.createElement(
                      'div',
                      { key: 'spinner', className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' }
                    ),
                    React.createElement('span', { 
                      key: 'text', 
                      className: 'ml-3 text-gray-600' 
                    }, 'Đang tải...')
                  ]
                )
              ) : error ? (
                React.createElement(
                  'div',
                  { key: 'error', className: 'flex items-center justify-center py-8 text-red-600' },
                  [
                    React.createElement(AlertCircle, { key: 'icon', className: 'h-6 w-6 mr-2' }),
                    error
                  ]
                )
              ) : data ? [
                // Activity Image - Always show (with fallback)
                React.createElement(
                  'div',
                  { key: 'image', className: 'mb-6' },
                  React.createElement('img', {
                    src: getActivityImage(data.hinh_anh, data.loai_hd?.ten_loai),
                    alt: data.ten_hd || 'Poster hoạt động',
                    className: 'w-full h-64 object-cover rounded-lg shadow-md',
                    onError: (e) => {
                      // Fallback to default image if image fails to load
                      e.target.src = '/images/default-activity.jpg';
                    }
                  })
                ),
                
                // Activity Title
                React.createElement(
                  'h2',
                  { key: 'activity-title', className: 'text-2xl font-bold text-gray-900 mb-4' },
                  data.ten_hd || 'Hoạt động'
                ),
                
                // Status Badge
                React.createElement(
                  'div',
                  { key: 'status', className: 'mb-6' },
                  React.createElement('span', {
                    className: `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`
                  }, [
                    React.createElement('div', { 
                      key: 'dot',
                      className: `w-2 h-2 rounded-full mr-2 ${
                        data?.is_registered ? 'bg-green-500' : 
                        isDeadlinePast ? 'bg-red-500' : 
                        'bg-blue-500'
                      }`
                    }),
                    statusInfo.label
                  ])
                ),
                
                // Description
                React.createElement(
                  'div',
                  { key: 'description', className: 'mb-6' },
                  [
                    React.createElement('h4', { 
                      key: 'desc-title', 
                      className: 'text-lg font-semibold text-gray-900 mb-2' 
                    }, 'Mô tả'),
                    React.createElement('p', { 
                      key: 'desc-content', 
                      className: 'text-gray-700 leading-relaxed' 
                    }, data.mo_ta || 'Chưa có mô tả')
                  ]
                ),
                
                // Activity Details Grid
                React.createElement(
                  'div',
                  { key: 'details', className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-6' },
                  [
                    React.createElement(
                      'div',
                      { key: 'type', className: 'flex items-center' },
                      [
                        React.createElement(Calendar, { 
                          key: 'icon', 
                          className: 'h-5 w-5 text-gray-400 mr-3' 
                        }),
                        React.createElement('div', { key: 'content' }, [
                          React.createElement('span', { 
                            key: 'label', 
                            className: 'text-sm font-medium text-gray-600' 
                          }, 'Loại hoạt động'),
                          React.createElement('p', { 
                            key: 'value', 
                            className: 'text-gray-900' 
                          }, data.loai || data.loai_hd?.ten_loai_hd || 'Chưa xác định')
                        ])
                      ]
                    ),
                    
                    React.createElement(
                      'div',
                      { key: 'points', className: 'flex items-center' },
                      [
                        React.createElement(Award, { 
                          key: 'icon', 
                          className: 'h-5 w-5 text-gray-400 mr-3' 
                        }),
                        React.createElement('div', { key: 'content' }, [
                          React.createElement('span', { 
                            key: 'label', 
                            className: 'text-sm font-medium text-gray-600' 
                          }, 'Điểm rèn luyện'),
                          React.createElement('p', { 
                            key: 'value', 
                            className: 'text-gray-900 font-semibold' 
                          }, `${data.diem_rl || 0} điểm`)
                        ])
                      ]
                    ),
                    
                    React.createElement(
                      'div',
                      { key: 'time', className: 'flex items-center' },
                      [
                        React.createElement(Clock, { 
                          key: 'icon', 
                          className: 'h-5 w-5 text-gray-400 mr-3' 
                        }),
                        React.createElement('div', { key: 'content' }, [
                          React.createElement('span', { 
                            key: 'label', 
                            className: 'text-sm font-medium text-gray-600' 
                          }, 'Thời gian'),
                          React.createElement('p', { 
                            key: 'value', 
                            className: 'text-gray-900' 
                          }, start ? start.toLocaleString('vi-VN') : 'Chưa xác định'),
                          end && React.createElement('p', { 
                            key: 'end', 
                            className: 'text-sm text-gray-600' 
                          }, `Đến: ${end.toLocaleString('vi-VN')}`)
                        ])
                      ]
                    ),
                    
                    React.createElement(
                      'div',
                      { key: 'location', className: 'flex items-center' },
                      [
                        React.createElement(MapPin, { 
                          key: 'icon', 
                          className: 'h-5 w-5 text-gray-400 mr-3' 
                        }),
                        React.createElement('div', { key: 'content' }, [
                          React.createElement('span', { 
                            key: 'label', 
                            className: 'text-sm font-medium text-gray-600' 
                          }, 'Địa điểm'),
                          React.createElement('p', { 
                            key: 'value', 
                            className: 'text-gray-900' 
                          }, data.dia_diem || 'Chưa xác định')
                        ])
                      ]
                    ),
                    
                    React.createElement(
                      'div',
                      { key: 'capacity', className: 'flex items-center' },
                      [
                        React.createElement(Users, { 
                          key: 'icon', 
                          className: 'h-5 w-5 text-gray-400 mr-3' 
                        }),
                        React.createElement('div', { key: 'content' }, [
                          React.createElement('span', { 
                            key: 'label', 
                            className: 'text-sm font-medium text-gray-600' 
                          }, 'Số lượng tối đa'),
                          React.createElement('p', { 
                            key: 'value', 
                            className: 'text-gray-900' 
                          }, `${data.sl_toi_da || 0} người`)
                        ])
                      ]
                    ),
                    
                    React.createElement(
                      'div',
                      { key: 'organizer', className: 'flex items-center' },
                      [
                        React.createElement(Users, { 
                          key: 'icon', 
                          className: 'h-5 w-5 text-gray-400 mr-3' 
                        }),
                        React.createElement('div', { key: 'content' }, [
                          React.createElement('span', { 
                            key: 'label', 
                            className: 'text-sm font-medium text-gray-600' 
                          }, 'Đơn vị tổ chức'),
                          React.createElement('p', { 
                            key: 'value', 
                            className: 'text-gray-900' 
                          }, data.don_vi_to_chuc || 'Nhà trường')
                        ])
                      ]
                    )
                  ]
                ),
                
                // Deadline info
                deadline && React.createElement(
                  'div',
                  { key: 'deadline', className: 'mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg' },
                  [
                    React.createElement('div', { 
                      key: 'deadline-content', 
                      className: 'flex items-center' 
                    }, [
                      React.createElement(AlertCircle, { 
                        key: 'icon', 
                        className: 'h-5 w-5 text-yellow-600 mr-2' 
                      }),
                      React.createElement('div', { key: 'text' }, [
                        React.createElement('span', { 
                          key: 'label', 
                          className: 'text-sm font-medium text-yellow-800' 
                        }, 'Hạn đăng ký: '),
                        React.createElement('span', { 
                          key: 'value', 
                          className: 'text-yellow-900' 
                        }, deadline.toLocaleString('vi-VN'))
                      ])
                    ])
                  ]
                ),
                
                // Rejection reason
                data?.registration_status === 'tu_choi' && data?.rejection_reason && React.createElement(
                  'div',
                  { key: 'rejection', className: 'mb-6 p-4 bg-red-50 border border-red-200 rounded-lg' },
                  [
                    React.createElement('div', { 
                      key: 'rejection-header', 
                      className: 'flex items-start' 
                    }, [
                      React.createElement(AlertCircle, { 
                        key: 'icon', 
                        className: 'h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0' 
                      }),
                      React.createElement('div', { key: 'content' }, [
                        React.createElement('p', { 
                          key: 'label', 
                          className: 'text-sm font-semibold text-red-800 mb-1' 
                        }, 'Lý do từ chối đăng ký:'),
                        React.createElement('p', { 
                          key: 'reason', 
                          className: 'text-sm text-red-700' 
                        }, data.rejection_reason)
                      ])
                    ])
                  ]
                )
              ] : null
            ),
            
            // Footer with actions
            React.createElement(
              'div',
              { key: 'footer', className: 'bg-gray-50 px-6 py-4 border-t border-gray-200' },
              React.createElement(
                'div',
                { key: 'actions', className: 'flex justify-end space-x-3' },
                [
                  React.createElement(
                    'button',
                    {
                      key: 'close-btn',
                      type: 'button',
                      onClick: onClose,
                      className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    },
                    'Đóng'
                  ),
                  data && canRegister && React.createElement(
                    'button',
                    {
                      key: 'register-btn',
                      type: 'button',
                      onClick: handleRegister,
                      className: 'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center'
                    },
                    [
                      React.createElement(UserPlus, { key: 'icon', className: 'h-4 w-4 mr-2' }),
                      'Đăng ký tham gia'
                    ]
                  )
                ]
              )
            )
          ]
        )
      ]
    )
  );
}
