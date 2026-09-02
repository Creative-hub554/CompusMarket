#!/bin/bash
# Generate self-signed SSL certificate for local development
# Usage: ./generate-selfsigned.sh [domain] [days]

DOMAIN=${1:-localhost}
DAYS=${2:-365}
CERT_DIR=$(dirname "$0")/../ssl

mkdir -p "$CERT_DIR"

echo "Generating self-signed certificate for $DOMAIN (valid for $DAYS days)..."

openssl req -x509 -nodes -days "$DAYS" -newkey rsa:2048 \
  -keyout "$CERT_DIR/$DOMAIN.key" \
  -out "$CERT_DIR/$DOMAIN.crt" \
  -subj "/C=KH/ST=Phnom Penh/L=Phnom Penh/O=Champey/OU=IT/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1"

echo "Certificate generated:"
echo "  - $CERT_DIR/$DOMAIN.crt"
echo "  - $CERT_DIR/$DOMAIN.key"

# Set proper permissions
chmod 600 "$CERT_DIR/$DOMAIN.key"
chmod 644 "$CERT_DIR/$DOMAIN.crt"

echo "Done!"