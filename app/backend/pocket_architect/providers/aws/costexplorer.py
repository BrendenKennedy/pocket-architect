"""
AWS Cost Explorer provider for cost and budget data.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

from pocket_architect.providers.aws.client import AWSClient, handle_aws_error
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class CostExplorerProvider:
    """AWS Cost Explorer operations provider."""

    def __init__(self, client: AWSClient):
        """
        Initialize Cost Explorer provider.

        Args:
            client: AWSClient instance
        """
        self.client = client
        self.ce = client.ce

    @handle_aws_error
    def get_cost_and_usage(
        self,
        start_date: str,
        end_date: str,
        granularity: str = "MONTHLY",
        metrics: Optional[List[str]] = None,
        group_by: Optional[List[Dict[str, str]]] = None,
        filter: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Get cost and usage data from Cost Explorer.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            granularity: DAILY, MONTHLY, HOURLY
            metrics: List of metrics (e.g., ['BlendedCost', 'UnblendedCost'])
            group_by: Group by dimensions
            filter: Cost filters

        Returns:
            Cost and usage data
        """
        if metrics is None:
            metrics = ["BlendedCost"]

        params = {
            "TimePeriod": {"Start": start_date, "End": end_date},
            "Granularity": granularity,
            "Metrics": metrics,
        }

        if group_by:
            params["GroupBy"] = group_by

        if filter:
            params["Filter"] = filter

        response = self.ce.get_cost_and_usage(**params)
        return response

    @handle_aws_error
    def get_cost_forecast(
        self,
        start_date: str,
        end_date: str,
        metric: str = "BLENDED_COST",
        granularity: str = "MONTHLY",
    ) -> Dict[str, Any]:
        """
        Get cost forecast data.

        Args:
            start_date: Start date for forecast
            end_date: End date for forecast
            metric: Forecast metric
            granularity: Forecast granularity

        Returns:
            Forecast data
        """
        response = self.ce.get_cost_forecast(
            TimePeriod={"Start": start_date, "End": end_date},
            Metric=metric,
            Granularity=granularity,
        )
        return response

    @handle_aws_error
    def get_reservation_coverage(
        self,
        start_date: str,
        end_date: str,
        granularity: str = "MONTHLY",
        group_by: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Get reservation coverage data.

        Args:
            start_date: Start date
            end_date: End date
            granularity: Coverage granularity
            group_by: Group by dimensions

        Returns:
            Reservation coverage data
        """
        params = {
            "TimePeriod": {"Start": start_date, "End": end_date},
            "Granularity": granularity,
        }

        if group_by:
            params["GroupBy"] = group_by

        response = self.ce.get_reservation_coverage(**params)
        return response

    def get_monthly_costs_by_service(self, months: int = 3) -> Dict[str, Any]:
        """
        Get monthly costs grouped by service for the last N months.

        Args:
            months: Number of months to look back

        Returns:
            Monthly cost data by service
        """
        end_date = datetime.utcnow().replace(day=1)
        start_date = end_date - timedelta(days=30 * months)

        try:
            response = self.get_cost_and_usage(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d"),
                granularity="MONTHLY",
                group_by=[{"Type": "DIMENSION", "Key": "SERVICE"}],
            )

            # Process the response
            service_costs = {}
            for group in response.get("ResultsByTime", []):
                period = group.get("TimePeriod", {})
                for group_item in group.get("Groups", []):
                    service = group_item.get("Keys", ["Unknown"])[0]
                    amount = float(
                        group_item.get("Metrics", {})
                        .get("BlendedCost", {})
                        .get("Amount", "0")
                    )

                    if service not in service_costs:
                        service_costs[service] = []

                    service_costs[service].append(
                        {"period": period.get("Start"), "cost": amount}
                    )

            return {
                "services": service_costs,
                "periods": [
                    group.get("TimePeriod", {}).get("Start")
                    for group in response.get("ResultsByTime", [])
                ],
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get monthly costs by service: {e}")
            return {
                "services": {},
                "periods": [],
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat(),
            }

    def get_project_costs(
        self, project_tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get costs grouped by project tags.

        Args:
            project_tags: List of tag keys to group by (e.g., ['Project', 'Environment'])

        Returns:
            Project-based cost data
        """
        if project_tags is None:
            project_tags = ["Project", "Environment"]

        # Get current month costs
        end_date = datetime.utcnow()
        start_date = end_date.replace(day=1)

        try:
            # Build filter for tagged resources
            tag_filters = []
            for tag_key in project_tags:
                tag_filters.append(
                    {"Tags": {"Key": tag_key, "MatchOptions": ["PRESENT"]}}
                )

            filter_expr = (
                {"Or": tag_filters} if len(tag_filters) > 1 else tag_filters[0]
            )

            response = self.get_cost_and_usage(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d"),
                granularity="MONTHLY",
                group_by=[{"Type": "TAG", "Key": project_tags[0]}],
                filter=filter_expr,
            )

            # Process project costs
            project_costs = {}
            total_cost = 0

            for group in response.get("ResultsByTime", []):
                for group_item in group.get("Groups", []):
                    tag_value = group_item.get("Keys", ["Unknown"])[0]
                    amount = float(
                        group_item.get("Metrics", {})
                        .get("BlendedCost", {})
                        .get("Amount", "0")
                    )

                    project_costs[tag_value] = {
                        "monthly_cost": amount,
                        "last_updated": datetime.utcnow().isoformat(),
                    }
                    total_cost += amount

            return {
                "projects": project_costs,
                "total_cost": total_cost,
                "currency": "USD",  # Cost Explorer returns in account currency
                "period": {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d"),
                },
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get project costs: {e}")
            return {
                "projects": {},
                "total_cost": 0,
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat(),
            }

    def get_cost_summary(self) -> Dict[str, Any]:
        """
        Get overall cost summary for dashboard.

        Returns:
            Cost summary data
        """
        try:
            # Get current month costs
            end_date = datetime.utcnow()
            start_date = end_date.replace(day=1)

            # Get total costs
            total_response = self.get_cost_and_usage(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d"),
                granularity="MONTHLY",
            )

            total_cost = 0
            for group in total_response.get("ResultsByTime", []):
                amount = float(
                    group.get("Groups", [{}])[0]
                    .get("Metrics", {})
                    .get("BlendedCost", {})
                    .get("Amount", "0")
                )
                total_cost += amount

            # Get forecast for next month
            forecast_end = (end_date.replace(day=1) + timedelta(days=32)).replace(day=1)
            forecast_response = self.get_cost_forecast(
                start_date=end_date.strftime("%Y-%m-%d"),
                end_date=forecast_end.strftime("%Y-%m-%d"),
                metric="BLENDED_COST",
                granularity="MONTHLY",
            )

            forecast_cost = float(forecast_response.get("Total", {}).get("Amount", "0"))

            return {
                "current_month": {
                    "cost": total_cost,
                    "start_date": start_date.strftime("%Y-%m-%d"),
                    "end_date": end_date.strftime("%Y-%m-%d"),
                },
                "forecast_next_month": forecast_cost,
                "currency": "USD",
                "last_updated": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get cost summary: {e}")
            return {
                "current_month": {"cost": 0},
                "forecast_next_month": 0,
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat(),
            }
