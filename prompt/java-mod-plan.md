Analyze the payment application and create a detailed action plan to modernize it from Java 11 to Java 17.

The plan should include:
1. Summary of changes required (dependencies, APIs, syntax, config)
2. List of deprecated or removed APIs that need replacing
3. New Java 17 features that can improve the codebase (records, sealed classes, text blocks, pattern matching)
4. Updated pom.xml changes required (Java version, Spring Boot compatibility)
4a. Container/Dockerfile base image updates for the new Java version — bump the build image to docker.io/library/maven:3.9-eclipse-temurin-17 and the distroless runtime to gcr.io/distroless/java17-debian11 (use existing, fully-qualified tags; the deprecated maven:*-openjdk-* tags no longer exist on Docker Hub)
5. Estimated effort and risk for each change
6. Recommended order of changes to minimize risk

Do not make any code changes yet. Produce the plan as: JavaModernizationPlan.md