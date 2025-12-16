import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <Link to="/" className="logo-link">
            <div className="logo-circle">BN</div>
            <h1 style={{textTransform: 'capitalize', textAlign: 'center'}}>Hava Kirliliğinin Yayılmasında Rüzgar Etkisini Matematiksel Modelleme İle Ölçme</h1>
          </Link>
        </div>
        <nav className="nav">
          <Link to="/">Ana Sayfa</Link>
          <Link to="/sonuclar">Sonuçlar</Link>
          <Link to="/icerik">İçerik</Link>
          <Link to="/kaynaklar">Kaynaklar</Link>
          <Link to="/hakkimizda">Hakkımızda</Link>
        </nav>
      </div>
    </header>
  );
}
