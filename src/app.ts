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


app.register(rawBody, { runFirst: true }); 

app.get('/health', async (request) => {
  return { status: 'ok' };
});


app.post<{Body:WebhookBody}>('/webhook', { config: { rawBody: true } }, async (request, reply) => {

  const signature = request.headers['x-hub-signature-256'] as string;
  

  const payload = request.rawBody as string; 
  
  logger.info({
    signature,
    payload
  })

  // if(!verifyGitHubSignature(payload,signature,GITHUB_WEBHOOK_SECRET)){
  //   return reply.code(401).send({ error: 'Unauthorized' });
  // }

  const { issue, action, repository } = request.body;
  const x=11;
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

export const logger = app.log;