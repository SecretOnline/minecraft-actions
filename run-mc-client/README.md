# Run Minecraft client

Starts a Minecraft client (installed by [setup-mc-client](../setup-mc-client)) headless under `xvfb-run`, auto-joining a singleplayer world or a multiplayer server, and waits for it to become ready, failing fast if it crashes first. Stops it (`SIGTERM`, then `SIGKILL` after a timeout) in a post step once the job's later steps have finished.

The runner must already have `xvfb` installed (e.g. `apt-get install -y xvfb`) before this action runs — it does not install system packages on your behalf.

## Usage

```yaml
steps:
  - run: sudo apt-get update && sudo apt-get install -y xvfb
  - uses: SecretOnline/minecraft-actions/setup-mc-client@main
    with:
      user-agent: your-name/your-mod (contact@example.com)
  - uses: SecretOnline/minecraft-actions/run-mc-client@main
    id: run
    with:
      server-address: localhost:25565
      log-file: client.log
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `client-directory` | No | `.` | Directory the client was installed into by `setup-mc-client`. |
| `username` | No | `Player` | Offline-mode player name to launch as. |
| `singleplayer-world` | No | | Name of a singleplayer world (folder name under `client-directory/saves`) to auto-join on launch. Mutually exclusive with `server-address`. |
| `server-address` | No | | `host:port` of a multiplayer server to auto-join on launch. Mutually exclusive with `singleplayer-world`. |
| `java-args` | No | | Extra JVM arguments (e.g. `-Xmx2G`), appended directly to the `java` invocation. |
| `width` | No | | Window width. Only takes effect if `height` is also set. |
| `height` | No | | Window height. Only takes effect if `width` is also set. |
| `ready-pattern` | No | `advancements` | Substring to look for in the client log that indicates it is ready. Defaults to matching the "Loaded N advancements" line logged right after joining a world. |
| `timeout-seconds` | No | `120` | How long to wait for the client to become ready before failing. |
| `log-file` | No | | Path to redirect the client's stdout/stderr to. |

## Outputs

| Name | Description |
| --- | --- |
| `pid` | Process ID of the running client (the `xvfb-run` wrapper process). |
| `log-file` | Path the client's stdout/stderr was redirected to. |
