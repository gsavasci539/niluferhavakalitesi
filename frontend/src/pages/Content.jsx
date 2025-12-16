import React from 'react';

export default function Content() {
  return (
    <div className="page-container">
      <h1>İçerik</h1>
      <div className="content-box">
        <h2>Hava Kirliliği Hakkında</h2>
        <p>
          Bu sayfada hava kirliliği ile ilgili bilgilendirici içerikler bulabilirsiniz. 
          Hava kalitesi, kirleticiler ve etkileri hakkında detaylı bilgiler burada yer almaktadır.
        </p>
        
        <section className="content-section">
          <h3>Hava Kalitesi Endeksi (HKİ) Nedir?</h3>
          <p>
            Hava Kalitesi Endeksi, hava kalitesini ölçmek ve halkı bilgilendirmek amacıyla kullanılan bir ölçümdür. 
            Farklı kirleticilerin konsantrasyonlarına göre hesaplanır ve genellikle 0-500 arasında bir değer alır.
          </p>
        </section>
        
        <section className="content-section">
          <h3>Başlıca Hava Kirleticileri</h3>
          <ul>
            <li>Partikül Madde (PM2.5 ve PM10)</li>
            <li>Azot Dioksit (NO₂)</li>
            <li>Kükürt Dioksit (SO₂)</li>
            <li>Karbon Monoksit (CO)</li>
            <li>Ozon (O₃)</li>
          </ul>
        </section>
        
        <section className="content-section">
          <h3>Hava Kirliliğinin Etkileri</h3>
          <p>
            Hava kirliliği, insan sağlığı, ekosistemler ve iklim değişikliği üzerinde önemli etkilere sahiptir. 
            Uzun süreli maruziyet, solunum ve kalp-damar hastalıklarına yol açabilir.
          </p>
        </section>
      </div>
    </div>
  );
}
