/** Stable SHA-256 digest for JSON-compatible domain values. */
export async function canonicalSha256Digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJsonValue(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return 'sha256:' + hex;
}

export function canonicalJsonValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('Value contains a non-JSON value');
    return serialized;
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJsonValue).join(',') + ']';
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return '{' + entries.map(([key, child]) => JSON.stringify(key) + ':' + canonicalJsonValue(child)).join(',') + '}';
}
