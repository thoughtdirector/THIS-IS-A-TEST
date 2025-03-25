from sqlmodel import Session
from app.models.child import Child
from app.schemas.child import ChildCreate

def create_child_profile(data: ChildCreate, db: Session) -> Child:
    child = Child.from_orm(data)
    db.add(child)
    db.commit()
    db.refresh(child)
    return child
