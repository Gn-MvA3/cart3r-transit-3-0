import {NextRequest,NextResponse} from 'next/server';
import {getNearbyStops,totalStops} from '@/lib/gtfs';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams;
 const lat=Number(p.get('lat')??52.118),lon=Number(p.get('lon')??4.324);
 const rawRadius=Number(p.get('radius')??3000);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(rawRadius)||lat<50||lat>54||lon<3||lon>8)
   return NextResponse.json({error:'Ongeldige locatie',stops:[]},{status:400});
 const radius=Math.min(5000,Math.max(300,rawRadius));
 const stops=getNearbyStops(lat,lon,radius);
 return NextResponse.json({stops,source:'GTFS (lokaal, uit stops.txt)',totalIndexed:totalStops,fetchedAt:new Date().toISOString(),note:'Echte halteposities. Vervoerstypen en OVapi TimingPointCodes zijn niet aanwezig in dit bestand. Geen live vertrektijden op basis van alleen stops.txt.'});
}
