import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPermissions = () => ({
  dashboard: false,
  users: false,
  roles: false,
  groups: false
});

const defaultState = () => ({
  lastUserId: 0,
  lastRoleId: 0,
  lastGroupId: 0,
  users: [],
  roles: [],
  groups: []
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
          groups: true
        },
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ];
    normalized.lastRoleId = 1;
    mutated = true;
  } else {
    normalized.roles = normalized.roles.map((role) => ({
      ...role,
      permissions: sanitizePermissions(role.permissions)
    }));
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
    async createUser({ firstName, lastName, email, passwordHash }) {
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
              roles: true
            },
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ];
        state.lastRoleId = 1;
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

    async close() {
      return Promise.resolve();
    }
  };
};

export default initializeDatabase;
