export function pad(n){
  return String(n).padStart(2,'0');
}

export function formatFecha(fecha){
  if(!fecha) return '';
  // Date object
  if(fecha instanceof Date && !isNaN(fecha.getTime())){
    return pad(fecha.getDate()) + '/' + pad(fecha.getMonth() + 1);
  }
  const s = String(fecha).trim();
  if(!s) return '';
  // ISO-like: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if(isoMatch) return pad(Number(isoMatch[3])) + '/' + pad(Number(isoMatch[2]));

  // Slash-separated e.g. DD/MM/YYYY or YYYY/MM/DD
  if(s.includes('/')){
    const parts = s.split('/').map(p => p.trim());
    if(parts.length >= 3){
      if(parts[0].length === 4){ // YYYY/MM/DD
        return pad(Number(parts[2])) + '/' + pad(Number(parts[1]));
      }
      // assume DD/MM/YYYY
      return pad(Number(parts[0])) + '/' + pad(Number(parts[1]));
    }
  }

  // Pure digits cases: YYYYMMDD, DDMMYYYY, YYMMDD
  const digits = s.replace(/[^0-9]/g,'');
  if(/^\d{8}$/.test(digits)){
    const first4 = Number(digits.substring(0,4));
    if(first4 >= 1900) { // YYYYMMDD
      return pad(Number(digits.substring(6,8))) + '/' + pad(Number(digits.substring(4,6)));
    }
    // assume DDMMYYYY
    return pad(Number(digits.substring(0,2))) + '/' + pad(Number(digits.substring(2,4)));
  }
  if(/^\d{6}$/.test(digits)){
    // YYMMDD -> take last two as day
    return pad(Number(digits.substring(4,6))) + '/' + pad(Number(digits.substring(2,4)));
  }

  // If contains space and time, try take first token
  const token = s.split(' ')[0];
  const tokenIso = token.match(/(\d{4})-(\d{2})-(\d{2})/);
  if(tokenIso) return pad(Number(tokenIso[3])) + '/' + pad(Number(tokenIso[2]));

  // Fallback: try to parse as Date
  const d = new Date(s);
  if(!isNaN(d.getTime())) return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);

  return '';
}

export function formatHora(h){
  if(!h) return '';
  try{
    if(typeof h === 'string' && h.length >= 5) return h.substring(0,5);
    const d = new Date('1970-01-01T' + h);
    if(!isNaN(d.getTime())) return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }catch(e){}
  return '';
}


export function parseToDate(fecha){
    if(!fecha) return null;
    if(fecha instanceof Date && !isNaN(fecha.getTime())) return fecha;
    const s = String(fecha).trim();
    if(!s) return null;
    // ISO YYYY-MM-DD
    const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if(iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    // Slash formats
    if(s.includes('/')){
        const parts = s.split('/').map(p=>p.trim());
        if(parts.length >= 3){
            if(parts[0].length === 4){ // YYYY/MM/DD
                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            }
            // assume DD/MM/YYYY
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
    }
    // Digits: YYYYMMDD or DDMMYYYY or YYMMDD
    const digits = s.replace(/[^0-9]/g,'');
    if(/^\d{8}$/.test(digits)){
        const first4 = Number(digits.substring(0,4));
        if(first4 >= 1900) return new Date(first4, Number(digits.substring(4,6)) - 1, Number(digits.substring(6,8)));
        // DDMMYYYY
        return new Date(Number(digits.substring(4,8)), Number(digits.substring(2,4)) - 1, Number(digits.substring(0,2)));
    }
    if(/^\d{6}$/.test(digits)){
        // YYMMDD
        const yy = Number(digits.substring(0,2));
        const year = yy > 50 ? 1900 + yy : 2000 + yy;
        return new Date(year, Number(digits.substring(2,4)) - 1, Number(digits.substring(4,6)));
    }
    // Last resort
    const d = new Date(s);
    if(!isNaN(d.getTime())) return d;
    return null;
}
