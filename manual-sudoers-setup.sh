#!/bin/bash

# Manual sudoers setup for Mik-Management
echo "Manual sudoers setup for Mik-Management..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)"
    exit 1
fi

echo "Setting up sudoers for www-data..."

# Create sudoers file
cat > /etc/sudoers.d/99-mik-management-www-data << 'EOF'
# Allow www-data to run specific commands for Mik-Management updates
www-data ALL=(ALL) NOPASSWD: /usr/bin/git pull origin main
www-data ALL=(ALL) NOPASSWD: /usr/bin/git fetch origin main
www-data ALL=(ALL) NOPASSWD: /usr/bin/git rev-list --count HEAD
www-data ALL=(ALL) NOPASSWD: /usr/bin/git tag --sort=-version:refname
www-data ALL=(ALL) NOPASSWD: /usr/bin/npm install
www-data ALL=(ALL) NOPASSWD: /usr/bin/npm run build
www-data ALL=(ALL) NOPASSWD: /usr/bin/npm run dev
www-data ALL=(ALL) NOPASSWD: /bin/chown -R www-data:www-data /opt/mik-management/*
www-data ALL=(ALL) NOPASSWD: /bin/chown -R www-data:www-data /opt/mik-management/backend/*
www-data ALL=(ALL) NOPASSWD: /bin/chown -R www-data:www-data /opt/mik-management/frontend/*
www-data ALL=(ALL) NOPASSWD: /bin/chown -R www-data:www-data /opt/mik-management/frontend/dist/*
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart mik-management-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart mik-management-frontend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
EOF

# Set proper permissions
chmod 440 /etc/sudoers.d/99-mik-management-www-data

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
