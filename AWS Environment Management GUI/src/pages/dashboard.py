"""
Dashboard page with metrics, charts, and recent projects
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                               QPushButton, QGridLayout, QScrollArea, QFrame)
from PySide6.QtCore import Qt
from PySide6.QtCharts import QChart, QChartView, QLineSeries, QBarSeries, QBarSet, QValueAxis, QBarCategoryAxis
from PySide6.QtGui import QPainter, QColor, QPen, QBrush, QLinearGradient

class MetricCard(QWidget):
    def __init__(self, icon, label, value, trend="up"):
        super().__init__()
        self.setObjectName("metricCard")
        
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        
        # Icon and trend row
        top_row = QHBoxLayout()
        
        icon_label = QLabel(icon)
        icon_label.setStyleSheet("font-size: 32px;")
        
        trend_icon = "📈" if trend == "up" else "📉" if trend == "down" else "➖"
        trend_color = "#10B981" if trend == "up" else "#EF4444" if trend == "down" else "#9CA3AF"
        trend_label = QLabel(trend_icon)
        trend_label.setStyleSheet(f"font-size: 20px; color: {trend_color};")
        
        top_row.addWidget(icon_label)
        top_row.addStretch()
        top_row.addWidget(trend_label)
        
        layout.addLayout(top_row)
        
        # Metric label
        metric_label = QLabel(label)
        metric_label.setObjectName("metricLabel")
        layout.addWidget(metric_label)
        
        # Metric value
        value_label = QLabel(value)
        value_label.setObjectName("metricValue")
        layout.addWidget(value_label)

class DashboardPage(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("pageContainer")
        self.setup_ui()
        
    def setup_ui(self):
        # Create scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        
        # Container widget for scroll area
        container = QWidget()
        main_layout = QVBoxLayout(container)
        main_layout.setContentsMargins(32, 32, 32, 32)
        main_layout.setSpacing(32)
        
        # Header
        header_layout = QHBoxLayout()
        
        title_layout = QVBoxLayout()
        title = QLabel("Welcome back, Architect")
        title.setObjectName("pageTitle")
        subtitle = QLabel("Here's an overview of your AWS environments")
        subtitle.setObjectName("pageSubtitle")
        title_layout.addWidget(title)
        title_layout.addWidget(subtitle)
        
        header_layout.addLayout(title_layout)
        header_layout.addStretch()
        
        # Header buttons
        refresh_btn = QPushButton("🔄 Refresh")
        refresh_btn.setObjectName("secondaryButton")
        
        new_btn = QPushButton("➕ New Project")
        new_btn.setObjectName("primaryButton")
        
        header_layout.addWidget(refresh_btn)
        header_layout.addWidget(new_btn)
        
        main_layout.addLayout(header_layout)
        
        # Metric cards
        metrics_layout = QGridLayout()
        metrics_layout.setSpacing(24)
        
        card1 = MetricCard("🖥️", "Active Projects", "11", "up")
        card2 = MetricCard("💾", "Total Cost", "$312.45", "up")
        card3 = MetricCard("💿", "Snapshots (7d)", "24", "none")
        card4 = MetricCard("⚠️", "Cost Alerts", "2", "down")
        
        metrics_layout.addWidget(card1, 0, 0)
        metrics_layout.addWidget(card2, 0, 1)
        metrics_layout.addWidget(card3, 0, 2)
        metrics_layout.addWidget(card4, 0, 3)
        
        main_layout.addLayout(metrics_layout)
        
        # Charts row
        charts_layout = QHBoxLayout()
        charts_layout.setSpacing(24)
        
        # Cost trends chart
        cost_chart_widget = self.create_cost_chart()
        charts_layout.addWidget(cost_chart_widget, 2)
        
        # Resource usage chart
        resource_chart_widget = self.create_resource_chart()
        charts_layout.addWidget(resource_chart_widget, 1)
        
        main_layout.addLayout(charts_layout)
        
        # Recent projects
        recent_projects = self.create_recent_projects()
        main_layout.addWidget(recent_projects)
        
        scroll.setWidget(container)
        
        # Set scroll area as main layout
        page_layout = QVBoxLayout(self)
        page_layout.setContentsMargins(0, 0, 0, 0)
        page_layout.addWidget(scroll)
        
    def create_cost_chart(self):
        """Create cost trends chart"""
        container = QWidget()
        container.setObjectName("card")
        layout = QVBoxLayout(container)
        
        title = QLabel("Cost Trends (30 Days)")
        title.setObjectName("cardTitle")
        layout.addWidget(title)
        
        # Create chart
        series = QLineSeries()
        series.append(1, 12.5)
        series.append(5, 18.2)
        series.append(10, 15.8)
        series.append(15, 22.4)
        series.append(20, 28.6)
        series.append(25, 25.3)
        series.append(30, 31.2)
        
        chart = QChart()
        chart.addSeries(series)
        chart.setBackgroundBrush(QBrush(QColor("#1E1E1E")))
        chart.setTitleBrush(QBrush(QColor("#FFFFFF")))
        chart.legend().hide()
        
        # Axes
        axis_x = QValueAxis()
        axis_x.setRange(0, 30)
        axis_x.setLabelFormat("%d")
        axis_x.setLabelsColor(QColor("#9CA3AF"))
        axis_x.setGridLineColor(QColor("#2A2A2A"))
        
        axis_y = QValueAxis()
        axis_y.setRange(0, 40)
        axis_y.setLabelFormat("$%.0f")
        axis_y.setLabelsColor(QColor("#9CA3AF"))
        axis_y.setGridLineColor(QColor("#2A2A2A"))
        
        chart.addAxis(axis_x, Qt.AlignBottom)
        chart.addAxis(axis_y, Qt.AlignLeft)
        series.attachAxis(axis_x)
        series.attachAxis(axis_y)
        
        # Style the line
        pen = QPen(QColor("#8B5CF6"))
        pen.setWidth(3)
        series.setPen(pen)
        
        chart_view = QChartView(chart)
        chart_view.setRenderHint(QPainter.Antialiasing)
        chart_view.setMinimumHeight(300)
        
        layout.addWidget(chart_view)
        
        return container
    
    def create_resource_chart(self):
        """Create resource usage bar chart"""
        container = QWidget()
        container.setObjectName("card")
        layout = QVBoxLayout(container)
        
        title = QLabel("Resource Usage")
        title.setObjectName("cardTitle")
        layout.addWidget(title)
        
        # Create bar chart
        bar_set = QBarSet("Resources")
        bar_set.append([8, 3, 15])
        bar_set.setColor(QColor("#8B5CF6"))
        
        series = QBarSeries()
        series.append(bar_set)
        
        chart = QChart()
        chart.addSeries(series)
        chart.setBackgroundBrush(QBrush(QColor("#1E1E1E")))
        chart.legend().hide()
        
        # Categories
        categories = ["Running", "Stopped", "Snapshots"]
        axis_x = QBarCategoryAxis()
        axis_x.append(categories)
        axis_x.setLabelsColor(QColor("#9CA3AF"))
        axis_x.setGridLineColor(QColor("#2A2A2A"))
        
        axis_y = QValueAxis()
        axis_y.setRange(0, 20)
        axis_y.setLabelsColor(QColor("#9CA3AF"))
        axis_y.setGridLineColor(QColor("#2A2A2A"))
        
        chart.addAxis(axis_x, Qt.AlignBottom)
        chart.addAxis(axis_y, Qt.AlignLeft)
        series.attachAxis(axis_x)
        series.attachAxis(axis_y)
        
        chart_view = QChartView(chart)
        chart_view.setRenderHint(QPainter.Antialiasing)
        chart_view.setMinimumHeight(300)
        
        layout.addWidget(chart_view)
        
        return container
    
    def create_recent_projects(self):
        """Create recent projects list"""
        container = QWidget()
        container.setObjectName("card")
        layout = QVBoxLayout(container)
        
        title = QLabel("Recent Projects")
        title.setObjectName("cardTitle")
        layout.addWidget(title)
        
        projects = [
            ("production-web-app", "running", "2 hours ago"),
            ("dev-environment", "stopped", "1 day ago"),
            ("staging-cluster", "running", "3 days ago"),
            ("test-database", "running", "5 days ago"),
            ("backup-server", "stopped", "1 week ago"),
        ]
        
        for name, status, created in projects:
            project_item = QWidget()
            project_item.setStyleSheet("""
                QWidget {
                    background-color: #0F0F0F;
                    border-radius: 8px;
                    padding: 16px;
                }
                QWidget:hover {
                    background-color: #2A2A2A;
                }
            """)
            project_item.setCursor(Qt.PointingHandCursor)
            
            item_layout = QHBoxLayout(project_item)
            
            # Status indicator
            indicator = QLabel("●")
            if status == "running":
                indicator.setStyleSheet("color: #10B981; font-size: 16px;")
            else:
                indicator.setStyleSheet("color: #9CA3AF; font-size: 16px;")
            
            # Project info
            info_layout = QVBoxLayout()
            name_layout = QHBoxLayout()
            
            name_label = QLabel(name)
            name_label.setStyleSheet("font-size: 14px; font-weight: 500;")
            
            status_badge = QLabel(status)
            if status == "running":
                status_badge.setObjectName("badgeGreen")
            else:
                status_badge.setStyleSheet("""
                    background-color: #404040;
                    color: #9CA3AF;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                """)
            
            name_layout.addWidget(name_label)
            name_layout.addWidget(status_badge)
            name_layout.addStretch()
            
            created_label = QLabel(f"Created {created}")
            created_label.setStyleSheet("font-size: 12px; color: #9CA3AF;")
            
            info_layout.addLayout(name_layout)
            info_layout.addWidget(created_label)
            
            item_layout.addWidget(indicator)
            item_layout.addLayout(info_layout)
            
            layout.addWidget(project_item)
        
        return container
