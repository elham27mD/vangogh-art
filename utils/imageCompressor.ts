export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // نستخدم 1000 بكسل كحد أقصى للعرض (هذا يحول الصورة من 5MB إلى حوالي 200KB)
        const MAX_WIDTH = 1000; 
        const scaleSize = MAX_WIDTH / img.width;
        
        const newWidth = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
        const newHeight = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        // الضغط بنسبة 70%
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        resolve(compressedBase64);
      };
      
      img.onerror = (error) => reject(error);
    };
    
    reader.onerror = (error) => reject(error);
  });
};
