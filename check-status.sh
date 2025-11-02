#!/bin/bash

# Mik-Management Server Status Checker
# نمایش وضعیت سرورها و پورت‌های فعال

clear
echo "=========================================="
echo "    📊 Mik-Management Server Status 📊"
echo "=========================================="
echo ""

echo "🔍 Checking running servers..."
echo ""

# Check for running Node.js processes
echo "📋 Running Node.js processes:"
ps aux | grep -E "(node|npm)" | grep -v grep | grep -v "Cursor Helper"
echo ""

# Check listening ports
echo "🌐 Active ports:"
lsof -i -P | grep LISTEN | grep node 2>/dev/null || echo "No Node.js servers listening"
echo ""

# Get actual ports from logs if available
if [ -f "backend.log" ]; then
    backend_port=$(grep -o "ready at http://[^:]*:\([0-9]*\)" backend.log 2>/dev/null | grep -o "[0-9]*" | tail -1)
    if [ ! -z "$backend_port" ]; then
        echo "✅ Backend server is running on port: $backend_port"
    else
        echo "⚠️ Backend log found but port not detected"
    fi
else
    echo "❌ Backend log not found"
fi

if [ -f "frontend.log" ]; then
    frontend_port=$(grep -o "Local: *http://localhost:\([0-9]*\)" frontend.log 2>/dev/null | grep -o "[0-9]*" | tail -1)
    if [ ! -z "$frontend_port" ]; then
        echo "✅ Frontend server is running on port: $frontend_port"
    else
        echo "⚠️ Frontend log found but port not detected"
    fi
else
    echo "❌ Frontend log not found"
fi

echo ""

# Show application URLs
echo "🌐 Application URLs:"
if [ ! -z "$frontend_port" ]; then
    echo "   Frontend: http://localhost:$frontend_port"
else
    echo "   Frontend: Not running or port unknown"
fi

if [ ! -z "$backend_port" ]; then
    echo "   Backend:  http://localhost:$backend_port"
else
    echo "   Backend:  Not running or port unknown"
fi

echo ""

# Show local network access
if [ ! -z "$frontend_port" ] || [ ! -z "$backend_port" ]; then
    echo "📱 Local network access:"
    local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    if [ ! -z "$frontend_port" ]; then
        echo "   Frontend: http://$local_ip:$frontend_port"
    fi
    if [ ! -z "$backend_port" ]; then
        echo "   Backend:  http://$local_ip:$backend_port"
    fi
    echo ""
fi

# Show recent logs
echo "📋 Recent logs:"
if [ -f "backend.log" ]; then
    echo "Backend (last 3 lines):"
    tail -3 backend.log
    echo ""
fi

if [ -f "frontend.log" ]; then
    echo "Frontend (last 3 lines):"
    tail -3 frontend.log
    echo ""
fi

echo "=========================================="
echo "💡 To stop all servers: pkill -f 'npm start' && pkill -f 'npm run dev'"
echo "💡 To start servers: ./local-menu.sh (option 1)"
echo "=========================================="
