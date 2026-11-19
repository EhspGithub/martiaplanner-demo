import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Copy,
  Check,
  UserCheck,
  Database,
  KeyRound,
  Code2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HardDrive,
  Shield,
  Eye,
  GraduationCap,
  Wifi,
  WifiOff,
  GitMerge,
  Download,
  FileCode2,
} from 'lucide-react';
import {
  firebaseCloudSync,
  SUPABASE_SETUP_SQL_SCRIPT,
  extractSupabaseProjectRef,
  type CloudSyncStatus,
  type CloudProviderType,
  type ConnectionModeType,
  type WorkspaceRoleType,
} from '../services/firebaseCloudSync.ts';
import { api } from '../services/api.ts';
import { downloadStandaloneAppHtml } from '../utils/standaloneHtmlExport.ts';
import { getStorageDiagnostics } from '../utils/safeStorage.ts';
import { toPersianDigits } from '../utils/jalali.ts';
import { APP_VERSION } from '../version.ts';

interface CloudSyncPanelProps {
  onDataSynced?: () => Promise<void>;
}

const ROLE_OPTIONS: Array<{
  id: WorkspaceRoleType;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'owner',
    title: 'مالک / مدیر فضای کاری',
    desc: 'دسترسی کامل به ثبت، ویرایش، حذف، همگام‌سازی و مدیریت اتاق مشترک',
    icon: Shield,
  },
  {
    id: 'student',
    title: 'دانش‌آموز (ثبت‌کننده اطلاعات)',
    desc: 'ثبت برنامه و عملکرد روزانه و ارسال خودکار به دستگاه والدین/مشاور',
    icon: GraduationCap,
  },
  {
    id: 'observer',
    title: 'والدین / مشاور (ناظر فقط‌خواندنی)',
    desc: 'دریافت و مشاهده زنده گزارش‌های دانش‌آموز بدون امکان تغییر یا حذف در ابر',
    icon: Eye,
  },
];

function formatIsoTimestampFa(iso: string | null): string {
  if (!iso) return 'ثبت‌نشده';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'ثبت‌نشده';
    return new Intl.DateTimeFormat('fa-IR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso.slice(0, 16);
  }
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ onDataSynced }) => {
  const [status, setStatus] = useState<CloudSyncStatus>(() => firebaseCloudSync.getStatus());
  const [workspaceInput, setWorkspaceInput] = useState<string>(status.workspaceId);
  const [nameInput, setNameInput] = useState<string>(status.collaboratorName);
  const [sbUrlInput, setSbUrlInput] = useState<string>(status.supabaseUrl);
  const [sbKeyInput, setSbKeyInput] = useState<string>(status.supabaseAnonKey);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedWorkspace, setCopiedWorkspace] = useState<boolean>(false);
  const [htmlDownloadLoading, setHtmlDownloadLoading] = useState<'pure' | 'portable' | null>(null);
  const [safetyBackupDone, setSafetyBackupDone] = useState<boolean>(false);

  const storageDiag = getStorageDiagnostics();

  useEffect(() => {
    const unsub = firebaseCloudSync.subscribeStatus((newStatus) => {
      setStatus(newStatus);
      if (newStatus.needsSupabaseTableSetup) {
        setShowSqlGuide(true);
      }
    });
    return unsub;
  }, []);

  const supabaseProjectRef = extractSupabaseProjectRef(sbUrlInput || status.supabaseUrl);
  const supabaseSqlEditorUrl = supabaseProjectRef
    ? `https://supabase.com/dashboard/project/${supabaseProjectRef}/sql/new`
    : 'https://supabase.com/dashboard/projects';

  const handleSelectConnectionMode = async (mode: ConnectionModeType) => {
    setActionError(null);
    setActionMessage(null);
    setSafetyBackupDone(false);
    await firebaseCloudSync.setConnectionMode(mode);
    if (mode === 'offline') {
      setActionMessage(
        'حالت «استفاده شخصی (آفلاین)» فعال شد. تمامی اطلاعات قبلی شما روی دستگاه محفوظ است و هیچ ارتباطی با سرور ابری برقرار نمی‌شود.'
      );
    } else {
      const nextStatus = firebaseCloudSync.getStatus();
      if (nextStatus.pendingSyncConflict) {
        setActionMessage(
          'تفاوت بین داده‌های محلی دستگاه و فضای ابری شناسایی شد؛ لطفاً نحوه ترکیب یا جایگزینی را در کادر زیر انتخاب کنید.'
        );
      } else {
        setActionMessage(
          'حالت «استفاده مشترک (دیتابیس ابری)» فعال شد. داده‌ها بدون حذف سوابق قبلی آماده همگام‌سازی هستند.'
        );
      }
    }
  };

  const handleSelectRole = (role: WorkspaceRoleType) => {
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.setWorkspaceRole(role);
    if (role === 'observer') {
      setActionMessage(
        'نقش «ناظر فقط‌خواندنی (والدین / مشاور)» فعال شد. تمامی تغییرات دانش‌آموز به‌صورت زنده دریافت می‌شود اما امکان تغییر یا ارسال داده به ابر قفل است.'
      );
    } else if (role === 'student') {
      setActionMessage(
        'نقش «دانش‌آموز (ثبت‌کننده اطلاعات)» فعال شد. ثبت و ویرایش فعالیت‌های شما در فضای مشترک همگام می‌شود.'
      );
    } else {
      setActionMessage('نقش «مالک / مدیر فضای کاری» با دسترسی کامل فعال شد.');
    }
  };

  const handleSelectProvider = async (provider: CloudProviderType) => {
    setActionError(null);
    setActionMessage(null);
    await firebaseCloudSync.setProvider(provider);
    setActionMessage(
      provider === 'firebase'
        ? 'موتور همگام‌سازی ابری روی «Google Firebase Firestore (آماده)» قرار گرفت.'
        : 'موتور همگام‌سازی ابری روی «Supabase PostgreSQL» قرار گرفت.'
    );
  };

  const handleSaveSupabaseConfig = async () => {
    setActionError(null);
    setActionMessage(null);
    const cleanUrl = sbUrlInput.trim();
    const cleanKey = sbKeyInput.trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      setActionError('لطفاً آدرس معتبر Project URL سوپابیس (شروع با https://) را وارد کنید.');
      return;
    }
    if (!cleanKey || cleanKey.length < 20) {
      setActionError('لطفاً کلید عمومی (anon / public key) پروژه سوپابیس را به صورت کامل وارد کنید.');
      return;
    }
    await firebaseCloudSync.setSupabaseCredentials(cleanUrl, cleanKey);
    setActionMessage('تنظیمات اتصال به پروژه Supabase ذخیره و بررسی شد.');
  };

  const handleCopySqlScript = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {}
  };

  const handleRecheckTableAfterSql = async () => {
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.recheckSupabaseTable();
    if (firebaseCloudSync.isReadOnlyObserver()) {
      const ok = await firebaseCloudSync.pullFromCloudNow();
      if (ok) {
        if (onDataSynced) await onDataSynced();
        setActionMessage('جدول martia_workspaces شناسایی شد و اطلاعات ابری دریافت گردید.');
        setShowSqlGuide(false);
      }
      return;
    }
    const ok = await firebaseCloudSync.pushToCloudNow();
    if (ok) {
      setActionMessage(
        'جدول martia_workspaces در پروژه Supabase شما شناسایی شد و اطلاعات شما با موفقیت ذخیره گردید!'
      );
      setShowSqlGuide(false);
    }
  };

  const handleSaveCollaboratorName = () => {
    firebaseCloudSync.setCollaboratorName(nameInput);
    setActionError(null);
    setActionMessage(`نام نمایشی شما در اتاق مشترک روی «${nameInput.trim() || 'کاربر ۱'}» ثبت شد.`);
  };

  const handleSaveWorkspaceId = async () => {
    setActionError(null);
    setActionMessage(null);
    if (workspaceInput.trim().length < 6) {
      setActionError('کد اتاق مشترک باید حداقل ۶ کاراکتر انگلیسی یا عدد باشد (مثلاً martia-shared-main).');
      return;
    }
    await firebaseCloudSync.setWorkspaceId(workspaceInput);
    setActionMessage(
      `کد اتاق مشترک ابری روی «${firebaseCloudSync.getStatus().workspaceId}» تنظیم و بررسی شد.`
    );
  };

  const handleCopyWorkspaceId = async () => {
    try {
      await navigator.clipboard.writeText(status.workspaceId);
      setCopiedWorkspace(true);
      setTimeout(() => setCopiedWorkspace(false), 2000);
    } catch {}
  };

  const handlePushNow = async () => {
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.setCollaboratorName(nameInput);
    const ok = await firebaseCloudSync.pushToCloudNow();
    if (ok) {
      setActionMessage(
        `تمامی اطلاعات شما با موفقیت در دیتابیس ابری (${
          status.provider === 'firebase' ? 'Firebase Firestore' : 'Supabase'
        }) ذخیره شد و هم‌اکنون در سایر دستگاه‌های این اتاق مشترک قابل مشاهده است.`
      );
    }
  };

  const handlePullNow = async () => {
    setActionError(null);
    setActionMessage(null);
    const ok = await firebaseCloudSync.pullFromCloudNow();
    if (ok) {
      if (onDataSynced) {
        await onDataSynced();
      }
      setActionMessage('آخرین اطلاعات ذخیره‌شده در دیتابیس ابری با موفقیت دریافت و جایگزین شد.');
    }
  };

  const handleSafetyBackupBeforeConflict = async () => {
    try {
      setActionError(null);
      const payload = await api.exportBackup();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MartiaPlanner-SafetyBackup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSafetyBackupDone(true);
      setActionMessage('نسخه پشتیبان احتیاطی (.json) از اطلاعات فعلی همین دستگاه ذخیره شد.');
    } catch (err: any) {
      setActionError(err.message || 'خطا در تهیه نسخه پشتیبان احتیاطی');
    }
  };

  const handleResolveConflict = async (
    action: 'smart_merge' | 'use_local' | 'use_remote' | 'cancel'
  ) => {
    setActionError(null);
    setActionMessage(null);
    const ok = await firebaseCloudSync.resolveConflictWithAction(action);
    if (action === 'cancel') {
      setActionMessage('اتصال ابری لغو شد و برنامه بدون هیچ تغییری در حالت آفلاین باقی ماند.');
      return;
    }
    if (ok) {
      if (onDataSynced) {
        await onDataSynced();
      }
      if (action === 'smart_merge') {
        setActionMessage(
          'اطلاعات محلی و ابری بدون ایجاد رکورد تکراری با موفقیت ادغام هوشمند و همگام‌سازی شدند!'
        );
      } else if (action === 'use_remote') {
        setActionMessage('اطلاعات موجود در ابر با موفقیت جایگزین نسخه محلی این دستگاه شد.');
      } else if (action === 'use_local') {
        setActionMessage('اطلاعات محلی این دستگاه با موفقیت در فضای ابری ذخیره و جایگزین شد.');
      }
    }
  };

  const handleDownloadStandaloneHtml = async (includeUserData: boolean) => {
    setActionError(null);
    setActionMessage(null);
    setHtmlDownloadLoading(includeUserData ? 'portable' : 'pure');
    try {
      const res = await downloadStandaloneAppHtml({ includeUserData });
      const sizeKb = Math.round(res.sizeBytes / 1024);
      setActionMessage(
        includeUserData
          ? `فایل مستقل HTML به‌همراه کل داده‌های فعلی شما (${res.fileName} — ${toPersianDigits(
              sizeKb
            )} کیلوبایت) بدون نیاز به سرور و کوکی آماده و دانلود شد.`
          : `فایل خالص و مستقل برنامه (${res.fileName} — ${toPersianDigits(
              sizeKb
            )} کیلوبایت) با تأیید سلامت بسته دانلود شد.`
      );
    } catch (err: any) {
      setActionError(err.message || 'خطا در آماده‌سازی فایل مستقل HTML');
    } finally {
      setHtmlDownloadLoading(null);
    }
  };

  const isObserver = status.connectionMode === 'cloud' && status.workspaceRole === 'observer';

  return (
    <div
      dir="rtl"
      className="rounded-3xl border-2 border-indigo-200/90 dark:border-indigo-900/70 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-5 sm:p-6 shadow-md space-y-5"
    >
      {/* =====================================================================
          1. INDEPENDENT OFFLINE VS CLOUD CONNECTION MODE SWITCHER
      ===================================================================== */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                status.connectionMode === 'offline'
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {status.connectionMode === 'offline' ? (
                <HardDrive className="w-5 h-5" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                اتصال به دیتابیس و شیوه ذخیره‌سازی اطلاعات
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                انتخاب کاملاً مستقل بین اجرای ۱۰۰٪ آفلاین روی دستگاه یا همگام‌سازی ابری بین چند دستگاه
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                status.connectionMode === 'offline'
                  ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                  : status.isConnected
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700'
                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status.connectionMode === 'offline'
                    ? 'bg-slate-500'
                    : status.isConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span>
                {status.connectionMode === 'offline'
                  ? 'حالت آفلاین فعال (بدون ارسال داده به بیرون)'
                  : status.isConnected
                  ? `متصل به ${status.provider === 'firebase' ? 'Firebase Firestore' : 'Supabase'}`
                  : status.provider === 'supabase' && status.needsSupabaseTableSetup
                  ? 'نیازمند اجرای ۱ بار اسکریپت ساخت جدول SQL'
                  : status.provider === 'supabase' && !status.isSupabaseConfigured
                  ? 'منتظر وارد کردن کلیدهای Supabase'
                  : !status.isNetworkOnline
                  ? 'آفلاین موقت (ذخیره در صف همگام‌سازی)'
                  : 'آماده اتصال ابری'}
              </span>
            </span>

            {status.connectionMode === 'cloud' && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  status.isNetworkOnline
                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {status.isNetworkOnline ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span>{status.isNetworkOnline ? 'اینترنت متصل' : 'قطع موقت اینترنت'}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2 Primary Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Mode 1: Personal Offline */}
          <button
            type="button"
            onClick={() => handleSelectConnectionMode('offline')}
            className={`text-right rounded-2xl border-2 p-4 transition-all cursor-pointer space-y-2 ${
              status.connectionMode === 'offline'
                ? 'border-indigo-600 bg-indigo-50/75 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    status.connectionMode === 'offline'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  استفاده شخصی (آفلاین)
                </span>
              </div>
              {status.connectionMode === 'offline' && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black">
                  انتخاب‌شده
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              اطلاعات فقط روی همین دستگاه ذخیره می‌شوند و برای استفاده از برنامه نیازی به اتصال اینترنت یا دیتابیس ابری ندارید.
            </p>
          </button>

          {/* Mode 2: Shared Cloud */}
          <button
            type="button"
            onClick={() => handleSelectConnectionMode('cloud')}
            className={`text-right rounded-2xl border-2 p-4 transition-all cursor-pointer space-y-2 ${
              status.connectionMode === 'cloud'
                ? 'border-emerald-600 bg-emerald-50/75 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    status.connectionMode === 'cloud'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  استفاده مشترک (دیتابیس ابری)
                </span>
              </div>
              {status.connectionMode === 'cloud' && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black">
                  انتخاب‌شده
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              اطلاعات شما در دیتابیس ابری ذخیره و بین دستگاه‌های متصل همگام‌سازی می‌شوند.
            </p>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2A. CALM OFFLINE MODE REASSURANCE CARD
      ===================================================================== */}
      {status.connectionMode === 'offline' && (
        <div className="rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1.5">
          <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>حافظه محلی ۱۰۰٪ مستقل بدون نیاز به اینترنت و سرویس ابری</span>
          </div>
          <p>
            در این حالت هیچ درخواستی به Firebase یا Supabase ارسال نمی‌شود. تمام عملیات ثبت، ویرایش، حذف، تحلیل دروس، امتیازهای XP، سطح ۳۹ مرحله‌ای و پشتیبان‌گیری بدون تأخیر و به‌صورت کاملاً محلی روی دستگاه شما اجرا می‌شوند و با خروج از برنامه محفوظ می‌مانند.
          </p>
        </div>
      )}

      {/* =====================================================================
          2B. CLOUD MODE CONTROLS (CONFLICT RESOLVER, ENGINE, ROLE, ROOM)
      ===================================================================== */}
      {status.connectionMode === 'cloud' && (
        <div className="space-y-5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          {/* Offline Queue Indicator */}
          {status.hasPendingOfflineChanges && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-200">
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  در صف همگام‌سازی — تغییرات محلی پس از برقراری اینترنت به‌صورت خودکار ارسال می‌شوند.
                </span>
              </div>
              {!isObserver && status.isNetworkOnline && (
                <button
                  type="button"
                  onClick={handlePushNow}
                  className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black cursor-pointer"
                >
                  ارسال فوری صف
                </button>
              )}
            </div>
          )}

          {/* Conflict Resolution Panel (when local & remote differ on connect) */}
          {status.pendingSyncConflict && (
            <div className="rounded-2xl bg-amber-50/95 dark:bg-amber-950/35 border-2 border-amber-400 dark:border-amber-700 p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-100">
                    شناسایی تفاوت بین داده‌های محلی دستگاه و فضای ابری (تعارض همگام‌سازی)
                  </h4>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    برای جلوگیری از حذف تصادفی یا تکرار اطلاعات، سیستم منتظر تصمیم شما است. پیش از انتخاب روش، می‌توانید با یک کلیک نسخه پشتیبان احتیاطی بگیرید.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 p-3 space-y-1">
                  <div className="font-black text-slate-900 dark:text-white">
                    نسخه فعلی همین دستگاه (محلی)
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 tabular-nums">
                    دروس: {toPersianDigits(status.pendingSyncConflict.diff.localSummary.subjectsCount)} | برنامه‌ها:{' '}
                    {toPersianDigits(status.pendingSyncConflict.diff.localSummary.plansCount)} | عملکرد:{' '}
                    {toPersianDigits(status.pendingSyncConflict.diff.localSummary.performancesCount)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    فقط در دستگاه: {toPersianDigits(status.pendingSyncConflict.diff.localOnlyPlansCount)} برنامه | آخرین تغییر:{' '}
                    {formatIsoTimestampFa(status.pendingSyncConflict.diff.localSummary.latestUpdatedAt)}
                  </div>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 p-3 space-y-1">
                  <div className="font-black text-emerald-700 dark:text-emerald-300">
                    نسخه فضای ابری ({status.pendingSyncConflict.remoteUpdatedByName} — نسخه #
                    {toPersianDigits(status.pendingSyncConflict.remoteRevision)})
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 tabular-nums">
                    دروس: {toPersianDigits(status.pendingSyncConflict.diff.remoteSummary.subjectsCount)} | برنامه‌ها:{' '}
                    {toPersianDigits(status.pendingSyncConflict.diff.remoteSummary.plansCount)} | عملکرد:{' '}
                    {toPersianDigits(status.pendingSyncConflict.diff.remoteSummary.performancesCount)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    فقط در ابر: {toPersianDigits(status.pendingSyncConflict.diff.remoteOnlyPlansCount)} برنامه | مشترک متفاوت:{' '}
                    {toPersianDigits(status.pendingSyncConflict.diff.bothDifferentPlansCount)} | آخرین تغییر:{' '}
                    {formatIsoTimestampFa(status.pendingSyncConflict.diff.remoteSummary.latestUpdatedAt)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSafetyBackupBeforeConflict}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-extrabold hover:bg-slate-100 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{safetyBackupDone ? 'بکاپ احتیاطی ذخیره شد ✓' : '۱. دانلود بکاپ احتیاطی (.json)'}</span>
                </button>

                <button
                  type="button"
                  disabled={status.isSyncing}
                  onClick={() => handleResolveConflict('smart_merge')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-xs"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>ادغام هوشمند بدون تکرار (پیشنهادی)</span>
                </button>

                <button
                  type="button"
                  disabled={status.isSyncing}
                  onClick={() => handleResolveConflict('use_remote')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer"
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>دریافت از ابر (جایگزینی محلی)</span>
                </button>

                <button
                  type="button"
                  disabled={status.isSyncing || isObserver}
                  onClick={() => handleResolveConflict('use_local')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-white text-xs font-extrabold cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>ارسال به ابر (جایگزینی ابری)</span>
                </button>

                <button
                  type="button"
                  disabled={status.isSyncing}
                  onClick={() => handleResolveConflict('cancel')}
                  className="px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100/70 cursor-pointer"
                >
                  لغو و بازگشت به آفلاین
                </button>
              </div>
            </div>
          )}

          {/* Dual Engine Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white">
                انتخاب موتور دیتابیس ابری (دو موتوره)
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                هر دو موتور از اتصال مستقیم با کد اتاق مشترک بدون نیاز به پاپ‌آپ لاگین جیمیل روی اندروید (.apk)، ویندوز (.exe) و وب پشتیبانی می‌کنند.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => handleSelectProvider('firebase')}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  status.provider === 'firebase'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Cloud className="w-4 h-4 shrink-0" />
                <span>۱. Firebase (آماده)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider('supabase')}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  status.provider === 'supabase'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <span>۲. Supabase (انتخابی)</span>
              </button>
            </div>
          </div>

          {/* Role Selector (Owner / Student / Observer) */}
          <div className="space-y-2">
            <div className="text-xs font-black text-slate-900 dark:text-white">
              تعیین نقش این دستگاه در فضای مشترک (سناریوی دانش‌آموز و نظارت والدین):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {ROLE_OPTIONS.map((roleOpt) => {
                const IconComp = roleOpt.icon;
                const active = status.workspaceRole === roleOpt.id;
                return (
                  <button
                    key={roleOpt.id}
                    type="button"
                    onClick={() => handleSelectRole(roleOpt.id)}
                    className={`text-right rounded-2xl border p-3 transition-all cursor-pointer space-y-1 ${
                      active
                        ? roleOpt.id === 'observer'
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/35 dark:border-amber-600 shadow-xs'
                          : 'border-indigo-500 bg-indigo-50/75 dark:bg-indigo-950/35 dark:border-indigo-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                        <IconComp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>{roleOpt.title}</span>
                      </span>
                      {active && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {roleOpt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Supabase Configuration Box */}
          {status.provider === 'supabase' && (
            <div className="rounded-2xl bg-emerald-950/5 dark:bg-emerald-950/30 border-2 border-emerald-400/60 dark:border-emerald-700/70 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تنظیمات اتصال مستقیم به پروژه Supabase شما</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlGuide((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold hover:bg-emerald-50 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>راهنمای ۱ دقیقه‌ای و اسکریپت ساخت جدول SQL در Supabase</span>
                  {showSqlGuide ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    آدرس پروژه (Supabase Project URL)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={sbUrlInput}
                    onChange={(e) => setSbUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    کلید عمومی پروژه (Supabase Anon / Public Key)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={sbKeyInput}
                    onChange={(e) => setSbKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  این مقادیر را از پنل Supabase خود در مسیر{' '}
                  <code className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    Project Settings → API
                  </code>{' '}
                  کپی کنید.
                </p>
                <button
                  type="button"
                  onClick={handleSaveSupabaseConfig}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
                >
                  ذخیره و فعال‌سازی اتصال Supabase
                </button>
              </div>

              {(showSqlGuide || status.needsSupabaseTableSetup) && (
                <div className="rounded-2xl bg-slate-950 text-slate-100 p-4 border-2 border-amber-500/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-amber-300">
                      گام نهایی (فقط ۱ بار): کد SQL زیر را کپی کرده و در صفحه SQL Editor پروژه Supabase خود Paste و Run کنید:
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySqlScript}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                      >
                        {copiedSql ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>کپی شد!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>۱. کپی کد SQL ساخت جدول</span>
                          </>
                        )}
                      </button>

                      <a
                        href={supabaseSqlEditorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
                      >
                        <span>۲. باز کردن مستقیم SQL Editor سوپابیس</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={handleRecheckTableAfterSql}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>۳. اجرا کردم — بررسی و اتصال</span>
                      </button>
                    </div>
                  </div>
                  <pre
                    dir="ltr"
                    className="text-[11px] font-mono text-emerald-200 bg-slate-900/90 p-3 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed"
                  >
                    {SUPABASE_SETUP_SQL_SCRIPT}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Workspace Room ID & Sync Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-4 space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>نام شما در اتاق مشترک (مثلاً: دانش‌آموز / والدین / مشاور)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="مثلاً: دانش‌آموز"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCollaboratorName}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    ثبت نام
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-200/70 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>کد اتاق مشترک (Shared Workspace ID)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {status.workspaceId}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={workspaceInput}
                    onChange={(e) => setWorkspaceInput(e.target.value)}
                    placeholder="martia-shared-main"
                    className="flex-1 min-w-[160px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWorkspaceId}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    تغییر اتاق
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyWorkspaceId}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                    title="کپی کد اتاق مشترک"
                  >
                    {copiedWorkspace ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی کد</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-4 flex flex-col justify-between space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={status.autoSyncEnabled}
                    onChange={(e) => firebaseCloudSync.setAutoSyncEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    همگام‌سازی خودکار و زنده ({status.provider === 'firebase' ? 'Firebase' : 'Supabase'})
                  </span>
                </label>

                {status.syncRevision > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    نسخه ابری: #{toPersianDigits(status.syncRevision)}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
                {status.lastUpdatedByName && (
                  <div>
                    آخرین تغییر ثبت‌شده در ابر توسط:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      {status.lastUpdatedByName}
                    </strong>
                    {status.lastSyncedAt && (
                      <span className="mr-1.5 text-slate-400 tabular-nums">
                        ({formatIsoTimestampFa(status.lastSyncedAt)})
                      </span>
                    )}
                  </div>
                )}
                {isObserver ? (
                  <div className="text-amber-700 dark:text-amber-300 font-bold">
                    حالت ناظر فقط‌خواندنی (والدین/مشاور) فعال است: تمام تغییرات دانش‌آموز به‌صورت زنده دریافت می‌شود اما دکمه ارسال (Push) قفل شده است.
                  </div>
                ) : !status.lastUpdatedByName ? (
                  <div>
                    کافی است دستگاه دانش‌آموز یک بار دکمه سبز <strong>«ارسال فوری اطلاعات به ابر (Push)»</strong> را بزند؛ از آن لحظه به بعد، تمام تغییرات بین گوشی و ویندوز همگام می‌شود.
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={status.isSyncing || isObserver}
                  onClick={handlePushNow}
                  title={isObserver ? 'در نقش ناظر فقط‌خواندنی امکان ارسال به ابر وجود ندارد' : undefined}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                >
                  {status.isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>{isObserver ? 'ارسال قفل (نقش ناظر)' : 'ارسال فوری به ابر (Push)'}</span>
                </button>

                <button
                  type="button"
                  disabled={status.isSyncing}
                  onClick={handlePullNow}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>دریافت از ابر (Pull)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. STANDALONE PORTABLE HTML EXPORT (AUTHENTICATED BLOB DOWNLOAD)
      ===================================================================== */}
      <div className="rounded-2xl bg-indigo-50/75 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-800/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">
            <FileCode2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>خروجی مستقل و آفلاین HTML (نسخه v{APP_VERSION} — با دانلود تأییدشده بدون خطای کوکی)</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            اجرا در مرورگر بدون سرور
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          بسته تک‌فایل با روش دانلود امن درون‌برنامه‌ای (Blob) تولید و بررسی می‌شود تا صفحه خطای کوکی میزبانی جایگزین فایل نشود. گزینه دوم، کل برنامه‌ها، دروس و XP فعلی شما را درون خود فایل HTML تعبیه می‌کند تا در هر گوشی یا کامپیوتر دیگر دقیقاً با همین داده‌ها باز شود.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={htmlDownloadLoading !== null}
            onClick={() => handleDownloadStandaloneHtml(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            {htmlDownloadLoading === 'pure' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>دانلود برنامه خام مستقل (.html)</span>
          </button>

          <button
            type="button"
            disabled={htmlDownloadLoading !== null}
            onClick={() => handleDownloadStandaloneHtml(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            {htmlDownloadLoading === 'portable' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>دانلود نسخه قابل‌حمل همراه با داده‌های فعلی (.html)</span>
          </button>
        </div>

        {(storageDiag.isStandaloneSingleFile || !storageDiag.isLocalStoragePersistent) && (
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            {storageDiag.isContentUri || !storageDiag.isLocalStoragePersistent
              ? 'نکته مرورگر در اجرای فایل محلی: در بازکردن مستقیم از مسیر فایل/محتوا (content:// یا مرورگر محدود)، ذخیره خودکار ممکن است محدود به نشست فعلی باشد؛ برای نگهداری همیشگی، از «نسخه همراه با داده‌های فعلی» یا «فایل پشتیبان (.json)» استفاده کنید.'
              : 'این نسخه هم‌اکنون به‌صورت فایل HTML مستقل اجرا شده و اطلاعات آن در حافظه مرورگر (file://) ذخیره می‌شود.'}
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {(actionMessage || (status.connectionMode === 'cloud' && status.errorMessage) || actionError) && (
        <div className="space-y-2">
          {actionMessage && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-3.5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}
          {(actionError || (status.connectionMode === 'cloud' && status.errorMessage)) && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-3.5 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{actionError || status.errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
