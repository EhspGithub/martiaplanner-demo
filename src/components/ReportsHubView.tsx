import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BookOpen,
  BarChart3,
  Clock,
  FileCheck2,
  Award,
  Trophy,
  Target,
  AlertTriangle,
  Gamepad2,
  Calendar as CalendarIcon,
  ChevronDown,
  Layers,
  CheckCircle2,
  Sparkles,
  Filter,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import type {
  Subject,
  DailyPlanItem,
  DailyTimeBudgetConfig,
  ActivityCategory,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  getDateRangeISOList,
  formatJalaliCompact,
  formatJalaliFull,
  toPersianDigits,
  formatMinutesPersian,
  formatHoursAndMinutesPersian,
} from '../utils/jalali.ts';
import {
  calculateStudyTimeIndexT,
  calculateExercisesIndexQ,
  calculateWeightedLearningQualityL,
  calculateEducationalCompositeScoreE,
  evaluatePeriodPerformance,
  getCardGradientTheme,
} from '../utils/analyticsEngine.ts';
import {
  ShamsiDateField,
  type AnalyticsFilterMode,
  type ChartDisplayMode,
} from './PerformanceAnalyticsView.tsx';

interface ReportsHubViewProps {
  subjects: Subject[];
  categories: ActivityCategory[];
  onNavigateToPlanner?: () => void;
}

type ReportCategoryTab = 'subjects' | 'recreation';
type SubjectReportSubMode = 'comparison' | 'single';

interface SubjectAnalyticalSummary {
  subjectId: string;
  subjectName: string;
  gradeLevel: string;
  hexColor: string;
  plansCount: number;
  completedCount: number;
  partialCount: number;
  pendingCount: number;
  predictedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number; // actual - predicted
  shortfallMinutes: number; // max(0, predicted - actual)
  adherenceRatioPct: number; // actual / predicted * 100
  taskCompletionPct: number;
  targetExercises: number;
  actualExercises: number;
  weightedQuality0To10: number | null;
  performanceScore0To100: number | null;
  shareOfTotalStudyPct: number;
  unitBreakdown: Array<{
    unitTitle: string;
    predictedMinutes: number;
    actualMinutes: number;
    exercisesCount: number;
    completedCount: number;
    totalCount: number;
  }>;
  dailyTrend: Array<{
    dateIso: string;
    label: string;
    predictedMinutes: number;
    actualMinutes: number;
    actualExercises: number;
    targetExercises: number;
    quality0To10: number;
    score0To100: number;
  }>;
}

export const ReportsHubView: React.FC<ReportsHubViewProps> = ({
  subjects,
  categories,
  onNavigateToPlanner,
}) => {
  const todayIso = getTodayISO();

  // Top-level extensible report category
  const [reportCategory, setReportCategory] = useState<ReportCategoryTab>('subjects');
  const [subjectSubMode, setSubjectSubMode] = useState<SubjectReportSubMode>('comparison');

  // Timeframe Filter State
  const [filterMode, setFilterMode] = useState<AnalyticsFilterMode>('weekly');
  const [singleDate, setSingleDate] = useState<string>(todayIso);
  const [isDailyCalendarOpen, setIsDailyCalendarOpen] = useState<boolean>(false);
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);

  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [customStart, setCustomStart] = useState<string>(addDaysISO(todayIso, -6));
  const [customEnd, setCustomEnd] = useState<string>(todayIso);

  // Subject selection state
  const activeSubjectsList = useMemo(
    () => subjects.filter((s) => Number(s.is_archived) === 0),
    [subjects]
  );
  const [selectedSingleSubjectId, setSelectedSingleSubjectId] = useState<string>(
    () => activeSubjectsList[0]?.id || ''
  );
  const [comparedSubjectIds, setComparedSubjectIds] = useState<string[]>(() =>
    activeSubjectsList.map((s) => s.id)
  );

  // Chart Display Modes (default to 'aggregate')
  const [singleTimeChartMode, setSingleTimeChartMode] = useState<ChartDisplayMode>('aggregate');
  const [singleScoreChartMode, setSingleScoreChartMode] = useState<ChartDisplayMode>('aggregate');

  const [plans, setPlans] = useState<DailyPlanItem[]>([]);
  const [budgets, setBudgets] = useState<DailyTimeBudgetConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync selectedSingleSubjectId & comparedSubjectIds when subjects list changes
  useEffect(() => {
    if (
      activeSubjectsList.length > 0 &&
      !activeSubjectsList.some((s) => s.id === selectedSingleSubjectId)
    ) {
      setSelectedSingleSubjectId(activeSubjectsList[0].id);
    }
    if (comparedSubjectIds.length === 0 && activeSubjectsList.length > 0) {
      setComparedSubjectIds(activeSubjectsList.map((s) => s.id));
    }
  }, [activeSubjectsList, selectedSingleSubjectId, comparedSubjectIds.length]);

  // Close daily calendar popover on outside click
  useEffect(() => {
    if (!isDailyCalendarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarPopoverRef.current &&
        !calendarPopoverRef.current.contains(e.target as Node)
      ) {
        setIsDailyCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDailyCalendarOpen]);

  // Reset chart modes to aggregate when timeframe changes
  useEffect(() => {
    setSingleTimeChartMode('aggregate');
    setSingleScoreChartMode('aggregate');
  }, [filterMode, singleDate, weekRefDate, customStart, customEnd, selectedSingleSubjectId]);

  const activeDateRange = useMemo(() => {
    if (filterMode === 'daily') {
      return {
        start: singleDate,
        end: singleDate,
        label: `روزانه (${formatJalaliFull(singleDate)})`,
      };
    }
    if (filterMode === 'weekly') {
      const wDays = getPersianWeekDays(weekRefDate);
      return {
        start: wDays[0].isoDate,
        end: wDays[6].isoDate,
        label: `هفتگی (${formatJalaliCompact(wDays[0].isoDate)} تا ${formatJalaliCompact(
          wDays[6].isoDate
        )})`,
      };
    }
    if (filterMode === 'monthly') {
      const start = addDaysISO(todayIso, -29);
      return {
        start,
        end: todayIso,
        label: `ماهانه ۳۰ روزه (${formatJalaliCompact(start)} تا ${formatJalaliCompact(todayIso)})`,
      };
    }
    const s = customStart <= customEnd ? customStart : customEnd;
    const e = customStart <= customEnd ? customEnd : customStart;
    return {
      start: s,
      end: e,
      label: `بازه دلخواه (${formatJalaliCompact(s)} تا ${formatJalaliCompact(e)})`,
    };
  }, [filterMode, singleDate, weekRefDate, customStart, customEnd, todayIso]);

  const dateIsoList = useMemo(
    () => getDateRangeISOList(activeDateRange.start, activeDateRange.end),
    [activeDateRange.start, activeDateRange.end]
  );

  // Fetch plans and budgets for selected range
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.getPlansByRange(activeDateRange.start, activeDateRange.end),
      api.getTimeBudgetsByRange(activeDateRange.start, activeDateRange.end),
    ])
      .then(([plansRes, budgetsRes]) => {
        if (!active) return;
        setPlans(plansRes);
        setBudgets(budgetsRes);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeDateRange.start, activeDateRange.end]);

  // Evaluate all subjects across the selected timeframe
  const allSubjectsAnalytics: SubjectAnalyticalSummary[] = useMemo(() => {
    const studyPlans = plans.filter((p) => Number(p.is_study) === 1);
    const totalStudyActualAll = studyPlans.reduce(
      (sum, p) => sum + Math.max(0, Number(p.performance?.actual_minutes || 0)),
      0
    );

    // Combine registered active subjects + any historical subject names in plans
    const subjectEntries = new Map<
      string,
      { id: string; name: string; gradeLevel: string; colorCode: string }
    >();

    for (const s of activeSubjectsList) {
      subjectEntries.set(s.id, {
        id: s.id,
        name: s.name,
        gradeLevel: s.grade_level,
        colorCode: s.color_code,
      });
    }

    for (const p of studyPlans) {
      const sid = p.subject_id || `hist-${p.subject_name_snapshot || 'نامشخص'}`;
      if (!subjectEntries.has(sid)) {
        subjectEntries.set(sid, {
          id: sid,
          name: p.subject_name_snapshot || 'درس ثبت‌شده',
          gradeLevel: 'هشتم',
          colorCode: '#4f46e5',
        });
      }
    }

    const summaries: SubjectAnalyticalSummary[] = [];

    for (const entry of subjectEntries.values()) {
      const subjPlans = studyPlans.filter(
        (p) => p.subject_id === entry.id || p.subject_name_snapshot === entry.name
      );

      let completedCount = 0;
      let partialCount = 0;
      let pendingCount = 0;
      let predictedMinutes = 0;
      let actualMinutes = 0;
      let targetExercises = 0;
      let actualExercises = 0;

      const unitMap = new Map<
        string,
        {
          unitTitle: string;
          predictedMinutes: number;
          actualMinutes: number;
          exercisesCount: number;
          completedCount: number;
          totalCount: number;
        }
      >();

      for (const p of subjPlans) {
        if (p.status === 'completed') completedCount++;
        else if (p.status === 'partial') partialCount++;
        else pendingCount++;

        const pred = Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0));
        const act = Math.max(0, Number(p.performance?.actual_minutes || 0));
        const tEx = Math.max(0, Number(p.target_exercises || 0));
        const aEx = Math.max(0, Number(p.performance?.exercises_count || 0));

        predictedMinutes += pred;
        actualMinutes += act;
        targetExercises += tEx;
        actualExercises += aEx;

        const uTitle = p.unit_title_snapshot || 'عمومی / بدون فصل';
        const existingU = unitMap.get(uTitle) || {
          unitTitle: uTitle,
          predictedMinutes: 0,
          actualMinutes: 0,
          exercisesCount: 0,
          completedCount: 0,
          totalCount: 0,
        };
        existingU.predictedMinutes += pred;
        existingU.actualMinutes += act;
        existingU.exercisesCount += aEx;
        existingU.totalCount += 1;
        if (p.status === 'completed') existingU.completedCount += 1;
        unitMap.set(uTitle, existingU);
      }

      const loggedSubjPlans = subjPlans.filter((p) => Boolean(p.performance));
      const hasLogged = loggedSubjPlans.length > 0;

      const T = hasLogged ? calculateStudyTimeIndexT(actualMinutes, predictedMinutes) : null;
      const Q = hasLogged
        ? calculateExercisesIndexQ(actualExercises, targetExercises > 0 ? targetExercises : null)
        : null;
      const qualityEval = calculateWeightedLearningQualityL(subjPlans);
      const scoreE = calculateEducationalCompositeScoreE(
        T,
        Q,
        qualityEval.scoreL0To100,
        hasLogged
      );

      const adherenceRatioPct =
        predictedMinutes > 0 ? Math.round((actualMinutes / predictedMinutes) * 100) : 0;

      const taskCompletionPct =
        subjPlans.length > 0
          ? Math.round(((completedCount + partialCount * 0.5) / subjPlans.length) * 100)
          : 0;

      const shareOfTotalStudyPct =
        totalStudyActualAll > 0
          ? Math.round((actualMinutes / totalStudyActualAll) * 1000) / 10
          : 0;

      const theme = getCardGradientTheme(entry.name, 'مطالعه درسی', true, 'educational');

      // Daily trend for this subject
      const dailyTrend = dateIsoList.map((dIso) => {
        const daySubjPlans = subjPlans.filter((p) => p.plan_date === dIso);
        const dPred = daySubjPlans.reduce(
          (s, p) => s + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
          0
        );
        const dAct = daySubjPlans.reduce(
          (s, p) => s + Math.max(0, Number(p.performance?.actual_minutes || 0)),
          0
        );
        const dTEx = daySubjPlans.reduce(
          (s, p) => s + Math.max(0, Number(p.target_exercises || 0)),
          0
        );
        const dAEx = daySubjPlans.reduce(
          (s, p) => s + Math.max(0, Number(p.performance?.exercises_count || 0)),
          0
        );
        const dLogged = daySubjPlans.some((p) => Boolean(p.performance));
        const dT = dLogged ? calculateStudyTimeIndexT(dAct, dPred) : null;
        const dQ = dLogged
          ? calculateExercisesIndexQ(dAEx, dTEx > 0 ? dTEx : null)
          : null;
        const dQual = calculateWeightedLearningQualityL(daySubjPlans);
        const dScore = calculateEducationalCompositeScoreE(
          dT,
          dQ,
          dQual.scoreL0To100,
          dLogged
        );

        return {
          dateIso: dIso,
          label: formatJalaliCompact(dIso),
          predictedMinutes: dPred,
          actualMinutes: dAct,
          actualExercises: dAEx,
          targetExercises: dTEx,
          quality0To10: dQual.weightedAverage0To10 ?? 0,
          score0To100: dScore ?? 0,
        };
      });

      summaries.push({
        subjectId: entry.id,
        subjectName: entry.name,
        gradeLevel: entry.gradeLevel,
        hexColor: theme.hexColor,
        plansCount: subjPlans.length,
        completedCount,
        partialCount,
        pendingCount,
        predictedMinutes,
        actualMinutes,
        varianceMinutes: actualMinutes - predictedMinutes,
        shortfallMinutes: Math.max(0, predictedMinutes - actualMinutes),
        adherenceRatioPct,
        taskCompletionPct,
        targetExercises,
        actualExercises,
        weightedQuality0To10: qualityEval.weightedAverage0To10,
        performanceScore0To100: scoreE,
        shareOfTotalStudyPct,
        unitBreakdown: Array.from(unitMap.values()),
        dailyTrend,
      });
    }

    return summaries;
  }, [plans, activeSubjectsList, dateIsoList]);

  // Filtered subjects for Comparison View
  const comparedSubjectsAnalytics = useMemo(() => {
    const filtered = allSubjectsAnalytics.filter((s) =>
      comparedSubjectIds.includes(s.subjectId)
    );
    return filtered.length > 0 ? filtered : allSubjectsAnalytics;
  }, [allSubjectsAnalytics, comparedSubjectIds]);

  // 5 Key Comparative Insights (Section 3.2)
  const comparativeHighlights = useMemo(() => {
    const withStudy = comparedSubjectsAnalytics.filter((s) => s.actualMinutes > 0);
    const withEx = comparedSubjectsAnalytics.filter((s) => s.actualExercises > 0);
    const withQual = comparedSubjectsAnalytics.filter((s) => s.weightedQuality0To10 !== null);
    const withShortfall = comparedSubjectsAnalytics.filter((s) => s.shortfallMinutes > 0);
    const withScore = comparedSubjectsAnalytics.filter((s) => s.performanceScore0To100 !== null);

    const topStudy =
      withStudy.length > 0
        ? [...withStudy].sort((a, b) => b.actualMinutes - a.actualMinutes)[0]
        : null;
    const topExercises =
      withEx.length > 0
        ? [...withEx].sort((a, b) => b.actualExercises - a.actualExercises)[0]
        : null;
    const topQuality =
      withQual.length > 0
        ? [...withQual].sort(
            (a, b) => (b.weightedQuality0To10 ?? 0) - (a.weightedQuality0To10 ?? 0)
          )[0]
        : null;
    const maxGap =
      withShortfall.length > 0
        ? [...withShortfall].sort((a, b) => b.shortfallMinutes - a.shortfallMinutes)[0]
        : null;
    const topScore =
      withScore.length > 0
        ? [...withScore].sort(
            (a, b) => (b.performanceScore0To100 ?? 0) - (a.performanceScore0To100 ?? 0)
          )[0]
        : null;

    return {
      topStudy,
      topExercises,
      topQuality,
      maxGap,
      topScore,
    };
  }, [comparedSubjectsAnalytics]);

  // Selected Single Subject Summary
  const singleSubjectSummary = useMemo(() => {
    return (
      allSubjectsAnalytics.find((s) => s.subjectId === selectedSingleSubjectId) ||
      allSubjectsAnalytics[0] ||
      null
    );
  }, [allSubjectsAnalytics, selectedSingleSubjectId]);

  // Recreation / Entertainment Report Summary (Section 3.4 Extensible Tab)
  const periodOverview = useMemo(() => {
    const budgetsMap = new Map<string, DailyTimeBudgetConfig>();
    for (const b of budgets) budgetsMap.set(b.plan_date, b);
    const categoriesMap = new Map<string, ActivityCategory>();
    for (const c of categories) categoriesMap.set(c.id, c);

    return evaluatePeriodPerformance({
      dateIsoList,
      plans,
      budgetsMap,
      categoriesMap,
    });
  }, [dateIsoList, plans, budgets, categories]);

  const toggleComparedSubject = (id: string) => {
    setComparedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Smart XAxis rotation helper
  const getSmartXAxisProps = (count: number) =>
    count > 4
      ? {
          angle: -90,
          textAnchor: 'end' as const,
          height: 68,
          tickMargin: 6,
          interval: 0,
          tick: { fontSize: 10 },
        }
      : {
          angle: 0,
          textAnchor: 'middle' as const,
          height: 36,
          tickMargin: 6,
          interval: 0,
          tick: { fontSize: 11, fontWeight: 700 },
        };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          HEADER BANNER & EXTENSIBLE REPORT CATEGORY TABS
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-700 via-violet-600 to-purple-700 text-white p-5 sm:p-7 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>مرکز جامع گزارش‌ها و تحلیل‌های تخصصی</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">
              تحلیل عملکرد درس‌ها و پایش توازن مطالعاتی
            </h1>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              بررسی تخصصی هر درس، مقایسه عملکرد کتاب‌ها با یکدیگر و تحلیل فعالیت‌های تفریحی بر اساس داده‌های واقعی
            </p>
          </div>

          {/* Extensible Report Category Switcher (Section 3.4) */}
          <div className="inline-flex items-center self-start lg:self-auto gap-1.5 p-1.5 rounded-2xl bg-slate-950/30 backdrop-blur-md border border-white/15">
            <button
              type="button"
              onClick={() => setReportCategory('subjects')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                reportCategory === 'subjects'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>گزارش و تحلیل عملکرد درس‌ها</span>
            </button>
            <button
              type="button"
              onClick={() => setReportCategory('recreation')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                reportCategory === 'recreation'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>گزارش فعالیت‌های تفریحی</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          UNIFIED TIMEFRAME FILTER BAR WITH POPOVER SHAMSI CALENDAR
      ===================================================================== */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {reportCategory === 'subjects' ? (
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-indigo-50/80 dark:bg-slate-800 border border-indigo-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSubjectSubMode('comparison')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subjectSubMode === 'comparison'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>مقایسه عملکرد درس‌ها</span>
              </button>
              <button
                type="button"
                onClick={() => setSubjectSubMode('single')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  subjectSubMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>گزارش اختصاصی هر درس</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Gamepad2 className="w-5 h-5 text-amber-500" />
              <span>تحلیل زمان مصرفی سرگرمی‌ها، سقف مجاز و سهم از ظرف زمانی</span>
            </div>
          )}

          {/* 4 Timeframe Mode Buttons */}
          <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            {(
              [
                { id: 'daily', label: 'روزانه' },
                { id: 'weekly', label: 'هفتگی' },
                { id: 'monthly', label: 'ماهانه' },
                { id: 'custom', label: 'بازه دلخواه' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterMode(tab.id);
                  if (tab.id === 'daily') setIsDailyCalendarOpen(false);
                }}
                className={`px-2.5 sm:px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                  filterMode === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-controls for Timeframe */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {filterMode === 'daily' && (
            <ShamsiDateField
              label="انتخاب روز:"
              selectedIso={singleDate}
              onSelectIso={(iso) => setSingleDate(iso)}
            />
          )}

          {filterMode === 'weekly' && (
            <div className="grid grid-cols-3 sm:inline-flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap text-center"
              >
                هفته قبل
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(todayIso)}
                className={`px-2.5 sm:px-3.5 py-2 rounded-xl font-extrabold transition-colors cursor-pointer whitespace-nowrap text-center ${
                  weekRefDate === todayIso
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                }`}
              >
                هفته جاری
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap text-center"
              >
                هفته بعد
              </button>
            </div>
          )}

          {filterMode === 'monthly' && (
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              بازه تحلیلی ۳۰ روز اخیر: {activeDateRange.label}
            </div>
          )}

          {filterMode === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full sm:w-auto bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
              <ShamsiDateField
                label="از تاریخ:"
                selectedIso={customStart}
                onSelectIso={(iso) => setCustomStart(iso)}
                compact
              />
              <ShamsiDateField
                label="تا تاریخ:"
                selectedIso={customEnd}
                onSelectIso={(iso) => setCustomEnd(iso)}
                compact
              />
            </div>
          )}

          <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums self-end sm:self-center">
            {activeDateRange.label} ({toPersianDigits(dateIsoList.length)} روز)
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse"
            />
          ))}
        </div>
      ) : reportCategory === 'subjects' ? (
        subjectSubMode === 'comparison' ? (
          /* =================================================================
             SECTION 3.2: MULTI-SUBJECT COMPARISON VIEW (مقایسه عملکرد درس‌ها)
          ================================================================= */
          <div className="space-y-6">
            {/* Multi-Subject Filter Chips */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>انتخاب درس‌ها جهت مقایسه همزمان:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setComparedSubjectIds(allSubjectsAnalytics.map((s) => s.subjectId))
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer"
                  >
                    انتخاب همه درس‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const withData = allSubjectsAnalytics
                        .filter((s) => s.plansCount > 0)
                        .map((s) => s.subjectId);
                      if (withData.length > 0) setComparedSubjectIds(withData);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                  >
                    فقط درس‌های دارای فعالیت در بازه
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {allSubjectsAnalytics.map((subj) => {
                  const isSelected = comparedSubjectIds.includes(subj.subjectId);
                  return (
                    <button
                      key={subj.subjectId}
                      type="button"
                      onClick={() => toggleComparedSubject(subj.subjectId)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <span>{subj.subjectName}</span>
                      {subj.actualMinutes > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md tabular-nums ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {toPersianDigits(subj.actualMinutes)} دقیقه
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5 Key Comparative Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. بیشترین زمان مطالعه */}
              <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20 p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                    بیشترین زمان مطالعه
                  </span>
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-sm font-black text-indigo-950 dark:text-white truncate">
                  {comparativeHighlights.topStudy
                    ? comparativeHighlights.topStudy.subjectName
                    : 'بدون داده'}
                </div>
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {comparativeHighlights.topStudy
                    ? formatHoursAndMinutesPersian(comparativeHighlights.topStudy.actualMinutes)
                    : '—'}
                </div>
              </div>

              {/* 2. بیشترین تست و تمرین */}
              <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20 p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                    بیشترین تست و تمرین
                  </span>
                  <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm font-black text-blue-950 dark:text-white truncate">
                  {comparativeHighlights.topExercises
                    ? comparativeHighlights.topExercises.subjectName
                    : 'بدون داده'}
                </div>
                <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  {comparativeHighlights.topExercises
                    ? `${toPersianDigits(comparativeHighlights.topExercises.actualExercises)} تست/تمرین`
                    : '—'}
                </div>
              </div>

              {/* 3. بهترین کیفیت یادگیری */}
              <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20 p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                    بهترین کیفیت یادگیری
                  </span>
                  <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-sm font-black text-purple-950 dark:text-white truncate">
                  {comparativeHighlights.topQuality
                    ? comparativeHighlights.topQuality.subjectName
                    : 'بدون داده'}
                </div>
                <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 tabular-nums">
                  {comparativeHighlights.topQuality &&
                  comparativeHighlights.topQuality.weightedQuality0To10 !== null
                    ? `${toPersianDigits(comparativeHighlights.topQuality.weightedQuality0To10)} از ۱۰`
                    : '—'}
                </div>
              </div>

              {/* 4. بیشترین فاصله با پیش‌بینی */}
              <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                    بیشترین فاصله با هدف
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-sm font-black text-amber-950 dark:text-white truncate">
                  {comparativeHighlights.maxGap
                    ? comparativeHighlights.maxGap.subjectName
                    : 'منطبق با برنامه'}
                </div>
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {comparativeHighlights.maxGap
                    ? `${toPersianDigits(comparativeHighlights.maxGap.shortfallMinutes)} دقیقه کمتر از پیش‌بینی`
                    : 'بدون کسری زمان'}
                </div>
              </div>

              {/* 5. بهترین امتیاز نهایی عملکرد */}
              <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                    بهترین امتیاز عملکرد
                  </span>
                  <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-sm font-black text-emerald-950 dark:text-white truncate">
                  {comparativeHighlights.topScore
                    ? comparativeHighlights.topScore.subjectName
                    : 'بدون داده'}
                </div>
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {comparativeHighlights.topScore &&
                  comparativeHighlights.topScore.performanceScore0To100 !== null
                    ? `${toPersianDigits(comparativeHighlights.topScore.performanceScore0To100)} از ۱۰۰`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Comparative Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart A: مقایسه زمان مطالعه واقعی و پیش‌بینی در درس‌ها */}
              <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۱. مقایسه زمان مطالعه واقعی و پیش‌بینی‌شده درس‌ها
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    بررسی میزان مطالعه هر درس در برابر هدف پیش‌بینی‌شده در بازه انتخابی
                  </p>
                </div>

                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparedSubjectsAnalytics}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="subjectName"
                        {...getSmartXAxisProps(comparedSubjectsAnalytics.length)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} دقیقه`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar
                        dataKey="predictedMinutes"
                        name="زمان پیش‌بینی (دقیقه)"
                        fill="#94a3b8"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="actualMinutes"
                        name="زمان مطالعه واقعی (دقیقه)"
                        fill="#4f46e5"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: سهم هر درس از کل زمان مطالعه و امتیاز عملکرد */}
              <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۲. مقایسه امتیاز عملکرد (۰ تا ۱۰۰) و تعداد تست در هر درس
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    مقایسه همزمان امتیاز ترکیبی عملکرد آموزشی و تعداد تست‌های حل‌شده
                  </p>
                </div>

                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={comparedSubjectsAnalytics}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="subjectName"
                        {...getSmartXAxisProps(comparedSubjectsAnalytics.length)}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          toPersianDigits(Number(val)),
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar
                        dataKey="performanceScore0To100"
                        name="امتیاز عملکرد درس (از ۱۰۰)"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="actualExercises"
                        name="تعداد تست و تمرین حل‌شده"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3.5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Comprehensive Subject Comparison Table */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    جدول جامع مقایسه شاخص‌های عملکرد درس‌ها
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    برای مشاهده کارنامه و نمودارهای اختصاصی هر درس، روی نام درس یا دکمه «گزارش درس» کلیک کنید
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/50 text-xs font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">نام درس</th>
                      <th className="py-3.5 px-4">زمان پیش‌بینی</th>
                      <th className="py-3.5 px-4">مطالعه واقعی</th>
                      <th className="py-3.5 px-4">تحقق زمان</th>
                      <th className="py-3.5 px-4">سهم از کل مطالعه</th>
                      <th className="py-3.5 px-4">تست / تمرین</th>
                      <th className="py-3.5 px-4">کیفیت (از ۱۰)</th>
                      <th className="py-3.5 px-4">امتیاز (از ۱۰۰)</th>
                      <th className="py-3.5 px-4">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                    {comparedSubjectsAnalytics.map((subj) => (
                      <tr
                        key={subj.subjectId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {subj.subjectName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatMinutesPersian(subj.predictedMinutes)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                          {formatMinutesPersian(subj.actualMinutes)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${
                              subj.adherenceRatioPct >= 100
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : subj.adherenceRatioPct >= 60
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {toPersianDigits(subj.adherenceRatioPct)}٪
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-sky-700 dark:text-sky-300 whitespace-nowrap">
                          {toPersianDigits(subj.shareOfTotalStudyPct)}٪
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {toPersianDigits(subj.actualExercises)} مورد
                        </td>
                        <td className="py-3.5 px-4 font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                          {subj.weightedQuality0To10 !== null
                            ? `${toPersianDigits(subj.weightedQuality0To10)} از ۱۰`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          {subj.performanceScore0To100 !== null
                            ? `${toPersianDigits(subj.performanceScore0To100)} از ۱۰۰`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSingleSubjectId(subj.subjectId);
                              setSubjectSubMode('single');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold hover:bg-indigo-100 cursor-pointer"
                          >
                            گزارش درس
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Relocated "مقایسه دیداری پیش‌بینی و عملکرد واقعی در هر درس" */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      مقایسه دیداری پیش‌بینی و عملکرد واقعی در هر درس
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      بررسی نسبت زمان واقعی به پیش‌بینی و تعداد تمرین‌های حل‌شده در هر درس
                    </p>
                  </div>
                </div>
                {onNavigateToPlanner && (
                  <button
                    type="button"
                    onClick={onNavigateToPlanner}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ثبت برنامه جدید</span>
                  </button>
                )}
              </div>

              {comparedSubjectsAnalytics.filter((s) => s.plansCount > 0).length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    در این بازه زمانی هنوز فعالیت درسی ثبت نشده است.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    اولین درس امروزت را برنامه‌ریزی کن تا پیشرفت هر کتاب اینجا فعال شود!
                  </p>
                  {onNavigateToPlanner && (
                    <button
                      type="button"
                      onClick={onNavigateToPlanner}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>افزودن اولین فعالیت درسی</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3.5 px-6">نام درس</th>
                        <th className="py-3.5 px-6">زمان پیش‌بینی‌شده</th>
                        <th className="py-3.5 px-6">زمان واقعی نسبت به پیش‌بینی</th>
                        <th className="py-3.5 px-6">اختلاف زمان</th>
                        <th className="py-3.5 px-6">تعداد تمرین / تست</th>
                        <th className="py-3.5 px-6">وضعیت تکمیل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {comparedSubjectsAnalytics
                        .filter((s) => s.plansCount > 0)
                        .map((item) => {
                          const diff = item.actualMinutes - item.predictedMinutes;
                          const ratioPct =
                            item.predictedMinutes > 0
                              ? Math.round((item.actualMinutes / item.predictedMinutes) * 100)
                              : 0;
                          const barWidthPct = Math.min(100, ratioPct);
                          return (
                            <tr
                              key={item.subjectId}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                                {item.subjectName}
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-300 tabular-nums">
                                {formatMinutesPersian(item.predictedMinutes)}
                              </td>
                              <td className="py-4 px-6 min-w-[200px]">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white tabular-nums mb-1.5">
                                  <span>{formatMinutesPersian(item.actualMinutes)}</span>
                                  <span className="text-indigo-600 dark:text-indigo-400">
                                    {toPersianDigits(ratioPct)}٪
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      ratioPct >= 100
                                        ? 'bg-emerald-500'
                                        : ratioPct >= 60
                                        ? 'bg-indigo-600'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${barWidthPct}%` }}
                                  />
                                </div>
                              </td>
                              <td className="py-4 px-6 tabular-nums">
                                {item.actualMinutes === 0 ? (
                                  <span className="text-xs text-slate-400">ثبت‌نشده</span>
                                ) : diff === 0 ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    منطبق با پیش‌بینی
                                  </span>
                                ) : diff > 0 ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {toPersianDigits(diff)}+ دقیقه بیشتر
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                    {toPersianDigits(Math.abs(diff))} دقیقه کمتر
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                {toPersianDigits(item.actualExercises)} تمرین
                              </td>
                              <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                                {toPersianDigits(item.completedCount)} از{' '}
                                {toPersianDigits(item.plansCount)} کامل
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =================================================================
             SECTION 3.1: SINGLE-SUBJECT DEDICATED REPORT (گزارش اختصاصی هر درس)
          ================================================================= */
          <div className="space-y-6">
            {/* Subject Selector Bar */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>انتخاب درس جهت مشاهده کارنامه تخصصی:</span>
              </div>

              <select
                value={selectedSingleSubjectId}
                onChange={(e) => setSelectedSingleSubjectId(e.target.value)}
                className="w-full sm:w-72 rounded-xl border border-indigo-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-extrabold text-slate-900 dark:text-white"
              >
                {allSubjectsAnalytics.map((subj) => (
                  <option key={subj.subjectId} value={subj.subjectId}>
                    {subj.subjectName} (پایه {subj.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            {singleSubjectSummary && (
              <>
                {/* 6 Dedicated Summary Cards for Selected Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        ۱. مجموع ساعت مطالعه درس
                      </span>
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-indigo-950 dark:text-white tabular-nums">
                      {formatHoursAndMinutesPersian(singleSubjectSummary.actualMinutes)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>
                        پیش‌بینی: {formatHoursAndMinutesPersian(singleSubjectSummary.predictedMinutes)}
                      </span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        تحقق زمان: {toPersianDigits(singleSubjectSummary.adherenceRatioPct)}٪
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        ۲. مجموع تست‌ها و تمرین‌های حل‌شده
                      </span>
                      <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-300 tabular-nums">
                      {toPersianDigits(singleSubjectSummary.actualExercises)} تست و تمرین
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                      هدف تعیین‌شده:{' '}
                      {singleSubjectSummary.targetExercises > 0
                        ? `${toPersianDigits(singleSubjectSummary.targetExercises)} مورد`
                        : 'بدون هدف عددی'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        ۳. میانگین کیفیت یادگیری درس
                      </span>
                      <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-purple-800 dark:text-purple-300 tabular-nums">
                      {singleSubjectSummary.weightedQuality0To10 !== null
                        ? `${toPersianDigits(singleSubjectSummary.weightedQuality0To10)} از ۱۰`
                        : 'ثبت‌نشده'}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      محاسبه‌شده با وزن زمان واقعی مطالعه این درس
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        ۴. امتیاز عملکرد درس (از ۱۰۰)
                      </span>
                      <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                      {singleSubjectSummary.performanceScore0To100 !== null
                        ? `${toPersianDigits(singleSubjectSummary.performanceScore0To100)} از ۱۰۰`
                        : 'بدون داده ثبت‌شده'}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      ترکیب تحقق زمان مطالعه، تست و کیفیت یادگیری درس
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/85 via-white to-sky-50/40 dark:from-sky-950/35 dark:via-slate-900 dark:to-sky-950/20 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        ۵. سهم این درس از کل زمان مطالعه
                      </span>
                      <Target className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-sky-800 dark:text-sky-300 tabular-nums">
                      {toPersianDigits(singleSubjectSummary.shareOfTotalStudyPct)}٪
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                      از مجموع{' '}
                      {formatHoursAndMinutesPersian(periodOverview.totalStudyMinutes)} مطالعه کل دروس
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        ۶. میزان تکمیل جلسات درس
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-300 tabular-nums">
                      {toPersianDigits(singleSubjectSummary.completedCount)} از{' '}
                      {toPersianDigits(singleSubjectSummary.plansCount)} جلسه کامل
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                      نرخ تکمیل برنامه درس: {toPersianDigits(singleSubjectSummary.taskCompletionPct)}٪
                    </div>
                  </div>
                </div>

                {/* Single-Subject Trend Charts (with Aggregate / Daily toggle) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart 1: روند زمان مطالعه این درس */}
                  <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          ۱. زمان مطالعه درس «{singleSubjectSummary.subjectName}»
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          مقایسه زمان مطالعه واقعی با پیش‌بینی در بازه انتخابی
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setSingleTimeChartMode('aggregate')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                            singleTimeChartMode === 'aggregate'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          نمایش تجمیعی
                        </button>
                        <button
                          type="button"
                          onClick={() => setSingleTimeChartMode('daily')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                            singleTimeChartMode === 'daily'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          نمایش روزانه
                        </button>
                      </div>
                    </div>

                    <div className="h-68 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        {singleTimeChartMode === 'aggregate' ? (
                          <BarChart
                            data={[
                              {
                                name: 'مطالعه واقعی درس',
                                minutes: singleSubjectSummary.actualMinutes,
                                color: '#4f46e5',
                              },
                              {
                                name: 'پیش‌بینی درس',
                                minutes: singleSubjectSummary.predictedMinutes,
                                color: '#94a3b8',
                              },
                            ]}
                            margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              angle={0}
                              textAnchor="middle"
                              height={36}
                              tick={{ fontSize: 11, fontWeight: 700 }}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any) => [
                                `${formatHoursAndMinutesPersian(Number(val))} (${toPersianDigits(
                                  Number(val)
                                )} دقیقه)`,
                                'مجموع در بازه',
                              ]}
                            />
                            <Bar dataKey="minutes" radius={[8, 8, 0, 0]} maxBarSize={60}>
                              <Cell fill="#4f46e5" />
                              <Cell fill="#94a3b8" />
                            </Bar>
                          </BarChart>
                        ) : (
                          <BarChart
                            data={singleSubjectSummary.dailyTrend}
                            margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="label"
                              {...getSmartXAxisProps(singleSubjectSummary.dailyTrend.length)}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any, name?: any) => [
                                `${toPersianDigits(Number(val))} دقیقه`,
                                String(name ?? ''),
                              ]}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                            <Bar
                              dataKey="predictedMinutes"
                              name="پیش‌بینی (دقیقه)"
                              fill="#94a3b8"
                              radius={[6, 6, 0, 0]}
                            />
                            <Bar
                              dataKey="actualMinutes"
                              name="مطالعه واقعی (دقیقه)"
                              fill="#4f46e5"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: روند امتیاز عملکرد و کیفیت یادگیری درس */}
                  <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          ۲. روند امتیاز عملکرد و تست‌های «{singleSubjectSummary.subjectName}»
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          بررسی امتیاز عملکرد آموزشی (از ۱۰۰) و تعداد تست‌های حل‌شده
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setSingleScoreChartMode('aggregate')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                            singleScoreChartMode === 'aggregate'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          نمایش تجمیعی
                        </button>
                        <button
                          type="button"
                          onClick={() => setSingleScoreChartMode('daily')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                            singleScoreChartMode === 'daily'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          نمایش روزانه
                        </button>
                      </div>
                    </div>

                    <div className="h-68 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        {singleScoreChartMode === 'aggregate' ? (
                          <BarChart
                            data={[
                              {
                                name: 'امتیاز عملکرد (از ۱۰۰)',
                                value: singleSubjectSummary.performanceScore0To100 ?? 0,
                                color: '#10b981',
                              },
                              {
                                name: 'تحقق زمان (٪)',
                                value: Math.min(100, singleSubjectSummary.adherenceRatioPct),
                                color: '#4f46e5',
                              },
                              {
                                name: 'کیفیت یادگیری (×۱۰)',
                                value: (singleSubjectSummary.weightedQuality0To10 ?? 0) * 10,
                                color: '#9333ea',
                              },
                            ]}
                            margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              angle={0}
                              textAnchor="middle"
                              height={36}
                              tick={{ fontSize: 10, fontWeight: 700 }}
                            />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any) => [
                                `${toPersianDigits(Math.round(Number(val)))} از ۱۰۰`,
                                'شاخص تجمیعی درس',
                              ]}
                            />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                              <Cell fill="#10b981" />
                              <Cell fill="#4f46e5" />
                              <Cell fill="#9333ea" />
                            </Bar>
                          </BarChart>
                        ) : (
                          <ComposedChart
                            data={singleSubjectSummary.dailyTrend}
                            margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="label"
                              {...getSmartXAxisProps(singleSubjectSummary.dailyTrend.length)}
                            />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any, name?: any) => [
                                toPersianDigits(Number(val)),
                                String(name ?? ''),
                              ]}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                            <Bar
                              dataKey="score0To100"
                              name="امتیاز عملکرد روزانه (از ۱۰۰)"
                              fill="#10b981"
                              radius={[6, 6, 0, 0]}
                            />
                            <Line
                              type="monotone"
                              dataKey="actualExercises"
                              name="تعداد تست حل‌شده"
                              stroke="#2563eb"
                              strokeWidth={2.5}
                              dot={{ r: 3.5 }}
                            />
                          </ComposedChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Chapter / Unit Breakdown Table for Selected Subject */}
                <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        تفکیک عملکرد فصل‌ها و بخش‌های درس «{singleSubjectSummary.subjectName}»
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        میزان زمان مطالعه و تمرین‌های حل‌شده در هر فصل از این کتاب در بازه انتخابی
                      </p>
                    </div>
                  </div>

                  {singleSubjectSummary.unitBreakdown.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                      در این بازه زمانی هنوز فعالیتی برای فصل‌های این درس ثبت نشده است.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs sm:text-sm">
                        <thead className="bg-slate-50/90 dark:bg-slate-800/50 text-xs font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-5">عنوان فصل / درس</th>
                            <th className="py-3 px-5">زمان پیش‌بینی</th>
                            <th className="py-3 px-5">زمان واقعی</th>
                            <th className="py-3 px-5">تعداد تست / تمرین</th>
                            <th className="py-3 px-5">وضعیت تکمیل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                          {singleSubjectSummary.unitBreakdown.map((u) => (
                            <tr key={u.unitTitle}>
                              <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                                {u.unitTitle}
                              </td>
                              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                                {formatMinutesPersian(u.predictedMinutes)}
                              </td>
                              <td className="py-3.5 px-5 font-bold text-indigo-700 dark:text-indigo-300">
                                {formatMinutesPersian(u.actualMinutes)}
                              </td>
                              <td className="py-3.5 px-5 font-bold text-blue-600 dark:text-blue-400">
                                {toPersianDigits(u.exercisesCount)} مورد
                              </td>
                              <td className="py-3.5 px-5 font-semibold text-emerald-700 dark:text-emerald-300">
                                {toPersianDigits(u.completedCount)} از {toPersianDigits(u.totalCount)} کامل
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )
      ) : (
        /* ===================================================================
           SECTION 3.4: RECREATIONAL & ENTERTAINMENT ACTIVITIES REPORT TAB
        =================================================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  مجموع زمان سرگرمی در بازه
                </span>
                <Gamepad2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-lg font-black text-amber-800 dark:text-amber-300 tabular-nums">
                {formatHoursAndMinutesPersian(periodOverview.totalRestrictedActualMinutes)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                میانگین روزانه: {formatMinutesPersian(periodOverview.avgDailyRestrictedActualMinutes)}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/85 via-white to-sky-50/40 dark:from-sky-950/35 dark:via-slate-900 dark:to-sky-950/20 p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  مجموع سقف مجاز پیش‌بینی‌شده
                </span>
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-lg font-black text-sky-800 dark:text-sky-300 tabular-nums">
                {formatHoursAndMinutesPersian(periodOverview.totalRestrictedAllowedMinutes)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                بر اساس برنامه‌ریزی اولیه فعالیت‌های تفریحی
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/85 via-white to-rose-50/40 dark:from-rose-950/35 dark:via-slate-900 dark:to-rose-950/20 p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  مجموع تخطی از سقف مجاز
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-lg font-black text-rose-800 dark:text-rose-300 tabular-nums">
                {formatMinutesPersian(periodOverview.totalRestrictedOveruseMinutes)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                زمان مصرفی فراتر از سقف تعیین‌شده
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  شاخص کنترل سرگرمی‌ها (C)
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-lg font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                {periodOverview.averageRestrictedControlIndexC !== null
                  ? `${toPersianDigits(periodOverview.averageRestrictedControlIndexC)}٪`
                  : 'ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                میانگین پایبندی به سقف مجاز تفریحات دیجیتال
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              مقایسه سقف مجاز، مصرف واقعی و تخطی فعالیت‌های تفریحی در بازه انتخابی
            </h3>
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={periodOverview.dailyEvaluations.map((d) => ({
                    label: d.jalaliCompact,
                    allowed: d.restrictedAllowedLoggedMinutes || d.restrictedPlannedMinutes,
                    actual: d.restrictedActualMinutes,
                    overuse: d.restrictedOveruseMinutes,
                  }))}
                  margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...getSmartXAxisProps(periodOverview.dailyEvaluations.length)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name?: any) => [
                      `${toPersianDigits(Number(val))} دقیقه`,
                      String(name ?? ''),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar
                    dataKey="allowed"
                    name="سقف مجاز (دقیقه)"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="actual"
                    name="مصرف واقعی (دقیقه)"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="overuse"
                    name="تخطی از سقف (دقیقه)"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
