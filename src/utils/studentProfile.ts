import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage.ts';

export const STUDENT_PROFILE_STORAGE_KEY = 'martia_student_profile_v1';
export const STUDENT_PROFILE_EVENT_NAME = 'martia:student-profile-updated';

export interface StudentProfile {
  fullName: string;
  gradeLevel: string;
  fieldOfStudy: string;
  schoolName: string;
  academicYear: string;
  studyGoalNote: string;
  avatarType: 'preset' | 'custom';
  avatarPresetId: string;
  customAvatarDataUrl: string | null;
  updatedAt: string;
}

export const GRADE_LEVEL_OPTIONS: string[] = [
  'چهارم ابتدایی',
  'پنجم ابتدایی',
  'ششم ابتدایی',
  'هفتم',
  'هشتم',
  'نهم',
  'دهم',
  'یازدهم',
  'دوازدهم',
  'داوطلب کنکور / فارغ‌التحصیل',
];

export const FIELD_OF_STUDY_OPTIONS: string[] = [
  'عمومی (متوسطه اول / ابتدایی)',
  'ریاضی و فیزیک',
  'علوم تجربی',
  'ادبیات و علوم انسانی',
  'فنی و حرفه‌ای / کاردانش',
  'سایر',
];

export interface AvatarPresetOption {
  id: string;
  label: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
  hairColor: string;
  skinColor: string;
  shirtColor: string;
  variant: 'classic' | 'glasses' | 'hijab' | 'cap' | 'curly' | 'scholar' | 'book' | 'star';
}

export const AVATAR_PRESET_OPTIONS: AvatarPresetOption[] = [
  {
    id: 'student-indigo',
    label: 'دانش‌آموز پرتلاش',
    bgFrom: '#e0e7ff',
    bgTo: '#c7d2fe',
    accent: '#4f46e5',
    hairColor: '#1e293b',
    skinColor: '#f6d5b8',
    shirtColor: '#4338ca',
    variant: 'classic',
  },
  {
    id: 'student-glasses',
    label: 'پژوهشگر عینکی',
    bgFrom: '#dbeafe',
    bgTo: '#bfdbfe',
    accent: '#0284c7',
    hairColor: '#334155',
    skinColor: '#f2cba9',
    shirtColor: '#0369a1',
    variant: 'glasses',
  },
  {
    id: 'student-hijab-teal',
    label: 'دانش‌آموز منظم',
    bgFrom: '#ccfbf1',
    bgTo: '#99f6e4',
    accent: '#0f766e',
    hairColor: '#0f766e',
    skinColor: '#f5d2b6',
    shirtColor: '#115e59',
    variant: 'hijab',
  },
  {
    id: 'student-hijab-violet',
    label: 'دانش‌آموز خلاق',
    bgFrom: '#ede9fe',
    bgTo: '#ddd6fe',
    accent: '#6d28d9',
    hairColor: '#5b21b6',
    skinColor: '#f6d5b8',
    shirtColor: '#7c3aed',
    variant: 'hijab',
  },
  {
    id: 'student-cap',
    label: 'ورزشکار و درس‌خوان',
    bgFrom: '#fef3c7',
    bgTo: '#fde68a',
    accent: '#d97706',
    hairColor: '#292524',
    skinColor: '#edc29c',
    shirtColor: '#b45309',
    variant: 'cap',
  },
  {
    id: 'student-curly',
    label: 'جوینده دانش',
    bgFrom: '#dcfce7',
    bgTo: '#bbf7d0',
    accent: '#15803d',
    hairColor: '#3f2e21',
    skinColor: '#f1c7a5',
    shirtColor: '#166534',
    variant: 'curly',
  },
  {
    id: 'emblem-scholar',
    label: 'نشان فارغ‌التحصیلی',
    bgFrom: '#f1f5f9',
    bgTo: '#e2e8f0',
    accent: '#334155',
    hairColor: '#1e293b',
    skinColor: '#f6d5b8',
    shirtColor: '#1e293b',
    variant: 'scholar',
  },
  {
    id: 'emblem-book',
    label: 'نشان کتاب و قلم',
    bgFrom: '#fce7f3',
    bgTo: '#fbcfe8',
    accent: '#be185d',
    hairColor: '#831843',
    skinColor: '#f6d5b8',
    shirtColor: '#9d174d',
    variant: 'book',
  },
];

export function getDefaultStudentProfile(): StudentProfile {
  return {
    fullName: 'دانش‌آموز مارتیا',
    gradeLevel: 'هشتم',
    fieldOfStudy: 'عمومی (متوسطه اول / ابتدایی)',
    schoolName: '',
    academicYear: '۱۴۰۵-۱۴۰۶',
    studyGoalNote: 'پیشرفت مستمر روزانه با تمرکز بر عمق یادگیری',
    avatarType: 'preset',
    avatarPresetId: AVATAR_PRESET_OPTIONS[0].id,
    customAvatarDataUrl: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadStudentProfile(): StudentProfile {
  const defaults = getDefaultStudentProfile();
  const raw = safeGetItem(STUDENT_PROFILE_STORAGE_KEY);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    const validPreset = AVATAR_PRESET_OPTIONS.some((p) => p.id === parsed.avatarPresetId)
      ? parsed.avatarPresetId
      : defaults.avatarPresetId;
    const customUrl =
      typeof parsed.customAvatarDataUrl === 'string' &&
      parsed.customAvatarDataUrl.startsWith('data:image/')
        ? parsed.customAvatarDataUrl
        : null;
    return {
      fullName:
        typeof parsed.fullName === 'string' && parsed.fullName.trim()
          ? parsed.fullName.trim()
          : defaults.fullName,
      gradeLevel:
        typeof parsed.gradeLevel === 'string' && parsed.gradeLevel.trim()
          ? parsed.gradeLevel.trim()
          : defaults.gradeLevel,
      fieldOfStudy:
        typeof parsed.fieldOfStudy === 'string' && parsed.fieldOfStudy.trim()
          ? parsed.fieldOfStudy.trim()
          : defaults.fieldOfStudy,
      schoolName: typeof parsed.schoolName === 'string' ? parsed.schoolName.trim() : '',
      academicYear:
        typeof parsed.academicYear === 'string' && parsed.academicYear.trim()
          ? parsed.academicYear.trim()
          : defaults.academicYear,
      studyGoalNote:
        typeof parsed.studyGoalNote === 'string' ? parsed.studyGoalNote.trim() : '',
      avatarType: parsed.avatarType === 'custom' && customUrl ? 'custom' : 'preset',
      avatarPresetId: validPreset,
      customAvatarDataUrl: customUrl,
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : defaults.updatedAt,
    };
  } catch {
    return defaults;
  }
}

export function saveStudentProfile(profile: StudentProfile): StudentProfile {
  const sanitized: StudentProfile = {
    ...profile,
    fullName: profile.fullName.trim() || getDefaultStudentProfile().fullName,
    gradeLevel: profile.gradeLevel.trim() || 'هشتم',
    fieldOfStudy: profile.fieldOfStudy.trim() || FIELD_OF_STUDY_OPTIONS[0],
    schoolName: profile.schoolName.trim(),
    academicYear: profile.academicYear.trim() || '۱۴۰۵-۱۴۰۶',
    studyGoalNote: profile.studyGoalNote.trim(),
    avatarType:
      profile.avatarType === 'custom' && profile.customAvatarDataUrl ? 'custom' : 'preset',
    updatedAt: new Date().toISOString(),
  };

  safeSetItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(sanitized));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_PROFILE_EVENT_NAME, { detail: sanitized }));
  }
  return sanitized;
}

export function resetStudentProfile(): StudentProfile {
  safeRemoveItem(STUDENT_PROFILE_STORAGE_KEY);
  const fresh = getDefaultStudentProfile();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_PROFILE_EVENT_NAME, { detail: fresh }));
  }
  return fresh;
}

/**
 * Center-crops and resizes an uploaded image file to a compact 256x256 JPEG data URL
 * so it persists reliably in offline storage across web, Tauri, and single-file HTML.
 */
export function compressAvatarImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('لطفاً یک فایل تصویری معتبر (JPG، PNG یا WebP) انتخاب کنید.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('حجم تصویر انتخاب‌شده نباید بیشتر از ۵ مگابایت باشد.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خواندن فایل تصویر با خطا مواجه شد.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فرمت این تصویر در مرورگر قابل پردازش نیست.'));
      img.onload = () => {
        try {
          const targetSize = 256;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('امکان پردازش تصویر در این مرورگر وجود ندارد.'));
            return;
          }

          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetSize, targetSize);
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          resolve(dataUrl);
        } catch {
          reject(new Error('خطا در بهینه‌سازی ابعاد تصویر آواتار.'));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
