"""
Projects page with project management and deployment wizard
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                               QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QScrollArea, QFrame, QDialog,
                               QDialogButtonBox, QLineEdit, QComboBox, QCheckBox,
                               QTextEdit, QProgressBar)
from PySide6.QtCore import Qt, Signal

class DeployWizard(QDialog):
    """3-step deployment wizard"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Deploy New Project")
        self.setModal(True)
        self.setMinimumSize(700, 500)
        
        self.current_step = 0
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)
        
        # Title
        self.title_label = QLabel("Deploy New Project")
        self.title_label.setStyleSheet("font-size: 20px; font-weight: 500;")
        layout.addWidget(self.title_label)
        
        # Subtitle
        self.subtitle_label = QLabel("Step 1 of 3: Blueprint Selection")
        self.subtitle_label.setStyleSheet("color: #9CA3AF;")
        layout.addWidget(self.subtitle_label)
        
        # Progress bar
        self.progress = QProgressBar()
        self.progress.setValue(33)
        layout.addWidget(self.progress)
        
        # Content area
        self.content_widget = QWidget()
        self.content_layout = QVBoxLayout(self.content_widget)
        layout.addWidget(self.content_widget)
        
        # Step 1 widgets
        self.step1_widget = QWidget()
        step1_layout = QVBoxLayout(self.step1_widget)
        
        blueprint_label = QLabel("Select Blueprint")
        blueprint_label.setStyleSheet("font-weight: 500; margin-bottom: 8px;")
        self.blueprint_combo = QComboBox()
        self.blueprint_combo.addItems([
            "Web Application Stack",
            "Development Environment",
            "Kubernetes Cluster",
            "Database Server"
        ])
        step1_layout.addWidget(blueprint_label)
        step1_layout.addWidget(self.blueprint_combo)
        step1_layout.addStretch()
        
        # Step 2 widgets
        self.step2_widget = QWidget()
        step2_layout = QVBoxLayout(self.step2_widget)
        
        name_label = QLabel("Project Name")
        name_label.setStyleSheet("font-weight: 500; margin-bottom: 8px;")
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("my-project-name")
        
        help_label = QLabel("Use lowercase letters, numbers, and hyphens only")
        help_label.setStyleSheet("font-size: 12px; color: #9CA3AF; margin-bottom: 16px;")
        
        self.snapshot_check = QCheckBox("Deploy from snapshot (optional)")
        
        step2_layout.addWidget(name_label)
        step2_layout.addWidget(self.name_input)
        step2_layout.addWidget(help_label)
        step2_layout.addWidget(self.snapshot_check)
        step2_layout.addStretch()
        
        # Step 3 widgets
        self.step3_widget = QWidget()
        step3_layout = QVBoxLayout(self.step3_widget)
        
        limit_label = QLabel("Cost Limit ($)")
        limit_label.setStyleSheet("font-weight: 500; margin-bottom: 8px;")
        self.limit_input = QLineEdit()
        self.limit_input.setPlaceholderText("100.00")
        
        action_label = QLabel("Action on Limit Reached")
        action_label.setStyleSheet("font-weight: 500; margin-bottom: 8px; margin-top: 16px;")
        self.action_combo = QComboBox()
        self.action_combo.addItems(["Warn Only", "Stop Resources", "Teardown Project"])
        
        self.override_check = QCheckBox("Override global cost limit")
        
        step3_layout.addWidget(limit_label)
        step3_layout.addWidget(self.limit_input)
        step3_layout.addWidget(action_label)
        step3_layout.addWidget(self.action_combo)
        step3_layout.addWidget(self.override_check)
        step3_layout.addStretch()
        
        # Add all steps to content
        self.content_layout.addWidget(self.step1_widget)
        self.content_layout.addWidget(self.step2_widget)
        self.content_layout.addWidget(self.step3_widget)
        
        # Show only first step
        self.step2_widget.hide()
        self.step3_widget.hide()
        
        layout.addStretch()
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        self.back_btn = QPushButton("Back")
        self.back_btn.setObjectName("secondaryButton")
        self.back_btn.clicked.connect(self.previous_step)
        self.back_btn.hide()
        
        self.next_btn = QPushButton("Next ▶")
        self.next_btn.setObjectName("primaryButton")
        self.next_btn.clicked.connect(self.next_step)
        
        button_layout.addWidget(self.back_btn)
        button_layout.addWidget(self.next_btn)
        
        layout.addLayout(button_layout)
        
    def next_step(self):
        if self.current_step < 2:
            self.current_step += 1
            self.update_step()
        else:
            # Deploy
            self.accept()
            
    def previous_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            self.update_step()
            
    def update_step(self):
        # Hide all steps
        self.step1_widget.hide()
        self.step2_widget.hide()
        self.step3_widget.hide()
        
        # Show current step
        if self.current_step == 0:
            self.step1_widget.show()
            self.subtitle_label.setText("Step 1 of 3: Blueprint Selection")
            self.progress.setValue(33)
            self.back_btn.hide()
            self.next_btn.setText("Next ▶")
        elif self.current_step == 1:
            self.step2_widget.show()
            self.subtitle_label.setText("Step 2 of 3: Project Configuration")
            self.progress.setValue(66)
            self.back_btn.show()
            self.next_btn.setText("Next ▶")
        elif self.current_step == 2:
            self.step3_widget.show()
            self.subtitle_label.setText("Step 3 of 3: Cost Management")
            self.progress.setValue(100)
            self.back_btn.show()
            self.next_btn.setText("Deploy")

class ProjectsPage(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("pageContainer")
        self.setup_ui()
        
    def setup_ui(self):
        # Main layout
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(32, 32, 32, 32)
        main_layout.setSpacing(24)
        
        # Action bar
        action_layout = QHBoxLayout()
        
        deploy_btn = QPushButton("➕ Deploy")
        deploy_btn.setObjectName("primaryButton")
        deploy_btn.clicked.connect(self.show_deploy_wizard)
        
        start_btn = QPushButton("▶️ Start")
        start_btn.setObjectName("secondaryButton")
        
        stop_btn = QPushButton("⏹️ Stop")
        stop_btn.setObjectName("secondaryButton")
        
        teardown_btn = QPushButton("🗑️ Teardown")
        teardown_btn.setObjectName("dangerButton")
        
        status_btn = QPushButton("📊 Status")
        status_btn.setObjectName("secondaryButton")
        status_btn.clicked.connect(self.show_status_dialog)
        
        action_layout.addWidget(deploy_btn)
        action_layout.addWidget(start_btn)
        action_layout.addWidget(stop_btn)
        action_layout.addWidget(teardown_btn)
        action_layout.addWidget(status_btn)
        action_layout.addStretch()
        
        refresh_btn = QPushButton("🔄 Refresh")
        refresh_btn.setObjectName("secondaryButton")
        action_layout.addWidget(refresh_btn)
        
        main_layout.addLayout(action_layout)
        
        # Projects table
        self.table = QTableWidget()
        self.table.setColumnCount(4)
        self.table.setHorizontalHeaderLabels(["Name", "Blueprint", "Status", "Created"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.SingleSelection)
        
        # Add sample data
        projects = [
            ("production-web-app", "Web Application Stack", "running", "2024-11-20"),
            ("dev-environment", "Development Environment", "stopped", "2024-11-22"),
            ("staging-cluster", "Kubernetes Cluster", "running", "2024-11-21"),
        ]
        
        self.table.setRowCount(len(projects))
        for row, (name, blueprint, status, created) in enumerate(projects):
            self.table.setItem(row, 0, QTableWidgetItem(name))
            self.table.setItem(row, 1, QTableWidgetItem(blueprint))
            
            status_item = QTableWidgetItem(status)
            if status == "running":
                status_item.setForeground(QColor("#10B981"))
            else:
                status_item.setForeground(QColor("#9CA3AF"))
            self.table.setItem(row, 2, status_item)
            
            self.table.setItem(row, 3, QTableWidgetItem(created))
        
        main_layout.addWidget(self.table)
        
    def show_deploy_wizard(self):
        wizard = DeployWizard(self)
        if wizard.exec():
            # Project deployed
            pass
            
    def show_status_dialog(self):
        dialog = QDialog(self)
        dialog.setWindowTitle("Project Status")
        dialog.setMinimumSize(600, 400)
        
        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(24, 24, 24, 24)
        
        title = QLabel("Project Status: production-web-app")
        title.setStyleSheet("font-size: 18px; font-weight: 500; margin-bottom: 16px;")
        layout.addWidget(title)
        
        status_text = QTextEdit()
        status_text.setReadOnly(True)
        status_text.setStyleSheet("font-family: 'Consolas', 'Courier New', monospace;")
        status_text.setPlainText("""Project Details:
  Name: production-web-app
  Blueprint: Web Application Stack
  Status: RUNNING
  Region: us-east-1

Resources:
  EC2 Instance (i-0abc123def456): running
  EBS Volume (vol-xyz789): attached
  Security Group (sg-web-001): active
  Elastic IP: 54.23.45.67""")
        
        layout.addWidget(status_text)
        
        close_btn = QPushButton("Close")
        close_btn.setObjectName("secondaryButton")
        close_btn.clicked.connect(dialog.accept)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        btn_layout.addWidget(close_btn)
        layout.addLayout(btn_layout)
        
        dialog.exec()
