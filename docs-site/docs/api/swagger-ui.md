---
id: swagger-ui
title: 📖 Interactive Swagger UI
sidebar_label: 📖 Swagger UI
---

# 📖 Interactive Swagger UI

ABS Smart Home Backend serves an embedded, interactive **Swagger UI** for testing and exploring all REST endpoints directly from your browser.

---

## 🌐 Accessing Swagger UI

When the backend server is running, navigate to:

- **Primary URL**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **API Versioned URL**: [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs)

---

## ✨ Features

- **Interactive "Try it out"**: Test live endpoints against your local server or staging environment with full payload validation.
- **Strict Zod Types**: Request bodies and responses match the TypeScript backend types 1-to-1.
- **Zero External Dependencies**: Swagger UI is served via a CDN-backed HTML renderer (`swagger-ui-dist`) wrapped cleanly in a Koa middleware.

---

## 💻 Server Middleware Implementation

The Swagger UI middleware is defined in `src/core/openapi/swagger-ui.ts` and mounted onto Koa:

```typescript
import { createSwaggerUiMiddleware } from '../openapi/swagger-ui.js';

// Mount on root /docs and versioned /api/v1/docs
app.use(createSwaggerUiMiddleware('/api/v1/docs/openapi.json', '/docs'));
app.use(createSwaggerUiMiddleware('/api/v1/docs/openapi.json', '/api/v1/docs'));
```
