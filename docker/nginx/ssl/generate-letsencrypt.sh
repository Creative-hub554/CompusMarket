#!/bin/bash
# Obtain Let's Encrypt SSL certificate for production
# Usage: ./generate-letsencrypt.sh [domain] [email]

DOMAIN=${1:-champey.com}
EMAIL=${2:-admin@champey.com}
CERT_DIR=$(dirname "$0")/../ssl

mkdir -p "$CERT_DIR"

echo "Obtaining Let's Encrypt certificate for $DOMAIN..."

# Stop nginx if running to free port 80
docker compose -f ../compose.prod.yml stop nginx 2>/dev/null || true

# Obtain certificate using certbot standalone mode
docker run --rm \
  -v "$CERT_DIR:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  -d "admin.$DOMAIN" \
  -d "api.$DOMAIN"

if [ $? -eq 0 ]; then
  echo "Certificate obtained successfully!"
  echo "Certificates stored in: $CERT_DIR/live/$DOMAIN/"
  
  # Copy to nginx expected location
  cp "$CERT_DIR/live/$DOMAIN/fullchain.pem" "$CERT_DIR/$DOMAIN.crt"
  cp "$CERT_DIR/live/$DOMAIN/privkey.pem" "$CERT_DIR/$DOMAIN.key"
  
  echo "Certificate files ready for nginx:"
  echo "  - $CERT_DIR/$DOMAIN.crt"
  echo "  - $CERT_DIR/$DOMAIN.key"
  
  # Restart nginx
  docker compose -f ../compose.prod.yml up -d nginx
else
  echo "Failed to obtain certificate!"
  exit 1
fi