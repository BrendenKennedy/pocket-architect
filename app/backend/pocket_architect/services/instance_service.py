"""
Instance service for managing cloud instances.
Coordinates between AWS EC2 provider and local database.
"""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from pocket_architect.core.models import Instance, CreateInstanceRequest
from pocket_architect.db.models import InstanceDB, ProjectDB
from pocket_architect.core.exceptions import ResourceNotFoundError, ValidationError
from pocket_architect.providers.aws import AWSProvider
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class InstanceService:
    """Service for managing instances."""

    def __init__(self, aws_provider: AWSProvider, db_session: Session):
        """
        Initialize instance service.

        Args:
            aws_provider: AWS provider instance
            db_session: Database session
        """
        self.aws = aws_provider
        self.db = db_session

    def list_instances(self, project_id: Optional[int] = None) -> List[Instance]:
        """
        List instances from AWS EC2 and enrich with local data.

        Args:
            project_id: Optional project ID to filter by

        Returns:
            List of Instance models
        """
        logger.info(f"Listing instances (project_id={project_id})")

        # Get instances from AWS EC2
        aws_instances = self.aws.ec2.list_instances()

        # Get instances from local database
        query = self.db.query(InstanceDB)
        if project_id:
            query = query.filter(InstanceDB.project_id == project_id)
        local_instances = {inst.aws_instance_id: inst for inst in query.all()}

        # Merge AWS data with local data
        instances = []
        for aws_inst in aws_instances:
            instance_id = aws_inst["instance_id"]
            local_inst = local_instances.get(instance_id)

            if local_inst:
                # Instance exists in our database
                instance = self._merge_aws_and_local(aws_inst, local_inst)
            else:
                # Instance not in our database (created outside our tool)
                instance = self._aws_to_model(aws_inst)

            instances.append(instance)

        logger.info(f"Found {len(instances)} instances")
        return instances

    def get_instance(self, instance_id: int) -> Instance:
        """
        Get instance by local database ID.

        Args:
            instance_id: Local database instance ID

        Returns:
            Instance model

        Raises:
            ResourceNotFoundError: If instance not found
        """
        instance_db = (
            self.db.query(InstanceDB).filter(InstanceDB.id == instance_id).first()
        )

        if not instance_db:
            raise ResourceNotFoundError("Instance", str(instance_id))

        # Get current state from AWS
        if instance_db.aws_instance_id:
            aws_inst = self.aws.ec2.get_instance(instance_db.aws_instance_id)
            if aws_inst:
                return self._merge_aws_and_local(aws_inst, instance_db)

        # Fallback to database only
        return self._db_to_model(instance_db)

    def create_instance(self, request: CreateInstanceRequest) -> Instance:
        """
        Create a new EC2 instance.

        Args:
            request: Instance creation request

        Returns:
            Created Instance model
        """
        logger.info(f"Creating instance: {request.name}")

        # Validate project exists
        project = (
            self.db.query(ProjectDB).filter(ProjectDB.id == request.projectId).first()
        )
        if not project:
            raise ResourceNotFoundError("Project", str(request.projectId))

        # Validate platform matches
        if request.platform != project.platform:
            raise ValidationError(
                f"Instance platform '{request.platform}' doesn't match project platform '{project.platform}'"
            )

        # For AWS, we need an AMI ID - use a default Amazon Linux 2 AMI for testing
        # In production, this should be configurable or selected by user
        default_amis = {
            "us-east-1": "ami-0230bd60aa48260c6",  # Amazon Linux 2023
            "us-west-2": "ami-0efcece6bed30fd98",
        }
        ami_id = default_amis.get(request.region, default_amis["us-east-1"])

        # Create instance in AWS EC2
        aws_instance = self.aws.ec2.create_instance(
            ami_id=ami_id,
            instance_type=request.instanceType,
            key_name=request.sshKey if request.sshKey else None,
            tags={
                "Name": request.name,
                "Project": project.name,
                "ManagedBy": "PocketArchitect",
            },
        )

        # Save to local database
        instance_db = InstanceDB(
            name=request.name,
            project_id=request.projectId,
            platform=request.platform,
            region=request.region,
            instance_type=request.instanceType,
            storage=request.storage,
            ssh_key=request.sshKey or "",
            security_config=str(request.securityConfigId)
            if request.securityConfigId
            else "",
            tags=request.tags or [],
            aws_instance_id=aws_instance["instance_id"],
            aws_ami_id=ami_id,
            status="degraded",  # Starting
            created=datetime.utcnow(),
        )

        self.db.add(instance_db)
        self.db.commit()
        self.db.refresh(instance_db)

        logger.info(
            f"Instance created with ID: {instance_db.id}, AWS ID: {aws_instance['instance_id']}"
        )

        return self._merge_aws_and_local(aws_instance, instance_db)

    def start_instance(self, instance_id: int) -> Instance:
        """
        Start a stopped instance.

        Args:
            instance_id: Local database instance ID

        Returns:
            Updated Instance model
        """
        instance_db = (
            self.db.query(InstanceDB).filter(InstanceDB.id == instance_id).first()
        )

        if not instance_db:
            raise ResourceNotFoundError("Instance", str(instance_id))

        if not instance_db.aws_instance_id:
            raise ValidationError("Instance has no AWS instance ID")

        logger.info(
            f"Starting instance {instance_id} (AWS: {instance_db.aws_instance_id})"
        )
        self.aws.ec2.start_instance(instance_db.aws_instance_id)

        # Update status
        instance_db.status = "degraded"  # Starting
        self.db.commit()

        return self.get_instance(instance_id)

    def stop_instance(self, instance_id: int) -> Instance:
        """
        Stop a running instance.

        Args:
            instance_id: Local database instance ID

        Returns:
            Updated Instance model
        """
        instance_db = (
            self.db.query(InstanceDB).filter(InstanceDB.id == instance_id).first()
        )

        if not instance_db:
            raise ResourceNotFoundError("Instance", str(instance_id))

        if not instance_db.aws_instance_id:
            raise ValidationError("Instance has no AWS instance ID")

        logger.info(
            f"Stopping instance {instance_id} (AWS: {instance_db.aws_instance_id})"
        )
        self.aws.ec2.stop_instance(instance_db.aws_instance_id)

        # Update status
        instance_db.status = "degraded"  # Stopping
        self.db.commit()

        return self.get_instance(instance_id)

    def restart_instance(self, instance_id: int) -> Instance:
        """
        Restart an instance.

        Args:
            instance_id: Local database instance ID

        Returns:
            Updated Instance model
        """
        instance_db = (
            self.db.query(InstanceDB).filter(InstanceDB.id == instance_id).first()
        )

        if not instance_db:
            raise ResourceNotFoundError("Instance", str(instance_id))

        if not instance_db.aws_instance_id:
            raise ValidationError("Instance has no AWS instance ID")

        logger.info(
            f"Restarting instance {instance_id} (AWS: {instance_db.aws_instance_id})"
        )
        self.aws.ec2.reboot_instance(instance_db.aws_instance_id)

        return self.get_instance(instance_id)

    def terminate_instance(self, instance_id: int) -> None:
        """
        Terminate an instance.

        Args:
            instance_id: Local database instance ID
        """
        instance_db = (
            self.db.query(InstanceDB).filter(InstanceDB.id == instance_id).first()
        )

        if not instance_db:
            raise ResourceNotFoundError("Instance", str(instance_id))

        if instance_db.aws_instance_id:
            logger.info(
                f"Terminating instance {instance_id} (AWS: {instance_db.aws_instance_id})"
            )
            self.aws.ec2.terminate_instance(instance_db.aws_instance_id)

        # Delete from database
        self.db.delete(instance_db)
        self.db.commit()

        logger.info(f"Instance {instance_id} terminated and removed from database")

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _aws_to_model(self, aws_inst: dict) -> Instance:
        """
        Convert AWS instance data to Instance model.

        Args:
            aws_inst: AWS instance dict

        Returns:
            Instance model
        """
        # Calculate uptime
        uptime = "Unknown"
        if aws_inst.get("launch_time"):
            try:
                launch_time = datetime.fromisoformat(
                    aws_inst["launch_time"].replace("Z", "+00:00")
                )
                delta = (
                    datetime.utcnow().replace(tzinfo=launch_time.tzinfo) - launch_time
                )
                days = delta.days
                hours = delta.seconds // 3600
                uptime = f"{days}d {hours}h"
            except Exception:
                pass

        return Instance(
            id=0,  # Not in our database
            name=aws_inst.get("name", "Unknown"),
            projectId=0,
            projectName="Unknown",
            projectColor="#gray",
            status=aws_inst.get("status", "error"),
            instanceType=aws_inst.get("instance_type", "unknown"),
            platform="aws",
            region=self.aws.region,
            publicIp=aws_inst.get("public_ip"),
            privateIp=aws_inst.get("private_ip", ""),
            created=aws_inst.get("launch_time", datetime.utcnow().isoformat()),
            uptime=uptime,
            monthlyCost=0.0,
            storage=0,
            securityConfig="",
            sshKey=aws_inst.get("key_name", ""),
            tags=[],
        )

    def _db_to_model(self, instance_db: InstanceDB) -> Instance:
        """
        Convert InstanceDB to Instance model.

        Args:
            instance_db: Database model

        Returns:
            Instance model
        """
        project = (
            self.db.query(ProjectDB)
            .filter(ProjectDB.id == instance_db.project_id)
            .first()
        )

        uptime = "Unknown"
        if instance_db.created:
            delta = datetime.utcnow() - instance_db.created
            days = delta.days
            hours = delta.seconds // 3600
            uptime = f"{days}d {hours}h"

        return Instance(
            id=instance_db.id,
            name=instance_db.name,
            projectId=instance_db.project_id,
            projectName=project.name if project else "Unknown",
            projectColor=project.color if project else "#gray",
            status=instance_db.status,
            instanceType=instance_db.instance_type,
            platform=instance_db.platform,
            region=instance_db.region,
            publicIp=instance_db.public_ip,
            privateIp=instance_db.private_ip or "",
            created=instance_db.created.isoformat(),
            uptime=uptime,
            monthlyCost=instance_db.monthly_cost,
            storage=instance_db.storage,
            securityConfig=instance_db.security_config,
            sshKey=instance_db.ssh_key,
            tags=instance_db.tags or [],
        )

    def _merge_aws_and_local(self, aws_inst: dict, instance_db: InstanceDB) -> Instance:
        """
        Merge AWS instance data with local database data.

        Args:
            aws_inst: AWS instance dict
            instance_db: Database model

        Returns:
            Instance model with merged data
        """
        project = (
            self.db.query(ProjectDB)
            .filter(ProjectDB.id == instance_db.project_id)
            .first()
        )

        uptime = "Unknown"
        if aws_inst.get("launch_time"):
            try:
                launch_time = datetime.fromisoformat(
                    aws_inst["launch_time"].replace("Z", "+00:00")
                )
                delta = (
                    datetime.utcnow().replace(tzinfo=launch_time.tzinfo) - launch_time
                )
                days = delta.days
                hours = delta.seconds // 3600
                uptime = f"{days}d {hours}h"
            except Exception:
                pass

        # Update instance_db with latest AWS data
        instance_db.status = aws_inst.get("status", instance_db.status)
        instance_db.public_ip = aws_inst.get("public_ip")
        instance_db.private_ip = aws_inst.get("private_ip", instance_db.private_ip)
        self.db.commit()

        return Instance(
            id=instance_db.id,
            name=instance_db.name,
            projectId=instance_db.project_id,
            projectName=project.name if project else "Unknown",
            projectColor=project.color if project else "#gray",
            status=aws_inst.get("status", instance_db.status),
            instanceType=instance_db.instance_type,
            platform=instance_db.platform,
            region=instance_db.region,
            publicIp=aws_inst.get("public_ip"),
            privateIp=aws_inst.get("private_ip", instance_db.private_ip or ""),
            created=instance_db.created.isoformat(),
            uptime=uptime,
            monthlyCost=instance_db.monthly_cost,
            storage=instance_db.storage,
            securityConfig=instance_db.security_config,
            sshKey=instance_db.ssh_key,
            tags=instance_db.tags or [],
        )
