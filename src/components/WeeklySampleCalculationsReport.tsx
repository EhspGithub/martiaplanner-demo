import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Calculator,
  BookOpen,
  Award,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  Target,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import {
  generateOneWeekSampleData,
  SAMPLE_WEEK_PREFIX,
  WEEKLY_SAMPLE_START_ISO,
  WEEKLY_SAMPLE_END_ISO,
} from '../utils/sampleDataGenerator.ts';
import {
  evaluateDayPerformance,
  evaluatePeriodPerformance,
  calculateXpFromPlans,
  evaluateGlobalXpLedger,
  calculateUserLevelProgress,
  calculateAllSubjectsProgressions,
  analyzeXpVelocityAndProgress,
  calculateActualToPredictedRatioPct,
} from '../utils/analyticsEngine.ts';
import type {
  DailyPlanItem,
  DailyTimeBudgetConfig,
  DailyStudyGoalConfig,
  ActivityCategory,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatDurationPrimePersian,
  formatJalaliCompact,
  formatJalaliFull,
  getPersianWeekdayName,
  getDateRangeISOList,
} from '../utils/jalali.ts';

interface WeeklySampleCalculationsReportProps {
  allTimePlans?: DailyPlanItem[];
  subjects?: Array<{ id: string; name: string; units?: any[] }>;
  categories?: ActivityCategory[];
  studyTypes?: Array<{ id: string; title: string }>;
}

interface MetricBreakdownBlockProps {
  badgeNumber: string;
  title: string;
  symbol?: string;
  concept: string;
  formulaCode: string;
  inputsText: string;
  steps: string[];
  finalResult: string;
  interpretation: string;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan';
}

const TONE_STYLES: Record<
  NonNullable<MetricBreakdownBlockProps['tone']>,
  {
    border: string;
    headerBg: string;
    badge: string;
    resultBox: string;
  }
> = {
  indigo: {
    border: 'border-indigo-200/80 dark:border-indigo-800/50',
    headerBg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    badge: 'bg-indigo-600 text-white',
    resultBox:
      'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
  },
  emerald: {
    border: 'border-emerald-200/80 dark:border-emerald-800/50',
    headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    badge: 'bg-emerald-600 text-white',
    resultBox:
      'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  },
  amber: {
    border: 'border-amber-200/80 dark:border-amber-800/50',
    headerBg: 'bg-amber-50/70 dark:bg-amber-950/30',
    badge: 'bg-amber-600 text-white',
    resultBox:
      'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200',
  },
  rose: {
    border: 'border-rose-200/80 dark:border-rose-800/50',
    headerBg: 'bg-rose-50/70 dark:bg-rose-950/30',
    badge: 'bg-rose-600 text-white',
    resultBox:
      'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200',
  },
  purple: {
    border: 'border-purple-200/80 dark:border-purple-800/50',
    headerBg: 'bg-purple-50/70 dark:bg-purple-950/30',
    badge: 'bg-purple-600 text-white',
    resultBox:
      'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
  },
  cyan: {
    border: 'border-cyan-200/80 dark:border-cyan-800/50',
    headerBg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
    badge: 'bg-cyan-600 text-white',
    resultBox:
      'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200',
  },
};

const MetricBreakdownBlock: React.FC<MetricBreakdownBlockProps> = ({
  badgeNumber,
  title,
  symbol,
  concept,
  formulaCode,
  inputsText,
  steps,
  finalResult,
  interpretation,
  tone = 'indigo',
}) => {
  const style = TONE_STYLES[tone];
  return (
    <div
      className={`rounded-2xl border ${style.border} bg-white dark:bg-slate-900 shadow-sm overflow-hidden`}
    >
      {/* 1. Title */}
      <div
        className={`px-4 py-3 ${style.headerBg} border-b ${style.border} flex flex-wrap items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`w-7 h-7 rounded-lg ${style.badge} text-xs font-black flex items-center justify-center shadow-xs shrink-0`}
          >
            {toPersianDigits(badgeNumber)}
          </span>
          <h5 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            ۱. عنوان شاخص: {title}
          </h5>
        </div>
        {symbol && (
          <span
            dir="ltr"
            className="px-2.5 py-0.5 rounded-md bg-slate-900/90 dark:bg-slate-800 text-white font-mono text-xs font-bold"
          >
            {symbol}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3.5 text-xs sm:text-sm leading-7">
        {/* 2. Concept */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/70 dark:border-slate-700/60">
          <span className="font-black text-slate-800 dark:text-slate-200 block mb-1">
            ۲. تعریف و مفهوم شاخص:
          </span>
          <p className="text-slate-600 dark:text-slate-300">{concept}</p>
        </div>

        {/* 3. Exact Formula */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 border border-slate-800">
          <span className="text-[11px] font-bold text-indigo-300 block mb-1.5">
            ۳. فرمول دقیق مورد استفاده در کد برنامه (analyticsEngine.ts):
          </span>
          <pre
            dir="ltr"
            className="font-mono text-xs sm:text-[13px] text-emerald-300 whitespace-pre-wrap break-words leading-6 overflow-x-auto"
          >
            {formulaCode}
          </pre>
        </div>

        {/* 4. Input Data */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/70 dark:border-slate-700/60">
          <span className="font-black text-slate-800 dark:text-slate-200 block mb-1">
            ۴. داده‌های ورودی استفاده‌شده از هفته نمونه (۱۶ تا ۲۲ آبان ۱۴۰۵):
          </span>
          <p className="text-slate-700 dark:text-slate-300 font-medium">{inputsText}</p>
        </div>

        {/* 5. Step-by-Step Calculation */}
        <div className="bg-indigo-50/30 dark:bg-indigo-950/15 rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/40">
          <span className="font-black text-indigo-950 dark:text-indigo-200 block mb-2">
            ۵. جایگذاری اعداد و مراحل محاسبه گام‌به‌گام:
          </span>
          <ol className="space-y-1.5 list-decimal list-inside text-slate-700 dark:text-slate-300">
            {steps.map((st, i) => (
              <li key={i} className="leading-7">
                <span className="font-medium">{st}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 6. Final Result & 7. Short Interpretation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className={`rounded-xl p-3 border ${style.resultBox}`}>
            <span className="text-[11px] font-bold opacity-80 block mb-0.5">
              ۶. نتیجه نهایی محاسبه (خروجی موتور تحلیل):
            </span>
            <div className="text-sm sm:text-base font-black">{finalResult}</div>
          </div>
          <div className="rounded-xl p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
              ۷. تفسیر کوتاه نتیجه:
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
              {interpretation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WeeklySampleCalculationsReport: React.FC<
  WeeklySampleCalculationsReportProps
> = ({ allTimePlans = [], subjects = [], categories = [], studyTypes = [] }) => {
  const [selectedDayIso, setSelectedDayIso] = useState<string>('2026-11-07');
  const [activeSectionTab, setActiveSectionTab] = useState<
    'all' | 'sec1' | 'sec2' | 'sec3' | 'sec4' | 'sec5'
  >('all');
  const [fetchedRangePlans, setFetchedRangePlans] = useState<DailyPlanItem[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .getPlansByRange(WEEKLY_SAMPLE_START_ISO, WEEKLY_SAMPLE_END_ISO)
      .then((rows) => {
        if (mounted && Array.isArray(rows)) {
          setFetchedRangePlans(rows);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Build or extract the exact 1-week sample dataset (1405/08/16 to 1405/08/22)
  const weeklyComputation = useMemo(() => {
    const generated = generateOneWeekSampleData({
      subjects:
        subjects.length > 0
          ? subjects
          : [
              { id: 'subj-math', name: 'ریاضی' },
              { id: 'subj-sci', name: 'علوم تجربی' },
              { id: 'subj-farsi', name: 'فارسی' },
              { id: 'subj-arabic', name: 'عربی' },
              { id: 'subj-eng', name: 'زبان انگلیسی' },
              { id: 'subj-soc', name: 'مطالعات اجتماعی' },
            ],
      categories:
        categories.length > 0
          ? categories
          : [
              { id: 'cat-study-1', title: 'مطالعه و تکالیف درسی', is_study: 1, activity_group: 'educational' },
              { id: 'cat-rec-game', title: 'بازی و سرگرمی دیجیتال', is_study: 0, activity_group: 'restricted' },
              { id: 'cat-rec-social', title: 'وب‌گردی و فضای مجازی', is_study: 0, activity_group: 'restricted' },
              { id: 'cat-ess-sport', title: 'ورزش و تحرک روزانه', is_study: 0, activity_group: 'essential' },
              { id: 'cat-ess-rest', title: 'استراحت، تغذیه و امور شخصی', is_study: 0, activity_group: 'essential' },
            ],
      studyTypes:
        studyTypes.length > 0
          ? studyTypes
          : [
              { id: 'st-read', title: 'مطالعه درسنامه' },
              { id: 'st-test', title: 'حل تمرین و تست' },
              { id: 'st-rev', title: 'مرور و جمع‌بندی' },
            ],
    });

    // Check if the user has seeded the 1-week sample data in the database; if so, use those live records
    const candidatePlans = allTimePlans.length > 0 ? allTimePlans : fetchedRangePlans;
    const seededPlansInDb = candidatePlans.filter(
      (p) =>
        String(p.id).startsWith(SAMPLE_WEEK_PREFIX) &&
        p.plan_date >= WEEKLY_SAMPLE_START_ISO &&
        p.plan_date <= WEEKLY_SAMPLE_END_ISO
    );

    const isSeededInDb = seededPlansInDb.length > 0;

    // Map generated plans + performances into DailyPlanItem[] format
    const perfByPlanId = new Map<string, (typeof generated.performances)[number]>();
    for (const pf of generated.performances) {
      perfByPlanId.set(pf.plan_id, pf);
    }

    const fallbackPlans: DailyPlanItem[] = generated.plans.map((p) => {
      const pf = perfByPlanId.get(p.id);
      return {
        ...p,
        performance: pf
          ? {
              id: pf.id,
              plan_id: pf.plan_id,
              actual_minutes: pf.actual_minutes,
              exercises_count: pf.exercises_count,
              learning_quality: pf.learning_quality,
              completion_status: pf.completion_status,
              notes: pf.notes,
              logged_at: pf.logged_at,
              updated_at: pf.updated_at,
            }
          : null,
      };
    });

    const activeWeekPlans: DailyPlanItem[] = isSeededInDb ? seededPlansInDb : fallbackPlans;

    const budgetsMap = new Map<string, DailyTimeBudgetConfig>();
    for (const tb of generated.timeBudgets) {
      budgetsMap.set(tb.plan_date, {
        plan_date: tb.plan_date,
        budget_minutes: tb.budget_minutes,
        input_unit: tb.input_unit,
        updated_at: tb.updated_at,
      });
    }

    const goalsMap = new Map<string, DailyStudyGoalConfig>();
    for (const sg of generated.studyGoals) {
      goalsMap.set(sg.goal_date, {
        goal_date: sg.goal_date,
        target_study_minutes: sg.target_study_minutes,
        target_exercises_count: sg.target_exercises_count,
        target_completed_tasks: sg.target_completed_tasks,
        custom_goals: sg.custom_goals,
        updated_at: sg.updated_at,
      });
    }

    const categoriesMap = new Map<string, ActivityCategory>();
    for (const c of categories) {
      categoriesMap.set(c.id, c);
    }

    const dateIsoList = getDateRangeISOList(WEEKLY_SAMPLE_START_ISO, WEEKLY_SAMPLE_END_ISO);

    const periodSummary = evaluatePeriodPerformance({
      dateIsoList,
      plans: activeWeekPlans,
      budgetsMap,
      goalsMap,
      categoriesMap,
    });

    const dailyEvalsMap = new Map<string, ReturnType<typeof evaluateDayPerformance>>();
    for (const de of periodSummary.dailyEvaluations) {
      dailyEvalsMap.set(de.dateIso, de);
    }

    // Evaluate XP & Level strictly on the 1-week sample dataset (using WEEKLY_SAMPLE_END_ISO = 2026-11-13)
    const xpLedger = evaluateGlobalXpLedger(activeWeekPlans, WEEKLY_SAMPLE_END_ISO);
    const overallXpBreakdown = calculateXpFromPlans(activeWeekPlans);
    const levelProgress = calculateUserLevelProgress(
      xpLedger.netTotalXp,
      activeWeekPlans,
      WEEKLY_SAMPLE_END_ISO
    );

    // Extract unique subjects present in the week plans
    const weekSubjectsMap = new Map<string, { id: string; name: string }>();
    for (const p of activeWeekPlans) {
      if (Number(p.is_study) === 1 && p.subject_id && p.subject_name_snapshot) {
        weekSubjectsMap.set(p.subject_id, {
          id: p.subject_id,
          name: p.subject_name_snapshot,
        });
      }
    }

    const subjectProgressions = calculateAllSubjectsProgressions({
      subjects: Array.from(weekSubjectsMap.values()),
      allTimePlans: activeWeekPlans,
      todayIso: WEEKLY_SAMPLE_END_ISO,
    });

    const velocityAnalysis = analyzeXpVelocityAndProgress({
      allTimePlans: activeWeekPlans,
      todayIso: WEEKLY_SAMPLE_END_ISO,
      levelProgress,
    });

    return {
      isSeededInDb,
      activeWeekPlans,
      dateIsoList,
      budgetsMap,
      goalsMap,
      periodSummary,
      dailyEvalsMap,
      xpLedger,
      overallXpBreakdown,
      levelProgress,
      subjectProgressions,
      velocityAnalysis,
    };
  }, [allTimePlans, fetchedRangePlans, subjects, categories, studyTypes]);

  const selectedDayEval =
    weeklyComputation.dailyEvalsMap.get(selectedDayIso) ||
    weeklyComputation.periodSummary.dailyEvaluations[0];

  const selectedDayPlans = useMemo(
    () =>
      weeklyComputation.activeWeekPlans.filter((p) => p.plan_date === selectedDayIso),
    [weeklyComputation.activeWeekPlans, selectedDayIso]
  );

  const selectedDayStudyPlans = useMemo(
    () => selectedDayPlans.filter((p) => Number(p.is_study) === 1),
    [selectedDayPlans]
  );

  const selectedDayXp = useMemo(
    () => calculateXpFromPlans(selectedDayPlans),
    [selectedDayPlans]
  );

  const {
    periodSummary,
    xpLedger,
    overallXpBreakdown,
    levelProgress,
    subjectProgressions,
    velocityAnalysis,
  } = weeklyComputation;

  // Compute period average Educational Score E across valid days
  const validEDays = periodSummary.dailyEvaluations.filter(
    (d) => d.educationalCompositeE !== null
  );
  const periodAverageE =
    validEDays.length > 0
      ? Math.round(
          validEDays.reduce((sum, d) => sum + (d.educationalCompositeE || 0), 0) /
            validEDays.length
        )
      : 0;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner: Overview of the 1-Week Sample Dataset */}
      <div className="rounded-2xl bg-gradient-to-l from-indigo-950 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-indigo-800/60">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-black">
              مرجع راستی‌آزمایی زنده محاسبات (Live Calculation Audit)
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/10 text-indigo-200 text-xs font-bold">
              بازه ثابت: شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              weeklyComputation.isSeededInDb
                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                : 'bg-amber-500/25 text-amber-200 border border-amber-400/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {weeklyComputation.isSeededInDb
              ? 'متصل به داده‌های نمونه یک‌هفته‌ای ثبت‌شده در پایگاه داده شما'
              : 'محاسبه‌شده با موتور اصلی برنامه روی داده‌های استاندارد ۱۶ تا ۲۲ آبان ۱۴۰۵'}
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-black mb-2">
          گزارش کالبدشکافی و راستی‌آزمایی گام‌به‌گام شاخص‌ها روی داده‌های نمونه یک‌هفته‌ای
        </h3>
        <p className="text-xs sm:text-sm text-indigo-100/90 leading-7">
          تمامی اعداد، فرمول‌ها و مراحل زیر مستقیماً توسط توابع واقعی موتور محاسباتی برنامه (
          <code dir="ltr" className="font-mono text-emerald-300 px-1">
            analyticsEngine.ts
          </code>
          ) روی داده‌های هفته نمونه (۱۶ تا ۲۲ آبان ۱۴۰۵) اجرا شده‌اند و ۱۰۰٪ با اعداد نمایش‌داده‌شده در صفحات{' '}
          <strong>«عملکرد»</strong>، <strong>«دروس»</strong> و <strong>«برنامه روزانه»</strong> یکسان هستند.
        </p>

        {/* Quick Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[11px] text-indigo-200">تعداد کل فعالیت‌های هفته</div>
            <div className="text-base font-black mt-0.5">
              {toPersianDigits(weeklyComputation.activeWeekPlans.length)} فعالیت (
              {toPersianDigits(
                weeklyComputation.activeWeekPlans.filter((p) => Number(p.is_study) === 1).length
              )}{' '}
              درسی)
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[11px] text-indigo-200">زمان مطالعه واقعی / پیش‌بینی</div>
            <div className="text-base font-black mt-0.5">
              {toPersianDigits(periodSummary.totalStudyMinutes)} از{' '}
              {toPersianDigits(periodSummary.totalPredictedStudyMinutes)} دقیقه
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[11px] text-indigo-200">تست واقعی / تست هدف</div>
            <div className="text-base font-black mt-0.5">
              {toPersianDigits(periodSummary.totalExercisesCount)} از{' '}
              {toPersianDigits(periodSummary.totalTargetExercisesCount)} تست
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[11px] text-indigo-200">میانگین وزنی کیفیت هفته</div>
            <div className="text-base font-black mt-0.5 text-emerald-300">
              {toPersianDigits(periodSummary.weightedLearningQuality0To10 ?? 0)} از ۱۰
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[11px] text-indigo-200">میانگین امتیاز نهایی روزانه (DS)</div>
            <div className="text-base font-black mt-0.5 text-amber-300">
              {toPersianDigits(periodSummary.averageFinalScoreS ?? 0)}٪
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-[11px] text-indigo-200">XP خالص هفته و سطح کل</div>
            <div className="text-base font-black mt-0.5 text-cyan-300">
              {toPersianDigits(xpLedger.netTotalXp)} XP ({levelProgress.stageNameFa})
            </div>
          </div>
        </div>
      </div>

      {/* Section Filter Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/70 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
        {[
          { id: 'all', label: 'نمایش کامل هر ۵ بخش', icon: Layers },
          { id: 'sec1', label: 'بخش اول: شاخص‌های روزانه', icon: Calendar },
          { id: 'sec2', label: 'بخش دوم: محاسبات مربوط به دروس', icon: BookOpen },
          { id: 'sec3', label: 'بخش سوم: امتیاز عملکرد کلی', icon: Activity },
          { id: 'sec4', label: 'بخش چهارم: محاسبات XP و Level', icon: Award },
          { id: 'sec5', label: 'بخش پنجم: سایر شاخص‌ها و محاسبات', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSectionTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSectionTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION 1: DAILY METRICS (بخش اول: شاخص‌های روزانه)
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'sec1') && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-indigo-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  بخش اول: شاخص‌های روزانه (۱۶ تا ۲۲ آبان ۱۴۰۵)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  جدول خلاصه هر ۷ روز هفته نمونه + کالبدشکافی گام‌به‌گام فرمول‌های روزانه برای هر روز انتخابی
                </p>
              </div>
            </div>
          </div>

          {/* 7-Day Master Overview Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                جدول مقایسه شاخص‌های روزانه در ۷ روز هفته نمونه (برای مشاهده مراحل جایگذاری هر روز، روی سطر آن کلیک کنید)
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                روز انتخاب‌شده: {selectedDayEval.weekdayName}{' '}
                {toPersianDigits(selectedDayEval.jalaliCompact)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 font-black">روز و تاریخ</th>
                    <th className="py-2.5 px-2.5 font-black">وضعیت فعالیت‌ها (کامل/ناقص/مانده)</th>
                    <th className="py-2.5 px-2.5 font-black">زمان مطالعه (واقعی / هدف)</th>
                    <th className="py-2.5 px-2 font-black">شاخص T</th>
                    <th className="py-2.5 px-2.5 font-black">تست (واقعی / هدف)</th>
                    <th className="py-2.5 px-2 font-black">شاخص Q</th>
                    <th className="py-2.5 px-2.5 font-black">کیفیت وزنی (L)</th>
                    <th className="py-2.5 px-2 font-black">امتیاز E</th>
                    <th className="py-2.5 px-2.5 font-black">سرگرمی (واقعی/مجاز) و C</th>
                    <th className="py-2.5 px-2.5 font-black">امتیاز نهایی روز (DS)</th>
                    <th className="py-2.5 px-2.5 font-black">سهم مطالعه از ظرف روز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {periodSummary.dailyEvaluations.map((d) => {
                    const isSelected = d.dateIso === selectedDayEval.dateIso;
                    return (
                      <tr
                        key={d.dateIso}
                        onClick={() => setSelectedDayIso(d.dateIso)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-black text-slate-900 dark:text-white">
                            {d.weekdayName}
                          </span>{' '}
                          <span className="text-slate-500 dark:text-slate-400">
                            ({toPersianDigits(d.jalaliCompact)})
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {toPersianDigits(d.completedCount)} کامل
                          </span>{' '}
                          / <span className="text-amber-600">{toPersianDigits(d.partialCount)} ناقص</span> /{' '}
                          <span className="text-rose-600">{toPersianDigits(d.pendingCount)} مانده</span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {toPersianDigits(d.actualStudyMinutes)} از{' '}
                          {toPersianDigits(d.targetStudyMinutes)} دقیقه
                        </td>
                        <td className="py-2.5 px-2 font-black text-indigo-600 dark:text-indigo-400">
                          {toPersianDigits(d.studyTimeIndexT ?? 0)}٪
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {d.targetExercisesCount !== null && d.targetExercisesCount > 0
                            ? `${toPersianDigits(d.actualExercisesCount)} از ${toPersianDigits(
                                d.targetExercisesCount
                              )}`
                            : 'بدون هدف تست'}
                        </td>
                        <td className="py-2.5 px-2 font-black text-purple-600 dark:text-purple-400">
                          {d.exercisesIndexQ !== null
                            ? `${toPersianDigits(d.exercisesIndexQ)}٪`
                            : 'حذف از وزن'}
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {toPersianDigits(d.learningQuality0To10 ?? 0)} از ۱۰ (
                          {toPersianDigits(d.learningQualityIndexL ?? 0)}٪)
                        </td>
                        <td className="py-2.5 px-2 font-black text-emerald-600 dark:text-emerald-400">
                          {toPersianDigits(d.educationalCompositeE ?? 0)}٪
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {toPersianDigits(d.restrictedActualMinutes)} از{' '}
                          {toPersianDigits(d.restrictedAllowedLoggedMinutes)} دقیقه (C=
                          {toPersianDigits(d.restrictedControlIndexC ?? 100)}٪)
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-black ${
                              (d.finalDailyScoreS ?? 0) >= 85
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : (d.finalDailyScoreS ?? 0) >= 60
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {toPersianDigits(d.finalDailyScoreS ?? 0)}٪
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {toPersianDigits(d.studyShareOfBudgetPct ?? 0)}٪ (از{' '}
                          {toPersianDigits(d.budgetMinutes ?? 0)} دقیقه)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Day Selector Buttons for Detailed Step-by-Step Inspection */}
          <div className="flex flex-wrap items-center gap-2 bg-indigo-50/70 dark:bg-indigo-950/25 p-3 rounded-2xl border border-indigo-200/70 dark:border-indigo-800/50">
            <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 ml-2">
              انتخاب روز جهت مشاهده جایگذاری عددی گام‌به‌گام:
            </span>
            {periodSummary.dailyEvaluations.map((d) => (
              <button
                key={d.dateIso}
                type="button"
                onClick={() => setSelectedDayIso(d.dateIso)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  d.dateIso === selectedDayEval.dateIso
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100'
                }`}
              >
                {d.weekdayName} {toPersianDigits(d.jalaliCompact.slice(5))} (DS:{' '}
                {toPersianDigits(d.finalDailyScoreS ?? 0)}٪)
              </button>
            ))}
          </div>

          {/* Raw Input Activities of the Selected Day */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 p-4">
            <h5 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 mb-2.5">
              ریز فعالیت‌های ورودی روز انتخاب‌شده: {selectedDayEval.jalaliFull} (ظرف زمانی روز:{' '}
              {toPersianDigits(selectedDayEval.budgetMinutes ?? 0)} دقیقه)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {selectedDayPlans.map((p, idx) => {
                const ratio = calculateActualToPredictedRatioPct(
                  p.performance?.actual_minutes ?? null,
                  p.initial_predicted_minutes || p.predicted_minutes
                );
                return (
                  <div
                    key={p.id}
                    className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/80 dark:border-slate-700/70 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white">
                        {toPersianDigits(idx + 1)}.{' '}
                        {Number(p.is_study) === 1
                          ? `درس ${p.subject_name_snapshot} (${p.unit_title_snapshot || ''})`
                          : `${p.category_title_snapshot} (${
                              p.activity_group_snapshot === 'restricted' ? 'محدودشونده' : 'ضروری'
                            })`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          p.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : p.status === 'partial'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {p.status === 'completed'
                          ? 'تکمیل‌شده'
                          : p.status === 'partial'
                          ? 'ناقص'
                          : 'انجام‌نشده'}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      <span>اولویت: {p.priority_code}</span>
                      <span>
                        زمان پیش‌بینی اولیه: {toPersianDigits(p.initial_predicted_minutes)} دقیقه
                      </span>
                      {p.predicted_minutes !== p.initial_predicted_minutes && (
                        <span className="text-amber-600 font-bold">
                          (ویرایش‌شده به: {toPersianDigits(p.predicted_minutes)} دقیقه)
                        </span>
                      )}
                      <span>
                        زمان واقعی:{' '}
                        {p.performance
                          ? `${toPersianDigits(p.performance.actual_minutes)} دقیقه (${toPersianDigits(
                              ratio ?? 0
                            )}٪ پیش‌بینی)`
                          : 'ثبت‌نشده (۰)'}
                      </span>
                      {Number(p.is_study) === 1 && (
                        <>
                          <span>
                            تست:{' '}
                            {p.performance
                              ? toPersianDigits(p.performance.exercises_count ?? 0)
                              : '۰'}{' '}
                            از {p.target_exercises ? toPersianDigits(p.target_exercises) : '۰'}
                          </span>
                          <span>
                            کیفیت:{' '}
                            {p.performance?.learning_quality
                              ? `${toPersianDigits(p.performance.learning_quality)} از ۱۰`
                              : '—'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8 Detailed Metric Cards for the Selected Day */}
          <div className="grid grid-cols-1 gap-4">
            {/* 1.1 Study Time Fulfillment T */}
            <MetricBreakdownBlock
              badgeNumber="۱-۱"
              title={`شاخص تحقق زمان مطالعه روز (${selectedDayEval.weekdayName} ${toPersianDigits(
                selectedDayEval.jalaliCompact
              )})`}
              symbol="T = min(100, round((actualStudyMinutes / targetStudyMinutes) * 100))"
              concept="نشان می‌دهد چه درصدی از زمان مطالعه برنامه‌ریزی‌شده (پیش‌بینی اولیه فعالیت‌های درسی) در عمل محقق شده است. سقف این شاخص در امتیازدهی روزانه ۱۰۰٪ است."
              formulaCode={`// analyticsEngine.ts -> calculateStudyTimeIndexT
const predictedStudyMinutes = educationalPlans.reduce((sum, p) => sum + Number(p.initial_predicted_minutes || p.predicted_minutes || 0), 0);
const actualStudyMinutes = loggedEducationalPlans.reduce((sum, p) => sum + Number(p.performance?.actual_minutes || 0), 0);
const T = Math.min(100, Math.round((actualStudyMinutes / targetStudyMinutes) * 100));`}
              inputsText={`مجموع زمان پیش‌بینی اولیه دروس روز: ${selectedDayStudyPlans
                .map(
                  (p) =>
                    `${p.subject_name_snapshot} (${toPersianDigits(p.initial_predicted_minutes)} دقیقه)`
                )
                .join(' + ')} = ${toPersianDigits(
                selectedDayEval.targetStudyMinutes
              )} دقیقه | مجموع زمان واقعی مطالعه: ${selectedDayStudyPlans
                .map(
                  (p) =>
                    `${p.subject_name_snapshot} (${toPersianDigits(
                      p.performance?.actual_minutes ?? 0
                    )} دقیقه)`
                )
                .join(' + ')} = ${toPersianDigits(selectedDayEval.actualStudyMinutes)} دقیقه`}
              steps={[
                `گام اول (محاسبه مخرج - زمان هدف مطالعه): ${selectedDayStudyPlans
                  .map((p) => toPersianDigits(p.initial_predicted_minutes))
                  .join(' + ')} = ${toPersianDigits(selectedDayEval.targetStudyMinutes)} دقیقه`,
                `گام دوم (محاسبه صورت - زمان واقعی مطالعه): ${selectedDayStudyPlans
                  .map((p) => toPersianDigits(p.performance?.actual_minutes ?? 0))
                  .join(' + ')} = ${toPersianDigits(selectedDayEval.actualStudyMinutes)} دقیقه`,
                `گام سوم (تقسیم و ضرب در ۱۰۰): (${toPersianDigits(
                  selectedDayEval.actualStudyMinutes
                )} ÷ ${toPersianDigits(selectedDayEval.targetStudyMinutes)}) × ۱۰۰ = ${toPersianDigits(
                  Math.round(
                    (selectedDayEval.actualStudyMinutes /
                      Math.max(1, selectedDayEval.targetStudyMinutes)) *
                      1000
                  ) / 10
                )}٪`,
                `گام چهارم (گرد کردن و اعمال سقف ۱۰۰): min(100, ${toPersianDigits(
                  Math.round(
                    (selectedDayEval.actualStudyMinutes /
                      Math.max(1, selectedDayEval.targetStudyMinutes)) *
                      100
                  )
                )}) = ${toPersianDigits(selectedDayEval.studyTimeIndexT ?? 0)}٪`,
              ]}
              finalResult={`T = ${toPersianDigits(selectedDayEval.studyTimeIndexT ?? 0)}٪ (اختلاف زمانی روز: ${
                selectedDayEval.studyVarianceMinutes >= 0 ? '+' : ''
              }${toPersianDigits(selectedDayEval.studyVarianceMinutes)} دقیقه)`}
              interpretation={
                (selectedDayEval.studyTimeIndexT ?? 0) >= 95
                  ? 'تحقق کامل زمان مطالعه برنامه‌ریزی‌شده در این روز'
                  : (selectedDayEval.studyTimeIndexT ?? 0) >= 70
                  ? 'بخش عمده زمان مطالعه هدف محقق شده است'
                  : 'کمبود محسوس زمان مطالعه واقعی نسبت به برنامه روزانه'
              }
              tone="indigo"
            />

            {/* 1.2 Card-Level Actual to Predicted Time Ratio */}
            <MetricBreakdownBlock
              badgeNumber="۱-۲"
              title={`درصد زمان واقعی نسبت به پیش‌بینی در سطح هر کارت (${selectedDayEval.weekdayName})`}
              symbol="RatioPct = round((actualMinutes / predictedMinutes) * 100)"
              concept="در سطح هر کارت فعالیت، نسبت زمان واقعی به زمان پیش‌بینی بدون سقف ۱۰۰٪ محاسبه می‌شود تا اگر دانش‌آموز بیشتر از پیش‌بینی مطالعه کرد (مثلاً ۱۱۷٪)، دقیقاً روی کارت نمایش داده شود."
              formulaCode={`// analyticsEngine.ts -> calculateActualToPredictedRatioPct
export function calculateActualToPredictedRatioPct(actualMinutes, predictedMinutes) {
  if (actualMinutes === null || predictedMinutes <= 0) return null;
  return Math.round((actualMinutes / predictedMinutes) * 100);
}`}
              inputsText={selectedDayStudyPlans
                .map(
                  (p) =>
                    `${p.subject_name_snapshot}: پیش‌بینی ${toPersianDigits(
                      p.predicted_minutes
                    )} دقیقه، واقعی ${
                      p.performance ? toPersianDigits(p.performance.actual_minutes) : 'ثبت‌نشده'
                    } دقیقه`
                )
                .join(' | ')}
              steps={selectedDayStudyPlans.map((p) => {
                const act = p.performance?.actual_minutes ?? null;
                const pred = p.predicted_minutes;
                const pct = calculateActualToPredictedRatioPct(act, pred);
                return `کارت «${p.subject_name_snapshot}»: ${
                  act !== null
                    ? `(${toPersianDigits(act)} ÷ ${toPersianDigits(pred)}) × ۱۰۰ = ${toPersianDigits(
                        pct ?? 0
                      )}٪`
                    : 'عملکرد ثبت نشده (انجام‌نشده) -> بدون درصد زمان واقعی'
                }`;
              })}
              finalResult={selectedDayStudyPlans
                .map((p) => {
                  const pct = calculateActualToPredictedRatioPct(
                    p.performance?.actual_minutes ?? null,
                    p.predicted_minutes
                  );
                  return `${p.subject_name_snapshot}: ${
                    pct !== null ? `${toPersianDigits(pct)}٪` : '—'
                  }`;
                })
                .join(' ، ')}
              interpretation="این شاخص می‌تواند از ۱۰۰٪ عبور کند و هرگز با درصد تکمیل فعالیت‌ها ادغام نمی‌شود."
              tone="cyan"
            />

            {/* 1.3 Exercises / Tests Fulfillment Index Q */}
            <MetricBreakdownBlock
              badgeNumber="۱-۳"
              title={`شاخص تحقق تست و تمرین روز (${selectedDayEval.weekdayName} ${toPersianDigits(
                selectedDayEval.jalaliCompact
              )})`}
              symbol="Q = targetExercises > 0 ? min(100, round((actualExercises / targetExercises) * 100)) : null"
              concept="میزان دستیابی به هدف تست/تمرین روزانه را می‌سنجد. اگر در روزی هیچ هدف تستی تعریف نشده باشد (مانند چهارشنبه ۲۰ آبان)، مقدار Q برابر null برمی‌گردد تا روز بدون تست به‌غلط نمره صفر نگیرد."
              formulaCode={`// analyticsEngine.ts -> calculateExercisesIndexQ
export function calculateExercisesIndexQ(actualExercisesCount, targetExercisesCount) {
  const target = Number(targetExercisesCount || 0);
  if (target <= 0) return null; // Excluded from E weights automatically
  return Math.min(100, Math.round((actualExercisesCount / target) * 100));
}`}
              inputsText={
                selectedDayEval.targetExercisesCount && selectedDayEval.targetExercisesCount > 0
                  ? `مجموع تست هدف روز: ${toPersianDigits(
                      selectedDayEval.targetExercisesCount
                    )} تست | مجموع تست واقعی حل‌شده: ${toPersianDigits(
                      selectedDayEval.actualExercisesCount
                    )} تست`
                  : 'در این روز هیچ هدف تستی (target_exercises) برای دروس تعریف نشده است (روز مطالعه تشریحی).'
              }
              steps={
                selectedDayEval.targetExercisesCount && selectedDayEval.targetExercisesCount > 0
                  ? [
                      `گام اول (جمع تست‌های هدف): ${selectedDayStudyPlans
                        .map((p) => toPersianDigits(p.target_exercises ?? 0))
                        .join(' + ')} = ${toPersianDigits(selectedDayEval.targetExercisesCount)} تست`,
                      `گام دوم (جمع تست‌های واقعی): ${selectedDayStudyPlans
                        .map((p) => toPersianDigits(p.performance?.exercises_count ?? 0))
                        .join(' + ')} = ${toPersianDigits(selectedDayEval.actualExercisesCount)} تست`,
                      `گام سوم (محاسبه درصد و اعمال سقف ۱۰۰): min(100, round((${toPersianDigits(
                        selectedDayEval.actualExercisesCount
                      )} ÷ ${toPersianDigits(selectedDayEval.targetExercisesCount)}) × ۱۰۰)) = ${toPersianDigits(
                        selectedDayEval.exercisesIndexQ ?? 0
                      )}٪`,
                    ]
                  : [
                      'گام اول: بررسی مجموع target_exercises فعالیت‌های درسی روز -> ۰ تست',
                      'گام دوم: چون target <= 0 است، تابع مقدار Q = null برمی‌گرداند.',
                      'گام سوم: در فرمول امتیاز آموزشی E، وزن ۳۰٪ تست به‌صورت خودکار بین زمان مطالعه (T) و کیفیت یادگیری (L) سرشکن می‌شود.',
                    ]
              }
              finalResult={
                selectedDayEval.exercisesIndexQ !== null
                  ? `Q = ${toPersianDigits(selectedDayEval.exercisesIndexQ)}٪`
                  : 'Q = null (روز بدون هدف تست — حذف خودکار از مخرج وزن‌های E)'
              }
              interpretation={
                selectedDayEval.exercisesIndexQ === null
                  ? 'عدم تعریف تست در برنامه روزانه باعث جریمه کاذب دانش‌آموز نمی‌شود.'
                  : selectedDayEval.exercisesIndexQ >= 90
                  ? 'عملکرد عالی در حل تمرین‌ها و تست‌های هدف‌گذاری‌شده'
                  : 'تعداد تست‌های حل‌شده کمتر از هدف برنامه‌ریزی‌شده روز است'
              }
              tone="purple"
            />

            {/* 1.4 Weighted Learning Quality L */}
            <MetricBreakdownBlock
              badgeNumber="۱-۴"
              title={`میانگین وزنی کیفیت یادگیری روز (${selectedDayEval.weekdayName} ${toPersianDigits(
                selectedDayEval.jalaliCompact
              )})`}
              symbol="Q_w = Σ(q_i × t_i) / Σ(t_i)  ,  L = round(Q_w × 10)"
              concept="کیفیت یادگیری هر درس (از ۰ تا ۱۰) به نسبت زمان واقعی مطالعه همان درس وزن‌دهی می‌شود تا یک مطالعه ۱۰ دقیقه‌ای به اندازه یک مطالعه ۱۰۰ دقیقه‌ای روی میانگین کیفیت اثر نگذارد."
              formulaCode={`// analyticsEngine.ts -> calculateWeightedLearningQualityL
weightedNumerator += q * actMins;
evaluatedMinutes += actMins;
const rawAvg = weightedNumerator / evaluatedMinutes;
const weightedAverage0To10 = Math.round(rawAvg * 10) / 10;
const scoreL0To100 = Math.min(100, Math.max(0, Math.round(rawAvg * 10)));`}
              inputsText={
                selectedDayStudyPlans
                  .filter((p) => p.performance && Number(p.performance.actual_minutes) > 0)
                  .map(
                    (p) =>
                      `${p.subject_name_snapshot}: زمان واقعی t=${toPersianDigits(
                        p.performance?.actual_minutes ?? 0
                      )} دقیقه × کیفیت q=${toPersianDigits(p.performance?.learning_quality ?? 0)}`
                  )
                  .join(' | ') || 'بدون فعالیت ثبت‌شده'
              }
              steps={[
                `گام اول (محاسبه صورت Σ(q_i × t_i)): ${selectedDayStudyPlans
                  .filter((p) => p.performance && Number(p.performance.actual_minutes) > 0)
                  .map(
                    (p) =>
                      `(${toPersianDigits(p.performance?.learning_quality ?? 0)} × ${toPersianDigits(
                        p.performance?.actual_minutes ?? 0
                      )})`
                  )
                  .join(' + ')} = ${toPersianDigits(
                  selectedDayEval.learningQualityWeightedNumerator
                )}`,
                `گام دوم (محاسبه مخرج Σ(t_i)): ${selectedDayStudyPlans
                  .filter((p) => p.performance && Number(p.performance.actual_minutes) > 0)
                  .map((p) => toPersianDigits(p.performance?.actual_minutes ?? 0))
                  .join(' + ')} = ${toPersianDigits(
                  selectedDayEval.learningQualityEvaluatedMinutes
                )} دقیقه`,
                `گام سوم (تقسیم صورت بر مخرج): ${toPersianDigits(
                  selectedDayEval.learningQualityWeightedNumerator
                )} ÷ ${toPersianDigits(
                  selectedDayEval.learningQualityEvaluatedMinutes
                )} = ${toPersianDigits(
                  Math.round(
                    (selectedDayEval.learningQualityWeightedNumerator /
                      Math.max(1, selectedDayEval.learningQualityEvaluatedMinutes)) *
                      100
                  ) / 100
                )} (گرد شده به یک رقم اعشار: ${toPersianDigits(
                  selectedDayEval.learningQuality0To10 ?? 0
                )} از ۱۰)`,
                `گام چهارم (تبدیل به مقیاس ۰ تا ۱۰۰ برای شاخص L): round(${toPersianDigits(
                  Math.round(
                    (selectedDayEval.learningQualityWeightedNumerator /
                      Math.max(1, selectedDayEval.learningQualityEvaluatedMinutes)) *
                      100
                  ) / 100
                )} × 10) = ${toPersianDigits(selectedDayEval.learningQualityIndexL ?? 0)}٪`,
              ]}
              finalResult={`کیفیت وزنی روز = ${toPersianDigits(
                selectedDayEval.learningQuality0To10 ?? 0
              )} از ۱۰  |  شاخص L = ${toPersianDigits(selectedDayEval.learningQualityIndexL ?? 0)}٪`}
              interpretation="وزن‌دهی بر اساس زمان واقعی مطالعه باعث دقت کامل شاخص کیفیت در برابر نوسان طول جلسات می‌شود."
              tone="emerald"
            />

            {/* 1.5 Direct Educational Score E */}
            <MetricBreakdownBlock
              badgeNumber="۱-۵"
              title={`امتیاز عملکرد مستقیم آموزشی روز (E) — ${selectedDayEval.weekdayName} ${toPersianDigits(
                selectedDayEval.jalaliCompact
              )}`}
              symbol="E = round(((T × 0.40) + (Q × 0.30) + (L × 0.30)) / totalWeight)"
              concept="ترکیب موزون سه بُعد اصلی مطالعه: تحقق زمان مطالعه (وزن ۴۰٪)، تحقق تست و تمرین (وزن ۳۰٪) و کیفیت یادگیری وزنی (وزن ۳۰٪). در روزهای بدون هدف تست، مجموع وزن فعال برابر ۰.۷۰ (۰.۴۰ + ۰.۳۰) می‌شود."
              formulaCode={`// analyticsEngine.ts -> calculateEducationalCompositeScoreE
// DEFAULT_ANALYTICS_WEIGHTS: studyTimeWeight = 0.4, exercisesWeight = 0.3, learningQualityWeight = 0.3
const weightedSum = (T * 0.4) + (Q !== null ? Q * 0.3 : 0) + (L * 0.3);
const totalWeight = 0.4 + (Q !== null ? 0.3 : 0) + 0.3;
const E = Math.round(weightedSum / totalWeight);`}
              inputsText={`T = ${toPersianDigits(selectedDayEval.studyTimeIndexT ?? 0)}٪ (وزن ۰.۴۰) | Q = ${
                selectedDayEval.exercisesIndexQ !== null
                  ? `${toPersianDigits(selectedDayEval.exercisesIndexQ)}٪ (وزن ۰.۳۰)`
                  : 'null (وزن ۰)'
              } | L = ${toPersianDigits(selectedDayEval.learningQualityIndexL ?? 0)}٪ (وزن ۰.۳۰)`}
              steps={
                selectedDayEval.exercisesIndexQ !== null
                  ? [
                      `گام اول (ضرب هر شاخص در وزن استاندارد آن): (${toPersianDigits(
                        selectedDayEval.studyTimeIndexT ?? 0
                      )} × ۰.۴۰) + (${toPersianDigits(
                        selectedDayEval.exercisesIndexQ
                      )} × ۰.۳۰) + (${toPersianDigits(
                        selectedDayEval.learningQualityIndexL ?? 0
                      )} × ۰.۳۰)`,
                      `گام دوم (جمع حاصل‌ضرب‌ها): ${toPersianDigits(
                        Math.round((selectedDayEval.studyTimeIndexT ?? 0) * 0.4 * 100) / 100
                      )} + ${toPersianDigits(
                        Math.round(selectedDayEval.exercisesIndexQ * 0.3 * 100) / 100
                      )} + ${toPersianDigits(
                        Math.round((selectedDayEval.learningQualityIndexL ?? 0) * 0.3 * 100) / 100
                      )} = ${toPersianDigits(
                        Math.round(
                          ((selectedDayEval.studyTimeIndexT ?? 0) * 0.4 +
                            selectedDayEval.exercisesIndexQ * 0.3 +
                            (selectedDayEval.learningQualityIndexL ?? 0) * 0.3) *
                            100
                        ) / 100
                      )}`,
                      `گام سوم (تقسیم بر مجموع وزن‌ها ۱.۰۰ و گرد کردن): round(${toPersianDigits(
                        Math.round(
                          ((selectedDayEval.studyTimeIndexT ?? 0) * 0.4 +
                            selectedDayEval.exercisesIndexQ * 0.3 +
                            (selectedDayEval.learningQualityIndexL ?? 0) * 0.3) *
                            100
                        ) / 100
                      )} ÷ ۱.۰۰) = ${toPersianDigits(selectedDayEval.educationalCompositeE ?? 0)}٪`,
                    ]
                  : [
                      `گام اول (روز بدون هدف تست — وزن‌های فعال: ۰.۴۰ برای T و ۰.۳۰ برای L، جمع وزن = ۰.۷۰):`,
                      `گام دوم (جمع موزون صورت): (${toPersianDigits(
                        selectedDayEval.studyTimeIndexT ?? 0
                      )} × ۰.۴۰) + (${toPersianDigits(
                        selectedDayEval.learningQualityIndexL ?? 0
                      )} × ۰.۳۰) = ${toPersianDigits(
                        Math.round(
                          ((selectedDayEval.studyTimeIndexT ?? 0) * 0.4 +
                            (selectedDayEval.learningQualityIndexL ?? 0) * 0.3) *
                            100
                        ) / 100
                      )}`,
                      `گام سوم (نرمال‌سازی بر مخرج ۰.۷۰): round(${toPersianDigits(
                        Math.round(
                          ((selectedDayEval.studyTimeIndexT ?? 0) * 0.4 +
                            (selectedDayEval.learningQualityIndexL ?? 0) * 0.3) *
                            100
                        ) / 100
                      )} ÷ ۰.۷۰) = ${toPersianDigits(selectedDayEval.educationalCompositeE ?? 0)}٪`,
                    ]
              }
              finalResult={`E = ${toPersianDigits(selectedDayEval.educationalCompositeE ?? 0)}٪`}
              interpretation="امتیاز E کیفیت و کمیت خالص مطالعه درسی روز را پیش از اعمال ضریب کنترل سرگرمی نشان می‌دهد."
              tone="indigo"
            />

            {/* 1.6 Restricted Activities Control Index C */}
            <MetricBreakdownBlock
              badgeNumber="۱-۶"
              title={`شاخص کنترل فعالیت‌های محدودشونده / سرگرمی (C) — ${selectedDayEval.weekdayName} ${toPersianDigits(
                selectedDayEval.jalaliCompact
              )}`}
              symbol="C_i = min(100, round((allowedMinutes / actualMinutes) * 100)) , C = round(Σ(C_i × w_i) / Σ(w_i))"
              concept="سنجش خودکنترلی دانش‌آموز در رعایت سقف مجاز فعالیت‌های سرگرمی و محدودشونده. اگر زمان واقعی سرگرمی کمتر یا مساوی سقف مجاز باشد، امتیاز ۱۰۰٪ است؛ در صورت تخطی از سقف مجاز، امتیاز به نسبت تخطی کاهش می‌یابد."
              formulaCode={`// analyticsEngine.ts -> calculateSingleRestrictedAdherenceCi & calculateRestrictedControlIndexC
const Ci = Math.min(100, Math.round((allowed / actual) * 100));
const w = Math.max(1, allowed > 0 ? allowed : actual) * impactWeight;
scoreC = Math.round(weightedSum / weightTotal);`}
              inputsText={
                selectedDayEval.restrictedItems
                  .map(
                    (it) =>
                      `${it.title}: سقف مجاز ${toPersianDigits(
                        it.allowedMinutes
                      )} دقیقه، مصرف واقعی ${toPersianDigits(
                        it.actualMinutes
                      )} دقیقه (اضافه‌مصرف: ${toPersianDigits(it.overuseMinutes)} دقیقه)`
                  )
                  .join(' | ') || 'بدون فعالیت سرگرمی'
              }
              steps={[
                ...selectedDayEval.restrictedItems.map(
                  (it, i) =>
                    `فعالیت محدودشونده ${toPersianDigits(i + 1)} (${it.title}): C_${toPersianDigits(
                      i + 1
                    )} = min(100, round((${toPersianDigits(it.allowedMinutes)} ÷ ${toPersianDigits(
                      it.actualMinutes
                    )}) × ۱۰۰)) = ${toPersianDigits(it.adherenceScoreCi)}٪ (وزن زمانی w = ${toPersianDigits(
                      it.allowedMinutes
                    )})`
                ),
                `محاسبه میانگین وزنی کل روز (C): ${
                  selectedDayEval.restrictedItems.length > 1
                    ? `round((${selectedDayEval.restrictedItems
                        .map(
                          (it) =>
                            `(${toPersianDigits(it.adherenceScoreCi)} × ${toPersianDigits(
                              it.allowedMinutes
                            )})`
                        )
                        .join(' + ')}) ÷ (${selectedDayEval.restrictedItems
                        .map((it) => toPersianDigits(it.allowedMinutes))
                        .join(' + ')})) = ${toPersianDigits(
                        selectedDayEval.restrictedControlIndexC ?? 100
                      )}٪`
                    : `C = ${toPersianDigits(selectedDayEval.restrictedControlIndexC ?? 100)}٪`
                }`,
              ]}
              finalResult={`C = ${toPersianDigits(
                selectedDayEval.restrictedControlIndexC ?? 100
              )}٪ (مجموع اضافه‌مصرف سرگرمی روز: ${toPersianDigits(
                selectedDayEval.restrictedOveruseMinutes
              )} دقیقه)`}
              interpretation={
                (selectedDayEval.restrictedControlIndexC ?? 100) === 100
                  ? 'رعایت ۱۰۰٪ سقف مجاز سرگرمی بدون هیچ‌گونه تخطی زمانی'
                  : 'عبور زمان سرگرمی از سقف مجاز روزانه باعث کاهش شاخص C شده است'
              }
              tone="amber"
            />

            {/* 1.7 Final Daily Score DS / S */}
            <MetricBreakdownBlock
              badgeNumber="۱-۷"
              title={`امتیاز نهایی عملکرد روزانه (DS / S) — ${selectedDayEval.weekdayName} ${toPersianDigits(
                selectedDayEval.jalaliCompact
              )}`}
              symbol="DS = round((E × 0.80) + (C × 0.20))"
              concept="امتیاز جامع عملکرد روزانه که ۸۰٪ وزن را به عملکرد مستقیم آموزشی (E) و ۲۰٪ وزن را به شاخص کنترل فعالیت‌های محدودشونده/سرگرمی (C) اختصاص می‌دهد."
              formulaCode={`// analyticsEngine.ts -> calculateFinalDailyScoreS
// educationalCompositeWeight = 0.80 , restrictedControlWeight = 0.20
export function calculateFinalDailyScoreS(E, C, weights = DEFAULT_ANALYTICS_WEIGHTS) {
  return Math.min(100, Math.max(0, Math.round((E * 0.8 + C * 0.2) / 1.0)));
}`}
              inputsText={`امتیاز آموزشی روز E = ${toPersianDigits(
                selectedDayEval.educationalCompositeE ?? 0
              )}٪ (وزن ۰.۸۰) | شاخص کنترل سرگرمی C = ${toPersianDigits(
                selectedDayEval.restrictedControlIndexC ?? 100
              )}٪ (وزن ۰.۲۰)`}
              steps={[
                `گام اول (سهم ۸۰٪ بخش آموزشی): ${toPersianDigits(
                  selectedDayEval.educationalCompositeE ?? 0
                )} × ۰.۸۰ = ${toPersianDigits(
                  Math.round((selectedDayEval.educationalCompositeE ?? 0) * 0.8 * 100) / 100
                )}`,
                `گام دوم (سهم ۲۰٪ کنترل سرگرمی): ${toPersianDigits(
                  selectedDayEval.restrictedControlIndexC ?? 100
                )} × ۰.۲۰ = ${toPersianDigits(
                  Math.round((selectedDayEval.restrictedControlIndexC ?? 100) * 0.2 * 100) / 100
                )}`,
                `گام سوم (جمع و گرد کردن): round(${toPersianDigits(
                  Math.round((selectedDayEval.educationalCompositeE ?? 0) * 0.8 * 100) / 100
                )} + ${toPersianDigits(
                  Math.round((selectedDayEval.restrictedControlIndexC ?? 100) * 0.2 * 100) / 100
                )}) = ${toPersianDigits(selectedDayEval.finalDailyScoreS ?? 0)}٪`,
              ]}
              finalResult={`امتیاز نهایی روز (DS) = ${toPersianDigits(
                selectedDayEval.finalDailyScoreS ?? 0
              )}٪`}
              interpretation={
                (selectedDayEval.finalDailyScoreS ?? 0) >= 85
                  ? 'روز طلایی با توازن عالی بین مطالعه درسی و کنترل سرگرمی'
                  : (selectedDayEval.finalDailyScoreS ?? 0) >= 65
                  ? 'عملکرد روزانه قابل قبول؛ با تکمیل فعالیت‌های ناقص قابل ارتقا به بالای ۸۵٪ است'
                  : 'روز نیازمند جبران؛ افت مطالعه و تخطی سرگرمی هم‌زمان امتیاز روز را کاهش داده‌اند'
              }
              tone="emerald"
            />

            {/* 1.8 Daily Time Budget Shares & Task Status Counts */}
            <MetricBreakdownBlock
              badgeNumber="۱-۸"
              title={`سهم از ظرف زمانی روز (B_day) و نرخ تکمیل فعالیت‌ها — ${selectedDayEval.weekdayName}`}
              symbol="StudyShare = round((actualStudyMinutes / budgetMinutes) * 1000) / 10"
              concept="نشان می‌دهد از کل ظرف زمانی در دسترس روز (B_day)، چه درصدی صرف مطالعه درسی، چه درصدی صرف سرگرمی و چه درصدی صرف فعالیت‌های ضروری شده و چه مقدار زمان آزاد باقی مانده است."
              formulaCode={`// analyticsEngine.ts -> evaluateDayPerformance (Section 9)
const studyShareOfBudgetPct = Math.round((actualStudyMinutes / budgetMinutes) * 1000) / 10;
const restrictedShareOfBudgetPct = Math.round((restrictedActualMinutes / budgetMinutes) * 1000) / 10;
const essentialShareOfBudgetPct = Math.round((essentialActualMinutes / budgetMinutes) * 1000) / 10;
const remainingActualBudgetMinutes = Math.max(0, budgetMinutes - totalActualAllMinutes);`}
              inputsText={`ظرف زمانی کل روز (B_day): ${toPersianDigits(
                selectedDayEval.budgetMinutes ?? 0
              )} دقیقه | مطالعه واقعی: ${toPersianDigits(
                selectedDayEval.actualStudyMinutes
              )} دقیقه | سرگرمی واقعی: ${toPersianDigits(
                selectedDayEval.restrictedActualMinutes
              )} دقیقه | فعالیت ضروری واقعی: ${toPersianDigits(
                selectedDayEval.essentialActualMinutes
              )} دقیقه`}
              steps={[
                `سهم مطالعه از ظرف روز: (${toPersianDigits(
                  selectedDayEval.actualStudyMinutes
                )} ÷ ${toPersianDigits(selectedDayEval.budgetMinutes ?? 1)}) × ۱۰۰ = ${toPersianDigits(
                  selectedDayEval.studyShareOfBudgetPct ?? 0
                )}٪`,
                `سهم سرگرمی از ظرف روز: (${toPersianDigits(
                  selectedDayEval.restrictedActualMinutes
                )} ÷ ${toPersianDigits(selectedDayEval.budgetMinutes ?? 1)}) × ۱۰۰ = ${toPersianDigits(
                  selectedDayEval.restrictedShareOfBudgetPct ?? 0
                )}٪`,
                `سهم فعالیت‌های ضروری از ظرف روز: (${toPersianDigits(
                  selectedDayEval.essentialActualMinutes
                )} ÷ ${toPersianDigits(selectedDayEval.budgetMinutes ?? 1)}) × ۱۰۰ = ${toPersianDigits(
                  selectedDayEval.essentialShareOfBudgetPct ?? 0
                )}٪`,
                `مجموع زمان مصرف‌شده واقعی روز: ${toPersianDigits(
                  selectedDayEval.actualStudyMinutes
                )} + ${toPersianDigits(selectedDayEval.restrictedActualMinutes)} + ${toPersianDigits(
                  selectedDayEval.essentialActualMinutes
                )} = ${toPersianDigits(
                  selectedDayEval.totalActualAllMinutes
                )} دقیقه (زمان باقی‌مانده از ظرف روز: ${toPersianDigits(
                  selectedDayEval.remainingActualBudgetMinutes ?? 0
                )} دقیقه)`,
              ]}
              finalResult={`سهم مطالعه: ${toPersianDigits(
                selectedDayEval.studyShareOfBudgetPct ?? 0
              )}٪ | سرگرمی: ${toPersianDigits(
                selectedDayEval.restrictedShareOfBudgetPct ?? 0
              )}٪ | ضروری: ${toPersianDigits(
                selectedDayEval.essentialShareOfBudgetPct ?? 0
              )}٪ | آزاد: ${toPersianDigits(
                selectedDayEval.remainingActualBudgetMinutes ?? 0
              )} دقیقه`}
              interpretation="تخصیص متوازن ظرف زمانی روز از خستگی مفرط و از اتلاف وقت جلوگیری می‌کند."
              tone="cyan"
            />
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 2: SUBJECT-LEVEL CALCULATIONS (بخش دوم: محاسبات مربوط به دروس)
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'sec2') && (
        <section className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-emerald-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  بخش دوم: محاسبات مربوط به دروس (جدول مقایسه‌ای ۶ درس + تشریح گام‌به‌گام)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  در جدول زیر هر سطر به یک درس اختصاص دارد و هر ستون یکی از شاخص‌های تحلیلی آن درس را در هفته نمونه نشان می‌دهد
                </p>
              </div>
            </div>
          </div>

          {/* Comparative Subject Table (Rows = Subjects, Columns = Metrics) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/70 dark:border-emerald-800/50">
              <span className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">
                جدول مقایسه‌ای شاخص‌های دروس در هفته نمونه (۱۶ تا ۲۲ آبان ۱۴۰۵)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 font-black">نام درس</th>
                    <th className="py-2.5 px-2 font-black">نوبت‌ها (کامل/کل)</th>
                    <th className="py-2.5 px-2.5 font-black">زمان واقعی / پیش‌بینی</th>
                    <th className="py-2.5 px-2 font-black">پایبندی زمانی</th>
                    <th className="py-2.5 px-2 font-black">سهم از کل مطالعه هفته</th>
                    <th className="py-2.5 px-2.5 font-black">تست واقعی</th>
                    <th className="py-2.5 px-2 font-black">کیفیت وزنی</th>
                    <th className="py-2.5 px-2 font-black">امتیاز آموزشی درس (E_s)</th>
                    <th className="py-2.5 px-2 font-black">تلاش خام × ضریب اثربخشی</th>
                    <th className="py-2.5 px-2.5 font-black">XP ناخالص / جریمه / خالص</th>
                    <th className="py-2.5 px-2.5 font-black">سطح و پله مستقل درس</th>
                    <th className="py-2.5 px-2.5 font-black">وضعیت استمرار درس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {subjectProgressions.map((sp) => {
                    const subjPlans = weeklyComputation.activeWeekPlans.filter(
                      (p) => Number(p.is_study) === 1 && p.subject_id === sp.subjectId
                    );
                    const predMins = subjPlans.reduce(
                      (s, p) => s + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
                      0
                    );
                    const sharePct =
                      periodSummary.totalStudyMinutes > 0
                        ? Math.round((sp.totalStudyMinutes / periodSummary.totalStudyMinutes) * 1000) /
                          10
                        : 0;

                    return (
                      <tr
                        key={sp.subjectId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {sp.subjectName}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {toPersianDigits(sp.completedCount)} از {toPersianDigits(sp.plansCount)} (
                          {toPersianDigits(sp.taskCompletionPct)}٪)
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {toPersianDigits(sp.totalStudyMinutes)} از {toPersianDigits(predMins)} دقیقه
                        </td>
                        <td className="py-2.5 px-2 font-black text-indigo-600 dark:text-indigo-400">
                          {toPersianDigits(sp.timeAdherencePct)}٪
                        </td>
                        <td className="py-2.5 px-2 font-bold">
                          {toPersianDigits(sharePct)}٪
                        </td>
                        <td className="py-2.5 px-2.5 font-bold">
                          {toPersianDigits(sp.totalExercises)} تست
                        </td>
                        <td className="py-2.5 px-2 font-bold text-emerald-600 dark:text-emerald-400">
                          {toPersianDigits(sp.weightedQuality0To10 ?? 0)} از ۱۰
                        </td>
                        <td className="py-2.5 px-2 font-black">
                          {toPersianDigits(sp.educationalScoreE ?? 0)}٪
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap font-mono text-[11px]" dir="ltr">
                          {sp.rawEffortXp} × {sp.effectivenessMultiplier}
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="text-emerald-600 font-bold">
                            +{toPersianDigits(sp.grossSubjectXp)}
                          </span>{' '}
                          /{' '}
                          <span className="text-rose-600 font-bold">
                            -{toPersianDigits(sp.subjectPenaltyXp)}
                          </span>{' '}
                          ={' '}
                          <span className="font-black text-indigo-700 dark:text-indigo-300">
                            {toPersianDigits(sp.subjectXp)} XP
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap font-bold">
                          {sp.stageProgress.stageNameFa} (پله{' '}
                          {toPersianDigits(sp.stageProgress.stageNumber)} از ۳۹)
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              sp.continuityStatus === 'normal'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : sp.continuityStatus === 'attention'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {sp.continuityStatusLabelFa}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Step-by-Step Subject Calculations */}
          <div className="grid grid-cols-1 gap-4">
            <MetricBreakdownBlock
              badgeNumber="۲-۱"
              title="محاسبه سهم زمانی هر درس از کل مطالعه هفته و پایبندی زمانی درس"
              symbol="SubjectSharePct = (SubjectActualMinutes / TotalWeekStudyMinutes) * 100"
              concept="مشخص می‌کند هر درس چه درصدی از کل زمان مطالعه واقعی هفته (۱,۱۹۵ دقیقه) را به خود اختصاص داده و چه میزان کمبود یا مازاد زمانی نسبت به پیش‌بینی اولیه همان درس داشته است."
              formulaCode={`// Subject Share & Adherence
const timeAdherencePct = Math.round((totalStudyMinutes / predictedMinutes) * 100);
const subjectSharePct = Math.round((totalStudyMinutes / periodSummary.totalStudyMinutes) * 1000) / 10;`}
              inputsText={`مجموع کل مطالعه واقعی هفته: ${toPersianDigits(
                periodSummary.totalStudyMinutes
              )} دقیقه | مجموع پیش‌بینی اولیه هفته: ${toPersianDigits(
                periodSummary.totalPredictedStudyMinutes
              )} دقیقه`}
              steps={subjectProgressions.map((sp) => {
                const subjPlans = weeklyComputation.activeWeekPlans.filter(
                  (p) => Number(p.is_study) === 1 && p.subject_id === sp.subjectId
                );
                const predMins = subjPlans.reduce(
                  (s, p) => s + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
                  0
                );
                const diff = sp.totalStudyMinutes - predMins;
                const sharePct =
                  Math.round((sp.totalStudyMinutes / periodSummary.totalStudyMinutes) * 1000) / 10;
                return `درس «${sp.subjectName}»: زمان واقعی ${toPersianDigits(
                  sp.totalStudyMinutes
                )} دقیقه از ${toPersianDigits(predMins)} دقیقه پیش‌بینی -> پایبندی: (${toPersianDigits(
                  sp.totalStudyMinutes
                )} ÷ ${toPersianDigits(predMins)}) × ۱۰۰ = ${toPersianDigits(
                  sp.timeAdherencePct
                )}٪ | اختلاف: ${diff >= 0 ? '+' : ''}${toPersianDigits(
                  diff
                )} دقیقه | سهم از کل هفته: (${toPersianDigits(
                  sp.totalStudyMinutes
                )} ÷ ${toPersianDigits(periodSummary.totalStudyMinutes)}) × ۱۰۰ = ${toPersianDigits(
                  sharePct
                )}٪`;
              })}
              finalResult={subjectProgressions
                .map(
                  (sp) =>
                    `${sp.subjectName}: ${toPersianDigits(sp.totalStudyMinutes)} دقیقه (${toPersianDigits(
                      Math.round((sp.totalStudyMinutes / periodSummary.totalStudyMinutes) * 1000) /
                        10
                    )}٪ کل هفته)`
                )
                .join(' | ')}
              interpretation="ریاضی و علوم بیشترین سهم مطالعه هفته را دارند و مطالعات اجتماعی به دلیل ۲ نوبت انجام‌نشده کمترین پایبندی زمانی (۶۷٪) را ثبت کرده است."
              tone="emerald"
            />

            <MetricBreakdownBlock
              badgeNumber="۲-۲"
              title="فرمول XP اختصاصی هر درس (Subject XP)، ضریب اثربخشی و سطح ۳۹ پله‌ای درس"
              symbol="GrossSubjectXP = RawEffortXP × EffectivenessMultiplier , NetSubjectXP = GrossSubjectXP - SubjectPenaltyXP"
              concept="هر درس یک سیستم XP و سطح ۳۹ پله‌ای کاملاً مستقل از سایر دروس دارد. تلاش خام درس (از تکمیل کارت، زمان مطالعه، تست، کیفیت و روزهای فعال) در ضریب اثربخشی (مبتنی بر کیفیت و پایبندی) ضرب شده و جریمه نوبت‌های ازدست‌رفته همان درس از آن کسر می‌شود."
              formulaCode={`// analyticsEngine.ts -> calculateSubjectProgression
const rawEffortXp = completedCount * 5 + partialCount * 2.5 + totalStudyMinutes / 50 + totalExercises * 0.2 + rawQualityXp + distinctActiveDays * 1.0;
const masteryIndex = 0.45 * (weightedQuality / 10) + 0.35 * (educationalScoreE / 100) + 0.10 * taskCompletionRatio + 0.10 * Math.min(1, distinctActiveDays / 25);
const effectivenessMultiplier = roundXp2(0.28 + 0.97 * masteryIndex);
const grossSubjectXp = roundXp2(rawEffortXp * effectivenessMultiplier);
const subjectXp = roundXp2(Math.max(0, grossSubjectXp - subjectPenaltyXp));`}
              inputsText={subjectProgressions
                .map(
                  (sp) =>
                    `${sp.subjectName}: تلاش خام=${toPersianDigits(
                      sp.rawEffortXp
                    )}، ضریب=${toPersianDigits(sp.effectivenessMultiplier)}، جریمه=${toPersianDigits(
                      sp.subjectPenaltyXp
                    )}`
                )
                .join(' | ')}
              steps={subjectProgressions.map(
                (sp) =>
                  `درس «${sp.subjectName}»: تلاش خام (${toPersianDigits(
                    sp.rawEffortXp
                  )}) × ضریب اثربخشی (${toPersianDigits(
                    sp.effectivenessMultiplier
                  )}) = XP ناخالص +${toPersianDigits(
                    sp.grossSubjectXp
                  )} | کسر جریمه نوبت‌های معوقه (-${toPersianDigits(
                    sp.subjectPenaltyXp
                  )}) = XP خالص درس: ${toPersianDigits(sp.subjectXp)} XP -> جایگاه در جدول ۳۹ پله‌ای دروس: ${
                    sp.stageProgress.stageNameFa
                  } (پله ${toPersianDigits(sp.stageProgress.stageNumber)} از ۳۹، آستانه پله فعلی: ${toPersianDigits(
                    sp.stageProgress.currentLevelStartXp
                  )} تا ${toPersianDigits(sp.stageProgress.nextLevelTargetXp)} XP)`
              )}
              finalResult={subjectProgressions
                .map(
                  (sp) =>
                    `${sp.subjectName}: ${toPersianDigits(sp.subjectXp)} XP (${
                      sp.stageProgress.stageNameFa
                    })`
                )
                .join(' | ')}
              interpretation="دروسی که با کیفیت بالا و بدون نوبت معوقه مطالعه شده‌اند (مانند علوم و ریاضی) ضریب اثربخشی بالاتر از ۱.۰ گرفته و به سطح نقره‌ای/برنزی صعود کرده‌اند."
              tone="indigo"
            />
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 3: OVERALL PERFORMANCE SCORE (بخش سوم: امتیاز عملکرد کلی)
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'sec3') && (
        <section className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-purple-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  بخش سوم: امتیاز عملکرد کلی دوره هفتگی (۱۶ تا ۲۲ آبان ۱۴۰۵)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  نحوه تجمیع شاخص‌های ۷ روز هفته برای محاسبه امتیاز نهایی دوره، کیفیت وزنی کل هفته و سهم از کل ظرف زمانی هفته
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 3.1 Period Average Final Score DS */}
            <MetricBreakdownBlock
              badgeNumber="۳-۱"
              title="میانگین امتیاز نهایی عملکرد دوره یک‌هفته‌ای (Average Final Score DS)"
              symbol="PeriodDS = round(Σ(DS_day) / validScoreDaysCount)"
              concept="امتیاز نهایی عملکرد در یک بازه زمانی (هفتگی یا ماهانه) برابر است با میانگین حسابی امتیاز نهایی روزانه (DS) در تمام روزهای دارای داده معتبر آن دوره."
              formulaCode={`// analyticsEngine.ts -> evaluatePeriodPerformance
for (const d of dailyEvaluations) {
  if (d.finalDailyScoreS !== null) {
    scoreSSum += d.finalDailyScoreS;
    validScoreDaysCount += 1;
  }
}
const averageFinalScoreS = Math.round(scoreSSum / validScoreDaysCount);`}
              inputsText={`امتیاز نهایی ۷ روز هفته نمونه: ${periodSummary.dailyEvaluations
                .map(
                  (d) =>
                    `${d.weekdayName} (${toPersianDigits(d.jalaliCompact.slice(5))}): ${toPersianDigits(
                      d.finalDailyScoreS ?? 0
                    )}٪`
                )
                .join(' ، ')}`}
              steps={[
                `گام اول (جمع امتیاز نهایی هر ۷ روز معتبر هفته): ${periodSummary.dailyEvaluations
                  .map((d) => toPersianDigits(d.finalDailyScoreS ?? 0))
                  .join(' + ')} = ${toPersianDigits(
                  periodSummary.dailyEvaluations.reduce(
                    (s, d) => s + (d.finalDailyScoreS ?? 0),
                    0
                  )
                )}`,
                `گام دوم (تقسیم بر تعداد روزهای معتبر = ${toPersianDigits(
                  periodSummary.validScoreDaysCount
                )} روز): ${toPersianDigits(
                  periodSummary.dailyEvaluations.reduce(
                    (s, d) => s + (d.finalDailyScoreS ?? 0),
                    0
                  )
                )} ÷ ${toPersianDigits(periodSummary.validScoreDaysCount)} = ${toPersianDigits(
                  Math.round(
                    (periodSummary.dailyEvaluations.reduce(
                      (s, d) => s + (d.finalDailyScoreS ?? 0),
                      0
                    ) /
                      Math.max(1, periodSummary.validScoreDaysCount)) *
                      100
                  ) / 100
                )}`,
                `گام سوم (گرد کردن به عدد صحیح): ${toPersianDigits(
                  periodSummary.averageFinalScoreS ?? 0
                )}٪ (بهترین روز: ${periodSummary.bestScoreDay?.weekdayName} با ${toPersianDigits(
                  periodSummary.bestScoreDay?.finalDailyScoreS ?? 0
                )}٪ | ضعیف‌ترین روز: ${periodSummary.weakestScoreDay?.weekdayName} با ${toPersianDigits(
                  periodSummary.weakestScoreDay?.finalDailyScoreS ?? 0
                )}٪)`,
              ]}
              finalResult={`امتیاز عملکرد کلی هفته = ${toPersianDigits(
                periodSummary.averageFinalScoreS ?? 0
              )}٪ (میانگین E هفته = ${toPersianDigits(
                periodAverageE
              )}٪ | میانگین C هفته = ${toPersianDigits(
                periodSummary.averageRestrictedControlIndexC ?? 0
              )}٪)`}
              interpretation="با وجود افت روز سه‌شنبه (۳۳٪)، عملکرد بسیار قوی در ۶ روز دیگر باعث شده میانگین کل هفته در سطح بسیار خوب (۸۵٪) قرار بگیرد."
              tone="purple"
            />

            {/* 3.2 Period True Weighted Learning Quality */}
            <MetricBreakdownBlock
              badgeNumber="۳-۲"
              title="میانگین وزنی واقعی کیفیت یادگیری در کل دوره یک‌هفته‌ای"
              symbol="PeriodQ_w = round((Σ(dayWeightedNumerator) / Σ(dayEvaluatedMinutes)) * 10) / 10"
              concept="کیفیت یادگیری کل هفته میانگین ساده ۷ روز نیست؛ بلکه مجموع کل حاصل‌ضرب‌های (کیفیت × زمان واقعی) تمام جلسات مطالعه هفته تقسیم بر کل زمان مطالعه ارزیابی‌شده هفته است."
              formulaCode={`// analyticsEngine.ts -> evaluatePeriodPerformance
qualityWeightedNum += d.learningQualityWeightedNumerator;
qualityEvalMins += d.learningQualityEvaluatedMinutes;
const weightedLearningQuality0To10 = Math.round((qualityWeightedNum / qualityEvalMins) * 10) / 10;`}
              inputsText={`مجموع صورت وزنی هفته Σ(q×t): ${periodSummary.dailyEvaluations
                .map((d) => toPersianDigits(d.learningQualityWeightedNumerator))
                .join(' + ')} = ${toPersianDigits(
                periodSummary.dailyEvaluations.reduce(
                  (s, d) => s + d.learningQualityWeightedNumerator,
                  0
                )
              )} | مجموع دقایق مطالعه ارزیابی‌شده هفته: ${toPersianDigits(
                periodSummary.dailyEvaluations.reduce(
                  (s, d) => s + d.learningQualityEvaluatedMinutes,
                  0
                )
              )} دقیقه`}
              steps={[
                `گام اول (جمع صورت وزنی تمام ۷ روز): ${toPersianDigits(
                  periodSummary.dailyEvaluations.reduce(
                    (s, d) => s + d.learningQualityWeightedNumerator,
                    0
                  )
                )}`,
                `گام دوم (جمع دقایق مطالعه ارزیابی‌شده تمام ۷ روز): ${toPersianDigits(
                  periodSummary.dailyEvaluations.reduce(
                    (s, d) => s + d.learningQualityEvaluatedMinutes,
                    0
                  )
                )} دقیقه`,
                `گام سوم (تقسیم و گرد کردن به یک رقم اعشار): ${toPersianDigits(
                  periodSummary.dailyEvaluations.reduce(
                    (s, d) => s + d.learningQualityWeightedNumerator,
                    0
                  )
                )} ÷ ${toPersianDigits(
                  periodSummary.dailyEvaluations.reduce(
                    (s, d) => s + d.learningQualityEvaluatedMinutes,
                    0
                  )
                )} = ${toPersianDigits(periodSummary.weightedLearningQuality0To10 ?? 0)} از ۱۰`,
              ]}
              finalResult={`میانگین وزنی کیفیت هفته = ${toPersianDigits(
                periodSummary.weightedLearningQuality0To10 ?? 0
              )} از ۱۰`}
              interpretation="چون در روز سه‌شنبه فقط ۲۵ دقیقه با کیفیت ۵.۵ مطالعه شده، اثر منفی آن بر میانگین وزنی کل هفته (۱,۱۹۵ دقیقه) بسیار محدود و منصفانه بوده است."
              tone="emerald"
            />

            {/* 3.3 Period Time Budget Share */}
            <MetricBreakdownBlock
              badgeNumber="۳-۳"
              title="سهم واقعی مطالعه از کل ظرف زمانی هفته (Period Budget Allocation)"
              symbol="PeriodStudySharePct = round((totalStudyMinutesOnBudgetedDays / totalBudgetMinutesOnValidDays) * 1000) / 10"
              concept="نسبت کل زمان مطالعه واقعی در طول هفته به مجموع ظرف‌های زمانی تعریف‌شده در تمام روزهای هفته."
              formulaCode={`// analyticsEngine.ts -> evaluatePeriodPerformance (Section 10.8)
const studyShareOfBudgetPct = Math.round((totalStudyMinutesOnBudgetedDays / totalBudgetMinutesOnValidDays) * 1000) / 10;`}
              inputsText={`مجموع ظرف زمانی ۷ روز هفته: ${periodSummary.dailyEvaluations
                .map((d) => toPersianDigits(d.budgetMinutes ?? 0))
                .join(' + ')} = ${toPersianDigits(
                periodSummary.totalBudgetMinutesOnValidDays
              )} دقیقه | مطالعه کل: ${toPersianDigits(
                periodSummary.totalStudyMinutesOnBudgetedDays
              )} دقیقه | سرگرمی کل: ${toPersianDigits(
                periodSummary.totalRestrictedMinutesOnBudgetedDays
              )} دقیقه | ضروری کل: ${toPersianDigits(
                periodSummary.totalEssentialMinutesOnBudgetedDays
              )} دقیقه`}
              steps={[
                `گام اول (مجموع ظرف زمانی ۷ روز): ${toPersianDigits(
                  periodSummary.totalBudgetMinutesOnValidDays
                )} دقیقه (${formatDurationPrimePersian(
                  periodSummary.totalBudgetMinutesOnValidDays
                )})`,
                `گام دوم (سهم مطالعه درسی از ظرف هفته): (${toPersianDigits(
                  periodSummary.totalStudyMinutesOnBudgetedDays
                )} ÷ ${toPersianDigits(periodSummary.totalBudgetMinutesOnValidDays)}) × ۱۰۰ = ${toPersianDigits(
                  periodSummary.studyShareOfBudgetPct ?? 0
                )}٪`,
                `گام سوم (سهم سرگرمی از ظرف هفته): (${toPersianDigits(
                  periodSummary.totalRestrictedMinutesOnBudgetedDays
                )} ÷ ${toPersianDigits(periodSummary.totalBudgetMinutesOnValidDays)}) × ۱۰۰ = ${toPersianDigits(
                  Math.round(
                    (periodSummary.totalRestrictedMinutesOnBudgetedDays /
                      Math.max(1, periodSummary.totalBudgetMinutesOnValidDays)) *
                      1000
                  ) / 10
                )}٪`,
                `گام چهارم (سهم فعالیت‌های ضروری از ظرف هفته): (${toPersianDigits(
                  periodSummary.totalEssentialMinutesOnBudgetedDays
                )} ÷ ${toPersianDigits(periodSummary.totalBudgetMinutesOnValidDays)}) × ۱۰۰ = ${toPersianDigits(
                  Math.round(
                    (periodSummary.totalEssentialMinutesOnBudgetedDays /
                      Math.max(1, periodSummary.totalBudgetMinutesOnValidDays)) *
                      1000
                  ) / 10
                )}٪`,
              ]}
              finalResult={`سهم مطالعه از ظرف کل هفته = ${toPersianDigits(
                periodSummary.studyShareOfBudgetPct ?? 0
              )}٪ (${formatDurationPrimePersian(
                periodSummary.totalStudyMinutes
              )} از ${formatDurationPrimePersian(periodSummary.totalBudgetMinutesOnValidDays)})`}
              interpretation="بیش از یک‌سوم کل زمان در دسترس هفته به مطالعه خالص اختصاص یافته است."
              tone="cyan"
            />
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 4: XP & LEVEL CALCULATIONS (بخش چهارم: محاسبات XP و Level)
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'sec4') && (
        <section className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  بخش چهارم: محاسبات XP روزانه، جریمه عدم فعالیت (-XP) و سیستم سطح‌بندی ۳۹ پله‌ای
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  جدول ریز منابع ۵گانه کسب XP و جریمه در هر روز هفته + مراحل دقیق تعیین سطح کل (Global Level)
                </p>
              </div>
            </div>
          </div>

          {/* 7-Day XP Ledger Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/70 dark:border-amber-800/50">
              <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                جدول ترازنامه روزبه‌روز XP در هفته نمونه (۱۶ تا ۲۲ آبان ۱۴۰۵)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 font-black">روز و تاریخ</th>
                    <th className="py-2.5 px-2 font-black">XP تکمیل (×۵)</th>
                    <th className="py-2.5 px-2 font-black">XP ناقص (×۲.۵)</th>
                    <th className="py-2.5 px-2 font-black">XP زمان مطالعه (÷۵۰)</th>
                    <th className="py-2.5 px-2 font-black">XP تست (×۰.۲)</th>
                    <th className="py-2.5 px-2 font-black">XP کیفیت (×۰.۲)</th>
                    <th className="py-2.5 px-2.5 font-black text-emerald-700 dark:text-emerald-400">
                      پاداش روز (+XP)
                    </th>
                    <th className="py-2.5 px-2.5 font-black text-rose-700 dark:text-rose-400">
                      جریمه وقفه (-XP)
                    </th>
                    <th className="py-2.5 px-2.5 font-black">خالص روز</th>
                    <th className="py-2.5 px-2.5 font-black">XP تجمعی خالص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {(() => {
                    let runningNet = 0;
                    return weeklyComputation.dateIsoList.map((dateIso) => {
                      const dPlans = weeklyComputation.activeWeekPlans.filter(
                        (p) => p.plan_date === dateIso
                      );
                      const xp = calculateXpFromPlans(dPlans);
                      const pen = xpLedger.dailyPenalties.find((p) => p.dateIso === dateIso);
                      const penVal = pen ? pen.deductedXp : 0;
                      const netDay = Math.round((xp.totalXp - penVal) * 100) / 100;
                      runningNet = Math.round((runningNet + netDay) * 100) / 100;

                      return (
                        <tr
                          key={dateIso}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-2.5 px-3 font-black whitespace-nowrap">
                            {getPersianWeekdayName(dateIso)} ({toPersianDigits(formatJalaliCompact(dateIso))})
                          </td>
                          <td className="py-2.5 px-2">
                            {toPersianDigits(xp.completedActivitiesXp)} ({toPersianDigits(xp.completedCount)}×۵)
                          </td>
                          <td className="py-2.5 px-2">
                            {toPersianDigits(xp.partialActivitiesXp)} ({toPersianDigits(xp.partialCount)}×۲.۵)
                          </td>
                          <td className="py-2.5 px-2">
                            {toPersianDigits(xp.studyMinutesXp)} ({toPersianDigits(xp.actualStudyMinutes)}÷۵۰)
                          </td>
                          <td className="py-2.5 px-2">
                            {toPersianDigits(xp.exercisesXp)} ({toPersianDigits(xp.exercisesCount)}×۰.۲)
                          </td>
                          <td className="py-2.5 px-2">{toPersianDigits(xp.qualityBonusXp)}</td>
                          <td className="py-2.5 px-2.5 font-black text-emerald-600 dark:text-emerald-400">
                            +{toPersianDigits(xp.totalXp)}
                          </td>
                          <td className="py-2.5 px-2.5 font-black text-rose-600 dark:text-rose-400">
                            {penVal > 0 ? `-${toPersianDigits(penVal)}` : '۰'}
                          </td>
                          <td className="py-2.5 px-2.5 font-black">
                            {netDay >= 0 ? `+${toPersianDigits(netDay)}` : toPersianDigits(netDay)}
                          </td>
                          <td className="py-2.5 px-2.5 font-black text-indigo-700 dark:text-indigo-300">
                            {toPersianDigits(runningNet)} XP
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 4.1 Positive XP Formula Breakdown */}
            <MetricBreakdownBlock
              badgeNumber="۴-۱"
              title="فرمول ۵ منبع کسب XP مثبت (Gross XP) در کل هفته نمونه"
              symbol="TotalPositiveXP = CompletedXP + PartialXP + StudyTimeXP + ExercisesXP + QualityBonusXP"
              concept="در مقیاس استاندارد ۱/۱۰ برنامه، هر فعالیت تکمیل‌شده ۵ امتیاز، هر فعالیت ناقص ۲.۵ امتیاز، هر ۵۰ دقیقه مطالعه واقعی ۱ امتیاز (۰.۰۲ به ازای هر دقیقه)، هر تست حل‌شده ۰.۲ امتیاز و کیفیت هر جلسه مطالعه (کیفیت × ۰.۲) امتیاز پاداش تولید می‌کند."
              formulaCode={`// analyticsEngine.ts -> calculateXpFromPlans
completedActivitiesXp = roundXp2(completedCount * 5);
partialActivitiesXp   = roundXp2(partialCount * 2.5);
studyMinutesXp        = roundXp2(actualStudyMinutes / 50);
exercisesXp           = roundXp2(exercisesCount * 0.2);
qualityBonusXp        = roundXp2(Σ(quality_i * 0.2));
totalXp               = roundXp2(completedActivitiesXp + partialActivitiesXp + studyMinutesXp + exercisesXp + qualityBonusXp);`}
              inputsText={`در کل ۷ روز هفته نمونه: ${toPersianDigits(
                overallXpBreakdown.completedCount
              )} فعالیت تکمیل‌شده | ${toPersianDigits(
                overallXpBreakdown.partialCount
              )} فعالیت ناقص | ${toPersianDigits(
                overallXpBreakdown.actualStudyMinutes
              )} دقیقه مطالعه واقعی | ${toPersianDigits(
                overallXpBreakdown.exercisesCount
              )} تست حل‌شده | ${toPersianDigits(
                overallXpBreakdown.qualityEvaluatedCount
              )} جلسه مطالعه دارای نمره کیفیت`}
              steps={[
                `۱. پاداش تکمیل فعالیت‌ها: ${toPersianDigits(
                  overallXpBreakdown.completedCount
                )} × ۵ = +${toPersianDigits(overallXpBreakdown.completedActivitiesXp)} XP`,
                `۲. پاداش فعالیت‌های ناقص: ${toPersianDigits(
                  overallXpBreakdown.partialCount
                )} × ۲.۵ = +${toPersianDigits(overallXpBreakdown.partialActivitiesXp)} XP`,
                `۳. پاداش زمان مطالعه واقعی: ${toPersianDigits(
                  overallXpBreakdown.actualStudyMinutes
                )} ÷ ۵۰ = +${toPersianDigits(overallXpBreakdown.studyMinutesXp)} XP`,
                `۴. پاداش حل تست و تمرین: ${toPersianDigits(
                  overallXpBreakdown.exercisesCount
                )} × ۰.۲ = +${toPersianDigits(overallXpBreakdown.exercisesXp)} XP`,
                `۵. پاداش کیفیت یادگیری جلسات: Σ(q_i × ۰.۲) در ${toPersianDigits(
                  overallXpBreakdown.qualityEvaluatedCount
                )} جلسه = +${toPersianDigits(overallXpBreakdown.qualityBonusXp)} XP`,
                `جمع کل XP ناخالص کسب‌شده در هفته (Gross XP): ${toPersianDigits(
                  overallXpBreakdown.completedActivitiesXp
                )} + ${toPersianDigits(overallXpBreakdown.partialActivitiesXp)} + ${toPersianDigits(
                  overallXpBreakdown.studyMinutesXp
                )} + ${toPersianDigits(overallXpBreakdown.exercisesXp)} + ${toPersianDigits(
                  overallXpBreakdown.qualityBonusXp
                )} = +${toPersianDigits(xpLedger.grossTotalXp)} XP`,
              ]}
              finalResult={`Gross Total XP = +${toPersianDigits(xpLedger.grossTotalXp)} XP`}
              interpretation="هر ۵ منبع کسب XP به‌صورت شفاف و با دقت دو رقم اعشار محاسبه و تجمیع شده‌اند."
              tone="amber"
            />

            {/* 4.2 Inactivity Penalty (-XP) Breakdown on Tuesday 19 Aban */}
            <MetricBreakdownBlock
              badgeNumber="۴-۲"
              title="فرمول جریمه عدم فعالیت مؤثر (-XP) در روز سه‌شنبه ۱۹ آبان ۱۴۰۵"
              symbol="PenaltyXP = roundXp2(B × r_d × M_d) , where FulfillmentRatio < 0.50"
              concept="اگر در یک روز گذشته که دارای تعهد درسی است، نرخ تحقق کل برنامه درسی کمتر از ۵۰٪ باشد و حداقل ۳۰ دقیقه مطالعه باکیفیت نیز ثبت نشده باشد، جریمه عدم فعالیت متناسب با درصد انجام‌نشده (M_d) و ضریب روزهای متوالی وقفه (r_d) کسر می‌شود."
              formulaCode={`// analyticsEngine.ts -> evaluateGlobalXpLedger
const timeFulfillment = Math.min(1, actualStudyMins / plannedStudyMins);
const taskFulfillment = (completedStudyCount + partialStudyCount * 0.5) / studyPlans.length;
const fulfillmentRatio = roundXp2(0.6 * timeFulfillment + 0.4 * taskFulfillment);
const basePenaltyB = roundXp2(Math.max(1.0, Math.min(10.0, avgActiveDailyXp * 0.1)));
const multiplierR = getGlobalInactivityMultiplierR(consecutiveInactiveDays); // Day 1 -> 1.0
const unfulfilledRatioM = roundXp2(1 - fulfillmentRatio);
const rawPenaltyXp = roundXp2(basePenaltyB * multiplierR * unfulfilledRatioM);`}
              inputsText={
                xpLedger.dailyPenalties.length > 0
                  ? `روز مشمول جریمه: سه‌شنبه ${toPersianDigits(
                      xpLedger.dailyPenalties[0].jalaliDate
                    )} | مطالعه واقعی: ۲۵ دقیقه از ۱۸۰ دقیقه پیش‌بینی | وضعیت ۳ درس: ۰ کامل، ۱ ناقص، ۲ انجام‌نشده`
                  : 'بدون جریمه'
              }
              steps={
                xpLedger.dailyPenalties.length > 0
                  ? (() => {
                      const pen = xpLedger.dailyPenalties[0];
                      return [
                        `گام اول (محاسبه نرخ تحقق روز سه‌شنبه ۱۹ آبان): تحقق زمانی = ۲۵ ÷ ۱۸۰ = ۰.۱۳۸۹ | تحقق تسک‌ها = (۰ + ۱×۰.۵) ÷ ۳ = ۰.۱۶۶۷`,
                        `گام دوم (نرخ تحقق ترکیبی FulfillmentRatio): roundXp2((۰.۶ × ۰.۱۳۸۹) + (۰.۴ × ۰.۱۶۶۷)) = ${toPersianDigits(
                          pen.fulfillmentRatio
                        )} (یعنی ${toPersianDigits(
                          Math.round(pen.fulfillmentRatio * 100)
                        )}٪ که کمتر از آستانه ۵۰٪ است و مطالعه واقعی هم کمتر از ۳۰ دقیقه است)`,
                        `گام سوم (نسبت انجام‌نشده برنامه M_d): 1 - ${toPersianDigits(
                          pen.fulfillmentRatio
                        )} = ${toPersianDigits(pen.unfulfilledRatioM)}`,
                        `گام چهارم (پایه جریمه B برابر ۱۰٪ میانگین XP روزهای فعال قبلی): B = ${toPersianDigits(
                          pen.basePenaltyB
                        )} | ضریب روز اول وقفه r_1 = ${toPersianDigits(pen.multiplierR)}`,
                        `گام پنجم (محاسبه جریمه کسرشده): ${toPersianDigits(
                          pen.basePenaltyB
                        )} × ${toPersianDigits(pen.multiplierR)} × ${toPersianDigits(
                          pen.unfulfilledRatioM
                        )} = -${toPersianDigits(pen.deductedXp)} XP`,
                      ];
                    })()
                  : ['هیچ روز جریمه‌ای یافت نشد.']
              }
              finalResult={`مجموع جریمه کسرشده هفته = -${toPersianDigits(
                xpLedger.totalPenaltyXp
              )} XP | XP خالص نهایی (Net Total XP) = ${toPersianDigits(
                xpLedger.grossTotalXp
              )} - ${toPersianDigits(xpLedger.totalPenaltyXp)} = ${toPersianDigits(
                xpLedger.netTotalXp
              )} XP`}
              interpretation="ثبت ۲۵ دقیقه مطالعه ناقص در روز سه‌شنبه باعث شد ۱۵٪ از برنامه محقق شود و جریمه به جای ۱۰۰٪ فقط روی ۸۵٪ انجام‌نشده (M_d = 0.85) اعمال گردد."
              tone="rose"
            />

            {/* 4.3 39-Stage Global Level Resolution */}
            <MetricBreakdownBlock
              badgeNumber="۴-۳"
              title="تعیین سطح کل (Global Level) و درصد پیشرفت در جدول ۳۹ پله‌ای"
              symbol="ProgressPct = round(((allTimeXp - currentStageMinXp) / (nextStageMinXp - currentStageMinXp)) * 100)"
              concept="سیستم ارتقای کلی دارای ۱۳ سطح اصلی و ۳ پله در هر سطح (مجموعاً ۳۹ پله از Stone تا Black Diamond Star) است. جایگاه دانش‌آموز بر اساس XP خالص تجمعی در آستانه‌های جدول GLOBAL_STAGE_THRESHOLDS تعیین می‌شود."
              formulaCode={`// analyticsEngine.ts -> GLOBAL_STAGE_THRESHOLDS & resolve39StageProgress
// [0, 20, 45, 80, 125, 180, 250, 335, ...]
const xpInCurrentLevel = roundXp2(allTimeXp - currentLevelStartXp);
const xpRequiredForCurrentStep = roundXp2(nextLevelTargetXp - currentLevelStartXp);
const progressPercentage = Math.round((xpInCurrentLevel / xpRequiredForCurrentStep) * 100);`}
              inputsText={`XP خالص تجمعی پایان هفته: ${toPersianDigits(
                levelProgress.allTimeXp
              )} XP | آستانه‌های اطراف در جدول GLOBAL_STAGE_THRESHOLDS: پله ۶ (Iron Star = ۱۸۰ XP) و پله ۷ (Bronze = ۲۵۰ XP)`}
              steps={[
                `گام اول (مقایسه ${toPersianDigits(
                  levelProgress.allTimeXp
                )} XP با جدول آستانه‌ها): چون ${toPersianDigits(
                  levelProgress.currentLevelStartXp
                )} ≤ ${toPersianDigits(levelProgress.allTimeXp)} < ${toPersianDigits(
                  levelProgress.nextLevelTargetXp
                )} است، دانش‌آموز در پله ${toPersianDigits(
                  levelProgress.stageNumber
                )} از ۳۹ (${levelProgress.stageNameFa} — سطح ${toPersianDigits(
                  levelProgress.level
                )}، ${levelProgress.stepLabelFa}) قرار می‌گیرد.`,
                `گام دوم (XP کسب‌شده در پله فعلی): ${toPersianDigits(
                  levelProgress.allTimeXp
                )} - ${toPersianDigits(levelProgress.currentLevelStartXp)} = ${toPersianDigits(
                  levelProgress.xpInCurrentLevel
                )} XP`,
                `گام سوم (ظرفیت کل پله فعلی تا پله بعدی): ${toPersianDigits(
                  levelProgress.nextLevelTargetXp
                )} - ${toPersianDigits(levelProgress.currentLevelStartXp)} = ${toPersianDigits(
                  levelProgress.xpRequiredForCurrentStep
                )} XP`,
                `گام چهارم (درصد پیشرفت در پله فعلی): round((${toPersianDigits(
                  levelProgress.xpInCurrentLevel
                )} ÷ ${toPersianDigits(levelProgress.xpRequiredForCurrentStep)}) × ۱۰۰) = ${toPersianDigits(
                  levelProgress.progressPercentage
                )}٪ (XP باقی‌مانده تا پله بعدی «${levelProgress.nextStageNameFa}»: ${toPersianDigits(
                  levelProgress.xpRemainingToNextLevel
                )} XP)`,
              ]}
              finalResult={`سطح فعلی: ${levelProgress.stageNameFa} (${
                levelProgress.stageNameEn
              }) — پله ${toPersianDigits(levelProgress.stageNumber)} از ۳۹ (${toPersianDigits(
                levelProgress.progressPercentage
              )}٪ تکمیل پله)`}
              interpretation="در طول تنها یک هفته نمونه، دانش‌آموز از پله ۱ (سنگ) به پله ۶ (آهن استار) صعود کرده است."
              tone="indigo"
            />
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 5: OTHER METRICS & CALCULATIONS (بخش پنجم: سایر شاخص‌ها و محاسبات)
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'sec5') && (
        <section className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-cyan-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  بخش پنجم: سایر شاخص‌ها و محاسبات مکمل (شتاب XP، هم‌راستایی و حفاظت از پیش‌بینی اولیه)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  کالبدشکافی نرخ کسب XP هفتگی، تخمین زمان صعود به پله بعد، هم‌راستایی XP با رشد آموزشی و منطق حفاظت از زمان پیش‌بینی اولیه
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 5.1 7-Day XP Velocity & Estimated Days to Next Stage */}
            <MetricBreakdownBlock
              badgeNumber="۵-۱"
              title="نرخ روزانه کسب XP (XP Velocity) و تخمین روزهای باقی‌مانده تا پله بعدی"
              symbol="DailyRate7dCalendar = roundXp2(net7dTotal / 7) , EstDays = ceil(xpRemainingToNextLevel / DailyRate7dCalendar)"
              concept="سرعت واقعی پیشروی دانش‌آموز را بر اساس XP خالص ۷ روز اخیر می‌سنجد و مشخص می‌کند با حفظ همین ضرباهنگ، چند روز طول می‌کشد تا به پله بعدی صعود کند."
              formulaCode={`// analyticsEngine.ts -> analyzeXpVelocityAndProgress
const dailyRate7dCalendar = roundXp2(Math.max(0, net7dTotal) / 7);
const dailyRate7dEffective = activeDays7d > 0 ? roundXp2(Math.max(0, net7dTotal) / activeDays7d) : 0;
const estimatedDaysToNextLevel = Math.max(1, Math.ceil(levelProgress.xpRemainingToNextLevel / dailyRate7dCalendar));`}
              inputsText={`XP خالص ۷ روز هفته نمونه (net7dTotal): ${toPersianDigits(
                velocityAnalysis.net7dTotal
              )} XP | تعداد روزهای فعال مؤثر در هفته: ${toPersianDigits(
                velocityAnalysis.activeDays7d
              )} روز از ۷ روز | XP باقی‌مانده تا پله ۷ (برنز): ${toPersianDigits(
                levelProgress.xpRemainingToNextLevel
              )} XP`}
              steps={[
                `گام اول (نرخ روزانه تقویمی در ۷ روز): ${toPersianDigits(
                  velocityAnalysis.net7dTotal
                )} ÷ ۷ = ${toPersianDigits(velocityAnalysis.dailyRate7dCalendar)} XP در روز`,
                `گام دوم (نرخ روزانه در روزهای فعال مؤثر): ${toPersianDigits(
                  velocityAnalysis.net7dTotal
                )} ÷ ${toPersianDigits(velocityAnalysis.activeDays7d)} = ${toPersianDigits(
                  velocityAnalysis.dailyRate7dEffective
                )} XP در هر روز فعال`,
                `گام سوم (تخمین روزهای باقی‌مانده تا پله بعدی «${
                  levelProgress.nextStageNameFa
                }»): ceil(${toPersianDigits(
                  levelProgress.xpRemainingToNextLevel
                )} ÷ ${toPersianDigits(velocityAnalysis.dailyRate7dCalendar)}) = ${toPersianDigits(
                  velocityAnalysis.estimatedDaysToNextLevel ?? 1
                )} روز`,
              ]}
              finalResult={`نرخ تقویمی: ${toPersianDigits(
                velocityAnalysis.dailyRate7dCalendar
              )} XP/روز | نرخ روز فعال: ${toPersianDigits(
                velocityAnalysis.dailyRate7dEffective
              )} XP/روز | زمان تخمینی تا پله بعد: ${toPersianDigits(
                velocityAnalysis.estimatedDaysToNextLevel ?? 1
              )} روز`}
              interpretation={velocityAnalysis.estimatedNextLevelTextPersian}
              tone="cyan"
            />

            {/* 5.2 Educational Alignment & Initial Predicted Time Protection */}
            <MetricBreakdownBlock
              badgeNumber="۵-۲"
              title="شاخص هم‌راستایی XP با رشد آموزشی واقعی و حفاظت از زمان پیش‌بینی اولیه (initial_predicted_minutes)"
              symbol="TargetStudyMinutes = Σ(initial_predicted_minutes) , Alignment = f(net7dTotal, avgEducationalScore7d, avgLearningQuality7d)"
              concept="برنامه از دو مکانیسم ضدتقلب استفاده می‌کند: ۱) اگر کاربر بعد از ثبت اولیه کارت، زمان پیش‌بینی (predicted_minutes) را تغییر دهد، در تمام فرمول‌های تحقق زمان (T) و پایبندی، مقدار اولیه (initial_predicted_minutes) ملاک باقی می‌ماند؛ ۲) هم‌راستایی XP با امتیاز آموزشی (E) و کیفیت (L) بررسی می‌شود تا XP صوری بدون کیفیت شناسایی شود."
              formulaCode={`// 1. Initial Predicted Minutes Protection (analyticsEngine.ts line 772)
const predictedStudyMinutes = educationalPlans.reduce(
  (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)), 0
);
// 2. Educational Alignment Check
if (avgEducationalScore7d >= 70 && (avgLearningQuality7d ?? 7) >= 6.5) -> 'synergistic_growth'`}
              inputsText={`نمونه حفاظت از پیش‌بینی اولیه در روز یکشنبه ۱۷ آبان (درس ریاضی): initial_predicted_minutes = ۷۵ دقیقه، predicted_minutes ویرایش‌شده = ۹۰ دقیقه، زمان واقعی = ۷۵ دقیقه | میانگین E هفته = ${toPersianDigits(
                velocityAnalysis.avgEducationalScore7d ?? 0
              )}٪ | میانگین کیفیت هفته = ${toPersianDigits(
                velocityAnalysis.avgLearningQuality7d ?? 0
              )} از ۱۰`}
              steps={[
                `بررسی کارت ریاضی یکشنبه ۱۷ آبان: با اینکه predicted_minutes به ۹۰ دقیقه تغییر یافته، در محاسبه هدف مطالعه روز یکشنبه عدد initial_predicted_minutes = ۷۵ دقیقه ملاک قرار گرفته است (۷۵ + ۶۰ + ۴۵ + ۴۵ = ۲۲۵ دقیقه).`,
                `بررسی هم‌راستایی XP و کیفیت آموزشی در پایان هفته: میانگین امتیاز آموزشی ۷ روز اخیر برابر ${toPersianDigits(
                  velocityAnalysis.avgEducationalScore7d ?? 0
                )}٪ (≥ ۷۰٪) و میانگین کیفیت یادگیری برابر ${toPersianDigits(
                  velocityAnalysis.avgLearningQuality7d ?? 0
                )} از ۱۰ (≥ ۶.۵) است.`,
                `نتیجه تشخیص موتور هم‌راستایی: وضعیت «${velocityAnalysis.alignmentTitlePersian}» ثبت می‌شود.`,
              ]}
              finalResult={`وضعیت هم‌راستایی: ${velocityAnalysis.alignmentTitlePersian} | روند کلی هفته: ${velocityAnalysis.trendLabelPersian}`}
              interpretation={velocityAnalysis.alignmentDescriptionPersian}
              tone="emerald"
            />
          </div>
        </section>
      )}
    </div>
  );
};
