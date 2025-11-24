#!/bin/bash

# Francis Legacy Server - Environment Setup Script
# This script helps you configure the production environment

set -e

echo "======================================"
echo "Francis Legacy Server - Setup"
echo "======================================"
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  Warning: .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Existing .env file preserved."
        exit 0
    fi
fi

echo "Generating secure secrets..."
echo ""

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)

echo "✅ Generated JWT Secret: $JWT_SECRET"
echo "✅ Generated DB Password: $DB_PASSWORD"
echo ""

# Collect user input
echo "Please provide the following information:"
echo ""

read -p "AWS Access Key ID: " AWS_KEY
read -p "AWS Secret Access Key: " AWS_SECRET
read -p "AWS S3 Bucket Name: " S3_BUCKET
read -p "AWS Region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
read -p "Email Address (for SMTP): " EMAIL_USER
read -p "Email Password (App Password): " EMAIL_PASS
read -p "Email SMTP Host [smtp.gmail.com]: " EMAIL_HOST
EMAIL_HOST=${EMAIL_HOST:-smtp.gmail.com}
read -p "Email SMTP Port [587]: " EMAIL_PORT
EMAIL_PORT=${EMAIL_PORT:-587}

echo ""
read -p "Frontend URL [https://francislegacy.org]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-https://francislegacy.org}

echo ""
echo "Creating .env file..."

# Create .env file
cat > .env << EOF
# Database Configuration
DB_NAME=francis_legacy
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=production

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=$AWS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET
AWS_REGION=$AWS_REGION
AWS_S3_BUCKET=$S3_BUCKET

# Email Configuration
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_USER=$EMAIL_USER
EMAIL_PASSWORD=$EMAIL_PASS

# CORS
FRONTEND_URL=$FRONTEND_URL
EOF

echo ""
echo "✅ Environment file created successfully!"
echo ""
echo "======================================"
echo "Configuration Summary"
echo "======================================"
echo "Database:"
echo "  - Name: francis_legacy"
echo "  - User: postgres"
echo "  - Password: [hidden]"
echo ""
echo "AWS S3:"
echo "  - Region: $AWS_REGION"
echo "  - Bucket: $S3_BUCKET"
echo ""
echo "Email:"
echo "  - Host: $EMAIL_HOST"
echo "  - User: $EMAIL_USER"
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo "======================================"
echo ""
echo "⚠️  IMPORTANT: Keep your .env file secure!"
echo "   - Never commit it to git"
echo "   - Backup it in a secure location"
echo ""
echo "Next steps:"
echo "  1. Review .env file: cat .env"
echo "  2. Start services: docker-compose up -d"
echo "  3. Check status: docker-compose ps"
echo "  4. View logs: docker-compose logs -f"
echo ""
EOF

chmod +x setup-env.sh
