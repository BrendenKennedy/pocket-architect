"""
GUI entry point using PySide6.
Embeds React frontend using QWebEngineView.
"""

import sys
from pathlib import Path
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QFont
from PySide6.QtCore import Qt

from pocket_architect.gui.main_window import MainWindow
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    """Launch the GUI application."""
    # Enable High DPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )

    app = QApplication(sys.argv)
    app.setApplicationName("Pocket Architect")
    app.setApplicationVersion("0.1.0")

    # Set default font
    font = QFont("Segoe UI", 10)
    app.setFont(font)

    # Create and show main window
    try:
        window = MainWindow()
        window.show()
        logger.info("GUI launched successfully")
        sys.exit(app.exec())
    except Exception as e:
        logger.error(f"Failed to launch GUI: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
