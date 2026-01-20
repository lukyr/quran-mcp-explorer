
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
      {/* h-screen di mobile untuk full screen chat experience, lg:h-[750px] di desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-stretch lg:h-[750px] lg:max-h-[85vh] h-screen">
        
        {/* Kolom Kiri: Indeks Surah - Sembunyikan di mobile */}
        <div className="hidden lg:flex lg:col-span-4 h-full flex-col min-h-0">
          <SurahBrowser onReadSurah={openModal} />
        </div>

        {/* Kolom Kanan: Interface Chat - Full width dan full height di mobile */}
        <div className="flex-1 lg:col-span-8 h-full flex-col min-h-0 flex">
          <ChatWindow onLinkClick={openModal} />
          
          {/* Status Bar - Sembunyikan di mobile untuk tampilan bersih maksimal */}
          <div className="hidden lg:flex mt-4 px-4 py-2 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Pencarian Semantik Aktif</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium italic">
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
