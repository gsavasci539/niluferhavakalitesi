from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import SimulateRequest, HealthResponse
from .dispersion import simulate_dispersion
import math
import requests
from datetime import datetime, timezone
import asyncio
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import os
from pathlib import Path

app = FastAPI(title="Bursa Nilüfer – Hava Kirliliği Yayılım API", version="1.0.0")

@app.get("/")
async def root():
    return {
        "message": "Bursa Nilüfer – Hava Kirliliği Yayılım API",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/environment/full",
            "/test", 
            "/environment/bounding-box",
            "/environment/current",
            "/simulate",
            "/export/csv",
            "/export/excel"
        ]
    }

# CORS for local dev frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()


LAT = 40.2133
LON = 28.9771
SCALE = 0.01

NILUFER_BOUNDING_BOX = {
    "lat_min": 40.170,
    "lat_max": 40.260,
    "lon_min": 28.900,
    "lon_max": 29.050
}


def _wind_vector(speed: float, direction: float) -> dict:
    theta = math.radians(direction + 180)
    return {
        "vx": round(speed * math.cos(theta), 3),
        "vy": round(speed * math.sin(theta), 3),
    }


def _pm25_to_aqi(pm: float) -> int:
    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
    ]
    for clo, chi, ilo, ihi in breakpoints:
        if clo <= pm <= chi:
            return round(((ihi - ilo) / (chi - clo)) * (pm - clo) + ilo)
    return 300


def _first_present(d: dict, keys: list[str]):
    for k in keys:
        if k in d:
            return d.get(k)
    return None


def _get_json(url: str, params: dict, timeout: int):
    resp = requests.get(url, params=params, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and data.get("error") is True:
        reason = data.get("reason") or data.get("message") or "Unknown upstream error"
        raise HTTPException(status_code=502, detail=f"Upstream API error: {reason}")
    return data


@app.get("/environment/full")
async def environment_full():
    try:
        # Make API calls in parallel for better performance
        with ThreadPoolExecutor(max_workers=3) as executor:
            air_current_future = executor.submit(
                _get_json,
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                {
                    "latitude": LAT,
                    "longitude": LON,
                    "current": "pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide",
                },
                10,
            )
            
            air_hourly_future = executor.submit(
                _get_json,
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                {
                    "latitude": LAT,
                    "longitude": LON,
                    "hourly": "pm10,pm2_5",
                    "past_days": 7,
                    "forecast_days": 3,
                    "domains": "cams_europe",
                },
                15,
            )
            
            weather_future = executor.submit(
                _get_json,
                "https://api.open-meteo.com/v1/forecast",
                {
                    "latitude": LAT,
                    "longitude": LON,
                    "current": "wind_speed_10m,wind_direction_10m",
                    "hourly": "wind_speed_10m,wind_direction_10m",
                    "past_days": 7,
                    "forecast_days": 3,
                },
                15,
            )
            
            # Get results
            air_current = air_current_future.result()
            air_hourly = air_hourly_future.result()
            weather = weather_future.result()

        ac = air_current.get("current") or {}
        current_ts = ac.get("time")
        pm25 = _first_present(ac, ["pm2_5"])
        pm10 = _first_present(ac, ["pm10"])
        no2 = _first_present(ac, ["nitrogen_dioxide", "no2"])
        so2 = _first_present(ac, ["sulphur_dioxide", "so2"])
        co = _first_present(ac, ["carbon_monoxide", "co"])

        wc = weather.get("current") or {}
        wind_speed = wc.get("wind_speed_10m")
        wind_dir = wc.get("wind_direction_10m")
        if current_ts is None:
            current_ts = wc.get("time")
        if current_ts is None:
            current_ts = datetime.now(timezone.utc).isoformat()

        if wind_speed is None or wind_dir is None:
            raise HTTPException(status_code=502, detail="Upstream API error: missing weather current fields")

        vector = _wind_vector(speed=float(wind_speed), direction=float(wind_dir))

        ah = air_hourly.get("hourly") or {}
        wh = weather.get("hourly") or {}

        air_time = ah.get("time", [])
        weather_time = wh.get("time", [])
        hourly_time = weather_time if weather_time else air_time

        pm25_arr = ah.get("pm2_5", [])
        pm10_arr = ah.get("pm10", [])
        wind_speed_arr = wh.get("wind_speed_10m", [])
        wind_dir_arr = wh.get("wind_direction_10m", [])

        # Ensure all arrays have the same length
        lengths = [len(hourly_time), len(pm25_arr), len(pm10_arr), len(wind_speed_arr), len(wind_dir_arr)]
        valid_lengths = [x for x in lengths if x > 0]
        n = min(valid_lengths) if valid_lengths else 0

        hourly_time = list(hourly_time[:n])
        pm25_arr = list(pm25_arr[:n])
        pm10_arr = list(pm10_arr[:n])
        wind_speed_arr = list(wind_speed_arr[:n])
        wind_dir_arr = list(wind_dir_arr[:n])

        return {
            "location": {
                "city": "Bursa",
                "district": "Nilüfer",
                "lat": LAT,
                "lon": LON,
            },
            "current": {
                "timestamp": current_ts,
                "air_quality": {
                    "pm2_5": None if pm25 is None else float(pm25),
                    "pm10": None if pm10 is None else float(pm10),
                    "no2": None if no2 is None else float(no2),
                    "so2": None if so2 is None else float(so2),
                    "co": None if co is None else float(co),
                    "aqi": _pm25_to_aqi(float(pm25)) if pm25 is not None else None,
                },
                "wind": {
                    "speed": float(wind_speed),
                    "direction": int(wind_dir),
                    "vector": vector,
                },
            },
            "hourly": {
                "time": hourly_time,
                "pm2_5": pm25_arr,
                "pm10": pm10_arr,
                "wind_speed": wind_speed_arr,
                "wind_direction": wind_dir_arr,
            },
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e}")


@app.get("/test")
async def test():
    return {"message": "API is working", "bounding_box": NILUFER_BOUNDING_BOX}

@app.get("/environment/bounding-box")
async def environment_bounding_box():
    try:
        # Return mock data for immediate response
        return {
            "bounding_box": NILUFER_BOUNDING_BOX,
            "points": [
                {
                    "lat": 40.170,
                    "lon": 28.900,
                    "air_quality": {"pm2_5": 25.5, "pm10": 35.2, "no2": 18.1, "so2": 6.3, "co": 0.8, "aqi": 78},
                    "wind": {"speed": 3.2, "direction": 45, "vector": {"vx": -2.3, "vy": -2.3}}
                },
                {
                    "lat": 40.215,
                    "lon": 28.975,
                    "air_quality": {"pm2_5": 22.1, "pm10": 30.8, "no2": 16.5, "so2": 5.8, "co": 0.7, "aqi": 71},
                    "wind": {"speed": 2.8, "direction": 50, "vector": {"vx": -2.1, "vy": -2.1}}
                },
                {
                    "lat": 40.260,
                    "lon": 29.050,
                    "air_quality": {"pm2_5": 28.3, "pm10": 38.5, "no2": 19.2, "so2": 6.7, "co": 0.9, "aqi": 83},
                    "wind": {"speed": 3.5, "direction": 40, "vector": {"vx": -2.7, "vy": -2.7}}
                }
            ],
            "total_points": 3
        }
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bounding box API error: {e}")

@app.get("/environment/current")
async def environment_current():
    try:
        air = _get_json(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={
                "latitude": LAT,
                "longitude": LON,
                "current": "pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide",
            },
            timeout=10,
        )

        weather = _get_json(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": LAT,
                "longitude": LON,
                "current": "wind_speed_10m,wind_direction_10m",
            },
            timeout=10,
        )

        ac = air.get("current") or {}
        pm25 = _first_present(ac, ["pm2_5"])
        pm10 = _first_present(ac, ["pm10"])
        no2 = _first_present(ac, ["nitrogen_dioxide", "no2"])
        so2 = _first_present(ac, ["sulphur_dioxide", "so2"])
        co = _first_present(ac, ["carbon_monoxide", "co"])

        wc = weather.get("current") or {}
        speed = wc.get("wind_speed_10m")
        direction = wc.get("wind_direction_10m")
        if speed is None or direction is None:
            raise HTTPException(status_code=502, detail="Upstream API error: missing weather current fields")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e}")

    vector = _wind_vector(speed=float(speed), direction=float(direction))

    return {
        "location": {
            "city": "Bursa",
            "district": "Nilüfer",
            "lat": LAT,
            "lon": LON,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "air_quality": {
            "pm2_5": None if pm25 is None else float(pm25),
            "pm10": None if pm10 is None else float(pm10),
            "no2": None if no2 is None else float(no2),
            "so2": None if so2 is None else float(so2),
            "co": None if co is None else float(co),
            "aqi": _pm25_to_aqi(float(pm25)) if pm25 is not None else None,
        },
        "wind": {
            "speed": float(speed),
            "direction": int(direction),
            "vector": vector,
        },
        "spread": {
            "lat": round(LAT + vector["vy"] * SCALE, 3),
            "lon": round(LON + vector["vx"] * SCALE, 3),
        },
    }

@app.post("/simulate")
async def simulate(req: SimulateRequest):
    data = simulate_dispersion(
        wind_speed=req.wind_speed,
        wind_dir_deg=req.wind_dir_deg,
        base_pm25=req.base_pm25,
        base_pm10=req.base_pm10,
        base_no2=req.base_no2,
        base_so2=req.base_so2,
        base_co=req.base_co,
        num_rays=req.num_rays,
        max_distance_m=req.max_distance_m,
        step_m=req.step_m,
    )
    return data

@app.get("/simulate")
async def simulate_get():
    req = SimulateRequest()
    return await simulate(req)


def _ensure_csv_directory():
    """Create csv_data directory if it doesn't exist"""
    csv_dir = Path("csv_data")
    csv_dir.mkdir(exist_ok=True)
    return csv_dir


def _save_current_data_to_csv(data: dict, filename: str = None):
    """Save current environment data to CSV"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"environment_current_{timestamp}.csv"
    
    csv_dir = _ensure_csv_directory()
    filepath = csv_dir / filename
    
    # Extract relevant data
    csv_data = {
        "timestamp": [data.get("timestamp")],
        "city": [data["location"]["city"]],
        "district": [data["location"]["district"]],
        "latitude": [data["location"]["lat"]],
        "longitude": [data["location"]["lon"]],
        "pm2_5": [data["air_quality"]["pm2_5"]],
        "pm10": [data["air_quality"]["pm10"]],
        "no2": [data["air_quality"]["no2"]],
        "so2": [data["air_quality"]["so2"]],
        "co": [data["air_quality"]["co"]],
        "aqi": [data["air_quality"]["aqi"]],
        "wind_speed": [data["wind"]["speed"]],
        "wind_direction": [data["wind"]["direction"]],
        "wind_vx": [data["wind"]["vector"]["vx"]],
        "wind_vy": [data["wind"]["vector"]["vy"]],
    }
    
    df = pd.DataFrame(csv_data)
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    return str(filepath)


def _save_hourly_data_to_csv(data: dict, filename: str = None):
    """Save hourly environment data to CSV"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"environment_hourly_{timestamp}.csv"
    
    csv_dir = _ensure_csv_directory()
    filepath = csv_dir / filename
    
    # Extract hourly data
    hourly_data = data["hourly"]
    csv_data = {
        "time": hourly_data["time"],
        "pm2_5": hourly_data["pm2_5"],
        "pm10": hourly_data["pm10"],
        "wind_speed": hourly_data["wind_speed"],
        "wind_direction": hourly_data["wind_direction"],
        "city": [data["location"]["city"]] * len(hourly_data["time"]),
        "district": [data["location"]["district"]] * len(hourly_data["time"]),
        "latitude": [data["location"]["lat"]] * len(hourly_data["time"]),
        "longitude": [data["location"]["lon"]] * len(hourly_data["time"]),
    }
    
    df = pd.DataFrame(csv_data)
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    return str(filepath)


def _save_comprehensive_data_to_csv(data: dict, filename: str = None):
    """Save all environment data (current + hourly) to a single CSV"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"environment_comprehensive_{timestamp}.csv"
    
    csv_dir = _ensure_csv_directory()
    filepath = csv_dir / filename
    
    # Prepare comprehensive data
    comprehensive_rows = []
    
    # Add current data as first row
    current_row = {
        "data_type": "current",
        "timestamp": data["current"]["timestamp"],
        "city": data["location"]["city"],
        "district": data["location"]["district"],
        "latitude": data["location"]["lat"],
        "longitude": data["location"]["lon"],
        "pm2_5": data["current"]["air_quality"]["pm2_5"],
        "pm10": data["current"]["air_quality"]["pm10"],
        "no2": data["current"]["air_quality"]["no2"],
        "so2": data["current"]["air_quality"]["so2"],
        "co": data["current"]["air_quality"]["co"],
        "aqi": data["current"]["air_quality"]["aqi"],
        "wind_speed": data["current"]["wind"]["speed"],
        "wind_direction": data["current"]["wind"]["direction"],
        "wind_vx": data["current"]["wind"]["vector"]["vx"],
        "wind_vy": data["current"]["wind"]["vector"]["vy"],
    }
    comprehensive_rows.append(current_row)
    
    # Add all hourly data rows
    hourly_data = data["hourly"]
    for i in range(len(hourly_data["time"])):
        hourly_row = {
            "data_type": "hourly",
            "timestamp": hourly_data["time"][i],
            "city": data["location"]["city"],
            "district": data["location"]["district"],
            "latitude": data["location"]["lat"],
            "longitude": data["location"]["lon"],
            "pm2_5": hourly_data["pm2_5"][i],
            "pm10": hourly_data["pm10"][i],
            "no2": None,  # Hourly data doesn't include these
            "so2": None,
            "co": None,
            "aqi": _pm25_to_aqi(hourly_data["pm2_5"][i]) if hourly_data["pm2_5"][i] is not None else None,
            "wind_speed": hourly_data["wind_speed"][i],
            "wind_direction": hourly_data["wind_direction"][i],
            "wind_vx": None,  # Calculate from speed/direction
            "wind_vy": None,
        }
        
        # Calculate wind vector for hourly data
        if hourly_data["wind_speed"][i] is not None and hourly_data["wind_direction"][i] is not None:
            vector = _wind_vector(speed=float(hourly_data["wind_speed"][i]), direction=float(hourly_data["wind_direction"][i]))
            hourly_row["wind_vx"] = vector["vx"]
            hourly_row["wind_vy"] = vector["vy"]
        
        comprehensive_rows.append(hourly_row)
    
    df = pd.DataFrame(comprehensive_rows)
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    return str(filepath)


def _save_comprehensive_data_to_excel(data: dict, filename: str = None):
    """Save all environment data (current + hourly) to a single Excel file with Turkish headers"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"environment_comprehensive_{timestamp}.xlsx"
    
    excel_dir = _ensure_csv_directory()
    filepath = excel_dir / filename
    
    # Turkish column headers
    turkish_headers = {
        "data_type": "Veri Tipi",
        "timestamp": "Zaman Damgası",
        "city": "Şehir",
        "district": "İlçe",
        "latitude": "Enlem",
        "longitude": "Boylam",
        "pm2_5": "PM2.5 (µg/m³)",
        "pm10": "PM10 (µg/m³)",
        "no2": "NO2 (µg/m³)",
        "so2": "SO2 (µg/m³)",
        "co": "CO (µg/m³)",
        "aqi": "Hava Kalitesi İndeksi",
        "wind_speed": "Rüzgar Hızı (m/s)",
        "wind_direction": "Rüzgar Yönü (°)",
        "wind_vx": "Rüzgar Vektörü X",
        "wind_vy": "Rüzgar Vektörü Y"
    }
    
    # Prepare comprehensive data
    comprehensive_rows = []
    
    # Add current data as first row
    current_row = {
        "data_type": "Mevcut",
        "timestamp": data["current"]["timestamp"],
        "city": data["location"]["city"],
        "district": data["location"]["district"],
        "latitude": data["location"]["lat"],
        "longitude": data["location"]["lon"],
        "pm2_5": data["current"]["air_quality"]["pm2_5"],
        "pm10": data["current"]["air_quality"]["pm10"],
        "no2": data["current"]["air_quality"]["no2"],
        "so2": data["current"]["air_quality"]["so2"],
        "co": data["current"]["air_quality"]["co"],
        "aqi": data["current"]["air_quality"]["aqi"],
        "wind_speed": data["current"]["wind"]["speed"],
        "wind_direction": data["current"]["wind"]["direction"],
        "wind_vx": data["current"]["wind"]["vector"]["vx"],
        "wind_vy": data["current"]["wind"]["vector"]["vy"],
    }
    comprehensive_rows.append(current_row)
    
    # Add all hourly data rows
    hourly_data = data["hourly"]
    print(f"DEBUG: Hourly data length - time: {len(hourly_data.get('time', []))}, pm2_5: {len(hourly_data.get('pm2_5', []))}")
    
    for i in range(len(hourly_data.get("time", []))):
        hourly_row = {
            "data_type": "Saatlik",
            "timestamp": hourly_data["time"][i],
            "city": data["location"]["city"],
            "district": data["location"]["district"],
            "latitude": data["location"]["lat"],
            "longitude": data["location"]["lon"],
            "pm2_5": hourly_data["pm2_5"][i],
            "pm10": hourly_data["pm10"][i],
            "no2": None,  # Hourly data doesn't include these
            "so2": None,
            "co": None,
            "aqi": _pm25_to_aqi(hourly_data["pm2_5"][i]) if hourly_data["pm2_5"][i] is not None else None,
            "wind_speed": hourly_data["wind_speed"][i],
            "wind_direction": hourly_data["wind_direction"][i],
            "wind_vx": None,  # Calculate from speed/direction
            "wind_vy": None,
        }
        
        # Calculate wind vector for hourly data
        if hourly_data["wind_speed"][i] is not None and hourly_data["wind_direction"][i] is not None:
            vector = _wind_vector(speed=float(hourly_data["wind_speed"][i]), direction=float(hourly_data["wind_direction"][i]))
            hourly_row["wind_vx"] = vector["vx"]
            hourly_row["wind_vy"] = vector["vy"]
        
        comprehensive_rows.append(hourly_row)
    
    print(f"DEBUG: Total rows prepared: {len(comprehensive_rows)}")
    
    # Create DataFrame and rename columns to Turkish
    df = pd.DataFrame(comprehensive_rows)
    print(f"DEBUG: DataFrame shape: {df.shape}")
    print(f"DEBUG: DataFrame columns: {list(df.columns)}")
    
    df = df.rename(columns=turkish_headers)
    
    # Save to Excel with formatting
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Hava Kalitesi Verileri')
        
        # Get the workbook and worksheet for formatting
        workbook = writer.book
        worksheet = writer.sheets['Hava Kalitesi Verileri']
        
        # Adjust column widths for better readability
        column_widths = {
            'A': 12,  # Veri Tipi
            'B': 20,  # Zaman Damgası
            'C': 10,  # Şehir
            'D': 10,  # İlçe
            'E': 12,  # Enlem
            'F': 12,  # Boylam
            'G': 15,  # PM2.5
            'H': 15,  # PM10
            'I': 15,  # NO2
            'J': 15,  # SO2
            'K': 15,  # CO
            'L': 20,  # Hava Kalitesi İndeksi
            'M': 18,  # Rüzgar Hızı
            'N': 18,  # Rüzgar Yönü
            'O': 15,  # Rüzgar Vektörü X
            'P': 15,  # Rüzgar Vektörü Y
        }
        
        for col, width in column_widths.items():
            worksheet.column_dimensions[col].width = width
    
    print(f"DEBUG: Excel file saved to: {filepath}")
    return str(filepath)


@app.get("/export/excel")
async def export_excel():
    """Export all environment data to a single comprehensive Excel file with Turkish headers"""
    try:
        # Get full environment data
        env_data = await environment_full()
        
        # Save comprehensive data to Excel with Turkish headers
        excel_file = _save_comprehensive_data_to_excel(env_data)
        
        return {
            "message": "Excel dosyası başarıyla oluşturuldu",
            "file": excel_file,
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "data_summary": {
                "current_records": 1,
                "hourly_records": len(env_data["hourly"]["time"]),
                "total_records": len(env_data["hourly"]["time"]) + 1,
                "format": "Excel (.xlsx)",
                "headers": "Türkçe",
                "sheet_name": "Hava Kalitesi Verileri"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel export failed: {str(e)}")


@app.get("/export/csv")
async def export_csv():
    """Export all environment data to a single comprehensive CSV file"""
    try:
        # Get full environment data
        env_data = await environment_full()
        
        # Save comprehensive data to single CSV
        comprehensive_file = _save_comprehensive_data_to_csv(env_data)
        
        return {
            "message": "Comprehensive CSV file created successfully",
            "file": comprehensive_file,
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "data_summary": {
                "current_records": 1,
                "hourly_records": len(env_data["hourly"]["time"]),
                "total_records": len(env_data["hourly"]["time"]) + 1
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")


@app.get("/export/csv/separate")
async def export_csv_separate():
    """Export current and hourly environment data to separate CSV files"""
    try:
        # Get full environment data
        env_data = await environment_full()
        
        # Save current data
        current_file = _save_current_data_to_csv({
            "timestamp": env_data["current"]["timestamp"],
            "location": env_data["location"],
            "air_quality": env_data["current"]["air_quality"],
            "wind": env_data["current"]["wind"],
        })
        
        # Save hourly data
        hourly_file = _save_hourly_data_to_csv(env_data)
        
        return {
            "message": "Separate CSV files created successfully",
            "files": {
                "current_data": current_file,
                "hourly_data": hourly_file,
            },
            "export_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")


@app.get("/export/csv/current")
async def export_current_csv():
    """Export only current environment data to CSV"""
    try:
        current_data = await environment_current()
        filepath = _save_current_data_to_csv(current_data)
        
        return {
            "message": "Current data CSV created successfully",
            "file": filepath,
            "export_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")
