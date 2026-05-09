import { Worker, type Job } from 'bullmq';
import { connection } from './redisClient.js';
import { type IssueJobData } from './queue.js';
import { searchSimilarCode } from './rag/search.js';
import { generateFix } from './ai/generate-fix.js';
import { createPullRequest } from './github/pr-creator.js';

const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const worker = new Worker(
  'IssueQueue',
  async (job: Job<IssueJobData>) => {
    const data = job.data;

    console.log('📋 Processing issue:', {
      issueNumber: data.issueNumber,
      title: data.issueTitle,
      repo: data.repoName,
    });

    // Search for relevant code chunks
    const chunks = await searchSimilarCode(
      data.issueBody || data.issueTitle,
      data.repoName
    );

    console.log('🔍 Found relevant code chunks:');

    for (const chunk of chunks) {
      console.log({
        file: chunk.filePath,
        chunk: chunk.chunkNumber,
        similarity: chunk.similarity,
      });
    }

    let fix = null;
    let prNumber = null;
    let prUrl = null;

    // Generate fix if chunks found
    if (chunks.length > 0) {
      fix = await generateFix(
        data.issueTitle,
        data.issueBody || '',
        chunks
      );

      console.log('🛠 Generated Fix:');

      console.log({
        severity: fix.severity,
        explanation: fix.explanation,
      });

      // Extract owner and repo
      const [owner, repo] = data.repoFullName.split('/');

      if (!owner || !repo) {
        throw new Error('Invalid repoFullName format');
      }

      // Create PR
      const pr = await createPullRequest({
        owner,
        repo,
        issueNumber: data.issueNumber,
        issueTitle: data.issueTitle,
        fix,
        filePath: chunks[0]!.filePath,
      });

      prNumber = pr.prNumber;
      prUrl = pr.prUrl;

      console.log('🚀 Pull Request Created!');
      console.log({
        prNumber,
        prUrl,
      });
    }

    await sleep(2000);

    return {
      success: true,
      chunksFound: chunks.length,
      fix,
      prNumber,
      prUrl,
    };
  },
  { connection }
);

worker.on('completed', (job: Job<IssueJobData>) => {
  const jobId = job.id;
  const issueNumber = job.data.issueNumber;

  console.log(`✅ Job ${jobId} finished processing Issue #${issueNumber}!`);
});

worker.on('failed', (job, err: Error) => {
  console.log(`❌ Job ${job?.id} failed with error: ${err.message}`);
});

export { worker };