import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readlink, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skills = [
  'https://github.com/mattpocock/skills/tree/main/skills/engineering',
  'https://github.com/mattpocock/skills/tree/main/skills/productivity',
  'https://github.com/morluto/rea',
];

for (const source of skills) {
  const skill = source.endsWith('/rea') ? 'reverse-engineer-anything' : '*';
  console.log(`Installing latest project skills from ${source}`);
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      '--yes',
      '--package=skills@latest',
      '--',
      'skills',
      'add',
      source,
      '--skill',
      skill,
      '--agent',
      'codex',
      '--yes',
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const skillsDir = path.join(repoRoot, '.agents', 'skills');
const claudeDir = path.join(repoRoot, '.claude');
const claudeSkillsLink = path.join(claudeDir, 'skills');
await mkdir(skillsDir, { recursive: true });
await mkdir(claudeDir, { recursive: true });

try {
  const current = await lstat(claudeSkillsLink);
  if (!current.isSymbolicLink()) {
    throw new Error(`${claudeSkillsLink} already exists and is not a symbolic link`);
  }
  const existingTarget = await readlink(claudeSkillsLink);
  if (path.resolve(path.dirname(claudeSkillsLink), existingTarget) !== skillsDir) {
    throw new Error(`${claudeSkillsLink} points somewhere other than ${skillsDir}`);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await symlink(
    path.relative(path.dirname(claudeSkillsLink), skillsDir),
    claudeSkillsLink,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

console.log('Project skills are available in .agents/skills and through .claude/skills.');
