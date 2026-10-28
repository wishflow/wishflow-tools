export function formatInstructionArgument(argrepr: string, arg: number | null): string {
  if (argrepr) return argrepr;
  return arg === null ? '—' : String(arg);
}
