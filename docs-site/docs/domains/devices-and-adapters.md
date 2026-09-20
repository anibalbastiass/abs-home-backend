---
sidebar_position: 1
---

# 📱 Devices & IoT Vendor Adapters

The `devices` domain manages the fleet of physical and virtual smart devices across multiple vendors.

## 🔌 Vendor Adapters

### 1. Philips Hue (`HueAdapter`)
- CLIP v2 API integration
- Local bridge discovery and HTTPS REST control
- Actions: `on_off`, `brightness` (0-100), `colorTemp`, `colorRgb`

### 2. Google Nest (`NestAdapter`)
- Smart Device Management (SDM) API
- Actions: `set_mode` (`HEAT`, `COOL`, `HEATCOOL`, `OFF`, `ECO`), `set_temperature` (10–32°C)

### 3. SwitchBot (`SwitchBotAdapter`)
- Open API v1.1 with dynamic HMAC-SHA256 request signing
- Actions: `set_position` (0-100% curtain open/close), `press` (Bot physical push button)

### 4. Ring (`RingAdapter`)
- Ring Doorbell & Camera integration
- Capabilities: Video stream negotiation, motion events, siren triggers

### 5. Amazon Blink (`BlinkAdapter`)
- Blink Home Monitor API
- Capabilities: Arm/disarm networks, thumbnail capture, RTSP liveview stream sessions

---

## 📡 Endpoints

- `GET /api/v1/devices`: List devices with query filters (`vendor`, `type`, `roomId`, `homeId`)
- `GET /api/v1/devices/:id`: Fetch device details and current state
- `PATCH /api/v1/devices/:id`: Update device metadata (name, room)
- `POST /api/v1/devices/:id/command`: Execute throttled IoT action
