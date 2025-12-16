import React from 'react'

export default function InfoBox() {
  return (
    <div className="info-box">
      <h3>Proje Amacı</h3>
      <p>
        Nilüfer ilçesinde rüzgâr yönü ve hızına bağlı olarak hava kirleticilerin basit
        trigonometrik model ile yayılımını simüle eder.
      </p>
      <h4>Model Özeti</h4>
      <ul>
        <li>Rüzgâr yönü etrafında çoklu ışınlarla örnekleme</li>
        <li>Mesafe ile üstel azalma</li>
        <li>Yanlamasına Gauss benzeri zayıflama</li>
      </ul>
      <p className="muted">Bu bir eğitim amaçlı basitleştirilmiş görselleştirmedir.</p>
    </div>
  )
}
