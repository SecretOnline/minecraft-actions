# Get update versions

Fetches the latest versions of Minecraft toolchain components for a given Minecraft version. Queries the Mojang, Fabric, and NeoForge APIs to resolve compatible versions of each component.

If no Minecraft version is provided, it defaults to the latest release from the Mojang version manifest.

## Usage

```yaml
- uses: SecretOnline/minecraft-actions/get-update-versions@main
  id: versions
  with:
    user-agent: your-name/your-mod (contact@example.com)
    minecraft-version: "26.1-snapshot-6"

- run: |
    echo "Minecraft: ${{ steps.versions.outputs.minecraft-version }}"
    echo "Java: ${{ steps.versions.outputs.java-version }}"
    echo "Fabric API: ${{ steps.versions.outputs.fabric-api-version }}"
    echo "NeoForge: ${{ steps.versions.outputs.neoforge-version }}"
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `user-agent` | Yes | | User-Agent string for HTTP requests. |
| `minecraft-version` | No | Latest release | Minecraft version to look up. |
| `gradle-properties` | No | `gradle.properties` | Path to the gradle.properties file. |

## Outputs

| Name | Description |
| --- | --- |
| `minecraft-version` | The resolved Minecraft version. |
| `java-version` | Java major version required for this Minecraft version. |
| `numeric-version` | Numeric part of the version, without snapshot/pre/rc suffix. |
| `fabric-loader-version` | Latest stable Fabric Loader version. |
| `fabric-api-version` | Latest Fabric API version for this Minecraft version. |
| `neoforge-version` | Latest NeoForge version for this Minecraft version. |
| `neoform-version` | Latest NeoForm version for this Minecraft version. |
