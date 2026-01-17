
import React from 'react';

const LOGO_URL = "https://e.top4top.io/p_366949c1c1.png";

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <a href="https://salla.sa/elhamk23" target="_blank" rel="noopener noreferrer">
          <img 
            src={LOGO_URL} 
            alt="إلهامك للرسم" 
            className="h-16 md:h-20 object-contain drop-shadow-sm"
          />
        </a>
      </div>
    </header>
  );
};

export default Header;
