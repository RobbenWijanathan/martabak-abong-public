import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Report paths and finding types only; never print matched values.
const findings = new Set<string>(); let checked = 0, historical = 0;
const ignored = new Set(['node_modules', '.next', 'out', '.git', '.npm-cache', '.vscode', 'test-results', 'playwright-report']);
const textFile = /\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|css|txt|svg|example)$|(?:^|[\\/])\.gitignore$/;
function inspect(path: string, contents: string) {
  checked++;
  const patterns: [RegExp, string][] = [
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
    [/\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9]{32,})\b/, 'credential token'],
    [/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/i, 'database URL'],
    [/https?:\/\/[^\s"'<>]*\.(?:neon\.tech|supabase\.co)\b/i, 'external database endpoint'],
  ];
  for (const [pattern, label] of patterns) if (pattern.test(contents)) findings.add(`${path}: ${label}`);
}
function walk(directory: string, built = false) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !ignored.has(entry.name)) walk(join(directory, entry.name), built);
    else if (entry.isFile()) {
      const path = join(directory, entry.name), label = relative(process.cwd(), path);
      if (/^\.env(?:\.|$)/.test(entry.name)) findings.add(`${label}: environment file must be removed from the public demo`);
      if (textFile.test(path)) inspect(label, readFileSync(path, 'utf8'));
    }
  }
}
walk(process.cwd());
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
// This duplicated folder may not have Git metadata. Never initialize, rewrite or push it.
if (existsSync('.git')) {
  for (const path of git('ls-files', '-z').split('\0').filter(Boolean)) {
    if (/(?:^|\/)\.env(?:\.|$)/.test(path)) findings.add(`${path}: tracked environment file`);
    if (existsSync(path) && statSync(path).isFile() && textFile.test(path)) inspect(`tracked:${path}`, readFileSync(path, 'utf8'));
  }
  for (const entry of git('rev-list', '--objects', '--all').trim().split('\n')) {
    const split = entry.indexOf(' '); if (split < 0) continue;
    const hash = entry.slice(0, split), path = entry.slice(split + 1).trim();
    if (/(?:^|\/)\.env(?:\.|$)/.test(path)) findings.add(`history:${path}: environment file in history`);
    if (textFile.test(path)) { inspect(`history:${path}`, git('cat-file', 'blob', hash)); historical++; }
  }
}
if (!existsSync('out/index.html')) throw new Error('Run the production build first.');
walk(join(process.cwd(), 'out'), true);
if (findings.size) { console.error([...findings].join('\n')); process.exitCode = 1; }
else console.log(`Security scan passed: ${checked} source/exported text files and ${historical} historical blobs checked. ${existsSync('.git') ? 'Git content included.' : 'No Git metadata in this copy; no tracked content or history to scan.'} Heuristic scans cannot prove absence of every secret.`);
