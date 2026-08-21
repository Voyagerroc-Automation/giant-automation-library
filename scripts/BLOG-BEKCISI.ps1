# BLOG-BEKCISI.ps1 — Docker acik oldugu surece AI haber yayinini OTOMATIK tetikler.
#
# Ne yapar: arka planda sessizce calisir; Docker Desktop acildiginda vr-n8n
# saglikli olana kadar bekler ve "AI Haber Derlemesi" workflow'unun
# webhook'unu tetikler (soru sorulmaz). Docker acik kaldigi surece her
# 3 saatte bir yeniden tetikler; workflow yeni haber bulursa yayinlar,
# bulamazsa bos gecer.
#
# Tasarim notlari:
#  - SESSIZ PENCERE (08:30-09:35): workflow'un 09:00 zamanlayicisiyla ES
#    ZAMANLI kosu yarisini onler. n8n static-data kilidi kosu bitene kadar
#    diske yazilmadigi icin ayni anda baslayan iki kosu birbirini goremez;
#    penceredeki tetiklemeler ertelenir ve 09:00 kosusu son tetik sayilir.
#  - DEBOUNCE: 'acik' saymak icin 2 ardisik basarili daemon kontrolu gerekir;
#    uyku/hibernate donuslerindeki kisa kesintiler tetik yagmuruna donmez.
#  - Mukerrer yayin korumasi bekcide DEGIL, workflow'dadir: 30 dakikalik
#    kosu kilidi + 7 gunluk parmak izi filtresi + Bloggerda Ara. Fazladan
#    tetikleme ayni haberi iki kez basmaz.
#
# Kurulum: Baslangic klasorundeki BLOG-BEKCISI.vbs bu betigi oturum acilisinda
# gizli pencereyle baslatir. Gunluk: %LOCALAPPDATA%\eip-blog-bekcisi.log

$ErrorActionPreference = 'SilentlyContinue'

$logDosyasi = Join-Path $env:LOCALAPPDATA 'eip-blog-bekcisi.log'
function Yaz-Log {
    param([string]$mesaj)
    $satir = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $mesaj
    Add-Content -Path $logDosyasi -Value $satir -Encoding utf8
    # Gunluk sisirmesin: 200 KB'i asinca son yarisini tut.
    $bilgi = Get-Item $logDosyasi
    if ($bilgi -and $bilgi.Length -gt 200KB) {
        $satirlar = Get-Content $logDosyasi
        $satirlar | Select-Object -Last ([int]($satirlar.Count / 2)) | Set-Content $logDosyasi -Encoding utf8
    }
}

# Ayni anda iki bekci calismasin (or. hem baslangic gorevi hem elle baslatma).
$yeniMi = $false
$mutex = New-Object System.Threading.Mutex($true, 'EIPBlogBekcisi', [ref]$yeniMi)
if (-not $yeniMi) { exit }

Yaz-Log 'Bekci basladi (otomatik mod, 3 saat aralikli).'

$webhook = 'http://127.0.0.1:5678/webhook/ai-haber-baslat'
$tetikAraligiSaat = 3
$ustUsteAcik = 0                    # debounce sayaci
$dockerAcikti = $false              # onceki KARARLI durum
$sonTetik = [DateTime]::MinValue    # son basarili (veya sayilan) tetikleme

function Test-DockerDaemon {
    $null = docker info 2>$null
    return ($LASTEXITCODE -eq 0)
}

function Test-N8nSaglikli {
    $h = docker inspect -f '{{.State.Health.Status}}' vr-n8n 2>$null
    return ($h -eq 'healthy')
}

function Sessiz-PenceredeMiyiz {
    # 08:30-09:35 arasi: workflow'un 09:00 zamanlayicisiyla yarisma.
    $simdi = Get-Date
    $dakika = $simdi.Hour * 60 + $simdi.Minute
    return ($dakika -ge 510 -and $dakika -le 575)
}

function Tetikle {
    # Docker yeni acildiysa n8n'in saglikli olmasi surebilir; bekle.
    $hazir = $false
    for ($i = 0; $i -lt 40; $i++) {
        if (Test-N8nSaglikli) { $hazir = $true; break }
        Start-Sleep -Seconds 6
    }
    if (-not $hazir) {
        Yaz-Log 'n8n 4 dakikada saglikli olmadi; tetikleme atlandi.'
        return $false
    }
    try {
        $null = Invoke-RestMethod -Method Post -Uri $webhook -TimeoutSec 15
        Yaz-Log 'Webhook tetiklendi (otomatik).'
        return $true
    } catch {
        Yaz-Log 'Webhook ulasilamadi (workflow aktif olmayabilir); 10 dk sonra yeniden denenecek.'
        return $false
    }
}

while ($true) {
    if (Test-DockerDaemon) { $ustUsteAcik++ } else { $ustUsteAcik = 0 }
    $kararliAcik = ($ustUsteAcik -ge 2)   # debounce: 2 ardisik basarili kontrol

    if ($kararliAcik -and -not $dockerAcikti) {
        Yaz-Log 'Docker acilisi algilandi.'
    }

    if ($kararliAcik -and ((Get-Date) - $sonTetik).TotalHours -ge $tetikAraligiSaat) {
        if (Sessiz-PenceredeMiyiz) {
            # 09:00 zamanlayicisi bu kosuyu yapacak; onu son tetik say ki
            # pencere kapanir kapanmaz ikinci bir kosu acilmasin.
            $sonTetik = (Get-Date).Date.AddHours(9)
        } else {
            if (Tetikle) { $sonTetik = Get-Date }
            else { $sonTetik = (Get-Date).AddHours(-$tetikAraligiSaat).AddMinutes(10) }
        }
    }

    if ($kararliAcik) { $dockerAcikti = $true }
    elseif ($ustUsteAcik -eq 0 -and $dockerAcikti) {
        # Tek basarisiz kontrol yetmez; kapali kararini da debounce'la:
        # bir sonraki turda da kapaliysa durum dusurulur.
        Start-Sleep -Seconds 10
        if (-not (Test-DockerDaemon)) {
            $dockerAcikti = $false
            Yaz-Log 'Docker kapandi.'
        }
    }

    Start-Sleep -Seconds 45
}
