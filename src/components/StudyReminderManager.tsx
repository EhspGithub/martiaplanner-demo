import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  Play,
  AlarmClock,
  X,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { DailyPlanItem } from '../types.ts';
import { getTodayISO, toPersianDigits, formatMinutesPersian } from '../utils/jalali.ts';

interface StudyReminderManagerProps {
  plans: DailyPlanItem[];
  selectedDate: string;
  onOpenPlan: (plan: DailyPlanItem) => void;
}

const TRIGGERED_STORAGE_KEY = 'martia_planner_triggered_reminders_v1';
const SOUND_ENABLED_KEY = 'martia_planner_reminder_sound_v1';
export const SMART_REMINDER_ENABLED_KEY = 'martia_planner_smart_reminder_enabled_v1';
export const SMART_REMINDER_EVENT_NAME = 'martia-smart-reminder-setting-changed';

export function getSmartReminderEnabled(): boolean {
  try {
    const val = localStorage.getItem(SMART_REMINDER_ENABLED_KEY);
    if (val === null) return true;
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setSmartReminderEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SMART_REMINDER_ENABLED_KEY, String(enabled));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SMART_REMINDER_EVENT_NAME, { detail: { enabled } })
      );
    }
  } catch {
    // ignore storage errors
  }
}

function getCurrentHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function addMinutesToHHMM(hhmm: string, addMins: number): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const total = (h * 60 + m + addMins) % (24 * 60);
  const nextH = String(Math.floor(total / 60)).padStart(2, '0');
  const nextM = String(total % 60).padStart(2, '0');
  return `${nextH}:${nextM}`;
}

function playStudyReminderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 pleasant chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.16);
      osc.stop(ctx.currentTime + idx * 0.16 + 0.48);
    });
  } catch {
    // Ignore audio context restriction errors if user hasn't interacted yet
  }
}

export const StudyReminderManager: React.FC<StudyReminderManagerProps> = ({
  plans,
  selectedDate,
  onOpenPlan,
}) => {
  const todayIso = getTodayISO();
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);
  const [currentClock, setCurrentClock] = useState<string>(getCurrentHHMM());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission;
    }
    return 'unsupported';
  });

  const [activeAlerts, setActiveAlerts] = useState<DailyPlanItem[]>([]);
  const [snoozedMap, setSnoozedMap] = useState<Record<string, string>>({});

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(next));
    } catch {
      // ignore
    }
    if (next) {
      playStudyReminderChime();
    }
  };

  const requestBrowserNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    try {
      const result = await window.Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted' && soundEnabled) {
        playStudyReminderChime();
      }
    } catch {
      // ignore permission prompt errors in restricted webviews
    }
  };

  const dispatchReminderNotification = useCallback(
    (plan: DailyPlanItem, isTest = false) => {
      if (soundEnabled) {
        playStudyReminderChime();
      }

      const isStudy = Number(plan.is_study) === 1;
      const title = isStudy
        ? `⏰ زمان مطالعه ${plan.subject_name_snapshot || 'درس'} فرا رسید!`
        : `⏰ یادآور فعالیت: ${plan.category_title_snapshot}`;

      const body = isStudy
        ? `${plan.unit_title_snapshot || ''} · ${plan.study_type_title_snapshot || ''} (${formatMinutesPersian(
            plan.initial_predicted_minutes || plan.predicted_minutes
          )})`
        : `${plan.description || 'طبق برنامه‌ریزی روزانه'} (${formatMinutesPersian(
            plan.initial_predicted_minutes || plan.predicted_minutes
          )})`;

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        try {
          new window.Notification(isTest ? `[تست اعلان] ${title}` : title, {
            body,
            tag: `martia-reminder-${plan.id}`,
          });
        } catch {
          // Fallback to in-app alert banner
        }
      }

      setActiveAlerts((prev) => {
        if (prev.some((item) => item.id === plan.id)) return prev;
        return [plan, ...prev];
      });
    },
    [soundEnabled]
  );

  // Check every 12 seconds if any of today's incomplete plans match the current HH:MM
  useEffect(() => {
    const checkReminders = () => {
      const hhmm = getCurrentHHMM();
      setCurrentClock(hhmm);

      const todayPlans = plans.filter(
        (p) =>
          p.plan_date === todayIso &&
          p.status !== 'completed' &&
          Boolean(snoozedMap[p.id] || p.reminder_time)
      );

      if (todayPlans.length === 0) return;

      let triggeredRecord: Record<string, boolean> = {};
      try {
        const raw = localStorage.getItem(TRIGGERED_STORAGE_KEY);
        if (raw) triggeredRecord = JSON.parse(raw);
      } catch {
        triggeredRecord = {};
      }

      let updated = false;
      for (const plan of todayPlans) {
        const targetTime = snoozedMap[plan.id] || plan.reminder_time;
        if (!targetTime) continue;

        const triggerKey = `${todayIso}_${plan.id}_${targetTime}`;
        if (targetTime === hhmm && !triggeredRecord[triggerKey]) {
          triggeredRecord[triggerKey] = true;
          updated = true;
          dispatchReminderNotification(plan, false);
        }
      }

      if (updated) {
        try {
          localStorage.setItem(TRIGGERED_STORAGE_KEY, JSON.stringify(triggeredRecord));
        } catch {
          // ignore storage quota errors
        }
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 12000);
    return () => window.clearInterval(timer);
  }, [plans, todayIso, snoozedMap, dispatchReminderNotification]);

  const scheduledPlansForDay = useMemo(
    () =>
      plans
        .filter((p) => Boolean(p.reminder_time))
        .sort((a, b) => (a.reminder_time || '').localeCompare(b.reminder_time || '')),
    [plans]
  );

  const pendingRemindersCount = useMemo(
    () => scheduledPlansForDay.filter((p) => p.status !== 'completed').length,
    [scheduledPlansForDay]
  );

  const handleSnooze = (plan: DailyPlanItem) => {
    const snoozedTime = addMinutesToHHMM(getCurrentHHMM(), 5);
    setSnoozedMap((prev) => ({ ...prev, [plan.id]: snoozedTime }));
    setActiveAlerts((prev) => prev.filter((item) => item.id !== plan.id));
  };

  const handleDismiss = (planId: string) => {
    setActiveAlerts((prev) => prev.filter((item) => item.id !== planId));
  };

  const handleTriggerInstantTest = () => {
    const samplePlan: DailyPlanItem =
      scheduledPlansForDay.find((p) => p.status !== 'completed') ||
      scheduledPlansForDay[0] ||
      plans[0] || {
        id: 'sample-test-reminder',
        plan_date: selectedDate,
        category_id: 'cat_study',
        category_title_snapshot: 'مطالعه درسی',
        is_study: 1,
        subject_id: 'subj_8_math',
        subject_name_snapshot: 'ریاضی',
        unit_id: 'unit_8_math_3',
        unit_title_snapshot: 'فصل ۳: چندضلعی‌ها',
        study_type_id: 'stype_homework',
        study_type_title_snapshot: 'انجام تکالیف و تمرین',
        priority_code: 'A1',
        priority_label: 'مهم‌ترین و فوری‌ترین کار (اولویت اول)',
        priority_rank: 1,
        initial_predicted_minutes: 45,
        predicted_minutes: 45,
        reminder_time: getCurrentHHMM(),
        description: 'یادآور هوشمند شروع مطالعه طبق زمان‌بندی ثبت‌شده شما',
        custom_sort_order: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
        performance: null,
      };

    dispatchReminderNotification(samplePlan, true);
  };

  return (
    <>
      {/* =====================================================================
          FLOATING INTERACTIVE REMINDER NOTIFICATION BANNER (WHEN ALARM FIRES)
      ===================================================================== */}
      {activeAlerts.length > 0 && (
        <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:w-[430px] z-50 space-y-3">
          {activeAlerts.map((alertPlan) => {
            const isStudy = Number(alertPlan.is_study) === 1;
            const displayTime = snoozedMap[alertPlan.id] || alertPlan.reminder_time || currentClock;
            return (
              <div
                key={alertPlan.id}
                className="rounded-3xl border-2 border-amber-400 bg-slate-900/95 backdrop-blur-xl text-white p-5 shadow-2xl shadow-indigo-950/50 animate-in fade-in slide-in-from-top-4 duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/30 animate-bounce">
                      <BellRing className="w-6 h-6 stroke-[2.4]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-extrabold text-amber-300 tabular-nums">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>زنگ یادآور شروع مطالعه · ساعت {toPersianDigits(displayTime)}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-white mt-0.5 leading-snug">
                        {isStudy
                          ? `وقت مطالعه «${alertPlan.subject_name_snapshot}» رسیده!`
                          : `یادآور فعالیت: ${alertPlan.category_title_snapshot}`}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 tabular-nums">
                        {isStudy && alertPlan.unit_title_snapshot
                          ? `${alertPlan.unit_title_snapshot} · ${alertPlan.study_type_title_snapshot || ''} · `
                          : ''}
                        هدف زمانی:{' '}
                        {formatMinutesPersian(
                          alertPlan.initial_predicted_minutes || alertPlan.predicted_minutes
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDismiss(alertPlan.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="بستن اعلان"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/15">
                  {alertPlan.id !== 'sample-test-reminder' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDismiss(alertPlan.id);
                        onOpenPlan(alertPlan);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2.5 text-xs font-extrabold transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>شروع مطالعه و ثبت عملکرد</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSnooze(alertPlan)}
                    className="flex items-center justify-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer min-h-[40px]"
                  >
                    <AlarmClock className="w-3.5 h-3.5" />
                    <span>۵ دقیقه دیگر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismiss(alertPlan.id)}
                    className="rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer min-h-[40px]"
                  >
                    متوجه شدم
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          SECTION 1: COLLAPSIBLE ACCORDION FOR SMART STUDY REMINDER
      ===================================================================== */}
      <div className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-l from-indigo-50/90 via-white to-amber-50/50 dark:from-indigo-950/35 dark:via-slate-900 dark:to-slate-900 shadow-xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsAccordionOpen((prev) => !prev)}
          aria-expanded={isAccordionOpen}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-right hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  یادآور هوشمند زمان مطالعه
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {pendingRemindersCount > 0
                    ? `${toPersianDigits(pendingRemindersCount)} یادآور فعال`
                    : 'بدون یادآور فعال'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums truncate">
                ساعت فعلی سیستم: {toPersianDigits(currentClock)} · صدای زنگ:{' '}
                {soundEnabled ? 'روشن' : 'خاموش'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              {isAccordionOpen ? 'بستن جزئیات' : 'نمایش تنظیمات و یادآورها'}
            </span>
            <div
              className={`w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800 border border-indigo-200/70 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
                isAccordionOpen ? 'rotate-180' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Accordion Body */}
        {isAccordionOpen && (
          <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Scheduled Reminders List */}
            <div className="space-y-1.5">
              {scheduledPlansForDay.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  برای فعالیت‌های این روز هنوز ساعت یادآوری ثبت نشده است. هنگام «ثبت فعالیت جدید» یا «ویرایش»، ساعت یادآوری را تنظیم کن تا سر ساعت بهت خبر داده بشه!
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="font-bold">
                    {toPersianDigits(pendingRemindersCount)} یادآور فعال در انتظار اجرا:
                  </span>
                  {scheduledPlansForDay.map((plan) => {
                    const isDone = plan.status === 'completed';
                    const isStudy = Number(plan.is_study) === 1;
                    const label = isStudy
                      ? plan.subject_name_snapshot
                      : plan.category_title_snapshot;
                    const rTime = snoozedMap[plan.id] || plan.reminder_time || '';

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => onOpenPlan(plan)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer ${
                          isDone
                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 line-through opacity-75'
                            : 'border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{label}</span>
                        <span className="font-extrabold">ساعت {toPersianDigits(rTime)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sound Toggle, Browser Permission & Instant Test Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSound}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer min-h-[38px] ${
                  soundEnabled
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title="فعال یا غیرفعال کردن صدای زنگ هشدار"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>صدای زنگ: روشن</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>صدای زنگ: خاموش</span>
                  </>
                )}
              </button>

              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={requestBrowserNotificationPermission}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-3 py-2 text-xs font-bold transition-colors cursor-pointer min-h-[38px]"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>فعال‌سازی اعلان سیستم</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTriggerInstantTest}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-extrabold shadow-xs transition-colors cursor-pointer min-h-[38px]"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>تست فوری زنگ و اعلان</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
