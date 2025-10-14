import fs from 'fs/promises';
import path from 'path';
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

const defaultState = () => ({
  lastUserId: 0,
  lastRoleId: 0,
  lastGroupId: 0,
  lastMikrotikId: 0,
  lastTunnelId: 0,
  users: [],
  roles: [],
  groups: [],
  mikrotiks: [],
  tunnels: []
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
  sshEnabled: true,
  sshPort: 22,
  sshUsername: '',
  sshPassword: '',
  autoAcceptFingerprints: false
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

  normalized.addressing = addressing;

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

    const status = sanitizeDeviceStatus(device.status);

    return {
      id: identifier,
      name,
      host,
      groupId,
      tags,
      notes,
      routeros,
      status,
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

    async listMikrotiks() {
      const state = await load();
      return state.mikrotiks.map((device) => ({
        ...device,
        tags: Array.isArray(device.tags) ? [...device.tags] : []
      }));
    },

    async createMikrotik({ name, host, groupId, tags, notes, routeros, status }) {
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
      const normalizedStatus = sanitizeDeviceStatus(status);

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
        createdAt: timestamp,
        updatedAt: timestamp
      };

      state.mikrotiks.push(record);
      state.lastMikrotikId = nextId;
      await persist(state);

      return { success: true, mikrotik: record };
    },

    async updateMikrotik(id, { name, host, groupId, tags, notes, routeros, status }) {
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
      const nextStatus = status !== undefined ? sanitizeDeviceStatus(status) : sanitizeDeviceStatus(existing.status);

      const record = {
        ...existing,
        name: normalizedName,
        host: normalizedHost,
        groupId: normalizedGroupId,
        tags: nextTags,
        notes: nextNotes,
        routeros: normalizedRouteros,
        status: nextStatus,
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

      return {
        mikrotik: {
          total: totalMikrotiks,
          updated: updatedMikrotiks,
          pending: pendingMikrotiks,
          unknown: unknownMikrotiks
        },
        tunnels: {
          total: totalTunnels,
          up: tunnelsUp,
          down: tunnelsDown,
          maintenance: tunnelsMaintenance,
          latencyLeaderboard,
          packetLossLeaderboard
        }
      };
    },

    async close() {
      return Promise.resolve();
    }
  };
};

export default initializeDatabase;
