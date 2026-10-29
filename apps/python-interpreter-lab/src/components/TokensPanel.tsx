import { useState } from 'react';
import { rangesOverlap, tokenSourceRange, type SourceLink, type SourcePositionIndex } from '../analysis/source-position';
import type { PythonToken } from '../analysis/types';
import type { MessageKey } from '../locales';

interface TokensPanelProps {
  tokens: PythonToken[];
  tokensTruncated: boolean;
  tokenizationError: { type: string; message: string } | null;
  positionIndex: SourcePositionIndex;
  sourceLink: SourceLink | null;
  t: (key: MessageKey) => string;
  onLink(link: SourceLink): void;
}

export function TokensPanel({ tokens, tokensTruncated, tokenizationError, positionIndex, sourceLink, t, onLink }: TokensPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="panel tokens-panel" aria-labelledby="tokens-heading">
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="tokens-summary">
          <span id="tokens-heading">{t('tokens')}</span>
          <span className="small-meta">{tokens.length} {t('tokensCount')}</span>
        </summary>
        {open && (
          <div className="tokens-content">
            <p className="panel-hint">{t('tokensHint')}</p>
            {tokensTruncated && <p className="limit-notice" role="status">{t('tokensTruncated')}</p>}
            {tokenizationError && (
              <p className="tokenization-error" role="status">
                {t('tokenizationError').replace('{type}', tokenizationError.type)} · {tokenizationError.message}
              </p>
            )}
            {!tokens.length ? (
              <p className="empty-state">{t('noTokens')}</p>
            ) : (
              <div className="token-scroll" role="region" aria-label={t('tokens')} tabIndex={0}>
                <table className="token-table">
                  <thead>
                    <tr><th>{t('tokenType')}</th><th>{t('tokenText')}</th><th>{t('tokenPosition')}</th><th>{t('action')}</th></tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => {
                      const range = tokenSourceRange(token, positionIndex);
                      const isOrigin = sourceLink?.origin.kind === 'token' && sourceLink.origin.id === token.index;
                      const isMatch = Boolean(range && sourceLink?.range && rangesOverlap(range, sourceLink.range));
                      const typeLabel = token.type === 'OP' ? `${token.type} · ${token.exactType}` : token.type;
                      return (
                        <tr key={token.index} className={`${isOrigin ? 'is-source-origin ' : ''}${isMatch ? 'is-source-match' : ''}`}>
                          <td><code>{typeLabel}</code></td>
                          <td><code className="token-text">{JSON.stringify(token.text)}</code>{token.textTruncated && <span className="token-truncated"> {t('tokenTextTruncated')}</span>}</td>
                          <td className="token-location">{token.start.line}:{token.start.column}–{token.end.line}:{token.end.column}</td>
                          <td>
                            <button
                              type="button"
                              className="token-locate"
                              aria-label={t('locateToken').replace('{index}', String(token.index + 1))}
                              onClick={() => onLink({ origin: { kind: 'token', id: token.index }, range })}
                            >
                              {t('locate')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </details>
    </section>
  );
}
