"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronDown, MapPin, Menu, X, Phone, Flame, Navigation, CalendarDays, Users, Clock, MessageCircle, Check, Star, AlertCircle } from "lucide-react";
import { translations } from "./translations";

export default function Home() {
  const API_URL = "/api/google";

  const [lang, setLang] = useState<"tr" | "en">("tr");
  const t = translations[lang];

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"none" | "menu" | "reservation">("none");
  const [isScrolled, setIsScrolled] = useState(false); 

  const [formData, setFormData] = useState({ name: "", phone: "", date: "", time: "", guests: "2", notes: "", kvkk: false });
  const [botField, setBotField] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [minDate, setMinDate] = useState("");
  const [systemStatus, setSystemStatus] = useState("AÇIK");
  
  // Google Sheets'ten gelecek dinamik menü verisi
  const [dynamicMenu, setDynamicMenu] = useState<any[]>([]);
  
  // 10:00 ile 01:00 arasını 5 dakikalık dilimlere bölen liste oluşturucu
  const generateTimeOptions = () => {
    const times = [];
    for (let h = 10; h <= 23; h++) {
      for (let m = 0; m < 60; m += 10) {
        times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    times.push("00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45", "00:50", "00:55", "01:00");
    return times;
  };
  const timeOptions = generateTimeOptions();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const scrollTo = (id: string) => {
    setIsMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (activeModal !== "none" || isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [activeModal, isMenuOpen]);

  useEffect(() => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    setMinDate(localISOTime);
  }, []);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => { 
        if (data.status) setSystemStatus(data.status); 
        
        // Google'dan menü geldiyse kategorilere göre grupla
        if (data.menu && Array.isArray(data.menu)) {
          const grouped = data.menu.reduce((acc: any[], item: any) => {
            let categoryGroup = acc.find(g => g.category === item.category);
            if (!categoryGroup) {
              categoryGroup = { category: item.category, items: [] };
              acc.push(categoryGroup);
            }
            categoryGroup.items.push({
              name: item.name,
              desc: item.desc,
              price: item.price
            });
            return acc;
          }, []);
          setDynamicMenu(grouped);
        }
      })
      .catch(err => console.log("Veri çekilemedi."));
  }, []);

  const InstagramIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, ''); 
    if (val.length > 0 && val[0] !== '0') {
      val = '0' + val;
    }
    if (val.length > 11) {
      val = val.slice(0, 11);
    }
    setFormData({...formData, phone: val});
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (botField !== "") { setIsSuccess(true); return; }
    if (!formData.kvkk) { showToast(t.modal.formKvkk); return; }

    if (formData.phone.length !== 11 || !formData.phone.startsWith("05")) {
        showToast(t.modal.errPhone);
        return;
    }

    const selectedHour = parseInt(formData.time.split(':')[0], 10);
    const selectedMin = parseInt(formData.time.split(':')[1], 10);
    const isValidHour = (selectedHour >= 10 && selectedHour <= 23) || (selectedHour === 0) || (selectedHour === 1 && selectedMin === 0);
    if (!isValidHour) {
      showToast(t.modal.errHours);
      return;
    }

    const [year, month, day] = formData.date.split("-").map(Number);
    const selectedDateTime = new Date(year, month - 1, day, selectedHour, selectedMin);
    const currentDateTime = new Date();

    if (selectedDateTime <= currentDateTime) {
      showToast(t.modal.errPastTime);
      return;
    }

    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    try {
      const res = await fetch(API_URL, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(formData),
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId); 

      if (!res.ok) throw new Error("API Yanıt Vermedi");
      const data = await res.json();

      if (data.result === "error") {
        showToast(data.message || t.modal.errClosed);
      } else {
        setIsSuccess(true);
      }

    } catch (error: any) {
      if (error.name === "AbortError") {
        showToast(t.modal.errNetwork); 
      } else {
        showToast(t.modal.errDefault);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeReservationModal = () => {
    setActiveModal("none");
    setTimeout(() => { setIsSuccess(false); setFormData({ name: "", phone: "", date: "", time: "", guests: "2", notes: "", kvkk: false }); setBotField(""); }, 300);
  };

  // TypeScript tip hatasını önlemek için menü verisini render aşamasından önce hazırlıyoruz.
  const displayMenu = dynamicMenu.length > 0 ? dynamicMenu : (t.menuData as any[]);

  return (
    <main className="relative w-full min-h-screen bg-tandir-black selection:bg-tandir-gold selection:text-black font-inter overflow-x-hidden">
      
      <header className="fixed top-0 left-0 w-full p-6 z-50 flex justify-between items-center pointer-events-none">
        <div className="flex gap-4 text-xs font-inter tracking-[0.2em] pointer-events-auto mix-blend-difference text-white/70">
          <button onClick={() => setLang("tr")} className={`transition-colors ${lang === "tr" ? "text-white font-bold" : "hover:text-white"}`}>TR</button>
          <span>|</span>
          <button onClick={() => setLang("en")} className={`transition-colors ${lang === "en" ? "text-white font-bold" : "hover:text-white"}`}>EN</button>
        </div>

        <AnimatePresence>
          {isScrolled && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer"
              onClick={() => scrollTo("hero")}
            >
              <div className="bg-tandir-black/60 backdrop-blur-md p-2 md:p-3 rounded-full border border-white/10 shadow-[0_0_20px_rgba(217,160,91,0.15)] group">
                <div className="relative w-8 h-8 md:w-10 md:h-10">
                  <Image src="/logo.png" alt="Tandır Başa Dön" fill className="object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setIsMenuOpen(true)} className="pointer-events-auto text-white/80 hover:text-tandir-gold transition-colors bg-tandir-black/20 p-2 rounded-full backdrop-blur-sm">
          <Menu className="w-8 h-8" />
        </button>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: "100%" }} transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[60] bg-tandir-black/95 backdrop-blur-2xl flex flex-col justify-between"
          >
            <div className="p-6 flex justify-end">
              <button onClick={() => setIsMenuOpen(false)} className="text-white/50 hover:text-tandir-gold transition-colors p-2">
                <X className="w-10 h-10" />
              </button>
            </div>
            <nav className="flex flex-col items-center gap-10 flex-1 justify-center w-full">
              <button onClick={() => { setIsMenuOpen(false); setActiveModal("menu"); }} className="text-xl md:text-3xl font-playfair font-light tracking-[0.2em] uppercase text-white hover:text-tandir-gold hover:tracking-[0.25em] transition-all duration-500">
                {t.nav.menu}
              </button>
              <button onClick={() => { setIsMenuOpen(false); setActiveModal("reservation"); }} className="text-xl md:text-3xl font-playfair font-light tracking-[0.2em] uppercase text-white hover:text-tandir-gold hover:tracking-[0.25em] transition-all duration-500">
                {t.nav.reservation}
              </button>
              <button onClick={() => scrollTo("imza-tabaklar")} className="text-xl md:text-3xl font-playfair font-light tracking-[0.2em] uppercase text-white hover:text-tandir-gold hover:tracking-[0.25em] transition-all duration-500">
                {t.nav.signature}
              </button>
              <button onClick={() => scrollTo("atesin-ritueli")} className="text-xl md:text-3xl font-playfair font-light tracking-[0.2em] uppercase text-white hover:text-tandir-gold hover:tracking-[0.25em] transition-all duration-500">
                {t.nav.roots}
              </button>
              <button onClick={() => scrollTo("mekana-davet")} className="text-xl md:text-3xl font-playfair font-light tracking-[0.2em] uppercase text-white hover:text-tandir-gold hover:tracking-[0.25em] transition-all duration-500">
                {t.nav.contact}
              </button>
            </nav>
            <div className="p-10 flex flex-col items-center gap-6 border-t border-white/5 w-full">
              <a href="https://www.instagram.com/tandirbatman/" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-tandir-gold hover:text-white transition-colors">
                <InstagramIcon className="w-6 h-6" />
                <span className="text-sm tracking-widest uppercase">{t.nav.followUs}</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section id="hero" className="relative w-full h-[100svh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video autoPlay loop muted playsInline poster="/hero-fallback.webp" className="w-full h-full object-cover opacity-50">
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-tandir-black via-tandir-black/50 to-transparent"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} className="w-full relative aspect-square max-w-[280px] md:max-w-[320px] mb-12">
            <Image src="/logo.png" alt="Tandır Şehrin Gurme Mutfağı" fill className="object-contain drop-shadow-2xl" priority />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="flex flex-col gap-4 w-full items-center">
            <button onClick={() => setActiveModal("reservation")} className="w-full py-4 px-8 bg-tandir-gold text-tandir-black font-inter font-bold text-sm tracking-[0.2em] uppercase rounded-sm shadow-[0_0_20px_rgba(217,160,91,0.15)] hover:bg-white transition-colors duration-300">
              {t.hero.bookTable}
            </button>
            <button onClick={() => setActiveModal("menu")} className="group relative w-full py-4 px-8 bg-transparent overflow-hidden border border-tandir-gold rounded-sm text-tandir-gold font-inter font-medium text-sm tracking-[0.2em] uppercase transition-all duration-500">
              <span className="relative z-10 group-hover:text-tandir-black transition-colors duration-500">{t.hero.viewMenu}</span>
              <div className="absolute inset-0 bg-tandir-gold translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0"></div>
            </button>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 cursor-pointer" onClick={() => scrollTo("imza-tabaklar")}>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
            <ChevronDown className="text-white/30 w-6 h-6" />
          </motion.div>
        </motion.div>
      </section>

      <section id="imza-tabaklar" className="relative z-20 w-full bg-tandir-black pt-28 pb-16 border-t border-white/5">
        <div className="px-6 md:px-12 mb-14 flex flex-col items-center md:items-start text-center md:text-left">
          <span className="text-tandir-fire font-inter text-sm tracking-[0.4em] uppercase mb-4 block font-semibold drop-shadow-md">
            {t.signature.subtitle}
          </span>
          <h2 className="text-5xl md:text-7xl font-playfair font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#d9a05b] via-[#f3d39a] to-[#c78b53] drop-shadow-2xl pb-2">
            {t.signature.title}
          </h2>
          <div className="w-24 h-[2px] bg-gradient-to-r from-tandir-gold to-transparent mt-6 mb-4"></div>
          <p className="text-white/50 text-sm font-light">{t.signature.desc}</p>
        </div>

        <div className="w-full overflow-x-auto flex gap-6 px-6 md:px-12 pb-10 snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
          
          {t.signatureDishes.map((item: any) => (
            <div key={item.id} className="min-w-[80vw] sm:min-w-[320px] snap-center group cursor-pointer shrink-0">
              <div className="w-full aspect-[4/5] bg-tandir-dark rounded-sm overflow-hidden relative mb-4 border border-white/5 group-hover:border-tandir-gold/30 transition-colors duration-500">
                <Image src={`/${item.img}`} alt={item.name} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-tandir-black/90 via-transparent to-transparent z-10 pointer-events-none"></div>
              </div>
              <h3 className="text-xl font-playfair text-white mb-2 group-hover:text-tandir-gold transition-colors">{item.name}</h3>
              <p className="text-sm font-light text-white/50 mb-3 truncate">{item.desc}</p>
              <span className="text-tandir-copper font-medium">{item.price}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="atesin-ritueli" className="relative w-full bg-tandir-dark py-32 px-6 border-y border-white/5 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none whitespace-nowrap">
          <span className="font-playfair text-[25vw] md:text-[15rem] font-bold text-tandir-gold">RİTÜEL</span>
        </div>
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <Flame className="w-16 h-16 text-tandir-fire/60 mb-8" />
          <h2 className="text-sm tracking-[0.4em] text-tandir-gold uppercase mb-10">{t.roots.subtitle}</h2>
          <p className="font-playfair text-2xl md:text-4xl text-white/90 leading-relaxed md:leading-snug italic mb-8">
            {t.roots.quote}
          </p>
          <p className="font-inter font-light text-white/50 text-sm md:text-base leading-loose max-w-2xl">
            {t.roots.desc}
          </p>
        </div>
      </section>

      <section id="mekana-davet" className="relative w-full bg-tandir-black pt-32 pb-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col text-center items-center">
          
          <div className="flex flex-col items-center mb-16">
            <span className="text-tandir-copper font-inter text-sm tracking-[0.5em] uppercase mb-4 block font-medium">{t.contact.subtitle}</span>
            <h2 className="text-5xl md:text-7xl font-playfair font-light tracking-[0.1em] text-white drop-shadow-lg">
              {t.contact.title}
            </h2>
            <div className="w-16 h-[1px] bg-tandir-gold/50 mt-8"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full mb-20 border-y border-white/5 py-16">
            <div className="flex flex-col items-center gap-4">
              <MapPin className="w-8 h-8 text-tandir-gold mb-2 opacity-80" />
              <h3 className="font-playfair text-xl text-tandir-gold tracking-[0.2em] uppercase font-light">{t.contact.location}</h3>
              <p className="text-white/60 font-inter font-light text-sm leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: t.contact.locationDesc }}></p>
              <a href="https://maps.google.com/?q=TANDIR+Restoran+güney+life+Gültepe+5351+sokak+No+2A" target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-tandir-copper hover:text-white text-xs tracking-widest uppercase transition-colors">
                <Navigation className="w-4 h-4" /> {t.contact.mapBtn}
              </a>
            </div>
            
            <div className="flex flex-col items-center gap-4 border-y md:border-y-0 md:border-l border-white/5 py-12 md:py-0">
              <Clock className="w-8 h-8 text-tandir-gold mb-2 opacity-80" />
              <h3 className="font-playfair text-xl text-tandir-gold tracking-[0.2em] uppercase font-light">{t.hours.title}</h3>
              <div className="text-white/60 font-inter font-light text-sm leading-relaxed mt-2 text-center">
                <p>{t.hours.weekdays}</p>
                <p className="mt-1">{t.hours.weekends}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 border-b md:border-b-0 md:border-l border-white/5 pb-12 md:pb-0">
              <Phone className="w-8 h-8 text-tandir-gold mb-2 opacity-80" />
              <h3 className="font-playfair text-xl text-tandir-gold tracking-[0.2em] uppercase font-light">{t.contact.contact}</h3>
              <p className="text-white/60 font-inter font-light text-sm leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: t.contact.contactDesc }}></p>
              <a href="tel:05526020672" className="mt-4 text-xl md:text-2xl font-playfair italic text-white hover:text-tandir-gold transition-colors tracking-widest">
                0552 602 06 72
              </a>
            </div>
            <div className="flex flex-col items-center gap-4 md:border-l border-white/5">
              <InstagramIcon className="w-8 h-8 text-tandir-gold mb-2 opacity-80" />
              <h3 className="font-playfair text-xl text-tandir-gold tracking-[0.2em] uppercase font-light">{t.contact.social}</h3>
              <p className="text-white/60 font-inter font-light text-sm leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: t.contact.socialDesc }}></p>
              <a href="https://www.instagram.com/tandirbatman/" target="_blank" rel="noreferrer" className="mt-4 text-tandir-copper hover:text-white text-xs tracking-widest uppercase transition-colors">
                @tandirbatman
              </a>
            </div>
          </div>
          <div className="w-full flex flex-col md:flex-row justify-between items-center text-[10px] text-white/30 uppercase tracking-[0.2em] mt-16 pt-8 border-t border-white/5">
            <p>{t.contact.rights}</p>
            <a 
              href="https://www.yildizworks.com/" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-2 hover:text-tandir-gold transition-colors mt-6 md:mt-0 group"
            >
              <Star className="w-3.5 h-3.5 text-tandir-gold fill-tandir-gold/50 group-hover:fill-tandir-gold transition-colors" />
              {t.contact.madeBy}
            </a>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {activeModal === "menu" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[70] bg-tandir-black/95 backdrop-blur-xl flex justify-center items-start overflow-y-auto p-4 md:p-10"
          >
            <div className="w-full max-w-4xl bg-[#151515] rounded-md border border-tandir-gold/20 relative my-auto p-6 md:p-14 shadow-[0_0_50px_rgba(217,160,91,0.05)] overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[200px] bg-tandir-gold/5 blur-[100px] pointer-events-none"></div>
              <button onClick={() => setActiveModal("none")} className="absolute top-6 right-6 md:top-8 md:right-8 text-white/50 hover:text-tandir-gold transition-colors z-20">
                <X className="w-8 h-8" />
              </button>
              <div className="text-center mb-16 relative z-10">
                <span className="text-tandir-copper font-inter text-xs tracking-[0.4em] uppercase mb-4 block">{t.modal.menuSubtitle}</span>
                <h2 className="text-4xl md:text-5xl font-playfair text-tandir-gold">{t.modal.menuTitle}</h2>
                <div className="w-24 h-[1px] bg-tandir-gold/30 mx-auto mt-8"></div>
              </div>
              <div className="flex flex-col gap-16 relative z-10">
                
                {displayMenu.map((category: any, idx: number) => (
                  <div key={idx} className="w-full">
                    <h3 className="text-2xl font-playfair text-white mb-8 flex items-center gap-6">
                      {category.category}
                      <span className="flex-1 h-[1px] bg-white/10"></span>
                    </h3>
                    <div className="flex flex-col gap-8">
                      {category.items.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col">
                          <div className="flex justify-between items-end gap-4 mb-2">
                            <span className="font-playfair text-lg md:text-xl text-white/90">{item.name}</span>
                            <span className="flex-1 border-b border-dotted border-white/20 mb-2"></span>
                            <span className="font-inter font-medium text-tandir-gold whitespace-nowrap">
  {item.price.toString().includes("₺") || item.price.toString().toLowerCase().includes("tl") 
    ? item.price 
    : `${item.price} ₺`}
</span>
                          </div>
                          <span className="font-light font-inter text-sm text-white/40">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === "reservation" && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} transition={{ duration: 0.3 }} 
            className="fixed inset-0 z-[70] bg-tandir-black/95 backdrop-blur-xl flex justify-center items-start overflow-y-auto p-4 md:p-10"
          >
            <div className="w-full max-w-2xl bg-[#151515] rounded-md border border-tandir-gold/20 relative my-auto p-6 md:p-12 shadow-[0_0_50px_rgba(217,160,91,0.05)] overflow-hidden">
              <button onClick={closeReservationModal} className="absolute top-6 right-6 md:top-8 md:right-8 text-white/50 hover:text-tandir-gold transition-colors z-20">
                <X className="w-8 h-8" />
              </button>
              
              {!isSuccess ? (
                <>
                  <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-playfair text-tandir-gold mb-4">{t.modal.resTitle}</h2>
                    <p className="text-white/50 font-light text-sm">{t.modal.resDesc}</p>
                    
                    <div className="mt-6 inline-block bg-white/5 border border-white/10 rounded-sm px-6 py-3">
                      <p className="text-tandir-gold text-xs tracking-widest uppercase mb-1">{t.hours.title}</p>
                      <p className="text-white/60 text-xs font-light">{t.hours.weekdays} | {t.hours.weekends}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <a href="tel:05526020672" className="flex items-center justify-center gap-3 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-white transition-colors">
                      <Phone className="w-5 h-5 text-tandir-gold" />
                      <span className="font-medium tracking-widest text-sm uppercase">{t.modal.callNow}</span>
                    </a>
                    <a href="https://wa.me/905526020672" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 py-4 px-6 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-sm text-white transition-colors">
                      <MessageCircle className="w-5 h-5 text-[#25D366]" />
                      <span className="font-medium tracking-widest text-sm uppercase">{t.modal.whatsapp}</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-4 mb-10 opacity-70">
                    <span className="flex-1 h-[1px] bg-tandir-gold/30"></span>
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-tandir-gold">{t.modal.orOnline}</span>
                    <span className="flex-1 h-[1px] bg-tandir-gold/30"></span>
                  </div>

                  {systemStatus === "AÇIK" ? (
                    <form onSubmit={handleReservationSubmit} className="flex flex-col gap-6 relative">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-white/50 uppercase tracking-widest">{t.modal.formName}</label>
                          <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-tandir-gold transition-colors" placeholder={t.modal.formName} />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-white/50 uppercase tracking-widest">{t.modal.formPhone}</label>
                          <input type="tel" required value={formData.phone} onChange={handlePhoneChange} className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-tandir-gold transition-colors" placeholder="05XX XXX XX XX" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-2"><CalendarDays className="w-3 h-3"/> {t.modal.formDate}</label>
                          <input type="date" required min={minDate} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-tandir-gold transition-colors [color-scheme:dark]" />
                        </div>
                        <div className="flex grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2 w-1/2">
                            <label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3"/> {t.modal.formTime}</label>
                            
                            <select required value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-tandir-gold transition-colors appearance-none">
  <option value="" disabled className="bg-tandir-black">Seçiniz</option>
  {timeOptions.map((time) => (
    <option key={time} value={time} className="bg-tandir-black">{time}</option>
  ))}
</select>
                          </div>
                          <div className="flex flex-col gap-2 w-1/2">
                            <label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-2"><Users className="w-3 h-3"/> {t.modal.formGuests}</label>
                            <select value={formData.guests} onChange={(e) => setFormData({...formData, guests: e.target.value})} className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-tandir-gold transition-colors appearance-none">
                              {[1,2,3,4,5,6,7,8,"9+"].map(num => <option key={num} value={num} className="bg-tandir-black">{num}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest">{t.modal.formNotes}</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-tandir-gold transition-colors resize-none" placeholder={t.modal.notesPlaceholder} />
                      </div>

                      <div className="flex items-start gap-3 mt-2">
                        <input 
                          type="checkbox" 
                          id="kvkk" 
                          required 
                          checked={formData.kvkk}
                          onChange={(e) => setFormData({...formData, kvkk: e.target.checked})}
                          className="mt-1 min-w-[1rem] w-4 h-4 accent-tandir-gold bg-tandir-dark border-white/20 rounded-sm cursor-pointer" 
                        />
                        <label htmlFor="kvkk" className="text-[10px] md:text-xs text-white/50 text-left leading-relaxed font-light cursor-pointer select-none">
                          {t.modal.formKvkk}
                        </label>
                      </div>

                      <button type="submit" disabled={isSubmitting || !formData.kvkk} className="mt-2 w-full py-4 bg-tandir-gold text-tandir-black font-inter font-bold text-sm tracking-[0.2em] uppercase rounded-sm shadow-[0_0_20px_rgba(217,160,91,0.15)] hover:bg-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? t.modal.submittingBtn : t.modal.submitBtn}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-8 p-8 border border-white/10 bg-white/5 rounded-sm text-center flex flex-col items-center">
                      <CalendarDays className="w-10 h-10 text-tandir-gold mb-4 opacity-80" />
                      <h3 className="text-tandir-gold font-playfair text-2xl mb-3">{t.modal.closedTitle}</h3>
                      <p className="text-white/60 font-light text-sm leading-relaxed max-w-sm">
                        {t.modal.closedDesc1}
                      </p>
                      <p className="text-white/80 font-light text-sm leading-relaxed max-w-sm mt-4">
                        {t.modal.closedDesc2}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center gap-4 py-12">
                  <div className="w-20 h-20 bg-tandir-gold/10 rounded-full flex items-center justify-center mb-4 border border-tandir-gold/20">
                    <Check className="w-10 h-10 text-tandir-gold" />
                  </div>
                  <h3 className="text-3xl font-playfair text-white">{t.modal.successTitle}</h3>
                  <p className="text-white/60 font-light text-base leading-relaxed max-w-sm mt-2">
                    {t.modal.successDesc}
                  </p>
                  <button onClick={closeReservationModal} className="mt-8 px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-sm text-xs tracking-widest uppercase transition-colors border border-white/10">
                    {t.modal.closeBtn}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#151515] border border-tandir-gold/30 px-6 py-4 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-4 min-w-[320px] max-w-[90vw]"
          >
            <AlertCircle className="w-5 h-5 text-tandir-gold shrink-0" />
            <span className="text-white/90 font-light text-sm font-inter flex-1">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-white/50 hover:text-tandir-gold transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}