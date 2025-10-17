export const loadUsers = async () => {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error('Unable to load users.');
    }
    const payload = await response.json();
    const usersArray = payload.users || payload;
    return Array.isArray(usersArray) ? usersArray : [];
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
};

export const loadRoles = async () => {
  try {
    const response = await fetch('/api/roles');
    if (!response.ok) {
      throw new Error('Unable to load roles.');
    }
    const payload = await response.json();
    const rolesArray = payload.roles || payload;
    return Array.isArray(rolesArray) ? rolesArray : [];
  } catch (error) {
    console.error('Failed to load roles:', error);
    return [];
  }
};

export const createUser = async (userData) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Unable to create user.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
};

export const createRole = async (roleData) => {
  try {
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Unable to create role.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create role:', error);
    throw error;
  }
};
