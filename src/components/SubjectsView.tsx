import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  X,
  Calculator,
  Atom,
  Feather,
  Languages,
  Globe2,
  Cpu,
  HeartHandshake,
  Sparkles,
  Search,
  SearchX,
  Settings2,
  Filter,
} from 'lucide-react';
import type { Subject, SubjectUnit } from '../types.ts';
import { api } from '../services/api.ts';
import { toPersianDigits } from '../utils/jalali.ts';

interface SubjectsViewProps {
  subjects: Subject[];
  onRefreshBootstrap: () => Promise<void>;
}

const GRADE_OPTIONS = ['هفتم', 'هشتم', 'نهم'];
const UNIT_TYPE_OPTIONS = ['درس', 'فصل', 'پودمان', 'بخش'];

function normalizePersianText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ|ة/g, 'ه')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .trim()
    .toLowerCase();
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const normQuery = normalizePersianText(query);
  const normText = normalizePersianText(text);

  const idx = normText.indexOf(normQuery);
  if (idx === -1) return <>{text}</>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.trim().length);
  const after = text.slice(idx + query.trim().length);

  return (
    <>
      {before}
      <mark className="bg-amber-200 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 rounded px-1 py-0.5 font-black">
        {match}
      </mark>
      {after}
    </>
  );
}

function getTextbookVisual(name: string) {
  if (name.includes('ریاضی')) {
    return {
      icon: Calculator,
      iconBg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
    };
  }
  if (name.includes('علوم')) {
    return {
      icon: Atom,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    };
  }
  if (name.includes('فارسی') || name.includes('نگارش')) {
    return {
      icon: Feather,
      iconBg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
    };
  }
  if (name.includes('زبان') || name.includes('عربی')) {
    return {
      icon: Languages,
      iconBg: 'bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
    };
  }
  if (name.includes('مطالعات')) {
    return {
      icon: Globe2,
      iconBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    };
  }
  if (name.includes('کار و فناوری')) {
    return {
      icon: Cpu,
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
    };
  }
  if (name.includes('پیام') || name.includes('قرآن')) {
    return {
      icon: HeartHandshake,
      iconBg: 'bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
    };
  }
  return {
    icon: BookOpen,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
  };
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  onRefreshBootstrap,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );

  // Quick Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K or / to quickly focus search input, Esc to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Subjects Logic (searches name, grade level, and all internal chapters/units)
  const filteredSubjects = useMemo(() => {
    const normQuery = normalizePersianText(searchQuery);

    return subjects.filter((subj) => {
      // Grade filter check
      if (gradeFilter !== 'all' && subj.grade_level !== gradeFilter) {
        return false;
      }

      // If no search query, match all in this grade
      if (!normQuery) return true;

      // Match subject name
      if (normalizePersianText(subj.name).includes(normQuery)) {
        return true;
      }

      // Match grade level (e.g. searching "هشتم")
      if (normalizePersianText(subj.grade_level).includes(normQuery)) {
        return true;
      }

      // Match unit type label (e.g. "پودمان" or "فصل")
      if (normalizePersianText(subj.unit_type_label).includes(normQuery)) {
        return true;
      }

      // Match any chapter / unit title inside this subject!
      const hasMatchingUnit = subj.units.some((u) =>
        normalizePersianText(u.title).includes(normQuery)
      );

      return hasMatchingUnit;
    });
  }, [subjects, searchQuery, gradeFilter]);

  // Auto-sync selected subject when filtering so active details pane immediately updates
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      const isCurrentInFiltered = filteredSubjects.some(
        (s) => s.id === selectedSubjectId
      );
      if (!isCurrentInFiltered) {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    }
  }, [filteredSubjects, selectedSubjectId]);

  // New Subject Form State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectGrade, setNewSubjectGrade] = useState('هشتم');
  const [newSubjectUnitType, setNewSubjectUnitType] = useState('درس');
  const [newSubjectInitialUnits, setNewSubjectInitialUnits] = useState(
    'درس اول\nدرس دوم\nدرس سوم\nدرس چهارم'
  );
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Subject Inline State
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectGrade, setEditSubjectGrade] = useState('هشتم');
  const [editSubjectUnitType, setEditSubjectUnitType] = useState('درس');

  // Delete Subject Confirmation
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Unit Management State
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitTitle, setEditUnitTitle] = useState('');
  const [deletingUnit, setDeletingUnit] = useState<SubjectUnit | null>(null);

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0] || null;

  const handleStartEditingSubject = (subj: Subject) => {
    setEditingSubjectId(subj.id);
    setEditSubjectName(subj.name);
    setEditSubjectGrade(subj.grade_level);
    setEditSubjectUnitType(subj.unit_type_label);
    setSelectedSubjectId(subj.id);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setSubjectError('نام درس نمی‌تواند خالی باشد.');
      return;
    }

    try {
      setSubmitting(true);
      setSubjectError(null);
      const initialUnits = newSubjectInitialUnits
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const created = await api.createSubject({
        name: newSubjectName.trim(),
        grade_level: newSubjectGrade,
        unit_type_label: newSubjectUnitType,
        color_code: 'indigo',
        initial_units: initialUnits,
      });

      await onRefreshBootstrap();
      setSelectedSubjectId(created.id);
      setShowAddSubjectModal(false);
      setNewSubjectName('');
    } catch (err: any) {
      setSubjectError(err.message || 'خطا در ایجاد درس جدید');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSubjectEdit = async (subjId: string) => {
    if (!editSubjectName.trim()) return;
    try {
      setSubmitting(true);
      await api.updateSubject(subjId, {
        name: editSubjectName.trim(),
        grade_level: editSubjectGrade,
        unit_type_label: editSubjectUnitType,
      });
      setEditingSubjectId(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteSubject = async () => {
    if (!deletingSubject) return;
    try {
      setSubmitting(true);
      await api.deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !newUnitTitle.trim()) return;
    try {
      setSubmitting(true);
      await api.createUnit(activeSubject.id, newUnitTitle.trim());
      setNewUnitTitle('');
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUnitEdit = async (unitId: string) => {
    if (!editUnitTitle.trim()) return;
    try {
      setSubmitting(true);
      await api.updateUnit(unitId, { title: editUnitTitle.trim() });
      setEditingUnitId(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deletingUnit) return;
    try {
      setSubmitting(true);
      await api.deleteUnit(deletingUnit.id);
      setDeletingUnit(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveUnit = async (idx: number, direction: 'up' | 'down') => {
    if (!activeSubject) return;
    const units = [...activeSubject.units];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= units.length) return;

    const temp = units[idx];
    units[idx] = units[targetIdx];
    units[targetIdx] = temp;

    await api.reorderUnits(
      activeSubject.id,
      units.map((u) => u.id)
    );
    await onRefreshBootstrap();
  };

  return (
    <div className="space-y-6">
      {/* Vibrant Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>قفسه کتاب‌های درسی متوسطه اول (هفتم، هشتم و نهم)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              تعریف درس‌ها و ساختار آموزشی کتاب‌ها
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90">
              هر کتاب درسی و فصل‌ها، درس‌ها یا پودمان‌های آن را مدیریت کن تا در فرم برنامه‌ریزی روزانه با یک کلیک انتخاب شوند.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewSubjectName(searchQuery.trim());
              setNewSubjectUnitType('درس');
              setNewSubjectInitialUnits('درس اول\nدرس دوم\nدرس سوم\nدرس چهارم');
              setSubjectError(null);
              setShowAddSubjectModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-indigo-950 hover:bg-indigo-50 transition-colors cursor-pointer self-start sm:self-auto min-h-[42px] shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>افزودن کتاب درسی جدید</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Subjects List (Right) + Active Subject Units (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Subjects List with Quick Search */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* Card Header & Counter */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>کتاب‌های درسی من</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
              {toPersianDigits(filteredSubjects.length)} از {toPersianDigits(subjects.length)} کتاب
            </span>
          </div>

          {/* Quick Search Input Section */}
          <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سریع درس یا فصل... (Ctrl+K یا /)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pr-9.5 pl-20 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />

              <div className="absolute left-2.5 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="پاک کردن جستجو (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Grade Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 pl-1 shrink-0">
                <Filter className="w-3 h-3" />
                <span>پایه:</span>
              </span>
              <button
                type="button"
                onClick={() => setGradeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  gradeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                همه ({toPersianDigits(subjects.length)})
              </button>
              {GRADE_OPTIONS.map((grade) => {
                const count = subjects.filter((s) => s.grade_level === grade).length;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setGradeFilter(grade)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      gradeFilter === grade
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    پایه {grade} ({toPersianDigits(count)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subjects List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
            {filteredSubjects.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <SearchX className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    کتاب یا فصلی با عبارت «{searchQuery}» پیدا نشد
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    می‌توانید جستجو را پاک کنید یا این درس جدید را مستقیماً اضافه کنید.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setGradeFilter('all');
                      searchInputRef.current?.focus();
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    پاک کردن فیلترها
                  </button>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubjectName(searchQuery.trim());
                        setNewSubjectGrade(gradeFilter !== 'all' ? gradeFilter : 'هشتم');
                        setNewSubjectUnitType('درس');
                        setNewSubjectInitialUnits('درس اول\nدرس دوم\nدرس سوم\nدرس چهارم');
                        setSubjectError(null);
                        setShowAddSubjectModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن «{searchQuery.trim()}»</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredSubjects.map((subj) => {
                const isSelected = activeSubject?.id === subj.id;
                const isEditing = editingSubjectId === subj.id;
                const visual = getTextbookVisual(subj.name);
                const SubjIcon = visual.icon;

                // Check if search matched any internal units
                const matchingUnits = searchQuery.trim()
                  ? subj.units.filter((u) =>
                      normalizePersianText(u.title).includes(
                        normalizePersianText(searchQuery)
                      )
                    )
                  : [];

                return (
                  <div
                    key={subj.id}
                    onClick={() => !isEditing && setSelectedSubjectId(subj.id)}
                    className={`p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-r-4 border-indigo-600 dark:border-indigo-400'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>ویرایش تنظیمات درس</span>
                        </div>
                        <input
                          type="text"
                          value={editSubjectName}
                          onChange={(e) => setEditSubjectName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                          placeholder="نام درس"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editSubjectGrade}
                            onChange={(e) => setEditSubjectGrade(e.target.value)}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                          >
                            {GRADE_OPTIONS.map((g) => (
                              <option key={g} value={g}>
                                پایه {g}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editSubjectUnitType}
                            onChange={(e) => setEditSubjectUnitType(e.target.value)}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                          >
                            {UNIT_TYPE_OPTIONS.map((ut) => (
                              <option key={ut} value={ut}>
                                ساختار: {ut}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingSubjectId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                          >
                            انصراف
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSubjectEdit(subj.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white"
                          >
                            ذخیره
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${visual.iconBg}`}
                            >
                              <SubjIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                <HighlightMatch text={subj.name} query={searchQuery} />
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  پایه {subj.grade_level}
                                </span>
                                <span>·</span>
                                <span>{subj.unit_type_label}</span>
                                <span>·</span>
                                <span>
                                  {toPersianDigits(subj.units.length)} {subj.unit_type_label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStartEditingSubject(subj)}
                              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="ویرایش و تنظیمات درس"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSubject(subj)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="حذف درس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* If matched by internal unit/chapter, display quick indicator */}
                        {matchingUnits.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>فصل‌های منطبق:</span>
                            </span>
                            {matchingUnits.slice(0, 3).map((mu) => (
                              <span
                                key={mu.id}
                                className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-medium"
                              >
                                <HighlightMatch text={mu.title} query={searchQuery} />
                              </span>
                            ))}
                            {matchingUnits.length > 3 && (
                              <span className="text-slate-400 text-[10px]">
                                +{toPersianDigits(matchingUnits.length - 3)} فصل دیگر
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Left Column: Units (فصل‌ها / درس‌ها) of Selected Subject */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {activeSubject ? (
            <>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>
                      ساختار آموزشی کتاب «{activeSubject.name}»
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                      پایه {activeSubject.grade_level} · {toPersianDigits(activeSubject.units.length)} {activeSubject.unit_type_label}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    عناوین این بخش مستقیماً در فیلد «فصل / درس» فرم برنامه‌ریزی روزانه نمایش داده می‌شوند.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEditingSubject(activeSubject)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    title="تغییر نام، پایه تحصیلی یا واحد تقسیم‌بندی این کتاب"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>تنظیمات کتاب</span>
                  </button>
                </div>
              </div>

              {/* Quick Add Unit Form */}
              <form
                onSubmit={handleAddUnit}
                className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  placeholder={`افزودن ${activeSubject.unit_type_label} جدید برای ${activeSubject.name} (مثلاً: ${activeSubject.unit_type_label} پنجم...)`}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !newUnitTitle.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن {activeSubject.unit_type_label}</span>
                </button>
              </form>

              {/* Units List */}
              {activeSubject.units.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  هنوز هیچ فصل یا درسی برای کتاب «{activeSubject.name}» ثبت نشده است. از کادر بالا اولین عنوان را اضافه کنید.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeSubject.units.map((unit, idx) => {
                    const isEditingUnit = editingUnitId === unit.id;
                    const isMatchingUnit =
                      Boolean(searchQuery.trim()) &&
                      normalizePersianText(unit.title).includes(
                        normalizePersianText(searchQuery)
                      );

                    return (
                      <div
                        key={unit.id}
                        className={`px-6 py-3.5 flex items-center justify-between gap-3 transition-colors ${
                          isMatchingUnit
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-r-3 border-amber-500'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center tabular-nums shrink-0 ${
                              isMatchingUnit
                                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {toPersianDigits(idx + 1)}
                          </span>

                          {isEditingUnit ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editUnitTitle}
                                onChange={(e) => setEditUnitTitle(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveUnitEdit(unit.id)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                                title="ذخیره"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUnitId(null)}
                                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                title="انصراف"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                <HighlightMatch text={unit.title} query={searchQuery} />
                              </span>
                              {isMatchingUnit && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60">
                                  منطبق با جستجو
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {!isEditingUnit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveUnit(idx, 'up')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                              title="انتقال به بالا"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeSubject.units.length - 1}
                              onClick={() => handleMoveUnit(idx, 'down')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                              title="انتقال به پایین"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUnitId(unit.id);
                                setEditUnitTitle(unit.title);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              title="ویرایش عنوان فصل/درس"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUnit(unit)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              title="حذف فصل/درس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              یک درس را از ستون سمت راست انتخاب کنید.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Define New Subject */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تعریف کتاب درسی جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              {subjectError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {subjectError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  نام کتاب درسی
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="مثلاً: تفکر و سبک زندگی / نگارش..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    پایه تحصیلی
                  </label>
                  <select
                    value={newSubjectGrade}
                    onChange={(e) => setNewSubjectGrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        پایه {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    واحد تقسیم‌بندی کتاب
                  </label>
                  <select
                    value={newSubjectUnitType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSubjectUnitType(val);
                      setNewSubjectInitialUnits(
                        `${val} اول\n${val} دوم\n${val} سوم\n${val} چهارم`
                      );
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  >
                    {UNIT_TYPE_OPTIONS.map((ut) => (
                      <option key={ut} value={ut}>
                        بر اساس {ut} (مثلاً {ut} اول)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  عناوین اولیه فصل‌ها / درس‌ها (هر خط یک عنوان)
                </label>
                <textarea
                  rows={4}
                  value={newSubjectInitialUnits}
                  onChange={(e) => setNewSubjectInitialUnits(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت درس و فصل‌ها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید حذف درس «{deletingSubject.name}»
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف این درس مطمئن هستید؟ (توجه: سوابق و گزارش‌های قبلی شما در روزهای گذشته به دلیل معماری Snapshot دیتابیس بدون هیچ آسیبی حفظ خواهند شد.)
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                حذف درس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Unit Confirmation Modal */}
      {deletingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید حذف «{deletingUnit.title}»
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف این عنوان از فهرست کتاب مطمئن هستید؟ (سوابق قبلی برنامه‌ریزی حفظ می‌شوند.)
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingUnit(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUnit}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                حذف عنوان
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
