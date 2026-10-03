import { DatabaseSync } from "node:sqlite";

export interface Task {
  id: number;
  title: string;
  remind_at: number | null; // unix ms
  notified: number;
  done: number;
}

const db = new DatabaseSync(process.env.DB_PATH ?? "planner.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    remind_at INTEGER,
    notified INTEGER NOT NULL DEFAULT 0,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function addTask(title: string, remindAt: number | null): number {
  const res = db
    .prepare("INSERT INTO tasks (title, remind_at, created_at) VALUES (?, ?, ?)")
    .run(title, remindAt, Date.now());
  return Number(res.lastInsertRowid);
}

export function getTask(id: number): Task | undefined {
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
}

export function listOpen(): Task[] {
  return db
    .prepare(
      "SELECT * FROM tasks WHERE done = 0 ORDER BY remind_at IS NULL, remind_at, id",
    )
    .all() as unknown as Task[];
}

export function listBetween(from: number, to: number): Task[] {
  return db
    .prepare(
      "SELECT * FROM tasks WHERE done = 0 AND remind_at BETWEEN ? AND ? ORDER BY remind_at",
    )
    .all(from, to) as unknown as Task[];
}

export function dueTasks(now: number): Task[] {
  return db
    .prepare(
      "SELECT * FROM tasks WHERE done = 0 AND notified = 0 AND remind_at IS NOT NULL AND remind_at <= ?",
    )
    .all(now) as unknown as Task[];
}

export function markNotified(id: number): void {
  db.prepare("UPDATE tasks SET notified = 1 WHERE id = ?").run(id);
}

export function markDone(id: number): void {
  db.prepare("UPDATE tasks SET done = 1 WHERE id = ?").run(id);
}

export function snooze(id: number, until: number): void {
  db.prepare("UPDATE tasks SET remind_at = ?, notified = 0 WHERE id = ?").run(until, id);
}

export function deleteTask(id: number): boolean {
  return Number(db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes) > 0;
}

export function getSetting(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
