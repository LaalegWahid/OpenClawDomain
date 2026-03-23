variable "region" {
  default = "us-west-1"
}

variable "app_name" {
  default = "openclaw"
}

variable "domain" {
  description = "Your domain e.g. openclaw.app"
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