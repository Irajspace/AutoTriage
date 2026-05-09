import 'dotenv/config'; 
import Fastify from 'fastify';
import rawBody from 'fastify-raw-body'; 
import { verifyGitHubSignature } from './utils/verify.js';
import { issueQueue } from './queue.js';
import { worker } from './worker.js'; 

type WebhookBody = {
  action: string;
  issue: {
    number: number;
    title: string;
    body: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
};

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

export const app = Fastify({
  logger: true
});

export const logger = app.log;  // ← MOVE HERE (before using it)

app.register(rawBody, { runFirst: true }); 

app.get('/health', async (request) => {
  return { status: 'ok' };
});

app.post<{Body:WebhookBody}>('/webhook', { config: { rawBody: true } }, async (request, reply) => {
  const signature = request.headers['x-hub-signature-256'] as string;
  const payload = request.rawBody as string;
  
  // DEBUG: Log what we're receiving
  console.log('Raw payload type:', typeof payload);
  console.log('Raw payload length:', payload?.length);
  console.log('Raw payload first 200 chars:', payload?.substring(0, 200));

  // Parse the body
  let body: WebhookBody;
  try {
    body = JSON.parse(payload);
  } catch (err) {
    console.error('JSON parse error:', err);
    return reply.code(400).send({ error: 'Invalid JSON', received: payload?.substring(0, 100) });
  }

  const { issue, action, repository } = body;

  if (!issue || !repository) {
    return reply.code(400).send({ error: 'Missing issue or repository' });
  }

  const job = await issueQueue.add(
    'process-issue',
    {
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueBody: issue.body,
      repoName: repository.name,
      repoFullName: repository.full_name,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );
    
  request.log.info(
    {
      issueNumber: issue.number,
      title: issue.title,
      action: action,
      repo: repository.name
    },
    'GitHub webhook received'
  );

  return reply.code(202).send({ received: true });
});