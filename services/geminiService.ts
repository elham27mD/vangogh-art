export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  
  // نرسل الصورة إلى الـ API الخاص بنا في Vercel
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: base64Image // نرسل الصورة (Replicate يقبل Base64 مباشرة)
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "فشل الاتصال بخدمة المعالجة");
  }

  // إرجاع رابط الصورة الناتج
  return data.output;
};
