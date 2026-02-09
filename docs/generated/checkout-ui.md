# Module Golden Path: checkout-ui

        - **Module name**: `checkout-ui`
        - **Module type**: `frontend`
        - **Risk tier**: `medium`
        - **Primary owners**: `@team/checkout-ui-owners` (replace)
        - **Secondary owners**: `@team/platform-owners` (replace)

        ## Required checks (PR + stage + prod)
        - [ ] lint
- [ ] unit
- [ ] component
- [ ] e2e-smoke
- [ ] accessibility-smoke
- [ ] sast
- [ ] dependency-scan

        ## Gate expectations

        ### Stage promotion
        - **minPassRate**: `0.95`
- **maxCriticalFindings**: `0`
- **requiresVisualSmoke**: `True`

        ### Production promotion
        - **minPassRate**: `0.98`
- **maxCriticalFindings**: `0`
- **requiresRollbackPlan**: `True`
- **requiresApprovalRoles**: `['frontend-owner', 'platform-owner']`

        ## CODEOWNERS placeholder
        ```text
        /checkout-ui/ @team/checkout-ui-owners @team/platform-owners
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
