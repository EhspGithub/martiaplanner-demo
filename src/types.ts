/**
 * MartiaPlanner — Domain Entities & Data Contracts
 * Supports relational SQLite schema (Tauri 2 Native SQL + Server Better-SQLite3)
 * with Historical Snapshot Protection so base data edits never corrupt past records.
 */

export type PriorityGroup = 'A' | 'B' | 'C';

/**
 * Legacy 4-level quality labels kept for backward compatibility with older backups;
 * new logs store integer strings "0".."10" (or number 0..10).
 */
export type LegacyLearningQuality = 'excellent' | 'good' | 'average' | 'weak';
export type LearningQuality = string | number;

export type PlanStatus = 'pending' | 'partial' | 'completed';

/**
 * Section 6: Three-tier activity classification
 * - 'educational': فعالیت‌های آموزشی (مطالعه، مرور، تست، تکلیف، یادگیری)
 * - 'restricted': فعالیت‌های تفریحی و محدودشونده (گوشی، شبکه‌های اجتماعی، تلویزیون، بازی)
 * - 'essential': فعالیت‌های ضروری، بازیابی و سلامت (استراحت، غذا، ورزش، فعالیت‌های شخصی ضروری)
 */
export type ActivityGroupType = 'educational' | 'restricted' | 'essential';

export interface ActivityCategory {
  id: string;
  title: string;
  is_study: number; // 1 = درسی (requires subject, unit, study_type), 0 = غیردرسی
  activity_group?: ActivityGroupType; // 'educational' | 'restricted' | 'essential'
  impact_weight?: number; // Default 1.0 for weighted restricted control calculation
  icon: string;
  color: string;
  sort_order: number;
  is_active: number;
}

export interface StudyActivityType {
  id: string;
  title: string;
  description: string;
  badge_color: string;
  sort_order: number;
  is_active: number;
}

export interface PriorityLevel {
  code: string; // A1..C3
  group_name: PriorityGroup;
  level_num: number; // 1..3
  label: string;
  color_code: string;
  sort_rank: number; // 1..9
}

export interface SubjectUnit {
  id: string;
  subject_id: string;
  title: string; // e.g., "درس اول" or "فصل اول"
  sort_order: number;
  is_archived: number;
}

export interface Subject {
  id: string;
  name: string;
  grade_level: string; // "هفتم" | "هشتم" | "نهم"
  unit_type_label: string; // "درس" | "فصل" | "بخش"
  color_code: string;
  sort_order: number;
  is_archived: number;
  units: SubjectUnit[];
}

export interface PerformanceLog {
  id: string;
  plan_id: string;
  actual_minutes: number;
  exercises_count: number | null; // Only for study activities (supports 0)
  learning_quality: string | null; // "0".."10" (or legacy 'excellent'|'good'|'average'|'weak') | null
  completion_status: 'partial' | 'completed';
  notes: string;
  logged_at: string;
  updated_at: string;
}

export interface DailyPlanItem {
  id: string;
  plan_date: string; // YYYY-MM-DD (Gregorian ISO key for strict date sorting, converted to Jalali in UI)
  category_id: string;
  category_title_snapshot: string;
  is_study: number; // 1 or 0
  activity_group_snapshot?: ActivityGroupType | null;
  subject_id: string | null;
  subject_name_snapshot: string | null;
  unit_id: string | null;
  unit_title_snapshot: string | null;
  study_type_id: string | null;
  study_type_title_snapshot: string | null;
  priority_code: string; // A1..C3
  priority_rank?: number;
  initial_predicted_minutes: number; // Immutable after first performance log!
  predicted_minutes: number; // Current predicted duration in minutes
  target_exercises?: number | null; // Optional target exercises/tests count for this study plan
  reminder_time?: string | null; // Optional HH:MM reminder time (e.g., "16:30")
  description: string;
  status: PlanStatus; // 'pending' | 'partial' | 'completed'
  custom_sort_order: number;
  created_at: string;
  updated_at: string;
  performance: PerformanceLog | null;
}

export interface PlanHistoryAudit {
  id: string;
  plan_id: string;
  previous_predicted_minutes: number;
  new_predicted_minutes: number;
  changed_at: string;
  reason: string;
}

/**
 * Section 9: Daily Time Budget (ظرف زمانی روزانه)
 */
export interface DailyTimeBudgetConfig {
  plan_date: string; // YYYY-MM-DD
  budget_minutes: number | null; // null if not defined for this day
  input_unit: 'hours' | 'minutes';
  updated_at: string;
}

export interface DashboardMetrics {
  range: 'today' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalPredictedStudyMinutes: number;
  totalActualStudyMinutes: number;
  studyTimeVarianceMinutes: number; // actual - predicted
  totalExercisesSolved: number;
  averageLearningQualityScore: number | null; // 0..10 weighted scale
  averageLearningQualityLabel: string;
  totalPlannedActivities: number;
  completedActivitiesCount: number;
  partialActivitiesCount: number;
  pendingActivitiesCount: number;
  incompleteOrPendingCount: number; // partial + pending
  adherencePercentage: number; // 0..100
  nonStudyActualMinutes: number;
  nonStudyPredictedMinutes: number;
  subjectBreakdown: Array<{
    subjectName: string;
    predictedMinutes: number;
    actualMinutes: number;
    exercisesCount: number;
    completedCount: number;
    totalCount: number;
  }>;
}

export interface CustomNumericGoal {
  id: string;
  title: string; // e.g., "حفظ لغت زبان انگلیسی" or "حل معادله ریاضی"
  unitLabel: string; // e.g., "لغت" or "تست" or "صفحه"
  targetValue: number;
  currentValue: number;
  color: 'indigo' | 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';
}

export interface DailyStudyGoalConfig {
  goal_date: string; // YYYY-MM-DD
  target_study_minutes: number; // e.g., 210 (3.5 hours)
  target_exercises_count: number; // e.g., 50 exercises/tests
  target_completed_tasks: number; // e.g., 3 completed study tasks
  custom_goals: CustomNumericGoal[];
  updated_at: string;
}

export interface AppBootstrapData {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  subjects: Subject[];
  engineInfo: {
    mode: 'sqlite-server' | 'tauri-sqlite';
    databasePath: string;
    version: string;
  };
}
