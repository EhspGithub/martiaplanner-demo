/**
 * MartiaPlanner — Modular Performance Evaluation, Time Budget & Analytics Engine
 *
 * Implements Sections 3 through 12 of the specification:
 * - Section 3: Dedicated Gradient Header Themes per Subject & Activity Type
 * - Section 4: Actual-to-Predicted Time Ratio Indicator (can exceed 100%, never conflated with task completion)
 * - Section 5: Daily Educational Evaluation (T = Study Time, Q = Exercises, L = Weighted Learning Quality 0-10, E = Composite)
 * - Section 6 & 7: Three-Tier Activity Classification (educational, restricted, essential) & Restricted Control Index (C)
 * - Section 8: Final Daily Composite Score S = (E * 0.8) + (C * 0.2) with automatic weight normalization
 * - Section 9: Daily Time Budget (ظرف زمانی روزانه) & Study Share of Time Budget
 * - Section 10, 11 & 12: Period Aggregation, Period-to-Period Comparison, and Extensible Weight Configuration
 */

import type {
  ActivityCategory,
  ActivityGroupType,
  DailyPlanItem,
  DailyTimeBudgetConfig,
  DailyStudyGoalConfig,
} from '../types.ts';
import {
  formatJalaliCompact,
  formatJalaliFull,
  getPersianWeekdayName,
  addDaysISO,
  getDateRangeISOList,
  toPersianDigits,
  formatDurationPrimePersian,
} from './jalali.ts';

// ============================================================================
// 1. CONFIGURABLE SCORING WEIGHTS (Section 5.4, Section 8, Section 12)
// ============================================================================
export interface AnalyticsWeightsConfig {
  studyTimeWeight: number; // Default 0.40 (40%)
  exercisesWeight: number; // Default 0.30 (30%)
  learningQualityWeight: number; // Default 0.30 (30%)
  educationalCompositeWeight: number; // Default 0.80 (80%)
  restrictedControlWeight: number; // Default 0.20 (20%)
}

export const DEFAULT_ANALYTICS_WEIGHTS: AnalyticsWeightsConfig = {
  studyTimeWeight: 0.4,
  exercisesWeight: 0.3,
  learningQualityWeight: 0.3,
  educationalCompositeWeight: 0.8,
  restrictedControlWeight: 0.2,
};

// ============================================================================
// 2. THREE-TIER ACTIVITY CLASSIFICATION (Section 6)
// ============================================================================
const RESTRICTED_KEYWORDS = [
  'گوشی',
  'موبایل',
  'تلفن',
  'شبکه',
  'اینستاگرام',
  'تلگرام',
  'تلویزیون',
  'فیلم',
  'سریال',
  'بازی',
  'گیم',
  'سرگرمی',
  'تفریح دیجیتال',
  'یوتیوب',
  'کنسول',
];

const ESSENTIAL_KEYWORDS = [
  'استراحت',
  'خواب',
  'غذا',
  'ناهار',
  'شام',
  'صبحانه',
  'عصرانه',
  'تغذیه',
  'ورزش',
  'تحرک',
  'پیاده‌روی',
  'باشگاه',
  'شخصی',
  'نظافت',
  'خانواده',
  'عبادت',
  'نماز',
];

export function classifyCategoryActivityGroup(
  category: Pick<ActivityCategory, 'id' | 'title' | 'is_study' | 'activity_group'>
): ActivityGroupType {
  if (Number(category.is_study) === 1) {
    return 'educational';
  }
  if (
    category.activity_group === 'educational' ||
    category.activity_group === 'restricted' ||
    category.activity_group === 'essential'
  ) {
    return category.activity_group;
  }
  const id = (category.id || '').toLowerCase();
  const title = category.title || '';

  if (
    id === 'cat-phone' ||
    id === 'cat-tv' ||
    id === 'cat-game' ||
    RESTRICTED_KEYWORDS.some((kw) => title.includes(kw))
  ) {
    return 'restricted';
  }

  if (
    id === 'cat-rest' ||
    id === 'cat-sport' ||
    ESSENTIAL_KEYWORDS.some((kw) => title.includes(kw))
  ) {
    return 'essential';
  }

  return 'essential';
}

export function classifyPlanActivityGroup(
  plan: Pick<
    DailyPlanItem,
    'is_study' | 'category_id' | 'category_title_snapshot' | 'activity_group_snapshot'
  >,
  categoriesMap?: Map<string, ActivityCategory>
): ActivityGroupType {
  if (Number(plan.is_study) === 1) {
    return 'educational';
  }
  if (
    plan.activity_group_snapshot === 'educational' ||
    plan.activity_group_snapshot === 'restricted' ||
    plan.activity_group_snapshot === 'essential'
  ) {
    return plan.activity_group_snapshot;
  }
  const cat = categoriesMap?.get(plan.category_id);
  if (cat) {
    return classifyCategoryActivityGroup(cat);
  }
  return classifyCategoryActivityGroup({
    id: plan.category_id,
    title: plan.category_title_snapshot || '',
    is_study: plan.is_study,
  });
}

export function getActivityGroupLabel(group: ActivityGroupType): string {
  switch (group) {
    case 'educational':
      return 'فعالیت آموزشی';
    case 'restricted':
      return 'تفریحی و محدودشونده';
    case 'essential':
      return 'ضروری، بازیابی و سلامت';
  }
}

// ============================================================================
// 3. LEARNING QUALITY 0-10 PARSER & FORMATTER (Section 1.7 & Section 5.3)
// ============================================================================
const LEGACY_QUALITY_MAP_0_TO_10: Record<string, number> = {
  excellent: 9.5,
  good: 8,
  average: 6,
  weak: 3,
};

/**
 * Parses a stored learning_quality value into a number in [0, 10], or null if unrecorded.
 * Supports integer strings "0".."10" as well as legacy 'excellent'|'good'|'average'|'weak'.
 */
export function parseLearningQuality0To10(
  raw: string | number | null | undefined
): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    if (isNaN(raw)) return null;
    return Math.max(0, Math.min(10, raw));
  }
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed in LEGACY_QUALITY_MAP_0_TO_10) {
    return LEGACY_QUALITY_MAP_0_TO_10[trimmed];
  }
  const num = Number(trimmed);
  if (!isNaN(num) && num >= 0 && num <= 10) {
    return Math.round(num * 10) / 10;
  }
  return null;
}

export function getLearningQualityDescriptor(score0To10: number | null): string {
  if (score0To10 === null) return 'ثبت‌نشده';
  if (score0To10 >= 9) return 'عالی';
  if (score0To10 >= 7) return 'خوب';
  if (score0To10 >= 5) return 'متوسط';
  if (score0To10 >= 3) return 'ضعیف';
  return 'بسیار ضعیف';
}

// ============================================================================
// 4. DEDICATED GRADIENT CARD HEADER PALETTE (Section 3)
// ============================================================================
export interface CardGradientTheme {
  headerGradient: string; // Tailwind gradient classes for card header only
  badgeBg: string; // Corner badge background on header
  accentText: string; // Accent text color inside card body
  softTintBg: string; // Subtle tint for description box inside card body
  borderHover: string; // Card hover border
  hexColor: string; // Chart color representation
}

export function getCardGradientTheme(
  subjectName: string | null,
  categoryTitle: string,
  isStudy: boolean,
  activityGroup: ActivityGroupType
): CardGradientTheme {
  if (!isStudy) {
    if (categoryTitle.includes('گوشی') || categoryTitle.includes('شبکه')) {
      return {
        headerGradient: 'bg-gradient-to-l from-amber-600 via-orange-500 to-amber-500 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-amber-700 dark:text-amber-400',
        softTintBg: 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-100 dark:border-amber-900/40',
        borderHover: 'hover:border-amber-400 dark:hover:border-amber-600',
        hexColor: '#f59e0b',
      };
    }
    if (categoryTitle.includes('تلویزیون') || categoryTitle.includes('فیلم')) {
      return {
        headerGradient: 'bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-500 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-sky-700 dark:text-sky-400',
        softTintBg: 'bg-sky-50/70 dark:bg-sky-950/25 border-sky-100 dark:border-sky-900/40',
        borderHover: 'hover:border-sky-400 dark:hover:border-sky-600',
        hexColor: '#0284c7',
      };
    }
    if (categoryTitle.includes('بازی') || activityGroup === 'restricted') {
      return {
        headerGradient: 'bg-gradient-to-l from-fuchsia-600 via-purple-600 to-pink-500 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-purple-700 dark:text-purple-400',
        softTintBg: 'bg-purple-50/70 dark:bg-purple-950/25 border-purple-100 dark:border-purple-900/40',
        borderHover: 'hover:border-purple-400 dark:hover:border-purple-600',
        hexColor: '#9333ea',
      };
    }
    if (categoryTitle.includes('ورزش') || categoryTitle.includes('تحرک')) {
      return {
        headerGradient: 'bg-gradient-to-l from-teal-600 via-emerald-600 to-cyan-600 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-teal-700 dark:text-teal-400',
        softTintBg: 'bg-teal-50/70 dark:bg-teal-950/25 border-teal-100 dark:border-teal-900/40',
        borderHover: 'hover:border-teal-400 dark:hover:border-teal-600',
        hexColor: '#0d9488',
      };
    }
    // Rest / Food / Personal Essential
    return {
      headerGradient: 'bg-gradient-to-l from-emerald-600 via-teal-500 to-green-500 text-white',
      badgeBg: 'bg-black/20 text-white border border-white/20',
      accentText: 'text-emerald-700 dark:text-emerald-400',
      softTintBg: 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      hexColor: '#10b981',
    };
  }

  // Distinct Subject Gradients (Section 3.2)
  const name = subjectName || '';
  if (name.includes('فارسی') || name.includes('ادبیات') || name.includes('نگارش')) {
    return {
      headerGradient: 'bg-gradient-to-l from-indigo-700 via-indigo-600 to-violet-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-indigo-700 dark:text-indigo-300',
      softTintBg: 'bg-indigo-50/60 dark:bg-indigo-950/25 border-indigo-100 dark:border-indigo-900/40',
      borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-500',
      hexColor: '#4f46e5',
    };
  }
  if (name.includes('ریاضی') || name.includes('هندسه') || name.includes('حسابان')) {
    return {
      headerGradient: 'bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-blue-700 dark:text-blue-300',
      softTintBg: 'bg-blue-50/60 dark:bg-blue-950/25 border-blue-100 dark:border-blue-900/40',
      borderHover: 'hover:border-blue-400 dark:hover:border-blue-500',
      hexColor: '#2563eb',
    };
  }
  if (name.includes('زیست')) {
    return {
      headerGradient: 'bg-gradient-to-l from-emerald-700 via-green-600 to-teal-500 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-emerald-700 dark:text-emerald-300',
      softTintBg: 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
      hexColor: '#059669',
    };
  }
  if (name.includes('شیمی')) {
    return {
      headerGradient: 'bg-gradient-to-l from-cyan-700 via-teal-600 to-sky-500 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-cyan-700 dark:text-cyan-300',
      softTintBg: 'bg-cyan-50/60 dark:bg-cyan-950/25 border-cyan-100 dark:border-cyan-900/40',
      borderHover: 'hover:border-cyan-400 dark:hover:border-cyan-500',
      hexColor: '#0891b2',
    };
  }
  if (name.includes('فیزیک')) {
    return {
      headerGradient: 'bg-gradient-to-l from-violet-700 via-purple-600 to-indigo-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-violet-700 dark:text-violet-300',
      softTintBg: 'bg-violet-50/60 dark:bg-violet-950/25 border-violet-100 dark:border-violet-900/40',
      borderHover: 'hover:border-violet-400 dark:hover:border-violet-500',
      hexColor: '#7c3aed',
    };
  }
  if (name.includes('علوم')) {
    return {
      headerGradient: 'bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-emerald-700 dark:text-emerald-300',
      softTintBg: 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
      hexColor: '#10b981',
    };
  }
  if (name.includes('عربی')) {
    return {
      headerGradient: 'bg-gradient-to-l from-amber-600 via-orange-600 to-yellow-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-amber-700 dark:text-amber-300',
      softTintBg: 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-100 dark:border-amber-900/40',
      borderHover: 'hover:border-amber-400 dark:hover:border-amber-500',
      hexColor: '#d97706',
    };
  }
  if (name.includes('انگلیسی') || name.includes('زبان')) {
    return {
      headerGradient: 'bg-gradient-to-l from-purple-700 via-fuchsia-600 to-violet-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-purple-700 dark:text-purple-300',
      softTintBg: 'bg-purple-50/60 dark:bg-purple-950/25 border-purple-100 dark:border-purple-900/40',
      borderHover: 'hover:border-purple-400 dark:hover:border-purple-500',
      hexColor: '#9333ea',
    };
  }
  if (name.includes('اجتماعی') || name.includes('تاریخ') || name.includes('جغرافیا')) {
    return {
      headerGradient: 'bg-gradient-to-l from-teal-700 via-cyan-600 to-emerald-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-teal-700 dark:text-teal-300',
      softTintBg: 'bg-teal-50/60 dark:bg-teal-950/25 border-teal-100 dark:border-teal-900/40',
      borderHover: 'hover:border-teal-400 dark:hover:border-teal-500',
      hexColor: '#0d9488',
    };
  }
  if (name.includes('قرآن') || name.includes('آسمان') || name.includes('دینی')) {
    return {
      headerGradient: 'bg-gradient-to-l from-sky-700 via-sky-600 to-blue-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-sky-700 dark:text-sky-300',
      softTintBg: 'bg-sky-50/60 dark:bg-sky-950/25 border-sky-100 dark:border-sky-900/40',
      borderHover: 'hover:border-sky-400 dark:hover:border-sky-500',
      hexColor: '#0284c7',
    };
  }
  if (name.includes('فناوری') || name.includes('هنر') || name.includes('تفکر')) {
    return {
      headerGradient: 'bg-gradient-to-l from-slate-700 via-slate-600 to-zinc-700 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-slate-700 dark:text-slate-300',
      softTintBg: 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
      borderHover: 'hover:border-slate-400 dark:hover:border-slate-500',
      hexColor: '#475569',
    };
  }

  return {
    headerGradient: 'bg-gradient-to-l from-indigo-700 via-violet-600 to-purple-600 text-white',
    badgeBg: 'bg-white/20 text-white border border-white/25',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    softTintBg: 'bg-indigo-50/60 dark:bg-indigo-950/25 border-indigo-100 dark:border-indigo-900/40',
    borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-500',
    hexColor: '#6366f1',
  };
}

// ============================================================================
// 5. CARD TIME RATIO INDICATOR (Section 4)
// ============================================================================
/**
 * Section 4:
 * درصد زمان واقعی نسبت به پیش‌بینی = (زمان واقعی ÷ زمان پیش‌بینی‌شده) × ۱۰۰
 * Can exceed 100% (e.g., 90 -> 120 = 133%). Never conflated with task completion.
 */
export function calculateActualToPredictedRatioPct(
  actualMinutes: number | null | undefined,
  predictedMinutes: number | null | undefined
): number | null {
  if (actualMinutes === null || actualMinutes === undefined) return null;
  const pred = Number(predictedMinutes || 0);
  if (pred <= 0) return null;
  const act = Math.max(0, Number(actualMinutes));
  return Math.round((act / pred) * 100);
}

// ============================================================================
// 6. INDEPENDENT COMPONENT CALCULATORS (Sections 5, 6, 7, 8, 12)
// ============================================================================

/**
 * Section 5.1: شاخص تحقق زمان مطالعه
 * T = min(100, (زمان واقعی مطالعه ÷ زمان هدف مطالعه) × 100)
 */
export function calculateStudyTimeIndexT(
  actualStudyMinutes: number,
  targetStudyMinutes: number | null | undefined
): number | null {
  const target = Number(targetStudyMinutes || 0);
  if (target <= 0) return null;
  const actual = Math.max(0, Number(actualStudyMinutes || 0));
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Section 5.2: شاخص تحقق تست و تمرین
 * Q = min(100, (تعداد واقعی تست ÷ تعداد هدف تست) × 100)
 * If no test target is defined (target <= 0 or null), returns null so it does not artificially score 0.
 */
export function calculateExercisesIndexQ(
  actualExercisesCount: number,
  targetExercisesCount: number | null | undefined
): number | null {
  const target = Number(targetExercisesCount || 0);
  if (target <= 0) return null;
  const actual = Math.max(0, Number(actualExercisesCount || 0));
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Section 5.3: شاخص کیفیت یادگیری (میانگین وزنی بر اساس زمان واقعی فعالیت‌های آموزشی)
 * Returns both 0..10 weighted average and 0..100 scaled score L.
 */
export function calculateWeightedLearningQualityL(
  educationalPlans: DailyPlanItem[]
): {
  weightedAverage0To10: number | null;
  scoreL0To100: number | null;
  evaluatedMinutes: number;
  evaluatedCount: number;
  weightedNumerator: number;
} {
  let weightedNumerator = 0;
  let evaluatedMinutes = 0;
  let fallbackSimpleSum = 0;
  let evaluatedCount = 0;

  for (const plan of educationalPlans) {
    if (Number(plan.is_study) !== 1 || !plan.performance) continue;
    const q = parseLearningQuality0To10(plan.performance.learning_quality);
    if (q === null) continue;

    const actMins = Math.max(0, Number(plan.performance.actual_minutes || 0));
    evaluatedCount += 1;
    fallbackSimpleSum += q;
    if (actMins > 0) {
      weightedNumerator += q * actMins;
      evaluatedMinutes += actMins;
    }
  }

  if (evaluatedCount === 0) {
    return {
      weightedAverage0To10: null,
      scoreL0To100: null,
      evaluatedMinutes: 0,
      evaluatedCount: 0,
      weightedNumerator: 0,
    };
  }

  const rawAvg =
    evaluatedMinutes > 0
      ? weightedNumerator / evaluatedMinutes
      : fallbackSimpleSum / evaluatedCount;

  const rounded0To10 = Math.round(rawAvg * 10) / 10;
  const scoreL0To100 = Math.min(100, Math.max(0, Math.round(rawAvg * 10)));

  return {
    weightedAverage0To10: rounded0To10,
    scoreL0To100,
    evaluatedMinutes,
    evaluatedCount,
    weightedNumerator,
  };
}

/**
 * Section 5.4: امتیاز ترکیبی عملکرد آموزشی
 * E = (T × 0.4) + (Q × 0.3) + (L × 0.3)
 * Dynamically normalizes weights if any component is not calculable (null).
 */
export function calculateEducationalCompositeScoreE(
  T: number | null,
  Q: number | null,
  L: number | null,
  hasLoggedEducationalActivity: boolean,
  weights: AnalyticsWeightsConfig = DEFAULT_ANALYTICS_WEIGHTS
): number | null {
  if (!hasLoggedEducationalActivity) return null;

  const components: Array<{ val: number; w: number }> = [];
  if (T !== null) components.push({ val: T, w: weights.studyTimeWeight });
  if (Q !== null) components.push({ val: Q, w: weights.exercisesWeight });
  if (L !== null) components.push({ val: L, w: weights.learningQualityWeight });

  if (components.length === 0) return null;

  const totalWeight = components.reduce((acc, c) => acc + c.w, 0);
  if (totalWeight <= 0) return null;

  const weightedSum = components.reduce((acc, c) => acc + c.val * c.w, 0);
  return Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
}

/**
 * Section 6.2: امتیاز پایبندی برای هر فعالیت محدودشونده
 * C_i = min(100, (زمان مجاز ÷ زمان واقعی) × 100)
 */
export function calculateSingleRestrictedAdherenceCi(
  allowedMinutes: number,
  actualMinutes: number
): number | null {
  const allowed = Math.max(0, Number(allowedMinutes || 0));
  const actual = Math.max(0, Number(actualMinutes || 0));

  if (allowed === 0 && actual === 0) return null;
  if (allowed === 0 && actual > 0) return 0;
  if (allowed > 0 && actual === 0) return 100;

  return Math.min(100, Math.round((allowed / actual) * 100));
}

export interface RestrictedActivityEvaluationItem {
  planId: string;
  title: string;
  allowedMinutes: number;
  actualMinutes: number;
  overuseMinutes: number;
  adherenceScoreCi: number;
  impactWeight: number;
}

/**
 * Section 7: محاسبه شاخص کنترل فعالیت‌های محدودشونده (C)
 * Weighted average of C_i across all logged restricted activities for the day.
 */
export function calculateRestrictedControlIndexC(
  restrictedPlans: DailyPlanItem[],
  categoriesMap?: Map<string, ActivityCategory>
): {
  scoreC: number | null;
  items: RestrictedActivityEvaluationItem[];
  totalAllowedMinutes: number;
  totalActualMinutes: number;
  totalOveruseMinutes: number;
} {
  const items: RestrictedActivityEvaluationItem[] = [];
  let weightedSum = 0;
  let weightTotal = 0;
  let totalAllowedMinutes = 0;
  let totalActualMinutes = 0;
  let totalOveruseMinutes = 0;

  for (const plan of restrictedPlans) {
    const allowed = Math.max(
      0,
      Number(plan.initial_predicted_minutes || plan.predicted_minutes || 0)
    );
    // Only evaluate restricted activities that have logged performance
    if (!plan.performance) {
      continue;
    }
    const actual = Math.max(0, Number(plan.performance.actual_minutes || 0));
    const Ci = calculateSingleRestrictedAdherenceCi(allowed, actual);
    if (Ci === null) continue;

    const cat = categoriesMap?.get(plan.category_id);
    const impactWeight = Number(cat?.impact_weight || 1.0);
    // Weight proportional to allowed minutes (or actual if allowed is 0) * impactWeight
    const w = Math.max(1, allowed > 0 ? allowed : actual) * impactWeight;

    const overuse = Math.max(0, actual - allowed);
    totalAllowedMinutes += allowed;
    totalActualMinutes += actual;
    totalOveruseMinutes += overuse;

    weightedSum += Ci * w;
    weightTotal += w;

    items.push({
      planId: plan.id,
      title: plan.category_title_snapshot || 'سرگرمی',
      allowedMinutes: allowed,
      actualMinutes: actual,
      overuseMinutes: overuse,
      adherenceScoreCi: Ci,
      impactWeight,
    });
  }

  if (items.length === 0 || weightTotal <= 0) {
    return {
      scoreC: null,
      items: [],
      totalAllowedMinutes: 0,
      totalActualMinutes: 0,
      totalOveruseMinutes: 0,
    };
  }

  return {
    scoreC: Math.min(100, Math.max(0, Math.round(weightedSum / weightTotal))),
    items,
    totalAllowedMinutes,
    totalActualMinutes,
    totalOveruseMinutes,
  };
}

/**
 * Section 8: محاسبه امتیاز نهایی روزانه
 * D (یا S) = (E × 0.8) + (C × 0.2)
 * - If both E and C are null -> returns null («داده کافی وجود ندارد»).
 * - If C is null -> S = E (normalized automatically).
 * - If E is null -> S = C (normalized automatically).
 */
export function calculateFinalDailyScoreS(
  E: number | null,
  C: number | null,
  weights: AnalyticsWeightsConfig = DEFAULT_ANALYTICS_WEIGHTS
): number | null {
  if (E === null && C === null) return null;
  if (E !== null && C === null) return Math.round(E);
  if (E === null && C !== null) return Math.round(C);

  const wE = weights.educationalCompositeWeight;
  const wC = weights.restrictedControlWeight;
  const totalW = wE + wC;
  if (totalW <= 0) return Math.round(E!);

  return Math.min(100, Math.max(0, Math.round((E! * wE + C! * wC) / totalW)));
}

// ============================================================================
// 7. COMPREHENSIVE DAILY EVALUATION & TIME BUDGET ENGINE (Section 5-9)
// ============================================================================
export interface DailyPerformanceEvaluation {
  dateIso: string;
  jalaliCompact: string;
  jalaliFull: string;
  weekdayName: string;

  // Activity counts
  totalPlansCount: number;
  completedCount: number;
  partialCount: number;
  pendingCount: number;

  // Educational metrics
  educationalPlansCount: number;
  loggedEducationalCount: number;
  predictedStudyMinutes: number;
  targetStudyMinutes: number;
  actualStudyMinutes: number;
  studyVarianceMinutes: number;
  targetExercisesCount: number | null;
  actualExercisesCount: number;

  // Educational component scores
  studyTimeIndexT: number | null; // 0..100
  exercisesIndexQ: number | null; // 0..100
  learningQuality0To10: number | null; // 0..10
  learningQualityIndexL: number | null; // 0..100
  learningQualityEvaluatedMinutes: number;
  learningQualityWeightedNumerator: number;
  educationalCompositeE: number | null; // 0..100

  // Restricted activities metrics & control score
  restrictedPlannedMinutes: number;
  restrictedAllowedLoggedMinutes: number;
  restrictedActualMinutes: number;
  restrictedOveruseMinutes: number;
  restrictedControlIndexC: number | null; // 0..100
  restrictedItems: RestrictedActivityEvaluationItem[];

  // Essential / Recovery activities metrics
  essentialPlannedMinutes: number;
  essentialActualMinutes: number;

  // Final Daily Score S (0..100)
  finalDailyScoreS: number | null;
  hasSufficientEducationalData: boolean;

  // Section 9: Daily Time Budget (ظرف زمانی روز)
  budgetMinutes: number | null;
  totalPlannedAllMinutes: number;
  unallocatedPlannedMinutes: number | null;
  plannedOverBudgetMinutes: number | null;
  totalActualAllMinutes: number;
  remainingActualBudgetMinutes: number | null;
  actualOverBudgetMinutes: number | null;
  studyShareOfBudgetPct: number | null;
  restrictedShareOfBudgetPct: number | null;
  essentialShareOfBudgetPct: number | null;
}

export function evaluateDayPerformance(params: {
  dateIso: string;
  plans: DailyPlanItem[];
  budgetConfig?: DailyTimeBudgetConfig | null;
  goalConfig?: DailyStudyGoalConfig | null;
  categoriesMap?: Map<string, ActivityCategory>;
  weights?: AnalyticsWeightsConfig;
}): DailyPerformanceEvaluation {
  const {
    dateIso,
    plans,
    budgetConfig,
    goalConfig,
    categoriesMap,
    weights = DEFAULT_ANALYTICS_WEIGHTS,
  } = params;

  const dayPlans = plans.filter((p) => p.plan_date === dateIso);

  const educationalPlans: DailyPlanItem[] = [];
  const restrictedPlans: DailyPlanItem[] = [];
  const essentialPlans: DailyPlanItem[] = [];

  let completedCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  for (const plan of dayPlans) {
    if (plan.status === 'completed') completedCount++;
    else if (plan.status === 'partial') partialCount++;
    else pendingCount++;

    const group = classifyPlanActivityGroup(plan, categoriesMap);
    if (group === 'educational') educationalPlans.push(plan);
    else if (group === 'restricted') restrictedPlans.push(plan);
    else essentialPlans.push(plan);
  }

  // Educational calculations
  const predictedStudyMinutes = educationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );

  const loggedEducationalPlans = educationalPlans.filter((p) => Boolean(p.performance));
  const actualStudyMinutes = loggedEducationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.actual_minutes || 0)),
    0
  );

  // Target study minutes: use planned initial_predicted_minutes if > 0; otherwise fallback to goalConfig if educational plans exist
  const targetStudyMinutes =
    predictedStudyMinutes > 0
      ? predictedStudyMinutes
      : educationalPlans.length > 0 && goalConfig?.target_study_minutes
      ? goalConfig.target_study_minutes
      : 0;

  const actualExercisesCount = loggedEducationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.exercises_count || 0)),
    0
  );

  // Target exercises count:
  // Check if any educational plan has explicit target_exercises > 0, or if goalConfig has target_exercises_count when exercises were solved
  const planLevelTargetExercises = educationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.target_exercises || 0)),
    0
  );
  let targetExercisesCount: number | null = null;
  if (planLevelTargetExercises > 0) {
    targetExercisesCount = planLevelTargetExercises;
  } else if (
    loggedEducationalPlans.some((p) => (p.performance?.exercises_count ?? 0) > 0) &&
    goalConfig &&
    goalConfig.target_exercises_count > 0
  ) {
    targetExercisesCount = goalConfig.target_exercises_count;
  }

  const hasSufficientEducationalData = loggedEducationalPlans.length > 0;

  const studyTimeIndexT = hasSufficientEducationalData
    ? calculateStudyTimeIndexT(actualStudyMinutes, targetStudyMinutes)
    : null;

  const exercisesIndexQ = hasSufficientEducationalData
    ? calculateExercisesIndexQ(actualExercisesCount, targetExercisesCount)
    : null;

  const qualityResult = calculateWeightedLearningQualityL(educationalPlans);

  const educationalCompositeE = calculateEducationalCompositeScoreE(
    studyTimeIndexT,
    exercisesIndexQ,
    qualityResult.scoreL0To100,
    hasSufficientEducationalData,
    weights
  );

  // Restricted activities calculations
  const restrictedPlannedMinutes = restrictedPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );
  const restrictedEval = calculateRestrictedControlIndexC(restrictedPlans, categoriesMap);

  // Essential activities calculations
  const essentialPlannedMinutes = essentialPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );
  const essentialActualMinutes = essentialPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.actual_minutes || 0)),
    0
  );

  // Final Daily Score S
  const finalDailyScoreS = calculateFinalDailyScoreS(
    educationalCompositeE,
    restrictedEval.scoreC,
    weights
  );

  // Daily Time Budget calculations (Section 9)
  const budgetMinutes =
    budgetConfig && budgetConfig.budget_minutes && budgetConfig.budget_minutes > 0
      ? Number(budgetConfig.budget_minutes)
      : null;

  const totalPlannedAllMinutes =
    predictedStudyMinutes + restrictedPlannedMinutes + essentialPlannedMinutes;

  const totalActualAllMinutes =
    actualStudyMinutes + restrictedEval.totalActualMinutes + essentialActualMinutes;

  const unallocatedPlannedMinutes =
    budgetMinutes !== null ? Math.max(0, budgetMinutes - totalPlannedAllMinutes) : null;
  const plannedOverBudgetMinutes =
    budgetMinutes !== null && totalPlannedAllMinutes > budgetMinutes
      ? totalPlannedAllMinutes - budgetMinutes
      : null;

  const remainingActualBudgetMinutes =
    budgetMinutes !== null ? Math.max(0, budgetMinutes - totalActualAllMinutes) : null;
  const actualOverBudgetMinutes =
    budgetMinutes !== null && totalActualAllMinutes > budgetMinutes
      ? totalActualAllMinutes - budgetMinutes
      : null;

  const studyShareOfBudgetPct =
    budgetMinutes !== null && budgetMinutes > 0
      ? Math.round((actualStudyMinutes / budgetMinutes) * 1000) / 10
      : null;

  const restrictedShareOfBudgetPct =
    budgetMinutes !== null && budgetMinutes > 0
      ? Math.round((restrictedEval.totalActualMinutes / budgetMinutes) * 1000) / 10
      : null;

  const essentialShareOfBudgetPct =
    budgetMinutes !== null && budgetMinutes > 0
      ? Math.round((essentialActualMinutes / budgetMinutes) * 1000) / 10
      : null;

  return {
    dateIso,
    jalaliCompact: formatJalaliCompact(dateIso),
    jalaliFull: formatJalaliFull(dateIso),
    weekdayName: getPersianWeekdayName(dateIso),

    totalPlansCount: dayPlans.length,
    completedCount,
    partialCount,
    pendingCount,

    educationalPlansCount: educationalPlans.length,
    loggedEducationalCount: loggedEducationalPlans.length,
    predictedStudyMinutes,
    targetStudyMinutes,
    actualStudyMinutes,
    studyVarianceMinutes: actualStudyMinutes - predictedStudyMinutes,
    targetExercisesCount,
    actualExercisesCount,

    studyTimeIndexT,
    exercisesIndexQ,
    learningQuality0To10: qualityResult.weightedAverage0To10,
    learningQualityIndexL: qualityResult.scoreL0To100,
    learningQualityEvaluatedMinutes: qualityResult.evaluatedMinutes,
    learningQualityWeightedNumerator: qualityResult.weightedNumerator,
    educationalCompositeE,

    restrictedPlannedMinutes,
    restrictedAllowedLoggedMinutes: restrictedEval.totalAllowedMinutes,
    restrictedActualMinutes: restrictedEval.totalActualMinutes,
    restrictedOveruseMinutes: restrictedEval.totalOveruseMinutes,
    restrictedControlIndexC: restrictedEval.scoreC,
    restrictedItems: restrictedEval.items,

    essentialPlannedMinutes,
    essentialActualMinutes,

    finalDailyScoreS,
    hasSufficientEducationalData,

    budgetMinutes,
    totalPlannedAllMinutes,
    unallocatedPlannedMinutes,
    plannedOverBudgetMinutes,
    totalActualAllMinutes,
    remainingActualBudgetMinutes,
    actualOverBudgetMinutes,
    studyShareOfBudgetPct,
    restrictedShareOfBudgetPct,
    essentialShareOfBudgetPct,
  };
}

// ============================================================================
// 8. PERIOD AGGREGATION & COMPARISON ENGINE (Section 10 & Section 11)
// ============================================================================
export interface PeriodPerformanceSummary {
  startDateIso: string;
  endDateIso: string;
  daysCount: number;
  dailyEvaluations: DailyPerformanceEvaluation[];

  // Totals & Averages (Section 10.8)
  totalStudyMinutes: number;
  totalPredictedStudyMinutes: number;
  avgDailyStudyMinutes: number;
  maxStudyDay: DailyPerformanceEvaluation | null;
  minStudyDay: DailyPerformanceEvaluation | null;

  totalExercisesCount: number;
  totalTargetExercisesCount: number;

  // True weighted average quality across the entire period (0..10)
  weightedLearningQuality0To10: number | null;

  // Average Final Daily Score S across valid days
  averageFinalScoreS: number | null;
  validScoreDaysCount: number;
  bestScoreDay: DailyPerformanceEvaluation | null;
  weakestScoreDay: DailyPerformanceEvaluation | null;

  // True ratio of study time to total budget on days with defined budget (Section 10.8)
  studyShareOfBudgetPct: number | null;
  validBudgetDaysCount: number;
  totalBudgetMinutesOnValidDays: number;
  totalStudyMinutesOnBudgetedDays: number;
  totalRestrictedMinutesOnBudgetedDays: number;
  totalEssentialMinutesOnBudgetedDays: number;
  totalUnallocatedMinutesOnBudgetedDays: number;

  // Restricted Entertainment Totals & Averages
  totalRestrictedAllowedMinutes: number;
  totalRestrictedActualMinutes: number;
  totalRestrictedOveruseMinutes: number;
  avgDailyRestrictedActualMinutes: number;
  averageRestrictedControlIndexC: number | null;

  // Essential Activities Totals
  totalEssentialActualMinutes: number;
}

export function evaluatePeriodPerformance(params: {
  dateIsoList: string[];
  plans: DailyPlanItem[];
  budgetsMap: Map<string, DailyTimeBudgetConfig>;
  goalsMap?: Map<string, DailyStudyGoalConfig>;
  categoriesMap?: Map<string, ActivityCategory>;
  weights?: AnalyticsWeightsConfig;
}): PeriodPerformanceSummary {
  const {
    dateIsoList,
    plans,
    budgetsMap,
    goalsMap,
    categoriesMap,
    weights = DEFAULT_ANALYTICS_WEIGHTS,
  } = params;

  const plansByDateMap = new Map<string, DailyPlanItem[]>();
  for (const p of plans) {
    const bucket = plansByDateMap.get(p.plan_date);
    if (bucket) {
      bucket.push(p);
    } else {
      plansByDateMap.set(p.plan_date, [p]);
    }
  }

  const dailyEvaluations = dateIsoList.map((dateIso) =>
    evaluateDayPerformance({
      dateIso,
      plans: plansByDateMap.get(dateIso) || [],
      budgetConfig: budgetsMap.get(dateIso) || null,
      goalConfig: goalsMap?.get(dateIso) || null,
      categoriesMap,
      weights,
    })
  );

  let totalStudyMinutes = 0;
  let totalPredictedStudyMinutes = 0;
  let totalExercisesCount = 0;
  let totalTargetExercisesCount = 0;

  let qualityWeightedNum = 0;
  let qualityEvalMins = 0;
  let qualitySimpleSum = 0;
  let qualitySimpleDays = 0;

  let scoreSSum = 0;
  let validScoreDaysCount = 0;

  let validBudgetDaysCount = 0;
  let totalBudgetMinutesOnValidDays = 0;
  let totalStudyMinutesOnBudgetedDays = 0;
  let totalRestrictedMinutesOnBudgetedDays = 0;
  let totalEssentialMinutesOnBudgetedDays = 0;

  let totalRestrictedAllowedMinutes = 0;
  let totalRestrictedActualMinutes = 0;
  let totalRestrictedOveruseMinutes = 0;
  let restrictedCSum = 0;
  let restrictedCDays = 0;

  let totalEssentialActualMinutes = 0;

  for (const d of dailyEvaluations) {
    totalStudyMinutes += d.actualStudyMinutes;
    totalPredictedStudyMinutes += d.predictedStudyMinutes;
    totalExercisesCount += d.actualExercisesCount;
    if (d.targetExercisesCount !== null) {
      totalTargetExercisesCount += d.targetExercisesCount;
    }

    if (d.learningQuality0To10 !== null) {
      qualityWeightedNum += d.learningQualityWeightedNumerator;
      qualityEvalMins += d.learningQualityEvaluatedMinutes;
      qualitySimpleSum += d.learningQuality0To10;
      qualitySimpleDays += 1;
    }

    if (d.finalDailyScoreS !== null) {
      scoreSSum += d.finalDailyScoreS;
      validScoreDaysCount += 1;
    }

    if (d.budgetMinutes !== null && d.budgetMinutes > 0) {
      validBudgetDaysCount += 1;
      totalBudgetMinutesOnValidDays += d.budgetMinutes;
      totalStudyMinutesOnBudgetedDays += d.actualStudyMinutes;
      totalRestrictedMinutesOnBudgetedDays += d.restrictedActualMinutes;
      totalEssentialMinutesOnBudgetedDays += d.essentialActualMinutes;
    }

    totalRestrictedAllowedMinutes += d.restrictedAllowedLoggedMinutes || d.restrictedPlannedMinutes;
    totalRestrictedActualMinutes += d.restrictedActualMinutes;
    totalRestrictedOveruseMinutes += d.restrictedOveruseMinutes;
    if (d.restrictedControlIndexC !== null) {
      restrictedCSum += d.restrictedControlIndexC;
      restrictedCDays += 1;
    }

    totalEssentialActualMinutes += d.essentialActualMinutes;
  }

  const daysCount = Math.max(1, dailyEvaluations.length);
  const activeStudyDays = dailyEvaluations.filter(
    (d) => d.actualStudyMinutes > 0 || d.educationalPlansCount > 0
  );

  const maxStudyDay =
    activeStudyDays.length > 0
      ? [...activeStudyDays].sort((a, b) => b.actualStudyMinutes - a.actualStudyMinutes)[0]
      : null;
  const minStudyDay =
    activeStudyDays.length > 0
      ? [...activeStudyDays].sort((a, b) => a.actualStudyMinutes - b.actualStudyMinutes)[0]
      : null;

  const scoredDays = dailyEvaluations.filter((d) => d.finalDailyScoreS !== null);
  const bestScoreDay =
    scoredDays.length > 0
      ? [...scoredDays].sort((a, b) => (b.finalDailyScoreS ?? 0) - (a.finalDailyScoreS ?? 0))[0]
      : null;
  const weakestScoreDay =
    scoredDays.length > 0
      ? [...scoredDays].sort((a, b) => (a.finalDailyScoreS ?? 0) - (b.finalDailyScoreS ?? 0))[0]
      : null;

  const weightedLearningQuality0To10 =
    qualityEvalMins > 0
      ? Math.round((qualityWeightedNum / qualityEvalMins) * 10) / 10
      : qualitySimpleDays > 0
      ? Math.round((qualitySimpleSum / qualitySimpleDays) * 10) / 10
      : null;

  const averageFinalScoreS =
    validScoreDaysCount > 0 ? Math.round((scoreSSum / validScoreDaysCount) * 10) / 10 : null;

  const studyShareOfBudgetPct =
    totalBudgetMinutesOnValidDays > 0
      ? Math.round((totalStudyMinutesOnBudgetedDays / totalBudgetMinutesOnValidDays) * 1000) / 10
      : null;

  const totalAllocatedActualOnBudgetedDays =
    totalStudyMinutesOnBudgetedDays +
    totalRestrictedMinutesOnBudgetedDays +
    totalEssentialMinutesOnBudgetedDays;

  const totalUnallocatedMinutesOnBudgetedDays = Math.max(
    0,
    totalBudgetMinutesOnValidDays - totalAllocatedActualOnBudgetedDays
  );

  const averageRestrictedControlIndexC =
    restrictedCDays > 0 ? Math.round(restrictedCSum / restrictedCDays) : null;

  return {
    startDateIso: dateIsoList[0] || '',
    endDateIso: dateIsoList[dateIsoList.length - 1] || '',
    daysCount: dailyEvaluations.length,
    dailyEvaluations,

    totalStudyMinutes,
    totalPredictedStudyMinutes,
    avgDailyStudyMinutes: Math.round(totalStudyMinutes / daysCount),
    maxStudyDay,
    minStudyDay,

    totalExercisesCount,
    totalTargetExercisesCount,

    weightedLearningQuality0To10,

    averageFinalScoreS,
    validScoreDaysCount,
    bestScoreDay,
    weakestScoreDay,

    studyShareOfBudgetPct,
    validBudgetDaysCount,
    totalBudgetMinutesOnValidDays,
    totalStudyMinutesOnBudgetedDays,
    totalRestrictedMinutesOnBudgetedDays,
    totalEssentialMinutesOnBudgetedDays,
    totalUnallocatedMinutesOnBudgetedDays,

    totalRestrictedAllowedMinutes,
    totalRestrictedActualMinutes,
    totalRestrictedOveruseMinutes,
    avgDailyRestrictedActualMinutes: Math.round(totalRestrictedActualMinutes / daysCount),
    averageRestrictedControlIndexC,

    totalEssentialActualMinutes,
  };
}

export interface MetricComparisonDelta {
  baseValue: number | null;
  targetValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null; // null if baseValue is 0 or null (prevents division by zero!)
  isBaseZero: boolean;
}

function computeSafeDelta(
  baseVal: number | null,
  currentVal: number | null
): MetricComparisonDelta {
  if (baseVal === null || currentVal === null) {
    return {
      baseValue: baseVal,
      targetValue: currentVal,
      absoluteChange: null,
      percentChange: null,
      isBaseZero: baseVal === 0,
    };
  }
  const abs = Math.round((currentVal - baseVal) * 10) / 10;
  if (baseVal === 0) {
    return {
      baseValue: 0,
      targetValue: currentVal,
      absoluteChange: abs,
      percentChange: null, // Safe guard against division by zero (Section 10.9)
      isBaseZero: true,
    };
  }
  const pct = Math.round(((currentVal - baseVal) / Math.abs(baseVal)) * 1000) / 10;
  return {
    baseValue: baseVal,
    targetValue: currentVal,
    absoluteChange: abs,
    percentChange: pct,
    isBaseZero: false,
  };
}

export interface PeriodComparisonResult {
  basePeriod: PeriodPerformanceSummary;
  currentPeriod: PeriodPerformanceSummary;
  studyMinutesDelta: MetricComparisonDelta;
  exercisesCountDelta: MetricComparisonDelta;
  learningQualityDelta: MetricComparisonDelta;
  finalScoreDelta: MetricComparisonDelta;
  studyBudgetShareDelta: MetricComparisonDelta;
  restrictedTimeDelta: MetricComparisonDelta;
}

export function compareTwoPeriods(
  basePeriod: PeriodPerformanceSummary,
  currentPeriod: PeriodPerformanceSummary
): PeriodComparisonResult {
  return {
    basePeriod,
    currentPeriod,
    studyMinutesDelta: computeSafeDelta(
      basePeriod.totalStudyMinutes,
      currentPeriod.totalStudyMinutes
    ),
    exercisesCountDelta: computeSafeDelta(
      basePeriod.totalExercisesCount,
      currentPeriod.totalExercisesCount
    ),
    learningQualityDelta: computeSafeDelta(
      basePeriod.weightedLearningQuality0To10,
      currentPeriod.weightedLearningQuality0To10
    ),
    finalScoreDelta: computeSafeDelta(
      basePeriod.averageFinalScoreS,
      currentPeriod.averageFinalScoreS
    ),
     studyBudgetShareDelta: computeSafeDelta(
      basePeriod.studyShareOfBudgetPct,
      currentPeriod.studyShareOfBudgetPct
    ),
    restrictedTimeDelta: computeSafeDelta(
      basePeriod.totalRestrictedActualMinutes,
      currentPeriod.totalRestrictedActualMinutes
    ),
  };
}

// ============================================================================
// 9. UNIFIED 1/10 XP ENGINE & 13-LEVEL × 3-STEP (39 STAGES) PROGRESSION SYSTEM
// ============================================================================
export const XP_SCALE_WEIGHTS = {
  COMPLETED_ACTIVITY: 5,
  PARTIAL_ACTIVITY: 2.5,
  STUDY_MINUTES_DIVISOR: 50, // 0.02 XP per actual study minute (1/10th of /5)
  EXERCISE_UNIT: 0.2,
  QUALITY_POINT_MULTIPLIER: 0.2, // max 2 XP per evaluated session (10 * 0.2)
} as const;

export function roundXp2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export interface XpBreakdown {
  totalXp: number;
  completedActivitiesXp: number;
  partialActivitiesXp: number;
  studyMinutesXp: number;
  exercisesXp: number;
  qualityBonusXp: number;
  completedCount: number;
  partialCount: number;
  actualStudyMinutes: number;
  exercisesCount: number;
  qualityEvaluatedCount: number;
}

export interface LevelVisualPalette {
  primaryHex: string;
  secondaryHex: string;
  glowHex: string;
  badgeTextHex: string;
  cardBgClass: string;
  cardBorderClass: string;
  barGradientClass: string;
  accentTextClass: string;
  pillBgClass: string;
  stepActiveClass: string;
  isDarkLuxury?: boolean;
}

export interface LevelCatalogEntry {
  levelNumber: number; // 1..13
  nameFa: string;
  nameEn: string;
  honoraryTitle: string;
  palette: LevelVisualPalette;
}

export type StepTierNumber = 1 | 2 | 3;

export interface ProgressionStageMeta {
  stageNumber: number; // 1..39
  levelNumber: number; // 1..13
  stepNumber: StepTierNumber; // 1 | 2 | 3
  levelNameFa: string;
  levelNameEn: string;
  honoraryTitle: string;
  stageNameEn: string; // e.g., "Diamond Plus"
  stageNameFa: string; // e.g., "الماس پلاس"
  stepSuffixEn: '' | 'Plus' | 'Star';
  stepSuffixFa: '' | 'پلاس' | 'استار';
  stepLabelFa: string; // "پله ۱ از ۳" | "پله ۲ از ۳" | "پله ۳ از ۳"
  stepOrdinalFa: string; // "پله اول از سه پله" | "پله دوم از سه پله" | "پله سوم از سه پله"
  minXp: number;
  nextStageMinXp: number | null; // null on Stage 39
  palette: LevelVisualPalette;
}

export interface UserLevelProgress {
  // Core 13-Level × 3-Step (39-Stage) Identity
  stageNumber: number; // 1..39
  totalStages: 39;
  level: number; // 1..13
  stepNumber: StepTierNumber; // 1 | 2 | 3
  levelNameFa: string;
  levelNameEn: string;
  honoraryTitle: string;
  stageNameEn: string; // e.g. "Diamond Plus"
  stageNameFa: string; // e.g. "الماس پلاس"
  stepSuffixEn: '' | 'Plus' | 'Star';
  stepLabelFa: string; // "پله ۲ از ۳"
  stepOrdinalFa: string; // "پله دوم از سه پله"
  palette: LevelVisualPalette;

  // Next Stage Info
  isMaxStage: boolean;
  nextStageNumber: number | null;
  nextLevel: number | null;
  nextStageNameEn: string | null;
  nextStageNameFa: string | null;
  nextStepLabelFa: string | null;

  // Compatibility aliases & Progress Metrics
  rankTitle: string;
  nextRankTitle: string;
  rankBadgeEmoji: string;
  allTimeXp: number;
  currentLevelStartXp: number; // current stage start XP threshold
  nextLevelTargetXp: number; // next stage XP threshold (equals currentLevelStartXp on Stage 39)
  xpInCurrentLevel: number; // XP earned inside current step
  xpRequiredForCurrentStep: number; // span required to complete current step
  xpRemainingToNextLevel: number; // XP left to next step (0 on Stage 39)
  progressPercentage: number; // 0..100 (100 on Stage 39)
}

export const PROGRESSION_LEVELS_13: readonly LevelCatalogEntry[] = [
  {
    levelNumber: 1,
    nameFa: 'سنگ',
    nameEn: 'Stone',
    honoraryTitle: 'آغازگر مسیر',
    palette: {
      primaryHex: '#78716c',
      secondaryHex: '#57534e',
      glowHex: 'rgba(120, 113, 108, 0.22)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-stone-100/90 via-white to-stone-100/60 dark:from-stone-900/90 dark:via-slate-900 dark:to-stone-950/80',
      cardBorderClass: 'border-stone-300/90 dark:border-stone-700/80',
      barGradientClass: 'from-stone-400 via-stone-500 to-stone-600',
      accentTextClass: 'text-stone-700 dark:text-stone-300',
      pillBgClass: 'bg-stone-200/80 dark:bg-stone-800/90 text-stone-800 dark:text-stone-200',
      stepActiveClass: 'bg-stone-600 text-white',
    },
  },
  {
    levelNumber: 2,
    nameFa: 'مس',
    nameEn: 'Copper',
    honoraryTitle: 'در حال پیشرفت',
    palette: {
      primaryHex: '#c26d3a',
      secondaryHex: '#9a4d22',
      glowHex: 'rgba(194, 109, 58, 0.24)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-orange-50/90 via-white to-amber-50/60 dark:from-orange-950/45 dark:via-slate-900 dark:to-amber-950/35',
      cardBorderClass: 'border-orange-300/80 dark:border-orange-800/70',
      barGradientClass: 'from-orange-400 via-amber-600 to-orange-700',
      accentTextClass: 'text-orange-700 dark:text-orange-300',
      pillBgClass: 'bg-orange-100/90 dark:bg-orange-950/70 text-orange-800 dark:text-orange-200',
      stepActiveClass: 'bg-orange-600 text-white',
    },
  },
  {
    levelNumber: 3,
    nameFa: 'آهن',
    nameEn: 'Iron',
    honoraryTitle: 'پرتلاش و استوار',
    palette: {
      primaryHex: '#64748b',
      secondaryHex: '#475569',
      glowHex: 'rgba(100, 116, 139, 0.24)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-slate-100/95 via-white to-zinc-100/75 dark:from-slate-800/75 dark:via-slate-900 dark:to-zinc-900/75',
      cardBorderClass: 'border-slate-300/90 dark:border-slate-700',
      barGradientClass: 'from-slate-400 via-slate-500 to-zinc-600',
      accentTextClass: 'text-slate-700 dark:text-slate-300',
      pillBgClass: 'bg-slate-200/85 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      stepActiveClass: 'bg-slate-600 text-white',
    },
  },
  {
    levelNumber: 4,
    nameFa: 'برنز',
    nameEn: 'Bronze',
    honoraryTitle: 'تلاشگر پیگیر',
    palette: {
      primaryHex: '#b45309',
      secondaryHex: '#78350f',
      glowHex: 'rgba(180, 83, 9, 0.25)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-amber-100/75 via-white to-orange-100/55 dark:from-amber-950/45 dark:via-slate-900 dark:to-stone-950/60',
      cardBorderClass: 'border-amber-300/85 dark:border-amber-800/70',
      barGradientClass: 'from-amber-500 via-amber-700 to-yellow-800',
      accentTextClass: 'text-amber-800 dark:text-amber-300',
      pillBgClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200',
      stepActiveClass: 'bg-amber-700 text-white',
    },
  },
  {
    levelNumber: 5,
    nameFa: 'نیکل',
    nameEn: 'Nickel',
    honoraryTitle: 'متعهد به پیشرفت',
    palette: {
      primaryHex: '#7c8b99',
      secondaryHex: '#52606d',
      glowHex: 'rgba(124, 139, 153, 0.24)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-zinc-100/90 via-slate-50 to-slate-200/60 dark:from-zinc-900/80 dark:via-slate-900 dark:to-slate-800/65',
      cardBorderClass: 'border-zinc-300 dark:border-zinc-700',
      barGradientClass: 'from-zinc-400 via-slate-400 to-slate-600',
      accentTextClass: 'text-zinc-700 dark:text-zinc-300',
      pillBgClass: 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
      stepActiveClass: 'bg-zinc-600 text-white',
    },
  },
  {
    levelNumber: 6,
    nameFa: 'نقره',
    nameEn: 'Silver',
    honoraryTitle: 'پیشرو',
    palette: {
      primaryHex: '#94a3b8',
      secondaryHex: '#64748b',
      glowHex: 'rgba(148, 163, 184, 0.30)',
      badgeTextHex: '#0f172a',
      cardBgClass:
        'from-slate-200/70 via-white to-sky-50/55 dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-800/50',
      cardBorderClass: 'border-slate-300 dark:border-slate-600',
      barGradientClass: 'from-slate-300 via-slate-400 to-sky-500',
      accentTextClass: 'text-slate-700 dark:text-slate-200',
      pillBgClass: 'bg-slate-200/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100',
      stepActiveClass: 'bg-slate-500 text-white',
    },
  },
  {
    levelNumber: 7,
    nameFa: 'تیتانیوم',
    nameEn: 'Titanium',
    honoraryTitle: 'توانمند',
    palette: {
      primaryHex: '#4f6d8a',
      secondaryHex: '#334e68',
      glowHex: 'rgba(79, 109, 138, 0.28)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-sky-100/75 via-white to-slate-100/80 dark:from-sky-950/45 dark:via-slate-900 dark:to-slate-800/70',
      cardBorderClass: 'border-sky-300/80 dark:border-sky-800/70',
      barGradientClass: 'from-sky-400 via-slate-500 to-indigo-600',
      accentTextClass: 'text-sky-800 dark:text-sky-300',
      pillBgClass: 'bg-sky-100/90 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200',
      stepActiveClass: 'bg-sky-700 text-white',
    },
  },
  {
    levelNumber: 8,
    nameFa: 'طلا',
    nameEn: 'Gold',
    honoraryTitle: 'درخشان',
    palette: {
      primaryHex: '#eab308',
      secondaryHex: '#ca8a04',
      glowHex: 'rgba(234, 179, 8, 0.30)',
      badgeTextHex: '#1e1b0d',
      cardBgClass:
        'from-yellow-100/85 via-white to-amber-50/80 dark:from-amber-950/45 dark:via-slate-900 dark:to-yellow-950/35',
      cardBorderClass: 'border-amber-300/90 dark:border-amber-700/70',
      barGradientClass: 'from-yellow-400 via-amber-500 to-orange-500',
      accentTextClass: 'text-amber-700 dark:text-amber-300',
      pillBgClass: 'bg-amber-100 dark:bg-amber-950/75 text-amber-900 dark:text-amber-200',
      stepActiveClass: 'bg-amber-500 text-slate-950',
    },
  },
  {
    levelNumber: 9,
    nameFa: 'زمرد',
    nameEn: 'Emerald',
    honoraryTitle: 'برجسته',
    palette: {
      primaryHex: '#10b981',
      secondaryHex: '#047857',
      glowHex: 'rgba(16, 185, 129, 0.28)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-emerald-100/75 via-white to-teal-50/70 dark:from-emerald-950/45 dark:via-slate-900 dark:to-teal-950/35',
      cardBorderClass: 'border-emerald-300/85 dark:border-emerald-800/70',
      barGradientClass: 'from-emerald-400 via-emerald-500 to-teal-600',
      accentTextClass: 'text-emerald-700 dark:text-emerald-300',
      pillBgClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200',
      stepActiveClass: 'bg-emerald-600 text-white',
    },
  },
  {
    levelNumber: 10,
    nameFa: 'پلاتینیوم',
    nameEn: 'Platinum',
    honoraryTitle: 'حرفه‌ای',
    palette: {
      primaryHex: '#06b6d4',
      secondaryHex: '#0e7490',
      glowHex: 'rgba(6, 182, 212, 0.28)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-cyan-100/70 via-white to-indigo-50/70 dark:from-cyan-950/40 dark:via-slate-900 dark:to-indigo-950/40',
      cardBorderClass: 'border-cyan-300/85 dark:border-cyan-800/70',
      barGradientClass: 'from-cyan-400 via-teal-500 to-indigo-500',
      accentTextClass: 'text-cyan-800 dark:text-cyan-300',
      pillBgClass: 'bg-cyan-100/90 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-200',
      stepActiveClass: 'bg-cyan-600 text-white',
    },
  },
  {
    levelNumber: 11,
    nameFa: 'یاقوت',
    nameEn: 'Ruby',
    honoraryTitle: 'نخبه',
    palette: {
      primaryHex: '#e11d48',
      secondaryHex: '#9f1239',
      glowHex: 'rgba(225, 29, 72, 0.28)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-rose-100/80 via-white to-red-50/60 dark:from-rose-950/45 dark:via-slate-900 dark:to-red-950/35',
      cardBorderClass: 'border-rose-300/85 dark:border-rose-800/70',
      barGradientClass: 'from-rose-400 via-rose-600 to-red-700',
      accentTextClass: 'text-rose-700 dark:text-rose-300',
      pillBgClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200',
      stepActiveClass: 'bg-rose-600 text-white',
    },
  },
  {
    levelNumber: 12,
    nameFa: 'الماس',
    nameEn: 'Diamond',
    honoraryTitle: 'استاد',
    palette: {
      primaryHex: '#0284c7',
      secondaryHex: '#2563eb',
      glowHex: 'rgba(56, 189, 248, 0.36)',
      badgeTextHex: '#ffffff',
      cardBgClass:
        'from-sky-100/90 via-white to-blue-100/70 dark:from-sky-950/55 dark:via-slate-900 dark:to-blue-950/50',
      cardBorderClass: 'border-sky-300/90 dark:border-sky-700/80',
      barGradientClass: 'from-sky-300 via-cyan-400 to-blue-600',
      accentTextClass: 'text-sky-700 dark:text-sky-300',
      pillBgClass: 'bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200',
      stepActiveClass: 'bg-sky-600 text-white',
    },
  },
  {
    levelNumber: 13,
    nameFa: 'کربونادو',
    nameEn: 'Black Diamond',
    honoraryTitle: 'اسطوره',
    palette: {
      primaryHex: '#18181b',
      secondaryHex: '#09090b',
      glowHex: 'rgba(168, 85, 247, 0.34)',
      badgeTextHex: '#f8fafc',
      cardBgClass:
        'from-zinc-900 via-slate-900 to-indigo-950 text-white',
      cardBorderClass: 'border-violet-400/60 dark:border-violet-500/60',
      barGradientClass: 'from-fuchsia-400 via-violet-400 to-sky-300',
      accentTextClass: 'text-violet-300',
      pillBgClass: 'bg-white/15 text-violet-100',
      stepActiveClass: 'bg-violet-500 text-white',
      isDarkLuxury: true,
    },
  },
] as const;

/**
 * 39-Stage Global XP Thresholds (13 Levels × 3 Steps, calibrated for 1/10th XP scale):
 * Step deltas strictly monotonically increase across all 38 transitions (+20 .. +945),
 * placing early onboarding steps within Day 1 and culminating at Black Diamond Star (15,000 XP).
 */
export const GLOBAL_STAGE_THRESHOLDS: readonly number[] = [
  0, 20, 45,
  80, 125, 180,
  250, 335, 435,
  550, 685, 835,
  1005, 1200, 1415,
  1650, 1910, 2195,
  2505, 2840, 3200,
  3590, 4005, 4450,
  4925, 5430, 5965,
  6530, 7130, 7760,
  8425, 9125, 9860,
  10630, 11435, 12275,
  13145, 14055, 15000,
] as const;

/**
 * 39-Stage Subject XP Thresholds (Independent Subject Progression, calibrated to single-subject study scale):
 * Step deltas monotonically increase (+6 .. +117) from Stone (0) to Black Diamond Star (2,000 Subject XP).
 */
export const SUBJECT_STAGE_THRESHOLDS: readonly number[] = [
  0, 6, 13,
  21, 30, 41,
  54, 69, 86,
  105, 126, 150,
  176, 205, 237,
  271, 308, 348,
  391, 437, 487,
  540, 596, 656,
  719, 786, 856,
  930, 1008, 1089,
  1174, 1263, 1356,
  1453, 1554, 1659,
  1769, 1883, 2000,
] as const;

function buildStageMetaList(thresholds: readonly number[]): ProgressionStageMeta[] {
  const stages: ProgressionStageMeta[] = [];
  for (let i = 0; i < 39; i++) {
    const levelIndex = Math.floor(i / 3);
    const stepIndex = (i % 3) + 1; // 1 | 2 | 3
    const levelEntry = PROGRESSION_LEVELS_13[levelIndex];
    const stepNumber = stepIndex as StepTierNumber;

    const stepSuffixEn: '' | 'Plus' | 'Star' =
      stepNumber === 1 ? '' : stepNumber === 2 ? 'Plus' : 'Star';
    const stepSuffixFa: '' | 'پلاس' | 'استار' =
      stepNumber === 1 ? '' : stepNumber === 2 ? 'پلاس' : 'استار';

    const stageNameEn = stepSuffixEn ? `${levelEntry.nameEn} ${stepSuffixEn}` : levelEntry.nameEn;
    const stageNameFa = stepSuffixFa ? `${levelEntry.nameFa} ${stepSuffixFa}` : levelEntry.nameFa;
    const stepLabelFa =
      stepNumber === 1 ? 'پله ۱ از ۳' : stepNumber === 2 ? 'پله ۲ از ۳' : 'پله ۳ از ۳';
    const stepOrdinalFa =
      stepNumber === 1
        ? 'پله اول از سه پله'
        : stepNumber === 2
        ? 'پله دوم از سه پله'
        : 'پله سوم از سه پله';

    stages.push({
      stageNumber: i + 1,
      levelNumber: levelEntry.levelNumber,
      stepNumber,
      levelNameFa: levelEntry.nameFa,
      levelNameEn: levelEntry.nameEn,
      honoraryTitle: levelEntry.honoraryTitle,
      stageNameEn,
      stageNameFa,
      stepSuffixEn,
      stepSuffixFa,
      stepLabelFa,
      stepOrdinalFa,
      minXp: thresholds[i],
      nextStageMinXp: i < 38 ? thresholds[i + 1] : null,
      palette: levelEntry.palette,
    });
  }
  return stages;
}

const GLOBAL_STAGES_CATALOG: readonly ProgressionStageMeta[] =
  buildStageMetaList(GLOBAL_STAGE_THRESHOLDS);
const SUBJECT_STAGES_CATALOG: readonly ProgressionStageMeta[] =
  buildStageMetaList(SUBJECT_STAGE_THRESHOLDS);

export function getAllGlobalStages(): readonly ProgressionStageMeta[] {
  return GLOBAL_STAGES_CATALOG;
}

export function getAllSubjectStages(): readonly ProgressionStageMeta[] {
  return SUBJECT_STAGES_CATALOG;
}

export function getLevelRankMeta(level: number): {
  title: string;
  emoji: string;
  levelEntry: LevelCatalogEntry;
} {
  const idx = Math.max(0, Math.min(PROGRESSION_LEVELS_13.length - 1, level - 1));
  const levelEntry = PROGRESSION_LEVELS_13[idx];
  return {
    title: `${levelEntry.nameFa} (${levelEntry.nameEn})`,
    emoji: level >= 12 ? '💎' : level >= 8 ? '🏅' : '⚡',
    levelEntry,
  };
}

/**
 * Unified 1/10th XP Calculator:
 * - Completed activity: +5 XP
 * - Partial activity: +2.5 XP
 * - Actual study time: actualStudyMinutes / 50 XP (0.02 XP per minute)
 * - Solved exercises/tests: +0.2 XP per exercise
 * - Learning quality bonus: +(quality * 0.2) XP on each evaluated study session (max 2 XP/session)
 */
export function calculateXpFromPlans(plans: DailyPlanItem[]): XpBreakdown {
  let completedCount = 0;
  let partialCount = 0;
  let actualStudyMinutes = 0;
  let exercisesCount = 0;
  let rawQualityBonusXp = 0;
  let qualityEvaluatedCount = 0;

  for (const plan of plans) {
    if (plan.status === 'completed') {
      completedCount += 1;
    } else if (plan.status === 'partial') {
      partialCount += 1;
    }

    if (Number(plan.is_study) === 1 && plan.performance) {
      const mins = Math.max(0, Number(plan.performance.actual_minutes || 0));
      actualStudyMinutes += mins;

      const ex = Math.max(0, Number(plan.performance.exercises_count || 0));
      exercisesCount += ex;

      const q = parseLearningQuality0To10(plan.performance.learning_quality);
      if (q !== null && mins > 0) {
        rawQualityBonusXp += q * XP_SCALE_WEIGHTS.QUALITY_POINT_MULTIPLIER;
        qualityEvaluatedCount += 1;
      }
    }
  }

  const completedActivitiesXp = roundXp2(
    completedCount * XP_SCALE_WEIGHTS.COMPLETED_ACTIVITY
  );
  const partialActivitiesXp = roundXp2(
    partialCount * XP_SCALE_WEIGHTS.PARTIAL_ACTIVITY
  );
  const studyMinutesXp = roundXp2(
    actualStudyMinutes / XP_SCALE_WEIGHTS.STUDY_MINUTES_DIVISOR
  );
  const exercisesXp = roundXp2(
    exercisesCount * XP_SCALE_WEIGHTS.EXERCISE_UNIT
  );
  const qualityBonusXp = roundXp2(rawQualityBonusXp);

  const totalXp = roundXp2(
    completedActivitiesXp +
      partialActivitiesXp +
      studyMinutesXp +
      exercisesXp +
      qualityBonusXp
  );

  return {
    totalXp,
    completedActivitiesXp,
    partialActivitiesXp,
    studyMinutesXp,
    exercisesXp,
    qualityBonusXp,
    completedCount,
    partialCount,
    actualStudyMinutes,
    exercisesCount,
    qualityEvaluatedCount,
  };
}

/**
 * Resolves any non-negative XP total against a 39-stage catalog.
 */
function resolve39StageProgress(
  xpInput: number,
  catalog: readonly ProgressionStageMeta[]
): UserLevelProgress {
  const allTimeXp = roundXp2(Math.max(0, Number.isFinite(xpInput) ? xpInput : 0));

  let activeIdx = 0;
  for (let i = 0; i < catalog.length; i++) {
    if (allTimeXp >= catalog[i].minXp) {
      activeIdx = i;
    } else {
      break;
    }
  }

  const currentStage = catalog[activeIdx];
  const isMaxStage = activeIdx === catalog.length - 1;
  const nextStage = isMaxStage ? null : catalog[activeIdx + 1];

  const currentLevelStartXp = currentStage.minXp;
  const nextLevelTargetXp = nextStage ? nextStage.minXp : currentStage.minXp;
  const xpRequiredForCurrentStep = nextStage
    ? roundXp2(nextStage.minXp - currentStage.minXp)
    : 0;
  const xpInCurrentLevel = roundXp2(Math.max(0, allTimeXp - currentLevelStartXp));
  const xpRemainingToNextLevel = nextStage
    ? roundXp2(Math.max(0, nextStage.minXp - allTimeXp))
    : 0;

  const progressPercentage = isMaxStage
    ? 100
    : xpRequiredForCurrentStep > 0
    ? Math.min(
        100,
        Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForCurrentStep) * 100))
      )
    : 100;

  return {
    stageNumber: currentStage.stageNumber,
    totalStages: 39,
    level: currentStage.levelNumber,
    stepNumber: currentStage.stepNumber,
    levelNameFa: currentStage.levelNameFa,
    levelNameEn: currentStage.levelNameEn,
    honoraryTitle: currentStage.honoraryTitle,
    stageNameEn: currentStage.stageNameEn,
    stageNameFa: currentStage.stageNameFa,
    stepSuffixEn: currentStage.stepSuffixEn,
    stepLabelFa: currentStage.stepLabelFa,
    stepOrdinalFa: currentStage.stepOrdinalFa,
    palette: currentStage.palette,

    isMaxStage,
    nextStageNumber: nextStage ? nextStage.stageNumber : null,
    nextLevel: nextStage ? nextStage.levelNumber : null,
    nextStageNameEn: nextStage ? nextStage.stageNameEn : null,
    nextStageNameFa: nextStage ? nextStage.stageNameFa : null,
    nextStepLabelFa: nextStage ? nextStage.stepLabelFa : null,

    rankTitle: `${currentStage.stageNameFa} (${currentStage.honoraryTitle})`,
    nextRankTitle: nextStage
      ? `${nextStage.stageNameEn} (${nextStage.stageNameFa})`
      : 'تکمیل اوج اسطوره‌ای',
    rankBadgeEmoji:
      currentStage.stepNumber === 3
        ? '★'
        : currentStage.stepNumber === 2
        ? '+'
        : '◆',
    allTimeXp,
    currentLevelStartXp,
    nextLevelTargetXp,
    xpInCurrentLevel,
    xpRequiredForCurrentStep,
    xpRemainingToNextLevel,
    progressPercentage,
  };
}

export type XpLedgerEventType =
  | 'level_promotion'
  | 'step_promotion'
  | 'level_demotion'
  | 'step_demotion'
  | 'xp_gain'
  | 'xp_penalty';

export interface XpLedgerHistoryEvent {
  id: string;
  dateIso: string;
  jalaliDate: string;
  eventType: XpLedgerEventType;
  eventBadgeFa: 'ارتقای سطح' | 'ارتقای پله' | 'تنزل سطح' | 'تنزل پله' | 'پاداش XP' | 'جریمه عدم فعالیت';
  categoryType: 'ارتقا' | 'پسرفت' | 'پاداش' | 'جریمه';
  xpBefore: number;
  xpAfter: number;
  xpDelta: number; // positive or negative
  stageBeforeNumber: number;
  stageAfterNumber: number;
  levelBefore: number;
  levelAfter: number;
  stageBeforeNameFa: string;
  stageBeforeNameEn: string;
  stepBeforeLabelFa: string;
  stageAfterNameFa: string;
  stageAfterNameEn: string;
  stepAfterLabelFa: string;
  reasonFa: string;
  streakDays?: number;
  multiplierR?: number;
  unfulfilledRatioM?: number;
  basePenaltyB?: number;
}

export interface GlobalInactivityDayPenalty {
  dateIso: string;
  jalaliDate: string;
  streakDay: number;
  basePenaltyB: number;
  multiplierR: number;
  unfulfilledRatioM: number;
  fulfillmentRatio: number;
  rawPenaltyXp: number;
  deductedXp: number;
  xpBefore: number;
  xpAfter: number;
  demotedStage: boolean;
  demotedLevel: boolean;
  stageBeforeNameFa: string;
  stageAfterNameFa: string;
  reasonFa: string;
}

export interface GlobalXpLedgerResult {
  grossTotalXp: number;
  totalPenaltyXp: number;
  netTotalXp: number;
  penalty7dXp: number;
  penalty30dXp: number;
  consecutiveInactiveDays: number;
  maxConsecutiveInactiveDays: number;
  totalMissedEducationalDays: number;
  totalActiveEducationalDays: number;
  currentStreakMultiplierR: number;
  basePenaltyB: number;
  hasActiveDemotion: boolean;
  peakStageProgress: UserLevelProgress;
  currentStageProgress: UserLevelProgress;
  latestDemotionEvent: XpLedgerHistoryEvent | null;
  latestPenaltyRecord: GlobalInactivityDayPenalty | null;
  dailyPenalties: GlobalInactivityDayPenalty[];
  historyEvents: XpLedgerHistoryEvent[];
}

/**
 * Escalating inactivity multiplier r_d (Section 1-2):
 * Day 1 -> 1.0 (10% of active daily XP)
 * Day 2 -> 1.5 (15%)
 * Day 3 -> 2.0 (20%)
 * Day 4 -> 2.5 (25%)
 * Day 5 -> 3.0 (30%)
 * Day 6 -> 3.5 (35%)
 * Day 7+ -> 4.0 (40% cap)
 */
export function getGlobalInactivityMultiplierR(consecutiveDay: number): number {
  if (consecutiveDay <= 0) return 0;
  if (consecutiveDay === 1) return 1.0;
  if (consecutiveDay === 2) return 1.5;
  if (consecutiveDay === 3) return 2.0;
  if (consecutiveDay === 4) return 2.5;
  if (consecutiveDay === 5) return 3.0;
  if (consecutiveDay === 6) return 3.5;
  return 4.0;
}

/**
 * Escalating subject-specific missed-session multiplier r_{s,d} (Section 3-2):
 */
export function getSubjectInactivityMultiplierR(consecutiveMissedSession: number): number {
  if (consecutiveMissedSession <= 0) return 0;
  if (consecutiveMissedSession === 1) return 1.0;
  if (consecutiveMissedSession === 2) return 1.35;
  if (consecutiveMissedSession === 3) return 1.7;
  if (consecutiveMissedSession === 4) return 2.05;
  return 2.5;
}

let cachedGlobalLedgerKey = '';
let cachedGlobalLedgerValue: GlobalXpLedgerResult | null = null;

function buildPlansSignature(plans: DailyPlanItem[], todayIso: string): string {
  let hash = 2166136261;
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const perf = p.performance;
    const str = `${p.id}:${p.plan_date}:${p.status}:${p.predicted_minutes}:${p.transferred_from_date || ''}:${
      perf ? `${perf.actual_minutes}:${perf.exercises_count}:${perf.learning_quality}` : '0'
    }`;
    for (let j = 0; j < str.length; j++) {
      hash ^= str.charCodeAt(j);
      hash = Math.imul(hash, 16777619);
    }
  }
  return `${todayIso}:${plans.length}:${hash >>> 0}`;
}

/**
 * Evaluates the student's complete chronological Global XP & Inactivity Penalty Ledger.
 * - Only days prior to `todayIso` where educational plans (`is_study === 1`) exist are accountable.
 * - Days without educational plans (rest days / holidays / unscheduled days) NEVER trigger a penalty or increase the streak.
 * - Transferred plans already have their `plan_date` moved to the destination day, preventing double penalties.
 * - Token activity below the effective threshold (50% fulfillment or >=30m quality study) reduces M_d proportionally
 *   for that day without wiping the consecutive inactivity streak.
 * - Deducts P_d = B * r_d * M_d from net Global XP (floored at 0) and genuinely updates/demotes the 39-Stage Level.
 */
export function evaluateGlobalXpLedger(
  allTimePlans: DailyPlanItem[],
  todayIsoInput?: string
): GlobalXpLedgerResult {
  const todayIso =
    todayIsoInput ||
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    })();

  const sig = buildPlansSignature(allTimePlans, todayIso);
  if (cachedGlobalLedgerKey === sig && cachedGlobalLedgerValue) {
    return cachedGlobalLedgerValue;
  }

  const plansByDate = new Map<string, DailyPlanItem[]>();
  for (const plan of allTimePlans) {
    const list = plansByDate.get(plan.plan_date);
    if (list) list.push(plan);
    else plansByDate.set(plan.plan_date, [plan]);
  }

  const sortedDates = Array.from(plansByDate.keys()).sort((a, b) => a.localeCompare(b));

  let runningGrossXp = 0;
  let runningNetXp = 0;
  let totalPenaltyXp = 0;
  let peakNetXp = 0;

  let consecutiveInactiveDays = 0;
  let maxConsecutiveInactiveDays = 0;
  let totalMissedEducationalDays = 0;
  let totalActiveEducationalDays = 0;

  const activeDayEarnedXps: number[] = [];
  const dailyPenalties: GlobalInactivityDayPenalty[] = [];
  const historyEvents: XpLedgerHistoryEvent[] = [];

  const date7dStart = addDaysISO(todayIso, -6);
  const date30dStart = addDaysISO(todayIso, -29);
  let penalty7dXp = 0;
  let penalty30dXp = 0;

  for (const dateIso of sortedDates) {
    const dayPlans = plansByDate.get(dateIso) || [];
    if (dayPlans.length === 0) continue;

    const jalaliDate = formatJalaliCompact(dateIso);
    const dayXpBreakdown = calculateXpFromPlans(dayPlans);
    const earnedToday = dayXpBreakdown.totalXp;

    // 1. Apply Positive Earned XP for this day
    if (earnedToday > 0) {
      const xpBefore = runningNetXp;
      const stageBefore = resolve39StageProgress(xpBefore, GLOBAL_STAGES_CATALOG);

      runningGrossXp = roundXp2(runningGrossXp + earnedToday);
      runningNetXp = roundXp2(runningNetXp + earnedToday);
      if (runningNetXp > peakNetXp) {
        peakNetXp = runningNetXp;
      }

      const stageAfter = resolve39StageProgress(runningNetXp, GLOBAL_STAGES_CATALOG);

      let eventType: XpLedgerEventType = 'xp_gain';
      let eventBadgeFa: XpLedgerHistoryEvent['eventBadgeFa'] = 'پاداش XP';
      let categoryType: XpLedgerHistoryEvent['categoryType'] = 'پاداش';
      let reasonFa = `کسب +${toPersianDigits(earnedToday)} XP از ثبت عملکرد روزانه (${toPersianDigits(
        dayXpBreakdown.completedCount
      )} فعالیت کامل، ${formatDurationPrimePersian(dayXpBreakdown.actualStudyMinutes)} مطالعه)`;

      if (stageAfter.level > stageBefore.level) {
        eventType = 'level_promotion';
        eventBadgeFa = 'ارتقای سطح';
        categoryType = 'ارتقا';
        reasonFa = `صعود از سطح ${toPersianDigits(stageBefore.level)} (${
          stageBefore.stageNameFa
        }) به سطح ${toPersianDigits(stageAfter.level)} (${
          stageAfter.stageNameFa
        }) با کسب +${toPersianDigits(earnedToday)} XP`;
      } else if (stageAfter.stageNumber > stageBefore.stageNumber) {
        eventType = 'step_promotion';
        eventBadgeFa = 'ارتقای پله';
        categoryType = 'ارتقا';
        reasonFa = `ارتقای پله از «${stageBefore.stageNameFa}» به «${stageAfter.stageNameFa}» (${
          stageAfter.stepLabelFa
        }) با کسب +${toPersianDigits(earnedToday)} XP`;
      }

      historyEvents.push({
        id: `ev-gain-${dateIso}`,
        dateIso,
        jalaliDate,
        eventType,
        eventBadgeFa,
        categoryType,
        xpBefore,
        xpAfter: runningNetXp,
        xpDelta: earnedToday,
        stageBeforeNumber: stageBefore.stageNumber,
        stageAfterNumber: stageAfter.stageNumber,
        levelBefore: stageBefore.level,
        levelAfter: stageAfter.level,
        stageBeforeNameFa: stageBefore.stageNameFa,
        stageBeforeNameEn: stageBefore.stageNameEn,
        stepBeforeLabelFa: stageBefore.stepLabelFa,
        stageAfterNameFa: stageAfter.stageNameFa,
        stageAfterNameEn: stageAfter.stageNameEn,
        stepAfterLabelFa: stageAfter.stepLabelFa,
        reasonFa,
      });
    }

    // 2. Evaluate Educational Commitment & Inactivity Penalty (Strictly for completed calendar days before todayIso)
    const studyPlans = dayPlans.filter((p) => Number(p.is_study) === 1);
    if (studyPlans.length === 0) {
      // No educational commitment on this day -> neither active nor penalized
      continue;
    }

    let plannedStudyMins = 0;
    let actualStudyMins = 0;
    let completedStudyCount = 0;
    let partialStudyCount = 0;

    for (const sp of studyPlans) {
      plannedStudyMins += Math.max(
        0,
        Number(sp.initial_predicted_minutes || sp.predicted_minutes || 0)
      );
      if (sp.status === 'completed') completedStudyCount += 1;
      else if (sp.status === 'partial') partialStudyCount += 1;

      if (sp.performance) {
        actualStudyMins += Math.max(0, Number(sp.performance.actual_minutes || 0));
      }
    }

    const timeFulfillment =
      plannedStudyMins > 0
        ? Math.min(1, actualStudyMins / plannedStudyMins)
        : actualStudyMins > 0
        ? 1
        : 0;
    const taskFulfillment =
      (completedStudyCount + partialStudyCount * 0.5) / studyPlans.length;
    const fulfillmentRatio = roundXp2(
      Math.min(1, Math.max(0, 0.6 * timeFulfillment + 0.4 * taskFulfillment))
    );

    const qualEval = calculateWeightedLearningQualityL(studyPlans);
    const hasAcceptableQuality =
      qualEval.weightedAverage0To10 === null || qualEval.weightedAverage0To10 >= 4;

    // Effective educational activity threshold (Section 1-4):
    // >= 50% fulfillment of planned educational tasks/time, OR >= 30 mins of real study with acceptable quality
    const isEffectivelyActive =
      fulfillmentRatio >= 0.5 ||
      (actualStudyMins >= 30 &&
        completedStudyCount + partialStudyCount >= 1 &&
        hasAcceptableQuality);

    if (isEffectivelyActive) {
      totalActiveEducationalDays += 1;
      consecutiveInactiveDays = 0;
      if (earnedToday > 0) {
        activeDayEarnedXps.push(earnedToday);
      }
      continue;
    }

    // Do not penalize today or future dates while they are still open for completion
    if (dateIso >= todayIso) {
      continue;
    }

    // Day before todayIso had educational commitments that were NOT effectively fulfilled
    consecutiveInactiveDays += 1;
    totalMissedEducationalDays += 1;
    if (consecutiveInactiveDays > maxConsecutiveInactiveDays) {
      maxConsecutiveInactiveDays = consecutiveInactiveDays;
    }

    const avgActiveDailyXp =
      activeDayEarnedXps.length > 0
        ? activeDayEarnedXps.reduce((a, b) => a + b, 0) / activeDayEarnedXps.length
        : 12.0;
    const basePenaltyB = roundXp2(Math.max(1.0, Math.min(10.0, avgActiveDailyXp * 0.1)));
    const multiplierR = getGlobalInactivityMultiplierR(consecutiveInactiveDays);
    const unfulfilledRatioM = roundXp2(Math.max(0, 1 - fulfillmentRatio));

    const rawPenaltyXp = roundXp2(basePenaltyB * multiplierR * unfulfilledRatioM);
    if (rawPenaltyXp <= 0 || runningNetXp <= 0) {
      continue;
    }

    const xpBeforePenalty = runningNetXp;
    const stageBeforePenalty = resolve39StageProgress(xpBeforePenalty, GLOBAL_STAGES_CATALOG);
    const deductedXp = roundXp2(Math.min(xpBeforePenalty, rawPenaltyXp));

    runningNetXp = roundXp2(Math.max(0, xpBeforePenalty - deductedXp));
    totalPenaltyXp = roundXp2(totalPenaltyXp + deductedXp);

    if (dateIso >= date7dStart && dateIso <= todayIso) {
      penalty7dXp = roundXp2(penalty7dXp + deductedXp);
    }
    if (dateIso >= date30dStart && dateIso <= todayIso) {
      penalty30dXp = roundXp2(penalty30dXp + deductedXp);
    }

    const stageAfterPenalty = resolve39StageProgress(runningNetXp, GLOBAL_STAGES_CATALOG);
    const demotedLevel = stageAfterPenalty.level < stageBeforePenalty.level;
    const demotedStage = stageAfterPenalty.stageNumber < stageBeforePenalty.stageNumber;

    const unfulfilledPct = Math.round(unfulfilledRatioM * 100);
    const reasonFa =
      fulfillmentRatio === 0
        ? `عدم ثبت عملکرد برای ${toPersianDigits(
            studyPlans.length
          )} برنامه درسی (${toPersianDigits(
            consecutiveInactiveDays
          )} روز متوالی وقفه؛ ضریب تشدید ×${toPersianDigits(multiplierR)})`
        : `تحقق ناقص برنامه درسی (${toPersianDigits(
            unfulfilledPct
          )}٪ انجام‌نشده در روز ${toPersianDigits(
            consecutiveInactiveDays
          )} وقفه؛ ضریب ×${toPersianDigits(multiplierR)})`;

    const penaltyRecord: GlobalInactivityDayPenalty = {
      dateIso,
      jalaliDate,
      streakDay: consecutiveInactiveDays,
      basePenaltyB,
      multiplierR,
      unfulfilledRatioM,
      fulfillmentRatio,
      rawPenaltyXp,
      deductedXp,
      xpBefore: xpBeforePenalty,
      xpAfter: runningNetXp,
      demotedStage,
      demotedLevel,
      stageBeforeNameFa: stageBeforePenalty.stageNameFa,
      stageAfterNameFa: stageAfterPenalty.stageNameFa,
      reasonFa,
    };
    dailyPenalties.push(penaltyRecord);

    let eventType: XpLedgerEventType = 'xp_penalty';
    let eventBadgeFa: XpLedgerHistoryEvent['eventBadgeFa'] = 'جریمه عدم فعالیت';
    let categoryType: XpLedgerHistoryEvent['categoryType'] = 'جریمه';

    if (demotedLevel) {
      eventType = 'level_demotion';
      eventBadgeFa = 'تنزل سطح';
      categoryType = 'پسرفت';
    } else if (demotedStage) {
      eventType = 'step_demotion';
      eventBadgeFa = 'تنزل پله';
      categoryType = 'پسرفت';
    }

    historyEvents.push({
      id: `ev-pen-${dateIso}`,
      dateIso,
      jalaliDate,
      eventType,
      eventBadgeFa,
      categoryType,
      xpBefore: xpBeforePenalty,
      xpAfter: runningNetXp,
      xpDelta: -deductedXp,
      stageBeforeNumber: stageBeforePenalty.stageNumber,
      stageAfterNumber: stageAfterPenalty.stageNumber,
      levelBefore: stageBeforePenalty.level,
      levelAfter: stageAfterPenalty.level,
      stageBeforeNameFa: stageBeforePenalty.stageNameFa,
      stageBeforeNameEn: stageBeforePenalty.stageNameEn,
      stepBeforeLabelFa: stageBeforePenalty.stepLabelFa,
      stageAfterNameFa: stageAfterPenalty.stageNameFa,
      stageAfterNameEn: stageAfterPenalty.stageNameEn,
      stepAfterLabelFa: stageAfterPenalty.stepLabelFa,
      reasonFa: demotedStage
        ? `تنزل از «${stageBeforePenalty.stageNameFa}» به «${stageAfterPenalty.stageNameFa}» به علت کسر ${toPersianDigits(
            deductedXp
          )} XP (${reasonFa})`
        : `کسر ${toPersianDigits(deductedXp)} XP — ${reasonFa}`,
      streakDays: consecutiveInactiveDays,
      multiplierR,
      unfulfilledRatioM,
      basePenaltyB,
    });
  }

  const avgActiveDailyXpFinal =
    activeDayEarnedXps.length > 0
      ? activeDayEarnedXps.reduce((a, b) => a + b, 0) / activeDayEarnedXps.length
      : 12.0;
  const currentBasePenaltyB = roundXp2(
    Math.max(1.0, Math.min(10.0, avgActiveDailyXpFinal * 0.1))
  );
  const currentStreakMultiplierR = getGlobalInactivityMultiplierR(consecutiveInactiveDays);

  const currentStageProgress = resolve39StageProgress(runningNetXp, GLOBAL_STAGES_CATALOG);
  const peakStageProgress = resolve39StageProgress(peakNetXp, GLOBAL_STAGES_CATALOG);

  const demotionEvents = historyEvents.filter(
    (e) => e.eventType === 'level_demotion' || e.eventType === 'step_demotion'
  );
  const latestDemotionEvent =
    demotionEvents.length > 0 ? demotionEvents[demotionEvents.length - 1] : null;
  const latestPenaltyRecord =
    dailyPenalties.length > 0 ? dailyPenalties[dailyPenalties.length - 1] : null;

  const hasActiveDemotion =
    currentStageProgress.stageNumber < peakStageProgress.stageNumber &&
    latestDemotionEvent !== null;

  const result: GlobalXpLedgerResult = {
    grossTotalXp: runningGrossXp,
    totalPenaltyXp,
    netTotalXp: runningNetXp,
    penalty7dXp,
    penalty30dXp,
    consecutiveInactiveDays,
    maxConsecutiveInactiveDays,
    totalMissedEducationalDays,
    totalActiveEducationalDays,
    currentStreakMultiplierR,
    basePenaltyB: currentBasePenaltyB,
    hasActiveDemotion,
    peakStageProgress,
    currentStageProgress,
    latestDemotionEvent,
    latestPenaltyRecord,
    dailyPenalties,
    // Most recent events first for UI display
    historyEvents: [...historyEvents].reverse(),
  };

  cachedGlobalLedgerKey = sig;
  cachedGlobalLedgerValue = result;
  return result;
}

export function calculateUserLevelProgress(
  allTimeXpInput: number,
  allTimePlans?: DailyPlanItem[],
  todayIso?: string
): UserLevelProgress {
  if (Array.isArray(allTimePlans)) {
    return evaluateGlobalXpLedger(allTimePlans, todayIso).currentStageProgress;
  }
  return resolve39StageProgress(allTimeXpInput, GLOBAL_STAGES_CATALOG);
}

// ============================================================================
// 9B. INDEPENDENT SUBJECT-SPECIFIC XP, CONTINUITY & 39-STAGE LEVEL PROGRESSION
// ============================================================================
export type SubjectContinuityStatus = 'normal' | 'attention' | 'warning' | 'critical';

export interface SubjectLevelProgress {
  subjectId: string;
  subjectName: string;
  gradeLevel: string;
  subjectXp: number; // Net Subject XP after deducting subject-specific inactivity penalties
  grossSubjectXp: number; // Positive Subject XP before penalties
  subjectPenaltyXp: number; // Total XP deducted from this subject due to missed planned sessions
  rawEffortXp: number;
  effectivenessMultiplier: number; // Quality + Adherence + Consistency balance
  distinctActiveDays: number;
  plannedStudyDaysCount: number;
  missedSessionsCount: number;
  consecutiveMissedSessions: number;
  successfulSessionsRecent14d: number;
  lastEffectiveStudyDate: string | null;
  lastEffectiveStudyJalali: string;
  daysSinceLastStudy: number | null;
  continuityStatus: SubjectContinuityStatus;
  continuityStatusLabelFa: 'وضعیت عادی' | 'نیازمند توجه' | 'هشدار جدی' | 'استمرار ضعیف';
  continuityStatusReasonFa: string;
  hasSubjectDemotion: boolean;
  peakStageProgress: UserLevelProgress;
  latestSubjectDemotion: XpLedgerHistoryEvent | null;
  subjectHistoryEvents: XpLedgerHistoryEvent[];
  plansCount: number;
  completedCount: number;
  totalStudyMinutes: number;
  totalExercises: number;
  weightedQuality0To10: number | null;
  timeAdherencePct: number;
  educationalScoreE: number | null;
  taskCompletionPct: number;
  stageProgress: UserLevelProgress;
}

function daysBetweenIsoDates(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  const utc1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const utc2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.max(0, Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)));
}

/**
 * Computes an individual subject's dedicated XP, continuity status, independent penalty ledger,
 * and 39-Stage Level strictly from that subject's own plans & performance records.
 * Completely isolated from Global Level and from all other subjects.
 */
export function calculateSubjectProgression(params: {
  subjectId: string;
  subjectName: string;
  gradeLevel?: string;
  allTimePlans: DailyPlanItem[];
  todayIso?: string;
}): SubjectLevelProgress {
  const { subjectId, subjectName, gradeLevel = 'هشتم', allTimePlans, todayIso: rawTodayIso } = params;
  const todayIso =
    rawTodayIso ||
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    })();

  const subjectPlans = allTimePlans.filter(
    (p) =>
      Number(p.is_study) === 1 &&
      (p.subject_id === subjectId ||
        (!p.subject_id && p.subject_name_snapshot === subjectName) ||
        (subjectId.startsWith('hist-') && p.subject_name_snapshot === subjectName))
  );

  let completedCount = 0;
  let partialCount = 0;
  let predictedMinutes = 0;
  let totalStudyMinutes = 0;
  let targetExercises = 0;
  let totalExercises = 0;
  let rawQualityXp = 0;
  let loggedCount = 0;
  const activeDaysSet = new Set<string>();
  const plansByDate = new Map<string, DailyPlanItem[]>();

  for (const p of subjectPlans) {
    const dList = plansByDate.get(p.plan_date);
    if (dList) dList.push(p);
    else plansByDate.set(p.plan_date, [p]);

    if (p.status === 'completed') completedCount += 1;
    else if (p.status === 'partial') partialCount += 1;

    predictedMinutes += Math.max(
      0,
      Number(p.initial_predicted_minutes || p.predicted_minutes || 0)
    );
    targetExercises += Math.max(0, Number(p.target_exercises || 0));

    if (p.performance) {
      loggedCount += 1;
      const mins = Math.max(0, Number(p.performance.actual_minutes || 0));
      const ex = Math.max(0, Number(p.performance.exercises_count || 0));
      totalStudyMinutes += mins;
      totalExercises += ex;

      if (mins > 0 || ex > 0 || p.status !== 'pending') {
        activeDaysSet.add(p.plan_date);
      }

      const q = parseLearningQuality0To10(p.performance.learning_quality);
      if (q !== null && mins > 0) {
        rawQualityXp += q * XP_SCALE_WEIGHTS.QUALITY_POINT_MULTIPLIER;
      }
    } else if (p.status !== 'pending') {
      activeDaysSet.add(p.plan_date);
    }
  }

  const distinctActiveDays = activeDaysSet.size;
  const rawBase =
    completedCount * XP_SCALE_WEIGHTS.COMPLETED_ACTIVITY +
    partialCount * XP_SCALE_WEIGHTS.PARTIAL_ACTIVITY +
    totalStudyMinutes / XP_SCALE_WEIGHTS.STUDY_MINUTES_DIVISOR +
    totalExercises * XP_SCALE_WEIGHTS.EXERCISE_UNIT +
    rawQualityXp +
    distinctActiveDays * 1.0;

  const rawEffortXp = roundXp2(rawBase);

  const hasLogged = loggedCount > 0;
  const T = hasLogged
    ? predictedMinutes > 0
      ? calculateStudyTimeIndexT(totalStudyMinutes, predictedMinutes)
      : 65
    : 0;
  const Q = hasLogged
    ? calculateExercisesIndexQ(totalExercises, targetExercises > 0 ? targetExercises : null)
    : null;
  const qualEval = calculateWeightedLearningQualityL(subjectPlans);
  const educationalScoreE = hasLogged
    ? calculateEducationalCompositeScoreE(T, Q, qualEval.scoreL0To100, true)
    : null;

  const taskCompletionRatio =
    subjectPlans.length > 0
      ? (completedCount + partialCount * 0.5) / subjectPlans.length
      : 0;
  const timeAdherencePct =
    predictedMinutes > 0 ? Math.round((totalStudyMinutes / predictedMinutes) * 100) : 0;

  let effectivenessMultiplier = 0.5;
  let grossSubjectXp = 0;

  if (rawEffortXp > 0) {
    const qualityNorm =
      qualEval.weightedAverage0To10 !== null ? qualEval.weightedAverage0To10 / 10 : 0.55;
    const adherenceNorm = educationalScoreE !== null ? educationalScoreE / 100 : 0.5;
    const consistencyNorm = Math.min(1, distinctActiveDays / 25);

    const masteryIndex =
      0.45 * qualityNorm +
      0.35 * adherenceNorm +
      0.1 * taskCompletionRatio +
      0.1 * consistencyNorm;

    effectivenessMultiplier = 0.28 + 0.97 * masteryIndex;
    if (qualEval.weightedAverage0To10 !== null && qualEval.weightedAverage0To10 < 4) {
      effectivenessMultiplier *= 0.65;
    }
    effectivenessMultiplier = roundXp2(effectivenessMultiplier);
    grossSubjectXp = roundXp2(rawEffortXp * effectivenessMultiplier);
  }

  // Chronological Subject Ledger: Positive Subject XP + Subject-Specific Inactivity Penalties
  const sortedDates = Array.from(plansByDate.keys()).sort((a, b) => a.localeCompare(b));
  const date14dStart = addDaysISO(todayIso, -13);

  let runningNetSubjectXp = 0;
  let peakSubjectXp = 0;
  let subjectPenaltyXp = 0;
  let missedSessionsCount = 0;
  let consecutiveMissedSessions = 0;
  let successfulSessionsRecent14d = 0;
  let lastEffectiveStudyDate: string | null = null;
  const activeSessionEarnedXps: number[] = [];
  const subjectHistoryEvents: XpLedgerHistoryEvent[] = [];

  for (const dateIso of sortedDates) {
    const daySubjPlans = plansByDate.get(dateIso) || [];
    if (daySubjPlans.length === 0) continue;

    const jalaliDate = formatJalaliCompact(dateIso);
    let dayComp = 0;
    let dayPart = 0;
    let dayPredMins = 0;
    let dayActMins = 0;
    let dayEx = 0;
    let dayQualXp = 0;

    for (const sp of daySubjPlans) {
      if (sp.status === 'completed') dayComp += 1;
      else if (sp.status === 'partial') dayPart += 1;
      dayPredMins += Math.max(0, Number(sp.initial_predicted_minutes || sp.predicted_minutes || 0));
      if (sp.performance) {
        const m = Math.max(0, Number(sp.performance.actual_minutes || 0));
        const ex = Math.max(0, Number(sp.performance.exercises_count || 0));
        dayActMins += m;
        dayEx += ex;
        const q = parseLearningQuality0To10(sp.performance.learning_quality);
        if (q !== null && m > 0) {
          dayQualXp += q * XP_SCALE_WEIGHTS.QUALITY_POINT_MULTIPLIER;
        }
      }
    }

    const isDayActive = dayActMins > 0 || dayEx > 0 || dayComp > 0 || dayPart > 0;
    const dayRawBase =
      dayComp * XP_SCALE_WEIGHTS.COMPLETED_ACTIVITY +
      dayPart * XP_SCALE_WEIGHTS.PARTIAL_ACTIVITY +
      dayActMins / XP_SCALE_WEIGHTS.STUDY_MINUTES_DIVISOR +
      dayEx * XP_SCALE_WEIGHTS.EXERCISE_UNIT +
      dayQualXp +
      (isDayActive ? 1.0 : 0);

    const dayPositiveSubjectXp = roundXp2(dayRawBase * effectivenessMultiplier);

    if (dayPositiveSubjectXp > 0) {
      const xpBefore = runningNetSubjectXp;
      const stageBefore = resolve39StageProgress(xpBefore, SUBJECT_STAGES_CATALOG);

      runningNetSubjectXp = roundXp2(runningNetSubjectXp + dayPositiveSubjectXp);
      if (runningNetSubjectXp > peakSubjectXp) {
        peakSubjectXp = runningNetSubjectXp;
      }

      const stageAfter = resolve39StageProgress(runningNetSubjectXp, SUBJECT_STAGES_CATALOG);

      let eventType: XpLedgerEventType = 'xp_gain';
      let eventBadgeFa: XpLedgerHistoryEvent['eventBadgeFa'] = 'پاداش XP';
      let categoryType: XpLedgerHistoryEvent['categoryType'] = 'پاداش';
      let reasonFa = `کسب +${toPersianDigits(dayPositiveSubjectXp)} XP در درس «${subjectName}» (${formatDurationPrimePersian(
        dayActMins
      )} مطالعه)`;

      if (stageAfter.level > stageBefore.level) {
        eventType = 'level_promotion';
        eventBadgeFa = 'ارتقای سطح';
        categoryType = 'ارتقا';
        reasonFa = `صعود سطح درس «${subjectName}» از ${stageBefore.stageNameFa} به ${stageAfter.stageNameFa}`;
      } else if (stageAfter.stageNumber > stageBefore.stageNumber) {
        eventType = 'step_promotion';
        eventBadgeFa = 'ارتقای پله';
        categoryType = 'ارتقا';
        reasonFa = `ارتقای پله درس «${subjectName}» از ${stageBefore.stageNameFa} به ${stageAfter.stageNameFa}`;
      }

      subjectHistoryEvents.push({
        id: `subj-gain-${subjectId}-${dateIso}`,
        dateIso,
        jalaliDate,
        eventType,
        eventBadgeFa,
        categoryType,
        xpBefore,
        xpAfter: runningNetSubjectXp,
        xpDelta: dayPositiveSubjectXp,
        stageBeforeNumber: stageBefore.stageNumber,
        stageAfterNumber: stageAfter.stageNumber,
        levelBefore: stageBefore.level,
        levelAfter: stageAfter.level,
        stageBeforeNameFa: stageBefore.stageNameFa,
        stageBeforeNameEn: stageBefore.stageNameEn,
        stepBeforeLabelFa: stageBefore.stepLabelFa,
        stageAfterNameFa: stageAfter.stageNameFa,
        stageAfterNameEn: stageAfter.stageNameEn,
        stepAfterLabelFa: stageAfter.stepLabelFa,
        reasonFa,
      });
    }

    const timeRatio =
      dayPredMins > 0 ? Math.min(1, dayActMins / dayPredMins) : dayActMins > 0 ? 1 : 0;
    const taskRatio = (dayComp + dayPart * 0.5) / daySubjPlans.length;
    const sessionFulfillment = roundXp2(0.6 * timeRatio + 0.4 * taskRatio);

    const isEffectiveStudySession =
      sessionFulfillment >= 0.5 || (dayActMins >= 25 && dayComp + dayPart >= 1);

    if (isEffectiveStudySession) {
      consecutiveMissedSessions = 0;
      lastEffectiveStudyDate = dateIso;
      if (dateIso >= date14dStart && dateIso <= todayIso) {
        successfulSessionsRecent14d += dayComp + dayPart;
      }
      if (dayPositiveSubjectXp > 0) {
        activeSessionEarnedXps.push(dayPositiveSubjectXp);
      }
      continue;
    }

    // Do not penalize today's or future sessions while still in progress
    if (dateIso >= todayIso) {
      continue;
    }

    const unfulfilledSessionCount = daySubjPlans.filter((p) => p.status === 'pending').length || 1;
    missedSessionsCount += unfulfilledSessionCount;
    consecutiveMissedSessions += 1;

    const avgSessionXp =
      activeSessionEarnedXps.length > 0
        ? activeSessionEarnedXps.reduce((a, b) => a + b, 0) / activeSessionEarnedXps.length
        : 6.5;
    const baseSubjPenaltyB = roundXp2(Math.max(0.6, Math.min(4.5, avgSessionXp * 0.12)));
    const subjMultiplierR = getSubjectInactivityMultiplierR(consecutiveMissedSessions);
    const unfulfilledM = roundXp2(Math.max(0, 1 - sessionFulfillment));
    const rawSubjPenalty = roundXp2(baseSubjPenaltyB * subjMultiplierR * unfulfilledM);

    if (rawSubjPenalty <= 0 || runningNetSubjectXp <= 0) {
      continue;
    }

    const xpBeforePenalty = runningNetSubjectXp;
    const stageBeforePenalty = resolve39StageProgress(xpBeforePenalty, SUBJECT_STAGES_CATALOG);
    const deductedSubjXp = roundXp2(Math.min(xpBeforePenalty, rawSubjPenalty));

    runningNetSubjectXp = roundXp2(Math.max(0, xpBeforePenalty - deductedSubjXp));
    subjectPenaltyXp = roundXp2(subjectPenaltyXp + deductedSubjXp);

    const stageAfterPenalty = resolve39StageProgress(runningNetSubjectXp, SUBJECT_STAGES_CATALOG);
    const demotedLevel = stageAfterPenalty.level < stageBeforePenalty.level;
    const demotedStage = stageAfterPenalty.stageNumber < stageBeforePenalty.stageNumber;

    let eventType: XpLedgerEventType = 'xp_penalty';
    let eventBadgeFa: XpLedgerHistoryEvent['eventBadgeFa'] = 'جریمه عدم فعالیت';
    let categoryType: XpLedgerHistoryEvent['categoryType'] = 'جریمه';

    if (demotedLevel) {
      eventType = 'level_demotion';
      eventBadgeFa = 'تنزل سطح';
      categoryType = 'پسرفت';
    } else if (demotedStage) {
      eventType = 'step_demotion';
      eventBadgeFa = 'تنزل پله';
      categoryType = 'پسرفت';
    }

    const baseReasonFa =
      sessionFulfillment === 0
        ? `عدم انجام نوبت برنامه‌ریزی‌شده درس «${subjectName}» (${toPersianDigits(
            consecutiveMissedSessions
          )} نوبت متوالی ازدست‌رفته؛ ضریب ×${toPersianDigits(subjMultiplierR)})`
        : `تحقق ناقص نوبت مطالعه درس «${subjectName}» (${toPersianDigits(
            Math.round(unfulfilledM * 100)
          )}٪ ناتمام در نوبت ${toPersianDigits(consecutiveMissedSessions)} وقفه)`;

    subjectHistoryEvents.push({
      id: `subj-pen-${subjectId}-${dateIso}`,
      dateIso,
      jalaliDate,
      eventType,
      eventBadgeFa,
      categoryType,
      xpBefore: xpBeforePenalty,
      xpAfter: runningNetSubjectXp,
      xpDelta: -deductedSubjXp,
      stageBeforeNumber: stageBeforePenalty.stageNumber,
      stageAfterNumber: stageAfterPenalty.stageNumber,
      levelBefore: stageBeforePenalty.level,
      levelAfter: stageAfterPenalty.level,
      stageBeforeNameFa: stageBeforePenalty.stageNameFa,
      stageBeforeNameEn: stageBeforePenalty.stageNameEn,
      stepBeforeLabelFa: stageBeforePenalty.stepLabelFa,
      stageAfterNameFa: stageAfterPenalty.stageNameFa,
      stageAfterNameEn: stageAfterPenalty.stageNameEn,
      stepAfterLabelFa: stageAfterPenalty.stepLabelFa,
      reasonFa: demotedStage
        ? `تنزل از «${stageBeforePenalty.stageNameFa}» به «${stageAfterPenalty.stageNameFa}» به علت کسر ${toPersianDigits(
            deductedSubjXp
          )} XP (${baseReasonFa})`
        : `کسر ${toPersianDigits(deductedSubjXp)} XP — ${baseReasonFa}`,
      streakDays: consecutiveMissedSessions,
      multiplierR: subjMultiplierR,
      unfulfilledRatioM: unfulfilledM,
      basePenaltyB: baseSubjPenaltyB,
    });
  }

  // Reconcile net Subject XP with total grossSubjectXp minus accumulated subjectPenaltyXp
  const subjectXp = roundXp2(Math.max(0, grossSubjectXp - subjectPenaltyXp));
  const stageProgress = resolve39StageProgress(subjectXp, SUBJECT_STAGES_CATALOG);
  const peakStageProgress = resolve39StageProgress(
    Math.max(grossSubjectXp, peakSubjectXp),
    SUBJECT_STAGES_CATALOG
  );

  const subjDemotions = subjectHistoryEvents.filter(
    (e) => e.eventType === 'level_demotion' || e.eventType === 'step_demotion'
  );
  const latestSubjectDemotion =
    subjDemotions.length > 0 ? subjDemotions[subjDemotions.length - 1] : null;
  const hasSubjectDemotion =
    stageProgress.stageNumber < peakStageProgress.stageNumber &&
    latestSubjectDemotion !== null;

  const daysSinceLastStudy =
    lastEffectiveStudyDate !== null
      ? daysBetweenIsoDates(lastEffectiveStudyDate, todayIso)
      : null;

  const lastEffectiveStudyJalali =
    lastEffectiveStudyDate !== null
      ? daysSinceLastStudy === 0
        ? `امروز (${formatJalaliCompact(lastEffectiveStudyDate)})`
        : daysSinceLastStudy === 1
        ? `دیروز (${formatJalaliCompact(lastEffectiveStudyDate)})`
        : `${toPersianDigits(daysSinceLastStudy ?? 0)} روز پیش (${formatJalaliCompact(
            lastEffectiveStudyDate
          )})`
      : 'ثبت نشده';

  let continuityStatus: SubjectContinuityStatus = 'normal';
  let continuityStatusLabelFa: SubjectLevelProgress['continuityStatusLabelFa'] = 'وضعیت عادی';
  let continuityStatusReasonFa =
    distinctActiveDays > 0
      ? `مطالعه منظم در ${toPersianDigits(distinctActiveDays)} روز فعال و بدون نوبت برنامه‌ریزی‌شده معوقه`
      : 'هنوز برنامه منقضی‌شده‌ای بدون انجام باقی نمانده است';

  if (
    consecutiveMissedSessions >= 3 ||
    (daysSinceLastStudy !== null && daysSinceLastStudy > 12 && sortedDates.length >= 2)
  ) {
    continuityStatus = 'critical';
    continuityStatusLabelFa = 'استمرار ضعیف';
    continuityStatusReasonFa =
      consecutiveMissedSessions >= 3
        ? `${toPersianDigits(consecutiveMissedSessions)} نوبت مطالعاتی متوالی از برنامه درس «${subjectName}» انجام نشده است`
        : `بیش از ${toPersianDigits(daysSinceLastStudy || 0)} روز از آخرین مطالعه مؤثر درس «${subjectName}» گذشته است`;
  } else if (consecutiveMissedSessions === 2 || hasSubjectDemotion) {
    continuityStatus = 'warning';
    continuityStatusLabelFa = 'هشدار جدی';
    continuityStatusReasonFa = hasSubjectDemotion
      ? `کسر ${toPersianDigits(subjectPenaltyXp)} XP به دلیل نوبت‌های ازدست‌رفته باعث تنزل پله در این درس شده است`
      : `۲ نوبت متوالی از برنامه درس «${subjectName}» انجام نشده و شامل جریمه عدم استمرار شده است`;
  } else if (
    consecutiveMissedSessions === 1 ||
    (daysSinceLastStudy !== null && daysSinceLastStudy > 6)
  ) {
    continuityStatus = 'attention';
    continuityStatusLabelFa = 'نیازمند توجه';
    continuityStatusReasonFa =
      consecutiveMissedSessions === 1
        ? `آخرین نوبت برنامه‌ریزی‌شده درس «${subjectName}» انجام نشده است؛ با ۱ جلسه مطالعه زنجیره را احیا کنید`
        : `${toPersianDigits(daysSinceLastStudy || 0)} روز از آخرین مطالعه این درس گذشته است`;
  }

  return {
    subjectId,
    subjectName,
    gradeLevel,
    subjectXp,
    grossSubjectXp,
    subjectPenaltyXp,
    rawEffortXp,
    effectivenessMultiplier,
    distinctActiveDays,
    plannedStudyDaysCount: sortedDates.length,
    missedSessionsCount,
    consecutiveMissedSessions,
    successfulSessionsRecent14d,
    lastEffectiveStudyDate,
    lastEffectiveStudyJalali,
    daysSinceLastStudy,
    continuityStatus,
    continuityStatusLabelFa,
    continuityStatusReasonFa,
    hasSubjectDemotion,
    peakStageProgress,
    latestSubjectDemotion,
    subjectHistoryEvents: [...subjectHistoryEvents].reverse(),
    plansCount: subjectPlans.length,
    completedCount,
    totalStudyMinutes,
    totalExercises,
    weightedQuality0To10: qualEval.weightedAverage0To10,
    timeAdherencePct,
    educationalScoreE,
    taskCompletionPct: Math.round(taskCompletionRatio * 100),
    stageProgress,
  };
}

export function calculateAllSubjectsProgressions(params: {
  subjects: Array<{ id: string; name: string; grade_level?: string; is_archived?: number }>;
  allTimePlans: DailyPlanItem[];
  todayIso?: string;
}): SubjectLevelProgress[] {
  const { subjects, allTimePlans, todayIso } = params;
  const entries = new Map<string, { id: string; name: string; gradeLevel: string }>();

  for (const s of subjects) {
    if (Number(s.is_archived ?? 0) === 0) {
      entries.set(s.id, {
        id: s.id,
        name: s.name,
        gradeLevel: s.grade_level || 'هشتم',
      });
    }
  }

  for (const p of allTimePlans) {
    if (Number(p.is_study) !== 1) continue;
    const sid = p.subject_id || `hist-${p.subject_name_snapshot || 'نامشخص'}`;
    if (!entries.has(sid)) {
      entries.set(sid, {
        id: sid,
        name: p.subject_name_snapshot || 'درس ثبت‌شده',
        gradeLevel: 'هشتم',
      });
    }
  }

  const results: SubjectLevelProgress[] = [];
  for (const e of entries.values()) {
    results.push(
      calculateSubjectProgression({
        subjectId: e.id,
        subjectName: e.name,
        gradeLevel: e.gradeLevel,
        allTimePlans,
        todayIso,
      })
    );
  }
  return results;
}

// ============================================================================
// 10. XP VELOCITY, TREND & REAL EDUCATIONAL PROGRESS ENGINE (1/10th Scale)
// ============================================================================
export type XpTrendDirection = 'ascending' | 'stable' | 'descending' | 'insufficient_data';

export type XpEducationalAlignment =
  | 'synergistic_growth'
  | 'superficial_xp_warning'
  | 'quality_steady_low_volume'
  | 'simultaneous_drop'
  | 'building_baseline';

export interface DailyHistoricalXpRecord {
  dateIso: string;
  jalaliCompact: string;
  dayState: 'active' | 'missed_planned' | 'unrecorded';
  totalXp: number;
  penaltyXp: number;
  netDayXp: number;
  educationalXp: number;
  studyMinutes: number;
  exercisesCount: number;
  learningQuality0To10: number | null;
  educationalScoreE: number | null;
  finalDailyScoreS: number | null;
}

export interface XpVelocityAndProgressAnalysis {
  todayXp: number;
  xp7dTotal: number;
  xp14dTotal: number;
  xp30dTotal: number;
  prev7dTotal: number;
  penalty7dTotal: number;
  net7dTotal: number;

  dailyRate7dCalendar: number;
  dailyRate7dEffective: number;
  dailyRate14dCalendar: number;
  dailyRate30dCalendar: number;
  prev7dDailyRate: number;

  activeDays7d: number;
  missedPlannedDays7d: number;
  unrecordedDays7d: number;
  activeDays14d: number;

  velocityDeltaAbsolute: number;
  velocityDeltaPercent: number | null;
  trendDirection: XpTrendDirection;
  trendLabelPersian: string;
  trendBadgeTone: 'emerald' | 'indigo' | 'amber' | 'slate';

  avgEducationalScore7d: number | null;
  prevAvgEducationalScore7d: number | null;
  avgFinalScore7d: number | null;
  avgLearningQuality7d: number | null;
  alignmentStatus: XpEducationalAlignment;
  alignmentTitlePersian: string;
  alignmentDescriptionPersian: string;

  estimatedDaysToNextLevel: number | null;
  estimatedNextLevelTextPersian: string;

  hasPerformanceDropWarning: boolean;
  warningHeadlinePersian: string | null;
  recoveryChallengeTextPersian: string;

  recent7DaysSeries: DailyHistoricalXpRecord[];
}

export function analyzeXpVelocityAndProgress(params: {
  allTimePlans: DailyPlanItem[];
  todayIso: string;
  levelProgress: UserLevelProgress;
}): XpVelocityAndProgressAnalysis {
  const { allTimePlans, todayIso, levelProgress } = params;

  const globalLedger = evaluateGlobalXpLedger(allTimePlans, todayIso);
  const penaltyByDate = new Map<string, GlobalInactivityDayPenalty>();
  for (const pen of globalLedger.dailyPenalties) {
    penaltyByDate.set(pen.dateIso, pen);
  }

  const plansByDate = new Map<string, DailyPlanItem[]>();
  for (const plan of allTimePlans) {
    const list = plansByDate.get(plan.plan_date);
    if (list) list.push(plan);
    else plansByDate.set(plan.plan_date, [plan]);
  }

  const buildDayRecord = (dateIso: string): DailyHistoricalXpRecord => {
    const dayPlans = plansByDate.get(dateIso) || [];
    const xp = calculateXpFromPlans(dayPlans);
    const evalDay = evaluateDayPerformance({ dateIso, plans: dayPlans });
    const pen = penaltyByDate.get(dateIso);
    const penaltyXp = pen ? pen.deductedXp : 0;

    const hasLoggedAny =
      xp.completedCount > 0 ||
      xp.partialCount > 0 ||
      xp.actualStudyMinutes > 0 ||
      xp.exercisesCount > 0;

    const studyPlans = dayPlans.filter((p) => Number(p.is_study) === 1);

    let dayState: 'active' | 'missed_planned' | 'unrecorded' = 'unrecorded';
    if (hasLoggedAny && !pen) {
      dayState = 'active';
    } else if (studyPlans.length > 0 && dateIso < todayIso) {
      dayState = 'missed_planned';
    } else if (hasLoggedAny) {
      dayState = 'active';
    }

    const educationalXp = calculateXpFromPlans(studyPlans).totalXp;

    return {
      dateIso,
      jalaliCompact: formatJalaliCompact(dateIso),
      dayState,
      totalXp: xp.totalXp,
      penaltyXp,
      netDayXp: roundXp2(xp.totalXp - penaltyXp),
      educationalXp,
      studyMinutes: xp.actualStudyMinutes,
      exercisesCount: xp.exercisesCount,
      learningQuality0To10: evalDay.learningQuality0To10,
      educationalScoreE: evalDay.educationalCompositeE,
      finalDailyScoreS: evalDay.finalDailyScoreS,
    };
  };

  const dates30d = getDateRangeISOList(addDaysISO(todayIso, -29), todayIso);
  const records30d = dates30d.map(buildDayRecord);
  const records14d = records30d.slice(-14);
  const records7d = records30d.slice(-7);
  const prev7dRecords = records14d.slice(0, 7);

  const todayRecord = records7d[records7d.length - 1] || buildDayRecord(todayIso);
  const todayXp = roundXp2(todayRecord.totalXp);

  const xp7dTotal = roundXp2(records7d.reduce((s, r) => s + r.totalXp, 0));
  const penalty7dTotal = roundXp2(records7d.reduce((s, r) => s + r.penaltyXp, 0));
  const net7dTotal = roundXp2(xp7dTotal - penalty7dTotal);
  const xp14dTotal = roundXp2(records14d.reduce((s, r) => s + r.netDayXp, 0));
  const xp30dTotal = roundXp2(records30d.reduce((s, r) => s + r.netDayXp, 0));
  const prev7dTotal = roundXp2(prev7dRecords.reduce((s, r) => s + r.netDayXp, 0));

  const activeDays7d = records7d.filter((r) => r.dayState === 'active').length;
  const missedPlannedDays7d = records7d.filter((r) => r.dayState === 'missed_planned').length;
  const unrecordedDays7d = records7d.filter((r) => r.dayState === 'unrecorded').length;
  const activeDays14d = records14d.filter((r) => r.dayState === 'active').length;
  const prevActiveDays7d = prev7dRecords.filter((r) => r.dayState === 'active').length;

  const accountableDays7d = Math.max(1, activeDays7d + missedPlannedDays7d);
  const prevAccountableDays7d = Math.max(
    1,
    prevActiveDays7d + prev7dRecords.filter((r) => r.dayState === 'missed_planned').length
  );

  const effectiveNet7d = Math.max(0, net7dTotal);
  const dailyRate7dCalendar = roundRate1(effectiveNet7d / 7);
  const dailyRate14dCalendar = roundRate1(Math.max(0, xp14dTotal) / 14);
  const dailyRate30dCalendar = roundRate1(Math.max(0, xp30dTotal) / 30);

  const accountableRate7d = effectiveNet7d / accountableDays7d;
  const sorted7dXp = [...records7d.map((r) => Math.max(0, r.netDayXp))].sort((a, b) => a - b);
  const trimmedSum7d =
    sorted7dXp.length >= 7
      ? sorted7dXp.slice(1, 6).reduce((s, v) => s + v, 0) / 5
      : dailyRate7dCalendar;

  const dailyRate7dEffective =
    effectiveNet7d > 0
      ? Math.max(
          0.1,
          roundRate1(
            dailyRate7dCalendar * 0.45 + accountableRate7d * 0.35 + trimmedSum7d * 0.2
          )
        )
      : 0;

  const prev7dDailyRate =
    prevActiveDays7d > 0
      ? roundRate1(Math.max(0, prev7dTotal) / Math.max(3, prevAccountableDays7d))
      : 0;

  const currentComparableRate =
    activeDays7d > 0 ? roundRate1(effectiveNet7d / Math.max(3, accountableDays7d)) : 0;
  const velocityDeltaAbsolute = roundRate1(currentComparableRate - prev7dDailyRate);

  let velocityDeltaPercent: number | null = null;
  let trendDirection: XpTrendDirection = 'insufficient_data';
  let trendLabelPersian = 'در حال ثبت خط پایه';
  let trendBadgeTone: 'emerald' | 'indigo' | 'amber' | 'slate' = 'slate';

  if (activeDays7d === 0 && prevActiveDays7d === 0 && missedPlannedDays7d === 0) {
    trendDirection = 'insufficient_data';
    trendLabelPersian = 'در انتظار ثبت فعالیت';
    trendBadgeTone = 'slate';
  } else if (prevActiveDays7d === 0 || prev7dTotal < 5) {
    trendDirection =
      missedPlannedDays7d >= 2
        ? 'descending'
        : activeDays7d >= 2 || effectiveNet7d >= 12
        ? 'ascending'
        : 'stable';
    trendLabelPersian =
      trendDirection === 'ascending'
        ? 'شروع پرقدرت و صعودی 🚀'
        : trendDirection === 'descending'
        ? 'کاهش ریتم و ثبت جریمه عدم فعالیت'
        : 'پایدار (هفته اول ثبت)';
    trendBadgeTone =
      trendDirection === 'ascending'
        ? 'emerald'
        : trendDirection === 'descending'
        ? 'amber'
        : 'indigo';
  } else {
    velocityDeltaPercent = Math.max(
      -100,
      Math.min(
        250,
        Math.round(((currentComparableRate - prev7dDailyRate) / prev7dDailyRate) * 100)
      )
    );
    if (velocityDeltaPercent >= 12 && missedPlannedDays7d <= 1) {
      trendDirection = 'ascending';
      trendLabelPersian = `صعودی (+${toPersianDigits(velocityDeltaPercent)}٪ نسبت به هفته قبل)`;
      trendBadgeTone = 'emerald';
    } else if (velocityDeltaPercent <= -15 || penalty7dTotal > 0) {
      trendDirection = 'descending';
      trendLabelPersian =
        penalty7dTotal > 0
          ? `افت سرعت و کسر ${toPersianDigits(penalty7dTotal)} XP جریمه وقفه`
          : `کاهش ریتم (${toPersianDigits(Math.abs(velocityDeltaPercent))}٪ کمتر از هفته قبل)`;
      trendBadgeTone = 'amber';
    } else {
      trendDirection = 'stable';
      const sign = velocityDeltaPercent > 0 ? '+' : '';
      trendLabelPersian = `پایدار و متعادل (${sign}${toPersianDigits(velocityDeltaPercent)}٪)`;
      trendBadgeTone = 'indigo';
    }
  }

  const validEDays7d = records7d
    .map((r) => r.educationalScoreE)
    .filter((v): v is number => v !== null);
  const avgEducationalScore7d =
    validEDays7d.length > 0
      ? Math.round(validEDays7d.reduce((a, b) => a + b, 0) / validEDays7d.length)
      : null;

  const prevValidEDays7d = prev7dRecords
    .map((r) => r.educationalScoreE)
    .filter((v): v is number => v !== null);
  const prevAvgEducationalScore7d =
    prevValidEDays7d.length > 0
      ? Math.round(prevValidEDays7d.reduce((a, b) => a + b, 0) / prevValidEDays7d.length)
      : null;

  const validSDays7d = records7d
    .map((r) => r.finalDailyScoreS)
    .filter((v): v is number => v !== null);
  const avgFinalScore7d =
    validSDays7d.length > 0
      ? Math.round(validSDays7d.reduce((a, b) => a + b, 0) / validSDays7d.length)
      : null;

  const validQDays7d = records7d
    .map((r) => r.learningQuality0To10)
    .filter((v): v is number => v !== null);
  const avgLearningQuality7d =
    validQDays7d.length > 0
      ? roundRate1(validQDays7d.reduce((a, b) => a + b, 0) / validQDays7d.length)
      : null;

  const educationalXpSharePct =
    xp7dTotal > 0
      ? Math.round(
          (records7d.reduce((s, r) => s + r.educationalXp, 0) / Math.max(0.1, xp7dTotal)) *
            100
        )
      : 100;

  let alignmentStatus: XpEducationalAlignment = 'building_baseline';
  let alignmentTitlePersian = 'در حال تکمیل داده‌های هم‌سنجی رشد';
  let alignmentDescriptionPersian =
    'با ثبت مستمر زمان مطالعه، تمرین و نمره کیفیت یادگیری، هم‌راستایی سرعت کسب XP با پیشرفت واقعی تحصیلی تحلیل می‌شود.';

  if (activeDays7d >= 1 && avgEducationalScore7d !== null) {
    const isQualityLow = avgLearningQuality7d !== null && avgLearningQuality7d < 6.5;
    const isScoreELow = avgEducationalScore7d < 68;
    const isNonStudyHeavy = educationalXpSharePct < 55;

    if ((isQualityLow || isScoreELow || isNonStudyHeavy) && xp7dTotal >= 15) {
      alignmentStatus = 'superficial_xp_warning';
      alignmentTitlePersian = 'هشدار رشد ظاهری XP بدون عمق کافی یادگیری';
      alignmentDescriptionPersian = `با وجود کسب ${toPersianDigits(
        xp7dTotal
      )} XP مثبت در ۷ روز اخیر، شاخص عملکرد آموزشی واقعی (${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰)${
        avgLearningQuality7d !== null
          ? ` و کیفیت یادگیری (${toPersianDigits(avgLearningQuality7d)} از ۱۰)`
          : ''
      } نشان می‌دهد بخشی از امتیازها از تیک‌زدن فعالیت‌ها بدون ساعت مطالعه عمیق یا حل تست کافی حاصل شده است.`;
    } else if (trendDirection === 'descending' && (avgEducationalScore7d < 75 || penalty7dTotal > 0)) {
      alignmentStatus = 'simultaneous_drop';
      alignmentTitlePersian = 'کاهش هم‌زمان سرعت XP و استمرار مطالعه';
      alignmentDescriptionPersian = `در ۷ روز اخیر به دلیل ${toPersianDigits(
        missedPlannedDays7d
      )} روز عدم تحقق برنامه درسی${
        penalty7dTotal > 0 ? ` و کسر ${toPersianDigits(penalty7dTotal)} XP جریمه عدم فعالیت` : ''
      }، سرعت رشد و شاخص آموزشی (${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰) کاهش یافته است؛ ثبت یک جلسه مطالعه مؤثر امروز زنجیره جریمه را متوقف می‌کند.`;
    } else if (
      avgEducationalScore7d >= 78 &&
      (avgLearningQuality7d === null || avgLearningQuality7d >= 7.5) &&
      activeDays7d < 4
    ) {
      alignmentStatus = 'quality_steady_low_volume';
      alignmentTitlePersian = 'کیفیت یادگیری عالی، نیازمند پیوستگی روزانه بیشتر';
      alignmentDescriptionPersian = `کیفیت مطالعه شما در روزهای فعال بسیار مطلوب است (شاخص آموزشی ${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰)، اما افزایش تعداد روزهای فعال هفته، از جریمه عدم استمرار جلوگیری کرده و سرعت صعود به مرحله بعدی را دوچندان می‌کند.`;
    } else {
      alignmentStatus = 'synergistic_growth';
      alignmentTitlePersian = 'رشد اصیل و هم‌راستای XP با پیشرفت واقعی تحصیلی';
      alignmentDescriptionPersian = `سرعت کسب XP شما کاملاً متکی بر مطالعه باکیفیت (شاخص آموزشی ${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰${
        avgLearningQuality7d !== null
          ? ` و کیفیت ${toPersianDigits(avgLearningQuality7d)} از ۱۰`
          : ''
      }) است و رشد واقعی علمی شما را بازتاب می‌دهد.`;
    }
  } else if (missedPlannedDays7d >= 1 && penalty7dTotal > 0) {
    alignmentStatus = 'simultaneous_drop';
    alignmentTitlePersian = 'توقف مطالعه و اعمال جریمه عدم استمرار';
    alignmentDescriptionPersian = `در ۷ روز اخیر ${toPersianDigits(
      missedPlannedDays7d
    )} روز برنامه‌ریزی درسی بدون ثبت عملکرد باقی مانده و ${toPersianDigits(
      penalty7dTotal
    )} XP از حساب سطح کل کسر شده است.`;
  }

  const effectivePaceForPrediction = Math.max(
    dailyRate7dEffective,
    dailyRate14dCalendar,
    todayXp > 0 ? roundRate1(todayXp * 0.75) : 0
  );

  let estimatedDaysToNextLevel: number | null = null;
  let estimatedNextLevelTextPersian =
    'با ثبت اولین فعالیت امروز، زمان رسیدن به پله بعد محاسبه می‌شود';

  if (levelProgress.isMaxStage) {
    estimatedDaysToNextLevel = 0;
    estimatedNextLevelTextPersian =
      'بالاترین مرحله سیستم (Black Diamond Star) تکمیل شده است 🏆';
  } else if (effectivePaceForPrediction >= 1.5) {
    estimatedDaysToNextLevel = Math.max(
      1,
      Math.ceil(levelProgress.xpRemainingToNextLevel / effectivePaceForPrediction)
    );
    const nextLabel = levelProgress.nextStageNameEn
      ? `${levelProgress.nextStageNameEn} (${levelProgress.nextStageNameFa})`
      : 'مرحله بعد';
    estimatedNextLevelTextPersian = `با ریتم فعلی: حدود ${toPersianDigits(
      estimatedDaysToNextLevel
    )} روز تا ${nextLabel}`;
  }

  const hasPerformanceDropWarning =
    trendDirection === 'descending' ||
    alignmentStatus === 'superficial_xp_warning' ||
    alignmentStatus === 'simultaneous_drop' ||
    missedPlannedDays7d >= 1 ||
    penalty7dTotal > 0;

  let warningHeadlinePersian: string | null = null;
  if (globalLedger.hasActiveDemotion && globalLedger.latestDemotionEvent) {
    warningHeadlinePersian = `هشدار پسرفت سطح: به دلیل عدم فعالیت مستمر و کسر ${toPersianDigits(
      globalLedger.totalPenaltyXp
    )} XP، رتبه شما از «${globalLedger.latestDemotionEvent.stageBeforeNameFa}» به «${
      globalLedger.currentStageProgress.stageNameFa
    }» تنزل یافته است.`;
  } else if (penalty7dTotal > 0) {
    warningHeadlinePersian = `در ۷ روز اخیر به دلیل ${toPersianDigits(
      missedPlannedDays7d
    )} روز عدم تحقق برنامه آموزشی، مجموعاً ${toPersianDigits(
      penalty7dTotal
    )} XP جریمه عدم استمرار کسر شده است.`;
  } else if (alignmentStatus === 'superficial_xp_warning') {
    warningHeadlinePersian =
      'برای تثبیت ارتقای سطح و جلوگیری از افت کیفیت، زمان مطالعه عمیق و حل تست را در اولویت قرار دهید.';
  } else if (trendDirection === 'descending') {
    warningHeadlinePersian = `سرعت پیشرفت هفتگی شما کاهش یافته است (${toPersianDigits(
      activeDays7d
    )} روز فعال در ۷ روز اخیر).`;
  }

  const targetRecoveryStudyMins = 60;
  const targetRecoveryTests = 15;
  const recoveryChallengeXp = roundXp2(
    XP_SCALE_WEIGHTS.COMPLETED_ACTIVITY +
      targetRecoveryStudyMins / XP_SCALE_WEIGHTS.STUDY_MINUTES_DIVISOR +
      targetRecoveryTests * XP_SCALE_WEIGHTS.EXERCISE_UNIT +
      8 * XP_SCALE_WEIGHTS.QUALITY_POINT_MULTIPLIER
  ); // 10.8 XP
  const nextGoalName =
    levelProgress.nextStageNameEn || levelProgress.stageNameEn;
  const recoveryChallengeTextPersian = hasPerformanceDropWarning
    ? `گام جبران و شکستن زنجیره جریمه: با تکمیل حداقل ۵۰٪ برنامه درسی امروز یا ۱ باکس مطالعه ${toPersianDigits(
        targetRecoveryStudyMins
      )} دقیقه‌ای با کیفیت +۸ و حل ${toPersianDigits(
        targetRecoveryTests
      )} تست، زنجیره عدم فعالیت صفر شده و حدود +${toPersianDigits(
        recoveryChallengeXp
      )} XP برای بازگشت به «${nextGoalName}» کسب می‌کنید.`
    : `گام طلایی ادامه مسیر: حفظ پیوستگی روزانه و ثبت حداقل ۱ باکس مطالعه عمیق برای صعود سریع‌تر به «${nextGoalName}».`;

  return {
    todayXp,
    xp7dTotal,
    xp14dTotal,
    xp30dTotal,
    prev7dTotal,
    penalty7dTotal,
    net7dTotal,
    dailyRate7dCalendar,
    dailyRate7dEffective,
    dailyRate14dCalendar,
    dailyRate30dCalendar,
    prev7dDailyRate,
    activeDays7d,
    missedPlannedDays7d,
    unrecordedDays7d,
    activeDays14d,
    velocityDeltaAbsolute,
    velocityDeltaPercent,
    trendDirection,
    trendLabelPersian,
    trendBadgeTone,
    avgEducationalScore7d,
    prevAvgEducationalScore7d,
    avgFinalScore7d,
    avgLearningQuality7d,
    alignmentStatus,
    alignmentTitlePersian,
    alignmentDescriptionPersian,
    estimatedDaysToNextLevel,
    estimatedNextLevelTextPersian,
    hasPerformanceDropWarning,
    warningHeadlinePersian,
    recoveryChallengeTextPersian,
    recent7DaysSeries: records7d,
  };
}



