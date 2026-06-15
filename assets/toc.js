/*
 * Shared Table of Contents for the Bob SDLC Workshop.
 *
 * Single source of truth: edit the TOC array below and every page updates.
 * Each page that wants the sidebar just needs:
 *   <aside class="sidebar" data-toc></aside>
 *   <script src="assets/toc.js"></script>      (use ../assets/toc.js from stages/)
 *
 * Paths are written relative to the repo root; this script rewrites them for
 * pages served from /stages/ automatically.
 */
(function () {
  "use strict";

  var TOC = [
    { num: "0", label: "Workshop Intro",           path: "index.html" },
    { num: "1", label: "Bob Builds the App",       path: "stages/lab-1-build-app.html",            badge: "try" },
    { num: "2", label: "Java Modernization",       path: "stages/lab-2-java-modernization.html",   badge: "try" },
    { num: "3", label: "Generate Tests",           path: "stages/lab-3-generate-tests.html",       badge: "try" },
    { num: "4", label: "Security Scanning",        path: "stages/lab-4-security-scanning.html",     badge: "try" },
    { num: "5", label: "Infra as Code",            path: "stages/lab-5-infra-as-code.html",         badge: "try" },
    { num: "6", label: "Deploy to OpenShift",      path: "stages/lab-6-deploy-openshift.html",      badge: "try" },
    { num: "7", label: "CI/CD Pipeline",           path: "stages/lab-7-cicd-pipeline.html",         badge: "try" },
    { num: "8", label: "Day-2 SRE Ops",            path: "stages/lab-8-day2-sre-ops.html",          badge: "try" },
    { num: "✓", label: "Workshop Complete",   path: "outro.html" },
    { divider: "How-Tos & Setup" },
    { num: "★", label: "Install the oc CLI",        path: "stages/install-oc-cli.html",              optional: true },
    { num: "★", label: "Install the GitHub CLI",    path: "stages/install-gh-cli.html",              optional: true },
    { num: "★", label: "Install the Terraform CLI", path: "stages/install-terraform-cli.html",       optional: true }
  ];

  var BADGE_TEXT = { try: "Try", soon: "Soon" };

  var DIVIDER_STYLE =
    "margin-top:14px;padding:14px 20px 8px;border-top:1px solid var(--border);" +
    "font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.15em;" +
    "text-transform:uppercase;color:var(--muted);list-style:none;";

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render(mount) {
    var inStages = /\/stages\//.test(location.pathname);
    var prefix = inStages ? "../" : "";
    var current = location.pathname.split("/").pop() || "index.html";

    var items = TOC.map(function (item) {
      if (item.divider) {
        return '<li class="toc-divider" style="' + DIVIDER_STYLE + '">' +
          escapeHtml(item.divider) + "</li>";
      }
      var base = item.path.split("/").pop();
      var isActive = base === current;
      var linkClass = "toc-link" +
        (isActive ? " active" : "") +
        (item.badge ? " " + item.badge : "");
      var labelClass = "toc-label" + (item.optional ? " toc-optional" : "");
      var badge = item.badge
        ? '<span class="toc-badge ' + item.badge + '">' + BADGE_TEXT[item.badge] + "</span>"
        : "";
      return '' +
        '<li class="toc-item">' +
          '<a href="' + prefix + item.path + '" class="' + linkClass + '">' +
            '<span class="toc-num">' + item.num + "</span>" +
            '<span class="' + labelClass + '">' + escapeHtml(item.label) + "</span>" +
            badge +
          "</a>" +
        "</li>";
    }).join("");

    mount.innerHTML =
      '<div class="sidebar-title">Table of Contents</div>' +
      '<ul class="toc-list">' + items + "</ul>";
  }

  function init() {
    var mounts = document.querySelectorAll("[data-toc]");
    for (var i = 0; i < mounts.length; i++) render(mounts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
