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
}

resource "aws_lb_target_group_attachment" "neo4j_search" {
  target_group_arn = aws_lb_target_group.neo4j_search.arn
  target_id        = var.neo4j_search_instance_id
  port             = 7474
}

# Create Lambda function for basic auth
resource "aws_iam_role" "lambda_edge_role" {
  name = "neo4j-browser-auth-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "lambda_edge_policy" {
  name = "neo4j-browser-auth-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_edge_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Store the password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "neo4j_browser_password" {
  name        = "neo4j-browser-password-${var.environment}"
  description = "Password for Neo4j Browser access"
  
  tags = merge(var.common_tags, {
    Name = "neo4j-browser-password-${var.environment}"
  })
}

resource "aws_secretsmanager_secret_version" "neo4j_browser_password" {
  secret_id     = aws_secretsmanager_secret.neo4j_browser_password.id
  secret_string = jsonencode({
    username = "admin"
    password = var.browser_auth_password
  })
}

# Create Lambda function for ALB authentication
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda_function.zip"

  source {
    content = <<EOF
exports.handler = async (event, context) => {
    console.log('Authentication request:', JSON.stringify(event));
    
    try {
        // Get the Authorization header from the request
        const authHeader = event.headers.authorization || event.headers.Authorization;
        
        // Get credentials from environment variables
        const expectedUser = process.env.AUTH_USERNAME;
        const expectedPass = process.env.AUTH_PASSWORD;
        
        // Construct the expected Basic Auth string
        const expectedAuthString = 'Basic ' + Buffer.from(expectedUser + ':' + expectedPass).toString('base64');
        
        // Check if the Authorization header matches
        if (!authHeader || authHeader !== expectedAuthString) {
            // If no auth header or invalid credentials, return 401 Unauthorized
            return {
                isAuthorized: false,
                context: {
                    message: 'Unauthorized'
                }
            };
        }
        
        // If authentication passed, return success
        return {
            isAuthorized: true,
            context: {
                user: expectedUser
            }
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            isAuthorized: false,
            context: {
                message: 'Error during authentication'
            }
        };
    }
};
EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "auth_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "neo4j-browser-auth-${var.environment}"
  role             = aws_iam_role.lambda_edge_role.arn
  handler          = "index.handler"
  runtime          = "nodejs14.x"
  publish          = true
  
  environment {
    variables = {
      AUTH_USERNAME = "admin"
      AUTH_PASSWORD = var.browser_auth_password
    }
  }
  
  tags = var.common_tags
}

# Create Lambda permission for ALB
resource "aws_lambda_permission" "alb_auth_permission" {
  statement_id  = "AllowExecutionFromALB"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_lambda.function_name
  principal     = "elasticloadbalancing.amazonaws.com"
}

# Create ALB listener rules for Neo4j Browser with fixed-response for authentication
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
  <title>Neo4j Ledger Browser Authentication</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    h1 { color: #04a0b2; }
    input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
    button { background-color: #04a0b2; color: white; padding: 10px 15px; border: none; cursor: pointer; }
    .error { color: red; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Neo4j Ledger Browser</h1>
    <p>Please enter your credentials to access the Neo4j Ledger Browser:</p>
    <div id="error" class="error">Invalid username or password</div>
    <form id="auth-form">
      <div>
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required>
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">Login</button>
    </form>
  </div>
  
  <script>
    document.getElementById('auth-form').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      // Create Basic Auth header
      const authHeader = 'Basic ' + btoa(username + ':' + password);
      
      // Redirect to the actual Neo4j Browser with the auth header
      fetch('/neo4jbrowser-ledger/', {
        headers: {
          'Authorization': authHeader
        }
      })
      .then(response => {
        if (response.ok) {
          window.location.href = '/neo4jbrowser-ledger/';
        } else {
          document.getElementById('error').style.display = 'block';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        document.getElementById('error').style.display = 'block';
      });
    });
  </script>
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
  <title>Neo4j Search Browser Authentication</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    h1 { color: #04a0b2; }
    input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
    button { background-color: #04a0b2; color: white; padding: 10px 15px; border: none; cursor: pointer; }
    .error { color: red; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Neo4j Search Browser</h1>
    <p>Please enter your credentials to access the Neo4j Search Browser:</p>
    <div id="error" class="error">Invalid username or password</div>
    <form id="auth-form">
      <div>
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required>
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">Login</button>
    </form>
  </div>
  
  <script>
    document.getElementById('auth-form').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      // Create Basic Auth header
      const authHeader = 'Basic ' + btoa(username + ':' + password);
      
      // Redirect to the actual Neo4j Browser with the auth header
      fetch('/neo4jbrowser-search/', {
        headers: {
          'Authorization': authHeader
        }
      })
      .then(response => {
        if (response.ok) {
          window.location.href = '/neo4jbrowser-search/';
        } else {
          document.getElementById('error').style.display = 'block';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        document.getElementById('error').style.display = 'block';
      });
    });
  </script>
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

# Create ALB listener rules for Neo4j Browser with authentication check
resource "aws_lb_listener_rule" "neo4j_ledger_browser_auth" {
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

  condition {
    http_header {
      http_header_name = "Authorization"
      values           = ["*"]
    }
  }
}

resource "aws_lb_listener_rule" "neo4j_search_browser_auth" {
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

  condition {
    http_header {
      http_header_name = "Authorization"
      values           = ["*"]
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
      values = ["/neo4jbrowser-ledger*"]
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
      values = ["/neo4jbrowser-search*"]
    }
  }
}


output "neo4j_browser_credentials" {
  description = "Credentials for accessing the Neo4j Browser"
  value       = {
    username = "admin"
    password = var.browser_auth_password
  }
  sensitive = true
}
