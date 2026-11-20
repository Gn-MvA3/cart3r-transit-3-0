# CART3R Transit 3.0

Mobielvriendelijke OV-kaart met GTFS-haltes, GTFS-Realtime voertuigposities en OVapi-vertrekken (als beschikbaar).

## Lokaal starten

1. Installeer Node.js 20 of hoger.
2. Open deze map in VS Code.
3. Open Terminal en voer uit:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000.

### Op telefoon via dezelfde wifi

1. Start de site met `npm run dev -- --hostname 0.0.0.0`.
2. Zoek op Windows het IPv4-adres met `ipconfig`.
3. Open op je telefoon `http://JOUW-IP:3000`, bijvoorbeeld `http://192.168.1.100:3000`.
4. Beide apparaten moeten op hetzelfde wifi-netwerk zitten. Windows Firewall kan toestemming vragen.

## Eenvoudig online zetten op Vercel

**Aanbevolen: GitHub + Vercel.** Upload geen `node_modules` of `.next`.

1. Maak een GitHub-account/repository, bijvoorbeeld `cart3r-transit`.
2. Upload de **inhoud** van deze map naar de hoofdmap van je repository. Upload geen ZIP als één bestand: de losse projectbestanden moeten in de repository staan.
3. Ga naar https://vercel.com/new, log in met GitHub en kies **Import** bij je repository.
4. Framework: **Next.js**. Root Directory: `./` als de `package.json` in de hoofdmap staat.
5. Klik **Deploy**. Vercel voert de installatie en build uit en geeft je een `*.vercel.app`-adres.
6. Open dat adres op telefoon of laptop. Latere GitHub-updates worden automatisch opnieuw gedeployed.

**Let op:** dit project gebruikt een openbare externe GTFS-Realtime-feed en OVapi. Bereikbaarheid, datalimieten en actualiteit worden door die aanbieders bepaald. Bij HTTP 429 wacht de server automatisch. Vercel gebruikt serverless functies: de cache in `app/api/vehicles/route.ts` is **per functie-instantie**, niet gedeeld tussen alle bezoekers of instanties. Voor echt veel bezoekers en stabiele 10-seconden-opvraging is een gedeelde cache/worker (bijvoorbeeld Redis + een apart ingest-proces) nodig. De externe GPS-bron hoeft zelf ook niet elke 10 seconden nieuwe data te publiceren.

## Functies

- Responsive kaart, halteoverzicht en detailpaneel.
- Lokale GTFS-haltes en filters; halte-ID en coördinaten.
- Voertuigen via GTFS-Realtime; browser controleert iedere 3 sec, server probeert externe bron vanaf 10 sec te verversen. Bij 429: backoff en behoud van vorige posities.
- Lijnnummers bij voertuigen als er een GTFS-routekoppeling is; lijnen van voertuigen in de buurt zijn **niet** gegarandeerd de lijnen die de gekozen halte aandoen.
- Vertrekbord via OVapi voor een geldige TimingPointCode; geplande en verwachte tijden en berekende vertraging/vervroeging, automatische hercontrole iedere 30 sec.
- Geen fictieve vertrekken. Voor volledige dienstregeling en correcte halte-lijnkoppelingen is `stop_times.txt` of een aanvullende betrouwbare API nodig.
- De kaart toont **gemelde GPS-posities**, geen vloeiende voorspelde beweging. Zonder routegeometrie zouden geanimeerde rechte lijnen misleidend kunnen zijn.

## Problemen oplossen

- **Geen bussen:** open `/api/vehicles?lat=52.118&lon=4.324&radius=12000` en lees `error` / `warning`. De feed kan tijdelijk uitvallen of 429 teruggeven.
- **Geen vertrektijden:** de GTFS-stops hebben geen gegarandeerde OVapi TimingPointCode; voer een correcte code in, indien bekend.
- **Build faalt:** controleer de fout in Vercel > Deployments > Build Logs en gebruik een actuele Node.js-versie.
- **Geen kaart op telefoon:** controleer internet, JavaScript en eventueel browsercache.

## Privacy

De knop 'Haltes bij mij' vraagt browserlocatietoestemming. Deze locatie wordt gebruikt om nabije haltes en voertuigen op te vragen. Publiceer geen privé API-sleutels in GitHub; gebruik daarvoor Vercel Environment Variables.
