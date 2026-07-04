# Component List — Circuit Simulation (Wokwi/Tinkercad)

Scope: one representative room (Work Room 1 — 2 fans + 3 lights, 5 controllable devices), per the hackathon spec's allowance that a full 15-device wiring isn't required. Rooms 2 and 3 are electrically identical — do not re-wire them, just note the repetition in the README.

## Bill of Materials

| # | Component | Qty | Role in this circuit |
|---|---|---|---|
| 1 | ESP32 DevKit (v1, 30/38-pin) | 1 | Microcontroller — reads button inputs, drives relay outputs, reads current sensor |
| 2 | Relay module, 5V, 1-channel (or one 2-channel module) | 2 | Switches the two fan loads |
| 3 | Relay module, 5V, 1-channel | 3 | Switches the three light loads |
| 4 | ACS712 current sensor (5A variant is enough for this load range) | 1 | Measures real current draw on the shared/representative load line |
| 5 | LED, 5mm, any color | 3 | Visual stand-in for each light in the Wokwi simulation (AC bulbs aren't simulated) |
| 6 | Small DC motor or piezo buzzer | 2 | Visual/audible stand-in for each fan in the Wokwi simulation |
| 7 | Momentary push button | 5 | Manual "someone flipped the switch" input — one per device |
| 8 | Resistor, 10kΩ | 5 | Pull-down for each button (paired with `INPUT_PULLDOWN` or external pull-down network) |
| 9 | Resistor, 220Ω–330Ω | 3 | Current-limiting resistor for each stand-in LED |
| 10 | LED, 5mm (any color, distinct from the light stand-ins) | 1 | Heartbeat/status indicator — proves the ESP32 hasn't crashed |
| 11 | Breadboard (full-size) | 1 | Prototyping surface |
| 12 | Jumper wires (M-M, M-F as needed) | ~30 | Interconnects |

## Quantity summary

- **1** microcontroller
- **5** relay channels (2 fan + 3 light)
- **1** current sensor
- **5** stand-in output indicators (3 LED + 2 motor/buzzer)
- **5** buttons + **5** pull-down resistors
- **1** heartbeat LED + **1** current-limiting resistor for it
- **3** current-limiting resistors for the light stand-in LEDs

## What this list deliberately excludes, and why

- **No real AC bulbs, real fans, or mains wiring.** Wokwi doesn't simulate mains AC loads — LEDs and small DC motors are the standard stand-ins for "light" and "fan" in a virtual circuit, and that's what the diagram uses. Building a *real* version later would swap these for actual relay-switched AC loads without changing the ESP32-side logic at all.
- **No WiFi credentials or backend network config.** Per the confirmed scope, this schematic is a documentation-only artifact (see `ARCHITECTURE.md` §3.4) — it demonstrates how the real-world data path *would* work, but the deployed demo's actual data source is the software simulator, not this hardware. So no networking components are needed here.
- **No per-device current sensors.** A single shared ACS712 is enough to demonstrate the sensing *concept*; wiring 5 separate current sensors would add cost and complexity to a schematic that's explicitly a concept artifact, not a production design.

## Pin usage cross-reference

See `ARCHITECTURE.md` §3.2 for the full pin mapping table and §3.3 for the electrical reasoning behind each choice (relay isolation, ACS712 Hall-effect sensing, debounce requirements, and the GPIO 2/15 strapping-pin caution). The two diagrams (`System_Architecture_Diagram.svg` and `Circuit_Wiring_Diagram.svg`) are the visual companions to this list.
