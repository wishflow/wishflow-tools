export type FullscreenStatusKey =
  | 'fullscreenUnsupported'
  | 'fullscreenRequestFailed'
  | 'fullscreenExitFailed'
  | 'fullscreenLandscapeLocked'
  | 'fullscreenLandscapeUnavailable';

export interface FrameChromeMessages {
  enter: string;
  exit: string;
  rotate: string;
  status: Readonly<Record<FullscreenStatusKey, string>>;
}

export interface FrameChromeOptions {
  frame: HTMLElement;
  stage: HTMLElement;
  toggleButton: HTMLButtonElement;
  status: HTMLElement;
  orientationOverlay: HTMLElement;
  orientationMessage: HTMLElement;
  getMessages: () => FrameChromeMessages;
  onStateChange?: () => void;
  onViewportChange?: () => void;
}

/** Owns browser fullscreen and frame-level controls, independent of game UI and simulation state. */
export class FrameChromeController {
  private statusKey: FullscreenStatusKey | undefined;

  constructor(private readonly options: FrameChromeOptions) {
    options.toggleButton.addEventListener('click', this.toggleFromControl);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    window.addEventListener('orientationchange', this.handleViewportChange);
    window.addEventListener('resize', this.handleWindowResize);
    screen.orientation?.addEventListener('change', this.handleViewportChange);
    this.render();
  }

  get isFullscreen(): boolean {
    return document.fullscreenElement === this.options.frame;
  }

  render(): void {
    const active = this.isFullscreen;
    const needsLandscape = active && this.supportsTouchOrientationLock() && window.innerHeight > window.innerWidth;
    this.options.frame.classList.toggle('is-fullscreen', active);
    this.options.frame.classList.toggle('is-portrait-fullscreen', needsLandscape);
    this.options.stage.inert = needsLandscape;
    this.options.orientationOverlay.setAttribute('aria-hidden', String(!needsLandscape));
    this.options.orientationMessage.textContent = needsLandscape ? this.options.getMessages().rotate : '';
    document.body.classList.toggle('gng-game-fullscreen', active);
    const label = active ? this.options.getMessages().exit : this.options.getMessages().enter;
    this.options.toggleButton.textContent = '⛶';
    this.options.toggleButton.setAttribute('aria-label', label);
    this.options.toggleButton.title = label;
    this.options.toggleButton.setAttribute('aria-pressed', String(active));
    this.renderStatus();
    this.options.onStateChange?.();
  }

  renderStatus(): void {
    const message = this.statusKey ? this.options.getMessages().status[this.statusKey] : undefined;
    this.options.status.textContent = message ?? '';
    this.options.status.hidden = message === undefined;
  }

  private setStatus(key?: FullscreenStatusKey): void {
    this.statusKey = key;
    this.renderStatus();
  }

  private supportsTouchOrientationLock(): boolean {
    return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  }

  private async toggle(): Promise<void> {
    if (this.isFullscreen) {
      if (typeof document.exitFullscreen !== 'function') {
        this.setStatus('fullscreenExitFailed');
        return;
      }
      try {
        await document.exitFullscreen();
      } catch {
        this.setStatus('fullscreenExitFailed');
      }
      return;
    }

    if (typeof this.options.frame.requestFullscreen !== 'function') {
      this.setStatus('fullscreenUnsupported');
      return;
    }

    try {
      await this.options.frame.requestFullscreen();
    } catch {
      this.setStatus('fullscreenRequestFailed');
      return;
    }

    this.render();
    if (!this.supportsTouchOrientationLock()) {
      this.setStatus();
      return;
    }

    try {
      const orientation = screen.orientation;
      if (!orientation || typeof orientation.lock !== 'function') {
        this.setStatus('fullscreenLandscapeUnavailable');
        return;
      }
      await orientation.lock('landscape');
      this.setStatus('fullscreenLandscapeLocked');
    } catch {
      this.setStatus('fullscreenLandscapeUnavailable');
    }
  }

  private readonly toggleFromControl = (): void => {
    void this.toggle();
  };

  private readonly handleFullscreenChange = (): void => {
    const active = this.isFullscreen;
    this.render();
    if (!active) {
      this.setStatus();
      try {
        screen.orientation?.unlock();
      } catch {
        // The browser may reject unlock after a user-controlled fullscreen exit.
      }
    }
    this.options.onViewportChange?.();
  };

  private readonly handleViewportChange = (): void => {
    this.render();
    this.options.onViewportChange?.();
  };

  private readonly handleWindowResize = (): void => {
    this.render();
    this.options.onViewportChange?.();
  };
}
