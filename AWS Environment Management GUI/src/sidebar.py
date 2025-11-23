"""
Sidebar navigation component
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QLabel, QPushButton, 
                               QLineEdit, QFrame)
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtGui import QIcon, QPixmap, QPainter, QColor

class Sidebar(QWidget):
    page_changed = Signal(str)
    
    def __init__(self):
        super().__init__()
        self.setObjectName("sidebar")
        self.current_page = 'dashboard'
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Logo and branding
        header = QWidget()
        header.setObjectName("sidebarHeader")
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(24, 24, 24, 24)
        
        logo_container = QWidget()
        logo_layout = QVBoxLayout(logo_container)
        logo_layout.setContentsMargins(0, 0, 0, 0)
        
        # Logo (using text as placeholder)
        logo_label = QLabel("📦")
        logo_label.setObjectName("logo")
        logo_label.setAlignment(Qt.AlignCenter)
        
        brand_label = QLabel("Pocket Architect")
        brand_label.setObjectName("brandLabel")
        
        logo_layout.addWidget(logo_label)
        logo_layout.addWidget(brand_label)
        header_layout.addWidget(logo_container)
        
        layout.addWidget(header)
        
        # Search bar
        search_container = QWidget()
        search_layout = QVBoxLayout(search_container)
        search_layout.setContentsMargins(16, 0, 16, 16)
        
        self.search_bar = QLineEdit()
        self.search_bar.setPlaceholderText("Search...")
        self.search_bar.setObjectName("searchBar")
        search_layout.addWidget(self.search_bar)
        
        layout.addWidget(search_container)
        
        # Navigation buttons
        nav_container = QWidget()
        nav_layout = QVBoxLayout(nav_container)
        nav_layout.setContentsMargins(12, 8, 12, 8)
        nav_layout.setSpacing(4)
        
        self.nav_buttons = {}
        nav_items = [
            ('dashboard', '📊', 'Dashboard'),
            ('projects', '📁', 'Projects'),
            ('blueprints', '📦', 'Blueprints'),
            ('snapshots', '📷', 'Snapshots'),
            ('cost', '💰', 'Cost Management'),
            ('settings', '⚙️', 'Settings'),
        ]
        
        for page_id, icon, label in nav_items:
            btn = QPushButton(f"{icon}  {label}")
            btn.setObjectName("navButton")
            btn.setCursor(Qt.PointingHandCursor)
            btn.clicked.connect(lambda checked, p=page_id: self.navigate_to(p))
            nav_layout.addWidget(btn)
            self.nav_buttons[page_id] = btn
        
        layout.addWidget(nav_container)
        layout.addStretch()
        
        # User profile section
        profile = QWidget()
        profile.setObjectName("profileSection")
        profile_layout = QVBoxLayout(profile)
        profile_layout.setContentsMargins(16, 16, 16, 16)
        
        profile_card = QWidget()
        profile_card.setObjectName("profileCard")
        profile_card.setCursor(Qt.PointingHandCursor)
        card_layout = QVBoxLayout(profile_card)
        card_layout.setContentsMargins(12, 12, 12, 12)
        
        user_icon = QLabel("👤")
        user_icon.setObjectName("userIcon")
        
        user_name = QLabel("Architect")
        user_name.setObjectName("userName")
        
        user_email = QLabel("admin@aws.local")
        user_email.setObjectName("userEmail")
        
        card_layout.addWidget(user_icon)
        card_layout.addWidget(user_name)
        card_layout.addWidget(user_email)
        
        profile_layout.addWidget(profile_card)
        layout.addWidget(profile)
        
        # Set initial active state
        self.update_active_button('dashboard')
        
    def navigate_to(self, page_id):
        """Navigate to a page"""
        self.current_page = page_id
        self.update_active_button(page_id)
        self.page_changed.emit(page_id)
        
    def update_active_button(self, active_page):
        """Update button styles to show active state"""
        for page_id, btn in self.nav_buttons.items():
            if page_id == active_page:
                btn.setProperty("active", True)
            else:
                btn.setProperty("active", False)
            btn.style().unpolish(btn)
            btn.style().polish(btn)
