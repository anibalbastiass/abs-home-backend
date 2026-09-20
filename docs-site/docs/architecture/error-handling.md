---
sidebar_position: 5
---

# ⚠️ RFC 7807 Problem Details Error Handling

All HTTP errors follow the **RFC 7807 (Problem Details for HTTP APIs)** specification with `Content-Type: application/problem+json`.

## 🚨 Problem Details Structure

```json
{
    "type": "https://abshome.dev/errors/validation-error",
    "title": "Unprocessable Entity",
    "status": 422,
    "detail": "One or more request parameters failed validation schema checks.",
    "instance": "/api/v1/devices/00000000-0000-0000-0000-000000000001/command",
    "errorId": "err_1726852000000_abc12",
    "invalidParams": [
        {
            "name": "action",
            "reason": "Required"
        }
    ]
}
```

---

## 🏗️ Domain Error Hierarchy

- `NotFoundError` $\rightarrow$ `404 Not Found`
- `ValidationError` $\rightarrow$ `422 Unprocessable Entity`
- `RateLimitError` $\rightarrow$ `429 Too Many Requests`
- `VendorIntegrationError` $\rightarrow$ `502 Bad Gateway`
- `InternalServerError` $\rightarrow$ `500 Internal Server Error`
