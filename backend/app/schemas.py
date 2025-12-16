from pydantic import BaseModel, Field

class SimulateRequest(BaseModel):
    wind_speed: float = Field(3.0, ge=0)
    wind_dir_deg: float = Field(45.0, ge=0, le=360)
    base_pm25: float = 22.0
    base_pm10: float = 35.0
    base_no2: float = 18.0
    base_so2: float = 6.0
    base_co: float = 0.7
    num_rays: int = 9
    max_distance_m: int = 5000
    step_m: int = 500

class HealthResponse(BaseModel):
    status: str = "ok"
