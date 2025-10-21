import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  GraduationCap, 
  Mail, 
  ArrowUp,
  Award,
  Users,
  FileText,
  TrendingUp,
  Globe,
  BookOpen,
  Shield
} from 'lucide-react';

export default function ModernFooter() {
  const navigate = useNavigate();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-gray-300 mt-auto">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
      
      {/* Main Footer Content - Compact on Mobile */}
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          
          {/* Column 1: About */}
          <div className="space-y-1 sm:space-y-4">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-4">
              <div className="relative">
                <GraduationCap className="h-5 w-5 sm:h-8 sm:w-8 text-blue-400" />
                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-white">Điểm Rèn Luyện</h3>
                <p className="text-xs text-blue-300 hidden sm:block">Quản lý chuyên nghiệp</p>
              </div>
            </div>
            
            {/* Ẩn description trên mobile để tiết kiệm không gian */}
            <p className="hidden sm:block text-xs sm:text-sm leading-relaxed text-gray-400">
              Hệ thống quản lý điểm rèn luyện, hỗ trợ sinh viên theo dõi hoạt động và điểm rèn luyện.
            </p>
            
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center space-x-2 text-xs sm:text-sm">
                <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                <span className="text-gray-400 truncate">Đại học Đà Lạt</span>
              </div>
              {/* Ẩn khoa trên mobile */}
              <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm">
                <Award className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                <span className="text-gray-400 truncate">Công nghệ Thông tin</span>
              </div>
              <a 
                href="mailto:it@dlu.edu.vn"
                className="flex items-center space-x-2 text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors touch-target"
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">it@dlu.edu.vn</span>
              </a>
            </div>
          </div>

          {/* Column 2: Chức năng - Giảm items trên mobile */}
          <div className="space-y-1 sm:space-y-4">
            <h3 className="text-sm sm:text-lg font-bold text-white flex items-center space-x-2 mb-1 sm:mb-4">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              <span>Chức năng</span>
            </h3>
            <ul className="space-y-0.5 sm:space-y-2">
              {[
                { label: 'Quản lý hoạt động', path: '/activities' },
                { label: 'Đăng ký hoạt động', path: '/student/activities' },
                { label: 'Điểm rèn luyện', path: '/student/scores' },
                { label: 'Điểm danh QR', path: '/qr-scanner' }
              ].map((link, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => navigate(link.path)}
                    className="group flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200 py-0.5 sm:py-0"
                  >
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-600 group-hover:bg-purple-400 rounded-full transition-colors flex-shrink-0"></span>
                    <span className="group-hover:translate-x-1 transition-transform duration-200 truncate">{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Hỗ trợ */}
          <div className="space-y-1 sm:space-y-4">
            <h3 className="text-sm sm:text-lg font-bold text-white flex items-center space-x-2 mb-1 sm:mb-4">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400" />
              <span>Hỗ trợ</span>
            </h3>
            <ul className="space-y-0.5 sm:space-y-2">
              {[
                { label: 'Hướng dẫn sử dụng', href: '#' },
                { label: 'Câu hỏi thường gặp', href: '#' },
                { label: 'Chính sách bảo mật', href: '#' },
                { label: 'Điều khoản sử dụng', href: '#' }
              ].map((link, idx) => (
                <li key={idx}>
                  <a 
                    href={link.href}
                    className="group flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-400 hover:text-pink-400 transition-colors duration-200 py-0.5 sm:py-0"
                  >
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-600 group-hover:bg-pink-400 rounded-full transition-colors flex-shrink-0"></span>
                    <span className="group-hover:translate-x-1 transition-transform duration-200 truncate">{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats Bar - Ẩn trên mobile để tiết kiệm không gian */}
        <div className="hidden sm:block mt-6 lg:mt-8 pt-6 border-t border-slate-700">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Sinh viên', value: '5,000+', color: 'text-blue-400' },
              { icon: Award, label: 'Hoạt động', value: '100+', color: 'text-purple-400' },
              { icon: FileText, label: 'Đăng ký', value: '1,000+', color: 'text-pink-400' },
              { icon: TrendingUp, label: 'Điểm RL', value: '95%', color: 'text-green-400' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="flex justify-center mb-1">
                  <div className={`p-2 bg-slate-800/50 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar - Mobile Optimized */}
      <div className="border-t border-slate-700 bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-1 sm:space-y-2 md:space-y-0 text-xs sm:text-sm text-gray-400">
            <p className="flex items-center space-x-1 sm:space-x-2 text-center">
              <span>© {currentYear}</span>
              <span className="text-blue-400 font-semibold truncate">Điểm Rèn Luyện</span>
              <span className="hidden md:inline">- Đại học Đà Lạt</span>
            </p>
            
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs">
              <Shield className="h-3 w-3 text-green-400 flex-shrink-0" />
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button - Mobile Optimized */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 p-2 sm:p-2.5 lg:p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 z-50 group touch-target"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:animate-bounce" />
      </button>

      {/* Decorative Elements - Ẩn trên mobile */}
      <div className="hidden sm:block absolute bottom-0 left-0 w-full h-24 lg:h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
    </footer>
  );
}
