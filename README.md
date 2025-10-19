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

## Updates

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

## Features

- **Device Management**: Full MikroTik device management
- **Real-time Logging**: System logs with MikroTik format
- **Group Firewall**: Apply firewall rules to device groups
- **IP Management**: Add, edit, manage IP addresses
- **Route Management**: Manage routing tables
- **Firewall Rules**: Comprehensive firewall management
- **Safe Mode**: Emergency device protection
- **Update System**: Built-in update mechanism

## Troubleshooting

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