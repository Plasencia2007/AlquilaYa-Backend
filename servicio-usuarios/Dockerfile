# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./
RUN chmod +x ./mvnw && ./mvnw -B -q dependency:go-offline
COPY src ./src
RUN ./mvnw -B -q -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=builder /build/target/*.jar app.jar
RUN chown app:app app.jar

# Directorio para uploads locales (en prod debería usarse Cloudinary/S3 en su lugar).
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads
VOLUME ["/app/uploads"]

USER app
# Puerto aleatorio: el servicio se expone vía Eureka y no debería accederse directo.
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
