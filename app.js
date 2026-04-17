const API_BASE = "/api";
const OPERATOR_STORAGE_KEY = "atlas-operator";
const GROUP_SUGGESTION_TEMPLATES_PATH = "/group-suggestion-templates.json";
const SETTINGS_STORAGE_KEY = "atlas-settings";
const CUSTOM_TEMPLATES_STORAGE_KEY = "atlas-custom-group-templates";
const THEME_ALIASES = {
  ocean: "aurora",
};
const SUPPORTED_THEMES = ["atlas", "ember", "aurora", "fuchsia", "mono", "solaris", "forest", "neon", "arctic"];
const DEVICE_TYPES = {
  server: "device_type_server",
  container: "device_type_container",
  iot: "device_type_iot",
};

const DEFAULT_SETTINGS = {
  accentTheme: "atlas",
  autoRescanAfterDeviceSave: true,
  suggestionMode: "compact",
  language: "ru",
  customSignature: "",
};

const DEFAULT_GROUP_SUGGESTION_TEMPLATES = [
  {
    id: "hypervisor",
    label: "Hypervisor Hosts",
    deviceTypes: ["server"],
    keywords: ["hypervisor", "proxmox", "esxi", "xcp", "host", "hosts", "compute"],
  },
  {
    id: "infra-servers",
    label: "Infra Servers",
    deviceTypes: ["server"],
    keywords: ["server", "servers", "infra", "infrastructure", "management", "mgmt"],
  },
  {
    id: "storage",
    label: "Storage",
    deviceTypes: ["server"],
    keywords: ["nas", "san", "storage", "backup", "archive"],
  },
  {
    id: "virtual-machines",
    label: "Virtual Machines",
    deviceTypes: ["container"],
    keywords: ["vm", "vms", "virtual", "machines", "guests"],
  },
  {
    id: "containers",
    label: "Containers",
    deviceTypes: ["container"],
    keywords: ["container", "containers", "docker", "lxc", "podman"],
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    deviceTypes: ["container"],
    keywords: ["k8s", "k3s", "kubernetes", "cluster", "pods"],
  },
  {
    id: "home-automation",
    label: "Home Automation",
    deviceTypes: ["iot"],
    keywords: ["home assistant", "assistant", "automation", "domotic", "smart home"],
  },
  {
    id: "lighting",
    label: "Lighting",
    deviceTypes: ["iot"],
    keywords: ["wled", "light", "lighting", "led", "strip"],
  },
  {
    id: "raspberry-pi",
    label: "Raspberry Pi",
    deviceTypes: ["iot", "server"],
    keywords: ["rpi", "raspberry", "raspberry pi", "pi"],
  },
  {
    id: "networking",
    label: "Networking",
    deviceTypes: ["iot", "server"],
    keywords: ["network", "networking", "router", "switch", "firewall", "ap", "wifi"],
  },
  {
    id: "iot-generic",
    label: "IoT Devices",
    deviceTypes: ["iot"],
    keywords: ["iot", "sensor", "smart", "device", "devices", "esp", "zigbee", "matter"],
  },
  {
    id: "surveillance",
    label: "Surveillance",
    deviceTypes: ["iot", "server"],
    keywords: ["camera", "cctv", "nvr", "surveillance", "security"],
  },
  {
    id: "guest",
    label: "Guest",
    deviceTypes: ["iot", "container", "server"],
    keywords: ["guest", "lab", "test", "staging", "sandbox"],
  },
];

const ACTION_LABELS = {
  assigned: "action_assigned",
  imported: "action_imported",
  ip_changed: "action_ip_changed",
  released: "action_released",
};

const TRANSLATIONS = window.ATLAS_TRANSLATIONS || {};
const DATE_LOCALES = window.ATLAS_DATE_LOCALES || {
  ru: "ru-RU",
  uk: "uk-UA",
  en: "en-US",
};

const state = {
  subnets: [],
  groups: [],
  devices: [],
  scanResults: [],
  history: [],
  meta: {
    revision: 0,
    lastScanAt: null,
    scanInProgress: false,
    scanIntervalSeconds: 90,
  },
  settings: {
    scanIntervalSeconds: 90,
    scanTimeoutMs: 1000,
    scanConcurrency: 32,
    limits: {
      scanIntervalMin: 15,
      scanIntervalMax: 3600,
    },
  },
};

const preferences = {
  operator: localStorage.getItem(OPERATOR_STORAGE_KEY) || "",
  settings: loadSettings(),
};

const elements = {
  heroSignature: document.getElementById("hero-signature"),
  subnetForm: document.getElementById("subnet-form"),
  deviceForm: document.getElementById("device-form"),
  groupForm: document.getElementById("group-form"),
  subnetSelect: document.getElementById("device-subnet-select"),
  deviceGroupSelect: document.getElementById("device-group-select"),
  groupSubnetSelect: document.getElementById("group-subnet-select"),
  searchInput: document.getElementById("device-search-input"),
  ipCheckForm: document.getElementById("ip-check-form"),
  ipCheckResult: document.getElementById("ip-check-result"),
  operatorInput: document.getElementById("operator-input"),
  openSettingsButton: document.getElementById("open-settings-button"),
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsButton: document.querySelector('[data-close-modal="settings-modal"]'),
  scanNowButton: document.getElementById("scan-now-button"),
  liveStatusBadge: document.getElementById("live-status-badge"),
  scanStatusBadge: document.getElementById("scan-status-badge"),
  scanStatusText: document.getElementById("scan-status-text"),
  liveSummaryText: document.getElementById("live-summary-text"),
  viewTabs: [...document.querySelectorAll("[data-view-tab]")],
  pageViews: [...document.querySelectorAll("[data-view]")],
  modalBackdrops: [...document.querySelectorAll(".modal-backdrop")],
  openModalButtons: [...document.querySelectorAll("[data-open-modal]")],
  closeModalButtons: [...document.querySelectorAll("[data-close-modal]")],
  dashboardSubnetsList: document.getElementById("dashboard-subnets-list"),
  dashboardGroupsList: document.getElementById("dashboard-groups-list"),
  dashboardDevicesList: document.getElementById("dashboard-devices-list"),
  dashboardHistoryList: document.getElementById("dashboard-history-list"),
  deviceSuggestion: document.getElementById("device-suggestion"),
  deviceFormStatus: document.getElementById("device-form-status"),
  applySuggestionButton: document.getElementById("apply-suggestion-button"),
  settingsThemeSelect: document.getElementById("settings-theme-select"),
  settingsLanguageSelect: document.getElementById("settings-language-select"),
  settingsSignatureInput: document.getElementById("settings-signature-input"),
  settingsAutoRescan: document.getElementById("settings-auto-rescan"),
  settingsSuggestionMode: document.getElementById("settings-suggestion-mode"),
  settingsScanInterval: document.getElementById("settings-scan-interval"),
  settingsPingMeta: document.getElementById("settings-ping-meta"),
  serverSettingsStatus: document.getElementById("server-settings-status"),
  saveServerSettingsButton: document.getElementById("save-server-settings-button"),
  templateEditor: document.getElementById("template-editor"),
  templateSettingsStatus: document.getElementById("template-settings-status"),
  saveTemplateSettingsButton: document.getElementById("save-template-settings-button"),
  resetTemplateSettingsButton: document.getElementById("reset-template-settings-button"),
  subnetsTableBody: document.getElementById("subnets-table-body"),
  groupsTableBody: document.getElementById("groups-table-body"),
  devicesTableBody: document.getElementById("devices-table-body"),
  historyTableBody: document.getElementById("history-table-body"),
  subnetsCounter: document.getElementById("subnets-counter"),
  groupsCounter: document.getElementById("groups-counter"),
  devicesCounter: document.getElementById("devices-counter"),
  historyCounter: document.getElementById("history-counter"),
  statSubnets: document.getElementById("stat-subnets"),
  statDevices: document.getElementById("stat-devices"),
  statOccupied: document.getElementById("stat-occupied"),
  statAvailable: document.getElementById("stat-available"),
  exportJsonButton: document.getElementById("export-json-button"),
  exportSubnetsCsvButton: document.getElementById("export-subnets-csv-button"),
  exportGroupsCsvButton: document.getElementById("export-groups-csv-button"),
  exportDevicesCsvButton: document.getElementById("export-devices-csv-button"),
  importButton: document.getElementById("import-button"),
  importFileInput: document.getElementById("import-file-input"),
  clearDataButton: document.getElementById("clear-data-button"),
  toast: document.getElementById("toast"),
};

let activeToastTimer = null;
let pollIntervalId = null;
let eventSource = null;
let isManualScanRunning = false;
let isDeviceSubmitting = false;
let deviceGroupSelectionMode = "auto";
let groupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
let groupSuggestionTemplateSource = "bundled";
let activeView = "dashboard";

initialize().catch((error) => {
  console.error(error);
  showToast(t("server_unavailable"), true);
});

function getLanguage() {
  return preferences.settings.language || DEFAULT_SETTINGS.language;
}

function t(key, vars = {}) {
  const language = getLanguage();
  const dictionary = TRANSLATIONS[language] || TRANSLATIONS.ru || {};
  const fallback = TRANSLATIONS.ru || {};
  const template = dictionary[key] ?? fallback[key] ?? key;

  return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
}

function getDeviceTypeLabel(type) {
  const key = DEVICE_TYPES[type];
  return key ? t(key) : type;
}

function getActionLabel(action) {
  const key = ACTION_LABELS[action];
  return key ? t(key) : action;
}

function applyLocalizedUi() {
  const language = getLanguage();
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  elements.heroSignature.textContent = preferences.settings.customSignature || t("default_signature");
}

function formatRecordsCount(count) {
  return t("records_count", { count });
}

function formatFilteredCount(count, total) {
  return t("filtered_count", { count, total });
}

function formatEventsCount(count) {
  return t("events_count", { count });
}

function loadSettings() {
  try {
    const rawValue = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(rawValue);
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function normalizeSettings(rawSettings) {
  const requestedTheme = THEME_ALIASES[rawSettings?.accentTheme] || rawSettings?.accentTheme;
  const normalizedTheme = SUPPORTED_THEMES.includes(requestedTheme)
    ? requestedTheme
    : DEFAULT_SETTINGS.accentTheme;
  const normalizedSuggestionMode = ["compact", "detailed"].includes(rawSettings?.suggestionMode)
    ? rawSettings.suggestionMode
    : DEFAULT_SETTINGS.suggestionMode;
  const normalizedLanguage = ["ru", "uk", "en"].includes(rawSettings?.language)
    ? rawSettings.language
    : DEFAULT_SETTINGS.language;

  return {
    accentTheme: normalizedTheme,
    autoRescanAfterDeviceSave:
      typeof rawSettings?.autoRescanAfterDeviceSave === "boolean"
        ? rawSettings.autoRescanAfterDeviceSave
        : DEFAULT_SETTINGS.autoRescanAfterDeviceSave,
    suggestionMode: normalizedSuggestionMode,
    language: normalizedLanguage,
    customSignature: String(rawSettings?.customSignature || "").trim(),
  };
}

function persistSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences.settings));
}

async function initialize() {
  await loadGroupSuggestionTemplates();
  bindEvents();
  elements.operatorInput.value = preferences.operator;
  setActiveView(activeView);
  syncSettingsForm();
  applyVisualSettings();
  applyLocalizedUi();
  renderTemplateEditor();
  renderAll();
  await refreshState();
  connectLiveStream();
  pollIntervalId = window.setInterval(() => {
    refreshState(true);
  }, 30000);
}

function bindEvents() {
  elements.subnetForm.addEventListener("submit", handleSubnetSubmit);
  elements.deviceForm.addEventListener("submit", handleDeviceSubmit);
  elements.groupForm.addEventListener("submit", handleGroupSubmit);
  elements.searchInput.addEventListener("input", renderDevicesTable);
  elements.ipCheckForm.addEventListener("submit", handleIpCheck);
  elements.operatorInput.addEventListener("input", handleOperatorInput);
  elements.viewTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.viewTab);
    });
  });
  elements.openModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleOpenModalRequest(button.dataset.openModal);
    });
  });
  elements.closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.closeModal);
    });
  });
  elements.modalBackdrops.forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });
  elements.scanNowButton.addEventListener("click", handleScanNow);
  elements.subnetSelect.addEventListener("change", handleDeviceSubnetChange);
  elements.deviceGroupSelect.addEventListener("change", handleDeviceGroupChange);
  elements.deviceForm.elements.type.addEventListener("change", handleDeviceTypeChange);
  elements.deviceForm.elements.ip.addEventListener("input", updateSuggestedIp);
  elements.applySuggestionButton.addEventListener("click", applySuggestedIp);
  elements.settingsLanguageSelect.addEventListener("change", handleSettingsChange);
  elements.settingsSignatureInput.addEventListener("input", handleSignatureInput);
  elements.settingsThemeSelect.addEventListener("change", handleSettingsChange);
  elements.settingsAutoRescan.addEventListener("change", handleSettingsChange);
  elements.settingsSuggestionMode.addEventListener("change", handleSettingsChange);
  elements.saveServerSettingsButton.addEventListener("click", handleServerSettingsSave);
  elements.saveTemplateSettingsButton.addEventListener("click", handleTemplateSettingsSave);
  elements.resetTemplateSettingsButton.addEventListener("click", handleTemplateSettingsReset);
  elements.exportJsonButton.addEventListener("click", exportJson);
  elements.exportSubnetsCsvButton.addEventListener("click", exportSubnetsCsv);
  elements.exportGroupsCsvButton.addEventListener("click", exportGroupsCsv);
  elements.exportDevicesCsvButton.addEventListener("click", exportDevicesCsv);
  elements.importButton.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", handleImportFile);
  elements.clearDataButton.addEventListener("click", clearAllData);
  elements.subnetsTableBody.addEventListener("click", handleSubnetTableActions);
  elements.groupsTableBody.addEventListener("click", handleGroupTableActions);
  elements.devicesTableBody.addEventListener("click", handleDeviceTableActions);
  window.addEventListener("focus", () => refreshState(true));
  window.addEventListener("keydown", handleGlobalKeydown);
}

async function loadGroupSuggestionTemplates() {
  try {
    const localTemplates = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (localTemplates) {
      const parsedTemplates = JSON.parse(localTemplates);
      const normalizedLocalTemplates = normalizeGroupSuggestionTemplates(parsedTemplates);
      if (normalizedLocalTemplates.length > 0) {
        groupSuggestionTemplates = normalizedLocalTemplates;
        groupSuggestionTemplateSource = "local";
        return;
      }
    }

    const response = await fetch(GROUP_SUGGESTION_TEMPLATES_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const normalizedTemplates = normalizeGroupSuggestionTemplates(payload);
    if (normalizedTemplates.length > 0) {
      groupSuggestionTemplates = normalizedTemplates;
      groupSuggestionTemplateSource = "bundled";
      return;
    }
  } catch (error) {
    console.warn("Failed to load group suggestion templates, using fallback set.", error);
  }

  groupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
  groupSuggestionTemplateSource = "default";
}

function normalizeGroupSuggestionTemplates(rawTemplates) {
  if (!Array.isArray(rawTemplates)) {
    return [];
  }

  return rawTemplates
    .map((template) => {
      const id = String(template?.id || "").trim();
      const label = String(template?.label || "").trim();
      const deviceTypes = Array.isArray(template?.deviceTypes)
        ? template.deviceTypes
            .map((item) => String(item || "").trim().toLowerCase())
            .filter((item) => DEVICE_TYPES[item])
        : [];
      const keywords = Array.isArray(template?.keywords)
        ? template.keywords
            .map((item) => normalizeSearchableText(item))
            .filter(Boolean)
        : [];

      if (!id || !label || deviceTypes.length === 0 || keywords.length === 0) {
        return null;
      }

      return {
        id,
        label,
        deviceTypes,
        keywords,
      };
    })
    .filter(Boolean);
}

function syncSettingsForm() {
  elements.settingsLanguageSelect.value = preferences.settings.language;
  elements.settingsSignatureInput.value = preferences.settings.customSignature;
  elements.settingsThemeSelect.value = preferences.settings.accentTheme;
  elements.settingsAutoRescan.checked = preferences.settings.autoRescanAfterDeviceSave;
  elements.settingsSuggestionMode.value = preferences.settings.suggestionMode;
  const currentScanInterval = state.settings?.scanIntervalSeconds || state.meta?.scanIntervalSeconds || 90;
  if (document.activeElement !== elements.settingsScanInterval) {
    elements.settingsScanInterval.value = String(currentScanInterval);
  }

  const minInterval = state.settings?.limits?.scanIntervalMin || 15;
  const maxInterval = state.settings?.limits?.scanIntervalMax || 3600;
  elements.settingsScanInterval.min = String(minInterval);
  elements.settingsScanInterval.max = String(maxInterval);
  elements.settingsPingMeta.textContent = t("ping_meta", {
    interval: currentScanInterval,
    timeout: state.settings?.scanTimeoutMs || 1000,
    concurrency: state.settings?.scanConcurrency || 32,
  });
}

function applyVisualSettings() {
  document.body.dataset.accentTheme = preferences.settings.accentTheme;
}

function renderTemplateEditor() {
  if (document.activeElement !== elements.templateEditor) {
    elements.templateEditor.value = JSON.stringify(groupSuggestionTemplates, null, 2);
  }

  const sourceLabel =
    groupSuggestionTemplateSource === "local"
      ? t("templates_source_local")
      : groupSuggestionTemplateSource === "bundled"
        ? t("templates_source_bundled")
        : t("templates_source_default");
  setTemplateSettingsStatus(sourceLabel, "muted");
}

function setTemplateSettingsStatus(message, tone = "muted") {
  elements.templateSettingsStatus.className = `result-card result-card--${tone}`;
  elements.templateSettingsStatus.textContent = message;
}

function setDeviceFormStatus(message, tone = "muted", visible = true) {
  elements.deviceFormStatus.className = `result-card result-card--${tone} form-grid__full`;
  elements.deviceFormStatus.textContent = message;
  elements.deviceFormStatus.hidden = !visible;
}

function clearDeviceFormStatus() {
  setDeviceFormStatus(t("device_form_idle"), "muted", false);
}

function setDeviceFormPending(isPending) {
  const submitButton = elements.deviceForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.disabled = isPending;
    submitButton.textContent = isPending ? t("device_form_saving") : t("save_device");
  }

  elements.applySuggestionButton.disabled = isPending || !elements.applySuggestionButton.dataset.suggestedIp;
}

function setServerSettingsStatus(message, tone = "muted") {
  elements.serverSettingsStatus.className = `result-card result-card--${tone}`;
  elements.serverSettingsStatus.textContent = message;
}

function handleSettingsChange() {
  preferences.settings = normalizeSettings({
    language: elements.settingsLanguageSelect.value,
    customSignature: elements.settingsSignatureInput.value,
    accentTheme: elements.settingsThemeSelect.value,
    autoRescanAfterDeviceSave: elements.settingsAutoRescan.checked,
    suggestionMode: elements.settingsSuggestionMode.value,
  });
  persistSettings();
  applyVisualSettings();
  applyLocalizedUi();
  renderDeviceGroupOptions();
  renderAll();
  updateSuggestedIp();
}

function handleSignatureInput() {
  preferences.settings = normalizeSettings({
    ...preferences.settings,
    customSignature: elements.settingsSignatureInput.value,
  });
  persistSettings();
  applyLocalizedUi();
}

async function handleServerSettingsSave() {
  try {
    const interval = Number.parseInt(elements.settingsScanInterval.value, 10);
    const minInterval = state.settings?.limits?.scanIntervalMin || 15;
    const maxInterval = state.settings?.limits?.scanIntervalMax || 3600;

    if (!Number.isInteger(interval) || interval < minInterval || interval > maxInterval) {
      throw new Error(t("ping_interval_invalid", { min: minInterval, max: maxInterval }));
    }

    await apiRequest("/settings", {
      method: "PATCH",
      body: JSON.stringify({ scanIntervalSeconds: interval }),
    });
    await refreshState(true);
    syncSettingsForm();
    setServerSettingsStatus(t("ping_interval_saved", { interval }), "ok");
    showToast(t("ping_interval_toast", { interval }));
  } catch (error) {
    setServerSettingsStatus(error.message || t("server_data_load_failed"), "danger");
  }
}

function handleTemplateSettingsSave() {
  try {
    const parsedTemplates = JSON.parse(elements.templateEditor.value);
    const normalizedTemplates = normalizeGroupSuggestionTemplates(parsedTemplates);
    if (normalizedTemplates.length === 0) {
      throw new Error(t("templates_invalid"));
    }

    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(normalizedTemplates));
    groupSuggestionTemplates = normalizedTemplates;
    groupSuggestionTemplateSource = "local";
    renderDeviceGroupOptions();
    updateSuggestedIp();
    renderTemplateEditor();
    setTemplateSettingsStatus(t("templates_saved"), "ok");
  } catch (error) {
    setTemplateSettingsStatus(error.message || t("templates_invalid"), "danger");
  }
}

async function handleTemplateSettingsReset() {
  localStorage.removeItem(CUSTOM_TEMPLATES_STORAGE_KEY);
  await loadGroupSuggestionTemplates();
  renderDeviceGroupOptions();
  updateSuggestedIp();
  renderTemplateEditor();
  setTemplateSettingsStatus(t("templates_reset_done"), "warn");
}

function handleOpenModalRequest(modalId) {
  if (!modalId) {
    return;
  }

  if (modalId === "settings-modal") {
    openSettingsModal();
    return;
  }

  openModal(modalId);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }

  const currentModal = getOpenModal();
  if (currentModal && currentModal.id !== modalId) {
    currentModal.hidden = true;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
  if (modalId === "device-modal") {
    clearDeviceFormStatus();
    setDeviceFormPending(false);
  }
  const closeButton = modal.querySelector("[data-close-modal]");
  closeButton?.focus();
}

function closeModal(modalId) {
  const modal = modalId ? document.getElementById(modalId) : getOpenModal();
  if (!modal) {
    return;
  }

  modal.hidden = true;
  if (modal.id === "device-modal") {
    clearDeviceFormStatus();
    setDeviceFormPending(false);
  }
  if (!getOpenModal()) {
    document.body.classList.remove("modal-open");
  }
}

function getOpenModal() {
  return elements.modalBackdrops.find((modal) => !modal.hidden) || null;
}

function openSettingsModal() {
  syncSettingsForm();
  renderTemplateEditor();
  setServerSettingsStatus(t("ping_server_running", {
    interval: state.settings?.scanIntervalSeconds || 90,
  }), "muted");
  openModal("settings-modal");
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && getOpenModal()) {
    closeModal();
  }
}

function setActiveView(viewName) {
  activeView = viewName || "dashboard";

  elements.viewTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTab === activeView);
  });

  elements.pageViews.forEach((view) => {
    const isActive = view.dataset.view === activeView;
    view.hidden = !isActive;
    view.classList.toggle("is-active", isActive);
  });
}

async function refreshState(silent = false) {
  try {
    const snapshot = await apiRequest("/state");
    applyState(normalizeState(snapshot));
    renderAll();
  } catch (error) {
    console.error(error);
    if (!silent) {
      showToast(error.message || t("server_data_load_failed"), true);
    }
  }
}

function connectLiveStream() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`${API_BASE}/stream`);
  setLiveStatus(t("live_connecting"), "info");

  eventSource.onopen = () => {
    setLiveStatus(t("live_badge"), "ok");
  };

  eventSource.onmessage = async () => {
    await refreshState(true);
  };

  eventSource.onerror = () => {
    setLiveStatus(t("live_reconnecting"), "warn");
  };
}

function applyState(snapshot) {
  state.subnets = snapshot.subnets;
  state.groups = snapshot.groups;
  state.devices = snapshot.devices;
  state.scanResults = snapshot.scanResults;
  state.history = snapshot.history;
  state.meta = snapshot.meta;
  state.settings = snapshot.settings;
}

async function handleSubnetSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const formData = new FormData(form);
    const subnet = normalizeSubnet({
      id: createId(),
      name: formData.get("name"),
      cidr: formData.get("cidr"),
      rangeStart: formData.get("rangeStart"),
      rangeEnd: formData.get("rangeEnd"),
      note: formData.get("note"),
      createdAt: new Date().toISOString(),
    });

    await apiRequest("/subnets", {
      method: "POST",
      body: JSON.stringify(subnet),
    });

    await refreshState(true);
    form.reset();
    closeModal("subnet-modal");
    showToast(t("subnet_added", { name: subnet.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleDeviceSubmit(event) {
  event.preventDefault();
  if (isDeviceSubmitting) {
    return;
  }
  const form = event.currentTarget;
  isDeviceSubmitting = true;
  setDeviceFormPending(true);
  setDeviceFormStatus(t("device_form_saving"), "muted");

  try {
    const formData = new FormData(form);
    const selectedGroupId = String(formData.get("groupId") || "").trim();
    const device = normalizeDevice(
      {
        id: createId(),
        name: formData.get("name"),
        ip: formData.get("ip"),
        mac: formData.get("mac"),
        type: formData.get("type"),
        subnetId: formData.get("subnetId"),
        groupId: formData.get("groupId"),
        note: formData.get("note"),
        createdAt: new Date().toISOString(),
      },
      state.subnets,
      state.groups
    );

    await apiRequest("/devices", {
      method: "POST",
      body: JSON.stringify(device),
    });

    form.reset();
    deviceGroupSelectionMode = "auto";
    closeModal("device-modal");

    try {
      if (preferences.settings.autoRescanAfterDeviceSave) {
        await rescanScopeForDevice(device, selectedGroupId);
      }
      await refreshState(true);
    } catch (followUpError) {
      console.error(followUpError);
    }

    showToast(t("device_added", { name: device.name }));
  } catch (error) {
    setDeviceFormStatus(error.message, "danger");
    showToast(error.message, true);
  } finally {
    isDeviceSubmitting = false;
    setDeviceFormPending(false);
  }
}

async function handleGroupSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const formData = new FormData(form);
    const group = normalizeRangeGroup(
      {
        id: createId(),
        subnetId: formData.get("subnetId"),
        name: formData.get("name"),
        rangeStart: formData.get("rangeStart"),
        rangeEnd: formData.get("rangeEnd"),
        note: formData.get("note"),
        createdAt: new Date().toISOString(),
      },
      state.subnets,
      state.groups
    );

    const savedGroup = await apiRequest("/groups", {
      method: "POST",
      body: JSON.stringify(group),
    });

    let scanSummary = null;
    let scanError = null;
    try {
      scanSummary = await apiRequest("/scan", {
        method: "POST",
        body: JSON.stringify({ groupId: savedGroup.id }),
      });
    } catch (error) {
      scanError = error;
      console.error(error);
    }

    await refreshState(true);
    form.reset();
    closeModal("group-modal");

    if (scanSummary) {
      const refreshedGroup = state.groups.find((entry) => entry.id === savedGroup.id);
      const reachableSet = getReachableScanIps();
      const busyCount = refreshedGroup
        ? countBusyInGroup(refreshedGroup, reachableSet)
        : scanSummary.reachableIps;
      const freeCount = refreshedGroup
        ? Math.max(refreshedGroup.rangeEndInt - refreshedGroup.rangeStartInt + 1 - busyCount, 0)
        : "—";
      showToast(t("group_added_scanned", {
        name: group.name,
        scanned: scanSummary.scannedIps,
        busy: busyCount,
        free: freeCount,
      }));
      return;
    }

    if (scanError) {
      showToast(t("group_added_scan_failed", { name: group.name }), true);
      return;
    }

    showToast(t("group_added", { name: group.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleScanNow() {
  if (isManualScanRunning) {
    return;
  }

  isManualScanRunning = true;
  elements.scanNowButton.disabled = true;
  elements.scanNowButton.textContent = t("scan_now_running");
  setScanStatus(t("scan_status_running"), "info");

  try {
    const summary = await apiRequest("/scan", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refreshState(true);
    showToast(t("manual_scan_done", {
      subnets: summary.scannedSubnets,
      ips: summary.scannedIps,
      reachable: summary.reachableIps,
    }));
  } catch (error) {
    showToast(error.message, true);
  } finally {
    isManualScanRunning = false;
    elements.scanNowButton.disabled = false;
    elements.scanNowButton.textContent = t("scan_now_button");
    updateAutomationWidgets();
  }
}

function handleOperatorInput(event) {
  preferences.operator = event.currentTarget.value.trim();
  localStorage.setItem(OPERATOR_STORAGE_KEY, preferences.operator);
  updateAutomationWidgets();
}

function handleIpCheck(event) {
  event.preventDefault();
  const ip = event.currentTarget.ipCheck.value.trim();

  try {
    assertValidIp(ip, t("ip_invalid_check"));
  } catch (error) {
    renderIpCheckResult(error.message, "danger");
    return;
  }

  const normalizedIp = normalizeIp(ip);
  const ipInt = ipToInt(normalizedIp);
  const subnet = findSubnetForIp(ipInt);
  const group = subnet ? findRangeGroupForIp(ipInt, subnet.id) : null;
  const device = state.devices.find((entry) => entry.ip === normalizedIp);
  const pingState = getPingState(normalizedIp);

  if (device) {
    const parts = [t("ip_check_assigned", { ip: normalizedIp, name: device.name })];
    if (subnet) {
      parts.push(t("ip_check_subnet", { name: subnet.name, cidr: subnet.cidr }));
    }
    if (group) {
      parts.push(t("ip_check_group", { name: group.name, range: formatGroupRange(group, true) }));
    }
    if (pingState?.isReachable) {
      parts.push(t("ip_ping_reachable"));
    } else if (pingState) {
      parts.push(t("ip_ping_unreachable"));
    }
    renderIpCheckResult(parts.join(" "), "danger");
    return;
  }

  if (pingState?.isReachable) {
    const parts = [t("ip_check_untracked_reachable", { ip: normalizedIp })];
    if (subnet) {
      parts.push(t("ip_check_subnet", { name: subnet.name, cidr: subnet.cidr }));
    }
    if (group) {
      parts.push(t("ip_check_group", { name: group.name, range: formatGroupRange(group, true) }));
    }
    renderIpCheckResult(parts.join(" "), "warn");
    return;
  }

  if (!subnet) {
    renderIpCheckResult(t("ip_check_free_unregistered", { ip: normalizedIp }), "warn");
    return;
  }

  const parts = [t("ip_check_free_in_subnet", { ip: normalizedIp, name: subnet.name, cidr: subnet.cidr })];
  const inPool = isIpInsidePool(ipInt, subnet);
  if (!inPool) {
    parts.push(t("ip_check_outside_pool"));
  }
  if (group) {
    parts.push(t("ip_check_in_group", { name: group.name, range: formatGroupRange(group, true) }));
  }
  renderIpCheckResult(parts.join(" "), inPool ? "ok" : "warn");
}

function updateAutomationWidgets() {
  const lastScanAt = state.meta?.lastScanAt;
  const reachableCount = getReachableScanIps().size;
  const operatorLabel = preferences.operator || t("operator_not_set");

  if (state.meta?.scanInProgress || isManualScanRunning) {
    setScanStatus(t("scan_status_running"), "info");
    elements.scanStatusText.textContent = t("scan_scope_all");
  } else if (lastScanAt) {
    setScanStatus(t("scan_status_online", { count: reachableCount }), reachableCount > 0 ? "ok" : "warn");
    elements.scanStatusText.textContent = t("scan_last_run", {
      date: formatDateTime(lastScanAt),
      seconds: state.meta.scanIntervalSeconds || 90,
    });
  } else {
    setScanStatus(t("scan_status_idle"), "warn");
    elements.scanStatusText.textContent = t("scan_not_started");
  }

  elements.liveSummaryText.textContent = t("live_summary", { operator: operatorLabel });
}

function updateSuggestedIp() {
  const subnetId = elements.subnetSelect.value;
  const groupId = elements.deviceGroupSelect.value;
  if (!subnetId) {
    elements.deviceSuggestion.className = "result-card result-card--muted form-grid__full";
    elements.deviceSuggestion.textContent = t("device_suggestion_hint");
    elements.applySuggestionButton.disabled = true;
    delete elements.applySuggestionButton.dataset.suggestedIp;
    return;
  }

  const subnet = state.subnets.find((entry) => entry.id === subnetId);
  if (!subnet) {
    elements.deviceSuggestion.className = "result-card result-card--warn form-grid__full";
    elements.deviceSuggestion.textContent = t("suggestion_subnet_missing");
    elements.applySuggestionButton.disabled = true;
    delete elements.applySuggestionButton.dataset.suggestedIp;
    return;
  }

  const group = groupId
    ? state.groups.find((entry) => entry.id === groupId && entry.subnetId === subnet.id) || null
    : null;
  if (groupId && !group) {
    elements.deviceSuggestion.className = "result-card result-card--warn form-grid__full";
    elements.deviceSuggestion.textContent = t("suggestion_group_missing");
    elements.applySuggestionButton.disabled = true;
    delete elements.applySuggestionButton.dataset.suggestedIp;
    return;
  }

  const suggestion = suggestFreeIp(subnet, group);
  if (!suggestion) {
    elements.deviceSuggestion.className = "result-card result-card--danger form-grid__full";
    elements.deviceSuggestion.textContent = group
      ? t("suggestion_no_free_group", { name: group.name, range: formatGroupRange(group, true) })
      : t("suggestion_no_free_subnet", { name: subnet.name, cidr: subnet.cidr });
    elements.applySuggestionButton.disabled = true;
    delete elements.applySuggestionButton.dataset.suggestedIp;
    return;
  }

  const existingValue = elements.deviceForm.elements.ip.value.trim();
  const isAlreadyUsingSuggestion = existingValue && normalizeIpSafe(existingValue) === suggestion.ip;
  elements.deviceSuggestion.className = "result-card result-card--ok form-grid__full";
  elements.deviceSuggestion.textContent = formatSuggestionMessage(suggestion, subnet, group);
  elements.applySuggestionButton.disabled = isDeviceSubmitting || isAlreadyUsingSuggestion;
  elements.applySuggestionButton.dataset.suggestedIp = suggestion.ip;
}

function applySuggestedIp() {
  const suggestedIp = elements.applySuggestionButton.dataset.suggestedIp;
  if (!suggestedIp) {
    return;
  }

  elements.deviceForm.elements.ip.value = suggestedIp;
  updateSuggestedIp();
  showToast(t("suggested_ip_applied", { ip: suggestedIp }));
}

function formatSuggestionMessage(suggestion, subnet, group = null) {
  if (preferences.settings.suggestionMode === "detailed") {
    if (group) {
      return t("suggestion_detailed_group", {
        name: group.name,
        ip: suggestion.ip,
        range: formatGroupRange(group, true),
        busy: suggestion.busyCount,
        free: suggestion.freeCount,
        assigned: suggestion.assignedCount,
        reachable: suggestion.reachableCount,
      });
    }

    return t("suggestion_detailed_subnet", {
      name: subnet.name,
      ip: suggestion.ip,
      range: `${subnet.rangeStart}-${subnet.rangeEnd}`,
      busy: suggestion.busyCount,
      free: suggestion.freeCount,
      assigned: suggestion.assignedCount,
      reachable: suggestion.reachableCount,
    });
  }

  return group
    ? t("suggestion_compact_group", {
      name: group.name,
      ip: suggestion.ip,
      busy: suggestion.busyCount,
      free: suggestion.freeCount,
      assigned: suggestion.assignedCount,
      reachable: suggestion.reachableCount,
    })
    : t("suggestion_compact_subnet", {
      ip: suggestion.ip,
      busy: suggestion.busyCount,
      free: suggestion.freeCount,
      assigned: suggestion.assignedCount,
      reachable: suggestion.reachableCount,
    });
}

function suggestFreeIp(subnet, group = null) {
  const assignedIps = new Set(
    state.devices
      .filter((device) => {
        const ipInt = ipToInt(device.ip);
        if (!isIpInsidePool(ipInt, subnet)) {
          return false;
        }
        if (group) {
          return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
        }
        return true;
      })
      .map((device) => device.ip)
  );
  const reachableIps = new Set(
    state.scanResults
      .filter((result) => {
        if (result.subnetId !== subnet.id || !result.isReachable) {
          return false;
        }
        if (!group) {
          return true;
        }
        const ipInt = ipToInt(result.ip);
        return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
      })
      .map((result) => result.ip)
  );
  const busyIps = new Set([...assignedIps, ...reachableIps]);

  const startInt = group ? group.rangeStartInt : subnet.rangeStartInt;
  const endInt = group ? group.rangeEndInt : subnet.rangeEndInt;
  for (let ipInt = startInt; ipInt <= endInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (!busyIps.has(ip)) {
      return {
        ip,
        assignedCount: assignedIps.size,
        reachableCount: reachableIps.size,
        busyCount: busyIps.size,
        freeCount: Math.max(endInt - startInt + 1 - busyIps.size, 0),
      };
    }
  }

  return null;
}

async function rescanScopeForDevice(device, selectedGroupId = "") {
  const subnetId = device.subnetId || findSubnetForIp(ipToInt(device.ip), state.subnets)?.id || "";
  const group =
    (selectedGroupId
      ? state.groups.find((entry) => entry.id === selectedGroupId && entry.subnetId === subnetId) || null
      : null) || (subnetId ? findRangeGroupForIp(ipToInt(device.ip), subnetId) : null);

  try {
    if (group) {
      await apiRequest("/scan", {
        method: "POST",
        body: JSON.stringify({ groupId: group.id }),
      });
      return;
    }

    if (subnetId) {
      await apiRequest("/scan", {
        method: "POST",
        body: JSON.stringify({ subnetId }),
      });
    }
  } catch (error) {
    console.warn("Не удалось обновить scan для подсказки IP после сохранения устройства.", error);
  }
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: "0.2",
    subnets: state.subnets,
    groups: state.groups,
    devices: state.devices,
    scanResults: state.scanResults,
    history: state.history,
  };

  downloadFile(
    `atlas-${timestampForFile()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
  closeModal("export-modal");
}

function exportSubnetsCsv() {
  const rows = state.subnets.map((subnet) => ({
    [t("export_header_id")]: subnet.id,
    [t("export_header_name")]: subnet.name,
    [t("export_header_cidr")]: subnet.cidr,
    [t("export_header_network")]: subnet.network,
    [t("export_header_mask")]: subnet.maskBits,
    [t("export_header_pool_start")]: subnet.rangeStart,
    [t("export_header_pool_end")]: subnet.rangeEnd,
    [t("export_header_usable_hosts")]: subnet.usableHosts,
    [t("export_header_note")]: subnet.note,
  }));

  downloadFile(
    `atlas-subnets-${timestampForFile()}.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8"
  );
  closeModal("export-modal");
}

function exportGroupsCsv() {
  const rows = state.groups.map((group) => {
    const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
    return {
      [t("export_header_id")]: group.id,
      [t("export_header_name")]: group.name,
      [t("export_header_subnet_id")]: group.subnetId,
      [t("export_header_subnet")]: subnet?.name || "",
      [t("export_header_cidr")]: subnet?.cidr || "",
      [t("export_header_range_start")]: group.rangeStart,
      [t("export_header_range_end")]: group.rangeEnd,
      [t("export_header_note")]: group.note,
    };
  });

  downloadFile(
    `atlas-groups-${timestampForFile()}.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8"
  );
  closeModal("export-modal");
}

function exportDevicesCsv() {
  const rows = state.devices.map((device) => {
    const subnet = resolveDeviceSubnet(device);
    const group = resolveDeviceGroup(device, subnet);
    const pingState = getPingState(device.ip);
    return {
      [t("export_header_id")]: device.id,
      [t("export_header_name")]: device.name,
      [t("export_header_ip")]: device.ip,
      [t("export_header_mac")]: device.mac || "",
      [t("export_header_type")]: getDeviceTypeLabel(device.type),
      [t("export_header_subnet_id")]: device.subnetId || "",
      [t("export_header_subnet")]: subnet?.name || "",
      [t("export_header_cidr")]: subnet?.cidr || "",
      [t("export_header_group_id")]: group?.id || "",
      [t("export_header_group")]: group?.name || "",
      [t("export_header_ping")]: pingState ? (pingState.isReachable ? "online" : "offline") : "",
      [t("export_header_note")]: device.note,
    };
  });

  downloadFile(
    `atlas-devices-${timestampForFile()}.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8"
  );
  closeModal("export-modal");
}

async function handleImportFile(event) {
  const [file] = event.currentTarget.files || [];
  if (!file) {
    return;
  }

  const snapshotBeforeImport = cloneState(state);

  try {
    const text = await file.text();
    const shouldReplace = window.confirm(t("import_confirm_replace"));

    if (file.name.toLowerCase().endsWith(".json")) {
      importJson(text, shouldReplace, state);
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      importCsv(text, shouldReplace, state);
    } else {
      throw new Error(t("import_supported_only"));
    }

    await apiRequest("/state", {
      method: "PUT",
      body: JSON.stringify(state),
    });

    await refreshState(true);
    showToast(t("import_success", { name: file.name }));
  } catch (error) {
    applyState(snapshotBeforeImport);
    renderAll();
    showToast(error.message, true);
  } finally {
    event.currentTarget.value = "";
  }
}

function importJson(text, replace, targetState) {
  const parsed = JSON.parse(text);
  const normalized = normalizeState(parsed, replace ? [] : targetState.groups);

  if (replace) {
    applyStateToTarget(targetState, normalized);
    return;
  }

  targetState.subnets = mergeById(targetState.subnets, normalized.subnets);
  targetState.groups = mergeById(targetState.groups, normalized.groups);
  targetState.devices = mergeById(targetState.devices, normalized.devices);
  targetState.scanResults = mergeByKey(targetState.scanResults, normalized.scanResults, (item) => item.ip);
  targetState.history = mergeByKey(targetState.history, normalized.history, (item) => String(item.id));
}

function importCsv(text, replace, targetState) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error(t("csv_empty"));
  }

  const headers = Object.keys(rows[0]).map((key) => key.toLowerCase());
  const looksLikeDeviceCsv = headers.includes("ip");
  const looksLikeGroupCsv =
    headers.includes("range_start") &&
    headers.includes("range_end") &&
    (headers.includes("subnet_id") || headers.includes("subnet_name") || headers.includes("subnet_cidr"));
  const looksLikeSubnetCsv = headers.includes("cidr") && !looksLikeDeviceCsv && !looksLikeGroupCsv;

  if (!looksLikeSubnetCsv && !looksLikeGroupCsv && !looksLikeDeviceCsv) {
    throw new Error(t("csv_unknown"));
  }

  if (replace && looksLikeSubnetCsv) {
    targetState.subnets = [];
    targetState.groups = [];
    targetState.devices = looksLikeDeviceCsv ? targetState.devices : [];
    targetState.scanResults = [];
    targetState.history = [];
  }

  if (looksLikeSubnetCsv) {
    const importedSubnets = rows.map((row) =>
      normalizeSubnet({
        id: row.id || createId(),
        name: row.name,
        cidr: row.cidr,
        rangeStart: row.range_start || row.rangeStart,
        rangeEnd: row.range_end || row.rangeEnd,
        note: row.note,
      })
    );

    targetState.subnets = replace ? importedSubnets : mergeById(targetState.subnets, importedSubnets);
  }

  if (looksLikeGroupCsv) {
    if (replace) {
      targetState.groups = [];
    }

    const importedGroups = [];
    rows.forEach((row, index) => {
      const subnet = findSubnetByReference(row, targetState.subnets);
      if (!subnet) {
        throw new Error(t("csv_group_subnet_missing", { row: index + 2 }));
      }

      importedGroups.push(
        normalizeRangeGroup(
          {
            id: row.id || createId(),
            subnetId: subnet.id,
            name: row.name,
            rangeStart: row.range_start || row.rangeStart,
            rangeEnd: row.range_end || row.rangeEnd,
            note: row.note,
          },
          targetState.subnets,
          replace ? importedGroups : [...targetState.groups, ...importedGroups]
        )
      );
    });

    targetState.groups = replace ? importedGroups : mergeById(targetState.groups, importedGroups);
  }

  if (looksLikeDeviceCsv) {
    const importedDevices = rows.map((row) => {
      const subnet = findSubnetByReference(row, targetState.subnets);
      return normalizeDevice(
        {
          id: row.id || createId(),
          name: row.name,
          ip: row.ip,
          mac: row.mac,
          type: row.type,
          subnetId: subnet?.id || row.subnet_id || "",
          note: row.note,
        },
        targetState.subnets
      );
    });

    targetState.devices = replace ? importedDevices : mergeById(targetState.devices, importedDevices);
  }
}

async function clearAllData() {
  const confirmed = window.confirm(t("clear_confirm"));
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest("/state", {
      method: "DELETE",
    });
    applyState(
      normalizeState({
        subnets: [],
        groups: [],
        devices: [],
        scanResults: [],
        history: [],
        meta: {},
      })
    );
    renderAll();
    showToast(t("clear_success"));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleSubnetTableActions(event) {
  const button = event.target.closest("[data-delete-subnet]");
  if (!button) {
    return;
  }

  const subnetId = button.dataset.deleteSubnet;
  const subnet = state.subnets.find((entry) => entry.id === subnetId);
  if (!subnet) {
    return;
  }

  const linkedDevices = state.devices.filter((entry) => entry.subnetId === subnetId).length;
  const linkedGroups = state.groups.filter((entry) => entry.subnetId === subnetId).length;
  const confirmed = window.confirm(t("delete_subnet_confirm", {
    name: subnet.name,
    devices: linkedDevices,
    groups: linkedGroups,
  }));

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/subnets/${encodeURIComponent(subnetId)}`, {
      method: "DELETE",
    });
    await refreshState(true);
    showToast(t("subnet_deleted", { name: subnet.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleGroupTableActions(event) {
  const button = event.target.closest("[data-delete-group]");
  if (!button) {
    return;
  }

  const groupId = button.dataset.deleteGroup;
  const group = state.groups.find((entry) => entry.id === groupId);
  if (!group) {
    return;
  }

  const confirmed = window.confirm(t("delete_group_confirm", { name: group.name }));
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/groups/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    });
    await refreshState(true);
    showToast(t("group_deleted", { name: group.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleDeviceTableActions(event) {
  const button = event.target.closest("[data-delete-device]");
  if (!button) {
    return;
  }

  const deviceId = button.dataset.deleteDevice;
  const device = state.devices.find((entry) => entry.id === deviceId);
  if (!device) {
    return;
  }

  const confirmed = window.confirm(t("delete_device_confirm", { name: device.name }));
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
    await refreshState(true);
    showToast(t("device_deleted", { name: device.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderAll() {
  syncSettingsForm();
  renderSubnetOptions();
  renderSubnetsTable();
  renderGroupsTable();
  renderDevicesTable();
  renderHistoryTable();
  renderStats();
  renderDashboardPanels();
  updateAutomationWidgets();
  updateSuggestedIp();
}

function renderSubnetOptions() {
  const previousDeviceSubnet = elements.subnetSelect.value;
  const previousDeviceGroup = elements.deviceGroupSelect.value;
  const previousGroupSubnet = elements.groupSubnetSelect.value;
  const options = [`<option value="">${escapeHtml(t("auto_detect_ip"))}</option>`];
  const requiredOptions = [`<option value="">${escapeHtml(t("select_subnet"))}</option>`];

  state.subnets
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .forEach((subnet) => {
      const optionLabel = `${escapeHtml(subnet.name)} · ${escapeHtml(subnet.cidr)}`;
      options.push(`<option value="${escapeHtml(subnet.id)}">${optionLabel}</option>`);
      requiredOptions.push(`<option value="${escapeHtml(subnet.id)}">${optionLabel}</option>`);
    });

  elements.subnetSelect.innerHTML = options.join("");
  elements.groupSubnetSelect.innerHTML = requiredOptions.join("");
  elements.subnetSelect.value = previousDeviceSubnet;
  elements.groupSubnetSelect.value = previousGroupSubnet;
  renderDeviceGroupOptions(previousDeviceGroup);
}

function renderSubnetsTable() {
  if (state.subnets.length === 0) {
    elements.subnetsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">${escapeHtml(t("empty_subnets"))}</td>
      </tr>
    `;
    elements.subnetsCounter.textContent = formatRecordsCount(0);
    return;
  }

  const reachableScanIps = getReachableScanIps();
  const rows = state.subnets
    .slice()
    .sort((left, right) => left.rangeStartInt - right.rangeStartInt)
    .map((subnet) => {
      const assignedCount = getDevicesInSubnet(subnet).length;
      const reachableCount = countReachableInSubnet(subnet, reachableScanIps);
      const busyCount = countBusyInSubnet(subnet, reachableScanIps);
      const freeCount = Math.max(subnet.poolSize - busyCount, 0);
      const groups = getGroupsInSubnet(subnet.id);
      const groupSummary = groups.length === 0
        ? t("no_data")
        : `${groups.length} · ${groups
            .slice(0, 2)
            .map((group) => group.name)
            .join(", ")}${groups.length > 2 ? "…" : ""}`;

      return `
        <tr>
          <td><strong>${escapeHtml(subnet.name)}</strong></td>
          <td class="mono">${escapeHtml(subnet.cidr)}</td>
          <td class="mono">${escapeHtml(subnet.rangeStart)} - ${escapeHtml(subnet.rangeEnd)}</td>
          <td>
            <span class="pill">${escapeHtml(t("in_database_short", { count: assignedCount }))}</span>
            <span class="pill">${escapeHtml(t("ping_short", { count: reachableCount }))}</span>
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </td>
          <td><div class="secondary-line">${escapeHtml(groupSummary)}</div></td>
          <td>${escapeHtml(subnet.note || t("no_data"))}</td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-subnet="${escapeHtml(subnet.id)}">${escapeHtml(t("delete_row"))}</button>
          </td>
        </tr>
      `;
    });

  elements.subnetsTableBody.innerHTML = rows.join("");
  elements.subnetsCounter.textContent = formatRecordsCount(state.subnets.length);
}

function renderGroupsTable() {
  if (state.groups.length === 0) {
    elements.groupsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">${escapeHtml(t("empty_groups"))}</td>
      </tr>
    `;
    elements.groupsCounter.textContent = formatRecordsCount(0);
    return;
  }

  const reachableSet = getReachableScanIps();
  const rows = state.groups
    .slice()
    .sort((left, right) => {
      if (left.subnetId !== right.subnetId) {
        return left.subnetId.localeCompare(right.subnetId);
      }
      return left.rangeStartInt - right.rangeStartInt;
    })
    .map((group) => {
      const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
      const deviceCount = getDevicesInGroup(group).length;
      const pingCount = countReachableInGroup(group, reachableSet);
      const busyCount = countBusyInGroup(group, reachableSet);
      const totalCount = group.rangeEndInt - group.rangeStartInt + 1;
      const freeCount = Math.max(totalCount - busyCount, 0);
      return `
        <tr>
          <td><strong>${escapeHtml(group.name)}</strong></td>
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : escapeHtml(t("no_data"))}</td>
          <td class="mono">${escapeHtml(formatGroupRange(group, true))}</td>
          <td>
            <span class="pill">${escapeHtml(t("in_database_short", { count: deviceCount }))}</span>
            <span class="pill">${escapeHtml(t("ping_short", { count: pingCount }))}</span>
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </td>
          <td>${escapeHtml(group.note || t("no_data"))}</td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-group="${escapeHtml(group.id)}">${escapeHtml(t("delete_row"))}</button>
          </td>
        </tr>
      `;
    });

  elements.groupsTableBody.innerHTML = rows.join("");
  elements.groupsCounter.textContent = formatRecordsCount(state.groups.length);
}

function renderDevicesTable() {
  const searchTerm = normalizeSearch(elements.searchInput.value);
  const filteredDevices = state.devices.filter((device) => matchesSearch(device, searchTerm));

  if (filteredDevices.length === 0) {
    const message = searchTerm
      ? t("no_results")
      : t("empty_devices");
    elements.devicesTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">${escapeHtml(message)}</td>
      </tr>
    `;
    elements.devicesCounter.textContent = searchTerm
      ? formatFilteredCount(0, state.devices.length)
      : formatRecordsCount(0);
    return;
  }

  const rows = filteredDevices
    .slice()
    .sort((left, right) => ipToInt(left.ip) - ipToInt(right.ip))
    .map((device) => {
      const subnet = resolveDeviceSubnet(device);
      const group = resolveDeviceGroup(device, subnet);
      const pingBadge = renderPingBadge(device.ip);
      const status = evaluateDeviceStatus(device, subnet);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(device.name)}</strong>
            <div class="secondary-line">${escapeHtml(device.note || "")}</div>
          </td>
          <td class="mono">${escapeHtml(device.ip)}</td>
          <td class="mono">${escapeHtml(device.mac || t("no_data"))}</td>
          <td>${escapeHtml(getDeviceTypeLabel(device.type))}</td>
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : escapeHtml(t("no_data"))}</td>
          <td>${group ? `${escapeHtml(group.name)}<br><span class="mono">${escapeHtml(formatGroupRange(group, true))}</span>` : escapeHtml(t("no_data"))}</td>
          <td>${pingBadge}</td>
          <td><span class="status-badge status-badge--${status.variant}">${escapeHtml(status.label)}</span></td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-device="${escapeHtml(device.id)}">${escapeHtml(t("delete_row"))}</button>
          </td>
        </tr>
      `;
    });

  elements.devicesTableBody.innerHTML = rows.join("");
  elements.devicesCounter.textContent = searchTerm
    ? formatFilteredCount(filteredDevices.length, state.devices.length)
    : formatRecordsCount(filteredDevices.length);
}

function renderHistoryTable() {
  if (state.history.length === 0) {
    elements.historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">${escapeHtml(t("empty_history"))}</td>
      </tr>
    `;
    elements.historyCounter.textContent = formatEventsCount(0);
    return;
  }

  const rows = state.history.map((entry) => {
    const ipLabel = entry.previousIp
      ? `${escapeHtml(entry.previousIp)} → ${escapeHtml(entry.ip)}`
      : escapeHtml(entry.ip);
    return `
      <tr>
        <td class="mono">${escapeHtml(formatDateTime(entry.changedAt))}</td>
        <td>${escapeHtml(entry.actor || t("system_actor"))}</td>
        <td><span class="status-badge status-badge--info">${escapeHtml(getActionLabel(entry.action))}</span></td>
        <td>${escapeHtml(entry.deviceName)}</td>
        <td class="mono">${ipLabel}</td>
        <td>${escapeHtml(entry.note || t("no_data"))}</td>
      </tr>
    `;
  });

  elements.historyTableBody.innerHTML = rows.join("");
  elements.historyCounter.textContent = formatEventsCount(state.history.length);
}

function renderStats() {
  const busyIps = getBusyIpsSet();
  const freeInPools = state.subnets.reduce((total, subnet) => {
    let busyCount = 0;
    for (let ipInt = subnet.rangeStartInt; ipInt <= subnet.rangeEndInt; ipInt += 1) {
      if (busyIps.has(intToIp(ipInt))) {
        busyCount += 1;
      }
    }
    return total + Math.max(subnet.poolSize - busyCount, 0);
  }, 0);

  elements.statSubnets.textContent = String(state.subnets.length);
  elements.statDevices.textContent = String(state.devices.length);
  elements.statOccupied.textContent = String(busyIps.size);
  elements.statAvailable.textContent = String(freeInPools);
}

function renderDashboardPanels() {
  renderDashboardSubnets();
  renderDashboardGroups();
  renderDashboardDevices();
  renderDashboardHistory();
}

function renderDashboardSubnets() {
  if (state.subnets.length === 0) {
    elements.dashboardSubnetsList.innerHTML = `<li class="mini-list__empty">${escapeHtml(t("empty_subnets"))}</li>`;
    return;
  }

  const reachableSet = getReachableScanIps();
  const items = state.subnets
    .slice()
    .sort((left, right) => left.rangeStartInt - right.rangeStartInt)
    .slice(0, 4)
    .map((subnet) => {
      const busyCount = countBusyInSubnet(subnet, reachableSet);
      const freeCount = Math.max(subnet.poolSize - busyCount, 0);
      return `
        <li class="mini-item">
          <div class="mini-title">${escapeHtml(subnet.name)}</div>
          <div class="mini-meta mono">${escapeHtml(subnet.cidr)} · ${escapeHtml(subnet.rangeStart)}-${escapeHtml(subnet.rangeEnd)}</div>
          <div class="mini-badges">
            <span class="pill">${escapeHtml(t("in_database_short", { count: getDevicesInSubnet(subnet).length }))}</span>
            <span class="pill">${escapeHtml(t("ping_short", { count: countReachableInSubnet(subnet, reachableSet) }))}</span>
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </div>
        </li>
      `;
    });

  elements.dashboardSubnetsList.innerHTML = items.join("");
}

function renderDashboardGroups() {
  if (state.groups.length === 0) {
    elements.dashboardGroupsList.innerHTML = `<li class="mini-list__empty">${escapeHtml(t("empty_groups"))}</li>`;
    return;
  }

  const reachableSet = getReachableScanIps();
  const items = state.groups
    .slice()
    .sort((left, right) => left.rangeStartInt - right.rangeStartInt)
    .slice(0, 4)
    .map((group) => {
      const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
      const busyCount = countBusyInGroup(group, reachableSet);
      const totalCount = group.rangeEndInt - group.rangeStartInt + 1;
      const freeCount = Math.max(totalCount - busyCount, 0);
      return `
        <li class="mini-item">
          <div class="mini-title">${escapeHtml(group.name)}</div>
          <div class="mini-meta">${escapeHtml(subnet?.name || t("no_data"))} · <span class="mono">${escapeHtml(formatGroupRange(group, true))}</span></div>
          <div class="mini-badges">
            <span class="pill">${escapeHtml(t("in_database_short", { count: getDevicesInGroup(group).length }))}</span>
            <span class="pill">${escapeHtml(t("ping_short", { count: countReachableInGroup(group, reachableSet) }))}</span>
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </div>
        </li>
      `;
    });

  elements.dashboardGroupsList.innerHTML = items.join("");
}

function renderDashboardDevices() {
  if (state.devices.length === 0) {
    elements.dashboardDevicesList.innerHTML = `<li class="mini-list__empty">${escapeHtml(t("empty_devices"))}</li>`;
    return;
  }

  const items = state.devices
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map((device) => {
      const subnet = resolveDeviceSubnet(device);
      return `
        <li class="mini-item">
          <div class="mini-title">${escapeHtml(device.name)}</div>
          <div class="mini-meta mono">${escapeHtml(device.ip)} · ${escapeHtml(getDeviceTypeLabel(device.type))}</div>
          <div class="mini-badges">
            <span class="pill">${escapeHtml(subnet?.name || t("no_binding"))}</span>
            <span class="pill">${escapeHtml(formatDateTime(device.createdAt))}</span>
          </div>
        </li>
      `;
    });

  elements.dashboardDevicesList.innerHTML = items.join("");
}

function renderDashboardHistory() {
  if (state.history.length === 0) {
    elements.dashboardHistoryList.innerHTML = `<li class="mini-list__empty">${escapeHtml(t("empty_history"))}</li>`;
    return;
  }

  const items = state.history
    .slice(0, 5)
    .map((entry) => {
      const ipLabel = entry.previousIp ? `${entry.previousIp} → ${entry.ip}` : entry.ip;
      return `
        <li class="mini-item">
          <div class="mini-title">${escapeHtml(entry.deviceName)}</div>
          <div class="mini-meta">${escapeHtml(getActionLabel(entry.action))} · <span class="mono">${escapeHtml(ipLabel)}</span></div>
          <div class="mini-badges">
            <span class="pill">${escapeHtml(entry.actor || t("system_actor"))}</span>
            <span class="pill">${escapeHtml(formatDateTime(entry.changedAt))}</span>
          </div>
        </li>
      `;
    });

  elements.dashboardHistoryList.innerHTML = items.join("");
}

function renderIpCheckResult(message, tone) {
  elements.ipCheckResult.className = `result-card result-card--${tone}`;
  elements.ipCheckResult.textContent = message;
}

function setLiveStatus(label, variant) {
  elements.liveStatusBadge.className = `status-badge status-badge--${variant}`;
  elements.liveStatusBadge.textContent = label;
}

function setScanStatus(label, variant) {
  elements.scanStatusBadge.className = `status-badge status-badge--${variant}`;
  elements.scanStatusBadge.textContent = label;
}

function renderPingBadge(ip) {
  const pingState = getPingState(ip);
  if (!pingState) {
    return `<span class="status-badge status-badge--warn">${escapeHtml(t("ping_no_data"))}</span>`;
  }

  if (pingState.isReachable) {
    return `<span class="status-badge status-badge--ok">${escapeHtml(t("ping_online"))}</span>`;
  }

  return `<span class="status-badge status-badge--warn">${escapeHtml(t("ping_offline"))}</span>`;
}

function normalizeState(rawState, baseGroups = []) {
  const rawSubnets = Array.isArray(rawState?.subnets) ? rawState.subnets : [];
  const subnets = rawSubnets.map((entry) => normalizeSubnet(entry));
  const rawGroups = Array.isArray(rawState?.groups) ? rawState.groups : [];
  const groups = normalizeGroupsList(rawGroups, subnets, baseGroups);
  const rawDevices = Array.isArray(rawState?.devices) ? rawState.devices : [];
  const devices = rawDevices.map((entry) => normalizeDevice(entry, subnets));
  const scanResults = Array.isArray(rawState?.scanResults)
    ? rawState.scanResults.map(normalizeScanResult)
    : [];
  const history = Array.isArray(rawState?.history)
    ? rawState.history.map(normalizeHistoryItem)
    : [];
  const meta = {
    revision: Number(rawState?.meta?.revision || 0),
    lastScanAt: rawState?.meta?.lastScanAt || null,
    scanInProgress: Boolean(rawState?.meta?.scanInProgress),
    scanIntervalSeconds: Number(rawState?.meta?.scanIntervalSeconds || 90),
  };
  const settings = normalizeServerSettings(rawState?.settings, meta);

  return { subnets, groups, devices, scanResults, history, meta, settings };
}

function normalizeServerSettings(rawSettings, meta = {}) {
  const scanIntervalSeconds = Number(
    rawSettings?.scanIntervalSeconds || meta?.scanIntervalSeconds || 90
  );
  const scanTimeoutMs = Number(rawSettings?.scanTimeoutMs || 1000);
  const scanConcurrency = Number(rawSettings?.scanConcurrency || 32);
  const scanIntervalMin = Number(rawSettings?.limits?.scanIntervalMin || 15);
  const scanIntervalMax = Number(rawSettings?.limits?.scanIntervalMax || 3600);

  return {
    scanIntervalSeconds,
    scanTimeoutMs,
    scanConcurrency,
    limits: {
      scanIntervalMin,
      scanIntervalMax,
    },
  };
}

function normalizeGroupsList(rawGroups, subnets, baseGroups = []) {
  const normalizedGroups = [];
  rawGroups.forEach((entry) => {
    normalizedGroups.push(
      normalizeRangeGroup(entry, subnets, [...baseGroups, ...normalizedGroups])
    );
  });
  return normalizedGroups;
}

function normalizeScanResult(entry) {
  return {
    ip: normalizeIp(String(entry?.ip || "").trim()),
    subnetId: String(entry?.subnetId || "").trim(),
    isReachable: Boolean(entry?.isReachable),
    checkedAt: entry?.checkedAt || null,
    source: String(entry?.source || "unknown"),
  };
}

function normalizeHistoryItem(entry) {
  return {
    id: entry?.id ?? createId(),
    deviceId: String(entry?.deviceId || "").trim(),
    deviceName: String(entry?.deviceName || "").trim(),
    ip: normalizeIp(String(entry?.ip || "").trim()),
    previousIp: entry?.previousIp ? normalizeIp(String(entry.previousIp).trim()) : "",
    action: String(entry?.action || "assigned").trim(),
    actor: String(entry?.actor || "system").trim(),
    changedAt: entry?.changedAt || new Date().toISOString(),
    note: String(entry?.note || "").trim(),
  };
}

function applyStateToTarget(targetState, snapshot) {
  targetState.subnets = snapshot.subnets;
  targetState.groups = snapshot.groups;
  targetState.devices = snapshot.devices;
  targetState.scanResults = snapshot.scanResults;
  targetState.history = snapshot.history;
  targetState.meta = snapshot.meta;
  targetState.settings = snapshot.settings;
}

function cloneState(snapshot) {
  return {
    subnets: snapshot.subnets.map((entry) => ({ ...entry })),
    groups: snapshot.groups.map((entry) => ({ ...entry })),
    devices: snapshot.devices.map((entry) => ({ ...entry })),
    scanResults: snapshot.scanResults.map((entry) => ({ ...entry })),
    history: snapshot.history.map((entry) => ({ ...entry })),
    meta: { ...snapshot.meta },
    settings: {
      ...snapshot.settings,
      limits: { ...snapshot.settings.limits },
    },
  };
}

function normalizeSubnet(rawSubnet) {
  const name = String(rawSubnet?.name || "").trim();
  const cidr = String(rawSubnet?.cidr || "").trim();
  const note = String(rawSubnet?.note || "").trim();

  if (!name) {
    throw new Error(t("error_subnet_name_required"));
  }

  const parsed = parseCidr(cidr);
  const defaultRangeStart = parsed.firstUsable;
  const defaultRangeEnd = parsed.lastUsable;
  const rangeStart = normalizeIp(String(rawSubnet?.rangeStart || defaultRangeStart).trim());
  const rangeEnd = normalizeIp(String(rawSubnet?.rangeEnd || defaultRangeEnd).trim());
  const rangeStartInt = ipToInt(rangeStart);
  const rangeEndInt = ipToInt(rangeEnd);

  if (rangeStartInt > rangeEndInt) {
    throw new Error(t("error_subnet_range_order", { name }));
  }

  if (rangeStartInt < parsed.networkInt || rangeEndInt > parsed.broadcastInt) {
    throw new Error(t("error_subnet_range_outside", { name, cidr: parsed.cidr }));
  }

  return {
    id: String(rawSubnet?.id || createId()),
    name,
    cidr: parsed.cidr,
    network: parsed.network,
    networkInt: parsed.networkInt,
    broadcast: parsed.broadcast,
    broadcastInt: parsed.broadcastInt,
    maskBits: parsed.maskBits,
    rangeStart,
    rangeEnd,
    rangeStartInt,
    rangeEndInt,
    poolSize: rangeEndInt - rangeStartInt + 1,
    usableHosts: parsed.usableHosts,
    note,
    createdAt: rawSubnet?.createdAt || new Date().toISOString(),
  };
}

function normalizeRangeGroup(rawGroup, subnets, existingGroups = state.groups) {
  const name = String(rawGroup?.name || "").trim();
  const note = String(rawGroup?.note || "").trim();
  const subnetId = String(rawGroup?.subnetId || "").trim();
  const subnet = subnets.find((entry) => entry.id === subnetId);

  if (!name) {
    throw new Error(t("error_group_name_required"));
  }

  if (!subnet) {
    throw new Error(t("error_group_subnet_invalid", { name }));
  }

  const rangeStart = normalizeGroupEndpoint(String(rawGroup?.rangeStart || "").trim(), subnet);
  const rangeEnd = normalizeGroupEndpoint(String(rawGroup?.rangeEnd || "").trim(), subnet);
  const rangeStartInt = ipToInt(rangeStart);
  const rangeEndInt = ipToInt(rangeEnd);

  if (rangeStartInt > rangeEndInt) {
    throw new Error(t("error_group_range_order", { name }));
  }

  if (rangeStartInt < subnet.networkInt || rangeEndInt > subnet.broadcastInt) {
    throw new Error(t("error_group_range_outside", { name, cidr: subnet.cidr }));
  }

  const currentId = String(rawGroup?.id || createId());
  const overlappingGroup = existingGroups.find((entry) => {
    if (String(entry?.id || "") === currentId) {
      return false;
    }
    if (String(entry?.subnetId || "") !== subnetId) {
      return false;
    }

    const otherStart = ipToInt(entry.rangeStart);
    const otherEnd = ipToInt(entry.rangeEnd);
    return rangeStartInt <= otherEnd && rangeEndInt >= otherStart;
  });

  if (overlappingGroup) {
    throw new Error(t("error_group_overlap", { name, other: overlappingGroup.name }));
  }

  return {
    id: currentId,
    subnetId,
    name,
    rangeStart,
    rangeEnd,
    rangeStartInt,
    rangeEndInt,
    note,
    createdAt: rawGroup?.createdAt || new Date().toISOString(),
  };
}

function normalizeDevice(rawDevice, subnets, groups = state.groups) {
  const name = String(rawDevice?.name || "").trim();
  const ip = normalizeIp(String(rawDevice?.ip || "").trim());
  const rawMac = String(rawDevice?.mac || "").trim();
  const mac = rawMac ? normalizeMac(rawMac) : "";
  const type = normalizeDeviceTypeValue(rawDevice?.type);
  const note = String(rawDevice?.note || "").trim();
  let subnetId = String(rawDevice?.subnetId || "").trim();
  const groupId = String(rawDevice?.groupId || "").trim();

  if (!name) {
    throw new Error(t("error_device_name_required"));
  }

  assertValidIp(ip, t("error_device_ip_invalid", { name }));

  if (mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
    throw new Error(t("error_device_mac_invalid", { name }));
  }

  if (!DEVICE_TYPES[type]) {
    throw new Error(t("error_device_type_invalid", { name }));
  }

  if (subnetId) {
    const selectedSubnet = subnets.find((subnet) => subnet.id === subnetId);
    if (!selectedSubnet) {
      subnetId = "";
    } else if (!isIpInsideNetwork(ipToInt(ip), selectedSubnet)) {
      throw new Error(t("error_device_subnet_mismatch", { ip, subnet: selectedSubnet.name }));
    }
  }

  if (!subnetId) {
    subnetId = findSubnetForIp(ipToInt(ip), subnets)?.id || "";
  }

  if (groupId) {
    const selectedGroup = groups.find((group) => group.id === groupId);
    if (!selectedGroup) {
      throw new Error(t("error_device_group_missing", { name }));
    }

    if (subnetId && selectedGroup.subnetId !== subnetId) {
      throw new Error(t("error_device_group_subnet_mismatch", { group: selectedGroup.name }));
    }

    const ipInt = ipToInt(ip);
    if (ipInt < selectedGroup.rangeStartInt || ipInt > selectedGroup.rangeEndInt) {
      throw new Error(t("error_device_group_ip_mismatch", {
        ip,
        group: selectedGroup.name,
        range: formatGroupRange(selectedGroup, true),
      }));
    }

    subnetId = selectedGroup.subnetId;
  }

  return {
    id: String(rawDevice?.id || createId()),
    name,
    ip,
    mac,
    type,
    subnetId,
    note,
    createdAt: rawDevice?.createdAt || new Date().toISOString(),
  };
}

function parseCidr(cidr) {
  const parts = String(cidr || "").trim().split("/");
  if (parts.length !== 2) {
    throw new Error(t("error_cidr_format"));
  }

  const [rawIp, rawMask] = parts;
  const normalizedIp = normalizeIp(rawIp);
  const maskBits = Number.parseInt(rawMask, 10);

  if (!Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) {
    throw new Error(t("error_mask_range"));
  }

  const ipInt = ipToInt(normalizedIp);
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  const networkInt = ipInt & mask;
  const broadcastInt = networkInt | (~mask >>> 0);
  const totalAddresses = broadcastInt - networkInt + 1;
  const usableHosts = maskBits >= 31 ? totalAddresses : Math.max(totalAddresses - 2, 0);
  const firstUsable = maskBits >= 31 ? networkInt : Math.min(networkInt + 1, broadcastInt);
  const lastUsable = maskBits >= 31 ? broadcastInt : Math.max(broadcastInt - 1, networkInt);

  return {
    cidr: `${intToIp(networkInt)}/${maskBits}`,
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    networkInt,
    broadcastInt,
    maskBits,
    usableHosts,
    firstUsable: intToIp(firstUsable),
    lastUsable: intToIp(lastUsable),
  };
}

function normalizeGroupEndpoint(value, subnet) {
  if (!value) {
    throw new Error(t("error_group_range_missing", { name: subnet.name }));
  }

  if (/^\d+$/.test(value)) {
    if (subnet.maskBits !== 24) {
      throw new Error(t("error_group_short_range_cidr"));
    }

    const octet = Number.parseInt(value, 10);
    if (octet < 0 || octet > 255) {
      throw new Error(t("error_group_octet_range"));
    }

    const [a, b, c] = subnet.network.split(".");
    return `${a}.${b}.${c}.${octet}`;
  }

  return normalizeIp(value);
}

function getDevicesInSubnet(subnet) {
  return state.devices.filter((device) => isIpInsideNetwork(ipToInt(device.ip), subnet));
}

function getGroupsInSubnet(subnetId) {
  return state.groups
    .filter((group) => group.subnetId === subnetId)
    .sort((left, right) => left.rangeStartInt - right.rangeStartInt);
}

function getDevicesInGroup(group) {
  return state.devices.filter((device) => {
    const ipInt = ipToInt(device.ip);
    return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
  });
}

function countReachableInGroup(group, reachableSet = getReachableScanIps()) {
  let count = 0;
  for (let ipInt = group.rangeStartInt; ipInt <= group.rangeEndInt; ipInt += 1) {
    if (reachableSet.has(intToIp(ipInt))) {
      count += 1;
    }
  }
  return count;
}

function countBusyInGroup(group, reachableSet = getReachableScanIps()) {
  const busySet = new Set(getDevicesInGroup(group).map((device) => device.ip));
  for (let ipInt = group.rangeStartInt; ipInt <= group.rangeEndInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (reachableSet.has(ip)) {
      busySet.add(ip);
    }
  }
  return busySet.size;
}

function getReachableScanIps() {
  return new Set(
    state.scanResults
      .filter((entry) => entry.isReachable)
      .map((entry) => entry.ip)
  );
}

function getBusyIpsSet() {
  return new Set([
    ...state.devices.map((device) => device.ip),
    ...getReachableScanIps(),
  ]);
}

function countReachableInSubnet(subnet, reachableSet = getReachableScanIps()) {
  let count = 0;
  for (let ipInt = subnet.rangeStartInt; ipInt <= subnet.rangeEndInt; ipInt += 1) {
    if (reachableSet.has(intToIp(ipInt))) {
      count += 1;
    }
  }
  return count;
}

function countBusyInSubnet(subnet, reachableSet = getReachableScanIps()) {
  const busySet = new Set(
    state.devices
      .filter((device) => isIpInsidePool(ipToInt(device.ip), subnet))
      .map((device) => device.ip)
  );
  for (let ipInt = subnet.rangeStartInt; ipInt <= subnet.rangeEndInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (reachableSet.has(ip)) {
      busySet.add(ip);
    }
  }
  return busySet.size;
}

function getPingState(ip) {
  const normalizedIp = normalizeIpSafe(ip);
  if (!normalizedIp) {
    return null;
  }
  return state.scanResults.find((entry) => entry.ip === normalizedIp) || null;
}

function isIpInsidePool(ipInt, subnet) {
  return ipInt >= subnet.rangeStartInt && ipInt <= subnet.rangeEndInt;
}

function isIpInsideNetwork(ipInt, subnet) {
  return ipInt >= subnet.networkInt && ipInt <= subnet.broadcastInt;
}

function resolveDeviceSubnet(device) {
  if (device.subnetId) {
    const subnet = state.subnets.find((entry) => entry.id === device.subnetId);
    if (subnet) {
      return subnet;
    }
  }

  return findSubnetForIp(ipToInt(device.ip));
}

function resolveDeviceGroup(device, subnet = resolveDeviceSubnet(device)) {
  if (!subnet) {
    return null;
  }
  return findRangeGroupForIp(ipToInt(device.ip), subnet.id);
}

function findSubnetForIp(ipInt, subnets = state.subnets) {
  return subnets.find((subnet) => ipInt >= subnet.networkInt && ipInt <= subnet.broadcastInt);
}

function findRangeGroupForIp(ipInt, subnetId = "") {
  return (
    state.groups.find((group) => {
      if (subnetId && group.subnetId !== subnetId) {
        return false;
      }
      return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
    }) || null
  );
}

function handleDeviceSubnetChange() {
  deviceGroupSelectionMode = "auto";
  renderDeviceGroupOptions();
  updateSuggestedIp();
}

function renderDeviceGroupOptions(preferredGroupId = elements.deviceGroupSelect.value) {
  const subnetId = elements.subnetSelect.value;
  const options = [`<option value="">${escapeHtml(t("any_free_ip"))}</option>`];
  const recommendedGroupId = getRecommendedGroupIdForDevice(
    subnetId,
    elements.deviceForm.elements.type.value
  );

  if (subnetId) {
    getGroupsInSubnet(subnetId).forEach((group) => {
      options.push(
        `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)} · ${escapeHtml(formatGroupRange(group, true))}</option>`
      );
    });
  }

  elements.deviceGroupSelect.innerHTML = options.join("");
  if (
    preferredGroupId &&
    state.groups.some((group) => group.id === preferredGroupId && group.subnetId === subnetId)
  ) {
    elements.deviceGroupSelect.value = preferredGroupId;
  } else if (deviceGroupSelectionMode === "auto" && recommendedGroupId) {
    elements.deviceGroupSelect.value = recommendedGroupId;
  } else {
    elements.deviceGroupSelect.value = "";
  }
}

function handleDeviceGroupChange() {
  deviceGroupSelectionMode = "manual";
  updateSuggestedIp();
}

function handleDeviceTypeChange() {
  if (deviceGroupSelectionMode === "auto") {
    renderDeviceGroupOptions();
  }
  updateSuggestedIp();
}

function getRecommendedGroupIdForDevice(subnetId, deviceType) {
  if (!subnetId || !deviceType) {
    return "";
  }

  const groups = getGroupsInSubnet(subnetId);
  if (groups.length === 0) {
    return "";
  }

  const normalizedDeviceType = String(deviceType).toLowerCase();
  let bestGroupId = "";
  let bestScore = 0;

  for (const group of groups) {
    const score = scoreGroupSuggestion(group, normalizedDeviceType);
    if (score > bestScore) {
      bestScore = score;
      bestGroupId = group.id;
    }
  }

  return bestGroupId;
}

function scoreGroupSuggestion(group, deviceType) {
  const searchableText = normalizeSearchableText(`${group.name} ${group.note || ""}`);
  let bestTemplateScore = 0;

  for (const template of groupSuggestionTemplates) {
    if (!template.deviceTypes.includes(deviceType)) {
      continue;
    }

    let templateScore = 0;
    for (const keyword of template.keywords) {
      if (searchableText.includes(keyword)) {
        templateScore += keyword.includes(" ") ? 4 : 2;
      }
    }

    if (templateScore > bestTemplateScore) {
      bestTemplateScore = templateScore;
    }
  }

  return bestTemplateScore;
}

function normalizeSearchableText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateDeviceStatus(device, subnet) {
  const sameIpCount = state.devices.filter((entry) => entry.ip === device.ip).length;
  if (sameIpCount > 1) {
    return { label: t("status_conflict"), variant: "danger" };
  }

  if (!subnet) {
    return { label: t("status_no_subnet"), variant: "warn" };
  }

  if (!isIpInsidePool(ipToInt(device.ip), subnet)) {
    return { label: t("status_outside_pool"), variant: "warn" };
  }

  return { label: t("status_ok"), variant: "ok" };
}

function matchesSearch(device, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  const subnet = resolveDeviceSubnet(device);
  const group = resolveDeviceGroup(device, subnet);
  const pingState = getPingState(device.ip);
  const haystack = [
    device.name,
    device.ip,
    device.mac,
    device.type,
    getDeviceTypeLabel(device.type),
    device.note,
    subnet?.name || "",
    subnet?.cidr || "",
    group?.name || "",
    group ? formatGroupRange(group, true) : "",
    pingState?.isReachable ? "online reachable ping" : "offline no-ping",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm);
}

function formatGroupRange(group, compact = false) {
  if (!compact) {
    return `${group.rangeStart} - ${group.rangeEnd}`;
  }

  const startParts = group.rangeStart.split(".");
  const endParts = group.rangeEnd.split(".");
  const samePrefix = startParts.slice(0, 3).join(".") === endParts.slice(0, 3).join(".");

  if (samePrefix) {
    return `${startParts[3]}-${endParts[3]}`;
  }

  return `${group.rangeStart} - ${group.rangeEnd}`;
}

function formatDateTime(value) {
  if (!value) {
    return t("no_data");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(DATE_LOCALES[getLanguage()] || DATE_LOCALES.ru, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMac(value) {
  const compact = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (compact.length === 12) {
    return compact.match(/.{2}/g).join(":");
  }

  return value
    .replaceAll("-", ":")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizeIp(value) {
  assertValidIp(value, t("ip_invalid_check"));
  return value
    .split(".")
    .map((segment) => String(Number.parseInt(segment, 10)))
    .join(".");
}

function normalizeIpSafe(value) {
  try {
    return normalizeIp(value);
  } catch {
    return "";
  }
}

function assertValidIp(value, message) {
  const parts = String(value || "").trim().split(".");
  if (parts.length !== 4) {
    throw new Error(message);
  }

  const isValid = parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  if (!isValid) {
    throw new Error(message);
  }
}

function ipToInt(ip) {
  return normalizeIp(ip)
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))
    .reduce((accumulator, part) => ((accumulator << 8) | part) >>> 0, 0);
}

function intToIp(value) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeById(existingItems, importedItems) {
  return mergeByKey(existingItems, importedItems, (item) => String(item.id));
}

function mergeByKey(existingItems, importedItems, keyFn) {
  const merged = new Map(existingItems.map((item) => [keyFn(item), item]));
  importedItems.forEach((item) => merged.set(keyFn(item), item));
  return [...merged.values()];
}

function findSubnetByReference(row, subnets) {
  return subnets.find((subnet) => {
    return (
      subnet.id === (row.subnet_id || row.subnetId) ||
      subnet.cidr === (row.subnet_cidr || row.subnetCidr || row.cidr) ||
      subnet.name === (row.subnet_name || row.subnetName)
    );
  });
}

function parseCsv(text) {
  const rows = [];
  const sanitizedText = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const firstLine = sanitizedText.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  let currentValue = "";
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < sanitizedText.length; index += 1) {
    const char = sanitizedText[index];
    const nextChar = sanitizedText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      currentValue = "";
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentValue += char;
    }
  }

  if (currentValue !== "" || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[normalizeCsvHeader(header)] = row[index] ?? "";
    });
    return record;
  });
}

function normalizeCsvHeader(header) {
  const normalized = String(header || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();

  const aliases = {
    id: "id",
    name: "name",
    "имя": "name",
    "ім'я": "name",
    cidr: "cidr",
    network: "network",
    "сеть": "network",
    "мережа": "network",
    mask: "mask",
    "маска": "mask",
    note: "note",
    comment: "note",
    "комментарий": "note",
    "коментар": "note",
    ip: "ip",
    mac: "mac",
    type: "type",
    "тип": "type",
    "начало пула": "range_start",
    "початок пулу": "range_start",
    "pool start": "range_start",
    "конец пула": "range_end",
    "кінець пулу": "range_end",
    "pool end": "range_end",
    "начало диапазона": "range_start",
    "початок діапазону": "range_start",
    "range start": "range_start",
    "конец диапазона": "range_end",
    "кінець діапазону": "range_end",
    "range end": "range_end",
    "id подсети": "subnet_id",
    "id підмережі": "subnet_id",
    "subnet id": "subnet_id",
    "подсеть": "subnet_name",
    "підмережа": "subnet_name",
    subnet: "subnet_name",
    "id группы": "group_id",
    "id групи": "group_id",
    "group id": "group_id",
    "группа": "group_name",
    "група": "group_name",
    group: "group_name",
    ping: "ping",
  };

  return aliases[normalized] || normalized.replace(/\s+/g, "_");
}

function normalizeDeviceTypeValue(value) {
  const normalized = normalizeSearchableText(value);
  if (!normalized) {
    return "";
  }

  const aliases = {
    server: "server",
    сервер: "server",
    "сервери": "server",
    "серверы": "server",
    container: "container",
    containers: "container",
    контейнер: "container",
    "контейнери": "container",
    iot: "iot",
  };

  return aliases[normalized] || normalized;
}

function toCsv(rows, options = {}) {
  if (rows.length === 0) {
    return "\uFEFF";
  }

  const delimiter = options.delimiter || ";";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map((header) => escapeCsvCell(header, delimiter)).join(delimiter)];
  rows.forEach((row) => {
    const line = headers
      .map((header) => escapeCsvCell(row[header] ?? "", delimiter))
      .join(delimiter);
    lines.push(line);
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

function escapeCsvCell(value, delimiter = ";") {
  const stringValue = String(value);
  if (
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function downloadFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function timestampForFile() {
  return new Date().toISOString().replaceAll(":", "-");
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const actor = preferences.operator.trim();
  if (actor) {
    headers.set("X-ATLAS-Actor", actor);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || t("error_request_failed", { status: response.status }));
  }

  return payload;
}

function showToast(message, isError = false) {
  clearTimeout(activeToastTimer);
  elements.toast.textContent = message;
  elements.toast.style.background = isError
    ? "linear-gradient(180deg, rgba(96, 24, 24, 0.96), rgba(58, 12, 12, 0.94))"
    : "linear-gradient(180deg, rgba(31, 39, 58, 0.96), rgba(15, 20, 32, 0.94))";
  elements.toast.classList.add("is-visible");

  activeToastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
