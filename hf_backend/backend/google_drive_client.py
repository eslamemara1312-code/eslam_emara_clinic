import os
import json
import sched
import time
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# SCOPES needed
SCOPES = ["https://www.googleapis.com/auth/drive.file"]

# These should be in environment variables in production
CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "project_id": "dentalsaas-backup",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": [
            "http://localhost:8001/settings/backup/callback",
            "https://dreslamemara.netlify.app/settings/backup/callback",  # Frontend Redirect (implicit flow)
            # Note: We need backend callback for Code Exchange if using server-side flow
            # But usually for simplicity we might let frontend handle the code or use postmessage
            # Let's assume standardized backend callback for now.
        ],
    }
}


class GoogleDriveClient:
    def __init__(self, redirect_uri: str):
        self.flow = Flow.from_client_config(
            CLIENT_CONFIG, scopes=SCOPES, redirect_uri=redirect_uri
        )

    def get_auth_url(self):
        auth_url, _ = self.flow.authorization_url(
            prompt="consent", access_type="offline", include_granted_scopes="true"
        )
        return auth_url

    def fetch_token(self, code):
        self.flow.fetch_token(code=code)
        creds = self.flow.credentials
        return {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
        }

    @staticmethod
    def upload_file(refresh_token: str, file_path: str, filename: str):
        """
        Uploads a file using the user's refresh token.
        """
        if not refresh_token:
            raise Exception("No refresh token provided")

        creds = Credentials(
            None,  # access_token (will be refreshed)
            refresh_token=refresh_token,
            token_uri=CLIENT_CONFIG["web"]["token_uri"],
            client_id=CLIENT_CONFIG["web"]["client_id"],
            client_secret=CLIENT_CONFIG["web"]["client_secret"],
            scopes=SCOPES,
        )

        service = build("drive", "v3", credentials=creds)

        # 1. Search for "DentalSaaS Backups" folder
        folder_id = None
        query = "name='DentalSaaS Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields="files(id)").execute()
        files = results.get("files", [])

        if not files:
            # Create folder
            folder_metadata = {
                "name": "DentalSaaS Backups",
                "mimeType": "application/vnd.google-apps.folder",
            }
            folder = service.files().create(body=folder_metadata, fields="id").execute()
            folder_id = folder.get("id")
        else:
            folder_id = files[0]["id"]

        # 2. Upload File
        file_metadata = {"name": filename, "parents": [folder_id]}
        media = MediaFileUpload(file_path, mimetype="application/json", resumable=True)

        file = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id")
            .execute()
        )
        return file.get("id")
