# Deployment Guide

## Production Deployment

### Prerequisites
- MySQL 8.0+ (production instance)
- Python 3.11+
- Node.js 18+
- Linux/Windows Server (2022+)

### Step 1: Database Setup (Production)

```bash
# Create database with proper collation
mysql -u root -p << SQL
CREATE DATABASE IF NOT EXISTS loan_eligibility_system 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loan_eligibility_system;
SOURCE /path/to/database/schema.sql;
SOURCE /path/to/database/sample_data.sql;
SQL
```

### Step 2: Backend Deployment

```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with production values:
# - DB_USER, DB_PASSWORD (strong credentials)
# - JWT_SECRET_KEY (generate with: openssl rand -hex 32)
# - INITIAL_ADMIN_PASSWORD (strong password)

# Seed initial data
python -m app.db.seed

# Test backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# For production, use Gunicorn:
pip install gunicorn
gunicorn app.main:app -w 4 -b 0.0.0.0:8000 --timeout 120
```

### Step 3: Frontend Deployment

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output in ./build directory
# Serve with nginx or Express

# Test build locally
npm install -g serve
serve -s build -l 3000
```

### Step 4: Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /home/app/loan-eligibility/frontend/build;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 75s;
    }

    # SSL (Let's Encrypt)
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Step 5: Environment Variables

**Production .env:**
```
# Database
DB_USER=prod_user
DB_PASSWORD=<strong_password>
DB_HOST=db.example.com
DB_NAME=loan_eligibility_system
DB_PORT=3306

# JWT
JWT_SECRET_KEY=<generated_with_openssl>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Admin
INITIAL_ADMIN_EMAIL=admin@yourbank.com
INITIAL_ADMIN_PASSWORD=<strong_password>

# CORS
ALLOWED_ORIGINS=["https://your-domain.com"]

# Logging
LOG_LEVEL=INFO

# Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
UPLOAD_DIR=/var/uploads/loan-eligibility
```

### Step 6: Systemd Service (Backend)

Create `/etc/systemd/system/loan-api.service`:

```ini
[Unit]
Description=Loan Eligibility API
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/home/app/loan-eligibility/backend
Environment="PATH=/home/app/loan-eligibility/backend/venv/bin"
ExecStart=/home/app/loan-eligibility/backend/venv/bin/gunicorn \
    app.main:app \
    -w 4 \
    -b 127.0.0.1:8000 \
    --timeout 120

Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable loan-api
sudo systemctl start loan-api
sudo systemctl status loan-api
```

### Step 7: Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mysql"
mkdir -p $BACKUP_DIR

mysqldump -u root -p<password> loan_eligibility_system > \
    $BACKUP_DIR/loan_eligibility_$DATE.sql

# Compress
gzip $BACKUP_DIR/loan_eligibility_$DATE.sql

# Keep last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-mysql.sh
```

### Step 8: Monitoring & Logging

**Application Logs:**
```bash
# Backend logs
tail -f /var/log/loan-api/error.log
tail -f /var/log/loan-api/access.log

# System logs
journalctl -u loan-api -f
```

**Database Monitoring:**
```sql
-- Check active connections
SHOW PROCESSLIST;

-- Check table sizes
SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'loan_eligibility_system'
ORDER BY size_mb DESC;
```

### Step 9: Security Checklist

- [ ] MySQL password changed from default
- [ ] JWT_SECRET_KEY is random (32+ chars)
- [ ] CORS restricted to your domain only
- [ ] SSL/TLS enabled (HTTPS only)
- [ ] Database backups automated
- [ ] Admin account has strong password
- [ ] Upload directory outside webroot
- [ ] Rate limiting enabled on API
- [ ] CSRF protection enabled
- [ ] SQL injection prevention verified

### Step 10: Performance Tuning

**MySQL my.cnf:**
```ini
[mysqld]
max_connections=1000
innodb_buffer_pool_size=4G
innodb_log_file_size=512M
query_cache_size=64M
```

**Gunicorn:**
```bash
gunicorn app.main:app -w 8 -b 0.0.0.0:8000 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile /var/log/loan-api/access.log \
    --error-logfile /var/log/loan-api/error.log
```

---

## Troubleshooting

### Backend won't start
```
Check logs: journalctl -u loan-api -n 50
Verify database: mysql -u root -p -e "SHOW DATABASES;"
Check .env: cat .env
Restart service: sudo systemctl restart loan-api
```

### Database connection timeout
```
Increase timeout in .env
Check MySQL is running: sudo systemctl status mysql
Verify credentials
Check firewall rules
```

### High memory usage
```
Monitor: free -h
Check Python: ps aux | grep gunicorn
Reduce worker count in Gunicorn
Increase buffer pool in MySQL
```

---

## Rollback Plan

If deployment fails:

```bash
# Stop current version
sudo systemctl stop loan-api

# Restore previous database backup
mysql -u root -p loan_eligibility_system < backup_previous.sql

# Start with previous code
cd /home/app/loan-eligibility
git checkout previous-tag

# Restart
sudo systemctl start loan-api
```

---

## Support

- **API Docs:** https://your-domain.com/docs
- **Health Check:** https://your-domain.com/api/health
- **Logs:** Check `/var/log/loan-api/`
- **Database:** Connect via MySQL CLI or Workbench

