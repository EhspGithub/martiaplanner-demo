import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Award,
  X,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  CalendarArrowUp,
  ArrowLeftRight,
} from 'lucide-react';
import type { DailyPlanItem, LearningQuality } from '../types.ts';
import {
  toPersianDigits,
  formatHoursAndMinutesPersian,
  formatJalaliCompact,
  addDaysISO,
} from '../utils/jalali.ts';
import {
  classifyPlanActivityGroup,
  parseLearningQuality0To10,
} from '../utils/analyticsEngine.ts';
import { firebaseCloudSync } from '../services/firebaseCloudSync.ts';

interface PerformanceModalProps {
  plan: DailyPlanItem | null;
  dayPlans?: DailyPlanItem[];
  onClose: () => void;
  onSave: (
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: LearningQuality | null;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ) => Promise<void>;
  onResetPerformance: (planId: string) => Promise<void>;
  onTransferToNextDay?: (planId: string) => Promise<void>;
}

const SCORE_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getQualityScoreBadgeText(score: number | null): string {
  if (score === null) return 'عددی بین ۰ تا ۱۰ انتخاب کنید';
  if (score >= 9) return 'عالی (تسلط کامل)';
  if (score >= 7) return 'خوب (یادگیری مناسب)';
  if (score >= 5) return 'متوسط (نیاز به مرور)';
  if (score >= 3) return 'ضعیف (نیاز به تمرین بیشتر)';
  return 'بسیار ضعیف (نیاز به مطالعه مجدد)';
}

function getPriorityGroupLetter(priorityCode: string | undefined | null): 'A' | 'B' | 'C' {
  const firstChar = String(priorityCode || 'A1')
    .trim()
    .charAt(0)
    .toUpperCase();
  if (firstChar === 'B') return 'B';
  if (firstChar === 'C') return 'C';
  return 'A';
}

export const PerformanceModal: React.FC<PerformanceModalProps> = ({
  plan,
  dayPlans = [],
  onClose,
  onSave,
  onResetPerformance,
  onTransferToNextDay,
}) => {
  const [actualMinutes, setActualMinutes] = useState<string>('');
  const [exercisesCount, setExercisesCount] = useState<string>('0');
  const [learningQualityScore, setLearningQualityScore] = useState<number | null>(null);
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'partial'>('completed');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPriorityWarning, setShowPriorityWarning] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [isReadOnlyObserver, setIsReadOnlyObserver] = useState<boolean>(() =>
    firebaseCloudSync.isReadOnlyObserver()
  );

  useEffect(() => {
    const unsub = firebaseCloudSync.subscribeStatus((st) => {
      setIsReadOnlyObserver(
        st.connectionMode === 'cloud' && st.workspaceRole === 'observer'
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (plan) {
      setShowPriorityWarning(false);
      setShowTransferConfirm(false);
      if (plan.performance) {
        setActualMinutes(String(plan.performance.actual_minutes));
        setExercisesCount(
          plan.performance.exercises_count !== null &&
            plan.performance.exercises_count !== undefined
            ? String(plan.performance.exercises_count)
            : '0'
        );
        const parsedQ = parseLearningQuality0To10(plan.performance.learning_quality);
        setLearningQualityScore(parsedQ !== null ? Math.round(parsedQ) : null);
        setCompletionStatus(
          plan.performance.completion_status === 'partial' ? 'partial' : 'completed'
        );
        setNotes(plan.performance.notes || '');
      } else {
        setActualMinutes(String(plan.predicted_minutes));
        setExercisesCount(
          plan.target_exercises !== null && plan.target_exercises !== undefined
            ? String(plan.target_exercises)
            : '0'
        );
        // No default value on new entry so user consciously selects 0..10
        setLearningQualityScore(null);
        setCompletionStatus('completed');
        setNotes('');
      }
      setError(null);
    }
  }, [plan]);

  // Section 5: Smart Priority Order Warning
  const higherPriorityPendingInfo = useMemo(() => {
    if (!plan) {
      return {
        hasWarning: false,
        currentGroup: 'A' as const,
        missingGroupsLabel: '',
        pendingItems: [] as DailyPlanItem[],
      };
    }

    const currentGroup = getPriorityGroupLetter(plan.priority_code);
    if (currentGroup === 'A') {
      return {
        hasWarning: false,
        currentGroup,
        missingGroupsLabel: '',
        pendingItems: [] as DailyPlanItem[],
      };
    }

    const sameDayPending = dayPlans.filter(
      (p) =>
        p.id !== plan.id &&
        p.plan_date === plan.plan_date &&
        p.status === 'pending' &&
        !p.performance
    );

    const pendingItems = sameDayPending
      .filter((p) => {
        const g = getPriorityGroupLetter(p.priority_code);
        if (currentGroup === 'B') return g === 'A';
        if (currentGroup === 'C') return g === 'A' || g === 'B';
        return false;
      })
      .sort((a, b) => (a.priority_rank ?? 99) - (b.priority_rank ?? 99));

    const hasA = pendingItems.some((p) => getPriorityGroupLetter(p.priority_code) === 'A');
    const hasB = pendingItems.some((p) => getPriorityGroupLetter(p.priority_code) === 'B');
    const missingGroupsLabel = hasA && hasB ? 'A و B' : hasA ? 'A' : hasB ? 'B' : '';

    return {
      hasWarning: pendingItems.length > 0,
      currentGroup,
      missingGroupsLabel,
      pendingItems,
    };
  }, [plan, dayPlans]);

  if (!plan) return null;

  const activityGroup = classifyPlanActivityGroup(plan);
  const isEducational = activityGroup === 'educational' && Number(plan.is_study) === 1;
  const predictedMins = plan.initial_predicted_minutes || plan.predicted_minutes;
  const currentActualNum = actualMinutes === '' ? 0 : Number(actualMinutes) || 0;
  const diffMins = currentActualNum - predictedMins;

  const selectedActivityTitle = isEducational
    ? `${plan.subject_name_snapshot || 'درس'}${
        plan.unit_title_snapshot ? ` — ${plan.unit_title_snapshot}` : ''
      }`
    : `${plan.category_title_snapshot}${plan.description ? ` — ${plan.description}` : ''}`;

  const subtitleText = isEducational
    ? `${plan.subject_name_snapshot || 'درس'}${
        plan.unit_title_snapshot ? ` · ${plan.unit_title_snapshot}` : ''
      } · اولویت ${plan.priority_code}`
    : `${plan.category_title_snapshot} · اولویت ${plan.priority_code}`;

  const validateForm = (): { mins: number; exCount: number | null } | null => {
    const mins = Number(actualMinutes);
    if (actualMinutes === '' || isNaN(mins) || mins < 0 || mins > 720) {
      setError('مدت زمان واقعی باید عددی معتبر بین ۰ تا ۷۲۰ دقیقه باشد.');
      return null;
    }

    let exCount: number | null = null;
    if (isEducational) {
      exCount = exercisesCount === '' ? 0 : Math.max(0, Number(exercisesCount));
      if (isNaN(exCount)) {
        setError('تعداد تمرین یا تست باید عدد معتبر (۰ یا بیشتر) باشد.');
        return null;
      }
      if (learningQualityScore === null || learningQualityScore < 0 || learningQualityScore > 10) {
        setError('لطفاً کیفیت یادگیری این درس را با انتخاب عددی بین ۰ تا ۱۰ مشخص کنید.');
        return null;
      }
    }
    return { mins, exCount };
  };

  const executeSave = async () => {
    const validated = validateForm();
    if (!validated) return;

    try {
      setSubmitting(true);
      setError(null);
      await onSave(plan.id, {
        actual_minutes: validated.mins,
        exercises_count: isEducational ? validated.exCount : null,
        learning_quality:
          isEducational && learningQualityScore !== null ? String(learningQualityScore) : null,
        completion_status: completionStatus,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت عملکرد');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyObserver) {
      setError('حالت فقط‌خواندنی (والدین / مشاور) فعال است؛ امکان ثبت یا تغییر عملکرد وجود ندارد.');
      return;
    }
    const validated = validateForm();
    if (!validated) return;

    // Show Priority Order Warning if higher-priority activities on the same day are still pending
    if (higherPriorityPendingInfo.hasWarning && !showPriorityWarning) {
      setShowPriorityWarning(true);
      return;
    }

    await executeSave();
  };

  const handleReset = async () => {
    if (isReadOnlyObserver) {
      setError('حالت فقط‌خواندنی (والدین / مشاور) فعال است؛ امکان حذف عملکرد وجود ندارد.');
      return;
    }
    try {
      setSubmitting(true);
      await onResetPerformance(plan.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در بازنشانی وضعیت عملکرد');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (isReadOnlyObserver) {
      setError('حالت فقط‌خواندنی (والدین / مشاور) فعال است؛ امکان انتقال فعالیت وجود ندارد.');
      return;
    }
    if (!onTransferToNextDay) return;
    try {
      setSubmitting(true);
      setError(null);
      await onTransferToNextDay(plan.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در انتقال فعالیت به روز بعد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[86vh] flex flex-col overflow-hidden">
        {/* 1.2 Compact Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap truncate">
                {showPriorityWarning
                  ? 'هشدار ترتیب اولویت فعالیت‌ها'
                  : showTransferConfirm
                  ? 'انتقال به برنامه روز بعد'
                  : 'ثبت عملکرد'}
              </h2>
              {plan.transferred_from_date && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold shrink-0">
                  <ArrowLeftRight className="w-3 h-3" />
                  منتقل‌شده از {formatJalaliCompact(plan.transferred_from_date)}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap truncate tabular-nums">
              {subtitleText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 5: Priority Order Warning View (Preserves all entered form values!) */}
        {showPriorityWarning ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              <div className="rounded-2xl bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                      هشدار ترتیب اولویت فعالیت‌ها
                    </h3>
                    <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-6 mt-1 text-justify">
                      شما در حال ثبت عملکرد برای فعالیتی با اولویت{' '}
                      <span className="font-black underline">
                        {higherPriorityPendingInfo.currentGroup} ({plan.priority_code})
                      </span>{' '}
                      هستید، در حالی که هنوز فعالیت‌های با اولویت بالاتر{' '}
                      <span className="font-black underline">
                        {higherPriorityPendingInfo.missingGroupsLabel}
                      </span>{' '}
                      در برنامه این روز انجام نشده‌اند. آیا مطمئن هستید که می‌خواهید ادامه دهید؟
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800/60 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400">
                      اولویت‌های انجام‌نشده:
                    </span>
                    <span className="font-black text-rose-600 dark:text-rose-400">
                      اولویت {higherPriorityPendingInfo.missingGroupsLabel} (
                      {toPersianDigits(higherPriorityPendingInfo.pendingItems.length)} مورد)
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {higherPriorityPendingInfo.pendingItems.map((item) => {
                      const itemTitle =
                        Number(item.is_study) === 1
                          ? `${item.subject_name_snapshot || 'درس'}${
                              item.unit_title_snapshot ? ` — ${item.unit_title_snapshot}` : ''
                            }`
                          : `${item.category_title_snapshot}${
                              item.description ? ` — ${item.description}` : ''
                            }`;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/50"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {itemTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black shrink-0">
                            {item.priority_code}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">
                      فعالیت انتخاب‌شده:
                    </span>
                    <span className="font-black text-indigo-700 dark:text-indigo-300 truncate">
                      {selectedActivityTitle} ({plan.priority_code})
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}
            </div>

            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowPriorityWarning(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                بازگشت و بررسی فعالیت‌ها
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executeSave}
                className="rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {submitting ? 'در حال ثبت...' : 'تأیید و ادامه ثبت'}
              </button>
            </div>
          </div>
        ) : showTransferConfirm ? (
          /* Section 6: Transfer to Next Day Confirmation View */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              <div className="rounded-2xl bg-indigo-50/95 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/70 p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CalendarArrowUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">
                      انتقال فعالیت به برنامه روز بعد
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-6 mt-1 text-justify">
                      این فعالیت به برنامه روز بعد منتقل خواهد شد و اطلاعات ثبت‌شده آن حفظ می‌شوند. آیا ادامه می‌دهید؟
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/70 dark:border-indigo-800/60 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-500 dark:text-slate-400">عنوان فعالیت:</span>
                    <span className="font-black text-slate-800 dark:text-slate-100 truncate">
                      {selectedActivityTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-500 dark:text-slate-400">از تاریخ:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatJalaliCompact(plan.plan_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-500 dark:text-slate-400">به تاریخ (روز بعد):</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400">
                      {formatJalaliCompact(addDaysISO(plan.plan_date, 1))}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}
            </div>

            <div className="shrink-0 grid grid-cols-2 gap-2 px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowTransferConfirm(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmTransfer}
                className="rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {submitting ? 'در حال انتقال...' : 'تأیید و انتقال'}
              </button>
            </div>
          </div>
        ) : (
          /* Scrollable Form Body + Pinned Footer */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {isReadOnlyObserver && (
                <div className="rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-3 py-2 text-[11px] font-extrabold text-sky-800 dark:text-sky-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>حالت «والدین / مشاور (فقط‌خواندنی)» فعال است — فقط مشاهده جزئیات مجاز است.</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Subtle notice if higher priorities are pending */}
              {higherPriorityPendingInfo.hasWarning && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 px-3 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">
                    {toPersianDigits(higherPriorityPendingInfo.pendingItems.length)} فعالیت با اولویت بالاتر (
                    {higherPriorityPendingInfo.missingGroupsLabel}) در امروز هنوز انجام نشده است.
                  </span>
                </div>
              )}

              {/* 1.3 Initial Prediction & Comparison (2 Compact Boxes Side-by-Side) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    پیش‌بینی اولیه
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                    {formatHoursAndMinutesPersian(predictedMins)}
                  </span>
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    مقایسه:
                  </span>
                  <span
                    className={`text-xs font-extrabold tabular-nums mt-0.5 block ${
                      diffMins === 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : diffMins > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {diffMins === 0
                      ? 'مطابق پیش‌بینی'
                      : diffMins > 0
                      ? `${toPersianDigits(diffMins)} دقیقه بیشتر از پیش‌بینی`
                      : `${toPersianDigits(Math.abs(diffMins))} دقیقه کمتر از پیش‌بینی`}
                  </span>
                </div>
              </div>

              {/* 1.4 Completion Status (Two Compact Cards in One Row, No Helper Text Below) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  وضعیت انجام فعالیت
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCompletionStatus('completed')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                      completionStatus === 'completed'
                        ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>تکمیل شده</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletionStatus('partial')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                      completionStatus === 'partial'
                        ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>ناقص</span>
                  </button>
                </div>
              </div>

              {/* 12-1: Actual Time & Exercises Solved in a 2-Column Grid on Mobile & Desktop */}
              <div className={`grid ${isEducational ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate">
                    زمان واقعی فعالیت (دقیقه)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    required
                    value={actualMinutes}
                    onChange={(e) => setActualMinutes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                    placeholder="مثلاً 60"
                  />
                </div>

                {isEducational && (
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate">
                      تعداد تمرین و تست
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={2000}
                      required
                      value={exercisesCount}
                      onChange={(e) => setExercisesCount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                      placeholder="مثلاً 20 یا 0"
                    />
                  </div>
                )}
              </div>

              {/* 12-2 & 12-3: Learning Quality Evaluation */}
              {isEducational && (
                <div className="rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/80 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>ارزیابی کیفیت عملکرد</span>
                    </label>
                    <span
                      className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg tabular-nums truncate ${
                        learningQualityScore === null
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          : learningQualityScore >= 8
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : learningQualityScore >= 5
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {learningQualityScore !== null
                        ? `نمره ${toPersianDigits(
                            learningQualityScore
                          )} از ۱۰ · ${getQualityScoreBadgeText(learningQualityScore)}`
                        : 'انتخاب نشده'}
                    </span>
                  </div>

                  {/* 0..10 Colored Number Selector Cards (Low=Red, Mid=Purple/Indigo, High=Green) */}
                  <div className="grid grid-cols-11 gap-1" dir="ltr">
                    {SCORE_NUMBERS.map((num) => {
                      const isSelected = learningQualityScore === num;
                      const colorClass = isSelected
                        ? num >= 8
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105 ring-2 ring-emerald-500/30'
                          : num >= 5
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs scale-105 ring-2 ring-violet-500/30'
                          : 'bg-rose-600 text-white border-rose-600 shadow-xs scale-105 ring-2 ring-rose-500/30'
                        : num >= 8
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                        : num >= 5
                        ? 'bg-violet-50/80 dark:bg-violet-950/35 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60 hover:bg-violet-100'
                        : 'bg-rose-50/80 dark:bg-rose-950/35 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100';

                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setLearningQualityScore(num)}
                          className={`h-8 rounded-lg border text-xs font-extrabold tabular-nums transition-all cursor-pointer flex items-center justify-center ${colorClass}`}
                        >
                          {toPersianDigits(num)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 1.8 Compact Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  توضیحات تکمیلی (اختیاری)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isEducational
                      ? 'نکات مهم مطالعه، مباحث باقی‌مانده یا علت تغییر زمان...'
                      : 'توضیحات اختیاری درباره نحوه انجام فعالیت...'
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Section 6: Transfer to Next Day Button */}
              {onTransferToNextDay && plan.status !== 'completed' && !isReadOnlyObserver && (
                <button
                  type="button"
                  onClick={() => setShowTransferConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/75 dark:bg-indigo-950/35 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 py-2.5 px-3 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                >
                  <CalendarArrowUp className="w-4 h-4 shrink-0" />
                  <span>انتقال این فعالیت به برنامه روز بعد</span>
                </button>
              )}
            </div>

            {/* Pinned Footer Actions */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95">
              {plan.performance && !isReadOnlyObserver ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleReset}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-900/60 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer min-h-[38px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>حذف عملکرد</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[38px]"
                >
                  {isReadOnlyObserver ? 'بستن' : 'انصراف'}
                </button>
                {!isReadOnlyObserver && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer min-h-[38px]"
                  >
                    {submitting ? 'در حال ذخیره...' : 'ثبت عملکرد'}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
