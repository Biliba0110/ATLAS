const API_BASE = "/api";
const OPERATOR_STORAGE_KEY = "homelab-ipam-operator";
const DEVICE_TYPES = {
  server: "Сервер",
  container: "Контейнер",
  iot: "IoT",
};

const ACTION_LABELS = {
  assigned: "Назначен",
  imported: "Импорт",
  ip_changed: "IP изменен",
  released: "Освобожден",
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
};

const preferences = {
  operator: localStorage.getItem(OPERATOR_STORAGE_KEY) || "",
};

const elements = {
  subnetForm: document.getElementById("subnet-form"),
  deviceForm: document.getElementById("device-form"),
  groupForm: document.getElementById("group-form"),
  subnetSelect: document.getElementById("device-subnet-select"),
  groupSubnetSelect: document.getElementById("group-subnet-select"),
  searchInput: document.getElementById("device-search-input"),
  ipCheckForm: document.getElementById("ip-check-form"),
  ipCheckResult: document.getElementById("ip-check-result"),
  operatorInput: document.getElementById("operator-input"),
  scanNowButton: document.getElementById("scan-now-button"),
  liveStatusBadge: document.getElementById("live-status-badge"),
  scanStatusBadge: document.getElementById("scan-status-badge"),
  scanStatusText: document.getElementById("scan-status-text"),
  liveSummaryText: document.getElementById("live-summary-text"),
  deviceSuggestion: document.getElementById("device-suggestion"),
  applySuggestionButton: document.getElementById("apply-suggestion-button"),
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

initialize().catch((error) => {
  console.error(error);
  showToast("Не удалось подключиться к серверу IPAM.", true);
});

async function initialize() {
  bindEvents();
  elements.operatorInput.value = preferences.operator;
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
  elements.scanNowButton.addEventListener("click", handleScanNow);
  elements.subnetSelect.addEventListener("change", updateSuggestedIp);
  elements.deviceForm.elements.ip.addEventListener("input", updateSuggestedIp);
  elements.applySuggestionButton.addEventListener("click", applySuggestedIp);
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
}

async function refreshState(silent = false) {
  try {
    const snapshot = await apiRequest("/state");
    applyState(normalizeState(snapshot));
    renderAll();
  } catch (error) {
    console.error(error);
    if (!silent) {
      showToast(error.message || "Не удалось загрузить данные с сервера.", true);
    }
  }
}

function connectLiveStream() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`${API_BASE}/stream`);
  setLiveStatus("Подключение…", "info");

  eventSource.onopen = () => {
    setLiveStatus("Live", "ok");
  };

  eventSource.onmessage = async () => {
    await refreshState(true);
  };

  eventSource.onerror = () => {
    setLiveStatus("Переподключение", "warn");
  };
}

function applyState(snapshot) {
  state.subnets = snapshot.subnets;
  state.groups = snapshot.groups;
  state.devices = snapshot.devices;
  state.scanResults = snapshot.scanResults;
  state.history = snapshot.history;
  state.meta = snapshot.meta;
}

async function handleSubnetSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.currentTarget);
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
    event.currentTarget.reset();
    showToast(`Подсеть ${subnet.name} добавлена.`);
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleDeviceSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.currentTarget);
    const device = normalizeDevice(
      {
        id: createId(),
        name: formData.get("name"),
        ip: formData.get("ip"),
        mac: formData.get("mac"),
        type: formData.get("type"),
        subnetId: formData.get("subnetId"),
        note: formData.get("note"),
        createdAt: new Date().toISOString(),
      },
      state.subnets
    );

    await apiRequest("/devices", {
      method: "POST",
      body: JSON.stringify(device),
    });

    await refreshState(true);
    event.currentTarget.reset();
    updateSuggestedIp();
    showToast(`Устройство ${device.name} добавлено.`);
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleGroupSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.currentTarget);
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
    event.currentTarget.reset();

    if (scanSummary) {
      const refreshedGroup = state.groups.find((entry) => entry.id === savedGroup.id);
      const reachableSet = getReachableScanIps();
      const busyCount = refreshedGroup
        ? countBusyInGroup(refreshedGroup, reachableSet)
        : scanSummary.reachableIps;
      const freeCount = refreshedGroup
        ? Math.max(refreshedGroup.rangeEndInt - refreshedGroup.rangeStartInt + 1 - busyCount, 0)
        : "—";
      showToast(
        `Группа ${group.name} добавлена. Проверено ${scanSummary.scannedIps} IP, занято ${busyCount}, свободно ${freeCount}.`
      );
      return;
    }

    if (scanError) {
      showToast(`Группа ${group.name} добавлена, но проверка занятости не выполнилась.`, true);
      return;
    }

    showToast(`Группа ${group.name} добавлена.`);
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
  elements.scanNowButton.textContent = "Сканирование…";
  setScanStatus("Ping: идет сканирование", "info");

  try {
    const summary = await apiRequest("/scan", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refreshState(true);
    showToast(
      `Ping завершен: подсетей ${summary.scannedSubnets}, адресов ${summary.scannedIps}, ответов ${summary.reachableIps}.`
    );
  } catch (error) {
    showToast(error.message, true);
  } finally {
    isManualScanRunning = false;
    elements.scanNowButton.disabled = false;
    elements.scanNowButton.textContent = "Проверить ping";
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
    assertValidIp(ip, "Укажите корректный IPv4 адрес для проверки.");
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
    const parts = [`IP ${normalizedIp} уже закреплен за устройством "${device.name}".`];
    if (subnet) {
      parts.push(`Подсеть: ${subnet.name} (${subnet.cidr}).`);
    }
    if (group) {
      parts.push(`Группа: ${group.name} (${formatGroupRange(group, true)}).`);
    }
    if (pingState?.isReachable) {
      parts.push("Узел отвечает на ping.");
    } else if (pingState) {
      parts.push("На последний ping адрес не ответил.");
    }
    renderIpCheckResult(parts.join(" "), "danger");
    return;
  }

  if (pingState?.isReachable) {
    const parts = [`IP ${normalizedIp} не закреплен в IPAM, но отвечает на ping.`];
    if (subnet) {
      parts.push(`Подсеть: ${subnet.name} (${subnet.cidr}).`);
    }
    if (group) {
      parts.push(`Группа: ${group.name} (${formatGroupRange(group, true)}).`);
    }
    renderIpCheckResult(parts.join(" "), "warn");
    return;
  }

  if (!subnet) {
    renderIpCheckResult(
      `IP ${normalizedIp} пока свободен, но не попадает ни в одну зарегистрированную подсеть.`,
      "warn"
    );
    return;
  }

  const parts = [`IP ${normalizedIp} свободен и относится к подсети "${subnet.name}" (${subnet.cidr}).`];
  const inPool = isIpInsidePool(ipInt, subnet);
  if (!inPool) {
    parts.push("Он находится вне заданного пула подсети.");
  }
  if (group) {
    parts.push(`Попадает в группу "${group.name}" (${formatGroupRange(group, true)}).`);
  }
  renderIpCheckResult(parts.join(" "), inPool ? "ok" : "warn");
}

function updateAutomationWidgets() {
  const lastScanAt = state.meta?.lastScanAt;
  const reachableCount = getReachableScanIps().size;
  const operatorLabel = preferences.operator || "не задан";

  if (state.meta?.scanInProgress || isManualScanRunning) {
    setScanStatus("Ping: идет сканирование", "info");
    elements.scanStatusText.textContent = "Сервер проверяет доступность адресов по всем пулам.";
  } else if (lastScanAt) {
    setScanStatus(`Ping: ${reachableCount} online`, reachableCount > 0 ? "ok" : "warn");
    elements.scanStatusText.textContent = `Последний скан: ${formatDateTime(lastScanAt)}. Интервал фоновой проверки: ${state.meta.scanIntervalSeconds || 90} сек.`;
  } else {
    setScanStatus("Ping: нет данных", "warn");
    elements.scanStatusText.textContent = "Сканирование еще не запускалось.";
  }

  elements.liveSummaryText.textContent = `Live-режим активен. Оператор: ${operatorLabel}. Изменения от других клиентов приходят автоматически.`;
}

function updateSuggestedIp() {
  const subnetId = elements.subnetSelect.value;
  if (!subnetId) {
    elements.deviceSuggestion.className = "result-card result-card--muted form-grid__full";
    elements.deviceSuggestion.textContent = "Выберите подсеть, чтобы получить подсказку свободного IP.";
    elements.applySuggestionButton.disabled = true;
    return;
  }

  const subnet = state.subnets.find((entry) => entry.id === subnetId);
  if (!subnet) {
    elements.deviceSuggestion.className = "result-card result-card--warn form-grid__full";
    elements.deviceSuggestion.textContent = "Подсеть не найдена в текущем состоянии сервера.";
    elements.applySuggestionButton.disabled = true;
    return;
  }

  const suggestion = suggestFreeIp(subnet);
  if (!suggestion) {
    elements.deviceSuggestion.className = "result-card result-card--danger form-grid__full";
    elements.deviceSuggestion.textContent = `В пуле ${subnet.name} (${subnet.cidr}) свободных IP не найдено.`;
    elements.applySuggestionButton.disabled = true;
    return;
  }

  const existingValue = elements.deviceForm.elements.ip.value.trim();
  const isAlreadyUsingSuggestion = existingValue && normalizeIpSafe(existingValue) === suggestion.ip;
  elements.deviceSuggestion.className = "result-card result-card--ok form-grid__full";
  elements.deviceSuggestion.textContent =
    `Свободный IP: ${suggestion.ip}. Занято по базе: ${suggestion.assignedCount}, отвечает на ping: ${suggestion.reachableCount}.`;
  elements.applySuggestionButton.disabled = isAlreadyUsingSuggestion;
  elements.applySuggestionButton.dataset.suggestedIp = suggestion.ip;
}

function applySuggestedIp() {
  const suggestedIp = elements.applySuggestionButton.dataset.suggestedIp;
  if (!suggestedIp) {
    return;
  }

  elements.deviceForm.elements.ip.value = suggestedIp;
  updateSuggestedIp();
  showToast(`Подставлен свободный IP ${suggestedIp}.`);
}

function suggestFreeIp(subnet) {
  const assignedIps = new Set(
    state.devices
      .filter((device) => isIpInsidePool(ipToInt(device.ip), subnet))
      .map((device) => device.ip)
  );
  const reachableIps = new Set(
    state.scanResults
      .filter((result) => result.subnetId === subnet.id && result.isReachable)
      .map((result) => result.ip)
  );
  const busyIps = new Set([...assignedIps, ...reachableIps]);

  for (let ipInt = subnet.rangeStartInt; ipInt <= subnet.rangeEndInt; ipInt += 1) {
    const ip = intToIp(ipInt);
    if (!busyIps.has(ip)) {
      return {
        ip,
        assignedCount: assignedIps.size,
        reachableCount: reachableIps.size,
      };
    }
  }

  return null;
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
    `homelab-ipam-${timestampForFile()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
}

function exportSubnetsCsv() {
  const rows = state.subnets.map((subnet) => ({
    id: subnet.id,
    name: subnet.name,
    cidr: subnet.cidr,
    network: subnet.network,
    mask_bits: subnet.maskBits,
    range_start: subnet.rangeStart,
    range_end: subnet.rangeEnd,
    usable_hosts: subnet.usableHosts,
    note: subnet.note,
  }));

  downloadFile(
    `homelab-ipam-subnets-${timestampForFile()}.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8"
  );
}

function exportGroupsCsv() {
  const rows = state.groups.map((group) => {
    const subnet = state.subnets.find((entry) => entry.id === group.subnetId);
    return {
      id: group.id,
      name: group.name,
      subnet_id: group.subnetId,
      subnet_name: subnet?.name || "",
      subnet_cidr: subnet?.cidr || "",
      range_start: group.rangeStart,
      range_end: group.rangeEnd,
      note: group.note,
    };
  });

  downloadFile(
    `homelab-ipam-groups-${timestampForFile()}.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8"
  );
}

function exportDevicesCsv() {
  const rows = state.devices.map((device) => {
    const subnet = resolveDeviceSubnet(device);
    const group = resolveDeviceGroup(device, subnet);
    const pingState = getPingState(device.ip);
    return {
      id: device.id,
      name: device.name,
      ip: device.ip,
      mac: device.mac,
      type: device.type,
      subnet_id: device.subnetId || "",
      subnet_name: subnet?.name || "",
      subnet_cidr: subnet?.cidr || "",
      group_id: group?.id || "",
      group_name: group?.name || "",
      ping_reachable: pingState ? String(pingState.isReachable) : "",
      note: device.note,
    };
  });

  downloadFile(
    `homelab-ipam-devices-${timestampForFile()}.csv`,
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
    const shouldReplace = window.confirm("OK — заменить текущие данные. Cancel — объединить с текущими.");

    if (file.name.toLowerCase().endsWith(".json")) {
      importJson(text, shouldReplace, state);
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      importCsv(text, shouldReplace, state);
    } else {
      throw new Error("Поддерживаются только JSON и CSV файлы.");
    }

    await apiRequest("/state", {
      method: "PUT",
      body: JSON.stringify(state),
    });

    await refreshState(true);
    showToast(`Файл ${file.name} импортирован.`);
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
    throw new Error("CSV файл пустой.");
  }

  const headers = Object.keys(rows[0]).map((key) => key.toLowerCase());
  const looksLikeSubnetCsv = headers.includes("cidr");
  const looksLikeGroupCsv =
    !looksLikeSubnetCsv &&
    headers.includes("range_start") &&
    headers.includes("range_end") &&
    (headers.includes("subnet_id") || headers.includes("subnet_name") || headers.includes("subnet_cidr"));
  const looksLikeDeviceCsv = headers.includes("ip");

  if (!looksLikeSubnetCsv && !looksLikeGroupCsv && !looksLikeDeviceCsv) {
    throw new Error("CSV должен содержать поля подсетей, диапазонов или устройств.");
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
        throw new Error(`Для строки диапазона ${index + 2} не найдена подсеть.`);
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
  const confirmed = window.confirm("Удалить все подсети, группы диапазонов, историю и устройства из базы?");
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
    showToast("База данных очищена.");
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
  const confirmed = window.confirm(
    `Удалить подсеть "${subnet.name}"? Устройств с явной привязкой: ${linkedDevices}, групп диапазонов: ${linkedGroups}.`
  );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/subnets/${encodeURIComponent(subnetId)}`, {
      method: "DELETE",
    });
    await refreshState(true);
    showToast(`Подсеть ${subnet.name} удалена.`);
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

  const confirmed = window.confirm(`Удалить группу "${group.name}"?`);
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/groups/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    });
    await refreshState(true);
    showToast(`Группа ${group.name} удалена.`);
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

  const confirmed = window.confirm(`Удалить устройство "${device.name}"?`);
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
    await refreshState(true);
    showToast(`Устройство ${device.name} удалено.`);
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderAll() {
  renderSubnetOptions();
  renderSubnetsTable();
  renderGroupsTable();
  renderDevicesTable();
  renderHistoryTable();
  renderStats();
  updateAutomationWidgets();
  updateSuggestedIp();
}

function renderSubnetOptions() {
  const previousDeviceSubnet = elements.subnetSelect.value;
  const previousGroupSubnet = elements.groupSubnetSelect.value;
  const options = ['<option value="">Автоопределение по IP</option>'];
  const requiredOptions = ['<option value="">Выберите подсеть</option>'];

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
}

function renderSubnetsTable() {
  if (state.subnets.length === 0) {
    elements.subnetsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Подсети еще не добавлены.</td>
      </tr>
    `;
    elements.subnetsCounter.textContent = "0 записей";
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
        ? "—"
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
            <span class="pill">${assignedCount} в базе</span>
            <span class="pill">${reachableCount} ping</span>
            <span class="pill">${freeCount} свободно</span>
          </td>
          <td><div class="secondary-line">${escapeHtml(groupSummary)}</div></td>
          <td>${escapeHtml(subnet.note || "—")}</td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-subnet="${escapeHtml(subnet.id)}">Удалить</button>
          </td>
        </tr>
      `;
    });

  elements.subnetsTableBody.innerHTML = rows.join("");
  elements.subnetsCounter.textContent = `${state.subnets.length} записей`;
}

function renderGroupsTable() {
  if (state.groups.length === 0) {
    elements.groupsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Группы диапазонов еще не добавлены.</td>
      </tr>
    `;
    elements.groupsCounter.textContent = "0 записей";
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
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : "—"}</td>
          <td class="mono">${escapeHtml(formatGroupRange(group, true))}</td>
          <td>
            <span class="pill">${deviceCount} в базе</span>
            <span class="pill">${pingCount} ping</span>
            <span class="pill">${freeCount} свободно</span>
          </td>
          <td>${escapeHtml(group.note || "—")}</td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-group="${escapeHtml(group.id)}">Удалить</button>
          </td>
        </tr>
      `;
    });

  elements.groupsTableBody.innerHTML = rows.join("");
  elements.groupsCounter.textContent = `${state.groups.length} записей`;
}

function renderDevicesTable() {
  const searchTerm = normalizeSearch(elements.searchInput.value);
  const filteredDevices = state.devices.filter((device) => matchesSearch(device, searchTerm));

  if (filteredDevices.length === 0) {
    const message = searchTerm
      ? "По текущему фильтру ничего не найдено."
      : "Устройства еще не добавлены.";
    elements.devicesTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">${escapeHtml(message)}</td>
      </tr>
    `;
    elements.devicesCounter.textContent = searchTerm
      ? `0 из ${state.devices.length}`
      : "0 записей";
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
          <td class="mono">${escapeHtml(device.mac || "—")}</td>
          <td>${escapeHtml(DEVICE_TYPES[device.type] || device.type)}</td>
          <td>${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : "—"}</td>
          <td>${group ? `${escapeHtml(group.name)}<br><span class="mono">${escapeHtml(formatGroupRange(group, true))}</span>` : "—"}</td>
          <td>${pingBadge}</td>
          <td><span class="status-badge status-badge--${status.variant}">${escapeHtml(status.label)}</span></td>
          <td>
            <button type="button" class="row-button row-button--danger" data-delete-device="${escapeHtml(device.id)}">Удалить</button>
          </td>
        </tr>
      `;
    });

  elements.devicesTableBody.innerHTML = rows.join("");
  elements.devicesCounter.textContent = searchTerm
    ? `${filteredDevices.length} из ${state.devices.length}`
    : `${filteredDevices.length} записей`;
}

function renderHistoryTable() {
  if (state.history.length === 0) {
    elements.historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">История изменений пока пуста.</td>
      </tr>
    `;
    elements.historyCounter.textContent = "0 событий";
    return;
  }

  const rows = state.history.map((entry) => {
    const ipLabel = entry.previousIp
      ? `${escapeHtml(entry.previousIp)} → ${escapeHtml(entry.ip)}`
      : escapeHtml(entry.ip);
    return `
      <tr>
        <td class="mono">${escapeHtml(formatDateTime(entry.changedAt))}</td>
        <td>${escapeHtml(entry.actor || "system")}</td>
        <td><span class="status-badge status-badge--info">${escapeHtml(ACTION_LABELS[entry.action] || entry.action)}</span></td>
        <td>${escapeHtml(entry.deviceName)}</td>
        <td class="mono">${ipLabel}</td>
        <td>${escapeHtml(entry.note || "—")}</td>
      </tr>
    `;
  });

  elements.historyTableBody.innerHTML = rows.join("");
  elements.historyCounter.textContent = `${state.history.length} событий`;
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
    return '<span class="status-badge status-badge--warn">Нет данных</span>';
  }

  if (pingState.isReachable) {
    return '<span class="status-badge status-badge--ok">Online</span>';
  }

  return '<span class="status-badge status-badge--warn">Offline</span>';
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

  return { subnets, groups, devices, scanResults, history, meta };
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
}

function cloneState(snapshot) {
  return {
    subnets: snapshot.subnets.map((entry) => ({ ...entry })),
    groups: snapshot.groups.map((entry) => ({ ...entry })),
    devices: snapshot.devices.map((entry) => ({ ...entry })),
    scanResults: snapshot.scanResults.map((entry) => ({ ...entry })),
    history: snapshot.history.map((entry) => ({ ...entry })),
    meta: { ...snapshot.meta },
  };
}

function normalizeSubnet(rawSubnet) {
  const name = String(rawSubnet?.name || "").trim();
  const cidr = String(rawSubnet?.cidr || "").trim();
  const note = String(rawSubnet?.note || "").trim();

  if (!name) {
    throw new Error("Имя подсети обязательно.");
  }

  const parsed = parseCidr(cidr);
  const defaultRangeStart = parsed.firstUsable;
  const defaultRangeEnd = parsed.lastUsable;
  const rangeStart = normalizeIp(String(rawSubnet?.rangeStart || defaultRangeStart).trim());
  const rangeEnd = normalizeIp(String(rawSubnet?.rangeEnd || defaultRangeEnd).trim());
  const rangeStartInt = ipToInt(rangeStart);
  const rangeEndInt = ipToInt(rangeEnd);

  if (rangeStartInt > rangeEndInt) {
    throw new Error(`В подсети ${name} начало диапазона не может быть больше конца.`);
  }

  if (rangeStartInt < parsed.networkInt || rangeEndInt > parsed.broadcastInt) {
    throw new Error(`Диапазон подсети ${name} должен находиться внутри ${parsed.cidr}.`);
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
    throw new Error("Имя группы диапазона обязательно.");
  }

  if (!subnet) {
    throw new Error(`Для группы "${name}" не выбрана корректная подсеть.`);
  }

  const rangeStart = normalizeGroupEndpoint(String(rawGroup?.rangeStart || "").trim(), subnet);
  const rangeEnd = normalizeGroupEndpoint(String(rawGroup?.rangeEnd || "").trim(), subnet);
  const rangeStartInt = ipToInt(rangeStart);
  const rangeEndInt = ipToInt(rangeEnd);

  if (rangeStartInt > rangeEndInt) {
    throw new Error(`В группе "${name}" начало диапазона не может быть больше конца.`);
  }

  if (rangeStartInt < subnet.networkInt || rangeEndInt > subnet.broadcastInt) {
    throw new Error(`Диапазон группы "${name}" должен находиться внутри подсети ${subnet.cidr}.`);
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
    throw new Error(`Диапазон "${name}" пересекается с группой "${overlappingGroup.name}".`);
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

function normalizeDevice(rawDevice, subnets) {
  const name = String(rawDevice?.name || "").trim();
  const ip = normalizeIp(String(rawDevice?.ip || "").trim());
  const rawMac = String(rawDevice?.mac || "").trim();
  const mac = rawMac ? normalizeMac(rawMac) : "";
  const type = String(rawDevice?.type || "").trim().toLowerCase();
  const note = String(rawDevice?.note || "").trim();
  let subnetId = String(rawDevice?.subnetId || "").trim();

  if (!name) {
    throw new Error("Имя устройства обязательно.");
  }

  assertValidIp(ip, `IP для устройства ${name} заполнен некорректно.`);

  if (mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
    throw new Error(`MAC для устройства ${name} должен быть в формате AA:BB:CC:DD:EE:FF.`);
  }

  if (!DEVICE_TYPES[type]) {
    throw new Error(`Тип устройства ${name} не поддерживается.`);
  }

  if (subnetId) {
    const selectedSubnet = subnets.find((subnet) => subnet.id === subnetId);
    if (!selectedSubnet) {
      subnetId = "";
    } else if (!isIpInsideNetwork(ipToInt(ip), selectedSubnet)) {
      throw new Error(`IP ${ip} не попадает в сеть подсети "${selectedSubnet.name}".`);
    }
  }

  if (!subnetId) {
    subnetId = findSubnetForIp(ipToInt(ip), subnets)?.id || "";
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
    throw new Error("CIDR должен быть в формате 192.168.10.0/24.");
  }

  const [rawIp, rawMask] = parts;
  const normalizedIp = normalizeIp(rawIp);
  const maskBits = Number.parseInt(rawMask, 10);

  if (!Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) {
    throw new Error("Маска должна быть числом от 0 до 32.");
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
    throw new Error(`Для группы "${subnet.name}" нужно указать диапазон.`);
  }

  if (/^\d+$/.test(value)) {
    if (subnet.maskBits !== 24) {
      throw new Error("Короткий формат диапазона доступен только для подсетей /24.");
    }

    const octet = Number.parseInt(value, 10);
    if (octet < 0 || octet > 255) {
      throw new Error("Последний октет должен быть числом от 0 до 255.");
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

function evaluateDeviceStatus(device, subnet) {
  const sameIpCount = state.devices.filter((entry) => entry.ip === device.ip).length;
  if (sameIpCount > 1) {
    return { label: "Конфликт IP", variant: "danger" };
  }

  if (!subnet) {
    return { label: "Без подсети", variant: "warn" };
  }

  if (!isIpInsidePool(ipToInt(device.ip), subnet)) {
    return { label: "Вне пула", variant: "warn" };
  }

  return { label: "ОК", variant: "ok" };
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
    DEVICE_TYPES[device.type],
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
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ru-RU", {
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
  assertValidIp(value, "Укажите корректный IPv4 адрес.");
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
      subnet.cidr === (row.subnet_cidr || row.subnetCidr) ||
      subnet.name === (row.subnet_name || row.subnetName)
    );
  });
}

function parseCsv(text) {
  const rows = [];
  let currentValue = "";
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
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
      record[header] = row[index] ?? "";
    });
    return record;
  });
}

function toCsv(rows) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers.map((header) => escapeCsvCell(row[header] ?? "")).join(",");
    lines.push(line);
  });
  return lines.join("\n");
}

function escapeCsvCell(value) {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
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
    headers.set("X-IPAM-Actor", actor);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Ошибка запроса: ${response.status}`);
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
