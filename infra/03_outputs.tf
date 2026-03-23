output "alb_dns" {
  description = "ALB DNS — point CloudFront origin here"
  value       = aws_lb.main.dns_name
}

output "cloudfront_url" {
  description = "Set WEBHOOK_BASE_URL to this value"
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "ecr_app_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecr_agent_url" {
  value = aws_ecr_repository.agent.repository_url
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}