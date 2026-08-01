/**
 * Main Application Orchestrator for 3D Print Calculator
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 1. App State & References
  const state = {
    volumeCm3: 0,
    dimensions: { x: 0, y: 0, z: 0 },
    customWeight: false,
    customTime: false,
    modelTitle: 'Pieza Impresión 3D'
  };

  // Saved Settings
  const settings = StorageManager.getSettings();

  // 2. Initialize 3D Viewer
  let viewer = null;
  try {
    viewer = new ModelViewer3D('viewer-container');
  } catch (e) {
    console.warn('WebGL init error:', e);
  }

  // DOM Elements
  const elements = {
    currencySelect: document.getElementById('currency-select'),
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

    // Results
    marginRange: document.getElementById('margin-range'),
    marginValLabel: document.getElementById('margin-val-label'),
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
    btnResetCam: document.getElementById('btn-reset-cam'),
    btnWireframe: document.getElementById('btn-wireframe'),
    btnCopyQuote: document.getElementById('btn-copy-quote'),
    btnResetAll: document.getElementById('btn-reset-all'),
    accHeader: document.getElementById('acc-header'),
    currTag1: document.getElementById('curr-tag-1'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg')
  };

  // Restore stored values
  if (settings) {
    elements.currencySelect.value = settings.currency || 'USD';
    elements.kwhPrice.value = settings.kwhPrice || 0.15;
    elements.wearRate.value = settings.wearCostPerHour || 0.25;
    elements.printerWatts.value = settings.printerWatts || 200;
    elements.laborRate.value = settings.laborRatePerHour || 12;
    elements.laborTime.value = settings.laborTimeHours || 0.2;
    elements.failureRate.value = settings.failureRatePercent || 10;
    elements.marginRange.value = settings.profitMarginPercent || 50;
    elements.spoolPrice.value = settings.spoolPrice || 20;
    elements.materialSelect.value = settings.selectedMaterial || 'pla';
    elements.infillRange.value = settings.infillPercent || 20;
  }

  // 3. Tab Switcher
  elements.tabStl.addEventListener('click', () => {
    elements.tabStl.classList.add('active');
    elements.tabUrl.classList.remove('active');
    elements.panelStl.classList.remove('hidden');
    elements.panelUrl.classList.add('hidden');
  });

  elements.tabUrl.addEventListener('click', () => {
    elements.tabUrl.classList.add('active');
    elements.tabStl.classList.remove('active');
    elements.panelUrl.classList.remove('hidden');
    elements.panelStl.classList.add('hidden');
  });

  // 4. File Dropzone & Loading
  elements.dropzone.addEventListener('click', () => elements.stlFileInput.click());
  
  ['dragenter', 'dragover'].forEach(eventName => {
    elements.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      elements.dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    elements.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      elements.dropzone.classList.remove('dragover');
    });
  });

  elements.dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleStlFile(files[0]);
    }
  });

  elements.stlFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleStlFile(e.target.files[0]);
    }
  });

  function handleStlFile(file) {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      showToast('Por favor selecciona un archivo con extensión .stl');
      return;
    }

    state.modelTitle = file.name.replace(/\.stl$/i, '');
    showToast(`Cargando ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const stlData = STLParser.parse(buffer);

        state.volumeCm3 = stlData.volumeCm3;
        state.dimensions = stlData.dimensions;

        // Render in 3D Viewer
        if (viewer) {
          viewer.loadGeometry(stlData);
        }

        // Update stats
        elements.statDim.textContent = `${Math.round(stlData.dimensions.x)} x ${Math.round(stlData.dimensions.y)} x ${Math.round(stlData.dimensions.z)} mm`;
        elements.statVol.textContent = `${stlData.volumeCm3.toFixed(1)} cm³`;

        state.customWeight = false;
        state.customTime = false;

        recalculate();
        showToast('¡Modelo STL procesado con éxito!');
      } catch (err) {
        console.error(err);
        showToast('Error al leer el archivo STL');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // 5. URL Importer
  elements.btnImportUrl.addEventListener('click', async () => {
    const url = elements.modelUrlInput.value;
    if (!url) return;

    showToast('Buscando información del modelo...');
    try {
      const data = await ModelImporter.importFromUrl(url);
      if (data && data.title) {
        state.modelTitle = data.title;
        elements.importedTitle.textContent = data.title;
        elements.importedSource.textContent = `Origen: ${data.source || 'Web'}`;
        elements.importedBanner.classList.remove('hidden');

        // Estimate default parameters if no STL loaded
        if (state.volumeCm3 === 0) {
          state.volumeCm3 = 45; // Default average model volume
          elements.statDim.textContent = `Estimado (~70mm)`;
          elements.statVol.textContent = `~45 cm³`;
        }

        recalculate();
        showToast('¡Modelo importado correctamente!');
      }
    } catch (e) {
      showToast('No se pudo procesar la URL especificada');
    }
  });

  // 6. Accordion Toggle
  elements.accHeader.addEventListener('click', () => {
    const parent = elements.accHeader.parentElement;
    parent.classList.toggle('open');
  });

  // 7. Viewer controls
  let isWireframe = false;
  elements.btnWireframe.addEventListener('click', () => {
    isWireframe = !isWireframe;
    if (viewer) viewer.setWireframe(isWireframe);
  });

  elements.btnResetCam.addEventListener('click', () => {
    if (viewer) viewer.resetView();
  });

  // 8. Event Listeners for Recalculation
  const updateInputs = [
    elements.currencySelect,
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
    elements.failureRate,
    elements.marginRange
  ];

  updateInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      if (e.target === elements.weightInput) state.customWeight = true;
      if (e.target === elements.timeHours || e.target === elements.timeMins) state.customTime = true;
      recalculate();
    });
  });

  // 9. Main Recalculate Logic
  function recalculate() {
    const matKey = elements.materialSelect.value;
    const matPreset = MATERIAL_PRESETS[matKey] || MATERIAL_PRESETS.pla;
    const infillVal = parseInt(elements.infillRange.value) || 20;

    elements.infillValLabel.textContent = `${infillVal}%`;
    elements.marginValLabel.textContent = `${elements.marginRange.value}%`;

    // Estimate weight if not manually overwritten
    let weight = parseFloat(elements.weightInput.value);
    if (!state.customWeight && state.volumeCm3 > 0) {
      weight = PrintCalculator.estimateWeight(state.volumeCm3, matPreset.density, infillVal);
      elements.weightInput.value = weight;
    }
    elements.statWeight.textContent = `${weight || 0} g`;

    // Estimate print time if not manually overwritten
    let hours = parseFloat(elements.timeHours.value) || 0;
    let mins = parseFloat(elements.timeMins.value) || 0;
    if (!state.customTime && weight > 0) {
      const estimatedTotalHours = PrintCalculator.estimatePrintTimeHours(weight, infillVal);
      hours = Math.floor(estimatedTotalHours);
      mins = Math.round((estimatedTotalHours - hours) * 60);
      elements.timeHours.value = hours;
      elements.timeMins.value = mins;
    }

    const totalPrintTimeHours = hours + (mins / 60.0);

    const calcParams = {
      weightGrams: weight || 0,
      spoolPrice: parseFloat(elements.spoolPrice.value) || 20,
      spoolWeightGrams: 1000,
      printTimeHours: totalPrintTimeHours,
      printerWatts: parseFloat(elements.printerWatts.value) || 200,
      kwhPrice: parseFloat(elements.kwhPrice.value) || 0.15,
      wearCostPerHour: parseFloat(elements.wearRate.value) || 0.25,
      laborTimeHours: parseFloat(elements.laborTime.value) || 0.2,
      laborRatePerHour: parseFloat(elements.laborRate.value) || 12,
      failureRatePercent: parseFloat(elements.failureRate.value) || 10,
      profitMarginPercent: parseFloat(elements.marginRange.value) || 50,
      currency: elements.currencySelect.value
    };

    const res = PrintCalculator.calculate(calcParams);

    // Update UI Results
    elements.resSellingPrice.textContent = res.formatted.sellingPrice;
    elements.resNetProfit.textContent = res.formatted.netProfit;

    elements.resCostMat.textContent = res.formatted.materialCost;
    elements.resCostElec.textContent = res.formatted.electricityCost;
    elements.resCostWear.textContent = res.formatted.wearCost;
    elements.resCostLabor.textContent = res.formatted.laborCost;
    elements.resCostRisk.textContent = res.formatted.failureRiskCost;
    elements.resCostTotal.textContent = res.formatted.totalCostPrice;

    // Update Currency suffix tags
    const symbol = res.currencySymbol;
    elements.currTag1.textContent = `${symbol}/kg`;

    // Update Visual Breakdown Bar
    const b = res.breakdownPercentages;
    elements.barMaterial.style.width = `${b.material}%`;
    elements.barElec.style.width = `${b.electricity}%`;
    elements.barWear.style.width = `${b.wear}%`;
    elements.barLabor.style.width = `${b.labor}%`;
    elements.barRisk.style.width = `${b.risk}%`;

    // Save user settings
    StorageManager.saveSettings({
      currency: calcParams.currency,
      kwhPrice: calcParams.kwhPrice,
      wearCostPerHour: calcParams.wearCostPerHour,
      printerWatts: calcParams.printerWatts,
      laborRatePerHour: calcParams.laborRatePerHour,
      laborTimeHours: calcParams.laborTimeHours,
      failureRatePercent: calcParams.failureRatePercent,
      profitMarginPercent: calcParams.profitMarginPercent,
      spoolPrice: calcParams.spoolPrice,
      selectedMaterial: matKey,
      infillPercent: infillVal
    });
  }

  // 10. Copy Summary Quote for WhatsApp / Email
  elements.btnCopyQuote.addEventListener('click', () => {
    const symbol = CURRENCIES[elements.currencySelect.value]?.symbol || '$';
    const matName = elements.materialSelect.options[elements.materialSelect.selectedIndex].text.split(' (')[0];

    const quoteText = `📦 *COTIZACIÓN IMPRESIÓN 3D*
--------------------------------
🔹 *Pieza*: ${state.modelTitle}
🔹 *Material*: ${matName} (${elements.infillRange.value}% relleno)
🔹 *Peso aprox.*: ${elements.weightInput.value} g
🔹 *Tiempo estimado*: ${elements.timeHours.value}h ${elements.timeMins.value}m

💰 *PRECIO TOTAL*: ${elements.resSellingPrice.textContent}
--------------------------------
_Cotización generada con 3DPrint Calc_`;

    navigator.clipboard.writeText(quoteText).then(() => {
      showToast('¡Resumen de cotización copiado al portapapeles!');
    }).catch(() => {
      showToast('No se pudo copiar automáticamente');
    });
  });

  // 11. Reset button
  elements.btnResetAll.addEventListener('click', () => {
    state.volumeCm3 = 0;
    state.customWeight = false;
    state.customTime = false;
    state.modelTitle = 'Pieza Impresión 3D';
    elements.statDim.textContent = '0 x 0 x 0 mm';
    elements.statVol.textContent = '0 cm³';
    elements.statWeight.textContent = '0 g';
    elements.weightInput.value = 50;
    elements.timeHours.value = 2;
    elements.timeMins.value = 30;
    elements.importedBanner.classList.add('hidden');
    recalculate();
    showToast('Valores restablecidos');
  });

  function showToast(msg) {
    elements.toastMsg.textContent = msg;
    elements.toast.classList.add('show');
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 3000);
  }

  // Initial Calculation
  recalculate();
});
