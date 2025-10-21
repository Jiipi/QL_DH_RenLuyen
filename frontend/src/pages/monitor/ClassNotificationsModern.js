import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, Activity, AlertCircle, Sparkles, CheckCircle, Clock, MessageSquare, Target, Filter, Search, Calendar, TrendingUp, Zap } from 'lucide-react';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';

export default function ClassNotifications() {
  const { showSuccess, showError } = useNotification();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scope, setScope] = useState('class');
  const [activityId, setActivityId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sentHistory, setSentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    classScope: 0,
    activityScope: 0
  });

  // Simulated notification templates
  const templates = [
    { id: 1, name: 'Thông báo hoạt động mới', title: 'Hoạt động mới: [Tên hoạt động]', message: 'Lớp có hoạt động mới. Mời các bạn đăng ký tham gia trước ngày [Hạn].' },
    { id: 2, name: 'Nhắc nhở đăng ký', title: 'Nhắc nhở: Sắp hết hạn đăng ký', message: 'Các hoạt động sau sắp hết hạn đăng ký. Vui lòng đăng ký sớm để không bỏ lỡ.' },
    { id: 3, name: 'Thông báo kết quả', title: 'Thông báo kết quả tham gia', message: 'Kết quả tham gia hoạt động [Tên] đã được công bố. Vui lòng kiểm tra.' },
    { id: 4, name: 'Thông báo quan trọng', title: 'Thông báo quan trọng từ lớp trưởng', message: 'Lớp có thông báo quan trọng. Vui lòng đọc kỹ và thực hiện đầy đủ.' }
  ];

  useEffect(() => {
    loadStats();
    loadSentHistory();
  }, []);

  const loadSentHistory = async () => {
    try {
      const response = await http.get('/notifications/sent');
      const data = response.data?.data || response.data;
      
      if (data.history && Array.isArray(data.history)) {
        setSentHistory(data.history);
        
        // Calculate stats from history
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const thisWeekCount = data.history.filter(item => 
          new Date(item.date) >= oneWeekAgo
        ).length;
        
        const classCount = data.history.filter(item => 
          item.scope === 'class'
        ).length;
        
        const activityCount = data.history.filter(item => 
          item.scope === 'activity'
        ).length;
        
        setStats({
          total: data.history.length,
          thisWeek: thisWeekCount,
          classScope: classCount,
          activityScope: activityCount
        });
      }
    } catch (err) {
      console.error('Error loading sent history:', err);
    }
  };

  const loadStats = () => {
    // This is now handled by loadSentHistory
  };

  const handleNotificationClick = async (notification) => {
    try {
      const response = await http.get(`/notifications/sent/${notification.id}`);
      const data = response.data?.data || response.data;
      setSelectedNotification(data);
      setShowDetailModal(true);
    } catch (err) {
      showError('Không thể tải chi tiết thông báo');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title || !message) {
      setError('Vui lòng nhập tiêu đề và nội dung');
      return;
    }
    if (scope === 'activity' && !activityId) {
      setError('Vui lòng nhập ID hoạt động khi gửi theo hoạt động');
      return;
    }
    try {
      setSending(true);
      let currentUserId = '2de13832-342f-4a60-9996-04fe512d2549';
      try {
        const t = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
        if (t && t.split('.').length === 3) {
          const payloadPart = JSON.parse(atob(t.split('.')[1]));
          if (payloadPart?.sub) currentUserId = payloadPart.sub;
        }
      } catch (_) {}
      const payload = { 
        tieu_de: title, 
        noi_dung: message, 
        nguoi_nhan_id: currentUserId,
        scope: scope,
        activityId: scope === 'activity' ? activityId : undefined,
        muc_do_uu_tien: 'trung_binh',
        phuong_thuc_gui: 'trong_he_thong'
      };
      await http.post('/notifications', payload);
      showSuccess('Đã gửi thông báo thành công! 🎉');
      setTitle('');
      setMessage('');
      setActivityId('');
      loadSentHistory(); // Reload history after sending
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      showError(apiMsg ? String(apiMsg) : 'Không thể gửi thông báo');
    } finally {
      setSending(false);
    }
  };

  const useTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  const charCount = message.length;
  const maxChars = 500;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Gửi Thông Báo</h1>
                  <p className="text-indigo-100 mt-1">Gửi thông báo tới sinh viên trong lớp</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 font-semibold"
              >
                <Clock className="h-5 w-5" />
                {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <MessageSquare className="h-6 w-6" />
              </div>
              <Sparkles className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total}</div>
            <div className="text-indigo-100 text-sm font-medium">Tổng thông báo</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Zap className="h-6 w-6" />
              </div>
              <TrendingUp className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.thisWeek}</div>
            <div className="text-emerald-100 text-sm font-medium">Tuần này</div>
          </div>

          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <Target className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.classScope}</div>
            <div className="text-amber-100 text-sm font-medium">Toàn lớp</div>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <Filter className="h-5 w-5 opacity-50" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.activityScope}</div>
            <div className="text-rose-100 text-sm font-medium">Theo hoạt động</div>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-4 flex items-center text-red-700 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-2 bg-red-100 rounded-xl mr-3">
              <AlertCircle className="h-5 w-5" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 flex items-center text-green-700 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-2 bg-green-100 rounded-xl mr-3">
              <CheckCircle className="h-5 w-5" />
            </div>
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Templates */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Mẫu thông báo nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => useTemplate(template)}
                className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-indigo-600 transition-colors">
                  {template.name}
                </div>
                <div className="text-xs text-gray-600 line-clamp-2">
                  {template.message}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSend} className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6 space-y-6">
          <div>
            <label className="flex text-sm font-bold text-gray-900 mb-2 items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              Tiêu đề thông báo
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              placeholder="Nhập tiêu đề ngắn gọn, rõ ràng..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex text-sm font-bold text-gray-900 items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                Nội dung thông báo
              </label>
              <span className={`text-xs font-medium ${charCount > maxChars ? 'text-red-600' : 'text-gray-500'}`}>
                {charCount}/{maxChars}
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={maxChars}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              placeholder="Nhập nội dung chi tiết thông báo..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex text-sm font-bold text-gray-900 mb-2 items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                Phạm vi gửi
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              >
                <option value="class">🎓 Toàn lớp</option>
                <option value="activity">📋 Theo hoạt động</option>
              </select>
            </div>
            {scope === 'activity' && (
              <div className="md:col-span-2">
                <label className="flex text-sm font-bold text-gray-900 mb-2 items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  ID hoạt động
                </label>
                <input
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                  placeholder="Nhập ID hoạt động cần gửi thông báo..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setTitle(''); setMessage(''); setActivityId(''); }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
            >
              Đặt lại
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            >
              <Send className="h-5 w-5" />
              {sending ? 'Đang gửi...' : 'Gửi thông báo'}
            </button>
          </div>
        </form>

        {/* History Section */}
        {showHistory && sentHistory.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="h-6 w-6 text-indigo-600" />
              Lịch sử gửi thông báo
            </h3>
            <div className="space-y-3">
              {sentHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer hover:border-indigo-300"
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    item.scope === 'class' 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500' 
                      : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                  }`}>
                    {item.scope === 'class' ? (
                      <Users className="h-6 w-6 text-white" />
                    ) : (
                      <Activity className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.date).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {item.recipients} người nhận
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                        item.scope === 'class'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.scope === 'class' ? '🎓 Toàn lớp' : '📋 Theo hoạt động'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    Đã gửi
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-6 w-6" />
                    Chi tiết thông báo
                  </h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Tiêu đề</label>
                  <p className="text-lg font-bold text-gray-900">{selectedNotification.title}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Nội dung</label>
                  <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {selectedNotification.message?.split('[Phạm vi:')[0]?.trim()}
                  </p>
                </div>

                {/* Scope Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Phạm vi gửi</label>
                    <div className={`px-4 py-2 rounded-xl font-semibold inline-flex items-center gap-2 ${
                      selectedNotification.scope === 'class'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedNotification.scope === 'class' ? (
                        <>
                          <Users className="h-4 w-4" />
                          Toàn lớp
                        </>
                      ) : (
                        <>
                          <Activity className="h-4 w-4" />
                          Theo hoạt động
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Ngày gửi</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      {new Date(selectedNotification.date).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Activity Info if available */}
                {selectedNotification.activity && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-indigo-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-indigo-600" />
                      Thông tin hoạt động
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Tên hoạt động</label>
                        <p className="text-gray-900 font-medium">{selectedNotification.activity.ten_hd}</p>
                      </div>
                      {selectedNotification.activity.ma_hd && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Mã hoạt động</label>
                          <p className="text-gray-900 font-mono">{selectedNotification.activity.ma_hd}</p>
                        </div>
                      )}
                      {selectedNotification.activity.dia_diem && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Địa điểm</label>
                          <p className="text-gray-900">{selectedNotification.activity.dia_diem}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Ngày bắt đầu</label>
                          <p className="text-gray-900">{new Date(selectedNotification.activity.ngay_bd).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Ngày kết thúc</label>
                          <p className="text-gray-900">{new Date(selectedNotification.activity.ngay_kt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      {selectedNotification.activity.diem_rl && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Điểm rèn luyện</label>
                          <p className="font-bold text-lg text-indigo-600">{selectedNotification.activity.diem_rl} điểm</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recipients Info */}
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Người nhận</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="font-bold text-lg">{selectedNotification.recipients} người</span>
                  </div>
                  {selectedNotification.recipientsList && selectedNotification.recipientsList.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="space-y-2">
                        {selectedNotification.recipientsList.slice(0, 10).map((recipient, idx) => (
                          <div key={idx} className="text-sm text-gray-700">
                            • {recipient.ho_ten || recipient.email}
                          </div>
                        ))}
                        {selectedNotification.recipientsList.length > 10 && (
                          <div className="text-sm text-gray-500 italic">
                            ... và {selectedNotification.recipientsList.length - 10} người khác
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
