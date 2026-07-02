from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.auction import User
from app.api.deps import get_current_user, get_premium_user, get_optional_user
from app.schemas.boards import (
    BoardCreate, BoardUpdate, BoardResponse, BoardSummaryResponse,
    BoardItemAdd, BoardItemUpdate, BoardItemsReorder, BoardItemResponse,
)
from app.services.board_service import BoardService

router = APIRouter()


# ── Public / mixed-auth read ─────────────────────────────────────────────────

@router.get("/me", response_model=List[BoardSummaryResponse])
async def get_my_boards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    """Premium owner: list all own boards including private ones."""
    return await BoardService.get_own_boards(db=db, user_id=current_user.id)


@router.get("/user/{user_id}", response_model=List[BoardSummaryResponse])
async def get_public_boards(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Public: list public boards belonging to a specific user."""
    return await BoardService.get_public_boards_by_user(db=db, user_id=user_id)


@router.get("/{id}", response_model=BoardResponse)
async def get_board(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Public boards visible to anyone. Private boards visible to owner only."""
    return await BoardService.get_board(db=db, board_id=id, requester=current_user)


# ── Premium owner write ──────────────────────────────────────────────────────

@router.post("/", response_model=BoardSummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    return await BoardService.create_board(db=db, user_id=current_user.id, data=data)


@router.post("/{id}", response_model=BoardSummaryResponse)
async def update_board(
    id: UUID,
    data: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    return await BoardService.update_board(db=db, board_id=id, owner_id=current_user.id, data=data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    await BoardService.delete_board(db=db, board_id=id, owner_id=current_user.id)


# ── Board items ──────────────────────────────────────────────────────────────

@router.post("/{id}/items", response_model=BoardItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    id: UUID,
    data: BoardItemAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    return await BoardService.add_item(db=db, board_id=id, owner_id=current_user.id, data=data)


@router.post("/{id}/items/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_items(
    id: UUID,
    data: BoardItemsReorder,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    """Batch-update sort_order for drag-and-drop reordering."""
    await BoardService.reorder_items(db=db, board_id=id, owner_id=current_user.id, data=data)


@router.post("/{id}/items/{item_id}", response_model=BoardItemResponse)
async def update_item(
    id: UUID,
    item_id: UUID,
    data: BoardItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    """Edit note/position or move item to a different board via target_board_id."""
    return await BoardService.update_item(
        db=db, board_id=id, item_id=item_id, owner_id=current_user.id, data=data
    )


@router.delete("/{id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_premium_user),
):
    await BoardService.remove_item(db=db, board_id=id, item_id=item_id, owner_id=current_user.id)
