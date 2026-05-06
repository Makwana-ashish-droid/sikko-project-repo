const DIGITS = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const TEENS = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const SCALE = ['','thousand','lakh','crore'];

function segmentNumber(num) {
  const segments = [];
  segments.push(num % 1000);
  num = Math.floor(num / 1000);
  while (num > 0) {
    segments.push(num % 100);
    num = Math.floor(num / 100);
  }
  return segments;
}

function twoDigitToWords(num) {
  if (num < 10) return DIGITS[num];
  if (num < 20) return TEENS[num - 10];
  const tens = Math.floor(num / 10);
  const units = num % 10;
  return `${TENS[tens]}${units ? ' ' + DIGITS[units] : ''}`;
}

export function numberToWords(amount) {
  if (amount === 0) return 'zero rupees only';
  const integerPart = Math.floor(amount);
  const paisePart = Math.round((amount - integerPart) * 100);
  const segments = segmentNumber(integerPart);
  const words = [];
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (!segment) continue;
    if (i === 0) {
      if (segment >= 100) {
        words.push(DIGITS[Math.floor(segment / 100)], 'hundred');
        if (segment % 100) words.push('and', twoDigitToWords(segment % 100));
      } else {
        words.push(twoDigitToWords(segment));
      }
    } else {
      if (segment >= 100) {
        words.push(DIGITS[Math.floor(segment / 100)], 'hundred');
        if (segment % 100) words.push('and', twoDigitToWords(segment % 100));
      } else {
        words.push(twoDigitToWords(segment));
      }
      words.push(SCALE[i]);
    }
  }

  let result = `${words.join(' ')} rupees`;
  if (paisePart) {
    result += ` and ${twoDigitToWords(paisePart)} paise`;
  }
  return `${result} only`;
}
