(() => {
  const languageKey = 'wishflow-tools-language';
  const languageToggle = document.querySelector('[data-language-toggle]');
  const pageDescription = document.querySelector('meta[name="description"]');
  const sectionNav = document.querySelector('[data-section-nav]');
  const platformList = document.querySelector('[data-platforms]');
  const sprite = document.querySelector('#pet-sprite');
  const stateIndicator = document.querySelector('#state-indicator');
  const previewStatus = document.querySelector('#preview-status');
  const stateButtons = [...document.querySelectorAll('[data-state]')];
  const runDemoButton = document.querySelector('#run-demo');
  const approveButton = document.querySelector('#approve-demo');
  const demoUser = document.querySelector('#demo-user');
  const demoReply = document.querySelector('#demo-reply');
  const copyButton = document.querySelector('#copy-prompt');
  const copyStatus = document.querySelector('#copy-status');
  const promptField = document.querySelector('#install-prompt');
  const promptFallback = document.querySelector('#prompt-fallback');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  const stateNames = {
    en: { idle: 'Idle', working: 'Working', running: 'Running', 'needs-input': 'Needs input', complete: 'Complete' },
    zh: { idle: '待机', working: '工作中', running: '运行中', 'needs-input': '等待确认', complete: '已完成' },
  };
  const stateDescriptions = {
    en: {
      idle: 'Usagi is ready.',
      working: 'Usagi is working on the request.',
      running: 'The sample task is running.',
      'needs-input': 'The sample task is waiting for your approval.',
      complete: 'The sample task is complete.',
    },
    zh: {
      idle: 'Usagi 已准备就绪。',
      working: 'Usagi 正在处理请求。',
      running: '模拟任务正在运行。',
      'needs-input': '模拟任务正在等待你的确认。',
      complete: '模拟任务已完成。',
    },
  };
  const spriteFrames = {
    idle: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }, { col: 4, row: 0 }, { col: 5, row: 0 }],
    working: [{ col: 0, row: 3 }, { col: 1, row: 3 }, { col: 2, row: 3 }, { col: 3, row: 3 }],
    running: [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 1 }, { col: 5, row: 1 }, { col: 6, row: 1 }, { col: 7, row: 1 }],
    'needs-input': [{ col: 4, row: 0 }],
    complete: [{ col: 0, row: 4 }, { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }],
  };
  const installPrompts = {
    en: [
      'Install the Usagi custom pet (ID: uu-usagi) on this computer.',
      '',
      '1. Identify the operating system and the current surface: ChatGPT desktop, ChatGPT web, interactive Codex CLI, or another interface.',
      '2. For a local installation, use only the existing installer for this repository:',
      '   macOS/Linux: curl -fsSL "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.sh" | sh',
      '   Windows PowerShell: irm "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.ps1" | iex',
      '3. Run the matching installer as written. It verifies SHA-256 before writing files. Do not bypass its checks. If the target contains different or extra files, stop and report the conflict; preserve every existing file. Do not overwrite, delete, or change any other pet.',
      '4. After a successful install, if this interface provides an explicit supported pet-selection control, select uu-usagi there. Do not call private pet APIs or edit application/account state. Never claim selection succeeded unless you can verify it.',
      '5. If this interface cannot select a pet, give the matching steps:',
      '   ChatGPT desktop: Settings > Pets > Refresh > choose Usagi. Use /pet or the app controls to show it; use Hide pet to hide it.',
      '   ChatGPT web: Settings > Personalization > Pet > Upload pet, upload the original spritesheet.webp, then select Usagi. Web selection is separate from desktop installation.',
      '   Codex CLI: in an interactive session, enter /pets uu-usagi.',
      '   Linux CLI: use Kitty graphics or Sixel; pets are unavailable inside tmux and Zellij. Do not promise a floating desktop pet.',
      '6. Report which installer ran, whether installation and selection were verified, and any remaining manual step.',
    ].join('\n'),
    zh: [
      '在当前这台设备安装 Usagi 自定义宠物（ID：uu-usagi）。',
      '',
      '1. 先识别操作系统和当前界面：ChatGPT 桌面端、ChatGPT 网页端、交互式 Codex CLI 或其他界面。',
      '2. 本机安装只使用此仓库现有安装器：',
      '   macOS/Linux：curl -fsSL "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.sh" | sh',
      '   Windows PowerShell：irm "https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet/install.ps1" | iex',
      '3. 按原样运行与系统匹配的安装器。安装器写入前会校验 SHA-256，不要绕过校验。若目标目录已有不同或额外文件，立即停止并报告冲突，保留全部现有文件。不要覆盖、删除或更改其他宠物。',
      '4. 安装成功后，仅当当前界面提供明确且受支持的宠物选择控件时，才在那里选择 uu-usagi。不要调用私有宠物 API，不要编辑应用或账号内部状态。未能验证选择成功时不要声称已选中。',
      '5. 如果当前界面不支持选择宠物，请给出对应步骤：',
      '   ChatGPT 桌面端：Settings > Pets > Refresh > 选择 Usagi。输入 /pet 或使用应用控件显示；使用 Hide pet 隐藏。',
      '   ChatGPT 网页端：Settings > Personalization > Pet > Upload pet，上传原始 spritesheet.webp 后选择 Usagi。网页选择与桌面安装相互独立。',
      '   Codex CLI：在交互式会话中输入 /pets uu-usagi。',
      '   Linux CLI：使用支持 Kitty 图形协议或 Sixel 的终端；tmux 和 Zellij 内不可用。不要承诺桌面浮动宠物。',
      '6. 报告运行了哪个安装器、是否验证安装与选择成功，以及仍需手动完成的步骤。',
    ].join('\n'),
  };
  const demoReplies = {
    en: {
      initial: 'Choose a state or start the sample conversation.',
      working: 'I’ll inspect the request and prepare the change.',
      running: 'The change is ready. I’m checking the result now.',
      'needs-input': 'Checks are ready. Review the change and approve to finish.',
      complete: 'Approved. The sample task is complete.',
    },
    zh: {
      initial: '切换状态，或开始一段模拟对话。',
      working: '我会先检查请求并准备修改。',
      running: '修改已准备好，我正在检查结果。',
      'needs-input': '检查已完成。请查看修改并确认结束任务。',
      complete: '已确认，模拟任务完成。',
    },
  };
  const copyMessages = {
    en: {
      copied: 'Prompt copied. Paste it into Codex on the computer where Usagi should be installed.',
      fallback: 'Clipboard access is unavailable. The prompt is open below; select the text and copy it manually.',
      sprite: 'Usagi animation state: ',
    },
    zh: {
      copied: '提示词已复制。请粘贴到要安装 Usagi 的那台设备上的 Codex。',
      fallback: '无法访问剪贴板。下方已展开提示词，请选中文本后手动复制。',
      sprite: 'Usagi 动画状态：',
    },
  };

  let language = 'en';
  try {
    language = localStorage.getItem(languageKey) === 'zh' ? 'zh' : 'en';
  } catch {
    language = 'en';
  }

  let activeState = 'idle';
  let frameIndex = 0;
  let frameTimer = 0;
  let demoTimers = [];

  function setLanguage(nextLanguage, remember) {
    language = nextLanguage === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language;
    document.title = language === 'en'
      ? 'Usagi animated preview and installation guide · WishFlow Tools'
      : 'Usagi 动画预览与安装指南 · WishFlow Tools';
    pageDescription.content = language === 'en'
      ? "Preview Usagi's sprite animation and follow installation steps for desktop, web, and Codex CLI."
      : '预览 Usagi 动画，并查看桌面端、网页端和 Codex CLI 的安装与选择步骤。';
    languageToggle.textContent = language === 'en' ? '中文' : 'English';
    languageToggle.setAttribute(
      'aria-label',
      language === 'en' ? 'Switch language to Chinese' : '切换界面语言为英文',
    );
    promptField.value = installPrompts[language];
    sectionNav.setAttribute('aria-label', language === 'en' ? 'Page sections' : '页面导航');
    platformList.setAttribute('aria-label', language === 'en' ? 'Supported interfaces' : '支持的界面');
    demoReply.textContent = demoUser.hidden ? demoReplies[language].initial : demoReplies[language][activeState];
    if (copyStatus.dataset.messageType) {
      copyStatus.textContent = copyMessages[language][copyStatus.dataset.messageType];
    }
    if (remember) {
      try {
        localStorage.setItem(languageKey, language);
      } catch {
        // Language switching remains available when storage is disabled.
      }
    }
    updateStateText();
  }

  function updateStateText() {
    stateIndicator.textContent = stateNames[language][activeState];
    previewStatus.textContent = stateDescriptions[language][activeState];
    sprite.setAttribute('aria-label', copyMessages[language].sprite + stateNames[language][activeState]);
  }

  function drawFrame(frame) {
    sprite.style.backgroundPosition = (frame.col * 100 / 7) + '% ' + (frame.row * 100 / 8) + '%';
  }

  function stopFrameTimer() {
    if (frameTimer) window.clearInterval(frameTimer);
    frameTimer = 0;
  }

  function setPreviewState(state) {
    activeState = state;
    frameIndex = 0;
    stopFrameTimer();
    stateButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.state === state));
    });
    stateIndicator.dataset.state = state;
    stateIndicator.textContent = stateNames[language][state];
    previewStatus.textContent = stateDescriptions[language][state];
    sprite.setAttribute('aria-label', copyMessages[language].sprite + stateNames[language][state]);
    const frames = spriteFrames[state];
    drawFrame(frames[0]);
    if (!motionPreference.matches && frames.length > 1) {
      frameTimer = window.setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length;
        drawFrame(frames[frameIndex]);
      }, 360);
    }
    approveButton.hidden = state !== 'needs-input';
  }

  function clearDemoTimers() {
    demoTimers.forEach((timer) => window.clearTimeout(timer));
    demoTimers = [];
  }

  function resetDemo() {
    clearDemoTimers();
    runDemoButton.disabled = false;
    approveButton.hidden = true;
    demoUser.hidden = true;
    demoReply.textContent = demoReplies[language].initial;
  }

  function startDemo() {
    resetDemo();
    demoUser.hidden = false;
    runDemoButton.disabled = true;
    demoReply.textContent = demoReplies[language].working;
    setPreviewState('working');
    demoTimers.push(window.setTimeout(() => {
      demoReply.textContent = demoReplies[language].running;
      setPreviewState('running');
    }, 950));
    demoTimers.push(window.setTimeout(() => {
      demoReply.textContent = demoReplies[language]['needs-input'];
      setPreviewState('needs-input');
    }, 2200));
  }

  function finishDemo() {
    clearDemoTimers();
    demoReply.textContent = demoReplies[language].complete;
    runDemoButton.disabled = false;
    setPreviewState('complete');
  }

  function showPromptFallback() {
    promptFallback.open = true;
    promptField.value = installPrompts[language];
    promptField.focus();
    promptField.select();
    copyStatus.dataset.messageType = 'fallback';
    copyStatus.textContent = copyMessages[language].fallback;
  }

  async function copyPrompt() {
    promptField.value = installPrompts[language];
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(promptField.value);
      copyStatus.dataset.messageType = 'copied';
      copyStatus.textContent = copyMessages[language].copied;
    } catch {
      showPromptFallback();
    }
  }

  languageToggle.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en', true));
  stateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      resetDemo();
      setPreviewState(button.dataset.state);
    });
  });
  runDemoButton.addEventListener('click', startDemo);
  approveButton.addEventListener('click', finishDemo);
  copyButton.addEventListener('click', copyPrompt);
  motionPreference.addEventListener?.('change', () => setPreviewState(activeState));

  setLanguage(language, false);
  setPreviewState('idle');
})();
