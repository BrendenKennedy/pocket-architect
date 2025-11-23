"""
Blueprints page with blueprint management and creation wizard
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                               QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QLineEdit, QComboBox, QDialog,
                               QTabWidget, QTextEdit, QCheckBox, QSpinBox,
                               QProgressBar)
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor

class BlueprintDetailsDialog(QDialog):
    """Dialog showing blueprint details with tabs"""
    def __init__(self, blueprint_name, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"Blueprint Details: {blueprint_name}")
        self.setMinimumSize(900, 600)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # Tab widget
        tabs = QTabWidget()
        
        # Overview tab
        overview = QWidget()
        overview_layout = QVBoxLayout(overview)
        overview_layout.setSpacing(16)
        
        fields = [
            ("Name", blueprint_name),
            ("Type", "Built-in"),
            ("Instance Type", "t3.medium"),
            ("Region", "us-east-1"),
            ("Description", "Complete web hosting with EC2, ALB, and RDS"),
        ]
        
        for label, value in fields:
            field_layout = QVBoxLayout()
            field_label = QLabel(label)
            field_label.setStyleSheet("color: #9CA3AF; font-size: 12px;")
            field_value = QLabel(value)
            field_value.setStyleSheet("font-size: 14px; margin-top: 4px;")
            field_layout.addWidget(field_label)
            field_layout.addWidget(field_value)
            overview_layout.addLayout(field_layout)
        
        overview_layout.addStretch()
        
        # Config tab
        config = QTextEdit()
        config.setReadOnly(True)
        config.setStyleSheet("font-family: 'Consolas', 'Courier New', monospace;")
        config.setPlainText("""resources:
  vpc:
    cidr: 10.0.0.0/16
    enable_dns: true
  
  subnet:
    cidr: 10.0.1.0/24
    availability_zone: us-east-1a
  
  ec2:
    instance_type: t3.medium
    ami: ami-0c55b159cbfafe1f0
    count: 1
    
  security_group:
    ingress:
      - port: 22
        protocol: tcp
        cidr: 0.0.0.0/0
      - port: 80
        protocol: tcp
        cidr: 0.0.0.0/0""")
        
        # Script tab
        script = QTextEdit()
        script.setReadOnly(True)
        script.setStyleSheet("font-family: 'Consolas', 'Courier New', monospace;")
        script.setPlainText("""#!/bin/bash
# Setup script for Web Application Stack

echo "Starting instance setup..."

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install required packages
apt-get install -y nginx curl git

# Configure nginx
systemctl start nginx
systemctl enable nginx

# Setup application directory
mkdir -p /var/www/app
chown -R www-data:www-data /var/www/app

echo "Setup complete!" """)
        
        # Diagram tab
        diagram = QWidget()
        diagram_layout = QVBoxLayout(diagram)
        diagram_layout.setAlignment(Qt.AlignCenter)
        
        diagram_label = QLabel("VPC → Subnet → EC2 Instance")
        diagram_label.setStyleSheet("font-size: 16px; color: #8B5CF6;")
        diagram_label.setAlignment(Qt.AlignCenter)
        diagram_layout.addWidget(diagram_label)
        
        tabs.addTab(overview, "Overview")
        tabs.addTab(config, "Config YAML")
        tabs.addTab(script, "Setup Script")
        tabs.addTab(diagram, "Visual Diagram")
        
        layout.addWidget(tabs)
        
        # Close button
        close_btn = QPushButton("Close")
        close_btn.setObjectName("secondaryButton")
        close_btn.clicked.connect(self.accept)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        btn_layout.addWidget(close_btn)
        layout.addLayout(btn_layout)

class CreateBlueprintWizard(QDialog):
    """6-step blueprint creation wizard"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Create New Blueprint")
        self.setModal(True)
        self.setMinimumSize(800, 600)
        
        self.current_step = 0
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)
        
        # Title
        self.title_label = QLabel("Create New Blueprint")
        self.title_label.setStyleSheet("font-size: 20px; font-weight: 500;")
        layout.addWidget(self.title_label)
        
        # Subtitle
        self.subtitle_label = QLabel("Step 1 of 6: Basic Info")
        self.subtitle_label.setStyleSheet("color: #9CA3AF;")
        layout.addWidget(self.subtitle_label)
        
        # Progress bar
        self.progress = QProgressBar()
        self.progress.setValue(17)
        layout.addWidget(self.progress)
        
        # Scrollable content
        self.content_widget = QWidget()
        self.content_layout = QVBoxLayout(self.content_widget)
        layout.addWidget(self.content_widget)
        
        # Create all step widgets
        self.create_step_widgets()
        
        layout.addStretch()
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        self.back_btn = QPushButton("Back")
        self.back_btn.setObjectName("secondaryButton")
        self.back_btn.clicked.connect(self.previous_step)
        self.back_btn.hide()
        
        self.save_draft_btn = QPushButton("Save Draft")
        self.save_draft_btn.setObjectName("secondaryButton")
        
        self.next_btn = QPushButton("Next ▶")
        self.next_btn.setObjectName("primaryButton")
        self.next_btn.clicked.connect(self.next_step)
        
        button_layout.addWidget(self.back_btn)
        button_layout.addWidget(self.save_draft_btn)
        button_layout.addWidget(self.next_btn)
        
        layout.addLayout(button_layout)
        
    def create_step_widgets(self):
        self.step_widgets = []
        
        # Step 1: Basic Info
        step1 = QWidget()
        step1_layout = QVBoxLayout(step1)
        step1_layout.addWidget(QLabel("Blueprint Name"))
        name_input = QLineEdit()
        name_input.setPlaceholderText("my-blueprint")
        step1_layout.addWidget(name_input)
        step1_layout.addWidget(QLabel("Description"))
        desc_input = QTextEdit()
        desc_input.setPlaceholderText("Describe your blueprint...")
        desc_input.setMaximumHeight(100)
        step1_layout.addWidget(desc_input)
        step1_layout.addStretch()
        
        # Step 2: Compute
        step2 = QWidget()
        step2_layout = QVBoxLayout(step2)
        step2_layout.addWidget(QLabel("Instance Type"))
        instance_combo = QComboBox()
        instance_combo.addItems(["t3.small", "t3.medium", "t3.large", "t3.xlarge"])
        step2_layout.addWidget(instance_combo)
        step2_layout.addWidget(QLabel("Instance Count"))
        count_spin = QSpinBox()
        count_spin.setMinimum(1)
        count_spin.setValue(1)
        step2_layout.addWidget(count_spin)
        step2_layout.addStretch()
        
        # Step 3: Networking
        step3 = QWidget()
        step3_layout = QVBoxLayout(step3)
        step3_layout.addWidget(QCheckBox("Use Default VPC"))
        step3_layout.addWidget(QCheckBox("Create Application Load Balancer"))
        step3_layout.addWidget(QCheckBox("Allocate Elastic IP"))
        step3_layout.addStretch()
        
        # Step 4: Storage
        step4 = QWidget()
        step4_layout = QVBoxLayout(step4)
        step4_layout.addWidget(QCheckBox("Skip additional storage configuration"))
        step4_layout.addWidget(QLabel("EBS Volume Size (GB)"))
        ebs_spin = QSpinBox()
        ebs_spin.setMinimum(8)
        ebs_spin.setValue(30)
        step4_layout.addWidget(ebs_spin)
        step4_layout.addStretch()
        
        # Step 5: Security
        step5 = QWidget()
        step5_layout = QVBoxLayout(step5)
        step5_layout.addWidget(QLabel("IAM Role"))
        role_combo = QComboBox()
        role_combo.addItems(["Default EC2 Role", "Administrator Access", "Read Only"])
        step5_layout.addWidget(role_combo)
        step5_layout.addWidget(QCheckBox("Grant S3 access"))
        step5_layout.addStretch()
        
        # Step 6: Review
        step6 = QWidget()
        step6_layout = QVBoxLayout(step6)
        step6_layout.addWidget(QLabel("Review Blueprint Configuration"))
        review_text = QTextEdit()
        review_text.setReadOnly(True)
        review_text.setPlainText("Configuration summary will appear here...")
        step6_layout.addWidget(review_text)
        
        # Add all steps
        for step in [step1, step2, step3, step4, step5, step6]:
            self.step_widgets.append(step)
            self.content_layout.addWidget(step)
            step.hide()
        
        # Show first step
        self.step_widgets[0].show()
        
    def next_step(self):
        if self.current_step < 5:
            self.current_step += 1
            self.update_step()
        else:
            self.accept()
            
    def previous_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            self.update_step()
            
    def update_step(self):
        # Hide all steps
        for widget in self.step_widgets:
            widget.hide()
        
        # Show current step
        self.step_widgets[self.current_step].show()
        
        step_titles = ["Basic Info", "Compute", "Networking", "Storage", "Security", "Review"]
        self.subtitle_label.setText(f"Step {self.current_step + 1} of 6: {step_titles[self.current_step]}")
        self.progress.setValue(int((self.current_step + 1) / 6 * 100))
        
        self.back_btn.setVisible(self.current_step > 0)
        self.save_draft_btn.setVisible(self.current_step < 5)
        self.next_btn.setText("Create Blueprint" if self.current_step == 5 else "Next ▶")

class BlueprintsPage(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("pageContainer")
        self.setup_ui()
        
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(32, 32, 32, 32)
        main_layout.setSpacing(24)
        
        # Filter bar
        filter_layout = QHBoxLayout()
        
        search = QLineEdit()
        search.setPlaceholderText("🔍 Search blueprints...")
        search.setMinimumWidth(300)
        
        type_filter = QComboBox()
        type_filter.addItems(["All Types", "Built-in", "User Created"])
        
        filter_layout.addWidget(search)
        filter_layout.addWidget(type_filter)
        filter_layout.addStretch()
        
        create_btn = QPushButton("➕ Create Blueprint")
        create_btn.setObjectName("primaryButton")
        create_btn.clicked.connect(self.show_create_wizard)
        
        refresh_btn = QPushButton("🔄 Refresh")
        refresh_btn.setObjectName("secondaryButton")
        
        filter_layout.addWidget(create_btn)
        filter_layout.addWidget(refresh_btn)
        
        main_layout.addLayout(filter_layout)
        
        # Blueprints table
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["Name", "Description", "Type", "Instance Type", "Actions"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        # Sample data
        blueprints = [
            ("Web Application Stack", "Complete web hosting with EC2, ALB, and RDS", "built-in", "t3.medium"),
            ("Development Environment", "Isolated dev environment with VPC and bastion", "built-in", "t3.small"),
            ("Kubernetes Cluster", "Managed EKS cluster with auto-scaling", "user", "t3.large"),
        ]
        
        self.table.setRowCount(len(blueprints))
        for row, (name, desc, bp_type, instance) in enumerate(blueprints):
            self.table.setItem(row, 0, QTableWidgetItem(name))
            self.table.setItem(row, 1, QTableWidgetItem(desc))
            
            type_item = QTableWidgetItem(bp_type)
            if bp_type == "built-in":
                type_item.setForeground(QColor("#3B82F6"))
            else:
                type_item.setForeground(QColor("#8B5CF6"))
            self.table.setItem(row, 2, type_item)
            
            self.table.setItem(row, 3, QTableWidgetItem(instance))
            
            # View button
            view_btn = QPushButton("👁️ View Details")
            view_btn.setObjectName("secondaryButton")
            view_btn.clicked.connect(lambda checked, n=name: self.show_details(n))
            self.table.setCellWidget(row, 4, view_btn)
        
        main_layout.addWidget(self.table)
        
    def show_details(self, blueprint_name):
        dialog = BlueprintDetailsDialog(blueprint_name, self)
        dialog.exec()
        
    def show_create_wizard(self):
        wizard = CreateBlueprintWizard(self)
        wizard.exec()
