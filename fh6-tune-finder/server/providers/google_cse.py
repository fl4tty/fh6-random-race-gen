"""Google Programmable Search (Custom Search JSON API) provider.

Docs: https://developers.google.com/custom-search/v1/overview
Free tier: 100 queries/day, then billed per 1,000 queries.
"""
import json
import urllib.parse
import urllib.request
import urllib.error

ENDPOINT = "https://www.googleapis.com/customsearch/v1"


class ProviderError(Exception):
    pass


def search(query, api_key, cx, timeout=8, num=10):
    params = {
        "key": api_key,
        "cx": cx,
        "q": query,
        "num": min(max(num, 1), 10),
    }
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode("utf-8"))
            message = payload.get("error", {}).get("message", str(e))
        except Exception:
            message = str(e)
        raise ProviderError(f"Google Custom Search error ({e.code}): {message}") from e
    except urllib.error.URLError as e:
        raise ProviderError(f"Could not reach Google Custom Search: {e.reason}") from e
    except TimeoutError as e:
        raise ProviderError("Google Custom Search request timed out") from e

    items = body.get("items", []) or []
    results = []
    for item in items:
        results.append({
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "displayLink": item.get("displayLink", ""),
        })
    return results
