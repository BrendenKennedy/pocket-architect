"""
GUI entry point using PyQt6.
Embeds React frontend using QWebEngineView.
"""

import sys
import signal
import os
import platform
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt, QTimer

from pocket_architect.gui.main_window import MainWindow
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    """Launch the GUI application."""
    # macOS WebEngine environment setup
    if platform.system() == "Darwin":  # macOS
        # Disable WebEngine sandbox which can cause issues on macOS
        if "QTWEBENGINE_DISABLE_SANDBOX" not in os.environ:
            os.environ["QTWEBENGINE_DISABLE_SANDBOX"] = "1"
            logger.info("Set QTWEBENGINE_DISABLE_SANDBOX=1 for macOS compatibility")

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

    # Setup cleanup on application quit
    def on_app_quit():
        logger.info("QApplication aboutToQuit signal received")
        # Cleanup will be handled by window.closeEvent()

    app.aboutToQuit.connect(on_app_quit)

    # Handle graceful shutdown signals
    def signal_handler(signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        app.quit()

    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and show main window
    try:
        window = MainWindow()
        window.show()
        logger.info("GUI launched successfully")

        # Use QTimer to allow Qt event loop to handle signals properly
        timer = QTimer()
        timer.timeout.connect(lambda: None)  # Dummy timeout
        timer.start(100)  # Check every 100ms

        # Execute application with proper signal handling
        exit_code = app.exec()

        # Perform cleanup after Qt event loop exits
        logger.info("Qt event loop exited, performing final cleanup...")
        window.cleanup()

        logger.info("Application shutdown complete")
        return exit_code

    except Exception as e:
        logger.error(f"Failed to launch GUI: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
