import urllib.request
import re
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request('https://pamyat-naroda.ru/documents/?q=%D0%93%D1%80%D0%BE%D0%B4%D0%BD%D0%BE', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

# Check for document links or json data
matches = re.findall(r'href="(/documents/view/[^"]+)"', html)
print(f"Direct href matches: {len(matches)}")
for m in matches[:5]:
    print(" ", m)

# Check for data-params or api endpoints
api_matches = re.findall(r'/api/[^"\'\s>]+', html)
print(f"API matches: {len(api_matches)}")
for a in set(api_matches)[:5]:
    print(" ", a)
