---
name: skill-creator
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
---

# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend AI agent capabilities by providing specialized knowledge, workflows, and tools.

### What Skills Provide

1. **Specialized workflows** - Multi-step procedures for specific domains
2. **Tool integrations** - Instructions for working with specific file formats or APIs
3. **Domain expertise** - Company-specific knowledge, schemas, business logic
4. **Bundled resources** - Scripts, references, and assets for complex tasks

## Core Principles

### Concise is Key

Only add context the AI doesn't already have. Challenge each piece: "Does this justify its token cost?"

### Degrees of Freedom

- **High freedom**: Multiple approaches valid, heuristics guide
- **Medium freedom**: Preferred pattern exists, some variation acceptable  
- **Low freedom**: Operations fragile, consistency critical

### Skill Anatomy

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description)
│   └── Markdown instructions
└── Resources (optional)
    ├── scripts/     - Executable code
    ├── references/  - Documentation
    └── assets/      - Templates, icons
```

## Progressive Disclosure

1. **Metadata** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed

Keep SKILL.md under 500 lines. Split content into separate files when approaching this limit.

## Creation Process

1. **Understand** - Gather concrete usage examples
2. **Plan** - Identify reusable resources (scripts, references, assets)
3. **Initialize** - Create skill directory structure
4. **Implement** - Write SKILL.md and resources
5. **Test** - Validate scripts work correctly
6. **Iterate** - Improve based on real usage

## SKILL.md Guidelines

### Frontmatter

```yaml
---
name: skill-name
description: What skill does + when to use it. Include triggers.
---
```

### Body

- Use imperative form
- Include examples over verbose explanations
- Reference bundled resources with clear usage guidance
- Keep essential procedures; move details to references/
