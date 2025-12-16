import json
import time
import uuid
from typing import Any, Dict, List, Optional

from .redis_service import redis_service


def _now_ts() -> int:
    return int(time.time())


def _address(address: str) -> str:
    return address.lower().strip()


def _creations_list_key(address: str) -> str:
    return f"creations:{_address(address)}"


def _creation_key(creation_id: str) -> str:
    return f"creation:{creation_id}"


def _safe_json_loads(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def create_creation(*, address: str, provider: str, source_url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    creation_id = uuid.uuid4().hex
    ts = _now_ts()

    creation: Dict[str, Any] = {
        "id": creation_id,
        "owner_address": _address(address),
        "provider": provider,
        "created_at": ts,
        "updated_at": ts,
        "source_url": source_url,
        "artifacts": [],
    }

    if params:
        creation["params"] = params

    return creation


def get_creation(*, address: str, creation_id: str) -> Optional[Dict[str, Any]]:
    raw = redis_service.get(_creation_key(creation_id))
    creation = _safe_json_loads(raw)
    if not creation:
        return None

    if creation.get("owner_address") != _address(address):
        return None

    return creation


def save_creation(*, creation: Dict[str, Any]) -> None:
    redis_service.set(_creation_key(creation["id"]), json.dumps(creation))


def _artifact_exists(creation: Dict[str, Any], artifact_id: str) -> bool:
    for a in creation.get("artifacts", []) or []:
        if a.get("id") == artifact_id:
            return True
    return False


def append_artifact(
    *,
    address: str,
    creation_id: str,
    artifact: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    creation = get_creation(address=address, creation_id=creation_id)
    if not creation:
        return None

    artifact_id = artifact.get("id")
    if artifact_id and _artifact_exists(creation, artifact_id):
        return creation

    creation.setdefault("artifacts", []).append(artifact)
    creation["updated_at"] = _now_ts()

    save_creation(creation=creation)
    return creation


def record_image_generation(
    *,
    address: str,
    provider: str,
    input_url: str,
    output_url: str,
    creation_id: Optional[str] = None,
    source_artifact_id: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    output_artifact_id: Optional[str] = None,
) -> Dict[str, Any]:
    addr = _address(address)

    creation: Optional[Dict[str, Any]] = None
    if creation_id:
        creation = get_creation(address=addr, creation_id=creation_id)

    if not creation:
        creation = create_creation(address=addr, provider=provider, source_url=input_url, params=params)

        input_artifact = {
            "id": uuid.uuid4().hex,
            "type": "image",
            "role": "input",
            "url": input_url,
            "provider": provider,
            "created_at": creation["created_at"],
        }
        creation["artifacts"].append(input_artifact)

        redis_service.lpush(_creations_list_key(addr), creation["id"])
        redis_service.ltrim(_creations_list_key(addr), 0, 49)

    output_artifact = {
        "id": output_artifact_id or uuid.uuid4().hex,
        "type": "image",
        "role": "output",
        "url": output_url,
        "provider": provider,
        "action": "ghiblify",
        "created_at": _now_ts(),
    }
    if source_artifact_id:
        output_artifact["source_artifact_id"] = source_artifact_id
    if params:
        output_artifact["params"] = params

    creation.setdefault("artifacts", [])
    if not _artifact_exists(creation, output_artifact["id"]):
        creation["artifacts"].append(output_artifact)

    creation["updated_at"] = _now_ts()
    save_creation(creation=creation)

    return creation


def list_creations(*, address: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    ids = redis_service.lrange(_creations_list_key(address), offset, offset + limit - 1)

    creations: List[Dict[str, Any]] = []
    for creation_id in ids:
        raw = redis_service.get(_creation_key(creation_id))
        creation = _safe_json_loads(raw)
        if not creation:
            continue
        if creation.get("owner_address") != _address(address):
            continue

        artifacts = creation.get("artifacts", []) or []
        latest = None
        for a in reversed(artifacts):
            if a.get("role") == "output":
                latest = a
                break

        creations.append(
            {
                "id": creation.get("id"),
                "provider": creation.get("provider"),
                "created_at": creation.get("created_at"),
                "updated_at": creation.get("updated_at"),
                "thumbnail_url": (latest or {}).get("url") or creation.get("source_url"),
                "artifacts_count": len(artifacts),
            }
        )

    return creations
