output "app_id" {
    description = "DigitalOcean App Platform ID"
    value       = digitalocean_app.backend_gateway.id
}

output "live_url" {
    description = "Live HTTPS URL of the ABS Smart Home Backend Gateway"
    value       = digitalocean_app.backend_gateway.live_url
}

output "postgres_host" {
    description = "Managed PostgreSQL Host"
    value       = digitalocean_database_cluster.postgres.host
    sensitive   = true
}

output "redis_host" {
    description = "Managed Redis Host"
    value       = digitalocean_database_cluster.redis.host
    sensitive   = true
}
