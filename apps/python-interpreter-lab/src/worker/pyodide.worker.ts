import type { AnalysisResult, PythonDiagnostic, WorkerExecutionResult, WorkerRequest, WorkerResponse } from '../analysis/types';

const PYODIDE_VERSION = '314.0.7';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_MODULE_URL = `${PYODIDE_BASE_URL}pyodide.mjs`;

interface PyodideRuntime {
  version: string;
  runPython(source: string): unknown;
  globals: {
    set(name: string, value: unknown): void;
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
import io
import json
import sys
import token
import tokenize
import types

MAX_AST_NODES = 5000
MAX_AST_DEPTH = 100
MAX_CODE_OBJECTS = 200
MAX_INSTRUCTIONS_PER_CODE = 20000
MAX_TOTAL_INSTRUCTIONS = 50000
MAX_TOKENS = 5000
MAX_TOKEN_TEXT = 256
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
    node_id = AST_NODE_COUNT
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
        'id': 'ast-' + str(node_id),
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

    tokens = []
    tokens_truncated = False
    tokenization_error = None
    try:
        for item in tokenize.generate_tokens(io.StringIO(source).readline):
            if len(tokens) >= MAX_TOKENS:
                tokens_truncated = True
                break
            text = item.string
            text_truncated = len(text) > MAX_TOKEN_TEXT
            tokens.append({
                'index': len(tokens),
                'type': token.tok_name.get(item.type, str(item.type)),
                'exactType': token.tok_name.get(item.exact_type, str(item.exact_type)),
                'text': text[:MAX_TOKEN_TEXT] + ('…' if text_truncated else ''),
                'textTruncated': text_truncated,
                'start': {'line': item.start[0], 'column': item.start[1]},
                'end': {'line': item.end[0], 'column': item.end[1]},
            })
    except Exception as error:
        tokenization_error = {
            'type': type(error).__name__,
            'message': short_text(getattr(error, 'msg', str(error)), 1000),
        }

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
            'tokens': tokens,
            'tokensTruncated': tokens_truncated,
            'tokenizationError': tokenization_error,
        },
    }

json.dumps(analyze(__user_source), ensure_ascii=False, allow_nan=False)
`;

const EXECUTE_PYTHON = String.raw`
import json
import sys
import time
import types

MAX_TRACE_EVENTS = 5000
MAX_OUTPUT_CHARACTERS = 32768
MAX_CALL_DEPTH = 40
MAX_LOCALS = 20
MAX_NAME_CANDIDATES = 64
MAX_NAME_LENGTH = 100
MAX_VALUE_LENGTH = 120
MAX_STRING_PREVIEW = 10
MAX_BYTES_PREVIEW = 16
MAX_INTEGER_PREVIEW_BITS = 256
MAX_SNAPSHOT_NODES_PER_EVENT = 200
MAX_SNAPSHOT_NODES_PER_RUN = 50000
MAX_SNAPSHOT_DEPTH = 3
MAX_SNAPSHOT_CHILDREN = 8
MAX_SNAPSHOT_STRING_LENGTH = 120
MAX_SNAPSHOT_BYTES_LENGTH = 32
MAX_SNAPSHOT_INTEGER_BITS = 1024
BATCH_EVENTS = 32
BATCH_OUTPUT_CHARACTERS = 1024
SOURCE_FILENAME = '<input>'

_SAFE_TYPE = type
_SAFE_TYPE_NAME_GET = type.__dict__['__name__'].__get__
_SAFE_LEN = len
_SAFE_STR = str
_SAFE_REPR = repr
_SAFE_RANGE = range
_SAFE_SORTED = sorted
_SAFE_ID = id
_SAFE_ITER = iter
_SAFE_NEXT = next
_SAFE_DICT_ITEMS = dict.items
_SAFE_LIST_GETITEM = list.__getitem__
_SAFE_TUPLE_GETITEM = tuple.__getitem__
_SAFE_BYTES_HEX = bytes.hex
_SAFE_INT_BIT_LENGTH = int.bit_length
_SAFE_STR_TYPE = str
_SAFE_BYTES_TYPE = bytes
_SAFE_INT_TYPE = int
_SAFE_FLOAT_TYPE = float
_SAFE_BOOL_TYPE = bool
_SAFE_LIST_TYPE = list
_SAFE_TUPLE_TYPE = tuple
_SAFE_DICT_TYPE = dict
_SAFE_SET_TYPE = set

started_at = time.perf_counter()
source = __lab_source
variable_ids = {}
next_variable_id = 1

def bounded_name(value):
    if _SAFE_LEN(value) > MAX_NAME_LENGTH:
        return value[:MAX_NAME_LENGTH - 1] + '…'
    return value

def type_name(value):
    value_type = _SAFE_TYPE(value)
    name = _SAFE_TYPE_NAME_GET(value_type, _SAFE_TYPE(value_type))
    if _SAFE_TYPE(name) is not _SAFE_STR_TYPE:
        return 'object'
    return bounded_name(name)

def safe_value(name, value):
    value_type = _SAFE_TYPE(value)
    value_type_name = type_name(value)
    if value_type is _SAFE_STR_TYPE:
        preview = value[:MAX_STRING_PREVIEW]
        summary = _SAFE_REPR(preview)
        if _SAFE_LEN(value) > MAX_STRING_PREVIEW:
            summary = summary[:-1] + '…' + summary[-1]
    elif value_type is _SAFE_BYTES_TYPE:
        preview = value[:MAX_BYTES_PREVIEW]
        summary = _SAFE_REPR(preview)
        if _SAFE_LEN(value) > MAX_BYTES_PREVIEW:
            summary = summary[:-1] + '…' + summary[-1]
    elif value_type is _SAFE_INT_TYPE and _SAFE_INT_BIT_LENGTH(value) > MAX_INTEGER_PREVIEW_BITS:
        summary = '<int · ' + _SAFE_STR(_SAFE_INT_BIT_LENGTH(value)) + ' bits>'
    elif value_type in (_SAFE_TYPE(None), _SAFE_BOOL_TYPE, _SAFE_INT_TYPE, _SAFE_FLOAT_TYPE):
        summary = _SAFE_REPR(value)
    elif value_type in (_SAFE_LIST_TYPE, _SAFE_TUPLE_TYPE, _SAFE_SET_TYPE, _SAFE_DICT_TYPE):
        summary = '<' + value_type_name + ' · ' + _SAFE_STR(_SAFE_LEN(value)) + ' items>'
    else:
        summary = '<' + value_type_name + '>'
    name = bounded_name(name)
    if _SAFE_LEN(summary) > MAX_VALUE_LENGTH:
        summary = summary[:MAX_VALUE_LENGTH] + '…'
    return {'name': name, 'type': value_type_name, 'summary': summary}

def exception_summary(error, traceback_object=None):
    error_type = type_name(error)
    if type(error) is SyntaxError:
        message = error.msg or ''
        line = error.lineno
    else:
        args = BaseException.__dict__['args'].__get__(error, type(error))
        message = ', '.join(safe_value('', value)['summary'] for value in args[:2])
        line = None
        if traceback_object is None:
            traceback_object = BaseException.__dict__['__traceback__'].__get__(error, type(error))
        while traceback_object is not None:
            frame = traceback_object.tb_frame
            if frame.f_code.co_filename == SOURCE_FILENAME:
                line = traceback_object.tb_lineno
            traceback_object = traceback_object.tb_next
    if len(message) > 240:
        message = message[:240] + '…'
    return {'type': error_type, 'message': message, 'line': line}

class CappedOutput:
    encoding = 'utf-8'

    def __init__(self, state):
        self.state = state
        self.parts = []
        self.pending = []
        self.pending_length = 0
        self.length = 0
        self.truncated = False

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError('write() argument must be str')
        remaining = MAX_OUTPUT_CHARACTERS - self.state['captured']
        retained = text[:max(0, remaining)]
        if retained:
            self.parts.append(retained)
            self.pending.append(retained)
            self.pending_length += len(retained)
            self.length += len(retained)
            self.state['captured'] += len(retained)
        if len(retained) < len(text):
            self.truncated = True
            self.state['truncated'] = True
        if self.pending_length >= BATCH_OUTPUT_CHARACTERS:
            flush_batch()
        return len(text)

    def flush(self):
        return None

    def getvalue(self):
        return ''.join(self.parts)

    def take_pending(self):
        text = ''.join(self.pending)
        self.pending = []
        self.pending_length = 0
        return text

output_state = {'captured': 0, 'truncated': False}
stdout = CappedOutput(output_state)
stderr = CappedOutput(output_state)
pending_events = []
event_count = 0
trace_truncated = False
trace_enabled = True
emitter_failed = False
snapshot_node_count = 0
active_frame_ids = {}
next_frame_id = 1

def flush_batch(force=False):
    global emitter_failed
    if emitter_failed:
        pending_events.clear()
        stdout.take_pending()
        stderr.take_pending()
        return
    if not force and len(pending_events) < BATCH_EVENTS and stdout.pending_length < BATCH_OUTPUT_CHARACTERS and stderr.pending_length < BATCH_OUTPUT_CHARACTERS:
        return
    if not pending_events and stdout.pending_length == 0 and stderr.pending_length == 0:
        return
    payload = {
        'events': pending_events[:],
        'stdout': stdout.take_pending(),
        'stderr': stderr.take_pending(),
    }
    pending_events.clear()
    try:
        __lab_emit(json.dumps(payload, ensure_ascii=False, allow_nan=False))
    except BaseException:
        emitter_failed = True

def snapshot_names(mapping):
    names = []
    iterator = _SAFE_ITER(mapping)
    truncated = False
    for _ in _SAFE_RANGE(MAX_NAME_CANDIDATES):
        try:
            name = _SAFE_NEXT(iterator)
        except StopIteration:
            break
        if _SAFE_TYPE(name) is _SAFE_STR_TYPE and name not in ('__builtins__', '__name__', '__doc__', '__annotations__'):
            names.append(name)
    else:
        try:
            _SAFE_NEXT(iterator)
        except StopIteration:
            pass
        else:
            truncated = True
    names = _SAFE_SORTED(names)
    if _SAFE_LEN(names) > MAX_LOCALS:
        truncated = True
    return names[:MAX_LOCALS], truncated

def bounded_summary(value):
    if _SAFE_LEN(value) <= MAX_VALUE_LENGTH:
        return value
    return value[:MAX_VALUE_LENGTH - 1] + '…'

def safe_key_label(value, index):
    value_type = _SAFE_TYPE(value)
    if value_type is _SAFE_STR_TYPE:
        preview = value[:40]
        return _SAFE_REPR(preview) + ('…' if _SAFE_LEN(value) > 40 else '')
    if value_type is _SAFE_INT_TYPE:
        bits = _SAFE_INT_BIT_LENGTH(value)
        return _SAFE_STR(value) if bits <= MAX_SNAPSHOT_INTEGER_BITS else '<int · ' + _SAFE_STR(bits) + ' bits>'
    if value_type in (_SAFE_TYPE(None), _SAFE_BOOL_TYPE, _SAFE_FLOAT_TYPE):
        return _SAFE_REPR(value)
    if value_type is _SAFE_BYTES_TYPE:
        preview = value[:16]
        return _SAFE_REPR(preview) + ('…' if _SAFE_LEN(value) > 16 else '')
    return 'key ' + _SAFE_STR(index + 1) + ' · ' + type_name(value)

def snapshot_node(name, value, depth, state):
    global snapshot_node_count
    if state['nodes'] >= MAX_SNAPSHOT_NODES_PER_EVENT or snapshot_node_count >= MAX_SNAPSHOT_NODES_PER_RUN:
        state['truncated'] = True
        if snapshot_node_count >= MAX_SNAPSHOT_NODES_PER_RUN:
            state['budgetExhausted'] = True
        return None
    state['nodes'] += 1
    snapshot_node_count += 1

    value_type = _SAFE_TYPE(value)
    value_type_name = type_name(value)
    name = bounded_name(name)
    if value_type is _SAFE_TYPE(None):
        return {'name': name, 'type': value_type_name, 'kind': 'scalar', 'summary': 'None', 'valueText': 'None'}
    if value_type is _SAFE_BOOL_TYPE:
        text = _SAFE_REPR(value)
        return {'name': name, 'type': value_type_name, 'kind': 'scalar', 'summary': text, 'valueText': text}
    if value_type is _SAFE_INT_TYPE:
        bits = _SAFE_INT_BIT_LENGTH(value)
        if bits > MAX_SNAPSHOT_INTEGER_BITS:
            state['truncated'] = True
            return {
                'name': name,
                'type': value_type_name,
                'kind': 'scalar',
                'summary': '<int · ' + _SAFE_STR(bits) + ' bits>',
                'truncated': True,
            }
        text = _SAFE_STR(value)
        return {'name': name, 'type': value_type_name, 'kind': 'scalar', 'summary': text, 'valueText': text}
    if value_type is _SAFE_FLOAT_TYPE:
        text = _SAFE_REPR(value)
        return {'name': name, 'type': value_type_name, 'kind': 'scalar', 'summary': text, 'valueText': text}
    if value_type is _SAFE_STR_TYPE:
        preview = value[:MAX_SNAPSHOT_STRING_LENGTH]
        truncated = _SAFE_LEN(value) > MAX_SNAPSHOT_STRING_LENGTH
        summary = _SAFE_REPR(preview)
        if truncated:
            summary = '<str · ' + _SAFE_STR(_SAFE_LEN(value)) + ' chars> ' + summary
            state['truncated'] = True
        return {
            'name': name,
            'type': value_type_name,
            'kind': 'scalar',
            'summary': bounded_summary(summary),
            'valueText': preview,
            'truncated': truncated,
        }
    if value_type is _SAFE_BYTES_TYPE:
        preview = value[:MAX_SNAPSHOT_BYTES_LENGTH]
        truncated = _SAFE_LEN(value) > MAX_SNAPSHOT_BYTES_LENGTH
        summary = _SAFE_REPR(preview)
        if truncated:
            summary = '<bytes · ' + _SAFE_STR(_SAFE_LEN(value)) + ' bytes> ' + summary
            state['truncated'] = True
        return {
            'name': name,
            'type': value_type_name,
            'kind': 'scalar',
            'summary': bounded_summary(summary),
            'valueText': '0x' + _SAFE_BYTES_HEX(preview),
            'truncated': truncated,
        }

    if value_type not in (_SAFE_LIST_TYPE, _SAFE_TUPLE_TYPE, _SAFE_DICT_TYPE):
        if value_type is _SAFE_SET_TYPE:
            summary = '<set · ' + _SAFE_STR(_SAFE_LEN(value)) + ' items>'
        else:
            summary = '<' + value_type_name + '>'
        return {'name': name, 'type': value_type_name, 'kind': 'object', 'summary': bounded_summary(summary)}

    identity = _SAFE_ID(value)
    reference_id = state['references'].get(identity)
    if reference_id is not None:
        return {
            'name': name,
            'type': value_type_name,
            'kind': 'reference',
            'summary': 'reference',
            'referenceId': reference_id,
        }
    reference_id = state['nextReferenceId']
    state['nextReferenceId'] += 1
    state['references'][identity] = reference_id
    item_count = _SAFE_LEN(value)
    node = {
        'name': name,
        'type': value_type_name,
        'kind': 'container',
        'summary': '<' + value_type_name + ' · ' + _SAFE_STR(item_count) + ' items>',
        'itemCount': item_count,
        'referenceId': reference_id,
        'children': [],
    }
    if depth >= MAX_SNAPSHOT_DEPTH:
        if item_count:
            node['truncated'] = True
            state['truncated'] = True
        return node

    children = []
    child_limit = min(item_count, MAX_SNAPSHOT_CHILDREN)
    dict_iterator = _SAFE_ITER(_SAFE_DICT_ITEMS(value)) if value_type is _SAFE_DICT_TYPE else None
    for index in _SAFE_RANGE(child_limit):
        if value_type is _SAFE_LIST_TYPE:
            child_name = '[' + _SAFE_STR(index) + ']'
            child_value = _SAFE_LIST_GETITEM(value, index)
        elif value_type is _SAFE_TUPLE_TYPE:
            child_name = '[' + _SAFE_STR(index) + ']'
            child_value = _SAFE_TUPLE_GETITEM(value, index)
        else:
            key, child_value = _SAFE_NEXT(dict_iterator)
            child_name = '[' + safe_key_label(key, index) + ']'
        child = snapshot_node(child_name, child_value, depth + 1, state)
        if child is None:
            node['truncated'] = True
            break
        children.append(child)
        if child.get('truncated'):
            node['truncated'] = True
    if item_count > child_limit or node.get('truncated'):
        node['truncated'] = True
        state['truncated'] = True
    node['children'] = children
    return node

def snapshot_scope(mapping, state):
    global next_variable_id
    if state['nodes'] >= MAX_SNAPSHOT_NODES_PER_EVENT or snapshot_node_count >= MAX_SNAPSHOT_NODES_PER_RUN:
        state['truncated'] = True
        if snapshot_node_count >= MAX_SNAPSHOT_NODES_PER_RUN:
            state['budgetExhausted'] = True
        return [], True
    names, truncated = snapshot_names(mapping)
    values = []
    for name in names:
        node = snapshot_node(name, mapping[name], 0, state)
        if node is None:
            truncated = True
            break
        variable_id = variable_ids.get(name)
        if variable_id is None:
            variable_id = next_variable_id
            next_variable_id += 1
            variable_ids[name] = variable_id
        node['variableId'] = variable_id
        values.append(node)
        if node.get('truncated'):
            truncated = True
    return values, truncated

def frame_id_for(frame):
    global next_frame_id
    identity = _SAFE_ID(frame)
    frame_id = active_frame_ids.get(identity)
    if frame_id is None:
        frame_id = next_frame_id
        next_frame_id += 1
        active_frame_ids[identity] = frame_id
    return frame_id

def frames_for(frame):
    newest_first = []
    current = frame
    while current is not None:
        if current.f_code.co_filename == SOURCE_FILENAME:
            newest_first.append(current)
        current = current.f_back
    for active in reversed(newest_first):
        frame_id_for(active)
    truncated = _SAFE_LEN(newest_first) > MAX_CALL_DEPTH
    frames = list(reversed(newest_first[:MAX_CALL_DEPTH]))
    call_stack = [bounded_name(active.f_code.co_name) for active in frames]
    return frames, call_stack, truncated

def snapshot_for(frame, frames, call_stack_truncated):
    state = {
        'nodes': 0,
        'references': {},
        'nextReferenceId': 1,
        'truncated': call_stack_truncated,
        'budgetExhausted': snapshot_node_count >= MAX_SNAPSHOT_NODES_PER_RUN,
    }
    global_values, globals_truncated = snapshot_scope(user_globals, state)
    frame_values = []
    current_frame_id = frame_id_for(frame)
    for active in frames:
        frame_id = frame_id_for(active)
        if active.f_code.co_name == '<module>':
            local_values = []
            locals_truncated = False
        else:
            local_values, locals_truncated = snapshot_scope(active.f_locals, state)
        frame_values.append({
            'frameId': frame_id,
            'functionName': bounded_name(active.f_code.co_name),
            'line': active.f_lineno,
            'locals': local_values,
            'localsTruncated': locals_truncated,
        })
        if locals_truncated:
            state['truncated'] = True
    if globals_truncated:
        state['truncated'] = True
    return {
        'globals': global_values,
        'globalsTruncated': globals_truncated,
        'frames': frame_values,
        'currentFrameId': current_frame_id,
        'truncated': state['truncated'],
        'budgetExhausted': state['budgetExhausted'],
    }

def record_event(frame, event, argument):
    global event_count, trace_truncated, trace_enabled
    if frame.f_code.co_filename != SOURCE_FILENAME:
        return None
    if event_count >= MAX_TRACE_EVENTS:
        trace_truncated = True
        trace_enabled = False
        return None
    frames, call_stack, call_stack_truncated = frames_for(frame)
    snapshot = snapshot_for(frame, frames, call_stack_truncated)
    event_data = {
        'index': event_count,
        'event': event,
        'phase': {
            'call': 'frame-enter',
            'line': 'line-before',
            'exception': 'exception-raised',
            'return': 'frame-exit',
        }[event],
        'line': frame.f_lineno,
        'functionName': bounded_name(frame.f_code.co_name),
        'callStack': call_stack,
        'callStackTruncated': call_stack_truncated,
        'snapshot': snapshot,
        'stdoutOffset': stdout.length,
        'stderrOffset': stderr.length,
    }
    if event == 'return':
        event_data['returnValue'] = safe_value('return', argument)
    elif event == 'exception':
        exception_type, error, traceback_object = argument
        event_data['exception'] = exception_summary(error, traceback_object)
    pending_events.append(event_data)
    event_count += 1
    if event == 'return':
        active_frame_ids.pop(_SAFE_ID(frame), None)
    if len(pending_events) >= BATCH_EVENTS:
        flush_batch()
    return record_event if trace_enabled else None

user_globals = {'__name__': '__main__'}
compiled = None
outcome = 'completed'
final_exception = None
try:
    compiled = compile(source, SOURCE_FILENAME, 'exec')
except BaseException as error:
    outcome = 'exception'
    final_exception = exception_summary(error)

if compiled is not None:
    original_stdout = sys.stdout
    original_stderr = sys.stderr
    try:
        sys.stdout = stdout
        sys.stderr = stderr
        sys.settrace(record_event)
        exec(compiled, user_globals, user_globals)
    except BaseException as error:
        outcome = 'exception'
        final_exception = exception_summary(error)
    finally:
        sys.settrace(None)
        sys.stdout = original_stdout
        sys.stderr = original_stderr

flush_batch(force=True)
json.dumps({
    'outcome': outcome,
    'traceTruncated': trace_truncated or emitter_failed,
    'stdout': stdout.getvalue(),
    'stderr': stderr.getvalue(),
    'outputTruncated': output_state['truncated'],
    'durationMs': int((time.perf_counter() - started_at) * 1000),
    'exception': final_exception,
}, ensure_ascii=False, allow_nan=False)
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

function executeSource(request: Extract<WorkerRequest, { type: 'execute' }>): void {
  if (!runtime || request.sessionId !== sessionId) return;
  try {
    runtime.globals.set('__lab_source', request.source);
    runtime.globals.set('__lab_emit', (json: string) => {
      const batch = JSON.parse(json) as Pick<WorkerResponse & { type: 'execution-batch' }, 'events' | 'stdout' | 'stderr'>;
      respond({
        type: 'execution-batch',
        sessionId: request.sessionId,
        requestId: request.requestId,
        events: batch.events,
        stdout: batch.stdout,
        stderr: batch.stderr,
      });
    });
    const raw = fromPythonString(runtime.runPython(EXECUTE_PYTHON));
    const result = JSON.parse(raw) as WorkerExecutionResult;
    respond({ type: 'execution-complete', sessionId: request.sessionId, requestId: request.requestId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    respond({
      type: 'error',
      sessionId: request.sessionId,
      requestId: request.requestId,
      error: runtimeDiagnostic(message),
    });
  } finally {
    runtime.globals.delete('__lab_source');
    runtime.globals.delete('__lab_emit');
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'init') {
    void initialize(request.sessionId);
  } else if (request.type === 'analyze') {
    analyzeSource(request);
  } else {
    executeSource(request);
  }
});
