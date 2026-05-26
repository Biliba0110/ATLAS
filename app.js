const API_BASE = "/api";
const GROUP_SUGGESTION_TEMPLATES_PATH = "/group-suggestion-templates.json";
const INTERFACE_SETTINGS_CACHE_KEY = "atlas-interface-settings-cache";
const THEME_ALIASES = {};
const SUPPORTED_THEMES = ["atlas", "aurora", "neon", "forest", "tide"];
const BUILTIN_DEVICE_TYPES = [
  { id: "server", labelKey: "device_type_server" },
  { id: "core-router", labelKey: "device_type_core_router" },
  { id: "switch", labelKey: "device_type_switch" },
  { id: "container", labelKey: "device_type_container" },
  { id: "service", labelKey: "device_type_service" },
  { id: "iot", labelKey: "device_type_iot" },
];
const BUILTIN_DEVICE_TYPE_IDS = new Set(BUILTIN_DEVICE_TYPES.map((item) => item.id));
const BUILTIN_DEVICE_SOURCES = [
  { id: "docker", labelKey: "device_source_docker", badge: "D" },
  { id: "proxmox", labelKey: "device_source_proxmox", badge: "PVE" },
  { id: "iot", labelKey: "device_source_iot", badge: "IoT" },
  { id: "api", labelKey: "device_source_api", badge: "API" },
];
const BUILTIN_DEVICE_SOURCE_IDS = new Set([
  ...BUILTIN_DEVICE_SOURCES.map((item) => item.id),
  "import",
]);

const DEFAULT_SETTINGS = {
  accentTheme: "atlas",
  autoRescanAfterDeviceSave: true,
  modalBlurEnabled: true,
  suggestionMode: "compact",
  language: "en",
  customSignature: "",
};
const DEFAULT_DISCOVERY_DATA_POLICY = {
  storeRuntime: true,
  storeLabels: false,
  storeNetworkDetails: false,
  storeInternalIps: false,
  storeRawMetadata: false,
  showMetadataInPreview: false,
};
const DEFAULT_DISCOVERY_REPLACEMENT_POLICY = {
  autoReplaceDockerContainers: true,
};
const NAVIGATION_HASH_OPTIONS = {
  views: new Set(["dashboard", "map", "registry", "history"]),
  registry: new Set(["subnets", "groups", "devices", "services"]),
  settings: new Set(["profile", "interface", "templates", "administration"]),
  integrations: new Set(["automation", "discovery", "snmp", "push"]),
  admin: new Set(["access", "import", "export", "maintenance"]),
  template: new Set(["device-types", "group-suggestions", "device-sources"]),
  discovery: new Set(["agents", "received", "audit", "debug"]),
  modals: new Set(["settings", "integrations"]),
};
const DISCOVERY_DEFAULT_SEND_INTERVAL_MS = 60 * 1000;
const DISCOVERY_UP_GRACE_MS = 20 * 1000;
const DISCOVERY_DOWN_GRACE_MS = 75 * 1000;
const RESULT_STATUS_AUTO_HIDE_MS = 5000;
const DISCOVERY_AGENT_CONFIG_HIDE_MS = 10000;
const UP_INTEGRATION_STATUSES = new Set(["running", "online", "active", "up", "ok", "healthy"]);
const DOWN_INTEGRATION_STATUSES = new Set(["offline", "down", "dead", "stopped", "stale", "source-missing", "source_missing", "error", "unreachable"]);
const DISCOVERY_COLLECTOR_PRESETS = {
  host: ["host", "docker"],
  local: ["host", "docker"],
  hypervisor: ["host", "proxmox"],
  external: ["host"],
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
    deviceTypes: ["iot", "server", "core-router", "switch"],
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
  history_cleared: "action_history_cleared",
};

const FIELD_HELP_CONFIG = {
  "subnet-form": [
    { selector: '[name="name"]', key: "help_subnet_name" },
    { selector: '[name="cidr"]', key: "help_subnet_cidr" },
    { selector: '[name="rangeStart"]', key: "help_subnet_range_start" },
    { selector: '[name="rangeEnd"]', key: "help_subnet_range_end" },
    { selector: '[name="accessGroupId"]', key: "help_subnet_access_group" },
    { selector: '[name="scanEnabled"]', key: "help_subnet_scan_enabled" },
    { selector: '[name="note"]', key: "help_subnet_note" },
  ],
  "device-form": [
    { selector: '[name="name"]', key: "help_device_name" },
    { selector: '[name="ip"]', key: "help_device_ip" },
    { selector: '[name="mac"]', key: "help_device_mac" },
    { selector: '[name="type"]', key: "help_device_type" },
    { selector: '[name="subnetId"]', key: "help_device_subnet" },
    { selector: '[name="groupId"]', key: "help_device_group" },
    { selector: '[name="note"]', key: "help_device_note" },
  ],
  "service-form": [
    { selector: '[name="name"]', key: "help_service_name" },
    { selector: '[name="hostDeviceId"]', key: "help_service_host" },
    { selector: '[name="protocol"]', key: "help_service_protocol" },
    { selector: '[name="accessPort"]', key: "help_service_access_port" },
    { selector: '[name="ports"]', key: "help_service_ports" },
    { selector: '[name="serviceUrl"]', key: "help_service_public_url" },
    { selector: '[name="integrationStatus"]', key: "help_service_status" },
    { selector: '[name="source"]', key: "help_service_source" },
    { selector: '[name="note"]', key: "help_service_note" },
  ],
  "group-form": [
    { selector: '[name="subnetId"]', key: "help_group_subnet" },
    { selector: '[name="name"]', key: "help_group_name" },
    { selector: '[name="note"]', key: "help_group_note" },
    { selector: '[name="rangeStart"]', key: "help_group_range_start" },
    { selector: '[name="rangeEnd"]', key: "help_group_range_end" },
  ],
  "access-group-form": [
    { selector: '[name="name"]', key: "help_access_group_name" },
    { selector: '[name="description"]', key: "help_access_group_description" },
  ],
  "user-form": [
    { selector: '[name="username"]', key: "help_user_username" },
    { selector: '[name="displayName"]', key: "help_user_display_name" },
    { selector: '[name="role"]', key: "help_user_role" },
    { selector: '[name="password"]', key: "help_user_password" },
    { selector: "#user-access-group-options", key: "help_user_access_groups" },
  ],
  "discovery-agent-form": [
    { selector: '[name="name"]', key: "help_discovery_agent_name" },
    { selector: '[name="kind"]', key: "help_discovery_agent_kind" },
    { selector: "#discovery-agent-collector-options", key: "help_discovery_agent_collectors" },
    { selector: '[name="createMode"]', key: "help_discovery_agent_create_mode" },
    { selector: '[name="linkedHostDeviceId"]', key: "help_discovery_agent_linked_host" },
    { selector: '[name="allowedCidrs"]', key: "help_discovery_agent_allowed_cidrs" },
    { selector: '[name="sharedTokenAgentId"]', key: "help_discovery_agent_shared_token" },
    { selector: '[name="enabled"]', key: "help_discovery_agent_enabled" },
  ],
  "missing-type-form": [
    { selector: "#missing-type-target-select", key: "help_missing_type_target" },
  ],
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
  topology: {
    schema: "atlas.topology.v1",
    nodes: [],
    links: [],
    interfaces: [],
    summary: {},
    capabilities: { advancedMode: false, layers: {} },
  },
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
  customDeviceSources: [],
};

const integrationsSectionsHost = document.getElementById("integrations-sections");
if (integrationsSectionsHost) {
  document.querySelectorAll("[data-integrations-section]").forEach((section) => {
    integrationsSectionsHost.appendChild(section);
  });
}

const adminSectionsHost = document.getElementById("admin-sections");
if (adminSectionsHost) {
  document.querySelectorAll("[data-admin-panel]").forEach((section) => {
    adminSectionsHost.appendChild(section);
  });
}

const elements = {
  authScreen: document.getElementById("auth-screen"),
  authStatus: document.getElementById("auth-status"),
  loginForm: document.getElementById("login-form"),
  bootstrapHint: document.getElementById("bootstrap-hint"),
  heroSignature: document.getElementById("hero-signature"),
  subnetForm: document.getElementById("subnet-form"),
  deviceForm: document.getElementById("device-form"),
  serviceForm: document.getElementById("service-form"),
  groupForm: document.getElementById("group-form"),
  accessGroupForm: document.getElementById("access-group-form"),
  userForm: document.getElementById("user-form"),
  passwordForm: document.getElementById("password-form"),
  subnetSelect: document.getElementById("device-subnet-select"),
  subnetAccessGroupSelect: document.getElementById("subnet-access-group-select"),
  deviceGroupSelect: document.getElementById("device-group-select"),
  serviceHostSelect: document.getElementById("service-host-select"),
  serviceProtocolSelect: document.querySelector('#service-form select[name="protocol"]'),
  serviceStatusSelect: document.querySelector('#service-form select[name="integrationStatus"]'),
  serviceSourceSelect: document.querySelector('#service-form select[name="source"]'),
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
  integrationsShortcutButtons: [...document.querySelectorAll("[data-integrations-shortcut]")],
  integrationsModal: document.getElementById("integrations-modal"),
  integrationsNavButtons: [...document.querySelectorAll("[data-integrations-tab]")],
  integrationsSections: [...document.querySelectorAll("[data-integrations-section]")],
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsButton: document.querySelector('[data-close-modal="settings-modal"]'),
  settingsNavButtons: [...document.querySelectorAll("[data-settings-tab]")],
  settingsSections: [...document.querySelectorAll("[data-settings-section]")],
  adminTabButtons: [...document.querySelectorAll("[data-admin-tab]")],
  adminContentPanels: [...document.querySelectorAll("[data-admin-panel]")],
  templateTabButtons: [...document.querySelectorAll("[data-template-tab]")],
  templatePanels: [...document.querySelectorAll("[data-template-panel]")],
  discoveryTabButtons: [...document.querySelectorAll("[data-discovery-tab]")],
  discoveryPanels: [...document.querySelectorAll("[data-discovery-panel]")],
  openPasswordModalButton: document.getElementById("open-password-modal-button"),
  passwordModal: document.getElementById("password-modal"),
  passwordModalClose: document.getElementById("password-modal-close"),
  passwordStatus: document.getElementById("password-status"),
  confirmModal: document.getElementById("confirm-modal"),
  confirmModalEyebrow: document.getElementById("confirm-modal-eyebrow"),
  confirmModalTitle: document.getElementById("confirm-modal-title"),
  confirmModalMessage: document.getElementById("confirm-modal-message"),
  confirmModalInputWrap: document.getElementById("confirm-modal-input-wrap"),
  confirmModalInputLabel: document.getElementById("confirm-modal-input-label"),
  confirmModalInput: document.getElementById("confirm-modal-input"),
  confirmModalActions: document.getElementById("confirm-modal-actions"),
  viewTabs: [...document.querySelectorAll("[data-view-tab]")],
  pageViews: [...document.querySelectorAll("[data-view]")],
  registrySectionTabs: [...document.querySelectorAll("[data-registry-section-tab]")],
  registrySections: [...document.querySelectorAll("[data-registry-section]")],
  filterToggleButtons: [...document.querySelectorAll("[data-filter-toggle]")],
  statCards: [...document.querySelectorAll("[data-stat-target]")],
  dashboardHealthList: document.getElementById("dashboard-health-list"),
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
  settingsModalBlur: document.getElementById("settings-modal-blur"),
  settingsSuggestionMode: document.getElementById("settings-suggestion-mode"),
  settingsDefaultSubnetScan: document.getElementById("settings-default-subnet-scan"),
  settingsScanInterval: document.getElementById("settings-scan-interval"),
  settingsPingMeta: document.getElementById("settings-ping-meta"),
  settingsSubnetScanList: document.getElementById("settings-subnet-scan-list"),
  automationSubnetsListToggleButton: document.getElementById("automation-subnets-list-toggle-button"),
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
  bundledDeviceSourcesList: document.getElementById("bundled-device-sources-list"),
  customDeviceSourcesList: document.getElementById("custom-device-sources-list"),
  addCustomDeviceTypeButton: document.getElementById("add-custom-device-type-button"),
  addCustomDeviceSourceButton: document.getElementById("add-custom-device-source-button"),
  addTemplateRuleButton: document.getElementById("add-template-rule-button"),
  templateEditor: document.getElementById("template-editor"),
  applyTemplateJsonButton: document.getElementById("apply-template-json-button"),
  deviceTypeSettingsStatus: document.getElementById("device-type-settings-status"),
  deviceSourceSettingsStatus: document.getElementById("device-source-settings-status"),
  templateSettingsStatus: document.getElementById("template-settings-status"),
  saveDeviceTypeSettingsButton: document.getElementById("save-device-type-settings-button"),
  resetDeviceTypeSettingsButton: document.getElementById("reset-device-type-settings-button"),
  saveDeviceSourceSettingsButton: document.getElementById("save-device-source-settings-button"),
  resetDeviceSourceSettingsButton: document.getElementById("reset-device-source-settings-button"),
  saveTemplateSettingsButton: document.getElementById("save-template-settings-button"),
  resetTemplateSettingsButton: document.getElementById("reset-template-settings-button"),
  accessGroupStatus: document.getElementById("access-group-status"),
  userStatus: document.getElementById("user-status"),
  accessGroupsTableBody: document.getElementById("access-groups-table-body"),
  usersTableBody: document.getElementById("users-table-body"),
  accessGroupsTableWrap: document.getElementById("access-groups-table-wrap"),
  usersTableWrap: document.getElementById("users-table-wrap"),
  accessGroupsListToggleButton: document.getElementById("access-groups-list-toggle-button"),
  usersListToggleButton: document.getElementById("users-list-toggle-button"),
  discoveryAgentForm: document.getElementById("discovery-agent-form"),
  discoveryAgentHostSelect: document.getElementById("discovery-agent-host-select"),
  discoveryAgentSharedTokenSelect: document.getElementById("discovery-agent-shared-token-select"),
  discoveryAgentSharedTokenLabel: document.getElementById("discovery-agent-shared-token-label"),
  discoveryAgentsTableBody: document.getElementById("discovery-agents-table-body"),
  discoveryAgentsTableWrap: document.getElementById("discovery-agents-table-wrap"),
  discoveryAgentsListToggleButton: document.getElementById("discovery-agents-list-toggle-button"),
  discoveryAgentStatus: document.getElementById("discovery-agent-status"),
  resetDiscoveryAgentFormButton: document.getElementById("reset-discovery-agent-form-button"),
  discoveryAgentTokenCard: document.getElementById("discovery-agent-token-card"),
  discoveryAgentConfigSnippet: document.getElementById("discovery-agent-config-snippet"),
  copyDiscoveryAgentConfigButton: document.getElementById("copy-discovery-agent-config-button"),
  discoveryAgentPolicyForm: document.getElementById("discovery-agent-policy-form"),
  discoveryAgentPolicyTitle: document.getElementById("discovery-agent-policy-title"),
  discoveryAgentPolicyUseDefault: document.getElementById("discovery-agent-policy-use-default"),
  discoveryAgentPolicyStoreRuntime: document.getElementById("discovery-agent-policy-store-runtime"),
  discoveryAgentPolicyStoreLabels: document.getElementById("discovery-agent-policy-store-labels"),
  discoveryAgentPolicyStoreNetwork: document.getElementById("discovery-agent-policy-store-network"),
  discoveryAgentPolicyStoreRaw: document.getElementById("discovery-agent-policy-store-raw"),
  discoveryAgentPolicyShowPreview: document.getElementById("discovery-agent-policy-show-preview"),
  saveDiscoveryAgentPolicyButton: document.getElementById("save-discovery-agent-policy-button"),
  cancelDiscoveryAgentPolicyButton: document.getElementById("cancel-discovery-agent-policy-button"),
  discoveryPolicyStoreRuntime: document.getElementById("discovery-policy-store-runtime"),
  discoveryPolicyStoreLabels: document.getElementById("discovery-policy-store-labels"),
  discoveryPolicyStoreNetwork: document.getElementById("discovery-policy-store-network"),
  discoveryPolicyStoreRaw: document.getElementById("discovery-policy-store-raw"),
  discoveryPolicyShowPreview: document.getElementById("discovery-policy-show-preview"),
  discoveryPolicyAutoReplaceDocker: document.getElementById("discovery-policy-auto-replace-docker"),
  saveDiscoveryPolicyButton: document.getElementById("save-discovery-policy-button"),
  discoveryPolicyStatus: document.getElementById("discovery-policy-status"),
  discoverySummaryGrid: document.getElementById("discovery-summary-grid"),
  discoveryResultsTableBody: document.getElementById("discovery-results-table-body"),
  discoveryResultsCounter: document.getElementById("discovery-results-counter"),
  discoveryStaleCleanupButton: document.getElementById("discovery-stale-cleanup-button"),
  discoveryAuditEventFilter: document.getElementById("discovery-audit-event-filter"),
  discoveryAuditTableBody: document.getElementById("discovery-audit-table-body"),
  discoveryDebugAgentFilter: document.getElementById("discovery-debug-agent-filter"),
  discoveryDebugKindFilter: document.getElementById("discovery-debug-kind-filter"),
  discoveryDebugTableBody: document.getElementById("discovery-debug-table-body"),
  topologyModeSelect: document.getElementById("topology-mode-select"),
  topologySubnetFilter: document.getElementById("topology-subnet-filter"),
  topologyLayerFilter: document.getElementById("topology-layer-filter"),
  topologySourceFilter: document.getElementById("topology-source-filter"),
  topologyStatusFilter: document.getElementById("topology-status-filter"),
  topologySummaryCounter: document.getElementById("topology-summary-counter"),
  topologySummaryGrid: document.getElementById("topology-summary-grid"),
  topologyMapCanvas: document.getElementById("topology-map-canvas"),
  userAccessGroupOptions: document.getElementById("user-access-group-options"),
  adminPanels: [...document.querySelectorAll(".admin-only")],
  passwordToggleButtons: [...document.querySelectorAll("[data-password-toggle]")],
  subnetsTableWrap: document.getElementById("subnets-table-wrap"),
  groupsTableWrap: document.getElementById("groups-table-wrap"),
  devicesTableWrap: document.getElementById("devices-table-wrap"),
  servicesTableWrap: document.getElementById("services-table-wrap"),
  subnetsListToggleButton: document.getElementById("subnets-list-toggle-button"),
  groupsListToggleButton: document.getElementById("groups-list-toggle-button"),
  devicesListToggleButton: document.getElementById("devices-list-toggle-button"),
  servicesListToggleButton: document.getElementById("services-list-toggle-button"),
  servicesTableBody: document.getElementById("services-table-body"),
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
  servicesCounter: document.getElementById("services-counter"),
  historyCounter: document.getElementById("history-counter"),
  statSubnets: document.getElementById("stat-subnets"),
  statDevices: document.getElementById("stat-devices"),
  statServices: document.getElementById("stat-services"),
  statOccupied: document.getElementById("stat-occupied"),
  statAvailable: document.getElementById("stat-available"),
  exportJsonButton: document.getElementById("export-json-button"),
  exportBackupButton: document.getElementById("export-backup-button"),
  backupIncludeInventory: document.getElementById("backup-include-inventory"),
  backupIncludeActivity: document.getElementById("backup-include-activity"),
  backupIncludeSystem: document.getElementById("backup-include-system"),
  backupIncludeAccess: document.getElementById("backup-include-access"),
  backupIncludePreferences: document.getElementById("backup-include-preferences"),
  backupIncludeDiscovery: document.getElementById("backup-include-discovery"),
  exportSubnetsCsvButton: document.getElementById("export-subnets-csv-button"),
  exportGroupsCsvButton: document.getElementById("export-groups-csv-button"),
  exportDevicesCsvButton: document.getElementById("export-devices-csv-button"),
  importButton: document.getElementById("import-button"),
  importFileInput: document.getElementById("import-file-input"),
  clearDataButton: document.getElementById("clear-data-button"),
  clearHistoryButton: document.getElementById("clear-history-button"),
  toast: document.getElementById("toast"),
  subnetModalTitle: document.getElementById("subnet-modal-title"),
  subnetSubmitButton: document.getElementById("subnet-submit-button"),
  deviceModalTitle: document.getElementById("device-modal-title"),
  deviceSubmitButton: document.getElementById("device-submit-button"),
  serviceModalTitle: document.getElementById("service-modal-title"),
  serviceSubmitButton: document.getElementById("service-submit-button"),
  serviceFormStatus: document.getElementById("service-form-status"),
  groupModalTitle: document.getElementById("group-modal-title"),
  groupSubmitButton: document.getElementById("group-submit-button"),
};

let activeToastTimer = null;
let pollIntervalId = null;
let eventSource = null;
let refreshInFlight = null;
let queuedRefreshOptions = null;
let refreshDebounceTimer = null;
let pendingRefreshOptions = null;
let hiddenRefreshPending = false;
let visibilityResumeTimer = null;
let visibilityResumeGraceUntil = 0;
let resumePaintFrame = 0;
let isManualScanRunning = false;
let isDeviceSubmitting = false;
let deviceGroupSelectionMode = "auto";
let bundledGroupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
let groupSuggestionTemplates = DEFAULT_GROUP_SUGGESTION_TEMPLATES;
let activeView = "dashboard";
let activeRegistrySection = "subnets";
let activeSettingsSection = "profile";
let activeIntegrationsSection = "automation";
let activeAdminSection = "access";
let activeTemplateSection = "device-types";
let activeDiscoverySection = "agents";
let discoveryDebugAgentFilter = "all";
let discoveryDebugKindFilter = "all";
let topologyMode = "simple";
let topologySubnetFilter = "all";
let topologyLayerFilter = "all";
let topologySourceFilter = "all";
let topologyStatusFilter = "all";
const TOPOLOGY_ZOOM_MIN = 0.22;
const TOPOLOGY_ZOOM_DEFAULT = 0.25;
const TOPOLOGY_ZOOM_MAX = 1.4;
let topologyZoom = TOPOLOGY_ZOOM_DEFAULT;
let topologyZoomUserAdjusted = false;
let topologyPanX = 0;
let topologyPanY = 0;
let topologyPanUserAdjusted = false;
let topologyPanState = null;
let topologyRenderFrame = 0;
let topologyLastRenderRequestSignature = "";
let topologyLoaded = false;
let topologyLoadedRevision = 0;
let topologyLoadInFlight = null;
let topologyLastDataSignature = "";
let topologyPopoverNodeById = new Map();
let topologyPopoverInterfacesByNode = new Map();
let showAllSubnetsInRegistry = false;
let showAllGroupsInRegistry = false;
let showAllDevicesInRegistry = false;
let showAllServicesInRegistry = false;
let showAllAccessGroups = false;
let showAllUsers = false;
let showAllAutomationSubnets = false;
let showAllDiscoveryAgents = false;
const expandedGroupIds = new Set();
const expandedDiscoveryResultIds = new Set();
const expandedDiscoveryGroupIds = new Set();
const expandedDiscoveryHardwareIds = new Set();
const expandedRegistryDiscoveryKeys = new Set();
const expandedDiscoveryDebugIds = new Set();
const discoveryDebugFieldOptions = new Map();
const openDiscoveryDebugFieldLists = new Set();
const collapsedFilterPanels = {
  registry: false,
  history: false,
};
const REGISTRY_VISIBLE_ROWS = {
  default: 8,
  filtersCollapsed: 12,
  expanded: 15,
};
const COMPACT_LIST_VISIBLE_ROWS = {
  default: 7,
  expanded: 15,
};
let isAuthReady = false;
let interfaceSettingsBaseline = null;
let modalScrollY = 0;
let activeDialogResolver = null;
let dialogOpenedOverModal = false;
let activeFieldHelpButton = null;
let isFieldHelpPinned = false;
let suppressDashboardStatClick = false;
let isApplyingNavigationState = false;
let isNavigationBootstrapping = true;
const resultStatusTimers = new WeakMap();
let discoveryAgentConfigTimer = null;
let editingSubnetId = "";
let editingGroupId = "";
let editingDeviceId = "";
let editingServiceId = "";
let editingAccessGroupId = "";
let editingUserId = "";
let editingDiscoveryAgentId = "";
let editingDiscoveryAgentPolicyId = "";
let lastDiscoveryAgentConfig = "";

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

function getAvailableDeviceSources() {
  return [
    ...BUILTIN_DEVICE_SOURCES.map((item) => ({
      id: item.id,
      label: t(item.labelKey),
      badge: item.badge,
      builtIn: true,
    })),
    ...normalizeCustomDeviceSources(preferences.customDeviceSources).map((item) => ({
      ...item,
      builtIn: false,
    })),
  ];
}

function getDeviceSourceLabel(source) {
  const normalizedSource = normalizeMetadataToken(source, "");
  if (!normalizedSource) {
    return t("device_integration_status_empty");
  }
  const sourceRecord = getAvailableDeviceSources().find((item) => item.id === normalizedSource);
  if (sourceRecord) {
    return sourceRecord.label;
  }

  if (normalizedSource === "import") {
    return t("device_source_import");
  }

  return humanizeDeviceType(normalizedSource);
}

function getDeviceSourceLogoText(source) {
  const normalizedSource = normalizeMetadataToken(source, "");
  if (!normalizedSource) {
    return "";
  }
  const sourceRecord = getAvailableDeviceSources().find((item) => item.id === normalizedSource);
  if (sourceRecord?.badge) {
    return sourceRecord.badge;
  }
  if (normalizedSource === "import") {
    return "CSV";
  }
  return normalizedSource.slice(0, 3).toUpperCase();
}

function getDeviceSourceLogoClass(source) {
  const normalizedSource = normalizeMetadataToken(source, "");
  if (!normalizedSource) {
    return "";
  }
  if (BUILTIN_DEVICE_SOURCES.some((item) => item.id === normalizedSource) || normalizedSource === "import") {
    return `source-logo--${normalizedSource}`;
  }
  return `source-logo--custom source-logo--tone-${hashSourceTone(normalizedSource)}`;
}

function isGeneratedAgentNote(note) {
  const normalizedNote = normalizeMetadataToken(note, "");
  return normalizedNote === "discovery" || normalizedNote === "agent";
}

function getRawDiscoveryResults() {
  return state.admin?.discoveryResults || [];
}

function getDisplayDiscoveryResults() {
  return mergeDiscoveryHardwareResults(getRawDiscoveryResults());
}

function findDiscoveryResultForRecord(record, results) {
  if (!record) {
    return null;
  }
  return results.find((result) => (
    result.matchedDeviceId === record.id
    || result.matchedServiceId === record.id
    || (
      record.source
      && record.sourceId
      && result.source === record.source
      && result.sourceId === record.sourceId
    )
  )) || null;
}

function getDiscoveryResultForRecord(record, results = null) {
  const displayResults = results || getDisplayDiscoveryResults();
  const displayResult = findDiscoveryResultForRecord(record, displayResults);
  if (displayResult || results) {
    return displayResult;
  }

  const rawResult = findDiscoveryResultForRecord(record, getRawDiscoveryResults());
  return getDisplayHostResultForHypervisorResult(rawResult, displayResults) || rawResult;
}

function getLinkedDiscoveryAgentForHost(record) {
  if (!record?.id) {
    return null;
  }
  return (state.admin?.discoveryAgents || []).find((agent) => agent.linkedHostDeviceId === record.id) || null;
}

function getDirectHostDiscoveryResultForRecord(record, results = getRawDiscoveryResults()) {
  if (!record?.id || record.type === "service") {
    return null;
  }
  return results.find((result) => (
    result.matchedDeviceId === record.id
    && normalizeMetadataToken(result.sourceKind, "") === "host"
  )) || null;
}

function hasDirectHostAgent(record) {
  return Boolean(getLinkedDiscoveryAgentForHost(record) || getDirectHostDiscoveryResultForRecord(record));
}

function getHypervisorDiscoveryResultForRecord(record, results = getRawDiscoveryResults()) {
  if (!record?.id || record.type === "service") {
    return null;
  }
  return results.find((result) => (
    result.matchedDeviceId === record.id
    && normalizeMetadataToken(result.source, "") === "proxmox"
    && ["vm", "lxc", "hypervisor"].includes(normalizeMetadataToken(result.sourceKind, ""))
  )) || null;
}

function getDisplayHostResultForHypervisorResult(hypervisorResult, results = getDisplayDiscoveryResults()) {
  if (!isProxmoxHypervisorResult(hypervisorResult)) {
    return null;
  }
  const nodeName = getProxmoxNodeName(hypervisorResult);
  if (!nodeName) {
    return null;
  }
  return results.find((result) => (
    normalizeMetadataToken(result.sourceKind, "") === "host"
    && result.agentId === hypervisorResult.agentId
    && String(result.name || result.hostName || "").trim().toLowerCase() === nodeName
  )) || null;
}

function getRegistryDiscoveryKey(record) {
  if (!record?.id) {
    return "";
  }
  return `${record.type === "service" ? "service" : "device"}:${record.id}`;
}

function getRegistryDiscoveryDetailsResult(record, displayResults = getDisplayDiscoveryResults()) {
  if (!record?.id) {
    return null;
  }

  if (record.type === "service") {
    return findDiscoveryResultForRecord(record, displayResults)
      || findDiscoveryResultForRecord(record, getRawDiscoveryResults());
  }

  const displayResult = findDiscoveryResultForRecord(record, displayResults);
  if (displayResult) {
    return displayResult;
  }

  const rawResult = findDiscoveryResultForRecord(record, getRawDiscoveryResults());
  const displayHostResult = getDisplayHostResultForHypervisorResult(rawResult, displayResults);
  if (displayHostResult) {
    return displayHostResult;
  }

  const hostResult = getDirectHostDiscoveryResultForRecord(record) || rawResult;
  const hypervisorResult = getHypervisorDiscoveryResultForRecord(record);
  if (hostResult && hypervisorResult && hostResult.id !== hypervisorResult.id) {
    return {
      ...hostResult,
      hardwareRaw: hypervisorResult.visibleRaw || {},
    };
  }
  return hostResult || hypervisorResult;
}

function renderRegistryDiscoveryName(record, attributeName, discoveryResults = getDisplayDiscoveryResults()) {
  const name = escapeHtml(record.name || t("no_data"));
  const result = getRegistryDiscoveryDetailsResult(record, discoveryResults);
  if (!result) {
    return `<strong title="${name}">${name}</strong>`;
  }

  const key = getRegistryDiscoveryKey(record);
  return `
    <button
      type="button"
      class="link-button registry-discovery-toggle"
      ${attributeName}="${escapeHtml(record.id)}"
      aria-expanded="${expandedRegistryDiscoveryKeys.has(key) ? "true" : "false"}"
      title="${name}"
    >${name}</button>
  `;
}

function renderRegistryDiscoveryDetailsRow(record, colspan, discoveryResults = getDisplayDiscoveryResults()) {
  const key = getRegistryDiscoveryKey(record);
  if (!key || !expandedRegistryDiscoveryKeys.has(key)) {
    return "";
  }

  const result = getRegistryDiscoveryDetailsResult(record, discoveryResults);
  if (!result) {
    expandedRegistryDiscoveryKeys.delete(key);
    return "";
  }

  return `
    <tr class="registry-discovery-details-row discovery-details-row" data-expanded-registry-discovery="${escapeHtml(key)}">
      <td colspan="${colspan}">${renderDiscoveryDetails(result)}</td>
    </tr>
  `;
}

function isAgentManagedRecord(record) {
  return Boolean(
    getDiscoveryResultForRecord(record)
    || getLinkedDiscoveryAgentForHost(record)
  );
}

function hasLiveAgentStatus(record) {
  return Boolean(getDiscoveryResultForRecord(record) || getLinkedDiscoveryAgentForHost(record));
}

function getRecordLiveLastSeenAt(record) {
  const linkedResult = getDiscoveryResultForRecord(record);
  const linkedAgent = getLinkedDiscoveryAgentForHost(record);
  return record?.lastSeenAt || linkedResult?.lastSeenAt || linkedAgent?.lastSeenAt || "";
}

function isHypervisorDiscoveredHost(record) {
  if (!record || record.type === "service") {
    return false;
  }
  const source = normalizeMetadataToken(record.source, "");
  const sourceKind = normalizeMetadataToken(record.sourceKind, "");
  return (
    source === "proxmox" && ["vm", "lxc", "hypervisor"].includes(sourceKind)
  ) || Boolean(getHypervisorDiscoveryResultForRecord(record));
}

function getProxmoxNodeFromSourceId(sourceId) {
  const parts = String(sourceId || "").split(":").map((part) => part.trim()).filter(Boolean);
  if (parts[0] !== "proxmox") {
    return "";
  }
  if (parts[1] === "node") {
    return parts[2] || "";
  }
  return parts[1] || "";
}

function getHypervisorOriginName(record) {
  const result = getHypervisorDiscoveryResultForRecord(record);
  if (result) {
    return result.hostName || getProxmoxNodeFromSourceId(result.sourceId) || "";
  }
  const host = resolveDeviceHost(record);
  if (host && host.id !== record.id) {
    return host.name;
  }
  return getProxmoxNodeFromSourceId(record?.sourceId) || "";
}

function formatHypervisorOriginBadge(originName) {
  const compact = String(originName || "").trim().split(".")[0];
  return (compact || "PVE").slice(0, 12);
}

function shouldRenderAgentSourceBadge(record) {
  if (record?.type === "service") {
    return isAgentManagedRecord(record);
  }
  if (isHypervisorDiscoveredHost(record)) {
    return hasDirectHostAgent(record);
  }
  return isAgentManagedRecord(record);
}

function renderRegistrySourceBadges(record) {
  const badges = [];
  if (shouldRenderAgentSourceBadge(record)) {
    badges.push(`<span class="registry-source-badge registry-source-badge--info">${escapeHtml(t("registry_source_agent"))}</span>`);
  }

  if (isHypervisorDiscoveredHost(record)) {
    const originName = getHypervisorOriginName(record);
    const title = t("registry_source_hypervisor_tooltip", { name: originName || "Proxmox" });
    badges.push(`
      <span class="registry-source-badge registry-source-badge--hypervisor" title="${escapeHtml(title)}">
        ${escapeHtml(formatHypervisorOriginBadge(originName))}
      </span>
    `);
  }

  if (badges.length === 0) {
    badges.push(`
      <span class="registry-source-badge registry-source-badge--muted" title="${escapeHtml(t("registry_source_manual_tooltip"))}">
        ${escapeHtml(t("registry_source_manual"))}
      </span>
    `);
  }
  return `<div class="registry-source-badges">${badges.join("")}</div>`;
}

function hashSourceTone(value) {
  const source = String(value || "custom");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return (hash % 8) + 1;
}

function getDeviceSourceKindLabel(sourceKind) {
  const normalizedKind = normalizeMetadataToken(sourceKind, "");
  const key = `device_source_kind_${normalizedKind}`;
  return TRANSLATIONS[getLanguage()]?.[key] || humanizeDeviceType(normalizedKind);
}

function shouldShowDiscoverySourceKind(result) {
  const source = normalizeMetadataToken(result?.source, "");
  const sourceKind = normalizeMetadataToken(result?.sourceKind, "");
  return Boolean(sourceKind && sourceKind !== source);
}

function getIntegrationStatusLabel(status) {
  const normalizedStatus = normalizeMetadataToken(status, "");
  if (!normalizedStatus) {
    return "";
  }
  const key = `device_integration_status_${normalizedStatus.replaceAll("-", "_")}`;
  return TRANSLATIONS[getLanguage()]?.[key] || humanizeDeviceType(normalizedStatus);
}

function getIntegrationStatusVariant(status) {
  const normalizedStatus = normalizeMetadataToken(status, "");
  if (UP_INTEGRATION_STATUSES.has(normalizedStatus)) {
    return "ok";
  }
  if (normalizedStatus === "offline" || normalizedStatus === "down" || normalizedStatus === "dead" || normalizedStatus === "unreachable") {
    return "danger";
  }
  if (normalizedStatus === "stopped" || normalizedStatus === "stale" || normalizedStatus === "source-missing" || normalizedStatus === "source_missing" || normalizedStatus === "pending" || normalizedStatus === "wait") {
    return "warn";
  }
  return "info";
}

function getServiceProtocolLabel(protocol) {
  const normalizedProtocol = normalizeMetadataToken(protocol, "http");
  const key = `service_protocol_${normalizedProtocol}`;
  return TRANSLATIONS[getLanguage()]?.[key] || normalizedProtocol.toUpperCase();
}

function extractServicePort(ports) {
  const match = String(ports || "").match(/\b([1-9][0-9]{0,4})\b/);
  if (!match) {
    return "";
  }
  const port = Number(match[1]);
  return port > 0 && port <= 65535 ? String(port) : "";
}

function getServiceAccessPort(service) {
  return String(service?.accessPort || "").trim();
}

function getPublicServiceUrl(service) {
  return String(service?.serviceUrl || "").trim();
}

function buildPrivateServiceUrl(service, host = resolveDeviceHost(service)) {
  const ip = host?.ip || service?.ip || "";
  if (!ip) {
    return "";
  }
  const protocol = normalizeMetadataToken(service?.protocol, "http");
  const port = extractServicePort(getServiceAccessPort(service));
  return `${protocol}://${ip}${port ? `:${port}` : ""}`;
}

function buildServiceUrl(service, host = resolveDeviceHost(service)) {
  return getPublicServiceUrl(service) || buildPrivateServiceUrl(service, host);
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

  document.querySelectorAll(".field-help-button").forEach((button) => {
    button.setAttribute("aria-label", t("field_help_button_label"));
  });

  if (!shouldPreserveOpenForm(elements.discoveryAgentForm)) {
    renderDiscoveryAgentFormOptions();
  }

  if (activeFieldHelpButton) {
    const popover = document.querySelector(".field-help-popover");
    if (popover && !popover.hidden) {
      popover.textContent = t(activeFieldHelpButton.dataset.fieldHelp);
      positionFieldHelpPopover(activeFieldHelpButton, popover);
    }
  }

  elements.heroSignature.textContent = preferences.settings.customSignature || t("default_signature");
  syncPasswordToggleButtons();
  syncCrudModalCaptions();
  syncFilterPanelToggles();
}

function formatRecordsCount(count) {
  return t("records_count", { count });
}

function truncateText(value, maxLength = 30) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return CSS.escape(String(value));
  }
  return String(value).replace(/["\\]/g, "\\$&");
}

function revealExpandedContent(targetGetter, options = {}) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = typeof targetGetter === "function" ? targetGetter() : targetGetter;
      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: options.block || "nearest", inline: "nearest" });

      requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 28;
        const extraDown = Math.max(0, Number(options.extraDown || 0));
        const bottomOverflow = Math.max(0, rect.bottom - window.innerHeight + margin);
        if (bottomOverflow > 0 || extraDown > 0) {
          const maxScroll = Math.max(0, Number(options.maxScroll ?? 420));
          const scrollDistance = bottomOverflow + extraDown;
          window.scrollBy({
            top: maxScroll > 0 ? Math.min(scrollDistance, maxScroll) : scrollDistance,
            behavior: "smooth",
          });
        } else if (rect.top < margin) {
          window.scrollBy({
            top: rect.top - margin,
            behavior: "smooth",
          });
        }
      });
    });
  });
}

function getRegistrySectionPanel(sectionName) {
  return document.getElementById(`registry-panel-${sectionName}`);
}

function getRegistrySectionListWrap(sectionName) {
  if (sectionName === "devices") {
    return elements.devicesTableWrap;
  }
  if (sectionName === "services") {
    return elements.servicesTableWrap;
  }
  if (sectionName === "groups") {
    return elements.groupsTableWrap;
  }
  if (sectionName === "subnets") {
    return elements.subnetsTableWrap;
  }
  return null;
}

function revealRegistrySectionList(sectionName, options = {}) {
  revealExpandedContent(
    () => getRegistrySectionListWrap(sectionName) || getRegistrySectionPanel(sectionName),
    {
      block: options.block || "start",
      extraDown: options.extraDown ?? 0,
      maxScroll: options.maxScroll ?? 1200,
    },
  );
}

function revealListStart(targetGetter) {
  revealExpandedContent(targetGetter, { block: "start", extraDown: 0, maxScroll: 1200 });
}

function renderRegistryComment(value) {
  const text = String(value || "").trim();
  const displayText = truncateText(text || t("no_data"), 30);
  return `
    <div class="registry-table__comment" title="${escapeHtml(text)}">
      ${escapeHtml(displayText)}
    </div>
  `;
}

function renderDateTimeStack(value) {
  if (!value) {
    return escapeHtml(t("no_data"));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(String(value));
  }

  const locale = DATE_LOCALES[getLanguage()] || DATE_LOCALES.ru;
  const datePart = new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(date);
  return `
    <span>${escapeHtml(datePart)}</span>
    <span class="secondary-line mono">${escapeHtml(timePart)}</span>
  `;
}

function renderServicePorts(value) {
  const text = String(value || "").trim();
  if (!text) {
    return escapeHtml(t("no_data"));
  }

  const ports = text
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (ports.length <= 1) {
    return escapeHtml(text);
  }

  return `
    <span class="service-table__port-stack">
      ${ports.map((port) => `<span>${escapeHtml(port)}</span>`).join("")}
    </span>
  `;
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
    modalBlurEnabled:
      typeof rawSettings?.modalBlurEnabled === "boolean"
        ? rawSettings.modalBlurEnabled
        : DEFAULT_SETTINGS.modalBlurEnabled,
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
  const rawCustomDeviceSources = Array.isArray(rawPreferences?.customDeviceSources)
    ? rawPreferences.customDeviceSources
    : Array.isArray(rawSettings?.customDeviceSources)
      ? rawSettings.customDeviceSources
      : [];

  return {
    settings: normalizeSettings(rawSettings),
    customGroupTemplates: rawCustomGroupTemplates,
    customDeviceTypes: normalizeCustomDeviceTypes(rawCustomDeviceTypes),
    customDeviceSources: normalizeCustomDeviceSources(rawCustomDeviceSources),
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

function getAllowedNavigationValue(params, paramKey, optionKey, fallback) {
  const value = String(params.get(paramKey) || "").trim();
  const allowed = NAVIGATION_HASH_OPTIONS[optionKey || paramKey];
  return allowed?.has(value) ? value : fallback;
}

function createDefaultNavigationState() {
  return {
    view: activeView,
    registry: activeRegistrySection,
    settings: activeSettingsSection,
    integrations: activeIntegrationsSection,
    admin: activeAdminSection,
    template: activeTemplateSection,
    discovery: activeDiscoverySection,
    modal: "",
  };
}

function decodeHashPart(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function readRouteNavigationState(rawHash) {
  const parts = String(rawHash || "")
    .replace(/^\/+/, "")
    .split("/")
    .map(decodeHashPart)
    .filter(Boolean);
  const state = createDefaultNavigationState();
  const [root, first, second] = parts;

  if (NAVIGATION_HASH_OPTIONS.views.has(root)) {
    state.view = root;
    if (root === "registry" && NAVIGATION_HASH_OPTIONS.registry.has(first)) {
      state.registry = first;
    }
    return state;
  }

  if (root === "settings") {
    state.modal = "settings";
    state.view = activeView || "dashboard";
    state.settings = NAVIGATION_HASH_OPTIONS.settings.has(first) ? first : "profile";
    if (state.settings === "templates" && NAVIGATION_HASH_OPTIONS.template.has(second)) {
      state.template = second;
    }
    if (state.settings === "administration" && NAVIGATION_HASH_OPTIONS.admin.has(second)) {
      state.admin = second;
    }
    return state;
  }

  if (root === "integrations") {
    state.modal = "integrations";
    state.view = activeView || "dashboard";
    state.integrations = NAVIGATION_HASH_OPTIONS.integrations.has(first) ? first : "automation";
    if (state.integrations === "discovery" && NAVIGATION_HASH_OPTIONS.discovery.has(second)) {
      state.discovery = second;
    }
    return state;
  }

  return state;
}

function readQueryNavigationState(rawHash) {
  const params = new URLSearchParams(rawHash);
  const state = createDefaultNavigationState();
  state.view = getAllowedNavigationValue(params, "view", "views", state.view);
  state.registry = getAllowedNavigationValue(params, "registry", "registry", state.registry);
  state.settings = getAllowedNavigationValue(params, "settings", "settings", state.settings);
  state.integrations = getAllowedNavigationValue(params, "integrations", "integrations", state.integrations);
  state.admin = getAllowedNavigationValue(params, "admin", "admin", state.admin);
  state.template = getAllowedNavigationValue(params, "template", "template", state.template);
  state.discovery = getAllowedNavigationValue(params, "discovery", "discovery", state.discovery);
  state.modal = getAllowedNavigationValue(params, "modal", "modals", state.modal);
  return state;
}

function readNavigationStateFromHash() {
  const rawHash = String(window.location.hash || "").replace(/^#/, "");
  if (!rawHash) {
    return createDefaultNavigationState();
  }
  return rawHash.includes("=")
    ? readQueryNavigationState(rawHash)
    : readRouteNavigationState(rawHash);
}

function applyNavigationSections(navigationState) {
  activeView = navigationState.view || activeView;
  activeRegistrySection = navigationState.registry || activeRegistrySection;
  activeSettingsSection = navigationState.settings || activeSettingsSection;
  activeIntegrationsSection = navigationState.integrations || activeIntegrationsSection;
  activeAdminSection = navigationState.admin || activeAdminSection;
  activeTemplateSection = navigationState.template || activeTemplateSection;
  activeDiscoverySection = navigationState.discovery || activeDiscoverySection;
}

function getNavigationModalName(modal = getOpenModal()) {
  if (modal?.id === "settings-modal") {
    return "settings";
  }
  if (modal?.id === "integrations-modal") {
    return "integrations";
  }
  return "";
}

function encodeHashPart(value) {
  return encodeURIComponent(String(value || "").trim());
}

function buildNavigationHash(modalName) {
  if (modalName === "settings") {
    const parts = ["settings", activeSettingsSection];
    if (activeSettingsSection === "templates") {
      parts.push(activeTemplateSection);
    }
    if (activeSettingsSection === "administration") {
      parts.push(activeAdminSection);
    }
    return `#/${parts.map(encodeHashPart).join("/")}`;
  }

  if (modalName === "integrations") {
    const parts = ["integrations", activeIntegrationsSection];
    if (activeIntegrationsSection === "discovery") {
      parts.push(activeDiscoverySection);
    }
    return `#/${parts.map(encodeHashPart).join("/")}`;
  }

  if (activeView === "registry") {
    return `#/registry/${encodeHashPart(activeRegistrySection)}`;
  }

  return `#/${encodeHashPart(activeView || "dashboard")}`;
}

function updateNavigationHash(modalOverride = null) {
  if (isApplyingNavigationState || isNavigationBootstrapping) {
    return;
  }

  const modalName = typeof modalOverride === "string" ? modalOverride : getNavigationModalName();
  const nextHash = buildNavigationHash(modalName);
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function restoreNavigationFromHash({ restoreModal = false } = {}) {
  const navigationState = readNavigationStateFromHash();
  isApplyingNavigationState = true;
  try {
    applyNavigationSections(navigationState);
    setActiveView(activeView);
    setActiveRegistrySection(activeRegistrySection);
    setActiveSettingsSection(activeSettingsSection);
    setActiveAdminSection(activeAdminSection);
    setActiveTemplateSection(activeTemplateSection);
    setActiveIntegrationsSection(activeIntegrationsSection);
    setActiveDiscoverySection(activeDiscoverySection);
    if (restoreModal && state.auth?.authenticated) {
      const currentModal = getOpenModal();
      if (!navigationState.modal && ["settings-modal", "integrations-modal"].includes(currentModal?.id)) {
        closeModal(currentModal.id);
      } else if (navigationState.modal === "settings") {
        openSettingsModal(activeSettingsSection);
      } else if (navigationState.modal === "integrations") {
        openIntegrationsModal(activeIntegrationsSection);
      }
    }
  } finally {
    isApplyingNavigationState = false;
  }
  updateNavigationHash();
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

async function initialize() {
  preferences.settings = loadCachedInterfaceSettings();
  applyNavigationSections(readNavigationStateFromHash());
  bindEvents();
  isApplyingNavigationState = true;
  try {
    setActiveView(activeView);
  } finally {
    isApplyingNavigationState = false;
  }
  applyVisualSettings();
  applyLocalizedUi();
  renderAll();
  await restoreSession();
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.subnetForm.addEventListener("submit", handleSubnetSubmit);
  elements.deviceForm.addEventListener("submit", handleDeviceSubmit);
  elements.serviceForm?.addEventListener("submit", handleServiceSubmit);
  elements.groupForm.addEventListener("submit", handleGroupSubmit);
  elements.accessGroupForm.addEventListener("submit", handleAccessGroupSubmit);
  elements.userForm.addEventListener("submit", handleUserSubmit);
  elements.discoveryAgentForm?.addEventListener("submit", handleDiscoveryAgentSubmit);
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
  elements.topologyModeSelect?.addEventListener("change", () => {
    topologyMode = elements.topologyModeSelect.value === "advanced" ? "advanced" : "simple";
    resetTopologyViewport();
    resetTopologyRenderCache();
    ensureTopologyMapReady({ forceRender: true });
  });
  elements.topologySubnetFilter?.addEventListener("change", () => {
    topologySubnetFilter = elements.topologySubnetFilter.value || "all";
    resetTopologyViewport();
    resetTopologyRenderCache();
    ensureTopologyMapReady({ forceRender: true });
  });
  elements.topologyLayerFilter?.addEventListener("change", () => {
    topologyLayerFilter = elements.topologyLayerFilter.value || "all";
    resetTopologyViewport();
    resetTopologyRenderCache();
    ensureTopologyMapReady({ forceRender: true });
  });
  elements.topologySourceFilter?.addEventListener("change", () => {
    topologySourceFilter = elements.topologySourceFilter.value || "all";
    resetTopologyViewport();
    resetTopologyRenderCache();
    ensureTopologyMapReady({ forceRender: true });
  });
  elements.topologyStatusFilter?.addEventListener("change", () => {
    topologyStatusFilter = elements.topologyStatusFilter.value || "all";
    resetTopologyViewport();
    resetTopologyRenderCache();
    ensureTopologyMapReady({ forceRender: true });
  });
  elements.registrySectionTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const sectionName = button.dataset.registrySectionTab;
      setActiveRegistrySection(sectionName);
      if (sectionName === "devices" || sectionName === "services") {
        revealRegistrySectionList(sectionName, { extraDown: 110 });
      }
    });
  });
  elements.statCards.forEach((button) => {
    button.addEventListener("click", () => {
      if (suppressDashboardStatClick) {
        suppressDashboardStatClick = false;
        return;
      }
      handleStatNavigation(button.dataset.statTarget);
    });
  });
  elements.openModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleOpenModalRequest(button.dataset.openModal, button);
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
  elements.confirmModalActions?.addEventListener("click", handleDialogActionClick);
  elements.subnetSelect.addEventListener("change", handleDeviceSubnetChange);
  elements.serviceHostSelect?.addEventListener("change", handleServiceHostChange);
  bindUnifiedAddFormSelects();
  initializeFieldHelp();
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
  elements.settingsModalBlur.addEventListener("change", handleInterfaceSettingsPreview);
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
  elements.integrationsShortcutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeUserMenu();
      openIntegrationsModal(button.dataset.integrationsShortcut || "automation");
    });
  });
  elements.settingsNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSettingsSection(button.dataset.settingsTab);
    });
  });
  elements.adminTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveAdminSection(button.dataset.adminTab);
    });
  });
  elements.integrationsNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveIntegrationsSection(button.dataset.integrationsTab);
    });
  });
  elements.templateTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTemplateSection(button.dataset.templateTab);
    });
  });
  elements.discoveryTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveDiscoverySection(button.dataset.discoveryTab);
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
  elements.addCustomDeviceSourceButton?.addEventListener("click", handleAddCustomDeviceSource);
  elements.customDeviceSourcesList?.addEventListener("click", handleCustomDeviceSourceListClick);
  elements.customDeviceSourcesList?.addEventListener("input", handleCustomDeviceSourceListInput);
  elements.customDeviceSourcesList?.addEventListener("change", handleCustomDeviceSourceListInput);
  elements.applyTemplateJsonButton.addEventListener("click", handleTemplateJsonApply);
  elements.saveDeviceTypeSettingsButton?.addEventListener("click", handleDeviceTypeSettingsSave);
  elements.resetDeviceTypeSettingsButton?.addEventListener("click", handleDeviceTypeSettingsReset);
  elements.saveDeviceSourceSettingsButton?.addEventListener("click", handleDeviceSourceSettingsSave);
  elements.resetDeviceSourceSettingsButton?.addEventListener("click", handleDeviceSourceSettingsReset);
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
  elements.clearHistoryButton?.addEventListener("click", clearHistory);
  elements.subnetsTableBody.addEventListener("click", handleSubnetTableActions);
  elements.subnetsTableBody.addEventListener("change", handleSubnetScanToggle);
  elements.groupsTableBody.addEventListener("click", handleGroupTableActions);
  elements.devicesTableBody.addEventListener("click", handleDeviceTableActions);
  elements.servicesTableBody?.addEventListener("click", handleServiceListActions);
  elements.subnetsListToggleButton?.addEventListener("click", () => {
    showAllSubnetsInRegistry = !showAllSubnetsInRegistry;
    renderSubnetsTable();
    revealRegistrySectionList("subnets");
  });
  elements.groupsListToggleButton?.addEventListener("click", () => {
    showAllGroupsInRegistry = !showAllGroupsInRegistry;
    renderGroupsTable();
    revealRegistrySectionList("groups");
  });
  elements.devicesListToggleButton?.addEventListener("click", () => {
    showAllDevicesInRegistry = !showAllDevicesInRegistry;
    renderDevicesTable();
    revealRegistrySectionList("devices");
  });
  elements.servicesListToggleButton?.addEventListener("click", () => {
    showAllServicesInRegistry = !showAllServicesInRegistry;
    renderServicesList();
    revealRegistrySectionList("services");
  });
  elements.accessGroupsListToggleButton?.addEventListener("click", () => {
    showAllAccessGroups = !showAllAccessGroups;
    renderAccessGroupsTable();
    revealListStart(() => elements.accessGroupsTableWrap);
  });
  elements.usersListToggleButton?.addEventListener("click", () => {
    showAllUsers = !showAllUsers;
    renderUsersTable();
    revealListStart(() => elements.usersTableWrap);
  });
  elements.automationSubnetsListToggleButton?.addEventListener("click", () => {
    showAllAutomationSubnets = !showAllAutomationSubnets;
    renderSubnetScanSettings();
    revealListStart(() => elements.settingsSubnetScanList);
  });
  elements.discoveryAgentsListToggleButton?.addEventListener("click", () => {
    showAllDiscoveryAgents = !showAllDiscoveryAgents;
    renderDiscoveryAgentsTable();
    revealListStart(() => elements.discoveryAgentsTableWrap);
  });
  elements.accessGroupsTableBody?.addEventListener("click", handleAccessGroupTableActions);
  elements.usersTableBody?.addEventListener("click", handleUserAdminTableActions);
  elements.discoveryAgentsTableBody?.addEventListener("click", handleDiscoveryAgentTableActions);
  elements.resetDiscoveryAgentFormButton?.addEventListener("click", () => {
    clearDiscoveryAgentConfig();
    prepareDiscoveryAgentForm();
  });
  elements.filterToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      toggleFilterPanel(button.dataset.filterToggle);
    });
  });
  elements.discoveryAgentForm?.elements.allowedCidrs?.addEventListener("input", autosizeDiscoveryAllowedCidrs);
  elements.discoveryAgentForm?.elements.kind?.addEventListener("change", () => {
    setDiscoveryAgentCollectors(getDefaultDiscoveryCollectors(elements.discoveryAgentForm.elements.kind.value));
  });
  elements.copyDiscoveryAgentConfigButton?.addEventListener("click", copyDiscoveryAgentConfig);
  elements.discoveryAgentPolicyForm?.addEventListener("submit", handleDiscoveryAgentPolicySave);
  elements.cancelDiscoveryAgentPolicyButton?.addEventListener("click", hideDiscoveryAgentPolicyEditor);
  elements.discoveryAgentPolicyUseDefault?.addEventListener("change", syncDiscoveryAgentPolicyControls);
  elements.discoveryAgentPolicyStoreRaw?.addEventListener("change", syncDiscoveryAgentPolicyControls);
  elements.saveDiscoveryPolicyButton?.addEventListener("click", handleDiscoveryPolicySave);
  elements.discoveryPolicyStoreRaw?.addEventListener("change", syncDiscoveryPolicyControls);
  elements.discoveryResultsTableBody?.addEventListener("click", handleDiscoveryPreviewActions);
  elements.discoveryStaleCleanupButton?.addEventListener("click", handleDiscoveryStaleCleanup);
  elements.discoveryAuditEventFilter?.addEventListener("change", renderDiscoveryAudit);
  elements.discoveryDebugAgentFilter?.addEventListener("change", handleDiscoveryDebugFilterChange);
  elements.discoveryDebugKindFilter?.addEventListener("change", handleDiscoveryDebugFilterChange);
  elements.discoveryDebugTableBody?.addEventListener("click", handleDiscoveryDebugActions);
  elements.discoveryDebugTableBody?.addEventListener("change", handleDiscoveryDebugActions);
  elements.historySearchInput?.addEventListener("input", renderHistoryTable);
  elements.historyEventFilter?.addEventListener("change", renderHistoryTable);
  elements.historyScopeFilter?.addEventListener("change", renderHistoryTable);
  elements.dashboardAttentionList?.addEventListener("click", handleDashboardAttentionClick);
  elements.dashboardHealthList?.addEventListener("click", handleDashboardHealthClick);
  elements.missingTypeForm?.addEventListener("submit", handleMissingTypeSubmit);
  document.addEventListener("pointerdown", handleFieldHelpPointerDown, true);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", handlePageResume);
  window.addEventListener("focus", handlePageResume);
  window.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("hashchange", () => restoreNavigationFromHash({ restoreModal: state.auth?.authenticated }));
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
      isNavigationBootstrapping = false;
      openAuthScreen(session);
      return;
    }

    await finishAuthenticatedBootstrap();
  } catch (error) {
    console.error(error);
    isNavigationBootstrapping = false;
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
  isNavigationBootstrapping = false;
  restoreNavigationFromHash({ restoreModal: true });
  connectLiveStream();
  if (pollIntervalId) {
    window.clearInterval(pollIntervalId);
  }
  pollIntervalId = window.setInterval(() => {
    if (isPageHidden()) {
      markHiddenRefreshPending();
      return;
    }
    scheduleStateRefresh({ silent: true, delay: 500 });
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
  elements.settingsModalBlur.checked = preferences.settings.modalBlurEnabled;
  elements.settingsSuggestionMode.value = preferences.settings.suggestionMode;
  syncCurrentUserChrome();
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
  document.documentElement.dataset.accentTheme = preferences.settings.accentTheme;
  document.body.dataset.accentTheme = preferences.settings.accentTheme;
  document.body.dataset.modalBlur = preferences.settings.modalBlurEnabled ? "on" : "off";
}

function renderSubnetScanSettings() {
  const canManage = Boolean(state.auth?.capabilities?.canManageServerSettings);
  const shouldShowExpand = syncCompactListWrap(
    elements.settingsSubnetScanList,
    state.subnets.length,
    showAllAutomationSubnets,
  );
  syncRegistryListToggleButton(
    elements.automationSubnetsListToggleButton,
    shouldShowExpand,
    showAllAutomationSubnets,
    "show_all_automation_subnets",
    "show_less_automation_subnets",
    state.subnets.length,
  );

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

function normalizeCustomDeviceSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  const seenIds = new Set();

  return rawSources
    .map((entry, index) => {
      const label = String(entry?.label || "").trim();
      const suggestedId = String(entry?.id || "").trim() || slugifyDeviceSourceId(label, index);
      const normalizedId = normalizeMetadataToken(suggestedId, "");
      const badge = String(entry?.badge || "")
        .trim()
        .replace(/\s+/g, "")
        .slice(0, 4);

      if (!label || !normalizedId || BUILTIN_DEVICE_SOURCE_IDS.has(normalizedId) || seenIds.has(normalizedId)) {
        return null;
      }

      seenIds.add(normalizedId);
      return {
        id: normalizedId,
        label,
        badge: badge || normalizedId.slice(0, 3).toUpperCase(),
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

function createBlankCustomDeviceSource() {
  return {
    id: "",
    label: "",
    badge: "",
  };
}

function slugifyDeviceTypeId(value, fallbackIndex = 0) {
  const normalized = normalizeSearchableText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `device-type-${fallbackIndex + 1}`;
}

function slugifyDeviceSourceId(value, fallbackIndex = 0) {
  const normalized = normalizeSearchableText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `source-${fallbackIndex + 1}`;
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

function renderBundledDeviceSourceCards() {
  if (!elements.bundledDeviceSourcesList) {
    return;
  }

  elements.bundledDeviceSourcesList.innerHTML = BUILTIN_DEVICE_SOURCES.map((source) => {
    const label = t(source.labelKey);
    return `
      <div class="template-rule-card template-rule-card--static">
        <div class="template-rule-summary template-rule-summary--static">
          <span class="source-logo ${escapeHtml(getDeviceSourceLogoClass(source.id))}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(source.badge)}</span>
          <div class="template-rule-summary__main">
            <strong class="template-rule-summary__title">${escapeHtml(label)}</strong>
            <span class="template-rule-summary__meta">${escapeHtml(t("device_source_id_meta", { id: source.id }))}</span>
          </div>
          <span class="pill template-rule-summary__hint">${escapeHtml(t("template_bundled_badge"))}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderCustomDeviceSourceCards(deviceSources) {
  if (!elements.customDeviceSourcesList) {
    return;
  }

  const effectiveSources = deviceSources.length > 0 ? deviceSources : [createBlankCustomDeviceSource()];

  elements.customDeviceSourcesList.innerHTML = effectiveSources.map((source, index) => {
    const title = source.label || t("device_source_custom_fallback", { index: index + 1 });
    const sourceId = source.id || slugifyDeviceSourceId(source.label, index);
    const badge = source.badge || sourceId.slice(0, 3).toUpperCase();
    const logoClass = getDeviceSourceLogoClass(sourceId);
    const summaryMeta = sourceId ? t("device_source_id_meta", { id: sourceId }) : t("device_source_id_pending");

    return `
      <details class="template-rule-card" data-custom-device-source-id="${escapeHtml(source.id || "")}">
        <summary class="template-rule-summary">
          <span class="source-logo ${escapeHtml(logoClass)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(badge)}</span>
          <div class="template-rule-summary__main">
            <strong class="template-rule-summary__title">${escapeHtml(title)}</strong>
            <span class="template-rule-summary__meta">${escapeHtml(summaryMeta)}</span>
          </div>
          <span class="pill template-rule-summary__hint">${escapeHtml(t("device_source_edit_rule"))}</span>
        </summary>

        <div class="template-rule-body">
          <div class="template-rule-grid">
            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("device_source_label_title"))}</span>
              <input type="text" data-device-source-field="label" value="${escapeHtml(source.label || "")}" placeholder="${escapeHtml(t("device_source_label_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("device_source_label_note"))}</span>
            </label>

            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("device_source_id_title"))}</span>
              <input type="text" data-device-source-field="id" value="${escapeHtml(source.id || "")}" placeholder="${escapeHtml(t("device_source_id_key_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("device_source_id_note"))}</span>
            </label>

            <label class="setting-card">
              <span class="setting-title">${escapeHtml(t("device_source_badge_title"))}</span>
              <input type="text" data-device-source-field="badge" maxlength="4" value="${escapeHtml(source.badge || "")}" placeholder="${escapeHtml(t("device_source_badge_placeholder"))}">
              <span class="setting-note">${escapeHtml(t("device_source_badge_note"))}</span>
            </label>
          </div>

          <div class="template-rule-actions">
            <button type="button" class="link-button" data-remove-custom-device-source="${index}">${escapeHtml(t("remove_device_source"))}</button>
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

function collectCustomDeviceSourcesFromCards() {
  const rows = [...(elements.customDeviceSourcesList?.querySelectorAll(".template-rule-card") || [])];
  const draftSources = rows.map((row, index) => {
    const label = String(row.querySelector('[data-device-source-field="label"]')?.value || "").trim();
    const idValue = String(row.querySelector('[data-device-source-field="id"]')?.value || "").trim();
    const badge = String(row.querySelector('[data-device-source-field="badge"]')?.value || "").trim();

    if (!label && !idValue && !badge) {
      return null;
    }

    return {
      id: idValue || slugifyDeviceSourceId(label, index),
      label,
      badge,
    };
  }).filter(Boolean);

  const normalizedSources = normalizeCustomDeviceSources(draftSources);
  if (normalizedSources.length !== draftSources.length) {
    throw new Error(t("device_sources_invalid_form"));
  }

  return normalizedSources;
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

function handleCustomDeviceSourceListInput() {
  try {
    preferences.customDeviceSources = collectCustomDeviceSourcesFromCards();
    renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
    renderServicesList();
  } catch {
    // Keep local input intact until the form becomes valid.
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
  const customDeviceSources = normalizeCustomDeviceSources(preferences.customDeviceSources);

  preferences.customDeviceTypes = customDeviceTypes;
  preferences.customDeviceSources = customDeviceSources;
  preferences.customGroupTemplates = customTemplates;
  rebuildEffectiveGroupSuggestionTemplates();
  renderCustomDeviceTypeCards(customDeviceTypes);
  renderBundledDeviceSourceCards();
  renderCustomDeviceSourceCards(customDeviceSources);
  renderBundledTemplateRuleCards(bundledTemplates);
  renderTemplateRuleCards(customTemplates);
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
  if (document.activeElement !== elements.templateEditor) {
    elements.templateEditor.value = JSON.stringify(customTemplates, null, 2);
  }
  setTemplateSettingsStatus(t("custom_templates_note"), "muted");
  setDeviceTypeSettingsStatus(t("device_types_note"), "muted");
  setDeviceSourceSettingsStatus(t("device_sources_note"), "muted");
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

function handleAddCustomDeviceSource() {
  const currentSources = (() => {
    try {
      return collectCustomDeviceSourcesFromCards();
    } catch {
      return normalizeCustomDeviceSources(preferences.customDeviceSources);
    }
  })();

  renderCustomDeviceSourceCards([...currentSources, createBlankCustomDeviceSource()]);
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

function handleCustomDeviceSourceListClick(event) {
  const removeButton = event.target.closest("[data-remove-custom-device-source]");
  if (!removeButton) {
    return;
  }

  const row = removeButton.closest(".template-rule-card");
  row?.remove();

  if (!elements.customDeviceSourcesList.children.length) {
    renderCustomDeviceSourceCards([createBlankCustomDeviceSource()]);
  }

  try {
    preferences.customDeviceSources = collectCustomDeviceSourcesFromCards();
  } catch {
    preferences.customDeviceSources = normalizeCustomDeviceSources(preferences.customDeviceSources);
  }
  renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
  renderServicesList();
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

function setResultStatus(element, message, tone = "muted", extraClassName = "", visible = true) {
  if (!element) {
    return;
  }

  const previousTimer = resultStatusTimers.get(element);
  if (previousTimer) {
    window.clearTimeout(previousTimer);
    resultStatusTimers.delete(element);
  }

  element.className = ["result-card", `result-card--${tone}`, extraClassName].filter(Boolean).join(" ");
  element.textContent = message || "";
  element.hidden = !visible || !message;

  if (!element.hidden && (tone === "ok" || tone === "warn")) {
    const expectedMessage = element.textContent;
    const timer = window.setTimeout(() => {
      if (element.textContent === expectedMessage) {
        element.hidden = true;
        element.textContent = "";
      }
      resultStatusTimers.delete(element);
    }, RESULT_STATUS_AUTO_HIDE_MS);
    resultStatusTimers.set(element, timer);
  }
}

function setTemplateSettingsStatus(message, tone = "muted") {
  setResultStatus(elements.templateSettingsStatus, message, tone);
}

function setDeviceTypeSettingsStatus(message, tone = "muted") {
  setResultStatus(elements.deviceTypeSettingsStatus, message, tone);
}

function setDeviceSourceSettingsStatus(message, tone = "muted") {
  setResultStatus(elements.deviceSourceSettingsStatus, message, tone);
}

function setDeviceFormStatus(message, tone = "muted", visible = true) {
  setResultStatus(elements.deviceFormStatus, message, tone, "form-grid__full", visible);
}

function clearDeviceFormStatus() {
  setDeviceFormStatus(t("device_form_idle"), "muted", false);
}

function setDeviceFormPending(isPending) {
  const submitButton = elements.deviceForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.disabled = isPending;
    submitButton.textContent = isPending
      ? t("device_form_saving")
      : t(editingDeviceId ? "update_device" : "save_device");
  }

  elements.applySuggestionButton.disabled = isPending || !elements.applySuggestionButton.dataset.suggestedIp;
}

function setServerSettingsStatus(message, tone = "muted") {
  setResultStatus(elements.serverSettingsStatus, message, tone);
}

function setAccessGroupStatus(message, tone = "muted") {
  setResultStatus(elements.accessGroupStatus, message, tone);
}

function setUserStatus(message, tone = "muted") {
  setResultStatus(elements.userStatus, message, tone);
}

function setDiscoveryAgentStatus(message, tone = "muted") {
  setResultStatus(elements.discoveryAgentStatus, message, tone);
}

function setDiscoveryPolicyStatus(message, tone = "muted") {
  setResultStatus(elements.discoveryPolicyStatus, message, tone);
}

function collectInterfaceSettingsDraft() {
  return normalizeSettings({
    language: elements.settingsLanguageSelect.value,
    customSignature: elements.settingsSignatureInput.value,
    accentTheme: elements.settingsThemeSelect.value,
    autoRescanAfterDeviceSave: elements.settingsAutoRescan.checked,
    modalBlurEnabled: elements.settingsModalBlur.checked,
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
  setResultStatus(elements.profileSettingsStatus, message, tone);
}

function setInterfaceSettingsStatus(message, tone = "muted") {
  setResultStatus(elements.interfaceSettingsStatus, message, tone);
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

async function handleDeviceSourceSettingsSave() {
  try {
    const normalizedSources = collectCustomDeviceSourcesFromCards();
    preferences.customDeviceSources = normalizedSources;
    await savePreferences({ customDeviceSources: normalizedSources });
    renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
    renderServicesList();
    renderTemplateEditor();
    setDeviceSourceSettingsStatus(t("device_sources_saved"), "ok");
  } catch (error) {
    setDeviceSourceSettingsStatus(error.message || t("device_sources_invalid_form"), "danger");
  }
}

async function handleDeviceSourceSettingsReset() {
  preferences.customDeviceSources = [];
  await savePreferences({ customDeviceSources: [] });
  renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
  renderServicesList();
  renderTemplateEditor();
  setDeviceSourceSettingsStatus(t("device_sources_reset_done"), "warn");
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

function renderDiscoveryAgentFormOptions() {
  if (!elements.discoveryAgentForm) {
    return;
  }

  const currentHostValue = elements.discoveryAgentHostSelect?.value || "";
  const currentSharedTokenValue = elements.discoveryAgentSharedTokenSelect?.value || "";
  const hostOptions = (state.devices || [])
    .filter((device) => device.type !== "service")
    .slice()
    .sort((left, right) => {
      const leftIp = normalizeIpSafe(left.ip);
      const rightIp = normalizeIpSafe(right.ip);
      if (leftIp && rightIp) {
        return ipToInt(leftIp) - ipToInt(rightIp);
      }
      if (leftIp || rightIp) {
        return leftIp ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "ru");
    })
    .map((device) => `
      <option value="${escapeHtml(device.id)}">
        ${escapeHtml(`${device.ip || t("no_data")} · ${device.name}`)}
      </option>
    `);

  if (elements.discoveryAgentHostSelect) {
    elements.discoveryAgentHostSelect.innerHTML = `
      <option value="">${escapeHtml(t("no_binding"))}</option>
      ${hostOptions.join("")}
    `;
    elements.discoveryAgentHostSelect.value = currentHostValue;
  }

  const agentOptions = (state.admin?.discoveryAgents || [])
    .filter((agent) => agent.id !== editingDiscoveryAgentId)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .map((agent) => `
      <option value="${escapeHtml(agent.id)}">${escapeHtml(agent.name)}</option>
    `);

  if (elements.discoveryAgentSharedTokenSelect) {
    elements.discoveryAgentSharedTokenSelect.innerHTML = `
      <option value="">${escapeHtml(t("discovery_agent_new_token"))}</option>
      ${agentOptions.join("")}
    `;
    elements.discoveryAgentSharedTokenSelect.value = currentSharedTokenValue;
  }

  if (elements.discoveryAgentSharedTokenLabel) {
    elements.discoveryAgentSharedTokenLabel.hidden = Boolean(editingDiscoveryAgentId);
  }
}

function autosizeDiscoveryAllowedCidrs() {
  const textarea = elements.discoveryAgentForm?.elements.allowedCidrs;
  if (!textarea) {
    return;
  }

  textarea.style.height = "50px";
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, 50), 132);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > nextHeight ? "auto" : "hidden";
}

function getSelectDefaultValue(select) {
  if (select.multiple) {
    return [...select.options]
      .filter((option) => option.defaultSelected)
      .map((option) => option.value)
      .join("\u0000");
  }
  const defaultOption = [...select.options].find((option) => option.defaultSelected) || select.options[0];
  return defaultOption?.value || "";
}

function getFormControlValue(control) {
  if (!control || !control.name || control.type === "button" || control.type === "submit" || control.type === "reset") {
    return null;
  }
  if (control.type === "checkbox" || control.type === "radio") {
    return Boolean(control.checked);
  }
  if (control.tagName === "SELECT") {
    if (control.multiple) {
      return [...control.selectedOptions].map((option) => option.value).join("\u0000");
    }
    return control.value;
  }
  return String(control.value || "");
}

function getFormControlDefaultValue(control) {
  if (!control || !control.name || control.type === "button" || control.type === "submit" || control.type === "reset") {
    return null;
  }
  if (control.type === "checkbox" || control.type === "radio") {
    return Boolean(control.defaultChecked);
  }
  if (control.tagName === "SELECT") {
    return getSelectDefaultValue(control);
  }
  return String(control.defaultValue || "");
}

function isFormDirty(form) {
  if (!form) {
    return false;
  }
  return [...form.elements].some((control) => {
    const value = getFormControlValue(control);
    if (value === null) {
      return false;
    }
    return value !== getFormControlDefaultValue(control);
  });
}

function isModalOpen(modalId) {
  const modal = document.getElementById(modalId);
  return Boolean(modal && !modal.hidden);
}

function shouldPreserveOpenForm(form, modalId = "") {
  if (!form || !isFormDirty(form)) {
    return false;
  }
  if (!modalId) {
    return true;
  }
  return isModalOpen(modalId);
}

function prepareDiscoveryAgentForm(agent = null) {
  if (!elements.discoveryAgentForm) {
    return;
  }

  editingDiscoveryAgentId = agent?.id || "";
  elements.discoveryAgentForm.reset();
  renderDiscoveryAgentFormOptions();
  elements.discoveryAgentForm.elements.enabled.checked = agent ? Boolean(agent.enabled) : true;
  elements.discoveryAgentForm.elements.kind.value = agent?.kind || "host";
  elements.discoveryAgentForm.elements.createMode.value = agent?.createMode || "preview_only";
  elements.discoveryAgentForm.elements.linkedHostDeviceId.value = agent?.linkedHostDeviceId || "";
  elements.discoveryAgentForm.elements.name.value = agent?.name || "";
  elements.discoveryAgentForm.elements.allowedCidrs.value = (agent?.allowedCidrs || []).join("\n");
  setDiscoveryAgentCollectors(getDefaultDiscoveryCollectors(elements.discoveryAgentForm.elements.kind.value));
  autosizeDiscoveryAllowedCidrs();
  const submitButton = elements.discoveryAgentForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.textContent = agent ? t("discovery_agent_update_button") : t("discovery_agent_save_button");
  }
}

function normalizeDiscoveryDataPolicy(rawPolicy = {}) {
  return {
    ...DEFAULT_DISCOVERY_DATA_POLICY,
    ...Object.fromEntries(
      Object.keys(DEFAULT_DISCOVERY_DATA_POLICY).map((key) => [
        key,
        typeof rawPolicy?.[key] === "boolean" ? rawPolicy[key] : DEFAULT_DISCOVERY_DATA_POLICY[key],
      ]),
    ),
  };
}

function normalizeDiscoveryReplacementPolicy(rawPolicy = {}) {
  return {
    ...DEFAULT_DISCOVERY_REPLACEMENT_POLICY,
    ...Object.fromEntries(
      Object.keys(DEFAULT_DISCOVERY_REPLACEMENT_POLICY).map((key) => [
        key,
        typeof rawPolicy?.[key] === "boolean" ? rawPolicy[key] : DEFAULT_DISCOVERY_REPLACEMENT_POLICY[key],
      ]),
    ),
  };
}

function getDiscoveryDataPolicyDraft() {
  const storeRawMetadata = Boolean(elements.discoveryPolicyStoreRaw?.checked);
  return normalizeDiscoveryDataPolicy({
    storeRuntime: storeRawMetadata || Boolean(elements.discoveryPolicyStoreRuntime?.checked),
    storeLabels: storeRawMetadata || Boolean(elements.discoveryPolicyStoreLabels?.checked),
    storeNetworkDetails: storeRawMetadata || Boolean(elements.discoveryPolicyStoreNetwork?.checked),
    storeInternalIps: storeRawMetadata || Boolean(elements.discoveryPolicyStoreNetwork?.checked),
    storeRawMetadata,
    showMetadataInPreview: Boolean(elements.discoveryPolicyShowPreview?.checked),
  });
}

function getDiscoveryReplacementPolicyDraft() {
  return normalizeDiscoveryReplacementPolicy({
    autoReplaceDockerContainers: Boolean(elements.discoveryPolicyAutoReplaceDocker?.checked),
  });
}

function getDiscoveryAgentEffectivePolicy(agent) {
  return normalizeDiscoveryDataPolicy(agent?.dataPolicyOverride || state.settings?.discoveryDataPolicy);
}

function getDiscoveryAgentPolicyDraft() {
  const storeRawMetadata = Boolean(elements.discoveryAgentPolicyStoreRaw?.checked);
  return normalizeDiscoveryDataPolicy({
    storeRuntime: storeRawMetadata || Boolean(elements.discoveryAgentPolicyStoreRuntime?.checked),
    storeLabels: storeRawMetadata || Boolean(elements.discoveryAgentPolicyStoreLabels?.checked),
    storeNetworkDetails: storeRawMetadata || Boolean(elements.discoveryAgentPolicyStoreNetwork?.checked),
    storeInternalIps: storeRawMetadata || Boolean(elements.discoveryAgentPolicyStoreNetwork?.checked),
    storeRawMetadata,
    showMetadataInPreview: Boolean(elements.discoveryAgentPolicyShowPreview?.checked),
  });
}

function isDiscoveryDataPolicyDirty() {
  if (!isSettingsModalOpen()) {
    return false;
  }
  const currentPolicy = normalizeDiscoveryDataPolicy(state.settings?.discoveryDataPolicy);
  const draftPolicy = getDiscoveryDataPolicyDraft();
  return Object.keys(DEFAULT_DISCOVERY_DATA_POLICY).some((key) => currentPolicy[key] !== draftPolicy[key]);
}

function isDiscoveryAgentPolicyDirty() {
  if (!editingDiscoveryAgentPolicyId || !elements.discoveryAgentPolicyForm || elements.discoveryAgentPolicyForm.hidden) {
    return false;
  }
  const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === editingDiscoveryAgentPolicyId);
  if (!agent) {
    return false;
  }
  const useDefault = Boolean(elements.discoveryAgentPolicyUseDefault?.checked);
  if (useDefault !== Boolean(agent.usesDefaultDataPolicy)) {
    return true;
  }
  if (useDefault) {
    return false;
  }
  const currentPolicy = normalizeDiscoveryDataPolicy(agent.dataPolicyOverride || state.settings?.discoveryDataPolicy);
  const draftPolicy = getDiscoveryAgentPolicyDraft();
  return Object.keys(DEFAULT_DISCOVERY_DATA_POLICY).some((key) => currentPolicy[key] !== draftPolicy[key]);
}

function syncDiscoveryPolicyControls() {
  const storeRawMetadata = Boolean(elements.discoveryPolicyStoreRaw?.checked);
  [
    elements.discoveryPolicyStoreRuntime,
    elements.discoveryPolicyStoreLabels,
    elements.discoveryPolicyStoreNetwork,
  ].forEach((control) => {
    if (!control) {
      return;
    }
    if (storeRawMetadata) {
      control.checked = true;
    }
    control.disabled = storeRawMetadata || !Boolean(state.auth?.capabilities?.isAdmin);
  });
}

function syncDiscoveryAgentPolicyControls() {
  const isAdmin = Boolean(state.auth?.capabilities?.isAdmin);
  const useDefault = Boolean(elements.discoveryAgentPolicyUseDefault?.checked);
  if (useDefault) {
    setDiscoveryAgentPolicyControls(state.settings?.discoveryDataPolicy);
  }
  const storeRawMetadata = Boolean(elements.discoveryAgentPolicyStoreRaw?.checked);
  [
    elements.discoveryAgentPolicyStoreRuntime,
    elements.discoveryAgentPolicyStoreLabels,
    elements.discoveryAgentPolicyStoreNetwork,
  ].forEach((control) => {
    if (!control) {
      return;
    }
    if (storeRawMetadata) {
      control.checked = true;
    }
    control.disabled = !isAdmin || useDefault || storeRawMetadata;
  });
  [
    elements.discoveryAgentPolicyStoreRaw,
    elements.discoveryAgentPolicyShowPreview,
    elements.saveDiscoveryAgentPolicyButton,
  ].forEach((control) => {
    if (control) {
      control.disabled = !isAdmin || (useDefault && control !== elements.saveDiscoveryAgentPolicyButton);
    }
  });
}

function renderDiscoveryDataPolicySettings() {
  const policy = normalizeDiscoveryDataPolicy(state.settings?.discoveryDataPolicy);
  if (elements.discoveryPolicyStoreRuntime) {
    elements.discoveryPolicyStoreRuntime.checked = Boolean(policy.storeRuntime);
  }
  if (elements.discoveryPolicyStoreLabels) {
    elements.discoveryPolicyStoreLabels.checked = Boolean(policy.storeLabels);
  }
  if (elements.discoveryPolicyStoreNetwork) {
    elements.discoveryPolicyStoreNetwork.checked = Boolean(policy.storeNetworkDetails || policy.storeInternalIps);
  }
  if (elements.discoveryPolicyStoreRaw) {
    elements.discoveryPolicyStoreRaw.checked = Boolean(policy.storeRawMetadata);
  }
  if (elements.discoveryPolicyShowPreview) {
    elements.discoveryPolicyShowPreview.checked = Boolean(policy.showMetadataInPreview);
  }
  if (elements.discoveryPolicyAutoReplaceDocker) {
    const replacementPolicy = normalizeDiscoveryReplacementPolicy(state.settings?.discoveryReplacementPolicy);
    elements.discoveryPolicyAutoReplaceDocker.checked = Boolean(replacementPolicy.autoReplaceDockerContainers);
  }
  syncDiscoveryPolicyControls();
}

function setDiscoveryAgentPolicyControls(policy) {
  const normalizedPolicy = normalizeDiscoveryDataPolicy(policy);
  if (elements.discoveryAgentPolicyStoreRuntime) {
    elements.discoveryAgentPolicyStoreRuntime.checked = Boolean(normalizedPolicy.storeRuntime);
  }
  if (elements.discoveryAgentPolicyStoreLabels) {
    elements.discoveryAgentPolicyStoreLabels.checked = Boolean(normalizedPolicy.storeLabels);
  }
  if (elements.discoveryAgentPolicyStoreNetwork) {
    elements.discoveryAgentPolicyStoreNetwork.checked = Boolean(
      normalizedPolicy.storeNetworkDetails || normalizedPolicy.storeInternalIps
    );
  }
  if (elements.discoveryAgentPolicyStoreRaw) {
    elements.discoveryAgentPolicyStoreRaw.checked = Boolean(normalizedPolicy.storeRawMetadata);
  }
  if (elements.discoveryAgentPolicyShowPreview) {
    elements.discoveryAgentPolicyShowPreview.checked = Boolean(normalizedPolicy.showMetadataInPreview);
  }
}

function prepareDiscoveryAgentPolicyEditor(agent) {
  if (!elements.discoveryAgentPolicyForm || !agent) {
    return;
  }
  editingDiscoveryAgentPolicyId = agent.id;
  if (elements.discoveryAgentPolicyTitle) {
    elements.discoveryAgentPolicyTitle.textContent = t("discovery_agent_policy_title_for", { name: agent.name });
  }
  if (elements.discoveryAgentPolicyUseDefault) {
    elements.discoveryAgentPolicyUseDefault.checked = Boolean(agent.usesDefaultDataPolicy);
  }
  setDiscoveryAgentPolicyControls(getDiscoveryAgentEffectivePolicy(agent));
  elements.discoveryAgentPolicyForm.hidden = false;
  syncDiscoveryAgentPolicyControls();
}

function hideDiscoveryAgentPolicyEditor() {
  editingDiscoveryAgentPolicyId = "";
  if (elements.discoveryAgentPolicyForm) {
    elements.discoveryAgentPolicyForm.hidden = true;
  }
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

function prepareDeviceModal(device = null, options = {}) {
  const preset = options.preset || "";
  editingDeviceId = device?.id || "";
  elements.deviceForm.reset();
  clearDeviceFormStatus();
  setDeviceFormPending(false);
  elements.deviceModalTitle.textContent = device
    ? t("edit_device")
    : preset === "service"
      ? t("add_service")
      : t("add_device");
  elements.deviceSubmitButton.textContent = device ? t("update_device") : t("save_device");
  renderDeviceTypeOptions(device?.type || (preset === "service" ? "service" : "server"));
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
    if (preset === "service") {
      elements.deviceForm.elements.type.value = "service";
    }
  }
  updateSuggestedIp();
}

function setServiceFormStatus(message, tone = "muted", visible = true) {
  setResultStatus(elements.serviceFormStatus, message, tone, "form-grid__full", visible);
}

function clearServiceFormStatus() {
  setServiceFormStatus("", "muted", false);
}

function prepareServiceModal(service = null) {
  editingServiceId = service?.id || "";
  elements.serviceForm.reset();
  clearServiceFormStatus();
  renderServiceHostOptions(service?.hostDeviceId || "");
  renderServiceSourceOptions(service?.source || "");
  elements.serviceModalTitle.textContent = service ? t("edit_service") : t("add_service");
  elements.serviceSubmitButton.textContent = service ? t("update_service") : t("save_service");

  if (service) {
    elements.serviceForm.elements.name.value = service.name;
    elements.serviceForm.elements.hostDeviceId.value = service.hostDeviceId || "";
    elements.serviceForm.elements.source.value = service.source || "";
    elements.serviceForm.elements.integrationStatus.value = service.integrationStatus || "";
    elements.serviceForm.elements.protocol.value = service.protocol || "http";
    elements.serviceForm.elements.accessPort.value = service.accessPort || "";
    elements.serviceForm.elements.serviceUrl.value = service.serviceUrl || "";
    elements.serviceForm.elements.ports.value = service.ports || "";
    elements.serviceForm.elements.note.value = service.note || "";
  } else {
    elements.serviceForm.elements.integrationStatus.value = "running";
    elements.serviceForm.elements.protocol.value = "http";
  }
}

function handleOpenModalRequest(modalId, trigger = null) {
  if (!modalId) {
    return;
  }
  const opener = trigger || document.querySelector(`[data-open-modal="${modalId}"]`);
  if (opener?.disabled) {
    return;
  }

  if (modalId === "settings-modal") {
    openSettingsModal();
    return;
  }
  if (modalId === "integrations-modal") {
    openIntegrationsModal();
    return;
  }

  if (modalId === "subnet-modal") {
    prepareSubnetModal();
  } else if (modalId === "group-modal") {
    prepareGroupModal();
  } else if (modalId === "device-modal") {
    prepareDeviceModal(null, { preset: opener?.dataset.devicePreset || "" });
  } else if (modalId === "service-modal") {
    prepareServiceModal();
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

  if (!currentModal) {
    modalScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${modalScrollY}px`;
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
  if (modal.id === "confirm-modal") {
    resolveAtlasDialog(null);
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
  if (modal.id === "service-modal") {
    clearServiceFormStatus();
    editingServiceId = "";
  }
  if (modal.id === "subnet-modal") {
    editingSubnetId = "";
  }
  if (modal.id === "group-modal") {
    editingGroupId = "";
  }
  if (modal.id === "settings-modal") {
    clearDiscoveryAgentConfig();
    restoreInterfaceBaseline();
    syncSettingsForm();
    interfaceSettingsBaseline = null;
  }
  if (modal.id === "integrations-modal") {
    clearDiscoveryAgentConfig();
  }
  hideFieldHelp(true);
  if (!getOpenModal()) {
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, modalScrollY);
  }
  if (modal.id === "settings-modal" || modal.id === "integrations-modal") {
    updateNavigationHash("");
  }
}

function getOpenModal() {
  return elements.modalBackdrops.find((modal) => !modal.hidden) || null;
}

function getOpenModalExcept(modalId) {
  return elements.modalBackdrops.find((modal) => modal.id !== modalId && !modal.hidden) || null;
}

function resolveAtlasDialog(result) {
  if (!elements.confirmModal) {
    activeDialogResolver?.(result);
    activeDialogResolver = null;
    return;
  }

  elements.confirmModal.hidden = true;
  if (!dialogOpenedOverModal && !getOpenModalExcept("confirm-modal")) {
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, modalScrollY);
  }
  dialogOpenedOverModal = false;
  const resolver = activeDialogResolver;
  activeDialogResolver = null;
  resolver?.(result);
}

function handleDialogActionClick(event) {
  const button = event.target.closest("[data-dialog-choice]");
  if (!button) {
    return;
  }
  resolveAtlasDialog({
    choice: button.dataset.dialogChoice,
    inputValue: elements.confirmModalInput?.value || "",
  });
}

function showAtlasDialog({
  title = t("dialog_default_title"),
  message = "",
  eyebrow = t("dialog_eyebrow"),
  inputLabel = "",
  inputValue = "",
  inputPlaceholder = "",
  choices = [],
} = {}) {
  if (!elements.confirmModal) {
    return Promise.resolve(null);
  }

  if (activeDialogResolver) {
    resolveAtlasDialog(null);
  }

  const normalizedChoices = choices.length > 0
    ? choices
    : [
      { value: "cancel", label: t("cancel_button"), variant: "ghost" },
      { value: "confirm", label: t("confirm_button"), variant: "primary" },
    ];

  elements.confirmModalEyebrow.textContent = eyebrow;
  elements.confirmModalTitle.textContent = title;
  elements.confirmModalMessage.textContent = message;
  elements.confirmModalInputWrap.hidden = !inputLabel;
  elements.confirmModalInputLabel.textContent = inputLabel || "";
  elements.confirmModalInput.value = inputValue || "";
  elements.confirmModalInput.placeholder = inputPlaceholder || "";
  elements.confirmModalActions.innerHTML = normalizedChoices.map((choice) => {
    const variantClass = choice.variant === "danger"
      ? "action-button--danger"
      : choice.variant === "primary"
        ? "action-button--primary"
        : "action-button--ghost";
    return `
      <button
        type="button"
        class="action-button ${variantClass}"
        data-dialog-choice="${escapeHtml(choice.value)}"
      >
        ${escapeHtml(choice.label)}
      </button>
    `;
  }).join("");

  dialogOpenedOverModal = Boolean(getOpenModalExcept("confirm-modal"));
  if (!dialogOpenedOverModal) {
    modalScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${modalScrollY}px`;
  }
  elements.confirmModal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    if (inputLabel) {
      elements.confirmModalInput?.focus();
      elements.confirmModalInput?.select();
    } else {
      elements.confirmModalActions?.querySelector("[data-dialog-choice]")?.focus();
    }
  }, 0);

  return new Promise((resolve) => {
    activeDialogResolver = resolve;
  });
}

async function showAtlasConfirm(message, {
  title = t("dialog_default_title"),
  confirmLabel = t("confirm_button"),
  cancelLabel = t("cancel_button"),
  danger = false,
} = {}) {
  const result = await showAtlasDialog({
    title,
    message,
    choices: [
      { value: "cancel", label: cancelLabel, variant: "ghost" },
      { value: "confirm", label: confirmLabel, variant: danger ? "danger" : "primary" },
    ],
  });
  return result?.choice === "confirm";
}

async function showAtlasPrompt(message, {
  title = t("dialog_default_title"),
  inputLabel = t("dialog_input_label"),
  inputValue = "",
  inputPlaceholder = "",
  confirmLabel = t("confirm_button"),
  cancelLabel = t("cancel_button"),
  danger = false,
} = {}) {
  const result = await showAtlasDialog({
    title,
    message,
    inputLabel,
    inputValue,
    inputPlaceholder,
    choices: [
      { value: "cancel", label: cancelLabel, variant: "ghost" },
      { value: "confirm", label: confirmLabel, variant: danger ? "danger" : "primary" },
    ],
  });
  return result?.choice === "confirm" ? result.inputValue : null;
}

async function showAtlasChoice(message, {
  title = t("dialog_default_title"),
  choices = [],
} = {}) {
  const result = await showAtlasDialog({ title, message, choices });
  return result?.choice || null;
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
  if (!event.target.closest(".select-field--limited") && !event.target.closest(".select-limited-list")) {
    closeLimitedSelect();
  }

  if (!event.target.closest(".field-help-button") && !event.target.closest(".field-help-popover")) {
    hideFieldHelp(true);
  }

  if (!event.target.closest(".topology-graph-node") && !event.target.closest(".topology-node-popover")) {
    hideTopologyNodePopover();
  }

  if (elements.userMenuDropdown && !elements.userMenuDropdown.hidden && !event.target.closest("#hero-account-menu")) {
    closeUserMenu();
  }
}

function openSettingsModal(sectionName = activeSettingsSection) {
  if (sectionName === "automation" || sectionName === "discovery" || sectionName === "integrations") {
    openIntegrationsModal(sectionName === "integrations" ? "automation" : sectionName);
    return;
  }
  clearDiscoveryAgentConfig();
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
  updateNavigationHash("settings");
}

function openIntegrationsModal(sectionName = activeIntegrationsSection) {
  clearDiscoveryAgentConfig();
  syncSettingsForm();
  setServerSettingsStatus(t("ping_server_running", {
    interval: state.settings?.scanIntervalSeconds || 90,
  }), "muted");
  setActiveIntegrationsSection(sectionName);
  openModal("integrations-modal");
  updateNavigationHash("integrations");
}

function applyAuthSession(session) {
  const previousUserId = state.auth?.user?.id || "";
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
  const nextUserId = state.auth?.user?.id || "";
  if (previousUserId !== nextUserId) {
    resetTopologyState({ clearCanvas: true });
  }

  if (session?.bootstrapLoginHint) {
    elements.bootstrapHint.hidden = false;
    elements.bootstrapHint.textContent = t("bootstrap_login_hint", {
      username: session.bootstrapLoginHint.username,
      password: session.bootstrapLoginHint.password,
    });
  } else {
    elements.bootstrapHint.hidden = true;
  }

  syncCurrentUserChrome();
}

function syncCurrentUserChrome() {
  const currentUser = state.auth?.user;
  const userBadge = currentUser?.displayName || currentUser?.username || t("role_summary_guest");
  const userRoleLabel = currentUser?.role ? t(`role_summary_${currentUser.role}`) : t("role_summary_guest");

  if (elements.currentUserBadge) {
    elements.currentUserBadge.textContent = userBadge;
    elements.currentUserBadge.title = currentUser?.username
      ? [currentUser.displayName, currentUser.username].filter(Boolean).join(" · ")
      : "";
  }
  if (elements.currentUserDisplay) {
    elements.currentUserDisplay.value = currentUser?.username || "";
  }
  if (elements.currentUserNameInput) {
    elements.currentUserNameInput.value = currentUser?.displayName || "";
  }
  if (elements.userMenuNote) {
    elements.userMenuNote.textContent = currentUser?.mustChangePassword
      ? t("must_change_password_note")
      : t("user_menu_note", { role: userRoleLabel });
  }
  if (elements.currentUserRoleNote) {
    elements.currentUserRoleNote.textContent = currentUser?.mustChangePassword
      ? t("must_change_password_note")
      : t("current_role_note", { role: userRoleLabel });
  }
}

function applyPreferences(nextPreferences) {
  preferences.settings = nextPreferences.settings;
  preferences.customGroupTemplates = nextPreferences.customGroupTemplates;
  preferences.customDeviceTypes = nextPreferences.customDeviceTypes;
  preferences.customDeviceSources = nextPreferences.customDeviceSources;
  persistCachedInterfaceSettings(preferences.settings);
  rebuildEffectiveGroupSuggestionTemplates();
  applyVisualSettings();
  applyLocalizedUi();
  renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
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
    customDeviceSources: preferences.customDeviceSources,
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
  if (elements.clearHistoryButton) {
    elements.clearHistoryButton.disabled = !isAdmin;
  }
  elements.saveTemplateSettingsButton.disabled = !state.auth?.authenticated;
  elements.resetTemplateSettingsButton.disabled = !state.auth?.authenticated;
  elements.saveDeviceTypeSettingsButton.disabled = !state.auth?.authenticated;
  elements.resetDeviceTypeSettingsButton.disabled = !state.auth?.authenticated;
  if (elements.saveDeviceSourceSettingsButton) {
    elements.saveDeviceSourceSettingsButton.disabled = !state.auth?.authenticated;
  }
  if (elements.resetDeviceSourceSettingsButton) {
    elements.resetDeviceSourceSettingsButton.disabled = !state.auth?.authenticated;
  }
  if (elements.addCustomDeviceTypeButton) {
    elements.addCustomDeviceTypeButton.disabled = !state.auth?.authenticated;
  }
  if (elements.addCustomDeviceSourceButton) {
    elements.addCustomDeviceSourceButton.disabled = !state.auth?.authenticated;
  }
  if (elements.addTemplateRuleButton) {
    elements.addTemplateRuleButton.disabled = !state.auth?.authenticated;
  }
  if (elements.discoveryAgentForm) {
    [...elements.discoveryAgentForm.elements].forEach((control) => {
      control.disabled = !isAdmin;
    });
  }
  if (elements.resetDiscoveryAgentFormButton) {
    elements.resetDiscoveryAgentFormButton.disabled = !isAdmin;
  }
  if (elements.copyDiscoveryAgentConfigButton) {
    elements.copyDiscoveryAgentConfigButton.disabled = !isAdmin || !lastDiscoveryAgentConfig;
  }
  [
    elements.discoveryPolicyStoreRuntime,
    elements.discoveryPolicyStoreLabels,
    elements.discoveryPolicyStoreNetwork,
    elements.discoveryPolicyStoreRaw,
    elements.discoveryPolicyShowPreview,
    elements.discoveryPolicyAutoReplaceDocker,
    elements.saveDiscoveryPolicyButton,
    elements.discoveryAgentPolicyUseDefault,
    elements.discoveryAgentPolicyStoreRuntime,
    elements.discoveryAgentPolicyStoreLabels,
    elements.discoveryAgentPolicyStoreNetwork,
    elements.discoveryAgentPolicyStoreRaw,
    elements.discoveryAgentPolicyShowPreview,
    elements.saveDiscoveryAgentPolicyButton,
  ].forEach((control) => {
    if (control) {
      control.disabled = !isAdmin;
    }
  });
  syncDiscoveryPolicyControls();
  syncDiscoveryAgentPolicyControls();

  elements.adminPanels.forEach((panel) => {
    panel.hidden = !isAdmin;
  });

  setActiveSettingsSection(activeSettingsSection);
  setActiveIntegrationsSection(activeIntegrationsSection);
}

function renderAdminPanels() {
  const preserveAccessGroupForm = shouldPreserveOpenForm(elements.accessGroupForm);
  const preserveUserForm = shouldPreserveOpenForm(elements.userForm);
  const preserveDiscoveryAgentForm = shouldPreserveOpenForm(elements.discoveryAgentForm);

  if (!editingAccessGroupId && !preserveAccessGroupForm) {
    prepareAccessGroupForm();
  }
  if (!editingUserId && !preserveUserForm) {
    prepareUserForm();
  }
  if (!editingDiscoveryAgentId && !preserveDiscoveryAgentForm) {
    prepareDiscoveryAgentForm();
  } else if (!preserveDiscoveryAgentForm) {
    renderDiscoveryAgentFormOptions();
  }
  renderAccessGroupsTable();
  renderUsersTable();
  if (!isDiscoveryDataPolicyDirty()) {
    renderDiscoveryDataPolicySettings();
  } else {
    syncDiscoveryPolicyControls();
  }
  if (editingDiscoveryAgentPolicyId) {
    const policyAgent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === editingDiscoveryAgentPolicyId);
    if (!policyAgent) {
      hideDiscoveryAgentPolicyEditor();
    } else if (!isDiscoveryAgentPolicyDirty()) {
      prepareDiscoveryAgentPolicyEditor(policyAgent);
    } else {
      syncDiscoveryAgentPolicyControls();
    }
  }
  renderDiscoveryAgentsTable();
  renderDiscoveryPreview();
  renderDiscoveryAudit();
  renderDiscoveryDebug();
  if (!preserveUserForm) {
    const editingUser = editingUserId
      ? (state.admin?.users || []).find((entry) => entry.id === editingUserId) || null
      : null;
    renderUserAccessGroupOptions(editingUser?.accessGroupIds || []);
  }
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
  if (activeSettingsSection === "administration") {
    setActiveAdminSection(activeAdminSection);
  }
  if (activeSettingsSection === "discovery") {
    setActiveDiscoverySection(activeDiscoverySection);
  }
  updateNavigationHash();
}

function setActiveAdminSection(sectionName) {
  const isAdmin = Boolean(state.auth?.capabilities?.isAdmin);
  const allowedSections = ["access", "import", "export", "maintenance"];
  const resolvedSection = allowedSections.includes(sectionName) ? sectionName : "access";
  activeAdminSection = resolvedSection;

  elements.adminTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === activeAdminSection);
    button.setAttribute("aria-selected", button.dataset.adminTab === activeAdminSection ? "true" : "false");
    button.hidden = !isAdmin;
  });

  elements.adminContentPanels.forEach((panel) => {
    panel.hidden = !isAdmin || panel.dataset.adminPanel !== activeAdminSection;
  });
  updateNavigationHash();
}

function setActiveIntegrationsSection(sectionName) {
  const isAdmin = Boolean(state.auth?.capabilities?.isAdmin);
  const allowedSections = ["automation", "discovery", "snmp", "push"];
  const requestedSection = allowedSections.includes(sectionName) ? sectionName : "automation";
  const resolvedSection = requestedSection === "discovery" && !isAdmin ? "automation" : requestedSection;
  activeIntegrationsSection = resolvedSection;

  elements.integrationsNavButtons.forEach((button) => {
    const isAdminOnly = button.classList.contains("admin-only");
    if (isAdminOnly && !isAdmin) {
      button.hidden = true;
      button.classList.remove("is-active");
      return;
    }

    button.hidden = false;
    button.classList.toggle("is-active", button.dataset.integrationsTab === activeIntegrationsSection);
  });

  elements.integrationsSections.forEach((section) => {
    const sectionNameForNode = section.dataset.integrationsSection;
    const isAdminOnly = section.classList.contains("admin-only");
    const isActive = sectionNameForNode === activeIntegrationsSection;
    section.hidden = isAdminOnly ? !isAdmin || !isActive : !isActive;
  });

  if (activeIntegrationsSection === "discovery") {
    setActiveDiscoverySection(activeDiscoverySection);
  }
  updateNavigationHash();
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
  updateNavigationHash();
}

function setActiveDiscoverySection(sectionName) {
  const allowedSections = ["agents", "received", "audit", "debug"];
  const resolvedSection = allowedSections.includes(sectionName) ? sectionName : "agents";
  activeDiscoverySection = resolvedSection;

  elements.discoveryTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.discoveryTab === activeDiscoverySection);
    button.setAttribute("aria-selected", button.dataset.discoveryTab === activeDiscoverySection ? "true" : "false");
  });

  elements.discoveryPanels.forEach((panel) => {
    panel.hidden = panel.dataset.discoveryPanel !== activeDiscoverySection;
  });
  updateNavigationHash();
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape") {
    closeLimitedSelect();
    hideFieldHelp(true);
  }
  if (event.key === "Escape" && elements.confirmModal && !elements.confirmModal.hidden) {
    closeModal("confirm-modal");
    return;
  }
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

  syncRegistrySections();
  updateNavigationHash();
  if (activeView === "map") {
    ensureTopologyMapReady();
  }
}

function setActiveRegistrySection(sectionName) {
  activeRegistrySection = ["subnets", "groups", "devices", "services"].includes(sectionName)
    ? sectionName
    : "subnets";
  syncRegistrySections();
  updateNavigationHash();
}

function getRegistryFilterMode() {
  const searchTerm = normalizeSearch(elements.searchInput?.value || "");
  const quickFilter = elements.deviceFilterSelect?.value || "all";
  const groupFilter = elements.deviceGroupFilterSelect?.value || "";
  return {
    searchTerm,
    quickFilter,
    groupFilter,
    isFocused: Boolean(searchTerm || quickFilter !== "all" || groupFilter),
  };
}

function getFocusedRegistrySections({ quickFilter, groupFilter, searchTerm }) {
  if (quickFilter === "services" || ["status-running", "status-offline"].includes(quickFilter)) {
    return new Set(["services"]);
  }
  if (quickFilter === "status-stale") {
    return new Set(["devices", "services"]);
  }
  if (
    quickFilter === "devices" ||
    groupFilter ||
    ["conflicts", "no-subnet", "outside-pool"].includes(quickFilter)
  ) {
    return new Set(["devices"]);
  }
  if (quickFilter === "orphan-host" || quickFilter.startsWith("source-") || searchTerm) {
    return new Set(["devices", "services"]);
  }
  return new Set([activeRegistrySection]);
}

function syncRegistrySections() {
  if (!elements.registrySections.length) {
    return;
  }

  const filterMode = getRegistryFilterMode();
  const visibleSections = filterMode.isFocused
    ? getFocusedRegistrySections(filterMode)
    : new Set([activeRegistrySection]);

  elements.registrySectionTabs.forEach((button) => {
    const sectionName = button.dataset.registrySectionTab;
    button.classList.toggle("is-active", !filterMode.isFocused && sectionName === activeRegistrySection);
    button.setAttribute("aria-selected", !filterMode.isFocused && sectionName === activeRegistrySection ? "true" : "false");
  });

  elements.registrySections.forEach((section) => {
    section.hidden = !visibleSections.has(section.dataset.registrySection);
  });
}

function mergeRefreshOptions(currentOptions, nextOptions) {
  if (!currentOptions) {
    return nextOptions;
  }
  return {
    silent: Boolean(currentOptions.silent && nextOptions.silent),
    forceRender: Boolean(currentOptions.forceRender || nextOptions.forceRender),
  };
}

function isPageHidden() {
  return document.visibilityState === "hidden";
}

function markHiddenRefreshPending() {
  if (state.auth?.authenticated || isAuthReady) {
    hiddenRefreshPending = true;
  }
}

function forceResumePaint() {
  if (isPageHidden()) {
    return;
  }
  if (resumePaintFrame) {
    window.cancelAnimationFrame?.(resumePaintFrame);
    resumePaintFrame = 0;
  }
  document.body.classList.add("page-resuming");
  const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  resumePaintFrame = scheduleFrame(() => {
    resumePaintFrame = 0;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const activeViewElement = document.querySelector(".page-view.is-active");
    document.documentElement.getBoundingClientRect();
    document.body.getBoundingClientRect();
    activeViewElement?.getBoundingClientRect();
    const nudgeY = scrollY > 0 ? scrollY - 1 : scrollY + 1;
    window.scrollTo(scrollX, nudgeY);
    window.scrollTo(scrollX, scrollY);
    scheduleFrame(() => {
      document.body.classList.remove("page-resuming");
    });
  });
}

function scheduleResumeRefresh({ delay = 800, forceRender = false } = {}) {
  if (!state.auth?.authenticated || isPageHidden()) {
    return;
  }
  if (visibilityResumeTimer) {
    window.clearTimeout(visibilityResumeTimer);
  }
  const resumeDelay = Math.max(250, delay);
  visibilityResumeGraceUntil = Date.now() + resumeDelay;
  visibilityResumeTimer = window.setTimeout(() => {
    visibilityResumeTimer = null;
    visibilityResumeGraceUntil = 0;
    hiddenRefreshPending = false;
    void refreshState(true, forceRender);
  }, resumeDelay);
}

function handlePageResume() {
  if (isPageHidden()) {
    return;
  }
  forceResumePaint();
  scheduleResumeRefresh({ delay: hiddenRefreshPending ? 900 : 650 });
}

function handleVisibilityChange() {
  if (isPageHidden()) {
    markHiddenRefreshPending();
    if (refreshDebounceTimer) {
      window.clearTimeout(refreshDebounceTimer);
      refreshDebounceTimer = null;
      pendingRefreshOptions = null;
    }
    if (visibilityResumeTimer) {
      window.clearTimeout(visibilityResumeTimer);
      visibilityResumeTimer = null;
    }
    disconnectLiveStream();
    return;
  }

  if (state.auth?.authenticated) {
    connectLiveStream();
    handlePageResume();
  }
}

function scheduleStateRefresh({ silent = true, forceRender = false, delay = 150 } = {}) {
  if (isPageHidden() && isAuthReady) {
    markHiddenRefreshPending();
    return;
  }
  if (visibilityResumeGraceUntil > Date.now()) {
    delay = Math.max(delay, visibilityResumeGraceUntil - Date.now());
  }
  pendingRefreshOptions = mergeRefreshOptions(pendingRefreshOptions, { silent, forceRender });
  if (refreshDebounceTimer) {
    window.clearTimeout(refreshDebounceTimer);
  }
  refreshDebounceTimer = window.setTimeout(() => {
    const options = pendingRefreshOptions || { silent: true, forceRender: false };
    pendingRefreshOptions = null;
    refreshDebounceTimer = null;
    void refreshState(options.silent, options.forceRender);
  }, delay);
}

async function refreshState(silent = false, forceRender = false) {
  if (isPageHidden() && isAuthReady) {
    markHiddenRefreshPending();
    return false;
  }
  if (refreshDebounceTimer) {
    window.clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = null;
    pendingRefreshOptions = null;
  }
  if (refreshInFlight) {
    queuedRefreshOptions = mergeRefreshOptions(queuedRefreshOptions, { silent, forceRender });
    return refreshInFlight;
  }

  refreshInFlight = refreshStateInternal(silent, forceRender);
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
    if (queuedRefreshOptions) {
      const options = queuedRefreshOptions;
      queuedRefreshOptions = null;
      if (isPageHidden()) {
        markHiddenRefreshPending();
        return;
      }
      scheduleStateRefresh({ ...options, delay: 80 });
    }
  }
}

async function refreshStateInternal(silent = false, forceRender = false) {
  try {
    const snapshot = await apiRequest("/state");
    const normalizedSnapshot = normalizeState(snapshot);
    if (isPageHidden() && isAuthReady) {
      markHiddenRefreshPending();
      return true;
    }
    const shouldSkipFullRender =
      !forceRender &&
      isAuthReady &&
      normalizedSnapshot.meta.revision === state.meta.revision &&
      normalizedSnapshot.auth?.authenticated === state.auth?.authenticated &&
      normalizedSnapshot.auth?.user?.id === state.auth?.user?.id;

    if (shouldSkipFullRender) {
      state.auth = normalizedSnapshot.auth || state.auth;
      state.settings = normalizedSnapshot.settings;
      if (hasTimeSensitiveAvailabilityRecords()) {
        renderLiveData();
      }
      if (shouldRenderTopologyNow()) {
        ensureTopologyMapReady();
      }
      syncCurrentUserChrome();
      return true;
    }

    applyState(normalizedSnapshot);
    renderFormChrome();
    renderLiveData();
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

function getLiveRefreshDelay(event) {
  try {
    const payload = JSON.parse(event?.data || "{}");
    const eventType = String(payload?.type || "");
    if (eventType.startsWith("discovery-")) {
      return 900;
    }
  } catch {
    // Keep the default delay when the stream sends a non-JSON heartbeat.
  }
  return 250;
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

  eventSource.onmessage = (event) => {
    if (isPageHidden()) {
      markHiddenRefreshPending();
      return;
    }
    scheduleStateRefresh({ silent: true, delay: getLiveRefreshDelay(event) });
  };

  eventSource.onerror = () => {
    if (isPageHidden()) {
      markHiddenRefreshPending();
      return;
    }
    scheduleStateRefresh({ silent: true, delay: 1500 });
  };
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
  if (snapshot.topology) {
    state.topology = snapshot.topology;
    topologyLoaded = true;
    topologyLoadedRevision = Number(state.meta?.revision || 0);
    topologyLastDataSignature = getTopologyDataSignature(state.topology);
  }
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
        hostDeviceId: formData.get("hostDeviceId") || currentDevice?.hostDeviceId || "",
        source: formData.get("source") || currentDevice?.source || "",
        sourceKind: formData.get("sourceKind") || currentDevice?.sourceKind || "",
        sourceId: formData.get("sourceId") || currentDevice?.sourceId || "",
        integrationStatus: formData.get("integrationStatus") || currentDevice?.integrationStatus || "",
        integrationStatusChangedAt: currentDevice?.integrationStatusChangedAt || "",
        protocol: formData.get("protocol") || currentDevice?.protocol || "",
        serviceUrl: formData.get("serviceUrl") || currentDevice?.serviceUrl || "",
        ports: formData.get("ports") || currentDevice?.ports || "",
        lastSeenAt: formData.get("lastSeenAt") || currentDevice?.lastSeenAt || "",
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

async function handleServiceSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const formData = new FormData(form);
    const hostId = String(formData.get("hostDeviceId") || "").trim();
    const host = getInventoryDevices().find((entry) => entry.id === hostId);
    if (!host) {
      throw new Error(t("service_host_required"));
    }

    const currentService = editingServiceId
      ? state.devices.find((entry) => entry.id === editingServiceId) || null
      : null;
    const service = normalizeDevice(
      {
        id: currentService?.id || createId(),
        name: formData.get("name"),
        ip: host.ip,
        mac: "",
        type: "service",
        subnetId: host.subnetId || resolveDeviceSubnet(host)?.id || "",
        hostDeviceId: host.id,
        source: formData.get("source"),
        sourceKind: currentService?.sourceKind || "",
        sourceId: currentService?.sourceId || "",
        integrationStatus: formData.get("integrationStatus"),
        integrationStatusChangedAt: currentService?.integrationStatusChangedAt || "",
        protocol: formData.get("protocol") || "http",
        accessPort: formData.get("accessPort"),
        serviceUrl: formData.get("serviceUrl"),
        ports: formData.get("ports"),
        lastSeenAt: currentService?.lastSeenAt || "",
        note: formData.get("note"),
        createdAt: currentService?.createdAt || new Date().toISOString(),
      },
      state.subnets,
      state.groups
    );

    const isEditing = Boolean(editingServiceId);
    await apiRequest(isEditing ? `/devices/${encodeURIComponent(editingServiceId)}` : "/devices", {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(service),
    });

    form.reset();
    closeModal("service-modal");
    await refreshState(true, true);
    showToast(t(isEditing ? "service_updated" : "service_added", { name: service.name }));
  } catch (error) {
    setServiceFormStatus(error.message, "danger");
    showToast(error.message, true);
  }
}

function handleStatNavigation(target) {
  switch (target) {
    case "subnets":
      setActiveView("registry");
      setActiveRegistrySection("subnets");
      document.getElementById("registry-panel-subnets")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    case "devices":
    case "occupied":
      setActiveView("registry");
      setActiveRegistrySection("devices");
      revealRegistrySectionList("devices", { extraDown: 110 });
      return;
    case "services":
      setActiveView("registry");
      setActiveRegistrySection("services");
      revealRegistrySectionList("services", { extraDown: 110 });
      return;
    case "available":
      setActiveView("registry");
      setActiveRegistrySection("groups");
      document.getElementById("registry-panel-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    default:
      return;
  }
}

function handleRegistryDeviceFiltersChange() {
  renderDevicesTable();
  renderServicesList();
  syncRegistrySections();
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

async function handleDiscoveryAgentSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const isEditing = Boolean(editingDiscoveryAgentId);
  const selectedCollectors = getDiscoveryAgentSelectedCollectors();
  const payload = {
    name: formData.get("name"),
    kind: formData.get("kind"),
    enabled: Boolean(formData.get("enabled")),
    allowedCidrs: formData.get("allowedCidrs"),
    createMode: formData.get("createMode"),
    linkedHostDeviceId: formData.get("linkedHostDeviceId"),
  };
  if (!isEditing) {
    payload.sharedTokenAgentId = formData.get("sharedTokenAgentId");
  }

  try {
    const response = await apiRequest(
      isEditing ? `/admin/discovery/agents/${encodeURIComponent(editingDiscoveryAgentId)}` : "/admin/discovery/agents",
      {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );
    const savedAgent = response.agent || response;
    const token = response.token || "";
    editingDiscoveryAgentId = "";
    prepareDiscoveryAgentForm();
    await refreshState(true, true);
    if (token) {
      showDiscoveryAgentConfig(savedAgent, token, selectedCollectors);
      setDiscoveryAgentStatus(t("discovery_agent_created_with_token"), "ok");
    } else if (!isEditing && response.sharedTokenAgentId) {
      clearDiscoveryAgentConfig();
      setDiscoveryAgentStatus(t("discovery_agent_created_shared_token"), "ok");
    } else {
      clearDiscoveryAgentConfig();
      setDiscoveryAgentStatus(t(isEditing ? "discovery_agent_updated" : "discovery_agent_saved"), "ok");
    }
  } catch (error) {
    setDiscoveryAgentStatus(error.message, "danger");
  }
}

async function handleDiscoveryPolicySave() {
  try {
    const discoveryDataPolicy = getDiscoveryDataPolicyDraft();
    const discoveryReplacementPolicy = getDiscoveryReplacementPolicyDraft();
    const updatedSettings = await apiRequest("/settings", {
      method: "PATCH",
      body: JSON.stringify({ discoveryDataPolicy, discoveryReplacementPolicy }),
    });
    state.settings = normalizeServerSettings(updatedSettings, state.meta);
    renderDiscoveryDataPolicySettings();
    renderDiscoveryPreview();
    setDiscoveryPolicyStatus(t("discovery_policy_saved"), "ok");
  } catch (error) {
    setDiscoveryPolicyStatus(error.message, "danger");
  }
}

async function handleDiscoveryAgentPolicySave(event) {
  event.preventDefault();
  if (!editingDiscoveryAgentPolicyId) {
    return;
  }

  const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === editingDiscoveryAgentPolicyId);
  if (!agent) {
    hideDiscoveryAgentPolicyEditor();
    return;
  }

  try {
    const useDefault = Boolean(elements.discoveryAgentPolicyUseDefault?.checked);
    const updatedAgent = await apiRequest(
      `/admin/discovery/agents/${encodeURIComponent(agent.id)}/data-policy`,
      {
        method: "PATCH",
        body: JSON.stringify({
          useDefault,
          dataPolicy: useDefault ? null : getDiscoveryAgentPolicyDraft(),
        }),
      },
    );
    state.admin.discoveryAgents = (state.admin?.discoveryAgents || []).map((entry) => (
      entry.id === updatedAgent.id ? normalizeDiscoveryAgent(updatedAgent) : entry
    ));
    renderDiscoveryAgentsTable();
    prepareDiscoveryAgentPolicyEditor(normalizeDiscoveryAgent(updatedAgent));
    renderDiscoveryPreview();
    setDiscoveryAgentStatus(t("discovery_agent_policy_saved", { name: agent.name }), "ok");
  } catch (error) {
    setDiscoveryAgentStatus(error.message, "danger");
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

  const confirmed = await showAtlasConfirm(t("delete_access_group_confirm", { name: accessGroup.name }), {
    title: t("delete_confirm_title"),
    confirmLabel: t("delete_row"),
    danger: true,
  });
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
    const newPassword = await showAtlasPrompt(t("reset_password_prompt", { name: user.username }), {
      title: t("reset_password_title"),
      inputLabel: t("new_password_label"),
      confirmLabel: t("save_button"),
    });
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
    const confirmed = await showAtlasConfirm(
      t(nextIsActive ? "enable_user_confirm" : "disable_user_confirm", { name: user.username }),
      {
        title: t(nextIsActive ? "enable_user_title" : "disable_user_title"),
        confirmLabel: t(nextIsActive ? "enable_button" : "disable_button"),
        danger: !nextIsActive,
      },
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

  const deleteConfirmed = await showAtlasConfirm(t("delete_user_confirm", { name: deleteTarget.username }), {
    title: t("delete_confirm_title"),
    confirmLabel: t("delete_row"),
    danger: true,
  });
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

async function handleDiscoveryAgentTableActions(event) {
  const policyButton = event.target.closest("[data-edit-discovery-agent-policy]");
  if (policyButton) {
    const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === policyButton.dataset.editDiscoveryAgentPolicy);
    if (!agent) {
      return;
    }
    prepareDiscoveryAgentPolicyEditor(agent);
    elements.discoveryAgentPolicyForm?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  const editButton = event.target.closest("[data-edit-discovery-agent]");
  if (editButton) {
    const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === editButton.dataset.editDiscoveryAgent);
    if (!agent) {
      return;
    }
    clearDiscoveryAgentConfig();
    prepareDiscoveryAgentForm(agent);
    elements.discoveryAgentForm?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-discovery-agent]");
  if (toggleButton) {
    const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === toggleButton.dataset.toggleDiscoveryAgent);
    if (!agent) {
      return;
    }
    const nextEnabled = !agent.enabled;
    const confirmed = await showAtlasConfirm(
      t(nextEnabled ? "discovery_agent_enable_confirm" : "discovery_agent_disable_confirm", { name: agent.name }),
      {
        title: t(nextEnabled ? "discovery_agent_enable_title" : "discovery_agent_disable_title"),
        confirmLabel: t(nextEnabled ? "discovery_agent_enable_button" : "discovery_agent_disable_button"),
        danger: !nextEnabled,
      },
    );
    if (!confirmed) {
      return;
    }
    try {
      await apiRequest(`/admin/discovery/agents/${encodeURIComponent(agent.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: agent.name,
          kind: agent.kind,
          enabled: nextEnabled,
          allowedCidrs: agent.allowedCidrs || [],
          createMode: agent.createMode,
          linkedHostDeviceId: agent.linkedHostDeviceId || "",
        }),
      });
      await refreshState(true, true);
      setDiscoveryAgentStatus(t(nextEnabled ? "discovery_agent_enabled_done" : "discovery_agent_disabled_done", { name: agent.name }), "ok");
    } catch (error) {
      setDiscoveryAgentStatus(error.message, "danger");
    }
    return;
  }

  const rotateButton = event.target.closest("[data-rotate-discovery-agent-token]");
  if (rotateButton) {
    const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === rotateButton.dataset.rotateDiscoveryAgentToken);
    if (!agent) {
      return;
    }
    const confirmed = await showAtlasConfirm(t("discovery_agent_rotate_token_confirm", { name: agent.name }), {
      title: t("discovery_agent_rotate_token_title"),
      confirmLabel: t("discovery_agent_rotate_token_button"),
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/admin/discovery/agents/${encodeURIComponent(agent.id)}/rotate-token`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refreshState(true, true);
      showDiscoveryAgentConfig(response.agent || agent, response.token || "");
      setDiscoveryAgentStatus(t("discovery_agent_token_rotated"), "ok");
    } catch (error) {
      setDiscoveryAgentStatus(error.message, "danger");
    }
    return;
  }

  const revokeButton = event.target.closest("[data-revoke-discovery-agent-token]");
  if (revokeButton) {
    const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === revokeButton.dataset.revokeDiscoveryAgentToken);
    if (!agent) {
      return;
    }
    const confirmed = await showAtlasConfirm(t("discovery_agent_revoke_token_confirm", { name: agent.name }), {
      title: t("discovery_agent_revoke_token_title"),
      confirmLabel: t("discovery_agent_revoke_token_button"),
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await apiRequest(`/admin/discovery/agents/${encodeURIComponent(agent.id)}/revoke-token`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      clearDiscoveryAgentConfig();
      await refreshState(true, true);
      setDiscoveryAgentStatus(t("discovery_agent_token_revoked", { name: agent.name }), "ok");
    } catch (error) {
      setDiscoveryAgentStatus(error.message, "danger");
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-discovery-agent]");
  if (deleteButton) {
    const agent = (state.admin?.discoveryAgents || []).find((entry) => entry.id === deleteButton.dataset.deleteDiscoveryAgent);
    if (!agent) {
      return;
    }
    const choice = await showAtlasChoice(t("discovery_agent_delete_confirm", { name: agent.name }), {
      title: t("discovery_agent_delete_title"),
      choices: [
        { value: "cancel", label: t("cancel_button"), variant: "ghost" },
        { value: "agent", label: t("discovery_agent_delete_only_button"), variant: "danger" },
        { value: "related", label: t("discovery_agent_delete_related_button"), variant: "danger" },
      ],
    });
    if (!choice || choice === "cancel") {
      return;
    }
    try {
      const query = choice === "related" ? "?mode=with_related" : "";
      const result = await apiRequest(`/admin/discovery/agents/${encodeURIComponent(agent.id)}${query}`, {
        method: "DELETE",
      });
      if (editingDiscoveryAgentId === agent.id) {
        prepareDiscoveryAgentForm();
      }
      if (editingDiscoveryAgentPolicyId === agent.id) {
        hideDiscoveryAgentPolicyEditor();
      }
      clearDiscoveryAgentConfig();
      await refreshState(true, true);
      setDiscoveryAgentStatus(
        choice === "related"
          ? t("discovery_agent_deleted_with_related", { name: agent.name, count: result?.deletedRelatedRecords || 0 })
          : t("discovery_agent_deleted", { name: agent.name }),
        "ok",
      );
    } catch (error) {
      setDiscoveryAgentStatus(error.message, "danger");
    }
  }
}

function copyDiscoveryAgentConfig() {
  const configText = elements.discoveryAgentConfigSnippet?.value || lastDiscoveryAgentConfig;
  if (!configText) {
    showToast(t("discovery_agent_config_empty"), true);
    return;
  }
  if (!navigator.clipboard?.writeText) {
    showToast(t("discovery_agent_config_copy_failed"), true);
    return;
  }
  navigator.clipboard.writeText(configText)
    .then(() => showToast(t("discovery_agent_config_copied")))
    .catch(() => showToast(t("discovery_agent_config_copy_failed"), true));
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
  const device = getInventoryDevices().find((entry) => entry.ip === normalizedIp);
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
    getInventoryDevices()
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
}

function getTopologyExportPayload() {
  const filteredTopology = getFilteredTopology();
  return {
    kind: "atlas-topology-map",
    schema: state.topology?.schema || "atlas.topology.v1",
    exportedAt: new Date().toISOString(),
    mode: topologyMode,
    filters: {
      subnet: topologySubnetFilter,
      layer: topologyLayerFilter,
      source: topologySourceFilter,
      status: topologyStatusFilter,
    },
    nodes: filteredTopology.nodes,
    links: filteredTopology.links,
    interfaces: filteredTopology.interfaces,
    subnets: filteredTopology.subnets,
    capabilities: state.topology?.capabilities || { advancedMode: false, layers: {} },
  };
}

function getTopologyStandaloneSvgText() {
  const svg = elements.topologyMapCanvas?.querySelector(".topology-graph-svg");
  if (!svg) {
    throw new Error(t("topology_export_empty"));
  }
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("version", "1.1");
  clone.removeAttribute("style");
  const viewBox = clone.getAttribute("viewBox") || "";
  const [, , viewBoxWidth, viewBoxHeight] = viewBox.split(/\s+/).map(Number);
  if (viewBoxWidth && viewBoxHeight) {
    clone.setAttribute("width", String(Math.ceil(viewBoxWidth)));
    clone.setAttribute("height", String(Math.ceil(viewBoxHeight)));
  }

  const computed = getComputedStyle(document.body);
  const variables = Array.from(computed)
    .filter((name) => name.startsWith("--"))
    .map((name) => `${name}: ${computed.getPropertyValue(name).trim()};`)
    .join("\n");
  const topologyRules = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules || []).forEach((rule) => {
        const cssText = rule.cssText || "";
        if (
          cssText.includes("topology-graph")
          || cssText.includes("topology-arrow")
          || cssText.includes("--topology-service-accent")
        ) {
          topologyRules.push(cssText);
        }
      });
    } catch {
      // Ignore stylesheets the browser refuses to expose.
    }
  });

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .topology-graph-svg {
      ${variables}
      color: ${computed.color};
      background: ${computed.getPropertyValue("--bg-bottom").trim() || "#070a11"};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    ${topologyRules.join("\n")}
  `;
  clone.insertBefore(style, clone.firstChild);

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", String(viewBoxWidth || "100%"));
  background.setAttribute("height", String(viewBoxHeight || "100%"));
  background.setAttribute("fill", computed.getPropertyValue("--bg-bottom").trim() || "#070a11");
  clone.insertBefore(background, style.nextSibling);

  const serializer = new XMLSerializer();
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
}

function exportTopologySvg() {
  try {
    downloadFile(
      `atlas-topology-${timestampForFile()}.svg`,
      getTopologyStandaloneSvgText(),
      "image/svg+xml;charset=utf-8"
    );
    showToast(t("topology_export_svg_done"));
  } catch (error) {
    showToast(error.message || t("topology_export_failed"), true);
  }
}

async function exportTopologyPng() {
  try {
    const svgText = getTopologyStandaloneSvgText();
    const svg = elements.topologyMapCanvas?.querySelector(".topology-graph-svg");
    const viewBox = svg?.getAttribute("viewBox") || "";
    const [, , rawWidth, rawHeight] = viewBox.split(/\s+/).map(Number);
    const width = Math.max(1, Math.ceil(rawWidth || 1600));
    const height = Math.max(1, Math.ceil(rawHeight || 1000));
    const scale = Math.min(2, 4096 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(t("topology_export_failed"));
    }
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      if (image.decode) {
        await image.decode();
      } else {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    } finally {
      URL.revokeObjectURL(url);
    }
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
        } else {
          reject(new Error(t("topology_export_failed")));
        }
      }, "image/png");
    });
    downloadBlob(`atlas-topology-${timestampForFile()}.png`, pngBlob);
    showToast(t("topology_export_png_done"));
  } catch (error) {
    showToast(error.message || t("topology_export_failed"), true);
  }
}

function exportTopologyJson() {
  downloadFile(
    `atlas-topology-${timestampForFile()}.json`,
    JSON.stringify(getTopologyExportPayload(), null, 2),
    "application/json"
  );
  showToast(t("topology_export_json_done"));
}

async function exportBackup() {
  const include = {
    inventory: Boolean(elements.backupIncludeInventory?.checked),
    activity: Boolean(elements.backupIncludeActivity?.checked),
    system: Boolean(elements.backupIncludeSystem?.checked),
    access: Boolean(elements.backupIncludeAccess?.checked),
    preferences: Boolean(elements.backupIncludePreferences?.checked),
    discovery: Boolean(elements.backupIncludeDiscovery?.checked),
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
      const host = resolveDeviceHost(device);
      const pingState = getPingState(device.ip);
      return {
        [t("export_header_name")]: device.name,
        [t("export_header_ip")]: device.ip,
        [t("export_header_mac")]: device.mac || "",
        [t("export_header_type")]: device.type || device.unknownType || "",
        [t("export_header_host")]: host?.name || "",
        [t("export_header_source")]: getDeviceSourceLabel(device.source || ""),
        [t("export_header_source_kind")]: device.sourceKind
          ? getDeviceSourceKindLabel(device.sourceKind)
          : "",
        [t("export_header_source_id")]: device.sourceId || "",
        [t("export_header_integration_status")]: device.integrationStatus
          ? getIntegrationStatusLabel(device.integrationStatus)
          : "",
        [t("export_header_protocol")]: device.protocol ? getServiceProtocolLabel(device.protocol) : "",
        [t("export_header_service_url")]: device.serviceUrl || "",
        [t("export_header_access_port")]: device.accessPort || "",
        [t("export_header_ports")]: device.ports || "",
        [t("export_header_last_seen")]: device.lastSeenAt || "",
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
      const confirmed = await showAtlasConfirm(t("backup_import_confirm"), {
        title: t("backup_import_title"),
        confirmLabel: t("import_button"),
        danger: true,
      });
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
      if (Number(result?.discoveryAgentsNeedTokens || 0) > 0) {
        showToast(t("backup_import_discovery_tokens", { count: result.discoveryAgentsNeedTokens }), true);
      }
    } else {
      const importChoice = await showAtlasChoice(t("import_confirm_replace"), {
        title: t("import_mode_title"),
        choices: [
          { value: "cancel", label: t("cancel_button"), variant: "ghost" },
          { value: "merge", label: t("import_merge_button"), variant: "primary" },
          { value: "replace", label: t("import_replace_button"), variant: "danger" },
        ],
      });
      if (!importChoice || importChoice === "cancel") {
        return;
      }
      const shouldReplace = importChoice === "replace";

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
      const hostDevice = findDeviceHostByReference(row, targetState.devices);
      return normalizeDevice(
        {
          id: row.id || existingDevice?.id || createId(),
          name: row.name,
          ip: row.ip,
          mac: row.mac,
          type: row.type,
          subnetId: subnet?.id || row.subnet_id || "",
          hostDeviceId: hostDevice?.id || row.host_device_id || row.hostDeviceId || "",
          source: row.source,
          sourceKind: row.source_kind || row.sourceKind,
          sourceId: row.source_id || row.sourceId,
          integrationStatus: row.integration_status || row.integrationStatus || row.status,
          integrationStatusChangedAt: row.integration_status_changed_at || row.integrationStatusChangedAt,
          protocol: row.protocol,
          serviceUrl: row.service_url || row.serviceUrl || row.url,
          accessPort: row.access_port || row.accessPort || row.access,
          ports: row.ports,
          lastSeenAt: row.last_seen_at || row.lastSeenAt,
          note: row.note,
        },
        targetState.subnets
      );
    });

    targetState.devices = replace ? importedDevices : mergeById(targetState.devices, importedDevices);
  }
}

async function clearAllData() {
  const confirmed = await showAtlasConfirm(t("clear_confirm"), {
    title: t("clear_database_title"),
    confirmLabel: t("clear_database_continue_button"),
    danger: true,
  });
  if (!confirmed) {
    return;
  }
  const typedConfirmation = await showAtlasPrompt(t("clear_database_prompt"), {
    title: t("clear_database_title"),
    inputLabel: t("clear_database_input_label"),
    inputPlaceholder: "DELETE",
    confirmLabel: t("clear_database_button"),
    danger: true,
  });
  if (typedConfirmation !== "DELETE") {
    showToast(t("clear_database_cancelled"), true);
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

async function clearHistory() {
  const confirmed = await showAtlasConfirm(t("clear_history_confirm"), {
    title: t("clear_history_title"),
    confirmLabel: t("clear_history_button"),
    danger: true,
  });
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest("/admin/history", {
      method: "DELETE",
    });
    await refreshState(true, true);
    showToast(t("clear_history_success"));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleSubnetTableActions(event) {
  const toggleButton = event.target.closest("[data-toggle-subnets-list]");
  if (toggleButton) {
    showAllSubnetsInRegistry = !showAllSubnetsInRegistry;
    renderSubnetsTable();
    revealRegistrySectionList("subnets");
    return;
  }

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

  const linkedDevices = getInventoryDevices().filter((entry) => entry.subnetId === subnetId).length;
  const linkedGroups = state.groups.filter((entry) => entry.subnetId === subnetId).length;
  const confirmed = await showAtlasConfirm(
    t("delete_subnet_confirm", {
      name: subnet.name,
      devices: linkedDevices,
      groups: linkedGroups,
    }),
    {
      title: t("delete_confirm_title"),
      confirmLabel: t("delete_row"),
      danger: true,
    },
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/subnets/${encodeURIComponent(subnetId)}`, {
      method: "DELETE",
    });
    await refreshState(true, true);
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
  const toggleListButton = event.target.closest("[data-toggle-groups-list]");
  if (toggleListButton) {
    showAllGroupsInRegistry = !showAllGroupsInRegistry;
    renderGroupsTable();
    revealRegistrySectionList("groups");
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-group-devices]");
  if (toggleButton) {
    const groupId = toggleButton.dataset.toggleGroupDevices;
    const willExpand = !expandedGroupIds.has(groupId);
    if (!willExpand) {
      expandedGroupIds.delete(groupId);
    } else {
      expandedGroupIds.add(groupId);
    }
    renderGroupsTable();
    if (willExpand) {
      revealExpandedContent(() => document.querySelector(`[data-expanded-group-devices="${cssEscape(groupId)}"]`));
    }
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

  const confirmed = await showAtlasConfirm(t("delete_group_confirm", { name: group.name }), {
    title: t("delete_confirm_title"),
    confirmLabel: t("delete_row"),
    danger: true,
  });
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/groups/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    });
    await refreshState(true, true);
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
    revealRegistrySectionList("devices");
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

  const discoveryButton = event.target.closest("[data-toggle-device-discovery]");
  if (discoveryButton) {
    const deviceId = discoveryButton.dataset.toggleDeviceDiscovery || "";
    const device = state.devices.find((entry) => entry.id === deviceId && entry.type !== "service");
    const key = getRegistryDiscoveryKey(device);
    if (!key) {
      return;
    }

    const willExpand = !expandedRegistryDiscoveryKeys.has(key);
    if (willExpand) {
      expandedRegistryDiscoveryKeys.add(key);
    } else {
      expandedRegistryDiscoveryKeys.delete(key);
    }
    renderDevicesTable();
    if (willExpand) {
      revealExpandedContent(
        () => document.querySelector(`[data-expanded-registry-discovery="${cssEscape(key)}"]`),
        { extraDown: 130 },
      );
    }
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

  const confirmed = await showAtlasConfirm(t("delete_device_confirm", { name: device.name }), {
    title: t("delete_confirm_title"),
    confirmLabel: t("delete_row"),
    danger: true,
  });
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
    await refreshState(true, true);
    showToast(t("device_deleted", { name: device.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleServiceListActions(event) {
  const toggleButton = event.target.closest("[data-toggle-services-list]");
  if (toggleButton) {
    showAllServicesInRegistry = !showAllServicesInRegistry;
    renderServicesList();
    revealRegistrySectionList("services");
    return;
  }

  const discoveryButton = event.target.closest("[data-toggle-service-discovery]");
  if (discoveryButton) {
    const serviceId = discoveryButton.dataset.toggleServiceDiscovery || "";
    const service = state.devices.find((entry) => entry.id === serviceId && entry.type === "service");
    const key = getRegistryDiscoveryKey(service);
    if (!key) {
      return;
    }

    const willExpand = !expandedRegistryDiscoveryKeys.has(key);
    if (willExpand) {
      expandedRegistryDiscoveryKeys.add(key);
    } else {
      expandedRegistryDiscoveryKeys.delete(key);
    }
    renderServicesList();
    if (willExpand) {
      revealExpandedContent(
        () => document.querySelector(`[data-expanded-registry-discovery="${cssEscape(key)}"]`),
        { extraDown: 130 },
      );
    }
    return;
  }

  const copyPrivateUrlButton = event.target.closest("[data-copy-private-service-url]");
  const copyPublicUrlButton = event.target.closest("[data-copy-public-service-url]");
  if (copyPrivateUrlButton || copyPublicUrlButton) {
    const serviceId = copyPrivateUrlButton?.dataset.copyPrivateServiceUrl || copyPublicUrlButton?.dataset.copyPublicServiceUrl;
    const service = state.devices.find((entry) => entry.id === serviceId);
    const url = service
      ? copyPublicUrlButton
        ? getPublicServiceUrl(service)
        : buildPrivateServiceUrl(service)
      : "";
    if (!url) {
      showToast(t("service_url_unavailable"), true);
      return;
    }
    if (!navigator.clipboard?.writeText) {
      showToast(t("copy_service_url_failed"), true);
      return;
    }
    navigator.clipboard.writeText(url)
      .then(() => showToast(t("copy_service_url_done", { url })))
      .catch(() => showToast(t("copy_service_url_failed"), true));
    return;
  }

  const editButton = event.target.closest("[data-edit-service]");
  if (editButton) {
    const service = state.devices.find((entry) => entry.id === editButton.dataset.editService);
    if (!service) {
      return;
    }
    prepareServiceModal(service);
    openModal("service-modal");
    return;
  }

  const deleteButton = event.target.closest("[data-delete-service]");
  if (!deleteButton) {
    return;
  }

  const serviceId = deleteButton.dataset.deleteService;
  const service = state.devices.find((entry) => entry.id === serviceId);
  if (!service) {
    return;
  }

  const confirmed = await showAtlasConfirm(t("delete_service_confirm", { name: service.name }), {
    title: t("delete_confirm_title"),
    confirmLabel: t("delete_row"),
    danger: true,
  });
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/devices/${encodeURIComponent(serviceId)}`, {
      method: "DELETE",
    });
    await refreshState(true, true);
    showToast(t("service_deleted", { name: service.name }));
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderAll() {
  if (!isSettingsModalOpen()) {
    syncSettingsForm();
  }
  renderFormChrome();
  renderLiveData();
}

function renderFormChrome() {
  const preserveSubnetForm = shouldPreserveOpenForm(elements.subnetForm, "subnet-modal");
  const preserveGroupForm = shouldPreserveOpenForm(elements.groupForm, "group-modal");
  const preserveDeviceForm = shouldPreserveOpenForm(elements.deviceForm, "device-modal");
  const preserveServiceForm = shouldPreserveOpenForm(elements.serviceForm, "service-modal");
  const preserveNetworkSelectors = preserveSubnetForm || preserveGroupForm || preserveDeviceForm;

  if (!preserveNetworkSelectors) {
    renderSubnetOptions();
  }
  if (!preserveServiceForm) {
    renderServiceHostOptions(elements.serviceHostSelect?.value || "");
    renderServiceSourceOptions(elements.serviceForm?.elements.source?.value || "");
  }
  if (!preserveDeviceForm) {
    renderDeviceTypeOptions(elements.deviceTypeSelect?.value || "");
  }
  renderDeviceGroupFilterOptions();
  if (!preserveDeviceForm) {
    updateSuggestedIp();
  }
  renderPermissionAwareUi();
  if (isSettingsModalOpen()) {
    applyInterfaceDraft(collectInterfaceSettingsDraft());
  }
}

function shouldRenderTopologyNow() {
  if (activeView !== "map" || !elements.topologyMapCanvas) {
    return false;
  }
  return !elements.topologyMapCanvas.closest("[hidden]");
}

function resetTopologyState({ clearCanvas = false } = {}) {
  state.topology = normalizeTopology(null);
  topologyLoaded = false;
  topologyLoadedRevision = 0;
  topologyLastDataSignature = "";
  topologyPopoverNodeById = new Map();
  topologyPopoverInterfacesByNode = new Map();
  resetTopologyRenderCache();
  if (clearCanvas && elements.topologyMapCanvas) {
    elements.topologyMapCanvas.innerHTML = "";
  }
}

function renderTopologyLoadingState() {
  if (!elements.topologyMapCanvas || elements.topologyMapCanvas.dataset.topologyRenderSignature) {
    return;
  }
  elements.topologyMapCanvas.innerHTML = `
    <div class="result-card result-card--muted">${escapeHtml(t("topology_loading"))}</div>
  `;
}

function getTopologyDataSignature(topology) {
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const links = Array.isArray(topology.links) ? topology.links : [];
  const interfaces = Array.isArray(topology.interfaces) ? topology.interfaces : [];
  const capabilities = topology.capabilities && typeof topology.capabilities === "object" ? topology.capabilities : {};
  const nodeSignature = nodes.map((node) => {
    const metadata = node.metadata && typeof node.metadata === "object" ? node.metadata : {};
    return [
      node.id,
      node.kind,
      node.role,
      node.layer,
      node.label,
      node.status,
      node.ip,
      node.mac,
      node.source,
      node.subnetId,
      metadata.primaryIp,
      metadata.ports,
      metadata.accessPort,
      metadata.serviceUrl,
      metadata.hostSourceId,
      metadata.nodeName,
    ].map((value) => String(value || "")).join("~");
  }).join("|");
  const linkSignature = links.map((link) => [
    link.id,
    link.source,
    link.target,
    link.kind,
    link.confidence,
    link.graphSource,
  ].map((value) => String(value || "")).join("~")).join("|");
  return [
    topology.schema || "",
    Boolean(capabilities.advancedMode),
    JSON.stringify(capabilities.layers || {}),
    nodes.length,
    links.length,
    interfaces.length,
    nodeSignature,
    linkSignature,
  ].join("::");
}

function getTopologyRenderRequestSignature() {
  const topology = state.topology || {};
  return [
    state.auth?.user?.id || "",
    getLanguage(),
    topologyMode,
    topologySubnetFilter,
    topologyLayerFilter,
    topologySourceFilter,
    topologyStatusFilter,
    getTopologyDataSignature(topology),
    elements.topologyMapCanvas?.clientWidth || 0,
    Boolean(document.fullscreenElement),
  ].join("|");
}

function resetTopologyRenderCache() {
  topologyLastRenderRequestSignature = "";
  if (elements.topologyMapCanvas) {
    delete elements.topologyMapCanvas.dataset.topologyRenderSignature;
  }
}

async function refreshTopologySnapshot({ force = false, silent = true } = {}) {
  if (!state.auth?.authenticated) {
    return false;
  }
  const currentRevision = Number(state.meta?.revision || 0);
  if (!force && topologyLoaded && topologyLoadedRevision === currentRevision) {
    renderTopologyMapIfVisible();
    return true;
  }
  if (topologyLoadInFlight) {
    return topologyLoadInFlight;
  }

  topologyLoadInFlight = (async () => {
    try {
      const topology = normalizeTopology(await apiRequest("/topology"));
      const nextSignature = getTopologyDataSignature(topology);
      const changed = nextSignature !== topologyLastDataSignature;
      state.topology = topology;
      topologyLoaded = true;
      topologyLoadedRevision = Number(state.meta?.revision || 0);
      topologyLastDataSignature = nextSignature;
      if (shouldRenderTopologyNow()) {
        syncTopologyFilterOptions();
        renderTopologyMapIfVisible({ force: !elements.topologyMapCanvas?.dataset.topologyRenderSignature || changed });
      }
      return true;
    } catch (error) {
      console.error(error);
      if (!silent) {
        showToast(error.message || t("server_data_load_failed"), true);
      }
      return false;
    } finally {
      topologyLoadInFlight = null;
    }
  })();
  return topologyLoadInFlight;
}

function ensureTopologyMapReady({ forceRender = false, refresh = false } = {}) {
  if (!shouldRenderTopologyNow()) {
    return;
  }

  if (topologyLoaded) {
    syncTopologyFilterOptions();
    renderTopologyMapIfVisible({ force: forceRender });
  } else {
    renderTopologyLoadingState();
  }

  const currentRevision = Number(state.meta?.revision || 0);
  if (refresh || !topologyLoaded || topologyLoadedRevision !== currentRevision) {
    void refreshTopologySnapshot({ force: true, silent: true });
  }
}

function renderTopologyMapIfVisible({ force = false } = {}) {
  if (!shouldRenderTopologyNow()) {
    return;
  }
  const requestSignature = getTopologyRenderRequestSignature();
  if (
    !force
    && requestSignature
    && topologyLastRenderRequestSignature === requestSignature
    && elements.topologyMapCanvas?.dataset.topologyRenderSignature === requestSignature
  ) {
    return;
  }
  if (topologyRenderFrame) {
    if (!force) {
      return;
    }
    const cancelFrame = window.cancelAnimationFrame || window.clearTimeout;
    cancelFrame(topologyRenderFrame);
    topologyRenderFrame = 0;
  }
  if (force || !elements.topologyMapCanvas?.dataset.topologyRenderSignature) {
    renderTopologyMap();
    return;
  }
  const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  topologyRenderFrame = scheduleFrame(() => {
    topologyRenderFrame = 0;
    if (shouldRenderTopologyNow()) {
      renderTopologyMap();
    }
  });
}

function renderLiveData() {
  renderDeviceGroupFilterOptions();
  renderSubnetsTable();
  renderGroupsTable();
  renderDevicesTable();
  renderServicesList();
  ensureTopologyMapReady();
  renderHistoryTable();
  renderAdminPanels();
  renderStats();
  renderDashboardPanels();
  syncRegistrySections();
  updateAutomationWidgets();
  renderPermissionAwareUi();
}

function topologyLabelKey(prefix, value) {
  return `${prefix}_${String(value || "unknown").replace(/[^a-z0-9_]+/gi, "_").toLowerCase()}`;
}

function formatTopologyLabel(prefix, value) {
  const key = topologyLabelKey(prefix, value);
  const translated = t(key);
  return translated === key ? String(value || "unknown") : translated;
}

function syncTopologyFilterOptions() {
  if (!elements.topologySourceFilter || !elements.topologySubnetFilter || !elements.topologyModeSelect) {
    return;
  }
  const topology = state.topology || {};
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const capabilityLayers = topology.capabilities?.layers && typeof topology.capabilities.layers === "object"
    ? topology.capabilities.layers
    : {};
  const capabilityVisibleNodes = nodes.filter((node) => !node.layer || capabilityLayers[node.layer] !== false);
  const subnetNodes = capabilityVisibleNodes
    .filter((node) => node.kind === "subnet")
    .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" }));
  const subnetOptions = [
    `<option value="all">${escapeHtml(t("topology_filter_all"))}</option>`,
    ...subnetNodes.map((subnet) => `<option value="${escapeHtml(subnet.subnetId)}">${escapeHtml([subnet.label, subnet.cidr].filter(Boolean).join(" · "))}</option>`),
  ];
  elements.topologySubnetFilter.innerHTML = subnetOptions.join("");
  const validSubnetValues = new Set(["all", ...subnetNodes.map((subnet) => subnet.subnetId)]);
  elements.topologySubnetFilter.value = validSubnetValues.has(topologySubnetFilter) ? topologySubnetFilter : "all";
  topologySubnetFilter = elements.topologySubnetFilter.value;

  const layerOrder = ["hosts", "services", "containers", "kubernetes", "proxmox", "iot"];
  const availableLayers = layerOrder.filter((layer) => (
    capabilityVisibleNodes.some((node) => node.layer === layer)
  ));
  if (elements.topologyLayerFilter) {
    const layerOptions = [
      `<option value="all">${escapeHtml(t("topology_filter_all"))}</option>`,
      ...availableLayers.map((layer) => `<option value="${escapeHtml(layer)}">${escapeHtml(formatTopologyLabel("topology_layer", layer))}</option>`),
    ];
    elements.topologyLayerFilter.innerHTML = layerOptions.join("");
    elements.topologyLayerFilter.value = availableLayers.includes(topologyLayerFilter) ? topologyLayerFilter : "all";
    topologyLayerFilter = elements.topologyLayerFilter.value;
  }

  const sources = [...new Set(capabilityVisibleNodes.map((node) => String(node.source || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, getLanguage(), { sensitivity: "base" }));
  const sourceOptions = [
    `<option value="all">${escapeHtml(t("topology_filter_all"))}</option>`,
    ...sources.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(formatTopologyLabel("topology_source", source))}</option>`),
  ];
  elements.topologySourceFilter.innerHTML = sourceOptions.join("");
  elements.topologySourceFilter.value = sources.includes(topologySourceFilter) ? topologySourceFilter : "all";
  topologySourceFilter = elements.topologySourceFilter.value;

  const advancedAllowed = Boolean(topology.capabilities?.advancedMode);
  elements.topologyModeSelect.querySelector('option[value="advanced"]')?.toggleAttribute("disabled", !advancedAllowed);
  if (!advancedAllowed && topologyMode === "advanced") {
    topologyMode = "simple";
  }
  elements.topologyModeSelect.value = topologyMode;
  if (elements.topologyStatusFilter) {
    elements.topologyStatusFilter.value = topologyStatusFilter;
  }
}

function getFilteredTopology() {
  const topology = state.topology || {};
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const links = Array.isArray(topology.links) ? topology.links : [];
  const interfaces = Array.isArray(topology.interfaces) ? topology.interfaces : [];
  const nodesById = getTopologyNodeMap(nodes);
  const capabilityLayers = topology.capabilities?.layers && typeof topology.capabilities.layers === "object"
    ? topology.capabilities.layers
    : {};
  const coreBySubnetId = new Map();
  links.forEach((link) => {
    if (link.kind !== "core-subnet") {
      return;
    }
    const subnetNode = nodesById.get(link.target);
    if (subnetNode?.subnetId) {
      coreBySubnetId.set(subnetNode.subnetId, link.source);
    }
  });
  const subnetNodes = nodes.filter((node) => (
    node.kind === "subnet"
    && (!node.layer || capabilityLayers[node.layer] !== false)
    && (topologySubnetFilter === "all" || node.subnetId === topologySubnetFilter)
  ));
  const filteredNodes = nodes.filter((node) => {
    if (node.kind === "subnet") {
      return false;
    }
    if (node.layer && capabilityLayers[node.layer] === false) {
      return false;
    }
    if (topologySubnetFilter !== "all" && node.subnetId !== topologySubnetFilter) {
      return false;
    }
    if (topologyLayerFilter === "all" && node.layer === "iot") {
      return false;
    }
    if (topologyMode === "simple" && String(node.id || "").startsWith("discovery:")) {
      return false;
    }
    if (node.kind === "template" || node.sourceKind === "template") {
      return false;
    }
    if (topologyLayerFilter !== "all" && node.layer !== topologyLayerFilter) {
      return false;
    }
    if (topologySourceFilter !== "all" && node.source !== topologySourceFilter) {
      return false;
    }
    if (topologyStatusFilter !== "all" && node.status !== topologyStatusFilter) {
      return false;
    }
    return true;
  });
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  filteredNodes.forEach((node) => {
    const coreNodeId = node.subnetId ? coreBySubnetId.get(node.subnetId) : "";
    if (coreNodeId) {
      visibleNodeIds.add(coreNodeId);
    }
  });
  links.forEach((link) => {
    if (link.kind === "hypervisor-guest" && visibleNodeIds.has(link.target)) {
      visibleNodeIds.add(link.source);
    }
    if (link.kind === "host-service" && visibleNodeIds.has(link.target)) {
      visibleNodeIds.add(link.source);
    }
    if (link.kind === "kubernetes-service-workload" && visibleNodeIds.has(link.target)) {
      visibleNodeIds.add(link.source);
    }
  });
  const visibleNodes = nodes
    .filter((node) => visibleNodeIds.has(node.id) && node.kind !== "subnet")
    .filter((node) => !node.layer || capabilityLayers[node.layer] !== false);
  const strongParentTargets = new Set(
    links
      .filter((link) => (
        ["hypervisor-guest", "host-service", "kubernetes-service-workload"].includes(link.kind)
        && visibleNodeIds.has(link.source)
        && visibleNodeIds.has(link.target)
      ))
      .map((link) => link.target)
  );
  const collapsedSubnetLinks = links
    .filter((link) => link.kind === "subnet-member")
    .map((link) => {
      const subnetNode = nodesById.get(link.source);
      const coreNodeId = subnetNode?.subnetId ? coreBySubnetId.get(subnetNode.subnetId) : "";
      if (!coreNodeId || !visibleNodeIds.has(link.target) || coreNodeId === link.target || strongParentTargets.has(link.target)) {
        return null;
      }
      return {
        ...link,
        id: `link:core-member:${coreNodeId}:${link.target}`,
        source: coreNodeId,
        target: link.target,
        kind: "core-member",
        reason: "Subnet membership is shown through the core router.",
      };
    })
    .filter(Boolean);
  const collapsedLinkPairs = new Set(collapsedSubnetLinks.map((link) => `${link.source}:${link.target}`));
  const existingLinkPairs = new Set(
    links
      .filter((link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target))
      .map((link) => `${link.source}:${link.target}`)
  );
  const inferredCoreLinks = visibleNodes
    .map((node) => {
      const coreNodeId = node.subnetId ? coreBySubnetId.get(node.subnetId) : "";
      const pairKey = `${coreNodeId}:${node.id}`;
      if (!coreNodeId || coreNodeId === node.id || strongParentTargets.has(node.id) || existingLinkPairs.has(pairKey) || collapsedLinkPairs.has(pairKey)) {
        return null;
      }
      return {
        id: `link:core-member:${coreNodeId}:${node.id}`,
        source: coreNodeId,
        target: node.id,
        kind: "core-member",
        confidence: "medium",
        reason: "Visible node belongs to the core subnet context.",
        sourceType: "inferred",
        graphSource: "inferred",
      };
    })
    .filter(Boolean);
  const visibleLinks = [
    ...links.filter((link) => (
      link.kind !== "core-subnet"
      && link.kind !== "subnet-member"
      && visibleNodeIds.has(link.source)
      && visibleNodeIds.has(link.target)
    )),
    ...collapsedSubnetLinks,
    ...inferredCoreLinks,
  ];
  const visibleInterfaces = interfaces.filter((item) => visibleNodeIds.has(item.nodeId));
  return { nodes: visibleNodes, links: visibleLinks, interfaces: visibleInterfaces, subnets: subnetNodes };
}

function renderTopologySummary(nodes, links, interfaces, subnets = []) {
  if (!elements.topologySummaryGrid || !elements.topologySummaryCounter) {
    return;
  }
  const summaryItems = [
    ["topology_summary_nodes", nodes.length],
    ["topology_summary_links", links.length],
    ["topology_summary_interfaces", interfaces.length],
    ["topology_summary_subnets", subnets.length],
    ["topology_summary_hosts", nodes.filter((node) => node.role === "host").length],
    ["topology_summary_workloads", nodes.filter((node) => node.role === "workload").length],
  ];
  elements.topologySummaryCounter.textContent = t("topology_counter", { nodes: nodes.length, links: links.length });
  elements.topologySummaryGrid.innerHTML = summaryItems.map(([labelKey, value]) => `
    <div class="topology-summary-card">
      <span>${escapeHtml(t(labelKey))}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");
}

function topologyStatusBadgeClass(status) {
  if (status === "up") {
    return "ok";
  }
  if (status === "down") {
    return "danger";
  }
  if (status === "pending") {
    return "warn";
  }
  return "muted";
}

function renderTopologyCompactNode(node, options = {}) {
  const metadata = node.metadata && typeof node.metadata === "object" ? node.metadata : {};
  const details = [
    node.cidr,
    node.ip,
    metadata.ports,
    metadata.deviceClass,
    metadata.location || metadata.room,
  ].filter(Boolean).slice(0, options.maxDetails || 2);
  return `
    <div class="topology-mini-node topology-mini-node--${escapeHtml(node.role || "unknown")}">
      <div class="topology-mini-node__main">
        <strong>${escapeHtml(node.label || node.id)}</strong>
        <span>${escapeHtml(formatTopologyLabel("topology_kind", node.kind))}</span>
      </div>
      <span class="status-badge status-badge--${topologyStatusBadgeClass(node.status)}">
        ${escapeHtml(formatTopologyLabel("topology_status", node.status))}
      </span>
      ${details.length ? `<div class="topology-mini-node__details">${details.map((item) => `<code>${escapeHtml(String(item))}</code>`).join("")}</div>` : ""}
    </div>
  `;
}

function renderTopologySubnetContext(subnets, nodes) {
  if (!subnets.length) {
    return "";
  }
  const memberCounts = new Map();
  nodes.forEach((node) => {
    if (!node.subnetId) {
      return;
    }
    memberCounts.set(node.subnetId, (memberCounts.get(node.subnetId) || 0) + 1);
  });
  const cards = subnets.map((subnet) => {
    const memberCount = memberCounts.get(subnet.subnetId) || 0;
    const metadata = subnet.metadata && typeof subnet.metadata === "object" ? subnet.metadata : {};
    const details = [
      subnet.cidr,
      metadata.network ? `${metadata.network}${metadata.broadcast ? ` - ${metadata.broadcast}` : ""}` : "",
      metadata.poolSize ? t("topology_subnet_pool", { count: metadata.poolSize }) : "",
    ].filter(Boolean);
    return `
      <article class="topology-subnet-context-card">
        <div>
          <strong>${escapeHtml(subnet.label || subnet.id)}</strong>
          ${details.length ? `<span>${escapeHtml(details.join(" · "))}</span>` : ""}
        </div>
        <code>${escapeHtml(t("topology_subnet_members", { count: memberCount }))}</code>
      </article>
    `;
  }).join("");
  return `<section class="topology-subnet-context">${cards}</section>`;
}

function getTopologyNodeMap(nodes) {
  return new Map(nodes.map((node) => [node.id, node]));
}

function truncateTopologyGraphText(value, maxLength = 24) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 3))}...`;
}

function topologyLinkMarkerId(kind) {
  const normalized = String(kind || "related").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return `topology-arrow-${normalized}`;
}

const TOPOLOGY_HOST_SERVICE_COLORS = [
  "#a78bfa",
  "#e879f9",
  "#fb7185",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#34d399",
  "#2dd4bf",
  "#f472b6",
  "#c084fc",
];

function topologyStableColorIndex(value, size = TOPOLOGY_HOST_SERVICE_COLORS.length) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % Math.max(1, size);
}

function topologyHostServiceColor(sourceId) {
  return TOPOLOGY_HOST_SERVICE_COLORS[topologyStableColorIndex(sourceId)];
}

function topologyHostServiceMarkerId(sourceId) {
  return `topology-arrow-host-service-${topologyStableColorIndex(sourceId)}`;
}

function resetTopologyViewport() {
  topologyZoom = TOPOLOGY_ZOOM_DEFAULT;
  topologyZoomUserAdjusted = false;
  topologyPanUserAdjusted = false;
  topologyPanState = null;
}

function clampTopologyZoom(value) {
  const renderedMin = Number(elements.topologyMapCanvas?.querySelector("#topology-zoom-range")?.dataset.minZoom || 0);
  const minimum = renderedMin || TOPOLOGY_ZOOM_MIN;
  return Math.min(TOPOLOGY_ZOOM_MAX, Math.max(minimum, Number(value) || 1));
}

function getTopologyGraphViewport() {
  const viewport = elements.topologyMapCanvas?.querySelector(".topology-graph-scroll");
  const graphZoom = elements.topologyMapCanvas?.querySelector("[data-topology-graph-zoom]");
  return { viewport, graphZoom };
}

function applyTopologyViewportToRenderedGraph() {
  const graphZoom = elements.topologyMapCanvas?.querySelector("[data-topology-graph-zoom]");
  const range = elements.topologyMapCanvas?.querySelector("#topology-zoom-range");
  if (graphZoom) {
    graphZoom.style.transform = `translate3d(${Math.round(topologyPanX)}px, ${Math.round(topologyPanY)}px, 0) scale(${topologyZoom})`;
  }
  if (range) {
    const minZoom = Number(range.dataset.minZoom || TOPOLOGY_ZOOM_MIN);
    const maxZoom = Number(range.dataset.maxZoom || TOPOLOGY_ZOOM_MAX);
    const progress = maxZoom > minZoom ? ((topologyZoom - minZoom) / (maxZoom - minZoom)) * 100 : 0;
    range.value = String(Math.min(100, Math.max(0, Math.round(progress))));
  }
}

function centerTopologyGraphIfNeeded() {
  if (topologyPanUserAdjusted) {
    applyTopologyViewportToRenderedGraph();
    return;
  }
  const { viewport, graphZoom } = getTopologyGraphViewport();
  const graphWidth = Number(graphZoom?.dataset.topologyGraphWidth || 0);
  const graphHeight = Number(graphZoom?.dataset.topologyGraphHeight || 0);
  const rootX = Number(graphZoom?.dataset.topologyRootX || 0);
  const rootY = Number(graphZoom?.dataset.topologyRootY || 0);
  if (!viewport || !graphWidth || !graphHeight) {
    applyTopologyViewportToRenderedGraph();
    return;
  }
  const anchorX = rootX || graphWidth / 2;
  const anchorY = rootY || graphHeight / 2;
  topologyPanX = viewport.clientWidth / 2 - anchorX * topologyZoom;
  topologyPanY = viewport.clientHeight / 2 - anchorY * topologyZoom;
  applyTopologyViewportToRenderedGraph();
}

function setTopologyZoom(value, options = {}) {
  const { viewport } = getTopologyGraphViewport();
  const previousZoom = topologyZoom || 1;
  const rect = viewport?.getBoundingClientRect();
  const anchorX = options.anchorEvent && rect
    ? options.anchorEvent.clientX - rect.left
    : (rect ? rect.width / 2 : 0);
  const anchorY = options.anchorEvent && rect
    ? options.anchorEvent.clientY - rect.top
    : (rect ? rect.height / 2 : 0);
  const graphAnchorX = (anchorX - topologyPanX) / previousZoom;
  const graphAnchorY = (anchorY - topologyPanY) / previousZoom;

  topologyZoomUserAdjusted = true;
  topologyZoom = clampTopologyZoom(value);
  if (options.render) {
    renderTopologyMap();
    return;
  }
  topologyPanX = anchorX - graphAnchorX * topologyZoom;
  topologyPanY = anchorY - graphAnchorY * topologyZoom;
  topologyPanUserAdjusted = true;
  applyTopologyViewportToRenderedGraph();
}

function topologyGraphNodeSortRank(node) {
  const kind = String(node?.kind || "").toLowerCase();
  const role = String(node?.role || "").toLowerCase();
  if (kind === "core-router") {
    return 0;
  }
  if (kind === "switch") {
    return 1;
  }
  if (kind === "hypervisor") {
    return 2;
  }
  if (kind === "vm" || kind === "lxc") {
    return 3;
  }
  if (role === "host") {
    return 4;
  }
  if (kind === "kubernetes-service") {
    return 5;
  }
  if (kind === "kubernetes-pod" || kind === "kubernetes-workload") {
    return 6;
  }
  if (role === "workload") {
    return 5;
  }
  if (role === "iot") {
    return 7;
  }
  return 9;
}

function topologyNowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function topologyExceededLayoutBudget(startedAt, budgetMs) {
  return topologyNowMs() - startedAt > budgetMs;
}

function resolveTopologyGraphCollisions(graphNodes, positions, bounds, lockedNodeIds = new Set()) {
  const padding = topologyMode === "advanced" ? 26 : 20;
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const iterationLimit = graphNodes.length > 130 ? 34 : (graphNodes.length > 80 ? 48 : 70);
  const startedAt = topologyNowMs();
  const budgetMs = topologyMode === "advanced" ? 34 : 24;
  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    let moved = false;
    for (let leftIndex = 0; leftIndex < graphNodes.length; leftIndex += 1) {
      const leftNode = graphNodes[leftIndex];
      const left = positions.get(leftNode.id);
      if (!left) {
        continue;
      }
      for (let rightIndex = leftIndex + 1; rightIndex < graphNodes.length; rightIndex += 1) {
        const rightNode = graphNodes[rightIndex];
        const right = positions.get(rightNode.id);
        if (!right) {
          continue;
        }
        const leftCenterX = left.x + left.width / 2;
        const leftCenterY = left.y + left.height / 2;
        const rightCenterX = right.x + right.width / 2;
        const rightCenterY = right.y + right.height / 2;
        const overlapX = ((left.width + right.width) / 2 + padding) - Math.abs(leftCenterX - rightCenterX);
        const overlapY = ((left.height + right.height) / 2 + padding) - Math.abs(leftCenterY - rightCenterY);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        const separateX = overlapX < overlapY;
        let direction = separateX ? Math.sign(rightCenterX - leftCenterX) : Math.sign(rightCenterY - leftCenterY);
        if (!direction) {
          direction = separateX
            ? Math.sign(rightCenterX - centerX) || 1
            : Math.sign(rightCenterY - centerY) || 1;
        }
        const leftLocked = lockedNodeIds.has(leftNode.id);
        const rightLocked = lockedNodeIds.has(rightNode.id);
        if (leftLocked && rightLocked) {
          continue;
        }
        const push = (separateX ? overlapX : overlapY) / 2 + 1;
        const lockedPush = (separateX ? overlapX : overlapY) + 2;
        if (separateX) {
          if (leftLocked) {
            right.x += direction * lockedPush;
          } else if (rightLocked) {
            left.x -= direction * lockedPush;
          } else {
            left.x -= direction * push;
            right.x += direction * push;
          }
        } else {
          if (leftLocked) {
            right.y += direction * lockedPush;
          } else if (rightLocked) {
            left.y -= direction * lockedPush;
          } else {
            left.y -= direction * push;
            right.y += direction * push;
          }
        }
        moved = true;
      }
    }
    positions.forEach((position, nodeId) => {
      if (lockedNodeIds.has(nodeId)) {
        return;
      }
      position.x = Math.min(Math.max(24, position.x), Math.max(24, bounds.width - position.width - 24));
      position.y = Math.min(Math.max(24, position.y), Math.max(24, bounds.height - position.height - 24));
    });
    if (!moved) {
      break;
    }
    if (iteration % 4 === 3 && topologyExceededLayoutBudget(startedAt, budgetMs)) {
      break;
    }
  }
}

function topologyGraphEdgePoint(from, to) {
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  if (!dx && !dy) {
    return { x: fromCenterX, y: fromCenterY };
  }
  const scale = 1 / Math.max(Math.abs(dx) / (from.width / 2), Math.abs(dy) / (from.height / 2));
  return {
    x: fromCenterX + dx * scale * 0.92,
    y: fromCenterY + dy * scale * 0.92,
  };
}

function topologyLayoutClass(node) {
  const kind = String(node?.kind || "").toLowerCase();
  const role = String(node?.role || "").toLowerCase();
  const layer = String(node?.layer || "").toLowerCase();
  if (kind === "core-router") {
    return "core";
  }
  if (kind === "switch" || role === "network") {
    return "network";
  }
  if (kind === "hypervisor" || kind === "vm" || kind === "lxc") {
    return "compute";
  }
  if (layer === "kubernetes" || kind === "kubernetes-service" || kind === "kubernetes-pod" || kind === "kubernetes-workload") {
    return "kubernetes";
  }
  if (role === "iot" || kind === "iot") {
    return "iot";
  }
  if (role === "workload" || kind === "service" || kind === "container") {
    return "service";
  }
  if (role === "host" || kind === "host") {
    return "host";
  }
  return "other";
}

function topologyLayoutAngleRange(layoutClass) {
  const ranges = {
    network: [-1.68, -1.08],
    compute: [2.55, 3.35],
    host: [-0.78, 0.78],
    service: [0.28, 1.08],
    kubernetes: [1.02, 1.62],
    iot: [1.9, 2.46],
    other: [-2.28, 2.28],
  };
  return ranges[layoutClass] || ranges.other;
}

function topologyDistributedAngle(range, index, count) {
  const [start, end] = range;
  if (count <= 1) {
    return (start + end) / 2;
  }
  return start + ((end - start) * index) / (count - 1);
}

function topologySemanticAngle(node, index, count) {
  return topologyDistributedAngle(topologyLayoutAngleRange(topologyLayoutClass(node)), index, count);
}

function topologyDirectedLane(node, depth) {
  const kind = String(node?.kind || "").toLowerCase();
  const role = String(node?.role || "").toLowerCase();
  const layoutClass = topologyLayoutClass(node);
  if (layoutClass === "core") {
    return 0;
  }
  if (layoutClass === "network") {
    return 1;
  }
  if (kind === "hypervisor") {
    return 1;
  }
  if (kind === "vm" || kind === "lxc" || role === "host") {
    return 2;
  }
  if (layoutClass === "service" || layoutClass === "kubernetes") {
    return 3;
  }
  if (layoutClass === "iot") {
    return 4;
  }
  return Math.min(5, Math.max(1, depth || 1));
}

function layoutTopologyDirectedRows(graphNodes, positions, bounds, nodeWidth, nodeHeight, rootNode, depthById, parentById, nodesById) {
  const laneGapX = topologyMode === "advanced" ? 328 : 292;
  const rowGapY = topologyMode === "advanced" ? 54 : 46;
  const laneItems = new Map();
  graphNodes.forEach((node) => {
    const lane = node.id === rootNode.id ? 0 : topologyDirectedLane(node, depthById.get(node.id) || 1);
    laneItems.set(lane, [...(laneItems.get(lane) || []), node]);
  });

  const lanes = [...laneItems.keys()].sort((left, right) => left - right);
  const totalWidth = (lanes.length - 1) * laneGapX + nodeWidth;
  const startX = Math.max(36, bounds.width / 2 - totalWidth / 2);
  lanes.forEach((lane, laneIndex) => {
    const items = (laneItems.get(lane) || [])
      .slice()
      .sort((left, right) => {
        const leftParent = nodesById.get(parentById.get(left.id));
        const rightParent = nodesById.get(parentById.get(right.id));
        const parentDelta = String(leftParent?.label || "").localeCompare(String(rightParent?.label || ""), getLanguage(), { sensitivity: "base" });
        if (parentDelta) {
          return parentDelta;
        }
        const rankDelta = topologyGraphNodeSortRank(left) - topologyGraphNodeSortRank(right);
        if (rankDelta) {
          return rankDelta;
        }
        return String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" });
      });
    const rowStep = nodeHeight + rowGapY;
    const totalHeight = Math.max(nodeHeight, items.length * rowStep - rowGapY);
    const startY = Math.max(36, bounds.height / 2 - totalHeight / 2);
    items.forEach((node, index) => {
      positions.set(node.id, {
        x: Math.min(startX + laneIndex * laneGapX, Math.max(36, bounds.width - nodeWidth - 36)),
        y: Math.min(startY + index * rowStep, Math.max(36, bounds.height - nodeHeight - 36)),
        width: nodeWidth,
        height: nodeHeight,
      });
    });
  });
}

function topologyChildFanAngle(parentAngle, node, siblingIndex, siblingCount) {
  const layoutClass = topologyLayoutClass(node);
  const offsets = {
    compute: -0.08,
    service: 0.14,
    kubernetes: 0.12,
    iot: 0.22,
    host: 0,
    network: -0.12,
    other: 0,
  };
  if (siblingCount <= 1) {
    return parentAngle + (offsets[layoutClass] || 0);
  }
  const minimumSpreadByClass = {
    service: Math.PI * 0.34,
    kubernetes: Math.PI * 0.28,
    compute: Math.PI * 0.24,
    iot: Math.PI * 0.32,
  };
  const maximumSpreadByClass = {
    service: Math.PI * 0.86,
    kubernetes: Math.PI * 0.7,
    compute: Math.PI * 0.64,
    iot: Math.PI * 0.72,
  };
  const minimumSpread = minimumSpreadByClass[layoutClass] || Math.PI * 0.2;
  const maximumSpread = maximumSpreadByClass[layoutClass] || Math.PI * 0.62;
  const spread = Math.min(maximumSpread, Math.max(minimumSpread, siblingCount * 0.16));
  const step = spread / Math.max(1, siblingCount - 1);
  return parentAngle + (siblingIndex - (siblingCount - 1) / 2) * step;
}

function topologyHostedServiceMaxColumns() {
  return topologyMode === "advanced" ? 6 : 5;
}

function getTopologyHostedServiceClusters(graphNodes, graphLinks) {
  const nodesById = new Map(graphNodes.map((node) => [node.id, node]));
  const clustersByHostId = new Map();
  graphLinks
    .filter((link) => link.kind === "host-service")
    .forEach((link) => {
      const sourceNode = nodesById.get(link.source);
      const targetNode = nodesById.get(link.target);
      if (!sourceNode || !targetNode) {
        return;
      }
      const sourceClass = topologyLayoutClass(sourceNode);
      const targetClass = topologyLayoutClass(targetNode);
      const hostNode = sourceClass === "host" ? sourceNode : (targetClass === "host" ? targetNode : sourceNode);
      const serviceNode = hostNode.id === sourceNode.id ? targetNode : sourceNode;
      if (topologyLayoutClass(serviceNode) !== "service") {
        return;
      }
      const current = clustersByHostId.get(hostNode.id) || { host: hostNode, services: [] };
      if (!current.services.some((node) => node.id === serviceNode.id)) {
        current.services.push(serviceNode);
      }
      clustersByHostId.set(hostNode.id, current);
    });
  return [...clustersByHostId.values()]
    .map((cluster) => ({
      ...cluster,
      services: cluster.services
        .slice()
        .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" })),
    }))
    .filter((cluster) => cluster.services.length)
    .sort((left, right) => String(left.host.label || "").localeCompare(String(right.host.label || ""), getLanguage(), { sensitivity: "base" }));
}

function topologyClusterBounds(nodeIds, positions, padding = 18) {
  const boxes = nodeIds.map((nodeId) => positions.get(nodeId)).filter(Boolean);
  if (!boxes.length) {
    return null;
  }
  const left = Math.min(...boxes.map((box) => box.x)) - padding;
  const top = Math.min(...boxes.map((box) => box.y)) - padding;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function shiftTopologyCluster(nodeIds, positions, deltaX, deltaY, bounds) {
  nodeIds.forEach((nodeId) => {
    const position = positions.get(nodeId);
    if (!position) {
      return;
    }
    position.x = Math.min(Math.max(24, position.x + deltaX), Math.max(24, bounds.width - position.width - 24));
    position.y = Math.min(Math.max(24, position.y + deltaY), Math.max(24, bounds.height - position.height - 24));
  });
}

function topologyPositionRect(position, padding = 0) {
  return {
    left: position.x - padding,
    top: position.y - padding,
    right: position.x + position.width + padding,
    bottom: position.y + position.height + padding,
    width: position.width + padding * 2,
    height: position.height + padding * 2,
  };
}

function topologyRectOverlapArea(left, right) {
  const overlapX = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const overlapY = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
  return overlapX > 0 && overlapY > 0 ? overlapX * overlapY : 0;
}

function topologyObstacleRects(obstacleNodeIds, positions, excludedNodeIds = new Set(), padding = 26) {
  return [...obstacleNodeIds]
    .filter((nodeId) => !excludedNodeIds.has(nodeId))
    .map((nodeId) => positions.get(nodeId))
    .filter(Boolean)
    .map((position) => topologyPositionRect(position, padding));
}

function topologyRowCandidateBounds(anchorPosition, rowWidth, rowHeight, direction, gapX, bounds, padding = 18) {
  const idealStartX = direction > 0
    ? anchorPosition.x + anchorPosition.width + gapX
    : anchorPosition.x - gapX - rowWidth;
  const startX = Math.min(Math.max(24, idealStartX), Math.max(24, bounds.width - rowWidth - 24));
  const startY = Math.min(
    Math.max(24, anchorPosition.y + anchorPosition.height / 2 - rowHeight / 2),
    Math.max(24, bounds.height - rowHeight - 24),
  );
  return {
    direction,
    startX,
    startY,
    idealStartX,
    left: startX - padding,
    top: startY - padding,
    right: startX + rowWidth + padding,
    bottom: startY + rowHeight + padding,
    width: rowWidth + padding * 2,
    height: rowHeight + padding * 2,
  };
}

function topologyRowPlacementPenalty(candidate, obstacleRects, preferredDirection) {
  const overlapPenalty = obstacleRects.reduce(
    (sum, rect) => sum + topologyRectOverlapArea(candidate, rect) * 20,
    0,
  );
  const clampPenalty = Math.abs(candidate.startX - candidate.idealStartX) * 6;
  const directionPenalty = candidate.direction === preferredDirection ? 0 : 80;
  return overlapPenalty + clampPenalty + directionPenalty;
}

function getTopologyProtectedNodeIds(graphNodes) {
  return new Set(graphNodes
    .filter((node) => {
      const kind = String(node.kind || "").toLowerCase();
      const role = String(node.role || "").toLowerCase();
      const layoutClass = topologyLayoutClass(node);
      return kind === "subnet"
        || role === "host"
        || layoutClass === "core"
        || layoutClass === "network"
        || layoutClass === "compute";
    })
    .map((node) => node.id));
}

function getTopologyClusterDirectionFromParent(cluster, positions, parentById, nodesById, fallbackCenterX) {
  const hostPosition = positions.get(cluster.host.id);
  const parentId = parentById.get(cluster.host.id);
  const parentNode = nodesById.get(parentId);
  const parentPosition = parentId ? positions.get(parentId) : null;
  if (hostPosition && parentPosition && parentNode?.kind === "hypervisor") {
    const hostCenterX = hostPosition.x + hostPosition.width / 2;
    const parentCenterX = parentPosition.x + parentPosition.width / 2;
    return hostCenterX >= parentCenterX ? 1 : -1;
  }
  if (!hostPosition) {
    return 1;
  }
  return hostPosition.x + hostPosition.width / 2 < fallbackCenterX ? -1 : 1;
}

function layoutTopologyHostedServiceRows(clusters, positions, bounds, nodeWidth, nodeHeight, parentById, nodesById, obstacleNodeIds = new Set()) {
  const clusterNodeIds = new Set();
  const gapX = topologyMode === "advanced" ? 42 : 36;
  const gapY = 14;
  const maxColumns = topologyHostedServiceMaxColumns();
  const centerX = bounds.width / 2;
  const placedClusterRects = [];

  clusters.forEach((cluster) => {
    const hostPosition = positions.get(cluster.host.id);
    if (!hostPosition) {
      return;
    }
    const columns = Math.max(1, Math.min(maxColumns, cluster.services.length));
    const rows = Math.ceil(cluster.services.length / columns);
    const rowWidth = columns * nodeWidth + (columns - 1) * gapX;
    const rowHeight = rows * nodeHeight + (rows - 1) * gapY;
    const preferredDirection = getTopologyClusterDirectionFromParent(cluster, positions, parentById, nodesById, centerX);
    const ownNodeIds = new Set([cluster.host.id, ...cluster.services.map((node) => node.id)]);
    const obstacleRects = [
      ...topologyObstacleRects(obstacleNodeIds, positions, ownNodeIds),
      ...placedClusterRects,
    ];
    const candidates = [preferredDirection, -preferredDirection]
      .map((direction) => topologyRowCandidateBounds(hostPosition, rowWidth, rowHeight, direction, gapX, bounds))
      .sort((left, right) => topologyRowPlacementPenalty(left, obstacleRects, preferredDirection)
        - topologyRowPlacementPenalty(right, obstacleRects, preferredDirection));
    const placement = candidates[0];
    const { direction, startX, startY } = placement;

    clusterNodeIds.add(cluster.host.id);
    cluster.services.forEach((serviceNode, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const visualColumn = direction > 0 ? column : columns - column - 1;
      positions.set(serviceNode.id, {
        x: startX + visualColumn * (nodeWidth + gapX),
        y: startY + row * (nodeHeight + gapY),
        width: nodeWidth,
        height: nodeHeight,
      });
      clusterNodeIds.add(serviceNode.id);
    });
    const clusterBounds = topologyClusterBounds([...ownNodeIds], positions, 24);
    if (clusterBounds) {
      placedClusterRects.push(clusterBounds);
    }
  });

  return clusterNodeIds;
}

function getTopologyHypervisorGuestClusters(graphNodes, graphLinks) {
  const nodesById = new Map(graphNodes.map((node) => [node.id, node]));
  const clustersByHypervisorId = new Map();
  graphLinks
    .filter((link) => link.kind === "hypervisor-guest")
    .forEach((link) => {
      const sourceNode = nodesById.get(link.source);
      const targetNode = nodesById.get(link.target);
      if (!sourceNode || !targetNode) {
        return;
      }
      const hypervisorNode = sourceNode.kind === "hypervisor" ? sourceNode : (targetNode.kind === "hypervisor" ? targetNode : null);
      const guestNode = hypervisorNode?.id === sourceNode.id ? targetNode : sourceNode;
      if (!hypervisorNode || !["vm", "lxc", "host"].includes(String(guestNode.kind || guestNode.role || "").toLowerCase())) {
        return;
      }
      const current = clustersByHypervisorId.get(hypervisorNode.id) || { host: hypervisorNode, services: [] };
      if (!current.services.some((node) => node.id === guestNode.id)) {
        current.services.push(guestNode);
      }
      clustersByHypervisorId.set(hypervisorNode.id, current);
    });
  return [...clustersByHypervisorId.values()]
    .map((cluster) => ({
      ...cluster,
      services: cluster.services
        .slice()
        .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" })),
    }))
    .filter((cluster) => cluster.services.length)
    .sort((left, right) => String(left.host.label || "").localeCompare(String(right.host.label || ""), getLanguage(), { sensitivity: "base" }));
}

function layoutTopologyHypervisorGuestRows(clusters, positions, bounds, nodeWidth, nodeHeight, obstacleNodeIds = new Set()) {
  const clusterNodeIds = new Set();
  const gapX = topologyMode === "advanced" ? 52 : 44;
  const gapY = 16;
  const maxRows = topologyMode === "advanced" ? 6 : 5;
  const placedClusterRects = [];

  clusters.forEach((cluster) => {
    const hypervisorPosition = positions.get(cluster.host.id);
    if (!hypervisorPosition) {
      return;
    }
    const rows = Math.max(1, Math.min(maxRows, cluster.services.length));
    const columns = Math.ceil(cluster.services.length / rows);
    const columnWidth = nodeWidth + gapX;
    const blockWidth = columns * nodeWidth + (columns - 1) * gapX;
    const blockHeight = rows * nodeHeight + (rows - 1) * gapY;
    const preferredDirection = hypervisorPosition.x + hypervisorPosition.width / 2 < bounds.width / 2 ? -1 : 1;
    const ownNodeIds = new Set([cluster.host.id, ...cluster.services.map((node) => node.id)]);
    const obstacleRects = [
      ...topologyObstacleRects(obstacleNodeIds, positions, ownNodeIds),
      ...placedClusterRects,
    ];
    const candidates = [preferredDirection, -preferredDirection]
      .map((direction) => topologyRowCandidateBounds(hypervisorPosition, blockWidth, blockHeight, direction, gapX, bounds))
      .sort((left, right) => topologyRowPlacementPenalty(left, obstacleRects, preferredDirection)
        - topologyRowPlacementPenalty(right, obstacleRects, preferredDirection));
    const placement = candidates[0];
    const { direction, startX, startY } = placement;

    clusterNodeIds.add(cluster.host.id);
    cluster.services.forEach((guestNode, index) => {
      const row = index % rows;
      const column = Math.floor(index / rows);
      const visualColumn = direction > 0 ? column : columns - column - 1;
      positions.set(guestNode.id, {
        x: startX + visualColumn * columnWidth,
        y: startY + row * (nodeHeight + gapY),
        width: nodeWidth,
        height: nodeHeight,
      });
      clusterNodeIds.add(guestNode.id);
    });
    const clusterBounds = topologyClusterBounds([...ownNodeIds], positions, 24);
    if (clusterBounds) {
      placedClusterRects.push(clusterBounds);
    }
  });

  return clusterNodeIds;
}

function topologyNodeIdListsShareNode(leftIds, rightIds) {
  const rightSet = new Set(rightIds);
  return leftIds.some((nodeId) => rightSet.has(nodeId));
}

function resolveTopologyHostedServiceClusterCollisions(clusters, positions, bounds) {
  const clusterNodeIds = clusters.map((cluster) => [cluster.host.id, ...cluster.services.map((node) => node.id)]);
  const iterationLimit = clusters.length > 30 ? 16 : (clusters.length > 16 ? 24 : 32);
  const startedAt = topologyNowMs();
  const budgetMs = topologyMode === "advanced" ? 22 : 16;
  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    let moved = false;
    for (let leftIndex = 0; leftIndex < clusterNodeIds.length; leftIndex += 1) {
      const leftIds = clusterNodeIds[leftIndex];
      const leftBounds = topologyClusterBounds(leftIds, positions);
      if (!leftBounds) {
        continue;
      }
      for (let rightIndex = leftIndex + 1; rightIndex < clusterNodeIds.length; rightIndex += 1) {
        const rightIds = clusterNodeIds[rightIndex];
        if (topologyNodeIdListsShareNode(leftIds, rightIds)) {
          continue;
        }
        const rightBounds = topologyClusterBounds(rightIds, positions);
        if (!rightBounds) {
          continue;
        }
        const overlapX = Math.min(leftBounds.right, rightBounds.right) - Math.max(leftBounds.left, rightBounds.left);
        const overlapY = Math.min(leftBounds.bottom, rightBounds.bottom) - Math.max(leftBounds.top, rightBounds.top);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        const leftCenterY = leftBounds.top + leftBounds.height / 2;
        const rightCenterY = rightBounds.top + rightBounds.height / 2;
        const direction = Math.sign(rightCenterY - leftCenterY) || (rightIndex % 2 ? 1 : -1);
        const push = overlapY / 2 + 12;
        shiftTopologyCluster(leftIds, positions, 0, -direction * push, bounds);
        shiftTopologyCluster(rightIds, positions, 0, direction * push, bounds);
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
    if (iteration % 4 === 3 && topologyExceededLayoutBudget(startedAt, budgetMs)) {
      break;
    }
  }
}

function resolveTopologyClusterObstacleCollisions(clusters, positions, bounds, obstacleNodeIds) {
  const clusterNodeIds = clusters.map((cluster) => [cluster.host.id, ...cluster.services.map((node) => node.id)]);
  const iterationLimit = clusters.length > 30 || obstacleNodeIds.size > 70 ? 16 : 30;
  const startedAt = topologyNowMs();
  const budgetMs = topologyMode === "advanced" ? 24 : 18;
  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    let moved = false;
    for (const nodeIds of clusterNodeIds) {
      const ownNodeIds = new Set(nodeIds);
      const clusterBounds = topologyClusterBounds(nodeIds, positions);
      if (!clusterBounds) {
        continue;
      }
      const clusterCenterX = clusterBounds.left + clusterBounds.width / 2;
      const clusterCenterY = clusterBounds.top + clusterBounds.height / 2;
      for (const obstacleId of obstacleNodeIds) {
        if (ownNodeIds.has(obstacleId)) {
          continue;
        }
        const obstaclePosition = positions.get(obstacleId);
        if (!obstaclePosition) {
          continue;
        }
        const obstacleBounds = topologyPositionRect(obstaclePosition, 30);
        const overlapX = Math.min(clusterBounds.right, obstacleBounds.right) - Math.max(clusterBounds.left, obstacleBounds.left);
        const overlapY = Math.min(clusterBounds.bottom, obstacleBounds.bottom) - Math.max(clusterBounds.top, obstacleBounds.top);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        const obstacleCenterX = obstacleBounds.left + obstacleBounds.width / 2;
        const obstacleCenterY = obstacleBounds.top + obstacleBounds.height / 2;
        if (overlapX < overlapY) {
          const direction = Math.sign(clusterCenterX - obstacleCenterX) || (clusterCenterX < bounds.width / 2 ? -1 : 1);
          shiftTopologyCluster(nodeIds, positions, direction * (overlapX + 22), 0, bounds);
        } else {
          const direction = Math.sign(clusterCenterY - obstacleCenterY) || (clusterCenterY < bounds.height / 2 ? -1 : 1);
          shiftTopologyCluster(nodeIds, positions, 0, direction * (overlapY + 22), bounds);
        }
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
    if (iteration % 4 === 3 && topologyExceededLayoutBudget(startedAt, budgetMs)) {
      break;
    }
  }
}

function renderTopologyGraph(nodes, links) {
  if (!nodes.length) {
    return "";
  }
  const nodeLimit = topologyMode === "advanced" ? 96 : 64;
  const nodesById = getTopologyNodeMap(nodes);
  const rootNode = nodes.find((node) => node.kind === "core-router")
    || nodes.find((node) => node.role === "network" && node.kind !== "subnet")
    || nodes.find((node) => node.kind === "subnet")
    || nodes[0];
  const adjacency = new Map();
  links.forEach((link) => {
    if (!nodesById.has(link.source) || !nodesById.has(link.target)) {
      return;
    }
    if (!adjacency.has(link.source)) {
      adjacency.set(link.source, []);
    }
    if (!adjacency.has(link.target)) {
      adjacency.set(link.target, []);
    }
    adjacency.get(link.source).push(link.target);
    adjacency.get(link.target).push(link.source);
  });
  const orderedNodeIds = [];
  const visited = new Set();
  const queue = [rootNode.id];
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const nodeId = queue[queueIndex];
    if (!nodeId || visited.has(nodeId) || !nodesById.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    orderedNodeIds.push(nodeId);
    const neighbors = (adjacency.get(nodeId) || [])
      .filter((neighborId) => !visited.has(neighborId))
      .sort((left, right) => {
        const leftNode = nodesById.get(left);
        const rightNode = nodesById.get(right);
        const rankDelta = topologyGraphNodeSortRank(leftNode) - topologyGraphNodeSortRank(rightNode);
        if (rankDelta) {
          return rankDelta;
        }
        return String(leftNode?.label || "").localeCompare(String(rightNode?.label || ""), getLanguage(), { sensitivity: "base" });
      });
    queue.push(...neighbors);
  }
  const graphNodes = orderedNodeIds.slice(0, nodeLimit).map((nodeId) => nodesById.get(nodeId)).filter(Boolean);
  const graphNodeIds = new Set(graphNodes.map((node) => node.id));
  const graphLinks = links.filter((link) => graphNodeIds.has(link.source) && graphNodeIds.has(link.target));
  const hostedServiceClusters = getTopologyHostedServiceClusters(graphNodes, graphLinks);
  const hypervisorGuestClusters = getTopologyHypervisorGuestClusters(graphNodes, graphLinks);
  const nodeServiceAccentById = new Map();
  graphLinks
    .filter((link) => link.kind === "host-service")
    .forEach((link) => {
      const accent = topologyHostServiceColor(link.source);
      nodeServiceAccentById.set(link.source, accent);
      nodeServiceAccentById.set(link.target, accent);
    });

  const linkParentPriority = {
    "core-subnet": 100,
    "hypervisor-guest": 90,
    "host-service": 80,
    "kubernetes-service-workload": 70,
    "core-member": 50,
    "subnet-member": 40,
  };
  const parentById = new Map();
  graphLinks
    .slice()
    .sort((left, right) => (linkParentPriority[right.kind] || 1) - (linkParentPriority[left.kind] || 1))
    .forEach((link) => {
      if (link.target === rootNode.id || parentById.has(link.target)) {
        return;
      }
      if (link.kind === "subnet-member" && nodesById.get(link.target)?.kind === "core-router") {
        return;
      }
      parentById.set(link.target, link.source);
    });

  const depthById = new Map([[rootNode.id, 0]]);
  const resolveDepth = (nodeId, stack = new Set()) => {
    if (depthById.has(nodeId)) {
      return depthById.get(nodeId);
    }
    if (stack.has(nodeId)) {
      depthById.set(nodeId, 2);
      return 2;
    }
    stack.add(nodeId);
    const parentId = parentById.get(nodeId);
    const node = nodesById.get(nodeId);
    let depth = 2;
    if (parentId && graphNodeIds.has(parentId)) {
      depth = resolveDepth(parentId, stack) + 1;
    } else if (node?.kind === "subnet") {
      depth = rootNode.kind === "core-router" ? 1 : 0;
    } else if (node?.kind === "hypervisor" || node?.kind === "switch") {
      depth = 2;
    } else if (node?.role === "workload") {
      depth = 4;
    }
    stack.delete(nodeId);
    depthById.set(nodeId, Math.min(6, depth));
    return depthById.get(nodeId);
  };
  graphNodes.forEach((node) => {
    resolveDepth(node.id);
  });

  const nodeWidth = 172;
  const nodeHeight = 58;
  const ringGap = topologyMode === "advanced" ? 190 : 154;
  const maxHostedServiceColumns = Math.max(
    0,
    ...hostedServiceClusters.map((cluster) => Math.min(topologyHostedServiceMaxColumns(), cluster.services.length)),
  );
  const maxHypervisorGuestColumns = Math.max(
    0,
    ...hypervisorGuestClusters.map((cluster) => Math.ceil(cluster.services.length / (topologyMode === "advanced" ? 6 : 5))),
  );
  const hostedClusterWidth = maxHostedServiceColumns
    ? nodeWidth * (maxHostedServiceColumns + 1) + 42 * maxHostedServiceColumns + 180
    : 0;
  const hypervisorClusterWidth = maxHypervisorGuestColumns
    ? nodeWidth * (maxHypervisorGuestColumns + 1) + 52 * maxHypervisorGuestColumns + 180
    : 0;
  const nodesByDepth = new Map();
  graphNodes.forEach((node) => {
    const depth = Math.min(6, depthById.get(node.id) || 0);
    nodesByDepth.set(depth, [...(nodesByDepth.get(depth) || []), node]);
  });
  const sortedDepths = [...nodesByDepth.keys()].sort((left, right) => left - right);
  const widestDepthCount = Math.max(1, ...[...nodesByDepth.values()].map((items) => items.length));
  const deepestDepth = Math.max(1, ...sortedDepths);
  const directedLaneCounts = new Map();
  graphNodes.forEach((node) => {
    const lane = node.id === rootNode.id ? 0 : topologyDirectedLane(node, depthById.get(node.id) || 1);
    directedLaneCounts.set(lane, (directedLaneCounts.get(lane) || 0) + 1);
  });
  const directedLaneCount = Math.max(1, directedLaneCounts.size);
  const directedMaxRows = Math.max(1, ...directedLaneCounts.values());
  const useDirectedLayout = graphNodes.length > (topologyMode === "advanced" ? 78 : 52)
    || graphLinks.length > (topologyMode === "advanced" ? 120 : 76)
    || hostedServiceClusters.reduce((sum, cluster) => sum + cluster.services.length, 0) > (topologyMode === "advanced" ? 42 : 28);
  const breadthPressure = Math.min(0.72, widestDepthCount * 0.024);
  const depthPressure = Math.min(0.28, deepestDepth * 0.035);
  const ringScaleX = (topologyMode === "advanced" ? 1.34 : 1.24) + breadthPressure;
  const ringScaleY = (topologyMode === "advanced" ? 0.72 : 0.78) + depthPressure;
  const ringRadii = new Map([[0, 0]]);
  let previousRadius = 0;
  sortedDepths.forEach((depth) => {
    if (depth === 0) {
      return;
    }
    const count = nodesByDepth.get(depth)?.length || 1;
    const circumferenceSpacing = topologyMode === "advanced" ? 252 : 224;
    const minimumForCount = Math.ceil((count * circumferenceSpacing) / (Math.PI * 2));
    const radius = Math.max(previousRadius + ringGap, 124 + depth * 44, minimumForCount);
    ringRadii.set(depth, radius);
    previousRadius = radius;
  });
  const maxRadius = Math.max(260, ...ringRadii.values());
  const maxRadiusX = maxRadius * ringScaleX;
  const maxRadiusY = maxRadius * ringScaleY;
  const directedWidth = directedLaneCount * (topologyMode === "advanced" ? 328 : 292) + nodeWidth + 144;
  const directedHeight = directedMaxRows * (nodeHeight + (topologyMode === "advanced" ? 54 : 46)) + 140;
  const width = Math.ceil(Math.max(1160, (maxRadiusX + nodeWidth + 144) * 2, hostedClusterWidth * 2, hypervisorClusterWidth * 2, directedWidth));
  const height = Math.ceil(Math.max(760, (maxRadiusY + nodeHeight + 118) * 2, directedHeight));
  const centerX = width / 2;
  const centerY = height / 2;
  const availableWidth = Math.max(720, (elements.topologyMapCanvas?.clientWidth || 1120) - 36);
  const availableHeight = Math.max(420, Math.min(window.innerHeight * 0.82, 1040) - 24);
  const fitZoomRaw = Math.max(
    TOPOLOGY_ZOOM_MIN,
    Math.min(1, availableWidth / width, availableHeight / height),
  );
  const fitZoom = Math.round(fitZoomRaw * 100) / 100;
  const defaultZoom = Math.max(fitZoom, TOPOLOGY_ZOOM_DEFAULT);
  const effectiveZoom = topologyZoomUserAdjusted ? Math.max(topologyZoom, fitZoom) : defaultZoom;
  if (!topologyZoomUserAdjusted) {
    topologyZoom = effectiveZoom;
  }
  const zoomSliderValue = TOPOLOGY_ZOOM_MAX > fitZoom
    ? Math.min(100, Math.max(0, Math.round(((effectiveZoom - fitZoom) / (TOPOLOGY_ZOOM_MAX - fitZoom)) * 100)))
    : 0;
  const positions = new Map();
  const angleById = new Map([[rootNode.id, -Math.PI / 2]]);
  if (useDirectedLayout) {
    layoutTopologyDirectedRows(graphNodes, positions, { width, height }, nodeWidth, nodeHeight, rootNode, depthById, parentById, nodesById);
  } else {
    sortedDepths.forEach((depth) => {
    const depthNodes = nodesByDepth.get(depth) || [];
    const sortedDepthNodes = depthNodes
      .slice()
      .sort((left, right) => {
        const leftParentAngle = angleById.get(parentById.get(left.id)) ?? 0;
        const rightParentAngle = angleById.get(parentById.get(right.id)) ?? 0;
        if (leftParentAngle !== rightParentAngle) {
          return leftParentAngle - rightParentAngle;
        }
        const rankDelta = topologyGraphNodeSortRank(left) - topologyGraphNodeSortRank(right);
        if (rankDelta) {
          return rankDelta;
        }
        return String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" });
      });
    const siblingsByParent = new Map();
    sortedDepthNodes.forEach((node) => {
      const parentId = parentById.get(node.id);
      if (!parentId) {
        return;
      }
      siblingsByParent.set(parentId, [...(siblingsByParent.get(parentId) || []), node]);
    });
    const nodesByLayoutClass = new Map();
    sortedDepthNodes.forEach((node) => {
      const layoutClass = topologyLayoutClass(node);
      nodesByLayoutClass.set(layoutClass, [...(nodesByLayoutClass.get(layoutClass) || []), node]);
    });
    if (depth === 0) {
      sortedDepthNodes.forEach((node, index) => {
        positions.set(node.id, {
          x: centerX - nodeWidth / 2,
          y: centerY - nodeHeight / 2 + index * (nodeHeight + 10),
          width: nodeWidth,
          height: nodeHeight,
        });
      });
      return;
    }
    const radius = ringRadii.get(depth) || previousRadius || ringGap;
    const radiusX = radius * ringScaleX;
    const radiusY = radius * ringScaleY;
    const count = sortedDepthNodes.length;
    sortedDepthNodes.forEach((node, index) => {
      const layoutClass = topologyLayoutClass(node);
      const classNodes = nodesByLayoutClass.get(layoutClass) || sortedDepthNodes;
      const classIndex = Math.max(0, classNodes.findIndex((item) => item.id === node.id));
      let angle = topologySemanticAngle(node, classIndex, classNodes.length);
      const parentId = parentById.get(node.id);
      const parentAngle = angleById.get(parentId);
      const siblingGroup = siblingsByParent.get(parentId) || [];
      if (depth > 1 && parentId && parentAngle !== undefined && siblingGroup.length <= 18) {
        const siblingIndex = siblingGroup.findIndex((sibling) => sibling.id === node.id);
        angle = topologyChildFanAngle(parentAngle, node, siblingIndex, siblingGroup.length);
      }
      if (node.role === "iot") {
        angle = topologySemanticAngle(node, classIndex, classNodes.length);
      } else if (node.kind === "hypervisor") {
        angle -= 0.08;
      } else if (node.role === "workload") {
        angle += 0.08;
      }
      const layoutRadiusMultiplier = layoutClass === "service" || layoutClass === "kubernetes"
        ? 1.08
        : (layoutClass === "iot" ? 1.06 : 1);
      angleById.set(node.id, angle);
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radiusX * layoutRadiusMultiplier - nodeWidth / 2,
        y: centerY + Math.sin(angle) * radiusY * layoutRadiusMultiplier - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
      });
    });
  });
  }
  if (!useDirectedLayout) {
    resolveTopologyGraphCollisions(graphNodes, positions, { width, height }, new Set([rootNode.id]));
  }
  const protectedNodeIds = getTopologyProtectedNodeIds(graphNodes);
  const clusterObstacleNodeIds = useDirectedLayout ? new Set() : protectedNodeIds;
  const hypervisorClusterNodeIds = layoutTopologyHypervisorGuestRows(
    hypervisorGuestClusters,
    positions,
    { width, height },
    nodeWidth,
    nodeHeight,
    clusterObstacleNodeIds,
  );
  if (!useDirectedLayout) {
    resolveTopologyClusterObstacleCollisions(hypervisorGuestClusters, positions, { width, height }, protectedNodeIds);
  }
  if (!useDirectedLayout) {
    resolveTopologyHostedServiceClusterCollisions(hypervisorGuestClusters, positions, { width, height });
  }
  const hostedClusterNodeIds = layoutTopologyHostedServiceRows(
    hostedServiceClusters,
    positions,
    { width, height },
    nodeWidth,
    nodeHeight,
    parentById,
    nodesById,
    useDirectedLayout ? new Set([...hypervisorClusterNodeIds]) : new Set([...protectedNodeIds, ...hypervisorClusterNodeIds]),
  );
  if (!useDirectedLayout) {
    resolveTopologyClusterObstacleCollisions(
      hostedServiceClusters,
      positions,
      { width, height },
      new Set([...protectedNodeIds, ...hypervisorClusterNodeIds]),
    );
    resolveTopologyHostedServiceClusterCollisions(hostedServiceClusters, positions, { width, height });
    resolveTopologyHostedServiceClusterCollisions([...hypervisorGuestClusters, ...hostedServiceClusters], positions, { width, height });
    resolveTopologyClusterObstacleCollisions(
      [...hypervisorGuestClusters, ...hostedServiceClusters],
      positions,
      { width, height },
      protectedNodeIds,
    );
  }
  if (!useDirectedLayout) {
    resolveTopologyGraphCollisions(
      graphNodes,
      positions,
      { width, height },
      new Set([rootNode.id, ...hypervisorClusterNodeIds, ...hostedClusterNodeIds]),
    );
  }
  const rootPosition = positions.get(rootNode.id) || {
    x: centerX - nodeWidth / 2,
    y: centerY - nodeHeight / 2,
    width: nodeWidth,
    height: nodeHeight,
  };
  const rootCenterX = rootPosition.x + rootPosition.width / 2;
  const rootCenterY = rootPosition.y + rootPosition.height / 2;

  const linkPaths = graphLinks.map((link) => {
    const sourceDepth = depthById.get(link.source) || 0;
    const targetDepth = depthById.get(link.target) || 0;
    const displaySourceId = sourceDepth > targetDepth ? link.target : link.source;
    const displayTargetId = sourceDepth > targetDepth ? link.source : link.target;
    const source = positions.get(displaySourceId);
    const target = positions.get(displayTargetId);
    if (!source || !target) {
      return "";
    }
    const sourcePoint = topologyGraphEdgePoint(source, target);
    const targetPoint = topologyGraphEdgePoint(target, source);
    const sx = sourcePoint.x;
    const sy = sourcePoint.y;
    const tx = targetPoint.x;
    const ty = targetPoint.y;
    const midpointX = (sx + tx) / 2;
    const midpointY = (sy + ty) / 2;
    const bend = link.kind === "core-member" ? 0.06 : (link.kind === "subnet-member" ? 0.08 : 0.14);
    const c1x = midpointX + (centerY - midpointY) * bend;
    const c1y = midpointY - (centerX - midpointX) * bend;
    const hostServiceAccent = link.kind === "host-service" ? topologyHostServiceColor(link.source) : "";
    const linkStyle = hostServiceAccent ? ` style="--topology-service-accent: ${escapeHtml(hostServiceAccent)};"` : "";
    const markerId = link.kind === "host-service"
      ? topologyHostServiceMarkerId(link.source)
      : topologyLinkMarkerId(link.kind);
    return `
      <path
        class="topology-graph-link topology-graph-link--${escapeHtml(link.confidence || "low")} topology-graph-link--${escapeHtml(link.kind || "related")}"
        ${linkStyle}
        d="M ${sx} ${sy} Q ${c1x} ${c1y}, ${tx} ${ty}"
        marker-end="url(#${escapeHtml(markerId)})"
      >
        <title>${escapeHtml(`${formatTopologyLabel("topology_link", link.kind)} · ${formatTopologyLabel("topology_confidence", link.confidence)}`)}</title>
      </path>
    `;
  }).join("");

  const ringItems = useDirectedLayout ? "" : sortedDepths
    .filter((depth) => depth > 0)
    .map((depth) => {
      const radius = ringRadii.get(depth) || 0;
      return `<ellipse class="topology-graph-ring" cx="${centerX}" cy="${centerY}" rx="${radius * ringScaleX}" ry="${radius * ringScaleY}"></ellipse>`;
    }).join("");
  const nodeItems = graphNodes.map((node) => {
    const position = positions.get(node.id);
    if (!position) {
      return "";
    }
    const metadata = node.metadata && typeof node.metadata === "object" ? node.metadata : {};
    const detail = node.cidr || node.ip || metadata.deviceClass || metadata.location || metadata.room || formatTopologyLabel("topology_source", node.source);
    const serviceAccent = nodeServiceAccentById.get(node.id) || "";
    const serviceAccentClass = serviceAccent ? " topology-graph-node--service-accent" : "";
    const serviceAccentStyle = serviceAccent ? ` style="--topology-service-accent: ${escapeHtml(serviceAccent)};"` : "";
    return `
      <g class="topology-graph-node topology-graph-node--${escapeHtml(node.role || "unknown")} topology-graph-node--kind-${escapeHtml(node.kind || "unknown")} topology-graph-node--${escapeHtml(node.status || "unknown")}${serviceAccentClass}"${serviceAccentStyle} transform="translate(${position.x} ${position.y})" role="button" tabindex="0" data-topology-node-id="${escapeHtml(node.id)}">
        <title>${escapeHtml([node.label || node.id, node.cidr || node.ip, formatTopologyLabel("topology_kind", node.kind)].filter(Boolean).join(" · "))}</title>
        <rect width="${nodeWidth}" height="${nodeHeight}" rx="8" ry="8"></rect>
        <circle class="topology-graph-node__status" cx="16" cy="19" r="5"></circle>
        <text class="topology-graph-node__label" x="28" y="24">${escapeHtml(truncateTopologyGraphText(node.label || node.id, 22))}</text>
        <text class="topology-graph-node__meta" x="14" y="44">${escapeHtml(truncateTopologyGraphText(`${formatTopologyLabel("topology_kind", node.kind)}${detail ? ` · ${detail}` : ""}`, 28))}</text>
      </g>
    `;
  }).join("");
  const limitedNote = nodes.length > graphNodes.length
    ? `<p class="secondary-line">${escapeHtml(t("topology_graph_limited", { shown: graphNodes.length, total: nodes.length }))}</p>`
    : "";
  const graphSources = [...new Set([
    ...graphNodes.map((node) => node.graphSource),
    ...graphLinks.map((link) => link.graphSource),
  ].filter(Boolean))].sort();
  const linkKinds = [...new Set(graphLinks.map((link) => link.kind || "related"))]
    .sort((left, right) => String(left).localeCompare(String(right), getLanguage(), { sensitivity: "base" }));
  const confidences = [...new Set(graphLinks.map((link) => link.confidence || "low"))]
    .sort((left, right) => ({ high: 0, medium: 1, low: 2 }[left] ?? 3) - ({ high: 0, medium: 1, low: 2 }[right] ?? 3));
  const hostServiceMarkerDefs = TOPOLOGY_HOST_SERVICE_COLORS.map((color, index) => `
    <marker id="topology-arrow-host-service-${index}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${escapeHtml(color)}"></path>
    </marker>
  `).join("");

  return `
    <section class="topology-graph-panel">
      <div class="topology-column__heading">
        <span>${escapeHtml(t("topology_graph_title"))}</span>
        <div class="topology-graph-tools">
          <label>
            <span>${escapeHtml(t("topology_zoom_label"))}</span>
            <input id="topology-zoom-range" type="range" min="0" max="100" step="1" value="${zoomSliderValue}" data-min-zoom="${fitZoom}" data-max-zoom="${TOPOLOGY_ZOOM_MAX}">
          </label>
          <button type="button" class="row-button" id="topology-fullscreen-button">${escapeHtml(t("topology_fullscreen_label"))}</button>
          <button type="button" class="row-button" id="topology-export-svg-button">${escapeHtml(t("topology_export_svg_label"))}</button>
          <button type="button" class="row-button" id="topology-export-png-button">${escapeHtml(t("topology_export_png_label"))}</button>
          <button type="button" class="row-button" id="topology-export-json-button">${escapeHtml(t("topology_export_json_label"))}</button>
          <strong>${escapeHtml(t("topology_counter", { nodes: graphNodes.length, links: graphLinks.length }))}</strong>
        </div>
      </div>
      <div class="topology-graph-legend" aria-label="${escapeHtml(t("topology_graph_legend"))}">
        ${linkKinds.map((kind) => `
          <span class="topology-graph-legend__item">
            <i class="topology-graph-legend__line topology-graph-legend__line--${escapeHtml(kind)}"></i>
            ${escapeHtml(formatTopologyLabel("topology_link", kind))}
          </span>
        `).join("")}
        ${confidences.map((confidence) => `
          <span class="topology-graph-legend__item">
            <i class="topology-graph-legend__line topology-graph-legend__line--${escapeHtml(confidence)}"></i>
            ${escapeHtml(formatTopologyLabel("topology_confidence", confidence))}
          </span>
        `).join("")}
        ${graphSources.map((source) => `
          <span class="topology-graph-legend__item">
            <i class="topology-graph-legend__dot"></i>
            ${escapeHtml(formatTopologyLabel("topology_graph_source", source))}
          </span>
        `).join("")}
      </div>
      <div class="topology-graph-scroll">
        <div class="topology-graph-zoom" data-topology-graph-zoom data-topology-graph-width="${width}" data-topology-graph-height="${height}" data-topology-root-x="${rootCenterX}" data-topology-root-y="${rootCenterY}" style="width: ${width}px; height: ${height}px;">
          <svg class="topology-graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t("topology_graph_title"))}">
            <defs>
              ${hostServiceMarkerDefs}
              ${[...new Set([...linkKinds, "related"])].map((kind) => `
                <marker id="${escapeHtml(topologyLinkMarkerId(kind))}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z"></path>
                </marker>
              `).join("")}
            </defs>
            <g class="topology-graph-grid">${ringItems}</g>
            <g class="topology-graph-links">${linkPaths}</g>
            <g class="topology-graph-nodes">${nodeItems}</g>
          </svg>
        </div>
      </div>
      ${limitedNote}
    </section>
  `;
}

function renderTopologySubnetMap(nodes, links) {
  const nodesById = getTopologyNodeMap(nodes);
  const hostServiceTargets = new Set(
    links
      .filter((link) => link.kind === "host-service")
      .map((link) => link.target)
  );
  const subnetNodes = nodes
    .filter((node) => node.kind === "subnet")
    .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" }));
  if (!subnetNodes.length) {
    return "";
  }

  const subnetCards = subnetNodes.map((subnet) => {
    const memberLinks = links.filter((link) => link.kind === "subnet-member" && link.source === subnet.id);
    const directMembers = memberLinks
      .map((link) => nodesById.get(link.target))
      .filter(Boolean)
      .filter((node) => !hostServiceTargets.has(node.id))
      .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" }));
    const memberIds = new Set(directMembers.map((node) => node.id));
    const orphanServices = memberLinks
      .map((link) => nodesById.get(link.target))
      .filter(Boolean)
      .filter((node) => hostServiceTargets.has(node.id) && !links.some((link) => link.kind === "host-service" && memberIds.has(link.source) && link.target === node.id));
    const branches = [...directMembers, ...orphanServices].map((member) => {
      const services = links
        .filter((link) => link.kind === "host-service" && link.source === member.id)
        .map((link) => nodesById.get(link.target))
        .filter(Boolean)
        .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" }));
      return `
        <div class="topology-flow-branch">
          ${renderTopologyCompactNode(member)}
          ${services.length ? `
            <div class="topology-flow-children" aria-label="${escapeHtml(t("topology_branch_services"))}">
              ${services.map((service) => renderTopologyCompactNode(service, { maxDetails: 1 })).join("")}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");
    return `
      <article class="topology-flow-card">
        <div class="topology-flow-card__heading">
          <div>
            <strong>${escapeHtml(subnet.label || subnet.id)}</strong>
            <span>${escapeHtml(subnet.cidr || "")}</span>
          </div>
          <code>${escapeHtml(t("topology_branch_hosts", { count: directMembers.length + orphanServices.length }))}</code>
        </div>
        <div class="topology-flow-chain">
          <div class="topology-flow-root">${renderTopologyCompactNode(subnet)}</div>
          <div class="topology-flow-branches">
            ${branches || `<div class="secondary-line">${escapeHtml(t("topology_subnet_empty"))}</div>`}
          </div>
        </div>
      </article>
    `;
  }).join("");

  return `
    <section class="topology-flow-section">
      <div class="topology-column__heading">
        <span>${escapeHtml(t("topology_subnet_map_title"))}</span>
        <strong>${escapeHtml(String(subnetNodes.length))}</strong>
      </div>
      <div class="topology-flow-grid">${subnetCards}</div>
    </section>
  `;
}

function renderTopologyComputeMap(nodes, links) {
  const nodesById = getTopologyNodeMap(nodes);
  const hypervisorNodes = nodes
    .filter((node) => node.kind === "hypervisor")
    .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" }));
  if (!hypervisorNodes.length) {
    return "";
  }

  const computeCards = hypervisorNodes.map((hypervisor) => {
    const guests = links
      .filter((link) => link.kind === "hypervisor-guest" && link.source === hypervisor.id)
      .map((link) => nodesById.get(link.target))
      .filter(Boolean)
      .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" }));
    return `
      <article class="topology-flow-card topology-flow-card--compute">
        <div class="topology-flow-card__heading">
          <div>
            <strong>${escapeHtml(hypervisor.label || hypervisor.id)}</strong>
            <span>${escapeHtml(formatTopologyLabel("topology_kind", hypervisor.kind))}</span>
          </div>
          <code>${escapeHtml(t("topology_branch_guests", { count: guests.length }))}</code>
        </div>
        <div class="topology-flow-chain">
          <div class="topology-flow-root">${renderTopologyCompactNode(hypervisor)}</div>
          <div class="topology-flow-branches">
            ${guests.length ? guests.map((guest) => `
              <div class="topology-flow-branch">${renderTopologyCompactNode(guest)}</div>
            `).join("") : `<div class="secondary-line">${escapeHtml(t("topology_compute_empty"))}</div>`}
          </div>
        </div>
      </article>
    `;
  }).join("");

  return `
    <section class="topology-flow-section">
      <div class="topology-column__heading">
        <span>${escapeHtml(t("topology_compute_map_title"))}</span>
        <strong>${escapeHtml(String(hypervisorNodes.length))}</strong>
      </div>
      <div class="topology-flow-grid">${computeCards}</div>
    </section>
  `;
}

function renderTopologyNodeCard(node, linksByNode, interfacesByNode) {
  const nodeLinks = linksByNode.get(node.id) || [];
  const nodeInterfaces = (interfacesByNode.get(node.id) || []).slice(0, 6);
  const metadata = node.metadata && typeof node.metadata === "object" ? node.metadata : {};
  const details = [
    node.cidr,
    node.ip,
    node.mac,
    metadata.os,
    metadata.ports,
    metadata.deviceClass,
    metadata.manufacturer,
    metadata.model,
    metadata.location || metadata.room,
    metadata.battery ? `${t("topology_iot_battery")}: ${metadata.battery}` : "",
    metadata.signal ? `${t("topology_iot_signal")}: ${metadata.signal}` : "",
  ].filter(Boolean).slice(0, topologyMode === "advanced" ? 5 : 3);
  return `
    <article class="topology-node topology-node--${escapeHtml(node.role || "unknown")}">
      <div class="topology-node__top">
        <strong>${escapeHtml(node.label || node.id)}</strong>
        <span class="status-badge status-badge--${topologyStatusBadgeClass(node.status)}">
          ${escapeHtml(formatTopologyLabel("topology_status", node.status))}
        </span>
      </div>
      <div class="topology-node__meta">
        <span>${escapeHtml(formatTopologyLabel("topology_kind", node.kind))}</span>
        <span>${escapeHtml(formatTopologyLabel("topology_source", node.source))}</span>
        ${node.graphSource ? `<span>${escapeHtml(formatTopologyLabel("topology_graph_source", node.graphSource))}</span>` : ""}
        ${nodeLinks.length ? `<span>${escapeHtml(t("topology_node_links", { count: nodeLinks.length }))}</span>` : ""}
      </div>
      ${details.length ? `<div class="topology-node__details">${details.map((item) => `<code>${escapeHtml(String(item))}</code>`).join("")}</div>` : ""}
      ${topologyMode === "advanced" && nodeInterfaces.length ? `
        <div class="topology-node__interfaces">
          ${nodeInterfaces.map((item) => `<span>${escapeHtml([item.ip, item.mac].filter(Boolean).join(" / "))}</span>`).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function getTopologyNodePopover() {
  let popover = document.querySelector(".topology-node-popover");
  if (popover) {
    return popover;
  }

  popover = document.createElement("aside");
  popover.className = "topology-node-popover";
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  document.body.append(popover);
  return popover;
}

function hideTopologyNodePopover() {
  const popover = document.querySelector(".topology-node-popover");
  if (popover) {
    popover.hidden = true;
  }
}

function buildTopologyNodePopoverIndex(nodes, interfaces) {
  topologyPopoverNodeById = new Map(nodes.map((node) => [node.id, node]));
  topologyPopoverInterfacesByNode = new Map();
  interfaces.forEach((item) => {
    if (!topologyPopoverNodeById.has(item.nodeId)) {
      return;
    }
    if (!topologyPopoverInterfacesByNode.has(item.nodeId)) {
      topologyPopoverInterfacesByNode.set(item.nodeId, []);
    }
    topologyPopoverInterfacesByNode.get(item.nodeId).push(item);
  });
}

function topologyNodeMetadataValue(node, ...keys) {
  const metadata = node?.metadata && typeof node.metadata === "object" ? node.metadata : {};
  for (const key of keys) {
    const value = metadata[key];
    if (Array.isArray(value) && value.length) {
      return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
    }
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function getTopologyNodePopoverRows(node, interfaces) {
  const ip = node.ip
    || topologyNodeMetadataValue(node, "primaryIp", "ip", "podIP", "clusterIP")
    || interfaces.map((item) => item.ip).filter(Boolean)[0]
    || "";
  const ports = topologyNodeMetadataValue(node, "ports", "port", "containerPorts");
  const accessPort = topologyNodeMetadataValue(node, "accessPort", "nodePort", "publishedPort");
  const serviceUrl = topologyNodeMetadataValue(node, "serviceUrl", "url", "publicUrl");
  const host = topologyNodeMetadataValue(node, "host", "hostName", "hostSourceId", "nodeName");
  const os = topologyNodeMetadataValue(node, "os", "image", "version");
  const reachable = serviceUrl || (ip && accessPort ? `${ip}:${accessPort}` : "");
  return [
    ["IP", ip],
    ["Access", reachable],
    ["Ports", [ports, accessPort && !String(ports).includes(accessPort) ? accessPort : ""].filter(Boolean).join(" / ")],
    ["URL", serviceUrl],
    ["Host", host],
    ["Kind", formatTopologyLabel("topology_kind", node.kind)],
    ["Status", formatTopologyLabel("topology_status", node.status)],
    ["Source", formatTopologyLabel("topology_source", node.source)],
    ["OS/Image", os],
    ["MAC", node.mac || topologyNodeMetadataValue(node, "mac")],
  ].filter(([, value]) => String(value || "").trim());
}

function renderTopologyNodePopover(node, interfaces) {
  const rows = getTopologyNodePopoverRows(node, interfaces);
  const primaryAccess = rows.find(([label]) => ["Access", "URL", "IP"].includes(label))?.[1] || "";
  return `
    <div class="topology-node-popover__header">
      <div>
        <strong>${escapeHtml(node.label || node.id)}</strong>
        <span>${escapeHtml([formatTopologyLabel("topology_kind", node.kind), node.agentName].filter(Boolean).join(" · "))}</span>
      </div>
      <button type="button" class="ghost-button topology-node-popover__close" aria-label="${escapeHtml(t("close_button"))}">×</button>
    </div>
    ${primaryAccess ? `<code class="topology-node-popover__primary">${escapeHtml(primaryAccess)}</code>` : ""}
    <dl class="topology-node-popover__details">
      ${rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function positionTopologyNodePopover(popover, clientX, clientY) {
  const gap = 14;
  const padding = 12;
  popover.style.left = `${padding}px`;
  popover.style.top = `${padding}px`;
  const rect = popover.getBoundingClientRect();
  const left = Math.min(
    Math.max(padding, clientX + gap),
    Math.max(padding, window.innerWidth - rect.width - padding),
  );
  const top = Math.min(
    Math.max(padding, clientY + gap),
    Math.max(padding, window.innerHeight - rect.height - padding),
  );
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function showTopologyNodePopover(nodeId, clientX, clientY) {
  const node = topologyPopoverNodeById.get(nodeId);
  if (!node) {
    hideTopologyNodePopover();
    return;
  }
  const nodeInterfaces = (topologyPopoverInterfacesByNode.get(nodeId) || []).slice(0, 8);
  const popover = getTopologyNodePopover();
  popover.innerHTML = renderTopologyNodePopover(node, nodeInterfaces);
  popover.hidden = false;
  positionTopologyNodePopover(popover, clientX, clientY);
  popover.querySelector(".topology-node-popover__close")?.addEventListener("click", hideTopologyNodePopover, { once: true });
}

function renderTopologyMap() {
  if (!elements.topologyMapCanvas) {
    return;
  }
  hideTopologyNodePopover();
  const effectiveRequestSignature = getTopologyRenderRequestSignature();
  if (
    effectiveRequestSignature
    && topologyLastRenderRequestSignature === effectiveRequestSignature
    && elements.topologyMapCanvas.dataset.topologyRenderSignature === effectiveRequestSignature
  ) {
    return;
  }
  syncTopologyFilterOptions();
  const { nodes, links, interfaces, subnets } = getFilteredTopology();
  buildTopologyNodePopoverIndex(nodes, interfaces);
  renderTopologySummary(nodes, links, interfaces, subnets);
  const subnetContext = renderTopologySubnetContext(subnets, nodes);
  if (!nodes.length) {
    elements.topologyMapCanvas.innerHTML = `
      ${subnetContext}
      <div class="result-card result-card--muted">${escapeHtml(t("topology_empty"))}</div>
    `;
    topologyLastRenderRequestSignature = effectiveRequestSignature;
    elements.topologyMapCanvas.dataset.topologyRenderSignature = effectiveRequestSignature;
    return;
  }

  const graphMap = renderTopologyGraph(nodes, links);
  const renderAdvancedDetails = topologyMode === "advanced" && nodes.length <= 80 && links.length <= 140;
  const nodesById = renderAdvancedDetails ? getTopologyNodeMap(nodes) : new Map();
  const linksByNode = new Map();
  const interfacesByNode = new Map();
  let groupedNodes = [];
  let linkRows = "";
  if (renderAdvancedDetails) {
    links.forEach((link) => {
      if (!linksByNode.has(link.source)) {
        linksByNode.set(link.source, []);
      }
      if (!linksByNode.has(link.target)) {
        linksByNode.set(link.target, []);
      }
      linksByNode.get(link.source).push(link);
      linksByNode.get(link.target).push(link);
    });
    interfaces.forEach((item) => {
      if (!interfacesByNode.has(item.nodeId)) {
        interfacesByNode.set(item.nodeId, []);
      }
      interfacesByNode.get(item.nodeId).push(item);
    });

    const roleOrder = ["network", "host", "compute", "workload", "iot"];
    const detailNodeLimitPerGroup = 90;
    groupedNodes = roleOrder.map((role) => ({
      role,
      nodes: nodes
        .filter((node) => node.role === role)
        .sort((left, right) => String(left.label || "").localeCompare(String(right.label || ""), getLanguage(), { sensitivity: "base" })),
    }))
      .map((group) => ({
        ...group,
        total: group.nodes.length,
        nodes: group.nodes.slice(0, detailNodeLimitPerGroup),
      }))
      .filter((group) => group.total);

    linkRows = links.slice(0, 80).map((link) => {
      const source = nodesById.get(link.source);
      const target = nodesById.get(link.target);
      return `
        <li class="topology-link-row topology-link-row--${escapeHtml(link.confidence || "low")}">
          <span>${escapeHtml(source?.label || link.source)}</span>
          <span>${escapeHtml(formatTopologyLabel("topology_link", link.kind))}</span>
          <span>${escapeHtml(target?.label || link.target)}</span>
          <code>${escapeHtml([
            formatTopologyLabel("topology_confidence", link.confidence),
            link.graphSource ? formatTopologyLabel("topology_graph_source", link.graphSource) : "",
          ].filter(Boolean).join(" · "))}</code>
        </li>
      `;
    }).join("");
  }
  const computeMap = renderAdvancedDetails ? renderTopologyComputeMap(nodes, links) : "";
  const detailPanels = renderAdvancedDetails ? `
    ${computeMap}
    <div class="topology-columns">
      ${groupedNodes.map((group) => `
        <section class="topology-column">
          <div class="topology-column__heading">
            <span>${escapeHtml(formatTopologyLabel("topology_role", group.role))}</span>
            <strong>${escapeHtml(String(group.total))}</strong>
          </div>
          <div class="topology-column__nodes">
            ${group.nodes.map((node) => renderTopologyNodeCard(node, linksByNode, interfacesByNode)).join("")}
            ${group.total > group.nodes.length ? `<p class="secondary-line">${escapeHtml(t("topology_graph_limited", { shown: group.nodes.length, total: group.total }))}</p>` : ""}
          </div>
        </section>
      `).join("")}
    </div>
    <section class="topology-links-panel">
      <div class="topology-column__heading">
        <span>${escapeHtml(t("topology_links_title"))}</span>
        <strong>${escapeHtml(String(links.length))}</strong>
      </div>
      ${links.length ? `<ul class="topology-link-list">${linkRows}</ul>` : `<div class="secondary-line">${escapeHtml(t("topology_links_empty"))}</div>`}
    </section>
  ` : "";

  elements.topologyMapCanvas.innerHTML = `
    ${subnetContext}
    ${graphMap}
    ${detailPanels}
  `;
  topologyLastRenderRequestSignature = effectiveRequestSignature;
  elements.topologyMapCanvas.dataset.topologyRenderSignature = effectiveRequestSignature;
  elements.topologyMapCanvas.querySelector("#topology-zoom-range")?.addEventListener("input", (event) => {
    const range = event.currentTarget;
    const minZoom = Number(range.dataset.minZoom || TOPOLOGY_ZOOM_MIN);
    const maxZoom = Number(range.dataset.maxZoom || TOPOLOGY_ZOOM_MAX);
    const progress = Math.min(1, Math.max(0, Number(range.value || 0) / 100));
    setTopologyZoom(minZoom + (maxZoom - minZoom) * progress, { render: false });
  });
  const graphScroll = elements.topologyMapCanvas.querySelector(".topology-graph-scroll");
  const graphPanel = elements.topologyMapCanvas.querySelector(".topology-graph-panel");
  centerTopologyGraphIfNeeded();
  graphScroll?.addEventListener("click", (event) => {
    const nodeElement = event.target.closest(".topology-graph-node");
    if (!nodeElement) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    showTopologyNodePopover(nodeElement.dataset.topologyNodeId || "", event.clientX, event.clientY);
  });
  graphScroll?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const nodeElement = event.target.closest(".topology-graph-node");
    if (!nodeElement) {
      return;
    }
    event.preventDefault();
    const rect = nodeElement.getBoundingClientRect();
    showTopologyNodePopover(
      nodeElement.dataset.topologyNodeId || "",
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  });
  graphScroll?.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) {
      if (!document.fullscreenElement) {
        event.preventDefault();
        window.scrollBy({
          top: event.deltaY,
          left: event.shiftKey ? event.deltaY : event.deltaX,
          behavior: "auto",
        });
      }
      return;
    }
    event.preventDefault();
    const currentZoom = topologyZoom;
    const wheelUnits = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    const zoomFactor = Math.exp(-wheelUnits * 0.001);
    setTopologyZoom(currentZoom * zoomFactor, { render: false, anchorEvent: event });
  }, { passive: false });
  graphScroll?.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (event.target.closest(".topology-graph-node")) {
      return;
    }
    hideTopologyNodePopover();
    topologyPanState = {
      startX: event.clientX,
      startY: event.clientY,
      panX: topologyPanX,
      panY: topologyPanY,
    };
    graphScroll.classList.add("topology-graph-scroll--dragging");
    event.preventDefault();
  });
  graphScroll?.addEventListener("mousemove", (event) => {
    if (!topologyPanState) {
      return;
    }
    topologyPanUserAdjusted = true;
    topologyPanX = topologyPanState.panX + (event.clientX - topologyPanState.startX);
    topologyPanY = topologyPanState.panY + (event.clientY - topologyPanState.startY);
    applyTopologyViewportToRenderedGraph();
  });
  const stopTopologyPan = () => {
    topologyPanState = null;
    graphScroll?.classList.remove("topology-graph-scroll--dragging");
  };
  graphScroll?.addEventListener("mouseup", stopTopologyPan);
  graphScroll?.addEventListener("mouseleave", stopTopologyPan);
  elements.topologyMapCanvas.querySelector("#topology-fullscreen-button")?.addEventListener("click", async () => {
    if (!graphPanel) {
      return;
    }
    try {
      if (document.fullscreenElement === graphPanel) {
        await document.exitFullscreen();
      } else if (graphPanel.requestFullscreen) {
        await graphPanel.requestFullscreen();
      }
      window.setTimeout(() => {
        topologyPanUserAdjusted = false;
        centerTopologyGraphIfNeeded();
      }, 80);
    } catch (error) {
      console.warn("Topology fullscreen failed", error);
    }
  });
  elements.topologyMapCanvas.querySelector("#topology-export-svg-button")?.addEventListener("click", exportTopologySvg);
  elements.topologyMapCanvas.querySelector("#topology-export-png-button")?.addEventListener("click", () => {
    void exportTopologyPng();
  });
  elements.topologyMapCanvas.querySelector("#topology-export-json-button")?.addEventListener("click", exportTopologyJson);
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

function renderServiceHostOptions(selectedId = "") {
  if (!elements.serviceHostSelect) {
    return;
  }

  const hosts = getInventoryDevices()
    .slice()
    .sort((left, right) => {
      const ipDiff = ipToInt(left.ip) - ipToInt(right.ip);
      if (ipDiff !== 0) {
        return ipDiff;
      }
      return left.name.localeCompare(right.name, getLanguage());
    });
  const options = [`<option value="">${escapeHtml(t("select_service_host"))}</option>`];

  hosts.forEach((device) => {
    options.push(
      `<option value="${escapeHtml(device.id)}">${escapeHtml(device.name)} · ${escapeHtml(device.ip)}</option>`
    );
  });
  if (selectedId && !hosts.some((device) => device.id === selectedId)) {
    options.push(`<option value="${escapeHtml(selectedId)}">${escapeHtml(t("device_host_orphan"))} · ${escapeHtml(selectedId)}</option>`);
  }

  elements.serviceHostSelect.innerHTML = options.join("");
  elements.serviceHostSelect.value = selectedId && options.length > 1 ? selectedId : "";
  elements.serviceHostSelect.dataset.hostCount = String(hosts.length);
  closeLimitedSelect();
}

function renderServiceSourceOptions(selectedSource = "") {
  const sourceSelect = elements.serviceForm?.elements.source;
  if (!sourceSelect) {
    return;
  }

  const normalizedSelected = normalizeMetadataToken(selectedSource, "");
  const sources = getAvailableDeviceSources();
  const options = [`<option value="">${escapeHtml(t("device_integration_status_empty"))}</option>`];
  options.push(...sources.map((source) => `
    <option value="${escapeHtml(source.id)}">${escapeHtml(source.label)} · ${escapeHtml(source.badge)}</option>
  `));

  if (normalizedSelected && !sources.some((source) => source.id === normalizedSelected)) {
    options.push(`<option value="${escapeHtml(normalizedSelected)}">${escapeHtml(getDeviceSourceLabel(normalizedSelected))}</option>`);
  }

  sourceSelect.innerHTML = options.join("");
  sourceSelect.value = normalizedSelected;
  closeLimitedSelect();
}

function bindUnifiedAddFormSelects() {
  document.querySelectorAll("#subnet-form select, #device-form select, #group-form select, #service-form select")
    .forEach((selectElement) => {
      selectElement.addEventListener("mousedown", (event) => openLimitedSelect(event, selectElement, getLimitedSelectVisibleCount(selectElement)));
      selectElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          openLimitedSelect(event, selectElement, getLimitedSelectVisibleCount(selectElement));
        }
      });
    });
}

function initializeFieldHelp() {
  Object.entries(FIELD_HELP_CONFIG).forEach(([formId, fields]) => {
    const form = document.getElementById(formId);
    if (!form) {
      return;
    }

    fields.forEach(({ selector, key }) => {
      const control = form.querySelector(selector);
      const label = control?.closest("label");
      if (!label || label.querySelector(`[data-field-help="${key}"]`)) {
        return;
      }

      const labelText = label.querySelector(".setting-title, span[data-i18n], span:not(.setting-note)");
      if (!labelText) {
        return;
      }

      let labelRow = labelText.closest(".field-label-row");
      if (!labelRow) {
        labelRow = document.createElement("span");
        labelRow.className = "field-label-row";
        labelText.replaceWith(labelRow);
        labelRow.append(labelText);
      }

      const helpButton = document.createElement("span");
      helpButton.className = "field-help-button";
      helpButton.dataset.fieldHelp = key;
      helpButton.dataset.fieldHelpControl = "true";
      helpButton.tabIndex = 0;
      helpButton.setAttribute("role", "button");
      helpButton.setAttribute("aria-label", t("field_help_button_label"));
      helpButton.setAttribute("aria-haspopup", "dialog");
      helpButton.textContent = "i";

      helpButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (activeFieldHelpButton === helpButton) {
          hideFieldHelp(true);
          return;
        }

        showFieldHelp(helpButton, key, true);
      });
      helpButton.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (activeFieldHelpButton === helpButton) {
          hideFieldHelp(true);
          return;
        }
        showFieldHelp(helpButton, key, true);
      });

      labelRow.append(helpButton);
    });
  });
}

function handleFieldHelpPointerDown(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (target.closest(".field-help-button") || target.closest(".field-help-popover")) {
    return;
  }
  hideFieldHelp(true);
}

function getFieldHelpPopover() {
  let popover = document.querySelector(".field-help-popover");
  if (popover) {
    return popover;
  }

  popover = document.createElement("div");
  popover.className = "field-help-popover";
  popover.setAttribute("role", "tooltip");
  document.body.append(popover);
  return popover;
}

function showFieldHelp(button, helpKey, pinned) {
  if (!button) {
    return;
  }

  const popover = getFieldHelpPopover();
  if (activeFieldHelpButton && activeFieldHelpButton !== button) {
    activeFieldHelpButton.setAttribute("aria-expanded", "false");
  }

  popover.textContent = t(helpKey);
  popover.hidden = false;
  activeFieldHelpButton = button;
  isFieldHelpPinned = pinned;
  button.setAttribute("aria-expanded", "true");
  positionFieldHelpPopover(button, popover);
}

function positionFieldHelpPopover(button, popover) {
  const buttonRect = button.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 12;
  const preferredTop = buttonRect.bottom + gap;
  const top = preferredTop + popoverRect.height + viewportPadding > window.innerHeight
    ? Math.max(viewportPadding, buttonRect.top - popoverRect.height - gap)
    : preferredTop;
  const left = Math.min(
    Math.max(viewportPadding, buttonRect.left + (buttonRect.width / 2) - (popoverRect.width / 2)),
    Math.max(viewportPadding, window.innerWidth - popoverRect.width - viewportPadding)
  );

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function hideFieldHelp(force = false) {
  if (isFieldHelpPinned && !force) {
    return;
  }

  const popover = document.querySelector(".field-help-popover");
  if (popover) {
    popover.hidden = true;
  }

  activeFieldHelpButton?.setAttribute("aria-expanded", "false");
  activeFieldHelpButton = null;
  isFieldHelpPinned = false;
}

function getLimitedSelectVisibleCount(selectElement) {
  if (selectElement === elements.serviceSourceSelect) {
    return 3;
  }
  if (selectElement === elements.serviceStatusSelect) {
    return 3;
  }
  if (selectElement === elements.serviceHostSelect || selectElement === elements.serviceProtocolSelect) {
    return 7;
  }
  return 7;
}

function openLimitedSelect(event, selectElement, visibleCount) {
  if (!selectElement || selectElement.options.length === 0) {
    return;
  }

  event.preventDefault();
  closeLimitedSelect();

  const field = selectElement.closest("label");
  if (!field) {
    return;
  }

  field.classList.add("select-field--limited");
  const list = document.createElement("div");
  list.className = "select-limited-list";
  list.dataset.selectLimitedList = selectElement.name || selectElement.id || "select";
  list.style.setProperty("--select-visible-count", String(visibleCount));
  list.innerHTML = [...selectElement.options].map((option) => `
    <button
      type="button"
      class="select-limited-list__option${option.value === selectElement.value ? " is-selected" : ""}"
      data-select-limited-value="${escapeHtml(option.value)}"
      ${option.disabled ? "disabled" : ""}
    >
      ${escapeHtml(option.textContent || "")}
    </button>
  `).join("");

  list.addEventListener("click", (listEvent) => {
    const optionButton = listEvent.target.closest("[data-select-limited-value]");
    if (!optionButton || optionButton.disabled) {
      return;
    }

    selectElement.value = optionButton.dataset.selectLimitedValue;
    selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    closeLimitedSelect();
  });

  selectElement.insertAdjacentElement("afterend", list);
}

function closeLimitedSelect() {
  document.querySelectorAll(".select-limited-list").forEach((list) => list.remove());
  document.querySelectorAll(".select-field--limited").forEach((field) => field.classList.remove("select-field--limited"));
}

function renderSubnetsTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
  const canManageAutomation = Boolean(state.auth?.capabilities?.canManageServerSettings);
  const shouldShowExpand = syncRegistryListWrap(elements.subnetsTableWrap, state.subnets.length, showAllSubnetsInRegistry);
  syncRegistryListToggleButton(
    elements.subnetsListToggleButton,
    shouldShowExpand,
    showAllSubnetsInRegistry,
    "show_all_subnets",
    "show_less_subnets",
    state.subnets.length,
  );
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
  const sortedSubnets = state.subnets
    .slice()
    .sort((left, right) => left.rangeStartInt - right.rangeStartInt);
  const rows = sortedSubnets
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
          <td>${renderRegistryComment(subnet.note)}</td>
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
  elements.subnetsCounter.textContent = formatRecordsCount(sortedSubnets.length);
}

function renderGroupsTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
  const shouldShowExpand = syncRegistryListWrap(elements.groupsTableWrap, state.groups.length, showAllGroupsInRegistry);
  syncRegistryListToggleButton(
    elements.groupsListToggleButton,
    shouldShowExpand,
    showAllGroupsInRegistry,
    "show_all_groups",
    "show_less_groups",
    state.groups.length,
  );
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
  const sortedGroups = state.groups
    .slice()
    .sort((left, right) => {
      if (left.subnetId !== right.subnetId) {
        return left.subnetId.localeCompare(right.subnetId);
      }
      return left.rangeStartInt - right.rangeStartInt;
    });
  const rows = sortedGroups
    .map((group) => {
      const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
      const pingVisible = isSubnetPingVisible(subnet);
      const deviceCount = countAssignedInGroup(group);
      const pingOnlyCount = countPingOnlyInGroup(group, reachableSet);
      const freeCount = countFreeInGroup(group);
      const groupDevices = getInventoryDevices()
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
          <td>${renderRegistryComment(group.note)}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="row-button" data-edit-group="${escapeHtml(group.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button row-button--danger" data-delete-group="${escapeHtml(group.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
            </div>
          </td>
        </tr>
        ${isExpanded ? `
          <tr class="group-devices-row" data-expanded-group-devices="${escapeHtml(group.id)}">
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
  elements.groupsCounter.textContent = formatRecordsCount(sortedGroups.length);
}

function renderAccessGroupsTable() {
  const canManage = Boolean(state.auth?.capabilities?.canManageAccessGroups);
  const accessGroups = state.admin?.accessGroups || [];
  const shouldShowExpand = syncCompactTableWrap(elements.accessGroupsTableWrap, accessGroups.length, showAllAccessGroups);
  syncRegistryListToggleButton(
    elements.accessGroupsListToggleButton,
    shouldShowExpand,
    showAllAccessGroups,
    "show_all_access_groups",
    "show_less_access_groups",
    accessGroups.length,
  );
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
        <td>${renderRegistryComment(group.description)}</td>
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
  const shouldShowExpand = syncCompactTableWrap(elements.usersTableWrap, users.length, showAllUsers);
  syncRegistryListToggleButton(
    elements.usersListToggleButton,
    shouldShowExpand,
    showAllUsers,
    "show_all_users",
    "show_less_users",
    users.length,
  );
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

function getDiscoveryAgentKindLabel(kind) {
  const normalizedKind = normalizeMetadataToken(kind, "host");
  const key = `discovery_agent_kind_${normalizedKind}`;
  return TRANSLATIONS[getLanguage()]?.[key] || humanizeDeviceType(normalizedKind);
}

function getDiscoveryCreateModeLabel(mode) {
  const normalizedMode = normalizeMetadataToken(mode, "preview_only");
  const keyMap = {
    preview_only: "discovery_create_mode_preview_only",
    auto_create_services: "discovery_create_mode_auto_services",
    auto_create_devices_and_services: "discovery_create_mode_auto_all",
  };
  const key = keyMap[normalizedMode] || `discovery_create_mode_${normalizedMode}`;
  return TRANSLATIONS[getLanguage()]?.[key] || humanizeDeviceType(normalizedMode);
}

function getDefaultDiscoveryCollectors(kind) {
  const normalizedKind = normalizeMetadataToken(kind, "host");
  return DISCOVERY_COLLECTOR_PRESETS[normalizedKind] || DISCOVERY_COLLECTOR_PRESETS.host;
}

function getDiscoveryAgentCollectorInputs() {
  return [...(elements.discoveryAgentForm?.querySelectorAll('input[name="collectors"]') || [])];
}

function setDiscoveryAgentCollectors(collectors) {
  const selected = new Set(collectors?.length ? collectors : ["host"]);
  getDiscoveryAgentCollectorInputs().forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function getDiscoveryAgentSelectedCollectors() {
  const selected = getDiscoveryAgentCollectorInputs()
    .filter((input) => input.checked)
    .map((input) => input.value);
  return selected.includes("host") ? selected : ["host", ...selected];
}

function buildDiscoveryAgentConfig(agent, token, collectors = null) {
  const atlasUrl = window.location.origin;
  const enabledCollectors = collectors?.length
    ? collectors
    : getDefaultDiscoveryCollectors(agent?.kind || "host");
  const config = {
    atlas_url: atlasUrl,
    agent_id: agent.id,
    agent_token: token || "paste-shared-token-here",
    interval: 60,
    source_name: "agent",
    verify_tls: atlasUrl.startsWith("https://"),
    allow_insecure_http: atlasUrl.startsWith("http://"),
    timeout: 20,
    enabled_collectors: enabledCollectors,
  };
  if (enabledCollectors.includes("docker")) {
    Object.assign(config, {
    docker_socket: "/var/run/docker.sock",
    docker_timeout: 10,
    });
  }
  if (enabledCollectors.includes("kubernetes")) {
    Object.assign(config, {
      kubernetes_api_url: "https://kubernetes.default.svc",
      kubernetes_token_file: "/var/run/secrets/kubernetes.io/serviceaccount/token",
      kubernetes_ca_cert: "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
      kubernetes_namespaces: ["default"],
      kubernetes_all_namespaces: false,
      kubernetes_verify_tls: true,
      kubernetes_timeout: 10,
    });
  }
  if (enabledCollectors.includes("proxmox")) {
    Object.assign(config, {
      proxmox_api_url: "https://pve.example.local:8006",
      proxmox_token_id: "atlas@pve!discovery",
      proxmox_token_secret: "paste-proxmox-token-secret",
      proxmox_nodes: [],
      proxmox_include_ipv6: false,
      proxmox_verify_tls: true,
      proxmox_timeout: 10,
    });
  }
  return JSON.stringify(config, null, 2);
}

function showDiscoveryAgentConfig(agent, token, collectors = null) {
  if (!elements.discoveryAgentTokenCard || !elements.discoveryAgentConfigSnippet) {
    return;
  }
  if (discoveryAgentConfigTimer) {
    window.clearTimeout(discoveryAgentConfigTimer);
    discoveryAgentConfigTimer = null;
  }
  lastDiscoveryAgentConfig = buildDiscoveryAgentConfig(agent, token, collectors);
  elements.discoveryAgentConfigSnippet.value = lastDiscoveryAgentConfig;
  elements.discoveryAgentTokenCard.hidden = false;
  if (elements.copyDiscoveryAgentConfigButton) {
    elements.copyDiscoveryAgentConfigButton.disabled = false;
  }
  discoveryAgentConfigTimer = window.setTimeout(() => {
    clearDiscoveryAgentConfig();
  }, DISCOVERY_AGENT_CONFIG_HIDE_MS);
}

function clearDiscoveryAgentConfig() {
  if (discoveryAgentConfigTimer) {
    window.clearTimeout(discoveryAgentConfigTimer);
    discoveryAgentConfigTimer = null;
  }
  lastDiscoveryAgentConfig = "";
  if (elements.discoveryAgentConfigSnippet) {
    elements.discoveryAgentConfigSnippet.value = "";
  }
  if (elements.discoveryAgentTokenCard) {
    elements.discoveryAgentTokenCard.hidden = true;
  }
  if (elements.copyDiscoveryAgentConfigButton) {
    elements.copyDiscoveryAgentConfigButton.disabled = true;
  }
}

function syncFilterPanelToggles() {
  elements.filterToggleButtons.forEach((button) => {
    const name = button.dataset.filterToggle;
    const collapsed = Boolean(collapsedFilterPanels[name]);
    const content = document.getElementById(`${name}-filters-content`);
    if (content) {
      content.hidden = collapsed;
    }
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.textContent = t(collapsed ? "filters_expand_button" : "filters_collapse_button");
  });
}

function toggleFilterPanel(name) {
  if (!name || !(name in collapsedFilterPanels)) {
    return;
  }
  collapsedFilterPanels[name] = !collapsedFilterPanels[name];
  syncFilterPanelToggles();
  if (name === "registry") {
    renderSubnetsTable();
    renderGroupsTable();
    renderDevicesTable();
    renderServicesList();
  }
}

function getRegistryCompactVisibleRows() {
  return collapsedFilterPanels.registry
    ? REGISTRY_VISIBLE_ROWS.filtersCollapsed
    : REGISTRY_VISIBLE_ROWS.default;
}

function syncRegistryListWrap(wrapElement, itemCount, isExpanded) {
  if (!wrapElement) {
    return false;
  }
  const compactRows = getRegistryCompactVisibleRows();
  const shouldScroll = itemCount > compactRows;
  wrapElement.classList.toggle("table-wrap--registry-list", shouldScroll);
  wrapElement.classList.toggle("table-wrap--filters-collapsed", shouldScroll && collapsedFilterPanels.registry);
  wrapElement.classList.toggle("table-wrap--expanded", shouldScroll && isExpanded);
  return shouldScroll;
}

function syncCompactTableWrap(wrapElement, itemCount, isExpanded) {
  if (!wrapElement) {
    return false;
  }
  const shouldScroll = itemCount > COMPACT_LIST_VISIBLE_ROWS.default;
  wrapElement.classList.toggle("table-wrap--compact-list", shouldScroll);
  wrapElement.classList.toggle("table-wrap--expanded", shouldScroll && isExpanded);
  return shouldScroll;
}

function syncCompactListWrap(listElement, itemCount, isExpanded) {
  if (!listElement) {
    return false;
  }
  const shouldScroll = itemCount > COMPACT_LIST_VISIBLE_ROWS.default;
  listElement.classList.toggle("automation-subnet-list--compact", shouldScroll);
  listElement.classList.toggle("automation-subnet-list--expanded", shouldScroll && isExpanded);
  return shouldScroll;
}

function syncRegistryListToggleButton(buttonElement, shouldShow, isExpanded, expandKey, collapseKey, count) {
  if (!buttonElement) {
    return;
  }
  buttonElement.hidden = !shouldShow;
  if (!shouldShow) {
    buttonElement.textContent = "";
    return;
  }
  buttonElement.textContent = t(isExpanded ? collapseKey : expandKey, { count });
}

function timestampAgeMs(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.now() - parsed;
}

function hasTimeSensitiveAvailabilityRecords() {
  return state.devices.some((record) => hasLiveAgentStatus(record))
    || (state.admin?.discoveryAgents || []).some((agent) => agent.lastSeenAt);
}

function getAvailabilityLabel(stateValue) {
  const key = `availability_${normalizeMetadataToken(stateValue, "pending")}`;
  return TRANSLATIONS[getLanguage()]?.[key] || String(stateValue || "pending").toUpperCase();
}

function getAgentSendIntervalMs(agent) {
  const intervalSeconds = Number(agent?.reportedIntervalSeconds || 0);
  if (Number.isFinite(intervalSeconds) && intervalSeconds >= 15) {
    return intervalSeconds * 1000;
  }
  return DISCOVERY_DEFAULT_SEND_INTERVAL_MS;
}

function getAvailabilityByAge(value, agent = null) {
  const age = timestampAgeMs(value);
  if (!Number.isFinite(age)) {
    return { state: "pending", variant: "warn", label: getAvailabilityLabel("pending") };
  }
  const expected = getAgentSendIntervalMs(agent);
  if (age <= expected + DISCOVERY_UP_GRACE_MS) {
    return { state: "up", variant: "ok", label: getAvailabilityLabel("up") };
  }
  if (age <= (expected * 2) + DISCOVERY_DOWN_GRACE_MS) {
    return { state: "pending", variant: "warn", label: getAvailabilityLabel("pending") };
  }
  return { state: "down", variant: "danger", label: getAvailabilityLabel("down") };
}

function getDiscoveryFreshness(value, agent = null) {
  return getAvailabilityByAge(value, agent);
}

function getDownTransitionAvailability(value, agent = null) {
  const age = timestampAgeMs(value);
  if (!Number.isFinite(age)) {
    return { state: "pending", variant: "warn", label: getAvailabilityLabel("pending") };
  }
  const expected = getAgentSendIntervalMs(agent);
  if (age <= (expected * 2) + DISCOVERY_DOWN_GRACE_MS) {
    return { state: "pending", variant: "warn", label: getAvailabilityLabel("pending") };
  }
  return { state: "down", variant: "danger", label: getAvailabilityLabel("down") };
}

function getAgentAvailabilityStatus(record) {
  if (!hasLiveAgentStatus(record)) {
    return { state: "manual", variant: "info", label: "" };
  }
  const normalizedStatus = normalizeMetadataToken(record.integrationStatus, "");
  const linkedResult = getDiscoveryResultForRecord(record);
  const linkedAgent = getDiscoveryAgentForRecord(record);
  const effectiveLastSeenAt = getRecordLiveLastSeenAt(record);
  const sourceState = normalizeMetadataToken(linkedResult?.state, "");
  const transitionAt = (sourceState === "stale" || normalizedStatus === "source-missing" || normalizedStatus === "source_missing")
    ? linkedResult?.updatedAt || record.integrationStatusChangedAt || effectiveLastSeenAt
    : record.integrationStatusChangedAt || effectiveLastSeenAt;
  const isDownStatus = DOWN_INTEGRATION_STATUSES.has(normalizedStatus) || sourceState === "stale" || sourceState === "error";

  if (isDownStatus) {
    return getDownTransitionAvailability(transitionAt, linkedAgent);
  }
  if (UP_INTEGRATION_STATUSES.has(normalizedStatus) || (!normalizedStatus && linkedAgent?.lastSeenAt)) {
    return getAvailabilityByAge(effectiveLastSeenAt, linkedAgent);
  }
  const currentStatus = getAvailabilityByAge(effectiveLastSeenAt, linkedAgent);
  if (currentStatus.state === "down") {
    return { state: "down", variant: "danger", label: getAvailabilityLabel("down") };
  }
  return { state: "pending", variant: "warn", label: getAvailabilityLabel("pending") };
}

function getDiscoveryAgentForRecord(record) {
  const linkedResult = getDiscoveryResultForRecord(record);
  if (!linkedResult) {
    return getLinkedDiscoveryAgentForHost(record);
  }
  return (state.admin?.discoveryAgents || []).find((agent) => agent.id === linkedResult.agentId) || null;
}

function renderAgentDisabledBadge(record) {
  const agent = getDiscoveryAgentForRecord(record);
  if (!agent || agent.enabled) {
    return "";
  }
  return `
    <span class="status-badge status-badge--muted" title="${escapeHtml(t("agent_status_tooltip"))}">
      ${escapeHtml(t("discovery_agent_record_disabled"))}
    </span>
  `;
}

function renderDeviceStatusCell(device, registryStatus) {
  const registryTitle = t("registry_status_tooltip");
  const registryBadge = `
    <span class="status-badge status-badge--${registryStatus.variant}" title="${escapeHtml(registryTitle)}">
      ${escapeHtml(registryStatus.label)}
    </span>
  `;
  if (!hasLiveAgentStatus(device)) {
    return registryBadge;
  }

  const disabledBadge = renderAgentDisabledBadge(device);
  const availability = getAgentAvailabilityStatus(device);
  const integrationStatus = normalizeMetadataToken(device.integrationStatus, "");
  const lastReportedStatus = integrationStatus ? getIntegrationStatusLabel(integrationStatus) : "";
  const agentTitleParts = [
    t("agent_status_tooltip"),
    lastReportedStatus ? t("service_last_reported_status", { status: lastReportedStatus }) : "",
    getRecordLiveLastSeenAt(device) ? formatDateTime(getRecordLiveLastSeenAt(device)) : "",
  ].filter(Boolean);
  const agentBadge = `
    <span class="status-badge status-badge--${availability.variant}" title="${escapeHtml(agentTitleParts.join(" · "))}">
      ${escapeHtml(availability.label)}
    </span>
  `;
  return `
    <div class="table-status-stack">
      ${registryBadge}
      ${disabledBadge}
      ${agentBadge}
    </div>
  `;
}

function renderDiscoveryAgentsTable() {
  if (!elements.discoveryAgentsTableBody) {
    return;
  }

  const agents = state.admin?.discoveryAgents || [];
  const canManage = Boolean(state.auth?.capabilities?.isAdmin);
  const shouldShowExpand = syncCompactTableWrap(elements.discoveryAgentsTableWrap, agents.length, showAllDiscoveryAgents);
  syncRegistryListToggleButton(
    elements.discoveryAgentsListToggleButton,
    shouldShowExpand,
    showAllDiscoveryAgents,
    "show_all_discovery_agents",
    "show_less_discovery_agents",
    agents.length,
  );
  if (agents.length === 0) {
    elements.discoveryAgentsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">${escapeHtml(t("empty_discovery_agents"))}</td>
      </tr>
    `;
    return;
  }

  elements.discoveryAgentsTableBody.innerHTML = agents
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .map((agent) => {
      const freshness = agent.enabled
        ? getDiscoveryFreshness(agent.lastSeenAt, agent)
        : { state: "disabled", variant: "muted", label: t("discovery_agent_status_disabled") };
      const statusBadges = [
        `<span class="status-badge status-badge--${agent.enabled ? "info" : "muted"}">${escapeHtml(agent.enabled ? t("discovery_agent_status_enabled") : t("discovery_agent_status_disabled"))}</span>`,
        `<span class="status-badge status-badge--${freshness.variant}">${escapeHtml(freshness.label)}</span>`,
      ];
      if (agent.lastRejectReason) {
        statusBadges.push(`<span class="status-badge status-badge--warn">${escapeHtml(t("discovery_agent_status_rejected"))}</span>`);
      }
      if (agent.lastError) {
        statusBadges.push(`<span class="status-badge status-badge--warn">${escapeHtml(t("discovery_agent_status_error"))}</span>`);
      }
      const cidrs = agent.allowedCidrs?.length ? agent.allowedCidrs.join(", ") : t("discovery_agent_acl_any");
      const lastSeen = agent.lastSeenAt
        ? formatDateTime(agent.lastSeenAt)
        : agent.lastRejectedAt
          ? `${t("discovery_agent_last_rejected")}: ${formatDateTime(agent.lastRejectedAt)}`
          : t("no_data");
      const reportedTiming = [
        Number(agent.reportedIntervalSeconds) > 0
          ? t("discovery_agent_reported_interval", { interval: Number(agent.reportedIntervalSeconds) })
          : "",
      ].filter(Boolean);
      const policyLabel = agent.usesDefaultDataPolicy
        ? t("discovery_agent_policy_default_short")
        : t("discovery_agent_policy_custom_short");
      return `
        <tr>
          <td>
            <strong>${escapeHtml(agent.name)}</strong>
            <div class="secondary-line">${escapeHtml(getDiscoveryAgentKindLabel(agent.kind))}</div>
          </td>
          <td>
            <div class="table-status-stack">${statusBadges.join("")}</div>
            ${agent.lastRemoteAddr ? `<div class="secondary-line mono">${escapeHtml(agent.lastRemoteAddr)}</div>` : ""}
          </td>
          <td><div class="discovery-agents-table__acl mono">${escapeHtml(cidrs)}</div></td>
          <td>
            <div>${escapeHtml(getDiscoveryCreateModeLabel(agent.createMode))}</div>
            <div class="secondary-line">${escapeHtml(policyLabel)}</div>
          </td>
          <td>
            <div class="mono">${escapeHtml(lastSeen)}</div>
            ${reportedTiming.length ? `<div class="secondary-line">${escapeHtml(reportedTiming.join(" · "))}</div>` : ""}
          </td>
          <td>
            <div class="discovery-preview-actions discovery-agents-table__actions">
              <button type="button" class="row-button" data-edit-discovery-agent="${escapeHtml(agent.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button" data-edit-discovery-agent-policy="${escapeHtml(agent.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("discovery_agent_policy_button"))}</button>
              <button type="button" class="row-button" data-toggle-discovery-agent="${escapeHtml(agent.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(agent.enabled ? t("discovery_agent_disable_button") : t("discovery_agent_enable_button"))}</button>
              <button type="button" class="row-button row-button--danger" data-rotate-discovery-agent-token="${escapeHtml(agent.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("discovery_agent_rotate_token_button"))}</button>
              <button type="button" class="row-button row-button--danger" data-revoke-discovery-agent-token="${escapeHtml(agent.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("discovery_agent_revoke_token_button"))}</button>
              <button type="button" class="row-button row-button--danger" data-delete-discovery-agent="${escapeHtml(agent.id)}" ${canManage ? "" : "disabled"}>${escapeHtml(t("discovery_agent_delete_button"))}</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getDiscoveryStateLabel(stateName) {
  const normalizedState = String(stateName || "new").trim().toLowerCase();
  const key = `discovery_state_${normalizedState}`;
  return TRANSLATIONS[getLanguage()]?.[key] || normalizedState;
}

function getDiscoveryStateVariant(stateName) {
  const normalizedState = String(stateName || "new").trim().toLowerCase();
  if (normalizedState === "matched") {
    return "ok";
  }
  if (normalizedState === "stale" || normalizedState === "error") {
    return "warn";
  }
  if (normalizedState === "ignored") {
    return "muted";
  }
  return "info";
}

function isStaleDiscoveryResult(result) {
  return String(result?.state || "").trim().toLowerCase() === "stale";
}

function getDiscoveryTargetKind(result) {
  const source = normalizeMetadataToken(result.source, "");
  const sourceKind = normalizeMetadataToken(result.sourceKind, "");
  if (sourceKind === "template") {
    return "template";
  }
  if (sourceKind === "iot" || sourceKind === "sensor" || sourceKind === "controller") {
    return "iot";
  }
  if (source === "docker" || ["service", "container", "docker-container", "pod", "workload"].includes(sourceKind)) {
    return "service";
  }
  return "device";
}

function getDiscoveryTargetLabel(result) {
  const targetKind = getDiscoveryTargetKind(result);
  const key = {
    iot: "discovery_target_iot",
    service: "discovery_target_service",
    device: "discovery_target_device",
    template: "discovery_target_template",
  }[targetKind];
  return t(key);
}

function renderDiscoveryActions(result) {
  const normalizedState = String(result.state || "new").trim().toLowerCase();
  const actions = [];
  const detailsAction = expandedDiscoveryResultIds.has(result.id)
    ? ["details", "discovery_action_hide_details"]
    : ["details", "discovery_action_details"];
  actions.push(detailsAction);
  if (normalizedState === "ignored") {
    actions.push(["restore", "discovery_action_restore"]);
  } else {
    if (normalizedState !== "matched") {
      const targetKind = getDiscoveryTargetKind(result);
      if (targetKind === "service") {
        actions.push(["create-service", "discovery_action_create_service"]);
      } else if (targetKind === "device" || targetKind === "iot") {
        actions.push(["create-device", targetKind === "iot" ? "discovery_action_create_iot" : "discovery_action_create_device"]);
      }
      if (targetKind !== "template") {
        actions.push(["link", "discovery_action_link"]);
      }
    }
    if (normalizedState === "stale" || normalizedState === "error") {
      actions.push(["resolve", "discovery_action_resolve"]);
      actions.push(["delete", "discovery_action_delete"]);
    }
    actions.push(["ignore", "discovery_action_ignore"]);
  }

  return `
    <div class="discovery-preview-actions">
      ${actions
        .map(([action, labelKey]) => `
          <button
            type="button"
            class="row-button"
            data-discovery-action="${escapeHtml(action)}"
            data-discovery-result-id="${escapeHtml(result.id)}"
          >
            ${escapeHtml(t(labelKey))}
          </button>
        `)
        .join("")}
    </div>
  `;
}

function getDiscoveryPreviewGroup(result) {
  const isHostResult = getDiscoveryTargetKind(result) === "device"
    && normalizeMetadataToken(result.sourceKind, "") === "host";
  const fallbackHostIdentity = isHostResult
    ? result.name
    : (result.agentName || result.agentId || "");
  const hostGroupId = isHostResult
    ? (result.matchedDeviceId || result.hostDeviceId || "")
    : (result.hostDeviceId || "");
  const hostLabel = result.hostName || result.hostDeviceId || fallbackHostIdentity || t("no_binding");
  const agentLabel = result.agentName || result.agentId || t("no_data");
  const keyParts = [
    result.agentId || result.agentName || "agent",
    hostGroupId || result.hostName || fallbackHostIdentity || result.name || "unbound",
  ];
  return {
    key: keyParts.map((part) => String(part || "").trim()).join("::"),
    hostLabel,
    agentLabel,
  };
}

function getDiscoveryPreviewSortRank(result) {
  const source = normalizeMetadataToken(result.source, "");
  const sourceKind = normalizeMetadataToken(result.sourceKind, "");
  if (source === "host" || sourceKind === "host") {
    return 0;
  }
  if (sourceKind === "hypervisor" || source === "proxmox" || ["vm", "lxc", "virtual-machine", "template"].includes(sourceKind)) {
    return 1;
  }
  if (source === "docker" || ["container", "docker-container", "service"].includes(sourceKind)) {
    return 2;
  }
  if (source === "kubernetes" || ["pod", "workload"].includes(sourceKind)) {
    return 3;
  }
  if (sourceKind === "iot" || sourceKind === "sensor" || sourceKind === "controller") {
    return 4;
  }
  return 5;
}

function sortDiscoveryPreviewResults(results) {
  return results.slice().sort((left, right) => {
    const rankDiff = getDiscoveryPreviewSortRank(left) - getDiscoveryPreviewSortRank(right);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const leftType = getDeviceSourceKindLabel(left.sourceKind || left.source || "");
    const rightType = getDeviceSourceKindLabel(right.sourceKind || right.source || "");
    const typeDiff = leftType.localeCompare(rightType, getLanguage(), { sensitivity: "base" });
    if (typeDiff !== 0) {
      return typeDiff;
    }
    return String(left.name || left.sourceId || "").localeCompare(
      String(right.name || right.sourceId || ""),
      getLanguage(),
      { sensitivity: "base", numeric: true },
    );
  });
}

function renderDiscoveryPreviewRow(result, groupKey = "") {
  const sourceLabel = getDeviceSourceLabel(result.source);
  const sourceKindLabel = result.sourceKind ? getDeviceSourceKindLabel(result.sourceKind) : t("no_data");
  const hostLabel = result.hostName || result.hostDeviceId || t("no_binding");
  const ports = [result.accessPort, result.ports].filter(Boolean).join(" · ") || t("no_data");
  const isExpanded = expandedDiscoveryResultIds.has(result.id);
  return `
    <tr data-discovery-result-row="${escapeHtml(result.id)}"${groupKey ? ` data-discovery-result-group="${escapeHtml(groupKey)}"` : ""}>
      <td>
        <span class="status-badge status-badge--${getDiscoveryStateVariant(result.state)}">
          ${escapeHtml(getDiscoveryStateLabel(result.state))}
        </span>
        <div class="secondary-line">${escapeHtml(getDiscoveryTargetLabel(result))}</div>
      </td>
      <td>
        <strong>${escapeHtml(result.name || t("no_data"))}</strong>
        <div class="secondary-line">${escapeHtml(sourceKindLabel)}</div>
      </td>
      <td>
        <div class="discovery-preview-table__source">
          <span class="pill">${escapeHtml(sourceLabel)}</span>
        </div>
      </td>
      <td>${escapeHtml(hostLabel)}</td>
      <td><div class="discovery-preview-table__ports mono">${escapeHtml(ports)}</div></td>
      <td class="mono">${escapeHtml(formatDateTime(result.lastSeenAt || result.updatedAt))}</td>
      <td>${renderDiscoveryActions(result)}</td>
    </tr>
    ${isExpanded ? `
      <tr class="discovery-details-row" data-expanded-discovery-result="${escapeHtml(result.id)}">
        <td colspan="7">${renderDiscoveryDetails(result)}</td>
      </tr>
    ` : ""}
  `;
}

function findDiscoveryLinkTarget(value) {
  const query = String(value || "").trim().toLowerCase();
  if (!query) {
    return null;
  }
  return (state.devices || []).find((device) => {
    return [device.id, device.name, device.ip]
      .filter(Boolean)
      .some((candidate) => String(candidate).trim().toLowerCase() === query);
  }) || null;
}

async function handleDiscoveryPreviewActions(event) {
  const groupButton = event.target.closest("[data-toggle-discovery-group]");
  if (groupButton) {
    const groupId = groupButton.dataset.toggleDiscoveryGroup || "";
    const willExpand = !expandedDiscoveryGroupIds.has(groupId);
    if (!willExpand) {
      expandedDiscoveryGroupIds.delete(groupId);
    } else {
      expandedDiscoveryGroupIds.add(groupId);
    }
    renderDiscoveryPreview();
    if (willExpand) {
      revealExpandedContent(() => (
        document.querySelector(`[data-discovery-result-group="${cssEscape(groupId)}"]`)
        || document.querySelector(`[data-discovery-group-row="${cssEscape(groupId)}"]`)
      ), { extraDown: 120 });
    }
    return;
  }

  const hardwareButton = event.target.closest("[data-toggle-discovery-hardware]");
  if (hardwareButton) {
    const resultId = hardwareButton.dataset.toggleDiscoveryHardware || "";
    const willExpand = !expandedDiscoveryHardwareIds.has(resultId);
    if (!willExpand) {
      expandedDiscoveryHardwareIds.delete(resultId);
    } else {
      expandedDiscoveryHardwareIds.add(resultId);
    }
    renderDiscoveryPreview();
    if (willExpand) {
      revealExpandedContent(() => document.querySelector(`[data-expanded-discovery-result="${cssEscape(resultId)}"]`));
    }
    return;
  }

  const button = event.target.closest("[data-discovery-action]");
  if (!button) {
    return;
  }

  const resultId = button.dataset.discoveryResultId;
  const action = button.dataset.discoveryAction;
  const result = (state.admin?.discoveryResults || []).find((item) => item.id === resultId);
  const resultName = result?.name || t("no_data");

  if (action === "details") {
    const willExpand = !expandedDiscoveryResultIds.has(resultId);
    if (!willExpand) {
      expandedDiscoveryResultIds.delete(resultId);
    } else {
      expandedDiscoveryResultIds.add(resultId);
    }
    renderDiscoveryPreview();
    if (willExpand) {
      revealExpandedContent(() => document.querySelector(`[data-expanded-discovery-result="${cssEscape(resultId)}"]`));
    }
    return;
  }

  try {
    button.disabled = true;
    if (action === "create-service" || action === "create-device") {
      const isService = action === "create-service";
      const confirmed = await showAtlasConfirm(
        t(isService ? "discovery_create_service_confirm" : "discovery_create_device_confirm", { name: resultName }),
        {
          title: t(isService ? "discovery_create_service_title" : "discovery_create_device_title"),
          confirmLabel: t(isService ? "discovery_action_create_service" : "discovery_action_create_device"),
        },
      );
      if (!confirmed) {
        return;
      }
      await apiRequest(`/admin/discovery/results/${encodeURIComponent(resultId)}/create`, {
        method: "POST",
        body: JSON.stringify({ targetType: isService ? "service" : "device" }),
      });
    } else if (action === "link") {
      const targetValue = await showAtlasPrompt(t("discovery_link_prompt"), {
        title: t("discovery_link_title"),
        inputLabel: t("discovery_link_input_label"),
        inputPlaceholder: t("discovery_link_input_placeholder"),
        confirmLabel: t("discovery_action_link"),
      });
      if (targetValue === null) {
        return;
      }
      const target = findDiscoveryLinkTarget(targetValue);
      if (!target) {
        showToast(t("discovery_link_missing"), true);
        return;
      }
      await apiRequest(`/admin/discovery/results/${encodeURIComponent(resultId)}/link`, {
        method: "POST",
        body: JSON.stringify({
          targetId: target.id,
          targetType: target.type === "service" ? "service" : "device",
        }),
      });
    } else if (action === "delete") {
      const confirmed = await showAtlasConfirm(
        t("discovery_delete_confirm", { name: resultName }),
        {
          title: t("discovery_delete_title"),
          confirmLabel: t("discovery_action_delete"),
          danger: true,
        },
      );
      if (!confirmed) {
        return;
      }
      await apiRequest(`/admin/discovery/results/${encodeURIComponent(resultId)}/delete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    } else {
      await apiRequest(`/admin/discovery/results/${encodeURIComponent(resultId)}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    }

    await refreshState(true, true);
    showToast(t("discovery_action_done"));
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function handleDiscoveryStaleCleanup() {
  const staleCount = getDisplayDiscoveryResults().filter(isStaleDiscoveryResult).length;
  if (staleCount === 0) {
    showToast(t("discovery_bulk_cleanup_stale_empty"));
    return;
  }

  const confirmed = await showAtlasConfirm(
    t("discovery_bulk_cleanup_stale_confirm", { count: staleCount }),
    {
      title: t("discovery_bulk_cleanup_stale_title"),
      confirmLabel: t("discovery_bulk_cleanup_stale_button"),
      danger: true,
    },
  );
  if (!confirmed) {
    return;
  }

  const button = elements.discoveryStaleCleanupButton;
  try {
    if (button) {
      button.disabled = true;
    }
    const result = await apiRequest("/admin/discovery/results/cleanup-stale", {
      method: "POST",
      body: JSON.stringify({ deleteLinkedRecords: true }),
    });
    await refreshState(true, true);
    showToast(t("discovery_bulk_cleanup_stale_done", {
      results: result.deletedResults || 0,
      records: result.deletedLinkedRecords || 0,
      audit: result.deletedAuditEvents || 0,
    }));
  } catch (error) {
    showToast(error.message, true);
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function getDiscoveryAuditEventLabel(eventType) {
  const normalizedType = normalizeMetadataToken(eventType, "event");
  const key = `discovery_audit_event_${normalizedType}`;
  return TRANSLATIONS[getLanguage()]?.[key] || humanizeDeviceType(normalizedType);
}

function getDiscoveryAuditSeverityVariant(severity) {
  const normalizedSeverity = String(severity || "info").trim().toLowerCase();
  if (normalizedSeverity === "warn" || normalizedSeverity === "warning") {
    return "warn";
  }
  if (normalizedSeverity === "error" || normalizedSeverity === "danger") {
    return "danger";
  }
  if (normalizedSeverity === "ok" || normalizedSeverity === "success") {
    return "ok";
  }
  return "info";
}

function renderDiscoveryAuditFilterOptions(events) {
  if (!elements.discoveryAuditEventFilter) {
    return;
  }
  const previousValue = elements.discoveryAuditEventFilter.value || "all";
  const eventTypes = [...new Set(events.map((event) => event.eventType).filter(Boolean))]
    .sort((left, right) => getDiscoveryAuditEventLabel(left).localeCompare(getDiscoveryAuditEventLabel(right), getLanguage()));
  elements.discoveryAuditEventFilter.innerHTML = [
    `<option value="all">${escapeHtml(t("discovery_audit_event_filter_all"))}</option>`,
    ...eventTypes.map((eventType) => (
      `<option value="${escapeHtml(eventType)}">${escapeHtml(getDiscoveryAuditEventLabel(eventType))}</option>`
    )),
  ].join("");
  elements.discoveryAuditEventFilter.value = eventTypes.includes(previousValue) ? previousValue : "all";
}

function renderDiscoveryAudit() {
  if (!elements.discoveryAuditTableBody) {
    return;
  }

  const events = state.admin?.discoveryAuditEvents || [];
  renderDiscoveryAuditFilterOptions(events);
  const eventFilter = elements.discoveryAuditEventFilter?.value || "all";
  const filteredEvents = eventFilter === "all"
    ? events
    : events.filter((event) => event.eventType === eventFilter);

  if (filteredEvents.length === 0) {
    elements.discoveryAuditTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">${escapeHtml(events.length ? t("no_results") : t("empty_discovery_audit"))}</td>
      </tr>
    `;
    return;
  }

  elements.discoveryAuditTableBody.innerHTML = filteredEvents
    .slice(0, 60)
    .map((event) => {
      const agentLabel = event.agentName || event.agentId || t("no_data");
      const actorDetails = [event.actor, event.remoteAddr].filter(Boolean).join(" · ") || t("no_data");
      const details = event.message || Object.entries(event.details || {})
        .slice(0, 2)
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
        .join(" · ");
      return `
        <tr>
          <td class="mono">${escapeHtml(formatDateTime(event.createdAt))}</td>
          <td>
            <span class="status-badge status-badge--${getDiscoveryAuditSeverityVariant(event.severity)}">
              ${escapeHtml(event.severity || "info")}
            </span>
          </td>
          <td>${escapeHtml(getDiscoveryAuditEventLabel(event.eventType))}</td>
          <td>
            <strong>${escapeHtml(agentLabel)}</strong>
            ${event.agentId ? `<div class="secondary-line mono">${escapeHtml(event.agentId)}</div>` : ""}
          </td>
          <td>${escapeHtml(actorDetails)}</td>
          <td><div class="discovery-audit-table__note">${escapeHtml(details || t("no_data"))}</div></td>
        </tr>
      `;
    })
    .join("");
}

function renderDiscoveryDebugFieldList(fields, limit = 8) {
  const uniqueFields = getUniqueDiscoveryDebugFields(fields);
  if (uniqueFields.length === 0) {
    return t("no_data");
  }
  const visibleFields = uniqueFields.slice(0, limit);
  const suffix = uniqueFields.length > visibleFields.length
    ? ` +${uniqueFields.length - visibleFields.length}`
    : "";
  return `${visibleFields.join(", ")}${suffix}`;
}

function getUniqueDiscoveryDebugFields(fields) {
  return [...new Set((fields || []).map((field) => String(field || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, getLanguage(), { sensitivity: "base" }));
}

function getDiscoveryDebugHiddenFields(result) {
  const visible = new Set(result.visibleFields || []);
  const displayed = new Set(getDiscoveryVisibleMetadataEntries(result).map(([key]) => key));
  const acceptedButNotVisible = (result.acceptedFields || []).filter((field) => !visible.has(field));
  const visibleButSummarizedAway = Object.keys(result.visibleRaw || {}).filter((field) => !displayed.has(field));
  return [...new Set([...acceptedButNotVisible, ...visibleButSummarizedAway])];
}

function formatDiscoveryDebugHardwareField(field) {
  return `hardware.${field}`;
}

function getDiscoveryDebugHardwareFields(result) {
  if (!result.hardwareRaw || typeof result.hardwareRaw !== "object") {
    return [];
  }
  return Object.keys(result.hardwareRaw).map(formatDiscoveryDebugHardwareField);
}

function getDiscoveryDebugHardwareDisplayedFields(result) {
  return getDiscoveryHardwareMetadataEntries(result)
    .map(([field]) => formatDiscoveryDebugHardwareField(field));
}

function getDiscoveryDebugFieldCount(result, fieldName) {
  const hardwareFieldName = `hardware${fieldName[0].toUpperCase()}${fieldName.slice(1)}`;
  return getUniqueDiscoveryDebugFields([
    ...(result[fieldName] || []),
    ...((result[hardwareFieldName] || []).map(formatDiscoveryDebugHardwareField)),
  ]).length;
}

function getDiscoveryDebugOptions(resultId) {
  const existingOptions = discoveryDebugFieldOptions.get(resultId);
  if (existingOptions) {
    if (!(existingOptions.selected instanceof Set)) {
      existingOptions.selected = new Set();
    }
    if (!(existingOptions.known instanceof Set)) {
      existingOptions.known = new Set();
    }
    return existingOptions;
  }
  const options = {
    selected: new Set(),
    known: new Set(),
  };
  discoveryDebugFieldOptions.set(resultId, options);
  return options;
}

function getDiscoveryDebugSelectedFieldSet(resultId, fields, defaultSelectedFields) {
  const options = getDiscoveryDebugOptions(resultId);
  const selected = options.selected;
  const known = options.known;
  const currentFields = new Set(fields);
  const defaultSelected = new Set(defaultSelectedFields);
  fields.forEach((field) => {
    if (!known.has(field)) {
      known.add(field);
      if (defaultSelected.has(field)) {
        selected.add(field);
      }
    }
  });
  [...known].forEach((field) => {
    if (!currentFields.has(field)) {
      known.delete(field);
      selected.delete(field);
    }
  });
  return selected;
}

function renderDiscoveryDebugFilterOptions(results) {
  if (elements.discoveryDebugAgentFilter) {
    const previousAgent = discoveryDebugAgentFilter;
    const agents = new Map();
    results.forEach((result) => {
      const agentId = result.agentId || "";
      if (!agentId) {
        return;
      }
      const agentLabel = result.agentName || agentId;
      agents.set(agentId, agentLabel);
    });
    elements.discoveryDebugAgentFilter.innerHTML = [
      `<option value="all">${escapeHtml(t("discovery_debug_filter_all_agents"))}</option>`,
      ...[...agents.entries()]
        .sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel, getLanguage()))
        .map(([agentId, label]) => `<option value="${escapeHtml(agentId)}">${escapeHtml(label)}</option>`),
    ].join("");
    discoveryDebugAgentFilter = previousAgent !== "all" && !agents.has(previousAgent) ? "all" : previousAgent;
    elements.discoveryDebugAgentFilter.value = discoveryDebugAgentFilter;
  }

  if (elements.discoveryDebugKindFilter) {
    elements.discoveryDebugKindFilter.value = discoveryDebugKindFilter;
  }
}

function getFilteredDiscoveryDebugResults(results) {
  return results.filter((result) => {
    if (discoveryDebugAgentFilter !== "all" && result.agentId !== discoveryDebugAgentFilter) {
      return false;
    }
    if (discoveryDebugKindFilter !== "all" && getDiscoveryTargetKind(result) !== discoveryDebugKindFilter) {
      return false;
    }
    return true;
  });
}

function renderDiscoveryDebugDetails(result) {
  const hiddenFields = getUniqueDiscoveryDebugFields(getDiscoveryDebugHiddenFields(result));
  const visibleRawKeys = getUniqueDiscoveryDebugFields(Object.keys(result.visibleRaw || {}));
  const hardwareFields = getDiscoveryDebugHardwareFields(result);
  const allFields = getUniqueDiscoveryDebugFields([...hiddenFields, ...visibleRawKeys, ...hardwareFields]);
  const defaultSelectedFields = [
    ...getDiscoveryVisibleMetadataEntries(result).map(([key]) => key),
    ...getDiscoveryDebugHardwareDisplayedFields(result),
  ];
  return `
    <div class="discovery-debug-panel">
      ${renderDiscoveryDebugFieldSelector(result.id, allFields, defaultSelectedFields)}
    </div>
  `;
}

function renderDiscoveryDebugFieldGroup(resultId, titleKey, fields, checked) {
  const sortedFields = getUniqueDiscoveryDebugFields(fields);
  return `
    <div class="discovery-debug-field-group">
      <div class="discovery-debug-field-group__header">
        <span>${escapeHtml(t(titleKey))}</span>
        <strong>${escapeHtml(String(fields.length))}</strong>
      </div>
      <div class="discovery-debug-field-grid">
        ${fields.length > 0
          ? sortedFields.map((field) => `
              <label class="discovery-debug-field-option">
                <input
                  type="checkbox"
                  data-discovery-debug-field-name="${escapeHtml(field)}"
                  data-discovery-debug-result="${escapeHtml(resultId)}"
                  ${checked ? "checked" : ""}
                >
                <span>${escapeHtml(field)}</span>
              </label>
            `).join("")
          : `<div class="secondary-line">${escapeHtml(t("no_data"))}</div>`}
      </div>
    </div>
  `;
}

function renderDiscoveryDebugFieldSelector(resultId, fields, defaultSelectedFields) {
  const selected = getDiscoveryDebugSelectedFieldSet(resultId, fields, defaultSelectedFields);
  const displayedFields = fields.filter((field) => selected.has(field));
  const hiddenFields = fields.filter((field) => !selected.has(field));
  const detailsKey = `${resultId}:fields`;
  return `
    <details class="discovery-debug-field-picker" data-discovery-debug-fields="${escapeHtml(resultId)}" ${openDiscoveryDebugFieldLists.has(detailsKey) ? "open" : ""}>
      <summary>
        <span>${escapeHtml(t("discovery_debug_fields_title"))}</span>
        <strong>${escapeHtml(String(displayedFields.length))}/${escapeHtml(String(fields.length))}</strong>
      </summary>
      <div class="discovery-debug-field-picker__content discovery-debug-field-picker__content--split">
        ${renderDiscoveryDebugFieldGroup(resultId, "discovery_debug_hidden_fields", hiddenFields, false)}
        ${renderDiscoveryDebugFieldGroup(resultId, "discovery_debug_displayed_fields", displayedFields, true)}
      </div>
    </details>
  `;
}

function renderDiscoveryDebug() {
  if (!elements.discoveryDebugTableBody) {
    return;
  }

  const results = getDisplayDiscoveryResults();
  renderDiscoveryDebugFilterOptions(results);
  const filteredResults = getFilteredDiscoveryDebugResults(results);
  if (filteredResults.length === 0) {
    elements.discoveryDebugTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="4">${escapeHtml(results.length ? t("no_results") : t("empty_discovery_debug"))}</td>
      </tr>
    `;
    return;
  }

  elements.discoveryDebugTableBody.innerHTML = filteredResults
    .slice()
    .sort((left, right) => String(right.updatedAt || right.lastSeenAt).localeCompare(String(left.updatedAt || left.lastSeenAt)))
    .map((result) => {
      const isExpanded = expandedDiscoveryDebugIds.has(result.id);
      const objectLabel = [
        result.name || t("no_data"),
        result.hostName && result.hostName !== result.name ? result.hostName : "",
      ].filter(Boolean).join(" · ");
      const sourceLabel = [
        getDeviceSourceLabel(result.source),
        result.sourceKind ? getDeviceSourceKindLabel(result.sourceKind) : "",
      ].filter(Boolean).join(" · ");
      return `
        <tr>
          <td>
            <button type="button" class="link-button table-row-link discovery-debug-entity" data-toggle-discovery-debug="${escapeHtml(result.id)}" aria-expanded="${isExpanded ? "true" : "false"}">
              ${escapeHtml(isExpanded ? "-" : "+")}
              <strong>${escapeHtml(objectLabel)}</strong>
            </button>
            <div class="secondary-line mono">${escapeHtml(result.sourceId || result.id || t("no_data"))}</div>
          </td>
          <td>${escapeHtml(sourceLabel || t("no_data"))}</td>
          <td>
            <span class="status-badge status-badge--${getDiscoveryStateVariant(result.state)}">${escapeHtml(getDiscoveryStateLabel(result.state))}</span>
            <div class="secondary-line">${escapeHtml(formatDateTime(result.lastSeenAt || result.updatedAt))}</div>
          </td>
          <td>
            <div class="discovery-debug-counts">
              <span>${escapeHtml(t("discovery_details_received_fields"))}: <strong>${escapeHtml(String(getDiscoveryDebugFieldCount(result, "receivedFields")))}</strong></span>
              <span>${escapeHtml(t("discovery_details_accepted_fields"))}: <strong>${escapeHtml(String(getDiscoveryDebugFieldCount(result, "acceptedFields")))}</strong></span>
              <span>${escapeHtml(t("discovery_details_visible_fields"))}: <strong>${escapeHtml(String(getDiscoveryDebugFieldCount(result, "visibleFields")))}</strong></span>
            </div>
          </td>
        </tr>
        ${isExpanded ? `
          <tr class="discovery-debug-details-row" data-expanded-discovery-debug="${escapeHtml(result.id)}">
            <td colspan="4">${renderDiscoveryDebugDetails(result)}</td>
          </tr>
        ` : ""}
      `;
    })
    .join("");
}

function handleDiscoveryDebugFilterChange() {
  discoveryDebugAgentFilter = elements.discoveryDebugAgentFilter?.value || "all";
  discoveryDebugKindFilter = elements.discoveryDebugKindFilter?.value || "all";
  renderDiscoveryDebug();
}

function handleDiscoveryDebugActions(event) {
  const fieldPickerSummary = event.target.closest(".discovery-debug-field-picker summary");
  if (fieldPickerSummary && event.type === "click") {
    const picker = fieldPickerSummary.closest("[data-discovery-debug-fields]");
    const resultId = picker?.dataset.discoveryDebugFields || "";
    if (resultId) {
      const detailsKey = `${resultId}:fields`;
      requestAnimationFrame(() => {
        if (picker.open) {
          openDiscoveryDebugFieldLists.add(detailsKey);
        } else {
          openDiscoveryDebugFieldLists.delete(detailsKey);
        }
      });
    }
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-discovery-debug]");
  if (toggleButton && event.type === "click") {
    const resultId = toggleButton.dataset.toggleDiscoveryDebug || "";
    const willExpand = !expandedDiscoveryDebugIds.has(resultId);
    if (willExpand) {
      expandedDiscoveryDebugIds.add(resultId);
      openDiscoveryDebugFieldLists.add(`${resultId}:fields`);
    } else {
      expandedDiscoveryDebugIds.delete(resultId);
    }
    renderDiscoveryDebug();
    if (willExpand) {
      revealExpandedContent(
        () => document.querySelector(`[data-expanded-discovery-debug="${cssEscape(resultId)}"]`),
        { extraDown: 110 },
      );
    }
    return;
  }

  const fieldToggle = event.target.closest("[data-discovery-debug-field-name]");
  if (fieldToggle && event.type === "change") {
    const resultId = fieldToggle.dataset.discoveryDebugResult || "";
    const fieldName = fieldToggle.dataset.discoveryDebugFieldName || "";
    const options = getDiscoveryDebugOptions(resultId);
    const selected = options.selected;
    if (fieldName && selected instanceof Set) {
      if (fieldToggle.checked) {
        selected.add(fieldName);
      } else {
        selected.delete(fieldName);
      }
      openDiscoveryDebugFieldLists.add(`${resultId}:fields`);
      renderDiscoveryDebug();
    }
  }
}

const DISCOVERY_VISIBLE_METADATA_PRIORITY = [
  "hostname",
  "fqdn",
  "namespace",
  "node",
  "nodeName",
  "vmid",
  "uid",
  "containerId",
  "image",
  "images",
  "type",
  "proxmoxType",
  "template",
  "tags",
  "statusText",
  "phase",
  "dockerState",
  "containersReady",
  "restartCount",
  "primaryIp",
  "ip",
  "ips",
  "podIP",
  "hostIP",
  "clusterIP",
  "externalIPs",
  "mac",
  "networks",
  "loadBalancer",
  "os",
  "kernel",
  "cpuModel",
  "sockets",
  "cpus",
  "loadAverage",
  "cpu",
  "ramUsage",
  "ram",
  "memory",
  "maxMemory",
  "diskCount",
  "diskTotal",
  "diskSummary",
  ...Array.from({ length: 16 }, (_, index) => `disk${index + 1}`),
  "disks",
  "diskUsage",
  "disk",
  "maxDisk",
  "uptime",
  "dockerVersion",
  "dockerComposeVersion",
  "kubernetesVersion",
  "kubernetesGitVersion",
  "kernelVersion",
  "pveVersion",
  "system",
  "machine",
  "agentVersion",
  "selector",
  "labels",
  "owners",
];

function formatBytesValue(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) {
    return String(value);
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = bytes;
  let unitIndex = 0;
  while (Math.abs(current) >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : 1;
  return `${current.toFixed(digits)} ${units[unitIndex]}`;
}

function formatDiscoveryDiskDescriptor(value) {
  const [label, size] = String(value).split("=").map((item) => item.trim());
  return label && Number.isFinite(Number(size))
    ? `${label} ${formatBytesValue(size)}`
    : String(value);
}

function formatDiscoveryMetadataKey(key) {
  const diskMatch = String(key).match(/^disk(\d+)$/);
  if (diskMatch) {
    return `Disk ${diskMatch[1]}`;
  }
  const labels = {
    agentVersion: "Agent",
    clusterIP: "Cluster IP",
    containerId: "Container ID",
    containersReady: "Containers ready",
    cpu: "CPU usage",
    cpuModel: "CPU",
    cpus: "CPU cores",
    created: "Created",
    disk: "Disk used",
    diskCount: "Disks",
    diskSummary: "Disks",
    diskTotal: "Disk total",
    diskUsage: "Disk usage",
    dockerState: "Docker state",
    dockerComposeVersion: "Docker Compose",
    dockerVersion: "Docker",
    externalIPs: "External IPs",
    finishedAt: "Finished",
    fqdn: "FQDN",
    hostIP: "Host IP",
    image: "Image",
    images: "Images",
    ip: "IP",
    ips: "IPs",
    kernel: "Kernel",
    kernelVersion: "Kernel version",
    kubernetesGitVersion: "Kubernetes build",
    kubernetesVersion: "Kubernetes",
    loadBalancer: "Load balancer",
    loadAverage: "Load average",
    labels: "Labels",
    machine: "Architecture",
    mac: "MAC",
    maxDisk: "Disk total",
    maxMemory: "RAM total",
    memory: "RAM used",
    namespace: "Namespace",
    networks: "Networks",
    nodeName: "Node",
    os: "OS",
    owners: "Owners",
    phase: "Phase",
    primaryIp: "Primary IP",
    proxmoxType: "Proxmox type",
    pveVersion: "PVE version",
    podIP: "Pod IP",
    ram: "RAM",
    ramUsage: "RAM usage",
    restartCount: "Restarts",
    selector: "Selector",
    sourceKind: "Source type",
    startedAt: "Started",
    statusText: "Status",
    template: "Template",
    vmid: "VMID",
  };
  if (Object.prototype.hasOwnProperty.call(labels, key)) {
    return labels[key];
  }
  return key;
}

function formatDurationSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return String(value);
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) {
    parts.push(`${days}d`);
  }
  if (hours || days) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function formatDiscoveryMetadataValue(key, value) {
  if (/^disk\d+$/.test(key)) {
    return formatDiscoveryDiskDescriptor(value);
  }
  if (key === "mounts" && Array.isArray(value)) {
    return value
      .map((mount) => {
        if (!mount || typeof mount !== "object") {
          return String(mount);
        }
        const label = mount.mountpoint || mount.name || "mount";
        const used = Number.isFinite(Number(mount.used)) ? formatBytesValue(mount.used) : "";
        const total = Number.isFinite(Number(mount.total)) ? formatBytesValue(mount.total) : "";
        const usage = used && total ? `${used} / ${total}` : total;
        return [label, usage].filter(Boolean).join(" ");
      })
      .join(", ");
  }
  if (key === "disks" && Array.isArray(value)) {
    return value
      .map((disk) => {
        if (!disk || typeof disk !== "object") {
          return String(disk);
        }
        const label = disk.name || disk.storage || disk.bus || "disk";
        const size = disk.size ? formatBytesValue(disk.size) : "";
        return [label, size].filter(Boolean).join(" ");
      })
      .join(", ");
  }
  if (key === "mountSummary") {
    return String(value)
      .split(",")
      .map((part) => {
        const [label, usage] = part.split("=").map((item) => item.trim());
        const [used, total] = String(usage || "").split("/").map((item) => item.trim());
        if (!label || !Number.isFinite(Number(total))) {
          return part.trim();
        }
        if (used && Number.isFinite(Number(used))) {
          return `${label} ${formatBytesValue(used)} / ${formatBytesValue(total)}`;
        }
        return `${label} ${formatBytesValue(total)}`;
      })
      .filter(Boolean)
      .join(", ");
  }
  if (key === "diskSummary") {
    return String(value)
      .split(",")
      .map((part) => formatDiscoveryDiskDescriptor(part.trim()))
      .filter(Boolean)
      .join(", ");
  }
  if (Array.isArray(value)) {
    const visibleValues = value.slice(0, 4).map((item) => String(item));
    const suffix = value.length > visibleValues.length ? ` +${value.length - visibleValues.length}` : "";
    return `${visibleValues.join(", ")}${suffix}`;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  if (["ramUsage", "diskUsage"].includes(key)) {
    const [used, total] = String(value).split("/").map((part) => part.trim());
    if (used && total && Number.isFinite(Number(used)) && Number.isFinite(Number(total))) {
      return `${formatBytesValue(used)} / ${formatBytesValue(total)}`;
    }
  }
  if (["ram", "memory", "maxMemory", "disk", "maxDisk"].includes(key) && Number.isFinite(Number(value))) {
    return formatBytesValue(value);
  }
  if (key === "cpu" && Number.isFinite(Number(value))) {
    return `${(Number(value) * 100).toFixed(1)}%`;
  }
  if (key === "uptime" && Number.isFinite(Number(value))) {
    return formatDurationSeconds(value);
  }
  return String(value);
}

function isProxmoxHypervisorResult(result) {
  return normalizeMetadataToken(result?.source, "") === "proxmox"
    && normalizeMetadataToken(result?.sourceKind, "") === "hypervisor";
}

function isProxmoxHardwareResult(result) {
  return normalizeMetadataToken(result?.source, "") === "proxmox"
    && ["vm", "lxc", "hypervisor"].includes(normalizeMetadataToken(result?.sourceKind, ""));
}

function getProxmoxNodeName(result) {
  return String(result?.visibleRaw?.node || result?.name || result?.hostName || "").trim().toLowerCase();
}

function attachDiscoveryHardwareResult(hostResult, hardwareResult, hiddenIds) {
  if (!hostResult || !hardwareResult || hostResult.id === hardwareResult.id || hiddenIds.has(hardwareResult.id)) {
    return;
  }
  hostResult.hardwareRaw = {
    ...(hostResult.hardwareRaw || {}),
    ...(hardwareResult.visibleRaw || {}),
  };
  hostResult.hardwareReceivedFields = getUniqueDiscoveryDebugFields([
    ...(hostResult.hardwareReceivedFields || []),
    ...(hardwareResult.receivedFields || []),
  ]);
  hostResult.hardwareAcceptedFields = getUniqueDiscoveryDebugFields([
    ...(hostResult.hardwareAcceptedFields || []),
    ...(hardwareResult.acceptedFields || []),
  ]);
  hostResult.hardwareVisibleFields = getUniqueDiscoveryDebugFields([
    ...(hostResult.hardwareVisibleFields || []),
    ...(hardwareResult.visibleFields || []),
  ]);
  hiddenIds.add(hardwareResult.id);
}

function mergeDiscoveryHardwareResults(results) {
  const mergedResults = results.map((result) => ({ ...result }));
  const hostByNode = new Map();
  const hostByDeviceId = new Map();
  mergedResults.forEach((result) => {
    const sourceKind = normalizeMetadataToken(result.sourceKind, "");
    if (sourceKind !== "host") {
      return;
    }
    if (result.matchedDeviceId) {
      hostByDeviceId.set(`${result.agentId}::${result.matchedDeviceId}`, result);
      hostByDeviceId.set(result.matchedDeviceId, result);
    }
    const nodeName = String(result.name || result.hostName || "").trim().toLowerCase();
    if (nodeName) {
      hostByNode.set(`${result.agentId}::${nodeName}`, result);
    }
  });

  const hiddenIds = new Set();
  mergedResults.forEach((result) => {
    if (!isProxmoxHardwareResult(result)) {
      return;
    }
    const hostByDevice = result.matchedDeviceId
      ? hostByDeviceId.get(`${result.agentId}::${result.matchedDeviceId}`) || hostByDeviceId.get(result.matchedDeviceId)
      : null;
    if (hostByDevice) {
      attachDiscoveryHardwareResult(hostByDevice, result, hiddenIds);
      return;
    }
    if (!isProxmoxHypervisorResult(result)) {
      return;
    }
    const nodeName = getProxmoxNodeName(result);
    const hostResult = nodeName ? hostByNode.get(`${result.agentId}::${nodeName}`) : null;
    if (!hostResult) {
      return;
    }
    attachDiscoveryHardwareResult(hostResult, result, hiddenIds);
  });
  return mergedResults.filter((result) => !hiddenIds.has(result.id));
}

function sortDiscoveryMetadataEntries(entries) {
  return [...entries].sort(([leftKey], [rightKey]) => {
    const leftIndex = DISCOVERY_VISIBLE_METADATA_PRIORITY.indexOf(leftKey);
    const rightIndex = DISCOVERY_VISIBLE_METADATA_PRIORITY.indexOf(rightKey);
    const leftRank = leftIndex === -1 ? DISCOVERY_VISIBLE_METADATA_PRIORITY.length : leftIndex;
    const rightRank = rightIndex === -1 ? DISCOVERY_VISIBLE_METADATA_PRIORITY.length : rightIndex;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return leftKey.localeCompare(rightKey, getLanguage(), { sensitivity: "base" });
  });
}

function dedupeDiscoveryMetadataEntries(entries) {
  const result = [];
  const indexByKey = new Map();
  entries.forEach((entry) => {
    const [key] = entry;
    if (indexByKey.has(key)) {
      result[indexByKey.get(key)] = entry;
      return;
    }
    indexByKey.set(key, result.length);
    result.push(entry);
  });
  return result;
}

function getDiscoveryVisibleMetadataEntries(result) {
  const raw = result.visibleRaw || {};
  const hiddenWhenSummarized = new Set();
  const source = normalizeMetadataToken(result.source, "");
  const sourceKind = normalizeMetadataToken(result.sourceKind, "");
  hiddenWhenSummarized.add("mountSummary");
  hiddenWhenSummarized.add("mounts");
  hiddenWhenSummarized.add("python");
  hiddenWhenSummarized.add("platform");
  hiddenWhenSummarized.add("release");
  if (raw.os) {
    hiddenWhenSummarized.add("pveVersion");
  }
  if (raw.kernel) {
    hiddenWhenSummarized.add("kernelVersion");
  }
  if (Object.keys(raw).some((key) => /^disk\d+$/.test(key))) {
    hiddenWhenSummarized.add("diskCount");
    hiddenWhenSummarized.add("diskTotal");
    hiddenWhenSummarized.add("maxDisk");
    hiddenWhenSummarized.add("diskSummary");
    hiddenWhenSummarized.add("disks");
    hiddenWhenSummarized.add("diskUsage");
  }
  if (source === "proxmox" && sourceKind === "template") {
    hiddenWhenSummarized.add("cpu");
    hiddenWhenSummarized.add("uptime");
    hiddenWhenSummarized.add("memory");
    hiddenWhenSummarized.add("maxMemory");
    hiddenWhenSummarized.add("ramUsage");
    hiddenWhenSummarized.add("maxDisk");
    hiddenWhenSummarized.add("diskTotal");
    hiddenWhenSummarized.add("diskUsage");
  }
  if (raw.ramUsage) {
    hiddenWhenSummarized.add("memory");
    hiddenWhenSummarized.add("maxMemory");
  }
  if (source === "proxmox" && sourceKind === "hypervisor") {
    hiddenWhenSummarized.add("uptime");
    hiddenWhenSummarized.add("disk");
    hiddenWhenSummarized.add("maxDisk");
    hiddenWhenSummarized.add("diskTotal");
    hiddenWhenSummarized.add("diskUsage");
    hiddenWhenSummarized.add("diskSummary");
    hiddenWhenSummarized.add("disks");
  }
  if (raw.diskSummary || raw.diskUsage) {
    hiddenWhenSummarized.add("disk");
    hiddenWhenSummarized.add("maxDisk");
    hiddenWhenSummarized.add("diskTotal");
    if (raw.diskSummary) {
      hiddenWhenSummarized.add("disks");
      hiddenWhenSummarized.add("diskUsage");
    }
  }
  const entries = Object.entries(raw)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined);
  const visibleEntries = entries.filter(([key]) => !hiddenWhenSummarized.has(key));
  return sortDiscoveryMetadataEntries(visibleEntries).slice(0, 12);
}

function renderDiscoveryMetadataList(titleKey, entries) {
  const sortedEntries = sortDiscoveryMetadataEntries(dedupeDiscoveryMetadataEntries(entries));
  return `
    <div class="discovery-metadata-list">
      <span class="secondary-line">${escapeHtml(t(titleKey))}</span>
      ${sortedEntries.length > 0
        ? sortedEntries.map(([key, value]) => {
          const textValue = formatDiscoveryMetadataValue(key, value);
          const isWideRow = /^(disk\d+|cpuModel|kernel|kernelVersion|pveVersion|loadAverage|os|dockerComposeVersion|kubernetesVersion)$/.test(key);
          return `
            <div class="discovery-metadata-row${isWideRow ? " discovery-metadata-row--wide" : ""}">
              <span>${escapeHtml(formatDiscoveryMetadataKey(key))}</span>
              <code>${escapeHtml(truncateText(textValue, /^disk\d+$/.test(key) ? 180 : 120))}</code>
            </div>
          `;
        }).join("")
        : `<div class="secondary-line">${escapeHtml(t("discovery_details_no_visible_metadata"))}</div>`}
    </div>
  `;
}

function getDiscoveryHardwareMetadataEntries(result) {
  if (!result.hardwareRaw || typeof result.hardwareRaw !== "object") {
    return [];
  }
  return getDiscoveryVisibleMetadataEntries({
    source: "proxmox",
    sourceKind: "hypervisor",
    visibleRaw: result.hardwareRaw,
  });
}

function shouldPreferHostMetadataValue(key, hostValue, hardwareValue) {
  if (key !== "os") {
    return false;
  }
  const hostText = String(hostValue || "").trim();
  const hardwareText = String(hardwareValue || "").trim();
  return hostText.length > hardwareText.length && hostText.toLowerCase().startsWith(hardwareText.toLowerCase());
}

function renderDiscoveryDetails(result) {
  const rawVisibleEntries = getDiscoveryVisibleMetadataEntries(result);
  const visibleByKey = new Map(rawVisibleEntries);
  const hardwareEntries = getDiscoveryHardwareMetadataEntries(result)
    .filter(([key, value]) => !(
      ["os", "kernel", "kernelVersion", "pveVersion"].includes(key)
      && visibleByKey.has(key)
      && shouldPreferHostMetadataValue(key, visibleByKey.get(key), value)
    ));
  const hasHardwareMetadata = hardwareEntries.length > 0;
  const hardwareKeys = new Set(hardwareEntries.map(([key]) => key));
  const visibleEntries = rawVisibleEntries
    .filter(([key]) => !(hasHardwareMetadata && hardwareKeys.has(key) && ["os", "kernel", "kernelVersion", "pveVersion"].includes(key)));
  const detailItems = [
    [getDiscoveryTargetKind(result) === "template" ? "discovery_details_detected_as" : "discovery_details_target", getDiscoveryTargetLabel(result)],
    ["device_source_label", getDeviceSourceLabel(result.source)],
    ["device_source_id_label", result.sourceId || t("no_data")],
  ];
  if (shouldShowDiscoverySourceKind(result)) {
    detailItems.splice(2, 0, ["device_source_kind_label", getDeviceSourceKindLabel(result.sourceKind)]);
  }
  if (result.serviceUrl) {
    detailItems.push(["service_public_url_label", result.serviceUrl]);
  }
  if (result.accessPort) {
    detailItems.push(["service_access_port_label", result.accessPort]);
  }
  if (result.ports) {
    detailItems.push(["service_ports_label", result.ports]);
  }

  return `
    <div class="discovery-details-panel">
      <div class="discovery-details-grid">
        ${detailItems.map(([labelKey, value]) => `
          <div class="discovery-details-item">
            <span>${escapeHtml(t(labelKey))}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
      <div class="discovery-metadata-stack${hasHardwareMetadata ? " discovery-metadata-stack--split" : ""}">
        ${renderDiscoveryMetadataList(
          hasHardwareMetadata ? "discovery_details_host_metadata_title" : "discovery_details_metadata_title",
          visibleEntries,
        )}
        ${hasHardwareMetadata ? renderDiscoveryMetadataList("discovery_details_hardware_metadata_title", hardwareEntries) : ""}
      </div>
    </div>
  `;
}

function renderDiscoveryPreview() {
  if (!elements.discoveryResultsTableBody) {
    return;
  }

  const agents = state.admin?.discoveryAgents || [];
  const results = getDisplayDiscoveryResults();
  const counts = results.reduce((accumulator, result) => {
    const stateName = String(result.state || "new").trim().toLowerCase();
    accumulator[stateName] = (accumulator[stateName] || 0) + 1;
    return accumulator;
  }, {});

  if (elements.discoveryResultsCounter) {
    elements.discoveryResultsCounter.textContent = formatRecordsCount(results.length);
  }
  if (elements.discoveryStaleCleanupButton) {
    elements.discoveryStaleCleanupButton.disabled = !results.some(isStaleDiscoveryResult);
  }

  if (elements.discoverySummaryGrid) {
    const summaryItems = [
      ["discovery_agents_count", agents.length],
      ["discovery_state_new", counts.new || 0],
      ["discovery_state_matched", counts.matched || 0],
      ["discovery_state_stale", counts.stale || 0],
      ["discovery_state_ignored", counts.ignored || 0],
    ];
    elements.discoverySummaryGrid.innerHTML = summaryItems.map(([labelKey, count]) => `
      <div class="discovery-summary-card">
        <span class="stat-label">${escapeHtml(t(labelKey))}</span>
        <strong>${escapeHtml(String(count))}</strong>
      </div>
    `).join("");
  }

  if (results.length === 0) {
    elements.discoveryResultsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">${escapeHtml(t("empty_discovery_results"))}</td>
      </tr>
    `;
    return;
  }

  const groupedResults = new Map();
  results.forEach((result) => {
    const group = getDiscoveryPreviewGroup(result);
    if (!groupedResults.has(group.key)) {
      groupedResults.set(group.key, { ...group, results: [] });
    }
    groupedResults.get(group.key).results.push(result);
  });

  elements.discoveryResultsTableBody.innerHTML = [...groupedResults.values()]
    .map((group) => {
      const isExpanded = expandedDiscoveryGroupIds.has(group.key);
      const groupRows = isExpanded
        ? sortDiscoveryPreviewResults(group.results).map((result) => renderDiscoveryPreviewRow(result, group.key)).join("")
        : "";
      return `
        <tr class="discovery-group-row" data-discovery-group-row="${escapeHtml(group.key)}">
          <td colspan="7">
            <button
              type="button"
              class="link-button discovery-group-toggle"
              data-toggle-discovery-group="${escapeHtml(group.key)}"
              aria-expanded="${isExpanded ? "true" : "false"}"
            >
              ${escapeHtml(isExpanded ? "-" : "+")}
              <strong>${escapeHtml(group.hostLabel)}</strong>
            </button>
            <span class="secondary-line">
              ${escapeHtml(group.agentLabel)} · ${escapeHtml(formatRecordsCount(group.results.length))}
            </span>
          </td>
        </tr>
        ${groupRows}
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

function renderDeviceHostSourceCell(device) {
  const host = resolveDeviceHost(device);
  const source = device.source || "";
  const status = device.integrationStatus || "";
  const lines = [];

  if (host) {
    lines.push(`${t("device_host_short")}: ${host.name}`);
  } else if (isServiceRecord(device) && device.hostDeviceId) {
    lines.push(t("device_host_orphan"));
  }
  if (device.sourceKind) {
    lines.push(device.sourceKind);
  }
  if (device.sourceId) {
    lines.push(device.sourceId);
  }
  if (device.ports) {
    lines.push(device.ports);
  }
  if (device.protocol) {
    lines.push(getServiceProtocolLabel(device.protocol));
  }
  if (device.lastSeenAt) {
    lines.push(`${t("device_last_seen_short")}: ${formatDateTime(device.lastSeenAt)}`);
  }

  return `
    <div class="device-source-cell">
      <span class="status-badge status-badge--${status === "running" ? "ok" : status ? "warn" : "info"}">${escapeHtml(getDeviceSourceLabel(source))}</span>
      ${status ? `<span class="status-badge status-badge--${status === "running" ? "ok" : "warn"}">${escapeHtml(getIntegrationStatusLabel(status))}</span>` : ""}
      <div class="secondary-line">${escapeHtml(lines.join(" · ") || t("no_data"))}</div>
    </div>
  `;
}

function renderServicesList() {
  if (!elements.servicesTableBody) {
    return;
  }

  const searchTerm = normalizeSearch(elements.searchInput.value);
  const quickFilter = elements.deviceFilterSelect?.value || "all";
  const groupFilter = elements.deviceGroupFilterSelect?.value || "";
  const hasActiveFilter = Boolean(searchTerm || quickFilter !== "all" || groupFilter);
  const services = getServiceRecords()
    .filter((service) => matchesSearch(service, searchTerm, quickFilter, groupFilter))
    .slice()
    .sort((left, right) => {
      const leftHost = resolveDeviceHost(left)?.name || "";
      const rightHost = resolveDeviceHost(right)?.name || "";
      const hostDiff = leftHost.localeCompare(rightHost, getLanguage());
      if (hostDiff !== 0) {
        return hostDiff;
      }
      return left.name.localeCompare(right.name, getLanguage());
    });

  elements.servicesCounter.textContent = hasActiveFilter
    ? formatFilteredCount(services.length, getServiceRecords().length)
    : formatRecordsCount(services.length);
  const shouldShowExpand = syncRegistryListWrap(elements.servicesTableWrap, services.length, showAllServicesInRegistry);
  syncRegistryListToggleButton(
    elements.servicesListToggleButton,
    shouldShowExpand,
    showAllServicesInRegistry,
    "show_all_services",
    "show_less_services",
    services.length,
  );

  if (services.length === 0) {
    elements.servicesTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="10">${escapeHtml(searchTerm || quickFilter !== "all" ? t("no_results") : t("empty_services"))}</td>
      </tr>
    `;
    return;
  }

  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
  const discoveryResults = getDisplayDiscoveryResults();
  const rows = services.map((service) => {
    const host = resolveDeviceHost(service);
    const status = service.integrationStatus || "";
    const hasLiveStatus = hasLiveAgentStatus(service);
    const availability = getAgentAvailabilityStatus(service);
    const hasAvailabilityWarning = hasLiveStatus && (availability.state === "pending" || availability.state === "down");
    const hasManualDisplayStatus = Boolean(status && status !== "pending" && status !== "wait");
    const effectiveStatusLabel = hasManualDisplayStatus
      ? getIntegrationStatusLabel(status)
      : t("registry_source_manual");
    const effectiveStatusVariant = hasManualDisplayStatus
      ? getIntegrationStatusVariant(status)
      : "muted";
    const agentDisabledBadge = renderAgentDisabledBadge(service);
    const source = service.source || "";
    const hostName = host ? host.name : t("device_host_orphan");
    const hostAddress = host ? host.ip : (service.hostDeviceId || t("no_data"));
    const hostLabel = `${hostName} · ${hostAddress}`;
    const isOrphan = hasMissingHost(service);
    const protocolLabel = getServiceProtocolLabel(service.protocol || "http");
    const accessPort = getServiceAccessPort(service);
    const privateUrl = buildPrivateServiceUrl(service, host);
    const publicUrl = getPublicServiceUrl(service);
    const sourceLabel = getDeviceSourceLabel(source);
    const sourceLogoText = getDeviceSourceLogoText(source);
    const sourceLogoClass = getDeviceSourceLogoClass(source);
    const sourceLogo = sourceLogoText
      ? `<span class="source-logo ${escapeHtml(sourceLogoClass)}" title="${escapeHtml(sourceLabel)}" aria-label="${escapeHtml(sourceLabel)}">${escapeHtml(sourceLogoText)}</span>`
      : "";
    const sourceDetails = [
      service.sourceKind && service.sourceKind !== "service" ? getDeviceSourceKindLabel(service.sourceKind) : "",
    ].filter(Boolean);
    const manualTooltip = escapeHtml(t("registry_source_manual_tooltip"));
    const statusBadges = hasLiveStatus
      ? `<span class="status-badge status-badge--${availability.variant}" title="${escapeHtml([t("agent_status_tooltip"), getRecordLiveLastSeenAt(service) ? formatDateTime(getRecordLiveLastSeenAt(service)) : ""].filter(Boolean).join(" · "))}">${escapeHtml(availability.label)}</span>`
      : `
        <span class="status-badge status-badge--${effectiveStatusVariant}" ${hasManualDisplayStatus ? "" : `title="${manualTooltip}"`}>
          ${escapeHtml(effectiveStatusLabel)}
        </span>
        ${hasManualDisplayStatus ? `<span class="status-badge status-badge--muted" title="${manualTooltip}">${escapeHtml(t("registry_source_manual"))}</span>` : ""}
      `;
    const note = service.note && !isGeneratedAgentNote(service.note)
      ? renderRegistryComment(service.note)
      : renderRegistryComment("");

    return `
      <tr class="${status === "source_missing" || status === "source-missing" ? "registry-row--source-missing" : ""}">
        <td>
          <div class="service-table__name${sourceLogo ? "" : " service-table__name--plain"}">
            ${sourceLogo}
            ${renderRegistryDiscoveryName(service, "data-toggle-service-discovery", discoveryResults)}
            ${renderRegistrySourceBadges(service)}
            ${sourceDetails.length ? `<div class="secondary-line">${escapeHtml(sourceDetails.join(" · "))}</div>` : ""}
          </div>
        </td>
        <td>
          <div class="service-table__host" title="${escapeHtml(hostLabel)}">
            <span>${escapeHtml(hostName)}</span>
            <span class="secondary-line mono">${escapeHtml(hostAddress)}</span>
          </div>
          ${isOrphan ? `<span class="status-badge status-badge--warn">${escapeHtml(t("status_orphan"))}</span>` : ""}
        </td>
        <td>
          <div class="service-url-stack">
            ${publicUrl ? `<div><span class="secondary-line">${escapeHtml(t("service_public_url_label"))}</span><span class="mono service-table__url">${escapeHtml(publicUrl)}</span></div>` : ""}
            <div><span class="secondary-line">${escapeHtml(t("service_private_url_label"))}</span><span class="mono service-table__url">${escapeHtml(privateUrl || t("no_data"))}</span></div>
          </div>
        </td>
        <td><span class="pill service-table__protocol">${escapeHtml(protocolLabel)}</span></td>
        <td class="mono service-table__ports">${renderServicePorts(accessPort)}</td>
        <td class="mono service-table__ports">${renderServicePorts(service.ports)}</td>
        <td>
          <div class="table-status-stack">
            ${agentDisabledBadge}
            ${statusBadges}
          </div>
        </td>
        <td class="service-table__last-seen">${renderDateTimeStack(service.lastSeenAt)}</td>
        <td class="service-table__comment-cell">${note}</td>
        <td>
          <div class="service-row-actions">
            <div class="service-row-actions__urls${publicUrl ? "" : " service-row-actions__urls--single"}">
              ${publicUrl ? `<button type="button" class="row-button" data-copy-public-service-url="${escapeHtml(service.id)}">${escapeHtml(t("copy_public_url_button"))}</button>` : ""}
              <button type="button" class="row-button" data-copy-private-service-url="${escapeHtml(service.id)}" ${privateUrl ? "" : "disabled"}>${escapeHtml(t("copy_private_url_button"))}</button>
            </div>
            <div class="service-row-actions__manage">
              <button type="button" class="row-button" data-edit-service="${escapeHtml(service.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button row-button--danger" data-delete-service="${escapeHtml(service.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
            </div>
          </div>
        </td>
      </tr>
      ${renderRegistryDiscoveryDetailsRow(service, 10, discoveryResults)}
    `;
  });

  elements.servicesTableBody.innerHTML = rows.join("");
}

function renderDevicesTable() {
  const canWrite = Boolean(state.auth?.capabilities?.canWrite);
  const searchTerm = normalizeSearch(elements.searchInput.value);
  const quickFilter = elements.deviceFilterSelect?.value || "all";
  const groupFilter = elements.deviceGroupFilterSelect?.value || "";
  const hasActiveFilter = Boolean(searchTerm || quickFilter !== "all" || groupFilter);
  const allDevices = getInventoryDevices();
  const filteredDevices = allDevices.filter((device) => matchesSearch(device, searchTerm, quickFilter, groupFilter));
  const shouldShowExpand = syncRegistryListWrap(elements.devicesTableWrap, filteredDevices.length, showAllDevicesInRegistry);
  syncRegistryListToggleButton(
    elements.devicesListToggleButton,
    shouldShowExpand,
    showAllDevicesInRegistry,
    "show_all_devices",
    "show_less_devices",
    filteredDevices.length,
  );

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
      ? formatFilteredCount(0, allDevices.length)
      : formatRecordsCount(0);
    return;
  }

  const sortedDevices = filteredDevices
    .slice()
    .sort((left, right) => ipToInt(left.ip) - ipToInt(right.ip));

  const discoveryResults = getDisplayDiscoveryResults();
  const rows = sortedDevices
    .map((device) => {
      const subnet = resolveDeviceSubnet(device);
      const group = resolveDeviceGroup(device, subnet);
      const pingVisible = isSubnetPingVisible(subnet);
      const pingBadge = renderPingBadge(device.ip, subnet);
      const status = evaluateDeviceStatus(device, subnet);
      const groupCell = group
        ? `<button type="button" class="link-button table-row-link" data-jump-group="${escapeHtml(group.id)}">${escapeHtml(group.name)}</button><br><span class="mono">${escapeHtml(formatGroupRange(group, true))}</span>`
        : escapeHtml(t("no_data"));
      const note = device.note && !isGeneratedAgentNote(device.note)
        ? renderRegistryComment(device.note)
        : "";
      return `
        <tr class="${device.integrationStatus === "source_missing" || device.integrationStatus === "source-missing" ? "registry-row--source-missing" : ""}">
          <td>
            ${renderRegistryDiscoveryName(device, "data-toggle-device-discovery", discoveryResults)}
            ${renderRegistrySourceBadges(device)}
            ${note}
          </td>
          <td class="mono">${escapeHtml(device.ip)}</td>
          <td class="mono">${escapeHtml(device.mac || t("no_data"))}</td>
          <td>${escapeHtml(getDeviceTypeLabel(device.type) || t("no_data"))}</td>
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : escapeHtml(t("no_data"))}</td>
          <td>${groupCell}</td>
          <td>${pingVisible ? pingBadge : ""}</td>
          <td>${renderDeviceStatusCell(device, status)}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="row-button" data-copy-ip="${escapeHtml(device.ip)}">${escapeHtml(t("copy_ip_button"))}</button>
              <button type="button" class="row-button" data-edit-device="${escapeHtml(device.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("edit_row"))}</button>
              <button type="button" class="row-button row-button--danger" data-delete-device="${escapeHtml(device.id)}" ${canWrite ? "" : "disabled"}>${escapeHtml(t("delete_row"))}</button>
            </div>
          </td>
        </tr>
        ${renderRegistryDiscoveryDetailsRow(device, 9, discoveryResults)}
      `;
    });

  elements.devicesTableBody.innerHTML = rows.join("");
  elements.devicesCounter.textContent = hasActiveFilter
    ? formatFilteredCount(filteredDevices.length, allDevices.length)
    : formatRecordsCount(filteredDevices.length);
}

function renderHistoryTable() {
  const searchTerm = normalizeSearch(elements.historySearchInput?.value || "");
  const exactIpTerm = normalizeIpSafe(searchTerm);
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

    if (exactIpTerm && (scopeFilter === "all" || scopeFilter === "ip")) {
      return entry.ip === exactIpTerm || entry.previousIp === exactIpTerm;
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
    const ipLabel = formatHistoryIpLabel(entry, true);
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
  const inventoryDevices = getInventoryDevices();
  const services = getServiceRecords();
  const freeInPools = state.subnets.reduce((total, subnet) => {
    return total + countFreeInSubnet(subnet);
  }, 0);

  elements.statSubnets.textContent = String(state.subnets.length);
  elements.statDevices.textContent = String(inventoryDevices.length);
  elements.statServices.textContent = String(services.length);
  elements.statOccupied.textContent = String(assignedIps.size);
  elements.statAvailable.textContent = String(freeInPools);
}

function renderDashboardPanels() {
  renderDashboardHealth();
  renderDashboardAttention();
  renderDashboardHistory();
}

function renderDashboardHealth() {
  if (!elements.dashboardHealthList) {
    return;
  }

  const agents = state.admin?.discoveryAgents || [];
  const enabledAgents = agents.filter((agent) => agent.enabled);
  const agentStates = enabledAgents.map((agent) => getDiscoveryFreshness(agent.lastSeenAt, agent));
  const agentUp = agentStates.filter((status) => status.state === "up").length;
  const agentPending = agentStates.filter((status) => status.state === "pending").length;
  const agentDown = agentStates.filter((status) => status.state === "down").length;
  const disabledAgents = agents.length - enabledAgents.length;

  const discoveryResults = getDisplayDiscoveryResults();
  const discoveryNew = discoveryResults.filter((result) => result.state === "new").length;
  const discoveryStale = discoveryResults.filter((result) => result.state === "stale").length;
  const discoveryMatched = discoveryResults.filter((result) => result.state === "matched").length;

  const services = getServiceRecords();
  const liveServices = services.filter(hasLiveAgentStatus);
  const liveStates = liveServices.map((service) => getAgentAvailabilityStatus(service));
  const servicesUp = liveStates.filter((status) => status.state === "up").length;
  const servicesPending = liveStates.filter((status) => status.state === "pending").length;
  const servicesDown = liveStates.filter((status) => status.state === "down").length;

  const cards = [
    {
      title: t("dashboard_health_agents_title"),
      value: `${agentUp}/${enabledAgents.length}`,
      note: t("dashboard_health_agents_note", { pending: agentPending, down: agentDown, disabled: disabledAgents }),
      tone: agentDown > 0 ? "danger" : agentPending > 0 ? "warn" : "ok",
      action: "discovery",
    },
    {
      title: t("dashboard_health_discovery_title"),
      value: String(discoveryNew),
      note: t("dashboard_health_discovery_note", { matched: discoveryMatched, stale: discoveryStale }),
      tone: discoveryStale > 0 ? "warn" : discoveryNew > 0 ? "info" : "ok",
      action: "discovery",
    },
    {
      title: t("dashboard_health_services_title"),
      value: `${servicesUp}/${liveServices.length}`,
      note: t("dashboard_health_services_note", { pending: servicesPending, down: servicesDown }),
      tone: servicesDown > 0 ? "danger" : servicesPending > 0 ? "warn" : "ok",
      action: "services",
    },
  ];

  elements.dashboardHealthList.innerHTML = cards
    .map((card) => `
      <li>
        <button type="button" class="mini-item mini-item--attention mini-item--${escapeHtml(card.tone)} dashboard-health-card" data-dashboard-health-action="${escapeHtml(card.action)}">
          <span class="mini-title">${escapeHtml(card.title)}</span>
          <span class="mini-value">${escapeHtml(card.value)}</span>
          <span class="mini-meta">${escapeHtml(card.note)}</span>
        </button>
      </li>
    `)
    .join("");
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

function handleDashboardHealthClick(event) {
  const button = event.target.closest("[data-dashboard-health-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.dashboardHealthAction;
  if (action === "discovery") {
    openIntegrationsModal("discovery");
    return;
  }
  if (action === "services") {
    setActiveView("registry");
    setActiveRegistrySection("services");
    document.getElementById("registry-panel-services")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
          hostDeviceId: device.hostDeviceId || "",
          source: device.source || "",
          sourceKind: device.sourceKind || "",
          sourceId: device.sourceId || "",
          integrationStatus: device.integrationStatus || "",
          protocol: device.protocol || "",
          serviceUrl: device.serviceUrl || "",
          accessPort: device.accessPort || "",
          ports: device.ports || "",
          lastSeenAt: device.lastSeenAt || "",
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
  getInventoryDevices().forEach((device) => {
    const bucket = conflictMap.get(device.ip) || [];
    bucket.push(device.name);
    conflictMap.set(device.ip, bucket);
  });
  const conflictEntries = [...conflictMap.entries()].filter(([, names]) => names.length > 1);

  const placementIssues = getInventoryDevices().flatMap((device) => {
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

  const missingTypeDevices = getDevicesMissingType()
    .map((device) => `${device.name} · ${device.ip}${device.unknownType ? ` · ${t("missing_type_raw_value", { value: device.unknownType })}` : ""}`);
  const orphanDevices = state.devices
    .filter(hasMissingHost)
    .map((device) => `${device.name} · ${device.ip} · ${getDeviceSourceLabel(device.source || "")}`);
  const staleDiscovery = getDisplayDiscoveryResults()
    .filter((result) => result.state === "stale")
    .map((result) => `${result.name} · ${getDeviceSourceLabel(result.source)} · ${formatDateTime(result.lastSeenAt || result.updatedAt)}`);
  const agentIssues = (state.admin?.discoveryAgents || [])
    .filter((agent) => agent.enabled)
    .map((agent) => ({ agent, freshness: getDiscoveryFreshness(agent.lastSeenAt, agent) }))
    .filter(({ freshness, agent }) => freshness.state !== "up" || agent.lastError || agent.lastRejectReason)
    .map(({ agent, freshness }) => `${agent.name} · ${freshness.label}${agent.lastError ? ` · ${agent.lastError}` : ""}${agent.lastRejectReason ? ` · ${agent.lastRejectReason}` : ""}`);
  const unavailableServices = getServiceRecords()
    .filter(hasLiveAgentStatus)
    .map((service) => ({ service, availability: getAgentAvailabilityStatus(service) }))
    .filter(({ availability }) => availability.state === "down")
    .map(({ service }) => `${service.name} · ${resolveDeviceHost(service)?.name || t("no_binding")}`);
  const pendingServices = getServiceRecords()
    .filter(hasLiveAgentStatus)
    .map((service) => ({ service, availability: getAgentAvailabilityStatus(service) }))
    .filter(({ availability }) => availability.state === "pending")
    .map(({ service }) => `${service.name} · ${resolveDeviceHost(service)?.name || t("no_binding")}`);
  const newDiscovery = getDisplayDiscoveryResults()
    .filter((result) => result.state === "new")
    .map((result) => `${result.name} · ${getDeviceSourceLabel(result.source)} · ${result.agentName || t("no_data")}`);

  const items = [
    {
      value: agentIssues.length,
      title: t("dashboard_attention_agents_title"),
      note: t("dashboard_attention_agents_note"),
      tone: agentIssues.length > 0 ? "danger" : "ok",
      details: agentIssues,
    },
    {
      value: unavailableServices.length,
      title: t("dashboard_attention_services_down_title"),
      note: t("dashboard_attention_services_down_note"),
      tone: unavailableServices.length > 0 ? "danger" : "ok",
      details: unavailableServices,
    },
    {
      value: pendingServices.length,
      title: t("dashboard_attention_services_pending_title"),
      note: t("dashboard_attention_services_pending_note"),
      tone: pendingServices.length > 0 ? "warn" : "ok",
      details: pendingServices,
    },
    {
      value: newDiscovery.length,
      title: t("dashboard_attention_discovery_new_title"),
      note: t("dashboard_attention_discovery_new_note"),
      tone: newDiscovery.length > 0 ? "info" : "ok",
      details: newDiscovery,
    },
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
      value: orphanDevices.length,
      title: t("dashboard_attention_orphans_title"),
      note: t("dashboard_attention_orphans_note"),
      tone: orphanDevices.length > 0 ? "warn" : "ok",
      details: orphanDevices,
    },
    {
      value: staleDiscovery.length,
      title: t("dashboard_attention_stale_title"),
      note: t("dashboard_attention_stale_note"),
      tone: staleDiscovery.length > 0 ? "warn" : "ok",
      details: staleDiscovery,
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
  if (!elements.dashboardHistoryList) {
    return;
  }
  if (state.history.length === 0) {
    elements.dashboardHistoryList.innerHTML = `<li class="mini-list__empty">${escapeHtml(t("empty_history"))}</li>`;
    return;
  }

  const items = state.history
    .slice(0, 3)
    .map((entry) => {
      const ipLabel = formatHistoryIpLabel(entry);
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
  const hasTopology = Boolean(rawState && Object.prototype.hasOwnProperty.call(rawState, "topology"));
  const topology = hasTopology ? normalizeTopology(rawState?.topology) : null;
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

  return { subnets, groups, devices, topology, scanResults, history, meta, settings, accessGroups, auth, admin, preferences };
}

function normalizeTopology(rawTopology) {
  const normalizeNode = (node) => ({
    id: String(node?.id || ""),
    kind: String(node?.kind || "unknown"),
    role: String(node?.role || "unknown"),
    layer: String(node?.layer || ""),
    label: String(node?.label || node?.id || ""),
    cidr: String(node?.cidr || ""),
    ip: String(node?.ip || ""),
    mac: String(node?.mac || ""),
    status: String(node?.status || "unknown"),
    source: String(node?.source || "ipam"),
    sourceKind: String(node?.sourceKind || ""),
    graphSource: String(node?.graphSource || ""),
    subnetId: String(node?.subnetId || ""),
    deviceId: String(node?.deviceId || ""),
    serviceId: String(node?.serviceId || ""),
    hostDeviceId: String(node?.hostDeviceId || ""),
    discoveryResultId: String(node?.discoveryResultId || ""),
    agentId: String(node?.agentId || ""),
    agentName: String(node?.agentName || ""),
    accessGroupId: String(node?.accessGroupId || ""),
    accessGroupName: String(node?.accessGroupName || ""),
    metadata: node?.metadata && typeof node.metadata === "object" ? node.metadata : {},
  });
  const normalizeLink = (link) => ({
    id: String(link?.id || ""),
    source: String(link?.source || ""),
    target: String(link?.target || ""),
    kind: String(link?.kind || "related"),
    confidence: String(link?.confidence || "low"),
    reason: String(link?.reason || ""),
    sourceType: String(link?.sourceType || ""),
    graphSource: String(link?.graphSource || ""),
  });
  const normalizeInterface = (item) => ({
    id: String(item?.id || ""),
    nodeId: String(item?.nodeId || ""),
    name: String(item?.name || ""),
    ip: String(item?.ip || ""),
    mac: String(item?.mac || ""),
    subnetId: String(item?.subnetId || ""),
    source: String(item?.source || ""),
    graphSource: String(item?.graphSource || ""),
    confidence: String(item?.confidence || "low"),
  });
  return {
    schema: String(rawTopology?.schema || "atlas.topology.v1"),
    generatedAt: String(rawTopology?.generatedAt || ""),
    nodes: Array.isArray(rawTopology?.nodes) ? rawTopology.nodes.map(normalizeNode).filter((node) => node.id) : [],
    links: Array.isArray(rawTopology?.links) ? rawTopology.links.map(normalizeLink).filter((link) => link.id && link.source && link.target) : [],
    interfaces: Array.isArray(rawTopology?.interfaces) ? rawTopology.interfaces.map(normalizeInterface).filter((item) => item.id && item.nodeId) : [],
    summary: rawTopology?.summary && typeof rawTopology.summary === "object" ? rawTopology.summary : {},
    capabilities: rawTopology?.capabilities && typeof rawTopology.capabilities === "object"
      ? rawTopology.capabilities
      : { advancedMode: false, layers: {} },
  };
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
    discoveryDataPolicy: normalizeDiscoveryDataPolicy(rawSettings?.discoveryDataPolicy),
    discoveryReplacementPolicy: normalizeDiscoveryReplacementPolicy(rawSettings?.discoveryReplacementPolicy),
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

function normalizeDiscoveryAgent(entry) {
  const dataPolicyOverride = entry?.dataPolicyOverride && typeof entry.dataPolicyOverride === "object"
    ? normalizeDiscoveryDataPolicy(entry.dataPolicyOverride)
    : null;
  return {
    id: String(entry?.id || "").trim(),
    name: String(entry?.name || "").trim(),
    kind: String(entry?.kind || "").trim(),
    enabled: Boolean(entry?.enabled),
    allowedCidrs: Array.isArray(entry?.allowedCidrs) ? entry.allowedCidrs.map((cidr) => String(cidr)) : [],
    createMode: String(entry?.createMode || "preview_only").trim(),
    linkedHostDeviceId: String(entry?.linkedHostDeviceId || "").trim(),
    lastSeenAt: entry?.lastSeenAt || "",
    reportedIntervalSeconds: Number(entry?.reportedIntervalSeconds || 0),
    reportedTimeoutSeconds: Number(entry?.reportedTimeoutSeconds || 0),
    lastError: String(entry?.lastError || "").trim(),
    lastRemoteAddr: String(entry?.lastRemoteAddr || "").trim(),
    lastRejectedAt: entry?.lastRejectedAt || "",
    lastRejectReason: String(entry?.lastRejectReason || "").trim(),
    dataPolicyOverride,
    usesDefaultDataPolicy: dataPolicyOverride ? false : entry?.usesDefaultDataPolicy !== false,
    createdAt: entry?.createdAt || "",
    updatedAt: entry?.updatedAt || "",
  };
}

function normalizeDiscoveryResult(entry) {
  return {
    id: String(entry?.id || "").trim(),
    agentId: String(entry?.agentId || "").trim(),
    agentName: String(entry?.agentName || "").trim(),
    source: String(entry?.source || "").trim(),
    sourceId: String(entry?.sourceId || "").trim(),
    sourceKind: String(entry?.sourceKind || "").trim(),
    hostDeviceId: String(entry?.hostDeviceId || "").trim(),
    hostName: String(entry?.hostName || "").trim(),
    name: String(entry?.name || "").trim(),
    status: String(entry?.status || "").trim(),
    ports: String(entry?.ports || "").trim(),
    accessPort: String(entry?.accessPort || "").trim(),
    serviceUrl: String(entry?.serviceUrl || "").trim(),
    lastSeenAt: entry?.lastSeenAt || "",
    matchedDeviceId: String(entry?.matchedDeviceId || "").trim(),
    matchedServiceId: String(entry?.matchedServiceId || "").trim(),
    state: String(entry?.state || "new").trim().toLowerCase(),
    receivedFields: Array.isArray(entry?.receivedFields) ? entry.receivedFields.map((field) => String(field)) : [],
    acceptedFields: Array.isArray(entry?.acceptedFields) ? entry.acceptedFields.map((field) => String(field)) : [],
    visibleFields: Array.isArray(entry?.visibleFields) ? entry.visibleFields.map((field) => String(field)) : [],
    visibleRaw: entry?.visibleRaw && typeof entry.visibleRaw === "object" ? entry.visibleRaw : {},
    createdAt: entry?.createdAt || "",
    updatedAt: entry?.updatedAt || "",
  };
}

function normalizeDiscoveryAuditEvent(entry) {
  return {
    id: Number(entry?.id || 0),
    eventType: String(entry?.eventType || "").trim(),
    severity: String(entry?.severity || "info").trim(),
    agentId: String(entry?.agentId || "").trim(),
    agentName: String(entry?.agentName || "").trim(),
    actor: String(entry?.actor || "system").trim(),
    remoteAddr: String(entry?.remoteAddr || "").trim(),
    message: String(entry?.message || "").trim(),
    details: entry?.details && typeof entry.details === "object" ? entry.details : {},
    createdAt: entry?.createdAt || "",
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
    discoveryAgents: Array.isArray(rawAdmin?.discoveryAgents)
      ? rawAdmin.discoveryAgents.map(normalizeDiscoveryAgent)
      : [],
    discoveryResults: Array.isArray(rawAdmin?.discoveryResults)
      ? rawAdmin.discoveryResults.map(normalizeDiscoveryResult)
      : [],
    discoveryAuditEvents: Array.isArray(rawAdmin?.discoveryAuditEvents)
      ? rawAdmin.discoveryAuditEvents.map(normalizeDiscoveryAuditEvent)
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

function formatHistoryIpLabel(entry, alreadyEscaped = false) {
  const emptyLabel = t("no_data");
  const ip = entry?.ip || "";
  const previousIp = entry?.previousIp || "";
  const label = previousIp
    ? `${previousIp} → ${ip || emptyLabel}`
    : ip || emptyLabel;

  return alreadyEscaped ? escapeHtml(label) : label;
}

function normalizeHistoryItem(entry) {
  const rawIp = String(entry?.ip || "").trim();
  const rawPreviousIp = String(entry?.previousIp || "").trim();

  return {
    id: entry?.id ?? createId(),
    deviceId: String(entry?.deviceId || "").trim(),
    deviceName: String(entry?.deviceName || "").trim(),
    ip: rawIp ? normalizeIp(rawIp) : "",
    previousIp: rawPreviousIp ? normalizeIp(rawPreviousIp) : "",
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
  if (snapshot.topology) {
    targetState.topology = snapshot.topology;
  }
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
    topology: snapshot.topology ? JSON.parse(JSON.stringify(snapshot.topology)) : normalizeTopology(null),
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
  const id = String(rawDevice?.id || createId());
  const hostDeviceId = String(rawDevice?.hostDeviceId || "").trim();
  const source = normalizeMetadataToken(rawDevice?.source, "");
  const sourceKind = normalizeMetadataToken(rawDevice?.sourceKind, "");
  const sourceId = String(rawDevice?.sourceId || "").trim();
  const integrationStatus = normalizeMetadataToken(rawDevice?.integrationStatus, "");
  const integrationStatusChangedAt = String(rawDevice?.integrationStatusChangedAt || "").trim();
  const protocol = normalizeMetadataToken(rawDevice?.protocol, "");
  const serviceUrl = String(rawDevice?.serviceUrl || "").trim();
  const accessPort = String(rawDevice?.accessPort || "").trim();
  const ports = String(rawDevice?.ports || "").trim();
  const lastSeenAt = String(rawDevice?.lastSeenAt || "").trim();

  if (!name) {
    throw new Error(t("error_device_name_required"));
  }

  assertValidIp(ip, t("error_device_ip_invalid", { name }));

  if (mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
    throw new Error(t("error_device_mac_invalid", { name }));
  }

  if (hostDeviceId && hostDeviceId === id) {
    throw new Error(t("error_device_host_self"));
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
    id,
    name,
    ip,
    mac,
    type,
    unknownType,
    subnetId,
    hostDeviceId,
    source,
    sourceKind,
    sourceId,
    integrationStatus,
    integrationStatusChangedAt,
    protocol,
    serviceUrl,
    accessPort,
    ports,
    lastSeenAt,
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
    version: "0.3",
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
  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;
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
  return getInventoryDevices().filter((device) => isIpInsideNetwork(ipToInt(device.ip), subnet));
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
  return getInventoryDevices().filter((device) => {
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
  return new Set(getInventoryDevices().map((device) => device.ip));
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
    getInventoryDevices()
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
    getInventoryDevices()
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

function resolveDeviceHost(device) {
  const hostId = String(device?.hostDeviceId || "").trim();
  if (!hostId) {
    return null;
  }
  return state.devices.find((entry) => entry.id === hostId) || null;
}

function hasMissingHost(device) {
  return Boolean(isServiceRecord(device) && device?.hostDeviceId && !resolveDeviceHost(device));
}

function isServiceRecord(device) {
  return String(device?.type || "").trim().toLowerCase() === "service";
}

function getInventoryDevices() {
  return state.devices.filter((device) => !isServiceRecord(device));
}

function getServiceRecords() {
  return state.devices.filter(isServiceRecord);
}

function isHostSharedServiceIp(device, host = resolveDeviceHost(device)) {
  return Boolean(isServiceRecord(device) && host && device.ip === host.ip);
}

function isIpConflictCandidate(device) {
  return !isHostSharedServiceIp(device);
}

function hasIpConflict(device) {
  if (!isIpConflictCandidate(device)) {
    return false;
  }
  return state.devices.some((entry) => entry.id !== device.id && entry.ip === device.ip && isIpConflictCandidate(entry));
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

function handleServiceHostChange() {
  clearServiceFormStatus();
}

function buildDeviceTypeOptionMarkup({ includeUnset = true, includeServices = false } = {}) {
  const options = [];
  if (includeUnset) {
    options.push(`<option value="">${escapeHtml(t("device_type_unset_option"))}</option>`);
  }

  getAvailableDeviceTypes()
    .filter((type) => includeServices || type.id !== "service")
    .forEach((type) => {
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
  if (hasIpConflict(device)) {
    return { label: t("status_conflict"), variant: "danger" };
  }

  if (hasMissingHost(device)) {
    return { label: t("status_orphan"), variant: "warn" };
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
  const isService = isServiceRecord(device);
  const subnet = resolveDeviceSubnet(device);
  const group = resolveDeviceGroup(device, subnet);
  const pingState = getVisiblePingState(device.ip, subnet);
  const exactIpTerm = normalizeIpSafe(searchTerm);
  const availability = hasLiveAgentStatus(device) ? getAgentAvailabilityStatus(device) : null;

  if (quickFilter === "devices" && isService) {
    return false;
  }
  if (quickFilter === "services" && !isService) {
    return false;
  }
  if (quickFilter === "conflicts" && !hasIpConflict(device)) {
    return false;
  }
  if (quickFilter === "no-subnet" && subnet) {
    return false;
  }
  if (quickFilter === "outside-pool" && (!subnet || isIpInsidePool(ipToInt(device.ip), subnet))) {
    return false;
  }
  if (quickFilter === "orphan-host" && !hasMissingHost(device)) {
    return false;
  }
  if (quickFilter === "status-running" && !(availability?.state === "up" || (!availability && device.integrationStatus === "running"))) {
    return false;
  }
  if (quickFilter === "status-offline" && !(availability?.state === "down" || (!availability && (device.integrationStatus === "offline" || device.integrationStatus === "stopped")) || pingState?.isReachable === false)) {
    return false;
  }
  if (quickFilter === "status-stale" && !(availability?.state === "pending" || device.integrationStatus === "stale" || device.integrationStatus === "source_missing" || device.integrationStatus === "source-missing")) {
    return false;
  }
  if (quickFilter.startsWith("source-") && device.source !== quickFilter.replace("source-", "")) {
    return false;
  }
  if (groupFilter && group?.id !== groupFilter) {
    return false;
  }

  if (!searchTerm) {
    return true;
  }

  if (exactIpTerm) {
    return device.ip === exactIpTerm;
  }

  const haystack = [
    device.name,
    device.ip,
    device.mac,
    device.type,
    device.unknownType || "",
    getDeviceTypeLabel(device.type),
    resolveDeviceHost(device)?.name || "",
    device.source,
    device.sourceKind,
    device.sourceId,
    device.integrationStatus,
    device.protocol,
    device.serviceUrl,
    device.accessPort,
    device.ports,
    device.lastSeenAt,
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

function findDeviceHostByReference(row, devices) {
  const hostId = String(row.host_id || row.hostDeviceId || row.host_device_id || "").trim();
  const hostName = String(row.host || row.host_name || row.hostName || "").trim();
  if (!hostId && !hostName) {
    return null;
  }

  return devices.find((device) => device.id === hostId || device.name === hostName) || null;
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
    host: "host",
    "host name": "host_name",
    "host id": "host_id",
    "хост": "host",
    source: "source",
    "источник": "source",
    "джерело": "source",
    "source kind": "source_kind",
    "source id": "source_id",
    "source status": "integration_status",
    "integration status": "integration_status",
    status: "status",
    protocol: "protocol",
    "протокол": "protocol",
    url: "url",
    "service url": "service_url",
    service_url: "service_url",
    "url сервиса": "service_url",
    "url сервісу": "service_url",
    access: "access_port",
    "access port": "access_port",
    access_port: "access_port",
    "порт доступа": "access_port",
    "порт доступу": "access_port",
    ports: "ports",
    "порты": "ports",
    "порти": "ports",
    "last seen": "last_seen_at",
    last_seen: "last_seen_at",
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
    router: "core-router",
    "core-router": "core-router",
    "core router": "core-router",
    "root-router": "core-router",
    "root router": "core-router",
    gateway: "core-router",
    роутер: "core-router",
    маршрутизатор: "core-router",
    шлюз: "core-router",
    ядро: "core-router",
    "ядро сети": "core-router",
    switch: "switch",
    "network-switch": "switch",
    "network switch": "switch",
    свитч: "switch",
    свич: "switch",
    коммутатор: "switch",
    container: "container",
    containers: "container",
    контейнер: "container",
    "контейнери": "container",
    service: "service",
    services: "service",
    сервис: "service",
    сервіс: "service",
    iot: "iot",
  };

  return aliases[normalized] || normalized.replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizeMetadataToken(value, fallback = "") {
  const normalized = normalizeSearchableText(value);
  if (!normalized) {
    return fallback;
  }
  return normalized.replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
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
