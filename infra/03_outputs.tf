output "alb_dns" {
  description = "ALB DNS — point CloudFront origin here"
  value       = aws_lb.main.dns_name
}

# output "cloudfront_url" {
#   description = "Set WEBHOOK_BASE_URL to this value"
#   value       = "https://${aws_cloudfront_distribution.app.domain_name}"
# }

output "ecr_app_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecr_agent_url" {
  value = aws_ecr_repository.agent.repository_url
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "acm_validation_records" {
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}