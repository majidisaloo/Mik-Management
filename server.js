const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const net = require('net');

const app = express();
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('foreign_keys = ON');

const PORT = process.env.PORT || 3000;
const TARGET_ROUTEROS_VERSION = '7.14.0';
const DEFAULT_PHPIPAM_TIMEOUT_MS = 7000;

function normalisePhpIpamBaseUrl(baseUrl) {
  if (!baseUrl) {
    return '';
  }
  return baseUrl.replace(/\s+/g, '').replace(/\/?$/, '');
}

function resolvePhpIpamId(record, fallbackKeys = []) {
  if (!record || typeof record !== 'object') {
    return null;
  }
  const keys = ['id', 'ID', 'sectionId', 'sectionID', 'sectionid', 'subnetId', 'subnetID', 'subnetid', 'locationId', 'locationID', 'locationid', ...fallbackKeys];
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key];
    }
  }
  return null;
}

function normalisePhpIpamList(data) {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object') {
    return Object.values(data);
  }
  return [];
}

function intToIpv4(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const unsigned = numeric >>> 0;
  return [unsigned >>> 24, (unsigned >>> 16) & 255, (unsigned >>> 8) & 255, unsigned & 255].join('.');
}

function formatPhpIpamSubnet(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('.')) {
      return value;
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const converted = intToIpv4(numeric);
      return converted || value;
    }
    return value;
  }
  if (typeof value === 'number') {
    return intToIpv4(value);
  }
  return `${value}`;
}

async function phpIpamFetch(ipam, endpoint, options = {}) {
  const baseUrl = normalisePhpIpamBaseUrl(ipam.base_url);
  if (!baseUrl) {
    throw new Error('Missing base URL');
  }
  const appId = ipam.app_id ? encodeURIComponent(ipam.app_id) : null;
  if (!appId) {
    throw new Error('Missing App ID');
  }
  const trimmedEndpoint = (endpoint || '').toString().replace(/^\/+/, '');
  const url = `${baseUrl}/${appId}/${trimmedEndpoint}`;

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mik-Management/1.0',
    'phpipam-token': ipam.app_code || '',
    ...(options.headers || {})
  };

  const allowNotFound = Boolean(options.allowNotFound);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_PHPIPAM_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('phpIPAM request timed out');
    }
    throw new Error(error.message || 'Failed to reach phpIPAM');
  } finally {
    clearTimeout(timeout);
  }

  let payload;
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text ? JSON.parse(text) : {};
    }
  } catch (error) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    throw new Error('Unexpected response from phpIPAM');
  }

  if (!response.ok) {
    if (response.status === 404 && allowNotFound) {
      return [];
    }
    const message = payload && typeof payload === 'object' && payload.message ? payload.message : `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && payload.success === false) {
    if (allowNotFound && /not\s+found/i.test(payload.message || '')) {
      return [];
    }
    throw new Error(payload.message || 'phpIPAM request failed');
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    if (payload.data === null && allowNotFound) {
      return [];
    }
    return payload.data;
  }

  return payload;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const createUserTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;
const createIpamTableQuery = `
  CREATE TABLE IF NOT EXISTS ipam_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_code TEXT NOT NULL,
    app_permissions TEXT DEFAULT 'Read',
    app_security TEXT DEFAULT 'SSL with App code token',
    created_at TEXT NOT NULL,
    last_status TEXT DEFAULT 'unknown',
    last_checked_at TEXT
  );
`;
const createIpamCollectionsTableQuery = `
  CREATE TABLE IF NOT EXISTS ipam_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipam_id INTEGER NOT NULL,
    collection_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    FOREIGN KEY (ipam_id) REFERENCES ipam_integrations(id) ON DELETE CASCADE
  );
`;
const createMikrotikTableQuery = `
  CREATE TABLE IF NOT EXISTS mikrotik_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    api_port INTEGER DEFAULT 8728,
    ssh_port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    routeros_version TEXT DEFAULT '',
    encryption_key TEXT DEFAULT '',
    tunnel_timeout INTEGER DEFAULT 60,
    tunnel_type TEXT DEFAULT 'WireGuard',
    created_at TEXT NOT NULL,
    last_api_status TEXT DEFAULT 'unknown',
    last_ssh_status TEXT DEFAULT 'unknown',
    last_checked_at TEXT
  );
`;
const createMikrotikInterfacesTableQuery = `
  CREATE TABLE IF NOT EXISTS mikrotik_interfaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    address TEXT,
    comment TEXT,
    FOREIGN KEY (device_id) REFERENCES mikrotik_devices(id) ON DELETE CASCADE
  );
`;
const createMikrotikTunnelsTableQuery = `
  CREATE TABLE IF NOT EXISTS mikrotik_tunnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    tunnel_type TEXT NOT NULL,
    encryption TEXT,
    local_cidr TEXT,
    remote_cidr TEXT,
    status TEXT,
    latency_ms REAL,
    last_updated TEXT,
    FOREIGN KEY (device_id) REFERENCES mikrotik_devices(id) ON DELETE CASCADE
  );
`;
const createDnsTableQuery = `
  CREATE TABLE IF NOT EXISTS dns_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    api_endpoint TEXT,
    ptr_zone TEXT,
    created_at TEXT NOT NULL
  );
`;

db.exec(createUserTableQuery);
db.exec(createIpamTableQuery);
db.exec(createIpamCollectionsTableQuery);
db.exec(createMikrotikTableQuery);
db.exec(createMikrotikInterfacesTableQuery);
db.exec(createMikrotikTunnelsTableQuery);
db.exec(createDnsTableQuery);

const groupTree = [
  {
    id: 'root',
    name: 'Mik-Group Root',
    createdAt: '2025-10-13T10:21:00Z',
    children: [
      {
        id: 'dc-1',
        name: 'DataCenter',
        createdAt: '2025-10-13T10:25:00Z',
        children: [
          {
            id: 'ovh',
            name: 'OVH',
            createdAt: '2025-10-13T10:30:00Z',
            children: [
              {
                id: 'ovh-en',
                name: 'EN',
                createdAt: '2025-10-13T10:31:00Z',
                children: [
                  {
                    id: 'ovh-en-host',
                    name: 'OVH-EN-Host',
                    createdAt: '2025-10-13T10:35:00Z',
                    children: []
                  },
                  {
                    id: 'ovh-en-router',
                    name: 'OVH-EN-Router-Range',
                    createdAt: '2025-10-13T10:40:00Z',
                    children: []
                  }
                ]
              },
              {
                id: 'ovh-fr',
                name: 'FR',
                createdAt: '2025-10-13T10:45:00Z',
                children: []
              }
            ]
          }
        ]
      }
    ]
  }
];

function seedInitialData() {
  const ipamCount = db.prepare('SELECT COUNT(*) AS count FROM ipam_integrations').get().count;
  if (ipamCount === 0) {
    const now = new Date().toISOString();
    const insertIpam = db.prepare(`
      INSERT INTO ipam_integrations (name, base_url, app_id, app_code, app_permissions, app_security, created_at, last_status, last_checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const { lastInsertRowid } = insertIpam.run(
      'Core phpIPAM',
      'https://phpipam.example/api',
      'mik-core',
      'sample-app-code',
      'Read/Write',
      'SSL with App code token',
      now,
      'connected',
      now
    );

    const insertCollection = db.prepare(`
      INSERT INTO ipam_collections (ipam_id, collection_type, name, description, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertCollection.run(
      lastInsertRowid,
      'section',
      'Core Infrastructure',
      'Primary routing infrastructure',
      JSON.stringify({ owner: 'Network Team', vlan: 100 })
    );
    insertCollection.run(
      lastInsertRowid,
      'datacenter',
      'OVH - EN',
      'Roubaix EN facility',
      JSON.stringify({ racks: 12, contact: 'noc@ovh.example' })
    );
    insertCollection.run(
      lastInsertRowid,
      'range',
      'Tunnel Range A',
      'Primary /30 pool for automation',
      JSON.stringify({ cidr: '192.0.2.0/30', vlan: 302 })
    );
  }

  const mikrotikCount = db.prepare('SELECT COUNT(*) AS count FROM mikrotik_devices').get().count;
  if (mikrotikCount === 0) {
    const now = new Date().toISOString();
    const insertDevice = db.prepare(`
      INSERT INTO mikrotik_devices (name, host, api_port, ssh_port, username, password, routeros_version, encryption_key, tunnel_timeout, tunnel_type, created_at, last_api_status, last_ssh_status, last_checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const { lastInsertRowid } = insertDevice.run(
      'Mik-Core-R1',
      '10.10.10.1',
      8728,
      22,
      'netops',
      'secure-password',
      '7.14.0',
      'wG-jKf8$9!p2',
      60,
      'WireGuard',
      now,
      'connected',
      'connected',
      now
    );

    const insertInterface = db.prepare(`
      INSERT INTO mikrotik_interfaces (device_id, name, status, address, comment)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertInterface.run(lastInsertRowid, 'ether1', 'up', '203.0.113.10/24', 'WAN uplink');
    insertInterface.run(lastInsertRowid, 'ether2', 'up', '10.0.0.1/24', 'Core LAN');
    insertInterface.run(lastInsertRowid, 'wg-tunnel1', 'up', '192.0.2.1/30', 'Primary tunnel interface');

    const insertTunnel = db.prepare(`
      INSERT INTO mikrotik_tunnels (device_id, name, tunnel_type, encryption, local_cidr, remote_cidr, status, latency_ms, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTunnel.run(
      lastInsertRowid,
      'Core-to-EN',
      'WireGuard',
      'ChaCha20-Poly1305',
      '192.0.2.1/30',
      '192.0.2.2/30',
      'up',
      11.2,
      now
    );
  }

  const dnsCount = db.prepare('SELECT COUNT(*) AS count FROM dns_servers').get().count;
  if (dnsCount === 0) {
    const now = new Date().toISOString();
    const insertDns = db.prepare(`
      INSERT INTO dns_servers (name, ip_address, api_endpoint, ptr_zone, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertDns.run('Authoritative DNS 1', '198.51.100.10', 'https://dns1.example/api', '100.51.198.in-addr.arpa', now);
    insertDns.run('Authoritative DNS 2', '198.51.100.11', 'https://dns2.example/api', '100.51.198.in-addr.arpa', now);
  }
}

seedInitialData();

function getIpams() {
  return db.prepare('SELECT * FROM ipam_integrations ORDER BY created_at DESC').all();
}

function getIpamCollections() {
  const rows = db.prepare('SELECT * FROM ipam_collections ORDER BY name').all();
  return rows.map((row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }));
}

function groupCollectionsByIpam(collections) {
  return collections.reduce((acc, collection) => {
    const key = collection.ipam_id;
    if (!acc[key]) {
      acc[key] = {
        sections: [],
        datacenters: [],
        ranges: []
      };
    }

    if (collection.collection_type === 'section') {
      acc[key].sections.push(collection);
    } else if (collection.collection_type === 'datacenter') {
      acc[key].datacenters.push(collection);
    } else if (collection.collection_type === 'range') {
      acc[key].ranges.push(collection);
    }

    return acc;
  }, {});
}

function getMikrotiks() {
  return db.prepare('SELECT * FROM mikrotik_devices ORDER BY created_at DESC').all();
}

function getMikrotikInterfaces(deviceId) {
  return db.prepare('SELECT * FROM mikrotik_interfaces WHERE device_id = ? ORDER BY name').all(deviceId);
}

function getMikrotikTunnels(deviceId) {
  return db.prepare('SELECT * FROM mikrotik_tunnels WHERE device_id = ? ORDER BY name').all(deviceId);
}

function getDnsServers() {
  return db.prepare('SELECT * FROM dns_servers ORDER BY created_at DESC').all();
}

function buildDashboardModel() {
  const ipams = getIpams();
  const mikrotiks = getMikrotiks();
  const dnsServers = getDnsServers();
  const tunnels = mikrotiks.flatMap((device) =>
    getMikrotikTunnels(device.id).map((tunnel) => ({
      ...tunnel,
      deviceName: device.name
    }))
  );
  const totalMikrotiks = mikrotiks.length;
  const updatedMikrotiks = mikrotiks.filter((device) => device.routeros_version === TARGET_ROUTEROS_VERSION).length;
  const outOfDate = totalMikrotiks - updatedMikrotiks;
  const connectedTunnels = tunnels.filter((tunnel) => tunnel.status === 'up').length;
  const tunnelSummary = {
    total: tunnels.length,
    active: connectedTunnels,
    inactive: tunnels.length - connectedTunnels
  };

  const routingChecks = tunnels.map((tunnel) => ({
    id: `${tunnel.device_id}-${tunnel.name}`,
    source: tunnel.deviceName,
    destination: tunnel.remote_cidr,
    latencyMs: tunnel.latency_ms,
    status: tunnel.status === 'up' ? 'pass' : 'fail',
    path: [tunnel.deviceName, tunnel.name, tunnel.remote_cidr]
  }));

  const firewallSnapshot = mikrotiks.map((device) => ({
    device: device.name,
    rules: [
      {
        action: 'accept',
        description: 'Allow management access from NetOps group',
        appliedTo: 'NetOps VLAN'
      },
      {
        action: 'drop',
        description: 'Block external management attempts',
        appliedTo: 'WAN interfaces'
      }
    ]
  }));

  const routingGraph = {
    nodes: [
      { id: 'Mik-Core-R1', x: 60, y: 120 },
      { id: 'Mik-EN-R2', x: 260, y: 60 },
      { id: 'Mik-EN-R3', x: 260, y: 180 },
      { id: 'Mik-FR-R4', x: 460, y: 120 }
    ],
    edges: [
      { from: 'Mik-Core-R1', to: 'Mik-EN-R2' },
      { from: 'Mik-Core-R1', to: 'Mik-EN-R3' },
      { from: 'Mik-EN-R2', to: 'Mik-FR-R4' },
      { from: 'Mik-EN-R3', to: 'Mik-FR-R4' }
    ]
  };

  return {
    metrics: {
      totalMikrotiks,
      updatedMikrotiks,
      outOfDate,
      tunnelSummary
    },
    tunnels,
    ipams,
    mikrotiks: mikrotiks.map((device) => ({
      ...device,
      interfaces: getMikrotikInterfaces(device.id),
      tunnels: getMikrotikTunnels(device.id)
    })),
    routingChecks,
    firewallSnapshot,
    dnsServers,
    routingGraph
  };
}

function buildSettingsModel() {
  const ipams = getIpams();
  const collections = getIpamCollections();
  const groupedCollections = groupCollectionsByIpam(collections);
  const mikrotikDevices = getMikrotiks().map((device) => ({
    ...device,
    interfaces: getMikrotikInterfaces(device.id),
    tunnels: getMikrotikTunnels(device.id)
  }));

  return {
    ipams,
    groupedCollections,
    mikrotikDevices,
    dnsServers: getDnsServers()
  };
}

function formatStatus(value) {
  if (!value || value === 'unknown') {
    return 'unknown';
  }
  return value;
}

function withNav(current) {
  return { current };
}

function buildRegisterModel(overrides = {}) {
  return {
    error: null,
    success: null,
    nav: withNav('register'),
    formData: {
      firstName: '',
      lastName: '',
      email: ''
    },
    ...overrides
  };
}

async function testIpamConnection(ipam) {
  try {
    const user = await phpIpamFetch(ipam, 'user/');
    let message = 'Authenticated successfully';
    if (user && typeof user === 'object') {
      const username = user.username || user.name || user.real_name;
      if (username) {
        message = `Authenticated as ${username}`;
      }
    }
    return { ok: true, status: 'connected', message };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error.message || 'Unable to reach phpIPAM'
    };
  }
}

function testPort(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: timeoutMs }, () => {
      socket.destroy();
      resolve({ ok: true });
    });

    socket.on('error', (error) => {
      socket.destroy();
      resolve({ ok: false, error: error.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'Connection timed out' });
    });
  });
}

app.get('/', (req, res) => {
  const dashboard = buildDashboardModel();
  res.render('home', {
    nav: withNav('dashboard'),
    groupTree,
    targetRouterOs: TARGET_ROUTEROS_VERSION,
    ...dashboard
  });
});

app.get('/settings', (req, res) => {
  const settingsModel = buildSettingsModel();
  res.render('settings', {
    nav: withNav('settings'),
    groupTree,
    targetRouterOs: TARGET_ROUTEROS_VERSION,
    ...settingsModel
  });
});

app.get('/api/ipams', (req, res) => {
  const ipams = getIpams();
  const collections = groupCollectionsByIpam(getIpamCollections());
  res.json({ ipams, collections });
});

app.post('/api/ipams', async (req, res) => {
  const { name, baseUrl, appId, appCode, appPermissions, appSecurity } = req.body;

  if (!name || !baseUrl || !appId || !appCode) {
    return res.status(400).json({ error: 'Name, base URL, App ID, and App Code are required.' });
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO ipam_integrations (name, base_url, app_id, app_code, app_permissions, app_security, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const { lastInsertRowid } = insert.run(
      name.trim(),
      baseUrl.trim(),
      appId.trim(),
      appCode.trim(),
      (appPermissions || 'Read').trim(),
      (appSecurity || 'SSL with App code token').trim(),
      now
    );
    const created = db.prepare('SELECT * FROM ipam_integrations WHERE id = ?').get(lastInsertRowid);

    let testResult = null;
    try {
      testResult = await testIpamConnection(created);
    } catch (error) {
      console.warn('Initial phpIPAM test failed:', error);
    }

    try {
      const status = (testResult && testResult.status) || 'unknown';
      const checkedAt = new Date().toISOString();
      db.prepare(
        'UPDATE ipam_integrations SET last_status = ?, last_checked_at = ? WHERE id = ?'
      ).run(status, checkedAt, created.id);
    } catch (error) {
      console.warn('Unable to persist phpIPAM status after create:', error);
    }

    const refreshed = db.prepare('SELECT * FROM ipam_integrations WHERE id = ?').get(lastInsertRowid) || created;

    res.status(201).json({ ipam: refreshed, test: testResult });
  } catch (error) {
    console.error('Failed to insert IPAM integration:', error);
    res.status(500).json({ error: 'Failed to add IPAM integration.' });
  }
});

app.delete('/api/ipams/:id', (req, res) => {
  const { id } = req.params;
  const deleteStmt = db.prepare('DELETE FROM ipam_integrations WHERE id = ?');
  const result = deleteStmt.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'IPAM integration not found.' });
  }
  res.status(204).end();
});

app.post('/api/ipams/:id/test', async (req, res) => {
  const { id } = req.params;
  const ipam = db.prepare('SELECT * FROM ipam_integrations WHERE id = ?').get(id);
  if (!ipam) {
    return res.status(404).json({ error: 'IPAM integration not found.' });
  }

  const result = await testIpamConnection(ipam);
  const update = db.prepare(`
    UPDATE ipam_integrations
    SET last_status = ?, last_checked_at = ?
    WHERE id = ?
  `);
  update.run(result.status, new Date().toISOString(), id);

  res.json(result);
});

app.post('/api/ipams/:id/sync', async (req, res) => {
  const { id } = req.params;
  const ipam = db.prepare('SELECT * FROM ipam_integrations WHERE id = ?').get(id);
  if (!ipam) {
    return res.status(404).json({ error: 'IPAM integration not found.' });
  }

  const now = new Date().toISOString();

  try {
    const rawSections = normalisePhpIpamList(await phpIpamFetch(ipam, 'sections/'));
    const sections = rawSections.map((section) => {
      const remoteId = resolvePhpIpamId(section);
      const name = section.name || section.description || `Section ${remoteId ?? ''}`.trim();
      return {
        name,
        description: section.description || '',
        metadata: {
          remoteId,
          slug: section.slug || section.section || null
        }
      };
    });

    let rawDatacenters = normalisePhpIpamList(await phpIpamFetch(ipam, 'tools/locations/', { allowNotFound: true }));
    if (!rawDatacenters.length) {
      try {
        rawDatacenters = normalisePhpIpamList(await phpIpamFetch(ipam, 'tools/sites/', { allowNotFound: true }));
      } catch (error) {
        console.warn('phpIPAM sites endpoint unavailable:', error.message);
      }
    }
    const datacenters = rawDatacenters.map((location) => {
      const remoteId = resolvePhpIpamId(location);
      const name = location.name || `Location ${remoteId ?? ''}`.trim();
      return {
        name,
        description: location.description || location.address || '',
        metadata: {
          remoteId,
          address: location.address || null,
          contact: location.contact || null
        }
      };
    });

    const ranges = [];
    for (const section of rawSections) {
      const sectionId = resolvePhpIpamId(section);
      if (!sectionId) {
        continue;
      }
      try {
        const rawSubnets = normalisePhpIpamList(
          await phpIpamFetch(ipam, `sections/${sectionId}/subnets/`, { allowNotFound: true })
        );
        rawSubnets.forEach((subnet) => {
          const remoteId = resolvePhpIpamId(subnet);
          const rawSubnetAddress =
            subnet.subnet !== undefined && subnet.subnet !== null ? subnet.subnet : subnet.address || subnet.ip || null;
          const formattedSubnet = formatPhpIpamSubnet(rawSubnetAddress);
          const mask = subnet.mask || subnet.netmask || subnet.cidr || null;
          const cidr = formattedSubnet && mask ? `${formattedSubnet}/${mask}` : formattedSubnet;
          const sectionName = section.name || section.description || `Section ${sectionId}`;
          ranges.push({
            name: subnet.description || cidr || `Subnet ${remoteId ?? ''}`.trim(),
            description: cidr || subnet.description || '',
            metadata: {
              remoteId,
              cidr,
              sectionId,
              sectionName,
              vlanId: subnet.vlanId || subnet.vlan || subnet.vlan_id || null,
              vrfId: subnet.vrfId || subnet.vrf || subnet.vrf_id || null,
              gateway: subnet.gateway || subnet.gatewayv4 || subnet.gatewayv6 || null
            }
          });
        });
      } catch (error) {
        console.warn(`Failed to read subnets for section ${sectionId}:`, error.message);
      }
    }

    const transaction = db.transaction((payload) => {
      db.prepare('DELETE FROM ipam_collections WHERE ipam_id = ?').run(ipam.id);
      const insert = db.prepare(
        'INSERT INTO ipam_collections (ipam_id, collection_type, name, description, metadata) VALUES (?, ?, ?, ?, ?)'
      );
      payload.sections.forEach((section) => {
        insert.run(ipam.id, 'section', section.name, section.description, JSON.stringify(section.metadata));
      });
      payload.datacenters.forEach((dc) => {
        insert.run(ipam.id, 'datacenter', dc.name, dc.description, JSON.stringify(dc.metadata));
      });
      payload.ranges.forEach((range) => {
        insert.run(ipam.id, 'range', range.name, range.description, JSON.stringify(range.metadata));
      });
    });

    transaction({ sections, datacenters, ranges });

    db.prepare(
      'UPDATE ipam_integrations SET last_status = ?, last_checked_at = ? WHERE id = ?'
    ).run('connected', now, ipam.id);

    res.json({
      sections: sections.length,
      datacenters: datacenters.length,
      ranges: ranges.length
    });
  } catch (error) {
    console.error('Failed to synchronise phpIPAM:', error);
    db.prepare(
      'UPDATE ipam_integrations SET last_status = ?, last_checked_at = ? WHERE id = ?'
    ).run('failed', now, ipam.id);
    res.status(502).json({ error: error.message || 'Unable to synchronise phpIPAM.' });
  }
});

app.get('/api/mikrotiks', (req, res) => {
  const mikrotikDevices = getMikrotiks().map((device) => ({
    ...device,
    interfaces: getMikrotikInterfaces(device.id),
    tunnels: getMikrotikTunnels(device.id)
  }));
  res.json({ mikrotiks: mikrotikDevices, targetRouterOs: TARGET_ROUTEROS_VERSION });
});

app.post('/api/mikrotiks', (req, res) => {
  const {
    name,
    host,
    apiPort,
    sshPort,
    username,
    password,
    routerosVersion,
    encryptionKey,
    tunnelTimeout,
    tunnelType
  } = req.body;

  if (!name || !host || !username || !password) {
    return res.status(400).json({ error: 'Name, host, username, and password are required.' });
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO mikrotik_devices (name, host, api_port, ssh_port, username, password, routeros_version, encryption_key, tunnel_timeout, tunnel_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const { lastInsertRowid } = insert.run(
      name.trim(),
      host.trim(),
      apiPort ? Number(apiPort) : 8728,
      sshPort ? Number(sshPort) : 22,
      username.trim(),
      password.trim(),
      (routerosVersion || '').trim(),
      (encryptionKey || '').trim(),
      tunnelTimeout ? Number(tunnelTimeout) : 60,
      (tunnelType || 'WireGuard').trim(),
      now
    );
    const created = db.prepare('SELECT * FROM mikrotik_devices WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ mikrotik: created });
  } catch (error) {
    console.error('Failed to insert Mikrotik device:', error);
    res.status(500).json({ error: 'Failed to add Mikrotik device.' });
  }
});

app.delete('/api/mikrotiks/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM mikrotik_devices WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Mikrotik device not found.' });
  }
  res.status(204).end();
});

app.post('/api/mikrotiks/:id/test', async (req, res) => {
  const { id } = req.params;
  const mikrotik = db.prepare('SELECT * FROM mikrotik_devices WHERE id = ?').get(id);
  if (!mikrotik) {
    return res.status(404).json({ error: 'Mikrotik device not found.' });
  }

  const [apiResult, sshResult] = await Promise.all([
    testPort(mikrotik.host, mikrotik.api_port),
    testPort(mikrotik.host, mikrotik.ssh_port)
  ]);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE mikrotik_devices
    SET last_api_status = ?, last_ssh_status = ?, last_checked_at = ?
    WHERE id = ?
  `).run(
    apiResult.ok ? 'connected' : 'failed',
    sshResult.ok ? 'connected' : 'failed',
    now,
    id
  );

  res.json({
    api: {
      status: apiResult.ok ? 'connected' : 'failed',
      message: apiResult.ok ? 'API port reachable' : apiResult.error || 'Connection failed'
    },
    ssh: {
      status: sshResult.ok ? 'connected' : 'failed',
      message: sshResult.ok ? 'SSH port reachable' : sshResult.error || 'Connection failed'
    }
  });
});

app.get('/api/dns', (req, res) => {
  res.json({ dnsServers: getDnsServers() });
});

app.post('/api/dns', (req, res) => {
  const { name, ipAddress, apiEndpoint, ptrZone } = req.body;

  if (!name || !ipAddress) {
    return res.status(400).json({ error: 'Name and IP address are required.' });
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO dns_servers (name, ip_address, api_endpoint, ptr_zone, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    const { lastInsertRowid } = insert.run(
      name.trim(),
      ipAddress.trim(),
      apiEndpoint ? apiEndpoint.trim() : null,
      ptrZone ? ptrZone.trim() : null,
      now
    );
    const created = db.prepare('SELECT * FROM dns_servers WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ dns: created });
  } catch (error) {
    console.error('Failed to insert DNS server:', error);
    res.status(500).json({ error: 'Failed to add DNS server.' });
  }
});

app.delete('/api/dns/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM dns_servers WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'DNS server not found.' });
  }
  res.status(204).end();
});

app.get('/register', (req, res) => {
  res.render('register', buildRegisterModel());
});

app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const trimmed = {
    firstName: firstName ? firstName.trim() : '',
    lastName: lastName ? lastName.trim() : '',
    email: email ? email.trim().toLowerCase() : ''
  };

  if (!trimmed.firstName || !trimmed.lastName || !trimmed.email || !password || !confirmPassword) {
    return res.status(400).render(
      'register',
      buildRegisterModel({
        error: 'Please fill in all fields.',
        formData: trimmed
      })
    );
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed.email)) {
    return res.status(400).render(
      'register',
      buildRegisterModel({
        error: 'Please enter a valid email address.',
        formData: trimmed
      })
    );
  }

  if (password.length < 8) {
    return res.status(400).render(
      'register',
      buildRegisterModel({
        error: 'Password must be at least 8 characters long.',
        formData: trimmed
      })
    );
  }

  if (password !== confirmPassword) {
    return res.status(400).render(
      'register',
      buildRegisterModel({
        error: 'Password confirmation does not match.',
        formData: trimmed
      })
    );
  }

  try {
    const insert = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const passwordHash = await bcrypt.hash(password, 10);
    insert.run(trimmed.firstName, trimmed.lastName, trimmed.email, passwordHash, new Date().toISOString());

    return res.render(
      'register',
      buildRegisterModel({
        success: 'Registration successful! You can now sign in.'
      })
    );
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).render(
        'register',
        buildRegisterModel({
          error: 'This email address is already registered.',
          formData: trimmed
        })
      );
    }

    console.error('Registration error:', error);
    return res.status(500).render(
      'register',
      buildRegisterModel({
        error: 'Something went wrong while saving your registration. Please try again.',
        formData: trimmed
      })
    );
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
