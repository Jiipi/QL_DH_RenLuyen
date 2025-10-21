// Test để verify semester dropdown options
const currentYear = 2025;
const currentMonth = 10; // October

console.log('=========================================');
console.log('TEST SEMESTER DROPDOWN OPTIONS');
console.log('=========================================\n');

console.log(`📅 Ngày hiện tại: Tháng ${currentMonth}/${currentYear}\n`);

// Logic xác định học kỳ hiện tại
let currentSemester, currentSemesterYear;
if (currentMonth >= 7 && currentMonth <= 11) {
  currentSemester = 1; // HK1
  currentSemesterYear = currentYear;
} else if (currentMonth === 12) {
  currentSemester = 2; // HK2
  currentSemesterYear = currentYear;
} else if (currentMonth >= 1 && currentMonth <= 4) {
  currentSemester = 2; // HK2
  currentSemesterYear = currentYear - 1;
} else {
  currentSemester = 1; // Default HK1 for break months (5-6)
  currentSemesterYear = currentYear;
}

console.log(`✅ Học kỳ hiện tại: HK${currentSemester} năm ${currentSemesterYear}\n`);

// Generate options
const options = [];
for (let year = currentYear; year >= currentYear - 2; year--) {
  // HK1
  const isCurrentHK1 = currentSemester === 1 && currentSemesterYear === year;
  options.push({
    value: `hoc_ky_1-${year}`,
    label: `📚 HK1 năm ${year}${isCurrentHK1 ? ' (hiện tại)' : ''}`
  });
  
  // HK2
  const isCurrentHK2 = currentSemester === 2 && currentSemesterYear === year;
  options.push({
    value: `hoc_ky_2-${year}`,
    label: `📖 HK2 năm ${year}${isCurrentHK2 ? ' (hiện tại)' : ''}`
  });
}

console.log('Dropdown Options:');
console.log('=================\n');
options.forEach((opt, idx) => {
  const marker = opt.label.includes('(hiện tại)') ? '👉' : '  ';
  console.log(`${marker} ${idx + 1}. ${opt.label}`);
  console.log(`     Value: ${opt.value}\n`);
});

// Xác định default value
let defaultValue;
if (currentMonth >= 7 && currentMonth <= 11) {
  defaultValue = `hoc_ky_1-${currentYear}`;
} else if (currentMonth === 12) {
  defaultValue = `hoc_ky_2-${currentYear}`;
} else if (currentMonth >= 1 && currentMonth <= 4) {
  defaultValue = `hoc_ky_2-${currentYear - 1}`;
} else {
  defaultValue = `hoc_ky_1-${currentYear}`;
}

console.log('=================');
console.log(`✅ Default value: ${defaultValue}`);
console.log(`✅ Sẽ được chọn mặc định khi tải trang\n`);

// Kiểm tra
const selectedOption = options.find(opt => opt.value === defaultValue);
if (selectedOption && selectedOption.label.includes('(hiện tại)')) {
  console.log('✅ PASS: Default value khớp với học kỳ hiện tại!');
} else {
  console.log('❌ FAIL: Default value KHÔNG khớp với học kỳ hiện tại!');
}
