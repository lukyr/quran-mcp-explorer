
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ChatWindow } from './components/ChatWindow';
import { SurahBrowser } from './components/SurahBrowser';
import { Modal } from './components/Modal';

const App: React.FC = () => {
  const [modalState, setModalState] = useState<{ isOpen: boolean; url: string }>({
    isOpen: false,
    url: '',
  });

  const openModal = (url: string) => {
    setModalState({ isOpen: true, url });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <Layout>
      {/* Container utama yang adaptif: Stack di mobile, Grid di desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-stretch lg:h-[750px] lg:max-h-[85vh] h-[calc(100vh-140px)]">
        
        {/* Kolom Kiri: Indeks Surah - Sembunyikan di mobile (hidden), muncul di desktop (lg:flex) */}
        <div className="hidden lg:flex lg:col-span-4 h-full flex-col min-h-0">
          <SurahBrowser onReadSurah={openModal} />
        </div>

        {/* Kolom Kanan: Interface Chat - Full width di mobile */}
        <div className="flex-1 lg:col-span-8 h-full flex-col min-h-0 flex">
          <ChatWindow onLinkClick={openModal} />
          
          {/* Status Bar - Sembunyikan di mobile untuk menghemat ruang, atau perkecil */}
          <div className="mt-2 lg:mt-4 px-4 py-2 bg-emerald-50/50 rounded-xl lg:rounded-2xl border border-emerald-100/50 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-[9px] lg:text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="hidden xs:inline">Pencarian Semantik Aktif</span>
              <span className="xs:hidden">Aktif</span>
            </div>
            <p className="text-[9px] lg:text-[10px] text-gray-400 font-medium italic">
              Quran.com & Gemini AI
            </p>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={closeModal} 
        url={modalState.url} 
      />
    </Layout>
  );
};

export default App;
