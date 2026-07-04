import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(service_name: str = "recommendation-engine") -> logging.Logger:
    log_dir = os.getenv("LOG_DIR", "/tmp/logs")
    os.makedirs(log_dir, exist_ok=True)

    log_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(funcName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    # ── Console handler ───────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)

    # ── General log file ──────────────────────────────────────────
    general_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, f"{service_name}.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    general_handler.setFormatter(log_formatter)
    general_handler.setLevel(logging.INFO)

    # ── Error log file ────────────────────────────────────────────
    error_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, f"{service_name}-error.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setFormatter(log_formatter)
    error_handler.setLevel(logging.ERROR)

    # ── ML pipeline log file — training and inference runs ────────
    ml_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "ml-pipeline.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=10
    )
    ml_handler.setFormatter(log_formatter)
    ml_handler.setLevel(logging.INFO)

    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(general_handler)
        logger.addHandler(error_handler)

    # Separate logger for ML pipeline events
    ml_logger = logging.getLogger(f"{service_name}.ml")
    ml_logger.setLevel(logging.INFO)
    if not ml_logger.handlers:
        ml_logger.addHandler(ml_handler)
        ml_logger.addHandler(console_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"recommendation-engine.{name}")


def get_ml_logger() -> logging.Logger:
    return logging.getLogger("recommendation-engine.ml")