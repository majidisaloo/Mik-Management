#!/bin/bash

# Setup script for Mik-Management update permissions
echo "Setting up Mik-Management update permissions..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)"
    exit 1
fi

# Copy service files
echo "Installing systemd service files..."
cp mik-management-backend.service /etc/systemd/system/
cp mik-management-frontend.service /etc/systemd/system/

# Setup sudoers for www-data
echo "Setting up sudoers for www-data..."
cp www-data-sudoers /etc/sudoers.d/99-mik-management-www-data
chmod 440 /etc/sudoers.d/99-mik-management-www-data

# Test sudoers configuration
echo "Testing sudoers configuration..."
if sudo -u www-data -n true 2>/dev/null; then
    echo "✅ Sudoers configuration is working"
else
    echo "❌ Sudoers configuration failed. Please check the file."
    exit 1
fi

# Ensure proper ownership
echo "Setting proper ownership..."
chown -R www-data:www-data /opt/mik-management

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable and start services
echo "Enabling and starting services..."
systemctl enable mik-management-backend
systemctl enable mik-management-frontend
systemctl restart mik-management-backend
systemctl restart mik-management-frontend

# Check status
echo "Checking service status..."
systemctl status mik-management-backend --no-pager
systemctl status mik-management-frontend --no-pager

# Test update system
echo "Testing update system..."
cd /opt/mik-management
sudo -u www-data -n git pull origin main --dry-run
if [ $? -eq 0 ]; then
    echo "✅ Update system is working correctly"
else
    echo "❌ Update system test failed"
fi

echo "Setup complete! Update system should now work with proper permissions."
echo "You can now use the web interface to update the system."
