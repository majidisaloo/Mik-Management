#!/bin/bash

# Mik-Management Local Menu
# Local management menu for Mik-Management project

# Support direct command execution (non-interactive mode)
if [ "$1" == "restart" ]; then
    echo "🔄 Restarting services..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    pkill -f "node.*backend/src/server.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    sleep 2
    
    cd "$SCRIPT_DIR/backend" && node src/server.js > backend.log 2>&1 &
    BACKEND_PID=$!
    
    cd "$SCRIPT_DIR/frontend" && npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo "✅ Services restarted"
    echo "   Backend PID: $BACKEND_PID"
    echo "   Frontend PID: $FRONTEND_PID"
    exit 0
fi

clear
echo "=========================================="
echo "    🚀 Mik-Management Local Menu 🚀"
echo "=========================================="
echo ""

while true; do
    echo "📋 Available Options:"
    echo ""
    echo "🚀 Quick Start:"
    echo "  1) Complete Local Setup & Run (Recommended)"
    echo ""
    echo "🔧 Backend:"
    echo "  2) Install backend dependencies"
    echo "  3) Run backend server only"
    echo "  4) View backend logs"
    echo "  5) Test database connection"
    echo ""
    echo "🎨 Frontend:"
    echo "  6) Install frontend dependencies"
    echo "  7) Run frontend dev server only"
    echo "  8) Build frontend for production"
    echo ""
    echo "🗄️ Database:"
    echo "  9) View database status"
    echo "  10) Backup database"
    echo "  11) Restore database"
    echo ""
    echo "🔍 Development:"
    echo "  12) View Git status"
    echo "  13) Run tests"
    echo "  14) View system logs"
    echo ""
    echo "📊 Monitoring:"
    echo "  15) View service status"
    echo "  16) System resource usage"
    echo "  17) Network connections"
    echo ""
    echo "❌ 0) Exit"
    echo ""
    echo "=========================================="
    read -p "Please select an option (0-17): " choice
    
    case $choice in
        1)
            echo "🚀 Starting Complete Local Setup & Run..."
            echo ""
            echo "📦 Installing backend dependencies..."
            cd backend
            if npm install; then
                echo "✅ Backend dependencies installed successfully!"
            else
                echo "❌ Failed to install backend dependencies!"
                cd ..
                read -p "Press Enter to continue..."
                continue
            fi
            
            echo ""
            echo "📦 Installing frontend dependencies..."
            cd ../frontend
            if npm install; then
                echo "✅ Frontend dependencies installed successfully!"
            else
                echo "❌ Failed to install frontend dependencies!"
                cd ..
                read -p "Press Enter to continue..."
                continue
            fi
            
            echo ""
            echo "🗄️ Testing database connection..."
            cd ../backend
            if node -e "
            const db = require('./src/database.js');
            db.testConnection()
                .then(() => {
                    console.log('✅ Database connection successful!');
                    process.exit(0);
                })
                .catch(err => {
                    console.log('❌ Database connection failed:', err.message);
                    process.exit(1);
                });
            " 2>/dev/null; then
                echo "✅ Database is ready!"
            else
                echo "⚠️ Database connection test failed, but continuing..."
            fi
            
            echo ""
            echo "🎉 Setup complete! Starting servers..."
            echo ""
            echo "🔄 Starting backend server..."
            cd ../backend
            nohup npm start > ../backend.log 2>&1 &
            backend_pid=$!
            
            echo "⏳ Waiting 3 seconds for backend to start..."
            sleep 3
            
            echo "🎨 Starting frontend server..."
            cd ../frontend
            nohup npm run dev > ../frontend.log 2>&1 &
            frontend_pid=$!
            
            echo "⏳ Waiting 5 seconds for servers to start..."
            sleep 5
            
            # Get actual ports from logs
            backend_port=$(grep -o "ready at http://[^:]*:\([0-9]*\)" ../backend.log 2>/dev/null | grep -o "[0-9]*" | tail -1)
            frontend_port=$(grep -o "Local: *http://localhost:\([0-9]*\)" ../frontend.log 2>/dev/null | grep -o "[0-9]*" | tail -1)
            
            echo ""
            echo "🎉 Both servers are starting in background!"
            echo ""
            echo "🌐 Access your application at:"
            if [ ! -z "$frontend_port" ]; then
                echo "   Frontend: http://localhost:$frontend_port"
            else
                echo "   Frontend: http://localhost:5173 (default Vite port)"
            fi
            
            if [ ! -z "$backend_port" ]; then
                echo "   Backend:  http://localhost:$backend_port"
            else
                echo "   Backend:  http://localhost:5002 (default backend port)"
            fi
            echo ""
            echo "📱 Local network access:"
            local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
            if [ ! -z "$frontend_port" ]; then
                echo "   Frontend: http://$local_ip:$frontend_port"
            else
                echo "   Frontend: http://$local_ip:5173"
            fi
            
            if [ ! -z "$backend_port" ]; then
                echo "   Backend:  http://$local_ip:$backend_port"
            else
                echo "   Backend:  http://$local_ip:5002"
            fi
            echo ""
            echo "📋 Log files:"
            echo "   Backend:  ./backend.log"
            echo "   Frontend: ./frontend.log"
            echo ""
            echo "🔧 To stop servers: pkill -f 'npm start' && pkill -f 'npm run dev'"
            echo ""
            read -p "Press Enter to continue..."
            cd ..
            ;;
        2)
            echo "📦 Installing backend dependencies..."
            cd backend && npm install
            echo "✅ Installation complete!"
            read -p "Press Enter to continue..."
            cd ..
            ;;
        3)
            echo "🚀 Starting backend server..."
            cd backend && npm start
            ;;
        4)
            echo "📋 Backend logs:"
            if [ -f "backend/server.log" ]; then
                tail -20 backend/server.log
            else
                echo "Log file not found!"
            fi
            read -p "Press Enter to continue..."
            ;;
        5)
            echo "🗄️ Testing database connection..."
            cd backend && node -e "
            const db = require('./src/database.js');
            db.testConnection()
                .then(() => console.log('✅ Database connection successful!'))
                .catch(err => console.log('❌ Connection error:', err.message));
            "
            read -p "Press Enter to continue..."
            cd ..
            ;;
        6)
            echo "📦 Installing frontend dependencies..."
            cd frontend && npm install
            echo "✅ Installation complete!"
            read -p "Press Enter to continue..."
            cd ..
            ;;
        7)
            echo "🚀 Starting frontend development server..."
            cd frontend && npm run dev
            ;;
        8)
            echo "🏗️ Building frontend for production..."
            cd frontend && npm run build
            echo "✅ Build complete!"
            read -p "Press Enter to continue..."
            cd ..
            ;;
        9)
            echo "🗄️ Database status:"
            ls -la backend/data/
            echo ""
            echo "Database file size:"
            du -h backend/data/app.db
            read -p "Press Enter to continue..."
            ;;
        10)
            echo "💾 Backing up database..."
            timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
            cp backend/data/app.db "backend/data/app.db.backup_$timestamp"
            echo "✅ Backup created: app.db.backup_$timestamp"
            read -p "Press Enter to continue..."
            ;;
        11)
            echo "🔄 Restoring database..."
            echo "Available backup files:"
            ls -la backend/data/*.backup*
            echo ""
            read -p "Enter backup filename: " backup_file
            if [ -f "backend/data/$backup_file" ]; then
                cp "backend/data/$backup_file" backend/data/app.db
                echo "✅ Database restored!"
            else
                echo "❌ Backup file not found!"
            fi
            read -p "Press Enter to continue..."
            ;;
        12)
            echo "📊 Git status:"
            git status
            echo ""
            echo "📈 Recent commits:"
            git log --oneline -5
            read -p "Press Enter to continue..."
            ;;
        13)
            echo "🧪 Running tests..."
            echo "Backend tests:"
            cd backend && npm test 2>/dev/null || echo "No backend tests found"
            echo ""
            echo "Frontend tests:"
            cd frontend && npm test 2>/dev/null || echo "No frontend tests found"
            cd ..
            read -p "Press Enter to continue..."
            ;;
        14)
            echo "📋 System logs:"
            echo "Recent system logs:"
            tail -10 /var/log/system.log 2>/dev/null || echo "System log access restricted"
            echo ""
            echo "Node.js processes:"
            ps aux | grep node
            read -p "Press Enter to continue..."
            ;;
        15)
            echo "📊 Service status:"
            echo "Project-related processes:"
            ps aux | grep -E "(node|npm)" | grep -v grep
            echo ""
            echo "Ports in use:"
            lsof -i :3000,3001,8080 2>/dev/null || echo "Specified ports not found"
            read -p "Press Enter to continue..."
            ;;
        16)
            echo "💻 System resource usage:"
            echo "Memory:"
            free -h 2>/dev/null || vm_stat
            echo ""
            echo "CPU:"
            top -l 1 | grep "CPU usage"
            echo ""
            echo "Disk:"
            df -h
            read -p "Press Enter to continue..."
            ;;
        17)
            echo "🌐 Network connections:"
            echo "Active connections:"
            netstat -an | grep LISTEN | head -10
            echo ""
            echo "Local IP:"
            ifconfig | grep "inet " | grep -v 127.0.0.1
            read -p "Press Enter to continue..."
            ;;
        0)
            echo "👋 Goodbye! Have a great day!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option! Please enter a valid number."
            read -p "Press Enter to continue..."
            ;;
    esac
    
    clear
done
