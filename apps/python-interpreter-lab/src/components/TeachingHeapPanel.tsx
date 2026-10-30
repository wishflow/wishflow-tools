import { useCallback, useEffect, useState } from 'react';
import type { TeachingHeapObjectSnapshot, TeachingValueSnapshot, TeachingVmSnapshot } from '../teaching-vm/types';
import type { TeachingAnimationTransition } from '../teaching-vm/animation';
import { sameSnapshotValue } from '../teaching-vm/observation';
import type { MessageKey } from '../locales';

function objectTypeKey(type: 'list' | 'dict'): MessageKey {
  return type === 'list' ? 'teachingListObject' : 'teachingDictObject';
}

function objectReferenceLabel(type: 'list' | 'dict', id: number, t: (key: MessageKey) => string): string {
  return t('teachingLocateObject')
    .replace('{type}', t(objectTypeKey(type)))
    .replace('{id}', String(id));
}

export function TeachingValueDisplay({
  value,
  t,
  onLocateObject,
}: {
  value: TeachingValueSnapshot;
  t: (key: MessageKey) => string;
  onLocateObject(objectId: number): void;
}) {
  if ((value.type === 'list' || value.type === 'dict') && value.objectId !== undefined) {
    const objectId = value.objectId;
    return (
      <button
        type="button"
        className="teaching-object-reference"
        aria-label={objectReferenceLabel(value.type, value.objectId, t)}
        onClick={() => onLocateObject(objectId)}
      >
        {value.display}
      </button>
    );
  }
  return <code>{value.display}</code>;
}

export function useTeachingHeapNavigation(snapshot: TeachingVmSnapshot | null) {
  const [focusedObjectId, setFocusedObjectId] = useState<number | null>(null);
  useEffect(() => setFocusedObjectId(null), [snapshot?.stepIndex]);

  const onLocateObject = useCallback((objectId: number) => {
    setFocusedObjectId(objectId);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`teaching-heap-object-${objectId}`);
      if (!target) return;
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior, block: 'nearest' });
      target.focus({ preventScroll: true });
    });
  }, []);

  return { focusedObjectId, onLocateObject };
}

function TeachingHeapRecord({
  object,
  focusedObjectId,
  t,
  onLocateObject,
  animationTransition,
  animationStage,
}: {
  object: TeachingHeapObjectSnapshot;
  focusedObjectId: number | null;
  t: (key: MessageKey) => string;
  onLocateObject(objectId: number): void;
  animationTransition: TeachingAnimationTransition | null;
  animationStage: 'before' | 'after';
}) {
  const typeKey = objectTypeKey(object.type);
  const isEmpty = object.type === 'list' ? object.items.length === 0 : object.entries.length === 0;
  const isAnimationObject = animationTransition?.objectId === object.id;
  const animationClass = isAnimationObject ? `is-animation-${animationStage}` : '';
  return (
    <li
      id={`teaching-heap-object-${object.id}`}
      className={`teaching-heap-object${focusedObjectId === object.id ? ' is-object-target' : ''}${animationClass ? ` ${animationClass}` : ''}`}
      tabIndex={-1}
    >
      <h5>
        {t(typeKey)} <code>#{object.id}</code>
      </h5>
      {isEmpty ? <p className="empty-state">{t('teachingHeapEmptyContainer')}</p> : (
        <dl className="teaching-heap-entries">
          {object.type === 'list'
            ? object.items.map((value, index) => (
              <div className={isAnimationObject && animationTransition?.kind === 'mutate-object' && animationTransition.itemIndex === index ? `is-animation-entry is-animation-${animationStage}` : undefined} key={index}>
                <dt><code>[{index}]</code></dt>
                <dd><TeachingValueDisplay value={value} t={t} onLocateObject={onLocateObject} /></dd>
              </div>
            ))
            : object.entries.map(({ key, value }, index) => (
              <div className={isAnimationObject && animationTransition?.kind === 'mutate-object' && animationTransition.itemKey && sameSnapshotValue(animationTransition.itemKey, key) ? `is-animation-entry is-animation-${animationStage}` : undefined} key={`${key.type}-${key.value}-${index}`}>
                <dt><code>{key.display}</code></dt>
                <dd><TeachingValueDisplay value={value} t={t} onLocateObject={onLocateObject} /></dd>
              </div>
            ))}
        </dl>
      )}
    </li>
  );
}

export function TeachingHeapPanel({
  snapshot,
  t,
  focusedObjectId,
  onLocateObject,
  animationTransition,
  animationStage,
}: {
  snapshot: TeachingVmSnapshot | null;
  t: (key: MessageKey) => string;
  focusedObjectId: number | null;
  onLocateObject(objectId: number): void;
  animationTransition: TeachingAnimationTransition | null;
  animationStage: 'before' | 'after';
}) {
  return (
    <section className="teaching-heap-panel" aria-labelledby="teaching-heap-heading">
      <h4 id="teaching-heap-heading">{t('teachingHeap')}</h4>
      {!snapshot || snapshot.heap.length === 0 ? <p className="empty-state">{t('teachingHeapNoObjects')}</p> : (
        <div className="teaching-heap-scroll" role="region" aria-label={t('teachingHeap')} tabIndex={0}>
          <ol className="teaching-heap-list">
            {snapshot.heap.map((object) => (
              <TeachingHeapRecord
                key={object.id}
                object={object}
                focusedObjectId={focusedObjectId}
                t={t}
                onLocateObject={onLocateObject}
                animationTransition={animationTransition}
                animationStage={animationStage}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
