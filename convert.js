const fs = require('fs');
const path = require('path');

// ⬇️ 取得目標檔案路徑
const targetFile = process.argv[2];

if (!targetFile) {
  console.error('❌ 請提供要轉換的 txt 檔案，例如：node convert.js raw_poems/黑洞_阿青.txt');
  process.exit(1);
}

// ⬇️ 資料夾與檔案路徑
const inputPath = path.join(__dirname, targetFile);
const outputDir = path.join(__dirname, 'data/posts');
const indexPath = path.join(__dirname, 'data/index.json');

// ⬇️ 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ⬇️ 檢查 txt 檔是否存在
if (!fs.existsSync(inputPath)) {
  console.error(`❌ 找不到檔案：${targetFile}`);
  process.exit(1);
}

// ⬇️ 解析檔案名稱：黑洞_阿青.txt → title: 黑洞, author: 阿青
const baseName = path.basename(targetFile);
const [title, authorWithExt] = baseName.split('_');
const author = authorWithExt.replace('.txt', '');

// ⬇️ 讀取詩作內容
const raw = fs.readFileSync(inputPath, 'utf-8');
const outputFile = path.join(outputDir, `${title}_${author}.json`);
const modifiedDate = new Date().toISOString().split('T')[0];

// ⬇️ 如果原詩已經存在，保留 notes / tags
let oldData = {};
if (fs.existsSync(outputFile)) {
  try {
    oldData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  } catch (err) {
    console.warn(`⚠️ 無法讀取 ${outputFile}，將重建新檔`);
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

// ⬇️ 寫入單篇 JSON
fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf-8');
console.log(`✅ 已更新詩作：${title}_${author}.json`);

// ⬇️ 更新 index.json（只加入或保留一次）
let indexList = [];
if (fs.existsSync(indexPath)) {
  try {
    indexList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch (err) {
    console.warn('⚠️ index.json 無法讀取，將重新建立');
  }
}

const jsonName = `${title}_${author}.json`;
if (!indexList.includes(jsonName)) {
  indexList.push(jsonName);
}

fs.writeFileSync(indexPath, JSON.stringify(indexList, null, 2), 'utf-8');
console.log(`✅ 已更新 index.json（共 ${indexList.length} 首詩）`);
