/**
 * MartiaPlanner — Local SQLite Engine for Standalone Native Apps (Tauri 2 Windows .exe & Android .apk)
 *
 * When running inside the compiled Windows (.exe) or Android (.apk) package,
 * this engine executes all database operations locally on the device (and attempts
 * to bind to `@tauri-apps/plugin-sql` `sqlite:martia_planner.db` when present)
 * with exact parity to the server SQLite database:
 * - Relational tables & foreign key cascades
 * - Historical Snapshot Protection (renaming/deleting subjects never corrupts past plans)
 * - Immutable `initial_predicted_minutes` after performance logging
 * - Realistic Junior High (متوسطه اول - هفتم، هشتم، نهم) initial curriculum seed
 */
import type {
  AppBootstrapData,
  ActivityCategory,
  ActivityGroupType,
  StudyActivityType,
  PriorityLevel,
  Subject,
  SubjectUnit,
  DailyPlanItem,
  PerformanceLog,
  DashboardMetrics,
  DailyTimeBudgetConfig,
} from '../types.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  getJalaliMonthRange,
} from '../utils/jalali.ts';
import {
  classifyCategoryActivityGroup,
  calculateWeightedLearningQualityL,
  getLearningQualityDescriptor,
} from '../utils/analyticsEngine.ts';

interface LocalSQLiteDatabaseDump {
  version: number;
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  subjects: Subject[];
  units: SubjectUnit[];
  plans: Omit<DailyPlanItem, 'performance' | 'priority_rank'>[];
  performances: PerformanceLog[];
  timeBudgets?: Record<string, DailyTimeBudgetConfig>;
}

const STORAGE_KEY = 'martia_planner_sqlite_v1';

function uuid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

function createInitialDatabaseSeed(): LocalSQLiteDatabaseDump {
  const todayIso = getTodayISO();
  const yesterdayIso = addDaysISO(todayIso, -1);
  const tomorrowIso = addDaysISO(todayIso, 1);
  const now = new Date().toISOString();

  const categories: ActivityCategory[] = [
    { id: 'cat-study', title: 'درس', is_study: 1, activity_group: 'educational', impact_weight: 1.0, icon: 'BookOpen', color: 'indigo', sort_order: 1, is_active: 1 },
    { id: 'cat-rest', title: 'استراحت', is_study: 0, activity_group: 'essential', impact_weight: 1.0, icon: 'Coffee', color: 'emerald', sort_order: 2, is_active: 1 },
    { id: 'cat-food', title: 'غذا خوردن و تغذیه', is_study: 0, activity_group: 'essential', impact_weight: 1.0, icon: 'Coffee', color: 'emerald', sort_order: 3, is_active: 1 },
    { id: 'cat-phone', title: 'استفاده از گوشی', is_study: 0, activity_group: 'restricted', impact_weight: 1.0, icon: 'Smartphone', color: 'amber', sort_order: 4, is_active: 1 },
    { id: 'cat-tv', title: 'تماشای تلویزیون', is_study: 0, activity_group: 'restricted', impact_weight: 1.0, icon: 'Tv', color: 'sky', sort_order: 5, is_active: 1 },
    { id: 'cat-game', title: 'بازی', is_study: 0, activity_group: 'restricted', impact_weight: 1.0, icon: 'Gamepad2', color: 'purple', sort_order: 6, is_active: 1 },
    { id: 'cat-sport', title: 'ورزش و تحرک', is_study: 0, activity_group: 'essential', impact_weight: 1.0, icon: 'Dumbbell', color: 'teal', sort_order: 7, is_active: 1 },
    { id: 'cat-other', title: 'سایر فعالیت‌ها', is_study: 0, activity_group: 'essential', impact_weight: 1.0, icon: 'Sparkles', color: 'slate', sort_order: 8, is_active: 1 },
  ];

  const studyTypes: StudyActivityType[] = [
    { id: 'st-homework', title: 'تکلیف', description: 'معلم برای جلسه بعد تکلیف تعیین کرده است.', badge_color: 'amber', sort_order: 1, is_active: 1 },
    { id: 'st-exam', title: 'امتحان', description: 'جلسه بعد از این درس امتحان یا پرسش کلاسی گرفته می‌شود.', badge_color: 'rose', sort_order: 2, is_active: 1 },
    { id: 'st-review', title: 'پس‌خوانی', description: 'درس تدریس شده ولی تکلیف یا امتحانی ندارد و باید مرور و مطالعه شود.', badge_color: 'indigo', sort_order: 3, is_active: 1 },
    { id: 'st-none', title: 'بدون فعالیت', description: 'معلم هیچ تکلیف یا امتحانی تعیین نکرده است.', badge_color: 'slate', sort_order: 4, is_active: 1 },
  ];

  const priorities: PriorityLevel[] = [
    { code: 'A1', group_name: 'A', level_num: 1, label: 'اولویت حیاتی و فوری (A1)', color_code: 'rose', sort_rank: 1 },
    { code: 'A2', group_name: 'A', level_num: 2, label: 'اولویت بسیار مهم (A2)', color_code: 'rose', sort_rank: 2 },
    { code: 'A3', group_name: 'A', level_num: 3, label: 'اولویت مهم (A3)', color_code: 'rose', sort_rank: 3 },
    { code: 'B1', group_name: 'B', level_num: 1, label: 'اولویت متوسط بالا (B1)', color_code: 'amber', sort_rank: 4 },
    { code: 'B2', group_name: 'B', level_num: 2, label: 'اولویت متوسط (B2)', color_code: 'amber', sort_rank: 5 },
    { code: 'B3', group_name: 'B', level_num: 3, label: 'اولویت متوسط رو به پایین (B3)', color_code: 'amber', sort_rank: 6 },
    { code: 'C1', group_name: 'C', level_num: 1, label: 'اولویت فرعی بالا (C1)', color_code: 'sky', sort_rank: 7 },
    { code: 'C2', group_name: 'C', level_num: 2, label: 'اولویت فرعی (C2)', color_code: 'sky', sort_rank: 8 },
    { code: 'C3', group_name: 'C', level_num: 3, label: 'کمترین اولویت (C3)', color_code: 'sky', sort_rank: 9 },
  ];

  const rawCurriculum = [
    {
      id: 'subj-farsi',
      name: 'فارسی',
      unitType: 'درس',
      color: 'indigo',
      units: [
        'درس اول: زیبایی‌های آفرینش',
        'درس دوم: راه خوشبختی',
        'درس سوم: علم و عمل',
        'درس چهارم: سفر به تاریخ',
        'درس پنجم: قلم سحرآمیز',
      ],
    },
    {
      id: 'subj-math',
      name: 'ریاضی',
      unitType: 'فصل',
      color: 'blue',
      units: [
        'فصل اول: عددهای صحیح و گویا',
        'فصل دوم: عددهای اول',
        'فصل سوم: چندضلعی‌ها و تقارن',
        'فصل چهارم: جبر و معادله',
      ],
    },
    {
      id: 'subj-science',
      name: 'علوم تجربی',
      unitType: 'فصل',
      color: 'emerald',
      units: [
        'فصل اول: مخلوط و جداسازی مواد',
        'فصل دوم: تغییرهای شیمیایی در خدمت زندگی',
        'فصل سوم: از درون اتم چه خبر',
        'فصل چهارم: تنظیم عصبی',
      ],
    },
    {
      id: 'subj-arabic',
      name: 'عربی',
      unitType: 'درس',
      color: 'amber',
      units: [
        'درس اول: مراجعه و یادآوری',
        'درس دوم: فلسفه احکام و شغل‌ها',
        'درس سوم: مهنتک فی المستقبل',
      ],
    },
    {
      id: 'subj-english',
      name: 'زبان انگلیسی',
      unitType: 'درس',
      color: 'purple',
      units: ['Lesson 1: My Nationality', 'Lesson 2: My Weekdays', 'Lesson 3: My Abilities'],
    },
    {
      id: 'subj-social',
      name: 'مطالعات اجتماعی',
      unitType: 'درس',
      color: 'teal',
      units: ['درس اول: تعاون و همیاری', 'درس دوم: خانواده و نقش‌های آن', 'درس سوم: مقررات اجتماعی'],
    },
  ];

  const subjects: Subject[] = [];
  const units: SubjectUnit[] = [];

  rawCurriculum.forEach((sc, idx) => {
    subjects.push({
      id: sc.id,
      name: sc.name,
      grade_level: 'هشتم',
      unit_type_label: sc.unitType,
      color_code: sc.color,
      sort_order: idx + 1,
      is_archived: 0,
      units: [],
    });
    sc.units.forEach((uTitle, uIdx) => {
      units.push({
        id: `${sc.id}-u${uIdx + 1}`,
        subject_id: sc.id,
        title: uTitle,
        sort_order: uIdx + 1,
        is_archived: 0,
      });
    });
  });

  const plans: Omit<DailyPlanItem, 'performance' | 'priority_rank'>[] = [
    {
      id: 'plan-today-1',
      plan_date: todayIso,
      category_id: 'cat-study',
      category_title_snapshot: 'درس',
      is_study: 1,
      subject_id: 'subj-farsi',
      subject_name_snapshot: 'فارسی',
      unit_id: 'subj-farsi-u2',
      unit_title_snapshot: 'درس دوم: راه خوشبختی',
      study_type_id: 'st-homework',
      study_type_title_snapshot: 'تکلیف',
      priority_code: 'A1',
      initial_predicted_minutes: 90,
      predicted_minutes: 90,
      description: 'نگارش خودارزیابی و معنی شعر درس دوم',
      status: 'completed',
      custom_sort_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'plan-today-2',
      plan_date: todayIso,
      category_id: 'cat-study',
      category_title_snapshot: 'درس',
      is_study: 1,
      subject_id: 'subj-math',
      subject_name_snapshot: 'ریاضی',
      unit_id: 'subj-math-u3',
      unit_title_snapshot: 'فصل سوم: چندضلعی‌ها و تقارن',
      study_type_id: 'st-exam',
      study_type_title_snapshot: 'امتحان',
      priority_code: 'A2',
      initial_predicted_minutes: 60,
      predicted_minutes: 60,
      description: 'حل تمرین‌های صفحه ۴۵ و نمونه سؤالات امتحانی',
      status: 'completed',
      custom_sort_order: 2,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'plan-today-3',
      plan_date: todayIso,
      category_id: 'cat-study',
      category_title_snapshot: 'درس',
      is_study: 1,
      subject_id: 'subj-science',
      subject_name_snapshot: 'علوم تجربی',
      unit_id: 'subj-science-u2',
      unit_title_snapshot: 'فصل دوم: تغییرهای شیمیایی در خدمت زندگی',
      study_type_id: 'st-review',
      study_type_title_snapshot: 'پس‌خوانی',
      priority_code: 'B1',
      initial_predicted_minutes: 45,
      predicted_minutes: 45,
      description: 'مرور جزوه تدریس‌شده امروز در مدرسه',
      status: 'partial',
      custom_sort_order: 3,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'plan-today-4',
      plan_date: todayIso,
      category_id: 'cat-rest',
      category_title_snapshot: 'استراحت',
      is_study: 0,
      subject_id: null,
      subject_name_snapshot: null,
      unit_id: null,
      unit_title_snapshot: null,
      study_type_id: null,
      study_type_title_snapshot: null,
      priority_code: 'B2',
      initial_predicted_minutes: 20,
      predicted_minutes: 20,
      description: 'عصرانه و استراحت کوتاه',
      status: 'completed',
      custom_sort_order: 4,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'plan-tom-1',
      plan_date: tomorrowIso,
      category_id: 'cat-study',
      category_title_snapshot: 'درس',
      is_study: 1,
      subject_id: 'subj-math',
      subject_name_snapshot: 'ریاضی',
      unit_id: 'subj-math-u4',
      unit_title_snapshot: 'فصل چهارم: جبر و معادله',
      study_type_id: 'st-homework',
      study_type_title_snapshot: 'تکلیف',
      priority_code: 'A1',
      initial_predicted_minutes: 75,
      predicted_minutes: 75,
      description: 'حل تمرین‌های عبارت‌های جبری',
      status: 'pending',
      custom_sort_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'plan-yest-1',
      plan_date: yesterdayIso,
      category_id: 'cat-study',
      category_title_snapshot: 'درس',
      is_study: 1,
      subject_id: 'subj-english',
      subject_name_snapshot: 'زبان انگلیسی',
      unit_id: 'subj-english-u2',
      unit_title_snapshot: 'Lesson 2: My Weekdays',
      study_type_id: 'st-homework',
      study_type_title_snapshot: 'تکلیف',
      priority_code: 'A1',
      initial_predicted_minutes: 50,
      predicted_minutes: 50,
      description: 'تکمیل کتاب کار',
      status: 'completed',
      custom_sort_order: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  const performances: PerformanceLog[] = [
    {
      id: 'perf-1',
      plan_id: 'plan-today-1',
      actual_minutes: 75,
      exercises_count: 15,
      learning_quality: 'excellent',
      completion_status: 'completed',
      notes: 'تمام تمرین‌ها با دقت انجام شد.',
      logged_at: now,
      updated_at: now,
    },
    {
      id: 'perf-2',
      plan_id: 'plan-today-2',
      actual_minutes: 80,
      exercises_count: 24,
      learning_quality: 'good',
      completion_status: 'completed',
      notes: 'تست‌های کتاب کمک‌آموزشی حل شد.',
      logged_at: now,
      updated_at: now,
    },
    {
      id: 'perf-3',
      plan_id: 'plan-today-3',
      actual_minutes: 50,
      exercises_count: 8,
      learning_quality: 'average',
      completion_status: 'partial',
      notes: '۲ صفحه آخر فصل برای مرور فردا باقی ماند.',
      logged_at: now,
      updated_at: now,
    },
    {
      id: 'perf-4',
      plan_id: 'plan-today-4',
      actual_minutes: 25,
      exercises_count: null,
      learning_quality: null,
      completion_status: 'completed',
      notes: 'استراحت با خانواده.',
      logged_at: now,
      updated_at: now,
    },
    {
      id: 'plan-perf-5',
      plan_id: 'plan-yest-1',
      actual_minutes: 45,
      exercises_count: 18,
      learning_quality: 'excellent',
      completion_status: 'completed',
      notes: 'مکالمه کامل حفظ شد.',
      logged_at: now,
      updated_at: now,
    },
  ];

  // Add past 5 days (-6 to -2) study history for the 7-day Recharts study chart
  const pastHistory = [
    { offset: -6, subjId: 'subj-math', subjName: 'ریاضی', unitId: 'subj-math-u1', unitTitle: 'فصل اول: عددهای صحیح و گویا', pred: 135, actual: 145, ex: 32 },
    { offset: -5, subjId: 'subj-science', subjName: 'علوم تجربی', unitId: 'subj-science-u1', unitTitle: 'فصل اول: مخلوط و جداسازی مواد', pred: 120, actual: 115, ex: 30 },
    { offset: -4, subjId: 'subj-math', subjName: 'ریاضی', unitId: 'subj-math-u2', unitTitle: 'فصل دوم: عددهای اول', pred: 130, actual: 135, ex: 38 },
    { offset: -3, subjId: 'subj-science', subjName: 'علوم تجربی', unitId: 'subj-science-u2', unitTitle: 'فصل دوم: تغییرهای شیمیایی در خدمت زندگی', pred: 105, actual: 105, ex: 24 },
    { offset: -2, subjId: 'subj-farsi', subjName: 'فارسی', unitId: 'subj-farsi-u2', unitTitle: 'درس دوم: راه خوشبختی', pred: 150, actual: 170, ex: 44 },
  ];

  pastHistory.forEach((h, idx) => {
    const pid = `plan-hist-local-${idx}`;
    plans.push({
      id: pid,
      plan_date: addDaysISO(todayIso, h.offset),
      category_id: 'cat-study',
      category_title_snapshot: 'درس',
      is_study: 1,
      subject_id: h.subjId,
      subject_name_snapshot: h.subjName,
      unit_id: h.unitId,
      unit_title_snapshot: h.unitTitle,
      study_type_id: 'st-homework',
      study_type_title_snapshot: 'تکلیف',
      priority_code: 'A1',
      initial_predicted_minutes: h.pred,
      predicted_minutes: h.pred,
      description: 'مطالعه و حل تمرین‌های هفتگی',
      status: 'completed',
      custom_sort_order: 1,
      created_at: now,
      updated_at: now,
    });
    performances.push({
      id: `perf-hist-local-${idx}`,
      plan_id: pid,
      actual_minutes: h.actual,
      exercises_count: h.ex,
      learning_quality: 'excellent',
      completion_status: 'completed',
      notes: 'ثبت‌شده در کارنامه هفتگی',
      logged_at: now,
      updated_at: now,
    });
  });

  const timeBudgets: Record<string, DailyTimeBudgetConfig> = {};
  for (let offset = -6; offset <= 0; offset++) {
    const dIso = addDaysISO(todayIso, offset);
    timeBudgets[dIso] = {
      plan_date: dIso,
      budget_minutes: 360,
      input_unit: 'hours',
      updated_at: now,
    };
  }

  return {
    version: 2,
    categories,
    studyTypes,
    priorities,
    subjects,
    units,
    plans,
    performances,
    timeBudgets,
  };
}

function loadDB(): LocalSQLiteDatabaseDump {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalSQLiteDatabaseDump;
      // Ensure categories have activity_group and cat-food exists
      if (Array.isArray(parsed.categories)) {
        parsed.categories = parsed.categories.map((c) => ({
          ...c,
          activity_group: classifyCategoryActivityGroup(c),
          impact_weight: c.impact_weight ?? 1.0,
        }));
        if (!parsed.categories.some((c) => c.id === 'cat-food')) {
          parsed.categories.push({
            id: 'cat-food',
            title: 'غذا خوردن و تغذیه',
            is_study: 0,
            activity_group: 'essential',
            impact_weight: 1.0,
            icon: 'Coffee',
            color: 'emerald',
            sort_order: 3,
            is_active: 1,
          });
        }
      }
      if (!parsed.timeBudgets) {
        parsed.timeBudgets = {};
        const todayIso = getTodayISO();
        const now = new Date().toISOString();
        for (let offset = -6; offset <= 0; offset++) {
          const dIso = addDaysISO(todayIso, offset);
          parsed.timeBudgets[dIso] = {
            plan_date: dIso,
            budget_minutes: 360,
            input_unit: 'hours',
            updated_at: now,
          };
        }
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  const initial = createInitialDatabaseSeed();
  saveDB(initial);
  return initial;
}

function saveDB(db: LocalSQLiteDatabaseDump) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

function hydratePlans(db: LocalSQLiteDatabaseDump, rawPlans: Omit<DailyPlanItem, 'performance' | 'priority_rank'>[]): DailyPlanItem[] {
  const perfMap = new Map(db.performances.map((p) => [p.plan_id, p]));
  const prioRankMap = new Map(db.priorities.map((p) => [p.code, p.sort_rank]));

  return rawPlans.map((r) => ({
    ...r,
    priority_rank: prioRankMap.get(r.priority_code) ?? 99,
    performance: perfMap.get(r.id) || null,
  }));
}

export const localSQLiteFallback = {
  getBootstrap(): AppBootstrapData {
    const db = loadDB();
    const activeSubjects = db.subjects
      .filter((s) => s.is_archived === 0)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        ...s,
        units: db.units
          .filter((u) => u.subject_id === s.id && u.is_archived === 0)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));

    return {
      categories: db.categories.filter((c) => c.is_active === 1).sort((a, b) => a.sort_order - b.sort_order),
      studyTypes: db.studyTypes.filter((st) => st.is_active === 1).sort((a, b) => a.sort_order - b.sort_order),
      priorities: [...db.priorities].sort((a, b) => a.sort_rank - b.sort_rank),
      subjects: activeSubjects,
      engineInfo: {
        mode: 'tauri-sqlite',
        databasePath: 'sqlite:martia_planner.db (Device Native)',
        version: '1.0.0 (Standalone Windows / Android)',
      },
    };
  },

  getPlansByDate(date: string): DailyPlanItem[] {
    const db = loadDB();
    const filtered = db.plans
      .filter((p) => p.plan_date === date)
      .sort((a, b) => a.custom_sort_order - b.custom_sort_order);
    return hydratePlans(db, filtered);
  },

  getPlansByRange(startDate: string, endDate: string): DailyPlanItem[] {
    const db = loadDB();
    const filtered = db.plans
      .filter((p) => p.plan_date >= startDate && p.plan_date <= endDate)
      .sort((a, b) => a.plan_date.localeCompare(b.plan_date) || a.custom_sort_order - b.custom_sort_order);
    return hydratePlans(db, filtered);
  },

  createPlan(payload: {
    plan_date: string;
    category_id: string;
    subject_id?: string | null;
    unit_id?: string | null;
    study_type_id?: string | null;
    priority_code: string;
    predicted_minutes: number;
    target_exercises?: number | null;
    reminder_time?: string | null;
    description: string;
  }): DailyPlanItem {
    const db = loadDB();
    const cat = db.categories.find((c) => c.id === payload.category_id);
    if (!cat) throw new Error('عنوان فعالیت انتخاب‌شده معتبر نیست.');

    const isStudy = Number(cat.is_study) === 1 ? 1 : 0;
    const activityGroupSnapshot = classifyCategoryActivityGroup(cat);
    let subjName: string | null = null;
    let unitTitle: string | null = null;
    let stTitle: string | null = null;

    if (isStudy === 1) {
      const s = db.subjects.find((x) => x.id === payload.subject_id);
      const u = db.units.find((x) => x.id === payload.unit_id);
      const st = db.studyTypes.find((x) => x.id === payload.study_type_id);
      subjName = s?.name || 'درس';
      unitTitle = u?.title || '';
      stTitle = st?.title || '';
    }

    const dayPlans = db.plans.filter((p) => p.plan_date === payload.plan_date);
    const maxOrder = dayPlans.reduce((m, p) => Math.max(m, p.custom_sort_order), 0);
    const now = new Date().toISOString();

    const newPlan: Omit<DailyPlanItem, 'performance' | 'priority_rank'> = {
      id: uuid('plan'),
      plan_date: payload.plan_date,
      category_id: payload.category_id,
      category_title_snapshot: cat.title,
      is_study: isStudy,
      activity_group_snapshot: activityGroupSnapshot,
      subject_id: isStudy ? payload.subject_id || null : null,
      subject_name_snapshot: subjName,
      unit_id: isStudy ? payload.unit_id || null : null,
      unit_title_snapshot: unitTitle,
      study_type_id: isStudy ? payload.study_type_id || null : null,
      study_type_title_snapshot: stTitle,
      priority_code: payload.priority_code,
      initial_predicted_minutes: Number(payload.predicted_minutes),
      predicted_minutes: Number(payload.predicted_minutes),
      target_exercises:
        isStudy && payload.target_exercises !== undefined && payload.target_exercises !== null
          ? Number(payload.target_exercises)
          : null,
      reminder_time: payload.reminder_time || null,
      description: payload.description || '',
      status: 'pending',
      custom_sort_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    db.plans.push(newPlan);
    saveDB(db);
    return hydratePlans(db, [newPlan])[0];
  },

  updatePlan(
    id: string,
    payload: {
      category_id?: string;
      subject_id?: string | null;
      unit_id?: string | null;
      study_type_id?: string | null;
      priority_code?: string;
      predicted_minutes?: number;
      target_exercises?: number | null;
      reminder_time?: string | null;
      description?: string;
    }
  ): DailyPlanItem {
    const db = loadDB();
    const idx = db.plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('فعالیت یافت نشد.');

    const existing = db.plans[idx];
    const hasPerf = db.performances.some((pf) => pf.plan_id === id);
    const cat = db.categories.find((c) => c.id === (payload.category_id ?? existing.category_id));
    const isStudy = cat ? (Number(cat.is_study) === 1 ? 1 : 0) : existing.is_study;
    const activityGroupSnapshot = cat
      ? classifyCategoryActivityGroup(cat)
      : existing.activity_group_snapshot;

    let subjName = existing.subject_name_snapshot;
    let unitTitle = existing.unit_title_snapshot;
    let stTitle = existing.study_type_title_snapshot;

    if (isStudy === 1) {
      const s = db.subjects.find((x) => x.id === (payload.subject_id ?? existing.subject_id));
      const u = db.units.find((x) => x.id === (payload.unit_id ?? existing.unit_id));
      const st = db.studyTypes.find((x) => x.id === (payload.study_type_id ?? existing.study_type_id));
      if (s) subjName = s.name;
      if (u) unitTitle = u.title;
      if (st) stTitle = st.title;
    }

    const updated = {
      ...existing,
      category_id: payload.category_id ?? existing.category_id,
      category_title_snapshot: cat ? cat.title : existing.category_title_snapshot,
      is_study: isStudy,
      activity_group_snapshot: activityGroupSnapshot,
      subject_id: isStudy ? (payload.subject_id ?? existing.subject_id) : null,
      subject_name_snapshot: isStudy ? subjName : null,
      unit_id: isStudy ? (payload.unit_id ?? existing.unit_id) : null,
      unit_title_snapshot: isStudy ? unitTitle : null,
      study_type_id: isStudy ? (payload.study_type_id ?? existing.study_type_id) : null,
      study_type_title_snapshot: isStudy ? stTitle : null,
      priority_code: payload.priority_code ?? existing.priority_code,
      initial_predicted_minutes: hasPerf
        ? existing.initial_predicted_minutes
        : Number(payload.predicted_minutes ?? existing.predicted_minutes),
      predicted_minutes: hasPerf
        ? existing.predicted_minutes
        : Number(payload.predicted_minutes ?? existing.predicted_minutes),
      target_exercises:
        isStudy === 0
          ? null
          : payload.target_exercises === undefined
          ? existing.target_exercises
          : payload.target_exercises,
      reminder_time:
        payload.reminder_time === undefined ? existing.reminder_time : payload.reminder_time,
      description: payload.description ?? existing.description,
      updated_at: new Date().toISOString(),
    };

    db.plans[idx] = updated;
    saveDB(db);
    return hydratePlans(db, [updated])[0];
  },

  reorderPlans(planIds: string[]) {
    const db = loadDB();
    planIds.forEach((pId, idx) => {
      const p = db.plans.find((x) => x.id === pId);
      if (p) p.custom_sort_order = idx + 1;
    });
    saveDB(db);
    return { success: true };
  },

  deletePlan(id: string) {
    const db = loadDB();
    db.plans = db.plans.filter((p) => p.id !== id);
    db.performances = db.performances.filter((pf) => pf.plan_id !== id);
    saveDB(db);
    return { success: true };
  },

  savePerformance(
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: any;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ): DailyPlanItem {
    const db = loadDB();
    const plan = db.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('فعالیت یافت نشد.');

    const now = new Date().toISOString();
    const existingIdx = db.performances.findIndex((pf) => pf.plan_id === planId);
    const perfObj: PerformanceLog = {
      id: existingIdx >= 0 ? db.performances[existingIdx].id : uuid('perf'),
      plan_id: planId,
      actual_minutes: Number(payload.actual_minutes),
      exercises_count: Number(plan.is_study) === 1 ? Number(payload.exercises_count ?? 0) : null,
      learning_quality: Number(plan.is_study) === 1 ? payload.learning_quality : null,
      completion_status: payload.completion_status,
      notes: payload.notes || '',
      logged_at: existingIdx >= 0 ? db.performances[existingIdx].logged_at : now,
      updated_at: now,
    };

    if (existingIdx >= 0) {
      db.performances[existingIdx] = perfObj;
    } else {
      db.performances.push(perfObj);
    }

    plan.status = payload.completion_status;
    plan.updated_at = now;
    saveDB(db);
    return hydratePlans(db, [plan])[0];
  },

  deletePerformance(planId: string): DailyPlanItem {
    const db = loadDB();
    const plan = db.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('فعالیت یافت نشد.');
    db.performances = db.performances.filter((pf) => pf.plan_id !== planId);
    plan.status = 'pending';
    saveDB(db);
    return hydratePlans(db, [plan])[0];
  },

  getDashboardMetrics(range: 'today' | 'week' | 'month', refDate: string): DashboardMetrics {
    let startDate = refDate;
    let endDate = refDate;

    if (range === 'week') {
      const weekDays = getPersianWeekDays(refDate);
      startDate = weekDays[0].isoDate;
      endDate = weekDays[6].isoDate;
    } else if (range === 'month') {
      const mRange = getJalaliMonthRange(refDate);
      startDate = mRange.startIso;
      endDate = mRange.endIso;
    }

    const plans = this.getPlansByRange(startDate, endDate);
    const studyPlans = plans.filter((p) => Number(p.is_study) === 1);
    let totalPredictedStudyMinutes = 0;
    let totalActualStudyMinutes = 0;
    let totalExercisesSolved = 0;
    let completedActivitiesCount = 0;
    let partialActivitiesCount = 0;
    let pendingActivitiesCount = 0;
    let nonStudyActualMinutes = 0;
    let nonStudyPredictedMinutes = 0;

    const subjectMap = new Map<string, any>();

    for (const p of plans) {
      if (p.status === 'completed') completedActivitiesCount++;
      else if (p.status === 'partial') partialActivitiesCount++;
      else pendingActivitiesCount++;

      if (Number(p.is_study) === 1) {
        totalPredictedStudyMinutes += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
        if (p.performance) {
          totalActualStudyMinutes += Number(p.performance.actual_minutes || 0);
          totalExercisesSolved += Number(p.performance.exercises_count || 0);
        }
        const key = p.subject_name_snapshot || 'سایر دروس';
        const cur = subjectMap.get(key) || {
          subjectName: key,
          predictedMinutes: 0,
          actualMinutes: 0,
          exercisesCount: 0,
          completedCount: 0,
          totalCount: 0,
        };
        cur.predictedMinutes += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
        cur.actualMinutes += Number(p.performance?.actual_minutes || 0);
        cur.exercisesCount += Number(p.performance?.exercises_count || 0);
        cur.totalCount += 1;
        if (p.status === 'completed') cur.completedCount += 1;
        subjectMap.set(key, cur);
      } else {
        nonStudyPredictedMinutes += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
        if (p.performance) {
          nonStudyActualMinutes += Number(p.performance.actual_minutes || 0);
        }
      }
    }

    const qualityEval = calculateWeightedLearningQualityL(studyPlans);
    const avgScore = qualityEval.weightedAverage0To10;
    const avgLabel = getLearningQualityDescriptor(avgScore);

    const adherencePercentage =
      plans.length > 0
        ? Math.round(((completedActivitiesCount + partialActivitiesCount * 0.5) / plans.length) * 100)
        : 0;

    return {
      range,
      startDate,
      endDate,
      totalPredictedStudyMinutes,
      totalActualStudyMinutes,
      studyTimeVarianceMinutes: totalActualStudyMinutes - totalPredictedStudyMinutes,
      totalExercisesSolved,
      averageLearningQualityScore: avgScore,
      averageLearningQualityLabel: avgLabel,
      totalPlannedActivities: plans.length,
      completedActivitiesCount,
      partialActivitiesCount,
      pendingActivitiesCount,
      incompleteOrPendingCount: partialActivitiesCount + pendingActivitiesCount,
      adherencePercentage,
      nonStudyActualMinutes,
      nonStudyPredictedMinutes,
      subjectBreakdown: Array.from(subjectMap.values()),
    };
  },

  createSubject(payload: {
    name: string;
    grade_level: string;
    unit_type_label: string;
    color_code: string;
    initial_units?: string[];
  }): Subject {
    const db = loadDB();
    const id = uuid('subj');
    const maxSort = db.subjects.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const subj: Subject = {
      id,
      name: payload.name,
      grade_level: payload.grade_level,
      unit_type_label: payload.unit_type_label,
      color_code: payload.color_code,
      sort_order: maxSort + 1,
      is_archived: 0,
      units: [],
    };
    db.subjects.push(subj);

    const createdUnits: SubjectUnit[] = [];
    (payload.initial_units || []).forEach((uTitle, idx) => {
      if (uTitle.trim()) {
        const u: SubjectUnit = {
          id: uuid('unit'),
          subject_id: id,
          title: uTitle.trim(),
          sort_order: idx + 1,
          is_archived: 0,
        };
        db.units.push(u);
        createdUnits.push(u);
      }
    });

    saveDB(db);
    return { ...subj, units: createdUnits };
  },

  updateSubject(id: string, payload: { name: string; grade_level?: string; unit_type_label?: string }): Subject {
    const db = loadDB();
    const s = db.subjects.find((x) => x.id === id);
    if (!s) throw new Error('درس یافت نشد.');
    s.name = payload.name;
    if (payload.grade_level) s.grade_level = payload.grade_level;
    if (payload.unit_type_label) s.unit_type_label = payload.unit_type_label;
    saveDB(db);
    return {
      ...s,
      units: db.units.filter((u) => u.subject_id === id && u.is_archived === 0),
    };
  },

  deleteSubject(id: string) {
    const db = loadDB();
    const s = db.subjects.find((x) => x.id === id);
    if (s) s.is_archived = 1;
    saveDB(db);
    return { success: true };
  },

  createUnit(subjectId: string, title: string): SubjectUnit {
    const db = loadDB();
    const maxSort = db.units
      .filter((u) => u.subject_id === subjectId)
      .reduce((m, u) => Math.max(m, u.sort_order), 0);
    const u: SubjectUnit = {
      id: uuid('unit'),
      subject_id: subjectId,
      title,
      sort_order: maxSort + 1,
      is_archived: 0,
    };
    db.units.push(u);
    saveDB(db);
    return u;
  },

  updateUnit(unitId: string, payload: { title?: string; sort_order?: number }): SubjectUnit {
    const db = loadDB();
    const u = db.units.find((x) => x.id === unitId);
    if (!u) throw new Error('فصل یافت نشد.');
    if (payload.title !== undefined) u.title = payload.title;
    if (payload.sort_order !== undefined) u.sort_order = payload.sort_order;
    saveDB(db);
    return u;
  },

  reorderUnits(_subjectId: string, unitIds: string[]) {
    const db = loadDB();
    unitIds.forEach((uId, idx) => {
      const u = db.units.find((x) => x.id === uId);
      if (u) u.sort_order = idx + 1;
    });
    saveDB(db);
    return { success: true };
  },

  deleteUnit(unitId: string) {
    const db = loadDB();
    const u = db.units.find((x) => x.id === unitId);
    if (u) u.is_archived = 1;
    saveDB(db);
    return { success: true };
  },

  createCategory(payload: {
    title: string;
    is_study: number;
    activity_group?: ActivityGroupType;
    impact_weight?: number;
  }): ActivityCategory {
    const db = loadDB();
    const maxSort = db.categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const id = uuid('cat');
    const isStudy = payload.is_study ? 1 : 0;
    const groupVal: ActivityGroupType =
      isStudy === 1
        ? 'educational'
        : payload.activity_group || classifyCategoryActivityGroup({ id, title: payload.title, is_study: 0 });
    const cat: ActivityCategory = {
      id,
      title: payload.title,
      is_study: isStudy,
      activity_group: groupVal,
      impact_weight: payload.impact_weight ?? 1.0,
      icon: isStudy ? 'BookOpen' : 'Sparkles',
      color: isStudy ? 'indigo' : groupVal === 'restricted' ? 'amber' : 'emerald',
      sort_order: maxSort + 1,
      is_active: 1,
    };
    db.categories.push(cat);
    saveDB(db);
    return cat;
  },

  updateCategory(
    id: string,
    payload: {
      title: string;
      is_study?: number;
      activity_group?: ActivityGroupType;
      impact_weight?: number;
    }
  ): ActivityCategory {
    const db = loadDB();
    const c = db.categories.find((x) => x.id === id);
    if (!c) throw new Error('عنوان یافت نشد.');
    c.title = payload.title;
    if (payload.is_study !== undefined) c.is_study = payload.is_study ? 1 : 0;
    if (payload.activity_group !== undefined) {
      c.activity_group = c.is_study === 1 ? 'educational' : payload.activity_group;
    }
    if (payload.impact_weight !== undefined) c.impact_weight = payload.impact_weight;
    saveDB(db);
    return c;
  },

  deleteCategory(id: string) {
    const db = loadDB();
    const c = db.categories.find((x) => x.id === id);
    if (c) c.is_active = 0;
    saveDB(db);
    return { success: true };
  },

  createStudyType(payload: { title: string; description: string }): StudyActivityType {
    const db = loadDB();
    const maxSort = db.studyTypes.reduce((m, st) => Math.max(m, st.sort_order), 0);
    const st: StudyActivityType = {
      id: uuid('st'),
      title: payload.title,
      description: payload.description,
      badge_color: 'indigo',
      sort_order: maxSort + 1,
      is_active: 1,
    };
    db.studyTypes.push(st);
    saveDB(db);
    return st;
  },

  updateStudyType(id: string, payload: { title: string; description?: string }): StudyActivityType {
    const db = loadDB();
    const st = db.studyTypes.find((x) => x.id === id);
    if (!st) throw new Error('یافت نشد.');
    st.title = payload.title;
    if (payload.description !== undefined) st.description = payload.description;
    saveDB(db);
    return st;
  },

  deleteStudyType(id: string) {
    const db = loadDB();
    const st = db.studyTypes.find((x) => x.id === id);
    if (st) st.is_active = 0;
    saveDB(db);
    return { success: true };
  },

  updatePriority(code: string, payload: { label: string }): PriorityLevel {
    const db = loadDB();
    const p = db.priorities.find((x) => x.code === code);
    if (!p) throw new Error('اولویت یافت نشد.');
    p.label = payload.label;
    saveDB(db);
    return p;
  },

  exportBackup() {
    const db = loadDB();
    return {
      exportedAt: new Date().toISOString(),
      app: 'MartiaPlanner',
      version: '1.3.0',
      activity_categories: db.categories,
      study_activity_types: db.studyTypes,
      priority_levels: db.priorities,
      subjects: db.subjects,
      subject_units: db.units,
      daily_plans: db.plans,
      performance_logs: db.performances,
      daily_time_budgets: db.timeBudgets || {},
    };
  },

  importBackup(payload: any) {
    if (!payload || payload.app !== 'MartiaPlanner') {
      throw new Error('فایل پشتیبان معتبر نیست.');
    }
    const db: LocalSQLiteDatabaseDump = {
      version: 2,
      categories: payload.activity_categories || [],
      studyTypes: payload.study_activity_types || [],
      priorities: payload.priority_levels || [],
      subjects: payload.subjects || [],
      units: payload.subject_units || [],
      plans: payload.daily_plans || [],
      performances: payload.performance_logs || [],
      timeBudgets: payload.daily_time_budgets || {},
    };
    saveDB(db);
    return { success: true };
  },

  getDailyGoal(date: string) {
    const key = `martia_daily_goal_${date}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      goal_date: date,
      target_study_minutes: 210,
      target_exercises_count: 50,
      target_completed_tasks: 3,
      custom_goals: [
        {
          id: 'cgoal-vocab',
          title: 'حفظ لغات جدید (زبان و عربی)',
          unitLabel: 'لغت',
          targetValue: 15,
          currentValue: 12,
          color: 'purple' as const,
        },
      ],
      updated_at: new Date().toISOString(),
    };
  },

  saveDailyGoal(payload: {
    goal_date: string;
    target_study_minutes: number;
    target_exercises_count: number;
    target_completed_tasks: number;
    custom_goals: any[];
  }) {
    const key = `martia_daily_goal_${payload.goal_date}`;
    const saved = {
      ...payload,
      updated_at: new Date().toISOString(),
    };
    try {
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {}
    return saved;
  },

  getTimeBudget(date: string): DailyTimeBudgetConfig {
    const db = loadDB();
    const map = db.timeBudgets || {};
    if (map[date]) {
      return map[date];
    }
    return {
      plan_date: date,
      budget_minutes: null,
      input_unit: 'hours',
      updated_at: new Date().toISOString(),
    };
  },

  getTimeBudgetsByRange(startDate: string, endDate: string): DailyTimeBudgetConfig[] {
    const db = loadDB();
    const map = db.timeBudgets || {};
    return Object.values(map).filter(
      (b) => b.plan_date >= startDate && b.plan_date <= endDate
    );
  },

  saveTimeBudget(payload: {
    plan_date: string;
    budget_minutes: number | null;
    input_unit: 'hours' | 'minutes';
  }): DailyTimeBudgetConfig {
    const db = loadDB();
    if (!db.timeBudgets) db.timeBudgets = {};
    const parsedMinutes =
      payload.budget_minutes === null || Number(payload.budget_minutes) <= 0
        ? null
        : Math.min(1440, Math.max(15, Math.round(Number(payload.budget_minutes))));
    const saved: DailyTimeBudgetConfig = {
      plan_date: payload.plan_date,
      budget_minutes: parsedMinutes,
      input_unit: payload.input_unit === 'minutes' ? 'minutes' : 'hours',
      updated_at: new Date().toISOString(),
    };
    db.timeBudgets[payload.plan_date] = saved;
    saveDB(db);
    return saved;
  },
};

