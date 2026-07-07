# 🎯 ESP32 Smart Archery Game

### A Real-Time IoT-Based Archery Scoring System using ESP32, IR Sensors, Firebase, and a Responsive Web Dashboard

<!-- 🖼️ Custom banner goes here -->

![ESP32](https://img.shields.io/badge/ESP32-IoT-blue?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML-5-red?style=for-the-badge)
![CSS3](https://img.shields.io/badge/CSS-3-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📖 Overview

The **ESP32 Smart Archery Game** is a real-time IoT-based scoring system that automates hit detection for archery practice using an ESP32 microcontroller, an IR sensor grid, Firebase Realtime Database, and a responsive web dashboard.

Instead of manual scoring, the system detects arrow impacts on the target, pushes hit data to the cloud instantly, and reflects the updated score on a live dashboard — combining embedded systems, cloud integration, and modern web development into a single end-to-end project.


---

## ✨ Features

- 🎯 Real-time arrow hit detection
- 📡 ESP32 Wi-Fi communication
- 🔥 Firebase Realtime Database integration
- ⚡ Instant score updates
- 📊 Live web dashboard
- 🏹 Automatic score calculation
- 📱 Responsive user interface
- 🌐 Cloud-connected architecture
- 🏆 Live leaderboard 
- 🔓 Multi-level gameplay with score-based unlocking 

---

## 🏗️ System Flow

```text
             Arrow Hits Target
                     │
                     ▼
              IR Sensor Trigger
                     │
                     ▼
                 ESP32 Board
                     │
                  Wi-Fi
                     │
                     ▼
        Firebase Realtime Database
                     │
                     ▼
        Responsive Web Dashboard
                     │
                     ▼
           Live Score Update
```



---

## 🛠️ Hardware Components

| Component | Purpose |
|---|---|
| ESP32 | Main microcontroller — reads sensors, connects to Wi-Fi, pushes data |
| IR Sensor  | Detects arrow impact location on the target |
| Wi-Fi | Wireless link between ESP32 and Firebase |

---

## 💻 Software Stack

**Frontend**
- HTML5
- CSS3
- JavaScript (ES6)

**Backend & Cloud**
- Firebase Realtime Database

**Embedded**
- ESP32
- Arduino IDE

**Communication**
- Wi-Fi
- WebSockets

---

## 📂 Project Structure


```text
esp32-smart-archery-game/

│── firmware/
│── web/
│── docs/
│── images/
│── assets/
│── README.md
│── LICENSE
```


---




## 🚀 How It Works

1. The player enters their name and starts the game.
2. The ESP32 continuously monitors the IR sensors mounted behind the target.
3. When an arrow interrupts an IR beam, the ESP32 detects the hit.
4. The hit event is transmitted through WebSocket communication.
5. The web application processes the event and updates the player's score.
6. Scores are stored in Firebase Realtime Database.
7. The leaderboard updates instantly for all connected users.
8. Players unlock Level 2 by achieving the required score in Level 1.


---

## 📸 Screenshots

<!-- Add real screenshots once available -->

### Dashboard
`images/dashboard.png`

### Hardware Setup
`images/hardware.jpg`

---
## ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/mssrishtisharmaa/esp32-smart-archery-game.git
```

Navigate to the project

```bash
cd esp32-smart-archery-game
```

Open

```
web/index.html
```

Upload the firmware to ESP32 using Arduino IDE.

Configure your Firebase project and Wi-Fi credentials before running.



## 📊 Results

- Real-time score updates
- Multi-level gameplay
- Firebase leaderboard synchronization
- Smooth UI animations
- Interactive audio feedback
- Responsive design

---

## 🔮 Future Improvements

- Player login and multi-user support
- Live leaderboard across sessions
-  Multi-level gameplay with score-based unlocking
-  Mobile app companion
- OTA firmware updates
- Performance analytics dashboard

---

## 👩‍💻 Author

**Srishti Sharma**
Computer Science Engineering Student

- GitHub: [@mssrishtisharmaa](https://github.com/mssrishtisharmaa)
- LinkedIn: [srishti sharmaa](https://www.linkedin.com/in/ms-srishti-sharma/)

---
