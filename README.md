# Mik-Management

Mik-Management delivers a React + Vite control panel backed by a lightweight Node.js API for managing MikroTik devices.

## Quick Start

### Installation
```bash
# Install prerequisites
sudo apt update && sudo apt install nginx nodejs npm rpm git -y

# Clone and setup
sudo rm -rf /opt/mik-management
sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management

# Backend setup
cd /opt/mik-management/backend
npm install && npm run prepare:db

# Frontend setup
cd ../frontend
npm install && npm run build

# Create services and start
sudo cp deploy/mik-management-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mik-management-backend

# Configure Nginx
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/mik-management
sudo ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Verify installation
curl http://localhost/api/users
```

**Access**: Open `http://your-server-ip/` and register the first admin user.

### Fresh Ubuntu install (from zero)
Use these steps on a clean Ubuntu 20.04/22.04 server.

```bash
# 1) Update OS and install prerequisites
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm git rpm

# 2) Clone the project
sudo mkdir -p /opt
sudo rm -rf /opt/mik-management
sudo git clone https://github.com/majidisaloo/Mik-Management.git /opt/mik-management

# 3) Backend setup
cd /opt/mik-management/backend
sudo npm install
sudo npm run prepare:db

# 4) Frontend setup
cd /opt/mik-management/frontend
sudo npm install
sudo npm run build

# 5) Install and enable the backend service
sudo cp /opt/mik-management/deploy/mik-management-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mik-management-backend

# 6) Configure Nginx
sudo cp /opt/mik-management/deploy/nginx.conf.example /etc/nginx/sites-available/mik-management
sudo ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/mik-management
sudo nginx -t && sudo systemctl reload nginx

# 7) Verify
curl http://localhost/api/users
```

If you deploy from GitLab instead of GitHub, set your origin before updating:
```bash
cd /opt/mik-management
sudo git remote set-url origin <YOUR_GITLAB_REPO_URL>
```

## Updates

### Channels (Stable vs Beta)
- Stable: tested releases, tagged as `stable-YYYY-MM-DD`.
- Beta: latest features on `beta` branch.

Update to a channel:
```bash
# Stable
sudo /opt/mik-management/update.sh main
# Beta
sudo /opt/mik-management/update.sh beta
```

### From Version 1.x to Latest
```bash
# Stop services
sudo systemctl stop nginx mik-management-backend

# Backup data
sudo cp -r /opt/mik-management/backend/data /opt/mik-management-backup-$(date +%Y%m%d-%H%M%S)

# Update code
cd /opt/mik-management
sudo git fetch origin
sudo git reset --hard origin/main

# Fix permissions
sudo chown -R www-data:www-data /opt/mik-management
sudo ./fix-sudo-permissions.sh

# Update dependencies
cd backend && npm install && npm run prepare:db
cd ../frontend && npm install && npm run build

# Restart services
sudo systemctl start mik-management-backend nginx

# Verify
sudo systemctl status mik-management-backend --no-pager
curl http://localhost/api/users
```

### Automated Update Script
```bash
# Create update script
sudo tee /opt/mik-management/update.sh <<'EOF'
#!/bin/bash
BRANCH=${1:-main}
BACKUP_DIR="/opt/mik-management-backup-$(date +%Y%m%d-%H%M%S)"

echo "Updating to branch: $BRANCH"
sudo systemctl stop nginx mik-management-backend
sudo cp -r /opt/mik-management/backend/data "$BACKUP_DIR"

cd /opt/mik-management
sudo git fetch origin
sudo git reset --hard "origin/$BRANCH"
sudo chown -R www-data:www-data /opt/mik-management
sudo ./fix-sudo-permissions.sh

cd backend && npm install && npm run prepare:db
cd ../frontend && npm install && npm run build

sudo systemctl start mik-management-backend nginx
echo "✅ Update completed!"
EOF

sudo chmod +x /opt/mik-management/update.sh

# Usage:
# sudo /opt/mik-management/update.sh main    # Update to stable
# sudo /opt/mik-management/update.sh beta    # Update to beta
# sudo /opt/mik-management/update.sh stable  # Update to stable
```

### In-app update troubleshooting
- The update button pulls from the git branch (`main` for stable, `beta` for beta).
- Ensure the backend service user can run `git pull`, `npm install`, and `npm run build` in `/opt/mik-management`.

## Features

- **Device Management**: Full MikroTik device management
- **Real-time Logging**: System logs with MikroTik format
- **Group Firewall**: Apply firewall rules to device groups
- **IPAM Queue + Logs**: All IP/range add/split/delete actions enqueue, verified, fully logged (30 days retention). No inline mutations.
- **Per-Page Caching**: 10-minute memory cache for heavy pages (IPAM sections, Firewall, Groups, Mikrotiks).
- **IP Management**: Add, edit, manage IP addresses
- **Route Management**: Manage routing tables
- **Firewall Rules**: Comprehensive firewall management
- **Safe Mode**: Emergency device protection
- **Update System**: Built-in update mechanism

## Troubleshooting
### Queue & Logs
- IPAM actions return HTTP 202 and appear under `Queue & Logs` on the IPAM details page.
- Successful operations are moved from queue to logs with verification details.
- Failed operations stay in the queue and can be retried.

### Performance
- Data is fetched per page and cached for 10 minutes by the API to reduce load.


### Common Issues
```bash
# Check services
sudo systemctl status mik-management-backend --no-pager
sudo systemctl status nginx --no-pager

# Check logs
sudo journalctl -u mik-management-backend -f

# Restart services
sudo systemctl restart mik-management-backend nginx

# Fix permissions
sudo chown -R www-data:www-data /opt/mik-management
sudo ./fix-sudo-permissions.sh

# Check API
curl http://localhost/api/users
```

### Port Conflicts
```bash
sudo pkill -f "node.*server.js"
sudo systemctl restart mik-management-backend
```

### Database Issues
```bash
sudo cp /opt/mik-management/backend/data/app.db /opt/mik-management/backend/data/app.db.backup
sudo rm /opt/mik-management/backend/data/app.db
cd /opt/mik-management/backend && npm run prepare:db
```

## System Requirements

- **OS**: Ubuntu 20.04+ or compatible
- **CPU**: 1 core (2+ recommended)
- **RAM**: 512MB (2GB+ recommended)
- **Storage**: 1GB free space
- **Network**: Internet connection

## Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/majidisaloo/Mik-Management/issues)
- **Documentation**: This README
- **Community**: GitHub Discussions

## License

MIT License - see LICENSE file for details.

---

**Thank you for using Mik-Management!** 🚀
