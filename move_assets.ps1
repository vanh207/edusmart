$source = "C:\Users\DO VIET ANH\.gemini\antigravity\brain\3d9d85aa-d3c0-444b-916d-4b9795bae57c\hero_bg_1768560445643.png"
$dest = "client\public\images\home-hero.png"
New-Item -ItemType Directory -Force -Path "client\public\images"
Copy-Item -Path $source -Destination $dest -Force
Write-Host "File copied to $dest"
