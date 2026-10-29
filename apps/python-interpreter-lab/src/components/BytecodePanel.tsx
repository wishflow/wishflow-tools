import type { CodeObject } from '../analysis/types';
import { instructionSourceRange, rangesOverlap, type SourceLink, type SourcePositionIndex } from '../analysis/source-position';
import { formatInstructionArgument } from '../analysis/instruction-argument';
import type { MessageKey } from '../locales';

interface BytecodePanelProps {
  codeObjects: CodeObject[];
  selectedCodeId: string;
  instructionsTruncated: boolean;
  positionIndex: SourcePositionIndex;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onSelect(codeId: string): void;
  onLink(link: SourceLink): void;
}

export function BytecodePanel({ codeObjects, selectedCodeId, instructionsTruncated, positionIndex, sourceLink, t, onSelect, onLink }: BytecodePanelProps) {
  const selected = codeObjects.find((code) => code.id === selectedCodeId) ?? codeObjects[0];
  if (!selected) return <p className="empty-state">{t('noInstructions')}</p>;

  return (
    <div className="bytecode-panel">
      <label className="select-label" htmlFor="code-object">{t('selectCode')}</label>
      <select id="code-object" value={selected.id} onChange={(event) => onSelect(event.target.value)}>
        {codeObjects.map((code, index) => (
          <option key={code.id} value={code.id}>
            {index === 0 ? t('moduleName') : code.qualname} · {t('line')} {code.firstLine}
          </option>
        ))}
      </select>
      <details className="code-metadata">
        <summary>{t('metadata')}</summary>
        <dl>
          <div><dt>{t('variables')}</dt><dd>{selected.varnames.join(', ') || t('emptyList')}</dd></div>
          <div><dt>{t('names')}</dt><dd>{selected.names.join(', ') || t('emptyList')}</dd></div>
          <div><dt>{t('constants')}</dt><dd>{selected.constants.map((value) => value.value).join(', ') || t('emptyList')}</dd></div>
        </dl>
      </details>
      {selected.instructionsTruncated && <p className="limit-notice" role="status">{t('instructionsTruncated')}</p>}
      {!selected.instructions.length ? (
        <p className="empty-state">{t('noInstructions')}</p>
      ) : (
        <div className="instruction-scroll" role="region" aria-label={`${selected.qualname} ${t('bytecode')}`} tabIndex={0}>
          <table className="instruction-table">
            <thead>
              <tr><th>{t('offset')}</th><th>{t('opcode')}</th><th>{t('argument')}</th><th>{t('line')}</th><th>{t('sourcePosition')}</th></tr>
            </thead>
            <tbody>
              {selected.instructions.map((instruction, index) => {
                const range = instructionSourceRange(instruction, positionIndex);
                const isOrigin = sourceLink?.origin.kind === 'instruction'
                  && sourceLink.origin.codeObjectId === selected.id
                  && sourceLink.origin.offset === instruction.offset;
                const isMatch = Boolean(range && sourceLink?.range && rangesOverlap(range, sourceLink.range));
                const position = instruction.positions;
                const positionLabel = range && position?.lineno !== null && position?.lineno !== undefined
                  && position.end_lineno !== null && position.end_lineno !== undefined
                  && position.col_offset !== null && position.col_offset !== undefined
                  && position.end_col_offset !== null && position.end_col_offset !== undefined
                  ? `${position.lineno}:${position.col_offset}–${position.end_lineno}:${position.end_col_offset}`
                  : '—';
                return (
                  <tr key={`${instruction.offset}-${index}`} className={`${isOrigin ? 'is-source-origin ' : ''}${isMatch ? 'is-source-match' : ''}`}>
                    <td className="number-cell">{instruction.offset}</td>
                    <td>
                      <button
                        type="button"
                        className="bytecode-locator"
                        aria-label={t('locateInstruction').replace('{offset}', String(instruction.offset))}
                        onClick={() => onLink({ origin: { kind: 'instruction', codeObjectId: selected.id, offset: instruction.offset }, range })}
                      >
                        <code>{instruction.opname}</code>
                      </button>
                    </td>
                    <td className="argument-cell">{formatInstructionArgument(instruction.argrepr, instruction.arg)}</td>
                    <td className="number-cell">{instruction.startsLine ?? instruction.positions?.lineno ?? '—'}</td>
                    <td className="bytecode-position">{positionLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {instructionsTruncated && !selected.instructionsTruncated && <p className="limit-notice" role="status">{t('partialInstructions')}</p>}
    </div>
  );
}
