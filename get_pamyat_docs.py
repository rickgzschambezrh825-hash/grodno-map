import urllib.request
import urllib.parse
import re
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def get_pamyat_docs():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    # Search for documents of 3 Army June 1941
    search_url = 'https://pamyat-naroda.ru/documents/?begin_date=22.06.1941&end_date=30.06.1941&q=' + urllib.parse.quote('Гродно 3 армия')
    print("Requesting:", search_url)
    req = urllib.request.Request(search_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            links = re.findall(r'href="(/documents/view/\?id=[^"]+)"[^>]*>(.*?)</a>', content)
            print(f"Found documents: {len(links)}")
            for link, title in links[:10]:
                print(f"https://pamyat-naroda.ru{link} | {title.strip()}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    get_pamyat_docs()
