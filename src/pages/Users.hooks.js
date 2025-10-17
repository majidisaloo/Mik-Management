import { useState, useEffect, useCallback } from 'react';
import { loadUsers, loadRoles, createUser, createRole } from './Users.js';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const loadUsersData = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await loadUsers();
      setUsers(usersData);
      setStatus({ type: '', message: '' });
    } catch (error) {
      setUsers([]);
      setStatus({
        type: 'error',
        message: error.message || 'Unable to load users.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRolesData = useCallback(async () => {
    try {
      const rolesData = await loadRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setRoles([]);
    }
  }, []);

  const handleCreateUser = useCallback(async (userData) => {
    try {
      const result = await createUser(userData);
      setStatus({
        type: 'success',
        message: result.message || 'User created successfully.'
      });
      await loadUsersData();
      return result;
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create user.'
      });
      throw error;
    }
  }, [loadUsersData]);

  const handleCreateRole = useCallback(async (roleData) => {
    try {
      const result = await createRole(roleData);
      setStatus({
        type: 'success',
        message: result.message || 'Role created successfully.'
      });
      await loadRolesData();
      return result;
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create role.'
      });
      throw error;
    }
  }, [loadRolesData]);

  useEffect(() => {
    loadUsersData();
    loadRolesData();
  }, [loadUsersData, loadRolesData]);

  return {
    users,
    roles,
    loading,
    status,
    setStatus,
    loadUsersData,
    loadRolesData,
    handleCreateUser,
    handleCreateRole
  };
};
