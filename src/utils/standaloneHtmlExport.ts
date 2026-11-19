/**
 * MartiaPlanner — Standalone Portable HTML Exporter & Downloader
 *
 * Solves the Cloud Run / AI Studio hosting proxy cookie interstitial bug:
 * Static <a href="/MartiaPlanner-vX.Y.Z.html" download> links cause Android/Chrome's
 * external DownloadManager to request the file without the active session cookie,
 * returning a 3KB error page ("Action required to load your app... security cookie").
 *
 * Furthermore, in some mobile browsers or iframe environments, static `.html` requests
 * can hit cached proxy interstitials.
 *
 * Multi-Stage Resilient Strategy:
 * 1. If already running inside standalone Single-File HTML, clone the active DOM bundle directly.
 * 2. Request `GET /api/standalone-html` (JSON API endpoint with `credentials: 'include'` and
 *    `cache: 'no-store'`), which is never treated as a static HTML navigation by the hosting proxy.
 * 3. Fallback to `GET /MartiaPlanner-vX.Y.Z.html?dl=timestamp` with `credentials: 'include'`.
 * 4. Fallback to dynamically assembling a self-contained Single-File HTML from the currently
 *    loaded CSS stylesheets and module scripts in the active browser DOM.
 * 5. Optionally embeds the user's complete database snapshot inside the HTML file
 *    (`Portable App + Current Data`) so it opens anywhere completely offline with all user records.
 */

import { APP_VERSION } from '../version.ts';
import { api } from '../services/api.ts';

export interface StandaloneDownloadResult {
  fileName: string;
  sizeBytes: number;
  includedData: boolean;
}

function isValidSingleFileBundle(html: string | null | undefined): html is string {
  if (!html || typeof html !== 'string') return false;
  return (
    html.includes('id="martia-bundle-script"') &&
    html.includes('<div id="root"></div>')
  );
}

function buildInlineSnapshotHtml(): string | null {
  if (typeof document === 'undefined') return null;
  const styleEl = document.getElementById('martia-bundle-styles');
  const scriptEl = document.getElementById('martia-bundle-script');
  if (!styleEl || !scriptEl) return null;

  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>MartiaPlanner v${APP_VERSION} — سامانه مدیریت مطالعه دانش‌آموزی (آفلاین)</title>
    <script>window.__MARTIA_SINGLEFILE_MODE__ = true;</script>
    <style id="martia-bundle-styles">\n${styleEl.textContent || ''}\n</style>
  </head>
  <body class="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
    <div id="root"></div>
    <script type="module" id="martia-bundle-script">\n${scriptEl.textContent || ''}\n</script>
  </body>
</html>`;
}

function sanitizeSingleFileHtml(html: string): string {
  return html
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi, '')
    .replace(/<script[^>]+vite-plugin-pwa:register-sw[^>]*><\/script>/gi, '')
    .replace(/<script[^>]+registerSW\.js[^>]*><\/script>/gi, '');
}

function injectEmbeddedDataIntoHtml(html: string, backupPayload: any): string {
  const cleanedHtml = html
    .replace(/<script[^>]+id=["']martia-embedded-backup["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+id=["']martia-embedded-backup-init["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const safeJson = JSON.stringify(backupPayload).replace(/<\/script/gi, '<\\/script');
  const embeddedTags = `<script id="martia-embedded-backup" type="application/json">${safeJson}</script>
<script id="martia-embedded-backup-init">try{window.__MARTIA_SINGLEFILE_MODE__=true;var el=document.getElementById('martia-embedded-backup');if(el&&el.textContent){window.__MARTIA_EMBEDDED_BACKUP__=JSON.parse(el.textContent);}}catch(e){}</script>`;

  if (cleanedHtml.includes('<script type="module" id="martia-bundle-script"')) {
    return cleanedHtml.replace(
      '<script type="module" id="martia-bundle-script"',
      `${embeddedTags}\n<script type="module" id="martia-bundle-script"`
    );
  }
  if (cleanedHtml.includes('</body>')) {
    return cleanedHtml.replace('</body>', `${embeddedTags}\n</body>`);
  }
  return `${cleanedHtml}\n${embeddedTags}`;
}

export async function downloadStandaloneAppHtml(options?: {
  includeUserData?: boolean;
}): Promise<StandaloneDownloadResult> {
  const includeUserData = Boolean(options?.includeUserData);
  let htmlContent: string | null = null;

  // Stage 1: If already running inside standalone Single-File HTML, clone directly from DOM
  htmlContent = buildInlineSnapshotHtml();

  // Stage 2: Fetch via JSON API endpoint `/api/standalone-html` (immune to HTML proxy cookie interstitials)
  if (!isValidSingleFileBundle(htmlContent) && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    try {
      const apiRes = await fetch(`/api/standalone-html?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });
      if (apiRes.ok) {
        const contentType = apiRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await apiRes.json();
          if (data && data.ok && isValidSingleFileBundle(data.html)) {
            htmlContent = data.html;
          }
        }
      }
    } catch {
      // Proceed to Stage 3 fallback
    }
  }

  // Stage 3: Fetch static bundle with cache-busting query and credentials: 'include'
  if (!isValidSingleFileBundle(htmlContent) && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    const candidateUrls = [
      `/MartiaPlanner-v${APP_VERSION}.html?dl=${Date.now()}`,
      `./MartiaPlanner-v${APP_VERSION}.html?dl=${Date.now()}`,
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'text/html,*/*' },
        });
        if (res.ok) {
          const text = await res.text();
          if (isValidSingleFileBundle(text)) {
            htmlContent = text;
            break;
          }
        }
      } catch {
        // Try next candidate URL
      }
    }
  }

  if (!isValidSingleFileBundle(htmlContent)) {
    throw new Error(
      'دریافت بسته تک‌فایل HTML با مشکل شبکه مواجه شد. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً روی دکمه دانلود کلیک کنید.'
    );
  }

  htmlContent = sanitizeSingleFileHtml(htmlContent);

  if (includeUserData) {
    const backupPayload = await api.exportBackup();
    htmlContent = injectEmbeddedDataIntoHtml(htmlContent, backupPayload);
  }

  const fileName = includeUserData
    ? `MartiaPlanner-v${APP_VERSION}-Portable-WithData.html`
    : `MartiaPlanner-v${APP_VERSION}.html`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 5000);

  return {
    fileName,
    sizeBytes: blob.size,
    includedData: includeUserData,
  };
}
