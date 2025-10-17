import React from 'react';
import { useUsers } from './Users.hooks';
import { useUserForm } from './Users.forms';
import { UserModal, RoleModal } from './Users.components';
import './Users.css';

const Users = () => {
  const {
    users,
    roles,
    loading,
    status,
    setStatus,
    handleCreateUser,
    handleCreateRole
  } = useUsers();

  const {
    userForm,
    setUserForm,
    roleForm,
    setRoleForm,
    showUserModal,
    showRoleModal,
    handleNewUser,
    handleNewRole,
    handleCloseUserModal,
    handleCloseRoleModal
  } = useUserForm();

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleCreateUser(userForm);
      handleCloseUserModal();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleCreateRole(roleForm);
      handleCloseRoleModal();
    } catch (error) {
      // Error already handled in hook
    }
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="users-header">
        <h1 className="users-title">Users & Roles</h1>
        <div className="users-actions">
          <button onClick={handleNewRole} className="users-btn users-btn--secondary">
            New Role
          </button>
          <button onClick={handleNewUser} className="users-btn users-btn--primary">
            New User
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="users-search">
        <input
          type="text"
          placeholder="Search users..."
          className="users-search-input"
        />
        <select className="users-filter-select">
          <option value="">All Roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="users-content">
        {loading ? (
          <div className="users-loading">Loading...</div>
        ) : users.length === 0 ? (
          <div className="users-empty">
            <p>No users found. Create your first user to get started.</p>
            <button onClick={handleNewUser} className="users-btn users-btn--primary">
              Create Your First User
            </button>
          </div>
        ) : (
          <div className="users-list">
            {users.map((user) => (
              <div key={user.id} className="users-item">
                <div className="users-item-info">
                  <h3 className="users-item-name">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="users-item-email">{user.email}</p>
                </div>
                <div className="users-item-actions">
                  <button className="users-btn users-btn--ghost">Edit</button>
                  <button className="users-btn users-btn--danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      {status.message && (
        <div className={`users-status users-status--${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Modals */}
      <UserModal
        open={showUserModal}
        onClose={handleCloseUserModal}
        userForm={userForm}
        setUserForm={setUserForm}
        roles={roles}
        onSubmit={handleUserSubmit}
        isEditing={false}
      />
      
      <RoleModal
        open={showRoleModal}
        onClose={handleCloseRoleModal}
        roleForm={roleForm}
        setRoleForm={setRoleForm}
        onSubmit={handleRoleSubmit}
        isEditing={false}
      />
    </div>
  );
};

export default Users;