import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, X, CheckCircle, AlertCircle, 
  Scan, Sparkles, Zap, Info, QrCode, Image as ImageIcon,
  Clock, MapPin, User, Award
} from 'lucide-react';
import jsQR from 'jsqr';
import http from '../services/http';
import { useNotification } from '../contexts/NotificationContext';

export default function QRScannerModern() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError } = useNotification();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const requestAnimationFrameIdRef = useRef(null);
  const frameCountRef = useRef(0);

  // Start camera scanning with improved settings
  const startCamera = async () => {
    try {
      setError('');
      setScanResult(null);
      lastScanTimeRef.current = 0;
      
      // Request camera with enhanced settings for better QR detection
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          aspectRatio: { ideal: 16/9 },
          // Enhanced settings for better focus and clarity
          focusMode: 'continuous',
          zoom: { ideal: 1.0 }
        } 
      });
      
      streamRef.current = stream;
      
      // Apply advanced constraints if supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        const constraints = {};
        
        // Enable autofocus if available
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          constraints.focusMode = 'continuous';
        }
        
        // Set exposure mode for better lighting
        if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
          constraints.exposureMode = 'continuous';
        }
        
        // Apply constraints
        if (Object.keys(constraints).length > 0) {
          try {
            await videoTrack.applyConstraints({ advanced: [constraints] });
          } catch (e) {
            console.warn('Could not apply advanced constraints:', e);
          }
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Important for iOS
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              setIsScanning(true);
              // Start scanning immediately after camera is ready
              setTimeout(() => {
                startScanningLoop();
              }, 300); // Reduced from 800ms to 300ms
            })
            .catch((playError) => {
              console.error('Video play error:', playError);
              setError('Không thể phát video từ camera');
              stopCamera();
            });
        };
        
        videoRef.current.onerror = (videoError) => {
          console.error('Video error:', videoError);
          setError('Lỗi video từ camera');
          stopCamera();
        };
      }
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      console.error('Camera error:', err);
      stopCamera();
    }
  };
  
  // Use requestAnimationFrame for aggressive scanning
  const startScanningLoop = () => {
    frameCountRef.current = 0;
    const scan = () => {
      if (!isScanning || isProcessing) return;
      
      frameCountRef.current++;
      
      // Scan every frame for maximum responsiveness
      scanQRCode();
      
      requestAnimationFrameIdRef.current = requestAnimationFrame(scan);
    };
    requestAnimationFrameIdRef.current = requestAnimationFrame(scan);
  };

  // Stop camera with proper cleanup
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (requestAnimationFrameIdRef.current) {
      cancelAnimationFrame(requestAnimationFrameIdRef.current);
      requestAnimationFrameIdRef.current = null;
    }
    setIsScanning(false);
  };

  // Scan QR code from video with ultra-fast detection
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (!video.videoWidth || !video.videoHeight || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      return;
    }

    try {
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      // Use lower resolution for faster scanning (640x480 max)
      const maxDim = 640;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and enhance with aggressive grayscale + high contrast
      context.filter = 'contrast(2.0) brightness(1.4) saturate(0) grayscale(100%)';
      context.drawImage(video, 0, 0, width, height);
      context.filter = 'none';
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      if (!imageData || !imageData.data || imageData.data.length === 0) return;
      
      // Try with attemptBoth for maximum detection
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        // Prevent duplicate scans within 1 second
        const now = Date.now();
        if (now - lastScanTimeRef.current < 1000) {
          return;
        }
        lastScanTimeRef.current = now;
        
        console.log('✅ QR detected after', frameCountRef.current, 'frames');
        
        // Stop scanning and process
        setIsScanning(false);
        if (requestAnimationFrameIdRef.current) {
          cancelAnimationFrame(requestAnimationFrameIdRef.current);
          requestAnimationFrameIdRef.current = null;
        }
        stopCamera();
        processQRCode(code.data);
      }
    } catch (error) {
      console.warn('QR scanning error:', error.message);
    }
  };

  // Process scanned QR code
  const processQRCode = async (qrData) => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await http.post('/activities/attendance/scan', {
        qr_code: qrData
      });

      setScanResult({
        success: true,
        message: response.data.message,
        data: response.data.data
      });
      showSuccess('Điểm danh thành công!');

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi điểm danh';
      setScanResult({
        success: false,
        message: errorMessage
      });
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload with better error handling
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setError('');
      setIsProcessing(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = canvasRef.current;
              if (!canvas) {
                setError('Canvas không khả dụng');
                setIsProcessing(false);
                return;
              }
              
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (!context) {
                setError('Không thể tạo canvas context');
                setIsProcessing(false);
                return;
              }
              
              if (img.width <= 0 || img.height <= 0) {
                setError('Ảnh có kích thước không hợp lệ');
                setIsProcessing(false);
                return;
              }
              
              // Scale image for better processing
              const maxSize = 1280;
              let width = img.width;
              let height = img.height;
              
              if (width > maxSize || height > maxSize) {
                if (width > height) {
                  height = (height / width) * maxSize;
                  width = maxSize;
                } else {
                  width = (width / height) * maxSize;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              context.drawImage(img, 0, 0, width, height);
              
              // Apply image enhancement
              context.filter = 'contrast(1.3) brightness(1.1)';
              context.drawImage(canvas, 0, 0);
              context.filter = 'none';
              
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              
              if (!imageData || !imageData.data || imageData.data.length === 0) {
                setError('Không thể đọc dữ liệu ảnh');
                setIsProcessing(false);
                return;
              }
              
              // Try multiple times with different settings
              let code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
              });
              
              if (code) {
                processQRCode(code.data);
              } else {
                setError('Không tìm thấy mã QR trong ảnh. Hãy thử với ảnh rõ nét hơn.');
                setIsProcessing(false);
              }
            } catch (error) {
              setError(error.message || 'Lỗi khi xử lý ảnh');
              setIsProcessing(false);
            }
          };
          
          img.onerror = () => {
            setError('Không thể tải ảnh. Vui lòng chọn file ảnh hợp lệ.');
            setIsProcessing(false);
          };
          
          img.src = e.target.result;
        } catch (error) {
          setError('Lỗi khi đọc dữ liệu ảnh');
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        setError('Lỗi khi đọc file ảnh');
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Lỗi khi xử lý file ảnh');
      setIsProcessing(false);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setScanResult(null);
    setError('');
    setIsProcessing(false);
    lastScanTimeRef.current = 0;
    frameCountRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-8">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <QrCode className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  Điểm Danh QR
                  <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-blue-100 text-sm mt-1">
                  Quét mã QR hoặc tải ảnh để điểm danh nhanh chóng
                </p>
              </div>
            </div>
            
            {/* Stats row */}
            <div className="flex gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Zap className="h-4 w-4 text-yellow-300" />
                <span className="text-white text-sm font-medium">Nhanh chóng</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Scan className="h-4 w-4 text-green-300" />
                <span className="text-white text-sm font-medium">Chính xác</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Instructions (Left) + Scanner (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Instructions Card */}
          <div className="lg:col-span-1">
            <div className="group sticky top-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
              
              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-500 rounded-xl p-2">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-blue-900 text-lg">Hướng Dẫn</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3">
                    <div className="bg-blue-100 rounded-lg p-2 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-blue-800 text-sm flex-1">
                      Đảm bảo bạn đã <span className="font-semibold">đăng ký tham gia hoạt động</span> trước khi điểm danh
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3">
                    <div className="bg-purple-100 rounded-lg p-2 mt-0.5">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-blue-800 text-sm flex-1">
                      Quét QR trong <span className="font-semibold">thời gian điểm danh</span> được quy định
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3">
                    <div className="bg-green-100 rounded-lg p-2 mt-0.5">
                      <MapPin className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-blue-800 text-sm flex-1">
                      Ở gần <span className="font-semibold">địa điểm tổ chức</span> nếu có yêu cầu vị trí
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-white/50 backdrop-blur-sm rounded-xl p-3">
                    <div className="bg-orange-100 rounded-lg p-2 mt-0.5">
                      <User className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-blue-800 text-sm flex-1">
                      Mỗi người <span className="font-semibold">chỉ được điểm danh một lần</span> cho mỗi phiên
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Main Scanner Card */}
          <div className="lg:col-span-2">
            <div className="relative group">
              {/* Blur effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
              
              <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="p-6">
              
              {!scanResult && !isProcessing && (
                <>
                  {/* Camera View */}
                  <div className="relative mb-6">
                    <video
                      ref={videoRef}
                      className={`w-full h-80 rounded-2xl object-cover ${isScanning ? 'block' : 'hidden'}`}
                      playsInline
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                    
                    {!isScanning && (
                      <div className="w-full h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-6 mx-auto mb-4 inline-block">
                            <Camera className="w-12 h-12 text-white" />
                          </div>
                          <p className="text-gray-600 font-medium text-lg">Camera chưa khởi động</p>
                          <p className="text-gray-400 text-sm mt-2">Nhấn nút bên dưới để bắt đầu quét</p>
                        </div>
                      </div>
                    )}

                    {/* Scanning overlay with animation */}
                    {isScanning && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        {/* Scanning corners */}
                        <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                        <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                        
                        {/* Scanning line animation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4/5 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                        </div>
                        
                        {/* Scanning text */}
                        <div className="absolute bottom-8 left-0 right-0 text-center">
                          <div className="inline-block bg-blue-500/90 backdrop-blur-sm text-white px-6 py-2 rounded-full">
                            <div className="flex items-center gap-2">
                              <Scan className="h-4 w-4 animate-pulse" />
                              <span className="text-sm font-medium">Đang quét mã QR...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modern Controls */}
                  <div className="space-y-4">
                    {!isScanning ? (
                      <button
                        onClick={startCamera}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="font-semibold text-lg">Bật Camera Quét QR</span>
                        <Sparkles className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <X className="w-6 h-6" />
                        <span className="font-semibold text-lg">Dừng Quét</span>
                      </button>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <span className="text-gray-500 text-sm font-medium px-4 py-1 bg-gray-100 rounded-full">hoặc</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:from-gray-800 hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      disabled={isProcessing}
                    >
                      <ImageIcon className="w-6 h-6" />
                      <span className="font-semibold text-lg">Tải Ảnh QR</span>
                      <Upload className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}

              {/* Processing state with modern loader */}
              {isProcessing && (
                <div className="text-center py-12">
                  <div className="relative inline-block mb-6">
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200"></div>
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-t-blue-600 border-r-indigo-600 absolute inset-0"></div>
                    <Scan className="absolute inset-0 m-auto h-8 w-8 text-blue-600 animate-pulse" />
                  </div>
                  <p className="text-gray-700 font-semibold text-lg mb-2">Đang xử lý điểm danh...</p>
                  <p className="text-gray-500 text-sm">Vui lòng đợi trong giây lát</p>
                </div>
              )}

              {/* Success Result */}
              {scanResult && scanResult.success && (
                <div className="text-center py-8">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30"></div>
                    <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6">
                      <CheckCircle className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-3">
                    Điểm Danh Thành Công! 🎉
                  </h3>
                  <p className="text-gray-600 mb-6">{scanResult.message}</p>
                  
                  {scanResult.data && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-left mb-6 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-500 rounded-lg p-2">
                          <Award className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Hoạt động</p>
                          <p className="text-sm font-semibold text-gray-800">{scanResult.data.activityName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500 rounded-lg p-2">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Phiên</p>
                          <p className="text-sm font-semibold text-gray-800">{scanResult.data.sessionName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-purple-500 rounded-lg p-2">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Thời gian</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {new Date(scanResult.data.timestamp).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetScanner}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                  >
                    Quét Mã Khác
                  </button>
                </div>
              )}

              {/* Error Result */}
              {scanResult && !scanResult.success && (
                <div className="text-center py-8">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30"></div>
                    <div className="relative bg-gradient-to-br from-red-400 to-red-600 rounded-full p-6">
                      <AlertCircle className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-3">
                    Điểm Danh Thất Bại
                  </h3>
                  <p className="text-gray-600 mb-6">{scanResult.message}</p>

                  <button
                    onClick={resetScanner}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                  >
                    Thử Lại
                  </button>
                </div>
              )}

              {/* Error display */}
              {error && !scanResult && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500 rounded-lg p-2">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-red-700 font-medium flex-1">{error}</p>
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
