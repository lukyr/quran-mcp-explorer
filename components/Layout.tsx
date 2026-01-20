
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] lg:bg-[#fafafa]">
      {/* Header yang lebih ringkas di mobile */}
      <header className="bg-white lg:bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-smooth">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-extrabold text-slate-900 tracking-tight leading-none">Sahabat Quran</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center px-2 py-0.5 lg:px-3 lg:py-1 bg-slate-50 rounded-full border border-slate-100">
              <span className="text-[8px] lg:text-[10px] font-black text-slate-300 uppercase tracking-tighter">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - Tanpa padding berlebih di mobile agar chat terasa full screen */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-0 lg:px-6 py-0 lg:py-8 flex flex-col">
        {children}
      </main>

      {/* Footer hanya muncul di desktop untuk menghemat layar mobile */}
      <footer className="hidden lg:block bg-white border-t border-slate-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Terintegrasi dengan Quran.com & Gemini AI</p>
          <p className="text-slate-300 text-[10px]">© 2025 Sahabat Quran Project. Dikembangkan untuk kemaslahatan umat.</p>
        </div>
      </footer>
    </div>
  );
};
