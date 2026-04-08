#!/usr/bin/env python3
"""
agent-config.py — post-processes openclaw.json and writes auth-profiles.json.

Called by agent-entrypoint.sh after the initial JSON skeleton is written.

Usage:
    python3 agent-config.py <config_file> <auth_profiles_file>
"""
import base64
import json
import os
import sys
import tempfile


def _write_json_atomic(path: str, data: dict) -> None:
    dir_ = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(dir=dir_, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    except Exception:
        os.unlink(tmp)
        raise


def _is_truthy(val: str) -> bool:
    return val.strip().lower() in ("1", "true", "yes")


def patch_discord(cfg):
    token = os.environ.get("DISCORD_BOT_TOKEN", "")
    if not token:
        return
    print("Adding Discord channel config...")
    cfg.setdefault("channels", {})["discord"] = {
        "enabled": True,
        "token": token,
        "dmPolicy": "open",
        "allowFrom": ["*"],
        "execApprovals": {"enabled": True},
    }
    print("Discord channel configured.")


def patch_whatsapp(cfg):
    if not _is_truthy(os.environ.get("WHATSAPP_ENABLED", "")):
        return
    print("Adding WhatsApp channel config (Baileys)...")
    openclaw_home = os.environ.get("OPENCLAW_HOME", "")
    auth_dir = os.path.join(openclaw_home, "credentials", "whatsapp", "default")
    print(f"WhatsApp authDir: {auth_dir}")
    # owner_jid = os.environ.get("WHATSAPP_OWNER_JID", "").strip()
    # allow_from = [owner_jid] if owner_jid else ["*"]
    cfg.setdefault("channels", {})["whatsapp"] = {
        "enabled": True,
        "dmPolicy": "open",
        "allowFrom": ["*"],
        "sendReadReceipts": True,
        "reactionLevel": "ack",
        "accounts": {
            "default": {
                "authDir": auth_dir,
            }
        },
    }
    print("WhatsApp channel configured.")


def patch_mcp(cfg):
    mcp_b64 = os.environ.get("MCP_CONFIG_B64", "")
    if not mcp_b64:
        return
    print("Adding MCP server config...")
    mcp_servers = json.loads(base64.b64decode(mcp_b64).decode())
    cfg.setdefault("mcp", {})["servers"] = {
        name: srv.get("config", {})
        for name, srv in mcp_servers.items()
    }
    print("MCP servers configured.")


def is_valid_key(key, provider):
    if not key or not key.strip():
        return False, "empty"
    k = key.strip()
    if provider == "anthropic" and not k.startswith("sk-ant-"):
        return False, "invalid format (expected sk-ant-...)"
    if provider == "openrouter" and not k.startswith("sk-or-"):
        return False, "invalid format (expected sk-or-...)"
    if provider == "google" and len(k) < 20:
        return False, "too short to be valid"
    return True, "ok"


def write_auth_profiles(path):
    profiles = {}
    for provider, env_var, profile_key in [
        ("anthropic", "ANTHROPIC_API_KEY", "anthropic:default"),
        ("google", "GEMINI_API_KEY", "google:default"),
        ("openrouter", "OPENROUTER_API_KEY", "openrouter:default"),
    ]:
        key = os.environ.get(env_var, "")
        valid, reason = is_valid_key(key, provider)
        if valid:
            profiles[profile_key] = {"type": "api_key", "provider": provider, "key": key.strip()}
        elif key:
            print(f"WARNING: {env_var} set but skipped ({reason})", flush=True)

    data = {"version": 1, "profiles": profiles}
    _write_json_atomic(path, data)
    print(f"Auth profiles written: {list(profiles.keys())}")


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <config_file> <auth_profiles_file>", file=sys.stderr)
        sys.exit(1)

    config_path = sys.argv[1]
    auth_path = sys.argv[2]

    with open(config_path) as f:
        cfg = json.load(f)

    patch_discord(cfg)
    patch_whatsapp(cfg)
    patch_mcp(cfg)

    _write_json_atomic(config_path, cfg)

    write_auth_profiles(auth_path)


if __name__ == "__main__":
    main()
