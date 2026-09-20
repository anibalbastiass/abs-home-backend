---
id: openapi-spec
title: 📋 OpenAPI 3.1 Specification & KMP Codegen
sidebar_label: 📋 OpenAPI Spec & Codegen
---

# 📋 OpenAPI 3.1 Specification & KMP Codegen

The backend generates a strict **OpenAPI 3.1.0** specification directly from runtime Zod schemas. This ensures zero drift between backend domain logic, mobile clients, and REST documentation.

---

## 📥 Accessing the Spec

- **Raw JSON Endpoint**: [http://localhost:3000/api/v1/docs/openapi.json](http://localhost:3000/api/v1/docs/openapi.json)
- **Committed Spec File**: [`docs/openapi.json`](file:///Users/anibalbastias/Documents/GitHub/abs-home-backend/docs/openapi.json)

---

## 🔄 Automated Spec Export

To export the latest spec file:

```bash
npm run spec:export
```

This invokes `src/scripts/export-openapi.ts` to generate `docs/openapi.json`.

---

## 📱 Kotlin Multiplatform (KMP) Mobile Codegen

The exported OpenAPI spec is consumed by the **ABS Smart Home Mobile App** (`abs-home-mobile`) to generate type-safe Kotlin Multiplatform API clients:

```bash
# Example openapi-generator-cli invocation for KMP
npx @openapitools/openapi-generator-cli generate \
    -i docs/openapi.json \
    -g kotlin \
    -o ./mobile-sdk \
    --additional-properties=library=multiplatform,serializationLibrary=kotlinx
```
