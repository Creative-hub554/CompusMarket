$env:PATH = "C:\Program Files\nodejs;C:\Users\theow\AppData\Roaming\npm;$env:PATH"
Set-Location 'apps/backend'
& 'C:\Program Files\nodejs\node.exe' 'node_modules\.bin\npx.cmd' tsc --noEmit