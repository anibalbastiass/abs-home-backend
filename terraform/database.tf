# Managed PostgreSQL 16 Cluster
resource "digitalocean_database_cluster" "postgres" {
    name       = "abs-postgres-${var.environment}"
    engine     = "pg"
    version    = "16"
    size       = "db-s-1vcpu-1gb"
    region     = var.region
    node_count = 1
}

# PostgreSQL Database
resource "digitalocean_database_db" "abs_database" {
    cluster_id = digitalocean_database_cluster.postgres.id
    name       = "abs_smarthome"
}

# PostgreSQL User
resource "digitalocean_database_user" "abs_user" {
    cluster_id = digitalocean_database_cluster.postgres.id
    name       = "abs_admin"
}

# Managed Valkey / Redis Cluster (BullMQ & Cache)
resource "digitalocean_database_cluster" "redis" {
    name       = "abs-redis-${var.environment}"
    engine     = "valkey"
    version    = "8"
    size       = "db-s-1vcpu-1gb"
    region     = var.region
    node_count = 1
}
