
import { GoogleGenAI, Type } from "@google/genai";
import { quranService } from "./quranService";

// Inisialisasi AI menggunakan API_KEY dari environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const searchVerseTool = {
  name: 'search_verse',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity"). Supports pagination.',
    properties: {
      query: { type: Type.STRING, description: 'The search query string.' },
      language: { type: Type.STRING, description: 'Language of search (id or en). Default id.' },
      page: { type: Type.NUMBER, description: 'Page number for search results (default 1). Use this if user asks for more results.' }
    },
    required: ['query'],
  },
};

const getAyahDetailsTool = {
  name: 'get_ayah_details',
  parameters: {
    type: Type.OBJECT,
    description: 'Retrieve specific details for a verse including Arabic text and translation.',
    properties: {
      surah_number: { type: Type.NUMBER, description: 'Surah number (1-114).' },
      ayah_number: { type: Type.NUMBER, description: 'Ayah number within the surah.' }
    },
    required: ['surah_number', 'ayah_number'],
  },
};

const getSurahInfoTool = {
  name: 'get_surah_info',
  parameters: {
    type: Type.OBJECT,
    description: 'Get metadata about a Surah (revelation place, total verses, etc).',
    properties: {
      surah_number: { type: Type.NUMBER, description: 'Surah number (1-114).' }
    },
    required: ['surah_number'],
  },
};

export const geminiService = {
  async chat(message: string, history: any[] = []): Promise<{ text: string, toolCalls?: any[] }> {
    const contents = history.length > 0 
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: `Anda adalah Sahabat Quran. Bantu pengguna mengeksplorasi Al-Quran dengan penuh kasih dan data yang akurat.
        
        PENTING: JANGAN PERNAH memberikan tag HTML.
        Format jawaban Anda harus bersih menggunakan Markdown standar:
        1. Judul Ayat: Gunakan header "### Nama Surah (Nomor Surah): Nomor Ayat" di baris paling atas sebelum teks Arab.
        2. Teks Arab: Tuliskan apa adanya (Uthmani).
        3. Terjemahan: Gunakan format "**Terjemahan:** [Isi Terjemahan]"
        4. Gunakan garis pemisah "---" di antara ayat yang berbeda.
        5. Setiap ayat wajib memiliki link: https://quran.com/id/[surah]:[ayah]?translations=33
        6. Gunakan Bahasa Indonesia sepenuhnya dengan nada yang hangat dan sopan.
        
        CATATAN PENCARIAN:
        - Fungsi search_verse mengembalikan 20 hasil per halaman. 
        - Jika pengguna meminta "lebih banyak" atau "halaman berikutnya", panggil search_verse kembali dengan parameter page yang lebih tinggi.`,
        tools: [{ 
          functionDeclarations: [
            searchVerseTool, 
            getAyahDetailsTool, 
            getSurahInfoTool
          ] 
        }],
      },
    });

    return {
      text: response.text || '',
      toolCalls: response.functionCalls
    };
  },

  async generateVerseImage(theme: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `Create a professional and serene wallpaper background with a theme of: ${theme}. 

          STRICT GUIDELINES:
          1. CONTENT: Must be strictly beautiful, peaceful, and inspiring. Focus on serene landscapes, morning dew, calm oceans, starry skies, or elegant abstract Islamic geometric patterns (arabesque).
          2. SAFETY: Strictly NO pornography, NO nudity, NO violence, NO cruelty, NO blood, NO weapons, and NO disturbing imagery. The output must be family-friendly and spiritually uplifting.
          3. COMPOSITION: NO text in the image. NO human faces or clear human figures. 
          4. STYLE: High-quality minimalist digital art, cinematic lighting, soft atmospheric glow. Colors: Elegant tones like deep emerald green, royal gold, soft sapphire blue, or warm dawn colors.
          5. RESOLUTION: Aesthetic, high-definition 2k style finish.`
        }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Gagal menghasilkan gambar");
  },

  async executeTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'search_verse':
          const searchData = await quranService.searchVerses(args.query, args.language || 'id', args.page || 1);
          if (!searchData || searchData.length === 0) return { message: "Tidak ada ayat yang ditemukan." };
          return searchData;
        case 'get_ayah_details':
          return await quranService.getAyahDetails(args.surah_number, args.ayah_number);
        case 'get_surah_info':
          return await quranService.getSurah(args.surah_number);
        default:
          throw new Error(`Tool ${name} not found`);
      }
    } catch (error) {
      console.error("Tool execution failed", error);
      return { error: "Terjadi kesalahan saat menghubungi API Quran.com." };
    }
  }
};
