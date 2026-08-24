import os
import math
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from PIL import Image
import numpy as np

try:
    import mercantile
    HAS_MERCANTILE = True
except ImportError:
    HAS_MERCANTILE = False

try:
    import rasterio
    from rasterio.transform import from_bounds
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

# ================= CONFIGURATION =================
OUTPUT_DIR = "./grodno_aerial_output"
TILES_CACHE_DIR = os.path.join(OUTPUT_DIR, "tiles")
os.makedirs(TILES_CACHE_DIR, exist_ok=True)

# Grodno District Bounding Box (Full extent)
BBOX_GRODNO = {
    "name": "Grodno Region Full",
    "min_lat": 53.5500,
    "max_lat": 53.9200,
    "min_lon": 23.5000,
    "max_lon": 24.3500
}

# Sopotkin - Noviki Detailed Sector Bounding Box
BBOX_SOPOTKIN_NOVIKI = {
    "name": "Sopotkin - Noviki Sector",
    "min_lat": 53.7800,
    "max_lat": 53.8600,
    "min_lon": 23.5500,
    "max_lon": 23.6800
}

# Primary and Fallback Aerial Tile URLs (High-Resolution Panchromatic Orthophotography)
TILE_SERVERS = [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 GIS-App/1.0"
}

# ================= MATH CONVERSION FUNCTIONS =================
def deg2num(lat_deg, lon_deg, zoom):
    """Convert WGS84 coordinates to tile indices (x, y)"""
    if HAS_MERCANTILE:
        tile = mercantile.tile(lon_deg, lat_deg, zoom)
        return (tile.x, tile.y)
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def num2deg(xtile, ytile, zoom):
    """Convert tile indices (x, y) to top-left corner (lat, lon)"""
    if HAS_MERCANTILE:
        bounds = mercantile.ul(xtile, ytile, zoom)
        return (bounds.lat, bounds.lng)
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

# ================= TILE DOWNLOADER =================
def download_single_tile(tile_info):
    x, y, z = tile_info
    tile_file = os.path.join(TILES_CACHE_DIR, f"{z}_{x}_{y}.png")

    if os.path.exists(tile_file) and os.path.getsize(tile_file) > 0:
        return {"status": "cached", "path": tile_file, "tile": (x, y, z)}

    for url_template in TILE_SERVERS:
        url = url_template.format(z=z, x=x, y=y)
        for attempt in range(3):
            try:
                r = requests.get(url, headers=HEADERS, timeout=12)
                if r.status_code == 200 and len(r.content) > 100:
                    with open(tile_file, "wb") as f:
                        f.write(r.content)
                    time.sleep(0.03)  # Gentle delay to comply with server policy
                    return {"status": "downloaded", "path": tile_file, "tile": (x, y, z)}
                elif r.status_code == 404:
                    break
            except Exception:
                time.sleep(0.5 * (attempt + 1))

    return {"status": "failed", "path": None, "tile": (x, y, z)}

# ================= MOSAIC & GEOTIFF GENERATOR =================
def process_zoom_level(bbox_config, zoom):
    bbox_name = bbox_config["name"]
    min_lat, max_lat = bbox_config["min_lat"], bbox_config["max_lat"]
    min_lon, max_lon = bbox_config["min_lon"], bbox_config["max_lon"]

    logging.info(f"=== Starting Processing: {bbox_name} | Zoom Level: {zoom} ===")
    
    x_min, y_min = deg2num(max_lat, min_lon, zoom)
    x_max, y_max = deg2num(min_lat, max_lon, zoom)

    tile_list = []
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            tile_list.append((x, y, zoom))

    total_tiles = len(tile_list)
    cols = x_max - x_min + 1
    rows = y_max - y_min + 1

    logging.info(f"Tile grid dimensions: {cols} columns x {rows} rows ({total_tiles} total tiles)")

    download_results = {"downloaded": 0, "cached": 0, "failed": 0}
    
    # Multithreaded downloading with progress bar
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_single_tile, tile): tile for tile in tile_list}
        
        iterator = as_completed(futures)
        if HAS_TQDM:
            iterator = tqdm(iterator, total=total_tiles, desc=f"Zoom {zoom} ({bbox_name})")

        for future in iterator:
            res = future.result()
            download_results[res["status"]] += 1

    logging.info(f"Download results for Zoom {zoom}: {download_results}")

    # Stitching Tiles
    logging.info(f"Stitching mosaic canvas ({cols * 256} x {rows * 256} px)...")
    tile_w, tile_h = 256, 256
    full_image = Image.new("RGB", (cols * tile_w, rows * tile_h), (220, 220, 220))

    missing_tiles = 0
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            tile_path = os.path.join(TILES_CACHE_DIR, f"{zoom}_{x}_{y}.png")
            pos_x = (x - x_min) * tile_w
            pos_y = (y - y_min) * tile_h

            if os.path.exists(tile_path) and os.path.getsize(tile_path) > 0:
                try:
                    tile_img = Image.open(tile_path).convert("RGB")
                    full_image.paste(tile_img, (pos_x, pos_y))
                except Exception as e:
                    logging.warning(f"Error opening tile {tile_path}: {e}")
                    missing_tiles += 1
            else:
                missing_tiles += 1

    # Exact geographic bounds of the assembled mosaic
    north_lat, west_lon = num2deg(x_min, y_min, zoom)
    south_lat, east_lon = num2deg(x_max + 1, y_max + 1, zoom)

    safe_name = bbox_name.lower().replace(" ", "_").replace("-", "_")
    tif_path = os.path.join(OUTPUT_DIR, f"grodno_z{zoom}_{safe_name}.tif")

    if HAS_RASTERIO:
        logging.info(f"Exporting GeoTIFF (CRS EPSG:4326) -> {tif_path}")
        img_array = np.array(full_image)
        # Transpose array shape from (H, W, Channels) to (Bands, H, W) for rasterio
        img_array = np.transpose(img_array, (2, 0, 1))

        transform = from_bounds(west_lon, south_lat, east_lon, north_lat, full_image.width, full_image.height)
        with rasterio.open(
            tif_path,
            "w",
            driver="GTiff",
            height=full_image.height,
            width=full_image.width,
            count=3,
            dtype=img_array.dtype,
            crs="EPSG:4326",
            transform=transform,
            compress="lzw"
        ) as dst:
            dst.write(img_array)
        logging.info(f"GeoTIFF export complete: {tif_path}")
    else:
        # Fallback export: PNG + World File (.pgw)
        png_path = os.path.join(OUTPUT_DIR, f"grodno_z{zoom}_{safe_name}.png")
        pgw_path = os.path.join(OUTPUT_DIR, f"grodno_z{zoom}_{safe_name}.pgw")
        full_image.save(png_path)

        x_res = (east_lon - west_lon) / full_image.width
        y_res = (south_lat - north_lat) / full_image.height
        with open(pgw_path, "w") as f:
            f.write(f"{x_res}\n0.0\n0.0\n{y_res}\n{west_lon}\n{north_lat}\n")
        logging.info(f"Raster export fallback complete: {png_path} + {pgw_path}")

    report_entry = {
        "sector": bbox_name,
        "zoom": zoom,
        "total_tiles": total_tiles,
        "cols": cols,
        "rows": rows,
        "image_width_px": full_image.width,
        "image_height_px": full_image.height,
        "download_stats": download_results,
        "missing_tiles": missing_tiles,
        "geo_bounds": {
            "north_lat": north_lat,
            "south_lat": south_lat,
            "west_lon": west_lon,
            "east_lon": east_lon,
            "crs": "EPSG:4326"
        },
        "output_file": tif_path if HAS_RASTERIO else png_path
    }
    return report_entry

# ================= MAIN PIPELINE =================
def run_pipeline():
    logging.info("Starting Grodno Tile Download & Mosaic Pipeline")
    start_time = time.time()

    tasks = [
        (BBOX_GRODNO, 13),
        (BBOX_GRODNO, 14),
        (BBOX_SOPOTKIN_NOVIKI, 15)
    ]

    report_data = {
        "title": "Grodno Aerial / Map Tile Download Report",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "rasterio_available": HAS_RASTERIO,
        "mercantile_available": HAS_MERCANTILE,
        "results": []
    }

    for bbox_cfg, z in tasks:
        res = process_zoom_level(bbox_cfg, z)
        report_data["results"].append(res)

    report_data["elapsed_seconds"] = round(time.time() - start_time, 2)
    report_file = os.path.join(OUTPUT_DIR, "download_report.json")

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)

    logging.info(f"Pipeline finished in {report_data['elapsed_seconds']}s. Summary saved to {report_file}")

if __name__ == "__main__":
    run_pipeline()
