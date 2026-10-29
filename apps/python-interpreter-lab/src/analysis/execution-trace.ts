export function sliceByCodePointOffset(value: string, requestedOffset: number): string {
  if (!Number.isFinite(requestedOffset) || requestedOffset <= 0) return '';
  const codePointLimit = Math.floor(requestedOffset);
  let codePointCount = 0;
  let utf16Offset = 0;
  for (const character of value) {
    if (codePointCount >= codePointLimit) break;
    utf16Offset += character.length;
    codePointCount += 1;
  }
  return value.slice(0, utf16Offset);
}
