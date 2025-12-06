import React, { useState, useEffect, useRef } from 'react';
import { Navigation, RefreshCw, Footprints, Ruler, Search, MoreVertical, X, Settings, Map as MapIcon, StopCircle, Heart, List, Trash2, Calendar, Edit2, Share2, CheckCircle2, Cloud, Sun, CloudRain, Download, Clock, BarChart3, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';

// Google Analytics Konfiguration (optional, sonst leer lassen)
const GA_MEASUREMENT_ID = ""; 

// Leaflet Map Komponente mit modernem "Google Maps"-Design
const LeafletMap = ({ center, routeCoords, markers, onMarkerDragEnd, userLocation, viewState, onMapReady }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const borderLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Leaflet Styles laden falls noch nicht vorhanden
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    // Leaflet Script laden
    if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => initMap();
        document.body.appendChild(script);
    } else {
        initMap();
    }

    // Cleanup beim Schließen
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
        attributionControl: false 
    }).setView(center, 15);

    // NEUER STYLE: CartoDB Voyager (Heller, moderner Look ähnlich Google Maps)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(mapInstanceRef.current);

    // Zoom Control unten rechts
    window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

    // Attribution klein unten rechts
    window.L.control.attribution({ position: 'bottomright', prefix: false }).addTo(mapInstanceRef.current);

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

    // Alte Route entfernen
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    if (borderLayerRef.current) map.removeLayer(borderLayerRef.current);
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);

    // Startpunkt Marker (Pulsierend beim Planen) - Farbe angepasst (Schwarz/Dunkelgrau statt Blau)
    const pulseHtml = viewState === 'planning' 
        ? `<div class="relative flex items-center justify-center w-full h-full">
             <div class="absolute w-full h-full bg-slate-800/30 rounded-full animate-ping"></div>
             <div style="background-color: #1e293b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); position: relative; z-index: 10;"></div>
           </div>`
        : `<div style="background-color: #1e293b; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`;

    const userIcon = L.divIcon({
        className: 'user-pos-icon',
        html: pulseHtml,
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

    // ROUTE ZEICHNEN (Google Maps Style - angepasst auf dunkleres Thema)
    if (routeCoords && routeCoords.length > 0) {
      // 1. Dicker Rand (für Kontrast zur Straße)
      borderLayerRef.current = L.polyline(routeCoords, {
        color: '#0f172a', // Sehr dunkles Blau/Schwarz
        weight: 8, 
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 2. Hauptlinie (Jetzt in einem kräftigen Anthrazit/Blau-Ton statt Hellblau)
      routeLayerRef.current = L.polyline(routeCoords, {
        color: '#334155', // Slate-700
        weight: 5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      // Karte auf Route zentrieren (außer im Planungsmodus)
      if (viewState !== 'planning') {
          map.fitBounds(routeLayerRef.current.getBounds(), { 
              padding: [40, 40],
              maxZoom: 16 
          });
      }
    } else {
       if (viewState === 'planning') map.panTo(center);
    }
  };

  return <div ref={mapRef} className="w-full h-full z-0 bg-[#eef2f6]" />;
};

export default function App() {
  const [distance, setDistance] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState([52.5200, 13.4050]); 
  
  const [routeCoords, setRouteCoords] = useState([]);
  const [waypoints, setWaypoints] = useState([]); 
  const [actualDistance, setActualDistance] = useState(0);
  
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

  // Google Analytics Injection (Manuell, um Paketfehler zu vermeiden)
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
    if (viewState !== 'planning') return; // Nur aktualisieren beim Planen, sonst springt die Karte
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
      
      for (let attempt = 0; attempt < 3; attempt++) {
          try {
              if (attempt > 0) {
                  const jitter = 0.95 + Math.random() * 0.1; 
                  currentRadius = currentRadius * jitter;
              }
              const result = await fetchSingleRoute(currentRadius, angleOffset);
              const resultDist = result.route.distance / 1000; 
              const diff = Math.abs(resultDist - targetDistance);

              if (diff < minDiff) {
                  minDiff = diff;
                  bestResult = { ...result, actualDist: resultDist };
              }

              if (diff <= 0.5) return bestResult; // Nah genug!

              const ratio = targetDistance / resultDist;
              const safeRatio = Math.max(0.6, Math.min(1.4, ratio));
              currentRadius = currentRadius * safeRatio;
          } catch (e) { /* ignore */ }
      }
      return bestResult;
  };

  const generateRouteOptions = async () => {
    setLoading(true);
    setError(null);
    setRouteCoords([]);
    setRouteOptions([]);
    setSelectedOptionIndex(null);
    // setViewState('preview'); // NICHT sofort umschalten, erst wenn fertig
    setIsCurrentRouteSaved(false);
    setCurrentSavedRouteId(null);
    
    try {
      const initialRadius = (distance / 1.35) / (2 * Math.PI); 
      const angles = [0, 120, 240]; 

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
      setViewState('preview'); // JETZT erst umschalten

    } catch (err) {
      console.error(err);
      setError("Konnte Route nicht berechnen. Server ausgelastet oder Ort ungeeignet.");
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
      setViewState('planning');
  };

  const toggleSaveRoute = () => {
      if (isCurrentRouteSaved && currentSavedRouteId) {
          setSavedRoutes(prev => prev.filter(r => r.id !== currentSavedRouteId));
          setIsCurrentRouteSaved(false);
      } else {
          const newId = Date.now();
          const newRoute = {
              id: newId,
              name: `Lauf ${new Date().toLocaleDateString()}`,
              coords: routeCoords,
              distance: actualDistance,
              startLocation: userLocation,
              date: new Date().toLocaleDateString(),
              waypoints: waypoints
          };
          setSavedRoutes([newRoute, ...savedRoutes]);
          setIsCurrentRouteSaved(true);
          setCurrentSavedRouteId(newId);
      }
  };

  const deleteRoute = (id) => {
      setSavedRoutes(prev => prev.filter(r => r.id !== id));
      if (currentSavedRouteId === id) setIsCurrentRouteSaved(false);
  };

  const renameRoute = (id) => {
      const route = savedRoutes.find(r => r.id === id);
      if (!route) return;
      const newName = window.prompt("Name:", route.name);
      if (newName?.trim()) {
          setSavedRoutes(savedRoutes.map(r => r.id === id ? { ...r, name: newName.trim() } : r));
      }
  };

  const shareRoute = (route) => {
      const origin = `${route.startLocation[0]},${route.startLocation[1]}`;
      const waypointsStr = route.waypoints ? route.waypoints.map(wp => `${wp[0]},${wp[1]}`).join('|') : '';
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${waypointsStr}&travelmode=walking`;
      const shareText = `🏃‍♂️ ${route.name} (${route.distance}km)\n${mapsUrl}`;
      if (navigator.share) navigator.share({ title: 'LaufRunde', text: shareText, url: mapsUrl }).catch(()=>{});
      else window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const downloadGPX = (route) => {
      const gpxData = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1"><trk><name>${route.name}</name><trkseg>${route.coords.map(c => `<trkpt lat="${c[0]}" lon="${c[1]}"></trkpt>`).join('')}</trkseg></trk></gpx>`;
      const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `route.gpx`;
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
      
      {/* Floating Header - Jetzt eleganter & cleaner */}
      {viewState !== 'export' && (
        <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col gap-2">
            <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl p-3 flex items-center justify-between border border-white/40 transition-all hover:shadow-3xl">
                <div className="flex items-center gap-2 text-slate-800 pl-2">
                    <Footprints className="h-6 w-6 fill-slate-800" />
                    <span className="font-black text-lg tracking-tight">LaufRunde</span>
                </div>
                
                <div className="flex gap-2">
                    {weather && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                            {getWeatherIcon(weather.weathercode)}
                            <span>{Math.round(weather.temperature)}°C</span>
                        </div>
                    )}
                    <button onClick={() => setShowSavedRoutes(true)} className="p-2.5 bg-white text-slate-700 rounded-full shadow-sm hover:bg-slate-50 hover:scale-105 hover:shadow-md transition-all border border-slate-100 group">
                        <List size={20} className="group-hover:text-black transition-colors"/>
                    </button>
                    <button onClick={locateUser} className="p-2.5 bg-slate-900 text-white rounded-full shadow-md hover:bg-black hover:scale-105 hover:shadow-lg transition-all">
                        <Navigation size={20} />
                    </button>
                </div>
            </div>
            {/* Search Bar */}
            {viewState === 'planning' && (
                 <form onSubmit={handleManualLocationSearch} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full p-1 flex items-center border border-white/20 hover:shadow-xl transition-all">
                    <Search className="ml-4 text-slate-400 h-5 w-5" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Startpunkt suchen..." className="w-full p-3 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400" />
                </form>
            )}
        </div>
      )}

      {/* Map */}
      <div className="flex-grow relative z-0">
        <LeafletMap 
          center={userLocation} 
          routeCoords={routeCoords} 
          markers={[]}
          onMarkerDragEnd={handleMarkerDrag}
          userLocation={userLocation}
          viewState={viewState}
        />
      </div>

      {/* SAVED ROUTES OVERLAY - Modernes Glassmorphism Design */}
      {showSavedRoutes && (
            <div className="absolute inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in" onClick={() => setShowSavedRoutes(false)}>
            <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden max-h-[75vh] flex flex-col border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-black text-xl tracking-tight text-slate-800">Meine Routen</h3>
                    <button onClick={() => setShowSavedRoutes(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-3 scrollbar-hide">
                    {savedRoutes.length === 0 && <p className="text-center text-slate-400 py-12 font-medium">Noch nichts gespeichert.</p>}
                    {savedRoutes.map(route => (
                        <div key={route.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group" onClick={() => loadRoute(route)}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-bold text-slate-800 text-lg">{route.name}</span>
                                <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full text-slate-500 uppercase tracking-wide">{route.date}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                                <span className="flex items-center gap-1.5 font-medium"><Ruler size={16} className="text-slate-400"/> {route.distance} km</span>
                                <span className="flex items-center gap-1.5 font-medium"><Clock size={16} className="text-slate-400"/> ~{formatDuration(parseFloat(route.distance))}</span>
                            </div>
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); renameRoute(route.id); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors" title="Umbennen"><Edit2 size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); shareRoute(route); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors" title="Teilen"><Share2 size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); downloadGPX(route); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors" title="GPX Download"><Download size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors" title="Löschen"><Trash2 size={14}/></button>
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
            <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between mb-8 items-center"><h3 className="font-black text-2xl text-slate-800">Einstellungen</h3><button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={24}/></button></div>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="font-bold text-slate-700">Lauf-Tempo</label>
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{Math.floor(pace)}:{Math.round((pace % 1) * 60).toString().padStart(2, '0')} min/km</span>
                        </div>
                        <input type="range" min="3.0" max="10.0" step="0.1" value={pace} onChange={(e) => setPace(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none accent-slate-900 cursor-pointer hover:accent-black" />
                        <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider"><span>Schnell</span><span>Gemütlich</span></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* LOADING INDICATOR */}
      {loading && (
          <div className="absolute inset-0 z-[700] flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in zoom-in-95 border border-white/20">
                  <Loader2 className="animate-spin text-slate-900" size={24} />
                  <span className="font-bold text-slate-800">Route wird berechnet...</span>
              </div>
          </div>
      )}

      {/* BOTTOM CONTROLS - Modernes Card Design */}
      <div className="absolute bottom-0 left-0 w-full p-4 z-[500]">
        {error && <div className="bg-red-500 text-white text-sm p-4 rounded-2xl shadow-xl mb-4 font-bold flex items-center gap-3 animate-in slide-in-from-bottom-5"><X size={18}/> {error}</div>}
        
        <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl p-6 border border-white/40 transition-all">
            
            {/* 1. PLANNING */}
            {viewState === 'planning' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Wunschdistanz</span>
                        <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-full transition-all"><Settings size={20}/></button>
                    </div>
                    <div className="flex items-end gap-3 mb-8">
                        <span className="text-5xl font-black text-slate-900 tracking-tighter">{distance}</span>
                        <span className="text-lg font-bold text-slate-400 mb-2">km</span>
                        <input type="range" min="1" max="20" step="0.5" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value))} className="flex-grow h-2 bg-slate-200 rounded-full appearance-none accent-slate-900 ml-4 cursor-pointer hover:accent-black" />
                    </div>
                    <button onClick={generateRouteOptions} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 hover:bg-black hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Route finden
                    </button>
                </>
            )}

            {/* 2. PREVIEW */}
            {viewState === 'preview' && (
                <div className="animate-in slide-in-from-bottom-10">
                    <div className="flex justify-between items-center mb-6">
                        <span className="font-black text-slate-900 text-lg">Wähle eine Variante</span>
                        <button onClick={resetPlanning} className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">Abbrechen</button>
                    </div>
                    <div className="flex gap-4 mb-6 overflow-x-auto pb-2 snap-x scrollbar-hide">
                        {routeOptions.map((opt, idx) => (
                            <button key={idx} onClick={() => selectOption(opt, idx)} className={`flex-shrink-0 w-28 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 snap-center group ${selectedOptionIndex === idx ? 'border-slate-900 bg-slate-50 shadow-lg scale-105' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-colors ${selectedOptionIndex === idx ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>{idx + 1}</div>
                                <span className="font-bold text-slate-800">{(opt.route.distance / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">km</span></span>
                            </button>
                        ))}
                    </div>
                    <button onClick={confirmSelection} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 hover:bg-black hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" /> Diese Route wählen
                    </button>
                </div>
            )}

            {/* 3. READY */}
            {viewState === 'ready' && (
                <div className="animate-in slide-in-from-bottom-10">
                     <div className="flex justify-between items-start mb-8">
                         <div>
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Distanz</div>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">{actualDistance} <span className="text-lg text-slate-400 font-bold">km</span></div>
                            <div className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-2 bg-slate-100 w-fit px-3 py-1 rounded-lg"><Clock size={14}/> {formatDuration(parseFloat(actualDistance))}</div>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={toggleSaveRoute} className={`p-3.5 rounded-2xl transition-all hover:scale-105 hover:shadow-md border ${isCurrentRouteSaved ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}>
                                <Heart size={24} className={isCurrentRouteSaved ? "fill-current" : ""} />
                            </button>
                            <button onClick={() => setShowSettings(!showSettings)} className="p-3.5 bg-white text-slate-400 rounded-2xl hover:bg-slate-50 border border-slate-100 hover:text-slate-700 transition-all hover:shadow-sm"><MoreVertical size={24} /></button>
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-3 gap-3">
                         <button onClick={resetPlanning} className="col-span-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors flex flex-col items-center justify-center gap-1">
                            <RefreshCw size={20} /> <span className="text-xs">Neu</span>
                         </button>
                         <button onClick={goToExport} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-300 hover:bg-black hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg">
                            Starten <ArrowRight size={24}/>
                         </button>
                     </div>
                </div>
            )}

            {/* 4. EXPORT */}
            {viewState === 'export' && (
                <div className="text-center animate-in zoom-in-95 py-4">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <MapIcon size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Route bereit!</h3>
                    <p className="text-slate-500 mb-8 px-4 font-medium">Deine Route wurde berechnet. Übergebe sie jetzt an Google Maps für die Navigation.</p>
                    
                    <button onClick={openExternalMaps} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        📍 In Google Maps öffnen
                    </button>
                    
                    <button onClick={() => setViewState('ready')} className="mt-6 text-slate-400 font-bold text-sm hover:text-slate-700 hover:underline transition-all">
                        Zurück zur Übersicht
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}