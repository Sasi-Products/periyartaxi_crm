import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleMap,
  Marker,
  Polygon,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api';
import {
  Crosshair,
  MapPin,
  MousePointer2,
  Plus,
  RotateCcw,
  Save,
  Undo2,
  ScanSearch,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { normalizePoints } from '../lib/mapPoints.js';
import { Button, Heading, Input, Notice, Panel, useNotice } from '../components/UI.jsx';

const ERODE_CENTER = { lat: 11.341, lng: 77.7172 };
const MAP_LIBRARIES = ['places'];
const MAP_STYLE = { width: '100%', height: '520px', borderRadius: '12px' };
const MAP_OPTIONS = {
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: 'cooperative',
};
const newBranch = () => ({
  name: '',
  code: '',
  centerLat: ERODE_CENTER.lat,
  centerLng: ERODE_CENTER.lng,
  polygon: [],
});

function asBranch(row) {
  return { ...row, polygon: normalizePoints(row?.polygon) };
}

function getCenter(form) {
  const lat = Number(form.centerLat);
  const lng = Number(form.centerLng);
  return Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    Number.isFinite(lng) && Math.abs(lng) <= 180
    ? { lat, lng }
    : ERODE_CENTER;
}

function ModeButton({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        border: `1px solid ${active ? '#e2ad00' : '#dce1e8'}`,
        background: active ? '#ffca18' : '#ffffff',
        color: '#15181e',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      <Icon size={17} />
      {children}
    </button>
  );
}

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState(newBranch);
  const [mode, setMode] = useState('boundary'); // 'boundary' or 'center'
  const [busy, setBusy] = useState(false);
  const mapRef = useRef(null);
  // Keep the current tool available to Google Maps event listeners.
  const modeRef = useRef('boundary');
  const note = useNotice();

  // App.jsx already uses this loader ID. The matching options let both
  // components safely share the same Google Maps script.
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'MISSING_KEY';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'periyar-maps',
    googleMapsApiKey: apiKey,
    libraries: MAP_LIBRARIES,
  });

  const points = useMemo(() => normalizePoints(form.polygon), [form.polygon]);
  const center = useMemo(
    () => getCenter(form),
    [form.centerLat, form.centerLng]
  );

  // With two points this is an open line. With three or more points,
  // repeat the first point to make the closing edge visible.
  const boundaryLine = useMemo(
    () => points.length >= 3 ? [...points, points[0]] : points,
    [points]
  );

  async function loadBranches(preferredId = '') {
    try {
      const response = await api.get('/branches');
      const rows = Array.isArray(response.data)
        ? response.data.map(asBranch)
        : [];
      setBranches(rows);

      const current = rows.find(
        branch => String(branch.id) === String(preferredId)
      ) || rows[0];

      setSelected(current ? String(current.id) : '');
      setForm(current || newBranch());
    } catch (error) {
      note.error(error);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  function chooseBranch(id) {
    const branch = branches.find(item => String(item.id) === String(id));
    setSelected(branch ? String(branch.id) : '');
    setForm(branch ? asBranch(branch) : newBranch());
    switchMode('boundary');
  }

  function update(key, value) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function switchMode(next) {
    modeRef.current = next;
    setMode(next);
  }

  function setCenter(point) {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng) ||
      Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return;

    setForm(previous => ({
      ...previous,
      centerLat: point.lat,
      centerLng: point.lng,
    }));
  }

  function commitPickedCenter(point) {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) return;
    setCenter(point);
    switchMode('boundary');
    note.success('Branch center selected. Click Save branch to keep this location.');
  }

  // Reliable alternative to click selection: pan/zoom the map and confirm
  // the exact point under the crosshair, even if a marker consumed the click.
  function confirmVisibleMapCenter() {
    const mapCenter = mapRef.current?.getCenter();
    if (!mapCenter) {
      note.error('Google Maps is not ready. Please reload the map and try again.');
      return;
    }
    commitPickedCenter({ lat: mapCenter.lat(), lng: mapCenter.lng() });
  }

  function handleMapClick(event) {
    if (!event?.latLng) return;
    const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

    if (modeRef.current === 'center') {
      commitPickedCenter(point);
      return;
    }

    setForm(previous => {
      const previousPoints = normalizePoints(previous.polygon);
      if (previousPoints.length >= 200) return previous;
      return { ...previous, polygon: [...previousPoints, point] };
    });
  }

  // Marker clicks do not always bubble to GoogleMap.onClick.
  function handleExistingMarkerClick(event) {
    if (modeRef.current !== 'center' || !event?.latLng) return;
    commitPickedCenter({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }

  function moveBoundaryPoint(index, event) {
    if (!event.latLng) return;
    const updated = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setForm(previous => {
      const next = [...normalizePoints(previous.polygon)];
      if (!next[index]) return previous;
      next[index] = updated;
      return { ...previous, polygon: next };
    });
  }

  function undoPoint() {
    setForm(previous => ({
      ...previous,
      polygon: normalizePoints(previous.polygon).slice(0, -1),
    }));
  }

  function resetBoundary() {
    setForm(previous => ({ ...previous, polygon: [] }));
  }

  function fitBoundary() {
    if (!mapRef.current || !window.google?.maps) return;
    const positions = points.length ? [center, ...points] : [center];
    if (positions.length === 1) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(12);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    positions.forEach(position => bounds.extend(position));
    mapRef.current.fitBounds(bounds, 55);
  }

  async function save() {
    if (!form.name.trim() || !form.code.trim()) {
      note.error('Enter the branch name and code.');
      return;
    }
    if (points.length > 0 && points.length < 3) {
      note.error('Draw at least three boundary points before saving.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        centerLat: center.lat,
        centerLng: center.lng,
        polygon: points,
      };
      const response = selected
        ? await api.patch(`/branches/${selected}`, payload)
        : await api.post('/branches', payload);

      note.success('Branch center and service boundary saved successfully.');
      await loadBranches(response.data?.id || selected);
    } catch (error) {
      note.error(error);
    } finally {
      setBusy(false);
    }
  }

  const mapReady = !!import.meta.env.VITE_GOOGLE_MAPS_KEY && isLoaded;
  const drawingText = mode === 'center'
    ? 'Center picker is active. Click the map, drag the yellow C marker, or move the map and press Use map center.'
    : 'Click the map to add boundary corners in order. Lines appear instantly.';

  return (
    <>
      <Heading
        title="Branches & service boundaries"
        sub="Manage branch locations and draw local-trip service areas directly on Google Maps."
        action={
          <Button kind="secondary" onClick={() => chooseBranch('')}>
            <Plus size={16} /> Add branch
          </Button>
        }
      />
      <Notice state={note} />

      <div className="two-col">
        <Panel title="Branch settings" sub="Set the branch details and select its location on the map.">
          <Input
            label="Select branch"
            as="select"
            value={selected}
            onChange={event => chooseBranch(event.target.value)}
            options={[
              { value: '', label: '+ New branch' },
              ...branches.map(branch => ({
                value: String(branch.id),
                label: branch.name,
              })),
            ]}
          />

          <div className="form-grid">
            <Input
              label="Branch name"
              value={form.name || ''}
              onChange={event => update('name', event.target.value)}
              placeholder="Example: Erode"
            />
            <Input
              label="Branch code"
              value={form.code || ''}
              disabled={!!selected}
              onChange={event => update('code', event.target.value.toUpperCase())}
              placeholder="Example: ERODE"
            />
          </div>

          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <MapPin size={18} color="#15181e" />
              <strong>Branch center location</strong>
            </div>
            <div style={{
              border: '1px solid #e2e6ec',
              borderRadius: 12,
              background: '#f7f8fa',
              padding: 16,
            }}>
              <div style={{ fontSize: 13, color: '#666f7d', marginBottom: 12 }}>
                Selected: {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
              </div>
              <ModeButton
                active={mode === 'center'}
                icon={Crosshair}
                onClick={() => switchMode('center')}
              >
                Select center on map
              </ModeButton>
              <p style={{ fontSize: 12, color: '#687282', margin: '10px 0 0' }}>
                Tap Select center on map, then click your location on the map. You can also drag the yellow C marker.
              </p>
            </div>
          </div>

          <div className="boundary-actions">
            <strong>{points.length} boundary points</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="ghost" onClick={undoPoint} disabled={!points.length}>
                <Undo2 size={15} /> Undo
              </Button>
              <Button kind="ghost" onClick={resetBoundary} disabled={!points.length}>
                <RotateCcw size={15} /> Reset
              </Button>
            </div>
          </div>

          <div className="notice info" style={{ marginTop: 18, lineHeight: 1.6 }}>
            Draw at least 3 points. Each point connects to the previous one;
            the last point automatically connects back to the first.
            Drag any numbered marker to fine-tune the boundary.
          </div>

          <Button onClick={save} loading={busy}>
            <Save size={17} /> Save branch
          </Button>
        </Panel>

        <Panel
          title="Draw on Google Maps"
          sub="Choose a tool, then click on the map."
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 14 }}>
            <ModeButton
              active={mode === 'boundary'}
              icon={MousePointer2}
              onClick={() => switchMode('boundary')}
            >
              Draw boundary
            </ModeButton>
            <ModeButton
              active={mode === 'center'}
              icon={Crosshair}
              onClick={() => switchMode('center')}
            >
              Pick branch center
            </ModeButton>
            {mode === 'center' && (
              <Button kind="secondary" onClick={confirmVisibleMapCenter} disabled={!mapReady}>
                <Crosshair size={16} /> Use map center
              </Button>
            )}
            <Button kind="ghost" onClick={fitBoundary} disabled={!mapReady}>
              <ScanSearch size={16} /> Fit points
            </Button>
          </div>

          <p style={{ margin: '0 0 12px', color: '#596577', fontSize: 13 }}>
            {drawingText}
          </p>

          {!import.meta.env.VITE_GOOGLE_MAPS_KEY ? (
            <div className="notice info">
              Add VITE_GOOGLE_MAPS_KEY to the frontend .env file and restart Vite.
            </div>
          ) : loadError ? (
            <div className="notice error">Google Maps could not load. Verify your API key and domain restrictions.</div>
          ) : !mapReady ? (
            <div style={{ ...MAP_STYLE, display: 'grid', placeItems: 'center', background: '#f4f5f7' }}>
              Loading Google Maps…
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <GoogleMap
              mapContainerStyle={MAP_STYLE}
              center={center}
              zoom={12}
              options={{
                ...MAP_OPTIONS,
                draggableCursor: mode === 'center' ? 'crosshair' : 'default',
                gestureHandling: mode === 'center' ? 'greedy' : 'auto',
              }}
              onLoad={map => { mapRef.current = map; }}
              onUnmount={() => { mapRef.current = null; }}
              onClick={handleMapClick}
            >
              {/* Filled area after the third point. No separate DrawingManager needed. */}
              {points.length >= 3 && (
                <Polygon
                  paths={points}
                  options={{
                    fillColor: '#ffc400',
                    fillOpacity: 0.18,
                    strokeOpacity: 0,
                    clickable: false,
                    zIndex: 1,
                  }}
                />
              )}

              {/* Black outline plus yellow line keeps the boundary visible on any map. */}
              {boundaryLine.length >= 2 && (
                <>
                  <Polyline
                    path={boundaryLine}
                    options={{
                      strokeColor: '#171b22',
                      strokeOpacity: 1,
                      strokeWeight: 7,
                      clickable: false,
                      zIndex: 3,
                    }}
                  />
                  <Polyline
                    path={boundaryLine}
                    options={{
                      strokeColor: '#ffc400',
                      strokeOpacity: 1,
                      strokeWeight: 4,
                      clickable: false,
                      zIndex: 4,
                    }}
                  />
                </>
              )}

              {/* The branch center is yellow and draggable. */}
              <Marker
                position={center}
                draggable
                title="Branch center — drag to reposition"
                onClick={handleExistingMarkerClick}
                onDragEnd={event => {
                  if (!event.latLng) return;
                  commitPickedCenter({ lat: event.latLng.lat(), lng: event.latLng.lng() });
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 17,
                  fillColor: '#ffca18',
                  fillOpacity: 1,
                  strokeColor: '#111827',
                  strokeWeight: 3,
                }}
                label={{ text: 'C', color: '#111827', fontWeight: 'bold', fontSize: '14px' }}
                zIndex={1000}
              />

              {/* Numbered boundary vertices. Drag any one to adjust the shape. */}
              {points.map((point, index) => (
                <Marker
                  key={`boundary-${index}`}
                  position={point}
                  draggable
                  title={`Boundary point ${index + 1} — drag to adjust`}
                  onClick={handleExistingMarkerClick}
                  onDragEnd={event => {
                    if (modeRef.current === 'center' && event.latLng) {
                      commitPickedCenter({ lat: event.latLng.lat(), lng: event.latLng.lng() });
                    } else {
                      moveBoundaryPoint(index, event);
                    }
                  }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 13,
                    fillColor: '#171b22',
                    fillOpacity: 1,
                    strokeColor: '#ffca18',
                    strokeWeight: 3,
                  }}
                  label={{
                    text: String(index + 1),
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                  zIndex={20 + index}
                />
              ))}
            </GoogleMap>
            {mode === 'center' && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  background: 'rgba(255,202,24,0.85)',
                  border: '2px solid #171b22',
                  borderRadius: 999,
                  width: 44, height: 44,
                  display: 'grid', placeItems: 'center',
                  boxShadow: '0 1px 8px rgba(0,0,0,.2)',
                  zIndex: 5,
                }}
              >
                <Crosshair size={28} color="#171b22" />
              </div>
            )}
            </div>
          )}

          <p className="muted" style={{ marginTop: 12 }}>
            <strong>Yellow C</strong> = branch center. <strong>Numbered black dots</strong> = boundary corners.
            The completed boundary is saved for Local Trip pricing and service checks.
          </p>
        </Panel>
      </div>
    </>
  );
}
