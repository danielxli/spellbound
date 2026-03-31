// settings.js — User preferences, persisted via Storage

const SETTING_DEFAULTS = {
  sfxVolume: 0.7,
  musicVolume: 0.3,
  hapticsOn: true,
  animSpeed: 1  // 1 = normal, 2 = fast
};

let currentSettings = { ...SETTING_DEFAULTS };

function initSettings() {
  const saved = Storage.loadSettings();
  if (saved) currentSettings = { ...SETTING_DEFAULTS, ...saved };
}

function getSetting(key) {
  return currentSettings[key];
}

function setSetting(key, value) {
  currentSettings[key] = value;
  Storage.saveSettings(currentSettings);
}

function getAllSettings() {
  return { ...currentSettings };
}

window.Settings = {
  init: initSettings,
  get: getSetting,
  set: setSetting,
  getAll: getAllSettings,
  DEFAULTS: SETTING_DEFAULTS
};
