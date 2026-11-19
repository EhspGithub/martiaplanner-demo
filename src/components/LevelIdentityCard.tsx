import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  Plus,
  Star,
  Zap,
  CheckCircle2,
  BookOpen,
  History,
  TrendingDown,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type {
  SubjectLevelProgress,
  LevelVisualPalette,
  StepTierNumber,
} from '../utils/analyticsEngine.ts';
import { toPersianDigits } from '../utils/jalali.ts';
import { XpCoinBadge } from './XpCoinBadge.tsx';

export interface LevelEmblemBadgeProps {
  level: number;
  stepNumber: StepTierNumber;
  palette: LevelVisualPalette;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Shared Metallic & Gemstone Level Crest for all 13 Levels × 3 Internal Steps
 * Step 1: Pure Material Crest
 * Step 2: Material Crest + crisp Plus (+) tier badge
 * Step 3: Material Crest + radiant Star (★) tier badge
 */
export const LevelEmblemBadge: React.FC<LevelEmblemBadgeProps> = ({
  level,
  stepNumber,
  palette,
  size = 'lg',
}) => {
  const outerSize =
    size === 'sm'
      ? 'w-11 h-11 rounded-xl'
      : size === 'md'
      ? 'w-14 h-14 rounded-2xl'
      : 'w-16 h-16 sm:w-18 sm:h-18 rounded-2xl';

  const cornerBadgeSize =
    size === 'sm'
      ? 'w-4 h-4 -bottom-1 -right-1 rounded-md'
      : size === 'md'
      ? 'w-6 h-6 -bottom-1 -right-1 rounded-lg'
      : 'w-7 h-7 -bottom-1.5 -right-1.5 rounded-xl';

  const levelNumClass =
    size === 'sm'
      ? 'text-sm font-black'
      : size === 'md'
      ? 'text-lg font-black'
      : 'text-xl sm:text-2xl font-black';

  return (
    <div className="relative shrink-0 select-none">
      <div
        className={`${outerSize} p-[2px] shadow-md transition-all`}
        style={{
          background: `linear-gradient(135deg, ${palette.primaryHex}, ${palette.secondaryHex})`,
          boxShadow: `0 6px 18px -4px ${palette.glowHex}`,
        }}
      >
        <div
          className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden ${
            size === 'sm' ? 'rounded-[10px]' : 'rounded-[14px]'
          } ${
            palette.isDarkLuxury
              ? 'bg-gradient-to-br from-zinc-950 via-slate-900 to-indigo-950 text-white'
              : 'bg-slate-950/90 text-white'
          }`}
        >
          {/* Subtle facet sheen for higher / Star & Plus steps */}
          {stepNumber >= 2 && (
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                background: `radial-gradient(circle at 25% 20%, #ffffff, transparent 60%)`,
              }}
            />
          )}
          <span
            className={`font-black tracking-wider leading-none ${
              size === 'sm' ? 'text-[7px]' : 'text-[9px]'
            }`}
            style={{ color: palette.isDarkLuxury ? '#e9d5ff' : palette.primaryHex === '#18181b' ? '#cbd5e1' : '#fcd34d' }}
          >
            LVL
          </span>
          <span className={`${levelNumClass} text-white tabular-nums leading-tight`}>
            {toPersianDigits(level)}
          </span>
        </div>
      </div>

      {/* Step Tier Corner Indicator (Base / Plus / Star) */}
      <div
        title={
          stepNumber === 3
            ? 'پله ۳ از ۳ (Star)'
            : stepNumber === 2
            ? 'پله ۲ از ۳ (Plus)'
            : 'پله ۱ از ۳'
        }
        className={`${cornerBadgeSize} absolute flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs ${
          stepNumber === 3
            ? 'bg-amber-400 text-slate-950'
            : stepNumber === 2
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-700 text-slate-100'
        }`}
      >
        {stepNumber === 3 ? (
          <Star className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} fill-current`} />
        ) : stepNumber === 2 ? (
          <Plus className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} stroke-[3]`} />
        ) : (
          <Crown className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />
        )}
      </div>
    </div>
  );
};

export interface StepSegmentDotsProps {
  stepNumber: StepTierNumber;
  palette: LevelVisualPalette;
  isDarkSurface?: boolean;
}

/**
 * Compact 3-segment visual indicator showing Step 1 / Plus 2 / Star 3 within current Level
 */
export const StepSegmentDots: React.FC<StepSegmentDotsProps> = ({
  stepNumber,
  palette,
  isDarkSurface = false,
}) => {
  const steps: Array<{ n: StepTierNumber; label: string }> = [
    { n: 1, label: 'پایه' },
    { n: 2, label: 'پلاس +' },
    { n: 3, label: 'استار ★' },
  ];

  return (
    <div className="inline-flex items-center gap-1" dir="rtl">
      {steps.map((s) => {
        const isReached = s.n <= stepNumber;
        const isCurrent = s.n === stepNumber;
        return (
          <span
            key={s.n}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${
              isCurrent
                ? palette.stepActiveClass + ' shadow-2xs ring-1 ring-white/40'
                : isReached
                ? isDarkSurface
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                : isDarkSurface
                ? 'bg-white/10 text-white/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
};

export interface SubjectLevelCardProps {
  progression: SubjectLevelProgress;
}

/**
 * Dedicated Independent Subject Level Card rendered inside «گزارش هر درس»
 * Harmonized with Global Level visual identity, clearly marked as Subject-specific XP & Level,
 * with independent subject continuity status, missed session tracking, penalty XP, and history.
 */
export const SubjectLevelCard: React.FC<SubjectLevelCardProps> = ({ progression }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const { stageProgress } = progression;
  const { palette } = stageProgress;
  const isDarkLux = Boolean(palette.isDarkLuxury);

  const continuityBadgeClass =
    progression.continuityStatus === 'critical'
      ? 'bg-rose-600 text-white'
      : progression.continuityStatus === 'warning'
      ? 'bg-amber-500 text-slate-950'
      : progression.continuityStatus === 'attention'
      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60';

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-l ${palette.cardBgClass} ${palette.cardBorderClass} p-4 sm:p-5 shadow-xs space-y-3.5 transition-all`}
    >
      {/* Subject Demotion / Continuity Warning Alert Banner */}
      {(progression.hasSubjectDemotion || progression.continuityStatus === 'critical' || progression.continuityStatus === 'warning') && (
        <div
          className={`rounded-2xl border p-3.5 text-xs space-y-1.5 ${
            progression.hasSubjectDemotion || progression.continuityStatus === 'critical'
              ? 'bg-rose-50/95 dark:bg-rose-950/45 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
              : 'bg-amber-50/95 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-black">
              {progression.hasSubjectDemotion ? (
                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>
                {progression.hasSubjectDemotion
                  ? `پسرفت در سطح درس «${progression.subjectName}» به دلیل نوبت‌های مطالعه‌نشده`
                  : `هشدار پیوستگی مطالعه در درس «${progression.subjectName}» (${progression.continuityStatusLabelFa})`}
              </span>
            </div>
            {progression.subjectPenaltyXp > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black tabular-nums">
                کسر اختصاصی درس: {toPersianDigits(progression.subjectPenaltyXp)}- XP
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold leading-relaxed tabular-nums">
            {progression.hasSubjectDemotion && progression.latestSubjectDemotion ? (
              <span>
                سطح درس از «{progression.peakStageProgress.stageNameFa}» به «
                {stageProgress.stageNameFa}» تنزل یافته است — {progression.continuityStatusReasonFa}
              </span>
            ) : (
              <span>{progression.continuityStatusReasonFa}</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Right Column: Subject Level & Step Identity (3 Clean Lines per Section 9-1) */}
        <div
          className={`lg:col-span-5 flex items-center gap-3.5 border-b lg:border-b-0 lg:border-l pb-3.5 lg:pb-0 lg:pl-4 ${
            isDarkLux
              ? 'border-white/15'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <LevelEmblemBadge
            level={stageProgress.level}
            stepNumber={stageProgress.stepNumber}
            palette={palette}
            size="md"
          />

          <div className="min-w-0 space-y-1 flex-1">
            {/* Line 1: Level Number + Persian Level & Step Name + Small Badge on same line */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-sm sm:text-base font-black leading-snug ${
                  isDarkLux ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                Level {toPersianDigits(stageProgress.level)} – {stageProgress.stageNameFa}
              </span>
              <span
                dir="ltr"
                className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${palette.pillBgClass}`}
              >
                {stageProgress.stageNameEn}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${continuityBadgeClass}`}>
                {progression.continuityStatusLabelFa}
              </span>
            </div>

            {/* Line 2: سطح اختصاصی [نام درس] */}
            <div className="flex items-center gap-1.5 text-xs font-extrabold">
              <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className={palette.accentTextClass}>
                سطح اختصاصی {progression.subjectName}
              </span>
            </div>

            {/* Line 3: Honorary Title */}
            <div
              className={`text-xs font-extrabold ${
                isDarkLux ? 'text-slate-200' : palette.accentTextClass
              }`}
            >
              {stageProgress.honoraryTitle}
            </div>
          </div>
        </div>

        {/* Left Column: Subject XP Progress Bar & Next Stage */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div
              className={`font-extrabold flex items-center gap-1.5 ${
                isDarkLux ? 'text-white' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {stageProgress.isMaxStage ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>بالاترین مرحله این درس (Black Diamond Star) تکمیل شد</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    پیشرفت تا مرحله بعد:{' '}
                    <strong dir="ltr" className="inline-block">
                      {stageProgress.nextStageNameEn}
                    </strong>
                  </span>
                </>
              )}
            </div>

            <StepSegmentDots
              stepNumber={stageProgress.stepNumber}
              palette={palette}
              isDarkSurface={isDarkLux}
            />
          </div>

          {/* Progress Bar */}
          <div
            className={`relative h-3.5 w-full rounded-2xl p-0.5 overflow-hidden shadow-inner ${
              isDarkLux ? 'bg-white/15' : 'bg-slate-200/90 dark:bg-slate-800'
            }`}
          >
            <div
              className={`h-full rounded-xl bg-gradient-to-l ${palette.barGradientClass} transition-all duration-500 relative overflow-hidden`}
              style={{
                width: `${
                  stageProgress.isMaxStage
                    ? 100
                    : Math.max(4, stageProgress.progressPercentage)
                }%`,
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0)_100%)]" />
            </div>
          </div>

          {/* Two Centered Lines Below Progress Bar (Section 9-1) */}
          <div
            className={`flex flex-col items-center justify-center text-center gap-1 text-[11px] font-bold tabular-nums pt-0.5 ${
              isDarkLux ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="inline-flex flex-wrap items-center justify-center gap-1">
              <span>XP خالص فعلی درس:</span>
              <strong
                className={`font-black ${
                  isDarkLux ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {toPersianDigits(progression.subjectXp)}
              </strong>
              <XpCoinBadge size="xs" />
              {progression.subjectPenaltyXp > 0 && (
                <span className="text-rose-500 dark:text-rose-400 font-extrabold">
                  (کسرشده: {toPersianDigits(progression.subjectPenaltyXp)}-)
                </span>
              )}
              {!stageProgress.isMaxStage && (
                <span className="opacity-85">
                  ({toPersianDigits(stageProgress.xpInCurrentLevel)} از{' '}
                  {toPersianDigits(stageProgress.xpRequiredForCurrentStep)} این پله •{' '}
                  {toPersianDigits(stageProgress.progressPercentage)}٪)
                </span>
              )}
            </div>

            <div>
              {stageProgress.isMaxStage ? (
                <span className="inline-flex items-center justify-center gap-1 font-black text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تکمیل ۱۰۰٪ تمام ۳۹ مرحله درس</span>
                </span>
              ) : (
                <span className={`font-extrabold inline-flex items-center justify-center gap-1 ${palette.accentTextClass}`}>
                  <span>{toPersianDigits(stageProgress.xpRemainingToNextLevel)}</span>
                  <XpCoinBadge size="xs" />
                  <span>
                    موردنیاز تا مرحله بعد ({stageProgress.nextStageNameEn} • آستانه{' '}
                    {toPersianDigits(stageProgress.nextLevelTargetXp)})
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Compact Single-Line Horizontal Stat Rows (Section 9-1) */}
      <div
        className={`pt-2.5 border-t grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] font-bold tabular-nums ${
          isDarkLux
            ? 'border-white/15 text-slate-200'
            : 'border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300'
        }`}
      >
        <div className="rounded-xl bg-white/70 dark:bg-slate-900/55 border border-slate-200/60 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>آخرین مطالعه مؤثر:</span>
          </span>
          <strong className="font-black text-slate-900 dark:text-white whitespace-nowrap">
            {progression.lastEffectiveStudyJalali}
          </strong>
        </div>

        <div className="rounded-xl bg-white/70 dark:bg-slate-900/55 border border-slate-200/60 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
            نوبت‌های ازدست‌رفته:
          </span>
          <strong
            className={`font-black whitespace-nowrap ${
              progression.missedSessionsCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {toPersianDigits(progression.missedSessionsCount)} نوبت
          </strong>
        </div>

        <div className="rounded-xl bg-white/70 dark:bg-slate-900/55 border border-slate-200/60 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
            جلسات موفق ۱۴ روز اخیر:
          </span>
          <strong className="font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
            {toPersianDigits(progression.successfulSessionsRecent14d)} جلسه
          </strong>
        </div>

        <div className="rounded-xl bg-white/70 dark:bg-slate-900/55 border border-slate-200/60 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
            تراز XP اختصاصی درس:
          </span>
          <strong className="font-black text-slate-900 dark:text-white whitespace-nowrap" dir="ltr">
            +{toPersianDigits(progression.grossSubjectXp)} / -{toPersianDigits(progression.subjectPenaltyXp)} XP
          </strong>
        </div>
      </div>

      {/* Balanced Subject Criteria Summary Strip + History Toggle */}
      <div
        className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold tabular-nums ${
          isDarkLux
            ? 'border-white/15 text-slate-300'
            : 'border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400'
        }`}
      >
        <span>
          ترکیب متوازن درس: زمان مطالعه ({toPersianDigits(progression.totalStudyMinutes)} دقیقه)،
          تست ({toPersianDigits(progression.totalExercises)})، کیفیت وزنی (
          {progression.weightedQuality0To10 !== null
            ? `${toPersianDigits(progression.weightedQuality0To10)} از ۱۰`
            : '—'}
          )، تحقق برنامه ({toPersianDigits(progression.taskCompletionPct)}٪) و استمرار در{' '}
          {toPersianDigits(progression.distinctActiveDays)} روز فعال (ضریب عمق یادگیری:{' '}
          {toPersianDigits(progression.effectivenessMultiplier)}×)
        </span>

        <button
          type="button"
          onClick={() => setIsHistoryOpen((prev) => !prev)}
          aria-expanded={isHistoryOpen}
          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-300 hover:border-indigo-400 transition-colors cursor-pointer shrink-0"
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span>
            تاریخچه امتیاز و سطح درس ({toPersianDigits(progression.subjectHistoryEvents.length)})
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isHistoryOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Collapsible Subject-Specific XP & Level History */}
      {isHistoryOpen && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
          {progression.subjectHistoryEvents.length === 0 ? (
            <div className="rounded-xl bg-white/70 dark:bg-slate-900/60 p-3 text-center text-xs text-slate-500 dark:text-slate-400 font-bold">
              هنوز رویداد ثبت‌شده‌ای برای تاریخچه این درس وجود ندارد.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
              {progression.subjectHistoryEvents.slice(0, 25).map((ev) => {
                const isPos = ev.xpDelta >= 0;
                const stageChanged = ev.stageAfterNumber !== ev.stageBeforeNumber;
                return (
                  <div
                    key={ev.id}
                    className={`rounded-xl border px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 tabular-nums ${
                      ev.categoryType === 'پسرفت'
                        ? 'bg-rose-50/85 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/70'
                        : ev.categoryType === 'جریمه'
                        ? 'bg-amber-50/75 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-800/60'
                        : ev.categoryType === 'ارتقا'
                        ? 'bg-emerald-50/85 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                        : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                            ev.categoryType === 'پسرفت'
                              ? 'bg-rose-600 text-white'
                              : ev.categoryType === 'جریمه'
                              ? 'bg-amber-500 text-slate-950'
                              : ev.categoryType === 'ارتقا'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {isPos ? (
                            <ArrowUpRight className="w-3 h-3 shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 shrink-0" />
                          )}
                          <span>{ev.eventBadgeFa}</span>
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                          {ev.jalaliDate}
                        </span>
                        {stageChanged && (
                          <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                            • {ev.stageBeforeNameFa} ({ev.stepBeforeLabelFa}) ← {ev.stageAfterNameFa} (
                            {ev.stepAfterLabelFa})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {ev.reasonFa}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                      <span
                        className={`font-black inline-flex items-center gap-1 ${
                          isPos
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        <span dir="ltr">
                          {isPos
                            ? `+${toPersianDigits(ev.xpDelta)}`
                            : `-${toPersianDigits(Math.abs(ev.xpDelta))}`}
                        </span>
                        <XpCoinBadge size="xs" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {toPersianDigits(ev.xpBefore)} ← {toPersianDigits(ev.xpAfter)} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
