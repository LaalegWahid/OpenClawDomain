resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = "FARGATE"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name   = "${var.app_name}-ecs-tasks-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port = 18789
    to_port   = 18789
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.app_name}/app"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "agents" {
  name              = "/ecs/${var.app_name}/agents"
  retention_in_days = 14
}

resource "aws_ecr_repository" "app" {
  name                 = "${var.app_name}-app"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "agent" {
  name                 = "${var.app_name}-agent"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

# ── Next.js app task ──────────────────────────────────────────
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",           value = "production" },
      { name = "AWS_REGION",         value = var.region },
      { name = "ECS_CLUSTER_ARN",    value = aws_ecs_cluster.main.arn },
      { name = "PRIVATE_SUBNET_IDS", value = join(",", aws_subnet.private[*].id) },
      { name = "PUBLIC_SUBNET_IDS",  value = join(",", aws_subnet.public[*].id) },
      { name = "ECS_TASKS_SG_ID",    value = aws_security_group.ecs_tasks.id },
    ]

    secrets = [
      { name = "DATABASE_URL",            valueFrom = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::" },
      { name = "BETTER_AUTH_SECRET",      valueFrom = "${aws_secretsmanager_secret.app.arn}:BETTER_AUTH_SECRET::" },
      { name = "GEMINI_API_KEY",          valueFrom = "${aws_secretsmanager_secret.app.arn}:GEMINI_API_KEY::" },
      { name = "TELEGRAM_BOT_TOKEN",      valueFrom = "${aws_secretsmanager_secret.app.arn}:TELEGRAM_BOT_TOKEN::" },
      { name = "TELEGRAM_BOT_USERNAME",   valueFrom = "${aws_secretsmanager_secret.app.arn}:TELEGRAM_BOT_USERNAME::" },
      { name = "TELEGRAM_WEBHOOK_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:TELEGRAM_WEBHOOK_SECRET::" },
      { name = "GATEWAY_TOKEN",           valueFrom = "${aws_secretsmanager_secret.app.arn}:GATEWAY_TOKEN::" },
      { name = "WEBHOOK_BASE_URL",        valueFrom = "${aws_secretsmanager_secret.app.arn}:WEBHOOK_BASE_URL::" },
      { name = "STRIPE_SECRET_KEY",       valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_SECRET_KEY::" },
      { name = "STRIPE_WEBHOOK_SECRET",   valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_WEBHOOK_SECRET::" },
      { name = "STRIPE_PRICE_ID",         valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_PRICE_ID::" },
      { name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY::" },
      { name = "CRON_SECRET",             valueFrom = "${aws_secretsmanager_secret.app.arn}:CRON_SECRET::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.app_name}/app"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "app"
      }
    }
  }])
}

# ── Agent task definitions ────────────────────────────────────
locals {
  agent_types = ["finance", "marketing", "operations"]
}

resource "aws_ecs_task_definition" "agent" {
  for_each                 = toset(local.agent_types)
  family                   = "${var.app_name}-agent-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 4096
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  volume {
    name = "agent-workspace"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.agents.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.agents.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name      = "agent"
    image     = "${aws_ecr_repository.agent.repository_url}:latest"
    essential = true

    mountPoints = [{
      sourceVolume  = "agent-workspace"
      # EFS access point /agents mounts here
      # OPENCLAW_HOME env var then points to a subdir: /home/node/.openclaw/{userId}/{agentId}
      containerPath = "/home/node/.openclaw"
      readOnly      = false
    }]

    environment = [
      { name = "AGENT_TYPE", value = each.key },
      # AGENT_ID and OPENCLAW_HOME are injected at runtime via RunTask overrides
      { name = "AGENT_ID",      value = "__INJECTED_AT_RUNTIME__" },
      { name = "OPENCLAW_HOME", value = "__INJECTED_AT_RUNTIME__" },
    ]

    secrets = [
      { name = "GEMINI_API_KEY",    valueFrom = "${aws_secretsmanager_secret.app.arn}:GEMINI_API_KEY::" },
      { name = "ANTHROPIC_API_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:ANTHROPIC_API_KEY::" },
      { name = "GATEWAY_TOKEN",     valueFrom = "${aws_secretsmanager_secret.app.arn}:GATEWAY_TOKEN::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.app_name}/agents"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = each.key
      }
    }
  }])
}

# ── ECS Service ───────────────────────────────────────────────
resource "aws_ecs_service" "app" {
  name                   = "${var.app_name}-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.app.arn
  desired_count          = 1
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}