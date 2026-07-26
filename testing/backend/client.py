"""Thin requests.Session wrapper scoped to the API Gateway's base URL."""
import requests

import config


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
