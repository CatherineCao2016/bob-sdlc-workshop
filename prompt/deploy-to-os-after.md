Before giving me any commands, ask me for my unique namespace suffix and wait for my answer. Then substitute it into deploy-test-<suffix> in every command below.

Give me the oc commands to deploy the app in payment-app-java17 to OpenShift in namespace deploy-test-<suffix>.

Check if the namespace deploy-test-<suffix> exists, if not create the namespace first.

Build the image on the cluster (server-side) from the existing multi-stage Dockerfile in payment-app-java17. Do not build the image locally with Docker or Podman, so the steps work on any OS. Use a binary Docker-strategy build:
- oc new-build --name=payment-app --strategy=docker --binary --to=payment-app:latest -n deploy-test-<suffix>
- oc start-build payment-app --from-dir=payment-app-java17 --follow -n deploy-test-<suffix>

Then deploy the built image and expose a route:
- oc new-app payment-app -n deploy-test-<suffix>
- oc create route edge payment-app --service=payment-app --port=8081 --insecure-policy=Redirect -n deploy-test-<suffix>

Use an **edge (HTTPS) route**, not `oc expose svc` (which creates an HTTP-only route). Browsers silently upgrade `http://` to `https://`, and the router returns a 503 "Application is not available" for an HTTPS request to an HTTP-only host. The app listens on port **8081** (per the Dockerfile's `EXPOSE`), so the route must point at 8081.

Explain each command briefly as a comment, and tell me how to get the final app URL (it will be `https://`).

Create a deployment script named "deploy-to-openshift.sh" that runs all the commands in sequence.

The script MUST include a preflight check, before any build steps, that verifies the cluster's internal image registry is Ready. The build pushes its output image to the internal registry, so if the registry is not up, the build fails with a misleading `InvalidOutputReference` error. The preflight check must:
- Confirm at least one image registry pod in the `openshift-image-registry` namespace is `Running` and Ready (not just the `cluster-image-registry-operator` pod). Use the label selector `-l docker-registry=default` to find the registry pods — do not grep by pod name, which is brittle.
- Fail fast with a clear, actionable message if the registry is not Ready, pointing the user at the storage/registry fix below — instead of letting the build fail cryptically later.
- Detection only: the preflight reports the problem and the `emptyDir`/PVC fix; it MUST NOT auto-patch the cluster registry config (that is a cluster-admin action, not the script's job).

The script MUST ALSO include the following (each corresponds to a gotcha documented below — implement them when generating the script, do not assume a prior script already does):
- **Idempotent re-run:** before `oc new-build`, delete any existing BuildConfig AND ImageStream for the app (suppress "not found" errors), so re-running the script doesn't fail with "already exists". See *BuildConfig Already Exists* and *ImageStreamTag Already Exists*.
- **Post-build tag verification:** immediately after `oc start-build`, confirm the ImageStream actually received a tag (`oc get is <app> -o jsonpath='{.status.tags[*].tag}'`). If empty, the build failed before pushing — fail fast with the build-log commands instead of letting `oc new-app` fail later with "image stream has no tags". See *PullBuilderImageFailed*.
- **Service port correctness:** after `oc new-app`, ensure the Service targets the container's actual port (the Dockerfile's `EXPOSE` value, `8081` here) rather than the `oc new-app` default of `8080`; patch it if needed. See *Route returns 503 … EMPTY endpoints*.
- **Edge (HTTPS) route:** create the route with `oc create route edge … --insecure-policy=Redirect`, not `oc expose svc`. See *Route returns 503 … HTTP-only route*.
- **Final URL:** print the application URL as `https://` (the edge route redirects http→https).

Assumptions the script may rely on (state them in a header comment): the user is already logged in to the target cluster (`oc login` done) and `oc` is on PATH.

## Common Gotchas

### InvalidOutputReference Error
**Error:** `Error from server (BadRequest): build payment-app-1 failed: InvalidOutputReference: Output image could not be resolved.`

This error is misleading — it points at the *output image*, but there are two distinct causes. Check them in this order.

**Cause 1 (most common): the cluster's internal image registry is not Ready.**
The build needs somewhere to push its output image — the internal registry in the `openshift-image-registry` namespace. If that registry isn't up, the ImageStream never gets a `status.dockerImageRepository`, so the build's output target can't be resolved.

**One-glance diagnostic:** run `oc get is payment-app -n deploy-test-<suffix>` and look at the **IMAGE REPOSITORY** column.
- **Empty** → the registry is the problem (this cause). Do NOT debug your BuildConfig.
- **Populated** (e.g. `image-registry.openshift-image-registry.svc:5000/...`) → registry is fine; see Cause 2.

**Confirm the registry state:**
```bash
oc get pods -n openshift-image-registry
```
You need at least one `image-registry-*` pod at `1/1 Running` — not just `cluster-image-registry-operator`. If the `image-registry-*` pods are `0/1`, they are not Ready.

**Most common root cause:** the registry has no storage backend configured, so its pod never becomes Ready. Fix for a test/workshop cluster:
```bash
oc patch configs.imageregistry.operator.openshift.io/cluster --type merge \
  -p '{"spec":{"managementState":"Managed","storage":{"emptyDir":{}}}}'
```
Then wait until an `image-registry-*` pod reports `1/1 Running`:
```bash
oc get pods -n openshift-image-registry -w
```
⚠️ `emptyDir` is **ephemeral** — images are lost if the registry pod restarts or reschedules. Fine for `deploy-test-*` namespaces, not for production. For persistence use a PVC instead:
```bash
oc patch configs.imageregistry.operator.openshift.io/cluster --type merge \
  -p '{"spec":{"managementState":"Managed","storage":{"pvc":{"claim":""}}}}'
```
(Empty `claim` auto-creates a PVC, assuming a default StorageClass exists.)

The deployment script's preflight check catches this case before the build runs.

**Cause 2: the `oc new-build` command was missing the `--to` flag.**
If the IMAGE REPOSITORY column is populated but the build still fails, the BuildConfig may have no output target. Always include `--to=<image-name>:latest` on a binary build:
```bash
oc new-build --name=payment-app --strategy=docker --binary --to=payment-app:latest -n deploy-test-<suffix>
```
The `--to` flag tells OpenShift to push the built image to an ImageStream. Without it, OpenShift doesn't know where to store the resulting container image.

### BuildConfig Already Exists Error
**Error:** `error: buildconfigs.build.openshift.io "payment-app" already exists`

**Cause:** A BuildConfig with the same name already exists from a previous deployment attempt. The `oc new-build` command cannot create a resource that already exists.

**Solution:** Delete the existing BuildConfig before creating a new one:
```bash
# Check if BuildConfig exists
oc get bc payment-app -n deploy-test-<suffix>

# Delete existing BuildConfig
oc delete bc payment-app -n deploy-test-<suffix>

# Wait a moment for deletion to complete
sleep 2

# Then create the new BuildConfig
oc new-build --name=payment-app --strategy=docker --binary --to=payment-app:latest -n deploy-test-<suffix>
```

**Note:** The deployment script (`deploy-to-openshift.sh`) automatically handles this by checking for existing BuildConfigs and deleting them before creating new ones.

### ImageStreamTag Already Exists Error
**Error:** `error: imagestreamtag.image.openshift.io "payment-app:latest" already exists`

**Cause:** When deleting a BuildConfig, the associated ImageStream is NOT automatically deleted. When `oc new-build` runs again, it tries to create a new ImageStreamTag but fails because it already exists from the previous build.

**Root Cause:** The `oc delete bc` command only deletes the BuildConfig, not the ImageStream that was created alongside it.

**Solution:** Delete both the BuildConfig AND the ImageStream before recreating:
```bash
# Delete both BuildConfig and ImageStream
oc delete bc payment-app -n deploy-test-<suffix>
oc delete is payment-app -n deploy-test-<suffix>

# Wait for deletion to complete
sleep 2

# Then create the new BuildConfig (which will create a new ImageStream)
oc new-build --name=payment-app --strategy=docker --binary --to=payment-app:latest -n deploy-test-<suffix>
```

**Alternative (safer for scripts):** Use error suppression to handle cases where ImageStream might not exist:
```bash
# Delete BuildConfig
oc delete bc payment-app -n deploy-test-<suffix>

# Delete ImageStream (suppress error if it doesn't exist)
oc delete is payment-app -n deploy-test-<suffix> 2>/dev/null || true

# Wait for deletion to complete
sleep 2

# Create new BuildConfig
oc new-build --name=payment-app --strategy=docker --binary --to=payment-app:latest -n deploy-test-<suffix>
```

**Why This Happens:** `oc new-build` creates two resources:
1. **BuildConfig** - Defines how to build the image
2. **ImageStream** - Stores the built container images

Both must be deleted when recreating the build configuration to avoid conflicts.

### PullBuilderImageFailed / "image stream has no tags"
**Errors (two faces of the same problem):**
- Build: `Failed (PullBuilderImageFailed)` ... `reading manifest ... manifest unknown`
- Deploy: `oc new-app` → `error: no tags found on matching image stream: "deploy-test-<suffix>/payment-app"` / `The image stream "..." exists, but it has no tags.` (and a fallback lookup of `docker.io/library/payment-app:latest`)

**Cause:** The build **failed before pushing an image**, so the ImageStream stayed empty. When `oc new-app` can't find the `payment-app:latest` tag, it falls back to treating `payment-app` as a remote Docker Hub image — which also doesn't exist.

The most common reason the build fails is a **base image tag in the Dockerfile that doesn't exist**. For example, Docker Hub **removed all the `openjdk`-based Maven tags**, so `maven:3.9-openjdk-17-slim` returns `manifest unknown`.

**Diagnose:**
```bash
oc get builds -n deploy-test-<suffix>                       # STATUS = Failed?
oc logs build/payment-app-1 -n deploy-test-<suffix> --tail=40   # look for "Pull failed" / "manifest unknown"
oc get is payment-app -n deploy-test-<suffix> -o jsonpath='{.status.tags[*].tag}{"\n"}'  # empty = nothing pushed
```

**Solution:** Use a base image tag that actually exists, and **fully-qualify** it with `docker.io/library/` so the build doesn't waste time failing against `registry.redhat.io` / `quay.io` first:
```dockerfile
# Bad  (deprecated, removed from Docker Hub):
# FROM maven:3.9-openjdk-17-slim AS build
# Good (Eclipse Temurin replaced the OpenJDK builds):
FROM docker.io/library/maven:3.9-eclipse-temurin-17 AS build
```
Then rebuild and confirm a tag landed before deploying:
```bash
oc start-build payment-app --from-dir=payment-app-java17 --follow -n deploy-test-<suffix>
oc get is payment-app -n deploy-test-<suffix> -o jsonpath='{.status.tags[*].tag}{"\n"}'  # should print: latest
```
The deployment script verifies the ImageStream has a tag immediately after the build and fails fast if it doesn't.

### Route returns 503 "Application is not available" (HTTP-only route)
**Symptom:** The pod is `1/1 Running` and `Ready`, the Service has endpoints, the ports all line up — yet the route URL shows the OpenShift router's **"Application is not available"** page (HTTP 503). `curl -i http://<host>/` returns **200 + HTML**, but the browser fails.

**Cause:** `oc expose svc/payment-app` creates an **HTTP-only (insecure) route** with no TLS. Browsers (and many HTTP clients/tools) silently upgrade `http://` to `https://`. When an HTTPS request hits a host that only has an HTTP route, the router has no matching TLS route and returns 503. The app is fine; the route just doesn't serve HTTPS.

**This is NOT the same as the "no endpoints" 503.** Always check the actual backend first:
```bash
oc get pods -n deploy-test-<suffix> -l deployment=payment-app   # 1/1 Running, 0 restarts?
oc get endpoints payment-app -n deploy-test-<suffix>            # populated = backend is healthy
curl -i http://<route-host>/                                   # 200 + HTML over plain HTTP = it's the HTTPS issue
```
If plain-HTTP curl returns 200 but the browser/HTTPS 503s, it's this gotcha.

**Solution:** Replace the insecure route with an **edge-terminated (HTTPS) route** that also redirects HTTP→HTTPS. The router terminates TLS and forwards plain HTTP to the pod on the app's port — no app changes needed. Substitute `<app-port>` with the port your container listens on (the Dockerfile's `EXPOSE` value):
```bash
oc delete route <app> -n deploy-test-<suffix>
oc create route edge <app> \
  --service=<app> --port=<app-port> \
  --insecure-policy=Redirect -n deploy-test-<suffix>
```
Then use the `https://` URL:
```bash
oc get route <app> -n deploy-test-<suffix> -o jsonpath='https://{.spec.host}/{"\n"}'
```

**Related — "Application is not available" with EMPTY endpoints (port mismatch):** If `oc get endpoints` is *empty*, the cause is different: `oc new-app` defaulted the Service to a port the app isn't listening on (commonly 8080, while the app may listen on something else). Set the Service to the container's actual port (`<app-port>`):
```bash
oc patch svc <app> -n deploy-test-<suffix> --type merge \
  -p '{"spec":{"ports":[{"name":"<app-port>-tcp","port":<app-port>,"targetPort":<app-port>,"protocol":"TCP"}]}}'
```

> In this repo's deployment, `<app>` is `payment-app` and `<app-port>` is `8081` (from `EXPOSE 8081` in `payment-app-java17/Dockerfile`). Always confirm the port from the Dockerfile / app config rather than assuming a default.