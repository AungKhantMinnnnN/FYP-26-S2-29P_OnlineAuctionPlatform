import io
from minio import Minio
from minio.error import S3Error
from app.core.config import settings

class StorageService:
    def __init__(self):
        endpoint = settings.S3_ENDPOINT.replace("http://", "").replace("https://", "").rstrip("/")
        self.client = Minio(
            endpoint,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_ENDPOINT.startswith("https://")
        )
        self.bucket_name = settings.S3_BUCKET_ASSETS
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except Exception as err:
            # S3Error covers protocol errors; catch-all covers network errors on startup
            print(f"Warning: could not ensure bucket exists: {err}")

    def upload_file(self, file_bytes: bytes, object_name: str, content_type: str) -> str:
        try:
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=io.BytesIO(file_bytes),
                length=len(file_bytes),
                content_type=content_type
            )
            return object_name
        except S3Error as err:
            raise Exception(f"Failed to upload file to S3: {err}")

storage_service = StorageService()
