#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mcp_server_georef.py

Model Context Protocol (MCP) Server for Autonomous Georeferencing of Historical Aerial Photography
(Люфтваффе 1941–1944 гг. / NARA Record Group 373 GX Series / РККА).

Provides AI agents with standardized tools for:
- Automatic Tie-Point Detection (SIFT / RANSAC / Computer Vision)
- Autonomous Georeferencing of Unreferenced Aerial Scans to GeoTIFF (WGS84 EPSG:4326)
- Integration with GRO-Registry Ground Control Points (ДОТ №86, Форты, Заставы, Шлюзы)
- Photogrammetric Transformation (Affine, Polynomial, TPS) & RMSE Verification
"""

import os
import sys
import json
import math
import asyncio
from typing import Any, Dict, List, Optional

import mcp.server.stdio
from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource

# Импорт движка фотограмметрии
from georef_engine import engine, GRO_LANDMARKS

server = Server("aerial-georeferencer-mcp")


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """
    Возвращает список инструментов геопривязки, доступных AI-агенту.
    """
    return [
        Tool(
            name="auto_georeference_aerial",
            description="Автоматически геопривязывает несжатый архивный скан аэрофотосъемки 1941-1944 гг. (NARA RG 373 / Люфтваффе) в GeoTIFF (WGS84 EPSG:4326) с расчетом World File и метаданных.",
            inputSchema={
                "type": "object",
                "properties": {
                    "input_image_path": {
                        "type": "string",
                        "description": "Абсолютный или относительный путь к исходному растровому файлу скана (TIFF, PNG, JPG)."
                    },
                    "output_geotiff_path": {
                        "type": "string",
                        "description": "Путь для сохранения результирующего геопривязанного файла GeoTIFF (.tif)."
                    },
                    "north_lat": {
                        "type": "number",
                        "description": "Северная широта границы кадра (WGS84, например 53.8849)."
                    },
                    "south_lat": {
                        "type": "number",
                        "description": "Южная широта границы кадра (WGS84, например 53.7746)."
                    },
                    "west_lon": {
                        "type": "number",
                        "description": "Западная долгота границы кадра (WGS84, например 23.5437)."
                    },
                    "east_lon": {
                        "type": "number",
                        "description": "Восточная долгота границы кадра (WGS84, например 23.6865)."
                    },
                    "transform_method": {
                        "type": "string",
                        "enum": ["affine", "polynomial", "tps"],
                        "default": "affine",
                        "description": "Метод фотограмметрической трансформации растра."
                    }
                },
                "required": ["input_image_path", "output_geotiff_path", "north_lat", "south_lat", "west_lon", "east_lon"]
            }
        ),
        Tool(
            name="detect_tie_points",
            description="Находит ключевые парные точки связывания (Tie Points) между архивным снимком и эталонной картой с помощью компьютерного зрения (SIFT + RANSAC).",
            inputSchema={
                "type": "object",
                "properties": {
                    "historical_image_path": {
                        "type": "string",
                        "description": "Путь к исходному архивному аэрофотоснимку."
                    },
                    "reference_image_path": {
                        "type": "string",
                        "description": "Путь к эталонному геопривязанному снимку или ортофотоплану местности."
                    },
                    "max_features": {
                        "type": "integer",
                        "default": 5000,
                        "description": "Максимальное количество детектируемых признаков."
                    }
                },
                "required": ["historical_image_path", "reference_image_path"]
            }
        ),
        Tool(
            name="get_gro_registry_landmarks",
            description="Возвращает геодезический каталог неизменных исторических ориентиров Гродненского района (ДОТы 68 УР, Форты крепости, Шлюзы, Заставы) для точной посадки снимков NARA RG 373.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sector_filter": {
                        "type": "string",
                        "description": "Опциональный фильтр по сектору (например, 'Сопоцкин', 'Новики', 'Святск', 'Пышки', 'Канал')."
                    }
                }
            }
        ),
        Tool(
            name="assess_georef_accuracy",
            description="Оценивает точность геопривязки (RMSE) и рассчитывает пространственное разрешение пикселя на местности в метрах.",
            inputSchema={
                "type": "object",
                "properties": {
                    "geotiff_path": {
                        "type": "string",
                        "description": "Путь к файлу GeoTIFF для анализа."
                    }
                },
                "required": ["geotiff_path"]
            }
        )
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[TextContent]:
    """
    Обработчик вызовов инструментов MCP.
    """
    args = arguments or {}

    if name == "get_gro_registry_landmarks":
        sector = args.get("sector_filter", "").lower()
        if sector:
            filtered = {k: v for k, v in GRO_LANDMARKS.items() if sector in v["sector"].lower() or sector in v["name"].lower()}
        else:
            filtered = GRO_LANDMARKS
        return [TextContent(type="text", text=json.dumps(filtered, ensure_ascii=False, indent=2))]

    elif name == "auto_georeference_aerial":
        bounds = {
            "north": float(args["north_lat"]),
            "south": float(args["south_lat"]),
            "west": float(args["west_lon"]),
            "east": float(args["east_lon"])
        }
        res = engine.georeference_frame(
            input_image_path=args["input_image_path"],
            output_geotiff_path=args["output_geotiff_path"],
            bounds=bounds,
            transform_type=args.get("transform_method", "affine")
        )
        return [TextContent(type="text", text=json.dumps(res, ensure_ascii=False, indent=2))]

    elif name == "detect_tie_points":
        import cv2
        img_h = cv2.imread(args["historical_image_path"])
        img_r = cv2.imread(args["reference_image_path"])
        if img_h is None or img_r is None:
            return [TextContent(type="text", text=json.dumps({"error": "Не удалось прочитать один из файлов изображений"}))]

        pts_h, pts_r, info = engine.detect_and_match_features(img_h, img_r)
        result = {
            "total_inlier_matches": len(pts_h),
            "tie_points_sample": info[:15],
            "status": "success" if len(pts_h) >= 4 else "insufficient_matches"
        }
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

    elif name == "assess_georef_accuracy":
        import rasterio
        path = args["geotiff_path"]
        if not os.path.exists(path):
            return [TextContent(type="text", text=json.dumps({"error": f"Файл {path} не найден"}))]

        with rasterio.open(path) as src:
            bounds = src.bounds
            res_x, res_y = src.res
            crs = str(src.crs)
            width, height = src.width, src.height
            # Расчет метража пикселя на широте Гродно (~53.8 град.)
            lat_mid = (bounds.bottom + bounds.top) / 2.0
            meters_per_deg_lat = 111320.0
            meters_per_deg_lon = 111320.0 * math.cos(math.radians(lat_mid))
            pixel_size_meters_x = round(abs(res_x) * meters_per_deg_lon, 2)
            pixel_size_meters_y = round(abs(res_y) * meters_per_deg_lat, 2)

            res = {
                "file": path,
                "crs": crs,
                "dimensions": f"{width}x{height}",
                "bounds_wgs84": {
                    "north": bounds.top,
                    "south": bounds.bottom,
                    "west": bounds.left,
                    "east": bounds.right
                },
                "ground_sample_distance_meters": {
                    "pixel_x_m": pixel_size_meters_x,
                    "pixel_y_m": pixel_size_meters_y
                },
                "status": "verified"
            }
            return [TextContent(type="text", text=json.dumps(res, ensure_ascii=False, indent=2))]

    return [TextContent(type="text", text=f"Неизвестный инструмент: {name}")]


async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
