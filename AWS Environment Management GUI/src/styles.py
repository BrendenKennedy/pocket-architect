"""
QSS Stylesheet definitions for the application
Dark theme with purple accents
"""

MAIN_STYLESHEET = """
/* Global Styles */
QWidget {
    background-color: #0F0F0F;
    color: #FFFFFF;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
}

QMainWindow {
    background-color: #0F0F0F;
}

/* Menu Bar */
#MenuBar {
    background-color: #1E1E1E;
    border-bottom: 1px solid #333333;
}

#MenuLabel {
    color: #FFFFFF;
    padding: 6px 12px;
    background-color: transparent;
}

#MenuLabel:hover {
    color: #8B5CF6;
}

/* Status Bar */
#StatusBar {
    background-color: #1E1E1E;
    border-top: 1px solid #333333;
}

#StatusLabel {
    color: #9CA3AF;
    background-color: transparent;
}

/* Sidebar */
#Sidebar {
    background-color: #1E1E1E;
    border-right: 1px solid #333333;
}

#SidebarButton {
    background-color: transparent;
    color: #9CA3AF;
    border: none;
    text-align: left;
    padding: 12px 16px;
    border-radius: 8px;
    margin: 2px 0px;
}

#SidebarButton:hover {
    background-color: #2A2A2A;
    color: #FFFFFF;
}

#SidebarButton[active="true"] {
    background-color: #8B5CF6;
    color: #FFFFFF;
}

/* Cards */
#Card {
    background-color: #1E1E1E;
    border: 1px solid #333333;
    border-radius: 10px;
    padding: 24px;
}

#MetricCard {
    background-color: #1E1E1E;
    border: 1px solid #333333;
    border-radius: 10px;
    padding: 24px;
}

/* Buttons */
QPushButton {
    background-color: #8B5CF6;
    color: #FFFFFF;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 500;
}

QPushButton:hover {
    background-color: #7C3AED;
}

QPushButton:pressed {
    background-color: #6D28D9;
}

QPushButton[secondary="true"] {
    background-color: transparent;
    border: 1px solid #4B5563;
}

QPushButton[secondary="true"]:hover {
    background-color: #2A2A2A;
}

QPushButton[danger="true"] {
    background-color: rgba(239, 68, 68, 0.2);
    color: #EF4444;
    border: 1px solid rgba(239, 68, 68, 0.5);
}

QPushButton[danger="true"]:hover {
    background-color: rgba(239, 68, 68, 0.3);
}

/* Input Fields */
QLineEdit, QTextEdit, QPlainTextEdit, QSpinBox, QDoubleSpinBox {
    background-color: #0F0F0F;
    color: #FFFFFF;
    border: 1px solid #4B5563;
    border-radius: 6px;
    padding: 8px 12px;
}

QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus, 
QSpinBox:focus, QDoubleSpinBox:focus {
    border: 1px solid #8B5CF6;
    outline: none;
}

/* ComboBox */
QComboBox {
    background-color: #0F0F0F;
    color: #FFFFFF;
    border: 1px solid #4B5563;
    border-radius: 6px;
    padding: 8px 12px;
    min-width: 150px;
}

QComboBox:hover {
    border: 1px solid #6B7280;
}

QComboBox:focus {
    border: 1px solid #8B5CF6;
}

QComboBox::drop-down {
    border: none;
    width: 30px;
}

QComboBox::down-arrow {
    image: none;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #9CA3AF;
    margin-right: 8px;
}

QComboBox QAbstractItemView {
    background-color: #1E1E1E;
    color: #FFFFFF;
    border: 1px solid #333333;
    selection-background-color: #8B5CF6;
    selection-color: #FFFFFF;
    outline: none;
}

/* Tables */
QTableWidget, QTableView {
    background-color: #1E1E1E;
    alternate-background-color: #1A1A1A;
    gridline-color: #333333;
    border: none;
    color: #FFFFFF;
}

QTableWidget::item, QTableView::item {
    padding: 12px;
    border-bottom: 1px solid #333333;
}

QTableWidget::item:selected, QTableView::item:selected {
    background-color: #2A2A2A;
}

QTableWidget::item:hover, QTableView::item:hover {
    background-color: #2A2A2A;
}

QHeaderView::section {
    background-color: #1E1E1E;
    color: #9CA3AF;
    padding: 12px;
    border: none;
    border-bottom: 1px solid #333333;
    font-weight: 500;
}

/* ScrollBar */
QScrollBar:vertical {
    background-color: #1E1E1E;
    width: 12px;
    border-radius: 6px;
}

QScrollBar::handle:vertical {
    background-color: #4B5563;
    border-radius: 6px;
    min-height: 30px;
}

QScrollBar::handle:vertical:hover {
    background-color: #6B7280;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QScrollBar:horizontal {
    background-color: #1E1E1E;
    height: 12px;
    border-radius: 6px;
}

QScrollBar::handle:horizontal {
    background-color: #4B5563;
    border-radius: 6px;
    min-width: 30px;
}

QScrollBar::handle:horizontal:hover {
    background-color: #6B7280;
}

QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    width: 0px;
}

/* Progress Bar */
QProgressBar {
    background-color: rgba(139, 92, 246, 0.2);
    border: none;
    border-radius: 4px;
    height: 8px;
    text-align: center;
}

QProgressBar::chunk {
    background-color: #8B5CF6;
    border-radius: 4px;
}

QProgressBar[status="warning"]::chunk {
    background-color: #F59E0B;
}

QProgressBar[status="danger"]::chunk {
    background-color: #EF4444;
}

QProgressBar[status="success"]::chunk {
    background-color: #10B981;
}

/* CheckBox */
QCheckBox {
    spacing: 8px;
    color: #FFFFFF;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid #4B5563;
    background-color: #0F0F0F;
}

QCheckBox::indicator:hover {
    border: 1px solid #6B7280;
}

QCheckBox::indicator:checked {
    background-color: #8B5CF6;
    border: 1px solid #8B5CF6;
}

/* Radio Button */
QRadioButton {
    spacing: 8px;
    color: #FFFFFF;
}

QRadioButton::indicator {
    width: 18px;
    height: 18px;
    border-radius: 9px;
    border: 1px solid #4B5563;
    background-color: #0F0F0F;
}

QRadioButton::indicator:hover {
    border: 1px solid #6B7280;
}

QRadioButton::indicator:checked {
    background-color: #8B5CF6;
    border: 1px solid #8B5CF6;
}

/* Tabs */
QTabWidget::pane {
    border: 1px solid #333333;
    border-radius: 6px;
    background-color: #1E1E1E;
}

QTabBar::tab {
    background-color: #0F0F0F;
    color: #9CA3AF;
    padding: 10px 20px;
    border: 1px solid #333333;
    border-bottom: none;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    margin-right: 2px;
}

QTabBar::tab:selected {
    background-color: #1E1E1E;
    color: #FFFFFF;
}

QTabBar::tab:hover:!selected {
    background-color: #1A1A1A;
}

/* Dialog */
QDialog {
    background-color: #1E1E1E;
    border: 1px solid #333333;
}

/* Label */
QLabel {
    background-color: transparent;
    color: #FFFFFF;
}

#GrayLabel {
    color: #9CA3AF;
}

/* Badge */
#Badge {
    background-color: rgba(139, 92, 246, 0.2);
    color: #8B5CF6;
    border-radius: 4px;
    padding: 4px 8px;
}

#BadgeSuccess {
    background-color: rgba(16, 185, 129, 0.2);
    color: #10B981;
    border-radius: 4px;
    padding: 4px 8px;
}

#BadgeWarning {
    background-color: rgba(245, 158, 11, 0.2);
    color: #F59E0B;
    border-radius: 4px;
    padding: 4px 8px;
}

#BadgeDanger {
    background-color: rgba(239, 68, 68, 0.2);
    color: #EF4444;
    border-radius: 4px;
    padding: 4px 8px;
}

#BadgeSecondary {
    background-color: #4B5563;
    color: #D1D5DB;
    border-radius: 4px;
    padding: 4px 8px;
}

/* Page Container */
#PageContainer {
    background-color: #0F0F0F;
}

/* Icon Label Container */
#IconContainer {
    background-color: rgba(139, 92, 246, 0.1);
    border-radius: 8px;
}

/* Group Box */
QGroupBox {
    border: 1px solid #333333;
    border-radius: 6px;
    margin-top: 12px;
    padding-top: 12px;
    color: #FFFFFF;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    padding: 0 8px;
    color: #FFFFFF;
}
"""
