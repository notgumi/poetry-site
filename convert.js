const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 資料夾設定
const inputDir = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');
const indexPath = path.join(__dirname, 'data/index.json');

// 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 嘗試抓取 git diff 差異檔案（若無就 fallback）
let changedFiles = [];
try {
  const stdout = execSync('git diff --name-only HEAD~1', { encoding: 'utf-8' });
  changedFiles = stdout
    .split('\n')
    .filter(f => f.startsWith('raw_poems/') && f.endsWith('.txt'))
    .map(f => path.basename(f));
} catch {
  console.warn('⚠️ Git 差異失敗，將 fallback 偵測所有尚未轉換的 .txt 檔案');

  const allTxts = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
  const allJsons = fs.readdirSync(outputDir).filter(f => f.endsWith('.json'));

  const jsonBaseNames = allJsons.map(f => f.replace('.json', ''));

  // 挑出還沒有對應 .json 的 .txt
  changedFiles = allTxts.filter(txt => {
    const [title, authorWithExt] = txt.split('_');
    const author = authorWithExt.replace('.txt', '');
    const base = `${title}_${author}`;
    return !jsonBaseNames.includes(base);
  });
}

// 若仍找不到變更檔案
if (changedFiles.length === 0) {
  console.log('🟡 沒有要處理的 .txt 檔案，結束');
  process.exit(0);
}

// index 清單
let indexList = [];
if (fs.existsSync(indexPath)) {
  try {
    indexList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    console.warn('⚠️ 無法解析 index.json，重建');
  }
}

// 處理每個詩作
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
      console.warn(`⚠️ 舊檔案 ${outputFileName} 無法解析`);
    }
  }

  const jsonData = {
    title,
    author,
    content: raw.trim().replace(/\r?\n/g, '\\n'),
    notes: oldData.notes || '（請填寫補充說明）',
    tags: oldData.tags || [],
    date: modifiedDate,
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ 已產出 ${outputFileName}`);

  if (!indexList.includes(outputFileName)) {
    indexList.push(outputFileName);
  }
});

// 寫入 index
indexList.sort();
fs.writeFileSync(indexPath, JSON.stringify(indexList, null, 2), 'utf-8');
console.log(`📄 index.json 已更新，共 ${indexList.length} 筆`);
