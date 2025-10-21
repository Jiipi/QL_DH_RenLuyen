import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  Calendar,
  CheckCircle,
  Edit,
  Eye,
  Filter,
  MapPin,
  Plus,
  Search,
  Trash2,
  XCircle,
  Sparkles
} from 'lucide-react';
import http from '../../services/http';
import useSemesterOptions from '../../hooks/useSemesterOptions';
import { useNotification } from '../../contexts/NotificationContext';
import { extractActivitiesFromAxiosResponse } from '../../utils/apiNormalization';
import { getActivityImage } from '../../utils/activityImages';

export default function AdminActivitiesModern() {
  const navigate = useNavigate();
  const { showSuccess, showError, confirm } = useNotification();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [semester, setSemester] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    if (m >= 7 && m <= 11) return `hoc_ky_1-${y}`;
    if (m === 12) return `hoc_ky_2-${y}`;
    if (m >= 1 && m <= 4) return `hoc_ky_2-${y - 1}`;
    return `hoc_ky_1-${y}`;
  });
  const [types, setTypes] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);
  const { options: semesterOptions } = useSemesterOptions();

  const statusLabels = {
    cho_duyet: 'Chờ duyệt',
    da_duyet: 'Đã duyệt',
    tu_choi: 'Từ chối',
    da_huy: 'Đã hủy',
    ket_thuc: 'Kết thúc'
  };
  const statusColors = {
    cho_duyet: 'bg-amber-50 text-amber-700 border-amber-200',
    da_duyet: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tu_choi: 'bg-rose-50 text-rose-700 border-rose-200',
    da_huy: 'bg-slate-50 text-slate-700 border-slate-200',
    ket_thuc: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  useEffect(() => {
    // Diagnostic marker to verify modern page is mounted
    try { if (typeof window !== 'undefined') window.__ADMIN_ACTIVITIES_VERSION__ = 'modern-2025-10-19'; } catch {}
    console.log('[AdminActivitiesModern] mounted v: modern-2025-10-19');
    loadTypes();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [statusFilter, typeFilter, semester, page, limit, search]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        typeId: typeFilter || undefined,
        semester: semester || undefined
      };
      const resp = await http.get('/admin/activities', { params });
      const list = extractActivitiesFromAxiosResponse(resp);
      // Try to read total from envelope if available
      const envelope = resp?.data;
      const pagination = envelope?.data?.pagination;
      setTotal(pagination?.total ?? (Array.isArray(list) ? list.length : 0));
      setActivities(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Load admin activities failed:', err);
      showError('Không thể tải danh sách hoạt động', 'Lỗi tải dữ liệu');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const resp = await http.get('/admin/activity-types');
      const data = resp?.data?.data || resp?.data || {};
      const arr = data.activityTypes || data.items || data || [];
      setTypes(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.warn('Load activity types failed', e);
      setTypes([]);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (activities || [])
      .filter(a => {
        const matchQ = !q ||
          a.ten_hd?.toLowerCase().includes(q) ||
          a.mo_ta?.toLowerCase().includes(q) ||
          a.dia_diem?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || a.trang_thai === statusFilter;
        const matchType = !typeFilter || a.loai_hd_id === typeFilter || a.loai_hd?.id === typeFilter;
        return matchQ && matchStatus && matchType;
      })
      .sort((a, b) => new Date(b.ngay_tao || b.ngay_bd || 0) - new Date(a.ngay_tao || a.ngay_bd || 0));
  }, [activities, search, statusFilter, typeFilter]);

  const handleCreate = () => navigate('/admin/activities/create');
  const handleEdit = (act) => navigate(`/admin/activities/${act.id}/edit`);

  const handleDelete = async (act) => {
    const ok = await confirm({ title: 'Xóa hoạt động?', message: `Bạn có chắc muốn xóa "${act.ten_hd}"?`, confirmText: 'Xóa', cancelText: 'Hủy' });
    if (!ok) return;
    try {
      await http.delete(`/admin/activities/${act.id}`);
      await loadActivities();
      showSuccess('Đã xóa hoạt động');
    } catch (err) {
      console.error('Delete activity failed:', err);
      showError('Không thể xóa hoạt động');
    }
  };

  const handleApprove = async (act) => {
    const ok = await confirm({ title: 'Duyệt hoạt động', message: `Xác nhận duyệt hoạt động "${act.ten_hd}"?`, confirmText: 'Duyệt', cancelText: 'Hủy' });
    if (!ok) return;
    try {
      await http.post(`/admin/activities/${act.id}/approve`);
      await loadActivities();
      showSuccess('Đã duyệt hoạt động');
    } catch (err) {
      console.error('Approve activity failed:', err);
      showError('Không thể duyệt hoạt động');
    }
  };

  const handleReject = async (act) => {
    const reason = window.prompt('Nhập lý do từ chối:', 'Không phù hợp yêu cầu');
    if (reason === null) return;
    try {
      await http.post(`/admin/activities/${act.id}/reject`, { reason });
      await loadActivities();
      showSuccess('Đã từ chối hoạt động');
    } catch (err) {
      console.error('Reject activity failed:', err);
      showError('Không thể từ chối hoạt động');
    }
  };

  const ActivityCard = ({ activity }) => {
    const deadline = activity.han_dk || activity.han_dang_ky;
    const isOpen = (() => {
      const now = new Date();
      const dl = deadline ? new Date(deadline) : (activity.ngay_bd ? new Date(activity.ngay_bd) : null);
      return dl && dl > now && (activity.trang_thai === 'da_duyet' || activity.trang_thai === 'cho_duyet');
    })();
    return (
      <div className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
        isOpen ? 'border-emerald-200 shadow-lg shadow-emerald-100' : 'border-gray-200 hover:border-indigo-200'
      }`}>
        {isOpen && (
          <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl shadow-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold">Đang mở ĐK</span>
            </div>
          </div>
        )}

        <img
          src={getActivityImage(activity.hinh_anh, activity.loai_hd?.ten_loai_hd)}
          alt={activity.ten_hd}
          className="w-full h-44 object-cover"
        />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">{activity.ten_hd}</h3>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColors[activity.trang_thai] || 'bg-gray-50 text-gray-700 border-gray-200'} whitespace-nowrap`}>
              {statusLabels[activity.trang_thai] || activity.trang_thai}
            </span>
          </div>
          {activity.loai_hd?.ten_loai_hd && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Filter className="h-3 w-3 mr-1" />
              {activity.loai_hd.ten_loai_hd}
            </span>
          )}
          <p className="text-gray-600 text-sm my-3 line-clamp-2">{activity.mo_ta || 'Không có mô tả'}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Ngày</p>
                <p className="truncate">{activity.ngay_bd ? new Date(activity.ngay_bd).toLocaleString('vi-VN') : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Địa điểm</p>
                <p className="truncate">{activity.dia_diem || '—'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => navigate(`/activities/${activity.id}`)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold">
              <Eye className="h-4 w-4" /> Xem
            </button>
            {(activity.trang_thai === 'cho_duyet') ? (
              <>
                <button onClick={() => handleApprove(activity)} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-sm font-semibold">
                  <CheckCircle className="h-4 w-4" /> Duyệt
                </button>
                <button onClick={() => handleReject(activity)} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-sm font-semibold">
                  <XCircle className="h-4 w-4" /> Từ chối
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleEdit(activity)} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 text-sm font-semibold">
                  <Edit className="h-4 w-4" /> Sửa
                </button>
                <button onClick={() => handleDelete(activity)} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-sm font-semibold">
                  <Trash2 className="h-4 w-4" /> Xóa
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="flex justify-center items-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <ActivityIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Danh Sách Hoạt Động</h1>
                  <p className="text-indigo-100 mt-1">Quản trị toàn bộ hoạt động trong hệ thống</p>
                </div>
              </div>
              <button onClick={handleCreate} className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold">
                <Plus className="h-5 w-5" /> Tạo hoạt động
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm hoạt động, mô tả, địa điểm..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="cho_duyet">Chờ duyệt</option>
                <option value="da_duyet">Đã duyệt</option>
                <option value="tu_choi">Từ chối</option>
                <option value="da_huy">Đã hủy</option>
                <option value="ket_thuc">Kết thúc</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Tất cả loại hoạt động</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.ten_loai_hd || t.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <select
                value={semester}
                onChange={(e) => { setSemester(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {(semesterOptions || []).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Activities Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow flex flex-col items-center justify-center text-gray-500">
            <ActivityIcon className="h-10 w-10 mb-3" />
            Không có hoạt động nào phù hợp
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(act => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Tổng: {total} • Trang {page}/{Math.max(1, Math.ceil(total / (limit || 1)))} </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-50"
            >Trước</button>
            <span className="text-sm">Trang {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil((total || 0) / (limit || 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-50"
            >Sau</button>
            <select
              value={limit}
              onChange={e => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
              className="ml-2 px-2 py-1.5 rounded-lg border border-gray-300"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
