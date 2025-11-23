"""
Main application window with sidebar navigation
"""

from PySide6.QtWidgets import (QMainWindow, QWidget, QHBoxLayout, QVBoxLayout, 
                               QStackedWidget, QLabel, QStatusBar, QMenuBar)
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QAction
from sidebar import Sidebar
from pages.dashboard import DashboardPage
from pages.projects import ProjectsPage
from pages.blueprints import BlueprintsPage
from pages.snapshots import SnapshotsPage
from pages.cost_management import CostManagementPage
from pages.settings import SettingsPage

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Pocket Architect")
        self.setMinimumSize(QSize(1400, 900))
        
        # Load stylesheet
        self.load_stylesheet()
        
        # Create central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Create sidebar
        self.sidebar = Sidebar()
        self.sidebar.setFixedWidth(260)
        main_layout.addWidget(self.sidebar)
        
        # Create right side container
        right_container = QWidget()
        right_layout = QVBoxLayout(right_container)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(0)
        
        # Create menu bar
        self.create_menu_bar(right_layout)
        
        # Create stacked widget for pages
        self.stacked_widget = QStackedWidget()
        right_layout.addWidget(self.stacked_widget)
        
        # Add pages
        self.dashboard_page = DashboardPage()
        self.projects_page = ProjectsPage()
        self.blueprints_page = BlueprintsPage()
        self.snapshots_page = SnapshotsPage()
        self.cost_page = CostManagementPage()
        self.settings_page = SettingsPage()
        
        self.stacked_widget.addWidget(self.dashboard_page)  # 0
        self.stacked_widget.addWidget(self.projects_page)   # 1
        self.stacked_widget.addWidget(self.blueprints_page) # 2
        self.stacked_widget.addWidget(self.snapshots_page)  # 3
        self.stacked_widget.addWidget(self.cost_page)       # 4
        self.stacked_widget.addWidget(self.settings_page)   # 5
        
        # Create status bar
        self.create_status_bar(right_layout)
        
        main_layout.addWidget(right_container)
        
        # Connect sidebar navigation
        self.sidebar.page_changed.connect(self.change_page)
        
        # Set default page
        self.stacked_widget.setCurrentIndex(0)
        
    def create_menu_bar(self, layout):
        """Create custom menu bar"""
        menu_container = QWidget()
        menu_container.setObjectName("menuBar")
        menu_container.setFixedHeight(32)
        menu_layout = QHBoxLayout(menu_container)
        menu_layout.setContentsMargins(16, 0, 16, 0)
        
        file_btn = QLabel("File")
        file_btn.setObjectName("menuItem")
        file_btn.setCursor(Qt.PointingHandCursor)
        
        view_btn = QLabel("View")
        view_btn.setObjectName("menuItem")
        view_btn.setCursor(Qt.PointingHandCursor)
        
        help_btn = QLabel("Help")
        help_btn.setObjectName("menuItem")
        help_btn.setCursor(Qt.PointingHandCursor)
        
        menu_layout.addWidget(file_btn)
        menu_layout.addWidget(view_btn)
        menu_layout.addWidget(help_btn)
        menu_layout.addStretch()
        
        layout.addWidget(menu_container)
        
    def create_status_bar(self, layout):
        """Create custom status bar"""
        status_container = QWidget()
        status_container.setObjectName("statusBar")
        status_container.setFixedHeight(24)
        status_layout = QHBoxLayout(status_container)
        status_layout.setContentsMargins(16, 0, 16, 0)
        
        status_label = QLabel("Ready")
        status_label.setObjectName("statusLabel")
        
        region_label = QLabel("AWS: us-east-1")
        region_label.setObjectName("statusLabel")
        
        status_layout.addWidget(status_label)
        status_layout.addStretch()
        status_layout.addWidget(region_label)
        
        layout.addWidget(status_container)
        
    def change_page(self, page_name):
        """Change the current page"""
        page_map = {
            'dashboard': 0,
            'projects': 1,
            'blueprints': 2,
            'snapshots': 3,
            'cost': 4,
            'settings': 5
        }
        if page_name in page_map:
            self.stacked_widget.setCurrentIndex(page_map[page_name])
    
    def load_stylesheet(self):
        """Load QSS stylesheet"""
        try:
            with open('styles.qss', 'r') as f:
                self.setStyleSheet(f.read())
        except FileNotFoundError:
            print("Warning: styles.qss not found")
