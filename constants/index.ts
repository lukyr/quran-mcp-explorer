/**
 * Application Constants
 * Centralized configuration values and magic strings
 */

// API Configuration
export const API_CONFIG = {
  QURAN_BASE_URL: 'https://api.quran.com/api/v4',
  GEMINI_PROXY_URL: '/api/gemini',
  GEMINI_IMAGE_PROXY_URL: '/api/gemini-image',
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
} as const;

// Quran Configuration
export const QURAN_CONFIG = {
  TOTAL_SURAHS: 114,
  DEFAULT_TRANSLATION_ID: 33, // Indonesian (Kemenag)
  SUPPORTED_LANGUAGES: ['id', 'en'] as const,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  API_ERROR: 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.',
  RATE_LIMIT: 'Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.',
  QUOTA_EXCEEDED: 'Quota API harian telah habis. Silakan coba lagi besok atau upgrade plan Anda.',
  INVALID_SURAH: 'Nomor surah tidak valid. Harus antara 1-114.',
  INVALID_AYAH: 'Nomor ayat tidak valid.',
  GEMINI_ERROR: 'Terjadi kesalahan pada AI. Silakan coba lagi.',
  IMAGE_GENERATION_ERROR: 'Gagal menghasilkan gambar. Silakan coba lagi.',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui.',
} as const;

// Analytics Events
export const ANALYTICS_EVENTS = {
  AI_CHAT_QUERY: 'ai_chat_query',
  CLEAR_CHAT: 'clear_chat',
  SEARCH_SURAH: 'search_surah',
  VIEW_SURAH: 'view_surah',
  MODAL_OPEN: 'modal_open',
  SHARE_VERSE: 'share_verse',
  GENERATE_IMAGE: 'generate_image',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ANALYTICS_CONSENT: 'sahabat_quran_analytics_consent',
  CHAT_HISTORY: 'sahabat_quran_chat_history',
} as const;

// Feature Flags
export const FEATURES = {
  ANALYTICS_ENABLED: true,
  IMAGE_GENERATION_ENABLED: true,
  SHARE_ENABLED: true,
} as const;

// Gemini Configuration
export const GEMINI_CONFIG = {
  MODEL_NAMES: {
    FLASH: 'gemini-2.0-flash-lite-preview-02-05',
    STABLE: 'gemini-1.5-flash',
    IMAGE: 'gemini-2.5-flash-image',
    LITE: 'gemini-2.0-flash-lite-preview-02-05',
  },
  SYSTEM_INSTRUCTION: `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.

PENTING: JANGAN PERNAH memberikan tag HTML.
Format jawaban Anda harus bersih menggunakan Markdown standar:
1. Judul Ayat: Gunakan header "### Nama Surah (Nomor Surah): Nomor Ayat" di baris paling atas sebelum teks Arab.
2. Teks Arab: Tuliskan apa adanya (Uthmani).
3. Terjemahan: Gunakan format "**Terjemahan:** [Isi Terjemahan]"
4. Gunakan garis pemisah "---" di antara ayat yang berbeda.

PERATURAN LINK:
Setiap ayat WAJIB memiliki link referensi di baris baru.
FORMAT LINK: Tuliskan URL mentah saja tanpa tanda kurung atau format markdown [teks](url).
CONTOH LINK: https://quran.com/id/1:1?translations=33

Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.`,
  TOOLS: [
    {
      name: 'search_verse',
      description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity"). Supports pagination.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'The search query string.' },
          language: { type: 'STRING', description: 'Language of search (id or en). Defaults to "id" (Indonesian) automatically. Do NOT ask the user for this unless explicitly requested.' },
          page: { type: 'NUMBER', description: 'Page number for search results (default 1). Use this if user asks for more results.' }
        },
        required: ['query'],
      },
    },
    {
      name: 'get_ayah_details',
      description: 'Retrieve specific details for a verse including Arabic text and translation.',
      parameters: {
        type: 'OBJECT',
        properties: {
          surah_number: { type: 'NUMBER', description: 'Surah number (1-114).' },
          ayah_number: { type: 'NUMBER', description: 'Ayah number within the surah.' }
        },
        required: ['surah_number', 'ayah_number'],
      },
    },
    {
      name: 'get_surah_info',
      description: 'Get metadata about a Surah (revelation place, total verses, etc).',
      parameters: {
        type: 'OBJECT',
        properties: {
          surah_number: { type: 'NUMBER', description: 'Surah number (1-114).' }
        },
        required: ['surah_number'],
      },
    },
  ],
  TOOL_NAMES: {
    SEARCH_VERSE: 'search_verse',
    GET_AYAH_DETAILS: 'get_ayah_details',
    GET_SURAH_INFO: 'get_surah_info',
  },
} as const;
