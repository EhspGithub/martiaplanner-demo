import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Award,
  X,
  RotateCcw,
} from 'lucide-react';
import type { DailyPlanItem, LearningQuality } from '../types.ts';
import {
  toPersianDigits,
  formatHoursAndMinutesPersian,
} from '../utils/jalali.ts';
import {
  classifyPlanActivityGroup,
  parseLearningQuality0To10,
} from '../utils/analyticsEngine.ts';

interface PerformanceModalProps {
  plan: DailyPlanItem | null;
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

export const PerformanceModal: React.FC<PerformanceModalProps> = ({
  plan,
  onClose,
  onSave,
  onResetPerformance,
}) => {
  const [actualMinutes, setActualMinutes] = useState<string>('');
  const [exercisesCount, setExercisesCount] = useState<string>('0');
  const [learningQualityScore, setLearningQualityScore] = useState<number | null>(null);
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'partial'>('completed');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
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
        setExercisesCount('0');
        // No default value on new entry so user consciously selects 0..10
        setLearningQualityScore(null);
        setCompletionStatus('completed');
        setNotes('');
      }
      setError(null);
    }
  }, [plan]);

  if (!plan) return null;

  const activityGroup = classifyPlanActivityGroup(plan);
  const isEducational = activityGroup === 'educational' && Number(plan.is_study) === 1;
  const predictedMins = plan.initial_predicted_minutes || plan.predicted_minutes;
  const currentActualNum = actualMinutes === '' ? 0 : Number(actualMinutes) || 0;
  const diffMins = currentActualNum - predictedMins;

  const subtitleText = isEducational
    ? `${plan.subject_name_snapshot || 'درس'}${
        plan.unit_title_snapshot ? ` · ${plan.unit_title_snapshot}` : ''
      } · اولویت ${plan.priority_code}`
    : `${plan.category_title_snapshot} · اولویت ${plan.priority_code}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(actualMinutes);
    if (actualMinutes === '' || isNaN(mins) || mins < 0 || mins > 720) {
      setError('مدت زمان واقعی باید عددی معتبر بین ۰ تا ۷۲۰ دقیقه باشد.');
      return;
    }

    let exCount: number | null = null;
    if (isEducational) {
      exCount = exercisesCount === '' ? 0 : Math.max(0, Number(exercisesCount));
      if (isNaN(exCount)) {
        setError('تعداد تمرین یا تست باید عدد معتبر (۰ یا بیشتر) باشد.');
        return;
      }
      if (learningQualityScore === null || learningQualityScore < 0 || learningQualityScore > 10) {
        setError('لطفاً کیفیت یادگیری این درس را با انتخاب عددی بین ۰ تا ۱۰ مشخص کنید.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave(plan.id, {
        actual_minutes: mins,
        exercises_count: isEducational ? exCount : null,
        learning_quality: isEducational && learningQualityScore !== null
          ? String(learningQualityScore)
          : null,
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

  const handleReset = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden">
        {/* 1.2 Compact Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap truncate">
              ثبت عملکرد
            </h2>
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

        {/* Scrollable Form Body + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {error && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                {error}
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

            {/* 1.5 & 1.6 Actual Time & Exercises Solved (Compact Inputs, Preset Chips Removed) */}
            <div className={`grid grid-cols-1 ${isEducational ? 'sm:grid-cols-2' : ''} gap-3`}>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تعداد تمرین یا تست حل‌شده
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

            {/* 1.7 Learning Quality Evaluation (0 to 10 Scale, Only for Educational Activities, No Default Value) */}
            {isEducational && (
              <div className="rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/80 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>ارزیابی کیفیت عملکرد (۰ تا ۱۰)</span>
                  </label>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg tabular-nums ${
                      learningQualityScore === null
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {learningQualityScore !== null
                      ? `نمره ${toPersianDigits(learningQualityScore)} از ۱۰ · ${getQualityScoreBadgeText(
                          learningQualityScore
                        )}`
                      : 'انتخاب نشده'}
                  </span>
                </div>

                {/* 0..10 Compact Number Selector Buttons */}
                <div className="grid grid-cols-11 gap-1" dir="ltr">
                  {SCORE_NUMBERS.map((num) => {
                    const isSelected = learningQualityScore === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setLearningQualityScore(num)}
                        className={`h-8 rounded-lg text-xs font-extrabold tabular-nums transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? num >= 8
                              ? 'bg-emerald-600 text-white shadow-xs scale-105'
                              : num >= 5
                              ? 'bg-indigo-600 text-white shadow-xs scale-105'
                              : 'bg-rose-600 text-white shadow-xs scale-105'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700'
                        }`}
                      >
                        {toPersianDigits(num)}
                      </button>
                    );
                  })}
                </div>

                {/* Touch Slider + Endpoint Labels */}
                <div className="space-y-1 pt-0.5">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    dir="ltr"
                    value={learningQualityScore ?? 5}
                    onChange={(e) => setLearningQualityScore(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>۱۰ = عالی</span>
                    <span>۰ = بسیار ضعیف</span>
                  </div>
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
          </div>

          {/* Pinned Footer Actions */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95">
            {plan.performance ? (
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
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer min-h-[38px]"
              >
                {submitting ? 'در حال ذخیره...' : 'ثبت عملکرد'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
