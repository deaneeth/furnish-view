# FurnishView — Room Designer

A JavaScript + Three.js furniture room visualizer with 2D canvas layout and 3D rendering for in-store design consultations.

**Module:** PUSL3122 HCI, Computer Graphics & Visualisation (2025-26)

---

## Features

- 🏠 Create room specifications with custom dimensions and colours
- 🪑 Place and arrange furniture in 2D top-down view
- 🎨 Apply colours to rooms and individual furniture pieces
- 🌐 View designs in interactive 3D with orbit controls
- 💾 Save, edit, and delete designs locally
- 📊 Compare multiple designs side-by-side

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/[username]/furnish-view.git
cd furnish-view
```

### 2. Open the app

Choose one of these methods:

**Option A — Direct Open**
Open `index.html` directly in Chrome, Firefox, or Edge.

**Option B — VS Code Live Server (Recommended)**
1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

**Option C — npx serve**
```bash
npx serve .
```

### 3. Login

Use these test credentials:

| Username | Password |
|----------|----------|
| `designer1` | `password123` |
| `designer2` | `password456` |

---

## Browser Requirements

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

> **Note:** WebGL support is required for 3D rendering. Most modern browsers support this by default.

---

## Project Structure

```
furnish-view/
├── index.html          # Application entry point
├── css/                # Stylesheets
├── js/                 # JavaScript source (MVC architecture)
│   ├── models/         # Data models (Room, Furniture, Design)
│   ├── views/          # UI rendering
│   ├── controllers/    # Event handling & logic
│   └── graphics/       # 2D Canvas & Three.js rendering
├── lib/                # Third-party libraries (Three.js)
├── assets/             # Icons, textures, sample data
└── docs/               # Documentation & report assets
```

---

## Credits

### Libraries
- **Three.js r160** — 3D rendering engine ([threejs.org](https://threejs.org/))
- **OrbitControls** — Camera controls for Three.js

### Icons
- UI icons from [Lucide](https://lucide.dev/) (MIT License)

### Team
- **Lead Developer:** [Team Member 1]
- **Design & Documentation:** [Team Member 2]
- **Testing & Evaluation:** [Team Member 3]

---

## License

This project is created for academic purposes as part of PUSL3122 coursework.
