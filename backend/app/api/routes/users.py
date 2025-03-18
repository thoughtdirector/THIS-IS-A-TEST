import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, select, SQLModel
from pydantic import EmailStr
from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    Item,
    Message,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UserTermsStatus,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
    Client,
    ClientCreate,
    QRCode,
    ClientGroup,
    ClientPublic

)
from app.utils.utils import generate_new_account_email, send_email

router = APIRouter()


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersPublic(data=users, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    statement = delete(Item).where(col(Item.owner_id) == current_user.id)
    session.exec(statement)  # type: ignore
    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/signup-user", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    """
    raise HTTPException(
            status_code=404,
            detail="",
        )
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    
  
    session.flush()  # This assigns an id to personal_org if it wasn't set

    # Associate the user with the personal organization
 
 

    # Commit the changes
    session.commit()

    # Refresh the user object to include the new organization
    session.refresh(user)
    

    return user

class ClientRegister(SQLModel):
    email: EmailStr 
    password: str 
    full_name: str 
    phone: str 

@router.post("/signup-r", response_model=UserPublic)
def register_client(session: SessionDep, user_in: ClientRegister) -> Any:
    """
    Create new user without the need to be logged in.
    """
    raise HTTPException(
            status_code=404,
            detail="",
        )
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    
  
    session.flush()  # This assigns an id to personal_org if it wasn't set

    # Associate the user with the personal organization
 
 
    client = Client.model_validate(user_in)
    client.is_child = False
    session.add(client)
    session.commit()
    session.refresh(client)
    
    # Commit the changes
    session.commit()

    # Refresh the user object to include the new organization
    session.refresh(user)

    return user

@router.post("/signup", response_model=Dict[str, Any])
def register_user(
    *, session: SessionDep, user_in: UserRegister, client_in: ClientCreate
) -> Any:
    """
    Register a new user with associated client and client group.
    """
    # Check if user with this email already exists
    user = session.exec(select(User).where(User.email == user_in.email)).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    # Check if client with this email already exists
    client = session.exec(select(Client).where(Client.email == client_in.email)).first()
    if client:
        raise HTTPException(
            status_code=400,
            detail="A client with this email already exists."
        )
    
    # Create user
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_active=True,
    )
    session.add(db_user)
   
  
    # Create client

    db_client = Client.model_validate(client_in)
  
    db_client.user_id = db_user.id
    session.add(db_client)
    session.commit()

    
    # Create QR code for the client
    qr_code = QRCode(client_id=db_client.id)
    session.add(qr_code)
    

    # Update client with QR code ID
    db_client.qr_code = str(qr_code.id)
    session.add(db_client)
    
    # Create a ClientGroup for this user
    group_name = f"{db_client.full_name}'s Group"
    client_group = ClientGroup(name=group_name)
    session.add(client_group)
    

    # Add the client to the group
    db_client.group_id = client_group.id
    session.add(db_client)
    
    # Make the user an admin of the group
    
   
    client_group.admins.append(db_client)
    session.commit()
    session.refresh(db_client)
    
    return {
        "user": UserPublic.model_validate(db_user),
        "client": ClientPublic.model_validate(db_client),
        "client_group_id": client_group.id,
        "message": "User, client, and client group created successfully"
    }

@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    statement = delete(Item).where(col(Item.owner_id) == user_id)
    session.exec(statement)  # type: ignore
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")

@router.get("/terms-status")
def get_terms_status(
    current_user: CurrentUser
) -> Any:
    """
    Get the terms status for the current user.
    """

    if current_user.terms_accepted:
        return Message(message="Terms have been accepted")
    
    return HTTPException(
        status_code=403,
        detail="Terms have not been accepted"
    )

@router.post("/accept-terms")
def accept_terms(
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    Accept the terms for the current user.
    """

    current_user.terms_accepted = True
    session.add(current_user)
    session.commit()
    return Message(message="Terms accepted successfully")
