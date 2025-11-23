"""
Cost Management page with charts and cost limits
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                               QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QScrollArea, QFrame, QDialog,
                               QLineEdit, QComboBox, QProgressBar)
from PySide6.QtCore import Qt
from PySide6.QtCharts import QChart, QChartView, QPieSeries, QBarSeries, QBarSet, QValueAxis, QBarCategoryAxis
from PySide6.QtGui import QPainter, QColor, QPen, QBrush

class SetLimitDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Set Project Cost Limit")
        self.setMinimumSize(500, 400)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)
        
        title = QLabel("Set Project Cost Limit")
        title.setStyleSheet("font-size: 18px; font-weight: 500;")
        layout.addWidget(title)
        
        subtitle = QLabel("Configure cost limits and actions for a specific project")
        subtitle.setStyleSheet("color: #9CA3AF; margin-bottom: 8px;")
        layout.addWidget(subtitle)
        
        # Project
        project_label = QLabel("Project")
        project_label.setStyleSheet("font-weight: 500;")
        self.project_combo = QComboBox()
        self.project_combo.addItems([
            "production-web-app",
            "dev-environment",
            "staging-cluster",
            "test-database"
        ])
        layout.addWidget(project_label)
        layout.addWidget(self.project_combo)
        
        # Cost limit
        limit_label = QLabel("Cost Limit ($)")
        limit_label.setStyleSheet("font-weight: 500; margin-top: 8px;")
        self.limit_input = QLineEdit()
        self.limit_input.setPlaceholderText("100.00")
        layout.addWidget(limit_label)
        layout.addWidget(self.limit_input)
        
        # Action
        action_label = QLabel("Action on Limit Reached")
        action_label.setStyleSheet("font-weight: 500; margin-top: 8px;")
        self.action_combo = QComboBox()
        self.action_combo.addItems(["Warn Only", "Stop Resources", "Teardown Project"])
        layout.addWidget(action_label)
        layout.addWidget(self.action_combo)
        
        # Warning threshold
        threshold_label = QLabel("Warning Threshold (0.0 - 1.0)")
        threshold_label.setStyleSheet("font-weight: 500; margin-top: 8px;")
        self.threshold_input = QLineEdit()
        self.threshold_input.setText("0.75")
        help_text = QLabel("Default: 0.75 (75% of limit)")
        help_text.setStyleSheet("font-size: 12px; color: #9CA3AF;")
        layout.addWidget(threshold_label)
        layout.addWidget(self.threshold_input)
        layout.addWidget(help_text)
        
        layout.addStretch()
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setObjectName("secondaryButton")
        cancel_btn.clicked.connect(self.reject)
        
        set_btn = QPushButton("Set Limit")
        set_btn.setObjectName("primaryButton")
        set_btn.clicked.connect(self.accept)
        
        button_layout.addWidget(cancel_btn)
        button_layout.addWidget(set_btn)
        
        layout.addLayout(button_layout)

class CostManagementPage(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("pageContainer")
        self.setup_ui()
        
    def setup_ui(self):
        # Create scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        
        container = QWidget()
        main_layout = QVBoxLayout(container)
        main_layout.setContentsMargins(32, 32, 32, 32)
        main_layout.setSpacing(32)
        
        # Charts row
        charts_layout = QHBoxLayout()
        charts_layout.setSpacing(24)
        
        # Pie chart
        pie_widget = self.create_pie_chart()
        charts_layout.addWidget(pie_widget)
        
        # Bar chart
        bar_widget = self.create_bar_chart()
        charts_layout.addWidget(bar_widget)
        
        main_layout.addLayout(charts_layout)
        
        # Project cost limits section
        limits_widget = self.create_limits_section()
        main_layout.addWidget(limits_widget)
        
        # Global cost limit section
        global_widget = self.create_global_limit_section()
        main_layout.addWidget(global_widget)
        
        scroll.setWidget(container)
        
        page_layout = QVBoxLayout(self)
        page_layout.setContentsMargins(0, 0, 0, 0)
        page_layout.addWidget(scroll)
        
    def create_pie_chart(self):
        container = QWidget()
        container.setObjectName("card")
        layout = QVBoxLayout(container)
        
        title = QLabel("Cost Distribution by Project")
        title.setObjectName("cardTitle")
        layout.addWidget(title)
        
        # Create pie chart
        series = QPieSeries()
        series.append("production-web-app", 125.50)
        series.append("dev-environment", 45.20)
        series.append("staging-cluster", 89.75)
        series.append("test-database", 52.00)
        
        # Set colors
        colors = [QColor("#8B5CF6"), QColor("#3B82F6"), QColor("#10B981"), QColor("#F59E0B")]
        for i, slice in enumerate(series.slices()):
            slice.setBrush(QBrush(colors[i]))
            slice.setLabelVisible(True)
        
        chart = QChart()
        chart.addSeries(series)
        chart.setBackgroundBrush(QBrush(QColor("#1E1E1E")))
        chart.legend().hide()
        
        chart_view = QChartView(chart)
        chart_view.setRenderHint(QPainter.Antialiasing)
        chart_view.setMinimumHeight(300)
        
        layout.addWidget(chart_view)
        
        return container
    
    def create_bar_chart(self):
        container = QWidget()
        container.setObjectName("card")
        layout = QVBoxLayout(container)
        
        title = QLabel("Project Costs Comparison")
        title.setObjectName("cardTitle")
        layout.addWidget(title)
        
        # Create bar chart
        bar_set = QBarSet("Cost")
        bar_set.append([125.50, 89.75, 52.00, 45.20])
        bar_set.setColor(QColor("#8B5CF6"))
        
        series = QBarSeries()
        series.append(bar_set)
        
        chart = QChart()
        chart.addSeries(series)
        chart.setBackgroundBrush(QBrush(QColor("#1E1E1E")))
        chart.legend().hide()
        
        categories = ["prod-web", "staging", "test-db", "dev-env"]
        axis_x = QBarCategoryAxis()
        axis_x.append(categories)
        axis_x.setLabelsColor(QColor("#9CA3AF"))
        
        axis_y = QValueAxis()
        axis_y.setRange(0, 150)
        axis_y.setLabelsColor(QColor("#9CA3AF"))
        
        chart.addAxis(axis_x, Qt.AlignBottom)
        chart.addAxis(axis_y, Qt.AlignLeft)
        series.attachAxis(axis_x)
        series.attachAxis(axis_y)
        
        chart_view = QChartView(chart)
        chart_view.setRenderHint(QPainter.Antialiasing)
        chart_view.setMinimumHeight(300)
        
        layout.addWidget(chart_view)
        
        return container
    
    def create_limits_section(self):
        container = QWidget()
        container.setObjectName("card")
        layout = QVBoxLayout(container)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("Project Cost Limits")
        title.setObjectName("cardTitle")
        header_layout.addWidget(title)
        header_layout.addStretch()
        
        set_limit_btn = QPushButton("➕ Set Cost Limit")
        set_limit_btn.setObjectName("primaryButton")
        set_limit_btn.clicked.connect(self.show_set_limit_dialog)
        
        check_btn = QPushButton("🔄 Check Costs")
        check_btn.setObjectName("secondaryButton")
        
        header_layout.addWidget(set_limit_btn)
        header_layout.addWidget(check_btn)
        
        layout.addLayout(header_layout)
        
        # Table
        table = QTableWidget()
        table.setColumnCount(6)
        table.setHorizontalHeaderLabels([
            "Project", "Estimated Cost", "Limit", "Usage %", "Progress", "Action"
        ])
        table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        # Sample data
        projects = [
            ("production-web-app", 125.50, 150.00, 83.7, "warn_only", True),
            ("dev-environment", 45.20, 50.00, 90.4, "stop", True),
            ("staging-cluster", 89.75, 200.00, 44.9, "warn_only", False),
            ("test-database", 52.00, 100.00, 52.0, "teardown", False),
        ]
        
        table.setRowCount(len(projects))
        for row, (name, cost, limit, usage, action, warning) in enumerate(projects):
            # Project name with warning badge
            name_widget = QWidget()
            name_layout = QHBoxLayout(name_widget)
            name_layout.setContentsMargins(8, 0, 8, 0)
            
            name_label = QLabel(name)
            name_layout.addWidget(name_label)
            
            if warning:
                warning_badge = QLabel("⚠️ Warning")
                warning_badge.setObjectName("badgeYellow")
                name_layout.addWidget(warning_badge)
            
            name_layout.addStretch()
            table.setCellWidget(row, 0, name_widget)
            
            # Cost
            cost_item = QTableWidgetItem(f"${cost:.2f}")
            if usage >= 100:
                cost_item.setForeground(QColor("#EF4444"))
            elif usage >= 75:
                cost_item.setForeground(QColor("#F59E0B"))
            else:
                cost_item.setForeground(QColor("#10B981"))
            table.setItem(row, 1, cost_item)
            
            # Limit
            table.setItem(row, 2, QTableWidgetItem(f"${limit:.2f}"))
            
            # Usage %
            usage_item = QTableWidgetItem(f"{usage:.1f}%")
            if usage >= 100:
                usage_item.setForeground(QColor("#EF4444"))
            elif usage >= 75:
                usage_item.setForeground(QColor("#F59E0B"))
            else:
                usage_item.setForeground(QColor("#10B981"))
            table.setItem(row, 3, usage_item)
            
            # Progress bar
            progress_widget = QWidget()
            progress_layout = QHBoxLayout(progress_widget)
            progress_layout.setContentsMargins(8, 0, 8, 0)
            
            progress = QProgressBar()
            progress.setValue(int(usage))
            progress.setMaximumHeight(8)
            
            if usage >= 100:
                progress.setStyleSheet("QProgressBar::chunk { background-color: #EF4444; }")
            elif usage >= 75:
                progress.setStyleSheet("QProgressBar::chunk { background-color: #F59E0B; }")
            else:
                progress.setStyleSheet("QProgressBar::chunk { background-color: #10B981; }")
            
            progress_layout.addWidget(progress)
            table.setCellWidget(row, 4, progress_widget)
            
            # Action
            table.setItem(row, 5, QTableWidgetItem(action.replace('_', ' ').title()))
        
        layout.addWidget(table)
        
        return container
    
    def create_global_limit_section(self):
        container = QWidget()
        container.setObjectName("card")
        layout = QHBoxLayout(container)
        
        # Left side - info
        info_layout = QVBoxLayout()
        
        title = QLabel("Global Cost Limit")
        title.setObjectName("cardTitle")
        info_layout.addWidget(title)
        
        status_layout = QHBoxLayout()
        status_label = QLabel("Current limit:")
        status_label.setStyleSheet("color: #9CA3AF;")
        
        limit_value = QLabel("$500.00")
        limit_value.setStyleSheet("font-size: 20px; color: #8B5CF6;")
        
        active_badge = QLabel("Active")
        active_badge.setObjectName("badgeGreen")
        
        status_layout.addWidget(status_label)
        status_layout.addWidget(limit_value)
        status_layout.addWidget(active_badge)
        status_layout.addStretch()
        
        info_layout.addLayout(status_layout)
        
        layout.addLayout(info_layout)
        layout.addStretch()
        
        # Right side - buttons
        update_btn = QPushButton("Update Limit")
        update_btn.setObjectName("secondaryButton")
        
        remove_btn = QPushButton("🗑️ Remove Limit")
        remove_btn.setObjectName("dangerButton")
        
        layout.addWidget(update_btn)
        layout.addWidget(remove_btn)
        
        return container
    
    def show_set_limit_dialog(self):
        dialog = SetLimitDialog(self)
        dialog.exec()
