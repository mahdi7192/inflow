#!/usr/bin/env bash
# Inflow Daily Site Crawler
# Scheduled daily for dawn/midnight IRST (03:00 AM Tehran / 23:30 UTC)

LOG_FILE="/workspace/projects/inflow/logs/daily_crawl.log"
echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting scheduled daily crawl for Inflow accounts..."

# Call local cron endpoint with timeout of 30 minutes
RESPONSE=$(curl -s -m 1800 -X POST http://127.0.0.1:3005/api/cron/crawl)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Crawl completed successfully: $RESPONSE"
else
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Crawl failed with exit code $EXIT_CODE"
fi
