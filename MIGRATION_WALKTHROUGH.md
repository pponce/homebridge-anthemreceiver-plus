# Existing-user migration

The migration instructions are now combined in [MIGRATION.md](MIGRATION.md): make a Homebridge backup, keep your existing `AnthemReceiver` configuration, stop Homebridge, replace the old package with Plus from npm, and start Homebridge again.

The maintainer completed this migration successfully without changing existing scenes or automations. No preflight or snapshot scripts are needed for the standard procedure.
