@echo off
title EriniumFaction Wiki - Serveur Local
echo.
echo  ========================================
echo   EriniumFaction Wiki - Serveur Local
echo  ========================================
echo.
echo  Installation des dependances...
call npm install
echo.
echo  Ouverture du wiki sur http://localhost:8080
echo  Appuyez sur Ctrl+C pour arreter le serveur.
echo.
start http://localhost:8080
node server.js
pause
