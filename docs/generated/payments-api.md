# Module Golden Path: payments-api

        - **Module name**: `payments-api`
        - **Module type**: `api`
        - **Risk tier**: `high`
        - **Primary owners**: `@team/payments-api-owners` (replace)
        - **Secondary owners**: `@team/platform-owners` (replace)

        ## Required checks (PR + stage + prod)
        - [ ] lint
- [ ] unit
- [ ] integration
- [ ] contract
- [ ] backward-compat
- [ ] sast
- [ ] dependency-scan
- [ ] dast-smoke

        ## Gate expectations

        ### Stage promotion
        - **minPassRate**: `0.97`
- **maxCriticalFindings**: `0`
- **requiresSchemaCompatibility**: `True`

        ### Production promotion
        - **minPassRate**: `0.99`
- **maxCriticalFindings**: `0`
- **maxHighFindings**: `0`
- **requiresRollbackPlan**: `True`
- **requiresApprovalRoles**: `['api-owner', 'security-owner', 'platform-owner']`

        ## CODEOWNERS placeholder
        ```text
        /payments-api/ @team/payments-api-owners @team/platform-owners
        ```

        ## Rollout checklist
        - [ ] PR merged with all required checks green
        - [ ] Stage deploy completed
        - [ ] Evidence bundle generated and attached
        - [ ] Rollback plan verified in runbook
        - [ ] Owner approvals recorded
        - [ ] Release train slot confirmed (or approved exception)

        ## Exception workflow checklist
        - [ ] Incident/risk ticket linked
        - [ ] Minimum emergency gate set passed
        - [ ] Required exception approvers signed off
        - [ ] Post-release retro + test-gap follow-up ticket created
