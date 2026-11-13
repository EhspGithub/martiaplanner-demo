import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FileCheck2,
  Award,
  Layers,
  Coffee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Flame,
  Sparkles,
  Info,
  Crown,
  Zap,
  ChevronDown,
} from 'lucide-react';
import type { DailyPlanItem, DashboardMetrics } from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatMinutesPersian,
  formatJalaliWeekdaySlash,
  getTodayISO,
  getDailyMotivationalQuote,
} from '../utils/jalali.ts';
import {
  calculateXpFromPlans,
  calculateUserLevelProgress,
} from '../utils/analyticsEngine.ts';
import {
  WeeklyAnalyticalReport,
  SmartAdvisoryAccordionCard,
} from './WeeklyAnalyticalReport.tsx';
import { PerformanceAnalyticsView } from './PerformanceAnalyticsView.tsx';

export const DashboardView: React.FC = () => {
  const [range] = useState<'today' | 'week' | 'month'>('today');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [allTimePlans, setAllTimePlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);
  const [showXpFormulaGuide, setShowXpFormulaGuide] = useState<boolean>(false);

  const todayIso = getTodayISO();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getDashboardMetrics(range, todayIso),
      api.getPlansByRange('2020-01-01', '2099-12-31'),
    ])
      .then(([data, allPlans]) => {
        if (active) {
          setMetrics(data);
          setAllTimePlans(allPlans);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'خطا در دریافت اطلاعات داشبورد');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [range, todayIso]);

  const allTimeXpBreakdown = useMemo(
    () => calculateXpFromPlans(allTimePlans),
    [allTimePlans]
  );

  const rangeXpBreakdown = useMemo(() => {
    if (!metrics) return calculateXpFromPlans([]);
    const filtered = allTimePlans.filter(
      (p) => p.plan_date >= metrics.startDate && p.plan_date <= metrics.endDate
    );
    return calculateXpFromPlans(filtered);
  }, [allTimePlans, metrics]);

  const levelProgress = useMemo(
    () => calculateUserLevelProgress(allTimeXpBreakdown.totalXp),
    [allTimeXpBreakdown.totalXp]
  );

  const totalXp = rangeXpBreakdown.totalXp;

  // Deterministic Daily Persian Motivational Sentence (Section 2)
  const dailyMotivationalQuote = useMemo(
    () => getDailyMotivationalQuote(todayIso),
    [todayIso]
  );

  const rangeLabelPersian =
    range === 'today' ? 'امروز' : range === 'week' ? 'این هفته' : 'این ماه';

  const varianceText = !metrics
    ? '—'
    : metrics.studyTimeVarianceMinutes === 0
    ? '۰ دقیقه (منطبق با هدف)'
    : metrics.studyTimeVarianceMinutes > 0
    ? `${toPersianDigits(metrics.studyTimeVarianceMinutes)} دقیقه بیشتر از هدف`
    : `${toPersianDigits(Math.abs(metrics.studyTimeVarianceMinutes))} دقیقه کمتر از هدف`;

  const qualityText = !metrics
    ? '—'
    : metrics.averageLearningQualityScore !== null
    ? `${metrics.averageLearningQualityLabel} (${toPersianDigits(metrics.averageLearningQualityScore)} از ۱۰)`
    : metrics.averageLearningQualityLabel;

  const detailCards = metrics
    ? [
        {
          id: 1,
          title: '۱. هدف پیش‌بینی مطالعه',
          value: formatMinutesPersian(metrics.totalPredictedStudyMinutes),
          tooltip: `مجموع زمان هدف‌گذاری‌شده برای فعالیت‌های درسی در بازه «${rangeLabelPersian}».`,
          icon: Clock,
          cardBorder: 'border-indigo-200/80 dark:border-indigo-900/50',
          cardBg:
            'bg-gradient-to-l from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20',
          iconWrap: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          valueColor: 'text-indigo-950 dark:text-white',
        },
        {
          id: 2,
          title: '۲. مطالعه واقعی ثبت‌شده',
          value: formatMinutesPersian(metrics.totalActualStudyMinutes),
          tooltip: `مجموع زمان واقعی صرف‌شده برای مطالعه دروس در بازه «${rangeLabelPersian}».`,
          icon: BookOpen,
          cardBorder: 'border-emerald-200/80 dark:border-emerald-900/50',
          cardBg:
            'bg-gradient-to-l from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20',
          iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          valueColor: 'text-emerald-700 dark:text-emerald-300',
        },
        {
          id: 3,
          title: '۳. تراز زمان مطالعه با هدف',
          value: varianceText,
          tooltip:
            'اختلاف بین ساعت مطالعه واقعی و زمان پیش‌بینی‌شده اولیه (بیشتر یا کمتر بودن مطالعه نسبت به هدف).',
          icon: metrics.studyTimeVarianceMinutes >= 0 ? ArrowUpRight : ArrowDownRight,
          cardBorder: 'border-amber-200/80 dark:border-amber-900/50',
          cardBg:
            'bg-gradient-to-l from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20',
          iconWrap:
            metrics.studyTimeVarianceMinutes >= 0
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          valueColor: 'text-slate-900 dark:text-white',
        },
        {
          id: 4,
          title: '۴. تست و تمرین حل‌شده',
          value: `${toPersianDigits(metrics.totalExercisesSolved)} مورد`,
          tooltip: `مجموع تمام تست‌ها و تمرین‌های حل‌شده در فعالیت‌های درسی بازه «${rangeLabelPersian}».`,
          icon: FileCheck2,
          cardBorder: 'border-blue-200/80 dark:border-blue-900/50',
          cardBg:
            'bg-gradient-to-l from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20',
          iconWrap: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
          valueColor: 'text-blue-700 dark:text-blue-300',
        },
        {
          id: 5,
          title: '۵. سطح کیفی یادگیری دروس',
          value: qualityText,
          tooltip:
            'میانگین وزنی کیفیت یادگیری (از ۰ تا ۱۰) بر اساس مدت زمان واقعی هر نوبت مطالعه.',
          icon: Award,
          cardBorder: 'border-purple-200/80 dark:border-purple-900/50',
          cardBg:
            'bg-gradient-to-l from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20',
          iconWrap: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
          valueColor: 'text-purple-700 dark:text-purple-300',
        },
        {
          id: 6,
          title: '۶. کل برنامه‌های تعریف‌شده',
          value: `${toPersianDigits(metrics.totalPlannedActivities)} برنامه`,
          tooltip: `تعداد کل فعالیت‌های ثبت‌شده (درسی و غیردرسی) در برنامه بازه «${rangeLabelPersian}».`,
          icon: Layers,
          cardBorder: 'border-slate-200/90 dark:border-slate-700/70',
          cardBg:
            'bg-gradient-to-l from-slate-100/85 via-white to-slate-50/40 dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-800/30',
          iconWrap: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
          valueColor: 'text-slate-900 dark:text-white',
        },
        {
          id: 7,
          title: '۷. فعالیت‌های تکمیل‌شده کامل',
          value: `${toPersianDigits(metrics.completedActivitiesCount)} مورد`,
          tooltip: 'تعداد فعالیت‌هایی که گزارش اجرای آن‌ها به‌طور کامل (تکمیل‌شده) ثبت شده است.',
          icon: CheckCircle2,
          cardBorder: 'border-emerald-200/80 dark:border-emerald-900/50',
          cardBg:
            'bg-gradient-to-l from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20',
          iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          valueColor: 'text-emerald-700 dark:text-emerald-300',
        },
        {
          id: 8,
          title: '۸. فعالیت‌های ناقص یا در انتظار',
          value: `${toPersianDigits(metrics.incompleteOrPendingCount)} مورد (${toPersianDigits(
            metrics.partialActivitiesCount
          )} ناقص، ${toPersianDigits(metrics.pendingActivitiesCount)} مانده)`,
          tooltip:
            'مجموع فعالیت‌هایی که به‌صورت نیمه‌تمام انجام شده‌اند یا هنوز در انتظار ثبت عملکرد هستند.',
          icon: AlertCircle,
          cardBorder: 'border-amber-200/80 dark:border-amber-900/50',
          cardBg:
            'bg-gradient-to-l from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20',
          iconWrap: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          valueColor: 'text-amber-700 dark:text-amber-300',
        },
        {
          id: 9,
          title: '۹. نرخ پایبندی به اجرای برنامه',
          value: `${toPersianDigits(metrics.adherencePercentage)}٪`,
          tooltip:
            'درصد تحقق و تکمیل فعالیت‌های برنامه‌ریزی‌شده (کامل = ۱۰۰٪ و ناقص = ۵۰٪ وزن تکمیل).',
          icon: TrendingUp,
          cardBorder: 'border-indigo-200/80 dark:border-indigo-900/50',
          cardBg:
            'bg-gradient-to-l from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20',
          iconWrap: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          valueColor: 'text-indigo-600 dark:text-indigo-300',
        },
        {
          id: 10,
          title: '۱۰. زمان فعالیت‌های غیردرسی',
          value: `${formatMinutesPersian(metrics.nonStudyActualMinutes)} (هدف: ${formatMinutesPersian(
            metrics.nonStudyPredictedMinutes
          )})`,
          tooltip:
            'مجموع زمان واقعی صرف‌شده برای استراحت، ورزش و سرگرمی در مقایسه با زمان پیش‌بینی‌شده غیردرسی.',
          icon: Coffee,
          cardBorder: 'border-teal-200/80 dark:border-teal-900/50',
          cardBg:
            'bg-gradient-to-l from-teal-50/85 via-white to-teal-50/40 dark:from-teal-950/35 dark:via-slate-900 dark:to-teal-950/20',
          iconWrap: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
          valueColor: 'text-teal-800 dark:text-teal-300',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          CENTERED DASHBOARD HEADER (Sections 2 & 6)
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 text-white p-5 sm:p-7 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3.5">
          {/* Single-line Title & Standard Numeric Shamsi Date (YYYY/MM/DD) */}
          <div className="space-y-2 max-w-full overflow-hidden">
            <h1 className="text-sm sm:text-2xl lg:text-3xl font-black tracking-tight whitespace-nowrap truncate flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
              <span>کارنامه هوشمند و تحلیل پیشرفت تحصیلی</span>
            </h1>

            <div className="text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums whitespace-nowrap">
              امروز، {formatJalaliWeekdaySlash(todayIso)}
            </div>

            {/* Daily Persian Motivational Sentence (Single-line on desktop, clean responsive sizing on mobile, no English subtitle) */}
            <p className="text-[11px] sm:text-sm md:text-base font-extrabold text-white/95 leading-relaxed sm:whitespace-nowrap sm:truncate max-w-full px-2">
              «{dailyMotivationalQuote}»
            </p>
          </div>

          {/* Centered Compact XP Performance Card */}
          {metrics && (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 px-5 py-2.5 min-w-[210px] shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-400/25 flex items-center justify-center text-amber-300">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-bold text-indigo-100 whitespace-nowrap">
                امتیاز عملکرد ({rangeLabelPersian})
              </div>
              <div className="text-sm sm:text-base font-black text-amber-300 tabular-nums flex items-center justify-center gap-1 whitespace-nowrap">
                <Flame className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{toPersianDigits(totalXp)} امتیاز XP</span>
              </div>
              <div className="text-[10px] font-extrabold text-white/90 tabular-nums whitespace-nowrap">
                سطح کل: {toPersianDigits(levelProgress.level)} ({levelProgress.rankTitle})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          DEDICATED FULL-WIDTH USER LEVEL & XP PROGRESSION CARD
          (Placed directly below the main Dashboard header — 4 duplicate mini-cards removed per Section 5)
      ===================================================================== */}
      <div className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-l from-indigo-50/70 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/30 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Right Column: Permanent Level Identity & Rank Title */}
          <div className="lg:col-span-4 flex items-center gap-4 border-b lg:border-b-0 lg:border-l border-slate-200/80 dark:border-slate-800 pb-4 lg:pb-0 lg:pl-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-indigo-600 p-0.5 shadow-md shadow-amber-500/15">
                <div className="w-full h-full rounded-[14px] bg-slate-950/90 text-white flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-amber-300 leading-none">
                    LEVEL
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums leading-tight mt-0.5">
                    {toPersianDigits(levelProgress.level)}
                  </span>
                </div>
              </div>
              <div className="-bottom-1.5 -right-1.5 absolute w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-sm shadow-xs border-2 border-white dark:border-slate-900">
                <Crown className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                <span>سطح کل دائمی دانش‌آموز</span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                سطح {toPersianDigits(levelProgress.level)}: {levelProgress.rankTitle}{' '}
                <span>{levelProgress.rankBadgeEmoji}</span>
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                پله بعدی (سطح {toPersianDigits(levelProgress.level + 1)}):{' '}
                <span className="text-indigo-600 dark:text-indigo-300 font-extrabold">
                  {levelProgress.nextRankTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Center Column: Level Step Progress Bar & Cumulative XP */}
          <div className="lg:col-span-5 space-y-2.5 border-b lg:border-b-0 lg:border-l border-slate-200/80 dark:border-slate-800 pb-4 lg:pb-0 lg:pl-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  پیشرفت پله سطح {toPersianDigits(levelProgress.level)} به{' '}
                  {toPersianDigits(levelProgress.level + 1)}
                </span>
              </div>
              <div className="font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                {toPersianDigits(levelProgress.xpInCurrentLevel)} از{' '}
                {toPersianDigits(levelProgress.xpRequiredForCurrentStep)} امتیاز این پله (
                {toPersianDigits(levelProgress.progressPercentage)}٪)
              </div>
            </div>

            {/* Rich Progress Bar */}
            <div className="relative h-4 w-full rounded-2xl bg-slate-200/90 dark:bg-slate-800 p-0.5 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-xl bg-gradient-to-l from-amber-400 via-indigo-500 to-violet-600 transition-all duration-500 relative overflow-hidden"
                style={{ width: `${Math.max(4, levelProgress.progressPercentage)}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0)_100%)]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
              <span>
                کل امتیاز تجمیعی (All-Time):{' '}
                <strong className="text-slate-900 dark:text-white font-black">
                  {toPersianDigits(levelProgress.allTimeXp)} XP
                </strong>
              </span>
              <span className="text-amber-700 dark:text-amber-300 font-extrabold">
                {toPersianDigits(levelProgress.xpRemainingToNextLevel)} امتیاز تا سطح{' '}
                {toPersianDigits(levelProgress.level + 1)} (مرز{' '}
                {toPersianDigits(levelProgress.nextLevelTargetXp)} XP)
              </span>
            </div>
          </div>

          {/* Left Column: Current Timeframe XP Summary & Formula Guide Accordion Toggle (4 duplicate mini-cards removed) */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <div className="rounded-2xl bg-indigo-600/8 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-800/60 px-4 py-3.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  XP کسب‌شده در «{rangeLabelPersian}»
                </div>
                <div className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 tabular-nums mt-0.5">
                  +{toPersianDigits(rangeXpBreakdown.totalXp)} امتیاز
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowXpFormulaGuide((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-300 hover:border-indigo-400 transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Info className="w-3.5 h-3.5" />
                <span>ریز محاسبات XP</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showXpFormulaGuide ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable XP Formula & Level Steps Guide (Preserved per Section 3.3 & Section 5) */}
        {showXpFormulaGuide && (
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
            <div className="lg:col-span-7 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 p-4 space-y-2.5">
              <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <span>ریز محاسبه امتیاز عملکرد (XP) در بازه «{rangeLabelPersian}»</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 tabular-nums">
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    ۱. فعالیت کامل ({toPersianDigits(rangeXpBreakdown.completedCount)} × ۵۰):
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {toPersianDigits(rangeXpBreakdown.completedActivitiesXp)} امتیاز
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    ۲. فعالیت ناقص ({toPersianDigits(rangeXpBreakdown.partialCount)} × ۲۵):
                  </span>
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    {toPersianDigits(rangeXpBreakdown.partialActivitiesXp)} امتیاز
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    ۳. زمان مطالعه ({toPersianDigits(rangeXpBreakdown.actualStudyMinutes)} دقیقه ÷ ۵):
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {toPersianDigits(rangeXpBreakdown.studyMinutesXp)} امتیاز
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    ۴. حل تمرین ({toPersianDigits(rangeXpBreakdown.exercisesCount)} × ۲):
                  </span>
                  <span className="font-black text-blue-600 dark:text-blue-400">
                    {toPersianDigits(rangeXpBreakdown.exercisesXp)} امتیاز
                  </span>
                </div>
                <div className="sm:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    ۵. پاداش کیفیت یادگیری (نمره کیفیت ۰ تا ۱۰ هر نوبت مطالعه × ۲):
                  </span>
                  <span className="font-black text-purple-600 dark:text-purple-400">
                    {toPersianDigits(rangeXpBreakdown.qualityBonusXp)} امتیاز
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 p-4 space-y-2">
              <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>جدول پله‌های سطح دائمی (فرمول: ۲۵۰ + (سطح−۱)×۱۵۰)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                {[
                  { lvl: 1, range: '۰ تا ۲۵۰ XP', title: 'نوآموز هدفمند 🌱' },
                  { lvl: 2, range: '۲۵۰ تا ۶۵۰ XP', title: 'کاوشگر دانش 🧭' },
                  { lvl: 3, range: '۶۵۰ تا ۱,۲۰۰ XP', title: 'برنامه‌ریز پرتلاش ⚡' },
                  { lvl: 4, range: '۱,۲۰۰ تا ۱,۹۰۰ XP', title: 'ستاره پیوستگی 🌟' },
                  { lvl: 5, range: '۱,۹۰۰ تا ۲,۷۵۰ XP', title: 'قهرمان تمرکز 🔥' },
                  { lvl: 6, range: '۲,۷۵۰+ XP', title: 'معمار موفقیت و نخبگی 👑' },
                ].map((row) => (
                  <div
                    key={row.lvl}
                    className={`rounded-xl border px-2.5 py-1.5 flex flex-col ${
                      levelProgress.level === row.lvl ||
                      (row.lvl === 6 && levelProgress.level >= 6)
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-white font-black'
                        : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold'
                    }`}
                  >
                    <span>
                      سطح {toPersianDigits(row.lvl)}: {row.title}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {row.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Performance Evaluation & Analytics Section (includes all 7 charts) */}
      <PerformanceAnalyticsView />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-5 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {!loading && metrics && (
        <>
          {/* =================================================================
              SECTION 5: SMART MULTI-TIMEFRAME ADVISORY ACCORDION CARD
              (Placed directly before "جزئیات تکمیلی عملکرد برنامه (امروز)")
          ================================================================= */}
          <SmartAdvisoryAccordionCard allTimePlans={allTimePlans} />

          {/* =================================================================
              SECTION 6: 10 COMPACT NUMBERED COMPLEMENTARY DETAIL CARDS WITH TOOLTIPS
          ================================================================= */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  جزئیات تکمیلی عملکرد برنامه ({rangeLabelPersian})
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                برای مشاهده توضیح هر شاخص، روی آیکون راهنما (i) کلیک کنید
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {detailCards.map((card) => {
                const IconComp = card.icon;
                const isTooltipOpen = activeTooltipId === card.id;
                return (
                  <div
                    key={card.id}
                    className={`relative rounded-2xl border ${card.cardBorder} ${card.cardBg} px-3.5 py-2.5 shadow-2xs flex flex-col justify-center gap-1.5 ${
                      card.id === 10 ? 'sm:col-span-2 lg:col-span-1' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg ${card.iconWrap} flex items-center justify-center shrink-0`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                          <span>{card.title}: </span>
                          <span className={`font-black ${card.valueColor} tabular-nums`}>
                            {card.value}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        title={card.tooltip}
                        onClick={() =>
                          setActiveTooltipId((prev) => (prev === card.id ? null : card.id))
                        }
                        className="w-6 h-6 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/70 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                        aria-label={`توضیح ${card.title}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isTooltipOpen && (
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 rounded-xl px-2.5 py-1.5 border border-slate-200/70 dark:border-slate-700/70 leading-relaxed">
                        {card.tooltip}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* =================================================================
              WEEKLY ANALYTICAL REPORT
          ================================================================= */}
          <WeeklyAnalyticalReport />
        </>
      )}
    </div>
  );
};
