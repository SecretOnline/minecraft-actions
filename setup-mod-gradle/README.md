# Setup Minecraft mod Gradle

Sets up Java and Gradle for building Minecraft mods. Handles making the Gradle wrapper executable, validating it, installing the correct Java version, and configuring Gradle.

By default, the Java version is read from the `java_version` field in gradle.properties. This can be overridden with an explicit `java-version` input.

## Usage

```yaml
- uses: actions/checkout@v6
- uses: SecretOnline/minecraft-actions/setup-mod-gradle@main
- run: ./gradlew build
```

With an explicit Java version (for example, from a matrix):

```yaml
- uses: actions/checkout@v6
- uses: SecretOnline/minecraft-actions/setup-mod-gradle@main
  id: gradle
  with:
    java-version: ${{ matrix.versions.java-version }}
- run: ${{ steps.gradle.outputs.java-path }}/bin/java -version
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `java-version` | No | Read from `gradle.properties` | Java version to install. |
| `gradle-properties` | No | `gradle.properties` | Path to the gradle.properties file. |

## Outputs

| Name | Description |
| --- | --- |
| `java-version` | The Java version that was set up. |
| `java-path` | Path to the Java installation. |
