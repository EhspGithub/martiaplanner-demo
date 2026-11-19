import React, { useState, useEffect, useMemo } from 'react';
import {
  Table2,
  Search,
  X,
  Filter,
  Sliders,
  Calculator,
  GitBranch,
  Layers,
  Sparkles,
  CheckCircle2,
  Eye,
  Download,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { toPersianDigits } from '../utils/jalali.ts';
import {
  getAnalyticsCoefficients,
  COEFFICIENT_METADATA_CATALOG,
  ANALYTICS_COEFFICIENTS_CHANGED_EVENT,
  type AnalyticsCoefficientsConfig,
} from '../utils/analyticsCoefficients.ts';

export type TableRowKind =
  | 'main_metric'
  | 'sub_metric'
  | 'input_counter'
  | 'configurable_coeff';

export type TableDomainId =
  | 'all'
  | 'time_adherence'
  | 'educational_score'
  | 'restricted_daily_score'
  | 'time_budget'
  | 'period_comparison'
  | 'positive_xp'
  | 'global_penalty_level'
  | 'subject_progression'
  | 'velocity_continuity';

export interface ComprehensiveTableRow {
  id: string;
  domainId: Exclude<TableDomainId, 'all'>;
  domainTitleFa: string;
  kind: TableRowKind;
  kindLabelFa: string;
  hierarchyLevel: 1 | 2 | 3; // 1 = شاخص اصلی، 2 = متغیر/زیرشاخص فرمول، 3 = ورودی پایه یا ضریب قابل‌تنظیم
  titleFa: string;
  symbol: string;
  definitionAndPurposeFa: string;
  formulaFa: string;
  influencingFactorsFa: string[];
  relatedToFa: string[];
  exampleFa: string;
  coeffKey?: keyof AnalyticsCoefficientsConfig;
}

const DOMAIN_FILTERS: Array<{ id: TableDomainId; labelFa: string }> = [
  { id: 'all', labelFa: 'همه شاخص‌ها و متغیرها' },
  { id: 'time_adherence', labelFa: '۱. زمان، پایبندی و انحراف' },
  { id: 'educational_score', labelFa: '۲. ارزیابی آموزشی (T, Q, L, E)' },
  { id: 'restricted_daily_score', labelFa: '۳. کنترل سرگرمی و امتیاز روز (C, DS)' },
  { id: 'time_budget', labelFa: '۴. ظرف زمانی روزانه (Budget)' },
  { id: 'period_comparison', labelFa: '۵. تجمیع بازه و مقایسه دو دوره' },
  { id: 'positive_xp', labelFa: '۶. موتور کسب XP مثبت' },
  { id: 'global_penalty_level', labelFa: '۷. تحقق برنامه، جریمه وقفه و سطح کل' },
  { id: 'subject_progression', labelFa: '۸. سطح دروس، M_depth و جریمه درس' },
  { id: 'velocity_continuity', labelFa: '۹. سرعت هفتگی XP و وضعیت پیوستگی' },
];

const KIND_BADGE_STYLES: Record<
  TableRowKind,
  { bg: string; text: string; border: string; dot: string }
> = {
  main_metric: {
    bg: 'bg-indigo-100/90 dark:bg-indigo-950/70',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-300 dark:border-indigo-800',
    dot: 'bg-indigo-600 dark:bg-indigo-400',
  },
  sub_metric: {
    bg: 'bg-violet-100/80 dark:bg-violet-950/60',
    text: 'text-violet-800 dark:text-violet-200',
    border: 'border-violet-300 dark:border-violet-800',
    dot: 'bg-violet-600 dark:bg-violet-400',
  },
  input_counter: {
    bg: 'bg-emerald-100/80 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  configurable_coeff: {
    bg: 'bg-amber-100/85 dark:bg-amber-950/60',
    text: 'text-amber-900 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
};

function buildMasterRows(coeffs: AnalyticsCoefficientsConfig): ComprehensiveTableRow[] {
  const coreRows: ComprehensiveTableRow[] = [
    // =========================================================================
    // DOMAIN 1: زمان، پایبندی و انحراف (Time, Adherence & Variance)
    // =========================================================================
    {
      id: 'row-time-ratio-pct',
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'درصد زمان واقعی نسبت به پیش‌بینی (تحقق زمانی کارت)',
      symbol: 'R_time%',
      definitionAndPurposeFa:
        'میزان زمان واقعی صرف‌شده برای یک فعالیت یا کل روز را نسبت به زمان پیش‌بینی‌شده اولیه همان فعالیت بلافاصله پس از ثبت عملکرد می‌سنجد. این شاخص سقف ۱۰۰٪ ندارد تا اگر دانش‌آموز بیش از پیش‌بینی مطالعه کرد (مثلاً ۱۳۳٪)، واقعیت زمانی بدون ادغام با وضعیت تکمیل کار نمایش داده شود.',
      formulaFa: 'R_time% = round((M_actual ÷ M_predicted) × 100)',
      influencingFactorsFa: [
        'M_actual : زمان واقعی ثبت‌شده در گزارش عملکرد (دقیقه)',
        'M_predicted : زمان پیش‌بینی‌شده اولیه فعالیت (initial_predicted_minutes)',
      ],
      relatedToFa: [
        'کارت‌های برنامه‌ریزی روزانه (نشانگر درصد زمان)',
        'شاخص تحقق زمان مطالعه روزانه (T)',
        'انحراف زمانی مطالعه (Var_time)',
        'درصد انطباق زمانی درس (TimeAdherence_s%)',
      ],
      exampleFa:
        'اگر زمان پیش‌بینی‌شده مطالعه ریاضی ۹۰ دقیقه و زمان واقعی ثبت‌شده ۱۲۰ دقیقه باشد: R_time% = (120 ÷ 90) × 100 = 133%.',
    },
    {
      id: 'row-m-predicted',
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
      kind: 'input_counter',
      kindLabelFa: 'متغیر ورودی',
      hierarchyLevel: 3,
      titleFa: 'زمان پیش‌بینی‌شده اولیه فعالیت یا مطالعه',
      symbol: 'M_predicted',
      definitionAndPurposeFa:
        'مدت زمانی (بر حسب دقیقه) که دانش‌آموز هنگام تعریف باکس در برنامه روزانه برای انجام آن فعالیت پیش‌بینی کرده است. پس از ثبت عملکرد، مقدار اولیه (initial_predicted_minutes) قفل می‌شود تا معیار مقایسه تاریخی تغییر نکند.',
      formulaFa: 'متغیر ورودی از فرم برنامه‌ریزی روزانه (مجموع در روز: Σ M_predicted,i)',
      influencingFactorsFa: ['ورودی مستقیم کاربر هنگام ساخت یا ویرایش باکس برنامه‌ریزی'],
      relatedToFa: [
        'درصد زمان واقعی به پیش‌بینی (R_time%)',
        'هدف زمان مطالعه روزانه (M_target)',
        'شاخص تحقق زمان مطالعه (T)',
        'انحراف زمانی مطالعه (Var_time)',
        'نسبت تحقق برنامه درسی روز (F_d)',
        'ظرف زمانی برنامه‌ریزی‌شده (M_planned_all)',
      ],
      exampleFa:
        'تعریف ۳ باکس درسی با زمان‌های ۶۰، ۴۵ و ۷۵ دقیقه که مجموع زمان پیش‌بینی‌شده روز را برابر ۱۸۰ دقیقه قرار می‌دهد.',
    },
    {
      id: 'row-m-actual',
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
      kind: 'input_counter',
      kindLabelFa: 'متغیر ورودی',
      hierarchyLevel: 3,
      titleFa: 'زمان واقعی اجرای فعالیت یا مطالعه',
      symbol: 'M_actual (یا M_study)',
      definitionAndPurposeFa:
        'مدت زمان واقعی (بر حسب دقیقه) که دانش‌آموز در عمل صرف انجام فعالیت یا مطالعه درس کرده و در مودال ثبت عملکرد وارد نموده است. سنگ‌بنای اصلی محاسبه کمیت مطالعه، میانگین وزنی کیفیت و XP زمان مطالعه است.',
      formulaFa: 'متغیر ورودی از ثبت عملکرد فعالیت (مجموع مطالعه روز: M_study = Σ M_actual,edu)',
      influencingFactorsFa: ['ثبت مستقیم زمان واقعی اجرا توسط دانش‌آموز در پایان هر فعالیت'],
      relatedToFa: [
        'درصد زمان واقعی به پیش‌بینی (R_time%)',
        'شاخص تحقق زمان مطالعه (T)',
        'شاخص کیفیت یادگیری وزنی (L و Q_w)',
        'امتیاز تجربه زمان مطالعه (XP_time)',
        'نسبت تحقق برنامه درسی روز (F_d)',
        'سهم مطالعه از ظرف زمانی (S_study%)',
      ],
      exampleFa:
        'ثبت ۷۵ دقیقه مطالعه فارسی، ۸۰ دقیقه ریاضی و ۵۰ دقیقه علوم؛ مجموع زمان واقعی مطالعه روز M_study = 205 دقیقه.',
    },
    {
      id: 'row-study-variance',
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
      kind: 'sub_metric',
      kindLabelFa: 'شاخص تحلیلی',
      hierarchyLevel: 2,
      titleFa: 'انحراف زمانی مطالعه (Study Time Variance)',
      symbol: 'Var_time',
      definitionAndPurposeFa:
        'تفاوت جبری بین کل زمان مطالعه واقعی و کل زمان مطالعه پیش‌بینی‌شده را نشان می‌دهد. به دانش‌آموز کمک می‌کند بفهمد آیا برنامه‌هایش را بیش‌ازحد خوش‌بینانه می‌نویسد (انحراف منفی) یا بیش از پیش‌بینی تلاش می‌کند (انحراف مثبت).',
      formulaFa: 'Var_time = M_study - M_predicted_study',
      influencingFactorsFa: [
        'M_study : مجموع دقایق مطالعه واقعی ثبت‌شده',
        'M_predicted_study : مجموع دقایق مطالعه پیش‌بینی‌شده',
      ],
      relatedToFa: ['گزارش عملکرد روزانه و هفتگی', 'تحلیل دقت تخمین زمان در صفحه دروس'],
      exampleFa:
        'اگر پیش‌بینی مطالعه روز ۱۸۰ دقیقه و مطالعه واقعی ۲۰۵ دقیقه باشد: Var_time = 205 - 180 = +25 دقیقه (۲۵ دقیقه مطالعه بیشتر از برنامه).',
    },
    {
      id: 'row-adherence-pct',
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'درصد پایبندی به اجرای برنامه (Task Completion / Adherence)',
      symbol: 'Adherence% (یا TaskRatio)',
      definitionAndPurposeFa:
        'نسبت فعالیت‌های به سرانجام رسیده (با احتساب ۱۰۰٪ اعتبار برای فعالیت‌های کامل و ضریب w_part برای فعالیت‌های ناقص) به کل فعالیت‌های برنامه‌ریزی‌شده را می‌سنجد. نشان‌دهنده نظم اجرایی در بستن باکس‌های تعریف‌شده است.',
      formulaFa:
        'TaskRatio = (N_comp + w_part × N_part) ÷ N_total  |  Adherence% = round(TaskRatio × 100)',
      influencingFactorsFa: [
        'N_comp : تعداد فعالیت‌های تکمیل‌شده کامل (completed)',
        'N_part : تعداد فعالیت‌های نیمه‌تمام / ناقص (partial)',
        `w_part : ضریب اعتبار فعالیت ناقص (فعلی: ${coeffs.partialTaskCreditFactor})`,
        'N_total : کل فعالیت‌های برنامه‌ریزی‌شده در آن روز یا درس',
      ],
      relatedToFa: [
        'نسبت تحقق برنامه درسی روز (F_d)',
        'شاخص تسلط درس (Mastery_s)',
        'ضریب عمق یادگیری درس (M_depth)',
        'کارت خلاصه پایبندی در داشبورد',
      ],
      exampleFa:
        `از ۴ فعالیت درسی روز، ۲ فعالیت کامل (N_comp=2)، ۱ فعالیت ناقص (N_part=1 با ضریب ${coeffs.partialTaskCreditFactor}) و ۱ فعالیت انجام‌نشده است: TaskRatio = (2 + ${coeffs.partialTaskCreditFactor}×1) ÷ 4 = 0.625 (63%).`,
    },
    {
      id: 'row-n-comp-part-pend',
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
      kind: 'input_counter',
      kindLabelFa: 'شمارنده مستقیم',
      hierarchyLevel: 3,
      titleFa: 'شمارنده‌های وضعیت فعالیت‌ها (کامل، ناقص، در انتظار، کل)',
      symbol: 'N_comp , N_part , N_pend , N_total',
      definitionAndPurposeFa:
        'تعداد باکس‌های برنامه‌ریزی‌شده را به تفکیک وضعیت نهایی آن‌ها (تکمیل‌شده، انجام ناقص، و در انتظار انجام) شمارش می‌کند. همیشه رابطه N_total = N_comp + N_part + N_pend برقرار است.',
      formulaFa: 'شمارش مستقیم از داده‌های ثبت‌شده (N_total = N_comp + N_part + N_pend)',
      influencingFactorsFa: ['وضعیت ثبت‌شده برای هر باکس در برنامه روزانه (status)'],
      relatedToFa: [
        'درصد پایبندی و تکمیل فعالیت‌ها (TaskRatio)',
        'نسبت تحقق برنامه درسی روز (F_d)',
        'پاداش XP فعالیت‌های کامل و ناقص (XP_comp_total , XP_part_total)',
        'تعداد نوبت‌های ازدست‌رفته درس (MissedSessions_s)',
      ],
      exampleFa:
        'در یک روز با ۵ باکس برنامه: ۳ کامل (N_comp=3)، ۱ ناقص (N_part=1) و ۱ در انتظار (N_pend=1) -> N_total = 5.',
    },

    // =========================================================================
    // DOMAIN 2: ارزیابی آموزشی روزانه (T, Q, L, E)
    // =========================================================================
    {
      id: 'row-metric-t',
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'شاخص تحقق زمان مطالعه (Study Time Fulfillment Index)',
      symbol: 'T (و T_s)',
      definitionAndPurposeFa:
        'نشان می‌دهد دانش‌آموز چه درصدی از هدف زمانی مطالعه روزانه (یا زمان پیش‌بینی‌شده درس) را محقق کرده است. برخلاف R_time%، این شاخص در سقف ۱۰۰ محدود می‌شود تا مطالعه بیش‌ازحد در یک مؤلفه نتواند ضعف شدید در کیفیت یا حل تست را در فرمول امتیاز آموزشی (E) بپوشاند.',
      formulaFa: 'T = min(100, round((M_study ÷ M_target) × 100))',
      influencingFactorsFa: [
        'M_study : مجموع دقایق مطالعه واقعی ثبت‌شده در روز (یا درس)',
        'M_target : زمان هدف مطالعه روز (مجموع پیش‌بینی باکس‌های درسی، یا هدف روزانه در صورت عدم پیش‌بینی)',
      ],
      relatedToFa: [
        'امتیاز ترکیبی عملکرد آموزشی روزانه (E)',
        'امتیاز ترکیبی عملکرد آموزشی درس (E_s)',
        'امتیاز نهایی روزانه (DS)',
        'ضریب عمق یادگیری درس (M_depth)',
      ],
      exampleFa:
        'اگر هدف مطالعه روز ۱۸۰ دقیقه و مطالعه واقعی ۱۵۳ دقیقه باشد: T = min(100, round((153 ÷ 180) × 100)) = 85.',
    },
    {
      id: 'row-metric-q',
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'شاخص تحقق تست و تمرین (Exercises Fulfillment Index)',
      symbol: 'Q (و Q_s)',
      definitionAndPurposeFa:
        'درصد تحقق حل تست و تمرین تشریحی را نسبت به هدف تعیین‌شده در بازه ۰ تا ۱۰۰ می‌سنجد. اگر در روزی یا درسی هیچ هدف تستی تعریف نشده باشد (N_target_ex = 0 یا خالی)، مقدار Q برابر null برگردانده می‌شود تا دانش‌آموز به‌خاطر نداشتن برنامه تست، نمره صفر کاذب نگیرد.',
      formulaFa:
        'اگر N_target_ex > 0 آنگاه Q = min(100, round((N_ex ÷ N_target_ex) × 100)) ؛ در غیر این صورت Q = null',
      influencingFactorsFa: [
        'N_ex : مجموع تعداد تمرین‌ها و تست‌های حل‌شده واقعی در روز یا درس',
        'N_target_ex : مجموع تعداد تست/تمرین هدف تعریف‌شده برای فعالیت‌های درسی',
      ],
      relatedToFa: [
        'امتیاز ترکیبی عملکرد آموزشی روزانه (E)',
        'امتیاز ترکیبی عملکرد آموزشی درس (E_s)',
        'نرمال‌سازی خودکار وزن‌های امتیاز آموزشی در صورت null بودن Q',
      ],
      exampleFa:
        'اگر هدف روز حل ۴۰ تست باشد و دانش‌آموز ۳۶ تست حل کند: Q = min(100, (36 ÷ 40) × 100) = 90. اگر هدف تستی تعریف نشده باشد: Q = null.',
    },
    {
      id: 'row-n-ex-inputs',
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
      kind: 'input_counter',
      kindLabelFa: 'متغیر ورودی',
      hierarchyLevel: 3,
      titleFa: 'تعداد تست/تمرین هدف و تعداد تست/تمرین واقعی حل‌شده',
      symbol: 'N_target_ex , N_ex',
      definitionAndPurposeFa:
        'N_target_ex تعداد تمرین یا تستی است که هنگام برنامه‌ریزی هدف‌گذاری می‌شود و N_ex تعداد واقعی تست‌ها و تمرین‌هایی است که هنگام ثبت عملکرد وارد می‌گردد.',
      formulaFa: 'متغیر ورودی از فرم برنامه‌ریزی و ثبت عملکرد (مجموع در روز: Σ N_ex,i)',
      influencingFactorsFa: ['ثبت مستقیم تعداد تست هدف و تعداد تست حل‌شده توسط دانش‌آموز'],
      relatedToFa: [
        'شاخص تحقق تست و تمرین (Q)',
        'پاداش XP حل تمرین و تست (XP_ex_total)',
        'تلاش خام درس (XP_raw,s)',
        'مقایسه تعداد تمرین بین دو دوره (ΔN_ex)',
      ],
      exampleFa: 'هدف‌گذاری ۲۰ تست ریاضی و ۱۵ تست علوم (N_target_ex = 35) و حل ۲۲ تست ریاضی و ۱۴ تست علوم (N_ex = 36).',
    },
    {
      id: 'row-metric-qw-and-l',
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'شاخص کیفیت یادگیری وزنی (۰ تا ۱۰) و مقیاس صدتایی آن (L)',
      symbol: 'Q_w (0..10) و L (0..100)',
      definitionAndPurposeFa:
        'میانگین وزنی کیفیت یادگیری جلسات مطالعه را بر اساس مدت زمان واقعی هر جلسه محاسبه می‌کند. وزن‌دهی با زمان واقعی باعث می‌شود یک جلسه ۱۲۰ دقیقه‌ای عمیق، اثر واقعی‌تری نسبت به یک مرور ۱۵ دقیقه‌ای داشته باشد. سپس با ضرب در ۱۰ به مقیاس ۰ تا ۱۰۰ (شاخص L) تبدیل می‌شود.',
      formulaFa:
        'Q_w = (Σ (q_i × m_i)) ÷ (Σ m_i)   |   L = min(100, max(0, round(Q_w × 10)))',
      influencingFactorsFa: [
        'q_i : نمره کیفیت یادگیری ثبت‌شده برای فعالیت درسی i (عددی بین ۰ تا ۱۰)',
        'm_i : زمان واقعی مطالعه فعالیت درسی i (بر حسب دقیقه)',
      ],
      relatedToFa: [
        'امتیاز ترکیبی عملکرد آموزشی (E و E_s)',
        'شاخص تسلط درس (Mastery_s) و ضریب عمق یادگیری (M_depth)',
        'شرط کیفیت قابل‌قبول در معافیت از جریمه روزانه (Q_w ≥ Q_min,day)',
        'تشخیص هم‌سنجی رشد واقعی علمی با سرعت XP',
      ],
      exampleFa:
        'دو جلسه مطالعه: ۹۰ دقیقه ریاضی با کیفیت ۹ و ۳۰ دقیقه عربی با کیفیت ۵ -> Q_w = (9×90 + 5×30) ÷ (90 + 30) = 960 ÷ 120 = 8.0 از ۱۰ -> شاخص L = 80.',
    },
    {
      id: 'row-input-qi',
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
      kind: 'input_counter',
      kindLabelFa: 'متغیر ورودی',
      hierarchyLevel: 3,
      titleFa: 'نمره کیفیت یادگیری تک‌جلسه',
      symbol: 'q_i',
      definitionAndPurposeFa:
        'ارزیابی خوداظهاری دانش‌آموز از میزان تمرکز، فهم مطلب و عمق یادگیری در یک جلسه مشخص در مقیاس عددی ۰ تا ۱۰ (۹ و ۱۰ عالی، ۷ و ۸ خوب، ۵ و ۶ متوسط، ۳ و ۴ ضعیف، ۰ تا ۲ بسیار ضعیف).',
      formulaFa: 'متغیر ورودی در مودال ثبت عملکرد (عدد بین ۰ تا ۱۰)',
      influencingFactorsFa: ['انتخاب نمره ۰ تا ۱۰ توسط کاربر هنگام ثبت عملکرد باکس درسی'],
      relatedToFa: [
        'میانگین وزنی کیفیت یادگیری (Q_w و L)',
        'پاداش XP کیفیت یادگیری جلسه (XP_qual_i = q_i × XP_qual)',
      ],
      exampleFa: 'ثبت نمره کیفیت 8.5 از ۱۰ برای جلسه مطالعه فصل دوم علوم تجربی.',
    },
    {
      id: 'row-metric-e',
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'امتیاز ترکیبی عملکرد آموزشی (Educational Composite Score)',
      symbol: 'E (و E_s)',
      definitionAndPurposeFa:
        'مهم‌ترین شاخص سنجش کیفیت و کمیت درس‌خواندن در یک روز (E) یا در یک درس خاص در کل دوره (E_s). سه بعد «تحقق زمان (T)»، «حل تست و تمرین (Q)» و «کیفیت یادگیری (L)» را با وزن‌های قابل‌تنظیم ترکیب می‌کند. اگر Q در روزی null باشد، مخرج به صورت خودکار به (w_T + w_L) تغییر می‌یابد (نرمال‌سازی خودکار وزن‌ها). نکته مهم در تک‌درس (E_s): چون T_s زمان واقعی کل درس را بر زمان پیش‌بینی‌شده کل جلسات آن درس (شامل جلسات رهاشده) تقسیم می‌کند، رها کردن یک جلسه برنامه‌ریزی‌شده باعث کاهش T_s و در نتیجه افت E_s می‌شود.',
      formulaFa:
        'E = round( (w_T × T + w_Q × Q + w_L × L) ÷ Σ w_فعال )  [در حالت پایه: 0.40×T + 0.30×Q + 0.30×L]',
      influencingFactorsFa: [
        'T : شاخص تحقق زمان مطالعه (۰ تا ۱۰۰)',
        'Q : شاخص تحقق تست و تمرین (۰ تا ۱۰۰ یا null)',
        'L : شاخص کیفیت یادگیری صدتایی (۰ تا ۱۰۰)',
        `w_T, w_Q, w_L : وزن‌های سه مؤلفه (فعلی: ${coeffs.studyTimeWeightPct}٪، ${coeffs.exercisesWeightPct}٪، ${coeffs.learningQualityWeightPct}٪)`,
      ],
      relatedToFa: [
        'امتیاز نهایی روزانه (DS)',
        'شاخص تسلط درس (Mastery_s)',
        'ضریب عمق یادگیری درس (M_depth)',
        'تحلیل هم‌راستایی سرعت XP با پیشرفت واقعی تحصیلی (AlignmentStatus)',
      ],
      exampleFa:
        'با T = 85، Q = 90 و L = 80 در وزن‌های پیش‌فرض (۴۰٪، ۳۰٪، ۳۰٪): E = (85×0.40) + (90×0.30) + (80×0.30) = 34 + 27 + 24 = 85 از ۱۰۰.',
    },

    // =========================================================================
    // DOMAIN 3: کنترل فعالیت‌های محدودشونده و امتیاز نهایی روزانه (C_i, C, DS)
    // =========================================================================
    {
      id: 'row-metric-ci',
      domainId: 'restricted_daily_score',
      domainTitleFa: '۳. کنترل فعالیت‌های محدودشونده و امتیاز نهایی روزانه (C_i, C, DS)',
      kind: 'sub_metric',
      kindLabelFa: 'متغیر فرمولی',
      hierarchyLevel: 2,
      titleFa: 'امتیاز پایبندی در تک‌فعالیت محدودشونده (گوشی، تلویزیون، بازی)',
      symbol: 'C_i',
      definitionAndPurposeFa:
        'میزان رعایت سقف زمانی مجاز را در یک فعالیت تفریحی/محدودشونده خاص می‌سنجد. اگر زمان واقعی مصرف‌شده کمتر یا مساوی زمان مجاز باشد، نمره کامل ۱۰۰ تعلق می‌گیرد؛ اما در صورت استفاده بیش از حد مجاز، نمره به نسبت معکوس (زمان مجاز تقسیم بر زمان واقعی) کاهش می‌یابد.',
      formulaFa:
        'C_i = min(100, round((M_allowed,i ÷ M_actual,i) × 100))  |  Overuse_i = max(0, M_actual,i - M_allowed,i)',
      influencingFactorsFa: [
        'M_allowed,i : سقف زمان مجاز پیش‌بینی‌شده برای فعالیت محدودشونده i (دقیقه)',
        'M_actual,i : زمان واقعی صرف‌شده در فعالیت محدودشونده i (دقیقه)',
      ],
      relatedToFa: [
        'شاخص کل کنترل فعالیت‌های محدودشونده روز (C)',
        'اضافه‌مصرف زمانی سرگرمی (OveruseMinutes)',
      ],
      exampleFa:
        'اگر زمان مجاز گوشی ۳۰ دقیقه باشد و دانش‌آموز ۴۵ دقیقه استفاده کند: C_i = round((30 ÷ 45) × 100) = 67 و اضافه‌مصرف برابر ۱۵ دقیقه است.',
    },
    {
      id: 'row-metric-c',
      domainId: 'restricted_daily_score',
      domainTitleFa: '۳. کنترل فعالیت‌های محدودشونده و امتیاز نهایی روزانه (C_i, C, DS)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'شاخص کنترل فعالیت‌های محدودشونده روزانه (Restricted Control Index)',
      symbol: 'C',
      definitionAndPurposeFa:
        'میانگین وزنی نمرات کنترل (C_i) تمام فعالیت‌های محدودشونده ثبت‌شده در طول روز (گوشی، تلویزیون، بازی ویدیویی) را محاسبه می‌کند تا انضباط خودکنترلی دانش‌آموز در برابر عوامل حواس‌پرتی سنجیده شود.',
      formulaFa:
        'C = round( (Σ (C_i × w_i)) ÷ (Σ w_i) )  که در آن  w_i = max(1, M_allowed,i) × ImpactWeight_i',
      influencingFactorsFa: [
        'C_i : امتیاز پایبندی هر فعالیت محدودشونده (۰ تا ۱۰۰)',
        'M_allowed,i : سقف زمان مجاز آن فعالیت',
        'ImpactWeight_i : ضریب اهمیت دسته‌بندی فعالیت (پیش‌فرض ۱٫۰)',
      ],
      relatedToFa: [
        'امتیاز نهایی روزانه (DS)',
        'میانگین شاخص کنترل سرگرمی در بازه (Avg_C)',
        'کارت تحلیل فعالیت‌های محدودشونده در داشبورد',
      ],
      exampleFa:
        'دو فعالیت سرگرمی در روز: گوشی (مجاز ۳۰ دقیقه، واقعی ۴۵ دقیقه -> C_1 = 67) و تلویزیون (مجاز ۳۰ دقیقه، واقعی ۳۰ دقیقه -> C_2 = 100) -> شاخص کل C = round((67×30 + 100×30) ÷ 60) = 84.',
    },
    {
      id: 'row-metric-ds',
      domainId: 'restricted_daily_score',
      domainTitleFa: '۳. کنترل فعالیت‌های محدودشونده و امتیاز نهایی روزانه (C_i, C, DS)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'امتیاز نهایی عملکرد روزانه (Final Daily Composite Score)',
      symbol: 'DS (یا S)',
      definitionAndPurposeFa:
        'نمره جامع ۰ تا ۱۰۰ کارنامه روزانه دانش‌آموز که عملکرد آموزشی (E) را با خودکنترلی در سرگرمی‌های محدودشونده (C) ترکیب می‌کند. اگر در روزی هیچ فعالیت محدودشونده‌ای ثبت نشده باشد (C = null)، وزن به صورت خودکار نرمال شده و DS دقیقاً برابر E قرار می‌گیرد.',
      formulaFa:
        'DS = round( (w_E × E + w_C × C) ÷ (w_E + w_C) )   [در حالت پایه: (0.80 × E) + (0.20 × C)]',
      influencingFactorsFa: [
        'E : امتیاز ترکیبی عملکرد آموزشی روز (۰ تا ۱۰۰)',
        'C : شاخص کنترل فعالیت‌های محدودشونده روز (۰ تا ۱۰۰ یا null)',
        `w_E, w_C : وزن‌های ترکیب روزانه (فعلی: ${coeffs.educationalCompositeWeightPct}٪ آموزشی و ${coeffs.restrictedControlWeightPct}٪ کنترل سرگرمی)`,
      ],
      relatedToFa: [
        'میانگین امتیاز نهایی بازه زمانی (Avg_DS)',
        'تشخیص بهترین روز (BestScoreDay) و ضعیف‌ترین روز (WeakestScoreDay)',
        'نمودار روند امتیاز روزانه در صفحه عملکرد',
      ],
      exampleFa:
        'اگر امتیاز آموزشی روز E = 85 و شاخص کنترل سرگرمی C = 80 باشد: DS = (85 × 0.80) + (80 × 0.20) = 68 + 16 = 84 از ۱۰۰.',
    },

    // =========================================================================
    // DOMAIN 4: ظرف زمانی روزانه و سهم فعالیت‌ها (Daily Time Budget)
    // =========================================================================
    {
      id: 'row-budget-day',
      domainId: 'time_budget',
      domainTitleFa: '۴. ظرف زمانی روزانه و سهم فعالیت‌ها (Time Budget)',
      kind: 'input_counter',
      kindLabelFa: 'متغیر ورودی',
      hierarchyLevel: 2,
      titleFa: 'ظرف زمانی روزانه (سقف بودجه زمان در دسترس روز)',
      symbol: 'B_day',
      definitionAndPurposeFa:
        'کل زمان آزاد و قابل‌برنامه‌ریزی دانش‌آموز در یک روز مشخص (خارج از ساعات مدرسه و خواب شبانه) بر حسب دقیقه که معیار سنجش واقع‌بینی برنامه‌ریزی و سهم هر گروه فعالیت از زمان روز است (پیش‌فرض ۳۶۰ دقیقه معادل ۶ ساعت).',
      formulaFa: 'متغیر ورودی توسط کاربر برای هر روز (به ساعت یا دقیقه؛ پیش‌فرض ۳۶۰ دقیقه)',
      influencingFactorsFa: ['تنظیم مستقیم ظرف زمانی روز در صفحه برنامه‌ریزی یا عملکرد'],
      relatedToFa: [
        'زمان تخصیص‌نیافته یا مازاد ظرف زمانی (M_unalloc , M_over)',
        'سهم مطالعه از ظرف زمانی روز (S_study%)',
        'سهم فعالیت‌های محدودشونده و ضروری از ظرف زمانی (S_rest% , S_ess%)',
      ],
      exampleFa: 'تعیین ظرف زمانی ۶ ساعت برای روز سه‌شنبه -> B_day = 360 دقیقه.',
    },
    {
      id: 'row-study-share-budget',
      domainId: 'time_budget',
      domainTitleFa: '۴. ظرف زمانی روزانه و سهم فعالیت‌ها (Time Budget)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'سهم مطالعه واقعی از ظرف زمانی روزانه و بازه',
      symbol: 'S_study%',
      definitionAndPurposeFa:
        'مشخص می‌کند چه درصدی از کل ظرف زمانی در دسترس دانش‌آموز صرف مطالعه واقعی شده است. در محاسبات بازه‌ای (هفتگی/ماهانه)، فقط روزهایی که دارای ظرف زمانی تعریف‌شده هستند در صورت و مخرج کسر لحاظ می‌شوند تا میانگین دقیق و بدون تورش به دست آید.',
      formulaFa:
        'روزانه: S_study% = round1((M_study ÷ B_day) × 100)  |  بازه‌ای: (Σ M_study_valid ÷ Σ B_day_valid) × 100',
      influencingFactorsFa: [
        'M_study : زمان واقعی مطالعه ثبت‌شده در روزهای دارای بودجه',
        'B_day : ظرف زمانی تعریف‌شده برای همان روزها',
      ],
      relatedToFa: [
        'کارت تحلیل ظرف زمانی در داشبورد',
        'مقایسه سهم مطالعه از بودجه بین دو دوره (ΔS_study%)',
      ],
      exampleFa:
        'اگر ظرف زمانی روز ۳۶۰ دقیقه و مطالعه واقعی ۱۸۰ دقیقه باشد: S_study% = (180 ÷ 360) × 100 = 50.0%.',
    },
    {
      id: 'row-budget-unalloc-over',
      domainId: 'time_budget',
      domainTitleFa: '۴. ظرف زمانی روزانه و سهم فعالیت‌ها (Time Budget)',
      kind: 'sub_metric',
      kindLabelFa: 'متغیر فرمولی',
      hierarchyLevel: 2,
      titleFa: 'زمان باقی‌مانده آزاد و زمان مازاد بر ظرف زمانی روز',
      symbol: 'M_rem_budget , M_over_budget',
      definitionAndPurposeFa:
        'نشان می‌دهد از کل ظرف زمانی روز چند دقیقه هنوز مصرف نشده باقی مانده است (M_rem_budget) یا چند دقیقه بیشتر از ظرفیت روز برنامه‌ریزی/اجرا شده است (M_over_budget). از بیش‌برنامه‌ریزی غیرواقعی جلوگیری می‌کند.',
      formulaFa:
        'M_rem_budget = max(0, B_day - M_total_all)  |  M_over_budget = max(0, M_total_all - B_day)',
      influencingFactorsFa: [
        'B_day : ظرف زمانی کل روز',
        'M_total_all : مجموع زمان کل فعالیت‌های آموزشی + محدودشونده + ضروری',
      ],
      relatedToFa: ['نوار وضعیت ظرف زمانی در بالای صفحه برنامه‌ریزی و داشبورد'],
      exampleFa:
        'با ظرف زمانی ۳۶۰ دقیقه و مجموع فعالیت‌های ۳۱۰ دقیقه: زمان آزاد باقی‌مانده M_rem_budget = 50 دقیقه و مازاد برابر ۰ است.',
    },

    // =========================================================================
    // DOMAIN 5: تجمیع بازه‌ای و مقایسه دو دوره (Period Aggregation & Comparison)
    // =========================================================================
    {
      id: 'row-period-aggregates',
      domainId: 'period_comparison',
      domainTitleFa: '۵. تجمیع بازه‌ای و مقایسه دو دوره زمانی',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'میانگین‌های وزنی و کلیدی دوره زمانی (هفتگی، ماهانه، بازه دلخواه)',
      symbol: 'Avg_Study , Q_w,period , Avg_DS',
      definitionAndPurposeFa:
        'عملکرد دانش‌آموز را در یک بازه چندروزه خلاصه می‌کند. نکته کلیدی معماری: کیفیت یادگیری دوره (Q_w,period) میانگین ساده روزها نیست، بلکه میانگین وزنی کل دقایق مطالعه کل دوره است؛ و میانگین امتیاز نهایی (Avg_DS) فقط روی روزهای دارای داده معتبر محاسبه می‌شود.',
      formulaFa:
        'Avg_Study = round(Σ M_study ÷ N_days)  |  Q_w,period = (Σ(q_i×m_i)) ÷ (Σ m_i)  |  Avg_DS = (Σ DS_valid) ÷ N_valid_days',
      influencingFactorsFa: [
        'M_study : دقایق مطالعه روزهای بازه',
        'N_days : تعداد کل روزهای تقویمی بازه',
        'N_valid_days : تعداد روزهای دارای امتیاز نهایی معتبر در بازه',
      ],
      relatedToFa: [
        'کارت‌های خلاصه عملکرد بازه در داشبورد',
        'موتور مقایسه دو بازه زمانی (PeriodComparisonResult)',
      ],
      exampleFa:
        'در یک هفته (۷ روز) با مجموع ۱٬۰۵۰ دقیقه مطالعه و ۵ روز دارای امتیاز نهایی با مجموع ۴۲۰: میانگین مطالعه روزانه ۱۵۰ دقیقه و Avg_DS = 420 ÷ 5 = 84.0 است.',
    },
    {
      id: 'row-period-delta',
      domainId: 'period_comparison',
      domainTitleFa: '۵. تجمیع بازه‌ای و مقایسه دو دوره زمانی',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'تغییر مطلق و درصد تغییر ایمن بین دو دوره زمانی',
      symbol: 'Δ_abs , Δ_%',
      definitionAndPurposeFa:
        'میزان پیشرفت یا افت هر شاخص را در «دوره فعلی» نسبت به «دوره مبنا (قبل)» محاسبه می‌کند. اگر مقدار دوره مبنا برابر صفر باشد (V_base = 0)، برای جلوگیری از خطای ریاضی تقسیم بر صفر، درصد تغییر برابر null گزارش شده و فقط تغییر مطلق نمایش داده می‌شود.',
      formulaFa:
        'Δ_abs = round1(V_target - V_base)  |  اگر V_base ≠ 0 آنگاه Δ_% = round1(((V_target - V_base) ÷ |V_base|) × 100)',
      influencingFactorsFa: [
        'V_base : مقدار شاخص در دوره زمانی مبنا (مثلاً هفته قبل)',
        'V_target : مقدار همان شاخص در دوره زمانی هدف (مثلاً هفته جاری)',
      ],
      relatedToFa: ['بخش مقایسه دو بازه در صفحه عملکرد (DashboardView)'],
      exampleFa:
        'افزایش مطالعه هفتگی از ۸۰۰ دقیقه در هفته قبل به ۹۲۰ دقیقه در این هفته: Δ_abs = +120 دقیقه و Δ_% = (+120 ÷ 800) × 100 = +15.0%.',
    },

    // =========================================================================
    // DOMAIN 6: موتور کسب امتیاز تجربه مثبت (Positive XP Engine)
    // =========================================================================
    {
      id: 'row-xp-pos-total',
      domainId: 'positive_xp',
      domainTitleFa: '۶. موتور کسب امتیاز تجربه مثبت (Positive XP)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'امتیاز تجربه مثبت روزانه و ناخالص کل (Positive / Gross XP)',
      symbol: 'XP_pos (و XP_gross)',
      definitionAndPurposeFa:
        'مجموع امتیاز تجربه مثبتی که دانش‌آموز در یک روز یا در کل دوره از ۵ منبع مستقل (تکمیل فعالیت، فعالیت ناقص، زمان مطالعه واقعی، تعداد تست حل‌شده و کیفیت یادگیری جلسات) کسب می‌کند. این امتیاز ورودی مستقیم حساب سطح کل است.',
      formulaFa:
        'XP_pos = round2(XP_comp_total + XP_part_total + XP_time + XP_ex_total + XP_qual_total)',
      influencingFactorsFa: [
        `XP_comp_total = N_comp × ${coeffs.xpCompletedActivity}`,
        `XP_part_total = N_part × ${coeffs.xpPartialActivity}`,
        `XP_time = M_study ÷ ${coeffs.xpStudyMinutesDivisor}`,
        `XP_ex_total = N_ex × ${coeffs.xpExerciseUnit}`,
        `XP_qual_total = Σ (q_i × ${coeffs.xpQualityPointMultiplier})`,
      ],
      relatedToFa: [
        'امتیاز تجربه خالص کل (XP_net)',
        'میانگین XP روزهای فعال (AvgActiveDailyXP)',
        'جریمه پایه روزانه سطح کل (B)',
        'نرخ سرعت هفتگی کسب XP (Rate_7d,eff)',
      ],
      exampleFa:
        'در روزی با ۲ فعالیت کامل (10 XP)، ۱ ناقص (2.5 XP)، ۱۵۰ دقیقه مطالعه (3.0 XP)، ۳۰ تست (6.0 XP) و مجموع کیفیت ۱۶ در دو جلسه (3.2 XP): XP_pos = 24.70 XP.',
    },
    {
      id: 'row-xp-components-sub',
      domainId: 'positive_xp',
      domainTitleFa: '۶. موتور کسب امتیاز تجربه مثبت (Positive XP)',
      kind: 'sub_metric',
      kindLabelFa: 'متغیرهای فرمولی',
      hierarchyLevel: 2,
      titleFa: 'مؤلفه‌های پنج‌گانه تشکیل‌دهنده XP مثبت روزانه',
      symbol: 'XP_comp_total , XP_part_total , XP_time , XP_ex_total , XP_qual_total',
      definitionAndPurposeFa:
        'پنج جزء سازنده XP روزانه که هر کدام یک رفتار مطلوب آموزشی را پاداش می‌دهند: ۱) بستن کامل باکس‌ها، ۲) تلاش روی باکس‌های نیمه‌تمام، ۳) مدت زمان مطالعه واقعی، ۴) حل تست و تمرین، و ۵) تمرکز و کیفیت یادگیری در حین مطالعه.',
      formulaFa:
        'XP_comp_total = N_comp × XP_comp | XP_part_total = N_part × XP_part | XP_time = M_study ÷ D_min | XP_ex_total = N_ex × XP_ex | XP_qual_total = Σ(q_i × XP_qual)',
      influencingFactorsFa: [
        'N_comp, N_part : تعداد فعالیت‌های کامل و ناقص',
        'M_study : دقایق مطالعه واقعی فعالیت‌های درسی',
        'N_ex : تعداد تمرین‌ها و تست‌های حل‌شده',
        'q_i : نمره کیفیت هر جلسه درسی (۰ تا ۱۰ با شرط m_i > 0)',
      ],
      relatedToFa: ['امتیاز تجربه مثبت روزانه (XP_pos)', 'تلاش خام درس (XP_raw,s)'],
      exampleFa:
        `برای ۱ جلسه ۶۰ دقیقه‌ای کامل با ۲۰ تست و کیفیت ۹: XP = ${coeffs.xpCompletedActivity} + (60÷${coeffs.xpStudyMinutesDivisor}) + (20×${coeffs.xpExerciseUnit}) + (9×${coeffs.xpQualityPointMultiplier}) = 12.00 XP.`,
    },

    // =========================================================================
    // DOMAIN 7: تحقق برنامه روزانه، جریمه وقفه و سطح کل (F_d, P_d, Global Level)
    // =========================================================================
    {
      id: 'row-metric-fd',
      domainId: 'global_penalty_level',
      domainTitleFa: '۷. تحقق برنامه روزانه، جریمه وقفه و سطح کل (Global Ledger)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'نسبت تحقق برنامه درسی روز (Daily Educational Fulfillment Ratio)',
      symbol: 'F_d',
      definitionAndPurposeFa:
        'نشان می‌دهد در روزی که دانش‌آموز تعهد درسی داشته است، چه کسری (بین ۰ تا ۱) از برنامه درسی خود را محقق کرده است. ترکیبی وزنی از «نسبت تحقق زمان مطالعه (TimeRatio)» و «نسبت تکمیل باکس‌های درسی (TaskRatio)» است تا هم کمیت زمان و هم تکمیل وظایف سنجیده شود.',
      formulaFa:
        'F_d = round2( (w_{F,time} × TimeRatio + w_{F,task} × TaskRatio) ÷ (w_{F,time} + w_{F,task}) )  [پایه: 0.60×TimeRatio + 0.40×TaskRatio]',
      influencingFactorsFa: [
        'TimeRatio = min(1, M_study ÷ M_predicted_study)',
        `TaskRatio = (N_comp,study + ${coeffs.partialTaskCreditFactor} × N_part,study) ÷ N_total,study`,
        `w_{F,time} (${coeffs.dailyFulfillmentTimeWeightPct}٪) و w_{F,task} (${coeffs.dailyFulfillmentTaskWeightPct}٪)`,
      ],
      relatedToFa: [
        'تشخیص روز فعال مؤثر (isEffectivelyActive)',
        'نسبت بخش انجام‌نشده برنامه روز (M_d = 1 - F_d)',
        'جریمه عدم فعالیت روزانه سطح کل (P_d)',
      ],
      exampleFa:
        'اگر از ۲۰۰ دقیقه برنامه درسی ۱۰۰ دقیقه خوانده شود (TimeRatio = 0.50) و از ۴ باکس درسی ۱ باکس کامل و ۱ باکس ناقص انجام شود (TaskRatio = 1.5÷4 = 0.375): F_d = (0.60×0.50) + (0.40×0.375) = 0.30 + 0.15 = 0.45 (۴۵٪ تحقق).',
    },
    {
      id: 'row-is-effectively-active',
      domainId: 'global_penalty_level',
      domainTitleFa: '۷. تحقق برنامه روزانه، جریمه وقفه و سطح کل (Global Ledger)',
      kind: 'sub_metric',
      kindLabelFa: 'متغیر منطقی / شرطی',
      hierarchyLevel: 2,
      titleFa: 'شرط روز فعال آموزشی مؤثر (معافیت از جریمه و صفر شدن زنجیره غیبت)',
      symbol: 'isEffectivelyActive',
      definitionAndPurposeFa:
        'تعیین می‌کند آیا عملکرد آموزشی دانش‌آموز در یک روز تعهددار به اندازه‌ای بوده است که روز «فعال مؤثر» شناخته شود یا خیر. در صورت برقراری این شرط، شمارنده غیبت متوالی (k) بلافاصله صفر شده و هیچ جریمه‌ای کسر نمی‌گردد.',
      formulaFa:
        `isEffectivelyActive = (F_d ≥ ${coeffs.effectiveDayFulfillmentThresholdPct / 100}) OR (M_study ≥ ${coeffs.effectiveDayMinStudyMinutes} AND N_done ≥ 1 AND Q_w ≥ ${coeffs.effectiveDayMinQualityScore})`,
      influencingFactorsFa: [
        'F_d : نسبت تحقق برنامه درسی روز',
        `θ_F : حد نصاب درصد تحقق (فعلی: ${coeffs.effectiveDayFulfillmentThresholdPct}٪)`,
        `M_{min,day} : حداقل دقایق مطالعه جایگزین (فعلی: ${coeffs.effectiveDayMinStudyMinutes} دقیقه)`,
        `Q_{min,day} : حداقل کیفیت قابل‌قبول (فعلی: ${coeffs.effectiveDayMinQualityScore} از ۱۰)`,
      ],
      relatedToFa: [
        'شمارنده روزهای متوالی عدم فعالیت (k)',
        'تعداد کل روزهای فعال آموزشی (D_active_global)',
        'جریمه عدم فعالیت روزانه سطح کل (P_d)',
      ],
      exampleFa:
        'اگر دانش‌آموز ۶۰٪ برنامه را انجام دهد (F_d = 0.60 ≥ 0.50) روز فعال مؤثر است. همچنین اگر برنامه بسیار سنگین ۵ ساعته نوشته باشد ولی ۴۵ دقیقه مطالعه با کیفیت ۷ داشته باشد، به دلیل شرط دوم معاف از جریمه می‌شود.',
    },
    {
      id: 'row-global-penalty-vars',
      domainId: 'global_penalty_level',
      domainTitleFa: '۷. تحقق برنامه روزانه، جریمه وقفه و سطح کل (Global Ledger)',
      kind: 'sub_metric',
      kindLabelFa: 'متغیرهای فرمولی',
      hierarchyLevel: 2,
      titleFa: 'متغیرهای فرمول جریمه وقفه سطح کل (B , k , r_d(k) , M_d)',
      symbol: 'B , k , r_d(k) , M_d',
      definitionAndPurposeFa:
        'چهار متغیر سازنده جریمه روزهای غیبت: ۱) B جریمه پایه روزانه معادل درصدی از میانگین XP روزهای فعال دانش‌آموز، ۲) k تعداد روزهای تعهددار متوالی که بدون فعالیت مؤثر سپری شده‌اند (روزهای بدون برنامه درسی زنجیره را افزایش نمی‌دهند)، ۳) r_d(k) ضریب تشدید غیبت متوالی، و ۴) M_d نسبت بخش انجام‌نشده برنامه روز.',
      formulaFa:
        `B = clamp(AvgActiveXP × ${coeffs.globalBasePenaltyRatePct / 100}, ${coeffs.globalBasePenaltyMinXp}, ${coeffs.globalBasePenaltyMaxXp}) | r_d(k) = min(${coeffs.globalStreakEscalationCap}, 1 + ${coeffs.globalStreakEscalationStep}×(k-1)) | M_d = 1 - F_d`,
      influencingFactorsFa: [
        'AvgActiveXP : میانگین XP روزانه در روزهای فعال قبلی (یا ۱۲٫۰ در صورت نبود سابقه)',
        'k : شماره روز غیبت متوالی (۱، ۲، ۳، ...)',
        'F_d : نسبت تحقق برنامه درسی آن روز',
      ],
      relatedToFa: ['جریمه عدم فعالیت روزانه سطح کل (P_d)', 'XP خالص کل (XP_net)'],
      exampleFa:
        'برای دانش‌آموزی با میانگین ۲۰ XP در روزهای فعال: B = 2.0 XP. در روز سوم غیبت متوالی (k=3 -> r_d = 2.0) با تحقق ۲۰٪ برنامه (M_d = 0.80): متغیرها آماده ضرب در فرمول P_d هستند.',
    },
    {
      id: 'row-metric-pd',
      domainId: 'global_penalty_level',
      domainTitleFa: '۷. تحقق برنامه روزانه، جریمه وقفه و سطح کل (Global Ledger)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'جریمه عدم فعالیت روزانه سطح کل (Daily Global Inactivity Penalty)',
      symbol: 'P_d',
      definitionAndPurposeFa:
        'مقدار XP کسرشده از حساب سطح کل در پایان یک روز گذشته (dateIso < todayIso) که دارای برنامه درسی بوده اما به حد نصاب فعالیت مؤثر نرسیده است. اگر دانش‌آموز بخشی از برنامه را انجام داده باشد، جریمه دقیقاً به نسبت بخش انجام‌نشده (M_d) کاهش می‌یابد و هرگز XP کل را به زیر صفر نمی‌برد.',
      formulaFa: 'P_d = min(XP_net_before , round2(B × r_d(k) × M_d))',
      influencingFactorsFa: [
        'B : جریمه پایه روزانه سطح کل',
        'r_d(k) : ضریب تشدید روز kام غیبت متوالی',
        'M_d : نسبت بخش انجام‌نشده برنامه درسی روز (1 - F_d)',
      ],
      relatedToFa: [
        'مجموع جریمه‌های سطح کل (XP_penalty_total)',
        'امتیاز تجربه خالص کل (XP_net)',
        'تنزل پله یا سطح کل (Global Stage / Level Demotion)',
      ],
      exampleFa:
        'با B = 2.0 XP، در روز سوم غیبت متوالی (r_d = 2.0) و انجام ۲۰٪ برنامه (M_d = 0.80): P_d = 2.0 × 2.0 × 0.80 = 3.20 XP از حساب کل کسر می‌شود.',
    },
    {
      id: 'row-metric-xp-net-global',
      domainId: 'global_penalty_level',
      domainTitleFa: '۷. تحقق برنامه روزانه، جریمه وقفه و سطح کل (Global Ledger)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'امتیاز تجربه خالص سطح کل و مرحله ۳۹گانه کل (Global Net XP & Stage)',
      symbol: 'XP_net , Stage_global (1..39)',
      definitionAndPurposeFa:
        'مانده خالص امتیاز تجربه دانش‌آموز پس از اعمال хронологический (روزبه‌روز) تمام پاداش‌های XP مثبت و کسر جریمه‌های عدم فعالیت. این عدد روی جدول ۳۹ مرحله‌ای سطح کل (از ۰ در سنگ تا ۱۵٬۰۰۰ در کربونادو استار) نگاشت شده و سطح (۱ تا ۱۳)، پله (۱ تا ۳) و درصد پیشرفت پله فعلی را تعیین می‌کند.',
      formulaFa:
        'XP_net = max(0, XP_gross - XP_penalty_total)  |  Progress% = round(((XP_net - MinXP_stage) ÷ (NextMinXP - MinXP_stage)) × 100)',
      influencingFactorsFa: [
        'XP_gross : مجموع کل XP مثبت کسب‌شده از ابتدای ثبت',
        'XP_penalty_total : مجموع کل جریمه‌های کسرشده بابت روزهای غیبت',
        'GLOBAL_STAGE_THRESHOLDS : جدول ۳۹ آستانه سطح کل (۰، ۲۰، ۴۵، ۸۰، ... تا ۱۵٬۰۰۰)',
      ],
      relatedToFa: [
        'کارت سطح کل در داشبورد و گزارش‌ها',
        'پیش‌بینی روزهای باقیمانده تا پله بعد (EstDaysToNextStage)',
        'تاریخچه ارتقا و تنزل سطح کل (historyEvents)',
      ],
      exampleFa:
        'اگر XP ناخالص ۱۶۰ و مجموع جریمه‌ها ۱۵ باشد: XP_net = 145 XP. طبق جدول آستانه‌ها، ۱۴۵ بین ۱۲۵ (مس پلاس) و ۱۸۰ (مس استار) است؛ بنابراین دانش‌آموز در سطح ۲ (مس)، پله ۲ از ۳ (مس پلاس) با پیشرفت (20 ÷ 55) = 36% قرار دارد.',
    },

    // =========================================================================
    // DOMAIN 8: سیستم پیشرفت تک‌درس، ضریب عمق یادگیری و جریمه درس (Subject Progression)
    // =========================================================================
    {
      id: 'row-subject-xp-raw',
      domainId: 'subject_progression',
      domainTitleFa: '۸. سیستم پیشرفت اختصاصی هر درس (Subject XP, M_depth & Subject Level)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'امتیاز تلاش خام اختصاصی درس (Subject Raw Effort XP)',
      symbol: 'XP_raw,s',
      definitionAndPurposeFa:
        'مجموع امتیاز تجربه خامی که دانش‌آموز صرفاً از فعالیت‌های ثبت‌شده مربوط به همان درس s کسب کرده است، به علاوه پاداش ویژه روزهای فعال مطالعه آن درس (D_active,s). این عدد پیش از اعمال ضریب عمق یادگیری (M_depth) محاسبه می‌شود.',
      formulaFa:
        `XP_raw,s = round2( N_comp,s×${coeffs.xpCompletedActivity} + N_part,s×${coeffs.xpPartialActivity} + (M_study,s÷${coeffs.xpStudyMinutesDivisor}) + N_ex,s×${coeffs.xpExerciseUnit} + Σ(q_{i,s}×${coeffs.xpQualityPointMultiplier}) + D_active,s×${coeffs.xpSubjectActiveDayBonus} )`,
      influencingFactorsFa: [
        'N_comp,s و N_part,s : جلسات کامل و ناقص همان درس',
        'M_study,s : مجموع دقایق مطالعه واقعی همان درس',
        'N_ex,s : مجموع تست‌ها/تمرین‌های حل‌شده همان درس',
        'q_{i,s} : نمرات کیفیت جلسات مطالعه همان درس',
        'D_active,s : تعداد روزهای تقویمی متمایز که در آن درس فعالیت ثبت شده است',
      ],
      relatedToFa: ['XP ناخالص درس (XP_gross,s)', 'XP خالص درس (XP_net,s)', 'سطح ۳۹ مرحله‌ای درس'],
      exampleFa:
        'در درس علوم با ۲ جلسه کامل (10 XP)، ۱ ناقص (2.5 XP)، ۱۵۰ دقیقه مطالعه (3 XP)، ۵۰ تست (10 XP)، کیفیت‌های ۸ و ۸ و ۷ (4.6 XP) در ۳ روز متمایز (3 XP): XP_raw,s = 33.10 XP.',
    },
    {
      id: 'row-subject-mastery-index',
      domainId: 'subject_progression',
      domainTitleFa: '۸. سیستم پیشرفت اختصاصی هر درس (Subject XP, M_depth & Subject Level)',
      kind: 'sub_metric',
      kindLabelFa: 'متغیر فرمولی',
      hierarchyLevel: 2,
      titleFa: 'شاخص تسلط چهارعاملی درس (Subject Mastery Index)',
      symbol: 'Mastery_s',
      definitionAndPurposeFa:
        'عددی نرمال بین ۰ تا ۱ که کیفیت درونی مطالعه یک درس را از ترکیب ۴ عامل «کیفیت وزنی مطالعه»، «امتیاز آموزشی درس»، «نسبت تکمیل جلسات» و «استمرار روزهای فعال» اندازه‌گیری می‌کند تا ورودی فرمول ضریب عمق یادگیری (M_depth) را بسازد.',
      formulaFa:
        'Mastery_s = (w_{M,Q}×(Q_{w,s}÷10) + w_{M,E}×(E_s÷100) + w_{M,Task}×TaskRatio_s + w_{M,Cons}×min(1, D_active,s÷D_{cap,s})) ÷ Σw',
      influencingFactorsFa: [
        `Q_{w,s} ÷ 10 : کیفیت وزنی نرمال درس (با وزن فعلی ${coeffs.subjectMasteryQualityWeightPct}٪)`,
        `E_s ÷ 100 : امتیاز آموزشی نرمال درس (با وزن فعلی ${coeffs.subjectMasteryEduWeightPct}٪)`,
        `TaskRatio_s : نسبت تکمیل باکس‌های درس (با وزن فعلی ${coeffs.subjectMasteryTaskWeightPct}٪)`,
        `min(1, D_active,s ÷ ${coeffs.subjectConsistencyMaxDaysCap}) : عامل استمرار روزهای فعال (با وزن فعلی ${coeffs.subjectMasteryConsistencyWeightPct}٪)`,
      ],
      relatedToFa: ['ضریب عمق یادگیری / اثربخشی درس (M_depth)'],
      exampleFa:
        'اگر کیفیت نرمال 0.78، امتیاز آموزشی نرمال 0.78، تکمیل جلسات 0.625 و استمرار (۳ روز از ۲۵ روز) 0.12 باشد: Mastery_s = 0.45×0.78 + 0.35×0.78 + 0.10×0.625 + 0.10×0.12 = 0.6985.',
    },
    {
      id: 'row-subject-m-depth',
      domainId: 'subject_progression',
      domainTitleFa: '۸. سیستم پیشرفت اختصاصی هر درس (Subject XP, M_depth & Subject Level)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'ضریب عمق یادگیری درس / ضریب اثربخشی (Learning Depth / Effectiveness Multiplier)',
      symbol: 'M_depth (یا EffectivenessMultiplier)',
      definitionAndPurposeFa:
        'ضریب تعدیل کیفی درس که در کد برنامه با نام effectivenessMultiplier و در راهنما با نماد M_depth شناخته می‌شود (هر دو دقیقاً یک متغیر واحد هستند). تلاش خام درس (XP_raw,s) در این ضریب ضرب می‌شود تا مطالعه باکیفیت و مستمر تا ۲۵٪ پاداش مضاعف بگیرد (سقف ۱٫۲۵) و مطالعه سطحی یا رهاشده تعدیل شود. اگر کیفیت وزنی درس کمتر از حد نصاب (۴ از ۱۰) باشد، ضریب جریمه مطالعه سطحی (γ_shallow = 0.65) نیز در آن ضرب می‌شود.',
      formulaFa:
        `M_depth = round2( (${coeffs.subjectDepthBaseIntercept} + ${coeffs.subjectDepthSlope} × Mastery_s) × (Q_{w,s} < ${coeffs.effectiveDayMinQualityScore} ? ${coeffs.subjectShallowQualityPenaltyFactor} : 1) )`,
      influencingFactorsFa: [
        'Mastery_s : شاخص تسلط چهارعاملی درس (بین ۰ تا ۱)',
        `α_depth (${coeffs.subjectDepthBaseIntercept}) و β_depth (${coeffs.subjectDepthSlope}) : پایه و شیب خطی فرمول`,
        `γ_shallow (${coeffs.subjectShallowQualityPenaltyFactor}) : ضریب تعدیل مطالعه سطحی در صورت Q_{w,s} < ${coeffs.effectiveDayMinQualityScore}`,
      ],
      relatedToFa: [
        'XP ناخالص درس (XP_gross,s = XP_raw,s × M_depth)',
        'XP مثبت روزانه درس در دفتر کل درس',
        'XP خالص درس (XP_net,s)',
      ],
      exampleFa:
        'با Mastery_s = 0.6985 و کیفیت 7.8 (بالای ۴): M_depth = round2(0.28 + 0.97 × 0.6985) = round2(0.9575) = 0.96.',
    },
    {
      id: 'row-subject-penalty-and-net',
      domainId: 'subject_progression',
      domainTitleFa: '۸. سیستم پیشرفت اختصاصی هر درس (Subject XP, M_depth & Subject Level)',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'جریمه نوبت ازدست‌رفته درس، XP ناخالص و XP خالص نهایی درس',
      symbol: 'XP_gross,s , Penalty_{s,d} , XP_net,s , Stage_s',
      definitionAndPurposeFa:
        'حساب مستقل امتیاز و سطح هر درس: ابتدا تلاش خام درس در ضریب عمق یادگیری ضرب شده و XP ناخالص درس (XP_gross,s) را می‌سازد. سپس به ازای هر روز گذشته که آن درس برنامه داشته ولی نوبت مطالعه آن مؤثر نبوده است، جریمه اختصاصی آن درس (Penalty_{s,d}) محاسبه و کسر می‌شود تا XP خالص درس (XP_net,s) و مرحله ۱ تا ۳۹ آن درس (در مقیاس ۰ تا ۲٬۰۰۰ XP) تعیین گردد.',
      formulaFa:
        'XP_gross,s = round2(XP_raw,s × M_depth) | Penalty_{s,d} = round2(B_s × r_s(k_s) × (1 - F_{s,d})) | XP_net,s = max(0, XP_gross,s - Σ Penalty_{s,d})',
      influencingFactorsFa: [
        `B_s = clamp(AvgSessionXP_s × ${coeffs.subjectBasePenaltyRatePct / 100}, ${coeffs.subjectBasePenaltyMinXp}, ${coeffs.subjectBasePenaltyMaxXp}) : جریمه پایه هر نوبت ازدست‌رفته درس`,
        `r_s(k_s) = min(${coeffs.subjectStreakEscalationCap}, 1 + ${coeffs.subjectStreakEscalationStep}×(k_s - 1)) : ضریب تشدید غیبت متوالی درس`,
        'F_{s,d} : نسبت تحقق نوبت مطالعه آن درس در روز d',
        'SUBJECT_STAGE_THRESHOLDS : جدول ۳۹ آستانه اختصاصی تک‌درس (۰، ۶، ۱۳، ۲۱، ... تا ۲٬۰۰۰ XP)',
      ],
      relatedToFa: [
        'کارت سطح و پیشرفت هر درس در صفحه دروس (ReportsHubView)',
        'تشخیص تنزل پله درس (hasSubjectDemotion)',
        'وضعیت پیوستگی مطالعه درس (ContinuityStatus)',
      ],
      exampleFa:
        'اگر XP_raw,s = 28.50 و M_depth = 0.98 باشد: XP_gross,s = 27.93 XP. با کسر 0.36 XP بابت ۱ نوبت غیبت (B_s=0.60 × r_s=1.0 × 0.60)، XP خالص درس برابر XP_net,s = 27.57 XP (مرحله ۴: مس) می‌شود.',
    },

    // =========================================================================
    // DOMAIN 9: سرعت هفتگی کسب XP، پیش‌بینی ارتقا و وضعیت پیوستگی دروس
    // =========================================================================
    {
      id: 'row-velocity-rates',
      domainId: 'velocity_continuity',
      domainTitleFa: '۹. سرعت کسب XP، پیش‌بینی ارتقا و وضعیت پیوستگی دروس',
      kind: 'main_metric',
      kindLabelFa: 'شاخص اصلی',
      hierarchyLevel: 1,
      titleFa: 'سرعت مؤثر روزانه کسب XP در ۷ روز اخیر (Effective 7-Day XP Velocity)',
      symbol: 'Rate_7d,eff',
      definitionAndPurposeFa:
        'نرخ واقعی کسب XP خالص روزانه دانش‌آموز را در هفته اخیر با ترکیب هوشمند سه نرخ («میانگین تقویمی ۷ روزه»، «میانگین روزهای تعهددار» و «میانگین پیراسته ۵ روز میانی با حذف کمترین و بیشترین روز») محاسبه می‌کند تا یک روز استثنایی یا یک روز تعطیل، پیش‌بینی سرعت رشد را مخدوش نکند.',
      formulaFa:
        `Rate_7d,eff = round1( (${coeffs.velocityCalendarWeightPct}×Rate_7d,cal + ${coeffs.velocityAccountableWeightPct}×Rate_7d,acc + ${coeffs.velocityTrimmedWeightPct}×TrimmedMean_7d) ÷ ${coeffs.velocityCalendarWeightPct + coeffs.velocityAccountableWeightPct + coeffs.velocityTrimmedWeightPct} )`,
      influencingFactorsFa: [
        'NetXP_7d : مجموع XP خالص ۷ روز اخیر (XP مثبت ۷ روز منهای جریمه ۷ روز)',
        'Rate_7d,cal = max(0, NetXP_7d) ÷ 7 : نرخ تقویمی ۷ روزه',
        'Rate_7d,acc = max(0, NetXP_7d) ÷ max(1, ActiveDays_7d + MissedDays_7d) : نرخ روزهای تعهددار',
        'TrimmedMean_7d : میانگین ۵ روز میانی هفته پس از حذف ۱ روز کمینه و ۱ روز بیشینه',
      ],
      relatedToFa: [
        'پیش‌بینی تعداد روزهای باقیمانده تا پله بعد (EstDaysToNextStage)',
        'کارت سرعت و شتاب پیشرفت در داشبورد',
      ],
      exampleFa:
        'اگر در ۷ روز اخیر خالص ۷۰ XP در ۵ روز تعهددار کسب شده باشد: Rate_cal = 10.0، Rate_acc = 14.0 و TrimmedMean = 11.0 -> سرعت مؤثر Rate_7d,eff = 0.45×10 + 0.35×14 + 0.20×11 = 11.6 XP در روز.',
    },
    {
      id: 'row-est-days-next-stage',
      domainId: 'velocity_continuity',
      domainTitleFa: '۹. سرعت کسب XP، پیش‌بینی ارتقا و وضعیت پیوستگی دروس',
      kind: 'sub_metric',
      kindLabelFa: 'شاخص پیش‌بینی',
      hierarchyLevel: 2,
      titleFa: 'تخمین روزهای باقیمانده تا ارتقا به پله بعدی (Estimated Days to Next Stage)',
      symbol: 'EstDaysToNextStage',
      definitionAndPurposeFa:
        'با تقسیم XP باقیمانده تا مرز پله بعدی بر گام مؤثر پیش‌بینی (بیشینه سرعت مؤثر ۷ روزه، سرعت ۱۴ روزه و ۷۵٪ امتیاز امروز)، تعداد روزهای تقریبی لازم برای صعود به پله بعدی را به دانش‌آموز نشان می‌دهد.',
      formulaFa:
        'EstDaysToNextStage = ceil( XP_remaining_to_next ÷ max(Rate_7d,eff , Rate_14d,cal , 0.75 × XP_today) )',
      influencingFactorsFa: [
        'XP_remaining_to_next : فاصله XP فعلی تا آستانه شروع پله بعدی',
        'Rate_7d,eff : سرعت مؤثر روزانه در ۷ روز اخیر',
        'Rate_14d,cal : سرعت تقویمی ۱۴ روز اخیر',
      ],
      relatedToFa: ['نوار پیشرفت سطح کل در داشبورد'],
      exampleFa:
        'اگر تا پله بعدی ۳۵ XP باقی مانده باشد و سرعت مؤثر روزانه ۱۱٫۶ XP باشد: EstDaysToNextStage = ceil(35 ÷ 11.6) = 3 روز.',
    },
    {
      id: 'row-subject-continuity-status',
      domainId: 'velocity_continuity',
      domainTitleFa: '۹. سرعت کسب XP، پیش‌بینی ارتقا و وضعیت پیوستگی دروس',
      kind: 'main_metric',
      kindLabelFa: 'شاخص وضعیت',
      hierarchyLevel: 1,
      titleFa: 'وضعیت پیوستگی و استمرار مطالعه درس (Subject Continuity Status)',
      symbol: 'ContinuityStatus',
      definitionAndPurposeFa:
        'وضعیت سلامت استمرار هر درس را در ۴ سطح («وضعیت عادی»، «نیازمند توجه»، «هشدار جدی» و «استمرار ضعیف») بر اساس تعداد نوبت‌های متوالی ازدست‌رفته (k_s)، تنزل پله درس و تعداد روزهای سپری‌شده از آخرین مطالعه مؤثر (DaysSinceLastStudy) طبقه‌بندی می‌کند.',
      formulaFa:
        `اگر k_s ≥ 3 یا DaysSinceLastStudy > ${coeffs.subjectCriticalDaysThreshold} → «استمرار ضعیف» | اگر k_s = 2 یا تنزل پله → «هشدار جدی» | اگر k_s = 1 یا DaysSinceLastStudy > ${coeffs.subjectAttentionDaysThreshold} → «نیازمند توجه» | در غیر این صورت → «وضعیت عادی»`,
      influencingFactorsFa: [
        'k_s : تعداد نوبت‌های برنامه‌ریزی‌شده متوالی ازدست‌رفته در آن درس',
        'DaysSinceLastStudy : تعداد روزهای تقویمی گذشته از آخرین جلسه مطالعه مؤثر آن درس',
        'hasSubjectDemotion : آیا کسر جریمه باعث سقوط پله درس شده است یا خیر',
      ],
      relatedToFa: ['کارت‌های وضعیت دروس در صفحه دروس و هشدارهای اولویت‌بندی مطالعه'],
      exampleFa:
        `اگر آخرین مطالعه درس عربی ۸ روز پیش بوده باشد (بیشتر از آستانه ${coeffs.subjectAttentionDaysThreshold} روز ولی کمتر از ${coeffs.subjectCriticalDaysThreshold} روز)، وضعیت آن «نیازمند توجه» ثبت می‌شود.`,
    },
  ];

  // Append all 41 configurable coefficients directly under their respective domains so the table is 100% exhaustive
  const coeffDomainMap: Record<string, { domainId: Exclude<TableDomainId, 'all'>; domainTitleFa: string }> = {
    studyTimeWeightPct: {
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
    },
    exercisesWeightPct: {
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
    },
    learningQualityWeightPct: {
      domainId: 'educational_score',
      domainTitleFa: '۲. ارزیابی عملکرد آموزشی روزانه و دروس (T, Q, L, E)',
    },
    educationalCompositeWeightPct: {
      domainId: 'restricted_daily_score',
      domainTitleFa: '۳. کنترل فعالیت‌های محدودشونده و امتیاز نهایی روزانه (C_i, C, DS)',
    },
    restrictedControlWeightPct: {
      domainId: 'restricted_daily_score',
      domainTitleFa: '۳. کنترل فعالیت‌های محدودشونده و امتیاز نهایی روزانه (C_i, C, DS)',
    },
    partialTaskCreditFactor: {
      domainId: 'time_adherence',
      domainTitleFa: '۱. زمان، پایبندی و انحراف برنامه',
    },
  };

  const coeffRows: ComprehensiveTableRow[] = COEFFICIENT_METADATA_CATALOG.map((meta) => {
    let domainId: Exclude<TableDomainId, 'all'> = 'global_penalty_level';
    let domainTitleFa = '۷. تحقق برنامه روزانه، جریمه وقفه و سطح کل (Global Ledger)';

    if (coeffDomainMap[meta.key]) {
      domainId = coeffDomainMap[meta.key].domainId;
      domainTitleFa = coeffDomainMap[meta.key].domainTitleFa;
    } else if (meta.groupId === 'positive_xp') {
      domainId = 'positive_xp';
      domainTitleFa = '۶. موتور کسب امتیاز تجربه مثبت (Positive XP)';
    } else if (meta.groupId === 'subject_progression') {
      domainId = 'subject_progression';
      domainTitleFa = '۸. سیستم پیشرفت اختصاصی هر درس (Subject XP, M_depth & Subject Level)';
    } else if (meta.groupId === 'velocity_continuity') {
      domainId = 'velocity_continuity';
      domainTitleFa = '۹. سرعت کسب XP، پیش‌بینی ارتقا و وضعیت پیوستگی دروس';
    }

    const currentVal = coeffs[meta.key];
    const isModified = currentVal !== meta.defaultValue;

    return {
      id: `coeff-row-${meta.key}`,
      domainId,
      domainTitleFa,
      kind: 'configurable_coeff',
      kindLabelFa: 'ضریب قابل‌تنظیم',
      hierarchyLevel: 3,
      titleFa: meta.titleFa,
      symbol: meta.symbol,
      definitionAndPurposeFa: `${meta.descriptionFa} (${meta.impactExplanationFa})`,
      formulaFa: `پارامتر ضریب قابل‌تنظیم در «سایر ← تنظیمات ← تنظیم ضرایب» | مقدار فعلی: ${currentVal} ${meta.unitLabelFa} (پیش‌فرض: ${meta.defaultValue} | بازه مجاز: [${meta.min} تا ${meta.max}])${
        isModified ? ' [تغییریافته توسط کاربر]' : ''
      }`,
      influencingFactorsFa: [
        `قابل ویرایش مستقیم توسط کاربر در محدوده مجاز [${meta.min} .. ${meta.max}] (${meta.unitLabelFa})`,
        ...meta.usedInFormulas,
      ],
      relatedToFa: meta.relatedMetrics,
      exampleFa: `با مقدار فعلی (${currentVal} ${meta.unitLabelFa}) در فرمول «${meta.usedInFormulas[0] || ''}» اعمال می‌شود. ${meta.impactExplanationFa}`,
      coeffKey: meta.key,
    };
  });

  // Interleave rows by domain so each domain presents: Main Metrics -> Sub-metrics -> Input Counters -> Configurable Coefficients
  const domainOrder: Array<Exclude<TableDomainId, 'all'>> = [
    'time_adherence',
    'educational_score',
    'restricted_daily_score',
    'time_budget',
    'period_comparison',
    'positive_xp',
    'global_penalty_level',
    'subject_progression',
    'velocity_continuity',
  ];

  const allCombined = [...coreRows, ...coeffRows];
  const ordered: ComprehensiveTableRow[] = [];

  for (const dom of domainOrder) {
    const inDom = allCombined.filter((r) => r.domainId === dom);
    ordered.push(...inDom);
  }

  return ordered;
}

// Mapping from table row ID to its standalone detailed definition accordion in MetricsDefinitionsView.
// Basic input counter rows (row-m-predicted, row-m-actual, row-n-comp-part-pend, row-n-ex-inputs, row-input-qi)
// intentionally do NOT map to a standalone definition accordion so they never render dead/disabled links.
const ROW_TO_DEFINITION_MAP: Record<string, { definitionId: string; labelFa: string }> = {
  'row-time-ratio-pct': { definitionId: 'metric-8-plan-adherence-variance', labelFa: 'تعریف انطباق برنامه (۸)' },
  'row-study-variance': { definitionId: 'metric-8-plan-adherence-variance', labelFa: 'تعریف انحراف زمان (۸)' },
  'row-adherence-pct': { definitionId: 'metric-8-plan-adherence-variance', labelFa: 'تعریف پایبندی (۸)' },
  'row-metric-t': { definitionId: 'metric-1-study-time-t', labelFa: 'تعریف شاخص T (۱)' },
  'row-metric-q': { definitionId: 'metric-2-exercises-q', labelFa: 'تعریف شاخص Q (۲)' },
  'row-metric-qw-and-l': { definitionId: 'metric-3-learning-quality-l', labelFa: 'تعریف شاخص L و Q_w (۳)' },
  'row-metric-e': { definitionId: 'metric-4-educational-score-e', labelFa: 'تعریف شاخص E (۴)' },
  'row-metric-ci': { definitionId: 'metric-5-restricted-control-c', labelFa: 'تعریف کنترل C_i (۵)' },
  'row-metric-c': { definitionId: 'metric-5-restricted-control-c', labelFa: 'تعریف شاخص C (۵)' },
  'row-metric-ds': { definitionId: 'metric-6-final-daily-score-ds', labelFa: 'تعریف شاخص DS (۶)' },
  'row-budget-day': { definitionId: 'metric-7-daily-time-budget', labelFa: 'تعریف ظرف زمانی (۷)' },
  'row-study-share-budget': { definitionId: 'metric-7-daily-time-budget', labelFa: 'تعریف سهم مطالعه (۷)' },
  'row-budget-unalloc-over': { definitionId: 'metric-7-daily-time-budget', labelFa: 'تعریف ظرف زمانی (۷)' },
  'row-period-aggregates': { definitionId: 'metric-9-period-aggregation', labelFa: 'تعریف تجمیع بازه (۹)' },
  'row-period-delta': { definitionId: 'metric-10-subject-share-comparison', labelFa: 'تعریف مقایسه دوره (۱۰)' },
  'row-xp-pos-total': { definitionId: 'metric-11-positive-xp-formula', labelFa: 'تعریف XP مثبت (۱۱)' },
  'row-xp-components-sub': { definitionId: 'metric-11-positive-xp-formula', labelFa: 'تعریف مؤلفه‌های XP (۱۱)' },
  'row-metric-fd': { definitionId: 'metric-12-negative-xp-penalty-demotion', labelFa: 'تعریف نسبت تحقق F_d (۱۲)' },
  'row-is-effectively-active': { definitionId: 'metric-12-negative-xp-penalty-demotion', labelFa: 'تعریف روز فعال مؤثر (۱۲)' },
  'row-global-penalty-vars': { definitionId: 'metric-12-negative-xp-penalty-demotion', labelFa: 'تعریف متغیرهای جریمه (۱۲)' },
  'row-metric-pd': { definitionId: 'metric-12-negative-xp-penalty-demotion', labelFa: 'تعریف جریمه وقفه P_d (۱۲)' },
  'row-metric-xp-net-global': { definitionId: 'metric-18-net-global-level-balance', labelFa: 'تعریف تراز خالص کل (۱۸)' },
  'row-subject-xp-raw': { definitionId: 'metric-14-subject-xp-continuity', labelFa: 'تعریف XP خام درس (۱۴)' },
  'row-subject-mastery-index': { definitionId: 'metric-14-subject-xp-continuity', labelFa: 'تعریف شاخص تسلط (۱۴)' },
  'row-subject-m-depth': { definitionId: 'metric-14-subject-xp-continuity', labelFa: 'تعریف ضریب M_depth (۱۴)' },
  'row-subject-penalty-and-net': { definitionId: 'metric-19-subject-net-xp-and-continuity-status', labelFa: 'تعریف تراز خالص درس (۱۹)' },
  'row-velocity-rates': { definitionId: 'metric-15-xp-daily-velocity', labelFa: 'تعریف سرعت کسب XP (۱۵)' },
  'row-est-days-next-stage': { definitionId: 'metric-17-next-level-prediction', labelFa: 'تعریف پیش‌بینی صعود (۱۷)' },
  'row-subject-continuity-status': { definitionId: 'metric-19-subject-net-xp-and-continuity-status', labelFa: 'تعریف وضعیت پیوستگی (۱۹)' },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStandaloneTableHtml(
  rows: ComprehensiveTableRow[],
  counts: { total: number; main: number; sub: number; input: number; coeff: number }
): string {
  const kindColors: Record<TableRowKind, { bg: string; text: string; border: string }> = {
    main_metric: { bg: '#e0e7ff', text: '#312e81', border: '#a5b4fc' },
    sub_metric: { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' },
    input_counter: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    configurable_coeff: { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
  };

  let tbodyHtml = '';
  rows.forEach((row, idx) => {
    const prevDomain = idx > 0 ? rows[idx - 1].domainId : null;
    if (row.domainId !== prevDomain) {
      tbodyHtml += `
        <tr class="domain-row">
          <td colspan="7">◆ ${escapeHtml(toPersianDigits(row.domainTitleFa))}</td>
        </tr>`;
    }

    const kc = kindColors[row.kind];
    const factorsHtml = row.influencingFactorsFa
      .map((f) => `<li>${escapeHtml(toPersianDigits(f))}</li>`)
      .join('');
    const relHtml = row.relatedToFa
      .map((r) => `<span class="rel-chip">${escapeHtml(toPersianDigits(r))}</span>`)
      .join(' ');

    tbodyHtml += `
      <tr class="level-${row.hierarchyLevel}">
        <td class="col-title">
          <div class="badge" style="background:${kc.bg};color:${kc.text};border-color:${kc.border}">
            ${escapeHtml(row.kindLabelFa)}
          </div>
          <div class="title-text">${escapeHtml(toPersianDigits(row.titleFa))}</div>
        </td>
        <td class="col-symbol"><code dir="ltr">${escapeHtml(row.symbol)}</code></td>
        <td class="col-def">${escapeHtml(toPersianDigits(row.definitionAndPurposeFa))}</td>
        <td class="col-formula"><div class="formula-box">${escapeHtml(toPersianDigits(row.formulaFa))}</div></td>
        <td class="col-factors"><ul>${factorsHtml}</ul></td>
        <td class="col-related"><div class="rel-wrap">${relHtml}</div></td>
        <td class="col-example"><div class="example-box">${escapeHtml(toPersianDigits(row.exampleFa))}</div></td>
      </tr>`;
  });

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>جدول جامع شاخص‌ها، متغیرها و روابط محاسباتی — Martia Planner</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Vazirmatn', Tahoma, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 24px 16px 48px;
      line-height: 1.75;
      direction: rtl;
    }
    .container { max-width: 1640px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%);
      border: 1px solid rgba(129, 140, 248, 0.35);
      border-radius: 20px;
      padding: 24px 28px;
      margin-bottom: 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    }
    .header h1 { font-size: 22px; font-weight: 900; color: #ffffff; margin-bottom: 8px; }
    .header p { font-size: 13px; color: #e0e7ff; max-width: 1100px; }
    .stats-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      color: #e0e7ff;
    }
    .stat-box strong { font-size: 15px; font-weight: 900; color: #ffffff; margin-right: 6px; }
    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      background: #ffffff;
      color: #0f172a;
      border-radius: 18px;
      border: 2px solid #cbd5e1;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    }
    table {
      width: 100%;
      min-width: 1400px;
      border-collapse: collapse;
      text-align: right;
      font-size: 12.5px;
    }
    thead tr {
      background: #1e293b;
      color: #f8fafc;
      font-weight: 900;
    }
    th, td {
      padding: 12px 14px;
      border-left: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    th:last-child, td:last-child { border-left: none; }
    .domain-row td {
      background: #eef2ff;
      color: #1e1b4b;
      font-weight: 900;
      font-size: 13.5px;
      border-top: 2px solid #818cf8;
      border-bottom: 2px solid #818cf8;
      padding: 10px 16px;
    }
    tr.level-1 { background: #ffffff; }
    tr.level-2 { background: #f8fafc; }
    tr.level-3 { background: #fffbeb; }
    tbody tr:hover { background: #f1f5f9; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      border: 1px solid;
      margin-bottom: 6px;
    }
    .title-text { font-weight: 900; color: #0f172a; font-size: 13px; }
    .col-symbol { text-align: center; width: 130px; }
    .col-symbol code {
      display: inline-block;
      direction: ltr;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 800;
      color: #3730a3;
      font-size: 11.5px;
      word-break: break-all;
    }
    .formula-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 10px;
      font-weight: 700;
      color: #1e293b;
      font-size: 11.5px;
    }
    .col-factors ul { padding-right: 16px; }
    .col-factors li { margin-bottom: 4px; }
    .rel-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
    .rel-chip {
      display: inline-block;
      background: #eef2ff;
      color: #312e81;
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 700;
    }
    .example-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #064e3b;
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 11.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>جدول جامع شاخص‌ها، متغیرها و روابط محاسباتی — Martia Planner</h1>
      <p>مرجع کامل مهندسی فرمول‌ها، متغیرهای فرمولی، شمارنده‌های ورودی و ضرایب قابل‌تنظیم برنامه (تولیدشده به‌صورت پویا از آخرین مقادیر ضرایب فعال).</p>
      <div class="stats-row">
        <div class="stat-box">شاخص‌های اصلی: <strong>${toPersianDigits(counts.main)}</strong></div>
        <div class="stat-box">متغیرها و ورودی‌ها: <strong>${toPersianDigits(counts.sub + counts.input)}</strong></div>
        <div class="stat-box">ضرایب قابل‌تنظیم: <strong>${toPersianDigits(counts.coeff)}</strong></div>
        <div class="stat-box">کل ردیف‌های جدول: <strong>${toPersianDigits(counts.total)}</strong></div>
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width:215px">۱. عنوان شاخص یا متغیر</th>
            <th style="width:130px;text-align:center">۲. نماد</th>
            <th style="width:270px">۳. تعریف و هدف</th>
            <th style="width:240px">۴. فرمول محاسبه</th>
            <th style="width:205px">۵. عوامل و متغیرهای مؤثر</th>
            <th style="width:180px">۶. ارتباط با (مؤثر بر)</th>
            <th style="width:220px">۷. مثال عددی و کاربردی</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export interface ComprehensiveMetricsTableProps {
  onNavigateToDefinition?: (definitionId: string) => void;
  onNavigateToCoefficient?: (coeffKey: keyof AnalyticsCoefficientsConfig) => void;
  highlightedRowId?: string | null;
}

export const ComprehensiveMetricsTable: React.FC<ComprehensiveMetricsTableProps> = ({
  onNavigateToDefinition,
  onNavigateToCoefficient,
  highlightedRowId,
}) => {
  const [coeffs, setCoeffs] = useState<AnalyticsCoefficientsConfig>(() =>
    getAnalyticsCoefficients()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<TableDomainId>('all');
  const [selectedKind, setSelectedKind] = useState<'all' | TableRowKind>('all');
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setCoeffs({ ...getAnalyticsCoefficients() });
    };
    window.addEventListener(ANALYTICS_COEFFICIENTS_CHANGED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(ANALYTICS_COEFFICIENTS_CHANGED_EVENT, handleUpdate);
    };
  }, []);

  // When an external caller highlights a specific row, reset filters so the row is guaranteed visible and scroll to it
  useEffect(() => {
    if (!highlightedRowId) return;
    setSearchQuery('');
    setSelectedDomain('all');
    setSelectedKind('all');
    const timer = window.setTimeout(() => {
      const rowEl = document.getElementById(`master-table-${highlightedRowId}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 140);
    return () => window.clearTimeout(timer);
  }, [highlightedRowId]);

  const allRows = useMemo(() => buildMasterRows(coeffs), [coeffs]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((row) => {
      if (selectedDomain !== 'all' && row.domainId !== selectedDomain) return false;
      if (selectedKind !== 'all' && row.kind !== selectedKind) return false;
      if (!q) return true;
      return (
        row.titleFa.toLowerCase().includes(q) ||
        row.symbol.toLowerCase().includes(q) ||
        row.definitionAndPurposeFa.toLowerCase().includes(q) ||
        row.formulaFa.toLowerCase().includes(q) ||
        row.domainTitleFa.toLowerCase().includes(q) ||
        row.influencingFactorsFa.some((f) => f.toLowerCase().includes(q)) ||
        row.relatedToFa.some((r) => r.toLowerCase().includes(q)) ||
        row.exampleFa.toLowerCase().includes(q)
      );
    });
  }, [allRows, searchQuery, selectedDomain, selectedKind]);

  const counts = useMemo(() => {
    return {
      total: allRows.length,
      main: allRows.filter((r) => r.kind === 'main_metric').length,
      sub: allRows.filter((r) => r.kind === 'sub_metric').length,
      input: allRows.filter((r) => r.kind === 'input_counter').length,
      coeff: allRows.filter((r) => r.kind === 'configurable_coeff').length,
    };
  }, [allRows]);

  const standaloneHtml = useMemo(
    () => buildStandaloneTableHtml(allRows, counts),
    [allRows, counts]
  );

  const handleDownloadStandaloneHtml = () => {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MartiaPlanner-Comprehensive-Metrics-Table.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      dir="rtl"
      className="w-full max-w-full rounded-3xl border-2 border-indigo-200/90 dark:border-indigo-900/70 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
    >
      {/* Top Banner Header */}
      <div className="bg-gradient-to-l from-indigo-900 via-indigo-800 to-violet-900 text-white p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/15 border border-white/20 text-xs font-extrabold text-indigo-100">
                <Table2 className="w-4 h-4 text-amber-300 shrink-0" />
                <span>مرجع کامل مهندسی فرمول‌ها، متغیرها و ضرایب برنامه</span>
              </div>

              <button
                type="button"
                onClick={() => setIsHtmlModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>مشاهده و دانلود جدول در قالب HTML</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadStandaloneHtml}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-extrabold text-xs transition-all cursor-pointer"
                title="دانلود مستقیم فایل مستقل HTML"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>دانلود مستقیم HTML</span>
              </button>
            </div>

            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white pt-1">
              جدول جامع شاخص‌ها، متغیرها و روابط محاسباتی
            </h3>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-4xl">
              در این جدول مرجع، تمامی شاخص‌های اصلی، زیرشاخص‌ها، متغیرهای فرمولی، شمارنده‌های ورودی و ضرایب عددی قابل‌تنظیم برنامه به همراه نماد استاندارد، فرمول دقیق کد، متغیرهای مؤثر، گراف وابستگی («ارتباط با») و مثال عددی به صورت سلسله‌مراتبی فهرست شده‌اند.
            </p>
          </div>

          {/* Summary Stat Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <div className="px-3 py-2 rounded-2xl bg-white/10 border border-white/15 text-center">
              <div className="text-[11px] text-indigo-200 font-bold">شاخص‌های اصلی</div>
              <div className="text-base font-black text-white tabular-nums">
                {toPersianDigits(counts.main)}
              </div>
            </div>
            <div className="px-3 py-2 rounded-2xl bg-white/10 border border-white/15 text-center">
              <div className="text-[11px] text-indigo-200 font-bold">متغیرها و ورودی‌ها</div>
              <div className="text-base font-black text-emerald-300 tabular-nums">
                {toPersianDigits(counts.sub + counts.input)}
              </div>
            </div>
            <div className="px-3 py-2 rounded-2xl bg-white/10 border border-white/15 text-center">
              <div className="text-[11px] text-indigo-200 font-bold">ضرایب قابل‌تنظیم</div>
              <div className="text-base font-black text-amber-300 tabular-nums">
                {toPersianDigits(counts.coeff)}
              </div>
            </div>
            <div className="px-3 py-2 rounded-2xl bg-white/15 border border-white/25 text-center">
              <div className="text-[11px] text-indigo-100 font-bold">کل ردیف‌های مرجع</div>
              <div className="text-base font-black text-white tabular-nums">
                {toPersianDigits(counts.total)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone HTML Viewer & Download Modal */}
      {isHtmlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Table2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    پیش‌نمایش زنده و دانلود فایل مستقل HTML جدول جامع شاخص‌ها
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    شامل تمام {toPersianDigits(counts.total)} ردیف و ۷ ستون کامل — تولیدشده به‌صورت پویا از آخرین مقادیر ضرایب برنامه
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadStandaloneHtml}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل HTML مستقل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHtmlModalOpen(false)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>بستن</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden">
              <iframe
                title="پیش‌نمایش جدول جامع در قالب HTML"
                srcDoc={standaloneHtml}
                className="w-full h-full rounded-2xl border border-slate-800 bg-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام شاخص، نماد (مثل F_d، M_depth، w_T)، فرمول یا متغیرهای مرتبط..."
              className="w-full pr-10 pl-9 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Row Kind Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'همه انواع' },
                { id: 'main_metric', label: 'شاخص‌های اصلی' },
                { id: 'sub_metric', label: 'متغیرهای فرمولی' },
                { id: 'input_counter', label: 'ورودی‌ها و شمارنده‌ها' },
                { id: 'configurable_coeff', label: 'ضرایب قابل‌تنظیم' },
              ] as const
            ).map((k) => {
              const active = selectedKind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setSelectedKind(k.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Domain Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 shrink-0 ml-1">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            بخش:
          </span>
          {DOMAIN_FILTERS.map((dom) => {
            const active = selectedDomain === dom.id;
            return (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 font-extrabold'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {toPersianDigits(dom.labelFa)}
              </button>
            );
          })}
        </div>

        {/* Status Info Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              نمایش{' '}
              <strong className="font-black text-slate-800 dark:text-slate-200">
                {toPersianDigits(filteredRows.length)}
              </strong>{' '}
              مورد از {toPersianDigits(allRows.length)} شاخص و متغیر ثبت‌شده در موتور محاسباتی
            </span>
          </div>
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            برای مشاهده کامل تمام ۷ ستون در صفحه‌نمایش‌های کوچک، جدول را به چپ/راست اسکرول کنید ↔
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable 7-Column Master Table Container */}
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[1380px] border-collapse text-right">
          <thead>
            <tr className="bg-slate-100/95 dark:bg-slate-800/95 border-b-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-black">
              <th className="py-3.5 px-4 w-[225px] border-l border-slate-200/80 dark:border-slate-700/80">
                ۱. عنوان شاخص یا متغیر
              </th>
              <th className="py-3.5 px-3 w-[125px] border-l border-slate-200/80 dark:border-slate-700/80 text-center">
                ۲. نماد
              </th>
              <th className="py-3.5 px-4 w-[270px] border-l border-slate-200/80 dark:border-slate-700/80">
                ۳. تعریف و هدف
              </th>
              <th className="py-3.5 px-4 w-[240px] border-l border-slate-200/80 dark:border-slate-700/80">
                ۴. فرمول محاسبه
              </th>
              <th className="py-3.5 px-4 w-[200px] border-l border-slate-200/80 dark:border-slate-700/80">
                ۵. عوامل و متغیرهای مؤثر
              </th>
              <th className="py-3.5 px-4 w-[175px] border-l border-slate-200/80 dark:border-slate-700/80">
                ۶. ارتباط با (مؤثر بر)
              </th>
              <th className="py-3.5 px-4 w-[220px]">
                ۷. مثال عددی و کاربردی
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs leading-relaxed">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  هیچ شاخص یا متغیری منطبق با عبارت جستجوشده یافت نشد.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const prevDomain = idx > 0 ? filteredRows[idx - 1].domainId : null;
                const showDomainHeader = row.domainId !== prevDomain;
                const style = KIND_BADGE_STYLES[row.kind];
                const isHighlighted = highlightedRowId === row.id;

                // Determine smart links for Column 1
                const directDef = ROW_TO_DEFINITION_MAP[row.id];
                const coeffMeta = row.coeffKey
                  ? COEFFICIENT_METADATA_CATALOG.find((m) => m.key === row.coeffKey)
                  : undefined;
                const coeffPrimaryDef = coeffMeta?.relatedDefinitionIds?.[0];
                const targetDefId = directDef?.definitionId || coeffPrimaryDef?.id;
                const targetDefLabel =
                  directDef?.labelFa ||
                  (coeffPrimaryDef ? 'مشاهده شاخص در تعاریف' : undefined);

                return (
                  <React.Fragment key={row.id}>
                    {showDomainHeader && (
                      <tr className="bg-indigo-50/90 dark:bg-indigo-950/45 border-y border-indigo-200/80 dark:border-indigo-900/70">
                        <td
                          colSpan={7}
                          className="py-2.5 px-4 text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-200"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>{toPersianDigits(row.domainTitleFa)}</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr
                      id={`master-table-${row.id}`}
                      className={`align-top transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/40 ${
                        isHighlighted
                          ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/70 dark:bg-amber-950/35'
                          : row.hierarchyLevel === 1
                          ? 'bg-white dark:bg-slate-900'
                          : row.hierarchyLevel === 2
                          ? 'bg-slate-50/40 dark:bg-slate-900/60'
                          : 'bg-slate-50/75 dark:bg-slate-950/40'
                      }`}
                    >
                      {/* Col 1: Title + Hierarchy & Kind Badge + Smart Cross-Links */}
                      <td className="py-3.5 px-4 border-l border-slate-200/60 dark:border-slate-800/80">
                        <div
                          className={`space-y-1.5 ${
                            row.hierarchyLevel === 2
                              ? 'pr-2 border-r-2 border-violet-300 dark:border-violet-700'
                              : row.hierarchyLevel === 3
                              ? 'pr-3.5 border-r-2 border-amber-300 dark:border-amber-700'
                              : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${style.bg} ${style.text} ${style.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              {row.kindLabelFa}
                            </span>
                            {row.hierarchyLevel === 1 && (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                سطح ۱ (اصلی)
                              </span>
                            )}
                          </div>
                          <div className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-snug">
                            {toPersianDigits(row.titleFa)}
                          </div>

                          {/* Smart Bidirectional Jump Links (Only rendered when a valid destination exists) */}
                          {(targetDefId || row.coeffKey) && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {targetDefId && onNavigateToDefinition && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToDefinition(targetDefId)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] font-extrabold transition-colors cursor-pointer"
                                  title="پرش به کارت توضیح کامل این شاخص در تب تعاریف"
                                >
                                  <BookOpen className="w-3 h-3 shrink-0" />
                                  <span>{targetDefLabel ? toPersianDigits(targetDefLabel) : 'مشاهده در تعاریف'}</span>
                                  <ArrowLeft className="w-2.5 h-2.5 shrink-0" />
                                </button>
                              )}

                              {row.coeffKey && onNavigateToCoefficient && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToCoefficient(row.coeffKey!)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 text-[10px] font-extrabold transition-colors cursor-pointer"
                                  title="انتقال مستقیم به کارت تنظیم این ضریب در تنظیمات"
                                >
                                  <Sliders className="w-3 h-3 shrink-0" />
                                  <span>تنظیم ضریب</span>
                                  <ArrowLeft className="w-2.5 h-2.5 shrink-0" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Col 2: Symbol */}
                      <td className="py-3.5 px-3 border-l border-slate-200/60 dark:border-slate-800/80 text-center">
                        <code
                          dir="ltr"
                          className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-black text-indigo-700 dark:text-indigo-300 break-all"
                        >
                          {row.symbol}
                        </code>
                      </td>

                      {/* Col 3: Definition & Purpose */}
                      <td className="py-3.5 px-4 border-l border-slate-200/60 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {toPersianDigits(row.definitionAndPurposeFa)}
                      </td>

                      {/* Col 4: Formula */}
                      <td className="py-3.5 px-4 border-l border-slate-200/60 dark:border-slate-800/80">
                        <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 font-sans">
                            {row.kind === 'configurable_coeff' ? (
                              <Sliders className="w-3 h-3 shrink-0" />
                            ) : (
                              <Calculator className="w-3 h-3 shrink-0" />
                            )}
                            <span>
                              {row.kind === 'configurable_coeff'
                                ? 'مقدار و دامنه ضریب:'
                                : 'رابطه محاسباتی:'}
                            </span>
                          </div>
                          <div dir="rtl" className="break-words">
                            {toPersianDigits(row.formulaFa)}
                          </div>
                        </div>
                      </td>

                      {/* Col 5: Influencing Factors */}
                      <td className="py-3.5 px-4 border-l border-slate-200/60 dark:border-slate-800/80">
                        <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                          {row.influencingFactorsFa.map((factor, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <span>{toPersianDigits(factor)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Col 6: Related To (Reverse Dependency Graph) */}
                      <td className="py-3.5 px-4 border-l border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex flex-wrap gap-1.5">
                          {row.relatedToFa.map((rel, rIdx) => (
                            <span
                              key={rIdx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 text-[11px] font-bold text-indigo-800 dark:text-indigo-200"
                            >
                              <GitBranch className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{toPersianDigits(rel)}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Col 7: Example */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50 text-[11px] leading-relaxed">
                          <div className="flex items-center gap-1 font-extrabold text-emerald-800 dark:text-emerald-300 mb-0.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>مثال:</span>
                          </div>
                          <div>{toPersianDigits(row.exampleFa)}</div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
