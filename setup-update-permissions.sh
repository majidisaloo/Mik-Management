#!/bin/bash

# Setup script for Mik-Management update permissions
echo "Setting up Mik-Management update permissions..."

# Copy service files
echo "Installing systemd service files..."
sudo cp mik-management-backend.service /etc/systemd/system/
sudo cp mik-management-frontend.service /etc/systemd/system/

# Setup sudoers for www-data
echo "Setting up sudoers for www-data..."
sudo cp www-data-sudoers /etc/sudoers.d/99-mik-management-www-data
sudo chmod 440 /etc/sudoers.d/99-mik-management-www-data

# Ensure proper ownership
echo "Setting proper ownership..."
sudo chown -R www-data:www-data /opt/mik-management

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable and start services
echo "Enabling and starting services..."
sudo systemctl enable mik-management-backend
sudo systemctl enable mik-management-frontend
sudo systemctl restart mik-management-backend
sudo systemctl restart mik-management-frontend

# Check status
echo "Checking service status..."
sudo systemctl status mik-management-backend --no-pager
sudo systemctl status mik-management-frontend --no-pager

echo "Setup complete! Update system should now work with proper permissions."
