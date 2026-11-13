import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Download,
  Upload,
  Github,
  Terminal,
  Copy,
  CheckCircle2,
  ExternalLink,
  Database,
  Smartphone,
  Monitor,
  Tag,
  Bell,
} from 'lucide-react';
import type {
  ActivityCategory,
  StudyActivityType,
  PriorityLevel,
  ActivityGroupType,
} from '../types.ts';
import { api } from '../services/api.ts';
import { toPersianDigits } from '../utils/jalali.ts';
import { APP_VERSION, APP_RELEASE_TAG, RELEASE_HISTORY } from '../version.ts';
import {
  getSmartReminderEnabled,
  setSmartReminderEnabled,
  SMART_REMINDER_EVENT_NAME,
} from './StudyReminderManager.tsx';

interface SettingsViewProps {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  onRefreshBootstrap: () => Promise<void>;
}

const ACTIVITY_GROUP_LABELS: Record<ActivityGroupType, string> = {
  educational: 'گروه ۱: آموزشی و یادگیری',
  restricted: 'گروه ۲: تفریحی و محدودشونده (گوشی/بازی/تلویزیون)',
  essential: 'گروه ۳: ضروری و بازیابی (استراحت/غذا/ورزش)',
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  categories,
  studyTypes,
  priorities,
  onRefreshBootstrap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'github' | 'categories' | 'studyTypes' | 'priorities' | 'backup'
  >('github');

  // Smart Study Reminder visibility setting (Section 1)
  const [smartReminderEnabledState, setSmartReminderEnabledState] = useState<boolean>(() =>
    getSmartReminderEnabled()
  );

  useEffect(() => {
    const syncHandler = () => {
      setSmartReminderEnabledState(getSmartReminderEnabled());
    };
    window.addEventListener(SMART_REMINDER_EVENT_NAME, syncHandler);
    return () => window.removeEventListener(SMART_REMINDER_EVENT_NAME, syncHandler);
  }, []);

  const handleToggleSmartReminder = () => {
    const next = !smartReminderEnabledState;
    setSmartReminderEnabledState(next);
    setSmartReminderEnabled(next);
  };

  // Category CRUD state
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryIsStudy, setNewCategoryIsStudy] = useState<number>(0);
  const [newCategoryGroup, setNewCategoryGroup] = useState<ActivityGroupType>('essential');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatTitle, setEditCatTitle] = useState('');
  const [editCatGroup, setEditCatGroup] = useState<ActivityGroupType>('essential');
  const [deletingCategory, setDeletingCategory] = useState<ActivityCategory | null>(null);

  // StudyType CRUD state
  const [newStudyTypeTitle, setNewStudyTypeTitle] = useState('');
  const [newStudyTypeDesc, setNewStudyTypeDesc] = useState('');
  const [editingStId, setEditingStId] = useState<string | null>(null);
  const [editStTitle, setEditStTitle] = useState('');
  const [editStDesc, setEditStDesc] = useState('');
  const [deletingStudyType, setDeletingStudyType] = useState<StudyActivityType | null>(null);

  // Priority Edit state
  const [editingPriorityCode, setEditingPriorityCode] = useState<string | null>(null);
  const [editPriorityLabel, setEditPriorityLabel] = useState('');

  // Backup / Restore state
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  // GitHub Sync State
  const [githubToken, setGithubToken] = useState('');
  const [githubRepoName, setGithubRepoName] = useState('MartiaPlanner');
  const [githubVersion, setGithubVersion] = useState(APP_VERSION);
  const [githubCommitMsg, setGithubCommitMsg] = useState(
    `release(v${APP_VERSION}): fix mobile bottom nav safe-area & vibrant student UI`
  );
  const [githubIsPrivate, setGithubIsPrivate] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    oauthConfigured: boolean;
    hasStoredToken: boolean;
    defaultRepo: string;
    appUrl: string;
  } | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushResult, setPushResult] = useState<{
    repoUrl: string;
    version: string;
    releaseTag: string;
    filesCount: number;
    commitSha: string;
    branch: string;
    createdNewRepo: boolean;
  } | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    api
      .getGitHubStatus()
      .then((st) => {
        setGithubStatus(st);
        if (st.defaultRepo) setGithubRepoName(st.defaultRepo);
      })
      .catch(() => {});

    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        api.getGitHubStatus().then(setGithubStatus).catch(() => {});
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Category Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;
    await api.createCategory({
      title: newCategoryTitle.trim(),
      is_study: newCategoryIsStudy,
      activity_group: newCategoryIsStudy === 1 ? 'educational' : newCategoryGroup,
    });
    setNewCategoryTitle('');
    setNewCategoryIsStudy(0);
    setNewCategoryGroup('essential');
    await onRefreshBootstrap();
  };

  const handleSaveCategory = async (id: string) => {
    if (!editCatTitle.trim()) return;
    await api.updateCategory(id, {
      title: editCatTitle.trim(),
      activity_group: editCatGroup,
    });
    setEditingCatId(null);
    await onRefreshBootstrap();
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    await api.deleteCategory(deletingCategory.id);
    setDeletingCategory(null);
    await onRefreshBootstrap();
  };

  // StudyType Handlers
  const handleAddStudyType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyTypeTitle.trim()) return;
    await api.createStudyType({
      title: newStudyTypeTitle.trim(),
      description: newStudyTypeDesc.trim(),
    });
    setNewStudyTypeTitle('');
    setNewStudyTypeDesc('');
    await onRefreshBootstrap();
  };

  const handleSaveStudyType = async (id: string) => {
    if (!editStTitle.trim()) return;
    await api.updateStudyType(id, {
      title: editStTitle.trim(),
      description: editStDesc.trim(),
    });
    setEditingStId(null);
    await onRefreshBootstrap();
  };

  const handleConfirmDeleteStudyType = async () => {
    if (!deletingStudyType) return;
    await api.deleteStudyType(deletingStudyType.id);
    setDeletingStudyType(null);
    await onRefreshBootstrap();
  };

  // Priority Handlers
  const handleSavePriority = async (code: string) => {
    if (!editPriorityLabel.trim()) return;
    await api.updatePriority(code, { label: editPriorityLabel.trim() });
    setEditingPriorityCode(null);
    await onRefreshBootstrap();
  };

  // Backup Export & Import
  const handleExportBackup = async () => {
    try {
      setBackupError(null);
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MartiaPlanner-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage('فایل پشتیبان دیتابیس SQLite با موفقیت دانلود شد.');
    } catch (err: any) {
      setBackupError(err.message || 'خطا در تهیه فایل پشتیبان');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBackupError(null);
      setBackupMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.importBackup(parsed);
      await onRefreshBootstrap();
      setBackupMessage('اطلاعات فایل پشتیبان با موفقیت در دیتابیس SQLite بازیابی شد.');
    } catch (err: any) {
      setBackupError(err.message || 'فایل انتخاب‌شده معتبر نیست.');
    }
  };

  // GitHub Push Handler
  const handlePushToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPushLoading(true);
      setPushError(null);
      setPushResult(null);
      const res = await api.pushToGitHub({
        token: githubToken.trim() || undefined,
        repoName: githubRepoName.trim() || 'MartiaPlanner',
        version: githubVersion.trim() || APP_VERSION,
        commitMessage: githubCommitMsg.trim(),
        isPrivate: githubIsPrivate,
      });
      setPushResult(res);
    } catch (err: any) {
      setPushError(err.message || 'خطا در اتصال و پوش به گیت‌هاب');
    } finally {
      setPushLoading(false);
    }
  };

  const gitCliCommands = `# ۱. مقداردهی اولیه مخزن گیت در پوشه پروژه
git init

# ۲. تغییر نام شاخه اصلی به main
git branch -M main

# ۳. افزودن تمام فایل‌های پروژه (از جمله کدهای Tauri 2، دیتابیس SQLite، React و README.md)
git add .

# ۴. ثبت اولین کامیت
git commit -m "feat: initial commit of MartiaPlanner (Tauri 2 + React + SQLite)"

# ۵. اتصال به مخزن MartiaPlanner در گیت‌هاب (نام کاربری خود را جایگزین YOUR_USERNAME کنید)
git remote add origin https://github.com/YOUR_USERNAME/MartiaPlanner.git

# ۶. پوش کردن کدها به شاخه main
git push -u origin main`;

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(gitCliCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            تنظیمات سامانه، دیتابیس و اتصال به گیت‌هاب
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            مدیریت اطلاعات پایه، پشتیبان‌گیری دیتابیس SQLite، نسخه‌بندی و پوش مستقیم به مخزن MartiaPlanner
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          <Tag className="w-4 h-4" />
          <span>نسخه فعلی سامانه: {toPersianDigits(APP_VERSION)} ({APP_RELEASE_TAG})</span>
        </div>
      </div>

      {/* Section 1: Persistent Toggle for Smart Study Reminder in Planner Menu */}
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-l from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              نمایش بخش «یادآور هوشمند زمان مطالعه» در منوی برنامه‌ریزی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              با غیرفعال کردن این گزینه، آکاردئون یادآور هوشمند از صفحه برنامه‌ریزی پنهان می‌شود اما هیچ‌یک از تنظیمات یا ساعت‌های یادآوری ذخیره‌شده حذف نخواهند شد.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={smartReminderEnabledState}
          onClick={handleToggleSmartReminder}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-extrabold border transition-all cursor-pointer shrink-0 min-h-[42px] ${
            smartReminderEnabledState
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              smartReminderEnabledState ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span>
            {smartReminderEnabledState ? 'وضعیت: فعال (در حال نمایش)' : 'وضعیت: غیرفعال (پنهان در برنامه‌ریزی)'}
          </span>
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('github')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] ${
            activeSubTab === 'github'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Github className="w-4 h-4" />
          <span>اتصال به GitHub و خروجی Tauri 2</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] ${
            activeSubTab === 'categories'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          عنوان فعالیت‌ها ({toPersianDigits(categories.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('studyTypes')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] ${
            activeSubTab === 'studyTypes'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          انواع فعالیت درسی ({toPersianDigits(studyTypes.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('priorities')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] ${
            activeSubTab === 'priorities'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          سطوح اولویت (A1 تا C3)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] ${
            activeSubTab === 'backup'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>پشتیبان‌گیری و بازیابی SQLite</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: GITHUB PUSH & TAURI 2 / GIT CLI GUIDE
      ===================================================================== */}
      {activeSubTab === 'github' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Direct One-Click Push to MartiaPlanner via GitHub API */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Github className="w-5 h-5 text-slate-900 dark:text-white" />
                  <span>پوش مستقیم پروژه به مخزن MartiaPlanner در گیت‌هاب</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  بدون نیاز به نصب ابزار جانبی، تمام فایل‌های پروژه (شامل فرانت‌اند React، سرور SQLite، تنظیمات Rust/Tauri 2 و فایل مستندات README.md) را مستقیماً به مخزن گیت‌هاب خود پوش کنید.
                </p>
              </div>
            </div>

            {pushResult && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    پروژه با موفقیت به مخزن {pushResult.repoUrl} پوش شد!
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                  نسخه منتشرشده: {pushResult.releaseTag} · تعداد فایل‌ها: {toPersianDigits(pushResult.filesCount)} فایل · شاخه:{' '}
                  {pushResult.branch} · کد کامیت: {pushResult.commitSha.slice(0, 7)}
                </p>
                <a
                  href={pushResult.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                >
                  <span>مشاهده مخزن MartiaPlanner در GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {pushError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                {pushError}
              </div>
            )}

            <form onSubmit={handlePushToGitHub} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ۱. توکن دسترسی شخصی گیت‌هاب (GitHub Personal Access Token - Classic)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="توکن گیت‌هاب را اینجا وارد کنید..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none font-mono"
                  dir="ltr"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  در گیت‌هاب به مسیر{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    Settings → Developer settings → Personal access tokens → Tokens (classic)
                  </span>{' '}
                  بروید، یک توکن جدید با تیک دسترسی <strong>repo</strong> و <strong>workflow</strong> بسازید و اینجا قرار دهید.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ۲. نام مخزن (Repository)
                  </label>
                  <input
                    type="text"
                    required
                    value={githubRepoName}
                    onChange={(e) => setGithubRepoName(e.target.value)}
                    placeholder="MartiaPlanner"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ۳. شماره نسخه (Version)
                  </label>
                  <input
                    type="text"
                    required
                    value={githubVersion}
                    onChange={(e) => setGithubVersion(e.target.value)}
                    placeholder="1.1.0"
                    className="w-full rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/30 px-3.5 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ۴. نوع مخزن
                  </label>
                  <select
                    value={githubIsPrivate ? 'private' : 'public'}
                    onChange={(e) => setGithubIsPrivate(e.target.value === 'private')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="public">عمومی (Public)</option>
                    <option value="private">خصوصی (Private)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ۵. پیام کامیت (Commit Message)
                </label>
                <input
                  type="text"
                  value={githubCommitMsg}
                  onChange={(e) => setGithubCommitMsg(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={pushLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-indigo-600 py-3 px-4 text-xs font-bold text-white hover:opacity-90 transition-opacity cursor-pointer min-h-[44px]"
              >
                <Github className="w-4 h-4" />
                <span>
                  {pushLoading
                    ? `در حال ارسال و ثبت نسخه v${githubVersion} در GitHub...`
                    : `ثبت نسخه v${githubVersion} و Push به مخزن MartiaPlanner`}
                </span>
              </button>
            </form>

            {/* Standalone HTML File Card */}
            <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>دانلود فایل مستقل HTML (بدون نیاز به سرور)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                این فایل (MartiaPlanner-v{APP_VERSION}.html) شامل کل کدهای فرانت‌اند، استایل‌ها و پایگاه داده محلی است و با دوبار کلیک در هر مرورگری بدون نیاز به نصب یا اینترنت اجرا می‌شود.
              </p>
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <a
                  href={`/MartiaPlanner-v${APP_VERSION}.html`}
                  download={`MartiaPlanner-v${APP_VERSION}.html`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود مستقیم MartiaPlanner-v{APP_VERSION}.html</span>
                </a>
                <a
                  href={`https://github.com/EhspGithub/MartiaPlanner/blob/main/MartiaPlanner-v${APP_VERSION}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <span>مشاهده در مخزن گیت‌هاب</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Release History Card */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>تاریخچه نسخه‌های برنامه (Release Notes)</span>
              </div>
              <div className="space-y-2.5">
                {RELEASE_HISTORY.map((rel) => (
                  <div
                    key={rel.tag}
                    className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {rel.title}
                      </span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {rel.tag}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                      {rel.changes.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Terminal Git Commands & Tauri 2 Windows/Android Guide */}
          <div className="lg:col-span-6 space-y-6">
            {/* Git CLI Commands Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>دستورات کامل ترمینال (git init / remote / push)</span>
                </h3>
                <button
                  type="button"
                  onClick={handleCopyCommands}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  {copiedCmd ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی دستورات</span>
                    </>
                  )}
                </button>
              </div>

              <pre
                dir="ltr"
                className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed"
              >
                {gitCliCommands}
              </pre>
            </div>

            {/* Tauri 2 Native Build Instructions (Windows & Android) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>فایل‌های پیکربندی‌شده Tauri 2 برای ویندوز و اندروید</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                پوشه <span className="font-mono font-semibold">src-tauri/</span> به همراه پلاگین رسمی{' '}
                <span className="font-mono font-semibold">tauri-plugin-sql (SQLite)</span> و فایل مستندات{' '}
                <span className="font-mono font-semibold">README.md</span> در ریشه پروژه ایجاد شده‌اند. پس از کلون کردن مخزن روی سیستم خود، با دستورات زیر خروجی نصبی بگیرید:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    خروجی نصبی ویندوز (.exe / .msi)
                  </div>
                  <code dir="ltr" className="block font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                    npm run tauri:build
                  </code>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    خروجی نصبی اندروید (.apk)
                  </div>
                  <code dir="ltr" className="block font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    npm run tauri:android:init && npm run tauri:android:build
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ACTIVITY CATEGORIES (مدیریت عنوان فعالیت‌ها - ۱۱.۱)
      ===================================================================== */}
      {activeSubTab === 'categories' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              مدیریت عنوان فعالیت‌ها (درسی و غیردرسی)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              گزینه‌هایی که در فیلد اول فرم برنامه‌ریزی («عنوان فعالیت») به دانش‌آموز نمایش داده می‌شوند.
            </p>

            <form onSubmit={handleAddCategory} className="mt-4 flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                required
                value={newCategoryTitle}
                onChange={(e) => setNewCategoryTitle(e.target.value)}
                placeholder="عنوان فعالیت جدید (مثلاً: مطالعه آزاد، کلاس زبان، ورزش...)"
                className="flex-1 min-w-[200px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
              <select
                value={newCategoryIsStudy}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setNewCategoryIsStudy(val);
                  if (val === 1) setNewCategoryGroup('educational');
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value={0}>نوع: فعالیت غیردرسی (فرم ساده)</option>
                <option value={1}>نوع: فعالیت درسی (نیازمند انتخاب درس و فصل)</option>
              </select>
              {newCategoryIsStudy === 0 && (
                <select
                  value={newCategoryGroup}
                  onChange={(e) => setNewCategoryGroup(e.target.value as ActivityGroupType)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="essential">گروه ۳: ضروری و بازیابی (بدون نمره منفی)</option>
                  <option value="restricted">گروه ۲: تفریحی و محدودشونده (کنترل سقف مجاز)</option>
                  <option value="educational">گروه ۱: آموزشی و یادگیری</option>
                </select>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن عنوان فعالیت</span>
              </button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((cat) => {
              const isEditing = editingCatId === cat.id;
              const groupKey: ActivityGroupType =
                cat.activity_group || (Number(cat.is_study) === 1 ? 'educational' : 'essential');
              return (
                <div
                  key={cat.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editCatTitle}
                        onChange={(e) => setEditCatTitle(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                      {Number(cat.is_study) === 0 && (
                        <select
                          value={editCatGroup}
                          onChange={(e) => setEditCatGroup(e.target.value as ActivityGroupType)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="essential">ضروری و بازیابی</option>
                          <option value="restricted">تفریحی و محدودشونده</option>
                          <option value="educational">آموزشی و یادگیری</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveCategory(cat.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {cat.title}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                        · {Number(cat.is_study) === 1 ? 'فعالیت درسی' : 'فعالیت غیردرسی'} ·{' '}
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {ACTIVITY_GROUP_LABELS[groupKey]}
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditCatTitle(cat.title);
                        setEditCatGroup(groupKey);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                      title="ویرایش"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {cat.id !== 'cat-study' && (
                      <button
                        type="button"
                        onClick={() => setDeletingCategory(cat)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: STUDY ACTIVITY TYPES (مدیریت انواع فعالیت درسی - ۱۱.۲)
      ===================================================================== */}
      {activeSubTab === 'studyTypes' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              مدیریت انواع فعالیت درسی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              گزینه‌هایی مانند تکلیف، امتحان، پس‌خوانی و بدون فعالیت که هنگام انتخاب فعالیت «درس» نمایش داده می‌شوند.
            </p>

            <form onSubmit={handleAddStudyType} className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                required
                value={newStudyTypeTitle}
                onChange={(e) => setNewStudyTypeTitle(e.target.value)}
                placeholder="عنوان (مثلاً: پیش‌خوانی، حل تست، پروژه کلاسی)"
                className="sm:col-span-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newStudyTypeDesc}
                onChange={(e) => setNewStudyTypeDesc(e.target.value)}
                placeholder="توضیح کوتاه برای راهنمایی دانش‌آموز..."
                className="sm:col-span-5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="sm:col-span-3 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن نوع فعالیت درسی</span>
              </button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {studyTypes.map((st) => {
              const isEditing = editingStId === st.id;
              return (
                <div
                  key={st.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editStTitle}
                        onChange={(e) => setEditStTitle(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={editStDesc}
                        onChange={(e) => setEditStDesc(e.target.value)}
                        className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveStudyType(st.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {st.title}
                      </div>
                      {st.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {st.description}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStId(st.id);
                        setEditStTitle(st.title);
                        setEditStDesc(st.description || '');
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingStudyType(st)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: PRIORITIES (مدیریت اولویت‌ها A1 تا C3 - ۱۱.۳)
      ===================================================================== */}
      {activeSubTab === 'priorities' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              مدیریت ماتریس اولویت‌بندی (A1 تا C3)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ترتیب استاندارد اجرای فعالیت‌ها: A1 ← A2 ← A3 ← B1 ← B2 ← B3 ← C1 ← C2 ← C3. می‌توانید برچسب راهنمای هر اولویت را سفارشی کنید.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {priorities.map((prio) => {
              const isEditing = editingPriorityCode === prio.code;
              return (
                <div
                  key={prio.code}
                  className="px-6 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-10 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center tabular-nums">
                      {prio.code}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editPriorityLabel}
                          onChange={(e) => setEditPriorityLabel(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePriority(prio.code)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPriorityCode(null)}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {prio.label}
                        </span>
                        <span className="text-xs text-slate-400 mr-2 tabular-nums">
                          · رتبه اولویت: {toPersianDigits(prio.sort_rank)}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPriorityCode(prio.code);
                        setEditPriorityLabel(prio.label);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: SQLITE DATABASE BACKUP & RESTORE (بند ۱۲ اصول فنی و معماری)
      ===================================================================== */}
      {activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>دریافت فایل پشتیبان (Export SQLite Backup)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              تمامی اطلاعات دروس، فصل‌ها، برنامه‌های روزانه، گزارش‌های عملکرد واقعی و تاریخچه تحلیلی خود را در قالب یک فایل استاندارد JSON دانلود و ذخیره کنید.
            </p>
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer min-h-[42px]"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل پشتیبان دیتابیس</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>بازیابی اطلاعات از فایل پشتیبان (Restore)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              در صورت انتقال برنامه به دستگاه جدید (لپ‌تاپ یا گوشی اندروید)، فایل پشتیبان قبلی خود را انتخاب کنید تا تمام سوابق مطالعه بازیابی شوند.
            </p>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[42px]">
              <Upload className="w-4 h-4" />
              <span>انتخاب فایل پشتیبان (.json)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {(backupMessage || backupError) && (
            <div className="md:col-span-2">
              {backupMessage && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {backupMessage}
                </div>
              )}
              {backupError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {backupError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Category Confirmation */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید حذف عنوان فعالیت «{deletingCategory.title}»
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف این عنوان مطمئن هستید؟ فعالیت‌های قبلی ثبت‌شده با این عنوان در تاریخچه بدون تغییر باقی می‌مانند.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                حذف عنوان
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete StudyType Confirmation */}
      {deletingStudyType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید حذف نوع فعالیت درسی «{deletingStudyType.title}»
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف این گزینه مطمئن هستید؟
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingStudyType(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudyType}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                حذف گزینه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
