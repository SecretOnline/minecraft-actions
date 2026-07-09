# Setup Minecraft server

Downloads a Minecraft server (vanilla, Fabric, or NeoForge) and writes `eula.txt` and `server.properties`, ready to be started by the [run-mc-server](../run-mc-server) action.

When `loader` is `neoforge`, this runs the NeoForge installer with `java`, so a JDK must already be on PATH (e.g. via `actions/setup-java`) before this action runs. NeoForge's installer patches the vanilla jar in place and produces a `run.sh` wrapper rather than a plain `server.jar`.

## Usage

```yaml
steps:
  - uses: actions/setup-java@v4
    with:
      distribution: temurin
      java-version: "25"
  - uses: SecretOnline/minecraft-actions/setup-mc-server@v2
    id: server
    with:
      minecraft-version: "26.1"
      loader: neoforge
      accept-eula: "true"
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `minecraft-version` | No | Latest release | Minecraft version to run. |
| `loader` | No | `vanilla` | Server type to install. One of `vanilla`, `fabric`, or `neoforge`. |
| `fabric-loader-version` | No | Latest stable | Fabric Loader version to use when `loader` is `fabric`. |
| `fabric-installer-version` | No | Latest stable | Fabric Installer version to use when `loader` is `fabric`. |
| `neoforge-version` | No | Latest stable for the resolved Minecraft version | NeoForge version to use when `loader` is `neoforge`. |
| `server-directory` | No | `.` | Directory to install the server into. |
| `accept-eula` | Yes | | Must be `"true"` to acknowledge the [Minecraft EULA](https://aka.ms/MinecraftEULA) on the user's behalf. |
| `server-properties` | No | | Extra `server.properties` lines (`key=value`, one per line) to apply on top of the CI-friendly defaults (`online-mode=false`, `white-list=false`, `enable-rcon=true`). |

## Outputs

| Name | Description |
| --- | --- |
| `server-directory` | Directory the server was installed into. |
| `minecraft-version` | The resolved Minecraft version. |
| `fabric-loader-version` | The resolved Fabric Loader version (only set when `loader` is `fabric`). |
| `fabric-installer-version` | The resolved Fabric Installer version (only set when `loader` is `fabric`). |
| `neoforge-version` | The resolved NeoForge version (only set when `loader` is `neoforge`). |
