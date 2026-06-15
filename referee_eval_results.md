# Referee Evaluation: Terraform Skill A/B Result

**Subject:** `payment-app-java17/infra/terraform-baseline/` (no skill) vs `payment-app-java17/infra/terraform/` (HashiCorp `terraform-style-guide` skill loaded)
**Method:** Both directories generated from an identical prompt; the loaded skill is the only intended variable. This evaluation was produced by an independent frontier model acting as referee, with every claim checked against the files and all CLI results reproduced (Terraform v1.14.5).

---

## 1. Reproduced CLI results

| Check | Baseline | Skilled |
|---|---|---|
| `terraform init -backend=false` | passes | passes |
| `terraform validate` | **valid** | **valid** |
| `terraform fmt -check -recursive` | **fails (exit 3)** | **clean (exit 0)** |
| `validation {}` blocks present | 0 | 0 |
| liveness + readiness probes | present | present |

**Reading:** Both configurations are valid HCL, so `validate` is not a differentiator. The only CLI check that separates the two is `fmt -check`.

---

## 2. Style-guide dimensions (the skill's responsibility)

| Dimension | Baseline | Skilled | Winner |
|---|---|---|---|
| Formatting (`fmt`) | trailing whitespace in nested blocks | canonical | **Skilled** |
| Provider / version file layout | `terraform` + `provider` blocks inside `main.tf` | dedicated `terraform.tf` + `providers.tf` | **Skilled** |
| Provider pinning | `kubernetes ~> 2.23`, TF `>= 1.0` | `kubernetes ~> 2.35`, TF `>= 1.14` | **Skilled** |
| Resource naming | mixed (`payment_app`, `postgres`, `postgres_pvc`) | consistent (`bob_demo`, `postgresql`) | **Skilled** |
| Quota parameterization | values hardcoded in the resource | exposed as `resource_quota_*` variables | **Skilled** |
| Variable typing + descriptions | present | present | Tie |
| Variable validation | none | none | Neither |

On every dimension the HashiCorp Terraform Style Guide actually governs, the skilled output is equal or better, and it is the only one that passes `fmt -check`.

---

## 3. Operational dimensions (NOT governed by a style guide)

| Dimension | Baseline | Skilled | Winner |
|---|---|---|---|
| `PGDATA` subpath (initdb safety) | sets `PGDATA=/var/lib/postgresql/data/pgdata` | not set | **Baseline** |
| Connection-string output | present, `sensitive = true` | absent | **Baseline** |
| PVC bind behavior | `wait_until_bound = false` | default | **Baseline** |
| `.gitignore` lock file | ignores `.terraform.lock.hcl` (not recommended) | commits it (recommended) | **Skilled** |
| Sensitivity breadth | marks user + connection string sensitive | marks only password | Mixed |

The skilled version is **not a strict superset**: it dropped the `PGDATA` subpath and the sensitive connection-string output. These are Kubernetes/Postgres operational concerns, orthogonal to a Terraform *style* guide, so the omissions are expected rather than a skill defect.

---

## 4. Verdict

For the question under test, *"does the style-guide skill make the agent write more style-guide-compliant Terraform?"*, the answer is **yes, clearly and verifiably**. The skilled run wins on formatting, file organization, provider pinning, naming, and parameterization, and is the only one that passes `fmt -check`.

Two honest qualifiers belong in any readout:

1. The skill improves **style and structure, not operational completeness**. A reviewer would still flag the dropped `PGDATA` handling and connection-string output in the skilled version.
2. `terraform validate` passes for **both**, and **neither** adds `validation {}` blocks. Treat `validate` as proof of deploy-readiness, and treat `fmt -check` plus the side-by-side read as the real evidence of the skill's effect.

**Net:** a fair, attributable win for the skill on style, with the standard reminder that AI-generated infrastructure code still warrants an operational review before it ships.
