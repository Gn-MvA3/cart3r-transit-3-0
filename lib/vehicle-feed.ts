// Minimal GTFS-Realtime protobuf reader (VehiclePosition messages only).
// Reference: gtfs-realtime.proto; no third-party decoding dependency.
export type Vehicle = { id: string; lat: number; lon: number; bearing?: number; speed?: number; routeId?: string; tripId?: string; timestamp?: number };
type Field = { number: number; wire: number; value: number | Uint8Array };
function fields(bytes: Uint8Array): Field[] {
  const result: Field[] = [];
  let offset = 0;
  const varint = () => {
    let value = 0, shift = 0;
    while (offset < bytes.length) {
      const byte = bytes[offset++];
      value += (byte & 127) * Math.pow(2, shift);
      if (!(byte & 128)) return value;
      shift += 7;
      if (shift > 63) throw Error('Invalid protobuf varint');
    }
    throw Error('Unexpected end of protobuf');
  };
  while (offset < bytes.length) {
    const tag = varint(), number = tag >>> 3, wire = tag & 7;
    if (!number) throw Error('Invalid protobuf field');
    if (wire === 0) result.push({number, wire, value: varint()});
    else if (wire === 2) {
      const length = varint();
      if (length > bytes.length - offset) throw Error('Truncated protobuf');
      result.push({number, wire, value: bytes.subarray(offset, offset + length)});
      offset += length;
    } else if (wire === 5 || wire === 1) {
      const length = wire === 5 ? 4 : 8;
      if (length > bytes.length - offset) throw Error('Truncated protobuf');
      result.push({number, wire, value: bytes.subarray(offset, offset + length)});
      offset += length;
    } else throw Error('Unsupported protobuf wire type');
  }
  return result;
}
const nested = (items: Field[], n: number) => items.find(f => f.number === n && f.wire === 2)?.value as Uint8Array | undefined;
const numeric = (items: Field[], n: number) => items.find(f => f.number === n && f.wire === 0)?.value as number | undefined;
const str = (items: Field[], n: number) => {const b = nested(items,n); return b ? new TextDecoder().decode(b) : undefined;};
const float = (items: Field[], n: number) => {const b=items.find(f=>f.number===n&&f.wire===5)?.value as Uint8Array|undefined;return b ? new DataView(b.buffer,b.byteOffset,b.byteLength).getFloat32(0,true) : undefined;};
export function parseVehicles(data: Uint8Array): Vehicle[] {
  const vehicles: Vehicle[] = [];
  for (const entity of fields(data).filter(f => f.number === 2 && f.wire === 2)) {
    const e = fields(entity.value as Uint8Array), vehicleBytes = nested(e,4);
    if (!vehicleBytes) continue;
    const v = fields(vehicleBytes), posBytes = nested(v,2);
    if (!posBytes) continue;
    const pos = fields(posBytes), lat = float(pos,1), lon = float(pos,2);
    if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const tripBytes = nested(v,1), trip = tripBytes ? fields(tripBytes) : [];
    const descriptorBytes = nested(v,8), descriptor = descriptorBytes ? fields(descriptorBytes) : [];
    const id = str(descriptor,1) || str(e,1);
    if (!id) continue;
    vehicles.push({id,lat,lon,bearing:float(pos,3),speed:float(pos,5),routeId:str(trip,5),tripId:str(trip,1),timestamp:numeric(v,5)});
  }
  return vehicles;
}
