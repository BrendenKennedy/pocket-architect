"""
Snapshots page with snapshot management
"""

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                               QPushButton, QTableWidget, QTableWidgetItem,
                               QHeaderView, QDialog, QLineEdit, QComboBox,
                               QTextEdit, QCheckBox)
from PySide6.QtCore import Qt

class CreateSnapshotDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Create New Snapshot")
        self.setMinimumSize(500, 400)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)
        
        title = QLabel("Create New Snapshot")
        title.setStyleSheet("font-size: 18px; font-weight: 500;")
        layout.addWidget(title)
        
        subtitle = QLabel("Create a snapshot of an existing project for backup or deployment")
        subtitle.setStyleSheet("color: #9CA3AF; margin-bottom: 8px;")
        layout.addWidget(subtitle)
        
        # Project selection
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
        
        # Snapshot name
        name_label = QLabel("Snapshot Name")
        name_label.setStyleSheet("font-weight: 500; margin-top: 8px;")
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("my-snapshot-name")
        help_text = QLabel("Use lowercase letters, numbers, and hyphens only")
        help_text.setStyleSheet("font-size: 12px; color: #9CA3AF;")
        layout.addWidget(name_label)
        layout.addWidget(self.name_input)
        layout.addWidget(help_text)
        
        # Note
        note_label = QLabel("Note (Optional)")
        note_label.setStyleSheet("font-weight: 500; margin-top: 8px;")
        self.note_input = QTextEdit()
        self.note_input.setPlaceholderText("Add a description or note about this snapshot...")
        self.note_input.setMaximumHeight(100)
        layout.addWidget(note_label)
        layout.addWidget(self.note_input)
        
        layout.addStretch()
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setObjectName("secondaryButton")
        cancel_btn.clicked.connect(self.reject)
        
        create_btn = QPushButton("Create Snapshot")
        create_btn.setObjectName("primaryButton")
        create_btn.clicked.connect(self.accept)
        
        button_layout.addWidget(cancel_btn)
        button_layout.addWidget(create_btn)
        
        layout.addLayout(button_layout)

class DeleteConfirmDialog(QDialog):
    def __init__(self, count, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Delete Snapshots")
        self.setMinimumSize(500, 300)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)
        
        title = QLabel("Delete Snapshots")
        title.setStyleSheet("font-size: 18px; font-weight: 500;")
        layout.addWidget(title)
        
        question = QLabel(f"Are you sure you want to delete {count} snapshot(s)?")
        question.setStyleSheet("color: #9CA3AF;")
        layout.addWidget(question)
        
        # Warning box
        warning_box = QWidget()
        warning_box.setStyleSheet("""
            QWidget {
                background-color: rgba(245, 158, 11, 0.1);
                border: 1px solid rgba(245, 158, 11, 0.3);
                border-radius: 8px;
                padding: 16px;
            }
        """)
        warning_layout = QVBoxLayout(warning_box)
        
        warning_title = QLabel("⚠️ Warning:")
        warning_title.setStyleSheet("color: #F59E0B; font-weight: 500;")
        warning_layout.addWidget(warning_title)
        
        warnings = [
            "• This action cannot be undone",
            "• Associated AMI images will also be deleted",
            "• Projects using these snapshots may be affected"
        ]
        
        for warning in warnings:
            warn_label = QLabel(warning)
            warn_label.setStyleSheet("color: #D1D5DB; font-size: 13px;")
            warning_layout.addWidget(warn_label)
        
        layout.addWidget(warning_box)
        layout.addStretch()
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setObjectName("secondaryButton")
        cancel_btn.clicked.connect(self.reject)
        
        delete_btn = QPushButton(f"Delete {count} Snapshot(s)")
        delete_btn.setObjectName("dangerButton")
        delete_btn.setStyleSheet("""
            QPushButton {
                background-color: #EF4444;
                color: white;
            }
            QPushButton:hover {
                background-color: #DC2626;
            }
        """)
        delete_btn.clicked.connect(self.accept)
        
        button_layout.addWidget(cancel_btn)
        button_layout.addWidget(delete_btn)
        
        layout.addLayout(button_layout)

class SnapshotsPage(QWidget):
    def __init__(self):
        super().__init__()
        self.setObjectName("pageContainer")
        self.setup_ui()
        
    def setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(32, 32, 32, 32)
        main_layout.setSpacing(24)
        
        # Action bar
        action_layout = QHBoxLayout()
        
        create_btn = QPushButton("➕ Create Snapshot")
        create_btn.setObjectName("primaryButton")
        create_btn.clicked.connect(self.show_create_dialog)
        
        delete_btn = QPushButton("🗑️ Delete Selected")
        delete_btn.setObjectName("dangerButton")
        delete_btn.clicked.connect(self.delete_selected)
        
        action_layout.addWidget(create_btn)
        action_layout.addWidget(delete_btn)
        action_layout.addStretch()
        
        refresh_btn = QPushButton("🔄 Refresh")
        refresh_btn.setObjectName("secondaryButton")
        action_layout.addWidget(refresh_btn)
        
        main_layout.addLayout(action_layout)
        
        # Snapshots table
        self.table = QTableWidget()
        self.table.setColumnCount(9)
        self.table.setHorizontalHeaderLabels([
            "", "Name", "Project", "Snapshot ID", "AMI ID", 
            "Size", "Cost", "Created", "Note"
        ])
        
        # Set column widths
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Interactive)
        header.setStretchLastSection(True)
        self.table.setColumnWidth(0, 40)  # Checkbox column
        
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        
        # Sample data
        snapshots = [
            ("prod-backup-001", "production-web-app", "snap-0abc123", "ami-0def456", 
             "30 GB", "$1.50/mo", "2024-11-23", "Pre-deployment backup"),
            ("dev-milestone-v2", "dev-environment", "snap-0xyz789", "ami-0ghi012",
             "20 GB", "$1.00/mo", "2024-11-22", ""),
            ("staging-stable", "staging-cluster", "snap-0mno345", "ami-0jkl678",
             "50 GB", "$2.50/mo", "2024-11-21", "Stable version for rollback"),
        ]
        
        self.table.setRowCount(len(snapshots))
        for row, snapshot_data in enumerate(snapshots):
            # Checkbox
            checkbox = QCheckBox()
            checkbox_widget = QWidget()
            checkbox_layout = QHBoxLayout(checkbox_widget)
            checkbox_layout.addWidget(checkbox)
            checkbox_layout.setAlignment(Qt.AlignCenter)
            checkbox_layout.setContentsMargins(0, 0, 0, 0)
            self.table.setCellWidget(row, 0, checkbox_widget)
            
            # Data
            for col, data in enumerate(snapshot_data, 1):
                item = QTableWidgetItem(data if data else "-")
                if col in [3, 4]:  # Snapshot ID and AMI ID columns
                    item.setForeground(QColor("#9CA3AF"))
                self.table.setItem(row, col, item)
        
        main_layout.addWidget(self.table)
        
        # Selection count
        self.selection_label = QLabel("")
        self.selection_label.setStyleSheet("color: #9CA3AF; font-size: 12px;")
        main_layout.addWidget(self.selection_label)
        
    def show_create_dialog(self):
        dialog = CreateSnapshotDialog(self)
        if dialog.exec():
            # Create snapshot
            pass
            
    def delete_selected(self):
        # Count selected rows
        selected_count = 0
        for row in range(self.table.rowCount()):
            checkbox_widget = self.table.cellWidget(row, 0)
            if checkbox_widget:
                checkbox = checkbox_widget.findChild(QCheckBox)
                if checkbox and checkbox.isChecked():
                    selected_count += 1
        
        if selected_count > 0:
            dialog = DeleteConfirmDialog(selected_count, self)
            if dialog.exec():
                # Delete snapshots
                pass
