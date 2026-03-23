variable "region" {
  default = "eu-north-1"
}

variable "app_name" {
  default = "openclaw"
}

variable "db_password" {
  sensitive = true
}

variable "better_auth_secret" {
  sensitive = true
}

variable "gemini_api_key" {
  sensitive = true
}

variable "telegram_bot_token" {
  sensitive = true
}

variable "telegram_bot_username" {
  sensitive = true
}

variable "telegram_webhook_secret" {
  sensitive = true
}

variable "gateway_token" {
  sensitive = true
}

variable "webhook_base_url" {
  description = "The public HTTPS base URL for Telegram webhooks (CloudFront URL)"
}

variable "stripe_secret_key" {
  sensitive = true
}

variable "stripe_webhook_secret" {
  sensitive = true
}

variable "stripe_price_id" {
  sensitive = true
}

variable "stripe_publishable_key" {
  sensitive = true
}

variable "cron_secret" {
  sensitive = true
}

variable "domain" {
  description = "Your domain e.g. app.yourdomain.com"
}