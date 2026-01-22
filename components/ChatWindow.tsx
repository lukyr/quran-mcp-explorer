
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  onLinkClick: (url: string) => void;
  onShareClick: (verseData: { arabic: string, translation: string, reference: string }) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLinkClick, onShareClick }) => {
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
    analyticsService.logEvent('CLEAR_CHAT');
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
          "Tolong berikan jawaban yang lengkap. Gunakan garis pemisah --- di antara ayat. Sertakan judul referensi ayat menggunakan format ### Nama Surah (Nomor): Ayat. Pastikan setiap ayat memiliki link URL mentah (plain link) di baris baru.",
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
      let errorMsg = "Maaf, Sahabat Quran sedang mengalami sedikit kendala.";
      if (error?.message?.includes('429')) errorMsg = "Kuota harian habis. Silakan coba lagi nanti.";
      setMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
    } finally {
      if (requestTime >= lastClearTimestamp.current) setIsLoading(false);
    }
  };

  const handleLinkClick = (url: string) => {
    analyticsService.trackViewSurah(url);
    onLinkClick(url);
  };

  // --- New Types & Parser ---

  interface VerseData {
    type: 'verse';
    reference: string;
    arabic: string;
    translation: string;
    link?: string | undefined;
    shareLines: string[]; // For legacy share compatibility
  }

  interface TextData {
    type: 'text';
    content: string;
  }

  type MessageBlock = VerseData | TextData;

  const [zoomedVerse, setZoomedVerse] = useState<MessageBlock | null>(null);

  const parseMessageContent = (content: string): MessageBlock[] => {
    if (!content) return [];

    // Remove HTML tags for safer parsing, then split
    // Note: We might want to keep some formatting, but existing code stripped tags mostly.
    const lines = content.replace(/<[^>]*>?/gm, '').split('\n');
    const blocks: MessageBlock[] = [];

    let currentVerse: Partial<VerseData> | null = null;
    let currentTextBuffer: string[] = [];
    let currentShareLines: string[] = []; // To reconstruct context for share

    const flushText = () => {
      if (currentTextBuffer.length > 0) {
        blocks.push({ type: 'text', content: currentTextBuffer.join('\n') });
        currentTextBuffer = [];
      }
    };

    const flushVerse = () => {
       if (currentVerse && currentVerse.reference) {
          blocks.push({
            type: 'verse',
            reference: currentVerse.reference,
            arabic: currentVerse.arabic || '',
            translation: currentVerse.translation || '',
            link: currentVerse.link,
            shareLines: [...currentShareLines] // Snapshot
          });
       }
       currentVerse = null;
       currentShareLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
       const line = lines[i]?.trim() || '';
       if (!line) {
         if (currentVerse) {
           // Empty line inside a verse might just be spacing?
           // Usually Gemin output has no empty lines INSIDE verse block except before divider
           continue;
         }
         // Empty line in text - ignore or keep as spacer?
         // Original code rendered empty div h-2
         if (currentTextBuffer.length > 0) currentTextBuffer.push('');
         continue;
       }

       if (line === '---') {
         // Divider usually marks end of verse
         flushVerse();
         flushText();
         // We don't really need to render the divider explicitly if we use Cards
         continue;
       }

       const headerMatch = line.match(/^###\s*(.*)/);
       if (headerMatch) {
          flushText();
          flushVerse(); // Close previous if exists
          currentVerse = { reference: headerMatch[1] || '', arabic: '', translation: '' };
          currentShareLines = [line];
          continue;
       }

       const urlRegex = /(https?:\/\/quran\.com\/[^\s\)]+)/g;
       if (urlRegex.test(line)) {
          if (currentVerse) {
             const urlMatch = line.match(urlRegex)?.[0];
             if (urlMatch) currentVerse.link = urlMatch.replace(/[\]\)]+$/, '');
             currentShareLines.push(line);
          } else {
             // Link outside verse? Treat as text
             currentTextBuffer.push(line);
          }
          continue;
       }

       const arabicRegex = /[\u0600-\u06FF]/;
       if (arabicRegex.test(line)) {
          if (currentVerse) {
             currentVerse.arabic = line;
             currentShareLines.push(line);
          } else {
             currentTextBuffer.push(line); // Arabic in normal text
          }
           continue;
       }

       if (currentVerse) {
          // Translation logic
           let trans = line;
           if (line.toLowerCase().includes('terjemahan:')) {
             trans = line.replace(/(\*\*)*Terjemahan:(\*\*)*\s*/i, '').trim();
           }
           if (currentVerse.translation) currentVerse.translation += ' ' + trans;
           else currentVerse.translation = trans;
           currentShareLines.push(line);
       } else {
          currentTextBuffer.push(line);
       }
    }

    // Flush remaining
    flushVerse();
    flushText();

    return blocks;
  };

  const renderMessageContent = (content: string) => {
    const blocks = parseMessageContent(content);

    return (
      <div className="space-y-4">
        {blocks.map((block, idx) => {
          if (block.type === 'text') {
             // Render Markdown-ish text
             // Wrap in clickable div for Zoom
             return (
               <div
                 key={`t-${idx}`}
                 className="group relative hover:bg-slate-50 rounded-xl p-2 -mx-2 transition-colors cursor-zoom-in"
                 onClick={() => setZoomedVerse(block)}
               >
                 {block.content.split('\n').map((line, lIdx) => {
                     if (!line.trim()) return <div key={`t-${idx}-${lIdx}`} className="h-2" />;
                     const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                     return <p key={`t-${idx}-${lIdx}`} className="text-slate-600 leading-relaxed text-[14px] lg:text-[15px] font-medium my-1" dangerouslySetInnerHTML={{ __html: processedLine }} />;
                 })}

                 {/* Zoom Hint Icon */}
                 <div className="absolute top-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 text-emerald-600 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-emerald-100 flex items-center gap-1.5 pointer-events-none transform translate-y-0 lg:translate-y-1 lg:group-hover:translate-y-0">
                   <span className="text-[10px] font-bold uppercase tracking-wide">Perbesar</span>
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                 </div>
               </div>
             );
          } else {
             // Verse Card
             const v = block as VerseData;
             const labelMatch = v.link?.match(/quran\.com\/(?:id\/)?(\d+:\d+)/);
             const label = labelMatch ? labelMatch[1] : 'Lihat Ayat';

             return (
               <div key={`v-${idx}`} className="group relative bg-white rounded-2xl border border-emerald-50 p-4 hover:shadow-md transition-all cursor-zoom-in" onClick={() => setZoomedVerse(v)}>
                  {/* Reference Badge */}
                  <div className="mb-8">
                     <span className="inline-flex items-center px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[11px] lg:text-xs font-bold shadow-md shadow-emerald-200 tracking-wide uppercase">
                       {v.reference}
                     </span>
                  </div>

                  {/* Arabic */}
                  <div className="font-arabic text-2xl lg:text-3xl text-right text-slate-900 mb-4 leading-[2.5] tracking-wide dir-rtl">
                     {v.arabic}
                  </div>

                  {/* Translation */}
                  <div className="text-slate-600 text-[14px] lg:text-[15px] italic mb-4 leading-relaxed border-l-2 border-emerald-100 pl-3">
                     "{v.translation}"
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-2">
                     {v.link && (
                       <button
                         onClick={(e) => { e.stopPropagation(); handleLinkClick(v.link!); }}
                         className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-600 hover:text-white transition-smooth border border-emerald-100 font-bold text-[10px] shadow-sm"
                       >
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
                         Detail {label}
                       </button>
                     )}
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Internal share expects lines and index. We can define a simplified handler or reconstruct context.
                          // For now, let's call onShareClick directly since we have the data!
                          onShareClick({ arabic: v.arabic, translation: v.translation, reference: v.reference });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full hover:bg-emerald-600 transition-smooth font-bold text-[10px] shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        Bagi Gambar
                      </button>
                  </div>

                  {/* Zoom Hint */}
                   <div className="absolute top-4 right-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 text-slate-400 bg-slate-50/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none transform translate-y-0 lg:translate-y-1 lg:group-hover:translate-y-0 border border-slate-100 shadow-sm">
                     <span className="text-[10px] font-bold uppercase tracking-wide">Perbesar</span>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                   </div>
               </div>
             );
          }
        })}
      </div>
    );
  };

  return (
    <div className="bg-white lg:rounded-[2.5rem] shadow-none lg:shadow-2xl flex flex-col flex-1 h-full min-h-0 lg:border border-slate-100 overflow-hidden">
      <div className="bg-white px-4 lg:px-8 py-3 lg:py-5 border-b border-slate-50 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>
          </div>
          <div><h2 className="font-extrabold text-slate-900 tracking-tight text-sm lg:text-lg">Sahabat Quran</h2><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><p className="text-[8px] lg:text-[10px] uppercase tracking-widest font-bold text-slate-400">Siap Membantu</p></div></div>
        </div>
        <button onClick={handleClear} className="text-slate-300 hover:text-red-500 transition-smooth p-2 hover:bg-red-50 rounded-xl group"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-10 custom-scrollbar bg-[#fcfdfd]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] lg:max-w-[85%] ${m.role === 'user' ? 'bg-slate-900 text-white rounded-[1.5rem_1.5rem_0.25rem_1.5rem] px-5 py-3 shadow-lg' : 'w-full bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100'}`}>
              {renderMessageContent(m.content)}
              {m.toolResults && m.toolResults.length > 0 && <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-1.5">{m.toolResults.map((tr, idx) => <span key={idx} className="text-[8px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 uppercase">{tr.name.replace('_', ' ')}</span>)}</div>}
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center space-x-3 shadow-sm"><div className="flex space-x-1"><div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memproses...</span></div></div>}
      </div>

      <form onSubmit={handleSubmit} className="p-4 lg:p-8 bg-white border-t border-slate-100">
        <div className="relative flex items-center max-w-4xl mx-auto gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tanya Al-Quran..." className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl py-3 px-5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-emerald-500/20 transition-smooth" />
          <button type="submit" disabled={isLoading || !input.trim()} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-20 active:scale-95 flex items-center justify-center shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
        </div>
      </form>

      {/* --- Zoom Modal Overlay --- */}
      {zoomedVerse && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setZoomedVerse(null)}>
           <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-slate-100 transform transition-all scale-100 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setZoomedVerse(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="text-center">
                 {zoomedVerse.type === 'verse' ? (
                   <>
                     <span className="inline-block px-4 py-1.5 bg-emerald-600 text-white rounded-full text-sm font-bold shadow-md shadow-emerald-200 tracking-wide uppercase mb-8">
                       {(zoomedVerse as VerseData).reference}
                     </span>

                     <div className="font-arabic text-4xl lg:text-5xl text-center text-slate-900 mb-8 leading-[2.5] tracking-wide dir-rtl">
                       {(zoomedVerse as VerseData).arabic}
                     </div>

                     <div className="text-slate-600 text-lg lg:text-xl italic leading-relaxed font-serif">
                       "{(zoomedVerse as VerseData).translation}"
                     </div>

                     {(zoomedVerse as VerseData).link && (
                        <div className="mt-8 flex justify-center gap-4">
                           <button onClick={() => handleLinkClick((zoomedVerse as VerseData).link!)} className="px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-600 hover:text-white transition-colors font-bold text-sm">
                             Buka di Quran.com
                           </button>
                        </div>
                     )}
                   </>
                 ) : (
                   <>
                     {/* Text Zoom View */}
                     <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold tracking-wide uppercase mb-6">
                       Penjelasan / Info
                     </span>
                     <div className="text-left text-slate-700 text-base lg:text-lg leading-loose space-y-4">
                        {(zoomedVerse as TextData).content.split('\n').map((line, idx) => (
                           line.trim() && <p key={idx} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        ))}
                     </div>
                   </>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
