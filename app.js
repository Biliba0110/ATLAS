const API_BASE = "/api";
const DEVICE_TYPES = {
  server: "Сервер",
  container: "Контейнер",
  iot: "IoT",
};

const state = {
  subnets: [],
  groups: [],
  devices: [],
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
  subnetsTableBody: document.getElementById("subnets-table-body"),
  groupsTableBody: document.getElementById("groups-table-body"),
  devicesTableBody: document.getElementById("devices-table-body"),
  subnetsCounter: document.getElementById("subnets-counter"),
  groupsCounter: document.getElementById("groups-counter"),
  devicesCounter: document.getElementById("devices-counter"),
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
let syncIntervalId = null;

initialize().catch((error) => {
  console.error(error);
  showToast("Не удалось подключиться к серверу IPAM.", true);
});

async function initialize() {
  bindEvents();
  renderAll();
  await refreshState();
  syncIntervalId = window.setInterval(() => {
    refreshState(true);
  }, 15000);
}

function bindEvents() {
  elements.subnetForm.addEventListener("submit", handleSubnetSubmit);
  elements.deviceForm.addEventListener("submit", handleDeviceSubmit);
  elements.groupForm.addEventListener("submit", handleGroupSubmit);
  elements.searchInput.addEventListener("input", renderDevicesTable);
  elements.ipCheckForm.addEventListener("submit", handleIpCheck);
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
  window.addEventListener("focus", () => {
    refreshState(true);
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
      showToast(error.message || "Не удалось загрузить данные с сервера.", true);
    }
  }
}

function applyState(snapshot) {
  state.subnets = snapshot.subnets;
  state.groups = snapshot.groups;
  state.devices = snapshot.devices;
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

    const savedSubnet = await apiRequest("/subnets", {
      method: "POST",
      body: JSON.stringify(subnet),
    });

    state.subnets.unshift(normalizeSubnet(savedSubnet));
    event.currentTarget.reset();
    renderAll();
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

    const savedDevice = await apiRequest("/devices", {
      method: "POST",
      body: JSON.stringify(device),
    });

    state.devices.unshift(normalizeDevice(savedDevice, state.subnets));
    event.currentTarget.reset();
    renderAll();
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

    state.groups.unshift(normalizeRangeGroup(savedGroup, state.subnets, state.groups));
    event.currentTarget.reset();
    renderAll();
    showToast(`Группа ${group.name} добавлена.`);
  } catch (error) {
    showToast(error.message, true);
  }
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

  if (device) {
    const parts = [`IP ${normalizedIp} уже занят устройством "${device.name}".`];
    if (subnet) {
      parts.push(`Подсеть: ${subnet.name} (${subnet.cidr}).`);
    }
    if (group) {
      parts.push(`Группа: ${group.name} (${formatGroupRange(group, true)}).`);
    }
    renderIpCheckResult(parts.join(" "), "danger");
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

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: "0.3",
    subnets: state.subnets,
    groups: state.groups,
    devices: state.devices,
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

    renderAll();
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
  const confirmed = window.confirm("Удалить все подсети, группы диапазонов и устройства из базы?");
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest("/state", {
      method: "DELETE",
    });
    applyState({ subnets: [], groups: [], devices: [] });
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
    state.subnets = state.subnets.filter((entry) => entry.id !== subnetId);
    state.groups = state.groups.filter((entry) => entry.subnetId !== subnetId);
    state.devices = state.devices.map((entry) =>
      entry.subnetId === subnetId ? { ...entry, subnetId: "" } : entry
    );
    renderAll();
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
    state.groups = state.groups.filter((entry) => entry.id !== groupId);
    renderAll();
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
    state.devices = state.devices.filter((entry) => entry.id !== deviceId);
    renderAll();
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
  renderStats();
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

  const rows = state.subnets
    .slice()
    .sort((left, right) => ipToInt(left.network) - ipToInt(right.network))
    .map((subnet) => {
      const usedCount = getDevicesInSubnet(subnet).length;
      const freeCount = Math.max(subnet.poolSize - usedCount, 0);
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
            <span class="pill">${usedCount} занято</span>
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
      return `
        <tr>
          <td>
            <strong>${escapeHtml(group.name)}</strong>
          </td>
          <td>
            ${subnet ? `${escapeHtml(subnet.name)}<br><span class="mono">${escapeHtml(subnet.cidr)}</span>` : "—"}
          </td>
          <td class="mono">${escapeHtml(formatGroupRange(group, true))}</td>
          <td><span class="pill">${deviceCount} устройств</span></td>
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
        <td colspan="8">${escapeHtml(message)}</td>
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

function renderStats() {
  const usedIpCount = new Set(state.devices.map((device) => device.ip)).size;
  const freeInPools = state.subnets.reduce((total, subnet) => {
    const usedInSubnet = getDevicesInSubnet(subnet).length;
    return total + Math.max(subnet.poolSize - usedInSubnet, 0);
  }, 0);

  elements.statSubnets.textContent = String(state.subnets.length);
  elements.statDevices.textContent = String(state.devices.length);
  elements.statOccupied.textContent = String(usedIpCount);
  elements.statAvailable.textContent = String(freeInPools);
}

function renderIpCheckResult(message, tone) {
  elements.ipCheckResult.className = `result-card result-card--${tone}`;
  elements.ipCheckResult.textContent = message;
}

function normalizeState(rawState, baseGroups = []) {
  const rawSubnets = Array.isArray(rawState?.subnets) ? rawState.subnets : [];
  const subnets = rawSubnets.map((entry) => normalizeSubnet(entry));
  const rawGroups = Array.isArray(rawState?.groups) ? rawState.groups : [];
  const groups = normalizeGroupsList(rawGroups, subnets, baseGroups);
  const rawDevices = Array.isArray(rawState?.devices) ? rawState.devices : [];
  const devices = rawDevices.map((entry) => normalizeDevice(entry, subnets));
  return { subnets, groups, devices };
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

function applyStateToTarget(targetState, snapshot) {
  targetState.subnets = snapshot.subnets;
  targetState.groups = snapshot.groups;
  targetState.devices = snapshot.devices;
}

function cloneState(snapshot) {
  return {
    subnets: snapshot.subnets.map((entry) => ({ ...entry })),
    groups: snapshot.groups.map((entry) => ({ ...entry })),
    devices: snapshot.devices.map((entry) => ({ ...entry })),
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
  return state.groups.find((group) => {
    if (subnetId && group.subnetId !== subnetId) {
      return false;
    }
    return ipInt >= group.rangeStartInt && ipInt <= group.rangeEndInt;
  }) || null;
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
  const merged = new Map(existingItems.map((item) => [item.id, item]));
  importedItems.forEach((item) => merged.set(item.id, item));
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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
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
