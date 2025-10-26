import http from 'http';
import https from 'https';
import { URL } from 'url';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import initializeDatabase, { 
  resolveDatabaseFile
} from './database.js';
import { 
  toggleMikrotikSafeMode,
  getMikrotikSafeModeStatus,
  getMikrotikUpdateInfo,
  installMikrotikUpdate,
  getMikrotikById,
  addMikrotikIpAddress,
  updateMikrotikIpAddress,
  updateMikrotikFirewallRule,
  addSystemLog,
  getMikrotikInterfaceDetails,
  addToQueue,
  updateQueueStatus,
  retryQueueItem,
  moveToLog,
  getQueue,
  getLogs,
  deleteQueueItem,
  deleteLogEntry,
  verifyAddIp,
  verifyDeleteIp,
  verifySync
} from './database.js';
import { 
  applyFirewallRuleToGroup, 
  createAddressList, 
  getAddressLists, 
  getGroupFirewallRules 
} from './group-firewall.js';
import { ensureDatabaseConfig, getConfigFilePath } from './config.js';
import getProjectVersion from './version.js';
import { 
  getVersionInfo, 
  getStableVersion, 
  getBetaVersion, 
  isBetaAhead, 
  promoteBetaToStable 
} from './version-manager.js';

// Basic in-memory rate limiting for mutating requests
const rateLimitBuckets = new Map(); // key: ip => { tokens, last }
const RATE_LIMIT_CAPACITY = 120; // tokens
const RATE_LIMIT_REFILL_PER_SEC = 2; // tokens per second
const isMutatingMethod = (m) => m === 'POST' || m === 'PUT' || m === 'DELETE' || m === 'PATCH';
const allowRequest = (ip, nowMs) => {
  const nowSec = Math.floor(nowMs / 1000);
  const bucket = rateLimitBuckets.get(ip) || { tokens: RATE_LIMIT_CAPACITY, last: nowSec };
  const elapsed = Math.max(0, nowSec - bucket.last);
  bucket.tokens = Math.min(RATE_LIMIT_CAPACITY, bucket.tokens + elapsed * RATE_LIMIT_REFILL_PER_SEC);
  bucket.last = nowSec;
  if (bucket.tokens < 1) {
    rateLimitBuckets.set(ip, bucket);
    return false;
  }
  bucket.tokens -= 1;
  rateLimitBuckets.set(ip, bucket);
  return true;
};

// Helper functions for version management
const getCommitCount = async () => {
  try {
    const { execSync } = await import('child_process');
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    return parseInt(count, 10);
  } catch (error) {
    console.error('Error getting commit count:', error);
    return 0;
  }
};

// Helper function to calculate possible subnets
const calculatePossibleSubnets = (subnet, currentMask, newCidr) => {
  const newMask = parseInt(newCidr.replace('/', ''));
  const currentMaskNum = parseInt(currentMask);
  
  if (newMask <= currentMaskNum) {
    return [];
  }
  
  const possibleSubnets = [];
  const subnetBits = newMask - currentMaskNum;
  const numSubnets = Math.pow(2, subnetBits);
  
  // Parse IP address
  const ipParts = subnet.split('.');
  const ipNum = (parseInt(ipParts[0]) << 24) + (parseInt(ipParts[1]) << 16) + 
                (parseInt(ipParts[2]) << 8) + parseInt(ipParts[3]);
  
  const subnetSize = Math.pow(2, 32 - newMask);
  
  for (let i = 0; i < numSubnets; i++) {
    const startIP = ipNum + (i * subnetSize);
    const endIP = startIP + subnetSize - 1;
    
    const startIPStr = [
      (startIP >>> 24) & 0xFF,
      (startIP >>> 16) & 0xFF,
      (startIP >>> 8) & 0xFF,
      startIP & 0xFF
    ].join('.');
    
    const endIPStr = [
      (endIP >>> 24) & 0xFF,
      (endIP >>> 16) & 0xFF,
      (endIP >>> 8) & 0xFF,
      endIP & 0xFF
    ].join('.');
    
    possibleSubnets.push({
      subnet: `${startIPStr}/${newMask}`,
      startIP: startIPStr,
      endIP: endIPStr,
      size: subnetSize,
      available: true
    });
  }
  
  return possibleSubnets;
};

const getLatestCommitCount = async () => {
  try {
    const { execSync } = await import('child_process');
    
    // Try multiple methods to get latest commit count
    let count = 0;
    
    try {
      // Method 1: Fetch and count origin/main
      execSync('git fetch origin main', { encoding: 'utf8', timeout: 10000 });
      const remoteCount = execSync('git rev-list --count origin/main', { encoding: 'utf8' }).trim();
      count = parseInt(remoteCount, 10);
      console.log('Remote commit count:', count);
    } catch (fetchError) {
      console.log('Fetch failed, trying local HEAD:', fetchError.message);
      
      try {
        // Method 2: Use local HEAD
        const localCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
        count = parseInt(localCount, 10);
        console.log('Local commit count:', count);
      } catch (localError) {
        console.log('Local count failed, using current count:', localError.message);
        // Method 3: Use current count as fallback
        count = getCommitCount();
      }
    }
    
    return count;
  } catch (error) {
    console.error('Error getting latest commit count:', error);
    // Fallback to current commit count
    return getCommitCount();
  }
};

const getLatestStableVersion = async () => {
  try {
    const { execSync } = await import('child_process');
    // Check for latest stable tag (without -beta suffix)
    const tags = execSync('git tag --sort=-version:refname | grep -E "^v[0-9]+\\.[0-9]+$" | head -1', { encoding: 'utf8' }).trim();
    return tags || null;
  } catch (error) {
    console.error('Error getting latest stable version:', error);
    return null;
  }
};

const getCurrentStableVersion = async () => {
  try {
    const { execSync } = await import('child_process');
    // Get the last stable version (without -beta suffix)
    const currentCommitCount = getCommitCount();
    const major = Math.floor(currentCommitCount / 100);
    const minor = currentCommitCount % 100;
    return `v${major}.${minor.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error getting current stable version:', error);
    return null;
  }
};

const formatVersion = (commitCount) => {
  const major = Math.floor(commitCount / 100);
  const minor = commitCount % 100;
  return `v${major}.${minor.toString().padStart(2, '0')}`;
};

const readRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

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

const TARGET_ROUTEROS_VERSION = '7.14.0';

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

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders,
    ...securityHeaders
  });
  res.end(body);
};

const sendNoContent = (res) => {
  res.writeHead(204, { ...corsHeaders, ...securityHeaders });
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
  const url = `${baseUrl}/api/${appId}/${trimmedEndpoint}`;

  const allowNotFound = Boolean(options.allowNotFound);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_PHPIPAM_TIMEOUT_MS);

  let response;

  console.log(`🌐 Making request to: ${url}`);
  console.log(`🔑 Using App ID: ${appId}`);
  console.log(`🔑 Using App Code: ${ipam.appCode ?? 'none'}`);

  try {
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mik-Management/1.0',
        'token': ipam.appCode ?? '',
        ...(options.headers || {})
      },
      signal: controller.signal
    };
    
    // Add body for POST, PUT, PATCH requests
    if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method || '')) {
      fetchOptions.body = options.body;
      console.log('📤 Request body:', options.body);
    }
    
    response = await fetchImpl(url, fetchOptions);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('phpIPAM request timed out');
    }
    throw new Error(error.message || 'Failed to reach phpIPAM');
  } finally {
    clearTimeout(timeout);
  }

  console.log(`🔍 Response status: ${response.status}`);
  console.log(`🔍 Content-Type: ${response.headers.get('content-type') || 'unknown'}`);
  
  let payload;
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      payload = await response.json();
      console.log(`✅ JSON response:`, JSON.stringify(payload, null, 2));
    } else {
      const text = await response.text();
      console.log(`🔍 Raw response from phpIPAM: \n${text}`);
      console.log(`🔍 Content-Type: ${contentType}`);
      console.log(`🔍 Status: ${response.status}`);
      console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()));
      payload = text ? JSON.parse(text) : {};
    }
  } catch (error) {
    console.log(`❌ Error parsing response: ${error.message}`);
    console.log(`❌ Response status: ${response.status}`);
    console.log(`❌ Response headers:`, Object.fromEntries(response.headers.entries()));
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
  console.log(`🔍 Testing phpIPAM connection to: ${ipam.baseUrl}`);
  console.log(`📋 IPAM Config:`, {
    name: ipam.name,
    baseUrl: ipam.baseUrl,
    appId: ipam.appId,
    appPermissions: ipam.appPermissions,
    appSecurity: ipam.appSecurity
  });
  
  try {
    console.log(`🌐 Making request to: ${ipam.baseUrl}/api/user/`);
    const response = await phpIpamFetch(ipam, 'user/');
    console.log(`✅ phpIPAM response:`, JSON.stringify(response, null, 2));

    if (response && typeof response === 'object') {
      const username = response.username || response.data?.username;
      console.log(`👤 Connected as user: ${username || 'unknown'}`);
      return {
        status: 'connected',
        message: username ? `Authenticated as ${username}` : 'phpIPAM connection succeeded'
      };
    }

    console.log(`❌ Invalid response structure from phpIPAM`);
    return { status: 'connected', message: 'phpIPAM connection succeeded' };
  } catch (error) {
    console.log(`❌ phpIPAM connection failed:`, error.message);
    console.log(`🔍 Error details:`, error);
    return { status: 'failed', message: error.message || 'Unable to reach phpIPAM' };
  }
};

const syncPhpIpamStructure = async (ipam) => {
  console.log(`🔄 Syncing phpIPAM structure from: ${ipam.baseUrl}`);
  console.log(`📋 IPAM Config:`, {
    name: ipam.name,
    baseUrl: ipam.baseUrl,
    appId: ipam.appId
  });
  
  let sections = [];
  
  try {
    console.log(`📂 Fetching sections from: ${ipam.baseUrl}/api/sections/`);
    const sectionsPayload = normalisePhpIpamList(await phpIpamFetch(ipam, 'sections/'));
    console.log(`📂 Sections response:`, JSON.stringify(sectionsPayload, null, 2));
    
    sections = sectionsPayload.map((section) => {
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
  } catch (error) {
    console.log(`❌ Error fetching sections:`, error.message);
    return { sections: [], datacenters: [], ranges: [] };
  }

  let datacentersPayload = [];

  try {
    console.log(`🏢 Fetching datacenters from: ${ipam.baseUrl}/api/tools/locations/`);
    datacentersPayload = normalisePhpIpamList(await phpIpamFetch(ipam, 'tools/locations/', { allowNotFound: true }));
    console.log(`🏢 Datacenters response:`, JSON.stringify(datacentersPayload, null, 2));
  } catch (error) {
    console.log(`⚠️ Datacenters fetch failed:`, error.message);
    if (!/not\s+found/i.test(error.message || '')) {
      throw error;
    }
  }

  if (!datacentersPayload.length) {
    console.log(`🏢 Trying sites endpoint: ${ipam.baseUrl}/api/tools/sites/`);
    datacentersPayload = normalisePhpIpamList(await phpIpamFetch(ipam, 'tools/sites/', { allowNotFound: true }));
    console.log(`🏢 Sites response:`, JSON.stringify(datacentersPayload, null, 2));
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
  console.log(`📊 Processing ${sections.length} sections for ranges...`);

  for (const section of sections) {
    const sectionId = section.id ?? resolvePhpIpamId(section, ['sectionId']);
    console.log(`📊 Processing section: ${section.name} (ID: ${sectionId})`);

    if (!sectionId) {
      console.log(`⚠️ Skipping section ${section.name} - no valid ID`);
      continue;
    }

    try {
      console.log(`📊 Fetching subnets for section ${sectionId}: ${ipam.baseUrl}/api/sections/${sectionId}/subnets/`);
      const rawRanges = normalisePhpIpamList(
        await phpIpamFetch(ipam, `sections/${sectionId}/subnets/`, { allowNotFound: true })
      );
      console.log(`📊 Subnets for section ${sectionId}:`, JSON.stringify(rawRanges, null, 2));

      // Process all subnets recursively (including nested ones)
      const processSubnet = async (entry, parentSectionId) => {
        const identifier = resolvePhpIpamId(entry, ['subnetId', 'subnet']);
        const rangeId = Number.parseInt(identifier, 10);

        const subnet = formatPhpIpamSubnet(entry.subnet ?? entry.network ?? identifier);
        const mask = entry.mask ?? entry.cidr ?? entry.bit ?? entry.netmask;
        const parsedMask = Number.parseInt(mask, 10);
        const cidr = subnet && Number.isInteger(parsedMask) ? `${subnet}/${parsedMask}` : subnet || identifier;

        const metadata = {
          cidr: cidr || '',
          sectionId: parentSectionId,
          vlanId: entry.vlanId ?? entry.vlanid ?? entry.vlan ?? null,
          masterSubnetId: entry.masterSubnetId ?? entry.masterSubnet ?? entry.parent ?? null,
          isFolder: entry.isFolder ?? entry.is_folder ?? entry.folder ?? false,
          isFull: entry.isFull ?? entry.is_full ?? entry.full ?? false
        };

        Object.keys(metadata).forEach((key) => {
          if (metadata[key] === null || metadata[key] === undefined || metadata[key] === '') {
            delete metadata[key];
          }
        });

        // Fetch IPs within this range
        let ips = [];
        
        try {
          console.log(`📊 Fetching IPs for range ${rangeId}: ${ipam.baseUrl}/api/subnets/${rangeId}/addresses/`);
          const rawIps = normalisePhpIpamList(
            await phpIpamFetch(ipam, `subnets/${rangeId}/addresses/`, { allowNotFound: true })
          );
          console.log(`📊 IPs for range ${rangeId}:`, JSON.stringify(rawIps, null, 2));

          if (Array.isArray(rawIps) && rawIps.length > 0) {
            ips = rawIps.map((ipEntry) => {
              const ipId = resolvePhpIpamId(ipEntry, ['id']);
              return {
                id: Number.parseInt(ipId, 10) || ipId,
                ip: ipEntry.ip || ipEntry.address || '',
                hostname: ipEntry.hostname || ipEntry.description || '',
                description: ipEntry.description || '',
                state: ipEntry.state || 'active',
                note: ipEntry.note || '',
                owner: ipEntry.owner || '',
                switch: ipEntry.switch || '',
                port: ipEntry.port || '',
                mac: ipEntry.mac || '',
                lastSeen: ipEntry.lastSeen || null
              };
            });
          }
        } catch (error) {
          console.log(`❌ Error fetching IPs for range ${rangeId}:`, error.message);
          console.log(`❌ Error details:`, error);
        }

        ranges.push({
          id: Number.isInteger(rangeId) ? rangeId : identifier,
          name: entry.description || entry.hostname || cidr || `Range ${identifier ?? ''}`,
          description: entry.description || '',
          metadata,
          ips: ips
        });

        // Fetch and process nested subnets (slaves)
        try {
          if (Number.isInteger(rangeId)) {
            console.log(`📊 Fetching nested subnets for ${rangeId}...`);
            const nestedSubnets = normalisePhpIpamList(
              await phpIpamFetch(ipam, `subnets/${rangeId}/slaves/`, { allowNotFound: true })
            );
            
            if (nestedSubnets.length > 0) {
              console.log(`📊 Found ${nestedSubnets.length} nested subnets under ${rangeId}`);
              for (const nestedEntry of nestedSubnets) {
                await processSubnet(nestedEntry, parentSectionId);
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Error fetching nested subnets for ${rangeId}:`, error.message);
        }
      };

      // Only process top-level subnets (masterSubnetId = 0 or null)
      // Nested subnets will be fetched recursively
      const topLevelSubnets = rawRanges.filter(entry => {
        const masterSubnetId = entry.masterSubnetId ?? entry.masterSubnet ?? entry.parent ?? 0;
        return masterSubnetId == 0 || masterSubnetId === null;
      });
      
      console.log(`📊 Processing ${topLevelSubnets.length} top-level subnets out of ${rawRanges.length} total`);
      
      for (const entry of topLevelSubnets) {
        await processSubnet(entry, sectionId);
      }
    } catch (error) {
      console.log(`❌ Error fetching subnets for section ${sectionId}:`, error.message);
    }
  }

  console.log(`✅ Sync completed successfully:`);
  console.log(`📂 Sections: ${sections.length}`);
  console.log(`🏢 Datacenters: ${datacenters.length}`);
  console.log(`📊 Ranges: ${ranges.length}`);
  
  return { sections, datacenters, ranges };
};

// Lightweight per-section cache (memory only)
const sectionCache = new Map(); // key: `${ipamId}:${sectionId}` => { ts, ranges }
const SECTION_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Simple per-page cache (memory only)
const pageCache = new Map(); // key: string => { ts, data }
const PAGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const syncPhpIpamSection = async (ipam, sectionId) => {
  // Build only this section's ranges (top-level + nested)
  const ranges = [];
  const sid = Number.parseInt(sectionId, 10);
  if (!Number.isInteger(sid)) {
    return { ranges: [] };
  }

  try {
    const rawRanges = normalisePhpIpamList(
      await phpIpamFetch(ipam, `sections/${sid}/subnets/`, { allowNotFound: true })
    );

    const processSubnet = async (entry, parentSectionId) => {
      const identifier = resolvePhpIpamId(entry, ['subnetId', 'subnet']);
      const rangeId = Number.parseInt(identifier, 10);

      const subnet = formatPhpIpamSubnet(entry.subnet ?? entry.network ?? identifier);
      const mask = entry.mask ?? entry.cidr ?? entry.bit ?? entry.netmask;
      const parsedMask = Number.parseInt(mask, 10);
      const cidr = subnet && Number.isInteger(parsedMask) ? `${subnet}/${parsedMask}` : subnet || identifier;

      const metadata = {
        cidr: cidr || '',
        sectionId: parentSectionId,
        vlanId: entry.vlanId ?? entry.vlanid ?? entry.vlan ?? null,
        masterSubnetId: entry.masterSubnetId ?? entry.masterSubnet ?? entry.parent ?? null,
        isFolder: entry.isFolder ?? entry.is_folder ?? entry.folder ?? false,
        isFull: entry.isFull ?? entry.is_full ?? entry.full ?? false
      };
      Object.keys(metadata).forEach((k) => (metadata[k] === null || metadata[k] === undefined || metadata[k] === '') && delete metadata[k]);

      // Fetch IPs for this subnet
      let ips = [];
      try {
        const rawIps = normalisePhpIpamList(
          await phpIpamFetch(ipam, `subnets/${rangeId}/addresses/`, { allowNotFound: true })
        );
        if (Array.isArray(rawIps) && rawIps.length > 0) {
          ips = rawIps.map((ipEntry) => {
            const ipId = resolvePhpIpamId(ipEntry, ['id']);
            return {
              id: Number.parseInt(ipId, 10) || ipId,
              ip: ipEntry.ip || ipEntry.address || '',
              hostname: ipEntry.hostname || ipEntry.description || '',
              description: ipEntry.description || '',
              state: ipEntry.state || 'active',
              note: ipEntry.note || '',
              owner: ipEntry.owner || '',
              switch: ipEntry.switch || '',
              port: ipEntry.port || '',
              mac: ipEntry.mac || '',
              lastSeen: ipEntry.lastSeen || null
            };
          });
        }
      } catch (e) {}

      ranges.push({
        id: Number.isInteger(rangeId) ? rangeId : identifier,
        name: entry.description || entry.hostname || cidr || `Range ${identifier ?? ''}`,
        description: entry.description || '',
        metadata,
        ips
      });

      // Nested slaves
      try {
        if (Number.isInteger(rangeId)) {
          const nested = normalisePhpIpamList(
            await phpIpamFetch(ipam, `subnets/${rangeId}/slaves/`, { allowNotFound: true })
          );
          for (const n of nested) {
            await processSubnet(n, parentSectionId);
          }
        }
      } catch (e) {}
    };

    const topLevel = rawRanges.filter((entry) => {
      const masterSubnetId = entry.masterSubnetId ?? entry.masterSubnet ?? entry.parent ?? 0;
      return masterSubnetId == 0 || masterSubnetId === null;
    });

    for (const entry of topLevel) {
      await processSubnet(entry, sid);
    }
  } catch (e) {
    console.log('❌ Section sync error:', e.message);
  }

  return { ranges };
};

const processQueuedOperation = async (queueItem) => {
  try {
    const ipamId = queueItem.ipamId;
    const ipam = await db.getIpamById(ipamId);
    if (!ipam) {
      await updateQueueStatus(queueItem.id, 'failed', 'IPAM not found');
      return;
    }

    await updateQueueStatus(queueItem.id, 'processing');

    // Helper: normalize phpIPAM id from diverse response shapes
    const extractPhpIpamId = (resp) => {
      if (!resp) return null;
      const candidate = resp.id ?? resp.data?.id ?? resp.data ?? resp.insertId ?? null;
      if (candidate == null) return null;
      const parsed = Number.parseInt(candidate, 10);
      return Number.isInteger(parsed) ? parsed : candidate;
    };

    switch (queueItem.type) {
      case 'add_ip': {
        const { ipAddress, cidr, mask, subnetId, parentRangeCidr, sectionId, hostname, description } = queueItem.data || {};
        let parentSubnetId = subnetId;
        // Resolve parent subnet id if missing
        if (!parentSubnetId && parentRangeCidr) {
          try {
            const subnets = normalisePhpIpamList(await phpIpamFetch(ipam, 'subnets/', { allowNotFound: true }));
            const match = subnets.find((s) => `${s.subnet}/${s.mask}` === parentRangeCidr);
            if (match && match.id) parentSubnetId = Number.parseInt(match.id, 10);
          } catch (e) {}
        }
        if (!parentSubnetId) throw new Error('Parent subnet could not be resolved');

        // Create nested subnet
        const sid = Number.parseInt(sectionId, 10);
        const subnetPayload = { subnet: ipAddress, mask: mask || (cidr?.split('/')[1] || '128'), sectionId: Number.isInteger(sid) ? sid : sectionId, description: description || hostname, masterSubnetId: parentSubnetId };
        const subnetResponse = await phpIpamFetch(ipam, 'subnets/', { method: 'POST', body: JSON.stringify(subnetPayload) });
        const newSubnetId = extractPhpIpamId(subnetResponse);
        // Add address
        const ipPayload = { ip: ipAddress, hostname, description: description || '', subnetId: Number.parseInt(newSubnetId, 10) };
        await phpIpamFetch(ipam, 'addresses/', { method: 'POST', body: JSON.stringify(ipPayload) });

        const verificationResult = await verifyAddIp(ipam, ipAddress, newSubnetId);
        await moveToLog(queueItem, verificationResult);
        break;
      }
      case 'add_range': {
        const { cidr, description, sectionId, parentSubnetId: inputParentSubnetId, parentRangeCidr } = queueItem.data || {};
        if (!cidr) {
          await updateQueueStatus(queueItem.id, 'failed', 'CIDR is required');
          break;
        }
        let parentSubnetId = inputParentSubnetId;
        // Resolve parent subnet id if missing but CIDR of parent is provided
        if (!parentSubnetId && parentRangeCidr) {
          try {
            const subnets = normalisePhpIpamList(await phpIpamFetch(ipam, 'subnets/', { allowNotFound: true }));
            const match = subnets.find((s) => `${s.subnet}/${s.mask}` === parentRangeCidr);
            if (match && match.id) parentSubnetId = Number.parseInt(match.id, 10);
          } catch (e) {}
        }

        const [subnetPart, maskPart] = `${cidr}`.split('/');
        const mask = maskPart || '32';
        const sid = Number.parseInt(sectionId, 10);
        const subnetPayload = {
          subnet: subnetPart,
          mask,
          sectionId: Number.isInteger(sid) ? sid : sectionId,
          description: description || cidr,
          ...(parentSubnetId ? { masterSubnetId: parentSubnetId } : {})
        };

        // Create subnet in phpIPAM
        const created = await phpIpamFetch(ipam, 'subnets/', { method: 'POST', body: JSON.stringify(subnetPayload) });
        const newSubnetId = extractPhpIpamId(created);

        // Verify creation by fetching the subnet or listing and matching
        let verified = false;
        try {
          const fetched = await phpIpamFetch(ipam, `subnets/${newSubnetId}/`, { allowNotFound: true });
          verified = Boolean(fetched && (fetched.id || fetched.subnet));
        } catch (e) {
          try {
            const subnets = normalisePhpIpamList(await phpIpamFetch(ipam, 'subnets/', { allowNotFound: true }));
            verified = subnets.some((s) => `${s.subnet}/${s.mask}` === cidr);
          } catch (_) {}
        }

        const verificationResult = {
          success: Boolean(newSubnetId) && verified,
          message: verified ? `Range ${cidr} created with ID ${newSubnetId}` : `Range ${cidr} creation unverified`,
          details: { cidr, newSubnetId, sectionId, parentSubnetId }
        };
        await moveToLog(queueItem, verificationResult);
        break;
      }
      case 'provision_tunnel': {
        const { tunnelId, parentSubnetId: inputParentSubnetId, parentRangeCidr, mask = 30, description } = queueItem.data || {};
        let parentSubnetId = inputParentSubnetId;
        // Resolve parent subnet ID if not provided
        if (!parentSubnetId && parentRangeCidr) {
          try {
            const subnets = normalisePhpIpamList(await phpIpamFetch(ipam, 'subnets/', { allowNotFound: true }));
            const match = subnets.find((s) => `${s.subnet}/${s.mask}` === parentRangeCidr);
            if (match && match.id) parentSubnetId = Number.parseInt(match.id, 10);
          } catch (e) {}
        }
        if (!parentSubnetId) throw new Error('Parent subnet could not be resolved');

        // Create first available /30 under parent
        const createFirst = await phpIpamFetch(ipam, `subnets/${parentSubnetId}/first_subnet/${mask}/`, { method: 'POST', body: JSON.stringify({ description: description || `Tunnel ${tunnelId}` }) });
        const newSubnetId = createFirst?.id || createFirst;

        // Allocate two first-free IPs in the new subnet for endpoints
        const addrA = await phpIpamFetch(ipam, 'addresses/first_free/', { method: 'POST', body: JSON.stringify({ subnetId: newSubnetId, hostname: `tunnel-${tunnelId}-A` }) });
        const addrB = await phpIpamFetch(ipam, 'addresses/first_free/', { method: 'POST', body: JSON.stringify({ subnetId: newSubnetId, hostname: `tunnel-${tunnelId}-B` }) });

        const ipA = addrA?.data?.ip || addrA?.ip || addrA?.address || addrA;
        const ipB = addrB?.data?.ip || addrB?.ip || addrB?.address || addrB;

        const verificationResult = {
          success: Boolean(newSubnetId && ipA && ipB),
          message: newSubnetId && ipA && ipB ? `Provisioned /${mask} with ${ipA} and ${ipB}` : 'Provision result uncertain',
          details: { tunnelId, parentSubnetId, newSubnetId, ipA, ipB }
        };

        await moveToLog(queueItem, verificationResult);
        break;
      }
      case 'delete_ip': {
        const { rangeId, ipAddress, subnetId } = queueItem.data || {};
        try {
          await phpIpamFetch(ipam, `subnets/${rangeId}/`, { method: 'DELETE' });
        } catch (e) {}
        const verificationResult = ipAddress && subnetId ? await verifyDeleteIp(ipam, ipAddress, subnetId) : { success: true, message: 'Deleted (no verification)' , details: {} };
        await moveToLog(queueItem, verificationResult);
        break;
      }
      case 'split_range': {
        const { parentSubnetId, newMasks = [] } = queueItem.data || {};
        // Minimal: no-op with success log if not implemented fully
        const result = { success: true, message: 'Split queued (placeholder)', details: { parentSubnetId, newMasks } };
        await moveToLog(queueItem, result);
        break;
      }
      case 'refresh':
      case 'sync': {
        const collections = await syncPhpIpamStructure(ipam);
        await db.replaceIpamCollections(ipam.id, collections);
        const verificationResult = await verifySync(ipam);
        await moveToLog(queueItem, verificationResult);
        break;
      }
      default: {
        await updateQueueStatus(queueItem.id, 'failed', `Unknown type: ${queueItem.type}`);
      }
    }
  } catch (error) {
    try {
      await updateQueueStatus(queueItem.id, 'failed', error.message);
    } catch (_) {}
  }
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

const generateSecret = ({ bytes, encoding } = {}) => {
  const minBytes = 16;
  const maxBytes = 128;
  const normalizedBytes = Math.min(Math.max(Number(bytes) || 32, minBytes), maxBytes);
  const normalizedEncoding = typeof encoding === 'string' ? encoding.toLowerCase() : 'base64url';
  const buffer = crypto.randomBytes(normalizedBytes);

  if (normalizedEncoding === 'hex') {
    return {
      secret: buffer.toString('hex'),
      encoding: 'hex',
      bytes: normalizedBytes,
      entropyBits: normalizedBytes * 8
    };
  }

  if (normalizedEncoding === 'base64') {
    return {
      secret: buffer.toString('base64'),
      encoding: 'base64',
      bytes: normalizedBytes,
      entropyBits: normalizedBytes * 8
    };
  }

  const base64Url = buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');

  return {
    secret: base64Url,
    encoding: 'base64url',
    bytes: normalizedBytes,
    entropyBits: normalizedBytes * 8
  };
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

const deepClone = (value, fallback = null) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'object') {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return fallback;
  }
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
  preferredApiFirst: normalizeBooleanFlag(input.preferredApiFirst, true),
  firmwareVersion: normalizeString(input.firmwareVersion),
  sshEnabled: normalizeBooleanFlag(input.sshEnabled, false),
  sshPort: parseInteger(input.sshPort),
  sshUsername: normalizeString(input.sshUsername),
  sshPassword: typeof input.sshPassword === 'string' ? input.sshPassword.trim() : '',
  sshAcceptNewHostKeys: normalizeBooleanFlag(
    input.sshAcceptNewHostKeys !== undefined ? input.sshAcceptNewHostKeys : input.sshAcceptUnknownHost,
    true
  )
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

const runProcess = (command, args = [], { timeout = 15000 } = {}) =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;

    try {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      const finalize = (result) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timer) {
          clearTimeout(timer);
        }
        resolve(result);
      };

      timer = setTimeout(() => {
        child.kill('SIGKILL');
        finalize({
          success: false,
          code: null,
          signal: 'SIGKILL',
          stdout,
          stderr,
          timedOut: true
        });
      }, Math.max(timeout, 1000));

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        finalize({
          success: false,
          code: null,
          signal: null,
          stdout,
          stderr: stderr ? `${stderr}\n${error.message}` : error.message,
          timedOut: false,
          error
        });
      });

      child.on('close', (code, signal) => {
        finalize({
          success: code === 0,
          code,
          signal,
          stdout,
          stderr,
          timedOut: false
        });
      });
    } catch (error) {
      resolve({
        success: false,
        code: null,
        signal: null,
        stdout,
        stderr: error.message,
        timedOut: false,
        error
      });
    }
  });

const parsePingLatency = (output) => {
  if (!output) {
    return null;
  }

  console.log('Parsing ping output:', output);

  // Linux/macOS pattern: time=1.234ms or time<1ms
  const linuxMatch = output.match(/time[<=]\s*([0-9.]+)ms/i);
  if (linuxMatch && linuxMatch[1]) {
    const parsed = Number.parseFloat(linuxMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Linux/macOS pattern: = 1.234/2.345/3.456/4.567 ms
  const linuxStatsMatch = output.match(/=\s*([^/]+)\/([^/]+)\/([^/]+)\/([^/\s]+)\s*ms/);
  if (linuxStatsMatch && linuxStatsMatch[2]) {
    const parsed = Number.parseFloat(linuxStatsMatch[2]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Windows pattern: Average = 1.234ms
  const winMatch = output.match(/Average =\s*([0-9.]+)ms/i);
  if (winMatch && winMatch[1]) {
    const parsed = Number.parseFloat(winMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Generic pattern: any number followed by ms
  const genericMatch = output.match(/([0-9.]+)\s*ms/i);
  if (genericMatch && genericMatch[1]) {
    const parsed = Number.parseFloat(genericMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  console.log('No latency pattern matched');
  return null;
};

const parseTracerouteOutput = (output) => {
  if (!output) {
    return [];
  }

  const hops = [];
  const lines = output.split(/\r?\n/);
  const hopPattern = /^(\s*)(\d+)\s+([^\s]+)\s+(.*)$/;

  lines.forEach((line) => {
    const match = line.match(hopPattern);
    if (!match) {
      return;
    }

    const hopIndex = Number.parseInt(match[2], 10);
    if (!Number.isInteger(hopIndex)) {
      return;
    }

    const rest = match[4];
    const latencyMatch = rest.match(/([0-9.]+)\s*ms/);
    const latency = latencyMatch ? Number.parseFloat(latencyMatch[1]) : null;

    hops.push({
      hop: hopIndex,
      address: match[3],
      latencyMs: Number.isFinite(latency) ? latency : null
    });
  });

  return hops;
};

const sanitizeDiagnosticTargets = (targets, fallback = []) => {
  if (!Array.isArray(targets)) {
    return fallback;
  }

  const normalized = [];
  const seen = new Set();

  targets.forEach((target) => {
    const address = typeof target === 'string' ? target.trim() : normalizeString(target?.address ?? '');
    if (!address) {
      return;
    }

    const key = address.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(address);
  });

  return normalized;
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
      preferredApiFirst: normalizeBooleanFlag(routeros.preferredApiFirst, true),
      firmwareVersion: typeof routeros.firmwareVersion === 'string' ? routeros.firmwareVersion : '',
      sshEnabled: Boolean(routeros.sshEnabled),
      sshPort: ensureNumber(routeros.sshPort, 22),
      sshUsername: typeof routeros.sshUsername === 'string' ? routeros.sshUsername : '',
      sshPassword: typeof routeros.sshPassword === 'string' ? routeros.sshPassword : '',
      sshAcceptNewHostKeys: normalizeBooleanFlag(routeros.sshAcceptNewHostKeys, true)
    },
    status: {
      updateStatus:
        typeof device.status?.updateStatus === 'string' ? device.status.updateStatus : 'unknown',
      lastAuditAt: device.status?.lastAuditAt ?? null,
      targetVersion: TARGET_ROUTEROS_VERSION
    },
    connectivity: {
      api: {
        status: typeof device.connectivity?.api?.status === 'string' ? device.connectivity.api.status : 'unknown',
        lastCheckedAt: device.connectivity?.api?.lastCheckedAt ?? null,
        lastError: device.connectivity?.api?.lastError ?? null
      },
      ssh: {
        status: typeof device.connectivity?.ssh?.status === 'string' ? device.connectivity.ssh.status : 'unknown',
        lastCheckedAt: device.connectivity?.ssh?.lastCheckedAt ?? null,
        fingerprint: device.connectivity?.ssh?.fingerprint ?? null,
        lastError: device.connectivity?.ssh?.lastError ?? null
      }
    },
    createdAt: device.createdAt,
    updatedAt: device.updatedAt
  };
};

const mapAddressList = (entry, groups, mikrotiks) => {
  const referenceType = entry.referenceType ?? 'mikrotik';
  let referenceName = null;

  if (referenceType === 'mikrotik' && entry.referenceId) {
    const device = mikrotiks.find((candidate) => candidate.id === entry.referenceId);
    referenceName = device ? device.name : null;
  }

  if (referenceType === 'group' && entry.referenceId) {
    const group = groups.find((candidate) => candidate.id === entry.referenceId);
    referenceName = group ? group.name : null;
  }

  return {
    id: entry.id,
    name: entry.name,
    referenceType,
    referenceId: entry.referenceId ?? null,
    referenceName,
    address: entry.address ?? '',
    comment: entry.comment ?? '',
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
};

const mapFirewallFilter = (filter, groups, addressLists) => {
  const group = filter.groupId ? groups.find((entry) => entry.id === filter.groupId) : null;
  const sourceList = filter.sourceAddressListId
    ? addressLists.find((entry) => entry.id === filter.sourceAddressListId)
    : null;
  const destinationList = filter.destinationAddressListId
    ? addressLists.find((entry) => entry.id === filter.destinationAddressListId)
    : null;

  return {
    id: filter.id,
    name: filter.name,
    groupId: filter.groupId ?? null,
    groupName: group ? group.name : null,
    chain: filter.chain,
    sourceAddressListId: filter.sourceAddressListId ?? null,
    sourceAddressListName: sourceList ? sourceList.name : null,
    destinationAddressListId: filter.destinationAddressListId ?? null,
    destinationAddressListName: destinationList ? destinationList.name : null,
    sourcePort: filter.sourcePort ?? '',
    destinationPort: filter.destinationPort ?? '',
    states: Array.isArray(filter.states) ? [...filter.states] : [],
    action: filter.action,
    enabled: Boolean(filter.enabled),
    comment: filter.comment ?? '',
    createdAt: filter.createdAt,
    updatedAt: filter.updatedAt
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
    profile: deepClone(tunnel.profile ?? null, null),
    monitoring: deepClone(tunnel.monitoring ?? null, null),
    ospf: deepClone(tunnel.ospf ?? null, null),
    vpnProfiles: deepClone(tunnel.vpnProfiles ?? null, null),
    createdAt: tunnel.createdAt,
    updatedAt: tunnel.updatedAt
  };
};

const mapRoute = (route, groups, mikrotiks) => {
  const group = route.groupId ? groups.find((entry) => entry.id === route.groupId) : null;
  const device = route.deviceId ? mikrotiks.find((device) => device.id === route.deviceId) : null;

  return {
    id: route.id,
    name: route.name,
    groupId: route.groupId ?? null,
    groupName: group ? group.name : null,
    deviceId: route.deviceId ?? null,
    deviceName: device ? device.name : null,
    destination: route.destination ?? '',
    gateway: route.gateway ?? '',
    interface: route.interface ?? '',
    distance: route.distance ?? 1,
    scope: route.scope ?? 30,
    targetScope: route.targetScope ?? 10,
    status: route.status ?? 'active',
    enabled: Boolean(route.enabled),
    tags: Array.isArray(route.tags) ? [...route.tags] : [],
    notes: typeof route.notes === 'string' ? route.notes : '',
    createdAt: route.createdAt,
    updatedAt: route.updatedAt
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

  const port = Number.parseInt(process.env.PORT ?? '5002', 10) || 5002;
  const version = getProjectVersion();

  const server = http.createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendJson(res, 400, { message: 'Malformed request.' });
      return;
    }

    const method = req.method.toUpperCase();

    // Simple rate limit for mutating methods
    try {
      if (isMutatingMethod(method)) {
        const ip = req.socket?.remoteAddress || 'unknown';
        if (!allowRequest(ip, Date.now())) {
          sendJson(res, 429, { message: 'Too many requests. Please slow down.' });
          return;
        }
      }
    } catch (_) {}

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

    const handleCheckUpdates = async () => {
      try {
        const versionInfo = getVersionInfo();
        const body = await parseJsonBody(req);
        const channel = body?.channel || 'stable';
        
        console.log(`=== Update Check Request ===`);
        console.log(`Channel: ${channel}`);
        console.log(`Stable version: ${versionInfo.stableVersion}`);
        console.log(`Beta version: ${versionInfo.betaVersion}`);
        console.log(`Beta ahead: ${versionInfo.isBetaAhead}`);
        
        let updateInfo = null;
        let updateAvailable = false;
        
        if (channel === 'beta') {
          // For beta channel, show beta version as current
          updateInfo = {
            currentVersion: versionInfo.betaVersion,
            latestVersion: versionInfo.betaVersion,
            channel: 'beta',
            stableVersion: versionInfo.stableVersion,
            betaVersion: versionInfo.betaVersion,
            isBetaAhead: versionInfo.isBetaAhead,
            message: 'You are on the latest beta version!'
          };
        } else {
          // For stable channel, show stable version as current
          updateInfo = {
            currentVersion: versionInfo.stableVersion,
            latestVersion: versionInfo.stableVersion,
            channel: 'stable',
            stableVersion: versionInfo.stableVersion,
            betaVersion: versionInfo.betaVersion,
            isBetaAhead: versionInfo.isBetaAhead,
            message: 'You are on the latest stable version!'
          };
          
          // Check if there's a newer beta available
          if (versionInfo.isBetaAhead) {
            updateAvailable = true;
            updateInfo.latestVersion = versionInfo.betaVersion;
            updateInfo.message = `New beta version available: ${versionInfo.betaVersion}`;
          }
        }
        
        sendJson(res, 200, {
          updateAvailable,
          currentVersion: updateInfo.currentVersion,
          latestVersion: updateInfo.latestVersion,
          channel,
          updateInfo
        });
      } catch (error) {
        console.error('Check updates error:', error);
        sendJson(res, 500, { message: 'Unable to check for updates.' });
      }
    };

    const handlePerformUpdate = async () => {
      try {
        const body = await parseJsonBody(req);
        const channel = body?.channel || 'stable';
        
        console.log(`Performing update for channel: ${channel}`);
        
        // Check if we're running as root or with sudo
        const isRoot = process.getuid && process.getuid() === 0;
        const useSudo = !isRoot;
        
        // Try without sudo first, then with sudo if needed
        let gitCommand = `git pull origin ${channel}`;
        let backendInstallCommand = `npm install`;
        
        // Perform actual git pull
        try {
          // Try without sudo first
          console.log(`Trying git pull without sudo...`);
          execSync(gitCommand, { cwd: process.cwd(), stdio: 'pipe' });
          console.log(`Git pull successful without sudo`);
        } catch (gitError) {
          console.log(`Git pull failed without sudo: ${gitError.message}`);
          
          if (useSudo) {
            try {
              // Try with sudo
              gitCommand = `sudo -n git pull origin ${channel}`;
              console.log(`Trying git pull with sudo...`);
              execSync(gitCommand, { cwd: process.cwd(), stdio: 'pipe' });
              console.log(`Git pull successful with sudo`);
            } catch (sudoError) {
              console.error(`Git pull failed with sudo: ${sudoError.message}`);
              throw new Error(`Update failed: Cannot pull latest changes. Please check git permissions. Error: ${sudoError.message}`);
            }
          } else {
            throw new Error(`Update failed: Cannot pull latest changes. Please check git permissions. Error: ${gitError.message}`);
          }
        }
        
        // Install backend dependencies
        try {
          console.log(`Installing backend dependencies...`);
          execSync(backendInstallCommand, { cwd: process.cwd(), stdio: 'pipe' });
          console.log(`Backend dependencies installed successfully`);
        } catch (installError) {
          console.error(`Backend install failed: ${installError.message}`);
          throw new Error(`Update failed: Cannot install backend dependencies. Error: ${installError.message}`);
        }
        
        // For frontend updates
        const frontendPath = path.join(process.cwd(), 'frontend');
        if (fs.existsSync(frontendPath)) {
          try {
            const frontendInstallCommand = `npm install`;
            const frontendBuildCommand = `npm run build`;
            
            console.log(`Installing frontend dependencies...`);
            execSync(frontendInstallCommand, { cwd: frontendPath, stdio: 'pipe' });
            console.log(`Building frontend...`);
            execSync(frontendBuildCommand, { cwd: frontendPath, stdio: 'pipe' });
            console.log(`Frontend build completed successfully`);
          } catch (frontendError) {
            console.error(`Frontend update failed: ${frontendError.message}`);
            throw new Error(`Update failed: Cannot update frontend. Error: ${frontendError.message}`);
          }
        }
        
        sendJson(res, 200, { 
          message: 'Update completed successfully. System will restart.',
          channel,
          timestamp: new Date().toISOString(),
          usedSudo: useSudo
        });
        
        // Restart the application after successful update
        setTimeout(() => {
          console.log('Restarting application after update...');
          process.exit(0);
        }, 2000);
        
      } catch (error) {
        console.error('Update error:', error);
        sendJson(res, 500, { message: 'Update failed: ' + error.message });
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
      const { name, description, permissions } = body ?? {};

      const normalizedName = normalizeString(name);
      const normalizedDescription = normalizeString(description);

      if (!normalizedName) {
        sendJson(res, 400, { message: 'Role name is required.' });
        return;
      }

      try {
        const result = await db.createRole({
          name: normalizedName,
          description: normalizedDescription,
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
        pageCache.delete('mikrotiks');
        pageCache.delete('firewallInventory');
      } catch (error) {
        console.error('Delete role error', error);
        sendJson(res, 500, { message: 'Unable to delete the role right now.' });
      }
    };

    const handleListGroups = async () => {
      try {
        const key = 'groups';
        const now = Date.now();
        const cached = pageCache.get(key);
        if (cached && now - cached.ts < PAGE_TTL_MS) {
          sendJson(res, 200, cached.data);
          return;
        }

        const groups = await db.listGroups();
        const mapped = groups.map(mapGroup);
        const tree = buildGroupTree(groups);
        const ordered = flattenGroupTree(tree);
        const payload = { groups: mapped, tree, ordered };
        pageCache.set(key, { ts: now, data: payload });
        sendJson(res, 200, payload);
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
        pageCache.delete('groups');
        pageCache.delete('mikrotiks');
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
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
        pageCache.delete('groups');
        pageCache.delete('mikrotiks');
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
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
        pageCache.delete('groups');
        pageCache.delete('mikrotiks');
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Delete group error', error);
        sendJson(res, 500, { message: 'Unable to delete the group right now.' });
      }
    };

    const handleListMikrotiks = async () => {
      try {
        const key = 'mikrotiks';
        const now = Date.now();
        const cached = pageCache.get(key);
        if (cached && now - cached.ts < PAGE_TTL_MS) {
          sendJson(res, 200, cached.data);
          return;
        }

        const [devices, groups] = await Promise.all([db.listMikrotiks(), db.listGroups()]);
        const payload = {
          mikrotiks: devices.map((device) => mapMikrotik(device, groups)),
          groups: groups.map(mapGroup),
          targetRouterOs: TARGET_ROUTEROS_VERSION
        };
        pageCache.set(key, { ts: now, data: payload });
        sendJson(res, 200, payload);
      } catch (error) {
        console.error('List Mikrotiks error', error);
        sendJson(res, 500, { message: 'Unable to load Mikrotik devices.' });
      }
    };

    const handleGetMikrotik = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        const device = await getMikrotikById(deviceId);

        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const groups = await db.listGroups();
        sendJson(res, 200, mapMikrotik(device, groups));
      } catch (error) {
        console.error('Get Mikrotik error', error);
        sendJson(res, 500, { message: 'Unable to load the requested Mikrotik device.' });
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
          mikrotik: mapMikrotik(result.mikrotik, groups),
          targetRouterOs: TARGET_ROUTEROS_VERSION
        });
        pageCache.delete('mikrotiks');
        pageCache.delete('firewallInventory');
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
          mikrotik: mapMikrotik(result.mikrotik, groups),
          targetRouterOs: TARGET_ROUTEROS_VERSION
        });
        pageCache.delete('mikrotiks');
        pageCache.delete('firewallInventory');
      } catch (error) {
        console.error('Update Mikrotik error', error);
        sendJson(res, 500, { message: 'Unable to update the Mikrotik device right now.' });
      }
    };

    const handleTestMikrotikConnectivity = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Testing connectivity for MikroTik device ID: ${deviceId}`);
        const result = await db.testMikrotikConnectivity(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to refresh connectivity.');
        }

        console.log(`Connectivity test result:`, result);
        const groups = await db.listGroups();
        sendJson(res, 200, {
          success: result.success,
          message: result.message || 'Connectivity refreshed successfully.',
          mikrotik: mapMikrotik(result.mikrotik, groups),
          targetRouterOs: TARGET_ROUTEROS_VERSION
        });
      } catch (error) {
        console.error('Test Mikrotik connectivity error', error);
        sendJson(res, 500, { message: 'Unable to verify device connectivity right now.' });
      }
    };

    const handleGetMikrotikInterfaces = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching interfaces for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikInterfaces(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch interfaces.');
        }

        console.log(`Interfaces fetch result:`, result);
        sendJson(res, 200, {
          message: 'Interfaces fetched successfully.',
          interfaces: result.interfaces || []
        });
      } catch (error) {
        console.error('Get Mikrotik interfaces error', error);
        sendJson(res, 500, { message: 'Unable to fetch interfaces right now.' });
      }
    };

    const handleGetMikrotikInterfaceDetails = async (deviceId, interfaceName) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      if (!interfaceName) {
        sendJson(res, 400, { message: 'Interface name is required.' });
        return;
      }

      try {
        console.log(`Fetching interface details for MikroTik device ID: ${deviceId}, interface: ${interfaceName}`);
        const result = await getMikrotikInterfaceDetails(deviceId, interfaceName);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error(result.message || 'Unable to fetch interface details.');
        }

        console.log(`Interface details fetch result:`, JSON.stringify(result, null, 2));
        sendJson(res, 200, {
          message: 'Interface details fetched successfully.',
          details: result.details || {}
        });
      } catch (error) {
        console.error('Get Mikrotik interface details error', error);
        sendJson(res, 500, { message: 'Unable to fetch interface details right now.' });
      }
    };

    const handleGetMikrotikIpAddresses = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching IP addresses for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikIpAddresses(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch IP addresses.');
        }

        console.log(`IP addresses fetch result:`, result);
        sendJson(res, 200, {
          message: 'IP addresses fetched successfully.',
          ipAddresses: result.ipAddresses || []
        });
      } catch (error) {
        console.error('Get Mikrotik IP addresses error', error);
        sendJson(res, 500, { message: 'Unable to fetch IP addresses right now.' });
      }
    };

    const handleGetMikrotikRoutes = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching routes for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikRoutes(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch routes.');
        }

        console.log(`Routes fetch result:`, result);
        sendJson(res, 200, {
          message: 'Routes fetched successfully.',
          routes: result.routes || []
        });
      } catch (error) {
        console.error('Get Mikrotik routes error', error);
        sendJson(res, 500, { message: 'Unable to fetch routes right now.' });
      }
    };

    const handleGetMikrotikLogs = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        // Parse query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const search = url.searchParams.get('search') || '';
          const maxLogs = parseInt(url.searchParams.get('max') || '50', 10);

        console.log(`Fetching logs for MikroTik device ID: ${deviceId}, page: ${page}, limit: ${limit}, search: "${search}"`);
        const result = await db.getMikrotikLogs(deviceId, { page, limit, search, maxLogs });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch logs.');
        }

        console.log(`Logs fetch result: ${result.logs?.length || 0} logs found`);
        sendJson(res, 200, {
          message: 'Logs fetched successfully.',
          logs: result.logs || [],
          pagination: {
            page: result.page || page,
            limit: result.limit || limit,
            total: result.total || 0,
            totalPages: result.totalPages || 0,
            hasMore: result.hasMore || false
          },
          source: result.source || 'unknown'
        });
      } catch (error) {
        console.error('Get Mikrotik logs error', error);
        sendJson(res, 500, { message: 'Unable to fetch logs right now.' });
      }
    };

    const handleGetMikrotikFirewallRules = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching firewall rules for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikFirewallRules(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch firewall rules.');
        }

        sendJson(res, 200, {
          success: true,
          rules: result.rules || []
        });
      } catch (error) {
        console.error('Get Mikrotik firewall rules error', error);
        sendJson(res, 500, { message: 'Unable to fetch firewall rules right now.' });
      }
    };

    const handleUpdateMikrotikFirewallRule = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const { routerosId, disabled, comment } = body;

        if (routerosId === undefined || routerosId === null) {
          sendJson(res, 400, { message: 'RouterOS ID is required.' });
          return;
        }

        console.log(`Updating firewall rule ${routerosId} for MikroTik device ID: ${deviceId}`, body);
        const result = await updateMikrotikFirewallRule(deviceId, {
          routerosId,
          disabled: disabled || false,
          comment: comment || ''
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update firewall rule.');
        }

        sendJson(res, 200, {
          message: 'Firewall rule updated successfully.',
          rule: result.rule
        });
      } catch (error) {
        console.error('Update Mikrotik firewall rule error', error);
        sendJson(res, 500, { message: 'Unable to update firewall rule right now.' });
      }
    };

    const handleAddMikrotikIpAddress = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const { address, network, interface: interfaceName, comment } = body;

        if (!address || !network || !interfaceName) {
          sendJson(res, 400, { message: 'Address, network, and interface are required.' });
          return;
        }

        console.log(`Adding IP address ${address} to MikroTik device ID: ${deviceId}`);
        const result = await addMikrotikIpAddress(deviceId, {
          address,
          network,
          interface: interfaceName,
          comment: comment || ''
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to add IP address.');
        }

        sendJson(res, 201, {
          message: 'IP address added successfully.',
          ipAddress: result.ipAddress
        });
      } catch (error) {
        console.error('Add Mikrotik IP address error', error);
        sendJson(res, 500, { message: 'Unable to add IP address right now.' });
      }
    };

    const handleUpdateMikrotikIpAddress = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const { address, network, interface: interfaceName, comment, disabled } = body;

        if (!address) {
          sendJson(res, 400, { message: 'Address is required.' });
          return;
        }

        console.log(`Updating IP address ${address} for MikroTik device ID: ${deviceId}`, body);
        const result = await updateMikrotikIpAddress(deviceId, {
          address,
          network: network || '',
          interface: interfaceName || '',
          comment: comment || '',
          disabled: disabled || false,
          id: address // Use address as identifier
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update IP address.');
        }

        sendJson(res, 200, {
          message: 'IP address updated successfully.',
          ipAddress: result.ipAddress
        });
      } catch (error) {
        console.error('Update Mikrotik IP address error', error);
        sendJson(res, 500, { message: 'Unable to update IP address right now.' });
      }
    };

    const handleGetMikrotikNatRules = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching NAT rules for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikNatRules(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch NAT rules.');
        }

        sendJson(res, 200, {
          success: true,
          rules: result.rules || []
        });
      } catch (error) {
        console.error('Get Mikrotik NAT rules error', error);
        sendJson(res, 500, { message: 'Unable to fetch NAT rules right now.' });
      }
    };

    const handleGetMikrotikMangleRules = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching mangle rules for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikMangleRules(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch mangle rules.');
        }

        sendJson(res, 200, {
          success: true,
          rules: result.rules || []
        });
      } catch (error) {
        console.error('Get Mikrotik mangle rules error', error);
        sendJson(res, 500, { message: 'Unable to fetch mangle rules right now.' });
      }
    };

    const handleGetMikrotikSystemLogs = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching system logs for MikroTik device ID: ${deviceId}`);
        const result = await db.getMikrotikSystemLogs(deviceId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to fetch system logs.');
        }

        sendJson(res, 200, {
          success: true,
          logs: result.logs || []
        });
      } catch (error) {
        console.error('Get Mikrotik system logs error', error);
        sendJson(res, 500, { message: 'Unable to fetch system logs right now.' });
      }
    };

    const handleToggleMikrotikSafeMode = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const { enabled } = body;

        if (typeof enabled !== 'boolean') {
          sendJson(res, 400, { message: 'Enabled field must be a boolean.' });
          return;
        }

        console.log(`🔧 Toggling safe mode for MikroTik device ID: ${deviceId}, enabled: ${enabled}`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        const devicePassword = device.routeros?.sshPassword;
        const sshUsername = device.routeros?.sshUsername || 'admin';
        
        console.log(`🔧 Device found: ${device.name} (${deviceIP})`);
        
        if (!devicePassword) {
          throw new Error('SSH password not found for device');
        }
        
        // Step 1: Test initial connectivity
        console.log(`🔍 Step 1/4: Testing initial connectivity...`);
        const initialPing = await testPing(deviceIP);
        console.log(`Initial ping result: ${initialPing ? '✅ Online' : '❌ Offline'}`);
        
        // Step 2: Check if device supports Safe Mode (RouterBoard vs x86)
        console.log(`🔍 Step 2/4: Checking device type and Safe Mode support...`);
        let isRouterBoard = false;
        let currentSafeMode = false;
        let deviceType = 'unknown';
        
        try {
          // First check device type
          const deviceTypeCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system resource print"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const deviceResult = await execAsync(deviceTypeCommand, { timeout: 15000 });
          if (deviceResult.stdout.includes('x86') || deviceResult.stdout.includes('VMware')) {
            isRouterBoard = false;
            deviceType = 'x86/VMware';
            console.log(`🔍 Device type: ${deviceType} - Safe Mode not supported`);
            currentSafeMode = false; // x86 devices don't support Safe Mode
          } else {
            isRouterBoard = true;
            deviceType = 'RouterBoard';
            console.log(`🔍 Device type: ${deviceType} - Safe Mode supported`);
            
            // Try to get Safe Mode status for RouterBoard
            try {
              const statusCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system routerboard settings print"`;
              const result = await execAsync(statusCommand, { timeout: 15000 });
              if (result.stdout.includes('try-ethernet-once')) {
                currentSafeMode = true;
              }
              console.log(`Current safe mode status: ${currentSafeMode ? '✅ Enabled' : '❌ Disabled'}`);
            } catch (statusError) {
              console.log(`⚠️ Could not get RouterBoard safe mode status: ${statusError.message}`);
              currentSafeMode = false;
            }
          }
        } catch (deviceError) {
          console.log(`❌ Could not determine device type: ${deviceError.message}`);
          deviceType = 'unknown';
          isRouterBoard = false;
        }
        
        // Step 3: Toggle safe mode (only for RouterBoard devices)
        console.log(`🔧 Step 3/4: ${enabled ? 'Enabling' : 'Disabling'} safe mode...`);
        let toggleSuccess = false;
        
        if (!isRouterBoard) {
          console.log(`⚠️ Safe Mode not supported on ${deviceType} devices`);
          toggleSuccess = false; // x86 devices don't support Safe Mode
        } else {
          try {
            const safeModeCommand = enabled 
              ? `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system routerboard settings set boot-device=try-ethernet-once"`
              : `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system routerboard settings set boot-device=flash"`;
            
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            await execAsync(safeModeCommand, { timeout: 15000 });
            console.log(`✅ Safe mode ${enabled ? 'enabled' : 'disabled'} successfully`);
            toggleSuccess = true;
          } catch (toggleError) {
            console.log(`❌ Could not toggle safe mode: ${toggleError.message}`);
            console.log(`⚠️ Safe mode toggle failed, but continuing with verification...`);
          }
        }
        
        // Step 4: Verify safe mode change (only for RouterBoard devices)
        console.log(`🔍 Step 4/4: Verifying safe mode change...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        let newSafeMode = false;
        let safeModeChanged = false;
        let overallSuccess = false;
        
        if (!isRouterBoard) {
          console.log(`⚠️ Safe Mode verification not applicable for ${deviceType} devices`);
          newSafeMode = false;
          safeModeChanged = false;
          overallSuccess = false;
        } else {
          try {
            const verifyCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system routerboard settings print"`;
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            const result = await execAsync(verifyCommand, { timeout: 15000 });
            if (result.stdout.includes('try-ethernet-once')) {
              newSafeMode = true;
            }
            console.log(`New safe mode status: ${newSafeMode ? '✅ Enabled' : '❌ Disabled'}`);
          } catch (verifyError) {
            console.log(`⚠️ Could not verify safe mode status: ${verifyError.message}`);
            // If verification fails, assume the toggle didn't work
            newSafeMode = currentSafeMode;
          }
          
          safeModeChanged = (newSafeMode === enabled);
          overallSuccess = toggleSuccess && safeModeChanged;
        }
        
        console.log(`Safe mode change ${safeModeChanged ? '✅ successful' : '❌ failed'}`);
        console.log(`Overall success: ${overallSuccess ? '✅ Yes' : '❌ No'}`);

        // Prepare response message based on device type
        let responseMessage;
        if (!isRouterBoard) {
          responseMessage = `Safe Mode is not supported on ${deviceType} devices. This feature is only available on RouterBoard hardware.`;
        } else {
          responseMessage = `Safe mode ${enabled ? 'enabled' : 'disabled'} ${overallSuccess ? 'successfully' : 'with issues'}`;
        }

        sendJson(res, 200, {
          success: true,
          message: responseMessage,
          restartedAt: new Date().toISOString(),
          status: overallSuccess ? 'success' : (isRouterBoard ? 'partial' : 'not_supported'),
          deviceName: device.name,
          deviceIP: deviceIP,
          deviceType: deviceType,
          isRouterBoard: isRouterBoard,
          initialPing: initialPing,
          currentSafeMode: currentSafeMode,
          newSafeMode: newSafeMode,
          safeModeChanged: safeModeChanged,
          toggleSuccessful: overallSuccess,
          toggleCommandSuccess: toggleSuccess,
          verificationSuccess: safeModeChanged,
          safeModeSupported: isRouterBoard
        });
      } catch (error) {
        console.error('Toggle Mikrotik safe mode error', error);
        sendJson(res, 500, { message: `Unable to toggle safe mode: ${error.message}` });
      }
    };

    const handleGetMikrotikSafeModeStatus = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Getting safe mode status for MikroTik device ID: ${deviceId}`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        const devicePassword = device.routeros?.sshPassword;
        const sshUsername = device.routeros?.sshUsername || 'admin';
        
        if (!devicePassword) {
          throw new Error('SSH password not found for device');
        }

        // Check device type first
        let isRouterBoard = false;
        try {
          const deviceTypeCommand = `python3 ssh_client.py ${deviceIP} ${sshUsername} "${devicePassword}" "/system resource print"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const deviceResult = await execAsync(deviceTypeCommand, { timeout: 15000 });
          const deviceData = JSON.parse(deviceResult.stdout);
          if (!deviceData.success) {
            throw new Error(deviceData.error);
          }
          const deviceOutput = deviceData.output;
          if (!deviceOutput.includes('x86') && !deviceOutput.includes('VMware')) {
            isRouterBoard = true;
          }
        } catch (deviceError) {
          console.log(`❌ Could not determine device type: ${deviceError.message}`);
        }

        let safeModeStatus = false;
        let bootDevice = 'flash';
        
        if (isRouterBoard) {
          try {
            const statusCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system routerboard settings print"`;
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            const result = await execAsync(statusCommand, { timeout: 15000 });
            if (result.stdout.includes('try-ethernet-once')) {
              safeModeStatus = true;
              bootDevice = 'try-ethernet-once';
            }
          } catch (statusError) {
            console.log(`⚠️ Could not get RouterBoard safe mode status: ${statusError.message}`);
          }
        }

        sendJson(res, 200, { 
          enabled: safeModeStatus,
          bootDevice: bootDevice,
          isRouterBoard: isRouterBoard,
          message: 'Safe mode status retrieved successfully'
        });
      } catch (error) {
        console.error('Get safe mode status error', error);
        sendJson(res, 500, { message: 'Unable to get safe mode status right now.' });
      }
    };

    const handleGetMikrotikUpdateInfo = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`Fetching update info for MikroTik device ID: ${deviceId}`);
        const result = await getMikrotikUpdateInfo(deviceId);

        if (!result.success) {
          throw new Error(result.message || 'Unable to fetch update info.');
        }

        sendJson(res, 200, {
          success: true,
          ...result
        });
      } catch (error) {
        console.error('Get Mikrotik update info error', error);
        sendJson(res, 500, { message: 'Unable to fetch update info right now.' });
      }
    };

    const handleDownloadMikrotikUpdate = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        // Parse request body
        let body = {};
        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBody = Buffer.concat(chunks).toString();
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch (parseError) {
          console.error('Error parsing request body:', parseError);
          body = {};
        }

        const channel = body.channel || 'stable';

        console.log(`📥 Starting download of ${channel} update for MikroTik device ID: ${deviceId}`);

        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        const devicePassword = device.routeros?.sshPassword || device.password;
        const sshUsername = device.routeros?.sshUsername || 'admin';
        
        console.log(`📥 Device found: ${device.name} (${deviceIP})`);

        // Download update via SSH
        try {
          const downloadCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system package update set channel=${channel}; /system package update download"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const { stdout } = await execAsync(downloadCommand, { timeout: 30000 });
          console.log(`📥 Download output: ${stdout}`);
          console.log(`✅ Download completed successfully`);
        } catch (downloadError) {
          console.log(`⚠️ Download failed: ${downloadError.message}`);
          throw new Error(`Download failed: ${downloadError.message}`);
        }

        sendJson(res, 200, {
          success: true,
          message: `${channel} update download completed successfully.`,
          channel: channel,
          deviceName: device.name,
          deviceIP: deviceIP,
          downloadedAt: new Date().toISOString(),
          status: 'downloaded'
        });
      } catch (error) {
        console.error('Download Mikrotik update error', error);
        sendJson(res, 500, { message: `Unable to download update: ${error.message}` });
      }
    };

    const handleInstallMikrotikUpdate = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        // Parse request body
        let body = {};
        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBody = Buffer.concat(chunks).toString();
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch (parseError) {
          console.error('Error parsing request body:', parseError);
          body = {};
        }

        const channel = body.channel || 'stable';

        console.log(`🚀 Starting download + install + reboot for ${channel} update on MikroTik device ID: ${deviceId}`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        const devicePassword = device.routeros?.sshPassword || device.password;
        const sshUsername = device.routeros?.sshUsername || 'admin';
        
        console.log(`🚀 Device found: ${device.name} (${deviceIP})`);
        
        // Step 1: Download update via SSH
        console.log(`📥 Step 1/3: Downloading ${channel} update...`);
        try {
          const downloadCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system package update set channel=${channel}; /system package update download"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const { stdout } = await execAsync(downloadCommand, { timeout: 30000 });
          console.log(`📥 Download output: ${stdout}`);
          console.log(`✅ Download completed successfully`);
        } catch (downloadError) {
          console.log(`⚠️ Download failed: ${downloadError.message}`);
          throw new Error(`Download failed: ${downloadError.message}`);
        }

        // Step 2: Install update via SSH
        console.log(`🔧 Step 2/3: Installing ${channel} update...`);
        try {
          const installCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system package update install"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const { stdout } = await execAsync(installCommand, { timeout: 30000 });
          console.log(`🔧 Install output: ${stdout}`);
          console.log(`✅ Installation completed successfully`);
        } catch (installError) {
          console.log(`⚠️ Installation failed: ${installError.message}`);
          throw new Error(`Installation failed: ${installError.message}`);
        }

        // Step 3: Reboot device via SSH
        console.log(`🔄 Step 3/3: Rebooting device...`);
        try {
          const rebootCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system reboot"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          // Execute reboot command (this will disconnect SSH)
          execAsync(rebootCommand, { timeout: 10000 }).catch(() => {
            // Expected to fail as device will disconnect
            console.log(`✅ Reboot command sent successfully`);
          });
          
          console.log(`✅ Reboot command executed`);
        } catch (rebootError) {
          console.log(`⚠️ Reboot failed: ${rebootError.message}`);
          // Don't throw error for reboot as it's expected to disconnect
        }

        sendJson(res, 200, {
          success: true,
          message: `${channel} update downloaded, installed, and device rebooted successfully.`,
          channel: channel,
          deviceName: device.name,
          deviceIP: deviceIP,
          downloadedAt: new Date().toISOString(),
          installedAt: new Date().toISOString(),
          rebootedAt: new Date().toISOString(),
          status: 'installed_and_rebooted'
        });
      } catch (error) {
        console.error('Install Mikrotik update error', error);
        sendJson(res, 500, { message: `Unable to install update: ${error.message}` });
      }
    };

    const handleRestartMikrotik = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`🔄 Restarting MikroTik device ID: ${deviceId}`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        console.log(`🔄 Device found: ${device.name} (${device.host || device.ip})`);
        console.log(`🔄 Device object:`, JSON.stringify(device, null, 2));
        
        // Step 1: Save configuration
        console.log(`🔄 Step 1/3: Saving current configuration...`);
        try {
          const saveConfigCommand = `sshpass -p "${device.routeros?.sshPassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${device.routeros?.sshUsername || 'admin'}@${device.host || device.ip} "/system backup save name=before-restart"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          await execAsync(saveConfigCommand, { timeout: 15000 });
          console.log(`✅ Configuration saved successfully`);
        } catch (saveError) {
          console.log(`⚠️ Could not save config via SSH, continuing with restart...`);
        }

        // Step 2: Execute restart command with confirmation
        console.log(`🔄 Step 2/3: Initiating reboot sequence...`);
        try {
          // Get device credentials
          const deviceIP = device.host || device.ip;
          const sshUsername = device.routeros?.sshUsername || 'admin';
          const devicePassword = device.routeros?.sshPassword;
          
          if (!devicePassword) {
            throw new Error('SSH password not found for device');
          }
          
          // Restart command with automatic confirmation
          const restartCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "echo 'y' | /system reboot"`;
          const { exec } = await import('child_process');
          
          console.log(`🔄 Executing restart command with confirmation: ${restartCommand.replace(devicePassword, '***')}`);
          
          // Execute restart command (this will disconnect SSH)
          exec(restartCommand, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
              console.log(`✅ Restart command sent (disconnect expected): ${error.message}`);
            } else {
              console.log(`✅ Restart command executed successfully`);
            }
          });
          
          console.log(`✅ Restart command sent to device`);
        } catch (restartError) {
          console.log(`❌ Restart command failed: ${restartError.message}`);
          throw new Error('Unable to restart device via SSH');
        }

        // Step 3: Wait and verify with ping test
        console.log(`🔄 Step 3/3: Device is rebooting...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        // Test ping to verify restart
        console.log(`🔍 Testing ping to verify restart...`);
        try {
          const { exec } = await import('child_process');
          const pingCommand = `ping -c 3 -W 2000 ${device.host || device.ip}`;
          
          exec(pingCommand, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
              console.log(`❌ Ping failed (device may be restarting): ${error.message}`);
            } else {
              console.log(`✅ Ping successful - device is online`);
            }
          });
        } catch (pingError) {
          console.log(`⚠️ Ping test failed: ${pingError.message}`);
        }
        
        sendJson(res, 200, {
          success: true,
          message: 'Device restart command sent successfully. Device is rebooting...',
          restartedAt: new Date().toISOString(),
          status: 'restarting',
          deviceName: device.name,
          deviceIP: device.host || device.ip
        });
      } catch (error) {
        console.error('Restart Mikrotik error', error);
        sendJson(res, 500, { message: `Unable to restart device: ${error.message}` });
      }
    };

    const handleRestartWithPingVerification = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`🔄 Restarting MikroTik device ID: ${deviceId} with ping verification`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        console.log(`🔄 Device found: ${device.name} (${deviceIP})`);
        
        // Step 1: Test initial ping to confirm device is online
        console.log(`🔍 Step 1/5: Testing initial ping...`);
        const initialPing = await testPing(deviceIP);
        console.log(`Initial ping result: ${initialPing ? '✅ Online' : '❌ Offline'}`);
        
        // Step 2: Save configuration
        console.log(`🔄 Step 2/5: Saving current configuration...`);
        try {
          const saveConfigCommand = `sshpass -p "${device.routeros?.sshPassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${device.routeros?.sshUsername || 'admin'}@${deviceIP} "/system backup save name=before-restart"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          await execAsync(saveConfigCommand, { timeout: 15000 });
          console.log(`✅ Configuration saved successfully`);
        } catch (saveError) {
          console.log(`⚠️ Could not save config via SSH, continuing with restart...`);
        }

        // Step 3: Execute restart command
        console.log(`🔄 Step 3/5: Initiating reboot sequence...`);
        try {
          const sshUsername = device.routeros?.sshUsername || 'admin';
          const devicePassword = device.routeros?.sshPassword;
          
          if (!devicePassword) {
            throw new Error('SSH password not found for device');
          }
          
          const restartCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/system reboot"`;
          const { exec } = await import('child_process');
          
          console.log(`🔄 Executing restart command: ${restartCommand.replace(devicePassword, '***')}`);
          
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          try {
            await execAsync(restartCommand, { timeout: 10000 });
            console.log(`✅ Restart command executed successfully`);
          } catch (error) {
            // SSH disconnect is expected after reboot command
            console.log(`✅ Restart command sent (disconnect expected): ${error.message}`);
          }
          
          console.log(`✅ Restart command sent to device`);
        } catch (restartError) {
          console.log(`❌ Restart command failed: ${restartError.message}`);
          throw new Error('Unable to restart device via SSH');
        }

        // Step 4: Wait for device to go offline
        console.log(`🔄 Step 4/5: Waiting for device to go offline...`);
        let offlineConfirmed = false;
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          const pingResult = await testPing(deviceIP);
          if (!pingResult) {
            console.log(`✅ Device is offline (restart in progress)`);
            offlineConfirmed = true;
            break;
          }
          console.log(`⏳ Device still online, waiting... (${i + 1}/10)`);
        }
        
        if (!offlineConfirmed) {
          console.log(`⚠️ Device did not go offline, restart may have failed`);
        }

        // Step 5: Wait for device to come back online
        console.log(`🔄 Step 5/5: Waiting for device to come back online...`);
        let onlineConfirmed = false;
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          const pingResult = await testPing(deviceIP);
          if (pingResult) {
            console.log(`✅ Device is back online after restart!`);
            onlineConfirmed = true;
            break;
          }
          console.log(`⏳ Device still offline, waiting... (${i + 1}/30)`);
        }
        
        if (!onlineConfirmed) {
          console.log(`❌ Device did not come back online within expected time`);
        }
        
        sendJson(res, 200, {
          success: true,
          message: 'Device restart completed with ping verification',
          restartedAt: new Date().toISOString(),
          status: onlineConfirmed ? 'online' : 'offline',
          deviceName: device.name,
          deviceIP: deviceIP,
          initialPing: initialPing,
          offlineConfirmed: offlineConfirmed,
          onlineConfirmed: onlineConfirmed,
          restartSuccessful: onlineConfirmed
        });
      } catch (error) {
        console.error('Restart with ping verification error', error);
        sendJson(res, 500, { message: `Unable to restart device: ${error.message}` });
      }
    };

    // Helper function to test ping
    const testPing = async (host) => {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        const pingCommand = process.platform === 'win32' 
          ? `ping -n 1 -w 2000 ${host}`
          : `ping -c 1 -W 2 ${host}`;
        
        await execAsync(pingCommand, { timeout: 5000 });
        return true;
      } catch (error) {
        return false;
      }
    };

    const handleDiagnoseMikrotik = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`🔍 Diagnosing MikroTik device ID: ${deviceId}`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        const devicePassword = device.routeros?.sshPassword || device.password;
        const sshUsername = device.routeros?.sshUsername || 'admin';
        
        console.log(`🔍 Device found: ${device.name} (${deviceIP})`);
        
        // Get current firmware version and system info via SSH (parallel execution for speed)
        let currentVersion = 'Unknown';
        let systemInfo = {};
        
        try {
          // Execute both commands in parallel for faster response
          const versionCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${sshUsername}@${deviceIP} "/system resource print"`;
          const systemCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${sshUsername}@${deviceIP} "/system identity print"`;
          
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          // Execute both commands in parallel
          const [versionResult, systemResult] = await Promise.allSettled([
            execAsync(versionCommand, { timeout: 8000 }),
            execAsync(systemCommand, { timeout: 8000 })
          ]);
          
          // Process version result
          if (versionResult.status === 'fulfilled') {
            const stdout = versionResult.value.stdout;
            console.log(`🔍 SSH version output: ${stdout}`);
            
            // Parse version from output
            const versionMatch = stdout.match(/version:\s*(\d+\.\d+\.\d+)/i);
            if (versionMatch) {
              currentVersion = versionMatch[1];
              console.log(`✅ Current version detected: ${currentVersion}`);
            }
          } else {
            console.log(`⚠️ Could not get version via SSH: ${versionResult.reason.message}`);
          }
          
          // Process system info result
          if (systemResult.status === 'fulfilled') {
            const stdout = systemResult.value.stdout;
            console.log(`🔍 SSH system info: ${stdout}`);
            
            // Parse system info
            const nameMatch = stdout.match(/name:\s*(.+)/i);
            if (nameMatch) {
              systemInfo.name = nameMatch[1].trim();
            }
          } else {
            console.log(`⚠️ Could not get system info via SSH: ${systemResult.reason.message}`);
          }
        } catch (error) {
          console.log(`⚠️ SSH diagnostic failed: ${error.message}`);
        }
        
        sendJson(res, 200, {
          success: true,
          message: `Device diagnosis completed successfully. Current version: ${currentVersion}`,
          deviceId: deviceId,
          deviceName: device.name,
          deviceIP: deviceIP,
          currentVersion: currentVersion,
          systemInfo: systemInfo,
          diagnosedAt: new Date().toISOString(),
          status: 'diagnosed'
        });
      } catch (error) {
        console.error('Diagnose Mikrotik error', error);
        sendJson(res, 500, { message: `Unable to diagnose device: ${error.message}` });
      }
    };

    const handleEnableMikrotik = async (deviceId) => {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        sendJson(res, 400, { message: 'A valid Mikrotik id is required.' });
        return;
      }

      try {
        console.log(`🔧 Enabling MikroTik device ID: ${deviceId}`);
        
        // Get device info first
        const device = await db.getMikrotikById(deviceId);
        if (!device) {
          sendJson(res, 404, { message: 'Mikrotik device not found.' });
          return;
        }

        const deviceIP = device.host || device.ip;
        const devicePassword = device.routeros?.sshPassword;
        const sshUsername = device.routeros?.sshUsername || 'admin';
        
        console.log(`🔧 Device found: ${device.name} (${deviceIP})`);
        
        if (!devicePassword) {
          throw new Error('SSH password not found for device');
        }
        
        // Step 1: Test initial connectivity
        console.log(`🔍 Step 1/3: Testing initial connectivity...`);
        const initialPing = await testPing(deviceIP);
        console.log(`Initial ping result: ${initialPing ? '✅ Online' : '❌ Offline'}`);
        
        // Step 2: Enable API service via SSH
        console.log(`🔧 Step 2/3: Enabling API service...`);
        try {
          const enableApiCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshUsername}@${deviceIP} "/ip service enable api"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          await execAsync(enableApiCommand, { timeout: 15000 });
          console.log(`✅ API service enabled successfully`);
        } catch (enableError) {
          console.log(`⚠️ Could not enable API via SSH: ${enableError.message}`);
        }
        
        // Step 3: Verify API is working
        console.log(`🔍 Step 3/3: Verifying API connectivity...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        let apiEnabled = false;
        try {
          const testApiCommand = `sshpass -p "${devicePassword}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${sshUsername}@${deviceIP} "/ip service print where name=api"`;
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const result = await execAsync(testApiCommand, { timeout: 10000 });
          if (result.stdout.includes('enabled')) {
            apiEnabled = true;
            console.log(`✅ API service is now enabled`);
          } else {
            console.log(`⚠️ API service status unclear`);
          }
        } catch (testError) {
          console.log(`⚠️ Could not verify API status: ${testError.message}`);
        }
        
        sendJson(res, 200, {
          success: true,
          message: 'Device enable completed',
          restartedAt: new Date().toISOString(),
          status: apiEnabled ? 'enabled' : 'partially-enabled',
          deviceName: device.name,
          deviceIP: deviceIP,
          initialPing: initialPing,
          apiEnabled: apiEnabled,
          enableSuccessful: apiEnabled
        });
      } catch (error) {
        console.error('Enable Mikrotik error', error);
        sendJson(res, 500, { message: `Unable to enable device: ${error.message}` });
      }
    };

    const handleListFirewallInventory = async () => {
      try {
        const key = 'firewallInventory';
        const now = Date.now();
        const cached = pageCache.get(key);
        if (cached && now - cached.ts < PAGE_TTL_MS) {
          sendJson(res, 200, cached.data);
          return;
        }

        const [addressLists, filters, groups, mikrotiks] = await Promise.all([
          db.listAddressLists(),
          db.listFirewallFilters(),
          db.listGroups(),
          db.listMikrotiks()
        ]);

        const mappedAddressLists = addressLists.map((entry) => mapAddressList(entry, groups, mikrotiks));
        const mappedFilters = filters.map((filter) => mapFirewallFilter(filter, groups, addressLists));

        const payload = {
          addressLists: mappedAddressLists,
          filters: mappedFilters,
          groups: groups.map(mapGroup),
          mikrotiks: mikrotiks.map((device) => mapMikrotik(device, groups)),
          targetRouterOs: TARGET_ROUTEROS_VERSION
        };
        pageCache.set(key, { ts: now, data: payload });
        sendJson(res, 200, payload);
      } catch (error) {
        console.error('List firewall inventory error', error);
        sendJson(res, 500, { message: 'Unable to load firewall inventory.' });
      }
    };

    const handleCreateAddressList = async () => {
      const body = await parseJsonBody(req);
      const { name, referenceType, referenceId, address, comment } = body ?? {};

      try {
        const result = await db.createAddressList({ name, referenceType, referenceId, address, comment });

        if (!result.success && result.reason === 'name-required') {
          sendJson(res, 400, { message: 'List name is required.' });
          return;
        }

        if (!result.success && result.reason === 'type-required') {
          sendJson(res, 400, { message: 'A valid reference type is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-reference') {
          sendJson(res, 400, { message: 'The selected reference is invalid.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create address list.');
        }

        const [groups, mikrotiks] = await Promise.all([db.listGroups(), db.listMikrotiks()]);
        sendJson(res, 201, {
          message: 'Address list entry created successfully.',
          addressList: mapAddressList(result.addressList, groups, mikrotiks)
        });
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Create address list error', error);
        sendJson(res, 500, { message: 'Unable to create the address list entry right now.' });
      }
    };

    const handleUpdateAddressList = async (listId) => {
      if (!Number.isInteger(listId) || listId <= 0) {
        sendJson(res, 400, { message: 'A valid address list id is required.' });
        return;
      }

      const body = await parseJsonBody(req);
      const { name, referenceType, referenceId, address, comment } = body ?? {};

      try {
        const result = await db.updateAddressList(listId, { name, referenceType, referenceId, address, comment });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Address list entry not found.' });
          return;
        }

        if (!result.success && result.reason === 'type-required') {
          sendJson(res, 400, { message: 'A valid reference type is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-reference') {
          sendJson(res, 400, { message: 'The selected reference is invalid.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update address list entry.');
        }

        const [groups, mikrotiks] = await Promise.all([db.listGroups(), db.listMikrotiks()]);
        sendJson(res, 200, {
          message: 'Address list entry updated successfully.',
          addressList: mapAddressList(result.addressList, groups, mikrotiks)
        });
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Update address list error', error);
        sendJson(res, 500, { message: 'Unable to update the address list entry right now.' });
      }
    };

    const handleDeleteAddressList = async (listId) => {
      if (!Number.isInteger(listId) || listId <= 0) {
        sendJson(res, 400, { message: 'A valid address list id is required.' });
        return;
      }

      try {
        const result = await db.deleteAddressList(listId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Address list entry not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete address list entry.');
        }

        sendNoContent(res);
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Delete address list error', error);
        sendJson(res, 500, { message: 'Unable to delete the address list entry right now.' });
      }
    };

    const handleCreateFirewallFilter = async () => {
      const body = await parseJsonBody(req);
      const {
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
      } = body ?? {};

      try {
        const result = await db.createFirewallFilter({
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
        });

        if (!result.success && result.reason === 'invalid-group') {
          sendJson(res, 400, { message: 'The selected group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-chain') {
          sendJson(res, 400, { message: 'A valid firewall chain is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-source-address-list') {
          sendJson(res, 400, { message: 'Select a valid source address list.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-destination-address-list') {
          sendJson(res, 400, { message: 'Select a valid destination address list.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-action') {
          sendJson(res, 400, { message: 'A valid action (accept or drop) is required.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to create firewall filter.');
        }

        const [addressLists, groups] = await Promise.all([db.listAddressLists(), db.listGroups()]);
        sendJson(res, 201, {
          message: 'Firewall filter created successfully.',
          filter: mapFirewallFilter(result.firewallFilter, groups, addressLists)
        });
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Create firewall filter error', error);
        sendJson(res, 500, { message: 'Unable to create the firewall filter right now.' });
      }
    };

    const handleUpdateFirewallFilter = async (filterId) => {
      if (!Number.isInteger(filterId) || filterId <= 0) {
        sendJson(res, 400, { message: 'A valid firewall rule id is required.' });
        return;
      }

      const body = await parseJsonBody(req);
      const {
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
      } = body ?? {};

      try {
        const result = await db.updateFirewallFilter(filterId, {
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
        });

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Firewall rule not found.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-group') {
          sendJson(res, 400, { message: 'The selected group does not exist.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-chain') {
          sendJson(res, 400, { message: 'A valid firewall chain is required.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-source-address-list') {
          sendJson(res, 400, { message: 'Select a valid source address list.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-destination-address-list') {
          sendJson(res, 400, { message: 'Select a valid destination address list.' });
          return;
        }

        if (!result.success && result.reason === 'invalid-action') {
          sendJson(res, 400, { message: 'A valid action (accept or drop) is required.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to update firewall filter.');
        }

        const [addressLists, groups] = await Promise.all([db.listAddressLists(), db.listGroups()]);
        sendJson(res, 200, {
          message: 'Firewall filter updated successfully.',
          filter: mapFirewallFilter(result.firewallFilter, groups, addressLists)
        });
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Update firewall filter error', error);
        sendJson(res, 500, { message: 'Unable to update the firewall filter right now.' });
      }
    };

    const handleDeleteFirewallFilter = async (filterId) => {
      if (!Number.isInteger(filterId) || filterId <= 0) {
        sendJson(res, 400, { message: 'A valid firewall rule id is required.' });
        return;
      }

      try {
        const result = await db.deleteFirewallFilter(filterId);

        if (!result.success && result.reason === 'not-found') {
          sendJson(res, 404, { message: 'Firewall rule not found.' });
          return;
        }

        if (!result.success) {
          throw new Error('Unable to delete firewall filter.');
        }

        sendNoContent(res);
        pageCache.delete('firewallInventory');
        pageCache.delete('firewallConfig');
      } catch (error) {
        console.error('Delete firewall filter error', error);
        sendJson(res, 500, { message: 'Unable to delete the firewall filter right now.' });
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
        await db.discoverTunnelsFromInventory();

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

    const handleListRoutes = async () => {
      try {
        const [routes, groups, mikrotiks] = await Promise.all([
          db.listRoutes(),
          db.listGroups(),
          db.listMikrotiks()
        ]);

        sendJson(res, 200, {
          routes: routes.map((route) => mapRoute(route, groups, mikrotiks)),
          groups: groups.map(mapGroup),
          mikrotiks: mikrotiks.map((device) => mapMikrotik(device, groups))
        });
      } catch (error) {
        console.error('List routes error', error);
        sendJson(res, 500, { message: 'Unable to load routes.' });
      }
    };

    const handleListFirewall = async () => {
      try {
        const key = 'firewallConfig';
        const now = Date.now();
        const cached = pageCache.get(key);
        if (cached && now - cached.ts < PAGE_TTL_MS) {
          sendJson(res, 200, cached.data);
          return;
        }

        const [filters, addressLists, groups] = await Promise.all([
          db.listFirewallFilters(),
          db.listAddressLists(),
          db.listGroups()
        ]);

        const payload = {
          filters: filters.map((filter) => mapFirewallFilter(filter, groups)),
          addressLists: addressLists.map((list) => mapAddressList(list, groups)),
          groups: groups.map(mapGroup)
        };
        pageCache.set(key, { ts: now, data: payload });
        sendJson(res, 200, payload);
      } catch (error) {
        console.error('List firewall error', error);
        sendJson(res, 500, { message: 'Unable to load firewall configuration.' });
      }
    };

    const handleTestMikrotikConnection = async () => {
      const body = await parseJsonBody(req);
      const { host, port, username, password, protocol } = body;

      if (!host) {
        sendJson(res, 400, { message: 'Host is required.' });
        return;
      }

      const diagnostics = {
        host,
        timestamp: new Date().toISOString(),
        tests: []
      };

      try {
        // Test 1: Basic connectivity (ping simulation)
        diagnostics.tests.push({
          name: 'Basic Connectivity',
          status: 'running',
          details: `Testing basic connectivity to ${host}`
        });

        // Test 2: Port availability
        const testPorts = [443, 80, 22, 8728, 8729, port].filter(p => p).filter((v, i, a) => a.indexOf(v) === i);
        
        for (const testPort of testPorts) {
          diagnostics.tests.push({
            name: `Port ${testPort} Test`,
            status: 'running',
            details: `Testing if port ${testPort} is open`
          });
        }

        // Test SSH connectivity
        if (username && password) {
          diagnostics.tests.push({
            name: 'SSH Connection Test',
            status: 'running',
            details: `Testing SSH connection to ${host}:22`
          });
        }

        // Test 3: HTTP/HTTPS endpoints - prioritize working ports
        const endpoints = [
          { protocol: 'http', port: 80, path: '/rest/system/resource' }, // Prioritize HTTP port 80
          { protocol: 'https', port: 443, path: '/rest/system/resource' },
          { protocol: 'http', port: port || 80, path: '/rest/system/resource' },
          { protocol: 'https', port: port || 443, path: '/rest/system/resource' }
        ];

        let successfulConnection = null;

        for (const endpoint of endpoints) {
          const testName = `${endpoint.protocol.toUpperCase()} ${endpoint.port} API Test`;
          const apiUrl = `${endpoint.protocol}://${host}:${endpoint.port}${endpoint.path}`;
          
          try {
            console.log(`🔍 Testing: ${apiUrl}`);
            
            const auth = Buffer.from(`${username || 'admin'}:${password || ''}`).toString('base64');
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mik-Management/1.0'
              },
              rejectUnauthorized: false,
              timeout: 15000
            });

            if (response.ok) {
              const data = await response.json();
              console.log(`🔍 API Response for ${apiUrl}:`, JSON.stringify(data, null, 2));
              
              successfulConnection = {
                url: apiUrl,
                protocol: endpoint.protocol,
                port: endpoint.port,
                data: data[0] || data,
                firmwareVersion: data[0]?.version || data?.version || 'Unknown',
                responseHeaders: Object.fromEntries(response.headers.entries())
              };

              diagnostics.tests.push({
                name: testName,
                status: 'success',
                details: `✅ Connection successful! Firmware: ${data[0]?.version || data?.version || 'Unknown'}`,
                data: {
                  url: apiUrl,
                  firmwareVersion: data[0]?.version || data?.version,
                  architecture: data[0]?.['architecture-name'] || data?.['architecture-name'],
                  boardName: data[0]?.['board-name'] || data?.['board-name'],
                  uptime: data[0]?.uptime || data?.uptime,
                  fullResponse: data
                }
              });

              console.log(`✅ Success: ${apiUrl} - Firmware: ${data[0]?.version || data?.version}`);
              break; // Stop on first successful connection
            } else {
              diagnostics.tests.push({
                name: testName,
                status: 'failed',
                details: `❌ HTTP ${response.status}: ${response.statusText}`,
                data: {
                  url: apiUrl,
                  status: response.status,
                  statusText: response.statusText,
                  headers: Object.fromEntries(response.headers.entries())
                }
              });

              console.log(`❌ Failed: ${apiUrl} - ${response.status}: ${response.statusText}`);
            }
          } catch (error) {
            diagnostics.tests.push({
              name: testName,
              status: 'error',
              details: `❌ Connection error: ${error.message}`,
              data: {
                url: apiUrl,
                error: error.message,
                code: error.code
              }
            });

            console.log(`❌ Error: ${apiUrl} - ${error.message}`);
          }
        }

        // Test 4: Alternative endpoints
        const alternativeEndpoints = [
          { protocol: 'https', port: 443, path: '/rest/system/identity' },
          { protocol: 'http', port: 80, path: '/rest/system/identity' },
          { protocol: 'https', port: 443, path: '/rest/interface' },
          { protocol: 'http', port: 80, path: '/rest/interface' }
        ];

        if (!successfulConnection) {
          for (const endpoint of alternativeEndpoints) {
            const testName = `${endpoint.protocol.toUpperCase()} ${endpoint.port} ${endpoint.path} Test`;
            const apiUrl = `${endpoint.protocol}://${host}:${endpoint.port}${endpoint.path}`;
            
            try {
              const auth = Buffer.from(`${username || 'admin'}:${password || ''}`).toString('base64');
              
              const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'application/json'
                },
                rejectUnauthorized: false,
                timeout: 10000
              });

              if (response.ok) {
                diagnostics.tests.push({
                  name: testName,
                  status: 'success',
                  details: `✅ Alternative endpoint accessible`,
                  data: { url: apiUrl }
                });
                break;
              }
            } catch (error) {
              // Skip alternative endpoint errors
            }
          }
        }

        // Test SSH connectivity
        if (username && password) {
          try {
            const { createConnection } = await import('net');
            const sshPort = 22;
            
            const sshTest = new Promise((resolve) => {
              const socket = createConnection({ port: sshPort, host });
              const timeout = 5000;
              
              socket.setTimeout(timeout);
              
              socket.on('connect', () => {
                socket.destroy();
                resolve({ success: true, message: 'SSH port is open and accessible' });
              });
              
              socket.on('timeout', () => {
                socket.destroy();
                resolve({ success: false, message: 'SSH connection timeout' });
              });
              
              socket.on('error', (err) => {
                resolve({ success: false, message: `SSH connection failed: ${err.message}` });
              });
              
              // Connection is already established by createConnection
            });
            
            const sshResult = await sshTest;
            
            // Update SSH test result
            const sshTestIndex = diagnostics.tests.findIndex(t => t.name === 'SSH Connection Test');
            if (sshTestIndex !== -1) {
              diagnostics.tests[sshTestIndex] = {
                name: 'SSH Connection Test',
                status: sshResult.success ? 'success' : 'failed',
                details: sshResult.success ? 
                  `✅ SSH connection successful to ${host}:${sshPort}` : 
                  `❌ SSH connection failed: ${sshResult.message}`,
                data: {
                  host,
                  port: sshPort,
                  success: sshResult.success,
                  message: sshResult.message
                }
              };
            }
            
          } catch (error) {
            const sshTestIndex = diagnostics.tests.findIndex(t => t.name === 'SSH Connection Test');
            if (sshTestIndex !== -1) {
              diagnostics.tests[sshTestIndex] = {
                name: 'SSH Connection Test',
                status: 'error',
                details: `❌ SSH test error: ${error.message}`,
                data: {
                  host,
                  port: 22,
                  error: error.message
                }
              };
            }
          }
        }

        // Summary
        const successCount = diagnostics.tests.filter(t => t.status === 'success').length;
        const totalTests = diagnostics.tests.length;

        sendJson(res, 200, {
          success: successCount > 0,
          message: successCount > 0 ? 
            `Connection successful! (${successCount}/${totalTests} tests passed)` : 
            `All connection attempts failed (0/${totalTests} tests passed)`,
          diagnostics,
          successfulConnection,
          recommendations: generateRecommendations(diagnostics)
        });

      } catch (error) {
        console.error('Diagnostic test error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Diagnostic test failed: ${error.message}`,
          diagnostics,
          error: error.message
        });
      }
    };

    const generateRecommendations = (diagnostics) => {
      const recommendations = [];
      
      const hasSuccessfulTests = diagnostics.tests.some(t => t.status === 'success');
      const hasFailedTests = diagnostics.tests.some(t => t.status === 'failed');
      const hasErrorTests = diagnostics.tests.some(t => t.status === 'error');

      if (!hasSuccessfulTests) {
        recommendations.push({
          type: 'error',
          title: 'No successful connections found',
          suggestions: [
            'Check if MikroTik device is powered on and accessible',
            'Verify the IP address is correct',
            'Ensure MikroTik REST API is enabled in RouterOS',
            'Check firewall rules on MikroTik device',
            'Verify network connectivity from this server to the device'
          ]
        });
      }

      if (hasErrorTests) {
        recommendations.push({
          type: 'warning',
          title: 'Connection errors detected',
          suggestions: [
            'Check network connectivity (ping the device)',
            'Verify the device is not behind a firewall',
            'Try different ports (443, 80, 8728, 8729)',
            'Check if the device supports REST API (RouterOS v7.1+)'
          ]
        });
      }

      if (hasFailedTests) {
        recommendations.push({
          type: 'info',
          title: 'Authentication or permission issues',
          suggestions: [
            'Verify username and password are correct',
            'Check if the user has API access permissions',
            'Try with admin user (default: admin with no password)',
            'Check RouterOS user permissions for API access'
          ]
        });
      }

      return recommendations;
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
        metrics,
        profile,
        monitoring,
        ospf,
        vpnProfiles
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
          metrics,
          profile,
          monitoring,
          ospf,
          vpnProfiles
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

    const handleGenerateSecret = async () => {
      try {
        const body = await parseJsonBody(req);
        const requestedBytes = parseInteger(body?.bytes ?? body?.length);
        const encoding = typeof body?.encoding === 'string' ? body.encoding : undefined;
        const result = generateSecret({ bytes: requestedBytes ?? undefined, encoding });

        sendJson(res, 200, {
          ...result,
          generatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Secret generation error', error);
        sendJson(res, 500, { message: 'Unable to generate a secret right now.' });
      }
    };

    const handlePingDiagnostics = async () => {
      const body = await parseJsonBody(req);
      const targets = sanitizeDiagnosticTargets(body?.targets ?? body?.addresses ?? []);
      if (targets.length === 0) {
        sendJson(res, 400, { message: 'At least one target address is required.' });
        return;
      }

      const tunnelId = parseInteger(body?.tunnelId);
      const count = parseInteger(body?.count) ?? 4;
      const timeout = parseInteger(body?.timeout);
      const command = process.platform === 'win32' ? 'ping' : 'ping';
      const results = [];

      try {
        for (const address of targets) {
          const args = process.platform === 'win32'
            ? ['-n', String(count), address]
            : ['-c', String(count), '-W', '2', address];
          const outcome = await runProcess(command, args, {
            timeout: timeout ? Math.max(timeout, 1000) : 15000
          });
          const output = (outcome.stdout || outcome.stderr || '').trim();
          const latencyMs = parsePingLatency(output);

          results.push({
            address,
            success: Boolean(outcome.success),
            command: `${command} ${args.join(' ')}`.trim(),
            exitCode: outcome.code,
            timedOut: Boolean(outcome.timedOut),
            latencyMs: latencyMs ?? null,
            output
          });
        }

        if (Number.isInteger(tunnelId) && tunnelId > 0) {
          const payload = {
            monitoring: {
              lastPingResults: results.map((entry) => ({
                address: entry.address,
                success: entry.success,
                latencyMs: entry.latencyMs,
                output: entry.output,
                checkedAt: new Date().toISOString()
              })),
              lastUpdatedAt: new Date().toISOString()
            }
          };

          try {
            await db.updateTunnel(tunnelId, payload);
          } catch (error) {
            console.warn('Failed to persist ping diagnostics', error);
          }
        }

        sendJson(res, 200, { results });
      } catch (error) {
        console.error('Ping diagnostics error', error);
        sendJson(res, 500, { message: 'Unable to execute ping diagnostics right now.' });
      }
    };

    const handleSimplePing = async () => {
      const body = await parseJsonBody(req);
      const host = body?.host;
      
      if (!host) {
        sendJson(res, 400, { message: 'Host address is required.' });
        return;
      }

      try {
        // Detect if host is IPv6
        const isIPv6 = host.includes(':');
        
        let command, args;
        
        if (process.platform === 'win32') {
          command = 'ping';
          args = isIPv6 ? ['-6', '-n', '1', host] : ['-4', '-n', '1', host];
        } else {
          // macOS and Linux
          if (isIPv6) {
            // For macOS, IPv6 ping is not well supported, return error
            if (process.platform === 'darwin') {
              throw new Error('IPv6 ping is not supported on macOS. Please use IPv4 addresses.');
            }
            // Try ping6 command first, fallback to ping -6
            command = 'ping6';
            args = ['-c', '1', '-W', '2', host];
          } else {
            command = 'ping';
            args = ['-c', '1', '-W', '2', host];
          }
        }
        
        console.log(`Ping command: ${command} ${args.join(' ')}`);
        
        let outcome = await runProcess(command, args, {
          timeout: 10000
        });
        
        // If ping6 fails and it's IPv6, try fallback to ping -6
        if (!outcome.success && isIPv6 && command === 'ping6') {
          console.log('ping6 failed, trying ping -6 fallback');
          command = 'ping';
          args = ['-6', '-c', '1', '-W', '2', host];
          outcome = await runProcess(command, args, {
            timeout: 10000
          });
        }
        
        const output = (outcome.stdout || outcome.stderr || '').trim();
        console.log('Ping output:', output);
        
        const latencyMs = parsePingLatency(output);
        
        const result = {
          success: Boolean(outcome.success),
          time: latencyMs ? `${latencyMs}ms` : 'N/A',
          latencyMs: latencyMs ?? null,
          output: output,
          command: `${command} ${args.join(' ')}`,
          isIPv6: isIPv6
        };

        sendJson(res, 200, result);
      } catch (error) {
        console.error('Simple ping error', error);
        sendJson(res, 200, { 
          success: false, 
          time: 'N/A', 
          error: error.message || 'Ping failed',
          command: command ? `${command} ${args.join(' ')}` : 'unknown',
          isIPv6: isIPv6
        });
      }
    };

    const handleTracerouteDiagnostics = async () => {
      const body = await parseJsonBody(req);
      const targets = sanitizeDiagnosticTargets(body?.targets ?? body?.addresses ?? []);
      if (targets.length === 0) {
        sendJson(res, 400, { message: 'At least one target address is required.' });
        return;
      }

      const tunnelId = parseInteger(body?.tunnelId);
      const maxHops = parseInteger(body?.maxHops) ?? 30;
      const timeout = parseInteger(body?.timeout);
      const traceTimeout = timeout ? Math.max(timeout, 1000) : 30000;

      const preferTraceroute = process.platform === 'win32' ? 'tracert' : 'traceroute';
      const fallbackTraceroute = process.platform === 'win32' ? 'tracert' : 'tracepath';

      const results = [];

      try {
        for (const address of targets) {
          const baseArgs = process.platform === 'win32'
            ? ['-d', address]
            : ['-n', '-m', String(maxHops), address];

          let command = preferTraceroute;
          let args = [...baseArgs];
          let outcome = await runProcess(command, args, { timeout: traceTimeout });

          if (!outcome.success && outcome.error && outcome.error.code === 'ENOENT' && fallbackTraceroute !== command) {
            command = fallbackTraceroute;
            args = process.platform === 'win32' ? ['-d', address] : ['-n', address];
            outcome = await runProcess(command, args, { timeout: traceTimeout });
          }

          const output = (outcome.stdout || outcome.stderr || '').trim();
          const hops = parseTracerouteOutput(output);

          results.push({
            address,
            success: Boolean(outcome.success),
            command: `${command} ${args.join(' ')}`.trim(),
            exitCode: outcome.code,
            timedOut: Boolean(outcome.timedOut),
            output,
            hops
          });
        }

        if (Number.isInteger(tunnelId) && tunnelId > 0) {
          const payload = {
            monitoring: {
              lastTraceResults: results.map((entry) => ({
                address: entry.address,
                success: entry.success,
                hops: entry.hops,
                output: entry.output,
                checkedAt: new Date().toISOString()
              })),
              lastUpdatedAt: new Date().toISOString()
            }
          };

          try {
            await db.updateTunnel(tunnelId, payload);
          } catch (error) {
            console.warn('Failed to persist traceroute diagnostics', error);
          }
        }

        sendJson(res, 200, { results });
      } catch (error) {
        console.error('Traceroute diagnostics error', error);
        sendJson(res, 500, { message: 'Unable to execute traceroute diagnostics right now.' });
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

    const handleGetIpam = async (ipamId) => {
      try {
        const ipam = await db.getIpamById(ipamId);
        
        if (!ipam) {
          sendJson(res, 404, { message: 'IPAM integration not found.' });
          return;
        }

        // Return the full ipam object with collections data
        const response = {
          id: ipam.id,
          name: ipam.name,
          baseUrl: ipam.baseUrl,
          appId: ipam.appId,
          appPermissions: ipam.appPermissions,
          appSecurity: ipam.appSecurity,
          status: ipam.status || 'unknown',
          checkedAt: ipam.checkedAt,
          lastSyncAt: ipam.lastSyncAt,
          createdAt: ipam.createdAt,
          updatedAt: ipam.updatedAt,
          collections: ipam.collections || { sections: [], datacenters: [], ranges: [] }
        };

        sendJson(res, 200, response);
      } catch (error) {
        console.error('Get IPAM error', error);
        sendJson(res, 500, { message: 'Unable to retrieve the phpIPAM integration.' });
      }
    };

    const handleUpdateIpam = async (ipamId) => {
      const body = await parseJsonBody(req);
      const { name, baseUrl, appId, appCode, appPermissions, appSecurity } = body ?? {};

      try {
        const result = await db.updateIpam(ipamId, { name, baseUrl, appId, appCode, appPermissions, appSecurity });

        if (!result.success) {
          if (result.reason === 'not-found') {
            sendJson(res, 404, { message: 'IPAM integration not found.' });
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

          throw new Error('Unable to update IPAM integration');
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

        sendJson(res, 200, { ipam, test: testResult });
      } catch (error) {
        console.error('Update IPAM error', error);
        sendJson(res, 500, { message: 'Unable to update the phpIPAM integration.' });
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

        // Return immediately and sync in background
        sendJson(res, 202, { 
          message: 'Sync started in background',
          status: 'syncing'
        });

        // Sync in background without blocking
        (async () => {
          // Add to queue
          const queueItem = await addToQueue({
            type: 'sync',
            ipamId: ipamId,
            data: {
              timestamp: new Date().toISOString()
            }
          });
          
          try {
            await updateQueueStatus(queueItem.id, 'processing');
            
            console.log(`🔄 Background sync started for IPAM ${ipamId}`);
            const collections = await syncPhpIpamStructure(ipam);
            await db.replaceIpamCollections(ipamId, collections);
            const timestamp = new Date().toISOString();
            await db.updateIpamStatus(ipamId, { status: 'connected', checkedAt: timestamp, syncedAt: timestamp });
            console.log(`✅ Background sync completed for IPAM ${ipamId}:`, {
              sections: collections.sections.length,
              datacenters: collections.datacenters.length,
              ranges: collections.ranges.length
            });
            
            // Verify sync
            const verificationResult = await verifySync(ipam);
            verificationResult.details.collections = {
              sections: collections.sections.length,
              datacenters: collections.datacenters.length,
              ranges: collections.ranges.length
            };
            
            await moveToLog(queueItem, verificationResult);
            console.log('✅ Sync operation logged with verification:', verificationResult.success ? 'SUCCESS' : 'FAILED');
            
          } catch (error) {
            console.error('Background sync error for IPAM', ipamId, error);
            
            await updateQueueStatus(queueItem.id, 'failed', error.message);
            
            if (Number.isInteger(ipamId) && ipamId > 0) {
              try {
                await db.updateIpamStatus(ipamId, { status: 'failed', checkedAt: new Date().toISOString() });
              } catch (updateError) {
                console.error('Failed to record IPAM failure status', updateError);
              }
            }
          }
        })();

      } catch (error) {
        console.error('Sync IPAM error', error);
        sendJson(res, 500, { message: 'Unable to start sync. Please try again.' });
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

      if (method === 'PUT' && (canonicalPath === '/api/ipams' || resourcePath === '/ipams')) {
        await handleCreateIpam();
        return;
      }

      if (resourceSegments[0] === 'ipams' && resourceSegments.length >= 2) {
        const idSegment = resourceSegments[1];
        const ipamId = Number.parseInt(idSegment, 10);

        if (resourceSegments.length === 2) {
          if (method === 'GET') {
            await handleGetIpam(ipamId);
            return;
          }
          if (method === 'DELETE') {
            await handleDeleteIpam(ipamId);
            return;
          }
          if (method === 'PUT') {
            await handleUpdateIpam(ipamId);
            return;
          }
        }

        if (resourceSegments.length === 3 && method === 'GET' && resourceSegments[2] === 'live') {
          // Get data directly from PHP-IPAM without cache
          try {
            const ipam = await db.getIpamById(ipamId);
            if (!ipam) {
              sendJson(res, 404, { message: 'IPAM integration not found.' });
              return;
            }

            console.log('🔴 LIVE MODE: Fetching directly from PHP-IPAM without cache');
            
            // Fetch fresh data from PHP-IPAM
            const collections = await syncPhpIpamStructure(ipam);
            
            // Log a non-blocking refresh in the background
            try {
              const queueItem = await addToQueue({ type: 'refresh', ipamId, data: { scope: 'live', at: new Date().toISOString() } });
              (async () => { await processQueuedOperation(queueItem); })();
            } catch (_) {}

            // Return directly without saving to database
            sendJson(res, 200, {
              id: ipam.id,
              name: ipam.name,
              description: ipam.description,
              type: ipam.type,
              baseUrl: ipam.baseUrl,
              appId: ipam.appId,
              status: ipam.status,
              lastCheckedAt: new Date().toISOString(),
              collections: collections
            });
          } catch (error) {
            console.error('Live fetch error:', error);
            sendJson(res, 500, { message: 'Unable to fetch live data from PHP-IPAM' });
          }
          return;
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

        // Queue endpoints
        if (resourceSegments.length === 3 && method === 'GET' && resourceSegments[2] === 'queue') {
          try {
            const queue = await getQueue();
            const ipamQueue = queue.filter(q => q.ipamId === ipamId);
            sendJson(res, 200, ipamQueue);
          } catch (error) {
            console.error('Get queue error:', error);
            sendJson(res, 500, { message: 'Unable to get queue' });
          }
          return;
        }

        // Logs endpoints
        if (resourceSegments.length === 3 && method === 'GET' && resourceSegments[2] === 'logs') {
          try {
            const logs = await getLogs();
            const ipamLogs = logs.filter(l => l.ipamId === ipamId);
            sendJson(res, 200, ipamLogs);
          } catch (error) {
            console.error('Get logs error:', error);
            sendJson(res, 500, { message: 'Unable to get logs' });
          }
          return;
        }

        // Retry queue item
        if (resourceSegments.length === 5 && method === 'POST' && resourceSegments[2] === 'queue' && resourceSegments[4] === 'retry') {
          try {
            const queueId = parseInt(resourceSegments[3], 10);
            const item = await retryQueueItem(queueId);
            
            if (item) {
              sendJson(res, 200, { message: 'Queue item set for retry', item });
            } else {
              sendJson(res, 404, { message: 'Queue item not found' });
            }
          } catch (error) {
            console.error('Retry queue item error:', error);
            sendJson(res, 500, { message: 'Unable to retry queue item' });
          }
          return;
        }

        // Delete queue item
        if (resourceSegments.length === 4 && method === 'DELETE' && resourceSegments[2] === 'queue') {
          try {
            const queueId = parseInt(resourceSegments[3], 10);
            await deleteQueueItem(queueId);
            sendJson(res, 200, { message: 'Queue item deleted' });
          } catch (error) {
            console.error('Delete queue item error:', error);
            sendJson(res, 500, { message: 'Unable to delete queue item' });
          }
          return;
        }

        // Delete log entry
        if (resourceSegments.length === 4 && method === 'DELETE' && resourceSegments[2] === 'logs') {
          try {
            const logId = parseInt(resourceSegments[3], 10);
            await deleteLogEntry(logId);
            sendJson(res, 200, { message: 'Log entry deleted' });
          } catch (error) {
            console.error('Delete log entry error:', error);
            sendJson(res, 500, { message: 'Unable to delete log entry' });
          }
          return;
        }

        if (resourceSegments.length === 3 && method === 'PUT' && resourceSegments[2] === 'collections') {
          try {
            const ipam = await db.getIpamById(ipamId);
            if (!ipam) {
              sendJson(res, 404, { message: 'IPAM integration not found.' });
              return;
            }

            const body = await parseJsonBody(req);
            const collections = body.collections || body;

            await db.replaceIpamCollections(ipamId, collections);
            const timestamp = new Date().toISOString();
            await db.updateIpamStatus(ipamId, { status: 'connected', checkedAt: timestamp, syncedAt: timestamp });

            sendJson(res, 200, {
              message: 'Collections updated successfully',
              sections: collections.sections?.length || 0,
              datacenters: collections.datacenters?.length || 0,
              ranges: collections.ranges?.length || 0
            });
          } catch (error) {
            console.error('Update collections error', error);
            sendJson(res, 500, { message: 'Unable to update collections.' });
          }
          return;
        }

        if (resourceSegments.length === 3 && method === 'POST' && resourceSegments[2] === 'ranges') {
          try {
            const ipam = await db.getIpamById(ipamId);
            if (!ipam) {
              sendJson(res, 404, { message: 'IPAM integration not found.' });
              return;
            }

            const body = await parseJsonBody(req);
            console.log('Add IP - Request body:', JSON.stringify(body, null, 2));
            
            const cidr = body.metadata?.cidr || '';
            const hostname = body.name || body.description || '';
            let subnetId = body.metadata?.subnetId ? parseInt(body.metadata.subnetId, 10) : null;
            const parentRangeCidr = body.metadata?.parentRangeCidr;
            
            // Parse CIDR to get IP address
            let ipAddress = cidr.split('/')[0];
            
            if (!ipAddress) {
              sendJson(res, 400, { message: 'Invalid CIDR format' });
              return;
            }
            
            // Expand IPv6 shorthand notation and pad with zeros (e.g., 2001:41d0:a:1918::0 becomes 2001:41d0:a:1918:0000:0000:0000:0000)
            if (ipAddress.includes('::')) {
              const parts = ipAddress.split('::');
              const left = parts[0].split(':').filter(p => p);
              const right = parts[1] ? parts[1].split(':').filter(p => p) : [];
              const totalParts = 8;
              const missingParts = totalParts - left.length - right.length;
              
              const expanded = [...left, ...Array(missingParts).fill('0'), ...right]
                .map(part => part.padStart(4, '0'))
                .join(':');
              ipAddress = expanded;
            } else {
              // Pad existing parts if not using shorthand
              ipAddress = ipAddress.split(':').map(part => part.padStart(4, '0')).join(':');
            }
            
            // Check if it's a single IP (/32 for IPv4 or /128 for IPv6)
            const mask = cidr.split('/')[1];
            const isSingleIP = mask === '32' || mask === '128';
            
            if (isSingleIP) {
              // Enqueue add_ip and process in background; do NOT perform inline
              const queueItem = await addToQueue({
                type: 'add_ip',
                ipamId: ipamId,
                data: {
                  ipAddress,
                  cidr,
                  mask,
                  subnetId,
                  parentRangeCidr,
                  sectionId: body.sectionId,
                  hostname,
                  description: body.description
                }
              });
              // Background processing
              (async () => {
                await processQueuedOperation(queueItem);
              })();

              sendJson(res, 202, {
                message: 'Add IP queued for processing',
                status: 'queued',
                queueId: queueItem.id
              });
            } else {
              // Enqueue add_range for subnet creation (background)
              const queueItem = await addToQueue({
                type: 'add_range',
                ipamId: ipamId,
                data: {
                  cidr,
                  description: body.description || body.name || '',
                  sectionId: body.sectionId,
                  parentSubnetId: body.metadata?.subnetId ? parseInt(body.metadata.subnetId, 10) : null,
                  parentRangeCidr
                }
              });
              (async () => { await processQueuedOperation(queueItem); })();
              sendJson(res, 202, { message: 'Add range queued for processing', status: 'queued', queueId: queueItem.id });
            }
          } catch (error) {
            console.error('Add IP/Range error:', error);
            sendJson(res, 500, { message: `Unable to add IP/Range: ${error.message}` });
          }
          return;
        }

        if (resourceSegments.length === 4 && method === 'DELETE' && resourceSegments[2] === 'ranges') {
          try {
            const ipam = await db.getIpamById(ipamId);
            if (!ipam) {
              sendJson(res, 404, { message: 'IPAM integration not found.' });
              return;
            }

            const rangeId = resourceSegments[3];
            console.log('Delete range - Range ID:', rangeId);
            
            // Check if this is a PHP-IPAM subnet (numeric ID)
            const numericRangeId = parseInt(rangeId);
            let deletedIpAddress = null;
            let deletedSubnetId = null;
            
            if (!isNaN(numericRangeId)) {
              // Get subnet info before deleting for verification
              try {
                const subnetInfo = await phpIpamFetch(ipam, `subnets/${numericRangeId}/`, { allowNotFound: true });
                if (subnetInfo && subnetInfo.subnet) {
                  deletedIpAddress = subnetInfo.subnet;
                  deletedSubnetId = subnetInfo.masterSubnetId || numericRangeId;
                }
              } catch (e) {
                console.log('Could not fetch subnet info:', e.message);
              }
              
              // Delete from PHP-IPAM
              console.log(`Deleting subnet ${numericRangeId} from PHP-IPAM`);
              
              // Add to queue
              const queueItem = await addToQueue({
                type: 'delete_ip',
                ipamId: ipamId,
                data: {
                  rangeId: numericRangeId,
                  ipAddress: deletedIpAddress,
                  subnetId: deletedSubnetId
                }
              });
              
              // Process in background via queue processor
              (async () => { await processQueuedOperation(queueItem); })();
            }
            
            // Respond as queued (deletion processed in background)
            sendJson(res, 202, { message: 'Delete queued', status: 'queued' });
          } catch (error) {
            console.error('Delete range error:', error);
            sendJson(res, 500, { message: `Unable to delete range: ${error.message}` });
          }
          return;
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

      // Per-section fetch (cached)
      if (resourceSegments.length >= 4 && method === 'GET' && resourceSegments[2] === 'sections') {
        const sectionId = Number.parseInt(resourceSegments[3], 10);
        const live = resourceSegments[4] === 'live';
        try {
          const ipam = await db.getIpamById(ipamId);
          if (!ipam) return sendJson(res, 404, { message: 'IPAM integration not found.' });

          if (live) {
            const { ranges } = await syncPhpIpamSection(ipam, sectionId);
            return sendJson(res, 200, { sectionId, ranges, live: true, ts: new Date().toISOString() });
          }

          const key = `${ipamId}:${sectionId}`;
          const now = Date.now();
          const cached = sectionCache.get(key);
          if (cached && now - cached.ts < SECTION_TTL_MS) {
            return sendJson(res, 200, { sectionId, ranges: cached.ranges, live: false, cached: true, ts: new Date(cached.ts).toISOString() });
          }

          const { ranges } = await syncPhpIpamSection(ipam, sectionId);
          sectionCache.set(key, { ts: now, ranges });
          return sendJson(res, 200, { sectionId, ranges, live: false, cached: false, ts: new Date().toISOString() });
        } catch (error) {
          console.error('Section fetch error:', error);
          return sendJson(res, 500, { message: 'Unable to fetch section data' });
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/check-updates' || resourcePath === '/check-updates')) {
        await handleCheckUpdates();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/update' || resourcePath === '/update')) {
        await handlePerformUpdate();
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
        console.log(`Parsing device ID: "${idSegment}" -> ${deviceId} (isNaN: ${isNaN(deviceId)})`);

        if (method === 'GET') {
          await handleGetMikrotik(deviceId);
          return;
        }

        if (method === 'PUT') {
          await handleUpdateMikrotik(deviceId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteMikrotik(deviceId);
          return;
        }
      }

      if (resourceSegments[0] === 'mikrotiks' && resourceSegments.length === 3) {
        const deviceId = Number.parseInt(resourceSegments[1], 10);
        const action = resourceSegments[2];

        if (method === 'POST' && action === 'test-connectivity') {
          await handleTestMikrotikConnectivity(deviceId);
          return;
        }

        if (method === 'GET' && action === 'interfaces') {
          await handleGetMikrotikInterfaces(deviceId);
          return;
        }

        if (method === 'GET' && action === 'interface-details') {
          const interfaceName = url.searchParams.get('name');
          if (!interfaceName) {
            sendJson(res, 400, { message: 'Interface name is required.' });
            return;
          }
          await handleGetMikrotikInterfaceDetails(deviceId, interfaceName);
          return;
        }

        if (method === 'GET' && action === 'ip-addresses') {
          await handleGetMikrotikIpAddresses(deviceId);
          return;
        }

        if (method === 'POST' && action === 'ip-addresses') {
          await handleAddMikrotikIpAddress(deviceId);
          return;
        }

        if (method === 'PUT' && action === 'ip-addresses') {
          await handleUpdateMikrotikIpAddress(deviceId);
          return;
        }

        if (method === 'GET' && action === 'routes') {
          await handleGetMikrotikRoutes(deviceId);
          return;
        }

        if (method === 'GET' && action === 'logs') {
          await handleGetMikrotikLogs(deviceId);
          return;
        }

        if (method === 'GET' && action === 'firewall') {
          await handleGetMikrotikFirewallRules(deviceId);
          return;
        }

        if (method === 'PUT' && action === 'firewall') {
          await handleUpdateMikrotikFirewallRule(deviceId);
          return;
        }

        if (method === 'GET' && action === 'nat') {
          await handleGetMikrotikNatRules(deviceId);
          return;
        }

        if (method === 'GET' && action === 'mangle') {
          await handleGetMikrotikMangleRules(deviceId);
          return;
        }

        if (method === 'GET' && action === 'logs') {
          await handleGetMikrotikSystemLogs(deviceId);
          return;
        }

        if (method === 'POST' && action === 'safe-mode') {
          await handleToggleMikrotikSafeMode(deviceId);
          return;
        }

        if (method === 'GET' && action === 'update-info') {
          await handleGetMikrotikUpdateInfo(deviceId);
          return;
        }

        if (method === 'POST' && action === 'download') {
          await handleDownloadMikrotikUpdate(deviceId);
          return;
        }

        if (method === 'POST' && action === 'install-update') {
          await handleInstallMikrotikUpdate(deviceId);
          return;
        }
      }

      // Handle mikrotiks/:id/update/:action routes (length === 4)
      if (resourceSegments[0] === 'mikrotiks' && resourceSegments.length === 4) {
        const deviceId = Number.parseInt(resourceSegments[1], 10);
        const category = resourceSegments[2];
        const action = resourceSegments[3];

        if (category === 'update') {
          if (method === 'POST' && action === 'download') {
            await handleDownloadMikrotikUpdate(deviceId);
            return;
          }

          if (method === 'POST' && action === 'install') {
            await handleInstallMikrotikUpdate(deviceId);
            return;
          }
        }
      }

      // Handle mikrotiks/:id/safe-mode routes (length === 3)
      if (resourceSegments[0] === 'mikrotiks' && resourceSegments.length === 3) {
        const deviceId = Number.parseInt(resourceSegments[1], 10);
        const action = resourceSegments[2];

        if (action === 'safe-mode' && method === 'POST') {
          await handleToggleMikrotikSafeMode(deviceId);
          return;
        }

        if (action === 'safe-mode' && method === 'GET') {
          await handleGetMikrotikSafeModeStatus(deviceId);
          return;
        }
      }

      // Handle mikrotiks/:id/restart routes (length === 3)
      if (resourceSegments[0] === 'mikrotiks' && resourceSegments.length === 3) {
        const deviceId = Number.parseInt(resourceSegments[1], 10);
        const action = resourceSegments[2];

        if (method === 'POST' && action === 'restart') {
          await handleRestartMikrotik(deviceId);
          return;
        }

        if (method === 'POST' && action === 'restart-with-ping') {
          await handleRestartWithPingVerification(deviceId);
          return;
        }

        if (method === 'POST' && action === 'diagnose') {
          await handleDiagnoseMikrotik(deviceId);
          return;
        }

        if (method === 'POST' && action === 'enable') {
          await handleEnableMikrotik(deviceId);
          return;
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/mikrotiks' || resourcePath === '/mikrotiks')) {
        await handleCreateMikrotik();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/firewall' || resourcePath === '/firewall')) {
        await handleListFirewallInventory();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/address-lists' || resourcePath === '/address-lists')) {
        await handleCreateAddressList();
        return;
      }

      if (resourceSegments[0] === 'address-lists' && resourceSegments.length === 2) {
        const listId = Number.parseInt(resourceSegments[1], 10);

        if (method === 'PUT') {
          await handleUpdateAddressList(listId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteAddressList(listId);
          return;
        }
      }

      if (
        method === 'POST' &&
        (canonicalPath === '/api/firewall/filters' || resourcePath === '/firewall/filters')
      ) {
        await handleCreateFirewallFilter();
        return;
      }

      if (resourceSegments[0] === 'firewall' && resourceSegments[1] === 'filters' && resourceSegments.length === 3) {
        const filterId = Number.parseInt(resourceSegments[2], 10);

        if (method === 'PUT') {
          await handleUpdateFirewallFilter(filterId);
          return;
        }

        if (method === 'DELETE') {
          await handleDeleteFirewallFilter(filterId);
          return;
        }
      }

      if (method === 'GET' && (canonicalPath === '/api/tunnels' || resourcePath === '/tunnels')) {
        await handleListTunnels();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/routes' || resourcePath === '/routes')) {
        await handleListRoutes();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/firewall' || resourcePath === '/firewall')) {
        await handleListFirewall();
        return;
      }

      // Group Firewall API endpoints
      if (method === 'GET' && (canonicalPath === '/api/group-firewall' || resourcePath === '/group-firewall')) {
        await handleGetGroupFirewallRules();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/address-lists' || resourcePath === '/address-lists')) {
        await handleGetAddressLists();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/address-lists' || resourcePath === '/address-lists')) {
        await handleCreateAddressList();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/group-firewall/apply' || resourcePath === '/group-firewall/apply')) {
        await handleApplyFirewallRuleToGroup();
        return;
      }

      // Test MikroTik connection endpoint
      if (method === 'POST' && (canonicalPath === '/api/test-mikrotik-connection' || resourcePath === '/test-mikrotik-connection')) {
        await handleTestMikrotikConnection();
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

      // Provision tunnel (allocate /30 from IPAM and queue)
      if (resourceSegments[0] === 'tunnels' && resourceSegments.length === 3 && resourceSegments[2] === 'provision' && method === 'POST') {
        const tunnelId = Number.parseInt(resourceSegments[1], 10);
        try {
          if (!Number.isInteger(tunnelId) || tunnelId <= 0) {
            return sendJson(res, 400, { message: 'Valid tunnel id is required' });
          }
          const body = await parseJsonBody(req);
          const { ipamId, parentSubnetId, parentRangeCidr, mask = 30, description } = body || {};
          if (!Number.isInteger(ipamId)) {
            return sendJson(res, 400, { message: 'ipamId is required' });
          }
          const queueItem = await addToQueue({
            type: 'provision_tunnel',
            ipamId,
            data: { tunnelId, parentSubnetId: parentSubnetId ? Number.parseInt(parentSubnetId, 10) : null, parentRangeCidr, mask: Number.parseInt(mask, 10) || 30, description: description || `Tunnel ${tunnelId}` }
          });
          (async () => { await processQueuedOperation(queueItem); })();
          return sendJson(res, 202, { message: 'Provision queued', status: 'queued', queueId: queueItem.id });
        } catch (e) {
          console.error('Provision tunnel error:', e);
          return sendJson(res, 500, { message: 'Unable to queue provision' });
        }
      }

      if (method === 'POST' && (canonicalPath === '/api/tunnels' || resourcePath === '/tunnels')) {
        await handleCreateTunnel();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/tools/secret' || resourcePath === '/tools/secret')) {
        await handleGenerateSecret();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/tools/ping' || resourcePath === '/tools/ping')) {
        await handlePingDiagnostics();
        return;
      }

      // Simple ping endpoint for device ping testing
      if (method === 'POST' && (canonicalPath === '/api/ping' || resourcePath === '/ping')) {
        await handleSimplePing();
        return;
      }


      if (
        method === 'POST' &&
        (canonicalPath === '/api/tools/traceroute' || resourcePath === '/tools/traceroute')
      ) {
        await handleTracerouteDiagnostics();
        return;
      }

      sendJson(res, 404, { message: 'Not found.' });
    } catch (error) {
      console.error('Request handling error', error);
      sendJson(res, 500, { message: 'Unexpected server error.' });
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`API server ready at http://0.0.0.0:${port}`);
  });
};

// Group Firewall Handler Functions
async function handleGetGroupFirewallRules() {
  try {
    const result = await getGroupFirewallRules();
    sendJson(res, 200, result);
  } catch (error) {
    console.error('Error getting group firewall rules:', error);
    sendJson(res, 500, { message: 'Failed to get group firewall rules' });
  }
}

async function handleGetAddressLists() {
  try {
    const result = await getAddressLists();
    sendJson(res, 200, result);
  } catch (error) {
    console.error('Error getting address lists:', error);
    sendJson(res, 500, { message: 'Failed to get address lists' });
  }
}

async function handleCreateAddressList() {
  try {
    const body = await readRequestBody(req);
    const { name, addresses, description } = body;
    
    if (!name || !addresses || !Array.isArray(addresses)) {
      sendJson(res, 400, { message: 'Name and addresses array are required' });
      return;
    }
    
    const result = await createAddressList(name, addresses, description);
    
    if (result.success) {
      sendJson(res, 201, result);
    } else {
      sendJson(res, 400, result);
    }
  } catch (error) {
    console.error('Error creating address list:', error);
    sendJson(res, 500, { message: 'Failed to create address list' });
  }
}

async function handleApplyFirewallRuleToGroup() {
  try {
    const body = await readRequestBody(req);
    const { groupId, ruleId } = body;
    
    if (!groupId || !ruleId) {
      sendJson(res, 400, { message: 'Group ID and Rule ID are required' });
      return;
    }
    
    const result = await applyFirewallRuleToGroup(groupId, ruleId);
    
    if (result.success) {
      // Add log entry for group firewall application
      await addSystemLog(0, 'firewall', 'info', `Firewall rule ${ruleId} applied to group ${groupId}`);
      sendJson(res, 200, result);
    } else {
      sendJson(res, 400, result);
    }
  } catch (error) {
    console.error('Error applying firewall rule to group:', error);
    sendJson(res, 500, { message: 'Failed to apply firewall rule to group' });
  }
}


bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

