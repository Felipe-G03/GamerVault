const { app, BrowserWindow, ipcMain, shell, session, dialog, Tray, Menu, nativeImage, globalShortcut, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

// Permite reprodução imediata de áudio/vídeo embutido sem bloqueios de gesto
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Força perfil de cores sRGB para evitar dupla saturação na captura DXGI de tela cheia
app.commandLine.appendSwitch('force-color-profile', 'srgb');
// Habilita Document Picture-in-Picture API nativo para janelas Always-on-Top no Windows
app.commandLine.appendSwitch('enable-features', 'DocumentPictureInPictureAPI');

// ==========================================
// REGISTRO DE PROTOCOLO DEEP LINK (gamervault://)
// ==========================================
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('gamervault', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('gamervault');
}

let mainWindow;
let overlayWindow = null;
let tray = null;
let currentActiveCast = null;
let currentActiveGame = null;
let activeGamePid = null;
let activeGameHwnd = null;
let activeGameWatchdog = null;
let activeGameProcess = null;
let activeGameLaunchGraceUntil = 0;
let activeGameConsecutiveMissing = 0;
let overlayUserWantedVisible = true;
let overlayMode = 'compact'; // 'compact' | 'expanded' | 'hidden'
let overlayIsNotesExpanded = false;
let pendingDeepLinkUrl = process.argv.find(arg => typeof arg === 'string' && arg.startsWith('gamervault://')) || null;
app.isQuitting = false;

function getEnvVar(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          if (k === key) {
            return trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

// Garante instância única para interceptar cliques de deep link no Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();

      // Procura URL gamervault:// nos argumentos recebidos
      const deepLink = commandLine.find(arg => typeof arg === 'string' && arg.startsWith('gamervault://'));
      if (deepLink) {
        mainWindow.webContents.send('deep-link:received', deepLink);
      }
    }
  });
}

// ==========================================
// CONFIGURAÇÕES DO APLICATIVO (SETTINGS)
// ==========================================
const SETTINGS_FILE = path.join(app.getPath('userData'), 'gamer_vault_settings.json');

const DEFAULT_SETTINGS = {
  openAtLogin: false,
  startMinimized: false,
  minimizeToTray: true,
  globalShortcut: 'Alt+Space',
  overlayShortcut: 'Alt+O',
  overlayFpsPosition: 'top-right',
  startMuted: false
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Erro ao ler settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar settings:', e);
  }
}

let appSettings = loadSettings();

// Retorna o caminho absoluto do ícone compatível com ambiente de dev e empacotado (.asar)
function getAppIconPath() {
  const candidates = [
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'app.asar.unpacked/dist/icon.ico'),
    path.join(process.resourcesPath, 'app.asar.unpacked/electron/icon.ico')
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return null;
}

function showAndFocusWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('app:resume');
}

function hideWindowToTray() {
  if (!mainWindow) return;
  if (!tray || tray.isDestroyed()) {
    createTray();
  }
  mainWindow.hide();
  mainWindow.webContents.send('app:standby');
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    hideWindowToTray();
  } else {
    showAndFocusWindow();
  }
}

function toggleWindowFromShortcut() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    hideWindowToTray();
  } else {
    showAndFocusWindow();
    mainWindow.webContents.send('app:shortcut-open');
  }
}

function applyGlobalShortcut(shortcutKey, overlayKey) {
  try {
    globalShortcut.unregisterAll();
    const appKey = shortcutKey || appSettings.globalShortcut;
    if (appKey && appKey !== 'none') {
      const registered = globalShortcut.register(appKey, () => {
        toggleWindowFromShortcut();
      });
      if (!registered) {
        console.warn(`Falha ao registrar atalho global: ${appKey}`);
      }
    }

    // Registra atalho configurável do In-Game Overlay
    const activeOverlayKey = overlayKey || appSettings.overlayShortcut || 'Alt+O';
    if (activeOverlayKey && activeOverlayKey !== 'none') {
      const overlayRegistered = globalShortcut.register(activeOverlayKey, () => {
        toggleOverlayWindow();
      });
      if (!overlayRegistered) {
        console.warn(`Falha ao registrar atalho global ${activeOverlayKey} para o Overlay.`);
      }
    }
  } catch (err) {
    console.error(`Erro ao registrar atalhos globais:`, err);
  }
}

function applyStartupSettings(openAtLogin, startMinimized) {
  try {
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: Boolean(openAtLogin),
        openAsHidden: Boolean(startMinimized),
        args: startMinimized ? ['--hidden'] : []
      });
    }
  } catch (e) {
    console.error('Erro ao definir startup settings:', e);
  }
}

function getHelperExePath() {
  const candidates = [
    path.join(__dirname, 'bin', 'get_window_pid.exe'),
    path.join(process.resourcesPath || '', 'bin', 'get_window_pid.exe'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'electron', 'bin', 'get_window_pid.exe'),
    path.join(__dirname, '..', 'electron', 'bin', 'get_window_pid.exe')
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return null;
}

// ==========================================
// CONTADOR DE TEMPO DE JOGO DO GAMER'S HUB
// ==========================================
const PLAYTIMES_FILE = path.join(app.getPath('userData'), 'gamer_vault_playtimes.json');

function normalizeGameKey(titleOrGame) {
  const title = typeof titleOrGame === 'object' ? (titleOrGame.title || titleOrGame.id || '') : String(titleOrGame || '');
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'game';
}

function loadPlaytimes() {
  try {
    if (fs.existsSync(PLAYTIMES_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYTIMES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro ao carregar playtimes:', e);
  }
  return {};
}

function savePlaytimes(data) {
  try {
    fs.writeFileSync(PLAYTIMES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar playtimes:', e);
  }
}

function accumulateGamePlaytime(game, forceSeconds = null) {
  if (!game || !game.title) return null;
  const key = normalizeGameKey(game.title);
  const playtimes = loadPlaytimes();
  const currentRecord = playtimes[key] || {
    title: game.title,
    totalSeconds: 0,
    lastPlayed: Date.now()
  };

  const now = Date.now();
  let addedSeconds = 0;
  if (forceSeconds !== null) {
    addedSeconds = forceSeconds;
  } else {
    const lastSaved = game.lastSavedAt || game.startedAt || now;
    addedSeconds = Math.max(0, Math.floor((now - lastSaved) / 1000));
    game.lastSavedAt = now;
  }

  if (addedSeconds > 0) {
    currentRecord.totalSeconds = (currentRecord.totalSeconds || 0) + addedSeconds;
    currentRecord.lastPlayed = now;
    currentRecord.title = game.title;
    playtimes[key] = currentRecord;
    savePlaytimes(playtimes);
  }

  const sessionSeconds = Math.max(0, Math.floor((now - (game.startedAt || now)) / 1000));
  const updatePayload = {
    gameKey: key,
    title: game.title,
    sessionSeconds,
    totalSeconds: currentRecord.totalSeconds
  };

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('hub:playtime-updated', updatePayload);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hub:playtime-updated', updatePayload);
  }

  return updatePayload;
}

function getOverlayHwnd() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return '0';
  try {
    const handleBuf = overlayWindow.getNativeWindowHandle();
    if (process.arch === 'x64' || process.arch === 'arm64') {
      return handleBuf.readBigInt64LE().toString();
    }
    return handleBuf.readInt32LE().toString();
  } catch (_) {
    return '0';
  }
}

function applyOverlayNoActivate() {
  if (process.platform !== 'win32') return;
  const helperPath = getHelperExePath();
  if (!helperPath || !fs.existsSync(helperPath)) return;
  const hwnd = getOverlayHwnd();
  if (!hwnd || hwnd === '0') return;
  try {
    const { execFile } = require('child_process');
    execFile(helperPath, ['--set-noactivate', String(hwnd)], { timeout: 2500 }, (err) => {
      if (!err) {
        console.log(`[GamerVault] WS_EX_NOACTIVATE aplicado com sucesso na janela do Overlay (HWND: ${hwnd})`);
      }
    });
  } catch (err) {
    console.warn('[GamerVault] Erro ao aplicar WS_EX_NOACTIVATE no overlay:', err?.message);
  }
}

function getOverlayBounds(mode = overlayMode, isNotes = overlayIsNotesExpanded) {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x: displayX, y: displayY, width: screenWidth, height: screenHeight } = primaryDisplay.workArea;
    const corner = appSettings.overlayFpsPosition || 'top-right';

    if (mode === 'compact') {
      const width = 92;
      const height = 30;
      const margin = 16;
      let x = displayX + screenWidth - width - margin;
      let y = displayY + margin;

      if (corner === 'top-left') {
        x = displayX + margin;
        y = displayY + margin;
      } else if (corner === 'bottom-left') {
        x = displayX + margin;
        y = displayY + screenHeight - height - margin;
      } else if (corner === 'bottom-right') {
        x = displayX + screenWidth - width - margin;
        y = displayY + screenHeight - height - margin;
      }

      return { x: Math.round(x), y: Math.round(y), width, height };
    } else {
      // Expanded HUD (Espaçoso, 780px para comportar todos os botões e contadores sem aperto)
      const width = 780;
      const height = isNotes ? 480 : 58;
      const x = displayX + Math.round((screenWidth - width) / 2);
      const y = displayY + 16;
      return { x: Math.round(x), y: Math.round(y), width, height };
    }
  } catch (e) {
    return { x: 100, y: 16, width: 780, height: 58 };
  }
}

function updateOverlayBounds() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  try {
    const bounds = getOverlayBounds(overlayMode, overlayIsNotesExpanded);
    overlayWindow.setBounds(bounds);
  } catch (err) {
    console.error('Erro ao atualizar bounds do overlay:', err);
  }
}

function setOverlayMode(newMode) {
  overlayMode = newMode;
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (newMode === 'hidden') {
    overlayUserWantedVisible = false;
    overlayWindow.hide();
    const helperPath = getHelperExePath();
    if (helperPath && fs.existsSync(helperPath) && (activeGameHwnd || activeGamePid)) {
      try {
        const { execFile } = require('child_process');
        execFile(helperPath, ['--focus-game', String(activeGameHwnd || 0), String(activeGamePid || 0)], { timeout: 1500 }, () => {});
      } catch (_) {}
    }
  } else {
    overlayUserWantedVisible = true;
    if (newMode === 'compact') {
      overlayIsNotesExpanded = false;
      try {
        overlayWindow.setFocusable(false);
        // MODO FPS COMPACTO: 100% IMPOSSÍVEL DE SER CLICADO (CLICK-THROUGH)
        // Todos os cliques do mouse passam direto para o jogo sem desviar foco!
        overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      } catch (_) {}
    } else {
      // MODO EXPANDIDO: Permite cliques do mouse nos botões do HUD
      try {
        overlayWindow.setIgnoreMouseEvents(false);
      } catch (_) {}
    }
    updateOverlayBounds();
    if (!overlayWindow.isVisible()) {
      overlayWindow.showInactive();
    }
    applyOverlayNoActivate();
  }

  overlayWindow.webContents.send('overlay:mode-changed', overlayMode);
}

function cycleOverlayMode() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
    overlayMode = 'compact';
    setTimeout(() => {
      setOverlayMode('compact');
    }, 200);
    return;
  }

  // Cycle: compact -> expanded -> hidden -> compact
  if (!overlayWindow.isVisible() || overlayMode === 'hidden') {
    setOverlayMode('compact');
  } else if (overlayMode === 'compact') {
    setOverlayMode('expanded');
  } else if (overlayMode === 'expanded') {
    setOverlayMode('hidden');
  } else {
    setOverlayMode('compact');
  }
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return;

  try {
    const bounds = getOverlayBounds(overlayMode, overlayIsNotesExpanded);

    overlayWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
      focusable: false, // Inicia como false para NUNCA roubar foco do jogo ao clicar!
      hasShadow: false,
      backgroundColor: '#00000000',
      type: 'toolbar',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false
      }
    });

    try {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch (_) {}

    overlayWindow.webContents.setWindowOpenHandler(() => {
      // NUNCA abre navegadores externos ou janelas que tirem o usuário do jogo!
      return { action: 'deny' };
    });

    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    if (isDev) {
      overlayWindow.loadURL('http://localhost:5173/?overlay=true');
    } else {
      overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { overlay: 'true' } });
    }

    overlayWindow.webContents.on('did-finish-load', () => {
      applyOverlayNoActivate();
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('overlay:mode-changed', overlayMode);
        if (currentActiveGame) {
          overlayWindow.webContents.send('overlay:active-game-changed', currentActiveGame);
        }
      }
    });

    overlayWindow.on('closed', () => {
      overlayWindow = null;
    });
  } catch (err) {
    console.error('Erro ao criar OverlayWindow:', err);
  }
}

function handleGameClosed() {
  if (!currentActiveGame) return;
  console.log(`[GamerVault] Jogo fechado/finalizado: ${currentActiveGame.title}`);

  // Salva o tempo final jogado antes de limpar o estado
  accumulateGamePlaytime(currentActiveGame);

  currentActiveGame = null;
  activeGamePid = null;
  activeGameHwnd = null;
  activeGameProcess = null;
  activeGameLaunchGraceUntil = 0;
  activeGameConsecutiveMissing = 0;
  overlayUserWantedVisible = true;

  if (activeGameWatchdog) {
    clearInterval(activeGameWatchdog);
    activeGameWatchdog = null;
  }

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay:active-game-changed', null);
    overlayWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay:active-game-changed', null);
    mainWindow.webContents.send('vaultcast:force-stop');
  }

  updateTrayMenu();
}

function startActiveGameWatchdog() {
  if (activeGameWatchdog) {
    clearInterval(activeGameWatchdog);
    activeGameWatchdog = null;
  }

  const { execFileSync } = require('child_process');
  let checkCount = 0;

  activeGameWatchdog = setInterval(async () => {
    if (!currentActiveGame) {
      clearInterval(activeGameWatchdog);
      activeGameWatchdog = null;
      return;
    }

    checkCount++;
    const isGracePeriod = Date.now() < activeGameLaunchGraceUntil;
    const helperPath = getHelperExePath();
    const gameTitle = currentActiveGame.title || '';
    const gameDir = currentActiveGame.gameDir || '';

    // 1. Testa se o PID atual continua em execução
    let isPidAlive = false;
    if (activeGamePid) {
      try {
        process.kill(activeGamePid, 0);
        isPidAlive = true;
      } catch (_) {
        isPidAlive = false;
      }
    }

    // 2. Se o PID não está vivo OU se estamos no período inicial procurando o processo real (launcher filho ou janela):
    if ((!isPidAlive || isGracePeriod) && helperPath && fs.existsSync(helperPath)) {
      try {
        const parentPidArg = activeGamePid || 0;
        const res = execFileSync(helperPath, ['--find-game', gameTitle, gameDir, String(parentPidArg)], {
          encoding: 'utf-8',
          timeout: 2500
        });
        const trimmed = (res || '').trim();
        if (trimmed) {
          const parts = trimmed.split('|');
          const foundPid = parseInt(parts[0], 10);
          const foundHwnd = parts.length > 1 ? parseInt(parts[1], 10) : 0;
          if (!isNaN(foundPid) && foundPid > 0) {
            if (activeGamePid !== foundPid) {
              console.log(`[GamerVault] Processo do jogo identificado/migrado: PID ${foundPid} (Anterior: ${activeGamePid}) [${parts[2] || ''}]`);
              activeGamePid = foundPid;
            }
            if (foundHwnd > 0) {
              activeGameHwnd = foundHwnd;
            }
            isPidAlive = true;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback adicional via desktopCapturer caso o helper ainda não tenha capturado
    if (!isPidAlive && !activeGamePid && checkCount > 3) {
      try {
        // thumbnailSize 0x0: evita gerar bitmaps a cada 2.5s (vazamento de memória conhecido do desktopCapturer)
        const sources = await desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: { width: 0, height: 0 },
          fetchWindowIcons: false
        });
        const gameTitleLower = gameTitle.toLowerCase();
        const hasWindow = sources.some(s => {
          const nameLower = (s.name || '').toLowerCase();
          return nameLower.includes(gameTitleLower) || gameTitleLower.includes(nameLower);
        });
        if (hasWindow) {
          isPidAlive = true;
        }
      } catch (_) {}
    }

    // 4. Se o processo está ativo:
    if (isPidAlive) {
      activeGameConsecutiveMissing = 0;

      // Acumula tempo de jogo continuamente no banco de dados local
      accumulateGamePlaytime(currentActiveGame);

      // Verifica se a janela do jogo está em primeiro plano para exibir ou ocultar o Overlay
      // Passando também o HWND do overlay para não ocultar quando o usuário clicar nele!
      if (helperPath && fs.existsSync(helperPath) && (activeGamePid || activeGameHwnd)) {
        try {
          const checkPid = activeGamePid || 0;
          const checkHwnd = activeGameHwnd || 0;
          const overlayHwndVal = getOverlayHwnd() || 0;
          const electronPidVal = process.pid || 0;
          const isFocusedRes = execFileSync(helperPath, ['--is-game-focused', String(checkPid), String(checkHwnd), String(overlayHwndVal), String(electronPidVal)], {
            encoding: 'utf-8',
            timeout: 1500
          });
          const isFocused = (isFocusedRes || '').trim() === '1';

          if (overlayWindow && !overlayWindow.isDestroyed()) {
            if (isFocused && overlayUserWantedVisible && overlayMode !== 'hidden') {
              // Se o jogo está focado e o overlay deve aparecer:
              // showInactive() exibe o HUD sem roubar foco, NÃO minimizando o jogo!
              if (!overlayWindow.isVisible()) {
                updateOverlayBounds();
                overlayWindow.showInactive();
                applyOverlayNoActivate();
              }
            } else if (!isFocused && overlayWindow.isVisible()) {
              // Somente oculta automaticamente se estiver no modo COMPACTO (mini HUD de FPS)
              // No modo EXPANDIDO (HUD completo, Notas, Guia IGN), o overlay NUNCA deve ser ocultado
              // enquanto o jogo estiver aberto, permitindo ao usuário interagir sem sair da tela!
              if (overlayMode === 'compact') {
                overlayWindow.hide();
              }
            }
          }
        } catch (_) {}
      } else {
        // Se não puder checar foco, mas overlay deve iniciar junto com o jogo:
        if (overlayUserWantedVisible && overlayMode !== 'hidden' && overlayWindow && !overlayWindow.isDestroyed() && !overlayWindow.isVisible()) {
          updateOverlayBounds();
          overlayWindow.showInactive();
          applyOverlayNoActivate();
        }
      }
    } else {
      // Se não está vivo:
      if (isGracePeriod) {
        // Ainda no período de carência do launcher (até 60s)
        return;
      }

      activeGameConsecutiveMissing++;
      if (activeGameConsecutiveMissing >= 3) {
        console.log(`[GamerVault] Processo/Janela do jogo finalizado.`);
        handleGameClosed();
      }
    }
  }, 2500);
}

function toggleOverlayWindow() {
  cycleOverlayMode();
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;

  const menuItems = [
    {
      label: "Abrir Gamer's Vault",
      click: () => {
        showAndFocusWindow();
      }
    },
    {
      label: currentActiveGame
        ? `In-Game Overlay (${appSettings.overlayShortcut || 'Alt+O'}) [${currentActiveGame.title}]`
        : `In-Game Overlay (${appSettings.overlayShortcut || 'Alt+O'}) [Requer jogo aberto]`,
      enabled: Boolean(currentActiveGame),
      click: () => {
        toggleOverlayWindow();
      }
    }
  ];

  if (currentActiveCast?.isBroadcasting) {
    menuItems.push({
      label: `🔴 Encerrar Transmissão (${currentActiveCast.gameTitle || 'Live'})`,
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('vaultcast:force-stop');
        }
      }
    });
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Configurações',
      click: () => {
        showAndFocusWindow();
        if (mainWindow) {
          mainWindow.webContents.send('open-settings-modal');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Sair do GamerVault',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function createTray() {
  if (tray && !tray.isDestroyed()) return;

  const iconPath = getAppIconPath();
  if (!iconPath) {
    console.warn('Nenhum arquivo de ícone encontrado para a bandeja do sistema.');
    return;
  }

  try {
    const iconImage = nativeImage.createFromPath(iconPath);
    tray = new Tray(iconImage);
    tray.setToolTip("Gamer's Vault");
    updateTrayMenu();

    tray.on('click', () => {
      toggleWindow();
    });
    tray.on('double-click', () => {
      showAndFocusWindow();
    });
  } catch (e) {
    console.error('Erro ao criar Tray:', e);
  }
}

// ==========================================
// FUNÇÕES AUXILIARES DE SCANNING DO GAME HUB
// ==========================================

function cleanGameTitle(rawName) {
  if (!rawName) return '';
  return rawName
    .replace(/\[.*?\]|\(.*?\)|v\d+(\.\d+)*|build\s*\d+|repack|portable|multi\d+|fitgirl|dodi|elamigos|gog/gi, '')
    .replace(/[._-]/g, ' ')
    .trim();
}

function findPrimaryExe(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return null;
    const blacklist = /unins\w*\.exe|uninstall\.exe|unitycrashhandler.*\.exe|crashreporter.*\.exe|dxwebsetup\.exe|vcredist.*\.exe|setup\.exe|redist.*\.exe|easyanticheat.*\.exe|launcher_helper.*\.exe/i;

    let files = fs.readdirSync(dirPath, { withFileTypes: true });
    let exes = [];

    for (const file of files) {
      if (file.isFile() && file.name.toLowerCase().endsWith('.exe') && !blacklist.test(file.name)) {
        const fullPath = path.join(dirPath, file.name);
        try {
          const stats = fs.statSync(fullPath);
          exes.push({ path: fullPath, name: file.name, size: stats.size });
        } catch (_) {}
      }
    }

    // Se não achou na raiz, busca 1 nível abaixo (ex: bin/, x64/, game/)
    if (exes.length === 0) {
      for (const dir of files) {
        if (dir.isDirectory() && !dir.name.startsWith('.')) {
          const subDirPath = path.join(dirPath, dir.name);
          try {
            const subFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
            for (const subFile of subFiles) {
              if (subFile.isFile() && subFile.name.toLowerCase().endsWith('.exe') && !blacklist.test(subFile.name)) {
                const fullPath = path.join(subDirPath, subFile.name);
                const stats = fs.statSync(fullPath);
                exes.push({ path: fullPath, name: subFile.name, size: stats.size });
              }
            }
          } catch (_) {}
        }
      }
    }

    if (exes.length === 0) return null;
    // O maior executável normalmente é o binário principal do jogo
    exes.sort((a, b) => b.size - a.size);
    return exes[0].path;
  } catch (e) {
    return null;
  }
}

function scanSteamLibrary(steamRoot) {
  const games = [];
  try {
    if (!fs.existsSync(steamRoot)) return games;

    const libraryFolders = new Set();
    libraryFolders.add(steamRoot);

    // Tenta ler libraryfolders.vdf
    const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(vdfPath)) {
      const vdfContent = fs.readFileSync(vdfPath, 'utf8');
      const pathRegex = /"path"\s*"([^"]+)"/g;
      let match;
      while ((match = pathRegex.exec(vdfContent)) !== null) {
        let libPath = match[1].replace(/\\\\/g, '\\');
        if (fs.existsSync(libPath)) {
          libraryFolders.add(libPath);
        }
      }
    }

    // Para cada biblioteca Steam, lê os arquivos appmanifest_*.acf
    for (const lib of libraryFolders) {
      const steamappsDir = path.join(lib, 'steamapps');
      if (!fs.existsSync(steamappsDir)) continue;

      const manifestFiles = fs.readdirSync(steamappsDir).filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));
      for (const mf of manifestFiles) {
        try {
          const content = fs.readFileSync(path.join(steamappsDir, mf), 'utf8');
          const appIdMatch = /"appid"\s*"(\d+)"/.exec(content);
          const nameMatch = /"name"\s*"([^"]+)"/.exec(content);
          const installDirMatch = /"installdir"\s*"([^"]+)"/.exec(content);

          if (appIdMatch && nameMatch) {
            const appId = appIdMatch[1];
            const name = nameMatch[1];
            // Ignora ferramentas e runtimes da Valve
            if (/Steamworks|Proton|Steam Linux Runtime|SteamVR/i.test(name)) continue;

            games.push({
              id: `steam_${appId}`,
              title: name,
              appId,
              platform: 'steam',
              launchType: 'steam_protocol',
              launchTarget: `steam://run/${appId}`,
              headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
              installLocation: installDirMatch ? path.join(steamappsDir, 'common', installDirMatch[1]) : ''
            });
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Erro ao escanear Steam:', err);
  }
  return games;
}

function scanEpicManifests(manifestsDir) {
  const games = [];
  try {
    if (!fs.existsSync(manifestsDir)) return games;
    const files = fs.readdirSync(manifestsDir).filter(f => f.endsWith('.item'));
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(manifestsDir, f), 'utf8');
        const data = JSON.parse(raw);
        if (data.DisplayName && data.AppName && !data.AppName.startsWith('UE_')) {
          games.push({
            id: `epic_${data.AppName}`,
            title: data.DisplayName,
            appName: data.AppName,
            platform: 'epic',
            launchType: 'epic_protocol',
            launchTarget: `com.epicgames.launcher://apps/${encodeURIComponent(data.AppName)}?action=launch&silent=true`,
            installLocation: data.InstallLocation || ''
          });
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error('Erro ao escanear Epic:', err);
  }
  return games;
}

function scanGenericFolder(folderPath, platformName) {
  const games = [];
  try {
    if (!folderPath || !fs.existsSync(folderPath)) return games;
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const fullSubDir = path.join(folderPath, entry.name);
        const primaryExe = findPrimaryExe(fullSubDir);
        const cleanName = cleanGameTitle(entry.name);

        games.push({
          id: `${platformName}_${Buffer.from(entry.name).toString('hex').slice(0, 16)}`,
          title: cleanName || entry.name,
          rawTitle: entry.name,
          platform: platformName,
          launchType: primaryExe ? 'exe' : 'folder',
          launchTarget: primaryExe || fullSubDir,
          installLocation: fullSubDir
        });
      }
    }
  } catch (err) {
    console.error(`Erro ao escanear pasta ${platformName}:`, err);
  }
  return games;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#07080c',
    frame: false, // Barra customizada de alta fidelidade estilo Gamer/Steam
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Facilita carregar embeds e imagens de capas sem bloqueios CORS estritos no app
    },
    icon: getAppIconPath() || undefined
  });

  // Suporte a janelas destacadas (ex: VaultCast Pop-out estilo princípio-e-fim-dnd)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('popout=')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 720,
          height: 480,
          minWidth: 320,
          minHeight: 220,
          autoHideMenuBar: true,
          backgroundColor: '#07090e',
          alwaysOnTop: true,
          frame: true,
          title: "VaultCast AO VIVO // Gamer's Vault",
          icon: getAppIconPath() || undefined,
          webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
          }
        }
      };
    }

    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  // Em modo de desenvolvimento, carrega a URL do Vite
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Despacha deep link inicial caso tenha iniciado via protocolo gamervault://
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingDeepLinkUrl) {
      mainWindow.webContents.send('deep-link:received', pendingDeepLinkUrl);
      pendingDeepLinkUrl = null;
    }
  });

  // Verifica se deve iniciar minimizado na bandeja
  const isHiddenLaunch = process.argv.includes('--hidden') || (appSettings.openAtLogin && appSettings.startMinimized);
  if (isHiddenLaunch) {
    mainWindow.hide();
  }

  // Intercepta fechamento da janela para ir para a bandeja se configurado
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && appSettings.minimizeToTray) {
      event.preventDefault();
      hideWindowToTray();
      return false;
    }
  });

  // Janela maximizada / restaurada IPC
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) {
      if (!app.isQuitting && appSettings.minimizeToTray) {
        hideWindowToTray();
      } else {
        app.isQuitting = true;
        mainWindow.close();
      }
    }
  });

  // Controle de janelas filhas popout (ex: VaultCast)
  ipcMain.on('window-set-size', (event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && width && height) {
      win.setSize(parseInt(width, 10), parseInt(height, 10));
    }
  });

  ipcMain.on('window-set-always-on-top', (event, flag) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setAlwaysOnTop(Boolean(flag));
    }
  });

  ipcMain.on('window-focus-main', () => {
    showAndFocusWindow();
  });

  ipcMain.on('window-close-current', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win !== mainWindow) {
      win.close();
    }
  });

  // Handler para download e execução do instalador da nova versão
  ipcMain.on('start-download-update', async (_event, downloadUrl) => {
    if (!downloadUrl) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-error', 'URL de download não informada.');
      }
      return;
    }

    try {
      const tempDir = app.getPath('temp');
      const updateFilePath = path.join(tempDir, 'GamerVault-Update-Setup.exe');

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Servidor retornou HTTP ${res.status}: ${res.statusText}`);
      }

      const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(updateFilePath);
      const reader = res.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(Buffer.from(value));
        downloadedBytes += value.length;

        const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-progress', {
            percent,
            downloadedBytes,
            totalBytes
          });
        }
      }

      fileStream.end();

      fileStream.on('finish', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-ready', { filePath: updateFilePath });
        }

        // Aguarda 1.5s para o usuário visualizar o feedback de sucesso antes de iniciar o instalador
        setTimeout(() => {
          try {
            const installer = spawn(updateFilePath, [], {
              detached: true,
              stdio: 'ignore'
            });
            installer.unref();

            // Encerra o GamerVault para liberar arquivos e permitir a instalação limpa
            app.quit();
          } catch (execErr) {
            console.error('Erro ao executar instalador:', execErr);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-download-error', 'Falha ao iniciar o instalador: ' + execErr.message);
            }
          }
        }, 1500);
      });

      fileStream.on('error', (fsErr) => {
        console.error('Erro ao gravar arquivo temporário:', fsErr);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-download-error', fsErr.message);
        }
      });

    } catch (err) {
      console.error('Erro no fluxo de download da atualização:', err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-error', err.message);
      }
    }
  });

  // ==========================================
  // GAME HUB: FUNÇÕES E IPC HANDLERS
  // ==========================================

  // Diálogo nativo para selecionar pasta de coleção
  ipcMain.handle('hub:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecione a pasta de jogos da coleção'
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Diálogo nativo para selecionar arquivo (.exe, .lnk, .bat, .cmd, .url ou imagens)
  ipcMain.handle('hub:select-file', async (_event, options = {}) => {
    if (!mainWindow) return null;
    const defaultFilters = [
      { name: 'Jogos e Atalhos (*.exe, *.lnk, *.bat, *.cmd, *.url)', extensions: ['exe', 'lnk', 'bat', 'cmd', 'url'] },
      { name: 'Executáveis (*.exe)', extensions: ['exe'] },
      { name: 'Atalhos do Windows (*.lnk, *.url)', extensions: ['lnk', 'url'] },
      { name: 'Scripts e Launchers (*.bat, *.cmd)', extensions: ['bat', 'cmd'] },
      { name: 'Todos os Arquivos (*.*)', extensions: ['*'] }
    ];

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options.filters || defaultFilters,
      title: options.title || 'Selecione o executável ou atalho do jogo'
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Converte imagem local do Windows para Data URL Base64
  ipcMain.handle('hub:read-image-data', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null;
      const ext = path.extname(filePath).replace('.', '').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      const base64 = fs.readFileSync(filePath).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch (e) {
      console.error('Erro ao ler arquivo de imagem local:', e);
      return null;
    }
  });

  // Escaneamento de jogos por plataforma
  ipcMain.handle('hub:scan-platform', async (_event, { platformId, folderPath }) => {
    try {
      if (platformId === 'steam') {
        const steamDir = folderPath || 'C:\\Program Files (x86)\\Steam';
        return scanSteamLibrary(steamDir);
      }
      if (platformId === 'epic') {
        const epicDir = folderPath || 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
        return scanEpicManifests(epicDir);
      }
      // 'gamepass', 'ea_ubisoft', 'suspeitos' ou personalizadas
      return scanGenericFolder(folderPath, platformId);
    } catch (scanErr) {
      console.error(`Erro ao escanear plataforma ${platformId}:`, scanErr);
      return [];
    }
  });

  // Disparo / Inicialização do jogo
  ipcMain.handle('hub:launch-game', async (_event, { launchType, launchTarget, title, platform, imageUrl }) => {
    try {
      if (!launchTarget) throw new Error('Caminho ou alvo do jogo não informado.');

      const cleanTitle = cleanGameTitle(title || path.basename(launchTarget, path.extname(launchTarget)));
      let gameDir = '';
      try {
        if (fs.existsSync(launchTarget)) {
          const stat = fs.statSync(launchTarget);
          gameDir = stat.isFile() ? path.dirname(launchTarget) : launchTarget;
        }
      } catch (_) {}

      currentActiveGame = {
        title: title || cleanTitle,
        cleanTitle,
        launchTarget,
        launchType,
        platform: platform || 'custom',
        imageUrl: imageUrl || null,
        gameDir,
        startedAt: Date.now(),
        lastSavedAt: Date.now()
      };

      activeGamePid = null;
      activeGameHwnd = null;
      activeGameConsecutiveMissing = 0;
      activeGameLaunchGraceUntil = Date.now() + 60000; // 60 segundos de tolerância para launchers / splash screens
      overlayMode = 'compact';
      overlayUserWantedVisible = true; // Inicia junto com o jogo no modo compacto de FPS

      updateTrayMenu();

      if (overlayWindow && !overlayWindow.isDestroyed()) {
        updateOverlayBounds();
        overlayWindow.webContents.send('overlay:mode-changed', 'compact');
        overlayWindow.webContents.send('overlay:active-game-changed', currentActiveGame);
        overlayWindow.showInactive();
        applyOverlayNoActivate();
      } else {
        createOverlayWindow();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('overlay:active-game-changed', currentActiveGame);
      }

      if (launchType === 'steam_protocol' || launchType === 'epic_protocol') {
        startActiveGameWatchdog();
        await shell.openExternal(launchTarget);
        return { success: true };
      }

      if (launchType === 'exe') {
        if (!fs.existsSync(launchTarget)) {
          throw new Error(`Executável não encontrado em: ${launchTarget}`);
        }
        const cwd = path.dirname(launchTarget);
        const child = spawn(launchTarget, [], {
          cwd,
          detached: true,
          stdio: 'ignore'
        });

        activeGameProcess = child;
        activeGamePid = child.pid;
        child.unref();

        startActiveGameWatchdog();
        return { success: true };
      }

      // Se for arquivo de script (.bat / .cmd)
      if (launchType === 'bat' || launchTarget.toLowerCase().endsWith('.bat') || launchTarget.toLowerCase().endsWith('.cmd')) {
        const cwd = path.dirname(launchTarget);
        const child = spawn('cmd.exe', ['/c', launchTarget], {
          cwd,
          detached: true,
          stdio: 'ignore'
        });

        activeGameProcess = child;
        activeGamePid = child.pid;
        child.unref();

        startActiveGameWatchdog();
        return { success: true };
      }

      // Se for atalho do Windows (.lnk, .url), pasta ou arquivo genérico
      startActiveGameWatchdog();
      const openResult = await shell.openPath(launchTarget);
      if (openResult) {
        throw new Error(openResult);
      }
      return { success: true };
    } catch (err) {
      console.error('Erro ao iniciar jogo pelo Hub:', err);
      return { success: false, error: err.message };
    }
  });

  // ==========================================
  // VAULTCAST: CAPTURA NATIVA DE TELAS, JANELAS E ÁUDIO POR PROCESSO
  // ==========================================
  let loopbackModule = null;
  try {
    loopbackModule = require('loopback-capture');
  } catch (lkErr) {
    console.warn('Módulo loopback-capture indisponível:', lkErr);
  }
  let activeLoopbackCapture = null;

  // Busca instantânea de PID no Windows ao iniciar a live
  function resolveWindowPid(windowId, windowName) {
    if (process.platform !== 'win32') return null;
    const hwndMatch = String(windowId || '').match(/^window:(\d+):/);
    const hwnd = hwndMatch ? parseInt(hwndMatch[1], 10) : 0;
    const cleanName = String(windowName || '').trim();

    const fs = require('fs');
    const { execFileSync } = require('child_process');

    const candidates = [
      path.join(__dirname, 'bin', 'get_window_pid.exe'),
      path.join(process.resourcesPath || '', 'bin', 'get_window_pid.exe'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'electron', 'bin', 'get_window_pid.exe'),
      path.join(__dirname, '..', 'electron', 'bin', 'get_window_pid.exe')
    ];

    for (const helperPath of candidates) {
      if (fs.existsSync(helperPath)) {
        try {
          if (hwnd > 0) {
            const out = execFileSync(helperPath, [String(hwnd)], { encoding: 'utf-8', timeout: 1500 });
            const pid = parseInt(out.trim(), 10);
            if (!isNaN(pid) && pid > 0) {
              console.log(`[VaultCast] PID identificado com sucesso via HWND (${hwnd}): ${pid}`);
              return pid;
            }
          }
          if (cleanName.length > 2) {
            const out = execFileSync(helperPath, [cleanName], { encoding: 'utf-8', timeout: 1500 });
            const pid = parseInt(out.trim(), 10);
            if (!isNaN(pid) && pid > 0) {
              console.log(`[VaultCast] PID identificado com sucesso via Título ("${cleanName}"): ${pid}`);
              return pid;
            }
          }
        } catch (err) {
          console.warn('[VaultCast] Erro ao executar get_window_pid helper:', err.message);
        }
      }
    }

    return null;
  }

  // Listagem instantânea de janelas (sem travamentos de tasklist)
  ipcMain.handle('vaultcast:get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 480, height: 270 },
        fetchWindowIcons: true
      });

      // JPEG é ~10x menor que PNG em base64: reduz o tráfego IPC e a memória retida no renderer
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail && !source.thumbnail.isEmpty()
          ? `data:image/jpeg;base64,${source.thumbnail.toJPEG(70).toString('base64')}`
          : null,
        appIcon: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : null,
        isScreen: source.id.startsWith('screen:')
      }));
    } catch (err) {
      console.error('Erro ao capturar fontes de tela/janela para o VaultCast:', err);
      return [];
    }
  });

  // Listagem leve (sem thumbnails/ícones) usada pelo watchdog da live a cada poucos segundos
  ipcMain.handle('vaultcast:list-source-ids', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false
      });
      return sources.map(source => source.id);
    } catch (err) {
      console.warn('Erro ao listar IDs de fontes do VaultCast:', err);
      return null;
    }
  });

  // Captura exclusiva de áudio do processo selecionado (WASAPI Process Loopback)
  ipcMain.handle('vaultcast:start-process-audio', async (_event, params) => {
    try {
      if (!loopbackModule) throw new Error('Módulo loopback-capture nativo não está disponível.');

      let targetPid = params?.pid ? Number(params.pid) : null;
      if (!targetPid && params?.windowId) {
        targetPid = resolveWindowPid(params.windowId, params.windowName);
      }

      if (!targetPid) {
        throw new Error('Não foi possível identificar o PID do processo desta janela.');
      }

      if (activeLoopbackCapture) {
        try { activeLoopbackCapture.stop(); } catch (_) {}
        activeLoopbackCapture = null;
      }

      const capture = new loopbackModule.LoopbackCapture();
      activeLoopbackCapture = capture;

      capture.start(targetPid, true, (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send('vaultcast:process-audio-chunk', chunk);
        } else {
          stopActiveLoopbackCapture();
        }
      });

      return { success: true, pid: targetPid };
    } catch (err) {
      console.warn('Aviso na captura de áudio por processo:', err.message);
      return { success: false, error: err.message };
    }
  });

  function stopActiveLoopbackCapture() {
    if (!activeLoopbackCapture) return;
    const capture = activeLoopbackCapture;
    activeLoopbackCapture = null;
    try { capture.stop(); } catch (_) {}
  }

  // Garante que a captura nativa WASAPI morra junto com o renderer (crash, reload ou fechamento)
  mainWindow.webContents.on('render-process-gone', stopActiveLoopbackCapture);
  mainWindow.webContents.on('destroyed', stopActiveLoopbackCapture);
  mainWindow.webContents.on('did-start-navigation', (_e, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) stopActiveLoopbackCapture();
  });
  app.once('will-quit', stopActiveLoopbackCapture);

  ipcMain.handle('vaultcast:stop-process-audio', async () => {
    try {
      stopActiveLoopbackCapture();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Geração segura de token do LiveKit SFU
  ipcMain.handle('livekit:generate-token', async (_event, { apiKey, apiSecret, roomName, identity, isPublisher }) => {
    try {
      if (!apiKey || !apiSecret || !roomName) {
        throw new Error('Chaves do LiveKit ou nome da sala não informados.');
      }
      const at = new AccessToken(apiKey, apiSecret, {
        identity: identity || 'anonymous',
        ttl: '6h'
      });
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: Boolean(isPublisher),
        canSubscribe: true,
        canPublishData: true
      });
      const token = await at.toJwt();
      return { success: true, token };
    } catch (err) {
      console.error('Erro ao gerar token do LiveKit:', err);
      return { success: false, error: err.message };
    }
  });

  // Encerramento forçado e limpeza da sala na nuvem do LiveKit SFU
  ipcMain.handle('livekit:delete-room', async (_event, { url, apiKey, apiSecret, roomName }) => {
    try {
      const livekitUrl = (url || getEnvVar('VITE_LIVEKIT_URL') || 'https://gamervault-tdvn6w33.livekit.cloud').replace('wss://', 'https://');
      const key = apiKey || getEnvVar('VITE_LIVEKIT_API_KEY');
      const secret = apiSecret || getEnvVar('VITE_LIVEKIT_API_SECRET');

      if (!key || !secret || !roomName) {
        console.warn('livekit:delete-room abortado: parâmetros incompletos', { key: Boolean(key), secret: Boolean(secret), roomName });
        return { success: false, error: 'Parâmetros insuficientes' };
      }

      const svc = new RoomServiceClient(livekitUrl, key, secret);
      await svc.deleteRoom(roomName);
      console.log(`[LiveKit SFU] Sala '${roomName}' encerrada com sucesso no LiveKit Cloud.`);
      return { success: true };
    } catch (err) {
      console.warn(`[LiveKit SFU] Falha ao encerrar sala '${roomName}' (pode já estar fechada):`, err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  });

  // Notificação de estado da live para atualizar o System Tray e o In-Game Overlay
  ipcMain.on('vaultcast:broadcast-state', (_event, state) => {
    currentActiveCast = state;
    updateTrayMenu();
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('vaultcast:broadcast-state', state);
    }
  });

  // Disparo de Live a partir do In-Game Overlay
  ipcMain.on('overlay:request-start-live', (_event, game) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vaultcast:trigger-start-live', game || currentActiveGame);
    }
  });

  ipcMain.on('overlay:request-stop-live', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vaultcast:force-stop');
    }
  });

  // ==========================================
  // IN-GAME OVERLAY & GAME NOTES IPC
  // ==========================================
  const NOTES_DIR = path.join(app.getPath('userData'), 'game_notes');
  if (!fs.existsSync(NOTES_DIR)) {
    try { fs.mkdirSync(NOTES_DIR, { recursive: true }); } catch (_) {}
  }

  ipcMain.handle('overlay:get-active-game', async () => {
    return currentActiveGame;
  });

  ipcMain.handle('overlay:get-game-notes', async (_event, gameKey) => {
    try {
      if (!gameKey) return '';
      const safeKey = String(gameKey).replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
      const filePath = path.join(NOTES_DIR, `${safeKey}.txt`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (e) {
      console.error('Erro ao ler notas do jogo:', e);
    }
    return '';
  });

  ipcMain.handle('overlay:save-game-notes', async (_event, { gameKey, content }) => {
    try {
      if (!gameKey) return { success: false };
      const safeKey = String(gameKey).replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
      const filePath = path.join(NOTES_DIR, `${safeKey}.txt`);
      fs.writeFileSync(filePath, content || '', 'utf-8');
      return { success: true };
    } catch (e) {
      console.error('Erro ao salvar notas do jogo:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('overlay:get-mode', async () => {
    return overlayMode;
  });

  ipcMain.on('overlay:set-mode', (_event, mode) => {
    setOverlayMode(mode);
  });

  ipcMain.on('overlay:cycle-mode', () => {
    cycleOverlayMode();
  });

  ipcMain.on('overlay:set-expanded', (_event, isExpanded) => {
    overlayIsNotesExpanded = Boolean(isExpanded);
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (overlayIsNotesExpanded) {
        try { overlayWindow.setFocusable(true); } catch (_) {}
      } else {
        try { overlayWindow.setFocusable(false); } catch (_) {}
      }
    }
    updateOverlayBounds();
    applyOverlayNoActivate();
  });

  ipcMain.on('overlay:hide', () => {
    setOverlayMode('hidden');
  });

  ipcMain.on('overlay:focus', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.focus();
    }
  });

  ipcMain.on('overlay:focus-game', () => {
    const helperPath = getHelperExePath();
    if (!helperPath || !fs.existsSync(helperPath)) return;
    try {
      const { execFile } = require('child_process');
      const targetHwnd = activeGameHwnd || 0;
      const targetPid = activeGamePid || 0;
      execFile(helperPath, ['--focus-game', String(targetHwnd), String(targetPid)], { timeout: 1500 }, () => {});
    } catch (_) {}
  });

  ipcMain.on('overlay:toggle', () => {
    cycleOverlayMode();
  });

  // ==========================================
  // PLAYTIMES IPC (TEMPO DE JOGO DO GAMER'S HUB)
  // ==========================================
  ipcMain.handle('hub:get-playtimes', async () => {
    return loadPlaytimes();
  });

  ipcMain.handle('hub:get-game-playtime', async (_event, gameTitle) => {
    if (!gameTitle) return { totalSeconds: 0 };
    const key = normalizeGameKey(gameTitle);
    const playtimes = loadPlaytimes();
    return playtimes[key] || { totalSeconds: 0, title: gameTitle };
  });

  ipcMain.handle('hub:update-game-playtime', async (_event, { gameTitle, totalSeconds }) => {
    if (!gameTitle) return { success: false };
    const key = normalizeGameKey(gameTitle);
    const playtimes = loadPlaytimes();
    playtimes[key] = {
      ...(playtimes[key] || {}),
      title: gameTitle,
      totalSeconds: Number(totalSeconds) || 0,
      lastPlayed: Date.now()
    };
    savePlaytimes(playtimes);

    const updatePayload = {
      gameKey: key,
      title: gameTitle,
      totalSeconds: Number(totalSeconds) || 0
    };
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hub:playtime-updated', updatePayload);
    }
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('hub:playtime-updated', updatePayload);
    }
    return { success: true };
  });

  // ==========================================
  // CONFIGURAÇÕES IPC (SETTINGS)
  // ==========================================
  ipcMain.handle('settings:get', async () => {
    return appSettings;
  });

  ipcMain.handle('settings:save', async (_event, newSettings) => {
    appSettings = { ...appSettings, ...newSettings };
    saveSettings(appSettings);
    applyStartupSettings(appSettings.openAtLogin, appSettings.startMinimized);
    applyGlobalShortcut(appSettings.globalShortcut, appSettings.overlayShortcut);
    updateOverlayBounds();
    updateTrayMenu();
    return { success: true, settings: appSettings };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Corrige o Erro 150/153 do YouTube no Electron ao rodar empacotado (file://)
  // Injeta headers de Referer e Origin válidos exigidos pelo YouTube para embeds
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'https://www.youtube-nocookie.com';
      details.requestHeaders['Referer'] = 'https://www.youtube-nocookie.com/';
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  createWindow();
  createOverlayWindow();
  createTray();
  applyGlobalShortcut(appSettings.globalShortcut);
  applyStartupSettings(appSettings.openAtLogin, appSettings.startMinimized);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showAndFocusWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy();
    } catch (_) {}
  }
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!appSettings.minimizeToTray || app.isQuitting) {
      app.quit();
    }
  }
});
