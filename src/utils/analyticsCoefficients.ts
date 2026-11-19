/**
 * MartiaPlanner — Centralized Configurable Analytics Coefficients & Thresholds Engine
 *
 * Centralizes all 41 numeric weights, multipliers, and thresholds used across:
 * 1) Daily Educational & Final Score (E, DS, Task Fulfillment)
 * 2) Positive XP Engine (Completed, Partial, Study Minutes Divisor, Exercise Unit, Quality Bonus, Active Subject Day Bonus)
 * 3) Global Fulfillment (F_d), Effective Day Thresholds & Global Inactivity Penalty Ledger (B, r_d)
 * 4) Subject-Specific Progression, Mastery Index, Learning Depth Multiplier (M_depth) & Subject Penalty (B_s, r_s)
 * 5) 7-Day XP Velocity Weights & Subject Continuity Status Thresholds
 */

export const ANALYTICS_COEFFICIENTS_STORAGE_KEY = 'martia_analytics_coefficients_v1';
export const ANALYTICS_COEFFICIENTS_CHANGED_EVENT = 'martia:analytics-coefficients-changed';

export type CoefficientGroupId =
  | 'daily_scores'
  | 'positive_xp'
  | 'global_fulfillment_penalty'
  | 'subject_progression'
  | 'velocity_continuity';

export interface AnalyticsCoefficientsConfig {
  // Group 1: Daily Educational & Final Composite Scores (6 items)
  studyTimeWeightPct: number; // default 40 (%)
  exercisesWeightPct: number; // default 30 (%)
  learningQualityWeightPct: number; // default 30 (%)
  educationalCompositeWeightPct: number; // default 80 (%)
  restrictedControlWeightPct: number; // default 20 (%)
  partialTaskCreditFactor: number; // default 0.50 (0..1)

  // Group 2: Positive XP Engine (6 items)
  xpCompletedActivity: number; // default 5.0 XP
  xpPartialActivity: number; // default 2.5 XP
  xpStudyMinutesDivisor: number; // default 50 (minutes per 1 XP)
  xpExerciseUnit: number; // default 0.20 XP per test
  xpQualityPointMultiplier: number; // default 0.20 XP per quality point (0..10)
  xpSubjectActiveDayBonus: number; // default 1.0 XP per active study day of a subject

  // Group 3: Global Fulfillment (F_d), Effective Day & Global Penalty (11 items)
  dailyFulfillmentTimeWeightPct: number; // default 60 (%)
  dailyFulfillmentTaskWeightPct: number; // default 40 (%)
  effectiveDayFulfillmentThresholdPct: number; // default 50 (%)
  effectiveDayMinStudyMinutes: number; // default 30 (minutes)
  effectiveDayMinQualityScore: number; // default 4.0 (out of 10)
  globalBasePenaltyRatePct: number; // default 10 (%)
  globalBasePenaltyMinXp: number; // default 1.0 XP
  globalBasePenaltyMaxXp: number; // default 10.0 XP
  globalFallbackAvgDailyXp: number; // default 12.0 XP
  globalStreakEscalationStep: number; // default 0.50
  globalStreakEscalationCap: number; // default 4.0

  // Group 4: Subject Progression, M_depth & Subject Penalty (13 items)
  subjectMasteryQualityWeightPct: number; // default 45 (%)
  subjectMasteryEduWeightPct: number; // default 35 (%)
  subjectMasteryTaskWeightPct: number; // default 10 (%)
  subjectMasteryConsistencyWeightPct: number; // default 10 (%)
  subjectConsistencyMaxDaysCap: number; // default 25 (days)
  subjectDepthBaseIntercept: number; // default 0.28
  subjectDepthSlope: number; // default 0.97
  subjectShallowQualityPenaltyFactor: number; // default 0.65
  subjectEffectiveMinStudyMinutes: number; // default 25 (minutes)
  subjectBasePenaltyRatePct: number; // default 12 (%)
  subjectBasePenaltyMinXp: number; // default 0.60 XP
  subjectBasePenaltyMaxXp: number; // default 4.50 XP
  subjectStreakEscalationStep: number; // default 0.35
  subjectStreakEscalationCap: number; // default 2.50

  // Group 5: 7-Day XP Velocity & Subject Continuity Thresholds (5 items)
  velocityCalendarWeightPct: number; // default 45 (%)
  velocityAccountableWeightPct: number; // default 35 (%)
  velocityTrimmedWeightPct: number; // default 20 (%)
  subjectAttentionDaysThreshold: number; // default 6 (days)
  subjectCriticalDaysThreshold: number; // default 12 (days)
}

export const DEFAULT_ANALYTICS_COEFFICIENTS: AnalyticsCoefficientsConfig = {
  // Group 1
  studyTimeWeightPct: 40,
  exercisesWeightPct: 30,
  learningQualityWeightPct: 30,
  educationalCompositeWeightPct: 80,
  restrictedControlWeightPct: 20,
  partialTaskCreditFactor: 0.5,

  // Group 2
  xpCompletedActivity: 5.0,
  xpPartialActivity: 2.5,
  xpStudyMinutesDivisor: 50,
  xpExerciseUnit: 0.2,
  xpQualityPointMultiplier: 0.2,
  xpSubjectActiveDayBonus: 1.0,

  // Group 3
  dailyFulfillmentTimeWeightPct: 60,
  dailyFulfillmentTaskWeightPct: 40,
  effectiveDayFulfillmentThresholdPct: 50,
  effectiveDayMinStudyMinutes: 30,
  effectiveDayMinQualityScore: 4.0,
  globalBasePenaltyRatePct: 10,
  globalBasePenaltyMinXp: 1.0,
  globalBasePenaltyMaxXp: 10.0,
  globalFallbackAvgDailyXp: 12.0,
  globalStreakEscalationStep: 0.5,
  globalStreakEscalationCap: 4.0,

  // Group 4
  subjectMasteryQualityWeightPct: 45,
  subjectMasteryEduWeightPct: 35,
  subjectMasteryTaskWeightPct: 10,
  subjectMasteryConsistencyWeightPct: 10,
  subjectConsistencyMaxDaysCap: 25,
  subjectDepthBaseIntercept: 0.28,
  subjectDepthSlope: 0.97,
  subjectShallowQualityPenaltyFactor: 0.65,
  subjectEffectiveMinStudyMinutes: 25,
  subjectBasePenaltyRatePct: 12,
  subjectBasePenaltyMinXp: 0.6,
  subjectBasePenaltyMaxXp: 4.5,
  subjectStreakEscalationStep: 0.35,
  subjectStreakEscalationCap: 2.5,

  // Group 5
  velocityCalendarWeightPct: 45,
  velocityAccountableWeightPct: 35,
  velocityTrimmedWeightPct: 20,
  subjectAttentionDaysThreshold: 6,
  subjectCriticalDaysThreshold: 12,
};

export interface CoefficientGroupMeta {
  id: CoefficientGroupId;
  titleFa: string;
  subtitleFa: string;
}

export const COEFFICIENT_GROUPS_META: CoefficientGroupMeta[] = [
  {
    id: 'daily_scores',
    titleFa: '۱. ضرایب امتیاز مستقیم آموزشی (E) و امتیاز نهایی روز (DS)',
    subtitleFa:
      'وزن‌های ترکیبی زمان مطالعه (T)، تمرین و تست (Q)، کیفیت یادگیری (L)، کنترل سرگرمی (C) و سهم فعالیت ناقص',
  },
  {
    id: 'positive_xp',
    titleFa: '۲. ضرایب موتور کسب امتیاز تجربه مثبت (Positive XP)',
    subtitleFa:
      'پاداش فعالیت کامل و ناقص، مقسوم‌علیه دقایق مطالعه، ضریب هر تست، پاداش نمره کیفیت و پاداش روز فعال درس',
  },
  {
    id: 'global_fulfillment_penalty',
    titleFa: '۳. ضرایب تحقق برنامه روزانه (F_d)، روز مؤثر و جریمه وقفه کل',
    subtitleFa:
      'سهم زمان و تکمیل فعالیت در F_d، شروط روز فعال درسی، نرخ و سقف/کف جریمه پایه (B) و گام تشدید وقفه (r_d)',
  },
  {
    id: 'subject_progression',
    titleFa: '۴. ضرایب پیشرفت اختصاصی هر درس، عمق یادگیری (M_depth) و جریمه درس',
    subtitleFa:
      'وزن‌های شاخص تسلط درس (Mastery)، پایه و شیب M_depth، ضریب جریمه کیفیت سطحی و پارامترهای جریمه نوبت ازدست‌رفته درس',
  },
  {
    id: 'velocity_continuity',
    titleFa: '۵. ضرایب سرعت کسب XP هفتگی و آستانه‌های وضعیت پیوستگی دروس',
    subtitleFa:
      'وزن‌های سه‌گانه نرخ مؤثر ۷ روزه (تقویمی، روزهای تعهددار، میانگین پیراسته) و مرزهای زمانی هشدار پیوستگی درس',
  },
];

export interface RelatedDefinitionLink {
  id: string;
  labelFa: string;
  codeBadge: string;
}

export interface CoefficientMetadataItem {
  key: keyof AnalyticsCoefficientsConfig;
  groupId: CoefficientGroupId;
  titleFa: string;
  symbol: string;
  descriptionFa: string;
  unitLabelFa: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  usedInFormulas: string[];
  relatedMetrics: string[];
  relatedDefinitionIds: RelatedDefinitionLink[];
  impactExplanationFa: string;
}

export const COEFFICIENT_METADATA_CATALOG: CoefficientMetadataItem[] = [
  // =========================================================================
  // GROUP 1: Daily Educational & Final Composite Scores
  // =========================================================================
  {
    key: 'studyTimeWeightPct',
    groupId: 'daily_scores',
    titleFa: 'وزن شاخص تحقق زمان مطالعه در امتیاز آموزشی',
    symbol: 'w_T',
    descriptionFa:
      'سهم درصدی شاخص تحقق زمان مطالعه (T) را در محاسبه امتیاز مستقیم آموزشی روزانه (E) و امتیاز آموزشی هر درس (E_s) تعیین می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 40,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'E = (w_T×T + w_Q×Q + w_L×L) ÷ (w_T + w_Q + w_L)',
      'E_s = (w_T×T_s + w_Q×Q_s + w_L×L_s) ÷ Σw',
    ],
    relatedMetrics: [
      'امتیاز مستقیم آموزشی روز (E)',
      'امتیاز آموزشی اختصاصی درس (E_s)',
      'امتیاز نهایی روز (DS)',
      'ضریب عمق یادگیری درس (M_depth)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-4-educational-score-e', labelFa: '۴. امتیاز مستقیم آموزشی (E)', codeBadge: 'E' },
      { id: 'metric-1-study-time-t', labelFa: '۱. شاخص تحقق زمان مطالعه (T)', codeBadge: 'T' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP و امتیاز آموزشی درس (E_s)', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'افزایش این وزن باعث می‌شود کمیت و پایبندی زمانی مطالعه اثر بیشتری بر نمره آموزشی روز (E) و نمره درس (E_s) داشته باشد.',
  },
  {
    key: 'exercisesWeightPct',
    groupId: 'daily_scores',
    titleFa: 'وزن شاخص تحقق تمرین و تست در امتیاز آموزشی',
    symbol: 'w_Q',
    descriptionFa:
      'سهم درصدی شاخص تحقق تعداد تمرین/تست (Q) را در محاسبه امتیاز مستقیم آموزشی روز (E) و امتیاز آموزشی درس (E_s) مشخص می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 30,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'E = (w_T×T + w_Q×Q + w_L×L) ÷ (w_T + w_Q + w_L)',
      'E_s = (w_T×T_s + w_Q×Q_s + w_L×L_s) ÷ Σw',
    ],
    relatedMetrics: [
      'امتیاز مستقیم آموزشی روز (E)',
      'امتیاز آموزشی اختصاصی درس (E_s)',
      'امتیاز نهایی روز (DS)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-4-educational-score-e', labelFa: '۴. امتیاز مستقیم آموزشی (E)', codeBadge: 'E' },
      { id: 'metric-2-exercises-q', labelFa: '۲. شاخص تحقق تست و تمرین (Q)', codeBadge: 'Q' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP و امتیاز آموزشی درس (E_s)', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'در روزهایی که هدف تست ثبت شده است، این وزن مشخص می‌کند حل کامل تست‌ها چه سهمی در نمره آموزشی E ایفا کند.',
  },
  {
    key: 'learningQualityWeightPct',
    groupId: 'daily_scores',
    titleFa: 'وزن شاخص کیفیت یادگیری وزنی در امتیاز آموزشی',
    symbol: 'w_L',
    descriptionFa:
      'سهم درصدی شاخص کیفیت یادگیری وزنی (L) را در امتیاز مستقیم آموزشی روزانه (E) و امتیاز آموزشی درس (E_s) تعیین می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 30,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'E = (w_T×T + w_Q×Q + w_L×L) ÷ (w_T + w_Q + w_L)',
      'E_s = (w_T×T_s + w_Q×Q_s + w_L×L_s) ÷ Σw',
    ],
    relatedMetrics: [
      'شاخص کیفیت یادگیری وزنی (L)',
      'امتیاز مستقیم آموزشی روز (E)',
      'امتیاز نهایی روز (DS)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-4-educational-score-e', labelFa: '۴. امتیاز مستقیم آموزشی (E)', codeBadge: 'E' },
      { id: 'metric-3-learning-quality-l', labelFa: '۳. شاخص کیفیت یادگیری وزنی (L و Q_w)', codeBadge: 'L / Q_w' },
    ],
    impactExplanationFa:
      'افزایش این ضریب اهمیت تمرکز و کیفیت مطالعه خوداظهاری دانش‌آموز (۰ تا ۱۰) را در نمره آموزشی روز بالاتر می‌برد.',
  },
  {
    key: 'educationalCompositeWeightPct',
    groupId: 'daily_scores',
    titleFa: 'وزن امتیاز مستقیم آموزشی در امتیاز نهایی روز',
    symbol: 'w_E',
    descriptionFa:
      'سهم درصدی بخش آموزشی (E) را در ترکیب با شاخص کنترل سرگرمی‌ها (C) برای محاسبه امتیاز نهایی روز (DS) تعیین می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 80,
    min: 10,
    max: 100,
    step: 5,
    usedInFormulas: ['DS = round((w_E × E + w_C × C) ÷ (w_E + w_C))'],
    relatedMetrics: [
      'امتیاز نهایی روز (DS / S)',
      'میانگین امتیاز نهایی بازه (S_period)',
      'هم‌سنجی رشد XP و پیشرفت تحصیلی',
    ],
    relatedDefinitionIds: [
      { id: 'metric-6-final-daily-score-ds', labelFa: '۶. امتیاز نهایی روز (DS)', codeBadge: 'DS' },
      { id: 'metric-4-educational-score-e', labelFa: '۴. امتیاز مستقیم آموزشی (E)', codeBadge: 'E' },
    ],
    impactExplanationFa:
      'مشخص می‌کند چه بخش از نمره کل روز مستقیماً از عملکرد درسی (E) در برابر کنترل فعالیت‌های محدودشونده (C) ناشی شود.',
  },
  {
    key: 'restrictedControlWeightPct',
    groupId: 'daily_scores',
    titleFa: 'وزن شاخص کنترل فعالیت‌های محدودشونده در امتیاز نهایی روز',
    symbol: 'w_C',
    descriptionFa:
      'سهم درصدی شاخص کنترل سرگرمی‌ها و فعالیت‌های محدودشونده (C) را در امتیاز نهایی روز (DS) تعیین می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 20,
    min: 0,
    max: 90,
    step: 5,
    usedInFormulas: ['DS = round((w_E × E + w_C × C) ÷ (w_E + w_C))'],
    relatedMetrics: [
      'شاخص کنترل فعالیت‌های محدودشونده (C)',
      'امتیاز نهایی روز (DS / S)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-6-final-daily-score-ds', labelFa: '۶. امتیاز نهایی روز (DS)', codeBadge: 'DS' },
      { id: 'metric-5-restricted-control-c', labelFa: '۵. شاخص کنترل فعالیت‌های محدودشونده (C)', codeBadge: 'C' },
    ],
    impactExplanationFa:
      'افزایش این وزن باعث می‌شود اضافه‌مصرف گوشی، تلویزیون یا بازی تأثیر قوی‌تری بر کاهش امتیاز نهایی روز (DS) بگذارد.',
  },
  {
    key: 'partialTaskCreditFactor',
    groupId: 'daily_scores',
    titleFa: 'ضریب اعتبار فعالیت ناقص در نرخ تکمیل فعالیت‌ها',
    symbol: 'k_partial',
    descriptionFa:
      'مشخص می‌کند هر فعالیت با وضعیت «ناقص» (partial) چه کسری از یک فعالیت «تکمیل‌شده» (completed) در محاسبه نرخ تکمیل فعالیت‌ها به حساب آید.',
    unitLabelFa: 'ضریب (۰ تا ۱)',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
    usedInFormulas: [
      'TaskRatio = (N_completed + k_partial × N_partial) ÷ N_planned',
      'F_d = w_F,time × TimeRatio + w_F,task × TaskRatio',
    ],
    relatedMetrics: [
      'نسبت تحقق برنامه درسی روز (F_d)',
      'نرخ تکمیل جلسات درس (TaskRatio_s)',
      'نسبت تحقق نوبت مطالعه درس (F_{s,d})',
    ],
    relatedDefinitionIds: [
      { id: 'metric-8-plan-adherence-variance', labelFa: '۸. شاخص انطباق برنامه‌ریزی و انحراف زمانی', codeBadge: 'Adherence' },
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. نسبت تحقق برنامه روزانه (F_d) و کسر امتیاز', codeBadge: '-XP / Penalty' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP و نرخ تکمیل جلسات درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'با مقدار پیش‌فرض ۰٫۵۰، هر ۲ فعالیت ناقص معادل ۱ فعالیت کامل در فرمول تحقق برنامه (F_d) و تکمیل جلسات درس محاسبه می‌شود.',
  },

  // =========================================================================
  // GROUP 2: Positive XP Engine
  // =========================================================================
  {
    key: 'xpCompletedActivity',
    groupId: 'positive_xp',
    titleFa: 'امتیاز پایه هر فعالیت تکمیل‌شده',
    symbol: 'XP_comp',
    descriptionFa:
      'مقدار XP مثبتی که به ازای هر کارت فعالیت با وضعیت «تکمیل‌شده» (completed) به دانش‌آموز تعلق می‌گیرد.',
    unitLabelFa: 'واحد XP',
    defaultValue: 5.0,
    min: 0.5,
    max: 25.0,
    step: 0.5,
    usedInFormulas: [
      'XP_completed = N_completed × XP_comp',
      'XP_raw,s = N_comp,s × XP_comp + ...',
    ],
    relatedMetrics: [
      'امتیاز تجربه روزانه (XP_day)',
      'تلاش خام درس (XP_raw,s)',
      'سطح کل (Global Level) و سطح دروس',
    ],
    relatedDefinitionIds: [
      { id: 'metric-11-positive-xp-formula', labelFa: '۱۱. امتیاز تجربه مثبت (XP پایه و پاداش عملکرد)', codeBadge: '+XP' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. تلاش خام درس (XP_raw,s) و سطح دروس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'افزایش این ضریب پاداش به سرانجام رساندن کامل باکس‌های برنامه را در کسب XP روزانه و دروس بیشتر می‌کند.',
  },
  {
    key: 'xpPartialActivity',
    groupId: 'positive_xp',
    titleFa: 'امتیاز پایه هر فعالیت ناقص',
    symbol: 'XP_part',
    descriptionFa:
      'مقدار XP مثبتی که به ازای هر کارت فعالیت با وضعیت «ناقص» (partial) در محاسبات XP روزانه و درس منظور می‌شود.',
    unitLabelFa: 'واحد XP',
    defaultValue: 2.5,
    min: 0,
    max: 15.0,
    step: 0.25,
    usedInFormulas: [
      'XP_partial = N_partial × XP_part',
      'XP_raw,s = ... + N_part,s × XP_part + ...',
    ],
    relatedMetrics: [
      'امتیاز تجربه روزانه (XP_day)',
      'تلاش خام درس (XP_raw,s)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-11-positive-xp-formula', labelFa: '۱۱. امتیاز تجربه مثبت (XP پایه و پاداش عملکرد)', codeBadge: '+XP' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. تلاش خام درس (XP_raw,s) و سطح دروس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'تعیین می‌کند فعالیت‌هایی که نیمه‌تمام مانده‌اند چه میزان امتیاز پایه نسبت به فعالیت کامل دریافت کنند.',
  },
  {
    key: 'xpStudyMinutesDivisor',
    groupId: 'positive_xp',
    titleFa: 'مقسوم‌علیه دقایق مطالعه واقعی برای ۱ واحد XP',
    symbol: 'D_min',
    descriptionFa:
      'تعداد دقایق مطالعه واقعی لازم برای دریافت ۱ واحد XP زمانی (در فرمول: دقایق مطالعه تقسیم بر D_min).',
    unitLabelFa: 'دقیقه به ازای ۱ XP',
    defaultValue: 50,
    min: 10,
    max: 180,
    step: 5,
    usedInFormulas: [
      'XP_time = round2(M_actual,study ÷ D_min)',
      'XP_raw,s = ... + (M_actual,s ÷ D_min) + ...',
    ],
    relatedMetrics: [
      'XP زمان مطالعه (studyMinutesXp)',
      'امتیاز تجربه روزانه (XP_day)',
      'تلاش خام درس (XP_raw,s)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-11-positive-xp-formula', labelFa: '۱۱. امتیاز تجربه مثبت (XP پایه و پاداش عملکرد)', codeBadge: '+XP' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. تلاش خام درس (XP_raw,s) و سطح دروس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'کاهش این عدد (مثلاً از ۵۰ به ۳۰ دقیقه) باعث می‌شود به ازای هر ساعت مطالعه واقعی، XP بیشتری تولید شود.',
  },
  {
    key: 'xpExerciseUnit',
    groupId: 'positive_xp',
    titleFa: 'ضریب XP به ازای هر تمرین یا تست حل‌شده',
    symbol: 'XP_ex',
    descriptionFa:
      'مقدار XP مثبتی که به ازای هر ۱ عدد تمرین یا تست ثبت‌شده در فعالیت‌های درسی به دانش‌آموز داده می‌شود.',
    unitLabelFa: 'XP به ازای هر تست',
    defaultValue: 0.2,
    min: 0,
    max: 2.0,
    step: 0.05,
    usedInFormulas: [
      'XP_exercises = round2(Q_actual × XP_ex)',
      'XP_raw,s = ... + (Q_actual,s × XP_ex) + ...',
    ],
    relatedMetrics: [
      'XP تمرین و تست (exercisesXp)',
      'امتیاز تجربه روزانه (XP_day)',
      'تلاش خام درس (XP_raw,s)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-11-positive-xp-formula', labelFa: '۱۱. امتیاز تجربه مثبت (XP پایه و پاداش عملکرد)', codeBadge: '+XP' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. تلاش خام درس (XP_raw,s) و سطح دروس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'با مقدار پیش‌فرض ۰٫۲۰، حل هر ۵ تست معادل ۱ واحد XP مثبت ایجاد می‌کند.',
  },
  {
    key: 'xpQualityPointMultiplier',
    groupId: 'positive_xp',
    titleFa: 'ضریب پاداش XP به ازای هر نمره کیفیت یادگیری (۰ تا ۱۰)',
    symbol: 'XP_qual',
    descriptionFa:
      'در هر جلسه مطالعه دارای زمان واقعی مثبت، نمره کیفیت (۰ تا ۱۰) در این ضریب ضرب شده و به عنوان پاداش کیفیت جلسه اضافه می‌شود.',
    unitLabelFa: 'XP به ازای هر نمره کیفیت',
    defaultValue: 0.2,
    min: 0,
    max: 1.5,
    step: 0.05,
    usedInFormulas: [
      'XP_quality = round2(Σ (q_i × XP_qual))',
      'حداکثر پاداش هر جلسه در نمره ۱۰ برابر 10 × XP_qual',
    ],
    relatedMetrics: [
      'پاداش کیفیت یادگیری (qualityBonusXp)',
      'امتیاز تجربه روزانه (XP_day)',
      'تلاش خام درس (XP_raw,s)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-11-positive-xp-formula', labelFa: '۱۱. امتیاز تجربه مثبت (XP پایه و پاداش عملکرد)', codeBadge: '+XP' },
      { id: 'metric-3-learning-quality-l', labelFa: '۳. شاخص کیفیت یادگیری وزنی (L و Q_w)', codeBadge: 'L / Q_w' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. تلاش خام درس (XP_raw,s) و سطح دروس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'با مقدار پیش‌فرض ۰٫۲۰، یک جلسه مطالعه با کیفیت عالی (۱۰ از ۱۰) دقیقاً ۲٫۰۰ واحد XP پاداش کیفیت دریافت می‌کند.',
  },
  {
    key: 'xpSubjectActiveDayBonus',
    groupId: 'positive_xp',
    titleFa: 'پاداش XP به ازای هر روز فعال مطالعه در فرمول تک‌درس',
    symbol: 'XP_day,s',
    descriptionFa:
      'مقدار XP تشویقی که به ازای هر روز تقویمی متمایز دارای مطالعه فعال در یک درس (D_active,s) به تلاش خام آن درس (XP_raw,s) افزوده می‌شود.',
    unitLabelFa: 'XP به ازای هر روز فعال',
    defaultValue: 1.0,
    min: 0,
    max: 5.0,
    step: 0.25,
    usedInFormulas: ['XP_raw,s = ... + (D_active,s × XP_day,s)'],
    relatedMetrics: [
      'تلاش خام درس (XP_raw,s)',
      'XP ناخالص درس (XP_gross,s)',
      'XP خالص و سطح اختصاصی درس',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و پیوستگی درس', codeBadge: 'Subject XP' },
      { id: 'metric-19-subject-net-xp-and-continuity-status', labelFa: '۱۹. تراز XP اختصاصی و وضعیت چهارگانه استمرار درس', codeBadge: 'XP_subj,net' },
    ],
    impactExplanationFa:
      'توزیع مطالعه یک درس در چند روز مجزا را نسبت به انباشت کل مطالعه در یک روز تشویق می‌کند.',
  },

  // =========================================================================
  // GROUP 3: Global Fulfillment (F_d), Effective Day & Global Penalty
  // =========================================================================
  {
    key: 'dailyFulfillmentTimeWeightPct',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'سهم تحقق زمان مطالعه در نسبت تحقق برنامه روزانه (F_d)',
    symbol: 'w_F,time',
    descriptionFa:
      'درصد اثر «نسبت تحقق زمان مطالعه» (TimeFulfillment) را در فرمول نسبت تحقق برنامه درسی روز (F_d) و نوبت مطالعه درس (F_{s,d}) تعیین می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 60,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'F_d = round2((w_F,time × TimeFulfillment + w_F,task × TaskFulfillment) ÷ (w_F,time + w_F,task))',
    ],
    relatedMetrics: [
      'نسبت تحقق برنامه درسی روز (F_d)',
      'نسبت عدم تحقق برنامه (M_d = 1 - F_d)',
      'جریمه روزانه سطح کل (P_d)',
      'نسبت تحقق نوبت درس (F_{s,d})',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم کسر امتیاز و کادر اختصاصی شاخص F_d', codeBadge: '-XP / Penalty' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'در حالت استاندارد (۶۰٪ زمان + ۴۰٪ تکمیل کارت‌ها)، بخش اصلی تحقق برنامه روزانه بر پایه زمان واقعی مطالعه سنجیده می‌شود.',
  },
  {
    key: 'dailyFulfillmentTaskWeightPct',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'سهم تکمیل کارت‌های فعالیت در نسبت تحقق برنامه روزانه (F_d)',
    symbol: 'w_F,task',
    descriptionFa:
      'درصد اثر «نرخ تکمیل فعالیت‌های درسی» (TaskFulfillment) را در محاسبه شاخص تحقق برنامه درسی روز (F_d) و جلسه درس (F_{s,d}) مشخص می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 40,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'F_d = round2((w_F,time × TimeFulfillment + w_F,task × TaskFulfillment) ÷ (w_F,time + w_F,task))',
    ],
    relatedMetrics: [
      'نسبت تحقق برنامه درسی روز (F_d)',
      'نسبت عدم تحقق برنامه (M_d = 1 - F_d)',
      'جریمه روزانه سطح کل (P_d)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم کسر امتیاز و کادر اختصاصی شاخص F_d', codeBadge: '-XP / Penalty' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'باعث می‌شود رها نکردن باکس‌های درسی در کنار زمان مطالعه، ۴۰٪ از شاخص تحقق برنامه روز را تشکیل دهد.',
  },
  {
    key: 'effectiveDayFulfillmentThresholdPct',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'آستانه درصد تحقق برنامه برای محسوب شدن «روز فعال مؤثر»',
    symbol: 'θ_F,eff',
    descriptionFa:
      'حداقل درصد تحقق برنامه درسی روز (F_d) یا جلسه درس (F_{s,d}) که به تنهایی آن روز/نوبت را «فعال مؤثر» محسوب کرده و زنجیره غیبت را صفر می‌کند.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 50,
    min: 10,
    max: 95,
    step: 5,
    usedInFormulas: [
      'isEffectivelyActive = (F_d ≥ θ_F,eff ÷ 100) OR (M_actual ≥ M_min,eff AND q̄ ≥ q_min,eff)',
    ],
    relatedMetrics: [
      'تشخیص روز فعال آموزشی (isEffectivelyActive)',
      'زنجیره روزهای متوالی عدم فعالیت (k_d)',
      'جریمه روزانه سطح کل (P_d)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و شرط روز فعال', codeBadge: '-XP / Penalty' },
      { id: 'metric-18-net-global-level-balance', labelFa: '۱۸. تراز خالص سطح کل و دفتر کل تجمعی XP', codeBadge: 'XP_net' },
    ],
    impactExplanationFa:
      'اگر دانش‌آموز حداقل ۵۰٪ برنامه درسی روز را محقق کند، هیچ جریمه‌ای برای آن روز ثبت نمی‌شود و شمارنده روزهای غیبت متوالی صفر می‌گردد.',
  },
  {
    key: 'effectiveDayMinStudyMinutes',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'حداقل دقیقه مطالعه واقعی برای شرط جایگزین روز فعال مؤثر',
    symbol: 'M_min,eff',
    descriptionFa:
      'اگر درصد تحقق برنامه سنگین روز زیر ۵۰٪ باشد، مطالعه واقعی حداقل به این میزان (همراه با کیفیت قابل‌قبول) مانع از ثبت غیبت کامل روزانه می‌شود.',
    unitLabelFa: 'دقیقه',
    defaultValue: 30,
    min: 10,
    max: 120,
    step: 5,
    usedInFormulas: [
      'isEffectivelyActive = (F_d ≥ θ_F,eff) OR (M_actual ≥ M_min,eff AND N_done ≥ 1 AND q̄ ≥ q_min,eff)',
    ],
    relatedMetrics: [
      'تشخیص روز فعال آموزشی (isEffectivelyActive)',
      'تعداد روزهای فعال آموزشی (totalActiveEducationalDays)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و شرط روز فعال', codeBadge: '-XP / Penalty' },
    ],
    impactExplanationFa:
      'از جریمه شدن ناعادلانه دانش‌آموز در روزهایی که برنامه بسیار سنگینی نوشته اما حداقل ۳۰ دقیقه مطالعه باکیفیت داشته است جلوگیری می‌کند.',
  },
  {
    key: 'effectiveDayMinQualityScore',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'حداقل کیفیت یادگیری مجاز در شرط جایگزین روز فعال و عمق درس',
    symbol: 'q_min,eff',
    descriptionFa:
      'حداقل میانگین کیفیت یادگیری وزنی (از ۱۰) برای پذیرش شرط دوم روز فعال آموزشی و همچنین مرز اعمال ضریب جریمه کیفیت سطحی در M_depth.',
    unitLabelFa: 'نمره از ۱۰',
    defaultValue: 4.0,
    min: 1.0,
    max: 8.0,
    step: 0.5,
    usedInFormulas: [
      'hasAcceptableQuality = (q̄_w ≥ q_min,eff)',
      'اگر q̄_w,s < q_min,eff آنگاه M_depth ×= k_shallow',
    ],
    relatedMetrics: [
      'تشخیص روز فعال آموزشی (isEffectivelyActive)',
      'ضریب عمق یادگیری درس (M_depth)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی)', codeBadge: '-XP / Penalty' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP و ضریب عمق یادگیری درس (M_depth)', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'مطالعات با کیفیت بسیار پایین‌تر از این مرز (کمتر از ۴ از ۱۰) مشمول کاهش ضریب عمق یادگیری درس می‌شوند.',
  },
  {
    key: 'globalBasePenaltyRatePct',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'درصد جریمه پایه روزانه سطح کل از میانگین XP روزهای فعال',
    symbol: 'p_B,global',
    descriptionFa:
      'جریمه پایه روزانه عدم فعالیت (B) برابر این درصد از میانگین XP کسب‌شده در روزهای فعال گذشته دانش‌آموز محاسبه می‌شود.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 10,
    min: 1,
    max: 50,
    step: 1,
    usedInFormulas: ['B = clamp(AvgActiveDailyXP × (p_B,global ÷ 100), B_min, B_max)'],
    relatedMetrics: [
      'جریمه پایه روزانه سطح کل (B)',
      'جریمه کسرشده روزانه (P_d = B × r_d × M_d)',
      'XP خالص کل (netTotalXp)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و تنزل سطح/پله', codeBadge: '-XP / Penalty' },
      { id: 'metric-18-net-global-level-balance', labelFa: '۱۸. تراز خالص سطح کل و دفتر کل تجمعی XP', codeBadge: 'XP_net' },
    ],
    impactExplanationFa:
      'با مقدار پیش‌فرض ۱۰٪، اگر میانگین XP روزهای فعال دانش‌آموز ۱۸ XP باشد، جریمه پایه روز اول غیبت کامل ۱٫۸۰ XP خواهد بود.',
  },
  {
    key: 'globalBasePenaltyMinXp',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'حداقل (کف) جریمه پایه روزانه سطح کل',
    symbol: 'B_min',
    descriptionFa:
      'کمترین مقدار مجاز برای جریمه پایه روزانه سطح کل (B) حتی اگر میانگین XP روزهای فعال دانش‌آموز بسیار کم باشد.',
    unitLabelFa: 'واحد XP',
    defaultValue: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    usedInFormulas: ['B = max(B_min, min(B_max, AvgActiveDailyXP × p_B,global))'],
    relatedMetrics: ['جریمه پایه روزانه سطح کل (B)', 'جریمه روزانه سطح کل (P_d)'],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و تنزل سطح/پله', codeBadge: '-XP / Penalty' },
    ],
    impactExplanationFa:
      'تضمین می‌کند جریمه پایه روزانه در سطح کل هرگز از این کف (پیش‌فرض ۱٫۰ XP) کمتر نشود.',
  },
  {
    key: 'globalBasePenaltyMaxXp',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'حداکثر (سقف) جریمه پایه روزانه سطح کل',
    symbol: 'B_max',
    descriptionFa:
      'بیشترین مقدار مجاز برای جریمه پایه روزانه سطح کل (B) تا دانش‌آموزان بسیار پرکار در روزهای استراحت یا بیماری جریمه سنگین غیرمنطقی نخورند.',
    unitLabelFa: 'واحد XP',
    defaultValue: 10.0,
    min: 2.0,
    max: 30.0,
    step: 0.5,
    usedInFormulas: ['B = max(B_min, min(B_max, AvgActiveDailyXP × p_B,global))'],
    relatedMetrics: ['جریمه پایه روزانه سطح کل (B)', 'جریمه روزانه سطح کل (P_d)'],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و تنزل سطح/پله', codeBadge: '-XP / Penalty' },
    ],
    impactExplanationFa:
      'سقف ایمنی برای جریمه پایه روزانه ایجاد می‌کند (پیش‌فرض حداکثر ۱۰٫۰ XP).',
  },
  {
    key: 'globalFallbackAvgDailyXp',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'میانگین پیش‌فرض XP روزانه در صورت نبود سابقه روز فعال قبلی',
    symbol: 'XP_avg,init',
    descriptionFa:
      'اگر دانش‌آموز هنوز هیچ روز فعالی ثبت نکرده باشد و برنامه روز اول را رها کند، این عدد به عنوان میانگین مرجع برای محاسبه B به کار می‌رود.',
    unitLabelFa: 'واحد XP',
    defaultValue: 12.0,
    min: 2.0,
    max: 40.0,
    step: 1.0,
    usedInFormulas: ['AvgActiveDailyXP = count > 0 ? mean(ActiveXPs) : XP_avg,init'],
    relatedMetrics: ['جریمه پایه روزانه سطح کل (B)'],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و تنزل سطح/پله', codeBadge: '-XP / Penalty' },
    ],
    impactExplanationFa:
      'با پیش‌فرض ۱۲٫۰ XP و نرخ ۱۰٪، جریمه پایه اولیه پیش از ثبت اولین روز فعال برابر ۱٫۲۰ XP خواهد بود.',
  },
  {
    key: 'globalStreakEscalationStep',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'گام افزایش ضریب تشدید به ازای هر روز غیبت متوالی سطح کل',
    symbol: 'Δr_global',
    descriptionFa:
      'مقداری که به ازای هر روز تداوم عدم فعالیت برنامه‌ریزی‌شده (k_d) به ضریب تشدید پایه ۱٫۰ اضافه می‌شود.',
    unitLabelFa: 'گام ضریب',
    defaultValue: 0.5,
    min: 0.1,
    max: 2.0,
    step: 0.05,
    usedInFormulas: ['r_d(k_d) = min(r_max,global , 1.0 + Δr_global × (k_d - 1))'],
    relatedMetrics: [
      'ضریب تشدید روزهای متوالی وقفه (r_d)',
      'جریمه روزانه سطح کل (P_d)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و ضریب تشدید r_d', codeBadge: '-XP / Penalty' },
      { id: 'metric-18-net-global-level-balance', labelFa: '۱۸. تراز خالص سطح کل و دفتر کل تجمعی XP', codeBadge: 'XP_net' },
    ],
    impactExplanationFa:
      'با گام پیش‌فرض ۰٫۵۰، ضریب تشدید در روزهای ۱ تا ۷ متوالی به ترتیب برابر ۱٫۰، ۱٫۵، ۲٫۰، ۲٫۵، ۳٫۰، ۳٫۵ و ۴٫۰ خواهد بود.',
  },
  {
    key: 'globalStreakEscalationCap',
    groupId: 'global_fulfillment_penalty',
    titleFa: 'سقف نهایی ضریب تشدید روزهای متوالی عدم فعالیت کل',
    symbol: 'r_max,global',
    descriptionFa:
      'حداکثر مقداری که ضریب تشدید غیبت متوالی سطح کل (r_d) می‌تواند به آن برسد.',
    unitLabelFa: 'ضریب (×)',
    defaultValue: 4.0,
    min: 1.0,
    max: 10.0,
    step: 0.25,
    usedInFormulas: ['r_d(k_d) = min(r_max,global , 1.0 + Δr_global × (k_d - 1))'],
    relatedMetrics: ['ضریب تشدید روزهای متوالی وقفه (r_d)', 'جریمه روزانه سطح کل (P_d)'],
    relatedDefinitionIds: [
      { id: 'metric-12-negative-xp-penalty-demotion', labelFa: '۱۲. مکانیسم هوشمند کسر امتیاز (XP منفی) و ضریب تشدید r_d', codeBadge: '-XP / Penalty' },
    ],
    impactExplanationFa:
      'از رشد بی‌نهایت جریمه در وقفه‌های طولانی جلوگیری کرده و ضریب تشدید را روی سقف (پیش‌فرض ۴٫۰×) قفل می‌کند.',
  },

  // =========================================================================
  // GROUP 4: Subject Progression, M_depth & Subject Penalty
  // =========================================================================
  {
    key: 'subjectMasteryQualityWeightPct',
    groupId: 'subject_progression',
    titleFa: 'وزن کیفیت یادگیری نرمال‌شده در شاخص تسلط درس (Mastery)',
    symbol: 'w_M,qual',
    descriptionFa:
      'سهم درصدی کیفیت یادگیری وزنی درس (L_s / 10) در محاسبه شاخص ترکیبی تسلط درس (MasteryIndex_s) که ورودی مستقیم ضریب عمق یادگیری (M_depth) است.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 45,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Mastery_s = (w_M,qual×Q_norm + w_M,edu×E_norm + w_M,task×TaskRatio + w_M,cons×Cons_norm) ÷ Σw_M',
    ],
    relatedMetrics: [
      'شاخص تسلط درس (MasteryIndex_s)',
      'ضریب عمق یادگیری درس (M_depth)',
      'XP ناخالص و خالص درس',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
      { id: 'metric-3-learning-quality-l', labelFa: '۳. شاخص کیفیت یادگیری وزنی (L و Q_w)', codeBadge: 'L / Q_w' },
    ],
    impactExplanationFa:
      'با وزن ۴۵٪، کیفیت یادگیری مهم‌ترین عامل تعیین‌کننده ضریب عمق یادگیری (M_depth) در هر درس است.',
  },
  {
    key: 'subjectMasteryEduWeightPct',
    groupId: 'subject_progression',
    titleFa: 'وزن امتیاز آموزشی درس (E_s) در شاخص تسلط درس (Mastery)',
    symbol: 'w_M,edu',
    descriptionFa:
      'سهم درصدی امتیاز مستقیم آموزشی درس (E_s / 100) در شکل‌دهی به شاخص تسلط درس (MasteryIndex_s) و ضریب عمق یادگیری (M_depth).',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 35,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Mastery_s = (w_M,qual×Q_norm + w_M,edu×E_norm + w_M,task×TaskRatio + w_M,cons×Cons_norm) ÷ Σw_M',
    ],
    relatedMetrics: [
      'امتیاز آموزشی اختصاصی درس (E_s)',
      'ضریب عمق یادگیری درس (M_depth)',
      'XP ناخالص درس',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
      { id: 'metric-4-educational-score-e', labelFa: '۴. امتیاز مستقیم آموزشی (E)', codeBadge: 'E' },
    ],
    impactExplanationFa:
      'نسبت تحقق زمان و تست‌های هدف درس را با وزن ۳۵٪ وارد ضریب اثربخشی و عمق یادگیری درس می‌کند.',
  },
  {
    key: 'subjectMasteryTaskWeightPct',
    groupId: 'subject_progression',
    titleFa: 'وزن نرخ تکمیل جلسات درس در شاخص تسلط درس (Mastery)',
    symbol: 'w_M,task',
    descriptionFa:
      'سهم درصدی نرخ تکمیل جلسات برنامه‌ریزی‌شده درس (TaskCompletionRatio_s) در محاسبه شاخص تسلط و ضریب عمق یادگیری درس.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 10,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Mastery_s = (w_M,qual×Q_norm + w_M,edu×E_norm + w_M,task×TaskRatio + w_M,cons×Cons_norm) ÷ Σw_M',
    ],
    relatedMetrics: ['ضریب عمق یادگیری درس (M_depth)', 'XP ناخالص درس'],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'تکمیل منظم جلسات درس بدون رها کردن باکس‌ها، ۱۰٪ از شاخص تسلط درس را تأمین می‌کند.',
  },
  {
    key: 'subjectMasteryConsistencyWeightPct',
    groupId: 'subject_progression',
    titleFa: 'وزن استمرار روزهای فعال مطالعه در شاخص تسلط درس (Mastery)',
    symbol: 'w_M,cons',
    descriptionFa:
      'سهم درصدی شاخص تداوم روزهای فعال درس (ConsistencyNorm = min(1, D_active,s / Cap)) در محاسبه MasteryIndex_s و M_depth.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 10,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Mastery_s = (w_M,qual×Q_norm + w_M,edu×E_norm + w_M,task×TaskRatio + w_M,cons×Cons_norm) ÷ Σw_M',
    ],
    relatedMetrics: [
      'تعداد روزهای فعال درس (D_active,s)',
      'ضریب عمق یادگیری درس (M_depth)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'تداوم مطالعه درس در طول روزهای مختلف، ۱۰٪ پایانی شاخص تسلط درس را تکمیل می‌کند.',
  },
  {
    key: 'subjectConsistencyMaxDaysCap',
    groupId: 'subject_progression',
    titleFa: 'سقف روزهای فعال برای رسیدن به استمرار کامل درس (۱۰۰٪)',
    symbol: 'D_cap,cons',
    descriptionFa:
      'تعداد روزهای متمایز مطالعه فعال یک درس که با رسیدن به آن، مؤلفه استمرار درس (ConsistencyNorm) به سقف ۱٫۰۰ (۱۰۰٪) می‌رسد.',
    unitLabelFa: 'روز فعال',
    defaultValue: 25,
    min: 5,
    max: 90,
    step: 1,
    usedInFormulas: ['ConsistencyNorm_s = min(1.0, D_active,s ÷ D_cap,cons)'],
    relatedMetrics: ['ضریب عمق یادگیری درس (M_depth)'],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'با مقدار پیش‌فرض ۲۵ روز، هر روز مطالعه فعال معادل ۴٪ از سقف استمرار آن درس را پر می‌کند.',
  },
  {
    key: 'subjectDepthBaseIntercept',
    groupId: 'subject_progression',
    titleFa: 'عرض از مبدأ (پایه حداقل) فرمول ضریب عمق یادگیری درس',
    symbol: 'α_depth',
    descriptionFa:
      'مقدار پایه اولیه در فرمول خطی ضریب عمق یادگیری درس (M_depth = α_depth + β_depth × Mastery_s) پیش از اعمال تسلط.',
    unitLabelFa: 'ضریب پایه',
    defaultValue: 0.28,
    min: 0.1,
    max: 1.0,
    step: 0.02,
    usedInFormulas: ['M_depth = round2(α_depth + β_depth × Mastery_s)'],
    relatedMetrics: [
      'ضریب عمق یادگیری / ضریب اثربخشی درس (M_depth)',
      'XP ناخالص درس (XP_gross,s)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'در کنار شیب β_depth=0.97، بازه استاندارد ضریب عمق یادگیری را تا سقف ۱٫۲۵ (0.28 + 0.97 = 1.25) تنظیم می‌کند.',
  },
  {
    key: 'subjectDepthSlope',
    groupId: 'subject_progression',
    titleFa: 'شیب اثر شاخص تسلط بر ضریب عمق یادگیری درس',
    symbol: 'β_depth',
    descriptionFa:
      'ضریبی که در شاخص تسلط درس (Mastery_s بین ۰ تا ۱) ضرب شده و به پایه α_depth اضافه می‌شود تا ضریب عمق یادگیری (M_depth) به دست آید.',
    unitLabelFa: 'ضریب شیب',
    defaultValue: 0.97,
    min: 0.1,
    max: 2.0,
    step: 0.03,
    usedInFormulas: ['M_depth = round2(α_depth + β_depth × Mastery_s)'],
    relatedMetrics: [
      'ضریب عمق یادگیری / ضریب اثربخشی درس (M_depth)',
      'XP ناخالص درس (XP_gross,s)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'هرچه این شیب بزرگ‌تر باشد، تفاوت بین مطالعه با تسلط بالا و مطالعه کم‌کیفیت در XP نهایی درس بیشتر خواهد بود.',
  },
  {
    key: 'subjectShallowQualityPenaltyFactor',
    groupId: 'subject_progression',
    titleFa: 'ضریب تعدیل (کاهش) عمق یادگیری در صورت کیفیت سطحی درس',
    symbol: 'k_shallow',
    descriptionFa:
      'اگر میانگین کیفیت یادگیری وزنی یک درس کمتر از آستانه مجاز (پیش‌فرض ۴ از ۱۰) باشد، ضریب عمق یادگیری M_depth در این عدد ضرب می‌شود.',
    unitLabelFa: 'ضریب (۰ تا ۱)',
    defaultValue: 0.65,
    min: 0.2,
    max: 1.0,
    step: 0.05,
    usedInFormulas: ['اگر q̄_w,s < q_min,eff آنگاه M_depth = round2(M_depth × k_shallow)'],
    relatedMetrics: ['ضریب عمق یادگیری درس (M_depth)', 'XP ناخالص درس (XP_gross,s)'],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری (M_depth) و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'مانع از صعود کاذب سطح درس با ساعت مطالعه بالا اما بدون تمرکز و کیفیت واقعی (کاهش ۳۵٪ با ضریب ۰٫۶۵) می‌شود.',
  },
  {
    key: 'subjectEffectiveMinStudyMinutes',
    groupId: 'subject_progression',
    titleFa: 'حداقل دقیقه مطالعه واقعی برای جلسه مؤثر تک‌درس',
    symbol: 'M_min,subj',
    descriptionFa:
      'اگر تحقق نوبت مطالعه یک درس زیر آستانه ۵۰٪ باشد، ثبت حداقل این تعداد دقیقه مطالعه واقعی همراه با انجام فعالیت، آن نوبت را برای آن درس مؤثر به شمار می‌آورد.',
    unitLabelFa: 'دقیقه',
    defaultValue: 25,
    min: 5,
    max: 90,
    step: 5,
    usedInFormulas: [
      'isEffectiveStudySession = (F_{s,d} ≥ θ_F,eff) OR (M_actual,s,d ≥ M_min,subj AND N_done,s,d ≥ 1)',
    ],
    relatedMetrics: [
      'تعداد نوبت‌های متوالی ازدست‌رفته درس (k_s)',
      'آخرین تاریخ مطالعه مؤثر درس',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و پیوستگی درس', codeBadge: 'Subject XP' },
      { id: 'metric-19-subject-net-xp-and-continuity-status', labelFa: '۱۹. تراز XP اختصاصی و وضعیت چهارگانه استمرار درس', codeBadge: 'XP_subj,net' },
    ],
    impactExplanationFa:
      'مشخص می‌کند چه حداقل زمانی از مطالعه یک درس زنجیره غیبت متوالی آن درس را صفر می‌کند.',
  },
  {
    key: 'subjectBasePenaltyRatePct',
    groupId: 'subject_progression',
    titleFa: 'درصد جریمه پایه هر نوبت ازدست‌رفته درس از میانگین XP جلسه',
    symbol: 'p_B,subj',
    descriptionFa:
      'جریمه پایه هر نوبت برنامه‌ریزی‌شده ازدست‌رفته در یک درس (B_s) برابر این درصد از میانگین XP جلسات فعال قبلی همان درس است.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 12,
    min: 1,
    max: 50,
    step: 1,
    usedInFormulas: ['B_s = clamp(AvgSessionXP_s × (p_B,subj ÷ 100), B_s,min, B_s,max)'],
    relatedMetrics: [
      'جریمه پایه نوبت ازدست‌رفته درس (B_s)',
      'مجموع جریمه کسرشده درس (subjectPenaltyXp)',
      'XP خالص درس (subjectXp)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و جریمه درس (B_s)', codeBadge: 'Subject XP' },
      { id: 'metric-19-subject-net-xp-and-continuity-status', labelFa: '۱۹. تراز XP اختصاصی و وضعیت چهارگانه استمرار درس', codeBadge: 'XP_subj,net' },
    ],
    impactExplanationFa:
      'نرخ پایه کسر XP اختصاصی هر درس را در صورت رها کردن نوبت‌های برنامه‌ریزی‌شده همان درس تعیین می‌کند.',
  },
  {
    key: 'subjectBasePenaltyMinXp',
    groupId: 'subject_progression',
    titleFa: 'حداقل (کف) جریمه پایه هر نوبت ازدست‌رفته درس',
    symbol: 'B_s,min',
    descriptionFa:
      'کمترین مقدار مجاز برای جریمه پایه هر نوبت ازدست‌رفته در یک درس (B_s).',
    unitLabelFa: 'واحد XP',
    defaultValue: 0.6,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    usedInFormulas: ['B_s = max(B_s,min, min(B_s,max, AvgSessionXP_s × p_B,subj))'],
    relatedMetrics: ['جریمه پایه درس (B_s)', 'XP خالص درس (subjectXp)'],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و جریمه درس (B_s)', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'حتی اگر میانگین XP جلسات درس کم باشد، جریمه پایه هر نوبت غیبت کامل از این کف (پیش‌فرض ۰٫۶۰ XP) کمتر نخواهد بود.',
  },
  {
    key: 'subjectBasePenaltyMaxXp',
    groupId: 'subject_progression',
    titleFa: 'حداکثر (سقف) جریمه پایه هر نوبت ازدست‌رفته درس',
    symbol: 'B_s,max',
    descriptionFa:
      'بیشترین مقدار مجاز برای جریمه پایه هر نوبت ازدست‌رفته در یک درس (B_s).',
    unitLabelFa: 'واحد XP',
    defaultValue: 4.5,
    min: 1.0,
    max: 15.0,
    step: 0.25,
    usedInFormulas: ['B_s = max(B_s,min, min(B_s,max, AvgSessionXP_s × p_B,subj))'],
    relatedMetrics: ['جریمه پایه درس (B_s)', 'XP خالص درس (subjectXp)'],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و جریمه درس (B_s)', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'سقف ایمنی برای جریمه پایه هر جلسه ازدست‌رفته درس ایجاد می‌کند (پیش‌فرض ۴٫۵۰ XP).',
  },
  {
    key: 'subjectStreakEscalationStep',
    groupId: 'subject_progression',
    titleFa: 'گام افزایش ضریب تشدید به ازای هر نوبت متوالی ازدست‌رفته درس',
    symbol: 'Δr_subj',
    descriptionFa:
      'مقداری که به ازای هر نوبت متوالی غیبت در یک درس مشخص (k_s) به ضریب پایه ۱٫۰۰ افزوده می‌شود.',
    unitLabelFa: 'گام ضریب',
    defaultValue: 0.35,
    min: 0.05,
    max: 1.5,
    step: 0.05,
    usedInFormulas: ['r_s(k_s) = min(r_max,subj , 1.0 + Δr_subj × (k_s - 1))'],
    relatedMetrics: [
      'ضریب تشدید نوبت‌های متوالی درس (r_s)',
      'جریمه نوبت ازدست‌رفته درس',
      'XP خالص درس (subjectXp)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و ضرایب تشدید r_s', codeBadge: 'Subject XP' },
      { id: 'metric-19-subject-net-xp-and-continuity-status', labelFa: '۱۹. تراز XP اختصاصی و وضعیت چهارگانه استمرار درس', codeBadge: 'XP_subj,net' },
    ],
    impactExplanationFa:
      'با گام پیش‌فرض ۰٫۳۵، ضرایب نوبت‌های ۱ تا ۵ متوالی غیبت یک درس به ترتیب ۱٫۰۰، ۱٫۳۵، ۱٫۷۰، ۲٫۰۵ و ۲٫۵۰ (سقف) خواهند بود.',
  },
  {
    key: 'subjectStreakEscalationCap',
    groupId: 'subject_progression',
    titleFa: 'سقف نهایی ضریب تشدید نوبت‌های متوالی ازدست‌رفته درس',
    symbol: 'r_max,subj',
    descriptionFa:
      'حداکثر مقداری که ضریب تشدید نوبت‌های متوالی ازدست‌رفته یک درس (r_s) می‌تواند به آن برسد.',
    unitLabelFa: 'ضریب (×)',
    defaultValue: 2.5,
    min: 1.0,
    max: 6.0,
    step: 0.25,
    usedInFormulas: ['r_s(k_s) = min(r_max,subj , 1.0 + Δr_subj × (k_s - 1))'],
    relatedMetrics: ['ضریب تشدید نوبت‌های متوالی درس (r_s)', 'XP خالص درس (subjectXp)'],
    relatedDefinitionIds: [
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و ضرایب تشدید r_s', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'ضریب تشدید غیبت متوالی درس را حداکثر روی سقف (پیش‌فرض ۲٫۵۰×) محدود نگه می‌دارد.',
  },

  // =========================================================================
  // GROUP 5: 7-Day XP Velocity & Subject Continuity Thresholds
  // =========================================================================
  {
    key: 'velocityCalendarWeightPct',
    groupId: 'velocity_continuity',
    titleFa: 'وزن نرخ تقویمی ۷ روزه در سرعت مؤثر روزانه کسب XP',
    symbol: 'w_V,cal',
    descriptionFa:
      'سهم درصدی میانگین تقویمی ۷ روز اخیر (NetXP_7d ÷ 7) در محاسبه نرخ مؤثر روزانه کسب XP (dailyRate7dEffective) و پیش‌بینی صعود سطح.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 45,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Rate_7d,eff = (w_V,cal×Rate_cal + w_V,acc×Rate_acc + w_V,trim×Rate_trim) ÷ Σw_V',
    ],
    relatedMetrics: [
      'سرعت مؤثر روزانه کسب XP (dailyRate7dEffective)',
      'تخمین روزهای باقیمانده تا پله بعد (estimatedDaysToNextLevel)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-15-xp-daily-velocity', labelFa: '۱۵. سرعت روزانه کسب XP (۷، ۱۴ و ۳۰ روزه)', codeBadge: 'Velocity' },
      { id: 'metric-17-next-level-prediction', labelFa: '۱۷. پیش‌بینی هوشمند زمان صعود به سطح / پله بعد', codeBadge: 'ETA' },
    ],
    impactExplanationFa:
      'تداوم واقعی در تمام ۷ روز هفته تقویمی را در سرعت پیشرفت دانش‌آموز لحاظ می‌کند.',
  },
  {
    key: 'velocityAccountableWeightPct',
    groupId: 'velocity_continuity',
    titleFa: 'وزن نرخ روزهای تعهددار در سرعت مؤثر روزانه کسب XP',
    symbol: 'w_V,acc',
    descriptionFa:
      'سهم درصدی میانگین XP در روزهای دارای برنامه درسی (NetXP_7d ÷ AccountableDays_7d) در محاسبه سرعت مؤثر ۷ روزه.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 35,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Rate_7d,eff = (w_V,cal×Rate_cal + w_V,acc×Rate_acc + w_V,trim×Rate_trim) ÷ Σw_V',
    ],
    relatedMetrics: [
      'سرعت مؤثر روزانه کسب XP (dailyRate7dEffective)',
      'تخمین روزهای باقیمانده تا پله بعد',
    ],
    relatedDefinitionIds: [
      { id: 'metric-15-xp-daily-velocity', labelFa: '۱۵. سرعت روزانه کسب XP (۷، ۱۴ و ۳۰ روزه)', codeBadge: 'Velocity' },
      { id: 'metric-17-next-level-prediction', labelFa: '۱۷. پیش‌بینی هوشمند زمان صعود به سطح / پله بعد', codeBadge: 'ETA' },
    ],
    impactExplanationFa:
      'باعث می‌شود روزهای استراحت بدون برنامه، سرعت واقعی روزهای کاری دانش‌آموز را به طور کاذب پایین نیاورند.',
  },
  {
    key: 'velocityTrimmedWeightPct',
    groupId: 'velocity_continuity',
    titleFa: 'وزن میانگین پیراسته (حذف کمینه و بیشینه) در سرعت مؤثر کسب XP',
    symbol: 'w_V,trim',
    descriptionFa:
      'سهم درصدی میانگین ۵ روز میانی هفته (پس از حذف پُرامتیازترین و کم‌امتیازترین روز) در محاسبه سرعت مؤثر ۷ روزه کسب XP.',
    unitLabelFa: 'درصد (٪)',
    defaultValue: 20,
    min: 0,
    max: 100,
    step: 5,
    usedInFormulas: [
      'Rate_7d,eff = (w_V,cal×Rate_cal + w_V,acc×Rate_acc + w_V,trim×Rate_trim) ÷ Σw_V',
    ],
    relatedMetrics: [
      'سرعت مؤثر روزانه کسب XP (dailyRate7dEffective)',
      'تخمین روزهای باقیمانده تا پله بعد',
    ],
    relatedDefinitionIds: [
      { id: 'metric-15-xp-daily-velocity', labelFa: '۱۵. سرعت روزانه کسب XP (۷، ۱۴ و ۳۰ روزه)', codeBadge: 'Velocity' },
      { id: 'metric-16-xp-weekly-trend-alignment', labelFa: '۱۶. روند سرعت پیشرفت هفتگی و هم‌سنجی با E', codeBadge: 'Trend & E' },
    ],
    impactExplanationFa:
      'اثر نوسانات شدید تک‌روزه را ملایم کرده و پایداری سرعت هفتگی را می‌سنجد.',
  },
  {
    key: 'subjectAttentionDaysThreshold',
    groupId: 'velocity_continuity',
    titleFa: 'آستانه روزهای فاصله از آخرین مطالعه درس برای وضعیت «نیازمند توجه»',
    symbol: 'D_att,subj',
    descriptionFa:
      'اگر بیش از این تعداد روز از آخرین مطالعه مؤثر یک درس بگذرد، وضعیت پیوستگی آن درس از «وضعیت عادی» به «نیازمند توجه» تغییر می‌کند.',
    unitLabelFa: 'روز',
    defaultValue: 6,
    min: 2,
    max: 21,
    step: 1,
    usedInFormulas: [
      'اگر k_s == 1 یا DaysSinceLastStudy > D_att,subj آنگاه وضعیت = «نیازمند توجه»',
    ],
    relatedMetrics: [
      'وضعیت پیوستگی درس (continuityStatus)',
      'فاصله از آخرین مطالعه مؤثر (daysSinceLastStudy)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-19-subject-net-xp-and-continuity-status', labelFa: '۱۹. تراز XP اختصاصی و وضعیت چهارگانه استمرار هر درس', codeBadge: 'XP_subj,net' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'هشدار زودهنگام برای درس‌هایی که بیش از یک هفته (۶ روز) از آخرین مطالعه آن‌ها گذشته است ایجاد می‌کند.',
  },
  {
    key: 'subjectCriticalDaysThreshold',
    groupId: 'velocity_continuity',
    titleFa: 'آستانه روزهای فاصله از آخرین مطالعه درس برای وضعیت «استمرار ضعیف»',
    symbol: 'D_crit,subj',
    descriptionFa:
      'اگر بیش از این تعداد روز از آخرین مطالعه مؤثر یک درس (با حداقل ۲ روز سابقه برنامه‌ریزی) بگذرد، وضعیت پیوستگی آن به «استمرار ضعیف» (بحرانی) تغییر می‌کند.',
    unitLabelFa: 'روز',
    defaultValue: 12,
    min: 4,
    max: 45,
    step: 1,
    usedInFormulas: [
      'اگر k_s ≥ 3 یا (DaysSinceLastStudy > D_crit,subj و PlannedDays ≥ 2) آنگاه وضعیت = «استمرار ضعیف»',
    ],
    relatedMetrics: [
      'وضعیت پیوستگی درس (continuityStatus)',
      'فاصله از آخرین مطالعه مؤثر (daysSinceLastStudy)',
    ],
    relatedDefinitionIds: [
      { id: 'metric-19-subject-net-xp-and-continuity-status', labelFa: '۱۹. تراز XP اختصاصی و وضعیت چهارگانه استمرار هر درس', codeBadge: 'XP_subj,net' },
      { id: 'metric-14-subject-xp-continuity', labelFa: '۱۴. سیستم XP، ضریب عمق یادگیری و پیوستگی درس', codeBadge: 'Subject XP' },
    ],
    impactExplanationFa:
      'مشخص می‌کند پس از چند روز رها شدن کامل یک درس، هشدار قرمز «استمرار ضعیف» در کارنامه درس نمایش داده شود.',
  },
];

/**
 * Bidirectional mapping from each Definition Accordion ID in MetricsDefinitionsView
 * to its corresponding row in ComprehensiveMetricsTable and its configurable coefficients.
 */
export const METRIC_DEFINITION_TO_TABLE_ROW_MAP: Record<string, string> = {
  'metric-1-study-time-t': 'row-metric-t',
  'metric-2-exercises-q': 'row-metric-q',
  'metric-3-learning-quality-l': 'row-metric-qw-and-l',
  'metric-4-educational-score-e': 'row-metric-e',
  'metric-5-restricted-control-c': 'row-metric-c',
  'metric-6-final-daily-score-ds': 'row-metric-ds',
  'metric-7-daily-time-budget': 'row-budget-day',
  'metric-8-plan-adherence-variance': 'row-adherence-pct',
  'metric-9-period-aggregation': 'row-period-aggregates',
  'metric-10-subject-share-comparison': 'row-period-aggregates',
  'metric-11-positive-xp-formula': 'row-xp-pos-total',
  'metric-12-negative-xp-penalty-demotion': 'row-metric-fd',
  'metric-13-global-39-stages': 'row-metric-xp-net-global',
  'metric-14-subject-xp-continuity': 'row-subject-m-depth',
  'metric-15-xp-daily-velocity': 'row-velocity-rates',
  'metric-16-xp-weekly-trend-alignment': 'row-velocity-rates',
  'metric-17-next-level-prediction': 'row-est-days-next-stage',
  'metric-18-net-global-level-balance': 'row-metric-xp-net-global',
  'metric-19-subject-net-xp-and-continuity-status': 'row-subject-continuity-status',
};

export function getCoefficientsForDefinitionId(
  definitionId: string
): CoefficientMetadataItem[] {
  return COEFFICIENT_METADATA_CATALOG.filter((item) =>
    item.relatedDefinitionIds.some((rel) => rel.id === definitionId)
  );
}

const METADATA_BY_KEY = new Map<keyof AnalyticsCoefficientsConfig, CoefficientMetadataItem>(
  COEFFICIENT_METADATA_CATALOG.map((item) => [item.key, item])
);

let cachedCoefficients: AnalyticsCoefficientsConfig | null = null;

function sanitizeSingleValue(
  key: keyof AnalyticsCoefficientsConfig,
  rawVal: unknown
): number {
  const meta = METADATA_BY_KEY.get(key);
  const fallback = DEFAULT_ANALYTICS_COEFFICIENTS[key];
  if (!meta) return fallback;

  const num = Number(rawVal);
  if (!Number.isFinite(num)) return fallback;

  const clamped = Math.max(meta.min, Math.min(meta.max, num));
  return Math.round(clamped * 1000) / 1000;
}

export function validateCoefficientValue(
  key: keyof AnalyticsCoefficientsConfig,
  rawVal: unknown
): { valid: boolean; numericValue: number; errorFa?: string } {
  const meta = METADATA_BY_KEY.get(key);
  if (!meta) {
    return { valid: false, numericValue: 0, errorFa: 'ضریب نامعتبر است.' };
  }

  if (rawVal === '' || rawVal === null || rawVal === undefined) {
    return {
      valid: false,
      numericValue: meta.defaultValue,
      errorFa: 'لطفاً یک مقدار عددی وارد کنید.',
    };
  }

  const num = Number(rawVal);
  if (!Number.isFinite(num)) {
    return {
      valid: false,
      numericValue: meta.defaultValue,
      errorFa: 'مقدار واردشده باید عدد معتبر باشد.',
    };
  }

  if (num < meta.min || num > meta.max) {
    return {
      valid: false,
      numericValue: num,
      errorFa: `مقدار مجاز بین ${meta.min} تا ${meta.max} (${meta.unitLabelFa}) است.`,
    };
  }

  return {
    valid: true,
    numericValue: Math.round(num * 1000) / 1000,
  };
}

export function getAnalyticsCoefficients(): AnalyticsCoefficientsConfig {
  if (cachedCoefficients) {
    return cachedCoefficients;
  }

  const merged: AnalyticsCoefficientsConfig = { ...DEFAULT_ANALYTICS_COEFFICIENTS };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(ANALYTICS_COEFFICIENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<keyof AnalyticsCoefficientsConfig, unknown>>;
        if (parsed && typeof parsed === 'object') {
          for (const item of COEFFICIENT_METADATA_CATALOG) {
            if (parsed[item.key] !== undefined) {
              merged[item.key] = sanitizeSingleValue(item.key, parsed[item.key]);
            }
          }
        }
      }
    } catch {
      // Fallback to defaults on malformed storage
    }
  }

  cachedCoefficients = merged;
  return merged;
}

function notifyCoefficientsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ANALYTICS_COEFFICIENTS_CHANGED_EVENT));
  }
}

export function saveAnalyticsCoefficients(
  partialUpdate: Partial<AnalyticsCoefficientsConfig>
): AnalyticsCoefficientsConfig {
  const current = getAnalyticsCoefficients();
  const next: AnalyticsCoefficientsConfig = { ...current };

  for (const item of COEFFICIENT_METADATA_CATALOG) {
    if (partialUpdate[item.key] !== undefined) {
      next[item.key] = sanitizeSingleValue(item.key, partialUpdate[item.key]);
    }
  }

  // Enforce logical ordering between min/max pairs
  if (next.globalBasePenaltyMinXp > next.globalBasePenaltyMaxXp) {
    next.globalBasePenaltyMinXp = next.globalBasePenaltyMaxXp;
  }
  if (next.subjectBasePenaltyMinXp > next.subjectBasePenaltyMaxXp) {
    next.subjectBasePenaltyMinXp = next.subjectBasePenaltyMaxXp;
  }
  if (next.subjectAttentionDaysThreshold >= next.subjectCriticalDaysThreshold) {
    next.subjectCriticalDaysThreshold = Math.min(
      45,
      next.subjectAttentionDaysThreshold + 1
    );
  }

  cachedCoefficients = next;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(ANALYTICS_COEFFICIENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }

  notifyCoefficientsChanged();
  return next;
}

export function resetSingleAnalyticsCoefficient(
  key: keyof AnalyticsCoefficientsConfig
): AnalyticsCoefficientsConfig {
  return saveAnalyticsCoefficients({
    [key]: DEFAULT_ANALYTICS_COEFFICIENTS[key],
  });
}

export function resetAllAnalyticsCoefficients(): AnalyticsCoefficientsConfig {
  cachedCoefficients = { ...DEFAULT_ANALYTICS_COEFFICIENTS };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(ANALYTICS_COEFFICIENTS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  notifyCoefficientsChanged();
  return cachedCoefficients;
}

export function getAnalyticsCoefficientsSignature(): string {
  const c = getAnalyticsCoefficients();
  return COEFFICIENT_METADATA_CATALOG.map((m) => `${m.key}=${c[m.key]}`).join('&');
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ANALYTICS_COEFFICIENTS_STORAGE_KEY) {
      cachedCoefficients = null;
      notifyCoefficientsChanged();
    }
  });
}
