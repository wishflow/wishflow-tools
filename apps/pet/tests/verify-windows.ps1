$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $PSScriptRoot
$installerPath = Join-Path $appRoot 'install.ps1'
$fixtureDirectory = Join-Path $appRoot 'pets\uu-usagi'
$powershellPath = Join-Path $PSHOME 'powershell.exe'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('usagi-pet-windows-test-' + [guid]::NewGuid().ToString('N'))
$testTemp = Join-Path $testRoot 'temp'
$harnessPath = Join-Path $testRoot 'invoke-installer.ps1'
$harnessSource = @'
function Invoke-WebRequest {
    [CmdletBinding()]
    param(
        [string]$Uri,
        [string]$OutFile,
        [switch]$UseBasicParsing
    )

    if ($env:USAGI_PET_TEST_MODE -eq 'download-failure') { throw 'mock download failure' }
    if ($env:USAGI_PET_TEST_MODE -eq 'hash-mismatch' -and $Uri.EndsWith('spritesheet.webp')) {
        [System.IO.File]::WriteAllText($OutFile, 'corrupt fixture')
        return
    }

    $fileName = [System.IO.Path]::GetFileName($Uri)
    Copy-Item -LiteralPath (Join-Path $env:USAGI_PET_FIXTURE_DIR $fileName) -Destination $OutFile -Force
}

. $env:USAGI_PET_INSTALLER
'@

function Assert-Condition {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Invoke-InstallerProcess {
    param([string]$CodexHome, [string]$UserProfile, [string]$Mode)

    if ([string]::IsNullOrWhiteSpace($CodexHome)) { Remove-Item Env:CODEX_HOME -ErrorAction SilentlyContinue }
    else { $env:CODEX_HOME = $CodexHome }
    $env:USERPROFILE = $UserProfile
    $env:USAGI_PET_TEST_MODE = $Mode
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $powershellPath -NoProfile -ExecutionPolicy Bypass -File $harnessPath 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = [string]::Join([Environment]::NewLine, @($output))
    }
}

try {
    New-Item -ItemType Directory -Path $testTemp -Force | Out-Null
    $env:TEMP = $testTemp
    $env:TMP = $testTemp
    $env:USAGI_PET_FIXTURE_DIR = $fixtureDirectory
    $env:USAGI_PET_INSTALLER = $installerPath
    Set-Content -LiteralPath $harnessPath -Value $harnessSource -Encoding UTF8

    $tokens = $null
    $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($installerPath, [ref]$tokens, [ref]$parseErrors) | Out-Null
    Assert-Condition ($parseErrors.Count -eq 0) ('PowerShell AST errors: ' + [string]::Join('; ', @($parseErrors | ForEach-Object { $_.Message })))

    $customHome = Join-Path $testRoot 'Codex home with spaces'
    $customInstall = Invoke-InstallerProcess -CodexHome $customHome -UserProfile $customHome -Mode 'success'
    $customTarget = Join-Path $customHome 'pets\uu-usagi'
    Assert-Condition ($customInstall.ExitCode -eq 0) ('Custom CODEX_HOME install failed: ' + $customInstall.Output)
    Assert-Condition ((Test-Path -LiteralPath (Join-Path $customTarget 'pet.json')) -and (Test-Path -LiteralPath (Join-Path $customTarget 'spritesheet.webp'))) 'Install did not create both expected files.'
    Assert-Condition ($customInstall.Output.Contains($customTarget)) 'Install output did not show the final path.'

    $petJsonPath = Join-Path $customTarget 'pet.json'
    $petJsonTimestamp = (Get-Item -LiteralPath $petJsonPath).LastWriteTimeUtc
    $repeatInstall = Invoke-InstallerProcess -CodexHome $customHome -UserProfile $customHome -Mode 'success'
    Assert-Condition ($repeatInstall.ExitCode -eq 0) 'Repeat install failed.'
    Assert-Condition ((Get-Item -LiteralPath $petJsonPath).LastWriteTimeUtc -eq $petJsonTimestamp) 'Repeat install rewrote pet.json.'

    $defaultProfile = Join-Path $testRoot 'Default profile'
    $defaultInstall = Invoke-InstallerProcess -CodexHome '' -UserProfile $defaultProfile -Mode 'success'
    $defaultTarget = Join-Path $defaultProfile '.codex\pets\uu-usagi'
    Assert-Condition ($defaultInstall.ExitCode -eq 0 -and (Test-Path -LiteralPath (Join-Path $defaultTarget 'pet.json'))) 'Default USERPROFILE path did not install.'

    $conflictHome = Join-Path $testRoot 'Conflict profile'
    $conflictTarget = Join-Path $conflictHome 'pets\uu-usagi'
    New-Item -ItemType Directory -Path $conflictTarget -Force | Out-Null
    $markerPath = Join-Path $conflictTarget 'marker.txt'
    Set-Content -LiteralPath $markerPath -Value 'user data'
    $conflictInstall = Invoke-InstallerProcess -CodexHome $conflictHome -UserProfile $conflictHome -Mode 'success'
    Assert-Condition ($conflictInstall.ExitCode -ne 0) 'Conflicting target unexpectedly succeeded.'
    Assert-Condition ((Get-Content -LiteralPath $markerPath -Raw).Trim() -eq 'user data') 'Conflict handling changed an existing file.'
    Assert-Condition ((Get-ChildItem -LiteralPath $conflictTarget -Force).Count -eq 1) 'Conflict handling added files to the existing target.'

    foreach ($mode in @('download-failure', 'hash-mismatch')) {
        $failedHome = Join-Path $testRoot ('Failed ' + $mode)
        $failedInstall = Invoke-InstallerProcess -CodexHome $failedHome -UserProfile $failedHome -Mode $mode
        Assert-Condition ($failedInstall.ExitCode -ne 0) ($mode + ' unexpectedly succeeded.')
        Assert-Condition (-not (Test-Path -LiteralPath (Join-Path $failedHome 'pets\uu-usagi'))) ($mode + ' left a partial pet directory.')
    }

    if ((Get-ChildItem -LiteralPath $testTemp -Force).Count -ne 0) { throw 'Windows installer left temporary files behind.' }
    Write-Output 'Windows PowerShell 5.1 installer checks passed.'
}
finally {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
