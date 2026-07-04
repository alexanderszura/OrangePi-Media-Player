from typing import Any
import requests
from Title import MediaType, Title, QualityType
from urllib.parse import quote

PUBLIC_KEY = "54e00466a09676df57ba51c4ca30b1a6"

MOVIE_INFO_BASE = "https://api.themoviedb.org/3"

SEARCH_ENDPOINT = "search/multi"
INFORMATION_ENDPOINT = "{type}/{id}"
SEASON_ENDPOINT = "tv/{id}/season/{season}"

IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342"
SUPPORTED_MEDIA_TYPES = {"movie", "tv"}

PROXY_URL = "https://dl.gemlelispe.workers.dev/{url}"
PROXY_HEADER = {
    "Referer": "https://vidvault.ru/"
}

def getAPIURL(endpoint: str):
    return f"{MOVIE_INFO_BASE}/{endpoint}?api_key={PUBLIC_KEY}&language=en-US"

def search(text: str) -> list[Title]:

    response = requests.get(
        getAPIURL(SEARCH_ENDPOINT),
        params={
            "query": text,
            "page": 1,
        },
        timeout=10,
    )
    response.raise_for_status()

    results = response.json().get("results", [])
    return [
        title
        for item in results
        if item.get("media_type") in SUPPORTED_MEDIA_TYPES
        for title in [_title_from_result(item)]
        if title is not None
    ]


def _title_from_result(item: dict[str, Any]) -> Title | None:
    media_type = item.get("media_type")

    if media_type == "movie":
        name = item.get("title")
        release_date = item.get("release_date")
        title_type = MediaType.MOVIE
    elif media_type == "tv":
        name = item.get("name")
        release_date = item.get("first_air_date")
        title_type = MediaType.TV
    else:
        return None

    if not name:
        return None

    poster_path = item.get("poster_path")
    image_url = f"{IMAGE_BASE_URL}{poster_path}" if poster_path else None

    id = item.get("id")

    return Title(
        name=name,
        year=_year_from_date(release_date),
        img=image_url,
        type=title_type,
        id=id
    )


def _year_from_date(value: str | None) -> int | None:
    if not value:
        return None

    try:
        return int(value[:4])
    except ValueError:
        return None
    
def downloadTitle(title: Title, episode=None | int, season=None | int, quality=QualityType.HIGHEST):
    r = requests.get("https://vidvault.ru/api/get-token", params={
        "referrer": f"https://vidvault.ru/{title.type.name}/{title.id}"
    })

    r.raise_for_status()

    token = r.json()["t"]

    r = requests.post("https://vidvault.ru/api/download-proxy", 
        headers={
            "x-request-token": token
        }, 
        json={
            "tmdbId": title.id,
            "type": title.type.name,
            "episode": episode,
            "season": season
        }
    )

    r.raise_for_status()

    data = r.json()

    downloadOptions = data['mp4Data']['downloadInfo']['data']['downloads']

    download = downloadOptions[-1] if quality == QualityType.HIGHEST else downloadOptions[0]

    return downloadFile(__convert_url__(download['url']), title.name + ".mp4")

def __convert_url__(url: str) -> str:
    encoded_url = quote(url, safe="")

    return PROXY_URL.format(url=encoded_url)

def downloadFile(url, filename, progress_callback=None):
    with requests.get(url, headers=PROXY_HEADER, stream=True) as r:
        r.raise_for_status()

        total_size = int(r.headers.get("Content-Length", 0))
        downloaded = 0

        with open(filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if not chunk:
                    continue

                f.write(chunk)
                downloaded += len(chunk)

                if progress_callback:
                    progress_callback(downloaded, total_size)

def getTitleInformation(title: Title) -> dict:
    r = requests.get(getAPIURL(INFORMATION_ENDPOINT.format(type=title.type.value, id=title.id)))

    r.raise_for_status()

    return r.json()

def getSeasonInformation(title: Title, season: int) -> dict:
    r = requests.get(getAPIURL(SEASON_ENDPOINT.format(id=title.id, season=season)))

    r.raise_for_status()

    return r.json()

if __name__ == "__main__":
    best = search("The walking")[0]

    print(getSeasonInformation(best, 1))

    # downloadTitle(best, episode=2, season=3, quality=QualityType.LOWEST)
