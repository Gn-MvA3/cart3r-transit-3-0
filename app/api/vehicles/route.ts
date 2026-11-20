import { NextRequest, NextResponse } from 'next/server';
import { parseVehicles } from '@/lib/vehicle-feed';
import routes from '@/data/routes.json';
export const runtime = 'nodejs';
const FEED = process.env.GTFS_VEHICLE_URL || 'https://gtfs.ovapi.nl/nl/vehiclePositions.pb';
// One shared upstream request per server process; clients read the same snapshot.
// On rate limiting, respect Retry-After and use exponential backoff.
type Snapshot = { all: ReturnType<typeof parseVehicles>; fetchedAt: number; newest: number|null };
let snapshot: Snapshot|null = null;
let pending: Promise<void>|null = null;
let retryAt = 0;
let failures = 0;
let lastError = '';
const REFRESH_MS = 10000; // Target; upstream limits and serverless cold starts can increase this.
const MAX_STALE_MS = 5 * 60_000;
async function refreshFeed() {
  const now = Date.now();
  if (now < retryAt) return;
  if (snapshot && now - snapshot.fetchedAt < REFRESH_MS) return;
  if (!pending) {
    pending = (async()=>{
      try {
        const response = await fetch(FEED, {cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Accept:'application/x-protobuf,application/octet-stream'}});
        if (!response.ok) {
          const waitHeader = response.headers.get('retry-after');
          const waitSeconds = waitHeader && /^\d+$/.test(waitHeader) ? Number(waitHeader) : null;
          const waitDate = waitHeader && waitSeconds===null ? Date.parse(waitHeader) : NaN;
          const backoff = waitSeconds!==null ? waitSeconds*1000 : Number.isFinite(waitDate) ? waitDate-Date.now() : Math.min(180000, 15000*2**Math.min(failures,4));
          retryAt = Date.now() + Math.max(15000, Math.min(300000, backoff));
          throw Error(`Live bron HTTP ${response.status}`);
        }
        const buffer=await response.arrayBuffer();
        if(buffer.byteLength>25_000_000) throw Error('Live feed is te groot');
        const all=parseVehicles(new Uint8Array(buffer));
        const timestamps=all.map(v=>v.timestamp).filter((t):t is number=>typeof t==='number'&&t>0);
        snapshot={all,fetchedAt:Date.now(),newest:timestamps.length?Math.max(...timestamps):null};
        retryAt=0;failures=0;lastError='';
      } catch(e) {
        failures++;
        lastError=e instanceof Error?e.message:String(e);
        if (retryAt<Date.now()) retryAt=Date.now()+Math.min(180000,15000*2**Math.min(failures-1,4));
        console.warn('GTFS live feed:',lastError);
      }
    })().finally(()=>{pending=null});
  }
  await pending;
}
export async function GET(req: NextRequest) {
  const params=req.nextUrl.searchParams;
  const lat=Number(params.get('lat')??52.118),lon=Number(params.get('lon')??4.324);
  const radius=Math.min(20000,Math.max(1000,Number(params.get('radius')??8000)));
  if (![lat,lon,radius].every(Number.isFinite)||lat<50||lat>54||lon<3||lon>8)
    return NextResponse.json({error:'Ongeldige locatie',vehicles:[]},{status:400});
  await refreshFeed();
  if (!snapshot || Date.now()-snapshot.fetchedAt>MAX_STALE_MS) {
    return NextResponse.json({error:'Geen recente GPS-posities beschikbaar',details:lastError,retryInSeconds:Math.max(0,Math.ceil((retryAt-Date.now())/1000)),vehicles:[]},{status:503});
  }
  const vehicles=snapshot.all.filter(v=>{
    const dLat=(v.lat-lat)*111195;
    const dLon=(v.lon-lon)*111195*Math.cos(lat*Math.PI/180);
    return Math.hypot(dLat,dLon)<=radius;
  }).slice(0,600).map(v=>{
    const route=(routes as Record<string,{line:string;name:string;type:string}>)[v.routeId||''];
    return {...v,line:route?.line||v.routeId||null,routeName:route?.name||null};
  });
  return NextResponse.json({vehicles,source:'GTFS-Realtime',updatedAt:new Date(snapshot.fetchedAt).toISOString(),
    feedAgeSeconds:snapshot.newest?Math.max(0,Math.round(Date.now()/1000-snapshot.newest)):null,
    snapshotAgeSeconds:Math.round((Date.now()-snapshot.fetchedAt)/1000),
    stale:Date.now()-snapshot.fetchedAt>REFRESH_MS,warning:lastError||null,
    retryInSeconds:Math.max(0,Math.ceil((retryAt-Date.now())/1000)),totalInFeed:snapshot.all.length},
    {headers:{'Cache-Control':'private, no-store'}});
}
