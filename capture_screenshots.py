import subprocess
import time
import urllib.request
import json
import asyncio
import websockets
import base64
from app.api.auth import create_access_token

token = create_access_token(subject="jbnuu-admin")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--window-size=1400,900",
    "--remote-debugging-port=9222",
    "--user-data-dir=C:\\temp\\edge_debug_profile",
    "http://127.0.0.1:8000/login"
])

time.sleep(2)

async def run_cdp():
    res = urllib.request.urlopen("http://127.0.0.1:9222/json")
    targets = json.loads(res.read().decode())
    page_target = next((t for t in targets if t.get("type") == "page"), None)
    ws_url = page_target["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url) as ws:
        msg_id = 1

        async def send(method, params=None):
            nonlocal msg_id
            m = {"id": msg_id, "method": method, "params": params or {}}
            msg_id += 1
            await ws.send(json.dumps(m))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == m["id"]:
                    return resp.get("result", {})

        await send("Page.enable")
        await send("Network.enable")

        # Set Cookie
        await send("Network.setCookie", {
            "name": "access_token",
            "value": f"Bearer {token}",
            "domain": "127.0.0.1",
            "path": "/"
        })

        await send("Page.navigate", {"url": "http://127.0.0.1:8000/admin"})
        await asyncio.sleep(2)

        # 1. Click users tab
        await send("Runtime.evaluate", {"expression": "document.getElementById('admin-side-users').click()"})
        await asyncio.sleep(1)

        # Take screenshot of users tab
        ss1 = await send("Page.captureScreenshot", {"format": "png"})
        with open("screenshot_users_tab.png", "wb") as f:
            f.write(base64.b64decode(ss1["data"]))
        print("Captured screenshot_users_tab.png")

        # 2. Click profile tab
        await send("Runtime.evaluate", {"expression": "document.getElementById('admin-side-profile').click()"})
        await asyncio.sleep(1)

        ss2 = await send("Page.captureScreenshot", {"format": "png"})
        with open("screenshot_profile_tab.png", "wb") as f:
            f.write(base64.b64decode(ss2["data"]))
        print("Captured screenshot_profile_tab.png")

try:
    asyncio.run(run_cdp())
finally:
    proc.terminate()
