/**
 * 3D Print Cost & Pricing Calculation Engine
 */

const MATERIAL_PRESETS = {
  pla: { name: 'PLA', density: 1.24, defaultPriceKg: 20 },
  petg: { name: 'PETG', density: 1.27, defaultPriceKg: 24 },
  abs: { name: 'ABS', density: 1.04, defaultPriceKg: 22 },
  tpu: { name: 'TPU (Flexible)', density: 1.21, defaultPriceKg: 35 },
  resin_std: { name: 'Resina Estándar', density: 1.15, defaultPriceKg: 30 },
  custom: { name: 'Personalizado', density: 1.24, defaultPriceKg: 20 }
};

const CURRENCIES = {
  USD: { symbol: '$', name: 'Dólar (USD)', decimal: 2 },
  ARS: { symbol: '$', name: 'Peso Arg (ARS)', decimal: 0 },
  EUR: { symbol: '€', name: 'Euro (EUR)', decimal: 2 },
  MXN: { symbol: '$', name: 'Peso MX (MXN)', decimal: 2 },
  CLP: { symbol: '$', name: 'Peso CL (CLP)', decimal: 0 },
  COP: { symbol: '$', name: 'Peso CO (COP)', decimal: 0 },
  PEN: { symbol: 'S/', name: 'Sol (PEN)', decimal: 2 }
};

class PrintCalculator {
  /**
   * Calculate weight based on solid model volume (cm3) and infill percentage
   * @param {number} volumeCm3 Total solid volume from STL in cm3
   * @param {number} density Material density g/cm3
   * @param {number} infillPercent Infill % (0 - 100)
   * @param {number} wallThicknessMm Wall/Shell thickness estimate (default 1.2mm)
   * @returns {number} Estimated weight in grams
   */
  static estimateWeight(volumeCm3, density, infillPercent = 20) {
    if (!volumeCm3 || volumeCm3 <= 0) return 0;

    // Shell vs Infill heuristic:
    // Models usually have ~30-40% shell volume depending on size, remaining is infill
    const shellRatio = Math.max(0.25, Math.min(0.8, 5.0 / Math.cbrt(volumeCm3)));
    const shellVolume = volumeCm3 * shellRatio;
    const innerVolume = volumeCm3 - shellVolume;
    const infillVolume = innerVolume * (infillPercent / 100.0);

    const totalEffectiveVolume = shellVolume + infillVolume;
    return parseFloat((totalEffectiveVolume * density).toFixed(1));
  }

  /**
   * Estimate print time in hours if not provided by user
   * Heuristic: ~25cm3 per hour at standard print speed + setup buffer
   */
  static estimatePrintTimeHours(weightGrams, infillPercent = 20) {
    if (!weightGrams || weightGrams <= 0) return 1;
    const hours = (weightGrams / 22.0) + 0.3; // Approx 22g per hour average
    return parseFloat(hours.toFixed(2));
  }

  /**
   * Main Cost and Pricing Calculator
   * @param {Object} params Calculation inputs
   * @returns {Object} Complete cost breakdown and price suggestions
   */
  static calculate(params) {
    const {
      weightGrams = 0,
      spoolPrice = 20,          // Cost per kg ($/kg)
      spoolWeightGrams = 1000,  // Standard spool size 1000g
      
      printTimeHours = 1,       // Total print duration in hours
      printerWatts = 200,       // Power consumption (Watts)
      kwhPrice = 0.15,          // Electricity cost per kWh
      
      wearCostPerHour = 0.25,   // Wear & tear maintenance per hour ($/hr)
      
      laborTimeHours = 0.2,     // Setup & post-processing time
      laborRatePerHour = 10,    // Labor rate ($/hr)
      
      failureRatePercent = 10,  // Buffer for failed prints / scrap %
      
      profitMarginPercent = 50, // Profit Margin %
      pricingMode = 'margin',   // 'margin' | 'multiplier'
      costMultiplier = 2.5,     // Cost multiplier if mode is multiplier
      
      currency = 'USD'
    } = params;

    // 1. Material Cost
    const pricePerGram = spoolWeightGrams > 0 ? (spoolPrice / spoolWeightGrams) : 0;
    const materialCost = weightGrams * pricePerGram;

    // 2. Electricity Cost (kW * hours * $/kWh)
    const powerKw = printerWatts / 1000.0;
    const electricityCost = powerKw * printTimeHours * kwhPrice;

    // 3. Machine Wear & Tear Cost
    const wearCost = printTimeHours * wearCostPerHour;

    // 4. Labor / Service Cost
    const laborCost = laborTimeHours * laborRatePerHour;

    // 5. Direct Production Cost
    const baseProductionCost = materialCost + electricityCost + wearCost + laborCost;

    // 6. Risk / Failure Buffer Cost
    const failureRiskCost = baseProductionCost * (failureRatePercent / 100.0);

    // 7. Total Cost Price (Precio de Costo Real)
    const totalCostPrice = baseProductionCost + failureRiskCost;

    // 8. Selling Price Calculation
    let sellingPrice = 0;
    if (pricingMode === 'multiplier') {
      sellingPrice = totalCostPrice * costMultiplier;
    } else {
      // Profit Margin Mode: SellingPrice = Cost / (1 - Margin%)
      const marginDecimal = Math.min(0.95, profitMarginPercent / 100.0);
      sellingPrice = marginDecimal < 1 ? (totalCostPrice / (1.0 - marginDecimal)) : (totalCostPrice * 2);
    }

    // 9. Profit Amount
    const netProfit = Math.max(0, sellingPrice - totalCostPrice);
    const calculatedMargin = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100.0) : 0;

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
      
      // Detailed Costs
      materialCost,
      electricityCost,
      wearCost,
      laborCost,
      baseProductionCost,
      failureRiskCost,
      totalCostPrice, // Breakeven
      
      // Selling & Profit
      sellingPrice,
      netProfit,
      marginPercent: parseFloat(calculatedMargin.toFixed(1)),
      
      // Formatted strings
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

      // Percentages for Pie Chart / Breakdown
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
