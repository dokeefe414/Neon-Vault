export const $ = id => document.getElementById(id);

export function money(cents){
  return (Number(cents||0)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
}

export function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}

export function localDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export const DAY=86_400_000;

export function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
