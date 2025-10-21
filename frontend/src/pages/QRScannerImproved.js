import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle, Clock, Wifi, Battery, Signal } from 'lucide-react';
import jsQR from 'jsqr';
import http from '../services/http';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { useNotification } from '../contexts/NotificationContext';

export default function QRScannerImproved() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError, showInfo } = useNotification();
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activityInfo, setActivityInfo] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '', visible: false });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { user } = useAppStore();
  const role = user?.vai_tro || user?.role;

  // GPS disabled intentionally

  // Load attendance history
  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      const response = await http.get('/student/attendance-history');
      const history = response?.data?.data || [];
      setAttendanceHistory(history.slice(0, 5)); // Last 5 attendance records
    } catch (error) {
      console.error('Failed to load attendance history:', error);
      // Fallback data
      setAttendanceHistory([
        {
          id: '1',
          ten_hoat_dong: 'Workshop ReactJS',
          ngay_diem_danh: '2025-09-15T10:30:00Z',
          trang_thai: 'co_mat',
          diem_nhan_duoc: 4,
          vi_tri_gps: '10.762622,106.660172'
        },
        {
          id: '2', 
          ten_hoat_dong: 'Hiến máu tình nguyện',
          ngay_diem_danh: '2025-09-12T08:00:00Z',
          trang_thai: 'co_mat',
          diem_nhan_duoc: 6,
          vi_tri_gps: '10.762622,106.660172'
        }
      ]);
    }
  };

  // Calculate distance between two GPS coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Validate GPS location
  const validateGPSLocation = () => ({ valid: true, distance: null, message: '' });

  // Show feedback animation
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message, visible: true });
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, visible: false }));
    }, duration);
  };

  // Start camera scanning
  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready before starting scanning
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              setIsScanning(true);
              showFeedback('info', 'Đang quét mã QR...', 2000);
              
              // Add a small delay to ensure video is fully ready
              setTimeout(() => {
                intervalRef.current = setInterval(scanQRCode, 100);
              }, 500);
            })
            .catch((playError) => {
              console.error('Video play error:', playError);
              const errorMsg = 'Không thể phát video từ camera';
              setError(errorMsg);
              showFeedback('error', errorMsg);
              stopCamera();
            });
        };
        
        videoRef.current.onerror = (videoError) => {
          console.error('Video error:', videoError);
          const errorMsg = 'Lỗi video từ camera';
          setError(errorMsg);
          showFeedback('error', errorMsg);
          stopCamera();
        };
      }
    } catch (err) {
      const errorMsg = 'Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.';
      setError(errorMsg);
      showFeedback('error', errorMsg);
      console.error('Camera error:', err);
      stopCamera();
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
  };

  // Scan QR code from video
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready and has valid dimensions
    if (!video.videoWidth || !video.videoHeight || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Validate video dimensions are positive numbers
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      return;
    }

    try {
      const context = canvas.getContext('2d');
      if (!context) return;

      // Set canvas dimensions safely
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data with validation
      if (canvas.width <= 0 || canvas.height <= 0) return;
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Validate image data
      if (!imageData || !imageData.data || imageData.data.length === 0) return;
      
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        stopCamera();
        showFeedback('success', 'Đã quét mã QR thành công!', 1000);
        setTimeout(() => processQRCode(code.data), 500);
      }
    } catch (error) {
      console.warn('QR scanning error:', error.message);
      // Don't show error to user as this is expected during video initialization
    }
  };

  // Process scanned QR code
  const processQRCode = async (qrData) => {
    setIsProcessing(true);
    setError('');
    showFeedback('info', 'Đang xử lý điểm danh...', 2000);

    try {
      // First, get activity info from QR code
      const activityResponse = await http.get(`/activities/qr/${encodeURIComponent(qrData)}`);
      const activity = activityResponse?.data?.data;
      
      if (!activity) {
        throw new Error('Mã QR không hợp lệ hoặc hoạt động không tồn tại');
      }

      setActivityInfo(activity);

      // Validate GPS location if activity has GPS requirement
      // GPS validation disabled

      // Submit attendance
      const response = await http.post('/activities/attendance/scan', { qr_code: qrData });

      const result = response?.data?.data;
      setScanResult({
        success: true,
        activity: activity.ten_hd,
        points: result?.points_awarded || activity.diem_rl,
        message: 'Điểm danh thành công!',
        timestamp: new Date().toLocaleString('vi-VN')
      });

      showFeedback('success', `Điểm danh thành công! +${result?.points_awarded || activity.diem_rl} điểm`, 4000);
      showSuccess('Điểm danh thành công!');
      loadAttendanceHistory(); // Refresh history

    } catch (error) {
      const errorMsg = error?.response?.data?.message || error.message || 'Lỗi khi điểm danh';
      setError(errorMsg);
      setScanResult({
        success: false,
        message: errorMsg,
        timestamp: new Date().toLocaleString('vi-VN')
      });
      showFeedback('error', errorMsg, 4000);
      showError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setError('');
      showFeedback('info', 'Đang đọc mã QR từ ảnh...', 2000);
      
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas không khả dụng');
      }
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Không thể tạo canvas context');
      }
      
      const img = new Image();

      img.onload = () => {
        try {
          // Validate image dimensions
          if (img.width <= 0 || img.height <= 0) {
            throw new Error('Ảnh có kích thước không hợp lệ');
          }

          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Validate image data
          if (!imageData || !imageData.data || imageData.data.length === 0) {
            throw new Error('Không thể đọc dữ liệu ảnh');
          }
          
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            processQRCode(code.data);
          } else {
            const errorMsg = 'Không tìm thấy mã QR trong ảnh';
            setError(errorMsg);
            showFeedback('error', errorMsg);
          }
        } catch (error) {
          const errorMsg = error.message || 'Lỗi khi xử lý ảnh';
          setError(errorMsg);
          showFeedback('error', errorMsg);
        } finally {
          // Clean up object URL
          URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = () => {
        const errorMsg = 'Không thể tải ảnh. Vui lòng chọn file ảnh hợp lệ.';
        setError(errorMsg);
        showFeedback('error', errorMsg);
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      const errorMsg = error.message || 'Lỗi khi đọc file ảnh';
      setError(errorMsg);
      showFeedback('error', errorMsg);
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Status indicator component
  const StatusIndicator = ({ label, status, value }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'good': return 'text-green-600 bg-green-100';
        case 'warning': return 'text-yellow-600 bg-yellow-100';
        case 'error': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    return React.createElement('div', { className: 'flex items-center gap-2 text-sm' }, [
      React.createElement('span', { key: 'label', className: 'text-gray-600' }, label + ':'),
      React.createElement('span', { 
        key: 'value', 
        className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}` 
      }, value)
    ]);
  };

  // Feedback toast component  
  const FeedbackToast = () => {
    if (!feedback.visible) return null;

    const getToastStyle = () => {
      switch (feedback.type) {
        case 'success': return 'bg-green-500 text-white';
        case 'error': return 'bg-red-500 text-white';
        case 'warning': return 'bg-yellow-500 text-white';
        default: return 'bg-blue-500 text-white';
      }
    };

    const getIcon = () => {
      switch (feedback.type) {
        case 'success': return React.createElement(CheckCircle, { className: 'h-5 w-5' });
        case 'error': return React.createElement(AlertCircle, { className: 'h-5 w-5' });
        default: return React.createElement(Clock, { className: 'h-5 w-5' });
      }
    };

    return React.createElement('div', { 
      className: `fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${getToastStyle()} ${feedback.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`
    }, [
      getIcon(),
      React.createElement('span', { key: 'message', className: 'font-medium' }, feedback.message)
    ]);
  };

  return React.createElement('div', { className: 'min-h-screen bg-gray-50' }, [
    React.createElement(Header, { key: 'header' }),
    React.createElement('div', { key: 'body', className: 'flex' }, [
      React.createElement(Sidebar, { key: 'sidebar', role: role }),
      React.createElement('main', { key: 'main', className: 'flex-1 p-6' }, [
        // Feedback Toast
        React.createElement(FeedbackToast, { key: 'toast' }),
        
        // Header
        React.createElement('div', { key: 'page-header', className: 'mb-6' }, [
          React.createElement('h1', { key: 'title', className: 'text-2xl font-bold text-gray-900 mb-2' }, 'Điểm danh QR Code'),
          React.createElement('p', { key: 'subtitle', className: 'text-gray-600' }, 'Quét mã QR hoặc tải lên ảnh để điểm danh hoạt động')
        ]),

        // Status Bar
        React.createElement('div', { key: 'status-bar', className: 'bg-white rounded-lg border p-4 mb-6' }, [
          React.createElement('div', { key: 'status-grid', className: 'grid grid-cols-2 md:grid-cols-4 gap-4' }, [
            React.createElement(StatusIndicator, {
              key: 'gps',
              label: 'GPS',
              status: location ? 'good' : 'error',
              value: location ? `±${Math.round(locationAccuracy || 0)}m` : 'Không khả dụng'
            }),
            React.createElement(StatusIndicator, {
              key: 'camera',
              label: 'Camera',
              status: isScanning ? 'good' : 'warning',
              value: isScanning ? 'Đang quét' : 'Sẵn sàng'
            }),
            React.createElement(StatusIndicator, {
              key: 'location-validation',
              label: 'Vị trí',
              status: gpsValidation.valid === null ? 'warning' : gpsValidation.valid ? 'good' : 'error',
              value: gpsValidation.valid === null ? 'Chưa kiểm tra' : gpsValidation.valid ? 'Hợp lệ' : 'Không hợp lệ'
            }),
            React.createElement(StatusIndicator, {
              key: 'network',
              label: 'Mạng',
              status: 'good',
              value: 'Kết nối'
            })
          ])
        ]),

        React.createElement('div', { key: 'content', className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' }, [
          // Scanner Section
          React.createElement('div', { key: 'scanner', className: 'lg:col-span-2 space-y-6' }, [
            // Camera Scanner
            React.createElement('div', { key: 'camera-section', className: 'bg-white rounded-lg border p-6' }, [
              React.createElement('h2', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Quét bằng Camera'),
              
              // Camera View
              React.createElement('div', { key: 'camera-container', className: 'relative bg-black rounded-lg overflow-hidden mb-4' }, [
                React.createElement('video', {
                  key: 'video',
                  ref: videoRef,
                  className: 'w-full h-64 object-cover',
                  style: { display: isScanning ? 'block' : 'none' }
                }),
                !isScanning && React.createElement('div', { 
                  key: 'placeholder',
                  className: 'w-full h-64 flex items-center justify-center text-gray-400'
                }, [
                  React.createElement(Camera, { key: 'icon', className: 'h-16 w-16 mb-4' }),
                  React.createElement('p', { key: 'text' }, 'Camera chưa được bật')
                ]),
                
                // Scanning overlay
                isScanning && React.createElement('div', { 
                  key: 'overlay',
                  className: 'absolute inset-0 border-2 border-dashed border-green-400 animate-pulse'
                }, [
                  React.createElement('div', { 
                    key: 'corner-tl',
                    className: 'absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-green-400' 
                  }),
                  React.createElement('div', { 
                    key: 'corner-tr',
                    className: 'absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-green-400' 
                  }),
                  React.createElement('div', { 
                    key: 'corner-bl',
                    className: 'absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-green-400' 
                  }),
                  React.createElement('div', { 
                    key: 'corner-br',
                    className: 'absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-green-400' 
                  })
                ])
              ]),

              // Camera Controls
              React.createElement('div', { key: 'controls', className: 'flex gap-3' }, [
                !isScanning 
                  ? React.createElement('button', {
                      key: 'start',
                      onClick: startCamera,
                      disabled: isProcessing,
                      className: 'flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2'
                    }, [
                      React.createElement(Camera, { key: 'icon', className: 'h-5 w-5' }),
                      React.createElement('span', { key: 'text' }, 'Bắt đầu quét')
                    ])
                  : React.createElement('button', {
                      key: 'stop',
                      onClick: stopCamera,
                      className: 'flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2'
                    }, [
                      React.createElement(X, { key: 'icon', className: 'h-5 w-5' }),
                      React.createElement('span', { key: 'text' }, 'Dừng quét')
                    ])
              ])
            ]),

            // File Upload
            React.createElement('div', { key: 'upload-section', className: 'bg-white rounded-lg border p-6' }, [
              React.createElement('h2', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Tải lên ảnh QR'),
              React.createElement('div', { key: 'upload-area', className: 'border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors' }, [
                React.createElement('input', {
                  key: 'input',
                  ref: fileInputRef,
                  type: 'file',
                  accept: 'image/*',
                  onChange: handleFileUpload,
                  className: 'hidden'
                }),
                React.createElement('button', {
                  key: 'button',
                  onClick: () => fileInputRef.current?.click(),
                  disabled: isProcessing,
                  className: 'inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50'
                }, [
                  React.createElement(Upload, { key: 'icon', className: 'h-5 w-5' }),
                  React.createElement('span', { key: 'text' }, 'Chọn ảnh')
                ]),
                React.createElement('p', { key: 'hint', className: 'text-sm text-gray-500 mt-2' }, 'Hỗ trợ: JPG, PNG, GIF')
              ])
            ])
          ]),

          // Info Panel
          React.createElement('div', { key: 'info-panel', className: 'space-y-6' }, [
            // Scan Result
            scanResult && React.createElement('div', { key: 'result', className: `bg-white rounded-lg border p-6 ${scanResult.success ? 'border-green-200' : 'border-red-200'}` }, [
              React.createElement('div', { key: 'header', className: 'flex items-center gap-2 mb-3' }, [
                scanResult.success 
                  ? React.createElement(CheckCircle, { key: 'icon', className: 'h-6 w-6 text-green-600' })
                  : React.createElement(AlertCircle, { key: 'icon', className: 'h-6 w-6 text-red-600' }),
                React.createElement('h3', { key: 'title', className: `font-semibold ${scanResult.success ? 'text-green-900' : 'text-red-900'}` }, 
                  scanResult.success ? 'Điểm danh thành công!' : 'Điểm danh thất bại')
              ]),
              scanResult.activity && React.createElement('p', { key: 'activity', className: 'font-medium text-gray-900 mb-1' }, scanResult.activity),
              scanResult.points && React.createElement('p', { key: 'points', className: 'text-green-600 font-medium mb-2' }, `+${scanResult.points} điểm`),
              React.createElement('p', { key: 'message', className: 'text-sm text-gray-600 mb-2' }, scanResult.message),
              React.createElement('p', { key: 'time', className: 'text-xs text-gray-500' }, scanResult.timestamp)
            ]),

            // Activity Info (if available)
            activityInfo && React.createElement('div', { key: 'activity-info', className: 'bg-white rounded-lg border p-6' }, [
              React.createElement('h3', { key: 'title', className: 'font-semibold text-gray-900 mb-3' }, 'Thông tin hoạt động'),
              React.createElement('div', { key: 'content', className: 'space-y-2 text-sm' }, [
                React.createElement('p', { key: 'name' }, React.createElement('span', { className: 'font-medium' }, 'Tên: '), activityInfo.ten_hd),
                React.createElement('p', { key: 'points' }, React.createElement('span', { className: 'font-medium' }, 'Điểm: '), `${activityInfo.diem_rl} điểm`),
                React.createElement('p', { key: 'location' }, React.createElement('span', { className: 'font-medium' }, 'Địa điểm: '), activityInfo.dia_diem),
                activityInfo.gps_location && React.createElement('div', { key: 'gps-info', className: 'flex items-center gap-1 text-blue-600' }, [
                  React.createElement(MapPin, { key: 'icon', className: 'h-4 w-4' }),
                  React.createElement('span', { key: 'text' }, `Yêu cầu GPS (±${activityInfo.gps_radius || 100}m)`)
                ])
              ])
            ]),

            // Recent Attendance History
            React.createElement('div', { key: 'history', className: 'bg-white rounded-lg border p-6' }, [
              React.createElement('h3', { key: 'title', className: 'font-semibold text-gray-900 mb-4' }, 'Lịch sử điểm danh gần đây'),
              React.createElement('div', { key: 'list', className: 'space-y-3' },
                attendanceHistory.length > 0
                  ? attendanceHistory.map(record => 
                      React.createElement('div', { 
                        key: record.id,
                        className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                      }, [
                        React.createElement('div', { key: 'info', className: 'flex-1' }, [
                          React.createElement('p', { key: 'name', className: 'font-medium text-sm text-gray-900' }, record.ten_hoat_dong),
                          React.createElement('p', { key: 'date', className: 'text-xs text-gray-500' }, 
                            new Date(record.ngay_diem_danh).toLocaleDateString('vi-VN'))
                        ]),
                        React.createElement('div', { key: 'points', className: 'text-right' }, [
                          React.createElement('span', { key: 'badge', className: 'bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full' }, 
                            `+${record.diem_nhan_duoc}`),
                          record.vi_tri_gps && React.createElement('div', { key: 'gps', className: 'flex items-center gap-1 mt-1' }, [
                            React.createElement(MapPin, { key: 'icon', className: 'h-3 w-3 text-gray-400' }),
                            React.createElement('span', { key: 'text', className: 'text-xs text-gray-400' }, 'GPS')
                          ])
                        ])
                      ])
                    )
                  : [React.createElement('p', { key: 'empty', className: 'text-center text-gray-500 py-4' }, 'Chưa có lịch sử điểm danh')]
              )
            ])
          ])
        ]),

        // Hidden canvas for QR processing
        React.createElement('canvas', { 
          key: 'canvas',
          ref: canvasRef, 
          style: { display: 'none' } 
        }),

        // Error Display
        error && React.createElement('div', { 
          key: 'error',
          className: 'fixed bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg'
        }, [
          React.createElement('div', { key: 'content', className: 'flex items-center gap-2' }, [
            React.createElement(AlertCircle, { key: 'icon', className: 'h-5 w-5' }),
            React.createElement('span', { key: 'text' }, error),
            React.createElement('button', { 
              key: 'close',
              onClick: () => setError(''),
              className: 'ml-auto text-red-700 hover:text-red-900'
            }, React.createElement(X, { className: 'h-4 w-4' }))
          ])
        ])
      ])
    ])
  ]);
}