@echo off
setlocal
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=C:\Users\jkjus\AppData\Local\Android\Sdk"

echo [1/3] Current Environment:
echo JAVA_HOME: %JAVA_HOME%
echo ANDROID_HOME: %ANDROID_HOME%

cd /d "c:\Users\jkjus\OneDrive\Desktop\PROJECTS - CHECK\santhosh\santosh-instyle--vasthara\android"

echo [2/3] Building Release APK and AAB...
call gradlew.bat assembleRelease bundleRelease --stacktrace
if %ERRORLEVEL% NEQ 0 (
    echo Gradle build failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo [3/4] Copying artifacts to release-artifacts...
if not exist "..\release-artifacts" mkdir "..\release-artifacts"
copy /y "app\build\outputs\bundle\release\app-release.aab" "..\release-artifacts\app-release.aab"
copy /y "app\build\outputs\apk\release\app-release.apk" "..\release-artifacts\app-release.apk"

echo [4/4] Build succeeded!
dir /s "c:\Users\jkjus\OneDrive\Desktop\PROJECTS - CHECK\santhosh\santosh-instyle--vasthara\android\app\build\outputs\*.apk" "c:\Users\jkjus\OneDrive\Desktop\PROJECTS - CHECK\santhosh\santosh-instyle--vasthara\android\app\build\outputs\*.aab" 2>nul
