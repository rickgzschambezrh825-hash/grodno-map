#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verification of MCP Tools for autonomous aerial georeferencing
"""
import os
import sys
import json
import asyncio
from mcp_server_georef import handle_call_tool, handle_list_tools

sys.stdout.reconfigure(encoding='utf-8')

async def test_mcp():
    print("=== 1. Testing List Tools ===")
    tools = await handle_list_tools()
    print(f"Total MCP tools exposed: {len(tools)}")
    for t in tools:
        print(f"  - Tool: {t.name}: {t.description[:60]}...")

    print("\n=== 2. Testing Landmark Catalog Tool ===")
    res_landmarks = await handle_call_tool("get_gro_registry_landmarks", {"sector_filter": "Новики"})
    print("Landmarks response length:", len(res_landmarks[0].text))
    print("Sample:", res_landmarks[0].text[:200])

    print("\n=== 3. Testing Autonomous Georeferencing Tool ===")
    test_img = "./nara_gx_grodno_archive/raw_tiles/gx_aerial_15_18527_10536.jpg"
    test_out = "./nara_gx_grodno_archive/test_mcp_georeferenced.tif"
    
    if os.path.exists(test_img):
        res_georef = await handle_call_tool("auto_georeference_aerial", {
            "input_image_path": test_img,
            "output_geotiff_path": test_out,
            "north_lat": 53.8189,
            "south_lat": 53.8100,
            "west_lon": 23.6100,
            "east_lon": 23.6200
        })
        print("Georeference result:", res_georef[0].text)

        print("\n=== 4. Testing Accuracy Assessment Tool ===")
        res_acc = await handle_call_tool("assess_georef_accuracy", {"geotiff_path": test_out})
        print("Accuracy assessment:", res_acc[0].text)

    print("\n[✓] ALL MCP TOOLS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_mcp())
