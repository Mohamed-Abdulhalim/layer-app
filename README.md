<div align="center">

<img src="assets/icon.png" width="120" alt="Layer app icon" />

# Layer

**Heavier or lighter than yesterday? One glance.**

A tiny Android weather app that answers the only question I actually ask a weather app every morning.

[![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white)](https://github.com/Mohamed-Abdulhalim/layer-app/releases/latest/download/layer.apk)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Open-Meteo](https://img.shields.io/badge/Data-Open--Meteo-F2A65A)](https://open-meteo.com)
[![Build APK](https://github.com/Mohamed-Abdulhalim/layer-app/actions/workflows/android.yml/badge.svg)](https://github.com/Mohamed-Abdulhalim/layer-app/actions/workflows/android.yml)

[**Download the APK**](https://github.com/Mohamed-Abdulhalim/layer-app/releases/latest/download/layer.apk)

</div>

---

## 👋 Why I built this

Winter is coming to Cairo, and every day I have the same tiny decision: do I wear something heavier than yesterday, or not?

Every weather app I tried got in the way. Some guessed my location wrong and showed me a different part of the city. The rest gave me a wall of numbers (highs, lows, 10-day charts) but never a straight answer. A forecast high of 26° tells me nothing if I'm out at 8 am and the wind is blowing.

So I built Layer. It knows exactly where home is, compares the hours I'm actually outside, and tells me in plain words: **colder, same, or warmer.**

## ✨ What it does

### 🌗 Today and Tomorrow
Two views, one question each:

- **Today:** today compared with yesterday, for when I check in the morning before heading out
- **Tomorrow:** tomorrow compared with today, for when I check the night before

It opens on whichever one makes sense for the time of day.

### 🧥 A real verdict
Not a temperature. An answer:

| Change in feels-like | Layer says |
|---|---|
| 5° or more colder | **Much colder.** Wear heavier clothes |
| 2° to 5° colder | **A bit colder.** Add a light layer |
| Within 2° | **Same as yesterday.** Dress like yesterday |
| 2° to 5° warmer | **A bit warmer.** Go one layer lighter |
| 5° or more warmer | **Much warmer.** Dress noticeably lighter |

### 🕗 Only the hours that matter
Layer compares the average **feels-like** temperature (which accounts for wind and humidity) across the hours I'm actually outside. Morning, daytime, afternoon, evening, or all day, picked from a dropdown. A hot 3 pm can't hide a cold commute anymore.

### 📍 Home, exactly
Open it once at home and it saves that exact spot. No city guessing, no constant location tracking. Background location is blocked in the app's permissions entirely.

### 🌦️ The extras
- A clothing guide for the actual temperature (light jacket, proper coat, and so on)
- Rain and wind warnings when they matter
- An hour-by-hour strip showing how each hour compares with the same hour yesterday
- An optional evening alert with tomorrow's verdict (best effort, since some phones' battery savers love to skip background tasks)

## 📲 Install it

1. On your Android phone, open **[layer.apk](https://github.com/Mohamed-Abdulhalim/layer-app/releases/latest/download/layer.apk)**
2. If Android asks, allow your browser to install unknown apps
3. Tap **Install**
4. Open it **while you're at home** and tap **Set this spot as home**

That's it. New versions install over the old one.

## 🛠️ Built with

| | |
|---|---|
| **App** | React Native + Expo SDK 58, TypeScript |
| **Forecast** | [Open-Meteo](https://open-meteo.com): free, no API key, exact coordinates |
| **Location** | `expo-location`, used once, foreground only |
| **Storage** | `expo-sqlite` key-value store, forecast cached for offline viewing |
| **Evening alert** | `expo-background-task` + `expo-notifications` |
| **Design** | Instrument Serif + Manrope, colors that shift cool or warm with the verdict |
| **Builds** | GitHub Actions compiles a release APK on every push |

## 🧑‍💻 Run it yourself

```bash
git clone https://github.com/Mohamed-Abdulhalim/layer-app.git
cd layer-app
npm install
npx expo start
```

To build an APK locally (needs the Android SDK and Java 17):

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Or just push to `main`. The workflow in [`.github/workflows/android.yml`](.github/workflows/android.yml) builds the APK and publishes it to the [latest release](https://github.com/Mohamed-Abdulhalim/layer-app/releases/latest).

## 📁 Project layout

```
App.tsx          Setup, Today/Tomorrow views, settings, splash
index.ts         Registers the background task before the app starts
src/
  weather.ts     Forecast fetch, day summaries, verdict and clothing logic
  store.ts       Saved home, outside hours, alert time, cached forecast
  task.ts        Evening background check and notification
  theme.ts       Colors and fonts
  ui.tsx         Icons, dropdown sheets, small building blocks
```

## 🙌 Using it yourself

Built for my own mornings, but it works anywhere Open-Meteo has data, which is pretty much everywhere. Install it, set your home, and pick your outside hours. Issues and ideas are welcome.

---

<div align="center">

Made in Cairo by **Mohamed Abdulhalim** · [halim.pro](https://halim.pro)

<sub>MIT licensed. Use it, fork it, make it yours.</sub>

</div>
