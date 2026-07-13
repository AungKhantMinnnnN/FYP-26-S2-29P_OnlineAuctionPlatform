import datetime
import math
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.auction import (
    AdminLog,
    Notification,
    User,
    UserProfiles,
    UserRole,
    UserStatus,
)


class AdminUserService:
    @staticmethod
    def _summary(user: User) -> dict:
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
            "status": user.status.value,
            "created_at": user.created_at,
        }

    @staticmethod
    def _profile(user: User) -> Optional[dict]:
        if not user.profile:
            return None

        return {
            "full_name": user.profile.full_name,
            "phone": user.profile.phone,
            "address": user.profile.address,
            "dob": user.profile.dob,
            "bio": user.profile.bio,
        }

    @staticmethod
    async def _get_latest_suspension_log(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> Optional[AdminLog]:
        statement = (
            select(AdminLog)
            .where(
                AdminLog.target_id == user_id,
                AdminLog.action == "suspend_user",
            )
            .order_by(AdminLog.created_at.desc())
            .limit(1)
        )

        result = await db.execute(statement)
        return result.scalars().first()

    @staticmethod
    async def _details(
        db: AsyncSession,
        user: User,
    ) -> dict:
        suspension_log = await AdminUserService._get_latest_suspension_log(
            db=db,
            user_id=user.id,
        )

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
            "status": user.status.value,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "email_verified": user.email_verified,
            "subscription_tier": user.subscription_tier.value,
            "subscription_expires_at": user.subscription_expires_at,
            "balance": user.balance,
            "suspended_at": (
                suspension_log.created_at
                if suspension_log
                and user.status == UserStatus.suspended
                else None
            ),
            "suspension_reason": (
                suspension_log.details
                if suspension_log
                and user.status == UserStatus.suspended
                else None
            ),
            "profile": AdminUserService._profile(user),
        }

    @staticmethod
    async def get_users(
        db: AsyncSession,
        search: str,
        page: int,
        size: int,
        status_filter: Optional[UserStatus],
    ) -> dict:
        filters = []

        if search:
            search_pattern = f"%{search.strip()}%"

            filters.append(
                or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    UserProfiles.full_name.ilike(search_pattern),
                )
            )

        if status_filter is not None:
            filters.append(User.status == status_filter)

        count_statement = (
            select(func.count(func.distinct(User.id)))
            .select_from(User)
            .outerjoin(
                UserProfiles,
                UserProfiles.user_id == User.id,
            )
        )

        if filters:
            count_statement = count_statement.where(*filters)

        total_result = await db.execute(count_statement)
        total = total_result.scalar_one()

        statement = (
            select(User)
            .outerjoin(
                UserProfiles,
                UserProfiles.user_id == User.id,
            )
            .options(selectinload(User.profile))
            .order_by(User.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
        )

        if filters:
            statement = statement.where(*filters)

        result = await db.execute(statement)
        users = result.scalars().unique().all()

        pages = math.ceil(total / size) if total else 0

        return {
            "items": [
                AdminUserService._summary(user)
                for user in users
            ],
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }

    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> dict:
        statement = (
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.profile))
        )

        result = await db.execute(statement)
        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found",
            )

        return await AdminUserService._details(
            db=db,
            user=user,
        )

    @staticmethod
    async def suspend_user(
        db: AsyncSession,
        admin: User,
        user_id: uuid.UUID,
        reason: str,
    ) -> dict:
        statement = (
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.profile))
        )

        result = await db.execute(statement)
        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found",
            )

        if user.id == admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot suspend your own account",
            )

        if user.role == UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator accounts cannot be suspended",
            )

        if user.status == UserStatus.deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Deleted accounts cannot be suspended",
            )

        if user.status == UserStatus.suspended:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This account is already suspended",
            )

        cleaned_reason = reason.strip()

        if not cleaned_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Suspension reason is required",
            )

        now = datetime.datetime.now(datetime.timezone.utc)

        try:
            user.status = UserStatus.suspended
            user.updated_at = now

            notification = Notification(
                id=uuid.uuid4(),
                user_id=user.id,
                title="Account Suspended",
                message=(
                    "Your account has been suspended by an administrator. "
                    f"Reason: {cleaned_reason}"
                ),
                is_read=False,
                created_at=now,
            )

            admin_log = AdminLog(
                id=uuid.uuid4(),
                admin_id=admin.id,
                action="suspend_user",
                target_id=user.id,
                details=cleaned_reason,
                created_at=now,
            )

            db.add(notification)
            db.add(admin_log)

            await db.commit()
            await db.refresh(user)

        except SQLAlchemyError:
            await db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to suspend the user account",
            )

        return await AdminUserService._details(
            db=db,
            user=user,
        )

    @staticmethod
    async def delete_user(
        db: AsyncSession,
        admin: User,
        user_id: uuid.UUID,
    ) -> None:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )

        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found",
            )

        if user.id == admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account",
            )

        if user.role == UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator accounts cannot be deleted",
            )

        if user.status == UserStatus.deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This account has already been deleted",
            )

        now = datetime.datetime.now(datetime.timezone.utc)

        try:
            # Soft deletion preserves bids, listings, auction results,
            # wallet transactions, disputes and audit history.
            user.status = UserStatus.deleted
            user.updated_at = now

            notification = Notification(
                id=uuid.uuid4(),
                user_id=user.id,
                title="Account Deleted",
                message=(
                    "Your account has been deleted by an administrator. "
                    "You will no longer be able to access the platform."
                ),
                is_read=False,
                created_at=now,
            )

            admin_log = AdminLog(
                id=uuid.uuid4(),
                admin_id=admin.id,
                action="delete_user",
                target_id=user.id,
                details="User account soft-deleted by administrator",
                created_at=now,
            )

            db.add(notification)
            db.add(admin_log)

            await db.commit()

        except SQLAlchemyError:
            await db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete the user account",
            )