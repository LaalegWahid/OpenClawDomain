resource "aws_efs_file_system" "agents" {
  encrypted = true
  tags = { Name = "${var.app_name}-agents-efs" }
}

resource "aws_security_group" "efs" {
  name   = "${var.app_name}-efs-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_efs_mount_target" "agents" {
  count           = 2
  file_system_id  = aws_efs_file_system.agents.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "agents" {
  file_system_id = aws_efs_file_system.agents.id
  posix_user {
    gid = 1000
    uid = 1000
  }
  root_directory {
    path = "/agents"
    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }
}