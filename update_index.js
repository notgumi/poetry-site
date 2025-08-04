// 依 data/posts/*.json 的 date 排序，輸出 data/index.json（僅檔名陣列）
// 用法：
//   node update_index.js                             # 全量掃描重建
//   node update_index.js data/posts/a_b.json ...     # 也可傳入變更的 JSON，仍會讀取所有 posts 以正確排序

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "data/posts");
const INDEX_FILE = path.join(__dirname, "data/index.json");

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); }
  catch { return null; }
}

function getAllPostSlugs() {
  return (fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR) : [])
    .filter(f => f.endsWith(".json"));
}

function toISOorYMD(dateStr, fallbackISO) {
  // 接受 YYYY-MM-DD 或 ISO；其他情況用 fallback
  if (!dateStr) return fallbackISO;
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (ymd.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallbackISO : d.toISOString().slice(0,10);
}

function buildIndex() {
  const slugs = getAllPostSlugs();
  const rows = [];

  for (const slug of slugs) {
    const p = path.join(POSTS_DIR, slug);
    const stat = fs.statSync(p);
    const fallbackISO = new Date(stat.mtime).toISOString().slice(0,10);

    const data = safeReadJSON(p) || {};
    const date = toISOorYMD(data.date, fallbackISO);

    rows.push({ slug, date });
  }

  // 依日期新到舊
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 僅輸出檔名陣列
  const list = rows.map(r => r.slug);
  fs.writeFileSync(INDEX_FILE, JSON.stringify(list, null, 2), "utf-8");
  console.log(`📚 index.json 已更新，共 ${list.length} 筆。`);
}

(function main() {
  // 即使有傳變更檔，也仍全量讀取以確保整體排序正確且包含新檔
  buildIndex();
})();
