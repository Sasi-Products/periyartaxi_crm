import { useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Check, Crosshair, MapPin, Navigation, Search, X } from 'lucide-react';
import { Button } from './UI.jsx';
import { PlaceField } from './Maps.jsx';

const fallbackCenter = { lat: 11.341, lng: 77.7172 };
const valid = point => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
const format = p => `${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}`;

export default function LocationPicker({ title = 'Choose location on map', value, fallback, onPick, onClose }) {
  const start = useMemo(() => valid(value) ? { lat: Number(value.lat), lng: Number(value.lng) } : valid(fallback) ? { lat: Number(fallback.lat), lng: Number(fallback.lng) } : fallbackCenter, []);
  const [selected, setSelected] = useState(valid(value) ? { ...value, lat: Number(value.lat), lng: Number(value.lng) } : null);
  const [address, setAddress] = useState(value?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const visualCenter = useRef(start);
  const available = !!import.meta.env.VITE_GOOGLE_MAPS_KEY && !!window.google?.maps;
  const reverse = async (point) => {
    setLoading(true); setError('');
    const chosen = { lat: Number(point.lat), lng: Number(point.lng) };
    setSelected({ ...chosen, address: '' });
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: chosen });
      const text = result.results?.[0]?.formatted_address || `Pinned location (${format(chosen)})`;
      setSelected({ ...chosen, address: text }); setAddress(text);
    } catch {
      const text = `Pinned location (${format(chosen)})`;
      setSelected({ ...chosen, address: text }); setAddress(text);
    } finally { setLoading(false); }
  };
  function selectFromSearch(place) {
    if (!valid(place)) return;
    const point = { lat: Number(place.lat), lng: Number(place.lng), address: place.address };
    setSelected(point); setAddress(place.address || '');
    mapRef.current?.panTo({ lat: point.lat, lng: point.lng });
    mapRef.current?.setZoom(16);
  }
  function chooseCenter() {
    const p = mapRef.current?.getCenter();
    if (p) reverse({ lat: p.lat(), lng: p.lng() });
  }
  function myLocation() {
    if (!navigator.geolocation) return setError('Device location is unavailable');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude };
      mapRef.current?.panTo(point); mapRef.current?.setZoom(16); reverse(point);
    }, () => setError('Location permission denied or location unavailable'), { enableHighAccuracy: true, timeout: 12000 });
  }
  const commit = () => {
    // A chosen point, NOT the map default center, must be confirmed.
    if (!selected || !valid(selected)) return setError('Tap on the map or choose Use map center before confirming');
    onPick({ lat: Number(selected.lat), lng: Number(selected.lng), address: selected.address || address || `Pinned location (${format(selected)})` });
    onClose();
  };
  return <div className="location-picker-backdrop" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="location-picker-dialog">
      <header><div><h3><MapPin size={20}/> {title}</h3><p>Search for a place, click on the map, or move the map under the center crosshair.</p></div><button type="button" className="icon-btn" aria-label="Close map picker" onClick={onClose}><X size={20}/></button></header>
      <div className="location-picker-search">
        <PlaceField label="Search place or landmark" value={address} onChange={next => { setAddress(next); setSelected(null); }} onPlace={selectFromSearch} placeholder="Search street, building, hospital or landmark"/>
      </div>
      {!available ? <div className="location-picker-unavailable"><MapPin size={30}/><strong>Google Maps is not ready</strong><p>Set VITE_GOOGLE_MAPS_KEY in frontend/.env and enable the Maps JavaScript API, Places API and Geocoding API for your website.</p></div>
        : <div className="location-picker-map"><GoogleMap mapContainerStyle={{ height: '100%', width: '100%' }} center={start} zoom={14} onLoad={map => { mapRef.current = map; }} onUnmount={() => { mapRef.current = null; }}
          onClick={event => { if (event.latLng) reverse({ lat: event.latLng.lat(), lng: event.latLng.lng() }); }}
          options={{ streetViewControl: false, mapTypeControl: true, fullscreenControl: false, clickableIcons: false, gestureHandling: 'greedy' }}>
          {selected && <Marker position={{ lat: selected.lat, lng: selected.lng }} draggable onDragEnd={e => e.latLng && reverse({ lat: e.latLng.lat(), lng: e.latLng.lng() })} />}
        </GoogleMap><div className="location-picker-crosshair"><Crosshair size={26}/></div></div>}
      <div className="location-picker-toolbar"><Button kind="secondary" onClick={chooseCenter} disabled={!available}><Crosshair size={16}/> Use map center</Button>
        <Button kind="secondary" onClick={myLocation} disabled={!available}><Navigation size={16}/> My current location</Button></div>
      {selected && <div className="location-picker-selection"><MapPin size={17}/><div><strong>Selected place</strong><span>{selected.address || address || format(selected)}</span></div></div>}
      {error && <div className="notice error">{error}</div>}
      <div className="location-picker-footer"><Button kind="secondary" onClick={onClose}>Cancel</Button><Button loading={loading} onClick={commit} disabled={!available || !selected}><Check size={17}/> Confirm selected location</Button></div>
    </div>
  </div>;
}
