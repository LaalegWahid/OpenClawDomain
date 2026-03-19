resource "aws_secretsmanager_secret" "app" {
  name = "${var.app_name}/prod"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL            = "postgresql://openclaw:${var.db_password}@${aws_db_instance.main.endpoint}/openclaw"
    DATABASE_READ_URL       = "postgresql://openclaw:${var.db_password}@${aws_db_instance.replica.endpoint}/openclaw"
    REDIS_URL               = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
    BETTER_AUTH_SECRET      = var.better_auth_secret
    GEMINI_API_KEY          = var.gemini_api_key
    TELEGRAM_BOT_TOKEN      = var.telegram_bot_token
    TELEGRAM_BOT_USERNAME   = var.telegram_bot_username
    TELEGRAM_WEBHOOK_SECRET = var.telegram_webhook_secret
    ECS_CLUSTER_ARN         = aws_ecs_cluster.main.arn
    PRIVATE_SUBNET_IDS      = join(",", aws_subnet.private[*].id)
    ECS_TASKS_SG_ID         = aws_security_group.ecs_tasks.id
    AGENT_TASK_DEF_FINANCE  = "${var.app_name}-agent-finance"
    AGENT_TASK_DEF_MARKETING = "${var.app_name}-agent-marketing"
    AGENT_TASK_DEF_OPS      = "${var.app_name}-agent-ops"
  })
}