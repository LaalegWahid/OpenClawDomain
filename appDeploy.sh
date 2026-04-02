#!/bin/bash

set -e

# IMAGE_NAME="openclaw-app"
# ECR_REPO="005965605441.dkr.ecr.us-west-1.amazonaws.com/openclawmanager-app:latest"
# ECS_CLUSTER="openclawmanager-cluster"
# ECS_SERVICE="openclawmanager-service"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}
log "Login"
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 005965605441.dkr.ecr.us-west-1.amazonaws.com
# Build
log "START — Docker build"
docker build --platform linux/arm64 -t "$IMAGE_NAME" -f Dockerfile .
log "END   — Docker build"

# Tag
log "START — Docker tag"
docker tag "$IMAGE_NAME:latest" "$ECR_REPO"
log "END   — Docker tag"

# Push
log "START — Docker push"
docker push "$ECR_REPO"
log "END   — Docker push"

# Deploy
log "START — ECS force deploy"
aws ecs update-service --cluster openclawmanager-cluster --service openclawmanager-service --force-new-deployment --region us-west-1
log "END   — ECS force deploy"

log "All done!"