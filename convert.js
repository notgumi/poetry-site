const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputDir = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');
const indexPath = path.join(__dirname, 'data/index.json');

// 嘗試找出變更的 .txt 檔案
let changedFiles = [];

try {
  // 嘗試用 HEAD~1 比對差異
  const stdout = execSync('git diff --name-only HEAD~1', { encoding: 'utf-8' });
  changedFiles = stdout
    .split('\n')
    .filter(f => f.startsWith('raw_poems/') && f.endsWith('.txt'))
    .map(f => path.basename(f));
} catch (err) {
  // fallback: 選出所有 .txt 檔案中尚未轉成 .json 的
  console.warn('⚠️ 無法使用 git diff --name-only HEAD~1，將改為檢查未轉換的 .txt 檔案');

  const allTxts = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));

  const existingJsons = fs.readdirSync(outputDir).map(f => f.replace('.json', '.txt'));

  changedFiles = allTxts.filter(f => !existingJsons.includes(f));
}

// 沒有檔案要處理
if (changedFiles.length === 0) {
  console.log('🟡 沒有偵測到需要處理的 .txt 檔案，結束執行');
  process.exit(0);
}

// 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// index.json 現有資料
let indexList = [];
if (fs.existsSync(indexPath)) {
  try {
    indexList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    console.warn('⚠️ index.json 無法解析，將重建');
  }
}

// 處理每一份詩作
changedFiles.forEach((file) => {
  const inputPath = path.join(inputDir, file);

  const [title, authorWithExt] = file.split('_');
  const author = authorWithExt.replace('.txt', '');
  const outputFileName = `${title}_${author}.json`;
  const outputPath = path.join(outputDir, outputFileName);
  const modifiedDate = new Date().toISOString().split('T')[0];

  const raw = fs.readFileSync(inputPath, 'utf-8');

  let oldData = {};
  if (fs.existsSync(outputPath)) {
    try {
      oldData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    } catch {
      console.warn(`⚠️ 無法解析 ${outputFileName}，將建立新檔`);
    }
  }

  const jsonData = {
    title,
    author,
    content: raw.trim().replace(/\r?\n/g, '\\n'),
    notes: oldData.notes || '（請填寫補充說明）',
    tags: oldData.tags || [],
    date: modifiedDate
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ 已處理：${file} → ${outputFileName}`);

  if (!indexList.includes(outputFileName)) {
    indexList.push(outputFileName);
  }
});

// 寫入 index.json
indexList.sort();
fs.writeFileSync(indexPath, JSON.stringify(indexList, null, 2), 'utf-8');
console.log(`📄 已更新 index.json，共 ${indexList.length} 篇詩作`);
