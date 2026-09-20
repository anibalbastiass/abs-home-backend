terraform {
    required_version = ">= 1.5.0"
    required_providers {
        digitalocean = {
            source  = "digitalocean/digitalocean"
            version = "~> 2.34.0"
        }
    }
}

provider "digitalocean" {
    token = var.do_token
}

# DigitalOcean App Platform Service
resource "digitalocean_app" "backend_gateway" {
    spec {
        name   = "${var.app_name}-${var.environment}"
        region = var.region

        service {
            name               = "api"
            environment_slug   = "node-js"
            instance_count     = var.app_instance_count
            instance_size_slug = var.app_instance_size
            http_port          = 3000

            image {
                registry_type = "DOCR"
                repository    = var.docr_repository
                tag           = var.image_tag
            }

            routes {
                path = "/"
            }

            health_check {
                http_path             = "/health/live"
                initial_delay_seconds = 10
                period_seconds        = 10
                timeout_seconds       = 5
                success_threshold     = 1
                failure_threshold     = 3
            }

            env {
                key   = "NODE_ENV"
                value = var.environment
                type  = "GENERAL"
            }

            env {
                key   = "PORT"
                value = "3000"
                type  = "GENERAL"
            }

            env {
                key   = "API_SECRET_KEY"
                value = var.api_secret_key
                type  = "SECRET"
            }

            # Database Connection Strings (referencing managed clusters)
            env {
                key   = "DATABASE_URL"
                value = digitalocean_database_cluster.postgres.uri
                type  = "SECRET"
            }

            env {
                key   = "REDIS_URL"
                value = digitalocean_database_cluster.redis.uri
                type  = "SECRET"
            }

            # IoT Vendor Environment Variables
            env {
                key   = "HUE_BRIDGE_IP"
                value = var.hue_bridge_ip
                type  = "GENERAL"
            }

            env {
                key   = "HUE_API_KEY"
                value = var.hue_api_key
                type  = "SECRET"
            }

            env {
                key   = "NEST_PROJECT_ID"
                value = var.nest_project_id
                type  = "GENERAL"
            }

            env {
                key   = "NEST_CLIENT_ID"
                value = var.nest_client_id
                type  = "GENERAL"
            }

            env {
                key   = "NEST_CLIENT_SECRET"
                value = var.nest_client_secret
                type  = "SECRET"
            }

            env {
                key   = "NEST_REFRESH_TOKEN"
                value = var.nest_refresh_token
                type  = "SECRET"
            }

            env {
                key   = "SWITCHBOT_OPEN_TOKEN"
                value = var.switchbot_open_token
                type  = "SECRET"
            }

            env {
                key   = "SWITCHBOT_SECRET_KEY"
                value = var.switchbot_secret_key
                type  = "SECRET"
            }

            env {
                key   = "RING_REFRESH_TOKEN"
                value = var.ring_refresh_token
                type  = "SECRET"
            }

            env {
                key   = "BLINK_USERNAME"
                value = var.blink_username
                type  = "GENERAL"
            }

            env {
                key   = "BLINK_PASSWORD"
                value = var.blink_password
                type  = "SECRET"
            }
        }
    }
}
