"""Thin requests.Session wrapper scoped to the API Gateway's base URL."""
import time

import requests

import config

# backend/app/core/config.py RATE_LIMIT_CREATE_LISTING allows 10 calls per 60s
# per IP. run_all.py runs every module in one process against one IP, and
# several modules (auctions, feedback, watchlist) call create_listing as setup
# for unrelated cases, so the shared budget trips well before any single
# module's calls do. Pacing every create_listing call here -- the one choke
# point all of them pass through -- keeps the suite under the limit regardless
# of which modules run or in what order.
_CREATE_LISTING_MIN_INTERVAL = 7.0
_last_create_listing_call = 0.0


class ApiClient:
    def __init__(self, token=None, base_url=None):
        self.session = requests.Session()
        self.token = token
        self.base_url = base_url or config.BASE_URL

    def _headers(self, extra=None):
        headers = dict(extra or {})
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _url(self, path):
        return path if path.startswith("http") else f"{self.base_url}{path}"

    def request(self, method, path, **kwargs):
        if method == "POST" and path.rstrip("/") == "/auctions/create_listing":
            _pace_create_listing()
        headers = self._headers(kwargs.pop("headers", None))
        kwargs.setdefault("timeout", config.TIMEOUT)
        return self.session.request(method, self._url(path), headers=headers, **kwargs)

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def patch(self, path, **kwargs):
        return self.request("PATCH", path, **kwargs)

    def put(self, path, **kwargs):
        return self.request("PUT", path, **kwargs)

    def delete(self, path, **kwargs):
        return self.request("DELETE", path, **kwargs)

    def with_token(self, token):
        return ApiClient(token=token)


def _pace_create_listing():
    global _last_create_listing_call
    now = time.monotonic()
    wait = _last_create_listing_call + _CREATE_LISTING_MIN_INTERVAL - now
    if wait > 0:
        time.sleep(wait)
    _last_create_listing_call = time.monotonic()
