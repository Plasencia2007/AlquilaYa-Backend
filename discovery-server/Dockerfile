# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------
# Build stage
# ------------------------------------------------------------
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build

# Descarga dependencias primero para cachear esa capa.
COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./
RUN chmod +x ./mvnw && ./mvnw -B -q dependency:go-offline

# Build del jar (sin tests — que se corran en CI).
COPY src ./src
RUN ./mvnw -B -q -DskipTests clean package

# ------------------------------------------------------------
# Runtime stage
# ------------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Usuario no-root por buena práctica.
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=builder /build/target/*.jar app.jar
RUN chown app:app app.jar
USER app

EXPOSE 8761
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XshowSettings:vm"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
