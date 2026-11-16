import {useRef} from 'react';
import {GoogleMap,Marker,Polygon,Polyline,Autocomplete} from '@react-google-maps/api';
import {normalizePoints} from '../lib/mapPoints.js';

const erode = {lat:11.3410,lng:77.7172};
export function MapCanvas({center,marker,markers=[],polygon=[],path=[],onClick,height=340,zoom=12}) {
  const dots = normalizePoints(markers);
  const boundary = normalizePoints(polygon);
  const route = normalizePoints(path);
  const selectedMarker = normalizePoints(marker ? [marker] : [])[0];
  const preferredCenter = normalizePoints(center ? [center] : [])[0];
  const c = preferredCenter || selectedMarker || erode;

  if (!import.meta.env.VITE_GOOGLE_MAPS_KEY || !window.google?.maps) {
    return <div className="map-fallback" style={{height}}>
      <div className="map-grid"/>
      <div><strong>Map configuration required</strong>
        <p>Set VITE_GOOGLE_MAPS_KEY to display Google Maps.</p>
        {selectedMarker && <small>Selected: {selectedMarker.lat.toFixed(5)}, {selectedMarker.lng.toFixed(5)}</small>}
      </div>
    </div>;
  }

  return <GoogleMap center={c} zoom={zoom} mapContainerStyle={{width:'100%',height}}
    onClick={e => {if (e.latLng) onClick?.({lat:e.latLng.lat(),lng:e.latLng.lng()});}}
    options={{disableDefaultUI:true,zoomControl:true,clickableIcons:false,styles:[{featureType:'poi',stylers:[{visibility:'off'}]}]}}>
    {selectedMarker && <Marker position={selectedMarker} clickable={false}/>}
    {dots.map((m,i) => <Marker key={i} position={{lat:m.lat,lng:m.lng}} title={m.label||''} clickable={false}/>)}
    {boundary.length >= 3 && <Polygon paths={boundary} options={{fillColor:'#F8C51B',fillOpacity:.18,strokeColor:'#131720',strokeWeight:3,clickable:false}}/>}
    {route.length >= 2 && <Polyline path={route} options={{strokeColor:'#171D27',strokeWeight:4}}/>}
  </GoogleMap>;
}

export function PlaceField({label,value,onChange,onPlace,placeholder}) {
  const input=useRef();const auto=useRef();
  const ready=!!import.meta.env.VITE_GOOGLE_MAPS_KEY&&!!window.google?.maps?.places;
  return <label className="field"><span>{label}</span>{ready?
    <Autocomplete onLoad={a=>auto.current=a} onPlaceChanged={()=>{const p=auto.current?.getPlace();const loc=p?.geometry?.location;if(loc)onPlace({lat:loc.lat(),lng:loc.lng(),address:p.formatted_address||p.name||''})}}><input ref={input} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'Search an address'} autoComplete="off"/></Autocomplete>
    :<input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'Enter address; use coordinates below'}/>}
  </label>;
}
