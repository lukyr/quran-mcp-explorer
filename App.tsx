
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
      {/* Main Content Area with Fixed Height for Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-[750px] max-h-[85vh]">
        
        {/* Left Column: Index Surah - h-full ensures it matches Chat height */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0">
          <SurahBrowser onReadSurah={openModal} />
        </div>

        {/* Right Column: Chat Interface - flex flex-col min-h-0 for proper internal overflow */}
        <div className="lg:col-span-8 h-full flex flex-col min-h-0">
          <ChatWindow onLinkClick={openModal} />
          
          <div className="mt-4 px-4 py-2.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              Pencarian Semantik Aktif
            </div>
            <p className="text-[10px] text-gray-400 font-medium italic">
              Terintegrasi dengan Quran.com & Gemini AI
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
