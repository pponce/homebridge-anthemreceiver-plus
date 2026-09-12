# Project origins and maintainership

Anthem Receiver Plus is an independent continuation maintained by Pedro Ponce de Leon (`pponce`). It builds on [EHylands/homebridge-anthemreceiver](https://github.com/EHylands/homebridge-anthemreceiver), contributions preserved in the Git history, and work in [pponce/homebridge-anthemreceiver](https://github.com/pponce/homebridge-anthemreceiver).

The repository retains the inherited Apache-2.0 [license](LICENSE). Original copyright and attribution notices remain applicable. Changes by the Plus maintainer include volume mapping, receiver reliability and state confirmation, Homebridge 2 compatibility work, the custom settings UI, ALM None selection, and the independent package/migration preparation. Commit history and CHANGELOG.md record modifications; project independence does not erase upstream authorship.

## Why a successor

At the 2026-09-11 review, the upstream default branch's latest commit was dated 2023-10-07. [ALM None issue #19](https://github.com/EHylands/homebridge-anthemreceiver/issues/19) and [Homebridge 2 issue #20](https://github.com/EHylands/homebridge-anthemreceiver/issues/20), both opened on 2024-12-29, were still open with no issue comments. [SLM pull request #22](https://github.com/EHylands/homebridge-anthemreceiver/pull/22) was also open. These observations explain the need for an actively maintained successor; they do not establish the original developer's intentions or imply that nobody commented on every upstream PR.

Plus addresses the ALM None selection and includes a Homebridge 1/2 CI matrix, along with the improvements described in the README. STR PA/IA support is now experimental; physical-device confirmation remains pending.

## Compatibility identity

The npm package and registered plugin identifier are `homebridge-anthemreceiver-plus`. The platform name remains `AnthemReceiver` by design so existing configuration and cached accessories can be migrated. This is a compatibility choice, not a claim to own the upstream npm name or to have received Homebridge verification. See [MIGRATION.md](MIGRATION.md).


## STR protocol research

Experimental STR support was informed by [nugget/python-anthemav PR #40](https://github.com/nugget/python-anthemav/pull/40), authored by iain-cx, with STR Integrated Amplifier testing and contributions from mattlathrop. Their reports established PA/IA identities, volume limits, listening-mode values, bypass differences and the BRT query collision. This TypeScript implementation uses those protocol findings; it does not import the Python library.
