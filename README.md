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
- [Mikrotiks Workspace](#mikrotiks-workspace)
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
   condenses to a logout button and the primary navigation shifts to the left sidebar. The dashboard now highlights your roles,
   effective permissions, and provides a profile form to adjust your first name, last name, or email address at any time.
   - Click the moon icon in the header to enable the new dark mode theme for low-light environments. Click the sun icon to return
     to the bright daytime palette. Your choice is remembered locally for future visits.

### Dashboard Overview

- **Sidebar navigation** – The vertical menu on the left now groups links by focus, placing the Dashboard first and the Users, Roles, Mik-Groups, and Mikrotiks workspaces under a dedicated management heading. Each link only appears when your assigned roles grant the required permission, and the theme toggle sits at the bottom of the menu so you can switch between day and night palettes at any time.
- **Access summary** – Review the roles attached to your account and the resulting Dashboard, Users, Roles, Mik-Groups, and Mikrotiks capabilities in the highlighted chips.
- **Profile form** – Update your first name, last name, or email address and submit to persist the changes to the secure data file instantly.
- **Session controls** – Use the header Logout button to clear the session and return to the Login screen.

### Users Workspace

- **Directory table** – The Users screen lists every operator, highlighting the currently selected row and showing each person’s roles.
- **Select and edit** – Choose an operator from the dropdown to load their details into the form, adjust contact information, optionally set a new password, and assign or remove roles before saving.
- **Role insights** – Each role badge summarises the Dashboard, Users, Roles, Mik-Groups, and Mikrotiks permissions it grants so you can confirm coverage at a glance.
- **Permission aware** – Only operators with the Users permission can access this page. Attempts to reach the screen without the permission redirect back to the Dashboard.

### Roles Workspace

- **Role library** – Review every role, rename them inline, and toggle Dashboard, Users, Roles, Mik-Groups, and Mikrotiks permissions before saving.
- **Create and delete** – Add new roles tailored to teams such as sales or support. Roles that are still assigned to users cannot be deleted until those users are reassigned, preventing accidental loss of access.
- **Guided feedback** – Success and error alerts surface immediately so you know when actions complete or require additional steps.

### Mik-Groups Workspace

- **Hierarchy explorer** – Visualise the entire organisation tree in the left column. Selecting a Mik-Group highlights it in the hierarchy and loads its details for editing.
- **Parent assignments** – Update a group’s name or parent with confidence. The interface prevents cycles, keeps the root Mik-Group anchored at the top level, and lets you create new nested groups in a couple of clicks.
- **Safe clean-up** – Delete buttons stay disabled for the root group and for branches that still own child groups, ensuring you never orphan part of the hierarchy by accident.

### Mikrotiks Workspace

- **Device directory** – Browse every RouterOS endpoint in the environment from the selector on the left. Each entry highlights its display name, host, assigned Mik-Group, active tags, and the most recent update time.
- **RouterOS API controls** – Toggle API availability, enable TLS, enforce certificate validation, and opt into legacy cipher support directly from the edit form. Ports, timeouts, retries, usernames, and passwords all live in one pane so you can adjust connection details without digging through configuration files.
- **Group-aware organisation** – Assign each Mikrotik to any Mik-Group you have defined. The dropdown stays in sync with the hierarchy so network sites, POPs, and customer segments remain tidy.
- **Notes and tagging** – Capture free-form notes about rack locations or maintenance windows and add comma-separated tags for filtering future inventory views.
- **Streamlined provisioning** – Use the Add Mikrotik card to register new routers in seconds. New devices immediately appear in the selector and inherit the RouterOS defaults you configured during creation.

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
   > **Tip:** If the npm registry blocks `npm audit fix --force`, rerun it later or skip the command—the backend has no external
   > dependencies so the audit normally reports zero issues.
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

`GET /api/users/:id`

- **Success**: `200 OK` with `{ user }`
- **Errors**:
  - `400`: Invalid ID parameter
  - `404`: User not found
  - `500`: Unable to load the requested user

`PUT /api/users/:id`

- **Body**: `{ firstName, lastName, email }`
- **Success**: `200 OK`
- **Errors**:
  - `400`: Missing or invalid fields
  - `404`: User not found
  - `409`: Email already used by another account
  - `500`: Unable to update the user

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

`GET /api/config-info`

- **Success**: `200 OK` with `{ database: { driver, file, configFile } }`
- **Notes**: Provides operators with the resolved database location without exposing the secret `databasePassword`.

## License

This project is distributed for demonstration purposes and does not yet include an explicit license.
