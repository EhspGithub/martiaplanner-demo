/**
 * MartiaPlanner — Automated Vite Single-File Bundler
 * Compiles the entire React + Tailwind + SQLite offline fallback app
 * into a single self-contained HTML file (MartiaPlanner-vX.Y.Z.html)
 * with all CSS and JS inlined, running in any browser without needing a server.
 */
import { build } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildSingleFile() {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version || '1.2.0';
  const outputFileName = `MartiaPlanner-v${version}.html`;

  console.log(`📦 شروع ساخت پکیج تک‌فایل HTML برای MartiaPlanner نسخه ${version}...`);

  // Clean any previous single-file HTML bundles from root and public/ to prevent stale version files
  for (const dir of [rootDir, path.join(rootDir, 'public')]) {
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (/^MartiaPlanner-v[\d.]+\.html$/i.test(f)) {
          fs.unlinkSync(path.join(dir, f));
        }
      }
    }
  }

  // 1. Run Vite single-chunk build into temporary dist-singlefile (preserving lazy chunks in dist/)
  const singleDistDir = path.join(rootDir, 'dist-singlefile');
  try {
    await build({
      configFile: path.join(rootDir, 'vite.config.ts'),
      root: rootDir,
      build: {
        outDir: singleDistDir,
        emptyOutDir: true,
        cssCodeSplit: false,
        rolldownOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    });

    const distHtmlPath = path.join(singleDistDir, 'index.html');
    if (!fs.existsSync(distHtmlPath)) {
      throw new Error('فایل dist-singlefile/index.html ایجاد نشد.');
    }

    const distHtml = fs.readFileSync(distHtmlPath, 'utf-8');
    const assetsDir = path.join(singleDistDir, 'assets');
    const assetFiles = fs.readdirSync(assetsDir);

    const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));
    const cssFiles = assetFiles.filter((f) => f.endsWith('.css'));

    let combinedCss = '';
    for (const cf of cssFiles) {
      combinedCss += fs.readFileSync(path.join(assetsDir, cf), 'utf-8') + '\n';
    }

    let combinedJs = '';
    for (const jf of jsFiles) {
      combinedJs += fs.readFileSync(path.join(assetsDir, jf), 'utf-8') + '\n';
    }

    // Escape any literal </script> inside bundled JS to prevent breaking HTML parser
    const safeJs = combinedJs.replace(/<\/script/gi, '<\\/script');

    // Strip external CSS/JS references + PWA manifest/SW registration (which break on file:// or content://)
    let inlinedHtml = distHtml
      .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
      .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi, '')
      .replace(/<script[^>]+vite-plugin-pwa:register-sw[^>]*><\/script>/gi, '')
      .replace(/<script[^>]+src=["'][^"']*registerSW\.js["'][^>]*><\/script>/gi, '')
      .replace(/<script[^>]+type=["']module["'][^>]*><\/script>/gi, '');

    // Mark explicit single-file mode + inject inlined CSS before </head>
    const singleFileFlagScript = `<script>window.__MARTIA_SINGLEFILE_MODE__ = true;</script>`;
    const styleTag = `${singleFileFlagScript}\n<style id="martia-bundle-styles">\n${combinedCss}\n</style>`;
    const headParts = inlinedHtml.split('</head>');
    inlinedHtml = headParts[0] + styleTag + '\n</head>' + headParts.slice(1).join('</head>');

    // Inject inlined JS before </body> safely without String.replace dollar expansion
    const scriptTag = `<script type="module" id="martia-bundle-script">\n${safeJs}\n</script>`;
    const bodyParts = inlinedHtml.split('</body>');
    inlinedHtml = bodyParts[0] + scriptTag + '\n</body>' + bodyParts.slice(1).join('</body>');

    // Ensure dist/ also exists before writing singlefile copy
    if (!fs.existsSync(path.join(rootDir, 'dist'))) {
      fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });
    }

    // Save to project root, public/, and dist/
    const rootOutputPath = path.join(rootDir, outputFileName);
    const publicOutputPath = path.join(rootDir, 'public', outputFileName);
    const distOutputPath = path.join(rootDir, 'dist', outputFileName);

    fs.writeFileSync(rootOutputPath, inlinedHtml, 'utf-8');
    fs.writeFileSync(publicOutputPath, inlinedHtml, 'utf-8');
    fs.writeFileSync(distOutputPath, inlinedHtml, 'utf-8');

    const stats = fs.statSync(rootOutputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`✨ عملیات با موفقیت انجام شد!`);
    console.log(`📄 نام فایل خروجی: ${outputFileName} (تعداد چانک JS: ${jsFiles.length})`);
    console.log(`📊 حجم پکیج نهایی: ${sizeKb} کیلوبایت (${sizeMb} مگابایت)`);
    console.log(`📁 مسیرهای ذخیره‌شده:`);
    console.log(`   - ${rootOutputPath}`);
    console.log(`   - ${publicOutputPath}`);
    console.log(`   - ${distOutputPath}`);
  } finally {
    if (fs.existsSync(singleDistDir)) {
      fs.rmSync(singleDistDir, { recursive: true, force: true });
    }
  }
}

buildSingleFile().catch((err) => {
  console.error('❌ خطا در ساخت بسته تک‌فایل:', err);
  process.exit(1);
});
