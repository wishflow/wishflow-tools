(() => {
  const script = document.currentScript;
  if (!script || !document.body) return;

  const petHref = script.dataset.petHref;
  const spritePath = script.dataset.sprite;
  if (!petHref || !spritePath) return;

  const isPetPage = script.dataset.petPage === 'true';
  const storageKey = 'wishflow-tools-usagi-position-v1';
  const words = {
    en: {
      region: 'Usagi animated pet',
      petGuide: 'Open the Usagi pet guide. Drag to move; use the arrow keys to move and Escape to reset.',
      petAction: 'Play Usagi’s animation. Drag to move; use the arrow keys to move and Escape to reset.',
      controls: 'Usagi pet controls',
      guide: 'Open Usagi pet guide',
      animate: 'Play an animation',
      hide: 'Hide Usagi',
      restore: 'Show Usagi',
      moved: 'Usagi moved.',
      reset: 'Usagi returned to the default position.',
      animated: 'Playing a local Usagi animation preview.',
      hidden: 'Usagi is hidden. Use the show button to bring it back.',
    },
    zh: {
      region: 'Usagi 网页宠物',
      petGuide: '打开 Usagi 宠物详情页。拖动可移动；方向键可移动，Esc 恢复默认位置。',
      petAction: '播放 Usagi 动画。拖动可移动；方向键可移动，Esc 恢复默认位置。',
      controls: 'Usagi 宠物控制栏',
      guide: '打开 Usagi 宠物详情页',
      animate: '播放 Usagi 动画',
      hide: '隐藏 Usagi',
      restore: '显示 Usagi',
      moved: 'Usagi 已移动。',
      reset: 'Usagi 已回到默认位置。',
      animated: '正在播放本地 Usagi 动画预览。',
      hidden: 'Usagi 已隐藏。使用显示按钮可重新打开。',
    },
  };

  const widget = document.createElement('aside');
  widget.className = 'usagi-widget';
  widget.setAttribute('data-usagi-widget', '');
  widget.style.visibility = 'hidden';
  widget.innerHTML = `
    <a class="usagi-widget__pet" data-usagi-pet>
      <span class="usagi-widget__sprite" aria-hidden="true"></span>
    </a>
    <div class="usagi-widget__controls" data-usagi-controls role="group">
      <a class="usagi-widget__control" data-usagi-guide>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
      </a>
      <button class="usagi-widget__control" data-usagi-animate type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4"/></svg>
      </button>
      <button class="usagi-widget__control" data-usagi-hide type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>
      </button>
    </div>
    <button class="usagi-widget__restore" data-usagi-restore type="button" hidden>
      <span class="usagi-widget__sprite" aria-hidden="true"></span>
    </button>
    <span class="usagi-widget__sr-only" data-usagi-status role="status" aria-live="polite"></span>`;

  const petLink = widget.querySelector('[data-usagi-pet]');
  const guideLink = widget.querySelector('[data-usagi-guide]');
  const controls = widget.querySelector('[data-usagi-controls]');
  const animateButton = widget.querySelector('[data-usagi-animate]');
  const hideButton = widget.querySelector('[data-usagi-hide]');
  const restoreButton = widget.querySelector('[data-usagi-restore]');
  const status = widget.querySelector('[data-usagi-status]');
  const spriteUrl = new URL(spritePath, document.baseURI);
  widget.querySelectorAll('.usagi-widget__sprite').forEach((sprite) => {
    sprite.style.backgroundImage = `url(${JSON.stringify(spriteUrl.href)})`;
  });

  const detailHref = isPetPage ? '#preview' : petHref;
  petLink.href = detailHref;
  guideLink.href = detailHref;
  document.body.append(widget);

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function updateLabels() {
    const text = words[language()];
    widget.setAttribute('aria-label', text.region);
    controls.setAttribute('aria-label', text.controls);
    petLink.setAttribute('aria-label', isPetPage ? text.petAction : text.petGuide);
    guideLink.setAttribute('aria-label', text.guide);
    animateButton.setAttribute('aria-label', text.animate);
    hideButton.setAttribute('aria-label', text.hide);
    restoreButton.setAttribute('aria-label', text.restore);
    [guideLink, animateButton, hideButton, restoreButton].forEach((control, index) => {
      control.title = [text.guide, text.animate, text.hide, text.restore][index];
    });
  }

  const savedPosition = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : null;
    } catch {
      return null;
    }
  })();

  let position = { x: 0, y: 0 };
  let drag = null;
  let suppressClick = false;
  let actionTimer = 0;

  function clamped(next) {
    const rect = widget.getBoundingClientRect();
    const margin = 12;
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    return {
      x: Math.min(maxX, Math.max(margin, next.x)),
      y: Math.min(maxY, Math.max(margin, next.y)),
    };
  }

  function setPosition(next, persist = false) {
    position = clamped(next);
    widget.style.left = `${position.x}px`;
    widget.style.top = `${position.y}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    if (persist) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
      } catch {
        // Movement still works when browser storage is unavailable.
      }
    }
  }

  function defaultPosition() {
    const rect = widget.getBoundingClientRect();
    return {
      x: window.innerWidth - rect.width - 20,
      y: window.innerHeight - rect.height - 24,
    };
  }

  function announce(message) {
    status.textContent = words[language()][message];
  }

  function playAnimation() {
    window.clearTimeout(actionTimer);
    widget.dataset.action = 'running';
    announce('animated');
    actionTimer = window.setTimeout(() => {
      delete widget.dataset.action;
    }, 1750);
  }

  function hideWidget() {
    widget.dataset.collapsed = 'true';
    restoreButton.hidden = false;
    announce('hidden');
    restoreButton.focus();
  }

  function showWidget() {
    delete widget.dataset.collapsed;
    restoreButton.hidden = true;
    requestAnimationFrame(() => {
      setPosition(position);
      petLink.focus();
    });
  }

  petLink.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      announce('moved');
      return;
    }
    if (isPetPage) {
      event.preventDefault();
      playAnimation();
    }
  });

  animateButton.addEventListener('click', playAnimation);
  hideButton.addEventListener('click', hideWidget);
  restoreButton.addEventListener('click', showWidget);
  petLink.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    hideWidget();
  });

  petLink.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
    try {
      petLink.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; normal click and touch behavior still work.
    }
  });

  petLink.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) >= 6) {
      drag.moved = true;
      widget.dataset.dragging = 'true';
    }
    if (drag.moved) {
      event.preventDefault();
      setPosition({ x: drag.originX + deltaX, y: drag.originY + deltaY });
    }
  });

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      suppressClick = event.type === 'pointerup';
      setPosition(position, true);
      if (suppressClick) window.setTimeout(() => { suppressClick = false; }, 0);
    }
    drag = null;
    delete widget.dataset.dragging;
  }

  petLink.addEventListener('pointerup', finishDrag);
  petLink.addEventListener('pointercancel', finishDrag);
  petLink.addEventListener('lostpointercapture', finishDrag);

  petLink.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 48 : 24;
    const moves = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    if (moves[event.key]) {
      event.preventDefault();
      setPosition({ x: position.x + moves[event.key][0], y: position.y + moves[event.key][1] }, true);
      announce('moved');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setPosition(defaultPosition(), true);
      announce('reset');
    }
  });

  restoreButton.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      showWidget();
    }
  });

  window.addEventListener('resize', () => setPosition(position, true));
  new MutationObserver(updateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  updateLabels();

  requestAnimationFrame(() => {
    setPosition(savedPosition || defaultPosition());
    widget.style.visibility = '';
  });
})();
