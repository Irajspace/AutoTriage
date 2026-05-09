import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding) {
    throw new Error('Failed to generate embedding');
  }

  return embedding;
}