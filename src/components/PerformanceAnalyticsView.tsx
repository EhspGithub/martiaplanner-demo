import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Clock,
  FileCheck2,
  Award,
  Trophy,
  Timer,
  Gamepad2,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import type { DailyTimeBudgetConfig } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  getDateRangeISOList,
  formatJalaliCompact,
  formatJalaliFull,
  formatJalaliWeekdaySlash,
  isoToJalali,
  getJalaliMonthGrid,
  toPersianDigits,
  formatMinutesPersian,
  formatHoursAndMinutesPersian,
} from '../utils/jalali.ts';
import {
  evaluatePeriodPerformance,
  compareTwoPeriods,
  type PeriodPerformanceSummary,
  type MetricComparisonDelta,
} from '../utils/analyticsEngine.ts';
import { WeeklyStudyChart } from './WeeklyStudyChart.tsx';

export type AnalyticsFilterMode = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ChartDisplayMode = 'aggregate' | 'daily';

const SHORT_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function formatDeltaBadgeText(delta: MetricComparisonDelta): string {
  if (delta.baseValue === null || delta.targetValue === null) return 'بدون داده کافی';
  if (delta.isBaseZero) {
    return delta.targetValue === 0 ? '۰٪ تغییر' : 'افزایش از صفر';
  }
  if (delta.percentChange === null) return '—';
  const sign = delta.percentChange > 0 ? '+' : '';
  return `${sign}${toPersianDigits(delta.percentChange)}٪`;
}

export interface CompactJalaliCalendarProps {
  selectedIso: string;
  onSelectIso: (iso: string) => void;
}

export const CompactJalaliCalendar: React.FC<CompactJalaliCalendarProps> = ({
  selectedIso,
  onSelectIso,
}) => {
  const todayIso = getTodayISO();
  const initialJalali = useMemo(
    () => isoToJalali(selectedIso || todayIso),
    [selectedIso, todayIso]
  );
  const [viewJy, setViewJy] = useState<number>(initialJalali.jy);
  const [viewJm, setViewJm] = useState<number>(initialJalali.jm);

  useEffect(() => {
    const j = isoToJalali(selectedIso || todayIso);
    setViewJy(j.jy);
    setViewJm(j.jm);
  }, [selectedIso, todayIso]);

  const monthGrid = useMemo(() => getJalaliMonthGrid(viewJy, viewJm), [viewJy, viewJm]);

  const handlePrevMonth = () => {
    if (viewJm === 1) {
      setViewJy((y) => y - 1);
      setViewJm(12);
    } else {
      setViewJm((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewJm === 12) {
      setViewJy((y) => y + 1);
      setViewJm(1);
    } else {
      setViewJm((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = isoToJalali(todayIso);
    setViewJy(t.jy);
    setViewJm(t.jm);
    onSelectIso(todayIso);
  };

  return (
    <div className="w-72 rounded-2xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-xl shadow-indigo-950/15 space-y-2.5">
      {/* Calendar Header: Month/Year & Navigation */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            title="ماه قبل"
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-black text-slate-900 dark:text-white px-1.5 tabular-nums">
            {monthGrid.monthName} {toPersianDigits(monthGrid.jy)}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            title="ماه بعد"
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoToday}
          className="px-2.5 py-1 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/70 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200/70 transition-colors cursor-pointer"
        >
          امروز
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {SHORT_WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 py-0.5"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthGrid.firstDayWeekdayIndex }).map((_, emptyIdx) => (
          <div key={`empty-${emptyIdx}`} className="h-7" />
        ))}
        {monthGrid.days.map((d) => {
          const isSelected = d.isoDate === selectedIso;
          return (
            <button
              key={d.isoDate}
              type="button"
              onClick={() => onSelectIso(d.isoDate)}
              className={`h-7 rounded-lg text-[11px] font-extrabold tabular-nums flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30 scale-105'
                  : d.isToday
                  ? 'border border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/70'
              }`}
            >
              {d.persianDay}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1 font-bold">
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>روز انتخابی:</span>
        </span>
        <span className="font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
          {formatJalaliWeekdaySlash(selectedIso)}
        </span>
      </div>
    </div>
  );
};

export interface ShamsiDateFieldProps {
  label?: string;
  selectedIso: string;
  onSelectIso: (iso: string) => void;
  align?: 'right' | 'left';
  compact?: boolean;
}

export const ShamsiDateField: React.FC<ShamsiDateFieldProps> = ({
  label,
  selectedIso,
  onSelectIso,
  align = 'right',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const todayIso = getTodayISO();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      <div className="flex items-center gap-2">
        {label && (
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full sm:w-auto inline-flex items-center justify-between gap-2 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${
            compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
          } text-xs font-extrabold text-slate-900 dark:text-white hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-2xs`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="tabular-nums truncate">
              {formatJalaliFull(selectedIso)}
              {selectedIso === todayIso ? ' (امروز)' : ''}
            </span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 top-full mt-2 max-w-[calc(100vw-1.5rem)] ${
            align === 'left' ? 'left-0 sm:right-auto' : 'right-0'
          }`}
        >
          <CompactJalaliCalendar
            selectedIso={selectedIso}
            onSelectIso={(iso) => {
              onSelectIso(iso);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

interface ChartModeToggleProps {
  mode: ChartDisplayMode;
  onChange: (mode: ChartDisplayMode) => void;
}

const ChartModeToggle: React.FC<ChartModeToggleProps> = ({ mode, onChange }) => (
  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
    <button
      type="button"
      onClick={() => onChange('aggregate')}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
        mode === 'aggregate'
          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
      }`}
    >
      نمایش تجمیعی
    </button>
    <button
      type="button"
      onClick={() => onChange('daily')}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
        mode === 'daily'
          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
      }`}
    >
      نمایش روزانه
    </button>
  </div>
);

export const PerformanceAnalyticsView: React.FC = () => {
  const todayIso = getTodayISO();
  const currentWeekDays = useMemo(() => getPersianWeekDays(todayIso), [todayIso]);

  // Default to daily or weekly; when user clicks 'روزانه', singleDate defaults to todayIso
  const [filterMode, setFilterMode] = useState<AnalyticsFilterMode>('weekly');
  const [singleDate, setSingleDate] = useState<string>(todayIso);
  const [isDailyCalendarOpen, setIsDailyCalendarOpen] = useState<boolean>(false);
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);

  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [customStart, setCustomStart] = useState<string>(addDaysISO(todayIso, -6));
  const [customEnd, setCustomEnd] = useState<string>(todayIso);

  // Section 4: All 6 charts have Daily/Aggregate mode, defaulting to 'aggregate'
  const [chart1Mode, setChart1Mode] = useState<ChartDisplayMode>('aggregate');
  const [chart2Mode, setChart2Mode] = useState<ChartDisplayMode>('aggregate');
  const [chart3Mode, setChart3Mode] = useState<ChartDisplayMode>('aggregate');
  const [chart4Mode, setChart4Mode] = useState<ChartDisplayMode>('aggregate');
  const [chart5Mode, setChart5Mode] = useState<ChartDisplayMode>('aggregate');
  const [chart6Mode, setChart6Mode] = useState<ChartDisplayMode>('aggregate');

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

  // Reset all charts to 'aggregate' default whenever timeframe selection changes (Section 4.2)
  useEffect(() => {
    setChart1Mode('aggregate');
    setChart2Mode('aggregate');
    setChart3Mode('aggregate');
    setChart4Mode('aggregate');
    setChart5Mode('aggregate');
    setChart6Mode('aggregate');
  }, [filterMode, singleDate, weekRefDate, customStart, customEnd]);

  // Period Comparison state (Section 10.9)
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [compStartA, setCompStartA] = useState<string>(addDaysISO(todayIso, -13));
  const [compEndA, setCompEndA] = useState<string>(addDaysISO(todayIso, -7));

  const [periodSummary, setPeriodSummary] = useState<PeriodPerformanceSummary | null>(null);
  const [comparisonSummaryA, setComparisonSummaryA] = useState<PeriodPerformanceSummary | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Compute active date range for primary period (Period B)
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

  // Automatically sync default comparison period A when primary range changes
  useEffect(() => {
    const dates = getDateRangeISOList(activeDateRange.start, activeDateRange.end);
    const len = Math.max(1, dates.length);
    setCompEndA(addDaysISO(activeDateRange.start, -1));
    setCompStartA(addDaysISO(activeDateRange.start, -len));
  }, [activeDateRange.start, activeDateRange.end]);

  // Load primary period data (and comparison period if enabled)
  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const datesB = getDateRangeISOList(activeDateRange.start, activeDateRange.end);
        const [plansB, budgetsListB] = await Promise.all([
          api.getPlansByRange(activeDateRange.start, activeDateRange.end),
          api.getTimeBudgetsByRange(activeDateRange.start, activeDateRange.end),
        ]);

        if (!active) return;
        const budgetsMapB = new Map<string, DailyTimeBudgetConfig>();
        for (const b of budgetsListB) {
          budgetsMapB.set(b.plan_date, b);
        }

        const summaryB = evaluatePeriodPerformance({
          dateIsoList: datesB,
          plans: plansB,
          budgetsMap: budgetsMapB,
        });
        setPeriodSummary(summaryB);

        if (showComparison) {
          const sA = compStartA <= compEndA ? compStartA : compEndA;
          const eA = compStartA <= compEndA ? compEndA : compStartA;
          const datesA = getDateRangeISOList(sA, eA);
          const [plansA, budgetsListA] = await Promise.all([
            api.getPlansByRange(sA, eA),
            api.getTimeBudgetsByRange(sA, eA),
          ]);
          if (!active) return;
          const budgetsMapA = new Map<string, DailyTimeBudgetConfig>();
          for (const b of budgetsListA) {
            budgetsMapA.set(b.plan_date, b);
          }
          const summaryA = evaluatePeriodPerformance({
            dateIsoList: datesA,
            plans: plansA,
            budgetsMap: budgetsMapA,
          });
          setComparisonSummaryA(summaryA);
        } else {
          setComparisonSummaryA(null);
        }
      } catch {
        // Handled gracefully
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, [activeDateRange.start, activeDateRange.end, showComparison, compStartA, compEndA]);

  // Daily Chart data preparation
  const chartData = useMemo(() => {
    if (!periodSummary) return [];
    return periodSummary.dailyEvaluations.map((d) => ({
      date: d.dateIso,
      label: d.jalaliCompact,
      fullLabel: d.jalaliFull,
      plannedStudyMins: d.predictedStudyMinutes,
      actualStudyMins: d.actualStudyMinutes,
      targetExercises: d.targetExercisesCount ?? 0,
      actualExercises: d.actualExercisesCount,
      quality0To10: d.learningQuality0To10 ?? 0,
      hasQuality: d.learningQuality0To10 !== null,
      scoreS: d.finalDailyScoreS ?? 0,
      hasScoreS: d.finalDailyScoreS !== null,
      scoreE: d.educationalCompositeE ?? 0,
      scoreC: d.restrictedControlIndexC ?? 0,
      allowedRestrictedMins: d.restrictedAllowedLoggedMinutes || d.restrictedPlannedMinutes,
      actualRestrictedMins: d.restrictedActualMinutes,
      overuseRestrictedMins: d.restrictedOveruseMinutes,
      budgetMins: d.budgetMinutes ?? 0,
      essentialActualMins: d.essentialActualMinutes,
      unallocatedBudgetMins: d.remainingActualBudgetMinutes ?? 0,
    }));
  }, [periodSummary]);

  // Section 4.5: Smart XAxis orientation based on column count in daily mode
  const isDailyXAxisRotated = chartData.length > 4;
  const dailyXAxisProps = isDailyXAxisRotated
    ? {
        angle: -90,
        textAnchor: 'end' as const,
        height: 62,
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

  // Aggregate Data for Chart 1: Study Time (Total Actual vs Total Predicted)
  const aggregateStudyChartData = useMemo(() => {
    if (!periodSummary) return [];
    return [
      {
        name: 'مجموع مطالعه واقعی',
        minutes: periodSummary.totalStudyMinutes,
        color: '#4f46e5',
      },
      {
        name: 'مجموع پیش‌بینی‌شده',
        minutes: periodSummary.totalPredictedStudyMinutes,
        color: '#94a3b8',
      },
    ];
  }, [periodSummary]);

  // Aggregate Data for Chart 2: Exercises (Total Solved vs Total Target)
  const aggregateExercisesChartData = useMemo(() => {
    if (!periodSummary) return [];
    return [
      {
        name: 'مجموع تست حل‌شده',
        count: periodSummary.totalExercisesCount,
        color: '#2563eb',
      },
      {
        name: 'مجموع تست هدف',
        count: periodSummary.totalTargetExercisesCount,
        color: '#94a3b8',
      },
    ];
  }, [periodSummary]);

  // Aggregate Data for Chart 3: Learning Quality (Weighted Average 0-10, Max Day, Min Day)
  const aggregateQualityChartData = useMemo(() => {
    if (!periodSummary) return [];
    const validQualityDays = periodSummary.dailyEvaluations
      .map((d) => d.learningQuality0To10)
      .filter((q): q is number => q !== null);
    const maxQ = validQualityDays.length > 0 ? Math.max(...validQualityDays) : 0;
    const minQ = validQualityDays.length > 0 ? Math.min(...validQualityDays) : 0;
    return [
      {
        name: 'میانگین وزنی کل بازه',
        score: periodSummary.weightedLearningQuality0To10 ?? 0,
        color: '#9333ea',
      },
      {
        name: 'بیشترین کیفیت روزانه',
        score: maxQ,
        color: '#10b981',
      },
      {
        name: 'کمترین کیفیت روزانه',
        score: minQ,
        color: '#f59e0b',
      },
    ];
  }, [periodSummary]);

  // Aggregate Data for Chart 4: Final Score S, Educational E, Restricted Control C (0-100 averages)
  const aggregateScoreChartData = useMemo(() => {
    if (!periodSummary) return [];
    const validEDays = periodSummary.dailyEvaluations
      .map((d) => d.educationalCompositeE)
      .filter((e): e is number => e !== null);
    const avgE =
      validEDays.length > 0
        ? Math.round((validEDays.reduce((a, b) => a + b, 0) / validEDays.length) * 10) / 10
        : 0;
    return [
      {
        name: 'میانگین امتیاز نهایی (S)',
        score: periodSummary.averageFinalScoreS ?? 0,
        color: '#10b981',
      },
      {
        name: 'میانگین عملکرد آموزشی (E)',
        score: avgE,
        color: '#4f46e5',
      },
      {
        name: 'میانگین کنترل سرگرمی (C)',
        score: periodSummary.averageRestrictedControlIndexC ?? 0,
        color: '#0284c7',
      },
    ];
  }, [periodSummary]);

  // Aggregate Data for Chart 5: Restricted Activities (Total Allowed, Actual, Overuse)
  const aggregateRestrictedChartData = useMemo(() => {
    if (!periodSummary) return [];
    return [
      {
        name: 'مجموع سقف مجاز',
        minutes: periodSummary.totalRestrictedAllowedMinutes,
        color: '#38bdf8',
      },
      {
        name: 'مجموع مصرف واقعی',
        minutes: periodSummary.totalRestrictedActualMinutes,
        color: '#f59e0b',
      },
      {
        name: 'مجموع تخطی از سقف',
        minutes: periodSummary.totalRestrictedOveruseMinutes,
        color: '#f43f5e',
      },
    ];
  }, [periodSummary]);

  // Aggregate & Pie Data for Chart 6: Time Budget Distribution (Section 5)
  const budgetCategoriesData = useMemo(() => {
    if (!periodSummary) return [];
    return [
      {
        name: 'آموزشی و مطالعه',
        value: periodSummary.totalStudyMinutes,
        color: '#4f46e5',
      },
      {
        name: 'تفریحی محدودشونده',
        value: periodSummary.totalRestrictedActualMinutes,
        color: '#f59e0b',
      },
      {
        name: 'ضروری و استراحت',
        value: periodSummary.totalEssentialActualMinutes,
        color: '#10b981',
      },
      {
        name: 'باقی‌مانده ظرفیت',
        value: periodSummary.totalUnallocatedMinutesOnBudgetedDays,
        color: '#94a3b8',
      },
    ];
  }, [periodSummary]);

  const budgetDistributionPie = useMemo(
    () => budgetCategoriesData.filter((item) => item.value > 0),
    [budgetCategoriesData]
  );

  // Period Comparison Metrics (10.9)
  const comparisonRows = useMemo(() => {
    if (!showComparison || !comparisonSummaryA || !periodSummary) return [];
    const comp = compareTwoPeriods(comparisonSummaryA, periodSummary);
    return [
      {
        key: 'studyTime',
        label: 'مجموع ساعت مطالعه',
        unit: 'دقیقه',
        delta: comp.studyMinutesDelta,
        higherIsBetter: true,
      },
      {
        key: 'exercises',
        label: 'تعداد تست و تمرین حل‌شده',
        unit: 'تست',
        delta: comp.exercisesCountDelta,
        higherIsBetter: true,
      },
      {
        key: 'quality',
        label: 'میانگین کیفیت یادگیری (۰ تا ۱۰)',
        unit: 'از ۱۰',
        delta: comp.learningQualityDelta,
        higherIsBetter: true,
      },
      {
        key: 'finalScore',
        label: 'میانگین امتیاز نهایی (۰ تا ۱۰۰)',
        unit: 'امتیاز',
        delta: comp.finalScoreDelta,
        higherIsBetter: true,
      },
      {
        key: 'budgetShare',
        label: 'سهم مطالعه از ظرف زمانی',
        unit: 'درصد',
        delta: comp.studyBudgetShareDelta,
        higherIsBetter: true,
      },
      {
        key: 'restricted',
        label: 'زمان مصرفی سرگرمی‌های محدودشونده',
        unit: 'دقیقه',
        delta: comp.restrictedTimeDelta,
        higherIsBetter: false,
      },
    ];
  }, [showComparison, comparisonSummaryA, periodSummary]);

  return (
    <div className="space-y-5">
      {/* =====================================================================
          SECTION 1: ANALYTICAL REPORTS HEADER & POPOVER DAILY SHAMSI CALENDAR
      ===================================================================== */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>سیستم جامع گزارش و تحلیل عملکرد</span>
            </h2>
            {/* Section 1.1: Strictly single-line subtitle on mobile & desktop */}
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              تحلیل شاخص‌های مطالعه، کیفیت، ظرف زمانی و سرگرمی‌ها
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
                    if (tab.id === 'daily') {
                      setIsDailyCalendarOpen(false);
                    }
                  }}
                  className={`px-2.5 sm:px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                    filterMode === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Toggle Period Comparison (10.9) */}
            <button
              type="button"
              onClick={() => setShowComparison((prev) => !prev)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                showComparison
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>مقایسه دو بازه زمانی</span>
            </button>
          </div>
        </div>

        {/* Sub-controls for Selected Filter Mode */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Section 1.2 & Section 3: Daily Mode -> Unified Popover Shamsi Calendar */}
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

          {/* Custom Date Range Selector using Unified Popover Shamsi Calendar */}
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
            {activeDateRange.label} ({toPersianDigits(periodSummary?.daysCount || 0)} روز)
          </div>
        </div>

        {/* Comparison Period A Selector when showComparison is active */}
        {showComparison && (
          <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-indigo-900 dark:text-indigo-200">
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>انتخاب بازه اول (دوره پایه جهت مقایسه با بازه فعلی):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full sm:w-auto">
              <ShamsiDateField
                label="از تاریخ:"
                selectedIso={compStartA}
                onSelectIso={(iso) => setCompStartA(iso)}
                compact
              />
              <ShamsiDateField
                label="تا تاریخ:"
                selectedIso={compEndA}
                onSelectIso={(iso) => setCompEndA(iso)}
                compact
              />
            </div>
          </div>
        )}
      </div>

      {loading || !periodSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* =================================================================
              6 COMPACT STATISTICAL SUMMARY CARDS WITH TINTED GRADIENTS
          ================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Card 1: مجموع ساعت مطالعه در بازه انتخابی */}
            <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۱. مجموع ساعت مطالعه در بازه
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-indigo-950 dark:text-white tabular-nums leading-tight">
                {formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                <span>
                  پیش‌بینی: {formatHoursAndMinutesPersian(periodSummary.totalPredictedStudyMinutes)}
                </span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  میانگین: {formatMinutesPersian(periodSummary.avgDailyStudyMinutes)}
                </span>
              </div>
            </div>

            {/* Card 2: مجموع تمرین‌ها و تست‌های حل‌شده */}
            <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۲. مجموع تمرین‌ها و تست‌های حل‌شده
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-300 tabular-nums leading-tight">
                {toPersianDigits(periodSummary.totalExercisesCount)} تست و تمرین
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                <span>
                  هدف:{' '}
                  {periodSummary.totalTargetExercisesCount > 0
                    ? `${toPersianDigits(periodSummary.totalTargetExercisesCount)} مورد`
                    : 'بدون هدف عددی'}
                </span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  میانگین روزانه:{' '}
                  {toPersianDigits(
                    Math.round(
                      periodSummary.totalExercisesCount / Math.max(1, periodSummary.daysCount)
                    )
                  )}{' '}
                  تست
                </span>
              </div>
            </div>

            {/* Card 3: میانگین کیفیت یادگیری (وزنی از ۱۰) */}
            <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۳. میانگین کیفیت یادگیری (وزنی از ۱۰)
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-800 dark:text-purple-300 tabular-nums leading-tight">
                {periodSummary.weightedLearningQuality0To10 !== null
                  ? `${toPersianDigits(periodSummary.weightedLearningQuality0To10)} از ۱۰`
                  : 'ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                محاسبه‌شده با وزن مدت زمان واقعی هر مطالعه در دوره
              </div>
            </div>

            {/* Card 4: میانگین امتیاز نهایی عملکرد (از ۱۰۰) */}
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۴. میانگین امتیاز نهایی عملکرد (از ۱۰۰)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums leading-tight">
                {periodSummary.averageFinalScoreS !== null
                  ? `${toPersianDigits(periodSummary.averageFinalScoreS)} از ۱۰۰`
                  : 'بدون روز امتیازدار'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                بر اساس {toPersianDigits(periodSummary.validScoreDaysCount)} روز دارای عملکرد از{' '}
                {toPersianDigits(periodSummary.daysCount)} روز
              </div>
            </div>

            {/* Card 5: میانگین سهم مطالعه از ظرف زمانی */}
            <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/85 via-white to-sky-50/40 dark:from-sky-950/35 dark:via-slate-900 dark:to-sky-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۵. میانگین سهم مطالعه از ظرف زمانی
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-sky-800 dark:text-sky-300 tabular-nums leading-tight">
                {periodSummary.studyShareOfBudgetPct !== null
                  ? `${toPersianDigits(periodSummary.studyShareOfBudgetPct)}٪`
                  : 'ظرف زمانی ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                بر اساس {toPersianDigits(periodSummary.validBudgetDaysCount)} روز دارای ظرف زمانی (
                {formatHoursAndMinutesPersian(periodSummary.totalBudgetMinutesOnValidDays)})
              </div>
            </div>

            {/* Card 6: میانگین زمان مصرفی برای فعالیت‌های تفریحی */}
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۶. میانگین زمان فعالیت‌های تفریحی
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-300 tabular-nums leading-tight">
                {formatMinutesPersian(periodSummary.avgDailyRestrictedActualMinutes)} در روز
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                <span>
                  مجموع: {formatMinutesPersian(periodSummary.totalRestrictedActualMinutes)}
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  کنترل (C):{' '}
                  {periodSummary.averageRestrictedControlIndexC !== null
                    ? `${toPersianDigits(periodSummary.averageRestrictedControlIndexC)}٪`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================
              SECTION 10.9: PERIOD-TO-PERIOD COMPARISON PANEL
          ================================================================= */}
          {showComparison && comparisonRows.length > 0 && (
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>مقایسه تحلیلی دو بازه زمانی (تغییر مطلق و تغییر درصدی)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مقایسه بازه فعلی ({activeDateRange.label}) با بازه قبلی (
                    {formatJalaliCompact(compStartA)} تا {formatJalaliCompact(compEndA)})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisonRows.map((row) => {
                  const d = row.delta;
                  const abs = d.absoluteChange ?? 0;
                  const isGood = row.higherIsBetter ? abs >= 0 : abs <= 0;
                  return (
                    <div
                      key={row.key}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-2.5 tabular-nums"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {row.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${
                            isGood
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {abs >= 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {formatDeltaBadgeText(d)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="rounded-xl bg-white dark:bg-slate-900 p-2 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">بازه قبلی (اول)</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {d.baseValue !== null
                              ? `${toPersianDigits(d.baseValue)} ${row.unit}`
                              : 'بدون داده'}
                          </span>
                        </div>
                        <div className="rounded-xl bg-white dark:bg-slate-900 p-2 border border-indigo-200/60 dark:border-indigo-900/50">
                          <span className="text-[10px] text-indigo-500 block">بازه فعلی (دوم)</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {d.targetValue !== null
                              ? `${toPersianDigits(d.targetValue)} ${row.unit}`
                              : 'بدون داده'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        تغییر مطلق:{' '}
                        {d.absoluteChange !== null
                          ? `${d.absoluteChange > 0 ? '+' : ''}${toPersianDigits(
                              d.absoluteChange
                            )} ${row.unit}`
                          : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              CHARTS GRID (SECTIONS 4, 5, 8)
              All charts feature Daily/Aggregate toggle (defaulting to Aggregate)
              and smart horizontal/vertical XAxis labels.
          ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: زمان مطالعه (پیش‌بینی در برابر واقعی) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۱. زمان مطالعه (پیش‌بینی در برابر واقعی)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مجموع واقعی: {formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes)} ·
                    پیش‌بینی: {formatHoursAndMinutesPersian(periodSummary.totalPredictedStudyMinutes)}
                  </p>
                </div>

                <ChartModeToggle mode={chart1Mode} onChange={setChart1Mode} />
              </div>

              <div className="h-68 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chart1Mode === 'aggregate' ? (
                    <BarChart
                      data={aggregateStudyChartData}
                      margin={{ top: 12, right: 15, left: -10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      {/* 2 columns -> horizontal labels */}
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
                          'مجموع زمان در بازه',
                        ]}
                      />
                      <Bar
                        dataKey="minutes"
                        name="مجموع زمان (دقیقه)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={64}
                      >
                        {aggregateStudyChartData.map((entry, index) => (
                          <Cell key={`agg-study-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" {...dailyXAxisProps} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} دقیقه`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar
                        dataKey="plannedStudyMins"
                        name="زمان پیش‌بینی (دقیقه)"
                        fill="#94a3b8"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="actualStudyMins"
                        name="زمان واقعی مطالعه (دقیقه)"
                        fill="#4f46e5"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: تعداد تمرین و تست حل‌شده */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۲. تعداد تمرین و تست حل‌شده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مجموع تست‌ها: {toPersianDigits(periodSummary.totalExercisesCount)} · هدف تعیین‌شده:{' '}
                    {toPersianDigits(periodSummary.totalTargetExercisesCount)}
                  </p>
                </div>

                <ChartModeToggle mode={chart2Mode} onChange={setChart2Mode} />
              </div>

              <div className="h-68 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chart2Mode === 'aggregate' ? (
                    <BarChart
                      data={aggregateExercisesChartData}
                      margin={{ top: 12, right: 15, left: -10, bottom: 10 }}
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
                          `${toPersianDigits(Number(val))} تست و تمرین`,
                          'مجموع بازه',
                        ]}
                      />
                      <Bar
                        dataKey="count"
                        name="تعداد تست/تمرین"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={64}
                      >
                        {aggregateExercisesChartData.map((entry, idx) => (
                          <Cell key={`agg-ex-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" {...dailyXAxisProps} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} تست/تمرین`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar
                        dataKey="targetExercises"
                        name="تست هدف"
                        fill="#cbd5e1"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="actualExercises"
                        name="تست حل‌شده واقعی"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: روند کیفیت یادگیری وزنی (مقیاس ۰ تا ۱۰) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۳. روند کیفیت یادگیری وزنی (مقیاس ۰ تا ۱۰)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    میانگین وزنی کل دوره:{' '}
                    {periodSummary.weightedLearningQuality0To10 !== null
                      ? `${toPersianDigits(periodSummary.weightedLearningQuality0To10)} از ۱۰`
                      : 'بدون ثبت کیفیت'}
                  </p>
                </div>

                <ChartModeToggle mode={chart3Mode} onChange={setChart3Mode} />
              </div>

              <div className="h-68 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chart3Mode === 'aggregate' ? (
                    <BarChart
                      data={aggregateQualityChartData}
                      margin={{ top: 12, right: 15, left: -15, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        angle={0}
                        textAnchor="middle"
                        height={36}
                        tick={{ fontSize: 10, fontWeight: 700 }}
                      />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [
                          `${toPersianDigits(Number(val))} از ۱۰`,
                          'کیفیت یادگیری',
                        ]}
                      />
                      <Bar dataKey="score" name="کیفیت (از ۱۰)" radius={[8, 8, 0, 0]} maxBarSize={56}>
                        {aggregateQualityChartData.map((entry, idx) => (
                          <Cell key={`agg-q-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 15, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" {...dailyXAxisProps} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [
                          `${toPersianDigits(Number(val))} از ۱۰`,
                          'کیفیت یادگیری وزنی',
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line
                        type="monotone"
                        dataKey="quality0To10"
                        name="کیفیت یادگیری روزانه (۰ تا ۱۰)"
                        stroke="#9333ea"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#9333ea' }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: امتیاز نهایی روزانه (S از ۱۰۰) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۴. امتیاز نهایی روزانه (S از ۱۰۰)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    ترکیب ۸۰٪ عملکرد آموزشی (E) و ۲۰٪ کنترل سرگرمی‌ها (C)
                  </p>
                </div>

                <ChartModeToggle mode={chart4Mode} onChange={setChart4Mode} />
              </div>

              <div className="h-68 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chart4Mode === 'aggregate' ? (
                    <BarChart
                      data={aggregateScoreChartData}
                      margin={{ top: 12, right: 15, left: -15, bottom: 10 }}
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
                          `${toPersianDigits(Number(val))} از ۱۰۰`,
                          'میانگین در بازه',
                        ]}
                      />
                      <Bar
                        dataKey="score"
                        name="میانگین امتیاز (از ۱۰۰)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={56}
                      >
                        {aggregateScoreChartData.map((entry, idx) => (
                          <Cell key={`agg-score-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" {...dailyXAxisProps} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} از ۱۰۰`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar
                        dataKey="scoreS"
                        name="امتیاز نهایی روز (S)"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="scoreE"
                        name="امتیاز آموزشی (E)"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: کنترل فعالیت‌های تفریحی و محدودشونده */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۵. کنترل فعالیت‌های تفریحی و محدودشونده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مقایسه زمان مجاز با زمان مصرفی واقعی و میزان تخطی از سقف مجاز (گوشی، بازی، تلویزیون)
                  </p>
                </div>

                <ChartModeToggle mode={chart5Mode} onChange={setChart5Mode} />
              </div>

              <div className="h-68 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chart5Mode === 'aggregate' ? (
                    <BarChart
                      data={aggregateRestrictedChartData}
                      margin={{ top: 12, right: 15, left: -15, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        angle={0}
                        textAnchor="middle"
                        height={36}
                        tick={{ fontSize: 10, fontWeight: 700 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [
                          `${formatHoursAndMinutesPersian(Number(val))} (${toPersianDigits(
                            Number(val)
                          )} دقیقه)`,
                          'مجموع بازه',
                        ]}
                      />
                      <Bar
                        dataKey="minutes"
                        name="مجموع زمان (دقیقه)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={56}
                      >
                        {aggregateRestrictedChartData.map((entry, idx) => (
                          <Cell key={`agg-rest-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" {...dailyXAxisProps} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} دقیقه`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar
                        dataKey="allowedRestrictedMins"
                        name="سقف مجاز (پیش‌بینی)"
                        fill="#38bdf8"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="actualRestrictedMins"
                        name="مصرف واقعی سرگرمی"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="overuseRestrictedMins"
                        name="تخطی بیش از حد مجاز"
                        fill="#f43f5e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6 (Section 5): توزیع ظرف زمانی روز — Pie Chart FIRST, Bar Chart SECOND */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۶. توزیع ظرف زمانی روز
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    تفکیک سهم آموزشی، تفریحی، ضروری و باقی‌مانده از ظرفیت کل بازه
                  </p>
                </div>

                <ChartModeToggle mode={chart6Mode} onChange={setChart6Mode} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* FIRST: Pie Chart (نمودار دایره‌ای) */}
                <div className="sm:col-span-5 space-y-2">
                  {budgetDistributionPie.length > 0 ? (
                    <>
                      <div className="h-38 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={budgetDistributionPie}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={32}
                              outerRadius={58}
                              paddingAngle={3}
                            >
                              {budgetDistributionPie.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val: any, name?: any) => [
                                formatHoursAndMinutesPersian(Number(val)),
                                String(name ?? ''),
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1 text-[11px] tabular-nums">
                        {budgetDistributionPie.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.name}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatHoursAndMinutesPersian(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">
                      هنوز فعالیتی در این بازه ثبت نشده است.
                    </p>
                  )}
                </div>

                {/* SECOND: Bar Chart (نمودار ستونی) */}
                <div className="sm:col-span-7 h-68 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart6Mode === 'aggregate' ? (
                      <BarChart
                        data={budgetCategoriesData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        {/* 4 columns -> horizontal labels */}
                        <XAxis
                          dataKey="name"
                          angle={0}
                          textAnchor="middle"
                          height={36}
                          tick={{ fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(val: any) => [
                            `${formatHoursAndMinutesPersian(Number(val))} (${toPersianDigits(
                              Number(val)
                            )} دقیقه)`,
                            'مجموع زمان در بازه',
                          ]}
                        />
                        <Bar
                          dataKey="value"
                          name="مجموع زمان (دقیقه)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={48}
                        >
                          {budgetCategoriesData.map((entry, idx) => (
                            <Cell key={`agg-b-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" {...dailyXAxisProps} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(val: any, name?: any) => [
                            `${toPersianDigits(Number(val))} دقیقه`,
                            String(name ?? ''),
                          ]}
                        />
                        <Bar
                          dataKey="actualStudyMins"
                          stackId="budget"
                          name="آموزشی و مطالعه"
                          fill="#4f46e5"
                        />
                        <Bar
                          dataKey="actualRestrictedMins"
                          stackId="budget"
                          name="تفریحی محدودشونده"
                          fill="#f59e0b"
                        />
                        <Bar
                          dataKey="essentialActualMins"
                          stackId="budget"
                          name="ضروری و استراحت"
                          fill="#10b981"
                        />
                        <Bar
                          dataKey="unallocatedBudgetMins"
                          stackId="budget"
                          name="باقی‌مانده ظرفیت"
                          fill="#cbd5e1"
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Chart 7 (Section 8): روند مطالعه در هفت روز گذشته (integrated into analytical charts grid) */}
            <div className="lg:col-span-2">
              <WeeklyStudyChart />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
