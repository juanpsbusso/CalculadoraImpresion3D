/**
 * 3D Print Cost & Pricing Calculation Engine
 * Calibrated for Argentina & LATAM market standards.
 * Supports: Multipliers (1.5x, 2.0x, 2.5x, 3.0x), Support Material Add-on & Live Currency Conversion.
 */

const MATERIAL_PRESETS = {
  pla: { name: 'PLA', density: 1.24, defaultPriceKg: 20 },
  petg: { name: 'PETG', density: 1.27, defaultPriceKg: 24 },
  abs: { name: 'ABS', density: 1.04, defaultPriceKg: 22 },
  tpu: { name: 'TPU (Flexible)', density: 1.21, defaultPriceKg: 35 },
  resin_std: { name: 'Resina Estándar', density: 1.15, defaultPriceKg: 30 },
  custom: { name: 'Personalizado', density: 1.24, defaultPriceKg: 20 }
};

const PRINTER_PRESETS = {
  ender3_v3_se: {
    name: 'Creality Ender 3 V3 SE / KE (~250 mm/s)',
    volumetricSpeed: 8.0,
    watts: 250,
    description: 'Perfil calibrado oficial con Cura Dynamic Quality 0.16mm'
  },
  ender3: {
    name: 'Ender 3 / CR-10 / Estándar (~50 mm/s)',
    volumetricSpeed: 4.5,
    watts: 200,
    description: 'Impresora 3D clásica de velocidad estándar (~50 mm/s)'
  },
  bambu_p1_x1: {
    name: 'Bambu Lab X1-C / P1S / A1 (~250 mm/s)',
    volumetricSpeed: 18.0,
    watts: 350,
    description: 'Alta velocidad ultrarrápida CoreXY (~250 mm/s)'
  },
  creality_k1: {
    name: 'Creality K1 / K1 Max (~200 mm/s)',
    volumetricSpeed: 16.0,
    watts: 350,
    description: 'Alta velocidad CoreXY (~200 mm/s)'
  },
  prusa_mk4: {
    name: 'Prusa i3 MK3S+ / MK4 (~100 mm/s)',
    volumetricSpeed: 10.0,
    watts: 150,
    description: 'Impresora de alta precisión y confiabilidad (~100 mm/s)'
  },
  elegoo_neptune4: {
    name: 'Elegoo Neptune 4 / Anycubic Kobra 2 (~150 mm/s)',
    volumetricSpeed: 12.0,
    watts: 250,
    description: 'Velocidad media-alta con Klipper (~150 mm/s)'
  },
  custom: {
    name: 'Personalizada / Configuración Manual',
    volumetricSpeed: 8.0,
    watts: 200,
    description: 'Velocidad y consumo definidos manualmente'
  }
};

const SUPPORT_PRESETS = {
  none: { name: 'Sin Soportes (0% extra)', factor: 0.0 },
  light: { name: 'Soportes Árbol / Livianos (+15% extra)', factor: 0.15 },
  medium: { name: 'Soportes Estándar (+30% extra)', factor: 0.30 },
  heavy: { name: 'Soportes Densos (+50% extra)', factor: 0.50 }
};

const CURRENCIES = {
  USD: { symbol: '$', name: 'Dólar (USD)', decimal: 2, defaultSpool: 20, defaultKwh: 0.15, defaultWear: 0.25, defaultLabor: 10 },
  ARS: { symbol: '$', name: 'Peso Arg (ARS)', decimal: 0, defaultSpool: 25000, defaultKwh: 150, defaultWear: 80, defaultLabor: 2500 },
  EUR: { symbol: '€', name: 'Euro (EUR)', decimal: 2, defaultSpool: 20, defaultKwh: 0.25, defaultWear: 0.30, defaultLabor: 12 },
  MXN: { symbol: '$', name: 'Peso MX (MXN)', decimal: 2, defaultSpool: 400, defaultKwh: 2.5, defaultWear: 5.0, defaultLabor: 150 },
  CLP: { symbol: '$', name: 'Peso CL (CLP)', decimal: 0, defaultSpool: 20000, defaultKwh: 140, defaultWear: 250, defaultLabor: 8000 },
  COP: { symbol: '$', name: 'Peso CO (COP)', decimal: 0, defaultSpool: 90000, defaultKwh: 600, defaultWear: 1000, defaultLabor: 30000 },
  PEN: { symbol: 'S/', name: 'Sol (PEN)', decimal: 2, defaultSpool: 80, defaultKwh: 0.70, defaultWear: 1.0, defaultLabor: 35 }
};

const DEFAULT_EXCHANGE_RATES = {
  USD: 1.0,
  ARS: 1250.0,
  EUR: 0.92,
  MXN: 18.5,
  CLP: 940.0,
  COP: 4050.0,
  PEN: 3.75
};

let currentExchangeRates = { ...DEFAULT_EXCHANGE_RATES };

async function updateLiveExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        Object.keys(currentExchangeRates).forEach(curr => {
          if (data.rates[curr]) {
            currentExchangeRates[curr] = data.rates[curr];
          }
        });
      }
    }
  } catch (e) {
    console.warn('Using default exchange rates fallback', e);
  }
}
updateLiveExchangeRates();

class PrintCalculator {
  static getRates() {
    return currentExchangeRates;
  }

  static getCurrencyDefaults(currency = 'USD') {
    return CURRENCIES[currency] || CURRENCIES.USD;
  }

  static convertAmount(amount, fromCurr, toCurr) {
    if (!amount || fromCurr === toCurr) return amount;
    const rateFrom = currentExchangeRates[fromCurr] || 1.0;
    const rateTo = currentExchangeRates[toCurr] || 1.0;
    const amountInUSD = amount / rateFrom;
    return amountInUSD * rateTo;
  }

  /**
   * Cura-Calibrated Slicer Engine Heuristic
   */
  static estimateSlicing(volumeCm3, areaCm2, dimensions, infillPercent = 20, density = 1.24, volumetricSpeedMm3PerSec = 8.0, supportKey = 'none') {
    if (!volumeCm3 || volumeCm3 <= 0) {
      return { weightGrams: 0, printTimeHours: 0, filamentVolCm3: 0 };
    }

    const area = areaCm2 || (volumeCm3 * 6);
    const supportFactor = SUPPORT_PRESETS[supportKey] ? SUPPORT_PRESETS[supportKey].factor : 0.0;
    
    const estShellVolCm3 = Math.min(volumeCm3 * 0.85, area * 0.145);
    const innerVolCm3 = Math.max(0, volumeCm3 - estShellVolCm3);
    const infillVolCm3 = innerVolCm3 * (infillPercent / 100.0);
    const baseFilamentVolCm3 = estShellVolCm3 + infillVolCm3;

    const totalFilamentVolCm3 = baseFilamentVolCm3 * (1.0 + supportFactor);
    const weightGrams = Math.max(1, Math.round(totalFilamentVolCm3 * density));

    const heightMm = dimensions?.z || 20;
    const layerCount = Math.max(10, Math.ceil(heightMm / 0.16));
    const extrudableVolumeMm3 = totalFilamentVolCm3 * 1000.0;
    const speed = Math.max(1.0, volumetricSpeedMm3PerSec);

    const extrusionSeconds = extrudableVolumeMm3 / speed;
    const travelSeconds = layerCount * 14.8 * (1.0 + supportFactor * 0.5);
    const totalSeconds = extrusionSeconds + travelSeconds;
    const printTimeHours = parseFloat((totalSeconds / 3600.0).toFixed(4));

    return {
      weightGrams,
      printTimeHours,
      filamentVolCm3: parseFloat(totalFilamentVolCm3.toFixed(1))
    };
  }

  /**
   * Main Pricing Calculator
   * Supports 'multiplier' mode and 'margin' mode.
   */
  static calculate(params) {
    const {
      weightGrams = 0,
      spoolPrice = 20,
      spoolWeightGrams = 1000,
      printTimeHours = 1,
      printerWatts = 200,
      kwhPrice = 0.15,
      wearCostPerHour = 0.25,
      laborTimeHours = 0.2,
      laborRatePerHour = 10,
      failureRatePercent = 10,
      pricingMode = 'multiplier', // 'multiplier' or 'margin'
      priceMultiplier = 2.0,     // 1.5x Económico, 2.0x Estándar, 2.5x Comercial, 3.0x Premium
      profitMarginPercent = 50,
      currency = 'USD'
    } = params;

    // 1. Material Cost
    const pricePerGram = spoolWeightGrams > 0 ? (spoolPrice / spoolWeightGrams) : 0;
    const materialCost = weightGrams * pricePerGram;

    // 2. Electricity Cost
    const powerKw = printerWatts / 1000.0;
    const electricityCost = powerKw * printTimeHours * kwhPrice;

    // 3. Machine Wear & Tear
    const wearCost = printTimeHours * wearCostPerHour;

    // 4. Labor Cost
    const laborCost = laborTimeHours * laborRatePerHour;

    // 5. Base Production Cost
    const baseProductionCost = materialCost + electricityCost + wearCost + laborCost;

    // 6. Risk / Failure Fee
    const failureRiskCost = baseProductionCost * (failureRatePercent / 100.0);

    // 7. Breakeven Total Cost
    const totalCostPrice = baseProductionCost + failureRiskCost;

    // 8. Selling Price & Profit Calculation
    let sellingPrice = 0;
    let effectiveMultiplier = 1.0;
    let marginOnCostPercent = 0.0;

    if (pricingMode === 'multiplier') {
      effectiveMultiplier = Math.max(1.0, priceMultiplier);
      sellingPrice = totalCostPrice * effectiveMultiplier;
      marginOnCostPercent = (effectiveMultiplier - 1.0) * 100.0;
    } else {
      marginOnCostPercent = Math.max(0, profitMarginPercent);
      sellingPrice = totalCostPrice * (1.0 + (marginOnCostPercent / 100.0));
      effectiveMultiplier = totalCostPrice > 0 ? (sellingPrice / totalCostPrice) : 1.0;
    }

    // 9. Clean Net Profit Amount (Ganancia Neta Real)
    const netProfit = Math.max(0, sellingPrice - totalCostPrice);
    const marginOnSalesPercent = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100.0) : 0;

    const currInfo = CURRENCIES[currency] || CURRENCIES.USD;

    const formatCurr = (val) => {
      const formattedNum = val.toLocaleString(undefined, {
        minimumFractionDigits: currInfo.decimal,
        maximumFractionDigits: currInfo.decimal
      });
      return `${currInfo.symbol} ${formattedNum}`;
    };

    return {
      weightGrams,
      printTimeHours,
      currency,
      currencySymbol: currInfo.symbol,
      
      materialCost,
      electricityCost,
      wearCost,
      laborCost,
      baseProductionCost,
      failureRiskCost,
      totalCostPrice,
      
      sellingPrice,
      netProfit,
      priceMultiplier: parseFloat(effectiveMultiplier.toFixed(2)),
      marginOnCostPercent: parseFloat(marginOnCostPercent.toFixed(1)),
      marginOnSalesPercent: parseFloat(marginOnSalesPercent.toFixed(1)),
      
      formatted: {
        materialCost: formatCurr(materialCost),
        electricityCost: formatCurr(electricityCost),
        wearCost: formatCurr(wearCost),
        laborCost: formatCurr(laborCost),
        failureRiskCost: formatCurr(failureRiskCost),
        totalCostPrice: formatCurr(totalCostPrice),
        sellingPrice: formatCurr(sellingPrice),
        netProfit: formatCurr(netProfit)
      },

      breakdownPercentages: {
        material: totalCostPrice > 0 ? ((materialCost / totalCostPrice) * 100) : 0,
        electricity: totalCostPrice > 0 ? ((electricityCost / totalCostPrice) * 100) : 0,
        wear: totalCostPrice > 0 ? ((wearCost / totalCostPrice) * 100) : 0,
        labor: totalCostPrice > 0 ? ((laborCost / totalCostPrice) * 100) : 0,
        risk: totalCostPrice > 0 ? ((failureRiskCost / totalCostPrice) * 100) : 0
      }
    };
  }
}
