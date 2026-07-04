from typing import List, Optional
from uuid import UUID
import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.auction import (
    CollectorBoard, BoardItem, AuctionResult, Listing, ListingImages, User
)
from app.schemas.boards import (
    BoardCreate, BoardUpdate, BoardItemAdd, BoardItemUpdate,
    BoardItemsReorder, BoardSummaryResponse, BoardResponse,
    BoardItemResponse, BoardItemListingSnapshot,
)


def _listing_snapshot(item: BoardItem) -> Optional[BoardItemListingSnapshot]:
    if not item.result or not item.result.listing:
        return None
    listing: Listing = item.result.listing
    primary = next((img for img in listing.images if img.is_primary),
                   listing.images[0] if listing.images else None)
    return BoardItemListingSnapshot(
        id=listing.id,
        title=listing.title,
        image_url=primary.image_url if primary else None,
        final_price=item.result.final_price,
        ended_at=item.result.ended_at,
    )


def _make_item(item: BoardItem) -> BoardItemResponse:
    return BoardItemResponse(
        id=item.id,
        board_id=item.board_id,
        auction_result_id=item.auction_result_id,
        note=item.note,
        sort_order=item.sort_order,
        added_at=item.added_at,
        listing=_listing_snapshot(item),
    )


def _make_summary(board: CollectorBoard) -> BoardSummaryResponse:
    return BoardSummaryResponse(
        id=board.id,
        user_id=board.user_id,
        name=board.name,
        description=board.description,
        is_public=board.is_public,
        item_count=len(board.items),
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


def _make_board(board: CollectorBoard) -> BoardResponse:
    return BoardResponse(
        id=board.id,
        user_id=board.user_id,
        name=board.name,
        description=board.description,
        is_public=board.is_public,
        created_at=board.created_at,
        updated_at=board.updated_at,
        items=[_make_item(i) for i in sorted(board.items, key=lambda x: x.sort_order)],
    )


def _board_with_items_query(board_id: UUID):
    return (
        select(CollectorBoard)
        .options(
            selectinload(CollectorBoard.items)
            .selectinload(BoardItem.result)
            .selectinload(AuctionResult.listing)
            .selectinload(Listing.images)
        )
        .where(CollectorBoard.id == board_id)
    )


class BoardService:

    @staticmethod
    async def get_own_boards(db: AsyncSession, user_id: UUID) -> List[BoardSummaryResponse]:
        result = await db.execute(
            select(CollectorBoard)
            .options(selectinload(CollectorBoard.items))
            .where(CollectorBoard.user_id == user_id)
            .order_by(CollectorBoard.created_at.desc())
        )
        return [_make_summary(b) for b in result.scalars().all()]

    @staticmethod
    async def get_public_boards_by_user(db: AsyncSession, user_id: UUID) -> List[BoardSummaryResponse]:
        result = await db.execute(
            select(CollectorBoard)
            .options(selectinload(CollectorBoard.items))
            .where(CollectorBoard.user_id == user_id, CollectorBoard.is_public.is_(True))
            .order_by(CollectorBoard.created_at.desc())
        )
        return [_make_summary(b) for b in result.scalars().all()]

    @staticmethod
    async def get_board(
        db: AsyncSession, board_id: UUID, requester: Optional[User]
    ) -> BoardResponse:
        result = await db.execute(_board_with_items_query(board_id))
        board = result.scalars().first()
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        is_owner = requester and board.user_id == requester.id
        # Return 404 (not 403) for private boards to avoid leaking existence
        if not board.is_public and not is_owner:
            raise HTTPException(status_code=404, detail="Board not found")
        return _make_board(board)

    @staticmethod
    async def create_board(
        db: AsyncSession, user_id: UUID, data: BoardCreate
    ) -> BoardSummaryResponse:
        board = CollectorBoard(
            user_id=user_id,
            name=data.name,
            description=data.description,
            is_public=data.is_public,
        )
        db.add(board)
        await db.commit()
        await db.refresh(board)
        return _make_summary(board)

    @staticmethod
    async def update_board(
        db: AsyncSession, board_id: UUID, owner_id: UUID, data: BoardUpdate
    ) -> BoardSummaryResponse:
        result = await db.execute(
            select(CollectorBoard)
            .options(selectinload(CollectorBoard.items))
            .where(CollectorBoard.id == board_id, CollectorBoard.user_id == owner_id)
        )
        board = result.scalars().first()
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        if data.name is not None:
            board.name = data.name
        if data.description is not None:
            board.description = data.description
        if data.is_public is not None:
            board.is_public = data.is_public
        board.updated_at = datetime.datetime.now(datetime.timezone.utc)
        await db.commit()
        await db.refresh(board)
        return _make_summary(board)

    @staticmethod
    async def delete_board(db: AsyncSession, board_id: UUID, owner_id: UUID) -> None:
        result = await db.execute(
            select(CollectorBoard).where(
                CollectorBoard.id == board_id, CollectorBoard.user_id == owner_id
            )
        )
        board = result.scalars().first()
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        await db.delete(board)
        await db.commit()

    @staticmethod
    async def add_item(
        db: AsyncSession, board_id: UUID, owner_id: UUID, data: BoardItemAdd
    ) -> BoardItemResponse:
        # Verify board ownership
        board_exists = await db.scalar(
            select(CollectorBoard.id).where(
                CollectorBoard.id == board_id, CollectorBoard.user_id == owner_id
            )
        )
        if not board_exists:
            raise HTTPException(status_code=404, detail="Board not found")

        # Verify the auction result belongs to this user
        result = await db.execute(
            select(AuctionResult)
            .options(
                selectinload(AuctionResult.listing).selectinload(Listing.images)
            )
            .where(
                AuctionResult.id == data.auction_result_id,
                AuctionResult.winner_id == owner_id,
            )
        )
        auction_result = result.scalars().first()
        if not auction_result:
            raise HTTPException(status_code=404, detail="Auction result not found or not won by you")

        # Check for duplicate
        duplicate = await db.scalar(
            select(BoardItem.id).where(
                BoardItem.board_id == board_id,
                BoardItem.auction_result_id == data.auction_result_id,
            )
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="Item already on this board")

        item = BoardItem(
            board_id=board_id,
            auction_result_id=data.auction_result_id,
            note=data.note,
            sort_order=data.sort_order,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)

        # Re-fetch with relationships for response
        result2 = await db.execute(
            select(BoardItem)
            .options(
                selectinload(BoardItem.result)
                .selectinload(AuctionResult.listing)
                .selectinload(Listing.images)
            )
            .where(BoardItem.id == item.id)
        )
        item = result2.scalars().first()
        return _make_item(item)

    @staticmethod
    async def update_item(
        db: AsyncSession, board_id: UUID, item_id: UUID, owner_id: UUID, data: BoardItemUpdate
    ) -> BoardItemResponse:
        # Load item and verify via board ownership
        result = await db.execute(
            select(BoardItem)
            .join(CollectorBoard, BoardItem.board_id == CollectorBoard.id)
            .options(
                selectinload(BoardItem.result)
                .selectinload(AuctionResult.listing)
                .selectinload(Listing.images)
            )
            .where(
                BoardItem.id == item_id,
                BoardItem.board_id == board_id,
                CollectorBoard.user_id == owner_id,
            )
        )
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        if data.note is not None:
            item.note = data.note
        if data.sort_order is not None:
            item.sort_order = data.sort_order

        if data.target_board_id is not None:
            # Verify the target board also belongs to this owner
            target_exists = await db.scalar(
                select(CollectorBoard.id).where(
                    CollectorBoard.id == data.target_board_id,
                    CollectorBoard.user_id == owner_id,
                )
            )
            if not target_exists:
                raise HTTPException(status_code=404, detail="Target board not found")
            # Check for duplicate on target board
            duplicate = await db.scalar(
                select(BoardItem.id).where(
                    BoardItem.board_id == data.target_board_id,
                    BoardItem.auction_result_id == item.auction_result_id,
                )
            )
            if duplicate:
                raise HTTPException(status_code=409, detail="Item already on target board")
            item.board_id = data.target_board_id

        await db.commit()
        await db.refresh(item)
        return _make_item(item)

    @staticmethod
    async def remove_item(
        db: AsyncSession, board_id: UUID, item_id: UUID, owner_id: UUID
    ) -> None:
        result = await db.execute(
            select(BoardItem)
            .join(CollectorBoard, BoardItem.board_id == CollectorBoard.id)
            .where(
                BoardItem.id == item_id,
                BoardItem.board_id == board_id,
                CollectorBoard.user_id == owner_id,
            )
        )
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        await db.delete(item)
        await db.commit()

    @staticmethod
    async def reorder_items(
        db: AsyncSession, board_id: UUID, owner_id: UUID, data: BoardItemsReorder
    ) -> None:
        board_exists = await db.scalar(
            select(CollectorBoard.id).where(
                CollectorBoard.id == board_id, CollectorBoard.user_id == owner_id
            )
        )
        if not board_exists:
            raise HTTPException(status_code=404, detail="Board not found")

        for entry in data.items:
            result = await db.execute(
                select(BoardItem).where(
                    BoardItem.id == entry.item_id, BoardItem.board_id == board_id
                )
            )
            item = result.scalars().first()
            if item:
                item.sort_order = entry.sort_order
        await db.commit()
