const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.txt'));

files.forEach(file => {
  const raw = fs.readFileSync(path.join(inputDir, file), 'utf-8');

  const [title, authorWithExt] = file.split('_');
  const author = authorWithExt.replace('.txt', '');

  const outputFile = path.join(outputDir, `${title}_${author}.json`);

  // 🟨 檢查是否已有舊檔案
  let oldData = {};
  if (fs.existsSync(outputFile)) {
    try {
      oldData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    } catch (err) {
      console.warn(`⚠️ 無法讀取 ${outputFile}，將建立新檔`);
    }
  }

  // 🟩 合併資料（只更新主要欄位，其餘保留）
  const jsonData = {
    title,
    author,
    content: raw.trim().replace(/\r?\n/g, '\\n'),
    notes: oldData.notes || "（請填寫補充說明）",
    tags: oldData.tags || [],
    date: new Date().toISOString().split('T')[0]
  };

  fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ 已更新：${file} → ${title}_${author}.json`);
});
