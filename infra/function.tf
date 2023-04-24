
variable "mastodon_api_token" {
  sensitive = true
  nullable  = false
}

locals {
  mastodon_api_base_url = "https://tech.lgbt/"
  lambda_name           = "photo-poster"
  gallery_url           = "https://galleries.ticklethepanda.co.uk/"
  schedule              = "cron(0 15 ? * MON *)"
}

resource "aws_secretsmanager_secret" "mastodon_secret" {
  name = "mastodon-secret"
}

resource "aws_secretsmanager_secret_version" "mastodon_secret" {
  secret_id     = aws_secretsmanager_secret.mastodon_secret.id
  secret_string = var.mastodon_api_token
}

data "aws_iam_policy_document" "lambda_assumed_role_policy" {
  statement {
    sid    = ""
    effect = "Allow"
    principals {
      identifiers = ["lambda.amazonaws.com"]
      type        = "Service"
    }
    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "lambda_role_policy" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["${aws_secretsmanager_secret.mastodon_secret.arn}"]
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "photo-poster-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assumed_role_policy.json

  inline_policy {
    name   = "lambda-get-secrets"
    policy = data.aws_iam_policy_document.lambda_role_policy.json
  }
}


data "archive_file" "main" {
  type        = "zip"
  output_path = "${path.module}/.terraform/archive_files/function.zip"

  source {
    content  = "dummy"
    filename = "dummy.txt"
  }
}

resource "aws_lambda_function" "lambda" {
  filename         = data.archive_file.main.output_path
  source_code_hash = data.archive_file.main.output_base64sha256
  function_name    = local.lambda_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "lib/index.handler"
  runtime          = "nodejs18.x"
  timeout          = 15
  memory_size      = 512

  environment {
    variables = {
      MASTODON_API_TOKEN_ASM_NAME = aws_secretsmanager_secret.mastodon_secret.name
      MASTODON_API_BASE_URL       = local.mastodon_api_base_url
      GALLERY_URL                 = local.gallery_url
    }
  }

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }
}

resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "weekly-photo-poster"
  description         = "Weekly photo poster"
  schedule_expression = local.schedule
}

resource "aws_cloudwatch_event_target" "schedule_lambda" {
  rule      = aws_cloudwatch_event_rule.schedule.name
  target_id = "processing_lambda"
  arn       = aws_lambda_function.lambda.arn
}

resource "aws_lambda_permission" "allow_events_bridge_to_run_lambda" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "events.amazonaws.com"
}
