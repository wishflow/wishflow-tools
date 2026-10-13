#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, join, normalize } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const AGENTS = [
  { id: 'codex', label: 'Codex CLI', command: 'codex' },
  { id: 'claude', label: 'Claude Code', command: 'claude' },
  { id: 'gemini', label: 'Gemini CLI', command: 'gemini' },
  { id: 'opencode', label: 'OpenCode', command: 'opencode' },
  { id: 'cursor', label: 'Cursor', command: 'cursor' },
];

const ALIASES = new Map([
  ['claude-code', 'claude'],
  ['gemini-cli', 'gemini'],
  ['cursor-agent', 'cursor'],
]);

const ASSETS_URL = 'https://3d.shep.bot/mcp';
const CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');

function findExecutable(name) {
  const suffixes = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : [''];

  for (const directory of (process.env.PATH || '').split(delimiter)) {
    if (!directory) continue;
    for (const suffix of suffixes) {
      const candidate = join(directory, `${name}${suffix}`);
      if (existsSync(candidate)) return normalize(candidate);
    }
  }

  return null;
}

function execute(command, args) {
  try {
    return spawnSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (error) {
    return { error, status: null, stdout: '', stderr: '' };
  }
}

function parseJsonc(source) {
  let output = '';
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (current === '\n') {
        lineComment = false;
        output += current;
      }
      continue;
    }

    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      } else if (current === '\n') {
        output += current;
      }
      continue;
    }

    if (inString) {
      output += current;
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === '"') inString = false;
      continue;
    }

    if (current === '"') {
      inString = true;
      output += current;
    } else if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else {
      output += current;
    }
  }

  return JSON.parse(output.replace(/,\s*([}\]])/g, '$1'));
}

function readJsonConfig(filePath) {
  if (!existsSync(filePath)) return { config: {}, error: null };
  try {
    return { config: parseJsonc(readFileSync(filePath, 'utf8')), error: null };
  } catch {
    return { config: null, error: true };
  }
}

function readEntries(agent) {
  if (agent.id === 'codex') {
    const result = execute(agent.command, ['mcp', 'list', '--json']);
    if (result.error || result.status !== 0) return { entries: new Map(), error: true };

    try {
      const parsed = JSON.parse(result.stdout);
      const servers = Array.isArray(parsed)
        ? parsed
        : Object.entries(parsed.mcp_servers || parsed.servers || {}).map(([name, value]) => ({ name, ...value }));
      return { entries: new Map(servers.map(server => [server.name, server])), error: false };
    } catch {
      return { entries: new Map(), error: true };
    }
  }

  const paths = {
    claude: join(homedir(), '.claude.json'),
    gemini: join(homedir(), '.gemini', 'settings.json'),
    opencode: join(CONFIG_HOME, 'opencode', 'opencode.json'),
    cursor: join(homedir(), '.cursor', 'mcp.json'),
  };
  const { config, error } = readJsonConfig(paths[agent.id]);
  if (error) return { entries: new Map(), error: true };

  let entries = {};
  if (agent.id === 'opencode') {
    entries = config.mcp?.servers || config.mcp || {};
  } else {
    entries = config.mcpServers || {};
  }

  return {
    entries: new Map(Object.entries(entries).filter(([, value]) => value && typeof value === 'object')),
    error: false,
  };
}

function expectedServers(blenderMcpPath) {
  return {
    blender: blenderMcpPath
      ? { kind: 'stdio', command: blenderMcpPath, args: [] }
      : { kind: 'stdio', command: 'blender-mcp', args: [] },
    '3d-assets': { kind: 'http', url: ASSETS_URL },
  };
}

function normalizeCommand(command) {
  if (typeof command !== 'string' || !command) return null;
  if (isAbsolute(command)) return normalize(command);
  return findExecutable(command) || command;
}

function entryTransport(agent, entry) {
  if (!entry || typeof entry !== 'object') return null;

  if (agent.id === 'codex') {
    if (entry.transport?.type === 'stdio') {
      return {
        kind: 'stdio',
        command: entry.transport.command,
        args: entry.transport.args || [],
      };
    }
    if (['streamable_http', 'http', 'sse'].includes(entry.transport?.type)) {
      return {
        kind: 'http',
        url: entry.transport.url,
        hasHeaders: Boolean(
          Object.keys(entry.transport.http_headers || {}).length
          || Object.keys(entry.transport.env_http_headers || {}).length
          || entry.transport.bearer_token_env_var,
        ),
      };
    }
  }

  if (typeof entry.url === 'string') {
    const headers = entry.headers || entry.http_headers || {};
    return {
      kind: 'http',
      url: entry.url,
      hasHeaders: Object.keys(headers).length > 0 || Boolean(entry.oauth && entry.oauth !== false),
    };
  }

  if (typeof entry.command === 'string') {
    return { kind: 'stdio', command: entry.command, args: entry.args || [] };
  }

  if (Array.isArray(entry.command)) {
    return {
      kind: 'stdio',
      command: entry.command[0],
      args: entry.command.slice(1),
    };
  }

  return null;
}

function getServerState(agent, name, expected) {
  const { entries, error } = readEntries(agent);
  if (error) return 'unknown';
  if (!entries.has(name)) return 'missing';

  const entry = entries.get(name);
  const actual = entryTransport(agent, entry);
  if (!actual || actual.kind !== expected.kind || entry.enabled === false || entry.disabled === true) {
    return 'conflict';
  }

  if (expected.kind === 'http') {
    return actual.url === expected.url && !actual.hasHeaders ? 'same' : 'conflict';
  }

  const commandMatches = normalizeCommand(actual.command) === normalizeCommand(expected.command);
  const argsMatch = JSON.stringify(actual.args || []) === JSON.stringify(expected.args);
  return commandMatches && argsMatch ? 'same' : 'conflict';
}

function detectAgents() {
  return AGENTS.map(agent => ({ ...agent, executable: findExecutable(agent.command) }))
    .filter(agent => agent.executable);
}

function printDetectedAgents(agents) {
  console.log('检测到的编码客户端：');
  for (const agent of AGENTS) {
    const detected = agents.find(item => item.id === agent.id);
    console.log(`  ${detected ? '✓' : '—'} ${agent.label}${detected ? '' : '（未检测到）'}`);
  }
}

function stateLabel(state) {
  return {
    same: '已配置（匹配）',
    missing: '未配置',
    conflict: '同名配置不同，保留并跳过',
    unknown: '无法读取客户端配置',
  }[state] || state;
}

function printStatus(agents, blenderMcpPath) {
  printDetectedAgents(agents);
  console.log('\nMCP 配置状态（不会显示配置值或认证信息）：');
  if (agents.length === 0) {
    console.log('  没有检测到受支持的客户端。');
    return;
  }

  for (const agent of agents) {
    const servers = expectedServers(blenderMcpPath);
    console.log(`\n${agent.label}`);
    for (const [name, expected] of Object.entries(servers)) {
      let state = getServerState(agent, name, expected);
      if (name === 'blender' && state === 'missing' && !blenderMcpPath) state = 'missing';
      console.log(`  ${name}: ${stateLabel(state)}`);
    }
  }
  if (!blenderMcpPath) console.log('\n缺少依赖：PATH 中未找到 blender-mcp；仍可配置 3d-assets。');
}

function parseArgs(args) {
  const selected = [];
  let check = false;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check') check = true;
    else if (argument === '--help' || argument === '-h') help = true;
    else if (argument === '--agent') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--agent 需要一个客户端名称。');
      index += 1;
      const normalized = ALIASES.get(value.toLowerCase()) || value.toLowerCase();
      if (!AGENTS.some(agent => agent.id === normalized)) {
        throw new Error(`未知客户端：${value}。可选：${AGENTS.map(agent => agent.id).join(', ')}。`);
      }
      if (!selected.includes(normalized)) selected.push(normalized);
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }

  return { selected, check, help };
}

function printHelp() {
  console.log(`Blender Lab MCP 客户端配置器

用法：
  node scripts/setup-mcp.mjs [--check]
  node scripts/setup-mcp.mjs --agent codex --agent claude

选项：
  --check            只检查客户端和 MCP 配置，不写入
  --agent <名称>     指定客户端，可重复传入；可选 codex、claude、gemini、opencode、cursor
  -h, --help         显示帮助

未指定 --agent 时，脚本会列出检测到的客户端并交互选择。`);
}

async function chooseAgents(agents) {
  if (!stdin.isTTY) throw new Error('当前不是交互终端；请用 --agent codex 等参数显式选择客户端。');
  if (agents.length === 0) return [];

  console.log('\n输入序号（逗号分隔），例如 1,3；输入 all 选择全部，输入 q 取消：');
  agents.forEach((agent, index) => console.log(`  ${index + 1}. ${agent.label}`));
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      const answer = (await terminal.question('选择> ')).trim().toLowerCase();
      if (answer === 'q' || answer === 'quit') return [];
      if (answer === 'all') return agents.map(agent => agent.id);
      const indexes = answer.split(',').map(item => Number(item.trim()));
      if (answer && indexes.every(index => Number.isInteger(index) && index >= 1 && index <= agents.length)) {
        return [...new Set(indexes.map(index => agents[index - 1].id))];
      }
      console.log('输入无效，请输入有效序号、all 或 q。');
    }
  } finally {
    terminal.close();
  }
}

function installArgs(agent, serverName, expected) {
  const localCommand = expected.command;
  const url = expected.url;

  if (agent.id === 'codex') {
    return expected.kind === 'stdio'
      ? ['mcp', 'add', serverName, '--', localCommand, ...expected.args]
      : ['mcp', 'add', serverName, '--url', url];
  }
  if (agent.id === 'claude') {
    return expected.kind === 'stdio'
      ? ['mcp', 'add', '--scope', 'user', '--transport', 'stdio', serverName, '--', localCommand, ...expected.args]
      : ['mcp', 'add', '--scope', 'user', '--transport', 'http', serverName, url];
  }
  if (agent.id === 'gemini') {
    return expected.kind === 'stdio'
      ? ['mcp', 'add', '--scope', 'user', '--transport', 'stdio', serverName, localCommand, ...expected.args]
      : ['mcp', 'add', '--scope', 'user', '--transport', 'http', serverName, url];
  }
  if (agent.id === 'opencode') {
    return expected.kind === 'stdio'
      ? ['mcp', 'add', serverName, '--global', '--', localCommand, ...expected.args]
      : ['mcp', 'add', serverName, '--global', '--url', url];
  }

  const definition = expected.kind === 'stdio'
    ? { name: serverName, command: localCommand, args: expected.args }
    : { name: serverName, url };
  return ['--add-mcp', JSON.stringify(definition)];
}

function addServer(agent, serverName, expected) {
  const args = installArgs(agent, serverName, expected);
  const result = execute(agent.command, args);
  return !result.error && result.status === 0;
}

function configureAgent(agent, blenderMcpPath) {
  const servers = expectedServers(blenderMcpPath);
  let failures = 0;
  console.log(`\n${agent.label}`);

  for (const [name, originalExpected] of Object.entries(servers)) {
    if (name === 'blender' && !blenderMcpPath) {
      console.log('  blender: 未找到 blender-mcp，跳过；可继续配置 3d-assets。');
      continue;
    }

    const state = getServerState(agent, name, originalExpected);
    if (state === 'same') {
      console.log(`  ${name}: 已匹配，保持不变。`);
      continue;
    }
    if (state === 'conflict') {
      console.log(`  ${name}: 检测到同名不同配置，未覆盖。`);
      continue;
    }
    if (state === 'unknown') {
      console.log(`  ${name}: 无法安全读取配置，未尝试写入。`);
      failures += 1;
      continue;
    }

    if (!addServer(agent, name, originalExpected)) {
      console.log(`  ${name}: 客户端命令失败（退出状态非 0）；未回显其输出。`);
      failures += 1;
      continue;
    }

    const after = getServerState(agent, name, originalExpected);
    console.log(`  ${name}: ${after === 'same' ? '已添加并复核。' : '命令已接受；请运行检查确认。'}`);
    if (after !== 'same') failures += 1;
  }

  return failures;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  const available = detectAgents();
  const blenderMcpPath = findExecutable('blender-mcp');
  if (options.check) {
    printStatus(available, blenderMcpPath);
    return;
  }

  printDetectedAgents(available);
  let selected = options.selected;
  if (selected.length === 0) selected = await chooseAgents(available);
  if (selected.length === 0) {
    console.log('\n没有选择客户端，未写入配置。');
    return;
  }

  const unavailable = selected.filter(id => !available.some(agent => agent.id === id));
  if (unavailable.length > 0) {
    console.error(`客户端未检测到，未安装也未写入：${unavailable.join(', ')}`);
    process.exitCode = 2;
    return;
  }

  let failures = 0;
  for (const id of selected) {
    const agent = available.find(item => item.id === id);
    failures += configureAgent(agent, blenderMcpPath);
  }

  if (failures > 0) {
    console.error(`\n${failures} 项未完成。运行 --check 复核客户端状态。`);
    process.exitCode = 1;
  } else {
    console.log('\n配置完成。按客户端要求重启或刷新 MCP 后，再运行 --check 复核。');
  }
}

main().catch(error => {
  console.error(`配置器失败：${error.message}`);
  process.exitCode = 1;
});
