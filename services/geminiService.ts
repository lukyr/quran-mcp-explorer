/**
 * Gemini Service - Client-side wrapper for Gemini AI
 * Uses serverless proxy in production, direct API in development
 */

import { GoogleGenAI } from "@google/genai";
import { API_CONFIG, ERROR_MESSAGES, GEMINI_CONFIG } from '../constants';
import { handleError, logError } from '../utils/errorHandler';
import { quranService } from './quranService';
import { supabase } from './supabaseClient';


// Check if running in development mode with API key
const isDevelopment = import.meta.env.DEV;
const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
const useDirectAPI = isDevelopment && hasApiKey;

// Initialize AI for development mode
const ai = useDirectAPI ? new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" }) : null;

// Map tools for direct API SDK using correct types
const tools = {
  functionDeclarations: GEMINI_CONFIG.TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: tool.parameters.type as any,
      properties: Object.entries(tool.parameters.properties).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: {
          ...value,
          type: value.type as any
        }
      }), {}),
      required: [...tool.parameters.required] as string[]
    }
  }))
};

/**
 * Helper untuk melakukan retry jika terkena Rate Limit (429)
 */
async function apiCallWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') ||
                        error?.status === 429 ||
                        error?.message?.includes('quota') ||
                        error?.message?.includes('RATE_LIMIT');

    if (isRateLimit) {
      // Check if it's quota exceeded (daily limit)
      const isQuotaExceeded = error?.message?.includes('quota') ||
                              error?.message?.includes('exceeded your current quota');

      if (isQuotaExceeded) {
        throw new Error('QUOTA_EXCEEDED: Gemini API daily quota exceeded. Please try again tomorrow or upgrade your plan.');
      }

      // Regular rate limit - retry
      if (retries > 0) {
        console.warn(`⚠️ Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiCallWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
      }

      throw new Error('RATE_LIMIT: Too many requests. Please wait a moment and try again.');
    }

    throw error;
  }
}

export const geminiService = {
  async chat(message: string, history: any[] = []): Promise<{ text: string, toolCalls?: any[] }> {
    try {
      // Use direct API in development mode
      if (useDirectAPI && ai) {
        console.log('🔧 Development mode: Using direct Gemini API');

        const contents = history.length > 0
          ? [...history, { role: 'user', parts: [{ text: message }] }]
          : [{ role: 'user', parts: [{ text: message }] }];

        // Try with flash model first, fallback to stable if needed
        let model = GEMINI_CONFIG.MODEL_NAMES.FLASH;

        try {
          const response = await apiCallWithRetry(() => ai.models.generateContent({
            model,
            contents: contents,
            config: {
              systemInstruction: GEMINI_CONFIG.SYSTEM_INSTRUCTION,
              tools: [tools],
            },
          }));

          return {
            text: response.text || '',
            toolCalls: response.functionCalls
          };
        } catch (error: any) {
          // If 403, try with stable model
          if (error?.message?.includes('403') || error?.status === 403) {
            console.warn('⚠️ Flash model failed (403), trying stable model...');
            model = GEMINI_CONFIG.MODEL_NAMES.STABLE as any;

            const response = await apiCallWithRetry(() => ai.models.generateContent({
              model,
              contents: contents,
              config: {
                systemInstruction: GEMINI_CONFIG.SYSTEM_INSTRUCTION,
                tools: [tools],
              },
            }));

            return {
              text: response.text || '',
              toolCalls: response.functionCalls
            };
          }

          throw error;
        }
      }

      // Use proxy endpoint in production
      console.log('🚀 Production mode: Using serverless proxy');
      const response = await apiCallWithRetry(async () => {
        const res = await fetch(API_CONFIG.GEMINI_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            history,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
      });

      return {
        text: response.text || '',
        toolCalls: response.toolCalls
      };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'chat', messageLength: message.length });
      throw new Error(ERROR_MESSAGES.GEMINI_ERROR);
    }
  },

  async generateVerseImage(theme: string): Promise<string> {
    try {
      // Use Imagen 4.0 for image generation (gemini models don't support image generation)
      if (useDirectAPI && ai) {
        console.log('🔧 Development mode: Using Imagen 4.0 API');

        const response = await apiCallWithRetry(() => ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: `Create a professional and serene wallpaper background with a theme of: ${theme}.

STRICT GUIDELINES:
1. CONTENT: Must be strictly beautiful, peaceful, and inspiring Islamic art.
2. STYLE: High-quality minimalist digital art, cinematic lighting, soft gradients.
3. COMPOSITION: NO text in the image. NO human faces. NO animals.
4. MOOD: Peaceful, spiritual, contemplative.
5. COLORS: Warm, calming colors that inspire reflection.`,
          config: {
            numberOfImages: 1,
            includeRaiReason: true,
          }
        }));

        console.log('🖼️ Imagen Response:', response);

        if (response?.generatedImages && response.generatedImages.length > 0) {
          const imageBytes = response.generatedImages[0]?.image?.imageBytes;
          if (imageBytes) {
            return `data:image/png;base64,${imageBytes}`;
          }
        }

        if (response?.generatedImages?.[0]?.raiFilteredReason) {
          const reason = response.generatedImages[0].raiFilteredReason;
          console.warn('⚠️ Image blocked by RAI filter:', reason);
          throw new Error(`Gambar tidak dapat dibuat: ${reason}`);
        }

        throw new Error('Gagal menghasilkan gambar. Respons kosong.');
      }

      // Use proxy endpoint in production
      console.log('🚀 Production mode: Using serverless image proxy');
      const response = await apiCallWithRetry(async () => {
        const res = await fetch(API_CONFIG.GEMINI_IMAGE_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
      });

      if (response.image) {
        return response.image;
      }

      throw new Error(ERROR_MESSAGES.IMAGE_GENERATION_ERROR);
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'generateVerseImage', theme });

      // Return user-friendly error instead of throwing
      console.error('Image generation failed:', appError.message);
      throw new Error('Fitur generate gambar sementara tidak tersedia. Silakan coba lagi nanti.');
    }
  },

  async getOrGenerateVerseImage(surah: number, ayah: number, theme: string): Promise<string> {
    try {
      // 1. Check Cache in Supabase DB
      const { data: existingImage } = await supabase
        .from('verse_images')
        .select('image_url')
        .match({ surah_number: surah, ayah_number: ayah })
        .single();

      if (existingImage?.image_url) {
        console.log('📦 Using cached image from Supabase');
        return existingImage.image_url;
      }

      console.log('🎨 Cache miss, generating new image...');
      // 2. Generate Image via Gemini (returns Base64)
      const base64Image = await this.generateVerseImage(theme);

      // 3. Upload to Supabase Storage
      const timestamp = Date.now();
      const fileName = `${surah}-${ayah}-${timestamp}.png`;

      // Convert Base64 to Blob/Buffer for upload
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(fileName, bytes.buffer, {
          contentType: 'image/png',
          upsert: false // Don't overwrite, time-based filenames avoid collision
        });

      if (uploadError) {
        console.warn('Failed to upload image to Supabase:', uploadError);
        return base64Image; // Return generated image even if caching fails
      }

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(fileName);

      // 5. Save metadata to DB
      const { error: dbError } = await supabase
        .from('verse_images')
        .insert({
          surah_number: surah,
          ayah_number: ayah,
          theme: theme,
          image_url: publicUrl
        });

      if (dbError) {
        console.warn('Failed to save image metadata:', dbError);
      }

      return publicUrl;
    } catch (error) {
      console.error('Error in getOrGenerateVerseImage:', error);
      // Fallback to direct generation if something in the caching flow breaks
      return this.generateVerseImage(theme);
    }
  },

  async executeTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case GEMINI_CONFIG.TOOL_NAMES.SEARCH_VERSE:
          const searchData = await quranService.searchVerses(args.query, args.language || 'id', args.page || 1);
          if (!searchData || searchData.length === 0) return { message: "Tidak ada ayat yang ditemukan." };
          return searchData;
        case GEMINI_CONFIG.TOOL_NAMES.GET_AYAH_DETAILS:
          return await quranService.getAyahDetails(args.surah_number, args.ayah_number);
        case GEMINI_CONFIG.TOOL_NAMES.GET_SURAH_INFO:
          return await quranService.getSurah(args.surah_number);
        default:
          throw new Error(`Tool ${name} not found`);
      }
    } catch (error) {
      const appError = handleError(error);
      logError(appError, { method: 'executeTool', toolName: name, args });
      return { error: "Terjadi kesalahan saat menghubungi API Quran.com." };
    }
  }
};
