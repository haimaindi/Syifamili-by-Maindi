
import { GoogleGenAI, Type } from "@google/genai";
import { GrowthLog, FamilyMember, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CLEAN_HTML_INSTRUCTION = `
  Format the output as clean HTML (no markdown code blocks, no stars *). 
  Use <h3> for section titles, <p> for paragraphs, <ul>/<li> for lists.
  Use <b> tags to highlight important keywords or values.
  Do not include "Intro" or "Outro" fluff. Go straight to the point.
`;

export const getHealthInsights = async (member: FamilyMember, lang: Language, growthLogs?: GrowthLog[]) => {
  try {
    const model = 'gemini-3-flash-preview';
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const prompt = `
      You are a specialized medical AI assistant.
      Based on the following profile, provide actionable health insights.
      CRITICAL: You MUST return all content in ${targetLang}.
      Profile: Name: ${member.name}, Age: ${new Date().getFullYear() - new Date(member.birthDate).getFullYear()}, Role: ${member.relation}.
      Return JSON with title, content, source, type.
    `;
    const response = await ai.models.generateContent({
      model, contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { insights: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, source: { type: Type.STRING }, type: { type: Type.STRING } }, required: ["title", "content", "source", "type"] } } } } }
    });
    return JSON.parse(response.text || '{"insights":[]}').insights;
  } catch (error) { 
    console.error("Health Insights Error:", error);
    return []; 
  }
};

export const fetchLatestIdaiSchedule = async (childAgeMonths: number, lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide the OFFICIAL IDAI (Ikatan Dokter Anak Indonesia) LATEST 2024/2025 immunization schedule for a child aged ${childAgeMonths} months. Focus on 2024 updates. Format clean Markdown. Output language: ${targetLang}.`
    });
    return response.text;
  } catch (error) { 
    console.error("IDAI Schedule Error:", error);
    return "Gagal mengambil jadwal."; 
  }
};

export const analyzeMedicalRecord = async (content: string, lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const prompt = `
      Act as a Senior Medical Consultant. Analyze this record: "${content}".
      
      Output Requirements:
      1. NO Intro/Outro. Start directly with the first section.
      2. Use simple, modern, professional formatting with HTML.
      3. Use <h3 style="color: #4f46e5; margin-bottom: 8px;"> for headers.
      4. Use <span style="color: #059669; font-weight: 800;"> for Key Findings/Positive outcomes.
      5. Use <span style="color: #dc2626; font-weight: 800;"> for Alerts/Negative outcomes.
      6. Use <b> for important medication names or numbers.
      
      Sections:
      1. <h3>Ringkasan Klinis</h3> (Concise summary of diagnosis & vitals)
      2. <h3>Poin Penting</h3> (Bullet points of key data)
      3. <h3>Rekomendasi Tindakan</h3> (What to do next)
      
      Language: ${targetLang}.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text;
  } catch (error) { 
    console.error("Record Analysis Error:", error);
    return "Analisa gagal."; 
  }
};

// 1. HOME CARE SESSION ADVICE
export const getHomeCareAdvice = async (sessionData: string, lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const prompt = `
      Act as an Expert General Practitioner. Review this home care session data: ${sessionData}.
      Provide global recommendations on what the user (layperson) should do regarding the condition.
      
      Format Guidelines:
      - Use <h3> tags for section headers.
      - Use <span style="color: #2563eb; font-weight: 800;">text</span> to highlight key medical terms, symptoms, or numbers.
      - Use <b> for strong emphasis on actions.
      - Structure:
        1. Summary of Condition
        2. Home Treatment Recommendations
        3. Red Flags (When to go to ER/Doctor)
      - Add a disclaimer at the very end in a <small><i> tag: "Informasi ini mungkin tidak akurat, konsutasikan ke dokter/nakes profesional".
      
      ${CLEAN_HTML_INSTRUCTION}
      Language: ${targetLang}.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Home Care Advice Error:", error);
    return "Maaf, tidak dapat membuat analisa saat ini.";
  }
};

// 3. MEDICATION ADVICE (Pharmacist)
export const getMedicationAdvice = async (medName: string, details: string, lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const prompt = `
      Act as a Professional Pharmacist explaining to a layperson. 
      Analyze the medication: "${medName}" (Details: ${details}).
      
      Output Rules:
      1. Direct to the point. No "Hello" or "Here is the info".
      2. Format as clean HTML div structure.
      3. Use <h3 style="color: #0d9488; margin-bottom: 4px;"> for headers.
      4. Use <b> for highlighting keywords.
      5. Sections:
         - <h3>Fungsi & Kegunaan</h3>
         - <h3>Cara Pakai & Dosis</h3> (Review the user's dosage if provided in details)
         - <h3>Efek Samping Umum</h3>
         - <h3>Kontraindikasi & Peringatan</h3> (Things to avoid)
      
      Add a disclaimer at the bottom: <br/><small><i>Informasi ini mungkin tidak akurat, konsutasikan ke dokter/nakes profesional.</i></small>
      
      Language: ${targetLang}.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Medication Advice Error:", error);
    return "Informasi obat tidak tersedia saat ini.";
  }
};

// 4. GROWTH ANALYSIS (Pediatrician)
export const getGrowthAnalysis = async (ageMonths: number, logs: string, lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const now = new Date().toLocaleString();
    const prompt = `
      Act as a Pediatric Growth Specialist (Expertise in Nutrition & Development).
      Child Age: ${ageMonths} months. 
      Growth History: ${logs}.
      
      Provide a comprehensive analysis of the growth trend (Weight, Height, Head Circumference).
      What should the parents do?
      
      Output Rules:
      1. Direct to the point. No "Intro" or "Outro".
      2. Format as clean HTML.
      3. Use <h3 style="color: #4f46e5; margin-bottom: 4px;"> for headers.
      4. Use <b> for emphasizing key actions/foods/activities.
      5. Sections:
         - <h3>Analisa Status Gizi & Tren</h3> (Is it good? Is it stalling?)
         - <h3>Rekomendasi Nutrisi</h3> (Specific foods for this age and status)
         - <h3>Stimulasi Perkembangan</h3> (Activities for this age)
         - <h3>Red Flags</h3> (When to see a doctor)
      
      At the END, add: <br/><small><i>Analisa per ${now}. Informasi ini mungkin tidak akurat, konsutasikan ke dokter/nakes profesional.</i></small>
      
      Language: ${targetLang}.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Growth Analysis Error:", error);
    return "Analisa pertumbuhan gagal dimuat.";
  }
};

// 5. IMMUNIZATION ADVICE (Pediatrician)
export const getImmunizationAdvice = async (ageMonths: number, lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const now = new Date().toLocaleString();
    const prompt = `
      Act as a Pediatrician (Immunization Expert).
      Child Age: ${ageMonths} months.
      
      Provide the LATEST OFFICIAL IDAI 2024 (Ikatan Dokter Anak Indonesia) immunization recommendations for this specific age.
      Also answer 3 common FAQs parents have at this age.
      
      Output Rules:
      1. Direct to the point.
      2. Format as clean HTML.
      3. Use <h3 style="color: #0d9488; margin-bottom: 4px;"> for headers.
      4. Use <b> for vaccine names.
      5. Sections:
         - <h3>Jadwal Imunisasi Saat Ini (${ageMonths} Bulan)</h3>
         - <h3>Jadwal Catch-up (Jika Terlewat)</h3>
         - <h3>FAQ Penting</h3>
      
      At the END, add: <br/><small><i>Informasi per ${now}. Mungkin tidak akurat, konsutasikan ke dokter/nakes profesional.</i></small>
      
      Language: ${targetLang}.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Immunization Advice Error:", error);
    return "Gagal mengambil jadwal imunisasi.";
  }
};

// 6. CHILD DEVELOPMENT ANALYSIS (Motorik & Respon)
export const getDevelopmentAnalysis = async (ageMonths: number, checkedMilestones: string[], lang: Language) => {
  try {
    const targetLang = lang === 'ID' ? 'Indonesian' : 'English';
    const prompt = `
      Act as a Pediatric Developmental Specialist.
      Child Age: ${ageMonths} months.
      Milestones Achieved (IDAI): ${checkedMilestones.join(', ')}.
      
      Analyze the child's development based on what they CAN do.
      
      Output Rules:
      1. Clean HTML format. No intro/outro.
      2. Use <h3 style="color: #0d9488; margin-bottom: 4px;"> for headers.
      3. Sections:
         - <h3>Status Perkembangan</h3> (Brief assessment)
         - <h3>Stimulasi Lanjutan</h3> (Concrete games/activities to do next)
         - <h3>Hal yang Perlu Diperhatikan</h3> (What to look out for next)
      
      Language: ${targetLang}.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Development Analysis Error:", error);
    return "Analisa perkembangan gagal.";
  }
};

// 7. FIND PLACE WITH GOOGLE MAPS GROUNDING
export const findPlaceAttributes = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Google Maps Grounding is supported in 2.5
      contents: `Find the exact location for "${query}".`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    // Extract grounding chunks
    const candidates = response.candidates;
    if (candidates && candidates[0]) {
      const chunks = candidates[0].groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        // Look for the first valid map chunk
        const mapChunk = chunks.find(c => c.web?.uri && c.web.uri.includes('google.com/maps'));
        
        // Even if the web uri is there, we want to construct a reliable object
        // Usually groundingMetadata has more specific map data structure but for now relying on retrieval text or web uri
        // Let's assume the model answers with the address in text, and we extract the URI from chunks.
        
        let foundUri = mapChunk?.web?.uri || "";
        let foundTitle = mapChunk?.web?.title || query;
        
        // If no explicit chunk, sometimes the model returns it in text.
        // But for this feature, if we don't get a grounding chunk with URI, we failed to find it "officially".
        
        return {
          uri: foundUri,
          title: foundTitle,
          text: response.text || ''
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Map grounding failed", error);
    return null;
  }
};
