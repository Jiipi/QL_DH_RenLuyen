/**
 * Utility functions for handling user avatars
 */

/**
 * Check if an image URL is valid
 * @param {string} url - Image URL to validate
 * @returns {boolean} True if URL is valid
 */
export const isValidImageUrl = (url) => {
  if (!url) return false;
  
  if (url.startsWith('data:image/') || 
      url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
      url.includes('i.pinimg.com') ||
      url.includes('images.unsplash.com') ||
      url.includes('cdn') ||
      url.includes('imgur.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('drive.google.com') ||
      url.startsWith('/') || // Accept relative URLs
      url.startsWith('http')) { // Accept any HTTP URL
    return true;
  }
  
  return false;
};

/**
 * Get direct image URL from various sources
 * @param {string} url - Original URL
 * @returns {string|null} Direct image URL or null
 */
export const getDirectImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  // 1) Google redirect URL: https://www.google.com/url?url=...
  if (url.includes('google.com/url') && url.includes('url=')) {
    const match = url.match(/url=([^&]+)/);
    if (match) {
      let decoded = decodeURIComponent(match[1]);
      // Skip facebook page redirects (not an image)
      if (decoded.includes('facebook.com')) return null;
      decoded = upgradeToHDQuality(decoded);
      return decoded;
    }
  }

  // 2) Google Images viewer: https://www.google.com/imgres?imgurl=...
  if (url.includes('google.com/imgres')) {
    const match = url.match(/imgurl=([^&]+)/);
    if (match) {
      const decoded = upgradeToHDQuality(decodeURIComponent(match[1]));
      return decoded;
    }
  }

  // 3) Google Drive direct view
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}&sz=2000`;
    }
  }

  // 4) Relative backend paths: prefer relative to avoid cross-origin in dev
  if (url.startsWith('/uploads/') || url.startsWith('/images/')) {
    // Keep as-is to leverage same-origin/proxy in dev and static in prod
    return url;
  }

  // 5) Generic quality upgrade for known CDNs/providers
  return upgradeToHDQuality(url);
};

// Helper: upgrade image URL to higher quality for common providers
const upgradeToHDQuality = (raw) => {
  let url = raw || '';
  if (!url) return url;

  // Pinterest: enforce original
  if (url.includes('pinimg.com')) {
    url = url
      .replace(/\/\d+x\d+\//, '/originals/')
      .replace(/\/236x\//, '/originals/')
      .replace(/\/474x\//, '/originals/')
      .replace(/\/736x\//, '/originals/');
  }

  // Imgur: remove size suffixes (s, m, l, t, b, h)
  if (url.includes('imgur.com')) {
    url = url.replace(/([a-zA-Z0-9]+)[smlthb]\.([a-z]+)$/i, '$1.$2');
  }

  // Unsplash: request high quality
  if (url.includes('unsplash.com') || url.includes('images.unsplash.com')) {
    url = url.split('?')[0] + '?q=85&w=2000&fit=max';
  }

  // Googleusercontent: bump size
  if (url.includes('googleusercontent.com')) {
    url = url.replace(/=s\d+-c/i, '=s2000')
             .replace(/=w\d+-h\d+/i, '=w2000')
             .replace(/-rw$/i, '');
  }

  // Generic CDNs with resize params
  if (url.includes('cdn') && url.includes('resize')) {
    url = url.replace(/resize=\d+x\d+/i, 'resize=2000x2000');
  }

  return url;
};

/**
 * Get user avatar with fallback
 * Matches the exact logic from ClassStudents.js and Prisma schema
 * @param {object} user - User object containing avatar info
 * @param {string} fallbackText - Text to display if no avatar (default: first letter of name)
 * @returns {object} Avatar object with src, alt, and fallback info
 */
export const getUserAvatar = (userOrStudent, fallbackText = null) => {
  // Graceful default
  if (!userOrStudent) {
    return { src: null, alt: 'Avatar', fallback: '?', hasValidAvatar: false };
  }

  // If this is a student object with nguoi_dung, extract nguoi_dung
  // Otherwise treat as direct user object
  const nguoiDung = userOrStudent.nguoi_dung || userOrStudent;
  
  console.log('🔎 getUserAvatar input:', {
    hasNguoiDung: !!userOrStudent.nguoi_dung,
    nguoiDung_anh_dai_dien: nguoiDung.anh_dai_dien,
    nguoiDung_avatar: nguoiDung.avatar,
    nguoiDung_profile_image: nguoiDung.profile_image,
    nguoiDung_image: nguoiDung.image,
    userOrStudent_anh_dai_dien: userOrStudent.anh_dai_dien,
    userOrStudent_avatar: userOrStudent.avatar,
    userOrStudent_profile_image: userOrStudent.profile_image,
    allKeys: Object.keys(userOrStudent)
  });
  
  // Exact same priority as ClassStudents.js line 112-114:
  // nguoiDung.anh_dai_dien || nguoiDung.avatar || nguoiDung.profile_image || nguoiDung.image || sv.anh_dai_dien || sv.avatar || sv.profile_image
  const rawUrl = nguoiDung.anh_dai_dien || 
                 nguoiDung.avatar || 
                 nguoiDung.profile_image || 
                 nguoiDung.image || 
                 userOrStudent.anh_dai_dien || 
                 userOrStudent.avatar || 
                 userOrStudent.profile_image;

  console.log('🔎 getUserAvatar rawUrl:', rawUrl);

  const avatarUrl = getDirectImageUrl(rawUrl);
  const hasValidAvatar = isValidImageUrl(avatarUrl);

  console.log('🔎 getUserAvatar result:', {
    rawUrl,
    avatarUrl,
    hasValidAvatar
  });

  // Fallback text from name
  let fallback = fallbackText;
  const displayName = nguoiDung.ho_ten || nguoiDung.name || nguoiDung.ten_dn || userOrStudent.mssv || '';
  if (!fallback && displayName) {
    const parts = displayName.trim().split(' ');
    fallback = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '?').charAt(0).toUpperCase();
  }
  fallback = fallback || '?';

  return {
    src: hasValidAvatar ? avatarUrl : null,
    alt: displayName || 'Avatar',
    fallback,
    hasValidAvatar
  };
};

/**
 * Get student avatar with fallback
 * @param {object} student - Student object
 * @returns {object} Avatar object
 */
export const getStudentAvatar = (student) => {
  if (!student) {
    return {
      src: null,
      alt: 'Student Avatar',
      fallback: 'S',
      hasValidAvatar: false
    };
  }

  // Try to get avatar from nguoi_dung object first
  const user = student.nguoi_dung || student;
  
  return getUserAvatar(user, student.mssv ? student.mssv.charAt(0).toUpperCase() : 'S');
};

/**
 * Get default avatar colors based on user info
 * @param {string} text - Text to generate color from
 * @returns {string} CSS gradient class
 */
export const getAvatarGradient = (text = '') => {
  const colors = [
    'from-indigo-500 to-purple-500',
    'from-emerald-500 to-teal-500', 
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-indigo-500',
    'from-green-500 to-emerald-500',
    'from-red-500 to-rose-500'
  ];
  
  if (!text) return colors[0];
  
  // Generate consistent color based on text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default {
  isValidImageUrl,
  getDirectImageUrl,
  getUserAvatar,
  getStudentAvatar,
  getAvatarGradient
};
