/**
 * MartiaPlanner — Intelligent Conflict Detection & Smart Merge Engine
 *
 * Ensures switching between Offline and Cloud (or connecting two devices to the same Workspace)
 * NEVER overwrites data silently and NEVER produces duplicate records.
 */

export interface WorkspaceDiffReport {
  isIdentical: boolean;
  hasConflict: boolean;
  localSummary: {
    subjectsCount: number;
    plansCount: number;
    performancesCount: number;
    latestUpdatedAt: string | null;
  };
  remoteSummary: {
    subjectsCount: number;
    plansCount: number;
    performancesCount: number;
    latestUpdatedAt: string | null;
  };
  localOnlyPlansCount: number;
  remoteOnlyPlansCount: number;
  bothDifferentPlansCount: number;
  localOnlySubjectsCount: number;
  remoteOnlySubjectsCount: number;
}

export interface SmartMergeResult {
  mergedPayload: any;
  stats: {
    totalSubjects: number;
    totalPlans: number;
    totalPerformances: number;
    addedFromLocal: number;
    addedFromRemote: number;
    conflictsResolvedByTimestamp: number;
  };
}

function unwrapDataRoot(raw: any): any {
  if (!raw || typeof raw !== 'object') return {};
  if (raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.daily_plans)) {
    return raw.data;
  }
  return raw;
}

function getRecordTimestampMs(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const candidate = item.updated_at || item.logged_at || item.created_at || '';
  if (!candidate) return 0;
  const ms = Date.parse(String(candidate));
  return Number.isNaN(ms) ? 0 : ms;
}

function getLatestTimestampIso(items: any[]): string | null {
  let maxMs = 0;
  let maxIso: string | null = null;
  for (const item of items) {
    const candidate = item?.updated_at || item?.logged_at || item?.created_at;
    if (!candidate) continue;
    const ms = Date.parse(String(candidate));
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms;
      maxIso = String(candidate);
    }
  }
  return maxIso;
}

function stableRecordFingerprint(item: any): string {
  if (!item || typeof item !== 'object') return '';
  const { updated_at: _u, ...rest } = item;
  return JSON.stringify(rest);
}

function normalizeBudgetsArray(root: any): any[] {
  if (Array.isArray(root.daily_time_budgets)) {
    return root.daily_time_budgets.filter((b: any) => b && b.plan_date);
  }
  if (root.daily_time_budgets && typeof root.daily_time_budgets === 'object') {
    return Object.values(root.daily_time_budgets).filter((b: any) => b && b.plan_date);
  }
  return [];
}

export function inspectWorkspaceSyncDiff(localRaw: any, remoteRaw: any): WorkspaceDiffReport {
  const localRoot = unwrapDataRoot(localRaw);
  const remoteRoot = unwrapDataRoot(remoteRaw);

  const localSubjects: any[] = Array.isArray(localRoot.subjects) ? localRoot.subjects : [];
  const remoteSubjects: any[] = Array.isArray(remoteRoot.subjects) ? remoteRoot.subjects : [];

  const localPlans: any[] = Array.isArray(localRoot.daily_plans) ? localRoot.daily_plans : [];
  const remotePlans: any[] = Array.isArray(remoteRoot.daily_plans) ? remoteRoot.daily_plans : [];

  const localPerfs: any[] = Array.isArray(localRoot.performance_logs)
    ? localRoot.performance_logs
    : [];
  const remotePerfs: any[] = Array.isArray(remoteRoot.performance_logs)
    ? remoteRoot.performance_logs
    : [];

  const localSubjMap = new Map(localSubjects.map((s) => [s.id, s]));
  const remoteSubjMap = new Map(remoteSubjects.map((s) => [s.id, s]));

  let localOnlySubjectsCount = 0;
  for (const id of localSubjMap.keys()) {
    if (!remoteSubjMap.has(id)) localOnlySubjectsCount++;
  }
  let remoteOnlySubjectsCount = 0;
  for (const id of remoteSubjMap.keys()) {
    if (!localSubjMap.has(id)) remoteOnlySubjectsCount++;
  }

  const localPlanMap = new Map(localPlans.map((p) => [p.id, p]));
  const remotePlanMap = new Map(remotePlans.map((p) => [p.id, p]));
  const localPerfByPlan = new Map(localPerfs.map((pf) => [pf.plan_id, pf]));
  const remotePerfByPlan = new Map(remotePerfs.map((pf) => [pf.plan_id, pf]));

  let localOnlyPlansCount = 0;
  let remoteOnlyPlansCount = 0;
  let bothDifferentPlansCount = 0;

  for (const [id, lp] of localPlanMap.entries()) {
    const rp = remotePlanMap.get(id);
    if (!rp) {
      localOnlyPlansCount++;
    } else {
      const lpf = localPerfByPlan.get(id);
      const rpf = remotePerfByPlan.get(id);
      if (
        stableRecordFingerprint(lp) !== stableRecordFingerprint(rp) ||
        stableRecordFingerprint(lpf) !== stableRecordFingerprint(rpf)
      ) {
        bothDifferentPlansCount++;
      }
    }
  }

  for (const id of remotePlanMap.keys()) {
    if (!localPlanMap.has(id)) {
      remoteOnlyPlansCount++;
    }
  }

  const isIdentical =
    localOnlyPlansCount === 0 &&
    remoteOnlyPlansCount === 0 &&
    bothDifferentPlansCount === 0 &&
    localOnlySubjectsCount === 0 &&
    remoteOnlySubjectsCount === 0;

  const hasConflict =
    !isIdentical &&
    ((localOnlyPlansCount > 0 && remoteOnlyPlansCount > 0) ||
      bothDifferentPlansCount > 0 ||
      (localOnlyPlansCount > 0 && remotePlans.length > 0));

  return {
    isIdentical,
    hasConflict,
    localSummary: {
      subjectsCount: localSubjects.length,
      plansCount: localPlans.length,
      performancesCount: localPerfs.length,
      latestUpdatedAt: getLatestTimestampIso([...localPlans, ...localPerfs]),
    },
    remoteSummary: {
      subjectsCount: remoteSubjects.length,
      plansCount: remotePlans.length,
      performancesCount: remotePerfs.length,
      latestUpdatedAt: getLatestTimestampIso([...remotePlans, ...remotePerfs]),
    },
    localOnlyPlansCount,
    remoteOnlyPlansCount,
    bothDifferentPlansCount,
    localOnlySubjectsCount,
    remoteOnlySubjectsCount,
  };
}

function mergeArrayByKey(
  localItems: any[],
  remoteItems: any[],
  keyField: string,
  counters?: { addedFromLocal: number; addedFromRemote: number; conflicts: number }
): any[] {
  const mergedMap = new Map<string, any>();

  for (const rItem of remoteItems) {
    if (!rItem || !rItem[keyField]) continue;
    mergedMap.set(String(rItem[keyField]), rItem);
    if (counters) counters.addedFromRemote++;
  }

  for (const lItem of localItems) {
    if (!lItem || !lItem[keyField]) continue;
    const key = String(lItem[keyField]);
    const existing = mergedMap.get(key);
    if (!existing) {
      mergedMap.set(key, lItem);
      if (counters) counters.addedFromLocal++;
    } else {
      const same = stableRecordFingerprint(existing) === stableRecordFingerprint(lItem);
      if (!same) {
        const localTs = getRecordTimestampMs(lItem);
        const remoteTs = getRecordTimestampMs(existing);
        if (localTs >= remoteTs) {
          mergedMap.set(key, lItem);
        }
        if (counters) counters.conflicts++;
      }
    }
  }

  return Array.from(mergedMap.values());
}

export function smartMergeBackupPayloads(localRaw: any, remoteRaw: any): SmartMergeResult {
  const localRoot = unwrapDataRoot(localRaw);
  const remoteRoot = unwrapDataRoot(remoteRaw);

  const counters = { addedFromLocal: 0, addedFromRemote: 0, conflicts: 0 };

  const subjects = mergeArrayByKey(
    Array.isArray(localRoot.subjects) ? localRoot.subjects : [],
    Array.isArray(remoteRoot.subjects) ? remoteRoot.subjects : [],
    'id'
  );

  const subjectUnits = mergeArrayByKey(
    Array.isArray(localRoot.subject_units) ? localRoot.subject_units : [],
    Array.isArray(remoteRoot.subject_units) ? remoteRoot.subject_units : [],
    'id'
  );

  const dailyPlans = mergeArrayByKey(
    Array.isArray(localRoot.daily_plans) ? localRoot.daily_plans : [],
    Array.isArray(remoteRoot.daily_plans) ? remoteRoot.daily_plans : [],
    'id',
    counters
  );

  // Performance logs deduplicated strictly by plan_id (1 performance log per plan)
  const localPerfs = Array.isArray(localRoot.performance_logs) ? localRoot.performance_logs : [];
  const remotePerfs = Array.isArray(remoteRoot.performance_logs)
    ? remoteRoot.performance_logs
    : [];
  const performanceLogs = mergeArrayByKey(localPerfs, remotePerfs, 'plan_id', counters);

  const activityCategories = mergeArrayByKey(
    Array.isArray(localRoot.activity_categories) ? localRoot.activity_categories : [],
    Array.isArray(remoteRoot.activity_categories) ? remoteRoot.activity_categories : [],
    'id'
  );

  const studyActivityTypes = mergeArrayByKey(
    Array.isArray(localRoot.study_activity_types) ? localRoot.study_activity_types : [],
    Array.isArray(remoteRoot.study_activity_types) ? remoteRoot.study_activity_types : [],
    'id'
  );

  const priorityLevels = mergeArrayByKey(
    Array.isArray(localRoot.priority_levels) ? localRoot.priority_levels : [],
    Array.isArray(remoteRoot.priority_levels) ? remoteRoot.priority_levels : [],
    'code'
  );

  const dailyTimeBudgets = mergeArrayByKey(
    normalizeBudgetsArray(localRoot),
    normalizeBudgetsArray(remoteRoot),
    'plan_date'
  );

  const dailyStudyGoals = mergeArrayByKey(
    Array.isArray(localRoot.daily_study_goals) ? localRoot.daily_study_goals : [],
    Array.isArray(remoteRoot.daily_study_goals) ? remoteRoot.daily_study_goals : [],
    'goal_date'
  );

  const mergedPrefs = {
    ...(remoteRaw?.client_preferences && typeof remoteRaw.client_preferences === 'object'
      ? remoteRaw.client_preferences
      : {}),
    ...(localRaw?.client_preferences && typeof localRaw.client_preferences === 'object'
      ? localRaw.client_preferences
      : {}),
  };

  const mergedPayload = {
    exportedAt: new Date().toISOString(),
    app: 'MartiaPlanner',
    version: String(localRaw?.version || remoteRaw?.version || '1.20.0'),
    schemaVersion: 2,
    activity_categories: activityCategories,
    study_activity_types: studyActivityTypes,
    priority_levels: priorityLevels,
    subjects,
    subject_units: subjectUnits,
    daily_plans: dailyPlans,
    performance_logs: performanceLogs,
    daily_study_goals: dailyStudyGoals,
    daily_time_budgets: dailyTimeBudgets,
    client_preferences: mergedPrefs,
  };

  return {
    mergedPayload,
    stats: {
      totalSubjects: subjects.length,
      totalPlans: dailyPlans.length,
      totalPerformances: performanceLogs.length,
      addedFromLocal: counters.addedFromLocal,
      addedFromRemote: counters.addedFromRemote,
      conflictsResolvedByTimestamp: counters.conflicts,
    },
  };
}
