import type { CodeObject } from '../analysis/types';
import { formatInstructionArgument } from '../analysis/instruction-argument';
import type { MessageKey } from '../locales';

interface BytecodePanelProps {
  codeObjects: CodeObject[];
  selectedCodeId: string;
  instructionsTruncated: boolean;
  t: (key: MessageKey) => string;
  onSelect(codeId: string): void;
}

export function BytecodePanel({ codeObjects, selectedCodeId, instructionsTruncated, t, onSelect }: BytecodePanelProps) {
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
              <tr><th>{t('offset')}</th><th>{t('opcode')}</th><th>{t('argument')}</th><th>{t('line')}</th></tr>
            </thead>
            <tbody>
              {selected.instructions.map((instruction, index) => (
                <tr key={`${instruction.offset}-${index}`}>
                  <td className="number-cell">{instruction.offset}</td>
                  <td><code>{instruction.opname}</code></td>
                  <td className="argument-cell">{formatInstructionArgument(instruction.argrepr, instruction.arg)}</td>
                  <td className="number-cell">{instruction.startsLine ?? instruction.positions?.lineno ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {instructionsTruncated && !selected.instructionsTruncated && <p className="limit-notice" role="status">{t('partialInstructions')}</p>}
    </div>
  );
}
