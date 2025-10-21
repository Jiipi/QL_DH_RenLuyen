/**
 * Get default activity image based on activity type
 * @param {string} activityType - Tên loại hoạt động
 * @returns {string} URL của hình ảnh mặc định
 */
export const getDefaultActivityImage = (activityType) => {
  if (!activityType) return '/images/default-activity.svg';
  
  const type = activityType.toLowerCase();
  
  // Map activity types to images
  const imageMap = {
    'học thuật': '/images/activity-academic.svg',
    'hoc thuat': '/images/activity-academic.svg',
    'academic': '/images/activity-academic.svg',
    'nghiên cứu': '/images/activity-academic.svg',
    'khoa học': '/images/activity-academic.svg',
    
    'tình nguyện': '/images/activity-volunteer.svg',
    'tinh nguyen': '/images/activity-volunteer.svg',
    'volunteer': '/images/activity-volunteer.svg',
    'từ thiện': '/images/activity-volunteer.svg',
    'cộng đồng': '/images/activity-volunteer.svg',
    
    'thể thao': '/images/activity-sports.svg',
    'the thao': '/images/activity-sports.svg',
    'sports': '/images/activity-sports.svg',
    'thể dục': '/images/activity-sports.svg',
    'giải trí': '/images/activity-sports.svg',
    
    'văn hóa': '/images/activity-cultural.svg',
    'van hoa': '/images/activity-cultural.svg',
    'cultural': '/images/activity-cultural.svg',
    'văn nghệ': '/images/activity-cultural.svg',
    'nghệ thuật': '/images/activity-cultural.svg',
    'âm nhạc': '/images/activity-cultural.svg',
  };
  
  // Try exact match
  if (imageMap[type]) {
    return imageMap[type];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(imageMap)) {
    if (type.includes(key) || key.includes(type)) {
      return value;
    }
  }
  
  // Default fallback
  return '/images/default-activity.svg';
};

/**
 * Get activity image with fallback
 * @param {Array<string>} images - Array of uploaded images
 * @param {string} activityType - Activity type for default image
 * @returns {string} Image URL (uploaded or default)
 */
export const getActivityImage = (images, activityType) => {
  // Normalize various possible shapes coming from API/DB
  try {
    let first = null;
    if (Array.isArray(images)) {
      const firstEntry = images.find(Boolean) || null;
      if (typeof firstEntry === 'string') first = firstEntry;
      else if (firstEntry && typeof firstEntry === 'object') first = firstEntry.url || firstEntry.path || firstEntry.src || null;
    } else if (typeof images === 'string') {
      const trimmed = images.trim();
      // JSON array string
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) first = parsed.find(Boolean) || null;
          else if (typeof parsed === 'string' && parsed) first = parsed;
        } catch (_) {
          // Comma separated
          const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
          if (parts.length > 0) first = parts[0];
        }
      } else {
        // Possibly comma-separated string or single url/path
        const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        first = parts[0] || null;
      }
    } else if (images && typeof images === 'object') {
      // Common fields used across code
      first = images.url || images.path || images.src || null;
    }
    if (first) return first;
  } catch (_) {}
  return getDefaultActivityImage(activityType);
};

/**
 * Get all activity images with defaults
 * @param {Array<string>} images - Array of uploaded images
 * @param {string} activityType - Activity type for default image
 * @returns {Array<string>} Array of image URLs
 */
export const getActivityImages = (images, activityType) => {
  try {
    if (Array.isArray(images) && images.length > 0) {
      return images
        .map(item => {
          if (!item) return null;
          if (typeof item === 'string') return item;
          if (typeof item === 'object') return item.url || item.path || item.src || null;
          return null;
        })
        .filter(Boolean);
    }
    if (typeof images === 'string') {
      const trimmed = images.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
      }
      const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
    if (images && typeof images === 'object') {
      const url = images.url || images.path || images.src;
      if (url) return [url];
    }
  } catch (_) {}
  return [getDefaultActivityImage(activityType)];
};

/**
 * Get best image from an activity object with many possible schemas
 * @param {object} activity
 * @returns {string} url
 */
export const getBestActivityImage = (activity) => {
  if (!activity || typeof activity !== 'object') return getDefaultActivityImage();
  const type = activity?.loai_hd?.ten_loai_hd || activity?.loai || '';

  const candidates = [
    activity.hinh_anh,
    activity.hinhAnh,
    activity.images,
    activity.anh_hoat_dong,
    activity.image,
    activity.thumbnail,
    activity.anh_bia,
    activity.banner,
    activity.cover,
    activity.cover_image,
    activity.coverImage,
    activity.thumb_url,
  ];

  // Try each candidate using existing normalization
  for (const c of candidates) {
    const url = getActivityImage(c, type);
    if (url && !url.endsWith('default-activity.svg')) return url;
  }

  return getDefaultActivityImage(type);
};

export default {
  getDefaultActivityImage,
  getActivityImage,
  getActivityImages,
  getBestActivityImage
};
