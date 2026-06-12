Before giving me any commands, ask me for my unique namespace suffix and wait for my answer. Then substitute it into deploy-test-<suffix> in every command below.

Give me the oc commands to deploy the app in payment-app-java17 to OpenShift in namespace deploy-test-<suffix>.

Build the image on the cluster (server-side) from the existing multi-stage Dockerfile in payment-app-java17. Do not build the image locally with Docker or Podman, so the steps work on any OS. Use a binary Docker-strategy build:
- oc new-build --name=payment-app --strategy=docker --binary -n deploy-test-<suffix>
- oc start-build payment-app --from-dir=payment-app-java17 --follow -n deploy-test-<suffix>

Then deploy the built image and expose a route:
- oc new-app payment-app -n deploy-test-<suffix>
- oc expose svc/payment-app -n deploy-test-<suffix>

Explain each command briefly as a comment, and tell me how to get the final app URL.