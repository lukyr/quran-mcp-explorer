
import React, { useState, useEffect } from 'react';
import { quranService } from '../services/quranService';
import { Surah } from '../types';

interface SurahBrowserProps {
  onReadSurah: (url: string) => void;
}

export const SurahBrowser: React.FC<SurahBrowserProps> = ({ onReadSurah }) => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quranService.getSurahs().then(data => {
      setSurahs(data);
      setLoading(false);
    });
  }, []);

  const filtered = surahs.filter(s => 
    s.name_simple.toLowerCase().includes(filter.toLowerCase()) ||
    s.translated_name.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-8 border-b border-slate-50">
        <h3 className="font-extrabold text-slate-900 mb-6 flex items-center gap-3 text-lg tracking-tight">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          Indeks Surah
        </h3>
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari surah..."
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-3xl text-sm font-semibold focus:outline-none focus:bg-white focus:border-emerald-500/20 transition-smooth shadow-inner"
          />
          <svg className="w-5 h-5 text-slate-300 absolute left-5 top-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {loading ? (
          <div className="space-y-3 px-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1">
            {filtered.map(surah => (
              <div
                key={surah.id}
                onClick={() => onReadSurah(`https://quran.com/id/${surah.id}?translations=33`)}
                className="group relative flex items-center justify-between p-4 rounded-3xl hover:bg-emerald-50/40 cursor-pointer transition-smooth"
              >
                <div className="flex items-center gap-4">
                  <span className="w-11 h-11 rounded-2xl bg-slate-50 group-hover:bg-white text-slate-400 group-hover:text-emerald-600 flex items-center justify-center font-black text-[12px] transition-smooth border border-slate-100 group-hover:border-emerald-100 shadow-sm">
                    {surah.id}
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-900 leading-tight transition-smooth">{surah.name_simple}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{surah.translated_name.name} • {surah.verses_count} Ayat</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-arabic text-2xl text-slate-300 group-hover:text-emerald-800 transition-smooth">
                    {surah.name_arabic}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
