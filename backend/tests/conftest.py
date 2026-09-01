import sys
from pathlib import Path

# Allow `from app...` imports when running pytest from the backend/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
