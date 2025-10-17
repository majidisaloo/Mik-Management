import { Modal } from '../components/Modal';

export const UserModal = ({ 
  open, 
  onClose, 
  userForm, 
  setUserForm, 
  roles, 
  onSubmit, 
  isEditing 
}) => (
  <Modal open={open} onClose={onClose} title={isEditing ? 'Edit User' : 'Create User'}>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={userForm.firstName}
            onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={userForm.lastName}
            onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={userForm.email}
          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={userForm.password}
          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={userForm.passwordConfirmation}
          onChange={(e) => setUserForm({ ...userForm, passwordConfirmation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          value={userForm.roleId}
          onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  </Modal>
);

export const RoleModal = ({ 
  open, 
  onClose, 
  roleForm, 
  setRoleForm, 
  onSubmit, 
  isEditing 
}) => (
  <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Role' : 'Create Role'}>
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role Name
        </label>
        <input
          type="text"
          value={roleForm.name}
          onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permissions
        </label>
        <div className="space-y-2">
          {['read', 'write', 'delete', 'admin'].map((permission) => (
            <label key={permission} className="flex items-center">
              <input
                type="checkbox"
                checked={roleForm.permissions.includes(permission)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRoleForm({
                      ...roleForm,
                      permissions: [...roleForm.permissions, permission]
                    });
                  } else {
                    setRoleForm({
                      ...roleForm,
                      permissions: roleForm.permissions.filter(p => p !== permission)
                    });
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 capitalize">{permission}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  </Modal>
);
