#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run as root (sudo ./install-ubuntu.sh)."
  exit 1
fi

REPO_URL="${REPO_URL:-https://github.com/majidisaloo/Mik-Management.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/mik-management}"
FORCE_IPV4="${FORCE_IPV4:-1}"

echo "➡️  Installing Mik-Management to ${INSTALL_DIR}"

if [[ "${FORCE_IPV4}" == "1" ]]; then
  echo "➡️  Forcing IPv4 for apt and npm (FORCE_IPV4=1)"
  echo 'Acquire::ForceIPv4 "true";' >/etc/apt/apt.conf.d/99force-ipv4
  if ! grep -q "precedence ::ffff:0:0/96  100" /etc/gai.conf 2>/dev/null; then
    echo "precedence ::ffff:0:0/96  100" >>/etc/gai.conf
  fi
  sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null
  sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null
fi

apt update && apt upgrade -y
apt install -y nginx nodejs npm git rpm

mkdir -p /opt
rm -rf "${INSTALL_DIR}"
git clone "${REPO_URL}" "${INSTALL_DIR}"

echo "➡️  Backend install"
cd "${INSTALL_DIR}/backend"
npm config set prefer-ipv4 true
npm config set registry https://registry.npmjs.org/
npm config set node-options "--dns-result-order=ipv4first"
npm install
npm run prepare:db

echo "➡️  Frontend build"
cd "${INSTALL_DIR}/frontend"
npm config set prefer-ipv4 true
npm config set registry https://registry.npmjs.org/
npm config set node-options "--dns-result-order=ipv4first"
npm install
npm run build

echo "➡️  Systemd service"
cp "${INSTALL_DIR}/deploy/mik-management-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now mik-management-backend

echo "➡️  Nginx config"
cp "${INSTALL_DIR}/deploy/nginx.conf.example" /etc/nginx/sites-available/mik-management
ln -sf /etc/nginx/sites-available/mik-management /etc/nginx/sites-enabled/mik-management
nginx -t && systemctl reload nginx

echo "✅ Installation complete."
echo "Open http://your-server-ip/ to finish setup."
