#!/bin/sh
set -e

# Choose the active server config:
#   - full HTTPS config when certificates exist under /etc/nginx/ssl
#   - HTTP-only fallback otherwise so nginx can start before certs are
#     provisioned (see docker/nginx/ssl/*.sh)
CRT="/etc/nginx/ssl/champey.com.crt"
KEY="/etc/nginx/ssl/champey.com.key"
TARGET=/etc/nginx/conf.d/default.conf

if [ -f "$CRT" ] && [ -f "$KEY" ]; then
  echo "[nginx] TLS certificates found - using HTTPS config"
  cp /etc/nginx/templates/default.conf "$TARGET"
else
  echo "[nginx] No TLS certificates found - using HTTP-only config"
  cp /etc/nginx/templates/http-only.conf "$TARGET"
fi

exec nginx -g 'daemon off;'
