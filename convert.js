const fs = require('fs');
const path = require('path');

const inputDir  = path.join(__dirname, 'raw_poems');
const outputDir = path.join(__dirname, 'data/posts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 將單一 txt 轉出 json（保留既有 notes/tags）
function convertOne(txtPath) {
  const raw = fs.readFileSync(txtPath, 'utf-8');
  const [title, authorWithExt] = path.basename(txtPath).split('_');
  const author = authorWithExt.replace('.txt', '');

  const outFile = path.join(outputDir, `${title}_${author}.json`);

  let old = {};
  if (fs.existsSync(outFile)) {
    try { old = JSON.parse(fs.readFileSync(outFile, 'utf-8')); } catch {}
  }

  const jsonData = {
    title,
    author,
    content: raw.trim().replace(/\r?\n/g, '\\n'),
    notes: old.notes || '（請填寫補充說明）',
    tags:  old.tags  || [],
    // 日期交由 update_index.js 排序使用；這裡依需求仍寫入（預設為今天）
    date: old.date || new Date().toISOString().split('T')[0],
  };

  fs.writeFileSync(outFile, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ 轉換：${path.basename(txtPath)} → ${path.basename(outFile)}`);
}

// 若未帶參數：只處理「新檔或較新 mtime 的 txt」；有帶參數：僅處理那些檔
(function main() {
  const args = process.argv.slice(2).filter(f => f.endsWith('.txt'));
  let targets = [];

  if (args.length) {
    targets = args.map(p => path.isAbsolute(p) ? p : path.join(__dirname, p));
  } else {
    const all = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
    for (const f of all) {
      const txt = path.join(inputDir, f);
      const [title, authorWithExt] = f.split('_');
      const author  = authorWithExt.replace('.txt', '');
      const outFile = path.join(outputDir, `${title}_${author}.json`);

      if (!fs.existsSync(outFile)) { targets.push(txt); continue; }

      const txtM  = fs.statSync(txt).mtimeMs;
      const jsonM = fs.statSync(outFile).mtimeMs;
      if (txtM > jsonM) targets.push(txt); // 來源較新才更新
    }
  }

  if (!targets.length) {
    console.log('無需更新：找不到新增或較新的 txt。');
    return;
  }
  for (const p of targets) convertOne(p);
})();
