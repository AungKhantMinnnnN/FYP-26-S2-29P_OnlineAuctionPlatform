import datetime
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.auction import User, UserProfiles, UserRole, UserStatus
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.core.security import get_password_hash, verify_password, create_access_token

class AuthService:
    @staticmethod
    async def register_user(db: AsyncSession, request: RegisterRequest) -> User:

        print(request)
        stmt = select(User).where((User.username == request.username) | (User.email == request.email))
        result = await db.execute(stmt)
        existing_user = result.scalars().first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        hashed_password = get_password_hash(request.password)
        
        new_user = User(
            id=uuid.uuid4(),
            username=request.username,
            email=request.email,
            password_hash=hashed_password,
            role=UserRole.user,
            status=UserStatus.active,
            balance=0.0,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            updated_at=datetime.datetime.now(datetime.timezone.utc)
        )
        
        db.add(new_user)
        await db.flush()
        
        new_profile = UserProfiles(
            id=uuid.uuid4(),
            user_id=new_user.id,
            full_name=request.full_name,
            phone=request.phone,
            address=request.address,
            bio=request.bio,
            updated_at=datetime.datetime.now(datetime.timezone.utc)
        )
        
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_user)
        
        return new_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, request: LoginRequest) -> Token:
        stmt = select(User).where((User.username == request.username_or_email) | (User.email == request.username_or_email))
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if user.status != UserStatus.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is suspended or deleted"
            )
            
        access_token = create_access_token(subject=user.id)
        return Token(access_token=access_token, token_type="bearer")
