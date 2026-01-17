import React, { useState, useRef } from 'react';

// --- المكونات (مدمجة هنا لضمان عمل الموقع فوراً) ---

const Header = () => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm" style={{borderBottom: '1px solid #eee', padding: '15px 0'}}>
    <div className="container mx-auto px-4 flex justify-center">
      <img src="https://e.top4top.io/p_366949c1c1.png" alt="Logo" style={{height: '70px', objectFit: 'contain'}} />
    </div>
  </header>
);

const Hero = () => (
  <div className="text-center space-y-6 py-12">
    <h1 style={{fontSize: '2.5rem', fontWeight: '900', color: '#1a237e', marginBottom: '15px'}}>ماذا لو رسمك فان جوخ؟</h1>
    <p style={{fontSize: '1.2rem', color: '#475569', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6'}}>
      حوّل صورك المفضلة إلى لوحات زيتية خالدة، واستلهم فنك الخاص.
    </p>
  </div>
);

const Footer = () => (
  <footer style={{backgroundColor: '#f8fafc', padding: '40px 0', marginTop: 'auto', textAlign: 'center', borderTop: '1px solid #e2e8f0'}}>
    <p style={{color: '#475569', fontWeight: '600'}}>تم التطوير بكل حب بواسطة <span style={{color: '#1a237e'}}>[إلهام العطار]</span></p>
    <p style={{color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px'}}>جميع الحقوق محفوظة © 2026</p>
  </footer>
);

// --- التطبيق الرئيسي ---

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setResultImage(null);
      setIsProcessing(true);
      
      // محاكاة الذكاء الاصطناعي (لضمان عمل الموقع بدون API)
      setTimeout(() => {
        setIsProcessing(false);
        setResultImage(imageUrl); 
      }, 3500);
    }
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Cairo, sans-serif', direction: 'rtl', backgroundColor: '#fdfaf1'}}>
      <Header />
      
      <main style={{flex: 1, padding: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%'}}>
        {!selectedImage ? (
          <div className="animate-in fade-in">
            <Hero />
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '3px dashed #fbc02d',
                borderRadius: '24px',
                padding: '80px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'white',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{fontSize: '5rem', marginBottom: '20px'}}>🎨</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1a237e', marginBottom: '10px'}}>اضغط هنا لرفع صورتك</h3>
              <p style={{color: '#64748b'}}>نقبل جميع أنواع الصور (JPG, PNG)</p>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{display: 'none'}} />
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in slide-in-from-bottom duration-700">
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center'}}>
              
              {/* الصورة الأصلية */}
              <div style={{flex: '1 1 300px', maxWidth: '400px'}}>
                <h3 style={{textAlign: 'center', fontWeight: 'bold', color: '#64748b', marginBottom: '15px'}}>الأصل</h3>
                <img src={selectedImage} alt="Original" style={{width: '100%', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
              </div>

              {/* النتيجة */}
              <div style={{flex: '1 1 300px', maxWidth: '400px'}}>
                <h3 style={{textAlign: 'center', fontWeight: 'bold', color: '#1a237e', marginBottom: '15px'}}>لوحة فان جوخ</h3>
                {isProcessing ? (
                  <div style={{height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '15px', border: '2px solid #fbc02d'}}>
                    <div className="animate-spin" style={{fontSize: '3rem', marginBottom: '15px'}}>🖌️</div>
                    <p style={{color: '#1a237e', fontWeight: 'bold', fontSize: '1.1rem'}}>جاري دمج الألوان...</p>
                  </div>
                ) : (
                  <div style={{position: 'relative', overflow: 'hidden', borderRadius: '15px', border: '8px double #1a237e', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
                    <img 
                      src={resultImage || ''} 
                      alt="Result" 
                      style={{
                        width: '100%', 
                        display: 'block',
                        filter: 'contrast(1.3) saturate(1.6) sepia(0.4) hue-rotate(-10deg)' 
                      }} 
                    />
                    <div style={{position: 'absolute', inset: 0, backgroundImage: 'url(https://www.transparenttextures.com/patterns/canvas-orange.png)', opacity: 0.3, pointerEvents: 'none'}}></div>
                  </div>
                )}
              </div>
            </div>

            {!isProcessing && (
              <div style={{textAlign: 'center', marginTop: '50px'}}>
                 <button 
                  onClick={() => setSelectedImage(null)}
                  style={{
                    backgroundColor: '#1a237e', color: 'white', padding: '15px 40px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                 >
                   جرب صورة أخرى ↻
                 </button>
                 
                 <div style={{marginTop: '60px', padding: '40px', backgroundColor: '#fff', borderRadius: '30px', boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)', borderTop: '6px solid #fbc02d'}}>
                    <h2 style={{color: '#1a237e', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '15px'}}>فان جوخ صنع أسلوبه بنفسه! 🖌️✨</h2>
                    <p style={{fontSize: '1.2rem', color: '#475569', marginBottom: '30px', lineHeight: '1.7'}}>وجودك هنا مو صدفة.. أنت وصلت لأن <span style={{color: '#f59e0b', fontWeight: 'bold'}}>دفتر إلهامك للرسم</span> هو طريقك، اشتريه الان واكتشف بصمتك.</p>
                    <a href="https://salla.sa/elhamk23" target="_blank" rel="noopener noreferrer" style={{display: 'inline-block', backgroundColor: '#fbc02d', color: '#1a237e', padding: '16px 50px', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 4px 15px rgba(251, 192, 45, 0.4)'}}>تسوق الآن 🛍️</a>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
