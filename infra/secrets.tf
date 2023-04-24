
variable "reddit_api_app_id" {
  sensitive = true
  nullable  = false
}
module "reddit_api_app_id" {
  source = "./secret"

  secret_name  = "reddit_api_app_id"
  secret_value = var.reddit_api_app_id
  role_name    = aws_iam_role.lambda_role.name
}

variable "reddit_api_app_secret" {
  sensitive = true
  nullable  = false
}
module "reddit_api_app_secret" {
  source = "./secret"

  secret_name  = "reddit_api_app_secret"
  secret_value = var.reddit_api_app_secret
  role_name    = aws_iam_role.lambda_role.name
}

variable "reddit_api_poster_user" {
  sensitive = true
  nullable  = false
}
module "reddit_api_poster_user" {
  source = "./secret"

  secret_name  = "reddit_api_poster_user"
  secret_value = var.reddit_api_poster_user
  role_name    = aws_iam_role.lambda_role.name
}

variable "reddit_api_poster_password" {
  sensitive = true
  nullable  = false
}
module "reddit_api_poster_password" {
  source = "./secret"

  secret_name  = "reddit_api_poster_password"
  secret_value = var.reddit_api_poster_password
  role_name    = aws_iam_role.lambda_role.name
}

variable "reddit_api_poster_otp_key" {
  sensitive = true
  nullable  = false
}
module "reddit_api_poster_otp_key" {
  source = "./secret"

  secret_name  = "reddit_api_poster_otp_key"
  secret_value = var.reddit_api_poster_otp_key
  role_name    = aws_iam_role.lambda_role.name
}

variable "mastodon_api_token" {
  sensitive = true
  nullable  = false
}
module "mastodon_api_token" {
  source = "./secret"

  secret_name  = "mastodon_api_token"
  secret_value = var.mastodon_api_token
  role_name    = aws_iam_role.lambda_role.name
}

