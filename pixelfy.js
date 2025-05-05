/**
 * Pixelfy.js - Client-side image pixelation library
 * Eine JavaScript-Version der pixelfy.py-Funktionen für GitHub Pages
 * Mit Cache, Historie und Standard-Katzenbild
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elemente
    const fileInput = document.getElementById('file');
    const previewContainer = document.getElementById('preview');
    const pixelSizeSlider = document.getElementById('pixelSize');
    const pixelSizeValue = document.getElementById('pixelSizeValue');
    const methodSelect = document.getElementById('method');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const processBtn = document.getElementById('processBtn');
    const outputArea = document.getElementById('outputArea');
    const resultContainer = document.getElementById('result');
    const downloadBtn = document.getElementById('downloadBtn');
    const newImageBtn = document.getElementById('newImageBtn');
    const alertContainer = document.getElementById('alertContainer');
    const defaultImageBtn = document.getElementById('defaultImageBtn');
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    
    // Neue Elemente für die Hintergrundentfernung
    const removeBgBtn = document.getElementById('removeBgBtn');
    const colorPickerBtn = document.getElementById('colorPickerBtn');
    const toleranceSlider = document.getElementById('tolerance');
    const toleranceValue = document.getElementById('toleranceValue');
    
    // Neue Elemente für die KI-basierte Hintergrundentfernung
    const aiRemoveBgBtn = document.getElementById('aiRemoveBgBtn');
    const aiStatus = document.getElementById('aiStatus');
    const aiSpinner = document.getElementById('aiSpinner');
    const segmentThreshold = document.getElementById('segmentThreshold');
    const segmentThresholdValue = document.getElementById('segmentThresholdValue');
    
    // Canvas Elemente für die Bildverarbeitung
    const sourceCanvas = document.getElementById('sourceCanvas');
    const pixelCanvas = document.getElementById('pixelCanvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    const pixelCtx = pixelCanvas.getContext('2d');
    
    // Aktuelles Bild und Verarbeitungsergebnis
    let currentImage = null;
    let processedImageURL = null;
    
    // Variablen für die Hintergrundentfernung
    let selectedColor = null;
    let isPickingColor = false;
    let imageWithTransparency = null;
    
    // TensorFlow.js und BodyPix
    let bodyPixNet = null;
    let isBodyPixLoaded = false;
    
    // Pfad zum Standard-Katzenbild (im Input-Ordner)
    const catImagePath = 'Input/example.png';
    
    // Cache für Bildverarbeitungsergebnisse
    const imageCache = {};
    
    // Historie der verarbeiteten Bilder
    let processHistory = [];
    
    // Konstanten
    const MAX_HISTORY_LENGTH = 20; // Maximal 20 Einträge in der Historie
    const HISTORY_STORAGE_KEY = 'pixelfy_history';
    
    // Initialisierung
    init();

    /**
     * Initialisierungsfunktion
     */
    function init() {
        // Lade die Historie aus dem LocalStorage
        loadHistory();
        
        // Aktualisiere die Historienanzeige
        updateHistoryUI();
        
        // Lade das Standard-Katzenbild
        defaultImageBtn.addEventListener('click', loadDefaultCatImage);
        
        // Lade das Katzenbild automatisch
        loadDefaultCatImage();
        
        // Event-Listener für die Hintergrundentfernung
        if (colorPickerBtn) {
            colorPickerBtn.addEventListener('click', startColorPicking);
        }
        
        if (removeBgBtn) {
            removeBgBtn.addEventListener('click', removeBackground);
        }
        
        if (toleranceSlider) {
            toleranceSlider.addEventListener('input', function() {
                toleranceValue.textContent = this.value;
            });
        }
        
        // Laden des BodyPix-Modells beim Start
        loadBodyPixModel();
        
        // Segment Threshold Slider aktualisieren
        if (segmentThreshold) {
            segmentThreshold.addEventListener('input', function() {
                segmentThresholdValue.textContent = this.value;
            });
        }
        
        // AI Hintergrundentfernung Button
        if (aiRemoveBgBtn) {
            aiRemoveBgBtn.addEventListener('click', removeBackgroundAI);
        }
    }
    
    /**
     * Lädt das Standard-Katzenbild
     */
    function loadDefaultCatImage() {
        // Erstelle ein neues Bild-Element
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Wichtig für CORS
        img.onload = function() {
            currentImage = img;
            displayPreviewImage(img);
            showAlert('Katzenbild geladen!', 'info');
        };
        img.onerror = function() {
            showAlert('Fehler beim Laden des Katzenbildes. Bitte lade ein eigenes Bild hoch.', 'warning');
        };
        
        // Lade das Bild
        img.src = catImagePath;
    }
    
    /**
     * Zeigt ein Bild in der Vorschau an
     */
    function displayPreviewImage(img) {
        previewContainer.innerHTML = '';
        const previewImg = document.createElement('img');
        previewImg.src = img.src;
        previewImg.classList.add('preview-img');
        previewContainer.appendChild(previewImg);
    }

    /**
     * Zeigt einen Alert an
     */
    function showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
    }

    /**
     * Speichert die Historie im LocalStorage
     */
    function saveHistory() {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(processHistory));
        } catch (e) {
            console.error('Fehler beim Speichern der Historie:', e);
        }
    }
    
    /**
     * Lädt die Historie aus dem LocalStorage
     */
    function loadHistory() {
        try {
            const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (savedHistory) {
                processHistory = JSON.parse(savedHistory);
            }
        } catch (e) {
            console.error('Fehler beim Laden der Historie:', e);
            processHistory = [];
        }
    }
    
    /**
     * Aktualisiert die Historienanzeige im UI
     */
    function updateHistoryUI() {
        historyList.innerHTML = '';
        
        if (processHistory.length === 0) {
            emptyHistory.style.display = 'block';
            return;
        }
        
        emptyHistory.style.display = 'none';
        
        // Zeige die Historie in umgekehrter Reihenfolge (neueste zuerst)
        for (let i = processHistory.length - 1; i >= 0; i--) {
            const historyItem = processHistory[i];
            
            const item = document.createElement('div');
            item.className = 'list-group-item history-item d-flex align-items-center';
            
            const img = document.createElement('img');
            img.src = historyItem.imageUrl;
            img.className = 'history-preview';
            
            const info = document.createElement('div');
            const date = new Date(historyItem.timestamp);
            info.innerHTML = `
                <div><strong>${historyItem.method}</strong> (${historyItem.pixelSize}px)</div>
                <small class="text-muted">${date.toLocaleString()}</small>
            `;
            
            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-sm btn-outline-primary ms-auto';
            loadBtn.textContent = 'Laden';
            loadBtn.addEventListener('click', function() {
                loadFromHistory(historyItem);
            });
            
            item.appendChild(img);
            item.appendChild(info);
            item.appendChild(loadBtn);
            historyList.appendChild(item);
        }
    }
    
    /**
     * Lädt ein Bild aus der Historie
     */
    function loadFromHistory(historyItem) {
        // Zeige das Bild in der Ergebnisanzeige
        resultContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = historyItem.imageUrl;
        img.classList.add('output-img');
        resultContainer.appendChild(img);
        
        // Aktualisiere die Steuerelemente
        methodSelect.value = historyItem.method;
        pixelSizeSlider.value = historyItem.pixelSize;
        pixelSizeValue.textContent = historyItem.pixelSize;
        widthInput.value = historyItem.width;
        heightInput.value = historyItem.height;
        
        // Zeige den Ergebnisbereich
        outputArea.style.display = 'block';
        
        // Aktualisiere die URL für den Download
        processedImageURL = historyItem.imageUrl;
        
        // Wechsle zum Erstellen-Tab
        document.getElementById('create-tab').click();
        
        // Scrolle zum Ergebnis
        outputArea.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Fügt ein verarbeitetes Bild zur Historie hinzu
     */
    function addToHistory(imageUrl, method, pixelSize, width, height) {
        const historyItem = {
            imageUrl: imageUrl,
            method: method,
            pixelSize: pixelSize,
            width: width,
            height: height,
            timestamp: new Date().getTime()
        };
        
        // Füge das Element zur Historie hinzu
        processHistory.push(historyItem);
        
        // Begrenze die Größe der Historie
        if (processHistory.length > MAX_HISTORY_LENGTH) {
            processHistory.shift(); // Entferne das älteste Element
        }
        
        // Speichere die Historie und aktualisiere die UI
        saveHistory();
        updateHistoryUI();
    }

    // Bildervorschau
    fileInput.addEventListener('change', function() {
        previewContainer.innerHTML = '';
        
        if (this.files && this.files[0]) {
            const img = document.createElement('img');
            img.classList.add('preview-img');
            img.src = URL.createObjectURL(this.files[0]);
            
            img.onload = function() {
                // Bild speichern für spätere Verarbeitung
                currentImage = img;
                previewContainer.appendChild(img);
            };
        }
    });

    // Pixel-Größe Slider aktualisieren
    pixelSizeSlider.addEventListener('input', function() {
        pixelSizeValue.textContent = this.value;
    });

    // Bild verarbeiten Button
    processBtn.addEventListener('click', function() {
        if (!currentImage) {
            showAlert('Bitte wähle zuerst ein Bild aus!', 'danger');
            return;
        }
        
        // Parameter auslesen
        const pixelSize = parseInt(pixelSizeSlider.value);
        const method = methodSelect.value;
        const outputWidth = parseInt(widthInput.value);
        const outputHeight = parseInt(heightInput.value);
        
        // Cache-Schlüssel erstellen
        const cacheKey = `${method}_${pixelSize}_${outputWidth}_${outputHeight}_${currentImage.src}`;
        
        try {
            // Prüfen, ob das Bild bereits im Cache ist
            if (imageCache[cacheKey]) {
                processedImageURL = imageCache[cacheKey];
                displayResult();
                showAlert('Bild aus Cache geladen!', 'success');
            } else {
                // Bild pixelieren
                pixelateImage(currentImage, method, pixelSize, outputWidth, outputHeight);
                
                // In Cache speichern
                imageCache[cacheKey] = processedImageURL;
                
                // Zur Historie hinzufügen
                addToHistory(processedImageURL, method, pixelSize, outputWidth, outputHeight);
            }
            
            // Ergebnisbereich anzeigen
            outputArea.style.display = 'block';
            
            // Nach unten scrollen
            outputArea.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            showAlert('Fehler bei der Bildverarbeitung: ' + error.message, 'danger');
        }
    });

    // Download-Button
    downloadBtn.addEventListener('click', function() {
        if (!processedImageURL) {
            showAlert('Kein verarbeitetes Bild vorhanden!', 'warning');
            return;
        }
        
        const a = document.createElement('a');
        a.href = processedImageURL;
        a.download = 'pixelfy_' + methodSelect.value + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Neues Bild Button
    newImageBtn.addEventListener('click', function() {
        outputArea.style.display = 'none';
        fileInput.value = '';
        previewContainer.innerHTML = '';
        resultContainer.innerHTML = '';
        processedImageURL = null;
    });

    /**
     * Startet den Farbauswahl-Modus
     */
    function startColorPicking() {
        if (!currentImage) {
            showAlert('Bitte wähle zuerst ein Bild aus!', 'danger');
            return;
        }
        
        isPickingColor = true;
        showAlert('Klicke auf die Farbe im Bild, die du transparent machen möchtest', 'info');
        
        // Erstelle eine klickbare Kopie des Bildes für die Farbauswahl
        const previewImg = previewContainer.querySelector('img');
        if (previewImg) {
            previewImg.style.cursor = 'crosshair';
            
            // Entferne vorherige Event-Listener
            previewImg.removeEventListener('click', handleColorPick);
            
            // Füge Event-Listener hinzu
            previewImg.addEventListener('click', handleColorPick);
        }
    }
    
    /**
     * Verarbeitet den Klick auf das Bild zur Farbauswahl
     */
    function handleColorPick(event) {
        if (!isPickingColor) return;
        
        // Erstelle einen temporären Canvas, um die Farbe am Klickpunkt zu ermitteln
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = currentImage.naturalWidth;
        tempCanvas.height = currentImage.naturalHeight;
        tempCtx.drawImage(currentImage, 0, 0);
        
        // Berechne die Koordinaten im Originalbild
        const rect = event.target.getBoundingClientRect();
        const scaleX = currentImage.naturalWidth / event.target.width;
        const scaleY = currentImage.naturalHeight / event.target.height;
        
        const x = Math.floor((event.clientX - rect.left) * scaleX);
        const y = Math.floor((event.clientY - rect.top) * scaleY);
        
        // Hole die Farbe an der Klickposition
        const pixel = tempCtx.getImageData(x, y, 1, 1).data;
        selectedColor = {
            r: pixel[0],
            g: pixel[1],
            b: pixel[2]
        };
        
        // UI-Feedback
        showAlert(`Farbe ausgewählt: RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`, 'success');
        event.target.style.cursor = 'default';
        isPickingColor = false;
        
        // Optional: Zeige die ausgewählte Farbe in einem Farbfeld an
        const colorPreview = document.getElementById('colorPreview');
        if (colorPreview) {
            colorPreview.style.backgroundColor = `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`;
            colorPreview.style.display = 'block';
        }
    }
    
    /**
     * Entfernt den Hintergrund basierend auf der ausgewählten Farbe
     */
    function removeBackground() {
        if (!currentImage) {
            showAlert('Bitte wähle zuerst ein Bild aus!', 'danger');
            return;
        }
        
        if (!selectedColor) {
            showAlert('Bitte wähle zuerst eine Hintergrundfarbe aus!', 'warning');
            return;
        }
        
        // Hole den Toleranzwert
        const tolerance = parseInt(toleranceSlider?.value || 30);
        
        // Erstelle Canvas für die Bearbeitung
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = currentImage.naturalWidth;
        tempCanvas.height = currentImage.naturalHeight;
        tempCtx.drawImage(currentImage, 0, 0);
        
        // Hole die Bilddaten
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Gehe jeden Pixel durch und setze ähnliche Farben auf transparent
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Berechne die Farbdistanz (einfache euklidische Distanz im RGB-Raum)
            const distance = Math.sqrt(
                Math.pow(r - selectedColor.r, 2) +
                Math.pow(g - selectedColor.g, 2) +
                Math.pow(b - selectedColor.b, 2)
            );
            
            // Wenn die Farbe ähnlich genug ist, setze sie transparent
            if (distance < tolerance) {
                // Vollständig transparent
                data[i + 3] = 0;
            } else if (distance < tolerance * 1.5) {
                // Teilweise transparent (weicher Übergang)
                const alpha = Math.round(255 * (1 - (distance - tolerance) / (tolerance * 0.5)));
                data[i + 3] = Math.max(0, Math.min(255, alpha));
            }
        }
        
        // Setze die Bilddaten zurück
        tempCtx.putImageData(imageData, 0, 0);
        
        // Erstelle ein neues Bild-Objekt mit Transparenz
        const img = new Image();
        img.onload = function() {
            // Speichere das transparente Bild
            imageWithTransparency = img;
            currentImage = img;
            
            // Aktualisiere die Vorschau
            displayPreviewImage(img);
            
            // Feedback
            showAlert('Hintergrund wurde entfernt! Du kannst das Bild jetzt pixelieren.', 'success');
        };
        
        // Setze das Bild auf die Canvas-Daten
        img.src = tempCanvas.toDataURL('image/png');
    }
    
    /**
     * Lädt das BodyPix-Modell
     */
    async function loadBodyPixModel() {
        try {
            if (typeof bodyPix !== 'undefined') {
                aiStatus.innerHTML = 'TensorFlow.js wird initialisiert...';
                aiStatus.className = 'alert alert-info';
                
                // Lade das BodyPix-Modell mit höherer Auflösung für bessere Ergebnisse
                bodyPixNet = await bodyPix.load({
                    architecture: 'MobileNetV1',
                    outputStride: 8, // Niedrigerer Wert für höhere Genauigkeit (8 statt 16)
                    multiplier: 1.0, // Höherer Wert für bessere Ergebnisse (1.0 statt 0.75)
                    quantBytes: 4    // Höhere Präzision (4 statt 2)
                });
                
                isBodyPixLoaded = true;
                
                // UI aktualisieren
                aiStatus.innerHTML = 'KI-Modell erfolgreich geladen! Die Objekterkennung ist bereit.';
                aiStatus.className = 'alert alert-success';
                aiRemoveBgBtn.disabled = false;
                aiSpinner.style.display = 'none';
                
            } else {
                throw new Error('BodyPix-Modell nicht verfügbar. Stellen Sie sicher, dass die CDN-Links korrekt eingebunden sind.');
            }
        } catch (error) {
            console.error('Fehler beim Laden des KI-Modells:', error);
            aiStatus.innerHTML = `Fehler beim Laden des KI-Modells: ${error.message}`;
            aiStatus.className = 'alert alert-danger';
        }
    }
    
    /**
     * Prüft, ob der Rand eines Bildes überwiegend transparent ist.
     * Nützlich, um festzustellen, ob der Hintergrund wahrscheinlich schon entfernt wurde.
     */
    function checkBorderTransparency(imageData, width, height) {
        const data = imageData.data;
        let transparentBorderPixels = 0;
        let totalBorderPixels = 0;

        if (width <= 1 || height <= 1) return false; // Kein sinnvoller Rand

        // Oberer und unterer Rand
        for (let x = 0; x < width; x++) {
            // Oben
            if (data[(0 * width + x) * 4 + 3] === 0) transparentBorderPixels++;
            // Unten
            if (data[((height - 1) * width + x) * 4 + 3] === 0) transparentBorderPixels++;
            totalBorderPixels += 2;
        }

        // Linker und rechter Rand (ohne Ecken, die schon gezählt wurden)
        for (let y = 1; y < height - 1; y++) {
            // Links
            if (data[(y * width + 0) * 4 + 3] === 0) transparentBorderPixels++;
            // Rechts
            if (data[(y * width + (width - 1)) * 4 + 3] === 0) transparentBorderPixels++;
            totalBorderPixels += 2;
        }

        if (totalBorderPixels === 0) return false; // Sollte nicht passieren bei width/height > 1

        const transparencyRatio = transparentBorderPixels / totalBorderPixels;
        console.log(`Border transparency ratio: ${transparencyRatio}`);
        // Wenn über 85% des Randes transparent sind, gehen wir davon aus, dass der Hintergrund fehlt.
        return transparencyRatio > 0.85;
    }

    /**
     * Prüft, ob eine generierte Maske brauchbar ist (d.h. nicht komplett leer oder voll).
     */
    function isMaskUsable(maskData) {
        if (!maskData) return false;
        let hasTransparent = false;
        let hasOpaque = false;
        // Prüfe nur den Alpha-Kanal (jeder 4. Wert)
        for (let i = 3; i < maskData.length; i += 4) {
            if (maskData[i] === 0) {
                hasTransparent = true;
            } else if (maskData[i] === 255) {
                hasOpaque = true;
            }
            // Wenn beides gefunden wurde, ist die Maske brauchbar
            if (hasTransparent && hasOpaque) {
                return true;
            }
        }
        // Wenn die Schleife durchläuft, ohne beides zu finden, ist die Maske nicht brauchbar
        return false;
    }

    /**
     * Entfernt den Hintergrund mit KI-basierter Segmentierung
     */
    async function removeBackgroundAI() {
        if (!isBodyPixLoaded) {
            showAlert('KI-Modell wird noch geladen. Bitte warten...', 'warning');
            return;
        }

        if (!currentImage) {
            showAlert('Bitte wähle zuerst ein Bild aus!', 'danger');
            return;
        }

        // --- NEUE PRÜFUNG --- 
        // Erstelle einen temporären Canvas, um die Transparenz zu prüfen
        const checkCanvas = document.createElement('canvas');
        const checkCtx = checkCanvas.getContext('2d');
        checkCanvas.width = currentImage.naturalWidth;
        checkCanvas.height = currentImage.naturalHeight;
        
        // Stelle sicher, dass das Bild vollständig geladen ist, bevor wir darauf zeichnen
        if (!currentImage.complete || currentImage.naturalWidth === 0) {
             showAlert('Bild wird noch geladen oder ist ungültig. Bitte warten.', 'warning');
             return;
        }
        
        checkCtx.drawImage(currentImage, 0, 0);
        try {
            const imageData = checkCtx.getImageData(0, 0, checkCanvas.width, checkCanvas.height);
            if (checkBorderTransparency(imageData, checkCanvas.width, checkCanvas.height)) {
                showAlert('Der Hintergrund scheint bereits transparent zu sein. Überspringe KI-Entfernung.', 'info');
                // Das aktuelle Bild ist bereits das gewünschte Ergebnis (mit Transparenz)
                imageWithTransparency = currentImage; 
                displayPreviewImage(currentImage); // Stelle sicher, dass die Vorschau aktuell ist
                // Setze UI zurück, falls es im Ladezustand war
                aiRemoveBgBtn.disabled = false;
                aiSpinner.style.display = 'none';
                aiStatus.innerHTML = 'Hintergrund bereits transparent.';
                aiStatus.className = 'alert alert-info';
                return; // Beende die Funktion hier
            }
        } catch (e) {
            // Fehler beim getImageData (z.B. CORS bei externen Bildern ohne crossOrigin="Anonymous")
            // Oder wenn das Bild noch nicht ganz bereit ist.
            console.warn("Konnte Transparenz nicht prüfen, fahre trotzdem mit KI fort.", e);
            // Zeige eine Warnung, aber fahre fort
             showAlert('Transparenzprüfung fehlgeschlagen, versuche trotzdem KI-Entfernung.', 'warning');
        }
        // --- ENDE NEUE PRÜFUNG ---

        try {
            // UI aktualisieren für den Start der Verarbeitung
            aiRemoveBgBtn.disabled = true;
            aiSpinner.style.display = 'inline-block';
            aiStatus.innerHTML = 'Objekt wird erkannt...';
            aiStatus.className = 'alert alert-info';

            // Schwellenwert für die Segmentierung
            const threshold = parseFloat(segmentThreshold.value);

            // Erstelle einen temporären Canvas mit dem Bild für die KI
            // Wichtig: Verwende das *originale* currentImage, nicht checkCanvas
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = currentImage.naturalWidth;
            tempCanvas.height = currentImage.naturalHeight;
            tempCtx.drawImage(currentImage, 0, 0);

            // Versuche verschiedene Methoden zur Objekterkennung
            let segmentation = null;
            let maskData = null;

            // 1. Versuch: Multi-Person-Segmentierung (kann manchmal auch Tiere erkennen)
            try {
                segmentation = await bodyPixNet.segmentMultiPerson(tempCanvas, {
                    flipHorizontal: false,
                    internalResolution: 'high',
                    segmentationThreshold: threshold * 0.7, // Niedrigerer Schwellenwert für bessere Erkennung
                    maxDetections: 5,
                    scoreThreshold: 0.2, // Niedrigerer Schwellenwert für bessere Erkennung
                    nmsRadius: 20,
                });

                if (segmentation && segmentation.length > 0) {
                    // Erstelle eine kombinierte Maske aus allen erkannten Personen/Objekten
                    const combinedMask = bodyPix.toMask(segmentation,
                        { r: 0, g: 0, b: 0, a: 0 },  // Hintergrund (transparent)
                        { r: 255, g: 255, b: 255, a: 255 } // Vordergrund (undurchsichtig)
                    );
                    maskData = combinedMask.data;
                }
            } catch (e) {
                console.warn("Multi-Person-Segmentierung fehlgeschlagen, versuche Einzelperson", e);
            }

            // 2. Versuch: Einzelperson-Segmentierung wenn die Multi-Erkennung fehlschlägt
            // Prüfe auch, ob die erste Maske überhaupt brauchbar war
            if (!maskData || !isMaskUsable(maskData)) {
                 console.log("Multi-Person-Maske nicht brauchbar oder fehlgeschlagen, versuche Einzelperson.");
                try {
                    segmentation = await bodyPixNet.segmentPerson(tempCanvas, {
                        flipHorizontal: false,
                        internalResolution: 'high',
                        segmentationThreshold: threshold * 0.8,
                        maxDetections: 1
                    });

                    if (segmentation) {
                        const mask = bodyPix.toMask(
                            segmentation,
                            { r: 0, g: 0, b: 0, a: 0 },
                            { r: 255, g: 255, b: 255, a: 255 }
                        );
                        maskData = mask.data;
                    }
                } catch (e) {
                    console.warn("Einzelperson-Segmentierung fehlgeschlagen", e);
                }
            }

            // 3. Fallback: Wenn die KI-Segmentierung keine Ergebnisse liefert, verwende automatische Hintergrundsegmentierung
            if (!maskData || !isMaskUsable(maskData)) {
                console.log("Keine brauchbaren Objekte mit KI erkannt, verwende automatische Hintergrundsegmentierung");

                // Automatische Hintergrunderkennung: Analysiere Kanten und Farben
                // Wichtig: Nimm die Originaldaten vom tempCanvas, nicht vom checkCanvas
                const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const automaskResult = createAutomaticMask(originalImageData, tempCanvas.width, tempCanvas.height);
                maskData = automaskResult.data;

                showAlert('KI-Erkennung fehlgeschlagen oder unbrauchbar. Automatische Objekterkennung wurde verwendet.', 'warning');
            }

            // Bilde mit Transparenz erstellen (basierend auf der ermittelten maskData)
            const finalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const imgData = finalImageData.data;

            // Für jeden Pixel:
            for (let i = 0; i < imgData.length; i += 4) {
                // Alpha-Kanal aus der Maske setzen
                // Stelle sicher, dass maskData existiert und die richtige Länge hat
                if (maskData && maskData.length === imgData.length) {
                     imgData[i + 3] = maskData[i + 3];
                } else if (maskData) {
                    // Fallback, falls maskData eine unerwartete Struktur hat (sollte nicht passieren)
                    console.error("MaskData hat unerwartete Länge!");
                    imgData[i + 3] = 255; // Mache Pixel undurchsichtig als sicherer Fallback
                } else {
                     // Sollte auch nicht passieren, da wir oben einen Fallback haben
                     console.error("Keine MaskData vorhanden nach allen Versuchen!");
                     imgData[i + 3] = 255;
                }
            }

            // Bilde mit Transparenz zurück zum Canvas
            tempCtx.putImageData(finalImageData, 0, 0);

            // Erstelle ein neues Bild mit Transparenz
            const transparentImg = new Image();
            transparentImg.onload = function() {
                // Aktualisiere das aktuelle Bild
                currentImage = transparentImg;
                imageWithTransparency = transparentImg;

                // Aktualisiere die Vorschau
                displayPreviewImage(transparentImg);

                // UI aktualisieren
                aiRemoveBgBtn.disabled = false;
                aiSpinner.style.display = 'none';
                aiStatus.innerHTML = 'Hintergrund erfolgreich entfernt! Du kannst das Bild jetzt pixelieren.';
                aiStatus.className = 'alert alert-success';

                // Feedback
                showAlert('Objekterkennung abgeschlossen! Hintergrund wurde entfernt.', 'success');
            };
            transparentImg.onerror = function() {
                 showAlert('Fehler beim Erstellen des transparenten Bildes.', 'danger');
                 aiRemoveBgBtn.disabled = false;
                 aiSpinner.style.display = 'none';
            };

            // Setze das Bild auf die Canvas-Daten (als PNG mit Transparenz)
            transparentImg.src = tempCanvas.toDataURL('image/png');

        } catch (error) {
            console.error('Fehler bei der KI-Segmentierung:', error);
            aiRemoveBgBtn.disabled = false;
            aiSpinner.style.display = 'none';
            aiStatus.innerHTML = `Fehler bei der Objekterkennung: ${error.message}`;
            aiStatus.className = 'alert alert-danger';
            showAlert('Fehler bei der Objekterkennung: ' + error.message, 'danger');
        }
    }
    
    /**
     * Bild mit der gewählten Methode pixelieren
     */
    function pixelateImage(image, method, pixelSize, outputWidth, outputHeight) {
        // Quell-Canvas Größe anpassen
        sourceCanvas.width = image.naturalWidth;
        sourceCanvas.height = image.naturalHeight;
        
        // Ausgabe-Canvas Größe anpassen
        pixelCanvas.width = outputWidth;
        pixelCanvas.height = outputHeight;
        
        // Bild auf Quell-Canvas zeichnen
        sourceCtx.drawImage(image, 0, 0);
        
        // Je nach Methode verarbeiten
        switch (method) {
            case 'standard':
                pixelateStandard(pixelSize, outputWidth, outputHeight);
                break;
            case 'bilinear':
                pixelateBilinear(pixelSize, outputWidth, outputHeight);
                break;
            case 'bicubic':
                // Bicubic ist in Canvas nicht direkt verfügbar, wir verwenden eine Annäherung
                pixelateBilinear(pixelSize, outputWidth, outputHeight);
                break;
            case 'lanczos':
                // Lanczos ist in Canvas nicht verfügbar, wir verwenden eine Annäherung
                pixelateBilinear(pixelSize, outputWidth, outputHeight);
                break;
            case 'dithered':
                pixelateDithered(pixelSize, outputWidth, outputHeight);
                break;
            case 'posterized':
                pixelatePosterized(pixelSize, outputWidth, outputHeight);
                break;
            case 'nearest-neighbor':
                pixelateNearestNeighbor(pixelSize, outputWidth, outputHeight);
                break;
            case 'mosaic':
                pixelateMosaic(pixelSize, outputWidth, outputHeight);
                break;
            default:
                pixelateStandard(pixelSize, outputWidth, outputHeight);
        }
        
        // Ergebnis anzeigen
        displayResult();
    }

    /**
     * Standard-Pixelierung mit nearest-neighbor
     */
    function pixelateStandard(pixelSize, outputWidth, outputHeight) {
        // Berechnete Zwischengröße
        const smallWidth = Math.max(1, Math.floor(sourceCanvas.width / pixelSize));
        const smallHeight = Math.max(1, Math.floor(sourceCanvas.height / pixelSize));
        
        // Temporäres Canvas für die Verkleinerung
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = smallWidth;
        tempCanvas.height = smallHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Bildqualität auf niedrigste Stufe setzen für nearest-neighbor (pixeliert)
        tempCtx.imageSmoothingEnabled = false;
        pixelCtx.imageSmoothingEnabled = false;
        
        // Verkleinern
        tempCtx.drawImage(sourceCanvas, 0, 0, smallWidth, smallHeight);
        
        // Auf Zielgröße skalieren
        pixelCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
    }

    /**
     * Bilinear-Pixelierung (smoothed downscale, pixelated upscale)
     */
    function pixelateBilinear(pixelSize, outputWidth, outputHeight) {
        // Berechnete Zwischengröße
        const smallWidth = Math.max(1, Math.floor(sourceCanvas.width / pixelSize));
        const smallHeight = Math.max(1, Math.floor(sourceCanvas.height / pixelSize));
        
        // Temporäres Canvas für die Verkleinerung
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = smallWidth;
        tempCanvas.height = smallHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Für Verkleinerung smoother Algorithmus
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        
        // Für Vergrößerung pixelierter Algorithmus
        pixelCtx.imageSmoothingEnabled = false;
        
        // Verkleinern mit Glättung
        tempCtx.drawImage(sourceCanvas, 0, 0, smallWidth, smallHeight);
        
        // Auf Zielgröße skalieren ohne Glättung
        pixelCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
    }

    /**
     * Dithering-Pixelierung (Farbreduzierung mit Verteilung des Fehlers)
     */
    function pixelateDithered(pixelSize, outputWidth, outputHeight) {
        // Zuerst Standard-Pixelierung
        pixelateStandard(pixelSize, outputWidth, outputHeight);
        
        // Dann Dithering anwenden (reduziert Farben und fügt Rauschen hinzu)
        const imageData = pixelCtx.getImageData(0, 0, outputWidth, outputHeight);
        const data = imageData.data;
        
        // Einfaches Dithering durch Schwellenwert
        for (let y = 0; y < outputHeight; y++) {
            for (let x = 0; x < outputWidth; x++) {
                const i = (y * outputWidth + x) * 4;
                
                // RGB-Werte durch Schwellenwert teilen
                const r = Math.round(data[i] / 64) * 64;
                const g = Math.round(data[i + 1] / 64) * 64;
                const b = Math.round(data[i + 2] / 64) * 64;
                
                // Dithering-Muster hinzufügen
                const dither = ((x % 4) === (y % 4)) ? 16 : 0;
                
                data[i] = Math.min(255, r + dither);
                data[i + 1] = Math.min(255, g + dither);
                data[i + 2] = Math.min(255, b + dither);
            }
        }
        
        pixelCtx.putImageData(imageData, 0, 0);
    }

    /**
     * Posterized-Pixelierung (stark reduzierte Farbpalette)
     */
    function pixelatePosterized(pixelSize, outputWidth, outputHeight) {
        // Zuerst Standard-Pixelierung
        pixelateStandard(pixelSize, outputWidth, outputHeight);
        
        // Dann Posterisierung anwenden (reduzierte Farbpalette)
        const imageData = pixelCtx.getImageData(0, 0, outputWidth, outputHeight);
        const data = imageData.data;
        const levels = 5; // Anzahl der Farblevel pro Kanal
        const step = 255 / (levels - 1);
        
        for (let i = 0; i < data.length; i += 4) {
            // Reduziere die Farbtiefe für jeden Kanal
            data[i] = Math.round(Math.round(data[i] / step) * step);
            data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
            data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
        }
        
        pixelCtx.putImageData(imageData, 0, 0);
    }

    /**
     * Nearest-Neighbor-Pixelierung (explizitere Version als Standard)
     * Diese Version stellt sicher, dass wirklich jedes Pixel in der reduzierten Größe 
     * genau einem Pixel im Originalbildbereich entspricht
     */
    function pixelateNearestNeighbor(pixelSize, outputWidth, outputHeight) {
        // Berechne die Zwischengröße basierend auf der Pixel-Größe
        const smallWidth = Math.max(1, Math.floor(sourceCanvas.width / pixelSize));
        const smallHeight = Math.max(1, Math.floor(sourceCanvas.height / pixelSize));
        
        // Erstelle ein Zwischenbild mit der reduzierten Größe
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = smallWidth;
        tempCanvas.height = smallHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Hole die Pixelwerte des Quellbildes
        const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const targetData = tempCtx.createImageData(smallWidth, smallHeight);
        
        // Manuelles Nearest-Neighbor-Sampling
        for (let y = 0; y < smallHeight; y++) {
            for (let x = 0; x < smallWidth; x++) {
                // Berechne die entsprechende Position im Quellbild
                const sourceX = Math.min(Math.floor(x * pixelSize), sourceCanvas.width - 1);
                const sourceY = Math.min(Math.floor(y * pixelSize), sourceCanvas.height - 1);
                
                // Hole den Pixelwert vom Quellbild
                const sourceIndex = (sourceY * sourceCanvas.width + sourceX) * 4;
                const targetIndex = (y * smallWidth + x) * 4;
                
                targetData.data[targetIndex] = sourceData.data[sourceIndex];         // R
                targetData.data[targetIndex + 1] = sourceData.data[sourceIndex + 1]; // G
                targetData.data[targetIndex + 2] = sourceData.data[sourceIndex + 2]; // B
                targetData.data[targetIndex + 3] = sourceData.data[sourceIndex + 3]; // A
            }
        }
        
        // Setze die Pixelwerte im Zwischenbild
        tempCtx.putImageData(targetData, 0, 0);
        
        // Für die Vergrößerung verwenden wir nearest-neighbor
        pixelCtx.imageSmoothingEnabled = false;
        
        // Skaliere das Zwischenbild auf die Ausgabegröße
        pixelCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
    }

    /**
     * Mosaik-Filter
     * Erstellt einen Mosaik-Effekt, indem es das Bild in größere, gleichmäßige Blöcke unterteilt
     * und jeden Block mit der Durchschnittsfarbe füllt
     */
    function pixelateMosaic(pixelSize, outputWidth, outputHeight) {
        // Berechne die Blockgröße im Originalbild
        const blockWidth = Math.max(2, Math.floor(sourceCanvas.width / (outputWidth / pixelSize)));
        const blockHeight = Math.max(2, Math.floor(sourceCanvas.height / (outputHeight / pixelSize)));
        
        // Hole die Pixelwerte des Quellbildes
        const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        
        // Bereite den Ausgabe-Canvas vor
        pixelCtx.clearRect(0, 0, outputWidth, outputHeight);
        
        // Skalierungsfaktoren
        const scaleX = outputWidth / sourceCanvas.width;
        const scaleY = outputHeight / sourceCanvas.height;
        
        // Iteriere über die Blöcke
        for (let y = 0; y < sourceCanvas.height; y += blockHeight) {
            for (let x = 0; x < sourceCanvas.width; x += blockWidth) {
                // Berechne die tatsächliche Blockgröße (falls der Block am Rand kleiner ist)
                const actualBlockWidth = Math.min(blockWidth, sourceCanvas.width - x);
                const actualBlockHeight = Math.min(blockHeight, sourceCanvas.height - y);
                
                // Berechne die Durchschnittsfarbe für den Block
                let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
                let count = 0;
                
                for (let by = 0; by < actualBlockHeight; by++) {
                    for (let bx = 0; bx < actualBlockWidth; bx++) {
                        const sourceX = x + bx;
                        const sourceY = y + by;
                        const sourceIndex = (sourceY * sourceCanvas.width + sourceX) * 4;
                        
                        totalR += sourceData.data[sourceIndex];
                        totalG += sourceData.data[sourceIndex + 1];
                        totalB += sourceData.data[sourceIndex + 2];
                        totalA += sourceData.data[sourceIndex + 3];
                        count++;
                    }
                }
                
                // Durchschnitt berechnen
                const avgR = Math.round(totalR / count);
                const avgG = Math.round(totalG / count);
                const avgB = Math.round(totalB / count);
                const avgA = Math.round(totalA / count);
                
                // Zeichne den Block mit der Durchschnittsfarbe
                pixelCtx.fillStyle = `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA / 255})`;
                pixelCtx.fillRect(
                    Math.round(x * scaleX), 
                    Math.round(y * scaleY), 
                    Math.ceil(actualBlockWidth * scaleX), 
                    Math.ceil(actualBlockHeight * scaleY)
                );
            }
        }
    }

    /**
     * Zeigt das Ergebnis im Container an
     */
    function displayResult() {
        // Bild-URL für die Anzeige und den Download
        processedImageURL = pixelCanvas.toDataURL('image/png');
        
        // Ergebnisbild anzeigen
        resultContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = processedImageURL;
        img.classList.add('output-img');
        resultContainer.appendChild(img);
    }
});