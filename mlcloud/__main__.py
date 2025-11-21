"""Entry point for python -m mlcloud."""

import sys
from mlcloud.cli import app

if __name__ == "__main__":
    sys.exit(app())

