import type { CardConfig } from "../types/card";

export const DEFAULT_CARD_CONFIG: CardConfig = {
  version: 3,
  passcode: "2111",
  anniversaryLabel: "21 · 11",
  envelopeSubtitle: "Dành tặng người anh thương",
  title: "Gửi em — Kỷ niệm 21/11",
  salutation: "Gửi em,",
  typedBody: `Chắc đây là bức thư đầu tiên anh viết cho ai đó. Cảm ơn em đã thương anh, anh thương em rất nhiều. Mới thoáng cái đã 2 năm.

Thành phố này quá ồn ào với anh, chỉ có em là âm thanh khiến anh dễ chịu. Anh muốn mình bên nhau đến hết đời, anh muốn mình có một mái ấm ở một nơi yên bình, anh muốn mỗi buổi sáng người đầu tiên anh nhìn thấy là em.

Chẳng dám mong đời quá dễ dàng, chỉ mong em luôn bình an. Khó khăn đến rồi sẽ đi. Mạnh mẽ đôi khi là chấp nhận - chấp nhận mình cũng chỉ là một con người nhỏ bé, kiên trì bước tiếp.

Anh mong sau này dù cuộc đời có thế nào, mình vẫn luôn hướng về nhau.`,
  signOff: "Anh nhớ em ♡",
  senderSignature: "21 · 11",
  letterMode: "handwriting",
  inkSettings: {
    sensitivity: 56,
    inkWeight: 60,
    removeLines: true,
    inkColor: "velvet",
    rotation: 0,
    cropMargin: 0,
  },
  handwrittenPages: [
    {
      id: "real-letter-1",
      label: "Trang 1",
      rawSrc: "/letters/real-letter-ink.webp",
      extractedDataUrl: "/letters/real-letter-ink.webp",
    },
  ],
  memories: [
    {
      id: "memory-1",
      src: "/memories/photo-1.jpg",
      caption: "Những khoảnh khắc nhí nhố cùng nhau",
      date: "21 · 11",
    },
    {
      id: "memory-2",
      src: "/memories/photo-2.jpg",
      caption: "Cùng nhau đi qua những buổi chiều lộng gió",
      date: "Kỷ niệm",
    },
    {
      id: "memory-3",
      src: "/memories/photo-3.jpg",
      caption: "Dịu dàng nhất là khi có em trong vòng tay",
      date: "21 · 11",
    },
    {
      id: "memory-4",
      src: "/memories/photo-4.jpg",
      caption: "Những ngày cười vui hết mình bên nhau",
      date: "Kỷ niệm",
    },
    {
      id: "memory-5",
      src: "/memories/photo-5.jpg",
      caption: "Và vẫn luôn hướng về cùng một phía như thế",
      date: "21 · 11",
    },
  ],
  audioSrc: "/audio/romantic-bgm.wav",
};
