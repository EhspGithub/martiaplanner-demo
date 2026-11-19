import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage.ts';
import {
  inspectWorkspaceSyncDiff,
  smartMergeBackupPayloads,
  type WorkspaceDiffReport,
} from './mergePayloads.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || getOrCreateDeviceUid(),
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous ?? true,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  return errInfo;
}

async function testConnection() {
  if (currentStatus.connectionMode !== 'cloud' || currentStatus.provider !== 'firebase') {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Silent fallback when client is offline
  }
}

export type ConnectionModeType = 'offline' | 'cloud';
export type CloudProviderType = 'firebase' | 'supabase';
export type WorkspaceRoleType = 'owner' | 'student' | 'observer';

const CONNECTION_MODE_STORAGE_KEY = 'martia_connection_mode_v1';
const WORKSPACE_ROLE_STORAGE_KEY = 'martia_workspace_role_v1';
const CLOUD_PROVIDER_STORAGE_KEY = 'martia_cloud_provider_v1';
const SUPABASE_URL_STORAGE_KEY = 'martia_supabase_url_v1';
const SUPABASE_ANON_KEY_STORAGE_KEY = 'martia_supabase_anon_key_v1';
const WORKSPACE_ID_STORAGE_KEY = 'martia_cloud_workspace_id_v1';
const AUTO_SYNC_STORAGE_KEY = 'martia_cloud_auto_sync_v1';
const DEVICE_UID_STORAGE_KEY = 'martia_cloud_device_uid_v1';
const COLLABORATOR_NAME_STORAGE_KEY = 'martia_cloud_collaborator_name_v1';
const PENDING_OFFLINE_SYNC_KEY = 'martia_pending_offline_sync_v1';
const DEFAULT_WORKSPACE_ID = 'martia-shared-main';

export const SUPABASE_SETUP_SQL_SCRIPT = `-- اسکریپت ساخت جدول فضای کاری مشترک در Supabase (فقط یک بار در SQL Editor اجرا شود)
CREATE TABLE IF NOT EXISTS public.martia_workspaces (
  workspace_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  last_updated_by_uid TEXT NOT NULL,
  last_updated_by_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.martia_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace read and upsert by workspace_id" ON public.martia_workspaces;
CREATE POLICY "Allow workspace read and upsert by workspace_id"
  ON public.martia_workspaces
  FOR ALL
  USING (char_length(workspace_id) >= 6)
  WITH CHECK (char_length(workspace_id) >= 6);

GRANT ALL ON TABLE public.martia_workspaces TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';`;

export function extractSupabaseProjectRef(supabaseUrl: string): string | null {
  const match = supabaseUrl.trim().match(/^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i);
  return match ? match[1] : null;
}

function getOrCreateDeviceUid(): string {
  if (typeof window === 'undefined') return 'device-server';
  const existing = safeGetItem(DEVICE_UID_STORAGE_KEY);
  if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) {
    return existing;
  }
  const generated = `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  safeSetItem(DEVICE_UID_STORAGE_KEY, generated);
  return generated;
}

function getStoredConnectionMode(): ConnectionModeType {
  if (typeof window === 'undefined') return 'offline';
  const val = safeGetItem(CONNECTION_MODE_STORAGE_KEY);
  if (val === 'cloud' || val === 'offline') return val;
  return 'offline';
}

function getStoredWorkspaceRole(): WorkspaceRoleType {
  if (typeof window === 'undefined') return 'owner';
  const val = safeGetItem(WORKSPACE_ROLE_STORAGE_KEY);
  if (val === 'owner' || val === 'student' || val === 'observer') return val;
  return 'owner';
}

function getStoredProvider(): CloudProviderType {
  if (typeof window === 'undefined') return 'firebase';
  const val = safeGetItem(CLOUD_PROVIDER_STORAGE_KEY);
  if (val === 'supabase' || val === 'firebase') return val;
  return 'firebase';
}

function getStoredSupabaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  if (typeof window === 'undefined') return envUrl;
  return (safeGetItem(SUPABASE_URL_STORAGE_KEY) || envUrl || '').trim();
}

function getStoredSupabaseAnonKey(): string {
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  if (typeof window === 'undefined') return envKey;
  return (safeGetItem(SUPABASE_ANON_KEY_STORAGE_KEY) || envKey || '').trim();
}

function getStoredCollaboratorName(): string {
  if (typeof window === 'undefined') return 'کاربر ۱';
  const val = safeGetItem(COLLABORATOR_NAME_STORAGE_KEY)?.trim();
  if (val) return val.slice(0, 60);
  return 'کاربر ۱';
}

function getStoredWorkspaceId(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_ID;
  const val = safeGetItem(WORKSPACE_ID_STORAGE_KEY)?.trim();
  if (val && /^[a-zA-Z0-9_-]{6,128}$/.test(val)) {
    return val;
  }
  return DEFAULT_WORKSPACE_ID;
}

function getStoredAutoSync(): boolean {
  if (typeof window === 'undefined') return true;
  const val = safeGetItem(AUTO_SYNC_STORAGE_KEY);
  if (val === '0') return false;
  return true;
}

function getStoredPendingOfflineSync(): boolean {
  if (typeof window === 'undefined') return false;
  return safeGetItem(PENDING_OFFLINE_SYNC_KEY) === '1';
}

function sanitizeWorkspaceId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (cleaned.length < 6) {
    return DEFAULT_WORKSPACE_ID;
  }
  return cleaned;
}

function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

export interface CloudSyncConflictInfo {
  workspaceId: string;
  provider: CloudProviderType;
  remoteRevision: number;
  remoteUpdatedByName: string;
  remotePayload: any;
  localPayload: any;
  diff: WorkspaceDiffReport;
}

export interface CloudSyncStatus {
  connectionMode: ConnectionModeType;
  workspaceRole: WorkspaceRoleType;
  provider: CloudProviderType;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  needsSupabaseTableSetup: boolean;
  isConnected: boolean;
  isNetworkOnline: boolean;
  hasPendingOfflineChanges: boolean;
  pendingSyncConflict: CloudSyncConflictInfo | null;
  deviceUid: string;
  collaboratorName: string;
  workspaceId: string;
  autoSyncEnabled: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastUpdatedByName: string | null;
  syncRevision: number;
  errorMessage: string | null;
}

type StatusListener = (status: CloudSyncStatus) => void;
type RemotePayloadApplyHandler = (payload: any) => Promise<void>;
type LocalPayloadExportHandler = () => Promise<any>;

const initSbUrl = getStoredSupabaseUrl();
const initSbKey = getStoredSupabaseAnonKey();

let currentStatus: CloudSyncStatus = {
  connectionMode: getStoredConnectionMode(),
  workspaceRole: getStoredWorkspaceRole(),
  provider: getStoredProvider(),
  supabaseUrl: initSbUrl,
  supabaseAnonKey: initSbKey,
  isSupabaseConfigured: Boolean(initSbUrl && initSbKey),
  needsSupabaseTableSetup: false,
  isConnected: false,
  isNetworkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hasPendingOfflineChanges: getStoredPendingOfflineSync(),
  pendingSyncConflict: null,
  deviceUid: getOrCreateDeviceUid(),
  collaboratorName: getStoredCollaboratorName(),
  workspaceId: getStoredWorkspaceId(),
  autoSyncEnabled: getStoredAutoSync(),
  isSyncing: false,
  lastSyncedAt: null,
  lastUpdatedByName: null,
  syncRevision: 0,
  errorMessage: null,
};

const statusListeners = new Set<StatusListener>();
let activeSnapshotUnsubscribe: Unsubscribe | null = null;
let supabasePollTimer: ReturnType<typeof setInterval> | null = null;
let remotePayloadHandler: RemotePayloadApplyHandler | null = null;
let localExportHandler: LocalPayloadExportHandler | null = null;
let isApplyingRemoteSnapshot = false;
let lastAppliedPayloadHash = '';
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function notifyStatusListeners() {
  const snapshot = { ...currentStatus };
  statusListeners.forEach((cb) => cb(snapshot));
}

function updateStatus(partial: Partial<CloudSyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifyStatusListeners();
}

function setPendingOfflineFlag(pending: boolean) {
  if (pending) {
    safeSetItem(PENDING_OFFLINE_SYNC_KEY, '1');
  } else {
    safeRemoveItem(PENDING_OFFLINE_SYNC_KEY);
  }
  updateStatus({ hasPendingOfflineChanges: pending });
}

function stopActiveListeners() {
  if (activeSnapshotUnsubscribe) {
    activeSnapshotUnsubscribe();
    activeSnapshotUnsubscribe = null;
  }
  if (supabasePollTimer) {
    clearInterval(supabasePollTimer);
    supabasePollTimer = null;
  }
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
}

async function applyIncomingPayloadString(
  payloadJson: string,
  incomingRev: number,
  updatedByName: string
) {
  updateStatus({
    isConnected: true,
    needsSupabaseTableSetup: false,
    syncRevision: incomingRev,
    lastUpdatedByName: updatedByName,
    lastSyncedAt: new Date().toISOString(),
    errorMessage: null,
  });

  if (payloadJson === lastAppliedPayloadHash) {
    return;
  }

  if (remotePayloadHandler) {
    try {
      isApplyingRemoteSnapshot = true;
      lastAppliedPayloadHash = payloadJson;
      const parsedPayload = JSON.parse(payloadJson);
      await remotePayloadHandler(parsedPayload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('martia:cloud-sync-updated'));
      }
    } catch {
      // Ignore malformed payload
    } finally {
      isApplyingRemoteSnapshot = false;
    }
  }
}

interface RemoteWorkspacePeek {
  exists: boolean;
  payloadJson: string | null;
  parsedPayload: any | null;
  syncRevision: number;
  lastUpdatedByName: string;
  needsSupabaseTableSetup?: boolean;
  error?: string;
}

async function fetchRemoteWorkspaceRaw(
  wsId: string,
  provider: CloudProviderType
): Promise<RemoteWorkspacePeek> {
  if (provider === 'supabase') {
    if (!currentStatus.isSupabaseConfigured) {
      return {
        exists: false,
        payloadJson: null,
        parsedPayload: null,
        syncRevision: 0,
        lastUpdatedByName: '',
        error: 'تنظیمات Supabase وارد نشده است.',
      };
    }
    const baseUrl = normalizeSupabaseUrl(currentStatus.supabaseUrl);
    const anonKey = currentStatus.supabaseAnonKey.trim();
    try {
      const res = await fetch(
        `${baseUrl}/rest/v1/martia_workspaces?workspace_id=eq.${encodeURIComponent(
          wsId
        )}&select=*`,
        {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        const isMissingTable =
          errText.includes('PGRST205') || errText.includes('martia_workspaces');
        return {
          exists: false,
          payloadJson: null,
          parsedPayload: null,
          syncRevision: 0,
          lastUpdatedByName: '',
          needsSupabaseTableSetup: isMissingTable,
          error: isMissingTable
            ? 'جدول martia_workspaces در Supabase ساخته نشده است.'
            : `خطا در ارتباط با Supabase (کد ${res.status}).`,
        };
      }
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0 || !rows[0].payload_json) {
        return {
          exists: false,
          payloadJson: null,
          parsedPayload: null,
          syncRevision: 0,
          lastUpdatedByName: '',
        };
      }
      const row = rows[0];
      let parsed: any = null;
      try {
        parsed = JSON.parse(row.payload_json);
      } catch {
        parsed = null;
      }
      return {
        exists: Boolean(parsed),
        payloadJson: row.payload_json,
        parsedPayload: parsed,
        syncRevision: typeof row.sync_revision === 'number' ? row.sync_revision : 1,
        lastUpdatedByName: row.last_updated_by_name || 'کاربر همکار',
      };
    } catch {
      return {
        exists: false,
        payloadJson: null,
        parsedPayload: null,
        syncRevision: 0,
        lastUpdatedByName: '',
        error: 'عدم دسترسی به سرور Supabase.',
      };
    }
  }

  // Firebase Firestore
  const docPath = `workspaces/${wsId}`;
  const docRef = doc(db, 'workspaces', wsId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return {
        exists: false,
        payloadJson: null,
        parsedPayload: null,
        syncRevision: 0,
        lastUpdatedByName: '',
      };
    }
    const data = snap.data();
    if (!data || typeof data.payloadJson !== 'string') {
      return {
        exists: false,
        payloadJson: null,
        parsedPayload: null,
        syncRevision: 0,
        lastUpdatedByName: '',
      };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(data.payloadJson);
    } catch {
      parsed = null;
    }
    return {
      exists: Boolean(parsed),
      payloadJson: data.payloadJson,
      parsedPayload: parsed,
      syncRevision: typeof data.syncRevision === 'number' ? data.syncRevision : 1,
      lastUpdatedByName: data.lastUpdatedByName || 'کاربر همکار',
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
    return {
      exists: false,
      payloadJson: null,
      parsedPayload: null,
      syncRevision: 0,
      lastUpdatedByName: '',
      error: 'عدم دسترسی به سرور Firebase.',
    };
  }
}

async function pushToFirebaseFirestoreInternal(
  wsId: string,
  deviceUid: string,
  displayName: string,
  serialized: string
): Promise<{ ok: boolean; revision: number }> {
  const docPath = `workspaces/${wsId}`;
  const docRef = doc(db, 'workspaces', wsId);

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        workspaceId: wsId,
        ownerId: deviceUid,
        lastUpdatedByUid: deviceUid,
        lastUpdatedByName: displayName,
        payloadJson: serialized,
        syncRevision: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ok: true, revision: 1 };
    } else {
      const existingData = existingSnap.data();
      const nextRev =
        (typeof existingData?.syncRevision === 'number' ? existingData.syncRevision : 1) + 1;
      await updateDoc(docRef, {
        lastUpdatedByUid: deviceUid,
        lastUpdatedByName: displayName,
        payloadJson: serialized,
        syncRevision: nextRev,
        updatedAt: serverTimestamp(),
      });
      return { ok: true, revision: nextRev };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return { ok: false, revision: currentStatus.syncRevision };
  }
}

async function pollSupabaseWorkspaceOnce() {
  if (
    currentStatus.connectionMode !== 'cloud' ||
    currentStatus.provider !== 'supabase' ||
    !currentStatus.autoSyncEnabled ||
    !currentStatus.isSupabaseConfigured ||
    currentStatus.needsSupabaseTableSetup ||
    currentStatus.pendingSyncConflict ||
    isApplyingRemoteSnapshot
  ) {
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateStatus({ isConnected: false, isNetworkOnline: false });
    return;
  }

  const baseUrl = normalizeSupabaseUrl(currentStatus.supabaseUrl);
  const anonKey = currentStatus.supabaseAnonKey.trim();
  const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);

  try {
    const metaUrl = `${baseUrl}/rest/v1/martia_workspaces?workspace_id=eq.${encodeURIComponent(
      wsId
    )}&select=workspace_id,sync_revision,last_updated_by_name,updated_at`;

    const res = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes('PGRST205') || errText.includes('martia_workspaces')) {
        updateStatus({
          isConnected: false,
          needsSupabaseTableSetup: true,
          errorMessage:
            'برای تکمیل اتصال Supabase، فقط یک بار کد SQL زیر را کپی کرده و در بخش SQL Editor پروژه Supabase خود Run کنید (سپس دکمه بررسی مجدد را بزنید).',
        });
      } else {
        updateStatus({
          isConnected: false,
          errorMessage: `خطا در ارتباط با Supabase (کد ${res.status}). لطفاً Project URL و Anon Key را بررسی کنید.`,
        });
      }
      return;
    }

    const rows = await res.json();
    updateStatus({
      isConnected: true,
      needsSupabaseTableSetup: false,
      errorMessage: null,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const meta = rows[0];
    const remoteRev = typeof meta.sync_revision === 'number' ? meta.sync_revision : 1;

    if (remoteRev !== currentStatus.syncRevision || !lastAppliedPayloadHash) {
      const fullUrl = `${baseUrl}/rest/v1/martia_workspaces?workspace_id=eq.${encodeURIComponent(
        wsId
      )}&select=*`;
      const fullRes = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: 'application/json',
        },
      });
      if (!fullRes.ok) return;
      const fullRows = await fullRes.json();
      if (Array.isArray(fullRows) && fullRows.length > 0 && fullRows[0].payload_json) {
        await applyIncomingPayloadString(
          fullRows[0].payload_json,
          remoteRev,
          fullRows[0].last_updated_by_name || 'کاربر همکار'
        );
      }
    }
  } catch {
    updateStatus({
      isConnected: false,
      errorMessage: 'عدم دسترسی به سرور Supabase. اتصال اینترنت یا آدرس پروژه را بررسی کنید.',
    });
  }
}

function startRealtimeWorkspaceSubscription() {
  stopActiveListeners();

  // STRICT OFFLINE GUARANTEE: zero background calls or listeners in offline mode
  if (
    typeof window === 'undefined' ||
    currentStatus.connectionMode !== 'cloud' ||
    !currentStatus.autoSyncEnabled ||
    currentStatus.pendingSyncConflict
  ) {
    updateStatus({ isConnected: false });
    return;
  }

  if (currentStatus.provider === 'supabase') {
    if (!currentStatus.isSupabaseConfigured) {
      updateStatus({
        isConnected: false,
        errorMessage: null,
      });
      return;
    }
    void pollSupabaseWorkspaceOnce();
    supabasePollTimer = setInterval(() => {
      void pollSupabaseWorkspaceOnce();
    }, 5000);
    return;
  }

  // Provider: Firebase Firestore
  void testConnection();
  const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
  const docPath = `workspaces/${wsId}`;
  const docRef = doc(db, 'workspaces', wsId);

  activeSnapshotUnsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      updateStatus({ isConnected: true, errorMessage: null });

      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data();
      if (!data || typeof data.payloadJson !== 'string') return;

      const incomingRev = typeof data.syncRevision === 'number' ? data.syncRevision : 1;
      const updatedByName =
        typeof data.lastUpdatedByName === 'string' ? data.lastUpdatedByName : 'کاربر همکار';

      await applyIncomingPayloadString(data.payloadJson, incomingRev, updatedByName);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, docPath);
      updateStatus({
        isConnected: false,
        errorMessage:
          'خطا در اتصال زنده به دیتابیس ابری Firebase. اطلاعات محلی شما محفوظ است و در حالت Supabase یا پس از اتصال اینترنت همگام می‌شود.',
      });
    }
  );
}

// Network online/offline listeners for Automatic Offline Queue Sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateStatus({ isNetworkOnline: true });
    if (currentStatus.connectionMode === 'cloud') {
      if (
        currentStatus.hasPendingOfflineChanges &&
        !firebaseCloudSync.isReadOnlyObserver() &&
        !currentStatus.pendingSyncConflict
      ) {
        void firebaseCloudSync.pushToCloudNow();
      }
      startRealtimeWorkspaceSubscription();
    }
  });

  window.addEventListener('offline', () => {
    updateStatus({ isNetworkOnline: false, isConnected: false });
  });
}

export const firebaseCloudSync = {
  registerDataBridge(
    exportFn: LocalPayloadExportHandler,
    applyRemoteFn: RemotePayloadApplyHandler
  ) {
    localExportHandler = exportFn;
    remotePayloadHandler = applyRemoteFn;
    if (typeof window !== 'undefined' && currentStatus.connectionMode === 'cloud') {
      startRealtimeWorkspaceSubscription();
      if (
        currentStatus.hasPendingOfflineChanges &&
        navigator.onLine &&
        !this.isReadOnlyObserver()
      ) {
        void this.pushToCloudNow();
      }
    }
  },

  getStatus(): CloudSyncStatus {
    return { ...currentStatus };
  },

  isReadOnlyObserver(): boolean {
    return (
      currentStatus.connectionMode === 'cloud' &&
      currentStatus.workspaceRole === 'observer'
    );
  },

  subscribeStatus(listener: StatusListener): () => void {
    statusListeners.add(listener);
    listener({ ...currentStatus });
    return () => {
      statusListeners.delete(listener);
    };
  },

  async setConnectionMode(mode: ConnectionModeType): Promise<void> {
    safeSetItem(CONNECTION_MODE_STORAGE_KEY, mode);
    if (mode === 'offline') {
      stopActiveListeners();
      updateStatus({
        connectionMode: 'offline',
        isConnected: false,
        pendingSyncConflict: null,
        errorMessage: null,
      });
      return;
    }

    lastAppliedPayloadHash = '';
    updateStatus({
      connectionMode: 'cloud',
      isConnected: false,
      pendingSyncConflict: null,
      errorMessage: null,
    });

    await this.inspectAndConnectCloudWorkspace();
  },

  setWorkspaceRole(role: WorkspaceRoleType) {
    safeSetItem(WORKSPACE_ROLE_STORAGE_KEY, role);
    updateStatus({
      workspaceRole: role,
      errorMessage: null,
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('martia:cloud-role-changed', { detail: { role } }));
    }
  },

  async inspectAndConnectCloudWorkspace(): Promise<void> {
    if (currentStatus.connectionMode !== 'cloud') return;
    if (currentStatus.provider === 'supabase' && !currentStatus.isSupabaseConfigured) {
      updateStatus({ isConnected: false, errorMessage: null });
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateStatus({
        isNetworkOnline: false,
        isConnected: false,
        errorMessage:
          'اتصال اینترنت برقرار نیست؛ برنامه به‌صورت موقت روی حافظه محلی کار می‌کند و پس از اتصال، تغییرات همگام می‌شوند.',
      });
      return;
    }

    if (!localExportHandler) {
      startRealtimeWorkspaceSubscription();
      return;
    }

    updateStatus({ isSyncing: true, errorMessage: null });
    try {
      const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
      const [localPayload, remote] = await Promise.all([
        localExportHandler(),
        fetchRemoteWorkspaceRaw(wsId, currentStatus.provider),
      ]);

      if (remote.needsSupabaseTableSetup) {
        updateStatus({
          isSyncing: false,
          isConnected: false,
          needsSupabaseTableSetup: true,
          errorMessage: remote.error || null,
        });
        return;
      }

      if (remote.error) {
        updateStatus({
          isSyncing: false,
          isConnected: false,
          errorMessage: remote.error,
        });
        return;
      }

      if (!remote.exists || !remote.parsedPayload || !remote.payloadJson) {
        updateStatus({ isSyncing: false, pendingSyncConflict: null });
        startRealtimeWorkspaceSubscription();
        return;
      }

      const diff = inspectWorkspaceSyncDiff(localPayload, remote.parsedPayload);
      if (diff.isIdentical) {
        lastAppliedPayloadHash = remote.payloadJson;
        updateStatus({
          isSyncing: false,
          isConnected: true,
          pendingSyncConflict: null,
          syncRevision: remote.syncRevision,
          lastUpdatedByName: remote.lastUpdatedByName,
          lastSyncedAt: new Date().toISOString(),
        });
        startRealtimeWorkspaceSubscription();
        return;
      }

      // Data differs between Local and Cloud: pause & let user choose safely
      stopActiveListeners();
      updateStatus({
        isSyncing: false,
        isConnected: true,
        pendingSyncConflict: {
          workspaceId: wsId,
          provider: currentStatus.provider,
          remoteRevision: remote.syncRevision,
          remoteUpdatedByName: remote.lastUpdatedByName,
          remotePayload: remote.parsedPayload,
          localPayload,
          diff,
        },
      });
    } catch {
      updateStatus({ isSyncing: false });
      startRealtimeWorkspaceSubscription();
    }
  },

  async resolveConflictWithAction(
    action: 'smart_merge' | 'use_local' | 'use_remote' | 'cancel'
  ): Promise<boolean> {
    const conflict = currentStatus.pendingSyncConflict;
    if (!conflict) return true;

    if (action === 'cancel') {
      updateStatus({ pendingSyncConflict: null });
      await this.setConnectionMode('offline');
      return false;
    }

    updateStatus({ isSyncing: true, errorMessage: null });

    try {
      if (action === 'use_remote') {
        const serialized = JSON.stringify(conflict.remotePayload);
        await applyIncomingPayloadString(
          serialized,
          conflict.remoteRevision,
          conflict.remoteUpdatedByName
        );
        setPendingOfflineFlag(false);
        updateStatus({ pendingSyncConflict: null, isSyncing: false });
        startRealtimeWorkspaceSubscription();
        return true;
      }

      if (action === 'use_local') {
        if (this.isReadOnlyObserver()) {
          updateStatus({
            isSyncing: false,
            errorMessage: 'در نقش ناظر فقط‌خواندنی امکان ارسال و جایگزینی اطلاعات ابر وجود ندارد.',
          });
          return false;
        }
        updateStatus({ pendingSyncConflict: null });
        const pushed = await this.pushToCloudNow();
        startRealtimeWorkspaceSubscription();
        return pushed;
      }

      // smart_merge
      const mergedResult = smartMergeBackupPayloads(
        conflict.localPayload,
        conflict.remotePayload
      );
      if (remotePayloadHandler) {
        isApplyingRemoteSnapshot = true;
        try {
          await remotePayloadHandler(mergedResult.mergedPayload);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('martia:cloud-sync-updated'));
          }
        } finally {
          isApplyingRemoteSnapshot = false;
        }
      }
      updateStatus({ pendingSyncConflict: null });
      if (!this.isReadOnlyObserver()) {
        await this.pushToCloudNow();
      } else {
        lastAppliedPayloadHash = JSON.stringify(mergedResult.mergedPayload);
      }
      startRealtimeWorkspaceSubscription();
      updateStatus({ isSyncing: false });
      return true;
    } catch {
      updateStatus({
        isSyncing: false,
        errorMessage: 'خطا در حل تعارض و همگام‌سازی داده‌ها.',
      });
      return false;
    }
  },

  async setProvider(provider: CloudProviderType) {
    safeSetItem(CLOUD_PROVIDER_STORAGE_KEY, provider);
    lastAppliedPayloadHash = '';
    updateStatus({
      provider,
      isConnected: false,
      needsSupabaseTableSetup: false,
      pendingSyncConflict: null,
      syncRevision: 0,
      errorMessage: null,
    });
    if (currentStatus.connectionMode === 'cloud') {
      await this.inspectAndConnectCloudWorkspace();
    }
  },

  async setSupabaseCredentials(url: string, anonKey: string) {
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = anonKey.trim();
    safeSetItem(SUPABASE_URL_STORAGE_KEY, cleanUrl);
    safeSetItem(SUPABASE_ANON_KEY_STORAGE_KEY, cleanKey);
    const configured = Boolean(cleanUrl && cleanKey);
    lastAppliedPayloadHash = '';
    updateStatus({
      supabaseUrl: cleanUrl,
      supabaseAnonKey: cleanKey,
      isSupabaseConfigured: configured,
      needsSupabaseTableSetup: false,
      pendingSyncConflict: null,
      isConnected: false,
      errorMessage: null,
    });
    if (currentStatus.connectionMode === 'cloud' && currentStatus.provider === 'supabase') {
      await this.inspectAndConnectCloudWorkspace();
    }
  },

  recheckSupabaseTable() {
    updateStatus({
      needsSupabaseTableSetup: false,
      errorMessage: null,
    });
    if (currentStatus.connectionMode === 'cloud') {
      startRealtimeWorkspaceSubscription();
    }
  },

  setCollaboratorName(name: string) {
    const cleanName = (name.trim() || 'کاربر ۱').slice(0, 60);
    safeSetItem(COLLABORATOR_NAME_STORAGE_KEY, cleanName);
    updateStatus({ collaboratorName: cleanName });
  },

  async setWorkspaceId(newWorkspaceId: string) {
    const cleanId = sanitizeWorkspaceId(newWorkspaceId);
    safeSetItem(WORKSPACE_ID_STORAGE_KEY, cleanId);
    lastAppliedPayloadHash = '';
    updateStatus({
      workspaceId: cleanId,
      syncRevision: 0,
      pendingSyncConflict: null,
      errorMessage: null,
    });
    if (currentStatus.connectionMode === 'cloud') {
      await this.inspectAndConnectCloudWorkspace();
    }
  },

  setAutoSyncEnabled(enabled: boolean) {
    safeSetItem(AUTO_SYNC_STORAGE_KEY, enabled ? '1' : '0');
    updateStatus({ autoSyncEnabled: enabled });
    if (currentStatus.connectionMode === 'cloud' && enabled) {
      startRealtimeWorkspaceSubscription();
    } else {
      stopActiveListeners();
      updateStatus({ isConnected: false });
    }
  },

  notifyLocalMutation() {
    if (currentStatus.connectionMode !== 'cloud') return;
    if (this.isReadOnlyObserver()) return;
    if (isApplyingRemoteSnapshot) return;

    setPendingOfflineFlag(true);
    if (
      currentStatus.autoSyncEnabled &&
      !currentStatus.pendingSyncConflict &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      this.scheduleAutoPush();
    }
  },

  async pushToCloudNow(): Promise<boolean> {
    if (currentStatus.connectionMode !== 'cloud') {
      return false;
    }
    if (this.isReadOnlyObserver()) {
      updateStatus({
        errorMessage: 'حالت ناظر فقط‌خواندنی (والدین) فعال است؛ امکان تغییر اطلاعات ابری وجود ندارد.',
      });
      return false;
    }
    if (!localExportHandler) return false;
    if (isApplyingRemoteSnapshot) return false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setPendingOfflineFlag(true);
      updateStatus({
        isNetworkOnline: false,
        isConnected: false,
        errorMessage:
          'اینترنت قطع است. تغییرات شما در حافظه محلی ذخیره شدند و بلافاصله پس از اتصال اینترنت ارسال می‌شوند.',
      });
      return false;
    }

    const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
    const deviceUid = getOrCreateDeviceUid();
    const displayName = (currentStatus.collaboratorName || 'کاربر ۱').slice(0, 120);

    updateStatus({ isSyncing: true, errorMessage: null });

    try {
      const payloadObj = await localExportHandler();
      const serialized = JSON.stringify(payloadObj);

      if (serialized.length > 940000) {
        updateStatus({
          isSyncing: false,
          errorMessage: 'حجم داده‌ها از سقف مجاز سند ابری (۹۵۰ کیلوبایت) بیشتر است.',
        });
        return false;
      }

      lastAppliedPayloadHash = serialized;

      // =======================================================================
      // ENGINE B: SUPABASE POSTGRESQL CLOUD
      // =======================================================================
      if (currentStatus.provider === 'supabase') {
        if (!currentStatus.isSupabaseConfigured) {
          updateStatus({
            isSyncing: false,
            errorMessage: 'لطفاً ابتدا Project URL و Anon Key پروژه Supabase خود را وارد و ذخیره کنید.',
          });
          return false;
        }

        const baseUrl = normalizeSupabaseUrl(currentStatus.supabaseUrl);
        const anonKey = currentStatus.supabaseAnonKey.trim();

        const getRes = await fetch(
          `${baseUrl}/rest/v1/martia_workspaces?workspace_id=eq.${encodeURIComponent(
            wsId
          )}&select=workspace_id,owner_id,sync_revision`,
          {
            method: 'GET',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              Accept: 'application/json',
            },
          }
        );

        if (!getRes.ok) {
          const errText = await getRes.text();
          const isMissingTable =
            errText.includes('PGRST205') || errText.includes('martia_workspaces');

          updateStatus({
            isSyncing: false,
            isConnected: false,
            needsSupabaseTableSetup: isMissingTable,
            errorMessage: isMissingTable
              ? 'جدول martia_workspaces هنوز در پروژه Supabase شما ساخته نشده است. لطفاً کد SQL زیر را کپی کرده و در SQL Editor سوپابیس Run کنید (اطلاعات روی دستگاه شما محفوظ است).'
              : `خطا در اتصال به Supabase (کد ${getRes.status}).`,
          });
          return false;
        }

        const existingRows = await getRes.json();
        const existingRow =
          Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
        const nextRev =
          existingRow && typeof existingRow.sync_revision === 'number'
            ? existingRow.sync_revision + 1
            : 1;
        const ownerId = existingRow?.owner_id || deviceUid;

        const upsertRes = await fetch(
          `${baseUrl}/rest/v1/martia_workspaces?on_conflict=workspace_id`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify({
              workspace_id: wsId,
              owner_id: ownerId,
              last_updated_by_uid: deviceUid,
              last_updated_by_name: displayName,
              payload_json: serialized,
              sync_revision: nextRev,
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!upsertRes.ok) {
          setPendingOfflineFlag(true);
          updateStatus({
            isSyncing: false,
            errorMessage: `خطا در ذخیره اطلاعات در Supabase (کد ${upsertRes.status}). تغییرات در صف همگام‌سازی باقی ماندند.`,
          });
          return false;
        }

        setPendingOfflineFlag(false);
        updateStatus({
          isConnected: true,
          needsSupabaseTableSetup: false,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString(),
          lastUpdatedByName: displayName,
          syncRevision: nextRev,
          errorMessage: null,
        });
        return true;
      }

      // =======================================================================
      // ENGINE A: GOOGLE FIREBASE FIRESTORE CLOUD
      // =======================================================================
      const fbResult = await pushToFirebaseFirestoreInternal(
        wsId,
        deviceUid,
        displayName,
        serialized
      );

      if (!fbResult.ok) {
        setPendingOfflineFlag(true);
        updateStatus({
          isSyncing: false,
          errorMessage: 'خطا در ارسال اطلاعات به دیتابیس ابری Firebase؛ تغییرات محلی حفظ و در صف همگام‌سازی قرار گرفت.',
        });
        return false;
      }

      setPendingOfflineFlag(false);
      updateStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        lastUpdatedByName: displayName,
        syncRevision: fbResult.revision,
        errorMessage: null,
      });
      return true;
    } catch {
      setPendingOfflineFlag(true);
      updateStatus({
        isSyncing: false,
        errorMessage:
          currentStatus.errorMessage ||
          'خطا در ارسال اطلاعات به دیتابیس ابری؛ داده‌ها در حافظه دستگاه محفوظ ماندند.',
      });
      return false;
    }
  },

  async pullFromCloudNow(): Promise<boolean> {
    if (currentStatus.connectionMode !== 'cloud') return false;
    if (!remotePayloadHandler) return false;

    const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
    updateStatus({ isSyncing: true, errorMessage: null });

    try {
      // =======================================================================
      // ENGINE B: SUPABASE POSTGRESQL CLOUD
      // =======================================================================
      if (currentStatus.provider === 'supabase') {
        if (!currentStatus.isSupabaseConfigured) {
          updateStatus({
            isSyncing: false,
            errorMessage: 'لطفاً ابتدا Project URL و Anon Key پروژه Supabase خود را وارد و ذخیره کنید.',
          });
          return false;
        }

        const baseUrl = normalizeSupabaseUrl(currentStatus.supabaseUrl);
        const anonKey = currentStatus.supabaseAnonKey.trim();

        const res = await fetch(
          `${baseUrl}/rest/v1/martia_workspaces?workspace_id=eq.${encodeURIComponent(
            wsId
          )}&select=*`,
          {
            method: 'GET',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              Accept: 'application/json',
            },
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          const isMissingTable =
            errText.includes('PGRST205') || errText.includes('martia_workspaces');
          updateStatus({
            isSyncing: false,
            needsSupabaseTableSetup: isMissingTable,
            errorMessage: isMissingTable
              ? 'جدول martia_workspaces هنوز در پروژه Supabase شما ساخته نشده است. لطفاً کد SQL زیر را کپی کرده و در SQL Editor سوپابیس Run کنید.'
              : `خطا در دریافت اطلاعات از Supabase (کد ${res.status}).`,
          });
          return false;
        }

        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0 || !rows[0].payload_json) {
          updateStatus({
            isSyncing: false,
            needsSupabaseTableSetup: false,
            errorMessage:
              'هنوز اطلاعاتی در این کد اتاق مشترک در Supabase ذخیره نشده است. ابتدا دکمه «ارسال فوری اطلاعات به ابر (Push)» را بزنید.',
          });
          return false;
        }

        const row = rows[0];
        await applyIncomingPayloadString(
          row.payload_json,
          typeof row.sync_revision === 'number' ? row.sync_revision : 1,
          row.last_updated_by_name || 'کاربر همکار'
        );
        setPendingOfflineFlag(false);
        updateStatus({ isSyncing: false, pendingSyncConflict: null });
        return true;
      }

      // =======================================================================
      // ENGINE A: GOOGLE FIREBASE FIRESTORE CLOUD
      // =======================================================================
      const docPath = `workspaces/${wsId}`;
      const docRef = doc(db, 'workspaces', wsId);

      let snap;
      try {
        snap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, docPath);
        updateStatus({
          isSyncing: false,
          errorMessage: 'خطا در دریافت اطلاعات از دیتابیس ابری Firebase.',
        });
        return false;
      }

      if (!snap || !snap.exists()) {
        updateStatus({
          isSyncing: false,
          errorMessage:
            'هنوز اطلاعاتی در این کد اتاق مشترک ذخیره نشده است. ابتدا دکمه «ارسال فوری اطلاعات به ابر (Push)» را بزنید.',
        });
        return false;
      }

      const data = snap.data();
      if (!data || typeof data.payloadJson !== 'string') {
        updateStatus({ isSyncing: false });
        return false;
      }

      await applyIncomingPayloadString(
        data.payloadJson,
        typeof data.syncRevision === 'number' ? data.syncRevision : 1,
        data.lastUpdatedByName || 'کاربر همکار'
      );
      setPendingOfflineFlag(false);
      updateStatus({ isSyncing: false, pendingSyncConflict: null });
      return true;
    } finally {
      updateStatus({ isSyncing: false });
    }
  },

  scheduleAutoPush() {
    if (currentStatus.connectionMode !== 'cloud') return;
    if (this.isReadOnlyObserver()) return;
    if (!currentStatus.autoSyncEnabled) return;
    if (isApplyingRemoteSnapshot) return;
    if (currentStatus.pendingSyncConflict) return;
    if (currentStatus.provider === 'supabase' && !currentStatus.isSupabaseConfigured) return;
    if (currentStatus.provider === 'supabase' && currentStatus.needsSupabaseTableSetup) return;

    if (pushDebounceTimer) {
      clearTimeout(pushDebounceTimer);
    }
    pushDebounceTimer = setTimeout(() => {
      void this.pushToCloudNow();
    }, 600);
  },
};
