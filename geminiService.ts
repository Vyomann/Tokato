
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "./constants";
import { IntelligenceReport } from "./types";

// Initialize the API using the mandated environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const reportSchema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.OBJECT,
      properties: {
        reasoning_trace: { type: Type.STRING },
        scam_detected: { type: Type.BOOLEAN },
        confidence_score: { type: Type.NUMBER },
        scam_category: { type: Type.STRING }
      },
      required: ["reasoning_trace", "scam_detected", "confidence_score", "scam_category"]
    },
    response_strategy: {
      type: Type.OBJECT,
      properties: {
        current_persona: { type: Type.STRING },
        emotional_state: { type: Type.STRING },
        next_action: { type: Type.STRING }
      },
      required: ["current_persona", "emotional_state", "next_action"]
    },
    generated_response: { type: Type.STRING },
    intelligence_extraction: {
      type: Type.OBJECT,
      properties: {
        upi_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
        bank_details: { type: Type.ARRAY, items: { type: Type.STRING } },
        crypto_wallets: { type: Type.ARRAY, items: { type: Type.STRING } },
        phishing_links: { type: Type.ARRAY, items: { type: Type.STRING } },
        phone_numbers: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["upi_ids", "bank_details", "crypto_wallets", "phishing_links", "phone_numbers"]
    }
  },
  required: ["analysis", "response_strategy", "generated_response", "intelligence_extraction"]
};

export const analyzeScam = async (
  input: string, 
  imageUri?: string, 
  history: { role: string; content: string }[] = []
): Promise<IntelligenceReport> => {
  // Using gemini-3-pro-preview for advanced reasoning and threat extraction
  const model = "gemini-3-pro-preview";
  
  const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');
  const contextPrompt = history.length > 0 
    ? `OPERATIONAL HISTORY:\n${historyText}\n\nNEW INCOMING THREAT DATA:\n${input}`
    : `INITIAL THREAT DATA FOR ANALYSIS:\n${input}`;

  const parts: any[] = [{ text: contextPrompt }];

  if (imageUri) {
    const base64Data = imageUri.split(',')[1];
    const mimeType = imageUri.split(',')[0].split(':')[1].split(';')[0];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: reportSchema,
      temperature: 0.2, // Low temperature for consistent reasoning and precise intel extraction
    }
  });

  if (!response.text) throw new Error("Tokato: Intelligence analysis yielded no results.");
  
  try {
    return JSON.parse(response.text.trim()) as IntelligenceReport;
  } catch (e) {
    console.error("Critical: Intelligence Report Parsing Failed", response.text);
    throw new Error("Intelligence parsing error: Malformed payload from neural engine.");
  }
};
