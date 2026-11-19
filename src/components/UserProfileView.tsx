import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Upload,
  Check,
  X,
  Edit3,
  RotateCcw,
  Trash2,
  School,
  Calendar,
  Target,
  BookOpen,
} from 'lucide-react';
import type { Subject, DailyPlanItem } from '../types.ts';
import { api } from '../services/api.ts';
import { getTodayISO, toPersianDigits, formatHoursAndMinutesPersian } from '../utils/jalali.ts';
import { evaluateGlobalXpLedger } from '../utils/analyticsEngine.ts';
import {
  loadStudentProfile,
  saveStudentProfile,
  resetStudentProfile,
  compressAvatarImageFile,
  GRADE_LEVEL_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
  AVATAR_PRESET_OPTIONS,
  type StudentProfile,
  type AvatarPresetOption,
} from '../utils/studentProfile.ts';

interface UserProfileViewProps {
  subjects: Subject[];
  refreshTrigger?: number;
}

const PresetAvatarSvg: React.FC<{ preset: AvatarPresetOption; className?: string }> = ({
  preset,
  className = 'w-full h-full',
}) => {
  const gradId = `martia-av-${preset.id}`;

  if (preset.variant === 'scholar') {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={preset.bgFrom} />
            <stop offset="100%" stopColor={preset.bgTo} />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill={`url(#${gradId})`} />
        <polygon points="60,28 100,48 60,68 20,48" fill={preset.accent} />
        <path
          d="M36 58v18c0 9 11 16 24 16s24-7 24-16V58l-24 12-24-12z"
          fill={preset.shirtColor}
          opacity="0.92"
        />
        <line x1="94" y1="51" x2="94" y2="79" stroke={preset.accent} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="94" cy="82" r="4.5" fill="#d97706" />
      </svg>
    );
  }

  if (preset.variant === 'book') {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={preset.bgFrom} />
            <stop offset="100%" stopColor={preset.bgTo} />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill={`url(#${gradId})`} />
        <path
          d="M24 38c0-4 3-7 7-7h22c4 0 7 3 7 7v50c-5-4-12-6-20-6H31c-4 0-7-3-7-7V38z"
          fill={preset.accent}
        />
        <path
          d="M96 38c0-4-3-7-7-7H67c-4 0-7 3-7 7v50c5-4 12-6 20-6h9c4 0 7-3 7-7V38z"
          fill={preset.shirtColor}
        />
        <line x1="34" y1="46" x2="50" y2="46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1="34" y1="56" x2="48" y2="56" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
        <line x1="70" y1="46" x2="86" y2="46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1="72" y1="56" x2="86" y2="56" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.bgFrom} />
          <stop offset="100%" stopColor={preset.bgTo} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${gradId})`} />

      {/* Shoulders / Shirt */}
      <path d="M22 120c2-24 18-36 38-36s36 12 38 36H22z" fill={preset.shirtColor} />
      <path d="M48 84l12 12 12-12" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />

      {/* Neck */}
      <rect x="52" y="69" width="16" height="17" rx="7" fill={preset.skinColor} />

      {/* Hijab outer wrap (if hijab variant) */}
      {preset.variant === 'hijab' && (
        <path
          d="M32 52c0-18 12-30 28-30s28 12 28 30v28c0 9-8 14-28 14S32 89 32 80V52z"
          fill={preset.hairColor}
        />
      )}

      {/* Head */}
      <circle cx="60" cy="52" r="22" fill={preset.skinColor} />

      {/* Hair styles */}
      {preset.variant === 'classic' && (
        <path
          d="M37 49c1-16 11-26 24-26 14 0 22 9 23 25-5-6-12-9-22-9-11 0-19 4-25 10z"
          fill={preset.hairColor}
        />
      )}

      {preset.variant === 'glasses' && (
        <>
          <path
            d="M37 48c1-15 11-25 23-25 13 0 22 9 23 25-6-5-13-8-23-8-10 0-17 3-23 8z"
            fill={preset.hairColor}
          />
          <rect x="43" y="47" width="14" height="10" rx="4" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          <rect x="63" y="47" width="14" height="10" rx="4" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="57" y1="52" x2="63" y2="52" stroke="#1e293b" strokeWidth="2.5" />
        </>
      )}

      {preset.variant === 'cap' && (
        <>
          <path d="M36 44c2-14 12-22 24-22s22 8 24 22H36z" fill={preset.accent} />
          <path d="M35 44h53c4 0 7 2 7 5H35v-5z" fill={preset.shirtColor} />
        </>
      )}

      {preset.variant === 'curly' && (
        <g fill={preset.hairColor}>
          <circle cx="43" cy="34" r="9" />
          <circle cx="54" cy="28" r="10" />
          <circle cx="67" cy="29" r="10" />
          <circle cx="77" cy="35" r="8.5" />
          <circle cx="38" cy="43" r="6.5" />
          <circle cx="82" cy="43" r="6.5" />
        </g>
      )}

      {/* Eyes & warm smile */}
      <circle cx="51" cy="52" r="2.5" fill="#1e293b" />
      <circle cx="69" cy="52" r="2.5" fill="#1e293b" />
      <path
        d="M52 62c2.5 3.2 5.2 4.5 8 4.5s5.5-1.3 8-4.5"
        fill="none"
        stroke="#7c2d12"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const StudentAvatar: React.FC<{
  profile: StudentProfile;
  sizeClass?: string;
}> = ({ profile, sizeClass = 'w-24 h-24' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [profile.customAvatarDataUrl, profile.avatarType]);

  const activePreset = useMemo(
    () =>
      AVATAR_PRESET_OPTIONS.find((p) => p.id === profile.avatarPresetId) ||
      AVATAR_PRESET_OPTIONS[0],
    [profile.avatarPresetId]
  );

  const showCustom =
    profile.avatarType === 'custom' && Boolean(profile.customAvatarDataUrl) && !imgFailed;

  return (
    <div
      className={`${sizeClass} rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 select-none`}
    >
      {showCustom ? (
        <img
          src={profile.customAvatarDataUrl!}
          alt={`آواتار ${profile.fullName}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <PresetAvatarSvg preset={activePreset} />
      )}
    </div>
  );
};

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  subjects,
  refreshTrigger = 0,
}) => {
  const [profile, setProfile] = useState<StudentProfile>(() => loadStudentProfile());
  const [draft, setDraft] = useState<StudentProfile>(() => loadStudentProfile());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [allPlans, setAllPlans] = useState<DailyPlanItem[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const hasLoadedStatsRef = useRef<boolean>(false);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        if (!hasLoadedStatsRef.current) setLoadingStats(true);
        const plans = await api.getPlansByRange('2020-01-01', '2099-12-31');
        if (active) {
          setAllPlans(plans);
          hasLoadedStatsRef.current = true;
        }
      } catch {
        // Non-blocking: profile still displays cleanly without study stats
      } finally {
        if (active) setLoadingStats(false);
      }
    };
    loadStats();
    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const activeSubjectsCount = useMemo(
    () => subjects.filter((s) => Number(s.is_archived ?? 0) === 0).length,
    [subjects]
  );

  const academicSummary = useMemo(() => {
    const todayIso = getTodayISO();
    const studyPlans = allPlans.filter((p) => Number(p.is_study) === 1);
    let totalStudyMinutes = 0;
    let totalExercises = 0;

    for (const plan of studyPlans) {
      totalStudyMinutes += Number(plan.performance?.actual_minutes || 0);
      totalExercises += Number(plan.performance?.exercises_count || 0);
    }

    const ledger = evaluateGlobalXpLedger(allPlans, todayIso);
    const stage = ledger.currentStageProgress;

    return {
      totalStudyMinutes,
      totalExercises,
      netTotalXp: ledger.netTotalXp,
      stageNumber: stage.stageNumber,
      levelTitleFa: stage.stageNameFa,
      rankTitleFa: stage.honoraryTitle,
    };
  }, [allPlans]);

  const handleStartEdit = () => {
    setDraft(profile);
    setConfirmReset(false);
    setFeedback(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraft(profile);
    setConfirmReset(false);
    setIsEditing(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.fullName.trim()) {
      setFeedback({ type: 'error', text: 'وارد کردن نام دانش‌آموز الزامی است.' });
      return;
    }
    const saved = saveStudentProfile(draft);
    setProfile(saved);
    setDraft(saved);
    setIsEditing(false);
    setFeedback({ type: 'success', text: 'اطلاعات پروفایل کاربری با موفقیت ذخیره شد.' });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingAvatar(true);
    setFeedback(null);
    try {
      const dataUrl = await compressAvatarImageFile(file);
      setDraft((prev) => ({
        ...prev,
        avatarType: 'custom',
        customAvatarDataUrl: dataUrl,
      }));
      setFeedback({
        type: 'success',
        text: 'تصویر آواتار بارگذاری شد. برای ثبت نهایی روی «ذخیره تغییرات» بزنید.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'بارگذاری تصویر آواتار ناموفق بود.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleConfirmReset = () => {
    const fresh = resetStudentProfile();
    setProfile(fresh);
    setDraft(fresh);
    setConfirmReset(false);
    setIsEditing(false);
    setFeedback({ type: 'success', text: 'پروفایل کاربری به حالت پیش‌فرض بازنشانی شد.' });
  };

  const metadataSegments = [
    `پایه ${profile.gradeLevel}`,
    profile.fieldOfStudy,
    profile.schoolName ? `مدرسه ${profile.schoolName}` : null,
    profile.academicYear ? `سال تحصیلی ${toPersianDigits(profile.academicYear)}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            پروفایل کاربری دانش‌آموز
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            مشاهده و مدیریت هویت تحصیلی، پایه آموزشی و تصویر آواتار در سامانه
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px]"
          >
            <Edit3 className="w-4 h-4 shrink-0" />
            <span>ویرایش پروفایل</span>
          </button>
        )}
      </div>

      {/* Inline Status Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
              : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <X className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="بستن پیام"
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary Profile Card (Single-Elevation Surface) */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Identity Header */}
        <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <StudentAvatar profile={isEditing ? draft : profile} sizeClass="w-24 h-24 sm:w-28 sm:h-28" />

          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {profile.fullName}
            </h2>

            {/* Clean unboxed typographic metadata line (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {metadataSegments.map((seg, idx) => (
                <React.Fragment key={seg}>
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                  )}
                  <span>{seg}</span>
                </React.Fragment>
              ))}
            </div>

            {profile.studyGoalNote && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">
                {profile.studyGoalNote}
              </p>
            )}
          </div>
        </div>

        {/* Real Academic Summary Strip (Separated by hairline divider, tabular numerals) */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-5 sm:px-7 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              رتبه و سطح کل
            </div>
            {loadingStats ? (
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300 mt-0.5 tabular-nums">
                {academicSummary.levelTitleFa} (پله {toPersianDigits(academicSummary.stageNumber)} از ۳۹)
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              تراز خالص XP
            </div>
            {loadingStats ? (
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {toPersianDigits(academicSummary.netTotalXp.toFixed(1))} XP
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              مجموع مطالعه ثبت‌شده
            </div>
            {loadingStats ? (
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {formatHoursAndMinutesPersian(academicSummary.totalStudyMinutes)}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              دروس فعال / تست حل‌شده
            </div>
            {loadingStats ? (
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
            ) : (
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {toPersianDigits(activeSubjectsCount)} درس · {toPersianDigits(academicSummary.totalExercises)} تست
              </div>
            )}
          </div>
        </div>

        {/* View Mode vs Edit Form */}
        {!isEditing ? (
          <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 px-5 sm:px-7">
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span>نام و نام خانوادگی</span>
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {profile.fullName}
              </span>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                <span>پایه تحصیلی</span>
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {profile.gradeLevel}
              </span>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                <span>مقطع یا رشته تحصیلی</span>
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {profile.fieldOfStudy}
              </span>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <School className="w-4 h-4 text-slate-400 shrink-0" />
                <span>نام مدرسه</span>
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {profile.schoolName || 'ثبت نشده'}
              </span>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>سال تحصیلی</span>
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                {toPersianDigits(profile.academicYear)}
              </span>
            </div>

            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Target className="w-4 h-4 text-slate-400 shrink-0" />
                <span>هدف یا شعار مطالعاتی</span>
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 sm:text-left">
                {profile.studyGoalNote || 'ثبت نشده'}
              </span>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSaveProfile}
            className="border-t border-slate-200 dark:border-slate-800 p-5 sm:p-7 space-y-6"
          >
            {/* Avatar Selection Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-extrabold text-slate-900 dark:text-white">
                  انتخاب آواتار پروفایل
                </label>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadingAvatar ? 'در حال پردازش...' : 'آپلود تصویر دلخواه'}</span>
                  </button>

                  {draft.customAvatarDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          avatarType: 'preset',
                          customAvatarDataUrl: null,
                        }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>حذف تصویر</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {AVATAR_PRESET_OPTIONS.map((preset) => {
                  const isSelected =
                    draft.avatarType === 'preset' && draft.avatarPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      aria-label={preset.label}
                      aria-pressed={isSelected}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          avatarType: 'preset',
                          avatarPresetId: preset.id,
                        }))
                      }
                      className={`relative aspect-square rounded-xl overflow-hidden transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                        isSelected
                          ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900 scale-105'
                          : 'border border-slate-200 dark:border-slate-700 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <PresetAvatarSvg preset={preset} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label
                  htmlFor="student-full-name"
                  className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                >
                  نام و نام خانوادگی دانش‌آموز
                </label>
                <input
                  id="student-full-name"
                  type="text"
                  required
                  maxLength={60}
                  value={draft.fullName}
                  onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="مثلاً: مارتیا حسینی"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-grade-level"
                  className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                >
                  پایه تحصیلی
                </label>
                <select
                  id="student-grade-level"
                  value={draft.gradeLevel}
                  onChange={(e) => setDraft((prev) => ({ ...prev, gradeLevel: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none min-h-[44px]"
                >
                  {GRADE_LEVEL_OPTIONS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-field-study"
                  className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                >
                  مقطع یا رشته تحصیلی
                </label>
                <select
                  id="student-field-study"
                  value={draft.fieldOfStudy}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, fieldOfStudy: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none min-h-[44px]"
                >
                  {FIELD_OF_STUDY_OPTIONS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-school-name"
                  className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                >
                  نام مدرسه (اختیاری)
                </label>
                <input
                  id="student-school-name"
                  type="text"
                  maxLength={60}
                  value={draft.schoolName}
                  onChange={(e) => setDraft((prev) => ({ ...prev, schoolName: e.target.value }))}
                  placeholder="مثلاً: دبیرستان علامه حلی"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-academic-year"
                  className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                >
                  سال تحصیلی
                </label>
                <input
                  id="student-academic-year"
                  type="text"
                  maxLength={20}
                  value={draft.academicYear}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, academicYear: e.target.value }))
                  }
                  placeholder="مثلاً: ۱۴۰۵-۱۴۰۶"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none min-h-[44px] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-goal-note"
                  className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                >
                  هدف یا شعار مطالعاتی (اختیاری)
                </label>
                <input
                  id="student-goal-note"
                  type="text"
                  maxLength={120}
                  value={draft.studyGoalNote}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, studyGoalNote: e.target.value }))
                  }
                  placeholder="مثلاً: تسلط کامل بر ریاضی و علوم در نیم‌سال اول"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap min-h-[42px]"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>ذخیره تغییرات</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap min-h-[42px]"
                >
                  <span>انصراف</span>
                </button>
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>بازنشانی پیش‌فرض</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-rose-600 dark:text-rose-400">مطمئن هستید؟</span>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer whitespace-nowrap"
                  >
                    بله، بازنشانی شود
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    خیر
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
