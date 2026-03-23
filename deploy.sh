#!/bin/bash
set -e

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${BLUE}[deploy]${NC} $1"; }
ok()     { echo -e "${GREEN}[ok]${NC} $1"; }
warn()   { echo -e "${YELLOW}[warn]${NC} $1"; }
fail()   { echo -e "${RED}[fail]${NC} $1"; exit 1; }

# ── Config ───────────────────────────────────────────────────
REGION="us-west-1"
APP_NAME="openclaw"
INFRA_DIR="./infra"

# ── Step 0: Validate required tools ──────────────────────────
log "Checking required tools..."
for tool in aws terraform docker; do
  command -v $tool &>/dev/null || fail "$tool is not installed"
done
ok "All tools present"

# ── Step 1: Terraform init + apply ───────────────────────────
log "Running terraform..."
cd "$INFRA_DIR"

terraform init -input=false

log "Planning..."
terraform plan -input=false -out=tfplan

echo ""
warn "Review the plan above. Press ENTER to apply or Ctrl+C to abort."
read -r

terraform apply -input=false tfplan
ok "Terraform apply complete"

# ── Step 2: Get outputs ───────────────────────────────────────
log "Reading terraform outputs..."
ECR_APP=$(terraform output -raw ecr_app_url)
ECR_AGENT=$(terraform output -raw ecr_agent_url)
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
cd ..

ok "ECR App: $ECR_APP"
ok "ECR Agent: $ECR_AGENT"
ok "CloudFront URL: $CLOUDFRONT_URL"

# ── Step 3: Remind about webhook_base_url ─────────────────────
echo ""
warn "======================================================"
warn "Your CloudFront URL is: $CLOUDFRONT_URL"
warn "If this is your first deploy, update infra/terraform.tfvars:"
warn "  webhook_base_url = \"$CLOUDFRONT_URL\""
warn "Then run: cd infra && terraform apply"
warn "======================================================"
echo ""
echo -n "Is webhook_base_url already set to the correct value? (y/N): "
read -r WEBHOOK_CONFIRMED
if [[ "$WEBHOOK_CONFIRMED" != "y" && "$WEBHOOK_CONFIRMED" != "Y" ]]; then
  warn "Update terraform.tfvars and re-run deploy.sh"
  exit 0
fi

# ── Step 4: ECR login ─────────────────────────────────────────
log "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_APP"
ok "ECR login successful"

# ── Step 5: Build + push app image ───────────────────────────
log "Building app image..."
docker build \
  --platform linux/arm64 \
  -t "${APP_NAME}-app" \
  -f Dockerfile \
  .

docker tag "${APP_NAME}-app:latest" "${ECR_APP}:latest"
log "Pushing app image..."
docker push "${ECR_APP}:latest"
ok "App image pushed"

# ── Step 6: Build + push agent image ─────────────────────────
log "Building agent image..."
docker build \
  --platform linux/arm64 \
  -t "${APP_NAME}-agent" \
  -f Dockerfile.agent \
  .

docker tag "${APP_NAME}-agent:latest" "${ECR_AGENT}:latest"
log "Pushing agent image..."
docker push "${ECR_AGENT}:latest"
ok "Agent image pushed"

# ── Step 7: Force ECS redeploy ────────────────────────────────
log "Triggering ECS service redeployment..."
CLUSTER_ARN=$(cd "$INFRA_DIR" && terraform output -raw ecs_cluster_arn)
aws ecs update-service \
  --cluster "$CLUSTER_ARN" \
  --service "${APP_NAME}-service" \
  --force-new-deployment \
  --region "$REGION" \
  --output text --query "service.serviceName" > /dev/null
ok "ECS redeployment triggered"

# ── Step 8: Run DB migrations ─────────────────────────────────
echo ""
log "Running database migrations..."
warn "Make sure DATABASE_URL is set in your local environment pointing to RDS."
echo -n "Run migrations now? (y/N): "
read -r RUN_MIGRATIONS
if [[ "$RUN_MIGRATIONS" == "y" || "$RUN_MIGRATIONS" == "Y" ]]; then
  npx drizzle-kit migrate
  ok "Migrations complete"
else
  warn "Skipped migrations. Run manually: npx drizzle-kit migrate"
fi

# ── Step 9: Setup Stripe webhook ─────────────────────────────
echo ""
echo -e "${YELLOW}====== Stripe Webhook Setup ======${NC}"
echo "Go to: https://dashboard.stripe.com/webhooks"
echo "Create a webhook pointing to:"
echo "  ${CLOUDFRONT_URL}/api/stripe/webhook"
echo "Listen for events:"
echo "  - checkout.session.completed"
echo "  - customer.subscription.updated"
echo "  - customer.subscription.deleted"
echo "  - invoice.payment_failed"
echo ""
echo "After creating it, copy the webhook signing secret and update:"
echo "  infra/terraform.tfvars → stripe_webhook_secret"
echo "Then re-run: cd infra && terraform apply"
echo -e "${YELLOW}=================================${NC}"

echo ""
ok "Deploy complete!"
echo ""
echo "Your app will be live at: $CLOUDFRONT_URL"
echo "Check ECS logs: aws logs tail /ecs/${APP_NAME}/app --follow --region $REGION"