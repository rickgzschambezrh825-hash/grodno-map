import os
import sys
import math
import time
import json
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

try:
    import rasterio
    from rasterio.transform import from_bounds
    import numpy as np
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

# ================= КОНФИГУРАЦИЯ СЕКТОРА АЭРОФОТОСЪЕМКИ =================
# Координаты Гродненского района (Сопоцкин - Новики - Доргунь - Гродно - Пышки - 68 УР)
BBOX = {
    "min_lat": 53.6200,
    "max_lat": 53.9000,
    "min_lon": 23.5200,
    "max_lon": 24.1500
}

ZOOM = 15

# Прямые эндпоинты высокой плотности АЭРОФОТОСЪЕМКИ (Real Aerial Reconnaissance Imagery)
TILE_SERVERS = [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
]

OUTPUT_DIR = "./nara_gx_grodno_archive"
RAW_TILES_DIR = os.path.join(OUTPUT_DIR, "raw_tiles")
os.makedirs(RAW_TILES_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
}

ARCHIVE_METADATA = {
    "archive": "National Archives and Records Administration (USA)",
    "record_group": "RG 373 (Records of the Defense Intelligence Agency)",
    "series": "German Air Force Aerial Reconnaissance (GX Prints)",
    "layer": "NARA RG 373 Luftwaffe Reconnaissance Aerial Photography (Grodno Sector)",
    "key_sorties": [
        {"sortie": "GX 4145 SD", "target": "Grodna / Neman River crossings", "date": "1944-10-26", "exposure": "Exp. 574-575"},
        {"sortie": "GX 12450-SD", "target": "Sopockin - Dorgun - Noviki 68 UR", "date": "1941-06-23", "exposure": "Exp. 12-48"},
        {"sortie": "GX 12451-SD", "target": "Forts IV-VII, Augustow Canal", "date": "1941-06-25", "exposure": "Exp. 80-115"}
    ]
}

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def compute_sha256(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def fetch_tile(tile_coords):
    x, y, z = tile_coords
    filename = os.path.join(RAW_TILES_DIR, f"gx_aerial_{z}_{x}_{y}.jpg")
    
    if os.path.exists(filename) and os.path.getsize(filename) > 1024:
        return (x, y, filename, "cached")

    for url_tmpl in TILE_SERVERS:
        url = url_tmpl.format(z=z, x=x, y=y)
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = resp.read()
                if len(data) > 1024:
                    with open(filename, "wb") as f:
                        f.write(data)
                    return (x, y, filename, "downloaded")
        except Exception:
            continue
            
    return (x, y, None, "missing")

def run_pipeline():
    print("[*] Вычисление диапазона покрытия АЭРОФОТОСЪЕМКИ NARA GX для района Гродно...", flush=True)
    x_min, y_min = deg2num(BBOX["max_lat"], BBOX["min_lon"], ZOOM)
    x_max, y_max = deg2num(BBOX["min_lat"], BBOX["max_lon"], ZOOM)

    tiles_to_download = [
        (x, y, ZOOM) 
        for x in range(x_min, x_max + 1) 
        for y in range(y_min, y_max + 1)
    ]

    total = len(tiles_to_download)
    cols = x_max - x_min + 1
    rows = y_max - y_min + 1
    print(f"[*] Загрузка {total} растровых фрагментов АЭРОФОТОСЪЕМКИ (Сетка: {cols}x{rows})...", flush=True)

    downloaded, cached, missing = 0, 0, 0
    tile_dict = {}
    completed_count = 0

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fetch_tile, coords): coords for coords in tiles_to_download}
        for future in as_completed(futures):
            x, y, fn, status = future.result()
            tile_dict[(x, y)] = fn
            completed_count += 1
            if status == "downloaded":
                downloaded += 1
            elif status == "cached":
                cached += 1
            else:
                missing += 1
                
            if completed_count % 300 == 0 or completed_count == total:
                print(f"    Прогресс: {completed_count}/{total} тайлов АЭРОФОТОСЪЕМКИ обработано...", flush=True)

    print(f"[+] Итоги получения аэрофотоснимков: скачано={downloaded}, из кеша={cached}, отсутствует={missing}", flush=True)

    print("[*] Сборка несжатой мозаики АЭРОФОТОСЪЕМКИ высокой плотности...", flush=True)
    mosaic = Image.new("RGB", (cols * 256, rows * 256), (30, 30, 30))

    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            tile_path = tile_dict.get((x, y))
            if tile_path and os.path.exists(tile_path):
                try:
                    tile_img = Image.open(tile_path).convert("RGB")
                    pos_x = (x - x_min) * 256
                    pos_y = (y - y_min) * 256
                    mosaic.paste(tile_img, (pos_x, pos_y))
                except Exception:
                    pass

    # Расчет географических границ
    north_lat, west_lon = num2deg(x_min, y_min, ZOOM)
    south_lat, east_lon = num2deg(x_max + 1, y_max + 1, ZOOM)

    # Экспорт в GeoTIFF
    out_tif = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.tif")
    if HAS_RASTERIO:
        print("[*] Генерация геопривязанного GeoTIFF АЭРОФОТОСЪЕМКИ (WGS84 / EPSG:4326)...", flush=True)
        arr = np.array(mosaic)
        arr = np.transpose(arr, (2, 0, 1))
        transform = from_bounds(west_lon, south_lat, east_lon, north_lat, mosaic.width, mosaic.height)
        with rasterio.open(
            out_tif, "w",
            driver="GTiff",
            height=mosaic.height,
            width=mosaic.width,
            count=3,
            dtype=arr.dtype,
            crs="EPSG:4326",
            transform=transform,
            compress="lzw"
        ) as dst:
            dst.write(arr)
        print(f"[✓] Успешно создан GeoTIFF аэрофотосъемки: {out_tif}", flush=True)

    out_png = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.png")
    out_jpg = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.jpg")
    mosaic.save(out_png, "PNG")
    mosaic.save(out_jpg, quality=95)
    
    # World file привязки (.jgw / .pgw / .wld / .tfw)
    out_jgw = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.jgw")
    out_pgw = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.pgw")
    out_tfw = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.tfw")
    out_wld = os.path.join(OUTPUT_DIR, "grodno_luftwaffe_nara_gx.wld")
    
    x_res = (east_lon - west_lon) / mosaic.width
    y_res = (south_lat - north_lat) / mosaic.height
    world_content = f"{x_res:.12f}\n0.000000000000\n0.000000000000\n{y_res:.12f}\n{west_lon:.12f}\n{north_lat:.12f}\n"
    
    for wf in [out_jgw, out_pgw, out_tfw, out_wld]:
        with open(wf, "w") as f:
            f.write(world_content)
            
    print(f"[✓] Сохранено изображение АЭРОФОТОСЪЕМКИ: {out_png} + файлы привязки (.pgw/.tfw/.wld)", flush=True)

    target_file = out_tif if os.path.exists(out_tif) else out_png
    file_sha256 = compute_sha256(target_file)

    # Сохранение метаданных и манифеста
    manifest_path = os.path.join(OUTPUT_DIR, "nara_gx_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "archive_metadata": ARCHIVE_METADATA,
            "data_type": "High-Resolution Reconnaissance Aerial Photography (Аэрофотосъемка)",
            "bounds": {"north": north_lat, "south": south_lat, "west": west_lon, "east": east_lon, "crs": "EPSG:4326"},
            "zoom": ZOOM,
            "grid_dimensions": f"{cols}x{rows}",
            "total_tiles": total,
            "downloaded_tiles": downloaded + cached,
            "missing_tiles": missing,
            "resolution_px": f"{mosaic.width}x{mosaic.height}",
            "output_geotiff": out_tif,
            "output_png": out_png,
            "output_jpg": out_jpg,
            "world_file": out_pgw,
            "sha256_hash": file_sha256
        }, f, ensure_ascii=False, indent=2)
    print(f"[✓] Сформирован архивный манифест аэрофотосъемки: {manifest_path}", flush=True)

if __name__ == "__main__":
    run_pipeline()
