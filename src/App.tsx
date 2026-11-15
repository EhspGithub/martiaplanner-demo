/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  BarChart3,
  BookOpen,
  MoreHorizontal,
  Settings,
  Sun,
  Moon,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import type { AppBootstrapData } from './types.ts';
import { api } from './services/api.ts';
import { APP_VERSION } from './version.ts';
import { toPersianDigits } from './utils/jalali.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { PlannerView } from './components/PlannerView.tsx';
import { ReportsHubView } from './components/ReportsHubView.tsx';
import { SubjectsView } from './components/SubjectsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { MetricsDefinitionsView } from './components/MetricsDefinitionsView.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';

type ActiveMenu = 'dashboard' | 'planner' | 'reports' | 'guide' | 'settings' | 'subjects';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('planner');
  const [initialReportSubjectId, setInitialReportSubjectId] = useState<string | null>(null);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState<boolean>(false);
  const moreDesktopRef = useRef<HTMLDivElement | null>(null);
  const moreMobileRef = useRef<HTMLDivElement | null>(null);

  const [bootstrapData, setBootstrapData] = useState<AppBootstrapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Close More popover on outside click without changing active page
  useEffect(() => {
    if (!isMorePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = moreDesktopRef.current?.contains(target);
      const inMobile = moreMobileRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setIsMorePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMorePopoverOpen]);

  const loadBootstrap = useCallback(async () => {
    try {
      setError(null);
      api.invalidateCache('bootstrap');
      const data = await api.getBootstrap();
      setBootstrapData(data);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با پایگاه داده SQLite');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePlanMutated = useCallback(() => {
    api.invalidateCache('plans');
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const handleSelectMoreItem = (target: 'settings' | 'subjects') => {
    setActiveMenu(target);
    setIsMorePopoverOpen(false);
  };

  const handleInspectSubjectFromPlanner = useCallback((subjectId: string) => {
    setInitialReportSubjectId(subjectId);
    setActiveMenu('reports');
    setIsMorePopoverOpen(false);
  }, []);

  const isMoreSectionActive = activeMenu === 'settings' || activeMenu === 'subjects';

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 bg-student-canvas text-slate-900 dark:text-slate-100"
    >
      {/* =====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT (Section 1-1 & 1-3)
          Zone 1: Single text element wordmark
          Zone 2: 5 Main Navigation Items (۱. عملکرد | ۲. دروس | ۳. برنامه‌ریزی | ۴. راهنما | ۵. سایر)
          Zone 3: Primary action / theme control
      ===================================================================== */}
      <header className="mobile-safe-header sticky top-0 z-30 relative flex items-center justify-between gap-4 px-4 sm:px-8 h-16 bg-gradient-to-l from-indigo-100/90 via-sky-50/90 to-violet-100/85 dark:from-slate-900/95 dark:via-indigo-950/90 dark:to-slate-900/95 backdrop-blur-md border-b border-indigo-200/80 dark:border-indigo-900/70 shadow-2xs">
        {/* Spacer on mobile to balance right side so centered title never collides */}
        <div className="w-10 md:hidden shrink-0" aria-hidden="true" />

        {/* Zone 1: Centered on mobile, hover-only version tooltip on desktop */}
        <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-center justify-center shrink-0">
          <div className="relative group inline-flex items-center justify-center">
            <a
              href="#planner"
              onClick={(e) => {
                e.preventDefault();
                setActiveMenu('planner');
                setIsMorePopoverOpen(false);
              }}
              title={`Martia Planner — نسخه ${toPersianDigits(APP_VERSION)} (v${APP_VERSION})`}
              className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-l from-indigo-700 via-violet-600 to-purple-700 dark:from-indigo-300 dark:via-violet-300 dark:to-purple-300 bg-clip-text text-transparent whitespace-nowrap text-center cursor-pointer"
            >
              Martia Planner
            </a>

            {/* Hover-only Version Tooltip (Desktop mouse hover) */}
            <div
              role="tooltip"
              className="hidden md:flex items-center gap-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-800 text-white text-[11px] font-extrabold whitespace-nowrap shadow-lg border border-white/10 z-50 tabular-nums"
            >
              <span>نسخه {toPersianDigits(APP_VERSION)}</span>
              <span className="text-indigo-300 font-mono text-[10px]">(v{APP_VERSION})</span>
            </div>
          </div>
        </div>

        {/* Zone 2: 5 Desktop Navigation Links (Right-to-Left: ۱. عملکرد | ۲. دروس | ۳. برنامه‌ریزی | ۴. راهنما | ۵. سایر) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700 dark:text-slate-300">
          {/* ۱. عملکرد */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('dashboard');
              setIsMorePopoverOpen(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'dashboard'
                ? 'text-indigo-700 dark:text-indigo-300 font-extrabold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            عملکرد
          </button>

          {/* ۲. دروس */}
          <button
            type="button"
            onClick={() => {
              setInitialReportSubjectId(null);
              setActiveMenu('reports');
              setIsMorePopoverOpen(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'reports'
                ? 'text-indigo-700 dark:text-indigo-300 font-extrabold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            دروس
          </button>

          {/* ۳. برنامه‌ریزی (در مرکز نوار ناوبری) */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('planner');
              setIsMorePopoverOpen(false);
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'planner'
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-600/25'
                : 'bg-white/75 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-white dark:hover:bg-slate-800 border border-indigo-200/70 dark:border-indigo-800/60'
            }`}
          >
            برنامه‌ریزی
          </button>

          {/* ۴. راهنما */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('guide');
              setIsMorePopoverOpen(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'guide'
                ? 'text-indigo-700 dark:text-indigo-300 font-extrabold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            راهنما
          </button>

          {/* ۵. سایر (Pure Dropdown Submenu) */}
          <div className="relative" ref={moreDesktopRef}>
            <button
              type="button"
              onClick={() => setIsMorePopoverOpen((prev) => !prev)}
              aria-expanded={isMorePopoverOpen}
              className={`inline-flex items-center gap-1 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isMoreSectionActive
                  ? 'text-indigo-700 dark:text-indigo-300 font-extrabold underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>سایر</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  isMorePopoverOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isMorePopoverOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-indigo-950/15 space-y-1 z-50">
                <button
                  type="button"
                  onClick={() => handleSelectMoreItem('settings')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                    activeMenu === 'settings'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>تنظیمات</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMoreItem('subjects')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                    activeMenu === 'subjects'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>ایجاد درس</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Primary Action & Theme Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            aria-label="تغییر پوسته روز و شب"
            className="p-2.5 rounded-xl border border-indigo-200/80 dark:border-slate-700 bg-white/75 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN VIEWPORT CONTAINER
      ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-28 md:pb-12">
        {loading && (
          <div className="space-y-4 py-8">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
              <div className="h-44 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center space-y-3">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={loadBootstrap}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && bootstrapData && (
          <>
            {activeMenu === 'dashboard' && <DashboardView />}

            {activeMenu === 'planner' && (
              <PlannerView
                categories={bootstrapData.categories}
                studyTypes={bootstrapData.studyTypes}
                priorities={bootstrapData.priorities}
                subjects={bootstrapData.subjects}
                onDataMutated={handlePlanMutated}
                onNavigateToDefinitions={() => setActiveMenu('guide')}
                onInspectSubject={handleInspectSubjectFromPlanner}
              />
            )}

            {activeMenu === 'reports' && (
              <ReportsHubView
                subjects={bootstrapData.subjects}
                categories={bootstrapData.categories}
                onNavigateToPlanner={() => setActiveMenu('planner')}
                initialSubjectId={initialReportSubjectId}
              />
            )}

            {activeMenu === 'guide' && <MetricsDefinitionsView />}

            {activeMenu === 'subjects' && (
              <SubjectsView
                subjects={bootstrapData.subjects}
                onRefreshBootstrap={loadBootstrap}
              />
            )}

            {activeMenu === 'settings' && (
              <SettingsView
                categories={bootstrapData.categories}
                studyTypes={bootstrapData.studyTypes}
                priorities={bootstrapData.priorities}
                onRefreshBootstrap={loadBootstrap}
              />
            )}
          </>
        )}
      </main>

      {/* =====================================================================
          SECTION 1: 5-ITEM MOBILE BOTTOM NAVIGATION BAR (RIGHT-TO-LEFT)
          ۱. عملکرد | ۲. دروس | ۳. برنامه‌ریزی (مرکز - برجسته) | ۴. راهنما | ۵. سایر
          - Circular buttons (rounded-full)
          - Center «برنامه‌ریزی» button elevated above the bar with a curved arch
          - Harmonized soft tinted background matching the top header
      ===================================================================== */}
      <div
        ref={moreMobileRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none mobile-bottom-nav-shell bg-gradient-to-t from-indigo-950/15 via-indigo-950/5 to-transparent dark:from-black/60 dark:via-black/25 px-2.5 pt-3"
      >
        {/* Floating Sub-menu Popover above "سایر" when tapped on mobile */}
        {isMorePopoverOpen && (
          <div className="pointer-events-auto mx-auto max-w-md mb-2.5 flex justify-end px-1">
            <div className="w-48 rounded-2xl border border-indigo-200 dark:border-slate-700 bg-gradient-to-b from-indigo-50/95 to-white/95 dark:from-slate-900/95 dark:to-slate-900/95 backdrop-blur-xl p-1.5 shadow-xl shadow-indigo-950/20 space-y-1">
              <button
                type="button"
                onClick={() => handleSelectMoreItem('settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                  activeMenu === 'settings'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-100/60 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>تنظیمات</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectMoreItem('subjects')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                  activeMenu === 'subjects'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-100/60 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>ایجاد درس</span>
              </button>
            </div>
          </div>
        )}

        <nav
          aria-label="ناوبری پایین صفحه موبایل"
          className="pointer-events-auto relative mx-auto max-w-md rounded-3xl bg-gradient-to-l from-indigo-100/95 via-sky-50/95 to-violet-100/95 dark:from-slate-900/95 dark:via-indigo-950/95 dark:to-slate-900/95 backdrop-blur-xl border border-indigo-200/90 dark:border-indigo-800/80 shadow-lg shadow-indigo-950/15 grid grid-cols-5 items-center justify-items-center h-16 px-2 py-1"
        >
          {/* ۱. عملکرد (راست‌ترین دکمه دایره‌ای) */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('dashboard');
              setIsMorePopoverOpen(false);
            }}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeMenu === 'dashboard'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 ring-2 ring-white/80 dark:ring-slate-800'
                : 'bg-white/75 dark:bg-slate-800/75 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-bold border border-indigo-200/60 dark:border-slate-700/80'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="text-[9.5px] mt-0.5 whitespace-nowrap leading-tight">عملکرد</span>
          </button>

          {/* ۲. دروس */}
          <button
            type="button"
            onClick={() => {
              setInitialReportSubjectId(null);
              setActiveMenu('reports');
              setIsMorePopoverOpen(false);
            }}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeMenu === 'reports'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 ring-2 ring-white/80 dark:ring-slate-800'
                : 'bg-white/75 dark:bg-slate-800/75 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-bold border border-indigo-200/60 dark:border-slate-700/80'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="text-[9.5px] mt-0.5 whitespace-nowrap leading-tight">دروس</span>
          </button>

          {/* ۳. برنامه‌ریزی (دکمه مرکزی، کمی بالاتر و برجسته از کادر منوی پایین) */}
          <div className="relative flex items-center justify-center -mt-6">
            <button
              type="button"
              onClick={() => {
                setActiveMenu('planner');
                setIsMorePopoverOpen(false);
              }}
              className={`w-15 h-15 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ring-4 ring-indigo-100/95 dark:ring-slate-900 shadow-xl ${
                activeMenu === 'planner'
                  ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white font-black shadow-indigo-600/40 scale-105'
                  : 'bg-gradient-to-br from-white via-indigo-50 to-sky-100 dark:from-slate-800 dark:via-indigo-950 dark:to-slate-800 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-300 dark:border-indigo-700 hover:scale-105'
              }`}
            >
              <CalendarCheck2 className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-0.5 whitespace-nowrap leading-tight">برنامه‌ریزی</span>
            </button>
          </div>

          {/* ۴. راهنما */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('guide');
              setIsMorePopoverOpen(false);
            }}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeMenu === 'guide'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 ring-2 ring-white/80 dark:ring-slate-800'
                : 'bg-white/75 dark:bg-slate-800/75 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-bold border border-indigo-200/60 dark:border-slate-700/80'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="text-[9.5px] mt-0.5 whitespace-nowrap leading-tight">راهنما</span>
          </button>

          {/* ۵. سایر (چپ‌ترین دکمه دایره‌ای) */}
          <button
            type="button"
            onClick={() => setIsMorePopoverOpen((prev) => !prev)}
            aria-expanded={isMorePopoverOpen}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
              isMoreSectionActive || isMorePopoverOpen
                ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 ring-2 ring-white/80 dark:ring-slate-800'
                : 'bg-white/75 dark:bg-slate-800/75 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-bold border border-indigo-200/60 dark:border-slate-700/80'
            }`}
          >
            <MoreHorizontal className="w-4 h-4 shrink-0" />
            <span className="text-[9.5px] mt-0.5 whitespace-nowrap leading-tight">سایر</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
