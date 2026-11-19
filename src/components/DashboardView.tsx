import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Trophy,
  Sparkles,
  Info,
  Crown,
  Zap,
  ChevronDown,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Compass,
  TrendingDown,
  History,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { DailyPlanItem } from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatJalaliWeekdaySlash,
  getTodayISO,
  getDailyMotivationalQuoteObject,
  QUOTES_UPDATED_EVENT,
} from '../utils/jalali.ts';
import {
  calculateXpFromPlans,
  evaluateGlobalXpLedger,
  analyzeXpVelocityAndProgress,
  ANALYTICS_COEFFICIENTS_CHANGED_EVENT,
} from '../utils/analyticsEngine.ts';
import {
  WeeklyAnalyticalReport,
  SmartAdvisoryAccordionCard,
} from './WeeklyAnalyticalReport.tsx';
import { PerformanceAnalyticsView } from './PerformanceAnalyticsView.tsx';
import { XpCoinBadge } from './XpCoinBadge.tsx';
import { LevelEmblemBadge, StepSegmentDots } from './LevelIdentityCard.tsx';

export const DashboardView: React.FC<{ refreshTrigger?: number }> = ({
  refreshTrigger = 0,
}) => {
  const [range] = useState<'today' | 'week' | 'month'>('today');
  const [allTimePlans, setAllTimePlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showXpFormulaGuide, setShowXpFormulaGuide] = useState<boolean>(false);
  const [isXpVelocityOpen, setIsXpVelocityOpen] = useState<boolean>(false);
  const [isXpHistoryOpen, setIsXpHistoryOpen] = useState<boolean>(false);
  const [xpHistoryFilter, setXpHistoryFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [quoteRevision, setQuoteRevision] = useState<number>(0);

  const todayIso = getTodayISO();

  useEffect(() => {
    const onQuotesOrCoeffsUpdated = () => setQuoteRevision((r) => r + 1);
    window.addEventListener(QUOTES_UPDATED_EVENT, onQuotesOrCoeffsUpdated);
    window.addEventListener(ANALYTICS_COEFFICIENTS_CHANGED_EVENT, onQuotesOrCoeffsUpdated);
    return () => {
      window.removeEventListener(QUOTES_UPDATED_EVENT, onQuotesOrCoeffsUpdated);
      window.removeEventListener(ANALYTICS_COEFFICIENTS_CHANGED_EVENT, onQuotesOrCoeffsUpdated);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    setError(null);
    api
      .getPlansByRange('2020-01-01', '2099-12-31')
      .then((allPlans) => {
        if (active) {
          setAllTimePlans(allPlans);
          hasLoadedOnceRef.current = true;
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
  }, [range, todayIso, refreshTrigger]);

  const globalXpLedger = useMemo(
    () => {
      void quoteRevision;
      return evaluateGlobalXpLedger(allTimePlans, todayIso);
    },
    [allTimePlans, todayIso, quoteRevision]
  );

  const rangeXpBreakdown = useMemo(() => {
    void quoteRevision;
    const filtered = allTimePlans.filter((p) => p.plan_date === todayIso);
    return calculateXpFromPlans(filtered);
  }, [allTimePlans, todayIso, quoteRevision]);

  const levelProgress = globalXpLedger.currentStageProgress;

  const xpVelocityAnalysis = useMemo(
    () => {
      void quoteRevision;
      return analyzeXpVelocityAndProgress({
        allTimePlans,
        todayIso,
        levelProgress,
      });
    },
    [allTimePlans, todayIso, levelProgress, quoteRevision]
  );

  const filteredHistoryEvents = useMemo(() => {
    const allEvents = globalXpLedger.historyEvents;
    if (xpHistoryFilter === 'positive') {
      return allEvents.filter((e) => e.xpDelta > 0);
    }
    if (xpHistoryFilter === 'negative') {
      return allEvents.filter((e) => e.xpDelta < 0);
    }
    return allEvents;
  }, [globalXpLedger.historyEvents, xpHistoryFilter]);

  const totalXp = rangeXpBreakdown.totalXp;

  // Deterministic Daily Persian Motivational Sentence (Section 2)
  const dailyQuoteObj = useMemo(
    () => getDailyMotivationalQuoteObject(todayIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayIso, quoteRevision]
  );

  const rangeLabelPersian =
    range === 'today' ? 'امروز' : range === 'week' ? 'این هفته' : 'این ماه';

  return (
    <div className="space-y-6">
      {/* =====================================================================
          CENTERED DASHBOARD HEADER
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 text-white p-5 sm:p-7 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          {/* Single-line Title & Standard Numeric Shamsi Date (YYYY/MM/DD) */}
          <div className="space-y-2 max-w-full overflow-hidden">
            <h1 className="text-sm sm:text-2xl lg:text-3xl font-black tracking-tight whitespace-nowrap truncate flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
              <span>کارنامه هوشمند و تحلیل پیشرفت تحصیلی</span>
            </h1>

            <div className="text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums whitespace-nowrap">
              امروز، {formatJalaliWeekdaySlash(todayIso)}
            </div>

            {/* Daily Persian Motivational Sentence */}
            <p className="text-[11px] sm:text-sm md:text-base font-extrabold text-white/95 leading-relaxed max-w-3xl mx-auto px-2">
              «{dailyQuoteObj.text}»
            </p>
          </div>

          {/* Compact Single-Line Today XP Row with Coin-Shaped XP Badge */}
          {!loading && (
            <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 px-4 py-2 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-indigo-50 whitespace-nowrap">
                امتیاز عملکرد {rangeLabelPersian}:
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums whitespace-nowrap">
                {toPersianDigits(totalXp)}
              </span>
              <XpCoinBadge size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          DEDICATED FULL-WIDTH USER LEVEL (1..13 × 3 STEPS = 39 STAGES),
          XP PROGRESSION & VELOCITY CARD
      ===================================================================== */}
      {(() => {
        const { palette } = levelProgress;
        const isDarkLux = Boolean(palette.isDarkLuxury);

        return (
          <div
            className={`rounded-3xl border bg-gradient-to-l ${palette.cardBgClass} ${palette.cardBorderClass} p-5 sm:p-6 shadow-xs space-y-4 transition-all`}
          >
            {/* ===============================================================
                SECTION 2: PROMINENT DEMOTION / INACTIVITY PENALTY ALERT BANNER
            =============================================================== */}
            {(globalXpLedger.hasActiveDemotion || globalXpLedger.consecutiveInactiveDays >= 1) && (
              <div
                className={`rounded-2xl border p-4 space-y-2.5 ${
                  globalXpLedger.hasActiveDemotion
                    ? 'bg-rose-50/95 dark:bg-rose-950/45 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                    : 'bg-amber-50/95 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        globalXpLedger.hasActiveDemotion
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black">
                        {globalXpLedger.hasActiveDemotion
                          ? 'پسرفت در عملکرد — تنزل سطح/پله بر اثر وقفه در برنامه‌های درسی'
                          : 'هشدار کسر امتیاز (XP منفی) به علت عدم تحقق کامل برنامه درسی'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-black px-2.5 py-1 rounded-xl tabular-nums ${
                      globalXpLedger.hasActiveDemotion
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    کسر کل: {toPersianDigits(globalXpLedger.totalPenaltyXp)}- XP
                  </span>
                </div>

                {globalXpLedger.hasActiveDemotion && globalXpLedger.latestDemotionEvent ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-0.5 tabular-nums">
                    <div className="rounded-xl bg-white/80 dark:bg-slate-900/75 border border-rose-200/70 dark:border-rose-800/60 px-3 py-2">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        سطح / پله قبلی (اوج کسب‌شده)
                      </div>
                      <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">
                        Level {toPersianDigits(globalXpLedger.peakStageProgress.level)} —{' '}
                        {globalXpLedger.peakStageProgress.stageNameFa} (
                        {globalXpLedger.peakStageProgress.stepLabelFa})
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 dark:bg-slate-900/75 border border-rose-200/70 dark:border-rose-800/60 px-3 py-2">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        سطح / پله فعلی پس از کسر
                      </div>
                      <div className="font-black text-rose-700 dark:text-rose-300 mt-0.5">
                        Level {toPersianDigits(levelProgress.level)} — {levelProgress.stageNameFa} (
                        {levelProgress.stepLabelFa})
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 dark:bg-slate-900/75 border border-rose-200/70 dark:border-rose-800/60 px-3 py-2">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        مقدار XP کسرشده
                      </div>
                      <div className="font-black text-rose-600 dark:text-rose-400 mt-0.5">
                        {toPersianDigits(Math.abs(globalXpLedger.latestDemotionEvent.xpDelta))}- XP در آخرین رویداد (کل کسرشده:{' '}
                        {toPersianDigits(globalXpLedger.totalPenaltyXp)}- XP)
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 dark:bg-slate-900/75 border border-rose-200/70 dark:border-rose-800/60 px-3 py-2">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        علت تنزل
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">
                        {globalXpLedger.latestDemotionEvent.reasonFa}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold leading-relaxed">
                    در {toPersianDigits(globalXpLedger.consecutiveInactiveDays)} روز متوالی دارای برنامه درسی، حداقل آستانه فعالیت مؤثر (۵۰٪ تحقق برنامه یا ۳۰ دقیقه مطالعه باکیفیت) ثبت نشده است (ضریب تشدید فعلی: ×
                    {toPersianDigits(globalXpLedger.currentStreakMultiplierR)}). با تکمیل یکی از فعالیت‌های درسی امروز، زنجیره کسر امتیاز به ۱٫۰ بازنشانی می‌شود.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Right Column: Level Crest (1..13 + Step Badge) & 3-Line Identity Summary (Section 5-1) */}
              <div
                className={`lg:col-span-4 flex items-center gap-4 border-b lg:border-b-0 lg:border-l pb-4 lg:pb-0 lg:pl-5 ${
                  isDarkLux
                    ? 'border-white/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <LevelEmblemBadge
                  level={levelProgress.level}
                  stepNumber={levelProgress.stepNumber}
                  palette={palette}
                  size="lg"
                />

                <div className="min-w-0 flex flex-col justify-center space-y-1 flex-1">
                  {/* خط اول: Level ۲ – مس پلاس + نشان کوچک در همان خط */}
                  <div
                    className={`flex flex-wrap items-center gap-1.5 text-sm sm:text-base font-black leading-snug ${
                      isDarkLux ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    <span>
                      Level {toPersianDigits(levelProgress.level)} – {levelProgress.stageNameFa}
                    </span>
                    <span
                      dir="ltr"
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${palette.pillBgClass}`}
                    >
                      {levelProgress.stageNameEn}
                    </span>
                    {globalXpLedger.hasActiveDemotion && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white">
                        پسرفت در عملکرد
                      </span>
                    )}
                  </div>

                  {/* خط دوم: سطح کل (۵ از ۳۹) */}
                  <div className="leading-tight">
                    <span className={`text-xs font-extrabold ${palette.accentTextClass}`}>
                      سطح کل ({toPersianDigits(levelProgress.stageNumber)} از ۳۹)
                    </span>
                  </div>

                  {/* خط سوم: عنوان افتخاری */}
                  <div
                    className={`text-xs font-extrabold leading-tight ${
                      isDarkLux ? 'text-slate-200' : palette.accentTextClass
                    }`}
                  >
                    {levelProgress.honoraryTitle}
                  </div>
                </div>
              </div>

              {/* Center Column: Step Segment Indicator, Progress Bar & Centered 2-Line Cumulative XP (Section 5-1) */}
              <div
                className={`lg:col-span-5 space-y-2.5 border-b lg:border-b-0 lg:border-l pb-4 lg:pb-0 lg:pl-5 ${
                  isDarkLux
                    ? 'border-white/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div
                    className={`font-extrabold flex items-center gap-1.5 ${
                      isDarkLux ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {levelProgress.isMaxStage ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>بالاترین مرحله سیستم (Black Diamond Star) تکمیل شد</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>
                          پیشرفت تا پله بعد:{' '}
                          <strong dir="ltr" className="inline-block">
                            {levelProgress.nextStageNameEn}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>

                  <StepSegmentDots
                    stepNumber={levelProgress.stepNumber}
                    palette={palette}
                    isDarkSurface={isDarkLux}
                  />
                </div>

                {/* Rich Progress Bar */}
                <div
                  className={`relative h-4 w-full rounded-2xl p-0.5 overflow-hidden shadow-inner ${
                    isDarkLux ? 'bg-white/15' : 'bg-slate-200/90 dark:bg-slate-800'
                  }`}
                >
                  <div
                    className={`h-full rounded-xl bg-gradient-to-l ${palette.barGradientClass} transition-all duration-500 relative overflow-hidden`}
                    style={{
                      width: `${
                        levelProgress.isMaxStage
                          ? 100
                          : Math.max(4, levelProgress.progressPercentage)
                      }%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0)_100%)]" />
                  </div>
                </div>

                {/* Two Separate Centered Lines Below Progress Bar */}
                <div
                  className={`flex flex-col items-center justify-center text-center gap-1 text-[11px] font-bold tabular-nums pt-0.5 ${
                    isDarkLux ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="inline-flex flex-wrap items-center justify-center gap-1">
                    <span>XP خالص فعلی:</span>
                    <strong
                      className={`font-black ${
                        isDarkLux ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {toPersianDigits(levelProgress.allTimeXp)}
                    </strong>
                    <XpCoinBadge size="xs" />
                    {globalXpLedger.totalPenaltyXp > 0 && (
                      <span className="text-rose-500 dark:text-rose-400 font-extrabold">
                        (کسرشده: {toPersianDigits(globalXpLedger.totalPenaltyXp)}-)
                      </span>
                    )}
                    {!levelProgress.isMaxStage && (
                      <span className="opacity-85">
                        ({toPersianDigits(levelProgress.xpInCurrentLevel)} از{' '}
                        {toPersianDigits(levelProgress.xpRequiredForCurrentStep)} •{' '}
                        {toPersianDigits(levelProgress.progressPercentage)}٪ پله)
                      </span>
                    )}
                  </div>

                  <div>
                    {levelProgress.isMaxStage ? (
                      <span className="inline-flex items-center justify-center gap-1 font-black text-emerald-400">
                        <Crown className="w-3.5 h-3.5" />
                        <span>تکمیل ۱۰۰٪ تمام ۳۹ مرحله</span>
                      </span>
                    ) : (
                      <span className={`font-extrabold inline-flex items-center justify-center gap-1 ${palette.accentTextClass}`}>
                        <span>{toPersianDigits(levelProgress.xpRemainingToNextLevel)}</span>
                        <XpCoinBadge size="xs" />
                        <span>
                          موردنیاز تا پله بعد ({levelProgress.nextStageNameEn} • آستانه{' '}
                          {toPersianDigits(levelProgress.nextLevelTargetXp)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Left Column: Today's Earned XP & Accordion Toggle (Section 5-2) */}
              <div className="lg:col-span-3 flex flex-col justify-center min-w-0">
                <div
                  className={`rounded-2xl border px-3.5 py-3 space-y-2.5 overflow-hidden ${
                    isDarkLux
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-indigo-600/8 dark:bg-indigo-500/10 border-indigo-200/70 dark:border-indigo-800/60'
                  }`}
                >
                  <div
                    className={`text-xs font-extrabold text-center whitespace-nowrap truncate ${
                      isDarkLux ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    XPهای کسب‌شده در {rangeLabelPersian}
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-between lg:justify-center xl:justify-between gap-2 pt-0.5">
                    <div
                      className={`text-base sm:text-lg font-black tabular-nums flex items-center justify-center gap-1 shrink-0 ${
                        isDarkLux ? 'text-amber-300' : 'text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      <span>{toPersianDigits(rangeXpBreakdown.totalXp)}</span>
                      <XpCoinBadge size="sm" />
                      <span className="text-xs font-extrabold">امتیاز</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowXpFormulaGuide((prev) => !prev);
                      }}
                      aria-expanded={showXpFormulaGuide}
                      className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition-all cursor-pointer max-w-full shadow-2xs ${
                        showXpFormulaGuide
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : isDarkLux
                          ? 'bg-slate-900 border-white/20 text-white hover:border-violet-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 hover:border-indigo-400'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap truncate">ریز محاسبات XP</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                          showXpFormulaGuide ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable 1/10th Scale XP Formula Guide + Cumulative Net & Penalty Summary (Section 5-2) */}
            {showXpFormulaGuide && (
              <div
                className={`pt-3 border-t text-xs animate-in fade-in duration-150 ${
                  isDarkLux ? 'border-white/15' : 'border-indigo-200/70 dark:border-slate-800'
                }`}
              >
                <div className="rounded-2xl bg-slate-50/95 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-indigo-200/80 dark:border-slate-700/80 p-4 space-y-3">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">محاسبات امتیاز عملکرد XP – امروز و تراز کل</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 tabular-nums">
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۱. فعالیت کامل ({toPersianDigits(rangeXpBreakdown.completedCount)} × ۵):
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        <span>+{toPersianDigits(rangeXpBreakdown.completedActivitiesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۲. فعالیت ناقص ({toPersianDigits(rangeXpBreakdown.partialCount)} × ۲٫۵):
                      </span>
                      <span className="font-black text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                        <span>+{toPersianDigits(rangeXpBreakdown.partialActivitiesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۳. زمان مطالعه ({toPersianDigits(rangeXpBreakdown.actualStudyMinutes)} دقیقه ÷ ۵۰):
                      </span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                        <span>+{toPersianDigits(rangeXpBreakdown.studyMinutesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۴. حل تمرین ({toPersianDigits(rangeXpBreakdown.exercisesCount)} × ۰٫۲):
                      </span>
                      <span className="font-black text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                        <span>+{toPersianDigits(rangeXpBreakdown.exercisesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۵. پاداش کیفیت یادگیری (نمره کیفیت × ۰٫۲):
                      </span>
                      <span className="font-black text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
                        <span>+{toPersianDigits(rangeXpBreakdown.qualityBonusXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 px-3 py-2 flex items-center justify-between">
                      <span className="text-rose-800 dark:text-rose-300 font-bold">
                        ۶. کسر امتیاز وقفه در برنامه‌های درسی (تجمعی):
                      </span>
                      <span className="font-black text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                        <span>{toPersianDigits(globalXpLedger.totalPenaltyXp)}-</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                  </div>

                  {/* Cumulative Ledger Balance Row */}
                  <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200/70 dark:border-indigo-800/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold tabular-nums">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-slate-700 dark:text-slate-300">
                        XP ناخالص کسب‌شده کل:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                          +{toPersianDigits(globalXpLedger.grossTotalXp)} XP
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        XP منفی کسرشده (هفت روز اخیر / کل):{' '}
                        <strong className="text-rose-600 dark:text-rose-400 font-black">
                          {toPersianDigits(globalXpLedger.penalty7dXp)}- /{' '}
                          {toPersianDigits(globalXpLedger.totalPenaltyXp)}- XP
                        </strong>
                      </span>
                    </div>
                    <div className="text-indigo-700 dark:text-indigo-300 font-black">
                      تراز خالص سطح کل: {toPersianDigits(globalXpLedger.netTotalXp)} XP
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================
                SECTION 5-3: MASTER COLLAPSIBLE ACCORDION FOR THE 5 XP ANALYSIS CARDS
                Line 1: تحلیل روند پیشرفت و رشد تحصیلی
                Line 2: مشاهده پنج شاخص تحلیلی
            =================================================================== */}
            <div
              className={`pt-3 border-t space-y-2.5 ${
                isDarkLux ? 'border-white/15' : 'border-slate-200/80 dark:border-slate-800/90'
              }`}
            >
              <div className="rounded-2xl border border-indigo-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsXpVelocityOpen((prev) => !prev)}
                  aria-expanded={isXpVelocityOpen}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        تحلیل روند پیشرفت و رشد تحصیلی
                      </div>
                      <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                        {isXpVelocityOpen ? 'بستن پنج شاخص تحلیلی' : 'مشاهده پنج شاخص تحلیلی'}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform duration-200 ${
                      isXpVelocityOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isXpVelocityOpen && (
                  <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      {/* Card 1: سرعت روزانه کسب XP */}
                      <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>سرعت روزانه کسب XP (۷ روز اخیر)</span>
                          </div>
                          <div className="font-black text-slate-900 dark:text-white tabular-nums flex flex-wrap items-center gap-1">
                            <span>{toPersianDigits(xpVelocityAnalysis.dailyRate7dEffective)}</span>
                            <XpCoinBadge size="xs" />
                            <span>در روز</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              (۱۴روزه: {toPersianDigits(xpVelocityAnalysis.dailyRate14dCalendar)} | ۳۰روزه:{' '}
                              {toPersianDigits(xpVelocityAnalysis.dailyRate30dCalendar)})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: روند سرعت پیشرفت هفتگی */}
                      <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>روند سرعت پیشرفت هفتگی</span>
                          </div>
                          <div
                            className={`font-black tabular-nums truncate ${
                              xpVelocityAnalysis.trendBadgeTone === 'emerald'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : xpVelocityAnalysis.trendBadgeTone === 'amber'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {xpVelocityAnalysis.trendLabelPersian}
                          </div>
                        </div>
                      </div>

                      {/* Card 3: هم‌سنجی XP با رشد واقعی تحصیلی (E) */}
                      <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                            <span>هم‌سنجی XP با رشد واقعی تحصیلی (E)</span>
                          </div>
                          <div className="font-black text-slate-900 dark:text-white truncate">
                            {xpVelocityAnalysis.avgEducationalScore7d !== null
                              ? `شاخص آموزشی: ${toPersianDigits(xpVelocityAnalysis.avgEducationalScore7d)} از ۱۰۰`
                              : 'در انتظار ثبت مطالعه'}{' '}
                            <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-300">
                              ({xpVelocityAnalysis.activeDays7d > 0
                                ? `${toPersianDigits(xpVelocityAnalysis.activeDays7d)} روز فعال در هفته`
                                : 'بدون روز فعال'})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: پیش‌بینی زمان صعود به سطح بعد */}
                      <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>پیش‌بینی زمان صعود به سطح بعد</span>
                          </div>
                          <div className="font-black text-amber-700 dark:text-amber-300 tabular-nums truncate">
                            {xpVelocityAnalysis.estimatedNextLevelTextPersian}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 5: رشد اصیل و هم‌راستای XP با پیشرفت واقعی تحصیلی (و چالش احیای ریتم) */}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 border text-[11px] sm:text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        xpVelocityAnalysis.hasPerformanceDropWarning
                          ? 'bg-amber-50/85 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
                          : 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-2 min-w-0">
                        <ShieldAlert
                          className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                            xpVelocityAnalysis.hasPerformanceDropWarning
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        />
                        <div className="leading-relaxed">
                          <strong className="font-black">{xpVelocityAnalysis.alignmentTitlePersian}: </strong>
                          <span className="font-semibold">
                            {xpVelocityAnalysis.warningHeadlinePersian ||
                              xpVelocityAnalysis.alignmentDescriptionPersian}
                          </span>
                        </div>
                      </div>
                      <div className="font-extrabold text-indigo-700 dark:text-indigo-300 sm:text-left shrink-0">
                        {xpVelocityAnalysis.recoveryChallengeTextPersian}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================================
                  SECTION 5-4: COLLAPSIBLE PROMOTION, DEMOTION & XP HISTORY LEDGER
                  Line 1: تاریخچه ارتقا، تنزل و تغییرات XP
                  Line 2: مشاهده کارنامه تغییرات
              ================================================================= */}
              <div className="rounded-2xl border border-indigo-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsXpHistoryOpen((prev) => !prev)}
                  aria-expanded={isXpHistoryOpen}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        تاریخچه ارتقا، تنزل و تغییرات XP
                      </div>
                      <div className="text-[11px] font-extrabold text-violet-600 dark:text-violet-400">
                        {isXpHistoryOpen ? 'بستن کارنامه تغییرات' : 'مشاهده کارنامه تغییرات'}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 transition-transform duration-200 ${
                      isXpHistoryOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isXpHistoryOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Filter Tabs & Summary Stats */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setXpHistoryFilter('all')}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                            xpHistoryFilter === 'all'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          همه ({toPersianDigits(globalXpLedger.historyEvents.length)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setXpHistoryFilter('positive')}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                            xpHistoryFilter === 'positive'
                              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          ارتقا و پاداش (
                          {toPersianDigits(
                            globalXpLedger.historyEvents.filter((e) => e.xpDelta > 0).length
                          )}
                          )
                        </button>
                        <button
                          type="button"
                          onClick={() => setXpHistoryFilter('negative')}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                            xpHistoryFilter === 'negative'
                              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          جریمه و پسرفت (
                          {toPersianDigits(
                            globalXpLedger.historyEvents.filter((e) => e.xpDelta < 0).length
                          )}
                          )
                        </button>
                      </div>

                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        روزهای دارای تعهد درسی انجام‌شده:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {toPersianDigits(globalXpLedger.totalActiveEducationalDays)} روز
                        </strong>{' '}
                        | روزهای دارای جریمه وقفه:{' '}
                        <strong className="text-rose-600 dark:text-rose-400">
                          {toPersianDigits(globalXpLedger.totalMissedEducationalDays)} روز
                        </strong>
                      </div>
                    </div>

                    {filteredHistoryEvents.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-bold">
                        رویدادی در این دسته ثبت نشده است.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                        {filteredHistoryEvents.slice(0, 40).map((ev) => {
                          const isPositive = ev.xpDelta >= 0;
                          const isStageChanged = ev.stageAfterNumber !== ev.stageBeforeNumber;

                          return (
                            <div
                              key={ev.id}
                              className={`rounded-xl border px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 tabular-nums ${
                                ev.categoryType === 'پسرفت'
                                  ? 'bg-rose-50/80 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/70'
                                  : ev.categoryType === 'جریمه'
                                  ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-800/60'
                                  : ev.categoryType === 'ارتقا'
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                                  : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/70'
                              }`}
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      ev.categoryType === 'پسرفت'
                                        ? 'bg-rose-600 text-white'
                                        : ev.categoryType === 'جریمه'
                                        ? 'bg-amber-500 text-slate-950'
                                        : ev.categoryType === 'ارتقا'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300'
                                    }`}
                                  >
                                    {isPositive ? (
                                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                                    ) : (
                                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                                    )}
                                    <span>{ev.eventBadgeFa}</span>
                                  </span>

                                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                                    تاریخ: {ev.jalaliDate}
                                  </span>

                                  {isStageChanged && (
                                    <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                                      • {ev.stageBeforeNameFa} ({ev.stepBeforeLabelFa}) ←{' '}
                                      {ev.stageAfterNameFa} ({ev.stepAfterLabelFa})
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {ev.reasonFa}
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-200/60 dark:border-slate-700/60">
                                <div
                                  className={`text-xs font-black inline-flex items-center gap-1 ${
                                    isPositive
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  <span dir="ltr">
                                    {isPositive
                                      ? `+${toPersianDigits(ev.xpDelta)}`
                                      : `-${toPersianDigits(Math.abs(ev.xpDelta))}`}
                                  </span>
                                  <XpCoinBadge size="xs" />
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  {toPersianDigits(ev.xpBefore)} ← {toPersianDigits(ev.xpAfter)} XP
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Comprehensive Performance Evaluation & Analytics Section (includes all 7 charts) */}
      <PerformanceAnalyticsView refreshTrigger={refreshTrigger} />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, idx) => (
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

      {!loading && !error && (
        <>
          {/* =================================================================
              SMART MULTI-TIMEFRAME ADVISORY ACCORDION CARD (Section 10)
              (Note: The 10-card «جزئیات تکمیلی عملکرد برنامه (امروز)» container
               has been removed per Section 1 while preserving all data & metrics)
          ================================================================= */}
          <SmartAdvisoryAccordionCard allTimePlans={allTimePlans} />

          {/* =================================================================
              WEEKLY ANALYTICAL REPORT (Section 9)
          ================================================================= */}
          <WeeklyAnalyticalReport refreshTrigger={refreshTrigger} />
        </>
      )}
    </div>
  );
};
