import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Hourglass, AlertCircle, CheckCircle, ShieldCheck, Calendar } from 'lucide-react';
import http from '../services/http';
import { invalidateSemesterOptionsCache } from '../hooks/useSemesterOptions';

export default function SemesterClosureWidget({ compact = false, onChanged, classId: forcedClassId = null, enableSoftLock = false, enableHardLock = false, className = '' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null); // { classId, semester: { semester, year }, state: {...} }
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await http.get('/semesters/status', { params: forcedClassId ? { classId: forcedClassId } : {} });
      setInfo(res.data?.data || null);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể tải trạng thái học kỳ');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelForState = (s) => {
    switch (s) {
      case 'ACTIVE': return { text: 'Đang mở', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <Unlock className="w-4 h-4"/> };
      case 'CLOSING': return { text: 'Đang đề xuất đóng', color: 'text-amber-700', bg: 'bg-amber-50', icon: <Hourglass className="w-4 h-4"/> };
      case 'LOCKED_SOFT': return { text: 'Đã chốt mềm', color: 'text-indigo-700', bg: 'bg-indigo-50', icon: <Lock className="w-4 h-4"/> };
      case 'LOCKED_HARD': return { text: 'Đã khóa', color: 'text-rose-700', bg: 'bg-rose-50', icon: <ShieldCheck className="w-4 h-4"/> };
      default: return { text: s || 'Không xác định', color: 'text-gray-700', bg: 'bg-gray-50', icon: <AlertCircle className="w-4 h-4"/> };
    }
  };

  const formatSemester = (sem) => {
    if (!sem) return '';
    const hk = sem.semester === 'hoc_ky_1' ? 'HK1' : 'HK2';
    return `${hk} - ${sem.year}`;
  };

  const proposeClose = async () => {
    const classId = forcedClassId || info?.classId;
    if (!classId) return;
    try {
      setBusy(true);
      await http.post(`/semesters/${classId}/propose-close`, { semester: `${info.semester.semester}-${info.semester.year}` });
      await loadStatus();
      onChanged && onChanged();
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể đề xuất đóng');
    } finally {
      setBusy(false);
    }
  };

  const rollback = async () => {
    const classId = forcedClassId || info?.classId;
    if (!classId) return;
    try {
      setBusy(true);
      await http.post(`/semesters/${classId}/rollback`, { semester: `${info.semester.semester}-${info.semester.year}` });
      await loadStatus();
      onChanged && onChanged();
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể hủy chốt mềm');
    } finally {
      setBusy(false);
    }
  };

  const softLock = async () => {
    const classId = forcedClassId || info?.classId;
    if (!classId) return;
    try {
      setBusy(true);
      await http.post(`/semesters/${classId}/soft-lock`, { semester: `${info.semester.semester}-${info.semester.year}`, graceHours: 72 });
      await loadStatus();
      onChanged && onChanged();
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể chốt mềm');
    } finally {
      setBusy(false);
    }
  };

  const hardLock = async () => {
    const classId = forcedClassId || info?.classId;
    if (!classId) return;
    try {
      if (!window.confirm('Bạn chắc chắn muốn xác nhận đóng học kỳ này? Sau khi đóng cứng sẽ không thể chỉnh sửa dữ liệu học kỳ này.')) {
        return;
      }
      setBusy(true);
  await http.post(`/semesters/${classId}/hard-lock`, { semester: `${info.semester.semester}-${info.semester.year}` });
      await loadStatus();
  // Invalidate semester options cache so new semester becomes visible immediately
  invalidateSemesterOptionsCache();
      onChanged && onChanged();
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể chốt cứng');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl border p-3 ${compact ? '' : 'bg-white'}`}>
        <div className="text-sm text-gray-500">Đang tải trạng thái học kỳ...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-3 bg-rose-50 border-rose-200 text-rose-700 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  // Graceful: when API returns { success: true, data: null } meaning no class context
  if (!info) {
    return (
      <div className={`rounded-xl border p-3 ${compact ? '' : 'bg-white'} text-sm text-gray-500 ${className}`}>
        Chưa có lớp phụ trách hoặc chưa gán lớp
      </div>
    );
  }

  const stateMeta = labelForState(info.state?.state);
  const canPropose = info.state?.state === 'ACTIVE';
  const canRollback = info.state?.state === 'LOCKED_SOFT';
  const canSoftLock = enableSoftLock && info.state?.state === 'CLOSING';
  const canHardLock = enableHardLock && ['LOCKED_SOFT', 'CLOSING'].includes(info.state?.state);

  return (
  <div className={`rounded-2xl border ${compact ? 'p-3' : 'p-4 bg-white'} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Học kỳ hiện tại</div>
            <div className="font-semibold text-gray-900">{formatSemester(info.semester)}</div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border ${stateMeta.bg} ${stateMeta.color}`}>
          {stateMeta.icon}
          <span>{stateMeta.text}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {info.state?.state === 'LOCKED_SOFT' && info.state?.grace_until && (
          <div className="text-xs text-gray-600">
            Có thể hủy trước: <span className="font-medium">{new Date(info.state.grace_until).toLocaleString('vi-VN')}</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {canPropose && (
            <button onClick={proposeClose} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60">
              Đề xuất đóng học kỳ
            </button>
          )}
          {canSoftLock && (
            <button onClick={softLock} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60">
              Chốt mềm 72h
            </button>
          )}
          {canRollback && (
            <button onClick={rollback} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-60">
              Hủy chốt mềm
            </button>
          )}
          {canHardLock && (
            <button onClick={hardLock} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60">
              Xác nhận đóng học kỳ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
