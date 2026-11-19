import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  CalendarArrowUp,
  Eye,
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
  addDaysISO,
  formatJalaliFull,
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
import { ShamsiDateField } from './ShamsiDateField.tsx';
import {
  StudyReminderManager,
  getSmartReminderEnabled,
  SMART_REMINDER_EVENT_NAME,
} from './StudyReminderManager.tsx';
import { firebaseCloudSync } from '../services/firebaseCloudSync.ts';

interface PlannerViewProps {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  subjects: Subject[];
  onDataMutated: () => void;
  onNavigateToDefinitions?: () => void;
  onInspectSubject?: (subjectId: string) => void;
  refreshTrigger?: number;
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
  onInspectSubject,
  refreshTrigger = 0,
}) => {
  const todayIso = getTodayISO();

  const [activeTab, setActiveTab] = useState<'today' | 'weekly'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [sortBy, setSortBy] = useState<'priority' | 'custom'>('priority');
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

  // Section 1, 2: Accordion & Smart Reminder visibility states
  const [smartReminderEnabled, setSmartReminderEnabled] = useState<boolean>(() =>
    getSmartReminderEnabled()
  );
  const [isBudgetAccordionOpen, setIsBudgetAccordionOpen] = useState<boolean>(false);

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
  const hasLoadedOnceRef = useRef<boolean>(false);
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
  const [transferringPlan, setTransferringPlan] = useState<DailyPlanItem | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState<boolean>(false);
  const [transferToastMessage, setTransferToastMessage] = useState<string | null>(null);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, ActivityCategory>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

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
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);
      const [plansData, goalData, budgetData] = await Promise.all([
        api.getPlansByDate(dateStr),
        api.getDailyGoal(dateStr),
        api.getTimeBudget(dateStr),
      ]);
      setDailyPlans(plansData);
      setDailyGoal(goalData);
      setTimeBudget(budgetData);
      hasLoadedOnceRef.current = true;
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
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);
      const start = weekDays[0].isoDate;
      const end = weekDays[6].isoDate;
      const data = await api.getPlansByRange(start, end);
      setWeeklyPlans(data);
      hasLoadedOnceRef.current = true;
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
  }, [activeTab, selectedDate, weekRefDate, refreshTrigger]);

  const handleSaveTimeBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyObserver) return;
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
    if (isReadOnlyObserver) return;
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

  const handleTransferPlanToNextDay = async (planId: string) => {
    await api.transferPlanToNextDay(planId);
    setTransferToastMessage('فعالیت با موفقیت به برنامه روز بعد منتقل شد.');
    setTimeout(() => {
      setTransferToastMessage((prev) =>
        prev === 'فعالیت با موفقیت به برنامه روز بعد منتقل شد.' ? null : prev
      );
    }, 4500);
    if (activeTab === 'weekly') {
      await loadWeeklyPlans();
    } else {
      await loadDailyData(selectedDate);
    }
    onDataMutated();
  };

  const handleConfirmCardTransfer = async () => {
    if (!transferringPlan) return;
    try {
      setTransferSubmitting(true);
      await handleTransferPlanToNextDay(transferringPlan.id);
      setTransferringPlan(null);
    } catch (err: any) {
      setError(err.message || 'خطا در انتقال فعالیت به روز بعد');
    } finally {
      setTransferSubmitting(false);
    }
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

  // Summary values for the 9 unified Hero cards (Section 3)
  const daySummary = useMemo(() => {
    const totalCount = dailyPlans.length;
    const completedCount = dailyPlans.filter((p) => p.status === 'completed').length;
    const partialCount = dailyPlans.filter((p) => p.status === 'partial').length;
    const predStudyMinutes =
      dayEval.educationalPlansCount > 0
        ? dayEval.predictedStudyMinutes
        : dayEval.totalPlannedAllMinutes;
    const actualStudyMinutes =
      dayEval.educationalPlansCount > 0
        ? dayEval.actualStudyMinutes
        : dayEval.totalActualAllMinutes;
    return {
      predTotal: dayEval.totalPlannedAllMinutes,
      actualTotal: dayEval.totalActualAllMinutes,
      predStudyMinutes,
      actualStudyMinutes,
      completedCount,
      partialCount,
      totalCount,
      totalExercises: dayEval.actualExercisesCount,
    };
  }, [dailyPlans, dayEval]);

  const isTodaySelected = activeTab !== 'weekly' && selectedDate === todayIso;

  // Format minutes as H:MM′ in Persian digits with LTR isolate so ′ is always after the number
  const formatClockPrime = (totalMinutes: number): string => {
    const safe = Math.max(0, Math.round(totalMinutes || 0));
    const hrs = Math.floor(safe / 60);
    const mins = safe % 60;
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `\u2066${toPersianDigits(hrs)}:${toPersianDigits(paddedMins)}′\u2069`;
  };

  // Format registered daily capacity for accordion title (e.g., «۶ ساعت» or «۳۶۰ دقیقه»)
  const formattedRegisteredBudgetTitle = useMemo(() => {
    const bm = dayEval.budgetMinutes;
    if (bm === null || bm === undefined || bm <= 0) return null;
    if (timeBudget?.input_unit === 'minutes') {
      return `${toPersianDigits(bm)} دقیقه`;
    }
    if (bm % 60 === 0) {
      return `${toPersianDigits(bm / 60)} ساعت`;
    }
    if (bm % 30 === 0) {
      return `${toPersianDigits(String(bm / 60).replace('.', '/'))} ساعت`;
    }
    return formatHoursAndMinutesPersian(bm);
  }, [dayEval.budgetMinutes, timeBudget?.input_unit]);

  return (
    <div className="space-y-6">
      {isReadOnlyObserver && (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/50 px-4 py-3 flex items-center gap-2.5 text-xs font-extrabold text-sky-900 dark:text-sky-200 shadow-2xs">
          <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>
            حالت «والدین / مشاور (ناظر فقط‌خواندنی)» فعال است — داده‌های زنده دانش‌آموز را بدون امکان تغییر، حذف یا ارسال مشاهده می‌کنید.
          </span>
        </div>
      )}

      {/* =====================================================================
          REDESIGNED STUDENT PLANNER HERO CONTAINER
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-900 via-indigo-800 to-violet-900 text-white p-4 sm:p-6 lg:p-7 shadow-lg shadow-indigo-950/15">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 w-64 h-64 rounded-full bg-emerald-400/15 blur-2xl" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          {/* 1: Centered Main Title (Without Date) */}
          <div className="flex items-center justify-center gap-1.5 text-center">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
            <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white whitespace-nowrap truncate">
              برنامه‌ریزی هوشمند دانش‌آموز
            </h1>
          </div>

          {/* 2: Motivational Quote in an Independent Subtle Bordered Box */}
          <div className="max-w-2xl mx-auto w-full rounded-2xl border border-white/20 bg-white/[0.06] backdrop-blur-xs px-4 py-2.5 text-center shadow-2xs">
            <p className="text-xs sm:text-sm font-bold text-indigo-100/95 tracking-wide leading-relaxed">
              {activeTab === 'weekly'
                ? 'نمای کلی برنامه هفتگی (شنبه تا جمعه) — با نظم و پیوستگی اهداف هفته را محقق کن'
                : selectedDate === todayIso
                ? 'مأموریت‌های امروزت را با قدرت پیش ببر'
                : `برنامه‌ریزی هدفمند و پیگیری دقیق عملکرد ${formatJalaliWeekdaySlash(selectedDate)}`}
            </p>
          </div>

          {/* =================================================================
              SECTION 3: DAILY PERFORMANCE METRICS
              - Top 2 Centered Single-Line Rows: امتیاز نهایی روز (DS) & امتیاز مستقیم آموزشی (E)
              - 8 Compact Single-Line Cards in 2 Symmetrical Columns × 4 Rows
                with Top-Border Centered Floating Icons
          ================================================================= */}
          <div className="space-y-3 pt-0.5">
            {/* Two Compact Centered Rows for DS and E (No Box/Border) */}
            <div className="space-y-1 py-0.5 text-center">
              {/* Row 1: امتیاز نهایی روز (DS) */}
              <div className="flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-amber-200 whitespace-nowrap">
                  امتیاز نهایی روز (DS):
                </span>
                <span className="text-sm sm:text-base font-black text-white tabular-nums tracking-tight whitespace-nowrap">
                  {dayEval.finalDailyScoreS !== null
                    ? `${toPersianDigits(dayEval.finalDailyScoreS)}٪`
                    : 'در انتظار ثبت'}
                </span>
              </div>

              {/* Row 2: امتیاز مستقیم آموزشی (E) */}
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold text-white/95 whitespace-nowrap">
                  امتیاز مستقیم آموزشی (E):
                </span>
                <span className="text-sm sm:text-base font-black text-white tabular-nums tracking-tight whitespace-nowrap">
                  {dayEval.educationalCompositeE !== null
                    ? `${toPersianDigits(dayEval.educationalCompositeE)}٪`
                    : 'در انتظار ثبت'}
                </span>
              </div>
            </div>

            {/* 2: 8 Compact Single-Line Cards in 2-Column (Mobile) / 4-Column (Desktop) Grid with Top-Border Icons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-3.5 pt-1.5">
              {/* ROW 1 — Right Col #1: تست و تمرین */}
              <div className="relative rounded-xl bg-emerald-500/15 border border-emerald-300/30 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  تست و تمرین: {toPersianDigits(daySummary.totalExercises)}
                </div>
              </div>

              {/* ROW 1 — Left Col #1: تحقق زمان (T) */}
              <div className="relative rounded-xl bg-indigo-500/20 border border-indigo-300/35 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  تحقق زمان (T):{' '}
                  {dayEval.studyTimeIndexT !== null
                    ? `${toPersianDigits(dayEval.studyTimeIndexT)}٪`
                    : '—'}
                </div>
              </div>

              {/* ROW 2 — Right Col #2: مأموریت تکمیل‌شده */}
              <div className="relative rounded-xl bg-orange-500/15 border border-orange-300/30 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  مأموریت تکمیل‌شده: {toPersianDigits(daySummary.completedCount)}/
                  {toPersianDigits(daySummary.totalCount)}
                </div>
              </div>

              {/* ROW 2 — Left Col #2: تحقق تست (Q) */}
              <div className="relative rounded-xl bg-sky-500/15 border border-sky-300/30 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <FileCheck2 className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  تحقق تست (Q):{' '}
                  {dayEval.exercisesIndexQ !== null
                    ? `${toPersianDigits(dayEval.exercisesIndexQ)}٪`
                    : '—'}
                </div>
              </div>

              {/* ROW 3 — Right Col #3: زمان پیش‌بینی */}
              <div className="relative rounded-xl bg-cyan-500/15 border border-cyan-300/30 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <Timer className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  زمان پیش‌بینی: {`\u2066${toPersianDigits(daySummary.predStudyMinutes)}′\u2069`}
                </div>
              </div>

              {/* ROW 3 — Left Col #3: کیفیت یادگیری (L) */}
              <div className="relative rounded-xl bg-purple-500/20 border border-purple-300/35 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <Award className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  کیفیت یادگیری (L):{' '}
                  {dayEval.learningQuality0To10 !== null
                    ? toPersianDigits(String(dayEval.learningQuality0To10).replace('.', '/'))
                    : '—'}
                </div>
              </div>

              {/* ROW 4 — Right Col #4: زمان مطالعه */}
              <div className="relative rounded-xl bg-teal-500/15 border border-teal-300/30 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  زمان مطالعه: {`\u2066${toPersianDigits(daySummary.actualStudyMinutes)}′\u2069`}
                </div>
              </div>

              {/* ROW 4 — Left Col #4: کنترل سرگرمی (C) */}
              <div className="relative rounded-xl bg-amber-500/15 border border-amber-300/30 backdrop-blur-xs px-2.5 pt-2.5 pb-1.5 text-center min-w-0">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-indigo-900 flex items-center justify-center">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums whitespace-nowrap truncate">
                  کنترل سرگرمی (C):{' '}
                  {dayEval.restrictedControlIndexC !== null
                    ? `${toPersianDigits(dayEval.restrictedControlIndexC)}٪`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================
              SECTION 4: CENTERED "ثبت فعالیت جدید" BUTTON
          ================================================================= */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              disabled={isReadOnlyObserver}
              onClick={() => openCreateForm()}
              title={
                isReadOnlyObserver
                  ? 'در نقش ناظر (والدین/مشاور) ثبت فعالیت جدید غیرفعال است'
                  : 'ثبت فعالیت جدید'
              }
              className="w-full max-w-xs sm:max-w-sm flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 px-6 py-3 text-xs sm:text-sm font-black shadow-lg shadow-amber-400/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap min-h-[46px]"
            >
              <Plus className="w-4 h-4 stroke-[2.8] shrink-0" />
              <span>{isReadOnlyObserver ? 'حالت مشاهده (فقط‌خواندنی)' : 'ثبت فعالیت جدید'}</span>
            </button>
          </div>

          {/* =================================================================
              SECTION 5: 4 DAY NAVIGATION BUTTONS IN ONE ROW (RIGHT-TO-LEFT)
              ۱. روز قبل | ۲. امروز | ۳. روز بعد | ۴. نمایش هفتگی
          ================================================================= */}
          <div className="pt-2 border-t border-white/15 space-y-2.5">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 max-w-2xl mx-auto w-full">
              {/* ۱. روز قبل */}
              <button
                type="button"
                onClick={() => {
                  const prevIso = addDaysISO(selectedDate, -1);
                  setSelectedDate(prevIso);
                  setWeekRefDate(prevIso);
                  setActiveTab('today');
                }}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] sm:text-xs font-extrabold text-white transition-all cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                <span>روز قبل</span>
              </button>

              {/* ۲. امروز */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayIso);
                  setWeekRefDate(todayIso);
                  setActiveTab('today');
                }}
                className={`flex items-center justify-center px-2 sm:px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap min-h-[40px] border ${
                  isTodaySelected
                    ? 'bg-white text-indigo-950 border-white shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                }`}
              >
                <span>امروز</span>
              </button>

              {/* ۳. روز بعد */}
              <button
                type="button"
                onClick={() => {
                  const nextIso = addDaysISO(selectedDate, 1);
                  setSelectedDate(nextIso);
                  setWeekRefDate(nextIso);
                  setActiveTab('today');
                }}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] sm:text-xs font-extrabold text-white transition-all cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <span>روز بعد</span>
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              </button>

              {/* ۴. نمایش هفتگی */}
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'weekly' ? 'today' : 'weekly')}
                className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap min-h-[40px] border ${
                  activeTab === 'weekly'
                    ? 'bg-white text-indigo-950 border-white shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 hidden sm:inline-block shrink-0" />
                <span>نمایش هفتگی</span>
              </button>
            </div>

            {/* ===============================================================
                SECTION 6: DATE PICKER FIELD BELOW THE 4 BUTTONS (PORTAL POPOVER)
            =============================================================== */}
            <div className="max-w-xs sm:max-w-sm mx-auto w-full flex justify-center">
              <ShamsiDateField
                selectedIso={selectedDate}
                onSelectIso={(iso) => {
                  setSelectedDate(iso);
                  setWeekRefDate(iso);
                  if (activeTab === 'weekly') {
                    setActiveTab('today');
                  }
                }}
                align="center"
                fullWidth
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          DAILY VIEW (برنامه امروز / برنامه فردا / روز انتخابی)
      ===================================================================== */}
      {activeTab !== 'weekly' && (
        <div className="space-y-3.5">
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
              SECTION 2: DAILY TIME BUDGET (ظرف زمانی روز)
              - Upper part: Header with Registered Capacity + Always-visible Shares Bar
              - Accordion body: Simplified 3-element capacity input form
              - Outside accordion: Two side-by-side Progress Bar comparison cards
          ================================================================= */}
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
              {/* Accordion Header with Registered Capacity in Title */}
              <button
                type="button"
                onClick={() => setIsBudgetAccordionOpen((prev) => !prev)}
                aria-expanded={isBudgetAccordionOpen}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-right hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/50">
                    <Timer className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate tabular-nums">
                    {formattedRegisteredBudgetTitle
                      ? `ظرف زمانی روز — ${formattedRegisteredBudgetTitle}`
                      : 'ظرف زمانی روز'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {isBudgetAccordionOpen ? 'بستن تنظیمات' : 'تنظیم ظرفیت'}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
                      isBudgetAccordionOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Always-Visible Activity Shares Progress Bar in Upper Part of Daily Time Budget */}
              {dayEval.budgetMinutes !== null && dayEval.budgetMinutes > 0 && (
                <div className="px-4 sm:px-5 pb-3 pt-0.5 space-y-1.5">
                  <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden flex">
                    <div
                      className="bg-indigo-600 h-full transition-all"
                      style={{ width: `${Math.min(100, dayEval.studyShareOfBudgetPct ?? 0)}%` }}
                      title="سهم مطالعه و آموزش"
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${Math.min(100, dayEval.essentialShareOfBudgetPct ?? 0)}%`,
                      }}
                      title="سهم استراحت و فعالیت‌های ضروری"
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{
                        width: `${Math.min(100, dayEval.restrictedShareOfBudgetPct ?? 0)}%`,
                      }}
                      title="سهم سرگرمی محدودشونده"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-bold tabular-nums">
                    <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      <span>مطالعه: {toPersianDigits(dayEval.studyShareOfBudgetPct ?? 0)}٪</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>استراحت و ضروری: {toPersianDigits(dayEval.essentialShareOfBudgetPct ?? 0)}٪</span>
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 dark:text-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>سرگرمی: {toPersianDigits(dayEval.restrictedShareOfBudgetPct ?? 0)}٪</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Accordion Body: Only the 3 Essential Form Controls */}
              {isBudgetAccordionOpen && (
                <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <form
                    onSubmit={handleSaveTimeBudget}
                    className="flex items-center justify-center gap-2"
                  >
                    <input
                      type="number"
                      min={0}
                      max={budgetUnit === 'hours' ? 24 : 1440}
                      step={budgetUnit === 'hours' ? '0.5' : '15'}
                      value={budgetInputValue}
                      onChange={(e) => setBudgetInputValue(e.target.value)}
                      placeholder={budgetUnit === 'hours' ? 'مثلاً 6' : 'مثلاً 360'}
                      className="w-24 sm:w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums text-center min-h-[38px]"
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
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                    >
                      <option value="hours">ساعت</option>
                      <option value="minutes">دقیقه</option>
                    </select>
                    <button
                      type="submit"
                      disabled={savingBudget || isReadOnlyObserver}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
                    >
                      {savingBudget ? '...' : isReadOnlyObserver ? 'فقط‌خواندنی' : 'ثبت ظرفیت'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Sections 3 & 4: Redesigned Horizontal Progress Bar Comparison Cards */}
            {dayEval.budgetMinutes !== null && dayEval.budgetMinutes > 0 && (() => {
              const budgetMins = dayEval.budgetMinutes;

              // Card 1: Planned vs Capacity
              const plannedMins = dayEval.totalPlannedAllMinutes;
              const plannedRemainingMins = Math.max(0, budgetMins - plannedMins);
              const plannedOverMins = Math.max(0, plannedMins - budgetMins);
              const isPlannedOver = plannedOverMins > 0;
              const plannedFillPct = isPlannedOver
                ? Math.round((budgetMins / plannedMins) * 100)
                : Math.min(100, Math.round((plannedMins / budgetMins) * 100));
              const plannedOverPct = isPlannedOver ? Math.max(0, 100 - plannedFillPct) : 0;

              // Card 2: Actual Study Performance vs Capacity
              const actualStudyMins = daySummary.actualStudyMinutes;
              const actualRemainingMins = Math.max(0, budgetMins - actualStudyMins);
              const actualOverMins = Math.max(0, actualStudyMins - budgetMins);
              const isActualOver = actualOverMins > 0;
              const actualFillPct = isActualOver
                ? Math.round((budgetMins / actualStudyMins) * 100)
                : Math.min(100, Math.round((actualStudyMins / budgetMins) * 100));
              const actualOverPct = isActualOver ? Math.max(0, 100 - actualFillPct) : 0;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: برنامه‌ریزی در برابر ظرفیت (Blue Horizontal Progress Bar) */}
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-4 py-3 space-y-2 shadow-xs">
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 text-center">
                      برنامه‌ریزی در برابر ظرفیت
                    </div>

                    <div className="space-y-1">
                      {/* Values above filled (right) and empty/over (left) segments */}
                      <div className="flex items-center justify-between text-xs font-extrabold tabular-nums px-0.5">
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatClockPrime(plannedMins)}
                        </span>
                        <span
                          className={
                            isPlannedOver
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {isPlannedOver
                            ? `+${formatClockPrime(plannedOverMins)}`
                            : formatClockPrime(plannedRemainingMins)}
                        </span>
                      </div>

                      {/* Horizontal Progress Bar */}
                      <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden flex">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${plannedFillPct}%` }}
                        />
                        {isPlannedOver && (
                          <div
                            className="bg-rose-500 h-full transition-all duration-300 border-r border-white/60 dark:border-slate-900/60"
                            style={{ width: `${plannedOverPct}%` }}
                          />
                        )}
                      </div>

                      {/* Total capacity below bar */}
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center tabular-nums pt-0.5">
                        کل ظرفیت: {formatClockPrime(budgetMins)}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: عملکرد واقعی در برابر ظرفیت (Green Horizontal Progress Bar + Over-Capacity Support) */}
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-4 py-3 space-y-2 shadow-xs">
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 text-center">
                      عملکرد واقعی در برابر ظرفیت
                    </div>

                    <div className="space-y-1">
                      {/* Values above filled (right) and empty/surplus (left) segments */}
                      <div className="flex items-center justify-between text-xs font-extrabold tabular-nums px-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatClockPrime(actualStudyMins)}
                        </span>
                        <span
                          className={
                            isActualOver
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {isActualOver
                            ? `+${formatClockPrime(actualOverMins)}`
                            : formatClockPrime(actualRemainingMins)}
                        </span>
                      </div>

                      {/* Horizontal Progress Bar */}
                      <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${actualFillPct}%` }}
                        />
                        {isActualOver && (
                          <div
                            className="bg-amber-500 h-full transition-all duration-300 border-r border-white/60 dark:border-slate-900/60"
                            style={{ width: `${actualOverPct}%` }}
                          />
                        )}
                      </div>

                      {/* Total capacity below bar */}
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center tabular-nums pt-0.5">
                        کل ظرفیت: {formatClockPrime(budgetMins)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* =================================================================
              SECTION 6: COMPACT SINGLE-LINE SORT BUTTONS (NO CONTAINER CARD)
          ================================================================= */}
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-xl">
              <button
                type="button"
                onClick={() => setSortBy('priority')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer ${
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
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'custom'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ترتیب دلخواه
              </button>
            </div>
          </div>

          {transferToastMessage && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3.5 flex items-center justify-between gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{transferToastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setTransferToastMessage(null)}
                className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
                  className="h-40 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
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
              {!isReadOnlyObserver && (
                <button
                  type="button"
                  onClick={() => openCreateForm()}
                  className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت اولین فعالیت این روز</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedDailyPlans.map((plan, index) => {
                const isStudy = Number(plan.is_study) === 1;
                const activityGroup = classifyPlanActivityGroup(plan, categoriesMap);
                const predMins = plan.initial_predicted_minutes || plan.predicted_minutes;
                const actualMins = plan.performance?.actual_minutes;
                const hasPerf = Boolean(plan.performance);
                const diff = hasPerf && actualMins !== undefined ? actualMins - predMins : null;

                // Dedicated Gradient Header Theme per Subject / Activity
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

                // Actual-to-Predicted Time Ratio (can exceed 100%)
                const actualToPredRatioPct =
                  hasPerf && actualMins !== undefined
                    ? calculateActualToPredictedRatioPct(actualMins, predMins) ?? 0
                    : 0;

                const parsedQuality0To10 = hasPerf
                  ? parseLearningQuality0To10(plan.performance?.learning_quality)
                  : null;

                // Line 1: Full-width Title + Subject/Unit + Priority Code
                const singleLineTitle = isStudy
                  ? `${plan.subject_name_snapshot || 'درس'}${
                      plan.unit_title_snapshot ? ` · ${plan.unit_title_snapshot}` : ''
                    } · ${plan.priority_code}`
                  : `${plan.category_title_snapshot} · ${plan.priority_code}`;

                // Line 2: Subtle Yellow Activity Type Subtitle under the main title
                const activityTypeSubtitle = isStudy
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
                          SECTION 4-1: REDESIGNED 2-ROW GRADIENT HEADER
                          - Row 1: Full-width Persian Title + Priority (100% width)
                          - Row 2: Subtle Yellow Activity Type Subtitle (Right) + 4 Action Buttons (Left)
                      ========================================================= */}
                      <div
                        className={`px-3.5 py-2.5 ${gradTheme.headerGradient} space-y-1.5`}
                      >
                        {/* Row 1: Full-Width Activity Title */}
                        <div className="flex items-center gap-2.5 min-w-0 w-full">
                          <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                            <ThemeIcon className="w-4 h-4" />
                          </div>
                          <h3
                            className="text-xs sm:text-sm font-extrabold text-white truncate whitespace-nowrap flex-1 min-w-0"
                            title={singleLineTitle}
                          >
                            {singleLineTitle}
                          </h3>
                        </div>

                        {/* Row 2: Subtle Activity Type Label (Right) + 4 Action Controls (Left) */}
                        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-white/15">
                          <div className="text-[10px] sm:text-[11px] font-extrabold text-amber-200 truncate min-w-0">
                            {activityTypeSubtitle}
                          </div>

                          {/* 4 Action Buttons on Left */}
                          {!isReadOnlyObserver && (
                            <div
                              className="flex items-center gap-0.5 bg-black/15 rounded-xl px-1 py-0.5 shrink-0"
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
                          )}
                        </div>
                      </div>

                      {/* =========================================================
                          SECTION 8: COMPACT CARD BODY
                      ========================================================= */}
                      <div className="px-4 py-2.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                          <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            پیش‌بینی: {formatMinutesPersian(predMins)}
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            {isStudy &&
                              plan.target_exercises !== null &&
                              plan.target_exercises !== undefined &&
                              plan.target_exercises > 0 && (
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  هدف تست: {toPersianDigits(plan.target_exercises)} تست
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

                        {plan.transferred_from_date && (
                          <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            <span className="inline-flex items-center gap-1 truncate">
                              <CalendarArrowUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>
                                منتقل‌شده از {formatJalaliWeekdaySlash(plan.transferred_from_date)}
                              </span>
                            </span>
                            {Number(plan.transfer_count || 0) > 1 && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 shrink-0">
                                {toPersianDigits(plan.transfer_count || 1)} نوبت انتقال
                              </span>
                            )}
                          </div>
                        )}

                        {plan.description && (
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed truncate">
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =========================================================
                        SECTIONS 9, 10 & 11: SINGLE-LINE PROGRESS BAR & ACTUAL PERFORMANCE
                    ========================================================= */}
                    <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2 bg-slate-50/40 dark:bg-slate-900/50">
                      {/* Section 9: Single-Line Progress Bar */}
                      <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                          زمان واقعی نسبت به پیش‌بینی:
                        </span>

                        <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden min-w-[50px]">
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

                        <span
                          className={`shrink-0 whitespace-nowrap ${
                            !hasPerf
                              ? 'text-slate-400'
                              : activityGroup === 'restricted' && actualToPredRatioPct > 100
                              ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                              : actualToPredRatioPct >= 100
                              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                              : 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                          }`}
                        >
                          {hasPerf ? `${toPersianDigits(actualToPredRatioPct)}٪` : '۰٪'}
                        </span>
                      </div>

                      {/* Sections 10 & 11: Symmetrical Actual Performance + «تحلیل درس» (Bottom-Right) + «انتقال به روز بعد» (Bottom-Left) */}
                      {!hasPerf ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium min-w-0 truncate">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">آماده انجام (برای ثبت عملکرد کلیک کنید)</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {isStudy && plan.subject_id && onInspectSubject ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectSubject(plan.subject_id!);
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-violet-200 dark:border-violet-800/70 bg-violet-50/85 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/60 px-2.5 py-1 text-[11px] font-extrabold text-violet-700 dark:text-violet-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                title="مشاهده کارنامه، سطح و تحلیل اختصاصی این درس"
                              >
                                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                <span>تحلیل درس</span>
                              </button>
                            ) : (
                              <div />
                            )}
                            {!isReadOnlyObserver && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferringPlan(plan);
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                title="انتقال این فعالیت به برنامه روز بعد"
                              >
                                <CalendarArrowUp className="w-3.5 h-3.5 shrink-0" />
                                <span>انتقال به روز بعد</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] tabular-nums pt-0.5">
                          {/* Item 1 (Row 1 Right): Completion Status */}
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            {plan.status === 'completed' ? (
                              <span className="flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>تکمیل شده</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400 truncate">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>ناقص</span>
                              </span>
                            )}
                          </div>

                          {/* Item 2 (Row 1 Left): Actual Time + Prime Symbol Variance in Parentheses */}
                          <div className="flex items-center justify-end gap-1 min-w-0 truncate text-left">
                            <span className="text-slate-800 dark:text-slate-200 font-bold truncate">
                              واقعی: {`\u2066${toPersianDigits(actualMins || 0)}′\u2069`}
                              {diff !== null && (
                                <span
                                  className={`mr-1 font-semibold ${
                                    diff === 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : diff > 0
                                      ? activityGroup === 'restricted'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                      : 'text-indigo-600 dark:text-indigo-400'
                                  }`}
                                >
                                  (
                                  {diff === 0
                                    ? 'مطابق پیش‌بینی'
                                    : diff > 0
                                    ? `\u2066${toPersianDigits(diff)}′\u2069 بیشتر`
                                    : `\u2066${toPersianDigits(Math.abs(diff))}′\u2069 کمتر`}
                                  )
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Row 2 for Study Activities: Exercises Completed + Learning Quality */}
                          {isStudy && (
                            <>
                              <div className="flex items-center gap-1 min-w-0 truncate text-slate-700 dark:text-slate-300 font-semibold">
                                <FileCheck2 className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">
                                  تست انجام‌شده:{' '}
                                  {plan.performance?.exercises_count !== null &&
                                  plan.performance?.exercises_count !== undefined
                                    ? `${toPersianDigits(plan.performance.exercises_count)} تست`
                                    : '—'}
                                </span>
                              </div>

                              <div className="flex items-center justify-end gap-1 min-w-0 truncate text-left text-slate-700 dark:text-slate-300 font-semibold">
                                <Award className="w-3 h-3 text-purple-500 shrink-0" />
                                <span className="truncate">
                                  کیفیت یادگیری:{' '}
                                  {parsedQuality0To10 !== null
                                    ? `${toPersianDigits(
                                        String(parsedQuality0To10).replace('.', '/')
                                      )} از ۱۰`
                                    : '—'}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Bottom Action Row: «تحلیل درس» (Bottom-Right) & «انتقال به روز بعد» (Bottom-Left) */}
                          {((isStudy && plan.subject_id && onInspectSubject) ||
                            plan.status !== 'completed') && (
                            <div className="col-span-2 pt-1 flex items-center justify-between gap-2">
                              {isStudy && plan.subject_id && onInspectSubject ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInspectSubject(plan.subject_id!);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-violet-200 dark:border-violet-800/70 bg-violet-50/85 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/60 px-2.5 py-1 text-[11px] font-extrabold text-violet-700 dark:text-violet-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                  title="مشاهده کارنامه، سطح و تحلیل اختصاصی این درس"
                                >
                                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                  <span>تحلیل درس</span>
                                </button>
                              ) : (
                                <div />
                              )}

                              {plan.status !== 'completed' && !isReadOnlyObserver && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTransferringPlan(plan);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                                >
                                  <CalendarArrowUp className="w-3.5 h-3.5 shrink-0" />
                                  <span>انتقال به روز بعد</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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

                      {!isReadOnlyObserver && (
                        <button
                          type="button"
                          onClick={() => openCreateForm(day.isoDate)}
                          className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title={`افزودن فعالیت برای ${day.fullLabel}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
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
        dayPlans={
          activePerformancePlan
            ? activeTab === 'weekly'
              ? weeklyPlans.filter((p) => p.plan_date === activePerformancePlan.plan_date)
              : dailyPlans
            : dailyPlans
        }
        onClose={() => setActivePerformancePlan(null)}
        onSave={handleSavePerformance}
        onResetPerformance={handleResetPerformance}
        onTransferToNextDay={handleTransferPlanToNextDay}
      />

      {transferringPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <CalendarArrowUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  انتقال فعالیت به روز بعد
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  این فعالیت به برنامه روز بعد منتقل خواهد شد و اطلاعات ثبت‌شده آن حفظ می‌شوند. آیا ادامه می‌دهید؟
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 dark:text-white truncate">
                {Number(transferringPlan.is_study) === 1
                  ? `${transferringPlan.subject_name_snapshot || 'درس'}${
                      transferringPlan.unit_title_snapshot
                        ? ` · ${transferringPlan.unit_title_snapshot}`
                        : ''
                    }`
                  : transferringPlan.category_title_snapshot}
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                <span>اولویت: {transferringPlan.priority_code}</span>
                <span>
                  مقصد: {formatJalaliWeekdaySlash(addDaysISO(transferringPlan.plan_date, 1))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTransferringPlan(null)}
                disabled={transferSubmitting}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmCardTransfer}
                disabled={transferSubmitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer min-h-[40px]"
              >
                {transferSubmitting ? 'در حال انتقال...' : 'تأیید و انتقال'}
              </button>
            </div>
          </div>
        </div>
      )}

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
