# Unreal maps — pull & rebuild

The **web game** on AWS does not run these `.umap` files. They are for **Unreal Editor 5.8** on your PC.

## Option A — Git (recommended)

After `git pull`:

```powershell
cd nextgen\unreal\DriveAnywhere
# Open DriveAnywhere.uproject in UE 5.8 → MAP_WestminsterSprint → Alt+P
```

Maps live in `Content/DriveAnywhere/Maps/MAP_*.umap` (~11 MB each).

If maps look stale, rebuild from handoff JSON:

```powershell
cd C:\Users\Admin\Desktop\OpenRace\t1
npm run export:unreal
$env:DA_ONLY_MAP = "MAP_WestminsterSprint"
& "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe" `
  "nextgen\unreal\DriveAnywhere\DriveAnywhere.uproject" `
  "-ExecutePythonScript=C:/Users/Admin/Desktop/OpenRace/t1/nextgen/unreal/DriveAnywhere/Content/Python/da_driveable.py" `
  -unattended -nop4 -nosplash
```

Run **one map per process** (`DA_ONLY_MAP`) — all 9 at once can OOM.

## Option B — AWS S3 zip (another machine / teammate)

Package locally:

```powershell
.\scripts\package-unreal-maps.ps1
# Creates nextgen/unreal/driveanywhere-maps.zip (~100 MB maps + materials)
```

Upload to S3, download on target PC, unzip into `nextgen/unreal/DriveAnywhere/Content/`.

## What's in git vs local only

| Path | In git | Purpose |
|------|--------|---------|
| `nextgen/unreal/export/circuits/*.json` | Yes | Hero/landmark data for rebuild |
| `Content/Python/da_*.py` | Yes | Procedural city builder |
| `Content/DriveAnywhere/Maps/*.umap` | Yes | Baked maps |
| `Content/DriveAnywhere/Materials/**` | Yes | Required for maps to render |
| `Saved/`, `Intermediate/` | No | Engine cache |

Status after rebuild: `nextgen/unreal/export/driveable-status.json`
