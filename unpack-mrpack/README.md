# Unpack mrpack

Unpacks a Modrinth modpack (`.mrpack`) into a Minecraft instance directory. Downloads the files listed in `modrinth.index.json`, verifying each one's size and SHA-1, skipping any file not supported for the given environment. Then applies the pack's `overrides/` directory, followed by `client-overrides/` or `server-overrides/` (whichever matches `environment`), so environment-specific files take precedence.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/unpack-mrpack@main
    id: unpack
    with:
      mrpack-file: modpack.mrpack
      minecraft-directory: mc-server
      environment: server
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `mrpack-file` | Yes | | Path to the .mrpack file to unpack. |
| `minecraft-directory` | Yes | | Directory to unpack the pack into. |
| `environment` | No | `client` | Environment to unpack for (`client` or `server`). |
| `download-concurrency` | No | `8` | Number of pack files to download in parallel. |

## Outputs

| Name | Description |
| --- | --- |
| `minecraft-directory` | The `minecraft-directory` input, echoed back. |
| `minecraft-version` | Minecraft version required by the pack, from `modrinth.index.json`'s `dependencies`. |
| `dependencies` | JSON object of the pack's dependencies (e.g. `minecraft`, `fabric-loader`, `neoforge` versions). |
