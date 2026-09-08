<#
=============================================================================
  ANGEL SWARM - one-time language-model fetch (Windows PowerShell)

  This folder ships without language-model weights. Run this ONCE, on a
  machine with an internet connection, from the folder that contains the
  ANGEL-SWARM launcher. It downloads one file into app\models\llm.gguf and
  then the folder never needs a network again.

  HOW TO RUN IT
    Right-click the folder, choose "Open in Terminal", then:

        .\get-model.ps1

    If Windows refuses because of the execution policy, use:

        powershell -ExecutionPolicy Bypass -File .\get-model.ps1

  WHAT IT DOWNLOADS
    Qwen2.5-0.5B-Instruct, 494 million parameters, quantised to Q4_K_M.
    About 400 MB. Licence: Apache-2.0 (Alibaba Cloud / Qwen team). The
    licence permits redistribution and commercial use; it is not shipped
    inside this package only because 400 MB of weights in a demonstration
    folder is unreasonable, not because of any restriction.

  WHAT THE MODEL IS USED FOR
    Composing the after-action summary on the "Mission brief" pane, from
    figures the application computed itself. It is never asked a clinical
    question and nothing it writes is fed back into the simulation. The
    application works without it; that pane simply says so.

  WHAT THIS SCRIPT VERIFIES
    1. The bytes on disk match the SHA-256 the distributor declares for the
       file, fetched from the repository's own metadata over TLS. This
       catches a truncated or corrupted download.
    2. The file begins with the GGUF magic.
    3. The size is in the expected range.
    4. If $ExpectedSha256 below is set, the digest must equal it exactly.
       It ships EMPTY; the reason is written at that variable.

  Re-running is safe. An existing, valid model file is left alone.
=============================================================================
#>

[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ------------------------------------------------------------------ constants
$Repo    = 'Qwen/Qwen2.5-0.5B-Instruct-GGUF'
$File    = 'qwen2.5-0.5b-instruct-q4_k_m.gguf'
$AltRepo = 'bartowski/Qwen2.5-0.5B-Instruct-GGUF'
$AltFile = 'Qwen2.5-0.5B-Instruct-Q4_K_M.gguf'
$HostUrl = 'https://huggingface.co'
$MinBytes = 300000000
$MaxBytes = 600000000

# -----------------------------------------------------------------------------
# $ExpectedSha256 - the trust anchor, and why it is empty.
#
# This script was written inside an air-gapped build environment that is denied
# egress to huggingface.co by policy. The digest of the release file could not
# be observed at authoring time, and writing a plausible 64-character string
# here would have been worse than writing nothing: every run would fail, or
# somebody would delete the check to make it pass.
#
# The script still verifies the download against the SHA-256 the repository
# declares for that file. That proves the bytes arrived intact. It does not, on
# its own, prove the file is what it was the day somebody audited it.
#
# TO PIN IT PROPERLY: run this once on a machine you trust, take the SHA-256 it
# prints, satisfy yourself it matches the digest on the model's page, and paste
# it between the quotes below.
# -----------------------------------------------------------------------------
$ExpectedSha256 = ''

# ------------------------------------------------------------------- plumbing
$Here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$DestDir = Join-Path $Here 'app\models'
$Dest    = Join-Path $DestDir 'llm.gguf'
$Part    = "$Dest.part"

function Say {
    param([string]$m = '')
    Write-Host "  $m"
}

function Rule {
    Write-Host '  ----------------------------------------------------------------'
}

function Die {
    param([string]$m)
    Write-Host ''
    Write-Host "  ERROR: $m" -ForegroundColor Red
    Write-Host ''
    exit 1
}

function Get-Sha256([string]$path) {
    (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower()
}

function Test-GgufMagic([string]$path) {
    $fs = [System.IO.File]::OpenRead($path)
    try {
        $b = New-Object byte[] 4
        if ($fs.Read($b, 0, 4) -lt 4) { return $false }
        return ([System.Text.Encoding]::ASCII.GetString($b) -eq 'GGUF')
    } finally { $fs.Dispose() }
}

Write-Host ''
Say 'ANGEL SWARM - language model install'
Rule
Say 'Model    Qwen2.5-0.5B-Instruct, Q4_K_M quantisation'
Say 'Size     about 400 MB'
Say 'Licence  Apache-2.0'
Say 'Target   app\models\llm.gguf'
Rule
Write-Host ''

# --------------------------------------------------------------- tool check
# curl.exe has shipped with Windows since build 17063. PowerShell's own
# Invoke-WebRequest is used as the fallback; it cannot resume, which is why
# curl is preferred for a 400 MB file on a hotel connection.
$curl = Get-Command curl.exe -ErrorAction SilentlyContinue
if (-not $curl) {
    Say 'curl.exe was not found. Falling back to the PowerShell downloader,'
    Say 'which cannot resume an interrupted transfer. If the download breaks'
    Say 'part way through it will have to start again.'
    Write-Host ''
}

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

# ------------------------------------------------------- already installed?
if ((Test-Path $Dest) -and -not $Force) {
    $sz = (Get-Item $Dest).Length
    if ((Test-GgufMagic $Dest) -and $sz -ge $MinBytes) {
        Say 'A model is already installed:'
        Say "  $Dest"
        Say "  $sz bytes"
        Say "  sha256 $(Get-Sha256 $Dest)"
        Write-Host ''
        Say 'Nothing to do. Delete that file, or pass -Force, to replace it.'
        Write-Host ''
        exit 0
    }
    Say "An existing $Dest is not a valid model file. Replacing it."
    Remove-Item $Dest -Force
}

# ---------------------------------------------------------- pick the source
function Get-SourceInfo([string]$repo, [string]$file) {
    $url = "$HostUrl/$repo/resolve/main/$file"
    try {
        $r = Invoke-WebRequest -Uri $url -Method Head -MaximumRedirection 5 `
                               -TimeoutSec 30 -UseBasicParsing
    } catch { return $null }
    $sha = $null; $len = $null
    foreach ($k in $r.Headers.Keys) {
        $v = ($r.Headers[$k] -join '').Trim('"')
        if ($k -ieq 'x-linked-etag'  -and $v -match '^[0-9a-f]{64}$') { $sha = $v }
        if ($k -ieq 'x-linked-size') { $len = [int64]$v }
        if ($k -ieq 'content-length' -and -not $len) { $len = [int64]$v }
    }
    return [pscustomobject]@{ Url = $url; Sha = $sha; Bytes = $len }
}

Say "Source   $Repo"
Say "         $File"
Write-Host ''
Say 'Checking the source is reachable...'

$info = Get-SourceInfo $Repo $File
if (-not $info) {
    Say "The first source did not answer. Trying $AltRepo."
    $Repo = $AltRepo; $File = $AltFile
    $info = Get-SourceInfo $Repo $File
}
if (-not $info) {
    Die @"
neither source could be reached.

  Check the machine has internet access and is not behind a proxy that blocks
  huggingface.co. If it is, download the file in a browser from
    $HostUrl/$Repo/resolve/main/$File
  and save it as  app\models\llm.gguf  inside this folder, then run this
  script again to have it checked.
"@
}

if ($info.Sha)   { Say "Declared sha256  $($info.Sha)" }
else             { Say 'The source did not declare a digest in its headers. The download will'
                   Say 'be checked for size and format only, and the digest printed for you.' }
if ($info.Bytes) { Say "Declared size    $($info.Bytes) bytes" }
Write-Host ''

# ------------------------------------------------------------- the download
if (Test-Path $Part) {
    Say "Resuming an interrupted download ($((Get-Item $Part).Length) bytes already here)."
}
Say 'Downloading. This is about 400 MB and may take several minutes.'
Write-Host ''

if ($curl) {
    & curl.exe -L --fail --retry 5 --retry-delay 2 --retry-connrefused `
        --connect-timeout 30 -C - -o $Part $info.Url
    if ($LASTEXITCODE -ne 0) {
        Die @"
the download did not complete (curl exit code $LASTEXITCODE).

  The partial file has been kept at
    $Part
  Run this script again and it will carry on from where it stopped.
"@
    }
} else {
    if (Test-Path $Part) { Remove-Item $Part -Force }   # cannot resume
    try {
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $info.Url -OutFile $Part -TimeoutSec 0 -UseBasicParsing
    } catch {
        Die "the download did not complete: $($_.Exception.Message)"
    }
}

Write-Host ''

# --------------------------------------------------------------- the checks
if (-not (Test-Path $Part)) { Die 'the download produced no file.' }

$sz = (Get-Item $Part).Length
if ($info.Bytes -and $sz -ne $info.Bytes) {
    Die "size mismatch: got $sz bytes, the source said $($info.Bytes).`n  The download is incomplete. Run this script again to resume it."
}
if ($sz -lt $MinBytes -or $sz -gt $MaxBytes) {
    Remove-Item $Part -Force
    Die "the downloaded file is $sz bytes, outside the expected range ($MinBytes to $MaxBytes).`n  It has been deleted. This usually means an error page was saved instead of the model."
}
Say "Size     $sz bytes - OK"

if (-not (Test-GgufMagic $Part)) {
    Remove-Item $Part -Force
    Die 'the downloaded file does not begin with the GGUF magic, so it is not a model file. It has been deleted.'
}
Say 'Format   GGUF - OK'

$got = Get-Sha256 $Part
Say "sha256   $got"
if ($ExpectedSha256 -and $got -ne $ExpectedSha256.ToLower()) {
    Remove-Item $Part -Force
    Die "the digest does not match the pinned `$ExpectedSha256 in this script.`n  Expected $ExpectedSha256`n  Got      $got`n  The file has been deleted. Do not use it."
}
if ($info.Sha -and $got -ne $info.Sha) {
    Remove-Item $Part -Force
    Die "the digest does not match the one the source declared.`n  Declared $($info.Sha)`n  Got      $got`n  The download is corrupt. It has been deleted. Run this script again."
}
if ($info.Sha) { Say 'Digest   matches the source - OK' }
if (-not $ExpectedSha256) {
    Write-Host ''
    Say 'This script has no pinned digest. If you want every future install'
    Say 'checked against a fixed value, put the sha256 above into the'
    Say '$ExpectedSha256 variable near the top of this file.'
}

Move-Item -Force -Path $Part -Destination $Dest

Write-Host ''
Rule
Say 'DONE.'
Write-Host ''
Say "Installed  $Dest"
Say 'Model      Qwen2.5-0.5B-Instruct  Q4_K_M  Apache-2.0'
Write-Host ''
Say 'Start the launcher and open "Mission brief" in the left-hand rail.'
Say 'This machine does not need an internet connection again.'
Rule
Write-Host ''
