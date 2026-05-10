import { pool } from '../db/connection.js';
import { embedText } from './embedding.js';

export interface CodeChunk {
  filePath: string;
  chunkNumber: number;
  chunkText: string;
  similarity: number;
}

export async function searchSimilarCode(
  issueText: string,
  repoName: string
): Promise<CodeChunk[]> {
  // Generate embedding for issue
  const embedding = await embedText(issueText);

  console.log('Embedding dimension:', embedding.length);

  // Convert embedding to pgvector format
  const vector = `[${embedding.join(',')}]`;

  const result = await pool.query(
    `
    SELECT 
      file_path,
      chunk_number,
      chunk_text,
      1 - (embedding <-> $1::vector) AS similarity
    FROM code_embeddings
    WHERE repo_name = $2
    ORDER BY embedding <-> $1::vector
    LIMIT 5
    `,
    [vector, repoName]
  );

  console.log(
    'Raw search results:',
    result.rows.map((r) => ({
      file: r.file_path,
      similarity: r.similarity,
    }))
  );

  return result.rows.map((row) => ({
    filePath: row.file_path,
    chunkNumber: row.chunk_number,
    chunkText: row.chunk_text,
    similarity: Number(row.similarity),
  }));
}