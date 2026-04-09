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
    # Relay mode: Next.js handles WhatsApp via whatsapp-relay.mjs.
    # Do NOT add whatsapp to OpenClaw config — avoids duplicate Baileys session.
    if os.environ.get("WHATSAPP_INBOUND_WEBHOOK_URL", ""):
        print("WhatsApp relay mode active — skipping OpenClaw channel config.")
        return
    print("Adding WhatsApp channel config (Baileys)...")
    openclaw_home = os.environ.get("OPENCLAW_HOME", "")
    auth_dir = os.path.join(openclaw_home, "credentials", "whatsapp", "default")
    print(f"WhatsApp authDir: {auth_dir}")
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
    cfg.setdefault("mcp", {})["servers"] = mcp_servers
    print("MCP servers configured.")


def is_valid_key(key):
    """Basic validation — rejects empty / whitespace-only values."""
    if not key or not key.strip():
        return False, "empty"
    if len(key.strip()) < 8:
        return False, "too short to be valid"
    return True, "ok"


# Maps env var names to (provider, profile_key) for well-known providers.
# Any env var ending in _API_KEY that isn't listed here is auto-detected.
WELL_KNOWN_PROVIDERS = {
    "ANTHROPIC_API_KEY":   ("anthropic",   "anthropic:default"),
    "GEMINI_API_KEY":      ("google",      "google:default"),
    "OPENROUTER_API_KEY":  ("openrouter",  "openrouter:default"),
    "OPENAI_API_KEY":      ("openai",      "openai:default"),
    "MISTRAL_API_KEY":     ("mistral",     "mistral:default"),
    "GROQ_API_KEY":        ("groq",        "groq:default"),
    "XAI_API_KEY":         ("xai",         "xai:default"),
    "DEEPSEEK_API_KEY":    ("deepseek",    "deepseek:default"),
    "COHERE_API_KEY":      ("cohere",      "cohere:default"),
    "TOGETHER_API_KEY":    ("together",    "together:default"),
    "PERPLEXITY_API_KEY":  ("perplexity",  "perplexity:default"),
}


def _infer_provider(env_var):
    """Derive a provider name and profile key from an env var name.
    e.g. MISTRAL_API_KEY -> provider='mistral', profile='mistral:default'
    """
    name = env_var.replace("_API_KEY", "").replace("_KEY", "").lower()
    if not name:
        name = env_var.lower()
    return name, f"{name}:default"


def write_auth_profiles(path):
    profiles = {}

    # 1. Process well-known providers
    for env_var, (provider, profile_key) in WELL_KNOWN_PROVIDERS.items():
        key = os.environ.get(env_var, "")
        valid, reason = is_valid_key(key)
        if valid:
            profiles[profile_key] = {"type": "api_key", "provider": provider, "key": key.strip()}
        elif key:
            print(f"WARNING: {env_var} set but skipped ({reason})", flush=True)

    # 2. Auto-detect any other *_API_KEY / *_KEY env vars
    for env_var, key in os.environ.items():
        if env_var in WELL_KNOWN_PROVIDERS:
            continue
        if not (env_var.endswith("_API_KEY") or env_var.endswith("_KEY")):
            continue
        # Skip common non-provider keys
        if env_var in ("ENCRYPTION_KEY", "GATEWAY_TOKEN", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"):
            continue
        valid, reason = is_valid_key(key)
        if valid:
            provider, profile_key = _infer_provider(env_var)
            profiles[profile_key] = {"type": "api_key", "provider": provider, "key": key.strip()}
            print(f"Auto-detected provider key: {env_var} -> {profile_key}")
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
