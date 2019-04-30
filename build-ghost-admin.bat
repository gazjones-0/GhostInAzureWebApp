@ECHO OFF
cd core
cd client
ember build
ember build "-environment=production"
cd ..
cd ..
