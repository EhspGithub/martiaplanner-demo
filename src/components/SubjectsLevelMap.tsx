import React, { useState, useMemo } from 'react';
import {
  Map as MapIcon,
  Plus,
  Star,
  BookOpen,
  ArrowUpLeft,
  Sparkles,
  CheckCircle2,
  MousePointerClick,
} from 'lucide-react';
import {
  PROGRESSION_LEVELS_13,
  type SubjectLevelProgress,
  type StepTierNumber,
} from '../utils/analyticsEngine.ts';
import { toPersianDigits } from '../utils/jalali.ts';
import { LevelEmblemBadge, StepSegmentDots } from './LevelIdentityCard.tsx';
import { XpCoinBadge } from './XpCoinBadge.tsx';

export interface SubjectsLevelMapProps {
  subjectProgressions: SubjectLevelProgress[];
  onInspectSubjectReport?: (subjectId: string) => void;
}

/**
 * Ascending 13-Level × 3-Step (39 Stages) Staircase Map for all subjects:
 * - Horizontal Left-to-Right ascending staircase (Stone -> Copper -> ... -> Black Diamond)
 * - 3 distinct internal step treads inside every Level (Base / Plus + / Star ★)
 * - Zero overlap even when multiple subjects occupy the same (level, step) slot
 * - Interactive tap/click node inspection + deep link into Single-Subject Report
 * - Controlled internal horizontal scrolling on mobile (0px outer page horizontal scroll)
 */
export const SubjectsLevelMap: React.FC<SubjectsLevelMapProps> = ({
  subjectProgressions,
  onInspectSubjectReport,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    () => subjectProgressions[0]?.subjectId || null
  );

  // Group subjects by exact (level, stepNumber) key so co-located subjects stack cleanly without overlapping
  const subjectsByStageKey = useMemo(() => {
    const map = new Map<string, SubjectLevelProgress[]>();
    for (const sp of subjectProgressions) {
      const key = `${sp.stageProgress.level}-${sp.stageProgress.stepNumber}`;
      const list = map.get(key) || [];
      list.push(sp);
      map.set(key, list);
    }
    return map;
  }, [subjectProgressions]);

  // Sorted list of subjects (highest stage first) for quick summary/selection
  const sortedProgressions = useMemo(() => {
    return [...subjectProgressions].sort((a, b) => {
      if (b.stageProgress.stageNumber !== a.stageProgress.stageNumber) {
        return b.stageProgress.stageNumber - a.stageProgress.stageNumber;
      }
      return b.subjectXp - a.subjectXp;
    });
  }, [subjectProgressions]);

  const activeSelectedSubject = useMemo(() => {
    if (!selectedSubjectId) return sortedProgressions[0] || null;
    return (
      subjectProgressions.find((s) => s.subjectId === selectedSubjectId) ||
      sortedProgressions[0] ||
      null
    );
  }, [subjectProgressions, sortedProgressions, selectedSubjectId]);

  const stepNumbers: StepTierNumber[] = [1, 2, 3];

  return (
    <section
      aria-label="نقشه سطح و پیشرفت دروس"
      className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-5 w-full max-w-full min-w-0 overflow-hidden"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <MapIcon className="w-5 h-5" />
            </div>
            <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white">
              نقشه سطح و پیشرفت دروس
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-justify leading-relaxed">
            نمایش پلکانی جایگاه فعلی تمام دروس در ساختار ۱۳ Level (از Stone تا Black Diamond) و ۳۹ مرحله پیشرفت اختصاصی
          </p>
        </div>

        {/* Interaction Hint */}
        <div className="flex items-center gap-2 text-[11px] font-extrabold shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>برای جزئیات روی نشان درس کلیک کنید</span>
          </span>
        </div>
      </div>

      {subjectProgressions.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          هنوز درسی برای نمایش در نقشه سطح دروس تعریف نشده است.
        </div>
      ) : (
        <>
          {/* Mobile Horizontal Scroll Guidance (Chart container handles scroll internally — 0px outer overflow) */}
          <div className="flex sm:hidden items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl px-3 py-1.5 border border-indigo-100 dark:border-indigo-900/50">
            <span>مسیر صعودی ۱۳ سطح (چپ به راست):</span>
            <span>← نمودار را افقی بکشید →</span>
          </div>

          {/* CONTROLLED INTERNAL HORIZONTAL SCROLL STAIRCASE CANVAS */}
          <div className="w-full overflow-x-auto pb-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 via-white to-slate-100/70 dark:from-slate-950/70 dark:via-slate-900 dark:to-slate-950/90">
            {/* Explicitly Left-to-Right ascending staircase geometry */}
            <div dir="ltr" className="min-w-[1220px] px-4 pt-5 pb-3 select-none">
              {/* Main 13-Column Ascending Staircase Grid */}
              <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5 items-end relative">
                {PROGRESSION_LEVELS_13.map((lvlMeta) => {
                  const baseIndex = (lvlMeta.levelNumber - 1) * 3; // 0 .. 36

                  return (
                    <div
                      key={lvlMeta.levelNumber}
                      className="flex flex-col items-stretch border-l border-dashed border-slate-200/80 dark:border-slate-800/80 first:border-l-0 pl-1 first:pl-0"
                    >
                      {/* 3 Ascending Step Columns Inside Each Level (Step 1, Step 2 Plus, Step 3 Star) */}
                      <div className="grid grid-cols-3 gap-[3px] items-end h-[360px] pt-2">
                        {stepNumbers.map((stepNum) => {
                          const stageIndex = baseIndex + (stepNum - 1); // 0..38
                          // Linear+gentle height progression from 32px (Stage 1 Stone) up to 248px (Stage 39 Black Diamond Star),
                          // leaving ~110px–320px vertical stack zone directly above every step for multiple non-overlapping badges!
                          const treadHeightPx = Math.round(28 + stageIndex * 5.6);
                          const stageKey = `${lvlMeta.levelNumber}-${stepNum}`;
                          const occupantSubjects = subjectsByStageKey.get(stageKey) || [];
                          const isPlus = stepNum === 2;
                          const isStar = stepNum === 3;
                          const stepSuffixName =
                            stepNum === 1
                              ? lvlMeta.nameEn
                              : stepNum === 2
                              ? `${lvlMeta.nameEn} Plus`
                              : `${lvlMeta.nameEn} Star`;

                          return (
                            <div
                              key={stageKey}
                              className="flex flex-col items-center justify-end h-full relative"
                            >
                              {/* Stack Zone Directly Above This Step Tread (Zero Overlap Vertical Stack) */}
                              {occupantSubjects.length > 0 && (
                                <div
                                  dir="rtl"
                                  className="flex flex-col items-center gap-1 mb-1 z-20 w-max max-w-[110px]"
                                >
                                  {occupantSubjects.map((subj) => {
                                    const isSelected =
                                      activeSelectedSubject?.subjectId === subj.subjectId;
                                    return (
                                      <button
                                        key={subj.subjectId}
                                        type="button"
                                        onClick={() => setSelectedSubjectId(subj.subjectId)}
                                        title={`${subj.subjectName} — ${subj.stageProgress.stageNameEn} (${subj.stageProgress.stepLabelFa}) • ${toPersianDigits(subj.subjectXp)} XP`}
                                        className={`group flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-black shadow-sm border transition-all cursor-pointer whitespace-nowrap ${
                                          isSelected
                                            ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 scale-105 bg-indigo-600 text-white border-indigo-500'
                                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:-translate-y-0.5'
                                        }`}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: isSelected
                                              ? '#fde047'
                                              : lvlMeta.palette.primaryHex,
                                          }}
                                        />
                                        <span className="truncate max-w-[74px]">
                                          {subj.subjectName}
                                        </span>
                                      </button>
                                    );
                                  })}
                                  {/* Connector pin down to tread */}
                                  <div
                                    className="w-[2px] h-2 rounded-full"
                                    style={{ backgroundColor: lvlMeta.palette.primaryHex }}
                                  />
                                </div>
                              )}

                              {/* Step Stair Block (Ascending Riser) */}
                              <div
                                title={`${stepSuffixName} (${lvlMeta.nameFa}${
                                  isPlus ? ' پلاس' : isStar ? ' استار' : ''
                                })`}
                                style={{
                                  height: `${treadHeightPx}px`,
                                  background: lvlMeta.palette.isDarkLuxury
                                    ? 'linear-gradient(180deg, #312e81 0%, #09090b 100%)'
                                    : `linear-gradient(180deg, ${lvlMeta.palette.primaryHex} 0%, ${lvlMeta.palette.secondaryHex} 100%)`,
                                  opacity:
                                    stepNum === 1 ? 0.78 : stepNum === 2 ? 0.9 : 1,
                                  boxShadow:
                                    occupantSubjects.length > 0
                                      ? `0 0 12px ${lvlMeta.palette.glowHex}`
                                      : undefined,
                                }}
                                className={`w-full rounded-t-md border-t border-x border-white/25 flex flex-col items-center justify-start pt-1 transition-all relative ${
                                  occupantSubjects.length > 0
                                    ? 'ring-1 ring-white/70'
                                    : ''
                                }`}
                              >
                                {/* Step Tier Symbol at top edge of riser */}
                                <span className="text-[8px] font-black text-white/95 leading-none">
                                  {isStar ? '★' : isPlus ? '+' : '•'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Level Plate Label (1..13) */}
                      <div
                        className="mt-2 rounded-xl px-1 py-1.5 text-center border border-slate-200/80 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/90 shadow-2xs"
                        style={{
                          borderTopWidth: '3px',
                          borderTopColor: lvlMeta.palette.isDarkLuxury
                            ? '#7c3aed'
                            : lvlMeta.palette.primaryHex,
                        }}
                      >
                        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 leading-none tabular-nums">
                          L{lvlMeta.levelNumber}
                        </div>
                        <div
                          className="text-[10px] font-black text-slate-900 dark:text-white truncate mt-0.5 leading-tight"
                          title={`${lvlMeta.nameEn} — ${lvlMeta.nameFa}`}
                        >
                          {lvlMeta.nameEn}
                        </div>
                        <div
                          dir="rtl"
                          className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate leading-tight"
                        >
                          {lvlMeta.nameFa}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Detail Panel for Clicked / Selected Subject */}
          {activeSelectedSubject && (
            <div
              className={`rounded-2xl border bg-gradient-to-l ${activeSelectedSubject.stageProgress.palette.cardBgClass} ${activeSelectedSubject.stageProgress.palette.cardBorderClass} p-4 transition-all`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <LevelEmblemBadge
                    level={activeSelectedSubject.stageProgress.level}
                    stepNumber={activeSelectedSubject.stageProgress.stepNumber}
                    palette={activeSelectedSubject.stageProgress.palette}
                    size="md"
                  />

                  {/* 7-Line Structured Subject Detail Block (Section 10-4) */}
                  <div
                    className={`min-w-0 space-y-1 text-xs font-bold tabular-nums ${
                      activeSelectedSubject.stageProgress.palette.isDarkLuxury
                        ? 'text-slate-200'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* خط اول: نام درس */}
                    <div
                      className={`text-sm sm:text-base font-black ${
                        activeSelectedSubject.stageProgress.palette.isDarkLuxury
                          ? 'text-white'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      درس {activeSelectedSubject.subjectName}
                    </div>

                    {/* خط دوم: شماره Level و عنوان فارسی آن + وضعیت استمرار */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg ${activeSelectedSubject.stageProgress.palette.pillBgClass}`}
                      >
                        Level {toPersianDigits(activeSelectedSubject.stageProgress.level)} –{' '}
                        {activeSelectedSubject.stageProgress.stageNameFa}
                      </span>
                      <span
                        dir="ltr"
                        className={`text-[11px] font-black ${activeSelectedSubject.stageProgress.palette.accentTextClass}`}
                      >
                        {activeSelectedSubject.stageProgress.stageNameEn}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          activeSelectedSubject.continuityStatus === 'critical'
                            ? 'bg-rose-600 text-white'
                            : activeSelectedSubject.continuityStatus === 'warning'
                            ? 'bg-amber-500 text-slate-950'
                            : activeSelectedSubject.continuityStatus === 'attention'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {activeSelectedSubject.continuityStatusLabelFa}
                      </span>
                    </div>

                    {/* خط سوم: عنوان افتخاری و پله فعلی */}
                    <div>
                      عنوان افتخاری:{' '}
                      <strong className={activeSelectedSubject.stageProgress.palette.accentTextClass}>
                        {activeSelectedSubject.stageProgress.honoraryTitle}
                      </strong>{' '}
                      • {activeSelectedSubject.stageProgress.stepLabelFa}
                    </div>

                    {/* خط چهارم: مقدار XP خالص درس */}
                    <div className="inline-flex items-center gap-1">
                      <span>XP خالص درس:</span>
                      <strong
                        className={
                          activeSelectedSubject.stageProgress.palette.isDarkLuxury
                            ? 'text-white font-black'
                            : 'text-slate-900 dark:text-white font-black'
                        }
                      >
                        {toPersianDigits(activeSelectedSubject.subjectXp)}
                      </strong>
                      <XpCoinBadge size="xs" />
                    </div>

                    {/* خط پنجم: مقدار XP کسرشده (در صورت وجود، داخل پرانتز در خط جداگانه) */}
                    {activeSelectedSubject.subjectPenaltyXp > 0 && (
                      <div className="text-rose-500 dark:text-rose-400 font-extrabold">
                        (XP کسرشده: {toPersianDigits(activeSelectedSubject.subjectPenaltyXp)}- XP)
                      </div>
                    )}

                    {/* خط ششم: تاریخ آخرین مطالعه */}
                    <div>
                      آخرین مطالعه: <strong>{activeSelectedSubject.lastEffectiveStudyJalali}</strong>
                    </div>

                    {/* خط هفتم: درصد پیشرفت پله و مقدار XP موردنیاز تا پله بعد */}
                    <div>
                      {activeSelectedSubject.stageProgress.isMaxStage ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-black">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تکمیل نهایی (۱۰۰٪ تمام ۳۹ مرحله)</span>
                        </span>
                      ) : (
                        <span>
                          پیشرفت پله:{' '}
                          <strong>
                            {toPersianDigits(activeSelectedSubject.stageProgress.progressPercentage)}٪
                          </strong>{' '}
                          •{' '}
                          <strong>
                            {toPersianDigits(activeSelectedSubject.stageProgress.xpRemainingToNextLevel)} XP
                          </strong>{' '}
                          موردنیاز تا پله بعد (
                          <span dir="ltr" className="inline-block font-extrabold">
                            {activeSelectedSubject.stageProgress.nextStageNameEn}
                          </span>
                          )
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step Indicators on Independent Line + Direct Action Button to Subject Report */}
                <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
                  <StepSegmentDots
                    stepNumber={activeSelectedSubject.stageProgress.stepNumber}
                    palette={activeSelectedSubject.stageProgress.palette}
                    isDarkSurface={Boolean(
                      activeSelectedSubject.stageProgress.palette.isDarkLuxury
                    )}
                  />

                  {onInspectSubjectReport && (
                    <button
                      type="button"
                      onClick={() => onInspectSubjectReport(activeSelectedSubject.subjectId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>مشاهده گزارش اختصاصی درس</span>
                      <ArrowUpLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
