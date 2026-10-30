import type { MessageKey } from '../locales';
import type { TeachingAnimationTransition } from '../teaching-vm/animation';
import type { TeachingPlaybackPresentation } from '../teaching-vm/useTeachingPlayback';

function replaceMessage(message: string, values: Readonly<Record<string, string>>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), message);
}

function teachingAnimationMessage(
  transition: TeachingAnimationTransition | null,
  baselineAvailable: boolean,
  omittedCount: number,
  t: (key: MessageKey) => string,
): string {
  if (!baselineAvailable) return t('teachingAnimationUnavailable');
  if (omittedCount > 0) return replaceMessage(t('teachingAnimationOmitted'), { count: String(omittedCount) });
  if (!transition) return t('teachingAnimationNoAction');

  switch (transition.kind) {
    case 'push':
      return transition.sourceName
        ? replaceMessage(t('teachingAnimationPushName'), { name: transition.sourceName, value: transition.value?.display ?? '—' })
        : replaceMessage(t('teachingAnimationPushConstant'), { value: transition.value?.display ?? '—' });
    case 'operate':
      return replaceMessage(t('teachingAnimationOperate'), {
        operands: transition.operands.map(({ display }) => display).join(', '),
        opcode: transition.opcode,
        value: transition.value?.display ?? '—',
      });
    case 'bind-name':
      return replaceMessage(t('teachingAnimationBind'), {
        name: transition.bindingName ?? '—',
        value: transition.value?.display ?? '—',
      });
    case 'object-created':
      return replaceMessage(t('teachingAnimationObjectCreated'), {
        type: transition.objectType === 'list' ? t('teachingListObject') : t('teachingDictObject'),
        id: String(transition.objectId ?? '—'),
      });
    case 'mutate-object':
      return transition.objectType === 'list'
        ? replaceMessage(t('teachingAnimationMutateList'), {
          id: String(transition.objectId ?? '—'),
          index: String(transition.itemIndex ?? '—'),
          value: transition.value?.display ?? '—',
        })
        : replaceMessage(t('teachingAnimationMutateDict'), {
          id: String(transition.objectId ?? '—'),
          key: transition.itemKey?.display ?? '—',
          value: transition.value?.display ?? '—',
        });
  }
}

export function TeachingAnimationPanel({
  presentation,
  t,
}: {
  presentation: TeachingPlaybackPresentation;
  t: (key: MessageKey) => string;
}) {
  const transition = presentation.transition;

  return (
    <section className={`teaching-animation-panel${transition ? ` is-${presentation.stage}` : ''}`} aria-labelledby="teaching-animation-heading" role="status" aria-live="polite">
      <div className="teaching-animation-heading">
        <h4 id="teaching-animation-heading">{t('teachingAnimationHeading')}</h4>
        <span>{t(presentation.stage === 'before' ? 'teachingAnimationBefore' : 'teachingAnimationAfter')}</span>
      </div>
      <p>{teachingAnimationMessage(transition, presentation.baselineAvailable, presentation.omittedCount, t)}</p>
      {transition && (
        <small><code>{transition.opcode}</code> · #{transition.instructionIndex}</small>
      )}
    </section>
  );
}
