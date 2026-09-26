from __future__ import annotations

import html
import os
from typing import Any

import httpx


class MailProviderNotConfigured(RuntimeError):
    pass


class MailDeliveryError(RuntimeError):
    pass


def _cfg(name: str) -> str:
    return (os.getenv(name) or "").strip()


def resend_configured() -> bool:
    return bool(_cfg("RESEND_API_KEY") and _cfg("RESEND_FROM"))


def build_proposal_email(order_ref: str, payload: dict[str, Any]) -> str:
    def e(value: Any) -> str:
        return html.escape(str(value if value is not None else "—"))

    price = e(payload.get("price"))
    manufacturer = e(payload.get("manufacturer"))
    configuration = e(payload.get("configuration"))
    runs = e(payload.get("runs"))
    features = payload.get("features") if isinstance(payload.get("features"), list) else []
    feature_html = "".join(f"<li>{e(item)}</li>" for item in features if item)
    return f"""<!doctype html>
<html><body style="margin:0;background:#f4f4f1;color:#171716;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:28px 18px">
    <div style="background:#07111f;color:white;border-radius:18px;padding:24px">
      <div style="font-size:11px;letter-spacing:.18em;opacity:.65">ZABORSKY</div>
      <div style="font-size:32px;font-weight:700;letter-spacing:-.04em">BIZET <span style="color:#2f7cff">OS</span></div>
    </div>
    <div style="background:white;border-radius:18px;padding:24px;margin-top:14px">
      <div style="font-size:12px;color:#777">Коммерческое предложение · {e(order_ref)}</div>
      <h1 style="font-size:24px;margin:10px 0 18px">Кухня</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#777">Конфигурация</td><td style="padding:8px 0;text-align:right">{configuration}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Прогоны</td><td style="padding:8px 0;text-align:right">{runs}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Производитель</td><td style="padding:8px 0;text-align:right">{manufacturer}</td></tr>
        <tr><td style="padding:14px 0 8px;font-weight:700">Итоговая стоимость</td><td style="padding:14px 0 8px;text-align:right;font-size:22px;font-weight:800">{price}</td></tr>
      </table>
      <h2 style="font-size:16px;margin:22px 0 8px">Комплектация</h2>
      <ul style="padding-left:20px;line-height:1.55">{feature_html}</ul>
      <p style="font-size:12px;line-height:1.5;color:#666;margin-top:22px">Предложение сформировано по текущей конфигурации BIZET OS и является предварительным до окончательной инженерной и производственной проверки.</p>
    </div>
  </div>
</body></html>"""


def send_with_resend(recipient: str, subject: str, html_body: str) -> str:
    api_key = _cfg("RESEND_API_KEY")
    sender = _cfg("RESEND_FROM")
    if not api_key or not sender:
        raise MailProviderNotConfigured("RESEND_API_KEY and RESEND_FROM are required")
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": sender, "to": [recipient], "subject": subject, "html": html_body},
            timeout=15.0,
        )
    except httpx.HTTPError as exc:
        raise MailDeliveryError(f"Resend request failed: {exc}") from exc
    if response.status_code >= 400:
        detail = response.text[:500]
        raise MailDeliveryError(f"Resend returned {response.status_code}: {detail}")
    payload = response.json()
    message_id = str(payload.get("id") or "")
    if not message_id:
        raise MailDeliveryError("Resend did not return a message id")
    return message_id
