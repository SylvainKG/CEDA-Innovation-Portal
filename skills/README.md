# Project skills

Reusable agent skills used to plan and build the CEDA Innovation Portal hackathon MVP.

| Skill | Responsibility | Use for |
|---|---|---|
| [project-blueprint-builder](project-blueprint-builder/SKILL.md) | What to build and why | Requirements and scope, user journeys, Figma/UI-UX specifications, functional architecture, data and API planning, implementation priorities, decision register |
| [evidence-led-system-builder](evidence-led-system-builder/SKILL.md) | How it is built and proven | Code implementation, database constraints and guarded operations, security and authorisation, tests and verification, engineering evidence, technical documentation updates, implementation reviews |

## How they work together

1. The approved blueprint (`docs/blueprint/`) is the single source of requirements and scope.
2. The evidence-led skill implements and verifies it slice by slice: Submit → Screen → Evaluate → Revise → Decide and award → Report.
3. If implementation shows the blueprint is wrong or unsafe, the evidence-led skill raises a blueprint change request instead of changing scope silently.
4. Each document has one home; see the document map in `evidence-led-system-builder/references/documentation-standards.md`.

## Source and fidelity

- `project-blueprint-builder` is included unchanged.
- `evidence-led-system-builder` is derived from the team's *Evidence-Led System Builder* skill document (9 pages). The original principles, phases, checklists, patterns and anti-patterns are kept verbatim in its `references/` files. Every project-specific addition is marked **"CEDA adaptation (added)"**.

## Installing locally

Skills are loaded from your coding assistant's project-level skills directory. Copy each skill folder (the folder containing `SKILL.md`) into that directory at the root of your local checkout, then start a new session so the skills are discovered. Keep that directory out of commits; this `skills/` folder is the shared source.
