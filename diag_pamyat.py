import urllib.request
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request('https://pamyat-naroda.ru/documents/?q=%D0%93%D1%80%D0%BE%D0%B4%D0%BD%D0%BE', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    h = resp.read().decode('utf-8', errors='ignore')

print('Title:', re.findall(r'<title>(.*?)</title>', h))
print('Scripts:', re.findall(r'<script[^>]*src="([^"]*)"', h))
