@echo off
title DriveAnywhere — Local Play Test
echo.
echo  DriveAnywhere Unreal — local test
echo  ---------------------------------
echo  1. Wait for the editor to finish loading
echo  2. Press Alt+P  (Play)
echo  3. WASD = drive   Mouse = look   Esc = stop
echo.
echo  Tracks: Content / DriveAnywhere / Maps / MAP_*
echo  Start on Westminster Sprint by default.
echo.
start "" "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0DriveAnywhere\DriveAnywhere.uproject"
