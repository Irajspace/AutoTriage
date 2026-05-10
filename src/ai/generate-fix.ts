import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { CodeChunk } from '../rag/search.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export interface FixResponse {
  originalCode: string;
  fixedCode: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const FixSchema = z.object({
  originalCode: z.string(),
  fixedCode: z.string(),
  explanation: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
});

export async function generateFix(
  issueTitle: string,
  issueBody: string,
  codeChunks: CodeChunk[]
): Promise<FixResponse> {
  if (!codeChunks.length) {
    throw new Error('No relevant code chunks found');
  }

  // Take top 3 most relevant chunks
  const relevantCode = codeChunks
    .slice(0, 3)
    .map(
      (chunk) => `
FILE: ${chunk.filePath}

${chunk.chunkText}
`
    )
    .join('\n\n');

  const prompt = `
You are a senior backend engineer helping fix a GitHub issue.

Analyze the issue carefully and suggest a code fix.

ISSUE TITLE:
${issueTitle}

ISSUE BODY:
${issueBody}

RELEVANT CODE:
${relevantCode}

IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT use markdown
- Do NOT wrap response in \`\`\`
- Do NOT hallucinate missing files
- Keep explanation concise and technical
- If code is incomplete, make best effort fix

JSON FORMAT:
{
  "originalCode": string,
  "fixedCode": string,
  "explanation": string,
  "severity": "critical" | "high" | "medium" | "low"
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const text = response.text;

  if (!text) {
    throw new Error('Empty AI response');
  }

  // Gemini sometimes wraps JSON in markdown
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Invalid JSON from AI:', cleaned);

    throw new Error('Failed to parse AI response');
  }

  try {
    return FixSchema.parse(parsed);
  } catch (err) {
    console.error('Schema validation failed:', parsed);

    throw new Error('AI response validation failed');
  }
}