@echo off
cd /d "%~dp0"
echo Gerando CSS...
npx tailwindcss -i ./src/css/input.css -o ./dist/style.css --minify
echo.
echo Pronto! dist/style.css atualizado.
pause
