import urllib.request
import urllib.parse
import re
import html
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def search_grsu(query):
    url = f"https://elib.grsu.by/doc/search?query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'href="(/doc/\d+)"[^>]*>(.*?)</a>', content)
            print(f"=== Query: {query} (Found {len(matches)}) ===")
            for path, title in matches[:10]:
                print(f"https://elib.grsu.by{path} : {clean_html(title)[:100]}")
    except Exception as e:
        print(f"Error {query}: {e}")

def clean_html(raw):
    text = re.sub(r'<[^>]+>', '', raw)
    return html.unescape(text).strip()

if __name__ == '__main__':
    search_grsu("Лютик")
    search_grsu("Пивоварчик")
    search_grsu("Шмелев")
