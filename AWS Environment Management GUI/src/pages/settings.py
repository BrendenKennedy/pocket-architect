"""
Settings page with appearance, AWS config, and about sections
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                               QPushButton, QComboBox, QSpinBox, QScrollArea,
                               QFrame)
from PySide6.QtCore import Qt

class SettingsPage(QWidget):
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
        main_layout.setSpacing(24)
        
        # Title
        title = QLabel("Settings")
        title.setObjectName("pageTitle")
        main_layout.addWidget(title)
        
        # Appearance section
        appearance_widget = QWidget()
        appearance_widget.setObjectName("card")
        appearance_layout = QVBoxLayout(appearance_widget)
        
        appearance_title = QLabel("Appearance")
        appearance_title.setObjectName("sectionTitle")
        appearance_layout.addWidget(appearance_title)
        
        theme_row = QHBoxLayout()
        theme_left = QVBoxLayout()
        theme_label = QLabel("Theme")
        theme_label.setStyleSheet("font-weight: 500;")
        theme_help = QLabel("Choose your preferred color scheme")
        theme_help.setStyleSheet("color: #9CA3AF; font-size: 12px;")
        theme_left.addWidget(theme_label)
        theme_left.addWidget(theme_help)
        
        theme_combo = QComboBox()
        theme_combo.addItems(["Dark", "Light"])
        theme_combo.setMinimumWidth(200)
        
        theme_row.addLayout(theme_left)
        theme_row.addStretch()
        theme_row.addWidget(theme_combo)
        
        appearance_layout.addLayout(theme_row)
        
        main_layout.addWidget(appearance_widget)
        
        # AWS Configuration section
        aws_widget = QWidget()
        aws_widget.setObjectName("card")
        aws_layout = QVBoxLayout(aws_widget)
        
        aws_title = QLabel("AWS Configuration")
        aws_title.setObjectName("sectionTitle")
        aws_layout.addWidget(aws_title)
        
        # Region
        region_row = QHBoxLayout()
        region_left = QVBoxLayout()
        region_label = QLabel("Default Region")
        region_label.setStyleSheet("font-weight: 500;")
        region_help = QLabel("Select your primary AWS region")
        region_help.setStyleSheet("color: #9CA3AF; font-size: 12px;")
        region_left.addWidget(region_label)
        region_left.addWidget(region_help)
        
        region_combo = QComboBox()
        region_combo.addItems([
            "US East (N. Virginia)",
            "US East (Ohio)",
            "US West (N. California)",
            "US West (Oregon)",
            "EU West (Ireland)",
            "EU Central (Frankfurt)",
            "Asia Pacific (Singapore)",
            "Asia Pacific (Tokyo)"
        ])
        region_combo.setMinimumWidth(250)
        
        region_row.addLayout(region_left)
        region_row.addStretch()
        region_row.addWidget(region_combo)
        
        aws_layout.addLayout(region_row)
        
        # Separator
        separator = QFrame()
        separator.setFrameShape(QFrame.HLine)
        separator.setStyleSheet("background-color: #333333; margin: 16px 0;")
        aws_layout.addWidget(separator)
        
        # Credentials
        creds_row = QHBoxLayout()
        creds_left = QVBoxLayout()
        creds_label = QLabel("AWS Credentials")
        creds_label.setStyleSheet("font-weight: 500;")
        
        status_layout = QHBoxLayout()
        status_dot = QLabel("●")
        status_dot.setStyleSheet("color: #10B981; font-size: 16px;")
        status_text = QLabel("Connected")
        status_text.setStyleSheet("color: #10B981; font-size: 13px;")
        check_icon = QLabel("✓")
        check_icon.setStyleSheet("color: #10B981;")
        
        status_layout.addWidget(status_dot)
        status_layout.addWidget(status_text)
        status_layout.addWidget(check_icon)
        status_layout.addStretch()
        
        creds_left.addWidget(creds_label)
        creds_left.addLayout(status_layout)
        
        refresh_btn = QPushButton("🔄 Refresh")
        refresh_btn.setObjectName("secondaryButton")
        
        creds_row.addLayout(creds_left)
        creds_row.addStretch()
        creds_row.addWidget(refresh_btn)
        
        aws_layout.addLayout(creds_row)
        
        main_layout.addWidget(aws_widget)
        
        # Auto-Refresh section
        refresh_widget = QWidget()
        refresh_widget.setObjectName("card")
        refresh_layout = QVBoxLayout(refresh_widget)
        
        refresh_title = QLabel("Auto-Refresh")
        refresh_title.setObjectName("sectionTitle")
        refresh_layout.addWidget(refresh_title)
        
        interval_row = QHBoxLayout()
        interval_left = QVBoxLayout()
        interval_label = QLabel("Refresh Interval (seconds)")
        interval_label.setStyleSheet("font-weight: 500;")
        interval_help = QLabel("Set to 0 to disable automatic refreshing")
        interval_help.setStyleSheet("color: #9CA3AF; font-size: 12px;")
        interval_left.addWidget(interval_label)
        interval_left.addWidget(interval_help)
        
        interval_spin = QSpinBox()
        interval_spin.setMinimum(0)
        interval_spin.setMaximum(3600)
        interval_spin.setSingleStep(10)
        interval_spin.setValue(30)
        interval_spin.setMinimumWidth(120)
        
        interval_row.addLayout(interval_left)
        interval_row.addStretch()
        interval_row.addWidget(interval_spin)
        
        refresh_layout.addLayout(interval_row)
        
        info_box = QWidget()
        info_box.setStyleSheet("""
            QWidget {
                background-color: #0F0F0F;
                border-radius: 8px;
                padding: 12px;
            }
        """)
        info_layout = QVBoxLayout(info_box)
        info_text = QLabel("Dashboard and project data will refresh every 30 seconds")
        info_text.setStyleSheet("color: #9CA3AF; font-size: 12px;")
        info_layout.addWidget(info_text)
        
        refresh_layout.addWidget(info_box)
        
        main_layout.addWidget(refresh_widget)
        
        # About section
        about_widget = QWidget()
        about_widget.setObjectName("card")
        about_layout = QVBoxLayout(about_widget)
        
        about_title = QLabel("About")
        about_title.setObjectName("sectionTitle")
        about_layout.addWidget(about_title)
        
        # Version
        version_row = QHBoxLayout()
        version_label = QLabel("Version")
        version_label.setStyleSheet("font-weight: 500;")
        version_value = QLabel("1.0.0")
        version_value.setStyleSheet("color: #9CA3AF;")
        version_row.addWidget(version_label)
        version_row.addStretch()
        version_row.addWidget(version_value)
        about_layout.addLayout(version_row)
        
        # Separator
        separator2 = QFrame()
        separator2.setFrameShape(QFrame.HLine)
        separator2.setStyleSheet("background-color: #333333; margin: 16px 0;")
        about_layout.addWidget(separator2)
        
        # Description
        desc_label = QLabel("Description")
        desc_label.setStyleSheet("font-weight: 500; margin-bottom: 8px;")
        about_layout.addWidget(desc_label)
        
        desc_text = QLabel(
            "Pocket Architect is a modern desktop application for managing isolated AWS environments. "
            "It provides a streamlined interface for deploying, monitoring, and managing cloud resources "
            "with built-in cost management and snapshot capabilities."
        )
        desc_text.setWordWrap(True)
        desc_text.setStyleSheet("color: #9CA3AF; font-size: 13px; line-height: 1.6;")
        about_layout.addWidget(desc_text)
        
        # Separator
        separator3 = QFrame()
        separator3.setFrameShape(QFrame.HLine)
        separator3.setStyleSheet("background-color: #333333; margin: 16px 0;")
        about_layout.addWidget(separator3)
        
        # Features
        features_label = QLabel("Features")
        features_label.setStyleSheet("font-weight: 500; margin-bottom: 8px;")
        about_layout.addWidget(features_label)
        
        features = [
            "Deploy and manage AWS projects from blueprints",
            "Create and restore snapshots for backup and deployment",
            "Advanced cost management with limits and alerts",
            "Real-time monitoring and resource status tracking",
            "Custom blueprint creation with step-by-step wizards"
        ]
        
        for feature in features:
            feature_row = QHBoxLayout()
            check = QLabel("✓")
            check.setStyleSheet("color: #10B981; font-weight: 500;")
            feature_text = QLabel(feature)
            feature_text.setStyleSheet("color: #9CA3AF; font-size: 13px;")
            feature_row.addWidget(check)
            feature_row.addWidget(feature_text)
            feature_row.addStretch()
            about_layout.addLayout(feature_row)
        
        main_layout.addWidget(about_widget)
        main_layout.addStretch()
        
        scroll.setWidget(container)
        
        page_layout = QVBoxLayout(self)
        page_layout.setContentsMargins(0, 0, 0, 0)
        page_layout.addWidget(scroll)
