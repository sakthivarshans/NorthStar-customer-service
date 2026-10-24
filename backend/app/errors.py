"""Errors rendered as {"detail": str, "code": str}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, headers: dict[str, str] | None = None):
        super().__init__(message)
        self.status_code, self.code, self.message, self.headers = status_code, code, message, headers or {}


def _json(status, code, message, headers=None):
    return JSONResponse({"detail": message, "code": code}, status_code=status, headers=headers)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app(_: Request, exc: AppError):
        return _json(exc.status_code, exc.code, exc.message, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        return _json(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def _val(_: Request, exc: RequestValidationError):
        fields = ", ".join(str(e["loc"][-1]) for e in exc.errors())  # never echo submitted values
        return _json(422, "validation_error", f"Invalid request: check field(s) {fields}.")

    @app.exception_handler(Exception)
    async def _any(_: Request, exc: Exception):
        logging.getLogger("northstar").error("Unhandled error: %s", type(exc).__name__)
        return _json(500, "internal_error", "Unexpected server error.")
