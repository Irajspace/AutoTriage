  const payload = request.body as Partial<WebhookBody>;

  // Basic validation for essential components of the payload
  if (!payload.issue || typeof payload.issue.number === 'undefined' || !payload.issue.title || !payload.repository || !payload.repository.name || !payload.repository.full_name) {
    request.log.warn('Received invalid webhook payload: missing essential issue or repository data.', payload);
    reply.status(400).send({ message: 'Invalid webhook payload: missing required issue or repository data.' });
    return; // Stop processing and respond
  }

  // Safely extract validated data
  const { issue, action, repository } = payload as WebhookBody;

  // Ensure issueBody is always a string, converting null/undefined to an empty string.
  // GitHub can send issue.body as null if there's no body.
  const issueBody = issue.body === null || typeof issue.body === 'undefined' ? '' : issue.body;

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