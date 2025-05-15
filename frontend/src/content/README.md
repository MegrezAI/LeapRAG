# Fumadocs Guide

## Introduction

This project uses [Fumadocs](https://fumadocs.vercel.app/) as the documentation framework to manage multilingual documentation. The default language is **American English (en-US)**, with support for additional language versions.

## File Naming Convention

### Basic Rules

- Default language file: `[name].mdx`
- Other language files: `[name].[lang].mdx`

Here, `[name]` is the base name of the file, and `[lang]` is the language code (e.g., `en-US`).

### Example Structure

```
docs/
├── getting-started.mdx # English version
├── getting-started.zh-Hans.mdx # Chinese version
├── advanced-usage.mdx # English version
└── advanced-usage.zh-Hans.mdx # Chinese version
```

## Naming Conventions

1. **English Documentation (Default)**

   - Use `.mdx` suffix directly
   - Example: `guide.mdx`

2. **Chinese Documentation**
   - Add `.en-US` language identifier
   - Example: `guide.zh-Hans.mdx`

## Related Links

- 📚 [Official Documentation](https://fumadocs.vercel.app)
- 💻 [GitHub Repository](https://github.com/fuma-nama/fumadocs)
