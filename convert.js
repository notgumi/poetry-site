const fs = require('fs');
const path = require('path');

// 資料夾與路徑
const inputDir = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');
const indexPath = path.join(__dirname, 'data/index.json');

// 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 讀取現有 index.json 清單（若無則為空）
let indexList = [];
try {
  indexList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
} catch {
  console.log('⚠️ index.json 不存在，將建立新檔');
  indexList = [];
}

// 把 indexList 轉成 Set 方便查詢
const existingSet = new Set(indexList.map(name => name.replace('.json', '')));

// 讀取 raw_poems 中所有 txt 檔案
const allFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.txt'));

// 處理新增檔案（index.json 尚未收錄的）
const newFiles = allFiles.filter(file => {
  const baseName = file.replace('.txt', '');
  return !existingSet.has(baseName);
});

// 處理已知被修改的檔案（透過命令列參數傳入）
const changedFiles = process.argv.slice(2).map(f => f.replace('.txt', ''));

// 合併所有需要轉換的檔案（去重）
const filesToConvert = Array.from(new Set([...newFiles, ...changedFiles]));

// 儲存新的 index 項目（含 date）
let newIndexEntries = [];

filesToConvert.forEach(name => {
  const [title, author] = name.split('_');
  const inputPath = path.join(inputDir, `${name}.txt`);
  const outputPath = path.join(outputDir, `${name}.json`);

  if (!fs.existsSync(inputPath)) {
    console.warn(`🚫 找不到檔案：${inputPath}`);
    return;
  }

  const raw = fs.readFileSync(inputPath, 'utf-8');
  const modifiedDate = new Date().toISOString().split('T')[0];

  let oldData = {};
  if (fs.existsSync(outputPath)) {
    try {
      oldData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    } catch (err) {
      console.warn(`⚠️ 無法讀取 ${outputPath}，將重建新檔`);
    }
  }

  const jsonData = {
    title,
    author,
    content: raw.trim().replace(/\r?\n/g, '\\n'),
    notes: oldData.notes || "（請填寫補充說明）",
    tags: oldData.tags || [],
    date: modifiedDate
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ 已轉換：${name}.txt → ${name}.json`);

  newIndexEntries.push({
    filename: `${name}.json`,
    date: modifiedDate
  });
});

// 保留未改動的 index 項目
const unchangedIndex = indexList
  .map(name => {
    const filepath = path.join(outputDir, name);
    if (fs.existsSync(filepath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        return { filename: name, date: data.date || "1970-01-01" };
      } catch {
        return null;
      }
    }
    return null;
  })
  .filter(Boolean);

// 合併新的與舊的 index，並依時間由新到舊排序
const fullIndex = [...newIndexEntries, ...unchangedIndex]
  .filter((v, i, arr) => arr.findIndex(t => t.filename === v.filename) === i) // 去重
  .sort((a, b) => new Date(b.date) - new Date(a.date));

// 寫入 index.json（只寫檔名清單）
fs.writeFileSync(indexPath, JSON.stringify(fullIndex.map(i => i.filename), null, 2), 'utf-8');
console.log(`📘 已更新 index.json，共 ${fullIndex.length} 篇`);
