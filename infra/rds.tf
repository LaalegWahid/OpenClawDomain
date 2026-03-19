resource "aws_security_group" "rds" {
  name   = "${var.app_name}-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier              = "${var.app_name}-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = "db.t4g.small"
  allocated_storage       = 20
  storage_encrypted       = true
  db_name                 = "openclaw"
  username                = "openclaw"
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  multi_az                = true
  skip_final_snapshot     = false
  deletion_protection     = true
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
}

resource "aws_db_instance" "replica" {
  identifier             = "${var.app_name}-db-replica"
  replicate_source_db    = aws_db_instance.main.identifier
  instance_class         = "db.t4g.small"
  publicly_accessible    = false
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.rds.id]
}