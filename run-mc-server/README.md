# Run Minecraft server

Starts a Minecraft server (installed by [setup-mc-server](../setup-mc-server)) in the background and waits for it to become ready, failing fast if it crashes first. Gracefully stops the server over RCON in a post step once the job's later steps have finished.

## Usage

```yaml
steps:
  - uses: SecretOnline/minecraft-actions/setup-mc-server@v2
    with:
      accept-eula: "true"
  - uses: SecretOnline/minecraft-actions/run-mc-server@v2
    id: run
    with:
      log-file: server.log
  - run: echo "Server running as PID ${{ steps.run.outputs.pid }}"
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `server-directory` | No | `.` | Directory the server was installed into by `setup-mc-server`. |
| `java-args` | No | | Extra JVM arguments (e.g. `-Xmx2G`), applied via the `JAVA_TOOL_OPTIONS` environment variable. |
| `ready-pattern` | No | `Done (` | Substring to look for in the server log that indicates it is ready. |
| `timeout-seconds` | No | `300` | How long to wait for the server to become ready before failing. |
| `log-file` | No | | Path to redirect the server's stdout/stderr to. |

## Outputs

| Name | Description |
| --- | --- |
| `pid` | Process ID of the running server. |
| `log-file` | Path the server's stdout/stderr was redirected to. |
