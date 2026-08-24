#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test MCP Server imports and structure
"""
import mcp.server.stdio
from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource

server = Server("aerial-georef-mcp")
print("MCP Server object initialized successfully!")
