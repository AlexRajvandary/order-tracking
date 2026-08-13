param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 100000)]
    [int]$Pages,

    [string]$Output = "output/maketto-products.json",

    [ValidateRange(0, 600000)]
    [int]$Delay = 1000,

    [ValidateRange(1000, 600000)]
    [int]$Timeout = 45000,

    [string]$Category = "",

    [string]$ParentCategory = "",

    [switch]$Headful
)

$arguments = @(
    (Join-Path $PSScriptRoot "src/index.mjs"),
    "--url", $Url,
    "--pages", $Pages,
    "--output", $Output,
    "--delay", $Delay,
    "--timeout", $Timeout
)

if ($Category) {
    $arguments += @("--category", $Category)
}

if ($ParentCategory) {
    $arguments += @("--parent-category", $ParentCategory)
}

if ($Headful) {
    $arguments += "--headful"
}

& node @arguments
exit $LASTEXITCODE
