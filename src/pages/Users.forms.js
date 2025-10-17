import { useState } from 'react';

export const useUserForm = () => {
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    roleId: ''
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    permissions: []
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const resetUserForm = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      roleId: ''
    });
    setIsEditing(false);
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      permissions: []
    });
    setIsEditing(false);
  };

  const handleNewUser = (e) => {
    e.preventDefault();
    resetUserForm();
    setShowUserModal(true);
  };

  const handleNewRole = (e) => {
    e.preventDefault();
    resetRoleForm();
    setShowRoleModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    resetUserForm();
  };

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    resetRoleForm();
  };

  return {
    userForm,
    setUserForm,
    roleForm,
    setRoleForm,
    showUserModal,
    setShowUserModal,
    showRoleModal,
    setShowRoleModal,
    isEditing,
    setIsEditing,
    handleNewUser,
    handleNewRole,
    handleCloseUserModal,
    handleCloseRoleModal,
    resetUserForm,
    resetRoleForm
  };
};
