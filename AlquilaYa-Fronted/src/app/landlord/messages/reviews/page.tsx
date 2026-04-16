'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LANDLORD_REVIEWS } from '@/mocks/landlord';
import { cn } from '@/utils/cn';

export default function LandlordReviewsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">Reputación y Reseñas</h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">Lo que los estudiantes opinan sobre tu hospitalidad.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-on-surface/5 border-none p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-black text-blue-500">4.8</p>
          <div className="flex gap-1 my-2">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className="material-symbols-outlined text-blue-500 text-[20px]">star</span>
            ))}
          </div>
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Calificación Media</p>
        </Card>
        
        <Card className="bg-on-surface/5 border-none p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-black text-orange-500">12</p>
          <div className="flex gap-1 my-2">
            <span className="material-symbols-outlined text-orange-500 text-[20px]">reviews</span>
          </div>
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Reseñas Totales</p>
        </Card>

        <Card className="bg-blue-500 p-6 flex flex-col items-center justify-center text-center text-white">
          <p className="text-sm font-black uppercase tracking-[0.2em] mb-2">Estado Pro</p>
          <p className="text-xs font-medium opacity-80 leading-relaxed">¡Felicidades! Estás en el 5% superior de arrendadores por tu velocidad de respuesta.</p>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-md font-black tracking-tight opacity-80">Comentarios Recientes</h3>
        <div className="space-y-6">
          {LANDLORD_REVIEWS.map((review) => (
            <Card key={review.id} variant="surface" className="border border-on-surface/5 bg-white/40 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-on-surface/10 flex items-center justify-center text-sm font-black">
                    {review.studentName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-on-surface/90 text-sm leading-none">{review.studentName}</h4>
                    <p className="text-[10px] text-on-surface-variant font-bold mt-1 opacity-70 italic">{review.roomName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-on-surface/5 px-3 py-1 rounded-full">
                  <span className="text-[12px] font-black text-blue-500">{review.rating}</span>
                  <span className="material-symbols-outlined text-blue-500 text-[14px]">star</span>
                </div>
              </div>
              
              <p className="text-sm text-on-surface/80 font-medium leading-relaxed italic border-l-2 border-on-surface/10 pl-4 py-1">
                "{review.comment}"
              </p>

              {review.reply ? (
                <div className="ml-10 bg-blue-500/5 rounded-2xl p-4 border border-blue-500/10">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Tu Respuesta</p>
                  <p className="text-[12px] text-on-surface-variant font-medium opacity-80 leading-relaxed italic">{review.reply}</p>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-blue-500 font-black text-[10px] uppercase tracking-wider">Responder comentario</Button>
                </div>
              )}

              <p className="text-[9px] text-on-surface/20 font-black uppercase tracking-[0.2em] text-right">{review.date}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
