import React from 'react';

export default function Resources() {
  return (
    <div className="page-container">
      <h1>Kaynaklar</h1>
      <div className="content-box">
        <h2>Yararlı Bağlantılar</h2>
        <ul>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Hava Kalitesi Ölçüm İstasyonları</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Hava Kirliliği Hakkında Bilgiler</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Çevre ve Şehircilik Bakanlığı</a></li>
        </ul>
        
        <h2>Dokümantasyon</h2>
        <p>Bu proje hakkında teknik dokümantasyon ve kullanım kılavuzu.</p>
        {/* Add more resources as needed */}
      </div>
    </div>
  );
}
