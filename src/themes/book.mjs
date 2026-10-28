import { bubble } from './bubble.mjs';


const PAPER_BG = '#f5f0e8';
const SURFACE = '#faf6ef';
const CODE_BG = '#f0ebe0';
const BORDER = '#d4cbb8';
const BORDER_LIGHT = '#e2dace';
const TEXT = '#3d3929';
const TEXT_SOFT = '#6b6152';
const ACCENT = '#b85c38';

const CARD_PAD = 24;

const PAPER_TEXTURE = [
  'radial-gradient(ellipse at 20% 50%, rgba(180,160,130,.04) 0%, transparent 70%)',
  'radial-gradient(ellipse at 80% 20%, rgba(160,140,110,.03) 0%, transparent 60%)',
  'radial-gradient(ellipse at 50% 80%, rgba(140,120,90,.03) 0%, transparent 60%)',
].join(', ');

function bookFrame(content, { width }) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width,
        backgroundColor: PAPER_BG,
        fontSize: 17,
        lineHeight: 1.8,
        color: TEXT,
      },
      children: [{
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: width - CARD_PAD * 2 - 2,
            padding: `22px ${CARD_PAD}px`,
            backgroundColor: SURFACE,
            backgroundImage: PAPER_TEXTURE,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(61,57,41,.06)',
            overflow: 'hidden',
          },
          children: content,
        },
      }],
    },
  };
}

export const book = {
  ...bubble,
  name: 'book',
  frame: bookFrame,

  fonts: {
    main: [
      'C:\\Windows\\Fonts\\STSONG.TTF',
      'C:\\Windows\\Fonts\\simfang.ttf',
      'C:\\Windows\\Fonts\\NotoSerifSC-VF.ttf',
    ],
    bold: [
      'C:\\Windows\\Fonts\\STSONG.TTF',
      'C:\\Windows\\Fonts\\simfang.ttf',
    ],
    mono: [
      'C:\\Windows\\Fonts\\CascadiaMono.ttf',
      'C:\\Windows\\Fonts\\consola.ttf',
    ],
  },

  heading(depth) {
    const size = { 1: 22, 2: 19, 3: 17, 4: 17, 5: 17, 6: 17 }[depth] ?? 17;
    return {
      display: 'block',
      fontSize: size,
      fontWeight: 600,
      lineHeight: 1.4,
      marginBottom: depth <= 2 ? 8 : 5,
      color: TEXT,
    };
  },

  paragraph() {
    return {
      display: 'block',
      fontSize: 17,
      lineHeight: 1.8,
      marginBottom: 8,
    };
  },

  code() {
    return {
      display: 'block',
      marginBottom: 12,
      padding: '10px 12px',
      backgroundColor: CODE_BG,
      borderRadius: 4,
      fontSize: 13,
      lineHeight: 1.65,
      whiteSpace: 'pre-wrap',
      color: TEXT,
    };
  },

  quote() {
    return {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 12,
      padding: '6px 14px',
      borderLeft: `3px solid ${ACCENT}`,
      backgroundColor: '#f7f2e9',
      color: TEXT_SOFT,
      fontSize: 16,
      lineHeight: 1.8,
    };
  },

  list() {
    return {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 8,
    };
  },

  listItem() {
    return {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    };
  },

  marker() {
    return {
      width: 20,
      flexShrink: 0,
      fontSize: 17,
      lineHeight: 1.8,
      color: ACCENT,
    };
  },

  listText() {
    return {
      display: 'block',
      fontSize: 17,
      lineHeight: 1.8,
    };
  },

  table() {
    return {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      marginBottom: 12,
      borderTop: `1px solid ${BORDER}`,
      borderBottom: `1px solid ${BORDER}`,
      borderRadius: 4,
      overflow: 'hidden',
    };
  },

  cell(header) {
    return {
      display: 'block',
      flex: 1,
      minWidth: 0,
      padding: '6px 10px',
      fontSize: 14,
      lineHeight: 1.6,
      fontWeight: header ? 600 : 400,
      backgroundColor: header ? CODE_BG : 'transparent',
      borderBottom: `1px solid ${BORDER_LIGHT}`,
    };
  },

  hr() {
    return { height: 1, backgroundColor: BORDER_LIGHT, marginBottom: 14 };
  },

  strong() {
    return { fontWeight: 600 };
  },

  codeSpan() {
    return {
      fontSize: 14,
      backgroundColor: CODE_BG,
      padding: '1px 5px',
      borderRadius: 3,
    };
  },

  link() {
    return { color: ACCENT, textDecoration: 'underline' };
  },
};
