import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  Award,
  Activity,
  BarChart2,
  Brain,
  ShieldAlert,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Scale,
  Library,
  ChevronLeft,
  ArrowUp,
  Lightbulb,
  Info,
  HelpCircle,
  Target,
  Zap,
  Clock,
  Sliders,
  Download,
  Printer,
  Eye,
  X,
} from 'lucide-react';

const MathFormula: React.FC<{ tex: string; inline?: boolean; className?: string }> = ({
  tex,
  inline = false,
  className = '',
}) => {
  const cleaned = tex
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\bar\{([^}]*)\}/g, '$1̄')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Sigma|\\sum/g, 'Σ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\ge/g, '≥')
    .replace(/\\le/g, '≤')
    .replace(/\\times/g, '×')
    .replace(/\\dots/g, '…')
    .replace(/\\in/g, '∈')
    .replace(/\\;/g, ' ')
    .replace(/\\,/g, ' ')
    .replace(/\\%/g, '%')
    .replace(/\\{/g, '{')
    .replace(/\\}/g, '}');

  if (inline) {
    return (
      <code
        dir="ltr"
        className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800/90 border border-slate-700 font-mono text-[11px] font-bold text-amber-300 ${className}`}
      >
        {cleaned}
      </code>
    );
  }

  return (
    <code
      dir="ltr"
      className={`inline-block px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-emerald-300 ${className}`}
    >
      {cleaned}
    </code>
  );
};

interface ChapterMeta {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badgeColor: string;
}

const CHAPTERS: ChapterMeta[] = [
  {
    id: 'chapter-1-multidimensional',
    number: 'فصل اول',
    title: 'چرا به یک نظام ارزیابی چندبعدی نیاز داریم؟',
    subtitle: 'عبور از خطای «ساعت‌محوری صرف» و طراحی معماری ۷ بُعدی سنجش یادگیری',
    icon: <Layers className="w-4 h-4 text-indigo-400" />,
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'chapter-2-indicators-philosophy',
    number: 'فصل دوم',
    title: 'منطق انتخاب شاخص‌ها و فلسفه هرکدام',
    subtitle: 'کالبدشکافی کامل ۵ خانواده شاخص‌ها بر اساس ۷ پرسش بنیادین طراحی',
    icon: <Compass className="w-4 h-4 text-emerald-400" />,
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'chapter-3-continuity-penalty',
    number: 'فصل سوم',
    title: 'استمرار، وقفه و منطق کسر امتیاز',
    subtitle: 'فلسفه ضد اهمال‌کاری، تفکیک روز استراحت مجاز از تعهد رهاشده و سقف‌های ایمنی روانی',
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  {
    id: 'chapter-4-subject-specific',
    number: 'فصل چهارم',
    title: 'ارزیابی اختصاصی هر درس؛ چرا عملکرد کلی کافی نیست؟',
    subtitle: 'پدیده پوشانندگی بین‌درسی (Inter-Subject Masking) و پایش استمرار مستقل هر درس',
    icon: <Target className="w-4 h-4 text-amber-400" />,
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'chapter-5-velocity-trends',
    number: 'فصل پنجم',
    title: 'سرعت کسب XP و روند پیشرفت هفتگی',
    subtitle: 'نرخ ترکیبی سه لایه (تقویمی، فعال، میانگین پیراسته) و پیش‌بینی واقع‌بینانه صعود',
    icon: <TrendingUp className="w-4 h-4 text-cyan-400" />,
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'chapter-6-xp-educational-alignment',
    number: 'فصل ششم',
    title: 'هم‌سنجی XP با رشد واقعی تحصیلی',
    subtitle: 'کشف «رشد ظاهری و تورم امتیاز» و تفکیک شاخص عملیاتی E از سنجش‌های بیرونی',
    icon: <Scale className="w-4 h-4 text-purple-400" />,
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  {
    id: 'chapter-7-statistical-logic',
    number: 'فصل هفتم',
    title: 'منطق آماری پشت شاخص‌ها',
    subtitle: 'بررسی ۱۱ ابزار ریاضی و آماری به‌کاررفته در موتور تحلیلی، مزایا و محدودیت‌ها',
    icon: <BarChart2 className="w-4 h-4 text-blue-400" />,
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'chapter-8-psychological-analysis',
    number: 'فصل هشتم',
    title: 'تحلیل روان‌شناختی نظام پاداش و انگیزش',
    subtitle: 'نظریه خودتعیین‌گری (SDT)، خودتنظیمی زیمرمن، سنجش درون‌فردی و مهار اضطراب تنزل',
    icon: <Brain className="w-4 h-4 text-pink-400" />,
    badgeColor: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  },
  {
    id: 'chapter-9-critical-review',
    number: 'فصل نهم',
    title: 'ارزیابی انتقادی سیستم و پیشنهادهای اصلاحی',
    subtitle: 'نقد علمی ۱۰ چالش معماری فعلی و نقشه راه ارتقا در ۳ سطح عملیاتی',
    icon: <Sliders className="w-4 h-4 text-orange-400" />,
    badgeColor: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  {
    id: 'chapter-10-conclusion-references',
    number: 'فصل دهم',
    title: 'جمع‌بندی، فلسفه نهایی Martia Planner و منابع علمی',
    subtitle: 'بیانیه معماری کلان برنامه و فهرست مراجع معتبر روان‌شناسی تربیتی و علوم شناختی',
    icon: <Library className="w-4 h-4 text-teal-400" />,
    badgeColor: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
];

interface EvaluationPhilosophyArticleProps {
  onSwitchToDefinitionsTab?: () => void;
  onNavigateToDefinition?: (definitionId: string) => void;
  onNavigateToCoefficient?: (coeffKey: string) => void;
}

export const EvaluationPhilosophyArticle: React.FC<EvaluationPhilosophyArticleProps> = ({
  onSwitchToDefinitionsTab,
  onNavigateToDefinition,
}) => {
  const [activeChapterId, setActiveChapterId] = useState<string>(CHAPTERS[0].id);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState<boolean>(false);
  const [standaloneHtmlContent, setStandaloneHtmlContent] = useState<string>('');

  const scrollToChapter = (id: string) => {
    setActiveChapterId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    const topEl = document.getElementById('philosophy-article-top');
    if (topEl) {
      topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const buildStandaloneArticleHtml = (): string => {
    const container = document.getElementById('martia-evaluation-philosophy-article');
    if (!container) return '';

    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-export-btn').forEach((el) => el.remove());

    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>فلسفه علمی و روان‌شناختی نظام ارزیابی، انگیزش و سنجش پیشرفت تحصیلی در Martia Planner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
  <style>
    body {
      font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #020617;
      color: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    html {
      scroll-behavior: smooth;
    }
    @media print {
      body {
        background-color: #020617 !important;
        color: #f8fafc !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      section {
        break-inside: avoid-page;
        margin-bottom: 16px !important;
      }
    }
  </style>
</head>
<body>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 border border-indigo-500/30 rounded-2xl px-4 py-3 shadow-lg sticky top-3 z-50 backdrop-blur-md">
      <div class="text-xs sm:text-sm font-black text-indigo-300">
        نسخه مستقل رساله علمی ۱۰ فصلی — Martia Planner
      </div>
      <button
        onclick="window.print()"
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-colors cursor-pointer"
      >
        <span>چاپ / ذخیره به صورت PDF</span>
      </button>
    </div>
    <div id="philosophy-article-top" class="space-y-6">
      ${clone.innerHTML}
    </div>
  </div>
  <script>
    document.querySelectorAll('[data-chapter-target]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetId = btn.getAttribute('data-chapter-target');
        var el = targetId ? document.getElementById(targetId) : null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    document.querySelectorAll('[data-scroll-top]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var topEl = document.getElementById('philosophy-article-top');
        if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  </script>
</body>
</html>`;
  };

  const handleDownloadStandaloneArticle = () => {
    const htmlContent = buildStandaloneArticleHtml();
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MartiaPlanner-Evaluation-Philosophy-Article.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenHtmlPreview = () => {
    const htmlContent = buildStandaloneArticleHtml();
    if (!htmlContent) return;
    setStandaloneHtmlContent(htmlContent);
    setIsHtmlModalOpen(true);
  };

  const handlePrintArticle = () => {
    const htmlContent = buildStandaloneArticleHtml();
    if (!htmlContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 650);
  };

  return (
    <div id="philosophy-article-top" className="space-y-4 pb-12" dir="rtl">
      {/* Top Action Bar (Matching Definitions Tab Poster & Table Controls) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold">
            <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span>خروجی مستقل و قابل چاپ رساله ۱۰ فصلی فلسفه علمی و روان‌شناختی</span>
          </div>

          <button
            type="button"
            onClick={handleOpenHtmlPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>مشاهده و پیش‌نمایش HTML</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadStandaloneArticle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>دانلود فایل مقاله (HTML)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintArticle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* Standalone HTML Viewer & Download Modal */}
      {isHtmlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:hidden">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    پیش‌نمایش زنده و دانلود فایل مستقل HTML رساله فلسفه ارزیابی
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    شامل هر ۱۰ فصل تحلیلی، فهرست تعاملی فصول، فرمول‌ها و منابع علمی — آماده مطالعه آفلاین و چاپ
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadStandaloneArticle}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل HTML مستقل</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintArticle}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHtmlModalOpen(false)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>بستن</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden">
              <iframe
                title="پیش‌نمایش رساله فلسفه علمی و روان‌شناختی در قالب HTML"
                srcDoc={standaloneHtmlContent}
                className="w-full h-full rounded-2xl border border-slate-800 bg-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Exportable Article Container */}
      <div id="martia-evaluation-philosophy-article" className="space-y-6">
        {/* Hero Banner & Treatise Header */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>مرجع علمی، آماری و روان‌شناختی (۱۰ فصل تحلیلی)</span>
              </div>

              {onSwitchToDefinitionsTab && (
                <button
                  onClick={onSwitchToDefinitionsTab}
                  className="no-export-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>انتقال به تب تعاریف، فرمول‌ها و جدول جامع</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-snug">
            فلسفه علمی و روان‌شناختی نظام ارزیابی، انگیزش و سنجش پیشرفت تحصیلی در Martia Planner
          </h1>
          <p className="text-sm sm:text-base font-bold text-indigo-300/90 leading-relaxed">
            از اندازه‌گیری عملکرد روزانه تا ارزیابی استمرار، عمق یادگیری و رشد واقعی تحصیلی
          </p>

          <p className="text-xs sm:text-sm text-slate-300 leading-7 text-justify pt-2 border-t border-slate-800/80">
            این نوشتار، سند مرجع معماری تحلیلی و انگیزشی برنامه <strong className="text-white">Martia Planner</strong> است. برخلاف راهنماهای فنیِ صرف که تنها به بیان «فرمولِ محاسبه» بسنده می‌کنند، هدف این مقاله پاسخ به پرسش <strong className="text-indigo-300">«چرا؟»</strong> است: چرا ارزیابی تک‌بعدی (صرفاً ساعت مطالعه یا تعداد تست) دانش‌آموز را به بیراهه می‌برد؟ هر شاخص دقیقاً چه بُعدی از رفتار شناختی و فراشناختی یادگیرنده را می‌سنجد؟ ضرایب تشویق و کسر امتیاز بر چه مبنای روان‌شناختی و آماری استوار شده‌اند و کجا باید میان «امتیاز انگیزشی (XP)» و «پیشرفت واقعی تحصیلی» مرز قائل شد؟
          </p>

          {/* 3-Layer Epistemological Separation Legend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-emerald-300 mb-1">الف) منطق محاسباتی واقعی برنامه</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  آنچه هم‌اکنون در موتور محاسباتی (کد واقعی برنامه) پیاده‌سازی شده و نمرات، سطوح و هشدارها را تولید می‌کند.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-indigo-300 mb-1">ب) مبانی علمی، آماری و روان‌شناختی</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  پشتوانه نظری در روان‌شناسی تربیتی، علوم شناختی و آمار توصیفی/مقاوم که چرایی انتخاب هر فرمول را تبیین می‌کند.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 mb-1">ج) نقد علمی و پیشنهادهای اصلاحی</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  مرزهای محدودیت مدل فعلی و راهکارهای ارتقای سیستم در نسخه‌های آینده، بدون تغییر پنهانی در فرمول‌های جاری.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Table of Contents (TOC) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm sm:text-base font-black text-white">
              فهرست تعاملی فصول ده‌گانه مقاله (کلیک برای پرش سریع به هر فصل)
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            ۱۰ فصل + پیوست منابع
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {CHAPTERS.map((chap) => {
            const isActive = activeChapterId === chap.id;
            return (
              <button
                key={chap.id}
                data-chapter-target={chap.id}
                onClick={() => scrollToChapter(chap.id)}
                className={`text-right p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/60 border-indigo-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/90 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                  {chap.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${chap.badgeColor}`}>
                      {chap.number}
                    </span>
                    <span className="text-xs font-black text-white truncate">{chap.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{chap.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CHAPTER 1: چرا به یک نظام ارزیابی چندبعدی نیاز داریم؟ */}
      {/* ===================================================================== */}
      <section
        id="chapter-1-multidimensional"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black">
              فصل اول
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              چرا به یک نظام ارزیابی چندبعدی نیاز داریم؟
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <p>
            در اغلب سیستم‌های سنتی برنامه‌ریزی تحصیلی، عملکرد دانش‌آموز تنها با یک متغیر خام سنجیده می‌شود: <strong className="text-white">«امروز چند ساعت درس خواندی؟»</strong> یا در حالت کمی پیشرفته‌تر، <strong className="text-white">«امروز چند تست زدی؟»</strong>. در روان‌شناسی تربیتی و علوم شناختی، این تقلیل‌گرایی را <strong className="text-rose-300">«مغالطه کمیت‌زدگی» (Quantification Fallacy)</strong> می‌نامند. زمانی که یک سیستم تنها ساعت حضور فیزیکی پشت میز را پاداش می‌دهد، یادگیرنده به‌طور ناخودآگاه به سمت رفتارهای شبه‌مطالعه (مطالعه سطحی بدون تمرکز، روزنامه‌خوانی مطالب ساده، یا ثبت ساعات طولانی بدون حل تمرین چالشی) سوق پیدا می‌کند؛ پدیده‌ای که در اقتصاد رفتاری به <strong className="text-amber-300">قانون گودهارت (Goodhart’s Law)</strong> شهرت دارد: <em>«هرگاه یک سنجهٔ خام به هدفِ نهایی تبدیل شود، دیگر سنجهٔ معتبری برای سنجش واقعیت نخواهد بود.»</em>
          </p>

          <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-black text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>سه آسیب بزرگ ارزیابی تک‌بعدی (ساعت‌محور یا تست‌محورِ صرف):</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 pr-2">
              <li>
                <strong className="text-white">توهم شایستگی (Illusion of Competence):</strong> دانش‌آموز ۸ ساعت کتاب را روخوانی می‌کند، احساس خستگی و تلاش فراوان دارد، اما چون بازیابی فعال (Active Recall) و حل تمرین نداشته، در جلسه آزمون دچار فراموشی می‌شود.
              </li>
              <li>
                <strong className="text-white">فرسودگی ناشی از نوسان‌های افراطی (Boom-and-Bust Burnout):</strong> مطالعه ۱۴ ساعته در یک روز و رها کردن کامل برنامه در ۳ روز بعدی، در میانگینِ ساعتِ هفتگی عددی قابل‌قبول نشان می‌دهد، اما از نظر تثبیت حافظه بلندمدت فاجعه‌بار است.
              </li>
              <li>
                <strong className="text-white">فرار به دروس امن (Comfort-Zone Bias):</strong> دانش‌آموز تمام ساعت مطالعه خود را صرف دروس مورد علاقه می‌کند و دروس چالشی را به تعویق می‌اندازد، در حالی که مجموع ساعت روزانه‌اش بالاست.
              </li>
            </ul>
          </div>

          <h3 className="text-sm sm:text-base font-black text-indigo-300 pt-2">
            معماری هفت‌بعدی سنجش در Martia Planner
          </h3>
          <p>
            برای غلبه بر این آسیب‌ها، موتور تحلیلی <strong className="text-white">Martia Planner</strong> یادگیری را نه یک عدد منفرد، بلکه یک <strong className="text-emerald-300">منشور هفت‌وجهی</strong> می‌بیند که هر بُعد آن توسط شاخص‌های اختصاصی پایش می‌شود:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-300">۱. بُعد کمیت و حجم تلاش (Quantity)</span>
                <MathFormula tex="M_{\text{actual}},\; T,\; Q" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                سنجش زمان واقعی مطالعه و تعداد تمرین‌های حل‌شده در قیاس با ظرفیت هدف‌گذاری‌شده روزانه، با اعمال سقف اشباع (۱۰۰ تا ۱۱۰) تا از ساعت‌سازی کاذب جلوگیری شود.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300">۲. بُعد تحقق برنامه و نظم اجرایی (Adherence)</span>
                <MathFormula tex="R_{\text{time}}\%,\; F_d,\; \Delta M" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                سنجش میزان وفاداری به برنامه ازپیش‌تعیین‌شده (۶۰٪ تحقق زمان + ۴۰٪ تکمیل واقعی تسک‌ها) و تشخیص خطای بیش‌برنامه‌ریزی (Overplanning) یا کم‌برنامه‌ریزی.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300">۳. بُعد کیفیت شناختی یادگیری (Quality)</span>
                <MathFormula tex="q_i,\; Q_w,\; L" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ارزیابی تمرکز، درک مطلب و تسلط در حین هر جلسه مطالعه، همراه با وزن‌دهی زمانی (<MathFormula tex="Q_w" inline />) تا جلسات طولانی‌تر وزن متناسبی در میانگین کیفیت روزانه داشته باشند.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-300">۴. بُعد عمق یادگیری و تسلط (Learning Depth)</span>
                <MathFormula tex="M_{\text{depth}},\; \text{Mastery}_s" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                سنجش اینکه آیا مطالعه به تثبیت عمیق انجامیده است؛ ترکیبی از کیفیت وزنی، امتیاز آموزشی، انطباق زمانی، نرخ اتمام کامل جلسات و پیوستگی.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300">۵. بُعد استمرار و خودتنظیمی رفتاری (Continuity)</span>
                <MathFormula tex="C,\; B,\; r_d(k),\; M_d" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                پایش مهار عوامل مخل تمرکز (موبایل و فعالیت‌های محدود)، حفظ زنجیره روزهای فعال مؤثر و اعمال بازدارندگی تدریجی در برابر وقفه‌های متوالی غیرمجاز.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-pink-300">۶. بُعد عملکرد اختصاصی هر درس (Subject Balance)</span>
                <MathFormula tex="XP_{\text{net},s},\; E_s,\; r_s(k_s)" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                جلوگیری از پنهان شدن ضعف یک درس در پشت میانگین کل؛ هر درس ترازنامه XP، مرحله (۱ تا ۳۹) و وضعیت استمرار مستقل خودش را دارد.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-300">۷. بُعد پیشرفت واقعی تحصیلی و هم‌سنجی (Educational Alignment)</span>
                <MathFormula tex="E,\; DS,\; \text{Alignment}(XP, E)" className="text-[11px]" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                مقایسه مستمر رشد امتیاز انگیزشی (XP) با رشد شاخص آموزشی مستقیم (<MathFormula tex="E" inline />) در بازه‌های هفتگی تا مشخص شود آیا افزایش XP واقعاً با ارتقای کمیت، تمرین و کیفیت مطالعه همراه بوده یا صرفاً ناشی از ساعت‌سازی سطحی است.
              </p>
            </div>
          </div>

          {/* Educational Example Box */}
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-black text-xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>مثال آموزشی: مقایسه دو دانش‌آموز با ساعت مطالعه یکسان</span>
            </div>
            <p className="text-xs text-slate-300 leading-6">
              فرض کنید «دانش‌آموز الف» و «دانش‌آموز ب» هر دو در طول هفته دقیقاً <strong className="text-white">۳۵ ساعت</strong> مطالعه ثبت کرده‌اند. در یک سیستم سنتی، هر دو نمره یکسانی می‌گیرند. اما در <strong className="text-white">Martia Planner</strong>:
              <br />
              • <strong className="text-emerald-300">دانش‌آموز الف</strong> این ۳۵ ساعت را در ۷ روز منظم (روزی ۵ ساعت)، با تکمیل ۹۵٪ جلسات، حل تست متناسب (<MathFormula tex="Q=92" inline />) و کیفیت تمرکز بالا (<MathFormula tex="L=90" inline />) در همه دروس توزیع کرده است. او هم در <MathFormula tex="E" inline />، هم در <MathFormula tex="DS" inline /> و هم در <MathFormula tex="XP_{\text{net}}" inline /> کل و تک‌درس رشد هم‌راستا دارد.
              <br />
              • <strong className="text-rose-300">دانش‌آموز ب</strong> در ۳ روز اول هر روز ۱۱.۵ ساعت فقط درس زیست‌شناسی را روخوانی کرده (بدون تست: <MathFormula tex="Q=15" inline /> و با خستگی و کیفیت پایین: <MathFormula tex="L=55" inline />) و ۴ روز بعدی برنامه خود را رها کرده و دروس ریاضی و فیزیک را اصلاً باز نکرده است. سیستم چندبعدی بلافاصله افت شاخص <MathFormula tex="Q" inline />، جریمه وقفه ۴ روزه، افت مرحله در دروس ریاضی/فیزیک و هشدار «عدم توازن سهم دروس» را برای او صادر می‌کند.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 2: منطق انتخاب شاخص‌ها و فلسفه هرکدام */}
      {/* ===================================================================== */}
      <section
        id="chapter-2-indicators-philosophy"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black">
              فصل دوم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              منطق انتخاب شاخص‌ها و فلسفه هرکدام (پاسخ به ۷ پرسش بنیادین طراحی)
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          در مهندسی شاخص‌های آموزشی <strong className="text-white">Martia Planner</strong>، هیچ متغیری به‌صورت تصادفی وارد معادلات نشده است. در این فصل، هر ۵ گروه اصلی شاخص‌های برنامه را بر اساس <strong className="text-emerald-300">۷ پرسش استاندارد طراحی</strong> (۱. چه چیزی را می‌سنجد؟ ۲. چرا مهم است؟ ۳. اگر نباشد چه خطایی رخ می‌دهد؟ ۴. منطق ترکیب و وزن‌دهی چیست؟ ۵. دامنه و سقف/کف آن چقدر است؟ ۶. از چه ورودی‌هایی اثر می‌پذیرد و بر چه خروجی‌هایی اثر می‌گذارد؟ ۷. چگونه تفسیر می‌شود؟) کالبدشکافی می‌کنیم.
        </p>

        {/* Group A */}
        <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-black text-indigo-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>الف) خانواده شاخص‌های تحقق عملکرد و زمان (T، Q، درصد تحقق زمان و F_d)</span>
            </h3>
            {onNavigateToDefinition && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onNavigateToDefinition('metric-1-study-time-t')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 cursor-pointer"
                >
                  تعریف شاخص T
                </button>
                <button
                  onClick={() => onNavigateToDefinition('metric-2-exercises-q')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 cursor-pointer"
                >
                  تعریف شاخص Q
                </button>
                <button
                  onClick={() => onNavigateToDefinition('metric-8-plan-adherence-variance')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 cursor-pointer"
                >
                  تعریف انطباق برنامه
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-slate-300 leading-6">
            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="font-black text-white">۱. چه چیزی را اندازه‌گیری می‌کنند؟</div>
              <p>
                • <strong className="text-indigo-300">شاخص زمان مطالعه (<MathFormula tex="T" inline />):</strong> نسبت زمان مطالعه واقعی (<MathFormula tex="M_{\text{actual}}" inline />) به زمان پیش‌بینی‌شده (<MathFormula tex="M_{\text{predicted}}" inline />) یا هدف پایه روزانه.
                <br />
                • <strong className="text-indigo-300">شاخص حل تمرین (<MathFormula tex="Q" inline />):</strong> نسبت تمرین/تست حل‌شده واقعی به هدف تمرین روزانه.
                <br />
                • <strong className="text-indigo-300">نسبت تحقق برنامه روز (<MathFormula tex="F_d" inline />):</strong> میزان اجرای واقعی تعهدات روزانه با ترکیب ۶۰٪ تحقق زمان و ۴۰٪ تکمیل تسک‌ها.
              </p>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="font-black text-white">۲ و ۳. چرا مهم‌اند و در غیاب آن‌ها چه خطایی رخ می‌دهد؟</div>
              <p>
                بدون <MathFormula tex="T" inline /> و <MathFormula tex="Q" inline />، کمیت تلاش روزانه قابل اندازه‌گیری نیست. اما اگر فقط <MathFormula tex="T" inline /> باشد و <MathFormula tex="F_d" inline /> نباشد، دانش‌آموز می‌تواند ۵ تسک ۳۰ دقیقه‌ای را نیمه‌کاره رها کند و فقط ۱ تسک را ۳ ساعت طول بدهد؛ در این حالت ساعت مطالعه پر شده، اما ساختار برنامه روزانه متلاشی شده است.
              </p>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="font-black text-white">۴ و ۵. منطق وزن‌دهی، دامنه و سقف/کف (Clamping)</div>
              <p>
                در شاخص‌های <MathFormula tex="T" inline /> و <MathFormula tex="Q" inline />، در لایه امتیاز روزانه سقف <strong className="text-emerald-300">۱۰۰٪</strong> و در لایه محاسبه XP سقف پاداش اضافه تا <strong className="text-emerald-300">۱۱۰٪</strong> اعمال می‌شود. چرا؟ زیرا فراتر از ۱۱۰٪ زمان برنامه‌ریزی‌شده، بازده نهایی مطالعه به دلیل خستگی شناختی کاهش می‌یابد و نبودِ سقف باعث تشویق به کم‌برنامه‌ریزی عمدی (Sandbagging) یا فرسودگی مفرط می‌شود. در <MathFormula tex="F_d = 0.60 \times \text{TimeRatio} + 0.40 \times \text{CompletionRatio}" inline /> نیز وزن زمان ۶۰٪ و تکمیل فعالیت‌ها ۴۰٪ است تا هم حجم زمانی و هم بستن پرونده تسک‌ها (Task Closure) سنجیده شود.
              </p>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="font-black text-white">۶ و ۷. زنجیره اثرگذاری و راهنمای تفسیر</div>
              <p>
                • <strong className="text-cyan-300">ورودی‌ها:</strong> مجموع دقایق واقعی، دقایق پیش‌بینی‌شده، تعداد تمرین‌ها و وضعیت جلسات (تکمیل‌شده با وزن ۱.۰ و ناقص با وزن ۰.۵).
                <br />
                • <strong className="text-cyan-300">خروجی‌ها:</strong> تغذیه مستقیم شاخص آموزشی <MathFormula tex="E" inline />، امتیاز روزانه <MathFormula tex="DS" inline />، تراز مثبت <MathFormula tex="XP_{\text{pos}}" inline /> و تشخیص روزهای ازدست‌رفته (<MathFormula tex="F_d < 0.25" inline />).
                <br />
                • <strong className="text-cyan-300">تفسیر:</strong> <MathFormula tex="T \ge 85" inline /> و <MathFormula tex="F_d \ge 0.80" inline /> نشان‌دهنده انضباط اجرایی استاندارد؛ شکاف بزرگ بین درصد تحقق زمان و درصد تکمیل تسک‌ها نشانه «کش دادن جلسات بدون بستن مباحث» است.
              </p>
            </div>
          </div>
        </div>

        {/* Group B */}
        <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-black text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>ب) خانواده شاخص‌های کیفیت و عمق یادگیری (Q_w، L، تسلط درس و M_depth)</span>
            </h3>
            {onNavigateToDefinition && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onNavigateToDefinition('metric-3-learning-quality-l')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer"
                >
                  تعریف شاخص L
                </button>
                <button
                  onClick={() => onNavigateToDefinition('metric-14-subject-xp-continuity')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer"
                >
                  تعریف M_depth
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-slate-300 leading-6">
            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="font-black text-white">۱ و ۲. چه چیزی را می‌سنجند و چرا حیاتی‌اند؟</div>
              <p>
                این گروه «عمق پردازش شناختی» را می‌سنجد. در حالی که <MathFormula tex="L" inline /> میانگین ساده کیفیت جلسات روز را بر مقیاس ۰ تا ۱۰۰ نشان می‌دهد، <strong className="text-emerald-300">کیفیت وزنی (<MathFormula tex="Q_w" inline />)</strong> کیفیت هر جلسه را در مدت‌زمان واقعی آن (<MathFormula tex="m_{i,\text{act}}" inline />) وزن‌دهی می‌کند تا یک جلسه ۱۰ دقیقه‌ای با کیفیت ۵ از ۵، نتواند کیفیت ضعیف یک جلسه ۱۲۰ دقیقه‌ای را پنهان کند. ضریب <MathFormula tex="M_{\text{depth}}" inline /> نیز در سطح هر درس، عمق یادگیری را در بازه <MathFormula tex="[0.75, 1.25]" inline /> خلاصه می‌کند.
              </p>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="font-black text-white">۳ و ۴. خطای حذف و منطق ترکیب در M_depth</div>
              <p>
                بدون <MathFormula tex="Q_w" inline /> و <MathFormula tex="M_{\text{depth}}" inline />، مطالعه سطحی و خواب‌آلود همان قدر XP تولید می‌کند که مطالعه عمیق و متمرکز. در منطق واقعی برنامه، ضریب عمق یادگیری درس (<MathFormula tex="M_{\text{depth}}" inline />) از ۵ مؤلفه ساخته می‌شود: پایه خنثی <MathFormula tex="0.72" inline /> + سهم کیفیت وزنی درس (<MathFormula tex="0.22" inline />) + سهم امتیاز آموزشی درس (<MathFormula tex="0.14" inline />) + سهم انطباق زمانی (<MathFormula tex="0.08" inline />) + سهم تکمیل کامل جلسات (<MathFormula tex="0.06" inline />) + پاداش استمرار تا سقف <MathFormula tex="+0.08" inline />.
              </p>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 lg:col-span-2">
              <div className="font-black text-white">۵، ۶ و ۷. چرا بازه [0.75, 1.25]؟ ورودی/خروجی و نحوه تفسیر</div>
              <p>
                بازه <MathFormula tex="[0.75, 1.25]" inline /> به‌گونه‌ای طراحی شده که کیفیت و عمق بالا بتواند تلاش خام دانش‌آموز را تا <strong className="text-emerald-300">+۲۵٪ تقویت (Boost)</strong> کند و مطالعه سطحی و رهاشده تا <strong className="text-rose-300">۲۵٪ از ارزش XP ناخالص بکاهد</strong>، اما هرگز تلاش دانش‌آموز را صفر نکند (حفظ امنیت روانی). هرگاه <MathFormula tex="M_{\text{depth}} > 1.05" inline /> باشد، مطالعه درس در ناحیه «تثبیت عمیق» قرار دارد و هرگاه <MathFormula tex="M_{\text{depth}} < 0.90" inline /> شود، زنگ هشدار مطالعه سطحی یا جلسات نیمه‌کاره به صدا درمی‌آید.
              </p>
            </div>
          </div>
        </div>

        {/* Group C */}
        <div className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-black text-purple-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>ج) خانواده شاخص‌های عملکرد ترکیبی آموزشی و خودتنظیمی (E، C و امتیاز نهایی روزانه DS)</span>
            </h3>
            {onNavigateToDefinition && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onNavigateToDefinition('metric-4-educational-score-e')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 cursor-pointer"
                >
                  تعریف شاخص E
                </button>
                <button
                  onClick={() => onNavigateToDefinition('metric-5-restricted-control-c')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 cursor-pointer"
                >
                  تعریف شاخص C
                </button>
                <button
                  onClick={() => onNavigateToDefinition('metric-6-final-daily-score-ds')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 cursor-pointer"
                >
                  تعریف شاخص DS
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-purple-300">فرمول‌های هسته مرکزی عملکرد روزانه در کد برنامه:</span>
                <div className="flex flex-wrap gap-3">
                  <MathFormula tex="E = 0.40\,T + 0.30\,Q + 0.30\,L" />
                  <MathFormula tex="DS = 0.80\,E + 0.20\,C = 0.32\,T + 0.24\,Q + 0.24\,L + 0.20\,C" />
                </div>
              </div>
              <p>
                • <strong className="text-white">چرا در شاخص آموزشی مستقیم (<MathFormula tex="E" inline />) وزن‌ها ۴۰٪، ۳۰٪ و ۳۰٪ است؟</strong> زمان مطالعه (<MathFormula tex="T" inline /> با وزن ۴۰٪) بستر لازم برای وقوع یادگیری است؛ اما بدون تثبیت تمرینی (<MathFormula tex="Q" inline /> با وزن ۳۰٪) و کیفیت تمرکز (<MathFormula tex="L" inline /> با وزن ۳۰٪)، زمان صرف‌شده به یادگیری پایدار تبدیل نمی‌شود. بنابراین ۶۰٪ وزن <MathFormula tex="E" inline /> به «خروجی تمرینی و کیفی» اختصاص یافته است.
                <br />
                • <strong className="text-white">چرا در <MathFormula tex="DS" inline />، ۸۰٪ وزن به <MathFormula tex="E" inline /> و ۲۰٪ به کنترل فعالیت‌های محدود (<MathFormula tex="C" inline />) داده شده است؟</strong> پژوهش‌های علوم اعصاب شناختی نشان می‌دهند که استفاده بی‌رویه از شبکه‌های اجتماعی و محرک‌های دوپامینی سریع (کسر ۱ امتیاز به ازای هر ۶ دقیقه مازاد بر سقف مجاز <MathFormula tex="M_{\max}" inline /> در شاخص <MathFormula tex="C" inline />)، توجه پایدار (Sustained Attention) و تثبیت حافظه در هیپوکامپ را مختل می‌کند. اختصاص ۲۰٪ وزن روزانه به <MathFormula tex="C" inline />، بهداشت دیجیتال را به بخشی جدایی‌ناپذیر از عملکرد تحصیلی تبدیل می‌کند.
              </p>
            </div>
          </div>
        </div>

        {/* Group D & E */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-5 space-y-3 text-xs text-slate-300 leading-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>د) خانواده شاخص‌های XP و پاداش عملکرد</span>
              </h3>
              {onNavigateToDefinition && (
                <button
                  onClick={() => onNavigateToDefinition('metric-11-positive-xp-formula')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer"
                >
                  فرمول XP مثبت
                </button>
              )}
            </div>
            <p>
              <strong className="text-white">فلسفه جداسازی XP از نمره روزانه (<MathFormula tex="DS" inline />):</strong> نمره <MathFormula tex="DS" inline /> یک شاخص «وضعیت لحظه‌ای» (State Indicator) بین ۰ تا ۱۰۰ است که هر روز از صفر شروع می‌شود؛ اما <strong className="text-amber-300">XP (امتیاز تجربه)</strong> یک شاخص «انباشتی و تاریخی» (Cumulative Asset) است. در فرمول <MathFormula tex="XP_{\text{pos}}" inline />، عملکرد چندبعدی (<MathFormula tex="S_{\text{core}}" inline /> با وزن‌های ۳۴٪ زمان، ۲۶٪ تمرین، ۲۲٪ کیفیت وزنی و ۱۸٪ کنترل محدودها) در ضریب انطباق برنامه (<MathFormula tex="M_{\text{plan}} \in [0.85, 1.10]" inline />) و ضریب حجم روزانه (<MathFormula tex="M_{\text{volume}} \in [0.60, 1.15]" inline />) ضرب می‌شود تا کسی نتواند با ثبت یک برنامه ۱۰ دقیقه‌ای در روز، XP کامل یک روز استاندارد را دریافت کند!
            </p>
          </div>

          <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-5 space-y-3 text-xs text-slate-300 leading-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>هـ) سیستم سطح‌بندی ۱۳ سطحی و ۳۹ مرحله‌ای (کل و دروس)</span>
              </h3>
              {onNavigateToDefinition && (
                <button
                  onClick={() => onNavigateToDefinition('metric-13-global-39-stages')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 cursor-pointer"
                >
                  جدول ۳۹ مرحله
                </button>
              )}
            </div>
            <p>
              <strong className="text-white">چرا ۱۳ سطح و ۳۹ مرحله با آستانه‌های غیرخطی؟</strong> اگر فاصله سطوح خیلی بزرگ باشد، دانش‌آموز در میانه راه دلسرد می‌شود (پدیده خستگی میانه مسیر). با تقسیم ۱۳ سطح اصلی (از مس و برنز تا الماس، استادی و ابرنواختر) به <strong className="text-cyan-300">۳ زیرمرحله (پایه، پلاس، پرایم)</strong>، ۳۹ پله هدف کوتاه‌مدت (Micro-Goals) شکل می‌گیرد. آستانه‌های ابتدایی کوچک‌اند (مثلاً ۲۵ و ۶۰ XP در سطح کل؛ ۵ و ۱۲ XP در تک‌درس) تا حس خودکارآمدی اولیه سریع شکل بگیرد، و در سطوح بالاتر فاصله پله‌ها بیشتر می‌شود تا نشان‌دهنده استمرار واقعی در افق ماهانه و سالانه باشد.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 3: استمرار، وقفه و منطق کسر امتیاز */}
      {/* ===================================================================== */}
      <section
        id="chapter-3-continuity-penalty"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black">
              فصل سوم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              استمرار، وقفه و منطق کسر امتیاز (پشتوانه علمی جریمه‌های هوشمند)
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <p>
            یکی از ظریف‌ترین چالش‌ها در طراحی سیستم‌های آموزشی، نحوه برخورد با <strong className="text-rose-300">«روزهای ازدست‌رفته و غیبت‌های متوالی»</strong> است. اگر سیستم هیچ واکنشی به رها کردن برنامه نشان ندهد، امتیاز انباشتی به یک «عدد راکد و بی‌معنا» تبدیل می‌شود که بین دانش‌آموزِ مستمر و دانش‌آموزی که دو هفته است درس نخوانده تفاوتی قائل نیست. از سوی دیگر، اگر جریمه‌ها خشن، نامحدود و ناعادلانه باشند، اثر روانی مخربی به نام <strong className="text-amber-300">«اثر چه فایده دارد!» (What-the-Hell Effect)</strong> ایجاد می‌کنند که باعث می‌شود دانش‌آموز پس از چند روز غیبت، کل برنامه را برای همیشه رها کند.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/90 border border-rose-500/30 rounded-xl p-4 space-y-2.5">
              <div className="font-black text-rose-300 text-xs sm:text-sm flex items-center justify-between">
                <span>۱. منطق جریمه در سطح کل برنامه (Global Penalty)</span>
                <MathFormula tex="XP_{\text{neg}} = \sum B \times r_d(k) \times M_d" className="text-[11px]" />
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                <li>
                  <strong className="text-white">مقیاس‌پذیری درون‌فردی (<MathFormula tex="B" inline />):</strong> جریمه پایه عدد ثابتی برای همه نیست، بلکه <strong className="text-rose-300">۱۵٪ میانگین XP روزهای فعال خودِ دانش‌آموز</strong> (مقید در بازه <MathFormula tex="[1.5, 10]" inline />) است؛ یعنی از هر کس به اندازه ظرفیت خودش انتظار می‌رود.
                </li>
                <li>
                  <strong className="text-white">ضریب تشدید ملایم و سقف‌دار (<MathFormula tex="r_d(k)" inline />):</strong> در غیبت‌های متوالی، ضریب از <MathFormula tex="1.0" inline /> (روز اول) به <MathFormula tex="1.25" inline />، <MathFormula tex="1.5" inline />، <MathFormula tex="1.75" inline />، <MathFormula tex="2.0" inline /> و حداکثر <MathFormula tex="2.5" inline /> می‌رسد تا مانع شکل‌گیری عادت ترک مطالعه شود، اما در ۲.۵ متوقف می‌گردد تا سقوط آزاد رخ ندهد.
                </li>
                <li>
                  <strong className="text-white">تخفیف تلاش جزئی (<MathFormula tex="M_d" inline />):</strong> اگر دانش‌آموز در یک روز دشوار حتی ۱۰٪ تا ۲۵٪ برنامه را انجام دهد (<MathFormula tex="0.10 \le F_d < 0.25" inline />)، جریمه او <strong className="text-emerald-300">۴۰٪ تخفیف (<MathFormula tex="M_d = 0.60" inline />)</strong> می‌گیرد. این قاعده مستقیماً برگرفته از اصل روان‌شناختی <em>«هیچ روزی صفرِ مطلق نباشد» (No Zero Days)</em> است.
                </li>
              </ul>
            </div>

            <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
              <div className="font-black text-amber-300 text-xs sm:text-sm flex items-center justify-between">
                <span>۲. منطق جریمه اختصاصی هر درس (Subject Penalty)</span>
                <MathFormula tex="XP_{\text{neg},s} = \sum B_s \times r_s(k_s) \times M_{s,j}" className="text-[11px]" />
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                <li>
                  <strong className="text-white">پایش نوبت‌به‌نوبت هر درس:</strong> حتی اگر دانش‌آموز در طول روز فعال باشد اما نوبت برنامه‌ریزی‌شده درسِ <MathFormula tex="s" inline /> را رها کند (<MathFormula tex="F_{s,j} < 0.25" inline />)، شمارنده غیبت متوالی همان درس (<MathFormula tex="k_s" inline />) فعال می‌شود.
                </li>
                <li>
                  <strong className="text-white">چرا گام تشدید تک‌درس (<MathFormula tex="r_s(k_s) = 1.0, 1.4, 1.8, 2.2 \dots 3.0" inline />) تندتر از سطح کل است؟</strong> زیرا مطابق <strong className="text-amber-300">منحنی فراموشی ابینگهاوس (Ebbinghaus Forgetting Curve)</strong>، رها کردن یک درس خاص برای ۳ یا ۴ نوبت متوالی (که در برنامه هفتگی معادل ۲ تا ۳ هفته فاصله افتادن است) باعث محو شدن کامل ردپای حافظه آن درس می‌شود.
                </li>
                <li>
                  <strong className="text-white">شرط شکستن زنجیره غیبت (<MathFormula tex="k=0" inline />):</strong> تنها زمانی شمارنده غیبت متوالی صفر می‌شود که یک روز یا نوبت <strong className="text-emerald-300">فعالِ مؤثر</strong> (<MathFormula tex="F_d \ge 0.50" inline /> و در سطح کل حداقل ۳۰ دقیقه مطالعه واقعی) ثبت شود تا نتوان با ۲ دقیقه مطالعه صوری زنجیره غیبت را دور زد.
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-black text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>تفکیک حیاتی: «روز استراحت مجاز» در برابر «روز دارای تعهد اجرانشده»</span>
            </div>
            <p className="text-xs text-slate-300 leading-6">
              در منطق واقعی <strong className="text-white">Martia Planner</strong>، جریمه <MathFormula tex="XP_{\text{neg}}" inline /> <strong className="text-emerald-300">فقط و فقط</strong> برای روزها یا نوبت‌هایی محاسبه می‌شود که دانش‌آموز در آن‌ها <strong className="text-white">برنامه و تعهد مشخصی ثبت کرده (<MathFormula tex="M_{\text{predicted}} > 0" inline /> یا تسک برنامه‌ریزی‌شده دارد)</strong> اما آن را رها کرده است. اگر دانش‌آموز روز جمعه را به‌عنوان روز استراحت و ریکاوری بدون هیچ تسک برنامه‌ریزی‌شده‌ای بگذارد، سیستم نه‌تنها هیچ جریمه‌ای کسر نمی‌کند، بلکه زنجیره استمرار او را نیز حفظ می‌نماید. بنابراین برنامه به «پیمان‌شکنی با برنامه خود» جریمه می‌دهد، نه به «استراحت سالم و برنامه‌ریزی‌شده».
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 4: ارزیابی اختصاصی هر درس؛ چرا عملکرد کلی کافی نیست؟ */}
      {/* ===================================================================== */}
      <section
        id="chapter-4-subject-specific"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
              فصل چهارم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              ارزیابی اختصاصی هر درس؛ چرا عملکرد کلی کافی نیست؟
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <p>
            در آزمون‌های جامع و تحصیلات چنددرسی، موفقیت نهایی تابعِ <strong className="text-amber-300">«توازن سبد دروس»</strong> است، نه صرفاً مجموع ساعات مطالعه کل. یکی از خطاهای رایج شناختی در میان داوطلبان، <strong className="text-white">پدیده پوشانندگی بین‌درسی (Inter-Subject Masking)</strong> است: دانش‌آموز در درسی که به آن علاقه دارد و در آن احساس تسلط می‌کند (مثلاً زیست‌شناسی یا ادبیات)، ساعت‌ها مطالعه باکیفیت ثبت می‌کند؛ این عملکرد درخشان باعث می‌شود میانگین کل روزانه (<MathFormula tex="DS" inline />) و سطح کل (<MathFormula tex="XP_{\text{net}}" inline />) او پیوسته بالا برود، در حالی که درس دیگری (مثلاً فیزیک یا عربی) هفته‌هاست که رها شده یا جلسات آن نیمه‌کاره مانده است.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="font-black text-indigo-300 text-xs sm:text-sm">
                مکانیسم پایش مستقل هر درس در Martia Planner
              </div>
              <p className="text-xs text-slate-300 leading-6">
                برنامه برای هر درس <MathFormula tex="s" inline /> یک پرونده تحلیلی کاملاً مستقل تشکیل می‌دهد که شامل:
                <br />
                ۱. <strong className="text-white">امتیاز آموزشی مستقیم درس (<MathFormula tex="E_s" inline />):</strong> با ترکیب <MathFormula tex="0.40\,T_s + 0.30\,Q_s + 0.30\,L_s" inline /> در سطح کل دوره (که جلسات رهاشده مستقیماً مخرج زمان و تمرین کل دوره را بزرگ نگه داشته و <MathFormula tex="E_s" inline /> را به شکل واقعی تعدیل می‌کنند).
                <br />
                ۲. <strong className="text-white">ضریب عمق یادگیری درس (<MathFormula tex="M_{\text{depth}}" inline />):</strong> سنجش کیفیت وزنی و نرخ تکمیل کامل جلسات همان درس.
                <br />
                ۳. <strong className="text-white">تراز خالص <MathFormula tex="XP_{\text{net},s}" inline /> و جدول ۳۹ مرحله‌ای اختصاصی تک‌درس (۰ تا ۲٬۰۰۰ XP):</strong> هر درس مستقل از سطح کل می‌تواند صعود کند یا در اثر غیبت‌های متوالی (<MathFormula tex="k_s" inline />) دچار تنزل مرحله شود.
              </p>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="font-black text-amber-300 text-xs sm:text-sm">
                وضعیت چهارگانه استمرار درس (Subject Continuity Status)
              </div>
              <p className="text-xs text-slate-300 leading-6">
                موتور تحلیلی وضعیت هر درس را در یکی از ۴ ناحیه زیر طبقه‌بندی می‌کند:
                <br />
                • <strong className="text-emerald-300">پایدار (Stable):</strong> بدون غیبت متوالی (<MathFormula tex="k_s = 0" inline />) و دارای حداقل ۲ روز فعال مطالعه در بازه اخیر.
                <br />
                • <strong className="text-amber-300">هشدار وقفه (Warning):</strong> ثبت ۱ نوبت برنامه‌ریزی‌شده ازدست‌رفته (<MathFormula tex="k_s = 1" inline />) یا تنها ۱ جلسه مطالعه در کل دوره.
                <br />
                • <strong className="text-orange-300">در معرض افت (At Risk):</strong> ثبت ۲ نوبت متوالی رهاشده (<MathFormula tex="k_s = 2" inline />) یا نسبت جریمه به تلاش ناخالص بیش از ۲۰٪.
                <br />
                • <strong className="text-rose-300">افت سطح / بحرانی (Critical / Demoted):</strong> ۳ نوبت یا بیشتر غیبت متوالی (<MathFormula tex="k_s \ge 3" inline />) یا سقوط مرحله فعلی درس به پایین‌تر از مرحله ناخالص کسب‌شده.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 5: سرعت کسب XP و روند پیشرفت هفتگی */}
      {/* ===================================================================== */}
      <section
        id="chapter-5-velocity-trends"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black">
              فصل پنجم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              سرعت کسب XP و روند پیشرفت هفتگی (پیش‌بینی واقع‌بینانه صعود)
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <p>
            وقتی دانش‌آموز می‌پرسد: <strong className="text-white">«چند روز دیگر به مرحله یا سطح بعدی می‌رسم؟»</strong>، استفاده از یک میانگین حسابی ساده می‌تواند به پیش‌بینی‌های کاملاً گمراه‌کننده منجر شود. اگر میانگین را فقط بر «روزهای فعال» تقسیم کنیم، غیبت‌های مکرر دانش‌آموز نادیده گرفته می‌شود و پیش‌بینی بیش از حد خوش‌بینانه خواهد بود؛ و اگر یک روز استثنایی (مثلاً کسب ۱۵ XP در یک روز تعطیل) یا یک روز بیماری در هفته وجود داشته باشد، میانگین ساده ۷ روزه به‌شدت دچار چولگی (Skewness) می‌شود.
          </p>

          <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-black text-cyan-300">
                معماری نرخ مؤثر پیش‌بینی ۷ روزه در کد واقعی برنامه:
              </span>
              <MathFormula tex="\text{Rate}_{7d,\text{eff}} = 0.45\,\text{Rate}_{\text{cal}} + 0.35\,\text{Rate}_{\text{acc}} + 0.20\,\text{TrimmedMean}_{7d}" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-white mb-1">۱. نرخ تقویمی ۷ روزه (وزن ۴۵٪)</div>
                <p className="text-slate-400 leading-relaxed">
                  مجموع XP خالص ۷ روز اخیر تقسیم بر ۷ روز تقویمی (<MathFormula tex="\text{Rate}_{\text{cal}} = \Delta XP_{\text{net},7d} / 7" inline />). این لایه واقعیتِ زمانِ تقویمی و روزهای بدون مطالعه را مستقیماً در سرعت صعود لحاظ می‌کند.
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-white mb-1">۲. نرخ روزهای فعال (وزن ۳۵٪)</div>
                <p className="text-slate-400 leading-relaxed">
                  تقسیم بر تعداد روزهای فعال (<MathFormula tex="\text{Rate}_{\text{acc}}" inline />). این لایه توان تولید XP دانش‌آموز در روزهایی که واقعاً پای درس می‌نشیند را نمایندگی می‌کند.
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-white mb-1">۳. میانگین پیراسته ۷ روزه (وزن ۲۰٪)</div>
                <p className="text-slate-400 leading-relaxed">
                  حذف بهترین روز (سقف کاذب) و ضعیف‌ترین روز (کف استثنایی) در هفته و میانگین‌گیری از ۵ روز میانی (<MathFormula tex="\text{TrimmedMean}_{7d}" inline />) برای حذف نویزهای آماری.
                </p>
              </div>
            </div>
          </div>

          <p>
            سپس با مقایسه سرعت هفته جاری (<MathFormula tex="W_{\text{curr}}" inline />) و هفته قبل (<MathFormula tex="W_{\text{prev}}" inline />)، شاخص تغییر روند هفتگی (<MathFormula tex="\Delta W\%" inline />) محاسبه شده و وضعیت حرکت دانش‌آموز در یکی از ۴ حالت <strong className="text-emerald-300">رشد شتاب‌دار (<MathFormula tex="\Delta W\% \ge +10\%" inline />)</strong>، <strong className="text-cyan-300">پایدار (<MathFormula tex="-10\% < \Delta W\% < +10\%" inline />)</strong>، <strong className="text-amber-300">کاهش سرعت (<MathFormula tex="\Delta W\% \le -10\%" inline />)</strong> یا <strong className="text-rose-300">عقب‌گرد خالص (<MathFormula tex="W_{\text{curr}} < 0" inline />)</strong> تشخیص داده می‌شود.
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 6: هم‌سنجی XP با رشد واقعی تحصیلی */}
      {/* ===================================================================== */}
      <section
        id="chapter-6-xp-educational-alignment"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-black">
              فصل ششم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              هم‌سنجی XP با رشد واقعی تحصیلی (تشخیص رشد ظاهری و تورم امتیاز)
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <p>
            در هر سیستم بازی‌وارسازی (Gamification)، یک خطر ذاتی وجود دارد: <strong className="text-purple-300">«جدا شدن امتیازِ بازی از یادگیری واقعی»</strong>. دانش‌آموز ممکن است یاد بگیرد چگونه با ترفندهای کمّی (مثلاً ثبت روزانه جلسات طولانی در دروس ساده و بدون حل تمرین چالشی)، هر هفته XP جمع کند، در حالی که میانگین شاخص آموزشی مستقیم او (<MathFormula tex="E = 0.40\,T + 0.30\,Q + 0.30\,L" inline />) در حال افت است!
          </p>

          <div className="bg-slate-950/90 border border-purple-500/30 rounded-xl p-4 space-y-3">
            <div className="font-black text-purple-300 text-xs sm:text-sm">
              الف) منطق محاسباتی واقعی برنامه در ماژول هم‌سنجی (XpEducationalAlignment):
            </div>
            <p className="text-xs text-slate-300 leading-6">
              موتور تحلیلی برنامه در پایان هر بازه، درصد تغییرات هفتگی <MathFormula tex="\Delta W\%" inline /> (روند XP) را با تغییرات میانگین شاخص آموزشی هفته جاری نسبت به هفته قبل (<MathFormula tex="\Delta E = \bar{E}_{\text{curr}} - \bar{E}_{\text{prev}}" inline />) تلاقی می‌دهد و ۵ وضعیت تشخیصی تولید می‌کند:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-lg">
                <strong className="text-emerald-300 block mb-1">۱. رشد واقعی و هم‌راستا (Aligned Growth):</strong>
                <span className="text-slate-300">
                  هم سرعت کسب XP افزایش یافته (<MathFormula tex="\Delta W\% \ge +5\%" inline />) و هم میانگین شاخص آموزشی <MathFormula tex="E" inline /> حداقل ۲ واحد رشد کرده است (<MathFormula tex="\Delta E \ge +2" inline />).
                </span>
              </div>
              <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-lg">
                <strong className="text-amber-300 block mb-1">۲. هشدار رشد ظاهری XP (XP Inflation Warning):</strong>
                <span className="text-slate-300">
                  XP در حال افزایش است (<MathFormula tex="\Delta W\% \ge +5\%" inline />)، اما شاخص آموزشی <MathFormula tex="E" inline /> بیش از ۳ واحد افت کرده است (<MathFormula tex="\Delta E \le -3" inline />). این حالت نشان‌دهنده ساعت‌سازی بدون کیفیت یا بدون حل تمرین است.
                </span>
              </div>
              <div className="bg-cyan-950/30 border border-cyan-500/30 p-3 rounded-lg">
                <strong className="text-cyan-300 block mb-1">۳. رشد کیفی پنهان (Quality Gain Despite XP Drop):</strong>
                <span className="text-slate-300">
                  XP هفتگی به دلیل کاهش حجم یا یک روز غیبت کمتر شده (<MathFormula tex="\Delta W\% \le -5\%" inline />)، اما کیفیت و دقت آموزشی در روزهای مطالعه رشد چشمگیری داشته است (<MathFormula tex="\Delta E \ge +3" inline />).
                </span>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg">
                <strong className="text-rose-300 block mb-1">۴ و ۵. افت هم‌زمان (Both Declining) یا ثبات متوازن (Stable):</strong>
                <span className="text-slate-300">
                  افت هم‌زمان هر دو شاخص (<MathFormula tex="\Delta W\% \le -5\%" inline /> و <MathFormula tex="\Delta E \le -2" inline />) که نیازمند بازنگری فوری در حجم برنامه است، یا حرکت پایدار در بازه تعادل.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-950/25 border border-indigo-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-black text-xs sm:text-sm">
              <Info className="w-4 h-4 shrink-0" />
              <span>تفکیک معرفت‌شناختی: تفاوت شاخص عملیاتی E با سنجش بیرونی (External Assessment)</span>
            </div>
            <p className="text-xs text-slate-300 leading-6">
              از دیدگاه روان‌سنجی (Psychometrics)، لازم است با صداقت علمی به یک مرز مهم توجه کنیم: در نسخه فعلی برنامه، شاخص <MathFormula tex="E" inline /> یک <strong className="text-white">«شاخص عملکرد آموزشی فرایندمحور» (Process-Based Educational Performance Index)</strong> است که از ترکیب تحقق زمان (<MathFormula tex="T" inline />)، حجم حل تمرین (<MathFormula tex="Q" inline />) و خودارزیابی کیفیت یادگیری (<MathFormula tex="L" inline />) حاصل می‌شود. هرچند <MathFormula tex="E" inline /> تقریب بسیار دقیقی از تلاش باکیفیت آموزشی است، اما جایگزین <strong className="text-indigo-300">«سنجش بیرونی برون‌داد محور» (مانند درصد صحت تست‌های زمان‌دار یا تراز آزمون‌های آزمایشی استاندارد)</strong> نیست. در فصل نهم توضیح خواهیم داد که چگونه افزودن «درصد پاسخ صحیح تست‌ها» در آینده می‌تواند این حلقه را تکمیل کند.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 7: منطق آماری پشت شاخص‌ها */}
      {/* ===================================================================== */}
      <section
        id="chapter-7-statistical-logic"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-black">
              فصل هفتم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              منطق آماری پشت شاخص‌ها (کالبدشکافی ۱۱ ابزار ریاضی و آماری موتور تحلیلی)
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          داده‌های رفتاری دانش‌آموزان در دنیای واقعی به‌شدت پرنوسان، دارای داده‌های پرت (Outliers) و مقیاس‌های ناهمگن (دقیقه، تعداد تست، امتیاز ۱ تا ۵) هستند. جدول تحلیلی زیر، ۱۱ ابزار آماری و ریاضی به‌کاررفته در موتور محاسباتی <strong className="text-white">Martia Planner</strong> را به همراه چرایی انتخاب، مزیت و محدودیت هرکدام نشان می‌دهد:
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <th className="p-3 font-black w-48">ابزار آماری / ریاضی</th>
                <th className="p-3 font-black w-48">محل استفاده در برنامه</th>
                <th className="p-3 font-black">چرا انتخاب شده و چه مزیتی دارد؟</th>
                <th className="p-3 font-black w-64">محدودیت آماری و نحوه مهار آن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-slate-900/60">
              <tr>
                <td className="p-3 font-bold text-indigo-300">۱. میانگین ساده (Simple Mean)</td>
                <td className="p-3">کیفیت ساده روزانه (<MathFormula tex="L" inline />) و میانگین حسابی دوره‌ای نمرات</td>
                <td className="p-3 leading-relaxed">سادگی محاسبه و درک شهودی بالا برای کاربر در مشاهده سطح کلی عملکرد در روزهای عادی.</td>
                <td className="p-3 leading-relaxed text-slate-400">حساسیت شدید به داده‌های پرت و نادیده گرفتن مدت‌زمان هر جلسه؛ که با افزودن <MathFormula tex="Q_w" inline /> و میانه جبران شده است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-emerald-300">۲. میانگین وزنی (Weighted Mean)</td>
                <td className="p-3">کیفیت وزنی (<MathFormula tex="Q_w" inline />)، <MathFormula tex="E" inline />، <MathFormula tex="DS" inline />، <MathFormula tex="F_d" inline /> و <MathFormula tex="S_{\text{core}}" inline /></td>
                <td className="p-3 leading-relaxed">اعطای ضریب اهمیت متناسب با وزن زمان یا اهمیت علمی هر مؤلفه (مثلاً وزن زمانی جلسات طولانی‌تر در <MathFormula tex="Q_w" inline />).</td>
                <td className="p-3 leading-relaxed text-slate-400">وابستگی به دقت ضرایب اولیه؛ که با قابلیت «تنظیم ضرایب» توسط مشاور/کاربر منعطف شده است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-300">۳. میانه (Median)</td>
                <td className="p-3">گزارش تجمیعی بازه‌ها (هفتگی، ماهانه و کل دوره)</td>
                <td className="p-3 leading-relaxed">شاخص مرکزی مقاوم (Robust) که اگر دانش‌آموز در ۱ روز از هفته بیمار شود و نمره صفر بگیرد، مرکز ثقل عملکرد هفته را تحریف نمی‌کند.</td>
                <td className="p-3 leading-relaxed text-slate-400">عدم حساسیت به بزرگیِ دقیق مقادیر در دو سر طیف؛ به همین دلیل همواره در کنار میانگین حسابی گزارش می‌شود.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-purple-300">۴. دامنه میان‌چارکی (IQR = Q3 - Q1)</td>
                <td className="p-3">تحلیل پراکندگی ۵۰٪ میانی روزها در گزارش‌های دوره‌ای</td>
                <td className="p-3 leading-relaxed">اندازه‌گیری دامنه نوسانِ هسته مرکزی عملکرد بدون اثرپذیری از بهترین و بدترین روزهای استثنایی.</td>
                <td className="p-3 leading-relaxed text-slate-400">در بازه‌های بسیار کوتاه (کمتر از ۴ روز) دقت کافی ندارد؛ در بازه‌های هفتگی و ماهانه ایده‌آل است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-amber-300">۵. انحراف معیار و واریانس (<MathFormula tex="\sigma, \sigma^2" inline />)</td>
                <td className="p-3">سنجش نوسان روزانه در امتیازات <MathFormula tex="T, Q, L, E, C, DS" inline /></td>
                <td className="p-3 leading-relaxed">تشخیص «ثبات رفتاری»؛ دو دانش‌آموز با میانگین ۸۰، در صورت داشتن <MathFormula tex="\sigma=4" inline /> (باثبات) و <MathFormula tex="\sigma=28" inline /> (سینوسی) کاملاً از هم متمایز می‌شوند.</td>
                <td className="p-3 leading-relaxed text-slate-400">وابسته بودن به واحد مقیاس؛ که با تعریف ضریب تغییرات (<MathFormula tex="CV" inline />) بی‌مقیاس شده است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-pink-300">۶. ضریب تغییرات (<MathFormula tex="CV = \sigma / \mu" inline />)</td>
                <td className="p-3">سنجش بی‌ثباتی نسبی زمان و امتیازات در طول دوره</td>
                <td className="p-3 leading-relaxed">امکان مقایسه نوسان دو متغیر با واحدهای متفاوت (مثلاً مقایسه ثبات ساعت مطالعه با ثبات حل تمرین).</td>
                <td className="p-3 leading-relaxed text-slate-400">هنگامی که میانگین (<MathFormula tex="\mu" inline />) نزدیک به صفر باشد، <MathFormula tex="CV" inline /> بی‌نهایت یا ناپایدار می‌شود؛ در کد با شرط <MathFormula tex="\mu > 0" inline /> محافظت شده است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-teal-300">۷. میانگین پیراسته (Trimmed Mean)</td>
                <td className="p-3">محاسبه سرعت کسب XP در ۷ روز اخیر (<MathFormula tex="\text{TrimmedMean}_{7d}" inline />)</td>
                <td className="p-3 leading-relaxed">حذف ۱ داده بیشینه و ۱ داده کمینه در پنجره ۷ روزه، که پیش‌بینی زمان صعود را از شوک‌های تک‌روزه مصون می‌دارد.</td>
                <td className="p-3 leading-relaxed text-slate-400">تنها زمانی فعال می‌شود که حداقل ۵ روز داده در پنجره هفتگی موجود باشد.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-rose-300">۸. محدودسازی بازه (Clamping / Bounding)</td>
                <td className="p-3">سقف ۱۰۰ و ۱۱۰ در <MathFormula tex="T, Q" inline />، بازه <MathFormula tex="M_{\text{depth}} \in [0.75, 1.25]" inline /> و <MathFormula tex="B \in [1.5, 10]" inline /></td>
                <td className="p-3 leading-relaxed">جلوگیری از انفجار ضرایب، مهار تقلبِ کم‌برنامه‌ریزی و تضمین امنیت روانی در جریمه‌ها.</td>
                <td className="p-3 leading-relaxed text-slate-400">اطلاعات مقادیر فراتر از سقف را فشرده می‌کند (اثر سقف/کف)؛ که با نمایش درصد خام تحقق زمان در کنار شاخص مقید شفاف شده است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-orange-300">۹. ضرایب تعدیل چندگانه (Multiplicative Modifiers)</td>
                <td className="p-3">فرمول <MathFormula tex="XP_{\text{pos}} = \text{ MaxXP} \times S_{\text{core}} \times M_{\text{plan}} \times M_{\text{vol}}" inline /></td>
                <td className="p-3 leading-relaxed">ایجاد «هم‌افزایی شرطی»؛ یعنی کیفیت بالا تنها زمانی XP حداکثری می‌دهد که با حجم و انطباق برنامه همراه باشد.</td>
                <td className="p-3 leading-relaxed text-slate-400">ضرب شدن چند ضریب کوچک می‌تواند عدد را بیش از حد کوچک کند؛ به همین دلیل هر ضریب دارای کف ایمن (مثلاً ۰.۸۵ و ۰.۶۰) است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-blue-300">۱۰. استانداردسازی مقیاس (0–100 Normalization)</td>
                <td className="p-3">تبدیل دقایق، تست‌ها، کیفیت (۱ تا ۵) و کنترل محدودها به مقیاس ۰ تا ۱۰۰</td>
                <td className="p-3 leading-relaxed">هم‌مقیاس کردن متغیرهای ناهمگن تا بتوان آن‌ها را در معادلات خطی (<MathFormula tex="E" inline /> و <MathFormula tex="DS" inline />) با هم ترکیب کرد.</td>
                <td className="p-3 leading-relaxed text-slate-400">در کیفیت <MathFormula tex="q_i \in \{1..5\}" inline />، ضرب در ۲۰ کفِ ۲۰ امتیازی ایجاد می‌کند که در فصل نهم نقد و بررسی شده است.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-indigo-300">۱۱. مقایسه پنجره متحرک (Rolling Window Comparison)</td>
                <td className="p-3">مقایسه ۷ روز جاری با ۷ روز قبل در <MathFormula tex="\Delta W\%" inline /> و <MathFormula tex="\Delta E" inline /></td>
                <td className="p-3 leading-relaxed">حذف اثر چرخه‌های هفتگی (تفاوت طبیعی روزهای مدرسه و آخر هفته) در تشخیص روند پیشرفت.</td>
                <td className="p-3 leading-relaxed text-slate-400">نیازمند حداقل ۲ هفته سابقه داده برای مقایسه کاملاً متقارن است.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 8: تحلیل روان‌شناختی نظام پاداش و انگیزش */}
      {/* ===================================================================== */}
      <section
        id="chapter-8-psychological-analysis"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-black">
              فصل هشتم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              تحلیل روان‌شناختی نظام پاداش و انگیزش
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <p>
            معماری انگیزشی <strong className="text-white">Martia Planner</strong> بر چهار نظریه کلاسیک و معاصر در روان‌شناسی تربیتی و علوم شناختی استوار است:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/90 border border-pink-500/30 rounded-xl p-4 space-y-2">
              <div className="font-black text-pink-300 text-xs sm:text-sm">
                ۱. نظریه خودتعیین‌گری دسی و رایان (Self-Determination Theory - SDT)
              </div>
              <p className="text-xs text-slate-300 leading-6">
                طبق نظریه SDT، انگیزش پایدار نیازمند ارضای سه نیاز بنیادین روان است:
                <br />
                • <strong className="text-white">خودمختاری (Autonomy):</strong> در Martia Planner، هدفِ زمانی (<MathFormula tex="M_{\text{predicted}}" inline />) و هدف تمرین توسط خودِ دانش‌آموز یا مشاور او متناسب با شرایط واقعی روز تعیین می‌شود، نه یک عدد دیکته‌شده یکسان برای همه.
                <br />
                • <strong className="text-white">شایستگی (Competence):</strong> بازخورد تفکیک‌شده در شاخص‌های <MathFormula tex="T, Q, L, E, C" inline /> و صعود پله‌به‌پله در ۳۹ مرحله، حس تسلط و پیشرفت ملموس ایجاد می‌کند.
              </p>
            </div>

            <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-4 space-y-2">
              <div className="font-black text-indigo-300 text-xs sm:text-sm">
                ۲. چرخه یادگیری خودتنظیم زیمرمن (Zimmerman’s SRL Model)
              </div>
              <p className="text-xs text-slate-300 leading-6">
                مدل زیمرمن یادگیری را شامل سه فاز <strong className="text-white">پیش‌اندیشی (Forethought)</strong>، <strong className="text-white">اجرا و پایش (Performance)</strong> و <strong className="text-white">بازتاب خود (Self-Reflection)</strong> می‌داند. ثبت زمان پیش‌بینی‌شده فاز اول، ثبت دقایق واقعی و کیفیت جلسات فاز دوم، و تحلیل واریانس زمان (<MathFormula tex="\Delta M" inline />) و هم‌سنجی <MathFormula tex="XP" inline /> با <MathFormula tex="E" inline /> دقیقاً فاز سوم (کالیبراسیون فراشناختی) را در ذهن دانش‌آموز فعال می‌سازد.
              </p>
            </div>

            <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-2">
              <div className="font-black text-emerald-300 text-xs sm:text-sm">
                ۳. سنجش درون‌فردی (Ipsative Assessment) به جای رقابت مخرب بیرونی
              </div>
              <p className="text-xs text-slate-300 leading-6">
                مقایسه مداوم دانش‌آموزان با یکدیگر در جدول‌های رتبه‌بندی عمومی (Leaderboards)، در دانش‌آموزان مضطرب یا دارای پایه ضعیف‌تر ایجاد درماندگی آموخته‌شده می‌کند. در <strong className="text-white">Martia Planner</strong>، مبنای مقایسه <strong className="text-emerald-300">«خودِ قبلیِ دانش‌آموز»</strong> است: سرعت هفته جاری نسبت به هفته گذشته (<MathFormula tex="\Delta W\%" inline />)، و جریمه پایه متناسب با میانگین روزهای فعالِ خود فرد (<MathFormula tex="B" inline />).
              </p>
            </div>

            <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 space-y-2">
              <div className="font-black text-amber-300 text-xs sm:text-sm">
                ۴. مدیریت ریسک‌های روانی: «اثر توجیه بیش از حد» و «اضطراب تنزل سطح»
              </div>
              <p className="text-xs text-slate-300 leading-6">
                • <strong className="text-white">مهار اثر توجیه بیش از حد (Overjustification Effect):</strong> اگر پاداش صرفاً به کمیت خام داده شود، انگیزه درونی یادگیری جای خود را به «جمع‌آوری امتیاز به هر قیمت» می‌دهد. به همین دلیل <MathFormula tex="M_{\text{depth}}" inline /> و هم‌سنجی با <MathFormula tex="E" inline /> طراحی شده‌اند تا امتیاز بدون کیفیت بی‌ارزش شود.
                <br />
                • <strong className="text-white">مهار اضطراب تنزل (Demotion Anxiety):</strong> بر اساس <strong className="text-amber-300">نظریه چشم‌انداز کانمن و تورسکی (Prospect Theory / Loss Aversion)</strong>، دردِ از دست دادن یک دستاورد حدود ۲ برابر قوی‌تر از لذت کسب همان مقدار پاداش است. به همین دلیل تنزل سطح دارای سقف جریمه، تخفیف تلاش جزئی (<MathFormula tex="M_d=0.60" inline />) و نمایش شفافِ «بالاترین مرحله کسب‌شده تاکنون» در کنار «مرحله خالص فعلی» است تا حس دستاورد قبلی فرد نابود نشود.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 9: ارزیابی انتقادی سیستم و پیشنهادهای اصلاحی */}
      {/* ===================================================================== */}
      <section
        id="chapter-9-critical-review"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-black">
              فصل نهم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              ارزیابی انتقادی سیستم و پیشنهادهای اصلاحی (نقد علمی ۱۰ چالش و نقشه راه ارتقا)
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          هیچ مدل ریاضی در علوم رفتاری کامل و بی‌نقص نیست. یک سیستم علمی اصیل، محدودیت‌های معماری فعلی خود را با شفافیت نقد می‌کند تا مسیر تکامل نسخه‌های بعدی مشخص باشد. در ادامه، <strong className="text-orange-300">۱۰ چالش تحلیلی مدل فعلی</strong> را بررسی کرده و راهکارهای پیشنهادی را در <strong className="text-white">۳ سطح اولویت‌بندی‌شده</strong> ارائه می‌دهیم (توجه: این پیشنهادها نقشه راه توسعه آینده هستند و فرمول‌های جاری برنامه بدون تغییر حفظ شده‌اند):
        </p>

        {/* 10 Critical Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-300 leading-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۱. چالش ذهنی بودن خودارزیابی کیفیت (<MathFormula tex="q_i" inline />)</div>
            <p className="text-slate-400">
              امتیاز کیفیت (۱ تا ۵) توسط خود دانش‌آموز ثبت می‌شود و در معرض «سوگیری خوش‌بینی» یا «کمال‌گرایی منفی» قرار دارد. همچنین تبدیل <MathFormula tex="q_i \times 20" inline /> باعث می‌شود کمترین کیفیت ثبت‌شده عدد ۲۰ باشد نه ۰ (در حالی که نگاشت خطی <MathFormula tex="(q_i-1)\times 25" inline /> کل بازه ۰ تا ۱۰۰ را پوشش می‌دهد).
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۲. یکسان فرض شدن دشواری دروس و نوع فعالیت‌ها</div>
            <p className="text-slate-400">
              ۶۰ دقیقه حل تست زمان‌دار فیزیک با ۶۰ دقیقه روخوانی یک درس عمومی ساده، در فرمول پایه <MathFormula tex="T" inline /> وزن یکسانی دارد، در حالی که بار شناختی (Cognitive Load) آن‌ها کاملاً متفاوت است.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۳. خطر کم‌برنامه‌ریزی عمدی (Sandbagging)</div>
            <p className="text-slate-400">
              از آنجا که <MathFormula tex="T" inline /> و <MathFormula tex="F_d" inline /> به زمان پیش‌بینی‌شده وابسته‌اند، کاربر ممکن است برای گرفتن نمره ۱۰۰٪، زمان پیش‌بینی‌شده را بسیار کم ثبت کند (هرچند ضریب حجم <MathFormula tex="M_{\text{volume}}" inline /> در XP تا حد زیادی این ریسک را مهار کرده است، اما در خودِ <MathFormula tex="DS" inline /> هنوز اثرگذار است).
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۴. ریسک خستگی تصمیم‌گیری (Logging Fatigue)</div>
            <p className="text-slate-400">
              ثبت دقیق دقایق واقعی، تعداد تمرین، وضعیت تکمیل، کیفیت هر جلسه و دقایق فعالیت‌های محدود، نیازمند انضباط ثبت بالاست و در دانش‌آموزان کم‌حوصله ممکن است به ثبت سرسری اعداد منجر شود.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۵. نبود ضریب صحت تمرین (Accuracy vs. Volume در شاخص Q)</div>
            <p className="text-slate-400">
              شاخص <MathFormula tex="Q" inline /> در حال حاضر «تعداد تمرین حل‌شده نسبت به هدف» را می‌سنجد، اما مشخص نمی‌کند چند درصد از این تست‌ها درست، غلط یا نزده بوده‌اند و آیا تحلیل تست انجام شده است یا خیر.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۶. هم‌پوشانی بخشی از متغیرها در ضریب عمق یادگیری (<MathFormula tex="M_{\text{depth}}" inline />)</div>
            <p className="text-slate-400">
              در فرمول <MathFormula tex="M_{\text{depth}}" inline />، هم کیفیت وزنی (<MathFormula tex="Q_w" inline />) حضور دارد و هم امتیاز آموزشی درس (<MathFormula tex="E_s" inline />) که خود شامل <MathFormula tex="0.30\,L_s" inline /> است؛ این هم‌خطی ملایم وزن کیفیت خوداظهاری را در ضریب عمق کمی بیش از ظاهر فرمول می‌کند.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۷. حساسیت جریمه تک‌درس در دروس کم‌تکرار هفتگی</div>
            <p className="text-slate-400">
              برای درسی که فقط هفته‌ای ۱ بار در برنامه قرار دارد، از دست رفتن ۲ نوبت متوالی یعنی ۲ هفته وقفه که به درستی بحرانی است؛ اما برای درسی که روزی ۲ نوبت دارد، از دست رفتن ۲ نوبت در یک روزِ خاص (مثلاً به علت سردرد) بلافاصله درس را وارد وضعیت «در معرض افت» می‌کند.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۸. نبود توکن مرخصی اضطراری (Streak Freeze / Grace Day)</div>
            <p className="text-slate-400">
              اگر دانش‌آموز در یک روز که قبلاً برنامه‌ریزی کرده، دچار بیماری ناگهانی یا حادثه پیش‌بینی‌نشده شود، در صورت عدم ویرایش برنامه، سیستم آن روز را غیبت تلقی کرده و زنجیره استمرار را می‌شکند.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۹. وابستگی شاخص کنترل محدودها (C) به خوداظهاری</div>
            <p className="text-slate-400">
              دقایق صرف‌شده در فعالیت‌های محدود (<MathFormula tex="M_{\text{restricted}}" inline />) دستی وارد می‌شود؛ در روزهایی که کاربر اصلاً این بخش را ثبت نمی‌کند، مقدار صفر فرض شده و <MathFormula tex="C=100" inline /> داده می‌شود که می‌تواند امتیاز <MathFormula tex="DS" inline /> را تا ۲۰ واحد به‌طور پیش‌فرض بالا نگه دارد.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="font-black text-orange-300">۱۰. خلأ حلقه بازخورد آزمون‌های استاندارد بیرونی</div>
            <p className="text-slate-400">
              هم‌سنجی فعلی بین <MathFormula tex="XP" inline /> و <MathFormula tex="E" inline /> کاملاً درون‌سیستمی است و هنوز با نمرات امتحانات مدرسه یا تراز آزمون‌های آزمایشی دوهفته‌یک‌بار کالیبره نمی‌شود.
            </p>
          </div>
        </div>

        {/* 3-Tier Actionable Roadmap */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>طبقه‌بندی پیشنهادهای اصلاحی در سه سطح توسعه</span>
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2.5">
              <div className="inline-block px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-black">
                سطح اول: اصلاحات ضروری (Essential Fixes)
              </div>
              <ul className="list-disc list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-white">روبرونی‌سازی مقیاس کیفیت (<MathFormula tex="q_i" inline />):</strong> افزودن راهنمای عینی برای هر عدد (مثلاً ۱=حواس‌پرتی کامل، ۳=درک مطلب بدون تسلط تستی، ۵=تسلط کامل و توانایی توضیح به دیگران) برای کاهش سوگیری ذهنی.
                </li>
                <li>
                  <strong className="text-white">تفکیک «عدم ثبت فعالیت محدود» از «مصرف صفر»:</strong> افزودن تیک تأیید «امروز فعالیت‌های محدود را پایش کردم» تا پاداش ۲۰ درصدی <MathFormula tex="C" inline /> فقط در صورت ثبت آگاهانه اعطا شود.
                </li>
                <li>
                  <strong className="text-white">افزودن وضعیت «مرخصی اضطراری / بیماری»:</strong> امکان علامت‌گذاری حداکثر ۲ روز در ماه به‌عنوان مرخصی موجه بدون شکستن زنجیره استمرار (<MathFormula tex="k" inline />).
                </li>
              </ul>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
              <div className="inline-block px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-black">
                سطح دوم: بهبودهای پیشنهادی (Recommended Enhancements)
              </div>
              <ul className="list-disc list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-white">ضریب سختی درس و نوع تسک:</strong> امکان تعیین ضریب سختی پایه (<MathFormula tex="0.9" inline /> تا <MathFormula tex="1.2" inline />) برای دروس تخصصی در برابر عمومی، و وزن متفاوت برای «تست آموزشی»، «تست زمان‌دار» و «مرور».
                </li>
                <li>
                  <strong className="text-white">کیفیت‌سنجی حل تمرین در شاخص <MathFormula tex="Q" inline />:</strong> افزودن فیلد اختیاری «تعداد پاسخ صحیح و تحلیل‌شده» تا دقت تست‌زنی در کنار تعداد تست سنجیده شود.
                </li>
                <li>
                  <strong className="text-white">تعدیل ضریب حجم در <MathFormula tex="DS" inline />:</strong> اعمال یک ضریب سقف ملایم زمانی در <MathFormula tex="DS" inline /> مشابه <MathFormula tex="M_{\text{volume}}" inline /> در XP برای بستن کامل راه کم‌برنامه‌ریزی.
                </li>
              </ul>
            </div>

            <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 space-y-2.5">
              <div className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-black">
                سطح سوم: قابلیت‌های توسعه آینده (Future Capabilities)
              </div>
              <ul className="list-disc list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-white">ماژول هم‌سنجی با آزمون‌های آزمایشی (External Exam Calibration):</strong> ثبت درصد و تراز آزمون‌های دوهفته‌یک‌بار برای هر درس و مقایسه همبستگی پیرسون بین <MathFormula tex="XP_{\text{net},s}" inline /> و درصد آزمون واقعی.
                </li>
                <li>
                  <strong className="text-white">الگوریتم مرور با فاصله (Spaced Repetition Trigger):</strong> پیشنهاد خودکار زمان مرور هر مبحث بر اساس شاخص تسلط (<MathFormula tex="\text{Mastery}_s" inline />) و منحنی فراموشی.
                </li>
                <li>
                  <strong className="text-white">پروفایل‌های آماده تنظیم ضرایب:</strong> ارائه پریست‌های علمی (مثلاً «پروفایل کنکوری تست‌محور»، «پروفایل امتحانات تشریحی»، «پروفایل شروع مجدد برای دانش‌آموزان کم‌انگیزه»).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* CHAPTER 10: جمع‌بندی، فلسفه نهایی و منابع علمی */}
      {/* ===================================================================== */}
      <section
        id="chapter-10-conclusion-references"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 scroll-mt-20 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-black">
              فصل دهم
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              جمع‌بندی، فلسفه نهایی Martia Planner و فهرست منابع علمی
            </h2>
          </div>
          <button
            data-scroll-top="true"
            onClick={scrollToTop}
            className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>بازگشت به فهرست</span>
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-7 text-justify">
          <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/40 border border-teal-500/30 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm sm:text-base font-black text-teal-300">
              بیانیه فلسفه نهایی سیستم ارزیابی Martia Planner
            </h3>
            <p>
              فلسفه بنیادین <strong className="text-white">Martia Planner</strong> بر این اصل استوار است که <strong className="text-teal-300">«موفقیت تحصیلی پایدار، حاصل ضربِ کمیتِ هدفمند، کیفیتِ متمرکز، تمرینِ فعال، خودتنظیمیِ دیجیتال و استمرارِ متوازن در همه دروس است.»</strong> در این معماری، هیچ تک‌شاخصی به تنهایی حاکم مطلق نیست: زمان مطالعه بدون تمرین و کیفیت، امتیاز آموزشی (<MathFormula tex="E" inline />) را بالا نمی‌برد؛ امتیاز آموزشی بدون مهار حواس‌پرتی دیجیتال (<MathFormula tex="C" inline />)، امتیاز نهایی روز (<MathFormula tex="DS" inline />) را کامل نمی‌کند؛ تلاش مقطعی بدون پیوستگی، در برابر ضریب وقفه (<MathFormula tex="r_d(k)" inline />) دوام نمی‌آورد؛ و پیشرفت در یک درس، عقب‌ماندگی در درس دیگر را پنهان نمی‌سازد. هدف نهایی این نظام عددی، مچ‌گیری یا ایجاد اضطراب نیست، بلکه تبدیل شدن به یک <strong className="text-white">«آینه فراشناختی صادق و منصف»</strong> است که به یادگیرنده نشان می‌دهد هر ساعت از عمر و انرژی ذهنی او با چه بازدهی به رشد واقعی تبدیل شده است.
            </p>
          </div>

          {/* Scientific References */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-black text-sm border-b border-slate-800 pb-2.5">
              <Library className="w-4 h-4 text-indigo-400" />
              <span>منابع و مطالعات پیشنهادی (References & Further Reading)</span>
            </div>
            <p className="text-xs text-slate-400">
              مبانی نظری، روان‌شناختی و آماری مطرح‌شده در این مقاله برگرفته از پژوهش‌ها و آثار کلاسیک زیر در حوزه روان‌شناسی تربیتی، علوم شناختی و آمار مقاوم است:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 dir-ltr text-left font-mono bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 leading-relaxed" dir="ltr">
              <li>
                1. <strong>Zimmerman, B. J. (2002).</strong> Becoming a Self-Regulated Learner: An Overview. <em>Theory Into Practice</em>, 41(2), 64–70. (مبنای چرخه سه‌گانه پیش‌اندیشی، اجرا و بازتاب در پایش برنامه روزانه)
              </li>
              <li>
                2. <strong>Ryan, R. M., & Deci, E. L. (2000).</strong> Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being. <em>American Psychologist</em>, 55(1), 68–78. (مبنای نیازهای خودمختاری و شایستگی در هدف‌گذاری شخصی و بازخورد چندبعدی)
              </li>
              <li>
                3. <strong>Locke, E. A., & Latham, G. P. (2002).</strong> Building a Practically Useful Theory of Goal Setting and Task Motivation: A 35-Year Odyssey. <em>American Psychologist</em>, 57(9), 705–717. (مبنای خرد کردن اهداف کلان به ۳۹ مرحله دست‌یافتنی و مشخص)
              </li>
              <li>
                4. <strong>Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013).</strong> Improving Students’ Learning With Effective Learning Techniques: Promising Directions From Cognitive and Educational Psychology. <em>Psychological Science in the Public Interest</em>, 14(1), 4–58. (مبنای وزن‌دهی بالا به حل تمرین فعال Q و توزیع مطالعه در طول زمان به جای انباشت شب امتحان)
              </li>
              <li>
                5. <strong>Ebbinghaus, H. (1885/1913).</strong> <em>Memory: A Contribution to Experimental Psychology</em>. Teachers College, Columbia University. (مبنای منحنی فراموشی و تشدید ضریب وقفه در رها کردن متوالی یک درس خاص)
              </li>
              <li>
                6. <strong>Kahneman, D., & Tversky, A. (1979).</strong> Prospect Theory: An Analysis of Decision under Risk. <em>Econometrica</em>, 47(2), 263–291. (مبنای زیان‌گریزی، مهار اضطراب تنزل سطح و ضرورت سقف‌گذاری روی جریمه‌ها)
              </li>
              <li>
                7. <strong>Wilcox, R. R. (2012).</strong> <em>Introduction to Robust Estimation and Hypothesis Testing</em> (3rd ed.). Academic Press. (مبنای استفاده از آماره‌های مقاوم شامل میانه، دامنه میان‌چارکی IQR و میانگین پیراسته Trimmed Mean در داده‌های رفتاری پرنوسان)
              </li>
              <li>
                8. <strong>Strathern, M. (1997).</strong> “Improving Ratings”: Audit in the British University System. <em>European Review</em>, 5(3), 305–321. [Goodhart’s Law in Educational Measurement] (مبنای نقد ارزیابی تک‌بعدی ساعت‌محور و طراحی سیستم هم‌سنجی XP با شاخص آموزشی E)
              </li>
            </ul>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
