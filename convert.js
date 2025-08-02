const fs = require('fs');
const path = require('path');

// 目錄設定
const inputDir = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');
const indexPath = path.join(__dirname, 'data/index.json');

// 取得 CLI 傳入參數（ex: node convert.js 黑洞_阿青.txt）
const targetFile = process.argv[2];

if (!targetFile) {
  console.error('❌ 請指定要處理的 .txt 檔案名稱，例如：node convert.js 黑洞_阿青.txt');
  process.exit(1);
}

// 檢查目標檔案是否存在
const inputPath = path.join(inputDir, targetFile);
if (!fs.existsSync(inputPath)) {
  console.error(`❌ 找不到檔案：${inputPath}`);
  process.exit(1);
}

// 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 擷取詩名與作者
const [title, authorWithExt] = targetFile.split('_');
const author = authorWithExt.replace('.txt', '');

// 輸出 JSON 檔路徑
const outputFile = path.join(outputDir, `${title}_${author}.json`);
const modifiedDate = new Date().toISOString().split('T')[0];

// 讀取 .txt 內容
const raw = fs.readFileSync(inputPath, 'utf-8');

// 讀取舊資料（若已存在）
let oldData = {};
if (fs.existsSync(outputFile)) {
  try {
    oldData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  } catch {
    console.warn(`⚠️ 無法解析 ${outputFile}，將建立新檔`);
  }
}

// 建構 JSON 物件
const jsonData = {
  title,
  author,
  content: raw.trim().replace(/\r?\n/g, '\\n'),
  notes: oldData.notes || '（請填寫補充說明）',
  tags: oldData.tags || [],
  date: modifiedDate
};

// 寫入 JSON 檔案
fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf-8');
console.log(`✅ 已轉換：${targetFile} → ${title}_${author}.json`);

// 更新 index.json
let indexList = [];
if (fs.existsSync(indexPath)) {
  try {
    indexList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    console.warn(`⚠️ index.json 無法解析，將重建`);
  }
}

// 檔名字串
const outputFileName = `${title}_${author}.json`;

// 更新索引清單（去重並排序）
const updatedIndex = Array.from(new Set([outputFileName, ...indexList])).sort();

fs.writeFileSync(indexPath, JSON.stringify(updatedIndex, null, 2), 'utf-8');
console.log(`📄 已更新 index.json，共 ${updatedIndex.length} 篇詩作`);
