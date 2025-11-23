"""
Reusable card widget for displaying content in cards
"""

from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QFrame
from PySide6.QtCore import Qt

class CardWidget(QWidget):
    """Custom card widget with shadow and rounded corners"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("Card")
        
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(24, 24, 24, 24)
        
    def add_widget(self, widget):
        """Add a widget to the card"""
        self.layout.addWidget(widget)
        
    def add_layout(self, layout):
        """Add a layout to the card"""
        self.layout.addLayout(layout)

class MetricCard(QWidget):
    """Card widget for displaying metrics with icon, title, and value"""
    def __init__(self, title, value, icon_text="📊", trend=None, parent=None):
        super().__init__(parent)
        self.setObjectName("MetricCard")
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)
        
        # Top row: Icon and trend
        top_layout = QHBoxLayout()
        
        # Icon container
        icon_container = QLabel(icon_text)
        icon_container.setFixedSize(48, 48)
        icon_container.setAlignment(Qt.AlignCenter)
        icon_container.setStyleSheet("""
            background-color: rgba(139, 92, 246, 0.1);
            border-radius: 8px;
            font-size: 24px;
        """)
        top_layout.addWidget(icon_container)
        
        top_layout.addStretch()
        
        # Trend indicator
        if trend:
            trend_label = QLabel(trend)
            trend_label.setStyleSheet("font-size: 20px;")
            top_layout.addWidget(trend_label)
            
        layout.addLayout(top_layout)
        
        # Title
        title_label = QLabel(title)
        title_label.setObjectName("GrayLabel")
        title_label.setStyleSheet("color: #9CA3AF; font-size: 14px;")
        layout.addWidget(title_label)
        
        # Value
        value_label = QLabel(str(value))
        value_label.setStyleSheet("font-size: 28px; font-weight: 600;")
        layout.addWidget(value_label)
        
        layout.addStretch()

class StatusIndicator(QWidget):
    """Animated status indicator (dot)"""
    def __init__(self, status='inactive', parent=None):
        super().__init__(parent)
        self.status = status
        self.setFixedSize(8, 8)
        
    def set_status(self, status):
        """Set status (running, stopped, inactive)"""
        self.status = status
        self.update()
        
    def paintEvent(self, event):
        """Custom paint for animated dot"""
        from PySide6.QtGui import QPainter, QColor, QBrush
        
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        if self.status == 'running':
            color = QColor(16, 185, 129)  # green
        elif self.status == 'stopped':
            color = QColor(107, 114, 128)  # gray
        else:
            color = QColor(75, 85, 99)  # dark gray
            
        painter.setBrush(QBrush(color))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(0, 0, 8, 8)

class Badge(QLabel):
    """Badge label for status indicators"""
    def __init__(self, text, badge_type='default', parent=None):
        super().__init__(text, parent)
        
        type_map = {
            'default': 'Badge',
            'success': 'BadgeSuccess',
            'warning': 'BadgeWarning',
            'danger': 'BadgeDanger',
            'secondary': 'BadgeSecondary'
        }
        
        self.setObjectName(type_map.get(badge_type, 'Badge'))
        self.setAlignment(Qt.AlignCenter)
        self.setMaximumWidth(120)
