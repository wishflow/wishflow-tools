import assert from 'node:assert/strict';
import test from 'node:test';
import { compileTeachingSource } from '../src/teaching-vm/compiler';
import {
  createTeachingMachine,
  getTeachingHistory,
  stepTeachingMachine,
} from '../src/teaching-vm/vm';
import { MAX_ACTIVE_FRAME_COUNT, MAX_DYNAMIC_INSTRUCTION_COUNT, MAX_HISTORY_CONTAINER_RECORDS, MAX_NAME_COUNT } from '../src/teaching-vm/resource-limits';

test('steps each bytecode instruction and records stack, variables, output, and finish state', () => {
  const machine = createTeachingMachine(compileTeachingSource('x = 1 + 2 * 3\nprint(x)'));
  const expected = [
    { stack: [], variables: [], output: [], status: 'ready' },
    { stack: ['1'], variables: [], output: [], status: 'paused' },
    { stack: ['1', '2'], variables: [], output: [], status: 'paused' },
    { stack: ['1', '2', '3'], variables: [], output: [], status: 'paused' },
    { stack: ['1', '6'], variables: [], output: [], status: 'paused' },
    { stack: ['7'], variables: [], output: [], status: 'paused' },
    { stack: [], variables: [['x', '7']], output: [], status: 'paused' },
    { stack: ['7'], variables: [['x', '7']], output: [], status: 'paused' },
    { stack: [], variables: [['x', '7']], output: ['7'], status: 'paused' },
    { stack: [], variables: [['x', '7']], output: ['7'], status: 'finished' },
  ];

  const snapshots = [machine.current];
  while (machine.current.status !== 'finished') snapshots.push(stepTeachingMachine(machine));
  assert.deepEqual(snapshots.map(({ stack, variables, output, status }) => ({
    stack: stack.map(({ value }) => value),
    variables: variables.map(({ name, value }) => [name, value.value]),
    output,
    status,
  })), expected);
  assert.equal(snapshots.at(-1)?.lastExecutedInstructionIndex, 8);
  assert.equal(snapshots.at(-1)?.nextInstructionIndex, null);
  assert.equal(stepTeachingMachine(machine), snapshots.at(-1));
});

test('allocates lists with stable IDs and immutable per-step heap snapshots', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'empty = []',
    'first = [1, "x"]',
    'nested = [first, []]',
    'other = [1, "x"]',
  ].join('\n')));
  const snapshots = [machine.current];
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') {
    snapshots.push(stepTeachingMachine(machine));
  }

  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.variables.map(({ name, value }) => [name, value.type, value.objectId]), [
    ['empty', 'list', 1],
    ['first', 'list', 2],
    ['nested', 'list', 4],
    ['other', 'list', 5],
  ]);
  assert.deepEqual(machine.current.heap.map((object) => object.type === 'list' ? [
    object.id,
    object.type,
    object.items.map(({ type: itemType, value, objectId }) => [itemType, value, objectId]),
  ] : [object.id, object.type, []]), [
    [1, 'list', []],
    [2, 'list', [['int', '1', undefined], ['str', 'x', undefined]]],
    [3, 'list', []],
    [4, 'list', [['list', 'list #2', 2], ['list', 'list #3', 3]]],
    [5, 'list', [['int', '1', undefined], ['str', 'x', undefined]]],
  ]);

  const nestedSnapshot = snapshots.find(({ variables }) => variables.some(({ name }) => name === 'nested'));
  const nestedObject = nestedSnapshot?.heap.find(({ id }) => id === 4);
  assert.ok(nestedObject);
  assert.ok(Object.isFrozen(nestedSnapshot?.heap));
  assert.ok(Object.isFrozen(nestedObject));
  if (nestedObject.type !== 'list') assert.fail('expected list snapshot');
  assert.ok(Object.isFrozen(nestedObject.items));
});

test('caps list object allocation for a single run', () => {
  const source = Array.from({ length: 257 }, () => 'items = []').join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'error' && machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'heap-object-limit-exceeded');
});

test('reads and writes list indices through shared aliases without changing prior snapshots', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'a = [1, 2]',
    'b = a',
    'before = a[0]',
    'b[0] = 9',
    'print(a[0], b[-1], before)',
  ].join('\n')));
  const snapshots = [machine.current];
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') {
    snapshots.push(stepTeachingMachine(machine));
  }

  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['9 2 1']);
  const a = machine.current.variables.find(({ name }) => name === 'a')?.value;
  const b = machine.current.variables.find(({ name }) => name === 'b')?.value;
  assert.equal(a?.objectId, b?.objectId);
  const currentList = machine.current.heap.find(({ id }) => id === a?.objectId);
  assert.ok(currentList);
  if (currentList.type !== 'list') assert.fail('expected list snapshot');
  assert.deepEqual(currentList.items.map(({ value }) => value), ['9', '2']);

  const beforeWrite = snapshots.find(({ variables }) => variables.some(({ name }) => name === 'before'));
  const previousList = beforeWrite?.heap.find(({ id }) => id === a?.objectId);
  assert.ok(previousList);
  if (previousList.type !== 'list') assert.fail('expected list snapshot');
  assert.deepEqual(previousList.items.map(({ value }) => value), ['1', '2']);
});

test('writes through nested subscript targets', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'matrix = [[1, 2], [3, 4]]',
    'matrix[0][1] = 9',
    'print(matrix[0][0], matrix[0][1], matrix[-1][-1])',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['1 9 4']);
  assert.deepEqual(machine.current.heap.map((object) => object.type === 'list'
    ? [object.id, object.items.map(({ value, objectId }) => [value, objectId])]
    : [object.id, []]), [
    [1, [['1', undefined], ['9', undefined]]],
    [2, [['3', undefined], ['4', undefined]]],
    [3, [['list #1', 1], ['list #2', 2]]],
  ]);
});

test('uses bool indices as integers and reports invalid or out-of-range indices', () => {
  const machine = createTeachingMachine(compileTeachingSource('items = [10, 20]\nprint(items[True], items[False], items[-1])'));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['20 10 20']);

  for (const source of ['items = [1]\nprint(items[1])', 'items = [1]\nitems[-2] = 9']) {
    const failed = createTeachingMachine(compileTeachingSource(source));
    while (failed.current.status !== 'error' && failed.current.status !== 'finished') stepTeachingMachine(failed);
    assert.equal(failed.current.status, 'error');
    assert.equal(failed.current.diagnostic?.code, 'index-out-of-range');
  }

  const wrongType = createTeachingMachine(compileTeachingSource('items = [1]\nprint(items["0"])'));
  while (wrongType.current.status !== 'error' && wrongType.current.status !== 'finished') stepTeachingMachine(wrongType);
  assert.equal(wrongType.current.diagnostic?.code, 'type-error');
});

test('evaluates subscript assignment value before container and index expressions', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'items = [0]',
    'def value():',
    '  print("value")',
    '  return 9',
    'def container():',
    '  print("container")',
    '  return items',
    'def index():',
    '  print("index")',
    '  return 0',
    'container()[index()] = value()',
    'print(items[0])',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['value', 'container', 'index', '9']);
});

test('preserves dictionary insertion order and merges bool/integer-equivalent keys', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'mapping = {True: "first", 1: "second", False: "third", 0: "fourth", "x": None, "nested": {"child": 3,},}',
    'alias = mapping',
    'alias[True] = "updated"',
    'alias[None] = "none key"',
    'print(mapping[True], mapping[1], mapping[False], mapping[0], mapping["x"], mapping[None], mapping["nested"]["child"])',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['updated updated fourth fourth None none key 3']);
  const mapping = machine.current.variables.find(({ name }) => name === 'mapping')?.value;
  assert.equal(mapping?.type, 'dict');
  const dictionary = machine.current.heap.find(({ id }) => id === mapping?.objectId);
  assert.ok(dictionary);
  if (dictionary.type !== 'dict') assert.fail('expected dictionary snapshot');
  assert.deepEqual(dictionary.entries.map(({ key, value }) => [key.type, key.value, value.value]), [
    ['bool', 'True', 'updated'],
    ['bool', 'False', 'fourth'],
    ['str', 'x', 'None'],
    ['str', 'nested', 'dict #1'],
    ['none', 'None', 'none key'],
  ]);
});

test('evaluates dictionary keys and values from left to right and uses dict truthiness', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def first_key():',
    '  print("key 1")',
    '  return "first"',
    'def first_value():',
    '  print("value 1")',
    '  return 1',
    'def second_key():',
    '  print("key 2")',
    '  return "second"',
    'def second_value():',
    '  print("value 2")',
    '  return 2',
    'empty = {}',
    'mapping = {first_key(): first_value(), second_key(): second_value()}',
    'if empty:',
    '  print("wrong empty truth value")',
    'else:',
    '  print("empty is false")',
    'if mapping:',
    '  print(mapping["first"], mapping["second"])',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['key 1', 'value 1', 'key 2', 'value 2', 'empty is false', '1 2']);
});

test('rejects unhashable dictionary keys and reports missing keys', () => {
  const unhashable = createTeachingMachine(compileTeachingSource('mapping = {[]: 1}'));
  while (unhashable.current.status !== 'error' && unhashable.current.status !== 'finished') stepTeachingMachine(unhashable);
  assert.equal(unhashable.current.diagnostic?.code, 'type-error');

  const missing = createTeachingMachine(compileTeachingSource('mapping = {"x": 1}\nprint(mapping["missing"])'));
  while (missing.current.status !== 'error' && missing.current.status !== 'finished') stepTeachingMachine(missing);
  assert.equal(missing.current.diagnostic?.code, 'key-not-found');
});

test('enforces the per-dictionary entry limit before creating the object', () => {
  const entries = Array.from({ length: 257 }, (_, index) => `${index}: ${index}`).join(', ');
  const machine = createTeachingMachine(compileTeachingSource(`mapping = {${entries}}`));
  while (machine.current.status !== 'error' && machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'container-size-limit-exceeded');
  assert.deepEqual(machine.current.heap, []);
  assert.deepEqual(machine.current.variables, []);
});

test('prints strings and zero arguments using Python-like output formatting', () => {
  const machine = createTeachingMachine(compileTeachingSource('print("hello", "🐍", 42)\nprint()'));
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ['hello 🐍 42', '']);
});

test('prints nested containers, repeated shared references, and self-cycles with Python-style repr', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'items = [1, "x"]',
    'mapping = {"items": items, "nothing": None}',
    'shared = ["same"]',
    'print(items, mapping)',
    'print([shared, shared])',
    `print(["a'b", 'a"b', "line\\nnext"])`,
    'cycle_list = [None]',
    'cycle_list[0] = cycle_list',
    'print(cycle_list)',
    'cycle_dict = {"self": None}',
    'cycle_dict["self"] = cycle_dict',
    'print(cycle_dict)',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, [
    "[1, 'x'] {'items': [1, 'x'], 'nothing': None}",
    "[['same'], ['same']]",
    '["a\'b", \'a"b\', \'line\\nnext\']',
    '[[...]]',
    "{'self': {...}}",
  ]);
});

test('escapes non-printable Unicode in nested string repr like CPython', () => {
  const nonPrintable = String.fromCodePoint(0x85, 0x2028, 0x200b, 0xa0);
  const machine = createTeachingMachine(compileTeachingSource(`print(["${nonPrintable}"])`));
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ["['\\x85\\u2028\\u200b\\xa0']"]);
});

test('formats large shared acyclic graphs within the output budget without expanding without bound', () => {
  const source = [
    'value = ["x"]',
    ...Array.from({ length: 100 }, (_, index) => `value${index} = [${index === 0 ? 'value' : `value${index - 1}`}, ${index === 0 ? 'value' : `value${index - 1}`}]`),
    'print(value99)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'error' && machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'output-too-long');
  assert.deepEqual(machine.current.output, []);
  assert.equal(machine.current.stack[0]?.type, 'list');
});

test('uses Python truthiness, operand-returning short circuit, and boolean integer arithmetic', () => {
  const source = [
    'print(False and missing, True or missing)',
    'print(False or "fallback", True and 3)',
    'print(not 0, not "", not "x", not False)',
    'print(True + True, False * 4, -True)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, [
    'False True',
    'fallback 3',
    'True True False True',
    '2 0 -1',
  ]);
});

test('compares bools and ints numerically and strings by Unicode code point', () => {
  const machine = createTeachingMachine(compileTeachingSource('print(False == 0, True == 1, "a" < "b", "🐍" < "\uE000")'));
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ['True True True False']);

  const mismatch = createTeachingMachine(compileTeachingSource('print("a" < 1)'));
  while (mismatch.current.status !== 'error') stepTeachingMachine(mismatch);
  assert.equal(mismatch.current.diagnostic?.code, 'type-error');
});

test('compares nested lists and dictionaries structurally while ignoring dictionary insertion order', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'left = [1, {"a": True, "b": [None]}]',
    'right = [True, {"b": [None], "a": 1}]',
    'same_mapping = {"y": 2, "x": [True]}',
    'other_mapping = {"x": [1], "y": 2}',
    'print(left == right, left != right, same_mapping == other_mapping, [1, 2] == [2, 1], [] == {})',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['True False True False False']);
});

test('compares cyclic container graphs using visited object pairs', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'first = [None, 1]',
    'first[0] = first',
    'same = [None, True]',
    'same[0] = same',
    'different = [None, 2]',
    'different[0] = different',
    'print(first == same, first != same, first == different)',
    'left = {"self": None, "value": 1}',
    'left["self"] = left',
    'right = {"value": True, "self": None}',
    'right["self"] = right',
    'print(left == right)',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['True False False', 'True']);
});

test('passes container references into functions, mutates them, and returns nested references', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'items = [1]',
    'def wrap(value):',
    '  value[0] = 7',
    '  return {"items": value}',
    'result = wrap(items)',
    'result["items"][0] = 8',
    'print(items[0], result["items"][0])',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['8 8']);
  const itemsId = machine.current.variables.find(({ name }) => name === 'items')?.value.objectId;
  const result = machine.current.variables.find(({ name }) => name === 'result')?.value;
  assert.equal(result?.type, 'dict');
  const resultObject = machine.current.heap.find(({ id }) => id === result?.objectId);
  assert.ok(resultObject);
  if (resultObject.type !== 'dict') assert.fail('expected result dictionary snapshot');
  assert.equal(resultObject.entries[0]?.value.objectId, itemsId);
  assert.ok(getTeachingHistory(machine).items.some((snapshot) => snapshot.frames.some((frame) => (
    frame.functionName === 'wrap' && frame.variables.some(({ name, value }) => name === 'value' && value.objectId === itemsId)
  ))));
});

test('enforces the total heap-entry budget across repeated bounded container literals', () => {
  const pairs = Array.from({ length: 256 }, (_, index) => `${index}: ${index}`).join(', ');
  const machine = createTeachingMachine(compileTeachingSource(`for i in range(9):\n  mapping = {${pairs}}`));
  while (machine.current.status !== 'error' && machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'heap-entry-limit-exceeded');
});

test('prints None, treats it as false, and compares it by identity-like scalar rules', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'value = None',
    'if value:',
    '  print("wrong")',
    'else:',
    '  print(value, not value, value == None, value != None, value != False, value == 0, value != "")',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['None True True False True False True']);
  assert.equal(machine.current.variables.find(({ name }) => name === 'value')?.value.type, 'none');
  assert.equal(machine.current.variables.find(({ name }) => name === 'value')?.value.display, 'None');

  const ordered = createTeachingMachine(compileTeachingSource('print(None < 1)'));
  while (ordered.current.status !== 'error') stepTeachingMachine(ordered);
  assert.equal(ordered.current.diagnostic?.code, 'type-error');

  const sameTypeOrdering = createTeachingMachine(compileTeachingSource('print(None < None)'));
  while (sameTypeOrdering.current.status !== 'error' && sameTypeOrdering.current.status !== 'finished') stepTeachingMachine(sameTypeOrdering);
  assert.equal(sameTypeOrdering.current.diagnostic?.code, 'type-error');
});

test('enters a distinct function frame and returns the value to its paused caller', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def answer():',
    '  return 42',
    'result = answer()',
    'print(result)',
  ].join('\n')));

  const moduleFrame = machine.current.frames[0];
  assert.equal(machine.current.frames.length, 1);
  assert.equal(moduleFrame?.functionName, '<module>');

  const defined = stepTeachingMachine(machine);
  assert.equal(defined.frames.length, 1);
  assert.equal(defined.variables[0]?.name, 'answer');
  assert.equal(defined.variables[0]?.value.type, 'function');

  const entered = stepTeachingMachine(machine);
  assert.equal(entered.frames.length, 2);
  assert.equal(entered.frames[0]?.pc, 2);
  assert.equal(entered.frames[1]?.functionName, 'answer');
  assert.notEqual(entered.frames[0]?.id, entered.frames[1]?.id);
  assert.deepEqual(entered.stack, []);

  const loaded = stepTeachingMachine(machine);
  assert.deepEqual(loaded.stack.map(({ value }) => value), ['42']);
  const returned = stepTeachingMachine(machine);
  assert.equal(returned.frames.length, 1);
  assert.deepEqual(returned.stack.map(({ value }) => value), ['42']);
  assert.equal(returned.nextInstructionIndex, 2);

  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['42']);
});

test('returns None for bare and implicit function returns', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def bare():',
    '  return',
    'def implicit():',
    '  x = 1',
    'print(bare(), implicit())',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['None None']);
});

test('passes required positional arguments through nested calls in source order', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def add(left, right):',
    '  return left + right',
    'def wrap(value):',
    '  return add(value, 3)',
    'def first():',
    '  print("first")',
    '  return 1',
    'def second():',
    '  print("second")',
    '  return 2',
    'def combine(left, right):',
    '  return left * 10 + right',
    'print(wrap(4), add(1 + 1, wrap(2)))',
    'print(combine(first(), second()))',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['7 7', 'first', 'second', '12']);
  assert.deepEqual(machine.current.frames.map(({ functionName }) => functionName), ['<module>']);
});

test('reports too few and too many positional arguments at runtime', () => {
  for (const source of [
    'def one(value):\n  return value\nprint(one())',
    'def one(value):\n  return value\nprint(one(1, 2))',
  ]) {
    const machine = createTeachingMachine(compileTeachingSource(source));
    while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
    assert.equal(machine.current.status, 'error');
    assert.equal(machine.current.diagnostic?.code, 'argument-count-mismatch');
    assert.equal(machine.current.frames.length, 1);
  }
});

test('keeps function-local assignments separate while falling back to module globals', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'value = 10',
    'def local_value():',
    '  value = 2',
    '  return value',
    'def global_value():',
    '  return value',
    'print(local_value(), global_value(), value)',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['2 10 10']);
});

test('classifies a later assignment as local and reports an unbound read without global fallback', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'value = 10',
    'def read_before_assignment():',
    '  if False:',
    '    value = 2',
    '  print(value)',
    'print(read_before_assignment())',
  ].join('\n')));
  while (machine.current.status !== 'error' && machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'unbound-local-error');
  assert.deepEqual(machine.current.frames.at(-1)?.unboundLocalNames, ['value']);
  assert.equal(machine.current.frames[0]?.variables.find(({ name }) => name === 'value')?.value.value, '10');
});

test('returns from a selected nested conditional block and discards the function frame', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'choice = 2',
    'def select_choice():',
    '  if choice == 1:',
    '    return 10',
    '  elif choice == 2:',
    '    return 20',
    '  else:',
    '    return 30',
    'print(select_choice())',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['20']);
  assert.equal(machine.current.frames.length, 1);
});

test('uses function scope for branch and for-loop targets and returns from a nested loop', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'value = 100',
    'def sum_prefix(limit):',
    '  total = 0',
    '  for value in range(limit):',
    '    if value == 3:',
    '      return total',
    '    total = total + value',
    '  return total',
    'def early_while(limit):',
    '  index = 0',
    '  while index < limit:',
    '    if index == 2:',
    '      return index',
    '    index = index + 1',
    '  return -1',
    'print(sum_prefix(5), value, early_while(4))',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['3 100 2']);
  assert.deepEqual(machine.program.functions[0]?.localNames, ['limit', 'total', 'value']);
  assert.equal(machine.current.frames.length, 1);
});

test('reports a missing non-local name as a name error', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def missing_global():',
    '  return absent',
    'print(missing_global())',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'name-error');
});

test('allows a function local to shadow a module function name', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def value(item):',
    '  return item',
    'def identity(value):',
    '  return value',
    'print(identity(5))',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['5']);
});

test('allows a function name to be rebound to a scalar and rejects bare function values', () => {
  const rebound = createTeachingMachine(compileTeachingSource([
    'def value():',
    '  return 1',
    'value = 5',
    'print(value)',
  ].join('\n')));
  while (rebound.current.status !== 'finished' && rebound.current.status !== 'error') stepTeachingMachine(rebound);
  assert.equal(rebound.current.status, 'finished');
  assert.deepEqual(rebound.current.output, ['5']);

  const bareFunction = createTeachingMachine(compileTeachingSource([
    'def value():',
    '  return 1',
    'print(value)',
  ].join('\n')));
  while (bareFunction.current.status !== 'finished' && bareFunction.current.status !== 'error') stepTeachingMachine(bareFunction);
  assert.equal(bareFunction.current.status, 'error');
  assert.equal(bareFunction.current.diagnostic?.code, 'function-value-unsupported');
});

test('executes recursive and mutually recursive functions', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def factorial(n):',
    '  if n <= 1:',
    '    return 1',
    '  return n * factorial(n - 1)',
    'def is_even(n):',
    '  if n == 0:',
    '    return True',
    '  return is_odd(n - 1)',
    'def is_odd(n):',
    '  if n == 0:',
    '    return False',
    '  return is_even(n - 1)',
    'print(factorial(5), is_even(4), is_odd(4))',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['120 True False']);
  assert.deepEqual(machine.current.frames.map(({ functionName }) => functionName), ['<module>']);
});

test('caps recursive calls at 64 total active frames including the module frame', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def recurse():',
    '  return recurse()',
    'print(recurse())',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'frame-limit-exceeded');
  assert.equal(machine.current.frames.length, MAX_ACTIVE_FRAME_COUNT);
  assert.equal(machine.current.frames[0]?.functionName, '<module>');
  assert.ok(machine.current.frames.slice(1).every(({ functionName }) => functionName === 'recurse'));
});

test('counts calls and returns against the shared 5,000-instruction runtime budget', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'counter = 0',
    'def tick():',
    '  return None',
    'while counter < 1000:',
    '  result = tick()',
    '  counter = counter + 1',
  ].join('\n')));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'error');
  assert.equal(machine.current.diagnostic?.code, 'instruction-budget-exceeded');
  assert.equal(machine.current.executedInstructionCount, MAX_DYNAMIC_INSTRUCTION_COUNT);
});

test('counts all active local slots against the name budget before creating a frame', () => {
  const makeSource = (localCount: number) => [
    'def allocate():',
    ...Array.from({ length: localCount }, (_, index) => `  value_${index} = ${index}`),
    '  return None',
    'print(allocate())',
  ].join('\n');

  const fits = createTeachingMachine(compileTeachingSource(makeSource(MAX_NAME_COUNT - 1)));
  while (fits.current.status !== 'finished' && fits.current.status !== 'error') stepTeachingMachine(fits);
  assert.equal(fits.current.status, 'finished');
  assert.deepEqual(fits.current.output, ['None']);

  const exceeds = createTeachingMachine(compileTeachingSource(makeSource(MAX_NAME_COUNT)));
  while (exceeds.current.status !== 'finished' && exceeds.current.status !== 'error') stepTeachingMachine(exceeds);
  assert.equal(exceeds.current.status, 'error');
  assert.equal(exceeds.current.diagnostic?.code, 'too-many-names');
  assert.equal(exceeds.current.frames.length, 1);
});

test('retains immutable full-frame snapshots across recursive return', () => {
  const machine = createTeachingMachine(compileTeachingSource([
    'def count_down(value):',
    '  if value == 0:',
    '    return 0',
    '  return count_down(value - 1) + 1',
    'print(count_down(3))',
  ].join('\n')));
  let deepestSnapshot = machine.current;
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') {
    const snapshot = stepTeachingMachine(machine);
    if (snapshot.frames.length > deepestSnapshot.frames.length) deepestSnapshot = snapshot;
  }
  assert.equal(machine.current.status, 'finished');
  assert.equal(machine.current.output[0], '3');
  assert.equal(deepestSnapshot.frames.length, 5);
  assert.equal(Object.isFrozen(deepestSnapshot.frames), true);
  assert.equal(Object.isFrozen(deepestSnapshot.frames[1]), true);
  assert.equal(Object.isFrozen(deepestSnapshot.frames[1]?.stack), true);
  assert.equal(Object.isFrozen(deepestSnapshot.frames[1]?.variables), true);
  assert.equal(deepestSnapshot.frames.length, 5);
  assert.ok(getTeachingHistory(machine).items.includes(deepestSnapshot));
});

test('records the actual next instruction and result of a short-circuit decision', () => {
  const machine = createTeachingMachine(compileTeachingSource('print(False and missing)'));
  stepTeachingMachine(machine);
  const shortCircuit = stepTeachingMachine(machine);
  assert.equal(shortCircuit.pc, 3);
  assert.deepEqual(shortCircuit.controlFlow, {
    kind: 'shortCircuit',
    outcome: 'short-circuited',
    nextInstructionIndex: 3,
  });
  while (machine.current.status !== 'finished') stepTeachingMachine(machine);
  assert.deepEqual(machine.current.output, ['False']);
});

test('executes only the selected nested if/elif/else branch and reports branch decisions', () => {
  const source = [
    'if 0:',
    '  print(missing)',
    'elif "x":',
    '  if True:',
    '    print("chosen")',
    'else:',
    '  print("fallback")',
    'print("done")',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  stepTeachingMachine(machine);
  const skipped = stepTeachingMachine(machine);
  assert.equal(skipped.controlFlow?.kind, 'branch');
  assert.equal(skipped.controlFlow?.outcome, 'branch-skipped');
  assert.equal(skipped.nextInstructionIndex, skipped.controlFlow?.nextInstructionIndex);

  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['chosen', 'done']);
});

test('repeats while bodies until the condition becomes false', () => {
  const source = [
    'i = 0',
    'while i < 3:',
    '  print(i)',
    '  i = i + 1',
    'print(i)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['0', '1', '2', '3']);
  assert.equal(machine.current.variables.find(({ name }) => name === 'i')?.value.value, '3');
});

test('stops an infinite while loop at the 5,000-instruction budget and points to the next instruction', () => {
  const machine = createTeachingMachine(compileTeachingSource('while True:\n  x = 1'));
  while (machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.executedInstructionCount, 5_000);
  assert.equal(machine.current.diagnostic?.code, 'instruction-budget-exceeded');
  assert.equal(machine.current.faultInstructionIndex, machine.current.pc);
  assert.equal(machine.current.nextInstructionIndex, machine.current.pc);
  assert.match(machine.current.diagnostic?.message ?? '', /5000/);
});

test('iterates positive, negative, and boolean ranges and preserves a previous loop binding on zero trips', () => {
  const source = [
    'for i in range(3):',
    '  print(i)',
    'for i in range(2, 5):',
    '  print(i)',
    'for i in range(2, -1, -1):',
    '  print(i)',
    'for i in range(True, False, -True):',
    '  print(i)',
    'i = 99',
    'for i in range(0):',
    '  print(missing)',
    'print(i)',
  ].join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);
  assert.equal(machine.current.status, 'finished');
  assert.deepEqual(machine.current.output, ['0', '1', '2', '2', '3', '4', '2', '1', '0', '1', '99']);
  assert.equal(machine.current.variables.find(({ name }) => name === 'i')?.value.value, '99');

  const missingBinding = createTeachingMachine(compileTeachingSource('for item in range(0):\n  print("never")\nprint(item)'));
  while (missingBinding.current.diagnostic === null && missingBinding.current.status !== 'finished') {
    stepTeachingMachine(missingBinding);
  }
  assert.equal(missingBinding.current.diagnostic?.code, 'name-error');
  assert.deepEqual(missingBinding.current.output, []);
});

test('reports zero range step and non-integer arguments without consuming stack values', () => {
  const zeroStep = createTeachingMachine(compileTeachingSource('for i in range(1, 2, 0):\n  print(i)'));
  while (zeroStep.current.diagnostic === null) stepTeachingMachine(zeroStep);
  assert.equal(zeroStep.current.diagnostic?.code, 'zero-range-step');
  assert.deepEqual(zeroStep.current.stack.map(({ value }) => value), ['1', '2', '0']);

  const wrongType = createTeachingMachine(compileTeachingSource('for i in range("x"):\n  print(i)'));
  while (wrongType.current.diagnostic === null) stepTeachingMachine(wrongType);
  assert.equal(wrongType.current.diagnostic?.code, 'type-error');
  assert.equal(wrongType.current.stack[0]?.value, 'x');
});

test('keeps range iteration lazy and shows a bounded iterator summary', () => {
  const stop = (1n << 4_000n).toString();
  const machine = createTeachingMachine(compileTeachingSource(`for i in range(${stop}):\n  print(i)`));
  stepTeachingMachine(machine);
  const rangeSnapshot = stepTeachingMachine(machine);
  assert.equal(rangeSnapshot.stack[0]?.type, 'range');
  assert.match(rangeSnapshot.stack[0]?.display ?? '', /^range\(\d+\)$/);
  stepTeachingMachine(machine);
  stepTeachingMachine(machine);
  assert.equal(machine.current.stack[0]?.type, 'iterator');
  assert.match(machine.current.stack[0]?.display ?? '', /next=1/);
  assert.equal(machine.current.stack.length, 2);
});

test('preserves the pre-error stack for NameError and TypeError', () => {
  const missing = createTeachingMachine(compileTeachingSource('print(missing)'));
  const nameError = stepTeachingMachine(missing);
  assert.equal(nameError.status, 'error');
  assert.equal(nameError.diagnostic?.code, 'name-error');
  assert.equal(nameError.faultInstructionIndex, 0);
  assert.deepEqual(nameError.stack, []);

  const typeErrorMachine = createTeachingMachine(compileTeachingSource('x = 1 + "a"'));
  stepTeachingMachine(typeErrorMachine);
  const beforeBinary = stepTeachingMachine(typeErrorMachine);
  const typeError = stepTeachingMachine(typeErrorMachine);
  assert.equal(typeError.status, 'error');
  assert.equal(typeError.diagnostic?.code, 'type-error');
  assert.deepEqual(typeError.stack, beforeBinary.stack);
});

test('enforces integer and string result budgets atomically', () => {
  const tooLargeInteger = createTeachingMachine(compileTeachingSource(`x = ${(1n << 4_096n) - 1n} + 1`));
  stepTeachingMachine(tooLargeInteger);
  const beforeOverflow = stepTeachingMachine(tooLargeInteger);
  const overflow = stepTeachingMachine(tooLargeInteger);
  assert.equal(overflow.diagnostic?.code, 'integer-too-large');
  assert.deepEqual(overflow.stack, beforeOverflow.stack);

  const tooLongString = createTeachingMachine(compileTeachingSource(`x = "${'a'.repeat(4_096)}" + "b"`));
  stepTeachingMachine(tooLongString);
  const beforeConcat = stepTeachingMachine(tooLongString);
  const concatError = stepTeachingMachine(tooLongString);
  assert.equal(concatError.diagnostic?.code, 'string-too-long');
  assert.deepEqual(concatError.stack, beforeConcat.stack);
});

test('limits total printed output without partially consuming the failing print', () => {
  const source = `s = "${'a'.repeat(4_096)}"\n${Array.from({ length: 8 }, () => 'print(s)').join('\n')}`;
  const machine = createTeachingMachine(compileTeachingSource(source));
  let previous = machine.current;

  while (machine.current.status !== 'error') {
    previous = machine.current;
    stepTeachingMachine(machine);
  }

  assert.equal(machine.current.diagnostic?.code, 'output-too-long');
  assert.equal(machine.current.output.length, 7);
  assert.equal(Array.from(machine.current.output.join('\n')).length + 1, 7 * 4_097);
  assert.deepEqual(machine.current.stack, previous.stack);
});

test('limits distinct variable bindings without consuming the failing value', () => {
  const source = Array.from({ length: 201 }, (_, index) => `v${index} = ${index}`).join('\n');
  const machine = createTeachingMachine(compileTeachingSource(source));
  while (machine.current.status !== 'error') stepTeachingMachine(machine);

  assert.equal(machine.current.diagnostic?.code, 'too-many-names');
  assert.equal(machine.current.variables.length, 200);
  assert.deepEqual(machine.current.stack.map(({ value }) => value), ['200']);
});

test('keeps immutable bounded history and reports when earlier snapshots were dropped', () => {
  const machine = createTeachingMachine(compileTeachingSource('print()\n'.repeat(500)));
  const initial = machine.current;
  for (let index = 0; index < 500; index += 1) stepTeachingMachine(machine);

  const history = getTeachingHistory(machine);
  assert.equal(history.items.length, 500);
  assert.equal(history.truncated, true);
  assert.equal(history.items[0]?.stepIndex, 1);
  assert.equal(initial.stepIndex, 0);
  assert.deepEqual(initial.stack, []);
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Object.isFrozen(initial.stack), true);
});

test('trims history by retained container records while keeping the complete current heap snapshot', () => {
  const listItems = Array.from({ length: 256 }, () => '0').join(', ');
  const updates = Array.from({ length: 200 }, (_, index) => `items[0] = ${index + 1}`).join('\n');
  const machine = createTeachingMachine(compileTeachingSource(`items = [${listItems}]\n${updates}`));
  while (machine.current.status !== 'finished' && machine.current.status !== 'error') stepTeachingMachine(machine);

  assert.equal(machine.current.status, 'finished');
  const history = getTeachingHistory(machine);
  const retainedRecords = history.items.reduce((total, snapshot) => total + snapshot.heap.reduce(
    (snapshotTotal, object) => snapshotTotal + 1 + (object.type === 'list' ? object.items.length : object.entries.length),
    0,
  ), 0);
  assert.equal(history.truncated, true);
  assert.ok(history.items.length < 500);
  assert.ok(retainedRecords <= MAX_HISTORY_CONTAINER_RECORDS);
  assert.equal(history.items.at(-1)?.stepIndex, machine.current.stepIndex);
  assert.equal(machine.current.heap[0]?.type, 'list');
  if (machine.current.heap[0]?.type !== 'list') assert.fail('expected current list snapshot');
  assert.equal(machine.current.heap[0].items.length, 256);
});
