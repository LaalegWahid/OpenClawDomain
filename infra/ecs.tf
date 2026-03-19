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
  default_capacity_provider_strategy {
    base              = 0
    weight            = 3
    capacity_provider = "FARGATE_SPOT"
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
  # Agent containers talk to each other internally
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
    cpu_architecture        = "ARM64"  # Graviton — cheaper
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
      { name = "NODE_ENV",   value = "production" },
      { name = "AWS_REGION", value = var.region }
    ]

    secrets = [
      { name = "DATABASE_URL",            valueFrom = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::" },
      { name = "REDIS_URL",               valueFrom = "${aws_secretsmanager_secret.app.arn}:REDIS_URL::" },
      { name = "BETTER_AUTH_SECRET",      valueFrom = "${aws_secretsmanager_secret.app.arn}:BETTER_AUTH_SECRET::" },
      { name = "GEMINI_API_KEY",          valueFrom = "${aws_secretsmanager_secret.app.arn}:GEMINI_API_KEY::" },
      { name = "TELEGRAM_BOT_TOKEN",      valueFrom = "${aws_secretsmanager_secret.app.arn}:TELEGRAM_BOT_TOKEN::" },
      { name = "TELEGRAM_BOT_USERNAME",   valueFrom = "${aws_secretsmanager_secret.app.arn}:TELEGRAM_BOT_USERNAME::" },
      { name = "TELEGRAM_WEBHOOK_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:TELEGRAM_WEBHOOK_SECRET::" },
      { name = "ECS_CLUSTER_ARN",         valueFrom = "${aws_secretsmanager_secret.app.arn}:ECS_CLUSTER_ARN::" },
      { name = "PRIVATE_SUBNET_IDS",      valueFrom = "${aws_secretsmanager_secret.app.arn}:PRIVATE_SUBNET_IDS::" },
      { name = "ECS_TASKS_SG_ID",         valueFrom = "${aws_secretsmanager_secret.app.arn}:ECS_TASKS_SG_ID::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.app_name}/app"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "app"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval    = 10
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
  }])
}

# ── Agent task definitions (one per type) ────────────────────
locals {
  agent_types = ["finance", "marketing", "ops"]
}

resource "aws_ecs_task_definition" "agent" {
  for_each                 = toset(local.agent_types)
  family                   = "${var.app_name}-agent-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  # EFS — agent memory persists across restarts
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
      containerPath = "/home/node/.openclaw"
      readOnly      = false
    }]

    environment = [
      { name = "AGENT_TYPE", value = each.key },
      { name = "AGENT_ID",   value = "RUNTIME_OVERRIDE" }
    ]

    secrets = [
      { name = "GEMINI_API_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:GEMINI_API_KEY::" }
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

# ── ECS Service (Next.js always running) ─────────────────────
resource "aws_ecs_service" "app" {
  name                   = "${var.app_name}-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.app.arn
  desired_count          = 2
  enable_execute_command = true

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 1
    weight            = 1
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    base              = 0
    weight            = 3
  }

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

# ── Auto scaling ──────────────────────────────────────────────
resource "aws_appautoscaling_target" "app" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "app_requests" {
  name               = "${var.app_name}-scale-requests"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 100
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "app_memory" {
  name               = "${var.app_name}-scale-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}