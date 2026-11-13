use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_martia_planner_tables",
        sql: "
            CREATE TABLE IF NOT EXISTS activity_categories (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              is_study INTEGER NOT NULL DEFAULT 0,
              icon TEXT NOT NULL DEFAULT 'BookOpen',
              color TEXT NOT NULL DEFAULT 'indigo',
              sort_order INTEGER NOT NULL DEFAULT 1,
              is_active INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS study_activity_types (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT NOT NULL DEFAULT '',
              badge_color TEXT NOT NULL DEFAULT 'blue',
              sort_order INTEGER NOT NULL DEFAULT 1,
              is_active INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS priority_levels (
              code TEXT PRIMARY KEY,
              group_name TEXT NOT NULL,
              level_num INTEGER NOT NULL,
              label TEXT NOT NULL,
              color_code TEXT NOT NULL,
              sort_rank INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subjects (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              grade_level TEXT NOT NULL DEFAULT 'هشتم',
              unit_type_label TEXT NOT NULL DEFAULT 'درس',
              color_code TEXT NOT NULL DEFAULT 'indigo',
              sort_order INTEGER NOT NULL DEFAULT 1,
              is_archived INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subject_units (
              id TEXT PRIMARY KEY,
              subject_id TEXT NOT NULL,
              title TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 1,
              is_archived INTEGER NOT NULL DEFAULT 0,
              FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS daily_plans (
              id TEXT PRIMARY KEY,
              plan_date TEXT NOT NULL,
              category_id TEXT NOT NULL,
              category_title_snapshot TEXT NOT NULL,
              is_study INTEGER NOT NULL DEFAULT 1,
              subject_id TEXT,
              subject_name_snapshot TEXT,
              unit_id TEXT,
              unit_title_snapshot TEXT,
              study_type_id TEXT,
              study_type_title_snapshot TEXT,
              priority_code TEXT NOT NULL,
              initial_predicted_minutes INTEGER NOT NULL,
              predicted_minutes INTEGER NOT NULL,
              reminder_time TEXT,
              description TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'pending',
              custom_sort_order INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS performance_logs (
              id TEXT PRIMARY KEY,
              plan_id TEXT NOT NULL UNIQUE,
              actual_minutes INTEGER NOT NULL,
              exercises_count INTEGER,
              learning_quality TEXT,
              completion_status TEXT NOT NULL DEFAULT 'completed',
              notes TEXT NOT NULL DEFAULT '',
              logged_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS daily_study_goals (
              id TEXT PRIMARY KEY,
              goal_date TEXT NOT NULL,
              title TEXT NOT NULL,
              goal_type TEXT NOT NULL DEFAULT 'study_minutes',
              target_value INTEGER NOT NULL DEFAULT 120,
              current_value INTEGER NOT NULL DEFAULT 0,
              unit_label TEXT NOT NULL DEFAULT 'دقیقه',
              created_at TEXT NOT NULL
            );
        ",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:martia_planner.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running MartiaPlanner tauri application");
}
