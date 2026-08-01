/**
 * LocalStorage Manager for User Presets, Printer Profiles, and Custom Settings
 */
const STORAGE_KEYS = {
  SETTINGS: '3d_calc_settings',
  PRINTER_PROFILES: '3d_calc_printers',
  MATERIAL_PROFILES: '3d_calc_materials'
};

const DEFAULT_SETTINGS = {
  currency: 'USD',
  kwhPrice: 0.15,
  wearCostPerHour: 0.25,
  printerWatts: 200,
  laborRatePerHour: 12,
  laborTimeHours: 0.2,
  failureRatePercent: 10,
  profitMarginPercent: 50,
  pricingMode: 'margin',
  costMultiplier: 2.5,
  spoolPrice: 20,
  spoolWeightGrams: 1000,
  selectedMaterial: 'pla',
  infillPercent: 20
};

const DEFAULT_PRINTERS = [
  { id: 'p1', name: 'Creality Ender 3 / Neptune', watts: 200, wearPerHour: 0.20 },
  { id: 'p2', name: 'Bambu Lab P1S / X1C', watts: 350, wearPerHour: 0.40 },
  { id: 'p3', name: 'Prusa i3 MK3S / MK4', watts: 120, wearPerHour: 0.30 },
  { id: 'p4', name: 'Impresora Resina SLA/DLP', watts: 60, wearPerHour: 0.50 }
];

class StorageManager {
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Unable to save settings to localStorage', e);
    }
  }

  static getPrinters() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRINTER_PROFILES);
      return data ? JSON.parse(data) : DEFAULT_PRINTERS;
    } catch (e) {
      return DEFAULT_PRINTERS;
    }
  }

  static savePrinters(printers) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRINTER_PROFILES, JSON.stringify(printers));
    } catch (e) {
      console.warn('Unable to save printers', e);
    }
  }
}
