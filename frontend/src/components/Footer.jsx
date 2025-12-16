import React from 'react'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p style={{textTransform: 'capitalize', textAlign: 'center'}}>© {new Date().getFullYear()} Hava Kirliliğinin Yayılmasında Rüzgar Etkisini Matematiksel Modelleme İle Ölçme</p>
        <div className="footer-links">
          <a href="#">Gizlilik</a>
          <a href="#">Koşullar</a>
        </div>
      </div>
    </footer>
  )
}
