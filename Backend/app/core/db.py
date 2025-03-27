from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.old_models import User, UserCreate
from app.models.role import Role

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

def init_db(session: Session) -> None:
    roles_count = session.exec(select(Role)).all()
    if not roles_count:
        default_roles = [
            {"role_name": "superadmin", "description": "System-wide administrator with full access"},
            {"role_name": "owner", "description": "Business owner with location management access"},
            {"role_name": "employee", "description": "Staff member with operational access"},
            {"role_name": "parent", "description": "Parent user with child management access"},
            {"role_name": "child", "description": "Child profile without direct system access"}
        ]
        for role_data in default_roles:
            role = Role(**role_data)
            session.add(role)
        session.commit()
    
    superadmin_role = session.exec(select(Role).where(Role.role_name == "superadmin")).first()
    if not superadmin_role:
        return
    
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            fullname="Super Admin",
            role_id=superadmin_role.role_id,
            document_type="ID",
            document_number="ADMIN",
        )
        user = crud.create_user(session=session, user_create=user_in)