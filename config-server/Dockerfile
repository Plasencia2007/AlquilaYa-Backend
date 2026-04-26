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
USER app
EXPOSE 8888
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
