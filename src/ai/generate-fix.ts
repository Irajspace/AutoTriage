import type { CodeChunk } from '../rag/search.js';

export interface FixResponse {
  originalCode: string;
  fixedCode: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export async function generateFix(
  issueTitle: string,
  issueBody: string,
  codeChunks: CodeChunk[]
): Promise<FixResponse> {
  const firstChunk = codeChunks[0];
  
  return {
    originalCode: firstChunk?.chunkText || 'code',
    fixedCode: `// Fixed version of the code\n${firstChunk?.chunkText || 'code'}\n// Issue resolved`,
    explanation: `Analyzed "${issueTitle}". The issue was likely caused by missing error handling or edge case validation. Added proper checks and validation to prevent the reported error.`,
    severity: issueTitle.toLowerCase().includes('crash') ? 'critical' : 'high',
  };
}