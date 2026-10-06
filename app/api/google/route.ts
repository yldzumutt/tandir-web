import { NextResponse } from 'next/server';

// Mevcut /exec linkini buraya yapıştır
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxE6LKWzAkDweZbiFwobbs3_EgyMlZsoXojS-a15hfLN8gvmik6FepQQsryuq6B30vKA/exec";

export async function POST(request: Request) {
  try {
    const body = await request.text(); 
    console.log("1. Vercel'den Google'a giden veri:", body);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'text/plain', 
      },
      redirect: "follow",
      cache: 'no-store' 
    });
    
    // Google'ın cevabını önce düz metin olarak alıyoruz ki HTML hatası verdiyse görebilelim
    const responseText = await response.text();
    console.log("2. Google'dan dönen ham cevap:", responseText);

    try {
      // Eğer Google sorunsuz çalıştıysa bu metin JSON'a çevrilebilir
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (parseError) {
      // JSON'a çevrilemiyorsa Google bizi engellemiş demektir!
      console.error("3. KRİTİK HATA: Google JSON yerine HTML hata sayfası döndürdü!");
      return NextResponse.json({ result: "error", message: "Google yetki veya format hatası." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("API Çöktü:", error);
    return NextResponse.json({ result: "error", message: "Sunucu bağlantısı koptu." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, { cache: 'no-store', redirect: "follow" });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ status: "AÇIK" }, { status: 200 });
  }
}