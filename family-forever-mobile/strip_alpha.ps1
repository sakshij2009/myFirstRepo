Add-Type -AssemblyName System.Drawing
try {
    $pathFull = Resolve-Path ".\assets\icon.png"
    $img = [System.Drawing.Image]::FromFile($pathFull)
    $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.DrawImage($img, 0, 0, $img.Width, $img.Height)
    
    $outPath = Join-Path (Get-Location) ".\assets\icon_no_alpha.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Successfully stripped alpha channel!"
} catch {
    Write-Host "Error: $_"
}
