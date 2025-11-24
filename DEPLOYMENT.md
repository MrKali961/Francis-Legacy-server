# Francis Legacy Server - Deployment Guide

This guide will walk you through deploying the Francis Legacy API server to your Ubuntu VPS using Docker and Portainer.

## Prerequisites

- Ubuntu VPS with Docker and Portainer installed
- Domain: `francislegacy.theelitessolutions.cloud` pointing to `92.113.26.138`
- SSH access to the server
- PostgreSQL database (will be deployed via Docker)

## Architecture Overview

```
Internet → Nginx (Port 80/443) → Node.js API (Port 3001) → PostgreSQL (Port 5432)
          SSL/TLS            Reverse Proxy           Database
```

## Step-by-Step Deployment

### 1. DNS Configuration

Ensure your domain points to your VPS:

```bash
# Verify DNS resolution
nslookup francislegacy.theelitessolutions.cloud
# Should return: 92.113.26.138
```

If not set up, create an A record:
- **Type:** A
- **Name:** francislegacy
- **Value:** 92.113.26.138
- **TTL:** 3600

### 2. Server Preparation

SSH into your server:

```bash
ssh root@92.113.26.138
```

Install required packages:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required tools
sudo apt install -y git curl

# Verify Docker is installed
docker --version
docker-compose --version
```

### 3. Clone Repository

```bash
# Navigate to your projects directory
cd /opt

# Clone the repository
git clone <your-repo-url> francis-legacy-server
cd francis-legacy-server
```

### 4. Configure Environment Variables

**Option A: Automated Setup (Recommended)**

```bash
# Run the interactive setup script
chmod +x setup-env.sh
./setup-env.sh
```

The script will:
- Generate secure random secrets for JWT and database password
- Prompt you for AWS and email credentials
- Create the `.env` file automatically

**Option B: Manual Setup**

```bash
# Generate secrets first
echo "JWT Secret:"
openssl rand -base64 32

echo "DB Password:"
openssl rand -base64 24

# Create .env file
cat > .env << 'EOF'
# Database Configuration
DB_NAME=francis_legacy
DB_USER=postgres
DB_PASSWORD=PASTE_GENERATED_PASSWORD_HERE

# JWT Configuration
JWT_SECRET=PASTE_GENERATED_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=production

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# CORS
FRONTEND_URL=https://francislegacy.org
EOF

# Edit with your actual values
nano .env
```

**Verify .env file:**

```bash
# Check file exists and has content (secrets will be hidden)
ls -lh .env
head -5 .env
```

### 5. Initial Deployment (Without SSL)

For the first deployment, we need to modify nginx config to work without SSL certificates:

```bash
# Create temporary nginx config without SSL
cat > nginx/conf.d/api-temp.conf << 'EOF'
upstream francis_api {
    server api:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name francislegacy.theelitessolutions.cloud;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://francis_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Backup original config
mv nginx/conf.d/api.conf nginx/conf.d/api.conf.backup

# Use temp config
mv nginx/conf.d/api-temp.conf nginx/conf.d/api.conf
```

Start the services:

```bash
docker-compose up -d
```

Check if services are running:

```bash
docker-compose ps
docker-compose logs -f
```

### 6. Obtain SSL Certificate

Once the services are running, obtain SSL certificate:

```bash
# Run certbot to get certificate
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d francislegacy.theelitessolutions.cloud
```

### 7. Enable SSL Configuration

After obtaining the certificate:

```bash
# Restore original nginx config with SSL
rm nginx/conf.d/api.conf
mv nginx/conf.d/api.conf.backup nginx/conf.d/api.conf

# Reload nginx
docker-compose restart nginx
```

Verify SSL is working:

```bash
curl https://francislegacy.theelitessolutions.cloud/health
```

### 8. Database Setup

Initialize the database with your schema:

```bash
# Access PostgreSQL container
docker-compose exec postgres psql -U postgres -d francis_legacy

# Or import SQL file if you have one
docker-compose exec -T postgres psql -U postgres -d francis_legacy < database.sql
```

### 9. Deploy via Portainer (Alternative Method)

If you prefer using Portainer UI:

1. **Access Portainer:** `http://92.113.26.138:9000`

2. **Create Stack:**
   - Navigate to: Stacks → Add Stack
   - Name: `francis-legacy`
   - Upload your `docker-compose.yml`
   - Add environment variables from `.env`
   - Click "Deploy the stack"

3. **Monitor Services:**
   - Go to Containers
   - Check health status of all services
   - View logs for troubleshooting

## Verification Steps

### 1. Check Service Health

```bash
# Check all containers
docker-compose ps

# Check logs
docker-compose logs api
docker-compose logs nginx
docker-compose logs postgres

# Test health endpoint
curl http://localhost/health
curl https://francislegacy.theelitessolutions.cloud/health
```

### 2. Test API Endpoints

```bash
# Test stats endpoint
curl https://francislegacy.theelitessolutions.cloud/api/stats

# Test from browser
https://francislegacy.theelitessolutions.cloud/health
```

### 3. Check SSL Certificate

```bash
# Check certificate details
openssl s_client -connect francislegacy.theelitessolutions.cloud:443 -servername francislegacy.theelitessolutions.cloud
```

## Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f nginx
docker-compose logs -f postgres
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build api

# Or via Portainer: Click "Update" on the stack
```

### Database Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres francis_legacy > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker-compose exec -T postgres psql -U postgres francis_legacy < backup.sql
```

### SSL Certificate Renewal

Certificates auto-renew via certbot container. To manually renew:

```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart nginx
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes database)
docker-compose down -v
```

## Troubleshooting

### Issue: Containers Won't Start

```bash
# Check logs
docker-compose logs

# Check for port conflicts
sudo netstat -tulpn | grep -E ':(80|443|3001|5432)'

# Restart Docker
sudo systemctl restart docker
docker-compose up -d
```

### Issue: Can't Access API

```bash
# Check nginx is running
docker-compose ps nginx

# Check nginx logs
docker-compose logs nginx

# Check nginx config syntax
docker-compose exec nginx nginx -t

# Test connection from inside server
curl http://localhost/health
```

### Issue: Database Connection Failed

```bash
# Check postgres is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d francis_legacy -c "SELECT 1;"

# Check environment variables
docker-compose exec api env | grep DB_
```

### Issue: SSL Certificate Problems

```bash
# Check certificate files exist
docker-compose exec nginx ls -la /etc/letsencrypt/live/francislegacy.theelitessolutions.cloud/

# Check certificate expiry
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/francislegacy.theelitessolutions.cloud/fullchain.pem -text -noout | grep "Not After"

# Manually renew certificate
docker-compose run --rm certbot renew --force-renewal
docker-compose restart nginx
```

## Security Considerations

1. **Firewall Configuration:**
```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

2. **Regular Updates:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

3. **Monitor Logs:**
```bash
# Check for suspicious activity
docker-compose logs nginx | grep -i "error\|warn"
docker-compose logs api | grep -i "error\|failed"
```

4. **Backup Strategy:**
   - Daily database backups
   - Weekly full system snapshots
   - Store backups off-site

## Performance Optimization

### 1. Database Connection Pooling

Already configured in your app with `pg` pool settings.

### 2. Nginx Caching (Optional)

Add to nginx config if needed:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;
proxy_cache api_cache;
proxy_cache_valid 200 5m;
```

### 3. Log Rotation

```bash
# Create log rotation config
sudo nano /etc/logrotate.d/docker-containers

# Add:
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

## Monitoring

### Health Checks

The application includes built-in health checks:

- **API Health:** `https://francislegacy.theelitessolutions.cloud/health`
- **Docker Health:** `docker-compose ps` (check STATUS column)

### Resource Usage

```bash
# Check container resource usage
docker stats

# Check disk usage
docker system df
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review this guide
- Check Docker/Portainer documentation

## Quick Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart service
docker-compose restart api

# Rebuild and restart
docker-compose up -d --build api

# Check status
docker-compose ps

# Access database
docker-compose exec postgres psql -U postgres -d francis_legacy

# Backup database
docker-compose exec postgres pg_dump -U postgres francis_legacy > backup.sql
```

## Notes

- **Auto-renewal:** SSL certificates renew automatically every 12 hours via certbot container
- **Database Persistence:** Database data is stored in Docker volume `postgres_data`
- **Logs:** Available via `docker-compose logs` or Portainer UI
- **Updates:** Pull latest code and rebuild containers with `docker-compose up -d --build`
