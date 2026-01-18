export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // ⚠️ التعديل هنا: خفضنا الرقم من 1000 إلى 512
        // موديلات "Pix2Pix" مصممة لتعمل بدقة 512x512 بشكل أساسي
        const MAX_WIDTH = 512; 
        
        let width = img.width;
        let height = img.height;

        // حساب الأبعاد الجديدة مع الحفاظ على التناسب
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

        // ضغط الجودة قليلاً
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        resolve(compressedBase64);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};
