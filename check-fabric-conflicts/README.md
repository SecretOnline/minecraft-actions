# Check Fabric mod conflicts

Scans every installed Fabric mod's `fabric.mod.json` `depends` block against the pack's currently installed mods. For any mod that fails a dependent's declared version range, searches that mod's Modrinth version history (newest first) for the newest version that satisfies every declared range against it - not just one hard-coded pair.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/check-fabric-conflicts@v2
    id: check-conflicts
    with:
      working-directory: 1.21.11
      minecraft-version: "1.21.11"
      loader: fabric

  - uses: SecretOnline/minecraft-actions/packwiz-install-versions@v2
    if: steps.check-conflicts.outputs.has-conflicts == 'true'
    with:
      working-directory: 1.21.11
      versions: ${{ steps.check-conflicts.outputs.conflicts }}
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `working-directory` | No | `.` | Pack directory containing a `mods/` subdirectory of `*.pw.toml` files. |
| `minecraft-version` | Yes | | Minecraft version to filter candidate Modrinth versions by. |
| `loader` | Yes | | Mod loader to filter candidate Modrinth versions by (e.g. `fabric`). |
| `max-versions-to-search` | No | `10` | How many of a dependency's newest Modrinth versions to check before giving up. |

## Outputs

| Name | Description |
| --- | --- |
| `has-conflicts` | Whether any fix was found. |
| `conflicts` | JSON array of `{ platform, mod, version }` triples, each a Modrinth project ID and version ID to install to resolve a detected conflict. Suitable as-is for [`packwiz-install-versions`](../packwiz-install-versions)'s `versions` input. |

## Known limitation

This action only ever adjusts the *flagged dependency's* own version - it treats every dependent's currently-declared range as fixed. This breaks down when a dependent's own fresh update is what made a constraint unsatisfiable in the first place: e.g. mod A requires dependency D `~1.0` (unchanged), mod B's latest version requires D `~2.0` but B's prior version required `~1.0`, and D just got updated to `2.0`. Intersecting the declared ranges against D gives `~1.0 ∩ ~2.0` = empty - no version of D satisfies both, so the search exhausts its bound and finds nothing. This action logs a warning and leaves D as-is in that case; it does not attempt to roll back mod B instead. Resolving this class of conflict would require a joint search across the whole connected conflict cluster, not a single linear walk on one mod's version history.

Modrinth-only in this version - mods tracked via `[update.curseforge]` are not scanned.
