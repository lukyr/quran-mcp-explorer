
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] lg:bg-[#fafafa]">
      {/* Header disembunyikan di mobile (hidden), muncul di desktop (lg:block) */}
      <header className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-smooth">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center" aria-hidden="true">
              <img src="/logo.png" alt="Sahabat Quran Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">Sahabat Quran</p>
              <span className="sr-only">Aplikasi Pencarian Ayat Al-Quran Terpercaya</span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <div className="flex items-center px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">v{__APP_VERSION__} Powered by AI</span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content - Full screen di mobile (px-0, py-0) */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-0 lg:px-6 py-0 lg:py-8 flex flex-col">
        {children}
      </main>

      {/* Footer hanya muncul di desktop */}
      <footer className="hidden lg:block bg-white border-t border-slate-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Terintegrasi dengan Quran.com & Gemini AI</p>
          <p className="text-slate-300 text-[10px]">© 2025 Sahabat Quran Project. Dikembangkan untuk kemaslahatan umat agar lebih dekat dengan Al-Quran.</p>
        </div>
      </footer>
    </div>
  );
};
