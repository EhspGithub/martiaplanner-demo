import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import {
  getTodayISO,
  formatJalaliFull,
  formatJalaliWeekdaySlash,
  isoToJalali,
  getJalaliMonthGrid,
  toPersianDigits,
} from '../utils/jalali.ts';

export type AnalyticsFilterMode = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ChartDisplayMode = 'aggregate' | 'daily';

const SHORT_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export interface CompactJalaliCalendarProps {
  selectedIso: string;
  onSelectIso: (iso: string) => void;
}

export const CompactJalaliCalendar: React.FC<CompactJalaliCalendarProps> = ({
  selectedIso,
  onSelectIso,
}) => {
  const todayIso = getTodayISO();
  const initialJalali = useMemo(
    () => isoToJalali(selectedIso || todayIso),
    [selectedIso, todayIso]
  );
  const [viewJy, setViewJy] = useState<number>(initialJalali.jy);
  const [viewJm, setViewJm] = useState<number>(initialJalali.jm);

  useEffect(() => {
    const j = isoToJalali(selectedIso || todayIso);
    setViewJy(j.jy);
    setViewJm(j.jm);
  }, [selectedIso, todayIso]);

  const monthGrid = useMemo(() => getJalaliMonthGrid(viewJy, viewJm), [viewJy, viewJm]);

  const handlePrevMonth = () => {
    if (viewJm === 1) {
      setViewJy((y) => y - 1);
      setViewJm(12);
    } else {
      setViewJm((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewJm === 12) {
      setViewJy((y) => y + 1);
      setViewJm(1);
    } else {
      setViewJm((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = isoToJalali(todayIso);
    setViewJy(t.jy);
    setViewJm(t.jm);
    onSelectIso(todayIso);
  };

  return (
    <div className="w-72 rounded-2xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-xl shadow-indigo-950/15 space-y-2.5">
      {/* Calendar Header: Month/Year & Navigation */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            title="ماه قبل"
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-black text-slate-900 dark:text-white px-1.5 tabular-nums">
            {monthGrid.monthName} {toPersianDigits(monthGrid.jy)}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            title="ماه بعد"
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoToday}
          className="px-2.5 py-1 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/70 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200/70 transition-colors cursor-pointer"
        >
          امروز
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {SHORT_WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 py-0.5"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthGrid.firstDayWeekdayIndex }).map((_, emptyIdx) => (
          <div key={`empty-${emptyIdx}`} className="h-7" />
        ))}
        {monthGrid.days.map((d) => {
          const isSelected = d.isoDate === selectedIso;
          return (
            <button
              key={d.isoDate}
              type="button"
              onClick={() => onSelectIso(d.isoDate)}
              className={`h-7 rounded-lg text-[11px] font-extrabold tabular-nums flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30 scale-105'
                  : d.isToday
                  ? 'border border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/70'
              }`}
            >
              {d.persianDay}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1 font-bold">
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>روز انتخابی:</span>
        </span>
        <span className="font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
          {formatJalaliWeekdaySlash(selectedIso)}
        </span>
      </div>
    </div>
  );
};

export interface ShamsiDateFieldProps {
  label?: string;
  selectedIso: string;
  onSelectIso: (iso: string) => void;
  align?: 'right' | 'left' | 'center';
  compact?: boolean;
  fullWidth?: boolean;
}

export const ShamsiDateField: React.FC<ShamsiDateFieldProps> = ({
  label,
  selectedIso,
  onSelectIso,
  align = 'right',
  compact = false,
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const todayIso = getTodayISO();

  const updatePopoverPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const calendarWidth = 288;
    const calendarHeight = 320;
    const margin = 12;

    let left: number;
    if (align === 'center') {
      left = rect.left + rect.width / 2 - calendarWidth / 2;
    } else if (align === 'left') {
      left = rect.left;
    } else {
      left = rect.right - calendarWidth;
    }

    const maxLeft = Math.max(margin, window.innerWidth - calendarWidth - margin);
    left = Math.min(Math.max(margin, left), maxLeft);

    let top = rect.bottom + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < calendarHeight + margin && spaceAbove > spaceBelow && spaceAbove >= calendarHeight) {
      top = Math.max(margin, rect.top - calendarHeight - 8);
    } else if (top + calendarHeight > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - calendarHeight - margin);
    }

    setPopoverCoords({ top, left });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inContainer && !inPopover) {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      updatePopoverPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isOpen, updatePopoverPosition]);

  return (
    <div
      className={`relative inline-block ${fullWidth ? 'w-full' : 'w-full sm:w-auto'}`}
      ref={containerRef}
    >
      <div className="flex items-center gap-2">
        {label && (
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
            {label}
          </span>
        )}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`${
            fullWidth ? 'w-full' : 'w-full sm:w-auto'
          } inline-flex items-center justify-between gap-2 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${
            compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'
          } text-xs font-extrabold text-slate-900 dark:text-white hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-xs`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="tabular-nums truncate">
              {formatJalaliFull(selectedIso)}
              {selectedIso === todayIso ? ' (امروز)' : ''}
            </span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </button>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            dir="rtl"
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 9999,
            }}
            className="max-w-[calc(100vw-1.5rem)]"
          >
            <CompactJalaliCalendar
              selectedIso={selectedIso}
              onSelectIso={(iso) => {
                onSelectIso(iso);
                setIsOpen(false);
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
};
