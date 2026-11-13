/**
 * MartiaPlanner — Relational SQLite Database Engine (better-sqlite3)
 *
 * Architectural Highlights:
 * 1. Foreign Keys & Normalization: Subjects -> SubjectUnits, Categories, StudyTypes, Priorities, DailyPlans -> PerformanceLogs
 * 2. Historical Snapshot Protection: Every DailyPlan stores `category_title_snapshot`, `subject_name_snapshot`,
 *    `unit_title_snapshot`, and `study_type_title_snapshot`. Modifying or deleting base entities in Settings or
 *    Subjects NEVER corrupts historical plans or analytics.
 * 3. Immutable Predicted Time Baseline: `initial_predicted_minutes` is locked once performance is logged,
 *    and edits are recorded in `plan_history_audit` so predicted vs. actual variance remains 100% accurate.
 * 4. Realistic Junior High (متوسطه اول - پایه‌های هفتم، هشتم، نهم) Seed Data for immediate testing & exploration.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getTodayISO, addDaysISO } from '../utils/jalali.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const DB_FILE_PATH = path.join(DB_DIR, 'martia_planner.sqlite');

export const db = new Database(DB_FILE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      is_study INTEGER NOT NULL DEFAULT 0,
      icon TEXT NOT NULL DEFAULT 'BookOpen',
      color TEXT NOT NULL DEFAULT 'indigo',
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS study_activity_types (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      badge_color TEXT NOT NULL DEFAULT 'blue',
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS priority_levels (
      code TEXT PRIMARY KEY,
      group_name TEXT NOT NULL,
      level_num INTEGER NOT NULL,
      label TEXT NOT NULL,
      color_code TEXT NOT NULL,
      sort_rank INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade_level TEXT NOT NULL DEFAULT 'هشتم',
      unit_type_label TEXT NOT NULL DEFAULT 'درس',
      color_code TEXT NOT NULL DEFAULT 'indigo',
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subject_units (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY,
      plan_date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_title_snapshot TEXT NOT NULL,
      is_study INTEGER NOT NULL DEFAULT 1,
      subject_id TEXT,
      subject_name_snapshot TEXT,
      unit_id TEXT,
      unit_title_snapshot TEXT,
      study_type_id TEXT,
      study_type_title_snapshot TEXT,
      priority_code TEXT NOT NULL,
      initial_predicted_minutes INTEGER NOT NULL,
      predicted_minutes INTEGER NOT NULL,
      reminder_time TEXT,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      custom_sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date);
    CREATE INDEX IF NOT EXISTS idx_daily_plans_priority ON daily_plans(priority_code);

    CREATE TABLE IF NOT EXISTS performance_logs (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL UNIQUE,
      actual_minutes INTEGER NOT NULL,
      exercises_count INTEGER,
      learning_quality TEXT,
      completion_status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT NOT NULL DEFAULT '',
      logged_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plan_history_audit (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      previous_predicted_minutes INTEGER NOT NULL,
      new_predicted_minutes INTEGER NOT NULL,
      changed_at TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_study_goals (
      goal_date TEXT PRIMARY KEY,
      target_study_minutes INTEGER NOT NULL DEFAULT 210,
      target_exercises_count INTEGER NOT NULL DEFAULT 50,
      target_completed_tasks INTEGER NOT NULL DEFAULT 3,
      custom_goals_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_time_budgets (
      plan_date TEXT PRIMARY KEY,
      budget_minutes INTEGER,
      input_unit TEXT NOT NULL DEFAULT 'hours',
      updated_at TEXT NOT NULL
    );
  `);

  // Safe migrations for existing databases
  const safeMigrations = [
    'ALTER TABLE daily_plans ADD COLUMN reminder_time TEXT',
    'ALTER TABLE daily_plans ADD COLUMN activity_group_snapshot TEXT',
    'ALTER TABLE daily_plans ADD COLUMN target_exercises INTEGER',
    "ALTER TABLE activity_categories ADD COLUMN activity_group TEXT NOT NULL DEFAULT 'essential'",
    'ALTER TABLE activity_categories ADD COLUMN impact_weight REAL NOT NULL DEFAULT 1.0',
  ];
  for (const sql of safeMigrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists
    }
  }

  seedInitialDataIfEmpty();

  // Ensure activity_group is accurately set on existing categories & plans
  try {
    db.prepare(
      "UPDATE activity_categories SET activity_group = 'educational' WHERE is_study = 1"
    ).run();
    db.prepare(
      "UPDATE activity_categories SET activity_group = 'restricted' WHERE is_study = 0 AND (id IN ('cat-phone', 'cat-tv', 'cat-game') OR title LIKE '%گوشی%' OR title LIKE '%تلویزیون%' OR title LIKE '%بازی%' OR title LIKE '%شبکه%' OR title LIKE '%سرگرمی%')"
    ).run();
    db.prepare(
      "INSERT OR IGNORE INTO activity_categories (id, title, is_study, activity_group, impact_weight, icon, color, sort_order, is_active) VALUES ('cat-food', 'غذا خوردن و تغذیه', 0, 'essential', 1.0, 'Coffee', 'emerald', 3, 1)"
    ).run();

    // Seed initial daily time budgets (360 mins = 6 hours) for today and the past 6 days if empty
    const todayIso = getTodayISO();
    const now = new Date().toISOString();
    const insertBudget = db.prepare(`
      INSERT OR IGNORE INTO daily_time_budgets (plan_date, budget_minutes, input_unit, updated_at)
      VALUES (?, ?, 'hours', ?)
    `);
    for (let offset = -6; offset <= 0; offset++) {
      insertBudget.run(addDaysISO(todayIso, offset), 360, now);
    }
  } catch {}

  // Ensure default sample reminder times exist on today's incomplete study tasks
  try {
    db.prepare(
      "UPDATE daily_plans SET reminder_time = '17:30' WHERE id = 'plan-today-3' AND reminder_time IS NULL"
    ).run();
    db.prepare(
      "UPDATE daily_plans SET reminder_time = '19:00' WHERE id = 'plan-today-5' AND reminder_time IS NULL"
    ).run();
  } catch {}
}

function seedInitialDataIfEmpty() {
  const countCategories = db
    .prepare('SELECT COUNT(*) as cnt FROM activity_categories')
    .get() as { cnt: number };

  if (countCategories.cnt === 0) {
    const insertCategory = db.prepare(`
      INSERT INTO activity_categories (id, title, is_study, activity_group, impact_weight, icon, color, sort_order, is_active)
      VALUES (?, ?, ?, ?, 1.0, ?, ?, ?, 1)
    `);

    const defaultCategories = [
      ['cat-study', 'درس', 1, 'educational', 'BookOpen', 'indigo', 1],
      ['cat-rest', 'استراحت', 0, 'essential', 'Coffee', 'emerald', 2],
      ['cat-food', 'غذا خوردن و تغذیه', 0, 'essential', 'Coffee', 'emerald', 3],
      ['cat-phone', 'استفاده از گوشی', 0, 'restricted', 'Smartphone', 'amber', 4],
      ['cat-tv', 'تماشای تلویزیون', 0, 'restricted', 'Tv', 'sky', 5],
      ['cat-game', 'بازی', 0, 'restricted', 'Gamepad2', 'purple', 6],
      ['cat-sport', 'ورزش و تحرک', 0, 'essential', 'Dumbbell', 'teal', 7],
      ['cat-other', 'سایر فعالیت‌ها', 0, 'essential', 'Sparkles', 'slate', 8],
    ];

    for (const c of defaultCategories) {
      insertCategory.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6]);
    }
  }

  const countStudyTypes = db
    .prepare('SELECT COUNT(*) as cnt FROM study_activity_types')
    .get() as { cnt: number };

  if (countStudyTypes.cnt === 0) {
    const insertStudyType = db.prepare(`
      INSERT INTO study_activity_types (id, title, description, badge_color, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const defaultStudyTypes = [
      [
        'st-homework',
        'تکلیف',
        'معلم برای جلسه بعد تکلیف تعیین کرده است.',
        'amber',
        1,
      ],
      [
        'st-exam',
        'امتحان',
        'جلسه بعد از این درس امتحان یا پرسش کلاسی گرفته می‌شود.',
        'rose',
        2,
      ],
      [
        'st-review',
        'پس‌خوانی',
        'درس تدریس شده ولی تکلیف یا امتحانی ندارد و باید مرور و مطالعه شود.',
        'indigo',
        3,
      ],
      [
        'st-none',
        'بدون فعالیت',
        'معلم هیچ تکلیف یا امتحانی تعیین نکرده است.',
        'slate',
        4,
      ],
    ];

    for (const st of defaultStudyTypes) {
      insertStudyType.run(st[0], st[1], st[2], st[3], st[4]);
    }
  }

  const countPriorities = db
    .prepare('SELECT COUNT(*) as cnt FROM priority_levels')
    .get() as { cnt: number };

  if (countPriorities.cnt === 0) {
    const insertPriority = db.prepare(`
      INSERT INTO priority_levels (code, group_name, level_num, label, color_code, sort_rank)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const priorities = [
      ['A1', 'A', 1, 'اولویت حیاتی و فوری (A1)', 'rose', 1],
      ['A2', 'A', 2, 'اولویت بسیار مهم (A2)', 'rose', 2],
      ['A3', 'A', 3, 'اولویت مهم (A3)', 'rose', 3],
      ['B1', 'B', 1, 'اولویت متوسط بالا (B1)', 'amber', 4],
      ['B2', 'B', 2, 'اولویت متوسط (B2)', 'amber', 5],
      ['B3', 'B', 3, 'اولویت متوسط رو به پایین (B3)', 'amber', 6],
      ['C1', 'C', 1, 'اولویت فرعی بالا (C1)', 'sky', 7],
      ['C2', 'C', 2, 'اولویت فرعی (C2)', 'sky', 8],
      ['C3', 'C', 3, 'کمترین اولویت (C3)', 'sky', 9],
    ];

    for (const p of priorities) {
      insertPriority.run(p[0], p[1], p[2], p[3], p[4], p[5]);
    }
  }

  const countSubjects = db
    .prepare('SELECT COUNT(*) as cnt FROM subjects')
    .get() as { cnt: number };

  if (countSubjects.cnt === 0) {
    const now = new Date().toISOString();
    const insertSubject = db.prepare(`
      INSERT INTO subjects (id, name, grade_level, unit_type_label, color_code, sort_order, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `);
    const insertUnit = db.prepare(`
      INSERT INTO subject_units (id, subject_id, title, sort_order, is_archived)
      VALUES (?, ?, ?, ?, 0)
    `);

    const curriculum: Array<{
      id: string;
      name: string;
      unitType: string;
      color: string;
      units: string[];
    }> = [
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
          'درس ششم: آداب نیکو',
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
          'فصل پنجم: بردار و مختصات',
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
          'فصل پنجم: حس و حرکت',
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
          'درس چهارم: تجربه های علمی',
        ],
      },
      {
        id: 'subj-english',
        name: 'زبان انگلیسی',
        unitType: 'درس',
        color: 'purple',
        units: [
          'Lesson 1: My Nationality',
          'Lesson 2: My Weekdays',
          'Lesson 3: My Abilities',
          'Lesson 4: My Health',
        ],
      },
      {
        id: 'subj-social',
        name: 'مطالعات اجتماعی',
        unitType: 'درس',
        color: 'teal',
        units: [
          'درس اول: تعاون و همیاری',
          'درس دوم: خانواده و نقش‌های آن',
          'درس سوم: مقررات و قوانین اجتماعی',
          'درس چهارم: عصر شکوفایی تمدن اسلامی',
        ],
      },
      {
        id: 'subj-payam',
        name: 'پیام‌های آسمان',
        unitType: 'درس',
        color: 'sky',
        units: [
          'درس اول: خدای مهربان',
          'درس دوم: بال‌های پرواز',
          'درس سوم: کلید گنج‌ها',
        ],
      },
      {
        id: 'subj-quran',
        name: 'آموزش قرآن',
        unitType: 'درس',
        color: 'emerald',
        units: [
          'جلسه اول و دوم: سوره انفال',
          'جلسه سوم و چهارم: سوره توبه',
          'جلسه پنجم و ششم: سوره یونس',
        ],
      },
      {
        id: 'subj-tech',
        name: 'کار و فناوری',
        unitType: 'پودمان',
        color: 'slate',
        units: [
          'پودمان اول: الگوریتم و برنامه‌نویسی',
          'پودمان دوم: کار با صفحات گسترده',
          'پودمان سوم: نقشه‌کشی و طراحی',
        ],
      },
    ];

    curriculum.forEach((subj, idx) => {
      insertSubject.run(subj.id, subj.name, 'هشتم', subj.unitType, subj.color, idx + 1, now);
      subj.units.forEach((unitTitle, uIdx) => {
        insertUnit.run(`${subj.id}-u${uIdx + 1}`, subj.id, unitTitle, uIdx + 1);
      });
    });

    // Seed realistic student plans for Today, Yesterday, and Tomorrow so the app immediately demonstrates
    // predicted vs. actual comparison, completed/partial/pending states, and weekly/daily analytics.
    seedSamplePlans();
  }

  ensureSevenDayHistorySeed();
}

function ensureSevenDayHistorySeed() {
  const existing = db
    .prepare("SELECT id FROM daily_plans WHERE id = 'plan-hist-d2-1'")
    .get();
  if (existing) return;

  const todayIso = getTodayISO();
  const now = new Date().toISOString();

  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO daily_plans (
      id, plan_date, category_id, category_title_snapshot, is_study,
      subject_id, subject_name_snapshot, unit_id, unit_title_snapshot,
      study_type_id, study_type_title_snapshot, priority_code,
      initial_predicted_minutes, predicted_minutes, description, status,
      custom_sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPerf = db.prepare(`
    INSERT OR IGNORE INTO performance_logs (
      id, plan_id, actual_minutes, exercises_count, learning_quality,
      completion_status, notes, logged_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pastDaysData = [
    {
      id: 'plan-hist-d6-1',
      offset: -6,
      subjId: 'subj-math',
      subjName: 'ریاضی',
      unitId: 'subj-math-u1',
      unitTitle: 'فصل اول: عددهای صحیح و گویا',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'A1',
      pred: 90,
      actual: 95,
      exercises: 22,
      quality: 'excellent',
      desc: 'حل تمرین‌های مرور فصل اول و تست‌های تکمیلی عددهای گویا',
    },
    {
      id: 'plan-hist-d6-2',
      offset: -6,
      subjId: 'subj-farsi',
      subjName: 'فارسی',
      unitId: 'subj-farsi-u1',
      unitTitle: 'درس اول: زیبایی‌های آفرینش',
      stId: 'st-review',
      stTitle: 'پس‌خوانی',
      priority: 'B1',
      pred: 45,
      actual: 50,
      exercises: 10,
      quality: 'good',
      desc: 'مرور آرایه‌های ادبی و تاریخ ادبیات درس اول',
    },
    {
      id: 'plan-hist-d5-1',
      offset: -5,
      subjId: 'subj-science',
      subjName: 'علوم تجربی',
      unitId: 'subj-science-u1',
      unitTitle: 'فصل اول: مخلوط و جداسازی مواد',
      stId: 'st-exam',
      stTitle: 'امتحان',
      priority: 'A1',
      pred: 75,
      actual: 70,
      exercises: 16,
      quality: 'excellent',
      desc: 'آمادگی برای پرسش کلاسی انحلال‌پذیری و جداسازی مخلوط‌ها',
    },
    {
      id: 'plan-hist-d5-2',
      offset: -5,
      subjId: 'subj-english',
      subjName: 'زبان انگلیسی',
      unitId: 'subj-english-u1',
      unitTitle: 'Lesson 1: My Nationality',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'B2',
      pred: 45,
      actual: 45,
      exercises: 14,
      quality: 'good',
      desc: 'تمرین مکالمه و دیکته کلمات کشورها و ملیت‌ها',
    },
    {
      id: 'plan-hist-d4-1',
      offset: -4,
      subjId: 'subj-math',
      subjName: 'ریاضی',
      unitId: 'subj-math-u2',
      unitTitle: 'فصل دوم: عددهای اول',
      stId: 'st-exam',
      stTitle: 'امتحان',
      priority: 'A1',
      pred: 80,
      actual: 90,
      exercises: 26,
      quality: 'excellent',
      desc: 'حل نمونه سؤالات غربال اراتستن و ب.م.م / ک.م.م',
    },
    {
      id: 'plan-hist-d4-2',
      offset: -4,
      subjId: 'subj-arabic',
      subjName: 'عربی',
      unitId: 'subj-arabic-u1',
      unitTitle: 'درس اول: مراجعه و یادآوری',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'B1',
      pred: 50,
      actual: 45,
      exercises: 12,
      quality: 'good',
      desc: 'صرف فعل ماضی و مضارع و ترجمه تمارین درس اول',
    },
    {
      id: 'plan-hist-d3-1',
      offset: -3,
      subjId: 'subj-science',
      subjName: 'علوم تجربی',
      unitId: 'subj-science-u2',
      unitTitle: 'فصل دوم: تغییرهای شیمیایی در خدمت زندگی',
      stId: 'st-review',
      stTitle: 'پس‌خوانی',
      priority: 'A2',
      pred: 60,
      actual: 65,
      exercises: 15,
      quality: 'good',
      desc: 'بررسی مثلث آتش و واکنش‌های شیمیایی گرماده و گرماگیر',
    },
    {
      id: 'plan-hist-d3-2',
      offset: -3,
      subjId: 'subj-social',
      subjName: 'مطالعات اجتماعی',
      unitId: 'subj-social-u1',
      unitTitle: 'درس اول: تعاون و همیاری',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'B2',
      pred: 45,
      actual: 40,
      exercises: 9,
      quality: 'excellent',
      desc: 'پاسخ به کاربرگه شماره ۱ و خلاصه‌نویسی درس',
    },
    {
      id: 'plan-hist-d2-1',
      offset: -2,
      subjId: 'subj-math',
      subjName: 'ریاضی',
      unitId: 'subj-math-u3',
      unitTitle: 'فصل سوم: چندضلعی‌ها و تقارن',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'A1',
      pred: 90,
      actual: 105,
      exercises: 30,
      quality: 'excellent',
      desc: 'حل تمرین‌های کتاب و تست‌های تقارن چرخشی و محوری',
    },
    {
      id: 'plan-hist-d2-2',
      offset: -2,
      subjId: 'subj-farsi',
      subjName: 'فارسی',
      unitId: 'subj-farsi-u2',
      unitTitle: 'درس دوم: راه خوشبختی',
      stId: 'st-review',
      stTitle: 'پس‌خوانی',
      priority: 'A2',
      pred: 60,
      actual: 65,
      exercises: 14,
      quality: 'good',
      desc: 'روخوانی و معنی حکایت و املای واژگان مهم درس دوم',
    },
  ];

  for (const item of pastDaysData) {
    const planDate = addDaysISO(todayIso, item.offset);
    insertPlan.run(
      item.id,
      planDate,
      'cat-study',
      'درس',
      1,
      item.subjId,
      item.subjName,
      item.unitId,
      item.unitTitle,
      item.stId,
      item.stTitle,
      item.priority,
      item.pred,
      item.pred,
      item.desc,
      'completed',
      1,
      now,
      now
    );

    insertPerf.run(
      `perf-${item.id}`,
      item.id,
      item.actual,
      item.exercises,
      item.quality,
      'completed',
      'ثبت‌شده در کارنامه هفتگی دانش‌آموز',
      now,
      now
    );
  }
}

function seedSamplePlans() {
  const todayIso = getTodayISO();
  const yesterdayIso = addDaysISO(todayIso, -1);
  const tomorrowIso = addDaysISO(todayIso, 1);
  const now = new Date().toISOString();

  const insertPlan = db.prepare(`
    INSERT INTO daily_plans (
      id, plan_date, category_id, category_title_snapshot, is_study,
      subject_id, subject_name_snapshot, unit_id, unit_title_snapshot,
      study_type_id, study_type_title_snapshot, priority_code,
      initial_predicted_minutes, predicted_minutes, description, status,
      custom_sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPerf = db.prepare(`
    INSERT INTO performance_logs (
      id, plan_id, actual_minutes, exercises_count, learning_quality,
      completion_status, notes, logged_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- TODAY'S PLANS (Matching prompt's exact example: فارسی 90->75, ریاضی 60->80, علوم 45->50, استراحت 20->25 + گوشی) ---
  const todayPlans = [
    {
      id: 'plan-today-1',
      date: todayIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-farsi',
      subjName: 'فارسی',
      unitId: 'subj-farsi-u2',
      unitTitle: 'درس دوم: راه خوشبختی',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'A1',
      pred: 90,
      desc: 'نگارش خودارزیابی و معنی شعر درس دوم به همراه واژه‌نامه',
      status: 'completed',
      order: 1,
      perf: {
        actual: 75,
        exercises: 15,
        quality: 'excellent',
        status: 'completed',
        notes: 'تمام تمرین‌ها و معنی ابیات با دقت کامل انجام شد (۱۵ دقیقه زودتر از پیش‌بینی).',
      },
    },
    {
      id: 'plan-today-2',
      date: todayIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-math',
      subjName: 'ریاضی',
      unitId: 'subj-math-u3',
      unitTitle: 'فصل سوم: چندضلعی‌ها و تقارن',
      stId: 'st-exam',
      stTitle: 'امتحان',
      priority: 'A2',
      pred: 60,
      desc: 'حل تمرین‌های صفحه ۴۵ و نمونه سؤالات امتحانی زاویه‌های داخلی',
      status: 'completed',
      order: 2,
      perf: {
        actual: 80,
        exercises: 24,
        quality: 'good',
        status: 'completed',
        notes: 'تست‌های کتاب کمک‌آموزشی حل شد، مبحث زاویه خارجی کمی بیشتر زمان برد.',
      },
    },
    {
      id: 'plan-today-3',
      date: todayIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-science',
      subjName: 'علوم تجربی',
      unitId: 'subj-science-u2',
      unitTitle: 'فصل دوم: تغییرهای شیمیایی در خدمت زندگی',
      stId: 'st-review',
      stTitle: 'پس‌خوانی',
      priority: 'B1',
      pred: 45,
      desc: 'مرور جزوه تدریس‌شده امروز در مدرسه و واکنش‌های گرماده',
      status: 'partial',
      order: 3,
      perf: {
        actual: 50,
        exercises: 8,
        quality: 'average',
        status: 'partial',
        notes: 'مبحث باتری‌ها خوانده شد اما ۲ صفحه آخر فصل برای مرور فردا باقی ماند.',
      },
    },
    {
      id: 'plan-today-4',
      date: todayIso,
      catId: 'cat-rest',
      catTitle: 'استراحت',
      isStudy: 0,
      subjId: null,
      subjName: null,
      unitId: null,
      unitTitle: null,
      stId: null,
      stTitle: null,
      priority: 'B2',
      pred: 20,
      desc: 'عصرانه و استراحت کوتاه بین مطالعه ریاضی و علوم',
      status: 'completed',
      order: 4,
      perf: {
        actual: 25,
        exercises: null,
        quality: null,
        status: 'completed',
        notes: 'استراحت و صرف میوه با خانواده.',
      },
    },
    {
      id: 'plan-today-5',
      date: todayIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-arabic',
      subjName: 'عربی',
      unitId: 'subj-arabic-u2',
      unitTitle: 'درس دوم: فلسفه احکام و شغل‌ها',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'B3',
      pred: 40,
      desc: 'ترجمه جملات تمرین سوم و چهارم کتاب درسی',
      status: 'pending',
      order: 5,
      perf: null,
    },
    {
      id: 'plan-today-6',
      date: todayIso,
      catId: 'cat-phone',
      catTitle: 'استفاده از گوشی',
      isStudy: 0,
      subjId: null,
      subjName: null,
      unitId: null,
      unitTitle: null,
      stId: null,
      stTitle: null,
      priority: 'C2',
      pred: 30,
      desc: 'بررسی پیام‌های گروه کلاسی و زمان آزاد آخر شب',
      status: 'pending',
      order: 6,
      perf: null,
    },
  ];

  // --- YESTERDAY'S PLANS ---
  const yesterdayPlans = [
    {
      id: 'plan-yest-1',
      date: yesterdayIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-english',
      subjName: 'زبان انگلیسی',
      unitId: 'subj-english-u2',
      unitTitle: 'Lesson 2: My Weekdays',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'A1',
      pred: 50,
      desc: 'تکمیل کتاب کار (Workbook) درس دوم و حفظ مکالمه',
      status: 'completed',
      order: 1,
      perf: {
        actual: 45,
        exercises: 18,
        quality: 'excellent',
        status: 'completed',
        notes: 'مکالمه کامل حفظ شد.',
      },
    },
    {
      id: 'plan-yest-2',
      date: yesterdayIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-social',
      subjName: 'مطالعات اجتماعی',
      unitId: 'subj-social-u2',
      unitTitle: 'درس دوم: خانواده و نقش‌های آن',
      stId: 'st-review',
      stTitle: 'پس‌خوانی',
      priority: 'B1',
      pred: 35,
      desc: 'خلاصه‌نویسی نکات مهم درس دوم',
      status: 'completed',
      order: 2,
      perf: {
        actual: 40,
        exercises: 10,
        quality: 'good',
        status: 'completed',
        notes: 'برگه فعالیت کلاسی تکمیل شد.',
      },
    },
  ];

  // --- TOMORROW'S PLANS (Pre-planned for tomorrow tab demonstration) ---
  const tomorrowPlans = [
    {
      id: 'plan-tom-1',
      date: tomorrowIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-math',
      subjName: 'ریاضی',
      unitId: 'subj-math-u4',
      unitTitle: 'فصل چهارم: جبر و معادله',
      stId: 'st-homework',
      stTitle: 'تکلیف',
      priority: 'A1',
      pred: 75,
      desc: 'حل تمرین‌های ساده‌سازی عبارت‌های جبری و ۲۰ تست تکمیلی',
      status: 'pending',
      order: 1,
      perf: null,
    },
    {
      id: 'plan-tom-2',
      date: tomorrowIso,
      catId: 'cat-study',
      catTitle: 'درس',
      isStudy: 1,
      subjId: 'subj-farsi',
      subjName: 'فارسی',
      unitId: 'subj-farsi-u3',
      unitTitle: 'درس سوم: علم و عمل',
      stId: 'st-review',
      stTitle: 'پس‌خوانی',
      priority: 'A2',
      pred: 45,
      desc: 'پیش‌خوانی و علامت‌گذاری واژه‌های مهم درس سوم برای کلاس فردا',
      status: 'pending',
      order: 2,
      perf: null,
    },
    {
      id: 'plan-tom-3',
      date: tomorrowIso,
      catId: 'cat-sport',
      catTitle: 'ورزش و تحرک',
      isStudy: 0,
      subjId: null,
      subjName: null,
      unitId: null,
      unitTitle: null,
      stId: null,
      stTitle: null,
      priority: 'B2',
      pred: 45,
      desc: 'تمرین نرمش و پیاده‌روی عصرگاهی',
      status: 'pending',
      order: 3,
      perf: null,
    },
  ];

  for (const p of [...yesterdayPlans, ...todayPlans, ...tomorrowPlans]) {
    insertPlan.run(
      p.id,
      p.date,
      p.catId,
      p.catTitle,
      p.isStudy,
      p.subjId,
      p.subjName,
      p.unitId,
      p.unitTitle,
      p.stId,
      p.stTitle,
      p.priority,
      p.pred,
      p.pred,
      p.desc,
      p.status,
      p.order,
      now,
      now
    );

    if (p.perf) {
      insertPerf.run(
        crypto.randomUUID(),
        p.id,
        p.perf.actual,
        p.perf.exercises,
        p.perf.quality,
        p.perf.status,
        p.perf.notes,
        now,
        now
      );
    }
  }
}
