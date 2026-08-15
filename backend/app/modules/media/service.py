import uuid

import boto3

from app.config import settings


def upload_cover_image(file_bytes: bytes, content_type: str) -> str:
    client = boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )
    extension = content_type.split("/")[-1]
    if extension == "jpeg":
        extension = "jpg"
    key = f"covers/{uuid.uuid4()}.{extension}"
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"{settings.r2_endpoint_url}/{settings.r2_bucket_name}/{key}"
