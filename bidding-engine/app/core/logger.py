import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(service_name: str = "bidding-engine") -> logging.Logger:
    log_dir = os.getenv("LOG_DIR", "/tmp/logs")
    os.makedirs(log_dir, exist_ok=True)

    log_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(funcName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    # ── Console handler — shows logs in docker compose logs ──────
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)

    # ── General log file ─────────────────────────────────────────
    general_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, f"{service_name}.log"),
        maxBytes=10 * 1024 * 1024,   # 10MB per file
        backupCount=5                 # keeps last 5 rotated files
    )
    general_handler.setFormatter(log_formatter)
    general_handler.setLevel(logging.INFO)

    # ── Error log file — errors and critical only ─────────────────
    error_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, f"{service_name}-error.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setFormatter(log_formatter)
    error_handler.setLevel(logging.ERROR)

    # ── Bid-specific log file — every bid event ───────────────────
    bid_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "bids.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=10                # keep more bid history
    )
    bid_handler.setFormatter(log_formatter)
    bid_handler.setLevel(logging.INFO)

    # Attach handlers — avoid duplicates if called more than once
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(general_handler)
        logger.addHandler(error_handler)

    # Separate logger specifically for bid events
    bid_logger = logging.getLogger(f"{service_name}.bids")
    bid_logger.setLevel(logging.INFO)
    if not bid_logger.handlers:
        bid_logger.addHandler(bid_handler)
        bid_logger.addHandler(console_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"bidding-engine.{name}")


def get_bid_logger() -> logging.Logger:
    return logging.getLogger("bidding-engine.bids")