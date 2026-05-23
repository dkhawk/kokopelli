const map3DElement = document.getElementById('map-3d');
const btnPlay = document.getElementById('btn-play');
const btnRev = document.getElementById('btn-rev');
const btnSlower = document.getElementById('btn-slower');
const btnFaster = document.getElementById('btn-faster');
const speedReadout = document.getElementById('speed-readout');
const cameraRangeSlider = document.getElementById('camera-range-slider');
const timeEl = document.getElementById('elapsed-time');
const distEl = document.getElementById('distance');
const eleEl = document.getElementById('elevation');

let points = [];
let currentIndex = 0;
let currentDistance = 0; // km
let lastTime = 0;
let animationId = null;
let aidStationsList = []; // Global reference

let isPlaying = false;
let playbackSpeed = 1.0;
let direction = 1;

let currentCameraLat = 0;
let currentCameraLng = 0;
let currentCameraAltitude = 0;
let currentCameraHeading = 45;
let currentCameraRange = 8000;

// Settings & Units
let unitSystem = localStorage.getItem('kokopelli_units');
if (!unitSystem) {
  const lang = navigator.language || '';
  if (lang.startsWith('en-US') || lang.startsWith('en-LR') || lang.startsWith('en-MM')) {
    unitSystem = 'imperial';
  } else {
    unitSystem = 'metric';
  }
}

function formatDistance(km) {
  if (unitSystem === 'imperial') {
    return `${(km * 0.621371).toFixed(2)} mi`;
  }
  return `${km.toFixed(2)} km`;
}

function formatElevation(m) {
  if (unitSystem === 'imperial') {
    return `Elev: ${Math.round(m * 3.28084)} ft`;
  }
  return `Elev: ${Math.round(m)} m`;
}

function formatElevationStat(m, prefix = "") {
  if (unitSystem === 'imperial') {
    return `${prefix}${Math.round(m * 3.28084)} ft`;
  }
  return `${prefix}${Math.round(m)} m`;
}

function smoothElevations() {
  if (points.length === 0) return;
  
  const k = 5; // Window size is 11 points (5 before, 5 after)
  const tempAlts = points.map(p => p.altitude);
  
  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - k); j <= Math.min(points.length - 1, i + k); j++) {
      sum += tempAlts[j];
      count++;
    }
    
    points[i].altitude = sum / count;
  }
}

function computeCumulativeElevations() {
  if (points.length === 0) return;
  
  let totalGain = 0;
  let totalLoss = 0;
  
  points[0].cumulativeGain = 0;
  points[0].cumulativeLoss = 0;
  
  const THRESHOLD = 0.5; // Ignore changes less than 50cm to filter micro-fluctuations
  
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].altitude - points[i - 1].altitude;
    if (Math.abs(diff) >= THRESHOLD) {
      if (diff > 0) {
        totalGain += diff;
      } else {
        totalLoss += Math.abs(diff);
      }
    }
    points[i].cumulativeGain = totalGain;
    points[i].cumulativeLoss = totalLoss;
  }
  
  const totalDist = points[points.length - 1].distance;
  
  const courseTotalDistEl = document.getElementById('course-total-dist');
  const courseTotalGainEl = document.getElementById('course-total-gain');
  const courseTotalLossEl = document.getElementById('course-total-loss');
  
  if (courseTotalDistEl) {
    courseTotalDistEl.textContent = formatDistance(totalDist);
  }
  if (courseTotalGainEl) {
    courseTotalGainEl.textContent = formatElevationStat(totalGain, "+");
  }
  if (courseTotalLossEl) {
    courseTotalLossEl.textContent = formatElevationStat(totalLoss, "-");
  }
}

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

// Bearing calculation for camera
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;
  
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
            
  const theta = Math.atan2(y, x);
  return (theta * toDeg + 360) % 360;
}

// Get point at exact distance along polyline
function getInterpolatedPoint(targetDistance) {
  if (points.length === 0) return null;
  if (targetDistance <= points[0].distance) return points[0];
  if (targetDistance >= points[points.length - 1].distance) return points[points.length - 1];
  
  for (let i = 0; i < points.length - 1; i++) {
    if (targetDistance >= points[i].distance && targetDistance <= points[i + 1].distance) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segmentDist = p2.distance - p1.distance;
      if (segmentDist === 0) return p1;
      
      const fraction = (targetDistance - p1.distance) / segmentDist;
      return {
        lat: p1.lat + (p2.lat - p1.lat) * fraction,
        lng: p1.lng + (p2.lng - p1.lng) * fraction,
        altitude: p1.altitude + (p2.altitude - p1.altitude) * fraction,
        distance: targetDistance,
        time: p1.time + (p2.time - p1.time) * fraction
      };
    }
  }
  return points[points.length - 1];
}

// Spherical linear interpolation for heading (handles 360 wrap)
function slerpHeading(current, target, factor) {
  let diff = target - current;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  
  let newHeading = current + diff * factor;
  while (newHeading < 0) newHeading += 360;
  return newHeading % 360;
}

// Fetch elevation from Open-Meteo if missing
async function fetchElevationData(pts) {
  console.log("Fetching elevation data from Open-Meteo...");
  const BATCH_SIZE = 30; // Reduced to prevent HTTP 414 URI Too Long errors
  
  for (let i = 0; i < pts.length; i += BATCH_SIZE) {
    const batch = pts.slice(i, i + BATCH_SIZE);
    const lats = batch.map(p => p.lat).join(',');
    const lons = batch.map(p => p.lng).join(',');
    
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
      const data = await res.json();
      if (data.elevation) {
        for (let j = 0; j < batch.length; j++) {
          pts[i + j].altitude = data.elevation[j] || 0;
        }
      }
    } catch(e) {
      console.error("Failed to fetch elevation batch", e);
    }
  }
  console.log("Elevation data fetched.");
  smoothElevations();
  computeCumulativeElevations();
  drawElevationProfile();
}

function resetSimulation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  isPlaying = false;
  
  if (polyline) {
    map3DElement.removeChild(polyline);
    polyline = null;
  }
  if (marker) {
    map3DElement.removeChild(marker);
    marker = null;
  }
  aidMarkers.forEach(m => map3DElement.removeChild(m));
  aidMarkers = [];
  
  points = [];
  aidStationsList = [];
  currentIndex = 0;
  currentDistance = 0;
  lastTime = 0;
  currentCameraAltitude = 0; // Trigger reset
  
  updateSpeedReadout();
  timeEl.textContent = "00:00:00";
  distEl.textContent = formatDistance(0);
  eleEl.textContent = formatElevation(0);
  
  const runnerGainEl = document.getElementById('runner-gain');
  if (runnerGainEl) runnerGainEl.textContent = formatElevationStat(0, "Gain: +");
  
  const courseTotalDistEl = document.getElementById('course-total-dist');
  const courseTotalGainEl = document.getElementById('course-total-gain');
  const courseTotalLossEl = document.getElementById('course-total-loss');
  if (courseTotalDistEl) courseTotalDistEl.textContent = formatDistance(0);
  if (courseTotalGainEl) courseTotalGainEl.textContent = formatElevationStat(0, "+");
  if (courseTotalLossEl) courseTotalLossEl.textContent = formatElevationStat(0, "-");
  
  nextAidEl.textContent = "Next: N/A";
  
  const canvas = document.getElementById('elevation-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function processLoadedData(xmlDoc, isKML) {
  if (isKML) {
    parseKML(xmlDoc);
  } else {
    parseGPX(xmlDoc);
  }
  
  aidStationsList.forEach(station => {
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
  
  aidStationsList.sort((a, b) => a.distance - b.distance);
  
  const hasElevation = points.some(p => p.altitude > 0);
  if (!hasElevation && points.length > 0) {
    fetchElevationData(points);
  } else if (hasElevation && points.length > 0) {
    smoothElevations();
    computeCumulativeElevations();
  }
  
  drawPath(aidStationsList);
  
  if (points.length > 0) {
    updateHUD(points[0], points[0].time);
    drawElevationProfile();
    focusOnRoute();
  }
  
  console.log(`Loaded ${points.length} points and ${aidStationsList.length} aid stations.`);
}

function focusOnRoute() {
  if (points.length === 0 || !map3DElement) return;
  
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  
  // Roughly 111,000 meters per degree. Multiply by 1.5 for padding.
  const idealRange = Math.max(5000, maxDiff * 111000 * 1.5);
  
  currentCameraLat = centerLat;
  currentCameraLng = centerLng;
  currentCameraAltitude = 1000;
  currentCameraHeading = 0;
  currentCameraRange = idealRange;
  
  map3DElement.center = { lat: centerLat, lng: centerLng, altitude: currentCameraAltitude };
  map3DElement.heading = currentCameraHeading;
  map3DElement.tilt = 0; // Overhead
  map3DElement.range = currentCameraRange;
  
  const slider = document.getElementById('camera-range-slider');
  if (slider) {
    if (idealRange > parseFloat(slider.max)) {
      slider.max = Math.ceil(idealRange / 10000) * 10000;
    }
    slider.value = currentCameraRange;
  }
}

function parseGPX(xmlDoc) {
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
      time: time ? new Date(time).getTime() : 0,
      distance: totalDist
    });
  }
  
  const wpts = xmlDoc.getElementsByTagName("wpt");
  for (let i = 0; i < wpts.length; i++) {
    const wpt = wpts[i];
    const lat = parseFloat(wpt.getAttribute("lat"));
    const lon = parseFloat(wpt.getAttribute("lon"));
    const name = wpt.getElementsByTagName("name")[0]?.textContent || "Aid Station";
    const desc = wpt.getElementsByTagName("desc")[0]?.textContent || "";
    
    if (!name.toLowerCase().includes("start") && !name.toLowerCase().includes("finish")) {
      aidStationsList.push({
        lat: lat,
        lng: lon,
        name: name,
        desc: desc.replace(/<br\s*\/?>/gi, '\n'),
        distance: 0
      });
    }
  }
  
  if (points.length > 0 && points[0].time === 0) {
    injectSyntheticTime();
  }
}

function parseKML(xmlDoc) {
  const coordinatesTags = xmlDoc.getElementsByTagName("coordinates");
  let mainCoordsStr = "";
  
  for (let i = 0; i < coordinatesTags.length; i++) {
    const parent = coordinatesTags[i].parentNode.nodeName;
    if (parent === "LineString") {
       if (coordinatesTags[i].textContent.length > mainCoordsStr.length) {
         mainCoordsStr = coordinatesTags[i].textContent;
       }
    }
  }
  
  const coords = mainCoordsStr.trim().split(/\s+/);
  let totalDist = 0;
  
  for (let i = 0; i < coords.length; i++) {
    const parts = coords[i].split(',');
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const alt = parts.length >= 3 ? parseFloat(parts[2]) : 0;
      
      if (points.length > 0) {
        totalDist += calculateDistance(
          points[points.length-1].lat, points[points.length-1].lng,
          lat, lon
        );
      }
      
      points.push({
        lat: lat,
        lng: lon,
        altitude: alt,
        time: 0,
        distance: totalDist
      });
    }
  }
  
  injectSyntheticTime();
  
  const placemarks = xmlDoc.getElementsByTagName("Placemark");
  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const point = pm.getElementsByTagName("Point")[0];
    if (point) {
      const coordsNode = point.getElementsByTagName("coordinates")[0];
      const nameNode = pm.getElementsByTagName("name")[0];
      const descNode = pm.getElementsByTagName("description")[0];
      if (coordsNode) {
        const parts = coordsNode.textContent.trim().split(',');
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const name = nameNode ? nameNode.textContent : "Waypoint";
        const desc = descNode ? descNode.textContent : "";
        
        if (!name.toLowerCase().includes("start") && !name.toLowerCase().includes("finish")) {
          aidStationsList.push({
            lat: lat,
            lng: lon,
            name: name,
            desc: desc.replace(/<br\s*\/?>/gi, '\n'),
            distance: 0
          });
        }
      }
    }
  }
}

function injectSyntheticTime() {
  const startTime = Date.now();
  for (let i = 0; i < points.length; i++) {
    points[i].time = startTime + (points[i].distance / 10) * 3600000;
  }
}

async function loadGPX() {
  try {
    const response = await fetch('/Bighorn_52_simulated.gpx');
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    processLoadedData(xmlDoc, false);
    
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
    const aidMarker = document.createElement('gmp-marker-3d-interactive');
    aidMarker.altitudeMode = "RELATIVE_TO_GROUND";
    aidMarker.position = { lat: station.lat, lng: station.lng, altitude: 50 };
    aidMarker.extruded = true;
    aidMarker.drawsWhenOccluded = true;
    aidMarker.label = station.name;
    
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
      totalEl.textContent = formatDistance(station.distance);
      
      const prev = index > 0 ? aidStations[index - 1] : null;
      const next = index < aidStations.length - 1 ? aidStations[index + 1] : null;
      
      if (prev) {
        prevEl.textContent = formatDistance(station.distance - prev.distance);
      } else {
        prevEl.textContent = `N/A (Start)`;
      }
      
      if (next) {
        nextEl.textContent = formatDistance(next.distance - station.distance);
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

const nextAidEl = document.getElementById('next-aid-status');
const canvas = document.getElementById('elevation-canvas');
const ctx = canvas.getContext('2d');
let isScrubbing = false;

function updateHUD(point, startTime) {
  if (!point) return;
  const elapsedMs = point.time - startTime;
  const hrs = Math.floor(elapsedMs / 3600000);
  const mins = Math.floor((elapsedMs % 3600000) / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  
  timeEl.textContent = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  distEl.textContent = formatDistance(point.distance);
  eleEl.textContent = formatElevation(point.altitude);
  
  const runnerGainEl = document.getElementById('runner-gain');
  if (runnerGainEl) {
    const gain = point.cumulativeGain || 0;
    runnerGainEl.textContent = formatElevationStat(gain, "Gain: +");
  }
  
  const nextAid = aidStationsList.find(s => s.distance > point.distance);
  if (nextAid) {
    nextAidEl.textContent = `Next: ${nextAid.name} in ${formatDistance(nextAid.distance - point.distance)}`;
  } else {
    nextAidEl.textContent = `Next: Finish`;
  }
}

function drawElevationProfile() {
  if (points.length === 0 || !canvas || !ctx) return;
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  
  if (rect.width === 0 || rect.height === 0) return;
  
  if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }
  
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  
  let minElev = Infinity;
  let maxElev = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const alt = points[i].altitude;
    if (alt < minElev) minElev = alt;
    if (alt > maxElev) maxElev = alt;
  }
  
  const elevRange = maxElev - minElev || 1;
  
  // 1. Draw Background Profile (Dimly lit)
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < points.length; i++) {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((points[i].altitude - minElev) / elevRange) * h * 0.8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Dim grey/white
  ctx.fill();
  
  // Background stroke
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((points[i].altitude - minElev) / elevRange) * h * 0.8;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2 * dpr;
  ctx.stroke();

  // 2. Draw Progress Overlay (Bright accent color)
  if (currentIndex >= 0 && currentIndex < points.length) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= currentIndex; i++) {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((points[i].altitude - minElev) / elevRange) * h * 0.8;
      ctx.lineTo(x, y);
    }
    
    // Drop down to bottom
    const curX = (currentIndex / (points.length - 1)) * w;
    ctx.lineTo(curX, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)'; // Bright accent
    ctx.fill();
    
    // Progress stroke
    ctx.beginPath();
    for (let i = 0; i <= currentIndex; i++) {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((points[i].altitude - minElev) / elevRange) * h * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8'; // Solid accent
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
    
    // Current position marker line and dot
    const cy = h - ((points[currentIndex].altitude - minElev) / elevRange) * h * 0.8;
    
    ctx.beginPath();
    ctx.moveTo(curX, 0);
    ctx.lineTo(curX, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(curX, cy, 5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

function scrubTo(e) {
  if (points.length === 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, x / rect.width));
  currentIndex = Math.floor(pct * (points.length - 1));
  
  const point = points[currentIndex];
  currentDistance = point.distance;
  if (marker && map3DElement) {
    marker.position = { lat: point.lat, lng: point.lng, altitude: 50 };
    currentCameraLat = point.lat;
    currentCameraLng = point.lng;
    currentCameraAltitude = point.altitude + 800; // Reset smoothed altitude on jump
    map3DElement.center = { lat: currentCameraLat, lng: currentCameraLng, altitude: currentCameraAltitude };
  }
  updateHUD(point, points[0].time);
  drawElevationProfile();
}

canvas.addEventListener('mousedown', (e) => {
  isScrubbing = true;
  scrubTo(e);
});

window.addEventListener('mousemove', (e) => {
  if (isScrubbing) scrubTo(e);
});

window.addEventListener('mouseup', () => {
  isScrubbing = false;
});

// Also redraw on resize
window.addEventListener('resize', () => {
  if (points.length > 0) drawElevationProfile();
});

// Playback Controls
function updateSpeedReadout() {
  const dirStr = direction === -1 ? "-" : "";
  speedReadout.textContent = `Speed: ${dirStr}${playbackSpeed.toFixed(1)}x`;
  btnPlay.innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9654;";
}

btnPlay.addEventListener('click', () => {
  isPlaying = !isPlaying;
  updateSpeedReadout();
  if (isPlaying) {
    lastTime = 0; // Reset lastTime on play
    animationId = requestAnimationFrame(animateSimulation);
  } else {
    cancelAnimationFrame(animationId);
  }
});

btnRev.addEventListener('click', () => {
  direction = direction === 1 ? -1 : 1;
  updateSpeedReadout();
});

btnSlower.addEventListener('click', () => {
  playbackSpeed = Math.max(0.1, playbackSpeed - 0.1);
  updateSpeedReadout();
});

btnFaster.addEventListener('click', () => {
  playbackSpeed = Math.min(5.0, playbackSpeed + 0.1);
  updateSpeedReadout();
});

cameraRangeSlider.addEventListener('input', (e) => {
  currentCameraRange = parseFloat(e.target.value);
  if (map3DElement) {
    map3DElement.range = currentCameraRange;
  }
});

function animateSimulation(time) {
  if (!isPlaying) return;
  if (points.length === 0) return; // Prevent crashes if clicked before GPX is loaded
  if (!lastTime) lastTime = time;
  
  const dt = (time - lastTime) / 1000; // delta time in seconds
  lastTime = time;
  
  // Base speed: 1.5 km per simulated second at 1.0x (160km takes ~106s)
  const baseSpeedKms = 1.5; 
  currentDistance += baseSpeedKms * playbackSpeed * direction * dt;
  
  const totalDistance = points[points.length - 1].distance;
  
  if (currentDistance >= totalDistance) {
    currentDistance = totalDistance;
    if (direction === 1) {
      isPlaying = false;
      updateSpeedReadout();
    }
  } else if (currentDistance <= 0) {
    currentDistance = 0;
    if (direction === -1) {
      isPlaying = false;
      updateSpeedReadout();
    }
  }
  
  // Find current point for camera and HUD
  const point = getInterpolatedPoint(currentDistance);
  if (!point) return;
  
  // Update currentIndex for the elevation progress overlay
  currentIndex = 0;
  while (currentIndex < points.length - 1 && points[currentIndex + 1].distance <= currentDistance) {
    currentIndex++;
  }
  
  if (currentCameraAltitude === 0) {
    currentCameraLat = point.lat;
    currentCameraLng = point.lng;
    currentCameraAltitude = point.altitude + 800;
  }
  
  // Apply a loose "bungee" lerp to the camera's focal point.
  // This creates a soft deadzone/hysteresis so the camera isn't jerked around 
  // by every tiny GPS deviation, giving the marker room to move.
  currentCameraLat += (point.lat - currentCameraLat) * 0.05;
  currentCameraLng += (point.lng - currentCameraLng) * 0.05;
  currentCameraAltitude += ((point.altitude + 800) - currentCameraAltitude) * 0.05;
  
  // Dynamic Follow Cam with heavily smoothed Lookahead and SLERP
  const lookaheadSeconds = 20.0; // Much further lookahead to anticipate wide turns
  const simSpeedMps = 150.0; 
  const lookaheadDist = point.distance + (direction * simSpeedMps * lookaheadSeconds / 1000); // km
  const lookaheadPos = getInterpolatedPoint(lookaheadDist);
  
  if (lookaheadPos) {
    const mathHeading = calculateBearing(point.lat, point.lng, lookaheadPos.lat, lookaheadPos.lng);
    currentCameraHeading = slerpHeading(currentCameraHeading, mathHeading, 0.015); // Heavily damp the turn rate
  }
  
  marker.position = { lat: point.lat, lng: point.lng, altitude: 50 };
  map3DElement.center = { lat: currentCameraLat, lng: currentCameraLng, altitude: currentCameraAltitude };
  map3DElement.heading = currentCameraHeading;
  map3DElement.tilt = 50; // Lowered from 65 to not be overly horizontal
  map3DElement.range = currentCameraRange;
  
  updateHUD(point, points[0].time);
  drawElevationProfile();
  
  animationId = requestAnimationFrame(animateSimulation);
}

// Settings Modal Logic
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const unitSelect = document.getElementById('unit-select');

// File Upload Logic
const fileInput = document.getElementById('route-file-input');
const openRouteBtn = document.getElementById('open-route-btn');

if (openRouteBtn && fileInput) {
  openRouteBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const isKML = file.name.toLowerCase().endsWith('.kml');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      resetSimulation();
      const text = event.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      const titleEl = document.querySelector('#control-panel h1');
      if (titleEl) {
        let name = file.name.replace(/\.(gpx|kml)$/i, '').replace(/_/g, ' ');
        // capitalize first letter of words
        name = name.replace(/\b\w/g, c => c.toUpperCase());
        titleEl.textContent = name + " Telemetry";
      }
      
      processLoadedData(xmlDoc, isKML);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  });
}

// Initialize select to correct value
unitSelect.value = unitSystem;

settingsBtn.addEventListener('click', () => {
  settingsPanel.style.display = 'block';
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
});

unitSelect.addEventListener('change', (e) => {
  unitSystem = e.target.value;
  localStorage.setItem('kokopelli_units', unitSystem);
  
  if (points.length > 0 && currentIndex < points.length) {
    computeCumulativeElevations();
    updateHUD(points[currentIndex], points[0].time);
    drawElevationProfile();
  }
});

// Google Drive Integration Logic
const driveRouteSelect = document.getElementById('drive-route-select');
const driveStatus = document.getElementById('drive-status');

async function fetchDriveFiles() {
  const folderId = '1WAuggyzEi4x2n869lbEXZr9FFprv_0l4';
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    showDriveError("No API Key configured.");
    return;
  }
  
  try {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false+and+(name+contains+'.gpx'+or+name+contains+'.kml')&orderBy=name&fields=files(id,name,mimeType)&key=${apiKey}`;
    
    const res = await fetch(listUrl);
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Drive API returned error status:", res.status, errData);
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }
    
    const data = await res.json();
    if (!data.files || data.files.length === 0) {
      showDriveError("No routes found in folder.");
      return;
    }
    
    driveRouteSelect.innerHTML = `<option value="" disabled selected>Select from Drive...</option>`;
    
    data.files.forEach(file => {
      const opt = document.createElement('option');
      opt.value = file.id;
      opt.textContent = file.name.replace(/\.(gpx|kml)$/i, '').replace(/_/g, ' ');
      opt.dataset.isKml = file.name.toLowerCase().endsWith('.kml') ? "true" : "false";
      opt.dataset.name = file.name;
      driveRouteSelect.appendChild(opt);
    });
    
    driveStatus.style.display = 'none';
    driveRouteSelect.style.display = 'inline-block';
  } catch (e) {
    console.error("Error fetching Google Drive folder content:", e);
    showDriveError("Drive API Error (Click to open folder)");
  }
}

function showDriveError(msg) {
  driveStatus.textContent = `⚠️ ${msg}`;
  driveStatus.classList.add('error');
  driveStatus.title = "Click to open the Google Drive folder in a new tab";
  driveStatus.onclick = () => {
    window.open("https://drive.google.com/drive/folders/1WAuggyzEi4x2n869lbEXZr9FFprv_0l4", "_blank");
  };
}

async function loadDriveFile(fileId, fileName, isKML) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return;
  
  const titleEl = document.querySelector('#control-panel h1');
  const prevTitle = titleEl ? titleEl.textContent : "";
  if (titleEl) {
    titleEl.textContent = "Loading route from Drive...";
  }
  
  try {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    
    console.log(`Fetching file ${fileName} directly from Google Drive API...`);
    const res = await fetch(downloadUrl);
    
    if (!res.ok) {
      throw new Error(`Failed to download route (HTTP ${res.status})`);
    }
    
    const text = await res.text();
    resetSimulation();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    if (titleEl) {
      let cleanName = fileName.replace(/\.(gpx|kml)$/i, '').replace(/_/g, ' ');
      cleanName = cleanName.replace(/\b\w/g, c => c.toUpperCase());
      titleEl.textContent = cleanName + " Telemetry";
    }
    
    processLoadedData(xmlDoc, isKML);
  } catch (e) {
    console.error("Error downloading file from Google Drive:", e);
    if (titleEl) {
      titleEl.textContent = prevTitle;
    }
    alert(`Could not load route: ${e.message}\n\nPlease try downloading it from Drive and opening it manually using the 'Open Local' button.`);
  }
}

if (driveRouteSelect) {
  driveRouteSelect.addEventListener('change', (e) => {
    const selectedOption = driveRouteSelect.options[driveRouteSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;
    
    const fileId = selectedOption.value;
    const fileName = selectedOption.dataset.name;
    const isKML = selectedOption.dataset.isKml === "true";
    
    loadDriveFile(fileId, fileName, isKML);
  });
}

// Wait for custom elements to be defined by Google Maps JS API
customElements.whenDefined('gmp-map-3d').then(async () => {
  const markerLib = await google.maps.importLibrary("marker");
  PinElement = markerLib.PinElement;
  loadGPX();
  fetchDriveFiles();
});
