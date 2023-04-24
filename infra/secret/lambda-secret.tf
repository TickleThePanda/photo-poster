
variable "secret_name" {
  type      = string
  sensitive = false
  nullable  = false
}

variable "secret_value" {
  type      = string
  sensitive = true
  nullable  = false
}

variable "role_name" {
  type      = string
  sensitive = false
  nullable  = false
}

resource "aws_secretsmanager_secret" "secret" {
  name = var.secret_name
}

resource "aws_secretsmanager_secret_version" "secret" {
  secret_id     = aws_secretsmanager_secret.secret.id
  secret_string = var.secret_value
}

data "aws_iam_policy_document" "policy" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["${aws_secretsmanager_secret.secret.arn}"]
  }
}

resource "aws_iam_policy" "policy" {
  name        = "access-secret-${var.secret_name}"
  description = "Access secret ${var.secret_name}"
  policy      = data.aws_iam_policy_document.policy.json
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = var.role_name
  policy_arn = aws_iam_policy.policy.arn
}

output "secret_name" {
  value = aws_secretsmanager_secret.secret.name
}
