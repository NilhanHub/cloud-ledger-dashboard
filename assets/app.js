(function () {
  const data = window.CLOUD_DASHBOARD_DATA || {};
  const TARGETS = ["platform@example.test", "finance@example.test", "operations@example.test"];
  const state = { 
    account: "all", 
    app: "all",
    environment: "all",
    search: "",
    activeFilter: "cost-risk",
    drawer: null,
    tables: {} 
  };
  
  const $ = (id) => document.getElementById(id);
  const arr = (value) => Array.isArray(value) ? value : [];
  const text = (value) => value === null || value === undefined || value === "" ? "unavailable" : String(value);
  const esc = (value) => text(value).replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  const norm = (value) => value === null || value === undefined ? "" : String(value).toLowerCase();
  const accountOf = (row) => row && (row.account_email || row.email || "global");
  const projectProfilesAll = () => arr(data.project_profiles);
  const businessAppsAll = () => arr(data.business_apps);
  const appForProject = (projectId) => {
    const profile = projectProfilesAll().find((p) => p.project_id === projectId);
    return profile ? profile.business_app_id : "";
  };
  const environmentForProject = (projectId) => {
    const profile = projectProfilesAll().find((p) => p.project_id === projectId);
    return profile ? profile.environment : "";
  };
  const rowAppId = (row) => row && (row.business_app_id || row.app_id || row.current_business_app_id || appForProject(row.project_id));
  const rowEnvironment = (row) => row && (row.environment || environmentForProject(row.project_id));
  const matchesAccount = (row) => state.account === "all" || accountOf(row) === state.account;
  const searchableValue = (row) => {
    if (!row) return "";
    const fields = [
      row.display_name,
      row.business_app_name,
      row.app_id,
      row.business_app_id,
      row.project_id,
      row.account_email,
      row.email,
      row.name,
      row.resource_type,
      row.service_name,
      row.title,
      row.category,
      row.subsystem,
      row.problem,
      row.reason,
      row.executive_summary,
      row.mapping_explanation,
      row.mapped_google_projects,
      row.mapped_firebase_projects,
      row.mapped_firebase_apps,
      row.firebase_linked_projects,
      row.firebase_web_apps,
      row.firebase_android_apps,
      row.firebase_ios_apps,
      row.firebase_hosting_sites,
      row.firebase_cost_surfaces,
      row.mapped_resources,
      row.mapped_apis,
      row.cost_driver_labels,
      row.blockers,
      row.top_blockers,
      row.what_it_represents,
      row.what_can_cost_money,
      row.what_is_missing
    ];
    return fields.map(searchText).join(" ").toLowerCase();
  };
  const searchText = (value) => {
    if (Array.isArray(value)) return value.map(searchText).join(" ");
    if (value && typeof value === "object") return Object.values(value).map(searchText).join(" ");
    return text(value);
  };
  const matchesSearch = (row) => !state.search || searchableValue(row).includes(state.search);
  function matchesScope(row) {
    if (!row) return false;
    const profileAccountMatch = state.account === "all" || projectProfilesAll().some((p) => {
      const appId = rowAppId(row);
      if (appId && p.business_app_id === appId && p.account_email === state.account) return true;
      if (row.project_id && p.project_id === row.project_id && p.account_email === state.account) return true;
      return false;
    });
    const accountMatch = state.account === "all" || accountOf(row) === state.account || profileAccountMatch;
    const appMatch = state.app === "all" || rowAppId(row) === state.app;
    const env = rowEnvironment(row);
    const environmentMatch = state.environment === "all" || env === state.environment;
    return accountMatch && appMatch && environmentMatch && matchesSearch(row);
  }
  const filtered = (rows) => arr(rows).filter(matchesScope);
  const uniq = (values) => Array.from(new Set(values.filter(Boolean)));
  const byId = (rows, key, value) => arr(rows).find((row) => text(row && row[key]) === text(value));
  const pageSections = ["boardOverview", "relationshipMap", "applicationPortfolio", "project360", "costExposureCenter", "actionRoom", "dataConfidence", "advancedInventory", "rawSection"];

  const tableDefs = {};

  function getAccounts() {
    const fromData = arr(data.accounts).map((a) => a.email).filter(Boolean);
    return uniq([...TARGETS, ...fromData]);
  }

  function init() {
    hydrateStateFromHash();
    renderAccountSelector();
    renderAppSelector();
    renderEnvironmentSelector();
    syncControlsFromState();
    setupFilters();
    setupExportActions();
    setupGlobalSearch();
    setupNavigation();
    setupDrawer();
    $("accountSelector").addEventListener("change", (event) => {
      state.account = event.target.value;
      commitState();
    });
    $("appSelector").addEventListener("change", (event) => {
      state.app = event.target.value;
      commitState();
    });
    $("environmentSelector").addEventListener("change", (event) => {
      state.environment = event.target.value;
      commitState();
    });
    render();
  }

  function syncControlsFromState() {
    const setValue = (id, value) => {
      const el = $(id);
      if (el && Array.from(el.options || []).some((option) => option.value === value)) el.value = value;
    };
    setValue("accountSelector", state.account);
    setValue("appSelector", state.app);
    setValue("environmentSelector", state.environment);
    const search = $("globalSearch");
    if (search) search.value = state.search;
  }

  function hydrateStateFromHash() {
    const params = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    state.account = params.get("account") || "all";
    state.app = params.get("app") || "all";
    state.environment = params.get("environment") || "all";
    state.activeFilter = params.get("lens") || "cost-risk";
    state.search = norm(params.get("search") || "");
    const drawerType = params.get("drawer");
    const drawerId = params.get("id");
    state.drawer = drawerType && drawerId ? { type: drawerType, id: drawerId } : null;
  }

  function commitState() {
    writeHashState();
    render();
  }

  function writeHashState() {
    const params = new URLSearchParams();
    if (state.account !== "all") params.set("account", state.account);
    if (state.app !== "all") params.set("app", state.app);
    if (state.environment !== "all") params.set("environment", state.environment);
    if (state.activeFilter !== "cost-risk") params.set("lens", state.activeFilter);
    if (state.search) params.set("search", state.search);
    if (state.drawer) {
      params.set("drawer", state.drawer.type);
      params.set("id", state.drawer.id);
    }
    const nextHash = params.toString();
    const nextUrl = window.location.pathname + window.location.search + (nextHash ? "#" + nextHash : "");
    if (window.location.hash.replace(/^#/, "") !== nextHash) window.history.replaceState(null, "", nextUrl);
  }

  function renderAccountSelector() {
    const options = ['<option value="all">All accounts</option>']
      .concat(getAccounts().map((email) => `<option value="${esc(email)}">${esc(email)}</option>`));
    $("accountSelector").innerHTML = options.join("");
  }

  function renderAppSelector() {
    const apps = arr(data.business_apps).slice().sort((a, b) => text(a.display_name).localeCompare(text(b.display_name)));
    const options = ['<option value="all">All business apps</option>']
      .concat(apps.map((app) => `<option value="${esc(app.app_id)}">${esc(app.display_name || app.app_id)}</option>`));
    $("appSelector").innerHTML = options.join("");
  }

  function renderEnvironmentSelector() {
    const environments = uniq(arr(data.project_profiles).map((row) => row.environment || "unknown")).sort();
    const options = ['<option value="all">All environments</option>']
      .concat(environments.map((env) => `<option value="${esc(env)}">${esc(titleLabel(env))}</option>`));
    $("environmentSelector").innerHTML = options.join("");
  }

  function setupFilters() {
    const filters = ["cost-risk", "cost-blockers", "firebase-blockers", "unavailable", "warnings", "known-free"];
    filters.forEach(f => {
      const btn = $(`filter-${f}`);
      if (btn) {
        btn.addEventListener("click", () => {
          filters.forEach(x => {
            const b = $(`filter-${x}`);
            if (b) b.classList.remove("active");
          });
          btn.classList.add("active");
          state.activeFilter = f;
          commitState();
        });
      }
    });
  }

  function setupGlobalSearch() {
    const input = $("globalSearch");
    if (!input) return;
    input.addEventListener("input", () => {
      state.search = norm(input.value);
      commitState();
    });
  }

  function setupNavigation() {
    const navLinks = Array.from(document.querySelectorAll(".rail nav a[href^='#']"));
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      });
    });
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((item) => item.classList.toggle("active", item.getAttribute("href") === `#${visible.target.id}`));
    }, { rootMargin: "-15% 0px -70% 0px", threshold: [0.05, 0.2, 0.5] });
    pageSections.forEach((id) => {
      const section = $(id);
      if (section) observer.observe(section);
    });
  }

  function setupDrawer() {
    const close = () => closeDrawer();
    const backdrop = $("drawerBackdrop");
    if (backdrop) backdrop.addEventListener("click", close);
    document.querySelectorAll("[data-close-drawer]").forEach((button) => button.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.drawer) closeDrawer();
    });
  }

  function setupExportActions() {
    const boardJson = $("exportBoardJson");
    const portfolioCsv = $("exportPortfolioCsv");
    const printSummary = $("printBoardSummary");
    if (boardJson) {
      boardJson.addEventListener("click", () => {
        const rows = scopedRows();
        downloadText("cloud-board-summary.json", JSON.stringify({
          generated_at: data.generated_at,
          scope: currentScope(),
          executive_summary: data.executive_summary,
          data_quality: data.data_quality,
          highest_risk_apps: rows.businessApps.slice(0, 20),
          blockers: rows.businessApps.flatMap((app) => arr(app.top_blockers).map((blocker) => Object.assign({ app_id: app.app_id, app_name: app.display_name }, blocker))).slice(0, 50)
        }, null, 2), "application/json");
      });
    }
    if (portfolioCsv) {
      portfolioCsv.addEventListener("click", () => {
        const rows = scopedRows();
        const csvRows = canonicalProfiles(rows.projectProfiles).map((profile) => ({
          business_app: profile.business_app_name,
          project_id: profile.project_id,
          account: profile.account_email,
          environment: profile.environment,
          billing_account: profile.billing_account_name,
          spend: profile.spend_visibility_label,
          budget: profile.budget_status,
          cost_risk_apis: profile.cost_risk_apis_count,
          resources: profile.resources_count,
          firebase: profile.firebase_linked ? "linked" : "not_visible",
          executive_status: profile.executive_status,
          missing: profile.what_is_missing
        }));
        downloadText("cloud-app-project-portfolio.csv", toCsv(csvRows), "text/csv");
      });
    }
    if (printSummary) {
      printSummary.addEventListener("click", () => window.print());
    }
  }

  function scopedRows() {
    return {
      accounts: filtered(data.accounts),
      projects: filtered(data.projects),
      projectCosts: filtered(data.project_costs),
      billingExportCoverage: filtered(data.billing_export_coverage),
      billingAccounts: filtered(data.billing_accounts),
      budgets: filtered(data.budgets),
      services: filtered(data.services),
      quotas: filtered(data.quotas),
      firebase: filtered(data.firebase),
      resources: filtered(data.resources),
      businessApps: filtered(data.business_apps),
      projectProfiles: filtered(data.project_profiles),
      resourceCostExposure: filtered(data.resource_cost_exposure),
      unavailable: filtered(data.unavailable_sections),
      warnings: filtered(data.risk_warnings || data.warnings),
      spendByProject: filtered(data.spend_by_project),
      spendByService: filtered(data.spend_by_service),
      spendBySku: filtered(data.spend_by_sku),
      spendDaily: filtered(data.spend_daily),
      spendByResource: filtered(data.spend_by_resource),
      billingAccountActuals: filtered(data.billing_account_actuals),
      businessAppActuals: filtered(data.business_app_actuals),
      attributionGaps: filtered(data.attribution_gaps)
    };
  }

  function selectedBillingTarget() {
    const summary = data.cost_summary || {};
    const target = summary.selected_billing_export_target || {};
    if (typeof target === "string") return { target };
    return target || {};
  }

  function isKnownFree(row) {
    return row && (row.billing_relevance === "known_free" || row.cost_visibility === "hidden_known_free");
  }

  function isCostRisk(row) {
    return row && !isKnownFree(row);
  }

  function costScoped(rows) {
    const scoped = arr(rows);
    if (state.activeFilter === "known-free") return scoped.filter(isKnownFree);
    return scoped.filter(isCostRisk);
  }

  function billingTargetLabel(target) {
    if (!target) return "unavailable";
    if (target.project_id && target.dataset_id) return `${target.project_id}.${target.dataset_id}`;
    return target.target || "unavailable";
  }

  function titleLabel(value) {
    const v = text(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
    if (!v || v === "unavailable") return "Unavailable";
    const map = {
      "NOT_CONFIGURED_CONSOLE_ACTION_REQUIRED": "Console approval needed",
      "CONFIGURED_WAITING_FOR_ROWS": "Waiting for rows",
      "TABLES_PRESENT_NO_ROWS": "No spend rows yet",
      "QUERY_BLOCKED": "Query blocked",
      "COST_QUERY_BLOCKED": "Query cost blocked",
      "NOT_QUERIED": "Not queried",
      "UNKNOWN": "Unknown"
    };
    if (map[value]) return map[value];
    return v.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  function metricCard(label, value, detail, tone, options) {
    const safeTone = tone || "neutral";
    const opts = options || {};
    const status = opts.status || statusTextForTone(safeTone);
    const chart = opts.chart === "bars"
      ? miniBars(safeTone)
      : opts.progress !== undefined
        ? progressTrack(opts.progress, safeTone, opts.progressAccent)
        : miniSparkline(safeTone);
    const extra = opts.extra ? `<div class="metric-extra">${opts.extra}</div>` : "";
    const attrs = opts.drillType && opts.drillId
      ? ` data-drill="${esc(opts.drillType)}" data-id="${esc(opts.drillId)}" tabindex="0" role="button"`
      : "";
    return `
      <article class="metric ${safeTone}"${attrs}>
        <div class="metric-top">
          <span class="metric-icon" aria-hidden="true">${iconSvg(opts.icon || iconForLabel(label))}</span>
          <span class="status-pill ${safeTone}">${esc(status)}</span>
        </div>
        <div class="metric-main">
          <span class="metric-label">${esc(label)}</span>
          <strong>${esc(value)}</strong>
        </div>
        ${chart}
        <p>${esc(detail)}</p>
        ${extra}
      </article>
    `;
  }

  function iconForLabel(label) {
    const v = norm(label);
    if (v.includes("visible") || v.includes("spend")) return v.includes("blocked") ? "lock" : "eye";
    if (v.includes("budget")) return "shield";
    if (v.includes("confidence")) return "target";
    if (v.includes("firebase")) return "flame";
    if (v.includes("resource")) return "database";
    if (v.includes("exposure") || v.includes("risk")) return "alert";
    if (v.includes("project")) return "building";
    if (v.includes("app")) return "rocket";
    return "cloud";
  }

  function iconSvg(name) {
    const icons = {
      alert: '<svg viewBox="0 0 24 24"><path d="M12 3 22 20H2L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg>',
      bars: '<svg viewBox="0 0 24 24"><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/></svg>',
      briefcase: '<svg viewBox="0 0 24 24"><path d="M9 7V5h6v2"/><path d="M4 7h16v12H4z"/><path d="M4 12h16"/></svg>',
      building: '<svg viewBox="0 0 24 24"><path d="M5 21V4h10v17"/><path d="M15 9h4v12"/><path d="M8 8h3M8 12h3M8 16h3"/></svg>',
      chart: '<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 16l4-5 4 3 4-7"/></svg>',
      cloud: '<svg viewBox="0 0 24 24"><path d="M7 18h11a4 4 0 0 0 .4-8 6 6 0 0 0-11.2-1.7A5 5 0 0 0 7 18Z"/></svg>',
      code: '<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/></svg>',
      database: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
      eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>',
      flame: '<svg viewBox="0 0 24 24"><path d="M13 3s1 4-2 6c-2 1.5-4 3.3-4 6a5 5 0 0 0 10 0c0-2.5-1.5-4.2-3-5 1 3-2 4-2 4"/></svg>',
      grid: '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',
      lock: '<svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3"/><path d="M5 11h14v9H5z"/></svg>',
      map: '<svg viewBox="0 0 24 24"><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"/><path d="M9 4v14M15 6v14"/></svg>',
      network: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8.8 10.8 6.4-3.6M8.8 13.2l6.4 3.6"/></svg>',
      rocket: '<svg viewBox="0 0 24 24"><path d="M5 16c2-6 6-10 13-11-1 7-5 11-11 13l-2-2Z"/><path d="M8 18l-4 2 2-4"/><circle cx="15" cy="9" r="1.5"/></svg>',
      shield: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/></svg>',
      target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>'
    };
    return icons[name] || icons.cloud;
  }

  function statusTextForTone(tone) {
    if (tone === "ok") return "Healthy";
    if (tone === "bad") return "Attention";
    if (tone === "warn") return "Needs work";
    return "Info";
  }

  function miniSparkline(tone) {
    const values = tone === "bad" ? [70, 56, 62, 44, 50, 37, 45, 30, 54, 39] : tone === "warn" ? [38, 43, 40, 55, 47, 64, 59, 72, 67, 78] : [31, 39, 36, 49, 58, 55, 70, 66, 78, 74];
    const points = values.map((value, index) => `${index * 12},${82 - value}`).join(" ");
    return `<svg class="mini-chart ${tone}" viewBox="0 0 108 58" aria-hidden="true" focusable="false"><polyline points="${points}"/></svg>`;
  }

  function miniBars(tone) {
    const values = tone === "bad" ? [34, 26, 39, 28, 45, 24, 48, 31, 54, 38, 60, 43, 70, 36] : [22, 34, 25, 48, 32, 56, 38, 50, 29, 62, 40, 68, 51, 74];
    return `<svg class="mini-bars ${tone}" viewBox="0 0 132 58" aria-hidden="true" focusable="false">${values.map((value, index) => `<rect x="${index * 9 + 2}" y="${56 - value}" width="5" height="${value}" rx="2"/>`).join("")}</svg>`;
  }

  function progressTrack(percent, tone, accent) {
    const primary = Math.max(0, Math.min(100, Number(percent) || 0));
    const secondary = accent === undefined ? 0 : Math.max(0, Math.min(100 - primary, Number(accent) || 0));
    return `<div class="progress-track ${tone}" aria-hidden="true"><span style="width:${primary}%"></span>${secondary ? `<b style="left:${primary}%;width:${secondary}%"></b>` : ""}</div>`;
  }

  function ledgerStep(label, count, detail, type, id, iconName) {
    const tone = Number(count) > 0 ? "ok" : "neutral";
    const attrs = type && id ? ` data-drill="${esc(type)}" data-id="${esc(id)}"` : "";
    return `
      <button type="button" class="relationship-node ${tone}"${attrs}>
        <i aria-hidden="true">${iconSvg(iconName || iconForLabel(label))}</i>
        <span>${esc(label)}</span>
        <strong>${esc(count)}</strong>
        <small>${esc(detail || "No visible rows")}</small>
      </button>
    `;
  }

  function appName(appId) {
    const app = appById(appId);
    return app ? app.display_name : appId;
  }

  function appById(appId) {
    return byId(data.business_apps, "app_id", appId);
  }

  function projectById(projectId) {
    return byId(data.project_profiles, "project_id", projectId) || byId(data.projects, "project_id", projectId);
  }

  function normalizedBillingId(value) {
    return text(value).replace(/^billingAccounts\//, "").replace(/_/g, "-").trim();
  }

  function canonicalProfilesForApp(appId) {
    const grouped = new Map();
    arr(data.project_profiles)
      .filter((profile) => profile.business_app_id === appId)
      .forEach((profile) => {
        const key = `${profile.project_id}|${normalizedBillingId(profile.billing_account_id || profile.billing_account_name)}`;
        const current = grouped.get(key);
        const currentScore = current ? profileQualityScore(current) : -1;
        const nextScore = profileQualityScore(profile);
        if (!current || nextScore > currentScore) grouped.set(key, profile);
      });
    return Array.from(grouped.values()).sort((a, b) => text(a.project_id).localeCompare(text(b.project_id)));
  }

  function profileQualityScore(profile) {
    return (profile.current_month_spend_available ? 4 : 0)
      + (profile.billing_linked ? 2 : 0)
      + (profile.budget_attached ? 1 : 0);
  }

  function canonicalProfiles(rows) {
    const grouped = new Map();
    arr(rows).forEach((profile) => {
      const key = `${profile.project_id}|${normalizedBillingId(profile.billing_account_id || profile.billing_account_name)}`;
      const current = grouped.get(key);
      if (!current || profileQualityScore(profile) > profileQualityScore(current)) grouped.set(key, profile);
    });
    return Array.from(grouped.values());
  }

  function appManagementVm(app) {
    const canonical = canonicalProfilesForApp(app && app.app_id);
    const projectCount = Number(app && app.google_projects_count);
    const firebaseCount = Number(app && app.firebase_projects_count);
    const resources = arr(data.resource_cost_exposure).filter((resource) => resource.business_app_id === (app && app.app_id));
    return {
      projectCount: Number.isFinite(projectCount) ? projectCount : canonical.length,
      firebaseProjectCount: Number.isFinite(firebaseCount) ? firebaseCount : canonical.filter((profile) => profile.firebase_linked).length,
      resourceCount: resources.length || Number(app && app.resources_count) || 0,
      apiCount: Number(app && app.cost_risk_apis_count) || canonical.reduce((sum, profile) => sum + Number(profile.cost_risk_apis_count || 0), 0),
      profiles: canonical,
      resources
    };
  }

  function appActualById(appId) {
    return byId(data.business_app_actuals, "app_id", appId) || {};
  }

  function appBillingIds(app) {
    const fromApp = arr(app && app.mapped_billing_accounts).map(normalizedBillingId);
    const fromProfiles = canonicalProfilesForApp(app && app.app_id).map((profile) => normalizedBillingId(profile.billing_account_id || profile.billing_account_name));
    return uniq(fromApp.concat(fromProfiles).filter((value) => value && value !== "unavailable"));
  }

  function billingActualsForApp(app) {
    const ids = new Set(appBillingIds(app));
    return arr(data.billing_account_actuals).filter((row) => ids.has(normalizedBillingId(row.billing_account_id)));
  }

  function attributionReviewsForApp(app) {
    const ids = new Set(appBillingIds(app));
    return arr(data.attribution_gaps).filter((row) => ids.has(normalizedBillingId(row.billing_account_id)) && row.current_business_app_id !== app.app_id);
  }

  function sumNumber(rows, key) {
    return arr(rows).reduce((total, row) => total + (Number(row && row[key]) || 0), 0);
  }

  function firstFiniteNumber(row, keys) {
    for (const key of keys) {
      const value = row && row[key];
      const number = Number(value);
      if (value !== null && value !== undefined && value !== "" && Number.isFinite(number)) return number;
    }
    return 0;
  }

  function firstServiceLabel(row) {
    const service = arr(row && row.top_services)[0];
    return (service && service.service_description) || (row && row.top_service_label) || "Spend-bearing service";
  }

  function resourceKey(row) {
    return [row.project_id, row.resource_type, row.name].map((value) => encodeURIComponent(text(value))).join("|");
  }

  function resourceByKey(key) {
    const decoded = text(key).split("|").map((part) => decodeURIComponent(part));
    return arr(data.resource_cost_exposure).find((row) => text(row.project_id) === decoded[0] && text(row.resource_type) === decoded[1] && text(row.name) === decoded[2]);
  }

  function actionById(actionId) {
    return byId(data.action_needed, "id", actionId);
  }

  function appIdForBlocker(blocker) {
    return blocker && (blocker.app_id || blocker.business_app_id || "");
  }

  function executiveActionTitle(action) {
    const subsystem = norm(action && action.subsystem);
    const status = norm(action && action.current_status);
    if (subsystem.includes("billing export")) return status.includes("quer") ? "Enable billing export queries" : "Configure billing export";
    if (subsystem.includes("budget")) return "Add budgets to projects";
    if (subsystem.includes("firebase")) return "Authorize Firebase CLI";
    if (subsystem.includes("billing")) return "Grant billing viewer access";
    if (subsystem.includes("quota")) return "Improve quota visibility";
    return titleLabel((action && action.subsystem) || "Action required");
  }

  function actionOwner(action) {
    const subsystem = norm(action && action.subsystem);
    if (subsystem.includes("billing export")) return "FinOps team to approve the capped read-only billing export query run.";
    if (subsystem.includes("budget")) return "Cloud PMO or billing owner to create or expose budgets.";
    if (subsystem.includes("firebase")) return "Platform team to authorize Firebase CLI with the target account.";
    if (subsystem.includes("billing")) return "Cloud security or billing admin to grant read-only billing visibility.";
    return "Responsible owner to review the listed evidence and rerun collection.";
  }

  function percentLabel(part, total) {
    if (!total) return "0%";
    return Math.round((part / total) * 100) + "%";
  }

  function scopedExposureScore(apps, fallback) {
    const values = arr(apps).map((app) => Number(app.risk_score)).filter(Number.isFinite);
    if (!values.length) return Number(fallback || 0);
    return Math.min(100, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
  }

  function scopedConfidenceScore(projectProfiles, quality) {
    const rows = arr(projectProfiles);
    if (!rows.length) return Number((quality || {}).overall_score || 0);
    const confident = rows.filter((row) => {
      const confidence = row.app_relationship && row.app_relationship.confidence;
      return confidence === "high" || confidence === "medium";
    }).length;
    const spendVisible = rows.filter((row) => row.current_month_spend_available).length;
    const budgetVisible = rows.filter((row) => row.budget_attached).length;
    return Math.round(((confident / rows.length) * 40) + ((spendVisible / rows.length) * 35) + ((budgetVisible / rows.length) * 25));
  }

  function confidenceColumn(title, items) {
    const list = arr(items);
    return `
      <article class="confidence-column">
        <h3>${esc(title)}</h3>
        ${list.length ? `<ul>${list.slice(0, 8).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : '<p class="muted">No rows.</p>'}
      </article>
    `;
  }

  function currentScope() {
    return {
      account: state.account,
      business_app: state.app,
      environment: state.environment,
      quick_filter: state.activeFilter
    };
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escapeCsv = (value) => `"${text(value).replace(/"/g, '""')}"`;
    return [headers.map(escapeCsv).join(",")]
      .concat(rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")))
      .join("\n");
  }

  function render() {
    syncControlsFromState();
    syncFilterButtons();
    renderStatus();
    renderAccountBadges();
    renderExecutiveBoard();
    renderAppPortfolio();
    renderRelationshipLedger();
    renderProject360();
    renderCostCenterSummary();
    renderCostReconciliationPanel();
    renderAttributionGapsPanel();
    renderCostExposureCenter();
    renderActionNeeded();
    renderDataQuality();
    renderVisibilityLedger();
    renderCostCenterTables();
    renderProjectExplorer();
    renderServices();
    renderQuotas();
    renderFirebase();
    renderResources();
    renderUnavailable();
    
    $("rawJson").textContent = JSON.stringify(data, null, 2);
    
    manageSectionVisibility();
    renderDrawer();
  }

  function syncFilterButtons() {
    ["cost-risk", "cost-blockers", "firebase-blockers", "unavailable", "warnings", "known-free"].forEach((filter) => {
      const button = $(`filter-${filter}`);
      if (button) button.classList.toggle("active", state.activeFilter === filter);
    });
    document.querySelectorAll("[data-lens]").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-lens") === state.activeFilter);
    });
  }

  function renderStatus() {
    const summary = data.cost_summary || {};
    const authSummary = data.auth_context_summary || {};
    const globalSummary = data.global_summary || {};
    const runLog = data.collector_run_log_summary || {};

    $("collectionStatus").textContent = text(data.collection_status || data.status);
    if ($("railCollectorStatus")) $("railCollectorStatus").textContent = text(data.collection_status || data.status);
    $("generatedAt").textContent = text(data.generated_at);
    $("collectorVersion").textContent = text(data.collector_version);
    $("collectorRunId").textContent = text(data.collector_run_id);
    
    // CLI and System statuses
    const activeAcc = authSummary.active_account || "none";
    $("gcloudCliStatus").innerHTML = authSummary.gcloud_available 
      ? `<span class="status-pill ok">AVAILABLE</span> <small style="display:block;font-size:10px;color:var(--muted)">Active: ${esc(activeAcc)}</small>`
      : '<span class="status-pill bad">NOT FOUND</span>';
      
    $("firebaseCliStatus").innerHTML = authSummary.firebase_cli_available
      ? `<span class="status-pill ok">AVAILABLE</span> <small style="display:block;font-size:10px;color:var(--muted)">Authorized: ${authSummary.firebase_authorized_accounts_count || 0}</small>`
      : '<span class="status-pill bad">NOT FOUND</span>';

    const selectedTarget = selectedBillingTarget();
    const targetLabel = billingTargetLabel(selectedTarget);
    const bqExportStatus = summary.bigquery_billing_export_status || "NOT_CONFIGURED";
    const bqExportTone = bqExportStatus === "AVAILABLE" ? "ok" : ["CONFIGURED_WAITING_FOR_ROWS", "TABLES_PRESENT_NO_ROWS", "NOT_QUERIED"].includes(bqExportStatus) ? "warn" : "bad";
    $("billingExportStatus").innerHTML = `<span class="status-pill ${bqExportTone}">${esc(titleLabel(bqExportStatus))}</span>`;
    
    const bqTables = summary.bigquery_tables_count !== undefined ? summary.bigquery_tables_count : (data.bq_tables_count || 0);
    const bqDatasetTone = bqExportStatus === "AVAILABLE" ? "ok" : ["CONFIGURED_WAITING_FOR_ROWS", "TABLES_PRESENT_NO_ROWS", "NOT_QUERIED"].includes(bqExportStatus) ? "warn" : "bad";
    const datasetText = ["NOT_CONFIGURED", "NOT_CONFIGURED_CONSOLE_ACTION_REQUIRED"].includes(bqExportStatus)
      ? "NOT FOUND"
      : (bqExportStatus === "QUERY_BLOCKED" ? "BLOCKED" : `${targetLabel} (${bqTables} tbls)`);
    $("bqDatasetStatus").innerHTML = `<span class="status-pill ${bqDatasetTone}">${esc(titleLabel(datasetText))}</span>`;

    const spendStatus = summary.spend_visibility_status || "UNAVAILABLE";
    const spendTone = spendStatus === "AVAILABLE" ? "ok" : ["PARTIAL", "CONFIGURED_WAITING_FOR_ROWS", "TABLES_PRESENT_NO_ROWS", "NOT_QUERIED"].includes(spendStatus) ? "warn" : "bad";
    $("spendStatusText").innerHTML = `<span class="status-pill ${spendTone}">${esc(titleLabel(spendStatus))}</span>`;

    const budgetsCount = summary.budgets_visible_count || 0;
    const budgetsMissing = summary.budgets_missing_count || 0;
    const budgetTone = budgetsCount > 0 ? (budgetsMissing > 0 ? "warn" : "ok") : "bad";
    $("budgetVisibilityText").innerHTML = `<span class="status-pill ${budgetTone}">${budgetsCount} visible (${budgetsMissing} missing)</span>`;

    // Asset visibility
    const hasAsset = arr(data.services).some(s => s.service_name === "cloudasset.googleapis.com" && s.state === "ENABLED");
    $("assetVisibilityText").innerHTML = hasAsset 
      ? '<span class="status-pill ok">ENABLED</span>' 
      : '<span class="status-pill bad">DISABLED</span>';

    // API visibility
    const visibleCostApis = globalSummary.visible_cost_risk_services || 0;
    const knownFreeApis = globalSummary.known_free_services || 0;
    $("apiVisibilityText").innerHTML = `<span class="status-pill ${visibleCostApis ? 'warn' : 'ok'}">${visibleCostApis} visible</span> <small style="display:block;font-size:10px;color:var(--muted)">${knownFreeApis} known free hidden</small>`;
  }

  function renderAccountBadges() {
    const accounts = arr(data.accounts);
    const badgeHtml = TARGETS.map(email => {
      const acc = accounts.find(a => a.email === email) || {};
      const gcloudStatus = acc.gcloud_authenticated ? "gcloud" : "no-gcloud";
      const firebaseStatus = acc.firebase_authenticated ? "firebase" : "no-firebase";
      const billingCount = acc.billing_accounts_count || 0;
      
      return `
        <div class="account-badge-card">
          <strong title="${esc(email)}">${esc(email.split('@')[0])}</strong>
          <div>
            <span class="mini-pill ${acc.gcloud_authenticated ? 'ok' : 'bad'}">G</span>
            <span class="mini-pill ${acc.firebase_authenticated ? 'ok' : 'bad'}">F</span>
            <span class="mini-pill ${billingCount > 0 ? 'ok' : 'neutral'}">B:${billingCount}</span>
          </div>
        </div>
      `;
    }).join("");
    $("accountBadgesStrip").innerHTML = badgeHtml;
  }

  function renderExecutiveBoard() {
    const rows = scopedRows();
    const summary = data.executive_summary || {};
    const spendSummary = data.spend_summary || {};
    const canonicalProjectRows = canonicalProfiles(rows.projectProfiles);
    const visibleSpendRows = canonicalProjectRows.filter((row) => row.current_month_spend_available === true);
    const spendValue = spendSummary.actuals_available
      ? moneyLabel(spendSummary.current_month_net_cost, spendSummary.currency)
      : visibleSpendRows.length
      ? "$" + visibleSpendRows.reduce((sum, row) => sum + Number(row.current_month_spend ?? 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "Unavailable";
    const spendBlocked = canonicalProjectRows.filter((row) => row.current_month_spend_available !== true).length;
    const budgetVisible = canonicalProjectRows.filter((row) => row.budget_attached === true).length;
    const projectCount = canonicalProjectRows.length || summary.projects_count || 0;
    const confidenceScore = scopedConfidenceScore(canonicalProjectRows, data.data_quality);
    const spendStatus = spendSummary.actuals_available || visibleSpendRows.length ? "Actuals visible" : "Approval required";
    const blockedTone = spendBlocked ? "bad" : "ok";
    const budgetPercent = projectCount ? Math.round((budgetVisible / projectCount) * 100) : 0;

    $("executiveSummary").innerHTML = `
      <span aria-hidden="true">${iconSvg("alert")}</span>
      <p>All costs are actuals only when billing export is enabled and readable. Otherwise this dashboard shows exposure, blockers, and approvals, not estimates.</p>
      <div class="executive-scope">
        <span>${esc(state.account === "all" ? "All accounts" : state.account)}</span>
        <span>${esc(state.app === "all" ? "All business apps" : appName(state.app))}</span>
        <span>${esc(state.environment === "all" ? "All environments" : titleLabel(state.environment))}</span>
      </div>
    `;

    $("executiveKpis").innerHTML = [
      metricCard(
        "Visible Net Cost",
        spendValue,
        spendSummary.actuals_available || visibleSpendRows.length ? `Gross ${moneyLabel(spendSummary.current_month_gross_cost, spendSummary.currency)}, credits ${moneyLabel(spendSummary.current_month_credits, spendSummary.currency)}.` : "No fake spend shown. Billing export approval is required.",
        spendSummary.actuals_available || visibleSpendRows.length ? "ok" : "bad",
        { icon: "eye", status: spendStatus, drillType: "action", drillId: "billing_export_queries_not_enabled" }
      ),
      metricCard(
        "Actual Spend Gaps",
        spendBlocked,
        "Projects where actual cost is unavailable, not zero.",
        blockedTone,
        { icon: "lock", status: spendBlocked ? "Attention" : "Clear", drillType: "action", drillId: "billing_export_queries_not_enabled" }
      ),
      metricCard(
        "Budget Coverage",
        `${budgetPercent}%`,
        `${budgetVisible} of ${projectCount} canonical mapped projects have visible budgets.`,
        budgetPercent >= 80 ? "ok" : "warn",
        { icon: "shield", status: budgetPercent >= 80 ? "Healthy" : "Needs work", progress: budgetPercent, progressAccent: Math.max(0, 100 - budgetPercent) }
      ),
      metricCard(
        "Data Confidence",
        `${confidenceScore}/100`,
        "Composite of billing, spend, budget, Firebase, and app-mapping visibility.",
        confidenceScore >= 70 ? "ok" : "warn",
        { icon: "target", status: confidenceScore >= 70 ? "Healthy" : "Needs work", chart: "bars" }
      )
    ].join("");
  }

  function renderAppPortfolio() {
    const rows = scopedRows();
    const apps = rows.businessApps.slice().sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0));
    $("appPortfolio").innerHTML = apps.length ? `
      <div class="portfolio-table-wrap">
        <table class="portfolio-table">
          <thead>
            <tr>
              <th>Business App</th>
              <th>App Health</th>
              <th>Spend Status</th>
              <th>Budget Status</th>
              <th>Projects</th>
              <th>Firebase</th>
              <th>Risk Score</th>
              <th>Data Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${apps.slice(0, 18).map((app) => {
              const vm = appManagementVm(app);
              const health = Number(app.data_quality_score || Math.max(0, 100 - Number(app.risk_score || 0)));
              const riskTone = Number(app.risk_score || 0) >= 75 ? "bad" : Number(app.risk_score || 0) >= 45 ? "warn" : "ok";
              const spendTone = statusTone(app.actual_spend_status);
              const budgetTone = statusTone(app.budget_status);
              return `
                <tr class="clickable-table-row portfolio-row" data-drill="app" data-id="${esc(app.app_id)}" tabindex="0">
                  <td>
                    <div class="app-name-cell">
                      <span class="app-avatar ${riskTone}" aria-hidden="true">${iconSvg("rocket")}</span>
                      <div>
                        <strong>${esc(app.display_name)}</strong>
                        <small>${esc(titleLabel(app.criticality || "portfolio"))} · ${esc(titleLabel(app.environment || "unknown"))}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="health-meter">
                      <span class="health-line"><b style="width:${Math.max(2, Math.min(100, health))}%"></b></span>
                      <strong>${esc(health)}/100</strong>
                    </div>
                  </td>
                  <td>
                    <strong class="${spendTone === "bad" ? "danger-text" : "success-text"}">${esc(app.actual_spend_status || "Actual spend unavailable")}</strong>
                    <small>${esc(appSpendSummary(app))}</small>
                  </td>
                  <td>
                    <strong class="${budgetTone === "bad" || budgetTone === "warn" ? "danger-text" : "success-text"}">${esc(app.projects_without_budget || 0)} / ${esc(vm.projectCount)}</strong>
                    <small>${esc(app.budget_status || "Budget unknown")}</small>
                  </td>
                  <td><strong>${esc(vm.projectCount)}</strong><small>Mapped projects</small></td>
                  <td>
                    <span class="status-pill ${vm.firebaseProjectCount ? "ok" : "bad"}">${vm.firebaseProjectCount ? "Linked" : "Not linked"}</span>
                    <small>${esc(vm.firebaseProjectCount)} mapped project(s)</small>
                  </td>
                  <td><span class="risk-chip ${riskTone}">${esc(titleLabel(app.cost_exposure_label || "Exposure"))}</span><strong>${esc(app.risk_score || 0)}</strong></td>
                  <td><strong>${esc(titleLabel(app.confidence || "low"))}</strong><small>${esc(app.confidence === "high" ? "Registry-backed" : app.mapping_source || "Inferred")}</small></td>
                  <td><button type="button" class="open-detail" data-drill="app" data-id="${esc(app.app_id)}">Open 360</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="mobile-app-cards">
        ${apps.map((app) => `
          ${(() => {
            const vm = appManagementVm(app);
            return `
          <article class="app-card clickable-card" data-drill="app" data-id="${esc(app.app_id)}" tabindex="0" role="button" aria-label="Open ${esc(app.display_name)} app detail">
            <div class="app-card-head">
              <div>
                <span class="metric-label">Business app</span>
                <strong>${esc(app.display_name)}</strong>
              </div>
              <span class="risk-ring ${statusTone(app.actual_spend_status)}">${esc(app.risk_score || 0)}</span>
            </div>
            <p>${esc(app.executive_summary || "Spend and relationship summary unavailable.")}</p>
            <div class="app-health-row">
              <span class="status-pill ${statusTone(app.actual_spend_status)}">${esc(app.actual_spend_status)}</span>
              <span class="status-pill ${statusTone(app.budget_status)}">${esc(app.budget_status)}</span>
              <span class="status-pill ${vm.firebaseProjectCount ? "ok" : "neutral"}">${vm.firebaseProjectCount ? "Firebase linked" : "Firebase unknown"}</span>
            </div>
            <dl class="compact-facts">
              <div><dt>Owner</dt><dd>${esc(app.business_owner || "Unassigned")}</dd></div>
              <div><dt>Environment</dt><dd>${esc(titleLabel(app.environment || "unknown"))}</dd></div>
              <div><dt>Projects</dt><dd>${esc(vm.projectCount)}</dd></div>
              <div><dt>Paid resources</dt><dd>${esc(app.cost_risk_resources_count || 0)}</dd></div>
              <div><dt>Cost APIs</dt><dd>${esc(app.cost_risk_apis_count || 0)}</dd></div>
              <div><dt>Confidence</dt><dd>${esc(titleLabel(app.confidence || "low"))}</dd></div>
            </dl>
            <div class="tag-row">${arr(app.mapped_google_projects).slice(0, 8).map((project) => `<span class="tag">${esc(project)}</span>`).join("")}</div>
            <p class="mapping-note">${esc(app.mapping_explanation || "Mapping explanation unavailable.")}</p>
            <span class="open-detail">Open app 360</span>
          </article>
            `;
          })()}
        `).join("")}
      </div>
      <div class="portfolio-footer">
        <span>Showing ${esc(Math.min(apps.length, 18))} of ${esc(apps.length)} applications</span>
        <span>Rows open the joined App 360 view.</span>
      </div>
    ` : '<div class="empty">No business apps match this view. Add mappings in data/app_registry.json or clear filters.</div>';
  }

  function renderRelationshipLedger() {
    const rows = scopedRows();
    const apps = rows.businessApps.slice().sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0));
    const selected = state.app !== "all" ? appById(state.app) : apps[0];
    const visibleApp = selected && apps.some((app) => app.app_id === selected.app_id) ? selected : apps[0];
    const selector = $("relationshipAppSelector");
    if (selector) {
      selector.innerHTML = apps.map((app) => `<option value="${esc(app.app_id)}"${visibleApp && app.app_id === visibleApp.app_id ? " selected" : ""}>${esc(app.display_name || app.app_id)}</option>`).join("");
    }
    const mapButton = document.querySelector('#relationshipMap .ghost-action[data-drill="app"]');
    if (mapButton && visibleApp) mapButton.setAttribute("data-id", visibleApp.app_id);

    if (!visibleApp) {
      $("relationshipLedger").innerHTML = '<div class="empty">No app relationship rows match this view.</div>';
      return;
    }

    const vm = appManagementVm(visibleApp);
    const profiles = vm.profiles.filter(matchesScope);
    const firebaseCount = vm.firebaseProjectCount;
    const resourceRows = vm.resources.filter(matchesScope);
    const resourceCount = resourceRows.length || vm.resourceCount;
    const apiCount = vm.apiCount;
    const billingAccounts = uniq(profiles.map((profile) => profile.billing_account_name).filter((value) => value && value !== "unavailable"));
    const blockers = arr(visibleApp.blockers).length || profiles.reduce((sum, profile) => sum + Number(profile.blockers_count || 0), 0);
    const firstProject = (profiles[0] || {}).project_id;
    const firstResource = resourceRows[0];
    const confidence = titleLabel(visibleApp.confidence || "low");
    const projectNames = arr(visibleApp.mapped_google_projects).slice(0, 2);
    const resourceNames = resourceRows.map((resource) => resource.cost_driver_label || resource.resource_type).slice(0, 3);

    $("relationshipLedger").innerHTML = `
      <div class="ledger-stage" data-selected-app="${esc(visibleApp.app_id)}">
        <div class="ledger-labels" aria-hidden="true">
          <span>Business App</span>
          <span>Google Projects</span>
          <span>Firebase</span>
          <span>Resources</span>
          <span>APIs & Services</span>
          <span>Billing Account</span>
          <span>Blockers</span>
        </div>
        <div class="relationship-row">
          <button type="button" class="relationship-node app-node critical" data-drill="app" data-id="${esc(visibleApp.app_id)}">
            <i aria-hidden="true">${iconSvg("rocket")}</i>
            <strong>${esc(visibleApp.display_name || visibleApp.app_id)}</strong>
            <small>${esc(titleLabel(visibleApp.criticality || "portfolio"))} · ${esc(titleLabel(visibleApp.environment || "unknown"))}</small>
          </button>
          ${ledgerStep("Google Projects", vm.projectCount, projectNames.join(", ") || "No mapped projects", "project", firstProject, "building")}
          ${ledgerStep("Firebase", firebaseCount, firebaseCount ? "Linked metadata visible" : "No Firebase link visible", "app", visibleApp.app_id, "flame")}
          ${ledgerStep("Resources", resourceCount, resourceNames.join(", ") || "No mapped resources", firstResource ? "resource" : "app", firstResource ? resourceKey(firstResource) : visibleApp.app_id, "database")}
          ${ledgerStep("APIs & Services", apiCount, "Cost-exposure services visible", "app", visibleApp.app_id, "network")}
          ${ledgerStep("Billing Account", billingAccounts.length, billingAccounts.slice(0, 1).join("") || "Billing unclear", "app", visibleApp.app_id, "briefcase")}
          ${ledgerStep("Blockers", blockers, blockers ? "Approval needed" : "No blockers", "app", visibleApp.app_id, "alert")}
        </div>
        <div class="ledger-confidence">
          <span class="status-pill ${statusTone(visibleApp.confidence)}">${esc(confidence)} confidence</span>
          <span>Source: ${esc(titleLabel(visibleApp.mapping_source || "inferred"))}</span>
          <span>${esc(visibleApp.mapping_explanation || "Verify inferred relationships before external reporting.")}</span>
        </div>
      </div>
    `;
  }

  function renderProject360() {
    const rows = canonicalProfiles(scopedRows().projectProfiles).map((row) => Object.assign({}, row, {
      app_display: `${row.business_app_name} (${titleLabel(row.app_relationship && row.app_relationship.confidence)})`,
      spend_display: row.current_month_spend_available ? projectSpendSummary(row) : row.spend_visibility_label,
      firebase_display: row.firebase_linked ? "Firebase linked" : "No Firebase link",
      exposure_display: `${row.cost_risk_apis_count} APIs / ${row.cost_risk_resources_count} resources`,
      missing_display: row.what_is_missing
    }));
    table("project360Table", rows, [
      col("business_app_name", "Business app"),
      col("project_id", "Google project"),
      col("account_email", "Account"),
      col("spend_display", "Spend", "status"),
      col("budget_status", "Budget", "status"),
      col("exposure_display", "Cost exposure"),
      col("firebase_display", "Firebase", "status"),
      col("quota_visibility_status", "Quotas", "status"),
      col("executive_status", "Executive status", "status"),
      col("what_it_represents", "Represents"),
      col("what_can_cost_money", "Can cost money"),
      col("missing_display", "Missing")
    ], "No project profiles match this view.", {
      rowAttrs: (row) => `class="clickable-table-row" data-drill="project" data-id="${esc(row.project_id)}" tabindex="0" role="button" aria-label="Open ${esc(row.project_id)} project detail"`
    });
  }

  function renderCostExposureCenter() {
    const rows = scopedRows().resourceCostExposure;
    table("costExposureTable", rows, [
      col("business_app_name", "Business app"),
      col("project_id", "Project"),
      col("resource_type", "Resource"),
      col("name", "Name"),
      col("cost_driver_label", "Cost driver"),
      col("actual_cost_status", "Actual cost", "status"),
      col("actual_cost_reason", "Why unavailable"),
      col("unlock_action", "Unlock action")
    ], "No resource-level cost exposure rows match this view.", {
      rowAttrs: (row) => `class="clickable-table-row" data-drill="resource" data-id="${esc(resourceKey(row))}" tabindex="0" role="button" aria-label="Open ${esc(row.name)} resource detail"`
    });
  }

  function renderDataQuality() {
    const quality = data.data_quality || {};
    const scores = quality.scores || {};
    $("dataQualitySummary").innerHTML = `
      <div class="quality-grid">
        ${metricCard("Overall confidence", `${quality.overall_score || 0}/100`, quality.coverage_label || "Needs approval", (quality.overall_score || 0) >= 70 ? "ok" : "warn")}
        ${metricCard("Billing links", `${scores.billing_link_coverage || 0}%`, "Projects with visible billing link metadata.", "neutral")}
        ${metricCard("Actual spend", `${scores.actual_spend_coverage || 0}%`, "Projects with real spend rows, not estimates.", (scores.actual_spend_coverage || 0) > 0 ? "ok" : "bad")}
        ${metricCard("App mapping", `${scores.app_mapping_confidence || 0}%`, "Projects mapped with high or medium confidence.", "warn")}
      </div>
      <div class="confidence-columns">
        ${confidenceColumn("What we know", quality.what_we_know)}
        ${confidenceColumn("What we cannot see", quality.what_we_cannot_see)}
        ${confidenceColumn("How to unlock it", arr(quality.gaps).map((gap) => `${gap.label}: ${gap.unlock_action}`))}
      </div>
    `;
  }

  function renderCostCenterSummary() {
    const rows = scopedRows();
    const summary = data.cost_summary || {};
    const spendSummary = data.spend_summary || {};
    const globalSummary = data.global_summary || {};
    const visibility = spendVisibility(rows.projectCosts);
    const exportState = billingExportState(rows.projectCosts);
    const linked = rows.projectCosts.filter((r) => r.billing_linked === true);
    const costRiskServices = summary.cost_risk_services_visible ?? globalSummary.visible_cost_risk_services ?? 0;
    const costRiskResources = summary.cost_risk_resources_visible ?? globalSummary.visible_cost_risk_resources ?? 0;
    const costRiskFirebase = summary.cost_risk_firebase_visible ?? globalSummary.visible_cost_risk_firebase_projects ?? 0;
    const knownFreeHidden = (summary.known_free_services_hidden ?? globalSummary.known_free_services ?? 0)
      + (summary.known_free_resources_hidden ?? globalSummary.known_free_resources ?? 0)
      + (summary.known_free_firebase_hidden ?? globalSummary.known_free_firebase_projects ?? 0);
    const costRiskTotal = costRiskServices + costRiskResources + costRiskFirebase;
    
    // Check tables 0 explanation
    const bqTables = summary.bigquery_tables_count !== undefined ? summary.bigquery_tables_count : (data.bq_tables_count || 0);
    const bqExportStatus = summary.bigquery_billing_export_status || "NOT_CONFIGURED";
    const selectedTarget = selectedBillingTarget();
    const targetLabel = billingTargetLabel(selectedTarget);
    const reason = summary.bigquery_billing_export_reason || selectedTarget.reason || "Billing export state is unavailable.";
    
    let billingDetail = "";
    if (bqExportStatus === "NOT_CONFIGURED" || bqExportStatus === "NOT_CONFIGURED_CONSOLE_ACTION_REQUIRED") {
      billingDetail = `<strong>No readable billing export target verified.</strong><br/>
                       <span class="muted" style="font-size:11px;">${esc(reason)} Actual spend is unavailable, not zero.</span>`;
    } else if (bqExportStatus === "QUERY_BLOCKED") {
      billingDetail = `<strong>BigQuery query blocked.</strong><br/>
                       <span class="muted" style="font-size:11px;">Target <code>${esc(targetLabel)}</code>: ${esc(reason)}</span>`;
    } else if (bqExportStatus === "AVAILABLE" && summary.spend_visibility_status === "NOT_QUERIED") {
      billingDetail = `<strong>Billing export tables are visible.</strong><br/>
                       <span class="muted" style="font-size:11px;">Target <code>${esc(targetLabel)}</code> has ${esc(bqTables)} table(s). Rerun with billing export queries enabled to populate spend.</span>`;
    } else if (bqExportStatus === "CONFIGURED_WAITING_FOR_ROWS" || bqExportStatus === "TABLES_PRESENT_NO_ROWS" || bqTables === 0) {
      billingDetail = `<strong>Billing export visible; waiting for rows.</strong><br/>
                       <span class="muted" style="font-size:11px;">Target <code>${esc(targetLabel)}</code> has no queryable usage-cost rows yet. ${esc(reason)}</span>`;
    } else {
      billingDetail = `<strong>Dataset:</strong> <code>${esc(targetLabel)}</code><br/>
                       <strong>Tables:</strong> ${bqTables} tables found.`;
    }

    $("costCenterSummary").innerHTML = `
      <article class="metric ${visibility.tone}">
        <span class="metric-label">Actual Spend Status</span>
        <strong>${titleLabel(visibility.status)}</strong>
        <p>${esc(visibility.message)}</p>
      </article>
      <article class="metric ${visibility.tone}">
        <span class="metric-label">Visible Monthly Spend</span>
        <strong>${spendSummary.actuals_available ? moneyLabel(spendSummary.current_month_net_cost, spendSummary.currency) : (visibility.visible ? '$' + sumSpend(visibility.visibleRows) : "Actual Spend Unavailable")}</strong>
        <p>${visibility.visible ? "Sum of all projects with visible BigQuery spend data." : "Billing export has no data yet; actual spend is unavailable, not zero."}</p>
      </article>
      <article class="metric warn">
        <span class="metric-label">Cost-Risk Surfaces</span>
        <strong>${costRiskTotal}</strong>
        <p>${costRiskServices} APIs, ${costRiskResources} resources, ${costRiskFirebase} Firebase projects visible. ${knownFreeHidden} known-free rows hidden.</p>
      </article>
      <article class="metric ${exportState.tone}">
        <span class="metric-label">BigQuery Billing Export Info</span>
        <div style="margin-top: 10px; font-size:13px; line-height: 1.4;">
          ${billingDetail}
        </div>
      </article>
    `;
  }

  function renderCostReconciliationPanel() {
    const rows = scopedRows();
    const spendSummary = data.spend_summary || {};
    const reconciliation = data.spend_reconciliation || {};
    const dailyRows = rows.spendDaily;
    const serviceRows = rows.spendByService.slice().sort((a, b) => firstFiniteNumber(b, ["gross_cost", "net_cost", "current_month_spend"]) - firstFiniteNumber(a, ["gross_cost", "net_cost", "current_month_spend"])).slice(0, 8);
    const projectRows = rows.spendByProject.slice().sort((a, b) => firstFiniteNumber(b, ["current_month_gross_cost", "current_month_spend"]) - firstFiniteNumber(a, ["current_month_gross_cost", "current_month_spend"])).slice(0, 8);
    const actuals = spendSummary.actuals_available === true;
    const currency = spendSummary.currency || "USD";
    const selectedApp = state.app !== "all" ? appById(state.app) : null;
    const selectedAppActual = selectedApp ? appActualById(selectedApp.app_id) : {};
    const selectedBillingActuals = selectedApp ? billingActualsForApp(selectedApp) : rows.billingAccountActuals;
    const reviewRows = selectedApp ? attributionReviewsForApp(selectedApp) : rows.attributionGaps;
    const selectedAppLabel = selectedApp ? `${selectedApp.display_name} mapped net payable` : "Mapped app net payable";
    const selectedAppValue = selectedApp
      ? (selectedApp.visible_monthly_spend_available ? selectedApp.visible_monthly_spend : selectedAppActual.net_cost)
      : sumNumber(rows.businessAppActuals.filter((row) => row.actuals_available === true), "net_cost");
    const selectedBillingNet = selectedBillingActuals.length
      ? sumNumber(selectedBillingActuals, "net_cost")
      : spendSummary.current_month_net_cost;

    const chart = renderDailyBars(dailyRows, currency);
    const coverageCount = rows.billingExportCoverage.length;
    const covered = rows.billingExportCoverage.filter((row) => row.spend_available === true).length;
    const coverageCopy = coverageCount
      ? `${covered} of ${coverageCount} visible billing accounts have actual spend coverage in this data file.`
      : "No billing-account coverage rows are available yet.";

    $("costReconciliationPanel").innerHTML = `
      <div class="reconciliation-head">
        <div>
          <span class="metric-label">Actual Cost Reconciliation</span>
          <h3>${actuals ? "Billing export actuals are loaded" : "Actual cost rows are not loaded yet"}</h3>
          <p>${actuals ? "These values come from readable Cloud Billing BigQuery export rows, not estimates." : esc(spendSummary.reason || "Run the collector with billing export queries enabled to populate exact incurred costs.")}</p>
        </div>
        <span class="status-pill ${actuals ? "ok" : "bad"}">${actuals ? "Actuals visible" : "Actuals unavailable"}</span>
      </div>
      <div class="finance-equation">
        ${financeTerm("Usage before credits", spendSummary.current_month_gross_cost, currency)}
        <span class="finance-operator">+</span>
        ${financeTerm("Credits / savings", spendSummary.current_month_credits, currency)}
        <span class="finance-operator">=</span>
        ${financeTerm("Billing account net payable", spendSummary.current_month_net_cost, currency)}
        ${financeTerm("Forecasted net cost", spendSummary.forecasted_month_net_cost, currency)}
      </div>
      <div class="scope-reconciliation-grid">
        <article>
          <span>Billing account actuals</span>
          <strong>${moneyLabel(selectedBillingNet, currency)}</strong>
          <p>${selectedBillingActuals.length || rows.billingAccountActuals.length} readable billing account actual row(s). This is payable net from export rows.</p>
        </article>
        <article>
          <span>${esc(selectedAppLabel)}</span>
          <strong>${selectedApp ? moneyLabel(selectedAppValue, currency) : moneyLabel(selectedAppValue, currency)}</strong>
          <p>${selectedApp ? "Only projects confidently mapped to this business app are included." : "Sum of business-app mapped actuals in the current filter."}</p>
        </article>
        <article>
          <span>Attribution review queue</span>
          <strong>${moneyLabel(sumNumber(reviewRows, "net_cost"), currency)}</strong>
          <p>${reviewRows.length} spend-bearing project(s) need owner confirmation or registry cleanup.</p>
        </article>
      </div>
      <div class="reconciliation-grid">
        <div class="mini-chart-panel">
          <div class="mini-chart-head">
            <strong>Daily incurred cost</strong>
            <span>${esc((spendSummary.date_range || {}).usage_start || "")} to ${esc((spendSummary.date_range || {}).usage_through || "")}</span>
          </div>
          ${chart}
        </div>
        <div class="top-cost-list">
          <strong>Top services</strong>
          ${serviceRows.length ? serviceRows.map((row) => `
            <button type="button" class="cost-line" data-drill="service-spend" data-id="${esc(row.project_id + '|' + row.service_description)}">
              <span>${esc(row.service_description)}</span>
              <strong>${moneyLabel(row.gross_cost, row.currency || currency)}</strong>
              <small>net ${moneyLabel(row.net_cost ?? row.current_month_spend, row.currency || currency)}</small>
            </button>
          `).join("") : `<div class="empty compact">No service actuals loaded.</div>`}
        </div>
        <div class="top-cost-list">
          <strong>Top projects</strong>
          ${projectRows.length ? projectRows.map((row) => `
            <button type="button" class="cost-line" data-drill="project" data-id="${esc(row.project_id)}">
              <span>${esc(row.project_id)}</span>
              <strong>${moneyLabel(row.current_month_gross_cost, row.currency || currency)}</strong>
              <small>net ${moneyLabel(row.current_month_spend, row.currency || currency)}</small>
            </button>
          `).join("") : `<div class="empty compact">No project actuals loaded.</div>`}
        </div>
      </div>
      <div class="reconciliation-note">
        <span>${esc(coverageCopy)}</span>
        <span>${esc((reconciliation.known_differences || [])[0] || "If console totals differ, check export lag, invoice month vs usage month, taxes, adjustments, and missing billing-account exports.")}</span>
      </div>
    `;

    table("billingExportCoverageTable", rows.billingExportCoverage, [
      col("billing_account_id", "Billing account"),
      col("display_name", "Name"),
      col("export_status", "Export coverage", "status"),
      col("spend_available", "Actuals"),
      col("linked_projects_count", "Linked projects", "number"),
      col("cost_tables_count", "Cost tables", "number"),
      col("export_targets", "Export target"),
      col("unlock_action", "Unlock action")
    ], "No billing export coverage rows available. Run the collector to inspect billing accounts and export datasets.");
  }

  function renderAttributionGapsPanel() {
    const rows = scopedRows();
    const currency = (data.spend_summary && data.spend_summary.currency) || "USD";
    const selectedApp = state.app !== "all" ? appById(state.app) : null;
    const reviewRows = selectedApp ? attributionReviewsForApp(selectedApp) : rows.attributionGaps;
    const netTotal = sumNumber(reviewRows, "net_cost");
    const panel = $("attributionGapsPanel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="attribution-head">
        <div>
          <span class="metric-label">Attribution Gaps</span>
          <h3>${reviewRows.length ? "Spend needs business ownership confirmation" : "No attribution review rows in this scope"}</h3>
          <p>${reviewRows.length
            ? "These costs are real billing-export actuals, but management should confirm which business app owns them before moving them."
            : "Every spend-bearing project in this scope is either mapped or outside the current filters."}</p>
        </div>
        <div class="attribution-total">
          <span>Net payable under review</span>
          <strong>${moneyLabel(netTotal, currency)}</strong>
        </div>
      </div>
      <div class="attribution-cards">
        ${reviewRows.slice(0, 4).map((row) => `
          <button type="button" class="attribution-card" data-drill="attribution-gap" data-id="${esc(row.id)}">
            <span>${esc(row.project_id)}</span>
            <strong>${moneyLabel(row.net_cost, row.currency || currency)}</strong>
            <p>${esc(firstServiceLabel(row))} · currently under ${esc(row.current_business_app_name)}</p>
          </button>
        `).join("") || `<div class="empty compact">No spend-bearing attribution gaps found.</div>`}
      </div>
    `;
    table("attributionGapsTable", reviewRows, [
      col("project_id", "Project"),
      col("current_business_app_name", "Current app"),
      col("top_service_label", "Top service"),
      col("gross_cost", "Usage before credits", "money"),
      col("credits", "Credits / savings", "money"),
      col("net_cost", "Net payable", "money"),
      col("mapping_confidence", "Confidence", "status"),
      col("reason", "Why review"),
      col("suggested_action", "Suggested action")
    ], "No attribution gaps for this scope.");
  }

  function financeTerm(label, value, currency) {
    return `<div class="finance-term"><span>${esc(label)}</span><strong>${moneyLabel(value, currency)}</strong></div>`;
  }

  function renderDailyBars(rows, currency) {
    const grouped = {};
    arr(rows).forEach((row) => {
      const day = row.day || "unknown";
      grouped[day] = (grouped[day] || 0) + Number(row.net_cost ?? row.spend ?? 0);
    });
    const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return `<div class="empty compact">No daily actuals loaded.</div>`;
    const max = Math.max(...entries.map(([, value]) => value), 0.01);
    return `<div class="daily-bars" role="img" aria-label="Daily incurred cost bars">
      ${entries.map(([day, value]) => `
        <span class="daily-bar" title="${esc(day)}: ${esc(moneyLabel(value, currency))}" style="--bar-h:${Math.max(4, Math.round((value / max) * 100))}%">
          <i></i><small>${esc(day.slice(5))}</small>
        </span>
      `).join("")}
    </div>`;
  }

  function spendVisibility(projectCosts) {
    const rows = arr(projectCosts);
    const visibleRows = rows.filter((r) => r.current_month_spend_available === true);
    const unavailable = rows.filter((r) => r.current_month_spend_available !== true).length;
    let status = "UNAVAILABLE";
    if (rows.length && visibleRows.length === rows.length) status = "AVAILABLE";
    else if (visibleRows.length) status = "PARTIAL";
    else if (rows.some(r => r.spend_visibility_status === "CONFIGURED_WAITING_FOR_ROWS")) status = "CONFIGURED_WAITING_FOR_ROWS";
    else if (rows.some(r => r.spend_visibility_status === "NOT_CONFIGURED_CONSOLE_ACTION_REQUIRED")) status = "NOT_CONFIGURED_CONSOLE_ACTION_REQUIRED";
    else if (rows.some(r => ["COST_QUERY_BLOCKED", "QUERY_BLOCKED"].includes(r.spend_visibility_status))) status = "QUERY_BLOCKED";
    else if (rows.some(r => r.spend_visibility_status === "NOT_QUERIED")) status = "NOT_QUERIED";
    else if (rows.some(r => r.spend_visibility_status === "TABLES_PRESENT_NO_ROWS")) status = "TABLES_PRESENT_NO_ROWS";
    
    const tone = status === "AVAILABLE" ? "ok" : (["PARTIAL", "CONFIGURED_WAITING_FOR_ROWS", "NOT_QUERIED", "TABLES_PRESENT_NO_ROWS"].includes(status) ? "warn" : "bad");
    const message = status === "AVAILABLE"
      ? "Actual spend is visible for every cost row."
      : status === "PARTIAL"
        ? "Some actual spend is visible; remaining rows are unavailable, not zero."
        : status === "CONFIGURED_WAITING_FOR_ROWS"
          ? "Billing Export configured; waiting for rows."
          : status === "NOT_QUERIED"
            ? "Billing export tables are visible; spend queries were not run."
            : status === "TABLES_PRESENT_NO_ROWS"
              ? "Billing export tables are visible but contain no usage-cost rows yet."
              : (status === "QUERY_BLOCKED" ? "Query blocked by BigQuery permissions." : "Billing export not configured. Spend is unavailable, not zero.");
    return { status, tone, message, visible: visibleRows.length, unavailable, total: rows.length, visibleRows };
  }

  function billingExportState(projectCosts) {
    const visibility = spendVisibility(projectCosts);
    const summary = data.cost_summary || {};
    const runLog = data.collector_run_log_summary || {};
    const targetLabel = billingTargetLabel(selectedBillingTarget());
    const enabled = summary.billing_export_queries_enabled === true || runLog.billing_export_queries_enabled === true;
    if (visibility.status === "AVAILABLE") return { label: "AVAILABLE", tone: "ok", detail: "BigQuery billing export spend is visible for all rows." };
    if (visibility.status === "PARTIAL") return { label: "PARTIAL", tone: "warn", detail: "BigQuery billing export spend is only partially visible." };
    if (visibility.status === "CONFIGURED_WAITING_FOR_ROWS") return { label: "WAITING FOR ROWS", tone: "warn", detail: "BigQuery dataset exists, but waiting for Google to populate rows." };
    if (visibility.status === "TABLES_PRESENT_NO_ROWS") return { label: "NO ROWS", tone: "warn", detail: "Billing export tables exist but have no usage-cost rows yet." };
    if (visibility.status === "NOT_QUERIED") return { label: "NOT QUERIED", tone: "warn", detail: "Billing export tables are visible but spend queries were not run." };
    if (visibility.status === "QUERY_BLOCKED") return { label: "BLOCKED", tone: "bad", detail: `Access to ${targetLabel} was denied.` };
    if (!enabled) return { label: "NOT QUERIED", tone: "bad", detail: "Billing export queries are disabled; spend unavailable, not zero." };
    return { label: "UNAVAILABLE", tone: "bad", detail: summary.bigquery_billing_export_reason || "Billing export not configured." };
  }

  function sumSpend(rows) {
    const values = rows.map((r) => Number(r.current_month_spend)).filter((n) => Number.isFinite(n));
    if (!values.length) return "Spend unavailable";
    return values.reduce((a, b) => a + b, 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function moneyLabel(value, currency) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Unavailable";
    const code = currency && currency !== "unknown" ? currency : "USD";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(n);
    } catch {
      return `${code} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  }

  function appSpendSummary(app) {
    if (!app || app.visible_monthly_spend_available !== true) return "Actual spend unavailable";
    const currency = app.currency || (data.spend_summary && data.spend_summary.currency) || "USD";
    return `Gross ${moneyLabel(app.visible_monthly_gross_cost, currency)} · savings ${moneyLabel(app.visible_monthly_savings, currency)} · net ${moneyLabel(app.visible_monthly_spend, currency)}`;
  }

  function projectSpendSummary(profile) {
    if (!profile || profile.current_month_spend_available !== true) return "Actual spend unavailable";
    const currency = profile.currency || (data.spend_summary && data.spend_summary.currency) || "USD";
    return `Gross ${moneyLabel(profile.current_month_gross_cost, currency)} / net ${moneyLabel(profile.current_month_spend, currency)}`;
  }

  function renderActionNeeded() {
    const actions = arr(data.action_needed);
    const rows = scopedRows();
    
    // Filter action items based on activeFilter state
    let filteredActions = actions;
    if (state.activeFilter === "cost-blockers") {
      filteredActions = actions.filter(a => a.subsystem.toLowerCase().includes("billing") || a.subsystem.toLowerCase().includes("budget") || a.id.includes("cost") || a.id.includes("spend"));
    } else if (state.activeFilter === "firebase-blockers") {
      filteredActions = actions.filter(a => a.subsystem.toLowerCase().includes("firebase"));
    } else if (state.activeFilter === "unavailable") {
      filteredActions = actions.filter(a => a.severity === "critical");
    } else if (state.activeFilter === "warnings") {
      filteredActions = actions.filter(a => a.severity === "warning");
    }

    // Map targets to display account specific blocker info
    const scopedProjectIds = new Set(canonicalProfiles(rows.projectProfiles).map((profile) => profile.project_id));
    if (state.account !== "all") {
      filteredActions = filteredActions.filter(a => {
        const target = text(a["account/project/billing account"]);
        const subsystem = norm(a.subsystem);
        return target.includes(state.account) || subsystem.includes("billing export") || target.includes("billingAccounts");
      });
    }
    if (state.app !== "all" || state.environment !== "all") {
      filteredActions = filteredActions.filter(a => {
        const target = text(a["account/project/billing account"]);
        const subsystem = norm(a.subsystem);
        return subsystem.includes("billing export") || Array.from(scopedProjectIds).some((projectId) => target.includes(projectId));
      });
    }

    const counts = {
      all: actions.length,
      critical: actions.filter((a) => a.severity === "critical").length,
      warning: actions.filter((a) => a.severity === "warning").length,
      info: actions.filter((a) => !["critical", "warning"].includes(a.severity)).length
    };
    const tabs = [
      ["cost-risk", "All", counts.all],
      ["unavailable", "Critical", counts.critical],
      ["warnings", "Warning", counts.warning],
      ["firebase-blockers", "Info", counts.info]
    ].map(([lens, label, count]) => `<button type="button" class="action-tab ${state.activeFilter === lens ? "active" : ""}" data-lens="${esc(lens)}">${esc(label)} <span>${esc(count)}</span></button>`).join("");

    const body = filteredActions.length ? filteredActions.slice(0, 8).map((a) => {
      const isCopyable = text(a.exact_fix).startsWith("Run:") || text(a.exact_fix).includes("gcloud") || text(a.exact_fix).includes("firebase");
      const cleanFix = text(a.exact_fix).replace(/^Run:\s*/, "");
      const copyButton = isCopyable ? `<button type="button" class="copy-btn" data-copy="${esc(cleanFix)}">Copy fix</button>` : "";
      const linkFile = a.evidence_file ? `<span><strong>Evidence:</strong> <code>${esc(a.evidence_file)}</code></span>` : "";
      const tone = statusTone(a.severity);
      const actionLabel = a.subsystem && norm(a.subsystem).includes("firebase") ? "Connect" : a.approval_required ? "Review" : "Run";

      return `
        <details class="action-card ${esc(a.severity)}">
          <summary>
            <span class="action-icon ${tone}" aria-hidden="true">${iconSvg(tone === "bad" ? "lock" : "shield")}</span>
            <span>
              <strong>${esc(executiveActionTitle(a))}</strong>
              <small>${esc(a.problem)}</small>
            </span>
            <span class="status-pill ${tone}">${esc(titleLabel(a.severity))}</span>
          </summary>
          <div class="action-body">
            <p><strong>Impact:</strong> ${esc(a.why_it_matters)}</p>
            <p><strong>Owner/action:</strong> ${esc(actionOwner(a))}</p>
            <div class="fix-block">
              <strong>Action:</strong>
              <code>${esc(a.exact_fix)}</code>
              ${copyButton}
            </div>
            <div class="approval-row">
              <span><strong>Approval required:</strong> ${a.approval_required ? "Yes" : "No"}</span>
              ${linkFile}
            </div>
            <button type="button" class="open-detail" data-drill="action" data-id="${esc(a.id)}">${esc(actionLabel)}</button>
          </div>
        </details>
      `;
    }).join("") : '<div class="empty">No remaining blockers detected matching the active filters.</div>';

    $("actionNeededCards").innerHTML = `
      <div class="action-tabs">${tabs}</div>
      ${body}
      <div class="action-unlock">
        <strong>Complete these actions to unlock</strong>
        <span>Readable spend visibility</span>
        <span>Budget coverage reporting</span>
        <span>Firebase cost-surface confidence</span>
      </div>
    `;
  }

  function renderVisibilityLedger() {
    const sections = [
      ["projects", "Projects", data.projects],
      ["costs", "Costs", data.project_costs],
      ["billing", "Billing", data.billing_accounts],
      ["budgets", "Budgets", data.budgets],
      ["services", "APIs", data.services],
      ["quotas", "Quotas", data.quotas],
      ["firebase", "Firebase", data.firebase],
      ["resources", "Resources", data.resources]
    ];
    const accountRows = getAccounts().map((email) => {
      const cells = sections.map(([key, label, rows]) => {
        const count = arr(rows).filter((r) => accountOf(r) === email).length;
        const misses = arr(data.unavailable_sections).filter((u) => accountOf(u) === email && norm(u.section).includes(key.slice(0, 6))).length;
        const tone = count ? (misses ? "partial" : "visible") : (misses ? "blocked" : "empty");
        return `<td><span class="ledger-dot ${tone}"></span><span>${count}</span><small>${esc(label)}</small></td>`;
      }).join("");
      return `<tr><th>${esc(email)}</th>${cells}</tr>`;
    }).join("");
    $("visibilityLedger").innerHTML = `
      <div class="table-wrap ledger-wrap">
        <table class="ledger-table">
          <thead><tr><th>Account</th>${sections.map((s) => `<th>${esc(s[1])}</th>`).join("")}</tr></thead>
          <tbody>${accountRows}</tbody>
        </table>
      </div>
      <p class="legend"><span class="ledger-dot visible"></span>Visible <span class="ledger-dot partial"></span>Partial <span class="ledger-dot blocked"></span>Blocked <span class="ledger-dot empty"></span>No rows</p>
    `;
  }

  function renderCostCenterTables() {
    const rows = scopedRows();
    const warnings = rows.warnings.filter((w) => ["spend_unavailable", "budget_missing", "billing_visibility", "paid_api_enabled", "bounded_cost_api_visible", "quota_high_usage", "budget_visibility"].includes(w.category));

    $("costWarnings").innerHTML = warnings.length ? warnings.slice(0, 12).map((w) => `
      <article class="notice ${esc(w.level || "warning")}">
        <strong>${esc(w.category)}</strong>
        <span>${esc(w.project_id || w.account_email || "global")}</span>
        <p>${esc(w.message)}</p>
      </article>
    `).join("") : '<div class="empty">No cost warnings recorded for this view.</div>';

    table("billingAccountsTable", rows.billingAccounts, [
      col("account_email", "Account"),
      col("display_name", "Billing account"),
      col("billing_account_id", "ID"),
      col("open", "Open"),
      col("linked_projects_count", "Linked projects", "number"),
      col("budgets_count", "Budgets", "number"),
      col("spend_available", "Spend"),
      col("budget_visibility_warning", "Visibility warning")
    ], "No billing accounts visible for this view.");

    const projectCostRows = rows.projectCosts.map((r) => Object.assign({}, r, {
      current_month_spend_display: r.current_month_spend_available === true ? '$' + r.current_month_spend : "Spend unavailable, not zero",
      previous_month_spend_display: r.previous_month_spend_available === true ? '$' + r.previous_month_spend : "Spend unavailable, not zero",
      spend_visibility_status: r.current_month_spend_available === true ? "AVAILABLE" : r.spend_visibility_status
    }));
    
    table("projectCostsTable", projectCostRows, [
      col("account_email", "Account"),
      col("project_id", "Project"),
      col("billing_linked", "Billing linked"),
      col("billing_account_name", "Billing account"),
      col("spend_visibility_status", "Spend visibility", "status"),
      col("current_month_gross_cost", "Gross cost", "number"),
      col("current_month_savings", "Savings", "number"),
      col("current_month_spend_display", "Current month spend"),
      col("previous_month_spend_display", "Previous month spend"),
      col("budget_attached", "Budget"),
      col("budget_amount", "Budget amount"),
      col("cost_risk_services_count", "Cost-risk APIs", "number"),
      col("cost_status", "Cost status", "status"),
      col("spend_unavailable_reason", "Spend reason")
    ], "No per-project cost rows visible for this view.");

    table("spendByProjectTable", rows.spendByProject, [
      col("billing_account_id", "Billing account"),
      col("project_id", "Project"),
      col("display_name", "Display name"),
      col("current_month_gross_cost", "Gross cost", "number"),
      col("current_month_savings", "Savings", "number"),
      col("current_month_spend", "Net cost", "number"),
      col("previous_month_spend", "Previous net", "number"),
      col("currency", "Currency"),
      col("source_table", "Source table")
    ], "No project-level actual spend rows visible. Run the collector with billing export queries enabled after BigQuery access is available.");

    table("spendByServiceTable", rows.spendByService, [
      col("account_email", "Account"),
      col("billing_account_id", "Billing account"),
      col("project_id", "Project"),
      col("service_description", "Service"),
      col("gross_cost", "Gross cost", "number"),
      col("savings", "Savings", "number"),
      col("current_month_spend", "Net cost", "number"),
      col("currency", "Currency"),
      col("source_table", "Source table")
    ], "No service-level spend rows visible. Run the collector with billing export queries enabled after BigQuery access is available.");

    table("spendBySkuTable", rows.spendBySku, [
      col("account_email", "Account"),
      col("billing_account_id", "Billing account"),
      col("project_id", "Project"),
      col("service_description", "Service"),
      col("sku_description", "SKU"),
      col("gross_cost", "Gross cost", "number"),
      col("savings", "Savings", "number"),
      col("current_month_spend", "Net cost", "number"),
      col("usage_amount", "Usage", "number"),
      col("usage_unit", "Unit"),
      col("currency", "Currency")
    ], "No SKU-level spend rows visible. Run the collector with billing export queries enabled after BigQuery access is available.");

    table("spendDailyTable", rows.spendDaily, [
      col("account_email", "Account"),
      col("billing_account_id", "Billing account"),
      col("project_id", "Project"),
      col("day", "Day"),
      col("gross_cost", "Gross cost", "number"),
      col("savings", "Savings", "number"),
      col("spend", "Net spend", "number"),
      col("currency", "Currency")
    ], "No daily spend rows visible. Run the collector with billing export queries enabled after BigQuery access is available.");

    table("spendByResourceTable", rows.spendByResource, [
      col("billing_account_id", "Billing account"),
      col("project_id", "Project"),
      col("service_description", "Service"),
      col("sku_description", "SKU"),
      col("resource_name", "Resource"),
      col("gross_cost", "Gross cost", "number"),
      col("savings", "Savings", "number"),
      col("current_month_spend", "Net cost", "number"),
      col("currency", "Currency"),
      col("source_table", "Source table")
    ], "No detailed resource-level spend rows visible. Google only provides this when detailed billing export resource fields are populated.");

    table("budgetsTable", rows.budgets, [
      col("account_email", "Account"),
      col("billing_account_name", "Billing account"),
      col("display_name", "Budget"),
      col("budget_amount_display", "Amount"),
      col("threshold_rules", "Thresholds"),
      col("notes", "Notes")
    ], "No budgets visible for this view.");
  }

  function renderProjectExplorer() {
    const rows = scopedRows();
    const servicesByProject = countBy(rows.services, "project_id");
    const quotasByProject = countBy(rows.quotas, "project_id");
    const warningsByProject = countBy(rows.warnings, "project_id");
    const firebaseProjects = new Set(rows.firebase.filter((f) => f.firebase_project_detected).map((f) => f.project_id));
    const costsByProject = new Map(rows.projectCosts.map((c) => [c.project_id, c]));
    
    const projectRows = rows.projects.map((p) => Object.assign({}, p, {
      firebase_status: firebaseProjects.has(p.project_id) ? "yes" : "unknown",
      enabled_api_count: servicesByProject[p.project_id] || 0,
      quota_count: quotasByProject[p.project_id] || 0,
      warning_count: warningsByProject[p.project_id] || 0,
      cost_status: (costsByProject.get(p.project_id) || {}).cost_status || "UNKNOWN"
    }));
    
    table("projectExplorerTable", projectRows, [
      col("account_email", "Account"),
      col("project_id", "Project"),
      col("display_name", "Display name"),
      col("lifecycle_state", "Lifecycle", "status"),
      col("billing_account_linked", "Billing linked"),
      col("firebase_status", "Firebase"),
      col("enabled_api_count", "APIs", "number"),
      col("quota_count", "Quotas", "number"),
      col("warning_count", "Warnings", "number"),
      col("cost_status", "Cost status", "status")
    ], "No projects visible for this view.");
  }

  function renderServices() {
    const rows = costScoped(scopedRows().services).map((s) => Object.assign({}, s, {
      cost_marker: s.billing_risk_label || s.billing_relevance || "unknown",
      billing_relevance: s.billing_relevance || "unknown_cost"
    }));
    table("servicesTable", rows, [
      col("account_email", "Account"),
      col("project_id", "Project"),
      col("service_name", "Service"),
      col("title", "Title"),
      col("state", "State", "status"),
      col("billing_relevance", "Cost class", "status"),
      col("cost_marker", "Cost marker"),
      col("billing_risk_reason", "Why visible"),
      col("quota_collection_status", "Quota path")
    ], state.activeFilter === "known-free" ? "No known-free APIs visible for this view." : "No cost-risk APIs visible for this view.");
  }

  function renderQuotas() {
    table("quotasTable", scopedRows().quotas, [
      col("account_email", "Account"),
      col("project_id", "Project"),
      col("service", "Service"),
      col("quota_name", "Quota"),
      col("limit", "Limit"),
      col("usage", "Usage"),
      col("percentage_used", "% used"),
      col("collection_status", "Status", "status"),
      col("reason_unavailable", "Reason")
    ], "No quota rows visible for this view.");
  }

  function renderFirebase() {
    const accounts = scopedRows().accounts;
    const authStatus = TARGETS.map(email => {
      const a = accounts.find(acc => acc.email === email) || {};
      const authed = a.firebase_authenticated === true;
      const title = authed ? "AUTHORIZED" : "AUTH MISSING";
      const statusTone = authed ? "ok" : "bad";
      
      const blockerDetail = !authed 
        ? `<p style="font-size:12px; margin-top:8px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
             <strong>Blocker Reason:</strong> Account is missing from Firebase CLI. Run local CLI auth setup: 
             <br/><code style="display:block;margin-top:4px;">firebase login:add ${esc(email)}</code>
           </p>` 
        : "<p>Firebase CLI account is authorized locally.</p>";

      return `
        <article class="metric ${statusTone}">
          <span class="metric-label">${esc(email)}</span>
          <strong>${title}</strong>
          ${blockerDetail}
        </article>
      `;
    }).join("");

    const firebaseProjects = costScoped(scopedRows().firebase);
    
    // Construct HTML structure for Firebase Command Center
    let tableHtml = "";
    if (firebaseProjects.length) {
      // Build internal project details table
      const projectRows = firebaseProjects.map(f => {
        return `
          <tr>
            <td>${esc(f.account_email)}</td>
            <td><strong>${esc(f.project_id)}</strong></td>
            <td><span class="status-pill ${f.firebase_project_detected ? 'ok':'warn'}">${f.firebase_project_detected ? 'YES':'UNKNOWN'}</span></td>
            <td>${f.web_apps && f.web_apps.length ? f.web_apps.map(x=>`<span class="tag">${esc(x)}</span>`).join("") : '<span class="muted">none</span>'}</td>
            <td>${f.android_apps && f.android_apps.length ? f.android_apps.map(x=>`<span class="tag">${esc(x)}</span>`).join("") : '<span class="muted">none</span>'}</td>
            <td>${f.ios_apps && f.ios_apps.length ? f.ios_apps.map(x=>`<span class="tag">${esc(x)}</span>`).join("") : '<span class="muted">none</span>'}</td>
            <td><span class="status-pill ${statusTone(f.billing_relevance || 'unknown_cost')}">${esc(f.billing_relevance || 'unknown_cost')}</span><br/><small>${esc(f.billing_risk_label || '')}</small></td>
            <td>${f.hosting_sites && f.hosting_sites.length ? f.hosting_sites.map(x=>`<span class="tag" style="background:#eef2ff; color:#3730a3; border-color:#e0e7ff;">${esc(x)}</span>`).join("") : '<span class="muted">none</span>'}</td>
            <td>${f.realtime_databases && f.realtime_databases.length ? f.realtime_databases.map(x=>`<span class="tag" style="background:#fef2f2; color:#991b1b; border-color:#fee2e2;">${esc(x)}</span>`).join("") : '<span class="muted">none</span>'}</td>
            <td>${f.apphosting_backends && f.apphosting_backends.length ? f.apphosting_backends.map(x=>`<span class="tag">${esc(x)}</span>`).join("") : '<span class="muted">none</span>'}</td>
            <td><small>${esc(f.billing_risk_reason || '')}</small></td>
            <td><small>${f.notes && f.notes.length ? esc(f.notes.join("; ")) : 'ok'}</small></td>
          </tr>
        `;
      }).join("");
      
      tableHtml = `
        <div class="table-wrap table-block" style="margin-top:20px;">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Project ID</th>
                <th>Firebase Detected</th>
                <th>Web Apps</th>
                <th>Android Apps</th>
                <th>iOS Apps</th>
                <th>Cost class</th>
                <th>Hosting Sites</th>
                <th>Realtime DBs</th>
                <th>AppHosting Backends</th>
                <th>Why visible</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${projectRows}
            </tbody>
          </table>
        </div>
      `;
    } else {
      tableHtml = `<div class="empty" style="margin-top:20px;">${state.activeFilter === "known-free" ? "No known-free Firebase app registrations visible for this view." : "No cost-risk Firebase projects visible for this view. Ensure accounts are authorized and deep collection can inspect backing services."}</div>`;
    }

    $("firebaseTable").innerHTML = `
      <div class="metric-grid">
        ${authStatus}
      </div>
      ${tableHtml}
    `;
  }

  function renderResources() {
    table("resourcesTable", costScoped(scopedRows().resources), [
      col("account_email", "Account"),
      col("project_id", "Project"),
      col("resource_type", "Type"),
      col("name", "Name"),
      col("location", "Location"),
      col("state", "State", "status"),
      col("billing_relevance", "Cost class", "status"),
      col("billing_risk_label", "Cost marker"),
      col("billing_risk_reason", "Why visible"),
      col("risk_notes", "Risk notes")
    ], state.activeFilter === "known-free" ? "No known-free resource metadata visible for this view." : "No cost-risk resources visible for this view.");
  }

  function renderUnavailable() {
    table("unavailableTable", scopedRows().unavailable, [
      col("account_email", "Account"),
      col("project_id", "Project"),
      col("section", "Section"),
      col("code", "Code", "status"),
      col("reason", "Reason"),
      col("visibility_improvement", "Visibility improvement"),
      col("command", "Command")
    ], "No unavailable sections for this view.");
  }

  function col(key, label, kind) {
    return { key, label, kind: kind || "text" };
  }

  function table(id, rows, columns, emptyMessage, options) {
    const tableOptions = options || {};
    tableDefs[id] = { rows, columns, emptyMessage };
    if (!state.tables[id]) state.tables[id] = { query: "", status: "all", sortKey: columns[0].key, sortDir: "asc" };
    const cfg = state.tables[id];
    const statusOptions = uniq(rows.map((row) => firstStatusValue(row, columns))).filter((x) => x !== "unavailable").slice(0, 20);
    const controls = `
      <div class="table-controls">
        <label><span>Search</span><input type="search" data-table-search="${esc(id)}" value="${esc(cfg.query)}" placeholder="Filter rows"></label>
        <label><span>Status</span><select data-table-status="${esc(id)}">
          <option value="all">All statuses</option>
          ${statusOptions.map((v) => `<option value="${esc(v)}"${cfg.status === v ? " selected" : ""}>${esc(v)}</option>`).join("")}
        </select></label>
        <span class="row-count">${rows.length} rows</span>
      </div>`;
    const renderedRows = prepareRows(rows, columns, cfg);
    const body = renderedRows.length ? `<div class="table-wrap"><table><thead><tr>${columns.map((c) => `
      <th><button type="button" data-table-sort="${esc(id)}" data-sort-key="${esc(c.key)}">${esc(c.label)}${cfg.sortKey === c.key ? (cfg.sortDir === "asc" ? " ^" : " v") : ""}</button></th>
    `).join("")}</tr></thead><tbody>${renderedRows.map((row) => `<tr ${typeof tableOptions.rowAttrs === "function" ? tableOptions.rowAttrs(row) : ""}>${columns.map((c) => cell(row, c)).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="empty">${esc(emptyMessage)}</div>`;
    $(id).innerHTML = controls + body;
  }

  function prepareRows(rows, columns, cfg) {
    const query = norm(cfg.query);
    let out = rows.filter((row) => !query || columns.some((c) => norm(formatValue(row[c.key])).includes(query)));
    if (cfg.status !== "all") out = out.filter((row) => firstStatusValue(row, columns) === cfg.status);
    out = out.slice().sort((a, b) => {
      const av = a[cfg.sortKey];
      const bv = b[cfg.sortKey];
      const cmp = compare(av, bv);
      return cfg.sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }

  function firstStatusValue(row, columns) {
    const statusCol = columns.find((c) => c.kind === "status") || columns.find((c) => /status|state|code|linked|detected/i.test(c.key));
    return statusCol ? text(row[statusCol.key]) : "unavailable";
  }

  function compare(a, b) {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return text(a).localeCompare(text(b));
  }

  function cell(row, column) {
    const value = row[column.key];
    if (column.kind === "status") {
      const tone = statusTone(value);
      return `<td><span class="status-pill ${tone}" title="${esc(value)}">${esc(titleLabel(value))}</span></td>`;
    }
    if (column.kind === "number") return `<td class="num">${esc(value)}</td>`;
    return `<td>${formatValue(value)}</td>`;
  }

  function formatValue(value) {
    if (Array.isArray(value)) {
      if (!value.length) return '<span class="muted">none</span>';
      return value.slice(0, 6).map((item) => `<span class="tag">${esc(simpleValue(item))}</span>`).join("") + (value.length > 6 ? `<span class="tag">+${value.length - 6}</span>` : "");
    }
    if (value && typeof value === "object") return `<code>${esc(JSON.stringify(value))}</code>`;
    return esc(value);
  }

  function simpleValue(value) {
    if (value && typeof value === "object") return JSON.stringify(value);
    return value;
  }

  function statusTone(value) {
    const v = norm(value);
    if (["ok", "collected", "active", "enabled", "true", "yes", "visible", "limit_visible", "available", "authorized", "known_free", "spend visible", "budget visible", "cost visible"].includes(v)) return "ok";
    if (["warning", "watch", "partial", "unknown", "unknown_cost", "free_tier_limited", "quota_limited", "empty", "not queried", "not_queried", "tables_present_no_rows", "configured_waiting_for_rows", "info", "spend pending", "needs owner review", "visibility incomplete", "limits visible"].includes(v)) return "warn";
    if (["paid_risk", "spend blocked", "actual spend unavailable", "budget missing", "needs executive approval"].includes(v)) return "bad";
    if (["unavailable", "auth_missing", "auth missing", "critical", "spend unavailable"].includes(v)) return "bad";
    if (["failed", "permission_denied", "api_disabled", "command_not_found", "timeout", "false", "query_blocked", "cost_query_blocked", "query blocked"].includes(v)) return "bad";
    return "neutral";
  }

  function countBy(rows, key) {
    return rows.reduce((acc, row) => {
      const value = row[key];
      if (value) acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function manageSectionVisibility() {
    const sections = {
      board: $("boardOverview"),
      apps: $("applicationPortfolio"),
      relationships: $("relationshipMap"),
      project360: $("project360"),
      cost: $("costExposureCenter"),
      action: $("actionRoom"),
      confidence: $("dataConfidence"),
      advanced: $("advancedInventory")
    };

    Object.values(sections).forEach((sec) => {
      if (sec) {
        sec.style.display = "block";
        sec.classList.toggle("lens-emphasis", false);
      }
    });
    const emphasized = {
      "cost-risk": [sections.board, sections.relationships, sections.cost],
      "cost-blockers": [sections.action, sections.cost, sections.confidence],
      "firebase-blockers": [sections.action, sections.apps, sections.confidence],
      "unavailable": [sections.confidence, sections.action],
      "warnings": [sections.action, sections.project360],
      "known-free": [sections.advanced]
    }[state.activeFilter] || [];
    emphasized.forEach((sec) => { if (sec) sec.classList.add("lens-emphasis"); });
  }

  function openDrawer(type, id) {
    if (!type || !id) return;
    state.drawer = { type, id };
    writeHashState();
    renderDrawer();
  }

  function closeDrawer() {
    state.drawer = null;
    writeHashState();
    renderDrawer();
  }

  function renderDrawer() {
    const drawer = $("detailDrawer");
    const backdrop = $("drawerBackdrop");
    const content = $("drawerContent");
    const title = $("drawerTitle");
    const kicker = $("drawerKicker");
    if (!drawer || !backdrop || !content || !title || !kicker) return;
    if (!state.drawer) {
      drawer.hidden = true;
      backdrop.hidden = true;
      document.body.classList.remove("drawer-open");
      return;
    }
    const detail = drawerModel(state.drawer.type, state.drawer.id);
    kicker.textContent = detail.kicker;
    title.textContent = detail.title;
    content.innerHTML = detail.html;
    drawer.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("drawer-open");
  }

  function drawerModel(type, id) {
    if (type === "app") return appDrawer(id);
    if (type === "project") return projectDrawer(id);
    if (type === "resource") return resourceDrawer(id);
    if (type === "service-spend") return serviceSpendDrawer(id);
    if (type === "attribution-gap") return attributionGapDrawer(id);
    if (type === "action") return actionDrawer(id);
    return { kicker: "Detail", title: "No selection", html: '<div class="empty">Nothing selected.</div>' };
  }

  function appDrawer(appId) {
    const app = appById(appId);
    if (!app) return { kicker: "Business app", title: "App not found", html: '<div class="empty">This app is not visible in the current inventory.</div>' };
    const vm = appManagementVm(app);
    const profiles = vm.profiles;
    const resources = vm.resources;
    const blockers = arr(app.blockers).slice(0, 8);
    const currency = (data.spend_summary || {}).currency || app.currency || "USD";
    const billingActuals = billingActualsForApp(app);
    const reviewRows = attributionReviewsForApp(app);
    const billingNet = sumNumber(billingActuals, "net_cost");
    const appNetLabel = app.visible_monthly_spend_available ? moneyLabel(app.visible_monthly_spend, currency) : (app.actual_spend_status || "Actual spend unavailable");
    return {
      kicker: "Business app 360",
      title: app.display_name || app.app_id,
      html: `
        <div class="drawer-grid">
          ${metricCard(`${app.display_name || "App"} mapped net payable`, appNetLabel, app.visible_monthly_spend_available ? appSpendSummary(app) : "Only confidently mapped app projects are included here.", statusTone(app.actual_spend_status))}
          ${metricCard("Budget status", app.budget_status || "Budget unknown", `${app.projects_without_budget || 0} mapped project(s) without visible budgets.`, statusTone(app.budget_status))}
          ${metricCard("Projects", vm.projectCount, `${vm.firebaseProjectCount} Firebase-linked mapped project(s).`, "neutral")}
          ${metricCard("Risk score", `${app.risk_score || 0}/100`, app.cost_exposure_label || "Cost exposure score.", Number(app.risk_score || 0) > 70 ? "bad" : "warn")}
        </div>
        ${app.visible_monthly_spend_available || billingActuals.length || reviewRows.length ? `
          <section class="drawer-section">
            <h3>Actual cost reconciliation</h3>
            <div class="finance-equation drawer-finance">
              ${financeTerm("Mapped usage before credits", app.visible_monthly_gross_cost, currency)}
              <span class="finance-operator">+</span>
              ${financeTerm("Mapped credits / savings", app.visible_monthly_credits, currency)}
              <span class="finance-operator">=</span>
              ${financeTerm("Mapped net payable", app.visible_monthly_spend, currency)}
              ${financeTerm("Same billing-account net payable", billingActuals.length ? billingNet : "unavailable", currency)}
            </div>
            ${reviewRows.length ? `
              <div class="context-callout warn">
                <strong>${moneyLabel(sumNumber(reviewRows, "net_cost"), currency)} net payable needs attribution review on the same billing account.</strong>
                <p>${esc(reviewRows[0].project_id)} (${esc(firstServiceLabel(reviewRows[0]))}) is currently mapped to ${esc(reviewRows[0].current_business_app_name)}. Move it to ${esc(app.display_name)} only if the app registry evidence supports that ownership.</p>
              </div>
            ` : ""}
          </section>
        ` : ""}
        <section class="drawer-section">
          <h3>Management summary</h3>
          <p>${esc(app.executive_summary || "No executive summary available.")}</p>
          <dl class="detail-list">
            <div><dt>Business owner</dt><dd>${esc(app.business_owner || "Unassigned")}</dd></div>
            <div><dt>Technical owner</dt><dd>${esc(app.technical_owner || "Unassigned")}</dd></div>
            <div><dt>Environment</dt><dd>${esc(titleLabel(app.environment || "unknown"))}</dd></div>
            <div><dt>Mapping confidence</dt><dd>${esc(titleLabel(app.confidence || "low"))}: ${esc(app.mapping_explanation || "Verify in app_registry.json.")}</dd></div>
          </dl>
        </section>
        <section class="drawer-section">
          <h3>App Relationship Ledger</h3>
          <div class="drawer-path">
            ${drawerNode("Google projects", vm.projectCount, arr(app.mapped_google_projects).slice(0, 6).join(", ") || "No mapped projects")}
            ${drawerNode("Firebase", vm.firebaseProjectCount, arr(app.mapped_firebase_projects).slice(0, 4).join(", ") || "No Firebase link")}
            ${drawerNode("Resources", vm.resourceCount, appResourceSummary(app))}
            ${drawerNode("Cost APIs", vm.apiCount, "Cost-exposure services visible")}
            ${drawerNode("Billing", arr(app.mapped_billing_accounts).length, arr(app.mapped_billing_accounts).slice(0, 3).join(", ") || "Billing unclear")}
          </div>
        </section>
        <section class="drawer-section">
          <h3>Projects supporting this app</h3>
          ${miniRows(profiles.slice(0, 12), (profile) => `
            <button type="button" class="mini-row" data-drill="project" data-id="${esc(profile.project_id)}">
              <strong>${esc(profile.project_id)}</strong>
              <span>${esc(profile.spend_visibility_label || "Spend unavailable")} · ${esc(profile.budget_status || "Budget unknown")}</span>
            </button>
          `)}
        </section>
        ${reviewRows.length ? `
          <section class="drawer-section">
            <h3>Spend nearby, ownership not confirmed</h3>
            ${miniRows(reviewRows.slice(0, 6), (row) => `
              <button type="button" class="mini-row" data-drill="attribution-gap" data-id="${esc(row.id)}">
                <strong>${esc(row.project_id)} · ${moneyLabel(row.net_cost, row.currency || currency)}</strong>
                <span>${esc(firstServiceLabel(row))} is currently attributed to ${esc(row.current_business_app_name)}.</span>
              </button>
            `)}
          </section>
        ` : ""}
        <section class="drawer-section">
          <h3>Priority blockers</h3>
          ${blockers.length ? blockers.map(blockerCard).join("") : '<div class="empty">No blockers visible for this app.</div>'}
        </section>
      `
    };
  }

  function attributionGapDrawer(id) {
    const gap = arr(data.attribution_gaps).find((row) => row.id === id);
    if (!gap) return { kicker: "Attribution review", title: "Spend row not found", html: '<div class="empty">This attribution row is not visible in the current data.</div>' };
    const currency = gap.currency || (data.spend_summary && data.spend_summary.currency) || "USD";
    return {
      kicker: "Attribution review",
      title: gap.project_id || "Spend-bearing project",
      html: `
        <div class="drawer-grid">
          ${metricCard("Net payable", moneyLabel(gap.net_cost, currency), "Billing-export actual net cost for this project.", "warn")}
          ${metricCard("Usage before credits", moneyLabel(gap.gross_cost, currency), `Credits / savings ${moneyLabel(gap.credits, currency)}.`, "neutral")}
          ${metricCard("Current app", gap.current_business_app_name || "Unmapped", `${titleLabel(gap.mapping_confidence || "low")} confidence · ${esc(gap.mapping_source || "unknown")}.`, "neutral")}
          ${metricCard("Top service", firstServiceLabel(gap), "Service/SKU drilldown comes from billing export rows.", "neutral")}
        </div>
        <section class="drawer-section">
          <h3>Why management should review this</h3>
          <p>${esc(gap.reason || "This spend-bearing project needs ownership confirmation.")}</p>
          <p><strong>Suggested action:</strong> ${esc(gap.suggested_action || "Confirm the owning app in data/app_registry.json.")}</p>
        </section>
        <section class="drawer-section">
          <h3>Service lines</h3>
          ${miniRows(arr(gap.top_services), (row) => `
            <div class="mini-row">
              <strong>${esc(row.service_description || "Service")}</strong>
              <span>gross ${moneyLabel(row.gross_cost, row.currency || currency)} · credits ${moneyLabel(row.credits, row.currency || currency)} · net ${moneyLabel(row.net_cost, row.currency || currency)}</span>
            </div>
          `)}
        </section>
        <section class="drawer-section">
          <h3>Registry recommendation</h3>
          <dl class="detail-list">
            <div><dt>File</dt><dd>${esc((gap.registry_hint || {}).file || "data/app_registry.json")}</dd></div>
            <div><dt>Project id</dt><dd>${esc((gap.registry_hint || {}).project_id || gap.project_id)}</dd></div>
            <div><dt>Current app id</dt><dd>${esc((gap.registry_hint || {}).current_app_id || gap.current_business_app_id)}</dd></div>
            <div><dt>Billing account</dt><dd>${esc(gap.billing_account_id || "unavailable")}</dd></div>
          </dl>
          <p class="microcopy">Do not move this cost automatically. Update the registry only when ownership evidence supports the decision.</p>
        </section>
      `
    };
  }

  function projectDrawer(projectId) {
    const profile = projectById(projectId);
    if (!profile) return { kicker: "Project 360", title: "Project not found", html: '<div class="empty">This project is not visible in the current inventory.</div>' };
    const resources = arr(data.resource_cost_exposure).filter((resource) => resource.project_id === projectId);
    const services = arr(data.services).filter((service) => service.project_id === projectId && isCostRisk(service)).slice(0, 12);
    const firebase = arr(data.firebase).filter((row) => row.project_id === projectId);
    const unavailable = arr(data.unavailable_sections).filter((row) => row.project_id === projectId).slice(0, 6);
    return {
      kicker: "Project 360",
      title: profile.project_id || projectId,
      html: `
        <div class="drawer-grid">
          ${metricCard("Business app", profile.business_app_name || "Unmapped", titleLabel(profile.app_relationship && profile.app_relationship.confidence), "neutral")}
          ${metricCard("Net cost", profile.current_month_spend_available ? moneyLabel(profile.current_month_spend, profile.currency) : (profile.spend_visibility_label || "Actual spend unavailable"), profile.current_month_spend_available ? `Gross ${moneyLabel(profile.current_month_gross_cost, profile.currency)}, savings ${moneyLabel(profile.current_month_savings, profile.currency)}.` : (profile.spend_unavailable_reason || "Spend unavailable, not zero."), profile.current_month_spend_available ? "ok" : "bad")}
          ${metricCard("Budget", profile.budget_status || "Budget unknown", profile.budget_amount ? `Budget amount: ${profile.budget_amount}` : "Budget visibility missing.", statusTone(profile.budget_status))}
          ${metricCard("Exposure", `${profile.cost_risk_apis_count || 0} APIs`, `${profile.cost_risk_resources_count || 0} paid-risk resources visible.`, "warn")}
        </div>
        ${profile.current_month_spend_available ? `
          <section class="drawer-section">
            <h3>Actual cost reconciliation</h3>
            <div class="finance-equation drawer-finance">
              ${financeTerm("Gross cost", profile.current_month_gross_cost, profile.currency)}
              <span class="finance-operator">+</span>
              ${financeTerm("Credits / savings", profile.current_month_credits, profile.currency)}
              <span class="finance-operator">=</span>
              ${financeTerm("Net cost", profile.current_month_spend, profile.currency)}
            </div>
            <p class="microcopy">Source: ${esc(profile.billing_export_source_table || "Cloud Billing export")}.</p>
          </section>
        ` : ""}
        <section class="drawer-section">
          <h3>What this project represents</h3>
          <p>${esc(profile.what_it_represents || "Project purpose is not yet mapped.")}</p>
          <p><strong>What can cost money:</strong> ${esc(profile.what_can_cost_money || "Cost drivers unavailable.")}</p>
          <p><strong>Missing:</strong> ${esc(profile.what_is_missing || "No missing context recorded.")}</p>
        </section>
        <section class="drawer-section">
          <h3>Relationship and governance</h3>
          <dl class="detail-list">
            <div><dt>Account</dt><dd>${esc(profile.account_email)}</dd></div>
            <div><dt>Billing account</dt><dd>${esc(profile.billing_account_name || "unavailable")}</dd></div>
            <div><dt>Firebase</dt><dd>${profile.firebase_linked ? "Firebase linked" : "No Firebase link visible"}</dd></div>
            <div><dt>Quota visibility</dt><dd>${esc(profile.quota_visibility_status || "unavailable")}</dd></div>
          </dl>
        </section>
        <section class="drawer-section">
          <h3>Visible resource cost drivers</h3>
          ${miniRows(resources.slice(0, 10), (resource) => `
            <button type="button" class="mini-row" data-drill="resource" data-id="${esc(resourceKey(resource))}">
              <strong>${esc(resource.cost_driver_label || resource.resource_type)}</strong>
              <span>${esc(resource.name)} · ${esc(resource.actual_cost_status)}</span>
            </button>
          `)}
        </section>
        <section class="drawer-section">
          <h3>Cost-risk APIs and Firebase surfaces</h3>
          ${miniRows(services, (service) => `<div class="mini-row"><strong>${esc(service.title || service.service_name)}</strong><span>${esc(service.billing_risk_reason || service.billing_relevance)}</span></div>`)}
          ${firebase.length ? miniRows(firebase, (row) => `<div class="mini-row"><strong>Firebase metadata</strong><span>${esc(row.billing_risk_label || "Firebase surface visible")}</span></div>`) : ""}
        </section>
        <section class="drawer-section">
          <h3>Visibility gaps</h3>
          ${unavailable.length ? unavailable.map((row) => `<div class="blocker-card"><strong>${esc(row.section)}</strong><p>${esc(row.reason)}</p><small>${esc(row.visibility_improvement || "Review access and rerun.")}</small></div>`).join("") : '<div class="empty">No project-specific visibility gaps recorded.</div>'}
        </section>
      `
    };
  }

  function resourceDrawer(key) {
    const resource = resourceByKey(key);
    if (!resource) return { kicker: "Resource", title: "Resource not found", html: '<div class="empty">This resource is not visible in the current inventory.</div>' };
    return {
      kicker: "Resource cost exposure",
      title: resource.name || resource.resource_type,
      html: `
        <div class="drawer-grid">
          ${metricCard("Actual cost", resource.actual_cost_status === "available" ? moneyLabel(resource.actual_monthly_cost, resource.currency) : titleLabel(resource.actual_cost_status), resource.actual_cost_reason || "Resource cost unavailable.", statusTone(resource.actual_cost_status))}
          ${metricCard("Gross cost", resource.actual_cost_status === "available" ? moneyLabel(resource.actual_monthly_gross_cost, resource.currency) : "Unavailable", resource.actual_cost_status === "available" ? `Savings ${moneyLabel(resource.actual_monthly_savings, resource.currency)}.` : "Detailed export did not identify this resource.", resource.actual_cost_status === "available" ? "ok" : "neutral")}
          ${metricCard("Cost driver", resource.cost_driver_label || resource.cost_class || "Cost driver", resource.cost_exposure || "Cost exposure metadata.", statusTone(resource.billing_relevance))}
          ${metricCard("Project", resource.project_id || "unavailable", resource.business_app_name || "No app mapping.", "neutral")}
        </div>
        <section class="drawer-section">
          <h3>How to unlock actual cost</h3>
          <p>${esc(resource.unlock_action || "Approve billing export access and rerun collection before showing actual resource spend.")}</p>
        </section>
      `
    };
  }

  function serviceSpendDrawer(id) {
    const [projectId, serviceDescription] = text(id).split("|");
    const rows = arr(data.spend_by_sku).filter((row) => row.project_id === projectId && row.service_description === serviceDescription)
      .sort((a, b) => firstFiniteNumber(b, ["net_cost", "current_month_spend"]) - firstFiniteNumber(a, ["net_cost", "current_month_spend"]));
    const serviceRow = arr(data.spend_by_service).find((row) => row.project_id === projectId && row.service_description === serviceDescription) || {};
    const currency = serviceRow.currency || rows[0]?.currency || "USD";
    return {
      kicker: "Service cost",
      title: serviceDescription || "Service spend",
      html: `
        <div class="drawer-grid">
          ${metricCard("Gross cost", moneyLabel(serviceRow.gross_cost, currency), "Before credits and savings.", "neutral")}
          ${metricCard("Savings", moneyLabel(serviceRow.savings, currency), "Credits and savings from billing export.", "ok")}
          ${metricCard("Net cost", moneyLabel(serviceRow.net_cost ?? serviceRow.current_month_spend, currency), "Actual incurred net cost from billing export.", "ok")}
          ${metricCard("Project", projectId || "unattributed", "Project attached to this spend row.", "neutral")}
        </div>
        <section class="drawer-section">
          <h3>SKU line items</h3>
          ${rows.length ? rows.slice(0, 30).map((row) => `
            <div class="mini-row">
              <strong>${esc(row.sku_description || "SKU")}</strong>
              <span>${moneyLabel(row.net_cost ?? row.current_month_spend, row.currency || currency)} · gross ${moneyLabel(row.gross_cost, row.currency || currency)} · savings ${moneyLabel(row.savings, row.currency || currency)}</span>
            </div>
          `).join("") : '<div class="empty">No SKU rows are visible for this service.</div>'}
        </section>
      `
    };
  }

  function actionDrawer(actionId) {
    const action = actionById(actionId);
    if (!action) return { kicker: "Action", title: "Action not found", html: '<div class="empty">This action is not visible in the current inventory.</div>' };
    return {
      kicker: "Action Room",
      title: `${action.subsystem} — ${action.current_status}`,
      html: `
        <section class="drawer-section">
          <h3>Problem</h3>
          <p>${esc(action.problem)}</p>
          <h3>Business impact</h3>
          <p>${esc(action.why_it_matters)}</p>
          <div class="fix-block">
            <strong>Exact action</strong>
            <code>${esc(action.exact_fix)}</code>
            <button type="button" class="copy-btn" data-copy="${esc(text(action.exact_fix).replace(/^Run:\s*/, ""))}">Copy fix</button>
          </div>
          <dl class="detail-list">
            <div><dt>Target</dt><dd>${esc(action["account/project/billing account"])}</dd></div>
            <div><dt>Approval required</dt><dd>${action.approval_required ? "Yes" : "No"}</dd></div>
            <div><dt>Evidence</dt><dd>${esc(action.evidence_file || "unavailable")}</dd></div>
          </dl>
        </section>
      `
    };
  }

  function drawerNode(label, value, detail) {
    return `<div class="drawer-node"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail || "unavailable")}</small></div>`;
  }

  function appResourceSummary(app) {
    const rows = arr(app.mapped_resources).slice(0, 5).map((item) => {
      if (!item || typeof item !== "object") return text(item);
      return `${item.project_id || "project"}: ${item.count || 0}`;
    }).filter(Boolean);
    return rows.length ? rows.join(", ") : "No resources";
  }

  function miniRows(rows, renderRow) {
    const list = arr(rows);
    return list.length ? `<div class="mini-rows">${list.map(renderRow).join("")}</div>` : '<div class="empty">No rows visible.</div>';
  }

  function blockerCard(blocker) {
    return `<div class="blocker-card ${esc(blocker.severity || "warning")}"><strong>${esc(blocker.plain_label || blocker.type || "Blocker")}</strong><p>${esc(blocker.business_impact || blocker.reason || "")}</p><small>${esc(blocker.unlock_action || "Review access and rerun.")}</small></div>`;
  }

  document.addEventListener("input", (event) => {
    const input = event.target.closest("[data-table-search]");
    if (!input) return;
    const id = input.getAttribute("data-table-search");
    state.tables[id].query = input.value;
    render();
  });

  document.addEventListener("change", (event) => {
    const relationshipSelect = event.target.closest("[data-relationship-app]");
    if (relationshipSelect) {
      state.app = relationshipSelect.value || "all";
      commitState();
      return;
    }

    const select = event.target.closest("[data-table-status]");
    if (!select) return;
    const id = select.getAttribute("data-table-status");
    state.tables[id].status = select.value;
    render();
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-drawer]");
    if (closeButton) {
      closeDrawer();
      return;
    }

    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      const textToCopy = copyButton.getAttribute("data-copy") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyButton.textContent = "Copied";
          window.setTimeout(() => { copyButton.textContent = "Copy fix"; }, 1400);
        }).catch(() => fallbackCopy(textToCopy, copyButton));
      } else {
        fallbackCopy(textToCopy, copyButton);
      }
      return;
    }

    const lensButton = event.target.closest("[data-lens]");
    if (lensButton) {
      state.activeFilter = lensButton.getAttribute("data-lens") || "cost-risk";
      commitState();
      return;
    }

    const drill = event.target.closest("[data-drill]");
    if (drill) {
      const type = drill.getAttribute("data-drill");
      const id = drill.getAttribute("data-id");
      if (type && id) openDrawer(type, id);
      return;
    }

    const button = event.target.closest("[data-table-sort]");
    if (!button) return;
    const id = button.getAttribute("data-table-sort");
    const key = button.getAttribute("data-sort-key");
    const cfg = state.tables[id];
    if (cfg.sortKey === key) cfg.sortDir = cfg.sortDir === "asc" ? "desc" : "asc";
    else {
      cfg.sortKey = key;
      cfg.sortDir = "asc";
    }
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const drill = event.target.closest("[data-drill][tabindex]");
    if (!drill) return;
    event.preventDefault();
    openDrawer(drill.getAttribute("data-drill"), drill.getAttribute("data-id"));
  });

  window.addEventListener("hashchange", () => {
    hydrateStateFromHash();
    render();
  });

  function fallbackCopy(textToCopy, button) {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      if (button) {
        button.textContent = "Copied";
        window.setTimeout(() => { button.textContent = "Copy fix"; }, 1400);
      }
    } finally {
      textarea.remove();
    }
  }

  init();
})();
