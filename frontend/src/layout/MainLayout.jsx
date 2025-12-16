import React from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

export default function MainLayout({ children }) {
  return (
    <div className="layout">
      <Header />
      <main className="main container">
        {children}
      </main>
      <Footer />
    </div>
  )
}
