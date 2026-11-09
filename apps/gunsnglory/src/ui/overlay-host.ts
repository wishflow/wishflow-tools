export type OverlayPanel = HTMLElement;

export interface OverlayHostOptions {
  frame: HTMLElement;
  frameChrome: HTMLElement;
  onActivePanelChange?: (panel: HTMLElement | null) => void;
}

interface OpenOptions {
  preserveCurrent?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled]):not([hidden])',
  'input:not([disabled]):not([hidden])',
  'select:not([disabled]):not([hidden])',
  'textarea:not([disabled]):not([hidden])',
  '[tabindex]:not([tabindex="-1"]):not([hidden])',
].join(',');

/** Keeps game overlays inside the game frame and exposes only one panel at a time. */
export class OverlayHost {
  private activePanel: OverlayPanel | null = null;
  private readonly parentPanels: OverlayPanel[] = [];
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
    return this.activePanel;
  }

  get activeId(): string | null {
    if (!this.activePanel) return null;
    return this.activePanel.dataset.overlayId
      ?? this.activePanel.dataset.testid
      ?? this.activePanel.id
      ?? null;
  }

  open(panel: OverlayPanel, { preserveCurrent = false }: OpenOptions = {}): void {
    if (this.activePanel === panel) return;

    if (this.activePanel) {
      const previous = this.activePanel;
      this.hidePanel(previous);
      if (preserveCurrent) this.parentPanels.push(previous);
      else this.parentPanels.length = 0;
    } else {
      this.returnFocusTarget = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      this.parentPanels.length = 0;
    }

    this.activePanel = panel;
    this.showPanel(panel);
    this.root.hidden = false;
    this.backdrop.hidden = false;
    this.root.dataset.activeOverlay = this.activeId ?? '';
    this.options.onActivePanelChange?.(panel);
    this.focusPanel(panel);
  }

  close(panel: OverlayPanel | null = this.activePanel, restoreParent = true): void {
    if (!panel) return;
    if (panel !== this.activePanel) {
      this.hidePanel(panel);
      return;
    }

    this.hidePanel(panel);
    const parent = restoreParent ? this.parentPanels.pop() : undefined;
    if (parent) {
      this.activePanel = parent;
      this.showPanel(parent);
      this.root.dataset.activeOverlay = this.activeId ?? '';
      this.options.onActivePanelChange?.(parent);
      this.focusPanel(parent);
      return;
    }

    this.activePanel = null;
    this.root.hidden = true;
    this.backdrop.hidden = true;
    delete this.root.dataset.activeOverlay;
    this.parentPanels.length = 0;
    this.options.onActivePanelChange?.(null);
    this.restoreFocusTarget();
  }

  closeActive(): void {
    this.close(this.activePanel);
  }

  private showPanel(panel: OverlayPanel): void {
    if (panel instanceof HTMLDialogElement) {
      if (!panel.open) panel.show();
    } else {
      panel.hidden = false;
    }
    panel.dataset.overlayActive = 'true';
  }

  private hidePanel(panel: OverlayPanel): void {
    if (panel instanceof HTMLDialogElement) {
      if (panel.open) panel.close();
    } else {
      panel.hidden = true;
    }
    delete panel.dataset.overlayActive;
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
    if (event.target === this.backdrop && this.activePanel) this.focusPanel(this.activePanel);
  };

  private readonly keepTabWithinGameOverlay = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.activePanel) return;

    const focusable = [
      ...this.activePanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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
