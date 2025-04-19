# Neo4j Browser Proxy Module
# This module sets up ALB listener rules to route traffic to Neo4j Browser

# Create target groups for Neo4j instances
resource "aws_lb_target_group" "neo4j_ledger" {
  name        = "neo4j-ledger-tg-${var.environment}"
  port        = 7474
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
    path                = "/"
    port                = "7474"
    matcher             = "200-399"
  }

  tags = var.common_tags
}

resource "aws_lb_target_group" "neo4j_search" {
  name        = "neo4j-search-tg-${var.environment}"
  port        = 7474
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
    path                = "/"
    port                = "7474"
    matcher             = "200-399"
  }

  tags = var.common_tags
}

# Register Neo4j instances with target groups
resource "aws_lb_target_group_attachment" "neo4j_ledger" {
  target_group_arn = aws_lb_target_group.neo4j_ledger.arn
  target_id        = var.neo4j_ledger_instance_id
  port             = 7474
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_target_group_attachment" "neo4j_search" {
  target_group_arn = aws_lb_target_group.neo4j_search.arn
  target_id        = var.neo4j_search_instance_id
  port             = 7474
  
  lifecycle {
    create_before_destroy = true
  }
}

# Authentication has been temporarily removed to fix Terraform errors
# Will be added back later

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

# Create ALB listener rules for Neo4j Browser with direct access (no authentication)
resource "aws_lb_listener_rule" "neo4j_ledger_browser_direct" {
  listener_arn = var.alb_listener_arn
  priority     = 120

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.neo4j_ledger.arn
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-ledger*"]
    }
  }
}

resource "aws_lb_listener_rule" "neo4j_search_browser_direct" {
  listener_arn = var.alb_listener_arn
  priority     = 130

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.neo4j_search.arn
  }

  condition {
    path_pattern {
      values = ["/neo4jbrowser-search*"]
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
