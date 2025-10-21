import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, File, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import http from '../services/http';

/**
 * FileUpload Component
 * 
 * @param {string} type - 'image' hoặc 'attachment'
 * @param {boolean} multiple - Cho phép upload nhiều files
 * @param {number} maxFiles - Số lượng file tối đa
 * @param {function} onChange - Callback khi upload thành công
 * @param {string[]} value - Array URLs của files đã upload
 * @param {string} label - Label cho component
 */
export default function FileUpload({
  type = 'image',
  multiple = false,
  maxFiles = 1,
  onChange,
  value = [],
  label,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const acceptTypes = type === 'image' 
    ? 'image/jpeg,image/jpg,image/png,image/gif,image/webp'
    : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar';

  const maxSize = type === 'image' ? 5 : 10; // MB

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Check max files
    if (multiple && (value.length + files.length) > maxFiles) {
      setError(`Chỉ được upload tối đa ${maxFiles} file`);
      return;
    }

    // Check file size
    const oversizeFiles = files.filter(f => f.size > maxSize * 1024 * 1024);
    if (oversizeFiles.length > 0) {
      setError(`File quá lớn. Tối đa ${maxSize}MB`);
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      
      if (multiple) {
        files.forEach(file => {
          formData.append(type === 'image' ? 'images' : 'attachments', file);
        });
      } else {
        formData.append(type === 'image' ? 'image' : 'attachment', files[0]);
      }

      const endpoint = multiple 
        ? `/upload/${type}s` 
        : `/upload/${type}`;

      const response = await http.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        const newFiles = multiple ? response.data.data : [response.data.data];
        const newUrls = newFiles.map(f => f.url);
        
        if (multiple) {
          onChange([...value, ...newUrls]);
        } else {
          onChange(newUrls);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Lỗi upload file');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (url) => {
    try {
      // Extract filename from URL
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const fileType = type === 'image' ? 'images' : 'attachments';

      await http.delete(`/upload/${fileType}/${filename}`);
      
      const newValue = value.filter(v => v !== url);
      onChange(newValue);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Lỗi xóa file');
    }
  };

  const renderPreview = (url, index) => {
    const isImage = type === 'image';
    const filename = url.split('/').pop();

    return (
      <div
        key={index}
        className="relative group bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-all"
      >
        {isImage ? (
          <img
            src={url}
            alt={`Upload ${index + 1}`}
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-32 flex flex-col items-center justify-center gap-2 p-4">
            <File className="h-12 w-12 text-gray-400" />
            <p className="text-xs text-gray-600 text-center truncate w-full">{filename}</p>
          </div>
        )}
        
        <button
          type="button"
          onClick={() => handleRemove(url)}
          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          title="Xóa file"
        >
          <X className="h-4 w-4" />
        </button>

        {isImage && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-center"
          >
            Xem ảnh
          </a>
        )}
      </div>
    );
  };

  const canUploadMore = !multiple || (multiple && value.length < maxFiles);

  return (
    <div className="space-y-3">
      {label && (
        <label className="flex text-sm font-bold text-gray-900 items-center gap-2">
          {type === 'image' ? <ImageIcon className="h-4 w-4 text-indigo-600" /> : <File className="h-4 w-4 text-indigo-600" />}
          {label}
          {multiple && <span className="text-xs font-normal text-gray-500">({value.length}/{maxFiles})</span>}
        </label>
      )}

      {/* Preview Grid */}
      {value.length > 0 && (
        <div className={`grid gap-3 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {value.map((url, index) => renderPreview(url, index))}
        </div>
      )}

      {/* Upload Button */}
      {canUploadMore && !disabled && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-all ${
              uploading
                ? 'border-indigo-300 bg-indigo-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <Loader className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">
                  Đang upload... {progress}%
                </span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {type === 'image' ? 'Chọn ảnh' : 'Chọn tệp đính kèm'}
                  {multiple && ` (tối đa ${maxFiles})`}
                </span>
              </>
            )}
          </button>

          {uploading && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            {type === 'image' 
              ? `Chấp nhận: JPG, PNG, GIF, WEBP. Tối đa ${maxSize}MB`
              : `Chấp nhận: PDF, DOC, XLS, PPT, TXT, ZIP. Tối đa ${maxSize}MB`
            }
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {!uploading && !error && value.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {type === 'image' 
              ? `Đã upload ${value.length} ảnh`
              : `Đã upload ${value.length} tệp đính kèm`
            }
          </span>
        </div>
      )}
    </div>
  );
}
