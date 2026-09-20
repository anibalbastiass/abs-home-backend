variable "do_token" {
    description = "DigitalOcean API Personal Access Token"
    type        = string
    sensitive   = true
}

variable "region" {
    description = "DigitalOcean datacenter region"
    type        = string
    default     = "nyc3"
}

variable "environment" {
    description = "Deployment environment (staging or production)"
    type        = string
    default     = "production"
}

variable "app_name" {
    description = "Name of the DigitalOcean App Platform service"
    type        = string
    default     = "abs-home-backend"
}

variable "app_instance_size" {
    description = "Instance size slug for Koa backend container"
    type        = string
    default     = "basic-xxs" # 512MB RAM, 1 vCPU
}

variable "app_instance_count" {
    description = "Number of container instances"
    type        = number
    default     = 1
}

variable "git_branch" {
    description = "Git branch to build and deploy"
    type        = string
    default     = "main"
}

variable "docr_repository" {
    description = "DigitalOcean Container Registry repository"
    type        = string
    default     = "backend"
}

variable "image_tag" {
    description = "Docker image tag to deploy"
    type        = string
    default     = "latest"
}

# Sensitive IoT Vendor Credentials
variable "api_secret_key" {
    description = "JWT Secret for Mobile Gateway Auth"
    type        = string
    sensitive   = true
    default     = "abs_secret_key_production_2026"
}

variable "hue_bridge_ip" {
    description = "Philips Hue Bridge IP"
    type        = string
    default     = ""
}

variable "hue_api_key" {
    description = "Philips Hue API Key"
    type        = string
    sensitive   = true
    default     = ""
}

variable "nest_project_id" {
    description = "Google Nest SDM Project ID"
    type        = string
    default     = ""
}

variable "nest_client_id" {
    description = "Google Nest OAuth Client ID"
    type        = string
    default     = ""
}

variable "nest_client_secret" {
    description = "Google Nest OAuth Client Secret"
    type        = string
    sensitive   = true
    default     = ""
}

variable "nest_refresh_token" {
    description = "Google Nest Refresh Token"
    type        = string
    sensitive   = true
    default     = ""
}

variable "switchbot_open_token" {
    description = "SwitchBot Open Token"
    type        = string
    sensitive   = true
    default     = ""
}

variable "switchbot_secret_key" {
    description = "SwitchBot Secret Key"
    type        = string
    sensitive   = true
    default     = ""
}

variable "ring_refresh_token" {
    description = "Ring Refresh Token"
    type        = string
    sensitive   = true
    default     = ""
}

variable "blink_username" {
    description = "Amazon Blink Account Email"
    type        = string
    default     = ""
}

variable "blink_password" {
    description = "Amazon Blink Account Password"
    type        = string
    sensitive   = true
    default     = ""
}
