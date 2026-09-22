# WorkWyse brand assets — Signal Path

Wordmark is converted to outlines, so no font install is needed to use the logo.
(Font for UI text, if you want it to match: Space Grotesk 600, free on Google Fonts.)

Colours: Black #000000 · White #FFFFFF · optional Navy #0B1530 + Blue #3B5BFF (ring only).

## Folders
- svg/        Master vector files. Use these anywhere in your UI (navbar, splash, docs).
- png/        Raster lockups @2x, large symbol PNGs, favicon PNGs.
- web/        Drop into your site's public/ root.
- app-icons/  iOS and Android launcher icons.

## Website / web app
Copy everything in web/ into your public folder, then in <head>:

    <link rel="icon" href="/favicon.ico" sizes="48x48">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#000000">

favicon.svg switches to white automatically in dark-mode browser tabs.

In your navbar (React example):
    <img src="/lockup-black.svg" alt="WorkWyse" height="28" />
Use lockup-white.svg on dark backgrounds. Below ~24px tall, use the symbol alone.

## iOS (Xcode / Expo / Flutter)
Use app-icons/ios/AppIcon-1024.png as the single 1024px App Icon. It is a square
with no transparency — iOS rounds the corners itself. Xcode 14+ generates all other sizes.
Expo: "icon": "./AppIcon-1024.png" in app.json.

## Android
Adaptive icon: foreground = ic_launcher_foreground.png, background colour = #000000
(ic_launcher_background.xml), monochrome = ic_launcher_monochrome.png (Android 13 themed icons).
Android Studio: File > New > Image Asset, pick the foreground PNG, set background colour #000000.
Expo: "adaptiveIcon": { "foregroundImage": "./ic_launcher_foreground.png", "backgroundColor": "#000000" }.
Play Store listing icon: play-store-512.png.

## Rules
- Keep clear space around the logo equal to the ring's diameter.
- Don't recolour the W; only the ring may take the blue.
- Small sizes (app icons, favicons) use the simplified mark without grid dots — that's intentional.
