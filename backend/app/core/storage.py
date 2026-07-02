import io
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from app.core.config import settings

MARKETING_VIDEO_KEY = "hero-video"


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

    def upload_marketing_video(self, file_bytes: bytes, content_type: str) -> None:
        try:
            self.client.put_object(
                bucket_name=self.video_bucket,
                object_name=MARKETING_VIDEO_KEY,
                data=io.BytesIO(file_bytes),
                length=len(file_bytes),
                content_type=content_type
            )
        except S3Error as err:
            raise Exception(f"Failed to upload marketing video: {err}")

    def get_marketing_video_url(self) -> str | None:
        try:
            # Raises S3Error if object doesn't exist
            self.client.stat_object(self.video_bucket, MARKETING_VIDEO_KEY)
        except S3Error:
            return None
        return self.client.presigned_get_object(
            self.video_bucket, MARKETING_VIDEO_KEY, expires=timedelta(hours=1)
        )


storage_service = StorageService()
