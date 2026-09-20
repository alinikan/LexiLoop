import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';

const root = process.cwd();
// npm ci verifies the lockfile and recreates node_modules. Scanning it here would make
// the project check depend on ignored, machine-local package files instead of source.
const ignoredDirectories = new Set(['.git', 'node_modules', 'playwright-report', 'test-results']);
const generatedDirectories = new Set(['.next']);
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsonl',
  '.jsx',
  '.md',
  '.mjs',
  '.py',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const numberedCopy = / \d+(?=(?:\.[^./]+)?$)/;
const conflictMarker = /^(?:<<<<<<< .+|=======|>>>>>>> .+)$/m;
const duplicatePaths = [];
const conflictPaths = [];
const invalidUtf8Paths = [];
const brokenDocumentationLinks = [];
let visited = 0;

async function walk(directory, insideGenerated = false) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink() || (entry.isDirectory() && ignoredDirectories.has(entry.name)))
      continue;
    const path = join(directory, entry.name);
    const projectPath = relative(root, path);
    const generated = insideGenerated || generatedDirectories.has(entry.name);
    if (numberedCopy.test(entry.name)) duplicatePaths.push(projectPath);
    if (entry.isDirectory()) {
      await walk(path, generated);
      continue;
    }
    if (!entry.isFile()) continue;
    visited += 1;
    if (generated || !textExtensions.has(extname(entry.name))) continue;
    const bytes = await readFile(path);
    let content;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      invalidUtf8Paths.push(projectPath);
      continue;
    }
    if (conflictMarker.test(content)) conflictPaths.push(projectPath);
    if (extname(entry.name) === '.md') {
      const links = content.matchAll(/\[[^\]]*\]\((?!https?:|mailto:|#)([^)\s]+)\)/g);
      for (const match of links) {
        const destination = decodeURIComponent(match[1].split('#')[0]);
        if (!destination) continue;
        try {
          await access(join(dirname(path), destination));
        } catch {
          brokenDocumentationLinks.push(`${projectPath} → ${match[1]}`);
        }
      }
    }
  }
}

await walk(root);

const problems = [
  duplicatePaths.length && `Numbered duplicate paths:\n${duplicatePaths.slice(0, 20).join('\n')}`,
  conflictPaths.length && `Unresolved merge markers:\n${conflictPaths.join('\n')}`,
  invalidUtf8Paths.length && `Invalid UTF-8 source files:\n${invalidUtf8Paths.join('\n')}`,
  brokenDocumentationLinks.length &&
    `Broken local documentation links:\n${brokenDocumentationLinks.join('\n')}`,
].filter(Boolean);

if (problems.length) {
  console.error(problems.join('\n\n'));
  if (duplicatePaths.length > 20)
    console.error(`\n…and ${duplicatePaths.length - 20} more numbered duplicate paths.`);
  process.exitCode = 1;
} else {
  console.log(`Integrity check passed across ${visited.toLocaleString()} project files.`);
}
