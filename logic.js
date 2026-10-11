(function(root){
  'use strict';
  function isoDate(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function parseDate(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return null;
    const [y,m,d]=value.split('-').map(Number), date=new Date(Date.UTC(y,m-1,d));
    return y>=1900&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null;
  }
  function addDays(value,days=1) { const date=parseDate(value);if(!date)return '';date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10); }
  function nights(arrival,departure) { const a=parseDate(arrival),d=parseDate(departure);return a&&d?Math.round((d-a)/86400000):0; }
  function validateDates(data,today=isoDate()) {
    const errors={};
    if(!parseDate(data.arrival))errors.arrival='Choose a valid arrival date.';
    else if(data.arrival<today)errors.arrival='Choose today or a future arrival date.';
    if(!parseDate(data.departure))errors.departure='Choose a valid departure date.';
    else if(parseDate(data.arrival)&&data.departure<=data.arrival)errors.departure='Departure must be after arrival.';
    if(!['1','2','3','4'].includes(String(data.guests)))errors.guests='Choose between one and four guests.';
    return errors;
  }
  function validateDetails(data) {
    const errors={},name=(data.name||'').trim(),email=(data.email||'').trim();
    if(name.length<2||name.length>80)errors.guestName='Enter your name (2–80 characters).';
    if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.guestEmail='Enter a valid email address.';
    return errors;
  }
  function formatDate(value) { const date=parseDate(value);return date?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date):''; }
  function summary(data) { const n=nights(data.arrival,data.departure);return `${formatDate(data.arrival)} – ${formatDate(data.departure)} · ${n} ${n===1?'night':'nights'}`; }
  function planText(data) { return `SOLIS RETREAT\nA little room to be.\n\nSAMPLE STAY PLAN — DEMO ONLY\n\nPrepared for: ${data.name.trim()}\nDates: ${summary(data)}\nGuests: ${data.guests}\nYour rhythm: ${data.interest}\n\nA suggested day\nDawn: An unhurried breakfast and time by the water.\nDay: ${data.interest==='Gentle movement'?'A gentle stretch and a slow walk.':data.interest==='Time outdoors'?'A walk among the trees and an afternoon outside.':data.interest==='Quiet time'?'A quiet corner, a book, and time to yourself.':'A little movement, a little exploring, and plenty of space.'}\nDusk: A seasonal meal and an easy evening.\n\nThis is a fictional design concept. No availability has been checked, no reservation or payment has been made, and no personal details have been sent or saved.\n`; }
  const api={isoDate,parseDate,addDays,nights,validateDates,validateDetails,formatDate,summary,planText};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SolisLogic=api;
})(typeof window!=='undefined'?window:globalThis);
