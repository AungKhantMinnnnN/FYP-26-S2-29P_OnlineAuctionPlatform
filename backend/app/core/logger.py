import logging
import os
from logging.handlers import TimedRotatingFileHandler


def setup_logging(service_name: str = "APIGateWay") -> logging.Logger:
    # Defaults to backend/logs/ locally; Docker sets LOG_DIR explicitly.
    log_dir = os.getenv("LOG_DIR", os.path.join(os.path.dirname(__file__), "../../../logs"))
    os.makedirs(log_dir, exist_ok=True)

    log_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(funcName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    def file_handler(filename: str, level: int = logging.INFO) -> TimedRotatingFileHandler:
        # Rolls over at midnight, keeps 5 days of rotated files.
        handler = TimedRotatingFileHandler(
            filename=os.path.join(log_dir, filename),
            when="midnight",
            backupCount=5,
            encoding="utf-8",
        )
        handler.setFormatter(log_formatter)
        handler.setLevel(level)
        return handler

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)

    # Separate general (INFO+) and error (ERROR+) log files.
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler(f"{service_name}.log"))
        logger.addHandler(file_handler(f"{service_name}-error.log", logging.ERROR))

    return logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"APIGateWay.{name}")
