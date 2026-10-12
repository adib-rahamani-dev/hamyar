export const demoRooms = [
  {
    id: "math",
    name: "ریاضی؛ یک قدم جلوتر",
    group: "پایه نهم · کلاس ۹/۱",
    teacher: "سارا احمدی",
    initials: "سا",
    time: "۱۰:۰۰",
    duration: "۶۰ دقیقه",
    members: 24,
    live: true,
    topic: "معادله‌ها و دنیای آن‌ها",
    color: "green",
  },
  {
    id: "science",
    name: "آزمایشگاه علوم",
    group: "پایه هشتم · کلاس ۸/۲",
    teacher: "علی رضایی",
    initials: "عر",
    time: "۱۱:۳۰",
    duration: "۴۵ دقیقه",
    members: 20,
    live: false,
    topic: "از ایده تا تجربه",
    color: "purple",
  },
  {
    id: "literature",
    name: "در مسیر واژه‌ها",
    group: "پایه هفتم · کلاس ۷/۱",
    teacher: "مریم کریمی",
    initials: "مک",
    time: "۱۳:۰۰",
    duration: "۶۰ دقیقه",
    members: 18,
    live: false,
    topic: "فارسی و ادبیات",
    color: "amber",
  },
] as const;

export const demoPeople = [
  {
    name: "سارا احمدی",
    initials: "سا",
    role: "معلم و میزبان",
    group: "ریاضی · پایه نهم",
    color: "green",
  },
  {
    name: "علی رضایی",
    initials: "عر",
    role: "معلم و میزبان",
    group: "علوم · پایه هشتم",
    color: "purple",
  },
  {
    name: "مریم کریمی",
    initials: "مک",
    role: "معلم و میزبان",
    group: "فارسی · پایه هفتم",
    color: "amber",
  },
  {
    name: "نیلوفر موسوی",
    initials: "نم",
    role: "سوپروایزر",
    group: "تمام اتاق‌های مدرسه",
    color: "green",
  },
] as const;

export const faNumber = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);
