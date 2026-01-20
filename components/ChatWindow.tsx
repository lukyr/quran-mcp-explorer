
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  onLinkClick: (url: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLinkClick }) => {
  const initialMessage = useMemo<ChatMessage>(() => ({ 
    role: 'model', 
    content: 'Assalamu’alaikum Warahmatullahi Wabarakatuh. Selamat datang di **Quran Explorer**.\n\nSaya adalah **Sahabat Quran**, teman virtual Anda untuk menjelajahi keindahan firman Allah. Saya siap membantu Anda mencari ayat berdasarkan topik, memahami makna, atau sekadar berbagi inspirasi dari Al-Quran.\n\nApa yang ingin Anda pelajari hari ini?\n\n*Contoh: "Ayat tentang ketenangan hati", "Kisah Nabi Musa di Al-Quran", atau "Tampilkan Surah Al-Fatihah"*' 
  }), []);

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleClear = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus percakapan ini?')) {
      setMessages([initialMessage]);
      setInput('');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
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
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = await Promise.all(
          response.toolCalls.map(async (tc) => {
            const result = await geminiService.executeTool(tc.name, tc.args);
            return { name: tc.name, args: tc.args, result };
          })
        );

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
          "Tolong berikan jawaban yang lengkap. Gunakan garis pemisah --- di antara ayat. Tulis teks Arab saja tanpa tag HTML.", 
          toolHistory
        );
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: finalResponse.text || "Hasil telah diproses. Lihat referensi di bawah.",
          toolResults
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Maaf, Sahabat Quran sedang mengalami sedikit kendala. Coba cek koneksi Anda ya." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const cleaned = content.replace(/<[^>]*>?/gm, '');
    const lines = cleaned.split('\n');
    
    return lines.map((line, i) => {
      if (line.trim() === '---') {
        return (
          <div key={i} className="ayah-divider">
            <div className="icon">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
            </div>
          </div>
        );
      }

      const urlRegex = /(https?:\/\/quran\.com\/(id\/)?[^\s\)]+)/g;
      if (urlRegex.test(line)) {
        const urlMatch = line.match(urlRegex)?.[0];
        if (urlMatch) {
          let label = urlMatch.split('?')[0].replace('https://quran.com/', '').replace('id/', '').replace('/', ':');
          return (
            <div key={i} className="my-2">
              <button 
                onClick={() => onLinkClick(urlMatch)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-600 hover:text-white transition-smooth border border-emerald-100 font-bold text-xs shadow-sm"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
                Quran {label}
              </button>
            </div>
          );
        }
      }

      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
      if (arabicRegex.test(line)) {
        return (
          <div key={i} className="font-arabic text-3xl text-slate-900 my-6 tracking-wide drop-shadow-sm">
            {line}
          </div>
        );
      }

      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (line.trim() === '') return <div key={i} className="h-2"></div>;
      
      return (
        <p key={i} className="text-slate-600 leading-relaxed text-[15px] font-medium my-1" 
           dangerouslySetInnerHTML={{ __html: processedLine }} />
      );
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl flex flex-col flex-1 h-full min-h-0 border border-slate-100 overflow-hidden">
      <div className="bg-white px-8 py-5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 tracking-tight text-lg">Sahabat Quran</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Siap Membantu</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleClear}
          className="text-slate-200 hover:text-red-400 transition-smooth p-2.5 hover:bg-red-50 rounded-2xl"
          title="Reset Percakapan"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] ${
              m.role === 'user' 
                ? 'bg-slate-900 text-white rounded-[2rem_2rem_0.5rem_2rem] px-8 py-5 shadow-xl shadow-slate-200' 
                : 'w-full'
            }`}>
              {renderMessageContent(m.content)}
              
              {m.toolResults && m.toolResults.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-2">
                  {m.toolResults.map((tr, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider">
                      {tr.name.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 rounded-3xl px-6 py-4 border border-slate-100 flex items-center space-x-4">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mengkaji Ayat...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-8 bg-white border-t border-slate-50">
        <div className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya apa saja seputar Al-Quran..."
            className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] py-5 px-10 pr-20 text-[16px] text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500/20 transition-smooth shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-4 p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-20 transition-smooth active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};