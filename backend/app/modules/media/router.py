from fastapi import APIRouter, Depends, UploadFile

from app.core.deps import get_current_user_id
from app.modules.media.service import upload_cover_image

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload")
def upload(file: UploadFile, user_id: int = Depends(get_current_user_id)) -> dict:
    file_bytes = file.file.read()
    url = upload_cover_image(file_bytes, file.content_type or "image/jpeg")
    return {"url": url}
