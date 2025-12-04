import React, { useState, useEffect, useRef } from 'react';
import { Navigation, RefreshCw, Footprints, Ruler, Search, MoreVertical, X, Settings, Play, Map as MapIcon, StopCircle, Heart, List, Trash2, Calendar, Edit2, Share2, CheckCircle2, User, LogOut, Cloud, Sun, CloudRain, Download, Clock, BarChart3 } from 'lucide-react';

/* --- BESUCHER TRACKING ANLEITUNG ---
   Damit du sehen kannst, wie viele Leute auf der Website sind:
   1. Gehe auf analytics.google.com (kostenlos).
   2. Erstelle ein Konto und kopiere deine "Mess-ID" (z.B. G-12345678).
   3. Füge sie unten bei "GA_MEASUREMENT_ID" ein.
*/
const GA_MEASUREMENT_ID = ""; // Hier ID eintragen, z.B. "G-ABC123XYZ"

// Leaflet Map Komponente
const LeafletMap = ({ center, routeCoords, markers, onMarkerDragEnd, isNavigating, userLocation, previewMode }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => initMap();
    document.body.appendChild(script);

    return () => {};
  }, []);

  const initMap = () => {
    if (!window.L || mapInstanceRef.current) return;

    mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: false 
    }).setView(center, 15);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    updateMapContent();
  };

  useEffect(() => {
      if (isNavigating && mapInstanceRef.current && userLocation) {
          mapInstanceRef.current.setView(userLocation, 18, { animate: true });
      }
  }, [isNavigating, userLocation]);

  useEffect(() => {
    if (window.L && mapInstanceRef.current) {
      updateMapContent();
    }
  }, [center, routeCoords, markers, isNavigating]);

  const updateMapContent = () => {
    const map = mapInstanceRef.current;
    const L = window.L;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    if (!isNavigating) {
        markers.forEach((m) => {
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${m.color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        const marker = L.marker(m.pos, { icon }).addTo(map);
        markersRef.current.push(marker);
        });
    }

    if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
    }

    const userIcon = L.divIcon({
        className: 'user-pos-icon',
        html: isNavigating 
            ? `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); position: relative;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid white;"></div>
               </div>` 
            : `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5); cursor: grab;"></div>`,
        iconSize: [isNavigating ? 24 : 20, isNavigating ? 24 : 20],
        iconAnchor: [isNavigating ? 12 : 10, isNavigating ? 12 : 10]
    });

    userMarkerRef.current = L.marker(center, { 
        icon: userIcon, 
        zIndexOffset: 1000,
        draggable: !isNavigating 
    }).addTo(map);

    if (!isNavigating) {
        userMarkerRef.current.bindPopup("Start & Ziel (Verschiebbar)");
        userMarkerRef.current.on('dragend', function(event) {
            const marker = event.target;
            const position = marker.getLatLng();
            if (onMarkerDragEnd) {
                onMarkerDragEnd([position.lat, position.lng]);
            }
        });
    }

    if (routeCoords && routeCoords.length > 0) {
      let color = '#ef4444';
      let opacity = 0.8;
      
      if (isNavigating) color = '#3b82f6';
      else if (previewMode) {
          color = '#8b5cf6'; // Lila für Preview
          opacity = 0.9;
      }

      polylineRef.current = L.polyline(routeCoords, {
        color: color, 
        weight: isNavigating ? 8 : 5,
        opacity: opacity,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      if (!isNavigating) {
        map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
      }
    } else {
       if (!isNavigating) map.panTo(center);
    }
  };

  return <div ref={mapRef} className="w-full h-full z-0" />;
};

export default function App() {
  const [distance, setDistance] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState([52.5200, 13.4050]); 
  
  // Route States
  const [routeCoords, setRouteCoords] = useState([]);
  const [waypoints, setWaypoints] = useState([]); 
  const [actualDistance, setActualDistance] = useState(0);
  
  // Multiple Options State
  const [routeOptions, setRouteOptions] = useState([]); 
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  
  // Save State Management
  const [isCurrentRouteSaved, setIsCurrentRouteSaved] = useState(false);
  const [currentSavedRouteId, setCurrentSavedRouteId] = useState(null);

  const [isNavigating, setIsNavigating] = useState(false);

  // Weather & Pace
  const [weather, setWeather] = useState(null);
  const [pace, setPace] = useState(6.0); 

  // Local Storage (Routes)
  const [savedRoutes, setSavedRoutes] = useState(() => {
      try {
          const saved = localStorage.getItem('laufRoutenPlaner_routes');
          return saved ? JSON.parse(saved) : [];
      } catch (e) {
          return [];
      }
  });

  useEffect(() => {
      localStorage.setItem('laufRoutenPlaner_routes', JSON.stringify(savedRoutes));
  }, [savedRoutes]);

  // Google Analytics Integration
  useEffect(() => {
      if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.length > 5) {
          // Lade das Google Tag Skript dynamisch
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
          document.head.appendChild(script);

          const script2 = document.createElement('script');
          script2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `;
          document.head.appendChild(script2);
      }
  }, []);

  // Fetch Weather
  useEffect(() => {
      if (userLocation) {
          fetchWeather(userLocation[0], userLocation[1]);
      }
  }, [userLocation]);

  const fetchWeather = async (lat, lon) => {
      try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          const data = await res.json();
          setWeather(data.current_weather);
      } catch (e) {
          console.error("Wetter konnte nicht geladen werden", e);
      }
  };

  const watchIdRef = useRef(null);

  useEffect(() => {
    locateUser();
    return () => stopWatching();
  }, []);

  useEffect(() => {
      if (isNavigating) {
          startWatching();
      } else {
          stopWatching();
      }
  }, [isNavigating]);

  const startWatching = () => {
      if (!navigator.geolocation) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
              setUserLocation([position.coords.latitude, position.coords.longitude]);
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
  };

  const stopWatching = () => {
      if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }
  };

  const locateUser = () => {
    if (isNavigating) return; 
    setLoading(true);
    if (!navigator.geolocation) {
      setError("Geolocation nicht verfügbar.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLoading(false);
        setError(null);
      },
      (err) => {
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
          if (!response.ok) throw new Error("Search service error");
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
          setError("Fehler bei der Ortssuche: " + (err.message || "Unbekannter Fehler"));
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

  // --- NEUER ALGORITHMUS FÜR VIERECKIGE RUNDKURSE ---
  // Erstellt ein Polygon (Viereck) NEBEN dem Startpunkt, damit man im Kreis läuft.
  const fetchSingleRoute = async (loopRadius, directionAngle) => {
      
      // Berechne das Zentrum des Kreises/Vierecks "neben" dem User
      const loopCenter = moveCoordinate(userLocation[0], userLocation[1], loopRadius, directionAngle);

      // Basis-Winkel zurück zum User (User ist eine Ecke des Vierecks)
      const baseAngle = directionAngle + 180; 

      // 3 Weitere Ecken eines Quadrats um das Zentrum
      const wp1 = moveCoordinate(loopCenter[0], loopCenter[1], loopRadius, baseAngle + 90);
      const wp2 = moveCoordinate(loopCenter[0], loopCenter[1], loopRadius, baseAngle + 180); 
      const wp3 = moveCoordinate(loopCenter[0], loopCenter[1], loopRadius, baseAngle + 270);

      // Start -> Ecke 1 -> Ecke 2 -> Ecke 3 -> Start
      const coordinatesString = `
        ${userLocation[1]},${userLocation[0]};
        ${wp1[1]},${wp1[0]};
        ${wp2[1]},${wp2[0]};
        ${wp3[1]},${wp3[0]};
        ${userLocation[1]},${userLocation[0]}
      `.replace(/\s/g, '');

      // 'continue_straight=false' ist wichtig, damit OSRM Wenden vermeidet
      const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coordinatesString}?overview=full&geometries=geojson&continue_straight=false`);
      if (!response.ok) throw new Error(`Routing Service Error: ${response.status}`);
      const data = await response.json();
      if (!data.routes || data.routes.length === 0) throw new Error("Keine Route gefunden");
      
      return {
          route: data.routes[0],
          waypoints: [wp1, wp2, wp3],
          angle: directionAngle 
      };
  };

  // --- PRÄZISIONS-SCHLEIFE ---
  // Versucht bis zu 5x, den Radius so anzupassen, dass die Distanz fast exakt stimmt.
  const generatePreciseRouteOption = async (initialRadius, angleOffset, targetDistance) => {
      let currentRadius = initialRadius;
      let bestResult = null;
      let minDiff = Infinity;
      
      // Erhöhe Versuche für bessere Genauigkeit
      for (let attempt = 0; attempt < 5; attempt++) {
          try {
              // Beim Retry leicht variieren ("Jitter"), um Sackgassen zu umgehen
              if (attempt > 0) {
                  const jitter = 0.95 + Math.random() * 0.1; 
                  currentRadius = currentRadius * jitter;
              }

              const result = await fetchSingleRoute(currentRadius, angleOffset);
              const resultDist = result.route.distance / 1000; 
              const diff = Math.abs(resultDist - targetDistance);

              // Merke dir das bisher beste Ergebnis
              if (diff < minDiff) {
                  minDiff = diff;
                  bestResult = { ...result, actualDist: resultDist };
              }

              // Wenn Abweichung <= 0.5km, akzeptieren wir sofort!
              if (diff <= 0.5) {
                  return bestResult;
              }

              // Mathematische Korrektur für den nächsten Versuch
              // Wenn Strecke zu lang -> Radius kleiner.
              const ratio = targetDistance / resultDist;
              // Begrenze die Änderung, damit der Radius nicht explodiert oder null wird
              const safeRatio = Math.max(0.6, Math.min(1.4, ratio));
              currentRadius = currentRadius * safeRatio;
              
          } catch (e) {
              console.warn(`Routing-Versuch ${attempt+1} fehlgeschlagen.`);
          }
      }
      return bestResult;
  };

  const generateRouteOptions = async () => {
    setLoading(true);
    setError(null);
    setRouteCoords([]);
    setRouteOptions([]);
    setSelectedOptionIndex(null);
    setIsNavigating(false);
    setIsCurrentRouteSaved(false);
    setCurrentSavedRouteId(null);
    
    try {
      // Annahme: Luftlinie * 1.3 = Wegstrecke (Durchschnitt für gemischte Gebiete)
      const windingFactor = 1.3; 
      // Umfang Quadrat = 4 * (Radius * Wurzel(2)). Wir vereinfachen für Kreis-Analogie.
      // Grobe Startschätzung für Radius
      const initialRadius = (distance / windingFactor) / (2 * Math.PI); 
      
      // 3 Winkel für 3 völlig verschiedene Richtungen (Nord, Süd-Ost, Süd-West)
      const angles = [0, 120, 240];

      // Parallel 3 optimierte Routen berechnen
      const promises = angles.map(angle => 
          generatePreciseRouteOption(initialRadius, angle, distance)
            .then(res => res ? { ...res, success: true } : { success: false })
      );

      const results = await Promise.all(promises);
      const validOptions = results.filter(r => r.success);

      if (validOptions.length === 0) {
          throw new Error("Konnte keine Route in passender Länge finden. Bitte versuche es später erneut oder wechsle den Startpunkt.");
      }

      setRouteOptions(validOptions);
      selectOption(validOptions[0], 0);

    } catch (err) {
      console.error("Routing Error:", err.message || err);
      setError("Fehler bei der Berechnung. Der Routing-Server ist evtl. überlastet.");
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
  };

  const resetPlanning = () => {
      setRouteCoords([]);
      setRouteOptions([]);
      setActualDistance(0);
      setIsCurrentRouteSaved(false);
      setCurrentSavedRouteId(null);
      setSelectedOptionIndex(null);
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

      const shareText = `🏃‍♂️ Ich habe eine Laufstrecke geplant: "${route.name}" (${route.distance}km). \n\nHier ist die Route auf Google Maps:\n${mapsUrl}`;

      if (navigator.share) {
          navigator.share({
              title: 'Meine Laufrunde',
              text: shareText,
              url: mapsUrl
          }).catch(console.error);
      } else {
          const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          window.open(waUrl, '_blank');
      }
  };

  const downloadGPX = (route) => {
      const gpxData = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LaufRoutenPlaner">
  <metadata>
    <name>${route.name}</name>
    <desc>Laufstrecke generiert mit LaufRoutenPlaner - Distanz: ${route.distance}km</desc>
  </metadata>
  <trk>
    <name>${route.name}</name>
    <trkseg>
      ${route.coords.map(c => `<trkpt lat="${c[0]}" lon="${c[1]}"></trkpt>`).join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;

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
      setShowSavedRoutes(false);
  };

  const openExternalMaps = () => {
      if (waypoints.length < 3) return;
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIOS) {
          const destination = `${userLocation[0]},${userLocation[1]}`;
          const wpString = waypoints.map(wp => `${wp[0]},${wp[1]}`).join('+to:');
          const url = `http://maps.apple.com/?dirflg=w&daddr=${wpString}+to:${destination}`;
          window.open(url, '_system');
      } else {
          const origin = `${userLocation[0]},${userLocation[1]}`;
          const destination = `${userLocation[0]},${userLocation[1]}`;
          const waypointsStr = waypoints.map(wp => `${wp[0]},${wp[1]}`).join('|');
          
          const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsStr}&travelmode=walking`;
          window.open(url, '_blank');
      }
  };

  const openSavedRoutes = () => {
      setShowSavedRoutes(true);
  };

  const formatDuration = (km) => {
      const totalMinutes = km * pace;
      const h = Math.floor(totalMinutes / 60);
      const m = Math.round(totalMinutes % 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m} min`;
  };

  const getWeatherIcon = (code) => {
      if (code === undefined) return <Cloud size={18} />;
      if (code <= 1) return <Sun size={18} className="text-amber-500" />;
      if (code <= 3) return <Cloud size={18} className="text-slate-400" />;
      return <CloudRain size={18} className="text-blue-400" />;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Header */}
      {!isNavigating && (
        <div className="bg-white shadow-md z-20 p-3 flex flex-col gap-3 flex-shrink-0 animate-in slide-in-from-top-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-500">
                    <Footprints className="h-6 w-6" />
                    <h1 className="font-bold text-lg tracking-tight">LaufRunde</h1>
                </div>
                
                <div className="flex gap-2 items-center">
                    {/* Visitor Tracking Info Icon (Optional) */}
                    {GA_MEASUREMENT_ID && <BarChart3 size={14} className="text-slate-300" title="Analytics Active" />}

                    {weather && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-100">
                            {getWeatherIcon(weather.weathercode)}
                            <span>{Math.round(weather.temperature)}°C</span>
                        </div>
                    )}

                    <button 
                        onClick={openSavedRoutes} 
                        className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-200 transition border border-slate-200"
                        title="Gespeicherte Routen"
                    >
                        <List className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={locateUser} 
                        className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-200 transition border border-slate-200"
                        title="Mein GPS Standort"
                    >
                        <Navigation className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <form onSubmit={handleManualLocationSearch} className="relative w-full">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ort suchen (z.B. Stadtpark)..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </form>
        </div>
      )}

      {/* Navigations-Header */}
      {isNavigating && (
          <div className="absolute top-0 left-0 w-full z-20 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg inline-flex items-center gap-3 pointer-events-auto">
                  <Navigation className="h-6 w-6 animate-pulse" />
                  <div>
                      <div className="font-bold text-sm">Navigation aktiv</div>
                      <div className="text-[10px] opacity-80">Folge der blauen Linie</div>
                  </div>
              </div>
          </div>
      )}

      {/* Map Container */}
      <div className="flex-grow relative z-10">
        <LeafletMap 
          center={userLocation} 
          routeCoords={routeCoords} 
          markers={[]}
          onMarkerDragEnd={handleMarkerDrag}
          isNavigating={isNavigating}
          userLocation={userLocation}
          previewMode={routeOptions.length > 0}
        />

        {/* OVERLAY: SAVED ROUTES */}
        {showSavedRoutes && (
             <div className="absolute inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-all" onClick={() => setShowSavedRoutes(false)}>
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Heart size={18} className="text-rose-500 fill-rose-500"/> Meine Routen</h3>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => setShowSavedRoutes(false)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                        </div>
                    </div>
                    
                    <div className="p-4 overflow-y-auto">
                        {savedRoutes.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">
                                <Footprints className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Keine Routen gespeichert.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {savedRoutes.map(route => (
                                    <div key={route.id} className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 ${currentSavedRouteId === route.id ? 'border-rose-400 bg-rose-50' : 'border-slate-100'}`}>
                                        <div 
                                            className="flex-grow cursor-pointer flex justify-between items-start"
                                            onClick={() => loadRoute(route)}
                                        >
                                            <div>
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    {route.name || `Lauf ${route.distance}km`}
                                                </div>
                                                <div className="text-sm font-semibold text-emerald-600 mt-0.5 flex items-center gap-2">
                                                    <span>{route.distance} km</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-slate-500 flex items-center gap-1 text-xs font-normal">
                                                        <Clock size={10} /> ~{formatDuration(parseFloat(route.distance))}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                    <Calendar size={10} /> {route.date}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-1 border-t border-slate-200/50 pt-2 justify-end">
                                             <button onClick={(e) => { e.stopPropagation(); renameRoute(route.id); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Umbennen"><Edit2 size={16} /></button>
                                             <button onClick={(e) => { e.stopPropagation(); shareRoute(route); }} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Teilen"><Share2 size={16} /></button>
                                             <button onClick={(e) => { e.stopPropagation(); downloadGPX(route); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="GPX Download"><Download size={16} /></button>
                                             <button onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Löschen"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
             </div>
        )}

        {/* OVERLAY: SETTINGS */}
        {showSettings && (
            <div className="absolute inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-all" onClick={() => setShowSettings(false)}>
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={18}/> Einstellungen</h3>
                        <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                    </div>
                    <div className="p-5 space-y-6">
                        {/* Pace Setting */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-slate-600">Deine Pace (Min/km)</label>
                                <span className="text-sm font-bold text-rose-500">{Math.floor(pace)}:{Math.round((pace % 1) * 60).toString().padStart(2, '0')}</span>
                            </div>
                            <input 
                                type="range" 
                                min="3.0" max="10.0" step="0.1"
                                value={pace} 
                                onChange={(e) => setPace(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>Schnell (3:00)</span>
                                <span>Gemütlich (10:00)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* BOTTOM CONTROLS */}
        <div className="absolute bottom-0 left-0 w-full p-3 z-[500] pointer-events-none">
            {error && (
                <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg shadow mb-2 border border-red-200 pointer-events-auto">
                    {error}
                </div>
            )}

            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-slate-200 pointer-events-auto transition-all duration-300">
                
                {/* 1. STATE: PLANNING (No Route & No Options) */}
                {!isNavigating && routeOptions.length === 0 && routeCoords.length === 0 && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Ruler size={14} /> Strecke</span>
                            <button onClick={() => setShowSettings(!showSettings)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 rounded-full"><MoreVertical size={20} /></button>
                        </div>
                        <div className="mb-6 flex items-center gap-4">
                            <span className="text-2xl font-bold text-slate-800 min-w-[3ch]">{distance}</span>
                            <div className="flex-grow">
                                <input type="range" min="1" max="20" step="0.5" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                            </div>
                        </div>
                        <button onClick={generateRouteOptions} disabled={loading} className="w-full py-3 px-4 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
                            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                            <span>Route Planen</span>
                        </button>
                    </>
                )}

                {/* 1.5 STATE: SELECTION (Multiple Options) */}
                {!isNavigating && routeOptions.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center mb-3">
                             <div className="text-xs font-bold text-slate-400 uppercase">Wähle eine Route</div>
                             <button onClick={resetPlanning} className="text-xs text-rose-500 font-bold hover:underline">Abbrechen</button>
                        </div>
                        
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                            {routeOptions.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => selectOption(opt, idx)}
                                    className={`
                                        flex-shrink-0 w-28 p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1
                                        ${selectedOptionIndex === idx ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-white hover:border-slate-200'}
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${selectedOptionIndex === idx ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="font-bold text-slate-800">{(opt.route.distance / 1000).toFixed(1)} km</span>
                                </button>
                            ))}
                        </div>

                        <button onClick={confirmSelection} className="w-full py-3 px-4 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Diese Route wählen</span>
                        </button>
                    </div>
                )}

                {/* 2. STATE: ROUTE CONFIRMED (Ready to start) */}
                {!isNavigating && routeCoords.length > 0 && routeOptions.length === 0 && (
                    <div className="animate-in slide-in-from-bottom-5">
                         
                         <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                             <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Vorschlag</div>
                                <div className="font-bold text-xl text-slate-800 flex items-end gap-2">
                                    {actualDistance} km
                                    <span className="text-sm font-normal text-slate-500 mb-1 flex items-center gap-1">
                                        <Clock size={12}/> ~{formatDuration(parseFloat(actualDistance))}
                                    </span>
                                </div>
                             </div>
                             <div className="flex gap-1">
                                <button 
                                    onClick={toggleSaveRoute} 
                                    className={`p-2 rounded-full transition-colors ${isCurrentRouteSaved ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`} 
                                    title={isCurrentRouteSaved ? "Route entfernen" : "Route speichern"}
                                >
                                    <Heart size={20} className={isCurrentRouteSaved ? "fill-current" : ""} />
                                </button>
                                <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><MoreVertical size={20} /></button>
                             </div>
                         </div>
                         
                         <div className="flex gap-3">
                             <button onClick={resetPlanning} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                                <RefreshCw className="h-5 w-5" />
                                <span>Neu Planen</span>
                             </button>
                             
                             <button onClick={() => setIsNavigating(true)} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-95">
                                <Play className="h-5 w-5 fill-current" />
                                <span>Starten</span>
                             </button>
                         </div>
                    </div>
                )}

                {/* 3. STATE: NAVIGATING (Active) */}
                {isNavigating && (
                    <div className="animate-in slide-in-from-bottom-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-grow">
                                <div className="text-[10px] text-slate-400 uppercase">Ziel</div>
                                <div className="font-bold text-xl text-slate-800">{actualDistance} km</div>
                            </div>

                            <button onClick={openExternalMaps} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex flex-col items-center justify-center gap-1 shadow-sm" title="In Karten App öffnen">
                                <MapIcon size={20} />
                                <span className="text-[10px] font-medium">Maps App</span>
                            </button>

                            <button onClick={() => setIsNavigating(false)} className="py-3 px-6 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-xl font-bold flex items-center justify-center gap-2">
                                <StopCircle className="h-5 w-5" />
                                <span>Beenden</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}