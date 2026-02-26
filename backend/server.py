from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
import time
import shutil
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from passlib.context import CryptContext
import jwt as pyjwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiting
rate_limits = defaultdict(list)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# App
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ===== MODELS =====

class LoginRequest(BaseModel):
    username: str
    password: str

class ApplicationCreate(BaseModel):
    lastName: str  # Фамилия (обязательно)
    firstName: str  # Имя (обязательно)
    patronymic: str  # Отчество (обязательно)
    phone: str  # Телефон (обязательно)
    age: str = ""  # Возраст
    city: str = ""  # Город
    problem: str  # Описание проблемы (обязательно)
    honeypot: str = ""

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class ParticipantCreate(BaseModel):
    slug: str
    name: str
    title: str = ""
    description: str = ""
    full_description: str = ""
    photo_url: str = ""
    specializations: List[str] = []
    is_active: bool = True
    order: int = 0

class ReviewCreate(BaseModel):
    author_name: str
    author_city: str = ""
    text: str
    rating: int = 5
    is_published: bool = True
    participant_slug: str = ""

class FAQCreate(BaseModel):
    question: str
    answer: str
    order: int = 0
    is_active: bool = True

class GalleryPhotoCreate(BaseModel):
    image_url: str
    title: str = ""
    description: str = ""
    alt_text: str = ""
    order: int = 0
    is_published: bool = True

class GalleryVideoCreate(BaseModel):
    video_url: str
    title: str = ""
    description: str = ""
    thumbnail_url: str = ""
    order: int = 0
    is_published: bool = True

class SEOUpdate(BaseModel):
    title: str = ""
    description: str = ""
    keywords: str = ""
    h1: str = ""
    og_title: str = ""
    og_description: str = ""

class PageBlocksUpdate(BaseModel):
    blocks: dict = {}

class SiteSettingsUpdate(BaseModel):
    email: str = ""
    phone: str = ""
    address: str = ""
    notification_email: str = ""
    working_hours: str = ""
    copyright_text: str = ""
    email_notifications_enabled: bool = True
    # Логотип сайта (шапка и футер)
    logo_url: str = ""
    logo_alt: str = "Битва Экстрасенсов"
    logo_height_desktop: int = 56  # px
    logo_height_mobile: int = 48  # px

class ContactFormCreate(BaseModel):
    name: str
    email: str
    message: str
    honeypot: str = ""


# ===== AUTH HELPERS =====

def create_access_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недействительный токен")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    payload = verify_token(credentials.credentials)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user = await db.admin_users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


# ===== RATE LIMITING =====

def check_rate_limit(ip: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
    now = time.time()
    rate_limits[ip] = [t for t in rate_limits[ip] if now - t < window_seconds]
    if len(rate_limits[ip]) >= max_requests:
        return False
    rate_limits[ip].append(now)
    return True


# ===== EMAIL NOTIFICATION =====

async def send_notification_email(application: dict):
    if not RESEND_API_KEY:
        logger.info("RESEND_API_KEY not set, skipping email notification")
        return
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
        to_email = (settings or {}).get("notification_email", "")
        if not to_email:
            logger.info("No notification email configured")
            return
        
        # Check if email notifications are enabled
        email_enabled = (settings or {}).get("email_notifications_enabled", True)
        if not email_enabled:
            logger.info("Email notifications disabled in settings")
            return
        
        # Полное имя
        full_name = application.get('name') or f"{application.get('lastName', '')} {application.get('firstName', '')} {application.get('patronymic', '')}".strip()
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0d3040; padding: 20px; text-align: center;">
                <h1 style="color: #d4a637; margin: 0;">Новая заявка</h1>
                <p style="color: #ffffff; margin: 5px 0 0 0;">Битва экстрасенсов — сайт помощи</p>
            </div>
            <div style="background: #f5f5f5; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 130px;">Фамилия:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{application.get('lastName', '-')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Имя:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{application.get('firstName', '-')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Отчество:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{application.get('patronymic', '-')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Телефон:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{application.get('phone', '-')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Возраст:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{application.get('age', '-') or '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Город:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{application.get('city', '-') or '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; vertical-align: top;">Проблема:</td>
                        <td style="padding: 10px;">{application.get('problem', '-') or '-'}</td>
                    </tr>
                </table>
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                    Дата заявки: {application.get('created_at', '-')}
                </p>
            </div>
        </div>
        """
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": f"Новая заявка от {full_name} — Битва экстрасенсов",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Notification email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send notification email: {e}")


# ===== PUBLIC ROUTES =====

@api_router.get("/")
async def root():
    return {"message": "Битва экстрасенсов API"}

@api_router.get("/pages/{page_slug}")
async def get_page(page_slug: str):
    page = await db.pages.find_one({"page_slug": page_slug}, {"_id": 0})
    if not page:
        return {"page_slug": page_slug, "blocks": {}}
    return page

@api_router.get("/participants")
async def get_participants():
    items = await db.participants.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return items

@api_router.get("/participants/{slug}")
async def get_participant(slug: str):
    item = await db.participants.find_one({"slug": slug, "is_active": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Участник не найден")
    return item

@api_router.get("/reviews")
async def get_reviews():
    items = await db.reviews.find({"is_published": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items

@api_router.get("/participants/{slug}/reviews")
async def get_participant_reviews(slug: str):
    items = await db.reviews.find(
        {"participant_slug": slug, "is_published": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items

@api_router.get("/faq")
async def get_faq():
    items = await db.faq.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return items

@api_router.get("/gallery/photos")
async def get_gallery_photos():
    items = await db.gallery_photos.find({"is_published": True}, {"_id": 0}).sort("order", 1).to_list(200)
    return items

@api_router.get("/gallery/videos")
async def get_gallery_videos():
    items = await db.gallery_videos.find({"is_published": True}, {"_id": 0}).sort("order", 1).to_list(200)
    return items

@api_router.get("/seo/{page_slug}")
async def get_seo(page_slug: str):
    seo = await db.seo_settings.find_one({"page_slug": page_slug}, {"_id": 0})
    if not seo:
        return {"page_slug": page_slug, "title": "", "description": "", "keywords": "", "h1": ""}
    return seo

@api_router.get("/settings")
async def get_settings():
    settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        return {"email": "", "phone": "", "working_hours": "", "copyright_text": ""}
    return settings

@api_router.post("/applications")
async def create_application(data: ApplicationCreate, request: Request):
    if data.honeypot:
        return {"status": "success", "message": "Заявка принята"}
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Слишком много запросов. Попробуйте позже.")
    
    # Валидация обязательных полей
    if not data.lastName.strip():
        raise HTTPException(status_code=400, detail="Укажите фамилию")
    if not data.firstName.strip():
        raise HTTPException(status_code=400, detail="Укажите имя")
    if not data.patronymic.strip():
        raise HTTPException(status_code=400, detail="Укажите отчество")
    if not data.phone.strip():
        raise HTTPException(status_code=400, detail="Укажите телефон")
    if not data.problem.strip():
        raise HTTPException(status_code=400, detail="Опишите вашу проблему")
    
    # Составляем полное имя для совместимости
    full_name = f"{data.lastName} {data.firstName} {data.patronymic}".strip()
    
    doc = {
        "id": str(uuid.uuid4()),
        "lastName": data.lastName,
        "firstName": data.firstName,
        "patronymic": data.patronymic,
        "name": full_name,  # для обратной совместимости
        "phone": data.phone,
        "age": data.age,
        "city": data.city,
        "problem": data.problem,
        "status": "new",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.applications.insert_one(doc)
    doc.pop("_id", None)
    asyncio.create_task(send_notification_email(doc))
    return {"status": "success", "message": "Заявка успешно отправлена"}

@api_router.post("/contact")
async def create_contact(data: ContactFormCreate, request: Request):
    if data.honeypot:
        return {"status": "success", "message": "Сообщение отправлено"}
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, max_requests=3, window_seconds=120):
        raise HTTPException(status_code=429, detail="Слишком много запросов. Попробуйте позже.")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "message": data.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contact_messages.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "message": "Сообщение отправлено"}


# ===== ADMIN AUTH ROUTES =====

@api_router.post("/admin/login")
async def admin_login(data: LoginRequest):
    user = await db.admin_users.find_one({"username": data.username}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    token = create_access_token(data.username)
    return {"token": token, "username": data.username}

@api_router.get("/admin/me")
async def admin_me(admin=Depends(get_current_admin)):
    return {"username": admin["username"]}


# ===== ADMIN APPLICATIONS =====

@api_router.get("/admin/applications")
async def admin_get_applications(admin=Depends(get_current_admin)):
    items = await db.applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.put("/admin/applications/{app_id}")
async def admin_update_application(app_id: str, data: ApplicationUpdate, admin=Depends(get_current_admin)):
    update = {}
    if data.status is not None:
        update["status"] = data.status
    if data.notes is not None:
        update["notes"] = data.notes
    if not update:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    result = await db.applications.update_one({"id": app_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    updated = await db.applications.find_one({"id": app_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/applications/{app_id}")
async def admin_delete_application(app_id: str, admin=Depends(get_current_admin)):
    result = await db.applications.delete_one({"id": app_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"status": "success"}

@api_router.get("/admin/applications/export/csv")
async def admin_export_applications_csv(admin=Depends(get_current_admin)):
    """Export all applications as CSV file (UTF-8 with BOM for Excel compatibility)"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    items = await db.applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    # Create CSV in memory with UTF-8 BOM for Excel
    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM for Excel
    
    fieldnames = ['Дата', 'Фамилия', 'Имя', 'Отчество', 'Телефон', 'Город', 'Возраст', 'Проблема', 'Статус', 'Заметки']
    writer = csv.DictWriter(output, fieldnames=fieldnames, delimiter=';')
    writer.writeheader()
    
    for item in items:
        writer.writerow({
            'Дата': item.get('created_at', '')[:19].replace('T', ' ') if item.get('created_at') else '',
            'Фамилия': item.get('lastName', ''),
            'Имя': item.get('firstName', ''),
            'Отчество': item.get('patronymic', ''),
            'Телефон': item.get('phone', ''),
            'Город': item.get('city', ''),
            'Возраст': item.get('age', ''),
            'Проблема': item.get('problem', item.get('description', '')),
            'Статус': item.get('status', ''),
            'Заметки': item.get('notes', ''),
        })
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=applications_export.csv"
        }
    )


# ===== ADMIN PARTICIPANTS =====

@api_router.get("/admin/participants")
async def admin_get_participants(admin=Depends(get_current_admin)):
    items = await db.participants.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return items

@api_router.post("/admin/participants")
async def admin_create_participant(data: ParticipantCreate, admin=Depends(get_current_admin)):
    existing = await db.participants.find_one({"slug": data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Участник с таким slug уже существует")
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.participants.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/participants/{participant_id}")
async def admin_update_participant(participant_id: str, data: ParticipantCreate, admin=Depends(get_current_admin)):
    update = data.model_dump()
    result = await db.participants.update_one({"id": participant_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Участник не найден")
    updated = await db.participants.find_one({"id": participant_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/participants/{participant_id}")
async def admin_delete_participant(participant_id: str, admin=Depends(get_current_admin)):
    result = await db.participants.delete_one({"id": participant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Участник не найден")
    return {"status": "success"}


# ===== ADMIN REVIEWS =====

@api_router.get("/admin/reviews")
async def admin_get_reviews(admin=Depends(get_current_admin)):
    items = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/admin/reviews")
async def admin_create_review(data: ReviewCreate, admin=Depends(get_current_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/reviews/{review_id}")
async def admin_update_review(review_id: str, data: ReviewCreate, admin=Depends(get_current_admin)):
    update = data.model_dump()
    result = await db.reviews.update_one({"id": review_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Отзыв не найден")
    updated = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, admin=Depends(get_current_admin)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Отзыв не найден")
    return {"status": "success"}


# ===== ADMIN FAQ =====

@api_router.get("/admin/faq")
async def admin_get_faq(admin=Depends(get_current_admin)):
    items = await db.faq.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return items

@api_router.post("/admin/faq")
async def admin_create_faq(data: FAQCreate, admin=Depends(get_current_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
    }
    await db.faq.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/faq/{faq_id}")
async def admin_update_faq(faq_id: str, data: FAQCreate, admin=Depends(get_current_admin)):
    update = data.model_dump()
    result = await db.faq.update_one({"id": faq_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    updated = await db.faq.find_one({"id": faq_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/faq/{faq_id}")
async def admin_delete_faq(faq_id: str, admin=Depends(get_current_admin)):
    result = await db.faq.delete_one({"id": faq_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    return {"status": "success"}


# ===== ADMIN SEO =====

@api_router.get("/admin/seo")
async def admin_get_all_seo(admin=Depends(get_current_admin)):
    items = await db.seo_settings.find({}, {"_id": 0}).to_list(100)
    return items

@api_router.put("/admin/seo/{page_slug}")
async def admin_update_seo(page_slug: str, data: SEOUpdate, admin=Depends(get_current_admin)):
    update = data.model_dump()
    update["page_slug"] = page_slug
    result = await db.seo_settings.update_one(
        {"page_slug": page_slug},
        {"$set": update},
        upsert=True
    )
    updated = await db.seo_settings.find_one({"page_slug": page_slug}, {"_id": 0})
    return updated


# ===== ADMIN PAGES =====

@api_router.get("/admin/pages")
async def admin_get_all_pages(admin=Depends(get_current_admin)):
    items = await db.pages.find({}, {"_id": 0}).to_list(100)
    return items

@api_router.put("/admin/pages/{page_slug}")
async def admin_update_page(page_slug: str, data: PageBlocksUpdate, admin=Depends(get_current_admin)):
    update = {
        "blocks": data.blocks,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.pages.update_one(
        {"page_slug": page_slug},
        {"$set": update},
        upsert=True
    )
    updated = await db.pages.find_one({"page_slug": page_slug}, {"_id": 0})
    return updated


# ===== ADMIN SETTINGS =====

@api_router.get("/admin/settings")
async def admin_get_settings(admin=Depends(get_current_admin)):
    settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        return {"id": "site_settings", "email": "", "phone": "", "notification_email": "", "working_hours": "", "copyright_text": ""}
    return settings

@api_router.put("/admin/settings")
async def admin_update_settings(data: SiteSettingsUpdate, admin=Depends(get_current_admin)):
    update = data.model_dump()
    update["id"] = "site_settings"
    await db.site_settings.update_one(
        {"id": "site_settings"},
        {"$set": update},
        upsert=True
    )
    updated = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    return updated


# ===== ADMIN CONTACT MESSAGES =====

@api_router.get("/admin/contacts")
async def admin_get_contacts(admin=Depends(get_current_admin)):
    items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.delete("/admin/contacts/{msg_id}")
async def admin_delete_contact(msg_id: str, admin=Depends(get_current_admin)):
    result = await db.contact_messages.delete_one({"id": msg_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    return {"status": "success"}


# ===== ADMIN DASHBOARD STATS =====

@api_router.get("/admin/stats")
async def admin_get_stats(admin=Depends(get_current_admin)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    total_apps = await db.applications.count_documents({})
    new_apps = await db.applications.count_documents({"status": "new"})
    today_apps = await db.applications.count_documents({"created_at": {"$gte": today_start}})
    total_participants = await db.participants.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    total_contacts = await db.contact_messages.count_documents({})
    return {
        "total_applications": total_apps,
        "new_applications": new_apps,
        "today_applications": today_apps,
        "total_participants": total_participants,
        "total_reviews": total_reviews,
        "total_contacts": total_contacts,
    }


# ===== FILE UPLOAD =====

@api_router.post("/admin/upload")
async def upload_file(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    """Upload image file for participants, pages, etc."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Разрешены только изображения (JPEG, PNG, WebP, GIF)")
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Максимальный размер файла: 5MB")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Optimize image if pillow available
    try:
        from PIL import Image
        import io
        
        img = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary (for JPEG)
        if img.mode in ("RGBA", "P") and ext.lower() in ("jpg", "jpeg"):
            img = img.convert("RGB")
        
        # Resize if too large (max 1200px)
        max_size = 1200
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Save with compression
        output = io.BytesIO()
        if ext.lower() in ("jpg", "jpeg"):
            img.save(output, format="JPEG", quality=85, optimize=True)
        elif ext.lower() == "png":
            img.save(output, format="PNG", optimize=True)
        elif ext.lower() == "webp":
            img.save(output, format="WebP", quality=85)
        else:
            img.save(output, format=img.format or "JPEG")
        
        contents = output.getvalue()
        logger.info(f"Image optimized: {file.filename} -> {len(contents)} bytes")
    except ImportError:
        logger.warning("Pillow not installed, saving without optimization")
    except Exception as e:
        logger.warning(f"Image optimization failed: {e}, saving original")
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Return URL
    return {
        "status": "success",
        "filename": filename,
        "url": f"/api/uploads/{filename}"
    }


# ===== SEED =====

@api_router.post("/admin/seed")
async def seed_data(admin=Depends(get_current_admin)):
    from seed_data import get_seed_data
    data = get_seed_data()
    await _run_seed(data)
    return {"status": "success", "message": "Данные успешно загружены"}

async def _run_seed(data):
    # Participants
    for p in data["participants"]:
        existing = await db.participants.find_one({"slug": p["slug"]})
        if not existing:
            await db.participants.insert_one(p)

    # Reviews - seed participant-linked reviews if missing
    has_participant_reviews = await db.reviews.count_documents({"participant_slug": {"$exists": True, "$ne": ""}})
    if has_participant_reviews == 0:
        # Remove old reviews without participant links
        await db.reviews.delete_many({"participant_slug": {"$exists": False}})
        await db.reviews.delete_many({"participant_slug": ""})
        for r in data["reviews"]:
            await db.reviews.insert_one(r)

    # FAQ
    existing_faq = await db.faq.count_documents({})
    if existing_faq == 0:
        for f in data["faq_items"]:
            await db.faq.insert_one(f)

    # Pages
    for p in data["pages"]:
        existing = await db.pages.find_one({"page_slug": p["page_slug"]})
        if not existing:
            await db.pages.insert_one(p)

    # SEO
    for s in data["seo_settings"]:
        existing = await db.seo_settings.find_one({"page_slug": s["page_slug"]})
        if not existing:
            await db.seo_settings.insert_one(s)

    # Site Settings
    existing_settings = await db.site_settings.find_one({"id": "site_settings"})
    if not existing_settings:
        await db.site_settings.insert_one(data["site_settings"])


# ===== STARTUP =====

@app.on_event("startup")
async def startup():
    logger.info("Starting up...")
    # Create default admin user if no admins exist
    existing_admin_count = await db.admin_users.count_documents({})
    if existing_admin_count == 0:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "username": "nikoa2020@gmail.com",
            "password_hash": pwd_context.hash("aspire5542gl1952tq"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.admin_users.insert_one(admin_doc)
        logger.info("Default admin user created")

    # Auto-seed
    from seed_data import get_seed_data
    data = get_seed_data()
    await _run_seed(data)
    logger.info("Seed data loaded")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ===== INCLUDE ROUTER & MIDDLEWARE =====

app.include_router(api_router)

# Mount uploads directory for static file serving
from fastapi.responses import FileResponse

@app.get("/api/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(filepath)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
