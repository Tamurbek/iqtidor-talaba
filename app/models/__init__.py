from app.core.database import Base
from app.models.user import User
from app.models.role import Role, Permission, role_permissions, user_roles
from app.models.news import News
from app.models.announcement import Announcement
from app.models.document import Document
from app.models.achievement import StudentAchievement
from app.models.application import ContestApplication
from app.models.club import ScientificClub, ClubMembership
from app.models.exam import StudentExamResult

__all__ = [
    "Base", "User", "Role", "Permission", "role_permissions", "user_roles",
    "News", "Announcement", "Document", "StudentAchievement",
    "ContestApplication", "ScientificClub", "ClubMembership", "StudentExamResult"
]
