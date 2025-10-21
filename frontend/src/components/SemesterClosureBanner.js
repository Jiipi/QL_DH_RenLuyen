import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Hourglass, Lock } from 'lucide-react';
import http from '../services/http';

// Lightweight, read-only banner to show semester closing/soft-lock status and countdown
// Props: { classId?: string, refreshMs?: number }
export default function SemesterClosureBanner({ classId = null, refreshMs = 60000 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null); // { state: { state, grace_until }, semester, classId }
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      setLoading(true);
      const res = await http.get('/semesters/status', { params: classId ? { classId } : {} });
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
    load();
    // periodic refresh
    const t = setInterval(load, refreshMs);
    // ticking for countdown
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, refreshMs]);

  const state = info?.state?.state;
  const graceUntil = info?.state?.grace_until ? new Date(info.state.grace_until).getTime() : null;

  const remaining = useMemo(() => {
    if (!graceUntil) return null;
    const diff = graceUntil - now;
    if (diff <= 0) return { expired: true, text: 'Đã hết thời gian hủy chốt mềm' };
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d > 0) parts.push(`${d} ngày`);
    if (h > 0) parts.push(`${h} giờ`);
    if (m > 0) parts.push(`${m} phút`);
    if (d === 0 && h === 0) parts.push(`${sec} giây`);
    return { expired: false, text: parts.join(' ') };
  }, [graceUntil, now]);

  if (loading || error || !info) return null; // non-invasive: don't block UI

  if (!(state === 'CLOSING' || state === 'LOCKED_SOFT')) return null;

  const isClosing = state === 'CLOSING';
  const isSoftLocked = state === 'LOCKED_SOFT';

  return (
    <div className={`w-full rounded-2xl border px-4 py-3 ${isClosing ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'} flex items-start gap-3`}>
      <div className={`mt-0.5 ${isClosing ? 'text-amber-600' : 'text-indigo-600'}`}>
        {isClosing ? <Hourglass className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        {isClosing && (
          <div className="text-sm text-amber-800 font-medium">
            Học kỳ đang trong trạng thái đề xuất đóng. Vui lòng hoàn tất các thao tác còn lại sớm.
          </div>
        )}
        {isSoftLocked && (
          <div className="text-sm text-indigo-800 font-medium">
            Học kỳ đã chốt mềm. Tạm thời khóa các thao tác ghi (đăng ký, phê duyệt, điểm danh...).
          </div>
        )}
        {isSoftLocked && graceUntil && (
          <div className="text-xs text-gray-700 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            Có thể hủy chốt mềm trước: <span className="font-semibold">{new Date(graceUntil).toLocaleString('vi-VN')}</span>
            {remaining && !remaining.expired && <span className="ml-2 text-gray-600">(Còn {remaining.text})</span>}
          </div>
        )}
      </div>
    </div>
  );
}
