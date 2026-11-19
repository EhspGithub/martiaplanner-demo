import React, { useState, useEffect, useRef } from 'react';
import {
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
  Sparkles,
  RefreshCw,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArchiveRestore,
  FlaskConical,
  Sliders,
} from 'lucide-react';
import type {
  ActivityCategory,
  StudyActivityType,
  PriorityLevel,
  ActivityGroupType,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatJalaliNumeric,
  syncMotivationalQuotesBank,
  getMotivationalQuotesStats,
} from '../utils/jalali.ts';
import { APP_VERSION, APP_RELEASE_TAG, RELEASE_HISTORY } from '../version.ts';
import {
  getSmartReminderEnabled,
  setSmartReminderEnabled,
  SMART_REMINDER_EVENT_NAME,
} from './StudyReminderManager.tsx';
import { CoefficientsSettingsPanel } from './CoefficientsSettingsPanel.tsx';
import { CloudSyncPanel } from './CloudSyncPanel.tsx';
import type { AnalyticsCoefficientsConfig } from '../utils/analyticsCoefficients.ts';
import { downloadStandaloneAppHtml } from '../utils/standaloneHtmlExport.ts';

interface SettingsViewProps {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  onRefreshBootstrap: () => Promise<void>;
  initialSubTab?:
    | 'backup'
    | 'sampleData'
    | 'coefficients'
    | 'categories'
    | 'studyTypes'
    | 'priorities'
    | 'github';
  highlightedCoeffKey?: keyof AnalyticsCoefficientsConfig | null;
  onNavigateToDefinition?: (definitionId: string) => void;
  onNavigateToTableRow?: (rowId: string) => void;
}

const ACTIVITY_GROUP_LABELS: Record<ActivityGroupType, string> = {
  educational: 'گروه ۱: آموزشی و یادگیری',
  restricted: 'گروه ۲: تفریحی و محدودشونده (گوشی/بازی/تلویزیون)',
  essential: 'گروه ۳: ضروری و بازیابی (استراحت/غذا/ورزش)',
};

function buildFallbackChangelogMarkdown(): string {
  const lines: string[] = [
    '# گزارش تغییرات و نسخه‌ها (CHANGELOG) — MartiaPlanner',
    '',
    'تمام تغییرات کلیدی، بهبودهای عملکردی و امکانات اضافه‌شده در هر نسخه در فایل `CHANGELOG.md` مخزن پروژه نگهداری می‌شوند.',
    '',
    '---',
    '',
  ];
  for (const rel of RELEASE_HISTORY) {
    lines.push(`## [${rel.version}] (${rel.tag}) — ${rel.title}`);
    for (const ch of rel.changes) {
      lines.push(`- ${ch}`);
    }
    lines.push('', '---', '');
  }
  return lines.join('\n');
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  categories,
  studyTypes,
  priorities,
  onRefreshBootstrap,
  initialSubTab,
  highlightedCoeffKey,
  onNavigateToDefinition,
  onNavigateToTableRow,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'backup'
    | 'sampleData'
    | 'coefficients'
    | 'categories'
    | 'studyTypes'
    | 'priorities'
    | 'github'
  >(initialSubTab || 'backup');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (highlightedCoeffKey) {
      setActiveSubTab('coefficients');
    }
  }, [highlightedCoeffKey]);

  // Smart Study Reminder visibility setting
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

  // Motivational Quotes Bank state
  const [quotesStats, setQuotesStats] = useState(() => getMotivationalQuotesStats());
  const [quotesSyncLoading, setQuotesSyncLoading] = useState<boolean>(false);
  const [quotesSyncMessage, setQuotesSyncMessage] = useState<string | null>(null);

  const handleSyncMotivationalQuotes = async () => {
    setQuotesSyncLoading(true);
    setQuotesSyncMessage(null);
    const res = await syncMotivationalQuotesBank();
    setQuotesStats(getMotivationalQuotesStats());
    setQuotesSyncMessage(res.message);
    setQuotesSyncLoading(false);
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

  // Section 4: Comprehensive Backup & Restore state
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [restoreLoading, setRestoreLoading] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [autoBackupBeforeRestore, setAutoBackupBeforeRestore] = useState<boolean>(true);
  const [pendingRestoreCandidate, setPendingRestoreCandidate] = useState<{
    fileName: string;
    normalizedPayload: any;
    summary: {
      version: string;
      exportedAt: string;
      subjectsCount: number;
      unitsCount: number;
      plansCount: number;
      performanceLogsCount: number;
      categoriesCount: number;
      studyTypesCount: number;
      prioritiesCount: number;
      studyGoalsCount: number;
      timeBudgetsCount: number;
      hasClientPreferences: boolean;
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [standaloneHtmlDownloading, setStandaloneHtmlDownloading] = useState<
    'pure' | 'embedded' | null
  >(null);
  const [standaloneHtmlStatus, setStandaloneHtmlStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Section 3: External Release Notes (CHANGELOG.md) Modal Viewer state
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState<boolean>(false);
  const [changelogContent, setChangelogContent] = useState<string>('');
  const [changelogLoading, setChangelogLoading] = useState<boolean>(false);

  const handleOpenChangelogModal = async () => {
    setIsChangelogModalOpen(true);
    if (changelogContent) return;
    setChangelogLoading(true);
    const md = await api.getChangelogDocument();
    setChangelogContent(md || buildFallbackChangelogMarkdown());
    setChangelogLoading(false);
  };

  // Sample Data (3-Month Demo Dataset + 1-Week Verification Dataset) state
  const [sampleDataStatus, setSampleDataStatus] = useState<{
    hasSampleData: boolean;
    samplePlansCount: number;
    samplePerformancesCount: number;
    sampleDaysCount: number;
    hasWeeklySampleData?: boolean;
    weeklySamplePlansCount?: number;
    weeklySamplePerformancesCount?: number;
    weeklySampleDaysCount?: number;
  }>({
    hasSampleData: false,
    samplePlansCount: 0,
    samplePerformancesCount: 0,
    sampleDaysCount: 0,
    hasWeeklySampleData: false,
    weeklySamplePlansCount: 0,
    weeklySamplePerformancesCount: 0,
    weeklySampleDaysCount: 0,
  });
  const [sampleDataLoading, setSampleDataLoading] = useState<boolean>(false);
  const [weeklySampleLoading, setWeeklySampleLoading] = useState<boolean>(false);
  const [sampleDataMessage, setSampleDataMessage] = useState<string | null>(null);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);
  const [confirmDeleteSampleModal, setConfirmDeleteSampleModal] = useState<boolean>(false);
  const [confirmDeleteWeeklySampleModal, setConfirmDeleteWeeklySampleModal] =
    useState<boolean>(false);
  const [confirmReplaceWeeklySampleModal, setConfirmReplaceWeeklySampleModal] =
    useState<boolean>(false);

  const refreshSampleDataStatus = async () => {
    try {
      const st = await api.getSampleDataStatus();
      setSampleDataStatus(st);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshSampleDataStatus();
  }, []);

  const handleSeedSampleData = async () => {
    try {
      setSampleDataLoading(true);
      setSampleDataError(null);
      setSampleDataMessage(null);
      const res = await api.seedSampleData();
      setSampleDataStatus((prev) => ({
        ...prev,
        ...res,
      }));
      await onRefreshBootstrap();
      if (res.alreadyLoaded) {
        setSampleDataMessage(
          `داده‌های نمونه ۳ ماهه قبلاً در سامانه بارگذاری شده‌اند (${toPersianDigits(
            res.samplePlansCount
          )} فعالیت در ${toPersianDigits(res.sampleDaysCount)} روز) و از ثبت تکراری جلوگیری شد.`
        );
      } else {
        setSampleDataMessage(
          `داده‌های نمونه ۳ ماهه شامل ${toPersianDigits(
            res.samplePlansCount
          )} برنامه مطالعاتی و فعالیت روزانه و ${toPersianDigits(
            res.samplePerformancesCount
          )} رکورد عملکرد و XP در ${toPersianDigits(
            res.sampleDaysCount
          )} روز با موفقیت به سامانه اضافه شد.`
        );
      }
    } catch (err: any) {
      setSampleDataError(err.message || 'خطا در افزودن داده‌های نمونه');
    } finally {
      setSampleDataLoading(false);
    }
  };

  const handleConfirmDeleteSampleData = async () => {
    try {
      setSampleDataLoading(true);
      setSampleDataError(null);
      setSampleDataMessage(null);
      const res = await api.deleteSampleData();
      setSampleDataStatus((prev) => ({
        ...prev,
        ...res,
      }));
      setConfirmDeleteSampleModal(false);
      await onRefreshBootstrap();
      setSampleDataMessage(
        `تمام داده‌های نمونه ۳ ماهه (${toPersianDigits(
          res.removedPlansCount || 0
        )} رکورد آزمایشی) با موفقیت پاک‌سازی شدند و داده‌های واقعی شما ۱۰۰٪ دست‌نخورده باقی ماندند.`
      );
    } catch (err: any) {
      setSampleDataError(err.message || 'خطا در حذف داده‌های نمونه');
    } finally {
      setSampleDataLoading(false);
    }
  };

  const handleSeedWeeklySampleData = async (replace = false) => {
    if (sampleDataStatus.hasWeeklySampleData && !replace) {
      setConfirmReplaceWeeklySampleModal(true);
      return;
    }
    try {
      setWeeklySampleLoading(true);
      setConfirmReplaceWeeklySampleModal(false);
      setSampleDataError(null);
      setSampleDataMessage(null);
      const res = await api.seedWeeklySampleData(replace);
      setSampleDataStatus((prev) => ({
        ...prev,
        ...res,
      }));
      await onRefreshBootstrap();
      setSampleDataMessage(
        res.replaced
          ? `داده‌های نمونه یک‌هفته‌ای (شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵) بدون ایجاد رکورد تکراری با موفقیت بازنویسی و جایگزین شدند (${toPersianDigits(
              res.weeklySamplePlansCount
            )} فعالیت و ${toPersianDigits(res.weeklySamplePerformancesCount)} رکورد عملکرد در ۷ روز).`
          : `داده‌های نمونه یک‌هفته‌ای در بازه ثابت شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵ شامل ${toPersianDigits(
              res.weeklySamplePlansCount
            )} فعالیت و ${toPersianDigits(
              res.weeklySamplePerformancesCount
            )} رکورد عملکرد با موفقیت وارد سامانه شد. می‌توانید محاسبات گام‌به‌گام آن را در «منوی راهنما ← تب تعاریف ← محاسبات داده‌های نمونه یک‌هفته‌ای» مشاهده کنید.`
      );
    } catch (err: any) {
      setSampleDataError(err.message || 'خطا در ورود داده‌های نمونه یک‌هفته‌ای');
    } finally {
      setWeeklySampleLoading(false);
    }
  };

  const handleConfirmDeleteWeeklySampleData = async () => {
    try {
      setWeeklySampleLoading(true);
      setSampleDataError(null);
      setSampleDataMessage(null);
      const res = await api.deleteWeeklySampleData();
      setSampleDataStatus((prev) => ({
        ...prev,
        ...res,
      }));
      setConfirmDeleteWeeklySampleModal(false);
      await onRefreshBootstrap();
      setSampleDataMessage(
        `داده‌های نمونه یک‌هفته‌ای (۱۶ تا ۲۲ آبان ۱۴۰۵ — ${toPersianDigits(
          res.removedWeeklyPlansCount || 0
        )} رکورد) با موفقیت حذف شدند و سایر داده‌های شما کاملاً دست‌نخورده باقی ماندند.`
      );
    } catch (err: any) {
      setSampleDataError(err.message || 'خطا در حذف داده‌های نمونه یک‌هفته‌ای');
    } finally {
      setWeeklySampleLoading(false);
    }
  };

  // GitHub Sync State
  const [githubToken, setGithubToken] = useState('');
  const [githubRepoName, setGithubRepoName] = useState('MartiaPlanner');
  const [githubVersion, setGithubVersion] = useState(APP_VERSION);
  const [githubCommitMsg, setGithubCommitMsg] = useState(
    `release(v${APP_VERSION}): update MartiaPlanner`
  );
  const [githubIsPrivate, setGithubIsPrivate] = useState(false);
  const [, setGithubStatus] = useState<{
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

  // Helper to download a JSON backup object to user's device
  const triggerBackupDownload = (data: any, filePrefix = 'MartiaPlanner-Backup') => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Section 4-A: Export Full Backup
  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupError(null);
      setBackupMessage(null);
      const data = await api.exportBackup();
      triggerBackupDownload(data, `MartiaPlanner-Backup-v${APP_VERSION}`);
      const plansCount = Array.isArray(data?.daily_plans) ? data.daily_plans.length : 0;
      const perfCount = Array.isArray(data?.performance_logs) ? data.performance_logs.length : 0;
      const subjCount = Array.isArray(data?.subjects) ? data.subjects.length : 0;
      setBackupMessage(
        `نسخه پشتیبان کامل سامانه (شامل ${toPersianDigits(subjCount)} درس، ${toPersianDigits(
          plansCount
        )} برنامه مطالعاتی، ${toPersianDigits(
          perfCount
        )} سابقه عملکرد و XP، ظرف زمانی و تنظیمات) با موفقیت روی دستگاه شما ذخیره شد.`
      );
    } catch (err: any) {
      setBackupError(err.message || 'خطا در تهیه فایل پشتیبان');
    } finally {
      setBackupLoading(false);
    }
  };

  // Section 4-B Step 1: Select & Validate Backup File before Restore
  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    try {
      setBackupError(null);
      setBackupMessage(null);
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setBackupError(
          'فایل انتخاب‌شده خراب است یا فرمت JSON معتبری ندارد. هیچ تغییری در اطلاعات فعلی شما اعمال نشد.'
        );
        return;
      }

      const validation = api.validateBackupPayload(parsed);
      if (!validation.valid || !validation.normalizedPayload || !validation.summary) {
        setBackupError(
          validation.error ||
            'فایل پشتیبان انتخاب‌شده نامعتبر یا ناسازگار با نسخه فعلی برنامه است.'
        );
        return;
      }

      setPendingRestoreCandidate({
        fileName: file.name,
        normalizedPayload: validation.normalizedPayload,
        summary: validation.summary,
      });
    } catch (err: any) {
      setBackupError(err.message || 'خطا در خواندن فایل پشتیبان انتخاب‌شده.');
    }
  };

  // Section 4-B Step 2: Confirm & Execute Atomic Restore (with optional pre-restore safety backup)
  const handleConfirmRestoreBackup = async () => {
    if (!pendingRestoreCandidate) return;
    try {
      setRestoreLoading(true);
      setBackupError(null);
      setBackupMessage(null);

      // Automatic safety backup of current data before overwriting
      if (autoBackupBeforeRestore) {
        try {
          const currentBackup = await api.exportBackup();
          triggerBackupDownload(currentBackup, 'MartiaPlanner-SafetyBackup-BeforeRestore');
        } catch {
          // Continue if safety download was blocked by browser
        }
      }

      await api.importBackup(pendingRestoreCandidate.normalizedPayload);
      setSmartReminderEnabledState(getSmartReminderEnabled());
      setQuotesStats(getMotivationalQuotesStats());
      await onRefreshBootstrap();

      const s = pendingRestoreCandidate.summary;
      setPendingRestoreCandidate(null);
      setBackupMessage(
        `بازیابی اطلاعات با موفقیت و به‌صورت یکپارچه انجام شد (${toPersianDigits(
          s.subjectsCount
        )} درس، ${toPersianDigits(s.plansCount)} برنامه مطالعاتی و ${toPersianDigits(
          s.performanceLogsCount
        )} سابقه عملکرد و XP بازیابی شدند).`
      );
    } catch (err: any) {
      setBackupError(
        err.message ||
          'خطا در بازیابی فایل پشتیبان. اطلاعات قبلی سامانه بدون تغییر حفظ شد.'
      );
    } finally {
      setRestoreLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            تنظیمات سامانه و پشتیبان‌گیری
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          <Tag className="w-4 h-4" />
          <span>نسخه فعلی سامانه: {toPersianDigits(APP_VERSION)} ({APP_RELEASE_TAG})</span>
        </div>
      </div>

      {/* Section 1: Persistent Checkbox for Smart Study Reminder in Planner Menu */}
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-l from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              نمایش بخش «یادآور هوشمند زمان مطالعه» در منوی برنامه‌ریزی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-justify">
              با غیرفعال کردن این گزینه، آکاردئون یادآور هوشمند از صفحه برنامه‌ریزی پنهان می‌شود اما هیچ‌یک از تنظیمات یا ساعت‌های یادآوری ذخیره‌شده حذف نخواهند شد.
            </p>
          </div>
        </div>

        <label
          className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-extrabold border transition-all cursor-pointer select-none shrink-0 self-start sm:self-center ${
            smartReminderEnabledState
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <input
            type="checkbox"
            checked={smartReminderEnabledState}
            onChange={handleToggleSmartReminder}
            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
          />
          <span>{smartReminderEnabledState ? 'فعال شد' : 'غیرفعال شد'}</span>
        </label>
      </div>

      {/* Section 2: Motivational & Educational Quotes Bank Update Card */}
      <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/60 bg-gradient-to-l from-violet-50/70 via-white to-amber-50/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-violet-600/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white whitespace-nowrap truncate max-w-full">
                  بانک جملات انگیزشی و آموزشی روزانه
                </h2>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 tabular-nums">
                  {toPersianDigits(quotesStats.totalCount)} جمله علمی در{' '}
                  {toPersianDigits(quotesStats.categoriesCount)} محور تخصصی
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-justify">
                به‌روزرسانی و غنی‌سازی بانک جملات انگیزشی با بررسی خودکار ساختار، حذف موارد تکراری و حفظ ۱۰۰٪ جملات قبلی در حافظه آفلاین برنامه.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={quotesSyncLoading}
            onClick={handleSyncMotivationalQuotes}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer shrink-0 min-h-[40px] shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${quotesSyncLoading ? 'animate-spin' : ''}`} />
            <span>
              {quotesSyncLoading ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی جملات انگیزشی'}
            </span>
          </button>
        </div>

        {quotesSyncMessage && (
          <div className="rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 px-3.5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{quotesSyncMessage}</span>
          </div>
        )}
      </div>

      {/* Section 3: Compact Release Notes Card Linking to Standalone Repository File (CHANGELOG.md) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                تاریخچه نسخه‌های برنامه
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {APP_RELEASE_TAG}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-justify">
              مستندات کامل تاریخچه نسخه‌ها، امکانات اضافه‌شده و اصلاحات هر نسخه در فایل مستقل{' '}
              <code className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                CHANGELOG.md
              </code>{' '}
              نگهداری می‌شود.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenChangelogModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-extrabold transition-colors cursor-pointer min-h-[40px] shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>مشاهده تاریخچه تغییرات برنامه</span>
          </button>
          <a
            href="/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 text-xs font-bold transition-colors min-h-[40px]"
          >
            <span>فایل CHANGELOG.md</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Sub-navigation Tabs: 2-Column Bordered Grid on Mobile, Flex Row on Desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-1.5 p-2 sm:p-1.5 bg-slate-200/70 dark:bg-slate-800/90 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-extrabold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'backup'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">پشتیبان‌گیری و بازیابی</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('sampleData');
            refreshSampleDataStatus();
          }}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-extrabold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'sampleData'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">داده‌های نمونه</span>
          {(sampleDataStatus.hasSampleData || sampleDataStatus.hasWeeklySampleData) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center justify-center sm:justify-start px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'categories'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="truncate">عنوان فعالیت‌ها ({toPersianDigits(categories.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('studyTypes')}
          className={`flex items-center justify-center sm:justify-start px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'studyTypes'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="truncate">انواع فعالیت درسی ({toPersianDigits(studyTypes.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('priorities')}
          className={`flex items-center justify-center sm:justify-start px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'priorities'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="truncate">سطوح اولویت (A1 تا C3)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('coefficients')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-extrabold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'coefficients'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">تنظیم ضرایب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('github')}
          className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all cursor-pointer min-h-[40px] ${
            activeSubTab === 'github'
              ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs'
              : 'bg-white/60 dark:bg-slate-900/40 sm:bg-transparent border-slate-300/80 dark:border-slate-700/80 sm:border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Github className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">اتصال به GitHub و خروجی</span>
        </button>
      </div>

      {/* =====================================================================
          TAB: COEFFICIENTS SETTINGS («تنظیم ضرایب»)
      ===================================================================== */}
      {activeSubTab === 'coefficients' && (
        <CoefficientsSettingsPanel
          highlightedCoeffKey={highlightedCoeffKey}
          onNavigateToDefinition={onNavigateToDefinition}
          onNavigateToTableRow={onNavigateToTableRow}
          onCoefficientsUpdated={() => {
            void onRefreshBootstrap();
          }}
        />
      )}

      {/* =====================================================================
          TAB 1 (DEFAULT): SECTION 4 — COMPREHENSIVE BACKUP & RESTORE + CLOUD SYNC
      ===================================================================== */}
      {activeSubTab === 'backup' && (
        <div className="space-y-5">
          {/* دیتابیس ابری زنده و مشترک (Firebase Firestore Cloud Sync) */}
          <CloudSyncPanel onDataSynced={onRefreshBootstrap} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* الف) دریافت نسخه پشتیبان (Backup) */}
            <div className="rounded-3xl border border-indigo-200/90 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      دریافت نسخه پشتیبان (Backup)
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                      ذخیره کامل اطلاعات روی دستگاه شما
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  با کلیک روی دکمه زیر، یک فایل پشتیبان استاندارد و یکپارچه حاوی تمام اطلاعات شما تهیه و دانلود می‌شود:
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <li>تمام کتاب‌های درسی، پایه‌ها و فصل‌های تعریف‌شده</li>
                  <li>برنامه‌های مطالعاتی و فعالیت‌های روزانه ثبت‌شده در تمام تاریخ‌ها</li>
                  <li>سوابق مطالعه، عملکرد واقعی، تست‌ها، نمرات کیفیت یادگیری، امتیازهای XP و سطح (Level)</li>
                  <li>ظرف زمانی روزانه، اهداف عددی و تنظیمات دسته‌بندی‌ها و یادآورها</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={backupLoading}
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-5 py-3 text-xs sm:text-sm font-extrabold text-white transition-colors cursor-pointer min-h-[46px] shadow-sm shadow-indigo-600/20"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {backupLoading ? 'در حال آماده‌سازی فایل پشتیبان...' : 'دریافت نسخه پشتیبان (.json)'}
                </span>
              </button>
            </div>

            {/* ب) بازیابی نسخه پشتیبان (Import / Restore) */}
            <div className="rounded-3xl border border-emerald-200/90 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                    <ArchiveRestore className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      بازیابی نسخه پشتیبان (Restore)
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                      بررسی اعتبار فایل و بازگردانی ایمن اطلاعات
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  فایل پشتیبان قبلی خود را انتخاب کنید. سامانه قبل از هرگونه تغییر، ساختار و سلامت فایل را اعتبارسنجی کرده و خلاصه محتویات آن را برای تأیید نهایی به شما نمایش می‌دهد:
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <li>اعتبارسنجی خودکار ساختار فایل و جلوگیری از ورود فایل‌های معیوب یا ناسازگار</li>
                  <li>دریافت تأیید صریح از شما قبل از جایگزینی اطلاعات فعلی</li>
                  <li>تهیه نسخه پشتیبان خودکار از وضعیت فعلی قبل از شروع بازیابی</li>
                  <li>اجرای تراکنشی و یکپارچه (حفظ کامل اطلاعات قبلی در صورت بروز هرگونه خطا)</li>
                </ul>
              </div>

              <div>
                <label className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-xs sm:text-sm font-extrabold text-white transition-colors cursor-pointer min-h-[46px] shadow-sm shadow-emerald-600/20">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>انتخاب فایل پشتیبان جهت بازیابی (.json)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleSelectBackupFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Feedback Banner for Backup / Restore */}
          {backupMessage && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex items-start gap-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{backupMessage}</span>
            </div>
          )}

          {backupError && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{backupError}</span>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 1.5: SAMPLE DATA ENGINE (افزودن و حذف داده‌های نمونه ۳ ماهه)
      ===================================================================== */}
      {activeSubTab === 'sampleData' && (
        <div className="space-y-5">
          {/* Status Banner */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              sampleDataStatus.hasSampleData
                ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  sampleDataStatus.hasSampleData
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    وضعیت داده‌های نمونه در سامانه
                  </h2>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg ${
                      sampleDataStatus.hasSampleData
                        ? 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sampleDataStatus.hasSampleData ? 'فعال و بارگذاری‌شده' : 'بارگذاری‌نشده'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed text-justify">
                  {sampleDataStatus.hasSampleData
                    ? `در حال حاضر ${toPersianDigits(
                        sampleDataStatus.samplePlansCount
                      )} برنامه و فعالیت نمونه و ${toPersianDigits(
                        sampleDataStatus.samplePerformancesCount
                      )} رکورد عملکرد در ${toPersianDigits(
                        sampleDataStatus.sampleDaysCount
                      )} روز در سامانه ثبت شده است.`
                    : 'هیچ داده نمونه‌ای در حال حاضر در سامانه وجود ندارد. می‌توانید برای مشاهده و تست کامل نمودارها و کارنامه‌ها، داده‌های نمونه ۳ ماهه را اضافه کنید.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* الف) افزودن داده‌های نمونه ۳ ماهه */}
            <div className="rounded-3xl border border-indigo-200/90 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      افزودن داده‌های نمونه (۳ ماهه)
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                      تولید هوشمند ۹۰ روز سابقه مطالعه، تست، کیفیت یادگیری و تفریح
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  با اجرای این گزینه، مجموعه‌ای غنی، واقع‌گرایانه و متنوع از فعالیت‌های یک دانش‌آموز در بازه ۳ ماه اخیر (۹۰ روز) تولید و ثبت می‌شود تا تمام نمودارها، کارنامه هوشمند، امتیازهای XP، مقایسه درس‌ها و گزارش‌های تفریحی به‌طور کامل قابل بررسی باشند:
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <li>توزیع طبیعی ساعات مطالعه در دروس و فصل‌های مختلف با وضعیت‌های تکمیل‌شده، ناقص و انجام‌نشده</li>
                  <li>ثبت تعداد تمرین/تست و نمره کیفیت یادگیری (۰ تا ۱۰) برای تغذیه شاخص‌های کارنامه</li>
                  <li>شامل فعالیت‌های تفریحی هم در محدوده مجاز و هم دارای تجاوز از سقف مجاز روزانه</li>
                  <li>کاملاً ایزوله و بدون تداخل با برنامه‌ها و اطلاعات شخصی شما</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={sampleDataLoading || sampleDataStatus.hasSampleData}
                onClick={handleSeedSampleData}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 px-5 py-3 text-xs sm:text-sm font-extrabold text-white transition-colors cursor-pointer min-h-[46px] shadow-sm shadow-indigo-600/20"
              >
                <FlaskConical className="w-4 h-4 shrink-0" />
                <span>
                  {sampleDataLoading
                    ? 'در حال تولید و ثبت داده‌های نمونه ۳ ماهه...'
                    : sampleDataStatus.hasSampleData
                    ? 'داده‌های نمونه قبلاً اضافه شده‌اند'
                    : 'افزودن داده‌های نمونه'}
                </span>
              </button>
            </div>

            {/* ب) حذف ایمن داده‌های نمونه */}
            <div className="rounded-3xl border border-rose-200/90 dark:border-rose-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/20">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      حذف داده‌های نمونه
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                      پاک‌سازی اختصاصی رکوردهای نمونه بدون دستکاری اطلاعات واقعی شما
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  با استفاده از این قابلیت، فقط و فقط رکوردهایی که توسط دکمه «افزودن داده‌های نمونه» ایجاد شده‌اند شناسایی و حذف می‌شوند و هیچ‌یک از برنامه‌ها یا سوابق واقعی شما حذف یا دستکاری نخواهد شد:
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <li>حفظ ۱۰۰٪ برنامه‌های روزانه و سوابق عملکرد ثبت‌شده توسط خود دانش‌آموز</li>
                  <li>حفظ کامل کتاب‌های درسی، فصل‌ها، دسته‌بندی‌ها و تنظیمات شخصی</li>
                  <li>بازمحاسبه آنی نمودارها، امتیاز XP و گزارش‌ها بر اساس داده‌های واقعی</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={sampleDataLoading || !sampleDataStatus.hasSampleData}
                onClick={() => setConfirmDeleteSampleModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-5 py-3 text-xs sm:text-sm font-extrabold text-white transition-colors cursor-pointer min-h-[46px] shadow-sm shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>حذف داده‌های نمونه</span>
              </button>
            </div>
          </div>

          {/* Section B: 1-Week Controlled Sample Dataset (۱۶ تا ۲۲ آبان ۱۴۰۵) */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              sampleDataStatus.hasWeeklySampleData
                ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  sampleDataStatus.hasWeeklySampleData
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    وضعیت داده‌های نمونه یک‌هفته‌ای (شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵)
                  </h2>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg ${
                      sampleDataStatus.hasWeeklySampleData
                        ? 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200'
                        : 'bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200'
                    }`}
                  >
                    {sampleDataStatus.hasWeeklySampleData
                      ? 'فعال و بارگذاری‌شده (۱۶ تا ۲۲ آبان ۱۴۰۵)'
                      : 'آماده بارگذاری'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed text-justify">
                  {sampleDataStatus.hasWeeklySampleData
                    ? `در حال حاضر ${toPersianDigits(
                        sampleDataStatus.weeklySamplePlansCount || 0
                      )} فعالیت نمونه یک‌هفته‌ای و ${toPersianDigits(
                        sampleDataStatus.weeklySamplePerformancesCount || 0
                      )} رکورد عملکرد در ${toPersianDigits(
                        sampleDataStatus.weeklySampleDaysCount || 7
                      )} روز (۱۴۰۵/۰۸/۱۶ تا ۱۴۰۵/۰۸/۲۲) ثبت شده است.`
                    : 'داده‌های نمونه یک‌هفته‌ای مخصوص بررسی دقیق و گام‌به‌گام فرمول‌ها در بازه ثابت شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵ طراحی شده‌اند و کاملاً مستقل از داده‌های نمونه ۳ ماهه هستند.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* پ) ورود داده‌های نمونه یک‌هفته‌ای (۱۶ تا ۲۲ آبان ۱۴۰۵) */}
            <div className="rounded-3xl border border-emerald-200/90 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      ورود داده‌های نمونه یک‌هفته‌ای
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                      بازه ثابت: شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵ (۷ روز کامل)
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  با کلیک روی این دکمه، یک هفته نمونه کنترل‌شده و دقیق شامل ۶ درس (ریاضی، علوم تجربی، فارسی، عربی، زبان انگلیسی و مطالعات اجتماعی) در بازه ۱۶ تا ۲۲ آبان ۱۴۰۵ وارد برنامه می‌شود که تمامی محاسبات گام‌به‌گام آن در منوی «راهنما ← تعاریف ← محاسبات داده‌های نمونه یک‌هفته‌ای» قابل راستی‌آزمایی است:
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <li>شامل تمام حالت‌های واقعی: تکمیل‌شده، ناقص، انجام‌نشده، روز بدون تست و روز دارای جریمه وقفه (-XP)</li>
                  <li>پوشش زمان واقعی کمتر، مساوی و بیشتر از پیش‌بینی + فعالیت‌های سرگرمی در سقف مجاز و بیش از سقف مجاز</li>
                  <li>کاملاً مستقل از داده‌های نمونه ۳ ماهه و داده‌های شخصی شما (بدون ایجاد رکورد تکراری)</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={weeklySampleLoading}
                onClick={() => handleSeedWeeklySampleData(false)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 px-5 py-3 text-xs sm:text-sm font-extrabold text-white transition-colors cursor-pointer min-h-[46px] shadow-sm shadow-emerald-600/20"
              >
                <FlaskConical className="w-4 h-4 shrink-0" />
                <span>
                  {weeklySampleLoading
                    ? 'در حال ثبت داده‌های نمونه یک‌هفته‌ای...'
                    : sampleDataStatus.hasWeeklySampleData
                    ? 'بازنویسی مجدد داده‌های نمونه یک‌هفته‌ای'
                    : 'ورود داده‌های نمونه یک‌هفته‌ای'}
                </span>
              </button>
            </div>

            {/* ت) حذف داده‌های نمونه یک‌هفته‌ای */}
            <div className="rounded-3xl border border-amber-200/90 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-600/20">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      حذف داده‌های نمونه یک‌هفته‌ای
                    </h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                      پاک‌سازی اختصاصی رکوردهای ۱۶ تا ۲۲ آبان ۱۴۰۵
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  با کلیک روی این گزینه، فقط رکوردهای مربوط به «داده‌های نمونه یک‌هفته‌ای» (۱۶ تا ۲۲ آبان ۱۴۰۵) حذف می‌شوند و نه داده‌های واقعی شما و نه داده‌های نمونه ۳ ماهه دستکاری نخواهند شد:
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
                  <li>جداسازی کامل با پیشوند اختصاصی بدون تداخل با سایر تاریخ‌ها</li>
                  <li>امکان بارگذاری و حذف چندباره بدون ایجاد تغییر در اطلاعات شخصی</li>
                  <li>بازمحاسبه فوری شاخص‌های عملکرد و دروس پس از حذف</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={weeklySampleLoading || !sampleDataStatus.hasWeeklySampleData}
                onClick={() => setConfirmDeleteWeeklySampleModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-5 py-3 text-xs sm:text-sm font-extrabold text-white transition-colors cursor-pointer min-h-[46px] shadow-sm shadow-amber-600/20"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>حذف داده‌های نمونه یک‌هفته‌ای</span>
              </button>
            </div>
          </div>

          {sampleDataMessage && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex items-start gap-3 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{sampleDataMessage}</span>
            </div>
          )}

          {sampleDataError && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{sampleDataError}</span>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: ACTIVITY CATEGORIES (مدیریت عنوان فعالیت‌ها)
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
          TAB 3: STUDY ACTIVITY TYPES (مدیریت انواع فعالیت درسی)
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
          TAB 4: PRIORITIES (مدیریت اولویت‌ها A1 تا C3)
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
          TAB 5: GITHUB PUSH & TAURI 2 / GIT CLI GUIDE
      ===================================================================== */}
      {activeSubTab === 'github' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Github className="w-5 h-5 text-slate-900 dark:text-white" />
                  <span>پوش مستقیم پروژه به مخزن MartiaPlanner در گیت‌هاب</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  بدون نیاز به نصب ابزار جانبی، تمام فایل‌های پروژه را مستقیماً به مخزن گیت‌هاب خود پوش کنید.
                </p>
              </div>
            </div>

            {pushResult && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>پروژه با موفقیت به مخزن {pushResult.repoUrl} پوش شد!</span>
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
                    placeholder={APP_VERSION}
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

            {/* Standalone HTML File Card — Authenticated Blob Download (Cookie/Interstitial-Proof) */}
            <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>دانلود فایل مستقل HTML (بدون نیاز به سرور و اینترنت)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 shrink-0">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed text-justify">
                این دانلود با روش احراز هویت‌شده درون‌برنامه‌ای (Authenticated Blob Fetch) و اعتبارسنجی باندل انجام می‌شود تا روی مرورگر کروم موبایل و ویندوز، به‌جای فایل خطای کوکی امنیتی، خود برنامه کامل ذخیره شود.
              </p>
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={standaloneHtmlDownloading !== null}
                  onClick={async () => {
                    setStandaloneHtmlDownloading('pure');
                    setStandaloneHtmlStatus(null);
                    try {
                      const res = await downloadStandaloneAppHtml({ includeUserData: false });
                      const sizeMb = (res.sizeBytes / (1024 * 1024)).toFixed(2);
                      setStandaloneHtmlStatus({
                        type: 'success',
                        text: `فایل مستقل خام «${res.fileName}» (${sizeMb} مگابایت) با راستی‌آزمایی کامل دانلود شد.`,
                      });
                    } catch (err: any) {
                      setStandaloneHtmlStatus({
                        type: 'error',
                        text: err?.message || 'خطا در دانلود فایل مستقل HTML',
                      });
                    } finally {
                      setStandaloneHtmlDownloading(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {standaloneHtmlDownloading === 'pure'
                      ? 'در حال دریافت و راستی‌آزمایی...'
                      : `دانلود نسخه مستقل خام (MartiaPlanner-v${APP_VERSION}.html)`}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={standaloneHtmlDownloading !== null}
                  onClick={async () => {
                    setStandaloneHtmlDownloading('embedded');
                    setStandaloneHtmlStatus(null);
                    try {
                      const res = await downloadStandaloneAppHtml({ includeUserData: true });
                      const sizeMb = (res.sizeBytes / (1024 * 1024)).toFixed(2);
                      setStandaloneHtmlStatus({
                        type: 'success',
                        text: `نسخه قابل حمل «${res.fileName}» همراه با تمام داده‌های فعلی (${sizeMb} مگابایت) با موفقیت ذخیره شد.`,
                      });
                    } catch (err: any) {
                      setStandaloneHtmlStatus({
                        type: 'error',
                        text: err?.message || 'خطا در بسته‌بندی فایل قابل حمل HTML',
                      });
                    } finally {
                      setStandaloneHtmlDownloading(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {standaloneHtmlDownloading === 'embedded'
                      ? 'در حال بسته‌بندی برنامه + داده‌ها...'
                      : 'دانلود برنامه + داده‌های فعلی (HTML قابل حمل)'}
                  </span>
                </button>
              </div>
              {standaloneHtmlStatus && (
                <div
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold flex items-start gap-2 ${
                    standaloneHtmlStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {standaloneHtmlStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{standaloneHtmlStatus.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Terminal Git Commands & Tauri 2 Windows/Android Guide */}
          <div className="lg:col-span-6 space-y-6">
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

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>فایل‌های پیکربندی‌شده Tauri 2 برای ویندوز و اندروید</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                پوشه <span className="font-mono font-semibold">src-tauri/</span> در ریشه پروژه قرار دارد. پس از کلون کردن مخزن روی سیستم خود، با دستورات زیر خروجی نصبی بگیرید:
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
          MODAL 1: EXPLICIT RESTORE CONFIRMATION & PRE-RESTORE VALIDATION PREVIEW
      ===================================================================== */}
      {pendingRestoreCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    تأیید نهایی بازیابی اطلاعات از فایل پشتیبان
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                    اعتبارسنجی فایل با موفقیت انجام شد ({pendingRestoreCandidate.fileName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingRestoreCandidate(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary of Validated Backup File */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 text-xs">
              <div className="font-extrabold text-slate-900 dark:text-white">
                خلاصه اطلاعات موجود در فایل پشتیبان انتخاب‌شده:
              </div>
              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    نسخه فایل پشتیبان:
                  </span>
                  <strong className="text-slate-900 dark:text-white font-mono">
                    v{pendingRestoreCandidate.summary.version}
                  </strong>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    تاریخ تهیه پشتیبان:
                  </span>
                  <strong className="text-slate-900 dark:text-white">
                    {formatJalaliNumeric(
                      pendingRestoreCandidate.summary.exportedAt.slice(0, 10)
                    )}
                  </strong>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    کتاب‌های درسی و فصل‌ها:
                  </span>
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {toPersianDigits(pendingRestoreCandidate.summary.subjectsCount)} درس /{' '}
                    {toPersianDigits(pendingRestoreCandidate.summary.unitsCount)} فصل
                  </strong>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    برنامه‌های مطالعاتی ثبت‌شده:
                  </span>
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {toPersianDigits(pendingRestoreCandidate.summary.plansCount)} برنامه
                  </strong>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    سوابق عملکرد و XP:
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {toPersianDigits(pendingRestoreCandidate.summary.performanceLogsCount)} رکورد عملکرد
                  </strong>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    ظرف زمانی و اهداف روزانه:
                  </span>
                  <strong className="text-purple-600 dark:text-purple-400">
                    {toPersianDigits(
                      pendingRestoreCandidate.summary.timeBudgetsCount +
                        pendingRestoreCandidate.summary.studyGoalsCount
                    )}{' '}
                    مورد
                  </strong>
                </div>
              </div>
            </div>

            {/* Warning & Pre-restore Safety Backup Option */}
            <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/80 p-4 space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  هشدار: با تأیید بازیابی، اطلاعات موجود در این فایل پشتیبان جایگزین اطلاعات فعلی سامانه خواهد شد.
                </span>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none text-slate-800 dark:text-slate-200 font-extrabold">
                <input
                  type="checkbox"
                  checked={autoBackupBeforeRestore}
                  onChange={(e) => setAutoBackupBeforeRestore(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span>
                  قبل از بازیابی، یک نسخه پشتیبان از اطلاعات فعلی من نیز به‌صورت خودکار دانلود شود (پیشنهادی)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={restoreLoading}
                onClick={() => setPendingRestoreCandidate(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={restoreLoading}
                onClick={handleConfirmRestoreBackup}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer shadow-sm"
              >
                <ArchiveRestore className="w-4 h-4" />
                <span>
                  {restoreLoading ? 'در حال بازیابی یکپارچه اطلاعات...' : 'تأیید و بازیابی اطلاعات'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EXTERNAL CHANGELOG.MD VIEWER
      ===================================================================== */}
      {isChangelogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    مستندات تاریخچه تغییرات برنامه (CHANGELOG.md)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    خوانده‌شده از فایل مستقل <code className="font-mono">CHANGELOG.md</code> در مخزن پروژه
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/CHANGELOG.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span>باز کردن فایل خام</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsChangelogModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5">
              {changelogLoading ? (
                <div className="text-center py-10 text-xs font-bold text-slate-500">
                  در حال بارگذاری فایل CHANGELOG.md...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {changelogContent}
                </pre>
              )}
            </div>
          </div>
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
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed text-justify">
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

      {/* Confirm Delete Sample Data Modal */}
      {confirmDeleteSampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  تأیید حذف داده‌های نمونه
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                  حذف {toPersianDigits(sampleDataStatus.samplePlansCount)} رکورد نمونه در{' '}
                  {toPersianDigits(sampleDataStatus.sampleDaysCount)} روز
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
              آیا از حذف داده‌های نمونه ۳ ماهه مطمئن هستید؟ با تأیید این گزینه، فقط داده‌های آزمایشی اضافه‌شده از بخش «داده‌های نمونه» پاک می‌شوند و تمام برنامه‌ها، دروس و سوابق واقعی شما بدون هیچ تغییری حفظ خواهند شد.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={sampleDataLoading}
                onClick={() => setConfirmDeleteSampleModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={sampleDataLoading}
                onClick={handleConfirmDeleteSampleData}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {sampleDataLoading ? 'در حال حذف داده‌های نمونه...' : 'تأیید و حذف داده‌های نمونه'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Replace 1-Week Sample Data Modal */}
      {confirmReplaceWeeklySampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  داده‌های نمونه یک‌هفته‌ای قبلاً وارد شده‌اند
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  بازه شنبه ۱۶ آبان ۱۴۰۵ تا جمعه ۲۲ آبان ۱۴۰۵
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
              داده‌های نمونه یک‌هفته‌ای هم‌اکنون در سامانه وجود دارند. آیا مایل هستید بدون ایجاد رکوردهای تکراری، این داده‌ها به حالت استاندارد اولیه بازنویسی و جایگزین شوند؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={weeklySampleLoading}
                onClick={() => setConfirmReplaceWeeklySampleModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={weeklySampleLoading}
                onClick={() => handleSeedWeeklySampleData(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تأیید و بازنویسی بدون تکرار</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete 1-Week Sample Data Modal */}
      {confirmDeleteWeeklySampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  تأیید حذف داده‌های نمونه یک‌هفته‌ای
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                  حذف {toPersianDigits(sampleDataStatus.weeklySamplePlansCount || 0)} رکورد نمونه در بازه ۱۶ تا ۲۲ آبان ۱۴۰۵
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
              آیا از حذف داده‌های نمونه یک‌هفته‌ای مطمئن هستید؟ با تأیید این گزینه، فقط رکوردهای آزمایشی هفته ۱۶ تا ۲۲ آبان ۱۴۰۵ پاک می‌شوند و سایر اطلاعات شما کاملاً دست‌نخورده باقی خواهند ماند.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={weeklySampleLoading}
                onClick={() => setConfirmDeleteWeeklySampleModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={weeklySampleLoading}
                onClick={handleConfirmDeleteWeeklySampleData}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {weeklySampleLoading
                    ? 'در حال حذف...'
                    : 'تأیید و حذف داده‌های نمونه یک‌هفته‌ای'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
