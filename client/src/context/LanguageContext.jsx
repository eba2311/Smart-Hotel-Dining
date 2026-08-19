import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    search: 'Search dishes...',
    all: 'All',
    recommended: 'Recommended',
    priceLow: 'Price ↑',
    priceHigh: 'Price ↓',
    lowCal: 'Low Cal',
    fastest: 'Fastest',
    popular: '🔥 Popular',
    aiPicks: 'AI Picks for You',
    mostLoved: '🔥 Most Loved Dishes',
    orders: 'orders',
    addToCart: 'Add to Cart',
    cart: 'Cart',
    checkout: 'Checkout',
    order: 'Order',
    service: 'Service',
    food: 'Food',
    viewReceipt: 'View Receipt',
    rateExperience: 'Rate Experience',
    subtotal: 'Subtotal',
    tax: 'Tax (15%)',
    total: 'Total',
    tip: 'Add a Tip',
    splitBill: 'Split Bill',
    splitEqual: 'Equal Split',
    splitByItems: 'By Items',
    people: 'People',
    perPerson: 'per person',
    noItems: 'No dishes match your search.',
    clearFilters: 'Clear filters',
    emptyCart: 'Your cart is empty',
    emptyCartSub: 'Add some delicious dishes first!',
    browseMenu: 'Browse Menu',
    placedAt: 'Placed at',
    items: 'Items',
    placeOrder: 'Place Order',
    pay: 'Pay',
    backToMenu: '← Back to menu',
    selectAllergens: 'My Allergies & Preferences',
    allergenWarning: 'Contains:',
    minutes: 'min',
    kcal: 'kcal',
    noTip: 'No tip',
    custom: 'Custom',
  },
  am: {
    search: 'ምግብ ፈልግ...',
    all: 'ሁሉም',
    recommended: 'የተመከረ',
    priceLow: 'ዋጋ ↑',
    priceHigh: 'ዋጋ ↓',
    lowCal: 'ቅ掮 ካሎሪ',
    fastest: 'በፍጥነት',
    popular: '🔥 በጣም ተወዳጅ',
    aiPicks: 'ለእርስዎ AI ምርጫ',
    mostLoved: '🔥 በጣም ተወዳጅ ምግቦች',
    orders: 'የትዕዛዝ',
    addToCart: 'ከርታ ይጨምር',
    cart: 'ከርታ',
    checkout: 'ክፍያ',
    order: 'ትዕዛዝ',
    service: 'አገልግሎት',
    food: 'ምግብ',
    viewReceipt: 'ደብዳቤ ይመልከት',
    rateExperience: 'ተሞክሮ ይስጠው',
    subtotal: 'ንዑስ ድምር',
    tax: 'ግብር (15%)',
    total: 'ጠቅላላ',
    tip: 'ምንጭ ይጨምር',
    splitBill: 'ቤቱን ይክፈል',
    splitEqual: 'በማጠቃለያ ይክፈል',
    splitByItems: 'በምግብ',
    people: 'ሰዎች',
    perPerson: 'ለአንድ ሰው',
    noItems: 'ምግቦች አይተኙም።',
    clearFilters: 'ማጣሪያ ያጽዱ',
    emptyCart: 'ከርታዎ ባዶ ነው',
    emptyCartSub: 'መጀመሪያ ጣፋጭ ምግቦች ያክሉ!',
    browseMenu: 'ምግብ ይመልከቱ',
    placedAt: 'የተቀመጠበት',
    items: 'ምግቦች',
    placeOrder: 'ትዕዛዝ ያድርግ',
    pay: 'ይክፈል',
    backToMenu: '← ወደ ምግብ ተመለስ',
    selectAllergens: 'የእኔ አለርጂ እና ምርጫዎች',
    allergenWarning: 'ያካትታል:',
    minutes: 'ደቂቃ',
    kcal: 'ካሎሪ',
    noTip: 'ምንጭ የለም',
    custom: 'የተለየ',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('sh_lang') || 'en'; } catch { return 'en'; }
  });

  const toggle = () => {
    const next = lang === 'en' ? 'am' : 'en';
    setLang(next);
    try { localStorage.setItem('sh_lang', next); } catch {}
  };

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
