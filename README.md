# IslamicForge

**Günlük hayat için İslami dijital araçlar.** Minimal, mobil öncelikli ve ücretsiz bir araç koleksiyonu.

[Portfolio](https://ceskacan.com) · [Repository](https://github.com/ceskasc/Islamicforge)

## İlk sürüm (v0.1.0)

- Namaz vakitleri: konum seçimi / kullanıcı onaylı GPS, altı vakit, bir sonraki namaza geri sayım. AlAdhan koordinat API ve **13 numaralı Diyanet hesaplama yöntemi** kullanılır. **Bu sonuçlar resmî Diyanet vakitleri değildir.**
- Kıble: Kâbe yönüne küresel başlangıç açısı. Cihaz destekliyorsa ve izin verilirse sensörlü pusula; desteklenmiyorsa gerçek kuzey referanslı derece.
- Tesbih: 33 / 99 / 100 hedefi veya serbest sayım, yerel kayıt, isteğe bağlı titreşim ve sıfırlama.
- Hicri takvim: Miladi ↔ Hicri dönüşümü; API'nin DIYANET takvim yöntemini talep eder. Resmî takvimlerle farklılık oluşabilir.
- Zekât: TL cinsinden varlıklar, altın miktarı ve kullanıcı tarafından girilen gram fiyatı, borç, nisap eşiği, kamerî yıl onayı; genel %2,5 hesabı. Fıkhî karar yerine geçmez.

## Tasarım ve teknoloji

Statik HTML, CSS ve vanilla JavaScript ES modules. Tasarım dili ceskacan portföyü ve diğer Forge projeleriyle uyumludur: krem ve koyu lacivert, kobalt vurgu, DM Sans / Space Grotesk, dark mode, TR/EN, duyarlı arayüz. Build servisi veya ücretli barındırma gerekmez.

## Gizlilik

Üyelik, uygulama sunucusu ve analitik yoktur. Tercihler ve tesbih kaydı tarayıcı localStorage alanındadır. GPS yalnız kullanıcı konum düğmesine bastığında istenir; GPS koordinatları kalıcı depolamaya yazılmaz. Namaz vakti API'sine konum koordinatları ve ilgili tarih gönderilir. Tarih dönüşümü de AlAdhan'a HTTPS isteği yapar. Google Fonts yüklenir; Google'a bir ağ isteği yapılabilir.

## Doğruluk ve sorumluluk

AlAdhan servisinin 13 numaralı yöntemi Diyanet temelli hesaplama olduğunu belirtir fakat bu Diyanet İşleri Başkanlığının kendi resmî API'si değildir. Şehir, hesaplama yöntemi, yerel düzeltme ve takvime göre dakika farklılıkları olabilir. İbadet vakti için resmî yerel takvimi kontrol etmek uygundur.

Zekât nisabı ve altın fiyatı canlı sorgulanmaz; kullanıcı tarafından girilir. Varlıkların kapsama girme ve borçların düşülme koşulları değerlendirmeye göre değişebilir. Hicri tarihler de resmî takvimlerle farklılık gösterebilir.

## Çalıştırma ve doğrulama

Node.js 22+ ile testler:

    npm run check

Uygulamayı ES Module destekleyen statik sunucuda aç:

    python3 -m http.server 8000

## GitHub Pages yayını

Depolama yoluna bağlı olmayan göreli dosya bağlantıları kullanılır. Bir defa **Settings → Pages → Build and deployment → Source: GitHub Actions** seçilir. Sonra main dalına her gönderimde otomatik kontrol ve Pages yayını çalışır. İlgili Actions iş akışı: IslamicForge - Verify and Publish.

**Repo adlandırması:** GitHub'da repo şu an **Islamicforge** olarak kayıtlı. İstenen isim IslamicForge ise Settings → General → Repository name üzerinden yeniden adlandırılmalı. Yeni web yolu da bu adla değişir.

## Kaynaklar

- [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api)
- [AlAdhan Islamic Calendar API](https://aladhan.com/islamic-calendar-api)

© 2026 Sadık Can Çeşka.
