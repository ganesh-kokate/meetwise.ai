FROM openjdk:17-jdk-slim
EXPOSE 8080
Add target/videocall-0.0.1-SNAPSHOT.jar videocall-0.0.1-SNAPSHOT.jar
ENTRYPOINT ["java","-jar","/videocall-0.0.1-SNAPSHOT.jar"]