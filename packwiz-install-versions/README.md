# Packwiz install versions

Pins a set of mods to specific Modrinth versions via `packwiz modrinth add --project-id <id> --version-id <id>`. A mechanical, reusable applier - it does no version selection of its own, taking exactly what it's told to install. Intended to be fed the `conflicts` output of [`check-fabric-conflicts`](../check-fabric-conflicts), but usable standalone for any manual version pin.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/packwiz-install-versions@v2
    with:
      working-directory: 1.21.11
      versions: |
        [{"platform":"modrinth","mod":"AANobbMI","version":"NFkjnzWE"}]
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `working-directory` | No | `.` | Pack directory to run packwiz in. |
| `versions` | Yes | | JSON array of `{ platform: "modrinth", mod, version }` triples, where `mod` is a Modrinth project ID and `version` is a Modrinth version ID. |

Modrinth-only in this version - `platform` has no other accepted value yet.
