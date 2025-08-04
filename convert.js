const fs = require("fs");
const path = require("path");

const inputDir = path.join(__dirname, "raw_poems");
const outputDir = path.join(__dirname, "data/posts");
const indexPath = path.join(__dirname, "data/index.json");

// 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 載入現有 index.json（檔名清單）
let indexList = [];
if (fs.existsSync(indexPath)) {
  try {
    indexList = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch (e) {
    console.warn("⚠️ 無法解析 index.json，將從空白開始");
    indexList = [];
  }
}

// 把檔名轉成 JSON 物件（讀取 data/posts 裡的 date）
function loadIndexWithDates(list) {
  return list.map((slug) => {
    const jsonFile = path.join(outputDir, slug);
    if (!fs.existsSync(jsonFile)) return null;
    try {
      const post = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
      return { slug, date: post.date || "1970-01-01" };
    } catch {
      return { slug, date: "1970-01-01" };
    }
  }).filter(Boolean);
}

// 解析 txt 檔案 → JSON 資料
function parseTxtFile(txtPath, oldData = {}) {
  const raw = fs.readFileSync(txtPath, "utf-8").trim();
  const [title, authorWithExt] = path.basename(txtPath).split("_");
  const author = authorWithExt.replace(".txt", "");

  return {
    title,
    author,
    content: raw.replace(/\r?\n/g, "\\n"),
    notes: oldData.notes || "（請填寫補充說明）",
    tags: oldData.tags || [],
    date: new Date().toISOString().split("T")[0],
  };
}

// 寫入單篇 JSON
function writePostJson(data) {
  const slug = `${data.title}_${data.author}.json`;
  const outPath = path.join(outputDir, slug);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ 已更新：${slug}`);
  return slug;
}

// 主程式
function main() {
  const args = process.argv.slice(2); // 允許傳入特定 txt 檔
  let toProcess = [];

  if (args.length > 0) {
    // 僅處理傳入的 txt
    toProcess = args.filter(f => f.endsWith(".txt")).map(f => path.basename(f));
  } else {
    // 沒有參數 → 找出新詩（index.json 中沒有）
    const allTxt = fs.readdirSync(inputDir).filter(f => f.endsWith(".txt"));
    const existingTitles = indexList.map(f => f.replace(".json", ""));
    toProcess = allTxt.filter(f => {
      const base = f.replace(".txt", "");
      return !existingTitles.includes(base);
    });
  }

  if (toProcess.length === 0) {
    console.log("沒有新或指定要處理的詩作。");
    return;
  }

  // 載入現有 index（含日期）
  let indexWithDates = loadIndexWithDates(indexList);

  // 處理每個 txt
  for (const file of toProcess) {
    const txtPath = path.join(inputDir, file);
    if (!fs.existsSync(txtPath)) {
      console.warn(`⚠️ 找不到檔案：${file}`);
      continue;
    }
    const [title, authorWithExt] = file.split("_");
    const author = authorWithExt.replace(".txt", "");
    const slug = `${title}_${author}.json`;

    let oldData = {};
    const jsonPath = path.join(outputDir, slug);
    if (fs.existsSync(jsonPath)) {
      try {
        oldData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      } catch {}
    }

    const jsonData = parseTxtFile(txtPath, oldData);
    const newSlug = writePostJson(jsonData);

    // 更新 index 列表（若不存在則加上，存在則更新日期）
    const existing = indexWithDates.find(i => i.slug === newSlug);
    if (existing) {
      existing.date = jsonData.date;
    } else {
      indexWithDates.push({ slug: newSlug, date: jsonData.date });
    }
  }

  // 排序：新到舊
  indexWithDates.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 只存檔名
  indexList = indexWithDates.map(i => i.slug);
  fs.writeFileSync(indexPath, JSON.stringify(indexList, null, 2), "utf-8");
  console.log(`📚 已更新 index.json，共 ${indexList.length} 篇詩作。`);
}

main();
