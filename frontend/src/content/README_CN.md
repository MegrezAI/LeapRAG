# fumadocs指南

## 简介

本项目采用 [Fumadocs](https://fumadocs.vercel.app/) 作为文档框架来管理多语言文档。文档默认使用**英文 (en-US)**，并支持其他语言版本的扩展。

## 文件命名规范

### 基础规则

- 默认语言文件: `[name].mdx`
- 其他语言文件: `[name].[lang].mdx`

其中 `[name]` 是文件的基本名称，`[lang]` 是语言代码(如 `en-US`)。

### 示例结构

```
docs/
├── getting-started.mdx      # 英文版本
├── getting-started.zh-Hans.mdx   # 中文版本
├── advanced-usage.mdx       # 英文版本
└── advanced-usage.zh-Hans.mdx    # 中文版本
```

## 命名约定

1. **英文文档 (默认)**

   - 直接使用 `.mdx` 后缀
   - 示例: `guide.mdx`

2. **中文文档**
   - 添加 `.zh-Hans` 语言标识
   - 示例: `guide.zh-Hans.mdx`

## 相关链接

- 📚 [官方文档](https://fumadocs.vercel.app)
- 💻 [GitHub 仓库](https://github.com/fuma-nama/fumadocs)
