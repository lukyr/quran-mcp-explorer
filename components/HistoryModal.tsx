import React, { useEffect, useState } from 'react';
import { Conversation, chatHistoryService } from '../services/chatHistoryService';
import { supabase } from '../services/supabaseClient';
import { AuthModal } from './AuthModal';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  currentConversationId: string | null;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
  currentConversationId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      checkUser();
    }
  }, [isOpen]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await chatHistoryService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    loadConversations(); // Reload to show anonymous history (if any logic changes or just clears)
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900">Riwayat Percakapan</h3>
            <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Status Bar */}
          <div className="mb-4 p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
             {user ? (
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-700 truncate">{user.email}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Akun Terhubung</span>
                 </div>
               </div>
             ) : (
                <div className="flex flex-col">
                   <span className="text-xs font-bold text-slate-700">Mode Tamu</span>
                   <span className="text-[10px] text-slate-400">Riwayat hanya di perangkat ini</span>
                </div>
             )}

             {user ? (
                <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-full transition-colors">
                  Keluar
                </button>
             ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="text-[10px] font-bold text-white px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors shadow-sm">
                  Masuk / Daftar
                </button>
             )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada riwayat percakapan.
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md group ${
                    currentConversationId === conv.id
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-100 hover:border-emerald-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      currentConversationId === conv.id ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {formatDate(conv.updated_at)}
                    </span>
                    {currentConversationId === conv.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                  </div>
                  <h4 className={`font-semibold text-sm line-clamp-1 mb-1 ${
                    currentConversationId === conv.id ? 'text-emerald-900' : 'text-slate-700'
                  }`}>
                    {conv.title || 'Percakapan Baru'}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {conv.last_message_preview}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
