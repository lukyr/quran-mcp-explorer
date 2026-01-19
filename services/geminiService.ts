
import { GoogleGenAI, Type } from "@google/genai";
import { quranService } from "./quranService";

const createAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const searchVerseTool = {
  name: 'search_verse',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for Quranic verses based on keywords (e.g., "patience", "charity").',
    properties: {
      query: { type: Type.STRING, description: 'The search query string.' },
      language: { type: Type.STRING, description: 'Language of search (id or en). Default id.' }
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
    const ai = createAI();
    
    const contents = history.length > 0 
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: `Anda adalah Quran MCP Assistant. Bantu pengguna mengeksplorasi Al-Quran dengan data terverifikasi.
        
        PENTING: JANGAN PERNAH memberikan tag HTML seperti <p style="..."> atau <div>.
        Format jawaban Anda harus bersih menggunakan Markdown standar:
        1. Teks Arab: Tuliskan apa adanya (Uthmani). Jangan beri tanda kutip atau tag.
        2. Terjemahan: Gunakan format "**Terjemahan:** [Isi Terjemahan]"
        3. Gunakan garis pemisah "---" di antara ayat yang berbeda agar tampilan rapi (clean).
        4. Setiap ayat wajib memiliki link: https://quran.com/id/[surah]:[ayah]?translations=33
        5. Gunakan Bahasa Indonesia sepenuhnya.
        6. Jika tidak ada hasil, katakan dengan sopan.`,
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

  async executeTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'search_verse':
          const searchData = await quranService.searchVerses(args.query, args.language || 'id');
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
