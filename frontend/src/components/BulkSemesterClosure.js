import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Hourglass, AlertCircle, CheckCircle, ShieldCheck, Calendar, CheckSquare, Square } from 'lucide-react';
import http from '../services/http';
import { invalidateSemesterOptionsCache } from '../hooks/useSemesterOptions';

export default function BulkSemesterClosure({ className = '' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]); // [{ id, ten_lop, semester, state, students }]
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [currentSemester, setCurrentSemester] = useState('');

  const loadClassesStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get current semester
      const semRes = await http.get('/semesters/current');
      const activeSem = semRes.data?.data || {};
      const semesterStr = `${activeSem.semester}-${activeSem.year}`;
      setCurrentSemester(semesterStr);

      // Get all classes
      const classRes = await http.get('/admin/classes');
      const allClasses = classRes.data?.data || [];

      // Get status for each class
      const classesWithStatus = await Promise.all(
        allClasses.map(async (cls) => {
          try {
            const statusRes = await http.get('/semesters/status', { 
              params: { classId: cls.id } 
            });
            const statusData = statusRes.data?.data || {};
            
            return {
              id: cls.id,
              ten_lop: cls.ten_lop,
              khoa: cls.khoa,
              students: cls.soLuongSinhVien || 0,
              semester: statusData.semester || {},
              state: statusData.state?.state || 'UNKNOWN',
              stateDetail: statusData.state || {}
            };
          } catch (e) {
            return {
              id: cls.id,
              ten_lop: cls.ten_lop,
              khoa: cls.khoa,
              students: cls.soLuongSinhVien || 0,
              semester: {},
              state: 'ERROR',
              stateDetail: {}
            };
          }
        })
      );

      setClasses(classesWithStatus);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassesStatus();
  }, []);

  const labelForState = (s) => {
    switch (s) {
      case 'ACTIVE': 
        return { 
          text: 'Đang mở', 
          color: 'text-emerald-700', 
          bg: 'bg-emerald-50', 
          border: 'border-emerald-200',
          icon: <Unlock className="w-3.5 h-3.5"/> 
        };
      case 'CLOSING': 
        return { 
          text: 'Đang đề xuất', 
          color: 'text-amber-700', 
          bg: 'bg-amber-50', 
          border: 'border-amber-200',
          icon: <Hourglass className="w-3.5 h-3.5"/> 
        };
      case 'LOCKED_SOFT': 
        return { 
          text: 'Chốt mềm', 
          color: 'text-indigo-700', 
          bg: 'bg-indigo-50', 
          border: 'border-indigo-200',
          icon: <Lock className="w-3.5 h-3.5"/> 
        };
      case 'LOCKED_HARD': 
        return { 
          text: 'Đã khóa', 
          color: 'text-rose-700', 
          bg: 'bg-rose-50', 
          border: 'border-rose-200',
          icon: <ShieldCheck className="w-3.5 h-3.5"/> 
        };
      default: 
        return { 
          text: 'Không xác định', 
          color: 'text-gray-700', 
          bg: 'bg-gray-50', 
          border: 'border-gray-200',
          icon: <AlertCircle className="w-3.5 h-3.5"/> 
        };
    }
  };

  const formatSemester = (sem) => {
    if (!sem || !sem.semester) return 'N/A';
    const hk = sem.semester === 'hoc_ky_1' ? 'HK1' : 'HK2';
    return `${hk} - ${sem.year || ''}`;
  };

  const toggleSelectAll = () => {
    if (selectedClassIds.size === classes.length) {
      setSelectedClassIds(new Set());
    } else {
      setSelectedClassIds(new Set(classes.map(c => c.id)));
    }
  };

  const toggleClass = (classId) => {
    const newSet = new Set(selectedClassIds);
    if (newSet.has(classId)) {
      newSet.delete(classId);
    } else {
      newSet.add(classId);
    }
    setSelectedClassIds(newSet);
  };

  const bulkSoftLock = async () => {
    if (selectedClassIds.size === 0) {
      alert('Vui lòng chọn ít nhất một lớp');
      return;
    }

    const confirmMsg = `Bạn có chắc chắn muốn CHỐT MỀM ${selectedClassIds.size} lớp?\n\nChốt mềm cho phép hủy trong vòng 72 giờ.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setBusy(true);
      const results = [];
      
      for (const classId of selectedClassIds) {
        const cls = classes.find(c => c.id === classId);
        if (!cls) continue;

        try {
          await http.post(`/semesters/${classId}/soft-lock`, { 
            semester: currentSemester,
            graceHours: 72 
          });
          results.push({ classId, success: true, name: cls.ten_lop });
        } catch (e) {
          results.push({ 
            classId, 
            success: false, 
            name: cls.ten_lop,
            error: e?.response?.data?.message || 'Lỗi' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        const failedClasses = results.filter(r => !r.success).map(r => r.name).join(', ');
        alert(`Chốt mềm hoàn tất:\n✅ Thành công: ${successCount}\n❌ Thất bại: ${failCount}\n\nLớp thất bại: ${failedClasses}`);
      } else {
        alert(`✅ Chốt mềm thành công ${successCount} lớp!`);
      }

      await loadClassesStatus();
    } catch (e) {
      setError('Có lỗi xảy ra khi chốt mềm');
    } finally {
      setBusy(false);
    }
  };

  const bulkHardLock = async () => {
    if (selectedClassIds.size === 0) {
      alert('Vui lòng chọn ít nhất một lớp');
      return;
    }

    const confirmMsg = `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn ĐÓNG CỨNG ${selectedClassIds.size} lớp?\n\n✋ Sau khi đóng cứng sẽ KHÔNG THỂ chỉnh sửa dữ liệu học kỳ này!\n\nHành động này không thể hoàn tác.`;
    if (!window.confirm(confirmMsg)) return;

    const doubleConfirm = window.prompt(`Nhập "XAC NHAN" để đóng cứng ${selectedClassIds.size} lớp:`);
    if (doubleConfirm !== 'XAC NHAN') {
      alert('Đã hủy thao tác');
      return;
    }

    try {
      setBusy(true);
      const results = [];
      
      for (const classId of selectedClassIds) {
        const cls = classes.find(c => c.id === classId);
        if (!cls) continue;

        try {
          await http.post(`/semesters/${classId}/hard-lock`, { 
            semester: currentSemester 
          });
          results.push({ classId, success: true, name: cls.ten_lop });
        } catch (e) {
          results.push({ 
            classId, 
            success: false, 
            name: cls.ten_lop,
            error: e?.response?.data?.message || 'Lỗi' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        const failedClasses = results.filter(r => !r.success).map(r => r.name).join(', ');
        alert(`Đóng cứng hoàn tất:\n✅ Thành công: ${successCount}\n❌ Thất bại: ${failCount}\n\nLớp thất bại: ${failedClasses}`);
      } else {
        alert(`✅ Đóng cứng thành công ${successCount} lớp!`);
      }

      // Invalidate cache to refresh semester options
      invalidateSemesterOptionsCache();
      await loadClassesStatus();
      setSelectedClassIds(new Set()); // Clear selection after hard lock
    } catch (e) {
      setError('Có lỗi xảy ra khi đóng cứng');
    } finally {
      setBusy(false);
    }
  };

  const rollbackSelected = async () => {
    if (selectedClassIds.size === 0) {
      alert('Vui lòng chọn ít nhất một lớp');
      return;
    }

    const confirmMsg = `Bạn có chắc chắn muốn HỦY CHỐT MỀM ${selectedClassIds.size} lớp?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setBusy(true);
      const results = [];
      
      for (const classId of selectedClassIds) {
        const cls = classes.find(c => c.id === classId);
        if (!cls || cls.state !== 'LOCKED_SOFT') continue;

        try {
          await http.post(`/semesters/${classId}/rollback`, { 
            semester: currentSemester 
          });
          results.push({ classId, success: true, name: cls.ten_lop });
        } catch (e) {
          results.push({ 
            classId, 
            success: false, 
            name: cls.ten_lop,
            error: e?.response?.data?.message || 'Lỗi' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        const failedClasses = results.filter(r => !r.success).map(r => r.name).join(', ');
        alert(`Hủy chốt mềm hoàn tất:\n✅ Thành công: ${successCount}\n❌ Thất bại: ${failCount}\n\nLớp thất bại: ${failedClasses}`);
      } else {
        alert(`✅ Hủy chốt mềm thành công ${successCount} lớp!`);
      }

      await loadClassesStatus();
    } catch (e) {
      setError('Có lỗi xảy ra khi hủy chốt mềm');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl border p-6 bg-white ${className}`}>
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span>Đang tải trạng thái các lớp...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-4 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  const allSelected = selectedClassIds.size === classes.length && classes.length > 0;
  const someSelected = selectedClassIds.size > 0;
  const hasLockedSoftSelected = Array.from(selectedClassIds).some(id => {
    const cls = classes.find(c => c.id === id);
    return cls?.state === 'LOCKED_SOFT';
  });

  return (
    <div className={`rounded-2xl border bg-white p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Quản lý đóng học kỳ theo lớp</h3>
            <p className="text-sm text-gray-500">Học kỳ hiện tại: <span className="font-semibold text-gray-700">{currentSemester}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-2"
            disabled={busy}
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
            <span>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
          </button>
        </div>
      </div>

      {/* Class List */}
      <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
        {classes.map((cls) => {
          const isSelected = selectedClassIds.has(cls.id);
          const stateMeta = labelForState(cls.state);
          
          return (
            <div
              key={cls.id}
              onClick={() => toggleClass(cls.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{cls.ten_lop}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                      <span>Khoa: {cls.khoa || 'N/A'}</span>
                      <span>•</span>
                      <span>{cls.students} sinh viên</span>
                      <span>•</span>
                      <span>HK: {formatSemester(cls.semester)}</span>
                    </div>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${stateMeta.bg} ${stateMeta.color} ${stateMeta.border}`}>
                  {stateMeta.icon}
                  <span>{stateMeta.text}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{selectedClassIds.size}</span> / {classes.length} lớp được chọn
        </div>
        <div className="flex items-center gap-3">
          {hasLockedSoftSelected && (
            <button
              onClick={rollbackSelected}
              disabled={busy || !someSelected}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Hủy chốt mềm ({selectedClassIds.size})
            </button>
          )}
          <button
            onClick={bulkSoftLock}
            disabled={busy || !someSelected}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Chốt mềm 72h ({selectedClassIds.size})
          </button>
          <button
            onClick={bulkHardLock}
            disabled={busy || !someSelected}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Đóng cứng học kỳ ({selectedClassIds.size})
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2 text-xs text-blue-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Hướng dẫn:</strong> Chọn các lớp cần đóng học kỳ bằng checkbox. 
            "Chốt mềm" cho phép hủy trong 72h. "Đóng cứng" sẽ khóa vĩnh viễn và không thể hoàn tác.
          </div>
        </div>
      </div>
    </div>
  );
}
