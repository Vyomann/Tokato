
export interface IntelligenceReport {
  analysis: {
    reasoning_trace: string;
    scam_detected: boolean;
    confidence_score: number;
    scam_category: string;
  };
  response_strategy: {
    current_persona: string;
    emotional_state: string;
    next_action: string;
  };
  generated_response: string;
  intelligence_extraction: {
    upi_ids: string[];
    bank_details: string[];
    crypto_wallets: string[];
    phishing_links: string[];
    phone_numbers: string[];
  };
}

export interface Message {
  id: string;
  role: 'threat_actor' | 'asi_gemini';
  content: string;
  image?: string;
  timestamp: Date;
  metadata?: Partial<IntelligenceReport>;
}

export interface HoneypotSession {
  id: string;
  status: 'analyzing' | 'engaging' | 'archived';
  category: string;
  confidence: number;
  persona: string;
  messages: Message[];
  extractedIntel: string[];
  lastActivity: Date;
}
