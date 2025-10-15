import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { isIP } from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPermissions = () => ({
  dashboard: false,
  users: false,
  roles: false,
  groups: false,
  mikrotiks: false,
  tunnels: false,
  settings: false
});

const TARGET_ROUTEROS_VERSION = '7.14.0';

const defaultState = () => ({
  lastUserId: 0,
  lastRoleId: 0,
  lastGroupId: 0,
  lastMikrotikId: 0,
  lastTunnelId: 0,
  lastAddressListId: 0,
  lastFirewallFilterId: 0,
  users: [],
  roles: [],
  groups: [],
  mikrotiks: [],
  tunnels: [],
  addressLists: [],
  firewallFilters: []
});

const normalizeGroupName = (name, fallback) => {
  if (typeof name !== 'string') {
    return fallback;
  }

  const trimmed = name.trim();
  return trimmed || fallback;
};

const buildParentLookup = (groups) => {
  const lookup = new Map();
  groups.forEach((group) => {
    lookup.set(group.id, group.parentId ?? null);
  });
  return lookup;
};

const createsCycle = (groups, groupId, candidateParentId) => {
  if (!candidateParentId || !Number.isInteger(candidateParentId)) {
    return false;
  }

  if (candidateParentId === groupId) {
    return true;
  }

  const lookup = buildParentLookup(groups);
  let current = candidateParentId;

  while (current) {
    if (current === groupId) {
      return true;
    }

    const next = lookup.get(current);

    if (!next || next === current) {
      return false;
    }

    current = next;
  }

  return false;
};

const findCanonicalRootId = (groups) => {
  return groups
    .filter((group) => group.parentId === null)
    .reduce((rootId, group) => {
      if (rootId === null || group.id < rootId) {
        return group.id;
      }
      return rootId;
    }, null);
};

const defaultRouterosOptions = () => ({
  apiEnabled: false,
  apiPort: 8728,
  apiSSL: false,
  apiUsername: '',
  apiPassword: '',
  verifyTLS: true,
  apiTimeout: 5000,
  apiRetries: 1,
  allowInsecureCiphers: false,
  preferredApiFirst: true,
  firmwareVersion: '',
  sshEnabled: false,
  sshPort: 22,
  sshUsername: '',
  sshPassword: '',
  sshAcceptNewHostKeys: true
});

const normalizeText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return fallback;
};

const clampNumber = (value, { min, max, fallback }) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isInteger(parsed)) {
    if (Number.isInteger(min) && parsed < min) {
      return min;
    }

    if (Number.isInteger(max) && parsed > max) {
      return max;
    }

    return parsed;
  }

  return fallback;
};

const normalizeTags = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => normalizeText(entry)).filter(Boolean))];
  }

  if (typeof value === 'string') {
    return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
  }

  return [];
};

const allowedConnectivityStatuses = new Set(['unknown', 'online', 'offline', 'disabled']);
const allowedAddressReferenceTypes = new Set(['mikrotik', 'group']);
const allowedFirewallChains = new Set(['input', 'output', 'forward']);
const allowedFirewallActions = new Set(['accept', 'drop']);
const allowedFirewallStates = new Set(['new', 'established', 'related', 'invalid', 'syn']);

const defaultConnectivityState = (routeros = defaultRouterosOptions()) => ({
  api: {
    status: routeros.apiEnabled ? 'unknown' : 'disabled',
    lastCheckedAt: null,
    lastError: null
  },
  ssh: {
    status: routeros.sshEnabled ? 'unknown' : 'disabled',
    lastCheckedAt: null,
    fingerprint: null,
    lastError: null
  }
});

const sanitizeConnectivity = (connectivity = {}, routeros = defaultRouterosOptions()) => {
  const baseline = defaultConnectivityState(routeros);
  const normalized = { ...baseline };

  const api = connectivity.api ?? {};
  const apiStatus = typeof api.status === 'string' ? api.status.toLowerCase() : '';
  normalized.api.status = allowedConnectivityStatuses.has(apiStatus) ? apiStatus : baseline.api.status;
  if (!routeros.apiEnabled) {
    normalized.api.status = 'disabled';
  }
  normalized.api.lastCheckedAt = typeof api.lastCheckedAt === 'string' ? api.lastCheckedAt : baseline.api.lastCheckedAt;
  normalized.api.lastError = normalizeOptionalText(api.lastError ?? baseline.api.lastError ?? '') || null;

  const ssh = connectivity.ssh ?? {};
  const sshStatus = typeof ssh.status === 'string' ? ssh.status.toLowerCase() : '';
  normalized.ssh.status = allowedConnectivityStatuses.has(sshStatus) ? sshStatus : baseline.ssh.status;
  if (!routeros.sshEnabled) {
    normalized.ssh.status = 'disabled';
  }
  normalized.ssh.lastCheckedAt = typeof ssh.lastCheckedAt === 'string' ? ssh.lastCheckedAt : baseline.ssh.lastCheckedAt;
  normalized.ssh.lastError = normalizeOptionalText(ssh.lastError ?? baseline.ssh.lastError ?? '') || null;
  normalized.ssh.fingerprint = normalizeOptionalText(ssh.fingerprint ?? baseline.ssh.fingerprint ?? '') || null;

  return normalized;
};

const compareVersionSegments = (segmentsA, segmentsB) => {
  const length = Math.max(segmentsA.length, segmentsB.length);
  for (let index = 0; index < length; index += 1) {
    const a = Number.parseInt(segmentsA[index] ?? '0', 10);
    const b = Number.parseInt(segmentsB[index] ?? '0', 10);

    if (Number.isNaN(a) && Number.isNaN(b)) {
      continue;
    }

    if (Number.isNaN(a)) {
      return -1;
    }

    if (Number.isNaN(b)) {
      return 1;
    }

    if (a > b) {
      return 1;
    }

    if (a < b) {
      return -1;
    }
  }

  return 0;
};

const compareRouterosVersions = (current, target) => {
  if (!current || !target) {
    return 0;
  }

  const currentSegments = String(current)
    .split(/[^0-9]+/)
    .filter(Boolean);
  const targetSegments = String(target)
    .split(/[^0-9]+/)
    .filter(Boolean);

  return compareVersionSegments(currentSegments, targetSegments);
};

const deriveDeviceStatus = (status = {}, routeros = defaultRouterosOptions()) => {
  const normalized = { ...sanitizeDeviceStatus(status) };
  const version = normalizeOptionalText(routeros.firmwareVersion ?? '');

  if (!version) {
    normalized.updateStatus = 'unknown';
    return normalized;
  }

  const comparison = compareRouterosVersions(version, TARGET_ROUTEROS_VERSION);
  normalized.updateStatus = comparison >= 0 ? 'updated' : 'pending';

  if (!normalized.lastAuditAt) {
    normalized.lastAuditAt = new Date().toISOString();
  }

  return normalized;
};

const sanitizePortExpression = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/[^0-9,:;-]/g, '').replace(/;+/g, ';').trim();
};

const sanitizeFirewallStatesList = (states) => {
  if (!states) {
    return [];
  }

  const source = Array.isArray(states) ? states : String(states).split(',');

  return [...new Set(source.map((entry) => entry.toString().toLowerCase().trim()).filter(Boolean))].filter((entry) =>
    allowedFirewallStates.has(entry)
  );
};

const generateHostFingerprint = (host) => {
  const normalized = normalizeOptionalText(host);

  if (!normalized) {
    return null;
  }

  const digest = crypto.createHash('sha256').update(normalized).digest('hex');
  return digest.match(/.{1,4}/g)?.join(':') ?? digest;
};

const sanitizeRouteros = (options = {}, baseline = defaultRouterosOptions()) => {
  const normalized = { ...baseline };

  normalized.apiEnabled = normalizeBoolean(options.apiEnabled, baseline.apiEnabled);
  normalized.apiSSL = normalizeBoolean(options.apiSSL, baseline.apiSSL);

  const defaultPort = normalized.apiSSL ? 8729 : 8728;
  const desiredPort = options.apiPort ?? baseline.apiPort ?? defaultPort;
  normalized.apiPort = clampNumber(desiredPort, { min: 1, max: 65535, fallback: defaultPort });

  normalized.apiUsername = normalizeOptionalText(options.apiUsername ?? baseline.apiUsername ?? '');
  normalized.apiPassword = normalizeOptionalText(options.apiPassword ?? baseline.apiPassword ?? '');
  normalized.verifyTLS = normalizeBoolean(options.verifyTLS, baseline.verifyTLS);

  const timeoutFallback = clampNumber(baseline.apiTimeout, { min: 500, max: 60000, fallback: 5000 });
  normalized.apiTimeout = clampNumber(options.apiTimeout, {
    min: 500,
    max: 60000,
    fallback: timeoutFallback
  });

  const retriesFallback = clampNumber(baseline.apiRetries, { min: 0, max: 10, fallback: 1 });
  normalized.apiRetries = clampNumber(options.apiRetries, { min: 0, max: 10, fallback: retriesFallback });

  normalized.allowInsecureCiphers = normalizeBoolean(
    options.allowInsecureCiphers,
    baseline.allowInsecureCiphers
  );
  normalized.preferredApiFirst = normalizeBoolean(
    options.preferredApiFirst,
    baseline.preferredApiFirst
  );

  normalized.sshEnabled = normalizeBoolean(options.sshEnabled, baseline.sshEnabled);

  const sshPortFallback = clampNumber(baseline.sshPort, { min: 1, max: 65535, fallback: 22 });
  normalized.sshPort = clampNumber(options.sshPort, { min: 1, max: 65535, fallback: sshPortFallback });
  normalized.sshUsername = normalizeOptionalText(options.sshUsername ?? baseline.sshUsername ?? '');
  normalized.sshPassword = normalizeOptionalText(options.sshPassword ?? baseline.sshPassword ?? '');
  normalized.autoAcceptFingerprints = normalizeBoolean(
    options.autoAcceptFingerprints,
    baseline.autoAcceptFingerprints
  );

  if (normalized.apiSSL && !options.apiPort && !baseline.apiPort) {
    normalized.apiPort = 8729;
  }

  if (!normalized.apiSSL && !options.apiPort && !baseline.apiPort) {
    normalized.apiPort = 8728;
  }

  normalized.firmwareVersion = normalizeOptionalText(
    options.firmwareVersion ?? baseline.firmwareVersion ?? ''
  );

  const baselineSshPortFallback = clampNumber(baseline.sshPort, {
    min: 1,
    max: 65535,
    fallback: 22
  });
  normalized.sshEnabled = normalizeBoolean(options.sshEnabled, baseline.sshEnabled);
  normalized.sshPort = clampNumber(options.sshPort, {
    min: 1,
    max: 65535,
    fallback: baselineSshPortFallback
  });
  normalized.sshUsername = normalizeOptionalText(options.sshUsername ?? baseline.sshUsername ?? '');
  normalized.sshPassword = normalizeOptionalText(options.sshPassword ?? baseline.sshPassword ?? '');
  normalized.sshAcceptNewHostKeys = normalizeBoolean(
    options.sshAcceptNewHostKeys ?? options.sshAcceptUnknownHost,
    baseline.sshAcceptNewHostKeys
  );

  if (!normalized.sshEnabled) {
    normalized.sshPort = clampNumber(22, { min: 1, max: 65535, fallback: 22 });
  }

  return normalized;
};

const allowedUpdateStatuses = new Set(['updated', 'pending', 'unknown']);

const sanitizeDeviceStatus = (status = {}) => {
  const normalized = {};
  const candidate = typeof status.updateStatus === 'string' ? status.updateStatus.toLowerCase() : '';
  normalized.updateStatus = allowedUpdateStatuses.has(candidate) ? candidate : 'unknown';
  normalized.lastAuditAt = typeof status.lastAuditAt === 'string' ? status.lastAuditAt : null;
  return normalized;
};

const allowedTunnelStates = new Set(['up', 'down', 'maintenance']);

const parseOptionalNumber = (value, { min, max }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (typeof min === 'number' && parsed < min) {
    return min;
  }

  if (typeof max === 'number' && parsed > max) {
    return max;
  }

  return parsed;
};

const normalizeIsoDate = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const sanitizeTunnelMetrics = (metrics = {}) => ({
  latencyMs: parseOptionalNumber(metrics.latencyMs, { min: 0, max: 1_000_000 }),
  packetLoss: parseOptionalNumber(metrics.packetLoss, { min: 0, max: 100 }),
  lastCheckedAt: normalizeIsoDate(metrics.lastCheckedAt)
});

const discoveryNotePattern = /\[discovery\]\s+local=([^\s]+)\s+remote=([^\s]+)/i;

const collectNormalizedIpAddresses = (value) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    const nested = value.flatMap((entry) => collectNormalizedIpAddresses(entry));
    return [...new Set(nested.filter(Boolean))];
  }

  if (typeof value === 'object') {
    const nested = Object.values(value).flatMap((entry) => collectNormalizedIpAddresses(entry));
    return [...new Set(nested.filter(Boolean))];
  }

  const tokens = String(value)
    .replace(/^[\[\(]+|[\]\)]+$/g, '')
    .split(/[,;]/)
    .flatMap((segment) => segment.split(/\s+/))
    .map((segment) => segment.trim())
    .filter(Boolean);

  const addresses = tokens
    .map((segment) => {
      const withoutPrefix = segment.includes('=') ? segment.split('=').pop() : segment;
      const slashIndex = withoutPrefix.indexOf('/');
      const base = slashIndex >= 0 ? withoutPrefix.slice(0, slashIndex) : withoutPrefix;
      const scopeIndex = base.indexOf('%');
      const candidate = scopeIndex >= 0 ? base.slice(0, scopeIndex) : base;
      return candidate && isIP(candidate) ? candidate : null;
    })
    .filter(Boolean);

  return [...new Set(addresses)];
};

// normalizeIpAddress is defined earlier; avoid duplicate declaration

const pickField = (entry, keys) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
      return entry[key];
    }
  }

  return null;
};

const canonicalizeConnectionType = (value) => {
  const text = normalizeOptionalText(value ?? '');
  if (!text) {
    return null;
  }

  if (/wire\s*guard/i.test(text) || /^wg$/i.test(text)) {
    return 'WireGuard';
  }
  if (/ipsec/i.test(text)) {
    return 'IPsec';
  }
  if (/gre/i.test(text)) {
    return 'GRE';
  }
  if (/l2tp/i.test(text)) {
    return 'L2TP';
  }
  if (/pptp/i.test(text)) {
    return 'PPTP';
  }

  return text.toUpperCase();
};

const normalizeDiscoveredStatus = (value) => {
  const text = normalizeOptionalText(value ?? '').toLowerCase();

  if (allowedTunnelStates.has(text)) {
    return text;
  }

  if (['connected', 'running', 'established', 'active', 'up'].includes(text)) {
    return 'up';
  }

  if (['maintenance', 'pending', 'syncing'].includes(text)) {
    return 'maintenance';
  }

  if (['disabled', 'inactive', 'error', 'failed', 'offline', 'down', 'disconnected'].includes(text)) {
    return 'down';
  }

  return 'down';
};

const parseNumericMetric = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseNumericMetric(entry);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const parsed = parseNumericMetric(entry);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const combineLatency = (a, b) => {
  const values = [a, b].filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const sanitized = values.map((value) => (value < 0 ? 0 : value));
  return Math.min(...sanitized);
};

const combinePacketLoss = (a, b) => {
  const values = [a, b].filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const clamped = values.map((value) => {
    if (value < 0) {
      return 0;
    }
    if (value > 100) {
      return 100;
    }
    return value;
  });

  return Math.max(...clamped);
};

const deriveDiscoveredTunnelName = (sourceDevice, targetDevice, sourceCandidate, targetCandidate) => {
  const sourceName = normalizeOptionalText(sourceDevice?.name ?? '') || `Device ${sourceCandidate.deviceId}`;
  const targetName = normalizeOptionalText(targetDevice?.name ?? '') || `Device ${targetCandidate.deviceId}`;

  const sourceInterface = normalizeOptionalText(sourceCandidate.interfaceName ?? '');
  const targetInterface = normalizeOptionalText(targetCandidate.interfaceName ?? '');

  const interfaceLabel =
    sourceInterface && targetInterface ? ` (${sourceInterface} ↔ ${targetInterface})` : '';

  return `Discovered ${sourceName} ↔ ${targetName}${interfaceLabel}`;
};

const buildDiscoveryNotes = (sourceDevice, targetDevice, sourceCandidate, targetCandidate) => {
  const segments = [
    'Discovered automatically from RouterOS inventory.',
    `[discovery] local=${sourceCandidate.localAddress} remote=${targetCandidate.localAddress}`
  ];

  if (sourceCandidate.interfaceName) {
    segments.push(`source-interface=${sourceCandidate.interfaceName}`);
  }

  if (targetCandidate.interfaceName) {
    segments.push(`target-interface=${targetCandidate.interfaceName}`);
  }

  if (sourceCandidate.remoteDeviceName) {
    segments.push(`source-remote=${sourceCandidate.remoteDeviceName}`);
  }

  if (targetCandidate.remoteDeviceName) {
    segments.push(`target-remote=${targetCandidate.remoteDeviceName}`);
  }

  const unmatchedRemotes = sourceCandidate.remoteAddresses.filter(
    (address) => address !== targetCandidate.localAddress
  );

  if (unmatchedRemotes.length > 0) {
    segments.push(`source-additional-remotes=${unmatchedRemotes.join(',')}`);
  }

  return segments.join(' ');
};

const buildDevicePairKey = (deviceAId, deviceBId, addressA, addressB) => {
  const parsedIds = [deviceAId, deviceBId]
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  if (parsedIds.length !== 2) {
    return null;
  }

  parsedIds.sort((a, b) => a - b);

  if (addressA && addressB) {
    const normalizedA = normalizeIpAddress(addressA);
    const normalizedB = normalizeIpAddress(addressB);

    if (normalizedA && normalizedB) {
      const addresses = [normalizedA, normalizedB].sort();
      return `${parsedIds[0]}|${parsedIds[1]}|${addresses[0]}|${addresses[1]}`;
    }
  }

  return `${parsedIds[0]}|${parsedIds[1]}`;
};

const extractTunnelInventoryCandidates = (device) => {
  if (!device || typeof device !== 'object') {
    return [];
  }

  const entries = [];

  const enqueue = (collection) => {
    if (!collection) {
      return;
    }

    if (Array.isArray(collection)) {
      collection.forEach((item) => {
        if (item && typeof item === 'object') {
          entries.push(item);
        }
      });
      return;
    }

    if (typeof collection === 'object') {
      Object.values(collection).forEach((value) => enqueue(value));
    }
  };

  enqueue(device.status?.inventory?.tunnels);
  enqueue(device.status?.inventory?.interfaces);
  enqueue(device.status?.inventory?.peers);
  enqueue(device.status?.inventory?.ipsec);
  enqueue(device.status?.inventory?.wireguard);
  enqueue(device.status?.tunnels);
  enqueue(device.routeros?.tunnels);
  enqueue(device.routeros?.peers);
  enqueue(device.tunnels);

  const candidates = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const localSource =
      pickField(entry, ['localAddress', 'local', 'localIp', 'local_ip', 'address', 'cidr', 'localCidr']) ??
      pickField(entry.local ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.interface ?? {}, ['address', 'ip', 'ipAddress', 'cidr']);

    const remoteSource =
      pickField(entry, [
        'remoteAddress',
        'remote',
        'remoteIp',
        'remote_ip',
        'peerAddress',
        'endpointAddress',
        'remoteCidr',
        'peer',
        'remotePeer'
      ]) ??
      pickField(entry.remote ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.peer ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.endpoint ?? {}, ['address', 'ip', 'ipAddress', 'cidr']);

    const localAddresses = collectNormalizedIpAddresses(localSource);
    const remoteAddresses = collectNormalizedIpAddresses(remoteSource);

    if (!localAddresses.length || !remoteAddresses.length) {
      return;
    }

    const interfaceName =
      pickField(entry, ['interface', 'name', 'iface', 'identity', 'id']) ??
      pickField(entry.interface ?? {}, ['name', 'id']) ??
      pickField(entry.peer ?? {}, ['interface', 'name']);

    const remoteDeviceName =
      pickField(entry, ['remoteName', 'remoteIdentity', 'peerName', 'peerIdentity', 'remoteDevice']) ??
      pickField(entry.remote ?? {}, ['name', 'identity']) ??
      pickField(entry.peer ?? {}, ['name', 'identity']);

    const connectionType =
      canonicalizeConnectionType(
        pickField(entry, ['connectionType', 'tunnelType', 'type', 'kind', 'mode', 'profile']) ??
          pickField(entry.profile ?? {}, ['type', 'name'])
      ) ?? null;

    const status = normalizeDiscoveredStatus(
      pickField(entry, ['status', 'state', 'operStatus', 'operState', 'running', 'enabled']) ??
        pickField(entry.interface ?? {}, ['status', 'state'])
    );

    const latencyMs = parseNumericMetric(
      pickField(entry, ['latencyMs', 'latency', 'avgLatency', 'averageLatency', 'latestLatency'])
    );

    const packetLoss = parseNumericMetric(
      pickField(entry, ['packetLoss', 'loss', 'packetLossPercent', 'lossPercent'])
    );

    const uniqueRemoteAddresses = [...new Set(remoteAddresses.filter(Boolean))];

    localAddresses.forEach((localAddress) => {
      const filteredRemotes = uniqueRemoteAddresses.filter((remote) => remote && remote !== localAddress);
      if (!filteredRemotes.length) {
        return;
      }

      candidates.push({
        deviceId: device.id,
        deviceName: device.name ?? `Device ${device.id}`,
        deviceGroupId: Number.isInteger(device.groupId) ? device.groupId : null,
        interfaceName: interfaceName ? String(interfaceName) : null,
        connectionType,
        status,
        localAddress,
        remoteAddresses: filteredRemotes,
        latencyMs,
        packetLoss,
        remoteDeviceName: remoteDeviceName ? String(remoteDeviceName) : null
      });
    });
  });

  return candidates;
};

const runTunnelDiscovery = (state) => {
  if (!state || !Array.isArray(state.mikrotiks) || state.mikrotiks.length === 0) {
    return { mutated: false, added: [] };
  }

  const deviceLookup = new Map();
  state.mikrotiks.forEach((device) => {
    if (Number.isInteger(device.id)) {
      deviceLookup.set(device.id, device);
    }
  });

  if (deviceLookup.size === 0) {
    return { mutated: false, added: [] };
  }

  const candidates = [];
  deviceLookup.forEach((device) => {
    extractTunnelInventoryCandidates(device).forEach((candidate) => {
      if (candidate.localAddress && Array.isArray(candidate.remoteAddresses) && candidate.remoteAddresses.length > 0) {
        candidates.push(candidate);
      }
    });
  });

  if (!candidates.length) {
    return { mutated: false, added: [] };
  }

  const localIndex = new Map();
  candidates.forEach((candidate) => {
    const list = localIndex.get(candidate.localAddress) ?? [];
    list.push(candidate);
    localIndex.set(candidate.localAddress, list);
  });

  const existingManualPairs = new Set();
  const existingDiscoveredPairs = new Set();

  state.tunnels.forEach((tunnel) => {
    const sourceId = Number.parseInt(tunnel.sourceId, 10);
    const targetId = Number.parseInt(tunnel.targetId, 10);

    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) {
      return;
    }

    const baseKey = buildDevicePairKey(sourceId, targetId);
    if (!baseKey) {
      return;
    }

    const tags = Array.isArray(tunnel.tags)
      ? tunnel.tags.map((tag) => normalizeOptionalText(tag).toLowerCase())
      : [];

    if (tags.includes('discovered')) {
      const match = discoveryNotePattern.exec(tunnel.notes ?? '');
      if (match) {
        const addressKey = buildDevicePairKey(sourceId, targetId, match[1], match[2]);
        if (addressKey) {
          existingDiscoveredPairs.add(addressKey);
          return;
        }
      }

      existingDiscoveredPairs.add(baseKey);
      return;
    }

    existingManualPairs.add(baseKey);
  });

  const createdPairs = new Set();
  const added = [];
  let mutated = false;
  let nextId = Number.isInteger(state.lastTunnelId) ? state.lastTunnelId : 0;

  const registerPair = (set, deviceAId, deviceBId, addressA, addressB) => {
    const key = buildDevicePairKey(deviceAId, deviceBId, addressA, addressB);
    if (key) {
      set.add(key);
    }
  };

  for (const candidate of candidates) {
    for (const remoteAddress of candidate.remoteAddresses) {
      const peers = localIndex.get(remoteAddress);
      if (!peers) {
        continue;
      }

      for (const peer of peers) {
        if (peer.deviceId === candidate.deviceId) {
          continue;
        }

        const baseKey = buildDevicePairKey(candidate.deviceId, peer.deviceId);
        if (!baseKey) {
          continue;
        }

        if (existingManualPairs.has(baseKey)) {
          continue;
        }

        const addressKey = buildDevicePairKey(
          candidate.deviceId,
          peer.deviceId,
          candidate.localAddress,
          peer.localAddress
        );

        if (!addressKey) {
          continue;
        }

        if (existingDiscoveredPairs.has(addressKey) || createdPairs.has(addressKey)) {
          continue;
        }

        const [sourceCandidate, targetCandidate] =
          candidate.deviceId < peer.deviceId ? [candidate, peer] : [peer, candidate];

        const sourceDevice = deviceLookup.get(sourceCandidate.deviceId);
        const targetDevice = deviceLookup.get(targetCandidate.deviceId);

        if (!sourceDevice || !targetDevice) {
          continue;
        }

        const connectionType =
          canonicalizeConnectionType(sourceCandidate.connectionType) ??
          canonicalizeConnectionType(targetCandidate.connectionType) ??
          'GRE';

        const combinedStatus = (() => {
          const sourceStatus = normalizeDiscoveredStatus(sourceCandidate.status);
          const targetStatus = normalizeDiscoveredStatus(targetCandidate.status);

          if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
            return 'maintenance';
          }

          if (sourceStatus === 'up' && targetStatus === 'up') {
            return 'up';
          }

          return 'down';
        })();

        const latencyMs = combineLatency(sourceCandidate.latencyMs, targetCandidate.latencyMs);
        const packetLoss = combinePacketLoss(sourceCandidate.packetLoss, targetCandidate.packetLoss);

        const timestamp = new Date().toISOString();
        nextId += 1;

        const groupId =
          Number.isInteger(sourceDevice.groupId) && sourceDevice.groupId === targetDevice.groupId
            ? sourceDevice.groupId
            : null;

        const name = deriveDiscoveredTunnelName(
          sourceDevice,
          targetDevice,
          sourceCandidate,
          targetCandidate
        );

        const metrics = sanitizeTunnelMetrics({
          latencyMs,
          packetLoss,
          lastCheckedAt: null
        });

        const notes = buildDiscoveryNotes(
          sourceDevice,
          targetDevice,
          sourceCandidate,
          targetCandidate
        );

        const record = {
          id: nextId,
          name,
          groupId,
          sourceId: sourceCandidate.deviceId,
          targetId: targetCandidate.deviceId,
          connectionType,
          status: combinedStatus,
          enabled: false,
          tags: ['discovered'],
          notes,
          metrics,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        state.tunnels.push(record);
        added.push(record);
        registerPair(existingDiscoveredPairs, candidate.deviceId, peer.deviceId, candidate.localAddress, peer.localAddress);
        createdPairs.add(addressKey);
        mutated = true;
      }
    }
  }

  if (mutated) {
    state.lastTunnelId = nextId;
  }

  return { mutated, added };
};

export const resolveDatabaseFile = (databasePath = './data/app.db') => {
  if (!databasePath) {
    throw new Error('Database path must be provided.');
  }

  if (Array.isArray(value)) {
    const nested = value.flatMap((entry) => collectNormalizedIpAddresses(entry));
    return [...new Set(nested.filter(Boolean))];
  }

  if (typeof value === 'object') {
    const nested = Object.values(value).flatMap((entry) => collectNormalizedIpAddresses(entry));
    return [...new Set(nested.filter(Boolean))];
  }

  const tokens = String(value)
    .replace(/^[\[\(]+|[\]\)]+$/g, '')
    .split(/[,;]/)
    .flatMap((segment) => segment.split(/\s+/))
    .map((segment) => segment.trim())
    .filter(Boolean);

  const addresses = tokens
    .map((segment) => {
      const withoutPrefix = segment.includes('=') ? segment.split('=').pop() : segment;
      const slashIndex = withoutPrefix.indexOf('/');
      const base = slashIndex >= 0 ? withoutPrefix.slice(0, slashIndex) : withoutPrefix;
      const scopeIndex = base.indexOf('%');
      const candidate = scopeIndex >= 0 ? base.slice(0, scopeIndex) : base;
      return candidate && isIP(candidate) ? candidate : null;
    })
    .filter(Boolean);

  return [...new Set(addresses)];
};

// normalizeIpAddress is defined earlier; avoid duplicate declaration

const pickField = (entry, keys) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
      return entry[key];
    }
  }

  return null;
};

const canonicalizeConnectionType = (value) => {
  const text = normalizeOptionalText(value ?? '');
  if (!text) {
    return null;
  }

  if (/wire\s*guard/i.test(text) || /^wg$/i.test(text)) {
    return 'WireGuard';
  }
  if (/ipsec/i.test(text)) {
    return 'IPsec';
  }
  if (/gre/i.test(text)) {
    return 'GRE';
  }
  if (/l2tp/i.test(text)) {
    return 'L2TP';
  }
  if (/pptp/i.test(text)) {
    return 'PPTP';
  }

  return text.toUpperCase();
};

const normalizeDiscoveredStatus = (value) => {
  const text = normalizeOptionalText(value ?? '').toLowerCase();

  if (allowedTunnelStates.has(text)) {
    return text;
  }

  if (['connected', 'running', 'established', 'active', 'up'].includes(text)) {
    return 'up';
  }

  if (['maintenance', 'pending', 'syncing'].includes(text)) {
    return 'maintenance';
  }

  if (['disabled', 'inactive', 'error', 'failed', 'offline', 'down', 'disconnected'].includes(text)) {
    return 'down';
  }

  return 'down';
};

const parseNumericMetric = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseNumericMetric(entry);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const parsed = parseNumericMetric(entry);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const combineLatency = (a, b) => {
  const values = [a, b].filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const sanitized = values.map((value) => (value < 0 ? 0 : value));
  return Math.min(...sanitized);
};

const combinePacketLoss = (a, b) => {
  const values = [a, b].filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const clamped = values.map((value) => {
    if (value < 0) {
      return 0;
    }
    if (value > 100) {
      return 100;
    }
    return value;
  });

  return Math.max(...clamped);
};

const deriveDiscoveredTunnelName = (sourceDevice, targetDevice, sourceCandidate, targetCandidate) => {
  const sourceName = normalizeOptionalText(sourceDevice?.name ?? '') || `Device ${sourceCandidate.deviceId}`;
  const targetName = normalizeOptionalText(targetDevice?.name ?? '') || `Device ${targetCandidate.deviceId}`;

  const sourceInterface = normalizeOptionalText(sourceCandidate.interfaceName ?? '');
  const targetInterface = normalizeOptionalText(targetCandidate.interfaceName ?? '');

  const interfaceLabel =
    sourceInterface && targetInterface ? ` (${sourceInterface} ↔ ${targetInterface})` : '';

  return `Discovered ${sourceName} ↔ ${targetName}${interfaceLabel}`;
};

const buildDiscoveryNotes = (sourceDevice, targetDevice, sourceCandidate, targetCandidate) => {
  const segments = [
    'Discovered automatically from RouterOS inventory.',
    `[discovery] local=${sourceCandidate.localAddress} remote=${targetCandidate.localAddress}`
  ];

  if (sourceCandidate.interfaceName) {
    segments.push(`source-interface=${sourceCandidate.interfaceName}`);
  }

  if (targetCandidate.interfaceName) {
    segments.push(`target-interface=${targetCandidate.interfaceName}`);
  }

  if (sourceCandidate.remoteDeviceName) {
    segments.push(`source-remote=${sourceCandidate.remoteDeviceName}`);
  }

  if (targetCandidate.remoteDeviceName) {
    segments.push(`target-remote=${targetCandidate.remoteDeviceName}`);
  }

  const unmatchedRemotes = sourceCandidate.remoteAddresses.filter(
    (address) => address !== targetCandidate.localAddress
  );

  if (unmatchedRemotes.length > 0) {
    segments.push(`source-additional-remotes=${unmatchedRemotes.join(',')}`);
  }

  return segments.join(' ');
};

const buildDevicePairKey = (deviceAId, deviceBId, addressA, addressB) => {
  const parsedIds = [deviceAId, deviceBId]
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  if (parsedIds.length !== 2) {
    return null;
  }

  parsedIds.sort((a, b) => a - b);

  if (addressA && addressB) {
    const normalizedA = normalizeIpAddress(addressA);
    const normalizedB = normalizeIpAddress(addressB);

    if (normalizedA && normalizedB) {
      const addresses = [normalizedA, normalizedB].sort();
      return `${parsedIds[0]}|${parsedIds[1]}|${addresses[0]}|${addresses[1]}`;
    }
  }

  return `${parsedIds[0]}|${parsedIds[1]}`;
};

const extractTunnelInventoryCandidates = (device) => {
  if (!device || typeof device !== 'object') {
    return [];
  }

  const entries = [];

  const enqueue = (collection) => {
    if (!collection) {
      return;
    }

    if (Array.isArray(collection)) {
      collection.forEach((item) => {
        if (item && typeof item === 'object') {
          entries.push(item);
        }
      });
      return;
    }

    if (typeof collection === 'object') {
      Object.values(collection).forEach((value) => enqueue(value));
    }
  };

  enqueue(device.status?.inventory?.tunnels);
  enqueue(device.status?.inventory?.interfaces);
  enqueue(device.status?.inventory?.peers);
  enqueue(device.status?.inventory?.ipsec);
  enqueue(device.status?.inventory?.wireguard);
  enqueue(device.status?.tunnels);
  enqueue(device.routeros?.tunnels);
  enqueue(device.routeros?.peers);
  enqueue(device.tunnels);

  const candidates = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const localSource =
      pickField(entry, ['localAddress', 'local', 'localIp', 'local_ip', 'address', 'cidr', 'localCidr']) ??
      pickField(entry.local ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.interface ?? {}, ['address', 'ip', 'ipAddress', 'cidr']);

    const remoteSource =
      pickField(entry, [
        'remoteAddress',
        'remote',
        'remoteIp',
        'remote_ip',
        'peerAddress',
        'endpointAddress',
        'remoteCidr',
        'peer',
        'remotePeer'
      ]) ??
      pickField(entry.remote ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.peer ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.endpoint ?? {}, ['address', 'ip', 'ipAddress', 'cidr']);

    const localAddresses = collectNormalizedIpAddresses(localSource);
    const remoteAddresses = collectNormalizedIpAddresses(remoteSource);

    if (!localAddresses.length || !remoteAddresses.length) {
      return;
    }

    const interfaceName =
      pickField(entry, ['interface', 'name', 'iface', 'identity', 'id']) ??
      pickField(entry.interface ?? {}, ['name', 'id']) ??
      pickField(entry.peer ?? {}, ['interface', 'name']);

    const remoteDeviceName =
      pickField(entry, ['remoteName', 'remoteIdentity', 'peerName', 'peerIdentity', 'remoteDevice']) ??
      pickField(entry.remote ?? {}, ['name', 'identity']) ??
      pickField(entry.peer ?? {}, ['name', 'identity']);

    const connectionType =
      canonicalizeConnectionType(
        pickField(entry, ['connectionType', 'tunnelType', 'type', 'kind', 'mode', 'profile']) ??
          pickField(entry.profile ?? {}, ['type', 'name'])
      ) ?? null;

    const status = normalizeDiscoveredStatus(
      pickField(entry, ['status', 'state', 'operStatus', 'operState', 'running', 'enabled']) ??
        pickField(entry.interface ?? {}, ['status', 'state'])
    );

    const latencyMs = parseNumericMetric(
      pickField(entry, ['latencyMs', 'latency', 'avgLatency', 'averageLatency', 'latestLatency'])
    );

    const packetLoss = parseNumericMetric(
      pickField(entry, ['packetLoss', 'loss', 'packetLossPercent', 'lossPercent'])
    );

    const uniqueRemoteAddresses = [...new Set(remoteAddresses.filter(Boolean))];

    localAddresses.forEach((localAddress) => {
      const filteredRemotes = uniqueRemoteAddresses.filter((remote) => remote && remote !== localAddress);
      if (!filteredRemotes.length) {
        return;
      }

      candidates.push({
        deviceId: device.id,
        deviceName: device.name ?? `Device ${device.id}`,
        deviceGroupId: Number.isInteger(device.groupId) ? device.groupId : null,
        interfaceName: interfaceName ? String(interfaceName) : null,
        connectionType,
        status,
        localAddress,
        remoteAddresses: filteredRemotes,
        latencyMs,
        packetLoss,
        remoteDeviceName: remoteDeviceName ? String(remoteDeviceName) : null
      });
    });
  });

  return candidates;
};

const runTunnelDiscovery = (state) => {
  if (!state || !Array.isArray(state.mikrotiks) || state.mikrotiks.length === 0) {
    return { mutated: false, added: [] };
  }

  const deviceLookup = new Map();
  state.mikrotiks.forEach((device) => {
    if (Number.isInteger(device.id)) {
      deviceLookup.set(device.id, device);
    }
  });

  if (deviceLookup.size === 0) {
    return { mutated: false, added: [] };
  }

  const candidates = [];
  deviceLookup.forEach((device) => {
    extractTunnelInventoryCandidates(device).forEach((candidate) => {
      if (candidate.localAddress && Array.isArray(candidate.remoteAddresses) && candidate.remoteAddresses.length > 0) {
        candidates.push(candidate);
      }
    });
  });

  if (!candidates.length) {
    return { mutated: false, added: [] };
  }

  const localIndex = new Map();
  candidates.forEach((candidate) => {
    const list = localIndex.get(candidate.localAddress) ?? [];
    list.push(candidate);
    localIndex.set(candidate.localAddress, list);
  });

  const existingManualPairs = new Set();
  const existingDiscoveredPairs = new Set();

  state.tunnels.forEach((tunnel) => {
    const sourceId = Number.parseInt(tunnel.sourceId, 10);
    const targetId = Number.parseInt(tunnel.targetId, 10);

    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) {
      return;
    }

    const baseKey = buildDevicePairKey(sourceId, targetId);
    if (!baseKey) {
      return;
    }

    const tags = Array.isArray(tunnel.tags)
      ? tunnel.tags.map((tag) => normalizeOptionalText(tag).toLowerCase())
      : [];

    if (tags.includes('discovered')) {
      const match = discoveryNotePattern.exec(tunnel.notes ?? '');
      if (match) {
        const addressKey = buildDevicePairKey(sourceId, targetId, match[1], match[2]);
        if (addressKey) {
          existingDiscoveredPairs.add(addressKey);
          return;
        }
      }

      existingDiscoveredPairs.add(baseKey);
      return;
    }

    existingManualPairs.add(baseKey);
  });

  const createdPairs = new Set();
  const added = [];
  let mutated = false;
  let nextId = Number.isInteger(state.lastTunnelId) ? state.lastTunnelId : 0;

  const registerPair = (set, deviceAId, deviceBId, addressA, addressB) => {
    const key = buildDevicePairKey(deviceAId, deviceBId, addressA, addressB);
    if (key) {
      set.add(key);
    }
  };

  for (const candidate of candidates) {
    for (const remoteAddress of candidate.remoteAddresses) {
      const peers = localIndex.get(remoteAddress);
      if (!peers) {
        continue;
      }

      for (const peer of peers) {
        if (peer.deviceId === candidate.deviceId) {
          continue;
        }

        const baseKey = buildDevicePairKey(candidate.deviceId, peer.deviceId);
        if (!baseKey) {
          continue;
        }

        if (existingManualPairs.has(baseKey)) {
          continue;
        }

        const addressKey = buildDevicePairKey(
          candidate.deviceId,
          peer.deviceId,
          candidate.localAddress,
          peer.localAddress
        );

        if (!addressKey) {
          continue;
        }

        if (existingDiscoveredPairs.has(addressKey) || createdPairs.has(addressKey)) {
          continue;
        }

        const [sourceCandidate, targetCandidate] =
          candidate.deviceId < peer.deviceId ? [candidate, peer] : [peer, candidate];

        const sourceDevice = deviceLookup.get(sourceCandidate.deviceId);
        const targetDevice = deviceLookup.get(targetCandidate.deviceId);

        if (!sourceDevice || !targetDevice) {
          continue;
        }

        const connectionType =
          canonicalizeConnectionType(sourceCandidate.connectionType) ??
          canonicalizeConnectionType(targetCandidate.connectionType) ??
          'GRE';

        const combinedStatus = (() => {
          const sourceStatus = normalizeDiscoveredStatus(sourceCandidate.status);
          const targetStatus = normalizeDiscoveredStatus(targetCandidate.status);

          if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
            return 'maintenance';
          }

          if (sourceStatus === 'up' && targetStatus === 'up') {
            return 'up';
          }

          return 'down';
        })();

        const latencyMs = combineLatency(sourceCandidate.latencyMs, targetCandidate.latencyMs);
        const packetLoss = combinePacketLoss(sourceCandidate.packetLoss, targetCandidate.packetLoss);

        const timestamp = new Date().toISOString();
        nextId += 1;

        const groupId =
          Number.isInteger(sourceDevice.groupId) && sourceDevice.groupId === targetDevice.groupId
            ? sourceDevice.groupId
            : null;

        const name = deriveDiscoveredTunnelName(
          sourceDevice,
          targetDevice,
          sourceCandidate,
          targetCandidate
        );

        const metrics = sanitizeTunnelMetrics({
          latencyMs,
          packetLoss,
          lastCheckedAt: null
        });

        const notes = buildDiscoveryNotes(
          sourceDevice,
          targetDevice,
          sourceCandidate,
          targetCandidate
        );

        const record = {
          id: nextId,
          name,
          groupId,
          sourceId: sourceCandidate.deviceId,
          targetId: targetCandidate.deviceId,
          connectionType,
          status: combinedStatus,
          enabled: false,
          tags: ['discovered'],
          notes,
          metrics,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        state.tunnels.push(record);
        added.push(record);
        registerPair(existingDiscoveredPairs, candidate.deviceId, peer.deviceId, candidate.localAddress, peer.localAddress);
        createdPairs.add(addressKey);
        mutated = true;
      }
    }
  }

  if (mutated) {
    state.lastTunnelId = nextId;
  }

  return { mutated, added };
};

const sanitizeTunnelMetrics = (metrics = {}) => ({
  latencyMs: parseOptionalNumber(metrics.latencyMs, { min: 0, max: 1_000_000 }),
  packetLoss: parseOptionalNumber(metrics.packetLoss, { min: 0, max: 100 }),
  lastCheckedAt: normalizeIsoDate(metrics.lastCheckedAt)
});

const parseOptionalInteger = (value, { min, max }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (typeof min === 'number' && parsed < min) {
    return min;
  }

  if (typeof max === 'number' && parsed > max) {
    return max;
  }

  return parsed;
};

const allowedTunnelKinds = new Set([
  'ipip',
  'ipipv6',
  'eoip',
  'eoipv6',
  'gre',
  'grev6',
  '6to4',
  '6to4-over-ipip',
  '6to4-over-gre',
  '6to4-over-eoip'
]);

const defaultProbeTargets = () => [
  { address: '4.2.2.4', description: 'Level 3 DNS', enabled: true },
  { address: '8.8.8.8', description: 'Google DNS', enabled: true },
  { address: '1.1.1.1', description: 'Cloudflare DNS', enabled: true }
];

const defaultEndpointSnapshot = () => ({
  identity: '',
  interfaces: [],
  routingTable: []
});

const defaultTunnelProfile = () => ({
  kind: 'gre',
  ipVersion: 'ipv4',
  allowFastPath: true,
  secret: '',
  secretEnabled: true,
  secretLastGeneratedAt: null,
  keepAlive: {
    enabled: true,
    timeout: 10,
    retryCount: 3,
    holdTimer: 10
  },
  tunnelId: null,
  mtu: null,
  addressing: {
    localAddress: '',
    remoteAddress: '',
    localTunnelIp: '',
    remoteTunnelIp: '',
    localIpamPool: '',
    remoteIpamPool: ''
  },
  provisioning: {
    viaApi: true,
    viaSsh: true,
    preferred: 'hybrid'
  },
  failover: {
    disableSecretOnFailure: true,
    candidateKinds: ['gre', 'ipip', 'eoip', '6to4'],
    maxAttempts: 3
  },
  endpoints: {
    source: defaultEndpointSnapshot(),
    target: defaultEndpointSnapshot()
  },
  remarks: ''
});

const defaultTunnelMonitoring = () => ({
  pingTargets: defaultProbeTargets(),
  traceTargets: defaultProbeTargets(),
  lastPingResults: [],
  lastTraceResults: [],
  lastUpdatedAt: null
});

const defaultTunnelOspf = () => ({
  enabled: false,
  instance: {
    name: '',
    routerId: '',
    version: 'v2',
    areaId: '0.0.0.0',
    redistributeDefaultRoute: false,
    metric: null,
    referenceBandwidth: null
  },
  interfaceTemplates: [],
  areas: [],
  neighbors: []
});

const defaultVpnPeerConfig = () => ({
  enabled: false,
  interface: '',
  profile: '',
  serverAddress: '',
  listenPort: null,
  username: '',
  password: '',
  comment: '',
  mtu: null,
  mru: null,
  allowFastPath: true,
  certificate: '',
  publicKey: '',
  privateKey: '',
  presharedKey: '',
  allowedAddresses: '',
  endpoint: '',
  persistentKeepalive: null,
  secret: ''
});

const defaultVpnProfiles = () => ({
  pptp: { server: defaultVpnPeerConfig(), client: defaultVpnPeerConfig() },
  l2tp: { server: defaultVpnPeerConfig(), client: defaultVpnPeerConfig() },
  openvpn: { server: defaultVpnPeerConfig(), client: defaultVpnPeerConfig() },
  wireguard: { server: defaultVpnPeerConfig(), client: defaultVpnPeerConfig() }
});

const sanitizeInterfaceInventory = (interfaces = []) => {
  if (!Array.isArray(interfaces)) {
    return [];
  }

  const seen = new Set();

  return interfaces
    .map((entry) => {
      const name = normalizeOptionalText(entry.name ?? '');
      if (!name) {
        return null;
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        name,
        type: normalizeOptionalText(entry.type ?? ''),
        macAddress: normalizeOptionalText(entry.macAddress ?? ''),
        arp: normalizeOptionalText(entry.arp ?? '').toLowerCase(),
        mtu: parseOptionalInteger(entry.mtu, { min: 64, max: 10000 }),
        comment: normalizeOptionalText(entry.comment ?? '')
      };
    })
    .filter(Boolean);
};

const sanitizeRoutingTable = (routes = []) => {
  if (!Array.isArray(routes)) {
    return [];
  }

  const seen = new Set();

  return routes
    .map((route) => {
      const destination = normalizeOptionalText(route.destination ?? route.dstAddress ?? '');
      const gateway = normalizeOptionalText(route.gateway ?? route.nextHop ?? '');

      if (!destination) {
        return null;
      }

      const key = `${destination.toLowerCase()}|${gateway.toLowerCase()}`;
      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        destination,
        gateway,
        interface: normalizeOptionalText(route.interface ?? ''),
        distance: parseOptionalInteger(route.distance, { min: 1, max: 255 }),
        comment: normalizeOptionalText(route.comment ?? ''),
        active: normalizeBoolean(route.active, true)
      };
    })
    .filter(Boolean);
};

const sanitizeEndpointSnapshot = (snapshot = {}, baseline = defaultEndpointSnapshot()) => {
  const normalized = { ...defaultEndpointSnapshot(), ...baseline };

  if (snapshot.identity !== undefined) {
    normalized.identity = normalizeOptionalText(snapshot.identity);
  }

  if (snapshot.interfaces !== undefined) {
    normalized.interfaces = sanitizeInterfaceInventory(snapshot.interfaces);
  }

  if (snapshot.routingTable !== undefined) {
    normalized.routingTable = sanitizeRoutingTable(snapshot.routingTable);
  }

  return normalized;
};

const sanitizeProbeTargets = (targets, fallback) => {
  if (!Array.isArray(targets)) {
    return fallback ? [...fallback] : [];
  }

  const seen = new Set();

  const result = targets
    .map((target) => {
      const address = normalizeOptionalText(target?.address ?? target ?? '');
      if (!address) {
        return null;
      }

      const key = address.toLowerCase();
      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        address,
        description: normalizeOptionalText(target.description ?? ''),
        enabled: normalizeBoolean(target.enabled, true)
      };
    })
    .filter(Boolean);

  if (result.length === 0 && fallback) {
    return [...fallback];
  }

  return result;
};

const sanitizeProbeResults = (results = []) => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((entry) => {
      const address = normalizeOptionalText(entry.address ?? '');
      if (!address) {
        return null;
      }

      return {
        address,
        success: normalizeBoolean(entry.success, false),
        latencyMs: parseOptionalNumber(entry.latencyMs, { min: 0, max: 1_000_000 }),
        output: normalizeOptionalText(entry.output ?? ''),
        checkedAt: normalizeIsoDate(entry.checkedAt ?? new Date().toISOString())
      };
    })
    .filter(Boolean);
};

const sanitizeTraceResults = (results = []) => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((entry) => {
      const address = normalizeOptionalText(entry.address ?? '');
      if (!address) {
        return null;
      }

      return {
        address,
        success: normalizeBoolean(entry.success, false),
        hops: Array.isArray(entry.hops)
          ? entry.hops.map((hop) => ({
              hop: parseOptionalInteger(hop.hop ?? hop.index, { min: 1, max: 512 }),
              address: normalizeOptionalText(hop.address ?? ''),
              latencyMs: parseOptionalNumber(hop.latencyMs, { min: 0, max: 1_000_000 })
            }))
          : [],
        output: normalizeOptionalText(entry.output ?? ''),
        checkedAt: normalizeIsoDate(entry.checkedAt ?? new Date().toISOString())
      };
    })
    .filter(Boolean);
};

const sanitizeTunnelMonitoring = (monitoring = {}, baseline = defaultTunnelMonitoring()) => {
  const normalized = { ...defaultTunnelMonitoring(), ...baseline };

  if (monitoring.pingTargets !== undefined) {
    normalized.pingTargets = sanitizeProbeTargets(monitoring.pingTargets, defaultProbeTargets());
  }

  if (monitoring.traceTargets !== undefined) {
    normalized.traceTargets = sanitizeProbeTargets(monitoring.traceTargets, defaultProbeTargets());
  }

  if (monitoring.lastPingResults !== undefined) {
    normalized.lastPingResults = sanitizeProbeResults(monitoring.lastPingResults);
  }

  if (monitoring.lastTraceResults !== undefined) {
    normalized.lastTraceResults = sanitizeTraceResults(monitoring.lastTraceResults);
  }

  if (monitoring.lastUpdatedAt !== undefined) {
    normalized.lastUpdatedAt = normalizeIsoDate(monitoring.lastUpdatedAt);
  }

  return normalized;
};

const sanitizeOspfInstance = (instance = {}, baseline = defaultTunnelOspf().instance) => {
  const normalized = { ...baseline };

  if (instance.name !== undefined) {
    normalized.name = normalizeOptionalText(instance.name);
  }

  if (instance.routerId !== undefined) {
    normalized.routerId = normalizeOptionalText(instance.routerId);
  }

  if (instance.version !== undefined) {
    const version = normalizeOptionalText(instance.version ?? '').toLowerCase();
    normalized.version = version === 'v3' ? 'v3' : 'v2';
  }

  if (instance.areaId !== undefined || instance.area !== undefined) {
    normalized.areaId = normalizeOptionalText(instance.areaId ?? instance.area ?? '0.0.0.0') || '0.0.0.0';
  }

  if (instance.redistributeDefaultRoute !== undefined) {
    normalized.redistributeDefaultRoute = normalizeBoolean(instance.redistributeDefaultRoute, false);
  }

  if (instance.metric !== undefined) {
    normalized.metric = parseOptionalNumber(instance.metric, { min: 0, max: 1_000_000 });
  }

  if (instance.referenceBandwidth !== undefined) {
    normalized.referenceBandwidth = parseOptionalNumber(instance.referenceBandwidth, {
      min: 1,
      max: 1_000_000
    });
  }

  return normalized;
};

const sanitizeOspfInterfaceTemplates = (templates = []) => {
  if (!Array.isArray(templates)) {
    return [];
  }

  return templates
    .map((template, index) => {
      const name = normalizeOptionalText(template.name ?? `template-${index + 1}`);
      const network = normalizeOptionalText(template.network ?? template.address ?? '');

      if (!network) {
        return null;
      }

      return {
        name,
        network,
        cost: parseOptionalInteger(template.cost, { min: 1, max: 65535 }),
        priority: parseOptionalInteger(template.priority, { min: 0, max: 255 }),
        passive: normalizeBoolean(template.passive, false),
        comment: normalizeOptionalText(template.comment ?? '')
      };
    })
    .filter(Boolean);
};

const sanitizeOspfAreas = (areas = []) => {
  if (!Array.isArray(areas)) {
    return [];
  }

  const seen = new Set();

  return areas
    .map((area, index) => {
      const name = normalizeOptionalText(area.name ?? `area-${index + 1}`);
      const areaId = normalizeOptionalText(area.areaId ?? area.id ?? '');

      if (!areaId) {
        return null;
      }

      const key = areaId.toLowerCase();
      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        name,
        areaId,
        type: normalizeOptionalText(area.type ?? '').toLowerCase(),
        authentication: normalizeOptionalText(area.authentication ?? ''),
        comment: normalizeOptionalText(area.comment ?? '')
      };
    })
    .filter(Boolean);
};

const sanitizeOspfNeighbors = (neighbors = []) => {
  if (!Array.isArray(neighbors)) {
    return [];
  }

  const seen = new Set();

  return neighbors
    .map((neighbor, index) => {
      const address = normalizeOptionalText(neighbor.address ?? neighbor.ip ?? '');
      if (!address) {
        return null;
      }

      const key = address.toLowerCase();
      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        name: normalizeOptionalText(neighbor.name ?? `neighbor-${index + 1}`),
        address,
        interface: normalizeOptionalText(neighbor.interface ?? ''),
        priority: parseOptionalInteger(neighbor.priority, { min: 0, max: 255 }),
        pollInterval: parseOptionalInteger(neighbor.pollInterval, { min: 1, max: 600 }),
        state: normalizeOptionalText(neighbor.state ?? ''),
        comment: normalizeOptionalText(neighbor.comment ?? '')
      };
    })
    .filter(Boolean);
};

const sanitizeTunnelOspf = (ospf = {}, baseline = defaultTunnelOspf()) => {
  const normalized = {
    ...defaultTunnelOspf(),
    ...baseline,
    instance: sanitizeOspfInstance({}, baseline.instance ?? defaultTunnelOspf().instance)
  };

  if (ospf.enabled !== undefined) {
    normalized.enabled = normalizeBoolean(ospf.enabled, false);
  }

  normalized.instance = sanitizeOspfInstance(ospf.instance ?? {}, normalized.instance);

  if (ospf.interfaceTemplates !== undefined) {
    normalized.interfaceTemplates = sanitizeOspfInterfaceTemplates(ospf.interfaceTemplates);
  }

  if (ospf.areas !== undefined) {
    normalized.areas = sanitizeOspfAreas(ospf.areas);
  }

  if (ospf.neighbors !== undefined) {
    normalized.neighbors = sanitizeOspfNeighbors(ospf.neighbors);
  }

  return normalized;
};

const sanitizeVpnPeer = (peer = {}, baseline = defaultVpnPeerConfig()) => {
  const normalized = { ...baseline };

  if (peer.enabled !== undefined) {
    normalized.enabled = normalizeBoolean(peer.enabled, false);
  }

  if (peer.interface !== undefined) {
    normalized.interface = normalizeOptionalText(peer.interface);
  }

  if (peer.profile !== undefined) {
    normalized.profile = normalizeOptionalText(peer.profile);
  }

  if (peer.serverAddress !== undefined) {
    normalized.serverAddress = normalizeOptionalText(peer.serverAddress ?? peer.server ?? '');
  }

  if (peer.listenPort !== undefined) {
    normalized.listenPort = parseOptionalInteger(peer.listenPort, { min: 1, max: 65535 });
  }

  if (peer.username !== undefined) {
    normalized.username = normalizeOptionalText(peer.username);
  }

  if (peer.password !== undefined) {
    normalized.password = normalizeOptionalText(peer.password);
  }

  if (peer.comment !== undefined) {
    normalized.comment = normalizeOptionalText(peer.comment);
  }

  if (peer.mtu !== undefined) {
    normalized.mtu = parseOptionalInteger(peer.mtu, { min: 64, max: 10000 });
  }

  if (peer.mru !== undefined) {
    normalized.mru = parseOptionalInteger(peer.mru, { min: 64, max: 10000 });
  }

  if (peer.allowFastPath !== undefined) {
    normalized.allowFastPath = normalizeBoolean(peer.allowFastPath, true);
  }

  if (peer.certificate !== undefined) {
    normalized.certificate = normalizeOptionalText(peer.certificate);
  }

  if (peer.publicKey !== undefined) {
    normalized.publicKey = normalizeOptionalText(peer.publicKey);
  }

  if (peer.privateKey !== undefined) {
    normalized.privateKey = normalizeOptionalText(peer.privateKey);
  }

  if (peer.presharedKey !== undefined) {
    normalized.presharedKey = normalizeOptionalText(peer.presharedKey);
  }

  if (peer.allowedAddresses !== undefined) {
    normalized.allowedAddresses = normalizeOptionalText(peer.allowedAddresses);
  }

  if (peer.endpoint !== undefined) {
    normalized.endpoint = normalizeOptionalText(peer.endpoint);
  }

  if (peer.persistentKeepalive !== undefined) {
    normalized.persistentKeepalive = parseOptionalInteger(peer.persistentKeepalive, {
      min: 1,
      max: 600
    });
  }

  if (peer.secret !== undefined) {
    normalized.secret = normalizeOptionalText(peer.secret);
  }

  return normalized;
};

const sanitizeVpnProfiles = (profiles = {}, baseline = defaultVpnProfiles()) => {
  const normalizedBaseline = defaultVpnProfiles();
  const normalized = {
    pptp: {
      server: sanitizeVpnPeer({}, baseline.pptp?.server ?? normalizedBaseline.pptp.server),
      client: sanitizeVpnPeer({}, baseline.pptp?.client ?? normalizedBaseline.pptp.client)
    },
    l2tp: {
      server: sanitizeVpnPeer({}, baseline.l2tp?.server ?? normalizedBaseline.l2tp.server),
      client: sanitizeVpnPeer({}, baseline.l2tp?.client ?? normalizedBaseline.l2tp.client)
    },
    openvpn: {
      server: sanitizeVpnPeer({}, baseline.openvpn?.server ?? normalizedBaseline.openvpn.server),
      client: sanitizeVpnPeer({}, baseline.openvpn?.client ?? normalizedBaseline.openvpn.client)
    },
    wireguard: {
      server: sanitizeVpnPeer({}, baseline.wireguard?.server ?? normalizedBaseline.wireguard.server),
      client: sanitizeVpnPeer({}, baseline.wireguard?.client ?? normalizedBaseline.wireguard.client)
    }
  };

  if (profiles.pptp !== undefined) {
    normalized.pptp = {
      server: sanitizeVpnPeer(profiles.pptp?.server ?? {}, normalized.pptp.server),
      client: sanitizeVpnPeer(profiles.pptp?.client ?? {}, normalized.pptp.client)
    };
  }

  if (profiles.l2tp !== undefined) {
    normalized.l2tp = {
      server: sanitizeVpnPeer(profiles.l2tp?.server ?? {}, normalized.l2tp.server),
      client: sanitizeVpnPeer(profiles.l2tp?.client ?? {}, normalized.l2tp.client)
    };
  }

  if (profiles.openvpn !== undefined) {
    normalized.openvpn = {
      server: sanitizeVpnPeer(profiles.openvpn?.server ?? {}, normalized.openvpn.server),
      client: sanitizeVpnPeer(profiles.openvpn?.client ?? {}, normalized.openvpn.client)
    };
  }

  if (profiles.wireguard !== undefined) {
    normalized.wireguard = {
      server: sanitizeVpnPeer(profiles.wireguard?.server ?? {}, normalized.wireguard.server),
      client: sanitizeVpnPeer(profiles.wireguard?.client ?? {}, normalized.wireguard.client)
    };
  }

  return normalized;
};

const sanitizeTunnelProfile = (profile = {}, baseline = defaultTunnelProfile()) => {
  const normalized = { ...defaultTunnelProfile(), ...baseline };

  const rawKind = profile.kind ?? profile.connectionType ?? normalized.kind;
  const candidateKind = normalizeOptionalText(rawKind ?? '').toLowerCase();
  if (allowedTunnelKinds.has(candidateKind)) {
    normalized.kind = candidateKind;
  } else if (!allowedTunnelKinds.has(normalized.kind)) {
    normalized.kind = 'gre';
  }

  if (profile.ipVersion !== undefined) {
    const candidate = normalizeOptionalText(profile.ipVersion ?? '').toLowerCase();
    normalized.ipVersion = candidate === 'ipv6' ? 'ipv6' : 'ipv4';
  } else if (normalized.kind.includes('v6')) {
    normalized.ipVersion = 'ipv6';
  }

  if (profile.allowFastPath !== undefined) {
    normalized.allowFastPath = normalizeBoolean(profile.allowFastPath, true);
  }

  if (profile.secret !== undefined) {
    normalized.secret = normalizeOptionalText(profile.secret);
  }

  if (profile.secretEnabled !== undefined) {
    normalized.secretEnabled = normalizeBoolean(profile.secretEnabled, normalized.secretEnabled);
  } else if (!normalized.secret) {
    normalized.secretEnabled = false;
  }

  if (profile.secretLastGeneratedAt !== undefined) {
    normalized.secretLastGeneratedAt = normalizeIsoDate(profile.secretLastGeneratedAt);
  }

  const keepAliveBaseline = {
    ...defaultTunnelProfile().keepAlive,
    ...(normalized.keepAlive ?? {})
  };
  const keepAliveInput = profile.keepAlive ?? {};
  const keepAlive = { ...keepAliveBaseline };

  if (keepAliveInput.enabled !== undefined) {
    keepAlive.enabled = normalizeBoolean(keepAliveInput.enabled, keepAlive.enabled);
  }

  if (keepAliveInput.timeout !== undefined) {
    keepAlive.timeout = clampNumber(keepAliveInput.timeout, {
      min: 1,
      max: 600,
      fallback: keepAlive.timeout
    });
  }

  if (keepAliveInput.retryCount !== undefined) {
    keepAlive.retryCount = clampNumber(keepAliveInput.retryCount, {
      min: 0,
      max: 20,
      fallback: keepAlive.retryCount
    });
  }

  if (keepAliveInput.holdTimer !== undefined) {
    keepAlive.holdTimer = clampNumber(keepAliveInput.holdTimer, {
      min: 1,
      max: 600,
      fallback: keepAlive.holdTimer
    });
  }

  normalized.keepAlive = keepAlive;

  if (profile.tunnelId !== undefined) {
    normalized.tunnelId = parseOptionalInteger(profile.tunnelId, { min: 1, max: 4_294_967_295 });
  }

  if (profile.mtu !== undefined) {
    normalized.mtu = parseOptionalInteger(profile.mtu, { min: 296, max: 9_000 });
  }

  const addressingBaseline = {
    ...defaultTunnelProfile().addressing,
    ...(normalized.addressing ?? {})
  };
  const addressingInput = profile.addressing ?? profile;
  const addressing = { ...addressingBaseline };

  if (addressingInput.localAddress !== undefined) {
    addressing.localAddress = normalizeOptionalText(addressingInput.localAddress);
  }

  if (addressingInput.remoteAddress !== undefined) {
    addressing.remoteAddress = normalizeOptionalText(addressingInput.remoteAddress);
  }

  if (addressingInput.localTunnelIp !== undefined) {
    addressing.localTunnelIp = normalizeOptionalText(addressingInput.localTunnelIp);
  }

  if (addressingInput.remoteTunnelIp !== undefined) {
    addressing.remoteTunnelIp = normalizeOptionalText(addressingInput.remoteTunnelIp);
  }

  if (addressingInput.localIpamPool !== undefined) {
    addressing.localIpamPool = normalizeOptionalText(addressingInput.localIpamPool);
  }

  if (addressingInput.remoteIpamPool !== undefined) {
    addressing.remoteIpamPool = normalizeOptionalText(addressingInput.remoteIpamPool);
  }

  normalized.firmwareVersion = normalizeOptionalText(
    options.firmwareVersion ?? baseline.firmwareVersion ?? ''
  );

  const sshPortFallback = clampNumber(baseline.sshPort, { min: 1, max: 65535, fallback: 22 });
  normalized.sshEnabled = normalizeBoolean(options.sshEnabled, baseline.sshEnabled);
  normalized.sshPort = clampNumber(options.sshPort, { min: 1, max: 65535, fallback: sshPortFallback });
  normalized.sshUsername = normalizeOptionalText(options.sshUsername ?? baseline.sshUsername ?? '');
  normalized.sshPassword = normalizeOptionalText(options.sshPassword ?? baseline.sshPassword ?? '');
  normalized.sshAcceptNewHostKeys = normalizeBoolean(
    options.sshAcceptNewHostKeys ?? options.sshAcceptUnknownHost,
    baseline.sshAcceptNewHostKeys
  );

  if (!normalized.sshEnabled) {
    normalized.sshPort = clampNumber(22, { min: 1, max: 65535, fallback: 22 });
  }

  return normalized;
};

  const provisioningBaseline = {
    ...defaultTunnelProfile().provisioning,
    ...(normalized.provisioning ?? {})
  };
  const provisioningInput = profile.provisioning ?? {};
  const provisioning = { ...provisioningBaseline };

  if (provisioningInput.viaApi !== undefined) {
    provisioning.viaApi = normalizeBoolean(provisioningInput.viaApi, provisioning.viaApi);
  }

  if (provisioningInput.viaSsh !== undefined) {
    provisioning.viaSsh = normalizeBoolean(provisioningInput.viaSsh, provisioning.viaSsh);
  }

  if (provisioningInput.preferred !== undefined) {
    const preferred = normalizeOptionalText(provisioningInput.preferred ?? '').toLowerCase();
    provisioning.preferred = ['api', 'ssh', 'hybrid'].includes(preferred)
      ? preferred
      : provisioning.viaApi && provisioning.viaSsh
      ? 'hybrid'
      : provisioning.viaApi
      ? 'api'
      : provisioning.viaSsh
      ? 'ssh'
      : 'api';
  } else if (!['api', 'ssh', 'hybrid'].includes(provisioning.preferred)) {
    provisioning.preferred = provisioning.viaApi && provisioning.viaSsh ? 'hybrid' : provisioning.viaApi ? 'api' : 'ssh';
  }

  normalized.provisioning = provisioning;

  const failoverBaseline = {
    ...defaultTunnelProfile().failover,
    ...(normalized.failover ?? {})
  };
  const failoverInput = profile.failover ?? {};
  const failover = { ...failoverBaseline };

  if (failoverInput.disableSecretOnFailure !== undefined) {
    failover.disableSecretOnFailure = normalizeBoolean(failoverInput.disableSecretOnFailure, true);
  }

  if (failoverInput.candidateKinds !== undefined) {
    const candidates = Array.isArray(failoverInput.candidateKinds)
      ? failoverInput.candidateKinds
          .map((entry) => normalizeOptionalText(entry).toLowerCase())
          .filter((entry) => allowedTunnelKinds.has(entry))
      : [];
    failover.candidateKinds = candidates.length > 0 ? candidates : failover.candidateKinds;
  }

  if (failoverInput.maxAttempts !== undefined) {
    failover.maxAttempts = clampNumber(failoverInput.maxAttempts, {
      min: 1,
      max: 10,
      fallback: failover.maxAttempts
    });
  }

  normalized.failover = failover;

  const endpointsBaseline = {
    source: sanitizeEndpointSnapshot({}, normalized.endpoints?.source ?? defaultEndpointSnapshot()),
    target: sanitizeEndpointSnapshot({}, normalized.endpoints?.target ?? defaultEndpointSnapshot())
  };

  const endpointsInput = profile.endpoints ?? {};
  normalized.endpoints = {
    source: sanitizeEndpointSnapshot(endpointsInput.source ?? {}, endpointsBaseline.source),
    target: sanitizeEndpointSnapshot(endpointsInput.target ?? {}, endpointsBaseline.target)
  };

  if (profile.remarks !== undefined) {
    normalized.remarks = normalizeOptionalText(profile.remarks);
  }

  return normalized;
};

const sanitizeTunnelMetrics = (metrics = {}) => ({
  latencyMs: parseOptionalNumber(metrics.latencyMs, { min: 0, max: 1_000_000 }),
  packetLoss: parseOptionalNumber(metrics.packetLoss, { min: 0, max: 100 }),
  lastCheckedAt: normalizeIsoDate(metrics.lastCheckedAt)
});

const discoveryNotePattern = /\[discovery\]\s+local=([^\s]+)\s+remote=([^\s]+)/i;

const collectNormalizedIpAddresses = (value) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    const nested = value.flatMap((entry) => collectNormalizedIpAddresses(entry));
    return [...new Set(nested.filter(Boolean))];
  }

  if (typeof value === 'object') {
    const nested = Object.values(value).flatMap((entry) => collectNormalizedIpAddresses(entry));
    return [...new Set(nested.filter(Boolean))];
  }

  const tokens = String(value)
    .replace(/^[\[\(]+|[\]\)]+$/g, '')
    .split(/[,;]/)
    .flatMap((segment) => segment.split(/\s+/))
    .map((segment) => segment.trim())
    .filter(Boolean);

  const addresses = tokens
    .map((segment) => {
      const withoutPrefix = segment.includes('=') ? segment.split('=').pop() : segment;
      const slashIndex = withoutPrefix.indexOf('/');
      const base = slashIndex >= 0 ? withoutPrefix.slice(0, slashIndex) : withoutPrefix;
      const scopeIndex = base.indexOf('%');
      const candidate = scopeIndex >= 0 ? base.slice(0, scopeIndex) : base;
      return candidate && isIP(candidate) ? candidate : null;
    })
    .filter(Boolean);

  return [...new Set(addresses)];
};

const normalizeIpAddress = (value) => {
  const [address] = collectNormalizedIpAddresses(value);
  return address ?? null;
};

const pickField = (entry, keys) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
      return entry[key];
    }
  }

  return null;
};

const canonicalizeConnectionType = (value) => {
  const text = normalizeOptionalText(value ?? '');
  if (!text) {
    return null;
  }

  if (/wire\s*guard/i.test(text) || /^wg$/i.test(text)) {
    return 'WireGuard';
  }
  if (/ipsec/i.test(text)) {
    return 'IPsec';
  }
  if (/gre/i.test(text)) {
    return 'GRE';
  }
  if (/l2tp/i.test(text)) {
    return 'L2TP';
  }
  if (/pptp/i.test(text)) {
    return 'PPTP';
  }

  return text.toUpperCase();
};

const normalizeDiscoveredStatus = (value) => {
  const text = normalizeOptionalText(value ?? '').toLowerCase();

  if (allowedTunnelStates.has(text)) {
    return text;
  }

  if (['connected', 'running', 'established', 'active', 'up'].includes(text)) {
    return 'up';
  }

  if (['maintenance', 'pending', 'syncing'].includes(text)) {
    return 'maintenance';
  }

  if (['disabled', 'inactive', 'error', 'failed', 'offline', 'down', 'disconnected'].includes(text)) {
    return 'down';
  }

  return 'down';
};

const parseNumericMetric = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseNumericMetric(entry);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const parsed = parseNumericMetric(entry);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const combineLatency = (a, b) => {
  const values = [a, b].filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const sanitized = values.map((value) => (value < 0 ? 0 : value));
  return Math.min(...sanitized);
};

const combinePacketLoss = (a, b) => {
  const values = [a, b].filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const clamped = values.map((value) => {
    if (value < 0) {
      return 0;
    }
    if (value > 100) {
      return 100;
    }
    return value;
  });

  return Math.max(...clamped);
};

const deriveDiscoveredTunnelName = (sourceDevice, targetDevice, sourceCandidate, targetCandidate) => {
  const sourceName = normalizeOptionalText(sourceDevice?.name ?? '') || `Device ${sourceCandidate.deviceId}`;
  const targetName = normalizeOptionalText(targetDevice?.name ?? '') || `Device ${targetCandidate.deviceId}`;

  const sourceInterface = normalizeOptionalText(sourceCandidate.interfaceName ?? '');
  const targetInterface = normalizeOptionalText(targetCandidate.interfaceName ?? '');

  const interfaceLabel =
    sourceInterface && targetInterface ? ` (${sourceInterface} ↔ ${targetInterface})` : '';

  return `Discovered ${sourceName} ↔ ${targetName}${interfaceLabel}`;
};

const buildDiscoveryNotes = (sourceDevice, targetDevice, sourceCandidate, targetCandidate) => {
  const segments = [
    'Discovered automatically from RouterOS inventory.',
    `[discovery] local=${sourceCandidate.localAddress} remote=${targetCandidate.localAddress}`
  ];

  if (sourceCandidate.interfaceName) {
    segments.push(`source-interface=${sourceCandidate.interfaceName}`);
  }

  if (targetCandidate.interfaceName) {
    segments.push(`target-interface=${targetCandidate.interfaceName}`);
  }

  if (sourceCandidate.remoteDeviceName) {
    segments.push(`source-remote=${sourceCandidate.remoteDeviceName}`);
  }

  if (targetCandidate.remoteDeviceName) {
    segments.push(`target-remote=${targetCandidate.remoteDeviceName}`);
  }

  const unmatchedRemotes = sourceCandidate.remoteAddresses.filter(
    (address) => address !== targetCandidate.localAddress
  );

  if (unmatchedRemotes.length > 0) {
    segments.push(`source-additional-remotes=${unmatchedRemotes.join(',')}`);
  }

  return segments.join(' ');
};

const buildDevicePairKey = (deviceAId, deviceBId, addressA, addressB) => {
  const parsedIds = [deviceAId, deviceBId]
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  if (parsedIds.length !== 2) {
    return null;
  }

  parsedIds.sort((a, b) => a - b);

  if (addressA && addressB) {
    const normalizedA = normalizeIpAddress(addressA);
    const normalizedB = normalizeIpAddress(addressB);

    if (normalizedA && normalizedB) {
      const addresses = [normalizedA, normalizedB].sort();
      return `${parsedIds[0]}|${parsedIds[1]}|${addresses[0]}|${addresses[1]}`;
    }
  }

  return `${parsedIds[0]}|${parsedIds[1]}`;
};

const extractTunnelInventoryCandidates = (device) => {
  if (!device || typeof device !== 'object') {
    return [];
  }

  const entries = [];

  const enqueue = (collection) => {
    if (!collection) {
      return;
    }

    if (Array.isArray(collection)) {
      collection.forEach((item) => {
        if (item && typeof item === 'object') {
          entries.push(item);
        }
      });
      return;
    }

    if (typeof collection === 'object') {
      Object.values(collection).forEach((value) => enqueue(value));
    }
  };

  enqueue(device.status?.inventory?.tunnels);
  enqueue(device.status?.inventory?.interfaces);
  enqueue(device.status?.inventory?.peers);
  enqueue(device.status?.inventory?.ipsec);
  enqueue(device.status?.inventory?.wireguard);
  enqueue(device.status?.tunnels);
  enqueue(device.routeros?.tunnels);
  enqueue(device.routeros?.peers);
  enqueue(device.tunnels);

  const candidates = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const localSource =
      pickField(entry, ['localAddress', 'local', 'localIp', 'local_ip', 'address', 'cidr', 'localCidr']) ??
      pickField(entry.local ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.interface ?? {}, ['address', 'ip', 'ipAddress', 'cidr']);

    const remoteSource =
      pickField(entry, [
        'remoteAddress',
        'remote',
        'remoteIp',
        'remote_ip',
        'peerAddress',
        'endpointAddress',
        'remoteCidr',
        'peer',
        'remotePeer'
      ]) ??
      pickField(entry.remote ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.peer ?? {}, ['address', 'ip', 'ipAddress', 'cidr']) ??
      pickField(entry.endpoint ?? {}, ['address', 'ip', 'ipAddress', 'cidr']);

    const localAddresses = collectNormalizedIpAddresses(localSource);
    const remoteAddresses = collectNormalizedIpAddresses(remoteSource);

    if (!localAddresses.length || !remoteAddresses.length) {
      return;
    }

    const interfaceName =
      pickField(entry, ['interface', 'name', 'iface', 'identity', 'id']) ??
      pickField(entry.interface ?? {}, ['name', 'id']) ??
      pickField(entry.peer ?? {}, ['interface', 'name']);

    const remoteDeviceName =
      pickField(entry, ['remoteName', 'remoteIdentity', 'peerName', 'peerIdentity', 'remoteDevice']) ??
      pickField(entry.remote ?? {}, ['name', 'identity']) ??
      pickField(entry.peer ?? {}, ['name', 'identity']);

    const connectionType =
      canonicalizeConnectionType(
        pickField(entry, ['connectionType', 'tunnelType', 'type', 'kind', 'mode', 'profile']) ??
          pickField(entry.profile ?? {}, ['type', 'name'])
      ) ?? null;

    const status = normalizeDiscoveredStatus(
      pickField(entry, ['status', 'state', 'operStatus', 'operState', 'running', 'enabled']) ??
        pickField(entry.interface ?? {}, ['status', 'state'])
    );

    const latencyMs = parseNumericMetric(
      pickField(entry, ['latencyMs', 'latency', 'avgLatency', 'averageLatency', 'latestLatency'])
    );

    const packetLoss = parseNumericMetric(
      pickField(entry, ['packetLoss', 'loss', 'packetLossPercent', 'lossPercent'])
    );

    const uniqueRemoteAddresses = [...new Set(remoteAddresses.filter(Boolean))];

    localAddresses.forEach((localAddress) => {
      const filteredRemotes = uniqueRemoteAddresses.filter((remote) => remote && remote !== localAddress);
      if (!filteredRemotes.length) {
        return;
      }

      candidates.push({
        deviceId: device.id,
        deviceName: device.name ?? `Device ${device.id}`,
        deviceGroupId: Number.isInteger(device.groupId) ? device.groupId : null,
        interfaceName: interfaceName ? String(interfaceName) : null,
        connectionType,
        status,
        localAddress,
        remoteAddresses: filteredRemotes,
        latencyMs,
        packetLoss,
        remoteDeviceName: remoteDeviceName ? String(remoteDeviceName) : null
      });
    });
  });

  return candidates;
};

const runTunnelDiscovery = (state) => {
  if (!state || !Array.isArray(state.mikrotiks) || state.mikrotiks.length === 0) {
    return { mutated: false, added: [] };
  }

  const deviceLookup = new Map();
  state.mikrotiks.forEach((device) => {
    if (Number.isInteger(device.id)) {
      deviceLookup.set(device.id, device);
    }
  });

  if (deviceLookup.size === 0) {
    return { mutated: false, added: [] };
  }

  const candidates = [];
  deviceLookup.forEach((device) => {
    extractTunnelInventoryCandidates(device).forEach((candidate) => {
      if (candidate.localAddress && Array.isArray(candidate.remoteAddresses) && candidate.remoteAddresses.length > 0) {
        candidates.push(candidate);
      }
    });
  });

  if (!candidates.length) {
    return { mutated: false, added: [] };
  }

  const localIndex = new Map();
  candidates.forEach((candidate) => {
    const list = localIndex.get(candidate.localAddress) ?? [];
    list.push(candidate);
    localIndex.set(candidate.localAddress, list);
  });

  const existingManualPairs = new Set();
  const existingDiscoveredPairs = new Set();

  state.tunnels.forEach((tunnel) => {
    const sourceId = Number.parseInt(tunnel.sourceId, 10);
    const targetId = Number.parseInt(tunnel.targetId, 10);

    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) {
      return;
    }

    const baseKey = buildDevicePairKey(sourceId, targetId);
    if (!baseKey) {
      return;
    }

    const tags = Array.isArray(tunnel.tags)
      ? tunnel.tags.map((tag) => normalizeOptionalText(tag).toLowerCase())
      : [];

    if (tags.includes('discovered')) {
      const match = discoveryNotePattern.exec(tunnel.notes ?? '');
      if (match) {
        const addressKey = buildDevicePairKey(sourceId, targetId, match[1], match[2]);
        if (addressKey) {
          existingDiscoveredPairs.add(addressKey);
          return;
        }
      }

      existingDiscoveredPairs.add(baseKey);
      return;
    }

    existingManualPairs.add(baseKey);
  });

  const createdPairs = new Set();
  const added = [];
  let mutated = false;
  let nextId = Number.isInteger(state.lastTunnelId) ? state.lastTunnelId : 0;

  const registerPair = (set, deviceAId, deviceBId, addressA, addressB) => {
    const key = buildDevicePairKey(deviceAId, deviceBId, addressA, addressB);
    if (key) {
      set.add(key);
    }
  };

  for (const candidate of candidates) {
    for (const remoteAddress of candidate.remoteAddresses) {
      const peers = localIndex.get(remoteAddress);
      if (!peers) {
        continue;
      }

      for (const peer of peers) {
        if (peer.deviceId === candidate.deviceId) {
          continue;
        }

        const baseKey = buildDevicePairKey(candidate.deviceId, peer.deviceId);
        if (!baseKey) {
          continue;
        }

        if (existingManualPairs.has(baseKey)) {
          continue;
        }

        const addressKey = buildDevicePairKey(
          candidate.deviceId,
          peer.deviceId,
          candidate.localAddress,
          peer.localAddress
        );

        if (!addressKey) {
          continue;
        }

        if (existingDiscoveredPairs.has(addressKey) || createdPairs.has(addressKey)) {
          continue;
        }

        const [sourceCandidate, targetCandidate] =
          candidate.deviceId < peer.deviceId ? [candidate, peer] : [peer, candidate];

        const sourceDevice = deviceLookup.get(sourceCandidate.deviceId);
        const targetDevice = deviceLookup.get(targetCandidate.deviceId);

        if (!sourceDevice || !targetDevice) {
          continue;
        }

        const connectionType =
          canonicalizeConnectionType(sourceCandidate.connectionType) ??
          canonicalizeConnectionType(targetCandidate.connectionType) ??
          'GRE';

        const combinedStatus = (() => {
          const sourceStatus = normalizeDiscoveredStatus(sourceCandidate.status);
          const targetStatus = normalizeDiscoveredStatus(targetCandidate.status);

          if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
            return 'maintenance';
          }

          if (sourceStatus === 'up' && targetStatus === 'up') {
            return 'up';
          }

          return 'down';
        })();

        const latencyMs = combineLatency(sourceCandidate.latencyMs, targetCandidate.latencyMs);
        const packetLoss = combinePacketLoss(sourceCandidate.packetLoss, targetCandidate.packetLoss);

        const timestamp = new Date().toISOString();
        nextId += 1;

        const groupId =
          Number.isInteger(sourceDevice.groupId) && sourceDevice.groupId === targetDevice.groupId
            ? sourceDevice.groupId
            : null;

        const name = deriveDiscoveredTunnelName(
          sourceDevice,
          targetDevice,
          sourceCandidate,
          targetCandidate
        );

        const metrics = sanitizeTunnelMetrics({
          latencyMs,
          packetLoss,
          lastCheckedAt: null
        });

        const notes = buildDiscoveryNotes(
          sourceDevice,
          targetDevice,
          sourceCandidate,
          targetCandidate
        );

        const record = {
          id: nextId,
          name,
          groupId,
          sourceId: sourceCandidate.deviceId,
          targetId: targetCandidate.deviceId,
          connectionType,
          status: combinedStatus,
          enabled: false,
          tags: ['discovered'],
          notes,
          metrics,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        state.tunnels.push(record);
        added.push(record);
        registerPair(existingDiscoveredPairs, candidate.deviceId, peer.deviceId, candidate.localAddress, peer.localAddress);
        createdPairs.add(addressKey);
        mutated = true;
      }
    }
  }

  if (mutated) {
    state.lastTunnelId = nextId;
  }

  return { mutated, added };
};

export const resolveDatabaseFile = (databasePath = './data/app.db') => {
  if (!databasePath) {
    throw new Error('Database path must be provided.');
  }

  return path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(__dirname, '..', databasePath);
};

const ensureDirectory = async (databaseFile) => {
  const directory = path.dirname(databaseFile);
  await fs.mkdir(directory, { recursive: true });
};

const backupLegacyDatabase = async (databaseFile) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${databaseFile}.legacy-${timestamp}`;

  await fs.rename(databaseFile, backupFile);

  const initialState = defaultState();
  await fs.writeFile(databaseFile, JSON.stringify(initialState, null, 2), 'utf-8');

  return { initialState, backupFile };
};

const readDatabase = async (databaseFile) => {
  try {
    const raw = await fs.readFile(databaseFile, 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data.users)) {
      data.users = [];
    }

    if (!Number.isInteger(data.lastUserId)) {
      data.lastUserId = data.users.reduce((max, user) => Math.max(max, Number.parseInt(user.id, 10) || 0), 0);
    }

    if (!Array.isArray(data.roles)) {
      data.roles = [];
    }

    if (!Number.isInteger(data.lastRoleId)) {
      data.lastRoleId = data.roles.reduce((max, role) => Math.max(max, Number.parseInt(role.id, 10) || 0), 0);
    }

    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialState = defaultState();
      await fs.writeFile(databaseFile, JSON.stringify(initialState, null, 2), 'utf-8');
      return initialState;
    }

    if (error instanceof SyntaxError) {
      const { initialState, backupFile } = await backupLegacyDatabase(databaseFile);
      console.warn(
        `Detected a legacy database at ${databaseFile}. The original file was moved to ${backupFile} and a fresh JSON store was created.`
      );
      return initialState;
    }

    throw error;
  }
};

const writeDatabase = async (databaseFile, data) => {
  await fs.writeFile(databaseFile, JSON.stringify(data, null, 2), 'utf-8');
};

const sanitizePermissions = (permissions = {}) => {
  const baseline = defaultPermissions();
  return Object.keys(baseline).reduce((acc, key) => {
    acc[key] = Boolean(permissions[key]);
    return acc;
  }, baseline);
};

const ensureStateShape = async (databaseFile) => {
  const state = await readDatabase(databaseFile);
  let mutated = false;
  const normalized = { ...state };

  if (!Array.isArray(normalized.roles)) {
    normalized.roles = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastRoleId)) {
    normalized.lastRoleId = normalized.roles.reduce(
      (max, role) => Math.max(max, Number.parseInt(role.id, 10) || 0),
      0
    );
    mutated = true;
  }

  if (normalized.roles.length === 0) {
    const timestamp = new Date().toISOString();
    normalized.roles = [
      {
        id: 1,
        name: 'Administrator',
        permissions: {
          dashboard: true,
          users: true,
          roles: true,
          groups: true,
          mikrotiks: true,
          tunnels: true,
          settings: true
        },
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ];
    normalized.lastRoleId = 1;
    mutated = true;
  } else {
    normalized.roles = normalized.roles.map((role) => {
      const sanitizedPermissions = sanitizePermissions(role.permissions);
      const originalPermissions = role.permissions ?? {};

      const isDefaultAdmin =
        (typeof role.id === 'number' && role.id === 1) ||
        (typeof role.name === 'string' && role.name.toLowerCase() === 'administrator');

      if (!Object.prototype.hasOwnProperty.call(originalPermissions, 'groups')) {
        if (isDefaultAdmin || (sanitizedPermissions.dashboard && sanitizedPermissions.users && sanitizedPermissions.roles)) {
          sanitizedPermissions.groups = true;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(originalPermissions, 'mikrotiks')) {
        if (isDefaultAdmin || sanitizedPermissions.groups) {
          sanitizedPermissions.mikrotiks = true;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(originalPermissions, 'tunnels')) {
        if (isDefaultAdmin || sanitizedPermissions.mikrotiks) {
          sanitizedPermissions.tunnels = true;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(originalPermissions, 'settings')) {
        if (isDefaultAdmin || sanitizedPermissions.dashboard) {
          sanitizedPermissions.settings = true;
        }
      }

      return {
        ...role,
        permissions: sanitizedPermissions
      };
    });
  }

  if (!Array.isArray(normalized.groups)) {
    normalized.groups = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastGroupId)) {
    normalized.lastGroupId = normalized.groups.reduce(
      (max, group) => Math.max(max, Number.parseInt(group.id, 10) || 0),
      0
    );
    mutated = true;
  }

  if (!Array.isArray(normalized.ipams)) {
    normalized.ipams = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastIpamId)) {
    normalized.lastIpamId = normalized.ipams.reduce(
      (max, ipam) => Math.max(max, Number.parseInt(ipam.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextIpamIdSeed = Math.max(
    Number.isInteger(normalized.lastIpamId) ? normalized.lastIpamId : 0,
    normalized.ipams.reduce((max, ipam) => Math.max(max, Number.parseInt(ipam.id, 10) || 0), 0)
  );

  const usedIpamIds = new Set();
  const ipamTimestamp = new Date().toISOString();

  normalized.ipams = normalized.ipams.map((ipam) => {
    let identifier = Number.parseInt(ipam.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || usedIpamIds.has(identifier)) {
      nextIpamIdSeed += 1;
      identifier = nextIpamIdSeed;
      mutated = true;
    }

    usedIpamIds.add(identifier);

    const sanitized = sanitizeIpamRecord(ipam, { identifier, timestamp: ipamTimestamp });

    const originalLastStatus = normalizeOptionalText(ipam.lastStatus ?? ipam.last_status ?? 'unknown') || 'unknown';
    const originalLastCheckedAt =
      normalizeIsoDate(ipam.lastCheckedAt ?? ipam.last_checkedAt ?? ipam.last_checked_at) ?? null;

    if (
      sanitized.name !== ipam.name ||
      sanitized.baseUrl !== (ipam.baseUrl ?? ipam.base_url) ||
      sanitized.appId !== (ipam.appId ?? ipam.app_id) ||
      sanitized.appCode !== (ipam.appCode ?? ipam.app_code ?? '') ||
      sanitized.appPermissions !== (ipam.appPermissions ?? ipam.app_permissions) ||
      sanitized.appSecurity !== (ipam.appSecurity ?? ipam.app_security) ||
      sanitized.createdAt !== (ipam.createdAt ?? ipam.created_at) ||
      sanitized.updatedAt !== (ipam.updatedAt ?? ipam.updated_at) ||
      sanitized.lastStatus !== originalLastStatus.toLowerCase() ||
      sanitized.lastCheckedAt !== originalLastCheckedAt ||
      JSON.stringify(sanitized.collections) !== JSON.stringify(ipam.collections ?? ipam.cached ?? {})
    ) {
      mutated = true;
    }

    return sanitized;
  });

  if (nextIpamIdSeed > normalized.lastIpamId) {
    normalized.lastIpamId = nextIpamIdSeed;
    mutated = true;
  }

  let nextGroupIdSeed = Math.max(
    Number.isInteger(normalized.lastGroupId) ? normalized.lastGroupId : 0,
    normalized.groups.reduce((max, group) => Math.max(max, Number.parseInt(group.id, 10) || 0), 0)
  );

  const nowTimestamp = new Date().toISOString();
  const usedGroupIds = new Set();

  const sanitizedGroups = normalized.groups.map((group) => {
    let identifier = Number.parseInt(group.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || usedGroupIds.has(identifier)) {
      nextGroupIdSeed += 1;
      identifier = nextGroupIdSeed;
      mutated = true;
    }

    usedGroupIds.add(identifier);

    const createdAt = group.createdAt ?? nowTimestamp;
    const updatedAt = group.updatedAt ?? createdAt;
    const parentCandidate = Number.parseInt(group.parentId, 10);
    const parentId = Number.isInteger(parentCandidate) && parentCandidate > 0 ? parentCandidate : null;
    const name = normalizeGroupName(group.name, `Group ${identifier}`);

    if (group.name !== name || group.parentId !== parentId || group.createdAt !== createdAt || group.updatedAt !== updatedAt) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      parentId,
      createdAt,
      updatedAt
    };
  });

  let updatedGroups = sanitizedGroups;

  if (updatedGroups.length === 0) {
    const timestamp = new Date().toISOString();
    updatedGroups = [
      {
        id: 1,
        name: 'Mik-Group Root',
        parentId: null,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ];
    nextGroupIdSeed = Math.max(nextGroupIdSeed, 1);
    mutated = true;
  }

  const snapshot = updatedGroups.map((group) => ({ ...group }));

  updatedGroups = snapshot.map((group) => {
    let parentId = group.parentId;

    if (parentId && !snapshot.some((candidate) => candidate.id === parentId)) {
      parentId = null;
      mutated = true;
    }

    if (parentId && createsCycle(snapshot, group.id, parentId)) {
      parentId = null;
      mutated = true;
    }

    return {
      ...group,
      parentId
    };
  });

  let canonicalRootId = findCanonicalRootId(updatedGroups);

  if (canonicalRootId === null) {
    const timestamp = new Date().toISOString();
    const nextId = nextGroupIdSeed + 1;
    updatedGroups.push({
      id: nextId,
      name: 'Mik-Group Root',
      parentId: null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    canonicalRootId = nextId;
    nextGroupIdSeed = nextId;
    mutated = true;
  }

  const rootIndex = updatedGroups.findIndex((group) => group.id === canonicalRootId);

  if (rootIndex !== -1) {
    const rootGroup = updatedGroups[rootIndex];
    const desiredName = normalizeGroupName(rootGroup.name, 'Mik-Group Root');
    if (rootGroup.name !== desiredName || rootGroup.parentId !== null) {
      updatedGroups[rootIndex] = {
        ...rootGroup,
        name: desiredName,
        parentId: null
      };
      mutated = true;
    }
  }

  const highestGroupId = updatedGroups.reduce((max, group) => Math.max(max, group.id), 0);

  if (highestGroupId !== normalized.lastGroupId) {
    normalized.lastGroupId = Math.max(nextGroupIdSeed, highestGroupId);
    mutated = true;
  } else if (nextGroupIdSeed > normalized.lastGroupId) {
    normalized.lastGroupId = nextGroupIdSeed;
    mutated = true;
  }

  normalized.groups = updatedGroups;

  if (!Array.isArray(normalized.mikrotiks)) {
    normalized.mikrotiks = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastMikrotikId)) {
    normalized.lastMikrotikId = normalized.mikrotiks.reduce(
      (max, device) => Math.max(max, Number.parseInt(device.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextMikrotikIdSeed = Math.max(
    Number.isInteger(normalized.lastMikrotikId) ? normalized.lastMikrotikId : 0,
    normalized.mikrotiks.reduce((max, device) => Math.max(max, Number.parseInt(device.id, 10) || 0), 0)
  );

  const availableGroupIds = new Set(normalized.groups.map((group) => group.id));
  const usedDeviceIds = new Set();

  const sanitizedDevices = normalized.mikrotiks.map((device) => {
    let identifier = Number.parseInt(device.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || usedDeviceIds.has(identifier)) {
      nextMikrotikIdSeed += 1;
      identifier = nextMikrotikIdSeed;
      mutated = true;
    }

    usedDeviceIds.add(identifier);

    const createdAt = device.createdAt ?? new Date().toISOString();
    const updatedAt = device.updatedAt ?? createdAt;
    const name = normalizeText(device.name, `Device ${identifier}`);
    const host = normalizeText(device.host, `host-${identifier}`);

    const groupCandidate = Number.parseInt(device.groupId, 10);
    const groupId = availableGroupIds.has(groupCandidate) ? groupCandidate : null;

    if (
      device.name !== name ||
      device.host !== host ||
      (device.groupId ?? null) !== groupId ||
      device.createdAt !== createdAt ||
      device.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    const tags = normalizeTags(device.tags);
    const notes = normalizeOptionalText(device.notes ?? '');
    const routeros = sanitizeRouteros(device.routeros, defaultRouterosOptions());

    if (
      JSON.stringify(tags) !== JSON.stringify(device.tags ?? []) ||
      notes !== (device.notes ?? '') ||
      JSON.stringify(routeros) !== JSON.stringify(device.routeros ?? {})
    ) {
      mutated = true;
    }

    const status = deriveDeviceStatus(device.status, routeros);
    const connectivity = sanitizeConnectivity(device.connectivity, routeros);

    if (JSON.stringify(connectivity) !== JSON.stringify(device.connectivity ?? {})) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      host,
      groupId,
      tags,
      notes,
      routeros,
      status,
      connectivity,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedDevices.length !== normalized.mikrotiks.length) {
    mutated = true;
  }

  const highestDeviceId = sanitizedDevices.reduce((max, device) => Math.max(max, device.id), 0);

  if (highestDeviceId !== normalized.lastMikrotikId) {
    normalized.lastMikrotikId = Math.max(nextMikrotikIdSeed, highestDeviceId);
    mutated = true;
  } else if (nextMikrotikIdSeed > normalized.lastMikrotikId) {
    normalized.lastMikrotikId = nextMikrotikIdSeed;
    mutated = true;
  }

  normalized.mikrotiks = sanitizedDevices;

  if (!Array.isArray(normalized.tunnels)) {
    normalized.tunnels = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastTunnelId)) {
    normalized.lastTunnelId = normalized.tunnels.reduce(
      (max, tunnel) => Math.max(max, Number.parseInt(tunnel.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextTunnelIdSeed = Math.max(
    Number.isInteger(normalized.lastTunnelId) ? normalized.lastTunnelId : 0,
    normalized.tunnels.reduce((max, tunnel) => Math.max(max, Number.parseInt(tunnel.id, 10) || 0), 0)
  );

  const validMikrotikIds = new Set(normalized.mikrotiks.map((device) => device.id));
  const tunnelIdentifiers = new Set();

  const sanitizedTunnels = normalized.tunnels.map((tunnel) => {
    let identifier = Number.parseInt(tunnel.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || tunnelIdentifiers.has(identifier)) {
      nextTunnelIdSeed += 1;
      identifier = nextTunnelIdSeed;
      mutated = true;
    }

    tunnelIdentifiers.add(identifier);

    const createdAt = tunnel.createdAt ?? new Date().toISOString();
    const updatedAt = tunnel.updatedAt ?? createdAt;
    const name = normalizeText(tunnel.name, `Tunnel ${identifier}`);

    const groupCandidate = Number.parseInt(tunnel.groupId, 10);
    const groupId = normalized.groups.some((group) => group.id === groupCandidate) ? groupCandidate : null;

    const sourceCandidate = Number.parseInt(tunnel.sourceId, 10);
    const targetCandidate = Number.parseInt(tunnel.targetId, 10);

    const sourceId = validMikrotikIds.has(sourceCandidate) ? sourceCandidate : null;
    const targetId = validMikrotikIds.has(targetCandidate) ? targetCandidate : null;

    const connectionType = (normalizeOptionalText(tunnel.connectionType ?? tunnel.type ?? '') || 'GRE').toUpperCase();

    const rawState = typeof tunnel.state === 'string' ? tunnel.state : tunnel.status;
    const normalizedState = typeof rawState === 'string' ? rawState.toLowerCase() : '';
    const status = allowedTunnelStates.has(normalizedState) ? normalizedState : 'down';

    const enabled = normalizeBoolean(tunnel.enabled, true);
    const tags = normalizeTags(tunnel.tags);
    const notes = normalizeOptionalText(tunnel.notes ?? '');
    const metrics = sanitizeTunnelMetrics(tunnel.metrics ?? tunnel);
    const profile = sanitizeTunnelProfile(tunnel.profile ?? {}, tunnel.profile ?? defaultTunnelProfile());
    const monitoring = sanitizeTunnelMonitoring(tunnel.monitoring ?? {}, tunnel.monitoring ?? defaultTunnelMonitoring());
    const ospf = sanitizeTunnelOspf(tunnel.ospf ?? {}, tunnel.ospf ?? defaultTunnelOspf());
    const vpnProfiles = sanitizeVpnProfiles(tunnel.vpnProfiles ?? {}, tunnel.vpnProfiles ?? defaultVpnProfiles());

    if (
      tunnel.name !== name ||
      tunnel.groupId !== groupId ||
      tunnel.sourceId !== sourceId ||
      tunnel.targetId !== targetId ||
      tunnel.connectionType !== connectionType ||
      tunnel.state !== status ||
      tunnel.status !== status ||
      tunnel.enabled !== enabled ||
      JSON.stringify(tunnel.tags ?? []) !== JSON.stringify(tags) ||
      (tunnel.notes ?? '') !== notes ||
      JSON.stringify(tunnel.metrics ?? {}) !== JSON.stringify(metrics) ||
      JSON.stringify(tunnel.profile ?? {}) !== JSON.stringify(profile) ||
      JSON.stringify(tunnel.monitoring ?? {}) !== JSON.stringify(monitoring) ||
      JSON.stringify(tunnel.ospf ?? {}) !== JSON.stringify(ospf) ||
      JSON.stringify(tunnel.vpnProfiles ?? {}) !== JSON.stringify(vpnProfiles) ||
      tunnel.createdAt !== createdAt ||
      tunnel.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      groupId,
      sourceId,
      targetId,
      connectionType,
      status,
      enabled,
      tags,
      notes,
      metrics,
      profile,
      monitoring,
      ospf,
      vpnProfiles,
      createdAt,
      updatedAt
    };
  });

  const highestTunnelId = sanitizedTunnels.reduce((max, tunnel) => Math.max(max, tunnel.id), 0);

  if (highestTunnelId !== normalized.lastTunnelId) {
    normalized.lastTunnelId = Math.max(nextTunnelIdSeed, highestTunnelId);
    mutated = true;
  } else if (nextTunnelIdSeed > normalized.lastTunnelId) {
    normalized.lastTunnelId = nextTunnelIdSeed;
    mutated = true;
  }

  sanitizedTunnels.sort((a, b) => a.name.localeCompare(b.name));
  normalized.tunnels = sanitizedTunnels;

  if (!Array.isArray(normalized.addressLists)) {
    normalized.addressLists = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastAddressListId)) {
    normalized.lastAddressListId = normalized.addressLists.reduce(
      (max, entry) => Math.max(max, Number.parseInt(entry.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextAddressListIdSeed = Math.max(
    Number.isInteger(normalized.lastAddressListId) ? normalized.lastAddressListId : 0,
    normalized.addressLists.reduce((max, entry) => Math.max(max, Number.parseInt(entry.id, 10) || 0), 0)
  );

  const addressIdentifiers = new Set();

  const sanitizedAddressLists = normalized.addressLists.map((entry) => {
    let identifier = Number.parseInt(entry.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || addressIdentifiers.has(identifier)) {
      nextAddressListIdSeed += 1;
      identifier = nextAddressListIdSeed;
      mutated = true;
    }

    addressIdentifiers.add(identifier);

    const createdAt = entry.createdAt ?? new Date().toISOString();
    const updatedAt = entry.updatedAt ?? createdAt;
    const name = normalizeText(entry.name, `Address list ${identifier}`);
    const referenceTypeCandidate = typeof entry.referenceType === 'string' ? entry.referenceType.toLowerCase() : '';
    const referenceType = allowedAddressReferenceTypes.has(referenceTypeCandidate)
      ? referenceTypeCandidate
      : 'mikrotik';

    let referenceId = null;
    if (referenceType === 'mikrotik') {
      const candidate = Number.parseInt(entry.referenceId, 10);
      referenceId = validMikrotikIds.has(candidate) ? candidate : null;
    } else if (referenceType === 'group') {
      const candidate = Number.parseInt(entry.referenceId, 10);
      referenceId = availableGroupIds.has(candidate) ? candidate : null;
    }

    const address = normalizeOptionalText(entry.address ?? '');
    const comment = normalizeOptionalText(entry.comment ?? '');

    if (
      entry.name !== name ||
      entry.referenceType !== referenceType ||
      (entry.referenceId ?? null) !== referenceId ||
      (entry.address ?? '') !== address ||
      (entry.comment ?? '') !== comment ||
      entry.createdAt !== createdAt ||
      entry.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    const status = deriveDeviceStatus(device.status, routeros);
    const connectivity = sanitizeConnectivity(device.connectivity, routeros);

    if (JSON.stringify(connectivity) !== JSON.stringify(device.connectivity ?? {})) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      host,
      groupId,
      tags,
      notes,
      routeros,
      status,
      connectivity,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedAddressLists.length !== normalized.addressLists.length) {
    mutated = true;
  }

  const highestAddressListId = sanitizedAddressLists.reduce((max, entry) => Math.max(max, entry.id), 0);

  if (highestAddressListId !== normalized.lastAddressListId) {
    normalized.lastAddressListId = Math.max(nextAddressListIdSeed, highestAddressListId);
    mutated = true;
  } else if (nextAddressListIdSeed > normalized.lastAddressListId) {
    normalized.lastAddressListId = nextAddressListIdSeed;
    mutated = true;
  }

  normalized.addressLists = sanitizedAddressLists;

  if (!Array.isArray(normalized.firewallFilters)) {
    normalized.firewallFilters = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastFirewallFilterId)) {
    normalized.lastFirewallFilterId = normalized.firewallFilters.reduce(
      (max, filter) => Math.max(max, Number.parseInt(filter.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextFirewallIdSeed = Math.max(
    Number.isInteger(normalized.lastFirewallFilterId) ? normalized.lastFirewallFilterId : 0,
    normalized.firewallFilters.reduce((max, filter) => Math.max(max, Number.parseInt(filter.id, 10) || 0), 0)
  );

  const validAddressListIds = new Set(sanitizedAddressLists.map((entry) => entry.id));
  const firewallIdentifiers = new Set();

  const sanitizedFirewallFilters = normalized.firewallFilters.map((filter) => {
    let identifier = Number.parseInt(filter.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || firewallIdentifiers.has(identifier)) {
      nextFirewallIdSeed += 1;
      identifier = nextFirewallIdSeed;
      mutated = true;
    }

    firewallIdentifiers.add(identifier);

    const createdAt = filter.createdAt ?? new Date().toISOString();
    const updatedAt = filter.updatedAt ?? createdAt;
    const name = normalizeOptionalText(filter.name ?? `Rule ${identifier}`) || `Rule ${identifier}`;
    const groupCandidate = Number.parseInt(filter.groupId, 10);
    const groupId = availableGroupIds.has(groupCandidate) ? groupCandidate : null;

    const chainCandidate = typeof filter.chain === 'string' ? filter.chain.toLowerCase() : '';
    const chain = allowedFirewallChains.has(chainCandidate) ? chainCandidate : 'forward';

    const sourceAddressListCandidate = Number.parseInt(filter.sourceAddressListId, 10);
    const sourceAddressListId = validAddressListIds.has(sourceAddressListCandidate)
      ? sourceAddressListCandidate
      : null;

    const connectionType = (normalizeOptionalText(tunnel.connectionType ?? tunnel.type ?? '') || 'GRE').toUpperCase();

    const sourcePort = sanitizePortExpression(filter.sourcePort);
    const destinationPort = sanitizePortExpression(filter.destinationPort);

    const enabled = normalizeBoolean(tunnel.enabled, true);
    const tags = normalizeTags(tunnel.tags);
    const notes = normalizeOptionalText(tunnel.notes ?? '');
    const metrics = sanitizeTunnelMetrics(tunnel.metrics ?? tunnel);
    const profile = sanitizeTunnelProfile(tunnel.profile ?? {}, tunnel.profile ?? defaultTunnelProfile());
    const monitoring = sanitizeTunnelMonitoring(tunnel.monitoring ?? {}, tunnel.monitoring ?? defaultTunnelMonitoring());
    const ospf = sanitizeTunnelOspf(tunnel.ospf ?? {}, tunnel.ospf ?? defaultTunnelOspf());
    const vpnProfiles = sanitizeVpnProfiles(tunnel.vpnProfiles ?? {}, tunnel.vpnProfiles ?? defaultVpnProfiles());

    if (
      tunnel.name !== name ||
      tunnel.groupId !== groupId ||
      tunnel.sourceId !== sourceId ||
      tunnel.targetId !== targetId ||
      tunnel.connectionType !== connectionType ||
      tunnel.state !== status ||
      tunnel.status !== status ||
      tunnel.enabled !== enabled ||
      JSON.stringify(tunnel.tags ?? []) !== JSON.stringify(tags) ||
      (tunnel.notes ?? '') !== notes ||
      JSON.stringify(tunnel.metrics ?? {}) !== JSON.stringify(metrics) ||
      JSON.stringify(tunnel.profile ?? {}) !== JSON.stringify(profile) ||
      JSON.stringify(tunnel.monitoring ?? {}) !== JSON.stringify(monitoring) ||
      JSON.stringify(tunnel.ospf ?? {}) !== JSON.stringify(ospf) ||
      JSON.stringify(tunnel.vpnProfiles ?? {}) !== JSON.stringify(vpnProfiles) ||
      tunnel.createdAt !== createdAt ||
      tunnel.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      groupId,
      chain,
      sourceAddressListId,
      destinationAddressListId,
      sourcePort,
      destinationPort,
      states,
      action,
      enabled,
      tags,
      notes,
      metrics,
      profile,
      monitoring,
      ospf,
      vpnProfiles,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedFirewallFilters.length !== normalized.firewallFilters.length) {
    mutated = true;
  }

  const highestFirewallId = sanitizedFirewallFilters.reduce((max, entry) => Math.max(max, entry.id), 0);

  if (highestFirewallId !== normalized.lastFirewallFilterId) {
    normalized.lastFirewallFilterId = Math.max(nextFirewallIdSeed, highestFirewallId);
    mutated = true;
  } else if (nextFirewallIdSeed > normalized.lastFirewallFilterId) {
    normalized.lastFirewallFilterId = nextFirewallIdSeed;
    mutated = true;
  }

  normalized.firewallFilters = sanitizedFirewallFilters;

  if (!Array.isArray(normalized.addressLists)) {
    normalized.addressLists = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastAddressListId)) {
    normalized.lastAddressListId = normalized.addressLists.reduce(
      (max, entry) => Math.max(max, Number.parseInt(entry.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextAddressListIdSeed = Math.max(
    Number.isInteger(normalized.lastAddressListId) ? normalized.lastAddressListId : 0,
    normalized.addressLists.reduce((max, entry) => Math.max(max, Number.parseInt(entry.id, 10) || 0), 0)
  );

  const addressIdentifiers = new Set();

  const sanitizedAddressLists = normalized.addressLists.map((entry) => {
    let identifier = Number.parseInt(entry.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || addressIdentifiers.has(identifier)) {
      nextAddressListIdSeed += 1;
      identifier = nextAddressListIdSeed;
      mutated = true;
    }

    addressIdentifiers.add(identifier);

    const createdAt = entry.createdAt ?? new Date().toISOString();
    const updatedAt = entry.updatedAt ?? createdAt;
    const name = normalizeText(entry.name, `Address list ${identifier}`);
    const referenceTypeCandidate = typeof entry.referenceType === 'string' ? entry.referenceType.toLowerCase() : '';
    const referenceType = allowedAddressReferenceTypes.has(referenceTypeCandidate)
      ? referenceTypeCandidate
      : 'mikrotik';

    let referenceId = null;
    if (referenceType === 'mikrotik') {
      const candidate = Number.parseInt(entry.referenceId, 10);
      referenceId = validMikrotikIds.has(candidate) ? candidate : null;
    } else if (referenceType === 'group') {
      const candidate = Number.parseInt(entry.referenceId, 10);
      referenceId = availableGroupIds.has(candidate) ? candidate : null;
    }

    const address = normalizeOptionalText(entry.address ?? '');
    const comment = normalizeOptionalText(entry.comment ?? '');

    if (
      entry.name !== name ||
      entry.referenceType !== referenceType ||
      (entry.referenceId ?? null) !== referenceId ||
      (entry.address ?? '') !== address ||
      (entry.comment ?? '') !== comment ||
      entry.createdAt !== createdAt ||
      entry.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    const status = deriveDeviceStatus(device.status, routeros);
    const connectivity = sanitizeConnectivity(device.connectivity, routeros);

    if (JSON.stringify(connectivity) !== JSON.stringify(device.connectivity ?? {})) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      host,
      groupId,
      tags,
      notes,
      routeros,
      status,
      connectivity,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedAddressLists.length !== normalized.addressLists.length) {
    mutated = true;
  }

  const highestAddressListId = sanitizedAddressLists.reduce((max, entry) => Math.max(max, entry.id), 0);

  if (highestAddressListId !== normalized.lastAddressListId) {
    normalized.lastAddressListId = Math.max(nextAddressListIdSeed, highestAddressListId);
    mutated = true;
  } else if (nextAddressListIdSeed > normalized.lastAddressListId) {
    normalized.lastAddressListId = nextAddressListIdSeed;
    mutated = true;
  }

  normalized.addressLists = sanitizedAddressLists;

  if (!Array.isArray(normalized.firewallFilters)) {
    normalized.firewallFilters = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastFirewallFilterId)) {
    normalized.lastFirewallFilterId = normalized.firewallFilters.reduce(
      (max, filter) => Math.max(max, Number.parseInt(filter.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextFirewallIdSeed = Math.max(
    Number.isInteger(normalized.lastFirewallFilterId) ? normalized.lastFirewallFilterId : 0,
    normalized.firewallFilters.reduce((max, filter) => Math.max(max, Number.parseInt(filter.id, 10) || 0), 0)
  );

  const validAddressListIds = new Set(sanitizedAddressLists.map((entry) => entry.id));
  const firewallIdentifiers = new Set();

  const sanitizedFirewallFilters = normalized.firewallFilters.map((filter) => {
    let identifier = Number.parseInt(filter.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || firewallIdentifiers.has(identifier)) {
      nextFirewallIdSeed += 1;
      identifier = nextFirewallIdSeed;
      mutated = true;
    }

    firewallIdentifiers.add(identifier);

    const createdAt = filter.createdAt ?? new Date().toISOString();
    const updatedAt = filter.updatedAt ?? createdAt;
    const name = normalizeOptionalText(filter.name ?? `Rule ${identifier}`) || `Rule ${identifier}`;
    const groupCandidate = Number.parseInt(filter.groupId, 10);
    const groupId = availableGroupIds.has(groupCandidate) ? groupCandidate : null;

    const chainCandidate = typeof filter.chain === 'string' ? filter.chain.toLowerCase() : '';
    const chain = allowedFirewallChains.has(chainCandidate) ? chainCandidate : 'forward';

    const sourceAddressListCandidate = Number.parseInt(filter.sourceAddressListId, 10);
    const sourceAddressListId = validAddressListIds.has(sourceAddressListCandidate)
      ? sourceAddressListCandidate
      : null;

    const destinationAddressListCandidate = Number.parseInt(filter.destinationAddressListId, 10);
    const destinationAddressListId = validAddressListIds.has(destinationAddressListCandidate)
      ? destinationAddressListCandidate
      : null;

    const sourcePort = sanitizePortExpression(filter.sourcePort);
    const destinationPort = sanitizePortExpression(filter.destinationPort);

    const states = sanitizeFirewallStatesList(filter.states);
    const actionCandidate = typeof filter.action === 'string' ? filter.action.toLowerCase() : '';
    const action = allowedFirewallActions.has(actionCandidate) ? actionCandidate : 'accept';
    const enabled = normalizeBoolean(filter.enabled, true);
    const comment = normalizeOptionalText(filter.comment ?? '');

    if (
      filter.name !== name ||
      (filter.groupId ?? null) !== groupId ||
      filter.chain !== chain ||
      (filter.sourceAddressListId ?? null) !== sourceAddressListId ||
      (filter.destinationAddressListId ?? null) !== destinationAddressListId ||
      (filter.sourcePort ?? '') !== sourcePort ||
      (filter.destinationPort ?? '') !== destinationPort ||
      JSON.stringify(filter.states ?? []) !== JSON.stringify(states) ||
      filter.action !== action ||
      Boolean(filter.enabled) !== enabled ||
      (filter.comment ?? '') !== comment ||
      filter.createdAt !== createdAt ||
      filter.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      groupId,
      chain,
      sourceAddressListId,
      destinationAddressListId,
      sourcePort,
      destinationPort,
      states,
      action,
      enabled,
      comment,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedFirewallFilters.length !== normalized.firewallFilters.length) {
    mutated = true;
  }

  const highestFirewallId = sanitizedFirewallFilters.reduce((max, entry) => Math.max(max, entry.id), 0);

  if (highestFirewallId !== normalized.lastFirewallFilterId) {
    normalized.lastFirewallFilterId = Math.max(nextFirewallIdSeed, highestFirewallId);
    mutated = true;
  } else if (nextFirewallIdSeed > normalized.lastFirewallFilterId) {
    normalized.lastFirewallFilterId = nextFirewallIdSeed;
    mutated = true;
  }

  normalized.firewallFilters = sanitizedFirewallFilters;

  if (!Array.isArray(normalized.addressLists)) {
    normalized.addressLists = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastAddressListId)) {
    normalized.lastAddressListId = normalized.addressLists.reduce(
      (max, entry) => Math.max(max, Number.parseInt(entry.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextAddressListIdSeed = Math.max(
    Number.isInteger(normalized.lastAddressListId) ? normalized.lastAddressListId : 0,
    normalized.addressLists.reduce((max, entry) => Math.max(max, Number.parseInt(entry.id, 10) || 0), 0)
  );

  const addressIdentifiers = new Set();

  const sanitizedAddressLists = normalized.addressLists.map((entry) => {
    let identifier = Number.parseInt(entry.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || addressIdentifiers.has(identifier)) {
      nextAddressListIdSeed += 1;
      identifier = nextAddressListIdSeed;
      mutated = true;
    }

    addressIdentifiers.add(identifier);

    const createdAt = entry.createdAt ?? new Date().toISOString();
    const updatedAt = entry.updatedAt ?? createdAt;
    const name = normalizeText(entry.name, `Address list ${identifier}`);
    const referenceTypeCandidate = typeof entry.referenceType === 'string' ? entry.referenceType.toLowerCase() : '';
    const referenceType = allowedAddressReferenceTypes.has(referenceTypeCandidate)
      ? referenceTypeCandidate
      : 'mikrotik';

    let referenceId = null;
    if (referenceType === 'mikrotik') {
      const candidate = Number.parseInt(entry.referenceId, 10);
      referenceId = validMikrotikIds.has(candidate) ? candidate : null;
    } else if (referenceType === 'group') {
      const candidate = Number.parseInt(entry.referenceId, 10);
      referenceId = availableGroupIds.has(candidate) ? candidate : null;
    }

    const address = normalizeOptionalText(entry.address ?? '');
    const comment = normalizeOptionalText(entry.comment ?? '');

    if (
      entry.name !== name ||
      entry.referenceType !== referenceType ||
      (entry.referenceId ?? null) !== referenceId ||
      (entry.address ?? '') !== address ||
      (entry.comment ?? '') !== comment ||
      entry.createdAt !== createdAt ||
      entry.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      referenceType,
      referenceId,
      address,
      comment,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedAddressLists.length !== normalized.addressLists.length) {
    mutated = true;
  }

  const highestAddressListId = sanitizedAddressLists.reduce((max, entry) => Math.max(max, entry.id), 0);

  if (highestAddressListId !== normalized.lastAddressListId) {
    normalized.lastAddressListId = Math.max(nextAddressListIdSeed, highestAddressListId);
    mutated = true;
  } else if (nextAddressListIdSeed > normalized.lastAddressListId) {
    normalized.lastAddressListId = nextAddressListIdSeed;
    mutated = true;
  }

  normalized.addressLists = sanitizedAddressLists;

  if (!Array.isArray(normalized.firewallFilters)) {
    normalized.firewallFilters = [];
    mutated = true;
  }

  if (!Number.isInteger(normalized.lastFirewallFilterId)) {
    normalized.lastFirewallFilterId = normalized.firewallFilters.reduce(
      (max, filter) => Math.max(max, Number.parseInt(filter.id, 10) || 0),
      0
    );
    mutated = true;
  }

  let nextFirewallIdSeed = Math.max(
    Number.isInteger(normalized.lastFirewallFilterId) ? normalized.lastFirewallFilterId : 0,
    normalized.firewallFilters.reduce((max, filter) => Math.max(max, Number.parseInt(filter.id, 10) || 0), 0)
  );

  const validAddressListIds = new Set(sanitizedAddressLists.map((entry) => entry.id));
  const firewallIdentifiers = new Set();

  const sanitizedFirewallFilters = normalized.firewallFilters.map((filter) => {
    let identifier = Number.parseInt(filter.id, 10);

    if (!Number.isInteger(identifier) || identifier <= 0 || firewallIdentifiers.has(identifier)) {
      nextFirewallIdSeed += 1;
      identifier = nextFirewallIdSeed;
      mutated = true;
    }

    firewallIdentifiers.add(identifier);

    const createdAt = filter.createdAt ?? new Date().toISOString();
    const updatedAt = filter.updatedAt ?? createdAt;
    const name = normalizeOptionalText(filter.name ?? `Rule ${identifier}`) || `Rule ${identifier}`;
    const groupCandidate = Number.parseInt(filter.groupId, 10);
    const groupId = availableGroupIds.has(groupCandidate) ? groupCandidate : null;

    const chainCandidate = typeof filter.chain === 'string' ? filter.chain.toLowerCase() : '';
    const chain = allowedFirewallChains.has(chainCandidate) ? chainCandidate : 'forward';

    const sourceAddressListCandidate = Number.parseInt(filter.sourceAddressListId, 10);
    const sourceAddressListId = validAddressListIds.has(sourceAddressListCandidate)
      ? sourceAddressListCandidate
      : null;

    const destinationAddressListCandidate = Number.parseInt(filter.destinationAddressListId, 10);
    const destinationAddressListId = validAddressListIds.has(destinationAddressListCandidate)
      ? destinationAddressListCandidate
      : null;

    const sourcePort = sanitizePortExpression(filter.sourcePort);
    const destinationPort = sanitizePortExpression(filter.destinationPort);

    const states = sanitizeFirewallStatesList(filter.states);
    const actionCandidate = typeof filter.action === 'string' ? filter.action.toLowerCase() : '';
    const action = allowedFirewallActions.has(actionCandidate) ? actionCandidate : 'accept';
    const enabled = normalizeBoolean(filter.enabled, true);
    const comment = normalizeOptionalText(filter.comment ?? '');

    if (
      filter.name !== name ||
      (filter.groupId ?? null) !== groupId ||
      filter.chain !== chain ||
      (filter.sourceAddressListId ?? null) !== sourceAddressListId ||
      (filter.destinationAddressListId ?? null) !== destinationAddressListId ||
      (filter.sourcePort ?? '') !== sourcePort ||
      (filter.destinationPort ?? '') !== destinationPort ||
      JSON.stringify(filter.states ?? []) !== JSON.stringify(states) ||
      filter.action !== action ||
      Boolean(filter.enabled) !== enabled ||
      (filter.comment ?? '') !== comment ||
      filter.createdAt !== createdAt ||
      filter.updatedAt !== updatedAt
    ) {
      mutated = true;
    }

    return {
      id: identifier,
      name,
      groupId,
      chain,
      sourceAddressListId,
      destinationAddressListId,
      sourcePort,
      destinationPort,
      states,
      action,
      enabled,
      comment,
      createdAt,
      updatedAt
    };
  });

  if (sanitizedFirewallFilters.length !== normalized.firewallFilters.length) {
    mutated = true;
  }

  const highestFirewallId = sanitizedFirewallFilters.reduce((max, entry) => Math.max(max, entry.id), 0);

  if (highestFirewallId !== normalized.lastFirewallFilterId) {
    normalized.lastFirewallFilterId = Math.max(nextFirewallIdSeed, highestFirewallId);
    mutated = true;
  } else if (nextFirewallIdSeed > normalized.lastFirewallFilterId) {
    normalized.lastFirewallFilterId = nextFirewallIdSeed;
    mutated = true;
  }

  normalized.firewallFilters = sanitizedFirewallFilters;

  const validRoleIds = new Set(normalized.roles.map((role) => role.id));

  const normalizedUsers = normalized.users.map((user) => {
    const assignedRoles = Array.isArray(user.roles) ? user.roles : [];
    const filteredRoles = assignedRoles.filter((roleId) => validRoleIds.has(roleId));
    const finalRoles = filteredRoles.length > 0 ? filteredRoles : [normalized.roles[0].id];

    if (!user.createdAt) {
      mutated = true;
    }

    if (
      !Array.isArray(user.roles) ||
      filteredRoles.length !== assignedRoles.length ||
      finalRoles.length !== assignedRoles.length
    ) {
      mutated = true;
    }

    return {
      ...user,
      createdAt: user.createdAt ?? new Date().toISOString(),
      roles: finalRoles
    };
  });

  if (normalizedUsers.length !== normalized.users.length) {
    mutated = true;
  }

  normalized.users = normalizedUsers;

  if (mutated) {
    await writeDatabase(databaseFile, normalized);
  }

  return normalized;
};

const initializeDatabase = async (databasePath) => {
  const databaseFile = resolveDatabaseFile(databasePath);

  await ensureDirectory(databaseFile);
  await ensureStateShape(databaseFile);

  const load = () => readDatabase(databaseFile);
  const persist = (state) => writeDatabase(databaseFile, state);

  return {
    async createUser({ firstName, lastName, email, passwordHash }, { bypassGuard = false } = {}) {
      const state = await load();

      if (!Array.isArray(state.roles) || state.roles.length === 0) {
        const timestamp = new Date().toISOString();
        state.roles = [
          {
            id: 1,
            name: 'Administrator',
        permissions: {
          dashboard: true,
          users: true,
          roles: true,
          groups: true,
          mikrotiks: true,
          tunnels: true,
          settings: true
        },
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ];
        state.lastRoleId = 1;
      }

      if (!bypassGuard && state.users.length > 0) {
        return { success: false, reason: 'registration-closed' };
      }

      const existing = state.users.find((user) => user.email === email);

      if (existing) {
        return { success: false, reason: 'duplicate-email' };
      }

      const nextId = (Number.isInteger(state.lastUserId) ? state.lastUserId : 0) + 1;
      const createdAt = new Date().toISOString();
      const user = {
        id: nextId,
        firstName,
        lastName,
        email,
        passwordHash,
        createdAt,
        roles: [state.roles[0].id]
      };

      state.users.push(user);
      state.lastUserId = nextId;
      await persist(state);

      return { success: true, user };
    },

    async findUserByEmail(email) {
      const state = await load();
      return state.users.find((user) => user.email === email) ?? null;
    },

    async getUserById(id) {
      const state = await load();
      return state.users.find((user) => user.id === id) ?? null;
    },

    async listUsers() {
      const state = await load();
      return state.users.map((user) => ({ ...user }));
    },

    async updateUser(id, { firstName, lastName, email, passwordHash, roles }) {
      const state = await load();
      const index = state.users.findIndex((user) => user.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const duplicateEmail = state.users.some((user, position) => position !== index && user.email === email);

      if (duplicateEmail) {
        return { success: false, reason: 'duplicate-email' };
      }

      const existing = state.users[index];
      let nextRoles = existing.roles;

      if (roles !== undefined) {
        if (!Array.isArray(roles)) {
          return { success: false, reason: 'invalid-role-format' };
        }

        const uniqueRoles = [...new Set(roles.map((roleId) => Number.parseInt(roleId, 10)))].filter(
          (roleId) => Number.isInteger(roleId) && roleId > 0
        );

        if (roles.length > 0 && uniqueRoles.length === 0) {
          return { success: false, reason: 'invalid-role-format' };
        }

        const availableRoleIds = new Set(state.roles.map((role) => role.id));
        const missingRoles = uniqueRoles.filter((roleId) => !availableRoleIds.has(roleId));

        if (missingRoles.length > 0) {
          return { success: false, reason: 'invalid-role-reference', missing: missingRoles };
        }

        nextRoles = uniqueRoles;
      }

      const updatedUser = {
        ...existing,
        firstName,
        lastName,
        email,
        roles: nextRoles
      };

      if (passwordHash) {
        updatedUser.passwordHash = passwordHash;
      }

      state.users[index] = updatedUser;
      await persist(state);

      return { success: true, user: updatedUser };
    },

    async deleteUser(id) {
      const state = await load();
      const index = state.users.findIndex((user) => user.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      state.users.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async listRoles() {
      const state = await load();
      return state.roles.map((role) => ({ ...role, permissions: sanitizePermissions(role.permissions) }));
    },

    async createRole({ name, permissions }) {
      const state = await load();
      const normalizedName = name.trim();
      const duplicate = state.roles.find((role) => role.name.toLowerCase() === normalizedName.toLowerCase());

      if (duplicate) {
        return { success: false, reason: 'duplicate-name' };
      }

      const nextId = (Number.isInteger(state.lastRoleId) ? state.lastRoleId : 0) + 1;
      const timestamp = new Date().toISOString();

      const role = {
        id: nextId,
        name: normalizedName,
        permissions: sanitizePermissions(permissions),
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.roles.push(role);
      state.lastRoleId = nextId;
      await persist(state);

      return { success: true, role };
    },

    async updateRole(id, { name, permissions }) {
      const state = await load();
      const index = state.roles.findIndex((role) => role.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const normalizedName = name.trim();
      const duplicate = state.roles.find(
        (role, position) => position !== index && role.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (duplicate) {
        return { success: false, reason: 'duplicate-name' };
      }

      const existing = state.roles[index];
      const updatedRole = {
        ...existing,
        name: normalizedName,
        permissions: sanitizePermissions(permissions),
        updatedAt: new Date().toISOString()
      };

      state.roles[index] = updatedRole;
      await persist(state);

      return { success: true, role: updatedRole };
    },

    async deleteRole(id) {
      const state = await load();
      const index = state.roles.findIndex((role) => role.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const roleInUse = state.users.some((user) => Array.isArray(user.roles) && user.roles.includes(id));

      if (roleInUse) {
        return { success: false, reason: 'role-in-use' };
      }

      state.roles.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async listGroups() {
      const state = await load();
      return state.groups.map((group) => ({ ...group }));
    },

    async createGroup({ name, parentId }) {
      const state = await load();
      const normalizedName = name.trim();
      const duplicate = state.groups.find((group) => group.name.toLowerCase() === normalizedName.toLowerCase());

      if (duplicate) {
        return { success: false, reason: 'duplicate-name' };
      }

      let normalizedParentId = null;

      if (parentId !== null && parentId !== undefined) {
        if (!Number.isInteger(parentId) || parentId <= 0) {
          return { success: false, reason: 'invalid-parent' };
        }

        const parentExists = state.groups.some((group) => group.id === parentId);

        if (!parentExists) {
          return { success: false, reason: 'invalid-parent' };
        }

        normalizedParentId = parentId;
      }

      const nextId = (Number.isInteger(state.lastGroupId) ? state.lastGroupId : 0) + 1;
      const timestamp = new Date().toISOString();

      const group = {
        id: nextId,
        name: normalizedName,
        parentId: normalizedParentId,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.groups.push(group);
      state.lastGroupId = nextId;
      await persist(state);

      return { success: true, group };
    },

    async updateGroup(id, { name, parentId }) {
      const state = await load();
      const index = state.groups.findIndex((group) => group.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const canonicalRootId = findCanonicalRootId(state.groups);

      const normalizedName = name.trim();
      const duplicate = state.groups.find(
        (group, position) => position !== index && group.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (duplicate) {
        return { success: false, reason: 'duplicate-name' };
      }

      const existing = state.groups[index];
      let normalizedParentId = existing.parentId ?? null;

      if (parentId !== undefined) {
        if (parentId === null || parentId === '') {
          normalizedParentId = null;
        } else {
          const parsed = Number.parseInt(parentId, 10);

          if (!Number.isInteger(parsed) || parsed <= 0) {
            return { success: false, reason: 'invalid-parent' };
          }

          if (!state.groups.some((group) => group.id === parsed)) {
            return { success: false, reason: 'invalid-parent' };
          }

          if (createsCycle(state.groups, id, parsed)) {
            return { success: false, reason: 'cyclic-parent' };
          }

          normalizedParentId = parsed;
        }
      }

      if (canonicalRootId === id && normalizedParentId !== null) {
        return { success: false, reason: 'protected-group' };
      }

      const updatedGroup = {
        ...existing,
        name: normalizedName,
        parentId: normalizedParentId,
        updatedAt: new Date().toISOString()
      };

      state.groups[index] = updatedGroup;
      await persist(state);

      return { success: true, group: updatedGroup };
    },

    async deleteGroup(id) {
      const state = await load();
      const index = state.groups.findIndex((group) => group.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const canonicalRootId = findCanonicalRootId(state.groups);

      if (canonicalRootId === id) {
        return { success: false, reason: 'protected-group' };
      }

      const childExists = state.groups.some((group) => group.parentId === id);

      if (childExists) {
        return { success: false, reason: 'group-in-use' };
      }

      state.groups.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async listIpams() {
      const state = await load();
      return state.ipams.map((ipam) => presentIpamForClient(ipam));
    },

    async createIpam({ name, baseUrl, appId, appCode, appPermissions, appSecurity }) {
      const state = await load();

      const normalizedName = normalizeText(name);
      const normalizedBaseUrl = normalizeUrl(baseUrl);
      const normalizedAppId = normalizeText(appId);
      const normalizedAppCode = normalizeOptionalText(appCode ?? '');
      const normalizedPermissions = normalizeText(appPermissions ?? 'Read', 'Read');
      const normalizedSecurity = normalizeText(
        appSecurity ?? 'SSL with App code token',
        'SSL with App code token'
      );

      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      if (!normalizedBaseUrl) {
        return { success: false, reason: 'base-url-required' };
      }

      if (!normalizedAppId) {
        return { success: false, reason: 'app-id-required' };
      }

      if (!normalizedAppCode) {
        return { success: false, reason: 'app-code-required' };
      }

      const duplicate = state.ipams.find(
        (ipam) => ipam.baseUrl === normalizedBaseUrl && ipam.appId.toLowerCase() === normalizedAppId.toLowerCase()
      );

      if (duplicate) {
        return { success: false, reason: 'duplicate-integration' };
      }

      const nextId = (Number.isInteger(state.lastIpamId) ? state.lastIpamId : 0) + 1;
      const timestamp = new Date().toISOString();

      const record = {
        id: nextId,
        name: normalizedName,
        baseUrl: normalizedBaseUrl,
        appId: normalizedAppId,
        appCode: normalizedAppCode,
        appPermissions: normalizedPermissions,
        appSecurity: normalizedSecurity,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastStatus: 'unknown',
        lastCheckedAt: null,
        collections: sanitizeIpamCollections()
      };

      state.ipams.push(record);
      state.lastIpamId = nextId;
      await persist(state);

      return { success: true, ipam: presentIpamForClient(record) };
    },

    async getIpamById(id) {
      const state = await load();
      const ipam = state.ipams.find((entry) => entry.id === id);
      return ipam ? { ...ipam, collections: sanitizeIpamCollections(ipam.collections) } : null;
    },

    async deleteIpam(id) {
      const state = await load();
      const index = state.ipams.findIndex((ipam) => ipam.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      state.ipams.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async updateIpamStatus(id, { status, checkedAt }) {
      const state = await load();
      const index = state.ipams.findIndex((ipam) => ipam.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const ipam = state.ipams[index];
      const timestamp = new Date().toISOString();
      const loweredStatus = (status || '').toLowerCase();
      const normalizedStatus = allowedIpamStatuses.has(loweredStatus) ? loweredStatus : 'unknown';
      const normalizedCheckedAt = checkedAt ? normalizeIsoDate(checkedAt) ?? timestamp : timestamp;

      state.ipams[index] = {
        ...ipam,
        lastStatus: normalizedStatus,
        lastCheckedAt: normalizedCheckedAt,
        updatedAt: timestamp
      };

      await persist(state);

      return { success: true, ipam: presentIpamForClient(state.ipams[index]) };
    },

    async replaceIpamCollections(id, collections) {
      const state = await load();
      const index = state.ipams.findIndex((ipam) => ipam.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const sanitizedCollections = sanitizeIpamCollections(collections);
      const timestamp = new Date().toISOString();
      const ipam = state.ipams[index];

      state.ipams[index] = {
        ...ipam,
        collections: sanitizedCollections,
        updatedAt: timestamp
      };

      await persist(state);

      return { success: true, ipam: presentIpamForClient(state.ipams[index]) };
    },

    async listIpams() {
      const state = await load();
      return state.ipams.map((ipam) => presentIpamForClient(ipam));
    },

    async createIpam({ name, baseUrl, appId, appCode, appPermissions, appSecurity }) {
      const state = await load();

      const normalizedName = normalizeText(name);
      const normalizedBaseUrl = normalizeUrl(baseUrl);
      const normalizedAppId = normalizeText(appId);
      const normalizedAppCode = normalizeOptionalText(appCode ?? '');
      const normalizedPermissions = normalizeText(appPermissions ?? 'Read', 'Read');
      const normalizedSecurity = normalizeText(
        appSecurity ?? 'SSL with App code token',
        'SSL with App code token'
      );

      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      if (!normalizedBaseUrl) {
        return { success: false, reason: 'base-url-required' };
      }

      if (!normalizedAppId) {
        return { success: false, reason: 'app-id-required' };
      }

      if (!normalizedAppCode) {
        return { success: false, reason: 'app-code-required' };
      }

      const duplicate = state.ipams.find(
        (ipam) => ipam.baseUrl === normalizedBaseUrl && ipam.appId.toLowerCase() === normalizedAppId.toLowerCase()
      );

      if (duplicate) {
        return { success: false, reason: 'duplicate-integration' };
      }

      const nextId = (Number.isInteger(state.lastIpamId) ? state.lastIpamId : 0) + 1;
      const timestamp = new Date().toISOString();

      const record = {
        id: nextId,
        name: normalizedName,
        baseUrl: normalizedBaseUrl,
        appId: normalizedAppId,
        appCode: normalizedAppCode,
        appPermissions: normalizedPermissions,
        appSecurity: normalizedSecurity,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastStatus: 'unknown',
        lastCheckedAt: null,
        collections: sanitizeIpamCollections()
      };

      state.ipams.push(record);
      state.lastIpamId = nextId;
      await persist(state);

      return { success: true, ipam: presentIpamForClient(record) };
    },

    async getIpamById(id) {
      const state = await load();
      const ipam = state.ipams.find((entry) => entry.id === id);
      return ipam ? { ...ipam, collections: sanitizeIpamCollections(ipam.collections) } : null;
    },

    async deleteIpam(id) {
      const state = await load();
      const index = state.ipams.findIndex((ipam) => ipam.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      state.ipams.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async updateIpamStatus(id, { status, checkedAt }) {
      const state = await load();
      const index = state.ipams.findIndex((ipam) => ipam.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const ipam = state.ipams[index];
      const timestamp = new Date().toISOString();
      const loweredStatus = (status || '').toLowerCase();
      const normalizedStatus = allowedIpamStatuses.has(loweredStatus) ? loweredStatus : 'unknown';
      const normalizedCheckedAt = checkedAt ? normalizeIsoDate(checkedAt) ?? timestamp : timestamp;

      state.ipams[index] = {
        ...ipam,
        lastStatus: normalizedStatus,
        lastCheckedAt: normalizedCheckedAt,
        updatedAt: timestamp
      };

      await persist(state);

      return { success: true, ipam: presentIpamForClient(state.ipams[index]) };
    },

    async replaceIpamCollections(id, collections) {
      const state = await load();
      const index = state.ipams.findIndex((ipam) => ipam.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const sanitizedCollections = sanitizeIpamCollections(collections);
      const timestamp = new Date().toISOString();
      const ipam = state.ipams[index];

      state.ipams[index] = {
        ...ipam,
        collections: sanitizedCollections,
        updatedAt: timestamp
      };

      await persist(state);

      return { success: true, ipam: presentIpamForClient(state.ipams[index]) };
    },

    async listMikrotiks() {
      const state = await load();
      return state.mikrotiks.map((device) => ({
        ...device,
        tags: Array.isArray(device.tags) ? [...device.tags] : [],
        connectivity: {
          api: { ...(device.connectivity?.api ?? {}) },
          ssh: { ...(device.connectivity?.ssh ?? {}) }
        }
      }));
    },

    async createMikrotik({ name, host, groupId, tags, notes, routeros, status, connectivity }) {
      const state = await load();

      const normalizedName = normalizeText(name);
      const normalizedHost = normalizeText(host);

      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      if (!normalizedHost) {
        return { success: false, reason: 'host-required' };
      }

      let normalizedGroupId = null;
      if (groupId !== undefined && groupId !== null && groupId !== '') {
        const parsed = Number.parseInt(groupId, 10);

        if (!Number.isInteger(parsed) || parsed <= 0) {
          return { success: false, reason: 'invalid-group' };
        }

        const exists = state.groups.some((group) => group.id === parsed);

        if (!exists) {
          return { success: false, reason: 'invalid-group' };
        }

        normalizedGroupId = parsed;
      }

      const normalizedTags = normalizeTags(tags);
      const normalizedNotes = normalizeOptionalText(notes ?? '');
      const routerosBaseline = sanitizeRouteros(routeros, defaultRouterosOptions());
      const normalizedStatus = deriveDeviceStatus(status, routerosBaseline);
      const normalizedConnectivity = sanitizeConnectivity(connectivity, routerosBaseline);

      const nextId = (Number.isInteger(state.lastMikrotikId) ? state.lastMikrotikId : 0) + 1;
      const timestamp = new Date().toISOString();

      const record = {
        id: nextId,
        name: normalizedName,
        host: normalizedHost,
        groupId: normalizedGroupId,
        tags: normalizedTags,
        notes: normalizedNotes,
        routeros: routerosBaseline,
        status: normalizedStatus,
        connectivity: normalizedConnectivity,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.mikrotiks.push(record);
      state.lastMikrotikId = nextId;
      await persist(state);

      return { success: true, mikrotik: record };
    },

    async updateMikrotik(id, { name, host, groupId, tags, notes, routeros, status, connectivity }) {
      const state = await load();
      const index = state.mikrotiks.findIndex((device) => device.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const existing = state.mikrotiks[index];

      const normalizedName = name !== undefined ? normalizeText(name) : existing.name;
      const normalizedHost = host !== undefined ? normalizeText(host) : existing.host;

      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      if (!normalizedHost) {
        return { success: false, reason: 'host-required' };
      }

      let normalizedGroupId = existing.groupId ?? null;
      if (groupId !== undefined) {
        if (groupId === null || groupId === '') {
          normalizedGroupId = null;
        } else {
          const parsed = Number.parseInt(groupId, 10);

          if (!Number.isInteger(parsed) || parsed <= 0) {
            return { success: false, reason: 'invalid-group' };
          }

          const exists = state.groups.some((group) => group.id === parsed);

          if (!exists) {
            return { success: false, reason: 'invalid-group' };
          }

          normalizedGroupId = parsed;
        }
      }

      const sanitizedExistingRouteros = sanitizeRouteros(existing.routeros, defaultRouterosOptions());
      const normalizedRouteros = routeros
        ? sanitizeRouteros(routeros, sanitizedExistingRouteros)
        : sanitizedExistingRouteros;

      const nextTags =
        tags !== undefined ? normalizeTags(tags) : Array.isArray(existing.tags) ? [...existing.tags] : [];
      const nextNotes = notes !== undefined ? normalizeOptionalText(notes) : existing.notes ?? '';
      const nextStatus =
        status !== undefined ? deriveDeviceStatus(status, normalizedRouteros) : deriveDeviceStatus(existing.status, normalizedRouteros);
      const nextConnectivity =
        connectivity !== undefined
          ? sanitizeConnectivity(connectivity, normalizedRouteros)
          : sanitizeConnectivity(existing.connectivity, normalizedRouteros);

      const record = {
        ...existing,
        name: normalizedName,
        host: normalizedHost,
        groupId: normalizedGroupId,
        tags: nextTags,
        notes: nextNotes,
        routeros: normalizedRouteros,
        status: nextStatus,
        connectivity: nextConnectivity,
        updatedAt: new Date().toISOString()
      };

      state.mikrotiks[index] = record;
      await persist(state);

      return { success: true, mikrotik: record };
    },

    async deleteMikrotik(id) {
      const state = await load();
      const index = state.mikrotiks.findIndex((device) => device.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const removed = state.mikrotiks.splice(index, 1)[0];

      if (removed) {
        let tunnelsMutated = false;
        state.tunnels = state.tunnels.map((tunnel) => {
          if (tunnel.sourceId === id || tunnel.targetId === id) {
            tunnelsMutated = true;
            return {
              ...tunnel,
              sourceId: tunnel.sourceId === id ? null : tunnel.sourceId,
              targetId: tunnel.targetId === id ? null : tunnel.targetId,
              updatedAt: new Date().toISOString()
            };
          }
          return tunnel;
        });

        if (tunnelsMutated) {
          await persist(state);
          return { success: true };
        }
      }

      await persist(state);

      return { success: true };
    },

    async testMikrotikConnectivity(id) {
      const state = await load();
      const index = state.mikrotiks.findIndex((device) => device.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const existing = state.mikrotiks[index];
      const routerosBaseline = sanitizeRouteros(existing.routeros, defaultRouterosOptions());
      const timestamp = new Date().toISOString();
      const host = normalizeOptionalText(existing.host);
      const lowered = host.toLowerCase();

      const simulateOffline = lowered.includes('offline') || lowered.includes('down');
      const apiOffline = simulateOffline || lowered.includes('api-down');
      const sshOffline = simulateOffline || lowered.includes('ssh-down');

      const connectivity = sanitizeConnectivity(
        {
          api: {
            status: routerosBaseline.apiEnabled ? (apiOffline ? 'offline' : 'online') : 'disabled',
            lastCheckedAt: timestamp,
            lastError:
              routerosBaseline.apiEnabled && apiOffline ? 'API host unreachable' : existing.connectivity?.api?.lastError ?? null
          },
          ssh: {
            status: routerosBaseline.sshEnabled ? (sshOffline ? 'offline' : 'online') : 'disabled',
            lastCheckedAt: timestamp,
            lastError:
              routerosBaseline.sshEnabled && sshOffline
                ? 'SSH negotiation failed'
                : existing.connectivity?.ssh?.lastError ?? null,
            fingerprint:
              routerosBaseline.sshEnabled && !sshOffline
                ? generateHostFingerprint(existing.host)
                : existing.connectivity?.ssh?.fingerprint ?? null
          }
        },
        routerosBaseline
      );

      const simulatedVersion =
        routerosBaseline.apiEnabled || routerosBaseline.sshEnabled
          ? lowered.includes('legacy') || lowered.includes('old')
            ? '6.49.10'
            : TARGET_ROUTEROS_VERSION
          : routerosBaseline.firmwareVersion;

      const normalizedRouteros = { ...routerosBaseline, firmwareVersion: simulatedVersion };
      const status = deriveDeviceStatus(existing.status, normalizedRouteros);

      const record = {
        ...existing,
        routeros: normalizedRouteros,
        status,
        connectivity,
        updatedAt: timestamp
      };

      state.mikrotiks[index] = record;
      await persist(state);

      return { success: true, mikrotik: record };
    },

    async listAddressLists() {
      const state = await load();
      return state.addressLists.map((entry) => ({ ...entry }));
    },

    async createAddressList({ name, referenceType, referenceId, address, comment }) {
      const state = await load();

      const normalizedName = normalizeText(name);
      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      const typeCandidate = typeof referenceType === 'string' ? referenceType.toLowerCase() : '';
      if (!allowedAddressReferenceTypes.has(typeCandidate)) {
        return { success: false, reason: 'type-required' };
      }

      let normalizedReferenceId = null;
      if (typeCandidate === 'mikrotik') {
        const candidate = Number.parseInt(referenceId, 10);
        if (!Number.isInteger(candidate) || !state.mikrotiks.some((device) => device.id === candidate)) {
          return { success: false, reason: 'invalid-reference' };
        }
        normalizedReferenceId = candidate;
      } else {
        const candidate = Number.parseInt(referenceId, 10);
        if (!Number.isInteger(candidate) || !state.groups.some((group) => group.id === candidate)) {
          return { success: false, reason: 'invalid-reference' };
        }
        normalizedReferenceId = candidate;
      }

      const normalizedAddress = normalizeOptionalText(address ?? '');
      const normalizedComment = normalizeOptionalText(comment ?? '');

      const nextId = (Number.isInteger(state.lastAddressListId) ? state.lastAddressListId : 0) + 1;
      const timestamp = new Date().toISOString();

      const record = {
        id: nextId,
        name: normalizedName,
        referenceType: typeCandidate,
        referenceId: normalizedReferenceId,
        address: normalizedAddress,
        comment: normalizedComment,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.addressLists.push(record);
      state.lastAddressListId = nextId;
      await persist(state);

      return { success: true, addressList: record };
    },

    async updateAddressList(id, { name, referenceType, referenceId, address, comment }) {
      const state = await load();
      const index = state.addressLists.findIndex((entry) => entry.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const existing = state.addressLists[index];
      const normalizedName = name !== undefined ? normalizeText(name, existing.name) : existing.name;

      let normalizedReferenceType = existing.referenceType;
      if (referenceType !== undefined) {
        const candidate = typeof referenceType === 'string' ? referenceType.toLowerCase() : '';
        if (!allowedAddressReferenceTypes.has(candidate)) {
          return { success: false, reason: 'type-required' };
        }
        normalizedReferenceType = candidate;
      }

      let normalizedReferenceId = existing.referenceId;
      if (referenceId !== undefined || referenceType !== undefined) {
        const candidate = referenceId !== undefined ? referenceId : existing.referenceId;
        const parsed = Number.parseInt(candidate, 10);

        if (normalizedReferenceType === 'mikrotik') {
          if (!Number.isInteger(parsed) || !state.mikrotiks.some((device) => device.id === parsed)) {
            return { success: false, reason: 'invalid-reference' };
          }
        } else if (!Number.isInteger(parsed) || !state.groups.some((group) => group.id === parsed)) {
          return { success: false, reason: 'invalid-reference' };
        }

        normalizedReferenceId = parsed;
      }

      const normalizedAddress = address !== undefined ? normalizeOptionalText(address) : existing.address ?? '';
      const normalizedComment = comment !== undefined ? normalizeOptionalText(comment) : existing.comment ?? '';

      const record = {
        ...existing,
        name: normalizedName,
        referenceType: normalizedReferenceType,
        referenceId: normalizedReferenceId,
        address: normalizedAddress,
        comment: normalizedComment,
        updatedAt: new Date().toISOString()
      };

      state.addressLists[index] = record;
      await persist(state);

      return { success: true, addressList: record };
    },

    async deleteAddressList(id) {
      const state = await load();
      const index = state.addressLists.findIndex((entry) => entry.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      state.addressLists.splice(index, 1);
      const timestamp = new Date().toISOString();

      state.firewallFilters = state.firewallFilters.map((filter) => {
        if (filter.sourceAddressListId === id || filter.destinationAddressListId === id) {
          return {
            ...filter,
            sourceAddressListId: filter.sourceAddressListId === id ? null : filter.sourceAddressListId,
            destinationAddressListId:
              filter.destinationAddressListId === id ? null : filter.destinationAddressListId,
            updatedAt: timestamp
          };
        }
        return filter;
      });

      await persist(state);

      return { success: true };
    },

    async listFirewallFilters() {
      const state = await load();
      return state.firewallFilters.map((filter) => ({ ...filter, states: Array.isArray(filter.states) ? [...filter.states] : [] }));
    },

    async createFirewallFilter({
      name,
      groupId,
      chain,
      sourceAddressListId,
      destinationAddressListId,
      sourcePort,
      destinationPort,
      states,
      action,
      enabled,
      comment
    }) {
      const state = await load();

      const normalizedName = normalizeOptionalText(name ?? '').trim();

      const parsedGroup = Number.parseInt(groupId, 10);
      if (!Number.isInteger(parsedGroup) || !state.groups.some((group) => group.id === parsedGroup)) {
        return { success: false, reason: 'invalid-group' };
      }

      const chainCandidate = typeof chain === 'string' ? chain.toLowerCase() : '';
      if (!allowedFirewallChains.has(chainCandidate)) {
        return { success: false, reason: 'invalid-chain' };
      }

      let normalizedSourceListId = null;
      if (sourceAddressListId !== undefined && sourceAddressListId !== null && sourceAddressListId !== '') {
        const parsed = Number.parseInt(sourceAddressListId, 10);
        if (!Number.isInteger(parsed) || !state.addressLists.some((entry) => entry.id === parsed)) {
          return { success: false, reason: 'invalid-source-address-list' };
        }
        normalizedSourceListId = parsed;
      }

      let normalizedDestinationListId = null;
      if (destinationAddressListId !== undefined && destinationAddressListId !== null && destinationAddressListId !== '') {
        const parsed = Number.parseInt(destinationAddressListId, 10);
        if (!Number.isInteger(parsed) || !state.addressLists.some((entry) => entry.id === parsed)) {
          return { success: false, reason: 'invalid-destination-address-list' };
        }
        normalizedDestinationListId = parsed;
      }

      const normalizedSourcePort = sanitizePortExpression(sourcePort);
      const normalizedDestinationPort = sanitizePortExpression(destinationPort);
      const normalizedStates = sanitizeFirewallStatesList(states);
      const actionCandidate = typeof action === 'string' ? action.toLowerCase() : '';
      if (!allowedFirewallActions.has(actionCandidate)) {
        return { success: false, reason: 'invalid-action' };
      }

      const normalizedEnabled = normalizeBoolean(enabled, true);
      const normalizedComment = normalizeOptionalText(comment ?? '');

      const nextId = (Number.isInteger(state.lastFirewallFilterId) ? state.lastFirewallFilterId : 0) + 1;
      const timestamp = new Date().toISOString();

      const record = {
        id: nextId,
        name: normalizedName || `Rule ${nextId}`,
        groupId: parsedGroup,
        chain: chainCandidate,
        sourceAddressListId: normalizedSourceListId,
        destinationAddressListId: normalizedDestinationListId,
        sourcePort: normalizedSourcePort,
        destinationPort: normalizedDestinationPort,
        states: normalizedStates,
        action: actionCandidate,
        enabled: normalizedEnabled,
        comment: normalizedComment,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.firewallFilters.push(record);
      state.lastFirewallFilterId = nextId;
      await persist(state);

      return { success: true, firewallFilter: record };
    },

    async updateFirewallFilter(
      id,
      {
        name,
        groupId,
        chain,
        sourceAddressListId,
        destinationAddressListId,
        sourcePort,
        destinationPort,
        states,
        action,
        enabled,
        comment
      }
    ) {
      const state = await load();
      const index = state.firewallFilters.findIndex((filter) => filter.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const existing = state.firewallFilters[index];
      const normalizedName = name !== undefined ? normalizeOptionalText(name) : existing.name;

      let normalizedGroupId = existing.groupId;
      if (groupId !== undefined) {
        const parsed = Number.parseInt(groupId, 10);
        if (!Number.isInteger(parsed) || !state.groups.some((group) => group.id === parsed)) {
          return { success: false, reason: 'invalid-group' };
        }
        normalizedGroupId = parsed;
      }

      let normalizedChain = existing.chain;
      if (chain !== undefined) {
        const candidate = typeof chain === 'string' ? chain.toLowerCase() : '';
        if (!allowedFirewallChains.has(candidate)) {
          return { success: false, reason: 'invalid-chain' };
        }
        normalizedChain = candidate;
      }

      let normalizedSourceListId = existing.sourceAddressListId;
      if (sourceAddressListId !== undefined) {
        if (sourceAddressListId === null || sourceAddressListId === '') {
          normalizedSourceListId = null;
        } else {
          const parsed = Number.parseInt(sourceAddressListId, 10);
          if (!Number.isInteger(parsed) || !state.addressLists.some((entry) => entry.id === parsed)) {
            return { success: false, reason: 'invalid-source-address-list' };
          }
          normalizedSourceListId = parsed;
        }
      }

      let normalizedDestinationListId = existing.destinationAddressListId;
      if (destinationAddressListId !== undefined) {
        if (destinationAddressListId === null || destinationAddressListId === '') {
          normalizedDestinationListId = null;
        } else {
          const parsed = Number.parseInt(destinationAddressListId, 10);
          if (!Number.isInteger(parsed) || !state.addressLists.some((entry) => entry.id === parsed)) {
            return { success: false, reason: 'invalid-destination-address-list' };
          }
          normalizedDestinationListId = parsed;
        }
      }

      const normalizedSourcePort = sourcePort !== undefined ? sanitizePortExpression(sourcePort) : existing.sourcePort;
      const normalizedDestinationPort =
        destinationPort !== undefined ? sanitizePortExpression(destinationPort) : existing.destinationPort;
      const normalizedStates = states !== undefined ? sanitizeFirewallStatesList(states) : existing.states;

      let normalizedAction = existing.action;
      if (action !== undefined) {
        const candidate = typeof action === 'string' ? action.toLowerCase() : '';
        if (!allowedFirewallActions.has(candidate)) {
          return { success: false, reason: 'invalid-action' };
        }
        normalizedAction = candidate;
      }

      const normalizedEnabled = enabled !== undefined ? normalizeBoolean(enabled, existing.enabled) : existing.enabled;
      const normalizedComment = comment !== undefined ? normalizeOptionalText(comment) : existing.comment ?? '';

      const record = {
        ...existing,
        name: normalizedName,
        groupId: normalizedGroupId,
        chain: normalizedChain,
        sourceAddressListId: normalizedSourceListId,
        destinationAddressListId: normalizedDestinationListId,
        sourcePort: normalizedSourcePort,
        destinationPort: normalizedDestinationPort,
        states: normalizedStates,
        action: normalizedAction,
        enabled: normalizedEnabled,
        comment: normalizedComment,
        updatedAt: new Date().toISOString()
      };

      state.firewallFilters[index] = record;
      await persist(state);

      return { success: true, firewallFilter: record };
    },

    async deleteFirewallFilter(id) {
      const state = await load();
      const index = state.firewallFilters.findIndex((filter) => filter.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      state.firewallFilters.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async discoverTunnelsFromInventory() {
      const state = await load();
      const { mutated, added } = runTunnelDiscovery(state);

      if (mutated) {
        await persist(state);
      }

      return { success: true, mutated, added };
    },

    async listTunnels() {
      const state = await load();
      return state.tunnels.map((tunnel) => ({
        ...tunnel,
        tags: Array.isArray(tunnel.tags) ? [...tunnel.tags] : []
      }));
    },

    async createTunnel({
      name,
      groupId,
      sourceId,
      targetId,
      connectionType,
      status,
      enabled,
      tags,
      notes,
      metrics,
      profile,
      monitoring,
      ospf,
      vpnProfiles
    }) {
      const state = await load();

      const normalizedName = normalizeText(name);

      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      let normalizedGroupId = null;
      if (groupId !== undefined && groupId !== null && groupId !== '') {
        const parsed = Number.parseInt(groupId, 10);

        if (!Number.isInteger(parsed) || parsed <= 0) {
          return { success: false, reason: 'invalid-group' };
        }

        const exists = state.groups.some((group) => group.id === parsed);

        if (!exists) {
          return { success: false, reason: 'invalid-group' };
        }

        normalizedGroupId = parsed;
      }

      const normalizeEndpoint = (value) => {
        if (value === null || value === undefined || value === '') {
          return null;
        }

        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return null;
        }

        return parsed;
      };

      const normalizedSourceId = normalizeEndpoint(sourceId);
      const normalizedTargetId = normalizeEndpoint(targetId);

      if (!normalizedSourceId || !state.mikrotiks.some((device) => device.id === normalizedSourceId)) {
        return { success: false, reason: 'invalid-source' };
      }

      if (!normalizedTargetId || !state.mikrotiks.some((device) => device.id === normalizedTargetId)) {
        return { success: false, reason: 'invalid-target' };
      }

      if (normalizedSourceId === normalizedTargetId) {
        return { success: false, reason: 'duplicate-endpoint' };
      }

      const normalizedConnectionType = (normalizeText(connectionType) || 'GRE').toUpperCase();
      const normalizedStatus = allowedTunnelStates.has((status ?? '').toLowerCase())
        ? status.toLowerCase()
        : 'down';
      const normalizedEnabled = normalizeBoolean(enabled, true);
      const normalizedTags = normalizeTags(tags);
      const normalizedNotes = normalizeOptionalText(notes ?? '');
      const normalizedMetrics = sanitizeTunnelMetrics(metrics ?? {});
      const normalizedProfile = sanitizeTunnelProfile(profile ?? {}, defaultTunnelProfile());
      const normalizedMonitoring = sanitizeTunnelMonitoring(monitoring ?? {}, defaultTunnelMonitoring());
      const normalizedOspf = sanitizeTunnelOspf(ospf ?? {}, defaultTunnelOspf());
      const normalizedVpnProfiles = sanitizeVpnProfiles(vpnProfiles ?? {}, defaultVpnProfiles());

      const nextId = (Number.isInteger(state.lastTunnelId) ? state.lastTunnelId : 0) + 1;
      const timestamp = new Date().toISOString();

      const tunnel = {
        id: nextId,
        name: normalizedName,
        groupId: normalizedGroupId,
        sourceId: normalizedSourceId,
        targetId: normalizedTargetId,
        connectionType: normalizedConnectionType,
        status: normalizedStatus,
        enabled: normalizedEnabled,
        tags: normalizedTags,
        notes: normalizedNotes,
        metrics: normalizedMetrics,
        profile: normalizedProfile,
        monitoring: normalizedMonitoring,
        ospf: normalizedOspf,
        vpnProfiles: normalizedVpnProfiles,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.tunnels.push(tunnel);
      state.lastTunnelId = nextId;
      await persist(state);

      return { success: true, tunnel };
    },

    async updateTunnel(id, {
      name,
      groupId,
      sourceId,
      targetId,
      connectionType,
      status,
      enabled,
      tags,
      notes,
      metrics,
      profile,
      monitoring,
      ospf,
      vpnProfiles
    }) {
      const state = await load();
      const index = state.tunnels.findIndex((tunnel) => tunnel.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      const existing = state.tunnels[index];
      const normalizedName = name !== undefined ? normalizeText(name) : existing.name;

      if (!normalizedName) {
        return { success: false, reason: 'name-required' };
      }

      let normalizedGroupId = existing.groupId ?? null;
      if (groupId !== undefined) {
        if (groupId === null || groupId === '') {
          normalizedGroupId = null;
        } else {
          const parsed = Number.parseInt(groupId, 10);
          if (!Number.isInteger(parsed) || parsed <= 0) {
            return { success: false, reason: 'invalid-group' };
          }

          if (!state.groups.some((group) => group.id === parsed)) {
            return { success: false, reason: 'invalid-group' };
          }

          normalizedGroupId = parsed;
        }
      }

      const normalizeEndpoint = (value, fallback) => {
        if (value === undefined) {
          return fallback;
        }

        if (value === null || value === '') {
          return null;
        }

        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return null;
        }
        return parsed;
      };

      const normalizedSourceId = normalizeEndpoint(sourceId, existing.sourceId);
      const normalizedTargetId = normalizeEndpoint(targetId, existing.targetId);

      if (!normalizedSourceId || !state.mikrotiks.some((device) => device.id === normalizedSourceId)) {
        return { success: false, reason: 'invalid-source' };
      }

      if (!normalizedTargetId || !state.mikrotiks.some((device) => device.id === normalizedTargetId)) {
        return { success: false, reason: 'invalid-target' };
      }

      if (normalizedSourceId === normalizedTargetId) {
        return { success: false, reason: 'duplicate-endpoint' };
      }

      const normalizedConnectionType =
        connectionType !== undefined
          ? (normalizeText(connectionType) || 'GRE').toUpperCase()
          : existing.connectionType;
      const normalizedStatus =
        status !== undefined && allowedTunnelStates.has(status.toLowerCase())
          ? status.toLowerCase()
          : existing.status;
      const normalizedEnabled = enabled !== undefined ? normalizeBoolean(enabled) : existing.enabled;
      const normalizedTags = tags !== undefined ? normalizeTags(tags) : Array.isArray(existing.tags) ? [...existing.tags] : [];
      const normalizedNotes = notes !== undefined ? normalizeOptionalText(notes) : existing.notes ?? '';
      const normalizedMetrics = metrics !== undefined ? sanitizeTunnelMetrics(metrics) : sanitizeTunnelMetrics(existing.metrics);
      const existingProfile = sanitizeTunnelProfile(existing.profile ?? {}, defaultTunnelProfile());
      const normalizedProfile =
        profile !== undefined
          ? sanitizeTunnelProfile(profile ?? {}, existingProfile)
          : existingProfile;
      const existingMonitoring = sanitizeTunnelMonitoring(existing.monitoring ?? {}, defaultTunnelMonitoring());
      const normalizedMonitoring =
        monitoring !== undefined
          ? sanitizeTunnelMonitoring(monitoring ?? {}, existingMonitoring)
          : existingMonitoring;
      const existingOspf = sanitizeTunnelOspf(existing.ospf ?? {}, defaultTunnelOspf());
      const normalizedOspf =
        ospf !== undefined ? sanitizeTunnelOspf(ospf ?? {}, existingOspf) : existingOspf;
      const existingVpnProfiles = sanitizeVpnProfiles(existing.vpnProfiles ?? {}, defaultVpnProfiles());
      const normalizedVpnProfiles =
        vpnProfiles !== undefined
          ? sanitizeVpnProfiles(vpnProfiles ?? {}, existingVpnProfiles)
          : existingVpnProfiles;

      const tunnel = {
        ...existing,
        name: normalizedName,
        groupId: normalizedGroupId,
        sourceId: normalizedSourceId,
        targetId: normalizedTargetId,
        connectionType: normalizedConnectionType,
        status: normalizedStatus,
        enabled: normalizedEnabled,
        tags: normalizedTags,
        notes: normalizedNotes,
        metrics: normalizedMetrics,
        profile: normalizedProfile,
        monitoring: normalizedMonitoring,
        ospf: normalizedOspf,
        vpnProfiles: normalizedVpnProfiles,
        updatedAt: new Date().toISOString()
      };

      state.tunnels[index] = tunnel;
      await persist(state);

      return { success: true, tunnel };
    },

    async deleteTunnel(id) {
      const state = await load();
      const index = state.tunnels.findIndex((tunnel) => tunnel.id === id);

      if (index === -1) {
        return { success: false, reason: 'not-found' };
      }

      state.tunnels.splice(index, 1);
      await persist(state);

      return { success: true };
    },

    async hasAnyUsers() {
      const state = await load();
      return state.users.length > 0;
    },

    async countUsers() {
      const state = await load();
      return state.users.length;
    },

    async getDashboardSnapshot() {
      const state = await load();
      const totalMikrotiks = state.mikrotiks.length;
      const updatedMikrotiks = state.mikrotiks.filter((device) => device.status?.updateStatus === 'updated').length;
      const pendingMikrotiks = state.mikrotiks.filter((device) => device.status?.updateStatus === 'pending').length;
      const unknownMikrotiks = Math.max(totalMikrotiks - updatedMikrotiks - pendingMikrotiks, 0);
      const apiOnline = state.mikrotiks.filter((device) => device.connectivity?.api?.status === 'online').length;
      const apiOffline = state.mikrotiks.filter((device) => device.connectivity?.api?.status === 'offline').length;
      const sshOnline = state.mikrotiks.filter((device) => device.connectivity?.ssh?.status === 'online').length;
      const sshOffline = state.mikrotiks.filter((device) => device.connectivity?.ssh?.status === 'offline').length;

      const totalTunnels = state.tunnels.length;
      const tunnelsUp = state.tunnels.filter((tunnel) => tunnel.status === 'up').length;
      const tunnelsDown = state.tunnels.filter((tunnel) => tunnel.status === 'down').length;
      const tunnelsMaintenance = state.tunnels.filter((tunnel) => tunnel.status === 'maintenance').length;

      const latencyLeaderboard = state.tunnels
        .map((tunnel) => ({
          id: tunnel.id,
          name: tunnel.name,
          latencyMs: parseOptionalNumber(tunnel.metrics?.latencyMs, { min: 0, max: 1_000_000 }),
          packetLoss: parseOptionalNumber(tunnel.metrics?.packetLoss, { min: 0, max: 100 }),
          status: tunnel.status
        }))
        .filter((entry) => entry.latencyMs !== null)
        .sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))
        .slice(0, 10);

      const packetLossLeaderboard = state.tunnels
        .map((tunnel) => ({
          id: tunnel.id,
          name: tunnel.name,
          latencyMs: parseOptionalNumber(tunnel.metrics?.latencyMs, { min: 0, max: 1_000_000 }),
          packetLoss: parseOptionalNumber(tunnel.metrics?.packetLoss, { min: 0, max: 100 }),
          status: tunnel.status
        }))
        .filter((entry) => entry.packetLoss !== null)
        .sort((a, b) => (b.packetLoss ?? 0) - (a.packetLoss ?? 0))
        .slice(0, 10);

      const updatedTimestamps = [];
      const captureTimestamp = (value) => {
        const iso = normalizeIsoDate(value);
        if (iso) {
          updatedTimestamps.push(iso);
        }
      };

      state.mikrotiks.forEach((device) => {
        captureTimestamp(device.updatedAt);
        if (device.status) {
          captureTimestamp(device.status.lastAuditAt);
        }
      });

      state.tunnels.forEach((tunnel) => {
        captureTimestamp(tunnel.updatedAt);
        if (tunnel.metrics) {
          captureTimestamp(tunnel.metrics.lastCheckedAt);
        }
      });

      if (Array.isArray(state.ipams)) {
        state.ipams.forEach((ipam) => {
          captureTimestamp(ipam.updatedAt);
          captureTimestamp(ipam.lastCheckedAt);
        });
      }

      const lastUpdatedAt = updatedTimestamps.length
        ? new Date(Math.max(...updatedTimestamps.map((value) => new Date(value).getTime()))).toISOString()
        : null;

      return {
        mikrotik: {
          total: totalMikrotiks,
          updated: updatedMikrotiks,
          pending: pendingMikrotiks,
          unknown: unknownMikrotiks,
          apiOnline,
          apiOffline,
          sshOnline,
          sshOffline,
          target: TARGET_ROUTEROS_VERSION
        },
        tunnels: {
          total: totalTunnels,
          up: tunnelsUp,
          down: tunnelsDown,
          maintenance: tunnelsMaintenance,
          latencyLeaderboard,
          packetLossLeaderboard
        },
        lastUpdatedAt
      };
    },

    async close() {
      return Promise.resolve();
    }
  };
};

export default initializeDatabase;
