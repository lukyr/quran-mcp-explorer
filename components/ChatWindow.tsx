
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  onLinkClick: (url: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLinkClick }) => {
  const initialMessage = useMemo<ChatMessage>(() => ({ 
    role: 'model', 
    content: 'Assalamu’alaikum Warahmatullahi Wabarakatuh. Selamat datang di **Sahabat Quran**.\n\nSaya adalah teman virtual Anda untuk menjelajahi keindahan firman Allah. Apa yang ingin Anda pelajari hari ini?\n\n*Contoh: "Ayat tentang ketenangan hati", "Kisah Nabi Musa", atau "Tampilkan Surah Al-Fatihah"*' 
  }), []);

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastClearTimestamp = useRef<number>(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleClear = () => {
    analyticsService.logEvent('clear_chat');
    lastClearTimestamp.current = Date.now();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([initialMessage]);
    setInput('');
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const requestTime = Date.now();
    const userMessage = input.trim();
    
    // Tracking GA4
    analyticsService.trackAIChat(userMessage);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiHistory = messages
        .filter((m, idx) => !(idx === 0 && m.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      const response = await geminiService.chat(userMessage, apiHistory);
      
      if (requestTime < lastClearTimestamp.current) return;

      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = await Promise.all(
          response.toolCalls.map(async (tc) => {
            const result = await geminiService.executeTool(tc.name, tc.args);
            return { name: tc.name, args: tc.args, result };
          })
        );

        if (requestTime < lastClearTimestamp.current) return;

        const toolHistory = [
          ...apiHistory,
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: response.toolCalls.map(tc => ({ functionCall: tc })) },
          { 
            role: 'function', 
            parts: toolResults.map(tr => ({ 
              functionResponse: { name: tr.name, response: { result: tr.result } } 
            })) 
          }
        ];
        
        const finalResponse = await geminiService.chat(
          "Tolong berikan jawaban yang lengkap. Gunakan garis pemisah --- di antara ayat. Sertakan judul referensi ayat menggunakan format ### Nama Surah (Nomor): Ayat.", 
          toolHistory
        );
        
        if (requestTime < lastClearTimestamp.current) return;

        setMessages(prev => [...prev, { 
          role: 'model', 
          content: finalResponse.text || "Hasil telah diproses.",
          toolResults
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text }]);
      }
    } catch (error: any) {
      if (requestTime < lastClearTimestamp.current) return;
      
      console.error(error);
      let errorMsg = "Maaf, Sahabat Quran sedang mengalami sedikit kendala. Coba cek koneksi Anda ya.";
      
      if (error?.message?.includes('429')) {
        errorMsg = "Mohon maaf, kuota harian Sahabat Quran saat ini sudah habis (Error 429). Silakan coba lagi beberapa saat lagi atau besok ya. Terima kasih atas pengertiannya.";
      }

      setMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
    } finally {
      if (requestTime >= lastClearTimestamp.current) {
        setIsLoading(false);
      }
    }
  };

  const handleLinkClick = (url: string) => {
    analyticsService.trackViewSurah(url);
    onLinkClick(url);
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const cleaned = content.replace(/<[^>]*>?/gm, '');
    const lines = cleaned.split('\n');
    
    return lines.map((line, i) => {
      // 1. Divider
      if (line.trim() === '---') {
        return (
          <div key={i} className="ayah-divider my-4 lg:my-8 opacity-20">
            <div className="icon">
              <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
            </div>
          </div>
        );
      }

      // 2. Custom Header Handling (### Reference)
      const headerMatch = line.match(/^###\s*(.*)/);
      if (headerMatch) {
        return (
          <div key={i} className="my-4">
            <span className="inline-flex items-center px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[11px] lg:text-xs font-bold shadow-md shadow-emerald-200 tracking-wide uppercase">
              {headerMatch[1]}
            </span>
          </div>
        );
      }

      // 3. Quran.com Links
      const urlRegex = /(https?:\/\/quran\.com\/(id\/)?[^\s\)]+)/g;
      if (urlRegex.test(line)) {
        const urlMatch = line.match(urlRegex)?.[0];
        if (urlMatch) {
          let label = urlMatch.split('?')[0].replace('https://quran.com/', '').replace('id/', '').replace('/', ':');
          return (
            <div key={i} className="my-2">
              <button 
                onClick={() => handleLinkClick(urlMatch)}
                className="inline-flex items-center gap-1.5 px-3 py-1 lg:px-4 lg:py-1.5 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-600 hover:text-white transition-smooth border border-emerald-100 font-bold text-[10px] lg:text-xs shadow-sm"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
                Detail di Quran.com ({label})
              </button>
            </div>
          );
        }
      }

      // 4. Arabic Text
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
      if (arabicRegex.test(line)) {
        return (
          <div key={i} className="font-arabic text-2xl lg:text-3xl text-slate-900 my-4 lg:my-6 tracking-wide leading-[2.5] drop-shadow-sm">
            {line}
          </div>
        );
      }

      // 5. Bold & Regular Text
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (line.trim() === '') return <div key={i} className="h-1 lg:h-2"></div>;
      
      return (
        <p key={i} className="text-slate-600 leading-relaxed text-[14px] lg:text-[15px] font-medium my-1" 
           dangerouslySetInnerHTML={{ __html: processedLine }} />
      );
    });
  };

  return (
    <div className="bg-white lg:rounded-[2.5rem] shadow-none lg:shadow-2xl flex flex-col flex-1 h-full min-h-0 lg:border border-slate-100 overflow-hidden">
      <div className="bg-white px-4 lg:px-8 py-3 lg:py-5 border-b border-slate-50 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 tracking-tight text-sm lg:text-lg">Sahabat Quran</h2>
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span className="w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[8px] lg:text-[10px] uppercase tracking-[0.1em] lg:tracking-[0.15em] font-bold text-slate-400">Siap Membantu</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleClear}
          className="text-slate-300 hover:text-red-500 transition-smooth p-2 hover:bg-red-50 rounded-xl lg:rounded-2xl group"
          title="Hapus Percakapan"
        >
          <svg className="w-4 h-4 lg:w-5 lg:h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-10 custom-scrollbar bg-[#fcfdfd]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[90%] lg:max-w-[85%] ${
              m.role === 'user' 
                ? 'bg-slate-900 text-white rounded-[1.5rem_1.5rem_0.25rem_1.5rem] lg:rounded-[2rem_2rem_0.5rem_2rem] px-5 py-3 lg:px-8 lg:py-5 shadow-lg shadow-slate-200' 
                : 'w-full bg-white rounded-2xl lg:rounded-3xl px-5 py-4 lg:px-8 lg:py-6 shadow-sm border border-slate-100'
            }`}>
              {renderMessageContent(m.content)}
              
              {m.toolResults && m.toolResults.length > 0 && (
                <div className="mt-4 lg:mt-6 pt-4 border-t border-slate-50 flex flex-wrap gap-1.5 lg:gap-2">
                  {m.toolResults.map((tr, idx) => (
                    <span key={idx} className="text-[8px] lg:text-[10px] font-bold text-slate-400 bg-slate-50 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full border border-slate-100 uppercase tracking-wider">
                      {tr.name.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl lg:rounded-3xl px-4 py-3 lg:px-6 lg:py-4 border border-slate-100 flex items-center space-x-3 lg:space-x-4 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">Mencari rujukan di Quran.com...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 lg:p-8 bg-white border-t border-slate-100">
        <div className="relative flex items-center max-w-4xl mx-auto gap-2 lg:gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya Al-Quran..."
            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl lg:rounded-[2rem] py-3 lg:py-5 px-5 lg:px-10 pr-12 lg:pr-20 text-sm lg:text-[16px] text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500/20 transition-smooth shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 lg:p-4 bg-emerald-600 text-white rounded-xl lg:rounded-[1.5rem] shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-20 transition-smooth active:scale-95 flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};
