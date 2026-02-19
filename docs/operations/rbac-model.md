# UAP RBAC Model

> Role-Based Access Control for Enterprise - Issue #91

## Overview

UAP uses role-based access control to manage permissions for different user types.

## Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full system access | All operations |
| **Release Manager** | Promotion decisions | Approve/reject, view all |
| **Developer** | Run assurance | Run checks, view own results |
| **Auditor** | Compliance view | Read-only, export audits |
| **Viewer** | Read-only access | View dashboards only |

## Permission Matrix

| Action | Admin | Release Manager | Developer | Auditor | Viewer |
|--------|-------|-----------------|-----------|---------|--------|
| Run assurance | ✅ | ✅ | ✅ | ❌ | ❌ |
| View results | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve promotion | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reject promotion | ✅ | ✅ | ❌ | ❌ | ❌ |
| Override gates | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audits | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export audits | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage policies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |

## Implementation

### GitHub Teams Integration

UAP uses GitHub Teams for RBAC:

```yaml
# .uap/rbac.yaml
teams:
  admin: "@org/uap-admins"
  release-manager: "@org/uap-release-managers"  
  developer: "@org/uap-developers"
  auditor: "@org/uap-auditors"
  viewer: "@org/uap-viewers"
```

### CI/CD Integration

In GitHub Actions:

```yaml
permissions:
  runs-as: ${{ github.actor }}
  
jobs:
  assurance:
    if: hasPermission('developer')
    # ...
```

## Future

- SSO integration (SAML/OIDC)
- API tokens for automation
- Audit of access decisions

---

Ref: Issue #91
