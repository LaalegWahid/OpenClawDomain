resource "aws_security_group" "rds" {
  name   = "${var.app_name}-${local.environment}-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-${local.environment}-db-subnet"
  subnet_ids = aws_subnet.public[*].id
}

resource "aws_db_instance" "main" {
  identifier              = "${var.app_name}-${local.environment}-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  storage_encrypted       = true
  db_name                 = "openclaw"
  username                = "openclaw"
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  multi_az                = false
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 1
  publicly_accessible     = true
}