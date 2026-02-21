# Get test matrix

Builds a GitHub Actions matrix of Minecraft versions and their required Java versions, based on the `minecraft_version` and `minecraft_version_range` fields in a gradle.properties file.

For snapshot or pre-release versions (containing `-snapshot`, `-pre`, or `-rc`), the matrix contains only that single version. For release versions, it finds all Minecraft releases matching the Maven version range.

## Usage

```yaml
jobs:
  get-matrix:
    runs-on: ubuntu-latest
    outputs:
      test-matrix: ${{ steps.matrix.outputs.test-matrix }}
    steps:
      - uses: actions/checkout@v6
      - uses: SecretOnline/minecraft-actions/get-test-matrix@main
        id: matrix
        with:
          user-agent: your-name/your-mod (contact@example.com)

  test:
    needs: get-matrix
    strategy:
      matrix:
        versions: ${{ fromJson(needs.get-matrix.outputs.test-matrix) }}
    steps:
      - run: echo "Testing on Minecraft ${{ matrix.versions.minecraft-version }}"
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `user-agent` | Yes | | User-Agent string for HTTP requests. |
| `gradle-properties` | No | `gradle.properties` | Path to the gradle.properties file. |

## Outputs

| Name | Description |
| --- | --- |
| `test-matrix` | JSON array of objects, each with `name`, `minecraft-version`, and `java-version` fields. |
