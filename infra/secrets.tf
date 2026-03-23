resource "aws_secretsmanager_secret" "app" {
  name = "${var.app_name}/prod"
}
    # DATABASE_URL                       = "postgresql://openclaw:${var.db_password}@${aws_db_instance.main.endpoint}/openclaw"

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://openclaw:${var.db_password}@${aws_db_instance.main.endpoint}/openclaw?sslmode=require"
    BETTER_AUTH_SECRET                 = var.better_auth_secret
    GEMINI_API_KEY                     = var.gemini_api_key
    TELEGRAM_BOT_TOKEN                 = var.telegram_bot_token
    TELEGRAM_BOT_USERNAME              = var.telegram_bot_username
    TELEGRAM_WEBHOOK_SECRET            = var.telegram_webhook_secret
    GATEWAY_TOKEN                      = var.gateway_token
    WEBHOOK_BASE_URL                   = var.webhook_base_url
    STRIPE_SECRET_KEY                  = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET              = var.stripe_webhook_secret
    STRIPE_PRICE_ID                    = var.stripe_price_id
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = var.stripe_publishable_key
    CRON_SECRET                        = var.cron_secret
  })
}