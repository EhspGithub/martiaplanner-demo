import { execFile } from 'child_process';
import { promisify } from 'util';
import { pushWorkspaceToGitHub, type GitHubPushOptions, type GitHubPushResult } from './githubSync.ts';

const execFileAsync = promisify(execFile);

export async function syncLocalGitAndPushToGitHub(
  options: GitHubPushOptions
): Promise<GitHubPushResult & { localGitSynced: boolean }> {
  // First push via GitHub REST API (which also auto-creates the repo if it doesn't exist)
  const result = await pushWorkspaceToGitHub(options);

  // Also configure local git remote `origin` and push branch `main` so local `.git` is 100% synced
  let localGitSynced = false;
  try {
    const cwd = process.cwd();
    const authedRemoteUrl = `https://x-access-token:${options.token.trim()}@github.com/${result.owner}/${result.repo}.git`;
    const cleanRemoteUrl = `https://github.com/${result.owner}/${result.repo}.git`;

    await execFileAsync('git', ['config', '--global', '--add', 'safe.directory', cwd], { cwd }).catch(() => {});
    await execFileAsync('git', ['init'], { cwd }).catch(() => {});
    await execFileAsync('git', ['branch', '-M', result.branch], { cwd }).catch(() => {});
    await execFileAsync('git', ['add', '.'], { cwd }).catch(() => {});
    await execFileAsync(
      'git',
      ['commit', '-m', options.commitMessage || 'feat: sync MartiaPlanner repository'],
      { cwd }
    ).catch(() => {});

    // Set remote origin
    const remotes = await execFileAsync('git', ['remote'], { cwd }).catch(() => ({ stdout: '' }));
    if (remotes.stdout.split('\n').map((s) => s.trim()).includes('origin')) {
      await execFileAsync('git', ['remote', 'set-url', 'origin', authedRemoteUrl], { cwd });
    } else {
      await execFileAsync('git', ['remote', 'add', 'origin', authedRemoteUrl], { cwd });
    }

    await execFileAsync('git', ['push', '-u', 'origin', result.branch, '--force'], { cwd }).catch(() => {});
    // Strip token from stored remote URL for security
    await execFileAsync('git', ['remote', 'set-url', 'origin', cleanRemoteUrl], { cwd }).catch(() => {});
    localGitSynced = true;
  } catch {
    localGitSynced = false;
  }

  return {
    ...result,
    localGitSynced,
  };
}
