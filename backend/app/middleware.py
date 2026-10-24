"""Pure-ASGI request-size limiter (counts bytes even without Content-Length)."""
import json


class _TooLarge(Exception):
    pass


class BodySizeLimitMiddleware:
    def __init__(self, app, limit_for):
        self.app, self.limit_for = app, limit_for

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = self.limit_for(scope["path"])
        cl = dict(scope["headers"]).get(b"content-length", b"")
        if cl.isdigit() and int(cl) > limit:
            return await self._reject(send, limit)
        total, started = 0, False

        async def limited_receive():
            nonlocal total
            msg = await receive()
            if msg["type"] == "http.request":
                total += len(msg.get("body", b""))
                if total > limit:
                    raise _TooLarge
            return msg

        async def tracking_send(msg):
            nonlocal started
            started = started or msg["type"] == "http.response.start"
            await send(msg)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except _TooLarge:
            if not started:
                await self._reject(send, limit)

    @staticmethod
    async def _reject(send, limit):
        body = json.dumps({"detail": f"Request body exceeds the {limit // 1024} KB limit.", "code": "payload_too_large"}).encode()
        await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
