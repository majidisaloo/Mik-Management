import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Firewall.css';

// Icons
const FirewallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Firewall = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState([]);
  const [addressLists, setAddressLists] = useState([]);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [activeTab, setActiveTab] = useState('filters');

  useEffect(() => {
    if (!user) return;
    loadFirewallData();
    loadMikrotiks();
    loadGroups();
  }, [user]);

  const loadFirewallData = async () => {
    try {
      const response = await fetch('/api/firewall');
      if (response.ok) {
        const data = await response.json();
        setFilters(data.filters || []);
        setAddressLists(data.addressLists || []);
      }
    } catch (error) {
      console.error('Error loading firewall data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMikrotiks = async () => {
    try {
      const response = await fetch('/api/mikrotiks');
      if (response.ok) {
        const data = await response.json();
        setMikrotiks(data.mikrotiks || []);
      }
    } catch (error) {
      console.error('Error loading mikrotiks:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const filteredFilters = filters.filter(filter => {
    const matchesSearch = filter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         filter.chain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         filter.action?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || filter.groupId?.toString() === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const filteredAddressLists = addressLists.filter(list => {
    const matchesSearch = list.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || list.referenceId?.toString() === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  if (loading) {
    return (
      <div className="firewall-page">
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className="ml-3 text-primary">Loading firewall configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="firewall-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-lg">
            <FirewallIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Firewall</h1>
            <p className="text-tertiary mt-1">Configure firewall rules and address lists</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn--secondary flex items-center gap-2">
            <ShieldIcon />
            Address Lists
          </button>
          <button className="btn btn--primary flex items-center gap-2">
            <PlusIcon />
            New Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('filters')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'filters'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Filter Rules ({filters.length})
          </button>
          <button
            onClick={() => setActiveTab('addresslists')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'addresslists'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Address Lists ({addressLists.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'filters' ? 'filter rules' : 'address lists'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="input"
            >
              <option value="all">All Groups</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'filters' ? (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Firewall Filter Rules</h3>
          </div>
          
          {filteredFilters.length === 0 ? (
            <div className="text-center py-12">
              <FirewallIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No filter rules found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedGroup !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first firewall filter rule.'
                }
              </p>
              {!searchTerm && selectedGroup === 'all' && (
                <div className="mt-6">
                  <button className="btn btn--primary flex items-center gap-2 mx-auto">
                    <PlusIcon />
                    Create First Rule
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFilters.map((filter) => (
                    <tr key={filter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {filter.name || 'Unnamed Rule'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {filter.chain || 'input'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {filter.sourceAddressListName || 'Any'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {filter.destinationAddressListName || 'Any'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          filter.action === 'accept' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {filter.action || 'drop'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          filter.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {filter.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary hover:text-primary-dark mr-4">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Address Lists</h3>
          </div>
          
          {filteredAddressLists.length === 0 ? (
            <div className="text-center py-12">
              <ShieldIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No address lists found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedGroup !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first address list.'
                }
              </p>
              {!searchTerm && selectedGroup === 'all' && (
                <div className="mt-6">
                  <button className="btn btn--primary flex items-center gap-2 mx-auto">
                    <PlusIcon />
                    Create First Address List
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      List Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAddressLists.map((list) => (
                    <tr key={list.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {list.name || 'Unnamed List'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {list.address || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {list.referenceName || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {list.comment || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary hover:text-primary-dark mr-4">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Firewall;