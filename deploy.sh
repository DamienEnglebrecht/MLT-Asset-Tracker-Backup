#!/bin/bash
# MLT Asset Tracker Deploy Script
# This script updates version.json and deploys to Vercel

set -e

cd /home/maximus/projects/mlt-asset-tracker

# Generate new version
TIMESTAMP=$(date +%s)
DATE_VERSION=$(date +%Y.%m.%d)
BUILD_NUM=${1:-1}
VERSION="${DATE_VERSION}.${BUILD_NUM}"

echo "🚀 Deploying MLT Asset Tracker"
echo "   Version: $VERSION"
echo "   Timestamp: $TIMESTAMP"

# Update version.json
cat > version.json << EOF
{
  "version": "$VERSION",
  "timestamp": $TIMESTAMP,
  "deployed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Update version in index.html
sed -i "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$VERSION'/" index.html
sed -i "s/const CURRENT_VERSION = '[^']*'/const CURRENT_VERSION = '$VERSION'/" index.html
sed -i "s/<meta name=\"app-version\" content=\"[^\"]*\"/<meta name=\"app-version\" content=\"$VERSION\"/" index.html

echo "✅ Version files updated"

# Read Vercel token
VERCEL_TOKEN=$(cat ~/.centurion/secrets/vercel_token.txt)

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
npx vercel --prod --yes --token="$VERCEL_TOKEN"

echo "✅ Deployment complete!"
echo "   Version: $VERSION"

# Optional: Broadcast deploy to Supabase realtime (would need curl + API key)
# This can be done manually or through a webhook
