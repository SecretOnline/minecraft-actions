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
