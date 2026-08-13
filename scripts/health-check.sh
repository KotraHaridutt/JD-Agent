#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

DEPLOYMENT_URL="$1"

if [ -z "$DEPLOYMENT_URL" ]; then
  echo "Error: Deployment URL argument is missing."
  echo "Usage: ./scripts/health-check.sh <deployment_url>"
  exit 1
fi

# Strip trailing slash if present
DEPLOYMENT_URL="${DEPLOYMENT_URL%/}"
TARGET_URL="${DEPLOYMENT_URL}/api/analyze"

echo "Starting health check against: ${TARGET_URL}"

MAX_RETRIES=3
RETRY_INTERVAL=10
ATTEMPT=1
SUCCESS=0

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo "Health check attempt ${ATTEMPT}/${MAX_RETRIES}..."
  
  # Fetch HTTP status code
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$TARGET_URL" || echo "000")
  
  echo "HTTP Status Code received: ${HTTP_STATUS}"
  
  if [ "$HTTP_STATUS" -eq 405 ]; then
    echo "SUCCESS: Serverless function is operational and returned 405 Method Not Allowed as expected for GET requests."
    SUCCESS=1
    break
  else
    echo "WARNING: Expected 405, got ${HTTP_STATUS}."
  fi
  
  if [ $ATTEMPT -lt $MAX_RETRIES ]; then
    echo "Waiting ${RETRY_INTERVAL} seconds before retrying..."
    sleep $RETRY_INTERVAL
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $SUCCESS -ne 1 ]; then
  echo "========================================================================"
  echo "FAILURE: Post-deployment health check failed after ${MAX_RETRIES} attempts!"
  echo "Target URL: ${TARGET_URL}"
  echo "Expected HTTP Status: 405 (Method Not Allowed)"
  echo "Last Received Status: ${HTTP_STATUS}"
  echo "========================================================================"
  echo "ROLLBACK INSTRUCTIONS:"
  echo "To rollback to the previous deployment, run:"
  echo "  vercel rollback --token=\$VERCEL_TOKEN"
  echo "Or use the Vercel Dashboard to revert to the previous successful deployment."
  echo "========================================================================"
  exit 1
fi

exit 0
