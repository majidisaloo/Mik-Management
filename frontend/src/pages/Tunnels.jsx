import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const statusOptions = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'maintenance', label: 'Maintenance' }
];

const tunnelTypeOptions = [
  { value: 'GRE', label: 'GRE (IPv4)' },
  { value: 'GREV6', label: 'GRE (IPv6)' },
  { value: 'IPIP', label: 'IPIP' },
  { value: 'IPIPV6', label: 'IPIPv6' },
  { value: 'EOIP', label: 'EoIP' },
  { value: 'EOIPV6', label: 'EoIPv6' },
  { value: '6TO4', label: '6to4' },
  { value: '6TO4-OVER-IPIP', label: '6to4 over IPIP' },
  { value: '6TO4-OVER-GRE', label: '6to4 over GRE' },
  { value: '6TO4-OVER-EOIP', label: '6to4 over EoIP' }
];

const failoverCandidateOptions = [
  'gre',
  'grev6',
  'ipip',
  'ipipv6',
  'eoip',
  'eoipv6',
  '6to4',
  '6to4-over-ipip',
  '6to4-over-gre',
  '6to4-over-eoip'
];

const defaultPingTargets = () => [
  { address: '4.2.2.4', description: 'Level 3 DNS', enabled: true },
  { address: '8.8.8.8', description: 'Google DNS', enabled: true },
  { address: '1.1.1.1', description: 'Cloudflare DNS', enabled: true }
];

const defaultInterfaceForm = () => ({
  name: '',
  type: '',
  macAddress: '',
  arp: '',
  mtu: '',
  comment: ''
});

const defaultRouteForm = () => ({
  destination: '',
  gateway: '',
  interface: '',
  distance: '',
  comment: '',
  active: true
});

const defaultProfileForm = () => ({
  kind: 'gre',
  ipVersion: 'ipv4',
  allowFastPath: true,
  secret: '',
  secretEnabled: true,
  secretLastGeneratedAt: '',
  keepAlive: {
    enabled: true,
    timeout: '10',
    retryCount: '3',
    holdTimer: '10'
  },
  tunnelId: '',
  mtu: '',
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
    maxAttempts: '3'
  },
  endpoints: {
    source: {
      identity: '',
      interfaces: [],
      routingTable: []
    },
    target: {
      identity: '',
      interfaces: [],
      routingTable: []
    }
  },
  remarks: ''
});

const defaultMonitoringForm = () => ({
  pingTargets: defaultPingTargets(),
  traceTargets: defaultPingTargets(),
  lastPingResults: [],
  lastTraceResults: [],
  lastUpdatedAt: ''
});

const defaultOspfForm = () => ({
  enabled: true,
  instance: {
    name: '',
    routerId: '',
    version: 'v2',
    areaId: '0.0.0.0',
    redistributeDefaultRoute: false,
    metric: '',
    referenceBandwidth: ''
  },
  interfaceTemplates: [],
  areas: [],
  neighbors: []
});

const defaultVpnPeerForm = () => ({
  enabled: false,
  interface: '',
  profile: '',
  serverAddress: '',
  listenPort: '',
  username: '',
  password: '',
  comment: '',
  mtu: '',
  mru: '',
  allowFastPath: true,
  certificate: '',
  publicKey: '',
  privateKey: '',
  presharedKey: '',
  allowedAddresses: '',
  endpoint: '',
  persistentKeepalive: '',
  secret: ''
});

const defaultVpnProfilesForm = () => ({
  pptp: { server: defaultVpnPeerForm(), client: defaultVpnPeerForm() },
  l2tp: { server: defaultVpnPeerForm(), client: defaultVpnPeerForm() },
  openvpn: { server: defaultVpnPeerForm(), client: defaultVpnPeerForm() },
  wireguard: { server: defaultVpnPeerForm(), client: defaultVpnPeerForm() }
});

const vpnPeerHasConfig = (peer = {}) => {
  return (
    peer.enabled === true ||
    Boolean(peer.serverAddress) ||
    Boolean(peer.listenPort) ||
    Boolean(peer.username) ||
    Boolean(peer.password) ||
    Boolean(peer.comment) ||
    Boolean(peer.mtu) ||
    Boolean(peer.mru) ||
    Boolean(peer.certificate) ||
    Boolean(peer.publicKey) ||
    Boolean(peer.privateKey) ||
    Boolean(peer.presharedKey) ||
    Boolean(peer.allowedAddresses) ||
    Boolean(peer.endpoint) ||
    Boolean(peer.persistentKeepalive) ||
    Boolean(peer.secret) ||
    Boolean(peer.profile)
  );
};

const deriveSectionStateFromForm = (form) => {
  const profile = form.profile ?? {};
  const monitoring = form.monitoring ?? {};
  const ospf = form.ospf ?? {};
  const vpnProfiles = form.vpnProfiles ?? {};

  const sourceEndpoint = profile.endpoints?.source ?? {};
  const targetEndpoint = profile.endpoints?.target ?? {};
  const addressing = profile.addressing ?? {};

  const vpnHasValue = ['pptp', 'l2tp', 'openvpn', 'wireguard'].some((key) => {
    const value = vpnProfiles[key] ?? {};
    return vpnPeerHasConfig(value.server) || vpnPeerHasConfig(value.client);
  });

  const monitoringHasValue =
    (Array.isArray(monitoring.lastPingResults) && monitoring.lastPingResults.length > 0) ||
    (Array.isArray(monitoring.lastTraceResults) && monitoring.lastTraceResults.length > 0);

  const ospfHasValue =
    ospf.enabled === false ||
    (ospf.instance &&
      (ospf.instance.name ||
        ospf.instance.routerId ||
        ospf.instance.areaId !== '0.0.0.0' ||
        ospf.instance.metric ||
        ospf.instance.referenceBandwidth)) ||
    (Array.isArray(ospf.interfaceTemplates) && ospf.interfaceTemplates.length > 0) ||
    (Array.isArray(ospf.areas) && ospf.areas.length > 0) ||
    (Array.isArray(ospf.neighbors) && ospf.neighbors.length > 0);

  return {
    profile: true,
    addressing: Object.values(addressing).some((value) => Boolean(value)),
    sourceEndpoint:
      Boolean(sourceEndpoint.identity) ||
      (Array.isArray(sourceEndpoint.interfaces) && sourceEndpoint.interfaces.length > 0) ||
      (Array.isArray(sourceEndpoint.routingTable) && sourceEndpoint.routingTable.length > 0),
    targetEndpoint:
      Boolean(targetEndpoint.identity) ||
      (Array.isArray(targetEndpoint.interfaces) && targetEndpoint.interfaces.length > 0) ||
      (Array.isArray(targetEndpoint.routingTable) && targetEndpoint.routingTable.length > 0),
    monitoring: monitoringHasValue,
    ospf: ospfHasValue,
    vpn: vpnHasValue
  };
};

const createDefaultSectionState = () => ({
  profile: true,
  addressing: false,
  sourceEndpoint: false,
  targetEndpoint: false,
  monitoring: false,
  ospf: false,
  vpn: false
});

const CollapsibleSection = ({ label, checked, onToggle, description, children }) => (
  <section className={`form-section form-section--collapsible${checked ? ' is-open' : ''}`}>
    <header className="form-section__header">
      <label className="toggle-field toggle-field--section">
        <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} />
        <span>{label}</span>
      </label>
      {description ? <p className="form-section__description">{description}</p> : null}
    </header>
    {checked ? <div className="form-section__body">{children}</div> : null}
  </section>
);

const CollapsibleSubSection = ({ label, checked, onToggle, children }) => (
  <div className={`collapsible-subsection${checked ? ' is-open' : ''}`}>
    <div className="collapsible-subsection__header">
      <label className="toggle-field toggle-field--subsection">
        <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} />
        <span>{label}</span>
      </label>
    </div>
    {checked ? <div className="collapsible-subsection__body">{children}</div> : null}
  </div>
);

const emptyTunnelForm = () => ({
  name: '',
  groupId: '',
  sourceId: '',
  targetId: '',
  connectionType: 'GRE',
  status: 'down',
  enabled: true,
  tags: '',
  notes: '',
  latencyMs: '',
  packetLoss: '',
  lastCheckedAt: '',
  profile: defaultProfileForm(),
  monitoring: defaultMonitoringForm(),
  ospf: defaultOspfForm(),
  vpnProfiles: defaultVpnProfilesForm()
});

const parseTags = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const cloneState = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const setNestedValue = (target, path, value) => {
  const segments = path.split('.');
  let cursor = target;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }

    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }

    cursor = cursor[segment];
  });
};

const formatCandidateLabel = (value) => {
  return value
    .split('-')
    .map((segment) => {
      if (segment.toLowerCase() === 'over') {
        return 'over';
      }
      return segment.toUpperCase();
    })
    .join(' ');
};

const generateSecretKey = () => {
  const random = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(random);
  } else {
    for (let index = 0; index < random.length; index += 1) {
      random[index] = Math.floor(Math.random() * 256);
    }
  }

  const binary = Array.from(random, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const mapInterfaceRecordToForm = (record = {}) => ({
  name: record.name ?? '',
  type: record.type ?? '',
  macAddress: record.macAddress ?? '',
  arp: record.arp ?? '',
  mtu: record.mtu !== null && record.mtu !== undefined ? String(record.mtu) : '',
  comment: record.comment ?? ''
});

const mapRouteRecordToForm = (record = {}) => ({
  destination: record.destination ?? '',
  gateway: record.gateway ?? '',
  interface: record.interface ?? '',
  distance: record.distance !== null && record.distance !== undefined ? String(record.distance) : '',
  comment: record.comment ?? '',
  active: record.active !== undefined ? Boolean(record.active) : true
});

const mapMonitoringTargetsToForm = (targets, fallback) => {
  if (!Array.isArray(targets) || targets.length === 0) {
    return fallback();
  }

  return targets.map((target) => ({
    address: target.address ?? '',
    description: target.description ?? '',
    enabled: target.enabled !== undefined ? Boolean(target.enabled) : true
  }));
};

const mapResultsToForm = (results = []) => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((result) => ({
    address: result.address ?? '',
    success: Boolean(result.success),
    latencyMs: result.latencyMs ?? null,
    hops: Array.isArray(result.hops) ? result.hops : [],
    output: result.output ?? '',
    checkedAt: result.checkedAt ?? ''
  }));
};

const mapVpnPeerToForm = (peer = {}) => ({
  enabled: peer.enabled !== undefined ? Boolean(peer.enabled) : false,
  interface: peer.interface ?? '',
  profile: peer.profile ?? '',
  serverAddress: peer.serverAddress ?? peer.server ?? '',
  listenPort: peer.listenPort !== undefined && peer.listenPort !== null ? String(peer.listenPort) : '',
  username: peer.username ?? '',
  password: peer.password ?? '',
  comment: peer.comment ?? '',
  mtu: peer.mtu !== undefined && peer.mtu !== null ? String(peer.mtu) : '',
  mru: peer.mru !== undefined && peer.mru !== null ? String(peer.mru) : '',
  allowFastPath: peer.allowFastPath !== undefined ? Boolean(peer.allowFastPath) : true,
  certificate: peer.certificate ?? '',
  publicKey: peer.publicKey ?? '',
  privateKey: peer.privateKey ?? '',
  presharedKey: peer.presharedKey ?? '',
  allowedAddresses: peer.allowedAddresses ?? '',
  endpoint: peer.endpoint ?? '',
  persistentKeepalive:
    peer.persistentKeepalive !== undefined && peer.persistentKeepalive !== null
      ? String(peer.persistentKeepalive)
      : '',
  secret: peer.secret ?? ''
});

const createFormFromRecord = (record) => {
  const base = emptyTunnelForm();

  base.name = record.name ?? '';
  base.groupId = record.groupId ? String(record.groupId) : '';
  base.sourceId = record.sourceId ? String(record.sourceId) : '';
  base.targetId = record.targetId ? String(record.targetId) : '';
  base.connectionType = record.connectionType ?? 'GRE';
  base.status = record.status ?? 'down';
  base.enabled = Boolean(record.enabled);
  base.tags = Array.isArray(record.tags) ? record.tags.join(', ') : '';
  base.notes = record.notes ?? '';
  base.latencyMs =
    record.metrics?.latencyMs !== undefined && record.metrics?.latencyMs !== null
      ? String(record.metrics.latencyMs)
      : '';
  base.packetLoss =
    record.metrics?.packetLoss !== undefined && record.metrics?.packetLoss !== null
      ? String(record.metrics.packetLoss)
      : '';
  base.lastCheckedAt = record.metrics?.lastCheckedAt ?? '';

  const profile = record.profile ?? {};
  base.profile.kind = (profile.kind ?? base.connectionType ?? 'gre').toLowerCase();
  base.profile.ipVersion = profile.ipVersion ?? (base.connectionType.includes('6') ? 'ipv6' : 'ipv4');
  base.profile.allowFastPath = profile.allowFastPath !== undefined ? Boolean(profile.allowFastPath) : true;
  base.profile.secret = profile.secret ?? '';
  base.profile.secretEnabled =
    profile.secretEnabled !== undefined ? Boolean(profile.secretEnabled) : Boolean(profile.secret);
  base.profile.secretLastGeneratedAt = profile.secretLastGeneratedAt ?? '';
  base.profile.keepAlive = {
    enabled: profile.keepAlive?.enabled !== undefined ? Boolean(profile.keepAlive.enabled) : true,
    timeout:
      profile.keepAlive?.timeout !== undefined && profile.keepAlive?.timeout !== null
        ? String(profile.keepAlive.timeout)
        : '',
    retryCount:
      profile.keepAlive?.retryCount !== undefined && profile.keepAlive?.retryCount !== null
        ? String(profile.keepAlive.retryCount)
        : '',
    holdTimer:
      profile.keepAlive?.holdTimer !== undefined && profile.keepAlive?.holdTimer !== null
        ? String(profile.keepAlive.holdTimer)
        : ''
  };
  base.profile.tunnelId = profile.tunnelId !== undefined && profile.tunnelId !== null ? String(profile.tunnelId) : '';
  base.profile.mtu = profile.mtu !== undefined && profile.mtu !== null ? String(profile.mtu) : '';
  base.profile.addressing = {
    localAddress: profile.addressing?.localAddress ?? '',
    remoteAddress: profile.addressing?.remoteAddress ?? '',
    localTunnelIp: profile.addressing?.localTunnelIp ?? '',
    remoteTunnelIp: profile.addressing?.remoteTunnelIp ?? '',
    localIpamPool: profile.addressing?.localIpamPool ?? '',
    remoteIpamPool: profile.addressing?.remoteIpamPool ?? ''
  };
  base.profile.provisioning = {
    viaApi: profile.provisioning?.viaApi !== undefined ? Boolean(profile.provisioning.viaApi) : true,
    viaSsh: profile.provisioning?.viaSsh !== undefined ? Boolean(profile.provisioning.viaSsh) : true,
    preferred: profile.provisioning?.preferred ?? 'hybrid'
  };
  base.profile.failover = {
    disableSecretOnFailure:
      profile.failover?.disableSecretOnFailure !== undefined
        ? Boolean(profile.failover.disableSecretOnFailure)
        : true,
    candidateKinds: Array.isArray(profile.failover?.candidateKinds)
      ? profile.failover.candidateKinds.map((entry) => entry.toLowerCase())
      : ['gre', 'ipip', 'eoip', '6to4'],
    maxAttempts:
      profile.failover?.maxAttempts !== undefined && profile.failover?.maxAttempts !== null
        ? String(profile.failover.maxAttempts)
        : '3'
  };

  base.profile.endpoints = {
    source: {
      identity: profile.endpoints?.source?.identity ?? '',
      interfaces: Array.isArray(profile.endpoints?.source?.interfaces)
        ? profile.endpoints.source.interfaces.map(mapInterfaceRecordToForm)
        : [],
      routingTable: Array.isArray(profile.endpoints?.source?.routingTable)
        ? profile.endpoints.source.routingTable.map(mapRouteRecordToForm)
        : []
    },
    target: {
      identity: profile.endpoints?.target?.identity ?? '',
      interfaces: Array.isArray(profile.endpoints?.target?.interfaces)
        ? profile.endpoints.target.interfaces.map(mapInterfaceRecordToForm)
        : [],
      routingTable: Array.isArray(profile.endpoints?.target?.routingTable)
        ? profile.endpoints.target.routingTable.map(mapRouteRecordToForm)
        : []
    }
  };
  base.profile.remarks = profile.remarks ?? '';

  const monitoring = record.monitoring ?? {};
  base.monitoring.pingTargets = mapMonitoringTargetsToForm(monitoring.pingTargets, defaultPingTargets);
  base.monitoring.traceTargets = mapMonitoringTargetsToForm(monitoring.traceTargets, defaultPingTargets);
  base.monitoring.lastPingResults = mapResultsToForm(monitoring.lastPingResults);
  base.monitoring.lastTraceResults = mapResultsToForm(monitoring.lastTraceResults);
  base.monitoring.lastUpdatedAt = monitoring.lastUpdatedAt ?? '';

  const ospf = record.ospf ?? {};
  base.ospf.enabled = ospf.enabled !== undefined ? Boolean(ospf.enabled) : true;
  base.ospf.instance = {
    name: ospf.instance?.name ?? '',
    routerId: ospf.instance?.routerId ?? '',
    version: ospf.instance?.version ?? 'v2',
    areaId: ospf.instance?.areaId ?? '0.0.0.0',
    redistributeDefaultRoute:
      ospf.instance?.redistributeDefaultRoute !== undefined
        ? Boolean(ospf.instance.redistributeDefaultRoute)
        : false,
    metric:
      ospf.instance?.metric !== undefined && ospf.instance?.metric !== null
        ? String(ospf.instance.metric)
        : '',
    referenceBandwidth:
      ospf.instance?.referenceBandwidth !== undefined && ospf.instance?.referenceBandwidth !== null
        ? String(ospf.instance.referenceBandwidth)
        : ''
  };
  base.ospf.interfaceTemplates = Array.isArray(ospf.interfaceTemplates)
    ? ospf.interfaceTemplates.map((template, index) => ({
        name: template.name ?? `template-${index + 1}`,
        network: template.network ?? '',
        cost: template.cost !== undefined && template.cost !== null ? String(template.cost) : '',
        priority: template.priority !== undefined && template.priority !== null ? String(template.priority) : '',
        passive: template.passive !== undefined ? Boolean(template.passive) : false,
        comment: template.comment ?? ''
      }))
    : [];
  base.ospf.areas = Array.isArray(ospf.areas)
    ? ospf.areas.map((area, index) => ({
        name: area.name ?? `area-${index + 1}`,
        areaId: area.areaId ?? '',
        type: area.type ?? '',
        authentication: area.authentication ?? '',
        comment: area.comment ?? ''
      }))
    : [];
  base.ospf.neighbors = Array.isArray(ospf.neighbors)
    ? ospf.neighbors.map((neighbor, index) => ({
        name: neighbor.name ?? `neighbor-${index + 1}`,
        address: neighbor.address ?? '',
        interface: neighbor.interface ?? '',
        priority: neighbor.priority !== undefined && neighbor.priority !== null ? String(neighbor.priority) : '',
        pollInterval:
          neighbor.pollInterval !== undefined && neighbor.pollInterval !== null
            ? String(neighbor.pollInterval)
            : '',
        state: neighbor.state ?? '',
        comment: neighbor.comment ?? ''
      }))
    : [];

  const vpnProfiles = record.vpnProfiles ?? {};
  ['pptp', 'l2tp', 'openvpn', 'wireguard'].forEach((key) => {
    const value = vpnProfiles[key] ?? {};
    base.vpnProfiles[key] = {
      server: mapVpnPeerToForm(value.server),
      client: mapVpnPeerToForm(value.client)
    };
  });

  return base;
};

const buildEndpointPayload = (endpoint = {}) => ({
  identity: endpoint.identity || undefined,
  interfaces: Array.isArray(endpoint.interfaces)
    ? endpoint.interfaces
        .filter((entry) => entry.name && entry.name.trim())
        .map((entry) => ({
          name: entry.name.trim(),
          type: entry.type || undefined,
          macAddress: entry.macAddress || undefined,
          arp: entry.arp || undefined,
          mtu: toNumber(entry.mtu),
          comment: entry.comment || undefined
        }))
    : [],
  routingTable: Array.isArray(endpoint.routingTable)
    ? endpoint.routingTable
        .filter((entry) => entry.destination && entry.destination.trim())
        .map((entry) => ({
          destination: entry.destination.trim(),
          gateway: entry.gateway || undefined,
          interface: entry.interface || undefined,
          distance: toNumber(entry.distance),
          comment: entry.comment || undefined,
          active: entry.active !== undefined ? Boolean(entry.active) : true
        }))
    : []
});
const buildProfilePayload = (profile = {}) => ({
  kind: (profile.kind || '').toLowerCase(),
  ipVersion: profile.ipVersion || undefined,
  allowFastPath: Boolean(profile.allowFastPath),
  secret: profile.secret || undefined,
  secretEnabled: Boolean(profile.secretEnabled),
  secretLastGeneratedAt: profile.secretLastGeneratedAt || undefined,
  keepAlive: {
    enabled: Boolean(profile.keepAlive?.enabled),
    timeout: toNumber(profile.keepAlive?.timeout),
    retryCount: toNumber(profile.keepAlive?.retryCount),
    holdTimer: toNumber(profile.keepAlive?.holdTimer)
  },
  tunnelId: toNumber(profile.tunnelId),
  mtu: toNumber(profile.mtu),
  addressing: {
    localAddress: profile.addressing?.localAddress || undefined,
    remoteAddress: profile.addressing?.remoteAddress || undefined,
    localTunnelIp: profile.addressing?.localTunnelIp || undefined,
    remoteTunnelIp: profile.addressing?.remoteTunnelIp || undefined,
    localIpamPool: profile.addressing?.localIpamPool || undefined,
    remoteIpamPool: profile.addressing?.remoteIpamPool || undefined
  },
  provisioning: {
    viaApi: Boolean(profile.provisioning?.viaApi),
    viaSsh: Boolean(profile.provisioning?.viaSsh),
    preferred: profile.provisioning?.preferred || undefined
  },
  failover: {
    disableSecretOnFailure: Boolean(profile.failover?.disableSecretOnFailure),
    candidateKinds: Array.isArray(profile.failover?.candidateKinds)
      ? profile.failover.candidateKinds.map((entry) => entry.toLowerCase()).filter(Boolean)
      : [],
    maxAttempts: toNumber(profile.failover?.maxAttempts)
  },
  endpoints: {
    source: buildEndpointPayload(profile.endpoints?.source),
    target: buildEndpointPayload(profile.endpoints?.target)
  },
  remarks: profile.remarks || undefined
});

const buildTargetsPayload = (targets = []) =>
  targets
    .filter((target) => target.address && target.address.trim())
    .map((target) => ({
      address: target.address.trim(),
      description: target.description ? target.description.trim() : undefined,
      enabled: target.enabled !== undefined ? Boolean(target.enabled) : true
    }));

const buildMonitoringPayload = (monitoring = {}) => ({
  pingTargets: buildTargetsPayload(monitoring.pingTargets),
  traceTargets: buildTargetsPayload(monitoring.traceTargets),
  lastPingResults: Array.isArray(monitoring.lastPingResults) ? monitoring.lastPingResults : undefined,
  lastTraceResults: Array.isArray(monitoring.lastTraceResults) ? monitoring.lastTraceResults : undefined,
  lastUpdatedAt: monitoring.lastUpdatedAt || undefined
});

const buildOspfPayload = (ospf = {}) => ({
  enabled: Boolean(ospf.enabled),
  instance: {
    name: ospf.instance?.name || undefined,
    routerId: ospf.instance?.routerId || undefined,
    version: ospf.instance?.version || undefined,
    areaId: ospf.instance?.areaId || undefined,
    redistributeDefaultRoute: Boolean(ospf.instance?.redistributeDefaultRoute),
    metric: toNumber(ospf.instance?.metric),
    referenceBandwidth: toNumber(ospf.instance?.referenceBandwidth)
  },
  interfaceTemplates: Array.isArray(ospf.interfaceTemplates)
    ? ospf.interfaceTemplates
        .filter((template) => template.network && template.network.trim())
        .map((template) => ({
          name: template.name || undefined,
          network: template.network.trim(),
          cost: toNumber(template.cost),
          priority: toNumber(template.priority),
          passive: Boolean(template.passive),
          comment: template.comment || undefined
        }))
    : [],
  areas: Array.isArray(ospf.areas)
    ? ospf.areas
        .filter((area) => area.areaId && area.areaId.trim())
        .map((area) => ({
          name: area.name || undefined,
          areaId: area.areaId.trim(),
          type: area.type || undefined,
          authentication: area.authentication || undefined,
          comment: area.comment || undefined
        }))
    : [],
  neighbors: Array.isArray(ospf.neighbors)
    ? ospf.neighbors
        .filter((neighbor) => neighbor.address && neighbor.address.trim())
        .map((neighbor) => ({
          name: neighbor.name || undefined,
          address: neighbor.address.trim(),
          interface: neighbor.interface || undefined,
          priority: toNumber(neighbor.priority),
          pollInterval: toNumber(neighbor.pollInterval),
          state: neighbor.state || undefined,
          comment: neighbor.comment || undefined
        }))
    : []
});

const buildVpnPeerPayload = (peer = {}) => ({
  enabled: Boolean(peer.enabled),
  interface: peer.interface || undefined,
  profile: peer.profile || undefined,
  serverAddress: peer.serverAddress || undefined,
  listenPort: toNumber(peer.listenPort),
  username: peer.username || undefined,
  password: peer.password || undefined,
  comment: peer.comment || undefined,
  mtu: toNumber(peer.mtu),
  mru: toNumber(peer.mru),
  allowFastPath: Boolean(peer.allowFastPath),
  certificate: peer.certificate || undefined,
  publicKey: peer.publicKey || undefined,
  privateKey: peer.privateKey || undefined,
  presharedKey: peer.presharedKey || undefined,
  allowedAddresses: peer.allowedAddresses || undefined,
  endpoint: peer.endpoint || undefined,
  persistentKeepalive: toNumber(peer.persistentKeepalive),
  secret: peer.secret || undefined
});

const buildVpnProfilesPayload = (profiles = {}) => ({
  pptp: {
    server: buildVpnPeerPayload(profiles.pptp?.server),
    client: buildVpnPeerPayload(profiles.pptp?.client)
  },
  l2tp: {
    server: buildVpnPeerPayload(profiles.l2tp?.server),
    client: buildVpnPeerPayload(profiles.l2tp?.client)
  },
  openvpn: {
    server: buildVpnPeerPayload(profiles.openvpn?.server),
    client: buildVpnPeerPayload(profiles.openvpn?.client)
  },
  wireguard: {
    server: buildVpnPeerPayload(profiles.wireguard?.server),
    client: buildVpnPeerPayload(profiles.wireguard?.client)
  }
});

const buildPayload = (form) => ({
  name: form.name,
  groupId: form.groupId || null,
  sourceId: form.sourceId,
  targetId: form.targetId,
  connectionType: form.connectionType,
  status: form.status,
  enabled: Boolean(form.enabled),
  tags: parseTags(form.tags),
  notes: form.notes,
  metrics: {
    latencyMs: toNumber(form.latencyMs),
    packetLoss: toNumber(form.packetLoss),
    lastCheckedAt: form.lastCheckedAt || undefined
  },
  profile: buildProfilePayload(form.profile),
  monitoring: buildMonitoringPayload(form.monitoring),
  ospf: buildOspfPayload(form.ospf),
  vpnProfiles: buildVpnProfilesPayload(form.vpnProfiles)
});
const Tunnels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tunnels, setTunnels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filter, setFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(() => emptyTunnelForm());
  const [createBusy, setCreateBusy] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({
    create: createDefaultSectionState(),
    manage: createDefaultSectionState()
  });

  const [manageState, setManageState] = useState({ open: false, tunnelId: null, form: emptyTunnelForm() });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [diagnosticsState, setDiagnosticsState] = useState({ running: false, ping: [], trace: [], error: '' });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.tunnels) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tunnels', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load tunnels.');
        }

        const payload = await response.json();
        setTunnels(Array.isArray(payload?.tunnels) ? payload.tunnels : []);
        setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
        setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        setStatus({
          type: 'error',
          message:
            error.message ||
            'Tunnel management is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const filteredTunnels = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return tunnels;
    }

    return tunnels.filter((entry) => {
      const nameMatch = entry.name?.toLowerCase().includes(query);
      const sourceMatch = entry.sourceName?.toLowerCase().includes(query);
      const targetMatch = entry.targetName?.toLowerCase().includes(query);
      const groupMatch = entry.groupName?.toLowerCase().includes(query);
      const tagMatch = Array.isArray(entry.tags)
        ? entry.tags.some((tag) => tag.toLowerCase().includes(query))
        : false;
      const typeMatch = entry.connectionType?.toLowerCase().includes(query) || entry.profile?.kind?.includes(query);
      const addressMatch =
        entry.profile?.addressing?.localAddress?.toLowerCase().includes(query) ||
        entry.profile?.addressing?.remoteAddress?.toLowerCase().includes(query);
      return nameMatch || sourceMatch || targetMatch || groupMatch || tagMatch || typeMatch || addressMatch;
    });
  }, [filter, tunnels]);

  const updateCreateForm = (updater) => {
    setCreateForm((current) => {
      const draft = cloneState(current);
      const result = updater(draft);
      return result ?? draft;
    });
  };

  const updateManageForm = (updater) => {
    setManageState((current) => {
      const draft = cloneState(current.form);
      const result = updater(draft);
      return { ...current, form: result ?? draft };
    });
  };

  const applyFormUpdate = (formType, updater) => {
    if (formType === 'create') {
      updateCreateForm(updater);
    } else {
      updateManageForm(updater);
    }
  };

  const resetManageState = () => {
    setManageState({ open: false, tunnelId: null, form: emptyTunnelForm() });
    setDiagnosticsState({ running: false, ping: [], trace: [], error: '' });
    setManageBusy(false);
    setDeleteBusy(false);
    setSectionVisibility((current) => ({ ...current, manage: createDefaultSectionState() }));
  };

  const openCreateModal = () => {
    setCreateForm(emptyTunnelForm());
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
    setSectionVisibility((current) => ({ ...current, create: createDefaultSectionState() }));
  };

  const openManageModal = (record) => {
    const form = createFormFromRecord(record);

    setManageState({
      open: true,
      tunnelId: record.id,
      form
    });
    setDiagnosticsState({
      running: false,
      ping: Array.isArray(record.monitoring?.lastPingResults) ? record.monitoring.lastPingResults : [],
      trace: Array.isArray(record.monitoring?.lastTraceResults) ? record.monitoring.lastTraceResults : [],
      error: ''
    });
    setStatus({ type: '', message: '' });
    setSectionVisibility((current) => ({
      ...current,
      manage: deriveSectionStateFromForm(form)
    }));
  };

  const handleTopLevelChange = (formType, event) => {
    const { name, value, type, checked } = event.target;
    applyFormUpdate(formType, (draft) => {
      draft[name] = type === 'checkbox' ? checked : value;
      return draft;
    });
  };

  const handleConnectionTypeChange = (formType, value) => {
    applyFormUpdate(formType, (draft) => {
      draft.connectionType = value;
      draft.profile.kind = value.toLowerCase();
      draft.profile.ipVersion = value.includes('6') ? 'ipv6' : 'ipv4';
      return draft;
    });
  };

  const handleSectionToggle = (formType, section, value) => {
    setSectionVisibility((current) => {
      const existing = current[formType] ?? createDefaultSectionState();
      return {
        ...current,
        [formType]: {
          ...existing,
          [section]: value
        }
      };
    });
  };

  const handleProfileFieldChange = (formType, path, value) => {
    applyFormUpdate(formType, (draft) => {
      setNestedValue(draft.profile, path, value);
      return draft;
    });
  };

  const handleMonitoringFieldChange = (formType, path, value) => {
    applyFormUpdate(formType, (draft) => {
      setNestedValue(draft.monitoring, path, value);
      return draft;
    });
  };

  const handleOspfFieldChange = (formType, path, value) => {
    applyFormUpdate(formType, (draft) => {
      setNestedValue(draft.ospf, path, value);
      return draft;
    });
  };

  const handleVpnFieldChange = (formType, path, value) => {
    applyFormUpdate(formType, (draft) => {
      setNestedValue(draft.vpnProfiles, path, value);
      return draft;
    });
  };

  const toggleFailoverCandidate = (formType, candidate, enabled) => {
    applyFormUpdate(formType, (draft) => {
      const currentCandidates = Array.isArray(draft.profile.failover.candidateKinds)
        ? [...draft.profile.failover.candidateKinds]
        : [];
      const normalized = candidate.toLowerCase();
      if (enabled) {
        if (!currentCandidates.includes(normalized)) {
          currentCandidates.push(normalized);
        }
      } else {
        const index = currentCandidates.indexOf(normalized);
        if (index !== -1) {
          currentCandidates.splice(index, 1);
        }
      }
      draft.profile.failover.candidateKinds = currentCandidates;
      return draft;
    });
  };

  const addEndpointInterface = (formType, endpoint) => {
    applyFormUpdate(formType, (draft) => {
      draft.profile.endpoints[endpoint].interfaces = [
        ...draft.profile.endpoints[endpoint].interfaces,
        defaultInterfaceForm()
      ];
      return draft;
    });
  };

  const updateEndpointInterface = (formType, endpoint, index, field, value) => {
    applyFormUpdate(formType, (draft) => {
      const list = draft.profile.endpoints[endpoint].interfaces;
      list[index][field] = value;
      return draft;
    });
  };

  const removeEndpointInterface = (formType, endpoint, index) => {
    applyFormUpdate(formType, (draft) => {
      draft.profile.endpoints[endpoint].interfaces = draft.profile.endpoints[endpoint].interfaces.filter(
        (_entry, entryIndex) => entryIndex !== index
      );
      return draft;
    });
  };

  const addEndpointRoute = (formType, endpoint) => {
    applyFormUpdate(formType, (draft) => {
      draft.profile.endpoints[endpoint].routingTable = [
        ...draft.profile.endpoints[endpoint].routingTable,
        defaultRouteForm()
      ];
      return draft;
    });
  };

  const updateEndpointRoute = (formType, endpoint, index, field, value) => {
    applyFormUpdate(formType, (draft) => {
      const list = draft.profile.endpoints[endpoint].routingTable;
      list[index][field] = value;
      return draft;
    });
  };

  const removeEndpointRoute = (formType, endpoint, index) => {
    applyFormUpdate(formType, (draft) => {
      draft.profile.endpoints[endpoint].routingTable = draft.profile.endpoints[endpoint].routingTable.filter(
        (_entry, entryIndex) => entryIndex !== index
      );
      return draft;
    });
  };

  const addMonitoringTarget = (formType, listName) => {
    applyFormUpdate(formType, (draft) => {
      draft.monitoring[listName] = [...draft.monitoring[listName], { address: '', description: '', enabled: true }];
      return draft;
    });
  };

  const updateMonitoringTarget = (formType, listName, index, field, value) => {
    applyFormUpdate(formType, (draft) => {
      draft.monitoring[listName][index][field] = value;
      return draft;
    });
  };

  const removeMonitoringTarget = (formType, listName, index) => {
    applyFormUpdate(formType, (draft) => {
      draft.monitoring[listName] = draft.monitoring[listName].filter((_entry, entryIndex) => entryIndex !== index);
      return draft;
    });
  };

  const addOspfInterfaceTemplate = (formType) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.interfaceTemplates = [
        ...draft.ospf.interfaceTemplates,
        { name: '', network: '', cost: '', priority: '', passive: false, comment: '' }
      ];
      return draft;
    });
  };

  const updateOspfInterfaceTemplate = (formType, index, field, value) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.interfaceTemplates[index][field] = value;
      return draft;
    });
  };

  const removeOspfInterfaceTemplate = (formType, index) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.interfaceTemplates = draft.ospf.interfaceTemplates.filter(
        (_entry, entryIndex) => entryIndex !== index
      );
      return draft;
    });
  };

  const addOspfArea = (formType) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.areas = [...draft.ospf.areas, { name: '', areaId: '', type: '', authentication: '', comment: '' }];
      return draft;
    });
  };

  const updateOspfArea = (formType, index, field, value) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.areas[index][field] = value;
      return draft;
    });
  };

  const removeOspfArea = (formType, index) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.areas = draft.ospf.areas.filter((_entry, entryIndex) => entryIndex !== index);
      return draft;
    });
  };

  const addOspfNeighbor = (formType) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.neighbors = [
        ...draft.ospf.neighbors,
        { name: '', address: '', interface: '', priority: '', pollInterval: '', state: '', comment: '' }
      ];
      return draft;
    });
  };
  const updateOspfNeighbor = (formType, index, field, value) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.neighbors[index][field] = value;
      return draft;
    });
  };

  const removeOspfNeighbor = (formType, index) => {
    applyFormUpdate(formType, (draft) => {
      draft.ospf.neighbors = draft.ospf.neighbors.filter((_entry, entryIndex) => entryIndex !== index);
      return draft;
    });
  };

  const handleSecretGenerate = async (formType) => {
    let usedFallback = false;
    let generatedAt = new Date().toISOString();
    let secret = '';

    try {
      const response = await fetch('/api/tools/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bytes: 48, encoding: 'base64url' })
      });

      if (!response.ok) {
        throw new Error('Secret generator API unavailable');
      }

      const payload = await response.json();
      if (!payload?.secret) {
        throw new Error('Secret generator API returned an invalid response');
      }

      secret = payload.secret;
      generatedAt = payload.generatedAt ?? new Date().toISOString();
    } catch (error) {
      console.warn('Falling back to local secret generation', error);
      secret = generateSecretKey();
      generatedAt = new Date().toISOString();
      usedFallback = true;
    }

    if (!secret) {
      secret = generateSecretKey();
      generatedAt = new Date().toISOString();
      usedFallback = true;
    }

    applyFormUpdate(formType, (draft) => {
      draft.profile.secret = secret;
      draft.profile.secretEnabled = true;
      draft.profile.secretLastGeneratedAt = generatedAt;
      return draft;
    });

    if (usedFallback) {
      setStatus({
        type: 'warning',
        message:
          'Secret generated locally because the API generator was unavailable. Review backend logs if this persists.'
      });
    }
  };

  const refreshTunnels = async () => {
    try {
      const response = await fetch('/api/tunnels');
      if (!response.ok) {
        throw new Error('Unable to refresh tunnels.');
      }
      const payload = await response.json();
      setTunnels(Array.isArray(payload?.tunnels) ? payload.tunnels : []);
      setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
      setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh the tunnels list right now.' });
    }
  };

  const handleCreateTunnel = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/tunnels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to create the tunnel.';
        throw new Error(message);
      }

      if (payload?.tunnel) {
        setTunnels((current) => [...current, payload.tunnel]);
      } else {
        await refreshTunnels();
      }

      setStatus({ type: 'success', message: 'Tunnel created successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyTunnelForm());
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUpdateTunnel = async (event) => {
    event.preventDefault();
    if (!manageState.tunnelId) {
      return;
    }

    setManageBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/tunnels/${manageState.tunnelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload(manageState.form))
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to update the tunnel.';
        throw new Error(message);
      }

      if (payload?.tunnel) {
        setTunnels((current) => current.map((entry) => (entry.id === payload.tunnel.id ? payload.tunnel : entry)));
      } else {
        await refreshTunnels();
      }

      setStatus({ type: 'success', message: 'Tunnel updated successfully.' });
      resetManageState();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageBusy(false);
    }
  };

  const handleDeleteTunnel = async () => {
    if (!manageState.tunnelId) {
      return;
    }

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/tunnels/${manageState.tunnelId}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected tunnel.';
        throw new Error(message);
      }

      setTunnels((current) => current.filter((entry) => entry.id !== manageState.tunnelId));
      setStatus({ type: 'success', message: 'Tunnel removed successfully.' });
      resetManageState();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  const runDiagnostics = async (type) => {
    if (!manageState.tunnelId) {
      return;
    }

    const listName = type === 'ping' ? 'pingTargets' : 'traceTargets';
    const targets = manageState.form.monitoring[listName]
      .filter((target) => target.enabled !== false && target.address && target.address.trim())
      .map((target) => target.address.trim());

    if (targets.length === 0) {
      setDiagnosticsState((current) => ({ ...current, error: 'No enabled targets are defined for diagnostics.' }));
      return;
    }

    setDiagnosticsState({ running: true, ping: diagnosticsState.ping, trace: diagnosticsState.trace, error: '' });

    try {
      const response = await fetch(`/api/tools/${type === 'ping' ? 'ping' : 'traceroute'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tunnelId: manageState.tunnelId, targets })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Diagnostics request failed.';
        throw new Error(message);
      }

      const results = Array.isArray(payload?.results) ? payload.results : [];
      setDiagnosticsState((current) => ({
        running: false,
        ping: type === 'ping' ? results : current.ping,
        trace: type === 'ping' ? current.trace : results,
        error: ''
      }));

      if (type === 'ping') {
        updateManageForm((draft) => {
          draft.monitoring.lastPingResults = results;
          draft.monitoring.lastUpdatedAt = new Date().toISOString();
          return draft;
        });
      } else {
        updateManageForm((draft) => {
          draft.monitoring.lastTraceResults = results;
          draft.monitoring.lastUpdatedAt = new Date().toISOString();
          return draft;
        });
      }

      await refreshTunnels();
    } catch (error) {
      setDiagnosticsState((current) => ({ ...current, running: false, error: error.message }));
    }
  };

  const renderMonitoringResults = (results) => {
    if (!Array.isArray(results) || results.length === 0) {
      return <p className="subtle-text">No diagnostic history yet.</p>;
    }

    return (
      <ul className="diagnostics-list">
        {results.map((result, index) => (
          <li key={`${result.address}-${index}`}>
            <div className="diagnostics-list__header">
              <span className="diagnostics-list__target">{result.address}</span>
              <span className={`status-pill status-pill--${result.success ? 'up' : 'down'}`}>
                {result.success ? 'Success' : 'Failure'}
              </span>
              <span className="diagnostics-list__timestamp">{formatDateTime(result.checkedAt)}</span>
            </div>
            {result.latencyMs !== null && result.latencyMs !== undefined ? (
              <span className="diagnostics-list__meta">Average latency: {result.latencyMs} ms</span>
            ) : null}
            {Array.isArray(result.hops) && result.hops.length > 0 ? (
              <div className="diagnostics-list__trace">
                {result.hops.map((hop, hopIndex) => (
                  <span key={`${result.address}-hop-${hopIndex}`}>
                    {hop.hop}. {hop.address || '*'} {hop.latencyMs !== null && hop.latencyMs !== undefined ? `${hop.latencyMs} ms` : ''}
                  </span>
                ))}
              </div>
            ) : null}
            {result.output ? <pre className="diagnostics-output">{result.output}</pre> : null}
          </li>
        ))}
      </ul>
    );
  };
  const renderTunnelForm = (formType, form, options = {}) => {
    const isManage = options.manage === true;
    const sectionState = sectionVisibility[formType] ?? createDefaultSectionState();

    return (
      <>
        <section className="form-section">
          <h2>General details</h2>
          <div className="form-section__grid">
            <label>
              <span>Name</span>
              <input
                name="name"
                value={form.name}
                onChange={(event) => handleTopLevelChange(formType, event)}
                required
              />
            </label>
            <label>
              <span>Connection type</span>
              <select
                name="connectionType"
                value={form.connectionType}
                onChange={(event) => handleConnectionTypeChange(formType, event.target.value)}
              >
                {tunnelTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select name="status" value={form.status} onChange={(event) => handleTopLevelChange(formType, event)}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Group</span>
              <select name="groupId" value={form.groupId} onChange={(event) => handleTopLevelChange(formType, event)}>
                <option value="">No group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Source Mikrotik</span>
              <select name="sourceId" value={form.sourceId} onChange={(event) => handleTopLevelChange(formType, event)} required>
                <option value="">Select a Mikrotik</option>
                {mikrotiks.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Target Mikrotik</span>
              <select name="targetId" value={form.targetId} onChange={(event) => handleTopLevelChange(formType, event)} required>
                <option value="">Select a Mikrotik</option>
                {mikrotiks.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                name="enabled"
                checked={form.enabled}
                onChange={(event) => handleTopLevelChange(formType, event)}
              />
              <span>Enabled</span>
            </label>
            <label>
              <span>Latency (ms)</span>
              <input
                name="latencyMs"
                type="number"
                min="0"
                value={form.latencyMs}
                onChange={(event) => handleTopLevelChange(formType, event)}
              />
            </label>
            <label>
              <span>Packet loss (%)</span>
              <input
                name="packetLoss"
                type="number"
                min="0"
                max="100"
                value={form.packetLoss}
                onChange={(event) => handleTopLevelChange(formType, event)}
              />
            </label>
            <label>
              <span>Last checked at</span>
              <input
                name="lastCheckedAt"
                type="datetime-local"
                value={form.lastCheckedAt}
                onChange={(event) => handleTopLevelChange(formType, event)}
              />
            </label>
            <label className="wide">
              <span>Tags</span>
              <input
                name="tags"
                value={form.tags}
                onChange={(event) => handleTopLevelChange(formType, event)}
                placeholder="core, backbone, test"
              />
            </label>
            <label className="wide">
              <span>Notes</span>
              <textarea name="notes" value={form.notes} onChange={(event) => handleTopLevelChange(formType, event)} rows={3} />
            </label>
          </div>
        </section>

        <CollapsibleSection
          label="Tunnel profile"
          checked={sectionState.profile}
          onToggle={(value) => handleSectionToggle(formType, 'profile', value)}
        >
          <div className="form-section__grid">
            <label>
              <span>Secret</span>
              <div className="inline-input-group">
                <input
                  value={form.profile.secret}
                  onChange={(event) => handleProfileFieldChange(formType, 'secret', event.target.value)}
                  placeholder="Shared secret"
                />
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  onClick={() => handleSecretGenerate(formType)}
                >
                  Generate
                </button>
              </div>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.profile.secretEnabled}
                onChange={(event) => handleProfileFieldChange(formType, 'secretEnabled', event.target.checked)}
              />
              <span>Use secret</span>
            </label>
            <label>
              <span>Secret generated at</span>
              <input
                type="text"
                value={form.profile.secretLastGeneratedAt}
                onChange={(event) => handleProfileFieldChange(formType, 'secretLastGeneratedAt', event.target.value)}
                placeholder="Auto-filled when generating"
              />
            </label>
            <label>
              <span>Tunnel ID (EoIP)</span>
              <input
                type="number"
                min="1"
                value={form.profile.tunnelId}
                onChange={(event) => handleProfileFieldChange(formType, 'tunnelId', event.target.value)}
              />
            </label>
            <label>
              <span>MTU</span>
              <input
                type="number"
                min="296"
                value={form.profile.mtu}
                onChange={(event) => handleProfileFieldChange(formType, 'mtu', event.target.value)}
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.profile.allowFastPath}
                onChange={(event) => handleProfileFieldChange(formType, 'allowFastPath', event.target.checked)}
              />
              <span>Allow fast path</span>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.profile.keepAlive.enabled}
                onChange={(event) => handleProfileFieldChange(formType, 'keepAlive.enabled', event.target.checked)}
              />
              <span>Enable keepalive</span>
            </label>
            <label>
              <span>Keepalive timeout (s)</span>
              <input
                type="number"
                min="1"
                value={form.profile.keepAlive.timeout}
                onChange={(event) => handleProfileFieldChange(formType, 'keepAlive.timeout', event.target.value)}
              />
            </label>
            <label>
              <span>Keepalive retries</span>
              <input
                type="number"
                min="0"
                value={form.profile.keepAlive.retryCount}
                onChange={(event) => handleProfileFieldChange(formType, 'keepAlive.retryCount', event.target.value)}
              />
            </label>
            <label>
              <span>Keepalive hold timer (s)</span>
              <input
                type="number"
                min="1"
                value={form.profile.keepAlive.holdTimer}
                onChange={(event) => handleProfileFieldChange(formType, 'keepAlive.holdTimer', event.target.value)}
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.profile.failover.disableSecretOnFailure}
                onChange={(event) => handleProfileFieldChange(formType, 'failover.disableSecretOnFailure', event.target.checked)}
              />
              <span>Disable secret when tunnel is down</span>
            </label>
            <label>
              <span>Failover attempts</span>
              <input
                type="number"
                min="1"
                value={form.profile.failover.maxAttempts}
                onChange={(event) => handleProfileFieldChange(formType, 'failover.maxAttempts', event.target.value)}
              />
            </label>
            <div className="wide">
              <span>Failover candidates</span>
              <div className="inline-checkboxes">
                {failoverCandidateOptions.map((candidate) => (
                  <label key={candidate}>
                    <input
                      type="checkbox"
                      checked={form.profile.failover.candidateKinds.includes(candidate)}
                      onChange={(event) => toggleFailoverCandidate(formType, candidate, event.target.checked)}
                    />
                    <span>{formatCandidateLabel(candidate)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="wide">
              <span>Provisioning preference</span>
              <div className="inline-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={form.profile.provisioning.viaApi}
                    onChange={(event) => handleProfileFieldChange(formType, 'provisioning.viaApi', event.target.checked)}
                  />
                  <span>Allow API</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.profile.provisioning.viaSsh}
                    onChange={(event) => handleProfileFieldChange(formType, 'provisioning.viaSsh', event.target.checked)}
                  />
                  <span>Allow SSH</span>
                </label>
                <label>
                  <span className="sr-only">Preferred method</span>
                  <select
                    value={form.profile.provisioning.preferred}
                    onChange={(event) => handleProfileFieldChange(formType, 'provisioning.preferred', event.target.value)}
                  >
                    <option value="hybrid">Hybrid</option>
                    <option value="api">API first</option>
                    <option value="ssh">SSH first</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          label="Addressing & endpoints"
          checked={sectionState.addressing || sectionState.sourceEndpoint || sectionState.targetEndpoint}
          onToggle={(value) => {
            handleSectionToggle(formType, 'addressing', value);
            if (!value) {
              handleSectionToggle(formType, 'sourceEndpoint', false);
              handleSectionToggle(formType, 'targetEndpoint', false);
            }
          }}
          description="IP assignments and device snapshots"
        >
          <div className="form-section__grid">
            <label>
              <span>Local address</span>
              <input
                value={form.profile.addressing.localAddress}
                onChange={(event) => handleProfileFieldChange(formType, 'addressing.localAddress', event.target.value)}
                placeholder="192.0.2.1"
              />
            </label>
            <label>
              <span>Remote address</span>
              <input
                value={form.profile.addressing.remoteAddress}
                onChange={(event) => handleProfileFieldChange(formType, 'addressing.remoteAddress', event.target.value)}
                placeholder="198.51.100.1"
              />
            </label>
            <label>
              <span>Local tunnel IP</span>
              <input
                value={form.profile.addressing.localTunnelIp}
                onChange={(event) => handleProfileFieldChange(formType, 'addressing.localTunnelIp', event.target.value)}
                placeholder="10.0.0.1/30"
              />
            </label>
            <label>
              <span>Remote tunnel IP</span>
              <input
                value={form.profile.addressing.remoteTunnelIp}
                onChange={(event) => handleProfileFieldChange(formType, 'addressing.remoteTunnelIp', event.target.value)}
                placeholder="10.0.0.2/30"
              />
            </label>
            <label>
              <span>Local IPAM pool</span>
              <input
                value={form.profile.addressing.localIpamPool}
                onChange={(event) => handleProfileFieldChange(formType, 'addressing.localIpamPool', event.target.value)}
                placeholder="pool-branch-a"
              />
            </label>
            <label>
              <span>Remote IPAM pool</span>
              <input
                value={form.profile.addressing.remoteIpamPool}
                onChange={(event) => handleProfileFieldChange(formType, 'addressing.remoteIpamPool', event.target.value)}
                placeholder="pool-branch-b"
              />
            </label>
            <label className="wide">
              <span>Remarks</span>
              <textarea
                value={form.profile.remarks}
                onChange={(event) => handleProfileFieldChange(formType, 'remarks', event.target.value)}
                rows={2}
              />
            </label>
          </div>

          <CollapsibleSubSection
            label="Source endpoint snapshot"
            checked={sectionState.sourceEndpoint}
            onToggle={(value) => handleSectionToggle(formType, 'sourceEndpoint', value)}
          >
            <label className="wide">
              <span>Identity</span>
              <input
                value={form.profile.endpoints.source.identity}
                onChange={(event) => handleProfileFieldChange(formType, 'endpoints.source.identity', event.target.value)}
              />
            </label>
            <div className="editable-list">
              {form.profile.endpoints.source.interfaces.map((item, index) => (
                <div key={`source-interface-${index}`} className="editable-list__row">
                  <label>
                    <span>Name</span>
                    <input
                      value={item.name}
                      onChange={(event) => updateEndpointInterface(formType, 'source', index, 'name', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Type</span>
                    <input
                      value={item.type}
                      onChange={(event) => updateEndpointInterface(formType, 'source', index, 'type', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>MAC address</span>
                    <input
                      value={item.macAddress}
                      onChange={(event) => updateEndpointInterface(formType, 'source', index, 'macAddress', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>ARP mode</span>
                    <input
                      value={item.arp}
                      onChange={(event) => updateEndpointInterface(formType, 'source', index, 'arp', event.target.value)}
                      placeholder="enabled"
                    />
                  </label>
                  <label>
                    <span>MTU</span>
                    <input
                      type="number"
                      value={item.mtu}
                      onChange={(event) => updateEndpointInterface(formType, 'source', index, 'mtu', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={item.comment}
                      onChange={(event) => updateEndpointInterface(formType, 'source', index, 'comment', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeEndpointInterface(formType, 'source', index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addEndpointInterface(formType, 'source')}
              >
                Add interface
              </button>
            </div>

            <h4>Routing table</h4>
            <div className="editable-list">
              {form.profile.endpoints.source.routingTable.map((item, index) => (
                <div key={`source-route-${index}`} className="editable-list__row">
                  <label>
                    <span>Destination</span>
                    <input
                      value={item.destination}
                      onChange={(event) => updateEndpointRoute(formType, 'source', index, 'destination', event.target.value)}
                      placeholder="0.0.0.0/0"
                    />
                  </label>
                  <label>
                    <span>Gateway</span>
                    <input
                      value={item.gateway}
                      onChange={(event) => updateEndpointRoute(formType, 'source', index, 'gateway', event.target.value)}
                      placeholder="10.0.0.2"
                    />
                  </label>
                  <label>
                    <span>Interface</span>
                    <input
                      value={item.interface}
                      onChange={(event) => updateEndpointRoute(formType, 'source', index, 'interface', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Distance</span>
                    <input
                      type="number"
                      value={item.distance}
                      onChange={(event) => updateEndpointRoute(formType, 'source', index, 'distance', event.target.value)}
                    />
                  </label>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(event) => updateEndpointRoute(formType, 'source', index, 'active', event.target.checked)}
                    />
                    <span>Active</span>
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={item.comment}
                      onChange={(event) => updateEndpointRoute(formType, 'source', index, 'comment', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeEndpointRoute(formType, 'source', index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addEndpointRoute(formType, 'source')}
              >
                Add route
              </button>
            </div>
          </CollapsibleSubSection>

          <CollapsibleSubSection
            label="Target endpoint snapshot"
            checked={sectionState.targetEndpoint}
            onToggle={(value) => handleSectionToggle(formType, 'targetEndpoint', value)}
          >
            <label className="wide">
              <span>Identity</span>
              <input
                value={form.profile.endpoints.target.identity}
                onChange={(event) => handleProfileFieldChange(formType, 'endpoints.target.identity', event.target.value)}
              />
            </label>
            <div className="editable-list">
              {form.profile.endpoints.target.interfaces.map((item, index) => (
                <div key={`target-interface-${index}`} className="editable-list__row">
                  <label>
                    <span>Name</span>
                    <input
                      value={item.name}
                      onChange={(event) => updateEndpointInterface(formType, 'target', index, 'name', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Type</span>
                    <input
                      value={item.type}
                      onChange={(event) => updateEndpointInterface(formType, 'target', index, 'type', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>MAC address</span>
                    <input
                      value={item.macAddress}
                      onChange={(event) => updateEndpointInterface(formType, 'target', index, 'macAddress', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>ARP mode</span>
                    <input
                      value={item.arp}
                      onChange={(event) => updateEndpointInterface(formType, 'target', index, 'arp', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>MTU</span>
                    <input
                      type="number"
                      value={item.mtu}
                      onChange={(event) => updateEndpointInterface(formType, 'target', index, 'mtu', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={item.comment}
                      onChange={(event) => updateEndpointInterface(formType, 'target', index, 'comment', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeEndpointInterface(formType, 'target', index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addEndpointInterface(formType, 'target')}
              >
                Add interface
              </button>
            </div>

            <h4>Routing table</h4>
            <div className="editable-list">
              {form.profile.endpoints.target.routingTable.map((item, index) => (
                <div key={`target-route-${index}`} className="editable-list__row">
                  <label>
                    <span>Destination</span>
                    <input
                      value={item.destination}
                      onChange={(event) => updateEndpointRoute(formType, 'target', index, 'destination', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Gateway</span>
                    <input
                      value={item.gateway}
                      onChange={(event) => updateEndpointRoute(formType, 'target', index, 'gateway', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Interface</span>
                    <input
                      value={item.interface}
                      onChange={(event) => updateEndpointRoute(formType, 'target', index, 'interface', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Distance</span>
                    <input
                      type="number"
                      value={item.distance}
                      onChange={(event) => updateEndpointRoute(formType, 'target', index, 'distance', event.target.value)}
                    />
                  </label>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(event) => updateEndpointRoute(formType, 'target', index, 'active', event.target.checked)}
                    />
                    <span>Active</span>
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={item.comment}
                      onChange={(event) => updateEndpointRoute(formType, 'target', index, 'comment', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeEndpointRoute(formType, 'target', index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addEndpointRoute(formType, 'target')}
              >
                Add route
              </button>
            </div>
          </CollapsibleSubSection>
        </CollapsibleSection>

        <CollapsibleSection
          label="Monitoring"
          checked={sectionState.monitoring}
          onToggle={(value) => handleSectionToggle(formType, 'monitoring', value)}
          description="Ping and trace configuration"
        >
          <div className="form-section__grid">
            <div className="wide">
              <span>Ping targets</span>
              <div className="editable-list">
                {form.monitoring.pingTargets.map((target, index) => (
                  <div key={`ping-target-${index}`} className="editable-list__row">
                    <label>
                      <span>Address</span>
                      <input
                        value={target.address}
                        onChange={(event) => updateMonitoringTarget(formType, 'pingTargets', index, 'address', event.target.value)}
                        placeholder="8.8.8.8"
                      />
                    </label>
                    <label>
                      <span>Description</span>
                      <input
                        value={target.description}
                        onChange={(event) =>
                          updateMonitoringTarget(formType, 'pingTargets', index, 'description', event.target.value)
                        }
                        placeholder="Google DNS"
                      />
                    </label>
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={target.enabled}
                        onChange={(event) =>
                          updateMonitoringTarget(formType, 'pingTargets', index, 'enabled', event.target.checked)
                        }
                      />
                      <span>Enabled</span>
                    </label>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={() => removeMonitoringTarget(formType, 'pingTargets', index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  onClick={() => addMonitoringTarget(formType, 'pingTargets')}
                >
                  Add ping target
                </button>
              </div>
            </div>

            <div className="wide">
              <span>Traceroute targets</span>
              <div className="editable-list">
                {form.monitoring.traceTargets.map((target, index) => (
                  <div key={`trace-target-${index}`} className="editable-list__row">
                    <label>
                      <span>Address</span>
                      <input
                        value={target.address}
                        onChange={(event) =>
                          updateMonitoringTarget(formType, 'traceTargets', index, 'address', event.target.value)
                        }
                        placeholder="1.1.1.1"
                      />
                    </label>
                    <label>
                      <span>Description</span>
                      <input
                        value={target.description}
                        onChange={(event) =>
                          updateMonitoringTarget(formType, 'traceTargets', index, 'description', event.target.value)
                        }
                      />
                    </label>
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={target.enabled}
                        onChange={(event) =>
                          updateMonitoringTarget(formType, 'traceTargets', index, 'enabled', event.target.checked)
                        }
                      />
                      <span>Enabled</span>
                    </label>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={() => removeMonitoringTarget(formType, 'traceTargets', index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  onClick={() => addMonitoringTarget(formType, 'traceTargets')}
                >
                  Add traceroute target
                </button>
              </div>
            </div>
          </div>

          {isManage ? (
            <div className="diagnostics-actions">
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => runDiagnostics('ping')}
                disabled={diagnosticsState.running}
              >
                {diagnosticsState.running ? 'Running…' : 'Run ping diagnostics'}
              </button>
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => runDiagnostics('trace')}
                disabled={diagnosticsState.running}
              >
                {diagnosticsState.running ? 'Running…' : 'Run traceroute diagnostics'}
              </button>
              {diagnosticsState.error ? (
                <p className="page-status page-status--error diagnostics-error">{diagnosticsState.error}</p>
              ) : null}
              <div className="diagnostics-history">
                <h4>Recent ping results</h4>
                {renderMonitoringResults(manageState.form.monitoring.lastPingResults)}
                <h4>Recent traceroute results</h4>
                {renderMonitoringResults(manageState.form.monitoring.lastTraceResults)}
              </div>
            </div>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          label="OSPF"
          checked={sectionState.ospf}
          onToggle={(value) => handleSectionToggle(formType, 'ospf', value)}
        >
          <div className="form-section__grid">
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.ospf.enabled}
                onChange={(event) => handleOspfFieldChange(formType, 'enabled', event.target.checked)}
              />
              <span>Enable OSPF</span>
            </label>
            <label>
              <span>Instance name</span>
              <input
                value={form.ospf.instance.name}
                onChange={(event) => handleOspfFieldChange(formType, 'instance.name', event.target.value)}
              />
            </label>
            <label>
              <span>Router ID</span>
              <input
                value={form.ospf.instance.routerId}
                onChange={(event) => handleOspfFieldChange(formType, 'instance.routerId', event.target.value)}
                placeholder="10.255.255.1"
              />
            </label>
            <label>
              <span>Version</span>
              <select
                value={form.ospf.instance.version}
                onChange={(event) => handleOspfFieldChange(formType, 'instance.version', event.target.value)}
              >
                <option value="v2">OSPFv2</option>
                <option value="v3">OSPFv3</option>
              </select>
            </label>
            <label>
              <span>Area ID</span>
              <input
                value={form.ospf.instance.areaId}
                onChange={(event) => handleOspfFieldChange(formType, 'instance.areaId', event.target.value)}
                placeholder="0.0.0.0"
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={form.ospf.instance.redistributeDefaultRoute}
                onChange={(event) =>
                  handleOspfFieldChange(formType, 'instance.redistributeDefaultRoute', event.target.checked)
                }
              />
              <span>Redistribute default route</span>
            </label>
            <label>
              <span>Default metric</span>
              <input
                type="number"
                value={form.ospf.instance.metric}
                onChange={(event) => handleOspfFieldChange(formType, 'instance.metric', event.target.value)}
              />
            </label>
            <label>
              <span>Reference bandwidth</span>
              <input
                type="number"
                value={form.ospf.instance.referenceBandwidth}
                onChange={(event) => handleOspfFieldChange(formType, 'instance.referenceBandwidth', event.target.value)}
              />
            </label>
          </div>

          <div className="form-subsection">
            <h3>Interface templates</h3>
            <div className="editable-list">
              {form.ospf.interfaceTemplates.map((template, index) => (
                <div key={`ospf-template-${index}`} className="editable-list__row">
                  <label>
                    <span>Name</span>
                    <input
                      value={template.name}
                      onChange={(event) => updateOspfInterfaceTemplate(formType, index, 'name', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Network</span>
                    <input
                      value={template.network}
                      onChange={(event) => updateOspfInterfaceTemplate(formType, index, 'network', event.target.value)}
                      placeholder="10.0.0.0/30"
                    />
                  </label>
                  <label>
                    <span>Cost</span>
                    <input
                      type="number"
                      value={template.cost}
                      onChange={(event) => updateOspfInterfaceTemplate(formType, index, 'cost', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Priority</span>
                    <input
                      type="number"
                      value={template.priority}
                      onChange={(event) => updateOspfInterfaceTemplate(formType, index, 'priority', event.target.value)}
                    />
                  </label>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={template.passive}
                      onChange={(event) => updateOspfInterfaceTemplate(formType, index, 'passive', event.target.checked)}
                    />
                    <span>Passive</span>
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={template.comment}
                      onChange={(event) => updateOspfInterfaceTemplate(formType, index, 'comment', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeOspfInterfaceTemplate(formType, index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addOspfInterfaceTemplate(formType)}
              >
                Add template
              </button>
            </div>
          </div>

          <div className="form-subsection">
            <h3>Areas</h3>
            <div className="editable-list">
              {form.ospf.areas.map((area, index) => (
                <div key={`ospf-area-${index}`} className="editable-list__row">
                  <label>
                    <span>Name</span>
                    <input value={area.name} onChange={(event) => updateOspfArea(formType, index, 'name', event.target.value)} />
                  </label>
                  <label>
                    <span>Area ID</span>
                    <input
                      value={area.areaId}
                      onChange={(event) => updateOspfArea(formType, index, 'areaId', event.target.value)}
                      placeholder="0.0.0.1"
                    />
                  </label>
                  <label>
                    <span>Type</span>
                    <input value={area.type} onChange={(event) => updateOspfArea(formType, index, 'type', event.target.value)} />
                  </label>
                  <label>
                    <span>Authentication</span>
                    <input
                      value={area.authentication}
                      onChange={(event) => updateOspfArea(formType, index, 'authentication', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Comment</span>
                    <input value={area.comment} onChange={(event) => updateOspfArea(formType, index, 'comment', event.target.value)} />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeOspfArea(formType, index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addOspfArea(formType)}
              >
                Add area
              </button>
            </div>
          </div>

          <div className="form-subsection">
            <h3>Neighbors</h3>
            <div className="editable-list">
              {form.ospf.neighbors.map((neighbor, index) => (
                <div key={`ospf-neighbor-${index}`} className="editable-list__row">
                  <label>
                    <span>Name</span>
                    <input
                      value={neighbor.name}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'name', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Address</span>
                    <input
                      value={neighbor.address}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'address', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Interface</span>
                    <input
                      value={neighbor.interface}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'interface', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Priority</span>
                    <input
                      type="number"
                      value={neighbor.priority}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'priority', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Poll interval</span>
                    <input
                      type="number"
                      value={neighbor.pollInterval}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'pollInterval', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>State</span>
                    <input
                      value={neighbor.state}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'state', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={neighbor.comment}
                      onChange={(event) => updateOspfNeighbor(formType, index, 'comment', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => removeOspfNeighbor(formType, index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={() => addOspfNeighbor(formType)}
              >
                Add neighbor
              </button>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          label="VPN profiles"
          checked={sectionState.vpn}
          onToggle={(value) => handleSectionToggle(formType, 'vpn', value)}
          description="PPTP, L2TP, OpenVPN and WireGuard options"
        >
          {['pptp', 'l2tp', 'openvpn', 'wireguard'].map((key) => (
            <div key={key} className="vpn-group">
              <h3>{key.toUpperCase()}</h3>
              <div className="vpn-columns">
                <div className="vpn-column">
                  <h4>Server</h4>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={form.vpnProfiles[key].server.enabled}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.enabled`, event.target.checked)
                      }
                    />
                    <span>Enabled</span>
                  </label>
                  <label>
                    <span>Interface</span>
                    <input
                      value={form.vpnProfiles[key].server.interface}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.interface`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Profile</span>
                    <input
                      value={form.vpnProfiles[key].server.profile}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.profile`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Listen port</span>
                    <input
                      type="number"
                      value={form.vpnProfiles[key].server.listenPort}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.listenPort`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Username</span>
                    <input
                      value={form.vpnProfiles[key].server.username}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.username`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      value={form.vpnProfiles[key].server.password}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.password`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Allowed addresses</span>
                    <input
                      value={form.vpnProfiles[key].server.allowedAddresses}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.allowedAddresses`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={form.vpnProfiles[key].server.comment}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.server.comment`, event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="vpn-column">
                  <h4>Client</h4>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={form.vpnProfiles[key].client.enabled}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.enabled`, event.target.checked)
                      }
                    />
                    <span>Enabled</span>
                  </label>
                  <label>
                    <span>Server address</span>
                    <input
                      value={form.vpnProfiles[key].client.serverAddress}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.serverAddress`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Interface</span>
                    <input
                      value={form.vpnProfiles[key].client.interface}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.interface`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Profile</span>
                    <input
                      value={form.vpnProfiles[key].client.profile}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.profile`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Username</span>
                    <input
                      value={form.vpnProfiles[key].client.username}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.username`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      value={form.vpnProfiles[key].client.password}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.password`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Endpoint</span>
                    <input
                      value={form.vpnProfiles[key].client.endpoint}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.endpoint`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Persistent keepalive</span>
                    <input
                      type="number"
                      value={form.vpnProfiles[key].client.persistentKeepalive}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.persistentKeepalive`, event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Comment</span>
                    <input
                      value={form.vpnProfiles[key].client.comment}
                      onChange={(event) =>
                        handleVpnFieldChange(formType, `${key}.client.comment`, event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      </>
    );
  };
  return (
    <div className="management-page">
      <div className="management-toolbar">
        <div>
          <h1>Tunnels</h1>
          <p className="management-description">
            Model inter-site connectivity, monitor latency, and keep RouterOS peers aligned with their intended configuration.
          </p>
        </div>
        <div className="toolbar-actions">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name, endpoint, group, or tag"
            className="toolbar-filter"
          />
          <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
            Add tunnel
          </button>
        </div>
      </div>

      {status.message ? <p className={`page-status page-status--${status.type}`}>{status.message}</p> : null}

      {loading ? (
        <p>Loading tunnels…</p>
      ) : filteredTunnels.length === 0 ? (
        <p>No tunnels have been defined yet.</p>
      ) : (
        <ul className="management-list" aria-live="polite">
          {filteredTunnels.map((entry) => (
            <li key={entry.id} className="management-list__item">
              <div className="management-list__summary">
                <span className="management-list__title">{entry.name}</span>
                <div className="management-list__meta">
                  <span>
                    {entry.sourceName || 'Unknown source'} → {entry.targetName || 'Unknown target'}
                  </span>
                  <span>{entry.groupName ? `Group: ${entry.groupName}` : 'No group assigned'}</span>
                  <span>Type: {entry.connectionType || entry.profile?.kind?.toUpperCase() || 'Unknown'}</span>
                  <span>
                    Secret: {entry.profile?.secretEnabled ? 'Enabled' : entry.profile?.secret ? 'Stored (disabled)' : 'Not set'}
                  </span>
                  <span>
                    Keepalive:{' '}
                    {entry.profile?.keepAlive?.enabled
                      ? `${entry.profile.keepAlive.timeout ?? '—'} s`
                      : 'Disabled'}
                  </span>
                  <span className={`status-pill status-pill--${entry.status}`}>{entry.status}</span>
                  <span>
                    Latency:{' '}
                    {entry.metrics?.latencyMs !== null && entry.metrics?.latencyMs !== undefined
                      ? `${entry.metrics.latencyMs} ms`
                      : '—'}
                  </span>
                  <span>
                    Packet loss:{' '}
                    {entry.metrics?.packetLoss !== null && entry.metrics?.packetLoss !== undefined
                      ? `${entry.metrics.packetLoss}%`
                      : '—'}
                  </span>
                  <span>
                    Tunnel IPs:{' '}
                    {entry.profile?.addressing?.localTunnelIp || '—'} ↔ {entry.profile?.addressing?.remoteTunnelIp || '—'}
                  </span>
                </div>
              </div>
              <div className="management-list__actions">
                <button type="button" className="action-button" onClick={() => openManageModal(entry)}>
                  Manage
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        title="Add tunnel"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: () => setCreateOpen(false),
            disabled: createBusy
          },
          {
            label: createBusy ? 'Creating…' : 'Create tunnel',
            variant: 'primary',
            type: 'submit',
            form: 'create-tunnel-form',
            disabled: createBusy
          }
        ]}
      >
        <form id="create-tunnel-form" className="form-grid" onSubmit={handleCreateTunnel}>
          {renderTunnelForm('create', createForm)}
        </form>
      </Modal>

      <Modal
        title="Manage tunnel"
        open={manageState.open}
        onClose={resetManageState}
        actions={[
          {
            label: deleteBusy ? 'Deleting…' : 'Delete',
            variant: 'danger',
            onClick: handleDeleteTunnel,
            disabled: manageBusy || deleteBusy
          },
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: resetManageState,
            disabled: manageBusy
          },
          {
            label: manageBusy ? 'Saving…' : 'Save changes',
            variant: 'primary',
            type: 'submit',
            form: 'manage-tunnel-form',
            disabled: manageBusy
          }
        ]}
      >
        <form id="manage-tunnel-form" className="form-grid" onSubmit={handleUpdateTunnel}>
          {renderTunnelForm('manage', manageState.form, { manage: true })}
        </form>
      </Modal>
    </div>
  );
};

export default Tunnels;
