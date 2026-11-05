const fullCommitShaPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

export function resolveSourceSha({ githubSha, localSha }) {
  const hasGitHubSha = typeof githubSha === 'string' && githubSha.trim().length > 0;
  const sourceSha = hasGitHubSha ? githubSha.trim() : typeof localSha === 'string' ? localSha.trim() : '';

  if (!fullCommitShaPattern.test(sourceSha)) {
    throw new Error('Build source SHA must be a full 40- or 64-character Git commit SHA.');
  }

  return sourceSha;
}
