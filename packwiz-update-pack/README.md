# Packwiz update pack

Runs `packwiz update --all --yes` and `packwiz migrate loader latest --yes` in a pack directory, reporting exactly what changed as structured data. Emits no markdown - changelog/PR-body rendering is the caller's responsibility, so this action stays reusable regardless of how a consumer wants to present the result.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/packwiz-update-pack@v2
    id: update-pack
    with:
      working-directory: 1.21.11

  - uses: SecretOnline/minecraft-actions/check-fabric-conflicts@v2
    id: check-conflicts
    if: steps.update-pack.outputs.has-update == 'true'
    with:
      working-directory: 1.21.11
      minecraft-version: "1.21.11"
      loader: fabric
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `working-directory` | No | `.` | Pack directory to run packwiz in. |

## Outputs

| Name | Description |
| --- | --- |
| `has-update` | Whether any mod or the loader was updated. |
| `updated-mods` | JSON array of `{ name, oldFile, newFile }` for each updated mod. `oldFile`/`newFile` are the jar filenames packwiz reports (verified against a real run), not clean version numbers - packwiz doesn't surface those directly in `update`'s output. |
| `loader-update` | JSON `{ name, version }` if the loader was updated, otherwise an empty string. |
