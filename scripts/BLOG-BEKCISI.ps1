# BLOG-BEKCISI.ps1 — Docker acilisini izler, gunun AI haber yayinini sorar.
#
# Ne yapar: arka planda sessizce calisir; Docker Desktop her acildiginda
# (kapali -> acik gecisinde) vr-n8n saglikli olana kadar bekler, sonra
# "Gunun 10 blog yazisi yayinlansin mi?" diye sorar. Evet denirse n8n'deki
# "AI Haber Derlemesi" workflow'unun webhook'unu tetikler.
#
# Tasarim notlari:
#  - SESSIZ PENCERE (08:30-09:35): workflow'un 09:00 zamanlayicisiyla ES
#    ZAMANLI kosu yarisini onler. n8n static-data kilidi kosu bitene kadar
#    diske yazilmadigi icin ayni anda baslayan iki kosu birbirini goremez;
#    bu penceredeki sorular pencere kapanana kadar ertelenir.
#  - DEBOUNCE: 'acik' saymak icin 2 ardisik basarili daemon kontrolu gerekir;
#    uyku/hibernate donuslerindeki kisa kesintiler soru yagmuruna donmez.
#  - Mukerrer yayin korumasi bekcide DEGIL, workflow'un icindedir (Gunluk
#    Kilit + Bloggerda Ara). Iki kez Evet'e basmak ayni gunu iki kez basmaz.
#
# Kurulum: Baslangic klasorundeki BLOG-BEKCISI.vbs bu betigi oturum acilisinda
# gizli pencereyle baslatir. Gunluk: %LOCALAPPDATA%\eip-blog-bekcisi.log

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms | Out-Null

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

Yaz-Log 'Bekci basladi.'

$webhook = 'http://127.0.0.1:5678/webhook/ai-haber-baslat'
$ustUsteAcik = 0        # debounce sayaci
$dockerAcikti = $false  # onceki KARARLI durum
$bekleyenSoru = $false  # sessiz pencerede ertelenen soru

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

function Soruyu-Sor {
    $hazir = $false
    for ($i = 0; $i -lt 40; $i++) {
        if (Test-N8nSaglikli) { $hazir = $true; break }
        Start-Sleep -Seconds 6
    }
    if (-not $hazir) {
        Yaz-Log 'n8n 4 dakikada saglikli olmadi; soru sorulmadi.'
        return
    }

    # ServiceNotification: gizli surecten acilan diyalogun on planda ve
    # gorunur olmasini garantiler - kullanici soruyu kacirmasin.
    $cevap = [System.Windows.Forms.MessageBox]::Show(
        "Docker acildi ve n8n hazir.`n`nGunun 10 AI haber blog yazisi simdi yayinlansin mi?`n`n(Bugun zaten yayin yapildiysa otomasyon kendini korur; mukerrer yayin olmaz.)",
        'AI Haber Derlemesi',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question,
        [System.Windows.Forms.MessageBoxDefaultButton]::Button1,
        [System.Windows.Forms.MessageBoxOptions]::ServiceNotification)

    if ($cevap -eq [System.Windows.Forms.DialogResult]::Yes) {
        $gonderildi = $false
        try {
            $null = Invoke-RestMethod -Method Post -Uri $webhook -TimeoutSec 15
            $gonderildi = $true
        } catch { }

        if ($gonderildi) {
            Yaz-Log 'Kullanici Evet dedi; webhook tetiklendi.'
            [System.Windows.Forms.MessageBox]::Show(
                "Yayin istegi gonderildi. Ilerlemeyi n8n panelinden izleyebilirsiniz:`nhttp://localhost:5678",
                'AI Haber Derlemesi', 'OK', 'Information',
                [System.Windows.Forms.MessageBoxDefaultButton]::Button1,
                [System.Windows.Forms.MessageBoxOptions]::ServiceNotification) | Out-Null
        } else {
            Yaz-Log 'Kullanici Evet dedi ama webhook ulasilamadi (workflow aktif olmayabilir).'
            [System.Windows.Forms.MessageBox]::Show(
                "Istek gonderilemedi. Workflow henuz Aktif olmayabilir:`nn8n panelinde 'AI Haber Derlemesi' workflow'unu acip sag ustten Active yapin, sonra Docker'i yeniden baslattiginizda tekrar sorulur.",
                'AI Haber Derlemesi', 'OK', 'Warning',
                [System.Windows.Forms.MessageBoxDefaultButton]::Button1,
                [System.Windows.Forms.MessageBoxOptions]::ServiceNotification) | Out-Null
        }
    } else {
        Yaz-Log 'Kullanici Hayir dedi.'
    }
}

while ($true) {
    if (Test-DockerDaemon) { $ustUsteAcik++ } else { $ustUsteAcik = 0 }
    $kararliAcik = ($ustUsteAcik -ge 2)   # debounce: 2 ardisik basarili kontrol

    if ($kararliAcik -and -not $dockerAcikti) {
        Yaz-Log 'Docker acilisi algilandi.'
        if (Sessiz-PenceredeMiyiz) {
            Yaz-Log 'Sessiz pencere (08:30-09:35): soru ertelendi, 09:00 zamanlayicisi devrede.'
            $bekleyenSoru = $true
        } else {
            Soruyu-Sor
        }
    }

    if ($bekleyenSoru -and -not (Sessiz-PenceredeMiyiz)) {
        # Pencere kapandi: 09:00 kosusu bittiyse Gunluk Kilit soruya Evet
        # denilse bile ikinci yayini engeller; kosu hic olmadiysa (n8n o an
        # kapaliydi) bu soru gunu kurtarir.
        $bekleyenSoru = $false
        if ($kararliAcik) { Soruyu-Sor }
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
