export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // 640px هو الحجم المثالي لموديلات SDXL (توازن بين الجودة والسرعة والذاكرة)
        const MAX_WIDTH = 640; 
        
        let width = img.width;
        let height = img.height;

        // الحفاظ على الأبعاد (Aspect Ratio)
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_WIDTH) {
            width *= MAX_WIDTH / height;
            height = MAX_WIDTH;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // رسم خلفية بيضاء لتجنب مشاكل الصور الشفافة (PNG)
        if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, width, height);
        }

        // التحويل لـ JPEG بجودة عالية (0.9)
        // هذا يضمن وجود "data:image/jpeg;base64,..."
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        
        resolve(compressedBase64);
      };
      
      img.onerror = (error) => reject(error);
    };
    
    reader.onerror = (error) => reject(error);
  });
};
