#!/bin/bash

# Manual sudoers setup for Mik-Management
echo "Manual sudoers setup for Mik-Management..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)"
    exit 1
fi

echo "Setting up sudoers for www-data..."

# Remove existing sudoers file if it exists
if [ -f /etc/sudoers.d/99-mik-management-www-data ]; then
    echo "Removing existing sudoers file..."
    rm /etc/sudoers.d/99-mik-management-www-data
fi

# Create sudoers file with proper syntax
cat > /etc/sudoers.d/99-mik-management-www-data << 'EOF'
# Allow www-data to run specific commands for Mik-Management updates
www-data ALL=(ALL) NOPASSWD: /usr/bin/git
www-data ALL=(ALL) NOPASSWD: /usr/bin/npm
www-data ALL=(ALL) NOPASSWD: /bin/chown
www-data ALL=(ALL) NOPASSWD: /bin/systemctl
EOF

# Set proper permissions
chmod 440 /etc/sudoers.d/99-mik-management-www-data

# Validate sudoers syntax
echo "Validating sudoers syntax..."
if visudo -c -f /etc/sudoers.d/99-mik-management-www-data; then
    echo "✅ Sudoers syntax is valid"
else
    echo "❌ Sudoers syntax error. Please check the file."
    exit 1
fi

# Test sudoers configuration
echo "Testing sudoers configuration..."
if sudo -u www-data -n true 2>/dev/null; then
    echo "✅ Sudoers configuration is working"
else
    echo "❌ Sudoers configuration failed. Please check the file."
    exit 1
fi

# Test git command
echo "Testing git command..."
cd /opt/mik-management
if sudo -u www-data -n git pull origin main --dry-run 2>/dev/null; then
    echo "✅ Git command is working"
else
    echo "❌ Git command failed"
fi

# Test npm command
echo "Testing npm command..."
if sudo -u www-data -n npm --version 2>/dev/null; then
    echo "✅ NPM command is working"
else
    echo "❌ NPM command failed"
fi

echo "Sudoers setup complete!"
echo "You can now test the update system in the web interface."
