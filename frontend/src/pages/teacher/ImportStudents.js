import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import http from '../../services/http';
import { useNotification } from '../../contexts/NotificationContext';

export default function ImportStudents() {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState({
    valid: [],
    invalid: []
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        showError('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV (.csv)');
        return;
      }
      // Save file only; do not auto-parse. Clear previous preview state.
      setFile(selectedFile);
      setPreviewData([]);
      setValidationResults({ valid: [], invalid: [] });
    }
  };

  // Explicit action to upload and preview the selected file
  const handleUploadPreview = async () => {
    if (!file) {
      showWarning('Vui lòng chọn file trước khi tải lên để kiểm tra');
      return;
    }
    await parseExcelFile(file);
  };

  const parseExcelFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await http.post('/teacher/students/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const data = response.data?.data || { valid: [], invalid: [] };
      setValidationResults(data);
      setPreviewData([...data.valid, ...data.invalid]);
    } catch (err) {
      console.error('Parse error:', err);
      showError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (validationResults.valid.length === 0) {
      showWarning('Không có sinh viên hợp lệ để import');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn import ${validationResults.valid.length} sinh viên?`)) {
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await http.post('/teacher/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showSuccess(`Import thành công ${response.data?.data?.imported || 0} sinh viên`);
      navigate('/teacher/students');
    } catch (err) {
      console.error('Import error:', err);
      showError(err.response?.data?.message || 'Không thể import sinh viên');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      // Try to get teacher's classes to provide a real class name
      let className = 'CTK46A';
      try {
        const clsRes = await http.get('/teacher/classes');
        const list = clsRes?.data?.data?.classes || [];
        if (Array.isArray(list) && list.length > 0) {
          className = String(list[0].ten_lop || className);
        }
      } catch (_) {
        // ignore and fallback to default className
      }

      // Generate unique MSSV/usernames to avoid duplicate validation errors
      const base = Date.now() % 10000000; // 7 digits
      const mssv1 = String(base).padStart(7, '0');
      const mssv2 = String((base + 1) % 10000000).padStart(7, '0');

      const template = `MSSV,Họ và tên,Email,Ngày sinh (YYYY-MM-DD),Giới tính (nam/nu/khac),Lớp,Số điện thoại,Địa chỉ,Tên đăng nhập,Mật khẩu\n${mssv1},Sinh Viên Mẫu A,sv${mssv1}@dlu.edu.vn,2003-01-15,nam,${className},0900000001,Địa chỉ 1,${mssv1},123456\n${mssv2},Sinh Viên Mẫu B,sv${mssv2}@dlu.edu.vn,2003-05-20,nu,${className},0900000002,Địa chỉ 2,${mssv2},123456`;

      const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'mau_import_sinh_vien.csv';
      link.click();
      
      showSuccess('Đã tải xuống file mẫu');
    } catch (e) {
      showError('Không thể tạo file mẫu. Vui lòng thử lại.');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/teacher/students')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại danh sách
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import sinh viên</h1>
        <p className="text-gray-600">Tải lên file Excel hoặc CSV để import hàng loạt sinh viên vào lớp phụ trách</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Hướng dẫn import</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• File Excel/CSV phải có các cột: MSSV, Họ và tên, Email, Ngày sinh, Giới tính, Lớp, SĐT, Địa chỉ, Tên đăng nhập, Mật khẩu</li>
              <li>• MSSV phải duy nhất và không được trùng trong hệ thống</li>
              <li>• Email phải đúng định dạng @dlu.edu.vn</li>
              <li>• Ngày sinh định dạng: YYYY-MM-DD (ví dụ: 2003-01-15)</li>
              <li>• Giới tính: nam, nu, hoặc khac</li>
              <li>• Tải xuống file mẫu để xem định dạng chuẩn</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">Chọn file Excel hoặc CSV</p>
            <p className="text-sm text-gray-500">Kéo thả file hoặc click để chọn</p>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="font-medium">{file.name}</span>
              </div>
            )}
          </label>
          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={handleUploadPreview}
              disabled={!file || uploading}
              className="px-5 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Đang tải và kiểm tra...' : 'Tải lên để kiểm tra'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 flex flex-col items-center justify-center">
          <Download className="w-12 h-12 text-indigo-600 mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">Tải file mẫu</p>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Tải xuống file mẫu Excel với định dạng chuẩn
          </p>
          <button
            onClick={downloadTemplate}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Tải xuống mẫu
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {uploading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xử lý file...</p>
        </div>
      )}

      {!uploading && previewData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kết quả kiểm tra</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">
                  Hợp lệ: <span className="font-semibold text-green-600">{validationResults.valid.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-600">
                  Không hợp lệ: <span className="font-semibold text-red-600">{validationResults.invalid.length}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">MSSV</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Họ tên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lớp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index} className={row.errors ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      {row.errors ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.mssv || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.ho_ten || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.email || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.lop || 'N/A'}</td>
                    <td className="px-4 py-3">
                      {row.errors && (
                        <div className="text-xs text-red-600">
                          {row.errors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {validationResults.valid.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span className="text-sm">
                  Sẵn sàng import <span className="font-semibold">{validationResults.valid.length}</span> sinh viên
                </span>
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Đang import...' : 'Import sinh viên'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
