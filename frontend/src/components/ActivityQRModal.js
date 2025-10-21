import React, { useState, useEffect, useRef } from 'react';
import { X, Download, QrCode as QrCodeIcon, Loader } from 'lucide-react';
import QRCode from 'qrcode';
import http from '../services/http';

export default function ActivityQRModal({ activityId, activityName, isOpen, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && activityId) {
      loadQRData();
    }
  }, [isOpen, activityId]);

  useEffect(() => {
    if (qrData && canvasRef.current) {
      generateQRCode();
    }
  }, [qrData]);

  async function loadQRData() {
    try {
      setLoading(true);
      setError('');
      const res = await http.get(`/activities/${activityId}/qr-data`);
      const data = res.data?.data || res.data;
      setQrData(data);
    } catch (err) {
      console.error('Load QR data error:', err);
      setError(err.response?.data?.message || 'Không thể tải mã QR');
    } finally {
      setLoading(false);
    }
  }

  async function generateQRCode() {
    try {
      if (!qrData?.qr_json || !canvasRef.current) return;
      
      await QRCode.toCanvas(canvasRef.current, qrData.qr_json, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (err) {
      console.error('Generate QR error:', err);
      setError('Không thể tạo mã QR');
    }
  }

  function downloadQR() {
    if (!qrData || !canvasRef.current) return;
    
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR-${activityName || 'Activity'}.png`;
    link.href = url;
    link.click();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <QrCodeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mã QR Điểm Danh</h2>
              <p className="text-sm text-gray-500">Quét để điểm danh hoạt động</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-gray-500">Đang tải mã QR...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={loadQRData}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Thử lại
              </button>
            </div>
          )}

          {qrData && !loading && !error && (
            <div className="space-y-4">
              {/* Activity Name */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Hoạt động:</p>
                <p className="text-base font-semibold text-blue-700">{qrData.activity_name || activityName}</p>
              </div>

              {/* QR Code Display */}
              <div className="flex justify-center bg-white border-2 border-gray-200 rounded-lg p-6">
                <canvas 
                  ref={canvasRef}
                  className="max-w-full"
                />
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Hướng dẫn:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Mở trang "Điểm danh QR" trên thiết bị khác</li>
                  <li>• Quét mã QR này để điểm danh</li>
                  <li>• Mỗi sinh viên chỉ điểm danh một lần</li>
                </ul>
              </div>

              {/* Token Info (Debug - Optional) */}
              {qrData.qr_token && (
                <div className="text-xs text-gray-400 text-center font-mono break-all">
                  Token: {qrData.qr_token}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {qrData && !loading && (
          <div className="flex gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Download className="h-4 w-4" />
              Tải xuống
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
