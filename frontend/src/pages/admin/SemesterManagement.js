import React, { useState, useEffect } from 'react';
import { Calendar, Lock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import http from '../../services/http';

export default function SemesterManagement() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await http.get('/semesters/list');
      setSemesters(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể tải danh sách học kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemesters();
  }, []);

  const handleActivate = async (semester) => {
    try {
      setActivating(semester.value);
      await http.post('/semesters/activate', { semester: semester.value });
      
      // Invalidate cache
      try {
        sessionStorage.removeItem('semester_options');
        sessionStorage.removeItem('current_semester');
        localStorage.setItem('semester_options_invalidate', Date.now().toString());
        window.dispatchEvent(new Event('semester_options_bust'));
      } catch (_) {}

      // Reload list
      await loadSemesters();
      setShowConfirm(null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Không thể kích hoạt học kỳ');
    } finally {
      setActivating(null);
    }
  };

  const handleCreateSemester = async (auto = false) => {
    try {
      setCreating(true);
      const endpoint = auto ? '/semesters/create-next' : '/semesters/create';
      await http.post(endpoint);
      
      // Reload list
      await loadSemesters();
      setShowCreateModal(false);
    } catch (e) {
      alert(e?.response?.data?.message || 'Không thể tạo học kỳ mới');
    } finally {
      setCreating(false);
    }
  };

  const getSemesterLabel = (value) => {
    const [hk, year] = value.split('-');
    const hkNum = hk.replace('hoc_ky_', '');
    return `HK${hkNum} (${year}-${parseInt(year) + 1})`;
  };

  const getStatusBadge = (status, isActive) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          <CheckCircle size={14} />
          Đang hoạt động
        </span>
      );
    }
    if (status === 'LOCKED_HARD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          <Lock size={14} />
          Đã khóa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
        <Calendar size={14} />
        Chưa kích hoạt
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Quản lý học kỳ</h1>
              <p className="text-sm text-gray-500 mt-1">Kích hoạt học kỳ mới và quản lý trạng thái</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Calendar size={16} />
              Tạo học kỳ mới
            </button>
            <button
              onClick={loadSemesters}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={16} />
              Tải lại
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Semester List */}
        <div className="space-y-3">
          {semesters.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu học kỳ
            </div>
          )}
          
          {semesters.map((sem) => (
            <div
              key={sem.value}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                sem.is_active
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${sem.is_active ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <Calendar size={24} className={sem.is_active ? 'text-green-600' : 'text-gray-600'} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{sem.label}</div>
                  <div className="text-sm text-gray-500">{getSemesterLabel(sem.value)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(sem.status, sem.is_active)}
                
                {!sem.is_active && (
                  <button
                    onClick={() => setShowConfirm(sem)}
                    disabled={activating === sem.value}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activating === sem.value
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {activating === sem.value ? 'Đang kích hoạt...' : 'Kích hoạt'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Lưu ý:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Chỉ có một học kỳ được kích hoạt tại một thời điểm</li>
            <li>Khi kích hoạt học kỳ mới, học kỳ hiện tại sẽ tự động bị khóa cứng</li>
            <li>Dropdown học kỳ sẽ tự động cập nhật và chọn học kỳ mới được kích hoạt</li>
            <li>Dữ liệu của học kỳ đã khóa vẫn được lưu trữ và có thể xem</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="text-yellow-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Xác nhận kích hoạt học kỳ</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Bạn có chắc chắn muốn kích hoạt <strong>{showConfirm.label}</strong>?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Học kỳ hiện tại sẽ tự động bị <strong>khóa cứng</strong> và không thể chỉnh sửa.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={activating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleActivate(showConfirm)}
                disabled={activating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {activating ? 'Đang kích hoạt...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Semester Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="text-green-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Tạo học kỳ mới</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Chọn phương thức tạo học kỳ:
            </p>
            
            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleCreateSemester(true)}
                disabled={creating}
                className="w-full p-4 text-left border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <RefreshCw size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">Tự động</div>
                    <div className="text-sm text-gray-500">Tạo học kỳ tiếp theo dựa trên học kỳ gần nhất</div>
                  </div>
                </div>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                ℹ️ Học kỳ mới sẽ được tạo nhưng <strong>chưa kích hoạt</strong>. Bạn cần kích hoạt thủ công sau khi tạo.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
