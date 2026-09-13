/**
 * Handoff Evidence Workspace - Application Logic
 * Implements the 5-step Connected Evidence System per DESIGN.md
 * Local-only. No external data sending.
 */

(function () {
  "use strict";

  // -- Canonical 12 items (must match report-generator.js exactly) --
  var CATEGORIES = [
    {
      name: "A. Ownership and Control",
      items: [
        { id: "repo-control", label: "Repository control", order: 1 },
        { id: "domain-dns-control", label: "Domain / DNS control", order: 2 },
        { id: "hosting-control", label: "Hosting / deployment platform control", order: 3 },
        { id: "database-control", label: "Database control", order: 4 },
        { id: "other-services", label: "Other operational services", order: 5 },
      ],
    },
    {
      name: "B. Reproducibility",
      items: [
        { id: "clean-install", label: "Clean install", order: 6 },
        { id: "production-build", label: "Production build", order: 7 },
        { id: "env-var-docs", label: "Environment-variable documentation", order: 8 },
      ],
    },
    {
      name: "C. Operations",
      items: [
        { id: "deployment", label: "Deployment procedure", order: 9 },
        { id: "rollback", label: "Rollback procedure", order: 10 },
        { id: "data-recovery", label: "Data-recovery procedure", order: 11 },
      ],
    },
    {
      name: "D. Known Manual Dependencies",
      items: [
        { id: "known-issues", label: "Known issues / manual processes", order: 12 },
      ],
    },
  ];

  var ALL_ITEMS = [];
  CATEGORIES.forEach(function (cat) {
    cat.items.forEach(function (item) {
      ALL_ITEMS.push(item);
    });
  });

  var VALID_STATUSES = ["SUPPORTED", "ATTESTED", "NOT SUPPORTED", "NOT ASSESSED"];

  // -- State --
  var state = {
    evidence: null,
    statuses: {},  // { itemId: { status: "", notes: "", recommendation: "" } }
    currentView: "intake",
    domainHistory: [],
  };

  // -- DOM helpers --
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") e.className = attrs[k];
        else if (k === "textContent") e.textContent = attrs[k];
        else if (k === "innerHTML") e.innerHTML = attrs[k];
        else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      if (typeof children === "string") e.innerHTML = children;
      else if (Array.isArray(children)) children.forEach(function (c) { if (c) e.appendChild(c); });
      else e.appendChild(children);
    }
    return e;
  }

  // -- Navigation --
  var VIEWS = ["intake", "review", "domain", "preview", "export"];

  function switchView(viewName) {
    state.currentView = viewName;
    VIEWS.forEach(function (v) {
      var section = $("#view" + v.charAt(0).toUpperCase() + v.slice(1));
      if (section) {
        if (v === viewName) section.classList.remove("hidden");
        else section.classList.add("hidden");
      }
    });
    // Update rail
    $$(".rail-node").forEach(function (node) {
      var nv = node.getAttribute("data-view");
      node.classList.remove("active");
      if (nv === viewName) node.classList.add("active");
      // Enable nodes up to current + 1
      var vIdx = VIEWS.indexOf(viewName);
      var nIdx = VIEWS.indexOf(nv);
      node.disabled = nIdx > vIdx + 1;
      if (nIdx < vIdx) node.classList.add("completed");
      else node.classList.remove("completed");
    });
    updateSummaryStrip();
    // Scroll to top
    window.scrollTo(0, 0);
  }

  function updateSummaryStrip() {
    var counts = computeCounts();
    var total = ALL_ITEMS.length;
    var reviewed = 0;
    var gaps = 0;
    ALL_ITEMS.forEach(function (item) {
      var s = state.statuses[item.id];
      if (s && s.status && s.status !== "NOT ASSESSED") reviewed++;
      if (s && s.status === "NOT SUPPORTED") gaps++;
    });

    $("#metricTotal").textContent = total;
    $("#metricReviewed").textContent = reviewed;
    $("#metricGaps").textContent = gaps;

    var readyEl = $("#metricReady");
    var readyParent = readyEl.parentElement;
    if (reviewed === total && gaps === 0) {
      readyEl.textContent = "Ready";
      readyParent.classList.add("metric-ready");
    } else {
      readyEl.textContent = "Not ready";
      readyParent.classList.remove("metric-ready");
    }
  }

  // -- Compute counts from actual state --
  function computeCounts() {
    var counts = { SUPPORTED: 0, ATTESTED: 0, "NOT SUPPORTED": 0, "NOT ASSESSED": 0 };
    ALL_ITEMS.forEach(function (item) {
      var s = state.statuses[item.id];
      if (s && s.status && VALID_STATUSES.indexOf(s.status) !== -1) {
        counts[s.status]++;
      } else {
        counts["NOT ASSESSED"]++;
      }
    });
    return counts;
  }

  function updateReviewSummary() {
    var counts = computeCounts();
    var total = ALL_ITEMS.length;

    $("#countSupported").textContent = counts.SUPPORTED;
    $("#countAttested").textContent = counts.ATTESTED;
    $("#countNotSupported").textContent = counts["NOT SUPPORTED"];
    $("#countNotAssessed").textContent = counts["NOT ASSESSED"];

    // Proportion bar
    var bar = $("#summaryBar");
    bar.innerHTML = "";
    var colors = {
      SUPPORTED: "supported",
      ATTESTED: "attested",
      "NOT SUPPORTED": "not-supported",
      "NOT ASSESSED": "not-assessed",
    };
    ["SUPPORTED", "ATTESTED", "NOT SUPPORTED", "NOT ASSESSED"].forEach(function (key) {
      if (counts[key] > 0) {
        var seg = el("div", {
          className: "summary-bar-seg " + colors[key],
          style: "width: " + (counts[key] / total * 100) + "%",
          title: key + ": " + counts[key],
        });
        bar.appendChild(seg);
      }
    });

    updateSummaryStrip();
  }

  // -- Evidence Loading --
  function loadEvidence(data) {
    state.evidence = data;
    // Initialize statuses from existing state or empty
    ALL_ITEMS.forEach(function (item) {
      if (!state.statuses[item.id]) {
        state.statuses[item.id] = { status: "", notes: "", recommendation: "" };
      }
    });
    renderIntakeDetails();
    renderReviewItems();
    updateReviewSummary();
    enableRailUpTo("review");
    $("#btnToIntakeNext").disabled = false;
  }

  function renderIntakeDetails() {
    var data = state.evidence;
    if (!data) return;

    var info = data.projectInfo || {};
    var meta = data.meta || {};
    var cats = data.categories || {};

    $("#detailProject").textContent = info.name || "Unknown";
    $("#detailCollected").textContent = meta.collectedAt || "Unknown";

    // Count items
    var itemCount = 0;
    Object.keys(cats).forEach(function (catName) {
      itemCount += Object.keys(cats[catName]).length;
    });
    $("#detailItems").textContent = itemCount;

    // Env var names
    var envNames = [];
    Object.keys(cats).forEach(function (catName) {
      var cat = cats[catName];
      Object.keys(cat).forEach(function (itemId) {
        var item = cat[itemId];
        if (item.envVarNames) {
          envNames = envNames.concat(item.envVarNames);
        }
      });
    });
    var envEl = $("#detailEnvVars");
    if (envNames.length > 0) {
      envEl.textContent = envNames.length + " names";
      envEl.classList.add("mono");
      envEl.title = envNames.join(", ");
    } else {
      envEl.textContent = "None detected";
    }

    // Install/build results
    var installItem = findItem(cats, "clean-install");
    var buildItem = findItem(cats, "production-build");

    if (installItem && installItem.automated) {
      $("#detailInstallRow").hidden = false;
      $("#detailInstall").textContent = "Exit " + installItem.exitCode + " (" + installItem.command + ", " + installItem.durationMs + "ms)";
      $("#detailInstall").classList.add("mono");
    }
    if (buildItem && buildItem.automated) {
      $("#detailBuildRow").hidden = false;
      $("#detailBuild").textContent = "Exit " + buildItem.exitCode + " (" + buildItem.command + ", " + buildItem.durationMs + "ms)";
      $("#detailBuild").classList.add("mono");
    }

    // Update project name in topbar
    $("#projectName").textContent = info.name || "No project loaded";

    // Show details
    $("#intakeDetails").hidden = false;
    $("#intakeFileInfo").innerHTML = '<p class="intake-empty" style="color:var(--supported);font-weight:600;">Evidence loaded: ' + escapeHtml(info.name || "Unknown") + '</p>';
  }

  function findItem(cats, itemId) {
    for (var catName in cats) {
      if (cats[catName][itemId]) return cats[catName][itemId];
    }
    return null;
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // -- Build Review Items --
  function renderReviewItems() {
    var container = $("#reviewContainer");
    container.innerHTML = "";

    CATEGORIES.forEach(function (cat) {
      // Category separator
      var sep = el("div", { className: "category-separator" }, [
        el("h2", { textContent: cat.name }),
      ]);
      container.appendChild(sep);

      cat.items.forEach(function (item) {
        var status = state.statuses[item.id] || { status: "", notes: "", recommendation: "" };
        var evidenceData = findItemEvidence(item.id);

        var reviewItem = el("div", { className: "review-item", id: "review-" + item.id });

        // Header
        var header = el("div", { className: "review-item-header" }, [
          el("span", { className: "review-item-num", textContent: pad(item.order) }),
          el("span", { className: "review-item-label", textContent: item.label }),
        ]);
        reviewItem.appendChild(header);

        // Provenance tag
        var provText = evidenceData ? (evidenceData.automated ? "Execution output" : "Submitted") : "No evidence loaded";
        var provTag = el("span", { className: "review-provenance", textContent: provText });
        reviewItem.appendChild(provTag);

        // Evidence block
        var evidenceText = formatEvidence(evidenceData);
        if (evidenceText) {
          var evidenceBlock = el("div", { className: "review-evidence", textContent: evidenceText });
          reviewItem.appendChild(evidenceBlock);
        }

        // Controls
        var controls = el("div", { className: "review-controls" });

        // Status selector
        var statusField = el("div", { className: "review-field" });
        var statusLabel = el("label", { textContent: "Human decision" });
        var statusSelect = el("select", {
          id: "status-" + item.id,
          "aria-label": "Status for " + item.label,
        });
        // Empty option
        var emptyOpt = el("option", { value: "", textContent: "-- Select status --" });
        statusSelect.appendChild(emptyOpt);
        VALID_STATUSES.forEach(function (vs) {
          var opt = el("option", { value: vs, textContent: vs });
          if (status.status === vs) opt.selected = true;
          statusSelect.appendChild(opt);
        });
        statusSelect.addEventListener("change", function () {
          state.statuses[item.id].status = this.value;
          updateReviewSummary();
        });
        statusField.appendChild(statusLabel);
        statusField.appendChild(statusSelect);
        controls.appendChild(statusField);

        // Notes
        var notesField = el("div", { className: "review-field" });
        var notesLabel = el("label", { textContent: "Evidence notes" });
        var notesArea = el("textarea", {
          id: "notes-" + item.id,
          placeholder: "Reviewer observations...",
          "aria-label": "Notes for " + item.label,
        });
        notesArea.value = status.notes || "";
        notesArea.addEventListener("input", function () {
          state.statuses[item.id].notes = this.value;
        });
        notesField.appendChild(notesLabel);
        notesField.appendChild(notesArea);
        controls.appendChild(notesField);

        // Recommendation
        var recField = el("div", { className: "review-field" });
        var recLabel = el("label", { textContent: "Recommendation" });
        var recArea = el("textarea", {
          id: "rec-" + item.id,
          placeholder: "Recommended action...",
          "aria-label": "Recommendation for " + item.label,
        });
        recArea.value = status.recommendation || "";
        recArea.addEventListener("input", function () {
          state.statuses[item.id].recommendation = this.value;
        });
        recField.appendChild(recLabel);
        recField.appendChild(recArea);
        controls.appendChild(recField);

        reviewItem.appendChild(controls);
        container.appendChild(reviewItem);
      });
    });
  }

  function findItemEvidence(itemId) {
    if (!state.evidence || !state.evidence.categories) return null;
    var cats = state.evidence.categories;
    for (var catName in cats) {
      if (cats[catName][itemId]) return cats[catName][itemId];
    }
    return null;
  }

  function formatEvidence(data) {
    if (!data) return "";
    if (data.automated) {
      var parts = [];
      if (data.command) parts.push("Command: " + data.command);
      if (data.exitCode !== undefined) parts.push("Exit code: " + data.exitCode);
      if (data.durationMs !== undefined) parts.push("Duration: " + data.durationMs + "ms");
      if (data.outputPreview) parts.push("Output: " + data.outputPreview.slice(0, 500));
      if (data.envVarNames) parts.push("Env var names: " + data.envVarNames.join(", "));
      if (data.notes) parts.push("Notes: " + data.notes);
      return parts.join("\n");
    }
    return data.evidence || "";
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function enableRailUpTo(viewName) {
    var idx = VIEWS.indexOf(viewName);
    $$(".rail-node").forEach(function (node) {
      var nv = node.getAttribute("data-view");
      var nIdx = VIEWS.indexOf(nv);
      if (nIdx <= idx + 1) node.disabled = false;
    });
  }

  // -- Report Preview --
  function generateReportHTML() {
    var counts = computeCounts();
    var evidence = state.evidence || {};
    var project = evidence.projectInfo || {};
    var meta = evidence.meta || {};
    var totalItems = ALL_ITEMS.length;

    var rows = "";
    var currentCat = "";
    ALL_ITEMS.forEach(function (item) {
      if (item.category !== currentCat) {
        currentCat = item.category;
        rows += '<tr class="cat-row"><td colspan="4">' + escapeHtml(currentCat) + "</td></tr>";
      }
      var s = state.statuses[item.id] || {};
      var status = s.status || "NOT ASSESSED";
      var notes = s.notes || "";
      var rec = s.recommendation || "";
      var sc = "status-" + status.toLowerCase().replace(/\s+/g, "-");
      rows += "<tr>" +
        '<td style="text-align:center;font-weight:600;width:36px;">' + pad(item.order) + "</td>" +
        "<td>" + escapeHtml(item.label) + "</td>" +
        '<td class="' + sc + '" style="font-weight:600;white-space:nowrap;">' + escapeHtml(status) + "</td>" +
        "<td>" + escapeHtml(notes) + (rec ? '<br><em style="color:var(--ink-faint);">Recommendation: ' + escapeHtml(rec) + "</em>" : "") + "</td>" +
        "</tr>";
    });

    // Dependencies
    var deps = [];
    ALL_ITEMS.forEach(function (item) {
      var s = state.statuses[item.id] || {};
      var status = s.status || "NOT ASSESSED";
      if (status === "NOT SUPPORTED" || status === "ATTESTED") {
        deps.push(escapeHtml(item.label) + ": " + escapeHtml(status));
      }
    });
    var depsHTML = deps.length > 0 ? "<ul>" + deps.map(function (d) { return "<li>" + d + "</li>"; }).join("") + "</ul>" : "<p>None identified.</p>";

    return '<h1>Handoff Evidence Report</h1>' +
      '<div class="report-subtitle">' +
      "<strong>Project:</strong> " + escapeHtml(project.name || "N/A") + "<br>" +
      "<strong>Prepared by:</strong> Martua -- human-reviewed submitted evidence<br>" +
      "<strong>Evidence collected:</strong> " + escapeHtml(meta.collectedAt || "Unknown") +
      "</div>" +
      '<div class="report-scope"><strong>Scope:</strong> This report reflects only the evidence supplied by the requester. It is not an independent security audit, code review, operational certification, or warranty of completeness. A SUPPORTED status means submitted evidence supports the stated condition -- it does not mean the underlying action was independently executed unless explicitly stated.</div>' +
      "<table><thead><tr><th>#</th><th>Item</th><th>Status</th><th>Evidence / Notes</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      '<div class="report-summary"><h3>Summary</h3>' +
      "<p><strong>" + totalItems + " items assessed</strong> -- " +
      "SUPPORTED: " + counts.SUPPORTED + " . ATTESTED: " + counts.ATTESTED +
      " . NOT SUPPORTED: " + counts["NOT SUPPORTED"] + " . NOT ASSESSED: " + counts["NOT ASSESSED"] + "</p></div>" +
      '<div class="report-limit"><h3>Important limitation</h3><p>This report documents and reviews submitted evidence. It does not independently execute deployments, rollbacks, restores, account transfers, production changes, or security testing.</p></div>' +
      '<div style="font-size:var(--text-11);color:var(--ink-faint);margin-top:var(--space-4);">Generated by Handoff Evidence Tool v1.0</div>';
  }

  function renderReportPreview() {
    var canvas = $("#reportCanvas");
    canvas.innerHTML = generateReportHTML();
  }

  // -- Export --
  function exportHTML() {
    var innerHTML = generateReportHTML();
    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Handoff Evidence Report</title><style>' +
      ":root{--supported:#158255;--attested:#9a6716;--not-supported:#c13f36;--not-assessed:#686b72;--ink:#2d2d31;--ink-strong:#17171a;--ink-muted:#706d68;--ink-faint:#96918a;--line:#d9d5ce;--line-strong:#bbb6ae;--line-soft:#ebe8e2;--surface:#ffffff;--surface-soft:#f0eee8;--attested-soft:#fff5db;}" +
      "body{font-family:'Manrope','Inter',ui-sans-serif,system-ui,sans-serif;max-width:960px;margin:0 auto;padding:2rem;color:var(--ink);line-height:1.55;}" +
      "h1{font-size:1.5rem;font-weight:700;color:var(--ink-strong);}" +
      ".report-subtitle{font-size:0.875rem;color:var(--ink-muted);margin-bottom:1.5rem;}" +
      ".report-scope{border:1px solid var(--line);border-radius:6px;padding:1rem;font-size:0.8125rem;color:var(--ink-muted);margin-bottom:1.5rem;background:var(--surface-soft);}" +
      "table{width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.8125rem;}" +
      "th{text-align:left;font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);padding:0.5rem;border-bottom:2px solid var(--line-strong);}" +
      "td{padding:0.625rem;border-bottom:1px solid var(--line-soft);vertical-align:top;}" +
      ".cat-row td{font-weight:700;background:var(--surface-soft);border-bottom:2px solid var(--line);padding-top:1rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-muted);}" +
      ".status-supported{color:var(--supported);font-weight:600;}.status-attested{color:var(--attested);font-weight:600;}.status-not-supported{color:var(--not-supported);font-weight:600;}.status-not-assessed{color:var(--not-assessed);font-weight:600;}" +
      ".report-summary{border:1px solid var(--line);border-radius:6px;padding:1rem;background:var(--surface-soft);margin-bottom:1.5rem;}" +
      ".report-summary h3{margin-bottom:0.5rem;font-size:0.875rem;}" +
      ".report-limit{border:1px solid #fde68a;background:var(--attested-soft);border-radius:6px;padding:1rem;margin-bottom:1rem;font-size:0.8125rem;}" +
      ".report-limit h3{margin-bottom:0.5rem;font-size:0.875rem;}" +
      "@media print{body{padding:0;}}" +
      "</style></head><body>" + innerHTML + "</body></html>";

    var blob = new Blob([html], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "handoff-evidence-report.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    // Open report in new window for browser print-to-PDF
    var innerHTML = generateReportHTML();
    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Handoff Evidence Report - PDF</title><style>' +
      ":root{--supported:#158255;--attested:#9a6716;--not-supported:#c13f36;--not-assessed:#686b72;--ink:#2d2d31;--ink-strong:#17171a;--ink-muted:#706d68;--ink-faint:#96918a;--line:#d9d5ce;--line-strong:#bbb6ae;--line-soft:#ebe8e2;--surface:#ffffff;--surface-soft:#f0eee8;--attested-soft:#fff5db;}" +
      "body{font-family:'Manrope','Inter',ui-sans-serif,system-ui,sans-serif;max-width:960px;margin:0 auto;padding:2rem;color:var(--ink);line-height:1.55;}" +
      "h1{font-size:1.5rem;font-weight:700;color:var(--ink-strong);}" +
      ".report-subtitle{font-size:0.875rem;color:var(--ink-muted);margin-bottom:1.5rem;}" +
      ".report-scope{border:1px solid var(--line);border-radius:6px;padding:1rem;font-size:0.8125rem;color:var(--ink-muted);margin-bottom:1.5rem;background:var(--surface-soft);}" +
      "table{width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.8125rem;}" +
      "th{text-align:left;font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);padding:0.5rem;border-bottom:2px solid var(--line-strong);}" +
      "td{padding:0.625rem;border-bottom:1px solid var(--line-soft);vertical-align:top;}" +
      ".cat-row td{font-weight:700;background:var(--surface-soft);border-bottom:2px solid var(--line);padding-top:1rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-muted);}" +
      ".status-supported{color:var(--supported);font-weight:600;}.status-attested{color:var(--attested);font-weight:600;}.status-not-supported{color:var(--not-supported);font-weight:600;}.status-not-assessed{color:var(--not-assessed);font-weight:600;}" +
      ".report-summary{border:1px solid var(--line);border-radius:6px;padding:1rem;background:var(--surface-soft);margin-bottom:1.5rem;}" +
      ".report-summary h3{margin-bottom:0.5rem;font-size:0.875rem;}" +
      ".report-limit{border:1px solid #fde68a;background:var(--attested-soft);border-radius:6px;padding:1rem;margin-bottom:1rem;font-size:0.8125rem;}" +
      ".report-limit h3{margin-bottom:0.5rem;font-size:0.875rem;}" +
      "@media print{body{padding:0;}}" +
      "</style></head><body>" + innerHTML +
      '<script>window.onload=function(){window.print();};<\/script></body></html>';

    var win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  // -- Canonical Sample Data --
  function getCanonicalSample() {
    return {
      meta: {
        toolVersion: "1.0.0",
        collectedAt: "2026-09-13T22:00:00.000Z",
        platform: "win32",
        nodeVersion: "v24.19.0",
      },
      projectInfo: {
        name: "Acme Bookings (test)",
        repoUrl: "https://github.com/acme-inc/acme-bookings",
        projectDir: ".",
        ownershipMatrix: {
          repo: "acme-inc",
          domain: "acme-bookings.com",
          dns: "Cloudflare",
          hosting: "Vercel",
          database: "Supabase",
          other: "Resend (email)",
        },
      },
      categories: {
        "A. Ownership and Control": {
          "repo-control": {
            label: "Repository control",
            automated: false,
            evidence: "Repository is under acme-inc GitHub org. Client owns the org.",
          },
          "domain-dns-control": {
            label: "Domain / DNS control",
            automated: false,
            evidence: "Domain registered under outgoing contractor's personal Namecheap account. Needs transfer.",
          },
          "hosting-control": {
            label: "Hosting / deployment platform control",
            automated: false,
            evidence: "Vercel project under outgoing contractor's personal team.",
          },
          "database-control": {
            label: "Database control",
            automated: false,
            evidence: "Supabase project under client-controlled org.",
          },
          "other-services": {
            label: "Other operational services",
            automated: false,
            evidence: "Resend for transactional email. Client states it is under client-owned account.",
          },
        },
        "B. Reproducibility": {
          "clean-install": {
            label: "Clean install",
            automated: true,
            exitCode: 0,
            command: "pnpm install",
            durationMs: 12400,
            outputPreview: "Lockfile is up to date, resolution step is skipped\nPackages: +689\nProgress: resolved 689, reused 670, downloaded 19, done",
            notes: "",
          },
          "production-build": {
            label: "Production build",
            automated: true,
            exitCode: 0,
            command: "pnpm build",
            durationMs: 8200,
            outputPreview: "Cloning 2 links [cached]\n - @acme/core: integrity verified\nRoute (app)                  Size     First Load JS\n+ First Load JS shared by all 84.0 kB\nBuild completed in 7.8s",
            notes: "",
          },
          "env-var-docs": {
            label: "Environment-variable documentation",
            automated: true,
            envVarNames: [
              "DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "RESEND_API_KEY",
              "NODE_ENV", "VERCEL_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
              "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
              "SMTP_HOST", "SMTP_PORT", "SMTP_USER",
            ],
            notes: "",
          },
        },
        "C. Operations": {
          deployment: {
            label: "Deployment procedure",
            automated: false,
            evidence: "Vercel auto-deploys from main branch. Manual deploy via Vercel dashboard or CLI: vercel --prod.",
          },
          rollback: {
            label: "Rollback procedure",
            automated: false,
            evidence: "No documented rollback procedure.",
          },
          "data-recovery": {
            label: "Data-recovery procedure",
            automated: false,
            evidence: "No documented data recovery procedure exists.",
          },
        },
        "D. Known Manual Dependencies": {
          "known-issues": {
            label: "Known issues / manual processes",
            automated: false,
            evidence: "Only the outgoing contractor knows the command to restart the background cron job. Domain renewal is controlled by the contractor personally.",
          },
        },
      },
    };
  }

  function getCanonicalStatuses() {
    return {
      "repo-control": { status: "SUPPORTED", notes: "Submitted screenshot shows the repository under the client-owned GitHub org acme-inc.", recommendation: "No action needed." },
      "domain-dns-control": { status: "NOT SUPPORTED", notes: "Domain remains under outgoing contractor's personal registrar account.", recommendation: "Transfer registration to client-owned account." },
      "hosting-control": { status: "NOT SUPPORTED", notes: "Production project remains under outgoing contractor's personal Vercel team.", recommendation: "Transfer to client-controlled team/org." },
      "database-control": { status: "SUPPORTED", notes: "Supabase project under client-controlled org.", recommendation: "No action needed." },
      "other-services": { status: "ATTESTED", notes: "Requester states Resend is under client-owned account; no screenshot submitted.", recommendation: "Request ownership screenshot." },
      "clean-install": { status: "SUPPORTED", notes: "Fresh checkout + pnpm install, exit status 0.", recommendation: "No action needed." },
      "production-build": { status: "SUPPORTED", notes: "pnpm build, exit status 0.", recommendation: "No action needed." },
      "env-var-docs": { status: "SUPPORTED", notes: "14 required variable names supplied. No values submitted.", recommendation: "No action needed." },
      "deployment": { status: "SUPPORTED", notes: "Written deployment steps supplied with evidence of client-controlled Vercel org.", recommendation: "No action needed." },
      "rollback": { status: "NOT ASSESSED", notes: "No rollback procedure or artefact submitted.", recommendation: "Request rollback procedure documentation." },
      "data-recovery": { status: "NOT SUPPORTED", notes: "No documented application-data recovery procedure exists.", recommendation: "Create and document data recovery procedure." },
      "known-issues": { status: "ATTESTED", notes: "Only outgoing contractor knows cron restart command; no documentation submitted.", recommendation: "Document cron job restart procedure independently." },
    };
  }

  // -- Domain/DNS Check --
  async function checkDomain(domain) {
    var resultsDiv = $("#domainResults");
    var historyDiv = $("#domainHistory");
    resultsDiv.hidden = false;

    // Set loading state
    $("#rdapRegistrar").textContent = "Loading...";
    $("#rdapPrivacy").textContent = "";
    $("#rdapCreated").textContent = "";
    $("#rdapExpires").textContent = "";
    $("#dnsNameservers").textContent = "Loading...";
    $("#dnsARecords").textContent = "";
    $("#dnsCNAMERecords").textContent = "";
    $("#domainSignals").innerHTML = "";

    try {
      var res = await fetch("/api/dns-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain }),
      });
      var data = await res.json();

      if (data.error) {
        $("#rdapRegistrar").textContent = "Error: " + data.error;
        return;
      }

      var rdap = data.rdap || {};
      var dns = data.dns || {};
      var signals = data.signals || [];

      $("#rdapRegistrar").textContent = rdap.registrarName || "(not available)";
      $("#rdapPrivacy").textContent = rdap.privacyProtected ? "YES -- privacy-protected" : "NO -- publicly visible";
      $("#rdapCreated").textContent = rdap.created || "(not available)";
      $("#rdapExpires").textContent = rdap.expires || "(not available)";

      $("#dnsNameservers").textContent = (dns.nameservers || []).join(", ") || "(none found)";
      $("#dnsARecords").textContent = (dns.aRecords || []).join(", ") || "(none found)";
      $("#dnsCNAMERecords").textContent = (dns.cnameRecords || []).join(", ") || "(none found)";

      var signalsEl = $("#domainSignals");
      signalsEl.innerHTML = "";
      if (signals.length > 0) {
        signals.forEach(function (s) {
          var div = el("div", { className: "domain-signal", textContent: s });
          signalsEl.appendChild(div);
        });
      } else {
        signalsEl.innerHTML = '<div class="domain-signal">No notable signals from public DNS data.</div>';
      }

      // Add to history
      state.domainHistory.push({ domain: domain, time: new Date().toISOString(), signals: signals });
      renderDomainHistory(historyDiv);

    } catch (err) {
      $("#rdapRegistrar").textContent = "Error: " + err.message;
      $("#dnsNameservers").textContent = "Error: " + err.message;
    }
  }

  function renderDomainHistory(container) {
    if (state.domainHistory.length === 0) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    var list = $("#domainHistoryList");
    list.innerHTML = "";
    state.domainHistory.forEach(function (entry) {
      var div = el("div", { className: "domain-history-entry" });
      div.textContent = entry.domain + " -- " + new Date(entry.time).toLocaleTimeString() + " -- " + entry.signals.length + " signal(s)";
      list.appendChild(div);
    });
  }

  // -- Load sample evidence with canonical statuses --
  function loadSample() {
    var sampleEvidence = getCanonicalSample();
    var sampleStatuses = getCanonicalStatuses();

    state.statuses = {};
    Object.keys(sampleStatuses).forEach(function (id) {
      state.statuses[id] = {
        status: sampleStatuses[id].status,
        notes: sampleStatuses[id].notes,
        recommendation: sampleStatuses[id].recommendation || "",
      };
    });

    loadEvidence(sampleEvidence);
  }

  // -- File Input --
  function handleFileSelect(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        // Validate basic structure
        if (!data.categories) throw new Error("Missing 'categories' in evidence.json");
        state.statuses = {}; // Reset statuses for fresh load
        loadEvidence(data);
      } catch (err) {
        alert("Invalid evidence.json: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  // -- Save review state --
  async function saveReviewState() {
    try {
      await fetch("/api/save-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statuses: state.statuses,
          evidence: state.evidence ? state.evidence.projectInfo : null,
          savedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      // Silently fail -- local-only tool
    }
  }

  // -- Init --
  function init() {
    // Workflow rail navigation
    $$(".rail-node").forEach(function (node) {
      node.addEventListener("click", function () {
        if (!this.disabled) switchView(this.getAttribute("data-view"));
      });
    });

    // Load evidence button
    $("#btnLoadEvidence").addEventListener("click", function () {
      $("#fileInput").click();
    });
    $("#fileInput").addEventListener("change", function () {
      if (this.files.length > 0) handleFileSelect(this.files[0]);
    });

    // Load sample button(s)
    $("#btnLoadSample").addEventListener("click", loadSample);
    $("#btnLoadSample2").addEventListener("click", loadSample);

    // Navigation buttons
    $("#btnToIntakeNext").addEventListener("click", function () {
      switchView("review");
      renderReportPreview(); // Pre-render for preview step
    });
    $("#btnToReviewPrev").addEventListener("click", function () { switchView("intake"); });
    $("#btnToReviewNext").addEventListener("click", function () {
      saveReviewState();
      switchView("domain");
    });
    $("#btnToDomainPrev").addEventListener("click", function () { switchView("review"); });
    $("#btnToDomainNext").addEventListener("click", function () {
      renderReportPreview();
      switchView("preview");
    });
    $("#btnToPreviewPrev").addEventListener("click", function () { switchView("domain"); });
    $("#btnToPreviewNext").addEventListener("click", function () { switchView("export"); });
    $("#btnToExportPrev").addEventListener("click", function () { switchView("preview"); });

    // Domain check
    $("#btnCheckDomain").addEventListener("click", function () {
      var domain = $("#domainInput").value.trim();
      if (domain && /^[a-zA-Z0-9][a-zA-Z0-9.-]+$/.test(domain)) {
        checkDomain(domain);
      }
    });
    $("#domainInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var domain = this.value.trim();
        if (domain && /^[a-zA-Z0-9][a-zA-Z0-9.-]+$/.test(domain)) {
          checkDomain(domain);
        }
      }
    });

    // Export
    $("#btnExportHTML").addEventListener("click", exportHTML);
    $("#btnExportPDF").addEventListener("click", exportPDF);

    // Drag and drop
    document.addEventListener("dragover", function (e) {
      e.preventDefault();
      $("#dropOverlay").classList.remove("hidden");
    });
    document.addEventListener("dragleave", function (e) {
      if (e.relatedTarget === null || !document.contains(e.relatedTarget)) {
        $("#dropOverlay").classList.add("hidden");
      }
    });
    document.addEventListener("drop", function (e) {
      e.preventDefault();
      $("#dropOverlay").classList.add("hidden");
      if (e.dataTransfer.files.length > 0) {
        var file = e.dataTransfer.files[0];
        if (file.name.endsWith(".json")) handleFileSelect(file);
      }
    });

    // Start at intake
    switchView("intake");
    updateSummaryStrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
