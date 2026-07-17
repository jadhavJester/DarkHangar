"""
Programmatic bulk import script to load all log files from D:\SILVER Wing LOGS\APM\LOGS.
Run this directly to populate the database.
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

from backend.db.database import init_db
from backend.api.scan import scan_folder, ScanFolderRequest

# Initialize database
init_db()

req = ScanFolderRequest(
    folder_path=r"D:\SILVER Wing LOGS\APM\LOGS",
    skip_existing=True
)

print("Starting bulk import of logs...")
res = scan_folder(req)

print("\nImport Summary:")
print(f"  Imported: {res['summary']['imported']}")
print(f"  Skipped:  {res['summary']['skipped']}")
print(f"  Errors:   {res['summary']['errors']}")
print("\nDone! All files imported into Dark Hangar database.")
