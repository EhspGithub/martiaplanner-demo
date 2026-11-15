import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Clock,
  FileCheck2,
  CheckCircle2,
  Plus,
  Minus,
  Edit3,
  Check,
  X,
  Trash2,
  Sparkles,
  Calendar,
  Trophy,
} from 'lucide-react';
import type { CustomNumericGoal, DailyPlanItem, DailyStudyGoalConfig } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  getPersianWeekDays,
  toPersianDigits,
  formatMinutesPersian,
  formatJalaliFull,
} from '../utils/jalali.ts';

const GOAL_COLOR_STYLES: Record<
  CustomNumericGoal['color'],
  {
    bar: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  indigo: {
    bar: 'from-indigo-600 to-violet-500',
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/80 dark:border-indigo-900/50',
  },
  emerald: {
    bar: 'from-emerald-600 to-teal-500',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-900/50',
  },
  blue: {
    bar: 'from-blue-600 to-cyan-500',
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/80 dark:border-blue-900/50',
  },
  amber: {
    bar: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-900/50',
  },
  rose: {
    bar: 'from-rose-600 to-pink-500',
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/80 dark:border-rose-900/50',
  },
  purple: {
    bar: 'from-purple-600 to-fuchsia-500',
    bg: 'bg-purple-50/70 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/80 dark:border-purple-900/50',
  },
};

export const DailyNumericGoalsPanel: React.FC = () => {
  const todayIso = getTodayISO();
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [goalConfig, setGoalConfig] = useState<DailyStudyGoalConfig | null>(null);
  const [dayPlans, setDayPlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Inline Editing for the 3 Core Numeric Targets
  const [isEditingTargets, setIsEditingTargets] = useState<boolean>(false);
  const [editStudyHours, setEditStudyHours] = useState<string>('3');
  const [editStudyMinsPart, setEditStudyMinsPart] = useState<string>('30');
  const [editExercisesTarget, setEditExercisesTarget] = useState<string>('50');
  const [editTasksTarget, setEditTasksTarget] = useState<string>('3');

  // Add Custom Numeric Goal Form
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [newCustomTitle, setNewCustomTitle] = useState<string>('');
  const [newCustomUnit, setNewCustomUnit] = useState<string>('تست');
  const [newCustomTarget, setNewCustomTarget] = useState<string>('20');
  const [newCustomCurrent, setNewCustomCurrent] = useState<string>('0');
  const [newCustomColor, setNewCustomColor] =
    useState<CustomNumericGoal['color']>('purple');

  const weekDays = getPersianWeekDays(todayIso);

  const loadDayGoalsAndActuals = useCallback(async (isoDate: string) => {
    setLoading(true);
    try {
      const [cfg, plans] = await Promise.all([
        api.getDailyGoal(isoDate),
        api.getPlansByDate(isoDate),
      ]);
      setGoalConfig(cfg);
      setDayPlans(plans);
      const hrs = Math.floor(cfg.target_study_minutes / 60);
      const mins = cfg.target_study_minutes % 60;
      setEditStudyHours(String(hrs));
      setEditStudyMinsPart(String(mins));
      setEditExercisesTarget(String(cfg.target_exercises_count));
      setEditTasksTarget(String(cfg.target_completed_tasks));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDayGoalsAndActuals(selectedDate);
  }, [selectedDate, loadDayGoalsAndActuals]);

  // Calculate live actuals for the selected day from logged study plans
  const studyPlans = dayPlans.filter((p) => Number(p.is_study) === 1);
  const actualStudyMinutes = studyPlans.reduce(
    (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
    0
  );
  const actualExercisesCount = studyPlans.reduce(
    (sum, p) => sum + Number(p.performance?.exercises_count || 0),
    0
  );
  const actualCompletedStudyTasks = studyPlans.filter(
    (p) => p.status === 'completed'
  ).length;

  const persistGoals = async (nextConfig: DailyStudyGoalConfig) => {
    setSaving(true);
    try {
      const saved = await api.saveDailyGoal({
        goal_date: nextConfig.goal_date,
        target_study_minutes: nextConfig.target_study_minutes,
        target_exercises_count: nextConfig.target_exercises_count,
        target_completed_tasks: nextConfig.target_completed_tasks,
        custom_goals: nextConfig.custom_goals,
      });
      setGoalConfig(saved);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCoreTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalConfig) return;
    const totalMinutes =
      Math.max(0, Number(editStudyHours || 0)) * 60 +
      Math.max(0, Number(editStudyMinsPart || 0));
    const finalStudyMinutes = Math.max(15, totalMinutes);
    const finalExercises = Math.max(1, Number(editExercisesTarget || 1));
    const finalTasks = Math.max(1, Number(editTasksTarget || 1));

    await persistGoals({
      ...goalConfig,
      target_study_minutes: finalStudyMinutes,
      target_exercises_count: finalExercises,
      target_completed_tasks: finalTasks,
    });
    setIsEditingTargets(false);
  };

  const handleAddCustomGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalConfig || !newCustomTitle.trim()) return;

    const newItem: CustomNumericGoal = {
      id: `cgoal-${Date.now().toString(36)}`,
      title: newCustomTitle.trim(),
      unitLabel: newCustomUnit.trim() || 'مورد',
      targetValue: Math.max(1, Number(newCustomTarget || 10)),
      currentValue: Math.max(0, Number(newCustomCurrent || 0)),
      color: newCustomColor,
    };

    await persistGoals({
      ...goalConfig,
      custom_goals: [...(goalConfig.custom_goals || []), newItem],
    });

    setNewCustomTitle('');
    setNewCustomCurrent('0');
    setShowAddCustom(false);
  };

  const handleUpdateCustomProgress = async (goalId: string, delta: number) => {
    if (!goalConfig) return;
    const updated = (goalConfig.custom_goals || []).map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        currentValue: Math.max(0, g.currentValue + delta),
      };
    });
    await persistGoals({
      ...goalConfig,
      custom_goals: updated,
    });
  };

  const handleDeleteCustomGoal = async (goalId: string) => {
    if (!goalConfig) return;
    const updated = (goalConfig.custom_goals || []).filter((g) => g.id !== goalId);
    await persistGoals({
      ...goalConfig,
      custom_goals: updated,
    });
  };

  const targetStudyMinutes = goalConfig?.target_study_minutes || 210;
  const targetExercises = goalConfig?.target_exercises_count || 50;
  const targetTasks = goalConfig?.target_completed_tasks || 3;

  const studyPct = Math.min(
    100,
    Math.round((actualStudyMinutes / Math.max(1, targetStudyMinutes)) * 100)
  );
  const exercisesPct = Math.min(
    100,
    Math.round((actualExercisesCount / Math.max(1, targetExercises)) * 100)
  );
  const tasksPct = Math.min(
    100,
    Math.round((actualCompletedStudyTasks / Math.max(1, targetTasks)) * 100)
  );

  const customGoals = goalConfig?.custom_goals || [];
  const overallAvgPct = Math.round(
    (studyPct +
      exercisesPct +
      tasksPct +
      customGoals.reduce(
        (acc, g) =>
          acc + Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100)),
        0
      )) /
      (3 + customGoals.length)
  );

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
      {/* Top Header & Day Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                اهداف مطالعاتی عددی روزانه و نوار پیشرفت
              </h2>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                · {toPersianDigits(overallAvgPct)}٪ تحقق کل اهداف روز
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              هدف ساعت مطالعه، تعداد تست روزانه و اهداف عددی دلخواه خود را برای هر روز تنظیم کن و پیشرفتت را ببین ({formatJalaliFull(selectedDate)})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingTargets(!isEditingTargets)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px]"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>ویرایش اعداد هدف این روز</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن هدف عددی جدید</span>
          </button>
        </div>
      </div>

      {/* Interactive Day-of-Week Selector Strip so student can set numeric goals for ANY day */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span>انتخاب روز:</span>
        </div>
        {weekDays.map((wd) => {
          const isSelected = wd.isoDate === selectedDate;
          return (
            <button
              key={wd.isoDate}
              type="button"
              onClick={() => setSelectedDate(wd.isoDate)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {wd.weekdayName} {wd.dayNumberPersian} {wd.monthName}
              {wd.isToday ? ' (امروز)' : ''}
            </button>
          );
        })}
      </div>

      {/* Inline Form to Edit Core Daily Numeric Goals (Target Study Hours/Minutes, Target Tests, Target Tasks) */}
      {isEditingTargets && (
        <form
          onSubmit={handleSaveCoreTargets}
          className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>تنظیم اعداد هدف برای روز «{formatJalaliFull(selectedDate)}»</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsEditingTargets(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target Study Time (Hours + Minutes) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ۱. هدف زمان مطالعه روزانه
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={16}
                    value={editStudyHours}
                    onChange={(e) => setEditStudyHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                  />
                  <span className="absolute left-2.5 top-2 text-[11px] text-slate-400">
                    ساعت
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={editStudyMinsPart}
                    onChange={(e) => setEditStudyMinsPart(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                  />
                  <span className="absolute left-2.5 top-2 text-[11px] text-slate-400">
                    دقیقه
                  </span>
                </div>
              </div>
            </div>

            {/* Target Exercises / Tests Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ۲. هدف تعداد تست و تمرین روزانه
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={editExercisesTarget}
                  onChange={(e) => setEditExercisesTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                />
                <span className="absolute left-3 top-2 text-[11px] text-slate-400">
                  تست / تمرین
                </span>
              </div>
            </div>

            {/* Target Completed Study Lessons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ۳. هدف تعداد درس‌های تکمیل‌شده
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editTasksTarget}
                  onChange={(e) => setEditTasksTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                />
                <span className="absolute left-3 top-2 text-[11px] text-slate-400">
                  درس کامل
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingTargets(false)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره اهداف روز</span>
            </button>
          </div>
        </form>
      )}

      {/* Inline Form to Add a Custom Numeric Goal */}
      {showAddCustom && (
        <form
          onSubmit={handleAddCustomGoal}
          className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
              افزودن هدف عددی دلخواه جدید (با نوار پیشرفت اختصاصی)
            </h3>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان هدف مطالعاتی
              </label>
              <input
                type="text"
                required
                value={newCustomTitle}
                onChange={(e) => setNewCustomTitle(e.target.value)}
                placeholder="مثلاً: حل تست ریاضی / حفظ لغت زبان / مطالعه صفحات علوم"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عدد هدف (سقف)
              </label>
              <input
                type="number"
                min={1}
                required
                value={newCustomTarget}
                onChange={(e) => setNewCustomTarget(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                انجام‌شده فعلی
              </label>
              <input
                type="number"
                min={0}
                value={newCustomCurrent}
                onChange={(e) => setNewCustomCurrent(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                واحد شمارش
              </label>
              <input
                type="text"
                value={newCustomUnit}
                onChange={(e) => setNewCustomUnit(e.target.value)}
                placeholder="تست / صفحه / لغت / دقیقه"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                رنگ نوار پیشرفت:
              </span>
              {(['purple', 'indigo', 'emerald', 'blue', 'amber', 'rose'] as const).map(
                (clr) => (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => setNewCustomColor(clr)}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${
                      GOAL_COLOR_STYLES[clr].bar
                    } cursor-pointer transition-transform ${
                      newCustomColor === clr
                        ? 'scale-115 ring-2 ring-offset-2 ring-indigo-500'
                        : 'opacity-70'
                    }`}
                  />
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت هدف جدید</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Progress Bars Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CORE GOAL 1: Daily Study Hours / Minutes Progress Bar */}
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/25 p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    هدف ساعت مطالعه روزانه
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    انجام‌شده: {formatMinutesPersian(actualStudyMinutes, true)} از هدف{' '}
                    {formatMinutesPersian(targetStudyMinutes, true)}
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {toPersianDigits(studyPct)}٪
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-3.5 w-full rounded-full bg-white dark:bg-slate-800 border border-emerald-200/60 dark:border-slate-700 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${studyPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              {actualStudyMinutes >= targetStudyMinutes ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>آفرین! هدف ساعت مطالعه این روز تکمیل شد 🎉</span>
                </span>
              ) : (
                <span>
                  {toPersianDigits(targetStudyMinutes - actualStudyMinutes)} دقیقه دیگر تا رسیدن به هدف امروز
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingTargets(true)}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                تغییر هدف
              </button>
            </div>
          </div>

          {/* CORE GOAL 2: Daily Exercises & Tests Solved Progress Bar */}
          <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/25 p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    هدف تعداد تست و تمرین روزانه
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    حل‌شده: {toPersianDigits(actualExercisesCount)} تمرین/تست از هدف{' '}
                    {toPersianDigits(targetExercises)} مورد
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  {toPersianDigits(exercisesPct)}٪
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-3.5 w-full rounded-full bg-white dark:bg-slate-800 border border-blue-200/60 dark:border-slate-700 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-l from-blue-600 to-cyan-500 transition-all duration-500"
                style={{ width: `${exercisesPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              {actualExercisesCount >= targetExercises ? (
                <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>عالی! به هدف تعداد تست و تمرین امروز رسیدی 🎉</span>
                </span>
              ) : (
                <span>
                  {toPersianDigits(targetExercises - actualExercisesCount)} تست/تمرین دیگر تا رسیدن به هدف
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingTargets(true)}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                تغییر هدف
              </button>
            </div>
          </div>

          {/* CORE GOAL 3: Completed Study Tasks Progress Bar */}
          <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/25 p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    هدف تکمیل برنامه‌های درسی روز
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    تکمیل‌شده: {toPersianDigits(actualCompletedStudyTasks)} درس از هدف{' '}
                    {toPersianDigits(targetTasks)} درس کامل
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {toPersianDigits(tasksPct)}٪
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-3.5 w-full rounded-full bg-white dark:bg-slate-800 border border-indigo-200/60 dark:border-slate-700 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-l from-indigo-600 to-violet-500 transition-all duration-500"
                style={{ width: `${tasksPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              {actualCompletedStudyTasks >= targetTasks ? (
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>تمام درس‌های هدف‌گذاری‌شده امروز کامل شدند 🎉</span>
                </span>
              ) : (
                <span>
                  {toPersianDigits(targetTasks - actualCompletedStudyTasks)} درس دیگر تا تکمیل هدف روزانه
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingTargets(true)}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                تغییر هدف
              </button>
            </div>
          </div>

          {/* CUSTOM USER-DEFINED NUMERIC GOALS WITH INTERACTIVE + / - BUTTONS */}
          {customGoals.map((cg) => {
            const style = GOAL_COLOR_STYLES[cg.color] || GOAL_COLOR_STYLES.purple;
            const pct = Math.min(
              100,
              Math.round((cg.currentValue / Math.max(1, cg.targetValue)) * 100)
            );
            return (
              <div
                key={cg.id}
                className={`rounded-2xl border ${style.border} ${style.bg} p-5 space-y-3.5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-900/70 ${style.text} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {cg.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        پیشرفت فعلی: {toPersianDigits(cg.currentValue)} از{' '}
                        {toPersianDigits(cg.targetValue)} {cg.unitLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-lg font-black ${style.text} tabular-nums`}>
                      {toPersianDigits(pct)}٪
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomGoal(cg.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="حذف این هدف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-3.5 w-full rounded-full bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-l ${style.bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Quick Increment / Decrement Controls */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    {cg.currentValue >= cg.targetValue
                      ? 'هدف تکمیل شد! 🎉'
                      : `${toPersianDigits(cg.targetValue - cg.currentValue)} ${
                          cg.unitLabel
                        } تا هدف`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateCustomProgress(cg.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                      title="کاهش ۱ واحد"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCustomProgress(cg.id, 1)}
                      className="px-2.5 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 cursor-pointer tabular-nums"
                    >
                      +{toPersianDigits(1)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCustomProgress(cg.id, 5)}
                      className="px-2.5 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold hover:bg-indigo-700 cursor-pointer tabular-nums"
                    >
                      +{toPersianDigits(5)} {cg.unitLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
