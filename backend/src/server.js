import http from 'http';
import https from 'https';
import { URL } from 'url';
import crypto from 'crypto';
import initializeDatabase, { resolveDatabaseFile } from './database.js';
import { ensureDatabaseConfig, getConfigFilePath } from './config.js';
import getProjectVersion from './version.js';

const normalizeHeaderInit = (headersInit = {}) => {
  const headers = {};

  if (Array.isArray(headersInit)) {
    headersInit.forEach(([key, value]) => {
      if (key !== undefined && value !== undefined) {
        headers[String(key).toLowerCase()] = String(value);
      }
    });
    return headers;
  }

  if (headersInit instanceof Map) {
    headersInit.forEach((value, key) => {
      if (key !== undefined && value !== undefined) {
        headers[String(key).toLowerCase()] = String(value);
      }
    });
    return headers;
  }

  Object.entries(headersInit).forEach(([key, value]) => {
    if (value !== undefined) {
      headers[String(key).toLowerCase()] = String(value);
    }
  });

  return headers;
};

const createNodeFetch = () => {
  return (input, init = {}) =>
    new Promise((resolve, reject) => {
      let settled = false;

      const fulfill = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      const fail = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      let url;

      try {
        url = typeof input === 'string' ? new URL(input) : new URL(input.url ?? input.href);
      } catch (error) {
        fail(error);
        return;
      }

      const transport = url.protocol === 'https:' ? https : http;
      const method = (init.method || 'GET').toUpperCase();
      const headers = normalizeHeaderInit(init.headers);

      const requestOptions = {
        method,
        headers
      };

      const request = transport.request(url, requestOptions, (response) => {
        const chunks = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });

        response.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          const text = bodyBuffer.toString('utf-8');
          const headerStore = new Map();

          Object.entries(response.headers).forEach(([key, value]) => {
            if (value === undefined) {
              return;
            }

            if (Array.isArray(value)) {
              headerStore.set(key.toLowerCase(), value.join(', '));
            } else {
              headerStore.set(key.toLowerCase(), String(value));
            }
          });

          fulfill({
            ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? '',
            headers: {
              get(name) {
                return headerStore.get(String(name).toLowerCase()) ?? null;
              }
            },
            async json() {
              if (!text) {
                return {};
              }

              try {
                return JSON.parse(text);
              } catch (error) {
                throw new Error('Invalid JSON response');
              }
            },
            async text() {
              return text;
            }
          });
        });

        response.on('error', (error) => {
          fail(error);
        });
      });

      request.on('error', (error) => {
        fail(error);
      });

      if (init.signal) {
        const abortHandler = () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          fail(abortError);
          request.destroy(abortError);
        };

        if (init.signal.aborted) {
          abortHandler();
          return;
        }

        init.signal.addEventListener('abort', abortHandler, { once: true });
        request.on('close', () => {
          init.signal.removeEventListener('abort', abortHandler);
        });
      }

      if (init.body) {
        if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) {
          request.write(init.body);
        } else if (init.body instanceof URLSearchParams) {
          request.write(init.body.toString());
        } else {
          request.write(JSON.stringify(init.body));
        }
      }

      request.end();
    });
};

let cachedFetch = null;

const resolveFetch = () => {
  if (cachedFetch) {
    return cachedFetch;
  }

  if (typeof globalThis.fetch === 'function') {
    cachedFetch = globalThis.fetch.bind(globalThis);
    return cachedFetch;
  }

  cachedFetch = createNodeFetch();
  globalThis.fetch = cachedFetch;
  return cachedFetch;
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const basePermissions = {
  dashboard: false,
  users: false,
  roles: false,
  groups: false,
  tunnels: false,
  mikrotiks: false,
  settings: false
};

const pepperPassword = (password, secret) => `${password}${secret}`;

const hashPassword = (password, secret) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(pepperPassword(password, secret), salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password, secret, storedHash) => {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }

  const [salt, knownHash] = storedHash.split(':');
  if (!salt || !knownHash) {
    return false;
  }

  const comparisonHash = crypto
    .pbkdf2Sync(pepperPassword(password, secret), salt, 120000, 64, 'sha512')
    .toString('hex');

  const knownBuffer = Buffer.from(knownHash, 'hex');
  const comparisonBuffer = Buffer.from(comparisonHash, 'hex');

  if (knownBuffer.length !== comparisonBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(knownBuffer, comparisonBuffer);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders
  });
  res.end(body);
};

const sendNoContent = (res) => {
  res.writeHead(204, corsHeaders);
  res.end();
};

const parseJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk.toString();

      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload.'));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });
  });

const DEFAULT_PHPIPAM_TIMEOUT_MS = 7000;

const normalisePhpIpamBaseUrl = (baseUrl) => {
  if (typeof baseUrl !== 'string') {
    return '';
  }

  const trimmed = baseUrl.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\s+/g, '').replace(/\/+$/, '');
};

const resolvePhpIpamId = (record, fallbackKeys = []) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const candidates = [
    'id',
    'ID',
    'sectionId',
    'sectionID',
    'sectionid',
    'subnetId',
    'subnetID',
    'subnetid',
    'locationId',
    'locationID',
    'locationid',
    ...fallbackKeys
  ];

  for (const key of candidates) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key];
    }
  }

  return null;
};

const normalisePhpIpamList = (data) => {
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
};

const intToIpv4 = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const unsigned = numeric >>> 0;
  return [unsigned >>> 24, (unsigned >>> 16) & 255, (unsigned >>> 8) & 255, unsigned & 255].join('.');
};

const formatPhpIpamSubnet = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('.')) {
      return value;
    }

    const numeric = Number(value);

    if (!Number.isNaN(numeric)) {
      return intToIpv4(numeric) ?? value;
    }

    return value;
  }

  if (typeof value === 'number') {
    return intToIpv4(value);
  }

  return `${value}`;
};

const phpIpamFetch = async (ipam, endpoint, options = {}) => {
  const fetchImpl = await resolveFetch();
  const baseUrl = normalisePhpIpamBaseUrl(ipam.baseUrl);

  if (!baseUrl) {
    throw new Error('Missing base URL');
  }

  const appId = ipam.appId ? encodeURIComponent(ipam.appId) : null;

  if (!appId) {
    throw new Error('Missing App ID');
  }

  const trimmedEndpoint = `${endpoint || ''}`.replace(/^\/+/, '');
  const url = `${baseUrl}/${appId}/${trimmedEndpoint}`;

  const allowNotFound = Boolean(options.allowNotFound);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_PHPIPAM_TIMEOUT_MS);

  let response;

  try {
    response = await fetchImpl(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mik-Management/1.0',
        'phpipam-token': ipam.appCode ?? '',
        ...(options.headers || {})
      },
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

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    if (payload.data === null && allowNotFound) {
      return [];
    }

    return payload.data;
  }

  return payload;
};

const testPhpIpamConnection = async (ipam) => {
  try {
    const response = await phpIpamFetch(ipam, 'user/');

    if (response && typeof response === 'object') {
      const username = response.username || response.data?.username;
      return {
        status: 'connected',
        message: username ? `Authenticated as ${username}` : 'phpIPAM connection succeeded'
      };
    }

    return { status: 'connected', message: 'phpIPAM connection succeeded' };
  } catch (error) {
    return { status: 'failed', message: error.message || 'Unable to reach phpIPAM' };
  }
};

const syncPhpIpamStructure = async (ipam) => {
  const sectionsPayload = normalisePhpIpamList(await phpIpamFetch(ipam, 'sections/'));
  const sections = sectionsPayload.map((section) => {
    const identifier = resolvePhpIpamId(section, ['section']);
    const sectionId = Number.parseInt(identifier, 10);
    const metadata = {};

    if (section.section !== undefined) {
      metadata.slug = section.section;
    }

    if (section.order !== undefined) {
      metadata.order = section.order;
    }

    return {
      id: Number.isInteger(sectionId) ? sectionId : identifier,
      name: section.name || section.section || `Section ${identifier ?? ''}`,
      description: section.description || '',
      metadata
    };
  });

  let datacentersPayload = [];

  try {
    datacentersPayload = normalisePhpIpamList(await phpIpamFetch(ipam, 'tools/locations/', { allowNotFound: true }));
  } catch (error) {
    if (!/not\s+found/i.test(error.message || '')) {
      throw error;
    }
  }

  if (!datacentersPayload.length) {
    datacentersPayload = normalisePhpIpamList(await phpIpamFetch(ipam, 'tools/sites/', { allowNotFound: true }));
  }

  const datacenters = datacentersPayload.map((entry) => {
    const identifier = resolvePhpIpamId(entry, ['code']);
    const dcId = Number.parseInt(identifier, 10);
    const metadata = {};

    if (entry.code) {
      metadata.code = entry.code;
    }

    if (entry.address) {
      metadata.address = entry.address;
    }

    return {
      id: Number.isInteger(dcId) ? dcId : identifier,
      name: entry.name || entry.code || `Datacenter ${identifier ?? ''}`,
      description: entry.description || entry.address || '',
      metadata
    };
  });

  const ranges = [];

  for (const section of sections) {
    const sectionId = section.id ?? resolvePhpIpamId(section, ['sectionId']);

    if (!sectionId) {
      continue;
    }

    const rawRanges = normalisePhpIpamList(
      await phpIpamFetch(ipam, `sections/${sectionId}/subnets/`, { allowNotFound: true })
    );

    for (const entry of rawRanges) {
      const identifier = resolvePhpIpamId(entry, ['subnetId', 'subnet']);
      const rangeId = Number.parseInt(identifier, 10);

      const subnet = formatPhpIpamSubnet(entry.subnet ?? entry.network ?? identifier);
      const mask = entry.mask ?? entry.cidr ?? entry.bit ?? entry.netmask;
      const parsedMask = Number.parseInt(mask, 10);
      const cidr = subnet && Number.isInteger(parsedMask) ? `${subnet}/${parsedMask}` : subnet || identifier;

      const metadata = {
        cidr: cidr || '',
        sectionId,
        vlanId: entry.vlanId ?? entry.vlanid ?? entry.vlan ?? null
      };

      Object.keys(metadata).forEach((key) => {
        if (metadata[key] === null || metadata[key] === undefined || metadata[key] === '') {
          delete metadata[key];
        }
      });

      ranges.push({
        id: Number.isInteger(rangeId) ? rangeId : identifier,
        name: entry.description || entry.hostname || cidr || `Range ${identifier ?? ''}`,
        description: entry.description || '',
        metadata
      });
    }
  }

  return { sections, datacenters, ranges };
};

const parsePermissions = (permissions = {}) => {
  const normalized = { ...basePermissions };
  if (permissions && typeof permissions === 'object') {
    Object.keys(normalized).forEach((key) => {
      normalized[key] = Boolean(permissions[key]);
    });
  }
  return normalized;
};

const normalizeBooleanFlag = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'on') {
      return true;
    }
    if (lowered === 'false' || lowered === '0' || lowered === 'no' || lowered === 'off') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  return fallback;
};

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeTagsInput = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => normalizeString(entry)).filter(Boolean))];
  }

  if (typeof value === 'string') {
    return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
  }

  return [];
};

const normalizeNotesInput = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const buildRouterosPayload = (input = {}) => ({
  apiEnabled: normalizeBooleanFlag(input.apiEnabled, false),
  apiPort: parseInteger(input.apiPort),
  apiSSL: normalizeBooleanFlag(input.apiSSL, false),
  apiUsername: normalizeString(input.apiUsername),
  apiPassword: typeof input.apiPassword === 'string' ? input.apiPassword.trim() : '',
  verifyTLS: normalizeBooleanFlag(input.verifyTLS, true),
  apiTimeout: parseInteger(input.apiTimeout),
  apiRetries: parseInteger(input.apiRetries),
  allowInsecureCiphers: normalizeBooleanFlag(input.allowInsecureCiphers, false),
  preferredApiFirst: normalizeBooleanFlag(input.preferredApiFirst, true)
});

const buildDeviceStatusPayload = (input = {}) => {
  const allowed = new Set(['updated', 'pending', 'unknown']);
  const candidate = typeof input.updateStatus === 'string' ? input.updateStatus.toLowerCase() : undefined;
  return {
    updateStatus: candidate && allowed.has(candidate) ? candidate : undefined,
    lastAuditAt: typeof input.lastAuditAt === 'string' ? input.lastAuditAt : undefined
  };
};

const normalizeRoleIds = (roleIds, roles) => {
  if (!Array.isArray(roleIds)) {
    return [];
  }

  const availableIds = new Set(roles.map((role) => role.id));
  return [...new Set(roleIds.map((roleId) => Number.parseInt(roleId, 10)))].filter(
    (roleId) => Number.isInteger(roleId) && roleId > 0 && availableIds.has(roleId)
  );
};

const ensureNumber = (value, fallback) => {
  const parsed = parseInteger(value);
  return parsed ?? fallback;
};

const mapRole = (role) => ({
  id: role.id,
  name: role.name,
  permissions: parsePermissions(role.permissions ?? {}),
  createdAt: role.createdAt,
  updatedAt: role.updatedAt
});

const aggregatePermissions = (roleDetails) => {
  return roleDetails.reduce((acc, role) => {
    Object.keys(acc).forEach((key) => {
      acc[key] = acc[key] || Boolean(role.permissions?.[key]);
    });
    return acc;
  }, { ...basePermissions });
};

const mapUser = (user, allRoles) => {
  const roleIds = normalizeRoleIds(user.roles, allRoles);
  const roleDetails = roleIds
    .map((roleId) => allRoles.find((role) => role.id === roleId))
    .filter(Boolean)
    .map(mapRole);

  const permissions = aggregatePermissions(roleDetails);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    createdAt: user.createdAt,
    roleIds,
    roles: roleDetails,
    permissions
  };
};

const mapGroup = (group) => ({
  id: group.id,
  name: group.name,
  parentId: group.parentId ?? null,
  createdAt: group.createdAt,
  updatedAt: group.updatedAt
});

const mapMikrotik = (device, groups) => {
  const group = device.groupId ? groups.find((entry) => entry.id === device.groupId) : null;
  const routeros = device.routeros ?? {};
  const sslEnabled = Boolean(routeros.apiSSL);

  return {
    id: device.id,
    name: device.name,
    host: device.host,
    groupId: device.groupId ?? null,
    groupName: group ? group.name : null,
    tags: Array.isArray(device.tags) ? [...device.tags] : [],
    notes: typeof device.notes === 'string' ? device.notes : '',
    routeros: {
      apiEnabled: Boolean(routeros.apiEnabled),
      apiPort: ensureNumber(routeros.apiPort, sslEnabled ? 8729 : 8728),
      apiSSL: sslEnabled,
      apiUsername: typeof routeros.apiUsername === 'string' ? routeros.apiUsername : '',
      apiPassword: typeof routeros.apiPassword === 'string' ? routeros.apiPassword : '',
      verifyTLS: normalizeBooleanFlag(routeros.verifyTLS, true),
      apiTimeout: ensureNumber(routeros.apiTimeout, 5000),
      apiRetries: ensureNumber(routeros.apiRetries, 1),
      allowInsecureCiphers: normalizeBooleanFlag(routeros.allowInsecureCiphers, false),
      preferredApiFirst: normalizeBooleanFlag(routeros.preferredApiFirst, true)
    },
    status: {
      updateStatus:
        typeof device.status?.updateStatus === 'string' ? device.status.updateStatus : 'unknown',
      lastAuditAt: device.status?.lastAuditAt ?? null
    },
    createdAt: device.createdAt,
    updatedAt: device.updatedAt
  };
};

const mapTunnel = (tunnel, groups, mikrotiks) => {
  const group = tunnel.groupId ? groups.find((entry) => entry.id === tunnel.groupId) : null;
  const source = tunnel.sourceId ? mikrotiks.find((device) => device.id === tunnel.sourceId) : null;
  const target = tunnel.targetId ? mikrotiks.find((device) => device.id === tunnel.targetId) : null;

  return {
    id: tunnel.id,
    name: tunnel.name,
    groupId: tunnel.groupId ?? null,
    groupName: group ? group.name : null,
    sourceId: tunnel.sourceId ?? null,
    sourceName: source ? source.name : null,
    targetId: tunnel.targetId ?? null,
    targetName: target ? target.name : null,
    connectionType: tunnel.connectionType,
    status: tunnel.status,
    enabled: Boolean(tunnel.enabled),
    tags: Array.isArray(tunnel.tags) ? [...tunnel.tags] : [],
    notes: typeof tunnel.notes === 'string' ? tunnel.notes : '',
    metrics: {
      latencyMs: typeof tunnel.metrics?.latencyMs === 'number' ? tunnel.metrics.latencyMs : null,
      packetLoss: typeof tunnel.metrics?.packetLoss === 'number' ? tunnel.metrics.packetLoss : null,
      lastCheckedAt: tunnel.metrics?.lastCheckedAt ?? null
    },
    createdAt: tunnel.createdAt,
    updatedAt: tunnel.updatedAt
  };
};

const buildGroupTree = (groups) => {
  const nodeLookup = new Map();

  groups.forEach((group) => {
    nodeLookup.set(group.id, { ...mapGroup(group), children: [] });
  });

  const roots = [];

  nodeLookup.forEach((node) => {
    if (node.parentId && nodeLookup.has(node.parentId)) {
      nodeLookup.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (entries) => {
    entries.sort((a, b) => {
      if (a.name === 'Mik-Group Root') {
        return -1;
      }

      if (b.name === 'Mik-Group Root') {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });
    entries.forEach((child) => sortNodes(child.children));
  };

  sortNodes(roots);

  return roots;
};

const flattenGroupTree = (nodes, depth = 0) => {
  const ordered = [];

  nodes.forEach((node) => {
    const children = Array.isArray(node.children) ? node.children : [];
    const { children: _children, ...rest } = node;

    ordered.push({ ...rest, depth });

    if (children.length > 0) {
      ordered.push(...flattenGroupTree(children, depth + 1));
    }
  });

  return ordered;
};

const bootstrap = async () => {
  const config = await ensureDatabaseConfig();
  const databaseFile = resolveDatabaseFile(config.databasePath);
  const db = await initializeDatabase(config.databasePath);

  const port = Number.parseInt(process.env.PORT ?? '4000', 10) || 4000;
  const version = getProjectVersion();

  const server = http.createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendJson(res, 400, { message: 'Malformed request.' });
      return;
    }

    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') {
      sendNoContent(res);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    const normalizePath = (value) => {
      if (!value) {
        return '/';
      }

      const collapsed = value.replace(/\\+/g, '/');
      const withoutTrailing = collapsed.replace(/\/+$/, '');

      if (!withoutTrailing) {
        return '/';
      }

      return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`;
    };

    const canonicalPath = normalizePath(pathname);
    const pathSegments = canonicalPath.split('/').filter(Boolean);
    const resourceSegments = pathSegments[0] === 'api' ? pathSegments.slice(1) : pathSegments;
    const resourcePath = resourceSegments.length > 0 ? `/${resourceSegments.join('/')}` : '/';

    const buildUserCreationPayload = (body) => {
      const { firstName, lastName, email, password, passwordConfirmation } = body ?? {};

      const normalizedFirstName = normalizeString(firstName);
      if (!normalizedFirstName) {
        return { error: { status: 400, message: 'First name is required.' } };
      }

      const normalizedLastName = normalizeString(lastName);
      if (!normalizedLastName) {
        return { error: { status: 400, message: 'Last name is required.' } };
      }

      const normalizedEmail = normalizeString(email).toLowerCase();
      if (!normalizedEmail) {
        return { error: { status: 400, message: 'Email is required.' } };
      }

      if (!emailPattern.test(normalizedEmail)) {
        return { error: { status: 400, message: 'Email must follow the format name@example.com.' } };
      }

      const rawPassword = typeof password === 'string' ? password : '';
      if (!rawPassword) {
        return { error: { status: 400, message: 'Password is required.' } };
      }

      if (rawPassword.length < 8) {
        return { error: { status: 400, message: 'Password must be at least 8 characters long.' } };
      }

      if (passwordConfirmation !== undefined && rawPassword !== passwordConfirmation) {
        return { error: { status: 400, message: 'Passwords must match.' } };
      }

      return {
        payload: {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          rawPassword
        }
      };
    };

    const handleRegister = async () => {
      const body = await parseJsonBody(req);
      const { error, payload } = buildUserCreationPayload(body);

      if (error) {
        sendJson(res, error.status, { message: error.message });
        return;
      }

      try {
        const passwordHash = hashPassword(payload.rawPassword, config.databasePassword);
        const result = await db.createUser(
          {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            passwordHash
          },
          { bypassGuard: false }
        );

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'This email is already registered.' });
          return;
        }

        if (!result.success && result.reason === 'registration-closed') {
          sendJson(res, 403, {
            message: 'Registration is disabled. Ask an administrator to create an account for you.'
          });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create user.');
        }

        const roles = await db.listRoles();
        sendJson(res, 201, {
          message: 'User registered successfully.',
          user: mapUser(result.user, roles)
        });
      } catch (error) {
        console.error('Registration error', error);
        sendJson(res, 500, {
          message: 'Registration failed unexpectedly. Please review your input and try again.'
        });
      }
    };

    const handleCreateUser = async () => {
      const body = await parseJsonBody(req);
      const { error, payload } = buildUserCreationPayload(body);

      if (error) {
        sendJson(res, error.status, { message: error.message });
        return;
      }

      try {
        const passwordHash = hashPassword(payload.rawPassword, config.databasePassword);
        const result = await db.createUser(
          {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            passwordHash
          },
          { bypassGuard: true }
        );

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'Another account already uses this email address.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create user via management API.');
        }

        const roles = await db.listRoles();
        sendJson(res, 201, {
          message: 'User created successfully.',
          user: mapUser(result.user, roles)
        });
      } catch (error) {
        console.error('Admin create user error', error);
        sendJson(res, 500, {
          message: 'Unable to create the user right now. Confirm the backend service is reachable and try again.'
        });
      }
    };

    const handleLogin = async () => {
      const body = await parseJsonBody(req);
      const { email, password } = body ?? {};

      const normalizedEmail = normalizeString(email).toLowerCase();
      const rawPassword = typeof password === 'string' ? password : '';

      if (!normalizedEmail || !rawPassword) {
        sendJson(res, 400, { message: 'Email and password are required.' });
        return;
      }

      try {
        const user = await db.findUserByEmail(normalizedEmail);

        if (!user) {
          sendJson(res, 401, { message: 'Invalid credentials.' });
          return;
        }

        const passwordIsValid = verifyPassword(rawPassword, config.databasePassword, user.passwordHash);

        if (!passwordIsValid) {
          sendJson(res, 401, { message: 'Invalid credentials.' });
          return;
        }

        const roles = await db.listRoles();
        sendJson(res, 200, { message: 'Login successful.', user: mapUser(user, roles) });
      } catch (error) {
        console.error('Login error', error);
        sendJson(res, 500, { message: 'Unexpected error. Please try again.' });
      }
    };

    const handleListUsers = async () => {
      try {
        const [users, roles] = await Promise.all([db.listUsers(), db.listRoles()]);
        sendJson(res, 200, { users: users.map((user) => mapUser(user, roles)) });
      } catch (error) {
        console.error('List users error', error);
        sendJson(res, 500, { message: 'Unable to load users.' });
      }
    };

    const handleGetUser = async (userId) => {
      if (!Number.isInteger(userId) || userId <= 0) {
        sendJson(res, 400, { message: 'A valid user id is required.' });
        return;
      }

      try {
        const user = await db.getUserById(userId);

        if (!user) {
          sendJson(res, 404, { message: 'User not found.' });
          return;
        }

        const roles = await db.listRoles();
        sendJson(res, 200, { user: mapUser(user, roles) });
      } catch (error) {
        console.error('Fetch user error', error);
        sendJson(res, 500, { message: 'Unable to load the requested user.' });
      }
    };

    const handleUpdateUser = async (userId) => {
      const body = await parseJsonBody(req);
      const { firstName, lastName, email, password, passwordConfirmation, roles } = body ?? {};

      if (!Number.isInteger(userId) || userId <= 0) {
        sendJson(res, 400, { message: 'A valid user id is required.' });
        return;
      }

      const normalizedFirstName = normalizeString(firstName);
      const normalizedLastName = normalizeString(lastName);
      const normalizedEmail = normalizeString(email).toLowerCase();

      if (!normalizedFirstName) {
        sendJson(res, 400, { message: 'First name is required.' });
        return;
      }

      if (!normalizedLastName) {
        sendJson(res, 400, { message: 'Last name is required.' });
        return;
      }

      if (!normalizedEmail) {
        sendJson(res, 400, { message: 'Email is required.' });
        return;
      }

      if (!emailPattern.test(normalizedEmail)) {
        sendJson(res, 400, { message: 'Email must follow the format name@example.com.' });
        return;
      }

      let normalizedRoles;
      if (roles !== undefined) {
        if (!Array.isArray(roles)) {
          sendJson(res, 400, { message: 'Roles must be provided as an array.' });
          return;
        }

        const converted = roles.map((roleId) => Number.parseInt(roleId, 10));
        const invalidRole = converted.some((roleId) => !Number.isInteger(roleId) || roleId <= 0);

        if (invalidRole) {
          sendJson(res, 400, { message: 'Each role id must be a positive integer.' });
          return;
        }

        normalizedRoles = converted;
      }

      let passwordHash;
      if (password !== undefined || passwordConfirmation !== undefined) {
        const normalizedPassword = typeof password === 'string' ? password : '';

        if (!normalizedPassword) {
          sendJson(res, 400, { message: 'Password cannot be blank when updating the account.' });
          return;
        }

        if (normalizedPassword.length < 8) {
          sendJson(res, 400, { message: 'Password must be at least 8 characters long.' });
          return;
        }

        if (passwordConfirmation !== undefined && normalizedPassword !== passwordConfirmation) {
          sendJson(res, 400, { message: 'Passwords must match.' });
          return;
        }

        passwordHash = hashPassword(normalizedPassword, config.databasePassword);
      }

      try {
        const result = await db.updateUser(userId, {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          passwordHash,
          roles: normalizedRoles
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'User not found.' });
          return;
        }

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'Another account already uses this email address.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-role-format') {
          sendJson(res, 400, { message: 'Roles must be supplied as an array of numeric identifiers.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-role-reference') {
          sendJson(res, 400, {
            message: 'One or more selected roles do not exist. Refresh the page and try again.'
          });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update user.');
        }

        const rolesList = await db.listRoles();
        sendJson(res, 200, {
          message: 'User updated successfully.',
          user: mapUser(result.user, rolesList)
        });
      } catch (error) {
        console.error('Update user error', error);
        sendJson(res, 500, { message: 'Unable to update the user at this time.' });
      }
    };

    const handleDeleteUser = async (userId) => {
      if (!Number.isInteger(userId) || userId <= 0) {
        sendJson(res, 400, { message: 'A valid user id is required.' });
        return;
      }

      try {
        const result = await db.deleteUser(userId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'User not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete user.');
        }

        sendJson(res, 200, { message: 'User removed successfully.' });
      } catch (error) {
        console.error('Delete user error', error);
        sendJson(res, 500, { message: 'Unable to delete the user at this time.' });
      }
    };

    const handleListRoles = async () => {
      try {
        const roles = await db.listRoles();
        sendJson(res, 200, { roles: roles.map(mapRole) });
      } catch (error) {
        console.error('List roles error', error);
        sendJson(res, 500, { message: 'Unable to load roles.' });
      }
    };

    const handleCreateRole = async () => {
      const body = await parseJsonBody(req);
      const { name, permissions } = body ?? {};

      const normalizedName = normalizeString(name);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Role name is required.' });
        return;
      }

      try {
        const result = await db.createRole({
          name: normalizedName,
          permissions: parsePermissions(permissions)
        });

        if (!result.success && result.reason === 'duplicate-name') {
          sendJson(res, 409, { message: 'Another role already uses this name.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create role.');
        }

        sendJson(res, 201, { message: 'Role created successfully.', role: mapRole(result.role) });
      } catch (error) {
        console.error('Create role error', error);
        sendJson(res, 500, { message: 'Unable to create the role right now.' });
      }
    };

    const handleUpdateRole = async (roleId) => {
      const body = await parseJsonBody(req);
      const { name, permissions } = body ?? {};

      if (!Number.isInteger(roleId) || roleId <= 0) {
        sendJson(res, 400, { message: 'A valid role id is required.' });
        return;
      }

      const normalizedName = normalizeString(name);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Role name is required.' });
        return;
      }

      try {
        const result = await db.updateRole(roleId, {
          name: normalizedName,
          permissions: parsePermissions(permissions)
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Role not found.' });
          return;
        }

        if (!result.success && result.reason === 'duplicate-name') {
          sendJson(res, 409, { message: 'Another role already uses this name.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update role.');
        }

        sendJson(res, 200, { message: 'Role updated successfully.', role: mapRole(result.role) });
      } catch (error) {
        console.error('Update role error', error);
        sendJson(res, 500, { message: 'Unable to update the role right now.' });
      }
    };

    const handleDeleteRole = async (roleId) => {
      if (!Number.isInteger(roleId) || roleId <= 0) {
        sendJson(res, 400, { message: 'A valid role id is required.' });
        return;
      }

      try {
        const result = await db.deleteRole(roleId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Role not found.' });
          return;
        }

        if (!result.success && result.reason === 'role-in-use') {
          sendJson(res, 409, {
            message: 'This role is assigned to one or more users. Reassign users before deleting it.'
          });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete role.');
        }

        sendNoContent(res);
      } catch (error) {
        console.error('Delete role error', error);
        sendJson(res, 500, { message: 'Unable to delete the role right now.' });
      }
    };

    const handleListGroups = async () => {
      try {
        const groups = await db.listGroups();
        const mapped = groups.map(mapGroup);
        const tree = buildGroupTree(groups);
        const ordered = flattenGroupTree(tree);
        sendJson(res, 200, { groups: mapped, tree, ordered });
      } catch (error) {
        console.error('List groups error', error);
        sendJson(res, 500, { message: 'Unable to load groups.' });
      }
    };

    const handleCreateGroup = async () => {
      const body = await parseJsonBody(req);
      const { name, parentId } = body ?? {};

      const normalizedName = normalizeString(name);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Group name is required.' });
        return;
      }

      let normalizedParentId = null;

      if (parentId !== undefined && parentId !== null && parentId !== '') {
        const parsed = Number.parseInt(parentId, 10);

        if (!Number.isInteger(parsed) || parsed <= 0) {
          sendJson(res, 400, { message: 'Parent group must be a positive integer identifier.' });
          return;
        }

        normalizedParentId = parsed;
      }

      try {
        const result = await db.createGroup({ name: normalizedName, parentId: normalizedParentId });

        if (!result.success && result.reason === 'duplicate-name') {
          sendJson(res, 409, { message: 'Another group already uses this name.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-parent') {
          sendJson(res, 400, { message: 'The selected parent group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'cyclic-parent') {
          sendJson(res, 400, { message: 'A group cannot be nested within itself or its descendants.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create group.');
        }

        sendJson(res, 201, { message: 'Group created successfully.', group: mapGroup(result.group) });
      } catch (error) {
        console.error('Create group error', error);
        sendJson(res, 500, { message: 'Unable to create the group right now.' });
      }
    };

    const handleUpdateGroup = async (groupId) => {
      const body = await parseJsonBody(req);
      const { name, parentId } = body ?? {};

      if (!Number.isInteger(groupId) || groupId <= 0) {
        sendJson(res, 400, { message: 'A valid group id is required.' });
        return;
      }

      const normalizedName = normalizeString(name);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Group name is required.' });
        return;
      }

      let normalizedParentId = null;

      if (parentId !== undefined && parentId !== null && parentId !== '') {
        const parsed = Number.parseInt(parentId, 10);

        if (!Number.isInteger(parsed) || parsed <= 0) {
          sendJson(res, 400, { message: 'Parent group must be a positive integer identifier.' });
          return;
        }

        normalizedParentId = parsed;
      }

      try {
        const result = await db.updateGroup(groupId, { name: normalizedName, parentId: normalizedParentId });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Group not found.' });
          return;
        }

        if (!result.success && result.reason === 'duplicate-name') {
          sendJson(res, 409, { message: 'Another group already uses this name.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-parent') {
          sendJson(res, 400, { message: 'The selected parent group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'cyclic-parent') {
          sendJson(res, 400, { message: 'A group cannot be nested within itself or its descendants.' });
          return;
        }

        if (!result.success && result.reason === 'protected-group') {
          sendJson(res, 400, { message: 'The root Mik-Group cannot be reassigned to another parent.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update group.');
        }

        sendJson(res, 200, { message: 'Group updated successfully.', group: mapGroup(result.group) });
      } catch (error) {
        console.error('Update group error', error);
        sendJson(res, 500, { message: 'Unable to update the group right now.' });
      }
    };

    const handleDeleteGroup = async (groupId) => {
      if (!Number.isInteger(groupId) || groupId <= 0) {
        sendJson(res, 400, { message: 'A valid group id is required.' });
        return;
      }

      try {
        const result = await db.deleteGroup(groupId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Group not found.' });
          return;
        }

        if (!result.success && result.reason === 'protected-group') {
          sendJson(res, 400, { message: 'The root Mik-Group cannot be deleted.' });
          return;
        }

        if (!result.success && result.reason === 'group-in-use') {
          sendJson(res, 409, { message: 'Remove or reparent child groups before deleting this group.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete group.');
        }

        sendNoContent(res);
      } catch (error) {
        console.error('Delete group error', error);
        sendJson(res, 500, { message: 'Unable to delete the group right now.' });
      }
    };

    const handleListMikrotiks = async () => {
      try {
        const [devices, groups] = await Promise.all([db.listMikrotiks(), db.listGroups()]);
        sendJson(res, 200, {
          mikrotiks: devices.map((device) => mapMikrotik(device, groups)),
          groups: groups.map(mapGroup)
        });
      } catch (error) {
        console.error('List Mikrotiks error', error);
        sendJson(res, 500, { message: 'Unable to load Mikrotik devices.' });
      }
    };

    const handleCreateMikrotik = async () => {
      const body = await parseJsonBody(req);
      const { name, host, groupId, tags, notes, routeros, status } = body ?? {};

      const normalizedName = normalizeString(name);
      const normalizedHost = normalizeString(host);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Device name is required.' });
        return;
      }

      if (!normalizedHost) {
        sendJson(res, 400, { message: 'Host or IP is required.' });
        return;
      }

      try {
        const result = await db.createMikrotik({
          name: normalizedName,
          host: normalizedHost,
          groupId,
          tags: normalizeTagsInput(tags),
          notes: normalizeNotesInput(notes),
          routeros: buildRouterosPayload(routeros),
          status: buildDeviceStatusPayload(status)
        });

        if (!result.success && result.reason === 'invalid-group') {
          sendJson(res, 400, { message: 'The selected group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'name-required') {
          sendJson(res, 400, { message: 'Device name is required.' });
          return;
        }

        if (!result.success && result.reason === 'host-required') {
          sendJson(res, 400, { message: 'Host or IP is required.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create Mikrotik.');
        }

        const groups = await db.listGroups();
        sendJson(res, 201, {
          message: 'Mikrotik device added successfully.',
          mikrotik: mapMikrotik(result.mikrotik, groups)
        });
      } catch (error) {
        console.error('Create Mikrotik error', error);
        sendJson(res, 500, { message: 'Unable to add the Mikrotik device right now.' });
      }
    };

    const handleUpdateMikrotik = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      const body = await parseJsonBody(req);
      const { name, host, groupId, tags, notes, routeros, status } = body ?? {};

      const payload = {};

      if (name !== undefined) {
        payload.name = normalizeString(name);
      }

      if (host !== undefined) {
        payload.host = normalizeString(host);
      }

      if (groupId !== undefined) {
        payload.groupId = groupId;
      }

      if (tags !== undefined) {
        payload.tags = normalizeTagsInput(tags);
      }

      if (notes !== undefined) {
        payload.notes = normalizeNotesInput(notes);
      }

      if (routeros !== undefined) {
        payload.routeros = buildRouterosPayload(routeros);
      }

      if (status !== undefined) {
        payload.status = buildDeviceStatusPayload(status);
      }

      try {
        const result = await db.updateMikrotik(deviceId, payload);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success && result.reason === 'name-required') {
          sendJson(res, 400, { message: 'Device name is required.' });
          return;
        }

        if (!result.success && result.reason === 'host-required') {
          sendJson(res, 400, { message: 'Host or IP is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-group') {
          sendJson(res, 400, { message: 'The selected group does not exist.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update Mikrotik.');
        }

        const groups = await db.listGroups();
        sendJson(res, 200, {
          message: 'Mikrotik device updated successfully.',
          mikrotik: mapMikrotik(result.mikrotik, groups)
        });
      } catch (error) {
        console.error('Update Mikrotik error', error);
        sendJson(res, 500, { message: 'Unable to update the Mikrotik device right now.' });
      }
    };

    const handleDeleteMikrotik = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        const result = await db.deleteMikrotik(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete Mikrotik.');
        }

        sendNoContent(res);
      } catch (error) {
        console.error('Delete Mikrotik error', error);
        sendJson(res, 500, { message: 'Unable to delete the Mikrotik device right now.' });
      }
    };

    const handleListTunnels = async () => {
      try {
        const [tunnels, groups, mikrotiks] = await Promise.all([
          db.listTunnels(),
          db.listGroups(),
          db.listMikrotiks()
        ]);

        sendJson(res, 200, {
          tunnels: tunnels.map((tunnel) => mapTunnel(tunnel, groups, mikrotiks)),
          groups: groups.map(mapGroup),
          mikrotiks: mikrotiks.map((device) => mapMikrotik(device, groups))
        });
      } catch (error) {
        console.error('List tunnels error', error);
        sendJson(res, 500, { message: 'Unable to load tunnels.' });
      }
    };

    const handleCreateTunnel = async () => {
      const body = await parseJsonBody(req);
      const {
        name,
        groupId,
        sourceId,
        targetId,
        connectionType,
        status,
        enabled,
        tags,
        notes,
        metrics
      } = body ?? {};

      const normalizedName = normalizeString(name);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Tunnel name is required.' });
        return;
      }

      try {
        const result = await db.createTunnel({
          name: normalizedName,
          groupId,
          sourceId,
          targetId,
          connectionType,
          status,
          enabled,
          tags,
          notes,
          metrics
        });

        if (!result.success && result.reason === 'invalid-group') {
          sendJson(res, 400, { message: 'The selected group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-source') {
          sendJson(res, 400, { message: 'A valid source Mikrotik is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-target') {
          sendJson(res, 400, { message: 'A valid target Mikrotik is required.' });
          return;
        }

        if (!result.success && result.reason === 'duplicate-endpoint') {
          sendJson(res, 400, { message: 'Source and target Mikrotiks must be different.' });
          return;
        }

        if (!result.success && result.reason === 'name-required') {
          sendJson(res, 400, { message: 'Tunnel name is required.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create tunnel.');
        }

        const [groups, mikrotiks] = await Promise.all([db.listGroups(), db.listMikrotiks()]);
        sendJson(res, 201, {
          message: 'Tunnel created successfully.',
          tunnel: mapTunnel(result.tunnel, groups, mikrotiks)
        });
      } catch (error) {
        console.error('Create tunnel error', error);
        sendJson(res, 500, { message: 'Unable to create the tunnel right now.' });
      }
    };

    const handleUpdateTunnel = async (tunnelId) => {
      if (!Number.isInteger(tunnelId) || tunnelId <= 0) {
        sendJson(res, 400, { message: 'A valid tunnel id is required.' });
        return;
      }

      const body = await parseJsonBody(req);

      try {
        const result = await db.updateTunnel(tunnelId, body ?? {});

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Tunnel not found.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-group') {
          sendJson(res, 400, { message: 'The selected group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-source') {
          sendJson(res, 400, { message: 'A valid source Mikrotik is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-target') {
          sendJson(res, 400, { message: 'A valid target Mikrotik is required.' });
          return;
        }

        if (!result.success && result.reason === 'duplicate-endpoint') {
          sendJson(res, 400, { message: 'Source and target Mikrotiks must be different.' });
          return;
        }

        if (!result.success && result.reason === 'name-required') {
          sendJson(res, 400, { message: 'Tunnel name is required.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update tunnel.');
        }

        const [groups, mikrotiks] = await Promise.all([db.listGroups(), db.listMikrotiks()]);
        sendJson(res, 200, {
          message: 'Tunnel updated successfully.',
          tunnel: mapTunnel(result.tunnel, groups, mikrotiks)
        });
      } catch (error) {
        console.error('Update tunnel error', error);
        sendJson(res, 500, { message: 'Unable to update the tunnel right now.' });
      }
    };

    const handleDeleteTunnel = async (tunnelId) => {
      if (!Number.isInteger(tunnelId) || tunnelId <= 0) {
        sendJson(res, 400, { message: 'A valid tunnel id is required.' });
        return;
      }

      try {
        const result = await db.deleteTunnel(tunnelId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Tunnel not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete tunnel.');
        }

        sendNoContent(res);
      } catch (error) {
        console.error('Delete tunnel error', error);
        sendJson(res, 500, { message: 'Unable to delete the tunnel right now.' });
      }
    };

    const handleDashboardMetrics = async () => {
      try {
        const snapshot = await db.getDashboardSnapshot();
        sendJson(res, 200, snapshot);
      } catch (error) {
        console.error('Dashboard metrics error', error);
        sendJson(res, 500, { message: 'Unable to load dashboard metrics.' });
      }
    };

    const handleListIpams = async () => {
      try {
        const ipams = await db.listIpams();
        sendJson(res, 200, { ipams });
      } catch (error) {
        console.error('List IPAMs error', error);
        sendJson(res, 500, { message: 'Unable to load phpIPAM integrations.' });
      }
    };

    const handleCreateIpam = async () => {
      const body = await parseJsonBody(req);
      const { name, baseUrl, appId, appCode, appPermissions, appSecurity } = body ?? {};

      try {
        const result = await db.createIpam({ name, baseUrl, appId, appCode, appPermissions, appSecurity });

        if (!result.success) {
          if (result.reason === 'duplicate-integration') {
            sendJson(res, 409, {
              message: 'An integration with this base URL and App ID already exists.'
            });
            return;
          }

          if (
            result.reason === 'name-required' ||
            result.reason === 'base-url-required' ||
            result.reason === 'app-id-required' ||
            result.reason === 'app-code-required'
          ) {
            sendJson(res, 400, { message: 'Name, base URL, App ID, and App Code are required.' });
            return;
          }

          throw new Error('Unable to create IPAM integration');
        }

        let ipam = result.ipam;
        let testResult = null;

        try {
          testResult = await testPhpIpamConnection(ipam);
          const timestamp = new Date().toISOString();
          await db.updateIpamStatus(ipam.id, { status: testResult.status, checkedAt: timestamp });
          const refreshed = await db.getIpamById(ipam.id);
          if (refreshed) {
            ipam = refreshed;
          }
        } catch (error) {
          console.warn('Initial phpIPAM test failed', error);
        }

        sendJson(res, 201, { ipam, test: testResult });
      } catch (error) {
        console.error('Create IPAM error', error);
        sendJson(res, 500, { message: 'Unable to add the phpIPAM integration.' });
      }
    };

    const handleDeleteIpam = async (ipamId) => {
      if (!Number.isInteger(ipamId) || ipamId <= 0) {
        sendJson(res, 400, { message: 'A valid IPAM id is required.' });
        return;
      }

      try {
        const result = await db.deleteIpam(ipamId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'IPAM integration not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete IPAM integration');
        }

        sendNoContent(res);
      } catch (error) {
        console.error('Delete IPAM error', error);
        sendJson(res, 500, { message: 'Unable to delete the phpIPAM integration.' });
      }
    };

    const handleTestIpam = async (ipamId) => {
      if (!Number.isInteger(ipamId) || ipamId <= 0) {
        sendJson(res, 400, { message: 'A valid IPAM id is required.' });
        return;
      }

      try {
        const ipam = await db.getIpamById(ipamId);

        if (!ipam) {
          sendJson(res, 404, { message: 'IPAM integration not found.' });
          return;
        }

        const result = await testPhpIpamConnection(ipam);
        const timestamp = new Date().toISOString();
        await db.updateIpamStatus(ipamId, { status: result.status, checkedAt: timestamp });

        sendJson(res, 200, {
          ok: result.status === 'connected',
          status: result.status,
          message: result.message
        });
      } catch (error) {
        console.error('Test IPAM error', error);
        sendJson(res, 500, { message: 'Unable to verify phpIPAM connectivity.' });
      }
    };

    const handleSyncIpam = async (ipamId) => {
      if (!Number.isInteger(ipamId) || ipamId <= 0) {
        sendJson(res, 400, { message: 'A valid IPAM id is required.' });
        return;
      }

      try {
        const ipam = await db.getIpamById(ipamId);

        if (!ipam) {
          sendJson(res, 404, { message: 'IPAM integration not found.' });
          return;
        }

        const collections = await syncPhpIpamStructure(ipam);
        await db.replaceIpamCollections(ipamId, collections);
        const timestamp = new Date().toISOString();
        await db.updateIpamStatus(ipamId, { status: 'connected', checkedAt: timestamp });

        sendJson(res, 200, {
          sections: collections.sections.length,
          datacenters: collections.datacenters.length,
          ranges: collections.ranges.length
        });
      } catch (error) {
        console.error('Sync IPAM error', error);

        if (Number.isInteger(ipamId) && ipamId > 0) {
          try {
            await db.updateIpamStatus(ipamId, { status: 'failed', checkedAt: new Date().toISOString() });
          } catch (updateError) {
            console.error('Failed to record IPAM failure status', updateError);
          }
        }

        sendJson(res, 502, {
          message: error.message || 'Unable to synchronise phpIPAM structure.'
        });
      }
    };

    try {
      if (method === 'GET' && (canonicalPath === '/health' || resourcePath === '/health')) {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/meta' || resourcePath === '/meta')) {
        try {
          const [userCount, registrationLocked] = await Promise.all([
            db.countUsers(),
            db.hasAnyUsers()
          ]);

          sendJson(res, 200, {
            version,
            userCount,
            registrationOpen: !registrationLocked
          });
        } catch (error) {
          console.error('Meta endpoint error', error);
          sendJson(res, 200, { version, registrationOpen: true });
        }
        return;
      }

      if (
        method === 'GET' &&
        (canonicalPath === '/api/dashboard/metrics' || resourcePath === '/dashboard/metrics')
      ) {
        await handleDashboardMetrics();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/ipams' || resourcePath === '/ipams')) {
        await handleListIpams();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/ipams' || resourcePath === '/ipams')) {
        await handleCreateIpam();
        return;
      }

      if (resourceSegments[0] === 'ipams' && resourceSegments.length >= 2) {
        const idSegment = resourceSegments[1];
        const ipamId = Number.parseInt(idSegment, 10);

        if (resourceSegments.length === 2) {
          if (method === 'DELETE') {
            await handleDeleteIpam(ipamId);
            return;
          }
        }

        if (resourceSegments.length === 3 && method === 'POST') {
          const action = resourceSegments[2];

          if (action === 'test') {
            await handleTestIpam(ipamId);
            return;
          }

          if (action === 'sync') {
            await handleSyncIpam(ipamId);
            return;
          }
        }
      }

      if (method === 'GET' && (canonicalPath === '/api/config-info' || resourcePath === '/config-info')) {
        sendJson(res, 200, {
          database: {
            driver: config.driver,
            file: databaseFile,
            configFile: getConfigFilePath()
          }
        });
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/register' || resourcePath === '/register')) {
        await handleRegister();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/users' || resourcePath === '/users')) {
        await handleCreateUser();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/login' || resourcePath === '/login')) {
        await handleLogin();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/users' || resourcePath === '/users')) {
        await handleListUsers();
        return;
      }

      if (resourceSegments[0] === 'users' && resourceSegments.length === 2) {
        const idSegment = resourceSegments[1];
        const userId = Number.parseInt(idSegment, 10);

        if (method === 'GET') {
          await handleGetUser(userId);
          return;
        }

        if (method === 'PUT') {
          await handleUpdateUser(userId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteUser(userId);
          return;
        }
      }

      if (method === 'GET' && (canonicalPath === '/api/roles' || resourcePath === '/roles')) {
        await handleListRoles();
        return;
      }

      if (resourceSegments[0] === 'roles' && resourceSegments.length === 2) {
        const idSegment = resourceSegments[1];
        const roleId = Number.parseInt(idSegment, 10);

        if (method === 'PUT') {
          await handleUpdateRole(roleId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteRole(roleId);
          return;
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/roles' || resourcePath === '/roles')) {
        await handleCreateRole();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/groups' || resourcePath === '/groups')) {
        await handleListGroups();
        return;
      }

      if (resourceSegments[0] === 'groups' && resourceSegments.length === 2) {
        const idSegment = resourceSegments[1];
        const groupId = Number.parseInt(idSegment, 10);

        if (method === 'PUT') {
          await handleUpdateGroup(groupId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteGroup(groupId);
          return;
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/groups' || resourcePath === '/groups')) {
        await handleCreateGroup();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/mikrotiks' || resourcePath === '/mikrotiks')) {
        await handleListMikrotiks();
        return;
      }

      if (resourceSegments[0] === 'mikrotiks' && resourceSegments.length === 2) {
        const idSegment = resourceSegments[1];
        const deviceId = Number.parseInt(idSegment, 10);

        if (method === 'PUT') {
          await handleUpdateMikrotik(deviceId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteMikrotik(deviceId);
          return;
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/mikrotiks' || resourcePath === '/mikrotiks')) {
        await handleCreateMikrotik();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/tunnels' || resourcePath === '/tunnels')) {
        await handleListTunnels();
        return;
      }

      if (resourceSegments[0] === 'tunnels' && resourceSegments.length === 2) {
        const idSegment = resourceSegments[1];
        const tunnelId = Number.parseInt(idSegment, 10);

        if (method === 'PUT') {
          await handleUpdateTunnel(tunnelId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteTunnel(tunnelId);
          return;
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/tunnels' || resourcePath === '/tunnels')) {
        await handleCreateTunnel();
        return;
      }

      sendJson(res, 404, { message: 'Not found.' });
    } catch (error) {
      console.error('Request handling error', error);
      sendJson(res, 500, { message: 'Unexpected server error.' });
    }
  });

  server.listen(port, () => {
    console.log(`API server ready at http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
