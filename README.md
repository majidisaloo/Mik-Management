# Mik-Management

A full-stack registration experience built with React, Vite, and a lightweight Node.js API that stores data in a secure file-backed database. The project ships with a modern onboarding guide, a secure API, and a polished user interface.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Users Workspace](#users-workspace)
- [Roles Workspace](#roles-workspace)
- [Mik-Groups Workspace](#mik-groups-workspace)
- [Mikrotik's Workspace](#mikrotiks-workspace)
- [Tunnels Workspace](#tunnels-workspace)
- [Settings Workspace](#settings-workspace)
- [Ubuntu Deployment Quick Start](#ubuntu-deployment-quick-start)
- [Production Deployment on Ubuntu with Nginx](#production-deployment-on-ubuntu-with-nginx)
- [Updating an Existing Installation](#updating-an-existing-installation)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Troubleshooting](#troubleshooting)
- [Useful npm Scripts](#useful-npm-scripts)
- [Quick Git Reference](#quick-git-reference)
- [API Overview](#api-overview)
- [License](#license)

## Project Structure

```
Mik-Management/
├── backend/   # Node.js API with file-backed storage
└── frontend/  # Vite + React single-page application
```

## Prerequisites

- Ubuntu 22.04 or newer (or another Debian-based distribution)
- Node.js 18 or newer
- npm 9 or newer
- rpm toolchain (installable with `sudo apt update && sudo apt install rpm -y`)

### Installing Node.js and npm on Ubuntu

Use the NodeSource repositories to install an up-to-date Node.js release together with npm:

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

The commands should report Node.js 20.x (or newer) and npm 10.x (or newer).

## Getting Started

1. Prepare the installation directory on Ubuntu:
   ```bash
   sudo rm -rf /opt/mik-management
   sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management
   cd /opt/mik-management
   ```
2. Clone the repository (non-root environments):
   ```bash
   git clone https://github.com/majidisaloo/Mik-Management.git
   cd mik-management
   ```
3. Install dependencies for the API (there are no external packages, so this completes instantly):
   ```bash
   cd backend
   npm install
   ```
4. Generate the database file and configuration secrets (runs once per server):
   ```bash
   npm run prepare:db
   ```
5. Run the API server (http://localhost:4000):
   ```bash
   npm run dev
   ```
6. In a separate terminal, install the web client dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
7. Launch the development server (http://localhost:5173):
   ```bash
   npm run dev
   ```
8. Visit the site at http://localhost:5173. The **Login** screen loads first—use the **Register** link in the header to create an
   account, sign in with the credentials you just added, and you will land on the **Dashboard**. After authentication the header
   condenses to a polished logout pill while the primary navigation shifts to the left sidebar. You will see entries for
   **Dashboard**, **Users & Roles**, **Mik-Groups**, **Mikrotik's**, **Tunnels**, and the new **Settings** workspace (each only
   appears if your role grants access). The footer now shows the running build as `Version 0.<commit-count>` so you can confirm
   which commit is deployed at a glance.
   - Use the theme slider at the bottom of the sidebar to swap between the bright daytime palette (moon icon) and the darker
     night mode (sun icon). Your choice is remembered locally for future visits.

### Dashboard Overview

- **Sidebar navigation** – The vertical menu on the left now groups links by focus, placing the Dashboard first and the Users & Roles, Mik-Groups, Mikrotik's, Tunnels, and Settings workspaces under a dedicated management heading. Each link only appears when your assigned roles grant the required permission, the icons mirror their purpose, and the collapse toggle lets you shrink the menu to an icon-only rail when you need more canvas space.
- **Fleet metrics** – Three Mikrotik cards summarise how many devices are connected, how many already run the target RouterOS release, and how many remain pending or unknown so operators can prioritise upgrades.
- **Tunnel status** – Companion cards track the total number of tunnels alongside the up, down, and maintenance counts so you immediately know where to focus.
- **Health leaderboards** – Latency and packet-loss panels sort tunnels from most to least impacted, showing their status chips and live measurements so you can attack the highest pings and worst packet loss first.
- **Access summary** – Your name, email address, and granted permissions appear beneath the metrics so you can confirm exactly which Dashboard, Users & Roles, Mik-Groups, Mikrotik's, Tunnels, and Settings capabilities are active on your account.
- **Release indicator** – The footer displays the running build as `Version 0.<commit-count>` so you can confirm which commit is live on every environment.
- **Session controls** – Use the red logout pill in the header to clear the session and return to the Login screen.

### Users Workspace

- **Tabbed management** – Users and Roles now share one workspace. Switch tabs to flip between the user directory and the role catalogue without losing context.
- **Global filters** – Type in the toolbar search to filter users by name, email, or role membership (or to filter roles by name and granted permissions when the Roles tab is active).
- **Modal driven edits** – Add, edit, or remove users from inline dialogs. Password resets, role assignments, and personal details live side by side, and the created-at timestamp stays visible for every account.
- **Permission insights** – Coloured pills list the Dashboard, Users & Roles, Mik-Groups, Mikrotik's, Tunnels, and Settings capabilities a user inherits so you can audit access at a glance.
- **Permission aware** – Only operators with the Users permission can access the Users tab. Attempts to reach the screen without the permission redirect back to the Dashboard.

### Roles Workspace

- **Inline editing** – Rename roles, toggle Dashboard, Users & Roles, Mik-Groups, Mikrotik's, Tunnels, and Settings permissions, and update descriptions from the dedicated Roles tab.
- **Create and delete** – Add new permission sets for teams such as sales or support. Roles that are still assigned to users cannot be deleted until those users are reassigned, preventing accidental loss of access.
- **Guided feedback** – Success and error alerts surface immediately so you know when actions complete or require additional steps.
- **Permission aware** – Only operators with the Roles permission see this tab. Others are redirected to the Dashboard.

### Mik-Groups Workspace

- **Hierarchy explorer** – Visualise the entire organisation tree in the left column. Selecting a Mik-Group highlights it in the hierarchy and loads its details for editing.
- **Parent assignments** – Update a group’s name or parent with confidence. The interface prevents cycles, keeps the root Mik-Group anchored at the top level, and lets you create new nested groups in a couple of clicks.
- **Safe clean-up** – Delete buttons stay disabled for the root group and for branches that still own child groups, ensuring you never orphan part of the hierarchy by accident.

### Mikrotik's Workspace

- **Device directory** – Browse every RouterOS endpoint in the environment from the consolidated list. Each entry highlights its display name, host, assigned Mik-Group, update-status chip, and the created-at timestamp so you know when it joined the fleet.
- **Dynamic filtering** – Search by name, host, Mik-Group, status, or tag from the toolbar to zero in on the exact device you need to manage.
- **RouterOS API controls** – Toggle API availability, enable TLS, enforce certificate validation, and opt into legacy cipher support directly from the edit form. Ports, timeouts, retries, usernames, and passwords all live in one pane so you can adjust connection details without digging through configuration files.
- **Group-aware organisation** – Assign each Mikrotik to any Mik-Group you have defined. The dropdown stays in sync with the hierarchy so network sites, POPs, and customer segments remain tidy.
- **Notes and tagging** – Capture free-form notes about rack locations or maintenance windows and add comma-separated tags for filtering future inventory views.
- **Streamlined provisioning** – Use the Add Mikrotik card to register new routers in seconds. New devices immediately appear in the selector and inherit the RouterOS defaults you configured during creation.

### Tunnels Workspace

- **Topology directory** – Review every inter-site tunnel together with its status chip, parent Mik-Group, source and target MikroTik names, and the most recent health metrics.
- **Powerful filtering** – Search by tunnel name, Mik-Group, endpoint name, or tag to isolate the exact links you need to investigate.
- **Rich tunnel editor** – Configure connection types (GRE, IPsec, and more), enable or disable RouterOS API usage, add operational notes, and maintain latency/packet-loss samples for future analysis.
- **Lifecycle controls** – Create, update, or delete tunnels from focused modals. Status toggles let you mark links as up, down, or in maintenance while keeping retry counts and timeouts aligned with your standards.
- **Permission aware** – Only operators with the Tunnels permission can access the workspace. Everyone else is redirected to the Dashboard.

### Settings Workspace

- **Future-ready staging** – The Settings screen is now scaffolded and permission protected so administrators know where global preferences, integrations, and automation controls will live. Current builds show a guided placeholder while the configuration tools are prepared.
- **Permission gated** – Only operators with the Settings permission see this workspace in the sidebar, keeping upcoming controls limited to trusted administrators.

## Ubuntu Deployment Quick Start

The following commands install all prerequisites, clone the project into `/opt/mik-management`, and launch both services so you can reach the site at `http://<server-ip>/`.

```bash
sudo apt update
sudo apt install nginx nodejs npm rpm -y

sudo rm -rf /opt/mik-management
sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management

cd /opt/mik-management/backend
npm install
npm run prepare:db
npm install -g pm2
pm2 start src/server.js --name mik-api
pm2 save

cd /opt/mik-management/frontend
npm install
npm run build

sudo tee /etc/nginx/sites-available/mik-management <<'EOF'
server {
    listen 80;
    server_name _;

    root /opt/mik-management/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/mik-management
sudo nginx -t
sudo systemctl restart nginx
```

The first `pm2 start` run will create `backend/config/database.config.json` with the database location and a randomly generated `databasePassword`. Keep this file on the server—deleting it will prevent future logins because the same secret is required to verify stored password hashes.

Open a browser and navigate to `http://<server-ip>/` to confirm that the React application loads and proxies API requests correctly.

## Production Deployment on Ubuntu with Nginx

Follow these steps to deploy the application so it is accessible from the server IP without a port number:

1. **Install system dependencies**
   ```bash
   sudo apt update
   sudo apt install nginx nodejs npm -y
   sudo apt install rpm -y
   ```
2. **Clone the project to `/opt/mik-management`** (if not already done):
   ```bash
   sudo rm -rf /opt/mik-management
   sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management
   ```
3. **Install backend dependencies and prepare the API**
   ```bash
   cd /opt/mik-management/backend
   npm install
   npm run prepare:db
   ```
   Start the API with a process manager (for example, PM2) or a systemd service listening on port 4000:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name mik-api
   pm2 save
   ```
   The `npm run prepare:db` command creates the data file at `backend/data/app.db` (stored as JSON) and ensures `backend/config/database.config.json` keeps the random `databasePassword`. Back up this JSON file and never commit it to Git—it is required to validate user passwords.
4. **Build the frontend for production**
   ```bash
   cd /opt/mik-management/frontend
   npm install
   npm run build
   ```
   The static assets will be generated in `/opt/mik-management/frontend/dist`.
5. **Configure Nginx to serve the frontend at the root domain and proxy API requests**
   ```bash
   sudo tee /etc/nginx/sites-available/mik-management <<'EOF'
   server {
       listen 80;
       server_name _;

       root /opt/mik-management/frontend/dist;
       index index.html;

       location /api/ {
           proxy_pass http://127.0.0.1:4000/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection keep-alive;
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location / {
           try_files $uri /index.html;
       }
   }
   EOF
   sudo ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/mik-management
   sudo nginx -t
   sudo systemctl restart nginx
   ```
6. **Visit the application** at `http://<server-ip>/`. The React build will load without a port number, and `/api` requests will be proxied to the Node.js backend.

## Updating an Existing Installation

Keep your deployment in sync with GitHub using the following workflow:

1. Navigate to the project directory:
   ```bash
   cd /opt/mik-management
   ```
   > **Important:** Preserve `/opt/mik-management/backend/config/database.config.json`. It contains the random `databasePassword` that peppers user hashes; losing it will invalidate all stored credentials.
2. Pull the latest changes and update subdirectories:
   ```bash
   sudo git fetch origin
   sudo git reset --hard origin/main
   ```
   If you maintain local commits, replace the reset with `git pull --rebase` and resolve any conflicts using the guidance in
   `MERGE_RESOLUTION_NOTES.md`.
3. Refresh the backend dependencies, run the audit fix, and make sure the database stays in sync:
   ```bash
   cd backend
   npm install
   npm audit fix --force
   npm run prepare:db
   pm2 restart mik-api
   ```
  > **Tip:** If `npm audit fix --force` fails with `connect ENETUNREACH …`, the server cannot reach the npm registry. Confirm outbound access or temporarily run `npm config set audit false --location=project`, finish the build, and clear the override with `npm config delete audit --location=project` once connectivity is restored. The backend has no third-party dependencies, so skipping the audit during an outage is safe.
   >
  > `npm run prepare:db` is safe to run on every update. It backs up any legacy SQLite file, recreates missing folders, refreshes Mik-Groups and Mikrotik records, and verifies the JSON data store is ready before the API restarts.
4. Update the frontend dependencies and publish a fresh production build:
   ```bash
   cd ../frontend
   npm install
   npm audit fix --force
   npm run build
   ```
5. Reload Nginx if its configuration changed:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

After these steps, refresh the browser and confirm the Login page accepts your new credentials.

## Environment Variables

The default configuration works without custom variables. For production deployments you can override the port with `PORT=5000 npm run dev` in the backend.

## Database

- Storage engine: File-backed JSON database managed entirely by Node.js
- Config file: `backend/config/database.config.json`
  - Generated automatically on the first backend launch.
  - Contains the relative `databasePath` (defaults to `./data/app.db`) and a random `databasePassword` used as a server-side pepper for hashing credentials.
  - Treat it like a secret—do not commit it to Git and back it up before redeploying or reinstalling the server.
- Database file: `backend/data/app.db`
  - Created by `npm run prepare:db` or automatically when the server first accepts a request.
  - Stores JSON data for operators and works without installing external database servers.
  - Immediately after running `npm run prepare:db` the file contains an empty structure (`{"lastUserId":0,"users":[]}`). After
    registering accounts, rerun `cat backend/data/app.db` (or `jq . backend/data/app.db`) to confirm the records are written.
- The API exposes `GET /api/config-info` for administrators to verify the resolved database path and config file location without revealing the secret pepper.
- Passwords are hashed with PBKDF2 after being combined with the pepper so credentials remain secure even if the data file is copied.

## Troubleshooting

- **Backend logs previously showed `Unable to parse the database`**
  - Deployments upgraded from the SQLite era now migrate automatically.
  - When the backend encounters the legacy binary file it renames it to `backend/data/app.db.legacy-<timestamp>` and generates a
    new JSON data store.
  - Review the backup if you need historical records, then confirm registrations succeed with the fresh database.
- **Browser message "The string did not match the expected pattern" on registration**
  - Reload the page with a hard refresh to ensure the latest frontend bundle is loaded.
  - Confirm that both password fields are filled, match exactly, and contain at least eight characters.
  - Ensure the email address follows the format `name@example.com`.
  - If the warning persists, rebuild and redeploy the frontend (`npm run build`) so browsers receive the updated form validation and backend validation rules.
- **In-app banner shows "Registration failed."**
  - Visit `journalctl -u mik-api` (or check the terminal) for backend logs—validation errors such as duplicate emails or short passwords will be reported with a specific message that is also surfaced in the UI.
  - Confirm the API is running (`curl http://127.0.0.1:4000/health` should return `{"status":"ok"}`).
  - Verify the backend data folder exists (`ls backend/data`) so the server can persist new users. It is created automatically on first launch, but missing directories will prevent registrations.
  - If the folder is missing, run `npm run prepare:db` from the `backend` directory to recreate the data file before retrying.
- **Browser shows `502 Bad Gateway` from Nginx during registration or login**
  - Ensure the API service is running: `pm2 status mik-api` (or restart with `pm2 restart mik-api`). A stopped upstream will force Nginx to return 502.
  - Validate the backend responds locally: `curl http://127.0.0.1:4000/health` should produce `{"status":"ok"}`. If it fails, inspect `/opt/mik-management/backend` logs with `pm2 logs mik-api`.
  - Confirm `backend/config/database.config.json` exists and still contains the original `databasePassword`. Recreating or deleting this file prevents logins because stored hashes depend on the original secret.
  - Run `npm run prepare:db` inside `/opt/mik-management/backend` to recreate missing folders or the data file before restarting the API.
  - Confirm the proxy block includes `/api/` (see the sample Nginx config above) and reload Nginx after edits: `sudo systemctl reload nginx`.
  - The interface now reports "API is unavailable (502 Bad Gateway)" when this happens, so you can immediately tell the upstream server needs attention.
- **API returns `{ "message": "Not found." }` during registration or login**
  - Confirm Nginx (or any upstream proxy) forwards `/api/register` and `/api/login` to the backend. Both `/api/...` and `/...` paths are now accepted, so the sample configs that map `/api/` to `http://127.0.0.1:4000/api/` and those that strip the prefix (for example, `proxy_pass http://127.0.0.1:4000/;`) will work.
  - Reload the proxy after configuration changes: `sudo systemctl reload nginx`.
  - If the backend was restarted manually, re-run `npm run prepare:db` to ensure the data directory exists before starting the service. The command preserves existing records and only creates missing folders or configuration files.
  - Double-check that `pm2 status mik-api` reports the process as `online`. A crashed process will cause the proxy to serve a stale 404 response.

## Useful npm Scripts

| Location | Script | Description |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API server in watch mode for development. |
| `backend` | `npm start` | Launch the API server once (useful for PM2/systemd). |
| `backend` | `npm run prepare:db` | Generate or repair the data file and config secrets. |
| `frontend` | `npm run dev` | Start the Vite development server. |
| `frontend` | `npm run build` | Build the production assets. |
| `frontend` | `npm run preview` | Preview the production build locally. |

## Quick Git Reference

- Check your working tree: `git status`
- Create a feature branch: `git checkout -b feature/your-feature`
- Stage files: `git add .`
- Commit changes: `git commit -m "Describe your change"`
- Push to origin: `git push origin feature/your-feature`

## API Overview

`POST /api/register`

- **Body**: `{ firstName, lastName, email, password, passwordConfirmation? }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing names or email, invalid email format, password under eight characters, or mismatched passwords
  - `409`: Email already registered
  - `500`: Unexpected server error

`POST /api/login`

- **Body**: `{ email, password }`
- **Success**: `200 OK`
- **Errors**:
  - `400`: Missing credentials
  - `401`: Invalid email or password
  - `500`: Unexpected server error

`GET /api/meta`

- **Success**: `200 OK` with `{ version, registrationOpen, userCount }`
- **Notes**: Surfaces the running build as `0.<commit-count>`, indicates whether self-registration is still open, and exposes the current user count so operators can plan onboarding.

`GET /api/dashboard/metrics`

- **Success**: `200 OK` with `{ mikrotik: { total, updated, pending, unknown }, tunnels: { total, up, down, maintenance, latencyLeaderboard, packetLossLeaderboard } }`
- **Errors**:
  - `500`: Unable to calculate dashboard metrics

`GET /api/users`

- **Success**: `200 OK` with `{ users }`
- **Notes**: Each user includes `roles`, `permissions`, and `createdAt` fields so the UI can render badges and audit metadata.

`POST /api/users`

- **Body**: `{ firstName, lastName, email, password, passwordConfirmation?, roleIds? }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing names, invalid email, short passwords, or mismatched password confirmation
  - `409`: Email already registered
  - `500`: Unable to create the user

`GET /api/users/:id`

- **Success**: `200 OK` with `{ user }`
- **Errors**:
  - `400`: Invalid ID parameter
  - `404`: User not found
  - `500`: Unable to load the requested user

`PUT /api/users/:id`

- **Body**: `{ firstName, lastName, email, password?, roleIds? }`
- **Success**: `200 OK`
- **Errors**:
  - `400`: Missing or invalid fields
  - `404`: User not found
  - `409`: Email already used by another account
  - `500`: Unable to update the user

`DELETE /api/users/:id`

- **Success**: `204 No Content`
- **Errors**:
  - `400`: Invalid ID parameter
  - `404`: User not found
  - `500`: Unable to delete the user

`GET /api/roles`

- **Success**: `200 OK` with `{ roles }`
- **Notes**: Each role includes its permission map so the UI can populate toggles.

`POST /api/roles`

- **Body**: `{ name, permissions }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing name or invalid permissions map
  - `409`: Role name already in use
  - `500`: Unable to create the role

`PUT /api/roles/:id`

- **Body**: `{ name, permissions }`
- **Success**: `200 OK`
- **Errors**:
  - `400`: Missing name or invalid permissions map
  - `404`: Role not found
  - `409`: Another role already uses the provided name
  - `500`: Unable to update the role

`DELETE /api/roles/:id`

- **Success**: `204 No Content`
- **Errors**:
  - `400`: Invalid role id
  - `404`: Role not found
  - `409`: Role is still assigned to one or more users
  - `500`: Unable to delete the role

`GET /api/groups`

- **Success**: `200 OK` with `{ groups, tree }`
- **Notes**: Returns both a flat list of all Mik-Groups and a nested tree that reflects parent-child relationships.

`POST /api/groups`

- **Body**: `{ name, parentId? }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing name or invalid parent reference
  - `409`: A group with the same name already exists
  - `500`: Unable to create the group

`PUT /api/groups/:id`

- **Body**: `{ name, parentId? }`
- **Success**: `200 OK`
- **Errors**:
  - `400`: Missing name, invalid parent reference, or attempt to nest the root group
  - `404`: Group not found
  - `409`: Another group already uses the provided name
  - `500`: Unable to update the group

`DELETE /api/groups/:id`

- **Success**: `204 No Content`
- **Errors**:
  - `400`: Attempt to delete the protected root group
  - `404`: Group not found
  - `409`: Group still has child groups; reassign them first
  - `500`: Unable to delete the group

`GET /api/mikrotiks`

- **Success**: `200 OK` with `{ mikrotiks, groups }`
- **Notes**: Returns every Mikrotik device alongside the available Mik-Groups so the UI can render selectors without extra round trips.

`POST /api/mikrotiks`

- **Body**: `{ name, host, groupId?, tags?, notes?, routeros? }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing display name or host, or an invalid group reference
  - `500`: Unable to create the device

`PUT /api/mikrotiks/:id`

- **Body**: Any subset of `{ name, host, groupId, tags, notes, routeros }`
- **Success**: `200 OK` with the updated device
- **Errors**:
  - `400`: Name or host cleared, or group reference does not exist
  - `404`: Device not found
  - `500`: Unable to update the device

`DELETE /api/mikrotiks/:id`

- **Success**: `204 No Content`
- **Errors**:
  - `400`: Invalid identifier
  - `404`: Device not found
  - `500`: Unable to delete the device

`GET /api/tunnels`

- **Success**: `200 OK` with `{ tunnels, groups, mikrotiks }`
- **Notes**: Returns all tunnels with resolved Mik-Group, source, and target names plus the available dropdown options.

`POST /api/tunnels`

- **Body**: `{ name, sourceId, targetId, groupId?, connectionType?, status?, enabled?, tags?, notes?, latencyMs?, packetLoss?, lastCheckedAt? }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing name, source, or target; invalid status; or non-existent references
  - `500`: Unable to create the tunnel

`PUT /api/tunnels/:id`

- **Body**: Any subset of `{ name, sourceId, targetId, groupId, connectionType, status, enabled, tags, notes, latencyMs, packetLoss, lastCheckedAt }`
- **Success**: `200 OK` with the updated tunnel
- **Errors**:
  - `400`: Invalid payload or references
  - `404`: Tunnel not found
  - `500`: Unable to update the tunnel

`DELETE /api/tunnels/:id`

- **Success**: `204 No Content`
- **Errors**:
  - `400`: Invalid identifier
  - `404`: Tunnel not found
  - `500`: Unable to delete the tunnel

`GET /api/config-info`

- **Success**: `200 OK` with `{ database: { driver, file, configFile } }`
- **Notes**: Provides operators with the resolved database location without exposing the secret `databasePassword`.

## License

This project is distributed for demonstration purposes and does not yet include an explicit license.
