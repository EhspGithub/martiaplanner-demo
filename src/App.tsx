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
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState<boolean>(false);
  const moreDesktopRef = useRef<HTMLDivElement | null>(null);
  const moreMobileRef = useRef<HTMLDivElement | null>(null);

  const [bootstrapData, setBootstrapData] = useState<AppBootstrapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

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
      const data = await api.getBootstrap();
      setBootstrapData(data);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با پایگاه داده SQLite');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const handleSelectMoreItem = (target: 'settings' | 'subjects') => {
    setActiveMenu(target);
    setIsMorePopoverOpen(false);
  };

  const isMoreSectionActive = activeMenu === 'settings' || activeMenu === 'subjects';

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 bg-student-canvas text-slate-900 dark:text-slate-100"
    >
      {/* =====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT
          Zone 1: Single text element wordmark
          Zone 2: 5 Main Navigation Items (۱. عملکرد | ۲. برنامه‌ریزی | ۳. دروس | ۴. راهنما | ۵. سایر)
          Zone 3: Primary action / theme control
      ===================================================================== */}
      <header className="mobile-safe-header sticky top-0 z-30 flex items-center justify-between gap-6 px-4 sm:px-8 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark (version badge hidden in Demo mode) */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="#planner"
            onClick={(e) => {
              e.preventDefault();
              setActiveMenu('planner');
              setIsMorePopoverOpen(false);
            }}
            className="text-lg font-black tracking-tight bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap"
          >
            MartiaPlanner
          </a>
          {!isDemoMode && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 tabular-nums">
              v{toPersianDigits(APP_VERSION)}
            </span>
          )}
        </div>

        {/* Zone 2: 5 Desktop Navigation Links (Right-to-Left) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {/* ۱. عملکرد */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('dashboard');
              setIsMorePopoverOpen(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            عملکرد
          </button>

          {/* ۲. برنامه‌ریزی */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('planner');
              setIsMorePopoverOpen(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'planner'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            برنامه‌ریزی
          </button>

          {/* ۳. دروس */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('reports');
              setIsMorePopoverOpen(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'reports'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            دروس
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
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            راهنما
          </button>

          {/* ۵. سایر (Pure Dropdown Submenu — Does NOT auto-navigate on click per Section 2) */}
          <div className="relative" ref={moreDesktopRef}>
            <button
              type="button"
              onClick={() => setIsMorePopoverOpen((prev) => !prev)}
              aria-expanded={isMorePopoverOpen}
              className={`inline-flex items-center gap-1 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isMoreSectionActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-900 dark:hover:text-white'
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
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN VIEWPORT CONTAINER
      ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-24 md:pb-12">
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
                onDataMutated={loadBootstrap}
                onNavigateToDefinitions={() => setActiveMenu('guide')}
              />
            )}

            {activeMenu === 'reports' && (
              <ReportsHubView
                subjects={bootstrapData.subjects}
                categories={bootstrapData.categories}
                onNavigateToPlanner={() => setActiveMenu('planner')}
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
          SECTION 2: 5-ITEM MOBILE BOTTOM NAVIGATION BAR (RIGHT-TO-LEFT)
          ۱. عملکرد | ۲. برنامه‌ریزی | ۳. دروس | ۴. راهنما | ۵. سایر
      ===================================================================== */}
      <div
        ref={moreMobileRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none mobile-bottom-nav-shell bg-gradient-to-t from-slate-950/15 via-slate-950/5 to-transparent dark:from-black/50 dark:via-black/20 px-2 pt-1.5"
      >
        {/* Floating Sub-menu Popover above "سایر" when tapped on mobile (only opens submenu, no auto-redirect) */}
        {isMorePopoverOpen && (
          <div className="pointer-events-auto mx-auto max-w-md mb-2 flex justify-end px-1">
            <div className="w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-xl shadow-indigo-950/20 space-y-1">
              <button
                type="button"
                onClick={() => handleSelectMoreItem('settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
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
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                  activeMenu === 'subjects'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
          className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/90 shadow-lg shadow-indigo-950/15 grid grid-cols-5 items-center h-15 p-1 gap-0.5"
        >
          {/* ۱. عملکرد */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('dashboard');
              setIsMorePopoverOpen(false);
            }}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer ${
              activeMenu === 'dashboard'
                ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] mt-1 whitespace-nowrap">عملکرد</span>
          </button>

          {/* ۲. برنامه‌ریزی */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('planner');
              setIsMorePopoverOpen(false);
            }}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer ${
              activeMenu === 'planner'
                ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span className="text-[10px] mt-1 whitespace-nowrap">برنامه‌ریزی</span>
          </button>

          {/* ۳. دروس */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('reports');
              setIsMorePopoverOpen(false);
            }}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer ${
              activeMenu === 'reports'
                ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px] mt-1 whitespace-nowrap">دروس</span>
          </button>

          {/* ۴. راهنما */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu('guide');
              setIsMorePopoverOpen(false);
            }}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer ${
              activeMenu === 'guide'
                ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-[10px] mt-1 whitespace-nowrap">راهنما</span>
          </button>

          {/* ۵. سایر (Pure Submenu Toggle — Never auto-navigates) */}
          <button
            type="button"
            onClick={() => setIsMorePopoverOpen((prev) => !prev)}
            aria-expanded={isMorePopoverOpen}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer ${
              isMoreSectionActive || isMorePopoverOpen
                ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-[10px] mt-1 whitespace-nowrap">سایر</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
