#!/bin/bash
set -e

ECR_REGISTRY="005965605441.dkr.ecr.us-west-1.amazonaws.com"
ECR_REPO="openclawmanager-app"
CLUSTER="openclawmanager-cluster"
SERVICE="openclawmanager-service"
REGION="us-west-1"

echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

echo "🏗️  Building image..."
docker build --platform linux/arm64 -t openclaw-app -f Dockerfile .

echo "🏷️  Tagging image..."
docker tag openclaw-app:latest $ECR_REGISTRY/$ECR_REPO:latest

echo "📤 Pushing image to ECR..."
docker push $ECR_REGISTRY/$ECR_REPO:latest

echo "🚀 Forcing new ECS deployment..."
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $ECR_REPO \
  --force-new-deployment \
  --region $REGION

echo "✅ Done! Deployment triggered."