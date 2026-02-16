
import { Question } from './types';

export const QUESTIONS: Question[] = [
  { 
    id: 1, 
    text: "هل تجد نفسك غالبًا تحدق في الأشياء وتحللها بطريقة مختلفة؟",
    image: "https://i.top4top.io/p_3692uc3fu2.png", 
    type: 'selection'
  },
  { 
    id: 2, 
    text: "هل تستمتع بتعلم مهارات جديدة، حتى لو لم تكن متأكداً من كيفية استخدامها؟",
    image: "https://j.top4top.io/p_3692m6d5k3.png",
    type: 'scale'
  },
  { 
    id: 3, 
    text: "هل تشعر برغبة قوية في التعبير عن أفكارك ومشاعرك بطريقة غير تقليدية؟",
    image: "https://k.top4top.io/p_3692xajpu4.png",
    type: 'selection'
  },
  { 
    id: 4, 
    text: "هل تلاحظ التفاصيل الصغيرة في محيطك، مثل الألوان أو الأنماط أو الأضواء؟",
    image: "https://l.top4top.io/p_3692uyx765.png",
    type: 'slider'
  },
  { 
    id: 5, 
    text: "متى كانت آخر مرة شعرت فيها بإلهام قوي دفعك لتبدع شيئاً ما، حتى لو كان بسيطاً؟",
    image: "https://a.top4top.io/p_3692esvkj6.png",
    type: 'selection',
    answers: [
      { id: 'always', label: "مؤخراً، أحاول دائماً." },
      { id: 'sometimes', label: "من وقت لآخر، لكن أجد صعوبة في الاستمرارية." },
      { id: 'rarely', label: "لا أتذكر، أشعر أنني عالق." }
    ]
  },
  { 
    id: 6, 
    text: "عندما تحاول أن ترسم أو تكتب، هل تجد عقلك مليئاً بالفوضى والأفكار المتشابكة؟",
    image: "https://b.top4top.io/p_3692r7p0h7.png",
    type: 'selection',
    answers: [
      { id: 'rarely', label: "لا، أكون مركزاً جداً." },
      { id: 'sometimes', label: "أحياناً، لكنني أستطيع السيطرة عليها." },
      { id: 'always', label: "نعم، دائماً." }
    ]
  },
  { 
    id: 7, 
    text: "إذا طلب منك أن تصف نفسك في لوحة فنية، فهل يمكنك أن تتخيل ألوانها، خطوطها، أو شكلها؟",
    image: "https://c.top4top.io/p_3692yfda68.png",
    type: 'selection',
    answers: [
      { id: 'always', label: "نعم، لدي فكرة واضحة." },
      { id: 'sometimes', label: "قد أحتاج وقتاً للتفكير." },
      { id: 'rarely', label: "لا، هذا صعب جداً." }
    ]
  },
  { 
    id: 8, 
    text: "عندما تشعر بالتوتر أو الحزن، هل تميل للبحث عن مخرج إبداعي (كالرسم، الكتابة، أو حتى الاستماع للموسيقى)؟",
    image: "https://d.top4top.io/p_369225bsu9.png",
    type: 'selection',
    answers: [
      { id: 'always', label: "نعم، هو ملاذي الأول." },
      { id: 'sometimes', label: "أحياناً، لكن لا أفكر فيه كحل دائم." },
      { id: 'rarely', label: "لا، أبحث عن حلول أخرى." }
    ]
  },
  { 
    id: 9, 
    text: "هل تشعر أن الألوان أو الأشكال أو حتى المساحات الفارغة لها تأثير على حالتك المزاجية؟",
    image: "https://e.top4top.io/p_3692r7erd10.png",
    type: 'selection',
    answers: [
      { id: 'always', label: "نعم، بشكل كبير." },
      { id: 'sometimes', label: "أحياناً، لكن لا أفكر في الأمر كثيراً." },
      { id: 'rarely', label: "لا، لا ألاحظ هذا الشيء." }
    ]
  },
  { 
    id: 10, 
    text: "ما الذي يمنعك من البدء في رحلتك الفنية الآن؟",
    image: "https://b.top4top.io/p_369292y941.png",
    type: 'selection',
    answers: [
      { id: 'always', label: "لا يوجد شيء يمنعني." },
      { id: 'sometimes', label: "قلة الوقت أو عدم معرفة من أين أبدأ." },
      { id: 'rarely', label: "اخاف من حكم الآخرين." }
    ]
  }
];

export const ANSWERS = [
  { id: 'always', label: 'نعم، دائمًا.' },
  { id: 'sometimes', label: 'أحيانًا.' },
  { id: 'rarely', label: 'نادرًا.' }
];

export const STORE_URL = "https://salla.sa/elhamk23";
export const PRODUCT_URL = "https://salla.sa/elhamk23/gyKVZmd";
export const LOGO_URL = "https://e.top4top.io/p_366949c1c1.png";
