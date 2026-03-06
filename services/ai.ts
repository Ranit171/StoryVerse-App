
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiService = {
  async validateEmailRisk(email: string): Promise<{ isSafe: boolean; reason?: string }> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a high-security fraud detection system. Analyze the email address: "${email}".
        Determine if this email is "real" and suitable for a professional platform.
        Reject if:
        1. It belongs to a known disposable/temporary email provider (e.g., temp-mail, 10minutemail, etc.).
        2. It follows patterns of procedurally generated "bot" emails (e.g., random strings of numbers/letters like 'a1b2c3d4@gmail.com').
        3. The domain is known for high-risk spam.
        Respond in strict JSON format with keys: "isSafe" (boolean) and "reason" (string explaining why it's unsafe).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSafe: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["isSafe"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{"isSafe": true}');
      return result;
    } catch (error) {
      // Robust fallback logic
      const blacklist = ['tempmail', '10minutemail', 'guerrillamail', 'mailinator', 'dispostable', 'temp-mail', 'throwawaymail'];
      const domain = email.split('@')[1]?.toLowerCase() || '';
      const isBlacklisted = blacklist.some(b => domain.includes(b));
      
      // Basic entropy check for the username part
      const username = email.split('@')[0];
      const looksProcedural = username.length > 10 && (username.match(/\d/g) || []).length > 4;

      if (isBlacklisted) return { isSafe: false, reason: "Disposable email services are not allowed for security reasons." };
      if (looksProcedural) return { isSafe: false, reason: "Email appears to be procedurally generated. Please use a standard address." };
      
      return { isSafe: true };
    }
  },

  async fixGrammar(content: string): Promise<string> {
    if (!content.trim()) return content;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix any grammatical, spelling, or punctuation errors in the following text. Keep the tone and style exactly the same, only fix mistakes. Output ONLY the corrected text: "${content}"`,
      });
      return response.text || content;
    } catch (error) {
      console.error("AI Grammar fix failed:", error);
      return content;
    }
  },

  async getSuggestion(title: string, content: string): Promise<string> {
    const prompt = title 
      ? `I'm writing a story titled "${title}". Here is what I have so far: "${content}". Suggest the next 2-3 sentences to continue the story in a creative way.`
      : `I'm writing a story. Here is what I have so far: "${content}". Suggest a creative next 2-3 sentences.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Keep writing! You're doing great.";
    } catch (error) {
      console.error("AI Suggestion failed:", error);
      return "The words are within you; keep exploring.";
    }
  }
};
