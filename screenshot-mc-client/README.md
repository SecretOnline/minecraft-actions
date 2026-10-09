# Screenshot Minecraft client

Takes a screenshot of a running Minecraft client (started by [run-mc-client](../run-mc-client)) via ImageMagick's `import`, and uploads it as a workflow artifact.

The runner must already have ImageMagick installed (e.g. `apt-get install -y imagemagick`) before this action runs — it does not install system packages on your behalf.

## Usage

```yaml
steps:
  - run: sudo apt-get update && sudo apt-get install -y xvfb imagemagick
  - uses: SecretOnline/minecraft-actions/setup-mc-client@v2
  - uses: SecretOnline/minecraft-actions/run-mc-client@v2
    id: run
    with:
      server-address: localhost:25565
  - uses: SecretOnline/minecraft-actions/screenshot-mc-client@v2
    with:
      display: ${{ steps.run.outputs.display }}
      xauthority: ${{ steps.run.outputs.xauthority }}
      artifact-name: client-screenshot
```

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `display` | Yes | | X display to screenshot (e.g. `:99`), as output by `run-mc-client`'s `display` output. |
| `xauthority` | Yes | | Path to the Xauthority cookie file for the display, as output by `run-mc-client`'s `xauthority` output. |
| `artifact-name` | Yes | | Name to give the uploaded artifact. Also used as the screenshot's filename (with a `.png` extension appended), since the artifact name parameter is ignored when uploading a single unarchived file. |
| `add-job-summary` | No | `false` | If `"true"`, adds the screenshot to the job summary. |

## Outputs

| Name | Description |
| --- | --- |
| `artifact-id` | ID of the uploaded artifact. |
