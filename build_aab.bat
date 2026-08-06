@echo off
setlocal

set "JAVA_HOME=C:\Users\Administrator\Downloads\santosh-instyle--vasthara-main\santosh-instyle--vasthara-main\jdk-21.0.2"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Using JAVA_HOME: %JAVA_HOME%
echo.

call android\gradlew.bat bundleRelease -p android

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo  BUILD SUCCESSFUL!
    echo  AAB is at:
    echo  android\app\build\outputs\bundle\release\app-release.aab
    echo ============================================
) else (
    echo.
    echo BUILD FAILED - check errors above
)

endlocal
