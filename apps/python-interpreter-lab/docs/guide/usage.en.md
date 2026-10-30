# User guide

[中文](usage.zh-CN.md) · [Back to the app overview](../../README.md)

This guide covers the current `mini-vm-v5` teaching instruction set. Use the language selector at the top of the page to switch languages.

## Quick start

1. The page opens in **Teaching VM** by default. Paste the arithmetic example below into **Python source**, then click **Compile teaching program**. Compiling does not run the code.
2. Click **Step one instruction** and inspect the execution point, active frame, operand stack, name bindings, and object heap.
3. Click **Run teaching program** to finish. **Teaching output** should show `7`.

```python
x = 1 + 2 * 3
print(x)
```

Watch multiplication produce `6`, then addition produce `7`, before the name `x` is bound to the result.
One source line can produce several teaching instructions. Neither teaching instructions nor CPython bytecode are CPU machine code.

## Read the runtime state

| Area | What it shows |
| --- | --- |
| Current execution point | Shows the actual next, most recently executed, or failed instruction and its source location; it does not invent instructions from source |
| Active frame | The module or function frame currently executing; its operand stack and variables belong to this frame and remain separate |
| Operand stack | Temporary operands and results in the active frame; the slot marked `TOP` is the next one to pop |
| Name bindings | Names bound to values. Lists and dictionaries show object IDs; two names with the same ID share one object |
| Call frames | Module and function calls that have not returned. Expand an inactive frame to inspect its variables and operand stack without changing the active frame or advancing execution |
| Object heap | Reachable lists and dictionaries at the selected step, with their contents. Click an object ID in the variables to locate it |
| AST / teaching instructions | Collapsed by default to keep the runtime scene in focus; expand to inspect the full AST, instructions, and breakpoints |

These are teaching VM states. Object IDs are not memory addresses, and this view does not show CPython's complete memory layout.
An object disappearing from the current heap view does not demonstrate that real memory was freed.

## Try aliases and a function

Replace the source and compile again. This example shows shared objects and lets you practise stepping through a function.

```python
def change(items):
    items[0] = 9
    return items[0]

a = [1]
b = a
result = change(b)
print(a)
print(result)
b = [2]
print(a)
print(b)
```

The complete output is `[9]`, `9`, `[9]`, and `[2]`, on separate lines.

- After `b = a`, both names refer to the same object; the list was not copied.
- Inside `change`, the parameter `items` refers to that object too. Changing its element changes what `a` sees.
- On return, the function frame exits, and the returned value `9` is then bound to `result`.
- After `b = [2]`, `b` refers to a new object while `a` still refers to the original one.

## Control execution

| Control | Use it to |
| --- | --- |
| Step one instruction | Execute one teaching instruction and inspect value-stack changes |
| Step Into | Advance through source positions, entering called functions and returning to the caller when a function exits |
| Step Over | Advance through the current line and its calls to the next source-stepping position; a loop can stop on the same line again |
| Step Out | Run until the current function returns; unavailable in the module frame |
| Run / Continue teaching program | Run forward from the real execution head |
| Pause teaching program | Pause at a complete instruction boundary |
| Automatic run speed | Choose Slow, Standard, or Fast for Run / Continue; stepping rules stay the same |

Expand **Teaching instructions**, then use its **Line** or **Instruction** buttons to set breakpoints. Execution pauses before the corresponding instruction.
Source stepping can also stop early at a breakpoint, an error, or a resource limit.
Try a line breakpoint at `result = change(b)`, then use **Step Into** to inspect the parameter binding.
Click an instruction's source position to locate the original text. **Next instruction** has not executed yet.

## History, reset, and source edits

- **Instruction history** changes only what you observe; it does not execute code again or restore an earlier runtime state.
- **Return to head** shows the latest state. Stepping is disabled while viewing history; Run / Continue first returns to the execution head.
- After execution completes or fails, use **Reset teaching VM** before running again. Reset clears runtime state and history, retaining the compiled program and breakpoints.
- Editing source or compiling again clears teaching breakpoints. Editing source or switching execution views clears old results; compile or analyze again.

## Check with real CPython

Select **Real CPython** under **Execution view** and wait for the runtime to become ready. The initial load needs a network connection.

1. Click **Analyze source** to inspect tokens, the AST, code objects, and real bytecode. This does not execute the program.
2. Click **Run Python** to execute the source and record output, calls, line events, returns, exceptions, and variable snapshots.
3. Once execution stops, use **Play playback**, the event position, and **Adjacent changes** to inspect the record. Playback does not run the program again.

Variables in a **Line · before execution** event show the state before that line runs. An exception event may later be caught; also check the final result.
This view does not expose CPython's internal value stack or live instruction stepping. Its instructions do not map one-to-one to teaching instructions.

## Understand notices

- **Unsupported syntax or value types:** the teaching VM supports a limited subset, excluding list methods, slicing, imports, and default parameters. Simplify the example or check it with real CPython.
- **Truncated history, trace, or output:** only retained data is shown. Teaching history holds at most 500 snapshots and also has a container-record budget. Shorten the program and rerun it to inspect a complete sequence more easily.
- **Instruction or resource budget exhausted:** a teaching run allows at most 5,000 executed instructions. Reduce loop counts or recursion depth, then reset or edit and compile again.
- **Real execution stopped or timed out:** only received records remain. Click **Retry runtime**, then run again from the beginning.
- **Teaching VM unavailable:** if **Retry teaching VM** appears, click it and compile again.

See the [app overview](../../README.md) for more supported features and limits.
