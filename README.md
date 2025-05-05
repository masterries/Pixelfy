# Pixelfy

Pixelfy ist ein Tool zur Umwandlung normaler Bilder in Pixelkunst direkt im Browser. Diese Webanwendung nutzt HTML5 Canvas, um verschiedene Pixel-Art-Effekte auf hochgeladene Bilder anzuwenden.

## Features

- Unterstützt verschiedene Pixelierungsmethoden: Standard, Bilinear, Bicubic, Lanczos, Dithered und Posterized
- Anpassbare Pixel-Größe für unterschiedliche Pixelierungs-Intensität
- Einstellbare Ausgabegröße (Standard: 64x64 Pixel)
- Sofortige Vorschau der Pixelierungseffekte
- Download der bearbeiteten Bilder als PNG

## Wie es funktioniert

Diese Webanwendung führt alle Bildverarbeitungsschritte direkt im Browser durch:

1. Der Benutzer wählt ein Bild zum Hochladen aus
2. Nach der Auswahl der Pixelierungsmethode und Parameter wird das Bild zur Bearbeitung an die Canvas-API übergeben
3. Der JavaScript-Code wendet die gewählte Pixelierungsmethode an
4. Das bearbeitete Bild wird angezeigt und kann heruntergeladen werden

Im Gegensatz zur ursprünglichen Python-Version werden alle Berechnungen im Browser durchgeführt, was das Hosten auf GitHub Pages ermöglicht, ohne dass ein Server erforderlich ist.

## Pixelierungsmethoden

- **Standard**: Verwendet Nearest-Neighbor sowohl zum Verkleinern als auch zum Vergrößern des Bildes für einen klassischen Pixeleffekt
- **Bilinear**: Nutzt bilineare Interpolation beim Verkleinern für weichere Übergänge
- **Dithered**: Wendet ein Dithering-Muster auf das Bild an, um den Eindruck einer größeren Farbpalette zu erwecken
- **Posterized**: Reduziert die Farbpalette stark für einen stilisierten Look

Hinweis: Aufgrund der Einschränkungen der Canvas-API werden Bicubic und Lanczos durch bilineare Interpolation simuliert.

## Lokale Entwicklung

Um die Anwendung lokal auszuführen, öffne einfach die `index.html`-Datei in deinem Browser.