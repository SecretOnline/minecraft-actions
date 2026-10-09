# Setup Packwiz

Installs the [Packwiz](https://github.com/packwiz/packwiz) CLI onto PATH. Tries a Linux binary built by packwiz's own CI via nightly.link first, falls back to a previously cached build, and as a last resort builds packwiz from source with `go install` (requires Go already on PATH, e.g. via `actions/setup-go`), caching that build for future runs.

Linux runners only. There is no way to pin a specific packwiz version — the nightly.link artifact always reflects packwiz's main branch, and the source-build fallback always builds `@latest`.

Also restores/saves packwiz's own download cache (`~/.cache/packwiz/cache`, where it keeps previously-downloaded mod files) around your later packwiz steps in the same job, so re-downloading the same mods doesn't re-fetch them from CurseForge/Modrinth every run.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/setup-packwiz@v2
    id: packwiz
  - run: ${{ steps.packwiz.outputs.packwiz-path }} refresh
```

## Outputs

| Name | Description |
| --- | --- |
| `packwiz-path` | Absolute path to the installed packwiz binary. |
