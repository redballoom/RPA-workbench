"""
Base repository class
"""
from typing import Generic, Type, TypeVar, Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base repository class for CRUD operations
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        Initialize repository
        """
        self.model = model
        self.db = db

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record
        """
        try:
            # Convert Pydantic model to dict
            if hasattr(obj_in, "model_dump"):
                obj_data = obj_in.model_dump()
            elif isinstance(obj_in, dict):
                obj_data = obj_in
            else:
                obj_data = obj_in.__dict__

            db_obj = self.model(**obj_data)
            self.db.add(db_obj)
            await self.db.commit()
            await self.db.refresh(db_obj)
            return db_obj
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise

    async def get(self, id: str) -> Optional[ModelType]:
        """
        Get a record by ID
        """
        try:
            result = await self.db.execute(
                select(self.model).where(self.model.id == id)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[ModelType]:
        """
        Get multiple records with pagination and filters
        """
        try:
            query = select(self.model)

            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        query = query.where(getattr(self.model, key) == value)

            # Apply pagination
            query = query.offset(skip).limit(limit)

            result = await self.db.execute(query)
            return result.scalars().all()
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise

    async def update(
        self,
        id: str,
        obj_in: UpdateSchemaType,
    ) -> Optional[ModelType]:
        """
        Update a record
        """
        try:
            # Convert Pydantic model to dict
            if hasattr(obj_in, "model_dump"):
                update_data = obj_in.model_dump(exclude_unset=True)
            elif isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.__dict__

            # Remove None values
            update_data = {k: v for k, v in update_data.items() if v is not None}

            await self.db.execute(
                update(self.model)
                .where(self.model.id == id)
                .values(**update_data)
            )
            await self.db.commit()

            # Get updated record
            result = await self.db.execute(
                select(self.model).where(self.model.id == id)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise

    async def delete(self, id: str) -> bool:
        """
        Delete a record
        """
        try:
            result = await self.db.execute(
                delete(self.model).where(self.model.id == id)
            )
            await self.db.commit()
            return result.rowcount > 0
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records with optional filters
        """
        try:
            query = select(func.count(self.model.id))

            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        query = query.where(getattr(self.model, key) == value)

            result = await self.db.execute(query)
            return result.scalar_one()
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise
