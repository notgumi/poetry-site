const fs = require('fs');
const path = require('path');

// 資料夾路徑
const inputDir = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');
const indexPath = path.join(__dirname, 'data/index.json');

// 確保輸出資料夾存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 讀取所有 txt 檔案
const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.txt'));

// 儲存所有產出的 JSON 檔名（相對路徑）
const indexList = [];

files.forEach(file => {
  const raw = fs.readFileSync(path.join(inputDir, file), 'utf-8');

  const [title, authorWithExt] = file.split('_');
  const author = authorWithExt.replace('.txt', '');

  const outputFile = path.join(outputDir, `${title}_${author}.json`);
  const modifiedDate = new Date().toISOString().split('T')[0];

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
    date: modifiedDate  // ✅ 記錄轉換時間為 date
  };

  fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`已更新：${file} → ${title}_${author}.json`);

  indexList.push(`${title}_${author}.json`);
});

// ✅ 寫入 index.json
fs.writeFileSync(indexPath, JSON.stringify(indexList, null, 2), 'utf-8');
console.log(`已更新 index.json，總共 ${indexList.length} 篇詩作`);
