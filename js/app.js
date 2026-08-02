/**
 * Main Application Orchestrator for Calculadora para Impresión 3D by Juan Pablo Sánchez
 * Features: Calibrated LATAM & ARS Pricing Engine, Per-Gram Rate Mode ($80/g), Real Market Multipliers (1.5x, 2.0x, 2.5x, 3.0x), Stylized 3D Web Representations & Native 3D Space Drag/Directional Pan Controls.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons safely
  try {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide icons init warning:', e);
  }

  // Safe Listener Helper
  function safeListen(el, event, handler) {
    if (el) {
      el.addEventListener(event, handler);
    }
  }

  // State Management
  const state = {
    currentCurrency: 'ARS',
    theme: 'dark',
    baseVolumeCm3: 0,
    baseAreaCm2: 0,
    baseDimensions: { x: 0, y: 0, z: 0 },
    volumeCm3: 0,
    areaCm2: 0,
    dimensions: { x: 0, y: 0, z: 0 },
    scalePercent: 100,
    customWeight: false,
    customTime: false,
    pricingMode: 'multiplier', // 'multiplier', 'margin', or 'per_gram'
    priceMultiplier: 2.0,
    profitMarginPercent: 50,
    pricePerGramRate: 80,
    modelTitle: 'Pieza Impresión 3D',
    importedFiles: []
  };

  const settings = (typeof StorageManager !== 'undefined') ? StorageManager.getSettings() : null;

  // Initialize 3D Viewer safely
  let viewer = null;
  try {
    if (typeof ModelViewer3D !== 'undefined') {
      viewer = new ModelViewer3D('viewer-container');
    }
  } catch (e) {
    console.warn('WebGL init error:', e);
  }

  // DOM Elements
  const elements = {
    // Header & Theme
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    themeBtnText: document.getElementById('theme-btn-text'),
    currencySelect: document.getElementById('currency-select'),

    // Tabs
    tabStl: document.getElementById('tab-stl'),
    tabUrl: document.getElementById('tab-url'),
    panelStl: document.getElementById('panel-stl'),
    panelUrl: document.getElementById('panel-url'),
    dropzone: document.getElementById('dropzone'),
    stlFileInput: document.getElementById('stl-file-input'),
    modelUrlInput: document.getElementById('model-url-input'),
    btnImportUrl: document.getElementById('btn-import-url'),
    importedBanner: document.getElementById('imported-model-banner'),
    importedTitle: document.getElementById('imported-title'),
    importedSource: document.getElementById('imported-source'),
    btnOpenMultiModal: document.getElementById('btn-open-multi-modal'),

    // Printer & Support Select
    printerSelect: document.getElementById('printer-select'),
    supportSelect: document.getElementById('support-select'),

    // Scale Controls
    scaleInput: document.getElementById('scale-input'),
    scaleValLabel: document.getElementById('scale-val-label'),

    // Aesthetic Rotation Sliders & Toolbar
    btnAutoRotate: document.getElementById('btn-auto-rotate'),
    rotAngleX: document.getElementById('rot-angle-x'),
    rotAngleY: document.getElementById('rot-angle-y'),
    rotAngleZ: document.getElementById('rot-angle-z'),

    // Viewer Mode & Directional Buttons
    btnModeRotate: document.getElementById('btn-mode-rotate'),
    btnModePan: document.getElementById('btn-mode-pan'),
    btnPanLeft: document.getElementById('btn-pan-left'),
    btnPanRight: document.getElementById('btn-pan-right'),
    btnPanUp: document.getElementById('btn-pan-up'),
    btnPanDown: document.getElementById('btn-pan-down'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),

    // Parameter Sub-Tabs
    tabParamMat: document.getElementById('tab-param-mat'),
    tabParamOps: document.getElementById('tab-param-ops'),
    panelParamMat: document.getElementById('panel-param-mat'),
    panelParamOps: document.getElementById('panel-param-ops'),

    // Rotation Toolbar
    btnRotateX: document.getElementById('btn-rotate-x'),
    btnRotateY: document.getElementById('btn-rotate-y'),
    btnRotateZ: document.getElementById('btn-rotate-z'),

    // Viewer Toolbar & Badges
    viewerStatus: document.getElementById('viewer-status'),
    viewerSimBadge: document.getElementById('viewer-sim-badge'),
    btnResetCam: document.getElementById('btn-reset-cam'),
    btnWireframe: document.getElementById('btn-wireframe'),

    // Modal
    multiModal: document.getElementById('multi-stl-modal'),
    modalStlTitle: document.getElementById('modal-stl-title'),
    modalStlSub: document.getElementById('modal-stl-sub'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalSelectAllBtn: document.getElementById('modal-select-all-btn'),
    modalFileList: document.getElementById('modal-file-list'),

    // Stats
    statDim: document.getElementById('stat-dim'),
    statVol: document.getElementById('stat-vol'),
    statWeight: document.getElementById('stat-weight'),

    // Controls
    materialSelect: document.getElementById('material-select'),
    spoolPrice: document.getElementById('spool-price'),
    infillRange: document.getElementById('infill-range'),
    infillValLabel: document.getElementById('infill-val-label'),
    weightInput: document.getElementById('weight-input'),
    timeHours: document.getElementById('time-hours'),
    timeMins: document.getElementById('time-mins'),

    // Advanced Controls
    printerWatts: document.getElementById('printer-watts'),
    kwhPrice: document.getElementById('kwh-price'),
    wearRate: document.getElementById('wear-rate'),
    laborTime: document.getElementById('labor-time'),
    laborRate: document.getElementById('labor-rate'),
    failureRate: document.getElementById('failure-rate'),

    // Pricing Mode & Multiplier Controls
    tabModeMult: document.getElementById('tab-mode-mult'),
    tabModeGram: document.getElementById('tab-mode-gram'),
    tabModePercent: document.getElementById('tab-mode-percent'),
    panelModeMult: document.getElementById('panel-mode-mult'),
    panelModeGram: document.getElementById('panel-mode-gram'),
    panelModePercent: document.getElementById('panel-mode-percent'),
    multRange: document.getElementById('mult-range'),
    multValLabel: document.getElementById('mult-val-label'),
    gramRateInput: document.getElementById('gram-rate-input'),
    gramValLabel: document.getElementById('gram-val-label'),
    marginRange: document.getElementById('margin-range'),
    marginValLabel: document.getElementById('margin-val-label'),
    summaryCostTotal: document.getElementById('summary-cost-total'),
    summaryNetProfit: document.getElementById('summary-net-profit'),
    resSellingPrice: document.getElementById('res-selling-price'),
    resNetProfit: document.getElementById('res-net-profit'),
    resCostMat: document.getElementById('res-cost-mat'),
    resCostElec: document.getElementById('res-cost-elec'),
    resCostWear: document.getElementById('res-cost-wear'),
    resCostLabor: document.getElementById('res-cost-labor'),
    resCostRisk: document.getElementById('res-cost-risk'),
    resCostTotal: document.getElementById('res-cost-total'),

    // Visual Bars
    barMaterial: document.getElementById('bar-material'),
    barElec: document.getElementById('bar-elec'),
    barWear: document.getElementById('bar-wear'),
    barLabor: document.getElementById('bar-labor'),
    barRisk: document.getElementById('bar-risk'),

    // Actions & Buttons
    btnCopyQuote: document.getElementById('btn-copy-quote'),
    btnResetAll: document.getElementById('btn-reset-all'),
    currTag1: document.getElementById('curr-tag-1'),
    currTag2: document.getElementById('curr-tag-2'),
    currTag3: document.getElementById('curr-tag-3'),
    currTag4: document.getElementById('curr-tag-4'),
    currTagGram: document.getElementById('curr-tag-gram'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg')
  };

  // Helper: decode Base64 to ArrayBuffer
  function base64ToArrayBuffer(base64Str) {
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // 1. Theme Switcher
  function applyTheme(newTheme) {
    state.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    if (viewer) {
      viewer.setTheme(newTheme);
    }
    if (elements.themeBtnText) {
      elements.themeBtnText.textContent = newTheme === 'dark' ? 'Claro' : 'Oscuro';
    }
    if (elements.themeIcon) {
      elements.themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
      try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      } catch (e) {}
    }
  }

  safeListen(elements.btnThemeToggle, 'click', () => {
    const targetTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(targetTheme);
    recalculate();
    showToast(`Tema ${targetTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`);
  });

  // 3D Viewer Controls Mode Switcher (Rotate vs Pan vs Directional Buttons)
  safeListen(elements.btnModeRotate, 'click', () => {
    if (elements.btnModeRotate) elements.btnModeRotate.classList.add('active');
    if (elements.btnModePan) elements.btnModePan.classList.remove('active');
    if (viewer) viewer.setControlMode('rotate');
    showToast('Modo Rotar activado (Arrastra para girar)');
  });

  safeListen(elements.btnModePan, 'click', () => {
    if (elements.btnModePan) elements.btnModePan.classList.add('active');
    if (elements.btnModeRotate) elements.btnModeRotate.classList.remove('active');
    if (viewer) viewer.setControlMode('pan');
    showToast('Modo Mover Espacio activado (Arrastra para desplazar vista)');
  });

  safeListen(elements.btnPanLeft, 'click', () => { if (viewer) viewer.panCamera(-15, 0); });
  safeListen(elements.btnPanRight, 'click', () => { if (viewer) viewer.panCamera(15, 0); });
  safeListen(elements.btnPanUp, 'click', () => { if (viewer) viewer.panCamera(0, 15); });
  safeListen(elements.btnPanDown, 'click', () => { if (viewer) viewer.panCamera(0, -15); });

  safeListen(elements.btnZoomIn, 'click', () => { if (viewer) viewer.zoomCamera(0.85); });
  safeListen(elements.btnZoomOut, 'click', () => { if (viewer) viewer.zoomCamera(1.18); });

  // Printer & Support Preset Event Listeners
  safeListen(elements.printerSelect, 'change', (e) => {
    const key = e.target.value;
    const preset = PRINTER_PRESETS[key] || PRINTER_PRESETS.ender3_v3_se;
    if (key !== 'custom' && elements.printerWatts) {
      elements.printerWatts.value = preset.watts;
    }
    state.customTime = false;
    recalculate();
    showToast(`Impresora: ${preset.name.split(' (')[0]}`);
  });

  safeListen(elements.supportSelect, 'change', () => {
    state.customWeight = false;
    state.customTime = false;
    recalculate();
    showToast('Recalculando material de soporte');
  });

  // Pricing Mode Tabs (Multiplier vs Per-Gram vs Margin)
  function setPricingMode(mode) {
    state.pricingMode = mode;
    
    [elements.tabModeMult, elements.tabModeGram, elements.tabModePercent].forEach(t => t && t.classList.remove('active'));
    [elements.panelModeMult, elements.panelModeGram, elements.panelModePercent].forEach(p => p && p.classList.add('hidden'));

    if (mode === 'per_gram') {
      if (elements.tabModeGram) elements.tabModeGram.classList.add('active');
      if (elements.panelModeGram) elements.panelModeGram.classList.remove('hidden');
    } else if (mode === 'margin') {
      if (elements.tabModePercent) elements.tabModePercent.classList.add('active');
      if (elements.panelModePercent) elements.panelModePercent.classList.remove('hidden');
    } else {
      if (elements.tabModeMult) elements.tabModeMult.classList.add('active');
      if (elements.panelModeMult) elements.panelModeMult.classList.remove('hidden');
    }

    recalculate();
  }

  safeListen(elements.tabModeMult, 'click', () => setPricingMode('multiplier'));
  safeListen(elements.tabModeGram, 'click', () => setPricingMode('per_gram'));
  safeListen(elements.tabModePercent, 'click', () => setPricingMode('margin'));

  // Multiplier Engine
  function setMultiplier(multValue) {
    state.priceMultiplier = parseFloat(multValue) || 2.0;
    if (elements.multRange) elements.multRange.value = state.priceMultiplier;

    document.querySelectorAll('.mult-preset-btn').forEach(btn => {
      const val = parseFloat(btn.getAttribute('data-mult'));
      if (Math.abs(val - state.priceMultiplier) < 0.1) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    let labelText = `${state.priceMultiplier.toFixed(1)}x`;
    if (Math.abs(state.priceMultiplier - 1.5) < 0.1) labelText = '1.5x (Económico)';
    else if (Math.abs(state.priceMultiplier - 2.0) < 0.1) labelText = '2.0x (Estándar)';
    else if (Math.abs(state.priceMultiplier - 2.5) < 0.1) labelText = '2.5x (Comercial)';
    else if (Math.abs(state.priceMultiplier - 3.0) < 0.1) labelText = '3.0x (Premium)';

    if (elements.multValLabel) elements.multValLabel.textContent = labelText;
    recalculate();
  }

  safeListen(elements.multRange, 'input', (e) => {
    setMultiplier(e.target.value);
  });

  document.querySelectorAll('.mult-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMult = parseFloat(btn.getAttribute('data-mult')) || 2.0;
      setMultiplier(targetMult);
    });
  });

  // Per Gram Engine
  function setPerGramRate(rateVal) {
    state.pricePerGramRate = parseFloat(rateVal) || 80;
    if (elements.gramRateInput) elements.gramRateInput.value = state.pricePerGramRate;

    const sym = (typeof CURRENCIES !== 'undefined' && CURRENCIES[state.currentCurrency]) ? CURRENCIES[state.currentCurrency].symbol : '$';
    if (elements.gramValLabel) elements.gramValLabel.textContent = `${sym} ${state.pricePerGramRate} / g`;

    document.querySelectorAll('.gram-preset-btn').forEach(btn => {
      const val = parseFloat(btn.getAttribute('data-rate'));
      if (Math.abs(val - state.pricePerGramRate) < 1) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    recalculate();
  }

  safeListen(elements.gramRateInput, 'input', (e) => {
    setPerGramRate(e.target.value);
  });

  document.querySelectorAll('.gram-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rate = parseFloat(btn.getAttribute('data-rate')) || 80;
      setPerGramRate(rate);
    });
  });

  // Percentage Margin Engine
  safeListen(elements.marginRange, 'input', (e) => {
    state.profitMarginPercent = parseFloat(e.target.value) || 50;
    if (elements.marginValLabel) elements.marginValLabel.textContent = `${state.profitMarginPercent}% (+${state.profitMarginPercent}%)`;
    recalculate();
  });

  // Aesthetic Visual Rotation Listeners
  safeListen(elements.btnAutoRotate, 'click', () => {
    if (viewer) {
      const active = viewer.toggleAutoRotate();
      showToast(active ? 'Auto-rotación estética 360° activada' : 'Auto-rotación pausada');
    }
  });

  const updateVisualAngles = () => {
    if (viewer) {
      const ax = elements.rotAngleX ? parseFloat(elements.rotAngleX.value) || 0 : 0;
      const ay = elements.rotAngleY ? parseFloat(elements.rotAngleY.value) || 0 : 0;
      const az = elements.rotAngleZ ? parseFloat(elements.rotAngleZ.value) || 0 : 0;
      viewer.setVisualRotation(ax, ay, az);
    }
  };

  safeListen(elements.rotAngleX, 'input', updateVisualAngles);
  safeListen(elements.rotAngleY, 'input', updateVisualAngles);
  safeListen(elements.rotAngleZ, 'input', updateVisualAngles);

  // Scale Engine
  function applyScale(percent, showNotification = true) {
    state.scalePercent = Math.max(5, Math.min(1000, percent));
    if (elements.scaleInput) elements.scaleInput.value = state.scalePercent;
    if (elements.scaleValLabel) elements.scaleValLabel.textContent = `${state.scalePercent}%`;

    const factor = state.scalePercent / 100.0;

    if (state.baseVolumeCm3 > 0) {
      state.volumeCm3 = state.baseVolumeCm3 * Math.pow(factor, 3);
      state.areaCm2 = state.baseAreaCm2 * Math.pow(factor, 2);
      state.dimensions = {
        x: state.baseDimensions.x * factor,
        y: state.baseDimensions.y * factor,
        z: state.baseDimensions.z * factor
      };

      if (viewer) {
        viewer.setScale(factor);
      }

      if (elements.statDim) elements.statDim.textContent = `${Math.round(state.dimensions.x)} x ${Math.round(state.dimensions.y)} x ${Math.round(state.dimensions.z)} mm`;
      if (elements.statVol) elements.statVol.textContent = `${state.volumeCm3.toFixed(1)} cm³`;

      recalculate();
      if (showNotification) {
        showToast(`Escala ajustada al ${state.scalePercent}%`);
      }
    }
  }

  safeListen(elements.scaleInput, 'input', (e) => {
    const val = parseFloat(e.target.value) || 100;
    applyScale(val, false);
  });

  document.querySelectorAll('.scale-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetScale = parseFloat(btn.getAttribute('data-scale')) || 100;
      applyScale(targetScale, true);
    });
  });

  // Currency Switching Converter with Realistic Market Defaults
  safeListen(elements.currencySelect, 'change', (e) => {
    const newCurr = e.target.value;
    state.currentCurrency = newCurr;

    if (typeof PrintCalculator !== 'undefined') {
      const defaults = PrintCalculator.getCurrencyDefaults(newCurr);
      if (elements.spoolPrice) elements.spoolPrice.value = defaults.defaultSpool;
      if (elements.kwhPrice) elements.kwhPrice.value = defaults.defaultKwh;
      if (elements.wearRate) elements.wearRate.value = defaults.defaultWear;
      if (elements.laborRate) elements.laborRate.value = defaults.defaultLabor;
      if (elements.failureRate) elements.failureRate.value = 10;
    }

    recalculate();
    showToast(`Parámetros calibrados para ${newCurr}`);
  });

  // Restore stored values
  if (settings) {
    state.currentCurrency = settings.currency || 'ARS';
    state.theme = settings.theme || 'dark';
    state.pricingMode = settings.pricingMode || 'multiplier';
    state.priceMultiplier = settings.priceMultiplier || 2.0;
    state.profitMarginPercent = settings.profitMarginPercent || 50;
    state.pricePerGramRate = settings.pricePerGramRate || 80;
    applyTheme(state.theme);

    if (elements.currencySelect) elements.currencySelect.value = state.currentCurrency;
    if (elements.kwhPrice) elements.kwhPrice.value = settings.kwhPrice || 150;
    if (elements.wearRate) elements.wearRate.value = settings.wearCostPerHour || 80;
    if (elements.printerWatts) elements.printerWatts.value = settings.printerWatts || 200;
    if (elements.laborRate) elements.laborRate.value = settings.laborRatePerHour || 2500;
    if (elements.laborTime) elements.laborTime.value = settings.laborTimeHours || 0.2;
    if (elements.failureRate) elements.failureRate.value = settings.failureRatePercent || 10;
    if (elements.spoolPrice) elements.spoolPrice.value = settings.spoolPrice || 25000;
    if (elements.materialSelect) elements.materialSelect.value = settings.selectedMaterial || 'pla';
    if (elements.infillRange) elements.infillRange.value = settings.infillPercent || 20;
    if (elements.printerSelect && settings.selectedPrinter) elements.printerSelect.value = settings.selectedPrinter;
    if (elements.supportSelect && settings.selectedSupport) elements.supportSelect.value = settings.selectedSupport;

    setMultiplier(state.priceMultiplier);
    setPricingMode(state.pricingMode);
  }

  // Tab Switchers
  safeListen(elements.tabStl, 'click', () => {
    if (elements.tabStl) elements.tabStl.classList.add('active');
    if (elements.tabUrl) elements.tabUrl.classList.remove('active');
    if (elements.panelStl) elements.panelStl.classList.remove('hidden');
    if (elements.panelUrl) elements.panelUrl.classList.add('hidden');
  });

  safeListen(elements.tabUrl, 'click', () => {
    if (elements.tabUrl) elements.tabUrl.classList.add('active');
    if (elements.tabStl) elements.tabStl.classList.remove('active');
    if (elements.panelUrl) elements.panelUrl.classList.remove('hidden');
    if (elements.panelStl) elements.panelStl.classList.add('hidden');
  });

  // Parameter Sub-Tabs
  safeListen(elements.tabParamMat, 'click', () => {
    if (elements.tabParamMat) elements.tabParamMat.classList.add('active');
    if (elements.tabParamOps) elements.tabParamOps.classList.remove('active');
    if (elements.panelParamMat) elements.panelParamMat.classList.remove('hidden');
    if (elements.panelParamOps) elements.panelParamOps.classList.add('hidden');
  });

  safeListen(elements.tabParamOps, 'click', () => {
    if (elements.tabParamOps) elements.tabParamOps.classList.add('active');
    if (elements.tabParamMat) elements.tabParamMat.classList.remove('active');
    if (elements.panelParamOps) elements.panelParamOps.classList.remove('hidden');
    if (elements.panelParamMat) elements.panelParamMat.classList.add('hidden');
  });

  // 3D Viewer Rotations
  const handleRotation = (axis) => {
    if (viewer) {
      const newDims = viewer.rotateAxis(axis, 90);
      if (newDims) {
        state.dimensions = newDims;
        state.baseDimensions = {
          x: newDims.x / (state.scalePercent / 100.0),
          y: newDims.y / (state.scalePercent / 100.0),
          z: newDims.z / (state.scalePercent / 100.0)
        };
        if (elements.statDim) elements.statDim.textContent = `${Math.round(newDims.x)} x ${Math.round(newDims.y)} x ${Math.round(newDims.z)} mm`;
        recalculate();
        showToast(`Rotado 90° en eje ${axis.toUpperCase()}`);
      }
    }
  };

  safeListen(elements.btnRotateX, 'click', () => handleRotation('x'));
  safeListen(elements.btnRotateY, 'click', () => handleRotation('y'));
  safeListen(elements.btnRotateZ, 'click', () => handleRotation('z'));

  let isWireframe = false;
  safeListen(elements.btnWireframe, 'click', () => {
    isWireframe = !isWireframe;
    if (viewer) viewer.setWireframe(isWireframe);
  });

  safeListen(elements.btnResetCam, 'click', () => {
    if (viewer) viewer.resetView();
  });

  // File Dropzone & Local STL Parsing
  safeListen(elements.dropzone, 'click', (e) => {
    if (elements.stlFileInput) {
      elements.stlFileInput.click();
    }
  });

  safeListen(elements.stlFileInput, 'click', (e) => {
    e.stopPropagation();
  });
  
  if (elements.dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      elements.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      elements.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('dragover');
      });
    });

    elements.dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleLocalStlFile(files[0]);
      }
    });
  }

  safeListen(elements.stlFileInput, 'change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleLocalStlFile(e.target.files[0]);
    }
  });

  function handleLocalStlFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.stl')) {
      showToast('Por favor selecciona un archivo con extensión .stl');
      return;
    }

    state.modelTitle = file.name.replace(/\.stl$/i, '');
    showToast(`Analizando ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      processStlBuffer(e.target.result, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function processStlBuffer(buffer, name = 'Modelo 3D') {
    try {
      if (typeof STLParser === 'undefined') {
        throw new Error('STLParser component not found');
      }

      const stlData = STLParser.parse(buffer);
      if (!stlData) throw new Error('Invalid STL buffer data');

      state.baseVolumeCm3 = stlData.volumeCm3;
      state.baseAreaCm2 = stlData.areaCm2;
      state.baseDimensions = Object.assign({}, stlData.dimensions);
      state.scalePercent = 100;
      if (elements.scaleInput) elements.scaleInput.value = 100;
      if (elements.scaleValLabel) elements.scaleValLabel.textContent = '100%';

      state.volumeCm3 = stlData.volumeCm3;
      state.areaCm2 = stlData.areaCm2;
      state.dimensions = stlData.dimensions;

      if (viewer) {
        viewer.loadGeometry(stlData);
      }

      if (elements.statDim) elements.statDim.textContent = `${Math.round(stlData.dimensions.x)} x ${Math.round(stlData.dimensions.y)} x ${Math.round(stlData.dimensions.z)} mm`;
      if (elements.statVol) elements.statVol.textContent = `${stlData.volumeCm3.toFixed(1)} cm³`;
      if (elements.viewerStatus) elements.viewerStatus.textContent = `Modelo: ${name}`;
      if (elements.viewerSimBadge) elements.viewerSimBadge.classList.add('hidden');

      state.customWeight = false;
      state.customTime = false;

      recalculate();
      showToast('¡Modelo analizado y laminado en tiempo real!');
    } catch (err) {
      console.error(err);
      showToast('Error al analizar el archivo STL');
    }
  }

  // URL Importer & Interactive Multi-STL Modal
  const executeUrlImport = async () => {
    const url = elements.modelUrlInput ? elements.modelUrlInput.value : '';
    if (!url || !url.trim()) {
      showToast('Por favor ingresa un enlace válido');
      return;
    }

    if (elements.viewerStatus) elements.viewerStatus.textContent = 'Extrayendo archivos .STL del enlace...';
    showToast('Extrayendo modelo y archivos .STL...');

    try {
      if (typeof ModelImporter === 'undefined') {
        throw new Error('ModelImporter component missing');
      }

      const data = await ModelImporter.importFromUrl(url);
      if (data && data.title) {
        state.modelTitle = data.title;
        if (elements.importedTitle) elements.importedTitle.textContent = data.title;
        if (elements.importedSource) elements.importedSource.textContent = `Origen: ${data.source || 'Web'}`;
        if (elements.importedBanner) elements.importedBanner.classList.remove('hidden');

        state.importedFiles = data.files || [];

        if (state.importedFiles.length > 0) {
          if (elements.btnOpenMultiModal) elements.btnOpenMultiModal.classList.remove('hidden');
          openMultiStlModal();
          loadWebStlFileByIndex(0);
        } else {
          if (elements.btnOpenMultiModal) elements.btnOpenMultiModal.classList.add('hidden');
          showToast('Modelos web importados. Asignando valores promedio...');
          if (state.volumeCm3 === 0) {
            state.baseVolumeCm3 = 45;
            state.volumeCm3 = 45;
            if (elements.statDim) elements.statDim.textContent = `Estimado (~70mm)`;
            if (elements.statVol) elements.statVol.textContent = `~45 cm³`;
            recalculate();
          }
        }
      } else if (data && data.error) {
        showToast(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      showToast('No se pudo extraer la información del enlace');
    }
  };

  safeListen(elements.btnImportUrl, 'click', executeUrlImport);
  safeListen(elements.modelUrlInput, 'keypress', (e) => {
    if (e.key === 'Enter') executeUrlImport();
  });

  safeListen(elements.btnOpenMultiModal, 'click', () => openMultiStlModal());
  safeListen(elements.modalCloseBtn, 'click', () => closeMultiStlModal());

  function openMultiStlModal() {
    if (!state.importedFiles || state.importedFiles.length === 0) return;

    if (elements.modalStlTitle) elements.modalStlTitle.textContent = `Archivos STL Encontrados (${state.importedFiles.length})`;
    if (elements.modalStlSub) elements.modalStlSub.textContent = `¿Qué pieza deseas imprimir en "${state.modelTitle}"?`;

    if (elements.modalFileList) {
      elements.modalFileList.innerHTML = '';

      state.importedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'modal-file-item';
        
        const volText = file.volumeCm3 ? `${file.volumeCm3} cm³` : 'Extraído';
        const weightEst = file.volumeCm3 ? `~${Math.round(file.volumeCm3 * 1.24)}g` : '';

        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <i data-lucide="file-box" style="color: var(--secondary);"></i>
            <div>
              <strong style="display: block; font-size: 0.9rem; color: var(--text-main);">${file.name}</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${volText} ${weightEst ? '• ' + weightEst : ''}</span>
            </div>
          </div>
          <button type="button" class="btn-primary" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.8rem;">
            Cotizar
          </button>
        `;

        item.addEventListener('click', () => {
          closeMultiStlModal();
          loadWebStlFileByIndex(index);
        });

        elements.modalFileList.appendChild(item);
      });
    }

    try {
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch (e) {}

    if (elements.multiModal) elements.multiModal.classList.remove('hidden');
  }

  function closeMultiStlModal() {
    if (elements.multiModal) elements.multiModal.classList.add('hidden');
  }

  safeListen(elements.modalSelectAllBtn, 'click', () => {
    closeMultiStlModal();
    loadAllCombinedWebStl();
  });

  async function loadWebStlFileByIndex(index) {
    const file = state.importedFiles[index];
    if (!file) return;

    if (elements.viewerStatus) elements.viewerStatus.textContent = `Cargando ${file.name}...`;
    showToast(`Cargando ${file.name} en el visor 3D...`);

    let buffer = null;
    try {
      if (file.stlBase64) {
        buffer = base64ToArrayBuffer(file.stlBase64);
      } else if (file.url) {
        buffer = await ModelImporter.fetchStlBuffer(file.url);
      }
    } catch (e) {
      console.warn("Could not fetch raw binary STL for web file:", e);
    }

    if (buffer && buffer.byteLength > 84) {
      processStlBuffer(buffer, file.name);
    } else {
      const procMesh = STLParser.createProceduralMesh(
        file.volumeCm3 || 38.0,
        file.dimensions || { x: 60, y: 60, z: 40 }
      );
      
      state.baseVolumeCm3 = procMesh.volumeCm3;
      state.baseAreaCm2 = procMesh.areaCm2;
      state.baseDimensions = Object.assign({}, procMesh.dimensions);
      state.scalePercent = 100;
      if (elements.scaleInput) elements.scaleInput.value = 100;
      if (elements.scaleValLabel) elements.scaleValLabel.textContent = '100%';

      state.volumeCm3 = procMesh.volumeCm3;
      state.areaCm2 = procMesh.areaCm2;
      state.dimensions = procMesh.dimensions;

      if (viewer) viewer.loadGeometry(procMesh);

      if (elements.statDim) elements.statDim.textContent = `${Math.round(procMesh.dimensions.x)} x ${Math.round(procMesh.dimensions.y)} x ${Math.round(procMesh.dimensions.z)} mm`;
      if (elements.statVol) elements.statVol.textContent = `${procMesh.volumeCm3.toFixed(1)} cm³`;
      if (elements.viewerStatus) elements.viewerStatus.textContent = `Modelo: ${file.name}`;
      if (elements.viewerSimBadge) elements.viewerSimBadge.classList.remove('hidden');

      state.customWeight = false;
      state.customTime = false;
      recalculate();
      showToast(`¡Modelo 3D de "${file.name}" renderizado y listo!`);
    }
  }

  async function loadAllCombinedWebStl() {
    if (!state.importedFiles || state.importedFiles.length === 0) return;

    if (elements.viewerStatus) elements.viewerStatus.textContent = 'Procesando y combinando todos los STL...';
    showToast('Procesando y combinando todos los archivos STL...');

    const buffers = await Promise.all(
      state.importedFiles.map(async f => {
        try {
          if (f.stlBase64) {
            return base64ToArrayBuffer(f.stlBase64);
          } else if (f.url) {
            return await ModelImporter.fetchStlBuffer(f.url);
          }
        } catch (e) {}
        return null;
      })
    );

    let totalVol = 0;
    let totalArea = 0;
    let maxX = 0, maxY = 0, maxZ = 0;
    let combinedPositionsList = [];

    buffers.forEach((buf, idx) => {
      const f = state.importedFiles[idx];
      let parsed = buf ? STLParser.parse(buf) : null;
      if (!parsed && f) {
        parsed = STLParser.createProceduralMesh(f.volumeCm3 || 35, f.dimensions || { x: 50, y: 50, z: 30 });
      }

      if (parsed) {
        totalVol += parsed.volumeCm3;
        totalArea += parsed.areaCm2;
        maxX = Math.max(maxX, parsed.dimensions.x);
        maxY = Math.max(maxY, parsed.dimensions.y);
        maxZ = Math.max(maxZ, parsed.dimensions.z);
        combinedPositionsList.push(parsed.positions);
      }
    });

    const totalLen = combinedPositionsList.reduce((acc, curr) => acc + curr.length, 0);
    const mergedPositions = new Float32Array(totalLen);
    let offset = 0;
    combinedPositionsList.forEach(arr => {
      mergedPositions.set(arr, offset);
      offset += arr.length;
    });

    const mergedStlData = {
      positions: mergedPositions,
      volumeCm3: totalVol,
      areaCm2: totalArea,
      dimensions: { x: maxX, y: maxY, z: maxZ }
    };

    state.baseVolumeCm3 = totalVol;
    state.baseAreaCm2 = totalArea;
    state.baseDimensions = { x: maxX, y: maxY, z: maxZ };
    state.scalePercent = 100;
    if (elements.scaleInput) elements.scaleInput.value = 100;
    if (elements.scaleValLabel) elements.scaleValLabel.textContent = '100%';

    state.volumeCm3 = totalVol;
    state.areaCm2 = totalArea;
    state.dimensions = mergedStlData.dimensions;

    if (viewer) viewer.loadGeometry(mergedStlData);

    if (elements.statDim) elements.statDim.textContent = `${Math.round(maxX)} x ${Math.round(maxY)} x ${Math.round(maxZ)} mm`;
    if (elements.statVol) elements.statVol.textContent = `${totalVol.toFixed(1)} cm³`;
    if (elements.viewerStatus) elements.viewerStatus.textContent = `Modelo: Todos (${state.importedFiles.length} STL combinados)`;
    if (elements.viewerSimBadge) elements.viewerSimBadge.classList.remove('hidden');

    state.customWeight = false;
    state.customTime = false;
    recalculate();
    showToast('¡Todas las piezas combinadas y calculadas!');
  }

  // 3D Preview Color Picker
  document.querySelectorAll('.color-picker-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-picker-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const hexColor = parseInt(dot.getAttribute('data-color'));
      if (viewer) viewer.setColor(hexColor);
    });
  });

  // Inputs Event Listeners
  const inputsToListen = [
    elements.materialSelect,
    elements.spoolPrice,
    elements.infillRange,
    elements.weightInput,
    elements.timeHours,
    elements.timeMins,
    elements.printerWatts,
    elements.kwhPrice,
    elements.wearRate,
    elements.laborTime,
    elements.laborRate,
    elements.failureRate
  ];

  inputsToListen.forEach(inp => {
    safeListen(inp, 'input', (e) => {
      if (e.target === elements.weightInput) state.customWeight = true;
      if (e.target === elements.timeHours || e.target === elements.timeMins) state.customTime = true;
      recalculate();
    });
  });

  // Main Recalculation Engine
  function recalculate() {
    if (typeof PrintCalculator === 'undefined') return;

    const matKey = elements.materialSelect ? elements.materialSelect.value : 'pla';
    const matPreset = (typeof MATERIAL_PRESETS !== 'undefined' && MATERIAL_PRESETS[matKey]) ? MATERIAL_PRESETS[matKey] : { density: 1.24 };
    const infillVal = elements.infillRange ? (parseInt(elements.infillRange.value) || 20) : 20;

    const printerKey = elements.printerSelect ? elements.printerSelect.value : 'ender3_v3_se';
    const printerPreset = (typeof PRINTER_PRESETS !== 'undefined' && PRINTER_PRESETS[printerKey]) ? PRINTER_PRESETS[printerKey] : PRINTER_PRESETS.ender3_v3_se;

    const supportKey = elements.supportSelect ? elements.supportSelect.value : 'none';

    if (elements.infillValLabel) elements.infillValLabel.textContent = `${infillVal}%`;

    if (state.volumeCm3 > 0) {
      const sliceRes = PrintCalculator.estimateSlicing(
        state.volumeCm3,
        state.areaCm2,
        state.dimensions,
        infillVal,
        matPreset.density,
        printerPreset.volumetricSpeed,
        supportKey
      );

      if (!state.customWeight && elements.weightInput) {
        elements.weightInput.value = sliceRes.weightGrams;
      }
      if (!state.customTime && elements.timeHours && elements.timeMins) {
        const h = Math.floor(sliceRes.printTimeHours);
        const m = Math.round((sliceRes.printTimeHours - h) * 60);
        elements.timeHours.value = h;
        elements.timeMins.value = m;
      }
    }

    const weight = elements.weightInput ? (parseFloat(elements.weightInput.value) || 0) : 0;
    if (elements.statWeight) elements.statWeight.textContent = `${weight} g`;

    const hours = elements.timeHours ? (parseFloat(elements.timeHours.value) || 0) : 0;
    const mins = elements.timeMins ? (parseFloat(elements.timeMins.value) || 0) : 0;
    const totalPrintTimeHours = hours + (mins / 60.0);

    const calcParams = {
      weightGrams: weight,
      spoolPrice: elements.spoolPrice ? (parseFloat(elements.spoolPrice.value) || 25000) : 25000,
      spoolWeightGrams: 1000,
      printTimeHours: totalPrintTimeHours,
      printerWatts: elements.printerWatts ? (parseFloat(elements.printerWatts.value) || 200) : 200,
      kwhPrice: elements.kwhPrice ? (parseFloat(elements.kwhPrice.value) || 150) : 150,
      wearCostPerHour: elements.wearRate ? (parseFloat(elements.wearRate.value) || 80) : 80,
      laborTimeHours: elements.laborTime ? (parseFloat(elements.laborTime.value) || 0.2) : 0.2,
      laborRatePerHour: elements.laborRate ? (parseFloat(elements.laborRate.value) || 2500) : 2500,
      failureRatePercent: elements.failureRate ? (parseFloat(elements.failureRate.value) || 10) : 10,
      pricingMode: state.pricingMode,
      priceMultiplier: state.priceMultiplier,
      profitMarginPercent: state.profitMarginPercent,
      pricePerGramRate: state.pricePerGramRate,
      currency: state.currentCurrency
    };

    const res = PrintCalculator.calculate(calcParams);

    // Hero selling price and profit displays
    if (elements.resSellingPrice) elements.resSellingPrice.textContent = res.formatted.sellingPrice;
    if (elements.resNetProfit) elements.resNetProfit.textContent = res.formatted.netProfit;

    // Clear math breakdown card
    if (elements.summaryCostTotal) elements.summaryCostTotal.textContent = res.formatted.totalCostPrice;
    if (elements.summaryNetProfit) elements.summaryNetProfit.textContent = res.formatted.netProfit;

    // Detailed itemized cost items
    if (elements.resCostMat) elements.resCostMat.textContent = res.formatted.materialCost;
    if (elements.resCostElec) elements.resCostElec.textContent = res.formatted.electricityCost;
    if (elements.resCostWear) elements.resCostWear.textContent = res.formatted.wearCost;
    if (elements.resCostLabor) elements.resCostLabor.textContent = res.formatted.laborCost;
    if (elements.resCostRisk) elements.resCostRisk.textContent = res.formatted.failureRiskCost;
    if (elements.resCostTotal) elements.resCostTotal.textContent = res.formatted.totalCostPrice;

    const sym = res.currencySymbol;
    if (elements.currTag1) elements.currTag1.textContent = `${sym}/kg`;
    if (elements.currTag2) elements.currTag2.textContent = `${sym}/kWh`;
    if (elements.currTag3) elements.currTag3.textContent = `${sym}/hora`;
    if (elements.currTag4) elements.currTag4.textContent = `${sym}/hora`;
    if (elements.currTagGram) elements.currTagGram.textContent = `${sym}/gramo`;

    const b = res.breakdownPercentages;
    if (elements.barMaterial) elements.barMaterial.style.width = `${b.material}%`;
    if (elements.barElec) elements.barElec.style.width = `${b.electricity}%`;
    if (elements.barWear) elements.barWear.style.width = `${b.wear}%`;
    if (elements.barLabor) elements.barLabor.style.width = `${b.labor}%`;
    if (elements.barRisk) elements.barRisk.style.width = `${b.risk}%`;

    // Persist ALL user settings
    if (typeof StorageManager !== 'undefined') {
      StorageManager.saveSettings({
        currency: calcParams.currency,
        theme: state.theme,
        kwhPrice: calcParams.kwhPrice,
        wearCostPerHour: calcParams.wearCostPerHour,
        printerWatts: calcParams.printerWatts,
        laborRatePerHour: calcParams.laborRatePerHour,
        laborTimeHours: calcParams.laborTimeHours,
        failureRatePercent: calcParams.failureRatePercent,
        pricingMode: state.pricingMode,
        priceMultiplier: state.priceMultiplier,
        profitMarginPercent: state.profitMarginPercent,
        pricePerGramRate: state.pricePerGramRate,
        spoolPrice: calcParams.spoolPrice,
        selectedMaterial: matKey,
        infillPercent: infillVal,
        selectedPrinter: printerKey,
        selectedSupport: supportKey
      });
    }
  }

  // Copy Summary Quote Button
  safeListen(elements.btnCopyQuote, 'click', () => {
    const matName = elements.materialSelect ? elements.materialSelect.options[elements.materialSelect.selectedIndex].text.split(' (')[0] : 'PLA';

    let strategyText = `Multiplicador ${state.priceMultiplier.toFixed(1)}x`;
    if (state.pricingMode === 'per_gram') {
      strategyText = `Tarifa por gramo: ${state.pricePerGramRate} $/g`;
    } else if (state.pricingMode === 'margin') {
      strategyText = `Margen +${state.profitMarginPercent}% sobre costo`;
    }

    const quoteText = `📦 *COTIZACIÓN IMPRESIÓN 3D*
--------------------------------
🔹 *Pieza*: ${state.modelTitle} (Escala ${state.scalePercent}%)
🔹 *Material*: ${matName} (${elements.infillRange ? elements.infillRange.value : 20}% relleno)
🔹 *Estrategia*: ${strategyText}
🔹 *Peso aprox.*: ${elements.weightInput ? elements.weightInput.value : 50} g
🔹 *Tiempo estimado*: ${elements.timeHours ? elements.timeHours.value : 2}h ${elements.timeMins ? elements.timeMins.value : 30}m

💰 *PRECIO TOTAL*: ${elements.resSellingPrice ? elements.resSellingPrice.textContent : '$ 0'}
--------------------------------
_Calculadora para Impresión 3D by Juan Pablo Sánchez_`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(quoteText).then(() => {
        showToast('¡Resumen de cotización copiado al portapapeles!');
      }).catch(() => {
        showToast('No se pudo copiar automáticamente');
      });
    } else {
      showToast('Copiar no soportado en este navegador');
    }
  });

  // Reset Button
  safeListen(elements.btnResetAll, 'click', () => {
    state.baseVolumeCm3 = 0;
    state.baseAreaCm2 = 0;
    state.baseDimensions = { x: 0, y: 0, z: 0 };
    state.volumeCm3 = 0;
    state.areaCm2 = 0;
    state.scalePercent = 100;
    if (elements.scaleInput) elements.scaleInput.value = 100;
    if (elements.scaleValLabel) elements.scaleValLabel.textContent = '100%';
    if (elements.rotAngleX) elements.rotAngleX.value = 0;
    if (elements.rotAngleY) elements.rotAngleY.value = 0;
    if (elements.rotAngleZ) elements.rotAngleZ.value = 0;
    if (viewer) viewer.setVisualRotation(0, 0, 0);

    state.customWeight = false;
    state.customTime = false;
    state.modelTitle = 'Pieza Impresión 3D';
    if (elements.statDim) elements.statDim.textContent = '0 x 0 x 0 mm';
    if (elements.statVol) elements.statVol.textContent = '0 cm³';
    if (elements.statWeight) elements.statWeight.textContent = '0 g';
    if (elements.weightInput) elements.weightInput.value = 41;
    if (elements.timeHours) elements.timeHours.value = 1;
    if (elements.timeMins) elements.timeMins.value = 30;
    if (elements.importedBanner) elements.importedBanner.classList.add('hidden');
    if (elements.btnOpenMultiModal) elements.btnOpenMultiModal.classList.add('hidden');
    if (elements.viewerStatus) elements.viewerStatus.textContent = 'Sin modelo cargado';
    if (elements.viewerSimBadge) elements.viewerSimBadge.classList.add('hidden');

    setMultiplier(2.0);
    setPricingMode('multiplier');
    recalculate();
    showToast('Valores restablecidos');
  });

  function showToast(msg) {
    if (elements.toastMsg) elements.toastMsg.textContent = msg;
    if (elements.toast) {
      elements.toast.classList.add('show');
      setTimeout(() => {
        elements.toast.classList.remove('show');
      }, 3200);
    }
  }

  // Initial Calculation
  recalculate();
});
