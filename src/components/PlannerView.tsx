import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  BookOpen,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ListOrdered,
  FileCheck2,
  Award,
  X,
  Trophy,
  Flame,
  Target,
  Sparkles,
  Calculator,
  Atom,
  Languages,
  Globe2,
  Compass,
  Cpu,
  Smartphone,
  Tv,
  Gamepad2,
  Dumbbell,
  Bell,
  Timer,
  AlertTriangle,
  ChevronDown,
  Calculator as FormulaIcon,
} from 'lucide-react';
import type {
  ActivityCategory,
  StudyActivityType,
  PriorityLevel,
  Subject,
  DailyPlanItem,
  LearningQuality,
  DailyStudyGoalConfig,
  DailyTimeBudgetConfig,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  getTomorrowISO,
  addDaysISO,
  formatJalaliFull,
  formatJalaliCompact,
  formatJalaliWeekdaySlash,
  getPersianWeekDays,
  toPersianDigits,
  formatMinutesPersian,
  formatHoursAndMinutesPersian,
} from '../utils/jalali.ts';
import {
  getCardGradientTheme,
  calculateActualToPredictedRatioPct,
  parseLearningQuality0To10,
  evaluateDayPerformance,
  classifyPlanActivityGroup,
} from '../utils/analyticsEngine.ts';
import { PerformanceModal } from './PerformanceModal.tsx';
import { ShamsiDateField } from './PerformanceAnalyticsView.tsx';
import {
  StudyReminderManager,
  getSmartReminderEnabled,
  SMART_REMINDER_EVENT_NAME,
} from './StudyReminderManager.tsx';

interface PlannerViewProps {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  subjects: Subject[];
  onDataMutated: () => void;
  onNavigateToDefinitions?: () => void;
}

const REMINDER_TIME_OPTIONS: string[] = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
];

function getSubjectIconComponent(
  subjectName: string | null,
  categoryTitle: string,
  isStudy: boolean
) {
  if (!isStudy) {
    if (categoryTitle.includes('گوشی')) return Smartphone;
    if (categoryTitle.includes('تلویزیون')) return Tv;
    if (categoryTitle.includes('بازی')) return Gamepad2;
    if (categoryTitle.includes('ورزش')) return Dumbbell;
    return Coffee;
  }
  const name = subjectName || '';
  if (name.includes('ریاضی')) return Calculator;
  if (name.includes('علوم') || name.includes('فیزیک') || name.includes('شیمی') || name.includes('زیست'))
    return Atom;
  if (name.includes('انگلیسی') || name.includes('زبان') || name.includes('عربی')) return Languages;
  if (name.includes('اجتماعی') || name.includes('تاریخ') || name.includes('جغرافیا')) return Globe2;
  if (name.includes('فناوری')) return Cpu;
  if (name.includes('قرآن') || name.includes('آسمان') || name.includes('هدی')) return Compass;
  return BookOpen;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  categories,
  studyTypes,
  priorities,
  subjects,
  onDataMutated,
  onNavigateToDefinitions,
}) => {
  const todayIso = getTodayISO();
  const tomorrowIso = getTomorrowISO();

  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'weekly'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [sortBy, setSortBy] = useState<'priority' | 'custom'>('priority');

  // Section 1, 2, 3: Accordion & Smart Reminder visibility states
  const [smartReminderEnabled, setSmartReminderEnabled] = useState<boolean>(() =>
    getSmartReminderEnabled()
  );
  const [isBudgetAccordionOpen, setIsBudgetAccordionOpen] = useState<boolean>(false);
  const [isMetricsAccordionOpen, setIsMetricsAccordionOpen] = useState<boolean>(false);

  useEffect(() => {
    const syncReminderSetting = () => {
      setSmartReminderEnabled(getSmartReminderEnabled());
    };
    window.addEventListener(SMART_REMINDER_EVENT_NAME, syncReminderSetting);
    return () => window.removeEventListener(SMART_REMINDER_EVENT_NAME, syncReminderSetting);
  }, []);

  const [dailyPlans, setDailyPlans] = useState<DailyPlanItem[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<DailyPlanItem[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyStudyGoalConfig | null>(null);
  const [timeBudget, setTimeBudget] = useState<DailyTimeBudgetConfig | null>(null);
  const [budgetUnit, setBudgetUnit] = useState<'hours' | 'minutes'>('hours');
  const [budgetInputValue, setBudgetInputValue] = useState<string>('6');
  const [savingBudget, setSavingBudget] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showPlanForm, setShowPlanForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<DailyPlanItem | null>(null);

  const defaultStudyCategory = categories.find((c) => Number(c.is_study) === 1) || categories[0];
  const [formCategoryId, setFormCategoryId] = useState<string>(defaultStudyCategory?.id || '');
  const [formSubjectId, setFormSubjectId] = useState<string>(subjects[0]?.id || '');
  const [formUnitId, setFormUnitId] = useState<string>(subjects[0]?.units[0]?.id || '');
  const [formStudyTypeId, setFormStudyTypeId] = useState<string>(studyTypes[0]?.id || '');
  const [formPriorityCode, setFormPriorityCode] = useState<string>('A1');
  const [formPredictedMinutes, setFormPredictedMinutes] = useState<string>('60');
  const [formTargetExercises, setFormTargetExercises] = useState<string>('');
  const [formReminderTime, setFormReminderTime] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const [activePerformancePlan, setActivePerformancePlan] = useState<DailyPlanItem | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<DailyPlanItem | null>(null);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, ActivityCategory>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  useEffect(() => {
    if (activeTab === 'today') {
      setSelectedDate(todayIso);
    } else if (activeTab === 'tomorrow') {
      setSelectedDate(tomorrowIso);
    }
  }, [activeTab, todayIso, tomorrowIso]);

  const selectedSubjectObj = useMemo(
    () => subjects.find((s) => s.id === formSubjectId) || null,
    [subjects, formSubjectId]
  );

  useEffect(() => {
    if (!editingPlan && selectedSubjectObj) {
      const firstUnit = selectedSubjectObj.units[0];
      setFormUnitId(firstUnit ? firstUnit.id : '');
    }
  }, [formSubjectId, selectedSubjectObj, editingPlan]);

  const loadDailyData = async (dateStr: string) => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, goalData, budgetData] = await Promise.all([
        api.getPlansByDate(dateStr),
        api.getDailyGoal(dateStr),
        api.getTimeBudget(dateStr),
      ]);
      setDailyPlans(plansData);
      setDailyGoal(goalData);
      setTimeBudget(budgetData);
      if (budgetData && budgetData.budget_minutes !== null && budgetData.budget_minutes > 0) {
        const bm = budgetData.budget_minutes;
        if (bm % 60 === 0) {
          setBudgetUnit('hours');
          setBudgetInputValue(String(bm / 60));
        } else {
          setBudgetUnit('minutes');
          setBudgetInputValue(String(bm));
        }
      } else {
        setBudgetUnit('hours');
        setBudgetInputValue('');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری برنامه روزانه');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => getPersianWeekDays(weekRefDate), [weekRefDate]);

  const loadWeeklyPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const start = weekDays[0].isoDate;
      const end = weekDays[6].isoDate;
      const data = await api.getPlansByRange(start, end);
      setWeeklyPlans(data);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری برنامه هفتگی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyPlans();
    } else {
      loadDailyData(selectedDate);
    }
  }, [activeTab, selectedDate, weekRefDate]);

  const handleSaveTimeBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = Number(budgetInputValue);
    if (budgetInputValue === '' || isNaN(rawNum) || rawNum < 0) return;
    const totalMins =
      budgetUnit === 'hours' ? Math.round(rawNum * 60) : Math.round(rawNum);
    if (totalMins > 1440) return;

    try {
      setSavingBudget(true);
      const saved = await api.saveTimeBudget({
        plan_date: selectedDate,
        budget_minutes: totalMins > 0 ? totalMins : null,
        input_unit: budgetUnit,
      });
      setTimeBudget(saved);
      onDataMutated();
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره ظرف زمانی روز');
    } finally {
      setSavingBudget(false);
    }
  };

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.id === formCategoryId) || null,
    [categories, formCategoryId]
  );
  const isFormStudyActivity = Number(selectedCategoryObj?.is_study) === 1;

  const openCreateForm = (targetDate?: string) => {
    if (targetDate && activeTab === 'weekly') {
      setSelectedDate(targetDate);
    }
    setEditingPlan(null);
    const studyCat = categories.find((c) => Number(c.is_study) === 1) || categories[0];
    setFormCategoryId(studyCat?.id || '');
    const firstSubj = subjects[0];
    setFormSubjectId(firstSubj?.id || '');
    setFormUnitId(firstSubj?.units[0]?.id || '');
    setFormStudyTypeId(studyTypes[0]?.id || '');
    setFormPriorityCode('A1');
    setFormPredictedMinutes('60');
    setFormTargetExercises('');
    setFormReminderTime('17:30');
    setFormDescription('');
    setFormError(null);
    setShowPlanForm(true);
  };

  const openEditForm = (plan: DailyPlanItem) => {
    setEditingPlan(plan);
    setFormCategoryId(plan.category_id);
    if (Number(plan.is_study) === 1) {
      const subj = subjects.find((s) => s.id === plan.subject_id) || subjects[0];
      setFormSubjectId(subj?.id || '');
      setFormUnitId(plan.unit_id || subj?.units[0]?.id || '');
      setFormStudyTypeId(plan.study_type_id || studyTypes[0]?.id || '');
    }
    setFormPriorityCode(plan.priority_code);
    setFormPredictedMinutes(String(plan.predicted_minutes));
    setFormTargetExercises(
      plan.target_exercises !== null && plan.target_exercises !== undefined
        ? String(plan.target_exercises)
        : ''
    );
    setFormReminderTime(plan.reminder_time || '');
    setFormDescription(plan.description || '');
    setFormError(null);
    setShowPlanForm(true);
  };

  const handlePlanFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const mins = Number(formPredictedMinutes);
    if (!mins || mins <= 0 || mins > 720) {
      setFormError('زمان پیش‌بینی‌شده باید عددی بین ۱ تا ۷۲۰ دقیقه باشد.');
      return;
    }

    if (isFormStudyActivity && (!formSubjectId || !formUnitId || !formStudyTypeId)) {
      setFormError('لطفاً نام درس، فصل/درس و نوع فعالیت درسی را انتخاب کنید.');
      return;
    }

    const parsedTargetEx =
      isFormStudyActivity && formTargetExercises.trim() !== ''
        ? Math.max(0, Number(formTargetExercises))
        : null;

    try {
      setFormSubmitting(true);
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, {
          category_id: formCategoryId,
          subject_id: isFormStudyActivity ? formSubjectId : null,
          unit_id: isFormStudyActivity ? formUnitId : null,
          study_type_id: isFormStudyActivity ? formStudyTypeId : null,
          priority_code: formPriorityCode,
          predicted_minutes: mins,
          target_exercises: parsedTargetEx,
          reminder_time: formReminderTime.trim() || null,
          description: formDescription.trim(),
        });
      } else {
        await api.createPlan({
          plan_date: selectedDate,
          category_id: formCategoryId,
          subject_id: isFormStudyActivity ? formSubjectId : null,
          unit_id: isFormStudyActivity ? formUnitId : null,
          study_type_id: isFormStudyActivity ? formStudyTypeId : null,
          priority_code: formPriorityCode,
          predicted_minutes: mins,
          target_exercises: parsedTargetEx,
          reminder_time: formReminderTime.trim() || null,
          description: formDescription.trim(),
        });
      }

      setShowPlanForm(false);
      setEditingPlan(null);
      if (activeTab === 'weekly') {
        await loadWeeklyPlans();
      } else {
        await loadDailyData(selectedDate);
      }
      onDataMutated();
    } catch (err: any) {
      setFormError(err.message || 'خطا در ذخیره فعالیت');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlan) return;
    try {
      await api.deletePlan(deletingPlan.id);
      setDeletingPlan(null);
      if (activeTab === 'weekly') {
        await loadWeeklyPlans();
      } else {
        await loadDailyData(selectedDate);
      }
      onDataMutated();
    } catch (err: any) {
      setError(err.message || 'خطا در حذف فعالیت');
    }
  };

  const handleSavePerformance = async (
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: LearningQuality | null;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ) => {
    await api.savePerformance(planId, {
      ...payload,
      learning_quality:
        payload.learning_quality !== null && payload.learning_quality !== undefined
          ? String(payload.learning_quality)
          : null,
    });
    if (activeTab === 'weekly') {
      await loadWeeklyPlans();
    } else {
      await loadDailyData(selectedDate);
    }
    onDataMutated();
  };

  const handleResetPerformance = async (planId: string) => {
    await api.deletePerformance(planId);
    if (activeTab === 'weekly') {
      await loadWeeklyPlans();
    } else {
      await loadDailyData(selectedDate);
    }
    onDataMutated();
  };

  const sortedDailyPlans = useMemo(() => {
    const copy = [...dailyPlans];
    if (sortBy === 'priority') {
      return copy.sort((a, b) => {
        const rankA = a.priority_rank ?? 99;
        const rankB = b.priority_rank ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.custom_sort_order - b.custom_sort_order;
      });
    }
    return copy.sort((a, b) => a.custom_sort_order - b.custom_sort_order);
  }, [dailyPlans, sortBy]);

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const list = [...sortedDailyPlans];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setSortBy('custom');
    setDailyPlans(list.map((item, idx) => ({ ...item, custom_sort_order: idx + 1 })));
    await api.reorderPlans(list.map((item) => item.id));
  };

  // Modular Day Evaluation (Sections 5, 6, 7, 8, 9)
  const dayEval = useMemo(
    () =>
      evaluateDayPerformance({
        dateIso: selectedDate,
        plans: dailyPlans,
        budgetConfig: timeBudget,
        goalConfig: dailyGoal,
        categoriesMap,
      }),
    [selectedDate, dailyPlans, timeBudget, dailyGoal, categoriesMap]
  );

  // Gamified summary for Hero Header
  const daySummary = useMemo(() => {
    const totalCount = dailyPlans.length;
    const completedCount = dailyPlans.filter((p) => p.status === 'completed').length;
    const partialCount = dailyPlans.filter((p) => p.status === 'partial').length;
    const progressPercent =
      dayEval.finalDailyScoreS !== null
        ? Math.min(100, Math.round(dayEval.finalDailyScoreS))
        : totalCount > 0
        ? Math.round(((completedCount + partialCount * 0.5) / totalCount) * 100)
        : 0;
    const xpEarned =
      completedCount * 50 + partialCount * 25 + dayEval.actualExercisesCount * 2;
    return {
      predTotal: dayEval.totalPlannedAllMinutes,
      actualTotal: dayEval.totalActualAllMinutes,
      completedCount,
      partialCount,
      totalCount,
      totalExercises: dayEval.actualExercisesCount,
      progressPercent,
      xpEarned,
    };
  }, [dailyPlans, dayEval]);

  // SVG Ring calculation
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset =
    ringCircumference - (daySummary.progressPercent / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          ENERGETIC STUDENT MISSION HERO BANNER
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-7 shadow-lg shadow-indigo-950/15">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 w-64 h-64 rounded-full bg-emerald-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-1.5 text-indigo-200 text-[11px] sm:text-xs font-semibold whitespace-nowrap overflow-hidden">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="whitespace-nowrap">برنامه‌ریزی هوشمند دانش‌آموز</span>
              <span aria-hidden="true" className="shrink-0">·</span>
              <span className="whitespace-nowrap tabular-nums">{formatJalaliWeekdaySlash(selectedDate)}</span>
            </div>

            <h1 className="text-[15px] sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white whitespace-nowrap truncate">
              {activeTab === 'today' && selectedDate === todayIso
                ? 'مأموریت‌های مطالعه امروزت را با قدرت پیش ببر'
                : activeTab === 'tomorrow' && selectedDate === tomorrowIso
                ? 'برنامه‌ریزی هوشمندانه برای موفقیت فردا'
                : activeTab === 'weekly'
                ? 'نمای کلی برنامه هفتگی (شنبه تا جمعه)'
                : `برنامه و گزارش عملکرد ${formatJalaliWeekdaySlash(selectedDate)}`}
            </h1>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-indigo-100 tabular-nums">
              <span className="flex items-center gap-1.5 font-semibold">
                <Trophy className="w-4 h-4 text-amber-300" />
                امتیاز نهایی روز:{' '}
                {dayEval.finalDailyScoreS !== null
                  ? `${toPersianDigits(dayEval.finalDailyScoreS)} از ۱۰۰`
                  : 'در انتظار ثبت'}
              </span>
              <span aria-hidden="true" className="text-indigo-400">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-300" />
                {toPersianDigits(daySummary.completedCount)} از {toPersianDigits(daySummary.totalCount)} مأموریت تکمیل‌شده
              </span>
              <span aria-hidden="true" className="text-indigo-400">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-300" />
                {toPersianDigits(daySummary.totalExercises)} تست و تمرین حل‌شده
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 w-full lg:w-auto">
            <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 flex-1 sm:flex-initial">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="transparent"
                    stroke="#34d399"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringStrokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-sm font-extrabold text-white tabular-nums">
                  {toPersianDigits(daySummary.progressPercent)}٪
                </span>
              </div>
              <div className="space-y-1 text-xs tabular-nums">
                <div className="font-bold text-white">تحقق و امتیاز روز</div>
                <div className="text-indigo-200">
                  پیش‌بینی کل: {formatMinutesPersian(daySummary.predTotal)}
                </div>
                <div className="text-emerald-300 font-semibold">
                  انجام‌شده: {formatMinutesPersian(daySummary.actualTotal)}
                </div>
              </div>
            </div>

            {/* Section 5: "نمایش هفتگی" placed right next to "ثبت فعالیت جدید" */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => openCreateForm()}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 sm:px-5 py-3.5 text-xs font-extrabold shadow-lg shadow-amber-400/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap min-h-[48px]"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>ثبت فعالیت جدید</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'weekly' ? 'today' : 'weekly')}
                className={`flex items-center justify-center gap-1.5 rounded-2xl px-4 sm:px-5 py-3.5 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap min-h-[48px] border ${
                  activeTab === 'weekly'
                    ? 'bg-white text-indigo-950 border-white shadow-lg'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>نمایش هفتگی</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Balanced Today / Tomorrow Switcher & Day Navigation */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1.5 p-1 bg-slate-950/35 backdrop-blur-md rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap text-center cursor-pointer min-h-[40px] ${
                activeTab === 'today' && selectedDate === todayIso
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              برنامه امروز ({formatJalaliCompact(todayIso)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tomorrow')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap text-center cursor-pointer min-h-[40px] ${
                activeTab === 'tomorrow' && selectedDate === tomorrowIso
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              برنامه فردا ({formatJalaliCompact(tomorrowIso)})
            </button>
          </div>

          {activeTab !== 'weekly' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <ShamsiDateField
                selectedIso={selectedDate}
                onSelectIso={(iso) => setSelectedDate(iso)}
                align="left"
              />
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[38px]"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>روز قبل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[38px]"
                >
                  <span>روز بعد</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          DAILY VIEW (برنامه امروز / برنامه فردا / روز انتخابی)
      ===================================================================== */}
      {activeTab !== 'weekly' && (
        <div className="space-y-4">
          {/* =================================================================
              SECTION 1: SMART STUDY REMINDER ACCORDION (Conditionally Shown)
          ================================================================= */}
          {smartReminderEnabled && (
            <StudyReminderManager
              plans={dailyPlans}
              selectedDate={selectedDate}
              onOpenPlan={(plan) => setActivePerformancePlan(plan)}
            />
          )}

          {/* =================================================================
              SECTION 2: DAILY TIME BUDGET ACCORDION (ظرف زمانی روز)
          ================================================================= */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsBudgetAccordionOpen((prev) => !prev)}
              aria-expanded={isBudgetAccordionOpen}
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-right hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/50">
                  <Timer className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      ظرف زمانی روز ({formatJalaliCompact(selectedDate)})
                    </h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 tabular-nums">
                      {dayEval.budgetMinutes !== null && dayEval.budgetMinutes > 0
                        ? `ظرفیت: ${formatHoursAndMinutesPersian(dayEval.budgetMinutes)}`
                        : 'تنظیم‌نشده'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    کل زمان در دسترس امروز برای برنامه‌ریزی مطالعه، سرگرمی و استراحت
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {isBudgetAccordionOpen ? 'بستن جزئیات' : 'مشاهده و تنظیم ظرفیت'}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
                    isBudgetAccordionOpen ? 'rotate-180' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Accordion Body */}
            {isBudgetAccordionOpen && (
              <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                {/* 2-1: Subtitle & Budget Input Form */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    کل زمان در دسترس امروز برای برنامه‌ریزی مطالعه، سرگرمی و استراحت
                  </p>

                  <form onSubmit={handleSaveTimeBudget} className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={budgetUnit === 'hours' ? 24 : 1440}
                      step={budgetUnit === 'hours' ? '0.5' : '15'}
                      value={budgetInputValue}
                      onChange={(e) => setBudgetInputValue(e.target.value)}
                      placeholder={budgetUnit === 'hours' ? 'مثلاً 6' : 'مثلاً 360'}
                      className="w-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums text-center min-h-[38px]"
                    />
                    <select
                      value={budgetUnit}
                      onChange={(e) => {
                        const nextUnit = e.target.value as 'hours' | 'minutes';
                        const num = Number(budgetInputValue) || 0;
                        if (budgetUnit === 'hours' && nextUnit === 'minutes') {
                          setBudgetInputValue(num > 0 ? String(Math.round(num * 60)) : '');
                        } else if (budgetUnit === 'minutes' && nextUnit === 'hours') {
                          setBudgetInputValue(
                            num > 0 ? String(Math.round((num / 60) * 10) / 10) : ''
                          );
                        }
                        setBudgetUnit(nextUnit);
                      }}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                    >
                      <option value="hours">ساعت</option>
                      <option value="minutes">دقیقه</option>
                    </select>
                    <button
                      type="submit"
                      disabled={savingBudget}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
                    >
                      {savingBudget ? '...' : 'ثبت ظرفیت'}
                    </button>
                  </form>
                </div>

                {dayEval.budgetMinutes !== null && dayEval.budgetMinutes > 0 ? (
                  <div className="space-y-4">
                    {/* 2-2 & 2-3: Centered Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* 2-2: برنامه‌ریزی در برابر ظرفیت (Center-Aligned) */}
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 p-4 text-center space-y-1.5 flex flex-col items-center justify-center">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          برنامه‌ریزی در برابر ظرفیت
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {formatHoursAndMinutesPersian(dayEval.totalPlannedAllMinutes)} از{' '}
                          {formatHoursAndMinutesPersian(dayEval.budgetMinutes)}
                        </div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          ({toPersianDigits(dayEval.totalPlannedAllMinutes)} از{' '}
                          {toPersianDigits(dayEval.budgetMinutes)} دقیقه)
                        </div>
                        {dayEval.plannedOverBudgetMinutes !== null &&
                        dayEval.plannedOverBudgetMinutes > 0 ? (
                          <div className="pt-1 flex items-center justify-center gap-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {formatMinutesPersian(dayEval.plannedOverBudgetMinutes)} بیشتر از ظرفیت روز برنامه‌ریزی شده است.
                            </span>
                          </div>
                        ) : (
                          <div className="pt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            ظرفیت آزاد و تخصیص‌نیافته:{' '}
                            {formatMinutesPersian(dayEval.unallocatedPlannedMinutes || 0)}
                          </div>
                        )}
                      </div>

                      {/* 2-3: عملکرد واقعی در برابر ظرفیت (Center-Aligned) */}
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 p-4 text-center space-y-1.5 flex flex-col items-center justify-center">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          عملکرد واقعی در برابر ظرفیت
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {formatHoursAndMinutesPersian(dayEval.totalActualAllMinutes)} از{' '}
                          {formatHoursAndMinutesPersian(dayEval.budgetMinutes)}
                        </div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          ({toPersianDigits(dayEval.totalActualAllMinutes)} از{' '}
                          {toPersianDigits(dayEval.budgetMinutes)} دقیقه)
                        </div>
                        {dayEval.actualOverBudgetMinutes !== null &&
                        dayEval.actualOverBudgetMinutes > 0 ? (
                          <div className="pt-1 flex items-center justify-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {formatMinutesPersian(dayEval.actualOverBudgetMinutes)} بیشتر از ظرفیت روز استفاده شده است.
                            </span>
                          </div>
                        ) : (
                          <div className="pt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            ظرفیت استفاده‌نشده:{' '}
                            {formatMinutesPersian(dayEval.remainingActualBudgetMinutes || 0)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2-4: Activity Shares Bar Chart + 3-Line Structured Summary */}
                    <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 p-3.5 space-y-3">
                      <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden flex">
                        <div
                          className="bg-indigo-600 h-full transition-all"
                          style={{ width: `${Math.min(100, dayEval.studyShareOfBudgetPct ?? 0)}%` }}
                          title="سهم مطالعه و آموزش"
                        />
                        <div
                          className="bg-amber-500 h-full transition-all"
                          style={{
                            width: `${Math.min(100, dayEval.restrictedShareOfBudgetPct ?? 0)}%`,
                          }}
                          title="سهم سرگرمی محدودشونده"
                        />
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{
                            width: `${Math.min(100, dayEval.essentialShareOfBudgetPct ?? 0)}%`,
                          }}
                          title="سهم استراحت و فعالیت‌های ضروری"
                        />
                      </div>

                      {/* 3 Separate Clean Lines for Activity Shares */}
                      <div className="space-y-2 text-xs tabular-nums">
                        {/* Line 1: Study Share */}
                        <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 dark:border-slate-700/50">
                          <span className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                            <span>۱. سهم مطالعه و آموزش از ظرف زمانی روز:</span>
                          </span>
                          <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                            {toPersianDigits(dayEval.studyShareOfBudgetPct ?? 0)}٪ (
                            {formatMinutesPersian(dayEval.actualStudyMinutes)})
                          </span>
                        </div>

                        {/* Line 2: Restricted Share */}
                        <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 dark:border-slate-700/50">
                          <span className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            <span>۲. سهم سرگرمی و فعالیت‌های محدودشونده:</span>
                          </span>
                          <span className="font-extrabold text-amber-700 dark:text-amber-300">
                            {toPersianDigits(dayEval.restrictedShareOfBudgetPct ?? 0)}٪ (
                            {formatMinutesPersian(dayEval.restrictedActualMinutes)})
                          </span>
                        </div>

                        {/* Line 3: Essential Share & Remaining */}
                        <div className="flex items-center justify-between gap-2 py-1">
                          <span className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>۳. سهم استراحت، تغذیه و فعالیت‌های ضروری:</span>
                          </span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                            {toPersianDigits(dayEval.essentialShareOfBudgetPct ?? 0)}٪ (
                            {formatMinutesPersian(dayEval.essentialActualMinutes)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                    برای مشاهده «سهم مطالعه از ظرف زمانی» و مقایسه برنامه‌ریزی و عملکرد واقعی، ظرفیت زمانی امروز را به ساعت یا دقیقه وارد و ثبت کنید.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* =================================================================
              SECTION 3: DAILY EVALUATION INDICES ACCORDION (شاخص‌های ارزیابی عملکرد روز)
          ================================================================= */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsMetricsAccordionOpen((prev) => !prev)}
              aria-expanded={isMetricsAccordionOpen}
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-right hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-200/60 dark:border-violet-800/50">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      شاخص‌های ارزیابی عملکرد روز
                    </h2>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 tabular-nums">
                      امتیاز نهایی روز (S):{' '}
                      {dayEval.finalDailyScoreS !== null
                        ? `${toPersianDigits(dayEval.finalDailyScoreS)} / ۱۰۰`
                        : 'داده کافی وجود ندارد'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    محاسبه مستقل عملکرد آموزشی (E) و کنترل سرگرمی‌ها (C)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {isMetricsAccordionOpen ? 'بستن جزئیات' : 'مشاهده شاخص‌ها'}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
                    isMetricsAccordionOpen ? 'rotate-180' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Accordion Body */}
            {isMetricsAccordionOpen && (
              <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                  <div className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-3.5 py-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      تحقق زمان مطالعه (T)
                    </span>
                    <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-1 block">
                      {dayEval.studyTimeIndexT !== null
                        ? `${toPersianDigits(dayEval.studyTimeIndexT)}٪`
                        : 'بدون برنامه'}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 px-3.5 py-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      تحقق تست و تمرین (Q)
                    </span>
                    <span className="text-base font-extrabold text-blue-700 dark:text-blue-300 mt-1 block">
                      {dayEval.exercisesIndexQ !== null
                        ? `${toPersianDigits(dayEval.exercisesIndexQ)}٪`
                        : 'بدون هدف تست'}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 px-3.5 py-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      کیفیت یادگیری وزنی (L)
                    </span>
                    <span className="text-base font-extrabold text-purple-700 dark:text-purple-300 mt-1 block">
                      {dayEval.learningQuality0To10 !== null
                        ? `${toPersianDigits(dayEval.learningQuality0To10)} از ۱۰`
                        : 'ثبت‌نشده'}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 px-3.5 py-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      کنترل سرگرمی‌ها (C)
                    </span>
                    <span className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-1 block">
                      {dayEval.restrictedControlIndexC !== null
                        ? `${toPersianDigits(dayEval.restrictedControlIndexC)}٪`
                        : 'بدون سرگرمی'}
                    </span>
                  </div>
                </div>

                {onNavigateToDefinitions && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={onNavigateToDefinitions}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <FormulaIcon className="w-3.5 h-3.5" />
                      <span>مشاهده تعاریف شاخص‌ها و فرمول‌های محاسباتی</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =================================================================
              SECTION 4: ACTIVITY CARDS LIST HEADER & COMPACT SORT CONTROLS
          ================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-5 py-3 shadow-xs">
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
              لیست کارت‌های فعالیت ({toPersianDigits(sortedDailyPlans.length)} مورد)
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5" />
                چینش کارت‌ها:
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSortBy('priority')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'priority'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  بر اساس اولویت
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('custom')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ترتیب دلخواه
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse"
                />
              ))}
            </div>
          ) : sortedDailyPlans.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                هنوز مأموریتی برای {formatJalaliFull(selectedDate)} ثبت نکردی!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                درس‌هایی که امروز در مدرسه تدریس شدن، تکالیف، امتحانات یا حتی زمان استراحت و بازی خودت رو با دکمه زیر اضافه کن.
              </p>
              <button
                type="button"
                onClick={() => openCreateForm()}
                className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت اولین فعالیت این روز</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sortedDailyPlans.map((plan, index) => {
                const isStudy = Number(plan.is_study) === 1;
                const activityGroup = classifyPlanActivityGroup(plan, categoriesMap);
                const predMins = plan.initial_predicted_minutes || plan.predicted_minutes;
                const actualMins = plan.performance?.actual_minutes;
                const hasPerf = Boolean(plan.performance);
                const diff = hasPerf && actualMins !== undefined ? actualMins - predMins : null;

                // Section 3: Dedicated Gradient Header Theme per Subject / Activity
                const gradTheme = getCardGradientTheme(
                  plan.subject_name_snapshot,
                  plan.category_title_snapshot,
                  isStudy,
                  activityGroup
                );
                const ThemeIcon = getSubjectIconComponent(
                  plan.subject_name_snapshot,
                  plan.category_title_snapshot,
                  isStudy
                );

                // Section 4: Actual-to-Predicted Time Ratio (can exceed 100%)
                const actualToPredRatioPct =
                  hasPerf && actualMins !== undefined
                    ? calculateActualToPredictedRatioPct(actualMins, predMins) ?? 0
                    : 0;

                const parsedQuality0To10 = hasPerf
                  ? parseLearningQuality0To10(plan.performance?.learning_quality)
                  : null;

                // Section 2.1: Single-line Title + Priority + Unit
                const singleLineTitle = isStudy
                  ? `${plan.subject_name_snapshot || 'درس'} · ${plan.priority_code}${
                      plan.unit_title_snapshot ? ` · ${plan.unit_title_snapshot}` : ''
                    }`
                  : `${plan.category_title_snapshot} · ${plan.priority_code}`;

                // Section 2.2: Top-left Corner Activity Type Badge
                const cornerTypeBadgeText = isStudy
                  ? plan.study_type_title_snapshot || 'مطالعه درسی'
                  : activityGroup === 'restricted'
                  ? 'سرگرمی محدودشونده'
                  : 'ضروری و بازیابی';

                return (
                  <div
                    key={plan.id}
                    onClick={() => setActivePerformancePlan(plan)}
                    className={`group rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ${gradTheme.borderHover} hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs`}
                  >
                    <div>
                      {/* =========================================================
                          SECTION 2.1, 2.2 & 3: GRADIENT HEADER ONLY
                      ========================================================= */}
                      <div
                        className={`px-4 py-3 ${gradTheme.headerGradient} flex items-center justify-between gap-2.5`}
                      >
                        {/* Right side: Icon + Single-line Subject + Priority + Unit (truncate) */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                            <ThemeIcon className="w-4 h-4" />
                          </div>
                          <h3
                            className="text-xs sm:text-sm font-extrabold text-white truncate whitespace-nowrap"
                            title={singleLineTitle}
                          >
                            {singleLineTitle}
                          </h3>
                        </div>

                        {/* Left side: Corner Activity Type Badge (2.2) + Action Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap ${gradTheme.badgeBg}`}
                          >
                            {cornerTypeBadgeText}
                          </span>

                          <div
                            className="flex items-center gap-0.5 bg-black/15 rounded-xl px-1 py-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded-lg text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="جابه‌جایی به بالا"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(index, 'down')}
                              disabled={index === sortedDailyPlans.length - 1}
                              className="p-1 rounded-lg text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="جابه‌جایی به پایین"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(plan)}
                              className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
                              title="ویرایش برنامه"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingPlan(plan)}
                              className="p-1 rounded-lg text-white/80 hover:text-rose-200 cursor-pointer"
                              title="حذف فعالیت"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* =========================================================
                          CARD BODY (Neutral Clean Background - Section 3.1)
                      ========================================================= */}
                      <div className="p-4 sm:p-5 space-y-3">
                        {/* Section 2.3: Single-line Initial Prediction + Optional Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                          <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            پیش‌بینی: {formatMinutesPersian(predMins)}
                          </span>

                          <div className="flex items-center gap-2">
                            {isStudy &&
                              plan.target_exercises !== null &&
                              plan.target_exercises !== undefined &&
                              plan.target_exercises > 0 && (
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  هدف تست: {toPersianDigits(plan.target_exercises)}
                                </span>
                              )}
                            {plan.reminder_time && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                                ساعت {toPersianDigits(plan.reminder_time)}
                              </span>
                            )}
                          </div>
                        </div>

                        {plan.description && (
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed truncate">
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =========================================================
                        SECTION 4: TIME RATIO INDICATOR (زمان واقعی نسبت به پیش‌بینی)
                    ========================================================= */}
                    <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-slate-50/40 dark:bg-slate-900/50">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
                          <span className="text-slate-500 dark:text-slate-400">
                            زمان واقعی نسبت به پیش‌بینی
                          </span>
                          <span
                            className={
                              !hasPerf
                                ? 'text-slate-400'
                                : activityGroup === 'restricted' && actualToPredRatioPct > 100
                                ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                : actualToPredRatioPct >= 100
                                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                : 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                            }
                          >
                            {hasPerf ? `${toPersianDigits(actualToPredRatioPct)}٪` : '۰٪'}
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              !hasPerf
                                ? 'w-0'
                                : activityGroup === 'restricted' && actualToPredRatioPct > 100
                                ? 'bg-rose-500'
                                : actualToPredRatioPct >= 100
                                ? 'bg-emerald-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{
                              width: `${
                                hasPerf ? Math.min(100, Math.max(8, actualToPredRatioPct)) : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        {!hasPerf ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>آماده انجام (هنوز عملکردی ثبت نشده)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
                            {plan.status === 'completed' ? (
                              <span className="flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                تکمیل شده
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                                ناقص
                              </span>
                            )}
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                              ·
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold">
                              واقعی: {formatMinutesPersian(actualMins || 0)}
                            </span>
                            {diff !== null && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span
                                  className={
                                    diff === 0
                                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                      : diff > 0
                                      ? activityGroup === 'restricted'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                        : 'text-amber-600 dark:text-amber-400 font-semibold'
                                      : 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                  }
                                >
                                  {diff === 0
                                    ? 'مطابق پیش‌بینی'
                                    : diff > 0
                                    ? `${toPersianDigits(diff)} د بیشتر`
                                    : `${toPersianDigits(Math.abs(diff))} د کمتر`}
                                </span>
                              </>
                            )}
                            {isStudy && plan.performance?.exercises_count !== null && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                                  <FileCheck2 className="w-3 h-3 text-blue-500" />
                                  {toPersianDigits(plan.performance?.exercises_count)} تست
                                </span>
                              </>
                            )}
                            {isStudy && parsedQuality0To10 !== null && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                                  <Award className="w-3 h-3 text-purple-500" />
                                  کیفیت: {toPersianDigits(parsedQuality0To10)}/۱۰
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-[-2px] transition-transform whitespace-nowrap">
                          {hasPerf ? 'ویرایش عملکرد ←' : 'ثبت عملکرد ←'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          WEEKLY VIEW (نمای هفتگی ۷ روزه - شنبه تا جمعه)
      ===================================================================== */}
      {activeTab === 'weekly' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                <ChevronRight className="w-4 h-4" />
                <span>هفته قبل</span>
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(todayIso)}
                className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer min-h-[40px]"
              >
                هفته جاری
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                <span>هفته بعد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
              مجموع فعالیت‌های این هفته: {toPersianDigits(weeklyPlans.length)} فعالیت
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {weekDays.map((day) => {
              const dayPlans = weeklyPlans
                .filter((p) => p.plan_date === day.isoDate)
                .sort((a, b) => (a.priority_rank ?? 99) - (b.priority_rank ?? 99));

              const totalPred = dayPlans.reduce(
                (acc, p) => acc + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
                0
              );
              const totalActual = dayPlans.reduce(
                (acc, p) => acc + Number(p.performance?.actual_minutes || 0),
                0
              );

              return (
                <div
                  key={day.isoDate}
                  className={`rounded-3xl border bg-white dark:bg-slate-900 p-5 flex flex-col justify-between transition-all ${
                    day.isToday
                      ? 'border-indigo-500 dark:border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {day.weekdayName}
                          </h3>
                          {day.isToday && (
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                              · امروز
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {day.dayNumberPersian} {day.monthName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCreateForm(day.isoDate)}
                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={`افزودن فعالیت برای ${day.fullLabel}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {dayPlans.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
                        برنامه‌ای ثبت نشده
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {dayPlans.map((plan) => {
                          const isStudy = Number(plan.is_study) === 1;
                          const actGroup = classifyPlanActivityGroup(plan, categoriesMap);
                          const pred = plan.initial_predicted_minutes || plan.predicted_minutes;
                          const act = plan.performance?.actual_minutes;
                          const gradTheme = getCardGradientTheme(
                            plan.subject_name_snapshot,
                            plan.category_title_snapshot,
                            isStudy,
                            actGroup
                          );
                          const MiniIcon = getSubjectIconComponent(
                            plan.subject_name_snapshot,
                            plan.category_title_snapshot,
                            isStudy
                          );

                          return (
                            <div
                              key={plan.id}
                              onClick={() => setActivePerformancePlan(plan)}
                              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-indigo-400 transition-colors cursor-pointer"
                            >
                              <div
                                className={`px-3 py-1.5 ${gradTheme.headerGradient} flex items-center justify-between gap-2`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MiniIcon className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span className="text-xs font-extrabold text-white truncate">
                                    {isStudy
                                      ? `${plan.subject_name_snapshot} · ${plan.priority_code}`
                                      : `${plan.category_title_snapshot} · ${plan.priority_code}`}
                                  </span>
                                </div>
                                {isStudy && plan.study_type_title_snapshot && (
                                  <span className="text-[10px] font-bold text-white/95 bg-black/20 px-1.5 py-0.5 rounded-md shrink-0">
                                    {plan.study_type_title_snapshot}
                                  </span>
                                )}
                              </div>
                              <div className="px-3 py-2 text-[11px] space-y-1">
                                {isStudy && plan.unit_title_snapshot && (
                                  <div className="text-slate-600 dark:text-slate-300 font-semibold truncate">
                                    {plan.unit_title_snapshot}
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 tabular-nums">
                                  <span>پیش‌بینی: {toPersianDigits(pred)} د</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-200">
                                    {act !== undefined
                                      ? `واقعی: ${toPersianDigits(act)} د (${toPersianDigits(
                                          calculateActualToPredictedRatioPct(act, pred) ?? 0
                                        )}٪)`
                                      : 'در انتظار'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                    <span>پیش‌بینی: {formatMinutesPersian(totalPred)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      واقعی: {formatMinutesPersian(totalActual)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SMART COMPACT PLAN FORM MODAL (CENTERED WITH DROPDOWNS)
      ===================================================================== */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6">
          <div className="w-full max-w-md rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden">
            {/* Fixed Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap truncate">
                  {editingPlan ? 'ویرایش فعالیت برنامه‌ریزی‌شده' : 'ثبت فعالیت جدید'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap tabular-nums">
                  تاریخ: {formatJalaliWeekdaySlash(editingPlan ? editingPlan.plan_date : selectedDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanForm(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body + Pinned Footer */}
            <form onSubmit={handlePlanFormSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                {formError && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                    {formError}
                  </div>
                )}

                {/* فیلد اول: عنوان فعالیت */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                    ۱. عنوان فعالیت
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* فیلدهای شرطی مربوط به درس */}
                {isFormStudyActivity && (
                  <div className="space-y-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/50 p-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                        ۲. نام درس
                      </label>
                      <select
                        value={formSubjectId}
                        onChange={(e) => setFormSubjectId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                      >
                        {subjects.map((subj) => (
                          <option key={subj.id} value={subj.id}>
                            {subj.name} (پایه {subj.grade_level})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap truncate">
                        ۳. فصل یا درس ({selectedSubjectObj?.unit_type_label || 'بخش'} کتاب{' '}
                        {selectedSubjectObj?.name || ''})
                      </label>
                      {selectedSubjectObj && selectedSubjectObj.units.length > 0 ? (
                        <select
                          value={formUnitId}
                          onChange={(e) => setFormUnitId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                        >
                          {selectedSubjectObj.units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          برای این درس هنوز فصل یا درسی تعریف نشده است. از منوی «تعریف درس‌ها» فصل‌های آن را اضافه کنید.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                        ۴. نوع فعالیت درسی
                      </label>
                      <select
                        value={formStudyTypeId}
                        onChange={(e) => setFormStudyTypeId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                      >
                        {studyTypes.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* اولویت انجام فعالیت */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                    {isFormStudyActivity ? '۵. اولویت انجام فعالیت' : '۲. اولویت انجام فعالیت'}
                  </label>
                  <select
                    value={formPriorityCode}
                    onChange={(e) => setFormPriorityCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                  >
                    {priorities.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} — {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* زمان پیش‌بینی‌شده + هدف تست اختیاری */}
                <div className={`grid grid-cols-1 ${isFormStudyActivity ? 'sm:grid-cols-2' : ''} gap-3`}>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                      {isFormStudyActivity
                        ? '۶. زمان پیش‌بینی‌شده (دقیقه)'
                        : '۳. زمان پیش‌بینی‌شده (دقیقه)'}
                    </label>
                    {editingPlan && editingPlan.performance ? (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                        ثابت در تحلیل اولیه: {formatMinutesPersian(editingPlan.initial_predicted_minutes)}
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={720}
                        required
                        value={formPredictedMinutes}
                        onChange={(e) => setFormPredictedMinutes(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                        placeholder="مثلاً 60"
                      />
                    )}
                  </div>

                  {isFormStudyActivity && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                        هدف تمرین / تست (اختیاری)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={formTargetExercises}
                        onChange={(e) => setFormTargetExercises(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                        placeholder="مثلاً 20"
                      />
                    </div>
                  )}
                </div>

                {/* ساعت یادآوری */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="whitespace-nowrap">
                        {isFormStudyActivity ? '۷. ساعت یادآوری' : '۴. ساعت یادآوری'}
                      </span>
                    </label>
                    {formReminderTime && (
                      <button
                        type="button"
                        onClick={() => setFormReminderTime('')}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        حذف یادآور
                      </button>
                    )}
                  </div>

                  <select
                    value={formReminderTime}
                    onChange={(e) => setFormReminderTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                  >
                    <option value="">بدون یادآور</option>
                    {Array.from(
                      new Set(
                        formReminderTime && !REMINDER_TIME_OPTIONS.includes(formReminderTime)
                          ? [formReminderTime, ...REMINDER_TIME_OPTIONS]
                          : REMINDER_TIME_OPTIONS
                      )
                    )
                      .sort()
                      .map((t) => (
                        <option key={t} value={t}>
                          ساعت {toPersianDigits(t)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* توضیحات تکمیلی */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                    {isFormStudyActivity ? '۸. توضیحات تکمیلی (اختیاری)' : '۵. توضیحات تکمیلی (اختیاری)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={
                      isFormStudyActivity
                        ? 'مثلاً: حل تمرین‌های صفحه ۴۵ / مطالعه از کتاب کمک‌آموزشی...'
                        : 'مثلاً: استراحت عصرگاهی / بررسی پیام‌ها...'
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer Buttons */}
              <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90">
                <button
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer min-h-[40px]"
                >
                  {formSubmitting
                    ? 'در حال ذخیره...'
                    : editingPlan
                    ? 'ذخیره تغییرات'
                    : 'ثبت در برنامه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PerformanceModal
        plan={activePerformancePlan}
        onClose={() => setActivePerformancePlan(null)}
        onSave={handleSavePerformance}
        onResetPerformance={handleResetPerformance}
      />

      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              تأیید حذف فعالیت از برنامه
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف فعالیت «
              <strong>
                {Number(deletingPlan.is_study) === 1
                  ? `${deletingPlan.subject_name_snapshot} (${deletingPlan.unit_title_snapshot})`
                  : deletingPlan.category_title_snapshot}
              </strong>
              » مطمئن هستید؟
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingPlan(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer min-h-[40px]"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
