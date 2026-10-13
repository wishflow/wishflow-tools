$ErrorActionPreference = 'Stop'

$repositoryBaseUrl = 'https://raw.githubusercontent.com/wishflow/wishflow-tools/master/apps/pet'
$expectedPetJsonSha256 = '9279ef338ef91cb56b99753f56f4335fa1dc55f38a765a7008a182fc5a92b2da'
$expectedSpritesheetSha256 = '3bb176b93e06e7a9d73717f26ac102f816f64d083e77d11691f3aa63958306a0'

function Test-FileBytesEqual {
    param(
        [Parameter(Mandatory = $true)][string]$LeftPath,
        [Parameter(Mandatory = $true)][string]$RightPath
    )

    $leftBytes = [System.IO.File]::ReadAllBytes($LeftPath)
    $rightBytes = [System.IO.File]::ReadAllBytes($RightPath)
    if ($leftBytes.Length -ne $rightBytes.Length) { return $false }

    for ($index = 0; $index -lt $leftBytes.Length; $index++) {
        if ($leftBytes[$index] -ne $rightBytes[$index]) { return $false }
    }
    return $true
}

function Test-InstalledPackage {
    param(
        [Parameter(Mandatory = $true)][string]$TargetPath,
        [Parameter(Mandatory = $true)][string]$PetJsonPath,
        [Parameter(Mandatory = $true)][string]$SpritesheetPath
    )

    if (-not (Test-Path -LiteralPath $TargetPath -PathType Container)) { return $false }
    $entries = @(Get-ChildItem -LiteralPath $TargetPath -Force)
    if ($entries.Count -ne 2) { return $false }
    if (@($entries | Where-Object {
        $_.PSIsContainer -or (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
    }).Count -ne 0) { return $false }

    $expectedNames = @('pet.json', 'spritesheet.webp')
    if (@($entries | Where-Object { $_.Name -notin $expectedNames }).Count -ne 0) { return $false }
    if (@($entries | Select-Object -ExpandProperty Name -Unique).Count -ne 2) { return $false }

    return (Test-FileBytesEqual -LeftPath (Join-Path $TargetPath 'pet.json') -RightPath $PetJsonPath) -and
        (Test-FileBytesEqual -LeftPath (Join-Path $TargetPath 'spritesheet.webp') -RightPath $SpritesheetPath)
}

function Install-UsagiPet {
    $codexHome = $env:CODEX_HOME
    if ([string]::IsNullOrWhiteSpace($codexHome)) {
        if ([string]::IsNullOrWhiteSpace($env:USERPROFILE)) { throw '无法确定用户主目录。' }
        $codexHome = Join-Path $env:USERPROFILE '.codex'
    }

    $petsDirectory = Join-Path $codexHome 'pets'
    $targetDirectory = Join-Path $petsDirectory 'uu-usagi'
    $downloadDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('usagi-pet-' + [guid]::NewGuid().ToString('N'))
    $stageDirectory = $null

    try {
        New-Item -ItemType Directory -Path $downloadDirectory -ErrorAction Stop | Out-Null
        $petJsonDownload = Join-Path $downloadDirectory 'pet.json'
        $spritesheetDownload = Join-Path $downloadDirectory 'spritesheet.webp'

        Invoke-WebRequest -UseBasicParsing -Uri "$repositoryBaseUrl/pets/uu-usagi/pet.json" -OutFile $petJsonDownload -ErrorAction Stop
        Invoke-WebRequest -UseBasicParsing -Uri "$repositoryBaseUrl/pets/uu-usagi/spritesheet.webp" -OutFile $spritesheetDownload -ErrorAction Stop

        $actualPetJsonHash = (Get-FileHash -LiteralPath $petJsonDownload -Algorithm SHA256).Hash.ToLowerInvariant()
        $actualSpritesheetHash = (Get-FileHash -LiteralPath $spritesheetDownload -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualPetJsonHash -ne $expectedPetJsonSha256) { throw 'pet.json 的 SHA-256 不匹配，已停止安装。' }
        if ($actualSpritesheetHash -ne $expectedSpritesheetSha256) { throw 'spritesheet.webp 的 SHA-256 不匹配，已停止安装。' }

        $pet = Get-Content -LiteralPath $petJsonDownload -Raw | ConvertFrom-Json -ErrorAction Stop
        if ($pet.spritesheetPath -ne 'spritesheet.webp') { throw 'pet.json 未指向同目录下的 spritesheet.webp。' }

        if (Test-Path -LiteralPath $targetDirectory) {
            if (Test-InstalledPackage -TargetPath $targetDirectory -PetJsonPath $petJsonDownload -SpritesheetPath $spritesheetDownload) {
                Write-Output "Usagi 已安装：$targetDirectory"
                return
            }
            throw "安装目标包含不同、缺失或额外内容：$targetDirectory。请手动检查；安装器不会覆盖或删除现有文件。"
        }

        New-Item -ItemType Directory -Path $petsDirectory -Force -ErrorAction Stop | Out-Null
        $stageDirectory = Join-Path $petsDirectory ('.uu-usagi.' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $stageDirectory -ErrorAction Stop | Out-Null
        Copy-Item -LiteralPath $petJsonDownload -Destination (Join-Path $stageDirectory 'pet.json') -ErrorAction Stop
        Copy-Item -LiteralPath $spritesheetDownload -Destination (Join-Path $stageDirectory 'spritesheet.webp') -ErrorAction Stop

        if (-not (Test-InstalledPackage -TargetPath $stageDirectory -PetJsonPath $petJsonDownload -SpritesheetPath $spritesheetDownload)) {
            throw '暂存目录校验失败，已停止安装。'
        }
        if (Test-Path -LiteralPath $targetDirectory) {
            throw "安装目标在准备期间出现：$targetDirectory。原目录未覆盖，请检查后重试。"
        }

        [System.IO.Directory]::Move($stageDirectory, $targetDirectory)
        $stageDirectory = $null
        Write-Output "Usagi 已安装到：$targetDirectory"
        Write-Output '请在 ChatGPT / Codex 的 Pets 设置中刷新并手动选择 Usagi；CLI 可运行 /pets uu-usagi。'
    }
    finally {
        if ($null -ne $stageDirectory -and (Test-Path -LiteralPath $stageDirectory)) {
            Remove-Item -LiteralPath $stageDirectory -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $downloadDirectory) {
            Remove-Item -LiteralPath $downloadDirectory -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Install-UsagiPet
