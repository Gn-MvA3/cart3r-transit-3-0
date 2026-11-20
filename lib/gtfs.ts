import rawStops from '@/data/stops.json';
import type {Stop} from '@/lib/types';

// Preprocessed directly from the user's GTFS stops.txt. No live Overpass requests.
// stops.txt does not contain verified OVapi TimingPointCodes or transport modes.
type Row = [string,string,number,number];
const stops = rawStops as Row[];

export function getNearbyStops(lat:number, lon:number, radius:number):Stop[] {
  const latRadians=lat*Math.PI/180;
  const cosLat=Math.cos(latRadians);
  const nearby: Array<{row:Row;distance:number}>=[];
  for(const row of stops){
    const dy=(row[2]-lat)*111195;
    const dx=(row[3]-lon)*111195*cosLat;
    if(Math.abs(dx)>radius||Math.abs(dy)>radius)continue;
    const distance=Math.hypot(dx,dy);
    if(distance<=radius)nearby.push({row,distance});
  }
  nearby.sort((a,b)=>a.distance-b.distance);
  return nearby.slice(0,700).map(({row})=>({
    id:row[0],name:row[1],lat:row[2],lon:row[3],
    mode:'other',tpc:null,source:'GTFS'
  }));
}
export const totalStops=stops.length;
