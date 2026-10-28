export const MAX_SOURCE_LENGTH = 20_000;

export type SourceValidation =
  | { ok: true }
  | { ok: false; actualLength: number; maxLength: number };

export function validateSource(source: string): SourceValidation {
  if (source.length <= MAX_SOURCE_LENGTH) return { ok: true };

  return {
    ok: false,
    actualLength: source.length,
    maxLength: MAX_SOURCE_LENGTH,
  };
}
