import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  BookOpen,
  FileCheck2,
  Lightbulb,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import type { DailyPlanItem, DailyStudyGoalConfig } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  toPersianDigits,
  formatMinutesPersian,
  formatJalaliCompact,
} from '../utils/jalali.ts';
import { parseLearningQuality0To10 } from '../utils/analyticsEngine.ts';

type AdvisoryTimeframe = 'weekly' | 'daily' | 'semi_weekly' | 'monthly';

interface AdvisoryInsightItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
}

interface TimeframeAdvisoryBundle {
  hasData: boolean;
  emptyMessage: string;
  headlineBadge: string;
  executiveSummary: string;
  strengths: AdvisoryInsightItem[];
  improvements: AdvisoryInsightItem[];
  nextSteps: AdvisoryInsightItem[];
}

function buildTimeframeAdvisory(
  rangePlans: DailyPlanItem[],
  daysCount: number,
  timeframeLabel: string
): TimeframeAdvisoryBundle {
  const studyPlans = rangePlans.filter((p) => Number(p.is_study) === 1);
  const totalPredMins = studyPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );
  const totalActualMins = studyPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.actual_minutes || 0)),
    0
  );
  const totalTargetTests = studyPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.target_exercises || 0)),
    0
  );
  const totalActualTests = studyPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.exercises_count || 0)),
    0
  );
  const completedCount = rangePlans.filter((p) => p.status === 'completed').length;
  const partialCount = rangePlans.filter((p) => p.status === 'partial').length;
  const pendingCount = rangePlans.filter((p) => p.status === 'pending').length;

  if (rangePlans.length === 0 || (totalPredMins === 0 && totalActualMins === 0)) {
    return {
      hasData: false,
      emptyMessage: `در بازه «${timeframeLabel}» هنوز فعالیت مطالعه‌ای ثبت نشده است. با ثبت برنامه‌ها و گزارش عملکرد، تحلیل هوشمند و توصیه‌های اختصاصی این سطح زمانی فعال می‌شود.`,
      headlineBadge: 'آماده ثبت داده',
      executiveSummary: `برای بازه «${timeframeLabel}» هنوز اطلاعاتی ثبت نشده است؛ از بخش برنامه‌ریزی فعالیت‌های خود را وارد کنید.`,
      strengths: [],
      improvements: [],
      nextSteps: [],
    };
  }

  const timeAchievementPct =
    totalPredMins > 0 ? Math.round((totalActualMins / totalPredMins) * 100) : 0;
  const taskAdherencePct =
    rangePlans.length > 0
      ? Math.round(((completedCount + partialCount * 0.5) / rangePlans.length) * 100)
      : 0;
  const testAchievementPct =
    totalTargetTests > 0 ? Math.round((totalActualTests / totalTargetTests) * 100) : null;

  // Weighted learning quality
  let weightedQSum = 0;
  let weightedQMins = 0;
  for (const p of studyPlans) {
    const mins = Math.max(0, Number(p.performance?.actual_minutes || 0));
    const q = parseLearningQuality0To10(p.performance?.learning_quality);
    if (mins > 0 && q !== null) {
      weightedQSum += mins * q;
      weightedQMins += mins;
    }
  }
  const avgQuality =
    weightedQMins > 0 ? Math.round((weightedQSum / weightedQMins) * 10) / 10 : null;

  // Per-subject breakdown
  const subjectStatsMap = new Map<
    string,
    {
      name: string;
      pred: number;
      actual: number;
      tests: number;
      targetTests: number;
      qWeightedSum: number;
      qMins: number;
      completed: number;
      total: number;
    }
  >();

  for (const p of studyPlans) {
    const name = p.subject_name_snapshot || 'درس عمومی';
    const cur = subjectStatsMap.get(name) || {
      name,
      pred: 0,
      actual: 0,
      tests: 0,
      targetTests: 0,
      qWeightedSum: 0,
      qMins: 0,
      completed: 0,
      total: 0,
    };
    const pred = Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0));
    const act = Math.max(0, Number(p.performance?.actual_minutes || 0));
    const q = parseLearningQuality0To10(p.performance?.learning_quality);
    cur.pred += pred;
    cur.actual += act;
    cur.tests += Math.max(0, Number(p.performance?.exercises_count || 0));
    cur.targetTests += Math.max(0, Number(p.target_exercises || 0));
    if (act > 0 && q !== null) {
      cur.qWeightedSum += act * q;
      cur.qMins += act;
    }
    cur.total += 1;
    if (p.status === 'completed') cur.completed += 1;
    subjectStatsMap.set(name, cur);
  }

  const subjectsList = Array.from(subjectStatsMap.values()).map((s) => ({
    ...s,
    ratioPct: s.pred > 0 ? Math.round((s.actual / s.pred) * 100) : 0,
    shortfall: Math.max(0, s.pred - s.actual),
    avgQ: s.qMins > 0 ? Math.round((s.qWeightedSum / s.qMins) * 10) / 10 : null,
  }));

  // Per-day breakdown for drop detection & continuity
  const dayMap = new Map<string, { pred: number; actual: number; tests: number }>();
  for (const p of studyPlans) {
    const d = dayMap.get(p.plan_date) || { pred: 0, actual: 0, tests: 0 };
    d.pred += Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0));
    d.actual += Math.max(0, Number(p.performance?.actual_minutes || 0));
    d.tests += Math.max(0, Number(p.performance?.exercises_count || 0));
    dayMap.set(p.plan_date, d);
  }
  const activeDaysCount = Array.from(dayMap.values()).filter((d) => d.actual > 0).length;
  const droppedDays = Array.from(dayMap.entries()).filter(
    ([, d]) => d.pred > 0 && d.actual / d.pred < 0.5
  );

  const strengths: AdvisoryInsightItem[] = [];
  const improvements: AdvisoryInsightItem[] = [];
  const nextSteps: AdvisoryInsightItem[] = [];

  // 1. Evaluate Strong Subjects
  const strongSubjects = subjectsList
    .filter((s) => s.actual >= 30 && s.ratioPct >= 85 && (s.avgQ === null || s.avgQ >= 7.5))
    .sort((a, b) => b.actual - a.actual);

  if (strongSubjects.length > 0) {
    const topS = strongSubjects[0];
    strengths.push({
      id: 'str-top-subject',
      title: `نقطه قوت شاخص در درس «${topS.name}»`,
      badge: `${toPersianDigits(topS.ratioPct)}٪ تحقق`,
      description: `در بازه «${timeframeLabel}»، درس «${topS.name}» با ${formatMinutesPersian(
        topS.actual
      )} مطالعه واقعی${
        topS.tests > 0 ? ` و حل ${toPersianDigits(topS.tests)} تست/تمرین` : ''
      }${
        topS.avgQ !== null ? ` (کیفیت یادگیری ${toPersianDigits(topS.avgQ)} از ۱۰)` : ''
      } بهترین پایداری را داشته است. حفظ همین الگوی مطالعه برای این درس توصیه می‌شود.`,
    });
  }

  // 2. Evaluate Time & Task Fulfillment Strength
  if (timeAchievementPct >= 85 && taskAdherencePct >= 80) {
    strengths.push({
      id: 'str-high-adherence',
      title: 'تحقق عالی اهداف زمانی و اجرایی برنامه',
      badge: `${toPersianDigits(timeAchievementPct)}٪ تحقق زمان`,
      description: `شما ${toPersianDigits(timeAchievementPct)}٪ از زمان پیش‌بینی‌شده (${formatMinutesPersian(
        totalActualMins
      )} از ${formatMinutesPersian(totalPredMins)}) و ${toPersianDigits(
        taskAdherencePct
      )}٪ از مأموریت‌های تعریف‌شده را با موفقیت به پایان رسانده‌اید که نشان‌دهنده تخمین دقیق و نظم بالاست.`,
    });
  } else if (activeDaysCount >= Math.max(1, Math.ceil(daysCount * 0.7)) && daysCount > 1) {
    strengths.push({
      id: 'str-continuity',
      title: 'پیوستگی و استمرار مناسب روزهای مطالعه',
      badge: `${toPersianDigits(activeDaysCount)} روز فعال`,
      description: `در ${toPersianDigits(activeDaysCount)} روز از این بازه، مطالعه واقعی ثبت شده است. استمرار روزانه مهم‌ترین عامل تثبیت مطالب در حافظه بلندمدت است.`,
    });
  }

  // 3. Evaluate High Quality Learning
  if (avgQuality !== null && avgQuality >= 8) {
    strengths.push({
      id: 'str-quality',
      title: 'تمرکز و کیفیت یادگیری سطح بالا',
      badge: `${toPersianDigits(avgQuality)} از ۱۰`,
      description: `میانگین وزنی کیفیت یادگیری شما ${toPersianDigits(
        avgQuality
      )} از ۱۰ ثبت شده است که نشان می‌دهد ساعات مطالعه با تمرکز بالا و بهره‌وری ذهنی مطلوبی همراه بوده است.`,
    });
  }

  // 4. Identify High Time but Low Quality Subjects (Crucial requirement from Section 5)
  const lowQualityHighTimeSubjects = subjectsList.filter(
    (s) => s.actual >= 40 && s.avgQ !== null && s.avgQ < 6.8
  );
  if (lowQualityHighTimeSubjects.length > 0) {
    const sub = lowQualityHighTimeSubjects[0];
    improvements.push({
      id: 'imp-low-quality-high-time',
      title: `نیاز به بازنگری روش مطالعه در درس «${sub.name}»`,
      badge: `کیفیت ${toPersianDigits(sub.avgQ ?? 0)} از ۱۰`,
      description: `با وجود اختصاص زمان مناسب (${formatMinutesPersian(
        sub.actual
      )}) به درس «${sub.name}»، کیفیت یادگیری ثبت‌شده (${toPersianDigits(
        sub.avgQ ?? 0
      )} از ۱۰) پایین‌تر از حد مطلوب است. پیشنهاد می‌شود روش مطالعه این درس را از روخوانی صرف به خلاصه‌نویسی فعال، مرور سریع و حل تمرین بلافاصله پس از مطالعه تغییر دهید.`,
    });
  }

  // 5. Identify Subjects with Time Shortfall (Predicted vs Actual Gap)
  const laggingSubjects = subjectsList
    .filter((s) => s.shortfall >= 20 && s.ratioPct < 75)
    .sort((a, b) => b.shortfall - a.shortfall);

  if (laggingSubjects.length > 0) {
    const lag = laggingSubjects[0];
    improvements.push({
      id: 'imp-subject-gap',
      title: `فاصله زمانی پیش‌بینی و اجرا در درس «${lag.name}»`,
      badge: `${toPersianDigits(lag.shortfall)} دقیقه کسری`,
      description: `در درس «${lag.name}»، زمان مطالعه واقعی (${formatMinutesPersian(
        lag.actual
      )}) نسبت به هدف پیش‌بینی‌شده (${formatMinutesPersian(
        lag.pred
      )}) حدود ${toPersianDigits(lag.shortfall)} دقیقه کمتر بوده است (${toPersianDigits(
        lag.ratioPct
      )}٪ تحقق).`,
    });
  }

  // 6. Study-to-Exercise Ratio Analysis
  const studyHours = totalActualMins / 60;
  const testsPerHour = studyHours > 0 ? Math.round(totalActualTests / studyHours) : 0;
  if (totalActualMins >= 90 && testsPerHour < 8) {
    improvements.push({
      id: 'imp-test-ratio',
      title: 'توازن نسبت مطالعه تشریحی به حل تست و تمرین',
      badge: `${toPersianDigits(testsPerHour)} تمرین در ساعت`,
      description: `در ازای ${formatMinutesPersian(
        totalActualMins
      )} مطالعه واقعی، ${toPersianDigits(
        totalActualTests
      )} تست/تمرین ثبت شده است (میانگین ${toPersianDigits(
        testsPerHour
      )} تمرین به ازای هر ساعت مطالعه). برای تثبیت عمیق‌تر مباحث، سهم حل نمونه سؤال و تست را در کنار مطالعه افزایش دهید.`,
    });
  } else if (testAchievementPct !== null && testAchievementPct < 70) {
    improvements.push({
      id: 'imp-test-target',
      title: 'تحقق کمتر از انتظار در اهداف عددی تست‌زنی',
      badge: `${toPersianDigits(testAchievementPct)}٪ هدف تست`,
      description: `از مجموع ${toPersianDigits(
        totalTargetTests
      )} تست/تمرین هدف‌گذاری‌شده، ${toPersianDigits(
        totalActualTests
      )} مورد حل شده است. اختصاص یک بازه ۱۵ تا ۲۰ دقیقه‌ای در پایان هر باکس مطالعه به حل تست، این شاخص را ارتقا می‌دهد.`,
    });
  }

  // 7. Dropped Days & Pending Tasks Analysis
  if (droppedDays.length > 0 && daysCount > 1) {
    const droppedLabels = droppedDays
      .slice(0, 2)
      .map(([iso]) => formatJalaliCompact(iso))
      .join(' و ');
    improvements.push({
      id: 'imp-dropped-days',
      title: 'نوسان و افت عملکرد در برخی روزهای بازه',
      badge: `${toPersianDigits(droppedDays.length)} روز دارای افت`,
      description: `در تاریخ ${droppedLabels} میزان تحقق برنامه به کمتر از ۵۰٪ هدف رسیده است. توزیع متوازن‌تر حجم مطالعه در طول هفته از خستگی و افت ناگهانی جلوگیری می‌کند.`,
    });
  } else if (pendingCount > 0 || partialCount > 0) {
    improvements.push({
      id: 'imp-incomplete-tasks',
      title: 'مدیریت فعالیت‌های ناقص و در انتظار تکمیل',
      badge: `${toPersianDigits(partialCount + pendingCount)} برنامه ناتمام`,
      description: `در این بازه ${toPersianDigits(partialCount)} فعالیت به صورت ناقص و ${toPersianDigits(
        pendingCount
      )} فعالیت در وضعیت انتظار باقی مانده‌اند.`,
    });
  }

  // 8. Actionable Next-Step / Next-Week Recommendations
  if (timeAchievementPct >= 85 && taskAdherencePct >= 80) {
    const suggestedNewDailyTests = Math.max(
      15,
      Math.round((totalActualTests / Math.max(1, activeDaysCount)) * 1.15)
    );
    nextSteps.push({
      id: 'next-scale-up',
      title: 'پیشنهاد ارتقای منطقی اهداف بر اساس ظرفیت واقعی شما',
      badge: '+۱۰ تا ۱۵٪ رشد هدف',
      description: `با توجه به تحقق بیش از ۸۵٪ اهداف این بازه، ظرفیت مطالعاتی شما آماده گام بعدی است! پیشنهاد می‌شود برای هفته آینده هدف تست روزانه را به حدود ${toPersianDigits(
        suggestedNewDailyTests
      )} تست در روز افزایش دهید یا ۱۵ دقیقه به سقف مطالعه روزانه بیفزایید.`,
    });
  } else if (timeAchievementPct < 65) {
    const realisticDailyMins = Math.max(
      45,
      Math.round((totalActualMins / Math.max(1, activeDaysCount)) * 1.1)
    );
    nextSteps.push({
      id: 'next-realistic-blocks',
      title: 'تنظیم باکس‌های مطالعه کوتاه‌تر و واقع‌بینانه‌تر',
      badge: `هدف روزانه ${formatMinutesPersian(realisticDailyMins)}`,
      description: `برای کاهش فاصله بین پیش‌بینی و اجرا، پیشنهاد می‌شود به جای باکس‌های طولانی، هر نوبت مطالعه را در قالب پومودوروهای ۳۰ تا ۴۵ دقیقه‌ای تنظیم کنید و هدف روزانه را روی ${formatMinutesPersian(
        realisticDailyMins
      )} قرار دهید.`,
    });
  } else {
    nextSteps.push({
      id: 'next-stabilize',
      title: 'تثبیت ریتم فعلی و تبدیل فعالیت‌های ناقص به کامل',
      badge: 'هدف‌گذاری هفته آینده',
      description: `حجم ساعت پیش‌بینی‌شده فعلی متناسب با توان اجرایی شماست؛ در گام بعدی بدون افزایش شدید ساعت برنامه، تمرکز خود را بر رساندن نرخ تکمیل فعالیت‌ها به بالای ۸۵٪ بگذارید.`,
    });
  }

  if (laggingSubjects.length > 0) {
    const lag = laggingSubjects[0];
    const compBoxMins = Math.min(60, Math.max(30, lag.shortfall));
    nextSteps.push({
      id: 'next-compensate-subject',
      title: `اختصاص باکس جبرانی برای درس «${lag.name}»`,
      badge: `${toPersianDigits(compBoxMins)} دقیقه جبرانی`,
      description: `برای جبران کسری زمان درس «${lag.name}»، در برنامه روزهای آینده یک باکس متمرکز ${toPersianDigits(
        compBoxMins
      )} دقیقه‌ای در ساعات اوج انرژی روز برای این درس ثبت کنید.`,
    });
  }

  if (lowQualityHighTimeSubjects.length > 0) {
    const sub = lowQualityHighTimeSubjects[0];
    nextSteps.push({
      id: 'next-quality-boost',
      title: `ارتقای کیفیت مطالعه درس «${sub.name}» با مرور و تست`,
      badge: 'اصلاح روش مطالعه',
      description: `در جلسه بعدی مطالعه «${sub.name}»، ۶۰٪ زمان را به مطالعه مفهومی و ۴۰٪ پایانی را به حل حداقل ۱۰ تمرین کاربردی اختصاص دهید تا نمره کیفیت یادگیری از ${toPersianDigits(
        sub.avgQ ?? 0
      )} به بالای ۸ برسد.`,
    });
  }

  if (strengths.length === 0) {
    strengths.push({
      id: 'str-active-logging',
      title: 'شروع ثبت منظم برنامه‌ها و پایش عملکرد واقعی',
      badge: `${toPersianDigits(rangePlans.length)} فعالیت ثبت‌شده`,
      description: `ثبت دقیق زمان مطالعه (${formatMinutesPersian(
        totalActualMins
      )}) و ارزیابی واقعی فعالیت‌ها نخستین گام کلیدی برای بهینه‌سازی برنامه تحصیلی است.`,
    });
  }

  let headlineBadge = 'رو به رشد و متعادل ⚡';
  if (timeAchievementPct >= 85 && taskAdherencePct >= 80) {
    headlineBadge = 'عملکرد تراز اول و فوق‌العاده 🏆';
  } else if (timeAchievementPct < 55) {
    headlineBadge = 'نیازمند تنظیم مجدد زمان‌بندی 🎯';
  }

  const executiveSummary = `${
    strengths[0]?.title ? `${strengths[0].title}؛ ` : ''
  }${
    improvements[0]?.title
      ? `در کنار آن، ${improvements[0].title} مهم‌ترین اولویت بهبود شماست.`
      : nextSteps[0]?.description || ''
  }`;

  return {
    hasData: true,
    emptyMessage: '',
    headlineBadge,
    executiveSummary,
    strengths,
    improvements,
    nextSteps,
  };
}

export interface SmartAdvisoryAccordionCardProps {
  allTimePlans: DailyPlanItem[];
}

export const SmartAdvisoryAccordionCard: React.FC<SmartAdvisoryAccordionCardProps> = ({
  allTimePlans,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<AdvisoryTimeframe>('weekly');

  const todayIso = getTodayISO();
  const currentWeekDays = useMemo(() => getPersianWeekDays(todayIso), [todayIso]);

  const advisoryByTimeframe = useMemo(() => {
    const weekStart = currentWeekDays[0].isoDate;
    const weekEnd = currentWeekDays[6].isoDate;
    const semiWeekStart = addDaysISO(todayIso, -2);
    const monthStart = addDaysISO(todayIso, -29);

    const dailyPlans = allTimePlans.filter((p) => p.plan_date === todayIso);
    const semiWeeklyPlans = allTimePlans.filter(
      (p) => p.plan_date >= semiWeekStart && p.plan_date <= todayIso
    );
    const weeklyPlans = allTimePlans.filter(
      (p) => p.plan_date >= weekStart && p.plan_date <= weekEnd
    );
    const monthlyPlans = allTimePlans.filter(
      (p) => p.plan_date >= monthStart && p.plan_date <= todayIso
    );

    return {
      daily: buildTimeframeAdvisory(dailyPlans, 1, 'امروز (روزانه)'),
      semi_weekly: buildTimeframeAdvisory(semiWeeklyPlans, 3, '۳ روز اخیر (نیمه‌هفتگی)'),
      weekly: buildTimeframeAdvisory(weeklyPlans, 7, 'این هفته'),
      monthly: buildTimeframeAdvisory(monthlyPlans, 30, '۳۰ روز اخیر (ماهانه)'),
    };
  }, [allTimePlans, todayIso, currentWeekDays]);

  const activeBundle = advisoryByTimeframe[timeframe];

  return (
    <div className="rounded-3xl bg-gradient-to-l from-indigo-50 via-violet-50/75 to-amber-50/55 dark:from-indigo-950/45 dark:via-slate-900 dark:to-slate-900/90 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs overflow-hidden transition-all">
      {/* Accordion Header (Clickable in both collapsed and expanded states) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3.5 text-right hover:bg-white/40 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-indigo-600/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm md:text-base font-black text-indigo-950 dark:text-indigo-100">
                جمع‌بندی و توصیه مشاوره‌ای این هفته
              </h2>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                {activeBundle.headlineBadge}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
              {activeBundle.executiveSummary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-center">
          <span className="hidden md:inline-block text-xs font-extrabold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
            {isOpen ? 'بستن جزئیات مشاوره' : 'مشاهده تحلیل کامل'}
          </span>
          <div
            className={`w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800 border border-indigo-200/70 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Accordion Expanded Body */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 pt-3.5 border-t border-indigo-200/60 dark:border-slate-800 space-y-4">
          {/* Multi-Timeframe Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/75 dark:bg-slate-900/80 p-2.5 rounded-2xl border border-indigo-100 dark:border-slate-800">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 px-1">
              سطح زمانی تحلیل هوشمند:
            </span>
            <div className="grid grid-cols-2 sm:inline-flex items-center gap-1.5">
              {(
                [
                  { id: 'daily', label: 'روزانه (امروز)' },
                  { id: 'semi_weekly', label: 'نیمه‌هفتگی (۳ روز اخیر)' },
                  { id: 'weekly', label: 'هفتگی (این هفته)' },
                  { id: 'monthly', label: 'ماهانه (۳۰ روزه)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeframe(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap text-center ${
                    timeframe === tab.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {!activeBundle.hasData ? (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-5 text-center text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeBundle.emptyMessage}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category 1: نقاط قوت و دستاوردها */}
              <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300 border-b border-emerald-100 dark:border-slate-800 pb-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>۱. نقاط قوت و دستاوردهای قابل حفظ</span>
                </div>
                <div className="space-y-2.5">
                  {activeBundle.strengths.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 whitespace-nowrap shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category 2: موارد نیازمند اصلاح و توجه */}
              <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-300 border-b border-amber-100 dark:border-slate-800 pb-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>۲. موارد نیازمند اصلاح و بررسی</span>
                </div>
                <div className="space-y-2.5">
                  {activeBundle.improvements.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                      در این بازه افت محسوسی در کیفیت یا تحقق زمان دروس مشاهده نشد؛ تعادل فعلی بسیار مطلوب است.
                    </div>
                  ) : (
                    activeBundle.improvements.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/40 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 whitespace-nowrap shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Category 3: پیشنهادهای عملی گام بعد */}
              <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-300 border-b border-indigo-100 dark:border-slate-800 pb-2.5">
                  <Lightbulb className="w-4 h-4 shrink-0" />
                  <span>۳. پیشنهادهای عملی و برنامه گام بعد</span>
                </div>
                <div className="space-y-2.5">
                  {activeBundle.nextSteps.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>{item.title}</span>
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 whitespace-nowrap shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const WeeklyAnalyticalReport: React.FC = () => {
  const todayIso = getTodayISO();
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [plans, setPlans] = useState<DailyPlanItem[]>([]);
  const [goalsByDay, setGoalsByDay] = useState<DailyStudyGoalConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const weekDays = useMemo(() => getPersianWeekDays(weekRefDate), [weekRefDate]);
  const startDate = weekDays[0].isoDate;
  const endDate = weekDays[6].isoDate;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      api.getPlansByRange(startDate, endDate),
      Promise.all(weekDays.map((d) => api.getDailyGoal(d.isoDate))),
    ])
      .then(([plansData, goalsData]) => {
        if (mounted) {
          setPlans(plansData);
          setGoalsByDay(goalsData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [startDate, endDate, weekDays]);

  const analysis = useMemo(() => {
    const studyPlans = plans.filter((p) => Number(p.is_study) === 1);
    const totalPredictedMinutes = studyPlans.reduce(
      (sum, p) => sum + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
      0
    );
    const totalActualMinutes = studyPlans.reduce(
      (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
      0
    );
    const totalExercises = studyPlans.reduce(
      (sum, p) => sum + Number(p.performance?.exercises_count || 0),
      0
    );
    const completedTasks = plans.filter((p) => p.status === 'completed').length;
    const partialTasks = plans.filter((p) => p.status === 'partial').length;
    const totalTasks = plans.length;

    const studyHoursAchievementPct =
      totalPredictedMinutes > 0
        ? Math.min(100, Math.round((totalActualMinutes / totalPredictedMinutes) * 100))
        : 0;

    const taskFulfillmentPct =
      totalTasks > 0
        ? Math.round(((completedTasks + partialTasks * 0.5) / totalTasks) * 100)
        : 0;

    // Evaluate Daily Numeric Goals fulfillment across the 7 days of the selected week
    let goalsTotalCount = 0;
    let goalsAchievedCount = 0;
    let goalsWeightedProgressSum = 0;

    for (const dayGoal of goalsByDay) {
      const dayPlans = plans.filter((p) => p.plan_date === dayGoal.goal_date);
      const dayStudyPlans = dayPlans.filter((p) => Number(p.is_study) === 1);

      if (dayPlans.length === 0 && (!dayGoal.custom_goals || dayGoal.custom_goals.length === 0)) {
        continue;
      }

      const actualDayStudyMins = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
        0
      );
      const actualDayExercises = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.exercises_count || 0),
        0
      );
      const actualDayCompleted = dayPlans.filter((p) => p.status === 'completed').length;

      // 1. Study minutes goal
      if (dayGoal.target_study_minutes > 0) {
        const pct = Math.min(
          100,
          Math.round((actualDayStudyMins / dayGoal.target_study_minutes) * 100)
        );
        goalsTotalCount += 1;
        if (pct >= 100) goalsAchievedCount += 1;
        goalsWeightedProgressSum += pct;
      }

      // 2. Exercises count goal
      if (dayGoal.target_exercises_count > 0) {
        const pct = Math.min(
          100,
          Math.round((actualDayExercises / dayGoal.target_exercises_count) * 100)
        );
        goalsTotalCount += 1;
        if (pct >= 100) goalsAchievedCount += 1;
        goalsWeightedProgressSum += pct;
      }

      // 3. Completed tasks goal
      if (dayGoal.target_completed_tasks > 0) {
        const pct = Math.min(
          100,
          Math.round((actualDayCompleted / dayGoal.target_completed_tasks) * 100)
        );
        goalsTotalCount += 1;
        if (pct >= 100) goalsAchievedCount += 1;
        goalsWeightedProgressSum += pct;
      }

      // 4. Custom numeric goals
      for (const cg of dayGoal.custom_goals || []) {
        if (cg.targetValue > 0) {
          const pct = Math.min(100, Math.round((cg.currentValue / cg.targetValue) * 100));
          goalsTotalCount += 1;
          if (pct >= 100) goalsAchievedCount += 1;
          goalsWeightedProgressSum += pct;
        }
      }
    }

    const goalsAverageFulfillmentPct =
      goalsTotalCount > 0
        ? Math.round(goalsWeightedProgressSum / goalsTotalCount)
        : studyHoursAchievementPct;

    // Overall composite weekly score
    const overallScorePct = Math.round(
      studyHoursAchievementPct * 0.45 +
        taskFulfillmentPct * 0.3 +
        goalsAverageFulfillmentPct * 0.25
    );

    // Per-day breakdown for best day, consistency, and color spectrum
    const dayStats = weekDays.map((d) => {
      const dPlans = studyPlans.filter((p) => p.plan_date === d.isoDate);
      const pred = dPlans.reduce(
        (acc, p) => acc + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
        0
      );
      const actual = dPlans.reduce(
        (acc, p) => acc + Number(p.performance?.actual_minutes || 0),
        0
      );
      const tests = dPlans.reduce(
        (acc, p) => acc + Number(p.performance?.exercises_count || 0),
        0
      );
      const hasAnyData = pred > 0 || actual > 0;
      const ratio =
        pred > 0
          ? Math.min(100, Math.round((actual / pred) * 100))
          : actual > 0
          ? 100
          : 0;
      return {
        ...d,
        pred,
        actual,
        tests,
        hasAnyData,
        ratio,
      };
    });

    const activeStudyDaysCount = dayStats.filter((d) => d.actual > 0).length;
    const bestDay = [...dayStats].sort((a, b) => b.actual - a.actual)[0] || null;

    // Subject analysis: strongest vs needing attention
    const subjectMap = new Map<
      string,
      { name: string; pred: number; actual: number; tests: number; completed: number; total: number }
    >();

    for (const p of studyPlans) {
      const name = p.subject_name_snapshot || 'درس عمومی';
      const entry = subjectMap.get(name) || {
        name,
        pred: 0,
        actual: 0,
        tests: 0,
        completed: 0,
        total: 0,
      };
      entry.pred += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
      entry.actual += Number(p.performance?.actual_minutes || 0);
      entry.tests += Number(p.performance?.exercises_count || 0);
      entry.total += 1;
      if (p.status === 'completed') entry.completed += 1;
      subjectMap.set(name, entry);
    }

    const subjectsList = Array.from(subjectMap.values());
    const topSubject = [...subjectsList].sort((a, b) => b.actual - a.actual)[0] || null;
    const attentionSubject =
      [...subjectsList]
        .filter((s) => s.pred > 0)
        .sort((a, b) => a.actual / a.pred - b.actual / b.pred)[0] || null;

    let statusBadge = 'عملکرد عالی و استاندارد';
    if (totalPredictedMinutes === 0 && totalActualMinutes === 0) {
      statusBadge = 'آماده ثبت برنامه هفتگی';
    } else if (overallScorePct >= 85) {
      statusBadge = 'تراز اول و فوق‌العاده 🏆';
    } else if (overallScorePct >= 60) {
      statusBadge = 'رو به رشد و باانگیزه ⚡';
    } else {
      statusBadge = 'نیازمند بازنگری در زمان‌بندی 🎯';
    }

    return {
      totalPredictedMinutes,
      totalActualMinutes,
      varianceMinutes: totalActualMinutes - totalPredictedMinutes,
      dailyAvgActualMinutes: Math.round(totalActualMinutes / 7),
      totalExercises,
      completedTasks,
      totalTasks,
      studyHoursAchievementPct,
      taskFulfillmentPct,
      goalsTotalCount,
      goalsAchievedCount,
      goalsAverageFulfillmentPct,
      overallScorePct,
      activeStudyDaysCount,
      bestDay,
      topSubject,
      attentionSubject,
      dayStats,
      statusBadge,
    };
  }, [plans, goalsByDay, weekDays]);

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* Header Bar (Section 10: Title shortened to «گزارش تحلیلی هفتگی») */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-l from-indigo-50/70 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white whitespace-nowrap">
                گزارش تحلیلی هفتگی
              </h2>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                · {analysis.statusBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              بازه تحلیلی هفته: {weekDays[0].fullLabel} تا {weekDays[6].fullLabel}
            </p>
          </div>
        </div>

        {/* Week Selector Controls */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] whitespace-nowrap"
          >
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span>هفته قبل</span>
          </button>
          <button
            type="button"
            onClick={() => setWeekRefDate(todayIso)}
            className={`rounded-xl px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs font-extrabold transition-colors cursor-pointer min-h-[38px] whitespace-nowrap text-center ${
              weekRefDate === todayIso
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            هفته جاری
          </button>
          <button
            type="button"
            onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] whitespace-nowrap"
          >
            <span>هفته بعد</span>
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Top Analytical Pillar Cards: 1) Study Hours Comparison, 2) Goal Fulfillment, 3) Weekly Consistency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pillar 1: مقایسه ساعت مطالعه هفتگی (Section 9) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-5 flex flex-col justify-between space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>مقایسه ساعت مطالعه هفتگی</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums pr-6">
                  {toPersianDigits(analysis.studyHoursAchievementPct)}٪ تحقق زمان
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[76px]">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    ساعت مطالعه واقعی
                  </div>
                  <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1.5 whitespace-nowrap">
                    {formatMinutesPersian(analysis.totalActualMinutes)}
                  </div>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[76px]">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    ساعت پیش‌بینی‌شده
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1.5 whitespace-nowrap">
                    {formatMinutesPersian(analysis.totalPredictedMinutes)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${analysis.studyHoursAchievementPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  <span>
                    میانگین روزانه: {formatMinutesPersian(analysis.dailyAvgActualMinutes)}
                  </span>
                  <span
                    className={
                      analysis.varianceMinutes >= 0
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'font-bold text-amber-600 dark:text-amber-400'
                    }
                  >
                    {analysis.varianceMinutes === 0
                      ? 'دقیقاً منطبق با هدف'
                      : analysis.varianceMinutes > 0
                      ? `${toPersianDigits(analysis.varianceMinutes)}+ دقیقه بیشتر از هدف`
                      : `${toPersianDigits(Math.abs(analysis.varianceMinutes))} دقیقه کمتر از هدف`}
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 2: میزان تحقق اهداف هفتگی (Section 8) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-5 flex flex-col justify-between space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  <Target className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span>میزان تحقق اهداف هفتگی</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-violet-600 dark:text-violet-400 tabular-nums pr-6">
                  امتیاز کل: {toPersianDigits(analysis.overallScorePct)}٪
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[76px]">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center sm:whitespace-nowrap">
                    مأموریت‌های تکمیل‌شده
                  </div>
                  <div className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 mt-1.5 whitespace-nowrap">
                    {toPersianDigits(analysis.completedTasks)} از{' '}
                    {toPersianDigits(analysis.totalTasks)}
                  </div>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[76px]">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center sm:whitespace-nowrap">
                    تحقق اهداف عددی روزانه
                  </div>
                  <div className="text-xs sm:text-sm font-black text-violet-600 dark:text-violet-400 mt-1.5 text-center whitespace-nowrap">
                    {analysis.goalsTotalCount > 0 ? (
                      <>
                        <span>
                          {toPersianDigits(analysis.goalsAchievedCount)} از{' '}
                          {toPersianDigits(analysis.goalsTotalCount)} هدف
                        </span>{' '}
                        <span className="text-[11px] font-extrabold opacity-90">
                          ({toPersianDigits(analysis.goalsAverageFulfillmentPct)}٪)
                        </span>
                      </>
                    ) : (
                      `${toPersianDigits(analysis.taskFulfillmentPct)}٪ پیشرفت`
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-indigo-600 to-violet-500 transition-all duration-500"
                    style={{ width: `${analysis.overallScorePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  <span>
                    تکمیل مأموریت‌ها: {toPersianDigits(analysis.taskFulfillmentPct)}٪
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{toPersianDigits(analysis.totalExercises)} تست یا تمرین در هفته</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 3: تداوم و نقاط قوت هفته (Section 7) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  <Award className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>تداوم و نقاط قوت هفته</span>
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  {toPersianDigits(analysis.activeStudyDaysCount)} از ۷ روز فعال
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2.5 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>قوی‌ترین درس هفته:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap truncate text-left">
                    {analysis.topSubject && analysis.topSubject.actual > 0 ? (
                      <>
                        <span>{analysis.topSubject.name}</span>{' '}
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          ({formatMinutesPersian(analysis.topSubject.actual)})
                        </span>
                      </>
                    ) : (
                      'هنوز ثبت نشده'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2.5 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>نیازمند توجه بیشتر:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap truncate text-left">
                    {analysis.attentionSubject ? (
                      <>
                        <span>{analysis.attentionSubject.name}</span>{' '}
                        <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          (
                          {toPersianDigits(
                            Math.round(
                              (analysis.attentionSubject.actual /
                                Math.max(1, analysis.attentionSubject.pred)) *
                                100
                            )
                          )}
                          ٪ تحقق)
                        </span>
                      </>
                    ) : (
                      'همه دروس متعادل'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2.5 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs font-bold">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>پربازده‌ترین روز هفته:</span>
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap truncate text-left">
                    {analysis.bestDay && analysis.bestDay.actual > 0 ? (
                      <>
                        <span>{analysis.bestDay.weekdayName}</span>{' '}
                        <span className="text-[10px] sm:text-[11px] font-bold text-indigo-500 dark:text-indigo-300">
                          ({formatMinutesPersian(analysis.bestDay.actual)})
                        </span>
                      </>
                    ) : (
                      'ثبت نشده'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: جدول تحقق روز به روز اهداف (Title, Subtitle, and Gradient Color Spectrum) */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>جدول تحقق روز به روز اهداف</span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 pr-5.5">
                مقایسه مطالعه واقعی هر روز با هدف پیش‌بینی شده
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {analysis.dayStats.map((day) => {
                // Determine color spectrum gradient based on real daily achievement (Section 6)
                let cardGradientClass =
                  'border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/70 dark:from-slate-800/40 dark:via-slate-900 dark:to-slate-800/20';
                let badgeTextClass = 'text-slate-500 dark:text-slate-400';
                let progressFillClass = 'bg-slate-300 dark:bg-slate-700';

                if (day.hasAnyData) {
                  if (day.ratio >= 95) {
                    // Very Good / Excellent (Stronger Green Gradient)
                    cardGradientClass =
                      'border-emerald-300/90 dark:border-emerald-700/80 bg-gradient-to-br from-emerald-100/90 via-emerald-50/55 to-teal-100/80 dark:from-emerald-900/50 dark:via-slate-900 dark:to-teal-950/45';
                    badgeTextClass = 'text-emerald-700 dark:text-emerald-300';
                    progressFillClass = 'bg-gradient-to-l from-emerald-600 to-teal-500';
                  } else if (day.ratio >= 75) {
                    // Appropriate / Good (Soft Green Gradient)
                    cardGradientClass =
                      'border-emerald-200/85 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/65 dark:from-emerald-950/35 dark:via-slate-900 dark:to-teal-950/20';
                    badgeTextClass = 'text-emerald-600 dark:text-emerald-400';
                    progressFillClass = 'bg-emerald-500';
                  } else if (day.ratio >= 45) {
                    // Moderate (Soft Amber / Orange Gradient)
                    cardGradientClass =
                      'border-amber-200/90 dark:border-amber-800/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-100/65 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/25';
                    badgeTextClass = 'text-amber-700 dark:text-amber-300';
                    progressFillClass = 'bg-amber-500';
                  } else {
                    // Weak / Very Low (Soft Red / Rose Gradient)
                    cardGradientClass =
                      'border-rose-200/90 dark:border-rose-800/70 bg-gradient-to-br from-rose-50/90 via-white to-red-100/65 dark:from-rose-950/45 dark:via-slate-900 dark:to-rose-900/25';
                    badgeTextClass = 'text-rose-700 dark:text-rose-300';
                    progressFillClass = 'bg-rose-500';
                  }
                }

                return (
                  <div
                    key={day.isoDate}
                    className={`rounded-2xl border p-3.5 space-y-2 transition-all tabular-nums shadow-2xs ${cardGradientClass} ${
                      day.isToday ? 'ring-2 ring-indigo-500/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {day.weekdayName}
                      </span>
                      <span className={`text-[11px] font-black whitespace-nowrap ${badgeTextClass}`}>
                        {day.hasAnyData ? `${toPersianDigits(day.ratio)}٪` : 'ثبت‌نشده'}
                      </span>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {day.dayNumberPersian} {day.monthName}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressFillClass}`}
                        style={{ width: `${day.hasAnyData ? Math.max(4, day.ratio) : 0}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      واقعی: {formatMinutesPersian(day.actual)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      هدف: {formatMinutesPersian(day.pred)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
