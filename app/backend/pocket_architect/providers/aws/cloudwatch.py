"""
AWS CloudWatch provider for monitoring and health checks.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

from pocket_architect.providers.aws.client import AWSClient, handle_aws_error
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class CloudWatchProvider:
    """AWS CloudWatch operations provider."""

    def __init__(self, client: AWSClient):
        """
        Initialize CloudWatch provider.

        Args:
            client: AWSClient instance
        """
        self.client = client
        self.cw = client.get_client("cloudwatch")

    @handle_aws_error
    def describe_alarms(
        self,
        alarm_names: Optional[List[str]] = None,
        alarm_name_prefix: Optional[str] = None,
        state_value: Optional[str] = None,
        action_prefix: Optional[str] = None,
        max_records: Optional[int] = None,
        next_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Describe CloudWatch alarms.

        Args:
            alarm_names: List of alarm names
            alarm_name_prefix: Alarm name prefix
            state_value: Alarm state (OK, ALARM, INSUFFICIENT_DATA)
            action_prefix: Action prefix
            max_records: Maximum records to return
            next_token: Pagination token

        Returns:
            Alarm descriptions
        """
        params = {}
        if alarm_names:
            params["AlarmNames"] = alarm_names
        if alarm_name_prefix:
            params["AlarmNamePrefix"] = alarm_name_prefix
        if state_value:
            params["StateValue"] = state_value
        if action_prefix:
            params["ActionPrefix"] = action_prefix
        if max_records:
            params["MaxRecords"] = max_records
        if next_token:
            params["NextToken"] = next_token

        response = self.cw.describe_alarms(**params)
        return response

    @handle_aws_error
    def get_metric_statistics(
        self,
        namespace: str,
        metric_name: str,
        dimensions: Optional[List[Dict[str, str]]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        period: int = 300,
        statistics: Optional[List[str]] = None,
        extended_statistics: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get metric statistics.

        Args:
            namespace: Metric namespace
            metric_name: Metric name
            dimensions: Metric dimensions
            start_time: Start time for metrics
            end_time: End time for metrics
            period: Period in seconds
            statistics: Statistics to retrieve
            extended_statistics: Extended statistics

        Returns:
            Metric statistics
        """
        if statistics is None:
            statistics = ["Average", "Maximum", "Minimum"]

        if start_time is None:
            start_time = datetime.utcnow() - timedelta(hours=1)
        if end_time is None:
            end_time = datetime.utcnow()

        params = {
            "Namespace": namespace,
            "MetricName": metric_name,
            "StartTime": start_time,
            "EndTime": end_time,
            "Period": period,
            "Statistics": statistics,
        }

        if dimensions:
            params["Dimensions"] = dimensions
        if extended_statistics:
            params["ExtendedStatistics"] = extended_statistics

        response = self.cw.get_metric_statistics(**params)
        return response

    @handle_aws_error
    def list_metrics(
        self,
        namespace: Optional[str] = None,
        metric_name: Optional[str] = None,
        dimensions: Optional[List[Dict[str, str]]] = None,
        next_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        List CloudWatch metrics.

        Args:
            namespace: Metric namespace filter
            metric_name: Metric name filter
            dimensions: Dimension filters
            next_token: Pagination token

        Returns:
            Available metrics
        """
        params = {}
        if namespace:
            params["Namespace"] = namespace
        if metric_name:
            params["MetricName"] = metric_name
        if dimensions:
            params["Dimensions"] = dimensions
        if next_token:
            params["NextToken"] = next_token

        response = self.cw.list_metrics(**params)
        return response

    def get_instance_health_status(self, instance_ids: List[str]) -> Dict[str, Any]:
        """
        Get health status for EC2 instances using CloudWatch metrics.

        Args:
            instance_ids: List of EC2 instance IDs

        Returns:
            Health status for each instance
        """
        health_status = {}
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=5)  # Check last 5 minutes

        for instance_id in instance_ids:
            try:
                # Check CPU utilization
                cpu_response = self.get_metric_statistics(
                    namespace="AWS/EC2",
                    metric_name="CPUUtilization",
                    dimensions=[{"Name": "InstanceId", "Value": instance_id}],
                    start_time=start_time,
                    end_time=end_time,
                    period=300,
                    statistics=["Average", "Maximum"],
                )

                # Check status check metrics
                status_response = self.get_metric_statistics(
                    namespace="AWS/EC2",
                    metric_name="StatusCheckFailed",
                    dimensions=[{"Name": "InstanceId", "Value": instance_id}],
                    start_time=start_time,
                    end_time=end_time,
                    period=300,
                    statistics=["Maximum"],
                )

                # Determine health status
                cpu_datapoints = cpu_response.get("Datapoints", [])
                status_datapoints = status_response.get("Datapoints", [])

                if not cpu_datapoints and not status_datapoints:
                    # No metrics available - assume healthy but unknown
                    health = "unknown"
                    status_message = "No metrics available"
                else:
                    # Check status check failures
                    has_failures = any(
                        dp.get("Maximum", 0) > 0 for dp in status_datapoints
                    )

                    if has_failures:
                        health = "error"
                        status_message = "Status check failed"
                    else:
                        # Check CPU utilization for degradation
                        avg_cpu = (
                            sum(dp.get("Average", 0) for dp in cpu_datapoints)
                            / len(cpu_datapoints)
                            if cpu_datapoints
                            else 0
                        )
                        max_cpu = max(
                            (dp.get("Maximum", 0) for dp in cpu_datapoints), default=0
                        )

                        if max_cpu > 95:
                            health = "error"
                            status_message = f"High CPU usage ({max_cpu:.1f}%)"
                        elif avg_cpu > 80:
                            health = "warning"
                            status_message = f"Elevated CPU usage ({avg_cpu:.1f}%)"
                        else:
                            health = "healthy"
                            status_message = f"Normal operation (CPU: {avg_cpu:.1f}%)"

                health_status[instance_id] = {
                    "status": health,
                    "message": status_message,
                    "cpu_average": sum(dp.get("Average", 0) for dp in cpu_datapoints)
                    / len(cpu_datapoints)
                    if cpu_datapoints
                    else None,
                    "cpu_max": max(
                        (dp.get("Maximum", 0) for dp in cpu_datapoints), default=None
                    ),
                    "last_checked": datetime.utcnow().isoformat(),
                }

            except Exception as e:
                logger.error(
                    f"Failed to get health status for instance {instance_id}: {e}"
                )
                health_status[instance_id] = {
                    "status": "error",
                    "message": f"Health check failed: {str(e)}",
                    "last_checked": datetime.utcnow().isoformat(),
                }

        return health_status

    def get_alarm_summary(self) -> Dict[str, Any]:
        """
        Get summary of CloudWatch alarms.

        Returns:
            Alarm summary by state
        """
        try:
            # Get all alarms
            alarms_response = self.describe_alarms()

            alarm_states = {"OK": 0, "ALARM": 0, "INSUFFICIENT_DATA": 0}

            alarm_details = []
            for alarm in alarms_response.get("MetricAlarms", []):
                state = alarm.get("StateValue", "INSUFFICIENT_DATA")
                alarm_states[state] += 1

                alarm_details.append(
                    {
                        "name": alarm.get("AlarmName"),
                        "state": state,
                        "description": alarm.get("AlarmDescription", ""),
                        "metric": alarm.get("MetricName", ""),
                        "namespace": alarm.get("Namespace", ""),
                    }
                )

            return {
                "summary": alarm_states,
                "alarms": alarm_details,
                "total_alarms": len(alarm_details),
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get alarm summary: {e}")
            return {
                "summary": {"OK": 0, "ALARM": 0, "INSUFFICIENT_DATA": 0},
                "alarms": [],
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat(),
            }

    def get_dashboard_health_metrics(self) -> Dict[str, Any]:
        """
        Get comprehensive health metrics for dashboard display.

        Returns:
            Health metrics summary
        """
        try:
            # Get alarm summary
            alarm_summary = self.get_alarm_summary()

            # Get recent metrics for key services
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)

            # Check ELB health (if any load balancers exist)
            elb_metrics = {}
            try:
                elb_response = self.list_metrics(namespace="AWS/ELB")
                if elb_response.get("Metrics"):
                    # Get unhealthy host count for load balancers
                    elb_health = self.get_metric_statistics(
                        namespace="AWS/ELB",
                        metric_name="UnHealthyHostCount",
                        start_time=start_time,
                        end_time=end_time,
                        period=300,
                        statistics=["Maximum"],
                    )
                    elb_metrics = {
                        "unhealthy_hosts": sum(
                            dp.get("Maximum", 0)
                            for dp in elb_health.get("Datapoints", [])
                        ),
                        "has_load_balancers": True,
                    }
                else:
                    elb_metrics = {"has_load_balancers": False}
            except Exception:
                elb_metrics = {
                    "has_load_balancers": False,
                    "error": "ELB metrics unavailable",
                }

            return {
                "alarms": alarm_summary,
                "load_balancers": elb_metrics,
                "overall_status": "error"
                if alarm_summary["summary"]["ALARM"] > 0
                else "warning"
                if alarm_summary["summary"]["INSUFFICIENT_DATA"] > 0
                else "healthy",
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get dashboard health metrics: {e}")
            return {
                "alarms": {
                    "summary": {"OK": 0, "ALARM": 0, "INSUFFICIENT_DATA": 0},
                    "alarms": [],
                },
                "load_balancers": {"has_load_balancers": False},
                "overall_status": "error",
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat(),
            }
