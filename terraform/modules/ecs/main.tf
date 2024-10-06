resource "aws_ecr_repository" "credex_core" {
  name = "credex-core-${var.environment}"

  tags = var.common_tags
}

resource "aws_ecs_cluster" "credex_cluster" {
  name = "credex-cluster-${var.environment}"

  tags = var.common_tags
}

resource "aws_ecs_task_definition" "credex_core_task" {
  family                   = "credex-core-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "credex-core"
      image = "${aws_ecr_repository.credex_core.repository_url}:latest"
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "LOG_LEVEL", value = var.environment == "production" ? "info" : "debug" },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      secrets = [
        { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn },
        { name = "WHATSAPP_BOT_API_KEY", valueFrom = var.whatsapp_bot_api_key_arn },
        { name = "OPEN_EXCHANGE_RATES_API", valueFrom = var.open_exchange_rates_api_arn },
        { name = "NEO_4J_LEDGER_SPACE_BOLT_URL", valueFrom = var.neo4j_ledger_space_bolt_url_arn },
        { name = "NEO_4J_LEDGER_SPACE_USER", valueFrom = var.neo4j_ledger_space_user_arn },
        { name = "NEO_4J_LEDGER_SPACE_PASS", valueFrom = var.neo4j_ledger_space_pass_arn },
        { name = "NEO_4J_SEARCH_SPACE_BOLT_URL", valueFrom = var.neo4j_search_space_bolt_url_arn },
        { name = "NEO_4J_SEARCH_SPACE_USER", valueFrom = var.neo4j_search_space_user_arn },
        { name = "NEO_4J_SEARCH_SPACE_PASS", valueFrom = var.neo4j_search_space_pass_arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/credex-core-${var.environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = var.common_tags
}

resource "aws_ecs_service" "credex_core_service" {
  name            = "credex-core-service-${var.environment}"
  cluster         = aws_ecs_cluster.credex_cluster.id
  task_definition = aws_ecs_task_definition.credex_core_task.arn
  launch_type     = "FARGATE"
  desired_count   = var.service_desired_count

  network_configuration {
    subnets          = var.subnet_ids
    assign_public_ip = true
    security_groups  = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "credex-core"
    container_port   = 5000
  }

  tags = var.common_tags
}

resource "aws_security_group" "ecs_tasks" {
  name        = "credex-core-ecs-tasks-sg-${var.environment}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = var.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 5000
    to_port         = 5000
    security_groups = [var.alb_security_group_id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.common_tags
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "parameter_store_access" {
  name = "parameter-store-access-policy"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          var.jwt_secret_arn,
          var.whatsapp_bot_api_key_arn,
          var.open_exchange_rates_api_arn,
          var.neo4j_ledger_space_bolt_url_arn,
          var.neo4j_ledger_space_user_arn,
          var.neo4j_ledger_space_pass_arn,
          var.neo4j_search_space_bolt_url_arn,
          var.neo4j_search_space_user_arn,
          var.neo4j_search_space_pass_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/credex-core-${var.environment}"
  retention_in_days = 30

  tags = var.common_tags
}