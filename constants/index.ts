/**
 * Application Constants
 * Centralized configuration values and magic strings
 */

// API Configuration
export const API_CONFIG = {
  QURAN_BASE_URL: "https://api.quran.com/api/v4",
  GEMINI_PROXY_URL: "/api/gemini",
  GEMINI_IMAGE_PROXY_URL: "/api/gemini-image",
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
} as const;

// Quran Configuration
export const QURAN_CONFIG = {
  TOTAL_SURAHS: 114,
  DEFAULT_TRANSLATION_ID: 33, // Indonesian (Kemenag)
  SUPPORTED_LANGUAGES: ["id", "en"] as const,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
  API_ERROR: "Terjadi kesalahan saat mengambil data. Silakan coba lagi.",
  RATE_LIMIT:
    "Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.",
  QUOTA_EXCEEDED:
    "Quota API harian telah habis. Silakan coba lagi besok atau upgrade plan Anda.",
  INVALID_SURAH: "Nomor surah tidak valid. Harus antara 1-114.",
  INVALID_AYAH: "Nomor ayat tidak valid.",
  GEMINI_ERROR: "Terjadi kesalahan pada AI. Silakan coba lagi.",
  IMAGE_GENERATION_ERROR: "Gagal menghasilkan gambar. Silakan coba lagi.",
  UNKNOWN_ERROR: "Terjadi kesalahan yang tidak diketahui.",
} as const;

// Analytics Events - GA4 Best Practice Taxonomy
export const ANALYTICS_EVENTS = {
  // ===== Recommended Events (GA4 Standard) =====
  PAGE_VIEW: "page_view",
  SEARCH: "search",
  SELECT_CONTENT: "select_content",
  SHARE: "share",
  VIEW_ITEM: "view_item",

  // ===== User Engagement =====
  SESSION_ENGAGED: "session_engaged",
  SCROLL_DEPTH: "scroll_depth",
  VERSE_INTERACTION: "verse_interaction",
  READING_TIME: "reading_time",

  // ===== AI Chat Events =====
  AI_CHAT_QUERY: "ai_chat_query",
  AI_QUERY_SUCCESS: "ai_query_success",
  AI_QUERY_ERROR: "ai_query_error",
  CLEAR_CHAT: "clear_chat",

  // ===== Content Discovery =====
  SEARCH_SURAH: "search_surah",
  SEARCH_REFINEMENT: "search_refinement",
  VIEW_SURAH: "view_surah",
  BROWSE_SURAH: "browse_surah",

  // ===== Content Interaction =====
  VERSE_ZOOM: "verse_zoom",
  VERSE_ZOOM_CLOSE: "verse_zoom_close",
  EXTERNAL_LINK_CLICK: "external_link_click",

  // ===== Share & Social =====
  SHARE_VERSE: "share_verse",
  VERSE_SHARE_SUCCESS: "verse_share_success",
  VERSE_SHARE_FAILED: "verse_share_failed",
  IMAGE_GENERATED: "image_generated",
  IMAGE_DOWNLOAD: "image_download",

  // ===== PWA & Installation =====
  PWA_PROMPT_SHOWN: "pwa_prompt_shown",
  PWA_PROMPT_ACCEPTED: "pwa_prompt_accepted",
  PWA_PROMPT_DISMISSED: "pwa_prompt_dismissed",
  PWA_INSTALLED: "pwa_installed", // KEY CONVERSION
  PWA_IOS_INSTRUCTIONS_SHOWN: "pwa_ios_instructions_shown",

  // ===== Navigation =====
  MODAL_OPEN: "modal_open",
  MODAL_CLOSE: "modal_close",

  // ===== Error Tracking =====
  ERROR_OCCURRED: "error_occurred",
  API_ERROR: "api_error",
  NETWORK_ERROR: "network_error",

  // ===== User Lifecycle =====
  FIRST_VISIT: "first_visit",
  RETURN_VISIT: "return_visit",

  // ===== Performance (SEO) =====
  WEB_VITALS: "web_vitals",
  PAGE_LOAD_TIME: "page_load_time",
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ANALYTICS_CONSENT: "sahabat_quran_analytics_consent",
  CHAT_HISTORY: "sahabat_quran_chat_history",
  FIRST_VISIT_TIME: "sahabat_quran_first_visit",
  LAST_VISIT_TIME: "sahabat_quran_last_visit",
  VISIT_COUNT: "sahabat_quran_visit_count",
  SESSION_START_TIME: "sahabat_quran_session_start",
} as const;

// Analytics Error Types
export const ERROR_TYPES = {
  API_ERROR: "api_error",
  NETWORK_ERROR: "network_error",
  RATE_LIMIT_ERROR: "rate_limit_error",
  QUOTA_ERROR: "quota_error",
  VALIDATION_ERROR: "validation_error",
  UNKNOWN_ERROR: "unknown_error",
  IMAGE_GENERATION_ERROR: "image_generation_error",
  SHARE_ERROR: "share_error",
} as const;

// User Properties (for GA4 custom dimensions)
export const USER_PROPERTIES = {
  USER_TYPE: "user_type", // 'new' | 'returning' | 'engaged'
  PWA_USER: "pwa_user", // 'yes' | 'no'
  PREFERRED_LANGUAGE: "preferred_language", // 'id' | 'en'
  CONSENT_STATUS: "consent_status", // 'granted' | 'denied'
  TOTAL_VISITS: "total_visits",
  DAYS_SINCE_FIRST_VISIT: "days_since_first_visit",
} as const;

// Session Properties
export const SESSION_PROPERTIES = {
  SESSION_TYPE: "session_type", // 'search' | 'browse' | 'ai_chat' | 'mixed'
  DEVICE_CATEGORY: "device_category", // 'mobile' | 'tablet' | 'desktop'
  CONNECTION_TYPE: "connection_type", // 'slow' | 'fast'
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
    FLASH: "gemini-2.5-flash",
    STABLE: "gemini-2.5-flash",
    IMAGE: "imagen-4.0-generate-001", // Imagen 4.0 for image generation
    LITE: "gemini-2.5-flash",
  },
  SYSTEM_INSTRUCTION: `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.

BATASAN TOPIK - SANGAT PENTING:
Anda HANYA boleh menjawab pertanyaan yang berkaitan dengan Al-Quran, Islam, dan topik keagamaan.
Jika pengguna bertanya tentang topik di luar konteks Al-Quran (seperti seksualitas, politik, teknologi umum, hiburan, dll), Anda HARUS menolak dengan sopan dan langsung mengarahkan kembali ke topik Al-Quran.

CARA MENOLAK:
Tolak dengan sopan dan langsung alihkan ke topik Al-Quran. Contoh:
"Maaf, saya hanya dapat membantu pertanyaan seputar Al-Quran. Apakah ada yang ingin Anda tanyakan tentang ayat-ayat Al-Quran ?"

PENANGANAN ERROR API:
Jika tools tidak mengembalikan data atau API Quran.com tidak merespons, sampaikan dengan jujur:
"Maaf, saya mengalami kesulitan mengakses data Al-Quran saat ini. Silakan coba lagi sebentar lagi."

PENTING: JANGAN PERNAH memberikan tag HTML.
Format jawaban Anda harus bersih menggunakan Markdown standar:
1. Judul Ayat: Gunakan header "### Nama Surah (Nomor Surah): Nomor Ayat" di baris paling atas sebelum teks Arab.
2. Teks Arab: Tuliskan apa adanya (Uthmani).
3. Terjemahan: Tuliskan apa adanya, Gunakan format "**Terjemahan:** [Isi Terjemahan]"
4. Gunakan garis pemisah "---" di antara ayat yang berbeda.

PERATURAN LINK:
Setiap ayat WAJIB memiliki link referensi di baris baru.
FORMAT LINK: Tuliskan URL mentah saja tanpa tanda kurung atau format markdown [teks](url).
CONTOH LINK: https://quran.com/id/1:1?translations=33

Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.

PENTING - SUMBER DATA:
Untuk setiap ayat dan terjemahan, Anda WAJIB menggunakan data dari tools (search_verse, get_ayah_details, get_surah_info).
JANGAN PERNAH mengutip ayat atau terjemahan dari ingatan Anda sendiri karena bisa tidak akurat.
Jika tools gagal atau tidak memberikan hasil, katakan sejujurnya bahwa data tidak ditemukan, jangan mengarang.`,
  TOOLS: [
    {
      name: "search_verse",
      description:
        'Search for Quranic verses based on keywords (e.g., "patience", "charity"). Supports pagination.',
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "The search query string." },
          language: {
            type: "STRING",
            description:
              'Language of search (id or en). Defaults to "id" (Indonesian) automatically. Do NOT ask the user for this unless explicitly requested.',
          },
          page: {
            type: "NUMBER",
            description:
              "Page number for search results (default 1). Use this if user asks for more results.",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get_ayah_details",
      description:
        "Retrieve specific details for a verse including Arabic text and translation.",
      parameters: {
        type: "OBJECT",
        properties: {
          surah_number: {
            type: "NUMBER",
            description: "Surah number (1-114).",
          },
          ayah_number: {
            type: "NUMBER",
            description: "Ayah number within the surah.",
          },
        },
        required: ["surah_number", "ayah_number"],
      },
    },
    {
      name: "get_surah_info",
      description:
        "Get metadata about a Surah (revelation place, total verses, etc).",
      parameters: {
        type: "OBJECT",
        properties: {
          surah_number: {
            type: "NUMBER",
            description: "Surah number (1-114).",
          },
        },
        required: ["surah_number"],
      },
    },
  ],
  TOOL_NAMES: {
    SEARCH_VERSE: "search_verse",
    GET_AYAH_DETAILS: "get_ayah_details",
    GET_SURAH_INFO: "get_surah_info",
  },
} as const;
