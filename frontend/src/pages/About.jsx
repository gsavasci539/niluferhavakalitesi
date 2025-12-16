import React from 'react'
import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Hakkımızda</h1>
          <p className="page-subtitle" style={{textTransform: 'capitalize', textAlign: 'center'}}>Hava Kirliliğinin Yayılmasında Rüzgar Etkisini Matematiksel Modelleme İle Ölçme</p>
        </div>
        
        <div className="content-section">
          <h2>1) Projenin Amacı</h2>
          <p>
            Bu proje, Bursa Nilüfer ilçesindeki hava kirliliği seviyelerini gerçek zamanlı olarak 
            takip etmek ve yayılım modellerini göstermek amacıyla geliştirilmiştir.
          </p>
          <h3>Proje Neden Yapılıyor?</h3>
          <p>
            Nilüfer ilçesindeki artan sanayi faaliyetleri ve nüfus yoğunluğu nedeniyle hava kalitesi 
            sorunları yaşanmaktadır. Vatandaşların güncel hava kalitesi bilgilerine erişmesi ve 
            kirliliğin yayılım patternlerinin anlaşılması kritik öneme sahiptir.
          </p>
          <h3>Hangi Problemleri Çözmeyi Amaçlıyoruz?</h3>
          <ul>
            <li>Hava kirliliği verilerine erişim zorluğu</li>
            <li>Kirliliğin coğrafi yayılımının görselleştirilememesi</li>
            <li>Gerçek zamanlı takip eksikliği</li>
            <li>Vatandaş bilgilendirme yetersizliği</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>2) Proje Ekibimiz</h2>
          <div className="team-grid">
            <div className="team-member">
              <h3>Beren</h3>
              <p><strong>Görev:</strong> Frontend Geliştirme ve UI/UX Tasarım</p>
              <p>React tabanlı arayüz geliştirme, harita entegrasyonu ve kullanıcı deneyimi optimizasyonu</p>
            </div>
            <div className="team-member">
              <h3>Eda</h3>
              <p><strong>Görev:</strong> Backend Geliştirme ve API Entegrasyonu</p>
              <p>FastAPI backend, veri toplama sistemleri ve API yönetimi</p>
            </div>
            <div className="team-member">
              <h3>Kerem</h3>
              <p><strong>Görev:</strong> Veri Analizi ve Modelleme</p>
              <p>Hava kirliliği yayılım algoritmaları, veri işleme ve analiz sistemleri</p>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h2>3) Çalışma Yöntemimiz</h2>
          <h3>Verileri Nasıl Topladık?</h3>
          <ul>
            <li>Open-Meteo API üzerinden güncel hava kalitesi verileri</li>
            <li>Meteorolojik radar verileri</li>
            <li>CAMS Europe atmosferik bileşen verileri</li>
            <li>Yerel ölçüm istasyonlarından veri entegrasyonu</li>
          </ul>
          <h3>Hangi Analizleri Uyguladık?</h3>
          <ul>
            <li>PM2.5, PM10, NO₂, SO₂, CO konsantrasyon analizi</li>
            <li>Rüzgar yönü ve hıza göre yayılım modellemesi</li>
            <li>Zaman serisi analizi ve tahminleme</li>
            <li>Coğrafi dağılım ve hotspot tespiti</li>
          </ul>
          <h3>Bilimsel Süreç</h3>
          <p>Veri toplama → Ön işleme → Modelleme → Doğrulama → Görselleştirme → Yorumlama döngüsü izlenmiştir.</p>
        </div>

        <div className="content-section">
          <h2>4) Kullandığımız Araçlar / Kaynaklar</h2>
          <div className="tools-grid">
            <div className="tool-category">
              <h4>Geliştirme Araçları</h4>
              <ul>
                <li>Windsurf (AI destekli kodlama)</li>
                <li>Python (Backend)</li>
                <li>React (Frontend)</li>
                <li>FastAPI (API Framework)</li>
                <li>Leaflet (Harita Kütüphanesi)</li>
              </ul>
            </div>
            <div className="tool-category">
              <h4>Veri Kaynakları</h4>
              <ul>
                <li>Open-Meteo API</li>
                <li>CAMS Europe</li>
                <li>Meteorolojik Radar Sistemleri</li>
                <li>Akıllı Şehir Sensörleri</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h2>5) Projenin Kapsamı</h2>
          <h3>Çalışmanın Sınırları</h3>
          <ul>
            <li>Coğrafi olarak Nilüfer ilçesi sınırları ile sınırlıdır</li>
            <li>Sadece belirli hava kalitesi parametreleri (PM2.5, PM10, NO₂, SO₂, CO)</li>
            <li>Gerçek zamanlı veri güncelleme sıklığı 15 dakika</li>
            <li>Tahminleme 24 saat öncesini kapsar</li>
          </ul>
          <h3>Hangi Ölçekte İnceleme Yaptık?</h3>
          <p>Nilüfer ilçesi genelinde yaklaşık 100km²'lik alanda, 5x5 grid (25 nokta) üzerinden detaylı analiz yapılmıştır.</p>
        </div>

        <div className="content-section">
          <h2>6) Bu Konuyu Neden Seçtik?</h2>
          <h3>Problemin Önemi</h3>
          <ul>
            <li>Hava kirliliği sağlık üzerinde doğrudan etkilidir</li>
            <li>Nilüfer Bursa'nın en hızlı gelişen ilçelerinden biridir</li>
            <li>Sanayi ve yerleşim alanlarının bir arada olması riski artırır</li>
            <li>Vatandaş bilgilendirme ve farkındalık yaratma ihtiyacı</li>
            <li>Yerel yönetimlerin veriye dayalı karar alması</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>7) Bilimsel Yaklaşımımız</h2>
          <h3>Akademik Doğruluk</h3>
          <ul>
            <li>Peer-reviewed metodolojiler kullanıldı</li>
            <li>Veri kaynakları doğrulanmış ve güvenilir</li>
            <li>Modelleme algoritmaları bilimsel literatüre dayalı</li>
            <li>Sonuçlar istatistiksel olarak valid edildi</li>
          </ul>
          <h3>Güvenilir Kaynak Kullanımı</h3>
          <p>Tüm veri kaynakları uluslararası standartlara uygun, resmi meteorolojik ve çevre kuruluşlarından alınmıştır.</p>
        </div>

        <div className="content-section">
          <h2>8) Beklenen Katkılar / Hedefler</h2>
          <div className="contributions-grid">
            <div className="contribution-item">
              <h4>Bilimsel Katkı</h4>
              <ul>
                <li>Yerel hava kirliliği yayılım modelleri</li>
                <li>Veriye dayalı analiz metodolojileri</li>
                <li>Akademik yayın potansiyeli</li>
              </ul>
            </div>
            <div className="contribution-item">
              <h4>Çevresel Katkı</h4>
              <ul>
                <li>Hava kalitesi izleme ve raporlama</li>
                <li>Kirlilik kaynakları tespiti</li>
                <li>Çevresel farkındalık artırma</li>
              </ul>
            </div>
            <div className="contribution-item">
              <h4>Toplumsal Katkı</h4>
              <ul>
                <li>Vatandaş bilgilendirme</li>
                <li>Sağlık riski azaltma</li>
                <li>Yerel politika geliştirme desteği</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h2>9) İletişim</h2>
          <p>
            Proje hakkında sorularınız, önerileriniz veya iş birliği için bizimle iletişime geçebilirsiniz.
          </p>
          <div className="contact-info">
            <p><strong>E-posta:</strong> hava-nilufer@proje.com</p>
            <p><strong>Proje Danışmanı:</strong> Dr. [İsim Soyisim]</p>
            <p><strong>Kurum:</strong> Nilüfer Belediyesi Çevre Koruma Müdürlüğü</p>
            <p><strong>Telefon:</strong> +90 224 XXX XX XX</p>
          </div>
        </div>

        <div className="content-section">
          <Link to="/" className="btn btn-primary">
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
