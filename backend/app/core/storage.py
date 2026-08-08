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
        self.video_bucket = settings.S3_BUCKET_VIDEOS
        self._ensure_bucket_exists()
        self._ensure_video_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except Exception as err:
            print(f"Warning: could not ensure bucket exists: {err}")

    def _ensure_video_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.video_bucket):
                self.client.make_bucket(self.video_bucket)
        except Exception as err:
            print(f"Warning: could not ensure video bucket exists: {err}")

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

    def upload_video(self, file_bytes: bytes, content_type: str, object_key: str) -> None:
        try:
            self.client.put_object(
                bucket_name=self.video_bucket,
                object_name=object_key,
                data=io.BytesIO(file_bytes),
                length=len(file_bytes),
                content_type=content_type
            )
        except Exception as err:
            # Broad catch: connection-level failures (MinIO unreachable, DNS, timeouts)
            # raise from urllib3, not S3Error, and would otherwise surface as a bare 500.
            raise Exception(f"Failed to upload video: {err}")

    def get_video_url(self, object_key: str) -> str:
        # Presigned URLs resolve against S3_ENDPOINT (the internal Docker hostname),
        # which the browser can't reach. The video bucket is public-read, so route
        # through nginx's public /auction-videos/ proxy instead.
        return f"{settings.FRONTEND_URL.rstrip('/')}/auction-videos/{object_key}"

    def delete_object(self, bucket: str, object_key: str) -> None:
        try:
            self.client.remove_object(bucket, object_key)
        except S3Error as err:
            raise Exception(f"Failed to delete object: {err}")


storage_service = StorageService()
