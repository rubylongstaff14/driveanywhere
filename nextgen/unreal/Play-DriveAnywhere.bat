@echo off
title DriveAnywhere
echo Opening DriveAnywhere...
echo When Unreal loads: click the big Play button (or press Alt+P)
echo Fly with WASD, look with right mouse button.
echo.
start "" "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe" "%~dp0DriveAnywhere\DriveAnywhere.uproject"
