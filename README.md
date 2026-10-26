# Het Fossielenspoor

## Korte uitleg over het project

**Het Fossielenspoor** is een interactieve installatie voor **Kina, museum voor kind en natuur in Gent**. De installatie is gemaakt rond fossielen en laat kinderen op een speelse manier fossielen ontdekken.

Bezoekers kunnen fysieke fossielen scannen via een RFID-scanner. Wanneer een fossiel gescand wordt, toont het scherm informatie over dat fossiel, zoals de naam, periode, leeftijd, beschrijving en afbeeldingen. Daarnaast wordt er audio afgespeeld en geeft de installatie feedback met LED-verlichting.

De installatie houdt bij welke fossielen al gevonden zijn. Wanneer alle fossielen gescand zijn, verschijnt er een eindscherm met een felicitatie. Via het adminpanel kunnen de fossielen, afbeeldingen, audio, RFID-tags en eindscherminstellingen aangepast worden zonder de code te wijzigen.

De installatie draait lokaal op een Raspberry Pi en kan offline gebruikt worden.

---

## Belangrijkste functionaliteiten

- RFID-scans herkennen per fossiel
- Informatiescherm per fossiel
- Afbeeldingen per fossiel
- Automatische slideshow van afbeeldingen
- Audio per fossiel
- LED-feedback per gevonden fossiel
- Automatisch eindscherm wanneer alle fossielen gevonden zijn
- Adminpanel om inhoud aan te passen
- Uploaden van afbeeldingen en audio
- RFID-tags koppelen via het adminpanel
- Testknoppen voor het eindscherm
- Resetknop voor de volledige flow
- Kioskmodus voor gebruik op de Raspberry Pi
- Offline werking via lokale server

---

## Gebruikte technologieën

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Node.js
- Express

### Hardware

- Raspberry Pi
- Touchscreen
- RC522 RFID-scanner
- ESP32
- LED-strip / LED-punten
- RFID-tags
- Fysieke fossielen

### Scripts

- Python-script voor RFID-scanner
- Python-script voor communicatie met ESP32
- Bash-script voor kioskmodus

---

## Benodigde dependencies

Installeer de npm dependencies met:

```bash
npm install
```

Belangrijkste npm packages:

```txt
react
react-dom
react-router-dom
vite
typescript
express
cors
multer
concurrently
```

Voor de hardware worden aparte Python-scripts gebruikt. Die staan in de map `scripts`.

---

## Installatie-instructies

Ga naar de projectmap:

```bash
cd ~/Desktop/fossil-scan
```

Installeer de dependencies:

```bash
npm install
```

Maak een production build:

```bash
npm run build
```

Start de server:

```bash
npm run start
```

De applicatie draait dan op:

```txt
http://127.0.0.1:3000
```

Als je vanaf een andere computer of gsm op hetzelfde netwerk wil verbinden, gebruik je het IP-adres van de Raspberry Pi:

```txt
http://<raspberry-pi-ip>:3000
```

Het adminpanel staat op:

```txt
http://<raspberry-pi-ip>:3000/admin
```

---

## Opstartinstructies

### Development starten

Tijdens het ontwikkelen gebruik ik:

```bash
npm run dev
```

Dit start tegelijk:

- de Express server
- de Vite development server

De frontend is dan bereikbaar via:

```txt
http://<raspberry-pi-ip>:5173
```

Het adminpanel in development:

```txt
http://<raspberry-pi-ip>:5173/admin
```

---

### Production starten

Voor de echte installatie gebruik ik de production versie:

```bash
npm run build
npm run start
```

De applicatie draait dan op:

```txt
http://127.0.0.1:3000
```

---

### Kioskmodus starten

Voor de installatie op het touchscreen gebruik ik kioskmodus:

```bash
npm run kiosk
```

Hierbij worden normaal de volgende onderdelen gestart:

- lokale Express server
- React production build
- RFID-reader
- ESP32 LED-bridge
- Chromium in fullscreen kioskmodus

De kiosk opent op:

```txt
http://127.0.0.1:3000
```

---

## Adminpanel

Het adminpanel is bereikbaar via:

```txt
/admin
```

Voorbeeld:

```txt
http://10.42.0.1:3000/admin
```

of via het IP-adres van de Raspberry Pi:

```txt
http://<raspberry-pi-ip>:3000/admin
```

In het adminpanel kan ik:

- fossielen aanpassen
- naam aanpassen
- periode aanpassen
- leeftijd aanpassen
- beschrijving aanpassen
- afbeeldingen uploaden
- audio uploaden
- RFID-tags koppelen
- LED-nummers instellen
- audio aan of uit zetten
- eindscherm aanpassen
- diploma-modus aan of uit zetten
- eindscherm testen
- scanflow resetten
- wijzigingen opslaan

---

## Flow van de installatie

De bezoeker ziet eerst een startscherm. De installatie wacht tot er een fossiel gescand wordt.

```txt
Startscherm
↓
Bezoeker scant een fossiel
↓
RFID-tag wordt gelezen
↓
De app zoekt het juiste fossiel
↓
Fossielinformatie verschijnt op het scherm
↓
Audio wordt afgespeeld
↓
LED van het fossiel gaat aan
↓
Bezoeker scant volgende fossielen
↓
Alle fossielen gevonden
↓
Eindscherm verschijnt
↓
Installatie reset automatisch
```

---

## Belangrijkste onderdelen van de code

### `src/pages/ScanPage.tsx`

Dit is de hoofdpagina van de installatie. Deze pagina bepaalt welk scherm getoond wordt:

- startscherm
- fossiel detailpagina
- onbekende tag melding
- eindscherm

De pagina gebruikt de hook `useScanFlow` om de scanlogica te beheren.

---

### `src/hooks/useScanFlow.ts`

Dit is de belangrijkste logica van de installatie.

Deze hook doet onder andere:

- fossieldata ophalen
- instellingen ophalen
- laatste RFID-scan controleren
- juiste fossiel zoeken bij een RFID-tag
- gevonden fossielen bijhouden
- controleren of alle fossielen gevonden zijn
- eindscherm starten
- automatisch resetten

---

### `src/components/FossilDisplay.tsx`

Dit component toont de informatie van één fossiel.

Het toont:

- afbeelding
- slideshow
- naam
- periode
- leeftijd
- beschrijving
- audio

Wanneer een fossiel gescand wordt, start de audio automatisch als audio ingeschakeld is.

---

### `src/components/CompletionScreen.tsx`

Dit component toont het eindscherm wanneer alle fossielen gevonden zijn.

Er zijn twee versies:

- eindscherm met diploma
- eindscherm zonder diploma

Welke versie gebruikt wordt, hangt af van de instelling in het adminpanel.

---

### `src/pages/AdminPage.tsx`

Dit is het adminpanel. Hier kan de inhoud van de installatie aangepast worden zonder code te wijzigen.

In dit bestand zitten de formulieren en knoppen om fossielen, audio, afbeeldingen, RFID-tags en eindscherminstellingen te beheren.

---

### `server/server.cjs`

Dit is de backend van de installatie.

De server doet onder andere:

- fossieldata lezen
- fossieldata opslaan
- instellingen lezen
- instellingen opslaan
- uploads verwerken
- huidige RFID-scan bewaren
- scanflow resetten
- React build serveren

De server draait op poort `3000`.

---

### `scripts/rfid-reader.py`

Dit script leest de RFID-tags via de RFID-scanner. Wanneer een tag gescand wordt, stuurt het script de UID door naar de server.

---

### `scripts/esp32-led-bridge.py`

Dit script zorgt voor de communicatie met de ESP32. Wanneer een fossiel gescand wordt, stuurt dit script een signaal naar de ESP32 zodat de juiste LED kan branden.

---

### `scripts/start-kiosk.sh`

Dit script start de installatie in kioskmodus.

Het script start:

- de server
- de RFID-reader
- de ESP32 LED-bridge
- Chromium in fullscreen

---

## Belangrijke databestanden

### `public/data/fossils.json`

Dit bestand bevat de data van de fossielen.

Per fossiel staat hier onder andere:

```txt
id
naam
periode
leeftijd
beschrijving
afbeeldingen
audio
RFID UID
LED index
```

---

### `data/settings.json`

Dit bestand bevat de algemene instellingen van de installatie.

Voorbeelden:

```txt
diplomaEnabled
audioEnabled
completionDurationSeconds
diplomaTitle
diplomaDescription
diplomaAudioPath
noDiplomaTitle
noDiplomaDescription
noDiplomaAudioPath
```

---

### `data/current-scan.json`

Dit bestand bevat de laatst gescande RFID-tag.

De frontend leest dit bestand regelmatig om te weten of er een nieuwe scan is.

---

## Projectstructuur

```txt
fossil-scan
├── data
│   ├── current-scan.json
│   └── settings.json
├── public
│   ├── data
│   │   └── fossils.json
│   ├── fossiel-images
│   └── uploads
│       └── audio
├── server
│   └── server.cjs
├── scripts
│   ├── start-kiosk.sh
│   ├── kiosk-autostart.sh
│   ├── rfid-reader.py
│   └── esp32-led-bridge.py
├── src
│   ├── components
│   ├── hooks
│   ├── pages
│   └── types
├── package.json
└── README.md
```

---

## Belangrijke commando’s

Naar projectmap gaan:

```bash
cd ~/Desktop/fossil-scan
```

Dependencies installeren:

```bash
npm install
```

Development starten:

```bash
npm run dev
```

Build maken:

```bash
npm run build
```

Production starten:

```bash
npm run start
```

Kiosk starten:

```bash
npm run kiosk
```

Server stoppen:

```bash
pkill -f server.cjs
```

Chromium sluiten:

```bash
pkill -f chromium
```

---

## Offline gebruik

De installatie kan offline werken omdat alles lokaal op de Raspberry Pi staat:

- fossieldata
- afbeeldingen
- audio
- instellingen
- server
- frontend build

De Raspberry Pi kan ook een eigen wifi-netwerk maken. Dan kan een laptop verbinden met de Raspberry Pi zonder internet.

Voorbeeld:

```txt
Wifi naam: Fossielenspoor
Admin: http://10.42.0.1:3000/admin
SSH: ssh teynur@10.42.0.1
```

---

## Mogelijke problemen

### Admin opent niet

Controleer of de server draait:

```bash
curl -I http://127.0.0.1:3000/admin
```

Als dit niet werkt:

```bash
npm run start
```

---

### RFID werkt niet

Controleer de RFID-log:

```bash
tail -n 80 logs/rfid.log
```

---

### LED’s werken niet

Controleer de ESP32-log:

```bash
tail -n 80 logs/esp32.log
```

---

### Kiosk start niet

Controleer de logs:

```bash
tail -n 80 logs/kiosk-startup.log
tail -n 80 logs/chromium.log
tail -n 80 logs/server.log
```

---

## Doel van het project

Het doel van dit project is om kinderen op een interactieve manier fossielen te laten ontdekken. In plaats van enkel informatie te lezen, gebruiken bezoekers echte objecten en krijgen ze directe feedback via beeld, geluid en licht.

De installatie combineert educatie, fysieke interactie, digitale informatie en spelelementen tot een toegankelijke museumervaring.
