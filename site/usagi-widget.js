(() => {
  const script = document.currentScript;
  if (!script || !document.body) return;

  const petHref = script.dataset.petHref;
  const spritePath = script.dataset.sprite;
  if (!petHref || !spritePath) return;

  const isPetPage = script.dataset.petPage === 'true';
  const positionKey = 'wishflow-tools-usagi-position-v1';
  const modeKey = 'wishflow-tools-usagi-mode-v1';
  const words = {
    en: {
      region: 'Usagi animated pet',
      petGuide: 'Open the Usagi pet guide. Hover to play its original staff gesture; drag or use the arrow keys to move.',
      petAction: 'Choose a pet. Hover to play its original staff gesture; drag or use the arrow keys to move.',
      mini: 'Mini · controls only',
      controls: 'Quick chat, voice, and activity controls',
      chat: 'Quick chat',
      voice: 'Voice chat',
      activity: 'Follow activity',
      collapse: 'Collapse threads',
      close: 'Close',
      hide: 'Hide pet',
      restore: 'Show pet',
      moved: 'Usagi moved.',
      reset: 'Usagi returned to the default position.',
      hidden: 'Usagi is hidden. Use the show button to bring it back.',
      choosePet: 'Choose a pet',
      chooseUsagi: 'Usagi',
      chooseMini: 'Mini · controls only',
      panelChat: 'Quick Chat',
      panelVoice: 'Voice',
      panelActivity: 'Threads',
      demoOnly: 'Website preview · sample activity only. This does not connect to ChatGPT or Codex.',
      chatPlaceholder: 'Message ChatGPT',
      chatHint: 'Enter to send · Shift+Enter for a new line',
      miniGuide: 'Mini · open pet guide',
      send: 'Send',
      chatEmpty: 'Enter a sample request to preview Quick Chat.',
      chatRunning: 'The sample chat is running.',
      chatWaiting: 'The sample chat needs your input.',
      chatReady: 'The sample chat is ready.',
      continue: 'Continue demo',
      voiceNote: 'Voice chat is available from the floating controls in the ChatGPT desktop app. This website preview cannot start a real voice session.',
      activityNote: 'Select a sample thread to preview its conversation. Thread order follows the desktop pet status priority.',
      activityEmpty: 'No sample threads yet. Start a request with Quick Chat.',
      stateIdle: 'Idle',
      stateRunning: 'Running',
      stateNeedsInput: 'Needs input',
      stateReady: 'Ready',
      stateBlocked: 'Blocked',
      sampleThread: 'Sample request',
      stateChanged: 'Pet status: ',
    },
    zh: {
      region: 'Usagi 网页宠物',
      petGuide: '打开 Usagi 宠物详情页。悬停播放图集中的原始挥棒动作；拖动或按方向键移动。',
      petAction: '选择宠物。悬停播放图集中的原始挥棒动作；拖动或按方向键移动。',
      mini: 'Mini · 仅显示控件',
      controls: '快速聊天、语音和活动控件',
      chat: '快速聊天',
      voice: '语音聊天',
      activity: '查看活动',
      collapse: '收起线程',
      close: '关闭',
      hide: '隐藏宠物',
      restore: '显示宠物',
      moved: 'Usagi 已移动。',
      reset: 'Usagi 已回到默认位置。',
      hidden: 'Usagi 已隐藏。使用显示按钮可重新打开。',
      choosePet: '选择宠物',
      chooseUsagi: 'Usagi',
      chooseMini: 'Mini · 仅显示控件',
      panelChat: '快速聊天',
      panelVoice: '语音',
      panelActivity: '线程',
      demoOnly: '网页预览 · 仅显示模拟活动，不会连接 ChatGPT 或 Codex。',
      chatPlaceholder: '发送消息给 ChatGPT',
      chatHint: 'Enter 发送 · Shift+Enter 换行',
      miniGuide: 'Mini · 打开宠物详情',
      send: '发送',
      chatEmpty: '输入一条模拟请求，预览快速聊天。',
      chatRunning: '模拟对话正在运行。',
      chatWaiting: '模拟对话正在等待你的输入。',
      chatReady: '模拟对话已就绪。',
      continue: '继续演示',
      voiceNote: '语音聊天可通过 ChatGPT 桌面端的悬浮控件启动。本网页预览无法启动真实语音会话。',
      activityNote: '选择一条模拟线程预览对话。线程顺序遵循桌面宠物的状态优先级。',
      activityEmpty: '还没有模拟线程。先从快速聊天发送一条请求。',
      stateIdle: '待机',
      stateRunning: '运行中',
      stateNeedsInput: '等待输入',
      stateReady: '已就绪',
      stateBlocked: '已阻塞',
      sampleThread: '模拟请求',
      stateChanged: '宠物状态：',
    },
  };

  const widget = document.createElement('aside');
  widget.className = 'usagi-widget';
  widget.dataset.status = 'idle';
  widget.style.visibility = 'hidden';
  widget.innerHTML = [
    '<a class="usagi-widget__pet" data-usagi-pet>',
    '  <span class="usagi-widget__sprite" aria-hidden="true"></span>',
    '</a>',
    '<div class="usagi-widget__controls" data-usagi-controls role="toolbar">',
    '  <button class="usagi-widget__control" data-usagi-chat type="button">',
    '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
    '  </button>',
    '  <button class="usagi-widget__control" data-usagi-voice type="button">',
    '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4"/></svg>',
    '  </button>',
    '  <button class="usagi-widget__control" data-usagi-activity type="button" aria-expanded="false">',
    '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    '  </button>',
    '</div>',
    '<section class="usagi-widget__panel" data-usagi-panel hidden>',
    '  <header class="usagi-widget__panel-header">',
    '    <strong data-usagi-panel-title></strong>',
    '    <div class="usagi-widget__panel-header-actions">',
    '      <button class="usagi-widget__panel-icon" data-usagi-collapse type="button" hidden>',
    '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
    '      </button>',
    '      <button class="usagi-widget__panel-icon" data-usagi-close type="button">×</button>',
    '    </div>',
    '  </header>',
    '  <p class="usagi-widget__demo-note" data-usagi-demo-note></p>',
    '  <div class="usagi-widget__panel-body" data-usagi-chat-panel hidden>',
    '    <form class="usagi-widget__chat-form" data-usagi-chat-form>',
    '      <label class="usagi-widget__sr-only" data-usagi-chat-label for="usagi-widget-chat-input"></label>',
    '      <textarea id="usagi-widget-chat-input" data-usagi-chat-input rows="2" maxlength="500"></textarea>',
    '      <div class="usagi-widget__chat-footer">',
    '        <span class="usagi-widget__hint" data-usagi-chat-hint></span>',
    '        <button class="usagi-widget__send" type="submit"></button>',
    '      </div>',
    '    </form>',
    '    <p class="usagi-widget__panel-message" data-usagi-chat-message role="status"></p>',
    '    <button class="usagi-widget__send" data-usagi-continue type="button" hidden></button>',
    '  </div>',
    '  <div class="usagi-widget__panel-body" data-usagi-voice-panel hidden>',
    '    <p class="usagi-widget__panel-message" data-usagi-voice-message></p>',
    '  </div>',
    '  <div class="usagi-widget__panel-body" data-usagi-activity-panel hidden>',
    '    <p class="usagi-widget__panel-message" data-usagi-activity-note></p>',
    '    <p class="usagi-widget__thread-empty" data-usagi-thread-empty role="status" hidden></p>',
    '    <ul class="usagi-widget__threads" data-usagi-threads></ul>',
    '  </div>',
    '</section>',
    '<section class="usagi-widget__picker" data-usagi-picker hidden role="group">',
    '  <strong data-usagi-picker-title></strong>',
    '  <button type="button" data-usagi-pet-mode="usagi"></button>',
    '  <button type="button" data-usagi-pet-mode="mini"></button>',
    '</section>',
    '<section class="usagi-widget__context" data-usagi-context hidden role="menu">',
    '  <button type="button" role="menuitem" data-usagi-hide></button>',
    '</section>',
    '<a class="usagi-widget__mini-toggle" data-usagi-mini-toggle hidden></a>',
    '<button class="usagi-widget__restore" data-usagi-restore type="button" hidden>',
    '  <span class="usagi-widget__sprite" aria-hidden="true"></span>',
    '</button>',
    '<span class="usagi-widget__sr-only" data-usagi-status role="status" aria-live="polite"></span>',
  ].join('');

  const petLink = widget.querySelector('[data-usagi-pet]');
  const controls = widget.querySelector('[data-usagi-controls]');
  const chatButton = widget.querySelector('[data-usagi-chat]');
  const voiceButton = widget.querySelector('[data-usagi-voice]');
  const activityButton = widget.querySelector('[data-usagi-activity]');
  const hideButton = widget.querySelector('[data-usagi-hide]');
  const restoreButton = widget.querySelector('[data-usagi-restore]');
  const miniToggle = widget.querySelector('[data-usagi-mini-toggle]');
  const panel = widget.querySelector('[data-usagi-panel]');
  const panelTitle = widget.querySelector('[data-usagi-panel-title]');
  const chatPanel = widget.querySelector('[data-usagi-chat-panel]');
  const voicePanel = widget.querySelector('[data-usagi-voice-panel]');
  const activityPanel = widget.querySelector('[data-usagi-activity-panel]');
  const chatForm = widget.querySelector('[data-usagi-chat-form]');
  const chatInput = widget.querySelector('[data-usagi-chat-input]');
  const chatMessage = widget.querySelector('[data-usagi-chat-message]');
  const continueButton = widget.querySelector('[data-usagi-continue]');
  const voiceMessage = widget.querySelector('[data-usagi-voice-message]');
  const activityNote = widget.querySelector('[data-usagi-activity-note]');
  const threadList = widget.querySelector('[data-usagi-threads]');
  const threadEmpty = widget.querySelector('[data-usagi-thread-empty]');
  const collapseButton = widget.querySelector('[data-usagi-collapse]');
  const closeButton = widget.querySelector('[data-usagi-close]');
  const picker = widget.querySelector('[data-usagi-picker]');
  const pickerTitle = widget.querySelector('[data-usagi-picker-title]');
  const petModeButtons = [...widget.querySelectorAll('[data-usagi-pet-mode]')];
  const contextMenu = widget.querySelector('[data-usagi-context]');
  const statusAnnouncer = widget.querySelector('[data-usagi-status]');
  const spriteUrl = new URL(spritePath, document.baseURI);

  widget.querySelectorAll('.usagi-widget__sprite').forEach((sprite) => {
    sprite.style.backgroundImage = 'url("' + spriteUrl.href + '")';
  });

  const detailHref = isPetPage ? '#preview' : petHref;
  petLink.href = detailHref;
  miniToggle.href = detailHref;
  document.body.append(widget);

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function text(key) {
    return words[language()][key];
  }

  function stateLabel(state) {
    return {
      idle: text('stateIdle'),
      running: text('stateRunning'),
      'needs-input': text('stateNeedsInput'),
      ready: text('stateReady'),
      blocked: text('stateBlocked'),
    }[state] || text('stateIdle');
  }

  let currentMode = 'usagi';
  try {
    currentMode = localStorage.getItem(modeKey) === 'mini' ? 'mini' : 'usagi';
  } catch {
    currentMode = 'usagi';
  }

  let position = { x: 0, y: 0 };
  let drag = null;
  let keyboardMoveTimer = 0;
  let suppressClick = false;
  let activePanel = '';
  let selectedThreadId = '';
  let nextThreadId = 1;
  const threads = [];
  const statusPriority = { 'needs-input': 0, blocked: 1, ready: 2, running: 3 };

  const savedPosition = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(positionKey) || 'null');
      return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : null;
    } catch {
      return null;
    }
  })();

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

  function setPosition(next, persist) {
    position = clamped(next);
    widget.style.left = position.x + 'px';
    widget.style.top = position.y + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.dataset.popupSide = position.x < window.innerWidth / 2 ? 'right' : 'left';
    widget.dataset.popupPlacement = position.y > window.innerHeight / 2 ? 'top' : 'bottom';
    if (persist) {
      try {
        localStorage.setItem(positionKey, JSON.stringify(position));
      } catch {
        // Movement remains available when browser storage is unavailable.
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
    statusAnnouncer.textContent = message;
  }

  function closePanels() {
    panel.hidden = true;
    picker.hidden = true;
    contextMenu.hidden = true;
    activePanel = '';
    activityButton.setAttribute('aria-expanded', 'false');
  }

  function openPanel(mode, focusTarget) {
    activePanel = mode;
    panel.hidden = false;
    picker.hidden = true;
    contextMenu.hidden = true;
    chatPanel.hidden = mode !== 'chat';
    voicePanel.hidden = mode !== 'voice';
    activityPanel.hidden = mode !== 'activity';
    collapseButton.hidden = mode !== 'activity';
    activityButton.setAttribute('aria-expanded', String(mode === 'activity'));
    if (mode === 'chat') renderSelectedThread();
    updateLabels();
    if (focusTarget) {
      const target = mode === 'chat' ? chatInput : mode === 'activity' ? threadList.querySelector('button') || closeButton : closeButton;
      target.focus();
    }
  }

  function openPetPicker() {
    panel.hidden = true;
    contextMenu.hidden = true;
    picker.hidden = false;
    activePanel = '';
    activityButton.setAttribute('aria-expanded', 'false');
    updateLabels();
    petModeButtons[0].focus();
  }

  function setMode(mode) {
    currentMode = mode === 'mini' ? 'mini' : 'usagi';
    widget.dataset.mini = String(currentMode === 'mini');
    miniToggle.hidden = currentMode !== 'mini';
    picker.hidden = true;
    try {
      localStorage.setItem(modeKey, currentMode);
    } catch {
      // The current page still reflects the selected display mode.
    }
    updateLabels();
    requestAnimationFrame(() => {
      setPosition(position, true);
      (currentMode === 'mini' ? miniToggle : petLink).focus();
    });
  }

  function setStatus(nextStatus, announceChange) {
    widget.dataset.status = nextStatus;
    updateLabels();
    if (announceChange) announce(text('stateChanged') + stateLabel(nextStatus));
  }

  function updateOverallStatus() {
    const prioritized = threads
      .filter((thread) => thread.status !== 'ready' || thread.unread)
      .sort((a, b) => (statusPriority[a.status] ?? 4) - (statusPriority[b.status] ?? 4));
    setStatus(prioritized[0]?.status || 'idle', false);
  }

  function renderSelectedThread() {
    const thread = threads.find((entry) => entry.id === selectedThreadId);
    if (!thread) {
      chatMessage.textContent = text('chatEmpty');
      continueButton.hidden = true;
      return;
    }
    chatMessage.textContent = thread.status === 'running'
      ? text('chatRunning')
      : thread.status === 'needs-input'
        ? text('chatWaiting')
        : text('chatReady');
    continueButton.hidden = thread.status !== 'needs-input';
  }

  function renderThreads() {
    threadList.replaceChildren();
    const visibleThreads = [...threads].sort((a, b) => (statusPriority[a.status] ?? 4) - (statusPriority[b.status] ?? 4));
    threadEmpty.hidden = visibleThreads.length > 0;
    threadEmpty.textContent = text('activityEmpty');
    visibleThreads.forEach((thread) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const title = document.createElement('span');
      const state = document.createElement('span');
      button.className = 'usagi-widget__thread';
      button.type = 'button';
      button.dataset.threadId = thread.id;
      button.setAttribute('aria-current', String(thread.id === selectedThreadId));
      title.className = 'usagi-widget__thread-title';
      title.textContent = thread.title;
      state.className = 'usagi-widget__thread-state';
      state.textContent = stateLabel(thread.status);
      button.append(title, state);
      item.append(button);
      threadList.append(item);
    });
  }

  function updateLabels() {
    const current = language();
    widget.setAttribute('aria-label', words[current].region);
    controls.setAttribute('aria-label', words[current].controls);
    petLink.setAttribute('aria-label', isPetPage ? words[current].petAction : words[current].petGuide);
    petLink.title = isPetPage ? words[current].petAction : words[current].petGuide;
    miniToggle.setAttribute('aria-label', isPetPage ? words[current].choosePet : words[current].petGuide);
    miniToggle.textContent = isPetPage ? words[current].mini : words[current].miniGuide;
    chatButton.setAttribute('aria-label', words[current].chat);
    chatButton.title = words[current].chat;
    voiceButton.setAttribute('aria-label', words[current].voice);
    voiceButton.title = words[current].voice;
    activityButton.setAttribute('aria-label', words[current].activity);
    activityButton.title = words[current].activity;
    hideButton.textContent = words[current].hide;
    hideButton.setAttribute('aria-label', words[current].hide);
    restoreButton.setAttribute('aria-label', words[current].restore);
    closeButton.setAttribute('aria-label', words[current].close);
    collapseButton.setAttribute('aria-label', words[current].collapse);
    picker.setAttribute('aria-label', words[current].choosePet);
    pickerTitle.textContent = words[current].choosePet;
    petModeButtons[0].textContent = words[current].chooseUsagi;
    petModeButtons[1].textContent = words[current].chooseMini;
    petModeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.usagiPetMode === currentMode));
    });
    panelTitle.textContent = activePanel === 'chat'
      ? (threads.find((thread) => thread.id === selectedThreadId)?.title || words[current].panelChat)
      : activePanel === 'voice' ? words[current].panelVoice : words[current].panelActivity;
    widget.querySelector('[data-usagi-demo-note]').textContent = words[current].demoOnly;
    widget.querySelector('[data-usagi-chat-label]').textContent = words[current].chatPlaceholder;
    chatInput.placeholder = words[current].chatPlaceholder;
    widget.querySelector('[data-usagi-chat-hint]').textContent = words[current].chatHint;
    chatForm.querySelector('[type="submit"]').textContent = words[current].send;
    continueButton.textContent = words[current].continue;
    voiceMessage.textContent = words[current].voiceNote;
    activityNote.textContent = words[current].activityNote;
    updateOverallStatusLabels();
  }

  function updateOverallStatusLabels() {
    widget.dataset.status = widget.dataset.status || 'idle';
    statusAnnouncer.textContent = words[language()].stateChanged + stateLabel(widget.dataset.status);
    renderThreads();
    if (activePanel === 'chat') renderSelectedThread();
  }

  const savedMode = currentMode;
  widget.dataset.mini = String(savedMode === 'mini');
  miniToggle.hidden = currentMode !== 'mini';

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const request = chatInput.value.trim();
    if (!request) return;
    const thread = {
      id: String(nextThreadId++),
      title: request.length > 38 ? request.slice(0, 36) + '…' : request,
      status: 'running',
      unread: true,
    };
    threads.push(thread);
    selectedThreadId = thread.id;
    chatInput.value = '';
    renderThreads();
    renderSelectedThread();
    updateOverallStatus();
    announce(text('stateChanged') + stateLabel(widget.dataset.status));
    thread.timer = window.setTimeout(() => {
      thread.status = 'needs-input';
      renderThreads();
      renderSelectedThread();
      updateOverallStatus();
    }, 1700);
  });

  continueButton.addEventListener('click', () => {
    const thread = threads.find((entry) => entry.id === selectedThreadId);
    if (!thread) return;
    window.clearTimeout(thread.timer);
    thread.status = 'ready';
    thread.unread = true;
    continueButton.hidden = true;
    renderThreads();
    renderSelectedThread();
    updateOverallStatus();
    announce(text('stateChanged') + stateLabel(widget.dataset.status));
  });

  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  petLink.href = isPetPage ? '#preview' : petHref;
  petLink.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      announce(text('moved'));
      return;
    }
    if (isPetPage) {
      event.preventDefault();
      openPetPicker();
    }
  });

  miniToggle.addEventListener('click', (event) => {
    if (!isPetPage) return;
    event.preventDefault();
    openPetPicker();
  });
  petModeButtons[0].addEventListener('click', () => setMode('usagi'));
  petModeButtons[1].addEventListener('click', () => setMode('mini'));
  chatButton.addEventListener('click', () => openPanel('chat', true));
  voiceButton.addEventListener('click', () => openPanel('voice', false));
  activityButton.addEventListener('click', () => {
    if (!panel.hidden && activePanel === 'activity') closePanels();
    else openPanel('activity', true);
  });
  collapseButton.addEventListener('click', () => {
    closePanels();
    activityButton.focus();
  });
  closeButton.addEventListener('click', () => {
    closePanels();
    activityButton.focus();
  });
  hideButton.addEventListener('click', () => {
    widget.dataset.collapsed = 'true';
    closePanels();
    restoreButton.hidden = false;
    announce(text('hidden'));
    restoreButton.focus();
  });
  restoreButton.addEventListener('click', () => {
    delete widget.dataset.collapsed;
    restoreButton.hidden = true;
    requestAnimationFrame(() => {
      setPosition(position, false);
      (currentMode === 'mini' ? miniToggle : petLink).focus();
    });
  });
  threadList.addEventListener('click', (event) => {
    const threadButton = event.target.closest('[data-thread-id]');
    if (!threadButton) return;
    selectedThreadId = threadButton.dataset.threadId;
    const thread = threads.find((entry) => entry.id === selectedThreadId);
    if (thread) thread.unread = false;
    updateOverallStatus();
    openPanel('chat', false);
    renderThreads();
    renderSelectedThread();
  });

  function showContextMenu(event) {
    event.preventDefault();
    closePanels();
    contextMenu.hidden = false;
    widget.dataset.popupSide = event.clientX < window.innerWidth / 2 ? 'right' : 'left';
    widget.dataset.popupPlacement = event.clientY < window.innerHeight / 2 ? 'bottom' : 'top';
    hideButton.focus();
  }

  petLink.addEventListener('contextmenu', showContextMenu);
  miniToggle.addEventListener('contextmenu', showContextMenu);

  petLink.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      lastX: event.clientX,
      moved: false,
    };
    try {
      petLink.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; click and touch behavior still work.
    }
  });

  petLink.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const movementX = event.clientX - drag.lastX;
    if (!drag.moved && Math.hypot(deltaX, deltaY) >= 6) {
      drag.moved = true;
      widget.dataset.dragging = 'true';
      if (Math.abs(deltaX) > 1) widget.dataset.direction = deltaX > 0 ? 'right' : 'left';
    } else if (drag.moved && Math.abs(movementX) > 1) {
      widget.dataset.direction = movementX > 0 ? 'right' : 'left';
    }
    drag.lastX = event.clientX;
    if (drag.moved) {
      event.preventDefault();
      setPosition({ x: drag.originX + deltaX, y: drag.originY + deltaY }, false);
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
    delete widget.dataset.direction;
  }

  petLink.addEventListener('pointerup', finishDrag);
  petLink.addEventListener('pointercancel', finishDrag);
  petLink.addEventListener('lostpointercapture', finishDrag);

  widget.addEventListener('keydown', (event) => {
    const petFocused = event.target === petLink || event.target === miniToggle;
    if (petFocused && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
      event.preventDefault();
      closePanels();
      contextMenu.hidden = false;
      const rect = petLink.getBoundingClientRect();
      widget.dataset.popupSide = rect.left < window.innerWidth / 2 ? 'right' : 'left';
      widget.dataset.popupPlacement = rect.top < window.innerHeight / 2 ? 'bottom' : 'top';
      hideButton.focus();
      return;
    }
    if (event.key === 'Escape') {
      if (!panel.hidden || !picker.hidden || !contextMenu.hidden) {
        event.preventDefault();
        closePanels();
        (currentMode === 'mini' ? miniToggle : petLink).focus();
      } else if (petFocused) {
        event.preventDefault();
        setPosition(defaultPosition(), true);
        announce(text('reset'));
      }
      return;
    }
    if (!petFocused) return;
    const step = event.shiftKey ? 48 : 24;
    const moves = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    if (moves[event.key]) {
      event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        window.clearTimeout(keyboardMoveTimer);
        widget.dataset.keyMoving = 'true';
        widget.dataset.direction = event.key === 'ArrowRight' ? 'right' : 'left';
      }
      setPosition({ x: position.x + moves[event.key][0], y: position.y + moves[event.key][1] }, true);
      announce(text('moved'));
    }
  });

  function finishKeyboardMove() {
    window.clearTimeout(keyboardMoveTimer);
    keyboardMoveTimer = window.setTimeout(() => {
      delete widget.dataset.keyMoving;
      if (!widget.hasAttribute('data-dragging')) delete widget.dataset.direction;
    }, 250);
  }

  widget.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') finishKeyboardMove();
  });
  window.addEventListener('blur', finishKeyboardMove);

  window.addEventListener('resize', () => setPosition(position, true));
  document.addEventListener('pointerdown', (event) => {
    if (!widget.contains(event.target) && (!panel.hidden || !picker.hidden || !contextMenu.hidden)) closePanels();
  });
  new MutationObserver(updateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  updateLabels();
  requestAnimationFrame(() => {
    setPosition(savedPosition || defaultPosition(), false);
    widget.style.visibility = '';
  });
})();
