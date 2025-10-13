# Mik Management

A full-stack registration experience built with React, Vite, Express, and SQLite. The project ships with a modern onboarding guide, a secure API, and a polished user interface.

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
7. Visit the site at http://localhost:5173 and use the **Register** link to create an account.

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

## Environment Variables

The default configuration works without custom variables. For production deployments you can override the port with `PORT=5000 npm run dev` in the backend.

## Database

The backend uses SQLite and automatically creates the database file at `backend/data/app.db`. Passwords are hashed with bcrypt before being persisted.

## Useful npm Scripts

| Location | Script | Description |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the API server. |
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

- **Body**: `{ firstName, lastName, email, password, passwordConfirmation }`
- **Success**: `201 Created`
- **Errors**:
  - `400`: Missing fields, mismatched passwords, or weak password
  - `409`: Email already registered
  - `500`: Unexpected server error

## License

This project is distributed for demonstration purposes and does not yet include an explicit license.
