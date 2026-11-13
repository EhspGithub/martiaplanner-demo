/**
 * MartiaPlanner — Full-Stack Express + SQLite Server & GitHub OAuth/Sync Gateway
 * Runs on Port 3000 with Vite middleware in development and static serving in production.
 */
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db, initDatabase, DB_FILE_PATH } from './src/server/db.ts';
import { syncLocalGitAndPushToGitHub } from './src/server/gitLocalRunner.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  getJalaliMonthRange,
} from './src/utils/jalali.ts';
import {
  classifyCategoryActivityGroup,
  calculateWeightedLearningQualityL,
  getLearningQualityDescriptor,
} from './src/utils/analyticsEngine.ts';

dotenv.config();
initDatabase();

const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory store for OAuth tokens received via GitHub OAuth popup flow
let storedGitHubToken: string | null = process.env.GITHUB_TOKEN || null;

// ============================================================================
// 1. BOOTSTRAP & SYSTEM METADATA API
// ============================================================================
app.get('/api/bootstrap', (_req, res) => {
  try {
    const categories = db
      .prepare('SELECT * FROM activity_categories WHERE is_active = 1 ORDER BY sort_order ASC, title ASC')
      .all();
    const studyTypes = db
      .prepare('SELECT * FROM study_activity_types WHERE is_active = 1 ORDER BY sort_order ASC')
      .all();
    const priorities = db
      .prepare('SELECT * FROM priority_levels ORDER BY sort_rank ASC')
      .all();
    const subjectsRaw = db
      .prepare('SELECT * FROM subjects WHERE is_archived = 0 ORDER BY sort_order ASC, name ASC')
      .all() as any[];
    const unitsRaw = db
      .prepare('SELECT * FROM subject_units WHERE is_archived = 0 ORDER BY sort_order ASC')
      .all() as any[];

    const subjects = subjectsRaw.map((s) => ({
      ...s,
      units: unitsRaw.filter((u) => u.subject_id === s.id),
    }));

    res.json({
      categories,
      studyTypes,
      priorities,
      subjects,
      engineInfo: {
        mode: 'sqlite-server',
        databasePath: DB_FILE_PATH,
        version: '1.0.0 (SQLite + Tauri 2 Ready)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در بارگذاری اطلاعات پایه' });
  }
});

// ============================================================================
// 2. SUBJECTS & UNITS CRUD (تعریف درس‌ها و ساختار آموزشی کتاب‌ها)
// ============================================================================
app.post('/api/subjects', (req, res) => {
  try {
    const { name, grade_level = 'هشتم', unit_type_label = 'درس', color_code = 'indigo', initial_units = [] } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام درس الزامی است.' });
    }

    const id = `subj-${crypto.randomUUID().slice(0, 8)}`;
    const maxSort = (db.prepare('SELECT MAX(sort_order) as m FROM subjects').get() as any)?.m || 0;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO subjects (id, name, grade_level, unit_type_label, color_code, sort_order, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, String(name).trim(), grade_level, unit_type_label, color_code, maxSort + 1, now);

    if (Array.isArray(initial_units) && initial_units.length > 0) {
      const insertUnit = db.prepare(`
        INSERT INTO subject_units (id, subject_id, title, sort_order, is_archived)
        VALUES (?, ?, ?, ?, 0)
      `);
      initial_units.forEach((uTitle: string, idx: number) => {
        if (String(uTitle).trim()) {
          insertUnit.run(`${id}-u${idx + 1}-${crypto.randomUUID().slice(0, 4)}`, id, String(uTitle).trim(), idx + 1);
        }
      });
    }

    const created = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as any;
    const units = db.prepare('SELECT * FROM subject_units WHERE subject_id = ? AND is_archived = 0 ORDER BY sort_order ASC').all(id);
    res.json({ ...created, units });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subjects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade_level, unit_type_label, color_code } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام درس نمی‌تواند خالی باشد.' });
    }

    db.prepare(`
      UPDATE subjects
      SET name = ?, grade_level = COALESCE(?, grade_level), unit_type_label = COALESCE(?, unit_type_label), color_code = COALESCE(?, color_code)
      WHERE id = ?
    `).run(String(name).trim(), grade_level, unit_type_label, color_code, id);

    const updated = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as any;
    const units = db.prepare('SELECT * FROM subject_units WHERE subject_id = ? AND is_archived = 0 ORDER BY sort_order ASC').all(id);
    res.json({ ...updated, units });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subjects/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Soft-archive so historical daily_plans keep their snapshots and integrity
    db.prepare('UPDATE subjects SET is_archived = 1 WHERE id = ?').run(id);
    db.prepare('UPDATE subject_units SET is_archived = 1 WHERE subject_id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects/:id/units', (req, res) => {
  try {
    const { id: subject_id } = req.params;
    const { title } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان فصل یا درس الزامی است.' });
    }

    const maxSort = (
      db.prepare('SELECT MAX(sort_order) as m FROM subject_units WHERE subject_id = ?').get(subject_id) as any
    )?.m || 0;
    const unitId = `unit-${crypto.randomUUID().slice(0, 8)}`;

    db.prepare(`
      INSERT INTO subject_units (id, subject_id, title, sort_order, is_archived)
      VALUES (?, ?, ?, ?, 0)
    `).run(unitId, subject_id, String(title).trim(), maxSort + 1);

    const unit = db.prepare('SELECT * FROM subject_units WHERE id = ?').get(unitId);
    res.json(unit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/units/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, sort_order } = req.body;

    if (title !== undefined) {
      db.prepare('UPDATE subject_units SET title = ? WHERE id = ?').run(String(title).trim(), id);
    }
    if (sort_order !== undefined) {
      db.prepare('UPDATE subject_units SET sort_order = ? WHERE id = ?').run(Number(sort_order), id);
    }

    const updated = db.prepare('SELECT * FROM subject_units WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects/:id/units/reorder', (req, res) => {
  try {
    const { unitIds } = req.body;
    if (Array.isArray(unitIds)) {
      const stmt = db.prepare('UPDATE subject_units SET sort_order = ? WHERE id = ?');
      const tx = db.transaction((ids: string[]) => {
        ids.forEach((uId, idx) => stmt.run(idx + 1, uId));
      });
      tx(unitIds);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/units/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE subject_units SET is_archived = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. DAILY & WEEKLY PLANS CRUD (برنامه‌ریزی امروز، فردا و هفتگی)
// ============================================================================
function hydratePlansWithPerformance(rows: any[]) {
  if (rows.length === 0) return [];
  const planIds = rows.map((r) => r.id);
  const placeholders = planIds.map(() => '?').join(',');
  const perfs = db
    .prepare(`SELECT * FROM performance_logs WHERE plan_id IN (${placeholders})`)
    .all(...planIds) as any[];
  const perfMap = new Map(perfs.map((p) => [p.plan_id, p]));

  const priorities = db.prepare('SELECT code, sort_rank FROM priority_levels').all() as any[];
  const prioRankMap = new Map(priorities.map((p) => [p.code, p.sort_rank]));

  return rows.map((r) => ({
    ...r,
    priority_rank: prioRankMap.get(r.priority_code) ?? 99,
    performance: perfMap.get(r.id) || null,
  }));
}

app.get('/api/plans', (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    let rows: any[] = [];

    if (date) {
      rows = db
        .prepare('SELECT * FROM daily_plans WHERE plan_date = ? ORDER BY custom_sort_order ASC, created_at ASC')
        .all(String(date));
    } else if (startDate && endDate) {
      rows = db
        .prepare(
          'SELECT * FROM daily_plans WHERE plan_date >= ? AND plan_date <= ? ORDER BY plan_date ASC, custom_sort_order ASC'
        )
        .all(String(startDate), String(endDate));
    } else {
      rows = db
        .prepare('SELECT * FROM daily_plans ORDER BY plan_date DESC, custom_sort_order ASC LIMIT 200')
        .all();
    }

    res.json(hydratePlansWithPerformance(rows));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plans', (req, res) => {
  try {
    const {
      plan_date,
      category_id,
      subject_id,
      unit_id,
      study_type_id,
      priority_code = 'A1',
      predicted_minutes,
      target_exercises = null,
      reminder_time = null,
      description = '',
    } = req.body;

    if (!plan_date || !category_id) {
      return res.status(400).json({ error: 'تاریخ و عنوان فعالیت الزامی هستند.' });
    }

    const predMins = Number(predicted_minutes);
    if (!predMins || predMins <= 0 || predMins > 720) {
      return res.status(400).json({ error: 'زمان پیش‌بینی‌شده باید عددی معتبر بین ۱ تا ۷۲۰ دقیقه باشد.' });
    }

    const category = db
      .prepare('SELECT * FROM activity_categories WHERE id = ?')
      .get(category_id) as any;
    if (!category) {
      return res.status(400).json({ error: 'عنوان فعالیت انتخاب‌شده معتبر نیست.' });
    }

    const isStudy = Number(category.is_study) === 1 ? 1 : 0;
    const activityGroupSnapshot = classifyCategoryActivityGroup(category);
    let subjectNameSnapshot: string | null = null;
    let unitTitleSnapshot: string | null = null;
    let studyTypeTitleSnapshot: string | null = null;

    if (isStudy === 1) {
      if (!subject_id || !unit_id || !study_type_id) {
        return res.status(400).json({
          error: 'برای فعالیت‌های درسی، انتخاب «نام درس»، «فصل / درس» و «نوع فعالیت درسی» الزامی است.',
        });
      }
      const subj = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject_id) as any;
      const unit = db.prepare('SELECT * FROM subject_units WHERE id = ?').get(unit_id) as any;
      const stType = db.prepare('SELECT * FROM study_activity_types WHERE id = ?').get(study_type_id) as any;

      subjectNameSnapshot = subj ? subj.name : 'درس';
      unitTitleSnapshot = unit ? unit.title : '';
      studyTypeTitleSnapshot = stType ? stType.title : '';
    }

    const parsedTargetExercises =
      isStudy === 1 && target_exercises !== null && target_exercises !== undefined && target_exercises !== ''
        ? Math.max(0, Number(target_exercises))
        : null;

    const maxOrder = (
      db.prepare('SELECT MAX(custom_sort_order) as m FROM daily_plans WHERE plan_date = ?').get(plan_date) as any
    )?.m || 0;

    const id = `plan-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO daily_plans (
        id, plan_date, category_id, category_title_snapshot, is_study, activity_group_snapshot,
        subject_id, subject_name_snapshot, unit_id, unit_title_snapshot,
        study_type_id, study_type_title_snapshot, priority_code,
        initial_predicted_minutes, predicted_minutes, target_exercises, reminder_time, description, status,
        custom_sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      id,
      plan_date,
      category_id,
      category.title,
      isStudy,
      activityGroupSnapshot,
      isStudy ? subject_id : null,
      subjectNameSnapshot,
      isStudy ? unit_id : null,
      unitTitleSnapshot,
      isStudy ? study_type_id : null,
      studyTypeTitleSnapshot,
      priority_code,
      predMins,
      predMins,
      parsedTargetExercises,
      reminder_time ? String(reminder_time).trim() : null,
      String(description || '').trim(),
      maxOrder + 1,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(id);
    res.json(hydratePlansWithPerformance([created])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plans/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'فعالیت موردنظر یافت نشد.' });
    }

    const {
      category_id = existing.category_id,
      subject_id,
      unit_id,
      study_type_id,
      priority_code = existing.priority_code,
      predicted_minutes = existing.predicted_minutes,
      target_exercises,
      reminder_time,
      description = existing.description,
    } = req.body;

    const predMins = Number(predicted_minutes);
    if (!predMins || predMins <= 0 || predMins > 720) {
      return res.status(400).json({ error: 'زمان پیش‌بینی‌شده باید بین ۱ تا ۷۲۰ دقیقه باشد.' });
    }

    const category = db.prepare('SELECT * FROM activity_categories WHERE id = ?').get(category_id) as any;
    const isStudy = category ? (Number(category.is_study) === 1 ? 1 : 0) : existing.is_study;
    const categoryTitleSnapshot = category ? category.title : existing.category_title_snapshot;
    const activityGroupSnapshot = category
      ? classifyCategoryActivityGroup(category)
      : existing.activity_group_snapshot;

    let subjectNameSnapshot: string | null = null;
    let unitTitleSnapshot: string | null = null;
    let studyTypeTitleSnapshot: string | null = null;

    if (isStudy === 1) {
      const finalSubjId = subject_id ?? existing.subject_id;
      const finalUnitId = unit_id ?? existing.unit_id;
      const finalStId = study_type_id ?? existing.study_type_id;

      const subj = db.prepare('SELECT * FROM subjects WHERE id = ?').get(finalSubjId) as any;
      const unit = db.prepare('SELECT * FROM subject_units WHERE id = ?').get(finalUnitId) as any;
      const stType = db.prepare('SELECT * FROM study_activity_types WHERE id = ?').get(finalStId) as any;

      subjectNameSnapshot = subj ? subj.name : existing.subject_name_snapshot;
      unitTitleSnapshot = unit ? unit.title : existing.unit_title_snapshot;
      studyTypeTitleSnapshot = stType ? stType.title : existing.study_type_title_snapshot;
    }

    const now = new Date().toISOString();

    const existingPerf = db.prepare('SELECT * FROM performance_logs WHERE plan_id = ?').get(id);
    let newPredictedMinutes = predMins;
    let newInitialPredictedMinutes = existing.initial_predicted_minutes;

    if (existingPerf) {
      if (predMins !== existing.predicted_minutes) {
        db.prepare(`
          INSERT INTO plan_history_audit (id, plan_id, previous_predicted_minutes, new_predicted_minutes, changed_at, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          id,
          existing.predicted_minutes,
          predMins,
          now,
          'تلاش برای ویرایش زمان پیش‌بینی‌شده پس از ثبت عملکرد (زمان اولیه جهت حفظ صحت تحلیل‌ها ثابت نگه داشته شد)'
        );
      }
      newPredictedMinutes = existing.predicted_minutes;
    } else {
      newInitialPredictedMinutes = predMins;
    }

    const finalTargetExercises =
      isStudy === 0
        ? null
        : target_exercises === undefined
        ? existing.target_exercises
        : target_exercises === null || target_exercises === ''
        ? null
        : Math.max(0, Number(target_exercises));

    const finalReminderTime =
      reminder_time === undefined
        ? existing.reminder_time
        : reminder_time
        ? String(reminder_time).trim()
        : null;

    db.prepare(`
      UPDATE daily_plans
      SET category_id = ?,
          category_title_snapshot = ?,
          is_study = ?,
          activity_group_snapshot = ?,
          subject_id = ?,
          subject_name_snapshot = ?,
          unit_id = ?,
          unit_title_snapshot = ?,
          study_type_id = ?,
          study_type_title_snapshot = ?,
          priority_code = ?,
          initial_predicted_minutes = ?,
          predicted_minutes = ?,
          target_exercises = ?,
          reminder_time = ?,
          description = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      category_id,
      categoryTitleSnapshot,
      isStudy,
      activityGroupSnapshot,
      isStudy ? (subject_id ?? existing.subject_id) : null,
      subjectNameSnapshot,
      isStudy ? (unit_id ?? existing.unit_id) : null,
      unitTitleSnapshot,
      isStudy ? (study_type_id ?? existing.study_type_id) : null,
      studyTypeTitleSnapshot,
      priority_code,
      newInitialPredictedMinutes,
      newPredictedMinutes,
      finalTargetExercises,
      finalReminderTime,
      String(description || '').trim(),
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(id);
    res.json(hydratePlansWithPerformance([updated])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plans/reorder', (req, res) => {
  try {
    const { planIds } = req.body;
    if (Array.isArray(planIds)) {
      const stmt = db.prepare('UPDATE daily_plans SET custom_sort_order = ? WHERE id = ?');
      const tx = db.transaction((ids: string[]) => {
        ids.forEach((pId, idx) => stmt.run(idx + 1, pId));
      });
      tx(planIds);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plans/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM daily_plans WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. PERFORMANCE LOGGING API (ثبت عملکرد واقعی دانش‌آموز)
// ============================================================================
app.post('/api/plans/:id/performance', (req, res) => {
  try {
    const { id: plan_id } = req.params;
    const plan = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(plan_id) as any;
    if (!plan) {
      return res.status(404).json({ error: 'فعالیت موردنظر یافت نشد.' });
    }

    const {
      actual_minutes,
      exercises_count,
      learning_quality,
      completion_status = 'completed',
      notes = '',
    } = req.body;

    const actualMins = Number(actual_minutes);
    if (isNaN(actualMins) || actualMins < 0 || actualMins > 720) {
      return res.status(400).json({ error: 'مدت زمان واقعی باید عددی معتبر بین ۰ تا ۷۲۰ دقیقه باشد.' });
    }

    let exercisesVal: number | null = null;
    let qualityVal: string | null = null;

    if (Number(plan.is_study) === 1) {
      // Must allow 0 exercises
      exercisesVal = exercises_count !== undefined && exercises_count !== null && exercises_count !== ''
        ? Math.max(0, Number(exercises_count))
        : 0;
      qualityVal =
        learning_quality !== undefined && learning_quality !== null && String(learning_quality).trim() !== ''
          ? String(learning_quality).trim()
          : null;
    }

    const validStatus = completion_status === 'partial' ? 'partial' : 'completed';
    const now = new Date().toISOString();

    const existingPerf = db
      .prepare('SELECT * FROM performance_logs WHERE plan_id = ?')
      .get(plan_id) as any;

    if (existingPerf) {
      db.prepare(`
        UPDATE performance_logs
        SET actual_minutes = ?,
            exercises_count = ?,
            learning_quality = ?,
            completion_status = ?,
            notes = ?,
            updated_at = ?
        WHERE plan_id = ?
      `).run(actualMins, exercisesVal, qualityVal, validStatus, String(notes || '').trim(), now, plan_id);
    } else {
      db.prepare(`
        INSERT INTO performance_logs (
          id, plan_id, actual_minutes, exercises_count, learning_quality,
          completion_status, notes, logged_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `perf-${crypto.randomUUID().slice(0, 8)}`,
        plan_id,
        actualMins,
        exercisesVal,
        qualityVal,
        validStatus,
        String(notes || '').trim(),
        now,
        now
      );
    }

    db.prepare('UPDATE daily_plans SET status = ?, updated_at = ? WHERE id = ?').run(
      validStatus,
      now,
      plan_id
    );

    const updatedPlan = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(plan_id);
    res.json(hydratePlansWithPerformance([updatedPlan])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plans/:id/performance', (req, res) => {
  try {
    const { id: plan_id } = req.params;
    const now = new Date().toISOString();
    db.prepare('DELETE FROM performance_logs WHERE plan_id = ?').run(plan_id);
    db.prepare("UPDATE daily_plans SET status = 'pending', updated_at = ? WHERE id = ?").run(now, plan_id);
    const updatedPlan = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(plan_id);
    res.json(hydratePlansWithPerformance([updatedPlan])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5. DASHBOARD ANALYTICS API (داشبورد و شاخص‌های ۱۰گانه عملکرد)
// ============================================================================
app.get('/api/dashboard', (req, res) => {
  try {
    const range = (req.query.range as 'today' | 'week' | 'month') || 'today';
    const refDate = (req.query.date as string) || getTodayISO();

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

    const rawPlans = db
      .prepare('SELECT * FROM daily_plans WHERE plan_date >= ? AND plan_date <= ?')
      .all(startDate, endDate) as any[];

    const plans = hydratePlansWithPerformance(rawPlans);
    const studyPlans = plans.filter((p) => Number(p.is_study) === 1);

    let totalPredictedStudyMinutes = 0;
    let totalActualStudyMinutes = 0;
    let totalExercisesSolved = 0;

    const totalPlannedActivities = plans.length;
    let completedActivitiesCount = 0;
    let partialActivitiesCount = 0;
    let pendingActivitiesCount = 0;

    let nonStudyActualMinutes = 0;
    let nonStudyPredictedMinutes = 0;

    const subjectMap = new Map<
      string,
      {
        subjectName: string;
        predictedMinutes: number;
        actualMinutes: number;
        exercisesCount: number;
        completedCount: number;
        totalCount: number;
      }
    >();

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

        const subjKey = p.subject_name_snapshot || 'سایر دروس';
        const curr = subjectMap.get(subjKey) || {
          subjectName: subjKey,
          predictedMinutes: 0,
          actualMinutes: 0,
          exercisesCount: 0,
          completedCount: 0,
          totalCount: 0,
        };
        curr.predictedMinutes += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
        curr.actualMinutes += Number(p.performance?.actual_minutes || 0);
        curr.exercisesCount += Number(p.performance?.exercises_count || 0);
        curr.totalCount += 1;
        if (p.status === 'completed') curr.completedCount += 1;
        subjectMap.set(subjKey, curr);
      } else {
        nonStudyPredictedMinutes += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
        if (p.performance) {
          nonStudyActualMinutes += Number(p.performance.actual_minutes || 0);
        }
      }
    }

    const studyTimeVarianceMinutes = totalActualStudyMinutes - totalPredictedStudyMinutes;
    const qualityEval = calculateWeightedLearningQualityL(studyPlans as any[]);
    const averageLearningQualityScore = qualityEval.weightedAverage0To10;

    // Adherence calculation: Completed counts 100%, Partial counts 50%
    const adherencePercentage =
      totalPlannedActivities > 0
        ? Math.round(
            ((completedActivitiesCount + partialActivitiesCount * 0.5) / totalPlannedActivities) * 100
          )
        : 0;

    res.json({
      range,
      startDate,
      endDate,
      totalPredictedStudyMinutes,
      totalActualStudyMinutes,
      studyTimeVarianceMinutes,
      totalExercisesSolved,
      averageLearningQualityScore,
      averageLearningQualityLabel: getLearningQualityDescriptor(averageLearningQualityScore),
      totalPlannedActivities,
      completedActivitiesCount,
      partialActivitiesCount,
      pendingActivitiesCount,
      incompleteOrPendingCount: partialActivitiesCount + pendingActivitiesCount,
      adherencePercentage,
      nonStudyActualMinutes,
      nonStudyPredictedMinutes,
      subjectBreakdown: Array.from(subjectMap.values()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5.5 DAILY NUMERIC STUDY GOALS API (اهداف عددی روزانه دانش‌آموز)
// ============================================================================
app.get('/api/goals', (req, res) => {
  try {
    const goalDate = String(req.query.date || getTodayISO());
    const row = db
      .prepare('SELECT * FROM daily_study_goals WHERE goal_date = ?')
      .get(goalDate) as any;

    if (!row) {
      return res.json({
        goal_date: goalDate,
        target_study_minutes: 210, // Default: 3.5 hours (210 mins)
        target_exercises_count: 50, // Default: 50 exercises/tests
        target_completed_tasks: 3, // Default: 3 study lessons
        custom_goals: [
          {
            id: 'cgoal-vocab',
            title: 'حفظ لغات جدید (زبان و عربی)',
            unitLabel: 'لغت',
            targetValue: 15,
            currentValue: 12,
            color: 'purple',
          },
        ],
        updated_at: new Date().toISOString(),
      });
    }

    let customGoals = [];
    try {
      customGoals = JSON.parse(row.custom_goals_json || '[]');
    } catch {
      customGoals = [];
    }

    res.json({
      goal_date: row.goal_date,
      target_study_minutes: Number(row.target_study_minutes || 210),
      target_exercises_count: Number(row.target_exercises_count || 50),
      target_completed_tasks: Number(row.target_completed_tasks || 3),
      custom_goals: customGoals,
      updated_at: row.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', (req, res) => {
  try {
    const {
      goal_date = getTodayISO(),
      target_study_minutes = 210,
      target_exercises_count = 50,
      target_completed_tasks = 3,
      custom_goals = [],
    } = req.body;

    const now = new Date().toISOString();
    const customGoalsStr = JSON.stringify(Array.isArray(custom_goals) ? custom_goals : []);

    db.prepare(`
      INSERT INTO daily_study_goals (
        goal_date, target_study_minutes, target_exercises_count, target_completed_tasks, custom_goals_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(goal_date) DO UPDATE SET
        target_study_minutes = excluded.target_study_minutes,
        target_exercises_count = excluded.target_exercises_count,
        target_completed_tasks = excluded.target_completed_tasks,
        custom_goals_json = excluded.custom_goals_json,
        updated_at = excluded.updated_at
    `).run(
      String(goal_date),
      Math.max(10, Number(target_study_minutes)),
      Math.max(1, Number(target_exercises_count)),
      Math.max(1, Number(target_completed_tasks)),
      customGoalsStr,
      now
    );

    res.json({
      goal_date: String(goal_date),
      target_study_minutes: Math.max(10, Number(target_study_minutes)),
      target_exercises_count: Math.max(1, Number(target_exercises_count)),
      target_completed_tasks: Math.max(1, Number(target_completed_tasks)),
      custom_goals: Array.isArray(custom_goals) ? custom_goals : [],
      updated_at: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5.6 DAILY TIME BUDGET API (ظرف زمانی روزانه - بخش نهم)
// ============================================================================
app.get('/api/time-budgets', (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    if (startDate && endDate) {
      const rows = db
        .prepare('SELECT * FROM daily_time_budgets WHERE plan_date >= ? AND plan_date <= ? ORDER BY plan_date ASC')
        .all(String(startDate), String(endDate)) as any[];
      return res.json(rows);
    }

    const planDate = String(date || getTodayISO());
    const row = db
      .prepare('SELECT * FROM daily_time_budgets WHERE plan_date = ?')
      .get(planDate) as any;

    if (!row) {
      return res.json({
        plan_date: planDate,
        budget_minutes: null,
        input_unit: 'hours',
        updated_at: new Date().toISOString(),
      });
    }

    res.json({
      plan_date: row.plan_date,
      budget_minutes: row.budget_minutes !== null ? Number(row.budget_minutes) : null,
      input_unit: row.input_unit || 'hours',
      updated_at: row.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/time-budgets', (req, res) => {
  try {
    const {
      plan_date = getTodayISO(),
      budget_minutes = null,
      input_unit = 'hours',
    } = req.body;

    const now = new Date().toISOString();
    const parsedMinutes =
      budget_minutes === null || budget_minutes === '' || Number(budget_minutes) <= 0
        ? null
        : Math.min(1440, Math.max(15, Math.round(Number(budget_minutes))));
    const validUnit = input_unit === 'minutes' ? 'minutes' : 'hours';

    db.prepare(`
      INSERT INTO daily_time_budgets (plan_date, budget_minutes, input_unit, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(plan_date) DO UPDATE SET
        budget_minutes = excluded.budget_minutes,
        input_unit = excluded.input_unit,
        updated_at = excluded.updated_at
    `).run(String(plan_date), parsedMinutes, validUnit, now);

    res.json({
      plan_date: String(plan_date),
      budget_minutes: parsedMinutes,
      input_unit: validUnit,
      updated_at: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 6. SETTINGS MANAGEMENT API (مدیریت عنوان فعالیت‌ها، انواع فعالیت درسی، اولویت‌ها، پشتیبان‌گیری)
// ============================================================================
app.post('/api/settings/categories', (req, res) => {
  try {
    const {
      title,
      is_study = 0,
      activity_group,
      impact_weight = 1.0,
      icon = 'Sparkles',
      color = 'slate',
    } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان فعالیت الزامی است.' });
    }
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const isStudyNum = is_study ? 1 : 0;
    const groupVal = isStudyNum === 1
      ? 'educational'
      : activity_group === 'restricted' || activity_group === 'essential'
      ? activity_group
      : classifyCategoryActivityGroup({ id, title: String(title).trim(), is_study: isStudyNum });
    const maxSort = (db.prepare('SELECT MAX(sort_order) as m FROM activity_categories').get() as any)?.m || 0;
    db.prepare(`
      INSERT INTO activity_categories (id, title, is_study, activity_group, impact_weight, icon, color, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, String(title).trim(), isStudyNum, groupVal, Number(impact_weight || 1.0), icon, color, maxSort + 1);
    res.json(db.prepare('SELECT * FROM activity_categories WHERE id = ?').get(id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, is_study, activity_group, impact_weight, color } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان فعالیت نمی‌تواند خالی باشد.' });
    }
    const finalGroup =
      is_study === 1
        ? 'educational'
        : activity_group === 'educational' || activity_group === 'restricted' || activity_group === 'essential'
        ? activity_group
        : null;
    db.prepare(`
      UPDATE activity_categories
      SET title = ?,
          is_study = COALESCE(?, is_study),
          activity_group = COALESCE(?, activity_group),
          impact_weight = COALESCE(?, impact_weight),
          color = COALESCE(?, color)
      WHERE id = ?
    `).run(
      String(title).trim(),
      is_study !== undefined ? (is_study ? 1 : 0) : null,
      finalGroup,
      impact_weight !== undefined ? Number(impact_weight) : null,
      color,
      id
    );
    res.json(db.prepare('SELECT * FROM activity_categories WHERE id = ?').get(id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'cat-study') {
      return res.status(400).json({ error: 'عنوان اصلی «درس» سیستمی است و قابل حذف نیست.' });
    }
    db.prepare('UPDATE activity_categories SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/study-types', (req, res) => {
  try {
    const { title, description = '', badge_color = 'indigo' } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان نوع فعالیت درسی الزامی است.' });
    }
    const id = `st-${crypto.randomUUID().slice(0, 8)}`;
    const maxSort = (db.prepare('SELECT MAX(sort_order) as m FROM study_activity_types').get() as any)?.m || 0;
    db.prepare(`
      INSERT INTO study_activity_types (id, title, description, badge_color, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, String(title).trim(), String(description).trim(), badge_color, maxSort + 1);
    res.json(db.prepare('SELECT * FROM study_activity_types WHERE id = ?').get(id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/study-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, badge_color } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان نوع فعالیت درسی الزامی است.' });
    }
    db.prepare(`
      UPDATE study_activity_types
      SET title = ?, description = COALESCE(?, description), badge_color = COALESCE(?, badge_color)
      WHERE id = ?
    `).run(String(title).trim(), description, badge_color, id);
    res.json(db.prepare('SELECT * FROM study_activity_types WHERE id = ?').get(id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/study-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE study_activity_types SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/priorities/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { label, color_code } = req.body;
    db.prepare(`
      UPDATE priority_levels
      SET label = COALESCE(?, label), color_code = COALESCE(?, color_code)
      WHERE code = ?
    `).run(label, color_code, code);
    res.json(db.prepare('SELECT * FROM priority_levels WHERE code = ?').get(code));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full Database Backup & Restore
app.get('/api/backup/export', (_req, res) => {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      app: 'MartiaPlanner',
      version: '1.0.0',
      activity_categories: db.prepare('SELECT * FROM activity_categories').all(),
      study_activity_types: db.prepare('SELECT * FROM study_activity_types').all(),
      priority_levels: db.prepare('SELECT * FROM priority_levels').all(),
      subjects: db.prepare('SELECT * FROM subjects').all(),
      subject_units: db.prepare('SELECT * FROM subject_units').all(),
      daily_plans: db.prepare('SELECT * FROM daily_plans').all(),
      performance_logs: db.prepare('SELECT * FROM performance_logs').all(),
      plan_history_audit: db.prepare('SELECT * FROM plan_history_audit').all(),
    };
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/import', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || payload.app !== 'MartiaPlanner' || !Array.isArray(payload.daily_plans)) {
      return res.status(400).json({ error: 'فایل پشتیبان معتبر نیست.' });
    }

    const restoreTx = db.transaction(() => {
      db.prepare('DELETE FROM performance_logs').run();
      db.prepare('DELETE FROM plan_history_audit').run();
      db.prepare('DELETE FROM daily_plans').run();
      db.prepare('DELETE FROM subject_units').run();
      db.prepare('DELETE FROM subjects').run();

      for (const s of payload.subjects || []) {
        db.prepare(`
          INSERT OR REPLACE INTO subjects (id, name, grade_level, unit_type_label, color_code, sort_order, is_archived, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(s.id, s.name, s.grade_level, s.unit_type_label, s.color_code, s.sort_order, s.is_archived, s.created_at);
      }

      for (const u of payload.subject_units || []) {
        db.prepare(`
          INSERT OR REPLACE INTO subject_units (id, subject_id, title, sort_order, is_archived)
          VALUES (?, ?, ?, ?, ?)
        `).run(u.id, u.subject_id, u.title, u.sort_order, u.is_archived);
      }

      for (const p of payload.daily_plans || []) {
        db.prepare(`
          INSERT OR REPLACE INTO daily_plans (
            id, plan_date, category_id, category_title_snapshot, is_study,
            subject_id, subject_name_snapshot, unit_id, unit_title_snapshot,
            study_type_id, study_type_title_snapshot, priority_code,
            initial_predicted_minutes, predicted_minutes, description, status,
            custom_sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          p.id,
          p.plan_date,
          p.category_id,
          p.category_title_snapshot,
          p.is_study,
          p.subject_id,
          p.subject_name_snapshot,
          p.unit_id,
          p.unit_title_snapshot,
          p.study_type_id,
          p.study_type_title_snapshot,
          p.priority_code,
          p.initial_predicted_minutes,
          p.predicted_minutes,
          p.description,
          p.status,
          p.custom_sort_order,
          p.created_at,
          p.updated_at
        );
      }

      for (const perf of payload.performance_logs || []) {
        db.prepare(`
          INSERT OR REPLACE INTO performance_logs (
            id, plan_id, actual_minutes, exercises_count, learning_quality,
            completion_status, notes, logged_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          perf.id,
          perf.plan_id,
          perf.actual_minutes,
          perf.exercises_count,
          perf.learning_quality,
          perf.completion_status,
          perf.notes,
          perf.logged_at,
          perf.updated_at
        );
      }
    });

    restoreTx();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 7. GITHUB OAUTH & DIRECT REPOSITORY PUSH (مخزن MartiaPlanner)
// ============================================================================
app.get('/api/github/status', (_req, res) => {
  res.json({
    oauthConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    hasStoredToken: Boolean(storedGitHubToken),
    defaultRepo: process.env.GITHUB_REPO || 'MartiaPlanner',
    appUrl: process.env.APP_URL || '',
  });
});

app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({
      error:
        'متغیر GITHUB_CLIENT_ID در بخش Secrets تنظیم نشده است. می‌توانید از روش سریع «توکن دسترسی شخصی (PAT)» استفاده کنید یا Client ID را تنظیم نمایید.',
    });
  }

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo user',
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

const githubCallbackHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send('پارامترهای OAuth گیت‌هاب ناقص است.');
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (tokenData.access_token) {
      storedGitHubToken = tokenData.access_token;
    }

    res.send(`
      <!doctype html>
      <html lang="fa" dir="rtl">
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'github' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>احراز هویت گیت‌هاب با موفقیت انجام شد. این پنجره به صورت خودکار بسته می‌شود.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`خطا در اتصال به گیت‌هاب: ${err.message}`);
  }
};

app.get(['/auth/github/callback', '/auth/github/callback/'], githubCallbackHandler);

app.post('/api/github/push', async (req, res) => {
  try {
    const { token, repoName = 'MartiaPlanner', version, commitMessage, isPrivate = false } = req.body;
    const finalToken = (token && String(token).trim()) || storedGitHubToken;

    if (!finalToken) {
      return res.status(400).json({
        error:
          'لطفاً ابتدا از طریق دکمه OAuth گیت‌هاب متصل شوید یا یک Personal Access Token (دارای دسترسی repo) وارد نمایید.',
      });
    }

    const result = await syncLocalGitAndPushToGitHub({
      token: finalToken,
      repoName: String(repoName || 'MartiaPlanner').trim(),
      version: version ? String(version).trim() : undefined,
      commitMessage:
        commitMessage ||
        'feat: update MartiaPlanner student planner app (Tauri 2 + React + SQLite)',
      isPrivate: Boolean(isPrivate),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در پوش کردن پروژه به گیت‌هاب' });
  }
});

// ============================================================================
// 8. VITE DEV MIDDLEWARE / PRODUCTION STATIC SERVER
// ============================================================================
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MartiaPlanner Full-Stack SQLite Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
