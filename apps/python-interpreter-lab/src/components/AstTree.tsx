import { useState } from 'react';
import { astNodeSourceRange, rangesOverlap, type SourceLink, type SourcePositionIndex } from '../analysis/source-position';
import type { AstField, AstNode } from '../analysis/types';
import type { MessageKey } from '../locales';

interface AstTreeProps {
  root: AstNode;
  lineLabel: string;
  columnLabel: string;
  constantLabel: string;
  positionIndex: SourcePositionIndex;
  sourceLink: SourceLink | null;
  onLink(link: SourceLink): void;
  t: (key: MessageKey) => string;
}

function isAstNode(value: AstField): value is AstNode {
  return typeof value === 'object' && value !== null && 'fields' in value && 'type' in value;
}

function FieldValue({ value, depth, props }: { value: AstField; depth: number; props: AstTreeProps }) {
  if (isAstNode(value)) {
    return <AstNodeView node={value} depth={depth} props={props} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="ast-empty">[]</span>;
    return (
      <ol className="ast-list">
        {value.map((item, index) => <li key={index}><FieldValue value={item} depth={depth} props={props} /></li>)}
      </ol>
    );
  }
  if (typeof value === 'object' && value !== null) {
    if (value.kind === 'literal') {
      const rendered = value.value;
      return <code className="ast-literal">{props.constantLabel} · {value.type}: {rendered}{value.truncated ? '…' : ''}</code>;
    }
    if (value.kind === 'code-object') return <code>{value.id}</code>;
    return <span className="ast-truncated">…</span>;
  }
  if (typeof value === 'string') return <code>{JSON.stringify(value)}</code>;
  return <code>{String(value)}</code>;
}

function AstNodeView({ node, depth, props }: { node: AstNode; depth: number; props: AstTreeProps }) {
  const line = node.location?.lineno;
  const column = node.location?.col_offset;
  const range = astNodeSourceRange(node, props.positionIndex);
  const isOrigin = props.sourceLink?.origin.kind === 'ast' && props.sourceLink.origin.id === node.id;
  const isMatch = Boolean(range && props.sourceLink?.range && rangesOverlap(range, props.sourceLink.range));
  const [expanded, setExpanded] = useState(depth === 0);
  return (
    <details className={`ast-node${isOrigin ? ' is-source-origin' : ''}${isMatch ? ' is-source-match' : ''}`} open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary onClick={() => props.onLink({ origin: { kind: 'ast', id: node.id }, range })}>
        <span className="ast-type">{node.type}</span>
        {line !== null && line !== undefined && <span className="ast-location">{props.lineLabel} {line}{column !== null && column !== undefined ? ` · ${props.columnLabel} ${column}` : ''}</span>}
      </summary>
      {expanded && (
        <dl className="ast-fields">
          {Object.entries(node.fields).map(([name, value]) => (
            <div className="ast-field" key={name}>
              <dt>{name}</dt>
              <dd><FieldValue value={value} depth={depth + 1} props={props} /></dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}

export function AstTree(props: AstTreeProps) {
  return <div className="ast-tree"><AstNodeView node={props.root} depth={0} props={props} /></div>;
}
