const API_BASE = "/api";
const GROUP_SUGGESTION_TEMPLATES_PATH = "/group-suggestion-templates.json";
const THEME_ALIASES = {
  ocean: "aurora",
};
const SUPPORTED_THEMES = ["atlas", "ember", "aurora", "fuchsia", "mono", "solaris", "forest", "neon", "arctic", "lotus", "ruby", "tide"];
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
  ipCheckForm: document.getElementById("ip-check-form"),
  ipCheckResult: document.getElementById("ip-check-result"),
  currentUserBadge: document.getElementById("current-user-badge"),
  currentRoleBadge: document.getElementById("current-role-badge"),
  currentUserDisplay: document.getElementById("current-user-display"),
  currentUserNote: document.getElementById("current-user-note"),
  logoutButton: document.getElementById("logout-button"),
  openAddButton: document.querySelector('[data-open-modal="add-modal"]'),
  openSettingsButton: document.getElementById("open-settings-button"),
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsButton: document.querySelector('[data-close-modal="settings-modal"]'),
  settingsNavButtons: [...document.querySelectorAll("[data-settings-tab]")],
  settingsSections: [...document.querySelectorAll("[data-settings-section]")],
  openPasswordModalButton: document.getElementById("open-password-modal-button"),
  passwordModal: document.getElementById("password-modal"),
  passwordModalClose: document.getElementById("password-modal-close"),
  passwordStatus: document.getElementById("password-status"),
  scanNowButton: document.getElementById("scan-now-button"),
  scanStatusBadge: document.getElementById("scan-status-badge"),
  scanStatusText: document.getElementById("scan-status-text"),
  liveSummaryText: document.getElementById("live-summary-text"),
  viewTabs: [...document.querySelectorAll("[data-view-tab]")],
  pageViews: [...document.querySelectorAll("[data-view]")],
  modalBackdrops: [...document.querySelectorAll(".modal-backdrop")],
  openModalButtons: [...document.querySelectorAll("[data-open-modal]")],
  closeModalButtons: [...document.querySelectorAll("[data-close-modal]")],
  dashboardAttentionList: document.getElementById("dashboard-summary-list"),
  dashboardHistoryList: document.getElementById("dashboard-history-list"),
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
  serverSettingsStatus: document.getElementById("server-settings-status"),
  saveServerSettingsButton: document.getElementById("save-server-settings-button"),
  templateRulesList: document.getElementById("template-rules-list"),
  addTemplateRuleButton: document.getElementById("add-template-rule-button"),
  templateEditor: document.getElementById("template-editor"),
  applyTemplateJsonButton: document.getElementById("apply-template-json-button"),
  templateSettingsStatus: document.getElementById("template-settings-status"),
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
let activeSettingsSection = "profile";
let showAllDevicesInRegistry = false;
const expandedGroupIds = new Set();
let preferencesSaveTimer = null;
let isAuthReady = false;

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
  syncPasswordToggleButtons();
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
  return {
    settings: normalizeSettings(rawPreferences),
    customGroupTemplates: Array.isArray(rawPreferences?.customGroupTemplates)
      ? rawPreferences.customGroupTemplates
      : [],
  };
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

async function initialize() {
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
  elements.searchInput.addEventListener("input", renderDevicesTable);
  elements.ipCheckForm.addEventListener("submit", handleIpCheck);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.openPasswordModalButton.addEventListener("click", () => openPasswordModal(false));
  elements.passwordToggleButtons.forEach((button) => {
    button.addEventListener("click", handlePasswordToggle);
  });
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
  elements.settingsNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSettingsSection(button.dataset.settingsTab);
    });
  });
  elements.saveServerSettingsButton.addEventListener("click", handleServerSettingsSave);
  elements.addTemplateRuleButton.addEventListener("click", handleAddTemplateRule);
  elements.templateRulesList.addEventListener("click", handleTemplateRuleListClick);
  elements.templateRulesList.addEventListener("input", syncTemplateJsonFromCards);
  elements.templateRulesList.addEventListener("change", syncTemplateJsonFromCards);
  elements.applyTemplateJsonButton.addEventListener("click", handleTemplateJsonApply);
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
  elements.subnetsTableBody.addEventListener("change", handleSubnetScanToggle);
  elements.groupsTableBody.addEventListener("click", handleGroupTableActions);
  elements.devicesTableBody.addEventListener("click", handleDeviceTableActions);
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
  closeAuthScreen();
  const stateLoaded = await refreshState();
  if (!stateLoaded || !state.auth?.authenticated) {
    return;
  }
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
  const currentUser = state.auth?.user;
  elements.currentUserBadge.textContent = currentUser?.displayName || "ATLAS";
  elements.currentRoleBadge.textContent = currentUser?.role ? t(`role_summary_${currentUser.role}`) : t("role_summary_guest");
  elements.currentUserDisplay.value = currentUser
    ? `${currentUser.displayName} (${currentUser.username})`
    : "";
  elements.currentUserNote.textContent = currentUser?.mustChangePassword
    ? t("must_change_password_note")
    : t("current_role_note", { role: currentUser?.role || "guest" });
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
    const shouldOpen = !hasLabel || index === 0;

    return `
      <details class="template-rule-card" data-template-id="${escapeHtml(template.id || "")}" ${shouldOpen ? "open" : ""}>
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
            ${Object.keys(DEVICE_TYPES).map((type) => `
              <label class="checkbox-card">
                <input type="checkbox" data-template-field="deviceType" value="${escapeHtml(type)}" ${selectedTypes.has(type) ? "checked" : ""}>
                <span>${escapeHtml(getDeviceTypeLabel(type))}</span>
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
      .filter((item) => DEVICE_TYPES[item]);

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

function renderTemplateEditor() {
  const effectiveTemplates = normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
  if (effectiveTemplates.length > 0) {
    groupSuggestionTemplates = effectiveTemplates;
    groupSuggestionTemplateSource = "user";
  }

  renderTemplateRuleCards(groupSuggestionTemplates);
  if (document.activeElement !== elements.templateEditor) {
    elements.templateEditor.value = JSON.stringify(groupSuggestionTemplates, null, 2);
  }

  const sourceLabel =
    groupSuggestionTemplateSource === "user"
      ? t("templates_source_user")
      : groupSuggestionTemplateSource === "bundled"
        ? t("templates_source_bundled")
        : t("templates_source_default");
  setTemplateSettingsStatus(sourceLabel, "muted");
}

function handleAddTemplateRule() {
  const currentTemplates = (() => {
    try {
      return collectTemplateRulesFromCards();
    } catch {
      return normalizeGroupSuggestionTemplates(groupSuggestionTemplates);
    }
  })();

  renderTemplateRuleCards([...currentTemplates, createBlankTemplateRule()]);
  syncTemplateJsonFromCards();
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

function setAccessGroupStatus(message, tone = "muted") {
  elements.accessGroupStatus.className = `result-card result-card--${tone}`;
  elements.accessGroupStatus.textContent = message;
}

function setUserStatus(message, tone = "muted") {
  elements.userStatus.className = `result-card result-card--${tone}`;
  elements.userStatus.textContent = message;
}

function handleSettingsChange() {
  preferences.settings = normalizeSettings({
    language: elements.settingsLanguageSelect.value,
    customSignature: elements.settingsSignatureInput.value,
    accentTheme: elements.settingsThemeSelect.value,
    autoRescanAfterDeviceSave: elements.settingsAutoRescan.checked,
    suggestionMode: elements.settingsSuggestionMode.value,
  });
  applyVisualSettings();
  applyLocalizedUi();
  renderDeviceGroupOptions();
  renderAll();
  if (!elements.settingsModal.hidden) {
    renderTemplateEditor();
  }
  updateSuggestedIp();
  savePreferences({
    ...preferences.settings,
  }).catch((error) => {
    console.error(error);
    showToast(error.message || t("preferences_save_failed"), true);
  });
}

function handleSignatureInput() {
  preferences.settings = normalizeSettings({
    ...preferences.settings,
    customSignature: elements.settingsSignatureInput.value,
  });
  applyLocalizedUi();
  schedulePreferencesSave({
    customSignature: preferences.settings.customSignature,
  });
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

async function handleTemplateSettingsSave() {
  try {
    const normalizedTemplates = collectTemplateRulesFromCards();
    preferences.customGroupTemplates = normalizedTemplates;
    groupSuggestionTemplates = normalizedTemplates;
    groupSuggestionTemplateSource = "user";
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
    if (normalizedTemplates.length === 0) {
      throw new Error(t("templates_invalid"));
    }

    preferences.customGroupTemplates = normalizedTemplates;
    groupSuggestionTemplates = normalizedTemplates;
    groupSuggestionTemplateSource = "user";
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
  await loadGroupSuggestionTemplates();
  await savePreferences({ customGroupTemplates: [] });
  renderDeviceGroupOptions();
  updateSuggestedIp();
  renderTemplateEditor();
  setTemplateSettingsStatus(t("templates_reset_done"), "warn");
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
  if (modal.id === "password-modal" && state.auth?.user?.mustChangePassword && elements.passwordModalClose.hidden) {
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
  renderAdminPanels();
  setActiveSettingsSection(activeSettingsSection);
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
  const normalizedCustomTemplates = normalizeGroupSuggestionTemplates(preferences.customGroupTemplates);
  if (normalizedCustomTemplates.length > 0) {
    groupSuggestionTemplates = normalizedCustomTemplates;
    groupSuggestionTemplateSource = "user";
  } else if (groupSuggestionTemplateSource === "user") {
    groupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
    groupSuggestionTemplateSource = "default";
  }
  applyVisualSettings();
  applyLocalizedUi();
}

function openAuthScreen(session = null) {
  applyAuthSession(session);
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
  };
  const savedPreferences = await apiRequest("/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  applyPreferences(normalizeUserPreferences(savedPreferences));
  renderTemplateEditor();
  syncSettingsForm();
}

function schedulePreferencesSave(partial = null) {
  window.clearTimeout(preferencesSaveTimer);
  preferencesSaveTimer = window.setTimeout(() => {
    savePreferences(partial).catch((error) => {
      console.error(error);
      showToast(error.message || t("preferences_save_failed"), true);
    });
  }, 260);
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
  elements.scanNowButton.disabled = !canWrite || isManualScanRunning;
  elements.importButton.disabled = !isAdmin;
  elements.saveServerSettingsButton.disabled = !Boolean(capabilities.canManageServerSettings);
  elements.settingsDefaultSubnetScan.disabled = !Boolean(capabilities.canManageServerSettings);
  elements.settingsScanInterval.disabled = !Boolean(capabilities.canManageServerSettings);
  elements.clearDataButton.disabled = !isAdmin;
  elements.saveTemplateSettingsButton.disabled = !state.auth?.authenticated;
  elements.resetTemplateSettingsButton.disabled = !state.auth?.authenticated;

  elements.adminPanels.forEach((panel) => {
    panel.hidden = !isAdmin;
  });

  setActiveSettingsSection(activeSettingsSection);
}

function renderAdminPanels() {
  renderAccessGroupsTable();
  renderUsersTable();
  renderUserAccessGroupOptions();
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
    const subnet = normalizeSubnet({
      id: createId(),
      name: formData.get("name"),
      cidr: formData.get("cidr"),
      rangeStart: formData.get("rangeStart"),
      rangeEnd: formData.get("rangeEnd"),
      accessGroupId: formData.get("accessGroupId"),
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
      const assignedCount = refreshedGroup
        ? countAssignedInGroup(refreshedGroup)
        : 0;
      const pingOnlyCount = refreshedGroup
        ? countPingOnlyInGroup(refreshedGroup, reachableSet)
        : scanSummary.reachableIps;
      const freeCount = refreshedGroup
        ? countFreeInGroup(refreshedGroup)
        : "—";
      showToast(t("group_added_scanned", {
        name: group.name,
        scanned: scanSummary.scannedIps,
        assigned: assignedCount,
        pingOnly: pingOnlyCount,
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

async function handleAccessGroupSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    await apiRequest("/admin/access-groups", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
      }),
    });
    event.currentTarget.reset();
    await refreshState(true);
    setAccessGroupStatus(t("access_group_saved"), "ok");
  } catch (error) {
    setAccessGroupStatus(error.message, "danger");
  }
}

async function handleUserSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const accessGroupIds = [...elements.userAccessGroupOptions.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => input.value);

  try {
    await apiRequest("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        displayName: formData.get("displayName"),
        role: formData.get("role"),
        password: formData.get("password"),
        accessGroupIds,
        mustChangePassword: true,
      }),
    });
    event.currentTarget.reset();
    syncPasswordToggleButtons(event.currentTarget);
    renderUserAccessGroupOptions();
    await refreshState(true);
    setUserStatus(t("user_saved"), "ok");
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
  const userLabel = state.auth?.user?.displayName || state.auth?.user?.username || "ATLAS";

  if (state.meta?.scanInProgress || isManualScanRunning) {
    setScanStatus(t("scan_status_running"), "info");
    elements.scanStatusText.textContent = t("scan_scope_all");
  } else if (lastScanAt) {
    setScanStatus(t("scan_status_online", { count: reachableCount }), reachableCount > 0 ? "ok" : "warn");
    elements.scanStatusText.textContent = t("scan_last_run_compact", {
      date: formatHeroDateTime(lastScanAt),
      seconds: state.meta.scanIntervalSeconds || 90,
    });
  } else {
    setScanStatus(t("scan_status_idle"), "warn");
    elements.scanStatusText.textContent = t("scan_not_started");
  }

  elements.liveSummaryText.textContent = t("live_summary", { user: userLabel });
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
    await refreshState(true);
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
  renderAccessGroupsTable();
  renderUsersTable();
  renderUserAccessGroupOptions();
  renderStats();
  renderDashboardPanels();
  updateAutomationWidgets();
  updateSuggestedIp();
  renderPermissionAwareUi();
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
            <span class="pill">${escapeHtml(t("ping_only_short", { count: pingOnlyCount }))}</span>
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
            <button type="button" class="row-button row-button--danger" data-delete-subnet="${escapeHtml(subnet.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
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
          const pingBadge = renderPingBadge(device.ip);
          return `
            <li class="group-device-item">
              <div>
                <strong>${escapeHtml(device.name)}</strong>
                <div class="secondary-line">${escapeHtml(getDeviceTypeLabel(device.type))}</div>
              </div>
              <span class="mono">${escapeHtml(device.ip)}</span>
              <div>${pingBadge}</div>
              <span class="status-badge status-badge--${status.variant}">${escapeHtml(status.label)}</span>
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
            <span class="pill">${escapeHtml(t("ping_only_short", { count: pingOnlyCount }))}</span>
            <span class="pill">${escapeHtml(t("free_short", { count: freeCount }))}</span>
          </td>
          <td>${escapeHtml(group.note || t("no_data"))}</td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-group="${escapeHtml(group.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
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
  const accessGroups = state.admin?.accessGroups || [];
  if (accessGroups.length === 0) {
    elements.accessGroupsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="2">${escapeHtml(t("empty_access_groups"))}</td>
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
      </tr>
    `)
    .join("");
}

function renderUsersTable() {
  const users = state.admin?.users || [];
  if (users.length === 0) {
    elements.usersTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">${escapeHtml(t("empty_users"))}</td>
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
      return `
        <tr>
          <td><strong>${escapeHtml(user.username)}</strong></td>
          <td>${escapeHtml(user.displayName)}</td>
          <td>${escapeHtml(t(`role_${user.role}`))}</td>
          <td>${escapeHtml(accessGroupNames.join(", ") || t("access_group_public_short"))}</td>
          <td>
            <span class="status-badge status-badge--${user.mustChangePassword ? "warn" : "ok"}">
              ${escapeHtml(user.mustChangePassword ? t("must_change_password_short") : t("status_ok"))}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderUserAccessGroupOptions() {
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
        <input type="checkbox" value="${escapeHtml(group.id)}">
        <span>${escapeHtml(group.name)}</span>
      </label>
    `)
    .join("");
}

function renderDevicesTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
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

  const sortedDevices = filteredDevices
    .slice()
    .sort((left, right) => ipToInt(left.ip) - ipToInt(right.ip));
  const visibleDevices = searchTerm || showAllDevicesInRegistry
    ? sortedDevices
    : sortedDevices.slice(0, 5);

  const rows = visibleDevices
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
            <button type="button" class="row-button row-button--danger" data-delete-device="${escapeHtml(device.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
          </td>
        </tr>
      `;
    });

  if (!searchTerm && filteredDevices.length > 5) {
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

function renderDashboardAttention() {
  const reachableIps = getReachableScanIps();
  const ipConflicts = state.devices.filter((device, index, source) => {
    return source.findIndex((entry) => entry.ip === device.ip) !== index;
  }).length;
  const outsidePool = state.devices.filter((device) => {
    const subnet = resolveDeviceSubnet(device);
    return subnet ? !isIpInsidePool(ipToInt(device.ip), subnet) : false;
  }).length;
  const withoutSubnet = state.devices.filter((device) => !resolveDeviceSubnet(device)).length;
  const untrackedReachable = [...reachableIps].filter((ip) => !state.devices.some((device) => device.ip === ip)).length;
  const fullGroups = state.groups.filter((group) => {
    const totalCount = group.rangeEndInt - group.rangeStartInt + 1;
    return totalCount > 0 && countAssignedInGroup(group) >= totalCount;
  }).length;
  const lowCapacityGroups = state.groups.filter((group) => {
    const freeCount = countFreeInGroup(group);
    return freeCount > 0 && freeCount <= 2;
  }).length;
  const automationExcluded = state.subnets.filter((subnet) => !subnet.scanEnabled).length;

  const items = [
    {
      value: ipConflicts,
      title: t("dashboard_attention_conflicts_title"),
      note: t("dashboard_attention_conflicts_note"),
      tone: ipConflicts > 0 ? "danger" : "ok",
    },
    {
      value: untrackedReachable,
      title: t("dashboard_attention_untracked_title"),
      note: t("dashboard_attention_untracked_note"),
      tone: untrackedReachable > 0 ? "warn" : "ok",
    },
    {
      value: outsidePool + withoutSubnet,
      title: t("dashboard_attention_placement_title"),
      note: t("dashboard_attention_placement_note"),
      tone: outsidePool + withoutSubnet > 0 ? "warn" : "ok",
    },
    {
      value: fullGroups,
      title: t("dashboard_attention_capacity_title"),
      note: t("dashboard_attention_capacity_note"),
      tone: fullGroups > 0 ? "warn" : "ok",
    },
    {
      value: lowCapacityGroups,
      title: t("dashboard_attention_low_capacity_title"),
      note: t("dashboard_attention_low_capacity_note"),
      tone: lowCapacityGroups > 0 ? "warn" : "ok",
    },
    {
      value: automationExcluded,
      title: t("dashboard_attention_automation_title"),
      note: t("dashboard_attention_automation_note"),
      tone: automationExcluded > 0 ? "info" : "ok",
    },
  ];

  elements.dashboardAttentionList.innerHTML = items
    .map((item) => `
      <li class="mini-item mini-item--attention mini-item--${escapeHtml(item.tone)}">
        <div class="mini-title">${escapeHtml(item.title)}</div>
        <div class="mini-value">${escapeHtml(String(item.value))}</div>
        <div class="mini-meta">${escapeHtml(item.note)}</div>
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
  const accessGroups = Array.isArray(rawState?.accessGroups)
    ? rawState.accessGroups.map(normalizeAccessGroup)
    : [];
  const auth = normalizeAuthState(rawState?.auth);
  const admin = normalizeAdminState(rawState?.admin);
  const preferences = normalizeUserPreferences(rawState?.preferences || {});

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

function countPingOnlyInGroup(group, reachableSet = getReachableScanIps()) {
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
