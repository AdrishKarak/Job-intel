const fs = require("fs");
const path = require("path");

function copyEngines() {
  const searchDirs = [
    path.join(__dirname, "../../node_modules/.pnpm"),
    path.join(__dirname, "node_modules/.pnpm"),
    path.join(__dirname, "../../node_modules/@prisma/client"),
    path.join(__dirname, "node_modules/@prisma/client"),
  ];

  const targetDirs = [
    path.join(__dirname, ".next/server"),
    path.join(__dirname, ".prisma/client"),
  ];

  targetDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    let files = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(walk(full));
        } else if (entry.name.startsWith("libquery_engine") && entry.name.endsWith(".node")) {
          files.push(full);
        }
      }
    } catch {}
    return files;
  }

  const engineFiles = Array.from(new Set(searchDirs.flatMap(walk)));
  console.log(`Found ${engineFiles.length} Prisma engine binary files to copy.`);

  for (const file of engineFiles) {
    const filename = path.basename(file);
    for (const targetDir of targetDirs) {
      const dest = path.join(targetDir, filename);
      fs.copyFileSync(file, dest);
      console.log(`✓ Copied ${filename} -> ${path.relative(__dirname, dest)}`);
    }
  }
}

copyEngines();
