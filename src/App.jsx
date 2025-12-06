import React, { useState, useEffect, useRef } from 'react';
import { Navigation, RefreshCw, Footprints, Ruler, Search, MoreVertical, X, Settings, Map as MapIcon, StopCircle, Heart, List, Trash2, Calendar, Edit2, Share2, CheckCircle2, Cloud, Sun, CloudRain, Download, Clock, BarChart3, ExternalLink, ArrowRight } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

/* --- EINSTELLUNGEN --- */
// Falls du Google Analytics nutzt, trage die ID hier ein. Sonst leer lassen.
const GA_MEASUREMENT_ID = ""; 

// Leaflet Map Komponente mit verbessertem Style
const LeafletMap = ({ center, routeCoords, markers, onMarkerDragEnd, userLocation, viewState, onMapReady }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const borderLayerRef = useRef(null); // Für den "Rand" um die Route
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    // Leaflet CSS laden
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    // Leaflet JS laden
    if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => initMap();
        document.body.appendChild(script);
    } else {
        initMap();
    }

    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  const initMap = () => {
    if (!window.L || mapInstanceRef.current || !mapRef.current) return;

    // Karte initialisieren
    mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false // Wir bauen eine eigene, dezentere Attribution
    }).setView(center, 15);

    // NEUER KARTEN-STYLE: CartoDB Voyager (sieht sauberer/moderner aus, wie Google Maps)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(mapInstanceRef.current);

    // Manuelle Attribution unten rechts hinzufügen (klein)
    window.L.control.attribution({ position: 'bottomright' }).addTo(mapInstanceRef.current);

    // Fix für graue Kacheln beim Laden
    setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 200);
    
    if(onMapReady) onMapReady(mapInstanceRef.current);

    updateMapContent();
  };

  // Resize Handler
  useEffect(() => {
      const handleResize = () => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update bei Änderungen
  useEffect(() => {
    if (window.L && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize(); 
      updateMapContent();
    }
  }, [center, routeCoords, markers, viewState]);

  const updateMapContent = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    
    const L = window.L;

    // Alte Marker entfernen
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Alte Route entfernen (Rand und Kern)
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    if (borderLayerRef.current) map.removeLayer(borderLayerRef.current);

    // User Marker (Startpunkt)
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);

    // Startpunkt-Icon
    const userIcon = L.divIcon({
        className: 'user-pos-icon',
        html: `<div style="background-color: #4285F4; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    userMarkerRef.current = L.marker(center, { 
        icon: userIcon, 
        zIndexOffset: 1000,
        draggable: viewState === 'planning' 
    }).addTo(map);

    if (viewState === 'planning') {
        userMarkerRef.current.on('dragend', function(event) {
            const position = event.target.getLatLng();
            if (onMarkerDragEnd) onMarkerDragEnd([position.lat, position.lng]);
        });
    }

    // ROUTE ZEICHNEN (Google Maps Style)
    if (routeCoords && routeCoords.length > 0) {
      // 1. Weißer Rand (Hintergrund-Linie, etwas dicker)
      borderLayerRef.current = L.polyline(routeCoords, {
        color: '#1967d2', // Dunkleres Blau für Kontrast
        weight: 9, 
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 2. Blaue Hauptlinie (Vordergrund)
      routeLayerRef.current = L.polyline(routeCoords, {
        color: '#4285F4', // Google Maps Blau
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      // Karte auf Route zentrieren mit Padding
      map.fitBounds(routeLayerRef.current.getBounds(), { 
          padding: [50, 50],
          maxZoom: 16 
      });
    } else {
       // Wenn keine Route, auf User zentrieren
       if (viewState === 'planning') map.panTo(center);
    }
  };

  return <div ref={mapRef} className="w-full h-full z-0" style={{background: '#f0f3f8'}} />;
};

export default function App() {
  const [distance, setDistance] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState([52.5200, 13.4050]); 
  
  const [routeCoords, setRouteCoords] = useState([]);
  const [waypoints, setWaypoints] = useState([]); 
  const [actualDistance, setActualDistance] = useState(0);
  
  // States: 'planning', 'preview', 'ready', 'export'
  const [viewState, setViewState] = useState('planning'); 

  const [routeOptions, setRouteOptions] = useState([]); 
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  
  const [isCurrentRouteSaved, setIsCurrentRouteSaved] = useState(false);
  const [currentSavedRouteId, setCurrentSavedRouteId] = useState(null);

  const [weather, setWeather] = useState(null);
  const [pace, setPace] = useState(6.0); 

  // Local Storage
  const [savedRoutes, setSavedRoutes] = useState(() => {
      try {
          const saved = localStorage.getItem('laufRoutenPlaner_routes');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  useEffect(() => {
      localStorage.setItem('laufRoutenPlaner_routes', JSON.stringify(savedRoutes));
  }, [savedRoutes]);

  // Google Analytics Script Injection
  useEffect(() => {
      if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.length > 5) {
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
          document.head.appendChild(script);
          const script2 = document.createElement('script');
          script2.innerHTML = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${GA_MEASUREMENT_ID}');`;
          document.head.appendChild(script2);
      }
  }, []);

  useEffect(() => {
      if (userLocation) fetchWeather(userLocation[0], userLocation[1]);
  }, [userLocation]);

  const fetchWeather = async (lat, lon) => {
      try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          const data = await res.json();
          setWeather(data.current_weather);
      } catch (e) { console.error("Wetter-Fehler", e); }
  };

  useEffect(() => { locateUser(); }, []);

  const locateUser = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError("Standort nicht verfügbar.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLoading(false);
        setError(null);
      },
      () => {
        setError("Standortzugriff verweigert.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleManualLocationSearch = async (e) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setLoading(true);
      setError(null);
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
          if (!response.ok) throw new Error("Netzwerkfehler");
          const data = await response.json();
          if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              setUserLocation([lat, lon]);
              resetPlanning();
          } else {
              setError("Ort nicht gefunden.");
          }
      } catch (err) {
          setError("Fehler bei der Suche.");
      } finally {
          setLoading(false);
      }
  };

  const handleMarkerDrag = (newCoords) => {
      setUserLocation(newCoords);
      resetPlanning();
  };

  const moveCoordinate = (lat, lng, distKm, bearing) => {
    const R = 6371; 
    const d = distKm;
    const brng = bearing * (Math.PI / 180);
    const lat1 = lat * (Math.PI / 180);
    const lon1 = lng * (Math.PI / 180);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));
    return [lat2 * (180 / Math.PI), lon2 * (180 / Math.PI)];
  };

  const fetchSingleRoute = async (loopRadius, directionAngle) => {
      const loopCenter = moveCoordinate(userLocation[0], userLocation[1], loopRadius, directionAngle);
      const baseAngle = directionAngle + 180; 

      // Viereck für Rundkurs
      const wp1 = moveCoordinate(loopCenter[0], loopCenter[1], loopRadius, baseAngle + 90);
      const wp2 = moveCoordinate(loopCenter[0], loopCenter[1], loopRadius, baseAngle + 180); 
      const wp3 = moveCoordinate(loopCenter[0], loopCenter[1], loopRadius, baseAngle + 270);

      const coordinatesString = `
        ${userLocation[1]},${userLocation[0]};
        ${wp1[1]},${wp1[0]};
        ${wp2[1]},${wp2[0]};
        ${wp3[1]},${wp3[0]};
        ${userLocation[1]},${userLocation[0]}
      `.replace(/\s/g, '');

      // Wir nutzen das 'walking' profil, aber erzwingen 'foot' falls nötig via URL
      // continue_straight=false erlaubt Wenden, was manchmal hilft eine Route zu finden
      const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coordinatesString}?overview=full&geometries=geojson&continue_straight=true`);
      if (!response.ok) throw new Error("Routing Server Fehler");
      const data = await response.json();
      if (!data.routes || data.routes.length === 0) throw new Error("Keine Route möglich");
      
      return {
          route: data.routes[0],
          waypoints: [wp1, wp2, wp3],
          angle: directionAngle 
      };
  };

  const generatePreciseRouteOption = async (initialRadius, angleOffset, targetDistance) => {
      let currentRadius = initialRadius;
      let bestResult = null;
      let minDiff = Infinity;
      
      // Max 3 Versuche pro Option für Performance
      for (let attempt = 0; attempt < 3; attempt++) {
          try {
              if (attempt > 0) {
                  const jitter = 0.9 + Math.random() * 0.2; 
                  currentRadius = currentRadius * jitter;
              }

              const result = await fetchSingleRoute(currentRadius, angleOffset);
              const resultDist = result.route.distance / 1000; 
              const diff = Math.abs(resultDist - targetDistance);

              if (diff < minDiff) {
                  minDiff = diff;
                  bestResult = { ...result, actualDist: resultDist };
              }

              if (diff <= 0.5) return bestResult;

              const ratio = targetDistance / resultDist;
              const safeRatio = Math.max(0.6, Math.min(1.4, ratio));
              currentRadius = currentRadius * safeRatio;
          } catch (e) { /* ignore retry error */ }
      }
      return bestResult;
  };

  const generateRouteOptions = async () => {
    setLoading(true);
    setError(null);
    setRouteCoords([]);
    setRouteOptions([]);
    setSelectedOptionIndex(null);
    setViewState('preview');
    setIsCurrentRouteSaved(false);
    setCurrentSavedRouteId(null);
    
    try {
      // Initiale Schätzung
      const initialRadius = (distance / 1.35) / (2 * Math.PI); 
      const angles = [0, 120, 240]; // 3 Richtungen

      const promises = angles.map(angle => 
          generatePreciseRouteOption(initialRadius, angle, distance)
            .then(res => res ? { ...res, success: true } : { success: false })
      );

      const results = await Promise.all(promises);
      const validOptions = results.filter(r => r.success);

      if (validOptions.length === 0) {
          throw new Error("Konnte an diesem Ort keine passenden Wege finden.");
      }

      setRouteOptions(validOptions);
      selectOption(validOptions[0], 0);

    } catch (err) {
      console.error(err);
      setError("Fehler: Routing-Server antwortet nicht oder Ort ist ungeeignet.");
      setViewState('planning');
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (option, index) => {
      setSelectedOptionIndex(index);
      const latLngs = option.route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      setRouteCoords(latLngs);
      setWaypoints(option.waypoints);
      setActualDistance((option.route.distance / 1000).toFixed(2));
      
      setIsCurrentRouteSaved(false);
      setCurrentSavedRouteId(null);
  };

  const confirmSelection = () => {
      setRouteOptions([]);
      setViewState('ready');
  };

  const goToExport = () => {
      setViewState('export');
  };

  const resetPlanning = () => {
      setRouteCoords([]);
      setRouteOptions([]);
      setActualDistance(0);
      setIsCurrentRouteSaved(false);
      setCurrentSavedRouteId(null);
      setSelectedOptionIndex(null);
      setViewState('planning');
  };

  const toggleSaveRoute = () => {
      if (isCurrentRouteSaved && currentSavedRouteId) {
          deleteRoute(currentSavedRouteId);
          setIsCurrentRouteSaved(false);
          setCurrentSavedRouteId(null);
      } else {
          const dateStr = new Date().toLocaleDateString('de-DE');
          const defaultName = `Lauf am ${dateStr}`;
          const newId = Date.now();

          const newRoute = {
              id: newId,
              name: defaultName,
              coords: routeCoords,
              distance: actualDistance,
              startLocation: userLocation,
              date: dateStr,
              waypoints: waypoints
          };
          setSavedRoutes([newRoute, ...savedRoutes]);
          setIsCurrentRouteSaved(true);
          setCurrentSavedRouteId(newId);
      }
  };

  const deleteRoute = (id) => {
      setSavedRoutes(prev => prev.filter(r => r.id !== id));
      if (currentSavedRouteId === id) {
          setIsCurrentRouteSaved(false);
          setCurrentSavedRouteId(null);
      }
  };

  const renameRoute = (id) => {
      const route = savedRoutes.find(r => r.id === id);
      if (!route) return;
      const newName = window.prompt("Neuer Name für die Route:", route.name);
      if (newName && newName.trim() !== "") {
          setSavedRoutes(savedRoutes.map(r => r.id === id ? { ...r, name: newName.trim() } : r));
      }
  };

  const shareRoute = (route) => {
      const origin = `${route.startLocation[0]},${route.startLocation[1]}`;
      const destination = origin;
      const waypointsStr = route.waypoints ? route.waypoints.map(wp => `${wp[0]},${wp[1]}`).join('|') : '';
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsStr}&travelmode=walking`;
      const shareText = `🏃‍♂️ Laufstrecke: "${route.name}" (${route.distance}km).\n${mapsUrl}`;

      if (navigator.share) {
          navigator.share({ title: 'Meine Laufrunde', text: shareText, url: mapsUrl }).catch(() => {});
      } else {
          const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          window.open(waUrl, '_blank');
      }
  };

  const downloadGPX = (route) => {
      const gpxData = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LaufRoutenPlaner"><metadata><name>${route.name}</name></metadata><trk><name>${route.name}</name><trkseg>${route.coords.map(c => `<trkpt lat="${c[0]}" lon="${c[1]}"></trkpt>`).join('')}</trkseg></trk></gpx>`;
      const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${route.name.replace(/\s+/g, '_')}.gpx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const loadRoute = (route) => {
      setUserLocation(route.startLocation);
      setRouteCoords(route.coords);
      setActualDistance(route.distance);
      if (route.waypoints) setWaypoints(route.waypoints);
      setIsCurrentRouteSaved(true); 
      setCurrentSavedRouteId(route.id);
      setRouteOptions([]); 
      setViewState('ready');
      setShowSavedRoutes(false);
  };

  const openExternalMaps = () => {
      if (waypoints.length < 3) return;
      const origin = `${userLocation[0]},${userLocation[1]}`;
      // Trickserei für Apple Maps/Google Maps um Rundkurs zu erzwingen
      const waypointsStr = waypoints.map(wp => `${wp[0]},${wp[1]}`).join('|');
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${waypointsStr}&travelmode=walking`;
      window.open(url, '_blank');
  };

  const formatDuration = (km) => {
      const totalMinutes = km * pace;
      const h = Math.floor(totalMinutes / 60);
      const m = Math.round(totalMinutes % 60);
      return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const getWeatherIcon = (code) => {
      if (code === undefined) return <Cloud size={18} />;
      if (code <= 1) return <Sun size={18} className="text-amber-500" />;
      if (code <= 3) return <Cloud size={18} className="text-slate-400" />;
      return <CloudRain size={18} className="text-blue-400" />;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      <Analytics />
      {/* Header */}
      {viewState !== 'export' && (
        <div className="bg-white shadow-sm z-20 p-3 flex flex-col gap-3 flex-shrink-0 animate-in slide-in-from-top-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                    <Footprints className="h-6 w-6" />
                    <h1 className="font-bold text-lg tracking-tight">LaufRunde</h1>
                </div>
                
                <div className="flex gap-2 items-center">
                    {weather && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-100">
                            {getWeatherIcon(weather.weathercode)}
                            <span>{Math.round(weather.temperature)}°C</span>
                        </div>
                    )}
                    <button onClick={() => setShowSavedRoutes(true)} className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-200 transition border border-slate-200"><List className="h-5 w-5" /></button>
                    <button onClick={locateUser} className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-200 transition border border-slate-200"><Navigation className="h-5 w-5" /></button>
                </div>
            </div>
            <form onSubmit={handleManualLocationSearch} className="relative w-full">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ort suchen..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-sm" />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </form>
        </div>
      )}

      {/* Map */}
      <div className="flex-grow relative z-10">
        <LeafletMap 
          center={userLocation} 
          routeCoords={routeCoords} 
          markers={[]}
          onMarkerDragEnd={handleMarkerDrag}
          userLocation={userLocation}
          viewState={viewState}
        />

        {/* SAVED ROUTES OVERLAY */}
        {showSavedRoutes && (
             <div className="absolute inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowSavedRoutes(false)}>
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-lg flex gap-2"><Heart size={18} className="text-rose-500 fill-rose-500"/> Gespeicherte Routen</h3>
                        <button onClick={() => setShowSavedRoutes(false)}><X size={20}/></button>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-3">
                        {savedRoutes.length === 0 && <p className="text-center text-slate-400 py-4">Keine Routen vorhanden.</p>}
                        {savedRoutes.map(route => (
                            <div key={route.id} className="bg-slate-50 border rounded-xl p-3 cursor-pointer hover:bg-blue-50" onClick={() => loadRoute(route)}>
                                <div className="font-bold">{route.name}</div>
                                <div className="text-sm text-blue-600">{route.distance} km <span className="text-slate-400">| {route.date}</span></div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={(e) => { e.stopPropagation(); renameRoute(route.id); }} className="p-1.5 bg-white rounded border"><Edit2 size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); shareRoute(route); }} className="p-1.5 bg-white rounded border"><Share2 size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); downloadGPX(route); }} className="p-1.5 bg-white rounded border"><Download size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }} className="p-1.5 bg-white rounded border text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {/* SETTINGS OVERLAY */}
        {showSettings && (
            <div className="absolute inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                <div className="bg-white w-full max-w-sm rounded-2xl p-5" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between mb-4"><h3 className="font-bold">Einstellungen</h3><button onClick={() => setShowSettings(false)}><X size={20}/></button></div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Pace (Min/km): {Math.floor(pace)}:{Math.round((pace % 1) * 60).toString().padStart(2, '0')}</label>
                    <input type="range" min="3.0" max="10.0" step="0.1" value={pace} onChange={(e) => setPace(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-500" />
                </div>
            </div>
        )}

        {/* CONTROLS */}
        <div className="absolute bottom-0 left-0 w-full p-3 z-[500] pointer-events-none">
            {error && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg shadow mb-2 border border-red-200 pointer-events-auto">{error}</div>}
            
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-slate-200 pointer-events-auto">
                
                {viewState === 'planning' && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase flex gap-1"><Ruler size={14} /> Strecke</span>
                            <button onClick={() => setShowSettings(!showSettings)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 rounded-full"><MoreVertical size={20} /></button>
                        </div>
                        <div className="mb-6 flex items-center gap-4">
                            <span className="text-2xl font-bold text-slate-800 min-w-[3ch]">{distance}</span>
                            <div className="flex-grow">
                                <input type="range" min="1" max="20" step="0.5" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600" />
                            </div>
                        </div>
                        <button onClick={generateRouteOptions} disabled={loading} className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />} <span>Route Planen</span>
                        </button>
                    </>
                )}

                {viewState === 'preview' && (
                    <div className="animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center mb-3">
                             <div className="text-xs font-bold text-slate-400 uppercase">Wähle eine Route</div>
                             <button onClick={resetPlanning} className="text-xs text-rose-500 font-bold">Abbrechen</button>
                        </div>
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                            {routeOptions.map((opt, idx) => (
                                <button key={idx} onClick={() => selectOption(opt, idx)} className={`flex-shrink-0 w-28 p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedOptionIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${selectedOptionIndex === idx ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</div>
                                    <span className="font-bold text-slate-800">{(opt.route.distance / 1000).toFixed(1)} km</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={confirmSelection} className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"><CheckCircle2 className="h-5 w-5" /> <span>Diese Route wählen</span></button>
                    </div>
                )}

                {viewState === 'ready' && (
                    <div className="animate-in slide-in-from-bottom-5">
                         <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                             <div><div className="text-[10px] text-slate-400 uppercase">Distanz</div><div className="font-bold text-xl text-slate-800 flex items-end gap-2">{actualDistance} km <span className="text-sm font-normal text-slate-500 mb-1">~{formatDuration(parseFloat(actualDistance))}</span></div></div>
                             <div className="flex gap-1">
                                <button onClick={toggleSaveRoute} className={`p-2 rounded-full ${isCurrentRouteSaved ? 'text-rose-500 bg-rose-50' : 'text-slate-400'}`}><Heart size={20} className={isCurrentRouteSaved ? "fill-current" : ""} /></button>
                                <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 rounded-full"><MoreVertical size={20} /></button>
                             </div>
                         </div>
                         <div className="flex gap-3">
                             <button onClick={resetPlanning} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2"><RefreshCw className="h-5 w-5" /> Neu</button>
                             <button onClick={goToExport} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><MapIcon className="h-5 w-5" /> <span>In Maps öffnen</span></button>
                         </div>
                    </div>
                )}

                {viewState === 'export' && (
                    <div className="animate-in slide-in-from-bottom-5">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Viel Spaß beim Laufen!</h3>
                            <p className="text-sm text-slate-500">Die Route wurde an deine Karten-App übergeben.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={openExternalMaps} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 text-lg hover:bg-blue-700">
                                <MapIcon size={24} /> <span>Jetzt starten (Maps)</span> <ExternalLink size={20} className="opacity-70" />
                            </button>
                            <button onClick={() => setViewState('ready')} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold flex items-center justify-center gap-2"><ArrowRight className="h-5 w-5 rotate-180" /> <span>Zurück</span></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}