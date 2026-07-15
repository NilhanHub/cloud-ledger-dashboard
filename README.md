# Cloud Ledger Dashboard

Cloud Ledger is an offline-first cloud inventory and cost-risk dashboard for understanding projects, billing visibility, budgets, enabled services, quotas, Firebase surfaces, resources, and operational blind spots.

> [!TIP]
> Read [ENGINEERING_OVERVIEW.md](ENGINEERING_OVERVIEW.md) for the data model, privacy boundary, architecture, and verification story.

## Public-safe demonstration

This repository contains the dashboard engine and a clearly synthetic demonstration payload. It does **not** contain real Google Cloud accounts, project identifiers, billing data, authentication material, raw inventories, diagnostics, or evidence archives.

```powershell
npm ci
npm run build
```

Open `index.html` directly for the offline `file://` experience, or inspect the four-file allowlisted build under `dist/`.

## Private collector boundary

The real collector and operational inventory are maintained separately. A private inventory must never be copied into this public repository. Generate a separately sanitized payload when sharing screenshots or demos.

## License

Public source review is welcome. No reuse license is granted unless a license file is added explicitly.
