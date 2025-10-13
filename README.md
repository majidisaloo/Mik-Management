# Mik-Management

A full-stack registration experience built with React, Vite, and a lightweight Node.js API that stores data in a secure file-backed database. The project ships with a modern onboarding guide, a secure API, and a polished user interface.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Ubuntu Deployment Quick Start](#ubuntu-deployment-quick-start)
- [Production Deployment on Ubuntu with Nginx](#production-deployment-on-ubuntu-with-nginx)
- [Updating an Existing Installation](#updating-an-existing-installation)

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
   account, sign in with the credentials you just added, and you will land on the management dashboard. Navigation, theming, and
   feature access adapt automatically to the roles assigned to your account.

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

