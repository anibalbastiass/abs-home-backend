---
id: terraform
title: 🌍 Terraform Infrastructure as Code
sidebar_label: 🌍 Terraform (IaC)
---

# 🌍 Terraform Infrastructure as Code

All cloud infrastructure on **DigitalOcean** is defined declaratively using **Terraform** (`digitalocean/digitalocean` provider).

---

## 🏛️ Provisioned Resources

- **Droplets / App Platform**: Container runtime with automated health checks.
- **Managed PostgreSQL 16**: High availability cluster with automated daily backups.
- **Managed Redis 7**: Eviction policies and in-memory cache clustering.
- **VPC & Firewalls**: Zero-trust networking restricting database and Redis access exclusively to backend droplets.
- **DNS & SSL**: Automated Let's Encrypt certificates managed via DigitalOcean DNS.

---

## 💻 Terraform Structure

```
terraform/
├── main.tf          # Core provider and droplet resources
├── variables.tf     # Configurable inputs (sensitive secrets marked true)
├── outputs.tf       # Exported endpoints and public IPs
└── environments/
    ├── staging.tfvars
    └── production.tfvars
```

---

## 🚀 Deployment Commands

```bash
cd terraform

# Initialize providers and remote state
terraform init

# Validate configuration syntax
terraform validate

# Plan changes against production
terraform plan -var-file=environments/production.tfvars

# Apply infrastructure changes
terraform apply -var-file=environments/production.tfvars
```
