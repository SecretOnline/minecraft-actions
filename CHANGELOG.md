# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
The versioning scheme is listed in the README.

<!-- ### Known Issues -->
<!-- ### Added -->
<!-- ### Updated -->
<!-- ### Changed -->
<!-- ### Deprecated -->
<!-- ### Removed -->
<!-- ### Fixed -->
<!-- ### Security -->

## Unreleased - DATE

## v2.0.0 - 2023-07-10

Nearly 3 years later and I'm back in this repo.

### Known Issues

Referring to these actions via `@main` is no longer possible due to them being JS based rather than Bash. Considering I was only using these actions in two repos prior to this and I don't think anyone else was, this shouldn't be an issue.

### Added

Many new actions!

- For running the game inside of GitHub Actions:
  - 4 new actions:
    - `setup-mc-server`
    - `setup-mc-client`
    - `run-mc-server`
    - `run-mc-client`
  - Each work with Vanilla, Fabric, and NeoForge.
- For working with modpacks:
  - `setup-packwiz` and `unpack-mrpack` are pretty generic.
  - `packwiz-update-pack`, `check-fabric-conflicts`, and `packwiz-install-versions` are meant to be used together to update a modpack somewhat automatically.
    - These are currently built around Fabric and Modrinth, as that's what I use it for and these actions are for me.

And behind the scenes, some new GitHub Actions workflow to help me keep these up-to-date:

- `ci.yml` to ensure the actions in this repo still run after making changes.
- `update-node.yml` to keep Node updated. Can be invoked manually to bump to a new major version when GitHub updates their runners.
- `sync-actions-versions.yml` to make sure that the versions of actions in the READMEs match what Dependabot updates them to.

### Changed

- All existing actions have been ported to Node.js
  - The exception is `setup-mod-gradle`, since it's a composite action. However its sub-action `resolve-java` has been converted.

## v1.0.0 - 2023-07-22

Initial release

### Added

- `setup-mod-gradle`
  - Find the `java_version` key in `gradle.properties`, installs that version of Java, then sets up Gradle.
- `get-update-versions`
  - Get the latest release versions of Minecraft, Fabric, NeoForge, and their immediate dependencies.
- `get-test-matrix`
  - Find the `minecraft_version_range` key in `gradle.properties`, then returns JSON string containing Minecraft versions matching the range.
  - The resulting JSON array contains objects of the shape: `{ name: string; minecraft-version: string; java-version: string; }`.
