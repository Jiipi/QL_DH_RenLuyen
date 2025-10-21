/**
 * Utility functions for semester calculations
 * Xác định học kỳ dựa trên ngày tháng thực tế
 * 
 * Logic:
 * - HK1: Tháng 7-11 (July - November)
 * - HK2: Tháng 12-4 (December - April)
 * - Nghỉ: Tháng 5-6 (May - June) - defaults to HK1
 */

/**
 * Xác định học kỳ và năm học từ một ngày cụ thể
 * @param {Date} date - Ngày cần xác định học kỳ
 * @returns {Object} - { semester: 'hoc_ky_1' | 'hoc_ky_2', yearLabel: 'YYYY-YYYY', year: 'YYYY' }
 */
function determineSemesterFromDate(date) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  
  let semester, yearLabel, targetYear;
  
  if (month >= 7 && month <= 11) {
    // Tháng 7-11 = HK1 của năm học bắt đầu từ năm hiện tại
    semester = 'hoc_ky_1';
    yearLabel = `${year}-${year + 1}`;
    targetYear = year.toString();
  } else if (month === 12) {
    // Tháng 12 = HK2 của năm học bắt đầu từ năm hiện tại
    semester = 'hoc_ky_2';
    yearLabel = `${year}-${year + 1}`;
    targetYear = year.toString();
  } else if (month >= 1 && month <= 4) {
    // Tháng 1-4 = HK2 của năm học bắt đầu từ năm trước
    semester = 'hoc_ky_2';
    yearLabel = `${year - 1}-${year}`;
    targetYear = (year - 1).toString();
  } else {
    // Tháng 5-6 = Nghỉ hè, mặc định HK1
    semester = 'hoc_ky_1';
    yearLabel = `${year}-${year + 1}`;
    targetYear = year.toString();
  }
  
  return { semester, yearLabel, year: targetYear };
}

/**
 * Lấy học kỳ hiện tại
 * @returns {Object} - { semester: 'hoc_ky_1' | 'hoc_ky_2', yearLabel: 'YYYY-YYYY', year: 'YYYY' }
 */
function getCurrentSemester() {
  return determineSemesterFromDate(new Date());
}

/**
 * Parse semester string từ query parameter
 * @param {string} semesterStr - Format: 'hoc_ky_1-2025' hoặc 'hoc_ky_2-2024'
 * @returns {Object|null} - { semester: 'hoc_ky_1', year: '2025' } hoặc null nếu invalid
 */
function parseSemesterString(semesterStr) {
  if (!semesterStr || semesterStr === 'current') {
    return getCurrentSemester();
  }
  
  const match = semesterStr.match(/^hoc_ky_(\d+)-(\d{4})$/);
  if (match) {
    const semesterNum = match[1];
    const year = match[2];
    return {
      semester: `hoc_ky_${semesterNum}`,
      year: year,
      yearLabel: `${year}-${parseInt(year) + 1}` // For HK1, or adjusted for HK2
    };
  }
  
  return null;
}

/**
 * Build Prisma where clause cho filter hoạt động theo học kỳ
 * Hỗ trợ 2 chế độ:
 * 1. Strict mode: Dựa vào trường hoc_ky và nam_hoc trong DB (mặc định)
 * 2. Dynamic mode: Tự động xác định học kỳ từ ngay_bd của hoạt động
 * 
 * @param {string} semesterStr - Semester query string hoặc 'current'
 * @param {boolean} useDynamicFilter - Nếu true, filter theo ngay_bd thay vì hoc_ky
 * @returns {Object} - Prisma where clause
 */
function buildSemesterFilter(semesterStr, useDynamicFilter = false) {
  const semesterInfo = parseSemesterString(semesterStr);
  if (!semesterInfo) {
    return {}; // No filter if invalid
  }
  
  if (useDynamicFilter) {
    // Dynamic filter: Tự xác định từ ngay_bd
    const { semester, year } = semesterInfo;
    
    // Xác định khoảng thời gian cho học kỳ
    let startDate, endDate;
    const yearNum = parseInt(year);
    
    if (semester === 'hoc_ky_1') {
      // HK1: July 1 - November 30
      startDate = new Date(yearNum, 6, 1); // Month 6 = July (0-indexed)
      endDate = new Date(yearNum, 10, 30, 23, 59, 59); // Month 10 = November
    } else {
      // HK2: December 1 - April 30 (của năm sau)
      startDate = new Date(yearNum, 11, 1); // Month 11 = December
      endDate = new Date(yearNum + 1, 3, 30, 23, 59, 59); // Month 3 = April
    }
    
    return {
      ngay_bd: {
        gte: startDate,
        lte: endDate
      }
    };
  } else {
    // Strict filter: Dùng trường hoc_ky và nam_hoc trong DB
    return {
      hoc_ky: semesterInfo.semester,
      nam_hoc: {
        contains: semesterInfo.year
      }
    };
  }
}

/**
 * Kiểm tra xem một hoạt động có thuộc học kỳ được chỉ định không
 * @param {Object} activity - Hoạt động với ngay_bd
 * @param {string} targetSemester - 'hoc_ky_1' hoặc 'hoc_ky_2'
 * @param {string} targetYear - Năm (YYYY)
 * @returns {boolean}
 */
function isActivityInSemester(activity, targetSemester, targetYear) {
  if (!activity.ngay_bd) return false;
  
  const activityDate = new Date(activity.ngay_bd);
  const { semester, year } = determineSemesterFromDate(activityDate);
  
  return semester === targetSemester && year === targetYear;
}

module.exports = {
  determineSemesterFromDate,
  getCurrentSemester,
  parseSemesterString,
  buildSemesterFilter,
  isActivityInSemester
};
