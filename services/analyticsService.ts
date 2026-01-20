
/**
 * Analytics Service untuk Sahabat Quran
 * Membantu melacak interaksi pengguna untuk meningkatkan pengalaman aplikasi.
 */

type EventName = 'ai_chat_query' | 'clear_chat' | 'search_surah' | 'view_surah' | 'modal_open';

// Ganti 'G-MEASUREMENT_ID' dengan ID asli Anda jika ingin menggunakan cara statis,
// atau biarkan process.env.GA_MEASUREMENT_ID jika menggunakan environment variable.
const GA_ID = process.env.GA_MEASUREMENT_ID || 'G-MEASUREMENT_ID';

export const analyticsService = {
  /**
   * Menginisialisasi Google Analytics secara dinamis
   */
  init: () => {
    if (!GA_ID || GA_ID === 'G-MEASUREMENT_ID' || typeof window === 'undefined') {
      console.warn("GA_MEASUREMENT_ID belum dikonfigurasi. Tracking dinonaktifkan.");
      return;
    }

    // Injeksi script gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Konfigurasi dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag() {
      (window as any).dataLayer.push(arguments as any);
    }
    (window as any).gtag = gtag;

    (window as any).gtag('js', new Date());
    (window as any).gtag('config', GA_ID, {
      page_path: window.location.pathname,
    });

    console.debug("Google Analytics diinisialisasi dengan ID:", GA_ID);
  },

  /**
   * Mengirim event kustom ke GA4
   */
  logEvent: (name: EventName, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, params);
    }
  },

  /**
   * Melacak pencarian surah di sidebar
   */
  trackSurahSearch: (query: string) => {
    if (query.length > 2) {
      analyticsService.logEvent('search_surah', { search_term: query });
    }
  },

  /**
   * Melacak saat pengguna bertanya ke AI
   */
  trackAIChat: (message: string) => {
    analyticsService.logEvent('ai_chat_query', { 
      message_length: message.length,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Melacak pembukaan referensi Quran.com
   */
  trackViewSurah: (url: string) => {
    analyticsService.logEvent('view_surah', { 
      url: url,
      surah_id: url.split('/').pop()?.split('?')[0] 
    });
  }
};
