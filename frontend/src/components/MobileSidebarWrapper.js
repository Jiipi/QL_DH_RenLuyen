import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * MobileSidebarWrapper - Wrapper component for mobile-responsive sidebar
 * 
 * Features:
 * - Auto-hide on mobile (< 768px)
 * - Hamburger menu button
 * - Overlay with backdrop
 * - Swipe to close (optional)
 * - Smooth animations
 */

export default function MobileSidebarWrapper({ children, isOpen, onClose }) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isMobile || !isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isOpen, onClose]);

  // On desktop, render sidebar normally
  if (!isMobile) {
    return <>{children}</>;
  }

  // On mobile, render with overlay
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 z-50
          transform transition-transform duration-300 ease-out
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: '280px', maxWidth: '85vw' }}
      >
        {/* Close button overlay */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-white shadow-lg backdrop-blur-sm transition-colors"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar content */}
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
