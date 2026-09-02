FROM nginx:alpine

RUN apk add --no-cache postgresql-client curl bash tzdata

COPY backup.sh /scripts/backup.sh
COPY entrypoint.sh /scripts/entrypoint.sh
RUN chmod +x /scripts/backup.sh /scripts/entrypoint.sh

ENTRYPOINT ["/scripts/entrypoint.sh"]
