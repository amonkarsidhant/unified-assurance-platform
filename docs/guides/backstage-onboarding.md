# Backstage IDP - Developer Quick Start Guide

## What is Backstage?

Backstage is an open platform for building developer portals. It provides a unified UI for:

- **Service Catalog** – Discover and manage all your services
- **TechDocs** – Write, publish, and discover technical documentation
- **Plugins** – Extend with CI/CD, monitoring, security, and more

---

## Getting Started

### 1. Access Backstage

Navigate to your organization's Backstage instance:

```
https://backstage.example.com
```

### 2. Register Your Service

If you already have a service, you can register it by creating a Backstage entity definition in your repository.

#### Option A: Automatic Registration

Add a `catalog-info.yaml` file to your repository root:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  description: My awesome service
  tags:
    - service
    - api
spec:
  type: service
  lifecycle: production
  owner: my-team
```

Backstage will automatically detect and register the service.

#### Option B: Manual Registration

Go to **Create → Register Existing Component** and paste your repository URL.

### 3. Write Technical Docs

Add TechDocs to your service:

1. Create a `docs/` directory in your repository
2. Add an `index.md` file (this is your entry point)
3. Configure `mkdocs.yml` for custom navigation

Example `mkdocs.yml`:

```yaml
site_name: My Service
nav:
  - Home: index.md
  - API: api.md
  - Runbook: runbook.md
```

### 4. View Your Service

Once registered, your service will appear in the catalog with:

- API documentation
- SLO/dashboard links
- CI/CD status
- On-call information
- Runbooks

---

## Creating a New Service

Use the Backstage template to scaffold a new service:

1. Click **Create → New Service**
2. Fill in the service name, description, and owner
3. Backstage will generate:
   - Repository structure
   - CI/CD pipelines
   - Basic tests
   - Catalog entry
   - Documentation skeleton

---

## Common Tasks

### Adding API Documentation

Add OpenAPI spec to your service:

```yaml
spec:
  providesApis:
    - example-api
```

### Adding Monitoring

Annotate your service for Prometheus scraping:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
```

### Linking Runbooks

```yaml
annotations:
  opsgenie.com/runbook-url: "https://wiki.example.com/runbooks/my-service"
```

---

## Troubleshooting

### Service Not Appearing

1. Check that `catalog-info.yaml` is in the repository root
2. Verify the YAML is valid
3. Check Backstage logs for registration errors

### Docs Not Building

1. Ensure `mkdocs.yml` is present
2. Check that all linked files exist
3. Verify TechDocs configuration in Backstage

---

## Next Steps

- [ ] Register your existing services
- [ ] Add TechDocs to each service
- [ ] Link dashboards and runbooks
- [ ] Configure alerts and on-call

---

## Support

- Slack: #backstage-help
- Email: platform-team@example.com
