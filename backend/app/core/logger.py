import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(service_name: str = "APIGateWay") -> logging.Logger:
    # On local machine — defaults to backend/logs/
    # In Docker — reads LOG_DIR environment variable
    log_dir = os.getenv("LOG_DIR", os.path.join(os.path.dirname(__file__), "../../../logs"))
    os.makedirs(log_dir, exist_ok=True)

    log_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(funcName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    # ── Console handler — prints to terminal locally ──────────────
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)

    # ── General log file — all INFO and above ─────────────────────
    general_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, f"{service_name}.log"),
        maxBytes=10 * 1024 * 1024,   # 10MB per file
        backupCount=5
    )
    general_handler.setFormatter(log_formatter)
    general_handler.setLevel(logging.INFO)

    # ── Error log file — ERROR and CRITICAL only ──────────────────
    error_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, f"{service_name}-error.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setFormatter(log_formatter)
    error_handler.setLevel(logging.ERROR)

    # ── Auth log file — login, logout, token events ───────────────
    auth_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "auth.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    auth_handler.setFormatter(log_formatter)
    auth_handler.setLevel(logging.INFO)

    # ── Auction log file — listing create, update, status change ──
    auction_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "auction.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    auction_handler.setFormatter(log_formatter)
    auction_handler.setLevel(logging.INFO)

    # ── Admin log file — all admin actions ───────────────────────
    admin_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "admin.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=10             # keep more admin action history
    )
    admin_handler.setFormatter(log_formatter)
    admin_handler.setLevel(logging.INFO)

    # ── Access log file — every incoming HTTP request ─────────────
    access_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "access.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    access_handler.setFormatter(log_formatter)
    access_handler.setLevel(logging.INFO)

    # ── Attach handlers to root logger — avoid duplicates ─────────
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(general_handler)
        logger.addHandler(error_handler)

    # ── Auth logger ───────────────────────────────────────────────
    auth_logger = logging.getLogger(f"{service_name}.auth")
    auth_logger.setLevel(logging.INFO)
    if not auth_logger.handlers:
        auth_logger.addHandler(auth_handler)
        auth_logger.addHandler(console_handler)

    # ── Auction logger ────────────────────────────────────────────
    auction_logger = logging.getLogger(f"{service_name}.auction")
    auction_logger.setLevel(logging.INFO)
    if not auction_logger.handlers:
        auction_logger.addHandler(auction_handler)
        auction_logger.addHandler(console_handler)

    # ── Admin logger ──────────────────────────────────────────────
    admin_logger = logging.getLogger(f"{service_name}.admin")
    admin_logger.setLevel(logging.INFO)
    if not admin_logger.handlers:
        admin_logger.addHandler(admin_handler)
        admin_logger.addHandler(console_handler)

    # ── Access logger ─────────────────────────────────────────────
    access_logger = logging.getLogger(f"{service_name}.access")
    access_logger.setLevel(logging.INFO)
    if not access_logger.handlers:
        access_logger.addHandler(access_handler)
        access_logger.addHandler(console_handler)

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