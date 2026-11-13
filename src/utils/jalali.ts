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

/**
 * Converts English/Arabic digits to Persian digits (۰-۹)
 */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)]);
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
 * Formats an ISO date as single-line weekday + YYYY/MM/DD:
 * e.g. "سه‌شنبه ۱۴۰۵/۰۸/۲۲"
 */
export function formatJalaliWeekdaySlash(isoDate: string): string {
  if (!isoDate) return '';
  const weekday = getPersianWeekdayName(isoDate);
  return `${weekday} ${formatJalaliNumeric(isoDate)}`;
}

/**
 * Curated offline bank of concise, single-line Persian motivational sentences
 * covering: موفقیت، تلاش و پشتکار، استمرار، نظم و انضباط، تمرکز، یادگیری، عبور از سختی‌ها، پیشرفت تدریجی، هدف‌گذاری.
 */
export const DAILY_MOTIVATIONAL_QUOTES: string[] = [
  'موفقیت‌های بزرگ از جمع شدن گام‌های منظم و تمرکز امروز ساخته می‌شوند.',
  'استمرار آرام و پیوسته، همیشه بر هیجان‌های کوتاه‌مدت پیروز می‌شود.',
  'هر ساعت مطالعه باکیفیت، یک پله واقعی به سمت هدف بزرگ توست.',
  'نظم شخصی یعنی انجام دادن کاری که باید انجام شود، حتی وقتی حوصله‌اش نیست.',
  'تمرکز عمیق روی یک درس، ارزشمندتر از ساعت‌ها مطالعه پراکنده است.',
  'سختی‌های مسیر یادگیری موقتی هستند، اما نتیجه تلاش تو ماندگار خواهد بود.',
  'پیشرفت یعنی امروز فقط یک درصد بهتر و منظم‌تر از دیروزت باشی.',
  'هدفی که روی کاغذ برنامه‌ریزی شود، نیمی از مسیر تحقق را طی کرده است.',
  'پشتکار یعنی وقتی خسته‌ای، به جای توقف کامل، با گام‌های مطمئن ادامه دهی.',
  'یادگیری واقعی زمانی رخ می‌دهد که با تمرکز و آرامش ذهنی همراه باشد.',
  'آینده درخشان متعلق به کسی است که از ساعت‌های امروزش هوشمندانه استفاده می‌کند.',
  'هر تست و تمرینی که حل می‌کنی، تسلط و اعتمادبه‌نفس تو را قوی‌تر می‌سازد.',
  'نظم در اجرای برنامه روزانه، کلید آرامش خاطر و موفقیت پایدار است.',
  'برای رسیدن به قله، کافی است هر روز قدم‌های امروزت را درست برداری.',
  'هیچ تلاشی بی‌نتیجه نمی‌ماند؛ هر دقیقه مطالعه در ذهن تو ذخیره می‌شود.',
  'تفاوت افراد موفق در استعداد عجیب نیست، در پیوستگی و استمرار روزانه است.',
  'وقتی هدف روشنی داری، تمرکز کردن روی برنامه بسیار ساده‌تر می‌شود.',
  'غلبه بر عوامل حواس‌پرتی، اولین پیروزی بزرگ تو در هر روز است.',
  'پیشرفت تدریجی و مستمر، مطمئن‌ترین فرمول برای کسب بهترین نتایج است.',
  'با هر برنامه‌ای که کامل می‌کنی، اراده و نظم درونی خودت را تقویت می‌کنی.',
  'موفقیت اتفاقی نیست؛ حاصل انتخاب‌های هوشمندانه و تلاش هرروزه توست.',
  'اگر امروز به برنامه‌ات پایبند بمانی، فردا با افتخار به تلاشت نگاه می‌کنی.',
  'یادگیری عمیق و مفهومی، بهترین سرمایه‌گذاری برای موفقیت‌های بعدی است.',
  'عبور از مباحث چالش‌برانگیز، ذهن تو را قوی‌تر و آماده‌تر می‌سازد.',
  'ثبات قدم در روزهای معمولی، قهرمانان روزهای بزرگ را می‌سازد.',
  'هر روز یک فرصت تازه است تا با تمرکز بیشتر، رکورد بهتری ثبت کنی.',
  'برنامه‌ریزی دقیق، استرس را به آرامش و سردرگمی را به هدفمندی تبدیل می‌کند.',
  'کیفیت مطالعه مهم‌تر از کمیت آن است؛ با حضور ذهن کامل درس بخوان.',
  'پشتکار و نظم امروز تو، لبخند رضایت فردای تو را می‌سازد.',
  'گام‌های کوچک اما هرروزه، بزرگ‌ترین فاصله‌ها را تا موفقیت پر می‌کنند.',
  'ذهن متمرکز، در زمان کمتر، یادگیری عمیق‌تر و ماندگارتری ایجاد می‌کند.',
];

/**
 * Deterministically selects a daily motivational quote based on the ISO date.
 * - Constant throughout the same day (across refreshes).
 * - Changes automatically every new day.
 * - Uses a coprime stride over the Jalali day serial so consecutive days never repeat.
 */
export function getDailyMotivationalQuote(isoDate: string): string {
  const { jy, jm, jd } = isoToJalali(isoDate || getTodayISO());
  const daySerial = jy * 372 + jm * 31 + jd;
  const total = DAILY_MOTIVATIONAL_QUOTES.length;
  // 13 is coprime with 31, ensuring non-adjacent pseudo-random jumps each day without consecutive repeats
  const index = ((daySerial * 13 + 7) % total + total) % total;
  return DAILY_MOTIVATIONAL_QUOTES[index];
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
 * Formats minutes clearly in Persian: e.g. "۹۰ دقیقه (۱ ساعت و ۳۰ دقیقه)" or compact "۹۰ دقیقه"
 */
export function formatMinutesPersian(minutes: number, includeHoursHint = false): string {
  const mins = Math.max(0, Math.round(minutes || 0));
  if (!includeHoursHint || mins < 60) {
    return `${toPersianDigits(mins)} دقیقه`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) {
    return `${toPersianDigits(mins)} دقیقه (${toPersianDigits(h)} ساعت)`;
  }
  return `${toPersianDigits(mins)} دقیقه (${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه)`;
}

/**
 * Formats minutes with hours and minutes unit for compact display (Section 1.3):
 * e.g. 90 -> "۱ ساعت و ۳۰ دقیقه", 60 -> "۱ ساعت", 45 -> "۴۵ دقیقه"
 */
export function formatHoursAndMinutesPersian(minutes: number): string {
  const mins = Math.max(0, Math.round(minutes || 0));
  if (mins < 60) {
    return `${toPersianDigits(mins)} دقیقه`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) {
    return `${toPersianDigits(h)} ساعت (${toPersianDigits(mins)} دقیقه)`;
  }
  return `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه`;
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
  const result: string[] = [];
  let current = startIso;
  let guard = 0;
  while (current <= endIso && guard < 366) {
    result.push(current);
    current = addDaysISO(current, 1);
    guard++;
  }
  return result;
}


