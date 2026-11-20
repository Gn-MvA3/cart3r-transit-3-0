export type Mode = 'bus'|'tram'|'train'|'metro'|'ferry'|'other';
export type Stop = {id:string;name:string;lat:number;lon:number;mode:Mode;tpc:string|null;source:'GTFS';operator?:string};
export type Departure = {id:string;line:string;destination:string;planned:string|null;expected:string|null;status:string;mode:Mode};

export type Vehicle = {id:string;lat:number;lon:number;bearing?:number;speed?:number;routeId?:string;tripId?:string;timestamp?:number;line?:string|null;routeName?:string|null};
