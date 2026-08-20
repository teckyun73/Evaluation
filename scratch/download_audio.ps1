$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

$urls = @{
    "assets/audio/bgm_symphony.ogg" = "https://upload.wikimedia.org/wikipedia/commons/4/4b/Edward_Elgar_-_Pomp_and_Circumstance_March_No._1.ogg"
    "assets/audio/bgm_victory.ogg" = "https://upload.wikimedia.org/wikipedia/commons/0/05/Bizet_-_Carmen_Suite_no._1_-_Les_Toreadors.ogg"
    "assets/audio/bgm_emotion.ogg" = "https://upload.wikimedia.org/wikipedia/commons/b/b2/Johann_Pachelbel_-_Canon_in_D_Major_-_Musopen.ogg"
    "assets/audio/bgm_glory.ogg" = "https://upload.wikimedia.org/wikipedia/commons/e/ec/Beethoven_Symphony_No_9_mvt_4_Ode_to_Joy.ogg"
    "assets/audio/bgm_suspense.ogg" = "https://upload.wikimedia.org/wikipedia/commons/b/bc/Holst_The_Planets_Mars.ogg"
    "assets/audio/sfx_drumroll.ogg" = "https://upload.wikimedia.org/wikipedia/commons/3/36/Snare_roll.ogg"
    "assets/audio/sfx_fanfare.ogg" = "https://upload.wikimedia.org/wikipedia/commons/c/c5/Brass_Fanfare.ogg"
    "assets/audio/sfx_applause.ogg" = "https://upload.wikimedia.org/wikipedia/commons/3/3c/Cheering_and_applause.ogg"
}

foreach ($key in $urls.Keys) {
    $url = $urls[$key]
    Write-Host "Downloading $key from $url..."
    try {
        Invoke-WebRequest -Uri $url -UserAgent $ua -OutFile $key -TimeoutSec 60
        Write-Host "Success: $key"
    } catch {
        Write-Host "Failed: $key - $_"
    }
}
