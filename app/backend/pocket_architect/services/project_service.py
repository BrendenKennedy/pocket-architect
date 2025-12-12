"""
Project service for managing cloud projects.
Coordinates between AWS provider and local database.
"""

from typing import List
from datetime import datetime
from sqlalchemy.orm import Session

from pocket_architect.core.models import Project, CreateProjectRequest, UpdateProjectRequest
from pocket_architect.db.models import ProjectDB, InstanceDB
from pocket_architect.core.exceptions import ResourceNotFoundError, ValidationError
from pocket_architect.providers.aws import AWSProvider
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class ProjectService:
    """Service for managing projects."""

    def __init__(self, aws_provider: AWSProvider, db_session: Session):
        """
        Initialize project service.

        Args:
            aws_provider: AWS provider instance
            db_session: Database session
        """
        self.aws = aws_provider
        self.db = db_session

    def list_projects(self) -> List[Project]:
        """
        List all projects from local database.

        Returns:
            List of Project models
        """
        projects_db = self.db.query(ProjectDB).all()
        logger.info(f"Found {len(projects_db)} projects in database")

        projects = []
        for project_db in projects_db:
            projects.append(self._db_to_model(project_db))

        return projects

    def get_project(self, project_id: int) -> Project:
        """
        Get project by ID.

        Args:
            project_id: Project ID

        Returns:
            Project model

        Raises:
            ResourceNotFoundError: If project not found
        """
        project_db = self.db.query(ProjectDB).filter(ProjectDB.id == project_id).first()

        if not project_db:
            raise ResourceNotFoundError("Project", str(project_id))

        return self._db_to_model(project_db)

    def create_project(self, request: CreateProjectRequest) -> Project:
        """
        Create a new project.

        Args:
            request: Project creation request

        Returns:
            Created Project model
        """
        logger.info(f"Creating project: {request.name}")

        # Validate platform
        if request.platform not in ['aws', 'gcp', 'azure']:
            raise ValidationError(f"Invalid platform: {request.platform}")

        # Create project in database
        project_db = ProjectDB(
            name=request.name,
            description=request.description,
            platform=request.platform,
            region=request.region,
            vpc=request.vpc or '',
            color=request.color or '#3b82f6',
            cost_limit=request.costLimit or 0.0,
            tags=request.tags or [],
            status='healthy',
            created=datetime.utcnow(),
            last_modified=datetime.utcnow()
        )

        self.db.add(project_db)
        self.db.commit()
        self.db.refresh(project_db)

        logger.info(f"Project created with ID: {project_db.id}")

        # TODO: Create VPC in AWS if needed (future enhancement)
        # if request.platform == 'aws' and not request.vpc:
        #     vpc = self.aws.vpc.create_vpc(...)
        #     project_db.vpc = vpc['VpcId']
        #     self.db.commit()

        return self._db_to_model(project_db)

    def update_project(self, project_id: int, request: UpdateProjectRequest) -> Project:
        """
        Update existing project.

        Args:
            project_id: Project ID
            request: Update request

        Returns:
            Updated Project model

        Raises:
            ResourceNotFoundError: If project not found
        """
        project_db = self.db.query(ProjectDB).filter(ProjectDB.id == project_id).first()

        if not project_db:
            raise ResourceNotFoundError("Project", str(project_id))

        # Update fields if provided
        if request.name is not None:
            project_db.name = request.name
        if request.description is not None:
            project_db.description = request.description
        if request.tags is not None:
            project_db.tags = request.tags
        if request.costLimit is not None:
            project_db.cost_limit = request.costLimit

        project_db.last_modified = datetime.utcnow()

        self.db.commit()
        self.db.refresh(project_db)

        logger.info(f"Project {project_id} updated")

        return self._db_to_model(project_db)

    def delete_project(self, project_id: int) -> None:
        """
        Delete project.

        Args:
            project_id: Project ID

        Raises:
            ResourceNotFoundError: If project not found
        """
        project_db = self.db.query(ProjectDB).filter(ProjectDB.id == project_id).first()

        if not project_db:
            raise ResourceNotFoundError("Project", str(project_id))

        # Check if project has instances
        instance_count = self.db.query(InstanceDB).filter(InstanceDB.project_id == project_id).count()
        if instance_count > 0:
            raise ValidationError(
                f"Cannot delete project with {instance_count} instances. "
                "Delete instances first."
            )

        # TODO: Delete VPC in AWS if we created one (future enhancement)

        self.db.delete(project_db)
        self.db.commit()

        logger.info(f"Project {project_id} deleted")

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _db_to_model(self, project_db: ProjectDB) -> Project:
        """
        Convert ProjectDB to Project model.

        Args:
            project_db: Database model

        Returns:
            Pydantic Project model
        """
        # Count instances
        instance_count = self.db.query(InstanceDB).filter(
            InstanceDB.project_id == project_db.id
        ).count()

        # Get instance IDs
        instance_ids = [
            inst.id for inst in self.db.query(InstanceDB.id).filter(
                InstanceDB.project_id == project_db.id
            ).all()
        ]

        return Project(
            id=project_db.id,
            name=project_db.name,
            description=project_db.description or '',
            status=project_db.status,
            instanceCount=instance_count,
            color=project_db.color,
            instances=instance_ids,
            created=project_db.created.isoformat(),
            monthlyCost=project_db.monthly_cost,
            vpc=project_db.vpc or '',
            platform=project_db.platform,
            region=project_db.region,
            lastModified=project_db.last_modified.isoformat(),
            tags=project_db.tags or [],
            costMonthToDate=project_db.cost_month_to_date,
            costLifetime=project_db.cost_lifetime,
            costLimit=project_db.cost_limit,
            uptimeDays=project_db.uptime_days
        )
