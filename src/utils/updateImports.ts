import fs from 'fs';
import path from 'path';

function updateImport(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const updatedContent = content.replace(
    /from ['"](?:\.\.\/)*config\/logger['"]/g,
    "from '../utils/logger'"
  ).replace(
    /from ['"]\.\/logger['"]/g,
    "from '../src/utils/logger'"
  ).replace(
    /from ['"]\.\/baseLogger['"]/g,
    "from '../src/utils/logger'"
  );

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated import in ${filePath}`);
  } else {
    console.log(`No changes needed in ${filePath}`);
  }
}

function updateImportsInDirectory(dir: string): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      updateImportsInDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
      updateImport(filePath);
    }
  }
}

// Usage
updateImportsInDirectory(path.resolve(__dirname, '../..'));
console.log('Import update process completed.');