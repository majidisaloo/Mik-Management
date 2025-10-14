const toJson = async (response) => {
  if (!response.ok) {
    const text = await response.text();
    if (!text) {
      throw new Error('Request failed');
    }
    try {
      const payload = JSON.parse(text);
      throw new Error(payload.error || payload.message || 'Request failed');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text);
      }
      throw error;
    }
  }

  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

function renderStatusIndicator(status, label = status) {
  const normalised = (status || 'unknown').toString().toLowerCase();
  let modifier = 'muted';
  if (['connected', 'success', 'up'].includes(normalised)) {
    modifier = 'success';
  } else if (['failed', 'disconnected', 'error', 'down'].includes(normalised)) {
    modifier = 'danger';
  }
  return `
    <span class="status-indicator status-indicator--${modifier}">
      <span class="status-indicator__dot" aria-hidden="true"></span>
      ${label}
    </span>
  `;
}

function renderIpamCollections(collections = { sections: [], datacenters: [], ranges: [] }) {
  const renderList = (items, emptyMessage) => {
    if (!items.length) {
      return `<li class="text-muted">${emptyMessage}</li>`;
    }
    return items
      .map((item) => {
        const extra = item.metadata && item.metadata.cidr ? item.metadata.cidr : item.description || '';
        return `
          <li>
            <strong>${item.name}</strong>
            <span class="text-muted">${extra}</span>
          </li>
        `;
      })
      .join('');
  };

  return `
    <div class="ipam-card__collections">
      <h4>Cached structure</h4>
      <div class="collection-grid">
        <div>
          <h5>Sections</h5>
          <ul>${renderList(collections.sections, 'No sections cached.')}</ul>
        </div>
        <div>
          <h5>Datacenters</h5>
          <ul>${renderList(collections.datacenters, 'No datacenters cached.')}</ul>
        </div>
        <div>
          <h5>Ranges</h5>
          <ul>${renderList(collections.ranges, 'No ranges cached.')}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderIpamCard(ipam, collections) {
  return `
    <article class="ipam-card" data-ipam-item data-ipam-id="${ipam.id}">
      <header class="ipam-card__header">
        <div>
          <h3>${ipam.name}</h3>
          <p class="text-muted">${ipam.base_url}</p>
        </div>
        ${renderStatusIndicator(ipam.last_status, ipam.last_status || 'unknown')}
      </header>
      <dl class="ipam-card__meta">
        <div><dt>App ID</dt><dd>${ipam.app_id}</dd></div>
        <div><dt>Permissions</dt><dd>${ipam.app_permissions}</dd></div>
        <div><dt>Security</dt><dd>${ipam.app_security}</dd></div>
        <div><dt>Last check</dt><dd>${ipam.last_checked_at ? new Date(ipam.last_checked_at).toLocaleString() : 'Never'}</dd></div>
      </dl>
      ${renderIpamCollections(collections)}
      <footer class="card-actions">
        <button class="button" type="button" data-sync-ipam data-ipam-id="${ipam.id}">Sync structure</button>
        <button class="button button--ghost" type="button" data-test-ipam data-ipam-id="${ipam.id}">Test connection</button>
        <button class="button button--danger" type="button" data-remove-ipam data-ipam-id="${ipam.id}">Remove</button>
      </footer>
    </article>
  `;
}

function renderMikrotikCard(device) {
  const interfaces = device.interfaces && device.interfaces.length
    ? device.interfaces
        .map(
          (iface) => `
            <li class="chip chip--${iface.status === 'up' ? 'success' : 'muted'}">
              <strong>${iface.name}</strong>
              <span>${iface.address || 'unassigned'}</span>
            </li>
          `
        )
        .join('')
    : '<li class="chip chip--muted">No interfaces cached.</li>';

  const tunnels = device.tunnels && device.tunnels.length
    ? device.tunnels
        .map(
          (tunnel) => `
            <li class="chip chip--outline">
              <strong>${tunnel.name}</strong>
              <span>${tunnel.tunnel_type} · ${tunnel.status} · ${tunnel.latency_ms ? tunnel.latency_ms.toFixed(1) : '—'} ms</span>
            </li>
          `
        )
        .join('')
    : '<li class="chip chip--muted">No tunnels cached.</li>';

  return `
    <article class="device-card" data-mikrotik-item data-mikrotik-id="${device.id}">
      <header class="device-card__header">
        <div>
          <h3>${device.name}</h3>
          <p class="text-muted">${device.host}</p>
        </div>
        <div class="device-card__statuses">
          ${renderStatusIndicator(device.last_api_status || 'unknown', 'API')}
          ${renderStatusIndicator(device.last_ssh_status || 'unknown', 'SSH')}
        </div>
      </header>
      <dl class="device-card__meta">
        <div><dt>RouterOS</dt><dd>${device.routeros_version || 'unknown'}</dd></div>
        <div><dt>Tunnel type</dt><dd>${device.tunnel_type}</dd></div>
        <div><dt>Encryption key</dt><dd><code>${device.encryption_key || 'n/a'}</code></dd></div>
        <div><dt>Keepalive</dt><dd>${device.tunnel_timeout}s</dd></div>
      </dl>
      <div class="device-card__section">
        <h4>Interfaces</h4>
        <ul class="chip-list">${interfaces}</ul>
      </div>
      <div class="device-card__section">
        <h4>Tunnels</h4>
        <ul class="chip-list">${tunnels}</ul>
      </div>
      <footer class="card-actions">
        <button class="button button--ghost" type="button" data-test-mikrotik data-mikrotik-id="${device.id}">Test API & SSH</button>
        <button class="button button--danger" type="button" data-remove-mikrotik data-mikrotik-id="${device.id}">Remove</button>
      </footer>
    </article>
  `;
}

function renderDnsCard(server) {
  return `
    <article class="dns-card" data-dns-item data-dns-id="${server.id}">
      <header>
        <div>
          <h3>${server.name}</h3>
          <p class="text-muted">${server.ip_address}</p>
        </div>
        <button class="button button--danger" type="button" data-remove-dns data-dns-id="${server.id}">Remove</button>
      </header>
      <dl>
        <div><dt>API endpoint</dt><dd>${server.api_endpoint || '—'}</dd></div>
        <div><dt>PTR zone</dt><dd>${server.ptr_zone || '—'}</dd></div>
      </dl>
    </article>
  `;
}

async function loadIpams() {
  const container = document.querySelector('[data-ipam-list]');
  if (!container) return;
  try {
    const { ipams, collections } = await fetch('/api/ipams').then(toJson);
    if (!ipams.length) {
      container.innerHTML = '<p class="text-muted">No phpIPAM connectors yet. Add one to begin synchronisation.</p>';
      return;
    }
    container.innerHTML = ipams
      .map((ipam) => renderIpamCard(ipam, collections[ipam.id] || { sections: [], datacenters: [], ranges: [] }))
      .join('');
  } catch (error) {
    console.error('Failed to load IPAM integrations', error);
  }
}

async function loadMikrotiks() {
  const container = document.querySelector('[data-mikrotik-list]');
  if (!container) return;
  try {
    const { mikrotiks } = await fetch('/api/mikrotiks').then(toJson);
    if (!mikrotiks.length) {
      container.innerHTML = '<p class="text-muted">No MikroTik devices on record. Add one to monitor connectivity.</p>';
      return;
    }
    container.innerHTML = mikrotiks.map((device) => renderMikrotikCard(device)).join('');
  } catch (error) {
    console.error('Failed to load MikroTik devices', error);
  }
}

async function loadDnsServers() {
  const container = document.querySelector('[data-dns-list]');
  if (!container) return;
  try {
    const { dnsServers } = await fetch('/api/dns').then(toJson);
    if (!dnsServers.length) {
      container.innerHTML = '<p class="text-muted">No DNS authorities registered.</p>';
      return;
    }
    container.innerHTML = dnsServers.map((server) => renderDnsCard(server)).join('');
  } catch (error) {
    console.error('Failed to load DNS servers', error);
  }
}

function handleIpamActions() {
  const container = document.querySelector('[data-ipam-list]');
  if (!container) return;

  container.addEventListener('click', async (event) => {
    const testButton = event.target.closest('[data-test-ipam]');
    const removeButton = event.target.closest('[data-remove-ipam]');
    const syncButton = event.target.closest('[data-sync-ipam]');

    if (syncButton) {
      const id = syncButton.getAttribute('data-ipam-id');
      if (!id) return;
      const original = syncButton.textContent;
      syncButton.disabled = true;
      syncButton.textContent = 'Syncing…';
      try {
        const result = await fetch(`/api/ipams/${id}/sync`, { method: 'POST' }).then(toJson);
        syncButton.textContent = 'Synced ✓';
        await loadIpams();
        if (result && typeof result === 'object') {
          const { sections = 0, datacenters = 0, ranges = 0 } = result;
          console.info(`phpIPAM sync complete: ${sections} sections, ${datacenters} datacenters, ${ranges} ranges.`);
        }
      } catch (error) {
        console.error('Failed to synchronise phpIPAM', error);
        alert(error.message || 'Unable to synchronise phpIPAM.');
        syncButton.textContent = original;
        syncButton.disabled = false;
        return;
      }
      setTimeout(() => {
        syncButton.textContent = original;
        syncButton.disabled = false;
      }, 1600);
      return;
    }

    if (testButton) {
      const id = testButton.getAttribute('data-ipam-id');
      if (!id) return;
      const original = testButton.textContent;
      testButton.disabled = true;
      testButton.textContent = 'Testing…';
      try {
        const result = await fetch(`/api/ipams/${id}/test`, { method: 'POST' }).then(toJson);
        if (result && result.message) {
          testButton.title = result.message;
        }
        testButton.textContent = result.ok === false ? 'Test failed' : 'Connected';
        await loadIpams();
        setTimeout(() => {
          testButton.textContent = original;
          testButton.disabled = false;
          testButton.title = '';
        }, 1500);
      } catch (error) {
        console.error('Failed to test IPAM connection', error);
        alert(error.message || 'Unable to reach the IPAM API. Please verify credentials.');
        testButton.textContent = original;
        testButton.disabled = false;
        testButton.title = '';
      }
      return;
    }

    if (removeButton) {
      const id = removeButton.getAttribute('data-ipam-id');
      if (!id) return;
      if (!confirm('Remove this IPAM integration?')) return;
      try {
        await fetch(`/api/ipams/${id}`, { method: 'DELETE' });
        await loadIpams();
      } catch (error) {
        console.error('Failed to remove IPAM integration', error);
        alert('Could not remove IPAM integration.');
      }
    }
  });
}

function handleMikrotikActions() {
  const container = document.querySelector('[data-mikrotik-list]');
  if (!container) return;

  container.addEventListener('click', async (event) => {
    const testButton = event.target.closest('[data-test-mikrotik]');
    const removeButton = event.target.closest('[data-remove-mikrotik]');

    if (testButton) {
      const id = testButton.getAttribute('data-mikrotik-id');
      if (!id) return;
      const original = testButton.textContent;
      testButton.disabled = true;
      testButton.textContent = 'Testing…';
      try {
        const result = await fetch(`/api/mikrotiks/${id}/test`, { method: 'POST' }).then(toJson);
        testButton.textContent = `${result.api.status === 'connected' ? 'API ✓' : 'API ✗'} / ${
          result.ssh.status === 'connected' ? 'SSH ✓' : 'SSH ✗'
        }`;
        await loadMikrotiks();
        setTimeout(() => {
          testButton.textContent = original;
          testButton.disabled = false;
        }, 1600);
      } catch (error) {
        console.error('Failed to test Mikrotik connectivity', error);
        alert('Unable to reach MikroTik host over API/SSH.');
        testButton.textContent = original;
        testButton.disabled = false;
      }
      return;
    }

    if (removeButton) {
      const id = removeButton.getAttribute('data-mikrotik-id');
      if (!id) return;
      if (!confirm('Remove this MikroTik device?')) return;
      try {
        await fetch(`/api/mikrotiks/${id}`, { method: 'DELETE' });
        await loadMikrotiks();
      } catch (error) {
        console.error('Failed to remove Mikrotik device', error);
        alert('Could not remove MikroTik device.');
      }
    }
  });
}

function handleDnsActions() {
  const container = document.querySelector('[data-dns-list]');
  if (!container) return;

  container.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('[data-remove-dns]');
    if (!removeButton) return;
    const id = removeButton.getAttribute('data-dns-id');
    if (!id) return;
    if (!confirm('Remove this DNS authority?')) return;
    try {
      await fetch(`/api/dns/${id}`, { method: 'DELETE' });
      await loadDnsServers();
    } catch (error) {
      console.error('Failed to remove DNS server', error);
      alert('Could not remove DNS server.');
    }
  });
}

function serialiseForm(form) {
  const formData = new FormData(form);
  const payload = {};
  formData.forEach((value, key) => {
    payload[key] = value.trim();
  });
  return payload;
}

function initIpamForm() {
  const form = document.getElementById('ipam-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = serialiseForm(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      await fetch('/api/ipams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(toJson);
      form.reset();
      await loadIpams();
    } catch (error) {
      console.error('Failed to add IPAM integration', error);
      alert('Unable to add IPAM integration. Check the form and try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add IPAM';
    }
  });
}

function initMikrotikForm() {
  const form = document.getElementById('mikrotik-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = serialiseForm(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      await fetch('/api/mikrotiks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(toJson);
      form.reset();
      await loadMikrotiks();
    } catch (error) {
      console.error('Failed to add MikroTik device', error);
      alert('Unable to add MikroTik device. Check the form and try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add MikroTik';
    }
  });
}

function initDnsForm() {
  const form = document.getElementById('dns-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = serialiseForm(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      await fetch('/api/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(toJson);
      form.reset();
      await loadDnsServers();
    } catch (error) {
      console.error('Failed to add DNS server', error);
      alert('Unable to add DNS server. Check the form and try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add DNS server';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadIpams();
  loadMikrotiks();
  loadDnsServers();
  handleIpamActions();
  handleMikrotikActions();
  handleDnsActions();
  initIpamForm();
  initMikrotikForm();
  initDnsForm();
});
