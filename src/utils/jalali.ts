/**
 * Persian (Jalali / Shamsi) Calendar & Number Formatting Utilities
 * Built on jalaali-js for accurate Iranian calendar conversions, week calculation (Saturday to Friday),
 * and Persian numeral formatting.
 */
import * as jalaali from 'jalaali-js';

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts English/Arabic digits to Persian digits (۰-۹) using fast charCode lookup
 */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      out += PERSIAN_DIGITS[code - 48];
    } else {
      out += str[i];
    }
  }
  return out;
}

/**
 * Formats a Date object as local YYYY-MM-DD string
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object (at noon to avoid DST shift)
 */
export function parseISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/**
 * Returns today's YYYY-MM-DD in local time
 */
export function getTodayISO(): string {
  return toISODateString(new Date());
}

/**
 * Adds `days` to a given YYYY-MM-DD date string and returns new YYYY-MM-DD
 */
export function addDaysISO(isoDate: string, days: number): string {
  const dt = parseISODate(isoDate);
  dt.setDate(dt.getDate() + days);
  return toISODateString(dt);
}

/**
 * Returns Tomorrow's YYYY-MM-DD
 */
export function getTomorrowISO(): string {
  return addDaysISO(getTodayISO(), 1);
}

const weekdayIndexCache = new Map<string, number>();
const jalaliPartsCache = new Map<string, { jy: number; jm: number; jd: number }>();
const numericDateCache = new Map<string, string>();

/**
 * Returns the Iranian weekday index (0 = Saturday / شنبه ... 6 = Friday / جمعه)
 */
export function getPersianWeekdayIndex(isoDate: string): number {
  const cached = weekdayIndexCache.get(isoDate);
  if (cached !== undefined) return cached;
  const dt = parseISODate(isoDate);
  // JS getDay(): 0 = Sunday, 6 = Saturday
  const jsDay = dt.getDay();
  const idx = (jsDay + 1) % 7;
  weekdayIndexCache.set(isoDate, idx);
  return idx;
}

/**
 * Returns the Persian weekday name (e.g., "شنبه")
 */
export function getPersianWeekdayName(isoDate: string): string {
  return PERSIAN_WEEKDAYS[getPersianWeekdayIndex(isoDate)];
}

/**
 * Converts a YYYY-MM-DD Gregorian string to Jalali { jy, jm, jd }
 */
export function isoToJalali(isoDate: string): { jy: number; jm: number; jd: number } {
  const cached = jalaliPartsCache.get(isoDate);
  if (cached) return cached;
  const [gy, gm, gd] = isoDate.split('-').map(Number);
  const converted = jalaali.toJalaali(gy, gm, gd);
  jalaliPartsCache.set(isoDate, converted);
  return converted;
}

/**
 * Unified standard numeric Jalali formatter: "۱۴۰۵/۰۸/۲۲"
 * Strictly Year (left) / Month (middle) / Day (right) across all menus, charts, calendars, and filters.
 */
export function formatJalaliNumeric(isoDate: string): string {
  if (!isoDate) return '';
  const cached = numericDateCache.get(isoDate);
  if (cached) return cached;
  const { jy, jm, jd } = isoToJalali(isoDate);
  const yyyy = toPersianDigits(jy);
  const mm = toPersianDigits(String(jm).padStart(2, '0'));
  const dd = toPersianDigits(String(jd).padStart(2, '0'));
  // Left-to-Right Isolate (\u2066...\u2069) guarantees Year/Month/Day order from left to right
  const formatted = `\u2066${yyyy}/${mm}/${dd}\u2069`;
  numericDateCache.set(isoDate, formatted);
  return formatted;
}

/**
 * Formats an ISO date as a readable Persian weekday + standard YYYY/MM/DD date:
 * e.g. "شنبه ۱۴۰۵/۰۸/۲۲"
 */
export function formatJalaliFull(isoDate: string): string {
  if (!isoDate) return '';
  const weekday = getPersianWeekdayName(isoDate);
  return `${weekday} ${formatJalaliNumeric(isoDate)}`;
}

/**
 * Formats an ISO date as compact standard Persian numeric date:
 * e.g. "۱۴۰۵/۰۸/۲۲"
 */
export function formatJalaliCompact(isoDate: string): string {
  return formatJalaliNumeric(isoDate);
}

/**
 * Formats an ISO date into short Persian month/day format for chart X-axes:
 * Example: "۰۸/۲۳" (wrapped in directional isolate so slash order stays MM/DD)
 */
export function formatJalaliShortMonthDay(isoDate: string): string {
  if (!isoDate) return '';
  const { jm, jd } = isoToJalali(isoDate);
  const mm = toPersianDigits(String(jm).padStart(2, '0'));
  const dd = toPersianDigits(String(jd).padStart(2, '0'));
  return `\u2066${mm}/${dd}\u2069`;
}

/**
 * Formats an ISO date as single-line weekday + YYYY/MM/DD:
 * e.g. "سه‌شنبه ۱۴۰۵/۰۸/۲۲"
 */
export function formatJalaliWeekdaySlash(isoDate: string): string {
  if (!isoDate) return '';
  const weekday = getPersianWeekdayName(isoDate);
  return `${weekday} ${formatJalaliNumeric(isoDate)}`;
}

export type QuoteCategory =
  | 'تمرکز و کار عمیق'
  | 'استمرار و پیوستگی'
  | 'کیفیت یادگیری'
  | 'مدیریت زمان'
  | 'آزمون و بازیابی فعال'
  | 'پشتکار و هدف‌گذاری';

export interface CategorizedMotivationalQuote {
  id: string;
  text: string;
  category: QuoteCategory;
}

/**
 * Core offline bank of scientifically grounded, concise educational & motivational quotes.
 * Works 100% offline with zero external dependencies.
 */
export const CORE_MOTIVATIONAL_QUOTES_CATALOG: CategorizedMotivationalQuote[] = [
  // ۱. کیفیت یادگیری (Learning Quality & Active Recall)
  {
    id: 'q-core-1',
    category: 'کیفیت یادگیری',
    text: 'یادگیری عمیق زمانی شکل می‌گیرد که پس از مطالعه، نکات کلیدی را با زبان خودت بازگویی و بازیابی کنی.',
  },
  {
    id: 'q-core-2',
    category: 'کیفیت یادگیری',
    text: 'کیفیت مطالعه مهم‌تر از کمیت آن است؛ چهل دقیقه مطالعه فعال از ساعت‌ها روخوانی غیرمتمرکز مؤثرتر است.',
  },
  {
    id: 'q-core-3',
    category: 'کیفیت یادگیری',
    text: 'خلاصه‌نویسی از حافظه بلافاصله پس از پایان هر فصل، ماندگاری مطالب را چند برابر می‌کند.',
  },
  {
    id: 'q-core-4',
    category: 'کیفیت یادگیری',
    text: 'تبدیل مطالعه غیرفعال به پرسش‌گری ذهنی، کلید درک عمیق مفاهیم درسی است.',
  },
  {
    id: 'q-core-5',
    category: 'کیفیت یادگیری',
    text: 'وقتی مبحثی را طوری می‌خوانی که بتوانی آن را به دیگری توضیح دهی، به تسلط واقعی رسیده‌ای.',
  },

  // ۲. تمرکز و کار عمیق (Focus & Deep Work)
  {
    id: 'q-core-6',
    category: 'تمرکز و کار عمیق',
    text: 'تمرکز عمیق روی یک مبحث مشخص، ذهن را از خستگی ناشی از چندکارگی و پراکندگی حفظ می‌کند.',
  },
  {
    id: 'q-core-7',
    category: 'تمرکز و کار عمیق',
    text: 'دور کردن عوامل حواس‌پرتی پیش از شروع مطالعه، نیمی از مسیر تمرکز پایدار است.',
  },
  {
    id: 'q-core-8',
    category: 'تمرکز و کار عمیق',
    text: 'ذهن متمرکز در زمان کمتر، ارتباط‌های مفهومی دقیق‌تر و ماندگارتری می‌سازد.',
  },
  {
    id: 'q-core-9',
    category: 'تمرکز و کار عمیق',
    text: 'هر بار که توجهت را از حواس‌پرتی به کتاب برمی‌گردانی، عضله تمرکز ذهنت را قوی‌تر می‌کنی.',
  },
  {
    id: 'q-core-10',
    category: 'تمرکز و کار عمیق',
    text: 'باکس‌های مطالعه متمرکز به همراه استراحت‌های کوتاه و منظم، بازده مغز را در اوج نگه می‌دارند.',
  },

  // ۳. استمرار و پیوستگی (Consistency & Habit Building)
  {
    id: 'q-core-11',
    category: 'استمرار و پیوستگی',
    text: 'استمرار آرام و پیوسته روزانه، همیشه بر مطالعه فشرده و مقطعی پیروز می‌شود.',
  },
  {
    id: 'q-core-12',
    category: 'استمرار و پیوستگی',
    text: 'تفاوت اصلی در نتایج بلندمدت، حاصل پیوستگی در روزهای عادی است نه صرفاً روزهای پرانگیزه.',
  },
  {
    id: 'q-core-13',
    category: 'استمرار و پیوستگی',
    text: 'حفظ زنجیره مطالعه روزانه حتی با یک باکس کوتاه، عادت موفقیت را در ذهن تثبیت می‌کند.',
  },
  {
    id: 'q-core-14',
    category: 'استمرار و پیوستگی',
    text: 'مرورهای منظم و فاصله‌دار، مانع فراموشی مطالب و انباشتگی شب امتحان می‌شوند.',
  },
  {
    id: 'q-core-15',
    category: 'استمرار و پیوستگی',
    text: 'پیشرفت پایدار یعنی امروز فقط یک گام منظم‌تر و دقیق‌تر از دیروز عمل کنی.',
  },

  // ۴. آزمون و بازیابی فعال (Testing Effect & Practice)
  {
    id: 'q-core-16',
    category: 'آزمون و بازیابی فعال',
    text: 'حل تمرین و تست تنها ابزار سنجش نیست، بلکه یکی از قوی‌ترین روش‌های تثبیت یادگیری در مغز است.',
  },
  {
    id: 'q-core-17',
    category: 'آزمون و بازیابی فعال',
    text: 'تحلیل دقیق سؤال‌هایی که اشتباه پاسخ داده‌ای، ارزشمندترین بخش هر نوبت تمرین و تست‌زنی است.',
  },
  {
    id: 'q-core-18',
    category: 'آزمون و بازیابی فعال',
    text: 'آزمودن خود پس از مطالعه هر درس، نقاط مبهم را پیش از جلسه امتحان آشکار می‌سازد.',
  },
  {
    id: 'q-core-19',
    category: 'آزمون و بازیابی فعال',
    text: 'هر تمرین چالش‌برانگیزی که تحلیل می‌کنی، تسلط و سرعت عملت را در مباحث بعدی ارتقا می‌دهد.',
  },

  // ۵. مدیریت زمان (Time Management & Planning)
  {
    id: 'q-core-20',
    category: 'مدیریت زمان',
    text: 'تعیین ظرف زمانی مشخص برای هر فعالیت، از اتلاف پنهان ساعت‌های روز جلوگیری می‌کند.',
  },
  {
    id: 'q-core-21',
    category: 'مدیریت زمان',
    text: 'برنامه‌ریزی واقع‌بینانه بر اساس توان اجرایی روزانه، استرس را به آرامش و تسلط تبدیل می‌کند.',
  },
  {
    id: 'q-core-22',
    category: 'مدیریت زمان',
    text: 'شروع روز با مهم‌ترین و اولویت‌دارترین درس، انرژی ذهنی را در بهترین مسیر مصرف می‌کند.',
  },
  {
    id: 'q-core-23',
    category: 'مدیریت زمان',
    text: 'ثبت زمان واقعی مطالعه در کنار پیش‌بینی اولیه، دقت برنامه‌ریزی روزهای آینده را افزایش می‌دهد.',
  },

  // ۶. پشتکار و هدف‌گذاری (Grit & Goal Setting)
  {
    id: 'q-core-24',
    category: 'پشتکار و هدف‌گذاری',
    text: 'نظم شخصی یعنی اجرای برنامه تعیین‌شده، حتی در ساعاتی که انگیزه اولیه کمتر است.',
  },
  {
    id: 'q-core-25',
    category: 'پشتکار و هدف‌گذاری',
    text: 'تقسیم اهداف بزرگ تحصیلی به مأموریت‌های شفاف روزانه، مسیر پیشرفت را قابل اندازه‌گیری می‌کند.',
  },
  {
    id: 'q-core-26',
    category: 'پشتکار و هدف‌گذاری',
    text: 'مواجهه با مباحث دشوار نشانه ضعف نیست؛ نشانه ورود به محدوده رشد و یادگیری جدید است.',
  },
];

/**
 * Extended verified pack of educational & scientific study quotes that can be synced/added
 * via the Settings "به‌روزرسانی جملات انگیزشی" action (online or offline fallback).
 */
export const EXTENDED_VERIFIED_QUOTES_PACK: CategorizedMotivationalQuote[] = [
  {
    id: 'q-ext-1',
    category: 'کیفیت یادگیری',
    text: 'مطالعه مفهومی همراه با طرح سؤال از متن، ارتباط بین فصل‌های مختلف کتاب را در ذهن روشن می‌کند.',
  },
  {
    id: 'q-ext-2',
    category: 'تمرکز و کار عمیق',
    text: 'پنج دقیقه آماده‌سازی میز کار و مشخص کردن هدف دقیق پیش از مطالعه، کیفیت تمرکز را دوچندان می‌کند.',
  },
  {
    id: 'q-ext-3',
    category: 'آزمون و بازیابی فعال',
    text: 'فاصله انداختن کوتاه بین مطالعه درس و حل تست‌های آن، قدرت بازیابی حافظه بلندمدت را تقویت می‌کند.',
  },
  {
    id: 'q-ext-4',
    category: 'مدیریت زمان',
    text: 'تعادل هوشمندانه بین مطالعه متمرکز، استراحت کافی و سرگرمی کنترل‌شده، رمز کارایی پایدار در طول سال تحصیلی است.',
  },
  {
    id: 'q-ext-5',
    category: 'استمرار و پیوستگی',
    text: 'اگر روزی کمتر از هدف برنامه‌ریزی‌شده مطالعه کردی، ثبت صادقانه عملکرد و بازگشت آرام در روز بعد مهم‌ترین اصل پیوستگی است.',
  },
  {
    id: 'q-ext-6',
    category: 'پشتکار و هدف‌گذاری',
    text: 'پیشرفت واقعی زمانی رخ می‌دهد که کیفیت یادگیری و دقت حل تمرین هم‌زمان با ساعت مطالعه رشد کنند.',
  },
  {
    id: 'q-ext-7',
    category: 'کیفیت یادگیری',
    text: 'مرور ده دقیقه‌ای یادداشت‌های روز قبل در ابتدای مطالعه جدید، زنجیره یادگیری را پیوسته نگه می‌دارد.',
  },
  {
    id: 'q-ext-8',
    category: 'مدیریت زمان',
    text: 'تخصیص ساعت‌های اوج هوشیاری روز به دروس تحلیلی و مفهومی، بازده یادگیری را به حداکثر می‌رساند.',
  },
  {
    id: 'q-ext-9',
    category: 'آزمون و بازیابی فعال',
    text: 'یادداشت کردن علت هر خطا در حل تمرین، از تکرار همان اشتباه در آزمون‌های بعدی جلوگیری می‌کند.',
  },
  {
    id: 'q-ext-10',
    category: 'تمرکز و کار عمیق',
    text: 'تکمیل کامل یک مأموریت کوتاه با تمرکز صددرصدی، ارزشمندتر از نیمه‌کاره رها کردن چند فعالیت هم‌زمان است.',
  },
  {
    id: 'q-ext-11',
    category: 'استمرار و پیوستگی',
    text: 'ثبات در اجرای برنامه‌های روزانه، اعتمادبه‌نفس تحصیلی را بر پایه عملکرد واقعی می‌سازد.',
  },
  {
    id: 'q-ext-12',
    category: 'پشتکار و هدف‌گذاری',
    text: 'ارزیابی منظم روند هفته و اصلاح نقاط ضعف بدون سرزنش خود، ویژگی دانش‌آموزان هدفمند و حرفه‌ای است.',
  },
];

const QUOTES_STORAGE_KEY = 'martia_motivational_quotes_bank_v1';
const QUOTES_LAST_HISTORY_KEY = 'martia_motivational_quotes_recent_ids_v1';
export const QUOTES_UPDATED_EVENT = 'martia-motivational-quotes-updated';

function normalizeQuoteText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function getStoredCustomQuotes(): CategorizedMotivationalQuote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CategorizedMotivationalQuote =>
        Boolean(
          item &&
            typeof item.id === 'string' &&
            typeof item.text === 'string' &&
            item.text.trim().length >= 15 &&
            item.text.trim().length <= 240 &&
            typeof item.category === 'string'
        )
    );
  } catch {
    return [];
  }
}

export function getAllMotivationalQuotesCatalog(): CategorizedMotivationalQuote[] {
  const stored = getStoredCustomQuotes();
  const seenTexts = new Set<string>();
  const merged: CategorizedMotivationalQuote[] = [];

  for (const q of [...CORE_MOTIVATIONAL_QUOTES_CATALOG, ...stored]) {
    const norm = normalizeQuoteText(q.text);
    if (!norm || seenTexts.has(norm)) continue;
    seenTexts.add(norm);
    merged.push(q);
  }
  return merged;
}

export const DAILY_MOTIVATIONAL_QUOTES: string[] = CORE_MOTIVATIONAL_QUOTES_CATALOG.map(
  (q) => q.text
);

export function getMotivationalQuotesStats(): {
  totalCount: number;
  coreCount: number;
  syncedCount: number;
  categoriesCount: number;
  lastSyncedAt: string | null;
} {
  const all = getAllMotivationalQuotesCatalog();
  const categories = new Set(all.map((q) => q.category));
  let lastSyncedAt: string | null = null;
  if (typeof window !== 'undefined') {
    lastSyncedAt = window.localStorage.getItem(`${QUOTES_STORAGE_KEY}_timestamp`);
  }
  return {
    totalCount: all.length,
    coreCount: CORE_MOTIVATIONAL_QUOTES_CATALOG.length,
    syncedCount: Math.max(0, all.length - CORE_MOTIVATIONAL_QUOTES_CATALOG.length),
    categoriesCount: categories.size,
    lastSyncedAt,
  };
}

/**
 * Updates/syncs the motivational quotes bank safely:
 * 1. If online, attempts a safe timeout-bounded fetch to optional `/api/quotes/curated` JSON.
 * 2. Validates and merges with the verified extended educational pack (`EXTENDED_VERIFIED_QUOTES_PACK`).
 * 3. Deduplicates against all existing quotes and never deletes previously stored quotes.
 */
export async function syncMotivationalQuotesBank(): Promise<{
  addedCount: number;
  totalCount: number;
  source: 'online_and_curated' | 'curated_verified_pack';
  message: string;
}> {
  const existingAll = getAllMotivationalQuotesCatalog();
  const existingTexts = new Set(existingAll.map((q) => normalizeQuoteText(q.text)));
  const currentStored = getStoredCustomQuotes();

  const candidates: CategorizedMotivationalQuote[] = [...EXTENDED_VERIFIED_QUOTES_PACK];
  let usedOnline = false;

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch('/api/motivational-quotes', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.quotes)) {
          for (const item of data.quotes) {
            if (
              item &&
              typeof item.text === 'string' &&
              item.text.trim().length >= 20 &&
              item.text.trim().length <= 220
            ) {
              candidates.push({
                id: String(item.id || `q-online-${ candidates.length + 1 }`),
                text: item.text.trim(),
                category: (item.category as QuoteCategory) || 'کیفیت یادگیری',
              });
              usedOnline = true;
            }
          }
        }
      }
    } catch {
      // Safe offline/local fallback — never breaks or throws
    }
  }

  const newlyAdded: CategorizedMotivationalQuote[] = [];
  for (const cand of candidates) {
    const norm = normalizeQuoteText(cand.text);
    if (!norm || norm.length < 15 || existingTexts.has(norm)) continue;
    existingTexts.add(norm);
    newlyAdded.push(cand);
  }

  const updatedStored = [...currentStored, ...newlyAdded];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updatedStored));
      window.localStorage.setItem(
        `${QUOTES_STORAGE_KEY}_timestamp`,
        new Date().toISOString()
      );
      window.dispatchEvent(new CustomEvent(QUOTES_UPDATED_EVENT));
    } catch {
      // Ignore storage quota errors
    }
  }

  const finalTotal = CORE_MOTIVATIONAL_QUOTES_CATALOG.length + updatedStored.length;
  const message =
    newlyAdded.length > 0
      ? `${toPersianDigits(newlyAdded.length)} جمله آموزشی و انگیزشی جدید اعتبارسنجی و به بانک داخلی اضافه شد (مجموع فعلی: ${toPersianDigits(
          finalTotal
        )} جمله معتبر در ۶ دسته‌بندی).`
      : `بانک جملات انگیزشی و آموزشی کاملاً به‌روز است (مجموع: ${toPersianDigits(
          finalTotal
        )} جمله معتبر بدون موارد تکراری).`;

  return {
    addedCount: newlyAdded.length,
    totalCount: finalTotal,
    source: usedOnline ? 'online_and_curated' : 'curated_verified_pack',
    message,
  };
}

/**
 * Selects a diverse, non-repeating motivational/educational quote.
 * Combines the Jalali day serial with an optional rotation offset so consecutive days
 * and manual refreshes never repeat the same sentence.
 */
export function getDailyMotivationalQuoteObject(
  isoDate: string,
  rotationOffset = 0
): CategorizedMotivationalQuote {
  const catalog = getAllMotivationalQuotesCatalog();
  if (catalog.length === 0) {
    return CORE_MOTIVATIONAL_QUOTES_CATALOG[0];
  }
  const { jy, jm, jd } = isoToJalali(isoDate || getTodayISO());
  const daySerial = jy * 372 + jm * 31 + jd;
  const total = catalog.length;
  // Coprime stride guarantees non-adjacent category jumps across consecutive days
  const index = (((daySerial * 17 + rotationOffset * 7 + 11) % total) + total) % total;
  return catalog[index];
}

export function getDailyMotivationalQuote(isoDate: string, rotationOffset = 0): string {
  return getDailyMotivationalQuoteObject(isoDate, rotationOffset).text;
}

/**
 * Given any reference ISO date, returns the 7 days of that Iranian week (Saturday to Friday)
 */
export function getPersianWeekDays(referenceIsoDate: string): Array<{
  isoDate: string;
  weekdayIndex: number;
  weekdayName: string;
  dayNumberPersian: string;
  monthName: string;
  fullLabel: string;
  isToday: boolean;
}> {
  const todayIso = getTodayISO();
  const currentWeekdayIdx = getPersianWeekdayIndex(referenceIsoDate); // 0 = Saturday
  const saturdayIso = addDaysISO(referenceIsoDate, -currentWeekdayIdx);

  return Array.from({ length: 7 }, (_, i) => {
    const isoDate = addDaysISO(saturdayIso, i);
    const { jm, jd } = isoToJalali(isoDate);
    const weekdayName = PERSIAN_WEEKDAYS[i];
    const monthName = PERSIAN_MONTHS[jm - 1] || '';
    return {
      isoDate,
      weekdayIndex: i,
      weekdayName,
      dayNumberPersian: toPersianDigits(jd),
      monthName,
      fullLabel: `${weekdayName} ${formatJalaliNumeric(isoDate)}`,
      isToday: isoDate === todayIso,
    };
  });
}

/**
 * Returns start and end ISO dates for the current Jalali month containing `referenceIsoDate`
 */
export function getJalaliMonthRange(referenceIsoDate: string): {
  startIso: string;
  endIso: string;
  monthLabel: string;
} {
  const { jy, jm } = isoToJalali(referenceIsoDate);
  const monthLength = jalaali.jalaaliMonthLength(jy, jm);
  const startGreg = jalaali.toGregorian(jy, jm, 1);
  const endGreg = jalaali.toGregorian(jy, jm, monthLength);

  const startIso = `${startGreg.gy}-${String(startGreg.gm).padStart(2, '0')}-${String(
    startGreg.gd
  ).padStart(2, '0')}`;
  const endIso = `${endGreg.gy}-${String(endGreg.gm).padStart(2, '0')}-${String(
    endGreg.gd
  ).padStart(2, '0')}`;

  return {
    startIso,
    endIso,
    monthLabel: `${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`,
  };
}

/**
 * Unified compact prime time formatter across the entire application:
 * - For < 60 minutes: e.g. 20 -> "\u2066۲۰′\u2069" (visually ۲۰′)
 * - For >= 60 minutes: e.g. 195 -> "\u2066۳:۱۵′\u2069", 180 -> "\u2066۳:۰۰′\u2069"
 * Uses Unicode Left-to-Right Isolate (\u2066...\u2069) so the prime symbol (′) is ALWAYS
 * placed after (to the right of) the digits even inside RTL containers, never before (′۲۰).
 * Never outputs the extra words «ساعت» or «دقیقه».
 */
export function formatDurationPrimePersian(minutes: number | null | undefined): string {
  const mins = Math.max(0, Math.round(Number(minutes || 0)));
  if (mins < 60) {
    return `\u2066${toPersianDigits(mins)}′\u2069`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const paddedM = m < 10 ? `0${m}` : `${m}`;
  return `\u2066${toPersianDigits(h)}:${toPersianDigits(paddedM)}′\u2069`;
}

/**
 * Formats minutes in unified prime notation (e.g. 45 -> "۴۵′", 90 -> "۱:۳۰′")
 */
export function formatMinutesPersian(minutes: number, _includeHoursHint = false): string {
  return formatDurationPrimePersian(minutes);
}

/**
 * Formats hours and minutes in unified prime notation (e.g. 90 -> "۱:۳۰′", 45 -> "۴۵′")
 */
export function formatHoursAndMinutesPersian(minutes: number): string {
  return formatDurationPrimePersian(minutes);
}

/**
 * Converts a Jalali date (jy, jm, jd) to a YYYY-MM-DD Gregorian ISO string
 */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const g = jalaali.toGregorian(jy, jm, jd);
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
}

/**
 * Generates calendar grid data for a given Jalali year and month (1..12)
 */
export function getJalaliMonthGrid(
  jy: number,
  jm: number
): {
  jy: number;
  jm: number;
  monthName: string;
  monthLength: number;
  firstDayWeekdayIndex: number; // 0 = شنبه ... 6 = جمعه
  days: Array<{
    jd: number;
    persianDay: string;
    isoDate: string;
    isToday: boolean;
  }>;
} {
  const todayIso = getTodayISO();
  const monthLength = jalaali.jalaaliMonthLength(jy, jm);
  const firstIso = jalaliToIso(jy, jm, 1);
  const firstDayWeekdayIndex = getPersianWeekdayIndex(firstIso);

  const days = Array.from({ length: monthLength }, (_, idx) => {
    const jd = idx + 1;
    const isoDate = jalaliToIso(jy, jm, jd);
    return {
      jd,
      persianDay: toPersianDigits(jd),
      isoDate,
      isToday: isoDate === todayIso,
    };
  });

  return {
    jy,
    jm,
    monthName: PERSIAN_MONTHS[jm - 1] || '',
    monthLength,
    firstDayWeekdayIndex,
    days,
  };
}

/**
 * Returns an inclusive array of YYYY-MM-DD strings between startIso and endIso (max 366 days safety cap)
 */
export function getDateRangeISOList(startIso: string, endIso: string): string[] {
  if (!startIso || !endIso || startIso > endIso) return [startIso || getTodayISO()];
  if (startIso === endIso) return [startIso];
  const result: string[] = [];
  const dt = parseISODate(startIso);
  let current = startIso;
  let guard = 0;
  while (current <= endIso && guard < 366) {
    result.push(current);
    dt.setDate(dt.getDate() + 1);
    current = toISODateString(dt);
    guard++;
  }
  return result;
}


