import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyAddressForm = () => ({
  name: '',
  referenceType: 'mikrotik',
  referenceId: '',
  address: '',
  comment: ''
});

const emptyFilterForm = () => ({
  name: '',
  groupId: '',
  chain: 'forward',
  sourceAddressListId: '',
  destinationAddressListId: '',
  sourcePort: '',
  destinationPort: '',
  states: [],
  action: 'accept',
  enabled: true,
  comment: ''
});

const chainOptions = [
  { value: 'input', label: 'Input' },
  { value: 'output', label: 'Output' },
  { value: 'forward', label: 'Forward' }
];

const actionOptions = [
  { value: 'accept', label: 'Accept' },
  { value: 'drop', label: 'Drop' }
];

const stateOptions = [
  { value: 'new', label: 'New' },
  { value: 'established', label: 'Established' },
  { value: 'related', label: 'Related' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'syn', label: 'Syn' }
];

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const Firewall = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [addressLists, setAddressLists] = useState([]);
  const [filters, setFilters] = useState([]);
  const [groups, setGroups] = useState([]);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [targetVersion, setTargetVersion] = useState('');
  const [addressModal, setAddressModal] = useState({ open: false, id: null, form: emptyAddressForm() });
  const [filterModal, setFilterModal] = useState({ open: false, id: null, form: emptyFilterForm() });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.mikrotiks) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/firewall', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load firewall inventory.');
        }

        const payload = await response.json();
        setAddressLists(Array.isArray(payload?.addressLists) ? payload.addressLists : []);
        setFilters(Array.isArray(payload?.filters) ? payload.filters : []);
        setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
        setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
        setTargetVersion(typeof payload?.targetRouterOs === 'string' ? payload.targetRouterOs : '');
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setStatus({
          type: 'error',
          message: error.message || 'Firewall inventory is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const sortedAddressLists = useMemo(() => {
    return [...addressLists].sort((a, b) => a.name.localeCompare(b.name));
  }, [addressLists]);

  const sortedFilters = useMemo(() => {
    return [...filters].sort((a, b) => a.name.localeCompare(b.name));
  }, [filters]);

  const refreshInventory = async () => {
    try {
      const response = await fetch('/api/firewall');
      if (!response.ok) {
        throw new Error('Unable to refresh the firewall data.');
      }
      const payload = await response.json();
      setAddressLists(Array.isArray(payload?.addressLists) ? payload.addressLists : []);
      setFilters(Array.isArray(payload?.filters) ? payload.filters : []);
      setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
      setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
      setTargetVersion(typeof payload?.targetRouterOs === 'string' ? payload.targetRouterOs : '');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh the firewall inventory.' });
    }
  };

  const openAddressCreate = () => {
    setAddressModal({ open: true, id: null, form: emptyAddressForm() });
    setStatus({ type: '', message: '' });
  };

  const openAddressEdit = (entry) => {
    setAddressModal({
      open: true,
      id: entry.id,
      form: {
        name: entry.name ?? '',
        referenceType: entry.referenceType ?? 'mikrotik',
        referenceId: entry.referenceId ? String(entry.referenceId) : '',
        address: entry.address ?? '',
        comment: entry.comment ?? ''
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeAddressModal = () => {
    setAddressModal({ open: false, id: null, form: emptyAddressForm() });
    setSaving(false);
    setDeleting(false);
  };

  const handleAddressField = (event) => {
    const { name, value } = event.target;
    setAddressModal((current) => {
      if (name === 'referenceType') {
        return {
          ...current,
          form: {
            ...current.form,
            referenceType: value,
            referenceId: ''
          }
        };
      }

      return {
        ...current,
        form: {
          ...current.form,
          [name]: value
        }
      };
    });
  };

  const submitAddressList = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: addressModal.form.name,
      referenceType: addressModal.form.referenceType,
      referenceId: addressModal.form.referenceId ? Number.parseInt(addressModal.form.referenceId, 10) : null,
      address: addressModal.form.address,
      comment: addressModal.form.comment
    };

    try {
      const endpoint = addressModal.id ? `/api/address-lists/${addressModal.id}` : '/api/address-lists';
      const method = addressModal.id ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body?.message || 'Unable to save the address list entry.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: addressModal.id ? 'Address list updated.' : 'Address list created.' });
      closeAddressModal();
      await refreshInventory();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddressList = async () => {
    if (!addressModal.id) {
      return;
    }
    setDeleting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/address-lists/${addressModal.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body?.message || 'Unable to delete the address list entry.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Address list entry deleted.' });
      closeAddressModal();
      await refreshInventory();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleting(false);
    }
  };

  const openFilterCreate = () => {
    setFilterModal({ open: true, id: null, form: emptyFilterForm() });
    setStatus({ type: '', message: '' });
  };

  const openFilterEdit = (entry) => {
    setFilterModal({
      open: true,
      id: entry.id,
      form: {
        name: entry.name ?? '',
        groupId: entry.groupId ? String(entry.groupId) : '',
        chain: entry.chain ?? 'forward',
        sourceAddressListId: entry.sourceAddressListId ? String(entry.sourceAddressListId) : '',
        destinationAddressListId: entry.destinationAddressListId ? String(entry.destinationAddressListId) : '',
        sourcePort: entry.sourcePort ?? '',
        destinationPort: entry.destinationPort ?? '',
        states: Array.isArray(entry.states) ? entry.states : [],
        action: entry.action ?? 'accept',
        enabled: entry.enabled !== undefined ? Boolean(entry.enabled) : true,
        comment: entry.comment ?? ''
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeFilterModal = () => {
    setFilterModal({ open: false, id: null, form: emptyFilterForm() });
    setSaving(false);
    setDeleting(false);
  };

  const handleFilterField = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === 'states') {
      const stateValue = value;
      setFilterModal((current) => {
        const present = current.form.states.includes(stateValue);
        return {
          ...current,
          form: {
            ...current.form,
            states: present
              ? current.form.states.filter((item) => item !== stateValue)
              : [...current.form.states, stateValue]
          }
        };
      });
      return;
    }

    setFilterModal((current) => ({
      ...current,
      form: {
        ...current.form,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const submitFilter = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: filterModal.form.name,
      groupId: filterModal.form.groupId ? Number.parseInt(filterModal.form.groupId, 10) : null,
      chain: filterModal.form.chain,
      sourceAddressListId: filterModal.form.sourceAddressListId
        ? Number.parseInt(filterModal.form.sourceAddressListId, 10)
        : null,
      destinationAddressListId: filterModal.form.destinationAddressListId
        ? Number.parseInt(filterModal.form.destinationAddressListId, 10)
        : null,
      sourcePort: filterModal.form.sourcePort,
      destinationPort: filterModal.form.destinationPort,
      states: filterModal.form.states,
      action: filterModal.form.action,
      enabled: Boolean(filterModal.form.enabled),
      comment: filterModal.form.comment
    };

    try {
      const endpoint = filterModal.id ? `/api/firewall/filters/${filterModal.id}` : '/api/firewall/filters';
      const method = filterModal.id ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body?.message || 'Unable to save the firewall rule.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: filterModal.id ? 'Firewall rule updated.' : 'Firewall rule created.' });
      closeFilterModal();
      await refreshInventory();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFilter = async () => {
    if (!filterModal.id) {
      return;
    }
    setDeleting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/firewall/filters/${filterModal.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body?.message || 'Unable to delete the firewall rule.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Firewall rule deleted.' });
      closeFilterModal();
      await refreshInventory();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleting(false);
    }
  };

  if (!user?.permissions?.mikrotiks) {
    return null;
  }

  const referenceOptions = addressModal.form.referenceType === 'group' ? groups : mikrotiks;

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h1>Firewall</h1>
          <p className="card-intro">
            Define MikroTik address lists and filter rules to orchestrate RouterOS deployments. Target version: {targetVersion || '—'}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={refreshInventory} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {status.message ? <div className={`card-alert card-alert--${status.type}`}>{status.message}</div> : null}

      {loading ? (
        <p className="muted">Loading firewall configuration…</p>
      ) : (
        <div className="firewall-grid">
          <section>
            <header className="panel__header">
              <div>
                <h2>Address lists</h2>
                <p className="muted">Map MikroTik devices or groups into reusable address lists.</p>
              </div>
              <button type="button" className="action-button action-button--primary" onClick={openAddressCreate}>
                Add entry
              </button>
            </header>
            {sortedAddressLists.length === 0 ? (
              <p className="muted">No address list entries have been defined.</p>
            ) : (
              <ul className="management-list">
                {sortedAddressLists.map((entry) => (
                  <li key={entry.id} className="management-list__item">
                    <div className="management-list__summary">
                      <span className="management-list__title">{entry.name}</span>
                      <div className="management-list__meta">
                        <span>
                          {entry.referenceType === 'group' ? 'Group' : 'Mikrotik'} · {entry.referenceName || 'Unknown reference'}
                        </span>
                        <span>{entry.address || 'No explicit address'}</span>
                        <span>{entry.comment || 'No comment'}</span>
                        <span>Created {formatDateTime(entry.createdAt)}</span>
                      </div>
                    </div>
                    <div className="management-list__actions">
                      <button type="button" className="action-button" onClick={() => openAddressEdit(entry)}>
                        Manage
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <header className="panel__header">
              <div>
                <h2>Filter rules</h2>
                <p className="muted">Compose filter policies across RouterOS chains using address lists.</p>
              </div>
              <button type="button" className="action-button action-button--primary" onClick={openFilterCreate}>
                Add rule
              </button>
            </header>
            {sortedFilters.length === 0 ? (
              <p className="muted">No firewall rules have been defined yet.</p>
            ) : (
              <ul className="management-list">
                {sortedFilters.map((entry) => (
                  <li key={entry.id} className="management-list__item">
                    <div className="management-list__summary">
                      <span className="management-list__title">{entry.name}</span>
                      <div className="management-list__meta">
                        <span>Chain: {entry.chain}</span>
                        <span>Group: {entry.groupName || 'Any'}</span>
                        <span>Action: {entry.action}</span>
                        <span>Enabled: {entry.enabled ? 'Yes' : 'No'}</span>
                        <span>
                          Source list: {entry.sourceAddressListName || '—'} · Destination list: {entry.destinationAddressListName || '—'}
                        </span>
                        <span>
                          Ports S/D: {entry.sourcePort || '—'} / {entry.destinationPort || '—'}
                        </span>
                        <span>States: {entry.states?.length ? entry.states.join(', ') : 'None'}</span>
                        <span>{entry.comment || 'No comment'}</span>
                        <span>Updated {formatDateTime(entry.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="management-list__actions">
                      <button type="button" className="action-button" onClick={() => openFilterEdit(entry)}>
                        Manage
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {addressModal.open ? (
        <Modal
          title={addressModal.id ? 'Edit address list entry' : 'Add address list entry'}
          description="Associate MikroTik devices or groups with reusable address lists."
          onClose={closeAddressModal}
          actions={
            <>
              <button type="button" className="action-button" onClick={closeAddressModal}>
                Cancel
              </button>
              {addressModal.id ? (
                <button
                  type="button"
                  className="action-button action-button--danger"
                  onClick={handleDeleteAddressList}
                  disabled={deleting}
                >
                  {deleting ? 'Removing…' : 'Delete'}
                </button>
              ) : null}
              <button
                type="submit"
                form="address-form"
                className="action-button action-button--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="address-form" onSubmit={submitAddressList} className="form-grid">
            <label>
              <span>List name</span>
              <input name="name" value={addressModal.form.name} onChange={handleAddressField} required autoComplete="off" />
            </label>
            <label>
              <span>Reference type</span>
              <select name="referenceType" value={addressModal.form.referenceType} onChange={handleAddressField}>
                <option value="mikrotik">Mikrotik device</option>
                <option value="group">Mik-Group</option>
              </select>
            </label>
            <label>
              <span>{addressModal.form.referenceType === 'group' ? 'Group' : 'Device'}</span>
              <select name="referenceId" value={addressModal.form.referenceId} onChange={handleAddressField} required>
                <option value="">Select…</option>
                {referenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Address (optional)</span>
              <input name="address" value={addressModal.form.address} onChange={handleAddressField} autoComplete="off" />
            </label>
            <label className="wide">
              <span>Comment</span>
              <textarea name="comment" rows="3" value={addressModal.form.comment} onChange={handleAddressField} />
            </label>
          </form>
        </Modal>
      ) : null}

      {filterModal.open ? (
        <Modal
          title={filterModal.id ? 'Edit firewall rule' : 'Add firewall rule'}
          description="Author high-level filter rules using MikroTik address lists and chain controls."
          onClose={closeFilterModal}
          actions={
            <>
              <button type="button" className="action-button" onClick={closeFilterModal}>
                Cancel
              </button>
              {filterModal.id ? (
                <button
                  type="button"
                  className="action-button action-button--danger"
                  onClick={handleDeleteFilter}
                  disabled={deleting}
                >
                  {deleting ? 'Removing…' : 'Delete'}
                </button>
              ) : null}
              <button
                type="submit"
                form="filter-form"
                className="action-button action-button--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="filter-form" onSubmit={submitFilter} className="form-grid">
            <label>
              <span>Rule name</span>
              <input name="name" value={filterModal.form.name} onChange={handleFilterField} required autoComplete="off" />
            </label>
            <label>
              <span>Applies to group</span>
              <select name="groupId" value={filterModal.form.groupId} onChange={handleFilterField}>
                <option value="">Any group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Chain</span>
              <select name="chain" value={filterModal.form.chain} onChange={handleFilterField}>
                {chainOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Source address list</span>
              <select
                name="sourceAddressListId"
                value={filterModal.form.sourceAddressListId}
                onChange={handleFilterField}
              >
                <option value="">None</option>
                {addressLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Destination address list</span>
              <select
                name="destinationAddressListId"
                value={filterModal.form.destinationAddressListId}
                onChange={handleFilterField}
              >
                <option value="">None</option>
                {addressLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Source port</span>
              <input name="sourcePort" value={filterModal.form.sourcePort} onChange={handleFilterField} autoComplete="off" />
            </label>
            <label>
              <span>Destination port</span>
              <input
                name="destinationPort"
                value={filterModal.form.destinationPort}
                onChange={handleFilterField}
                autoComplete="off"
              />
            </label>
            <fieldset className="wide">
              <legend>Connection states</legend>
              <div className="toggle-grid">
                {stateOptions.map((option) => (
                  <label key={option.value} className="toggle-field">
                    <input
                      type="checkbox"
                      name="states"
                      value={option.value}
                      checked={filterModal.form.states.includes(option.value)}
                      onChange={handleFilterField}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              <span>Action</span>
              <select name="action" value={filterModal.form.action} onChange={handleFilterField}>
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                name="enabled"
                checked={filterModal.form.enabled}
                onChange={handleFilterField}
              />
              <span>Enabled</span>
            </label>
            <label className="wide">
              <span>Comment</span>
              <textarea name="comment" rows="3" value={filterModal.form.comment} onChange={handleFilterField} />
            </label>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};

export default Firewall;
