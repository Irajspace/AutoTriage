import 'dotenv/config'; 
import Fastify from 'fastify';
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

export const logger = app.log;

app.post<{Body:WebhookBody}>('/webhook', async (request, reply) => {
  // request.body is already parsed by Fastify
  const body = request.body as WebhookBody;
  console.log('Full webhook payload:', JSON.stringify(body, null, 2));

  console.log('Received webhook:', {
    issueNumber: body.issue?.number,
    title: body.issue?.title,
    repo: body.repository?.full_name,
  });

  if (!body.issue || !body.repository) {
    return reply.code(400).send({ error: 'Missing issue or repository' });
  }

  const { issue, action, repository } = body;

  try {
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
  } catch (err) {
    request.log.error(err, 'Failed to queue issue');
    return reply.code(500).send({ error: 'Failed to queue' });
  }
});

app.get('/health', async (request) => {
  return { status: 'ok' };
});