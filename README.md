# Mik-Management

A full-stack registration experience built with React, Vite, Express, and SQLite. The project ships with a modern onboarding guide, a secure API, and a polished user interface.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
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
├── backend/   # Express + SQLite API
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
3. Install dependencies for the API:
   ```bash
   cd backend
   npm install
   ```
4. Run the API server (http://localhost:4000):
   ```bash
   npm run dev
   ```
5. In a separate terminal, install the web client dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
6. Launch the development server (http://localhost:5173):
   ```bash
   npm run dev
   ```
7. Visit the site at http://localhost:5173. The **Login** screen loads first—use the **Register** link in the header to create an
   account, sign in with the credentials you just added, and you will land on the **Dashboard**. The dashboard presents a Users
   table with your operator record and a form to update your first name, last name, or email address at any time.

### Dashboard Overview

- **Users card** – Lists the signed-in operator with the ID, email, and creation timestamp for quick verification.
- **Profile form** – Update the first name, last name, or email address and submit to persist the changes in SQLite instantly.
- **Session controls** – Use the header Logout button to clear the session and return to the Login screen.

## Ubuntu Deployment Quick Start

The following commands install all prerequisites, clone the project into `/opt/mik-management`, and launch both services so you can reach the site at `http://<server-ip>/`.

```bash
sudo apt update
sudo apt install nginx nodejs npm rpm -y

sudo rm -rf /opt/mik-management
sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management

cd /opt/mik-management/backend
npm install
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
   ```
   Start the API with a process manager (for example, PM2) or a systemd service listening on port 4000:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name mik-api
   pm2 save
   ```
   The first launch writes `backend/config/database.config.json` with the SQLite path and a random `databasePassword`. Back up this file and never commit it to Git—it is required to validate user passwords.
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
6. **Visit the application** at `http://<server-ip>/`. The React build will load without a port number, and `/api` requests will be proxied to the Express backend.

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
3. Reinstall dependencies when package manifests change and immediately address npm audit findings so installs succeed cleanly:
   ```bash
   cd backend && npm install
   npm audit fix --force
   cd ../frontend && npm install
   npm audit fix --force
   ```
4. Rebuild the frontend and restart the API:
   ```bash
   npm run build
   pm2 restart mik-api
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

- Storage engine: SQLite (file-based)
- Config file: `backend/config/database.config.json`
  - Generated automatically on the first backend launch.
  - Contains the relative `databasePath` (defaults to `./data/app.db`) and a random `databasePassword` used as a server-side pepper for hashing credentials.
  - Treat it like a secret—do not commit it to Git and back it up before redeploying or reinstalling the server.
- The API exposes `GET /api/config-info` for administrators to verify the resolved database path and config file location without revealing the secret pepper.
- Passwords are hashed with `bcryptjs` after being combined with the pepper so credentials remain secure even if the SQLite file is copied.

## Troubleshooting

- **`npm ERR! notarget No matching version found for sqlite@^5.1.6.`**
  - Pull the latest repository changes: `git pull`.
  - If the error persists, update the dependency manually: `cd backend && npm install sqlite@^5.2.4`.
  - Retry `npm install` to ensure all packages resolve correctly.
- **Browser message "The string did not match the expected pattern" on registration**
  - Reload the page with a hard refresh to ensure the latest frontend bundle is loaded.
  - Confirm that both password fields are filled, match exactly, and contain at least eight characters.
  - Ensure the email address follows the format `name@example.com`.
  - If the warning persists, rebuild and redeploy the frontend (`npm run build`) so browsers receive the updated form validation and backend validation rules.
- **In-app banner shows "Registration failed."**
  - Visit `journalctl -u mik-api` (or check the terminal) for backend logs—validation errors such as duplicate emails or short passwords will be reported with a specific message that is also surfaced in the UI.
  - Confirm the API is running (`curl http://127.0.0.1:4000/health` should return `{"status":"ok"}`).
  - Verify the SQLite database folder exists (`ls backend/data`) so the server can persist new users. It is created automatically on first launch, but missing directories will prevent registrations.
- **Browser shows `502 Bad Gateway` from Nginx during registration or login**
  - Ensure the API service is running: `pm2 status mik-api` (or restart with `pm2 restart mik-api`). A stopped upstream will force Nginx to return 502.
  - Validate the backend responds locally: `curl http://127.0.0.1:4000/health` should produce `{"status":"ok"}`. If it fails, inspect `/opt/mik-management/backend` logs with `pm2 logs mik-api`.
  - Confirm `backend/config/database.config.json` exists and still contains the original `databasePassword`. Recreating or deleting this file prevents logins because stored hashes depend on the original secret.
  - Confirm the proxy block includes `/api/` (see the sample Nginx config above) and reload Nginx after edits: `sudo systemctl reload nginx`.

## Useful npm Scripts

| Location | Script | Description |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API server in watch mode for development. |
| `backend` | `npm start` | Launch the API server once (useful for PM2/systemd). |
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

`GET /api/config-info`

- **Success**: `200 OK` with `{ database: { driver, file, configFile } }`
- **Notes**: Provides operators with the resolved database location without exposing the secret `databasePassword`.

## License

This project is distributed for demonstration purposes and does not yet include an explicit license.
