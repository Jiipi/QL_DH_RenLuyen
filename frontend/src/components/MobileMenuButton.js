import React from 'react';
import { Menu } from 'lucide-react';

/**
 * MobileMenuButton - Floating hamburger button for mobile
 * Only visible on mobile (< 768px)
 */

export default function MobileMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        fixed bottom-6 right-6 z-30
        md:hidden
        w-14 h-14
        bg-gradient-to-br from-blue-500 to-indigo-600
        hover:from-blue-600 hover:to-indigo-700
        rounded-full
        shadow-2xl shadow-blue-500/50
        hover:shadow-blue-500/70
        flex items-center justify-center
        text-white
        transition-all duration-300
        hover:scale-110
        active:scale-95
        group
      "
      aria-label="Mở menu"
      title="Mở menu"
    >
      <Menu className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
      
      {/* Pulse effect */}
      <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></span>
    </button>
  );
}
