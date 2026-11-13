/**
 * MartiaPlanner — GitHub Repository Sync & Semantic Versioning Service
 * Pushes all project files (including Tauri 2 Rust/Android configuration, SQLite backend, and React RTL frontend)
 * directly to the user's `MartiaPlanner` repository on GitHub via the GitHub Git Data Trees API,
 * while synchronizing version numbers across package.json, tauri.conf.json, Cargo.toml, and src/version.ts.
 */
import fs from 'fs';
import path from 'path';
import { APP_VERSION } from '../version.ts';

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'data',
  'target',
  '.aistudio',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  '.DS_Store',
  'martia_planner.sqlite',
  'martia_planner.sqlite-shm',
  'martia_planner.sqlite-wal',
]);

function syncVersionFilesInWorkspace(workspaceRoot: string, rawVersion: string): string {
  const cleanVersion = rawVersion.replace(/^v/i, '').trim() || APP_VERSION;

  // 1. Update package.json
  const pkgPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkg.version = cleanVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    } catch {}
  }

  // 2. Update src-tauri/tauri.conf.json
  const tauriConfPath = path.join(workspaceRoot, 'src-tauri', 'tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    try {
      const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
      tauriConf.version = cleanVersion;
      fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf-8');
    } catch {}
  }

  // 3. Update src-tauri/Cargo.toml
  const cargoPath = path.join(workspaceRoot, 'src-tauri', 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    try {
      const cargoContent = fs.readFileSync(cargoPath, 'utf-8');
      const updatedCargo = cargoContent.replace(
        /^version\s*=\s*"[^"]*"/m,
        `version = "${cleanVersion}"`
      );
      fs.writeFileSync(cargoPath, updatedCargo, 'utf-8');
    } catch {}
  }

  // 4. Update src/version.ts
  const versionTsPath = path.join(workspaceRoot, 'src', 'version.ts');
  if (fs.existsSync(versionTsPath)) {
    try {
      const vContent = fs.readFileSync(versionTsPath, 'utf-8');
      const updatedV = vContent.replace(
        /export const APP_VERSION = '[^']*';/,
        `export const APP_VERSION = '${cleanVersion}';`
      );
      fs.writeFileSync(versionTsPath, updatedV, 'utf-8');
    } catch {}
  }

  return cleanVersion;
}

function collectProjectFiles(dirPath: string, baseDir: string): Array<{ relativePath: string; fullPath: string }> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: Array<{ relativePath: string; fullPath: string }> = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (relativePath === 'public/assets' || relativePath.startsWith('public/assets/')) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...collectProjectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      if (stat.size <= 2 * 1024 * 1024) {
        results.push({ relativePath, fullPath });
      }
    }
  }
  return results;
}

export interface GitHubPushOptions {
  token: string;
  repoName: string; // e.g., "MartiaPlanner" or "username/MartiaPlanner"
  version?: string; // e.g., "1.2.1"
  commitMessage?: string;
  isPrivate?: boolean;
  createTag?: boolean;
}

export interface GitHubPushResult {
  success: boolean;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  version: string;
  releaseTag: string;
  filesCount: number;
  commitSha: string;
  createdNewRepo: boolean;
}

async function githubFetch(url: string, token: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'MartiaPlanner-Builder/1.1',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

export async function pushWorkspaceToGitHub(options: GitHubPushOptions): Promise<GitHubPushResult> {
  const { token } = options;
  if (!token || !token.trim()) {
    throw new Error('توکن دسترسی گیت‌هاب (GitHub Token) وارد نشده است.');
  }

  const workspaceRoot = process.cwd();
  const syncedVersion = syncVersionFilesInWorkspace(workspaceRoot, options.version || APP_VERSION);
  const releaseTag = `v${syncedVersion}`;
  const rawMsg =
    options.commitMessage?.trim() ||
    'feat: update MartiaPlanner (Tauri 2 + React + SQLite)';
  const finalCommitMessage = rawMsg.includes(releaseTag)
    ? rawMsg
    : `release(${releaseTag}): ${rawMsg}`;

  // 1. Verify authenticated user
  const userRes = await githubFetch('https://api.github.com/user', token);
  if (!userRes.ok) {
    throw new Error(
      `خطا در احراز هویت گیت‌هاب (${userRes.status}): توکن معتبر نیست یا دسترسی repo ندارد.`
    );
  }
  const username: string = userRes.data.login;

  // Parse owner & repo
  let owner = username;
  let repo = (options.repoName || 'MartiaPlanner').trim();
  if (repo.includes('/')) {
    const parts = repo.split('/').filter(Boolean);
    owner = parts[0];
    repo = parts[1] || 'MartiaPlanner';
  }

  // 2. Check if repository exists; if not, create it automatically
  let createdNewRepo = false;
  let repoRes = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`, token);

  if (repoRes.status === 404) {
    const createRes = await githubFetch('https://api.github.com/user/repos', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repo,
        description:
          'MartiaPlanner — سامانه مدیریت مطالعه و برنامه‌ریزی روزانه دانش‌آموز (Tauri 2 + React + SQLite)',
        private: Boolean(options.isPrivate),
        auto_init: true,
      }),
    });

    if (!createRes.ok) {
      throw new Error(
        `توکن گیت‌هاب شما فاقد دسترسی «repo» است (خطای ${createRes.status}). لطفاً در تنظیمات توکن گیت‌هاب، تیک گزینه «repo» را فعال کنید.`
      );
    }
    createdNewRepo = true;
    repoRes = createRes;
    await new Promise((r) => setTimeout(r, 1200));
  } else if (!repoRes.ok) {
    throw new Error(`خطا در بررسی مخزن ${owner}/${repo}: ${repoRes.data?.message || repoRes.status}`);
  }

  const defaultBranch: string = repoRes.data?.default_branch || 'main';

  // 3. Ensure repository is initialized
  let refRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    token
  );

  if (refRes.status === 404 || refRes.status === 409) {
    const initReadme = Buffer.from(
      '# MartiaPlanner\nسامانه هوشمند مدیریت مطالعه و فعالیت‌های روزانه دانش‌آموز (Tauri 2 + React + SQLite)\n',
      'utf-8'
    ).toString('base64');

    const putRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'chore: initial repository bootstrap',
          content: initReadme,
          branch: defaultBranch,
        }),
      }
    );

    if (!putRes.ok) {
      throw new Error(
        `مخزن خالی است و مقداردهی اولیه آن با خطا مواجه شد: ${putRes.data?.message || putRes.status}`
      );
    }

    await new Promise((r) => setTimeout(r, 800));
    refRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
      token
    );
  }

  if (!refRes.ok) {
    throw new Error(
      `خطا در دریافت شاخه ${defaultBranch} از مخزن: ${refRes.data?.message || refRes.status}`
    );
  }

  const latestCommitSha: string = refRes.data.object.sha;

  // 4. Collect all project files and create Git blobs/tree entries
  const files = collectProjectFiles(workspaceRoot, workspaceRoot);

  const treeItems: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha?: string;
    content?: string;
  }> = [];

  for (const file of files) {
    const buffer = fs.readFileSync(file.fullPath);
    const isBinary = buffer.includes(0);
    if (isBinary) {
      const blobRes = await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: buffer.toString('base64'),
            encoding: 'base64',
          }),
        }
      );
      if (blobRes.ok && blobRes.data?.sha) {
        treeItems.push({
          path: file.relativePath,
          mode: '100644',
          type: 'blob',
          sha: blobRes.data.sha,
        });
      }
    } else {
      treeItems.push({
        path: file.relativePath,
        mode: '100644',
        type: 'blob',
        content: buffer.toString('utf-8'),
      });
    }
  }

  // 5. Create clean Tree matching current workspace files (removes stale HTML versions and preview files)
  let treeRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tree: treeItems,
      }),
    }
  );

  if (!treeRes.ok) {
    const nonWorkflowItems = treeItems.filter((item) => !item.path.startsWith('.github/workflows/'));
    treeRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: latestCommitSha,
          tree: nonWorkflowItems,
        }),
      }
    );
  }

  if (!treeRes.ok) {
    throw new Error(`خطا در ساخت درخت فایل‌ها در گیت‌هاب: ${treeRes.data?.message || treeRes.status}`);
  }

  // 6. Create Commit
  const commitRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: finalCommitMessage,
        tree: treeRes.data.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!commitRes.ok) {
    throw new Error(`خطا در ثبت کامیت در گیت‌هاب: ${commitRes.data?.message || commitRes.status}`);
  }

  // 7. Update branch reference (fast-forward only, no force push)
  const updateRefRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
    token,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sha: commitRes.data.sha,
        force: false,
      }),
    }
  );

  if (!updateRefRes.ok) {
    throw new Error(
      `خطا در به‌روزرسانی شاخه ${defaultBranch}: ${updateRefRes.data?.message || updateRefRes.status}`
    );
  }

  // 8. Only create Git Tag ref if explicitly requested for a Release
  if (options.createTag) {
    const tagRefRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${releaseTag}`,
      token
    );
    if (!tagRefRes.ok) {
      await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ref: `refs/tags/${releaseTag}`,
            sha: commitRes.data.sha,
          }),
        }
      );
    }
  }

  return {
    success: true,
    repoUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    branch: defaultBranch,
    version: syncedVersion,
    releaseTag,
    filesCount: treeItems.length,
    commitSha: commitRes.data.sha,
    createdNewRepo,
  };
}
