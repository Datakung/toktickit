@echo off
if "%TOKTICKIT_TEST_GATE_SNAPSHOT%"=="exit-failure" (
  echo Deliberate snapshot fixture failure
  exit /b 1
)
if "%TOKTICKIT_TEST_GATE_SNAPSHOT%"=="invalid-output" (
  echo Invalid snapshot fixture output
  exit /b 0
)
if "%TOKTICKIT_TEST_GATE_SNAPSHOT%"=="different-output" (
  echo bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
  exit /b 0
)
echo aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
exit /b 0
