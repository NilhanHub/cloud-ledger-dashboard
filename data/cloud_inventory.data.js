window.CLOUD_DASHBOARD_DATA = {
  status: "SYNTHETIC_DEMO",
  collection_status: "SYNTHETIC_DEMO",
  generated_at: "2026-01-01T00:00:00Z",
  collector_version: "public-demo",
  collector_run_id: "demo-run-001",
  selected_account: "all",
  accounts: [
    {
      email: "demo@example.test",
      selected: true,
      status: "DEMO",
      gcloud_active: false,
      gcloud_authenticated: false,
      firebase_authenticated: false,
      projects_count: 1,
      firebase_projects_count: 1,
      billing_accounts_count: 1,
      unavailable_sections_count: 1,
      notes: ["Synthetic employer-facing demonstration data"]
    }
  ],
  projects: [
    {
      account_email: "demo@example.test",
      project_id: "demo-ai-platform",
      project_number: "000000000001",
      display_name: "Demo AI Platform",
      lifecycle_state: "ACTIVE",
      billing_account_linked: true,
      billing_account_name: "Demo Billing",
      firebase_project_detected: true,
      labels: { environment: "demo" },
      last_seen: "2026-01-01T00:00:00Z"
    }
  ],
  project_profiles: [
    {
      account_email: "demo@example.test",
      project_id: "demo-ai-platform",
      display_name: "Demo AI Platform",
      environment: "demo",
      lifecycle_state: "ACTIVE",
      business_app_id: "demo-app",
      business_app_name: "Demo Intelligence App",
      billing_linked: true,
      billing_account_id: "000000-000000-000000",
      billing_account_name: "Demo Billing",
      currency: "USD",
      current_month_spend: 12.34,
      current_month_gross_cost: 14.0,
      current_month_credits: -1.66,
      current_month_savings: 1.66,
      current_month_spend_available: true,
      previous_month_spend: 10.5,
      previous_month_spend_available: true,
      budget_attached: true,
      budget_amount: 100,
      budget_status: "WITHIN_BUDGET",
      risk_score: 24,
      enabled_api_count: 8,
      cost_risk_apis_count: 3,
      resources_count: 2,
      cost_risk_resources_count: 1,
      firebase_linked: true,
      firebase_projects_count: 1,
      warnings_count: 1,
      blockers_count: 0,
      unavailable_sections_count: 1,
      executive_status: "DEMO_HEALTHY",
      what_it_represents: "Synthetic AI application used to demonstrate the dashboard",
      spend_visibility_status: "VISIBLE",
      spend_visibility_label: "Synthetic spend available",
      blockers: [],
      what_can_cost_money: ["Serverless compute", "database operations"],
      what_is_missing: ["Live authentication by design"]
    }
  ],
  business_apps: [
    {
      app_id: "demo-app",
      display_name: "Demo Intelligence App",
      environment: "demo",
      lifecycle: "ACTIVE",
      business_unit: "Demonstration",
      criticality: "medium",
      google_projects_count: 1,
      firebase_projects_count: 1,
      firebase_apps_count: 1,
      resources_count: 2,
      enabled_apis_count: 8,
      cost_risk_apis_count: 3,
      cost_risk_resources_count: 1,
      visible_monthly_spend: 12.34,
      visible_monthly_spend_available: true,
      visible_monthly_gross_cost: 14.0,
      visible_monthly_credits: -1.66,
      visible_monthly_savings: 1.66,
      projects_without_budget: 0,
      warnings_count: 1,
      blockers_count: 0,
      risk_score: 24,
      confidence: "synthetic-demo",
      notes: ["No real cloud metadata is included"]
    }
  ],
  spend_by_project: [
    {
      account_email: "demo@example.test",
      project_id: "demo-ai-platform",
      display_name: "Demo AI Platform",
      billing_account_id: "000000-000000-000000",
      currency: "USD",
      current_month_spend: 12.34,
      current_month_gross_cost: 14.0,
      current_month_credits: -1.66,
      current_month_savings: 1.66,
      previous_month_spend: 10.5,
      spend_visibility_status: "VISIBLE",
      source_table: "synthetic.demo"
    }
  ],
  spend_by_service: [
    {
      account_email: "demo@example.test",
      billing_account_id: "000000-000000-000000",
      project_id: "demo-ai-platform",
      service_description: "Demo Serverless Compute",
      currency: "USD",
      gross_cost: 9.0,
      credits_amount: -1.0,
      savings: 1.0,
      net_cost: 8.0,
      current_month_spend: 8.0,
      source_table: "synthetic.demo"
    }
  ],
  resource_cost_exposure: [
    {
      account_email: "demo@example.test",
      project_id: "demo-ai-platform",
      business_app_id: "demo-app",
      business_app_name: "Demo Intelligence App",
      resource_type: "serverless_service",
      name: "demo-api",
      location: "example-region1",
      state: "ACTIVE",
      billing_relevance: "COST_RISK",
      cost_class: "usage_based",
      cost_driver_label: "Requests and compute time",
      cost_exposure: "Synthetic usage-based exposure",
      currency: "USD",
      actual_cost_status: "VISIBLE",
      actual_monthly_cost: 8.0,
      actual_monthly_gross_cost: 9.0,
      actual_monthly_savings: 1.0
    }
  ],
  action_needed: [
    {
      id: "demo-budget-review",
      severity: "info",
      subsystem: "budget",
      problem: "Synthetic budget review example",
      current_status: "OPEN",
      why_it_matters: "Demonstrates the operational action ledger",
      exact_fix: "Review the example budget threshold",
      approval_required: false,
      evidence_file: "synthetic-demo"
    }
  ],
  risk_warnings: [
    {
      account_email: "demo@example.test",
      project_id: "demo-ai-platform",
      category: "demo",
      level: "info",
      message: "Synthetic warning used to demonstrate risk visibility"
    }
  ],
  warnings: [],
  billing_accounts: [],
  billing_account_actuals: [],
  billing_export_coverage: [],
  budgets: [],
  services: [],
  quotas: [],
  firebase: [],
  resources: [],
  spend_by_sku: [],
  spend_daily: [],
  spend_by_resource: [],
  business_app_actuals: [],
  attribution_gaps: [],
  unavailable_sections: [
    {
      account_email: "demo@example.test",
      project_id: "demo-ai-platform",
      section: "live_authentication",
      reason: "Disabled in the synthetic public demonstration"
    }
  ],
  cost_summary: {
    currency: "USD",
    visible_monthly_spend: 12.34,
    visible_monthly_gross_cost: 14.0,
    visible_monthly_credits: -1.66,
    visible_monthly_savings: 1.66,
    visible_monthly_spend_available: true,
    spend_visibility_status: "SYNTHETIC",
    spend_visibility_message: "Synthetic demonstration values",
    visible_billing_accounts: 1,
    visible_spend_rows: 1,
    budgets_visible_count: 1,
    budgets_missing_count: 0,
    cost_risk_score: 24,
    cost_risk_services_visible: 0,
    cost_risk_resources_visible: 1,
    cost_risk_firebase_visible: 0,
    cost_risk_warnings: 1,
    forecasted_month_spend: 20
  },
  spend_summary: {
    status: "SYNTHETIC",
    actuals_available: true,
    actuals_source: "synthetic.demo",
    currency: "USD",
    current_month_net_cost: 12.34,
    current_month_gross_cost: 14.0,
    current_month_credits: -1.66,
    current_month_savings: 1.66,
    previous_month_net_cost: 10.5,
    forecasted_month_net_cost: 20,
    projects_with_actuals: 1,
    billing_accounts_with_actuals: 1,
    daily_rows: 0,
    query_tables_count: 1
  },
  executive_summary: {
    projects_count: 1,
    business_apps_count: 1,
    billing_coverage_percent: 100,
    budget_coverage_percent: 100,
    firebase_coverage_percent: 100,
    known_monthly_spend: 12.34,
    known_monthly_spend_available: true,
    known_monthly_spend_label: "Synthetic demo spend",
    spend_unavailable_count: 0,
    cost_exposure_score: 24,
    cost_exposure_label: "Low synthetic risk",
    data_confidence_score: 100,
    plain_english_status: "Synthetic data demonstrates the dashboard without exposing cloud metadata",
    highest_risk_apps: [],
    highest_risk_projects: [],
    blockers_requiring_approval: 0,
    cost_risk_surfaces_visible: 1
  },
  data_quality: {
    overall_score: 100,
    coverage_label: "Synthetic complete",
    projects_count: 1,
    apps_count: 1,
    account_coverage: 100,
    scores: {},
    gaps: [],
    what_we_know: ["All values are synthetic"],
    what_we_cannot_see: ["No live cloud state is queried"]
  },
  global_summary: {
    target_accounts: 1,
    accounts_authenticated: 0,
    accounts_unavailable: 1,
    distinct_projects: 1,
    account_project_rows: 1,
    firebase_projects: 1,
    enabled_services: 0,
    quotas: 0,
    resources: 1,
    risk_warnings: 1,
    unavailable_sections: 1,
    visible_cost_risk_resources: 1,
    visible_cost_risk_services: 0,
    visible_cost_risk_firebase_projects: 0
  },
  collector_run_log_summary: {
    run_id: "demo-run-001",
    commands_attempted: 0,
    commands_succeeded: 0,
    commands_failed: 0,
    failures_by_code: {},
    recent_failures: [],
    billing_export_queries_enabled: false,
    max_billing_query_bytes: 0
  },
  auth_context_summary: {
    mode: "synthetic-demo"
  },
  spend_reconciliation: {
    status: "SYNTHETIC",
    message: "No live billing data"
  },
  relationship_graph: {
    nodes: [],
    edges: [],
    summary: {}
  },
  app_registry: {}
};
