Add-Type -AssemblyName System.Drawing

$size = 256
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$background = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#f26930'))
$shape = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 56
$diameter = $radius * 2
$shape.AddArc(0, 0, $diameter, $diameter, 180, 90)
$shape.AddArc($size - $diameter, 0, $diameter, $diameter, 270, 90)
$shape.AddArc($size - $diameter, $size - $diameter, $diameter, $diameter, 0, 90)
$shape.AddArc(0, $size - $diameter, $diameter, $diameter, 90, 90)
$shape.CloseFigure()
$graphics.FillPath($background, $shape)

$bars = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$graphics.FillRectangle($bars, 64, 126, 30, 66)
$graphics.FillRectangle($bars, 113, 88, 30, 104)
$graphics.FillRectangle($bars, 162, 142, 30, 50)

$publicPath = Join-Path $PSScriptRoot '..\public\app-icon.png'
$buildPath = Join-Path $PSScriptRoot '..\build\app-icon.ico'
New-Item -ItemType Directory -Force -Path (Split-Path $buildPath) | Out-Null
$bitmap.Save($publicPath, [System.Drawing.Imaging.ImageFormat]::Png)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Open($buildPath, [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Dispose()
$icon.Dispose()
$bars.Dispose()
$background.Dispose()
$shape.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
