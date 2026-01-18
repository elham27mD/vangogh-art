// utils/imageCompressor.ts

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // الحجم 512 بكسل هو المعيار الذهبي لموديلات الذكاء الاصطناعي (مثل Pix2Pix)
        // يضمن سرعة المعالجة ويمنع امتلاء ذاكرة السيرفر
        const MAX_WIDTH = 512; 
        
        let width = img.width;
        let height = img.height;

        // خوارزمية الحفاظ على أبعاد الصورة (Aspect Ratio)
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
        ctx?.drawImage(img, 0, 0, width, height);

        // التحويل إلى JPEG بجودة 90%
        // النتيجة تكون نصاً يبدأ بـ data:image/jpeg;base64... وهو المطلوب تماماً
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        
        resolve(compressedBase64);
      };
      
      img.onerror = (error) => reject(error);
    };
    
    reader.onerror = (error) => reject(error);
  });
};
