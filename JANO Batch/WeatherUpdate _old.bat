regedit.exe /s "F:\WebSites\Apps\JANO\pronostico\JANO Batch\proxyUp.reg"
timeout /t 3 /nobreak > NUL
start /d "F:\WebSites\Apps\JANO\pronostico\JANO Batch" ClimaBatch.exe
timeout /t 120 /nobreak > NUL
regedit.exe /S "F:\WebSites\Apps\JANO\pronostico\JANO Batch\proxyDown.reg"
