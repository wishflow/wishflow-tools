(() => {
  const languageKey = 'wishflow-tools-language';
  const languageToggle = document.querySelector('[data-language-toggle]');
  const pageDescription = document.querySelector('meta[name="description"]');
  const sectionNav = document.querySelector('[data-section-nav]');
  const installTabList = document.querySelector('[data-install-tabs]');
  const installTabs = [...document.querySelectorAll('[data-install-tab]')];
  const installPanels = [...document.querySelectorAll('[data-install-panel]')];
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

  const stateNames = {
    en: { idle: 'Idle', 'running-right': 'Run right', 'running-left': 'Run left', waving: 'Staff flourish', jumping: 'Jumping', running: 'Running', 'needs-input': 'Needs input', complete: 'Ready', blocked: 'Blocked' },
    zh: { idle: '待机', 'running-right': '向右跑', 'running-left': '向左跑', waving: '挥舞金箍棒', jumping: '跳跃', running: '运行中', 'needs-input': '等待输入', complete: '已就绪', blocked: '已阻塞' },
  };
  const stateDescriptions = {
    en: {
      idle: 'Usagi is ready.',
      'running-right': 'Usagi is moving toward the right.',
      'running-left': 'Usagi is moving toward the left.',
      waving: 'Usagi plays the original four-frame staff flourish.',
      jumping: 'Usagi jumps and returns to its resting pose.',
      running: 'The sample task is running.',
      'needs-input': 'The sample task is waiting for your approval.',
      complete: 'The sample task is complete and ready for review.',
      blocked: 'The sample task is blocked by an error.',
    },
    zh: {
      idle: 'Usagi 已准备就绪。',
      'running-right': 'Usagi 正在向右移动。',
      'running-left': 'Usagi 正在向左移动。',
      waving: 'Usagi 播放原始图集中的四帧挥棒动作。',
      jumping: 'Usagi 跳起后回到待机姿势。',
      running: '模拟任务正在运行。',
      'needs-input': '模拟任务正在等待你的确认。',
      complete: '模拟任务已完成，等待查看结果。',
      blocked: '模拟任务遇到错误，暂时无法继续。',
    },
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
      initial: 'Choose a sprite state, hover or drag Usagi, or start the sample conversation.',
      working: 'I’ll inspect the request and prepare the change.',
      running: 'The change is ready. I’m checking the result now.',
      'needs-input': 'Checks are ready. Review the change and approve to finish.',
      complete: 'Approved. The sample task is complete.',
    },
    zh: {
      initial: '选择动画状态、悬停或拖动 Usagi，或开始一段模拟对话。',
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
    installTabList.setAttribute('aria-label', language === 'en' ? 'Installation scenarios' : '安装场景');
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

  function setPreviewState(state) {
    activeState = state;
    stateButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.state === state));
    });
    stateIndicator.dataset.state = state;
    sprite.dataset.state = state;
    stateIndicator.textContent = stateNames[language][state];
    previewStatus.textContent = stateDescriptions[language][state];
    sprite.setAttribute('aria-label', copyMessages[language].sprite + stateNames[language][state]);
    approveButton.hidden = state !== 'needs-input';
    if (state === 'jumping') {
      demoTimers.push(window.setTimeout(() => {
        if (activeState === 'jumping') setPreviewState('idle');
      }, 1250));
    }
  }

  function selectInstallTab(tabName, moveFocus = false) {
    const selectedTab = installTabs.find((tab) => tab.dataset.installTab === tabName);
    if (!selectedTab) return;
    installTabs.forEach((tab) => {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    installPanels.forEach((panel) => {
      panel.hidden = panel.dataset.installPanel !== tabName;
    });
    if (moveFocus) selectedTab.focus();
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
    setPreviewState('running');
    demoTimers.push(window.setTimeout(() => {
      demoReply.textContent = demoReplies[language].running;
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
  installTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectInstallTab(tab.dataset.installTab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % installTabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + installTabs.length) % installTabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = installTabs.length - 1;
      else return;
      event.preventDefault();
      selectInstallTab(installTabs[nextIndex].dataset.installTab, true);
    });
  });
  runDemoButton.addEventListener('click', startDemo);
  approveButton.addEventListener('click', finishDemo);
  copyButton.addEventListener('click', copyPrompt);
  setLanguage(language, false);
  setPreviewState('idle');
  selectInstallTab(installTabs[0]?.dataset.installTab);
})();
