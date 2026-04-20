# 🚀 Quick Start - API Documentation (TypeDoc)

This project generates API docs with **TypeDoc** from the root package scripts.

---

## ⚡ Super Quick Start

```bash
# From repository root
npm install
npm run docs:build
npm run docs:serve
```

Then open: **http://localhost:8080**

---

## 🎯 What Each Command Does

| Command              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `npm install`        | Installs dependencies, including TypeDoc                  |
| `npm run docs:build` | Generates API docs into `docs/api/`                       |
| `npm run docs:serve` | Serves `docs/api/` with Python HTTP server on port `8080` |
| `npm run docs:clean` | Removes generated API docs                                |

---

## 🆘 Troubleshooting

### `typedoc: command not found`

Run dependency install first:

```bash
npm install
```

### Port 8080 already in use

Use another port:

```bash
cd docs/api
python3 -m http.server 8081
```

### TypeDoc warnings during build

- `@category` / `@description` warnings are resolved by the current TypeDoc config.
- If warnings reappear, verify `typedoc.json` is up to date and rebuild.

---

## 📎 Related Docs

- [README local docs section](../README.md#viewing-documentation-locally)
- [Reference index](./reference/index.md)
