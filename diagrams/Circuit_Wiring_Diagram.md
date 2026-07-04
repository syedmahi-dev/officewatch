# Circuit Wiring Diagram — Work Room 1 (Reference for Wokwi/Tinkercad)

Concept schematic only — the deployed demo's live data comes from the software simulator (`ARCHITECTURE.md` §3.4), not this hardware. One representative room is wired (2 fans + 3 lights = 5 devices); Work Room 2 and the Drawing Room are electrically identical and are not re-drawn, per the spec's allowance.

## Color Legend

| Swatch | Meaning |
|:---:|---|
| 🔵 | Relay control output (ESP32 → relay coil) |
| ⚪ | Manual toggle button input (debounced) |
| 🟣 | Analog sensing / status signal |
| 🟡 | Power/ground rail |

---

## Wiring Diagram

```
                          ┌───────────────────────────────┐
                          │        ESP32 DevKit             │
                          │        (3.3V logic)             │
                          │                                  │
   🔵 GPIO5  ●────────────┤                                  ├────────────● GPIO18  ⚪
   🔵 GPIO4  ●────────────┤                                  ├────────────● GPIO19  ⚪
   🔵 GPIO2  ●────────────┤                                  ├────────────● GPIO21  ⚪
   🔵 GPIO15 ●────────────┤                                  ├────────────● GPIO22  ⚪
   🔵 GPIO13 ●────────────┤                                  ├────────────● GPIO23  ⚪
                          │                                  │
   🟡 GPIO27 ●────────────┤   (status/heartbeat LED)         │
   🟣 GPIO34 ●────────────┤   (ADC1_CH6, input-only)         │
                          └───────────────────────────────┘
        │                                                        │
        │ 🔵 relay control (outputs)                              │ ⚪ manual toggle (inputs)
        ▼                                                        ▼
┌───────────────────┐                                  ┌───────────────────────┐
│ 🔵 Relay — Fan 1    │                                  │ ⚪ Button — Fan 1 toggle │
│ switches 60W load   │                                  │ 10kΩ pull-down          │
└───────────────────┘                                  └───────────────────────┘
┌───────────────────┐                                  ┌───────────────────────┐
│ 🔵 Relay — Fan 2    │                                  │ ⚪ Button — Fan 2 toggle │
│ switches 60W load   │                                  │ 10kΩ pull-down          │
└───────────────────┘                                  └───────────────────────┘
┌───────────────────┐                                  ┌───────────────────────┐
│ 🔵 Relay/LED — Lt 1 │                                  │ ⚪ Button — Light 1     │
│ switches 15W load   │                                  │ 10kΩ pull-down          │
└───────────────────┘                                  └───────────────────────┘
┌───────────────────┐                                  ┌───────────────────────┐
│ 🔵 Relay/LED — Lt 2 │                                  │ ⚪ Button — Light 2     │
│ switches 15W load   │                                  │ 10kΩ pull-down          │
└───────────────────┘                                  └───────────────────────┘
┌───────────────────┐                                  ┌───────────────────────┐
│ 🔵 Relay/LED — Lt 3 │                                  │ ⚪ Button — Light 3     │
│ switches 15W load   │                                  │ 10kΩ pull-down          │
└───────────────────┘                                  └───────────────────────┘

        │ 🟣 analog                                              │ 🟡 status
        ▼                                                        ▼
┌───────────────────────┐                          ┌───────────────────────────┐
│ 🟣 ACS712 Current Sensor│                          │ 🟡 Heartbeat / Status LED   │
│ shared bus, in series   │                          │ continuous blink =         │
│ with live wire, Hall-   │                          │ ESP32 alive — visual       │
│ effect → analog voltage │                          │ proof-of-life for demo     │
└───────────────────────┘                          └───────────────────────────┘
```

---

## Pin Mapping Table

| Device | Function | ESP32 GPIO | Signal type |
|---|---|---|---|
| Fan 1 | Relay control (output) | GPIO 5 | 🔵 |
| Fan 1 | Manual toggle (input) | GPIO 18 | ⚪ |
| Fan 2 | Relay control (output) | GPIO 4 | 🔵 |
| Fan 2 | Manual toggle (input) | GPIO 19 | ⚪ |
| Light 1 | Relay control (output) | GPIO 2 | 🔵 |
| Light 1 | Manual toggle (input) | GPIO 21 | ⚪ |
| Light 2 | Relay control (output) | GPIO 15 | 🔵 |
| Light 2 | Manual toggle (input) | GPIO 22 | ⚪ |
| Light 3 | Relay control (output) | GPIO 13 | 🔵 |
| Light 3 | Manual toggle (input) | GPIO 23 | ⚪ |
| Current sensor (shared) | Analog input | GPIO 34 (ADC1_CH6) | 🟣 |
| Status LED (heartbeat) | Digital output | GPIO 27 | 🟡 |

⚠️ **Strapping-pin note:** GPIO 2 and GPIO 15 influence ESP32 boot mode. Using them for Light 1/Light 2 relay control usually works fine, but if you see a relay click briefly at power-on or erratic boot behavior, swap those two to GPIO 25/26 and update this table (see `ARCHITECTURE.md` §3.2 for the full reasoning).

---

## Electrical Reasoning (summary — full detail in `ARCHITECTURE.md` §3.3)

- **Relays isolate 3.3V ESP32 logic from mains-voltage loads.** Never drive a fan/light directly from a GPIO.
- **ACS712 measures real current via the Hall effect** — output is an analog voltage the ESP32's ADC reads and converts to Watts (`P = V × I`, mains voltage stated per your region in the README).
- **Buttons are debounced** — either a hardware RC network (10kΩ + 100nF) or a 50ms firmware ignore-window — to avoid one physical press registering as multiple toggle events.
- **GPIO 34 is ADC1, input-only, WiFi-safe** — deliberately chosen over an ADC2 pin, since ADC2 is unreliable while WiFi is active.

---

*Companion files: `Circuit_Wiring_Diagram.svg` (same diagram, vector graphic) and `Component_List.md` (full bill of materials).*
