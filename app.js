const API_BASE = "/api";
const GROUP_SUGGESTION_TEMPLATES_PATH = "/group-suggestion-templates.json";
const INTERFACE_SETTINGS_CACHE_KEY = "atlas-interface-settings-cache";
const THEME_ALIASES = {
  ocean: "aurora",
};
const SUPPORTED_THEMES = ["atlas", "ember", "aurora", "fuchsia", "mono", "solaris", "forest", "neon", "arctic", "lotus", "ruby", "tide"];
const BUILTIN_DEVICE_TYPES = [
  { id: "server", labelKey: "device_type_server" },
  { id: "container", labelKey: "device_type_container" },
  { id: "iot", labelKey: "device_type_iot" },
];
const BUILTIN_DEVICE_TYPE_IDS = new Set(BUILTIN_DEVICE_TYPES.map((item) => item.id));

const DEFAULT_SETTINGS = {
  accentTheme: "atlas",
  autoRescanAfterDeviceSave: true,
  suggestionMode: "compact",
  language: "en",
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
  updated: "action_updated",
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
  accessGroups: [],
  auth: {
    authenticated: false,
    user: null,
    accessGroups: [],
    capabilities: {
      isAdmin: false,
      canWrite: false,
      canManageUsers: false,
      canManageServerSettings: false,
      canManageAccessGroups: false,
    },
  },
  admin: null,
};

const preferences = {
  settings: { ...DEFAULT_SETTINGS },
  customGroupTemplates: [],
  customDeviceTypes: [],
};

const elements = {
  authScreen: document.getElementById("auth-screen"),
  authStatus: document.getElementById("auth-status"),
  loginForm: document.getElementById("login-form"),
  bootstrapHint: document.getElementById("bootstrap-hint"),
  heroSignature: document.getElementById("hero-signature"),
  subnetForm: document.getElementById("subnet-form"),
  deviceForm: document.getElementById("device-form"),
  groupForm: document.getElementById("group-form"),
  accessGroupForm: document.getElementById("access-group-form"),
  userForm: document.getElementById("user-form"),
  passwordForm: document.getElementById("password-form"),
  subnetSelect: document.getElementById("device-subnet-select"),
  subnetAccessGroupSelect: document.getElementById("subnet-access-group-select"),
  deviceGroupSelect: document.getElementById("device-group-select"),
  groupSubnetSelect: document.getElementById("group-subnet-select"),
  searchInput: document.getElementById("device-search-input"),
  deviceFilterSelect: document.getElementById("device-filter-select"),
  deviceGroupFilterSelect: document.getElementById("device-group-filter-select"),
  ipCheckForm: document.getElementById("ip-check-form"),
  ipCheckResult: document.getElementById("ip-check-result"),
  currentUserBadge: document.getElementById("current-user-badge"),
  userMenuButton: document.getElementById("user-menu-button"),
  userMenuDropdown: document.getElementById("user-menu-dropdown"),
  userMenuNote: document.getElementById("user-menu-note"),
  userMenuPasswordButton: document.getElementById("user-menu-password-button"),
  currentUserDisplay: document.getElementById("current-user-display"),
  currentUserNameInput: document.getElementById("current-user-name-input"),
  currentUserRoleNote: document.getElementById("current-user-role-note"),
  logoutButton: document.getElementById("logout-button"),
  openAddButton: document.querySelector('[data-open-modal="add-modal"]'),
  openSettingsButton: document.getElementById("open-settings-button"),
  settingsShortcutButtons: [...document.querySelectorAll("[data-settings-shortcut]")],
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsButton: document.querySelector('[data-close-modal="settings-modal"]'),
  settingsNavButtons: [...document.querySelectorAll("[data-settings-tab]")],
  settingsSections: [...document.querySelectorAll("[data-settings-section]")],
  templateTabButtons: [...document.querySelectorAll("[data-template-tab]")],
  templatePanels: [...document.querySelectorAll("[data-template-panel]")],
  openPasswordModalButton: document.getElementById("open-password-modal-button"),
  passwordModal: document.getElementById("password-modal"),
  passwordModalClose: document.getElementById("password-modal-close"),
  passwordStatus: document.getElementById("password-status"),
  viewTabs: [...document.querySelectorAll("[data-view-tab]")],
  pageViews: [...document.querySelectorAll("[data-view]")],
  statCards: [...document.querySelectorAll("[data-stat-target]")],
  modalBackdrops: [...document.querySelectorAll(".modal-backdrop")],
  openModalButtons: [...document.querySelectorAll("[data-open-modal]")],
  closeModalButtons: [...document.querySelectorAll("[data-close-modal]")],
  dashboardAttentionList: document.getElementById("dashboard-summary-list"),
  dashboardHistoryList: document.getElementById("dashboard-history-list"),
  missingTypeModal: document.getElementById("missing-type-modal"),
  missingTypeForm: document.getElementById("missing-type-form"),
  missingTypeTargetSelect: document.getElementById("missing-type-target-select"),
  missingTypeDeviceList: document.getElementById("missing-type-device-list"),
  missingTypeStatus: document.getElementById("missing-type-status"),
  deviceSuggestion: document.getElementById("device-suggestion"),
  deviceFormStatus: document.getElementById("device-form-status"),
  applySuggestionButton: document.getElementById("apply-suggestion-button"),
  settingsThemeSelect: document.getElementById("settings-theme-select"),
  settingsLanguageSelect: document.getElementById("settings-language-select"),
  settingsSignatureInput: document.getElementById("settings-signature-input"),
  settingsAutoRescan: document.getElementById("settings-auto-rescan"),
  settingsSuggestionMode: document.getElementById("settings-suggestion-mode"),
  settingsDefaultSubnetScan: document.getElementById("settings-default-subnet-scan"),
  settingsScanInterval: document.getElementById("settings-scan-interval"),
  settingsPingMeta: document.getElementById("settings-ping-meta"),
  settingsSubnetScanList: document.getElementById("settings-subnet-scan-list"),
  deviceTypeSelect: document.querySelector('#device-form select[name="type"]'),
  saveProfileSettingsButton: document.getElementById("save-profile-settings-button"),
  profileSettingsStatus: document.getElementById("profile-settings-status"),
  saveInterfaceSettingsButton: document.getElementById("save-interface-settings-button"),
  interfaceSettingsStatus: document.getElementById("interface-settings-status"),
  serverSettingsStatus: document.getElementById("server-settings-status"),
  saveServerSettingsButton: document.getElementById("save-server-settings-button"),
  bundledTemplateRulesList: document.getElementById("bundled-template-rules-list"),
  templateRulesList: document.getElementById("custom-template-rules-list"),
  customDeviceTypesList: document.getElementById("custom-device-types-list"),
  addCustomDeviceTypeButton: document.getElementById("add-custom-device-type-button"),
  addTemplateRuleButton: document.getElementById("add-template-rule-button"),
  templateEditor: document.getElementById("template-editor"),
  applyTemplateJsonButton: document.getElementById("apply-template-json-button"),
  deviceTypeSettingsStatus: document.getElementById("device-type-settings-status"),
  templateSettingsStatus: document.getElementById("template-settings-status"),
  saveDeviceTypeSettingsButton: document.getElementById("save-device-type-settings-button"),
  resetDeviceTypeSettingsButton: document.getElementById("reset-device-type-settings-button"),
  saveTemplateSettingsButton: document.getElementById("save-template-settings-button"),
  resetTemplateSettingsButton: document.getElementById("reset-template-settings-button"),
  accessGroupStatus: document.getElementById("access-group-status"),
  userStatus: document.getElementById("user-status"),
  accessGroupsTableBody: document.getElementById("access-groups-table-body"),
  usersTableBody: document.getElementById("users-table-body"),
  userAccessGroupOptions: document.getElementById("user-access-group-options"),
  adminPanels: [...document.querySelectorAll(".admin-only")],
  passwordToggleButtons: [...document.querySelectorAll("[data-password-toggle]")],
  subnetsTableBody: document.getElementById("subnets-table-body"),
  groupsTableBody: document.getElementById("groups-table-body"),
  devicesTableBody: document.getElementById("devices-table-body"),
  historyTableBody: document.getElementById("history-table-body"),
  historySearchInput: document.getElementById("history-search-input"),
  historyEventFilter: document.getElementById("history-event-filter"),
  historyScopeFilter: document.getElementById("history-scope-filter"),
  subnetsCounter: document.getElementById("subnets-counter"),
  groupsCounter: document.getElementById("groups-counter"),
  devicesCounter: document.getElementById("devices-counter"),
  historyCounter: document.getElementById("history-counter"),
  statSubnets: document.getElementById("stat-subnets"),
  statDevices: document.getElementById("stat-devices"),
  statOccupied: document.getElementById("stat-occupied"),
  statAvailable: document.getElementById("stat-available"),
  exportJsonButton: document.getElementById("export-json-button"),
  exportBackupButton: document.getElementById("export-backup-button"),
  backupIncludeInventory: document.getElementById("backup-include-inventory"),
  backupIncludeActivity: document.getElementById("backup-include-activity"),
  backupIncludeSystem: document.getElementById("backup-include-system"),
  backupIncludeAccess: document.getElementById("backup-include-access"),
  backupIncludePreferences: document.getElementById("backup-include-preferences"),
  exportSubnetsCsvButton: document.getElementById("export-subnets-csv-button"),
  exportGroupsCsvButton: document.getElementById("export-groups-csv-button"),
  exportDevicesCsvButton: document.getElementById("export-devices-csv-button"),
  importButton: document.getElementById("import-button"),
  importFileInput: document.getElementById("import-file-input"),
  clearDataButton: document.getElementById("clear-data-button"),
  toast: document.getElementById("toast"),
  subnetModalTitle: document.getElementById("subnet-modal-title"),
  subnetSubmitButton: document.getElementById("subnet-submit-button"),
  deviceModalTitle: document.getElementById("device-modal-title"),
  deviceSubmitButton: document.getElementById("device-submit-button"),
  groupModalTitle: document.getElementById("group-modal-title"),
  groupSubmitButton: document.getElementById("group-submit-button"),
};

let activeToastTimer = null;
let pollIntervalId = null;
let eventSource = null;
let isManualScanRunning = false;
let isDeviceSubmitting = false;
let deviceGroupSelectionMode = "auto";
let bundledGroupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
let groupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
let activeView = "dashboard";
let activeSettingsSection = "profile";
let activeTemplateSection = "device-types";
let showAllDevicesInRegistry = false;
const expandedGroupIds = new Set();
let isAuthReady = false;
let interfaceSettingsBaseline = null;
let editingSubnetId = "";
let editingGroupId = "";
let editingDeviceId = "";
let editingAccessGroupId = "";
let editingUserId = "";

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

function getAvailableDeviceTypes() {
  const customTypes = normalizeCustomDeviceTypes(preferences.customDeviceTypes);
  return [
    ...BUILTIN_DEVICE_TYPES.map((item) => ({
      id: item.id,
      builtIn: true,
      label: t(item.labelKey),
    })),
    ...customTypes.map((item) => ({
      id: item.id,
      builtIn: false,
      label: item.label,
    })),
  ];
}

function getAvailableDeviceTypeIds() {
  return new Set(getAvailableDeviceTypes().map((item) => item.id));
}

function rebuildEffectiveGroupSuggestionTemplates() {
  const bundledTemplates = normalizeGroupSuggestionTemplates(bundledGroupSuggestionTemplates);
  const customTemplates = normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
  groupSuggestionTemplates = [...bundledTemplates, ...customTemplates];
}

function isKnownDeviceType(type) {
  return getAvailableDeviceTypeIds().has(String(type || "").trim().toLowerCase());
}

function humanizeDeviceType(type) {
  return String(type || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (symbol) => symbol.toUpperCase());
}

function getDeviceTypeLabel(type) {
  const normalizedType = String(type || "").trim().toLowerCase();
  const builtIn = BUILTIN_DEVICE_TYPES.find((item) => item.id === normalizedType);
  if (builtIn) {
    return t(builtIn.labelKey);
  }

  const customType = normalizeCustomDeviceTypes(preferences.customDeviceTypes)
    .find((item) => item.id === normalizedType);
  return customType?.label || humanizeDeviceType(normalizedType) || type;
}

function getActionLabel(action) {
  const key = ACTION_LABELS[action];
  return key ? t(key) : action;
}

function syncCrudModalCaptions() {
  if (elements.subnetModalTitle && elements.subnetSubmitButton) {
    elements.subnetModalTitle.textContent = editingSubnetId ? t("edit_subnet") : t("add_subnet");
    elements.subnetSubmitButton.textContent = editingSubnetId ? t("update_subnet") : t("save_subnet");
  }
  if (elements.deviceModalTitle && elements.deviceSubmitButton) {
    elements.deviceModalTitle.textContent = editingDeviceId ? t("edit_device") : t("add_device");
    elements.deviceSubmitButton.textContent = editingDeviceId ? t("update_device") : t("save_device");
  }
  if (elements.groupModalTitle && elements.groupSubmitButton) {
    elements.groupModalTitle.textContent = editingGroupId ? t("edit_group") : t("add_group");
    elements.groupSubmitButton.textContent = editingGroupId ? t("update_group") : t("save_group");
  }
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
  syncPasswordToggleButtons();
  syncCrudModalCaptions();
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

function normalizeUserPreferences(rawPreferences = {}) {
  const rawSettings =
    rawPreferences?.settings && typeof rawPreferences.settings === "object"
      ? rawPreferences.settings
      : rawPreferences;
  const rawCustomGroupTemplates = Array.isArray(rawPreferences?.customGroupTemplates)
    ? rawPreferences.customGroupTemplates
    : Array.isArray(rawSettings?.customGroupTemplates)
      ? rawSettings.customGroupTemplates
      : [];
  const rawCustomDeviceTypes = Array.isArray(rawPreferences?.customDeviceTypes)
    ? rawPreferences.customDeviceTypes
    : Array.isArray(rawSettings?.customDeviceTypes)
      ? rawSettings.customDeviceTypes
      : [];

  return {
    settings: normalizeSettings(rawSettings),
    customGroupTemplates: rawCustomGroupTemplates,
    customDeviceTypes: normalizeCustomDeviceTypes(rawCustomDeviceTypes),
  };
}

function loadCachedInterfaceSettings() {
  try {
    const rawValue = window.localStorage.getItem(INTERFACE_SETTINGS_CACHE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_SETTINGS };
    }

    return normalizeSettings(JSON.parse(rawValue));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistCachedInterfaceSettings(settings) {
  try {
    window.localStorage.setItem(
      INTERFACE_SETTINGS_CACHE_KEY,
      JSON.stringify(normalizeSettings(settings))
    );
  } catch {
    // Ignore local cache write failures.
  }
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

async function initialize() {
  preferences.settings = loadCachedInterfaceSettings();
  bindEvents();
  setActiveView(activeView);
  applyVisualSettings();
  applyLocalizedUi();
  renderAll();
  await restoreSession();
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.subnetForm.addEventListener("submit", handleSubnetSubmit);
  elements.deviceForm.addEventListener("submit", handleDeviceSubmit);
  elements.groupForm.addEventListener("submit", handleGroupSubmit);
  elements.accessGroupForm.addEventListener("submit", handleAccessGroupSubmit);
  elements.userForm.addEventListener("submit", handleUserSubmit);
  elements.passwordForm.addEventListener("submit", handlePasswordSubmit);
  elements.searchInput.addEventListener("input", handleRegistryDeviceFiltersChange);
  elements.deviceFilterSelect?.addEventListener("change", handleRegistryDeviceFiltersChange);
  elements.deviceGroupFilterSelect?.addEventListener("change", handleRegistryDeviceFiltersChange);
  elements.ipCheckForm.addEventListener("submit", handleIpCheck);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.openPasswordModalButton.addEventListener("click", () => openPasswordModal(false));
  elements.passwordToggleButtons.forEach((button) => {
    button.addEventListener("click", handlePasswordToggle);
  });
  elements.userMenuButton?.addEventListener("click", handleUserMenuToggle);
  elements.viewTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.viewTab);
    });
  });
  elements.statCards.forEach((button) => {
    button.addEventListener("click", () => {
      handleStatNavigation(button.dataset.statTarget);
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
  elements.subnetSelect.addEventListener("change", handleDeviceSubnetChange);
  elements.deviceGroupSelect.addEventListener("change", handleDeviceGroupChange);
  elements.deviceForm.elements.type.addEventListener("change", handleDeviceTypeChange);
  elements.deviceForm.elements.ip.addEventListener("input", updateSuggestedIp);
  elements.applySuggestionButton.addEventListener("click", applySuggestedIp);
  elements.saveProfileSettingsButton.addEventListener("click", handleProfileSettingsSave);
  elements.saveInterfaceSettingsButton.addEventListener("click", handleInterfaceSettingsSave);
  elements.settingsLanguageSelect.addEventListener("change", handleInterfaceSettingsPreview);
  elements.settingsThemeSelect.addEventListener("change", handleInterfaceSettingsPreview);
  elements.settingsSuggestionMode.addEventListener("change", handleInterfaceSettingsPreview);
  elements.settingsAutoRescan.addEventListener("change", handleInterfaceSettingsPreview);
  elements.settingsSignatureInput.addEventListener("input", handleInterfaceSettingsPreview);
  elements.userMenuPasswordButton?.addEventListener("click", () => {
    closeUserMenu();
    openPasswordModal(false);
  });
  elements.settingsShortcutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeUserMenu();
      openSettingsModal(button.dataset.settingsShortcut || "profile");
    });
  });
  elements.settingsNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSettingsSection(button.dataset.settingsTab);
    });
  });
  elements.templateTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTemplateSection(button.dataset.templateTab);
    });
  });
  elements.saveServerSettingsButton.addEventListener("click", handleServerSettingsSave);
  elements.addTemplateRuleButton.addEventListener("click", handleAddTemplateRule);
  elements.templateRulesList.addEventListener("click", handleTemplateRuleListClick);
  elements.templateRulesList.addEventListener("input", syncTemplateJsonFromCards);
  elements.templateRulesList.addEventListener("change", syncTemplateJsonFromCards);
  elements.addCustomDeviceTypeButton?.addEventListener("click", handleAddCustomDeviceType);
  elements.customDeviceTypesList?.addEventListener("click", handleCustomDeviceTypeListClick);
  elements.customDeviceTypesList?.addEventListener("input", handleCustomDeviceTypeListInput);
  elements.applyTemplateJsonButton.addEventListener("click", handleTemplateJsonApply);
  elements.saveDeviceTypeSettingsButton?.addEventListener("click", handleDeviceTypeSettingsSave);
  elements.resetDeviceTypeSettingsButton?.addEventListener("click", handleDeviceTypeSettingsReset);
  elements.saveTemplateSettingsButton.addEventListener("click", handleTemplateSettingsSave);
  elements.resetTemplateSettingsButton.addEventListener("click", handleTemplateSettingsReset);
  elements.exportJsonButton.addEventListener("click", exportJson);
  elements.exportBackupButton?.addEventListener("click", exportBackup);
  elements.exportSubnetsCsvButton.addEventListener("click", exportSubnetsCsv);
  elements.exportGroupsCsvButton.addEventListener("click", exportGroupsCsv);
  elements.exportDevicesCsvButton.addEventListener("click", exportDevicesCsv);
  elements.importButton.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", handleImportFile);
  elements.clearDataButton.addEventListener("click", clearAllData);
  elements.subnetsTableBody.addEventListener("click", handleSubnetTableActions);
  elements.subnetsTableBody.addEventListener("change", handleSubnetScanToggle);
  elements.groupsTableBody.addEventListener("click", handleGroupTableActions);
  elements.devicesTableBody.addEventListener("click", handleDeviceTableActions);
  elements.accessGroupsTableBody?.addEventListener("click", handleAccessGroupTableActions);
  elements.usersTableBody?.addEventListener("click", handleUserAdminTableActions);
  elements.historySearchInput?.addEventListener("input", renderHistoryTable);
  elements.historyEventFilter?.addEventListener("change", renderHistoryTable);
  elements.historyScopeFilter?.addEventListener("change", renderHistoryTable);
  elements.dashboardAttentionList?.addEventListener("click", handleDashboardAttentionClick);
  elements.missingTypeForm?.addEventListener("submit", handleMissingTypeSubmit);
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("focus", () => refreshState(true));
  window.addEventListener("keydown", handleGlobalKeydown);
}

async function loadGroupSuggestionTemplates() {
  try {
    const response = await fetch(GROUP_SUGGESTION_TEMPLATES_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const normalizedTemplates = normalizeGroupSuggestionTemplates(payload);
    if (normalizedTemplates.length > 0) {
      bundledGroupSuggestionTemplates = normalizedTemplates;
      rebuildEffectiveGroupSuggestionTemplates();
      return;
    }
  } catch (error) {
    console.warn("Failed to load group suggestion templates, using fallback set.", error);
  }

  bundledGroupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
  rebuildEffectiveGroupSuggestionTemplates();
}

async function restoreSession() {
  try {
    await loadGroupSuggestionTemplates();
    const session = await apiRequest("/auth/session", { allowUnauthorized: true });
    applyAuthSession(session);

    if (!session?.authenticated) {
      openAuthScreen(session);
      return;
    }

    await finishAuthenticatedBootstrap();
  } catch (error) {
    console.error(error);
    openAuthScreen();
    showToast(error.message || t("server_unavailable"), true);
  }
}

async function finishAuthenticatedBootstrap() {
  document.body.classList.add("app-ready");
  const stateLoaded = await refreshState();
  if (!stateLoaded || !state.auth?.authenticated) {
    return;
  }
  closeAuthScreen();
  connectLiveStream();
  if (pollIntervalId) {
    window.clearInterval(pollIntervalId);
  }
  pollIntervalId = window.setInterval(() => {
    refreshState(true);
  }, 30000);
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
            .filter((item) => isKnownDeviceType(item))
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
  const currentUser = state.auth?.user;
  elements.currentUserBadge.textContent = currentUser?.displayName || "ATLAS";
  elements.currentUserDisplay.value = currentUser?.username || "";
  elements.currentUserNameInput.value = currentUser?.displayName || "";
  const userRoleLabel = currentUser?.role ? t(`role_summary_${currentUser.role}`) : t("role_summary_guest");
  elements.userMenuNote.textContent = currentUser?.mustChangePassword
    ? t("must_change_password_note")
    : t("user_menu_note", { role: userRoleLabel });
  elements.currentUserRoleNote.textContent = currentUser?.mustChangePassword
    ? t("must_change_password_note")
    : t("current_role_note", { role: userRoleLabel });
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
  elements.settingsDefaultSubnetScan.checked = Boolean(state.settings?.defaultSubnetScanEnabled);
  renderSubnetScanSettings();
}

function isSettingsModalOpen() {
  return Boolean(elements.settingsModal && !elements.settingsModal.hidden);
}

function applyVisualSettings() {
  document.body.dataset.accentTheme = preferences.settings.accentTheme;
}

function renderSubnetScanSettings() {
  const canManage = Boolean(state.auth?.capabilities?.canManageServerSettings);

  if (state.subnets.length === 0) {
    elements.settingsSubnetScanList.innerHTML = `
      <div class="result-card result-card--muted">${escapeHtml(t("automation_subnets_empty"))}</div>
    `;
    return;
  }

  const rows = state.subnets
    .slice()
    .sort((left, right) => left.rangeStartInt - right.rangeStartInt)
    .map((subnet) => `
      <label class="checkbox-card automation-subnet-card">
        <input
          type="checkbox"
          data-subnet-scan-id="${escapeHtml(subnet.id)}"
          ${subnet.scanEnabled ? "checked" : ""}
          ${canManage ? "" : "disabled"}
        >
        <span>
          <strong>${escapeHtml(subnet.name)}</strong>
          <span class="automation-subnet-meta">${escapeHtml(subnet.cidr)} · ${escapeHtml(subnet.rangeStart)}-${escapeHtml(subnet.rangeEnd)}</span>
        </span>
      </label>
    `);

  elements.settingsSubnetScanList.innerHTML = rows.join("");
}

function normalizeCustomDeviceTypes(rawTypes) {
  if (!Array.isArray(rawTypes)) {
    return [];
  }

  const seenIds = new Set();

  return rawTypes
    .map((entry, index) => {
      const label = String(entry?.label || "").trim();
      const suggestedId = String(entry?.id || "").trim() || slugifyDeviceTypeId(label, index);
      const normalizedId = normalizeDeviceTypeValue(suggestedId);

      if (!label || !normalizedId || BUILTIN_DEVICE_TYPE_IDS.has(normalizedId) || seenIds.has(normalizedId)) {
        return null;
      }

      seenIds.add(normalizedId);
      return {
        id: normalizedId,
        label,
      };
    })
    .filter(Boolean);
}

function createBlankCustomDeviceType() {
  return {
    id: "",
    label: "",
  };
}

function slugifyDeviceTypeId(value, fallbackIndex = 0) {
  const normalized = normalizeSearchableText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `device-type-${fallbackIndex + 1}`;
}

function createBlankTemplateRule() {
  return {
    id: "",
    label: "",
    deviceTypes: ["server"],
    keywords: [],
  };
}

function slugifyTemplateId(value, fallbackIndex = 0) {
  const normalized = normalizeSearchableText(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `template-${fallbackIndex + 1}`;
}

function renderTemplateRuleCards(templates) {
  const effectiveTemplates = templates.length > 0 ? templates : [createBlankTemplateRule()];
  const availableDeviceTypes = getAvailableDeviceTypes();

  elements.templateRulesList.innerHTML = effectiveTemplates.map((template, index) => {
    const selectedTypes = new Set(template.deviceTypes || []);
    const keywords = Array.isArray(template.keywords) ? template.keywords.join(", ") : "";
    const hasLabel = Boolean(template.label);
    const title = hasLabel ? template.label : t("template_rule_fallback", { index: index + 1 });
    const deviceTypeSummary = (template.deviceTypes || [])
      .map((type) => getDeviceTypeLabel(type))
      .join(" · ");
    const summaryMeta = [
      deviceTypeSummary,
      template.keywords?.length ? t("template_keywords_count", { count: template.keywords.length }) : "",
    ].filter(Boolean).join(" · ");
    return `
      <details class="template-rule-card" data-template-id="${escapeHtml(template.id || "")}">
        <summary class="template-rule-summary">
          <div class="template-rule-summary__main">
            <strong class="template-rule-summary__title">${escapeHtml(title)}</strong>
            <span class="template-rule-summary__meta">${escapeHtml(summaryMeta || t("template_rule_summary_empty"))}</span>
          </div>
          <span class="pill template-rule-summary__hint">${escapeHtml(t("template_edit_rule"))}</span>
        </summary>

        <div class="template-rule-body">
          <div class="template-rule-grid">
            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("template_label_title"))}</span>
              <input type="text" data-template-field="label" value="${escapeHtml(template.label || "")}" placeholder="${escapeHtml(t("template_label_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("template_label_note"))}</span>
            </label>

            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("template_keywords_title"))}</span>
              <input type="text" data-template-field="keywords" value="${escapeHtml(keywords)}" placeholder="${escapeHtml(t("template_keywords_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("template_keywords_note"))}</span>
            </label>
          </div>

          <div class="template-rule-types">
            ${availableDeviceTypes.map((type) => `
              <label class="checkbox-card">
                <input type="checkbox" data-template-field="deviceType" value="${escapeHtml(type.id)}" ${selectedTypes.has(type.id) ? "checked" : ""}>
                <span>${escapeHtml(type.label)}</span>
              </label>
            `).join("")}
          </div>

          <div class="template-rule-actions">
            <button type="button" class="link-button" data-remove-template-rule="${index}">${escapeHtml(t("remove_template_rule"))}</button>
          </div>
        </div>
      </details>
    `;
  }).join("");
}

function renderBundledTemplateRuleCards(templates) {
  elements.bundledTemplateRulesList.innerHTML = templates.map((template) => {
    const deviceTypeSummary = (template.deviceTypes || [])
      .map((type) => getDeviceTypeLabel(type))
      .join(" · ");
    const summaryMeta = [
      deviceTypeSummary,
      template.keywords?.length ? t("template_keywords_count", { count: template.keywords.length }) : "",
    ].filter(Boolean).join(" · ");

    return `
      <details class="template-rule-card">
        <summary class="template-rule-summary">
          <div class="template-rule-summary__main">
            <strong class="template-rule-summary__title">${escapeHtml(template.label)}</strong>
            <span class="template-rule-summary__meta">${escapeHtml(summaryMeta || t("template_rule_summary_empty"))}</span>
          </div>
          <span class="pill template-rule-summary__hint">${escapeHtml(t("template_bundled_badge"))}</span>
        </summary>

        <div class="template-rule-body">
          <div class="template-rule-grid">
            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("template_label_title"))}</span>
              <input type="text" value="${escapeHtml(template.label || "")}" disabled>
            </label>

            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("template_keywords_title"))}</span>
              <input type="text" value="${escapeHtml((template.keywords || []).join(", "))}" disabled>
            </label>
          </div>

          <div class="template-rule-types">
            ${(template.deviceTypes || []).map((type) => `
              <span class="pill">${escapeHtml(getDeviceTypeLabel(type))}</span>
            `).join("")}
          </div>
        </div>
      </details>
    `;
  }).join("");
}

function renderCustomDeviceTypeCards(deviceTypes) {
  const effectiveTypes = deviceTypes.length > 0 ? deviceTypes : [createBlankCustomDeviceType()];

  elements.customDeviceTypesList.innerHTML = effectiveTypes.map((deviceType, index) => {
    const title = deviceType.label || t("device_type_custom_fallback", { index: index + 1 });
    const typeId = deviceType.id || slugifyDeviceTypeId(deviceType.label, index);
    const summaryMeta = typeId ? t("device_type_id_meta", { id: typeId }) : t("device_type_id_pending");

    return `
      <details class="template-rule-card" data-custom-device-type-id="${escapeHtml(deviceType.id || "")}">
        <summary class="template-rule-summary">
          <div class="template-rule-summary__main">
            <strong class="template-rule-summary__title">${escapeHtml(title)}</strong>
            <span class="template-rule-summary__meta">${escapeHtml(summaryMeta)}</span>
          </div>
          <span class="pill template-rule-summary__hint">${escapeHtml(t("device_type_edit_rule"))}</span>
        </summary>

        <div class="template-rule-body">
          <div class="template-rule-grid">
            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("device_type_label_title"))}</span>
              <input type="text" data-device-type-field="label" value="${escapeHtml(deviceType.label || "")}" placeholder="${escapeHtml(t("device_type_label_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("device_type_label_note"))}</span>
            </label>

            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("device_type_id_title"))}</span>
              <input type="text" data-device-type-field="id" value="${escapeHtml(deviceType.id || "")}" placeholder="${escapeHtml(t("device_type_id_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("device_type_id_note"))}</span>
            </label>
          </div>

          <div class="template-rule-actions">
            <button type="button" class="link-button" data-remove-custom-device-type="${index}">${escapeHtml(t("remove_device_type"))}</button>
          </div>
        </div>
      </details>
    `;
  }).join("");
}

function collectTemplateRulesFromCards() {
  const rows = [...elements.templateRulesList.querySelectorAll(".template-rule-card")];
  const draftRules = rows.map((row, index) => {
    const label = String(row.querySelector('[data-template-field="label"]')?.value || "").trim();
    const keywords = String(row.querySelector('[data-template-field="keywords"]')?.value || "")
      .split(",")
      .map((item) => normalizeSearchableText(item))
      .filter(Boolean);
    const deviceTypes = [...row.querySelectorAll('[data-template-field="deviceType"]:checked')]
      .map((input) => input.value)
      .filter((item) => isKnownDeviceType(item));

    if (!label && keywords.length === 0) {
      return null;
    }

    return {
      id: row.dataset.templateId || slugifyTemplateId(label, index),
      label,
      deviceTypes,
      keywords,
    };
  }).filter(Boolean);

  const normalizedTemplates = normalizeGroupSuggestionTemplates(draftRules);
  if (normalizedTemplates.length === 0 || normalizedTemplates.length !== draftRules.length) {
    throw new Error(t("templates_invalid_form"));
  }

  return normalizedTemplates;
}

function collectCustomDeviceTypesFromCards() {
  const rows = [...elements.customDeviceTypesList.querySelectorAll(".template-rule-card")];
  const draftTypes = rows.map((row, index) => {
    const label = String(row.querySelector('[data-device-type-field="label"]')?.value || "").trim();
    const idValue = String(row.querySelector('[data-device-type-field="id"]')?.value || "").trim();

    if (!label && !idValue) {
      return null;
    }

    return {
      id: idValue || slugifyDeviceTypeId(label, index),
      label,
    };
  }).filter(Boolean);

  const normalizedTypes = normalizeCustomDeviceTypes(draftTypes);
  if (normalizedTypes.length !== draftTypes.length) {
    throw new Error(t("device_types_invalid_form"));
  }

  return normalizedTypes;
}

function syncTemplateJsonFromCards() {
  try {
    const normalizedTemplates = collectTemplateRulesFromCards();
    if (document.activeElement !== elements.templateEditor) {
      elements.templateEditor.value = JSON.stringify(normalizedTemplates, null, 2);
    }
  } catch {
    // Keep the JSON editor intact until the form becomes valid again.
  }
}

function handleCustomDeviceTypeListInput() {
  try {
    const normalizedTypes = collectCustomDeviceTypesFromCards();
    preferences.customDeviceTypes = normalizedTypes;
    renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
    const templateDraft = (() => {
      try {
        return collectTemplateRulesFromCards();
      } catch {
        return normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
      }
    })();
    renderTemplateRuleCards(templateDraft);
    syncTemplateJsonFromCards();
  } catch {
    // Keep manual input intact until the form becomes valid.
  }
}

function renderTemplateEditor() {
  const bundledTemplates = normalizeGroupSuggestionTemplates(bundledGroupSuggestionTemplates);
  const customTemplates = normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
  const customDeviceTypes = normalizeCustomDeviceTypes(preferences.customDeviceTypes);

  preferences.customDeviceTypes = customDeviceTypes;
  preferences.customGroupTemplates = customTemplates;
  rebuildEffectiveGroupSuggestionTemplates();
  renderCustomDeviceTypeCards(customDeviceTypes);
  renderBundledTemplateRuleCards(bundledTemplates);
  renderTemplateRuleCards(customTemplates);
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  if (document.activeElement !== elements.templateEditor) {
    elements.templateEditor.value = JSON.stringify(customTemplates, null, 2);
  }
  setTemplateSettingsStatus(t("custom_templates_note"), "muted");
  setDeviceTypeSettingsStatus(t("device_types_note"), "muted");
}

function handleAddTemplateRule() {
  const currentTemplates = (() => {
    try {
      return collectTemplateRulesFromCards();
    } catch {
      return normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
    }
  })();

  renderTemplateRuleCards([...currentTemplates, createBlankTemplateRule()]);
  syncTemplateJsonFromCards();
}

function handleAddCustomDeviceType() {
  const currentTypes = (() => {
    try {
      return collectCustomDeviceTypesFromCards();
    } catch {
      return normalizeCustomDeviceTypes(preferences.customDeviceTypes);
    }
  })();

  renderCustomDeviceTypeCards([...currentTypes, createBlankCustomDeviceType()]);
}

function handleTemplateRuleListClick(event) {
  const removeButton = event.target.closest("[data-remove-template-rule]");
  if (!removeButton) {
    return;
  }

  const row = removeButton.closest(".template-rule-card");
  row?.remove();

  if (!elements.templateRulesList.children.length) {
    renderTemplateRuleCards([createBlankTemplateRule()]);
  }

  syncTemplateJsonFromCards();
}

function handleCustomDeviceTypeListClick(event) {
  const removeButton = event.target.closest("[data-remove-custom-device-type]");
  if (!removeButton) {
    return;
  }

  const row = removeButton.closest(".template-rule-card");
  row?.remove();

  if (!elements.customDeviceTypesList.children.length) {
    renderCustomDeviceTypeCards([createBlankCustomDeviceType()]);
  }

  try {
    preferences.customDeviceTypes = collectCustomDeviceTypesFromCards();
  } catch {
    preferences.customDeviceTypes = normalizeCustomDeviceTypes(preferences.customDeviceTypes);
  }
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  const templateDraft = (() => {
    try {
      return collectTemplateRulesFromCards();
    } catch {
      return normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
    }
  })();
  renderTemplateRuleCards(templateDraft);
  syncTemplateJsonFromCards();
}

function setTemplateSettingsStatus(message, tone = "muted") {
  elements.templateSettingsStatus.className = `result-card result-card--${tone}`;
  elements.templateSettingsStatus.textContent = message;
}

function setDeviceTypeSettingsStatus(message, tone = "muted") {
  elements.deviceTypeSettingsStatus.className = `result-card result-card--${tone}`;
  elements.deviceTypeSettingsStatus.textContent = message;
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

function setAccessGroupStatus(message, tone = "muted") {
  elements.accessGroupStatus.className = `result-card result-card--${tone}`;
  elements.accessGroupStatus.textContent = message;
}

function setUserStatus(message, tone = "muted") {
  elements.userStatus.className = `result-card result-card--${tone}`;
  elements.userStatus.textContent = message;
}

function collectInterfaceSettingsDraft() {
  return normalizeSettings({
    language: elements.settingsLanguageSelect.value,
    customSignature: elements.settingsSignatureInput.value,
    accentTheme: elements.settingsThemeSelect.value,
    autoRescanAfterDeviceSave: elements.settingsAutoRescan.checked,
    suggestionMode: elements.settingsSuggestionMode.value,
  });
}

function applyInterfaceDraft(nextSettings, { persist = false } = {}) {
  preferences.settings = nextSettings;
  applyVisualSettings();
  applyLocalizedUi();
  renderDeviceGroupOptions();
  updateSuggestedIp();

  if (persist) {
    interfaceSettingsBaseline = { ...nextSettings };
    persistCachedInterfaceSettings(nextSettings);
  }
}

function restoreInterfaceBaseline() {
  if (!interfaceSettingsBaseline) {
    return;
  }

  preferences.settings = normalizeSettings(interfaceSettingsBaseline);
  applyVisualSettings();
  applyLocalizedUi();
  renderDeviceGroupOptions();
  updateSuggestedIp();
}

function setProfileSettingsStatus(message, tone = "muted") {
  elements.profileSettingsStatus.className = `result-card result-card--${tone}`;
  elements.profileSettingsStatus.textContent = message;
}

function setInterfaceSettingsStatus(message, tone = "muted") {
  elements.interfaceSettingsStatus.className = `result-card result-card--${tone}`;
  elements.interfaceSettingsStatus.textContent = message;
}

function handleInterfaceSettingsPreview() {
  if (!isSettingsModalOpen()) {
    return;
  }

  const nextSettings = collectInterfaceSettingsDraft();
  applyInterfaceDraft(nextSettings);
}

async function handleProfileSettingsSave() {
  try {
    setProfileSettingsStatus(t("profile_settings_saving"), "muted");
    const session = await apiRequest("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({
        username: elements.currentUserDisplay.value,
        displayName: elements.currentUserNameInput.value,
      }),
    });
    applyAuthSession(session);
    await refreshState(true);
    syncSettingsForm();
    setProfileSettingsStatus(t("profile_settings_saved"), "ok");
    showToast(t("profile_settings_saved"));
  } catch (error) {
    setProfileSettingsStatus(error.message || t("profile_settings_failed"), "danger");
  }
}

async function handleInterfaceSettingsSave() {
  const nextSettings = collectInterfaceSettingsDraft();

  try {
    setInterfaceSettingsStatus(t("interface_settings_applying"), "muted");
    applyInterfaceDraft(nextSettings, { persist: true });
    await savePreferences({
      ...nextSettings,
    });
    renderAll();
    setInterfaceSettingsStatus(t("interface_settings_saved"), "ok");
    showToast(t("interface_settings_saved"));
  } catch (error) {
    restoreInterfaceBaseline();
    syncSettingsForm();
    setInterfaceSettingsStatus(error.message || t("preferences_save_failed"), "danger");
  }
}

async function handleServerSettingsSave() {
  try {
    const interval = Number.parseInt(elements.settingsScanInterval.value, 10);
    const minInterval = state.settings?.limits?.scanIntervalMin || 15;
    const maxInterval = state.settings?.limits?.scanIntervalMax || 3600;

    if (!Number.isInteger(interval) || interval < minInterval || interval > maxInterval) {
      throw new Error(t("ping_interval_invalid", { min: minInterval, max: maxInterval }));
    }

    const subnetScanSettings = [...elements.settingsSubnetScanList.querySelectorAll("[data-subnet-scan-id]")]
      .map((input) => ({
        id: input.dataset.subnetScanId,
        scanEnabled: input.checked,
      }));

    await apiRequest("/settings", {
      method: "PATCH",
      body: JSON.stringify({
        scanIntervalSeconds: interval,
        defaultSubnetScanEnabled: elements.settingsDefaultSubnetScan.checked,
        subnetScanSettings,
      }),
    });
    await refreshState(true);
    syncSettingsForm();
    setServerSettingsStatus(t("ping_interval_saved", { interval }), "ok");
    showToast(t("ping_interval_toast", { interval }));
  } catch (error) {
    setServerSettingsStatus(error.message || t("server_data_load_failed"), "danger");
  }
}

async function handleDeviceTypeSettingsSave() {
  try {
    const normalizedDeviceTypes = collectCustomDeviceTypesFromCards();
    preferences.customDeviceTypes = normalizedDeviceTypes;
    await savePreferences({ customDeviceTypes: normalizedDeviceTypes });
    renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
    renderTemplateEditor();
    setDeviceTypeSettingsStatus(t("device_types_saved"), "ok");
  } catch (error) {
    setDeviceTypeSettingsStatus(error.message || t("device_types_invalid_form"), "danger");
  }
}

async function handleDeviceTypeSettingsReset() {
  preferences.customDeviceTypes = [];
  await savePreferences({ customDeviceTypes: [] });
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  renderTemplateEditor();
  setDeviceTypeSettingsStatus(t("device_types_reset_done"), "warn");
}

async function handleTemplateSettingsSave() {
  try {
    const normalizedTemplates = collectTemplateRulesFromCards();
    preferences.customGroupTemplates = normalizedTemplates;
    rebuildEffectiveGroupSuggestionTemplates();
    await savePreferences({ customGroupTemplates: normalizedTemplates });
    renderDeviceGroupOptions();
    updateSuggestedIp();
    renderTemplateEditor();
    setTemplateSettingsStatus(t("templates_saved"), "ok");
  } catch (error) {
    setTemplateSettingsStatus(error.message || t("templates_invalid"), "danger");
  }
}

async function handleTemplateJsonApply() {
  try {
    const parsedTemplates = JSON.parse(elements.templateEditor.value);
    const normalizedTemplates = normalizeGroupSuggestionTemplates(parsedTemplates);
    preferences.customGroupTemplates = normalizedTemplates;
    rebuildEffectiveGroupSuggestionTemplates();
    await savePreferences({ customGroupTemplates: normalizedTemplates });
    renderDeviceGroupOptions();
    updateSuggestedIp();
    renderTemplateEditor();
    setTemplateSettingsStatus(t("templates_json_applied"), "ok");
  } catch (error) {
    setTemplateSettingsStatus(error.message || t("templates_invalid"), "danger");
  }
}

async function handleTemplateSettingsReset() {
  preferences.customGroupTemplates = [];
  rebuildEffectiveGroupSuggestionTemplates();
  await savePreferences({ customGroupTemplates: [] });
  renderDeviceGroupOptions();
  updateSuggestedIp();
  renderTemplateEditor();
  setTemplateSettingsStatus(t("templates_reset_done"), "warn");
}

function prepareSubnetModal(subnet = null) {
  editingSubnetId = subnet?.id || "";
  elements.subnetForm.reset();
  elements.subnetModalTitle.textContent = subnet ? t("edit_subnet") : t("add_subnet");
  elements.subnetSubmitButton.textContent = subnet ? t("update_subnet") : t("save_subnet");
  if (subnet) {
    elements.subnetForm.elements.name.value = subnet.name;
    elements.subnetForm.elements.cidr.value = subnet.cidr;
    elements.subnetForm.elements.rangeStart.value = subnet.rangeStart;
    elements.subnetForm.elements.rangeEnd.value = subnet.rangeEnd;
    elements.subnetForm.elements.note.value = subnet.note || "";
    elements.subnetForm.elements.accessGroupId.value = subnet.accessGroupId || "";
    elements.subnetForm.elements.scanEnabled.checked = Boolean(subnet.scanEnabled);
  } else {
    elements.subnetForm.elements.scanEnabled.checked = true;
  }
}

function prepareAccessGroupForm(accessGroup = null) {
  editingAccessGroupId = accessGroup?.id || "";
  elements.accessGroupForm.reset();
  const submitButton = elements.accessGroupForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.textContent = accessGroup ? t("update_access_group") : t("save_access_group");
  }
  if (accessGroup) {
    elements.accessGroupForm.elements.name.value = accessGroup.name;
    elements.accessGroupForm.elements.description.value = accessGroup.description || "";
  }
}

function prepareUserForm(user = null) {
  editingUserId = user?.id || "";
  elements.userForm.reset();
  const passwordInput = elements.userForm.elements.password;
  const submitButton = elements.userForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.textContent = user ? t("update_user") : t("save_user");
  }
  if (user) {
    elements.userForm.elements.username.value = user.username;
    elements.userForm.elements.displayName.value = user.displayName || "";
    elements.userForm.elements.role.value = user.role || "viewer";
    passwordInput.value = "";
    passwordInput.required = false;
  } else {
    passwordInput.required = true;
  }
  renderUserAccessGroupOptions(user?.accessGroupIds || []);
  syncPasswordToggleButtons(elements.userForm);
}

function prepareGroupModal(group = null) {
  editingGroupId = group?.id || "";
  elements.groupForm.reset();
  elements.groupModalTitle.textContent = group ? t("edit_group") : t("add_group");
  elements.groupSubmitButton.textContent = group ? t("update_group") : t("save_group");
  if (group) {
    elements.groupForm.elements.subnetId.value = group.subnetId;
    elements.groupForm.elements.name.value = group.name;
    elements.groupForm.elements.note.value = group.note || "";
    elements.groupForm.elements.rangeStart.value = group.rangeStart;
    elements.groupForm.elements.rangeEnd.value = group.rangeEnd;
  }
}

function prepareDeviceModal(device = null) {
  editingDeviceId = device?.id || "";
  elements.deviceForm.reset();
  clearDeviceFormStatus();
  setDeviceFormPending(false);
  elements.deviceModalTitle.textContent = device ? t("edit_device") : t("add_device");
  elements.deviceSubmitButton.textContent = device ? t("update_device") : t("save_device");
  renderDeviceTypeOptions(device?.type || "server");
  if (device) {
    const subnet = resolveDeviceSubnet(device);
    const group = resolveDeviceGroup(device, subnet);
    elements.deviceForm.elements.name.value = device.name;
    elements.deviceForm.elements.ip.value = device.ip;
    elements.deviceForm.elements.mac.value = device.mac || "";
    elements.subnetSelect.value = subnet?.id || device.subnetId || "";
    renderDeviceGroupOptions(group?.id || "");
    elements.deviceGroupSelect.value = group?.id || "";
    elements.deviceForm.elements.note.value = device.note || "";
    deviceGroupSelectionMode = group ? "manual" : "auto";
  } else {
    deviceGroupSelectionMode = "auto";
    renderDeviceGroupOptions("");
  }
  updateSuggestedIp();
}

function handleOpenModalRequest(modalId) {
  if (!modalId) {
    return;
  }
  const trigger = document.querySelector(`[data-open-modal="${modalId}"]`);
  if (trigger?.disabled) {
    return;
  }

  if (modalId === "settings-modal") {
    openSettingsModal();
    return;
  }

  if (modalId === "subnet-modal") {
    prepareSubnetModal();
  } else if (modalId === "group-modal") {
    prepareGroupModal();
  } else if (modalId === "device-modal") {
    prepareDeviceModal();
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
  if (modalId === "settings-modal") {
    closeUserMenu();
  }
  const closeButton = modal.querySelector("[data-close-modal]");
  closeButton?.focus();
}

function closeModal(modalId) {
  const modal = modalId ? document.getElementById(modalId) : getOpenModal();
  if (!modal) {
    return;
  }
  if (modal.id === "password-modal" && state.auth?.user?.mustChangePassword && elements.passwordModalClose.hidden) {
    return;
  }

  modal.hidden = true;
  if (modal.id === "device-modal") {
    clearDeviceFormStatus();
    setDeviceFormPending(false);
    editingDeviceId = "";
  }
  if (modal.id === "subnet-modal") {
    editingSubnetId = "";
  }
  if (modal.id === "group-modal") {
    editingGroupId = "";
  }
  if (modal.id === "settings-modal") {
    restoreInterfaceBaseline();
    syncSettingsForm();
    interfaceSettingsBaseline = null;
  }
  if (!getOpenModal()) {
    document.body.classList.remove("modal-open");
  }
}

function getOpenModal() {
  return elements.modalBackdrops.find((modal) => !modal.hidden) || null;
}

function handleUserMenuToggle(event) {
  event.stopPropagation();
  const isExpanded = elements.userMenuButton.getAttribute("aria-expanded") === "true";
  if (isExpanded) {
    closeUserMenu();
    return;
  }

  elements.userMenuDropdown.hidden = false;
  elements.userMenuButton.setAttribute("aria-expanded", "true");
}

function closeUserMenu() {
  if (!elements.userMenuDropdown || !elements.userMenuButton) {
    return;
  }
  elements.userMenuDropdown.hidden = true;
  elements.userMenuButton.setAttribute("aria-expanded", "false");
}

function handleDocumentClick(event) {
  if (!elements.userMenuDropdown || elements.userMenuDropdown.hidden) {
    return;
  }

  if (!event.target.closest("#hero-account-menu")) {
    closeUserMenu();
  }
}

function openSettingsModal(sectionName = activeSettingsSection) {
  interfaceSettingsBaseline = { ...preferences.settings };
  syncSettingsForm();
  renderTemplateEditor();
  setServerSettingsStatus(t("ping_server_running", {
    interval: state.settings?.scanIntervalSeconds || 90,
  }), "muted");
  setProfileSettingsStatus(t("profile_settings_hint"), "muted");
  setInterfaceSettingsStatus(t("interface_settings_hint"), "muted");
  renderAdminPanels();
  setActiveSettingsSection(sectionName);
  openModal("settings-modal");
}

function applyAuthSession(session) {
  state.auth = session && session.authenticated
    ? {
      authenticated: true,
      user: session.user,
      accessGroups: session.accessGroups || [],
      capabilities: session.capabilities || state.auth.capabilities,
    }
    : {
      authenticated: false,
      user: null,
      accessGroups: [],
      capabilities: {
        isAdmin: false,
        canWrite: false,
        canManageUsers: false,
        canManageServerSettings: false,
        canManageAccessGroups: false,
      },
    };

  if (session?.bootstrapLoginHint) {
    elements.bootstrapHint.hidden = false;
    elements.bootstrapHint.textContent = t("bootstrap_login_hint", {
      username: session.bootstrapLoginHint.username,
      password: session.bootstrapLoginHint.password,
    });
  } else {
    elements.bootstrapHint.hidden = true;
  }
}

function applyPreferences(nextPreferences) {
  preferences.settings = nextPreferences.settings;
  preferences.customGroupTemplates = nextPreferences.customGroupTemplates;
  preferences.customDeviceTypes = nextPreferences.customDeviceTypes;
  persistCachedInterfaceSettings(preferences.settings);
  rebuildEffectiveGroupSuggestionTemplates();
  applyVisualSettings();
  applyLocalizedUi();
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
}

function openAuthScreen(session = null) {
  applyAuthSession(session);
  closeUserMenu();
  document.body.classList.add("app-ready");
  elements.authScreen.hidden = false;
  document.body.classList.add("auth-open");
  elements.authStatus.className = "result-card result-card--muted";
  elements.authStatus.textContent = t("auth_idle");
  elements.loginForm.reset();
  syncPasswordToggleButtons(elements.loginForm);
  elements.loginForm.querySelector('input[name="username"]')?.focus();
}

function closeAuthScreen() {
  elements.authScreen.hidden = true;
  document.body.classList.remove("auth-open");
}

function openPasswordModal(isForced = false) {
  elements.passwordStatus.className = "result-card result-card--muted form-grid__full";
  elements.passwordStatus.textContent = isForced ? t("password_force_notice") : t("password_change_hint");
  elements.passwordForm.reset();
  syncPasswordToggleButtons(elements.passwordForm);
  elements.passwordModalClose.hidden = isForced;
  openModal("password-modal");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  try {
    elements.authStatus.className = "result-card result-card--muted";
    elements.authStatus.textContent = t("auth_logging_in");
    const session = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });
    applyAuthSession(session);
    const verifiedSession = await apiRequest("/auth/session", { allowUnauthorized: true });
    applyAuthSession(verifiedSession);
    if (!verifiedSession?.authenticated) {
      throw new Error(t("auth_session_not_persisted"));
    }
    await finishAuthenticatedBootstrap();
  } catch (error) {
    elements.authStatus.className = "result-card result-card--danger";
    elements.authStatus.textContent = error.message;
  }
}

async function handleLogout() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    console.warn(error);
  } finally {
    disconnectLiveStream();
    if (pollIntervalId) {
      window.clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
    openAuthScreen();
    showToast(t("logout_done"));
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword !== confirmPassword) {
    elements.passwordStatus.className = "result-card result-card--danger form-grid__full";
    elements.passwordStatus.textContent = t("password_mismatch");
    return;
  }

  try {
    elements.passwordStatus.className = "result-card result-card--muted form-grid__full";
    elements.passwordStatus.textContent = t("password_updating");
    const session = await apiRequest("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    applyAuthSession(session);
    closeModal("password-modal");
    await refreshState(true);
    showToast(t("password_changed"));
  } catch (error) {
    elements.passwordStatus.className = "result-card result-card--danger form-grid__full";
    elements.passwordStatus.textContent = error.message;
  }
}

async function savePreferences(partial = null) {
  const payload = partial || {
    ...preferences.settings,
    customGroupTemplates: preferences.customGroupTemplates,
    customDeviceTypes: preferences.customDeviceTypes,
  };
  const savedPreferences = await apiRequest("/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  applyPreferences(normalizeUserPreferences(savedPreferences));
  renderTemplateEditor();
}

function renderPermissionAwareUi() {
  const capabilities = state.auth?.capabilities || {};
  const canWrite = Boolean(capabilities.canWrite);
  const isAdmin = Boolean(capabilities.isAdmin);

  document.body.dataset.canWrite = canWrite ? "true" : "false";
  document.body.dataset.isAdmin = isAdmin ? "true" : "false";

  elements.openAddButton.disabled = !canWrite;
  elements.subnetAccessGroupSelect.disabled = !canWrite;
  elements.subnetForm.querySelector('[type="submit"]').disabled = !canWrite;
  elements.deviceForm.querySelector('[type="submit"]').disabled = !canWrite || isDeviceSubmitting;
  elements.groupForm.querySelector('[type="submit"]').disabled = !canWrite;
  elements.importButton.disabled = !isAdmin;
  if (elements.exportBackupButton) {
    elements.exportBackupButton.disabled = !isAdmin;
  }
  elements.saveProfileSettingsButton.disabled = !state.auth?.authenticated;
  elements.saveInterfaceSettingsButton.disabled = !state.auth?.authenticated;
  elements.saveServerSettingsButton.disabled = !Boolean(capabilities.canManageServerSettings);
  elements.settingsDefaultSubnetScan.disabled = !Boolean(capabilities.canManageServerSettings);
  elements.settingsScanInterval.disabled = !Boolean(capabilities.canManageServerSettings);
  elements.clearDataButton.disabled = !isAdmin;
  elements.saveTemplateSettingsButton.disabled = !state.auth?.authenticated;
  elements.resetTemplateSettingsButton.disabled = !state.auth?.authenticated;
  elements.saveDeviceTypeSettingsButton.disabled = !state.auth?.authenticated;
  elements.resetDeviceTypeSettingsButton.disabled = !state.auth?.authenticated;
  if (elements.addCustomDeviceTypeButton) {
    elements.addCustomDeviceTypeButton.disabled = !state.auth?.authenticated;
  }
  if (elements.addTemplateRuleButton) {
    elements.addTemplateRuleButton.disabled = !state.auth?.authenticated;
  }

  elements.adminPanels.forEach((panel) => {
    panel.hidden = !isAdmin;
  });

  setActiveSettingsSection(activeSettingsSection);
}

function renderAdminPanels() {
  if (!editingAccessGroupId) {
    prepareAccessGroupForm();
  }
  if (!editingUserId) {
    prepareUserForm();
  }
  renderAccessGroupsTable();
  renderUsersTable();
  const editingUser = editingUserId
    ? (state.admin?.users || []).find((entry) => entry.id === editingUserId) || null
    : null;
  renderUserAccessGroupOptions(editingUser?.accessGroupIds || []);
}

function setActiveSettingsSection(sectionName) {
  const isAdmin = Boolean(state.auth?.capabilities?.isAdmin);
  const requestedSection = sectionName || "profile";
  const resolvedSection = requestedSection === "administration" && !isAdmin
    ? "profile"
    : requestedSection;
  activeSettingsSection = resolvedSection;

  elements.settingsNavButtons.forEach((button) => {
    const isAdminOnly = button.classList.contains("admin-only");
    if (isAdminOnly && !isAdmin) {
      button.hidden = true;
      button.classList.remove("is-active");
      return;
    }

    button.hidden = false;
    button.classList.toggle("is-active", button.dataset.settingsTab === activeSettingsSection);
  });

  elements.settingsSections.forEach((section) => {
    const sectionNameForNode = section.dataset.settingsSection;
    const isAdminOnly = section.classList.contains("admin-only");
    const isActive = sectionNameForNode === activeSettingsSection;
    section.hidden = isAdminOnly ? !isAdmin || !isActive : !isActive;
  });

  if (activeSettingsSection === "templates") {
    setActiveTemplateSection(activeTemplateSection);
  }
}

function setActiveTemplateSection(sectionName) {
  const resolvedSection = sectionName || "device-types";
  activeTemplateSection = resolvedSection;

  elements.templateTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.templateTab === activeTemplateSection);
    button.setAttribute("aria-selected", button.dataset.templateTab === activeTemplateSection ? "true" : "false");
  });

  elements.templatePanels.forEach((panel) => {
    panel.hidden = panel.dataset.templatePanel !== activeTemplateSection;
  });
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && elements.userMenuDropdown && !elements.userMenuDropdown.hidden) {
    closeUserMenu();
  }
  if (event.key === "Escape" && getOpenModal()) {
    closeModal();
  }
}

function setActiveView(viewName) {
  activeView = viewName || "dashboard";
  closeUserMenu();

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
    const normalizedSnapshot = normalizeState(snapshot);
    const shouldSkipFullRender =
      isAuthReady &&
      normalizedSnapshot.meta.revision === state.meta.revision &&
      normalizedSnapshot.auth?.authenticated === state.auth?.authenticated &&
      normalizedSnapshot.auth?.user?.id === state.auth?.user?.id;

    if (shouldSkipFullRender) {
      state.auth = normalizedSnapshot.auth || state.auth;
      state.settings = normalizedSnapshot.settings;
      return true;
    }

    applyState(normalizedSnapshot);
    renderAll();
    isAuthReady = true;
    if (state.auth?.user?.mustChangePassword) {
      openPasswordModal(true);
    }
    return true;
  } catch (error) {
    console.error(error);
    if (error.status === 401) {
      openAuthScreen();
      disconnectLiveStream();
      return false;
    }
    if (!silent) {
      showToast(error.message || t("server_data_load_failed"), true);
    }
    return false;
  }
}

function connectLiveStream() {
  if (!state.auth?.authenticated) {
    return;
  }
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`${API_BASE}/stream`, { withCredentials: true });
  eventSource.onopen = () => {};

  eventSource.onmessage = async () => {
    await refreshState(true);
  };

  eventSource.onerror = () => {};
}

function disconnectLiveStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function applyState(snapshot) {
  state.subnets = snapshot.subnets;
  state.groups = snapshot.groups;
  state.devices = snapshot.devices;
  state.scanResults = snapshot.scanResults;
  state.history = snapshot.history;
  state.meta = snapshot.meta;
  state.settings = snapshot.settings;
  state.accessGroups = snapshot.accessGroups || [];
  state.auth = snapshot.auth || state.auth;
  state.admin = snapshot.admin || null;
  applyPreferences(normalizeUserPreferences(snapshot.preferences || {}));
}

async function handleSubnetSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const formData = new FormData(form);
    const currentSubnet = editingSubnetId
      ? state.subnets.find((entry) => entry.id === editingSubnetId) || null
      : null;
    const subnet = normalizeSubnet({
      id: currentSubnet?.id || createId(),
      name: formData.get("name"),
      cidr: formData.get("cidr"),
      rangeStart: formData.get("rangeStart"),
      rangeEnd: formData.get("rangeEnd"),
      scanEnabled: formData.get("scanEnabled") === "on",
      accessGroupId: formData.get("accessGroupId"),
      note: formData.get("note"),
      createdAt: currentSubnet?.createdAt || new Date().toISOString(),
    });

    const isEditing = Boolean(editingSubnetId);
    await apiRequest(isEditing ? `/subnets/${encodeURIComponent(editingSubnetId)}` : "/subnets", {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(subnet),
    });

    await refreshState(true);
    form.reset();
    closeModal("subnet-modal");
    showToast(t(isEditing ? "subnet_updated" : "subnet_added", { name: subnet.name }));
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
    const currentDevice = editingDeviceId
      ? state.devices.find((entry) => entry.id === editingDeviceId) || null
      : null;
    const device = normalizeDevice(
      {
        id: currentDevice?.id || createId(),
        name: formData.get("name"),
        ip: formData.get("ip"),
        mac: formData.get("mac"),
        type: formData.get("type"),
        subnetId: formData.get("subnetId"),
        groupId: formData.get("groupId"),
        note: formData.get("note"),
        createdAt: currentDevice?.createdAt || new Date().toISOString(),
      },
      state.subnets,
      state.groups
    );

    const isEditing = Boolean(editingDeviceId);
    await apiRequest(isEditing ? `/devices/${encodeURIComponent(editingDeviceId)}` : "/devices", {
      method: isEditing ? "PATCH" : "POST",
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

    showToast(t(isEditing ? "device_updated" : "device_added", { name: device.name }));
  } catch (error) {
    setDeviceFormStatus(error.message, "danger");
    showToast(error.message, true);
  } finally {
    isDeviceSubmitting = false;
    setDeviceFormPending(false);
  }
}

function handleStatNavigation(target) {
  switch (target) {
    case "subnets":
      setActiveView("registry");
      document.getElementById("registry-panel-subnets")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    case "devices":
    case "occupied":
      setActiveView("registry");
      document.getElementById("registry-panel-devices")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    case "available":
      setActiveView("registry");
      document.getElementById("registry-panel-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    default:
      return;
  }
}

function handleRegistryDeviceFiltersChange() {
  renderDevicesTable();
  const searchTerm = normalizeSearch(elements.searchInput?.value || "");
  const quickFilter = elements.deviceFilterSelect?.value || "all";
  const groupFilter = elements.deviceGroupFilterSelect?.value || "";
  if (searchTerm || quickFilter !== "all" || groupFilter) {
    document.getElementById("registry-panel-devices")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function handleGroupSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const formData = new FormData(form);
    const currentGroup = editingGroupId
      ? state.groups.find((entry) => entry.id === editingGroupId) || null
      : null;
    const group = normalizeRangeGroup(
      {
        id: currentGroup?.id || createId(),
        subnetId: formData.get("subnetId"),
        name: formData.get("name"),
        rangeStart: formData.get("rangeStart"),
        rangeEnd: formData.get("rangeEnd"),
        note: formData.get("note"),
        createdAt: currentGroup?.createdAt || new Date().toISOString(),
      },
      state.subnets,
      state.groups
    );

    const isEditing = Boolean(editingGroupId);
    const savedGroup = await apiRequest(isEditing ? `/groups/${encodeURIComponent(editingGroupId)}` : "/groups", {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(group),
    });

    let scanSummary = null;
    let scanError = null;
    const groupSubnet = state.subnets.find((entry) => entry.id === group.subnetId);
    if (isSubnetPingVisible(groupSubnet)) {
      try {
        scanSummary = await apiRequest("/scan", {
          method: "POST",
          body: JSON.stringify({ groupId: savedGroup.id }),
        });
      } catch (error) {
        scanError = error;
        console.error(error);
      }
    }

    await refreshState(true);
    form.reset();
    closeModal("group-modal");

    if (scanSummary) {
      const refreshedGroup = state.groups.find((entry) => entry.id === savedGroup.id);
      const reachableSet = getReachableScanIps();
      const assignedCount = refreshedGroup
        ? countAssignedInGroup(refreshedGroup)
        : 0;
      const pingOnlyCount = refreshedGroup
        ? countPingOnlyInGroup(refreshedGroup, reachableSet)
        : scanSummary.reachableIps;
      const freeCount = refreshedGroup
        ? countFreeInGroup(refreshedGroup)
        : "—";
      showToast(t(isEditing ? "group_updated_scanned" : "group_added_scanned", {
        name: group.name,
        scanned: scanSummary.scannedIps,
        assigned: assignedCount,
        pingOnly: pingOnlyCount,
        free: freeCount,
      }));
      return;
    }

    if (scanError) {
      showToast(t(isEditing ? "group_updated_scan_failed" : "group_added_scan_failed", { name: group.name }), true);
      return;
    }

    showToast(t(isEditing ? "group_updated" : "group_added", { name: group.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleAccessGroupSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  try {
    const isEditing = Boolean(editingAccessGroupId);
    await apiRequest(isEditing ? `/admin/access-groups/${encodeURIComponent(editingAccessGroupId)}` : "/admin/access-groups", {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
      }),
    });
    form.reset();
    editingAccessGroupId = "";
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.textContent = t("save_access_group");
    }
    await refreshState(true);
    setAccessGroupStatus(t(isEditing ? "access_group_updated" : "access_group_saved"), "ok");
  } catch (error) {
    setAccessGroupStatus(error.message, "danger");
  }
}

async function handleUserSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const accessGroupIds = [...elements.userAccessGroupOptions.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => input.value);

  try {
    const isEditing = Boolean(editingUserId);
    await apiRequest(isEditing ? `/admin/users/${encodeURIComponent(editingUserId)}` : "/admin/users", {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        displayName: formData.get("displayName"),
        role: formData.get("role"),
        password: formData.get("password"),
        accessGroupIds,
        mustChangePassword: isEditing ? undefined : true,
      }),
    });
    form.reset();
    editingUserId = "";
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.textContent = t("save_user");
    }
    syncPasswordToggleButtons(form);
    renderUserAccessGroupOptions();
    await refreshState(true);
    setUserStatus(t(isEditing ? "user_updated" : "user_saved"), "ok");
  } catch (error) {
    setUserStatus(error.message, "danger");
  }
}

async function handleAccessGroupTableActions(event) {
  const editButton = event.target.closest("[data-edit-access-group]");
  if (editButton) {
    const accessGroup = (state.admin?.accessGroups || []).find((entry) => entry.id === editButton.dataset.editAccessGroup);
    if (!accessGroup) {
      return;
    }
    openSettingsModal("administration");
    prepareAccessGroupForm(accessGroup);
    document.getElementById("admin-access-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const deleteButton = event.target.closest("[data-delete-access-group]");
  if (!deleteButton) {
    return;
  }

  const accessGroup = (state.admin?.accessGroups || []).find((entry) => entry.id === deleteButton.dataset.deleteAccessGroup);
  if (!accessGroup) {
    return;
  }

  const confirmed = window.confirm(t("delete_access_group_confirm", { name: accessGroup.name }));
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/admin/access-groups/${encodeURIComponent(accessGroup.id)}`, { method: "DELETE" });
    if (editingAccessGroupId === accessGroup.id) {
      prepareAccessGroupForm();
    }
    await refreshState(true);
    setAccessGroupStatus(t("access_group_deleted", { name: accessGroup.name }), "ok");
  } catch (error) {
    setAccessGroupStatus(error.message, "danger");
  }
}

async function handleUserAdminTableActions(event) {
  const editButton = event.target.closest("[data-edit-user]");
  if (editButton) {
    const user = (state.admin?.users || []).find((entry) => entry.id === editButton.dataset.editUser);
    if (!user) {
      return;
    }
    openSettingsModal("administration");
    prepareUserForm(user);
    document.getElementById("admin-users-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const resetButton = event.target.closest("[data-reset-user-password]");
  if (resetButton) {
    const user = (state.admin?.users || []).find((entry) => entry.id === resetButton.dataset.resetUserPassword);
    if (!user) {
      return;
    }
    const newPassword = window.prompt(t("reset_password_prompt", { name: user.username }), "");
    if (newPassword === null) {
      return;
    }

    try {
      await apiRequest(`/admin/users/${encodeURIComponent(user.id)}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      await refreshState(true);
      setUserStatus(t("user_password_reset_done", { name: user.username }), "ok");
    } catch (error) {
      setUserStatus(error.message, "danger");
    }
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-user-active]");
  if (toggleButton) {
    const user = (state.admin?.users || []).find((entry) => entry.id === toggleButton.dataset.toggleUserActive);
    if (!user) {
      return;
    }

    const nextIsActive = !user.isActive;
    const confirmed = window.confirm(
      t(nextIsActive ? "enable_user_confirm" : "disable_user_confirm", { name: user.username })
    );
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          accessGroupIds: user.accessGroupIds || [],
          isActive: nextIsActive,
        }),
      });
      await refreshState(true);
      setUserStatus(t(nextIsActive ? "user_enabled" : "user_disabled", { name: user.username }), "ok");
    } catch (error) {
      setUserStatus(error.message, "danger");
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-user]");
  if (!deleteButton) {
    return;
  }

  const deleteTarget = (state.admin?.users || []).find((entry) => entry.id === deleteButton.dataset.deleteUser);
  if (!deleteTarget) {
    return;
  }

  const deleteConfirmed = window.confirm(t("delete_user_confirm", { name: deleteTarget.username }));
  if (!deleteConfirmed) {
    return;
  }

  try {
    await apiRequest(`/admin/users/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
    if (editingUserId === deleteTarget.id) {
      prepareUserForm();
    }
    await refreshState(true);
    setUserStatus(t("user_deleted", { name: deleteTarget.username }), "ok");
  } catch (error) {
    setUserStatus(error.message, "danger");
  }
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
  const pingState = getVisiblePingState(normalizedIp, subnet);

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
  // Global ping widgets were intentionally removed from the main shell.
}

function syncPasswordToggleButtons(scope = document) {
  scope.querySelectorAll?.("[data-password-toggle]").forEach((button) => {
    const field = button.closest(".password-field");
    const input = field?.querySelector('input[type="password"], input[type="text"]');
    if (!input) {
      return;
    }
    const isVisible = input.type === "text";
    button.textContent = isVisible ? t("password_toggle_hide") : t("password_toggle_show");
    button.setAttribute("aria-pressed", isVisible ? "true" : "false");
  });
}

function handlePasswordToggle(event) {
  const button = event.currentTarget;
  const field = button.closest(".password-field");
  const input = field?.querySelector('input[type="password"], input[type="text"]');
  if (!input) {
    return;
  }
  input.type = input.type === "password" ? "text" : "password";
  syncPasswordToggleButtons(field.parentElement || document);
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
  if (!isSubnetPingVisible(subnet)) {
    if (preferences.settings.suggestionMode === "detailed") {
      return group
        ? t("suggestion_detailed_group_no_ping", {
          name: group.name,
          ip: suggestion.ip,
          range: formatGroupRange(group, true),
          free: suggestion.freeCount,
          assigned: suggestion.assignedCount,
        })
        : t("suggestion_detailed_subnet_no_ping", {
          name: subnet.name,
          ip: suggestion.ip,
          range: `${subnet.rangeStart}-${subnet.rangeEnd}`,
          free: suggestion.freeCount,
          assigned: suggestion.assignedCount,
        });
    }

    return group
      ? t("suggestion_compact_group_no_ping", {
        name: group.name,
        ip: suggestion.ip,
        free: suggestion.freeCount,
        assigned: suggestion.assignedCount,
      })
      : t("suggestion_compact_subnet_no_ping", {
        ip: suggestion.ip,
        free: suggestion.freeCount,
        assigned: suggestion.assignedCount,
      });
  }

  if (preferences.settings.suggestionMode === "detailed") {
    if (group) {
      return t("suggestion_detailed_group", {
        name: group.name,
        ip: suggestion.ip,
        range: formatGroupRange(group, true),
        free: suggestion.freeCount,
        safeFree: suggestion.safeFreeCount,
        assigned: suggestion.assignedCount,
        pingOnly: suggestion.pingOnlyCount,
      });
    }

    return t("suggestion_detailed_subnet", {
      name: subnet.name,
      ip: suggestion.ip,
      range: `${subnet.rangeStart}-${subnet.rangeEnd}`,
      free: suggestion.freeCount,
      safeFree: suggestion.safeFreeCount,
      assigned: suggestion.assignedCount,
      pingOnly: suggestion.pingOnlyCount,
    });
  }

  return group
    ? t("suggestion_compact_group", {
      name: group.name,
      ip: suggestion.ip,
      free: suggestion.freeCount,
      safeFree: suggestion.safeFreeCount,
      assigned: suggestion.assignedCount,
      pingOnly: suggestion.pingOnlyCount,
    })
    : t("suggestion_compact_subnet", {
      ip: suggestion.ip,
      free: suggestion.freeCount,
      safeFree: suggestion.safeFreeCount,
      assigned: suggestion.assignedCount,
      pingOnly: suggestion.pingOnlyCount,
    });
}

function suggestFreeIp(subnet, group = null) {
  const pingVisible = isSubnetPingVisible(subnet);
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
    (pingVisible
      ? state.scanResults.filter((result) => {
          if (result.subnetId !== subnet.id || !result.isReachable) {
            return false;
          }
          if (!group) {
            return true;
          }
          const ipInt = ipToInt(result.ip);
          return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
        })
      : [])
      .map((result) => result.ip)
  );
  const pingOnlyIps = new Set([...reachableIps].filter((ip) => !assignedIps.has(ip)));

  const startInt = group ? group.rangeStartInt : subnet.rangeStartInt;
  const endInt = group ? group.rangeEndInt : subnet.rangeEndInt;
  let firstAssignedFreeIp = null;
  for (let ipInt = startInt; ipInt <= endInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (assignedIps.has(ip)) {
      continue;
    }
    if (!firstAssignedFreeIp) {
      firstAssignedFreeIp = ip;
    }
    if (!reachableIps.has(ip)) {
      return {
        ip,
        assignedCount: assignedIps.size,
        reachableCount: reachableIps.size,
        pingOnlyCount: pingOnlyIps.size,
        freeCount: Math.max(endInt - startInt + 1 - assignedIps.size, 0),
        safeFreeCount: Math.max(endInt - startInt + 1 - assignedIps.size - pingOnlyIps.size, 0),
      };
    }
  }

  if (firstAssignedFreeIp) {
    return {
      ip: firstAssignedFreeIp,
      assignedCount: assignedIps.size,
      reachableCount: reachableIps.size,
      pingOnlyCount: pingOnlyIps.size,
      freeCount: Math.max(endInt - startInt + 1 - assignedIps.size, 0),
      safeFreeCount: 0,
    };
  }

  return null;
}

async function rescanScopeForDevice(device, selectedGroupId = "") {
  const subnetId = device.subnetId || findSubnetForIp(ipToInt(device.ip), state.subnets)?.id || "";
  const subnet = subnetId ? state.subnets.find((entry) => entry.id === subnetId) : null;
  const group =
    (selectedGroupId
      ? state.groups.find((entry) => entry.id === selectedGroupId && entry.subnetId === subnetId) || null
      : null) || (subnetId ? findRangeGroupForIp(ipToInt(device.ip), subnetId) : null);

  if (subnet && !subnet.scanEnabled) {
    return;
  }

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
  const payload = serializeSnapshotPayload(state);

  downloadFile(
    `atlas-${timestampForFile()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
  closeModal("export-modal");
}

async function exportBackup() {
  const include = {
    inventory: Boolean(elements.backupIncludeInventory?.checked),
    activity: Boolean(elements.backupIncludeActivity?.checked),
    system: Boolean(elements.backupIncludeSystem?.checked),
    access: Boolean(elements.backupIncludeAccess?.checked),
    preferences: Boolean(elements.backupIncludePreferences?.checked),
  };

  if (!Object.values(include).some(Boolean)) {
    showToast(t("backup_export_select_section"), true);
    return;
  }

  try {
    const backup = await apiRequest("/admin/backup/export", {
      method: "POST",
      body: JSON.stringify({ include }),
    });

    downloadFile(
      `atlas-backup-${timestampForFile()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json"
    );
    closeModal("export-modal");
    showToast(t("backup_export_done"));
  } catch (error) {
    showToast(error.message || t("server_data_load_failed"), true);
  }
}

function exportSubnetsCsv() {
  const rows = [...state.subnets]
    .sort((left, right) => {
      const networkDiff = left.networkInt - right.networkInt;
      if (networkDiff !== 0) {
        return networkDiff;
      }
      const maskDiff = Number(left.maskBits || 0) - Number(right.maskBits || 0);
      if (maskDiff !== 0) {
        return maskDiff;
      }
      return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    })
    .map((subnet) => ({
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
  const rows = [...state.groups]
    .sort((left, right) => {
      const leftSubnet = state.subnets.find((entry) => entry.id === left.subnetId);
      const rightSubnet = state.subnets.find((entry) => entry.id === right.subnetId);
      const subnetDiff = Number(leftSubnet?.networkInt || 0) - Number(rightSubnet?.networkInt || 0);
      if (subnetDiff !== 0) {
        return subnetDiff;
      }
      const rangeDiff = ipToInt(left.rangeStart) - ipToInt(right.rangeStart);
      if (rangeDiff !== 0) {
        return rangeDiff;
      }
      return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    })
    .map((group) => {
      const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
      return {
        [t("export_header_name")]: group.name,
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
  const rows = [...state.devices]
    .sort((left, right) => {
      const subnetDiff = Number(resolveDeviceSubnet(left)?.networkInt || 0) - Number(resolveDeviceSubnet(right)?.networkInt || 0);
      if (subnetDiff !== 0) {
        return subnetDiff;
      }
      const ipDiff = ipToInt(left.ip) - ipToInt(right.ip);
      if (ipDiff !== 0) {
        return ipDiff;
      }
      return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    })
    .map((device) => {
      const subnet = resolveDeviceSubnet(device);
      const group = resolveDeviceGroup(device, subnet);
      const pingState = getPingState(device.ip);
      return {
        [t("export_header_name")]: device.name,
        [t("export_header_ip")]: device.ip,
        [t("export_header_mac")]: device.mac || "",
        [t("export_header_type")]: device.type || device.unknownType || "",
        [t("export_header_subnet")]: subnet?.name || "",
        [t("export_header_cidr")]: subnet?.cidr || "",
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
    const parsedJson = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : null;

    if (parsedJson && parsedJson.kind === "atlas-backup") {
      const confirmed = window.confirm(t("backup_import_confirm"));
      if (!confirmed) {
        return;
      }

      const result = await apiRequest("/admin/backup/import", {
        method: "POST",
        body: JSON.stringify({ backup: parsedJson }),
      });

      if (result?.requiresReauth) {
        disconnectLiveStream();
        if (pollIntervalId) {
          window.clearInterval(pollIntervalId);
          pollIntervalId = null;
        }
        showToast(t("backup_import_requires_reauth"));
        window.location.reload();
        return;
      }

      await refreshState(true);
      showToast(t("backup_import_done", { name: file.name }));
    } else {
      const shouldReplace = window.confirm(t("import_confirm_replace"));

      if (parsedJson) {
        importJson(parsedJson, shouldReplace, state);
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        importCsv(text, shouldReplace, state);
      } else {
        throw new Error(t("import_supported_only"));
      }

      await apiRequest("/state", {
        method: "PUT",
        body: JSON.stringify(serializeSnapshotPayload(state)),
      });

      await refreshState(true);
      showToast(t("import_success", { name: file.name }));
    }
  } catch (error) {
    applyState(snapshotBeforeImport);
    renderAll();
    showToast(error.message, true);
  } finally {
    event.currentTarget.value = "";
  }
}

function importJson(parsed, replace, targetState) {
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
      {
        const existingSubnet = findExistingSubnetForCsv(row, targetState.subnets);
        return normalizeSubnet({
          id: row.id || existingSubnet?.id || createId(),
          name: row.name,
          cidr: row.cidr,
          rangeStart: row.range_start || row.rangeStart,
          rangeEnd: row.range_end || row.rangeEnd,
          note: row.note,
        });
      }
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

      const existingGroup = findExistingGroupForCsv(row, subnet.id, targetState.groups);

      importedGroups.push(
        normalizeRangeGroup(
          {
            id: row.id || existingGroup?.id || createId(),
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
      const existingDevice = findExistingDeviceForCsv(row, targetState.devices);
      return normalizeDevice(
        {
          id: row.id || existingDevice?.id || createId(),
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
    await refreshState(true);
    showToast(t("clear_success"));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleSubnetTableActions(event) {
  const editButton = event.target.closest("[data-edit-subnet]");
  if (editButton) {
    const subnet = state.subnets.find((entry) => entry.id === editButton.dataset.editSubnet);
    if (!subnet) {
      return;
    }
    prepareSubnetModal(subnet);
    openModal("subnet-modal");
    return;
  }

  const scanButton = event.target.closest("[data-scan-subnet]");
  if (scanButton) {
    const subnetId = scanButton.dataset.scanSubnet;
    const subnet = state.subnets.find((entry) => entry.id === subnetId);
    if (!subnet || isManualScanRunning) {
      return;
    }

    isManualScanRunning = true;
    scanButton.disabled = true;
    scanButton.textContent = t("scan_now_running");

    try {
      const summary = await apiRequest("/scan", {
        method: "POST",
        body: JSON.stringify({ subnetId }),
      });
      await refreshState(true);
      showToast(t("manual_scan_subnet_done", {
        name: subnet.name,
        ips: summary.scannedIps,
        reachable: summary.reachableIps,
      }));
    } catch (error) {
      showToast(error.message, true);
    } finally {
      isManualScanRunning = false;
      scanButton.disabled = false;
      scanButton.textContent = t("scan_subnet_button");
    }
    return;
  }

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

async function handleSubnetScanToggle(event) {
  const input = event.target.closest("[data-subnet-scan-toggle]");
  if (!input) {
    return;
  }

  const subnetId = input.dataset.subnetScanToggle;
  const subnet = state.subnets.find((entry) => entry.id === subnetId);
  if (!subnet) {
    return;
  }

  const nextValue = input.checked;
  input.disabled = true;

  try {
    await apiRequest("/settings", {
      method: "PATCH",
      body: JSON.stringify({
        subnetScanSettings: [{ id: subnetId, scanEnabled: nextValue }],
      }),
    });
    await refreshState(true);
    showToast(t("subnet_scan_toggle_saved", {
      name: subnet.name,
      state: nextValue ? t("table_auto_scan_on") : t("table_auto_scan_off"),
    }));
  } catch (error) {
    input.checked = !nextValue;
    input.disabled = false;
    showToast(error.message, true);
  }
}

async function handleGroupTableActions(event) {
  const toggleButton = event.target.closest("[data-toggle-group-devices]");
  if (toggleButton) {
    const groupId = toggleButton.dataset.toggleGroupDevices;
    if (expandedGroupIds.has(groupId)) {
      expandedGroupIds.delete(groupId);
    } else {
      expandedGroupIds.add(groupId);
    }
    renderGroupsTable();
    return;
  }

  const editButton = event.target.closest("[data-edit-group]");
  if (editButton) {
    const group = state.groups.find((entry) => entry.id === editButton.dataset.editGroup);
    if (!group) {
      return;
    }
    prepareGroupModal(group);
    openModal("group-modal");
    return;
  }

  const editDeviceButton = event.target.closest("[data-edit-device]");
  if (editDeviceButton) {
    const device = state.devices.find((entry) => entry.id === editDeviceButton.dataset.editDevice);
    if (!device) {
      return;
    }
    prepareDeviceModal(device);
    openModal("device-modal");
    return;
  }

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
  const toggleButton = event.target.closest("[data-toggle-devices-list]");
  if (toggleButton) {
    showAllDevicesInRegistry = !showAllDevicesInRegistry;
    renderDevicesTable();
    return;
  }

  const copyButton = event.target.closest("[data-copy-ip]");
  if (copyButton) {
    const ip = copyButton.dataset.copyIp;
    if (!navigator.clipboard?.writeText) {
      showToast(t("copy_ip_failed"), true);
      return;
    }
    navigator.clipboard.writeText(ip)
      .then(() => showToast(t("copy_ip_done", { ip })))
      .catch(() => showToast(t("copy_ip_failed"), true));
    return;
  }

  const jumpGroupButton = event.target.closest("[data-jump-group]");
  if (jumpGroupButton) {
    const groupId = jumpGroupButton.dataset.jumpGroup;
    expandedGroupIds.add(groupId);
    setActiveView("registry");
    renderGroupsTable();
    document.getElementById("registry-panel-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const editButton = event.target.closest("[data-edit-device]");
  if (editButton) {
    const device = state.devices.find((entry) => entry.id === editButton.dataset.editDevice);
    if (!device) {
      return;
    }
    prepareDeviceModal(device);
    openModal("device-modal");
    return;
  }

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
  if (!isSettingsModalOpen()) {
    syncSettingsForm();
  }
  renderSubnetOptions();
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  renderDeviceGroupFilterOptions();
  renderSubnetsTable();
  renderGroupsTable();
  renderDevicesTable();
  renderHistoryTable();
  renderAdminPanels();
  renderStats();
  renderDashboardPanels();
  updateAutomationWidgets();
  updateSuggestedIp();
  renderPermissionAwareUi();
  if (isSettingsModalOpen()) {
    applyInterfaceDraft(collectInterfaceSettingsDraft());
  }
}

function renderDeviceGroupFilterOptions() {
  if (!elements.deviceGroupFilterSelect) {
    return;
  }

  const previousValue = elements.deviceGroupFilterSelect.value;
  const options = [`<option value="">${escapeHtml(t("device_group_filter_all"))}</option>`];
  state.groups
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, getLanguage()))
    .forEach((group) => {
      options.push(`<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)} · ${escapeHtml(formatGroupRange(group, true))}</option>`);
    });

  elements.deviceGroupFilterSelect.innerHTML = options.join("");
  if (previousValue && state.groups.some((group) => group.id === previousValue)) {
    elements.deviceGroupFilterSelect.value = previousValue;
  } else {
    elements.deviceGroupFilterSelect.value = "";
  }
}

function renderSubnetOptions() {
  const previousDeviceSubnet = elements.subnetSelect.value;
  const previousDeviceGroup = elements.deviceGroupSelect.value;
  const previousGroupSubnet = elements.groupSubnetSelect.value;
  const previousSubnetAccessGroup = elements.subnetAccessGroupSelect.value;
  const options = [`<option value="">${escapeHtml(t("auto_detect_ip"))}</option>`];
  const requiredOptions = [`<option value="">${escapeHtml(t("select_subnet"))}</option>`];
  const accessGroupOptions = [`<option value="">${escapeHtml(t("access_group_public"))}</option>`];

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
  state.accessGroups
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .forEach((group) => {
      accessGroupOptions.push(`<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`);
    });
  elements.subnetAccessGroupSelect.innerHTML = accessGroupOptions.join("");
  elements.subnetSelect.value = previousDeviceSubnet;
  elements.groupSubnetSelect.value = previousGroupSubnet;
  elements.subnetAccessGroupSelect.value = previousSubnetAccessGroup;
  renderDeviceGroupOptions(previousDeviceGroup);
}

function renderSubnetsTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
  const canManageAutomation = Boolean(state.auth?.capabilities?.canManageServerSettings);
  if (state.subnets.length === 0) {
    elements.subnetsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">${escapeHtml(t("empty_subnets"))}</td>
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
      const pingVisible = isSubnetPingVisible(subnet);
      const assignedCount = countAssignedInSubnet(subnet);
      const pingOnlyCount = countPingOnlyInSubnet(subnet, reachableScanIps);
      const freeCount = countFreeInSubnet(subnet);
      const groups = getGroupsInSubnet(subnet.id);
      const groupSummary = groups.length === 0
        ? t("no_data")
        : `${groups.length} · ${groups
            .slice(0, 2)
            .map((group) => group.name)
            .join(", ")}${groups.length > 2 ? "…" : ""}`;

      return `
        <tr>
          <td>
            <strong>${escapeHtml(subnet.name)}</strong>
            <div class="secondary-line">${escapeHtml(subnet.accessGroupName || t("access_group_public_short"))}</div>
          </td>
          <td class="mono">${escapeHtml(subnet.cidr)}</td>
          <td class="mono">${escapeHtml(subnet.rangeStart)} - ${escapeHtml(subnet.rangeEnd)}</td>
          <td>
            <span class="pill">${escapeHtml(t("in_database_short", { count: assignedCount }))}</span>
            ${pingVisible ? `<span class="pill">${escapeHtml(t("ping_only_short", { count: pingOnlyCount }))}</span>` : ""}
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </td>
          <td><div class="secondary-line">${escapeHtml(groupSummary)}</div></td>
          <td>${escapeHtml(subnet.note || t("no_data"))}</td>
          <td>
            <label class="table-switch" title="${escapeHtml(t("table_auto_scan_note"))}">
              <input
                type="checkbox"
                class="table-switch__input"
                data-subnet-scan-toggle="${escapeHtml(subnet.id)}"
                ${subnet.scanEnabled ? "checked" : ""}
                ${canManageAutomation ? "" : "disabled"}
              >
              <span class="table-switch__slider" aria-hidden="true"></span>
              <span class="table-switch__label">${escapeHtml(subnet.scanEnabled ? t("table_auto_scan_on") : t("table_auto_scan_off"))}</span>
            </label>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="row-button" data-edit-subnet="${escapeHtml(subnet.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              ${subnet.scanEnabled ? `<button type="button" class="row-button" data-scan-subnet="${escapeHtml(subnet.id)}" ${canManageAutomation ? "" : "disabled"}>${escapeHtml(t("scan_subnet_button"))}</button>` : ""}
              <button type="button" class="row-button row-button--danger" data-delete-subnet="${escapeHtml(subnet.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
            </div>
          </td>
        </tr>
      `;
    });

  elements.subnetsTableBody.innerHTML = rows.join("");
  elements.subnetsCounter.textContent = formatRecordsCount(state.subnets.length);
}

function renderGroupsTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
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
      const pingVisible = isSubnetPingVisible(subnet);
      const deviceCount = countAssignedInGroup(group);
      const pingOnlyCount = countPingOnlyInGroup(group, reachableSet);
      const freeCount = countFreeInGroup(group);
      const groupDevices = state.devices
        .filter((device) => {
          const subnetId = device.subnetId || resolveDeviceSubnet(device)?.id || "";
          if (subnetId !== group.subnetId) {
            return false;
          }
          const ipInt = ipToInt(device.ip);
          return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
        })
        .sort((left, right) => ipToInt(left.ip) - ipToInt(right.ip));
      const isExpanded = expandedGroupIds.has(group.id);
      const groupDevicesMarkup = groupDevices.length > 0
        ? groupDevices.map((device) => {
          const status = evaluateDeviceStatus(device, subnet);
          const pingBadge = renderPingBadge(device.ip, subnet);
          return `
            <li class="group-device-item">
              <div class="group-device-item__main">
                <strong>${escapeHtml(device.name)}</strong>
                <div class="secondary-line">${escapeHtml(getDeviceTypeLabel(device.type) || t("no_data"))}</div>
              </div>
              <span class="mono group-device-item__ip">${escapeHtml(device.ip)}</span>
              <div class="group-device-item__ping">${pingVisible ? pingBadge : ""}</div>
              <span class="status-badge status-badge--${status.variant}">${escapeHtml(status.label)}</span>
              <div class="group-device-item__actions">
                <button type="button" class="row-button" data-edit-device="${escapeHtml(device.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              </div>
            </li>
          `;
        }).join("")
        : `<li class="group-device-empty">${escapeHtml(t("group_devices_empty"))}</li>`;

      return `
        <tr>
          <td>
            <button type="button" class="link-button table-row-link" data-toggle-group-devices="${escapeHtml(group.id)}">
              ${escapeHtml(group.name)}
            </button>
          </td>
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : escapeHtml(t("no_data"))}</td>
          <td class="mono">${escapeHtml(formatGroupRange(group, true))}</td>
          <td>
            <span class="pill">${escapeHtml(t("in_database_short", { count: deviceCount }))}</span>
            ${pingVisible ? `<span class="pill">${escapeHtml(t("ping_only_short", { count: pingOnlyCount }))}</span>` : ""}
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </td>
          <td>${escapeHtml(group.note || t("no_data"))}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="row-button" data-edit-group="${escapeHtml(group.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button row-button--danger" data-delete-group="${escapeHtml(group.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
            </div>
          </td>
        </tr>
        ${isExpanded ? `
          <tr class="group-devices-row">
            <td colspan="6">
              <div class="group-devices-panel">
                <div class="group-devices-header">
                  <strong>${escapeHtml(t("group_devices_title", { name: group.name }))}</strong>
                  <span class="pill">${escapeHtml(t("records_count", { count: groupDevices.length }))}</span>
                </div>
                <ul class="group-devices-list">
                  ${groupDevicesMarkup}
                </ul>
              </div>
            </td>
          </tr>
        ` : ""}
      `;
    });

  elements.groupsTableBody.innerHTML = rows.join("");
  elements.groupsCounter.textContent = formatRecordsCount(state.groups.length);
}

function renderAccessGroupsTable() {
  const canManage = Boolean(state.auth?.capabilities?.canManageAccessGroups);
  const accessGroups = state.admin?.accessGroups || [];
  if (accessGroups.length === 0) {
    elements.accessGroupsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="3">${escapeHtml(t("empty_access_groups"))}</td>
      </tr>
    `;
    return;
  }

  elements.accessGroupsTableBody.innerHTML = accessGroups
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .map((group) => `
      <tr>
        <td><strong>${escapeHtml(group.name)}</strong></td>
        <td>${escapeHtml(group.description || t("no_data"))}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="row-button" data-edit-access-group="${escapeHtml(group.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
            <button type="button" class="row-button row-button--danger" data-delete-access-group="${escapeHtml(group.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function renderUsersTable() {
  const canManage = Boolean(state.auth?.capabilities?.canManageUsers);
  const currentUserId = String(state.auth?.user?.id || "");
  const users = state.admin?.users || [];
  if (users.length === 0) {
    elements.usersTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">${escapeHtml(t("empty_users"))}</td>
      </tr>
    `;
    return;
  }

  elements.usersTableBody.innerHTML = users
    .slice()
    .sort((left, right) => left.username.localeCompare(right.username, "ru"))
    .map((user) => {
      const accessGroupNames = (state.admin?.accessGroups || [])
        .filter((group) => user.accessGroupIds.includes(group.id))
        .map((group) => group.name);
      const statusBadges = [
        `<span class="status-badge status-badge--${user.isActive ? "ok" : "warn"}">${escapeHtml(user.isActive ? t("user_status_active") : t("user_status_disabled"))}</span>`,
      ];
      if (user.mustChangePassword) {
        statusBadges.push(`<span class="status-badge status-badge--warn">${escapeHtml(t("must_change_password_short"))}</span>`);
      }
      if (user.isSystemAdmin) {
        statusBadges.push(`<span class="status-badge status-badge--info">${escapeHtml(t("user_status_system_admin"))}</span>`);
      }
      const canToggleActive = canManage && !user.isSystemAdmin && user.id !== currentUserId;
      const canDeleteUser = canManage && !user.isSystemAdmin && user.id !== currentUserId;
      return `
        <tr>
          <td><strong>${escapeHtml(user.username)}</strong></td>
          <td>${escapeHtml(user.displayName)}</td>
          <td>${escapeHtml(t(`role_${user.role}`))}</td>
          <td>${escapeHtml(accessGroupNames.join(", ") || t("access_group_public_short"))}</td>
          <td>
            <div class="table-status-stack">
              ${statusBadges.join("")}
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="row-button" data-edit-user="${escapeHtml(user.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button" data-reset-user-password="${escapeHtml(user.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("reset_password_button"))}</button>
              <button
                type="button"
                class="row-button ${user.isActive ? "row-button--danger" : ""}"
                data-toggle-user-active="${escapeHtml(user.id)}"
                ${canToggleActive ? "" : "disabled"}
              >${escapeHtml(user.isActive ? t("disable_user_button") : t("enable_user_button"))}</button>
              <button
                type="button"
                class="row-button row-button--danger"
                data-delete-user="${escapeHtml(user.id)}"
                ${canDeleteUser ? "" : "disabled"}
              >${escapeHtml(t("delete_row"))}</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderUserAccessGroupOptions(selectedIds = []) {
  const accessGroups = state.admin?.accessGroups || [];
  if (accessGroups.length === 0) {
    elements.userAccessGroupOptions.innerHTML = `<div class="secondary-line">${escapeHtml(t("empty_access_groups"))}</div>`;
    return;
  }

  elements.userAccessGroupOptions.innerHTML = accessGroups
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .map((group) => `
      <label class="checkbox-card">
        <input type="checkbox" value="${escapeHtml(group.id)}" ${selectedIds.includes(group.id) ? "checked" : ""}>
        <span>${escapeHtml(group.name)}</span>
      </label>
    `)
    .join("");
}

function renderDevicesTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
  const searchTerm = normalizeSearch(elements.searchInput.value);
  const quickFilter = elements.deviceFilterSelect?.value || "all";
  const groupFilter = elements.deviceGroupFilterSelect?.value || "";
  const hasActiveFilter = Boolean(searchTerm || quickFilter !== "all" || groupFilter);
  const filteredDevices = state.devices.filter((device) => matchesSearch(device, searchTerm, quickFilter, groupFilter));

  if (filteredDevices.length === 0) {
    const message = searchTerm
      ? t("no_results")
      : t("empty_devices");
    elements.devicesTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">${escapeHtml(message)}</td>
      </tr>
    `;
    elements.devicesCounter.textContent = hasActiveFilter
      ? formatFilteredCount(0, state.devices.length)
      : formatRecordsCount(0);
    return;
  }

  const sortedDevices = filteredDevices
    .slice()
    .sort((left, right) => ipToInt(left.ip) - ipToInt(right.ip));
  const visibleDevices = hasActiveFilter || showAllDevicesInRegistry
    ? sortedDevices
    : sortedDevices.slice(0, 5);

  const rows = visibleDevices
    .map((device) => {
      const subnet = resolveDeviceSubnet(device);
      const group = resolveDeviceGroup(device, subnet);
      const pingVisible = isSubnetPingVisible(subnet);
      const pingBadge = renderPingBadge(device.ip, subnet);
      const status = evaluateDeviceStatus(device, subnet);
      const groupCell = group
        ? `<button type="button" class="link-button table-row-link" data-jump-group="${escapeHtml(group.id)}">${escapeHtml(group.name)}</button><br><span class="mono">${escapeHtml(formatGroupRange(group, true))}</span>`
        : escapeHtml(t("no_data"));
      return `
        <tr>
          <td>
            <strong>${escapeHtml(device.name)}</strong>
            <div class="secondary-line">${escapeHtml(device.note || "")}</div>
          </td>
          <td class="mono">${escapeHtml(device.ip)}</td>
          <td class="mono">${escapeHtml(device.mac || t("no_data"))}</td>
          <td>${escapeHtml(getDeviceTypeLabel(device.type) || t("no_data"))}</td>
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : escapeHtml(t("no_data"))}</td>
          <td>${groupCell}</td>
          <td>${pingVisible ? pingBadge : ""}</td>
          <td><span class="status-badge status-badge--${status.variant}">${escapeHtml(status.label)}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="row-button" data-copy-ip="${escapeHtml(device.ip)}">${escapeHtml(t("copy_ip_button"))}</button>
              <button type="button" class="row-button" data-edit-device="${escapeHtml(device.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button row-button--danger" data-delete-device="${escapeHtml(device.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
            </div>
          </td>
        </tr>
      `;
    });

  if (!hasActiveFilter && filteredDevices.length > 5) {
    rows.push(`
      <tr class="table-expand-row">
        <td colspan="9">
          <button type="button" class="link-button table-expand-button" data-toggle-devices-list>
            ${escapeHtml(showAllDevicesInRegistry
              ? t("show_less_devices")
              : t("show_all_devices", { count: filteredDevices.length }))}
          </button>
        </td>
      </tr>
    `);
  }

  elements.devicesTableBody.innerHTML = rows.join("");
  elements.devicesCounter.textContent = hasActiveFilter
    ? formatFilteredCount(filteredDevices.length, state.devices.length)
    : formatRecordsCount(filteredDevices.length);
}

function renderHistoryTable() {
  const searchTerm = normalizeSearch(elements.historySearchInput?.value || "");
  const eventType = elements.historyEventFilter?.value || "all";
  const scopeFilter = elements.historyScopeFilter?.value || "all";
  const filteredHistory = state.history.filter((entry) => {
    const matchesEvent = eventType === "all" || entry.action === eventType;
    if (!matchesEvent) {
      return false;
    }
    if (!searchTerm) {
      return true;
    }

    const haystackSource = (() => {
      if (scopeFilter === "device") {
        return entry.deviceName;
      }
      if (scopeFilter === "ip") {
        return `${entry.ip} ${entry.previousIp}`;
      }
      if (scopeFilter === "actor") {
        return entry.actor;
      }
      if (scopeFilter === "note") {
        return entry.note;
      }
      return [
        entry.deviceName,
        entry.actor,
        entry.ip,
        entry.previousIp,
        entry.note,
        getActionLabel(entry.action),
      ].join(" ");
    })();
    const haystack = normalizeSearch(haystackSource);

    return haystack.includes(searchTerm);
  });

  if (filteredHistory.length === 0) {
    const message = searchTerm || eventType !== "all"
      ? t("no_results")
      : t("empty_history");
    elements.historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">${escapeHtml(message)}</td>
      </tr>
    `;
    elements.historyCounter.textContent = searchTerm || eventType !== "all"
      ? formatFilteredCount(0, state.history.length)
      : formatEventsCount(0);
    return;
  }

  const rows = filteredHistory.map((entry) => {
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
  elements.historyCounter.textContent = searchTerm || eventType !== "all" || scopeFilter !== "all"
    ? formatFilteredCount(filteredHistory.length, state.history.length)
    : formatEventsCount(filteredHistory.length);
}

function renderStats() {
  const assignedIps = getAssignedIpsSet();
  const freeInPools = state.subnets.reduce((total, subnet) => {
    return total + countFreeInSubnet(subnet);
  }, 0);

  elements.statSubnets.textContent = String(state.subnets.length);
  elements.statDevices.textContent = String(state.devices.length);
  elements.statOccupied.textContent = String(assignedIps.size);
  elements.statAvailable.textContent = String(freeInPools);
}

function renderDashboardPanels() {
  renderDashboardAttention();
  renderDashboardHistory();
}

function renderDashboardAttentionDetails(lines, emptyLabel) {
  if (!lines.length) {
    return `<div class="mini-item__details-empty">${escapeHtml(emptyLabel)}</div>`;
  }

  return `
    <ul class="mini-item__details-list">
      ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
    </ul>
  `;
}

function getDevicesMissingType() {
  return state.devices.filter((device) => !device.type);
}

function openMissingTypeModal() {
  if (!elements.missingTypeModal) {
    return;
  }

  const missingDevices = getDevicesMissingType()
    .slice()
    .sort((left, right) => ipToInt(left.ip) - ipToInt(right.ip));

  elements.missingTypeTargetSelect.innerHTML = buildDeviceTypeOptionMarkup({ includeUnset: true });
  elements.missingTypeTargetSelect.value = "";
  elements.missingTypeStatus.className = "result-card result-card--muted form-grid__full";
  elements.missingTypeStatus.textContent = t("missing_type_modal_idle");

  if (!missingDevices.length) {
    elements.missingTypeDeviceList.innerHTML = `<div class="result-card result-card--muted">${escapeHtml(t("missing_type_empty"))}</div>`;
  } else {
    elements.missingTypeDeviceList.innerHTML = missingDevices.map((device) => `
      <label class="checkbox-card automation-subnet-card">
        <input type="checkbox" data-missing-type-device-id="${escapeHtml(device.id)}" checked>
        <span>
          <strong>${escapeHtml(device.name)}</strong>
          <span class="automation-subnet-meta">${escapeHtml(device.ip)}${device.unknownType ? ` · ${escapeHtml(t("missing_type_raw_value", { value: device.unknownType }))}` : ""}</span>
        </span>
      </label>
    `).join("");
  }

  openModal("missing-type-modal");
}

function handleDashboardAttentionClick(event) {
  const button = event.target.closest("[data-open-missing-type-modal]");
  if (!button) {
    return;
  }

  openMissingTypeModal();
}

async function handleMissingTypeSubmit(event) {
  event.preventDefault();
  const targetType = elements.missingTypeTargetSelect.value;
  const selectedIds = [...elements.missingTypeDeviceList.querySelectorAll("[data-missing-type-device-id]:checked")]
    .map((input) => input.dataset.missingTypeDeviceId)
    .filter(Boolean);

  if (!targetType) {
    elements.missingTypeStatus.className = "result-card result-card--danger form-grid__full";
    elements.missingTypeStatus.textContent = t("missing_type_select_required");
    return;
  }

  if (!selectedIds.length) {
    elements.missingTypeStatus.className = "result-card result-card--danger form-grid__full";
    elements.missingTypeStatus.textContent = t("missing_type_devices_required");
    return;
  }

  try {
    elements.missingTypeStatus.className = "result-card result-card--muted form-grid__full";
    elements.missingTypeStatus.textContent = t("missing_type_bulk_applying", { count: selectedIds.length });

    for (const deviceId of selectedIds) {
      const device = state.devices.find((entry) => entry.id === deviceId);
      if (!device) {
        continue;
      }

      await apiRequest(`/devices/${encodeURIComponent(deviceId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          id: device.id,
          name: device.name,
          ip: device.ip,
          mac: device.mac || "",
          type: targetType,
          subnetId: device.subnetId || "",
          note: device.note || "",
          createdAt: device.createdAt,
        }),
      });
    }

    await refreshState(true);
    closeModal("missing-type-modal");
    showToast(t("missing_type_bulk_done", { count: selectedIds.length, type: getDeviceTypeLabel(targetType) }));
  } catch (error) {
    elements.missingTypeStatus.className = "result-card result-card--danger form-grid__full";
    elements.missingTypeStatus.textContent = error.message || t("server_data_load_failed");
  }
}

function renderDashboardAttention() {
  const conflictMap = new Map();
  state.devices.forEach((device) => {
    const bucket = conflictMap.get(device.ip) || [];
    bucket.push(device.name);
    conflictMap.set(device.ip, bucket);
  });
  const conflictEntries = [...conflictMap.entries()].filter(([, names]) => names.length > 1);

  const placementIssues = state.devices.flatMap((device) => {
    const subnet = resolveDeviceSubnet(device);
    if (!subnet) {
      return [`${device.name} · ${device.ip} · ${t("status_no_subnet")}`];
    }
    if (!isIpInsidePool(ipToInt(device.ip), subnet)) {
      return [`${device.name} · ${device.ip} · ${t("status_outside_pool")}`];
    }
    return [];
  });

  const fullGroups = state.groups
    .filter((group) => countFreeInGroup(group) === 0)
    .map((group) => `${group.name} · ${formatGroupRange(group, true)}`);

  const lowCapacityGroups = state.groups
    .map((group) => ({ group, freeCount: countFreeInGroup(group) }))
    .filter(({ freeCount }) => freeCount > 0 && freeCount <= 2)
    .map(({ group, freeCount }) => `${group.name} · ${formatGroupRange(group, true)} · ${t("free_short", { count: freeCount })}`);

  const automationExcluded = state.subnets
    .filter((subnet) => !subnet.scanEnabled)
    .map((subnet) => `${subnet.name} · ${subnet.cidr}`);

  const missingTypeDevices = getDevicesMissingType()
    .map((device) => `${device.name} · ${device.ip}${device.unknownType ? ` · ${t("missing_type_raw_value", { value: device.unknownType })}` : ""}`);

  const items = [
    {
      value: conflictEntries.length,
      title: t("dashboard_attention_conflicts_title"),
      note: t("dashboard_attention_conflicts_note"),
      tone: conflictEntries.length > 0 ? "danger" : "ok",
      details: conflictEntries.map(([ip, names]) => `${ip} · ${names.join(", ")}`),
    },
    {
      value: placementIssues.length,
      title: t("dashboard_attention_placement_title"),
      note: t("dashboard_attention_placement_note"),
      tone: placementIssues.length > 0 ? "warn" : "ok",
      details: placementIssues,
    },
    {
      value: fullGroups.length,
      title: t("dashboard_attention_capacity_title"),
      note: t("dashboard_attention_capacity_note"),
      tone: fullGroups.length > 0 ? "warn" : "ok",
      details: fullGroups,
    },
    {
      value: lowCapacityGroups.length,
      title: t("dashboard_attention_low_capacity_title"),
      note: t("dashboard_attention_low_capacity_note"),
      tone: lowCapacityGroups.length > 0 ? "warn" : "ok",
      details: lowCapacityGroups,
    },
    {
      value: missingTypeDevices.length,
      title: t("dashboard_attention_missing_type_title"),
      note: t("dashboard_attention_missing_type_note"),
      tone: missingTypeDevices.length > 0 ? "warn" : "ok",
      details: missingTypeDevices,
      action: missingTypeDevices.length > 0 && state.auth?.capabilities?.canWrite
        ? `<button type="button" class="action-button action-button--ghost" data-open-missing-type-modal>${escapeHtml(t("missing_type_bulk_button"))}</button>`
        : "",
    },
    {
      value: automationExcluded.length,
      title: t("dashboard_attention_automation_title"),
      note: t("dashboard_attention_automation_note"),
      tone: automationExcluded.length > 0 ? "info" : "ok",
      details: automationExcluded,
    },
  ];

  elements.dashboardAttentionList.innerHTML = items
    .map((item) => `
      <li>
        <details class="mini-item mini-item--attention mini-item--${escapeHtml(item.tone)}" ${item.value > 0 ? "" : ""}>
          <summary class="mini-item__summary">
            <div class="mini-title">${escapeHtml(item.title)}</div>
            <div class="mini-value">${escapeHtml(String(item.value))}</div>
            <div class="mini-meta">${escapeHtml(item.note)}</div>
          </summary>
          <div class="mini-item__details">
            ${renderDashboardAttentionDetails(item.details, t("dashboard_attention_details_empty"))}
            ${item.action || ""}
          </div>
        </details>
      </li>
    `)
    .join("");
}

function renderDashboardHistory() {
  if (state.history.length === 0) {
    elements.dashboardHistoryList.innerHTML = `<li class="mini-list__empty">${escapeHtml(t("empty_history"))}</li>`;
    return;
  }

  const items = state.history
    .slice(0, 3)
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

function renderPingBadge(ip, subnet = null) {
  const resolvedSubnet = subnet || findSubnetForIp(ipToInt(normalizeIpSafe(ip)));
  if (!isSubnetPingVisible(resolvedSubnet)) {
    return "";
  }

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
  const preferences = normalizeUserPreferences(rawState?.preferences || {});
  const rawSubnets = Array.isArray(rawState?.subnets) ? rawState.subnets : [];
  const subnets = rawSubnets.map((entry) => normalizeSubnet(entry));
  const rawGroups = Array.isArray(rawState?.groups) ? rawState.groups : [];
  const groups = normalizeGroupsList(rawGroups, subnets, baseGroups);
  const rawDevices = Array.isArray(rawState?.devices) ? rawState.devices : [];
  const devices = rawDevices.map((entry) => normalizeDevice(entry, subnets, groups, preferences.customDeviceTypes));
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
  const accessGroups = Array.isArray(rawState?.accessGroups)
    ? rawState.accessGroups.map(normalizeAccessGroup)
    : [];
  const auth = normalizeAuthState(rawState?.auth);
  const admin = normalizeAdminState(rawState?.admin);

  return { subnets, groups, devices, scanResults, history, meta, settings, accessGroups, auth, admin, preferences };
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
    defaultSubnetScanEnabled: normalizeBoolean(rawSettings?.defaultSubnetScanEnabled, true),
    scanTimeoutMs,
    scanConcurrency,
    limits: {
      scanIntervalMin,
      scanIntervalMax,
    },
  };
}

function normalizeAccessGroup(entry) {
  return {
    id: String(entry?.id || "").trim(),
    name: String(entry?.name || "").trim(),
    description: String(entry?.description || "").trim(),
    createdAt: entry?.createdAt || new Date().toISOString(),
    updatedAt: entry?.updatedAt || new Date().toISOString(),
  };
}

function normalizeAuthState(rawAuth = {}) {
  return {
    authenticated: Boolean(rawAuth?.authenticated),
    user: rawAuth?.user || null,
    accessGroups: Array.isArray(rawAuth?.accessGroups)
      ? rawAuth.accessGroups.map(normalizeAccessGroup)
      : [],
    capabilities: {
      isAdmin: Boolean(rawAuth?.capabilities?.isAdmin),
      canWrite: Boolean(rawAuth?.capabilities?.canWrite),
      canManageUsers: Boolean(rawAuth?.capabilities?.canManageUsers),
      canManageServerSettings: Boolean(rawAuth?.capabilities?.canManageServerSettings),
      canManageAccessGroups: Boolean(rawAuth?.capabilities?.canManageAccessGroups),
    },
  };
}

function normalizeAdminState(rawAdmin = null) {
  if (!rawAdmin) {
    return null;
  }

  return {
    accessGroups: Array.isArray(rawAdmin?.accessGroups)
      ? rawAdmin.accessGroups.map(normalizeAccessGroup)
      : [],
    users: Array.isArray(rawAdmin?.users)
      ? rawAdmin.users.map((entry) => ({
        id: String(entry?.id || "").trim(),
        username: String(entry?.username || "").trim(),
        displayName: String(entry?.displayName || "").trim(),
        role: String(entry?.role || "").trim(),
        mustChangePassword: Boolean(entry?.mustChangePassword),
        isActive: Boolean(entry?.isActive),
        isSystemAdmin: Boolean(entry?.isSystemAdmin),
        accessGroupIds: Array.isArray(entry?.accessGroupIds) ? entry.accessGroupIds.map((id) => String(id)) : [],
      }))
      : [],
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
  targetState.accessGroups = snapshot.accessGroups || [];
  targetState.auth = snapshot.auth || targetState.auth;
  targetState.admin = snapshot.admin || null;
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
    accessGroups: (snapshot.accessGroups || []).map((entry) => ({ ...entry })),
    auth: snapshot.auth ? JSON.parse(JSON.stringify(snapshot.auth)) : null,
    admin: snapshot.admin ? JSON.parse(JSON.stringify(snapshot.admin)) : null,
  };
}

function normalizeSubnet(rawSubnet) {
  const name = String(rawSubnet?.name || "").trim();
  const cidr = String(rawSubnet?.cidr || "").trim();
  const note = String(rawSubnet?.note || "").trim();
  const accessGroupId = String(rawSubnet?.accessGroupId || "").trim();
  const accessGroupName = String(rawSubnet?.accessGroupName || "").trim();
  const scanEnabled = normalizeBoolean(rawSubnet?.scanEnabled, true);

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

  if (!isRangeInsideParsedSubnet(rangeStartInt, rangeEndInt, parsed)) {
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
    scanEnabled,
    accessGroupId,
    accessGroupName,
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

function normalizeDevice(rawDevice, subnets, groups = state.groups, customDeviceTypes = preferences.customDeviceTypes) {
  const name = String(rawDevice?.name || "").trim();
  const ip = normalizeIp(String(rawDevice?.ip || "").trim());
  const rawMac = String(rawDevice?.mac || "").trim();
  const mac = rawMac ? normalizeMac(rawMac) : "";
  const normalizedRawType = normalizeDeviceTypeValue(rawDevice?.type);
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

  const allowedDeviceTypes = new Set([
    ...BUILTIN_DEVICE_TYPES.map((item) => item.id),
    ...normalizeCustomDeviceTypes(customDeviceTypes).map((item) => item.id),
  ]);

  const type = allowedDeviceTypes.has(normalizedRawType) ? normalizedRawType : "";
  const unknownType = type ? "" : normalizedRawType;

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
    unknownType,
    subnetId,
    note,
    createdAt: rawDevice?.createdAt || new Date().toISOString(),
  };
}

function serializeDevice(device) {
  return {
    ...device,
    type: device.type || device.unknownType || "",
  };
}

function serializeSnapshotPayload(sourceState = state) {
  return {
    exportedAt: new Date().toISOString(),
    version: "0.2",
    subnets: sourceState.subnets,
    groups: sourceState.groups,
    devices: sourceState.devices.map(serializeDevice),
    scanResults: sourceState.scanResults,
    history: sourceState.history,
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

function isSubnetPingVisible(subnet) {
  return Boolean(subnet?.scanEnabled);
}

function getVisiblePingState(ip, subnet = null) {
  const resolvedSubnet = subnet || findSubnetForIp(ipToInt(normalizeIpSafe(ip)));
  if (!isSubnetPingVisible(resolvedSubnet)) {
    return null;
  }

  return getPingState(ip);
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

function countPingOnlyInGroup(group, reachableSet = getReachableScanIps()) {
  const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
  if (!isSubnetPingVisible(subnet)) {
    return 0;
  }
  const assignedSet = new Set(getDevicesInGroup(group).map((device) => device.ip));
  let count = 0;
  for (let ipInt = group.rangeStartInt; ipInt <= group.rangeEndInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (reachableSet.has(ip) && !assignedSet.has(ip)) {
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

function getAssignedIpsSet() {
  return new Set(state.devices.map((device) => device.ip));
}

function getBusyIpsSet() {
  return new Set([
    ...getAssignedIpsSet(),
    ...getReachableScanIps(),
  ]);
}

function countAssignedInGroup(group) {
  return getDevicesInGroup(group).length;
}

function countFreeInGroup(group) {
  const totalCount = group.rangeEndInt - group.rangeStartInt + 1;
  return Math.max(totalCount - countAssignedInGroup(group), 0);
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

function countAssignedInSubnet(subnet) {
  return getDevicesInSubnet(subnet).length;
}

function countFreeInSubnet(subnet) {
  return Math.max(subnet.poolSize - countAssignedInSubnet(subnet), 0);
}

function countPingOnlyInSubnet(subnet, reachableSet = getReachableScanIps()) {
  if (!isSubnetPingVisible(subnet)) {
    return 0;
  }
  const assignedSet = new Set(
    state.devices
      .filter((device) => isIpInsidePool(ipToInt(device.ip), subnet))
      .map((device) => device.ip)
  );
  let count = 0;
  for (let ipInt = subnet.rangeStartInt; ipInt <= subnet.rangeEndInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (reachableSet.has(ip) && !assignedSet.has(ip)) {
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

function isRangeInsideParsedSubnet(rangeStartInt, rangeEndInt, parsedSubnet) {
  return (
    rangeStartInt >= parsedSubnet.networkInt &&
    rangeStartInt <= parsedSubnet.broadcastInt &&
    rangeEndInt >= parsedSubnet.networkInt &&
    rangeEndInt <= parsedSubnet.broadcastInt
  );
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

function buildDeviceTypeOptionMarkup({ includeUnset = true } = {}) {
  const options = [];
  if (includeUnset) {
    options.push(`<option value="">${escapeHtml(t("device_type_unset_option"))}</option>`);
  }

  getAvailableDeviceTypes().forEach((type) => {
    options.push(`<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`);
  });

  return options.join("");
}

function renderDeviceTypeOptions(preferredType = elements.deviceTypeSelect?.value || "") {
  if (!elements.deviceTypeSelect) {
    return;
  }

  elements.deviceTypeSelect.innerHTML = buildDeviceTypeOptionMarkup();

  const resolvedType = isKnownDeviceType(preferredType) ? preferredType : "";
  elements.deviceTypeSelect.value = resolvedType;
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

function matchesSearch(device, searchTerm, quickFilter = "all", groupFilter = "") {
  const subnet = resolveDeviceSubnet(device);
  const group = resolveDeviceGroup(device, subnet);
  const pingState = getVisiblePingState(device.ip, subnet);
  const sameIpCount = state.devices.filter((entry) => entry.ip === device.ip).length;

  if (quickFilter === "conflicts" && sameIpCount <= 1) {
    return false;
  }
  if (quickFilter === "no-subnet" && subnet) {
    return false;
  }
  if (quickFilter === "outside-pool" && (!subnet || isIpInsidePool(ipToInt(device.ip), subnet))) {
    return false;
  }
  if (groupFilter && group?.id !== groupFilter) {
    return false;
  }

  if (!searchTerm) {
    return true;
  }

  const haystack = [
    device.name,
    device.ip,
    device.mac,
    device.type,
    device.unknownType || "",
    getDeviceTypeLabel(device.type),
    device.note,
    subnet?.name || "",
    subnet?.cidr || "",
    group?.name || "",
    group ? formatGroupRange(group, true) : "",
    pingState ? (pingState.isReachable ? "online reachable ping" : "offline no-ping") : "",
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

function formatHeroDateTime(value) {
  if (!value) {
    return t("no_data");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(DATE_LOCALES[getLanguage()] || DATE_LOCALES.ru, {
    hour: "2-digit",
    minute: "2-digit",
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

function findExistingSubnetForCsv(row, subnets) {
  return subnets.find((subnet) => {
    if (row.id && subnet.id === row.id) {
      return true;
    }
    if (row.cidr && subnet.cidr === row.cidr) {
      return true;
    }
    return Boolean(row.name && row.cidr && subnet.name === row.name && subnet.cidr === row.cidr);
  });
}

function findExistingGroupForCsv(row, subnetId, groups) {
  const rowRangeStart = row.range_start || row.rangeStart;
  const rowRangeEnd = row.range_end || row.rangeEnd;
  return groups.find((group) => {
    if (row.id && group.id === row.id) {
      return true;
    }
    if (group.subnetId !== subnetId) {
      return false;
    }
    if (rowRangeStart && rowRangeEnd && group.rangeStart === rowRangeStart && group.rangeEnd === rowRangeEnd) {
      return true;
    }
    return Boolean(row.name && group.name === row.name && group.rangeStart === rowRangeStart && group.rangeEnd === rowRangeEnd);
  });
}

function findExistingDeviceForCsv(row, devices) {
  return devices.find((device) => {
    if (row.id && device.id === row.id) {
      return true;
    }
    return Boolean(row.ip && device.ip === normalizeIpSafe(row.ip));
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

  return aliases[normalized] || normalized.replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (response.status === 401 && options.allowUnauthorized) {
    return payload;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || t("error_request_failed", { status: response.status }));
    error.status = response.status;
    throw error;
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
