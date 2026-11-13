import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Bar,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  BarChart3,
  Flame,
} from 'lucide-react';
import type { DailyPlanItem } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekdayName,
  formatJalaliCompact,
  toPersianDigits,
  formatHoursAndMinutesPersian,
} from '../utils/jalali.ts';

interface DayStudyChartPoint {
  isoDate: string;
  shortLabel: string;
  fullLabel: string;
  weekdayName: string;
  isToday: boolean;
  predictedMinutes: number;
  actualMinutes: number;
  predictedHours: number;
  actualHours: number;
  exercisesCount: number;
  completedTasks: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  unitMode: 'hours' | 'minutes';
}

const CustomStudyTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data: DayStudyChartPoint = payload[0].payload;
  const adherence =
    data.predictedMinutes > 0
      ? Math.round((data.actualMinutes / data.predictedMinutes) * 100)
      : 0;

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-xl text-right min-w-[200px] space-y-2"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span className="text-xs font-black text-slate-900 dark:text-white">
          {data.fullLabel} {data.isToday ? '(امروز)' : ''}
        </span>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          {toPersianDigits(adherence)}٪ تحقق
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>مطالعه واقعی:</span>
          </span>
          <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatHoursAndMinutesPersian(data.actualMinutes)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            <span>هدف پیش‌بینی:</span>
          </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {formatHoursAndMinutesPersian(data.predictedMinutes)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">تمرین و تست حل‌شده:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {toPersianDigits(data.exercisesCount)} مورد
          </span>
        </div>
      </div>
    </div>
  );
};

export const WeeklyStudyChart: React.FC = () => {
  const [plans, setPlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<'aggregate' | 'daily'>('aggregate');
  const [chartType, setChartType] = useState<'composed' | 'area'>('composed');
  const [unitMode, setUnitMode] = useState<'hours' | 'minutes'>('hours');

  const todayIso = getTodayISO();
  const startIso = useMemo(() => addDaysISO(todayIso, -6), [todayIso]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getPlansByRange(startIso, todayIso)
      .then((rows) => {
        if (active) {
          setPlans(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [startIso, todayIso]);

  const chartData: DayStudyChartPoint[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const offset = -6 + idx;
      const isoDate = addDaysISO(todayIso, offset);
      const weekdayName = getPersianWeekdayName(isoDate);
      const compactDate = formatJalaliCompact(isoDate);

      const dayStudyPlans = plans.filter(
        (p) => p.plan_date === isoDate && Number(p.is_study) === 1
      );

      const predictedMinutes = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.predicted_minutes || 0),
        0
      );
      const actualMinutes = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
        0
      );
      const exercisesCount = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.exercises_count || 0),
        0
      );
      const completedTasks = dayStudyPlans.filter((p) => p.status === 'completed').length;

      return {
        isoDate,
        shortLabel: isoDate === todayIso ? `امروز (${weekdayName})` : `${weekdayName} ${compactDate}`,
        fullLabel: `${weekdayName} ${compactDate}`,
        weekdayName,
        isToday: isoDate === todayIso,
        predictedMinutes,
        actualMinutes,
        predictedHours: Number((predictedMinutes / 60).toFixed(2)),
        actualHours: Number((actualMinutes / 60).toFixed(2)),
        exercisesCount,
        completedTasks,
      };
    });
  }, [plans, todayIso]);

  const summary = useMemo(() => {
    const totalActualMins = chartData.reduce((acc, d) => acc + d.actualMinutes, 0);
    const totalPredictedMins = chartData.reduce((acc, d) => acc + d.predictedMinutes, 0);

    let bestDay: DayStudyChartPoint | null = null;
    for (const d of chartData) {
      if (!bestDay || d.actualMinutes > bestDay.actualMinutes) {
        bestDay = d;
      }
    }

    return {
      totalActualMins,
      totalPredictedMins,
      totalActualHours: Number((totalActualMins / 60).toFixed(2)),
      totalPredictedHours: Number((totalPredictedMins / 60).toFixed(2)),
      bestDay,
    };
  }, [chartData]);

  const aggregateData = useMemo(() => {
    return [
      {
        name: 'مجموع مطالعه واقعی (۷ روز)',
        value: unitMode === 'hours' ? summary.totalActualHours : summary.totalActualMins,
        minutes: summary.totalActualMins,
        color: '#10b981',
      },
      {
        name: 'مجموع هدف پیش‌بینی (۷ روز)',
        value: unitMode === 'hours' ? summary.totalPredictedHours : summary.totalPredictedMins,
        minutes: summary.totalPredictedMins,
        color: '#6366f1',
      },
    ];
  }, [summary, unitMode]);

  const actualKey = unitMode === 'hours' ? 'actualHours' : 'actualMinutes';
  const predictedKey = unitMode === 'hours' ? 'predictedHours' : 'predictedMinutes';

  const bestDayText =
    summary.bestDay && summary.bestDay.actualMinutes > 0
      ? `${summary.bestDay.weekdayName} (${summary.bestDay.fullLabel}) – ${formatHoursAndMinutesPersian(
          summary.bestDay.actualMinutes
        )}`
      : 'هنوز مطالعه‌ای در ۷ روز اخیر ثبت نشده است';

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header: Single-line title + Daily/Aggregate selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white whitespace-nowrap truncate">
              ۷. روند مطالعه در هفت روز گذشته
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              مقایسه ساعت مطالعه واقعی با هدف پیش‌بینی‌شده در یک هفته اخیر
            </p>
          </div>
        </div>

        {/* Daily vs Aggregate Segmented Selector (Default: Aggregate) */}
        <div className="inline-flex items-center self-center sm:self-auto gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setDisplayMode('aggregate')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              displayMode === 'aggregate'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            نمایش تجمیعی
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('daily')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              displayMode === 'daily'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            نمایش روزانه
          </button>
        </div>
      </div>

      {/* Symmetrical Centered Controls Bar (Unit & Chart Type) */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Unit Switcher */}
        <div className="inline-flex items-center justify-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setUnitMode('hours')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
              unitMode === 'hours'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            بر حسب ساعت
          </button>
          <button
            type="button"
            onClick={() => setUnitMode('minutes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
              unitMode === 'minutes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            بر حسب دقیقه
          </button>
        </div>

        {/* Chart Style Switcher (Active in Daily Mode) */}
        {displayMode === 'daily' && (
          <div className="inline-flex items-center justify-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setChartType('composed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                chartType === 'composed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ستونی و مقایسه‌ای
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                chartType === 'area'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              موجی (روند پیشرفت)
            </button>
          </div>
        )}
      </div>

      {/* Section 8.4 & 8.5: Single Compact One-Line Card for "پرتلاش‌ترین روز هفته" */}
      <div className="rounded-2xl bg-gradient-to-l from-amber-50/90 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 px-4 py-2.5 flex items-center justify-center gap-2 text-center shadow-2xs">
        <Flame className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="text-xs font-extrabold text-amber-950 dark:text-amber-200 tabular-nums truncate">
          <span>پرتلاش‌ترین روز هفته: </span>
          <span className="font-black text-amber-700 dark:text-amber-300">{bestDayText}</span>
        </div>
      </div>

      {/* Main Recharts Container */}
      {loading ? (
        <div className="h-68 w-full rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
      ) : (
        <div className="space-y-2.5">
          {/* Custom Legend */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-bold px-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              <span>زمان مطالعه واقعی ({unitMode === 'hours' ? 'ساعت' : 'دقیقه'})</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
              <span>هدف پیش‌بینی‌شده ({unitMode === 'hours' ? 'ساعت' : 'دقیقه'})</span>
            </div>
          </div>

          <div dir="ltr" className="h-68 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {displayMode === 'aggregate' ? (
                <BarChart
                  data={aggregateData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#94a3b8"
                    strokeOpacity={0.2}
                  />
                  {/* 2 columns in aggregate mode -> Horizontal XAxis labels */}
                  <XAxis
                    dataKey="name"
                    angle={0}
                    textAnchor="middle"
                    height={36}
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      unitMode === 'hours'
                        ? `${toPersianDigits(val)}h`
                        : `${toPersianDigits(val)}m`
                    }
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    formatter={(_val: any, _name: any, item: any) => [
                      formatHoursAndMinutesPersian(Number(item?.payload?.minutes || 0)),
                      String(item?.payload?.name || ''),
                    ]}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={64}>
                    {aggregateData.map((entry, idx) => (
                      <Cell key={`wk-agg-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'composed' ? (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 16 }}
                >
                  <defs>
                    <linearGradient id="actualBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="predAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#94a3b8"
                    strokeOpacity={0.2}
                  />
                  {/* 7 columns in daily mode -> Rotated vertical XAxis labels */}
                  <XAxis
                    dataKey="shortLabel"
                    angle={-90}
                    textAnchor="end"
                    height={68}
                    tickMargin={6}
                    interval={0}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      unitMode === 'hours'
                        ? `${toPersianDigits(val)}h`
                        : `${toPersianDigits(val)}m`
                    }
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    content={<CustomStudyTooltip unitMode={unitMode} />}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={predictedKey}
                    name="هدف پیش‌بینی"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    fill="url(#predAreaGrad)"
                  />
                  <Bar
                    dataKey={actualKey}
                    name="مطالعه واقعی"
                    fill="url(#actualBarGrad)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={44}
                  />
                </ComposedChart>
              ) : (
                <AreaChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 16 }}
                >
                  <defs>
                    <linearGradient id="actualWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="predWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#94a3b8"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    angle={-90}
                    textAnchor="end"
                    height={68}
                    tickMargin={6}
                    interval={0}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      unitMode === 'hours'
                        ? `${toPersianDigits(val)}h`
                        : `${toPersianDigits(val)}m`
                    }
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip content={<CustomStudyTooltip unitMode={unitMode} />} />
                  <Area
                    type="monotone"
                    dataKey={predictedKey}
                    name="هدف پیش‌بینی"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    fill="url(#predWaveGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey={actualKey}
                    name="مطالعه واقعی"
                    stroke="#10b981"
                    strokeWidth={3.5}
                    fill="url(#actualWaveGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
