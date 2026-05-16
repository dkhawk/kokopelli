import xml.etree.ElementTree as ET
import math
import datetime
import sys

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def main(input_gpx, output_gpx, duration_hours):
    tree = ET.parse(input_gpx)
    root = tree.getroot()
    
    # Strip namespaces for finding, but we need to keep them for output. 
    # Actually, xml.etree preserves namespaces when saving, but finding is tricky.
    ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    ET.register_namespace('', 'http://www.topografix.com/GPX/1/1')
    
    trkpts = root.findall('.//gpx:trkpt', ns)
    if not trkpts:
        print("No track points found")
        return
        
    distances = [0.0]
    total_dist = 0.0
    
    for i in range(1, len(trkpts)):
        lat1 = float(trkpts[i-1].get('lat'))
        lon1 = float(trkpts[i-1].get('lon'))
        lat2 = float(trkpts[i].get('lat'))
        lon2 = float(trkpts[i].get('lon'))
        d = haversine(lat1, lon1, lat2, lon2)
        total_dist += d
        distances.append(total_dist)
        
    total_seconds = duration_hours * 3600
    wpts = root.findall('.//gpx:wpt', ns)
    
    # Parse waypoints
    aid_stations = []
    for wpt in wpts:
        lat = float(wpt.get('lat'))
        lon = float(wpt.get('lon'))
        desc = wpt.find('gpx:desc', ns)
        name = wpt.find('gpx:name', ns)
        desc_text = desc.text.lower() if desc is not None and desc.text else ""
        name_text = name.text.lower() if name is not None and name.text else ""
        
        if "start" in name_text or "finish" in name_text:
            continue
            
        stop_time = 0
        if "major aid" in desc_text:
            stop_time = 15 * 60 # 15 mins
        elif "moderate aid" in desc_text:
            stop_time = 7 * 60 # 7 mins
        elif "minimal aid" in desc_text:
            stop_time = 2 * 60 # 2 mins
            
        if stop_time > 0:
            # If it's a major aid station later in the race (e.g. Dry Fork at mile 34.5), add more time
            if "dry fork" in name_text:
                stop_time = 25 * 60 # 25 mins
                
            aid_stations.append({
                'lat': lat,
                'lon': lon,
                'stop_seconds': stop_time,
                'visited': False
            })

    total_stop_seconds = sum(station['stop_seconds'] for station in aid_stations)
    total_running_seconds = total_seconds - total_stop_seconds
    if total_running_seconds < 0:
        total_running_seconds = total_seconds

    start_time = datetime.datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
    current_time = start_time
    
    for i, pt in enumerate(trkpts):
        if i > 0:
            d = distances[i] - distances[i-1]
            fraction = d / total_dist if total_dist > 0 else 0
            elapsed = fraction * total_running_seconds
            current_time += datetime.timedelta(seconds=elapsed)
            
        # Check if we are at an aid station
        lat = float(pt.get('lat'))
        lon = float(pt.get('lon'))
        for station in aid_stations:
            if not station['visited'] and haversine(lat, lon, station['lat'], station['lon']) < 100:
                # Arrived at aid station, add stop time
                current_time += datetime.timedelta(seconds=station['stop_seconds'])
                station['visited'] = True
                print(f"Stopped at aid station for {station['stop_seconds']/60} mins")
                
        time_el = ET.SubElement(pt, '{http://www.topografix.com/GPX/1/1}time')
        time_el.text = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
    tree.write(output_gpx, xml_declaration=True, encoding='utf-8')
    print(f"Generated {output_gpx} with {len(trkpts)} points and total time {duration_hours} hours.")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python simulate_gpx.py <input> <output> <hours>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]))
