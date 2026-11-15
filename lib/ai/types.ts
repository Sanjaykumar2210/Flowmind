export interface AIConfig {
  baseUrl: string;
  model: string;
  provider: "OLLAMA" | "OPENAI_COMPATIBLE";
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  apiKey: string;
}

export interface AIClassificationResult {
  category: string;
  confidence?: number;
  reasoning?: string;
  [key: string]: unknown;
}

export interface AISummarizationResult {
  summary: string;
  bulletPoints?: string[];
  keyTakeaways?: string[];
}

export interface AIExtractionResult {
  data: Record<string, unknown>;
  rawOutput?: string;
}

export interface AIGenerationResult {
  text: string;
  model: string;
  tokensUsed?: number;
}

