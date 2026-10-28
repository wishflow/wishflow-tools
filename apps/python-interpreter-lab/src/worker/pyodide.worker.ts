import type { AnalysisResult, PythonDiagnostic, WorkerRequest, WorkerResponse } from '../analysis/types';

const PYODIDE_VERSION = '314.0.7';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_MODULE_URL = `${PYODIDE_BASE_URL}pyodide.mjs`;

interface PyodideRuntime {
  version: string;
  runPython(source: string): unknown;
  globals: {
    set(name: string, value: string): void;
    delete(name: string): void;
  };
}

interface PythonStringProxy {
  toJs(): unknown;
  destroy(): void;
}

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<PyodideRuntime>;
}

const ANALYZE_PYTHON = String.raw`
import ast
import dis
import json
import sys
import types

MAX_AST_NODES = 5000
MAX_AST_DEPTH = 100
MAX_CODE_OBJECTS = 200
MAX_INSTRUCTIONS_PER_CODE = 20000
MAX_TOTAL_INSTRUCTIONS = 50000
AST_NODE_COUNT = 0
AST_TRUNCATED = False

def short_text(value, limit=400):
    text = str(value)
    return text if len(text) <= limit else text[:limit] + '…'

def serialize_ast_value(value, depth, is_constant=False):
    global AST_NODE_COUNT, AST_TRUNCATED
    if isinstance(value, ast.AST):
        return serialize_ast_node(value, depth)
    if isinstance(value, (list, tuple)):
        result = []
        for item in value:
            if AST_NODE_COUNT >= MAX_AST_NODES or depth >= MAX_AST_DEPTH:
                AST_TRUNCATED = True
                result.append({'kind': 'truncated'})
                break
            result.append(serialize_ast_value(item, depth + 1))
        return result
    if is_constant:
        value_type = type(value).__name__
        if isinstance(value, str):
            text = value
        elif value is None or isinstance(value, (bool, int, float)):
            text = repr(value)
        else:
            text = '<' + value_type + '>'
        return {'kind': 'literal', 'type': value_type, 'value': text}
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value
    return str(value)

def serialize_ast_node(node, depth=0):
    global AST_NODE_COUNT, AST_TRUNCATED
    if AST_NODE_COUNT >= MAX_AST_NODES or depth >= MAX_AST_DEPTH:
        AST_TRUNCATED = True
        return {'kind': 'truncated'}
    AST_NODE_COUNT += 1
    fields = {}
    for name, value in ast.iter_fields(node):
        fields[name] = serialize_ast_value(
            value,
            depth + 1,
            is_constant=isinstance(node, ast.Constant) and name == 'value',
        )
    location = {}
    for name in ('lineno', 'col_offset', 'end_lineno', 'end_col_offset'):
        if hasattr(node, name):
            location[name] = getattr(node, name)
    return {
        'id': 'ast-' + str(AST_NODE_COUNT),
        'type': type(node).__name__,
        'fields': fields,
        'location': location,
    }

def safe_constant(value, code_ids):
    if isinstance(value, types.CodeType):
        return {
            'type': 'code',
            'value': getattr(value, 'co_qualname', value.co_name),
            'codeObjectId': code_ids.get(id(value)),
        }
    value_type = type(value).__name__
    if value is None or isinstance(value, (bool, int, float, str, bytes)):
        return {'type': value_type, 'value': short_text(repr(value), 160)}
    return {'type': value_type, 'value': '<' + value_type + '>'}

def analyze(source):
    global AST_NODE_COUNT, AST_TRUNCATED
    AST_NODE_COUNT = 0
    AST_TRUNCATED = False
    stage = 'parse'
    try:
        tree = ast.parse(source, filename='<input>', mode='exec')
        ast_result = serialize_ast_node(tree)
        stage = 'compile'
        module_code = compile(tree, '<input>', 'exec')
    except Exception as error:
        return {
            'ok': False,
            'pythonVersion': sys.version.split()[0],
            'diagnostic': {
                'stage': stage,
                'type': type(error).__name__,
                'message': short_text(getattr(error, 'msg', str(error)), 1000),
                'line': getattr(error, 'lineno', None),
                'column': getattr(error, 'offset', None),
                'endLine': getattr(error, 'end_lineno', None),
                'endColumn': getattr(error, 'end_offset', None),
            },
        }

    discovered = []
    pending = [module_code]
    code_ids = {}
    code_objects_truncated = False
    while pending:
        code = pending.pop(0)
        if len(discovered) >= MAX_CODE_OBJECTS:
            code_objects_truncated = True
            break
        code_id = 'code-' + str(len(discovered))
        code_ids[id(code)] = code_id
        discovered.append(code)
        pending.extend(value for value in code.co_consts if isinstance(value, types.CodeType))

    result_objects = []
    instruction_count = 0
    instructions_truncated = False
    for code in discovered:
        code_id = code_ids[id(code)]
        instructions = []
        code_truncated = False
        instruction_iterator = iter(dis.get_instructions(code))
        while True:
            instruction = next(instruction_iterator, None)
            if instruction is None:
                break
            if len(instructions) >= MAX_INSTRUCTIONS_PER_CODE or instruction_count >= MAX_TOTAL_INSTRUCTIONS:
                code_truncated = True
                instructions_truncated = True
                break
            position = getattr(instruction, 'positions', None)
            positions = None if position is None else {
                'lineno': getattr(position, 'lineno', None),
                'end_lineno': getattr(position, 'end_lineno', None),
                'col_offset': getattr(position, 'col_offset', None),
                'end_col_offset': getattr(position, 'end_col_offset', None),
            }
            instructions.append({
                'offset': instruction.offset,
                'opcode': instruction.opcode,
                'opname': instruction.opname,
                'arg': instruction.arg,
                'argrepr': short_text(instruction.argrepr, 400),
                'startsLine': instruction.starts_line,
                'positions': positions,
            })
            instruction_count += 1
        if instruction_count >= MAX_TOTAL_INSTRUCTIONS:
            instructions_truncated = True
        result_objects.append({
            'id': code_id,
            'name': code.co_name,
            'qualname': getattr(code, 'co_qualname', code.co_name),
            'firstLine': code.co_firstlineno,
            'varnames': list(code.co_varnames),
            'names': list(code.co_names),
            'constants': [safe_constant(value, code_ids) for value in code.co_consts],
            'instructions': instructions,
            'instructionsTruncated': code_truncated,
        })

    return {
        'ok': True,
        'result': {
            'pythonVersion': sys.version.split()[0],
            'ast': ast_result,
            'astTruncated': AST_TRUNCATED,
            'codeObjects': result_objects,
            'codeObjectsTruncated': code_objects_truncated,
            'instructionCount': instruction_count,
            'instructionsTruncated': instructions_truncated,
        },
    }

json.dumps(analyze(__user_source), ensure_ascii=False, allow_nan=False)
`;

const workerScope = self as DedicatedWorkerGlobalScope;
let sessionId: number | null = null;
let runtime: PyodideRuntime | null = null;

function respond(message: WorkerResponse): void {
  workerScope.postMessage(message);
}

function runtimeDiagnostic(message: string): PythonDiagnostic {
  return {
    stage: 'runtime',
    type: 'RuntimeError',
    message,
    line: null,
    column: null,
    endLine: null,
    endColumn: null,
  };
}

function fromPythonString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null || !('toJs' in value) || !('destroy' in value)) {
    throw new Error('Pyodide returned a value that is not a Python string.');
  }
  const proxy = value as PythonStringProxy;
  try {
    const converted = proxy.toJs();
    if (typeof converted !== 'string') throw new Error('Pyodide returned a non-text value.');
    return converted;
  } finally {
    proxy.destroy();
  }
}

async function initialize(nextSessionId: number): Promise<void> {
  sessionId = nextSessionId;
  try {
    const pyodideModule = await import(/* @vite-ignore */ PYODIDE_MODULE_URL) as PyodideModule;
    runtime = await pyodideModule.loadPyodide({ indexURL: PYODIDE_BASE_URL });
    if (sessionId !== nextSessionId) return;
    const pythonVersion = fromPythonString(runtime.runPython('import sys; sys.version.split()[0]'));
    respond({
      type: 'ready',
      sessionId: nextSessionId,
      pyodideVersion: runtime.version,
      pythonVersion,
    });
  } catch (error) {
    if (sessionId !== nextSessionId) return;
    const message = error instanceof Error ? error.message : String(error);
    respond({ type: 'error', sessionId: nextSessionId, requestId: null, error: runtimeDiagnostic(message) });
  }
}

function analyzeSource(request: Extract<WorkerRequest, { type: 'analyze' }>): void {
  if (!runtime || request.sessionId !== sessionId) return;
  try {
    runtime.globals.set('__user_source', request.source);
    const raw = fromPythonString(runtime.runPython(ANALYZE_PYTHON));
    runtime.globals.delete('__user_source');
    const payload = JSON.parse(raw) as
      | { ok: true; result: AnalysisResult }
      | { ok: false; diagnostic: PythonDiagnostic };
    if (payload.ok) {
      respond({ type: 'analysis', sessionId: request.sessionId, requestId: request.requestId, result: payload.result });
    } else {
      respond({ type: 'error', sessionId: request.sessionId, requestId: request.requestId, error: payload.diagnostic });
    }
  } catch (error) {
    runtime.globals.delete('__user_source');
    const message = error instanceof Error ? error.message : String(error);
    respond({
      type: 'error',
      sessionId: request.sessionId,
      requestId: request.requestId,
      error: runtimeDiagnostic(message),
    });
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'init') {
    void initialize(request.sessionId);
  } else {
    analyzeSource(request);
  }
});
