import logging
import os
from logging.handlers import TimedRotatingFileHandler


def setup_logging(service_name: str = "APIGateWay") -> logging.Logger:
    # On local machine — defaults to backend/logs/
    # In Docker — reads LOG_DIR environment variable
    log_dir = os.getenv("LOG_DIR", os.path.join(os.path.dirname(__file__), "../../../logs"))
    os.makedirs(log_dir, exist_ok=True)

    log_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(funcName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    def file_handler(filename: str, level: int = logging.INFO) -> TimedRotatingFileHandler:
        # Rolls over to a fresh file at midnight; keeps 5 days of rotated files and
        # auto-deletes anything older (backupCount). Rotated files get a .YYYY-MM-DD suffix.
        handler = TimedRotatingFileHandler(
            filename=os.path.join(log_dir, filename),
            when="midnight",
            backupCount=5,
            encoding="utf-8",
        )
        handler.setFormatter(log_formatter)
        handler.setLevel(level)
        return handler

    # ── Console handler — prints to terminal locally ──────────────
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)

    # ── Root service logger: general (INFO+) + error (ERROR+) files ──
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler(f"{service_name}.log"))
        logger.addHandler(file_handler(f"{service_name}-error.log", logging.ERROR))

    # ── Sub-loggers: own file + console; propagate up to the general file too ──
    def sub_logger(suffix: str, filename: str) -> None:
        lg = logging.getLogger(f"{service_name}.{suffix}")
        lg.setLevel(logging.INFO)
        if not lg.handlers:
            lg.addHandler(file_handler(filename))
            lg.addHandler(console_handler)

    sub_logger("auth", "auth.log")        # login, logout, token events
    sub_logger("auction", "auction.log")  # listing create, update, status change
    sub_logger("admin", "admin.log")      # all admin actions
    sub_logger("access", "access.log")    # every incoming HTTP request

    return logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"APIGateWay.{name}")


def get_auth_logger() -> logging.Logger:
    return logging.getLogger("APIGateWay.auth")


def get_auction_logger() -> logging.Logger:
    return logging.getLogger("APIGateWay.auction")


def get_admin_logger() -> logging.Logger:
    return logging.getLogger("APIGateWay.admin")


def get_access_logger() -> logging.Logger:
    return logging.getLogger("APIGateWay.access")
