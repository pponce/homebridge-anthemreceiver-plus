# Anthem Receiver Plus 1.2.2

Fixes the two configuration-schema failures reported during Homebridge verification.

- Replace legacy boolean `required` flags with the standard object-level array. Host, Port and PanelBrightness retain their existing required status; zone names and maximum volume remain optional.
- Add the optional lowercase `name` schema property for the Homebridge log label, with a default of Anthem Receiver Plus.
- Check these schema requirements before publication.

Update normally through Homebridge UI and restart the Homebridge instance or child bridge running this plugin. Existing configuration, the AnthemReceiver platform name and paired accessories are preserved.

Node.js 22/24 and Homebridge 1.8/2.x compatibility are retained. STR PA/IA support remains experimental.
