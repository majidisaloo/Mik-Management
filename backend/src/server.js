import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import initializeDatabase, { resolveDatabaseFile } from './database.js';
import { ensureDatabaseConfig, getConfigFilePath } from './config.js';
import getProjectVersion from './version.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const basePermissions = {
  dashboard: false,
  users: false,
  roles: false,
  groups: false,
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
    createdAt: device.createdAt,
    updatedAt: device.updatedAt
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
    entries.sort((a, b) => a.name.localeCompare(b.name));
    entries.forEach((child) => sortNodes(child.children));
  };

  sortNodes(roots);

  return roots;
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

    const handleRegister = async () => {
      const body = await parseJsonBody(req);
      const { firstName, lastName, email, password, passwordConfirmation } = body ?? {};

      const normalizedFirstName = normalizeString(firstName);
      const normalizedLastName = normalizeString(lastName);
      const normalizedEmail = normalizeString(email).toLowerCase();
      const rawPassword = typeof password === 'string' ? password : '';

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

      if (!rawPassword) {
        sendJson(res, 400, { message: 'Password is required.' });
        return;
      }

      if (rawPassword.length < 8) {
        sendJson(res, 400, { message: 'Password must be at least 8 characters long.' });
        return;
      }

      if (passwordConfirmation !== undefined && rawPassword !== passwordConfirmation) {
        sendJson(res, 400, { message: 'Passwords must match.' });
        return;
      }

      try {
        const passwordHash = hashPassword(rawPassword, config.databasePassword);
        const result = await db.createUser({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          passwordHash
        });

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'This email is already registered.' });
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

    const handleAdminCreateUser = async () => {
      const body = await parseJsonBody(req);
      const { firstName, lastName, email, password, passwordConfirmation, roles } = body ?? {};

      const normalizedFirstName = normalizeString(firstName);
      const normalizedLastName = normalizeString(lastName);
      const normalizedEmail = normalizeString(email).toLowerCase();
      const rawPassword = typeof password === 'string' ? password : '';

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

      if (!rawPassword) {
        sendJson(res, 400, { message: 'Password is required.' });
        return;
      }

      if (rawPassword.length < 8) {
        sendJson(res, 400, { message: 'Password must be at least 8 characters long.' });
        return;
      }

      if (passwordConfirmation !== undefined && rawPassword !== passwordConfirmation) {
        sendJson(res, 400, { message: 'Passwords must match.' });
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

      try {
        const passwordHash = hashPassword(rawPassword, config.databasePassword);
        const result = await db.createUser({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          passwordHash,
          roleIds: normalizedRoles
        });

        if (!result.success && result.reason === 'duplicate-email') {
          sendJson(res, 409, { message: 'This email is already registered.' });
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
          throw new Error('Unable to create user.');
        }

        const rolesList = await db.listRoles();
        sendJson(res, 201, {
          message: 'User created successfully.',
          user: mapUser(result.user, rolesList)
        });
      } catch (error) {
        console.error('Create user error', error);
        sendJson(res, 500, { message: 'Unable to create the user right now.' });
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

        sendNoContent(res);
      } catch (error) {
        console.error('Delete user error', error);
        sendJson(res, 500, { message: 'Unable to delete the user right now.' });
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
        sendJson(res, 200, { groups: mapped, tree });
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
      const { name, host, groupId, tags, notes, routeros } = body ?? {};

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
          routeros: buildRouterosPayload(routeros)
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
      const { name, host, groupId, tags, notes, routeros } = body ?? {};

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

    try {
      if (method === 'GET' && (canonicalPath === '/health' || resourcePath === '/health')) {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/meta' || resourcePath === '/meta')) {
        sendJson(res, 200, { version });
        return;
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

      if (method === 'POST' && (canonicalPath === '/api/login' || resourcePath === '/login')) {
        await handleLogin();
        return;
      }

      if (method === 'GET' && (canonicalPath === '/api/users' || resourcePath === '/users')) {
        await handleListUsers();
        return;
      }

      if (method === 'POST' && (canonicalPath === '/api/users' || resourcePath === '/users')) {
        await handleAdminCreateUser();
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
