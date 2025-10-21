import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, Eye, FileText } from 'lucide-react';
import http from '../../services/http';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';

export default function TeacherRegistrationApprovals() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('cho_duyet');
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    type: '', 
    registrationId: null, 
    isBulk: false,
    title: '', 
    message: '' 
  });
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  // Status mappings
  const statusLabels = {
    'cho_duyet': 'Chờ duyệt',
    'da_duyet': 'Đã duyệt',
    'tu_choi': 'Từ chối',
    'da_tham_gia': 'Đã tham gia',
    'vang_mat': 'Vắng mặt'
  };

  const statusColors = {
    'cho_duyet': 'bg-yellow-100 text-yellow-800',
    'da_duyet': 'bg-green-100 text-green-800',
    'tu_choi': 'bg-red-100 text-red-800',
    'da_tham_gia': 'bg-blue-100 text-blue-800',
    'vang_mat': 'bg-gray-100 text-gray-800'
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 Đang tải danh sách đăng ký từ API...');
      
      // Teacher has specific endpoint /teacher/registrations/pending
      const response = await http.get('/teacher/registrations/pending');
      console.log('📦 Response từ API:', response.data);
      
      // Parse response - backend returns: { success: true, data: { items: [...], total }, message }
      const responseData = response.data?.data || response.data || {};
      const items = responseData.items || responseData.data || responseData || [];
      const registrationsArray = Array.isArray(items) ? items : [];
      console.log('📋 Dữ liệu đăng ký:', registrationsArray);
      
      setRegistrations(registrationsArray);
      setError('');
      
      if (registrationsArray.length > 0) {
        console.log(`✅ Tải thành công ${registrationsArray.length} đăng ký`);
      } else {
        console.log('⚠️ Không có đăng ký nào');
      }
    } catch (err) {
      console.error('❌ Lỗi khi tải đăng ký:', err);
      console.error('Chi tiết lỗi:', err.response?.data);
      setError('Không thể tải danh sách đăng ký: ' + (err.response?.data?.message || err.message));
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleApproveClick = (registrationId) => {
    setConfirmModal({
      isOpen: true,
      type: 'approve',
      registrationId,
      isBulk: false,
      title: 'Xác nhận phê duyệt',
      message: 'Bạn có chắc chắn muốn phê duyệt đăng ký này không?'
    });
  };

  const handleRejectClick = (registrationId) => {
    setRejectReason('');
    setConfirmModal({
      isOpen: true,
      type: 'reject',
      registrationId,
      isBulk: false,
      title: 'Xác nhận từ chối',
      message: 'Vui lòng nhập lý do từ chối đăng ký:'
    });
  };

  const handleBulkApproveClick = () => {
    if (selectedRegistrations.length === 0) {
      showToast('Vui lòng chọn ít nhất một đăng ký', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'approve',
      registrationId: null,
      isBulk: true,
      title: 'Xác nhận phê duyệt hàng loạt',
      message: `Bạn có chắc chắn muốn phê duyệt ${selectedRegistrations.length} đăng ký?`
    });
  };

  const handleBulkRejectClick = () => {
    if (selectedRegistrations.length === 0) {
      showToast('Vui lòng chọn ít nhất một đăng ký', 'warning');
      return;
    }

    setRejectReason('');
    setConfirmModal({
      isOpen: true,
      type: 'reject',
      registrationId: null,
      isBulk: true,
      title: 'Xác nhận từ chối hàng loạt',
      message: `Vui lòng nhập lý do từ chối ${selectedRegistrations.length} đăng ký:`
    });
  };

  const handleConfirmAction = async () => {
    const { type, registrationId, isBulk } = confirmModal;
    
    try {
      setProcessing(true);
      
      if (type === 'approve') {
        if (isBulk) {
          await Promise.all(
            selectedRegistrations.map(id => 
              http.post(`/teacher/registrations/${id}/approve`)
            )
          );
          showToast(`Đã phê duyệt ${selectedRegistrations.length} đăng ký thành công!`, 'success');
          setSelectedRegistrations([]);
        } else {
          await http.post(`/teacher/registrations/${registrationId}/approve`);
          showToast('Đã phê duyệt đăng ký thành công!', 'success');
        }
        await loadRegistrations();
      } else if (type === 'reject') {
        if (!rejectReason || rejectReason.trim() === '') {
          showToast('Vui lòng nhập lý do từ chối', 'warning');
          setProcessing(false);
          return;
        }
        
        if (isBulk) {
          await Promise.all(
            selectedRegistrations.map(id => 
              http.post(`/teacher/registrations/${id}/reject`, { reason: rejectReason.trim() })
            )
          );
          showToast(`Đã từ chối ${selectedRegistrations.length} đăng ký thành công!`, 'success');
          setSelectedRegistrations([]);
        } else {
          await http.post(`/teacher/registrations/${registrationId}/reject`, { reason: rejectReason.trim() });
          showToast('Đã từ chối đăng ký thành công!', 'success');
        }
        await loadRegistrations();
      }
      
      setConfirmModal({ isOpen: false, type: '', registrationId: null, isBulk: false, title: '', message: '' });
      setRejectReason('');
    } catch (err) {
      console.error('Error processing registration:', err);
      const errorMsg = err?.response?.data?.message || 'Không thể xử lý đăng ký. Vui lòng thử lại.';
      showToast(errorMsg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectRegistration = (id) => {
    setSelectedRegistrations(prev => 
      prev.includes(id) 
        ? prev.filter(regId => regId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredRegistrations.map(reg => reg.id);
    if (selectedRegistrations.length === filteredIds.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(filteredIds);
    }
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = 
      registration.sinh_vien?.nguoi_dung?.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.sinh_vien?.mssv?.includes(searchTerm) ||
      registration.hoat_dong?.ten_hd?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || registration.trang_thai_dk === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const RegistrationCard = ({ registration }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header with checkbox */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={selectedRegistrations.includes(registration.id)}
            onChange={() => toggleSelectRegistration(registration.id)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {registration.sinh_vien?.nguoi_dung?.ho_ten}
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>MSSV: {registration.sinh_vien?.mssv}</p>
              <p>Lớp: {registration.sinh_vien?.lop?.ten_lop}</p>
            </div>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[registration.trang_thai_dk]}`}>
          {statusLabels[registration.trang_thai_dk]}
        </span>
      </div>

      {/* Activity Info */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">{registration.hoat_dong?.ten_hd}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{new Date(registration.hoat_dong?.ngay_bd).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>{new Date(registration.hoat_dong?.ngay_bd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Registration Note */}
      {registration.ghi_chu && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 italic">"{registration.ghi_chu}"</p>
        </div>
      )}

      {/* Registration Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>Ngày đăng ký: {new Date(registration.ngay_dk).toLocaleDateString('vi-VN')}</span>
        <span className="font-semibold text-blue-600">Điểm RL: {registration.hoat_dong?.diem_rl} điểm</span>
      </div>

      {/* Actions */}
      {registration.trang_thai_dk === 'cho_duyet' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleApproveClick(registration.id)}
            disabled={processing}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Phê duyệt
          </button>
          <button
            onClick={() => handleRejectClick(registration.id)}
            disabled={processing}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Từ chối
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phê duyệt Đăng ký Sinh viên</h1>
          <p className="text-gray-600 mt-1">Quản lý đăng ký tham gia hoạt động của sinh viên trong các lớp bạn phụ trách</p>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{filteredRegistrations.length}</span> đăng ký
        </div>
      </div>



      {/* Filters and Bulk Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên sinh viên, MSSV hoặc hoạt động..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cho_duyet">Chờ duyệt</option>
              <option value="all">Tất cả trạng thái</option>
              <option value="da_duyet">Đã duyệt</option>
              <option value="tu_choi">Từ chối</option>
              <option value="da_tham_gia">Đã tham gia</option>
              <option value="vang_mat">Vắng mặt</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedRegistrations.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleBulkApproveClick}
                disabled={processing}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Duyệt ({selectedRegistrations.length})
              </button>
              <button
                onClick={handleBulkRejectClick}
                disabled={processing}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <UserX className="h-4 w-4 mr-2" />
                Từ chối ({selectedRegistrations.length})
              </button>
            </div>
          )}
        </div>

        {/* Select All */}
        {filteredRegistrations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedRegistrations.length === filteredRegistrations.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                Chọn tất cả ({filteredRegistrations.length} đăng ký)
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRegistrations.map(registration => (
            <RegistrationCard key={registration.id} registration={registration} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'cho_duyet' ? 'Không tìm thấy đăng ký' : 'Không có đăng ký nào cần duyệt'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'cho_duyet' 
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'
              : 'Tất cả đăng ký đã được xử lý'}
          </p>
          <button
            onClick={loadRegistrations}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tải lại
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê tổng quan</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{registrations.length}</div>
            <div className="text-sm text-gray-600">Tổng đăng ký</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {registrations.filter(r => r.trang_thai_dk === 'cho_duyet').length}
            </div>
            <div className="text-sm text-gray-600">Chờ duyệt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {registrations.filter(r => r.trang_thai_dk === 'da_duyet').length}
            </div>
            <div className="text-sm text-gray-600">Đã duyệt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {registrations.filter(r => r.trang_thai_dk === 'tu_choi').length}
            </div>
            <div className="text-sm text-gray-600">Từ chối</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {registrations.filter(r => r.trang_thai_dk === 'da_tham_gia').length}
            </div>
            <div className="text-sm text-gray-600">Đã tham gia</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          setConfirmModal({ isOpen: false, type: '', registrationId: null, isBulk: false, title: '', message: '' });
          setRejectReason('');
        }}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type === 'approve' ? 'confirm' : 'warning'}
        confirmText={confirmModal.type === 'approve' ? 'Phê duyệt' : 'Từ chối'}
        cancelText="Hủy"
        showInput={confirmModal.type === 'reject'}
        inputPlaceholder="Nhập lý do từ chối (tùy chọn)..."
        inputValue={rejectReason}
        onInputChange={setRejectReason}
      />

      {/* Toast Notification */}
      {toast.isOpen && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ isOpen: false, message: '', type: 'success' })}
          duration={3000}
        />
      )}
    </div>
  );
}
