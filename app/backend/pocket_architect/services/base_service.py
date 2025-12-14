"""
Base service classes for common CRUD operations.
Provides generic implementations that can be extended by specific services.
"""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional, Any, Type
from sqlalchemy.orm import Session
from sqlalchemy import desc

from pocket_architect.core.exceptions import ResourceNotFoundError, ValidationError
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)

# Type variables for generic service
T = TypeVar("T")  # API model type
TCreate = TypeVar("TCreate")  # Create request type
TUpdate = TypeVar("TUpdate")  # Update request type
TDB = TypeVar("TDB")  # Database model type


class BaseService(Generic[T, TCreate, TUpdate, TDB], ABC):
    """
    Generic base service providing common CRUD operations.

    Type parameters:
        T: API model type
        TCreate: Create request type
        TUpdate: Update request type
        TDB: Database model type
    """

    def __init__(self, db_session: Session):
        """
        Initialize base service.

        Args:
            db_session: Database session
        """
        self.db = db_session

    @property
    @abstractmethod
    def db_model_class(self) -> Type[TDB]:
        """Database model class for this service."""
        pass

    @property
    @abstractmethod
    def resource_name(self) -> str:
        """Human-readable name of the resource (e.g., 'Project', 'Instance')."""
        pass

    @abstractmethod
    def _db_to_model(self, db_obj: TDB) -> T:
        """
        Convert database object to API model.

        Args:
            db_obj: Database object

        Returns:
            API model instance
        """
        pass

    @abstractmethod
    def _create_request_to_db(self, request: TCreate) -> TDB:
        """
        Convert create request to database object.

        Args:
            request: Create request

        Returns:
            Database object
        """
        pass

    def list_entities(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = False,
    ) -> List[T]:
        """
        List entities with pagination and ordering.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Field to order by
            order_desc: Order descending if True

        Returns:
            List of API models
        """
        query = self.db.query(self.db_model_class)

        # Apply ordering
        if order_by:
            column = getattr(self.db_model_class, order_by, None)
            if column is not None:
                if order_desc:
                    query = query.order_by(desc(column))
                else:
                    query = query.order_by(column)

        # Apply pagination
        query = query.offset(skip).limit(limit)

        entities_db = query.all()
        logger.info(
            f"Found {len(entities_db)} {self.resource_name.lower()}s in database"
        )

        return [self._db_to_model(entity_db) for entity_db in entities_db]

    def get_entity(self, entity_id: int) -> T:
        """
        Get entity by ID.

        Args:
            entity_id: Entity ID

        Returns:
            API model

        Raises:
            ResourceNotFoundError: If entity not found
        """
        entity_db = (
            self.db.query(self.db_model_class)
            .filter(self.db_model_class.id == entity_id)
            .first()
        )

        if not entity_db:
            raise ResourceNotFoundError(self.resource_name, str(entity_id))

        return self._db_to_model(entity_db)

    def create_entity(self, request: TCreate) -> T:
        """
        Create a new entity.

        Args:
            request: Create request

        Returns:
            Created API model

        Raises:
            ValidationError: If validation fails
        """
        logger.info(
            f"Creating {self.resource_name.lower()}: {getattr(request, 'name', 'unnamed')}"
        )

        # Validate request
        self._validate_create_request(request)

        # Convert to database object
        entity_db = self._create_request_to_db(request)

        # Add to database
        self.db.add(entity_db)
        self.db.commit()
        self.db.refresh(entity_db)

        logger.info(f"Created {self.resource_name.lower()} with ID: {entity_db.id}")
        return self._db_to_model(entity_db)

    def update_entity(self, entity_id: int, request: TUpdate) -> T:
        """
        Update an existing entity.

        Args:
            entity_id: Entity ID
            request: Update request

        Returns:
            Updated API model

        Raises:
            ResourceNotFoundError: If entity not found
            ValidationError: If validation fails
        """
        logger.info(f"Updating {self.resource_name.lower()} {entity_id}")

        # Get existing entity
        entity_db = (
            self.db.query(self.db_model_class)
            .filter(self.db_model_class.id == entity_id)
            .first()
        )

        if not entity_db:
            raise ResourceNotFoundError(self.resource_name, str(entity_id))

        # Validate update request
        self._validate_update_request(entity_db, request)

        # Apply updates
        self._apply_updates(entity_db, request)

        # Commit changes
        self.db.commit()
        self.db.refresh(entity_db)

        logger.info(f"Updated {self.resource_name.lower()} {entity_id}")
        return self._db_to_model(entity_db)

    def delete_entity(self, entity_id: int) -> None:
        """
        Delete an entity.

        Args:
            entity_id: Entity ID

        Raises:
            ResourceNotFoundError: If entity not found
        """
        logger.info(f"Deleting {self.resource_name.lower()} {entity_id}")

        entity_db = (
            self.db.query(self.db_model_class)
            .filter(self.db_model_class.id == entity_id)
            .first()
        )

        if not entity_db:
            raise ResourceNotFoundError(self.resource_name, str(entity_id))

        # Check if deletion is allowed
        self._validate_delete(entity_db)

        # Delete from database
        self.db.delete(entity_db)
        self.db.commit()

        logger.info(f"Deleted {self.resource_name.lower()} {entity_id}")

    # ============================================================================
    # Validation Methods (can be overridden)
    # ============================================================================

    def _validate_create_request(self, request: TCreate) -> None:
        """
        Validate create request.

        Args:
            request: Create request

        Raises:
            ValidationError: If validation fails
        """
        pass

    def _validate_update_request(self, entity_db: TDB, request: TUpdate) -> None:
        """
        Validate update request.

        Args:
            entity_db: Current database entity
            request: Update request

        Raises:
            ValidationError: If validation fails
        """
        pass

    def _validate_delete(self, entity_db: TDB) -> None:
        """
        Validate that entity can be deleted.

        Args:
            entity_db: Database entity to delete

        Raises:
            ValidationError: If deletion is not allowed
        """
        pass

    def _apply_updates(self, entity_db: TDB, request: TUpdate) -> None:
        """
        Apply updates from request to database object.

        Args:
            entity_db: Database object to update
            request: Update request
        """
        # Default implementation - update all non-None fields
        for key, value in request.__dict__.items():
            if value is not None and hasattr(entity_db, key):
                setattr(entity_db, key, value)
