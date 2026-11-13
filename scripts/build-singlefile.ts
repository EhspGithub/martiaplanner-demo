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

  // 1. Run Vite build into dist
  await build({
    configFile: path.join(rootDir, 'vite.config.ts'),
    root: rootDir,
    build: {
      outDir: path.join(rootDir, 'dist'),
      emptyOutDir: true,
      cssCodeSplit: false,
    },
  });

  const distHtmlPath = path.join(rootDir, 'dist', 'index.html');
  if (!fs.existsSync(distHtmlPath)) {
    throw new Error('فایل dist/index.html ایجاد نشد.');
  }

  const distHtml = fs.readFileSync(distHtmlPath, 'utf-8');
  const assetsDir = path.join(rootDir, 'dist', 'assets');
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

  // Strip external CSS/JS references from dist HTML
  let inlinedHtml = distHtml
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']module["'][^>]*><\/script>/gi, '');

  // Inject inlined CSS before </head> safely without String.replace dollar expansion
  const styleTag = `<style id="martia-bundle-styles">\n${combinedCss}\n</style>`;
  const headParts = inlinedHtml.split('</head>');
  inlinedHtml = headParts[0] + styleTag + '\n</head>' + headParts.slice(1).join('</head>');

  // Inject inlined JS before </body> safely without String.replace dollar expansion
  const scriptTag = `<script type="module" id="martia-bundle-script">\n${safeJs}\n</script>`;
  const bodyParts = inlinedHtml.split('</body>');
  inlinedHtml = bodyParts[0] + scriptTag + '\n</body>' + bodyParts.slice(1).join('</body>');

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
  console.log(`📄 نام فایل خروجی: ${outputFileName}`);
  console.log(`📊 حجم پکیج نهایی: ${sizeKb} کیلوبایت (${sizeMb} مگابایت)`);
  console.log(`📁 مسیرهای ذخیره‌شده:`);
  console.log(`   - ${rootOutputPath}`);
  console.log(`   - ${publicOutputPath}`);
  console.log(`   - ${distOutputPath}`);
}

buildSingleFile().catch((err) => {
  console.error('❌ خطا در ساخت بسته تک‌فایل:', err);
  process.exit(1);
});
