"""POST /api/greedy: analiza tokens sin ejecutar ni guardar código."""
import json
from http.server import BaseHTTPRequestHandler

from backend.greedy import AnalysisLimitError, greedy_match

MAX_BODY_BYTES = 600_000


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # No registrar los datos recibidos.
        pass

    def reply(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_response(405)
        self.send_header("Allow", "POST")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            return self.reply(415, {"error": "Envía los tokens como application/json."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply(400, {"error": "Longitud de petición inválida."})
        if length <= 0:
            return self.reply(400, {"error": "La petición debe contener un objeto JSON."})
        if length > MAX_BODY_BYTES:
            return self.reply(413, {"error": "La petición supera el tamaño permitido."})
        try:
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("La petición debe contener un objeto JSON.")
            result = greedy_match(payload.get("tokens_a"), payload.get("tokens_b"), payload.get("min_length", 5))
        except AnalysisLimitError as exc:
            return self.reply(422, {"error": str(exc)})
        except (ValueError, UnicodeDecodeError) as exc:
            return self.reply(400, {"error": str(exc)})
        self.reply(200, result)
