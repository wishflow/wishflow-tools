export type OverlayPanel = HTMLElement;

export interface OverlayHostOptions {
  frame: HTMLElement;
  frameChrome: HTMLElement;
  onActivePanelChange?: (panel: HTMLElement | null) => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled]):not([hidden])',
  'input:not([disabled]):not([hidden])',
  'select:not([disabled]):not([hidden])',
  'textarea:not([disabled]):not([hidden])',
  '[tabindex]:not([tabindex="-1"]):not([hidden])',
].join(',');

/** Renders the panel selected by GameUiController; it owns no navigation or panel stack. */
export class OverlayHost {
  private presentedPanels: readonly OverlayPanel[] = [];
  private returnFocusTarget: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly backdrop: HTMLElement,
    private readonly options: OverlayHostOptions,
  ) {
    this.root.addEventListener('click', this.stopOverlayClickThrough);
    this.options.frame.addEventListener('keydown', this.keepTabWithinGameOverlay);
  }

  get active(): OverlayPanel | null {
    return this.presentedPanels.at(-1) ?? null;
  }

  get activeId(): string | null {
    const panel = this.active;
    if (!panel) return null;
    return panel.dataset.overlayId
      ?? panel.dataset.testid
      ?? panel.id
      ?? null;
  }

  render(panels: readonly OverlayPanel[]): void {
    if (panels.length === this.presentedPanels.length
      && panels.every((panel, index) => panel === this.presentedPanels[index])) return;

    const previousPanels = this.presentedPanels;
    const nextPanels = new Set(panels);
    for (const panel of previousPanels) {
      if (!nextPanels.has(panel)) this.hidePanel(panel);
    }
    if (previousPanels.length === 0 && panels.length > 0) {
      this.returnFocusTarget = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }

    this.presentedPanels = [...panels];
    if (panels.length > 0) {
      panels.forEach((panel, index) => this.showPanel(panel, index, index === panels.length - 1));
      this.root.hidden = false;
      this.backdrop.hidden = false;
      this.root.dataset.activeOverlay = this.activeId ?? '';
      const activePanel = this.active;
      if (activePanel) this.focusPanel(activePanel);
    } else {
      this.root.hidden = true;
      this.backdrop.hidden = true;
      delete this.root.dataset.activeOverlay;
      this.restoreFocusTarget();
    }
    this.options.onActivePanelChange?.(this.active);
  }

  private showPanel(panel: OverlayPanel, depth: number, active: boolean): void {
    if (panel instanceof HTMLDialogElement) {
      if (!panel.open) panel.show();
    } else {
      panel.hidden = false;
    }
    panel.style.zIndex = String(depth + 1);
    panel.inert = !active;
    panel.setAttribute('aria-hidden', String(!active));
    panel.setAttribute('aria-modal', String(active));
    panel.dataset.overlayActive = String(active);
    if (active) delete panel.dataset.overlayParent;
    else panel.dataset.overlayParent = 'true';
  }

  private hidePanel(panel: OverlayPanel): void {
    if (panel instanceof HTMLDialogElement) {
      if (panel.open) panel.close();
    } else {
      panel.hidden = true;
    }
    panel.inert = false;
    panel.removeAttribute('aria-hidden');
    panel.removeAttribute('aria-modal');
    panel.style.removeProperty('z-index');
    delete panel.dataset.overlayActive;
    delete panel.dataset.overlayParent;
  }

  private focusPanel(panel: OverlayPanel): void {
    const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (firstFocusable) {
      firstFocusable.focus({ preventScroll: true });
      return;
    }
    panel.focus({ preventScroll: true });
  }

  private restoreFocusTarget(): void {
    if (this.returnFocusTarget?.isConnected && !this.returnFocusTarget.hasAttribute('disabled')) {
      this.returnFocusTarget.focus({ preventScroll: true });
    }
    this.returnFocusTarget = null;
  }

  private readonly stopOverlayClickThrough = (event: MouseEvent): void => {
    event.stopPropagation();
    if (event.target === this.backdrop && this.active) this.focusPanel(this.active);
  };

  private readonly keepTabWithinGameOverlay = (event: KeyboardEvent): void => {
    const activePanel = this.active;
    if (event.key !== 'Tab' || !activePanel) return;

    const focusable = [
      ...activePanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ...this.options.frameChrome.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ].filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (activeIndex < 0 || activeIndex === focusable.length - 1)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };
}
