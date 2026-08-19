# Changelog

## 0.6.0 - 2026-07-15

### Added

**Backoff-controlled worker restarts.** When a worker dies unexpectedly and not as a result of a deliberate disconnect, the primary now restarts it through an `isotropic-backoff` instance rather than forking again immediately. A crash loop therefore backs off instead of spinning at full speed.

A `restartBackoff` option on the primary's configuration controls this:

- if omitted, or any truthy value: a backoff is used, with `isotropic-backoff`'s defaults
- if a configuration object: used to construct the backoff
- if an existing backoff instance (anything exposing a `failed` method): adopted as-is, so several components can share one strategy
- if an explicitly falsy value: disables backoff and restores the previous immediate-refork behavior

The current instance is readable through a `restartBackoff` accessor. If the primary constructed a backoff itself, it is destroyed on shutdown. One you supplied is left alone.

**A `restartGiveUp` event.** When the backoff is exhausted and no workers remain, the primary logs a fatal message and shuts down rather than continuing to retry forever.

### Fixed

**Round-robin worker selection no longer depends on wall-clock time.** Worker ordering used `Date.now()` as the sort key, so two workers selected within the same millisecond were indistinguishable, and a clock adjustment could reorder the rotation arbitrarily. A monotonic counter is now used instead, making the rotation strictly fair and immune to clock changes.

**Selecting a worker when none are available no longer misbehaves** The method now returns early when the worker list is empty.

### Breaking changes

**`isotropic-backoff` is a new runtime dependency.**

**The primary constructor is now named `ClusterPrimary`,** so it carries a real `name` and `Symbol.toStringTag`.

#### Migration

The restart change is the one to be aware of: a dead worker is now replaced after a backoff delay rather than instantly. For a healthy cluster this is invisible, since the first backoff level retries immediately. For a cluster whose workers crash on startup, the primary will now slow down and eventually give up and shut down, where previously it would refork indefinitely. Pass a falsy `restartBackoff` to restore the old behavior.

### Changes

- Test suite migrated from Mocha to the built-in `node --test` runner.
- The Babel toolchain and build scripts were removed.
- Source moved from `js/` to `lib/`.
- All Isotropic dependencies bumped to their latest releases, including `isotropic-logger` `~0.5.0`, which changed its logging backend from Bunyan to pino. See that package's changelog, as it affects this package's log output.
- Recommends `node ^26.5.0` / `npm ^11.17.0`.

## 0.5.0 - 2025-06-18

### Changed

Dependency bumps only. No source changes.

## 0.4.0 - 2025-04-10

### Breaking changes

**Event declarations migrated from `defaultFunction` to `completeFunction`,** following the `isotropic-pubsub` 0.15.0 stage rename. Every internal event was updated.

If you subclassed `ClusterPrimary` or `ClusterWorker` and declared your own events with `defaultFunction`, those declarations must be renamed to `completeFunction`.

**`allowPublicPublish: false` was removed from the event declarations.** These events are no longer explicitly marked private. Under `isotropic-pubsub` 0.14.0 and later, `allowPublicPublish` already defaults to `false`, so the effective behavior is unchanged.

This release requires `isotropic-pubsub` `~0.15.0` via `isotropic-initializable` `~0.11.0`. Upgrade them together.

### Changed

- A comprehensive README was added.
- `eslint` pinned at `~9.8.0` as a direct dev dependency.
- `isotropic-dev-dependencies` bumped to `~0.3.1`.

## 0.3.0 - 2024-07-30

### Breaking changes

**"Master" was renamed to "primary" throughout the public interface.** This tracks the corresponding rename in Node.js's own `cluster` module.

| Before | After |
| --- | --- |
| `js/cluster-master.js` | `lib/cluster-primary.js` |
| `masterDisconnect` event | `primaryDisconnect` event |
| `masterMessage` event | `primaryMessage` event |
| `_eventMasterDisconnect` | `_eventPrimaryDisconnect` |
| `_eventMasterMessage` | `_eventPrimaryMessage` |
| `_eventMasterMessage_<type>` handlers | `_eventPrimaryMessage_<type>` handlers |
| `cluster.setupMaster` | `cluster.setupPrimary` |

**The pubsub configuration property was renamed from `_events` to `_pubsub`,** following `isotropic-pubsub` 0.14.0. Subclasses declaring events must rename it.

**The package is now an ES module.** `"type": "module"` was added to `package.json`. CommonJS consumers can no longer `require(...)`.

#### Migration

1. Update import paths from `cluster-master.js` to `cluster-primary.js`.
2. Rename every `master`-prefixed event name and handler method to its `primary` equivalent, including dynamically dispatched `_eventPrimaryMessage_<type>` methods.
3. Rename `_events` to `_pubsub` in every subclass.
4. Switch `require` to `import`.

### Changed

- ESLint moved to flat config.
- Coverage tooling switched from `nyc` to `c8`.
- `repository` given an explicit `github:` prefix.
- Recommends `node ^22.5.1` / `npm ^10.8.2`.

## 0.2.0 - 2021-02-22

### Changed

- The entire dev toolchain was replaced by a single `isotropic-dev-dependencies` dev dependency.
- Recommends `node ^14.15.5` / `npm ^7.5.4`.

No runtime behavior changed in this release.

## 0.1.0 - 2020-07-27

Initial release.

- Provides two constructors, `ClusterMaster` and `ClusterWorker`, built on `isotropic-initializable`, for managing a local process cluster.
- The master forks and tracks workers, replaces dead ones, distributes work round-robin, and coordinates a graceful shutdown.
- Workers observe `masterDisconnect` and `masterMessage` events, with message handling dispatched by message type to `_eventMasterMessage_<type>` methods.
- Both sides are observable and extendable through the `isotropic-pubsub` event lifecycle, so subclasses can hook or prevent any stage.
- Logging goes through `isotropic-logger`.
- Depends on `isotropic-error`, `isotropic-initializable`, `isotropic-later`, `isotropic-logger`, and `isotropic-make`.
- Recommends `node ^12.18.3` / `npm ^6.14.6`.
