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
    case 'branch':
      return replaceMessage(t(transition.controlFlowOutcome === 'branch-skipped'
        ? 'teachingAnimationBranchSkipped'
        : 'teachingAnimationBranchTaken'), {
        condition: transition.operands[0]?.display ?? '—',
      });
    case 'jump':
      return t(transition.nextInstructionIndex !== null && transition.nextInstructionIndex < transition.instructionIndex
        ? 'teachingAnimationLoopBackJump'
        : 'teachingAnimationForwardJump');
    case 'short-circuit':
      return replaceMessage(t(transition.controlFlowOutcome === 'short-circuited'
        ? 'teachingAnimationShortCircuit'
        : 'teachingAnimationEvaluateRight'), {
        value: transition.operands[0]?.display ?? '—',
      });
    case 'iteration':
      return transition.controlFlowOutcome === 'next-value'
        ? replaceMessage(t('teachingAnimationIterationValue'), { value: transition.value?.display ?? '—' })
        : t('teachingAnimationIterationEnd');
    case 'runtime-error':
      return replaceMessage(t('teachingAnimationRuntimeError'), {
        opcode: transition.opcode,
        code: transition.diagnostic?.code ?? '—',
      });
    case 'budget-exhausted':
      return replaceMessage(t('teachingAnimationBudgetExhausted'), { index: String(transition.instructionIndex) });
    case 'call-enter':
      return replaceMessage(t('teachingAnimationCallEnter'), {
        caller: String(transition.callerFrameId ?? '—'),
        function: transition.functionName ?? '—',
        callee: String(transition.calleeFrameId ?? '—'),
      });
    case 'call-return':
      return replaceMessage(t('teachingAnimationCallReturn'), {
        callee: String(transition.calleeFrameId ?? '—'),
        function: transition.functionName ?? '—',
        caller: String(transition.callerFrameId ?? '—'),
        value: transition.returnValue?.display ?? '—',
      });
    case 'call-rejected':
      return replaceMessage(t('teachingAnimationCallRejected'), {
        function: transition.functionName ?? '—',
        code: transition.diagnostic?.code ?? '—',
      });
  }
}

function teachingAnimationDetails(
  transition: TeachingAnimationTransition,
  t: (key: MessageKey) => string,
) {
  if (transition.kind === 'call-enter') {
    return (
      <dl className="teaching-animation-details">
        <div><dt>{t('teachingAnimationCallSite')}</dt><dd>{transition.callSite ? `L${transition.callSite.line}:${transition.callSite.column}` : '—'}</dd></div>
        <div><dt>{t('teachingAnimationReturnPc')}</dt><dd>{transition.returnPc ?? '—'}</dd></div>
        {transition.callBindings.map(({ argumentIndex, name, value }) => (
          <div key={`${argumentIndex}-${name}`}><dt>{t('teachingAnimationArgument').replace('{index}', String(argumentIndex + 1))} → <code>{name}</code></dt><dd>{value.display}</dd></div>
        ))}
      </dl>
    );
  }
  if (transition.kind === 'call-return') {
    return (
      <dl className="teaching-animation-details">
        <div><dt>{t('teachingAnimationReturnedValue')}</dt><dd>{transition.returnValue?.display ?? '—'}</dd></div>
        <div><dt>{t('teachingAnimationCallSite')}</dt><dd>{transition.callSite ? `L${transition.callSite.line}:${transition.callSite.column}` : '—'}</dd></div>
        <div><dt>{t('teachingAnimationCaller')}</dt><dd>#{transition.callerFrameId ?? '—'} · {t('teachingReturnAddress').replace('{index}', String(transition.returnPc ?? '—'))}</dd></div>
      </dl>
    );
  }
  if (transition.kind === 'call-rejected' && transition.diagnostic) {
    return (
      <dl className="teaching-animation-details is-error">
        <div><dt>{t('teachingAnimationError')}</dt><dd>{transition.diagnostic.message}</dd></div>
        <div><dt>{t('teachingAnimationFrameCreated')}</dt><dd>{t('teachingAnimationNoFrameCreated')}</dd></div>
      </dl>
    );
  }
  if (transition.kind === 'runtime-error' && transition.diagnostic) {
    return (
      <dl className="teaching-animation-details is-error">
        <div><dt>{t('teachingAnimationError')}</dt><dd>{transition.diagnostic.message}</dd></div>
        {transition.operands.length > 0 && (
          <div><dt>{t('teachingAnimationFailedOperands')}</dt><dd>{transition.operands.map(({ display }) => display).join(', ')}</dd></div>
        )}
        <div><dt>{t('teachingAnimationStateChange')}</dt><dd>{t('teachingAnimationRuntimeStatePreserved')}</dd></div>
      </dl>
    );
  }
  if (transition.kind === 'budget-exhausted') {
    const source = transition.nextInstructionSpan;
    return (
      <dl className="teaching-animation-details is-error">
        <div>
          <dt>{t('teachingAnimationNextInstruction')}</dt>
          <dd>#{transition.nextInstructionIndex ?? '—'}{source ? ` · L${source.line}:${source.column}` : ` · ${t('teachingAnimationNoSourceLocation')}`}</dd>
        </div>
        {transition.diagnostic && <div><dt>{t('teachingAnimationError')}</dt><dd>{transition.diagnostic.message}</dd></div>}
        <div><dt>{t('teachingAnimationStateChange')}</dt><dd>{t('teachingAnimationRuntimeStatePreserved')}</dd></div>
      </dl>
    );
  }
  if (transition.kind === 'branch' || transition.kind === 'jump'
    || transition.kind === 'short-circuit' || transition.kind === 'iteration') {
    const focus = transition.kind === 'branch'
      ? { label: t('teachingAnimationCondition'), value: transition.operands[0]?.display }
      : transition.kind === 'short-circuit'
        ? { label: t('teachingAnimationLeftOperand'), value: transition.operands[0]?.display }
        : transition.kind === 'iteration' && transition.controlFlowOutcome === 'next-value'
          ? { label: t('teachingAnimationYieldedValue'), value: transition.value?.display }
          : null;
    const source = transition.nextInstructionSpan;
    return (
      <dl className="teaching-animation-details">
        {focus && <div><dt>{focus.label}</dt><dd>{focus.value ?? '—'}</dd></div>}
        <div>
          <dt>{t('teachingAnimationNextInstruction')}</dt>
          <dd>#{transition.nextInstructionIndex ?? '—'}{source ? ` · L${source.line}:${source.column}` : ` · ${t('teachingAnimationNoSourceLocation')}`}</dd>
        </div>
      </dl>
    );
  }
  return null;
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
      {transition && teachingAnimationDetails(transition, t)}
      {transition && (
        <small><code>{transition.opcode}</code> · #{transition.instructionIndex}</small>
      )}
    </section>
  );
}
