export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  
  // لا تقم بأي تعديل هنا. أرسل الـ Base64 كما هو.
  
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Server API Error:", data); 
      throw new Error(data.error || "فشل الاتصال بالموديل");
    }

    return data.output;
    
  } catch (error: any) {
    console.error("Service Error:", error);
    throw new Error(error.message || "حدث خطأ غير متوقع");
  }
};
