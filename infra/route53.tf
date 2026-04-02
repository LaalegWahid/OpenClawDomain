# Only active when hosted_zone_name is set (e.g. staging)
data "aws_route53_zone" "main" {
  count        = var.hosted_zone_name != "" ? 1 : 0
  name         = var.hosted_zone_name
  private_zone = false
}

# ACM certificate DNS validation CNAME record
resource "aws_route53_record" "cert_validation" {
  for_each = var.hosted_zone_name != "" ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# A alias record: var.domain → ALB
resource "aws_route53_record" "app" {
  count   = var.hosted_zone_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
