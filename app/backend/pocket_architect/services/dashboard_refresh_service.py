"""
Dashboard data refresh service.

Periodically refreshes dashboard data from AWS and caches it in SQLite.
Uses APScheduler for background task scheduling and change detection.
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from pocket_architect.core.manager import ResourceManager
from pocket_architect.db.models import DashboardCache, ActivityLog, SSHSession
from pocket_architect.services.quota_service import QuotaService
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class DashboardRefreshService:
    """Service for refreshing and caching dashboard data."""

    def __init__(self, aws_client, db_session: Session, account_id: int, region: str):
        """
        Initialize dashboard refresh service.

        Args:
            aws_client: AWS client instance
            db_session: Database session
            account_id: Account ID for caching
            region: AWS region
        """
        self.aws_client = aws_client
        self.db = db_session
        self.account_id = account_id
        self.region = region
        self.scheduler = BackgroundScheduler()

        # Initialize quota service with manager (create temporary manager for this)
        from pocket_architect.core.manager import ResourceManager

        temp_manager = ResourceManager(region=region)
        temp_manager._aws_provider = type("MockAWS", (), {"client": aws_client})()
        self.quota_service = QuotaService(temp_manager)

        # Cache TTL settings (in minutes)
        self.cache_ttl = {
            "instances": 5,  # 5 minutes
            "quotas": 60,  # 1 hour
            "costs": 60,  # 1 hour
            "health": 2,  # 2 minutes
            "ssh_sessions": 1,  # 1 minute
        }

        logger.info("DashboardRefreshService initialized")

    def start(self):
        """Start the background refresh scheduler."""
        logger.info("Starting dashboard refresh scheduler")

        # Schedule refresh jobs
        self.scheduler.add_job(
            func=self._refresh_instances,
            trigger=IntervalTrigger(minutes=self.cache_ttl["instances"]),
            id="refresh_instances",
            name="Refresh EC2 Instances",
            max_instances=1,
        )

        self.scheduler.add_job(
            func=self._refresh_quotas,
            trigger=IntervalTrigger(minutes=self.cache_ttl["quotas"]),
            id="refresh_quotas",
            name="Refresh Service Quotas",
            max_instances=1,
        )

        self.scheduler.add_job(
            func=self._refresh_costs,
            trigger=IntervalTrigger(minutes=self.cache_ttl["costs"]),
            id="refresh_costs",
            name="Refresh Cost Data",
            max_instances=1,
        )

        self.scheduler.add_job(
            func=self._refresh_health,
            trigger=IntervalTrigger(minutes=self.cache_ttl["health"]),
            id="refresh_health",
            name="Refresh Health Status",
            max_instances=1,
        )

        self.scheduler.add_job(
            func=self._refresh_ssh_sessions,
            trigger=IntervalTrigger(minutes=self.cache_ttl["ssh_sessions"]),
            id="refresh_ssh_sessions",
            name="Refresh SSH Sessions",
            max_instances=1,
        )

        # Start the scheduler
        self.scheduler.start()
        logger.info("Dashboard refresh scheduler started")

    def stop(self):
        """Stop the background refresh scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("Dashboard refresh scheduler stopped")

    def _refresh_instances(self):
        """Refresh EC2 instances data."""
        try:
            logger.info("Refreshing EC2 instances data")

            # Get instances from AWS
            from pocket_architect.providers.aws.ec2 import EC2Provider

            ec2_provider = EC2Provider(self.aws_client)
            instances = ec2_provider.list_instances()

            # Convert to cacheable format
            cache_data = {
                "instances": instances,
                "total_count": len(instances),
                "running_count": len(
                    [i for i in instances if i.get("status") == "running"]
                ),
                "stopped_count": len(
                    [i for i in instances if i.get("status") == "stopped"]
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Cache the data
            self._cache_data("instances", cache_data)

        except Exception as e:
            logger.error(f"Failed to refresh instances: {e}")

    def _refresh_quotas(self):
        """Refresh service quotas data."""
        try:
            logger.info("Refreshing service quotas data")

            # Get quotas from quota service
            quotas = self.quota_service.get_quotas("aws")

            # Convert to cacheable format
            cache_data = {
                "quotas": quotas,
                "categories_count": len(quotas),
                "total_quotas": sum(len(cat.get("quotas", [])) for cat in quotas),
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Cache the data
            self._cache_data("quotas", cache_data)

        except Exception as e:
            logger.error(f"Failed to refresh quotas: {e}")

    def _refresh_costs(self):
        """Refresh cost data."""
        try:
            logger.info("Refreshing cost data")

            # Get cost data from AWS Cost Explorer
            from pocket_architect.providers.aws.costexplorer import CostExplorerProvider

            cost_provider = CostExplorerProvider(self.aws_client)

            # Get cost summary
            cost_summary = cost_provider.get_cost_summary()

            # Get project-based costs
            project_costs = cost_provider.get_project_costs()

            # Combine data
            cache_data = {
                "cost_summary": cost_summary,
                "project_costs": project_costs,
                "total_monthly_cost": cost_summary.get("current_month", {}).get(
                    "cost", 0
                ),
                "forecast_cost": cost_summary.get("forecast_next_month", 0),
                "projects": list(project_costs.get("projects", {}).keys()),
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Cache the data
            self._cache_data("costs", cache_data)

        except Exception as e:
            logger.error(f"Failed to refresh costs: {e}")
            # Cache error state
            cache_data = {
                "error": str(e),
                "total_monthly_cost": 0,
                "forecast_cost": 0,
                "projects": [],
                "timestamp": datetime.utcnow().isoformat(),
            }
            self._cache_data("costs", cache_data)

    def _refresh_health(self):
        """Refresh health status data using CloudWatch."""
        try:
            logger.info("Refreshing health status data")

            # Get instances for health check using EC2 provider
            from pocket_architect.providers.aws.ec2 import EC2Provider

            ec2_provider = EC2Provider(self.aws_client)
            instances = ec2_provider.list_instances()
            instance_ids = [
                i.get("instance_id") for i in instances if i.get("instance_id")
            ]

            # Get CloudWatch health metrics
            from pocket_architect.providers.aws.cloudwatch import CloudWatchProvider

            cw_provider = CloudWatchProvider(self.aws_client)

            # Get instance health status
            instance_health = {}
            if instance_ids:
                instance_health = cw_provider.get_instance_health_status(instance_ids)

            # Get overall dashboard health metrics
            dashboard_health = cw_provider.get_dashboard_health_metrics()

            # Calculate health status summary
            healthy_count = sum(
                1
                for health in instance_health.values()
                if health.get("status") == "healthy"
            )
            warning_count = sum(
                1
                for health in instance_health.values()
                if health.get("status") == "warning"
            )
            error_count = sum(
                1
                for health in instance_health.values()
                if health.get("status") == "error"
            )

            health_data = {
                "instances": instances,
                "instance_health": instance_health,
                "summary": {
                    "healthy_count": healthy_count,
                    "warning_count": warning_count,
                    "error_count": error_count,
                    "total_instances": len(instances),
                },
                "dashboard_health": dashboard_health,
                "alarms": dashboard_health.get("alarms", {}),
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Cache the data
            self._cache_data("health", health_data)

        except Exception as e:
            logger.error(f"Failed to refresh health: {e}")
            # Cache error state
            health_data = {
                "instances": [],
                "instance_health": {},
                "summary": {
                    "healthy_count": 0,
                    "warning_count": 0,
                    "error_count": 0,
                    "total_instances": 0,
                },
                "dashboard_health": {"overall_status": "error"},
                "alarms": {},
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
            self._cache_data("health", health_data)

    def _refresh_ssh_sessions(self):
        """Refresh SSH session data."""
        try:
            logger.info("Refreshing SSH session data")

            # Get active SSH sessions from database
            active_sessions = (
                self.db.query(SSHSession)
                .filter(
                    SSHSession.status == "active",
                    SSHSession.account_id == self.account_id,
                )
                .all()
            )

            # Get recent sessions (last 24 hours)
            recent_cutoff = datetime.utcnow() - timedelta(hours=24)
            recent_sessions = (
                self.db.query(SSHSession)
                .filter(
                    SSHSession.started_at >= recent_cutoff,
                    SSHSession.account_id == self.account_id,
                )
                .order_by(SSHSession.started_at.desc())
                .limit(10)
                .all()
            )

            # Convert to cacheable format
            session_data = {
                "active_sessions": len(active_sessions),
                "total_sessions_24h": len(recent_sessions),
                "sessions": [
                    {
                        "id": s.id,
                        "instance_id": s.instance_id,
                        "user": s.user,
                        "remote_ip": s.remote_ip,
                        "started_at": s.started_at.isoformat()
                        if s.started_at
                        else None,
                        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                        "status": s.status,
                        "duration_minutes": (
                            (s.ended_at - s.started_at).total_seconds() / 60
                            if s.ended_at and s.started_at
                            else None
                        ),
                    }
                    for s in active_sessions[
                        :5
                    ]  # Limit to 5 active sessions for display
                ],
                "recent_sessions": [
                    {
                        "instance_id": s.instance_id,
                        "user": s.user,
                        "started_at": s.started_at.isoformat()
                        if s.started_at
                        else None,
                        "status": s.status,
                    }
                    for s in recent_sessions
                ],
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Cache the data
            self._cache_data("ssh_sessions", session_data)

        except Exception as e:
            logger.error(f"Failed to refresh SSH sessions: {e}")
            # Cache error state
            session_data = {
                "active_sessions": 0,
                "total_sessions_24h": 0,
                "sessions": [],
                "recent_sessions": [],
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
            self._cache_data("ssh_sessions", session_data)

    def _cache_data(self, data_type: str, data: Dict[str, Any]):
        """
        Cache data with change detection.

        Args:
            data_type: Type of data ('instances', 'quotas', etc.)
            data: Data to cache
        """
        try:
            # Generate hash for change detection
            data_str = json.dumps(data, sort_keys=True, default=str)
            data_hash = hashlib.sha256(data_str.encode()).hexdigest()

            # Check if data has changed
            existing = (
                self.db.query(DashboardCache)
                .filter(
                    DashboardCache.data_type == data_type,
                    DashboardCache.account_id == self.account_id,
                    DashboardCache.region == self.region,
                )
                .first()
            )

            if existing and existing.data_hash == data_hash:
                # Data hasn't changed, just update timestamp
                existing.updated_at = datetime.utcnow()
                existing.expires_at = datetime.utcnow() + timedelta(
                    minutes=self.cache_ttl[data_type]
                )
                logger.debug(f"No changes detected for {data_type}, updated timestamp")
            else:
                # Data has changed or doesn't exist, create/update cache entry
                expires_at = datetime.utcnow() + timedelta(
                    minutes=self.cache_ttl[data_type]
                )

                if existing:
                    # Update existing
                    existing.data = data
                    existing.data_hash = data_hash
                    existing.updated_at = datetime.utcnow()
                    existing.expires_at = expires_at
                    logger.info(f"Updated {data_type} cache (data changed)")
                else:
                    # Create new
                    cache_entry = DashboardCache(
                        data_type=data_type,
                        account_id=self.account_id,
                        region=self.region,
                        data=data,
                        data_hash=data_hash,
                        expires_at=expires_at,
                    )
                    self.db.add(cache_entry)
                    logger.info(f"Created new {data_type} cache entry")

                # Emit change signal if data changed
                if existing:
                    self._emit_data_changed_signal(data_type, data)

            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to cache {data_type} data: {e}")
            self.db.rollback()

    def _emit_data_changed_signal(self, data_type: str, data: Dict[str, Any]):
        """
        Emit Qt signal when data changes.

        Args:
            data_type: Type of data that changed
            data: New data
        """
        # TODO: Implement Qt signal emission
        # This will be called when we integrate with the Qt bridge
        logger.info(f"Data changed: {data_type}")

    def get_cached_data(self, data_type: str) -> Optional[Dict[str, Any]]:
        """
        Get cached data if not expired.

        Args:
            data_type: Type of data to retrieve

        Returns:
            Cached data or None if expired/not found
        """
        try:
            cache_entry = (
                self.db.query(DashboardCache)
                .filter(
                    DashboardCache.data_type == data_type,
                    DashboardCache.account_id == self.account_id,
                    DashboardCache.region == self.region,
                    DashboardCache.expires_at > datetime.utcnow(),
                )
                .first()
            )

            if cache_entry:
                logger.debug(f"Retrieved cached {data_type} data")
                return cache_entry.data
            else:
                logger.debug(f"No valid cache found for {data_type}")
                return None

        except Exception as e:
            logger.error(f"Failed to get cached {data_type} data: {e}")
            return None

    def invalidate_cache(self, data_type: Optional[str] = None):
        """
        Invalidate cache entries.

        Args:
            data_type: Specific data type to invalidate, or None for all
        """
        try:
            query = self.db.query(DashboardCache).filter(
                DashboardCache.account_id == self.account_id,
                DashboardCache.region == self.region,
            )

            if data_type:
                query = query.filter(DashboardCache.data_type == data_type)

            deleted_count = query.delete()
            self.db.commit()

            logger.info(f"Invalidated {deleted_count} cache entries")

        except Exception as e:
            logger.error(f"Failed to invalidate cache: {e}")
            self.db.rollback()

    def cleanup_expired_cache(self):
        """Clean up expired cache entries."""
        try:
            deleted_count = (
                self.db.query(DashboardCache)
                .filter(DashboardCache.expires_at <= datetime.utcnow())
                .delete()
            )

            self.db.commit()
            logger.info(f"Cleaned up {deleted_count} expired cache entries")

        except Exception as e:
            logger.error(f"Failed to cleanup expired cache: {e}")
            self.db.rollback()
