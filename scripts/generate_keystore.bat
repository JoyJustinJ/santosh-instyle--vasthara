@echo off
echo ============================================
echo  Vasthara Release Keystore Generator
echo ============================================
echo.

set JDK_PATH=%~dp0..\jdk-21.0.2\bin
set "PATH=%JDK_PATH%;%PATH%"

set "KEYSTORE_FILE=%~dp0..\android\vasthara-release.jks"
set KEY_ALIAS=vasthara

if exist "%KEYSTORE_FILE%" (
    echo Keystore already exists: %KEYSTORE_FILE%
    echo Delete it manually if you want to regenerate.
    pause
    exit /b 0
)

echo IMPORTANT: Save the passwords you enter. You cannot recover them!
echo.

keytool -genkey -v ^
    -keystore "%KEYSTORE_FILE%" ^
    -keyalg RSA ^
    -keysize 2048 ^
    -validity 10000 ^
    -alias %KEY_ALIAS%

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Keystore generation failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  SUCCESS! Keystore created.
echo ============================================
echo.
echo Next step: Create android\keystore.properties with:
echo.
echo   storeFile=vasthara-release.jks
echo   storePassword=YOUR_STORE_PASSWORD
echo   keyAlias=vasthara
echo   keyPassword=YOUR_KEY_PASSWORD
echo.
echo Then run: cd android ^&^& gradlew bundleRelease
echo.
echo WARNING: Backup vasthara-release.jks to a safe place!
echo.
pause
