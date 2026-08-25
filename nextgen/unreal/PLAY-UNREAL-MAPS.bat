@echo off
title DriveAnywhere — Unreal maps (NOT the website)
echo.
echo  ========================================
echo   This opens Unreal Editor — the NEW maps
echo   Browser / Amplify can NEVER show these
echo  ========================================
echo.
echo  When Unreal loads:
echo    1. Wait for shaders if first open
echo    2. Press Alt+P  (or click Play)
echo    3. WASD to drive, mouse to look
echo    4. Viewport must be Lit (not Unlit)
echo.
echo  Other maps: Content Browser → DriveAnywhere → Maps → MAP_*
echo.

set "EDITOR=C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
set "PROJECT=%~dp0DriveAnywhere\DriveAnywhere.uproject"
set "MAP=/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"

if not exist "%EDITOR%" (
  echo ERROR: Unreal 5.8 not found at:
  echo   %EDITOR%
  echo Install UE 5.8 from Epic Games Launcher, then run again.
  pause
  exit /b 1
)

start "" "%EDITOR%" "%PROJECT%" "%MAP%"
echo Unreal is starting...
timeout /t 3 >nul
