$ErrorActionPreference = "Stop"
$target = Join-Path $PSScriptRoot "..\assets\source\cards"
New-Item -ItemType Directory -Force -Path $target | Out-Null

$photos = [ordered]@{
  "energy-01" = "VHlrCYpJGEY"; "energy-02" = "8gjMwPIoji4"; "energy-03" = "1CbcMXp8r3Q"; "energy-04" = "1J4a11wNRVA"; "energy-05" = "CmhJPJ_E9tQ"
  "metals-01" = "jmlAozIDeHg"; "metals-02" = "YtY64RB3DFw"; "metals-03" = "AFKX0ei32lA"; "metals-04" = "dc2bBZP0O0U"; "metals-05" = "zThV7iFEc9U"
  "agriculture-01" = "EEYeXlO2vkQ"; "agriculture-02" = "2OYgrZAmvMA"; "agriculture-03" = "1nbpbEaNKr8"; "agriculture-04" = "heMxputJ4sk"; "agriculture-05" = "hnpRPJ6uvFs"
  "biomaterials-01" = "N8CouWLRJ7o"; "biomaterials-02" = "yNlKG8EBqrM"; "biomaterials-03" = "bH6wt8WikcQ"; "biomaterials-04" = "-5_oCbECmLo"; "biomaterials-05" = "wGNRn0HSqiw"
}

foreach ($entry in $photos.GetEnumerator()) {
  $output = Join-Path $target ($entry.Key + ".jpg")
  if (Test-Path $output) { continue }
  $uri = "https://unsplash.com/photos/$($entry.Value)/download?force=true&w=1800"
  Write-Host "Téléchargement $($entry.Key)..."
  Invoke-WebRequest -Uri $uri -UserAgent "Mozilla/5.0" -OutFile $output
}
