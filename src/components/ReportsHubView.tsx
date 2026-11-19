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
  ChevronDown,
  Layers,
  CheckCircle2,
  Sparkles,
  Filter,
  ShieldCheck,
  Plus,
  Check,
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
  formatJalaliShortMonthDay,
  formatJalaliFull,
  toPersianDigits,
  formatMinutesPersian,
  formatHoursAndMinutesPersian,
  formatDurationPrimePersian,
} from '../utils/jalali.ts';
import {
  calculateStudyTimeIndexT,
  calculateExercisesIndexQ,
  calculateWeightedLearningQualityL,
  calculateEducationalCompositeScoreE,
  evaluatePeriodPerformance,
  getCardGradientTheme,
  calculateAllSubjectsProgressions,
} from '../utils/analyticsEngine.ts';
import {
  ShamsiDateField,
  type AnalyticsFilterMode,
  type ChartDisplayMode,
} from './ShamsiDateField.tsx';
import { SubjectLevelCard } from './LevelIdentityCard.tsx';
import { SubjectsLevelMap } from './SubjectsLevelMap.tsx';

interface ReportsHubViewProps {
  subjects: Subject[];
  categories: ActivityCategory[];
  onNavigateToPlanner?: () => void;
  initialSubjectId?: string | null;
  refreshTrigger?: number;
}

type ReportCategoryTab = 'subjects' | 'recreation';
type SubjectReportSubMode = 'comparison' | 'single';

interface SubjectUnitBreakdownItem {
  unitTitle: string;
  predictedMinutes: number;
  actualMinutes: number;
  exercisesCount: number;
  completedCount: number;
  totalCount: number;
  weightedQuality0To10: number | null;
  hasQualityData: boolean;
}

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
  unitBreakdown: SubjectUnitBreakdownItem[];
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
  initialSubjectId,
  refreshTrigger = 0,
}) => {
  const todayIso = getTodayISO();

  // Top-level extensible report category
  const [reportCategory, setReportCategory] = useState<ReportCategoryTab>('subjects');
  // Default internal tab in «تحلیل دروس» is «گزارش هر درس» ('single')
  const [subjectSubMode, setSubjectSubMode] = useState<SubjectReportSubMode>('single');

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
    () => initialSubjectId || activeSubjectsList[0]?.id || ''
  );

  // Sync deep-linked subject from PlannerView («تحلیل درس»)
  useEffect(() => {
    if (initialSubjectId) {
      setReportCategory('subjects');
      setSubjectSubMode('single');
      setSelectedSingleSubjectId(initialSubjectId);
    }
  }, [initialSubjectId]);

  // Minimum 2 and Maximum 5 subjects for simultaneous comparison
  const [comparedSubjectIds, setComparedSubjectIds] = useState<string[]>(() =>
    activeSubjectsList.slice(0, 4).map((s) => s.id)
  );
  const [isCompareDropdownOpen, setIsCompareDropdownOpen] = useState<boolean>(false);
  const [compareSelectionNotice, setCompareSelectionNotice] = useState<string | null>(null);
  const compareDropdownRef = useRef<HTMLDivElement | null>(null);

  // Chart Display Modes (default to 'aggregate')
  const [singleTimeChartMode, setSingleTimeChartMode] = useState<ChartDisplayMode>('aggregate');
  const [singleScoreChartMode, setSingleScoreChartMode] = useState<ChartDisplayMode>('aggregate');

  const [allTimePlans, setAllTimePlans] = useState<DailyPlanItem[]>([]);
  const [budgets, setBudgets] = useState<DailyTimeBudgetConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const singleReportSectionRef = useRef<HTMLDivElement | null>(null);

  // Sync selectedSingleSubjectId & comparedSubjectIds when subjects list changes
  useEffect(() => {
    if (
      activeSubjectsList.length > 0 &&
      !activeSubjectsList.some((s) => s.id === selectedSingleSubjectId)
    ) {
      setSelectedSingleSubjectId(activeSubjectsList[0].id);
    }
    if (comparedSubjectIds.length === 0 && activeSubjectsList.length > 0) {
      setComparedSubjectIds(activeSubjectsList.slice(0, 4).map((s) => s.id));
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

  // Close multi-select comparison dropdown on outside click
  useEffect(() => {
    if (!isCompareDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        compareDropdownRef.current &&
        !compareDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCompareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCompareDropdownOpen]);

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

  // Fetch all-time plans (for independent permanent Subject Levels & Staircase Map)
  // plus budgets for the active timeframe (silently on subsequent refreshes)
  useEffect(() => {
    let active = true;
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    Promise.all([
      api.getPlansByRange('2020-01-01', '2099-12-31'),
      api.getTimeBudgetsByRange(activeDateRange.start, activeDateRange.end),
    ])
      .then(([allPlansRes, budgetsRes]) => {
        if (!active) return;
        setAllTimePlans(allPlansRes);
        setBudgets(budgetsRes);
        hasLoadedOnceRef.current = true;
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeDateRange.start, activeDateRange.end, refreshTrigger]);

  // Slice plans cleanly to the active timeframe for interval reports & charts
  const plans = useMemo(
    () =>
      allTimePlans.filter(
        (p) => p.plan_date >= activeDateRange.start && p.plan_date <= activeDateRange.end
      ),
    [allTimePlans, activeDateRange.start, activeDateRange.end]
  );

  // Compute independent 39-Stage Subject Progressions across each subject's own full history
  const allSubjectsProgressions = useMemo(
    () =>
      calculateAllSubjectsProgressions({
        subjects: activeSubjectsList,
        allTimePlans,
        todayIso,
      }),
    [activeSubjectsList, allTimePlans, todayIso]
  );

  const progressionsBySubjectId = useMemo(() => {
    const map = new Map<string, (typeof allSubjectsProgressions)[number]>();
    for (const sp of allSubjectsProgressions) {
      map.set(sp.subjectId, sp);
    }
    return map;
  }, [allSubjectsProgressions]);

  const selectedSubjectProgression = useMemo(
    () =>
      allSubjectsProgressions.find((s) => s.subjectId === selectedSingleSubjectId) ||
      allSubjectsProgressions[0] ||
      null,
    [allSubjectsProgressions, selectedSingleSubjectId]
  );

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

    // Pre-bucket studyPlans in one O(N) pass instead of filtering inside loop
    const plansBySubjectId = new Map<string, DailyPlanItem[]>();
    const plansBySubjectName = new Map<string, DailyPlanItem[]>();
    for (const p of studyPlans) {
      if (p.subject_id) {
        const b = plansBySubjectId.get(p.subject_id);
        if (b) b.push(p);
        else plansBySubjectId.set(p.subject_id, [p]);
      }
      if (p.subject_name_snapshot) {
        const nb = plansBySubjectName.get(p.subject_name_snapshot);
        if (nb) nb.push(p);
        else plansBySubjectName.set(p.subject_name_snapshot, [p]);
      }
    }

    const summaries: SubjectAnalyticalSummary[] = [];

    for (const entry of subjectEntries.values()) {
      const byId = plansBySubjectId.get(entry.id) || [];
      const byName = plansBySubjectName.get(entry.name) || [];
      let subjPlans: DailyPlanItem[];
      if (byId.length === 0) {
        subjPlans = byName;
      } else if (byName.length === 0) {
        subjPlans = byId;
      } else {
        const seen = new Set(byId.map((p) => p.id));
        subjPlans = [...byId];
        for (const p of byName) {
          if (!seen.has(p.id)) subjPlans.push(p);
        }
      }

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
          unitPlans: DailyPlanItem[];
        }
      >();

      const subjPlansByDate = new Map<string, DailyPlanItem[]>();

      for (const p of subjPlans) {
        const dayBucket = subjPlansByDate.get(p.plan_date);
        if (dayBucket) dayBucket.push(p);
        else subjPlansByDate.set(p.plan_date, [p]);

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
          unitPlans: [],
        };
        existingU.predictedMinutes += pred;
        existingU.actualMinutes += act;
        existingU.exercisesCount += aEx;
        existingU.totalCount += 1;
        if (p.status === 'completed') existingU.completedCount += 1;
        existingU.unitPlans.push(p);
        unitMap.set(uTitle, existingU);
      }

      const unitBreakdown: SubjectUnitBreakdownItem[] = Array.from(unitMap.values()).map((u) => {
        const uQual = calculateWeightedLearningQualityL(u.unitPlans);
        return {
          unitTitle: u.unitTitle,
          predictedMinutes: u.predictedMinutes,
          actualMinutes: u.actualMinutes,
          exercisesCount: u.exercisesCount,
          completedCount: u.completedCount,
          totalCount: u.totalCount,
          weightedQuality0To10: uQual.weightedAverage0To10,
          hasQualityData: uQual.weightedAverage0To10 !== null,
        };
      });

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

      // Daily trend for this subject using O(1) indexed lookup + empty-day short-circuit (Short MM/DD format e.g. ۰۸/۲۳)
      const dailyTrend = dateIsoList.map((dIso) => {
        const daySubjPlans = subjPlansByDate.get(dIso);
        if (!daySubjPlans || daySubjPlans.length === 0) {
          return {
            dateIso: dIso,
            label: formatJalaliShortMonthDay(dIso),
            predictedMinutes: 0,
            actualMinutes: 0,
            actualExercises: 0,
            targetExercises: 0,
            quality0To10: 0,
            score0To100: 0,
          };
        }

        let dPred = 0;
        let dAct = 0;
        let dTEx = 0;
        let dAEx = 0;
        let dLogged = false;
        for (const p of daySubjPlans) {
          dPred += Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0));
          dAct += Math.max(0, Number(p.performance?.actual_minutes || 0));
          dTEx += Math.max(0, Number(p.target_exercises || 0));
          dAEx += Math.max(0, Number(p.performance?.exercises_count || 0));
          if (p.performance) dLogged = true;
        }
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
          label: formatJalaliShortMonthDay(dIso),
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
        unitBreakdown,
        dailyTrend,
      });
    }

    return summaries;
  }, [plans, activeSubjectsList, dateIsoList]);

  // Ensure initial comparedSubjectIds prefers up to 4 subjects with data when loaded
  const hasInitializedDefaultComparedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!loading && !hasInitializedDefaultComparedRef.current && allSubjectsAnalytics.length > 0) {
      hasInitializedDefaultComparedRef.current = true;
      const withData = allSubjectsAnalytics.filter((s) => s.plansCount > 0);
      if (withData.length >= 2) {
        setComparedSubjectIds(withData.slice(0, 4).map((s) => s.subjectId));
      } else {
        setComparedSubjectIds(allSubjectsAnalytics.slice(0, 4).map((s) => s.subjectId));
      }
    }
  }, [loading, allSubjectsAnalytics]);

  // Filtered subjects for Comparison View (strictly matching user's 2..5 selection)
  const comparedSubjectsAnalytics = useMemo(() => {
    return allSubjectsAnalytics.filter((s) => comparedSubjectIds.includes(s.subjectId));
  }, [allSubjectsAnalytics, comparedSubjectIds]);

  const isComparisonCountValid =
    comparedSubjectsAnalytics.length >= 2 && comparedSubjectsAnalytics.length <= 5;

  // 5 Key Comparative Insights
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

  // Recreation / Entertainment Report Summary
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

  // Toggle subject in Multi-Select Dropdown with max 5 limit
  const toggleComparedSubject = (id: string) => {
    setCompareSelectionNotice(null);
    setComparedSubjectIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) {
        setCompareSelectionNotice('حداکثر ۵ درس به‌صورت هم‌زمان قابل مقایسه است.');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Smart XAxis rotation & Persian digits helper
  const getSmartXAxisProps = (count: number) =>
    count > 3
      ? {
          angle: -35,
          textAnchor: 'end' as const,
          height: 60,
          tickMargin: 6,
          interval: 0,
          tickFormatter: (val: any) => toPersianDigits(val),
          tick: { fontSize: 10, fontWeight: 700 },
        }
      : {
          angle: 0,
          textAnchor: 'middle' as const,
          height: 36,
          tickMargin: 6,
          interval: 0,
          tickFormatter: (val: any) => toPersianDigits(val),
          tick: { fontSize: 11, fontWeight: 700 },
        };

  return (
    <div className="space-y-5 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* =====================================================================
          1. MAIN HEADER BANNER & 2 PRIMARY CATEGORY TABS («تحلیل دروس» | «فعالیت‌های تفریحی»)
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-700 via-violet-600 to-purple-700 text-white p-4 sm:p-6 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight whitespace-nowrap truncate">
              بخش گزارش‌ها و تحلیل‌های دروس
            </h1>
          </div>

          {/* 2 Equal-Width Primary Tabs on Mobile */}
          <div className="grid grid-cols-2 sm:inline-flex items-center w-full sm:w-auto gap-1.5 p-1.5 rounded-2xl bg-slate-950/30 backdrop-blur-md border border-white/15 min-w-0">
            <button
              type="button"
              onClick={() => setReportCategory('subjects')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer min-w-0 whitespace-nowrap ${
                reportCategory === 'subjects'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">تحلیل دروس</span>
            </button>
            <button
              type="button"
              onClick={() => setReportCategory('recreation')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer min-w-0 whitespace-nowrap ${
                reportCategory === 'recreation'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">فعالیت‌های تفریحی</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. UNIFIED TIMEFRAME SELECTOR AT THE TOP OF BOTH SECTIONS
          (Placed FIRST before any internal sub-tabs, filters, or reports,
           with redundant summary text below the selector removed)
      ===================================================================== */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 min-w-0">
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            انتخاب بازه زمانی گزارش:
          </span>

          {/* 4 Timeframe Mode Buttons */}
          <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 min-w-0">
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
                className={`px-2 sm:px-3.5 py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all cursor-pointer truncate text-center ${
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

        {/* Sub-controls for Timeframe (only rendered when needed; no summary text) */}
        {filterMode !== 'monthly' && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-start gap-3 min-w-0">
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
          </div>
        )}
      </div>

      {/* =====================================================================
          3. INTERNAL SUB-TABS FOR «تحلیل دروس»:
          1) «گزارش هر درس» (Default) | 2) «مقایسه درس‌ها»
      ===================================================================== */}
      {reportCategory === 'subjects' && (
        <div className="grid grid-cols-2 sm:inline-flex items-center w-full sm:w-auto gap-1.5 p-1.5 rounded-2xl bg-indigo-50/90 dark:bg-slate-900 border border-indigo-200/80 dark:border-slate-800 min-w-0">
          <button
            type="button"
            onClick={() => setSubjectSubMode('single')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              subjectSubMode === 'single'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">گزارش هر درس</span>
          </button>
          <button
            type="button"
            onClick={() => setSubjectSubMode('comparison')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              subjectSubMode === 'comparison'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">مقایسه درس‌ها</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse"
            />
          ))}
        </div>
      ) : reportCategory === 'subjects' ? (
        <div className="space-y-6 min-w-0">
          {subjectSubMode === 'comparison' ? (
            /* =================================================================
               MULTI-SUBJECT COMPARISON VIEW (مقایسه درس‌ها — ۲ تا ۵ درس)
            ================================================================= */
            <div className="space-y-6 min-w-0">
            {/* Multi-Select Dropdown Bar (Min 2, Max 5 Subjects) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>انتخاب درس‌ها جهت مقایسه هم‌زمان (حداقل ۲ و حداکثر ۵ درس):</span>
                </div>

                {/* Multi-select Dropdown with Checkboxes */}
                <div className="relative w-full sm:w-88 shrink-0" ref={compareDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCompareDropdownOpen((prev) => !prev)}
                    aria-expanded={isCompareDropdownOpen}
                    className="w-full flex items-center justify-between gap-2 rounded-2xl border border-indigo-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-extrabold text-slate-900 dark:text-white hover:border-indigo-400 transition-colors cursor-pointer"
                  >
                    <span className="truncate text-right">
                      {comparedSubjectsAnalytics.length > 0
                        ? `${comparedSubjectsAnalytics.map((s) => s.subjectName).join('، ')} (${toPersianDigits(
                            comparedSubjectsAnalytics.length
                          )} درس)`
                        : 'انتخاب درس‌ها (حداقل ۲ و حداکثر ۵ درس)...'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform duration-200 ${
                        isCompareDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isCompareDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 z-30 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2.5 space-y-2 max-h-72 overflow-y-auto">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>
                          انتخاب‌شده: {toPersianDigits(comparedSubjectIds.length)} از حداکثر ۵ درس
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCompareSelectionNotice(null);
                            const withData = allSubjectsAnalytics.filter((s) => s.plansCount > 0);
                            const initial = (withData.length >= 2 ? withData : allSubjectsAnalytics)
                              .slice(0, 5)
                              .map((s) => s.subjectId);
                            setComparedSubjectIds(initial);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold cursor-pointer"
                        >
                          انتخاب خودکار تا ۵ درس
                        </button>
                      </div>

                      {compareSelectionNotice && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{compareSelectionNotice}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        {allSubjectsAnalytics.map((subj) => {
                          const isChecked = comparedSubjectIds.includes(subj.subjectId);
                          const isDisabled = !isChecked && comparedSubjectIds.length >= 5;
                          return (
                            <button
                              key={subj.subjectId}
                              type="button"
                              onClick={() => toggleComparedSubject(subj.subjectId)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                isChecked
                                  ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-950 dark:text-white'
                                  : isDisabled
                                  ? 'opacity-55 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    isChecked
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="truncate font-extrabold">{subj.subjectName}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                                {subj.actualMinutes > 0
                                  ? formatDurationPrimePersian(subj.actualMinutes)
                                  : 'بدون ثبت'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {compareSelectionNotice && !isCompareDropdownOpen && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 px-3 py-2 text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                  <span>{compareSelectionNotice}</span>
                  <button
                    type="button"
                    onClick={() => setCompareSelectionNotice(null)}
                    className="text-[11px] underline cursor-pointer"
                  >
                    بستن پیام
                  </button>
                </div>
              )}
            </div>

            {!isComparisonCountValid ? (
              <div className="rounded-3xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/25 p-6 text-center space-y-2">
                <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 mx-auto" />
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  لطفاً حداقل ۲ درس (و حداکثر ۵ درس) را برای نمایش مقایسه انتخاب کنید
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  برای حفظ خوانایی نمودارها و دقت مقایسه، لازم است از منوی کشویی بالا حداقل ۲ درس و حداکثر ۵ درس انتخاب شده باشد.
                </p>
              </div>
            ) : (
              <>
                {/* 5 Key Comparative Highlight Cards (Strictly 2 Lines Each) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-stretch">
                  {/* 1. بیشترین زمان مطالعه */}
                  <div className="h-full rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <span>بیشترین مطالعه: </span>
                        <span className="text-indigo-700 dark:text-indigo-300">
                          {comparativeHighlights.topStudy
                            ? comparativeHighlights.topStudy.subjectName
                            : 'بدون داده'}
                        </span>
                      </div>
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                      زمان ثبت‌شده:{' '}
                      <strong className="text-indigo-700 dark:text-indigo-300">
                        {comparativeHighlights.topStudy
                          ? formatDurationPrimePersian(comparativeHighlights.topStudy.actualMinutes)
                          : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* 2. بیشترین تست و تمرین */}
                  <div className="h-full rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <span>بیشترین تست: </span>
                        <span className="text-blue-700 dark:text-blue-300">
                          {comparativeHighlights.topExercises
                            ? comparativeHighlights.topExercises.subjectName
                            : 'بدون داده'}
                        </span>
                      </div>
                      <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                      تعداد حل‌شده:{' '}
                      <strong className="text-blue-700 dark:text-blue-300">
                        {comparativeHighlights.topExercises
                          ? toPersianDigits(comparativeHighlights.topExercises.actualExercises)
                          : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* 3. بهترین کیفیت یادگیری */}
                  <div className="h-full rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <span>بهترین کیفیت: </span>
                        <span className="text-purple-700 dark:text-purple-300">
                          {comparativeHighlights.topQuality
                            ? comparativeHighlights.topQuality.subjectName
                            : 'بدون داده'}
                        </span>
                      </div>
                      <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                      میانگین وزنی:{' '}
                      <strong className="text-purple-700 dark:text-purple-300">
                        {comparativeHighlights.topQuality &&
                        comparativeHighlights.topQuality.weightedQuality0To10 !== null
                          ? `${toPersianDigits(
                              String(comparativeHighlights.topQuality.weightedQuality0To10).replace(
                                '.',
                                '/'
                              )
                            )} از ۱۰`
                          : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* 4. بیشترین فاصله با هدف */}
                  <div className="h-full rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <span>بیشترین فاصله: </span>
                        <span className="text-amber-700 dark:text-amber-300">
                          {comparativeHighlights.maxGap
                            ? comparativeHighlights.maxGap.subjectName
                            : 'منطبق با برنامه'}
                        </span>
                      </div>
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                      {comparativeHighlights.maxGap ? (
                        <>
                          کسری نسبت به پیش‌بینی:{' '}
                          <strong className="text-amber-700 dark:text-amber-300">
                            {formatDurationPrimePersian(comparativeHighlights.maxGap.shortfallMinutes)}
                          </strong>
                        </>
                      ) : (
                        'بدون کسری زمان'
                      )}
                    </div>
                  </div>

                  {/* 5. بهترین امتیاز عملکرد */}
                  <div className="h-full rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        <span>بهترین امتیاز: </span>
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {comparativeHighlights.topScore
                            ? comparativeHighlights.topScore.subjectName
                            : 'بدون داده'}
                        </span>
                      </div>
                      <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                      امتیاز کل:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-300">
                        {comparativeHighlights.topScore &&
                        comparativeHighlights.topScore.performanceScore0To100 !== null
                          ? `${toPersianDigits(comparativeHighlights.topScore.performanceScore0To100)} از ۱۰۰`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Comparative Charts Grid (Readable for 2..5 subjects with capped column width) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                  {/* Chart A */}
                  <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      مقایسه زمان مطالعه واقعی و پیش‌بینی‌شده درس‌ها
                    </h3>

                    <div className="h-72 w-full min-w-0" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparedSubjectsAnalytics}
                          margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                          barGap={4}
                          barCategoryGap="24%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="subjectName"
                            {...getSmartXAxisProps(comparedSubjectsAnalytics.length)}
                          />
                          <YAxis
                            tickFormatter={(val) => toPersianDigits(val)}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            formatter={(val: any, name?: any) => [
                              formatDurationPrimePersian(Number(val)),
                              String(name ?? ''),
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                          <Bar
                            dataKey="predictedMinutes"
                            name="زمان پیش‌بینی"
                            fill="#94a3b8"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                          />
                          <Bar
                            dataKey="actualMinutes"
                            name="زمان مطالعه واقعی"
                            fill="#4f46e5"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart B */}
                  <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      مقایسه امتیاز عملکرد و تعداد تست در هر درس
                    </h3>

                    <div className="h-72 w-full min-w-0" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={comparedSubjectsAnalytics}
                          margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                          barCategoryGap="26%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="subjectName"
                            {...getSmartXAxisProps(comparedSubjectsAnalytics.length)}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tickFormatter={(val) => toPersianDigits(val)}
                            tick={{ fontSize: 11 }}
                          />
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
                            maxBarSize={36}
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

                {/* Comprehensive Subject Comparison (Mobile Cards + Desktop Table) */}
                <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      جدول جامع مقایسه شاخص‌های عملکرد درس‌ها
                    </h3>
                  </div>

                  {/* Mobile Card View (Zero Horizontal Scroll) */}
                  <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                    {comparedSubjectsAnalytics.map((subj) => {
                      const prog = progressionsBySubjectId.get(subj.subjectId);
                      return (
                        <div key={subj.subjectId} className="p-3.5 space-y-2 text-xs tabular-nums">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-black text-slate-900 dark:text-white text-sm truncate">
                                {subj.subjectName}
                              </span>
                              {prog && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                                    prog.continuityStatus === 'critical'
                                      ? 'bg-rose-600 text-white'
                                      : prog.continuityStatus === 'warning'
                                      ? 'bg-amber-500 text-slate-950'
                                      : prog.continuityStatus === 'attention'
                                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {prog.continuityStatusLabelFa}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSingleSubjectId(subj.subjectId);
                                setSubjectSubMode('single');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 text-[11px] font-extrabold cursor-pointer shrink-0"
                            >
                              گزارش درس
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <span>
                              مطالعه:{' '}
                              <strong className="text-indigo-700 dark:text-indigo-300">
                                {formatDurationPrimePersian(subj.actualMinutes)}
                              </strong>{' '}
                              از {formatDurationPrimePersian(subj.predictedMinutes)} (
                              {toPersianDigits(subj.adherenceRatioPct)}٪)
                            </span>
                            <span>
                              تست: <strong>{toPersianDigits(subj.actualExercises)}</strong> | امتیاز:{' '}
                              <strong className="text-emerald-700 dark:text-emerald-300">
                                {subj.performanceScore0To100 !== null
                                  ? `${toPersianDigits(subj.performanceScore0To100)} از ۱۰۰`
                                  : '—'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right text-xs sm:text-sm">
                      <thead className="bg-slate-50/90 dark:bg-slate-800/50 text-xs font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4">نام درس</th>
                          <th className="py-3.5 px-4">وضعیت پیوستگی</th>
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
                        {comparedSubjectsAnalytics.map((subj) => {
                          const prog = progressionsBySubjectId.get(subj.subjectId);
                          return (
                            <tr
                              key={subj.subjectId}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                                {subj.subjectName}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {prog ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                      prog.continuityStatus === 'critical'
                                        ? 'bg-rose-600 text-white'
                                        : prog.continuityStatus === 'warning'
                                        ? 'bg-amber-500 text-slate-950'
                                        : prog.continuityStatus === 'attention'
                                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    }`}
                                  >
                                    {prog.continuityStatusLabelFa}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatDurationPrimePersian(subj.predictedMinutes)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                              {formatDurationPrimePersian(subj.actualMinutes)}
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
                              {toPersianDigits(subj.actualExercises)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                              {subj.weightedQuality0To10 !== null
                                ? `${toPersianDigits(
                                    String(subj.weightedQuality0To10).replace('.', '/')
                                  )} از ۱۰`
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* =================================================================
             SINGLE-SUBJECT DEDICATED REPORT («گزارش هر درس»)
          ================================================================= */
          <div ref={singleReportSectionRef} className="space-y-6 min-w-0">
            {/* Subject Selector Bar */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
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

            {/* Independent Dedicated Subject Level Card */}
            {selectedSubjectProgression && (
              <SubjectLevelCard progression={selectedSubjectProgression} />
            )}

            {singleSubjectSummary && (
              <>
                {/* 6 UNIFORM 2-LINE STATISTICAL CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* Card 1: مجموع ساعات مطالعه */}
                  <div className="h-full rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                        <span>مجموع ساعات مطالعه: </span>
                        <span className="text-indigo-700 dark:text-indigo-300">
                          {formatDurationPrimePersian(singleSubjectSummary.actualMinutes)}
                        </span>
                      </div>
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>
                        پیش‌بینی: {formatDurationPrimePersian(singleSubjectSummary.predictedMinutes)}
                      </span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                        تحقق: {toPersianDigits(singleSubjectSummary.adherenceRatioPct)}٪
                      </span>
                    </div>
                  </div>

                  {/* Card 2: تست‌ها و تمرین‌های حل‌شده */}
                  <div className="h-full rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                        <span>تست‌ها و تمرین‌های حل‌شده: </span>
                        <span className="text-blue-700 dark:text-blue-300">
                          {toPersianDigits(singleSubjectSummary.actualExercises)}
                        </span>
                      </div>
                      <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>
                        هدف تعیین‌شده:{' '}
                        {singleSubjectSummary.targetExercises > 0
                          ? toPersianDigits(singleSubjectSummary.targetExercises)
                          : 'بدون هدف عددی'}
                      </span>
                      <span className="font-extrabold text-blue-700 dark:text-blue-300">
                        {singleSubjectSummary.targetExercises > 0
                          ? `تحقق: ${toPersianDigits(
                              Math.min(
                                100,
                                Math.round(
                                  (singleSubjectSummary.actualExercises /
                                    singleSubjectSummary.targetExercises) *
                                    100
                                )
                              )
                            )}٪`
                          : 'ثبت آزاد'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: میانگین کیفیت یادگیری */}
                  <div className="h-full rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                        <span>میانگین کیفیت یادگیری: </span>
                        <span className="text-purple-700 dark:text-purple-300">
                          {singleSubjectSummary.weightedQuality0To10 !== null
                            ? toPersianDigits(
                                String(singleSubjectSummary.weightedQuality0To10).replace('.', '/')
                              )
                            : 'ثبت‌نشده'}
                        </span>
                      </div>
                      <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      <span className="truncate">میانگین وزنی بر پایه زمان مطالعه</span>
                      <span className="font-extrabold text-purple-700 dark:text-purple-300 shrink-0">
                        از ۱۰ نمره
                      </span>
                    </div>
                  </div>

                  {/* Card 4: امتیاز عملکرد درس */}
                  <div className="h-full rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                        <span>امتیاز عملکرد درس: </span>
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {singleSubjectSummary.performanceScore0To100 !== null
                            ? `${toPersianDigits(singleSubjectSummary.performanceScore0To100)} از ۱۰۰`
                            : 'ثبت‌نشده'}
                        </span>
                      </div>
                      <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                      ترکیب تحقق زمان مطالعه، تست و کیفیت یادگیری
                    </div>
                  </div>

                  {/* Card 5: سهم این درس از کل زمان مطالعه */}
                  <div className="h-full rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/85 via-white to-sky-50/40 dark:from-sky-950/35 dark:via-slate-900 dark:to-sky-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                        <span>سهم این درس از کل زمان مطالعه: </span>
                        <span className="text-sky-700 dark:text-sky-300">
                          {toPersianDigits(singleSubjectSummary.shareOfTotalStudyPct)}٪
                        </span>
                      </div>
                      <Target className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                      از مجموع {formatDurationPrimePersian(periodOverview.totalStudyMinutes)} مطالعه کل دروس
                    </div>
                  </div>

                  {/* Card 6: میزان تکمیل جلسات درس */}
                  <div className="h-full rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                        <span>میزان تکمیل جلسات درس: </span>
                        <span className="text-amber-700 dark:text-amber-300">
                          {toPersianDigits(singleSubjectSummary.completedCount)} از{' '}
                          {toPersianDigits(singleSubjectSummary.plansCount)}
                        </span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>نرخ تکمیل برنامه درس:</span>
                      <span className="font-extrabold text-amber-700 dark:text-amber-300">
                        {toPersianDigits(singleSubjectSummary.taskCompletionPct)}٪
                      </span>
                    </div>
                  </div>
                </div>

                {/* SINGLE-SUBJECT TREND CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                  {/* Chart 1: زمان مطالعه درس */}
                  <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        زمان مطالعه درس
                      </h3>

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

                    <div className="h-68 w-full min-w-0" dir="ltr">
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
                            barCategoryGap="28%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              angle={0}
                              textAnchor="middle"
                              height={36}
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 11, fontWeight: 700 }}
                            />
                            <YAxis
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={(val: any) => [
                                formatDurationPrimePersian(Number(val)),
                                'مجموع در بازه',
                              ]}
                            />
                            <Bar dataKey="minutes" radius={[8, 8, 0, 0]} maxBarSize={42}>
                              <Cell fill="#4f46e5" />
                              <Cell fill="#94a3b8" />
                            </Bar>
                          </BarChart>
                        ) : (
                          <BarChart
                            data={singleSubjectSummary.dailyTrend}
                            margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                            barGap={4}
                            barCategoryGap="24%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="label"
                              {...getSmartXAxisProps(singleSubjectSummary.dailyTrend.length)}
                            />
                            <YAxis
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={(val: any, name?: any) => [
                                formatDurationPrimePersian(Number(val)),
                                String(name ?? ''),
                              ]}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                            <Bar
                              dataKey="predictedMinutes"
                              name="پیش‌بینی"
                              fill="#94a3b8"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={32}
                            />
                            <Bar
                              dataKey="actualMinutes"
                              name="مطالعه واقعی"
                              fill="#4f46e5"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={32}
                            />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: روند امتیاز عملکرد و تست‌های حل‌شده */}
                  <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        روند امتیاز عملکرد و تست‌های حل‌شده
                      </h3>

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

                    <div className="h-68 w-full min-w-0" dir="ltr">
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
                            barCategoryGap="28%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              angle={0}
                              textAnchor="middle"
                              height={36}
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 10, fontWeight: 700 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={(val: any) => [
                                `${toPersianDigits(Math.round(Number(val)))} از ۱۰۰`,
                                'شاخص تجمیعی درس',
                              ]}
                            />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={42}>
                              <Cell fill="#10b981" />
                              <Cell fill="#4f46e5" />
                              <Cell fill="#9333ea" />
                            </Bar>
                          </BarChart>
                        ) : (
                          <ComposedChart
                            data={singleSubjectSummary.dailyTrend}
                            margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                            barCategoryGap="24%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="label"
                              {...getSmartXAxisProps(singleSubjectSummary.dailyTrend.length)}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 11 }}
                            />
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
                              maxBarSize={36}
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

                {/* RESPONSIVE CHAPTER / UNIT BREAKDOWN */}
                <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      تفکیک عملکرد فصل‌ها و بخش‌های درس «{singleSubjectSummary.subjectName}»
                    </h3>
                  </div>

                  {singleSubjectSummary.unitBreakdown.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                      در این بازه زمانی هنوز فعالیتی برای فصل‌های این درس ثبت نشده است.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Compact 2-Line Cards */}
                      <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                        {singleSubjectSummary.unitBreakdown.map((u) => (
                          <div key={u.unitTitle} className="p-3.5 space-y-1.5 text-xs tabular-nums">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-slate-900 dark:text-white truncate">
                                {u.unitTitle}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold shrink-0">
                                {toPersianDigits(u.completedCount)} از {toPersianDigits(u.totalCount)} کامل
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                              <span>
                                مطالعه:{' '}
                                <strong className="text-indigo-700 dark:text-indigo-300">
                                  {formatDurationPrimePersian(u.actualMinutes)}
                                </strong>{' '}
                                (پیش‌بینی: {formatDurationPrimePersian(u.predictedMinutes)})
                              </span>
                              <span>
                                تست: <strong className="text-blue-600 dark:text-blue-400">{toPersianDigits(u.exercisesCount)}</strong>
                                {' | '}
                                کیفیت:{' '}
                                <strong className="text-purple-700 dark:text-purple-300">
                                  {u.weightedQuality0To10 !== null
                                    ? toPersianDigits(String(u.weightedQuality0To10).replace('.', '/'))
                                    : '—'}
                                </strong>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right text-xs sm:text-sm">
                          <thead className="bg-slate-50/90 dark:bg-slate-800/50 text-xs font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-3 px-5">عنوان فصل / بخش</th>
                              <th className="py-3 px-5">زمان پیش‌بینی</th>
                              <th className="py-3 px-5">زمان واقعی</th>
                              <th className="py-3 px-5">تعداد تست / تمرین</th>
                              <th className="py-3 px-5">کیفیت یادگیری</th>
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
                                  {formatDurationPrimePersian(u.predictedMinutes)}
                                </td>
                                <td className="py-3.5 px-5 font-bold text-indigo-700 dark:text-indigo-300">
                                  {formatDurationPrimePersian(u.actualMinutes)}
                                </td>
                                <td className="py-3.5 px-5 font-bold text-blue-600 dark:text-blue-400">
                                  {toPersianDigits(u.exercisesCount)}
                                </td>
                                <td className="py-3.5 px-5 font-bold text-purple-700 dark:text-purple-300">
                                  {u.weightedQuality0To10 !== null
                                    ? `${toPersianDigits(
                                        String(u.weightedQuality0To10).replace('.', '/')
                                      )} از ۱۰`
                                    : 'بدون ثبت'}
                                </td>
                                <td className="py-3.5 px-5 font-semibold text-emerald-700 dark:text-emerald-300">
                                  {toPersianDigits(u.completedCount)} از{' '}
                                  {toPersianDigits(u.totalCount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* 3 CHAPTER / UNIT COMPARATIVE BAR CHARTS */}
                {singleSubjectSummary.unitBreakdown.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-w-0">
                    {/* Chapter Chart 1: مقایسه تعداد تست و تمرین فصل‌ها */}
                    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3 min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        مقایسه تعداد تست و تمرین فصل‌ها
                      </h4>
                      <div className="h-60 w-full min-w-0" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={singleSubjectSummary.unitBreakdown}
                            margin={{ top: 10, right: 10, left: -18, bottom: 10 }}
                            barCategoryGap="28%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="unitTitle"
                              {...getSmartXAxisProps(singleSubjectSummary.unitBreakdown.length)}
                            />
                            <YAxis
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                              formatter={(val: any) => [
                                `${toPersianDigits(Number(val))} تست و تمرین`,
                                'تعداد حل‌شده',
                              ]}
                            />
                            <Bar
                              dataKey="exercisesCount"
                              name="تست و تمرین"
                              fill="#2563eb"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={36}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chapter Chart 2: مقایسه زمان مطالعه فصل‌ها */}
                    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3 min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        مقایسه زمان مطالعه فصل‌ها
                      </h4>
                      <div className="h-60 w-full min-w-0" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={singleSubjectSummary.unitBreakdown}
                            margin={{ top: 10, right: 10, left: -18, bottom: 10 }}
                            barGap={4}
                            barCategoryGap="26%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="unitTitle"
                              {...getSmartXAxisProps(singleSubjectSummary.unitBreakdown.length)}
                            />
                            <YAxis
                              tickFormatter={(val) => toPersianDigits(val)}
                              tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                              formatter={(val: any, name?: any) => [
                                formatDurationPrimePersian(Number(val)),
                                String(name ?? ''),
                              ]}
                            />
                            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                            <Bar
                              dataKey="predictedMinutes"
                              name="پیش‌بینی"
                              fill="#94a3b8"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={30}
                            />
                            <Bar
                              dataKey="actualMinutes"
                              name="مطالعه واقعی"
                              fill="#4f46e5"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={30}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chapter Chart 3: مقایسه کیفیت یادگیری فصل‌ها */}
                    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3 min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        مقایسه کیفیت یادگیری فصل‌ها
                      </h4>
                      {singleSubjectSummary.unitBreakdown.filter((u) => u.hasQualityData).length ===
                      0 ? (
                        <div className="h-60 flex items-center justify-center text-center text-xs font-bold text-slate-500 dark:text-slate-400 px-4">
                          هنوز نمره کیفیت یادگیری برای فصل‌های این درس در بازه انتخابی ثبت نشده است.
                        </div>
                      ) : (
                        <div className="h-60 w-full min-w-0" dir="ltr">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={singleSubjectSummary.unitBreakdown.filter(
                                (u) => u.hasQualityData
                              )}
                              margin={{ top: 10, right: 10, left: -18, bottom: 10 }}
                              barCategoryGap="28%"
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="unitTitle"
                                {...getSmartXAxisProps(
                                  singleSubjectSummary.unitBreakdown.filter((u) => u.hasQualityData)
                                    .length
                                )}
                              />
                              <YAxis
                                domain={[0, 10]}
                                tickFormatter={(val) => toPersianDigits(val)}
                                tick={{ fontSize: 10 }}
                              />
                              <Tooltip
                                formatter={(val: any) => [
                                  `${toPersianDigits(
                                    String(Number(val)).replace('.', '/')
                                  )} از ۱۰`,
                                  'میانگین وزنی کیفیت',
                                ]}
                              />
                              <Bar
                                dataKey="weightedQuality0To10"
                                name="کیفیت یادگیری (از ۱۰)"
                                fill="#9333ea"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={36}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          )}

          {/* =================================================================
              ALL-TIME SUBJECTS STAIRCASE PROGRESSION MAP («نقشه سطح و پیشرفت دروس»)
          ================================================================= */}
          <SubjectsLevelMap
            subjectProgressions={allSubjectsProgressions}
            onInspectSubjectReport={(subjectId) => {
              setSelectedSingleSubjectId(subjectId);
              setSubjectSubMode('single');
              setTimeout(() => {
                singleReportSectionRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }, 60);
            }}
          />
        </div>
      ) : (
        /* ===================================================================
           RECREATIONAL & ENTERTAINMENT ACTIVITIES REPORT TAB («فعالیت‌های تفریحی»)
           All 4 Statistical Cards Redesigned to Strictly 2 Lines Maximum
        =================================================================== */
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            {/* Card 1: مجموع زمان سرگرمی در بازه */}
            <div className="h-full rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                  <span>مجموع زمان سرگرمی در بازه: </span>
                  <span className="text-amber-700 dark:text-amber-300">
                    {formatDurationPrimePersian(periodOverview.totalRestrictedActualMinutes)}
                  </span>
                </div>
                <Gamepad2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums truncate">
                میانگین روزانه:{' '}
                <strong className="text-amber-700 dark:text-amber-300">
                  {formatDurationPrimePersian(periodOverview.avgDailyRestrictedActualMinutes)}
                </strong>
              </div>
            </div>

            {/* Card 2: مجموع سقف مجاز پیش‌بینی‌شده */}
            <div className="h-full rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/85 via-white to-sky-50/40 dark:from-sky-950/35 dark:via-slate-900 dark:to-sky-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                  <span>مجموع سقف مجاز پیش‌بینی‌شده: </span>
                  <span className="text-sky-700 dark:text-sky-300">
                    {formatDurationPrimePersian(periodOverview.totalRestrictedAllowedMinutes)}
                  </span>
                </div>
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              </div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                بر اساس برنامه‌ریزی فعالیت‌های تفریحی
              </div>
            </div>

            {/* Card 3: مجموع تخطی از سقف مجاز */}
            <div className="h-full rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/85 via-white to-rose-50/40 dark:from-rose-950/35 dark:via-slate-900 dark:to-rose-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                  <span>مجموع تخطی از سقف مجاز: </span>
                  <span className="text-rose-700 dark:text-rose-300">
                    {formatDurationPrimePersian(periodOverview.totalRestrictedOveruseMinutes)}
                  </span>
                </div>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              </div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                زمان مصرفی فراتر از سقف تعیین‌شده
              </div>
            </div>

            {/* Card 4: شاخص کنترل سرگرمی‌ها (C) */}
            <div className="h-full rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 px-3.5 py-3 shadow-2xs flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
                  <span>شاخص کنترل سرگرمی‌ها (C): </span>
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {periodOverview.averageRestrictedControlIndexC !== null
                      ? `${toPersianDigits(periodOverview.averageRestrictedControlIndexC)}٪`
                      : 'ثبت‌نشده'}
                  </span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                میانگین پایبندی به سقف مجاز تفریحات
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              مقایسه سقف مجاز، مصرف واقعی و تخطی فعالیت‌های تفریحی در بازه انتخابی
            </h3>
            <div className="h-72 w-full min-w-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={periodOverview.dailyEvaluations.map((d) => ({
                    label: formatJalaliShortMonthDay(d.dateIso),
                    allowed: d.restrictedAllowedLoggedMinutes || d.restrictedPlannedMinutes,
                    actual: d.restrictedActualMinutes,
                    overuse: d.restrictedOveruseMinutes,
                  }))}
                  margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                  barGap={3}
                  barCategoryGap="24%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...getSmartXAxisProps(periodOverview.dailyEvaluations.length)}
                  />
                  <YAxis
                    tickFormatter={(val) => toPersianDigits(val)}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(val: any, name?: any) => [
                      formatDurationPrimePersian(Number(val)),
                      String(name ?? ''),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar
                    dataKey="allowed"
                    name="سقف مجاز"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="actual"
                    name="مصرف واقعی"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="overuse"
                    name="تخطی از سقف"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
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
