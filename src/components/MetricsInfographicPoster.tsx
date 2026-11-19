import React, { useState } from 'react';
import {
  ArrowDown,
  Download,
  Printer,
  Eye,
  Scale,
  CheckCircle2,
  Trophy,
  BookOpen,
} from 'lucide-react';

interface LevelThresholdRow {
  levelLabel: string;
  honoraryTitle: string;
  globalSteps: [string, string, string];
  subjectSteps: [string, string, string];
}

const COMPLETE_13_LEVELS_39_STAGES_DATA: LevelThresholdRow[] = [
  {
    levelLabel: 'سطح ۱: سنگ (Stone)',
    honoraryTitle: 'آغازگر مسیر',
    globalSteps: ['مرحله ۱: ۰ XP', 'مرحله ۲ (+): ۲۰ XP', 'مرحله ۳ (★): ۴۵ XP'],
    subjectSteps: ['مرحله ۱: ۰ XP', 'مرحله ۲ (+): ۶ XP', 'مرحله ۳ (★): ۱۳ XP'],
  },
  {
    levelLabel: 'سطح ۲: مس (Copper)',
    honoraryTitle: 'در حال پیشرفت',
    globalSteps: ['مرحله ۴: ۸۰ XP', 'مرحله ۵ (+): ۱۲۵ XP', 'مرحله ۶ (★): ۱۸۰ XP'],
    subjectSteps: ['مرحله ۴: ۲۱ XP', 'مرحله ۵ (+): ۳۰ XP', 'مرحله ۶ (★): ۴۱ XP'],
  },
  {
    levelLabel: 'سطح ۳: آهن (Iron)',
    honoraryTitle: 'پرتلاش و استوار',
    globalSteps: ['مرحله ۷: ۲۵۰ XP', 'مرحله ۸ (+): ۳۳۵ XP', 'مرحله ۹ (★): ۴۳۵ XP'],
    subjectSteps: ['مرحله ۷: ۵۴ XP', 'مرحله ۸ (+): ۶۹ XP', 'مرحله ۹ (★): ۸۶ XP'],
  },
  {
    levelLabel: 'سطح ۴: برنز (Bronze)',
    honoraryTitle: 'تلاشگر پیگیر',
    globalSteps: ['مرحله ۱۰: ۵۵۰ XP', 'مرحله ۱۱ (+): ۶۸۵ XP', 'مرحله ۱۲ (★): ۸۳۵ XP'],
    subjectSteps: ['مرحله ۱۰: ۱۰۵ XP', 'مرحله ۱۱ (+): ۱۲۶ XP', 'مرحله ۱۲ (★): ۱۵۰ XP'],
  },
  {
    levelLabel: 'سطح ۵: نیکل (Nickel)',
    honoraryTitle: 'متعهد به پیشرفت',
    globalSteps: ['مرحله ۱۳: ۱٬۰۰۵ XP', 'مرحله ۱۴ (+): ۱٬۲۰۰ XP', 'مرحله ۱۵ (★): ۱٬۴۱۵ XP'],
    subjectSteps: ['مرحله ۱۳: ۱۷۶ XP', 'مرحله ۱۴ (+): ۲۰۵ XP', 'مرحله ۱۵ (★): ۲۳۷ XP'],
  },
  {
    levelLabel: 'سطح ۶: نقره (Silver)',
    honoraryTitle: 'پیشرو',
    globalSteps: ['مرحله ۱۶: ۱٬۶۵۰ XP', 'مرحله ۱۷ (+): ۱٬۹۱۰ XP', 'مرحله ۱۸ (★): ۲٬۱۹۵ XP'],
    subjectSteps: ['مرحله ۱۶: ۲۷۱ XP', 'مرحله ۱۷ (+): ۳۰۸ XP', 'مرحله ۱۸ (★): ۳۴۸ XP'],
  },
  {
    levelLabel: 'سطح ۷: تیتانیوم (Titanium)',
    honoraryTitle: 'توانمند',
    globalSteps: ['مرحله ۱۹: ۲٬۵۰۵ XP', 'مرحله ۲۰ (+): ۲٬۸۴۰ XP', 'مرحله ۲۱ (★): ۳٬۲۰۰ XP'],
    subjectSteps: ['مرحله ۱۹: ۳۹۱ XP', 'مرحله ۲۰ (+): ۴۳۷ XP', 'مرحله ۲۱ (★): ۴۸۷ XP'],
  },
  {
    levelLabel: 'سطح ۸: طلا (Gold)',
    honoraryTitle: 'درخشان',
    globalSteps: ['مرحله ۲۲: ۳٬۵۹۰ XP', 'مرحله ۲۳ (+): ۴٬۰۰۵ XP', 'مرحله ۲۴ (★): ۴٬۴۵۰ XP'],
    subjectSteps: ['مرحله ۲۲: ۵۴۰ XP', 'مرحله ۲۳ (+): ۵۹۶ XP', 'مرحله ۲۴ (★): ۶۵۶ XP'],
  },
  {
    levelLabel: 'سطح ۹: زمرد (Emerald)',
    honoraryTitle: 'برجسته',
    globalSteps: ['مرحله ۲۵: ۴٬۹۲۵ XP', 'مرحله ۲۶ (+): ۵٬۴۳۰ XP', 'مرحله ۲۷ (★): ۵٬۹۶۵ XP'],
    subjectSteps: ['مرحله ۲۵: ۷۱۹ XP', 'مرحله ۲۶ (+): ۷۸۶ XP', 'مرحله ۲۷ (★): ۸۵۶ XP'],
  },
  {
    levelLabel: 'سطح ۱۰: پلاتینیوم (Platinum)',
    honoraryTitle: 'حرفه‌ای',
    globalSteps: ['مرحله ۲۸: ۶٬۵۳۰ XP', 'مرحله ۲۹ (+): ۷٬۱۳۰ XP', 'مرحله ۳۰ (★): ۷٬۷۶۰ XP'],
    subjectSteps: ['مرحله ۲۸: ۹۳۰ XP', 'مرحله ۲۹ (+): ۱٬۰۰۸ XP', 'مرحله ۳۰ (★): ۱٬۰۸۹ XP'],
  },
  {
    levelLabel: 'سطح ۱۱: یاقوت (Ruby)',
    honoraryTitle: 'نخبه',
    globalSteps: ['مرحله ۳۱: ۸٬۴۲۵ XP', 'مرحله ۳۲ (+): ۹٬۱۲۵ XP', 'مرحله ۳۳ (★): ۹٬۸۶۰ XP'],
    subjectSteps: ['مرحله ۳۱: ۱٬۱۷۴ XP', 'مرحله ۳۲ (+): ۱٬۲۶۳ XP', 'مرحله ۳۳ (★): ۱٬۳۵۶ XP'],
  },
  {
    levelLabel: 'سطح ۱۲: الماس (Diamond)',
    honoraryTitle: 'استاد',
    globalSteps: ['مرحله ۳۴: ۱۰٬۶۳۰ XP', 'مرحله ۳۵ (+): ۱۱٬۴۳۵ XP', 'مرحله ۳۶ (★): ۱۲٬۲۷۵ XP'],
    subjectSteps: ['مرحله ۳۴: ۱٬۴۵۳ XP', 'مرحله ۳۵ (+): ۱٬۵۵۴ XP', 'مرحله ۳۶ (★): ۱٬۶۵۹ XP'],
  },
  {
    levelLabel: 'سطح ۱۳: کربونادو (Black Diamond)',
    honoraryTitle: 'اسطوره',
    globalSteps: ['مرحله ۳۷: ۱۳٬۱۴۵ XP', 'مرحله ۳۸ (+): ۱۴٬۰۵۵ XP', 'مرحله ۳۹ (★): ۱۵٬۰۰۰+ XP'],
    subjectSteps: ['مرحله ۳۷: ۱٬۷۶۹ XP', 'مرحله ۳۸ (+): ۱٬۸۸۳ XP', 'مرحله ۳۹ (★): ۲٬۰۰۰+ XP'],
  },
];

export const MetricsInfographicPoster: React.FC = () => {
  const [showSampleNumbers, setShowSampleNumbers] = useState<boolean>(true);

  const handlePrintPoster = () => {
    window.print();
  };

  const handleDownloadStandalonePoster = () => {
    const posterEl = document.getElementById('martia-metrics-infographic-poster');
    if (!posterEl) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>پوستر اینفوگرافیک جامع شاخص‌ها و فرمول‌های Martia Planner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
  <style>
    body { font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    @media print { body { background: #ffffff; color: #0f172a; padding: 0; } }
  </style>
</head>
<body>
  <div class="max-w-7xl mx-auto">
    ${posterEl.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MartiaPlanner-Metrics-Infographic-Poster.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Poster Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSampleNumbers((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              showSampleNumbers
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>
              {showSampleNumbers
                ? 'نمایش اعداد نمونه یک‌هفته‌ای روی پوستر: روشن'
                : 'نمایش اعداد نمونه یک‌هفته‌ای روی پوستر: خاموش'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadStandalonePoster}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>دانلود فایل پوستر (HTML)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPoster}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN INFOGRAPHIC POSTER CANVAS
         ===================================================================== */}
      <div
        id="martia-metrics-infographic-poster"
        className="rounded-3xl bg-slate-950 text-slate-100 p-5 sm:p-8 border border-slate-800 shadow-xl space-y-8"
      >
        {/* POSTER HEADER */}
        <div className="border-b border-slate-800 pb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-indigo-400 tracking-wide">
              نقشه معماری محاسبات، وزن‌ها، ضرایب، آستانه‌های ۳۹ مرحله‌ای و ارتباط شاخص‌ها در یک نگاه
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
              پوستر اینفوگرافیک جامع شاخص‌ها و فرمول‌های Martia Planner
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              از لحظه ثبت یک فعالیت روزانه تا محاسبه امتیاز نهایی روز (DS)، شاخص F_d، تراز XP، ضریب عمق یادگیری (M_depth) و سطح ۳۹ پله‌ای کل و دروس
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">مؤلفه‌های پایه</div>
              <div className="text-sm font-black text-indigo-400 tabular-nums" dir="ltr">
                T · Q · L · C
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">امتیازهای ترکیبی</div>
              <div className="text-sm font-black text-emerald-400 tabular-nums" dir="ltr">
                E (80%) + C (20%)
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">مقیاس XP و F_d</div>
              <div className="text-sm font-black text-amber-400 tabular-nums">
                ۵ منبع + جریمه وقفه
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">سیستم ارتقا</div>
              <div className="text-sm font-black text-purple-400 tabular-nums">
                ۱۳ سطح × ۳ پله = ۳۹
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 1: DAILY & PERIOD SCORE PIPELINE (T, Q, L -> E -> + C -> DS)
           ===================================================================== */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                ۱
              </span>
              <span>مسیر اول: مهندسی امتیاز عملکرد روزانه (DS) و میانگین دوره</span>
            </h3>
            <span className="text-xs text-slate-400">
              ورودی‌های درسی چطور با وزن‌های ۴۰٪، ۳۰٪ و ۳۰٪ ترکیب شده و با ضریب کنترل سرگرمی (۲۰٪) امتیاز نهایی روز را می‌سازند؟
            </span>
          </div>

          {/* Step 1: 3 Educational Pillars + 1 Restricted Pillar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Pillar 1: Study Time T */}
            <div className="rounded-2xl bg-slate-900 border border-indigo-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-400">۱. تحقق زمان مطالعه (T)</span>
                  <span className="text-xs font-mono font-black text-indigo-300" dir="ltr">
                    وزن در E: 40%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  نسبت زمان واقعی مطالعه به پیش‌بینی اولیه (با سقف ۱۰۰٪)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  T = min(100, round((t_actual / t_init_pred) × 100))
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-indigo-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">مثال شنبه ۱۶ آبان:</div>
                  <div>واقعی ۲۱۰ دقیقه ÷ پیش‌بینی ۲۱۰ دقیقه = ۱۰۰٪</div>
                </div>
              )}
            </div>

            {/* Pillar 2: Exercises Q */}
            <div className="rounded-2xl bg-slate-900 border border-sky-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-400">۲. تحقق تست و تمرین (Q)</span>
                  <span className="text-xs font-mono font-black text-sky-300" dir="ltr">
                    وزن در E: 30%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  نسبت تست حل‌شده به تست هدف (در روز بدون تست: حذف خودکار از مخرج)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  Q = target &gt; 0 ? min(100, round((ex_act / ex_target) × 100)) : null
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-sky-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">مثال شنبه ۱۶ آبان:</div>
                  <div>۴۷ تست واقعی ÷ ۴۵ تست هدف = ۱۰۴٪ ← سقف ۱۰۰٪</div>
                </div>
              )}
            </div>

            {/* Pillar 3: Weighted Learning Quality L */}
            <div className="rounded-2xl bg-slate-900 border border-purple-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-400">۳. کیفیت یادگیری وزنی (L)</span>
                  <span className="text-xs font-mono font-black text-purple-300" dir="ltr">
                    وزن در E: 30%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  میانگین وزنی کیفیت (۰ تا ۱۰) بر اساس دقایق مطالعه واقعی هر درس × ۱۰
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  Q_w = Σ(q_i × t_i) / Σ(t_i) , L = round(Q_w × 10)
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-purple-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">مثال شنبه ۱۶ آبان:</div>
                  <div>۱۷۹۲.۵ ÷ ۲۱۰ دقیقه = ۸.۵ از ۱۰ ← شاخص L = ۸۵٪</div>
                </div>
              )}
            </div>

            {/* Pillar 4: Restricted Activities Control C */}
            <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400">۴. کنترل سرگرمی‌ها (C)</span>
                  <span className="text-xs font-mono font-black text-amber-300" dir="ltr">
                    وزن در DS: 20%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  رعایت سقف مجاز فعالیت‌های محدودشونده (موبایل، بازی، وب‌گردی)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  C_i = min(100, round((allowed / actual) × 100))
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">شنبه ۱۶ آبان در برابر سه‌شنبه ۱۹ آبان:</div>
                  <div>شنبه (۴۵ از ۶۰ دقیقه) ← ۱۰۰٪ | سه‌شنبه (۱۲۰ از ۶۰ دقیقه) ← ۵۰٪</div>
                </div>
              )}
            </div>
          </div>

          {/* Downward Connectors */}
          <div className="flex justify-center py-1">
            <ArrowDown className="w-6 h-6 text-indigo-400" />
          </div>

          {/* Step 2: E -> DS -> Period Average */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            {/* Box A: Direct Educational Score E */}
            <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-indigo-300">
                  امتیاز مستقیم آموزشی روز (E)
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400" dir="ltr">
                  وزن در DS: 80%
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 border border-slate-800 space-y-1"
              >
                <div>با هدف تست: E = 0.40×T + 0.30×Q + 0.30×L</div>
                <div className="text-amber-300">
                  بدون هدف تست: E = (0.40×T + 0.30×L) ÷ 0.70
                </div>
                <div className="text-[11px] text-slate-400">
                  (معادل 57.1% وزن برای زمان T و 42.9% برای کیفیت L)
                </div>
              </div>
              {showSampleNumbers && (
                <div className="text-xs text-indigo-200 tabular-nums">
                  شنبه ۱۶ آبان: (۱۰۰×۰.۴) + (۱۰۰×۰.۳) + (۸۵×۰.۳) = <strong>۹۶٪</strong>
                </div>
              )}
            </div>

            {/* Box B: Final Daily Score DS */}
            <div className="rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-emerald-300">
                  امتیاز نهایی عملکرد روزانه (DS / S)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400" dir="ltr">
                  0 .. 100%
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 border border-slate-800 space-y-1"
              >
                <div>DS = round((E × 0.80) + (C × 0.20))</div>
                <div className="text-[11px] text-slate-400">
                  اگر سرگرمی ثبت نشود (C = null) ← DS = E
                </div>
              </div>
              {showSampleNumbers && (
                <div className="text-xs text-emerald-200 tabular-nums">
                  شنبه ۱۶ آبان: (۹۶ × ۰.۸۰) + (۱۰۰ × ۰.۲۰) = ۷۶.۸ + ۲۰ = <strong>۹۷٪</strong>
                </div>
              )}
            </div>

            {/* Box C: Period Aggregation */}
            <div className="rounded-2xl bg-purple-950/40 border border-purple-500/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-purple-300">
                  امتیاز عملکرد کلی دوره (هفتگی / ماهانه)
                </span>
                <span className="text-xs font-mono font-bold text-purple-400" dir="ltr">
                  Period Summary
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 border border-slate-800 space-y-1"
              >
                <div>Period_DS = round(Σ(DS_i) / ValidDays)</div>
                <div>Period_Qw = Σ(q_i × t_i) / Σ(t_i) (کل دوره)</div>
              </div>
              {showSampleNumbers && (
                <div className="text-xs text-purple-200 tabular-nums">
                  میانگین ۷ روز هفته نمونه (۱۶ تا ۲۲ آبان): <strong>۸۳٪</strong> | کیفیت وزنی کل هفته: <strong>۸.۴ از ۱۰</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 2: GLOBAL XP LEDGER (+XP, F_d BOX, -XP PENALTY & 39-STAGE GLOBAL LEVEL)
           ===================================================================== */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-600 text-white text-xs font-black flex items-center justify-center">
                ۲
              </span>
              <span>مسیر دوم: موتور ترازنامه XP کل (+XP مثبت، شاخص F_d، جریمه -XP و سطح کل ۳۹ پله‌ای)</span>
            </h3>
            <span className="text-xs text-slate-400">
              ۵ منبع پاداش روزانه منهای جریمه روزهای وقفه درسی، جایگاه دانش‌آموز را در ۳۹ پله سراسری تعیین می‌کند
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 5 Positive XP Sources (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-emerald-500/40 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-400">
                    الف) ۵ منبع کسب XP مثبت روزانه (+XP Gross)
                  </span>
                  <span className="text-xs font-mono text-emerald-300" dir="ltr">
                    مقیاس ۱/۱۰
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span>۱. هر فعالیت تکمیل‌شده (Completed)</span>
                    <span className="font-mono font-black text-emerald-400" dir="ltr">
                      count × 5.0 XP
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span>۲. هر فعالیت ناقص (Partial)</span>
                    <span className="font-mono font-black text-emerald-400" dir="ltr">
                      count × 2.5 XP
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span>۳. زمان مطالعه واقعی درسی</span>
                    <span className="font-mono font-black text-emerald-400" dir="ltr">
                      minutes ÷ 50 (0.02/min)
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span>۴. هر تست / تمرین حل‌شده</span>
                    <span className="font-mono font-black text-emerald-400" dir="ltr">
                      exercises × 0.2 XP
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span>۵. پاداش کیفیت هر جلسه مطالعه</span>
                    <span className="font-mono font-black text-emerald-400" dir="ltr">
                      Σ (quality_0_10 × 0.2)
                    </span>
                  </div>
                </div>
              </div>

              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-xs text-emerald-200 tabular-nums">
                  جمع کل XP مثبت هفته نمونه (۱۶ تا ۲۲ آبان): <strong>+۲۶۲.۴ XP</strong>
                </div>
              )}
            </div>

            {/* Dedicated Box for F_d (60% Time + 40% Tasks) (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-slate-900 border-2 border-amber-500/50 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>ب) کادر ویژه شاخص تحقق برنامه روز (F_d)</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-400" dir="ltr">
                    60% Time + 40% Tasks
                  </span>
                </div>

                <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1.5 leading-5">
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-300">۱. سهم ۶۰٪ تحقق زمان (TimeRatio):</strong>
                    <code dir="ltr" className="text-emerald-300">
                      0.60 × min(1, ActMins / PlanMins)
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-sky-300">۲. سهم ۴۰٪ تکمیل فعالیت (TaskRatio):</strong>
                    <code dir="ltr" className="text-emerald-300">
                      0.40 × ((Comp×1 + Part×0.5) / Total)
                    </code>
                  </div>
                  <div
                    dir="ltr"
                    className="pt-1 border-t border-slate-800 font-mono text-amber-300 font-bold text-center"
                  >
                    F_d = round2(0.60×TimeRatio + 0.40×TaskRatio) | M_d = 1 - F_d
                  </div>
                </div>

                <div className="bg-amber-950/30 rounded-xl p-2.5 border border-amber-500/30 text-[11px] space-y-1 leading-5 text-slate-200 tabular-nums">
                  <div className="font-bold text-amber-300">
                    مثال عددی (۴ فعالیت ۲۰۰ دقیقه ← ۱ کامل، ۱ ناقص، ۲ رهاشده، ۸۰ دقیقه واقعی):
                  </div>
                  <div>• سهم ۶۰٪ زمان: 0.60 × (80 ÷ 200) = 0.60 × 0.40 = <strong>0.24 (۲۴٪)</strong></div>
                  <div>• سهم ۴۰٪ فعالیت‌ها: 0.40 × ((1 + 0.5) ÷ 4) = 0.40 × 0.375 = <strong>0.15 (۱۵٪)</strong></div>
                  <div>• جمع F_d = 0.24 + 0.15 = <strong>0.39 (۳۹٪)</strong> ← بخش انجام‌نشده M_d = 1 - 0.39 = <strong>0.61</strong></div>
                </div>
              </div>

              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-200 tabular-nums">
                  سه‌شنبه ۱۹ آبان (۲۵ دقیقه از ۱۸۰ دقیقه و ۱ ناقص از ۳ فعالیت): F_d = 0.083 + 0.067 = <strong>0.15 (۱۵٪)</strong> و M_d = <strong>0.85</strong>
                </div>
              )}
            </div>

            {/* Negative XP Penalty Engine & Net Global XP (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-rose-500/40 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-rose-400">
                    ج) فرمول جریمه عدم فعالیت (-XP Penalty)
                  </span>
                  <span className="text-xs font-mono text-rose-300" dir="ltr">
                    P_d = B × r_d × M_d
                  </span>
                </div>

                <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1.5 leading-5">
                  <div className="text-amber-300 font-bold">
                    شرط معافیت روزانه (روز فعال مؤثر):
                  </div>
                  <div>
                    اگر <code dir="ltr">F_d ≥ 0.50</code> <strong>یا</strong> حداقل ۳۰ دقیقه مطالعه با کیفیت ≥ ۴ ثبت شود ←{' '}
                    <span className="text-emerald-400 font-bold">جریمه = ۰</span>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1 leading-5">
                  <div>
                    <strong className="text-rose-300">B (پایه جریمه روزانه):</strong> ۱۰٪ میانگین XP روزهای فعال قبلی، مقید در بازه <code dir="ltr">[1.0 .. 10.0 XP]</code>
                  </div>
                  <div>
                    <strong className="text-rose-300">r_d (ضریب تکرار وقفه با گام +0.50):</strong>{' '}
                    <code dir="ltr">[1.0 , 1.5 , 2.0 , 2.5 , 3.0 , 3.5 , 4.0]</code>
                  </div>
                  <div>
                    <strong className="text-rose-300">M_d (نسبت تعهد انجام‌نشده):</strong>{' '}
                    <code dir="ltr">1 - F_d</code>
                  </div>
                </div>
              </div>

              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-xs text-rose-200 tabular-nums space-y-1">
                  <div>
                    سه‌شنبه ۱۹ آبان (F_d = 15%): ۴.۲۷ × ۱.۰ × ۰.۸۵ = <strong>-۳.۶۳ XP کسر شد</strong>
                  </div>
                  <div className="text-emerald-300 font-bold">
                    XP خالص هفته نمونه: ۲۶۲.۴ - ۳.۶۳ = ۲۵۸.۷۷ XP (مرحله ۷ از ۳۹: آهن / Iron)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 3: INDEPENDENT SUBJECT XP, M_depth, E_s & r_s(k_s) BREAKDOWN
           ===================================================================== */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                ۳
              </span>
              <span>مسیر سوم: فرمول مستقل XP هر درس، ضریب عمق یادگیری (M_depth)، اثر جلسات رهاشده بر E_s و ضرایب تشدید (r_s)</span>
            </h3>
            <span className="text-xs text-slate-400">
              کالبدشکافی کامل متغیرهای بند ۱۴ راهنما: سهم ۴ عامل در M_depth، کلاهک سقف (Cap/Clamp)، مخرج E_s و گام +0.35 در جریمه درس
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Raw Effort XP & Subject Net XP */}
            <div className="rounded-2xl bg-slate-900 border border-emerald-500/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400">
                  ۱. تلاش خام درس (XP_raw,s)
                </span>
                <span className="text-[10px] font-mono text-emerald-300" dir="ltr">
                  5 Sources + ActiveDays
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800 leading-5"
              >
                XP_raw,s = (Comp×5) + (Part×2.5) + (Mins÷50) + (Ex×0.2) + Σ(q×0.2) + (D_active,s × 1.0)
              </div>
              <p className="text-[11px] text-slate-300 leading-5">
                علاوه بر ۵ منبع پایه فعالیت‌های همان درس، به ازای هر روز مجزایی که آن درس مطالعه شده (<code dir="ltr">D_active,s</code>)، <strong>+۱.۰ واحد XP</strong> پاداش تنوع زمانی اضافه می‌شود (در مثال علوم: <code dir="ltr">15 + 5.90 + 4.60 + 3.00 = 28.50 XP</code> پایه و با پاداش کیفیت <code dir="ltr">+4.60 = 33.10 XP</code>).
              </p>
            </div>

            {/* Card 2: Mastery_s (45% + 35% + 10% + 10%) & M_depth + Cap/Clamp */}
            <div className="rounded-2xl bg-slate-900 border border-cyan-500/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-400">
                  ۲. ضریب عمق یادگیری = ضریب اثربخشی (M_depth)
                </span>
                <span className="text-[10px] font-mono text-cyan-300" dir="ltr">
                  0.75x .. 1.25x (Cap)
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-cyan-300 border border-slate-800 leading-5"
              >
                Mastery_s = 0.45×(Q_w/10) + 0.35×(E_s/100) + 0.10×TaskRatio + 0.10×min(1, D_active/25)
                <br />
                M_depth = EffectivenessMultiplier = round2(0.28 + 0.97 × Mastery_s)
              </div>
              <p className="text-[11px] text-slate-300 leading-5">
                <strong>ضریب اثربخشی دقیقاً همان ضریب عمق یادگیری (<code dir="ltr">M_depth</code>) است!</strong> سهم عوامل (۱۰۰٪): ۴۵٪ کیفیت وزنی + ۳۵٪ امتیاز آموزشی درس (<code dir="ltr">E_s</code>) + ۱۰٪ تکمیل جلسات + ۱۰٪ استمرار روزها (با <strong>کلاهک سقف ۲۵ روز</strong> <code dir="ltr">min(1, D/25)</code>). در تسلط کامل (۱.۰) به سقف <strong>۱.۲۵×</strong> و در تسلط ۴۸٪ به <strong>۰.۷۵×</strong> می‌رسد.
              </p>
            </div>

            {/* Card 3: How E_s works & How Abandoned Sessions lower E_s */}
            <div className="rounded-2xl bg-slate-900 border border-indigo-500/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-400">
                  ۳. فرمول E_s و اثر «جلسات رهاشده» در مخرج آن
                </span>
                <span className="text-[10px] font-mono text-indigo-300" dir="ltr">
                  40% T_s + 30% Q_s + 30% L_s
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-indigo-300 border border-slate-800 leading-5"
              >
                T_s = ΣActualMins ÷ ΣPlannedMins_All × 100
                <br />
                Q_s = ΣActualEx ÷ ΣTargetEx_All × 100
                <br />
                E_s = round(0.40×T_s + 0.30×Q_s + 0.30×L_s)
              </div>
              <p className="text-[11px] text-slate-300 leading-5">
                <strong>چطور جلسه رهاشده از E_s کم می‌کند؟</strong> در <code dir="ltr">E_s</code> فقط همین ۳ عامل وجود دارد؛ اما وقتی جلسه‌ای از درس رها می‌شود، <strong>زمان پیش‌بینی‌شده و تست هدف آن جلسه به مخرج کسرهای T_s و Q_s اضافه می‌شود</strong> ولی به صورتِ کسر عدد <strong>۰</strong> اضافه می‌گردد و <code dir="ltr">T_s</code> و <code dir="ltr">Q_s</code> و <code dir="ltr">E_s</code> را کاهش می‌دهد!
              </p>
            </div>

            {/* Card 4: B_s, r_s(k_s) & XP_net,s */}
            <div className="rounded-2xl bg-slate-900 border border-rose-500/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-400">
                  ۴. جریمه نوبت ازدست‌رفته و XP خالص درس
                </span>
                <span className="text-[10px] font-mono text-rose-300" dir="ltr">
                  Step +0.35 (Max 2.5x)
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-rose-300 border border-slate-800 leading-5"
              >
                XP_gross,s = round2(XP_raw,s × M_depth)
                <br />
                B_s = clamp(0.12 × XP_avg_session, 0.60, 4.50)
                <br />
                r_s(k_s) = [1.00 , 1.35 , 1.70 , 2.05 , 2.50]
                <br />
                XP_net,s = max(0, XP_gross,s - Σ(B_s × r_s × (1 - F_s,d)))
              </div>
              <p className="text-[11px] text-slate-300 leading-5">
                از حاصل‌ضرب تلاش خام در <code dir="ltr">M_depth</code>، امتیاز ناخالص (<code dir="ltr">XP_gross,s</code>) به دست می‌آید و با کسر جریمه نوبت‌های ازدست‌رفته (<code dir="ltr">B_s × r_s(k_s) × (1 - F_s,d)</code> با گام +0.35)، امتیاز خالص نهایی درس (<code dir="ltr">XP_net,s</code>) و پله ۱ تا ۳۹ آن درس تعیین می‌شود.
              </p>
            </div>
          </div>

          {/* Step-by-Step Numerical Example Strip for Subject E_s, M_depth, XP_raw, Penalty & XP_net */}
          {showSampleNumbers && (
            <div className="rounded-2xl bg-emerald-950/25 border border-emerald-500/40 p-4 space-y-2 text-xs text-slate-200 tabular-nums">
              <div className="flex items-center gap-2 font-black text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  مثال واقعی گام‌به‌گام از درس علوم و ریاضی (تلاش خام XP_raw، ضریب M_depth، جریمه نوبت ازدست‌رفته و XP خالص درس):
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px] leading-6">
                <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-800">
                  <strong className="text-indigo-300">۱. درس ریاضی در هفته نمونه (۴ جلسه کامل + ۱ جلسه رهاشده در سه‌شنبه):</strong> در ۴ جلسه انجام‌شده، ۳۵۰ دقیقه از ۳۳۰ دقیقه خوانده شده (۱۰۰٪) و ۱۱۴ تست از ۱۱۰ تست حل شده (۱۰۰٪) با کیفیت ۸.۸۹ (L_s = 89%). چون جلسه پنجم (۷۵ دقیقه و ۲۰ تست) رها شده، مخرج زمان به <code dir="ltr">405</code> دقیقه (<code dir="ltr">T_s = 86%</code>) و مخرج تست به <code dir="ltr">130</code> تست (<code dir="ltr">Q_s = 88%</code>) رسیده و <code dir="ltr">E_s = 88%</code> شده است. تلاش خام: <code dir="ltr">20 (۴ کامل) + 7.0 (زمان) + 22.8 (تست) + 7.1 (کیفیت) + 4.0 (۴ روز فعال) = 60.90 XP</code> ← ضرب در <code dir="ltr">M_depth = 1.01</code> برابر <code dir="ltr">XP_gross = 61.51 XP</code> ← کسر جریمه ۱ نوبت غیبت (<code dir="ltr">1.85 XP</code>) ← <code dir="ltr">XP_net = 59.66 XP</code> (مرحله ۷: آهن).
                </div>
                <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-800">
                  <strong className="text-cyan-300">۲. کالبدشکافی مثال درس علوم (۳ جلسه انجام‌شده + ۱ جلسه رهاشده):</strong> تلاش خام پایه از ۴ جزء کمّی: <code dir="ltr">15.0 (۳ جلسه×۵) + 5.90 (۲۹۵ دقیقه÷۵۰) + 4.60 (۲۳ تست×۰.۲) + 3.0 (۳ روز فعال×۱) = 28.50 XP</code> (و با پاداش کیفیت ۳ جلسه <code dir="ltr">+4.60 = 33.10 XP</code>). با <code dir="ltr">Mastery_s = 0.7038</code>، ضریب عمق یادگیری (همان ضریب اثربخشی) <code dir="ltr">M_depth = 0.28 + 0.97×0.7038 = 0.96x..0.98x</code> است. پس از ضرب در <code dir="ltr">M_depth</code> و کسر جریمه نوبت اول غیبت (<code dir="ltr">r_s(1) = 1.00</code>؛ در حالت کسری <code dir="ltr">0.36 XP</code> برابر <code dir="ltr">27.96 - 0.36 = 27.60 XP</code> در مرحله ۴: مس ساده، و در حالت با پاداش کیفیت <code dir="ltr">31.78 - 1.27 = 30.51 XP</code> در مرحله ۵: مس پلاس با آستانه ۳۰ XP) ثبت می‌شود.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            COMPLETE 13-LEVEL / 39-STAGE THRESHOLD TABLES (GLOBAL & SUBJECT)
           ===================================================================== */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <span>جدول مرجع کامل ۱۳ سطح اصلی و ۳۹ مرحله (آستانه‌های XP سطح کل و سطح اختصاصی هر درس)</span>
            </h3>
            <span className="text-xs text-slate-400">
              مقایسه هم‌زمان آستانه‌های ۳۹ مرحله در «سطح کل دانش‌آموز (۰ تا ۱۵٬۰۰۰ XP)» و «سطح اختصاصی هر درس (۰ تا ۲٬۰۰۰ XP)»
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
            <table className="w-full text-right text-xs tabular-nums">
              <thead className="bg-slate-950 text-slate-200 font-extrabold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">سطح اصلی (Level 1..13) و لقب افتخاری</th>
                  <th className="px-3 py-2.5 text-amber-300">پله ۱ کل (ساده)</th>
                  <th className="px-3 py-2.5 text-amber-300">پله ۲ کل (Plus +)</th>
                  <th className="px-3 py-2.5 text-amber-300 border-l border-slate-800">پله ۳ کل (Star ★)</th>
                  <th className="px-3 py-2.5 text-emerald-300">پله ۱ درس (ساده)</th>
                  <th className="px-3 py-2.5 text-emerald-300">پله ۲ درس (Plus +)</th>
                  <th className="px-3 py-2.5 text-emerald-300">پله ۳ درس (Star ★)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {COMPLETE_13_LEVELS_39_STAGES_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-2 font-black text-white whitespace-nowrap">
                      <span>{row.levelLabel}</span>
                      <span className="text-[10px] font-normal text-slate-400 mr-1.5">
                        ({row.honoraryTitle})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-amber-100 whitespace-nowrap">{row.globalSteps[0]}</td>
                    <td className="px-3 py-2 text-amber-200 whitespace-nowrap">{row.globalSteps[1]}</td>
                    <td className="px-3 py-2 font-bold text-amber-300 border-l border-slate-800 whitespace-nowrap">
                      {row.globalSteps[2]}
                    </td>
                    <td className="px-3 py-2 text-emerald-100 whitespace-nowrap">{row.subjectSteps[0]}</td>
                    <td className="px-3 py-2 text-emerald-200 whitespace-nowrap">{row.subjectSteps[1]}</td>
                    <td className="px-3 py-2 font-bold text-emerald-300 whitespace-nowrap">
                      {row.subjectSteps[2]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================================
            FLOW 4: DAILY TIME BUDGET, VELOCITY & ANTI-CHEAT RULES
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          {/* Card 1: Daily Time Budget B_day */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="text-xs sm:text-sm font-black text-teal-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>۴-الف) ظرف زمانی روزانه (B_day) و سهم مطالعه</span>
            </div>
            <div
              dir="ltr"
              className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-teal-300 border border-slate-800"
            >
              StudyShare% = round((actualStudy / B_day) × 100, 1)
              <br />
              FreeTime = max(0, B_day - (Study + Restricted + Essential))
            </div>
            <p className="text-xs text-slate-400 leading-6">
              فعالیت‌های روز به ۳ گروه <strong>آموزشی</strong>، <strong>محدودشونده (سرگرمی)</strong> و <strong>ضروری (ورزش/استراحت بدون نمره منفی)</strong> تقسیم شده و سهم هر یک از کل ظرف روز محاسبه می‌شود.
            </p>
          </div>

          {/* Card 2: XP Velocity & Alignment */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="text-xs sm:text-sm font-black text-cyan-400">
              ۴-ب) سرعت کسب XP و هم‌راستایی با رشد واقعی
            </div>
            <div
              dir="ltr"
              className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-cyan-300 border border-slate-800"
            >
              Rate_7d = NetXP_7d ÷ 7
              <br />
              EstDaysToNextStage = ceil(XP_remaining ÷ Rate_7d)
            </div>
            <p className="text-xs text-slate-400 leading-6">
              اگر XP بالا برود اما میانگین امتیاز آموزشی هفتگی (<code dir="ltr">E_avg &lt; 62</code>) یا کیفیت (<code dir="ltr">Q_w &lt; 5.5</code>) پایین باشد، سیستم هشدار <strong>«XP صوری / سطحی»</strong> صادر می‌کند.
            </p>
          </div>

          {/* Card 3: Golden Rules & Anti-Cheat */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="text-xs sm:text-sm font-black text-amber-400">
              ۴-ج) قوانین طلایی حفاظت از دقت محاسبات
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 leading-6 list-disc list-inside">
              <li>
                <strong>قفل پیش‌بینی اولیه (<code dir="ltr">initial_predicted_minutes</code>):</strong> ویرایش بعدی زمان پیش‌بینی، مخرج فرمول پایبندی را تغییر نمی‌دهد.
              </li>
              <li>
                <strong>کلاهک سقف کیفیت/کمیت (Cap / Clamp):</strong> نسبت زمان واقعی به پیش‌بینی روی هر کارت می‌تواند از ۱۰۰٪ عبور کند (مثلاً ۱۱۷٪)، اما شاخص <code dir="ltr">T</code> روزانه در ۱۰۰٪ و ضریب <code dir="ltr">M_depth</code> در ۱.۲۵× سقف دارد.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
