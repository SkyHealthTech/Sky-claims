# Export SSL public certificate for claims.skyhealthtech.ca
# Run this in PowerShell: .\export-cert.ps1
# Output: claims_skyhealthtech_ca.pem (ready to submit to Ontario MCEDT lab)

$domain = "claims.skyhealthtech.ca"
$outFile = "$PSScriptRoot\claims_skyhealthtech_ca.pem"

try {
    # Create a TCP connection and negotiate TLS
    $tcpClient = New-Object System.Net.Sockets.TcpClient($domain, 443)
    $sslStream = New-Object System.Net.Security.SslStream(
        $tcpClient.GetStream(), $false,
        { param($sender, $cert, $chain, $errors) $true }  # accept any cert
    )
    $sslStream.AuthenticateAsClient($domain)

    # Get the server certificate (leaf / end-entity cert)
    $cert = $sslStream.RemoteCertificate
    $cert2 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cert)

    $sslStream.Dispose()
    $tcpClient.Dispose()

    # Print certificate info
    Write-Host "Subject   : $($cert2.Subject)"
    Write-Host "Issuer    : $($cert2.Issuer)"
    Write-Host "Not Before: $($cert2.NotBefore)"
    Write-Host "Not After : $($cert2.NotAfter)"
    Write-Host "Thumbprint: $($cert2.Thumbprint)"
    Write-Host ""

    # Export as PEM (Base64-encoded DER)
    $derBytes = $cert2.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $base64   = [Convert]::ToBase64String($derBytes, [Base64FormattingOptions]::InsertLineBreaks)
    $pem      = "-----BEGIN CERTIFICATE-----`r`n$base64`r`n-----END CERTIFICATE-----`r`n"

    Set-Content -Path $outFile -Value $pem -Encoding ASCII
    Write-Host "Certificate saved to: $outFile"
    Write-Host "Submit this file to Ontario MCEDT/HCV conformance lab as your MSA public certificate."
}
catch {
    Write-Error "Failed: $_"
}
