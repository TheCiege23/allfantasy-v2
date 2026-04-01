$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "public\af-crest.png"
$iconsDir = Join-Path $PSScriptRoot "public\icons"
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)

if (-not (Test-Path $sourcePath)) {
  throw "Source icon not found at $sourcePath"
}

if (-not (Test-Path $iconsDir)) {
  New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$image = [System.Drawing.Image]::FromFile($sourcePath)

try {
  foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.DrawImage($image, 0, 0, $size, $size)

      $outputPath = Join-Path $iconsDir "icon-$size.png"
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Host "Generated $outputPath"
    }
    finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
}
finally {
  $image.Dispose()
}
