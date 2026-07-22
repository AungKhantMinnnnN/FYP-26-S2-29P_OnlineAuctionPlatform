import logging
import os
from logging.handlers import TimedRotatingFileHandler


def setup_logging(service_name: str = "recommendation-engine") -> logging.Logger:
    log_dir = os.getenv("LOG_DIR", "/tmp/logs")
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

    # ── Console handler ───────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)

    # "recommendation-engine" and "app" are separate logger hierarchies (not
    # parent/child), so they can't share handlers via propagation. Both need to
    # end up in the same physical log files, but two independent
    # TimedRotatingFileHandler instances on the same path race at midnight
    # rollover and can corrupt or drop a day's rotated log — so build each file
    # handler once and add the same instance to both loggers instead.
    info_file_handler = file_handler(f"{service_name}.log")
    error_file_handler = file_handler(f"{service_name}-error.log", logging.ERROR)

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(info_file_handler)
        logger.addHandler(error_file_handler)

    # Wire all app.* module loggers (getLogger(__name__) in service files)
    # so their output flows through the same console + file handlers.
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    if not app_logger.handlers:
        app_logger.addHandler(console_handler)
        app_logger.addHandler(info_file_handler)
        app_logger.addHandler(error_file_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"recommendation-engine.{name}")
