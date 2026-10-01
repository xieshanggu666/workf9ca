import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const db = new DatabaseSync(path.join(__dirname, 'sky.db'))

db.exec(`
CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY,
  name TEXT,
  money REAL DEFAULT 20000,
  rep INTEGER DEFAULT 50,
  level INTEGER DEFAULT 1,
  season INTEGER DEFAULT 1,
  season_pts INTEGER DEFAULT 0,
  season_pos INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS airships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  speed INTEGER DEFAULT 60,
  dur INTEGER DEFAULT 80,
  turn INTEGER DEFAULT 55,
  acc INTEGER DEFAULT 60,
  parts_dur INTEGER DEFAULT 100,
  hp INTEGER DEFAULT 100
);
CREATE TABLE IF NOT EXISTS pilots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  skill INTEGER DEFAULT 50,
  courage INTEGER DEFAULT 50,
  exp INTEGER DEFAULT 0,
  wage INTEGER DEFAULT 60,
  mood INTEGER DEFAULT 70
);
CREATE TABLE IF NOT EXISTS mechanics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  skill INTEGER DEFAULT 50,
  wage INTEGER DEFAULT 40,
  mood INTEGER DEFAULT 70
);
CREATE TABLE IF NOT EXISTS upgrades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slot TEXT NOT NULL,          -- 引擎/护甲/氮气/翼板/龙骨
  stat TEXT NOT NULL,          -- speed/dur/turn/acc 加成项
  bonus INTEGER NOT NULL,
  price INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  equipped INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS circuits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  diff INTEGER NOT NULL,       -- 1..5 难度
  weather TEXT NOT NULL,       -- 晴/风/雨/雾/雷暴
  bonus_pts INTEGER DEFAULT 0,
  done INTEGER DEFAULT 0,
  rank INTEGER,
  finished INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target INTEGER DEFAULT 0,
  earned INTEGER DEFAULT 0,
  reward INTEGER DEFAULT 0,
  rep INTEGER DEFAULT 0,
  affinity INTEGER DEFAULT 60
);
CREATE TABLE IF NOT EXISTS race_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circuit_id INTEGER,
  race_id INTEGER,             -- 对应 races.id，一场比赛一条流水
  season INTEGER,
  rank INTEGER,
  pts INTEGER,
  money REAL,
  note TEXT,
  ts TEXT
);
-- 比赛记录：动画 / 实时排名 / 最终奖励共用的唯一事实来源
-- status=running 未完赛（可中断续看）；settled=1 已结算（奖励只发一次，可历史回放）
CREATE TABLE IF NOT EXISTS races (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circuit_id INTEGER NOT NULL,
  season INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'running',  -- running | settled
  settled INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  pts INTEGER DEFAULT 0,
  money REAL DEFAULT 0,
  wear INTEGER DEFAULT 0,
  rep_gain INTEGER DEFAULT 0,
  record TEXT NOT NULL,                    -- 分段过程、快照因素、事件与奖励（JSON）
  watch_el REAL NOT NULL DEFAULT 0,        -- 最近观赛进度（秒），中断续看
  created_at TEXT,
  settled_at TEXT,
  voided_at TEXT                           -- 作废时间：越站迁移作废的记录，不再参与历史/结算
);
`)

// 老库兼容：为 race_log 增补 race_id 列（已存在则忽略）
try { db.exec('ALTER TABLE race_log ADD COLUMN race_id INTEGER') } catch (e) {}
// 老库兼容：races 增加 voided_at 列（越站历史修复作废记录用）
try { db.exec('ALTER TABLE races ADD COLUMN voided_at TEXT') } catch (e) {}

export function run(sql, ...p) { return db.prepare(sql).run(...p) }
export function all(sql, ...p) { return db.prepare(sql).all(...p) }
export function get(sql, ...p) { return db.prepare(sql).get(...p) }