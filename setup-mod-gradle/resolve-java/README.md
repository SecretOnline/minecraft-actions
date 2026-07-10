# Resolve Java version

Resolves the Java version from the `java-version` input or `gradle.properties`. A local `node24` action used internally by [setup-mod-gradle](../)'s "resolve Java version" step, since that action is otherwise a composite action calling marketplace steps.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/setup-mod-gradle/resolve-java@v2
    id: java
  - run: echo "Resolved Java ${{ steps.java.outputs.java-version }}"
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `java-version` | No | Read from `gradle.properties` | Java version to use. |
| `gradle-properties` | No | `gradle.properties` | Path to the gradle.properties file. |

## Outputs

| Name | Description |
| --- | --- |
| `java-version` | The resolved Java version. |
