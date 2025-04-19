# Neo4j Browser Proxy Module
# This module sets up an Nginx proxy to route traffic to Neo4j Browser instances

# Create target group for Nginx proxy
resource "aws_lb_target_group" "nginx_proxy" {
  name        = "nginx-proxy-tg-${var.environment}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
    path                = "/health"
    port                = "80"
    matcher             = "200"
  }

  tags = var.common_tags
}

# Create security group for Nginx proxy
resource "aws_security_group" "nginx_proxy" {
  name        = "nginx-proxy-sg-${var.environment}"
  description = "Security group for Nginx proxy"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "nginx-proxy-sg-${var.environment}"
  })
}

# Create IAM role for Nginx proxy
resource "aws_iam_role" "nginx_proxy" {
  name = "nginx-proxy-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Create IAM instance profile for Nginx proxy
resource "aws_iam_instance_profile" "nginx_proxy" {
  name = "nginx-proxy-profile-${var.environment}"
  role = aws_iam_role.nginx_proxy.name
}

# Create EC2 instance for Nginx proxy
resource "aws_instance" "nginx_proxy" {
  # Use the latest Amazon Linux 2 AMI for the specified region
  ami                    = "ami-0a887e401f7654935" # Amazon Linux 2 AMI for af-south-1
  instance_type          = "t3.micro"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.nginx_proxy.id]
  iam_instance_profile   = aws_iam_instance_profile.nginx_proxy.name
  key_name               = var.key_pair_name

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras install nginx1 -y
    systemctl start nginx
    systemctl enable nginx

    # Create Nginx configuration
    cat > /etc/nginx/conf.d/neo4j.conf << 'NGINX_CONF'
    server {
        listen 80;
        server_name localhost;

        # Neo4j Ledger Browser proxy configuration
        location /neo4jbrowser-ledger/ {
            # Authentication temporarily disabled
            # auth_basic "Neo4j Browser Access";
            # auth_basic_user_file /etc/nginx/.htpasswd;
            
            # Proxy to Neo4j Browser
            proxy_pass http://${var.neo4j_ledger_private_ip}:7474/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support for Neo4j Browser
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Handle redirects properly
            proxy_redirect http://localhost/ http://$host/neo4jbrowser-ledger/;
            
            # Modify the response to replace bolt URLs
            sub_filter 'bolt://localhost:7687' 'bolt://${var.neo4j_ledger_private_ip}:7687';
            sub_filter 'neo4j://localhost:7687' 'neo4j://${var.neo4j_ledger_private_ip}:7687';
            sub_filter_once off;
            sub_filter_types application/json;
        }

        # Neo4j Search Browser proxy configuration
        location /neo4jbrowser-search/ {
            # Authentication temporarily disabled
            # auth_basic "Neo4j Search Browser Access";
            # auth_basic_user_file /etc/nginx/.htpasswd;
            
            proxy_pass http://${var.neo4j_search_private_ip}:7474/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Handle redirects properly
            proxy_redirect http://localhost/ http://$host/neo4jbrowser-search/;
            
            # Modify the response to replace bolt URLs
            sub_filter 'bolt://localhost:7687' 'bolt://${var.neo4j_search_private_ip}:7687';
            sub_filter 'neo4j://localhost:7687' 'neo4j://${var.neo4j_search_private_ip}:7687';
            sub_filter_once off;
            sub_filter_types application/json;
        }

        # Standard /browser path redirects to Ledger Browser
        location /browser/ {
            return 302 /neo4jbrowser-ledger/;
        }

        # Health check endpoint
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
    NGINX_CONF

    # Restart Nginx to apply configuration
    systemctl restart nginx
  EOF

  tags = merge(var.common_tags, {
    Name = "nginx-proxy-${var.environment}"
  })
}

# Register Nginx proxy with target group
resource "aws_lb_target_group_attachment" "nginx_proxy" {
  target_group_arn = aws_lb_target_group.nginx_proxy.arn
  target_id        = aws_instance.nginx_proxy.id
  port             = 80
}

# These resources are being kept with count=0 to properly handle state transitions
# They will be removed from the state after the next apply

# Legacy target groups that are being replaced by the nginx proxy
resource "aws_lb_target_group" "neo4j_ledger" {
  count = 0
  name        = "neo4j-ledger-tg-${var.environment}"
  port        = 7474
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_target_group" "neo4j_search" {
  count = 0
  name        = "neo4j-search-tg-${var.environment}"
  port        = 7474
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Legacy target group attachments
resource "aws_lb_target_group_attachment" "neo4j_ledger" {
  count = 0
  target_group_arn = try(aws_lb_target_group.neo4j_ledger[0].arn, "")
  target_id        = var.neo4j_ledger_instance_id
  port             = 7474
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_target_group_attachment" "neo4j_search" {
  count = 0
  target_group_arn = try(aws_lb_target_group.neo4j_search[0].arn, "")
  target_id        = var.neo4j_search_instance_id
  port             = 7474
  
  lifecycle {
    create_before_destroy = true
  }
}

# Legacy auth lambda that is no longer used
resource "aws_lambda_function" "auth_lambda" {
  count = 0
  function_name = "neo4j-browser-auth-${var.environment}"
  role          = "arn:aws:iam::123456789012:role/dummy-role"
  handler       = "index.handler"
  runtime       = "nodejs14.x"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Store the password in AWS Secrets Manager with a new name to avoid conflict
resource "aws_secretsmanager_secret" "neo4j_browser_password" {
  name        = "neo4j-browser-password-${var.environment}-new"
  description = "Password for Neo4j Browser access"
  
  tags = merge(var.common_tags, {
    Name = "neo4j-browser-password-${var.environment}-new"
  })
}

resource "aws_secretsmanager_secret_version" "neo4j_browser_password" {
  secret_id     = aws_secretsmanager_secret.neo4j_browser_password.id
  secret_string = jsonencode({
    username = "admin"
    password = var.browser_auth_password
  })
}

# Create ALB listener rules for Neo4j Browser with simplified login pages
resource "aws_lb_listener_rule" "neo4j_ledger_browser" {
  listener_arn = var.alb_listener_arn
  priority     = 100

  action {
    type = "fixed-response"
    
    fixed_response {
      content_type = "text/html"
      message_body = <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>Neo4j Ledger Browser</title>
  <style>
    body { font-family: sans-serif; margin: 20px; text-align: center; }
    .button { 
      display: inline-block;
      background: #04a0b2; 
      color: white; 
      border: none; 
      padding: 10px 20px; 
      margin: 20px 0; 
      text-decoration: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h2>Neo4j Ledger Browser</h2>
  <p>Click the button below to access the Neo4j Ledger Browser</p>
  <a href="/neo4jbrowser-ledger/" class="button">Access Neo4j Ledger Browser</a>
</body>
</html>
EOF
      status_code = "200"
    }
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-ledger-login"]
    }
  }
}

resource "aws_lb_listener_rule" "neo4j_search_browser" {
  listener_arn = var.alb_listener_arn
  priority     = 110

  action {
    type = "fixed-response"
    
    fixed_response {
      content_type = "text/html"
      message_body = <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>Neo4j Search Browser</title>
  <style>
    body { font-family: sans-serif; margin: 20px; text-align: center; }
    .button { 
      display: inline-block;
      background: #04a0b2; 
      color: white; 
      border: none; 
      padding: 10px 20px; 
      margin: 20px 0; 
      text-decoration: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h2>Neo4j Search Browser</h2>
  <p>Click the button below to access the Neo4j Search Browser</p>
  <a href="/neo4jbrowser-search/" class="button">Access Neo4j Search Browser</a>
</body>
</html>
EOF
      status_code = "200"
    }
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-search-login"]
    }
  }
}

# Create ALB listener rule for Neo4j Browser paths
resource "aws_lb_listener_rule" "neo4j_browser_proxy" {
  listener_arn = var.alb_listener_arn
  priority     = 120

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nginx_proxy.arn
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-*", "/browser*"]
    }
  }
}

# Create ALB listener rules for Neo4j Browser with redirect to login
resource "aws_lb_listener_rule" "neo4j_ledger_browser_redirect" {
  listener_arn = var.alb_listener_arn
  priority     = 140

  action {
    type = "redirect"
    
    redirect {
      path        = "/neo4jbrowser-ledger-login"
      status_code = "HTTP_302"
    }
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-ledger"]
    }
  }
}

resource "aws_lb_listener_rule" "neo4j_search_browser_redirect" {
  listener_arn = var.alb_listener_arn
  priority     = 150

  action {
    type = "redirect"
    
    redirect {
      path        = "/neo4jbrowser-search-login"
      status_code = "HTTP_302"
    }
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-search"]
    }
  }
}
