import React from 'react';
import { useParams } from 'react-router-dom';
import { Download, Image as ImageIcon, File } from 'lucide-react';
import http from '../../services/http';
import { getActivityImages } from '../../utils/activityImages';

export default function ActivityDetail(){
  const params = useParams();
  const id = params.id;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  React.useEffect(function(){
    setLoading(true);
    http.get('/activities/' + id).then(function(res){ setData(res.data?.data || null); }).catch(function(){ setErr('Không tải được hoạt động'); }).finally(function(){ setLoading(false); });
  }, [id]);

  if (loading) return React.createElement('div', null, 'Đang tải...');
  if (err) return React.createElement('div', { className: 'text-red-600' }, err);
  if (!data) return React.createElement('div', null, 'Không có dữ liệu');

  const start = data?.ngay_bd ? new Date(data.ngay_bd) : null;
  const end = data?.ngay_kt ? new Date(data.ngay_kt) : null;
  const now = new Date();
  const withinTime = start && end ? (start <= now && end >= now) || start > now : true;
  const canRegister = data?.trang_thai === 'da_duyet' && withinTime && !data?.is_registered;

  // Get images with fallback to default
  const activityImages = getActivityImages(data.hinh_anh, data.loai_hd?.ten_loai_hd || data.loai);

  return React.createElement('div', { className: 'bg-white border rounded-xl p-6 space-y-6' }, [
    React.createElement('div', { key: 'title', className: 'text-2xl font-bold' }, data.ten_hd || data.name || 'Hoạt động'),
    
    // Image gallery (always show, with default if no images)
    React.createElement('div', { key: 'img-gallery' }, [
      React.createElement('div', { key: 'gallery-title', className: 'flex items-center gap-2 mb-3' }, [
        React.createElement(ImageIcon, { key: 'icon', size: 20, className: 'text-indigo-600' }),
        React.createElement('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Hình ảnh hoạt động')
      ]),
      React.createElement('div', { key: 'gallery', className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        activityImages.map((url, idx) => 
          React.createElement('a', { 
            key: idx, 
            href: url, 
            target: '_blank', 
            rel: 'noopener noreferrer',
            className: 'group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-indigo-500 transition-all hover:shadow-lg'
          }, [
            React.createElement('img', { 
              key: 'img',
              src: url, 
              alt: `Hình ${idx + 1}`, 
              className: 'w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300'
            }),
            React.createElement('div', {
              key: 'overlay',
              className: 'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'
            }, [
              React.createElement('span', { key: 'text', className: 'text-white text-sm font-medium' }, 'Xem ảnh')
            ])
          ])
        )
      )
    ]),

    React.createElement('div', { key: 'desc', className: 'text-gray-700' }, data.mo_ta || '—'),
    React.createElement('div', { key: 'meta', className: 'grid grid-cols-1 md:grid-cols-3 gap-3' }, [
      meta('Loại hoạt động', data.loai || data.loai_hd?.ten_loai_hd || '—'),
      meta('Điểm rèn luyện', String(data.diem_rl || 0)),
      meta('Thời gian', data.ngay_bd || '—'),
      meta('Địa điểm', data.dia_diem || '—'),
      meta('SL tối đa', String(data.sl_toi_da || 0)),
    ]),
    // Attachments section
    data.tep_dinh_kem && data.tep_dinh_kem.length > 0 ? React.createElement('div', { key: 'attachments' }, [
      React.createElement('div', { key: 'attach-title', className: 'flex items-center gap-2 mb-3' }, [
        React.createElement(File, { key: 'icon', size: 20, className: 'text-indigo-600' }),
        React.createElement('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Tệp đính kèm')
      ]),
      React.createElement('div', { key: 'attach-list', className: 'space-y-2' },
        data.tep_dinh_kem.map((url, idx) => {
          const filename = url.split('/').pop();
          // ✅ Fix: Prepend backend base URL for attachments
          const baseURL = (typeof window !== 'undefined' && window.location)
            ? window.location.origin.replace(/\/$/, '') + '/api'
            : (process.env.REACT_APP_API_URL || 'http://dacn_backend_dev:3001/api');
          const backendBase = baseURL.replace('/api', ''); // Remove /api to get base server URL
          const downloadUrl = url.startsWith('http') ? url : `${backendBase}${url}`;
          
          return React.createElement('a', {
            key: idx,
            href: downloadUrl,
            download: filename, // ✅ Add download attribute to force download
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group'
          }, [
            React.createElement('div', { 
              key: 'icon-wrapper',
              className: 'p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors'
            }, [
              React.createElement(Download, { key: 'icon', size: 20, className: 'text-indigo-600' })
            ]),
            React.createElement('div', { key: 'info', className: 'flex-1 min-w-0' }, [
              React.createElement('div', { key: 'name', className: 'text-sm font-medium text-gray-900 truncate' }, filename),
              React.createElement('div', { key: 'action', className: 'text-xs text-gray-500' }, 'Nhấn để tải xuống')
            ])
          ]);
        })
      )
    ]) : null,

    React.createElement('div', { key: 'act' }, [
      data?.is_registered
        ? React.createElement('span', { className: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200' }, data.registration_status === 'da_duyet' ? 'Đã đăng ký (Đã duyệt)' : 'Đã đăng ký (Chờ duyệt)')
        : React.createElement('span', { className: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200' }, canRegister ? 'Chưa đăng ký' : 'Không thể đăng ký')
    ])
  ]);
}

function meta(label, value){
  return React.createElement('div', { className: 'p-3 bg-gray-50 rounded-lg border' }, [
    React.createElement('div', { key: 'l', className: 'text-xs text-gray-500' }, label),
    React.createElement('div', { key: 'v', className: 'font-medium' }, value)
  ]);
}


