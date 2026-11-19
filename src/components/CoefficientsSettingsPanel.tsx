import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  RotateCcw,
  Save,
  Search,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Calculator,
  Info,
  X,
  Sparkles,
  ChevronDown,
  BookOpen,
  Table2,
  ArrowLeft,
} from 'lucide-react';
import { toPersianDigits } from '../utils/jalali.ts';
import {
  COEFFICIENT_GROUPS_META,
  COEFFICIENT_METADATA_CATALOG,
  DEFAULT_ANALYTICS_COEFFICIENTS,
  getAnalyticsCoefficients,
  saveAnalyticsCoefficients,
  resetSingleAnalyticsCoefficient,
  resetAllAnalyticsCoefficients,
  validateCoefficientValue,
  ANALYTICS_COEFFICIENTS_CHANGED_EVENT,
  type AnalyticsCoefficientsConfig,
  type CoefficientGroupId,
} from '../utils/analyticsCoefficients.ts';

export interface CoefficientsSettingsPanelProps {
  onCoefficientsUpdated?: () => void;
  highlightedCoeffKey?: keyof AnalyticsCoefficientsConfig | null;
  onNavigateToDefinition?: (definitionId: string) => void;
  onNavigateToTableRow?: (rowId: string) => void;
}

export const CoefficientsSettingsPanel: React.FC<CoefficientsSettingsPanelProps> = ({
  onCoefficientsUpdated,
  highlightedCoeffKey,
  onNavigateToDefinition,
  onNavigateToTableRow,
}) => {
  const [savedConfig, setSavedConfig] = useState<AnalyticsCoefficientsConfig>(() =>
    getAnalyticsCoefficients()
  );
  const [draftValues, setDraftValues] = useState<Record<keyof AnalyticsCoefficientsConfig, string>>(
    () => {
      const initial = getAnalyticsCoefficients();
      const map = {} as Record<keyof AnalyticsCoefficientsConfig, string>;
      for (const item of COEFFICIENT_METADATA_CATALOG) {
        map[item.key] = String(initial[item.key]);
      }
      return map;
    }
  );
  const [errorsMap, setErrorsMap] = useState<
    Partial<Record<keyof AnalyticsCoefficientsConfig, string>>
  >({});
  const [activeGroup, setActiveGroup] = useState<'all' | CoefficientGroupId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      const latest = getAnalyticsCoefficients();
      setSavedConfig({ ...latest });
      const nextDrafts = {} as Record<keyof AnalyticsCoefficientsConfig, string>;
      for (const item of COEFFICIENT_METADATA_CATALOG) {
        nextDrafts[item.key] = String(latest[item.key]);
      }
      setDraftValues(nextDrafts);
      setErrorsMap({});
    };
    window.addEventListener(ANALYTICS_COEFFICIENTS_CHANGED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener(ANALYTICS_COEFFICIENTS_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!highlightedCoeffKey) return;
    setActiveGroup('all');
    setSearchQuery('');
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.add(highlightedCoeffKey);
      return next;
    });
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`coeff-card-${highlightedCoeffKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightedCoeffKey]);

  const showTempBanner = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const handleInputChange = (key: keyof AnalyticsCoefficientsConfig, rawVal: string) => {
    setDraftValues((prev) => ({ ...prev, [key]: rawVal }));
    const validation = validateCoefficientValue(key, rawVal);
    setErrorsMap((prev) => {
      const next = { ...prev };
      if (!validation.valid && validation.errorFa) {
        next[key] = validation.errorFa;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleSaveSingle = (key: keyof AnalyticsCoefficientsConfig) => {
    const rawVal = draftValues[key];
    const validation = validateCoefficientValue(key, rawVal);
    if (!validation.valid) {
      setErrorsMap((prev) => ({
        ...prev,
        [key]: validation.errorFa || 'مقدار نامعتبر است.',
      }));
      showTempBanner('error', validation.errorFa || 'مقدار واردشده خارج از محدوده مجاز است.');
      return;
    }
    const meta = COEFFICIENT_METADATA_CATALOG.find((m) => m.key === key);
    saveAnalyticsCoefficients({ [key]: validation.numericValue });
    onCoefficientsUpdated?.();
    showTempBanner(
      'success',
      `ضریب «${meta?.titleFa || key}» با موفقیت روی ${toPersianDigits(
        validation.numericValue
      )} ذخیره و در تمام محاسبات اعمال شد.`
    );
  };

  const handleResetSingle = (key: keyof AnalyticsCoefficientsConfig) => {
    const meta = COEFFICIENT_METADATA_CATALOG.find((m) => m.key === key);
    resetSingleAnalyticsCoefficient(key);
    onCoefficientsUpdated?.();
    showTempBanner(
      'success',
      `ضریب «${meta?.titleFa || key}» به مقدار پیش‌فرض (${toPersianDigits(
        DEFAULT_ANALYTICS_COEFFICIENTS[key]
      )}) بازگردانی شد.`
    );
  };

  const handleSaveAllChanges = () => {
    const newErrors: Partial<Record<keyof AnalyticsCoefficientsConfig, string>> = {};
    const updates: Partial<AnalyticsCoefficientsConfig> = {};

    for (const item of COEFFICIENT_METADATA_CATALOG) {
      const v = validateCoefficientValue(item.key, draftValues[item.key]);
      if (!v.valid) {
        newErrors[item.key] = v.errorFa || 'مقدار نامعتبر';
      } else {
        updates[item.key] = v.numericValue;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorsMap(newErrors);
      showTempBanner(
        'error',
        `لطفاً خطای ${toPersianDigits(
          Object.keys(newErrors).length
        )} ضریب خارج از محدوده مجاز را اصلاح کنید.`
      );
      return;
    }

    saveAnalyticsCoefficients(updates);
    onCoefficientsUpdated?.();
    showTempBanner(
      'success',
      'تمامی ضرایب با موفقیت ذخیره شدند و شاخص‌های روزانه، دروس، XP و جدول جامع بلافاصله به‌روزرسانی گردیدند.'
    );
  };

  const handleConfirmResetAll = () => {
    resetAllAnalyticsCoefficients();
    setConfirmResetAllOpen(false);
    onCoefficientsUpdated?.();
    showTempBanner(
      'success',
      'تمامی ۴۱ ضریب و آستانه محاسباتی به مقادیر استاندارد اولیه بازگردانی شدند.'
    );
  };

  const toggleDetails = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return COEFFICIENT_METADATA_CATALOG.filter((item) => {
      if (activeGroup !== 'all' && item.groupId !== activeGroup) return false;
      if (!q) return true;
      return (
        item.titleFa.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.descriptionFa.toLowerCase().includes(q) ||
        item.relatedMetrics.some((r) => r.toLowerCase().includes(q)) ||
        item.usedInFormulas.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [activeGroup, searchQuery]);

  const modifiedCount = useMemo(() => {
    return COEFFICIENT_METADATA_CATALOG.filter(
      (item) => savedConfig[item.key] !== item.defaultValue
    ).length;
  }, [savedConfig]);

  const unsavedChangesCount = useMemo(() => {
    return COEFFICIENT_METADATA_CATALOG.filter((item) => {
      const v = validateCoefficientValue(item.key, draftValues[item.key]);
      return v.valid && v.numericValue !== savedConfig[item.key];
    }).length;
  }, [draftValues, savedConfig]);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top Overview & Global Actions Card */}
      <div className="rounded-3xl border border-indigo-200/90 dark:border-indigo-900/70 bg-gradient-to-l from-indigo-950 via-indigo-900 to-violet-950 text-white p-5 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/15 border border-white/20 text-xs font-extrabold text-amber-300">
              <Sliders className="w-4 h-4 shrink-0" />
              <span>موتور مرکزی تنظیم ضرایب و آستانه‌های محاسباتی</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              مدیریت یکپارچه ضرایب فرمول‌ها، وزن شاخص‌ها، پاداش XP و جریمه‌ها
            </h3>
            <p className="text-xs text-indigo-100/90 leading-relaxed max-w-3xl">
              تغییر هر ضریب در این بخش بدون دستکاری یا حذف داده‌های خام ثبت‌شده شما، بلافاصله تمام محاسبات صفحه عملکرد، صفحه دروس، ترازنامه XP و سطح ۳۹ مرحله‌ای، گزارش نمونه یک‌هفته‌ای و جدول جامع راهنما را بر اساس ضرایب جدید بازمحاسبه می‌کند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSaveAllChanges}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>
                ذخیره همه تغییرات
                {unsavedChangesCount > 0 ? ` (${toPersianDigits(unsavedChangesCount)})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetAllOpen(true)}
              disabled={modifiedCount === 0 && unsavedChangesCount === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 disabled:opacity-45 text-white border border-white/25 font-extrabold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>بازگردانی همه ضرایب به مقادیر اولیه</span>
            </button>
          </div>
        </div>

        {/* Quick Status Row */}
        <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-indigo-100 font-bold">
              <span>کل ضرایب قابل‌تنظیم:</span>
              <strong className="font-black text-white">
                {toPersianDigits(COEFFICIENT_METADATA_CATALOG.length)} ضریب
              </strong>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold ${
                modifiedCount > 0
                  ? 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                  : 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30'
              }`}
            >
              <span>ضرایب سفارشی‌شده فعلی:</span>
              <strong className="font-black">
                {modifiedCount > 0
                  ? `${toPersianDigits(modifiedCount)} مورد تغییریافته`
                  : 'همه روی مقادیر پیش‌فرض استاندارد'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl border text-xs sm:text-sm font-extrabold transition-all ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation Modal for Reset All Coefficients */}
      {confirmResetAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  بازگردانی همه ضرایب به مقادیر اولیه؟
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  داده‌های برنامه‌ریزی و عملکرد شما کاملاً محفوظ می‌مانند.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              با تأیید این گزینه، تمامی ۴۱ ضریب و آستانه محاسباتی به مقادیر پیش‌فرض استاندارد سامانه بازگردانده می‌شوند و تمام شاخص‌ها بر اساس مقادیر استاندارد بازمحاسبه خواهند شد.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetAllOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
              >
                بله، بازگردانی همه به پیش‌فرض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Group Filter Bar */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام ضریب، نماد (مثل w_T، XP_comp، α_depth)، فرمول یا شاخص‌های وابسته..."
            className="w-full pr-10 pl-9 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Group Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveGroup('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeGroup === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            همه گروه‌ها ({toPersianDigits(COEFFICIENT_METADATA_CATALOG.length)})
          </button>
          {COEFFICIENT_GROUPS_META.map((grp) => {
            const active = activeGroup === grp.id;
            const count = COEFFICIENT_METADATA_CATALOG.filter(
              (m) => m.groupId === grp.id
            ).length;
            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => setActiveGroup(grp.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {toPersianDigits(grp.titleFa)} ({toPersianDigits(count)})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Coefficients Cards */}
      {COEFFICIENT_GROUPS_META.map((group) => {
        const groupItems = filteredItems.filter((item) => item.groupId === group.id);
        if (groupItems.length === 0) return null;

        return (
          <div
            key={group.id}
            className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
          >
            {/* Group Header */}
            <div className="px-5 py-4 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {toPersianDigits(group.titleFa)}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {toPersianDigits(group.subtitleFa)}
                </p>
              </div>
              <span className="self-start sm:self-center px-2.5 py-1 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 text-xs font-extrabold shrink-0">
                {toPersianDigits(groupItems.length)} ضریب
              </span>
            </div>

            {/* Coefficients List in this Group */}
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {groupItems.map((item) => {
                const currentSaved = savedConfig[item.key];
                const draftStr = draftValues[item.key] ?? String(currentSaved);
                const errText = errorsMap[item.key];
                const isModifiedFromDefault = currentSaved !== item.defaultValue;
                const validation = validateCoefficientValue(item.key, draftStr);
                const hasUnsavedEdit =
                  validation.valid && validation.numericValue !== currentSaved;
                const isExpanded = expandedKeys.has(item.key);
                const isHighlighted = highlightedCoeffKey === item.key;

                return (
                  <div
                    key={item.key}
                    id={`coeff-card-${item.key}`}
                    className={`p-4 sm:p-5 transition-all ${
                      isHighlighted
                        ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/35'
                        : isModifiedFromDefault
                        ? 'bg-amber-50/35 dark:bg-amber-950/15'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      {/* Right Column: Title, Symbol, Description & Metadata */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code
                            dir="ltr"
                            className="px-2.5 py-1 rounded-xl bg-indigo-100/90 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 font-mono text-xs font-black text-indigo-800 dark:text-indigo-200"
                          >
                            {item.symbol}
                          </code>
                          <h5 className="text-sm font-black text-slate-900 dark:text-white">
                            {toPersianDigits(item.titleFa)}
                          </h5>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                            واحد: {item.unitLabelFa}
                          </span>
                          {isModifiedFromDefault && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[11px] font-extrabold">
                              سفارشی‌شده
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {toPersianDigits(item.descriptionFa)}
                        </p>

                        {/* Always-visible Related Metrics Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 ml-1">
                            ارتباط با:
                          </span>
                          {item.relatedMetrics.map((rel, rIdx) => (
                            <span
                              key={rIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/70 text-[11px] font-bold text-indigo-800 dark:text-indigo-200"
                            >
                              <GitBranch className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{toPersianDigits(rel)}</span>
                            </span>
                          ))}
                        </div>

                        {/* Smart Cross-Links to Detailed Definitions & Comprehensive Table */}
                        {(onNavigateToDefinition || onNavigateToTableRow) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                            {onNavigateToDefinition &&
                              item.relatedDefinitionIds?.map((defLink) => (
                                <button
                                  key={defLink.id}
                                  type="button"
                                  onClick={() => onNavigateToDefinition(defLink.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-100/90 hover:bg-indigo-200/80 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/90 text-indigo-800 dark:text-indigo-200 border border-indigo-300/80 dark:border-indigo-800 text-[11px] font-extrabold transition-all cursor-pointer"
                                  title="مشاهده توضیح کامل و مثال‌های این شاخص در منوی راهنما ← تب تعاریف"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                  <span>مشاهده در تعاریف: {toPersianDigits(defLink.labelFa)}</span>
                                  <ArrowLeft className="w-3 h-3 shrink-0" />
                                </button>
                              ))}

                            {onNavigateToTableRow && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTableRow(`coeff-row-${item.key}`)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 text-[11px] font-extrabold transition-all cursor-pointer"
                                title="مشاهده ردیف این ضریب در جدول جامع شاخص‌ها"
                              >
                                <Table2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>مشاهده در جدول جامع</span>
                                <ArrowLeft className="w-3 h-3 shrink-0" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expandable Formula & Impact Details */}
                        <button
                          type="button"
                          onClick={() => toggleDetails(item.key)}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>
                            {isExpanded
                              ? 'بستن فرمول و تحلیل اثر تغییر ضریب'
                              : 'مشاهده فرمول و اثر افزایش یا کاهش این ضریب'}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                  فرمول‌های استفاده‌کننده:{' '}
                                </span>
                                <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                                  {toPersianDigits(item.usedInFormulas.join(' | '))}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                  اثر تغییر ضریب بر نتایج:{' '}
                                </span>
                                {toPersianDigits(item.impactExplanationFa)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Left Column: Current/Default Badges, Range, Input Field & Per-Item Actions */}
                      <div className="w-full xl:w-[340px] shrink-0 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                            <div className="text-slate-500 dark:text-slate-400 font-bold">
                              مقدار فعلی
                            </div>
                            <div className="font-black text-indigo-700 dark:text-indigo-300 text-xs mt-0.5 tabular-nums">
                              {toPersianDigits(currentSaved)}
                            </div>
                          </div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                            <div className="text-slate-500 dark:text-slate-400 font-bold">
                              پیش‌فرض
                            </div>
                            <div className="font-black text-slate-800 dark:text-slate-200 text-xs mt-0.5 tabular-nums">
                              {toPersianDigits(item.defaultValue)}
                            </div>
                          </div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                            <div className="text-slate-500 dark:text-slate-400 font-bold">
                              محدوده مجاز
                            </div>
                            <div
                              dir="ltr"
                              className="font-black text-slate-700 dark:text-slate-300 text-xs mt-0.5 tabular-nums"
                            >
                              [{toPersianDigits(item.min)} .. {toPersianDigits(item.max)}]
                            </div>
                          </div>
                        </div>

                        {/* Input + Save + Reset Row */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step={item.step}
                              min={item.min}
                              max={item.max}
                              dir="ltr"
                              value={draftStr}
                              onChange={(e) => handleInputChange(item.key, e.target.value)}
                              aria-label={item.titleFa}
                              className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-black text-center tabular-nums bg-white dark:bg-slate-900 border transition-colors focus:outline-none ${
                                errText
                                  ? 'border-rose-500 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500/30'
                                  : hasUnsavedEdit
                                  ? 'border-amber-500 text-amber-800 dark:text-amber-200 focus:ring-2 focus:ring-amber-500/30'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500'
                              }`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveSingle(item.key)}
                            disabled={Boolean(errText) || !hasUnsavedEdit}
                            title="ذخیره و اعمال این ضریب"
                            className="px-3 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-all shrink-0 cursor-pointer"
                          >
                            اعمال
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetSingle(item.key)}
                            disabled={
                              !isModifiedFromDefault &&
                              draftStr === String(item.defaultValue)
                            }
                            title="بازگردانی این ضریب به مقدار پیش‌فرض"
                            className="px-2.5 py-2 rounded-xl text-xs font-extrabold bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-all shrink-0 cursor-pointer inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>پیش‌فرض</span>
                          </button>
                        </div>

                        {/* Validation Error Message */}
                        {errText && (
                          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{toPersianDigits(errText)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
