/**
 * MartiaPlanner — Dual-Mode API & SQLite Client
 * 1. When connected to the Express + Better-SQLite3 server, uses `/api/*` endpoints.
 * 2. When packaged as a standalone Windows (.exe / .msi) or Android (.apk) native app via Tauri 2
 *    (where there is no external Node server), automatically routes to the embedded device storage engine.
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
  CustomNumericGoal,
  DailyTimeBudgetConfig,
} from '../types.ts';
import { localSQLiteFallback } from './localSqliteFallback.ts';

let useStandaloneDeviceEngine = false;

async function requestJSON<T>(
  url: string,
  options: RequestInit | undefined,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  if (useStandaloneDeviceEngine) {
    return await fallbackFn();
  }
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Running inside standalone Tauri WebView without Node backend
      useStandaloneDeviceEngine = true;
      return await fallbackFn();
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `خطا در ارتباط با سرور (${res.status})`);
    }
    return data as T;
  } catch (err: any) {
    // If network fetch fails (e.g. Tauri desktop/Android standalone protocol), switch to local engine
    if (err instanceof TypeError || String(err.message).includes('Failed to fetch')) {
      useStandaloneDeviceEngine = true;
      return await fallbackFn();
    }
    throw err;
  }
}

export const api = {
  getBootstrap: () =>
    requestJSON<AppBootstrapData>('/api/bootstrap', undefined, () =>
      localSQLiteFallback.getBootstrap()
    ),

  // Plans
  getPlansByDate: (date: string) =>
    requestJSON<DailyPlanItem[]>(
      `/api/plans?date=${encodeURIComponent(date)}`,
      undefined,
      () => localSQLiteFallback.getPlansByDate(date)
    ),

  getPlansByRange: (startDate: string, endDate: string) =>
    requestJSON<DailyPlanItem[]>(
      `/api/plans?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      undefined,
      () => localSQLiteFallback.getPlansByRange(startDate, endDate)
    ),

  createPlan: (payload: {
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
  }) =>
    requestJSON<DailyPlanItem>(
      '/api/plans',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.createPlan(payload)
    ),

  updatePlan: (
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
  ) =>
    requestJSON<DailyPlanItem>(
      `/api/plans/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.updatePlan(id, payload)
    ),

  reorderPlans: (planIds: string[]) =>
    requestJSON<{ success: boolean }>(
      '/api/plans/reorder',
      {
        method: 'POST',
        body: JSON.stringify({ planIds }),
      },
      () => localSQLiteFallback.reorderPlans(planIds)
    ),

  deletePlan: (id: string) =>
    requestJSON<{ success: boolean }>(
      `/api/plans/${id}`,
      {
        method: 'DELETE',
      },
      () => localSQLiteFallback.deletePlan(id)
    ),

  // Performance
  savePerformance: (
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: string | null;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ) =>
    requestJSON<DailyPlanItem>(
      `/api/plans/${planId}/performance`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.savePerformance(planId, payload)
    ),

  deletePerformance: (planId: string) =>
    requestJSON<DailyPlanItem>(
      `/api/plans/${planId}/performance`,
      {
        method: 'DELETE',
      },
      () => localSQLiteFallback.deletePerformance(planId)
    ),

  // Dashboard
  getDashboardMetrics: (range: 'today' | 'week' | 'month', date: string) =>
    requestJSON<DashboardMetrics>(
      `/api/dashboard?range=${encodeURIComponent(range)}&date=${encodeURIComponent(date)}`,
      undefined,
      () => localSQLiteFallback.getDashboardMetrics(range, date)
    ),

  // Daily Numeric Study Goals
  getDailyGoal: (date: string) =>
    requestJSON<DailyStudyGoalConfig>(
      `/api/goals?date=${encodeURIComponent(date)}`,
      undefined,
      () => localSQLiteFallback.getDailyGoal(date)
    ),

  saveDailyGoal: (payload: {
    goal_date: string;
    target_study_minutes: number;
    target_exercises_count: number;
    target_completed_tasks: number;
    custom_goals: CustomNumericGoal[];
  }) =>
    requestJSON<DailyStudyGoalConfig>(
      '/api/goals',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.saveDailyGoal(payload)
    ),

  // Daily Time Budget (ظرف زمانی روزانه - بخش نهم)
  getTimeBudget: (date: string) =>
    requestJSON<DailyTimeBudgetConfig>(
      `/api/time-budgets?date=${encodeURIComponent(date)}`,
      undefined,
      () => localSQLiteFallback.getTimeBudget(date)
    ),

  getTimeBudgetsByRange: (startDate: string, endDate: string) =>
    requestJSON<DailyTimeBudgetConfig[]>(
      `/api/time-budgets?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      undefined,
      () => localSQLiteFallback.getTimeBudgetsByRange(startDate, endDate)
    ),

  saveTimeBudget: (payload: {
    plan_date: string;
    budget_minutes: number | null;
    input_unit: 'hours' | 'minutes';
  }) =>
    requestJSON<DailyTimeBudgetConfig>(
      '/api/time-budgets',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.saveTimeBudget(payload)
    ),

  // Subjects & Units
  createSubject: (payload: {
    name: string;
    grade_level: string;
    unit_type_label: string;
    color_code: string;
    initial_units?: string[];
  }) =>
    requestJSON<Subject>(
      '/api/subjects',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.createSubject(payload)
    ),

  updateSubject: (
    id: string,
    payload: {
      name: string;
      grade_level?: string;
      unit_type_label?: string;
      color_code?: string;
    }
  ) =>
    requestJSON<Subject>(
      `/api/subjects/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.updateSubject(id, payload)
    ),

  deleteSubject: (id: string) =>
    requestJSON<{ success: boolean }>(
      `/api/subjects/${id}`,
      {
        method: 'DELETE',
      },
      () => localSQLiteFallback.deleteSubject(id)
    ),

  createUnit: (subjectId: string, title: string) =>
    requestJSON<SubjectUnit>(
      `/api/subjects/${subjectId}/units`,
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      },
      () => localSQLiteFallback.createUnit(subjectId, title)
    ),

  updateUnit: (unitId: string, payload: { title?: string; sort_order?: number }) =>
    requestJSON<SubjectUnit>(
      `/api/units/${unitId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.updateUnit(unitId, payload)
    ),

  reorderUnits: (subjectId: string, unitIds: string[]) =>
    requestJSON<{ success: boolean }>(
      `/api/subjects/${subjectId}/units/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ unitIds }),
      },
      () => localSQLiteFallback.reorderUnits(subjectId, unitIds)
    ),

  deleteUnit: (unitId: string) =>
    requestJSON<{ success: boolean }>(
      `/api/units/${unitId}`,
      {
        method: 'DELETE',
      },
      () => localSQLiteFallback.deleteUnit(unitId)
    ),

  // Settings
  createCategory: (payload: {
    title: string;
    is_study: number;
    activity_group?: ActivityGroupType;
    impact_weight?: number;
    color?: string;
  }) =>
    requestJSON<ActivityCategory>(
      '/api/settings/categories',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.createCategory(payload)
    ),

  updateCategory: (
    id: string,
    payload: {
      title: string;
      is_study?: number;
      activity_group?: ActivityGroupType;
      impact_weight?: number;
      color?: string;
    }
  ) =>
    requestJSON<ActivityCategory>(
      `/api/settings/categories/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.updateCategory(id, payload)
    ),

  deleteCategory: (id: string) =>
    requestJSON<{ success: boolean }>(
      `/api/settings/categories/${id}`,
      {
        method: 'DELETE',
      },
      () => localSQLiteFallback.deleteCategory(id)
    ),

  createStudyType: (payload: { title: string; description: string; badge_color?: string }) =>
    requestJSON<StudyActivityType>(
      '/api/settings/study-types',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.createStudyType(payload)
    ),

  updateStudyType: (
    id: string,
    payload: { title: string; description?: string; badge_color?: string }
  ) =>
    requestJSON<StudyActivityType>(
      `/api/settings/study-types/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.updateStudyType(id, payload)
    ),

  deleteStudyType: (id: string) =>
    requestJSON<{ success: boolean }>(
      `/api/settings/study-types/${id}`,
      {
        method: 'DELETE',
      },
      () => localSQLiteFallback.deleteStudyType(id)
    ),

  updatePriority: (code: string, payload: { label: string; color_code?: string }) =>
    requestJSON<PriorityLevel>(
      `/api/settings/priorities/${code}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.updatePriority(code, payload)
    ),

  // Backup
  exportBackup: () =>
    requestJSON<any>('/api/backup/export', undefined, () =>
      localSQLiteFallback.exportBackup()
    ),

  importBackup: (payload: any) =>
    requestJSON<{ success: boolean }>(
      '/api/backup/import',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => localSQLiteFallback.importBackup(payload)
    ),

  // GitHub Sync
  getGitHubStatus: () =>
    requestJSON<{
      oauthConfigured: boolean;
      hasStoredToken: boolean;
      defaultRepo: string;
      appUrl: string;
    }>('/api/github/status', undefined, () => ({
      oauthConfigured: false,
      hasStoredToken: false,
      defaultRepo: 'MartiaPlanner',
      appUrl: '',
    })),

  getGitHubAuthUrl: () =>
    requestJSON<{ url: string }>('/api/auth/github/url', undefined, () => ({
      url: 'https://github.com/EhspGithub/MartiaPlanner',
    })),

  pushToGitHub: (payload: {
    token?: string;
    repoName: string;
    version?: string;
    commitMessage?: string;
    isPrivate?: boolean;
  }) =>
    requestJSON<{
      success: boolean;
      repoUrl: string;
      owner: string;
      repo: string;
      branch: string;
      version: string;
      releaseTag: string;
      filesCount: number;
      commitSha: string;
      createdNewRepo: boolean;
    }>(
      '/api/github/push',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        throw new Error('پوش مستقیم نیازمند اتصال به سرور توسعه است.');
      }
    ),
};
