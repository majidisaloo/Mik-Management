# Mik-Management

Mik-Management delivers a React + Vite control panel backed by a lightweight Node.js API. Operators can register the first
administrator, manage users, roles, Mik-Groups, Mikrotiks, and tunnels, and deploy the stack behind Nginx on Ubuntu without
external database services.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Ubuntu Deployment Quick Start](#ubuntu-deployment-quick-start)
- [Production Deployment on Ubuntu with Nginx](#production-deployment-on-ubuntu-with-nginx)
- [Systemd + Nginx Deployment (example configs)](#systemd--nginx-deployment-example-configs)
- [Updating an Existing Installation](#updating-an-existing-installation)
- [Operational Notes](#operational-notes)

## Project Structure

```
Mik-Management/
├── backend/   # Node.js API with file-backed storage
└── frontend/  # Vite + React single-page application
```

## Prerequisites

- Ubuntu 22.04 or newer (or another Debian-based distribution)
- Node.js 18+ and npm 9+
- `rpm` toolchain (install with `sudo apt update && sudo apt install rpm -y`)
- Nginx for production deployments

### Installing Node.js and npm on Ubuntu

Use NodeSource to install an up-to-date Node.js release with npm:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update
sudo apt install nodejs -y
```

Verify the installation:

```bash
node -v
npm -v
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/majidisaloo/Mik-Management.git
   cd Mik-Management
   ```
2. Install API dependencies (the backend has no external packages, so this completes instantly):
   ```bash
   cd backend
   npm install
   ```
3. Generate the data directory and configuration secrets:
   ```bash
   npm run prepare:db
   ```
4. Start the API (defaults to http://localhost:4000):
   ```bash
   npm run dev
   ```
5. In a new terminal, set up the web client:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
6. Visit http://localhost:5173. The **Login** page is shown first. Use the **Register** link to create the very first
   administrator; the backend automatically disables public registration after this initial account. Further operators are added
   through the Users & Roles workspace once you are signed in.

## Ubuntu Deployment Quick Start

The following commands install prerequisites, clone the project into `/opt/mik-management`, and start both services so the site
is reachable at `http://<server-ip>/`.

```bash
sudo apt update
sudo apt install nginx nodejs npm rpm -y

sudo rm -rf /opt/mik-management
sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management

# Backend setup
cd /opt/mik-management/backend
npm install
npm run prepare:db

# Create systemd service for backend
sudo tee /etc/systemd/system/mik-management-backend.service <<'EOF'
[Unit]
Description=Mik-Management Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mik-management/backend
ExecStart=/usr/bin/node src/server.js
Environment=PORT=3000
Environment=NODE_ENV=production
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start backend service
sudo systemctl daemon-reload
sudo systemctl enable mik-management-backend
sudo systemctl start mik-management-backend

# Frontend setup
cd /opt/mik-management/frontend
npm install
npm run build

# Nginx configuration
sudo tee /etc/nginx/sites-available/mik-management <<'NGINX'
server {
    listen 80;
    server_name _;

    root /opt/mik-management/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/mik-management
sudo nginx -t && sudo systemctl reload nginx

# Verify services
sudo systemctl status mik-management-backend
sudo systemctl status nginx
curl http://localhost/api/users
```

## Production Deployment on Ubuntu with Nginx

1. Install dependencies if they are not already present:
   ```bash
   sudo apt update
   sudo apt install nginx nodejs npm rpm git -y
   ```
2. Clone or pull the latest code into `/opt/mik-management`:
   ```bash
   sudo mkdir -p /opt/mik-management
   sudo chown "$USER":"$USER" /opt/mik-management
   cd /opt/mik-management
   git pull --ff-only || git clone https://github.com/majidisaloo/Mik-Management.git .
   ```
3. Prepare the backend:
   ```bash
   cd backend
   npm install
   npm run prepare:db
   pm2 start src/server.js --name mik-api --update-env
   pm2 save
   ```
4. Build the frontend:
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```
5. Point Nginx at the compiled frontend and proxy `/api/` to the backend as shown in the quick-start section. Reload Nginx after
   any change:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
6. Browse to `http://<server-ip>/` and sign in. Use the sidebar toggle to expand or collapse navigation. Management links (Users
   & Roles, Mik-Groups, Mikrotiks, Tunnels, and Settings) appear only when the signed-in role grants the associated permission.

## Updating an Existing Installation

From `/opt/mik-management` on the server (systemd-managed backend):

```bash
# Stop services
sudo systemctl stop nginx
sudo systemctl stop mik-management-backend

# Update code
cd /opt/mik-management
sudo git pull --ff-only

# Fix ownership issues
sudo chown -R root:root /opt/mik-management
git config --global --add safe.directory /opt/mik-management
sudo chown -R www-data:www-data /opt/mik-management

# Backend update
cd backend
npm install
npm run prepare:db

# Frontend update
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl start mik-management-backend
sudo systemctl start nginx

# Verify services
sudo systemctl status mik-management-backend --no-pager
sudo systemctl status nginx --no-pager
curl http://localhost/api/users
```

## Troubleshooting

### Users not loading in frontend
If users are not displayed in the Users & Roles page:

1. **Check backend logs:**
   ```bash
   sudo journalctl -u mik-management-backend -f
   ```

2. **Test API directly:**
   ```bash
   curl http://localhost/api/users
   curl http://localhost/api/roles
   ```

3. **Check frontend logs:**
   ```bash
   sudo journalctl -u mik-management-frontend -f
   ```

4. **Verify database:**
   ```bash
   ls -la /opt/mik-management/backend/data/
   ```

### Port conflicts
If you get port conflicts:

1. **Check what's using the port:**
   ```bash
   sudo netstat -tlnp | grep :3000
   sudo netstat -tlnp | grep :5173
   ```

2. **Kill conflicting processes:**
   ```bash
   sudo pkill -f "node.*server.js"
   sudo pkill -f "vite"
   ```

3. **Restart services:**
   ```bash
   sudo systemctl restart mik-management-backend
   sudo systemctl restart mik-management-frontend
   ```

## Systemd + Nginx Deployment (example configs)

This repo includes example configs to run the backend as a systemd service and proxy `/api` via Nginx.

### Backend service (systemd)

1) Copy the unit and adjust paths if needed:

```bash
sudo cp deploy/mik-management-backend.service /etc/systemd/system/mik-management-backend.service
```

2) Reload, enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mik-management-backend
sudo systemctl status mik-management-backend --no-pager
```

3) Health checks (local):

```bash
curl -sS -i http://127.0.0.1:4000/api/meta
curl -sS -i http://127.0.0.1:4000/api/groups
curl -sS -i http://127.0.0.1:4000/api/users
```

### Nginx

1) Copy the example config and set your domain and frontend build path:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/mik-management
sudo ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/mik-management
sudo nginx -t && sudo systemctl reload nginx
```

2) Verify reverse proxy:

```bash
curl -sS -i http://YOUR_DOMAIN/api/meta
```

### Frontend build

```bash
cd frontend
npm ci
npm run build
```

If the Dashboard shows “Metrics service is unavailable (502)”, confirm:
- Backend is listening on port 4000
- Nginx `location /api/` proxies to `http://127.0.0.1:4000/api/`
- You are authenticated (cookies forwarded)

### Handling `npm audit fix --force`

Some environments block outbound IPv6 traffic to the npm registry, which causes `npm audit fix --force` to fail with an
`ENETUNREACH` error. When this happens, run the command with auditing disabled:

```bash
NPM_CONFIG_AUDIT=false npm audit fix --force || echo "Audit skipped (registry unreachable)"
```

This still applies security patches when the registry is reachable while preventing the update process from aborting when the
network is offline.

## Operational Notes

- **Persistent data** – `backend/data/app.db` stores all users, roles, groups, Mikrotiks, and tunnels. The `npm run prepare:db`
  script creates the file if it does not exist and preserves existing content. Back up this directory before redeployments.
- **Configuration secrets** – Generated salts and peppers live in `backend/config/runtime.json`. Keep this file private and
  include it in backups so password hashes remain valid after redeployments.
- **Registration guard** – Public registration is available only until the first user is created. Administrators add additional
  operators from the Users & Roles workspace.
- **Version badge** – The frontend footer displays the running build as `Version 0.<commit-count>` based on `/api/meta`. This
  helps confirm which commit is deployed.
- **Merge guidance** – See `MERGE_RESOLUTION_NOTES.md` for tips on accepting incoming or combined changes when syncing with the
  upstream repository.

