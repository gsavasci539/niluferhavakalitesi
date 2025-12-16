from math import cos, sin, radians, exp
from typing import List, Tuple, Dict

# Bursa Nilüfer approximate center
NILUFER_LAT = 40.232
NILUFER_LNG = 28.949

# Simple haversine-like small-distance conversion (meters to degrees)
# 1 degree lat ~ 111,320 m; 1 degree lon ~ 111,320 * cos(lat)
M_PER_DEG_LAT = 111_320.0
M_PER_DEG_LON = M_PER_DEG_LAT * cos(radians(NILUFER_LAT))


def meters_to_deg_lat(d_m: float) -> float:
    return d_m / M_PER_DEG_LAT


def meters_to_deg_lng(d_m: float, lat: float = NILUFER_LAT) -> float:
    return d_m / (111_320.0 * cos(radians(lat)))


def dir_to_compass(deg: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    ix = int((deg % 360) / 45.0 + 0.5) % 8
    return dirs[ix]


def color_scale(pm25: float) -> str:
    # Very simple AQI-like color bands for PM2.5
    if pm25 < 12:
        return "#2ecc71"  # Good
    if pm25 < 35.5:
        return "#f1c40f"  # Moderate
    if pm25 < 55.5:
        return "#e67e22"  # Unhealthy for sensitive
    if pm25 < 150.5:
        return "#e74c3c"  # Unhealthy
    return "#8e44ad"       # Very unhealthy/hazardous


def simulate_dispersion(
    wind_speed: float,
    wind_dir_deg: float,
    base_pm25: float,
    base_pm10: float,
    base_no2: float,
    base_so2: float,
    base_co: float,
    num_rays: int = 9,
    max_distance_m: int = 5000,
    step_m: int = 500,
) -> Dict:
    """Generate points along rays centered at wind_dir_deg.
    Higher wind spreads further, we apply exponential decay with distance and lateral offset.
    """
    points = []

    # Angular spread depends on wind speed (narrower if wind is strong)
    spread_deg = max(15, 60 - wind_speed * 3)  # between 15..60 roughly

    if num_rays < 1:
        num_rays = 1

    half = num_rays // 2
    angles: List[float] = []
    for i in range(-half, half + 1):
        frac = i / max(1, half)
        angles.append(wind_dir_deg + frac * spread_deg)

    # Decay parameters
    decay_km = 2.0  # baseline decay per km
    lateral_sigma_deg = spread_deg / 2.0

    for ang in angles:
        theta = radians(ang)
        lateral_offset = abs(ang - wind_dir_deg)
        lateral_weight = exp(-(lateral_offset ** 2) / (2 * (lateral_sigma_deg ** 2) + 1e-6))

        d = step_m
        while d <= max_distance_m:
            # Distance decay (km)
            km = d / 1000.0
            decay = exp(-km / decay_km)

            # Base concentrations decayed and modulated laterally
            pm25 = base_pm25 * decay * lateral_weight
            pm10 = base_pm10 * decay * lateral_weight
            no2 = base_no2 * decay * lateral_weight
            so2 = base_so2 * decay * lateral_weight
            co = base_co * decay * lateral_weight

            # Position
            dx = d * sin(theta)
            dy = d * cos(theta)  # wind_dir 0 => from North to South visually, but we just place geometrically
            lat = NILUFER_LAT + meters_to_deg_lat(dy)
            lng = NILUFER_LNG + meters_to_deg_lng(dx)

            cloud_radius = max(60, int(120 * (1 + wind_speed / 5)))
            color = color_scale(pm25)

            points.append({
                "lat": lat,
                "lng": lng,
                "pm25": round(pm25, 2),
                "pm10": round(pm10, 2),
                "no2": round(no2, 2),
                "so2": round(so2, 2),
                "co": round(co, 3),
                "distance_m": d,
                "cloudRadius": cloud_radius,
                "color": color,
            })

            d += step_m

    meta = {
        "source": {"lat": NILUFER_LAT, "lng": NILUFER_LNG},
        "wind_speed": wind_speed,
        "wind_dir_deg": wind_dir_deg,
        "wind_dir_compass": dir_to_compass(wind_dir_deg),
    }

    return {"meta": meta, "points": points}
