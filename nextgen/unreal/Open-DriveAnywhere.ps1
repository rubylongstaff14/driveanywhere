# DriveAnywhere — open Unreal project or send you to install the engine.
$ErrorActionPreference = "Stop"
$Project = Join-Path $PSScriptRoot "DriveAnywhere\DriveAnywhere.uproject"
$ImportPy = Join-Path $PSScriptRoot "DriveAnywhere\Content\Python\da_import.py"

function Find-UnrealEditor {
    $names = @("UE_5.8", "UE_5.7", "UE_5.6", "UE_5.5", "UE_5.4")
    $roots = @(
        "C:\Program Files\Epic Games",
        "D:\Epic Games",
        "E:\Epic Games",
        "$env:ProgramFiles\Epic Games",
        "${env:ProgramFiles(x86)}\Epic Games"
    )
    foreach ($root in $roots) {
        foreach ($name in $names) {
            $exe = Join-Path $root "$name\Engine\Binaries\Win64\UnrealEditor.exe"
            if (Test-Path $exe) { return $exe }
        }
    }
    $found = Get-ChildItem -Path "C:\Program Files\Epic Games", "D:\", "C:\" -Filter "UnrealEditor.exe" -Recurse -ErrorAction SilentlyContinue -Depth 6 |
        Select-Object -First 1 -ExpandProperty FullName
    return $found
}

function Find-EpicLauncher {
    $candidates = @(
        "C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe",
        "C:\Program Files\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe",
        "$env:LOCALAPPDATA\EpicGamesLauncher\Saved\..\..\..\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

if (-not (Test-Path $Project)) {
    Write-Error "Missing $Project"
}

$editor = Find-UnrealEditor
if ($editor) {
    Write-Host "Opening DriveAnywhere with $editor"
    Write-Host "After shaders compile, Output Log → Python:"
    Write-Host "    import da_import, da_vehicles"
    Write-Host "    da_import.import_all()"
    Write-Host "    da_vehicles.import_classes()"
    Start-Process -FilePath $editor -ArgumentList "`"$Project`""
    exit 0
}

Write-Host "Unreal Editor is not installed on this PC."
Write-Host "Epic Games Launcher is the installer. Install Unreal Engine 5.5 or newer (Games → Racing template is optional; this .uproject is already created)."
Write-Host "Then run this script again."
Write-Host ""
Write-Host "Project: $Project"
Write-Host "Importer: $ImportPy"

$launcher = Find-EpicLauncher
if ($launcher) {
    Start-Process -FilePath $launcher
    Write-Host "Opened Epic Games Launcher. Install Unreal Engine 5.5+ from Unreal Engine → Library → +."
} else {
    Write-Host "Install Epic Games Launcher from https://store.epicgames.com/en-US/download then install UE 5.5+."
    Start-Process "https://store.epicgames.com/en-US/download"
}
