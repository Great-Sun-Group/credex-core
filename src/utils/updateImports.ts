import fs from "fs";
import path from "path";

function updateImport(filePath: string, baseDir: string, dryRun: boolean): void {
  try {
    if (!filePath.startsWith(baseDir)) {
      console.warn(`Skipping file outside of base directory: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, "utf8");
    if (typeof content !== 'string') {
      console.error(`File content is not a string for ${filePath}`);
      return;
    }
    const updatedContent = content
      .replace(
        /from ['"](?:\.\.\/)*config\/logger['"]/g,
        "from '../utils/logger'"
      )
      .replace(/from ['"]\.\/logger['"]/g, "from '../src/utils/logger'")
      .replace(/from ['"]\.\/baseLogger['"]/g, "from '../src/utils/logger'");

    if (content !== updatedContent) {
      if (!dryRun) {
        fs.writeFileSync(filePath, updatedContent, "utf8");
        console.log(`Updated import in ${filePath}`);
      } else {
        console.log(`[Dry run] Would update import in ${filePath}`);
      }
    } else {
      console.log(`No changes needed in ${filePath}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error processing file ${filePath}: ${error.message}`);
    } else {
      console.error(`Unknown error processing file ${filePath}`);
    }
  }
}

function updateImportsInDirectory(dir: string, baseDir: string, dryRun: boolean): void {
  try {
    console.log(`Processing directory: ${dir}`);
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          updateImportsInDirectory(filePath, baseDir, dryRun);
        } else if (
          stat.isFile() &&
          (file.endsWith(".ts") || file.endsWith(".js"))
        ) {
          updateImport(filePath, baseDir, dryRun);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Error processing ${filePath}: ${error.message}`);
        } else {
          console.error(`Unknown error processing ${filePath}`);
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error reading directory ${dir}: ${error.message}`);
    } else {
      console.error(`Unknown error reading directory ${dir}`);
    }
  }
}

// Usage
try {
  const baseDir = path.resolve(__dirname, "../..");
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Starting import update process from ${baseDir}`);
  console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
  updateImportsInDirectory(baseDir, baseDir, dryRun);
  console.log("Import update process completed.");
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(`Error in import update process: ${error.message}`);
  } else {
    console.error(`Unknown error in import update process`);
  }
}
