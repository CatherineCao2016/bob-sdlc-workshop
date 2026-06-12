Build a mock credit card payment processing application with:

Backend (Java 11, Spring Boot):
- REST API endpoints:
  - POST /api/payments/authorize (authorize a card transaction)
  - POST /api/payments/capture (capture an authorized transaction)
  - POST /api/payments/refund (refund a captured transaction)
  - GET /api/payments/{id} (get transaction status)
  - GET /api/payments/history (list recent transactions)
  - POST /admin/cache/clear (clear local cache)
  - GET /actuator/health (readiness probe)
  - GET /actuator/prometheus (metrics endpoint)

- Use in-memory H2 database (no external DB needed)
- Local Caffeine cache for transaction lookups
- Simulate realistic processing delays (200-500ms)
- Simulate random declines (10% of transactions)
- Return realistic response codes (approved, declined, insufficient funds, expired card)
- Use the test card numbers:
  - Visa: 4263970000005262
  - MasterCard: 5425230000004415
  - Amex: 374101000000608

Frontend (React):
- Payment form: card number, expiry, CVV, amount
- Transaction history dashboard showing recent payments
- Status badges: Authorized (yellow), Captured (green), Declined (red), Refunded (gray)
- Simple and clean — this is for a demo, not production

Make it run with a single command: mvn spring-boot:run

Do not run the application. I will run it myself.

Also generate:
- Dockerfile — multi-stage build, distroless base, non-root user
  - Build stage: docker.io/library/maven:3.9-eclipse-temurin-11 (fully-qualified, existing tag — avoid the deprecated maven:*-openjdk-* tags, which no longer exist on Docker Hub)
  - Runtime stage: gcr.io/distroless/java11-debian11:nonroot
- k8s/deployment.yaml — OpenShift deployment manifest with placeholder values:
  - Image: image-registry.openshift-image-registry.svc:5000/${NAMESPACE}/payment-app:${IMAGE_TAG}
    # in-cluster pull path. At deploy time: ${NAMESPACE} → bob-demo-staging (or bob-demo-prod),
    # ${IMAGE_TAG} → git SHA. The CI job pushes the same image via the external route ($OPENSHIFT_REGISTRY).
  - Namespace: ${NAMESPACE}   # bob-demo-staging | bob-demo-prod
  - 3 replicas, resource limits, readiness/liveness probes
  - PodDisruptionBudget (max 1 unavailable)
  - Service and Route
  Use placeholder values only — real cluster values will be injected at deploy time.

Use the following folder structure:
```
payment-app-java11/
├── src/
│   └── main/
│       ├── java/com/demo/payment/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── model/
│       │   └── config/
│       └── resources/
│           ├── static/          ← React frontend
│           └── application.properties
├── pom.xml
├── Dockerfile
├── k8s/
│   └── deployment.yaml   ← OpenShift manifest with placeholder values
└── README.md
```
