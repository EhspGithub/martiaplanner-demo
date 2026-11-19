/**
 * Unified Data Access Layer for MartiaPlanner
 * Automatically connects to the SQLite backend server when running in Web/Full-Stack mode,
 * and seamlessly falls back to the built-in Local SQLite Engine when running as a
 * standalone Tauri 2 Desktop (Windows) or Mobile (Android) app or Single-File Portable HTML.
 *
 * Includes intelligent in-flight request deduplication, range-aware plan caching,
 * and automatic cache invalidation on all mutations for instantaneous tab/filter switching.
 */
import type {
  AppBootstrapData,
  DailyPlanItem,
  DashboardMetrics,
  Subject,
  SubjectUnit,
  ActivityCategory,
  ActivityGroupType,
  StudyActivityType,
  PriorityLevel,
  DailyStudyGoalConfig,
  DailyTimeBudgetConfig,
} from '../types.ts';
import { localSQLiteFallback } from './localSqliteFallback.ts';
import {
  getAnalyticsCoefficients,
  saveAnalyticsCoefficients,
} from '../utils/analyticsCoefficients.ts';
import { firebaseCloudSync } from './firebaseCloudSync.ts';
import { safeGetItem, safeSetItem } from '../utils/safeStorage.ts';

function assertWriteAllowed() {
  if (firebaseCloudSync.isReadOnlyObserver()) {
    throw new Error(
      'حالت ناظر فقط‌خواندنی (والدین) فعال است و امکان تغییر یا حذف اطلاعات وجود ندارد.'
    );
  }
}

let serverAvailable: boolean | null = null;

// ============================================================================
// REACTIVE CACHE & IN-FLIGHT DEDUPLICATION LAYER
// ============================================================================
let cachedBootstrap: AppBootstrapData | null = null;
let cachedAllTimePlans: DailyPlanItem[] | null = null;
let allTimePlansPromise: Promise<DailyPlanItem[]> | null = null;

const plansRangeCache = new Map<string, DailyPlanItem[]>();
const plansByDateCache = new Map<string, DailyPlanItem[]>();
const budgetsRangeCache = new Map<string, DailyTimeBudgetConfig[]>();
const budgetByDateCache = new Map<string, DailyTimeBudgetConfig>();
const goalsRangeCache = new Map<string, DailyStudyGoalConfig[]>();
const goalByDateCache = new Map<string, DailyStudyGoalConfig>();
const dashboardMetricsCache = new Map<string, DashboardMetrics>();
const inFlightRequests = new Map<string, Promise<any>>();

export function invalidateApiCache(
  scope: 'all' | 'plans' | 'bootstrap' | 'budgets' | 'goals' = 'all',
  skipCloudPush = false
) {
  if (scope === 'all' || scope === 'bootstrap') {
    cachedBootstrap = null;
  }
  if (scope === 'all' || scope === 'plans') {
    cachedAllTimePlans = null;
    allTimePlansPromise = null;
    plansRangeCache.clear();
    plansByDateCache.clear();
    dashboardMetricsCache.clear();
  }
  if (scope === 'all' || scope === 'budgets') {
    budgetsRangeCache.clear();
    budgetByDateCache.clear();
  }
  if (scope === 'all' || scope === 'goals') {
    goalsRangeCache.clear();
    goalByDateCache.clear();
  }
  if (!skipCloudPush) {
    firebaseCloudSync.notifyLocalMutation();
  }
}

function deduplicateRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;
  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

function slicePlansByDate(allPlans: DailyPlanItem[], date: string): DailyPlanItem[] {
  return allPlans
    .filter((p) => p.plan_date === date)
    .sort((a, b) => a.custom_sort_order - b.custom_sort_order);
}

function slicePlansByRange(
  allPlans: DailyPlanItem[],
  startDate: string,
  endDate: string
): DailyPlanItem[] {
  return allPlans
    .filter((p) => p.plan_date >= startDate && p.plan_date <= endDate)
    .sort(
      (a, b) =>
        a.plan_date.localeCompare(b.plan_date) || a.custom_sort_order - b.custom_sort_order
    );
}

async function request<T>(
  path: string,
  options: RequestInit | undefined,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  // When opened directly via file://, content://, or Single-File Portable HTML, use local engine immediately
  if (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' ||
      window.location.protocol === 'content:' ||
      Boolean((window as any).__MARTIA_SINGLEFILE_MODE__))
  ) {
    serverAvailable = false;
    return await fallbackFn();
  }

  if (serverAvailable === false) {
    return await fallbackFn();
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      serverAvailable = false;
      return await fallbackFn();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در اجرای درخواست');
    }
    serverAvailable = true;
    return data as T;
  } catch (err: any) {
    if (
      err instanceof TypeError ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError')
    ) {
      serverAvailable = false;
      return await fallbackFn();
    }
    throw err;
  }
}

export const api = {
  invalidateCache: invalidateApiCache,

  getBootstrap(): Promise<AppBootstrapData> {
    if (cachedBootstrap) return Promise.resolve(cachedBootstrap);
    return deduplicateRequest('bootstrap', async () => {
      const data = await request('/api/bootstrap', undefined, () =>
        localSQLiteFallback.getBootstrap()
      );
      cachedBootstrap = data;
      return data;
    });
  },

  getPlansByDate(date: string): Promise<DailyPlanItem[]> {
    if (cachedAllTimePlans) {
      return Promise.resolve(slicePlansByDate(cachedAllTimePlans, date));
    }
    const cached = plansByDateCache.get(date);
    if (cached) return Promise.resolve(cached);
    if (allTimePlansPromise) {
      return allTimePlansPromise.then((all) => slicePlansByDate(all, date));
    }

    return deduplicateRequest(`plans:date:${date}`, async () => {
      const rows = await request(
        `/api/plans?date=${encodeURIComponent(date)}`,
        undefined,
        () => localSQLiteFallback.getPlansByDate(date)
      );
      plansByDateCache.set(date, rows);
      return rows;
    });
  },

  getPlansByRange(startDate: string, endDate: string): Promise<DailyPlanItem[]> {
    const isAllTimeQuery = startDate <= '2020-01-01' && endDate >= '2099-12-31';

    if (cachedAllTimePlans) {
      return Promise.resolve(
        isAllTimeQuery
          ? cachedAllTimePlans
          : slicePlansByRange(cachedAllTimePlans, startDate, endDate)
      );
    }

    if (allTimePlansPromise) {
      return allTimePlansPromise.then((all) =>
        isAllTimeQuery ? all : slicePlansByRange(all, startDate, endDate)
      );
    }

    const rangeKey = `${startDate}:${endDate}`;
    const cachedRange = plansRangeCache.get(rangeKey);
    if (cachedRange) {
      return Promise.resolve(cachedRange);
    }

    const fetchPromise = deduplicateRequest(`plans:range:${rangeKey}`, async () => {
      const rows = await request(
        `/api/plans?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        undefined,
        () => localSQLiteFallback.getPlansByRange(startDate, endDate)
      );
      if (isAllTimeQuery) {
        cachedAllTimePlans = rows;
      } else {
        plansRangeCache.set(rangeKey, rows);
      }
      return rows;
    });

    if (isAllTimeQuery) {
      allTimePlansPromise = fetchPromise;
    }

    return fetchPromise;
  },

  async createPlan(payload: {
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
  }): Promise<DailyPlanItem> {
    assertWriteAllowed();
    const created = await request(
      '/api/plans',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createPlan(payload)
    );
    invalidateApiCache('plans');
    return created;
  },

  async updatePlan(
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
  ): Promise<DailyPlanItem> {
    assertWriteAllowed();
    const updated = await request(
      `/api/plans/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updatePlan(id, payload)
    );
    invalidateApiCache('plans');
    return updated;
  },

  async reorderPlans(planIds: string[]): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      '/api/plans/reorder',
      { method: 'POST', body: JSON.stringify({ planIds }) },
      () => localSQLiteFallback.reorderPlans(planIds)
    );
    invalidateApiCache('plans');
    return res;
  },

  async transferPlanToNextDay(id: string): Promise<DailyPlanItem> {
    assertWriteAllowed();
    const res = await request(
      `/api/plans/${encodeURIComponent(id)}/transfer-next-day`,
      { method: 'POST' },
      () => localSQLiteFallback.transferPlanToNextDay(id)
    );
    invalidateApiCache('plans');
    return res;
  },

  async deletePlan(id: string): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      `/api/plans/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deletePlan(id)
    );
    invalidateApiCache('plans');
    return res;
  },

  async savePerformance(
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: string | null;
      completion_status: 'completed' | 'partial';
      notes?: string;
    }
  ): Promise<DailyPlanItem> {
    assertWriteAllowed();
    const normalizedPayload = {
      ...payload,
      notes: payload.notes ?? '',
    };
    const saved = await request(
      `/api/plans/${encodeURIComponent(planId)}/performance`,
      { method: 'POST', body: JSON.stringify(normalizedPayload) },
      () => localSQLiteFallback.savePerformance(planId, normalizedPayload)
    );
    invalidateApiCache('plans');
    return saved;
  },

  async deletePerformance(planId: string): Promise<DailyPlanItem> {
    assertWriteAllowed();
    const deleted = await request(
      `/api/plans/${encodeURIComponent(planId)}/performance`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deletePerformance(planId)
    );
    invalidateApiCache('plans');
    return deleted;
  },

  getDashboardMetrics(range: 'today' | 'week' | 'month', refDate: string): Promise<DashboardMetrics> {
    const key = `${range}:${refDate}`;
    const cached = dashboardMetricsCache.get(key);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`dashboard:${key}`, async () => {
      const data = await request(
        `/api/dashboard?range=${encodeURIComponent(range)}&date=${encodeURIComponent(refDate)}`,
        undefined,
        () => localSQLiteFallback.getDashboardMetrics(range, refDate)
      );
      dashboardMetricsCache.set(key, data);
      return data;
    });
  },

  async createSubject(payload: {
    name: string;
    grade_level: string;
    unit_type_label: string;
    color_code: string;
    initial_units?: string[];
  }): Promise<Subject> {
    assertWriteAllowed();
    const created = await request(
      '/api/subjects',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createSubject(payload)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateSubject(
    id: string,
    payload: { name: string; grade_level?: string; unit_type_label?: string; color_code?: string }
  ): Promise<Subject> {
    assertWriteAllowed();
    const updated = await request(
      `/api/subjects/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateSubject(id, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async deleteSubject(id: string): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      `/api/subjects/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteSubject(id)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async createUnit(subjectId: string, title: string): Promise<SubjectUnit> {
    assertWriteAllowed();
    const created = await request(
      `/api/subjects/${encodeURIComponent(subjectId)}/units`,
      { method: 'POST', body: JSON.stringify({ title }) },
      () => localSQLiteFallback.createUnit(subjectId, title)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateUnit(
    unitId: string,
    payload: { title?: string; sort_order?: number }
  ): Promise<SubjectUnit> {
    assertWriteAllowed();
    const updated = await request(
      `/api/units/${encodeURIComponent(unitId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateUnit(unitId, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async reorderUnits(subjectId: string, unitIds: string[]): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      `/api/subjects/${encodeURIComponent(subjectId)}/units/reorder`,
      { method: 'POST', body: JSON.stringify({ unitIds }) },
      () => localSQLiteFallback.reorderUnits(subjectId, unitIds)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async deleteUnit(unitId: string): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      `/api/units/${encodeURIComponent(unitId)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteUnit(unitId)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async createCategory(payload: {
    title: string;
    is_study: number;
    activity_group?: ActivityGroupType;
    impact_weight?: number;
  }): Promise<ActivityCategory> {
    assertWriteAllowed();
    const created = await request(
      '/api/settings/categories',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createCategory(payload)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateCategory(
    id: string,
    payload: {
      title: string;
      is_study?: number;
      activity_group?: ActivityGroupType;
      impact_weight?: number;
    }
  ): Promise<ActivityCategory> {
    assertWriteAllowed();
    const updated = await request(
      `/api/settings/categories/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateCategory(id, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      `/api/settings/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteCategory(id)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async createStudyType(payload: {
    title: string;
    description: string;
  }): Promise<StudyActivityType> {
    assertWriteAllowed();
    const created = await request(
      '/api/settings/study-types',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createStudyType(payload)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateStudyType(
    id: string,
    payload: { title: string; description?: string }
  ): Promise<StudyActivityType> {
    assertWriteAllowed();
    const updated = await request(
      `/api/settings/study-types/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateStudyType(id, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async deleteStudyType(id: string): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const res = await request(
      `/api/settings/study-types/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteStudyType(id)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async updatePriority(code: string, payload: { label: string }): Promise<PriorityLevel> {
    assertWriteAllowed();
    const updated = await request(
      `/api/settings/priorities/${encodeURIComponent(code)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updatePriority(code, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async exportBackup(): Promise<any> {
    const dbDump = await request('/api/backup/export', undefined, () =>
      localSQLiteFallback.exportBackup()
    );

    const clientPreferences: Record<string, any> = {};
    try {
      const smartRem = safeGetItem('martia_smart_reminder_enabled_v1');
      if (smartRem !== null) clientPreferences.smart_reminder_enabled = smartRem;
      const customQuotes = safeGetItem('martia_motivational_quotes_bank_v1');
      if (customQuotes !== null) clientPreferences.motivational_quotes_bank = customQuotes;
      const firedRem = safeGetItem('martia_fired_reminders_v1');
      if (firedRem !== null) clientPreferences.fired_reminders = firedRem;
      const themePref = safeGetItem('martia_theme_v1');
      if (themePref !== null) clientPreferences.theme = themePref;
      clientPreferences.analytics_coefficients = getAnalyticsCoefficients();
    } catch {}

    return {
      ...dbDump,
      client_preferences: clientPreferences,
    };
  },

  validateBackupPayload(raw: any): {
    valid: boolean;
    error?: string;
    normalizedPayload?: any;
    summary?: {
      version: string;
      exportedAt: string;
      subjectsCount: number;
      unitsCount: number;
      plansCount: number;
      performanceLogsCount: number;
      categoriesCount: number;
      studyTypesCount: number;
      prioritiesCount: number;
      studyGoalsCount: number;
      timeBudgetsCount: number;
      hasClientPreferences: boolean;
    };
  } {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        valid: false,
        error: 'فرمت فایل انتخاب‌شده نامعتبر است (ساختار JSON معتبر یافت نشد).',
      };
    }

    if (raw.app !== 'MartiaPlanner') {
      return {
        valid: false,
        error: 'این فایل متعلق به سامانه Martia Planner نیست و امکان بازیابی آن وجود ندارد.',
      };
    }

    if (raw.schemaVersion !== undefined && Number(raw.schemaVersion) > 2) {
      return {
        valid: false,
        error: `نسخه ساختار این فایل پشتیبان (${raw.schemaVersion}) جدیدتر از نسخه فعلی برنامه است و سازگار نیست.`,
      };
    }

    const dataRoot =
      raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.daily_plans)
        ? raw.data
        : raw;

    if (!Array.isArray(dataRoot.subjects) || !Array.isArray(dataRoot.daily_plans)) {
      return {
        valid: false,
        error: 'فایل پشتیبان ناقص یا آسیب‌دیده است (جداول اصلی دروس و برنامه‌های مطالعاتی یافت نشد).',
      };
    }

    for (const s of dataRoot.subjects) {
      if (!s || typeof s !== 'object' || !s.id || !s.name) {
        return {
          valid: false,
          error: 'اطلاعات جدول دروس در فایل پشتیبان مخدوش است.',
        };
      }
    }

    for (const p of dataRoot.daily_plans) {
      if (!p || typeof p !== 'object' || !p.id || !p.plan_date) {
        return {
          valid: false,
          error: 'اطلاعات جدول برنامه‌های مطالعاتی در فایل پشتیبان مخدوش است.',
        };
      }
    }

    const perfLogs = Array.isArray(dataRoot.performance_logs) ? dataRoot.performance_logs : [];
    for (const pf of perfLogs) {
      if (!pf || typeof pf !== 'object' || !pf.id || !pf.plan_id) {
        return {
          valid: false,
          error: 'اطلاعات سوابق عملکرد در فایل پشتیبان مخدوش است.',
        };
      }
    }

    const budgetsList = Array.isArray(dataRoot.daily_time_budgets)
      ? dataRoot.daily_time_budgets
      : dataRoot.daily_time_budgets && typeof dataRoot.daily_time_budgets === 'object'
      ? Object.values(dataRoot.daily_time_budgets)
      : [];

    const goalsList = Array.isArray(dataRoot.daily_study_goals) ? dataRoot.daily_study_goals : [];

    const normalizedPayload = {
      ...dataRoot,
      app: 'MartiaPlanner',
      version: String(raw.version || dataRoot.version || '1.0.0'),
      exportedAt: String(raw.exportedAt || dataRoot.exportedAt || new Date().toISOString()),
      schemaVersion: Number(raw.schemaVersion || 2),
      subjects: dataRoot.subjects,
      subject_units: Array.isArray(dataRoot.subject_units) ? dataRoot.subject_units : [],
      daily_plans: dataRoot.daily_plans,
      performance_logs: perfLogs,
      activity_categories: Array.isArray(dataRoot.activity_categories)
        ? dataRoot.activity_categories
        : [],
      study_activity_types: Array.isArray(dataRoot.study_activity_types)
        ? dataRoot.study_activity_types
        : [],
      priority_levels: Array.isArray(dataRoot.priority_levels) ? dataRoot.priority_levels : [],
      daily_study_goals: goalsList,
      daily_time_budgets: budgetsList,
      client_preferences:
        raw.client_preferences && typeof raw.client_preferences === 'object'
          ? raw.client_preferences
          : {},
    };

    return {
      valid: true,
      normalizedPayload,
      summary: {
        version: normalizedPayload.version,
        exportedAt: normalizedPayload.exportedAt,
        subjectsCount: normalizedPayload.subjects.length,
        unitsCount: normalizedPayload.subject_units.length,
        plansCount: normalizedPayload.daily_plans.length,
        performanceLogsCount: normalizedPayload.performance_logs.length,
        categoriesCount: normalizedPayload.activity_categories.length,
        studyTypesCount: normalizedPayload.study_activity_types.length,
        prioritiesCount: normalizedPayload.priority_levels.length,
        studyGoalsCount: normalizedPayload.daily_study_goals.length,
        timeBudgetsCount: normalizedPayload.daily_time_budgets.length,
        hasClientPreferences: Object.keys(normalizedPayload.client_preferences).length > 0,
      },
    };
  },

  async importBackup(payload: any): Promise<{ success: boolean }> {
    assertWriteAllowed();
    const validation = this.validateBackupPayload(payload);
    if (!validation.valid || !validation.normalizedPayload) {
      throw new Error(validation.error || 'فایل پشتیبان معتبر نیست.');
    }

    const cleanPayload = validation.normalizedPayload;
    const res = await request(
      '/api/backup/import',
      { method: 'POST', body: JSON.stringify(cleanPayload) },
      () => localSQLiteFallback.importBackup(cleanPayload)
    );

    // Sync local fallback storage as well so offline mode stays in sync
    try {
      localSQLiteFallback.importBackup(cleanPayload);
    } catch {}

    // Restore client-side preferences if present
    try {
      const prefs = cleanPayload.client_preferences;
      if (prefs && typeof prefs === 'object') {
        if (typeof prefs.smart_reminder_enabled === 'string') {
          safeSetItem('martia_smart_reminder_enabled_v1', prefs.smart_reminder_enabled);
        }
        if (typeof prefs.motivational_quotes_bank === 'string') {
          safeSetItem('martia_motivational_quotes_bank_v1', prefs.motivational_quotes_bank);
        }
        if (typeof prefs.fired_reminders === 'string') {
          safeSetItem('martia_fired_reminders_v1', prefs.fired_reminders);
        }
        if (typeof prefs.theme === 'string') {
          safeSetItem('martia_theme_v1', prefs.theme);
        }
        if (prefs.analytics_coefficients && typeof prefs.analytics_coefficients === 'object') {
          saveAnalyticsCoefficients(prefs.analytics_coefficients);
        }
      }
    } catch {}

    invalidateApiCache('all');
    return res;
  },

  async importBackupFromCloud(payload: any): Promise<void> {
    const validation = this.validateBackupPayload(payload);
    if (!validation.valid || !validation.normalizedPayload) {
      return;
    }

    const cleanPayload = validation.normalizedPayload;
    await request(
      '/api/backup/import',
      { method: 'POST', body: JSON.stringify(cleanPayload) },
      () => localSQLiteFallback.importBackup(cleanPayload)
    );

    try {
      localSQLiteFallback.importBackup(cleanPayload);
    } catch {}

    try {
      const prefs = cleanPayload.client_preferences;
      if (prefs && typeof prefs === 'object') {
        if (typeof prefs.smart_reminder_enabled === 'string') {
          safeSetItem('martia_smart_reminder_enabled_v1', prefs.smart_reminder_enabled);
        }
        if (typeof prefs.motivational_quotes_bank === 'string') {
          safeSetItem('martia_motivational_quotes_bank_v1', prefs.motivational_quotes_bank);
        }
        if (typeof prefs.fired_reminders === 'string') {
          safeSetItem('martia_fired_reminders_v1', prefs.fired_reminders);
        }
        if (typeof prefs.theme === 'string') {
          safeSetItem('martia_theme_v1', prefs.theme);
        }
        if (prefs.analytics_coefficients && typeof prefs.analytics_coefficients === 'object') {
          saveAnalyticsCoefficients(prefs.analytics_coefficients);
        }
      }
    } catch {}

    invalidateApiCache('all', true);
  },

  async getChangelogDocument(): Promise<string> {
    try {
      const res = await fetch('/CHANGELOG.md');
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('#')) {
          return text;
        }
      }
    } catch {}
    try {
      const res2 = await fetch('/api/changelog');
      if (res2.ok) {
        const text2 = await res2.text();
        if (text2 && text2.includes('#')) {
          return text2;
        }
      }
    } catch {}
    return '';
  },

  getDailyGoal(date: string): Promise<DailyStudyGoalConfig> {
    const cached = goalByDateCache.get(date);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`goal:date:${date}`, async () => {
      const data = await request(
        `/api/goals?date=${encodeURIComponent(date)}`,
        undefined,
        () => localSQLiteFallback.getDailyGoal(date)
      );
      goalByDateCache.set(date, data);
      return data;
    });
  },

  getDailyGoalsByRange(startDate: string, endDate: string): Promise<DailyStudyGoalConfig[]> {
    const rangeKey = `${startDate}:${endDate}`;
    const cached = goalsRangeCache.get(rangeKey);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`goal:range:${rangeKey}`, async () => {
      const rows = await request(
        `/api/goals?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        undefined,
        () => localSQLiteFallback.getDailyGoalsByRange(startDate, endDate)
      );
      goalsRangeCache.set(rangeKey, rows);
      for (const g of rows) {
        goalByDateCache.set(g.goal_date, g);
      }
      return rows;
    });
  },

  async saveDailyGoal(payload: {
    goal_date: string;
    target_study_minutes: number;
    target_exercises_count: number;
    target_completed_tasks: number;
    custom_goals: any[];
  }): Promise<DailyStudyGoalConfig> {
    assertWriteAllowed();
    const saved = await request(
      '/api/goals',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.saveDailyGoal(payload)
    );
    invalidateApiCache('goals');
    goalByDateCache.set(saved.goal_date, saved);
    return saved;
  },

  getTimeBudget(date: string): Promise<DailyTimeBudgetConfig> {
    const cached = budgetByDateCache.get(date);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`budget:date:${date}`, async () => {
      const data = await request(
        `/api/time-budgets?date=${encodeURIComponent(date)}`,
        undefined,
        () => localSQLiteFallback.getTimeBudget(date)
      );
      budgetByDateCache.set(date, data);
      return data;
    });
  },

  getTimeBudgetsByRange(startDate: string, endDate: string): Promise<DailyTimeBudgetConfig[]> {
    const rangeKey = `${startDate}:${endDate}`;
    const cached = budgetsRangeCache.get(rangeKey);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`budget:range:${rangeKey}`, async () => {
      const rows = await request(
        `/api/time-budgets?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        undefined,
        () => localSQLiteFallback.getTimeBudgetsByRange(startDate, endDate)
      );
      budgetsRangeCache.set(rangeKey, rows);
      for (const b of rows) {
        budgetByDateCache.set(b.plan_date, b);
      }
      return rows;
    });
  },

  async saveTimeBudget(payload: {
    plan_date: string;
    budget_minutes: number | null;
    input_unit: 'hours' | 'minutes';
  }): Promise<DailyTimeBudgetConfig> {
    assertWriteAllowed();
    const saved = await request(
      '/api/time-budgets',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.saveTimeBudget(payload)
    );
    invalidateApiCache('budgets');
    budgetByDateCache.set(saved.plan_date, saved);
    return saved;
  },

  getGitHubStatus(): Promise<{
    oauthConfigured: boolean;
    hasStoredToken: boolean;
    defaultRepo: string;
    appUrl: string;
  }> {
    return request(
      '/api/github/status',
      undefined,
      () => ({
        oauthConfigured: false,
        hasStoredToken: false,
        defaultRepo: 'MartiaPlanner',
        appUrl: window.location.origin,
      })
    );
  },

  pushToGitHub(payload: {
    token?: string;
    repoName: string;
    version: string;
    commitMessage: string;
    isPrivate: boolean;
  }): Promise<{
    success: boolean;
    repoUrl: string;
    version: string;
    releaseTag: string;
    filesCount: number;
    commitSha: string;
    branch: string;
    createdNewRepo: boolean;
  }> {
    return request(
      '/api/github/push',
      { method: 'POST', body: JSON.stringify(payload) },
      () => {
        throw new Error('پوش مستقیم به گیت‌هاب فقط در حالت سرور فعال است.');
      }
    );
  },

  async getSampleDataStatus(): Promise<{
    hasSampleData: boolean;
    samplePlansCount: number;
    samplePerformancesCount: number;
    sampleDaysCount: number;
    hasWeeklySampleData?: boolean;
    weeklySamplePlansCount?: number;
    weeklySamplePerformancesCount?: number;
    weeklySampleDaysCount?: number;
  }> {
    return request('/api/sample-data/status', undefined, () =>
      localSQLiteFallback.getSampleDataStatus()
    );
  },

  async seedSampleData(): Promise<{
    hasSampleData: boolean;
    samplePlansCount: number;
    samplePerformancesCount: number;
    sampleDaysCount: number;
    hasWeeklySampleData?: boolean;
    weeklySamplePlansCount?: number;
    weeklySamplePerformancesCount?: number;
    weeklySampleDaysCount?: number;
    alreadyLoaded?: boolean;
  }> {
    assertWriteAllowed();
    const res = await request(
      '/api/sample-data/seed',
      { method: 'POST' },
      () => localSQLiteFallback.seedSampleData()
    );
    try {
      localSQLiteFallback.seedSampleData();
    } catch {}
    invalidateApiCache('all');
    return res;
  },

  async deleteSampleData(): Promise<{
    hasSampleData: boolean;
    samplePlansCount: number;
    samplePerformancesCount: number;
    sampleDaysCount: number;
    hasWeeklySampleData?: boolean;
    weeklySamplePlansCount?: number;
    weeklySamplePerformancesCount?: number;
    weeklySampleDaysCount?: number;
    removedPlansCount?: number;
  }> {
    assertWriteAllowed();
    const res = await request(
      '/api/sample-data',
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteSampleData()
    );
    try {
      localSQLiteFallback.deleteSampleData();
    } catch {}
    invalidateApiCache('all');
    return res;
  },

  async seedWeeklySampleData(replace = false): Promise<{
    hasSampleData: boolean;
    samplePlansCount: number;
    samplePerformancesCount: number;
    sampleDaysCount: number;
    hasWeeklySampleData: boolean;
    weeklySamplePlansCount: number;
    weeklySamplePerformancesCount: number;
    weeklySampleDaysCount: number;
    alreadyLoaded?: boolean;
    replaced?: boolean;
  }> {
    assertWriteAllowed();
    const res = await request(
      '/api/sample-data/seed-week',
      { method: 'POST', body: JSON.stringify({ replace }) },
      () => localSQLiteFallback.seedWeeklySampleData(replace)
    );
    try {
      localSQLiteFallback.seedWeeklySampleData(replace);
    } catch {}
    invalidateApiCache('all');
    return res;
  },

  async deleteWeeklySampleData(): Promise<{
    hasSampleData: boolean;
    samplePlansCount: number;
    samplePerformancesCount: number;
    sampleDaysCount: number;
    hasWeeklySampleData: boolean;
    weeklySamplePlansCount: number;
    weeklySamplePerformancesCount: number;
    weeklySampleDaysCount: number;
    removedWeeklyPlansCount?: number;
  }> {
    assertWriteAllowed();
    const res = await request(
      '/api/sample-data/week',
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteWeeklySampleData()
    );
    try {
      localSQLiteFallback.deleteWeeklySampleData();
    } catch {}
    invalidateApiCache('all');
    return res;
  },
};

firebaseCloudSync.registerDataBridge(
  () => api.exportBackup(),
  (remotePayload) => api.importBackupFromCloud(remotePayload)
);



