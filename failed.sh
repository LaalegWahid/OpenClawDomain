#!/bin/bash

set -e

IMAGE_NAME="openclaw-app-stage"
ECR_REPO="005965605441.dkr.ecr.us-east-1.amazonaws.com/openclawmanager-staging-agent:latest"
ECS_CLUSTER="openclawmanager-staging-cluster"
ECS_SERVICE="openclawmanager-staging-service"
PS_STD="005965605441.dkr.ecr.us-east-1.amazonaws.com"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}
log "Login"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$PS_STD"
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
aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE" --force-new-deployment --region us-east-1
log "END   — ECS force deploy"

log "All done!"