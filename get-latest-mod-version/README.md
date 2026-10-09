# Get latest mod version

Looks up the latest Modrinth version of a mod for a given Minecraft version. By default only stable `release` versions are considered; set `allow-pre-release` to also consider `beta` and `alpha` versions.

## Usage

```yaml
jobs:
  latest-sodium:
    runs-on: ubuntu-latest
    steps:
      - uses: SecretOnline/minecraft-actions/get-latest-mod-version@v2
        id: sodium
        with:
          minecraft-version: "1.21.1"
          mod-id: AANobbMI

      - run: echo "Latest Sodium version is ${{ steps.sodium.outputs.mod-version }} (${{ steps.sodium.outputs.release-type }})"
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `minecraft-version` | Yes | | Minecraft version to find a matching mod version for. |
| `mod-id` | Yes | | Modrinth project ID or slug of the mod. |
| `allow-pre-release` | No | `false` | Whether to allow pre-release (beta or alpha) mod versions. |

## Outputs

| Name | Description |
| --- | --- |
| `mod-version` | The version number of the latest matching mod version. |
| `release-type` | The release type of the latest matching mod version (`release`, `beta`, or `alpha`). |
