
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseData: { arabic: string, translation: string, reference: string } | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, verseData }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (isOpen && verseData) {
      generateImage();
    } else {
      setImageUrl(null);
    }
  }, [isOpen, verseData]);

  const generateImage = async () => {
    if (!verseData) return;
    setIsLoading(true);
    try {
      const theme = `${verseData.reference}: ${verseData.translation.substring(0, 50)}`;
      const img = await geminiService.generateVerseImage(theme);
      setImageUrl(img);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(currentLine);
        currentLine = words[n] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const getProcessedCanvas = (img: HTMLImageElement): HTMLCanvasElement | null => {
    if (!verseData) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = img.width;
    canvas.height = img.height;

    // 1. Draw Background
    ctx.drawImage(img, 0, 0);

    // 2. Gradient Overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.2)');
    gradient.addColorStop(0.4, 'rgba(15, 23, 42, 0.5)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Dynamic Font Scaling
    let fontSize = 38;
    const textLength = verseData.translation.length;
    if (textLength > 300) fontSize = 28;
    else if (textLength > 200) fontSize = 32;
    else if (textLength > 150) fontSize = 34;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;

    const padding = 100;
    const maxWidth = canvas.width - (padding * 2);
    let lines = wrapText(ctx, `"${verseData.translation}"`, maxWidth);
    let totalTextHeight = lines.length * (fontSize * 1.5);

    const maxAllowedHeight = canvas.height * 0.65;
    if (totalTextHeight > maxAllowedHeight) {
      fontSize = Math.floor(fontSize * (maxAllowedHeight / totalTextHeight));
      ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      lines = wrapText(ctx, `"${verseData.translation}"`, maxWidth);
      totalTextHeight = lines.length * (fontSize * 1.5);
    }

    const startY = (canvas.height / 2) - (totalTextHeight / 2) + 20;

    // 4. Draw Quote Icon
    ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.font = 'bold 80px serif';
    ctx.fillText('“', canvas.width / 2, startY - 40);

    // 5. Draw Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    lines.forEach((line, index) => {
      ctx.fillText(line.trim(), canvas.width / 2, startY + (index * (fontSize * 1.5)));
    });

    // 6. Draw Reference
    const referenceY = canvas.height - 80;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 50, referenceY - 40);
    ctx.lineTo(canvas.width / 2 + 50, referenceY - 40);
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'black 26px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = "8px";
    ctx.fillText(verseData.reference.toUpperCase(), canvas.width / 2, referenceY);

    return canvas;
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = getProcessedCanvas(img);
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `sahabatquran-${verseData?.reference.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
      }
    };
  };

  const handleShareFile = async () => {
    if (!imageUrl || !verseData) return;
    setIsSharing(true);
    
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      
      img.onload = async () => {
        const canvas = getProcessedCanvas(img);
        if (!canvas) return;

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          const file = new File([blob], `sahabatquran-${verseData.reference.toLowerCase()}.png`, { type: 'image/png' });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Inspirasi Sahabat Quran',
                text: `"${verseData.translation}" — ${verseData.reference}`,
              });
            } catch (err) {
              console.log("Share cancelled or failed", err);
            }
          } else {
            // Fallback: Just download if share API not supported
            handleDownload();
          }
          setIsSharing(false);
        }, 'image/png');
      };
    } catch (error) {
      console.error("Error sharing", error);
      setIsSharing(false);
    }
  };

  if (!isOpen || !verseData) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900">Bagi Inspirasi Quran</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[70vh]">
          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-100 shadow-xl border-4 border-white">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">AI sedang melukis...</p>
              </div>
            ) : imageUrl && (
              <>
                <img src={imageUrl} className="w-full h-full object-cover" alt="Background" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-slate-900/20 flex flex-col justify-center items-center p-8 text-center">
                  <div className="mb-4">
                    <svg className="w-6 h-6 text-emerald-400/50 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L17.017 3C18.6739 3 20.017 4.34315 20.017 6V15C20.017 18.3137 17.3307 21 14.017 21ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C10.5693 16 11.017 15.5523 11.017 15V9C11.017 8.44772 10.5693 8 10.017 8H7.017C5.91243 8 5.017 7.10457 5.017 6V3L8.017 3C9.67386 3 11.017 4.34315 11.017 6V15C11.017 18.3137 8.33071 21 5.017 21Z"/></svg>
                    <p className={`text-white font-bold leading-relaxed drop-shadow-lg px-2 ${verseData.translation.length > 200 ? 'text-[11px]' : 'text-sm'}`}>
                      {verseData.translation}
                    </p>
                  </div>
                  <div className="w-8 h-0.5 bg-emerald-500/30 mb-3 rounded-full"></div>
                  <p className="text-emerald-400 text-[8px] font-black uppercase tracking-[0.4em] drop-shadow-md">
                    {verseData.reference}
                  </p>
                </div>
              </>
            )}
          </div>

          {!isLoading && imageUrl && (
            <div className="mt-8 space-y-4">
              <button 
                onClick={handleShareFile}
                disabled={isSharing}
                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-emerald-600 transition-smooth disabled:opacity-50"
              >
                {isSharing ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                )}
                Kirim Gambar ke Apps
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-[10px] font-black text-slate-300 uppercase tracking-widest">Atau Simpan</span>
                </div>
              </div>

              <button 
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-smooth"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Simpan ke Galeri (PNG)
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100">
          Powered by Gemini AI & Sahabat Quran
        </div>
      </div>
    </div>
  );
};
