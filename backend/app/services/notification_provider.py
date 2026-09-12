from pathlib import Path


class NotificationProvider:
    """Optional delivery adapter; database notifications remain authoritative."""

    def send(self, user_id, title, message, data=None):
        return False


class FirebaseNotificationProvider(NotificationProvider):
    def __init__(self, credentials_path=""):
        self.enabled = bool(credentials_path and Path(credentials_path).is_file())

    def send(self, user_id, title, message, data=None):
        if not self.enabled:
            return False
        # FCM delivery can be enabled here without changing notification persistence.
        return False