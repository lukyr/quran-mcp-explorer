
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, url }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-emerald-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Sahabat Quran Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 leading-none">Quran.com Reference</h3>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mt-1">{url.replace('https://', '')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Open in New Tab
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-white rounded-xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Iframe Body */}
        <div className="flex-1 bg-gray-50 relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-emerald-800/60">Loading Reference Content...</p>
            </div>
          </div>
          <iframe
            src={url}
            className="w-full h-full border-none bg-white"
            title="Quran Reference"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>

        {/* Footer info (only on some mobile if needed) */}
        <div className="p-4 sm:hidden bg-white border-t border-emerald-50">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold w-full"
          >
            Open Original Site
          </a>
        </div>
      </div>
    </div>
  );
};
