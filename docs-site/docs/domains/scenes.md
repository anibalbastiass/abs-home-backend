---
sidebar_position: 2
---

# 🎬 Scenes Domain

The `scenes` domain orchestrates multi-device, multi-vendor actions under a single trigger.

## 💡 Example Cross-Vendor Scenes

- **"Good Night"**:
  1. Turn off living room Philips Hue lights (`on: false`)
  2. Close SwitchBot bedroom curtains (`position: 0`)
  3. Set Google Nest thermostat to 19°C (`targetTemp: 19.0`)
  4. Arm Amazon Blink exterior cameras (`armed: true`)

---

## 📡 Endpoints

- `GET /api/v1/scenes`: List all configured scenes for home
- `POST /api/v1/scenes`: Create a new scene with ordered actions
- `GET /api/v1/scenes/:id`: Get scene details
- `POST /api/v1/scenes/:id/trigger`: Execute all actions registered in the scene
