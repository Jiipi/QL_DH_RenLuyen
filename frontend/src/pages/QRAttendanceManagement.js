import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Eye, CheckCircle, QrCode, RefreshCw } from 'lucide-react';
import http from '../services/http';
import ClassManagementLayout from '../components/ClassManagementLayout';
import AdminStudentLayout from '../components/AdminStudentLayout';
import { useAppStore } from '../store/useAppStore';

export default function QRAttendanceManagement() {
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const location = useLocation();
  const isTeacherContext = location?.pathname?.startsWith('/teacher');
  
  const { user } = useAppStore();
  const userRole = user?.role || user?.vai_tro || '';
  const isAdmin = String(userRole).toUpperCase() === 'ADMIN';
  
  useEffect(() => { loadActivities(); }, []);
  useEffect(() => { 
    if (selectedActivity) {
      loadAttendanceList(selectedActivity.id);
      loadQrForActivity(selectedActivity.id);
    } else {
      setQrDataUrl('');
      setAttendances([]);
    }
  }, [selectedActivity]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await http.get('/activities');
      const data = response.data?.data || response.data || [];
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách hoạt động');
      setActivities([]);
    } finally { setLoading(false); }
  };

  const loadAttendanceList = async (activityId) => {
    try {
      const response = await http.get(`/activities/${activityId}/attendance`);
      const data = response.data?.data || response.data || [];
      setAttendances(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách điểm danh');
      setAttendances([]);
    }
  };

  const loadQrForActivity = async (activityId) => {
    try {
      const response = await http.get(`/activities/${activityId}/qr`, { params: { image: 1 } });
      const img = response.data?.data?.image || '';
      setQrDataUrl(img);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo mã QR');
    }
  };

  const markAttendance = async () => {
    if (!selectedActivity) return;
    try {
      setLoading(true);
      await http.post(`/activities/${selectedActivity.id}/attendance`);
      await loadAttendanceList(selectedActivity.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể điểm danh');
    } finally { setLoading(false); }
  };

  const formatDateTime = (dateString) => new Date(dateString).toLocaleString('vi-VN');

  const content = (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quản lý điểm danh</h1>
        <p className="text-gray-600">Điểm danh trực tiếp vào hoạt động (không cần phiên QR)</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError('')} className="text-red-600 underline text-sm mt-1">Đóng</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Danh sách hoạt động</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Đang tải...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(activities || []).map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedActivity?.id === activity.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="font-medium text-gray-800">{activity.ten_hd}</div>
                  <div className="text-sm text-gray-600">
                    {formatDateTime(activity.ngay_bd)} - {formatDateTime(activity.ngay_kt)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Địa điểm: {activity.dia_diem || 'Chưa xác định'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedActivity && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Mã QR điểm danh</h2>
              {qrDataUrl ? (
                <div className="text-center">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="mx-auto mb-4 border border-gray-200 rounded-lg"
                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                  />
                  <p className="text-sm text-gray-600">
                    Quét mã QR này để điểm danh vào hoạt động
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Đang tạo mã QR...</p>
                </div>
              )}
            </div>
          )}

          {selectedActivity && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Danh sách điểm danh</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(attendances || []).map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {attendance.sinh_vien?.nguoi_dung?.ho_ten || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {attendance.sinh_vien?.mssv || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {attendance.co_mat ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-red-500 rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isTeacherContext) {
    return content;
  }

  return (
    isAdmin ? (
      <AdminStudentLayout>{content}</AdminStudentLayout>
    ) : (
      <ClassManagementLayout role="lop_truong">{content}</ClassManagementLayout>
    )
  );
}


