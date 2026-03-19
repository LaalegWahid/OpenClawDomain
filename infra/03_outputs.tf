output "alb_dns" {
  description = "Point your domain CNAME here"
  value       = aws_lb.main.dns_name
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