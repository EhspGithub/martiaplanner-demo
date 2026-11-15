import { addDaysISO, getTodayISO } from './jalali.ts';

export const SAMPLE_DEMO_PREFIX = 'sample_demo_';
export const SAMPLE_DEMO_TAG = '#sample_demo';

export interface SampleGeneratorContext {
  subjects: Array<{
    id: string;
    name: string;
    units?: Array<{ id: string; subject_id: string; title: string; sort_order?: number }>;
  }>;
  units?: Array<{ id: string; subject_id: string; title: string; sort_order?: number }>;
  categories: Array<{
    id: string;
    title: string;
    is_study: number;
    activity_group?: string;
  }>;
  studyTypes: Array<{
    id: string;
    title: string;
  }>;
}

export interface GeneratedSampleDataset {
  plans: Array<{
    id: string;
    plan_date: string;
    category_id: string;
    category_title_snapshot: string;
    is_study: number;
    activity_group_snapshot: 'educational' | 'restricted' | 'essential';
    subject_id: string | null;
    subject_name_snapshot: string | null;
    unit_id: string | null;
    unit_title_snapshot: string | null;
    study_type_id: string | null;
    study_type_title_snapshot: string | null;
    priority_code: string;
    initial_predicted_minutes: number;
    predicted_minutes: number;
    target_exercises: number | null;
    reminder_time: string | null;
    description: string;
    status: 'pending' | 'completed' | 'partial';
    custom_sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  performances: Array<{
    id: string;
    plan_id: string;
    actual_minutes: number;
    exercises_count: number | null;
    learning_quality: string | null;
    completion_status: 'completed' | 'partial';
    notes: string;
    logged_at: string;
    updated_at: string;
  }>;
  timeBudgets: Array<{
    plan_date: string;
    budget_minutes: number;
    input_unit: 'hours' | 'minutes';
    updated_at: string;
  }>;
  studyGoals: Array<{
    goal_date: string;
    target_study_minutes: number;
    target_exercises_count: number;
    target_completed_tasks: number;
    custom_goals: any[];
    updated_at: string;
  }>;
  stats: {
    daysCount: number;
    activeStudyDaysCount: number;
    plansCount: number;
    performancesCount: number;
    subjectsCoveredCount: number;
  };
}

// Deterministic pseudo-random helper so sample data looks natural and varied
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function generateThreeMonthSampleData(
  ctx: SampleGeneratorContext,
  refTodayIso: string = getTodayISO()
): GeneratedSampleDataset {
  const plans: GeneratedSampleDataset['plans'] = [];
  const performances: GeneratedSampleDataset['performances'] = [];
  const timeBudgets: GeneratedSampleDataset['timeBudgets'] = [];
  const studyGoals: GeneratedSampleDataset['studyGoals'] = [];

  // Map units per subject
  const unitsBySubject = new Map<string, Array<{ id: string; title: string }>>();
  for (const s of ctx.subjects) {
    if (Array.isArray(s.units) && s.units.length > 0) {
      unitsBySubject.set(
        s.id,
        s.units.map((u) => ({ id: u.id, title: u.title }))
      );
    }
  }
  if (Array.isArray(ctx.units)) {
    for (const u of ctx.units) {
      const list = unitsBySubject.get(u.subject_id) || [];
      if (!list.some((x) => x.id === u.id)) {
        list.push({ id: u.id, title: u.title });
      }
      unitsBySubject.set(u.subject_id, list);
    }
  }

  const activeSubjects = ctx.subjects.filter((s) => s && s.id && s.name);
  const studyCat =
    ctx.categories.find((c) => Number(c.is_study) === 1) || {
      id: 'cat-study',
      title: 'درس',
      is_study: 1,
      activity_group: 'educational',
    };

  const restrictedCats = ctx.categories.filter(
    (c) => Number(c.is_study) === 0 && c.activity_group === 'restricted'
  );
  const fallbackRestrictedCats =
    restrictedCats.length > 0
      ? restrictedCats
      : [
          {
            id: 'cat-phone-game',
            title: 'بازی با گوشی / کنسول',
            is_study: 0,
            activity_group: 'restricted',
          },
          {
            id: 'cat-tv',
            title: 'تماشای فیلم و تلویزیون',
            is_study: 0,
            activity_group: 'restricted',
          },
        ];

  const essentialCats = ctx.categories.filter(
    (c) => Number(c.is_study) === 0 && c.activity_group !== 'restricted'
  );
  const fallbackEssentialCats =
    essentialCats.length > 0
      ? essentialCats
      : [
          {
            id: 'cat-rest',
            title: 'استراحت و تجدید قوا',
            is_study: 0,
            activity_group: 'essential',
          },
          {
            id: 'cat-sport',
            title: 'ورزش و پیاده‌روی',
            is_study: 0,
            activity_group: 'essential',
          },
        ];

  const studyTypes =
    ctx.studyTypes.length > 0
      ? ctx.studyTypes
      : [
          { id: 'st-homework', title: 'تکلیف' },
          { id: 'st-review', title: 'پس‌خوانی و مرور' },
          { id: 'st-exam', title: 'آمادگی امتحان و تست' },
          { id: 'st-preview', title: 'پیش‌خوانی' },
        ];

  const priorities = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1'];
  const studyDescriptions = [
    'مرور نکات کلیدی کتاب و حل تمرین‌های تشریحی',
    'حل تست‌های آموزشی و بررسی پاسخنامه تشریحی',
    'مطالعه عمیق متن درس و خلاصه‌نویسی در دفتر',
    'آمادگی برای پرسش کلاسی و آزمونک هفتگی',
    'بررسی اشتباهات آزمون قبلی و تثبیت فرمول‌ها',
    'پیش‌خوانی مبحث جدید پیش از تدریس معلم',
    'تکمیل تمرین‌های صفحه به صفحه کتاب کار',
  ];
  const perfNotes = [
    'تمرکز عالی و تسلط کامل بر مباحث فصل',
    'کیفیت مطالعه خوب بود؛ چند تست زمان‌بر علامت‌گذاری شد',
    'مطالعه طبق برنامه پیش رفت و خلاصه‌نویسی تکمیل شد',
    'بخشی از تمرین‌ها به جلسه مرور بعدی موکول شد',
    'تسلط بالا در حل سوالات تشریحی و تستی',
  ];
  const recDescriptions = [
    'سرگرمی و بازی عصرگاهی پس از اتمام دروس اصلی',
    'تماشای انیمیشن و برنامه تلویزیونی',
    'وب‌گردی، شبکه اجتماعی و گفت‌وگو با دوستان',
    'بازی ویدیویی در زمان استراحت',
  ];

  const totalDays = 90;
  let activeStudyDaysCount = 0;
  const subjectsUsed = new Set<string>();
  const taggedNow = `${new Date().toISOString()}${SAMPLE_DEMO_TAG}`;

  for (let offset = -(totalDays - 1); offset <= 0; offset++) {
    const dayIndex = offset + (totalDays - 1); // 0 .. 89
    const dateIso = addDaysISO(refTodayIso, offset);
    const seedBase = (dayIndex + 1) * 137;

    // Gradual improvement factor over 3 months (0.0 in month 1 -> 1.0 in month 3)
    const progressFactor = dayIndex / totalDays;

    // Rest/off days (~7 days across 90 days, e.g., every 13th day, never today)
    const isRestDay = offset < -2 && dayIndex % 13 === 5;
    if (!isRestDay) {
      activeStudyDaysCount++;
    }

    // Daily Time Budget (between 300 and 450 mins, in multiples of 30)
    const budgetChoices = [300, 330, 360, 390, 420, 450];
    const budgetMins =
      budgetChoices[Math.floor(seededRandom(seedBase + 1) * budgetChoices.length)];
    timeBudgets.push({
      plan_date: dateIso,
      budget_minutes: budgetMins,
      input_unit: 'hours',
      updated_at: taggedNow,
    });

    // Daily Study Goal
    const targetStudyMins = isRestDay
      ? 120
      : 180 + Math.floor(seededRandom(seedBase + 2) * 4) * 30; // 180..270
    const targetExercises = isRestDay
      ? 20
      : 35 + Math.floor(seededRandom(seedBase + 3) * 5) * 10; // 35..75
    const targetTasks = isRestDay ? 2 : 3 + (dayIndex % 2);
    studyGoals.push({
      goal_date: dateIso,
      target_study_minutes: targetStudyMins,
      target_exercises_count: targetExercises,
      target_completed_tasks: targetTasks,
      custom_goals: [
        {
          id: 'cgoal-vocab',
          title: 'حفظ لغات جدید (زبان و عربی)',
          unitLabel: 'لغت',
          targetValue: 15,
          currentValue: Math.min(15, 10 + Math.floor(seededRandom(seedBase + 4) * 7)),
          color: 'purple',
        },
      ],
      updated_at: taggedNow,
    });

    let sortOrder = 1;

    // 1. Generate Study Tasks (unless it's a pure rest day)
    if (!isRestDay && activeSubjects.length > 0) {
      // 2 to 4 study tasks per day
      const studyTasksCount = 2 + Math.floor(seededRandom(seedBase + 5) * 3); // 2, 3, or 4
      for (let t = 0; t < studyTasksCount; t++) {
        const taskSeed = seedBase + (t + 1) * 31;
        const subjIdx = (dayIndex * 3 + t * 2) % activeSubjects.length;
        const subj = activeSubjects[subjIdx];
        subjectsUsed.add(subj.id);

        const subjUnits = unitsBySubject.get(subj.id) || [];
        // Progress through units naturally over the 90 days
        const unitIdx =
          subjUnits.length > 0
            ? Math.min(
                subjUnits.length - 1,
                Math.floor(progressFactor * subjUnits.length + (t % 2)) % subjUnits.length
              )
            : -1;
        const chosenUnit = unitIdx >= 0 ? subjUnits[unitIdx] : null;

        const stObj = studyTypes[(dayIndex + t) % studyTypes.length];
        const prioCode = priorities[Math.min(priorities.length - 1, t + (dayIndex % 3))];

        const predChoices = [30, 45, 60, 75, 90, 105];
        const predictedMins =
          predChoices[Math.floor(seededRandom(taskSeed + 1) * predChoices.length)];
        const targetEx =
          10 + Math.floor(seededRandom(taskSeed + 2) * 7) * 5; // 10 .. 40

        // Determine status:
        // On today (offset === 0), make last task pending so user can also test logging if they want
        // Across history, ~76% completed, ~15% partial, ~9% pending
        const statusRoll = seededRandom(taskSeed + 3);
        let status: 'completed' | 'partial' | 'pending' = 'completed';
        if (offset === 0 && t === studyTasksCount - 1) {
          status = 'pending';
        } else if (statusRoll > 0.91 - progressFactor * 0.04) {
          status = 'pending';
        } else if (statusRoll > 0.76 - progressFactor * 0.05) {
          status = 'partial';
        }

        const planId = `${SAMPLE_DEMO_PREFIX}plan_${dateIso}_s${t + 1}`;
        const createdIso = `${dateIso}T07:30:00.000Z`;

        plans.push({
          id: planId,
          plan_date: dateIso,
          category_id: studyCat.id,
          category_title_snapshot: studyCat.title,
          is_study: 1,
          activity_group_snapshot: 'educational',
          subject_id: subj.id,
          subject_name_snapshot: subj.name,
          unit_id: chosenUnit ? chosenUnit.id : null,
          unit_title_snapshot: chosenUnit ? chosenUnit.title : 'فصل اول',
          study_type_id: stObj.id,
          study_type_title_snapshot: stObj.title,
          priority_code: prioCode,
          initial_predicted_minutes: predictedMins,
          predicted_minutes: predictedMins,
          target_exercises: targetEx,
          reminder_time: t === 0 ? '16:00' : t === 1 ? '18:00' : null,
          description: studyDescriptions[(dayIndex + t) % studyDescriptions.length],
          status,
          custom_sort_order: sortOrder++,
          created_at: createdIso,
          updated_at: createdIso,
        });

        if (status === 'completed' || status === 'partial') {
          const varianceChoices =
            status === 'completed' ? [-10, -5, 0, 0, 5, 10, 15] : [-25, -20, -15, -10];
          const delta =
            varianceChoices[Math.floor(seededRandom(taskSeed + 4) * varianceChoices.length)];
          const actualMins = Math.max(15, predictedMins + delta);

          const exRatio =
            status === 'completed'
              ? 0.85 + seededRandom(taskSeed + 5) * 0.35
              : 0.4 + seededRandom(taskSeed + 5) * 0.35;
          const actualEx = Math.max(0, Math.round(targetEx * exRatio));

          // Learning quality 5..10 (gradually higher in recent weeks)
          const baseQual = status === 'completed' ? 6.5 : 5.0;
          const rawQual =
            baseQual + progressFactor * 1.8 + seededRandom(taskSeed + 6) * 1.7;
          const qualityScore = Math.min(10, Math.max(4, Math.round(rawQual * 2) / 2));

          performances.push({
            id: `${SAMPLE_DEMO_PREFIX}perf_${dateIso}_s${t + 1}`,
            plan_id: planId,
            actual_minutes: actualMins,
            exercises_count: actualEx,
            learning_quality: String(qualityScore),
            completion_status: status,
            notes: perfNotes[(dayIndex + t) % perfNotes.length],
            logged_at: `${dateIso}T20:30:00.000Z`,
            updated_at: `${dateIso}T20:30:00.000Z`,
          });
        }
      }
    }

    // 2. Generate Restricted / Recreational Activities (~68% of days)
    // Include both within-cap days (<= 120 mins) and over-cap days (> 120 mins, e.g., 135..180 mins)
    const hasRecreation = isRestDay || seededRandom(seedBase + 70) < 0.68;
    if (hasRecreation) {
      const isOverCapDay = isRestDay || dayIndex % 7 === 6 || dayIndex % 11 === 3;
      const recSessionsCount = isOverCapDay ? 2 : 1;

      for (let r = 0; r < recSessionsCount; r++) {
        const recCat =
          fallbackRestrictedCats[(dayIndex + r) % fallbackRestrictedCats.length];
        const predRec = isOverCapDay ? (r === 0 ? 60 : 45) : 45;
        const actualRec = isOverCapDay
          ? r === 0
            ? 85
            : 65 // Total 150 mins (> 120m cap!)
          : 30 + Math.floor(seededRandom(seedBase + 80 + r) * 4) * 15; // 30..75 mins (within cap)

        const recPlanId = `${SAMPLE_DEMO_PREFIX}plan_${dateIso}_r${r + 1}`;
        const createdIso = `${dateIso}T19:00:00.000Z`;

        plans.push({
          id: recPlanId,
          plan_date: dateIso,
          category_id: recCat.id,
          category_title_snapshot: recCat.title,
          is_study: 0,
          activity_group_snapshot: 'restricted',
          subject_id: null,
          subject_name_snapshot: null,
          unit_id: null,
          unit_title_snapshot: null,
          study_type_id: null,
          study_type_title_snapshot: null,
          priority_code: 'C2',
          initial_predicted_minutes: predRec,
          predicted_minutes: predRec,
          target_exercises: null,
          reminder_time: null,
          description: recDescriptions[(dayIndex + r) % recDescriptions.length],
          status: 'completed',
          custom_sort_order: sortOrder++,
          created_at: createdIso,
          updated_at: createdIso,
        });

        performances.push({
          id: `${SAMPLE_DEMO_PREFIX}perf_${dateIso}_r${r + 1}`,
          plan_id: recPlanId,
          actual_minutes: actualRec,
          exercises_count: null,
          learning_quality: null,
          completion_status: 'completed',
          notes: isOverCapDay
            ? 'زمان سرگرمی بیش از حد پیش‌بینی‌شده طول کشید'
            : 'استفاده کنترل‌شده در سقف مجاز روزانه',
          logged_at: `${dateIso}T21:45:00.000Z`,
          updated_at: `${dateIso}T21:45:00.000Z`,
        });
      }
    }

    // 3. Generate Essential / Recovery Activity (~50% of days)
    if (dayIndex % 2 === 0) {
      const essCat = fallbackEssentialCats[dayIndex % fallbackEssentialCats.length];
      const essMins = 45 + (dayIndex % 3) * 15;
      const essPlanId = `${SAMPLE_DEMO_PREFIX}plan_${dateIso}_e1`;
      const createdIso = `${dateIso}T14:00:00.000Z`;

      plans.push({
        id: essPlanId,
        plan_date: dateIso,
        category_id: essCat.id,
        category_title_snapshot: essCat.title,
        is_study: 0,
        activity_group_snapshot: 'essential',
        subject_id: null,
        subject_name_snapshot: null,
        unit_id: null,
        unit_title_snapshot: null,
        study_type_id: null,
        study_type_title_snapshot: null,
        priority_code: 'B2',
        initial_predicted_minutes: essMins,
        predicted_minutes: essMins,
        target_exercises: null,
        reminder_time: null,
        description: 'استراحت، ورزش و بازیابی انرژی روزانه',
        status: 'completed',
        custom_sort_order: sortOrder++,
        created_at: createdIso,
        updated_at: createdIso,
      });

      performances.push({
        id: `${SAMPLE_DEMO_PREFIX}perf_${dateIso}_e1`,
        plan_id: essPlanId,
        actual_minutes: essMins,
        exercises_count: null,
        learning_quality: null,
        completion_status: 'completed',
        notes: 'انجام طبق برنامه روزانه',
        logged_at: `${dateIso}T16:30:00.000Z`,
        updated_at: `${dateIso}T16:30:00.000Z`,
      });
    }
  }

  return {
    plans,
    performances,
    timeBudgets,
    studyGoals,
    stats: {
      daysCount: totalDays,
      activeStudyDaysCount,
      plansCount: plans.length,
      performancesCount: performances.length,
      subjectsCoveredCount: subjectsUsed.size,
    },
  };
}
