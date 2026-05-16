const map3DElement = document.getElementById('map-3d');
const startBtn = document.getElementById('start-btn');
const timeEl = document.getElementById('elapsed-time');
const distEl = document.getElementById('distance');
const eleEl = document.getElementById('elevation');

let points = [];
let currentIndex = 0;
let animationId = null;

// Haversine distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function loadGPX() {
  try {
    const response = await fetch('/Bighorn_52_simulated.gpx');
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    let totalDist = 0;
    
    for (let i = 0; i < trkpts.length; i++) {
      const pt = trkpts[i];
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      const ele = pt.getElementsByTagName("ele")[0]?.textContent;
      const time = pt.getElementsByTagName("time")[0]?.textContent;
      
      if (i > 0) {
        totalDist += calculateDistance(
          points[i-1].lat, points[i-1].lng,
          lat, lon
        );
      }
      
      points.push({
        lat: lat,
        lng: lon,
        altitude: parseFloat(ele) || 0,
        time: new Date(time).getTime(),
        distance: totalDist
      });
    }
    
    const wpts = xmlDoc.getElementsByTagName("wpt");
    let aidStations = [];
    
    for (let i = 0; i < wpts.length; i++) {
      const wpt = wpts[i];
      const lat = parseFloat(wpt.getAttribute("lat"));
      const lon = parseFloat(wpt.getAttribute("lon"));
      const name = wpt.getElementsByTagName("name")[0]?.textContent || "Aid Station";
      const desc = wpt.getElementsByTagName("desc")[0]?.textContent || "";
      
      if (!name.toLowerCase().includes("start") && !name.toLowerCase().includes("finish")) {
        aidStations.push({
          lat: lat,
          lng: lon,
          name: name,
          desc: desc.replace(/<br\s*\/?>/gi, '\n'),
          distance: 0 // Will map to closest point
        });
      }
    }
    
    // Assign distances to aid stations based on closest track point
    aidStations.forEach(station => {
      let minDist = Infinity;
      let assignedDist = 0;
      let assignedAlt = 0;
      points.forEach(p => {
        const d = calculateDistance(station.lat, station.lng, p.lat, p.lng);
        if (d < minDist) {
          minDist = d;
          assignedDist = p.distance;
          assignedAlt = p.altitude;
        }
      });
      station.distance = assignedDist;
      station.altitude = assignedAlt;
    });
    
    // Sort by distance to compute next/prev
    aidStations.sort((a, b) => a.distance - b.distance);
    
    drawPath(aidStations);
    console.log(`Loaded ${points.length} points and ${aidStations.length} aid stations.`);
    
  } catch(e) {
    console.error("Failed to load GPX", e);
  }
}

let polyline;
let marker;
let aidMarkers = [];
let PinElement;

function drawPath(aidStations) {
  if (!map3DElement) return;
  
  // Custom elements for 3D Polyline
  polyline = document.createElement('gmp-polyline-3d');
  polyline.altitudeMode = "CLAMP_TO_GROUND";
  polyline.strokeColor = "rgba(56, 189, 248, 0.8)";
  polyline.strokeWidth = 8;
  polyline.coordinates = points.map(p => ({ lat: p.lat, lng: p.lng }));
  
  map3DElement.appendChild(polyline);
  
  // Custom element for 3D Marker (athlete)
  marker = document.createElement('gmp-marker-3d');
  marker.altitudeMode = "RELATIVE_TO_GROUND";
  marker.position = { lat: points[0].lat, lng: points[0].lng, altitude: 50 };
  marker.extruded = true;
  marker.drawsWhenOccluded = true;
  map3DElement.appendChild(marker);
  
  // Draw Aid Stations
  const panel = document.getElementById('aid-info-panel');
  const nameEl = document.getElementById('aid-name');
  const descEl = document.getElementById('aid-desc');
  const totalEl = document.getElementById('aid-total');
  const prevEl = document.getElementById('aid-prev');
  const nextEl = document.getElementById('aid-next');
  
  document.getElementById('close-aid-btn').addEventListener('click', () => {
    panel.style.display = 'none';
  });
  
  aidStations.forEach((station, index) => {
    const aidMarker = document.createElement('gmp-marker-3d');
    aidMarker.altitudeMode = "RELATIVE_TO_GROUND";
    aidMarker.position = { lat: station.lat, lng: station.lng, altitude: 50 };
    aidMarker.extruded = true;
    aidMarker.drawsWhenOccluded = true;
    
    // Basic styling for aid station markers
    if (PinElement) {
      const pin = new PinElement({
        background: "#eab308",
        borderColor: "#ca8a04",
        glyphColor: "#ffffff"
      });
      aidMarker.appendChild(pin.element);
    }
    
    aidMarker.addEventListener('gmp-click', () => {
      // Show info panel
      panel.style.display = 'block';
      nameEl.textContent = station.name;
      descEl.textContent = station.desc;
      totalEl.textContent = `${station.distance.toFixed(2)} km`;
      
      const prev = index > 0 ? aidStations[index - 1] : null;
      const next = index < aidStations.length - 1 ? aidStations[index + 1] : null;
      
      if (prev) {
        prevEl.textContent = `${(station.distance - prev.distance).toFixed(2)} km`;
      } else {
        prevEl.textContent = `N/A (Start)`;
      }
      
      if (next) {
        nextEl.textContent = `${(next.distance - station.distance).toFixed(2)} km`;
      } else {
        nextEl.textContent = `N/A (Finish)`;
      }
      
      // Pan camera slightly to view it better
      map3DElement.center = { lat: station.lat, lng: station.lng, altitude: station.altitude + 800 };
    });
    
    map3DElement.appendChild(aidMarker);
    aidMarkers.push(aidMarker);
  });
}

function updateHUD(point, startTime) {
  if (!point) return;
  const elapsedMs = point.time - startTime;
  const hrs = Math.floor(elapsedMs / 3600000);
  const mins = Math.floor((elapsedMs % 3600000) / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  
  timeEl.textContent = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  distEl.textContent = `${point.distance.toFixed(2)} km`;
  eleEl.textContent = `Elev: ${Math.round(point.altitude)} m`;
}

function animateSimulation() {
  if (currentIndex >= points.length) {
    cancelAnimationFrame(animationId);
    return;
  }
  
  const point = points[currentIndex];
  
  marker.position = { lat: point.lat, lng: point.lng, altitude: 50 };
  map3DElement.center = { lat: point.lat, lng: point.lng, altitude: point.altitude + 500 };
  map3DElement.heading = (map3DElement.heading + 0.1) % 360; // Slow rotation
  
  updateHUD(point, points[0].time);
  
  // Speed up simulation: jump 10 points per frame
  currentIndex += 10; 
  
  animationId = requestAnimationFrame(animateSimulation);
}

startBtn.addEventListener('click', () => {
  if (points.length > 0) {
    currentIndex = 0;
    startBtn.textContent = "Running...";
    startBtn.disabled = true;
    animateSimulation();
  }
});

// Wait for custom elements to be defined by Google Maps JS API
customElements.whenDefined('gmp-map-3d').then(async () => {
  const markerLib = await google.maps.importLibrary("marker");
  PinElement = markerLib.PinElement;
  loadGPX();
});
