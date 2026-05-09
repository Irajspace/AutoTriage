import 'dotenv/config';
import { indexCodebase } from '../rag/indexer.js';

const result = await indexCodebase({
  repoPath: process.cwd(),
  repoName: 'autotriage',
});

console.log(`🎉 Indexed ${result} chunks successfully`);