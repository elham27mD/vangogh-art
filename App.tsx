import React, { useState, useRef } from 'react';

// رابط اللوجو المفرغ
const LOGO_URL = "https://e.top4top.io/p_366949c1c1.png"; 

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // نظام الألوان
  const theme = {
    bg: '#FAF3E0',       
    primary: '#1D3557',  
    accent: '#F4A261',   
    button: '#FFD700',   
    text: '#264653'
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setResultImage(null);
      setIsProcessing(true);
      // محاكاة وقت المعالجة
      setTimeout(() => {
        setIsProcessing(false);
        setResultImage(imageUrl);
      }, 3500);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: theme.bg, 
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
      backgroundSize: '20px 20px', 
      fontFamily: 'Tahoma, sans-serif',
      padding: '20px',
      direction: 'rtl',
      color: theme.text
    }}>
      
      {/* 1. رأس الصفحة */}
      <header style={{ textAlign: 'center', marginBottom: '50px', paddingTop: '20px' }}>
        <img 
          src={LOGO_URL} 
          alt="شعار إلهامك للرسم" 
          style={{ 
            width: '200px',
            height: 'auto', 
            marginBottom: '10px',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))'
          }} 
        />
        <h1 style={{ color: theme.primary, fontSize: '2.8rem', margin: '10px 0' }}>
          ماذا لو رسمك فان جوخ؟
        </h1>
        <p style={{ color: '#555', fontSize: '1.2rem', marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
          حوّل صورك المفضلة إلى لوحات زيتية خالدة، واستلهم فنك الخاص.
        </p>
      </header>

      {/* 2. المنطقة الرئيسية */}
      <main style={{ maxWidth: '950px', margin: '0 auto', textAlign: 'center' }}>
        
        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `4px dashed ${theme.primary}`,
              borderRadius: '25px',
              padding: '80px 20px',
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.6)',
              transition: 'transform 0.2s',
              boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🎨</div>
            <button style={{
              backgroundColor: theme.primary,
              color: '#fff',
              border: 'none',
              padding: '15px 40px',
              fontSize: '1.5rem',
              borderRadius: '50px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              ارسم صورتي
            </button>
            <p style={{ marginTop: '10px', opacity: 0.7 }}>اضغط هنا لرفع الصورة</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px', width: '100%' }}>
              <div style={{ flex: '1 1 350px', maxWidth: '400px' }}>
                <h3 style={{ color: theme.primary, marginBottom: '15px' }}>الأصل</h3>
                <img src={selectedImage} alt="Original" style={{ width: '100%', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
              </div>

              <div style={{ flex: '1 1 350px', maxWidth: '400px' }}>
                <h3 style={{ color: theme.primary, marginBottom: '15px' }}>لوحة فان جوخ</h3>
                {isProcessing ? (
                  <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: '15px', border: `2px solid ${theme.accent}` }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'spin 2s infinite linear' }}>🖌️</div>
                    <p style={{ fontSize: '1.2rem', color: theme.primary }}>جاري مزج الألوان...</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={resultImage || ''} 
                      alt="Van Gogh Result" 
                      style={{ width: '100%', borderRadius: '15px', border: `12px solid ${theme.button}`, boxShadow: '0 10px 40px rgba(29, 53, 87, 0.3)', filter: 'contrast(1.2) saturate(1.4) sepia(0.3) hue-rotate(-10deg)' }} 
                    />
                  </div>
                )}
              </div>
            </div>

            {!isProcessing && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => setSelectedImage(null)} style={{ padding: '12px 30px', borderRadius: '30px', border: `2px solid ${theme.primary}`, background: 'transparent', color: theme.primary, cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>جرب صورة أخرى ↻</button>
                <button style={{ padding: '12px 40px', borderRadius: '30px', border: 'none', background: theme.primary, color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>حفظ التحفة ⬇</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. الفوتر */}
      {resultImage && !isProcessing && (
        <footer style={{ 
          marginTop: '80px', 
          padding: '60px 20px', 
          backgroundColor: '#fff', 
          borderRadius: '30px',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.03)',
          textAlign: 'center',
          borderTop: `6px solid ${theme.button}`,
          maxWidth: '1000px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <h2 style={{ 
            color: theme.primary, 
            fontSize: '1.6rem', 
            marginBottom: '20px',
            lineHeight: '1.6',
            fontWeight: 'bold',
            maxWidth: '800px',
            margin: '0 auto 20px auto'
          }}>
            فان جوخ صنع أسلوبه بنفسه! 🖌️✨
          </h2>
          
          <p style={{ 
            color: '#555', 
            fontSize: '1.2rem', 
            marginBottom: '35px',
            maxWidth: '750px',
            margin: '0 auto 35px auto',
            lineHeight: '1.8'
          }}>
            والدور عليك الحين ايش منتظر! وجودك هنا مو صدفة.. أنت وصلت هنا لأن 
            <span style={{ color: theme.accent, fontWeight: 'bold' }}> دفتر إلهامك للرسم </span> 
            هو طريقك، اشتريه الان واكتشف بصمتك اللي بتغير العالم!
          </p>
          
          <a 
            href="https://salla.sa/elhamk23" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              backgroundColor: theme.button, 
              color: '#1d3557', 
              fontSize: '1.4rem',
              fontWeight: 'bold',
              padding: '18px 50px',
              borderRadius: '50px',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            تسوق الآن 🛍️
          </a>
        </footer>
      )}

      <div style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '20px', fontSize: '0.9rem', color: '#888' }}>
        <p>تم التطوير بكل حب وإبداع بواسطة [إلهام العطار]. جميع الحقوق محفوظة لـ إلهامك للرسم © 2026.</p>
      </div>

    </div>
  );
}

export default App;
