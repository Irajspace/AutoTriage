type WebhookBody = {
  action: string;
  issue?: { // 'issue' can be optional or partially defined in some webhook events
    number: number;
    title: string;
    body?: string | null; // 'body' can be undefined, null, or an empty string
  };
  repository?: { // 'repository' can be optional or partially defined
    name: string;
    full_name: string;
  };
};

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

export const app = Fastify({
  logger: true
});

// ... inside a Fastify route handler ...
// (Assuming 'request' and 'reply' are available)

  const { issue, action, repository } = request.body as WebhookBody;

  // Add robust validation for required fields to prevent crashes
  if (!issue || !repository || typeof issue.number !== 'number' || typeof issue.title !== 'string') {
    request.log.warn({ payload: request.body }, 'Invalid or incomplete webhook payload: Missing required issue or repository details.');
    reply.status(400).send({ error: 'Bad Request: Missing essential issue or repository information.' });
    return; // Stop processing if payload is invalid
  }

  // Safely retrieve issue body, defaulting to an empty string if it's undefined or null
  const issueBody = issue.body ?? ''; // Use nullish coalescing operator for robustness

  const job = await issueQueue.add(
      'process-issue',
      {
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueBody: issueBody, // Use the validated and defaulted issueBody
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