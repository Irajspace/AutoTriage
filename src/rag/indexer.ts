import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { pool } from '../db/connection.js';
import { embedText } from './embedding.js';

const CHUNK_SIZE = 500; // characters

export interface IndexJob {
  repoPath: string;
  repoName: string;
}

export async function indexCodebase(job: IndexJob): Promise<number> {
  let totalChunks = 0;

  // Find all .ts and .js files
  const files = await glob('**/*.{ts,js}', {
    cwd: job.repoPath,
    absolute: false,
    ignore: ['node_modules/**', 'dist/**', 'build/**'],
  });

  console.log(`📁 Found ${files.length} files`);

  // Process each file
  for (const file of files) {
    try {
      const fullPath = path.join(job.repoPath, file);

      console.log(`📄 Processing: ${file}`);

      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');

      // Split into chunks
      const chunks: string[] = [];

      for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        chunks.push(content.slice(i, i + CHUNK_SIZE));
      }

      // Process each chunk
      for (let chunkNumber = 0; chunkNumber < chunks.length; chunkNumber++) {
        const chunkText = chunks[chunkNumber]!;

        // Generate embedding
        const embedding = await embedText(chunkText);

        // Store in PostgreSQL
       // In the chunk insertion, add ON CONFLICT handling:
                await pool.query(
                `
                INSERT INTO code_embeddings (
                    file_path,
                    chunk_number,
                    chunk_text,
                    embedding,
                    repo_name
                )
                VALUES ($1, $2, $3, $4::vector, $5)
                ON CONFLICT (repo_name, file_path, chunk_number) 
                DO UPDATE SET 
                    chunk_text = $3,
                    embedding = $4::vector
                `,
                [
                    file,
                    chunkNumber,
                    chunkText,
                    JSON.stringify(embedding),
                    job.repoName,
                ]
                );
        totalChunks++;

        console.log(
          `✅ Indexed chunk ${chunkNumber + 1}/${chunks.length} from ${file}`
        );
      }
    } catch (error) {
      console.error(`❌ Failed to process file: ${file}`, error);
    }
  }

  console.log(`🎉 Finished indexing ${totalChunks} chunks`);

  return totalChunks;
}