import { Octokit } from '@octokit/rest';
import type { FixResponse } from '../ai/generate-fix.js';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export interface PRCreateParams {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  fix: FixResponse;
  filePath: string;
}

export async function createPullRequest(
  params: PRCreateParams
): Promise<{ prNumber: number; prUrl: string }> {
  const {
    owner,
    repo,
    issueNumber,
    issueTitle,
    fix,
    filePath,
  } = params;

  // Create branch name
  const branchName = `fix/issue-${issueNumber}`;

  // Get main branch
  const mainBranch = await octokit.repos.getBranch({
    owner,
    repo,
    branch: 'main',
  });

  const baseSha = mainBranch.data.commit.sha;

  // Get current file content SHA
  const currentFile = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: 'main',
  });

  if (!('sha' in currentFile.data)) {
    throw new Error('Could not retrieve file SHA');
  }

  const fileSha = currentFile.data.sha;

  // Create new branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  // Update file with fixed code
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `fix: resolve issue #${issueNumber}`,
    content: Buffer.from(fix.fixedCode).toString('base64'),
    branch: branchName,
    sha: fileSha,
  });

  // Create pull request
  const pr = await octokit.pulls.create({
    owner,
    repo,
    title: `Fix issue #${issueNumber}: ${issueTitle}`,
    head: branchName,
    base: 'main',
    draft: true,
    body: `
## Automated Fix Proposal

### Severity
${fix.severity}

### Explanation
${fix.explanation}

### Original Issue
Closes #${issueNumber}

---
Generated automatically by AutoTriage AI.
`,
  });

  // Comment on original issue
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: `
🤖 I generated a potential fix for this issue.

Draft PR: ${pr.data.html_url}

Please review the proposed changes.
`,
  });

  return {
    prNumber: pr.data.number,
    prUrl: pr.data.html_url,
  };
}