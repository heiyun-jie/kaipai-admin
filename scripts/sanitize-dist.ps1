$ErrorActionPreference = 'Stop'

$distPath = Resolve-Path (Join-Path $PSScriptRoot '..\dist')
$targetExtensions = @('.js', '.css', '.html')
$vueErrorReferencePattern = 'https://vuejs\.org/error-reference/#[^"''`\s)]*'
$urlPattern = 'https?://[^\s"''<>)]+'
$allowedNamespacePattern = '^http://www\.w3\.org/(2000/svg|1998/Math/MathML|1999/xlink)$'

$files = Get-ChildItem -Path $distPath -Recurse -File |
  Where-Object { $targetExtensions -contains $_.Extension.ToLowerInvariant() }

foreach ($file in $files) {
  $content = Get-Content -LiteralPath $file.FullName -Raw
  $sanitized = [regex]::Replace($content, $vueErrorReferencePattern, '')
  $sanitized = [regex]::Replace($sanitized, $urlPattern, {
    param($match)
    if ($match.Value -match '^https?://(?:api\.)?kplyyk\.com\b' -or $match.Value -match $allowedNamespacePattern) {
      return $match.Value
    }
    return ''
  })
  if ($sanitized -ne $content) {
    Set-Content -LiteralPath $file.FullName -Value $sanitized -Encoding UTF8 -NoNewline
  }
}

$violations = New-Object System.Collections.Generic.List[string]
foreach ($file in $files) {
  $content = Get-Content -LiteralPath $file.FullName -Raw
  foreach ($match in [regex]::Matches($content, $urlPattern)) {
    if ($match.Value -notmatch '^https?://(?:api\.)?kplyyk\.com\b' -and $match.Value -notmatch $allowedNamespacePattern) {
      $relative = Resolve-Path -LiteralPath $file.FullName -Relative
      $violations.Add("$relative => $($match.Value)")
    }
  }
}

if ($violations.Count -gt 0) {
  throw "Admin dist contains non-kplyyk.com/api.kplyyk.com URLs:`n$($violations -join "`n")"
}

Write-Host "Admin dist URL sanitizer passed: only kplyyk.com/api.kplyyk.com external URLs and W3C XML namespace constants remain."
